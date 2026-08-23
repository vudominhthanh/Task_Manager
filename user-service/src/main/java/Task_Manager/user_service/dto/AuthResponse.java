package Task_Manager.user_service.dto;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class AuthResponse {
    private String token;
    private UUID userId;
    private String userName;
    private String role;
}
