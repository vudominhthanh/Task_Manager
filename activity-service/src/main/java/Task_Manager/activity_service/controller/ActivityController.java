package Task_Manager.activity_service.controller;

import Task_Manager.activity_service.dto.ActivityResponse;
import Task_Manager.activity_service.service.ActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {
    private final ActivityService activityService;

    @GetMapping
    public ResponseEntity<List<ActivityResponse.Group>> getActivities(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String project,
            Authentication authentication) {

        boolean isSysAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SYS_AD") || a.getAuthority().equals("SYS_AD"));
        UUID currentUserId = null;
        if (!isSysAdmin && authentication != null) {
            try {
                currentUserId = UUID.fromString(authentication.getName());
            } catch (IllegalArgumentException e) {

            }
        }
        List<ActivityResponse.Group> response = activityService.getGroupedActivities(search, project, currentUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/recent")
    public ResponseEntity<List<ActivityResponse.Item>> getRecentActivities(@RequestParam("userId") UUID userId) {
        List<ActivityResponse.Item> recentActivities = activityService.getRecentActivitiesByUserId(userId);
        return ResponseEntity.ok(recentActivities);
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ActivityResponse.Group>> getActivitiesByProjectId(@PathVariable String projectId) {
        return ResponseEntity.ok(activityService.getActivitiesByProjectId(projectId));
    }

    @GetMapping("/task/{taskId}")
    public ResponseEntity<List<ActivityResponse.Item>> getActivitiesByTaskId(@PathVariable UUID taskId) {
        List<ActivityResponse.Item> activities = activityService.getActivitiesByTaskId(taskId);
        return ResponseEntity.ok(activities);
    }
}
