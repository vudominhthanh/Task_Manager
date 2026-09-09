package Task_Manager.report_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "user_performance_stats")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPerformanceStats {
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Builder.Default
    @Column(name = "tasks_assigned")
    private Integer tasksAssigned = 0;

    @Builder.Default
    @Column(name = "tasks_completed_on_time")
    private Integer tasksCompletedOnTime = 0;

    @Builder.Default
    @Column(name = "tasks_overdue")
    private Integer tasksOverdue = 0;
}