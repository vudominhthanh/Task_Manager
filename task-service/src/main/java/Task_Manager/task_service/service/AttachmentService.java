package Task_Manager.task_service.service;

import Task_Manager.task_service.dto.AttachmentRequest;
import Task_Manager.task_service.dto.AttachmentResponse;
import Task_Manager.task_service.entity.Attachment;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.kafka.AttachmentEventPublisher;
import Task_Manager.task_service.mapper.AttachmentMapper;
import Task_Manager.task_service.repository.AttachmentRepository;
import Task_Manager.task_service.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collector;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttachmentService {
    private final AttachmentRepository attachmentRepository;
    private final TaskRepository taskRepository;
    private final AttachmentMapper attachmentMapper;
    private final AttachmentEventPublisher attachmentEventPublisher;

    @Transactional
    public AttachmentResponse addAttachment(UUID taskId, UUID userId, AttachmentRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        Attachment attachment = attachmentMapper.toEntity(request, task, userId);
        Attachment savedAttachment = attachmentRepository.save(attachment);
        AttachmentResponse response = attachmentMapper.toResponse(savedAttachment);

        attachmentEventPublisher.publishAttachmentCreated(response);
        return response;
    }

    @Transactional
    public void deleteAttachment(UUID attachmentId, UUID userId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new RuntimeException("Attachment not found"));

        if (!attachment.getUserId().equals(userId)) {
            throw new RuntimeException("You don't have permission to delete this attachment");
        }

        attachmentRepository.deleteById(attachmentId);
        attachmentEventPublisher.publishAttachmentDeleted(attachmentId);
    }

    public List<AttachmentResponse> getAttachmentsByTaskId(UUID taskId) {
        return attachmentRepository.findByTaskId(taskId).stream()
                .map(attachmentMapper::toResponse)
                .collect(Collectors.toList());
    }

    public AttachmentResponse getAttachmentById(UUID attachmentId) {
        Attachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new RuntimeException("Attachment not found"));
        return attachmentMapper.toResponse(attachment);
    }
}
