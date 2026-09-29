        package Task_Manager.project_service.controller;

        import Task_Manager.common_lib.constant.ProjectPermissions;
        import Task_Manager.project_service.dto.ProjectRequest;
        import Task_Manager.project_service.dto.ProjectResponse;
        import Task_Manager.project_service.entity.ProjectStatus;
        import Task_Manager.project_service.repository.ProjectRepository;
        import Task_Manager.project_service.service.ProjectService;
        import jakarta.validation.Valid;
        import lombok.RequiredArgsConstructor;
        import org.springframework.data.domain.Page;
        import org.springframework.data.domain.PageRequest;
        import org.springframework.data.domain.Pageable;
        import org.springframework.data.domain.Sort;
        import org.springframework.security.access.prepost.PreAuthorize;
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

            private UUID getCurrentUserId(Authentication authentication) {
                return UUID.fromString(authentication.getName());
            }

            @GetMapping("/{projectId}/exists")
            public ResponseEntity<Boolean> checkProjectExists(@PathVariable UUID projectId) {
                return ResponseEntity.ok(projectRepository.existsById(projectId));
            }

            @GetMapping("/my-project-ids")
            public ResponseEntity<List<UUID>> getProjectIdsByUserId(Principal principal) {
                UUID currentUserId = UUID.fromString(principal.getName());
                return ResponseEntity.ok(projectService.findProjectIdsByUserId(currentUserId));
            }

            @PreAuthorize("hasAuthority('PROJECT_CREATE') or hasAuthority('ROLE_ADMIN')")
            @PostMapping
            public ResponseEntity<ProjectResponse> createProject(@Valid @RequestBody ProjectRequest projectRequest, Authentication authentication) {
                ProjectResponse projectResponse = projectService.createProject(projectRequest, getCurrentUserId(authentication));
                return new ResponseEntity<>(projectResponse, HttpStatus.CREATED);
            }

            @GetMapping
            public ResponseEntity<Page<ProjectResponse>> getProjects(
                    @RequestParam(required = false) String keyword,
                    @RequestParam(defaultValue = "0") int page,
                    @RequestParam(defaultValue = "10") int size,
                    Authentication authentication) {
                Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
                return ResponseEntity.ok(projectService.getProjects(getCurrentUserId(authentication), keyword, pageable));
            }

            @PreAuthorize("@projectSecurity.hasPermission(#id, T(Task_Manager.common_lib.constant.ProjectPermissions).PROJECT_VIEW)")
            @GetMapping("/{id}")
            public ResponseEntity<ProjectResponse> getProjectById(@PathVariable UUID id) {
                return ResponseEntity.ok(projectService.getProjectById(id));
            }

            // Chặn bằng Quyền Cấp Dự Án
            @PreAuthorize("@projectSecurity.hasPermission(#id, '" + ProjectPermissions.PROJECT_UPDATE + "')")
            @PutMapping("/{id}")
            public ResponseEntity<ProjectResponse> updateProject(@PathVariable UUID id, @Valid @RequestBody ProjectRequest projectRequest, Authentication authentication) {
                return new ResponseEntity<>(projectService.updateProject(id, projectRequest, getCurrentUserId(authentication)), HttpStatus.OK);
            }

            // Chặn bằng Quyền Cấp Dự Án
            @PreAuthorize("@projectSecurity.hasPermission(#id, '" + ProjectPermissions.PROJECT_DELETE + "')")
            @DeleteMapping("/{id}")
            public ResponseEntity<Void> deleteProject(@PathVariable UUID id, Authentication authentication) {
                projectService.deleteProject(id, getCurrentUserId(authentication));
                return ResponseEntity.noContent().build();
            }

            @PostMapping("/batch")
            public ResponseEntity<List<ProjectResponse>> getProjectsByIds(@RequestBody List<UUID> projectIds) {
                return ResponseEntity.ok(projectService.getProjectsByIds(projectIds));
            }

            @GetMapping("/{projectId}/is-admin")
            public ResponseEntity<Boolean> isProjectAdmin(@PathVariable UUID projectId, @RequestParam UUID userId) {
                return ResponseEntity.ok(projectService.isProjectAdmin(projectId, userId));
            }

            // Chặn bằng Quyền Cấp Dự Án
            @PreAuthorize("@projectSecurity.hasPermission(#id, '" + ProjectPermissions.PROJECT_UPDATE + "')")
            @PatchMapping("/{id}/status")
            public ResponseEntity<ProjectResponse> updateProjectStatus(
                    @PathVariable UUID id,
                    @RequestParam("status") String statusStr,
                    Authentication authentication) {
                ProjectStatus newStatus = ProjectStatus.valueOf(statusStr.toUpperCase());
                return ResponseEntity.ok(projectService.updateProjectStatus(id, newStatus, getCurrentUserId(authentication)));
            }
        }