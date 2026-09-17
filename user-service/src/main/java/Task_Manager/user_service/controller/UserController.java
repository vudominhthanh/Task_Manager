package Task_Manager.user_service.controller;

import Task_Manager.user_service.dto.*;
import Task_Manager.user_service.entity.User;
import Task_Manager.user_service.repository.UserRepository;
import Task_Manager.user_service.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserRepository userRepository;
    private final UserService userService;

    @GetMapping("/{userId}/exists")
    public ResponseEntity<Boolean> checkUserExists(@PathVariable UUID userId) {
        boolean exists = userRepository.existsById(userId);
        return ResponseEntity.ok(exists);
    }

    @PostMapping("/batch")
    public ResponseEntity<List<MemberProjectDto>> getUsersByIds(@RequestBody List<UUID> userIds) {
        List<User> users = userRepository.findAllById(userIds);

        List<MemberProjectDto> response = users.stream().map(user -> {
            MemberProjectDto dto = new MemberProjectDto();
            dto.setUserId(user.getId());
            dto.setUsername(user.getUsername());
            dto.setFullName(user.getFullname());
            dto.setEmail(user.getEmail());
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID userId) {
        UserResponse response = userService.getUserById(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/email")
    public ResponseEntity<UserResponse> getUserByEmail(@RequestParam("email") String email) {
        return ResponseEntity.ok(userService.findByEmail(email));
    }


    @GetMapping("/profile/me")
    public ResponseEntity<UserResponse> getMyProfile(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        String identifier = principal.getName();
        UserResponse response = userService.getMyProfile(identifier);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile/me")
    public ResponseEntity<UserResponse> updateMyProfile(
            Principal principal,
            @RequestBody UpdateProfileRequest request) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        String identifier = principal.getName();
        UserResponse response = userService.updateProfileByIdentifier(identifier, request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/profile/change-password")
    public ResponseEntity<?> changePassword(
            Principal principal,
            @RequestBody ChangePasswordRequest request) {
        if (principal == null) {
            return ResponseEntity.status(401).body("Yêu cầu đăng nhập!");
        }
        try {
            userService.changePassword(principal.getName(), request);
            return ResponseEntity.ok("Đổi mật khẩu thành công!");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/all-ids")
    public ResponseEntity<List<UUID>> getAllUserIds() {
        List<UUID> userIds = userService.getAllUserIds();
        return ResponseEntity.ok(userIds);
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers(
            @RequestParam(value = "search", required = false) String search) {
        List<UserResponse> list = userService.getAllUsers(search);
        return ResponseEntity.ok(list);
    }

    @PatchMapping("/{userId}/status")
    public ResponseEntity<UserResponse> updateUserStatus(
            @PathVariable UUID userId,
            @RequestBody UpdateUserStatusRequest request) {
        UserResponse response = userService.updateUserStatus(userId, request.getIsActive());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<UserResponse> updateUserRole(
            @PathVariable UUID userId,
            @RequestBody UpdateUserRoleRequest request) {
        UserResponse response = userService.updateUserRole(userId, request.getRole());
        return ResponseEntity.ok(response);
    }
}