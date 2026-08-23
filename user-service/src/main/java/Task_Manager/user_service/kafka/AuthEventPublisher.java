package Task_Manager.user_service.kafka;

import Task_Manager.user_service.dto.AuthResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AuthEventPublisher {
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private static final String TOPIC = "auth_events";

    public void publishUserRegistered(UUID userId, Object payload) {
        kafkaTemplate.send(TOPIC, userId.toString(), new AuthEvent("USER_REGISTERED", payload));
    }

    public void publishUserLoggedIn(UUID userId, Object payload) {
        kafkaTemplate.send(TOPIC, userId.toString(), new AuthEvent("USER_LOGGED", payload));
    }
}
record AuthEvent(String type, Object payload) {}