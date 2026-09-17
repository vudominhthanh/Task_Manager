package Task_Manager.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerifyOtpRequest {
    private String username;
    private String email;
    private String password;
    private String fullname;
    private String phoneNumber;
    private String otp;
}