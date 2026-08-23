package Task_Manager.task_service.service;

import Task_Manager.task_service.dto.CommentRequest;
import Task_Manager.task_service.dto.CommentResponse;
import Task_Manager.task_service.entity.Comment;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.kafka.CommentEventPublisher;
import Task_Manager.task_service.mapper.CommentMapper;
import Task_Manager.task_service.repository.CommentRepository;
import Task_Manager.task_service.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final CommentMapper commentMapper;
    private final CommentEventPublisher commentEventPublisher;

    @Transactional
    public CommentResponse addComment(UUID taskId, UUID userId, CommentRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        Comment parentComment = null;

        if(request.getParentCommentId() != null) {
            parentComment = commentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new RuntimeException("Parent comment not found"));
        }

        Comment comment = commentMapper.toEntity(request,task,userId,parentComment);

        Comment savedComment = commentRepository.save(comment);
        CommentResponse commentResponse = commentMapper.toResponse(savedComment);

        commentEventPublisher.publishCommentCreated(commentResponse);
        return commentResponse;
    }

    @Transactional
    public CommentResponse updateComment(UUID commentId, UUID userId, CommentRequest request) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getUserId().equals(userId)) {
            throw new RuntimeException("You don't have permission to edit this comment");
        }

        commentMapper.updateEntityFromRequest(request,comment);
        Comment updatedComment = commentRepository.save(comment);
        CommentResponse commentResponse = commentMapper.toResponse(updatedComment);

        commentEventPublisher.publishCommentUpdated(commentResponse);
        return commentResponse;
    }

    @Transactional
    public void deleteComment(UUID commentId, UUID userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getUserId().equals(userId)) {
            throw new RuntimeException("You don't have permission to delete this comment");
        }

        commentRepository.deleteById(commentId);
        commentEventPublisher.publishCommentDeleted(commentId);
    }

    public List<CommentResponse> getCommentByTaskId(UUID taskId) {
        return commentRepository.findByTaskId(taskId).stream()
                .map(commentMapper::toResponse)
                .collect(Collectors.toList());
    }

    public CommentResponse getCommentById(UUID commentId) {
        Comment comment =  commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));
        return commentMapper.toResponse(comment);
    }
}
