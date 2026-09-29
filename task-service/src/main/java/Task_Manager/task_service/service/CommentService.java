package Task_Manager.task_service.service;

import Task_Manager.task_service.dto.CommentRequest;
import Task_Manager.task_service.dto.CommentResponse;

import java.util.List;
import java.util.UUID;

public interface CommentService {
    CommentResponse addComment(UUID taskId, UUID userId, CommentRequest request);

    CommentResponse updateComment(UUID commentId, UUID userId, CommentRequest request);

    void deleteComment(UUID commentId, UUID userId);

    List<CommentResponse> getCommentByTaskId(UUID taskId);

    CommentResponse getCommentById(UUID commentId);

    List<CommentResponse> getCommentsByProjectId(UUID projectId);

    CommentResponse addProjectComment(UUID projectId, UUID userId, CommentRequest request);
}