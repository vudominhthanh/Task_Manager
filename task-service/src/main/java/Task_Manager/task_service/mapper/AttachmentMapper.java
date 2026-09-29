package Task_Manager.task_service.mapper;

import Task_Manager.task_service.dto.AttachmentEventDto;
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

    @Mapping(target = "eventType", source = "eventType")
    @Mapping(target = "attachmentId", source = "attachmentId")
    @Mapping(target = "projectId", source = "projectId")
    @Mapping(target = "taskId", source = "taskId")
    @Mapping(target = "taskTitle", source = "taskTitle")
    @Mapping(target = "createdBy", source = "createdBy")
    @Mapping(target = "deletedBy", source = "deletedBy")
    @Mapping(target = "recipientId", source = "recipientId")
    @Mapping(target = "username", source = "username")
    @Mapping(target = "userAvatar", source = "userAvatar")
    @Mapping(target = "targetName", source = "targetName")
    @Mapping(target = "attachment", source = "attachment")
    AttachmentEventDto toEventDto(String eventType, UUID attachmentId, UUID projectId, UUID taskId,
                                  String taskTitle, UUID createdBy, UUID deletedBy, UUID recipientId,
                                  String username, String userAvatar, String targetName,
                                  AttachmentResponse attachment);

    default AttachmentEventDto toAttachmentCreatedEvent(Task task, AttachmentResponse attachment, UUID userId, UUID recipientId) {
        String username = (attachment.getUserName() != null && !attachment.getUserName().trim().isEmpty()) ? attachment.getUserName() : "Thành viên";
        String userAvatar = (attachment.getUserAvatar() != null && !attachment.getUserAvatar().trim().isEmpty()) ? attachment.getUserAvatar() : "U";
        String targetName = (attachment.getFileName() != null && !attachment.getFileName().trim().isEmpty()) ? attachment.getFileName() : "Tệp đính kèm";
        String taskTitle = (task != null && task.getTitle() != null && !task.getTitle().trim().isEmpty()) ? task.getTitle() : "Công việc";
        UUID projectId = task != null ? task.getProject() : null;
        UUID taskId = task != null ? task.getId() : null;
        return toEventDto("ATTACHMENT_CREATED", attachment.getId(), projectId, taskId, taskTitle, userId, null, recipientId, username, userAvatar, targetName, attachment);
    }

    default AttachmentEventDto toAttachmentDeletedEvent(Task task, Attachment attachment, UUID userId, UUID recipientId) {
        String targetName = (attachment.getFileName() != null && !attachment.getFileName().trim().isEmpty()) ? attachment.getFileName() : "Tệp đính kèm";
        String taskTitle = (task != null && task.getTitle() != null && !task.getTitle().trim().isEmpty()) ? task.getTitle() : "Công việc";
        UUID projectId = task != null ? task.getProject() : null;
        UUID taskId = task != null ? task.getId() : null;

        return toEventDto("ATTACHMENT_DELETED", attachment.getId(), projectId, taskId, taskTitle, null, userId, recipientId, null, null, targetName, null);
    }
}
