package Task_Manager.task_service.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AttachmentResponse {
    private UUID id;
    private UUID taskId;
    private UUID userId;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String s3Key;
    private String projectId;
    private String fileUrl;
    private LocalDateTime createdAt;

    private String userName;
    private String userAvatar;
}
