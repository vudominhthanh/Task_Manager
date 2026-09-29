package Task_Manager.task_service.service;

import Task_Manager.task_service.dto.TaskRequest;
import Task_Manager.task_service.dto.TaskResponse;
import Task_Manager.task_service.dto.TaskStatisticsDto;

import java.util.List;
import java.util.UUID;

public interface TaskService {
    TaskResponse createTask(TaskRequest taskRequest, UUID userId);

    TaskResponse createSubTask(UUID parentTaskId, TaskRequest taskRequest, UUID userId);

    TaskResponse updateTask(UUID id, TaskRequest taskRequest, UUID userId);

    TaskResponse updateTaskStatus(UUID id, TaskRequest taskRequest, UUID userId);

    void deleteTask(UUID id, UUID userId);

    List<TaskResponse> getTaskByProjectId(UUID projectId);

    List<TaskResponse> getTasksByIds(List<UUID> taskIds);

    TaskResponse getTaskById(UUID id);

    List<TaskResponse> getTasksByAssigneeId(UUID assigneeId);

    List<TaskResponse> getTaskByProjectId(UUID projectId, UUID userId);

    TaskStatisticsDto getTaskStatistics(UUID projectId);
}