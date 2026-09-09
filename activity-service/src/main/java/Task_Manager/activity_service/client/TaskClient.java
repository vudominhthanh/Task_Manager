package Task_Manager.activity_service.client;

import Task_Manager.activity_service.dto.TaskDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "task-service", url = "http://localhost:8085")
public interface TaskClient {
    @PostMapping("/api/tasks/batch")
    List<TaskDto> getTasksByIds(@RequestBody List<UUID> taskIds);
}
