package Task_Manager.task_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentEventDto {
    private String eventType;
    private UUID attachmentId;
    private UUID projectId;
    private UUID taskId;
    private String taskTitle;
    private UUID createdBy;
    private UUID deletedBy;
    private UUID recipientId;
    private String username;
    private String userAvatar;
    private String targetName;
    private AttachmentResponse attachment;
}