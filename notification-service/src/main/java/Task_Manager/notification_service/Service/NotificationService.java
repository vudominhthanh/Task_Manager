package Task_Manager.notification_service.Service;

import Task_Manager.notification_service.dto.NotificationResponse;
import java.util.List;
import java.util.UUID;

public interface NotificationService {
    List<NotificationResponse> getUserNotifications(UUID userId);

    NotificationResponse createNotification(UUID recipientId, UUID actorId, String type, String target, String project, String message);

    void markAsRead(UUID notificationId, UUID userId);

    void markAllAsRead(UUID userId);

    long countUnreadNotifications(UUID userId);

    void createGlobalNotification(UUID adminId, String message, List<UUID> userIds);
}