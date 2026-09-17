package Task_Manager.activity_service.service;

import Task_Manager.activity_service.dto.ActivityEvent;
import Task_Manager.activity_service.dto.ActivityResponse;

import java.util.List;
import java.util.UUID;

public interface ActivityService {
    void createActivityLog(ActivityEvent event);
    List<ActivityResponse.Group> getGroupedActivities(String search, String project, UUID userId);
    List<ActivityResponse.Group> getGroupedActivities(String search, String project);
    List<ActivityResponse.Item> getRecentActivitiesByUserId(UUID userId);
    List<ActivityResponse.Group> getActivitiesByProjectId(String projectId);
    List<ActivityResponse.Item> getActivitiesByTaskId(UUID taskId);
}