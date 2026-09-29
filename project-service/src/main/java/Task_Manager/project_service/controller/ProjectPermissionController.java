package Task_Manager.project_service.controller;

import Task_Manager.project_service.service.ProjectPermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectPermissionController {

    private final ProjectPermissionService projectPermissionService;

    @PreAuthorize("@projectSecurity.hasPermission(#projectId, T(Task_Manager.common_lib.constant.ProjectPermissions).PROJECT_VIEW)")
    @GetMapping("/{projectId}/users/{userId}/permissions")
    public ResponseEntity<Set<String>> getUserPermissions(
            @PathVariable UUID projectId,
            @PathVariable UUID userId) {
        return ResponseEntity.ok(projectPermissionService.getUserPermissionsInProject(projectId, userId));
    }

    @GetMapping("/{projectId}/my-permissions")
    public ResponseEntity<Set<String>> getMyPermissions(
            @PathVariable UUID projectId,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(projectPermissionService.getUserPermissionsInProject(projectId, userId));
    }
}