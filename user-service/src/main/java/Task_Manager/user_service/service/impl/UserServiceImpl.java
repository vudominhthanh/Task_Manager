package Task_Manager.user_service.service.impl;

import Task_Manager.user_service.dto.ChangePasswordRequest;
import Task_Manager.user_service.dto.UpdateProfileRequest;
import Task_Manager.user_service.dto.UserResponse;
import Task_Manager.user_service.entity.User;
import Task_Manager.user_service.entity.UserRole;
import Task_Manager.user_service.kafka.AuthEventPublisher;
import Task_Manager.user_service.repository.UserRepository;
import Task_Manager.user_service.service.UserService;

import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.exception.BusinessRuleException;
import Task_Manager.common_lib.utils.Translator;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final AuthEventPublisher authEventPublisher;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.user.not_found_id", id)));
        return mapToUserResponse(user);
    }

    @Override
    public UserResponse findByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.user.not_found_email", email)));
        return mapToUserResponse(user);
    }

    @Override
    public UserResponse getMyProfile(String identifier) {
        return mapToUserResponse(getValidUserByIdentifier(identifier));
    }

    @Override
    @Transactional
    public UserResponse updateProfileByIdentifier(String identifier, UpdateProfileRequest request) {
        User user = getValidUserByIdentifier(identifier);

        if (request.getFullname() != null && !request.getFullname().trim().isEmpty()) {
            user.setFullname(request.getFullname().trim());
        }
        if (request.getPhoneNumber() != null) {
            user.setPhoneNumber(request.getPhoneNumber().trim());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl().trim());
        }

        user.setUpdatedAt(LocalDateTime.now());
        User savedUser = userRepository.save(user);

        publishUserUpdatedEvent(savedUser);
        return mapToUserResponse(savedUser);
    }

    @Override
    @Transactional
    public void changePassword(String identifier, ChangePasswordRequest request) {
        validatePasswordRequest(request);

        User user = getValidUserByIdentifier(identifier);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException(Translator.toLocale("error.user.current_password_wrong"));
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException(Translator.toLocale("error.user.password_same_as_old"));
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    @Override
    public List<UserResponse> getAllUsers(String search) {
        List<User> users = userRepository.findAll();

        if (search != null && !search.trim().isEmpty()) {
            String keyword = search.trim().toLowerCase();
            users = users.stream()
                    .filter(u -> isMatchSearch(u, keyword))
                    .collect(Collectors.toList());
        }

        return users.stream()
                .map(this::mapToUserResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserResponse updateUserStatus(UUID userId, Boolean isActive) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.user.not_found_id", userId)));

        user.setActive(isActive != null && isActive);
        user.setUpdatedAt(LocalDateTime.now());
        User savedUser = userRepository.save(user);

        publishUserUpdatedEvent(savedUser);
        return mapToUserResponse(savedUser);
    }

    @Override
    @Transactional
    public UserResponse updateUserRole(UUID userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.user.not_found_id", userId)));

        UserRole newRole = ("ROLE_ADMIN".equalsIgnoreCase(roleName) || "SYS_AD".equalsIgnoreCase(roleName))
                ? UserRole.SYS_AD
                : UserRole.USR;

        user.setRole(newRole);
        user.setUpdatedAt(LocalDateTime.now());
        User savedUser = userRepository.save(user);

        publishUserUpdatedEvent(savedUser);
        return mapToUserResponse(savedUser);
    }

    public List<UUID> getAllUserIds() {
        return userRepository.findAllUserIds();
    }

    private User getValidUserByIdentifier(String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            throw new BusinessRuleException(Translator.toLocale("error.user.auth_token_missing"));
        }

        String cleanIdentifier = identifier.trim();

        try {
            UUID userId = UUID.fromString(cleanIdentifier);
            return userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.user.not_found_id", userId)));
        } catch (IllegalArgumentException ignored) {

        }

        if (cleanIdentifier.contains("@")) {
            return userRepository.findByEmail(cleanIdentifier)
                    .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.user.not_found_email", cleanIdentifier)));
        }

        return userRepository.findByUsername(cleanIdentifier)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.user.not_found_username", cleanIdentifier)));
    }

    private void validatePasswordRequest(ChangePasswordRequest request) {
        if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
            throw new BusinessRuleException(Translator.toLocale("error.user.password_short"));
        }
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BusinessRuleException(Translator.toLocale("error.user.password_mismatch"));
        }
    }

    private boolean isMatchSearch(User user, String keyword) {
        return (user.getFullname() != null && user.getFullname().toLowerCase().contains(keyword))
                || (user.getEmail() != null && user.getEmail().toLowerCase().contains(keyword))
                || (user.getUsername() != null && user.getUsername().toLowerCase().contains(keyword));
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullname())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole() != null ? user.getRole().name() : UserRole.USR.name())
                .isActive(user.isActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    private void publishUserUpdatedEvent(User user) {
        String avatarLetter = (user.getFullname() != null && !user.getFullname().trim().isEmpty())
                ? user.getFullname().trim().substring(0, 1).toUpperCase()
                : (user.getUsername() != null && !user.getUsername().trim().isEmpty()
                ? user.getUsername().substring(0, 1).toUpperCase() : "U");

        Map<String, Object> payload = new HashMap<>();
        payload.put("userId", user.getId().toString());
        payload.put("username", user.getUsername());
        payload.put("fullname", user.getFullname());
        payload.put("email", user.getEmail());
        payload.put("phoneNumber", user.getPhoneNumber());
        payload.put("role", user.getRole() != null ? user.getRole().name() : UserRole.USR.name());
        payload.put("isActive", user.isActive());
        payload.put("userAvatar", avatarLetter);
        payload.put("targetName", user.getFullname() != null ? user.getFullname() : user.getUsername());
        payload.put("avatarColor", "bg-indigo-600");
        payload.put("updatedAt", user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : LocalDateTime.now().toString());

        authEventPublisher.publishUserUpdated(user.getId(), payload);
    }

}