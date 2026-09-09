package Task_Manager.task_service.service;

import Task_Manager.task_service.client.ProjectClient;
import Task_Manager.task_service.client.UserClient;
import Task_Manager.task_service.dto.ProjectDto;
import Task_Manager.task_service.dto.TaskRequest;
import Task_Manager.task_service.dto.TaskResponse;
import Task_Manager.task_service.dto.UserDto;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.entity.TaskPriority;
import Task_Manager.task_service.kafka.TaskEventPublisher;
import Task_Manager.task_service.mapper.TaskMapper;
import Task_Manager.task_service.repository.AttachmentRepository;
import Task_Manager.task_service.repository.CommentRepository;
import Task_Manager.task_service.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {
    private final TaskRepository taskRepository;
    private final TaskMapper taskMapper;

    private final UserClient userClient;
    private final ProjectClient projectClient;
    private final TaskEventPublisher taskEventPublisher;

    private final CommentRepository commentRepository;
    private final AttachmentRepository attachmentRepository;

    private String fetchProjectName(UUID projectId) {
        if (projectId == null) return "Dự án hệ thống";
        try {
            List<ProjectDto> projects = projectClient.getProjectsByIds(Collections.singletonList(projectId));
            if (projects != null && !projects.isEmpty()) {
                String name = projects.get(0).getName();
                return (name != null && !name.isEmpty()) ? name : "Dự án hệ thống";
            }
        } catch (Exception e) {
            log.warn("Không thể lấy tên dự án cho ID {}: {}", projectId, e.getMessage());
        }
        return "Dự án hệ thống";
    }

    private Map<String, String> fetchActorDetails(UUID userId) {
        Map<String, String> actorInfo = new HashMap<>();
        actorInfo.put("name", "Thành viên");
        actorInfo.put("avatar", "U");

        if (userId == null) return actorInfo;

        try {
            List<UserDto> users = userClient.getUsersByIds(Collections.singletonList(userId));
            if (users != null && !users.isEmpty()) {
                UserDto user = users.get(0);
                String name = user.getFullName() != null ? user.getFullName() : user.getUsername();
                String avatar = user.getAvatarUrl() != null ? user.getAvatarUrl() : (name != null && !name.isEmpty() ? name.substring(0, 1).toUpperCase() : "U");

                actorInfo.put("name", name != null ? name : "Thành viên");
                actorInfo.put("avatar", avatar);
            }
        } catch (Exception e) {
            log.warn("Không thể lấy thông tin user thực hiện hành động {}: {}", userId, e.getMessage());
        }
        return actorInfo;
    }

    public TaskResponse createTask(TaskRequest taskRequest, UUID userId, boolean isSystemAdmin) {
        validateCrossService(taskRequest.getProjectId(), userId, taskRequest.getAssigneeId());

        boolean isProjectAdmin = projectClient.isProjectAdmin(taskRequest.getProjectId(), userId);
        if (!isSystemAdmin && !isProjectAdmin) {
            throw new RuntimeException("Access Denied: Chỉ có Admin hệ thống hoặc Admin dự án mới được tạo công việc.");
        }

        Task task = taskMapper.toEntity(taskRequest);
        task.setReporter(userId);

        if (task.getPriority() == null) task.setPriority(TaskPriority.MEDIUM);

        Task savedTask = taskRepository.save(task);
        TaskResponse taskResponse = taskMapper.toResponse(savedTask);
        TaskResponse enriched = enrichWithUserDetails(Collections.singletonList(taskResponse)).get(0);

        String projectName = fetchProjectName(savedTask.getProject());
        Map<String, String> actor = fetchActorDetails(userId);

        taskEventPublisher.publishTaskCreated(savedTask.getId(), Map.of(
                "task", enriched,
                "createdBy", userId,
                "username", actor.get("name"),
                "userAvatar", actor.get("avatar"),
                "targetName", enriched.getTitle(),
                "projectName", projectName
        ));

        return enriched;
    }

    public TaskResponse createSubTask(UUID parentTaskId, TaskRequest taskRequest, UUID userId, boolean isSystemAdmin) {
        Task parentTask = taskRepository.findById(parentTaskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        validateCrossService(parentTask.getProject(), userId, taskRequest.getAssigneeId());

        UUID projectId = parentTask.getProject() != null ? parentTask.getProject() : null;
        boolean isProjectAdmin = projectId != null && projectClient.isProjectAdmin(projectId, userId);
        boolean isParentReporter = parentTask.getReporter() != null && parentTask.getReporter().equals(userId);
        boolean isParentAssignee = parentTask.getAssignee() != null && parentTask.getAssignee().equals(userId);

        // Cho phép Admin, Reporter của task cha HOẶC Assignee của task cha được tạo subtask
        if (!isSystemAdmin && !isProjectAdmin && !isParentReporter && !isParentAssignee) {
            throw new RuntimeException("Access Denied: Bạn không có quyền tạo công việc con cho công việc này.");
        }

        Task subTask = taskMapper.toEntity(taskRequest);
        subTask.setProject(parentTask.getProject());
        subTask.setParentTask(parentTask);
        subTask.setReporter(userId);

        if (subTask.getPriority() == null) subTask.setPriority(TaskPriority.MEDIUM);

        Task savedTask = taskRepository.save(subTask);
        TaskResponse taskResponse = taskMapper.toResponse(savedTask);
        TaskResponse enriched = enrichWithUserDetails(Collections.singletonList(taskResponse)).get(0);

        String projectName = fetchProjectName(savedTask.getProject());
        Map<String, String> actor = fetchActorDetails(userId);

        taskEventPublisher.publishSubTaskCreated(savedTask.getId(), Map.of(
                "task", enriched,
                "createdBy", userId,
                "username", actor.get("name"),
                "userAvatar", actor.get("avatar"),
                "targetName", enriched.getTitle(),
                "projectName", projectName
        ));

        return enriched;
    }

    public TaskResponse updateTask(UUID id, TaskRequest taskRequest, UUID userId, boolean isSystemAdmin) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        UUID projectId = task.getProject() != null ? task.getProject() : null;
        boolean isProjectAdmin = projectId != null && projectClient.isProjectAdmin(projectId, userId);
        boolean isReporter = task.getReporter() != null && task.getReporter().equals(userId);
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().equals(userId);

        boolean isSubTask = task.getParentTask() != null;

        if (!isSubTask) {
            if (!isSystemAdmin && !isProjectAdmin && !isReporter) {
                throw new RuntimeException("Access Denied: Người được giao việc (Assignee) không được quyền sửa thông tin công việc chính.");
            }
        } else {
            boolean isParentAssignee = task.getParentTask().getAssignee() != null
                    && task.getParentTask().getAssignee().equals(userId);

            if (!isSystemAdmin && !isProjectAdmin && !isReporter && !isAssignee && !isParentAssignee) {
                throw new RuntimeException("Access Denied: Bạn không có quyền chỉnh sửa công việc con này.");
            }
        }

        boolean isAssigneeChanged = taskRequest.getAssigneeId() != null
                && !Objects.equals(taskRequest.getAssigneeId(), task.getAssignee());

        if (isAssigneeChanged) {
            if (!isSystemAdmin && !isProjectAdmin && !isReporter) {
                throw new RuntimeException("Access Denied: Chỉ Admin hoặc người tạo task mới có quyền phân công lại người phụ trách.");
            }
            if (!userClient.existsById(taskRequest.getAssigneeId())) {
                throw new RuntimeException("Assignee not found");
            }
        }

        taskMapper.updateEntityFromRequest(taskRequest, task);
        Task savedTask = taskRepository.save(task);
        TaskResponse taskResponse = taskMapper.toResponse(savedTask);
        TaskResponse enriched = enrichWithUserDetails(Collections.singletonList(taskResponse)).get(0);

        String projectName = fetchProjectName(savedTask.getProject());
        Map<String, String> actor = fetchActorDetails(userId);

        taskEventPublisher.publishTaskUpdated(savedTask.getId(), Map.of(
                "task", enriched,
                "createdBy", userId,
                "username", actor.get("name"),
                "userAvatar", actor.get("avatar"),
                "targetName", enriched.getTitle(),
                "projectName", projectName
        ));

        return enriched;
    }

    public TaskResponse updateTaskStatus(UUID id, TaskRequest taskRequest, UUID userId, boolean isSystemAdmin) {
        Task task = taskRepository.findById(id).orElseThrow(() -> new RuntimeException("Task not found"));

        UUID projectId = task.getProject() != null ? task.getProject() : null;
        boolean isProjectAdmin = projectId != null && projectClient.isProjectAdmin(projectId, userId);
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().equals(userId);
        boolean isReporter = task.getReporter() != null && task.getReporter().equals(userId);

        if (!isSystemAdmin && !isProjectAdmin && !isAssignee && !isReporter) {
            throw new RuntimeException("Access Denied: Bạn không có quyền cập nhật trạng thái công việc này.");
        }

        String oldStatus = String.valueOf(task.getStatus());
        task.setStatus(taskRequest.getStatus());

        Task savedTask = taskRepository.save(task);
        TaskResponse taskResponse = taskMapper.toResponse(savedTask);
        TaskResponse enriched = enrichWithUserDetails(Collections.singletonList(taskResponse)).get(0);

        String projectName = fetchProjectName(savedTask.getProject());
        Map<String, String> actor = fetchActorDetails(userId);

        UUID projectUuid = savedTask.getProject() != null ? savedTask.getProject()
                : (savedTask.getParentTask() != null ? savedTask.getParentTask().getProject() : null);

        taskEventPublisher.publishTaskStatusUpdated(savedTask.getId(), Map.of(
                "projectId", projectUuid != null ? projectUuid.toString() : "",
                "task", enriched,
                "oldStatus", oldStatus != null ? oldStatus : "TO_DO",
                "createdBy", userId,
                "username", actor.get("name"),
                "userAvatar", actor.get("avatar"),
                "targetName", enriched.getTitle() != null ? enriched.getTitle() : "Task",
                "projectName", projectName
        ));
        return enriched;
    }

    public void deleteTask(UUID id, UUID userId, boolean isSystemAdmin) {
        Task task = taskRepository.findById(id).orElseThrow(() -> new RuntimeException("Task not found"));

        UUID projectId = task.getProject() != null ? task.getProject() : null;
        boolean isProjectAdmin = projectId != null && projectClient.isProjectAdmin(projectId, userId);
        boolean isReporter = task.getReporter() != null && task.getReporter().equals(userId);

        if (!isSystemAdmin && !isProjectAdmin && !isReporter) {
            throw new RuntimeException("Access Denied: Bạn không có quyền xóa công việc này.");
        }

        String projectName = fetchProjectName(projectId);
        Map<String, String> actor = fetchActorDetails(userId);

        taskRepository.deleteById(id);
        taskEventPublisher.publishTaskDeleted(id, Map.of(
                "taskId", id,
                "status", task.getStatus() != null ? task.getStatus() : "TO_DO",
                "projectId", projectId != null ? projectId.toString() : "",
                "projectName", projectName,
                "targetName", task.getTitle() != null ? task.getTitle() : "Task",
                "createdBy", userId,
                "username", actor.get("name"),
                "userAvatar", actor.get("avatar")
        ));
    }

    public List<TaskResponse> getTaskByProjectId(UUID projectId) {
        List<TaskResponse> responses = taskRepository.findByProjectId(projectId).stream()
                .filter(task -> task.getParentTask() == null)
                .map(taskMapper::toResponse)
                .collect(Collectors.toList());

        List<TaskResponse> enrichedResponses = enrichWithUserDetails(responses);

        enrichTaskCounts(enrichedResponses);

        return enrichedResponses;
    }

    public List<TaskResponse> getTasksByIds(List<UUID> taskIds) {
        List<Task> tasks = taskRepository.findAllById(taskIds);
        return tasks.stream()
                .map(taskMapper::toResponse)
                .collect(Collectors.toList());
    }

    public TaskResponse getTaskById(UUID id) {
        Task task = taskRepository.findById(id).orElseThrow(() -> new RuntimeException("Task not found"));
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

        return enrichWithUserDetails(Collections.singletonList(response)).get(0);
    }

    public List<TaskResponse> getTasksByAssigneeId(UUID assigneeId) {
        List<TaskResponse> responses = taskRepository.findByAssignee(assigneeId).stream()
                .map(taskMapper::toResponse)
                .collect(Collectors.toList());

        return enrichWithUserDetails(responses);
    }

    private void enrichTaskCounts(List<TaskResponse> responses) {
        if (responses == null || responses.isEmpty()) return;

        List<UUID> taskIds = responses.stream()
                .map(TaskResponse::getId)
                .filter(Objects::nonNull)
                .toList();

        if (taskIds.isEmpty()) return;

        Map<UUID, Integer> commentCountMap = new HashMap<>();
        try {
            List<Object[]> commentCounts = commentRepository.countCommentsByTaskIds(taskIds);
            for (Object[] row : commentCounts) {
                UUID tId = (UUID) row[0];
                Long cnt = (Long) row[1];
                commentCountMap.put(tId, cnt != null ? cnt.intValue() : 0);
            }
        } catch (Exception e) {
            log.warn("Lỗi khi đếm comments: {}", e.getMessage());
        }

        Map<UUID, Integer> attachmentCountMap = new HashMap<>();
        try {
            List<Object[]> attachmentCounts = attachmentRepository.countAttachmentsByTaskIds(taskIds);
            for (Object[] row : attachmentCounts) {
                UUID tId = (UUID) row[0];
                Long cnt = (Long) row[1];
                attachmentCountMap.put(tId, cnt != null ? cnt.intValue() : 0);
            }
        } catch (Exception e) {
            log.warn("Lỗi khi đếm attachments: {}", e.getMessage());
        }

        for (TaskResponse res : responses) {
            res.setCommentCount(commentCountMap.getOrDefault(res.getId(), 0));
            res.setAttachmentCount(attachmentCountMap.getOrDefault(res.getId(), 0));
        }
    }

    private List<TaskResponse> enrichWithUserDetails(List<TaskResponse> responses) {
        if (responses == null || responses.isEmpty()) return responses;

        Set<UUID> userIds = new HashSet<>();
        for (TaskResponse res : responses) {
            if (res.getAssigneeId() != null) userIds.add(res.getAssigneeId());
            if (res.getReporterId() != null) userIds.add(res.getReporterId());
        }

        if (userIds.isEmpty()) return responses;

        Map<UUID, UserDto> userMap = new HashMap<>();
        try {
            List<UserDto> users = userClient.getUsersByIds(new ArrayList<>(userIds));
            userMap = users.stream().collect(Collectors.toMap(UserDto::getUserId, u -> u));
        } catch (Exception e) {
            log.warn("Lỗi khi lấy thông tin hàng loạt từ User Service: {}", e.getMessage());
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

    private void validateCrossService(UUID projectId, UUID reporterId, UUID assigneeId) {
        if (projectId != null && !projectClient.existsById(projectId)) throw new RuntimeException("Project not found");
        if (reporterId != null && !userClient.existsById(reporterId)) throw new RuntimeException("Reporter not found");
        if (assigneeId != null && !userClient.existsById(assigneeId)) throw new RuntimeException("Assignee not found");
    }
}