package Task_Manager.task_service.client;

import Task_Manager.task_service.dto.ProjectDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@FeignClient(name = "project-service")
public interface ProjectClient {
    @GetMapping("/api/projects/{projectId}/exists")
    boolean existsById(@PathVariable("projectId") UUID projectId);

    @PostMapping("/api/projects/batch")
    List<ProjectDto> getProjectsByIds(@RequestBody List<UUID> projectIds);

    @GetMapping("/api/projects/{projectId}/is-admin")
    boolean isProjectAdmin(@PathVariable("projectId") UUID projectId, @RequestParam("userId") UUID userId);

    @GetMapping("/api/projects/{projectId}/users/{userId}/permissions")
    Set<String> getUserPermissions(
            @PathVariable("projectId") UUID projectId,
            @PathVariable("userId") UUID userId
    );
}