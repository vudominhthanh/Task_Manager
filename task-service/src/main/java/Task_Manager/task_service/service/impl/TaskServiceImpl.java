package Task_Manager.task_service.service.impl;

import Task_Manager.common_lib.constant.ProjectPermissions;
import Task_Manager.common_lib.exception.BusinessRuleException;
import Task_Manager.common_lib.exception.ForbiddenAccessException;
import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.utils.Translator;
import Task_Manager.task_service.client.ProjectClient;
import Task_Manager.task_service.client.UserClient;
import Task_Manager.task_service.dto.*;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.entity.TaskPriority;
import Task_Manager.task_service.entity.TaskStatus;
import Task_Manager.task_service.kafka.TaskEventPublisher;
import Task_Manager.task_service.mapper.TaskMapper;
import Task_Manager.task_service.repository.AttachmentRepository;
import Task_Manager.task_service.repository.CommentRepository;
import Task_Manager.task_service.repository.TaskRepository;
import Task_Manager.task_service.service.TaskService;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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
    private final TaskProgressEngine taskProgressEngine;

    @Override
    @Transactional
    public TaskResponse createTask(TaskRequest taskRequest, UUID userId) {
        validateCrossService(taskRequest.getProjectId(), userId, taskRequest.getAssigneeId());

        Task task = taskMapper.toEntity(taskRequest);
        task.setReporter(userId);
        if (task.getPriority() == null) task.setPriority(TaskPriority.MEDIUM);

        Task savedTask = taskRepository.save(task);
        TaskResponse enriched = enrichSingleTask(taskMapper.toResponse(savedTask));

        publishTaskEvent("CREATED", savedTask, enriched, userId, null);
        return enriched;
    }

    @Override
    @Transactional
    public TaskResponse createSubTask(UUID parentTaskId, TaskRequest taskRequest, UUID userId) {
        Task parentTask = findTaskOrThrow(parentTaskId);
        validateTaskOwnership(parentTask, userId, "CREATE_SUBTASK");
        validateCrossService(parentTask.getProject(), userId, taskRequest.getAssigneeId());

        Task subTask = taskMapper.toEntity(taskRequest);
        subTask.setProject(parentTask.getProject());
        subTask.setParentTask(parentTask);
        subTask.setReporter(userId);
        if (subTask.getPriority() == null) subTask.setPriority(TaskPriority.MEDIUM);

        Task savedTask = taskRepository.save(subTask);

        List<Task> subTasks = taskRepository.findByParentTaskId(parentTask.getId());
        taskProgressEngine.calculateRollupMetrics(parentTask, subTasks);
        taskRepository.save(parentTask);

        TaskResponse enriched = enrichSingleTask(taskMapper.toResponse(savedTask));

        publishTaskEvent("SUB_CREATED", savedTask, enriched, userId, null);
        return enriched;
    }

    @Override
    @Transactional
    public TaskResponse updateTask(UUID id, TaskRequest taskRequest, UUID userId) {
        Task task = findTaskOrThrow(id);
        validateTaskOwnership(task, userId, "UPDATE");

        taskMapper.updateEntityFromRequest(taskRequest, task);
        Task savedTask = taskRepository.save(task);

        if (savedTask.getParentTask() != null) {
            List<Task> subTasks = taskRepository.findByParentTaskId(savedTask.getParentTask().getId());
            taskProgressEngine.calculateRollupMetrics(savedTask.getParentTask(), subTasks);
            taskRepository.save(savedTask.getParentTask());
        }

        TaskResponse enriched = enrichSingleTask(taskMapper.toResponse(savedTask));
        publishTaskEvent("UPDATED", savedTask, enriched, userId, null);
        return enriched;
    }

    @Override
    @Transactional
    public TaskResponse updateTaskStatus(UUID id, TaskRequest taskRequest, UUID userId) {
        Task task = findTaskOrThrow(id);
        validateTaskOwnership(task, userId, "UPDATE");

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
            task.setCompletionPercentage(BigDecimal.valueOf(100.00));
            if (task.getCompletedAt() == null) {
                task.setCompletedAt(LocalDateTime.now());
            }
        } else {
            task.setCompletedAt(null);
        }

        Task savedTask = taskRepository.save(task);

        if (savedTask.getParentTask() != null) {
            Task parent = savedTask.getParentTask();
            List<Task> subTasks = taskRepository.findByParentTaskId(parent.getId());
            taskProgressEngine.calculateRollupMetrics(parent, subTasks);
            taskProgressEngine.evaluateParentStatusSync(parent, subTasks);
            taskRepository.save(parent);
        }

        TaskResponse enriched = enrichSingleTask(taskMapper.toResponse(savedTask));
        publishTaskEvent("STATUS_UPDATED", savedTask, enriched, userId, oldStatus);
        return enriched;
    }

    @Override
    @Transactional
    public void deleteTask(UUID id, UUID userId) {
        Task task = findTaskOrThrow(id);
        validateTaskOwnership(task, userId, "DELETE");

        Task parent = task.getParentTask();
        taskRepository.deleteById(id);

        if (parent != null) {
            List<Task> remainingSubTasks = taskRepository.findByParentTaskId(parent.getId());
            taskProgressEngine.calculateRollupMetrics(parent, remainingSubTasks);
            taskProgressEngine.evaluateParentStatusSync(parent, remainingSubTasks);
            taskRepository.save(parent);
        }
    }

    @Override
    public List<TaskResponse> getTaskByProjectId(UUID projectId) {
        List<TaskResponse> responses = taskRepository.findByProject(projectId).stream()
                .filter(task -> task.getParentTask() == null)
                .map(taskMapper::toResponse)
                .collect(Collectors.toList());

        List<TaskResponse> enrichedResponses = enrichWithUserDetails(responses);
        enrichTaskCounts(enrichedResponses);
        return enrichedResponses;
    }

    @Override
    public List<TaskResponse> getTaskByProjectId(UUID projectId, UUID userId) {

        List<TaskResponse> responses = taskRepository.findByProject(projectId).stream()
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

            taskProgressEngine.enrichSubTaskContributions(response);
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

    @Override
    public TaskStatisticsDto getTaskStatistics(UUID projectId) {
        long totalTasks = taskRepository.countByProject(projectId);
        long completedTasks = taskRepository.countByProjectAndStatus(projectId, TaskStatus.DONE);
        return new TaskStatisticsDto(totalTasks, completedTasks);
    }



    private Task findTaskOrThrow(UUID id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.task.not_found", id)));
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

        if ("STATUS_UPDATED".equals(eventType)) {
            UUID projectUuid = savedTask.getProject() != null ? savedTask.getProject() : (savedTask.getParentTask() != null ? savedTask.getParentTask().getProject() : null);
            TaskEventDto event = taskMapper.toTaskStatusUpdatedEvent(enriched, actor, projectName, projectUuid, oldStatus);
            taskEventPublisher.publishTaskStatusUpdated(savedTask.getId(), event);
            return;
        }
        if ("SUB_CREATED".equals(eventType)) {
            TaskEventDto event = taskMapper.toSubTaskCreatedEvent(enriched, actor, projectName);
            taskEventPublisher.publishSubTaskCreated(savedTask.getId(), event);
        } else if ("CREATED".equals(eventType)) {
            TaskEventDto event = taskMapper.toTaskCreatedEvent(enriched, actor, projectName);
            taskEventPublisher.publishTaskCreated(savedTask.getId(), event);
        } else {
            TaskEventDto event = taskMapper.toTaskUpdatedEvent(enriched, actor, projectName);
            taskEventPublisher.publishTaskUpdated(savedTask.getId(), event);
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
        if (userId == null) return new ActorInfo(null, "Thành viên", "U");

        try {
            List<UserDto> users = userClient.getUsersByIds(Collections.singletonList(userId));
            if (users != null && !users.isEmpty()) {
                UserDto user = users.get(0);
                String name = (user.getFullName() != null && !user.getFullName().trim().isEmpty())
                        ? user.getFullName() : user.getUsername();

                String avatar = (user.getAvatarUrl() != null && !user.getAvatarUrl().isEmpty())
                        ? user.getAvatarUrl()
                        : (name != null && !name.isEmpty() ? name.substring(0, 1).toUpperCase() : "U");

                return new ActorInfo(userId, name, avatar);
            }
        } catch (Exception e) {
            log.warn("Không thể lấy thông tin user {}: {}", userId, e.getMessage());
        }
        return new ActorInfo(userId, "Thành viên", "U");
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

    private boolean hasPermission(Set<String> permissions, String... requiredPermissions) {
        if (permissions == null || permissions.isEmpty()) {
            return false;
        }
        if (permissions.contains("*")) {
            return true;
        }
        for (String perm : requiredPermissions) {
            if (permissions.contains(perm)) {
                return true;
            }
        }
        return false;
    }

    private void validateTaskOwnership(Task task, UUID currentUserId, String actionType) {
        log.info("[TaskService-Security] Bắt đầu kiểm tra quyền {} cho Task ID: {}", actionType, task.getId());
        log.info("[TaskService-Security] User thực hiện request: {}", currentUserId);

        // 1. Kiểm tra xem User có phải là Project Admin (Quyền cao nhất của dự án) không?
        boolean isProjectAdmin = false;
        try {
            Set<String> projectPerms = projectClient.getUserPermissions(task.getProject(), currentUserId);
            log.info("[TaskService-Security] Danh sách quyền Project Role của User: {}", projectPerms);

            // PROJECT_DELETE là quyền cao nhất, chỉ Admin/Owner mới có
            if (projectPerms != null && projectPerms.contains(ProjectPermissions.PROJECT_DELETE)) {
                isProjectAdmin = true;
                log.info("[TaskService-Security] User là Project Admin -> Bỏ qua check Ownership.");
            }
        } catch (Exception e) {
            log.warn("[TaskService-Security] Không lấy được quyền Project: {}", e.getMessage());
        }

        // Nếu là Admin dự án -> Cho phép mọi thao tác
        if (isProjectAdmin) return;

        // 2. Xác định vai trò của User đối với Task này
        boolean isReporter = task.getReporter() != null && task.getReporter().equals(currentUserId);
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().equals(currentUserId);

        log.info("[TaskService-Security] User là Reporter: {}", isReporter);
        log.info("[TaskService-Security] User là Assignee: {}", isAssignee);

        // Nếu là Sub-task, kiểm tra thêm quyền từ Task Cha
        boolean isSubTask = task.getParentTask() != null;
        boolean isParentReporter = false;
        boolean isParentAssignee = false;

        if (isSubTask) {
            isParentReporter = task.getParentTask().getReporter() != null && task.getParentTask().getReporter().equals(currentUserId);
            isParentAssignee = task.getParentTask().getAssignee() != null && task.getParentTask().getAssignee().equals(currentUserId);
            log.info("[TaskService-Security] (Sub-task) User là Parent Reporter: {}", isParentReporter);
            log.info("[TaskService-Security] (Sub-task) User là Parent Assignee: {}", isParentAssignee);
        }

        // 3. Phân định quyền theo Action
        switch (actionType) {
            case "UPDATE":
            case "STATUS_UPDATE":
                if (!isAssignee && !isReporter && !isParentAssignee && !isParentReporter) {
                    log.error("[TaskService-Security] TỪ CHỐI (403): User {} cố gắng sửa Task {} không thuộc thẩm quyền.", currentUserId, task.getId());
                    throw new ForbiddenAccessException("Bạn không có quyền cập nhật công việc này vì bạn không phải người phụ trách!");
                }
                log.info("[TaskService-Security] CHẤP NHẬN: User có quyền sửa đổi.");
                break;

            case "DELETE":
                if (!isReporter && !isParentAssignee && !isParentReporter) {
                    log.error("[TaskService-Security] TỪ CHỐI (403): User {} cố gắng xóa Task {}.", currentUserId, task.getId());
                    throw new ForbiddenAccessException("Chỉ người tạo công việc hoặc quản lý dự án mới có quyền xóa!");
                }
                log.info("[TaskService-Security] CHẤP NHẬN: User có quyền xóa.");
                break;

            case "CREATE_SUBTASK":
                if (!isAssignee && !isReporter) {
                    log.error("[TaskService-Security] TỪ CHỐI (403): User {} cố tạo subtask cho Task {}.", currentUserId, task.getId());
                    throw new ForbiddenAccessException("Chỉ người phụ trách hoặc người tạo công việc mới được phép thêm việc con!");
                }
                log.info("[TaskService-Security] CHẤP NHẬN: User có quyền tạo sub-task.");
                break;
        }
    }

    @Getter
    @AllArgsConstructor
    public static class ActorInfo {
        private UUID id;
        private String name;
        private String avatar;
    }
}