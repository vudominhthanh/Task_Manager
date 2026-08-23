package Task_Manager.task_service.kafka;

import Task_Manager.task_service.dto.CommentResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CommentEventPublisher {
    private KafkaTemplate<String, Object> kafkaTemplate;
    private static final String TOPIC = "comment_events";

    public void publishCommentCreated(CommentResponse commentResponse) {
        kafkaTemplate.send(TOPIC, "COMMENT_CREATED", commentResponse);
    }

    public void publishCommentUpdated(CommentResponse response) {
        kafkaTemplate.send("comment-events", "COMMENT_UPDATED", response);
    }

    public void publishCommentDeleted(UUID commentId) {
        kafkaTemplate.send(TOPIC, "COMMENT_DELETED", commentId);
    }
}
