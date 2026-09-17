package Task_Manager.task_service.service.impl;

import Task_Manager.task_service.client.ProjectClient;
import Task_Manager.task_service.client.UserClient;
import Task_Manager.task_service.dto.AttachmentResponse;
import Task_Manager.task_service.dto.UserDto;
import Task_Manager.task_service.entity.Attachment;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.kafka.AttachmentEventPublisher;
import Task_Manager.task_service.mapper.AttachmentMapper;
import Task_Manager.task_service.repository.AttachmentRepository;
import Task_Manager.task_service.repository.TaskRepository;
import Task_Manager.task_service.service.AttachmentService;
import Task_Manager.task_service.service.StorageService;

import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.exception.ForbiddenAccessException;
import Task_Manager.common_lib.utils.Translator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final ProjectClient projectClient;
    private final UserClient userClient;
    private final StorageService storageService;

    @Override
    @Transactional
    public AttachmentResponse uploadAttachment(UUID taskId, UUID userId, MultipartFile file, boolean isSystemAdmin) throws IOException {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.task.not_found", taskId)));

        validateAddPermission(task, userId, isSystemAdmin);

        String s3Key = storageService.uploadFile(file, task.getProject(), taskId);

        String rawFileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "attachment";
        Attachment attachment = Attachment.builder()
                .task(task)
                .userId(userId)
                .fileName(rawFileName)
                .fileType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .fileSize(file.getSize())
                .s3Key(s3Key)
                .build();

        Attachment savedAttachment = attachmentRepository.save(attachment);

        AttachmentResponse enriched = enrichSingleAttachment(attachmentMapper.toResponse(savedAttachment));

        UUID recipientId = (task.getAssignee() != null && !task.getAssignee().equals(userId))
                ? task.getAssignee()
                : (task.getReporter() != null && !task.getReporter().equals(userId) ? task.getReporter() : null);

        Map<String, Object> eventPayload = new HashMap<>();
        eventPayload.put("attachment", enriched);
        eventPayload.put("attachmentId", savedAttachment.getId());
        eventPayload.put("createdBy", userId);
        eventPayload.put("username", resolveName(enriched.getUserName()));
        eventPayload.put("userAvatar", resolveAvatar(enriched.getUserAvatar()));
        eventPayload.put("targetName", resolveFileName(enriched.getFileName()));
        eventPayload.put("taskId", task.getId());
        eventPayload.put("taskTitle", task.getTitle() != null ? task.getTitle() : "Công việc");
        eventPayload.put("projectId", task.getProject());
        eventPayload.put("recipientId", recipientId);

        attachmentEventPublisher.publishAttachmentCreated(savedAttachment.getId(), eventPayload);

        return enriched;
    }

    @Override
    @Transactional
    public void deleteAttachment(UUID attachmentId, UUID userId, boolean isSystemAdmin) {
        Attachment attachment = attachmentRepository.findByIdWithTask(attachmentId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.attachment.not_found", attachmentId)));

        Task task = attachment.getTask();
        validateDeletePermission(task, attachment, userId, isSystemAdmin);

        storageService.deleteFile(attachment.getS3Key());
        attachmentRepository.deleteById(attachmentId);

        UUID recipientId = (task != null && task.getAssignee() != null && !task.getAssignee().equals(userId))
                ? task.getAssignee()
                : (task != null && task.getReporter() != null && !task.getReporter().equals(userId) ? task.getReporter() : null);

        Map<String, Object> eventPayload = new HashMap<>();
        eventPayload.put("attachmentId", attachmentId);
        eventPayload.put("deletedBy", userId);
        eventPayload.put("targetName", resolveFileName(attachment.getFileName()));
        if (task != null) {
            eventPayload.put("taskId", task.getId());
            eventPayload.put("taskTitle", task.getTitle() != null ? task.getTitle() : "Công việc");
            eventPayload.put("projectId", task.getProject());
        }
        eventPayload.put("recipientId", recipientId);

        attachmentEventPublisher.publishAttachmentDeleted(attachmentId, eventPayload);
    }

    @Override
    public List<AttachmentResponse> getAttachmentsByTaskId(UUID taskId) {
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

    private void validateAddPermission(Task task, UUID userId, boolean isSystemAdmin) {
        if (isSystemAdmin) return;
        UUID projectId = task.getProject();
        if (projectId != null && projectClient.isProjectAdmin(projectId, userId)) return;
        if (task.getAssignee() != null && task.getAssignee().equals(userId)) return;
        if (task.getReporter() != null && task.getReporter().equals(userId)) return;

        if (task.getParentTask() != null) {
            Task parent = task.getParentTask();
            if (parent.getAssignee() != null && parent.getAssignee().equals(userId)) return;
            if (parent.getReporter() != null && parent.getReporter().equals(userId)) return;
        }

        throw new ForbiddenAccessException(Translator.toLocale("error.attachment.access_denied_add"));
    }

    private void validateDeletePermission(Task task, Attachment attachment, UUID userId, boolean isSystemAdmin) {
        if (isSystemAdmin) return;

        UUID projectId = (task != null && task.getProject() != null) ? task.getProject() : null;
        if (projectId != null && projectClient.isProjectAdmin(projectId, userId)) return;

        if (attachment.getUserId().equals(userId)) return;

        if (task != null && task.getAssignee() != null && task.getAssignee().equals(userId)) return;
        if (task != null && task.getParentTask() != null) {
            Task parent = task.getParentTask();
            if (parent.getAssignee() != null && parent.getAssignee().equals(userId)) return;
        }

        throw new ForbiddenAccessException(Translator.toLocale("error.attachment.access_denied_delete"));
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

    private String resolveName(String name) {
        return (name != null && !name.trim().isEmpty()) ? name : "Thành viên";
    }

    private String resolveAvatar(String avatar) {
        return (avatar != null && !avatar.trim().isEmpty()) ? avatar : "U";
    }

    private String resolveFileName(String fileName) {
        return (fileName != null && !fileName.trim().isEmpty()) ? fileName : "Tệp đính kèm";
    }
}