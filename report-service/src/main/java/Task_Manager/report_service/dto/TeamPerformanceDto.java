package Task_Manager.report_service.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class TeamPerformanceDto {
    private UUID id;
    private String avatar;
    private String name;
    private String role;
    private int total;
    private int done;
    private int overdue;
    private int efficiency;

    @Builder.Default
    private BigDecimal totalEstimatedEffort = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalActualEffort = BigDecimal.ZERO;
}