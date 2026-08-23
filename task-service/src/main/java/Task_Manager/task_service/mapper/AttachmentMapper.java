package Task_Manager.task_service.mapper;

import Task_Manager.task_service.dto.AttachmentRequest;
import Task_Manager.task_service.dto.AttachmentResponse;
import Task_Manager.task_service.entity.Attachment;
import Task_Manager.task_service.entity.Task;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface AttachmentMapper {
    @Mapping(source = "task.id", target = "taskId")
    AttachmentResponse toResponse(Attachment attachment);

    @Mapping(source = "task", target = "task")
    @Mapping(source = "userId", target = "userId")
    @Mapping(source = "request.fileName", target = "fileName")
    @Mapping(source = "request.fileType", target = "fileType")
    @Mapping(source = "request.fileSize", target = "fileSize")
    @Mapping(source = "request.s3Key", target = "s3Key")
    @Mapping(target = "id", ignore = true)
    Attachment toEntity(AttachmentRequest request, Task task, UUID userId);
}
