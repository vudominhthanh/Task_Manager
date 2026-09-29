package Task_Manager.task_service.mapper;

import Task_Manager.task_service.dto.CommentEventDto;
import Task_Manager.task_service.dto.CommentRequest;
import Task_Manager.task_service.dto.CommentResponse;
import Task_Manager.task_service.entity.Comment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface CommentMapper {
    @Mapping(source = "taskId", target = "taskId")
    @Mapping(source = "parentComment.id", target = "parentCommentId")
    CommentResponse toResponse(Comment comment);

    @Mapping(target = "id", ignore = true)
    @Mapping(source = "request.content", target = "content")
    @Mapping(source = "taskId", target = "taskId")
    @Mapping(source = "projectId", target = "projectId")
    @Mapping(source = "userId", target = "userId")
    @Mapping(source = "parentComment", target = "parentComment")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    Comment toEntity(CommentRequest request, UUID taskId, UUID projectId, UUID userId, Comment parentComment);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "taskId", ignore = true)
    @Mapping(target = "projectId", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "parentComment", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "updatedBy", ignore = true)
    void updateEntityFromRequest(CommentRequest request, @MappingTarget Comment comment);

    @Mapping(target = "eventType", source = "eventType")
    @Mapping(target = "commentId", source = "commentId")
    @Mapping(target = "projectId", source = "projectId")
    @Mapping(target = "taskId", source = "taskId")
    @Mapping(target = "comment", source = "comment")
    @Mapping(target = "createdBy", source = "createdBy")
    @Mapping(target = "updatedBy", source = "updatedBy")
    @Mapping(target = "deletedBy", source = "deletedBy")
    @Mapping(target = "recipientId", source = "recipientId")
    @Mapping(target = "targetName", source = "targetName")
    @Mapping(target = "username", source = "username")
    @Mapping(target = "userAvatar", source = "userAvatar")
    CommentEventDto toEventDto(String eventType, UUID commentId, UUID projectId, UUID taskId, UUID createdBy, UUID updatedBy, UUID deletedBy, UUID recipientId, String username, String userAvatar, String targetName, CommentResponse comment);

    default CommentEventDto toCommentCreatedEvent(UUID taskId, UUID projectId, String taskTitle, UUID fallbackProjectId, CommentResponse comment, UUID userId, UUID recipientId) {
        String username = (comment.getUserName() != null && !comment.getUserName().trim().isEmpty()) ? comment.getUserName() : "Thành viên";
        String userAvatar = (comment.getUserAvatar() != null && !comment.getUserAvatar().trim().isEmpty()) ? comment.getUserAvatar() : "U";

        UUID finalProjectId = (projectId != null) ? projectId : fallbackProjectId;
        String targetName = (taskTitle != null && !taskTitle.trim().isEmpty()) ? taskTitle : "Dự án";

        return toEventDto("COMMENT_CREATED", comment.getId(), finalProjectId, taskId, userId, null, null, recipientId, username, userAvatar, targetName, comment);
    }

    default CommentEventDto toCommentUpdatedEvent(UUID taskId, UUID projectId, UUID fallbackProjectId, CommentResponse comment, UUID userId, String targetNameStr) {
        String username = (comment.getUserName() != null && !comment.getUserName().trim().isEmpty()) ? comment.getUserName() : "Thành viên";
        String userAvatar = (comment.getUserAvatar() != null && !comment.getUserAvatar().trim().isEmpty()) ? comment.getUserAvatar() : "U";

        UUID finalProjectId = (projectId != null) ? projectId : fallbackProjectId;
        String targetName = (targetNameStr != null) ? targetNameStr : "Dự án";

        return toEventDto("COMMENT_UPDATED", comment.getId(), finalProjectId, taskId, null, userId, null, null, username, userAvatar, targetName, comment);
    }

    default CommentEventDto toCommentDeletedEvent(UUID taskId, UUID projectId, UUID fallbackProjectId, UUID commentId, UUID userId) {
        UUID finalProjectId = (projectId != null) ? projectId : fallbackProjectId;
        return toEventDto("COMMENT_DELETED", commentId, finalProjectId, taskId, null, null, userId, null, null, null, "Bình luận", null);
    }
}

