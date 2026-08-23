package Task_Manager.task_service.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class AttachmentRequest {
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String s3Key;
}
