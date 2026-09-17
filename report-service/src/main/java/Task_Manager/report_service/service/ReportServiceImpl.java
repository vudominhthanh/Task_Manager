package Task_Manager.report_service.service;

import Task_Manager.report_service.client.ActivityClient;
import Task_Manager.report_service.client.ProjectClient;
import Task_Manager.report_service.client.TaskClient;
import Task_Manager.report_service.dto.*;
import Task_Manager.report_service.entity.ProjectStatic;
import Task_Manager.report_service.mapper.ReportMapper;
import Task_Manager.report_service.repository.ProjectStaticRepository;
import Task_Manager.common_lib.exception.BusinessRuleException;
import Task_Manager.common_lib.utils.Translator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements ReportService {

    private final ProjectClient projectClient;
    private final TaskClient taskClient;
    private final ActivityClient activityClient;
    private final ProjectStaticRepository projectStaticRepository;
    private final ReportMapper reportMapper;

    @Override
    public OverViewResponse getUserOverview(UUID userId) {
        List<UUID> userProjectIds = Collections.emptyList();
        try {
            userProjectIds = projectClient.getProjectIdsByUserId();
            if (userProjectIds == null) userProjectIds = Collections.emptyList();
        } catch (Exception e) {
            log.warn("Không thể lấy projectIds của user {}: {}", userId, e.getMessage());
        }

        List<ReportResponse.TaskDto> myTasks = Collections.emptyList();
        try {
            myTasks = taskClient.getMyAssignedTasks();
            if (myTasks == null) myTasks = Collections.emptyList();
        } catch (Exception e) {
            log.warn("Không thể lấy task cá nhân của user {}: {}", userId, e.getMessage());
        }

        LocalDate today = LocalDate.now();
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);

        long completedThisWeek = myTasks.stream()
                .filter(t -> t.getParentTaskId() == null)
                .filter(this::isTaskDone)
                .filter(t -> {
                    LocalDateTime time = t.getCompletedAt() != null ? t.getCompletedAt()
                            : (t.getUpdatedAt() != null ? t.getUpdatedAt() : t.getCreatedAt());
                    return time != null && time.isAfter(sevenDaysAgo);
                })
                .count();

        long overdueTasks = myTasks.stream()
                .filter(t -> t.getParentTaskId() == null)
                .filter(t -> !isTaskDone(t))
                .filter(t -> isTaskOverdue(t, today))
                .count();

        OverViewResponse.Stats stats = OverViewResponse.Stats.builder()
                .activeProjects(new OverViewResponse.Metric(String.valueOf(userProjectIds.size()), "Đang tham gia"))
                .completedThisWeek(new OverViewResponse.Metric(String.valueOf(completedThisWeek), "7 ngày qua"))
                .overdueTasks(new OverViewResponse.Metric(String.valueOf(overdueTasks), "Cần xử lý"))
                .build();

        List<OverViewResponse.QuickProject> quickProjects = buildQuickProjects(userProjectIds);

        List<OverViewResponse.ActivityDto> activities = Collections.emptyList();
        try {
            activities = activityClient.getRecentActivitiesByUserId(userId);
            if (activities == null) activities = Collections.emptyList();
        } catch (Exception e) {
            log.warn("Không thể lấy recent activities cho user {}: {}", userId, e.getMessage());
        }

        return OverViewResponse.builder()
                .stats(stats)
                .quickProjects(quickProjects)
                .recentActivities(activities)
                .build();
    }

    @Override
    public List<ReportResponse.ProjectDropdownDto> getProjectsDropdown() {
        List<UUID> userProjectIds = projectClient.getProjectIdsByUserId();
        if (userProjectIds == null || userProjectIds.isEmpty()) return Collections.emptyList();
        return projectClient.getProjectsByIds(userProjectIds);
    }

    @Override
    public ReportSummaryResponse getSummary(UUID userId, String projectIdStr) {
        List<UUID> targetProjectIds = resolveTargetProjects(projectIdStr);
        List<ReportResponse.TaskDto> tasks = fetchTasksForProjects(targetProjectIds);

        List<ReportResponse.TaskDto> parentTasks = tasks.stream()
                .filter(t -> t.getParentTaskId() == null)
                .toList();

        int todo = (int) parentTasks.stream().filter(t -> "TO_DO".equalsIgnoreCase(t.getStatus())).count();
        int inProgress = (int) parentTasks.stream().filter(t -> "IN_PROGRESS".equalsIgnoreCase(t.getStatus())).count();
        int review = (int) parentTasks.stream().filter(t -> "REVIEW".equalsIgnoreCase(t.getStatus())).count();
        int done = (int) parentTasks.stream().filter(this::isTaskDone).count();

        LocalDate today = LocalDate.now();
        int overdue = (int) parentTasks.stream()
                .filter(t -> !isTaskDone(t))
                .filter(t -> isTaskOverdue(t, today))
                .count();

        BigDecimal completionRate = calculateCompletionRate(done, parentTasks.size());

        return ReportSummaryResponse.builder()
                .totalProjects(targetProjectIds.size())
                .completionRate(completionRate)
                .inProgressTasks(inProgress)
                .overdueTasks(overdue)
                .todoTasks(todo)
                .reviewTasks(review)
                .doneTasks(done)
                .totalTasks(parentTasks.size())
                .build();
    }

    @Override
    public List<PerformanceChartDto> getPerformanceChart(String projectIdStr) {
        List<UUID> targetProjectIds = resolveTargetProjects(projectIdStr);
        List<ReportResponse.TaskDto> tasks = fetchTasksForProjects(targetProjectIds);

        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(29);

        Map<LocalDate, PerformanceChartDto> chartMap = new LinkedHashMap<>();
        for (int i = 29; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            chartMap.put(d, new PerformanceChartDto(d.format(DateTimeFormatter.ofPattern("dd/MM")), 0, 0));
        }

        List<ReportResponse.TaskDto> parentTasks = tasks.stream()
                .filter(t -> t.getParentTaskId() == null)
                .toList();

        for (ReportResponse.TaskDto task : parentTasks) {
            // 1. Task mới tạo
            if (task.getCreatedAt() != null) {
                LocalDate createdDate = task.getCreatedAt().toLocalDate();
                if (!createdDate.isBefore(startDate) && !createdDate.isAfter(today)) {
                    PerformanceChartDto point = chartMap.get(createdDate);
                    if (point != null) {
                        point.setNewTasks(point.getNewTasks() + 1);
                    }
                }
            }

            // 2. Task hoàn thành (ưu tiên completedAt)
            if (isTaskDone(task)) {
                LocalDateTime completedTime = task.getCompletedAt() != null ? task.getCompletedAt()
                        : (task.getUpdatedAt() != null ? task.getUpdatedAt() : task.getCreatedAt());

                if (completedTime != null) {
                    LocalDate completedDate = completedTime.toLocalDate();
                    if (!completedDate.isBefore(startDate) && !completedDate.isAfter(today)) {
                        PerformanceChartDto point = chartMap.get(completedDate);
                        if (point != null) {
                            point.setCompleted(point.getCompleted() + 1);
                        }
                    }
                }
            }
        }

        return new ArrayList<>(chartMap.values());
    }

    @Override
    public List<TeamPerformanceDto> getTeamPerformance(String projectIdStr) {
        List<UUID> targetProjectIds = resolveTargetProjects(projectIdStr);
        List<ReportResponse.ProjectMemberDto> members;

        if ("all".equalsIgnoreCase(projectIdStr) || projectIdStr == null) {
            members = projectClient.getMyProjectsMembers();
        } else {
            try {
                UUID pId = UUID.fromString(projectIdStr);
                members = projectClient.getProjectMembers(pId);
            } catch (IllegalArgumentException e) {
                throw new BusinessRuleException(Translator.toLocale("error.report.invalid_project_id", projectIdStr));
            }
        }

        Map<UUID, ReportResponse.ProjectMemberDto> uniqueMembers = new HashMap<>();
        if (members != null) {
            for (ReportResponse.ProjectMemberDto m : members) {
                uniqueMembers.putIfAbsent(m.getUserId(), m);
            }
        }

        List<ReportResponse.TaskDto> tasks = fetchTasksForProjects(targetProjectIds);
        LocalDate today = LocalDate.now();
        List<TeamPerformanceDto> result = new ArrayList<>();

        for (ReportResponse.ProjectMemberDto member : uniqueMembers.values()) {
            UUID uId = member.getUserId();
            List<ReportResponse.TaskDto> userTasks = tasks.stream()
                    .filter(t -> uId.equals(t.getAssigneeId()))
                    .toList();

            int total = userTasks.size();
            int done = (int) userTasks.stream().filter(this::isTaskDone).count();
            int overdue = (int) userTasks.stream()
                    .filter(t -> !isTaskDone(t))
                    .filter(t -> isTaskOverdue(t, today))
                    .count();

            int efficiency = total == 0 ? 0 : (done * 100 / total);

            result.add(TeamPerformanceDto.builder()
                    .id(uId)
                    .name(member.getFullName())
                    .role(member.getRole())
                    .avatar(resolveAvatarChar(member.getFullName()))
                    .total(total)
                    .done(done)
                    .overdue(overdue)
                    .efficiency(efficiency)
                    .build());
        }

        result.sort((a, b) -> Integer.compare(b.getEfficiency(), a.getEfficiency()));
        return result;
    }

    @Override
    public void initProjectStatistic(UUID projectId) {
        if (projectId == null) return;
        if (!projectStaticRepository.existsById(projectId)) {
            projectStaticRepository.save(ProjectStatic.builder().projectId(projectId).completionRate(BigDecimal.ZERO).build());
        }
    }

    @Override
    public void deleteProjectStatistic(UUID projectId) {
        if (projectId != null && projectStaticRepository.existsById(projectId)) {
            projectStaticRepository.deleteById(projectId);
        }
    }

    @Override
    public void handleTaskStatusChange(UUID projectId, String oldStatus, String newStatus, boolean isNewTask) {
        recalculateAndSaveProjectStatistic(projectId);
    }

    @Override
    public void handleTaskDeleted(UUID projectId, String status) {
        recalculateAndSaveProjectStatistic(projectId);
    }

    private synchronized void recalculateAndSaveProjectStatistic(UUID projectId) {
        if (projectId == null) return;

        try {
            List<ReportResponse.TaskDto> tasks = taskClient.getTasksByProjectId(projectId);
            if (tasks == null) tasks = Collections.emptyList();

            List<ReportResponse.TaskDto> parentTasks = tasks.stream()
                    .filter(t -> t.getParentTaskId() == null)
                    .toList();

            int totalTasks = parentTasks.size();
            int todo = (int) parentTasks.stream().filter(t -> "TO_DO".equalsIgnoreCase(t.getStatus())).count();
            int inProgress = (int) parentTasks.stream().filter(t -> "IN_PROGRESS".equalsIgnoreCase(t.getStatus())).count();
            int review = (int) parentTasks.stream().filter(t -> "REVIEW".equalsIgnoreCase(t.getStatus())).count();
            int done = (int) parentTasks.stream().filter(this::isTaskDone).count();

            BigDecimal completionRate = calculateCompletionRate(done, totalTasks);

            ProjectStatic stat = projectStaticRepository.findById(projectId)
                    .orElse(ProjectStatic.builder().projectId(projectId).build());

            stat.setTotalTasks(totalTasks);
            stat.setTodoTasks(todo);
            stat.setInProgressTasks(inProgress);
            stat.setReviewTasks(review);
            stat.setDoneTasks(done);
            stat.setCompletionRate(completionRate);
            stat.setLastUpdatedAt(LocalDateTime.now());

            projectStaticRepository.save(stat);
        } catch (Exception e) {
            log.error("[ReportService] Lỗi khi tính toán thống kê cho project {}: {}", projectId, e.getMessage());
        }
    }

    private List<ReportResponse.TaskDto> fetchTasksForProjects(List<UUID> projectIds) {
        if (projectIds == null || projectIds.isEmpty()) return Collections.emptyList();
        return projectIds.stream()
                .flatMap(pid -> {
                    try {
                        List<ReportResponse.TaskDto> tasks = taskClient.getTasksByProjectId(pid);
                        return tasks != null ? tasks.stream() : java.util.stream.Stream.empty();
                    } catch (Exception e) {
                        log.error("Lỗi khi fetch task cho project {}: {}", pid, e.getMessage());
                        return java.util.stream.Stream.empty();
                    }
                })
                .collect(Collectors.toList());
    }

    private List<UUID> resolveTargetProjects(String projectIdStr) {
        if (projectIdStr == null || "all".equalsIgnoreCase(projectIdStr)) {
            List<UUID> ids = projectClient.getProjectIdsByUserId();
            return ids != null ? ids : Collections.emptyList();
        }
        try {
            return Collections.singletonList(UUID.fromString(projectIdStr));
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleException(Translator.toLocale("error.report.invalid_project_id", projectIdStr));
        }
    }

    private List<OverViewResponse.QuickProject> buildQuickProjects(List<UUID> userProjectIds) {
        if (userProjectIds == null || userProjectIds.isEmpty()) return Collections.emptyList();

        List<ReportResponse.ProjectDropdownDto> projectsData = projectClient.getProjectsByIds(userProjectIds);
        if (projectsData == null) return Collections.emptyList();

        List<OverViewResponse.QuickProject> quickProjects = new ArrayList<>();

        for (ReportResponse.ProjectDropdownDto p : projectsData) {
            BigDecimal rate = projectStaticRepository.findById(p.getId())
                    .map(ProjectStatic::getCompletionRate)
                    .orElseGet(() -> {
                        try {
                            List<ReportResponse.TaskDto> tasks = taskClient.getTasksByProjectId(p.getId());
                            if (tasks == null) return BigDecimal.ZERO;
                            int done = (int) tasks.stream().filter(t -> t.getParentTaskId() == null && isTaskDone(t)).count();
                            int total = (int) tasks.stream().filter(t -> t.getParentTaskId() == null).count();
                            return calculateCompletionRate(done, total);
                        } catch (Exception e) {
                            return BigDecimal.ZERO;
                        }
                    });

            quickProjects.add(reportMapper.toQuickProject(p, rate));
        }
        return quickProjects;
    }

    private boolean isTaskDone(ReportResponse.TaskDto t) {
        return "DONE".equalsIgnoreCase(t.getStatus()) || "COMPLETED".equalsIgnoreCase(t.getStatus());
    }

    private boolean isTaskOverdue(ReportResponse.TaskDto t, LocalDate today) {
        return t.getDueDate() != null && t.getDueDate().isBefore(today);
    }

    private BigDecimal calculateCompletionRate(int done, int total) {
        if (total == 0) return BigDecimal.ZERO;
        return BigDecimal.valueOf((double) done * 100 / total).setScale(2, RoundingMode.HALF_UP);
    }

    private String resolveAvatarChar(String fullName) {
        return (fullName != null && !fullName.trim().isEmpty())
                ? fullName.trim().substring(0, 1).toUpperCase()
                : "U";
    }
}