package Task_Manager.user_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Fullname can't be null")
    private String fullname;

    @NotBlank(message = "Username can't be null")
    private String username;

    @Email(message = "Email is not correct form !")
    private String email;

    @NotBlank(message = "Phone Number can't be null")
    private String phoneNumber;

    @NotBlank(message = "Password can't be null")
    private String password;
}
