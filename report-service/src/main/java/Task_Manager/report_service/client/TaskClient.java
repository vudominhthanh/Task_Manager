package Task_Manager.report_service.client;

import Task_Manager.report_service.dto.ReportResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "task-service", url = "http://localhost:8085")
public interface TaskClient {
    @GetMapping("/api/tasks/internal/project/{projectId}")
    List<ReportResponse.TaskDto> getTasksByProjectId(@PathVariable("projectId") UUID projectId);

    @GetMapping("/api/tasks/assignee/me")
    List<ReportResponse.TaskDto> getMyAssignedTasks();
}