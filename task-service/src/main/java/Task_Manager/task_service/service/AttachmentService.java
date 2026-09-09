package Task_Manager.task_service.service;

import Task_Manager.task_service.client.ProjectClient;
import Task_Manager.task_service.client.UserClient;
import Task_Manager.task_service.dto.AttachmentRequest;
import Task_Manager.task_service.dto.AttachmentResponse;
import Task_Manager.task_service.dto.UserDto;
import Task_Manager.task_service.entity.Attachment;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.kafka.AttachmentEventPublisher;
import Task_Manager.task_service.mapper.AttachmentMapper;
import Task_Manager.task_service.repository.AttachmentRepository;
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
public class AttachmentService {
    private final AttachmentRepository attachmentRepository;
    private final TaskRepository taskRepository;
    private final AttachmentMapper attachmentMapper;
    private final AttachmentEventPublisher attachmentEventPublisher;
    private final ProjectClient projectClient;
    private final UserClient userClient;

    public AttachmentResponse addAttachment(UUID taskId, UUID userId, AttachmentRequest request, boolean isSystemAdmin) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        UUID projectId = task.getProject() != null ? task.getProject() : null;
        boolean isProjectAdmin = projectId != null && projectClient.isProjectAdmin(projectId, userId);
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().equals(userId);

        if (!isSystemAdmin && !isProjectAdmin && !isAssignee) {
            throw new RuntimeException("Access Denied: Bạn không có quyền tải tệp lên công việc này.");
        }
        Attachment attachment = attachmentMapper.toEntity(request, task, userId);
        Attachment savedAttachment = attachmentRepository.save(attachment);
        AttachmentResponse response = attachmentMapper.toResponse(savedAttachment);
        AttachmentResponse enriched = enrichWithUserDetails(Collections.singletonList(response)).get(0);

        attachmentEventPublisher.publishAttachmentCreated(savedAttachment.getId(), Map.of(
                "attachment", enriched,
                "createdBy", userId,
                "username", enriched.getUserName() != null ? enriched.getUserName() : "Thành viên",
                "userAvatar", enriched.getUserAvatar() != null ? enriched.getUserAvatar() : "U",
                "targetName", enriched.getFileName() != null ? enriched.getFileName() : "Tệp đính kèm"
        ));
        return enriched;
    }

    public void deleteAttachment(UUID attachmentId, UUID userId, boolean isSystemAdmin) {
        Attachment attachment = attachmentRepository.findByIdWithTask(attachmentId)
                .orElseThrow(() -> new RuntimeException("Attachment not found"));

        Task task = attachment.getTask();
        UUID projectId = task != null && task.getProject() != null ? task.getProject() : null;
        boolean isProjectAdmin = projectId != null && projectClient.isProjectAdmin(projectId, userId);

        boolean isOwner = attachment.getUserId().equals(userId);
        boolean isAssignee = task != null && task.getAssignee() != null && task.getAssignee().equals(userId);

        if (!isSystemAdmin && !isProjectAdmin && !isOwner && !isAssignee) {
            throw new RuntimeException("Access Denied: Bạn không có quyền xóa tệp đính kèm này.");
        }

        attachmentRepository.deleteById(attachmentId);
        attachmentEventPublisher.publishAttachmentDeleted(attachmentId, Map.of(
                "attachmentId", attachmentId,
                "deletedBy", userId,
                "targetName", attachment.getFileName() != null ? attachment.getFileName() : "Tệp đính kèm"
        ));
    }

    public List<AttachmentResponse> getAttachmentsByTaskId(UUID taskId) {
        List<AttachmentResponse> responses = attachmentRepository.findByTaskId(taskId).stream()
                .map(attachmentMapper::toResponse)
                .collect(Collectors.toList());
        return enrichWithUserDetails(responses);
    }

    public AttachmentResponse getAttachmentById(UUID attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new RuntimeException("Attachment not found"));
        AttachmentResponse response = attachmentMapper.toResponse(attachment);
        return enrichWithUserDetails(Collections.singletonList(response)).get(0);
    }

    private List<AttachmentResponse> enrichWithUserDetails(List<AttachmentResponse> responses) {
        if (responses == null || responses.isEmpty()) return responses;

        Set<UUID> userIds = responses.stream()
                .map(AttachmentResponse::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (userIds.isEmpty()) return responses;

        Map<UUID, UserDto> userMap = new HashMap<>();
        try {
            List<UserDto> users = userClient.getUsersByIds(new ArrayList<>(userIds));
            userMap = users.stream().collect(Collectors.toMap(UserDto::getUserId, u -> u));
        } catch (Exception e) {
            log.warn("Lỗi khi lấy thông tin user cho attachments: {}", e.getMessage());
        }

        for (AttachmentResponse res : responses) {
            if (res.getUserId() != null && userMap.containsKey(res.getUserId())) {
                UserDto user = userMap.get(res.getUserId());
                res.setUserName(user.getFullName() != null ? user.getFullName() : user.getUsername());
                res.setUserAvatar(user.getAvatarUrl() != null ? user.getAvatarUrl() : user.getUsername().substring(0, 1).toUpperCase());
            }
        }
        return responses;
    }
}