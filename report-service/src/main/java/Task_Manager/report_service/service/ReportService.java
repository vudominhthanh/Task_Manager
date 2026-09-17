package Task_Manager.report_service.service;

import Task_Manager.report_service.dto.*;

import java.util.List;
import java.util.UUID;

public interface ReportService {
    OverViewResponse getUserOverview(UUID userId);

    List<ReportResponse.ProjectDropdownDto> getProjectsDropdown();

    ReportSummaryResponse getSummary(UUID userId, String projectIdStr);

    List<PerformanceChartDto> getPerformanceChart(String projectIdStr);

    List<TeamPerformanceDto> getTeamPerformance(String projectIdStr);

    void initProjectStatistic(UUID projectId);

    void deleteProjectStatistic(UUID projectId);

    void handleTaskStatusChange(UUID projectId, String oldStatus, String newStatus, boolean isNewTask);

    void handleTaskDeleted(UUID projectId, String status);
}