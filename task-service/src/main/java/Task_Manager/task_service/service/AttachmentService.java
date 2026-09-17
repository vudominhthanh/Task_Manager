package Task_Manager.task_service.service;

import Task_Manager.task_service.dto.AttachmentResponse;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

public interface AttachmentService {
    AttachmentResponse uploadAttachment(UUID taskId, UUID userId, MultipartFile file, boolean isSystemAdmin) throws IOException;

    void deleteAttachment(UUID attachmentId, UUID userId, boolean isSystemAdmin);

    List<AttachmentResponse> getAttachmentsByTaskId(UUID taskId);

    AttachmentResponse getAttachmentById(UUID attachmentId);

    byte[] getAttachmentBytes(UUID attachmentId) throws IOException;
}