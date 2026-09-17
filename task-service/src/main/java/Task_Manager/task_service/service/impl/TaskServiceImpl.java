package Task_Manager.task_service.service.impl;

import Task_Manager.task_service.client.ProjectClient;
import Task_Manager.task_service.client.UserClient;
import Task_Manager.task_service.dto.ProjectDto;
import Task_Manager.task_service.dto.TaskRequest;
import Task_Manager.task_service.dto.TaskResponse;
import Task_Manager.task_service.dto.UserDto;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.entity.TaskPriority;
import Task_Manager.task_service.entity.TaskStatus;
import Task_Manager.task_service.kafka.TaskEventPublisher;
import Task_Manager.task_service.mapper.TaskMapper;
import Task_Manager.task_service.repository.AttachmentRepository;
import Task_Manager.task_service.repository.CommentRepository;
import Task_Manager.task_service.repository.TaskRepository;
import Task_Manager.task_service.service.TaskService;

import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.exception.ForbiddenAccessException;
import Task_Manager.common_lib.exception.BusinessRuleException;
import Task_Manager.common_lib.utils.Translator;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;
    private final UserClient userClient;
    private final ProjectClient projectClient;
    private final TaskEventPublisher taskEventPublisher;
    private final CommentRepository commentRepository;
    private final AttachmentRepository attachmentRepository;

    @Override
    public TaskResponse createTask(TaskRequest taskRequest, UUID userId, boolean isSystemAdmin) {
        validateCrossService(taskRequest.getProjectId(), userId, taskRequest.getAssigneeId());
        validateCreatePermission(taskRequest.getProjectId(), userId, isSystemAdmin);

        Task task = taskMapper.toEntity(taskRequest);
        task.setReporter(userId);
        if (task.getPriority() == null) task.setPriority(TaskPriority.MEDIUM);

        Task savedTask = taskRepository.save(task);
        TaskResponse enriched = enrichSingleTask(taskMapper.toResponse(savedTask));

        publishTaskEvent("CREATED", savedTask, enriched, userId, null);
        return enriched;
    }

    @Override
    public TaskResponse createSubTask(UUID parentTaskId, TaskRequest taskRequest, UUID userId, boolean isSystemAdmin) {
        Task parentTask = findTaskOrThrow(parentTaskId);
        validateCrossService(parentTask.getProject(), userId, taskRequest.getAssigneeId());
        validateSubTaskCreatePermission(parentTask, userId, isSystemAdmin);

        Task subTask = taskMapper.toEntity(taskRequest);
        subTask.setProject(parentTask.getProject());
        subTask.setParentTask(parentTask);
        subTask.setReporter(userId);
        if (subTask.getPriority() == null) subTask.setPriority(TaskPriority.MEDIUM);

        Task savedTask = taskRepository.save(subTask);
        TaskResponse enriched = enrichSingleTask(taskMapper.toResponse(savedTask));

        publishTaskEvent("SUB_CREATED", savedTask, enriched, userId, null);
        return enriched;
    }

    @Override
    public TaskResponse updateTask(UUID id, TaskRequest taskRequest, UUID userId, boolean isSystemAdmin) {
        Task task = findTaskOrThrow(id);
        validateUpdatePermission(task, taskRequest, userId, isSystemAdmin);

        taskMapper.updateEntityFromRequest(taskRequest, task);
        Task savedTask = taskRepository.save(task);
        TaskResponse enriched = enrichSingleTask(taskMapper.toResponse(savedTask));

        publishTaskEvent("UPDATED", savedTask, enriched, userId, null);
        return enriched;
    }

    @Override
    public TaskResponse updateTaskStatus(UUID id, TaskRequest taskRequest, UUID userId, boolean isSystemAdmin) {
        Task task = findTaskOrThrow(id);
        validateStatusUpdatePermission(task, userId, isSystemAdmin);

        if (task.getParentTask() == null && taskRequest.getStatus() == TaskStatus.DONE) {
            List<Task> subTasks = taskRepository.findByParentTaskId(id);
            boolean hasUnfinishedSubtasks = subTasks.stream()
                    .anyMatch(st -> st.getStatus() != TaskStatus.DONE);
            if (hasUnfinishedSubtasks) {
                throw new BusinessRuleException(Translator.toLocale("error.task.subtasks_not_completed"));
            }
        }

        String oldStatus = String.valueOf(task.getStatus());
        task.setStatus(taskRequest.getStatus());

        if (taskRequest.getStatus() == TaskStatus.DONE) {
            if (task.getCompletedAt() == null) {
                task.setCompletedAt(LocalDateTime.now());
            }
        } else {
            task.setCompletedAt(null);
        }

        Task savedTask = taskRepository.save(task);

        if (savedTask.getParentTask() != null) {
            syncParentTaskStatus(savedTask.getParentTask());
        }

        TaskResponse enriched = enrichSingleTask(taskMapper.toResponse(savedTask));

        publishTaskEvent("STATUS_UPDATED", savedTask, enriched, userId, oldStatus);
        return enriched;
    }

    @Override
    public void deleteTask(UUID id, UUID userId, boolean isSystemAdmin) {
        Task task = findTaskOrThrow(id);
        validateDeletePermission(task, userId, isSystemAdmin);

        String projectName = fetchProjectName(task.getProject());
        ActorInfo actor = fetchActorDetails(userId);
        String status = task.getStatus() != null ? task.getStatus().name() : "TO_DO";
        UUID projectId = task.getProject();

        taskRepository.deleteById(id);

        taskEventPublisher.publishTaskDeleted(id, Map.of(
                "taskId", id,
                "status", status,
                "projectId", projectId != null ? projectId.toString() : "",
                "projectName", projectName,
                "targetName", task.getTitle() != null ? task.getTitle() : "Task",
                "createdBy", userId,
                "username", actor.getName(),
                "userAvatar", actor.getAvatar()
        ));
    }

    @Override
    public List<TaskResponse> getTaskByProjectId(UUID projectId) {
        List<TaskResponse> responses = taskRepository.findByProjectId(projectId).stream()
                .filter(task -> task.getParentTask() == null)
                .map(taskMapper::toResponse)
                .collect(Collectors.toList());

        List<TaskResponse> enrichedResponses = enrichWithUserDetails(responses);
        enrichTaskCounts(enrichedResponses);
        return enrichedResponses;
    }

    @Override
    public List<TaskResponse> getTasksByIds(List<UUID> taskIds) {
        return taskRepository.findAllById(taskIds).stream()
                .map(taskMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public TaskResponse getTaskById(UUID id) {
        Task task = findTaskOrThrow(id);
        TaskResponse response = taskMapper.toResponse(task);

        List<Task> subTasks = taskRepository.findByParentTaskId(id);
        if (subTasks != null && !subTasks.isEmpty()) {
            List<TaskResponse> subTaskResponses = subTasks.stream()
                    .map(taskMapper::toResponse)
                    .collect(Collectors.toList());
            response.setSubTasks(enrichWithUserDetails(subTaskResponses));
        } else {
            response.setSubTasks(new ArrayList<>());
        }

        return enrichSingleTask(response);
    }

    @Override
    public List<TaskResponse> getTasksByAssigneeId(UUID assigneeId) {
        List<TaskResponse> responses = taskRepository.findByAssignee(assigneeId).stream()
                .map(taskMapper::toResponse)
                .collect(Collectors.toList());
        return enrichWithUserDetails(responses);
    }

    private Task findTaskOrThrow(UUID id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.task.not_found", id)));
    }

    private void validateCreatePermission(UUID projectId, UUID userId, boolean isSystemAdmin) {
        if (isSystemAdmin) return;
        if (projectId != null && projectClient.isProjectAdmin(projectId, userId)) return;

        throw new ForbiddenAccessException(Translator.toLocale("error.task.access_denied_create"));
    }

    private void validateSubTaskCreatePermission(Task parentTask, UUID userId, boolean isSystemAdmin) {
        if (isSystemAdmin) return;
        UUID projectId = parentTask.getProject();
        if (projectId != null && projectClient.isProjectAdmin(projectId, userId)) return;
        if (parentTask.getReporter() != null && parentTask.getReporter().equals(userId)) return;
        if (parentTask.getAssignee() != null && parentTask.getAssignee().equals(userId)) return;

        throw new ForbiddenAccessException(Translator.toLocale("error.task.access_denied_subtask"));
    }

    private void validateUpdatePermission(Task task, TaskRequest request, UUID userId, boolean isSystemAdmin) {
        UUID projectId = task.getProject();
        boolean isProjectAdmin = projectId != null && projectClient.isProjectAdmin(projectId, userId);
        boolean isReporter = task.getReporter() != null && task.getReporter().equals(userId);

        boolean isAssigneeChanged = request.getAssigneeId() != null && !Objects.equals(request.getAssigneeId(), task.getAssignee());
        if (isAssigneeChanged) {
            if (!isSystemAdmin && !isProjectAdmin && !isReporter) {
                throw new ForbiddenAccessException(Translator.toLocale("error.task.access_denied_reassign"));
            }
            if (!userClient.existsById(request.getAssigneeId())) {
                throw new ResourceNotFoundException(Translator.toLocale("error.user.assignee_not_found", request.getAssigneeId()));
            }
        }

        boolean isAssignee = task.getAssignee() != null && task.getAssignee().equals(userId);
        boolean isSubTask = task.getParentTask() != null;

        if (!isSubTask) {
            if (!isSystemAdmin && !isProjectAdmin && !isReporter) {
                throw new ForbiddenAccessException(Translator.toLocale("error.task.access_denied_assignee_update"));
            }
        } else {
            boolean isParentAssignee = task.getParentTask().getAssignee() != null && task.getParentTask().getAssignee().equals(userId);
            if (!isSystemAdmin && !isProjectAdmin && !isReporter && !isAssignee && !isParentAssignee) {
                throw new ForbiddenAccessException(Translator.toLocale("error.task.access_denied_subtask_update"));
            }
        }
    }

    private void validateStatusUpdatePermission(Task task, UUID userId, boolean isSystemAdmin) {
        if (isSystemAdmin) return;

        UUID projectId = task.getProject();
        if (projectId != null && projectClient.isProjectAdmin(projectId, userId)) return;
        if (task.getAssignee() != null && task.getAssignee().equals(userId)) return;
        if (task.getReporter() != null && task.getReporter().equals(userId)) return;
        if (task.getParentTask() != null) {
            Task parent = task.getParentTask();
            if (parent.getAssignee() != null && parent.getAssignee().equals(userId)) {
                return;
            }
            if (parent.getReporter() != null && parent.getReporter().equals(userId)) {
                return;
            }
        }
        throw new ForbiddenAccessException(Translator.toLocale("error.task.access_denied_status"));
    }

    private void validateDeletePermission(Task task, UUID userId, boolean isSystemAdmin) {
        if (isSystemAdmin) return;
        UUID projectId = task.getProject();
        if (projectId != null && projectClient.isProjectAdmin(projectId, userId)) return;
        if (task.getReporter() != null && task.getReporter().equals(userId)) return;
        if (task.getParentTask() != null) {
            Task parent = task.getParentTask();
            if (parent.getAssignee() != null && parent.getAssignee().equals(userId)) return;
            if (parent.getReporter() != null && parent.getReporter().equals(userId)) return;
        }
        throw new ForbiddenAccessException(Translator.toLocale("error.task.access_denied_delete"));
    }

    private void validateCrossService(UUID projectId, UUID reporterId, UUID assigneeId) {
        if (projectId != null && !projectClient.existsById(projectId)) {
            throw new ResourceNotFoundException(Translator.toLocale("error.project.not_found", projectId));
        }
        if (reporterId != null && !userClient.existsById(reporterId)) {
            throw new ResourceNotFoundException(Translator.toLocale("error.user.reporter_not_found", reporterId));
        }
        if (assigneeId != null && !userClient.existsById(assigneeId)) {
            throw new ResourceNotFoundException(Translator.toLocale("error.user.assignee_not_found", assigneeId));
        }
    }

    private TaskResponse enrichSingleTask(TaskResponse response) {
        return enrichWithUserDetails(Collections.singletonList(response)).get(0);
    }

    private void publishTaskEvent(String eventType, Task savedTask, TaskResponse enriched, UUID userId, String oldStatus) {
        String projectName = fetchProjectName(savedTask.getProject());
        ActorInfo actor = fetchActorDetails(userId);

        UUID projectUuid = savedTask.getProject() != null ? savedTask.getProject()
                : (savedTask.getParentTask() != null ? savedTask.getParentTask().getProject() : null);

        Map<String, Object> payload = new HashMap<>(Map.of(
                "task", enriched,
                "createdBy", userId,
                "username", actor.getName(),
                "userAvatar", actor.getAvatar(),
                "targetName", enriched.getTitle() != null ? enriched.getTitle() : "Task",
                "projectName", projectName
        ));

        if ("STATUS_UPDATED".equals(eventType)) {
            payload.put("oldStatus", oldStatus != null ? oldStatus : "TO_DO");
            payload.put("projectId", projectUuid != null ? projectUuid.toString() : "");
            taskEventPublisher.publishTaskStatusUpdated(savedTask.getId(), payload);
        } else if ("SUB_CREATED".equals(eventType)) {
            taskEventPublisher.publishSubTaskCreated(savedTask.getId(), payload);
        } else if ("CREATED".equals(eventType)) {
            taskEventPublisher.publishTaskCreated(savedTask.getId(), payload);
        } else {
            taskEventPublisher.publishTaskUpdated(savedTask.getId(), payload);
        }
    }

    private String fetchProjectName(UUID projectId) {
        if (projectId == null) return "Dự án hệ thống";
        try {
            List<ProjectDto> projects = projectClient.getProjectsByIds(Collections.singletonList(projectId));
            if (projects != null && !projects.isEmpty()) {
                String name = projects.get(0).getName();
                return (name != null && !name.trim().isEmpty()) ? name : "Dự án hệ thống";
            }
        } catch (Exception e) {
            log.warn("Không thể lấy tên dự án ID {}: {}", projectId, e.getMessage());
        }
        return "Dự án hệ thống";
    }

    private ActorInfo fetchActorDetails(UUID userId) {
        if (userId == null) return new ActorInfo("Thành viên", "U");

        try {
            List<UserDto> users = userClient.getUsersByIds(Collections.singletonList(userId));
            if (users != null && !users.isEmpty()) {
                UserDto user = users.get(0);
                String name = (user.getFullName() != null && !user.getFullName().trim().isEmpty())
                        ? user.getFullName() : user.getUsername();

                String avatar = (user.getAvatarUrl() != null && !user.getAvatarUrl().isEmpty())
                        ? user.getAvatarUrl()
                        : (name != null && !name.isEmpty() ? name.substring(0, 1).toUpperCase() : "U");

                return new ActorInfo(name, avatar);
            }
        } catch (Exception e) {
            log.warn("Không thể lấy thông tin user {}: {}", userId, e.getMessage());
        }
        return new ActorInfo("Thành viên", "U");
    }

    private List<TaskResponse> enrichWithUserDetails(List<TaskResponse> responses) {
        if (responses == null || responses.isEmpty()) return responses;

        Set<UUID> userIds = new HashSet<>();
        responses.forEach(res -> {
            if (res.getAssigneeId() != null) userIds.add(res.getAssigneeId());
            if (res.getReporterId() != null) userIds.add(res.getReporterId());
        });

        if (userIds.isEmpty()) return responses;

        Map<UUID, UserDto> userMap = new HashMap<>();
        try {
            List<UserDto> users = userClient.getUsersByIds(new ArrayList<>(userIds));
            userMap = users.stream().collect(Collectors.toMap(UserDto::getUserId, u -> u));
        } catch (Exception e) {
            log.warn("Lỗi lấy thông tin User: {}", e.getMessage());
        }

        for (TaskResponse res : responses) {
            if (res.getAssigneeId() != null && userMap.containsKey(res.getAssigneeId())) {
                UserDto assignee = userMap.get(res.getAssigneeId());
                res.setAssigneeName(assignee.getFullName() != null ? assignee.getFullName() : assignee.getUsername());
                res.setAssigneeAvatar(assignee.getAvatarUrl() != null ? assignee.getAvatarUrl() : assignee.getUsername().substring(0, 1).toUpperCase());
            }

            if (res.getReporterId() != null && userMap.containsKey(res.getReporterId())) {
                UserDto reporter = userMap.get(res.getReporterId());
                res.setReporterName(reporter.getFullName() != null ? reporter.getFullName() : reporter.getUsername());
                res.setReporterAvatar(reporter.getAvatarUrl() != null ? reporter.getAvatarUrl() : reporter.getUsername().substring(0, 1).toUpperCase());
            }
        }
        return responses;
    }

    private void enrichTaskCounts(List<TaskResponse> responses) {
        if (responses == null || responses.isEmpty()) return;
        List<UUID> taskIds = responses.stream().map(TaskResponse::getId).filter(Objects::nonNull).toList();
        if (taskIds.isEmpty()) return;

        Map<UUID, Integer> commentMap = fetchCountsMap(commentRepository.countCommentsByTaskIds(taskIds));
        Map<UUID, Integer> attachmentMap = fetchCountsMap(attachmentRepository.countAttachmentsByTaskIds(taskIds));

        responses.forEach(res -> {
            res.setCommentCount(commentMap.getOrDefault(res.getId(), 0));
            res.setAttachmentCount(attachmentMap.getOrDefault(res.getId(), 0));
        });
    }

    private Map<UUID, Integer> fetchCountsMap(List<Object[]> rawCounts) {
        Map<UUID, Integer> map = new HashMap<>();
        if (rawCounts != null) {
            for (Object[] row : rawCounts) {
                map.put((UUID) row[0], row[1] != null ? ((Long) row[1]).intValue() : 0);
            }
        }
        return map;
    }

    private void syncParentTaskStatus(Task parentTask) {
        List<Task> subTasks = taskRepository.findByParentTaskId(parentTask.getId());
        if (subTasks.isEmpty()) return;

        boolean allDone = subTasks.stream().allMatch(st -> st.getStatus() == TaskStatus.DONE);
        boolean anyStarted = subTasks.stream().anyMatch(st -> st.getStatus() == TaskStatus.IN_PROGRESS || st.getStatus() == TaskStatus.DONE);

        TaskStatus oldStatus = parentTask.getStatus();

        if (allDone) {
            parentTask.setStatus(TaskStatus.DONE);
            if (parentTask.getCompletedAt() == null) {
                parentTask.setCompletedAt(LocalDateTime.now());
            }
        } else if (anyStarted && parentTask.getStatus() == TaskStatus.TO_DO) {
            parentTask.setStatus(TaskStatus.IN_PROGRESS);
            parentTask.setCompletedAt(null);
        } else if (!allDone && parentTask.getStatus() == TaskStatus.DONE) {
            parentTask.setStatus(TaskStatus.IN_PROGRESS);
            parentTask.setCompletedAt(null);
        }

        if (oldStatus != parentTask.getStatus()) {
            taskRepository.save(parentTask);
        }
    }

    @Getter
    @AllArgsConstructor
    private static class ActorInfo {
        private String name;
        private String avatar;
    }
}