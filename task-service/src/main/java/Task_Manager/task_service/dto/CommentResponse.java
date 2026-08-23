package Task_Manager.task_service.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class CommentResponse {
    private UUID id;
    private UUID taskId;
    private UUID userId;
    private String content;
    private UUID parentCommentId;
}
