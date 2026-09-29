package Task_Manager.task_service.service.impl;

import Task_Manager.common_lib.constant.ProjectPermissions;
import Task_Manager.common_lib.exception.ForbiddenAccessException;
import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.utils.Translator;
import Task_Manager.task_service.client.ProjectClient;
import Task_Manager.task_service.client.UserClient;
import Task_Manager.task_service.dto.AttachmentEventDto;
import Task_Manager.task_service.dto.AttachmentResponse;
import Task_Manager.task_service.dto.UserDto;
import Task_Manager.task_service.entity.Attachment;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.kafka.AttachmentEventPublisher;
import Task_Manager.task_service.mapper.AttachmentMapper;
import Task_Manager.task_service.repository.AttachmentRepository;
import Task_Manager.task_service.repository.TaskRepository;
import Task_Manager.task_service.security.TaskSecurity;
import Task_Manager.task_service.service.AttachmentService;
import Task_Manager.task_service.service.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AttachmentServiceImpl implements AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final TaskRepository taskRepository;
    private final AttachmentMapper attachmentMapper;
    private final AttachmentEventPublisher attachmentEventPublisher;
    private final TaskSecurity taskSecurity;
    private final UserClient userClient;
    private final StorageService storageService;

    @Override
    @Transactional
    public AttachmentResponse uploadAttachment(UUID taskId, UUID userId, MultipartFile file) throws IOException {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.task.not_found", taskId)));

        validateTaskAttachmentAccess(task, userId);

        String s3Key = storageService.uploadFile(file, task.getProject(), taskId);

        String rawFileName = (file.getOriginalFilename() != null && !file.getOriginalFilename().isBlank())
                ? file.getOriginalFilename()
                : "attachment";

        Attachment attachment = Attachment.builder()
                .task(task)
                .userId(userId)
                .fileName(rawFileName)
                .fileType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .fileSize(file.getSize())
                .s3Key(s3Key)
                .visibilityType("PROJECT")
                .build();

        Attachment savedAttachment = attachmentRepository.save(attachment);

        AttachmentResponse enriched = enrichSingleAttachment(attachmentMapper.toResponse(savedAttachment));

        UUID recipientId = resolveRecipient(task, userId);
        AttachmentEventDto event = attachmentMapper.toAttachmentCreatedEvent(task, enriched, userId, recipientId);
        attachmentEventPublisher.publishAttachmentCreated(savedAttachment.getId(), event);

        return enriched;
    }

    @Override
    @Transactional
    public void deleteAttachment(UUID attachmentId, UUID userId) {
        Attachment attachment = attachmentRepository.findByIdWithTask(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.attachment.not_found", attachmentId)));

        Task task = attachment.getTask();

        boolean isOwner = attachment.getUserId().equals(userId);
        if (!isOwner) {
            boolean canDeleteAny = taskSecurity.hasTaskPermission(task.getId(), ProjectPermissions.ATTACHMENT_DELETE_ANY);
            if (!canDeleteAny) {
                throw new ForbiddenAccessException("Bạn không có quyền xóa tệp đính kèm này!");
            }
        }

        storageService.deleteFile(attachment.getS3Key());
        attachmentRepository.deleteById(attachmentId);

        UUID recipientId = resolveRecipient(task, userId);
        AttachmentEventDto event = attachmentMapper.toAttachmentDeletedEvent(task, attachment, userId, recipientId);
        attachmentEventPublisher.publishAttachmentDeleted(attachmentId, event);
    }

    @Override
    public List<AttachmentResponse> getAttachmentsByTaskId(UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công việc"));

        Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !authentication.getName().equals("anonymousUser")) {
            UUID userId = UUID.fromString(authentication.getName());
            validateTaskAttachmentAccess(task, userId);
        }

        List<AttachmentResponse> responses = attachmentRepository.findByTaskId(taskId).stream()
                .map(attachmentMapper::toResponse)
                .collect(Collectors.toList());

        return enrichWithUserDetails(responses);
    }

    @Override
    public AttachmentResponse getAttachmentById(UUID attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.attachment.not_found", attachmentId)));

        return enrichSingleAttachment(attachmentMapper.toResponse(attachment));
    }

    @Override
    public byte[] getAttachmentBytes(UUID attachmentId) throws IOException {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.attachment.not_found", attachmentId)));

        return storageService.downloadFile(attachment.getS3Key());
    }

    @Override
    public byte[] getAttachmentBytes(UUID attachmentId, UUID userId) throws IOException {
        Attachment attachment = attachmentRepository.findByIdWithTask(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.attachment.not_found", attachmentId)));

        return storageService.downloadFile(attachment.getS3Key());
    }

    private AttachmentResponse enrichSingleAttachment(AttachmentResponse response) {
        return enrichWithUserDetails(Collections.singletonList(response)).get(0);
    }

    private List<AttachmentResponse> enrichWithUserDetails(List<AttachmentResponse> responses) {
        if (responses == null || responses.isEmpty()) return responses;

        Set<UUID> userIds = responses.stream()
                .map(AttachmentResponse::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, UserDto> userMap = new HashMap<>();
        if (!userIds.isEmpty()) {
            try {
                List<UserDto> users = userClient.getUsersByIds(new ArrayList<>(userIds));
                userMap = users.stream().collect(Collectors.toMap(UserDto::getUserId, u -> u));
            } catch (Exception e) {
                log.warn("Lỗi khi lấy thông tin user cho attachments: {}", e.getMessage());
            }
        }

        for (AttachmentResponse res : responses) {
            res.setFileUrl(String.format("/api/tasks/%s/attachments/%s/view", res.getTaskId(), res.getId()));

            if (res.getUserId() != null && userMap.containsKey(res.getUserId())) {
                UserDto user = userMap.get(res.getUserId());
                res.setUserName(user.getFullName() != null ? user.getFullName() : user.getUsername());
                res.setUserAvatar(user.getAvatarUrl() != null ? user.getAvatarUrl()
                        : (user.getUsername() != null && !user.getUsername().isEmpty() ? user.getUsername().substring(0, 1).toUpperCase() : "U"));
            }
        }
        return responses;
    }

    private UUID resolveRecipient(Task task, UUID userId) {
        if (task == null) return null;
        if (task.getAssignee() != null && !task.getAssignee().equals(userId)) return task.getAssignee();
        return (task.getReporter() != null && !task.getReporter().equals(userId)) ? task.getReporter() : null;
    }

    private void validateTaskAttachmentAccess(Task task, UUID userId) {
        boolean isDirect = (task.getAssignee() != null && task.getAssignee().equals(userId)) ||
                (task.getReporter() != null && task.getReporter().equals(userId));
        if (isDirect) return;

        if (task.getParentTask() != null) {
            Task parent = task.getParentTask();
            boolean isParentInvolved = (parent.getAssignee() != null && parent.getAssignee().equals(userId)) ||
                    (parent.getReporter() != null && parent.getReporter().equals(userId));
            if (isParentInvolved) return;
        } else {
            List<Task> subTasks = taskRepository.findByParentTaskId(task.getId());
            boolean isSubtaskAssignee = subTasks.stream()
                    .anyMatch(st -> st.getAssignee() != null && st.getAssignee().equals(userId));
            if (isSubtaskAssignee) return;
        }

        throw new ForbiddenAccessException("Bạn không có quyền tham gia vào không gian của công việc này!");
    }
}