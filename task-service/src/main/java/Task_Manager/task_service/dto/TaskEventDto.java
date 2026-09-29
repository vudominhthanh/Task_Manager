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
public class TaskEventDto {
    private String eventType;
    private UUID taskId;
    private String projectId;
    private String projectName;
    private String targetName;
    private UUID createdBy;
    private String username;
    private String userAvatar;
    private String status;
    private String oldStatus;
    private TaskResponse task;
}