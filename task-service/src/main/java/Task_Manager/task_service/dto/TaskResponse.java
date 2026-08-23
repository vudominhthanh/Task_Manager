package Task_Manager.task_service.dto;

import Task_Manager.task_service.entity.TaskPriority;
import Task_Manager.task_service.entity.TaskStatus;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

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
}
