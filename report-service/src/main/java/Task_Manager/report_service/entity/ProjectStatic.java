package Task_Manager.report_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "project_statistics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectStatic {
    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @Builder.Default
    @Column(name = "total_tasks")
    private int totalTasks = 0;

    @Builder.Default
    @Column(name = "todo_tasks")
    private int todoTasks = 0;

    @Builder.Default
    @Column(name = "in_progress_tasks")
    private int inProgressTasks = 0;

    @Builder.Default
    @Column(name = "review_tasks")
    private int reviewTasks = 0;

    @Builder.Default
    @Column(name = "done_tasks")
    private int doneTasks = 0;

    @Builder.Default
    @Column(precision = 5, scale = 2, name = "completion_rate")
    private BigDecimal completionRate = BigDecimal.ZERO;

    @UpdateTimestamp
    @Column(name = "last_updated_at")
    private LocalDateTime lastUpdatedAt;
}