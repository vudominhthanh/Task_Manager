package Task_Manager.task_service.mapper;

import Task_Manager.task_service.dto.AttachmentResponse;
import Task_Manager.task_service.entity.Attachment;
import Task_Manager.task_service.entity.Task;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface AttachmentMapper {
    @Mapping(source = "task.id", target = "taskId")
    @Mapping(source = "task.project", target = "projectId")
    AttachmentResponse toResponse(Attachment attachment);
}
