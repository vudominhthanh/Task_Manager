package Task_Manager.activity_service.client;

import Task_Manager.activity_service.dto.ProjectDto;
import Task_Manager.common_lib.security.FeignJwtInterceptor;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "project-service", url = "http://localhost:8083", configuration = FeignJwtInterceptor.class)
public interface ProjectClient {
    @PostMapping("/api/projects/batch")
    List<ProjectDto> getProjectsByIds(@RequestBody List<UUID> projectIds);

    @GetMapping("/api/projects/my-project-ids")
    List<UUID> getMyProjectIds();
}
