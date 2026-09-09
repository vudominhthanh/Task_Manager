package Task_Manager.activity_service.kafka;

import Task_Manager.activity_service.dto.ActivityEvent;
import Task_Manager.activity_service.service.ActivityService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ActivityConsumer {
    private final ActivityService activityService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = {"project_events", "task_events", "auth_events", "comment_events", "attachment_events"}, groupId = "activities")
    public void consumerEvents(String messagePayload, @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        try {
            JsonNode message = objectMapper.readTree(messagePayload);

            String type = message.has("type") ? message.get("type").asText() : "UNKNOWN";
            JsonNode payload = message.get("payload");

            String targetType = switch (topic) {
                case "project_events" -> "PROJECT";
                case "task_events" -> "TASK";
                case "auth_events" -> "USER";
                case "comment_events" -> "COMMENT";
                case "attachment_events" -> "ATTACHMENT";
                default -> "SYSTEM";
            };

            String targetId = "UNKNOWN";
            if (payload != null) {
                if (payload.has("project") && payload.get("project").has("id")) {
                    targetId = payload.get("project").get("id").asText();
                } else if (payload.has("task") && payload.get("task").has("id")) {
                    targetId = payload.get("task").get("id").asText();
                } else if (payload.has("comment") && payload.get("comment").has("id")) {
                    targetId = payload.get("comment").get("id").asText();
                } else if (payload.has("attachment") && payload.get("attachment").has("id")) {
                    targetId = payload.get("attachment").get("id").asText();
                } else if (payload.has("id")) {
                    targetId = payload.get("id").asText();
                } else if (payload.has("projectId")) {
                    targetId = payload.get("projectId").asText();
                } else if (payload.has("taskId")) {
                    targetId = payload.get("taskId").asText();
                }
            }

            String username = (payload != null && payload.has("username")) ? payload.get("username").asText() : "Hệ thống";
            String userAvatar = (payload != null && payload.has("userAvatar")) ? payload.get("userAvatar").asText() : "S";
            String avatarColor = (payload != null && payload.has("avatarColor")) ? payload.get("avatarColor").asText() : "bg-gray-700";

            String projectId = null;
            if (payload != null) {
                if (payload.has("projectId")) {
                    projectId = payload.get("projectId").asText();
                } else if (payload.has("project") && payload.get("project").has("projectId")) {
                    projectId = payload.get("project").get("projectId").asText();
                } else if (payload.has("task") && payload.get("task").has("projectId")) {
                    projectId = payload.get("task").get("projectId").asText();
                } else if (topic.equals("project_events") && payload.has("project") && payload.get("project").has("id")) {
                    projectId = payload.get("project").get("id").asText();
                }
            }

            String projectName = (payload != null && payload.has("projectName")) ? payload.get("projectName").asText() : projectId;
            String targetName = (payload != null && payload.has("targetName")) ? payload.get("targetName").asText() : targetId;

            Map<String, Object> payloadMap = null;
            if (payload != null) {
                payloadMap = objectMapper.convertValue(payload, new TypeReference<Map<String, Object>>() {});
            }

            ActivityEvent event = ActivityEvent.builder()
                    .targetType(targetType)
                    .targetId(targetId)
                    .actionType(type)
                    .payloadDetails(payloadMap)
                    .username(username)
                    .userAvatar(userAvatar)
                    .avatarColor(avatarColor)
                    .projectId(projectId)
                    .projectName(projectName)
                    .targetName(targetName)
                    .build();

            activityService.createActivityLog(event);
            log.info("Activity {} has been published for type {}", targetType, type);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý message Kafka từ topic {}: {}", topic, messagePayload, e);
        }
    }
}