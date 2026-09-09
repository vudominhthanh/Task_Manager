package Task_Manager.report_service.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ReportSummaryResponse {
    private int totalProjects;
    private BigDecimal completionRate;
    private int inProgressTasks;
    private int overdueTasks;
    private int todoTasks;
    private int reviewTasks;
    private int doneTasks;
    private int totalTasks;
}