package Task_Manager.websocket_service.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/broadcast")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"}, allowedHeaders = "*", methods = {RequestMethod.POST, RequestMethod.OPTIONS})
public class BroadcastController {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @PostMapping
    public ResponseEntity<?> sendBroadcast(@RequestBody Map<String, String> payload) {
        String message = payload.get("message");
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Nội dung không được để trống"));
        }

        try {
            Map<String, Object> kafkaEvent = Map.of(
                    "type", "SYSTEM_BROADCAST",
                    "payload", payload
            );

            kafkaTemplate.send("system_events", objectMapper.writeValueAsString(kafkaEvent));

            return ResponseEntity.ok(Map.of("message", "Đã gửi yêu cầu thông báo toàn hệ thống"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Lỗi khi gửi thông báo"));
        }
    }
}