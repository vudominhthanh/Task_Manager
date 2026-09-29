package Task_Manager.notification_service.controller;

import Task_Manager.notification_service.Service.NotificationServiceImpl;
import Task_Manager.notification_service.entity.NotificationSetting;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/notifications/settings")
@RequiredArgsConstructor
public class NotificationSettingController {

    private final NotificationServiceImpl notificationService;

    @GetMapping
    public ResponseEntity<NotificationSetting> getMySettings(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(notificationService.getOrCreateUserSetting(userId));
    }

    @PutMapping
    public ResponseEntity<NotificationSetting> updateMySettings(
            @RequestBody NotificationSetting setting,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(notificationService.updateUserNotificationSetting(userId, setting));
    }
}