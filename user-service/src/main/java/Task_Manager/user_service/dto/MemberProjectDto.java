package Task_Manager.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MemberProjectDto {
    private UUID userId;
    private String username;
    private String fullName;
    private String email;
}
