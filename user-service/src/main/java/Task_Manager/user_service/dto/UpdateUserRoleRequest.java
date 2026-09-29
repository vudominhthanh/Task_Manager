package Task_Manager.user_service.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;
@Data
public class UpdateUserRoleRequest {
    private List<UUID> roleIds;
}