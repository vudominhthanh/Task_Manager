package Task_Manager.websocket_service.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketConsumer {
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    private String extractProjectId(JsonNode payload) {
        if (payload.hasNonNull("projectId")) return payload.path("projectId").asText();
        if (payload.has("task") && payload.path("task").hasNonNull("projectId"))
            return payload.path("task").path("projectId").asText();
        if (payload.has("project") && payload.path("project").hasNonNull("id"))
            return payload.path("project").path("id").asText();
        return null;
    }

    @KafkaListener(topics = "task_events", groupId = "websocket-project-group")
    public void handleTaskEvents(String messagePayload) {
        try {
            JsonNode message = objectMapper.readTree(messagePayload);
            JsonNode payload = message.path("payload");

            String projectId = extractProjectId(payload);
            if (projectId != null) {
                messagingTemplate.convertAndSend("/topic/project/" + projectId, messagePayload);
            }

            JsonNode taskNode = payload.has("task") ? payload.path("task") : payload;
            if (!taskNode.isMissingNode() && taskNode.hasNonNull("assigneeId")) {
                String assigneeId = taskNode.path("assigneeId").asText();
                messagingTemplate.convertAndSendToUser(assigneeId, "/queue/notifications", messagePayload);
            }
        } catch (Exception e) {
            log.error("Lỗi đẩy WebSocket task event: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = {"project_events", "comment_events", "attachment_events"}, groupId = "websocket-activity-group")
    public void handleActivityEvents(String messagePayload) {
        try {
            JsonNode message = objectMapper.readTree(   messagePayload);
            JsonNode payload = message.path("payload");

            String projectId = extractProjectId(payload);
            if (projectId != null) {
                messagingTemplate.convertAndSend("/topic/project/" + projectId, messagePayload);
            }
        } catch (Exception e) {
            log.error("Lỗi đẩy WebSocket activity event: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "auth_events", groupId = "websocket-auth-group")
    public void handleAuthEvents(String messagePayload) {
        try {
            JsonNode message = objectMapper.readTree(messagePayload);
            if ("USER_REGISTERED".equals(message.path("type").asText(""))) {
                log.info("User mới: {}", message.path("payload").path("username").asText());
            }
        } catch (Exception e) {}
    }
}