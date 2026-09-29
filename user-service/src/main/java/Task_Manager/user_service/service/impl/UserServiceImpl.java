package Task_Manager.user_service.service.impl;

import Task_Manager.common_lib.exception.BusinessRuleException;
import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.utils.Translator;
import Task_Manager.user_service.dto.ChangePasswordRequest;
import Task_Manager.user_service.dto.MemberProjectDto;
import Task_Manager.user_service.dto.UpdateProfileRequest;
import Task_Manager.user_service.dto.UserResponse;
import Task_Manager.user_service.entity.SystemRole;
import Task_Manager.user_service.entity.User;
import Task_Manager.user_service.kafka.AuthEventPublisher;
import Task_Manager.user_service.mapper.UserMapper;
import Task_Manager.user_service.repository.SystemRoleRepository;
import Task_Manager.user_service.repository.UserRepository;
import Task_Manager.user_service.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final SystemRoleRepository systemRoleRepository;
    private final AuthEventPublisher authEventPublisher;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Override
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.user.not_found_id", id)));
        return userMapper.toResponse(user);
    }

    @Override
    public UserResponse findByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.user.not_found_email", email)));
        return userMapper.toResponse(user);
    }

    @Override
    public UserResponse getMyProfile(String identifier) {
        return userMapper.toResponse(getValidUserByIdentifier(identifier));
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

        authEventPublisher.publishUserUpdated(savedUser.getId(), userMapper.toUserUpdatedEvent(savedUser));
        return userMapper.toResponse(savedUser);
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
                .map(userMapper::toResponse)
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

        authEventPublisher.publishUserUpdated(savedUser.getId(), userMapper.toUserUpdatedEvent(savedUser));
        return userMapper.toResponse(savedUser);
    }

    @Override
    @Transactional
    public UserResponse updateUserRole(UUID userId, List<UUID> roleIds) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.user.not_found_id", userId)));

        List<SystemRole> newRoles = (roleIds != null && !roleIds.isEmpty())
                ? systemRoleRepository.findAllById(roleIds)
                : Collections.emptyList();

        user.getSystemRoles().clear();
        user.getSystemRoles().addAll(newRoles);
        user.setUpdatedAt(LocalDateTime.now());

        User savedUser = userRepository.save(user);
        authEventPublisher.publishUserUpdated(savedUser.getId(), userMapper.toUserUpdatedEvent(savedUser));
        return userMapper.toResponse(savedUser);
    }

    @Override
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

    @Override
    public boolean checkUserExists(UUID userId) {
        return userRepository.existsById(userId);
    }

    @Override
    public List<MemberProjectDto> getUsersByIds(List<UUID> userIds) {
        return userRepository.findAllById(userIds).stream().map(user -> {
            MemberProjectDto dto = new MemberProjectDto();
            dto.setUserId(user.getId());
            dto.setUsername(user.getUsername());
            dto.setFullName(user.getFullname());
            dto.setEmail(user.getEmail());
            return dto;
        }).collect(Collectors.toList());
    }
}