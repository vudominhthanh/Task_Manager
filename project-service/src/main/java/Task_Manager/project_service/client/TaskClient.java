package Task_Manager.project_service.client;

import Task_Manager.project_service.dto.TaskStatisticsDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(name = "task-service", url = "http://localhost:8085")
public interface TaskClient {
    @GetMapping("/api/tasks/internal/project/{projectId}/statistics")
    TaskStatisticsDto getTaskStatistics(@PathVariable("projectId") UUID projectId);
}
