package Task_Manager.report_service.service;

import Task_Manager.report_service.client.ActivityClient;
import Task_Manager.report_service.client.ProjectClient;
import Task_Manager.report_service.client.TaskClient;
import Task_Manager.report_service.dto.*;
import Task_Manager.report_service.entity.ProjectStatic;
import Task_Manager.report_service.mapper.ReportMapper;
import Task_Manager.report_service.repository.ProjectStaticRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ProjectClient projectClient;
    private final TaskClient taskClient;
    private final ActivityClient activityClient;
    private final ProjectStaticRepository projectStaticRepository;
    private final ReportMapper reportMapper;

    private List<ReportResponse.TaskDto> fetchTasksForProjects(List<UUID> projectIds) {
        return projectIds.stream()
                .flatMap(pid -> {
                    try {
                        return taskClient.getTasksByProjectId(pid).stream();
                    } catch (Exception e) {
                        log.error("Lỗi khi fetch task cho project {}: {}", pid, e.getMessage());
                        return java.util.stream.Stream.empty();
                    }
                })
                .collect(Collectors.toList());
    }

    public OverViewResponse getUserOverview(UUID userId) {
        List<UUID> userProjectIds = projectClient.getProjectIdsByUserId();
        List<ReportResponse.TaskDto> allTasks = fetchTasksForProjects(userProjectIds);

        long totalProjects = userProjectIds.size();

        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        long completedThisWeek = allTasks.stream()
                .filter(t -> userId.equals(t.getAssigneeId()))
                .filter(t -> "DONE".equals(t.getStatus()) || "COMPLETED".equals(t.getStatus()))
                .filter(t -> t.getUpdatedAt() != null && t.getUpdatedAt().isAfter(sevenDaysAgo))
                .count();

        LocalDate today = LocalDate.now();
        long overdueTasks = allTasks.stream()
                .filter(t -> userId.equals(t.getAssigneeId()))
                .filter(t -> !("DONE".equals(t.getStatus()) || "COMPLETED".equals(t.getStatus())))
                .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(today))
                .count();

        OverViewResponse.Stats stats = OverViewResponse.Stats.builder()
                .activeProjects(new OverViewResponse.Metric(String.valueOf(totalProjects), "Đang chạy"))
                .completedThisWeek(new OverViewResponse.Metric(String.valueOf(completedThisWeek), "7 ngày qua"))
                .overdueTasks(new OverViewResponse.Metric(String.valueOf(overdueTasks), "Cần xử lý"))
                .build();

        List<OverViewResponse.QuickProject> quickProjects = new ArrayList<>();
        if (!userProjectIds.isEmpty()) {
            List<ReportResponse.ProjectDropdownDto> projectsData = projectClient.getProjectsByIds(userProjectIds);
            for (ReportResponse.ProjectDropdownDto p : projectsData) {
                ProjectStatic stat = projectStaticRepository.findById(p.getId())
                        .orElse(new ProjectStatic());

                OverViewResponse.QuickProject qp = reportMapper.toQuickProject(p, stat.getCompletionRate());
                quickProjects.add(qp);
            }
        }

        List<OverViewResponse.ActivityDto> activities = activityClient.getRecentActivitiesByUserId(userId);

        return OverViewResponse.builder()
                .stats(stats)
                .quickProjects(quickProjects)
                .recentActivities(activities)
                .build();
    }

    public List<ReportResponse.ProjectDropdownDto> getProjectsDropdown() {
        List<UUID> userProjectIds = projectClient.getProjectIdsByUserId();
        if (userProjectIds.isEmpty()) return Collections.emptyList();
        return projectClient.getProjectsByIds(userProjectIds);
    }

    public ReportSummaryResponse getSummary(UUID userId, String projectIdStr) {
        List<UUID> targetProjectIds = resolveTargetProjects(projectIdStr);
        List<ReportResponse.TaskDto> tasks = fetchTasksForProjects(targetProjectIds);

        List<ReportResponse.TaskDto> parentTasks = tasks.stream()
                .filter(t -> t.getParentTaskId() == null)
                .toList();

        int inProgress = (int) parentTasks.stream().filter(t -> "IN_PROGRESS".equals(t.getStatus())).count();
        int todo = (int) parentTasks.stream().filter(t -> "TO_DO".equals(t.getStatus())).count();
        int review = (int) parentTasks.stream().filter(t -> "REVIEW".equals(t.getStatus())).count();
        int done = (int) parentTasks.stream().filter(t -> "DONE".equals(t.getStatus()) || "COMPLETED".equals(t.getStatus())).count();

        LocalDate today = LocalDate.now();
        int overdue = (int) parentTasks.stream()
                .filter(t -> !("DONE".equals(t.getStatus()) || "COMPLETED".equals(t.getStatus())))
                .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(today))
                .count();

        BigDecimal completionRate = BigDecimal.ZERO;
        if (!parentTasks.isEmpty()) {
            completionRate = BigDecimal.valueOf((double) done * 100 / parentTasks.size())
                    .setScale(2, RoundingMode.HALF_UP);
        }

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

    public List<PerformanceChartDto> getPerformanceChart(String projectIdStr) {
        List<UUID> targetProjectIds = resolveTargetProjects(projectIdStr);
        List<ReportResponse.TaskDto> tasks = fetchTasksForProjects(targetProjectIds);

        Map<LocalDate, PerformanceChartDto> chartMap = new TreeMap<>();
        LocalDate today = LocalDate.now();

        for (int i = 29; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            chartMap.put(d, new PerformanceChartDto(d.format(DateTimeFormatter.ofPattern("dd/MM")), 0, 0));
        }

        for (ReportResponse.TaskDto task : tasks) {
            if (task.getCreatedAt() != null) {
                LocalDate createdDate = task.getCreatedAt().toLocalDate();
                if (chartMap.containsKey(createdDate)) {
                    chartMap.get(createdDate).setNewTasks(chartMap.get(createdDate).getNewTasks() + 1);
                }
            }

            if ("DONE".equals(task.getStatus()) && task.getUpdatedAt() != null) {
                LocalDate updatedDate = task.getUpdatedAt().toLocalDate();
                if (chartMap.containsKey(updatedDate)) {
                    chartMap.get(updatedDate).setCompleted(chartMap.get(updatedDate).getCompleted() + 1);
                }
            }
        }

        return new ArrayList<>(chartMap.values());
    }

    public List<TeamPerformanceDto> getTeamPerformance(String projectIdStr) {
        List<UUID> targetProjectIds = resolveTargetProjects(projectIdStr);
        List<ReportResponse.ProjectMemberDto> members;

        if ("all".equalsIgnoreCase(projectIdStr) || projectIdStr == null) {
            members = projectClient.getMyProjectsMembers();
        } else {
            members = projectClient.getProjectMembers(UUID.fromString(projectIdStr));
        }

        Map<UUID, ReportResponse.ProjectMemberDto> uniqueMembers = new HashMap<>();
        for (ReportResponse.ProjectMemberDto m : members) {
            uniqueMembers.putIfAbsent(m.getUserId(), m);
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
            int done = (int) userTasks.stream().filter(t -> "DONE".equals(t.getStatus())).count();
            int overdue = (int) userTasks.stream()
                    .filter(t -> !"DONE".equals(t.getStatus()))
                    .filter(t -> t.getDueDate() != null && t.getDueDate().isBefore(today))
                    .count();

            int efficiency = total == 0 ? 0 : (done * 100 / total);

            String avatarChar = (member.getFullName() != null && !member.getFullName().isEmpty())
                    ? member.getFullName().substring(0, 1).toUpperCase()
                    : "U";

            result.add(TeamPerformanceDto.builder()
                    .id(uId)
                    .name(member.getFullName())
                    .role(member.getRole())
                    .avatar(avatarChar)
                    .total(total)
                    .done(done)
                    .overdue(overdue)
                    .efficiency(efficiency)
                    .build());
        }

        result.sort((a, b) -> Integer.compare(b.getEfficiency(), a.getEfficiency()));
        return result;
    }

    private List<UUID> resolveTargetProjects(String projectIdStr) {
        if (projectIdStr == null || "all".equalsIgnoreCase(projectIdStr)) {
            return projectClient.getProjectIdsByUserId();
        }
        return Collections.singletonList(UUID.fromString(projectIdStr));
    }

    private BigDecimal calculateAverageCompletion(List<UUID> projectIds) {
        if (projectIds.isEmpty()) return BigDecimal.ZERO;

        List<ProjectStatic> stats = projectStaticRepository.findAllById(projectIds);
        if (stats.isEmpty()) return BigDecimal.ZERO;

        BigDecimal sum = stats.stream()
                .map(ProjectStatic::getCompletionRate)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return sum.divide(new BigDecimal(stats.size()), 2, RoundingMode.HALF_UP);
    }

    public void initProjectStatistic(UUID projectId) {
        if (!projectStaticRepository.existsById(projectId)) {
            projectStaticRepository.save(ProjectStatic.builder().projectId(projectId).build());
        }
    }

    public void deleteProjectStatistic(UUID projectId) {
        projectStaticRepository.deleteById(projectId);
    }

    public void handleTaskStatusChange(UUID projectId, String oldStatus, String newStatus, boolean isNewTask) {
        if (projectId == null) return;

        List<ReportResponse.TaskDto> tasks = taskClient.getTasksByProjectId(projectId);

        List<ReportResponse.TaskDto> parentTasks = tasks.stream()
                .filter(t -> t.getParentTaskId() == null)
                .toList();

        int totalTasks = parentTasks.size();
        int todo = (int) parentTasks.stream().filter(t -> "TO_DO".equals(t.getStatus())).count();
        int inProgress = (int) parentTasks.stream().filter(t -> "IN_PROGRESS".equals(t.getStatus())).count();
        int review = (int) parentTasks.stream().filter(t -> "REVIEW".equals(t.getStatus())).count();
        int done = (int) parentTasks.stream().filter(t -> "DONE".equals(t.getStatus()) || "COMPLETED".equals(t.getStatus())).count();

        BigDecimal completionRate = BigDecimal.ZERO;
        if (totalTasks > 0) {
            completionRate = BigDecimal.valueOf((double) done * 100 / totalTasks)
                    .setScale(2, RoundingMode.HALF_UP);
        }

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
        log.info("Đã cập nhật project_statistics cho dự án {}: Total={}, Done={}, Rate={}%",
                projectId, totalTasks, done, completionRate);
    }

    public void handleTaskDeleted(UUID projectId, String status) {
        if (projectId == null) return;

        List<ReportResponse.TaskDto> tasks = taskClient.getTasksByProjectId(projectId);

        List<ReportResponse.TaskDto> parentTasks = tasks.stream()
                .filter(t -> t.getParentTaskId() == null)
                .toList();

        int totalTasks = parentTasks.size();
        int todo = (int) parentTasks.stream().filter(t -> "TO_DO".equals(t.getStatus())).count();
        int inProgress = (int) parentTasks.stream().filter(t -> "IN_PROGRESS".equals(t.getStatus())).count();
        int review = (int) parentTasks.stream().filter(t -> "REVIEW".equals(t.getStatus())).count();
        int done = (int) parentTasks.stream().filter(t -> "DONE".equals(t.getStatus()) || "COMPLETED".equals(t.getStatus())).count();

        BigDecimal completionRate = BigDecimal.ZERO;
        if (totalTasks > 0) {
            completionRate = BigDecimal.valueOf((double) done * 100 / totalTasks)
                    .setScale(2, RoundingMode.HALF_UP);
        }

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
        log.info("Đã cập nhật lại project_statistics sau khi xóa task cho dự án {}: Total={}, Done={}, Rate={}%",
                projectId, totalTasks, done, completionRate);
    }
}