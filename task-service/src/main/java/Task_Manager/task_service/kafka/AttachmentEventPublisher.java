package Task_Manager.task_service.kafka;

import Task_Manager.task_service.dto.AttachmentResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class AttachmentEventPublisher {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private static final String TOPIC = "attachment_events";

   public void sendEvent(UUID attachmentId, String type, Object payload) {
       try {
           AttachmentEvent event = new AttachmentEvent(type, payload);
           String jsonPayload = objectMapper.writeValueAsString(event);
           kafkaTemplate.send(TOPIC, attachmentId.toString(), jsonPayload);
       } catch (Exception e) {
           log.error("Lỗi serialize Kafka event [{}]: {}", type, e.getMessage());
       }
   }

    public void publishAttachmentCreated(UUID attachmentId, Object payload) {
        sendEvent(attachmentId, "ATTACHMENT_CREATED", payload);
    }

    public void publishAttachmentDeleted(UUID attachmentId, Object payload) {
        sendEvent(attachmentId, "ATTACHMENT_DELETED", payload);
    }
}

record AttachmentEvent(String type, Object payload) {}