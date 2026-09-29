package Task_Manager.user_service.controller;

import Task_Manager.user_service.entity.SystemPermission;
import Task_Manager.user_service.entity.SystemRole;
import Task_Manager.user_service.repository.SystemPermissionRepository;
import Task_Manager.user_service.repository.SystemRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RolePermissionController {

    private final SystemRoleRepository roleRepository;
    private final SystemPermissionRepository permissionRepository;

    @PreAuthorize("hasAuthority('ROLE_READ') or hasAuthority('ROLE_ADMIN')")
    @GetMapping("/roles")
    public ResponseEntity<List<SystemRole>> getAllRoles() {
        return ResponseEntity.ok(roleRepository.findAll());
    }

    @PreAuthorize("hasAuthority('ROLE_READ') or hasAuthority('ROLE_ADMIN')")
    @GetMapping("/permissions")
    public ResponseEntity<List<SystemPermission>> getAllPermissions() {
        return ResponseEntity.ok(permissionRepository.findAll());
    }
}