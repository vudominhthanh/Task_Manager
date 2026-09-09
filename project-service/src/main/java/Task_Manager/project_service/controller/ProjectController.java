package Task_Manager.project_service.controller;

import Task_Manager.project_service.dto.ProjectRequest;
import Task_Manager.project_service.dto.ProjectResponse;
import Task_Manager.project_service.repository.ProjectRepository;
import Task_Manager.project_service.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {
    private final ProjectService projectService;
    private final ProjectRepository projectRepository;

    @GetMapping("/{projectId}/exists")
    public ResponseEntity<Boolean> checkProjectExists(@PathVariable UUID projectId) {
        boolean exists = projectRepository.existsById(projectId);
        return ResponseEntity.ok(exists);
    }

    @GetMapping("/my-project-ids")
    public ResponseEntity<List<UUID>> getProjectIdsByUserId(Principal principal) {
        UUID currentUserId = UUID.fromString(principal.getName());
        List<UUID> projectIds = projectService.findProjectIdsByUserId(currentUserId);
        return ResponseEntity.ok(projectIds);
    }

    private UUID getCurrentUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(@Valid @RequestBody ProjectRequest projectRequest, Authentication authentication) {
        UUID ownerId = getCurrentUserId(authentication);
        ProjectResponse projectResponse;
        projectResponse = projectService.createProject(projectRequest, ownerId);
        return new ResponseEntity<>(projectResponse,HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<Page<ProjectResponse>> getProjects(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Authentication authentication) {

        UUID currentUserId = UUID.fromString(authentication.getName());
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        return ResponseEntity.ok(projectService.getProjects(currentUserId, keyword, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProjectById(@PathVariable UUID id) {
        return ResponseEntity.ok(projectService.getProjectById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponse> updateProject(@PathVariable UUID id, @Valid @RequestBody ProjectRequest projectRequest, Authentication authentication) {
        UUID currentUserId = getCurrentUserId(authentication);
        boolean isSystemAdmin = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("SYS_AD"));

        ProjectResponse projectResponse = projectService.updateProject(id, projectRequest, currentUserId, isSystemAdmin);
        return new ResponseEntity<>(projectResponse,HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID id, Authentication authentication) {
        UUID currentUserId = getCurrentUserId(authentication);
        boolean isSystemAdmin = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("SYS_AD"));

        projectService.deleteProject(id, currentUserId, isSystemAdmin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/batch")
    public ResponseEntity<List<ProjectResponse>> getProjectsByIds(@RequestBody List<UUID> projectIds) {
        List<ProjectResponse> projects = projectService.getProjectsByIds(projectIds);
        return ResponseEntity.ok(projects);
    }
}
