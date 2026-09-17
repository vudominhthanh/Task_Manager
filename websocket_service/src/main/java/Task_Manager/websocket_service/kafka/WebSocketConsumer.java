package Task_Manager.websocket_service.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketConsumer {

    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    private String extractProjectId(JsonNode message, JsonNode payload) {
        if (payload != null && !payload.isMissingNode()) {
            if (payload.hasNonNull("projectId")) return payload.path("projectId").asText();
            if (payload.has("project") && payload.path("project").hasNonNull("id")) {
                return payload.path("project").path("id").asText();
            }
            if (payload.has("project") && payload.path("project").hasNonNull("projectId")) {
                return payload.path("project").path("projectId").asText();
            }
            if (payload.has("task") && payload.path("task").hasNonNull("projectId")) {
                return payload.path("task").path("projectId").asText();
            }
            if (payload.hasNonNull("id") && payload.hasNonNull("name") && !payload.has("title")) {
                return payload.path("id").asText();
            }
        }
        if (message != null && !message.isMissingNode()) {
            String type = message.path("type").asText("");
            if (message.hasNonNull("targetId") && (type.startsWith("PROJECT") || type.startsWith("MEMBER"))) {
                return message.path("targetId").asText();
            }
        }
        return null;
    }

    private String extractTaskId(JsonNode message, JsonNode payload) {
        if (payload != null && !payload.isMissingNode()) {
            if (payload.hasNonNull("taskId")) return payload.path("taskId").asText();
            if (payload.has("task") && payload.path("task").hasNonNull("id")) {
                return payload.path("task").path("id").asText();
            }
            if (payload.has("comment") && payload.path("comment").hasNonNull("taskId")) {
                return payload.path("comment").path("taskId").asText();
            }
            if (payload.has("attachment") && payload.path("attachment").hasNonNull("taskId")) {
                return payload.path("attachment").path("taskId").asText();
            }
        }
        if (message != null && !message.isMissingNode()) {
            String type = message.path("type").asText("");
            if (message.hasNonNull("targetId") && (type.startsWith("TASK") || type.startsWith("SUB_TASK"))) {
                return message.path("targetId").asText();
            }
        }
        return null;
    }

    private List<String> extractTargetUserIds(JsonNode payload) {
        List<String> targetUserIds = new ArrayList<>();
        if (payload == null || payload.isMissingNode()) return targetUserIds;

        String[] userKeys = {
                "userId", "memberId", "targetUserId", "assigneeId",
                "addedUserId", "removedUserId", "updatedUserId", "email"
        };

        for (String key : userKeys) {
            if (payload.hasNonNull(key)) {
                String val = payload.path(key).asText();
                if (!val.isBlank() && !val.equals("null") && !targetUserIds.contains(val)) {
                    targetUserIds.add(val);
                }
            }
        }

        if (payload.has("member")) {
            JsonNode memberNode = payload.path("member");
            if (memberNode.hasNonNull("userId")) {
                String val = memberNode.path("userId").asText();
                if (!targetUserIds.contains(val)) targetUserIds.add(val);
            } else if (memberNode.hasNonNull("id")) {
                String val = memberNode.path("id").asText();
                if (!targetUserIds.contains(val)) targetUserIds.add(val);
            }
        }

        JsonNode taskNode = payload.has("task") ? payload.path("task") : payload;
        if (taskNode.hasNonNull("assigneeId")) {
            String assignee = taskNode.path("assigneeId").asText();
            if (!assignee.isBlank() && !assignee.equals("null") && !targetUserIds.contains(assignee)) {
                targetUserIds.add(assignee);
            }
        }

        return targetUserIds;
    }

    private void dispatchToUsersAndTopics(String messagePayload, JsonNode message, JsonNode payload) {
        String type = message.path("type").asText("UNKNOWN");

        String projectId = extractProjectId(message, payload);
        if (projectId != null && !projectId.isBlank()) {
            messagingTemplate.convertAndSend("/topic/project/" + projectId, messagePayload);
        }

        String taskId = extractTaskId(message, payload);
        if (taskId != null && !taskId.isBlank()) {
            messagingTemplate.convertAndSend("/topic/task/" + taskId, messagePayload);
        }

        List<String> targetUsers = extractTargetUserIds(payload);
        for (String uId : targetUsers) {
            messagingTemplate.convertAndSendToUser(uId, "/queue/notifications", messagePayload);
        }
    }

    @KafkaListener(topics = "task_events", groupId = "websocket-task-group")
    public void handleTaskEvents(String messagePayload) {
        try {
            JsonNode message = objectMapper.readTree(messagePayload);
            dispatchToUsersAndTopics(messagePayload, message, message.path("payload"));
        } catch (Exception e) {
            log.error("Lỗi task_events: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "project_events", groupId = "websocket-project-group")
    public void handleProjectEvents(String messagePayload) {
        try {
            JsonNode rootNode = objectMapper.readTree(messagePayload);
            JsonNode message = rootNode.isTextual() ? objectMapper.readTree(rootNode.asText()) : rootNode;

            String type = message.path("type").asText("");
            JsonNode payload = message.path("payload");
            String rawJson = message.toString();

            dispatchToUsersAndTopics(rawJson, message, payload);

            if ("PROJECT_CREATED".equals(type) || "PROJECT_DELETED".equals(type)) {
                messagingTemplate.convertAndSend("/topic/projects", rawJson);
            }
        } catch (Exception e) {
            log.error("Lỗi project_events: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "comment_events", groupId = "websocket-comment-group")
    public void handleCommentEvents(String messagePayload) {
        try {
            JsonNode message = objectMapper.readTree(messagePayload);
            dispatchToUsersAndTopics(messagePayload, message, message.path("payload"));
        } catch (Exception e) {
            log.error("Lỗi comment_events: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "attachment_events", groupId = "websocket-attachment-group")
    public void handleAttachmentEvents(String messagePayload) {
        try {
            JsonNode message = objectMapper.readTree(messagePayload);
            dispatchToUsersAndTopics(messagePayload, message, message.path("payload"));
        } catch (Exception e) {
            log.error("Lỗi attachment_events: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "auth_events", groupId = "websocket-auth-group")
    public void handleAuthEvents(String messagePayload) {
        try {
            JsonNode message = objectMapper.readTree(messagePayload);
            messagingTemplate.convertAndSend("/topic/users", messagePayload);
        } catch (Exception e) {
            log.error("Lỗi auth_events: {}", e.getMessage());
        }
    }
}