package Task_Manager.user_service.service;

import Task_Manager.user_service.dto.ChangePasswordRequest;
import Task_Manager.user_service.dto.MemberProjectDto;
import Task_Manager.user_service.dto.UpdateProfileRequest;
import Task_Manager.user_service.dto.UserResponse;

import java.util.List;
import java.util.UUID;

public interface UserService {
    boolean checkUserExists(UUID userId);
    List<MemberProjectDto> getUsersByIds(List<UUID> userIds);

    UserResponse getUserById(UUID id);
    UserResponse findByEmail(String email);
    UserResponse getMyProfile(String identifier);
    UserResponse updateProfileByIdentifier(String identifier, UpdateProfileRequest request);
    void changePassword(String identifier, ChangePasswordRequest request);
    List<UserResponse> getAllUsers(String search);
    UserResponse updateUserStatus(UUID userId, Boolean isActive);
    UserResponse updateUserRole(UUID userId, List<UUID> roleIds);
    List<UUID> getAllUserIds();
}