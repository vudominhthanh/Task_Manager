package Task_Manager.task_service.mapper;

import Task_Manager.task_service.dto.TaskEventDto;
import Task_Manager.task_service.dto.TaskRequest;
import Task_Manager.task_service.dto.TaskResponse;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.service.impl.TaskServiceImpl;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.util.UUID;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface TaskMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "TO_DO")
    @Mapping(target = "parentTask", ignore = true)
    @Mapping(target = "subTasks", ignore = true)
    @Mapping(target = "completedAt", ignore = true)
    @Mapping(target = "completionPercentage", ignore = true)
    @Mapping(target = "position", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(source = "projectId", target = "project")
    @Mapping(source = "assigneeId", target = "assignee")
    @Mapping(source = "reporterId", target = "reporter")
    Task toEntity(TaskRequest request);

    @Mapping(source = "project", target = "projectId")
    @Mapping(source = "assignee", target = "assigneeId")
    @Mapping(source = "reporter", target = "reporterId")
    @Mapping(source = "parentTask.id", target = "parentTaskId")
    @Mapping(target = "subTasks", ignore = true)
    @Mapping(target = "contributionPercentage", ignore = true)
    @Mapping(target = "commentCount", ignore = true)
    @Mapping(target = "attachmentCount", ignore = true)
    @Mapping(target = "assigneeName", ignore = true)
    @Mapping(target = "assigneeAvatar", ignore = true)
    @Mapping(target = "reporterName", ignore = true)
    @Mapping(target = "reporterAvatar", ignore = true)
    TaskResponse toResponse(Task task);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "project", ignore = true)
    @Mapping(target = "reporter", ignore = true)
    @Mapping(target = "completedAt", ignore = true)
    @Mapping(target = "parentTask", ignore = true)
    @Mapping(target = "subTasks", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    @Mapping(source = "assigneeId", target = "assignee")
    void updateEntityFromRequest(TaskRequest request, @MappingTarget Task task);

    @Mapping(target = "eventType", source = "eventType")
    @Mapping(target = "taskId", source = "taskId")
    @Mapping(target = "task", source = "task")
    @Mapping(target = "targetName", source = "targetName")
    @Mapping(target = "projectName", source = "projectName")
    @Mapping(target = "createdBy", source = "actor.id")
    @Mapping(target = "username", source = "actor.name")
    @Mapping(target = "userAvatar", source = "actor.avatar")
    @Mapping(target = "projectId", source = "projectIdStr")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "oldStatus", source = "oldStatus")
    TaskEventDto toEventDto(String eventType, UUID taskId, TaskResponse task, String targetName, TaskServiceImpl.ActorInfo actor, String projectName, String projectIdStr, String status, String oldStatus);

    default TaskEventDto toTaskCreatedEvent(TaskResponse task, TaskServiceImpl.ActorInfo actor, String projectName) {
        String title = (task != null && task.getTitle() != null) ? task.getTitle() : "Task";
        String projectIdStr = (task != null && task.getProjectId() != null) ? task.getProjectId().toString() : "";
        return toEventDto("TASK_CREATED", task != null ? task.getId() : null, task, title,
                actor, projectName, projectIdStr, null, null);
    }

    default TaskEventDto toSubTaskCreatedEvent(TaskResponse task, TaskServiceImpl.ActorInfo actor, String projectName) {
        String title = (task != null && task.getTitle() != null) ? task.getTitle() : "Task";
        String projectIdStr = (task != null && task.getProjectId() != null) ? task.getProjectId().toString() : "";
        return toEventDto("SUB_TASK_CREATED", task != null ? task.getId() : null, task, title,
                actor, projectName, projectIdStr, null, null);
    }

    default TaskEventDto toTaskUpdatedEvent(TaskResponse task, TaskServiceImpl.ActorInfo actor, String projectName) {
        String title = (task != null && task.getTitle() != null) ? task.getTitle() : "Task";
        String projectIdStr = (task != null && task.getProjectId() != null) ? task.getProjectId().toString() : "";
        return toEventDto("TASK_UPDATED", task != null ? task.getId() : null, task, title, actor, projectName, projectIdStr, null, null);
    }

    default TaskEventDto toTaskStatusUpdatedEvent(TaskResponse task, TaskServiceImpl.ActorInfo actor, String projectName, UUID projectUuid, String oldStatus) {
        String title = (task != null && task.getTitle() != null) ? task.getTitle() : "Task";
        String projectIdStr = projectUuid != null ? projectUuid.toString() : "";
        return toEventDto("TASK_STATUS_UPDATED", task != null ? task.getId() : null, task, title, actor, projectName, projectIdStr, null, oldStatus != null ? oldStatus : "TO_DO");
    }

    default TaskEventDto toTaskDeletedEvent(Task task, TaskServiceImpl.ActorInfo actor, String projectName) {
        UUID taskId = task != null ? task.getId() : null;
        String title = (task != null && task.getTitle() != null) ? task.getTitle() : "Task";
        String status = (task != null && task.getStatus() != null) ? task.getStatus().name() : "TO_DO";
        String projectIdStr = (task != null && task.getProject() != null) ? task.getProject().toString() : "";
        return toEventDto("TASK_DELETED", taskId, null, title, actor, projectName, projectIdStr, status, null);
    }
}