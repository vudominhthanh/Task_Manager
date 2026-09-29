package Task_Manager.project_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectRoleResponse {
    private UUID id;
    private String name;
    private boolean isCustom;
    private Set<String> permissions;
}