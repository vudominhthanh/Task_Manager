package Task_Manager.task_service.service;

import Task_Manager.task_service.dto.TaskRequest;
import Task_Manager.task_service.dto.TaskResponse;

import java.util.List;
import java.util.UUID;

public interface TaskService {
    TaskResponse createTask(TaskRequest taskRequest, UUID userId, boolean isSystemAdmin);

    TaskResponse createSubTask(UUID parentTaskId, TaskRequest taskRequest, UUID userId, boolean isSystemAdmin);

    TaskResponse updateTask(UUID id, TaskRequest taskRequest, UUID userId, boolean isSystemAdmin);

    TaskResponse updateTaskStatus(UUID id, TaskRequest taskRequest, UUID userId, boolean isSystemAdmin);

    void deleteTask(UUID id, UUID userId, boolean isSystemAdmin);

    List<TaskResponse> getTaskByProjectId(UUID projectId);

    List<TaskResponse> getTasksByIds(List<UUID> taskIds);

    TaskResponse getTaskById(UUID id);

    List<TaskResponse> getTasksByAssigneeId(UUID assigneeId);
}