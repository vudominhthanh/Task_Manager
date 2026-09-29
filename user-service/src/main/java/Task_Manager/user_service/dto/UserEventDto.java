package Task_Manager.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserEventDto {
    private UUID userId;
    private String username;
    private String fullname;
    private String email;
    private String phoneNumber;
    private String role;
    private Boolean isActive;
    private String userAvatar;
    private String targetName;
    private String avatarColor;
    private String updatedAt;
}