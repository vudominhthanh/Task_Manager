package Task_Manager.project_service.controller;

import Task_Manager.project_service.dto.ProjectPermissionResponse;
import Task_Manager.project_service.dto.ProjectRoleRequest;
import Task_Manager.project_service.dto.ProjectRoleResponse;
import Task_Manager.project_service.service.ProjectRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectRoleController {

    private final ProjectRoleService projectRoleService;

    @GetMapping("/permissions")
    public ResponseEntity<List<ProjectPermissionResponse>> getAllPermissions() {
        return ResponseEntity.ok(projectRoleService.getAllSystemPermissions());
    }

    @PreAuthorize("@projectSecurity.hasPermission(#projectId, T(Task_Manager.common_lib.constant.ProjectPermissions).PROJECT_UPDATE)")
    @PostMapping("/{projectId}/roles")
    public ResponseEntity<ProjectRoleResponse> createCustomRole(
            @PathVariable UUID projectId,
            @RequestBody ProjectRoleRequest request) {
        return ResponseEntity.ok(projectRoleService.createCustomRole(projectId, request));
    }

    @PreAuthorize("@projectSecurity.hasPermission(#projectId, T(Task_Manager.common_lib.constant.ProjectPermissions).PROJECT_VIEW)")
    @GetMapping("/{projectId}/roles")
    public ResponseEntity<List<ProjectRoleResponse>> getProjectRoles(@PathVariable UUID projectId) {
        return ResponseEntity.ok(projectRoleService.getRolesByProjectId(projectId));
    }

    @PreAuthorize("@projectSecurity.hasPermission(#projectId, T(Task_Manager.common_lib.constant.ProjectPermissions).PROJECT_UPDATE)")
    @PutMapping("/{projectId}/roles/{roleId}")
    public ResponseEntity<ProjectRoleResponse> updateCustomRole(
            @PathVariable UUID projectId,
            @PathVariable UUID roleId,
            @RequestBody ProjectRoleRequest request) {
        return ResponseEntity.ok(projectRoleService.updateCustomRole(projectId, roleId, request));
    }

    @PreAuthorize("@projectSecurity.hasPermission(#projectId, T(Task_Manager.common_lib.constant.ProjectPermissions).PROJECT_UPDATE)")
    @DeleteMapping("/{projectId}/roles/{roleId}")
    public ResponseEntity<Void> deleteCustomRole(
            @PathVariable UUID projectId,
            @PathVariable UUID roleId) {
        projectRoleService.deleteCustomRole(projectId, roleId);
        return ResponseEntity.noContent().build();
    }
}