package Task_Manager.project_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberEventDto {
    private String eventType;
    private UUID projectId;
    private String projectName;
    private UUID actorId;
    private String actorName;
    private UUID targetUserId;
    private String targetName;
    private String role;
}