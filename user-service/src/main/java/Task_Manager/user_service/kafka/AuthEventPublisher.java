package Task_Manager.user_service.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuthEventPublisher {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private static final String TOPIC = "auth_events";

    private void sendEvent(String type, UUID userId, Object payload) {
        try {
            AuthEvent authEvent = new AuthEvent(type, payload);
            String jsonMessage = objectMapper.writeValueAsString(authEvent);
            kafkaTemplate.send(TOPIC, userId.toString(), jsonMessage);
        } catch (Exception e) {
            log.error("Failed to publish {} event for user: {}", type, userId, e);
        }
    }

    public void publishUserRegistered(UUID userId, Object payload) {
        sendEvent("USER_REGISTERED", userId, payload);
    }

    public void publishUserLoggedIn(UUID userId, Object payload) {
        sendEvent("USER_LOGGED", userId, payload);
    }
}
record AuthEvent(String type, Object payload) {}