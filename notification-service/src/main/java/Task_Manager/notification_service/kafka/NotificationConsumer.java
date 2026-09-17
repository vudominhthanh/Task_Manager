package Task_Manager.notification_service.kafka;

import Task_Manager.notification_service.Service.EmailConfigService;
import Task_Manager.notification_service.Service.NotificationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationConsumer {

    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final EmailConfigService emailConfigService;

    @KafkaListener(topics = "auth_events", groupId = "notifications")
    public void handleAuthEvents(String messagePayload) {
        processEventSafely(messagePayload, "auth_events", (eventType, payload) -> {
            if ("REGISTRATION_OTP".equals(eventType)) {
                String email = payload.path("email").asText(null);
                String otp = payload.path("otp").asText(null);
                String fullName = payload.path("fullName").asText(email);

                if (email != null && otp != null) {
                    sendOtpEmail(email, otp, fullName);
                }
            }
        });
    }

    @KafkaListener(topics = "task_events", groupId = "notifications")
    public void handleTaskEvents(String messagePayload) {
        processEventSafely(messagePayload, "task_events", (eventType, payload) -> {
            JsonNode taskNode = payload.path("task");
            if (taskNode.isMissingNode()) return;

            UUID assigneeId = extractUuid(taskNode, "assigneeId");
            UUID reporterId = extractUuid(taskNode, "reporterId");
            UUID actorId = extractUuid(payload, "createdBy", "updatedBy");
            if (actorId == null) actorId = reporterId;

            // Người nhận thông báo: nếu người sửa là assignee thì báo cho reporter, ngược lại báo cho assignee
            UUID recipientId = (assigneeId != null && !assigneeId.equals(actorId)) ? assigneeId :
                    (reporterId != null && !reporterId.equals(actorId) ? reporterId : null);

            String actorName = resolveActorName(payload, taskNode);
            String taskTitle = taskNode.path("title").asText("công việc");
            String projectName = resolveProjectName(payload, taskNode);

            // Bổ sung actorName vào đầu câu
            String msg = switch (eventType) {
                case "TASK_CREATED", "SUB_TASK_CREATED" -> actorName + " đã phân công cho bạn công việc: \"" + taskTitle + "\"";
                case "TASK_UPDATED" -> actorName + " đã cập nhật thông tin công việc: \"" + taskTitle + "\"";
                case "TASK_STATUS_UPDATED" -> actorName + " đã chuyển trạng thái công việc \"" + taskTitle + "\" sang \"" + formatStatus(taskNode.path("status").asText(null)) + "\"";
                case "TASK_DELETED" -> actorName + " đã xóa công việc \"" + taskTitle + "\"";
                default -> null;
            };

            notifyIfValid(recipientId, actorId, eventType, taskTitle, projectName, msg);
        });
    }

    @KafkaListener(topics = "comment_events", groupId = "notifications")
    public void handleCommentEvents(String messagePayload) {
        processEventSafely(messagePayload, "comment_events", (eventType, payload) -> {
            JsonNode commentNode = payload.path("comment");
            if (commentNode.isMissingNode()) return;

            UUID authorId = extractUuid(commentNode, "userId");
            if (authorId == null) {
                authorId = extractUuid(payload, "createdBy");
            }

            // Tìm recipientId: từ payload -> task -> assigneeId / taskOwnerId
            UUID recipientId = extractUuid(payload, "recipientId", "assigneeId", "taskOwnerId");
            if (recipientId == null && payload.hasNonNull("task")) {
                recipientId = extractUuid(payload.path("task"), "assigneeId", "reporterId");
            }

            String actorName = resolveActorName(payload, commentNode);
            String content = commentNode.path("content").asText("").trim();
            String preview = content.length() > 40 ? content.substring(0, 40) + "..." : content;
            String targetName = payload.path("targetName").asText("công việc");
            String projectName = payload.path("projectName").asText("Dự án");

            // Bổ sung actorName
            String msg = actorName + " đã bình luận trong \"" + targetName + "\": \"" + preview + "\"";

            notifyIfValid(recipientId, authorId, eventType, targetName, projectName, msg);
        });
    }

    @KafkaListener(topics = "project_events", groupId = "notifications")
    public void handleProjectEvents(String messagePayload) {
        processEventSafely(messagePayload, "project_events", (eventType, payload) -> {
            String projectName = payload.path("projectName").asText("Dự án");
            String actorName = resolveActorName(payload, null);
            UUID recipientId = null;
            UUID actorId = null;
            String msg = null;

            switch (eventType) {
                case "MEMBER_ADDED" -> {
                    recipientId = extractUuid(payload, "addedUserId", "member_id", "memberId", "userId");
                    actorId = extractUuid(payload, "addedBy", "actorId", "createdBy");
                    msg = actorName + " đã thêm bạn vào dự án: \"" + projectName + "\"";
                }
                case "MEMBER_ROLE_UPDATED" -> {
                    recipientId = extractUuid(payload, "updatedUserId");
                    actorId = extractUuid(payload, "updatedBy");
                    msg = actorName + " đã cập nhật vai trò của bạn trong dự án \"" + projectName + "\" thành \"" + formatRole(payload.path("newRole").asText(null)) + "\"";
                }
                case "MEMBER_REMOVED" -> {
                    recipientId = extractUuid(payload, "removedUserId");
                    actorId = extractUuid(payload, "removedBy");
                    msg = actorName + " đã đưa bạn ra khỏi dự án: \"" + projectName + "\"";
                }
            }

            notifyIfValid(recipientId, actorId, eventType, projectName, projectName, msg);
        });
    }

    @KafkaListener(topics = "attachment_events", groupId = "notifications")
    public void handleAttachmentEvents(String messagePayload) {
        processEventSafely(messagePayload, "attachment_events", (eventType, payload) -> {
            UUID actorId = extractUuid(payload, "createdBy", "deletedBy");
            UUID recipientId = extractUuid(payload, "recipientId", "assigneeId");

            String actorName = resolveActorName(payload, null);
            String fileName = payload.path("targetName").asText("tệp đính kèm");
            String taskTitle = payload.path("taskTitle").asText("công việc");
            String projectName = payload.path("projectName").asText("Dự án");

            String msg = switch (eventType) {
                case "ATTACHMENT_CREATED" -> actorName + " đã đính kèm tệp \"" + fileName + "\" vào công việc: \"" + taskTitle + "\"";
                case "ATTACHMENT_DELETED" -> actorName + " đã gỡ tệp \"" + fileName + "\" khỏi công việc: \"" + taskTitle + "\"";
                default -> null;
            };

            notifyIfValid(recipientId, actorId, eventType, taskTitle, projectName, msg);
        });
    }

    @KafkaListener(topics = "system_events", groupId = "notifications")
    public void handleSystemEvents(String messagePayload) {
        processEventSafely(messagePayload, "system_events", (eventType, payload) -> {
            if ("SYSTEM_BROADCAST".equals(eventType)) {
                String message = payload.path("message").asText("Thông báo từ hệ thống");
                UUID adminId = extractUuid(payload, "actorId");

                List<UUID> targetUserIds = new ArrayList<>();
                JsonNode userIdsNode = payload.path("userIds");
                if (userIdsNode.isArray()) {
                    for (JsonNode idNode : userIdsNode) {
                        targetUserIds.add(UUID.fromString(idNode.asText()));
                    }
                }

                notificationService.createGlobalNotification(adminId, message, targetUserIds);
            }
        });
    }

    private void processEventSafely(String messagePayload, String topicName, EventProcessor processor) {
        try {
            log.info("📩 Nhận event từ topic [{}]: {}", topicName, messagePayload);
            JsonNode message = objectMapper.readTree(messagePayload);
            String eventType = message.path("type").asText("");
            JsonNode payload = message.path("payload");
            processor.process(eventType, payload);
        } catch (Exception e) {
            log.error("Lỗi khi xử lý {} tại NotificationConsumer: {}", topicName, e.getMessage(), e);
        }
    }

    private void notifyIfValid(UUID recipientId, UUID actorId, String eventType, String targetName, String projectName, String message) {
        log.info("🔍 Chuẩn bị lưu DB -> type: {}, recipientId: {}, actorId: {}, msg: {}", eventType, recipientId, actorId, message);

        if (recipientId != null && !recipientId.equals(actorId) && message != null) {
            notificationService.createNotification(recipientId, actorId, eventType, targetName, projectName, message);
        }
    }

    private UUID extractUuid(JsonNode node, String... keys) {
        if (node == null || node.isMissingNode()) return null;
        for (String key : keys) {
            if (node.hasNonNull(key)) {
                try {
                    return UUID.fromString(node.get(key).asText());
                } catch (IllegalArgumentException ignored) {}
            }
        }
        return null;
    }

    private String resolveActorName(JsonNode payload, JsonNode nestedNode) {
        if (payload != null) {
            if (payload.hasNonNull("username") && !payload.get("username").asText().isBlank()) {
                return payload.get("username").asText();
            }
            if (payload.hasNonNull("actorName") && !payload.get("actorName").asText().isBlank()) {
                return payload.get("actorName").asText();
            }
        }
        if (nestedNode != null) {
            if (nestedNode.hasNonNull("userName") && !nestedNode.get("userName").asText().isBlank()) {
                return nestedNode.get("userName").asText();
            }
            if (nestedNode.hasNonNull("username") && !nestedNode.get("username").asText().isBlank()) {
                return nestedNode.get("username").asText();
            }
        }
        return "Một thành viên";
    }

    private String resolveProjectName(JsonNode payload, JsonNode taskNode) {
        if (payload.hasNonNull("projectName") && !payload.get("projectName").asText().isBlank()) {
            return payload.get("projectName").asText();
        }
        if (taskNode.hasNonNull("projectName") && !taskNode.get("projectName").asText().isBlank()) {
            return taskNode.get("projectName").asText();
        }
        return "Dự án chung";
    }

    private void sendOtpEmail(String email, String otp, String fullName) {
        log.info("📩 [OTP-WORKER] Đang xử lý gửi OTP [{}] tới: {}", otp, email);
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setTo(email);
            mail.setSubject("[Task Manager] Mã xác nhận đăng ký tài khoản");
            mail.setText(String.format(
                    "Xin chào %s,\n\nMã OTP xác thực đăng ký tài khoản của bạn là: %s\nMã có hiệu lực trong vòng 5 phút.\n\nNếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.",
                    fullName, otp
            ));
            emailConfigService.sendOtp(email, otp, fullName);
        } catch (Exception e) {
            log.warn("⚠️ Chưa cấu hình SMTP hoặc lỗi gửi mail thực ({}) -> Hãy dùng OTP từ log trên để test.", e.getMessage());
        }
    }

    private String formatStatus(String status) {
        if (status == null) return "mới";
        return switch (status.toUpperCase()) {
            case "TO_DO" -> "Cần làm";
            case "IN_PROGRESS" -> "Đang thực hiện";
            case "REVIEW" -> "Chờ duyệt";
            case "DONE", "COMPLETED" -> "Hoàn thành";
            default -> status;
        };
    }

    private String formatRole(String role) {
        if (role == null) return "Thành viên";
        return switch (role.toUpperCase()) {
            case "ADMIN", "PROJECT_ADMIN" -> "Quản trị viên";
            case "LEADER" -> "Trưởng nhóm";
            case "MEMBER" -> "Thành viên";
            case "VIEWER" -> "Người quan sát";
            default -> role;
        };
    }

    @FunctionalInterface
    private interface EventProcessor {
        void process(String eventType, JsonNode payload) throws Exception;
    }
}