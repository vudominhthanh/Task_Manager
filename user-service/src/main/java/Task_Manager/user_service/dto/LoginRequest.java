package Task_Manager.user_service.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String emailOrUsername;
    private String password;
}
