package Task_Manager.activity_service.service;

import Task_Manager.activity_service.client.ProjectClient;
import Task_Manager.activity_service.client.TaskClient;
import Task_Manager.activity_service.dto.ActivityEvent;
import Task_Manager.activity_service.dto.ActivityResponse;
import Task_Manager.activity_service.dto.ProjectDto;
import Task_Manager.activity_service.dto.TaskDto;
import Task_Manager.activity_service.entity.Activity;
import Task_Manager.activity_service.mapper.ActivityMapper;
import Task_Manager.activity_service.repository.ActivityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityService {
    private final ActivityRepository activityRepository;
    private final ActivityMapper activityMapper;
    private final ProjectClient projectClient;
    private final TaskClient taskClient;

    public void createActivityLog(ActivityEvent event) {
        Activity activity = activityMapper.toEntity(event);
        activityRepository.save(activity);
        log.info("Saved activity log for {} - ID: {}", event.getTargetType(), event.getTargetId());
    }

    public List<ActivityResponse.Group> getGroupedActivities(String search, String project) {
        List<Activity> activities = activityRepository.findByOrderByCreatedAtDesc();

        List<ActivityResponse.Item> items = activities.stream()
                .map(activityMapper::toItem)
                .collect(Collectors.toList());

        Set<UUID> projectIds = items.stream()
                .map(item -> {
                    try {
                        return item.getProject() != null ? UUID.fromString(item.getProject()) : null;
                    } catch (IllegalArgumentException e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, String> projectNameMap = new HashMap<>();
        if (!projectIds.isEmpty()) {
            try {
                List<ProjectDto> projects = projectClient.getProjectsByIds(new ArrayList<>(projectIds));
                projectNameMap = projects.stream()
                        .collect(Collectors.toMap(ProjectDto::getId, ProjectDto::getName, (e, r) -> e));
            } catch (Exception e) {
                log.warn("Không thể lấy tên dự án hàng loạt: {}", e.getMessage());
            }
        }

        Set<UUID> taskIds = items.stream()
                .filter(item -> "TASK".equalsIgnoreCase(item.getTargetType()) && item.getTarget() != null)
                .map(item -> {
                    try {
                        return UUID.fromString(item.getTarget());
                    } catch (IllegalArgumentException e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, String> taskNameMap = new HashMap<>();
        if (!taskIds.isEmpty()) {
            try {
                List<TaskDto> tasks = taskClient.getTasksByIds(new ArrayList<>(taskIds));
                taskNameMap = tasks.stream()
                        .collect(Collectors.toMap(TaskDto::getId, TaskDto::getTitle, (e, r) -> e));
            } catch (Exception e) {
                log.warn("Không thể lấy tên task hàng loạt: {}", e.getMessage());
            }
        }

        Map<UUID, String> finalProjectNameMap = projectNameMap;
        Map<UUID, String> finalTaskNameMap = taskNameMap;

        List<ActivityResponse.Item> filteredItems = items.stream().map(item -> {
            if (item.getProject() != null) {
                try {
                    UUID pId = UUID.fromString(item.getProject());
                    if (finalProjectNameMap.containsKey(pId)) {
                        item.setProject(finalProjectNameMap.get(pId));
                    }
                } catch (IllegalArgumentException ignored) {}
            }

            if ("TASK".equalsIgnoreCase(item.getTargetType()) && item.getTarget() != null) {
                try {
                    UUID tId = UUID.fromString(item.getTarget());
                    if (finalTaskNameMap.containsKey(tId)) {
                        item.setTarget(finalTaskNameMap.get(tId));
                    }
                } catch (IllegalArgumentException ignored) {}
            }

            return item;
        }).filter(item -> {
            if (search != null && !search.trim().isEmpty()) {
                boolean matchUser = item.getUser() != null && item.getUser().toLowerCase().contains(search.toLowerCase());
                boolean matchTarget = item.getTarget() != null && item.getTarget().toLowerCase().contains(search.toLowerCase());
                if (!matchUser && !matchTarget) return false;
            }
            if (project != null && !project.isEmpty() && !project.equals("Tất cả dự án")) {
                if (item.getProject() == null || !item.getProject().equalsIgnoreCase(project)) {
                    return false;
                }
            }
            return true;
        }).collect(Collectors.toList());

        Map<String, List<ActivityResponse.Item>> groupedMap = filteredItems.stream()
                .collect(Collectors.groupingBy(
                        ActivityResponse.Item::getDate,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        long[] idCounter = {1};
        return groupedMap.entrySet().stream()
                .map(entry -> ActivityResponse.Group.builder()
                        .id(idCounter[0]++)
                        .date(entry.getKey())
                        .logs(entry.getValue())
                        .build())
                .collect(Collectors.toList());
    }

    public List<ActivityResponse.Item> getRecentActivitiesByUserId(UUID userId) {
        List<Activity> activities = activityRepository.findTop5ByUserIdOrderByCreatedAtDesc(userId.toString());
        return activities.stream().map(activityMapper::toItem).toList();
    }

    public List<ActivityResponse.Group> getActivitiesByProjectId(String projectId) {
        List<Activity> activities = activityRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        List<ActivityResponse.Item> items = activities.stream().map(activityMapper::toItem).collect(Collectors.toList());
        Map<String, List<ActivityResponse.Item>> groupedMap = items.stream()
                .collect(Collectors.groupingBy(ActivityResponse.Item::getDate, LinkedHashMap::new, Collectors.toList()));
        long[] idCounter = {1};
        return groupedMap.entrySet().stream()
                .map(entry -> ActivityResponse.Group.builder().id(idCounter[0]++).date(entry.getKey()).logs(entry.getValue()).build())
                .collect(Collectors.toList());
    }

    public List<ActivityResponse.Item> getActivitiesByTaskId(UUID taskId) {
        List<Activity> activities = activityRepository.findByTargetIdOrderByCreatedAtDesc(taskId.toString());
        return activities.stream().map(activityMapper::toItem).collect(Collectors.toList());
    }
}