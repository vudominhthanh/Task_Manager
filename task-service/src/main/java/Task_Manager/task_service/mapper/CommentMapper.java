package Task_Manager.task_service.mapper;

import Task_Manager.task_service.dto.CommentRequest;
import Task_Manager.task_service.dto.CommentResponse;
import Task_Manager.task_service.entity.Comment;
import Task_Manager.task_service.entity.Task;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface CommentMapper {
    @Mapping(source = "task.id", target = "taskId")
    @Mapping(source = "parentComment.id", target = "parentCommentId")
    CommentResponse toResponse(Comment comment);

    @Mapping(source = "task", target = "task")
    @Mapping(source = "userId", target = "userId")
    @Mapping(source = "parentComment", target = "parentComment")
    @Mapping(source = "request.content", target = "content")
    @Mapping(target = "id", ignore = true)
    Comment toEntity(CommentRequest commentRequest, Task task, UUID userId, Comment parentComment);

    @Mapping(source = "content", target = "content")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "task", ignore = true)
    @Mapping(target = "userId", ignore = true)
    @Mapping(target = "parentComment", ignore = true)
    void updateEntityFromRequest(CommentRequest request, @MappingTarget Comment comment);
}
