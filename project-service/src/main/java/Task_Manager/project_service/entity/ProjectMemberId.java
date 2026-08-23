package Task_Manager.project_service.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMemberId implements Serializable {
    private UUID projectId;
    private UUID userId;
}