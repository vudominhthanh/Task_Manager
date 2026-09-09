package Task_Manager.project_service.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class UserDto {
    private UUID id;
    private String username;
    private String fullName;
    private String email;
}