package Task_Manager.task_service.dto;

import Task_Manager.task_service.entity.TaskPriority;
import Task_Manager.task_service.entity.TaskStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Builder
@Data
public class TaskResponse {
    private UUID id;
    private UUID projectId;
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private UUID assigneeId;
    private UUID reporterId;
    private LocalDate startDate;
    private LocalDate dueDate;
    private UUID parentTaskId;

    @Builder.Default
    private BigDecimal estimatedEffort = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal actualEffort = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal completionPercentage = BigDecimal.ZERO;


    private BigDecimal contributionPercentage;

    private Double position;

    private String assigneeName;
    private String assigneeAvatar;

    private String reporterName;
    private String reporterAvatar;

    private List<TaskResponse> subTasks;

    @Builder.Default
    private int commentCount = 0;

    @Builder.Default
    private int attachmentCount = 0;
}
