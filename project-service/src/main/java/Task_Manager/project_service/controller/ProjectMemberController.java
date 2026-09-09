package Task_Manager.project_service.controller;

import Task_Manager.project_service.dto.ProjectMemberRequest;
import Task_Manager.project_service.dto.ProjectMemberResponse;
import Task_Manager.project_service.service.ProjectMemberService;
import Task_Manager.project_service.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectMemberController {
    private final ProjectService projectService;
    private final ProjectMemberService projectMemberService;

    private boolean checkSystemAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("SYS_AD"));
    }

    @GetMapping("/my-members")
    public ResponseEntity<List<ProjectMemberResponse>> getMyProjectsMembers(Principal principal) {
        UUID currentUserId = UUID.fromString(principal.getName());
        List<ProjectMemberResponse> members = projectMemberService.getAllMembersInMyProjects(currentUserId);
        return ResponseEntity.ok(members);
    }

    @GetMapping("/{projectId}/members")
    public ResponseEntity<List<ProjectMemberResponse>> getProjectMembers(@PathVariable UUID projectId, Principal principal) {
        UUID currentUserId = UUID.fromString(principal.getName());
        List<ProjectMemberResponse> members = projectMemberService.getMembersByProjectId(projectId, currentUserId);
        return ResponseEntity.ok(members);
    }

    @PostMapping("/{projectId}/members")
    public ResponseEntity<Void> addMember(@PathVariable UUID projectId, @RequestBody ProjectMemberRequest projectMemberRequest, Authentication authentication) {
        UUID currentUserId = UUID.fromString(authentication.getName());
        boolean isSystemAdmin = checkSystemAdmin(authentication);

        projectMemberService.addMember(projectId, projectMemberRequest, currentUserId, isSystemAdmin);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID projectId, @PathVariable UUID userId, Authentication authentication) {
        UUID currentUserId = UUID.fromString(authentication.getName());
        boolean isSystemAdmin = checkSystemAdmin(authentication);

        projectMemberService.removeMember(projectId, userId, currentUserId, isSystemAdmin);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    @GetMapping("/{projectId}/check-admin")
    public ResponseEntity<Boolean> isProjectAdmin(@PathVariable UUID projectId,
                                                  @RequestParam UUID userId) {
        boolean isAdmin = projectMemberService.checkProjectAdmin(projectId, userId);
        return ResponseEntity.ok(isAdmin);
    }

    @PutMapping("/{projectId}/members/{userId}")
    public ResponseEntity<Void> updateMemberRole(@PathVariable UUID projectId, @PathVariable UUID userId, @RequestBody Map<String, String> request, Authentication authentication) {
        UUID currentUserId = UUID.fromString(authentication.getName());
        boolean isSystemAdmin = checkSystemAdmin(authentication);

        String newRole = request.get("role");
        projectMemberService.updateMemberRole(projectId, userId, newRole, currentUserId, isSystemAdmin);

        return ResponseEntity.ok().build();
    }
}
