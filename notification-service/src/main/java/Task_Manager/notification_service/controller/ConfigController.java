package Task_Manager.notification_service.controller;

import Task_Manager.notification_service.Service.EmailConfigService;
import Task_Manager.notification_service.Service.EmailConfigService.SmtpConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/configs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class ConfigController {

    private final EmailConfigService emailConfigService;

    @GetMapping
    public ResponseEntity<SmtpConfig> getConfig() {
        return ResponseEntity.ok(emailConfigService.getCurrentConfig());
    }

    @PutMapping
    public ResponseEntity<SmtpConfig> updateConfig(@RequestBody SmtpConfig newConfig) {
        emailConfigService.updateConfig(newConfig);
        return ResponseEntity.ok(newConfig);
    }
}