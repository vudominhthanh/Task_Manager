package Task_Manager.report_service.kafka;

import Task_Manager.report_service.service.ReportService;
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
public class ReportConsumer {
    private final ReportService reportService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "project_events", groupId = "reports-project-group")
    public void handleProjectEvents(String payloadString) {
        try {
            JsonNode message = objectMapper.readTree(payloadString);
            String type = message.path("type").asText("");
            JsonNode payLoad = message.path("payload");

            if ("PROJECT_CREATED".equals(type)) {
                String projectIdStr = null;
                if (payLoad.has("project") && payLoad.path("project").has("id")) {
                    projectIdStr = payLoad.path("project").path("id").asText(null);
                } else if (payLoad.has("projectId")) {
                    projectIdStr = payLoad.path("projectId").asText(null);
                }

                if (projectIdStr != null && !projectIdStr.isEmpty()) {
                    reportService.initProjectStatistic(UUID.fromString(projectIdStr));
                    log.info("ReportConsumer đã khởi tạo thống kê cho project: {}", projectIdStr);
                }
            }
            else if ("PROJECT_DELETED".equals(type)) {
                String projectIdStr = payLoad.path("projectId").asText(null);
                if (projectIdStr != null && !projectIdStr.isEmpty()) {
                    reportService.deleteProjectStatistic(UUID.fromString(projectIdStr));
                    log.info("ReportConsumer đã xóa thống kê project: {}", projectIdStr);
                }
            }
        } catch (Exception e) {
            log.error("Lỗi xử lý project event tại ReportConsumer: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "task_events", groupId = "reports-task-group")
    public void handleTaskEvents(String payloadString) {
        try {
            JsonNode message = objectMapper.readTree(payloadString);
            String type = message.path("type").asText("");
            JsonNode payLoad = message.path("payload");

            JsonNode taskNode = payLoad.path("task");

            // Lấy projectId an toàn từ taskNode hoặc payload
            String projectIdStr = null;
            if (!taskNode.isMissingNode() && taskNode.hasNonNull("projectId")) {
                projectIdStr = taskNode.path("projectId").asText(null);
            } else if (payLoad.hasNonNull("projectId")) {
                projectIdStr = payLoad.path("projectId").asText(null);
            }

            if (projectIdStr != null && !projectIdStr.isEmpty()) {
                UUID projectId = UUID.fromString(projectIdStr);

                String newStatus = "TO_DO";
                if (!taskNode.isMissingNode() && taskNode.hasNonNull("status")) {
                    newStatus = taskNode.path("status").asText("TO_DO");
                } else if (payLoad.hasNonNull("status")) {
                    newStatus = payLoad.path("status").asText("TO_DO");
                }

                log.info("ReportConsumer nhận task event [{}], projectId: {}, status: {}", type, projectId, newStatus);

                switch (type) {
                    case "TASK_CREATED":
                    case "SUB_TASK_CREATED":
                        reportService.handleTaskStatusChange(projectId, null, newStatus, true);
                        break;

                    case "TASK_STATUS_UPDATED":
                        String oldStatus = payLoad.hasNonNull("oldStatus") ? payLoad.path("oldStatus").asText(null) : "TO_DO";
                        reportService.handleTaskStatusChange(projectId, oldStatus, newStatus, false);
                        break;

                    case "TASK_DELETED":
                        reportService.handleTaskDeleted(projectId, newStatus);
                        break;
                }
            } else {
                log.warn("ReportConsumer bỏ qua task event do không tìm thấy projectId trong payload: {}", payloadString);
            }
        } catch (Exception e) {
            log.error("Lỗi xử lý task event tại ReportConsumer: {}", e.getMessage(), e);
        }
    }
}