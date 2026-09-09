package Task_Manager.notification_service.client;

import Task_Manager.notification_service.dto.ProjectDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "project-service", url = "http://localhost:8083")
public interface ProjectClient {
    @PostMapping("/api/projects/batch")
    List<ProjectDto> getProjectsByIds(@RequestBody List<UUID> projectIds);
}
