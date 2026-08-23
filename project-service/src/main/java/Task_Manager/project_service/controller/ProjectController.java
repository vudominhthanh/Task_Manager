package Task_Manager.project_service.controller;


import Task_Manager.project_service.dto.ProjectRequest;
import Task_Manager.project_service.dto.ProjectResponse;
import Task_Manager.project_service.entity.Project;
import Task_Manager.project_service.repository.ProjectRepository;
import Task_Manager.project_service.service.ProjectService;
import jakarta.validation.Valid;
import jakarta.validation.executable.ValidateOnExecution;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        // Gọi thẳng ProjectRepository của ProjectService
        boolean exists = projectRepository.existsById(projectId);
        return ResponseEntity.ok(exists);
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
        ProjectResponse projectResponse = projectService.updateProject(id, projectRequest, currentUserId);
        return new ResponseEntity<>(projectResponse,HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable UUID id, Authentication authentication) {
        UUID currentUserId = getCurrentUserId(authentication);
        projectService.deleteProject(id, currentUserId);
        return ResponseEntity.noContent().build();
    }
}
