package Task_Manager.notification_service.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class NotificationResponse {
    private UUID id;
    private String title;
    private String time;
    private String target;
    private String project;
    private String type;
    private boolean read;
    private String avatar;
}