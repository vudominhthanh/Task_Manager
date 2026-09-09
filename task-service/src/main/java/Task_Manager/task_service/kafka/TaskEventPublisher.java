package Task_Manager.task_service.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import Task_Manager.task_service.dto.TaskResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class TaskEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private static final String TOPIC = "task_events";

    private void sendEvent(UUID taskId, String type, Object payload) {
        try {
            TaskEvent event = new TaskEvent(type, payload);
            String jsonPayload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(TOPIC, taskId.toString(), jsonPayload);
        } catch (Exception e) {
            log.error("Lỗi serialize Kafka event [{}]: {}", type, e.getMessage());
        }
    }

    public void publishTaskCreated(UUID taskId, Object payload) {
        sendEvent(taskId, "TASK_CREATED", payload);
    }

    public void publishTaskUpdated(UUID taskId, Object payload) {
        sendEvent(taskId, "TASK_UPDATED", payload);
    }

    public void publishTaskStatusUpdated(UUID taskId, Object payload) {
        sendEvent(taskId, "TASK_STATUS_UPDATED", payload);
    }

    public void publishTaskDeleted(UUID taskId, Object payload) {
        sendEvent(taskId, "TASK_DELETED", payload);
    }

    public void publishSubTaskCreated(UUID taskId, Object payload) {
        sendEvent(taskId, "SUB_TASK_CREATED", payload);
    }
}

record TaskEvent(String type, Object payload) {}