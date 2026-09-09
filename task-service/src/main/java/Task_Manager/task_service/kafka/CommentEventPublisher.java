package Task_Manager.task_service.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class CommentEventPublisher {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private static final String TOPIC = "comment_events";

    private void sendEvent(UUID commentId, String type, Object payload) {
        try {
            CommentEvent event = new CommentEvent(type, payload);
            String jsonPayload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(TOPIC, commentId.toString(), jsonPayload);
        } catch (Exception e) {
            log.error("Lỗi serialize Kafka event [{}]: {}", type, e.getMessage());
        }
    }

    public void publishCommentCreated(UUID commentId, Object payload) {
        sendEvent(commentId, "COMMENT_CREATED", payload);
    }
    public void publishCommentUpdated(UUID commentId, Object payload) {
        sendEvent(commentId, "COMMENT_UPDATED", payload);
    }
    public void publishCommentDeleted(UUID commentId, Object payload) {
        sendEvent(commentId, "COMMENT_DELETED", payload);
    }

}

record CommentEvent(String type, Object payload) {}