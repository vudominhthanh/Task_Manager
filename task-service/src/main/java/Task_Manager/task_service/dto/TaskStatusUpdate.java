package Task_Manager.task_service.dto;

import Task_Manager.task_service.entity.TaskStatus;
import lombok.Data;

@Data
public class TaskStatusUpdate {
    private TaskStatus status;
}
