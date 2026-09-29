package Task_Manager.report_service.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class ReportResponse {

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TaskDto {
        private UUID id;
        private UUID projectId;
        private String title;
        private String description;
        private String status;
        private String priority;
        private UUID assigneeId;
        private UUID reporterId;
        private LocalDate startDate;
        private LocalDate dueDate;
        private LocalDateTime completedAt;
        private UUID parentTaskId;

        private BigDecimal estimatedEffort;
        private BigDecimal actualEffort;
        private BigDecimal completionPercentage;
        private Double position;

        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProjectDropdownDto {
        private UUID id;
        private String name;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ProjectMemberDto {
        private UUID projectId;
        private UUID userId;
        private String username;
        private String fullName;
        private String email;
        private String role;
        private String avatar;
    }
}