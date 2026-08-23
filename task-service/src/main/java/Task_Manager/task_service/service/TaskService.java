package Task_Manager.task_service.service;

import Task_Manager.task_service.client.ProjectClient;
import Task_Manager.task_service.client.UserClient;
import Task_Manager.task_service.dto.TaskRequest;
import Task_Manager.task_service.dto.TaskResponse;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.entity.TaskPriority;
import Task_Manager.task_service.kafka.TaskEventPublisher;
import Task_Manager.task_service.mapper.TaskMapper;
import Task_Manager.task_service.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {
    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;

    private final UserClient userClient;
    private final ProjectClient projectClient;
    private final TaskEventPublisher taskEventPublisher;

    public TaskResponse getTaskById(UUID id) {
        Task task = taskRepository.findById(id).orElseThrow(() -> new RuntimeException("Task not found"));
        return taskMapper.toResponse(task);
    }

    @Transactional
    public TaskResponse createTask(TaskRequest taskRequest) {
        validateCrossService(taskRequest.getProjectId(), taskRequest.getReporterId(), taskRequest.getAssigneeId());

        Task task = taskMapper.toEntity(taskRequest);
        if (task.getPriority() == null) task.setPriority(TaskPriority.MEDIUM);

        Task savedTask = taskRepository.save(task);
        TaskResponse taskResponse = taskMapper.toResponse(savedTask);

        taskEventPublisher.publishTaskCreated(taskResponse);
        return taskResponse;
    }

    @Transactional
    public TaskResponse createSubTask(UUID parentTaskId, TaskRequest taskRequest) {
        Task parentTask = taskRepository.findById(parentTaskId).orElseThrow(() -> new RuntimeException("Task not found"));
        validateCrossService(null, taskRequest.getReporterId(), taskRequest.getAssigneeId());

        Task subTask = taskMapper.toEntity(taskRequest);
        subTask.setProject(parentTask.getProject());
        subTask.setParentTask(parentTask);
        if (subTask.getPriority() == null) subTask.setPriority(TaskPriority.MEDIUM);

        Task savedTask = taskRepository.save(subTask);
        TaskResponse taskResponse = taskMapper.toResponse(savedTask);

        taskEventPublisher.publishTaskCreated(taskResponse);
        return taskResponse;
    }

    @Transactional
    public TaskResponse updateTask(UUID id, TaskRequest taskRequest) {
        Task task = taskRepository.findById(id).orElseThrow(() -> new RuntimeException("Task not found"));
        if (taskRequest.getAssigneeId() != null && !taskRequest.getAssigneeId().equals(task.getAssignee())) {
            if (!userClient.existsById(taskRequest.getAssigneeId())) throw new RuntimeException("Assignee not found");
        }

        taskMapper.updateEntityFromRequest(taskRequest, task);
        Task savedTask = taskRepository.save(task);
        TaskResponse taskResponse = taskMapper.toResponse(savedTask);

        taskEventPublisher.publishTaskUpdated(taskResponse);
        return taskResponse;
    }

    @Transactional
    public TaskResponse updateTaskStatus(UUID id, TaskRequest taskRequest) {
        Task task = taskRepository.findById(id).orElseThrow(() -> new RuntimeException("Task not found"));
        task.setStatus(taskRequest.getStatus());

        Task savedTask = taskRepository.save(task);
        TaskResponse taskResponse = taskMapper.toResponse(savedTask);

        taskEventPublisher.publishTaskUpdated(taskResponse);
        return taskResponse;
    }

    @Transactional
    public void deleteTask(UUID id) {
        if (!taskRepository.existsById(id)) throw new RuntimeException("Task not found");
        taskRepository.deleteById(id);
        taskEventPublisher.publishTaskDeleted(id);
    }


    public List<TaskResponse> getTaskByProjectId(UUID projectId) {
        return taskRepository.findByProjectId(projectId).stream()
                .map(taskMapper::toResponse)
                .collect(Collectors.toList());
    }

    private void validateCrossService(UUID projectId, UUID reporterId, UUID assigneeId) {
        if (projectId != null && !projectClient.existsById(projectId)) throw new RuntimeException("Project not found");
        if (reporterId != null && !userClient.existsById(reporterId)) throw new RuntimeException("Reporter not found");
        if (assigneeId != null && !userClient.existsById(assigneeId)) throw new RuntimeException("Assignee not found");
    }
}
