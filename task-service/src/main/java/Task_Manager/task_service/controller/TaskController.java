package Task_Manager.task_service.controller;

import Task_Manager.task_service.dto.TaskRequest;
import Task_Manager.task_service.dto.TaskResponse;
import Task_Manager.task_service.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.parameters.P;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {
    private final TaskService taskService;

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.getTaskById(id));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<TaskResponse>> getTasksByProjectId(@PathVariable UUID projectId) {
        return ResponseEntity.ok(taskService.getTaskByProjectId(projectId));
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@RequestBody TaskRequest taskRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.createTask(taskRequest));
    }

    @PostMapping("/{parentTaskId}/sub-tasks")
    public  ResponseEntity<TaskResponse> createSubTask(@PathVariable UUID parentTaskId, @RequestBody TaskRequest taskRequest) {
        return  ResponseEntity.status(HttpStatus.CREATED).body(taskService.createSubTask(parentTaskId, taskRequest));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable UUID id, @RequestBody TaskRequest taskRequest) {
        return ResponseEntity.ok(taskService.updateTask(id, taskRequest));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskResponse> updateTaskStatus(@PathVariable UUID id, @RequestBody TaskRequest taskRequest) {
        return ResponseEntity.ok(taskService.updateTaskStatus(id, taskRequest));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable UUID id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}
