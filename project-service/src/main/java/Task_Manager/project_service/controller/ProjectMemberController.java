package Task_Manager.project_service.controller;

import Task_Manager.project_service.dto.ProjectMemberRequest;
import Task_Manager.project_service.dto.ProjectResponse;
import Task_Manager.project_service.repository.ProjectMemberRepository;
import Task_Manager.project_service.repository.ProjectRepository;
import Task_Manager.project_service.service.ProjectMemberService;
import Task_Manager.project_service.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/members")
@RequiredArgsConstructor
public class ProjectMemberController {
    private final ProjectService projectService;
    private final ProjectMemberService projectMemberService;

    private UUID getCurrentUerId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    @PostMapping
    public ResponseEntity<Void> addMember(@PathVariable UUID projectId, @RequestBody ProjectMemberRequest projectMemberRequest, Authentication authentication) {
        UUID currentUerId = getCurrentUerId(authentication);

        projectMemberService.addMember(projectId, projectMemberRequest, currentUerId);

        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable UUID projectId, @PathVariable UUID userId, Authentication authentication) {
        UUID currentUerId = getCurrentUerId(authentication);

        projectMemberService.removeMember(projectId, userId, currentUerId);

        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
