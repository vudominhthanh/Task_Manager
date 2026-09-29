package Task_Manager.project_service.controller;

import Task_Manager.common_lib.constant.ProjectPermissions;
import Task_Manager.project_service.dto.ProjectMemberRequest;
import Task_Manager.project_service.dto.ProjectMemberResponse;
import Task_Manager.project_service.service.ProjectMemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectMemberController {
    private final ProjectMemberService projectMemberService;

    @GetMapping("/my-members")
    public ResponseEntity<List<ProjectMemberResponse>> getMyProjectsMembers(Principal principal) {
        UUID currentUserId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(projectMemberService.getAllMembersInMyProjects(currentUserId));
    }

    @PreAuthorize("@projectSecurity.hasPermission(#projectId, T(Task_Manager.common_lib.constant.ProjectPermissions).MEMBER_VIEW)")
    @GetMapping("/{projectId}/members")
    public ResponseEntity<List<ProjectMemberResponse>> getProjectMembers(@PathVariable UUID projectId, Principal principal) {
        UUID currentUserId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(projectMemberService.getMembersByProjectId(projectId, currentUserId));
    }

    @PreAuthorize("@projectSecurity.hasPermission(#projectId, '" + ProjectPermissions.MEMBER_ADD + "')")
    @PostMapping("/{projectId}/members")
    public ResponseEntity<Void> addMember(@PathVariable UUID projectId, @RequestBody ProjectMemberRequest projectMemberRequest, Authentication authentication) {
        projectMemberService.addMember(projectId, projectMemberRequest, UUID.fromString(authentication.getName()));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PreAuthorize("@projectSecurity.hasPermission(#projectId, '" + ProjectPermissions.MEMBER_REMOVE + "')")
    @DeleteMapping("/{projectId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID projectId, @PathVariable UUID userId, Authentication authentication) {
        projectMemberService.removeMember(projectId, userId, UUID.fromString(authentication.getName()));
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @GetMapping("/{projectId}/check-admin")
    public ResponseEntity<Boolean> isProjectAdmin(@PathVariable UUID projectId, @RequestParam UUID userId) {
        return ResponseEntity.ok(projectMemberService.checkProjectAdmin(projectId, userId));
    }

    @PreAuthorize("@projectSecurity.hasPermission(#projectId, '" + ProjectPermissions.MEMBER_ROLE_UPDATE + "')")
    @PutMapping("/{projectId}/members/{userId}")
    public ResponseEntity<Void> updateMemberRole(@PathVariable UUID projectId, @PathVariable UUID userId, @RequestBody Map<String, String> request, Authentication authentication) {
        projectMemberService.updateMemberRole(projectId, userId, request.get("role"), UUID.fromString(authentication.getName()));
        return ResponseEntity.ok().build();
    }
}