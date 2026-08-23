package Task_Manager.task_service.dto;

import Task_Manager.task_service.entity.TaskPriority;
import Task_Manager.task_service.entity.TaskStatus;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class TaskRequest {
    private UUID projectId;
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private UUID reporterId;
    private UUID assigneeId;
    private LocalDate startDate;
    private LocalDate dueDate;
}
