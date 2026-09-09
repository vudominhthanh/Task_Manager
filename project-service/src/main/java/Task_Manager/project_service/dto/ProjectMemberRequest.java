package Task_Manager.project_service.dto;

import Task_Manager.project_service.entity.ProjectRole;
import lombok.Data;
import java.util.UUID;

@Data
public class ProjectMemberRequest {
    private String email;
    private ProjectRole projectRole;
}
