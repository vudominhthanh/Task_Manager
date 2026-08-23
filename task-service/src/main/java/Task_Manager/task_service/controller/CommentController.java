package Task_Manager.task_service.controller;

import Task_Manager.task_service.dto.CommentRequest;
import Task_Manager.task_service.dto.CommentResponse;
import Task_Manager.task_service.service.CommentService;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tasks/{taskId}/comments")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;

    @GetMapping
    public ResponseEntity<List<CommentResponse>> getComments(@PathVariable("taskId") UUID taskId){
        return ResponseEntity.ok(commentService.getCommentByTaskId(taskId));
    }

    @GetMapping("/{commentId}")
    public ResponseEntity<CommentResponse> getCommentById(@PathVariable("commentId") UUID commentId){
        return ResponseEntity.ok(commentService.getCommentById(commentId));
    }

    @PostMapping
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable UUID taskId,
            @RequestBody CommentRequest commentRequest,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(commentService.addComment(taskId,userId,commentRequest));
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<CommentResponse> updateComment(
            @PathVariable UUID commentId,
            @RequestBody CommentRequest commentRequest,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(commentService.updateComment(commentId,userId,commentRequest));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID commentId,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        commentService.deleteComment(commentId,userId);
        return ResponseEntity.noContent().build();
    }
}
