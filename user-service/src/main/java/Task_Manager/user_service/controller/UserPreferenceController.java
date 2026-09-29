package Task_Manager.user_service.controller;

import Task_Manager.user_service.dto.UserPreferenceDto;
import Task_Manager.user_service.service.UserPreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/preferences")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserPreferenceController {

    private final UserPreferenceService preferenceService;

    @GetMapping
    public ResponseEntity<UserPreferenceDto> getMyPreferences(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(preferenceService.getMyPreferences(userId));
    }

    @PutMapping
    public ResponseEntity<UserPreferenceDto> updateMyPreferences(
            Principal principal,
            @RequestBody UserPreferenceDto request) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(preferenceService.updatePreferences(userId, request));
    }
}