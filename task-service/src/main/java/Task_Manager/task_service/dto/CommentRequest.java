package Task_Manager.task_service.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class CommentRequest {
    private String content;
    private UUID parentCommentId;
}
