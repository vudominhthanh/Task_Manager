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
public class ProjectEventDto {
    private String eventType;
    private UUID projectId;
    private ProjectResponse project;
    private UUID actorId;
    private String username;
    private String userAvatar;
    private String projectName;
    private String targetName;
}