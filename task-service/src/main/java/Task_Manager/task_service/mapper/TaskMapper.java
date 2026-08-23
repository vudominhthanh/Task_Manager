package Task_Manager.task_service.mapper;

import Task_Manager.task_service.dto.TaskRequest;
import Task_Manager.task_service.dto.TaskResponse;
import Task_Manager.task_service.entity.Task;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface TaskMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "TO_DO")
    @Mapping(target = "parentTask", ignore = true)
    @Mapping(target = "subTasks", ignore = true)
    @Mapping(source = "projectId", target = "project")
    @Mapping(source = "assigneeId", target = "assignee")
    @Mapping(source = "reporterId", target = "reporter")
    Task toEntity(TaskRequest request);

    @Mapping(source = "project", target = "projectId")
    @Mapping(source = "assignee", target = "assigneeId")
    @Mapping(source = "reporter", target = "reporterId")
    @Mapping(source = "parentTask.id", target = "parentTaskId")
    TaskResponse toResponse(Task task);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "project", ignore = true)
    @Mapping(target = "reporter", ignore = true)
    @Mapping(source = "assigneeId", target = "assignee")
    void updateEntityFromRequest(TaskRequest request, @MappingTarget Task task);
}