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
            JsonNode payload = message.path("payload");

            String targetType = switch (topic) {
                case "project_events" -> "PROJECT";
                case "task_events" -> "TASK";
                case "auth_events" -> "USER";
                case "comment_events" -> "COMMENT";
                case "attachment_events" -> "ATTACHMENT";
                default -> "SYSTEM";
            };

            String type = getFirstText(message, "type", "actionType");
            if ("UNKNOWN".equals(type) && !payload.isMissingNode()) {
                type = getFirstText(payload, "type", "actionType");
            }
            if ("UNKNOWN".equals(type)) {
                type = switch (topic) {
                    case "project_events" -> "PROJECT_UPDATED";
                    case "task_events" -> "TASK_UPDATED";
                    case "comment_events" -> "COMMENT_CREATED";
                    case "attachment_events" -> "ATTACHMENT_CREATED";
                    default -> "SYSTEM_ACTION";
                };
            }

            // Ưu tiên targetId gắn với taskId để tab Activity trong task lọc được
            String targetId = getFirstText(payload, "taskId", "id", "projectId");
            if ("UNKNOWN".equals(targetId)) {
                targetId = getFirstText(payload.path("attachment"), "taskId", "id");
                if ("UNKNOWN".equals(targetId)) targetId = getFirstText(payload.path("task"), "id");
                if ("UNKNOWN".equals(targetId)) targetId = getFirstText(payload.path("comment"), "id");
            }

            String username = getFirstText(payload, "username");
            if ("UNKNOWN".equals(username)) username = "Hệ thống";

            String userAvatar = getFirstText(payload, "userAvatar");
            if ("UNKNOWN".equals(userAvatar)) userAvatar = "S";

            String avatarColor = getFirstText(payload, "avatarColor");
            if ("UNKNOWN".equals(avatarColor)) avatarColor = "bg-gray-700";

            String projectId = getFirstText(payload, "projectId");
            if ("UNKNOWN".equals(projectId)) {
                projectId = getFirstText(payload.path("attachment"), "projectId");
                if ("UNKNOWN".equals(projectId)) projectId = getFirstText(payload.path("task"), "projectId");
                if ("UNKNOWN".equals(projectId)) projectId = getFirstText(payload.path("project"), "id");
            }

            String projectName = getFirstText(payload, "projectName");
            if ("UNKNOWN".equals(projectName)) projectName = "Dự án";

            String targetName = getFirstText(payload, "targetName");
            if ("UNKNOWN".equals(targetName) && "ATTACHMENT".equals(targetType)) {
                targetName = getFirstText(payload.path("attachment"), "fileName");
            }
            if ("UNKNOWN".equals(targetName)) {
                targetName = getFirstText(payload.path("task"), "title");
            }
            if ("UNKNOWN".equals(targetName)) targetName = "Tài liệu";

            Map<String, Object> payloadMap = payload.isMissingNode() ? null :
                    objectMapper.convertValue(payload, new TypeReference<Map<String, Object>>() {});

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
            log.info("Activity ghi nhận thành công cho [{}]: {} trên [{}]", targetType, type, targetName);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý message Kafka từ topic {}: {}", topic, messagePayload, e);
        }
    }

    private String getFirstText(JsonNode node, String... keys) {
        if (node == null || node.isMissingNode()) return "UNKNOWN";
        for (String key : keys) {
            JsonNode val = node.get(key);
            if (val != null && !val.isNull() && !val.asText().equals("null") && !val.asText().trim().isEmpty()) {
                return val.asText();
            }
        }
        return "UNKNOWN";
    }
}