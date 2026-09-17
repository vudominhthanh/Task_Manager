package Task_Manager.task_service.controller;

import Task_Manager.task_service.dto.StorageConfigDto;
import Task_Manager.task_service.service.SystemConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/configs")
@RequiredArgsConstructor
public class SystemConfigController {

    private final SystemConfigService configService;

    @GetMapping
    public ResponseEntity<StorageConfigDto> getConfig() {
        return ResponseEntity.ok(configService.getStorageConfig());
    }

    @PutMapping
    public ResponseEntity<StorageConfigDto> updateConfig(
            @RequestBody StorageConfigDto request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        boolean isSystemAdmin = userDetails != null && userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_SYS_AD") || role.equals("ROLE_ADMIN") || role.equals("SYS_AD"));

        return ResponseEntity.ok(configService.updateStorageConfig(request, isSystemAdmin));
    }
}