package Task_Manager.activity_service.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class UserDto {
    private UUID id;
    private String username;
    private String avatarUrl;
}
