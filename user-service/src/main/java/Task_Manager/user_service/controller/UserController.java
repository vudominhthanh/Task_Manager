package Task_Manager.user_service.controller;

import Task_Manager.user_service.dto.*;
import Task_Manager.user_service.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{userId}/exists")
    public ResponseEntity<Boolean> checkUserExists(@PathVariable UUID userId) {
        return ResponseEntity.ok(userService.checkUserExists(userId));
    }

    @PreAuthorize("hasAuthority('USER_READ') or hasAuthority('ROLE_ADMIN')")
    @PostMapping("/batch")
    public ResponseEntity<List<MemberProjectDto>> getUsersByIds(@RequestBody List<UUID> userIds) {
        return ResponseEntity.ok(userService.getUsersByIds(userIds));
    }

    @PreAuthorize("hasAuthority('USER_READ') or hasAuthority('ROLE_ADMIN')")
    @GetMapping("/{userId}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID userId) {
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    @PreAuthorize("hasAuthority('USER_READ') or hasAuthority('ROLE_ADMIN')")
    @GetMapping("/email")
    public ResponseEntity<UserResponse> getUserByEmail(@RequestParam("email") String email) {
        return ResponseEntity.ok(userService.findByEmail(email));
    }

    @PreAuthorize("hasAuthority('USER_READ') or hasAuthority('ROLE_ADMIN')")
    @GetMapping("/all-ids")
    public ResponseEntity<List<UUID>> getAllUserIds() {
        return ResponseEntity.ok(userService.getAllUserIds());
    }

    @PreAuthorize("hasAuthority('USER_READ') or hasAuthority('ROLE_ADMIN')")
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers(
            @RequestParam(value = "search", required = false) String search) {
        return ResponseEntity.ok(userService.getAllUsers(search));
    }

    @PreAuthorize("hasAuthority('USER_STATUS_UPDATE') or hasAuthority('ROLE_ADMIN')")
    @PatchMapping("/{userId}/status")
    public ResponseEntity<UserResponse> updateUserStatus(
            @PathVariable UUID userId,
            @RequestBody UpdateUserStatusRequest request) {
        return ResponseEntity.ok(userService.updateUserStatus(userId, request.getIsActive()));
    }

    @PreAuthorize("hasAuthority('USER_ROLE_UPDATE') or hasAuthority('ROLE_ADMIN')")
    @PatchMapping("/{userId}/roles")
    public ResponseEntity<UserResponse> updateUserRoles(
            @PathVariable UUID userId,
            @RequestBody UpdateUserRoleRequest request) {
        return ResponseEntity.ok(userService.updateUserRole(userId, request.getRoleIds()));
    }

    @GetMapping("/profile/me")
    public ResponseEntity<UserResponse> getMyProfile(Principal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(userService.getMyProfile(principal.getName()));
    }

    @PutMapping("/profile/me")
    public ResponseEntity<UserResponse> updateMyProfile(
            Principal principal,
            @RequestBody UpdateProfileRequest request) {
        if (principal == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(userService.updateProfileByIdentifier(principal.getName(), request));
    }

    @PutMapping("/profile/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            Principal principal,
            @RequestBody ChangePasswordRequest request) {
        if (principal == null) return ResponseEntity.status(401).body(Map.of("message", "Yêu cầu đăng nhập!"));
        userService.changePassword(principal.getName(), request);
        return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công!"));
    }
}