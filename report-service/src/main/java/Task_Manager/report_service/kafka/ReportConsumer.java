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

            String projectIdStr = null;
            if (payLoad.has("project") && payLoad.path("project").hasNonNull("id")) {
                projectIdStr = payLoad.path("project").path("id").asText(null);
            } else if (payLoad.hasNonNull("projectId")) {
                projectIdStr = payLoad.path("projectId").asText(null);
            }

            if (projectIdStr == null || projectIdStr.isEmpty()) return;
            UUID projectId = UUID.fromString(projectIdStr);

            if ("PROJECT_CREATED".equalsIgnoreCase(type) || "CREATED".equalsIgnoreCase(type)) {
                reportService.initProjectStatistic(projectId);
                log.info("[ReportConsumer] Đã khởi tạo thống kê cho project: {}", projectId);
            } else if ("PROJECT_DELETED".equalsIgnoreCase(type) || "DELETED".equalsIgnoreCase(type)) {
                reportService.deleteProjectStatistic(projectId);
                log.info("[ReportConsumer] Đã xóa thống kê project: {}", projectId);
            }
        } catch (Exception e) {
            log.error("[ReportConsumer] Lỗi xử lý project event: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "task_events", groupId = "reports-task-group")
    public void handleTaskEvents(String payloadString) {
        try {
            JsonNode message = objectMapper.readTree(payloadString);
            String type = message.path("type").asText("");
            JsonNode payLoad = message.path("payload");
            JsonNode taskNode = payLoad.path("task");

            // Trích xuất projectId từ mọi vị trí khả dĩ
            String projectIdStr = null;
            if (!taskNode.isMissingNode() && taskNode.hasNonNull("projectId")) {
                projectIdStr = taskNode.path("projectId").asText(null);
            } else if (payLoad.hasNonNull("projectId")) {
                projectIdStr = payLoad.path("projectId").asText(null);
            }

            if (projectIdStr == null || projectIdStr.isEmpty()) {
                log.warn("[ReportConsumer] Bỏ qua task event do thiếu projectId: {}", type);
                return;
            }

            UUID projectId = UUID.fromString(projectIdStr);
            String normalizedType = type.toUpperCase();

            // Đồng bộ mọi format event name
            if (normalizedType.contains("CREATED") || normalizedType.contains("SUB_CREATED")) {
                reportService.handleTaskStatusChange(projectId, null, "CREATED", true);
            } else if (normalizedType.contains("STATUS") || normalizedType.contains("UPDATED")) {
                reportService.handleTaskStatusChange(projectId, null, "UPDATED", false);
            } else if (normalizedType.contains("DELETE")) {
                reportService.handleTaskDeleted(projectId, "DELETED");
            }

            log.info("[ReportConsumer] Đã xử lý tính toán lại thống kê cho project: {} từ event {}", projectId, type);
        } catch (Exception e) {
            log.error("[ReportConsumer] Lỗi xử lý task event: {}", e.getMessage());
        }
    }
}