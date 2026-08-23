package Task_Manager.task_service.kafka;

import Task_Manager.task_service.dto.AttachmentResponse;
import Task_Manager.task_service.entity.Attachment;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AttachmentEventPublisher {
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private static final String TOPIC = "attachment_events";

    public void publishAttachmentCreated(AttachmentResponse response) {
        kafkaTemplate.send(TOPIC, "ATTACHMENT_CREATED", response);
    }

    public void publishAttachmentDeleted(UUID attachmentId) {
        kafkaTemplate.send(TOPIC, "ATTACHMENT_DELETED", attachmentId);
    }
}
