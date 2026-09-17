package Task_Manager.user_service.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AuthResponse {
    private String token;
    private String refreshToken;
    private String email;
    private String userName;
    private String fullName;
    private String phoneNumber;
    private String role;
}
