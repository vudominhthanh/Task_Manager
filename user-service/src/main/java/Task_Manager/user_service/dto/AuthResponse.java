package Task_Manager.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String refreshToken;
    private String sessionId;
    private String email;
    private String userName;
    private String fullName;
    private String phoneNumber;
    private String role;
    private List<String> permissions;
}
