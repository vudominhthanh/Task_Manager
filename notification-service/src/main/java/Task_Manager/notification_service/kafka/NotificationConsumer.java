package Task_Manager.notification_service.kafka;

import Task_Manager.notification_service.entity.Notification;
import Task_Manager.notification_service.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class NotificationConsumer {
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate simpMessagingTemplate;

    @KafkaListener(topics = "task_events", groupId = "notification_group")
    public void handleTaskEvents(JsonNode message) {
        String type = message.has("type") ? message.get("type").asText() : "";
        JsonNode payload = message.get("payload");

        if (("CREATED".equals(type) || "UPDATED".equals(type)) && payload != null) {
            if (payload.has("assigneeId") && payload.get("assigneeId").isNull()) {
                UUID assigneeId = UUID.fromString(payload.get("assigneeId").asText());
                UUID reporterId = payload.has("reporterId") ? UUID.fromString(payload.get("reporterId").asText()) : null;

                String taskTitle = payload.has("title") ? payload.get("title").asText() : "một công việc";

                if (!assigneeId.equals(reporterId)) {
                    sendNotification(assigneeId, reporterId, "Bạn vừa được giao/cập nhật task: " + taskTitle);
                }
            }
        }
    }

    private void sendNotification(UUID recipientId, UUID actorId, String content) {
        Notification notification = Notification.builder()
                .recipientId(recipientId)
                .actorId(actorId)
                .message(content)
                .isRead(false)
                .build();

        Notification saved  = notificationRepository.save(notification);

        simpMessagingTemplate.convertAndSend("/user-queue/" + recipientId + "/notifications", saved);
    }
}
