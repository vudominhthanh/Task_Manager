package Task_Manager.task_service.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class CommentResponse {
    private UUID id;
    private UUID taskId;
    private UUID projectId;
    private UUID userId;
    private String content;
    private UUID parentCommentId;
    private List<CommentResponse> replies;

    private String userName;
    private String userAvatar;

    private LocalDateTime createdAt;
    private LocalDateTime updateDate;
}
