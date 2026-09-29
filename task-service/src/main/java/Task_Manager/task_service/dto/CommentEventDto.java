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
public class CommentEventDto {
    private String eventType;
    private UUID commentId;
    private UUID projectId;
    private UUID taskId;
    private UUID createdBy;
    private UUID updatedBy;
    private UUID deletedBy;
    private UUID recipientId;
    private String username;
    private String userAvatar;
    private String targetName;
    private CommentResponse comment;
}