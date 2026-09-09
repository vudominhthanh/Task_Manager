package Task_Manager.report_service.dto;

import lombok.*;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PerformanceChartDto {
    private String date;
    private int completed;
    private int newTasks;
}