package Task_Manager.activity_service.controller;

import Task_Manager.activity_service.entity.Activity;
import Task_Manager.activity_service.repository.ActivityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {
    private final ActivityRepository activityRepository;

    @GetMapping("/{targetId}")
    public ResponseEntity<List<Activity>> getActivities(@PathVariable String targetId) {
        return ResponseEntity.ok(activityRepository.findByTargetIdOrderByCreatedAtDesc(targetId));
    }
}
