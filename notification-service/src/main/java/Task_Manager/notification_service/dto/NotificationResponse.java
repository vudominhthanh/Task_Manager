package Task_Manager.notification_service.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class NotificationResponse {
    private UUID id;
    private String message;
    private boolean isRead;
    private LocalDateTime createdAt;
    private UserDto actor;
}
