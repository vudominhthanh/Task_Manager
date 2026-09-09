package Task_Manager.report_service.controller;

import Task_Manager.report_service.dto.*;
import Task_Manager.report_service.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    private UUID getCurrentUserId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    @GetMapping("/overview/user")
    public ResponseEntity<OverViewResponse> getUserOverview(Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        return ResponseEntity.ok(reportService.getUserOverview(userId));
    }

    @GetMapping("/projects-dropdown")
    public ResponseEntity<List<ReportResponse.ProjectDropdownDto>> getProjectsDropdown() {
        return ResponseEntity.ok(reportService.getProjectsDropdown());
    }

    @GetMapping("/summary")
    public ResponseEntity<ReportSummaryResponse> getSummary(
            @RequestParam(required = false, defaultValue = "all") String projectId,
            Authentication authentication) {
        UUID userId = getCurrentUserId(authentication);
        return ResponseEntity.ok(reportService.getSummary(userId, projectId));
    }

    @GetMapping("/performance-chart")
    public ResponseEntity<List<PerformanceChartDto>> getPerformanceChart(
            @RequestParam(required = false, defaultValue = "all") String projectId) {
        return ResponseEntity.ok(reportService.getPerformanceChart(projectId));
    }

    @GetMapping("/team-performance")
    public ResponseEntity<List<TeamPerformanceDto>> getTeamPerformance(
            @RequestParam(required = false, defaultValue = "all") String projectId) {
        return ResponseEntity.ok(reportService.getTeamPerformance(projectId));
    }
}