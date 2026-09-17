package Task_Manager.task_service.service;

import Task_Manager.task_service.dto.CommentRequest;
import Task_Manager.task_service.dto.CommentResponse;

import java.util.List;
import java.util.UUID;

public interface CommentService {
    CommentResponse addComment(UUID taskId, UUID userId, CommentRequest request, boolean isSystemAdmin);

    CommentResponse updateComment(UUID commentId, UUID userId, CommentRequest request, boolean isSystemAdmin);

    void deleteComment(UUID commentId, UUID userId, boolean isSystemAdmin);

    List<CommentResponse> getCommentByTaskId(UUID taskId);

    CommentResponse getCommentById(UUID commentId);
}