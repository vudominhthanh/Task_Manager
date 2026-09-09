package Task_Manager.notification_service.kafka;

import Task_Manager.notification_service.Service.NotificationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationConsumer {

    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "task_events", groupId = "notifications")
    public void handleTaskEvents(String messagePayload) {
        try {
            JsonNode message = objectMapper.readTree(messagePayload);
            String eventType = message.path("type").asText("");
            JsonNode payload = message.path("payload");

            JsonNode taskNode = payload.path("task");
            if (taskNode.isMissingNode()) return;

            UUID assigneeId = taskNode.hasNonNull("assigneeId") ? UUID.fromString(taskNode.get("assigneeId").asText()) : null;
            UUID reporterId = taskNode.hasNonNull("reporterId") ? UUID.fromString(taskNode.get("reporterId").asText()) : null;

            UUID actorId = payload.hasNonNull("createdBy") ? UUID.fromString(payload.get("createdBy").asText()) :
                    (payload.hasNonNull("updatedBy") ? UUID.fromString(payload.get("updatedBy").asText()) : reporterId);

            String taskTitle = taskNode.path("title").asText("Công việc");
            String projectName = resolveProjectName(payload, taskNode);

            // Xác định người cần nhận thông báo:
            // Khi tạo/giao việc hoặc đổi trạng thái: thông báo cho Assignee
            // Nếu người thao tác chính là Assignee: thông báo ngược lại cho Reporter
            UUID recipientId = (assigneeId != null && !assigneeId.equals(actorId))
                    ? assigneeId
                    : (reporterId != null && !reporterId.equals(actorId) ? reporterId : null);

            if (recipientId == null) return;

            // Lưu message dạng text súc tích hoặc event key
            String notificationMsg = switch (eventType) {
                case "TASK_CREATED", "SUB_TASK_CREATED" -> "đã giao cho bạn công việc: " + taskTitle;
                case "TASK_UPDATED" -> "đã cập nhật thông tin công việc: " + taskTitle;
                case "TASK_STATUS_UPDATED" -> {
                    String newStatus = taskNode.path("status").asText("mới");
                    yield "đã chuyển trạng thái công việc '" + taskTitle + "' sang: " + newStatus;
                }
                case "TASK_DELETED" -> "đã xóa công việc: " + taskTitle;
                default -> null;
            };

            if (notificationMsg != null) {
                notificationService.createNotification(recipientId, actorId, eventType, taskTitle, projectName, notificationMsg);
            }

        } catch (Exception e) {
            log.error("Lỗi khi xử lý task_events tại NotificationConsumer: {}", e.getMessage(), e);
        }
    }

    @KafkaListener(topics = "comment_events", groupId = "notifications")
    public void handleCommentEvents(String messagePayload) {
        try {
            JsonNode message = objectMapper.readTree(messagePayload);
            String eventType = message.path("type").asText("");
            JsonNode payload = message.path("payload");

            JsonNode commentNode = payload.path("comment");
            if (commentNode.isMissingNode()) return;

            UUID authorId = commentNode.hasNonNull("userId") ? UUID.fromString(commentNode.get("userId").asText()) : null;
            String content = commentNode.path("content").asText("");
            String shortComment = content.length() > 30 ? content.substring(0, 30) + "..." : content;

            String projectName = payload.hasNonNull("projectName") ? payload.get("projectName").asText("Dự án") : "Dự án hệ thống";
            String targetTaskTitle = payload.hasNonNull("targetName") ? payload.get("targetName").asText("công việc") : "công việc";

            UUID recipientId = null;
            if (payload.hasNonNull("recipientId")) {
                recipientId = UUID.fromString(payload.get("recipientId").asText());
            } else if (payload.hasNonNull("task") && payload.get("task").hasNonNull("assigneeId")) {
                recipientId = UUID.fromString(payload.get("task").get("assigneeId").asText());
            }

            // Không gửi thông báo cho chính người viết comment
            if (recipientId != null && !recipientId.equals(authorId)) {
                String notificationMsg = "đã bình luận vào '" + targetTaskTitle + "': \"" + shortComment + "\"";
                notificationService.createNotification(recipientId, authorId, eventType, targetTaskTitle, projectName, notificationMsg);
            }

        } catch (Exception e) {
            log.error("Lỗi khi xử lý comment_events tại NotificationConsumer: {}", e.getMessage(), e);
        }
    }

    @KafkaListener(topics = "project_events", groupId = "notifications")
    public void handleProjectEvents(String messagePayload) {
        try {
            JsonNode message = objectMapper.readTree(messagePayload);
            String eventType = message.path("type").asText("");
            JsonNode payload = message.path("payload");

            String projectName = payload.hasNonNull("projectName") ? payload.get("projectName").asText("Dự án") : "Dự án";

            if ("MEMBER_ADDED".equals(eventType)) {
                UUID addedUserId = payload.hasNonNull("addedUserId") ? UUID.fromString(payload.get("addedUserId").asText()) : null;
                UUID addedBy = payload.hasNonNull("addedBy") ? UUID.fromString(payload.get("addedBy").asText()) : null;

                if (addedUserId != null && !addedUserId.equals(addedBy)) {
                    String msg = "đã thêm bạn vào dự án: " + projectName;
                    notificationService.createNotification(addedUserId, addedBy, eventType, projectName, projectName, msg);
                }
            } else if ("MEMBER_ROLE_UPDATED".equals(eventType)) {
                UUID updatedUserId = payload.hasNonNull("updatedUserId") ? UUID.fromString(payload.get("updatedUserId").asText()) : null;
                UUID updatedBy = payload.hasNonNull("updatedBy") ? UUID.fromString(payload.get("updatedBy").asText()) : null;
                String newRole = payload.path("newRole").asText("MEMBER");

                if (updatedUserId != null && !updatedUserId.equals(updatedBy)) {
                    String msg = "đã cập nhật vai trò của bạn trong '" + projectName + "' thành: " + newRole;
                    notificationService.createNotification(updatedUserId, updatedBy, eventType, projectName, projectName, msg);
                }
            } else if ("MEMBER_REMOVED".equals(eventType)) {
                UUID removedUserId = payload.hasNonNull("removedUserId") ? UUID.fromString(payload.get("removedUserId").asText()) : null;
                UUID removedBy = payload.hasNonNull("removedBy") ? UUID.fromString(payload.get("removedBy").asText()) : null;

                if (removedUserId != null && !removedUserId.equals(removedBy)) {
                    String msg = "đã xóa bạn khỏi dự án: " + projectName;
                    notificationService.createNotification(removedUserId, removedBy, eventType, projectName, projectName, msg);
                }
            }
        } catch (Exception e) {
            log.error("Lỗi khi xử lý project_events tại NotificationConsumer: {}", e.getMessage(), e);
        }
    }

    private String resolveProjectName(JsonNode payload, JsonNode taskNode) {
        if (payload.hasNonNull("projectName") && !payload.get("projectName").asText().isBlank()) {
            return payload.get("projectName").asText();
        }
        if (taskNode.hasNonNull("projectName") && !taskNode.get("projectName").asText().isBlank()) {
            return taskNode.get("projectName").asText();
        }
        return "Dự án hệ thống";
    }
}