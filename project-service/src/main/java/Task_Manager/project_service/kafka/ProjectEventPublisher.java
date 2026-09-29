package Task_Manager.project_service.kafka;

import Task_Manager.project_service.dto.ProjectEventDto;
import Task_Manager.project_service.dto.ProjectMemberEventDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ProjectEventPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private static final String TOPIC = "project_events";

    private void sendEvent(UUID projectId, String type, Object payload) {
        try {
            ProjectEvent event = new ProjectEvent(type, payload);
            String jsonPayload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(TOPIC, projectId.toString(), jsonPayload);
        } catch (Exception e) {
            log.error("Lỗi serialize Kafka event [{}]: {}", type, e.getMessage(), e);
        }
    }

    public void publishProjectCreated(UUID projectId, ProjectEventDto payload) {
        sendEvent(projectId, "PROJECT_CREATED", payload);
    }

    public void publishProjectUpdated(UUID projectId, ProjectEventDto payload) {
        sendEvent(projectId, "PROJECT_UPDATED", payload);
    }

    public void publishProjectDeleted(UUID projectId, ProjectEventDto payload) {
        sendEvent(projectId, "PROJECT_DELETED", payload);
    }

    public void publishMemberAdded(UUID projectId, ProjectMemberEventDto payload) {
        sendEvent(projectId, "MEMBER_ADDED", payload);
    }

    public void publishMemberRemoved(UUID projectId, ProjectMemberEventDto payload) {
        sendEvent(projectId, "MEMBER_REMOVED", payload);
    }

    public void publishMemberRoleUpdated(UUID projectId, ProjectMemberEventDto payload) {
        sendEvent(projectId, "MEMBER_ROLE_UPDATED", payload);
    }
}

record ProjectEvent(String type, Object payload) {}