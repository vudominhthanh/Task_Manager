package Task_Manager.user_service.mapper;

import Task_Manager.user_service.dto.*;
import Task_Manager.user_service.entity.Otp;
import Task_Manager.user_service.entity.SystemRole;
import Task_Manager.user_service.entity.User;
import Task_Manager.user_service.entity.UserSession;
import org.mapstruct.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE, builder = @Builder(disableBuilder = true))
public interface UserMapper {

    @Mapping(target = "fullName", source = "fullname")
    @Mapping(target = "role", expression = "java(resolveRoles(user))")
    UserResponse toResponse(User user);

    List<UserResponse> toResponseList(List<User> users);

    @Mapping(target = "userId", source = "id")
    @Mapping(target = "fullName", source = "fullname")
    MemberProjectDto toMemberProjectDto(User user);

    List<MemberProjectDto> toMemberProjectDtoList(List<User> users);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "passwordHash", source = "encodedPassword")
    @Mapping(target = "active", source = "isActive")
    @Mapping(target = "email", expression = "java(request.getEmail() != null ? request.getEmail().trim().toLowerCase() : null)")
    @Mapping(target = "systemRoles", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    User toEntity(RegisterRequest request, String encodedPassword, boolean isActive);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "email", source = "email")
    @Mapping(target = "username", expression = "java(email.split(\"@\")[0])")
    @Mapping(target = "fullname", source = "name")
    @Mapping(target = "phoneNumber", constant = "")
    @Mapping(target = "authProvider", constant = "GOOGLE")
    @Mapping(target = "providerId", source = "sub")
    @Mapping(target = "active", constant = "true")
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "systemRoles", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    User toGoogleUserEntity(String email, String name, String sub);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "username", ignore = true)
    @Mapping(target = "email", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "systemRoles", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntityFromRequest(UpdateProfileRequest request, @MappingTarget User user);

    @Mapping(target = "id", expression = "java(java.util.UUID.randomUUID().toString())")
    @Mapping(target = "userId", source = "userId")
    @Mapping(target = "otpCode", source = "otpCode")
    @Mapping(target = "type", source = "type")
    @Mapping(target = "createdAt", expression = "java(java.time.LocalDateTime.now())")
    @Mapping(target = "used", constant = "false")
    @Mapping(target = "expirationInSeconds", source = "expirationInSeconds")
    Otp toOtp(UUID userId, String otpCode, String type, Long expirationInSeconds);

    @Mapping(target = "id", expression = "java(java.util.UUID.randomUUID().toString())")
    @Mapping(target = "userId", source = "userId")
    @Mapping(target = "refreshToken", expression = "java(java.util.UUID.randomUUID().toString())")
    @Mapping(target = "deviceInfo", source = "deviceInfo")
    @Mapping(target = "ipAddress", source = "ipAddress")
    @Mapping(target = "expiresAt", expression = "java(java.time.LocalDateTime.now().plusDays(7))")
    @Mapping(target = "revoked", constant = "false")
    @Mapping(target = "expirationInSeconds", constant = "604800L")
    UserSession toUserSession(UUID userId, String deviceInfo, String ipAddress);

    @Mapping(target = "token", source = "token")
    @Mapping(target = "refreshToken", source = "refreshToken")
    @Mapping(target = "sessionId", source = "sessionId")
    @Mapping(target = "userName", source = "user.username")
    @Mapping(target = "fullName", source = "user.fullname")
    @Mapping(target = "email", source = "user.email")
    @Mapping(target = "phoneNumber", source = "user.phoneNumber")
    @Mapping(target = "role", expression = "java(resolveRoles(user))")
    @Mapping(target = "permissions", source = "permissions")
    AuthResponse toAuthResponse(User user, String token, String refreshToken, String sessionId, List<String> permissions);

    TwoFactorSetupResponse toTwoFactorSetupResponse(String secretKey, String qrCodeUrl);

    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "username", source = "user.username")
    @Mapping(target = "fullname", source = "user.fullname")
    @Mapping(target = "email", source = "user.email")
    @Mapping(target = "phoneNumber", source = "user.phoneNumber")
    @Mapping(target = "role", expression = "java(resolveRoles(user))")
    @Mapping(target = "isActive", source = "user.active")
    @Mapping(target = "userAvatar", expression = "java(resolveAvatar(user))")
    @Mapping(target = "targetName", expression = "java(user.getFullname() != null ? user.getFullname() : user.getUsername())")
    @Mapping(target = "avatarColor", constant = "bg-indigo-600")
    @Mapping(target = "updatedAt", expression = "java(user.getUpdatedAt() != null ? user.getUpdatedAt().toString() : java.time.LocalDateTime.now().toString())")
    UserEventDto toUserUpdatedEvent(User user);

    default String resolveRoles(User user) {
        if (user == null || user.getSystemRoles() == null || user.getSystemRoles().isEmpty()) {
            return "ROLE_USER";
        }
        return user.getSystemRoles().stream()
                .map(SystemRole::getName)
                .collect(Collectors.joining(", "));
    }

    default String resolveAvatar(User user) {
        if (user == null) return "U";
        if (user.getFullname() != null && !user.getFullname().trim().isEmpty()) {
            return user.getFullname().trim().substring(0, 1).toUpperCase();
        }
        if (user.getUsername() != null && !user.getUsername().trim().isEmpty()) {
            return user.getUsername().trim().substring(0, 1).toUpperCase();
        }
        return "U";
    }
}