package Task_Manager.notification_service.controller;

import Task_Manager.notification_service.Service.EmailConfigService;
import Task_Manager.notification_service.Service.NotificationService;
import Task_Manager.notification_service.dto.BroadcastRequest;
import Task_Manager.notification_service.dto.NotificationResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin("*")
public class NotificationController {
    private final NotificationService notificationService;
    private final EmailConfigService emailConfigService;

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getUserNotifications(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());

        List<NotificationResponse> notifications = notificationService.getUserNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID id,  Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        notificationService.markAsRead(id, userId);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount(Principal principal) {
        UUID userId = UUID.fromString(principal.getName());
        long count = notificationService.countUnreadNotifications(userId);
        return ResponseEntity.ok(count);
    }
}