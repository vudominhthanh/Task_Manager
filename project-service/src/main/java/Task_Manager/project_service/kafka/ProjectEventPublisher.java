package Task_Manager.project_service.kafka;

import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ProjectEventPublisher {
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private static final String TOPIC = "project_events";

    public void publishProjectCreated(UUID projectId, Object payload) {
        kafkaTemplate.send(TOPIC, projectId.toString(), new ProjectEvent("PROJECT_CREATED", payload));
    }

    public void publishProjectUpdated(UUID projectId, Object payload) {
        kafkaTemplate.send(TOPIC, projectId.toString(), new ProjectEvent("PROJECT_UPDATED", payload));
    }

    public void publishProjectDeleted(UUID projectId) {
        kafkaTemplate.send(TOPIC, projectId.toString(), new ProjectEvent("PROJECT_DELETED", projectId));
    }

    public void publishMemberAdded(UUID projectId, Object payload) {
        kafkaTemplate.send(TOPIC, projectId.toString(), new ProjectEvent("MEMBER_ADDED", payload));
    }

    public void publishMemberRemoved(UUID projectId, Object payload) {
        kafkaTemplate.send(TOPIC, projectId.toString(), new ProjectEvent("MEMBER_REMOVED", payload));
    }
}

record ProjectEvent(String type, Object payload) {}