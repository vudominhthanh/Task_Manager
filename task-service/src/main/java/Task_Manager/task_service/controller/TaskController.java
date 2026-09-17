package Task_Manager.task_service.controller;

import Task_Manager.task_service.dto.TaskRequest;
import Task_Manager.task_service.dto.TaskResponse;
import Task_Manager.task_service.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.parameters.P;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {
    private final TaskService taskService;

    private boolean checkIsSystemAdmin(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(auth -> "SYS_AD".equalsIgnoreCase(auth.getAuthority())
                        || "ROLE_SYS_AD".equalsIgnoreCase(auth.getAuthority()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable UUID id) {
        return ResponseEntity.ok(taskService.getTaskById(id));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<TaskResponse>> getTasksByProjectId(@PathVariable UUID projectId) {
        return ResponseEntity.ok(taskService.getTaskByProjectId(projectId));
    }

    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@RequestBody TaskRequest taskRequest, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        boolean isSystemAdmin = checkIsSystemAdmin(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.createTask(taskRequest, userId, isSystemAdmin));
    }

    @PostMapping("/{parentTaskId}/sub-tasks")
    public  ResponseEntity<TaskResponse> createSubTask(@PathVariable UUID parentTaskId, @RequestBody TaskRequest taskRequest, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        boolean isSystemAdmin = checkIsSystemAdmin(authentication);
        return  ResponseEntity.status(HttpStatus.CREATED).body(taskService.createSubTask(parentTaskId, taskRequest, userId, isSystemAdmin));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable UUID id, @RequestBody TaskRequest taskRequest, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        boolean isSystemAdmin = checkIsSystemAdmin(authentication);
        return ResponseEntity.ok(taskService.updateTask(id, taskRequest, userId, isSystemAdmin));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<TaskResponse> updateTaskStatus(@PathVariable UUID id, @RequestBody TaskRequest taskRequest, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        boolean isSystemAdmin = checkIsSystemAdmin(authentication);
        return ResponseEntity.ok(taskService.updateTaskStatus(id, taskRequest, userId, isSystemAdmin));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable UUID id, Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        boolean isSystemAdmin = checkIsSystemAdmin(authentication);
        taskService.deleteTask(id, userId, isSystemAdmin);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/batch")
    public ResponseEntity<List<TaskResponse>> getTasksByIds(@RequestBody List<UUID> taskIds) {
        List<TaskResponse> tasks = taskService.getTasksByIds(taskIds);
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/assignee/me")
    public ResponseEntity<List<TaskResponse>> getMyAssignedTasks(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(taskService.getTasksByAssigneeId(userId));
    }

    @GetMapping("/internal/project/{projectId}")
    public ResponseEntity<List<TaskResponse>> getTasksByProjectIdInternal(@PathVariable UUID projectId) {
        return ResponseEntity.ok(taskService.getTaskByProjectId(projectId));
    }
}
