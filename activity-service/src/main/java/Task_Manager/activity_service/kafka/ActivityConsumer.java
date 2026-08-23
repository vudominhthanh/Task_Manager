package Task_Manager.activity_service.kafka;

import Task_Manager.activity_service.entity.Activity;
import Task_Manager.activity_service.repository.ActivityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

@Component
@RequiredArgsConstructor
@Slf4j
public class ActivityConsumer {
    private final ActivityRepository activityRepository;

    @KafkaListener(topics = {"projects_events", "task_events", "auth_events", "comment_events", "attachment_events"},groupId = "activity-group")
    public void consumerEvents(JsonNode message, @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        String type = message.has("type") ? message.get("type").asText() : "UNKNOWN";
        JsonNode payload = message.get("payload");

        String targetType = switch (topic) {
            case "project_event" -> "PROJECT";
            case "task-events" -> "TASK";
            case "auth_event" -> "USER";
            default -> "SYSTEM";
        };

        String targetId = (payload != null && payload.has("id") ? payload.get("id").asText() : "UNKNOWN");

        Activity activity = Activity.builder()
                .targetType(targetType)
                .targetId(targetId)
                .actionType(type)
                .payloadDetails(payload != null ? payload.toString() : "{}")
                .build();

        activityRepository.save(activity);
        log.info("Activity {} has been published", targetType);
    }

}
