package Task_Manager.user_service.dto;

import lombok.Data;

@Data
public class UpdateUserStatusRequest {
    private Boolean isActive;
}
