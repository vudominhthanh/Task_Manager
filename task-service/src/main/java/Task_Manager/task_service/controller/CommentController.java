package Task_Manager.task_service.controller;

import Task_Manager.common_lib.constant.ProjectPermissions;
import Task_Manager.task_service.dto.CommentRequest;
import Task_Manager.task_service.dto.CommentResponse;
import Task_Manager.task_service.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;

    // 1. NHÓM API CHO TASK CHAT
    @PreAuthorize("@taskSecurity.hasTaskPermission(#taskId, T(Task_Manager.common_lib.constant.ProjectPermissions).COMMENT_VIEW)")
    @GetMapping("/tasks/{taskId}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(@PathVariable("taskId") UUID taskId){
        return ResponseEntity.ok(commentService.getCommentByTaskId(taskId));
    }

    @PreAuthorize("@taskSecurity.hasTaskPermission(#taskId, T(Task_Manager.common_lib.constant.ProjectPermissions).COMMENT_VIEW)")
    @GetMapping("/tasks/{taskId}/comments/{commentId}")
    public ResponseEntity<CommentResponse> getCommentById(@PathVariable("taskId") UUID taskId, @PathVariable("commentId") UUID commentId){
        return ResponseEntity.ok(commentService.getCommentById(commentId));
    }

    @PreAuthorize("@taskSecurity.hasTaskPermission(#taskId, T(Task_Manager.common_lib.constant.ProjectPermissions).COMMENT_CREATE)")
    @PostMapping("/tasks/{taskId}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable UUID taskId,
            @RequestBody CommentRequest commentRequest,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(commentService.addComment(taskId, userId, commentRequest));
    }

    @PreAuthorize("@taskSecurity.hasTaskPermission(#taskId, T(Task_Manager.common_lib.constant.ProjectPermissions).COMMENT_UPDATE_OWN)")
    @PutMapping("/tasks/{taskId}/comments/{commentId}")
    public ResponseEntity<CommentResponse> updateComment(
            @PathVariable UUID taskId,
            @PathVariable UUID commentId,
            @RequestBody CommentRequest commentRequest,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(commentService.updateComment(commentId, userId, commentRequest));
    }

    @PreAuthorize("@taskSecurity.hasTaskPermission(#taskId, T(Task_Manager.common_lib.constant.ProjectPermissions).COMMENT_DELETE_OWN) " +
            "or @taskSecurity.hasTaskPermission(#taskId, T(Task_Manager.common_lib.constant.ProjectPermissions).COMMENT_DELETE_ANY)")
    @DeleteMapping("/tasks/{taskId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID taskId,
            @PathVariable UUID commentId,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        commentService.deleteComment(commentId, userId);
        return ResponseEntity.noContent().build();
    }

    // 2. NHÓM API CHO PROJECT CHAT
    @PreAuthorize("@taskSecurity.hasProjectPermission(#projectId, T(Task_Manager.common_lib.constant.ProjectPermissions).PROJECT_VIEW)")
    @GetMapping("/projects/{projectId}/chats")
    public ResponseEntity<List<CommentResponse>> getProjectChats(@PathVariable UUID projectId) {
        return ResponseEntity.ok(commentService.getCommentsByProjectId(projectId));
    }

    @PreAuthorize("@taskSecurity.hasProjectPermission(#projectId, T(Task_Manager.common_lib.constant.ProjectPermissions).PROJECT_VIEW)")
    @PostMapping("/projects/{projectId}/chats")
    public ResponseEntity<CommentResponse> addProjectChat(
            @PathVariable UUID projectId,
            @RequestBody CommentRequest request,
            Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(commentService.addProjectComment(projectId, userId, request));
    }
}