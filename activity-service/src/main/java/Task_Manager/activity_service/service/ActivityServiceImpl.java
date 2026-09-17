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
import Task_Manager.activity_service.specification.ActivitySpecification;
import Task_Manager.common_lib.exception.BusinessRuleException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.utils.Translator;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityServiceImpl implements ActivityService {

    private final ActivityRepository activityRepository;
    private final ActivityMapper activityMapper;
    private final ProjectClient projectClient;
    private final TaskClient taskClient;

    @Override
    public void createActivityLog(ActivityEvent event) {
        if (event == null) {
            throw new BusinessRuleException(Translator.toLocale("error.activity.event_null"));
        }
        if (event.getTargetType() == null || event.getTargetType().trim().isEmpty()) {
            throw new BusinessRuleException(Translator.toLocale("error.activity.target_type_required"));
        }
        if (event.getTargetId() == null || event.getTargetId().trim().isEmpty()) {
            throw new BusinessRuleException(Translator.toLocale("error.activity.target_id_required"));
        }
        Activity activity = activityMapper.toEntity(event);
        activityRepository.save(activity);
    }

    @Override
    public List<ActivityResponse.Group> getGroupedActivities(String search, String project) {
        List<Activity> activities = activityRepository.findByOrderByCreatedAtDesc();
        List<ActivityResponse.Item> items = mapAndEnrichActivities(activities);
        List<ActivityResponse.Item> filteredItems = filterItems(items, search, project);
        return groupItemsByDate(filteredItems);
    }

    @Override
    public List<ActivityResponse.Item> getRecentActivitiesByUserId(UUID userId) {
        List<Activity> activities = activityRepository.findTop5ByUserIdOrderByCreatedAtDesc(userId.toString());
        return mapAndEnrichActivities(activities);
    }

    @Override
    public List<ActivityResponse.Group> getActivitiesByProjectId(String projectId) {
        List<Activity> activities = activityRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        List<ActivityResponse.Item> items = mapAndEnrichActivities(activities);
        return groupItemsByDate(items);
    }

    @Override
    public List<ActivityResponse.Item> getActivitiesByTaskId(UUID taskId) {
        List<Activity> activities = activityRepository.findByTargetIdOrderByCreatedAtDesc(taskId.toString());
        return mapAndEnrichActivities(activities);
    }

    @Override
    public List<ActivityResponse.Group> getGroupedActivities(String search, String project, UUID userId) {
        List<String> userProjectIds = Collections.emptyList();
        if (userId != null) {
            try {
                List<UUID> ids = projectClient.getMyProjectIds();
                if (ids != null && !ids.isEmpty()) {
                    userProjectIds = ids.stream()
                            .map(UUID::toString)
                            .collect(Collectors.toList());
                }
            } catch (Exception e) {
                log.warn("Không thể lấy danh sách projectIds của user {}: {}", userId, e.getMessage());
            }
        }
        Specification<Activity> spec = ActivitySpecification.filterActivities(search, project, userId, userProjectIds);
        List<Activity> activities = activityRepository.findAll(spec);
        List<ActivityResponse.Item> items = mapAndEnrichActivities(activities);
        return groupItemsByDate(items);
    }



    private List<ActivityResponse.Item> mapAndEnrichActivities(List<Activity> activities) {
        if (activities == null || activities.isEmpty()) return Collections.emptyList();

        List<ActivityResponse.Item> items = activities.stream()
                .map(activityMapper::toItem)
                .collect(Collectors.toList());

        enrichProjectNames(items);
        enrichTaskNames(items);

        return items;
    }

    private void enrichProjectNames(List<ActivityResponse.Item> items) {
        Set<UUID> projectIds = items.stream()
                .map(item -> parseUUID(item.getProject()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (projectIds.isEmpty()) return;

        try {
            List<ProjectDto> projects = projectClient.getProjectsByIds(new ArrayList<>(projectIds));
            Map<UUID, String> projectNameMap = projects.stream()
                    .collect(Collectors.toMap(ProjectDto::getId, ProjectDto::getName, (e, r) -> e));

            items.forEach(item -> {
                UUID pId = parseUUID(item.getProject());
                if (pId != null && projectNameMap.containsKey(pId)) {
                    item.setProject(projectNameMap.get(pId));
                }
            });
        } catch (Exception e) {
            log.warn("Không thể lấy tên dự án hàng loạt: {}", e.getMessage());
        }
    }

    private void enrichTaskNames(List<ActivityResponse.Item> items) {
        Set<UUID> taskIds = items.stream()
                .filter(item -> "TASK".equalsIgnoreCase(item.getTargetType()))
                .map(item -> parseUUID(item.getTarget()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (taskIds.isEmpty()) return;

        try {
            List<TaskDto> tasks = taskClient.getTasksByIds(new ArrayList<>(taskIds));
            Map<UUID, String> taskNameMap = tasks.stream()
                    .collect(Collectors.toMap(TaskDto::getId, TaskDto::getTitle, (e, r) -> e));

            items.forEach(item -> {
                if ("TASK".equalsIgnoreCase(item.getTargetType())) {
                    UUID tId = parseUUID(item.getTarget());
                    if (tId != null && taskNameMap.containsKey(tId)) {
                        item.setTarget(taskNameMap.get(tId));
                    }
                }
            });
        } catch (Exception e) {
            log.warn("Không thể lấy tên task hàng loạt: {}", e.getMessage());
        }
    }

    private List<ActivityResponse.Item> filterItems(List<ActivityResponse.Item> items, String search, String project) {
        return items.stream().filter(item -> {
            if (search != null && !search.trim().isEmpty()) {
                String searchLower = search.trim().toLowerCase();
                boolean matchUser = item.getUser() != null && item.getUser().toLowerCase().contains(searchLower);
                boolean matchTarget = item.getTarget() != null && item.getTarget().toLowerCase().contains(searchLower);
                if (!matchUser && !matchTarget) return false;
            }
            if (project != null && !project.trim().isEmpty() && !project.equalsIgnoreCase("Tất cả dự án")) {
                if (item.getProject() == null || !item.getProject().equalsIgnoreCase(project)) {
                    return false;
                }
            }
            return true;
        }).collect(Collectors.toList());
    }

    private List<ActivityResponse.Group> groupItemsByDate(List<ActivityResponse.Item> items) {
        Map<String, List<ActivityResponse.Item>> groupedMap = items.stream()
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

    private UUID parseUUID(String uuidString) {
        if (uuidString == null || uuidString.trim().isEmpty()) return null;
        try {
            return UUID.fromString(uuidString);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}