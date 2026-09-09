package Task_Manager.task_service.service;

import Task_Manager.task_service.client.ProjectClient;
import Task_Manager.task_service.client.UserClient;
import Task_Manager.task_service.dto.CommentRequest;
import Task_Manager.task_service.dto.CommentResponse;
import Task_Manager.task_service.dto.UserDto;
import Task_Manager.task_service.entity.Comment;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.kafka.CommentEventPublisher;
import Task_Manager.task_service.mapper.CommentMapper;
import Task_Manager.task_service.repository.CommentRepository;
import Task_Manager.task_service.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommentService {
    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final CommentMapper commentMapper;
    private final CommentEventPublisher commentEventPublisher;
    private final ProjectClient projectClient;
    private final UserClient userClient;

    public CommentResponse addComment(UUID taskId, UUID userId, CommentRequest request, boolean isSystemAdmin) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new RuntimeException("Task not found"));

        UUID projectId = task.getProject() != null ? task.getProject() : null;
        boolean isProjectAdmin = projectId != null && projectClient.isProjectAdmin(projectId, userId);
        boolean isAssignee = task.getAssignee() != null && task.getAssignee().equals(userId);
        boolean isReporter = task.getReporter() != null && task.getReporter().equals(userId);

        if (!isSystemAdmin && !isProjectAdmin && !isAssignee && !isReporter) {
            throw new RuntimeException("Access Denied: Bạn không có quyền bình luận trong công việc này.");
        }

        Comment parentComment = null;
        if (request.getParentCommentId() != null) {
            parentComment = commentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new RuntimeException("Parent comment not found"));
        }

        // Khớp hoàn toàn với Entity Comment của bạn
        Comment comment = commentMapper.toEntity(request, task, userId, parentComment);
        Comment savedComment = commentRepository.save(comment);

        CommentResponse commentResponse = commentMapper.toResponse(savedComment);
        CommentResponse enriched = enrichWithUserDetails(Collections.singletonList(commentResponse)).get(0);

        commentEventPublisher.publishCommentCreated(savedComment.getId(), Map.of(
                "comment", enriched,
                "createdBy", userId,
                "username", enriched.getUserName() != null ? enriched.getUserName() : "Thành viên",
                "userAvatar", enriched.getUserAvatar() != null ? enriched.getUserAvatar() : "U",
                "targetName", enriched.getContent() != null && enriched.getContent().length() > 20
                        ? enriched.getContent().substring(0, 20) + "..."
                        : enriched.getContent()
        ));
        return enriched;
    }

    public CommentResponse updateComment(UUID commentId, UUID userId, CommentRequest request, boolean isSystemAdmin) {
        Comment comment = commentRepository.findByIdWithTask(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        Task task = comment.getTask();
        UUID projectId = task != null && task.getProject() != null ? task.getProject() : null;
        boolean isProjectAdmin = projectId != null && projectClient.isProjectAdmin(projectId, userId);
        boolean isOwner = comment.getUserId().equals(userId);

        if (!isSystemAdmin && !isProjectAdmin && !isOwner) {
            throw new RuntimeException("Access Denied: Bạn không có quyền chỉnh sửa bình luận này.");
        }

        commentMapper.updateEntityFromRequest(request, comment);
        Comment updatedComment = commentRepository.save(comment);

        CommentResponse commentResponse = commentMapper.toResponse(updatedComment);
        CommentResponse enriched = enrichWithUserDetails(Collections.singletonList(commentResponse)).get(0);

        commentEventPublisher.publishCommentUpdated(commentId, Map.of(
                "comment", enriched,
                "updatedBy", userId,
                "username", enriched.getUserName() != null ? enriched.getUserName() : "Thành viên",
                "userAvatar", enriched.getUserAvatar() != null ? enriched.getUserAvatar() : "U",
                "targetName", enriched.getContent() != null && enriched.getContent().length() > 20
                        ? enriched.getContent().substring(0, 20) + "..."
                        : enriched.getContent()
        ));
        return enriched;
    }

    public void deleteComment(UUID commentId, UUID userId, boolean isSystemAdmin) {
        Comment comment = commentRepository.findByIdWithTask(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        Task task = comment.getTask();
        UUID projectId = task != null && task.getProject() != null ? task.getProject() : null;
        boolean isProjectAdmin = projectId != null && projectClient.isProjectAdmin(projectId, userId);
        boolean isOwner = comment.getUserId().equals(userId);

        if (!isSystemAdmin && !isProjectAdmin && !isOwner) {
            throw new RuntimeException("Access Denied: Bạn không có quyền xóa bình luận này.");
        }

        commentRepository.deleteById(commentId);
        commentEventPublisher.publishCommentDeleted(commentId, Map.of(
                "commentId", commentId,
                "deletedBy", userId,
                "targetName", "Bình luận"
        ));
    }

    public List<CommentResponse> getCommentByTaskId(UUID taskId) {
        List<Comment> allComments = commentRepository.findByTaskId(taskId);
        if (allComments.isEmpty()) return Collections.emptyList();

        List<CommentResponse> allResponses = allComments.stream()
                .map(commentMapper::toResponse)
                .collect(Collectors.toList());

        Map<UUID, CommentResponse> map = new HashMap<>();
        for (CommentResponse res : allResponses) {
            res.setReplies(new ArrayList<>());
            map.put(res.getId(), res);
        }

        List<CommentResponse> rootComments = new ArrayList<>();
        for (CommentResponse res : allResponses) {
            UUID parentId = res.getParentCommentId();
            if (parentId == null) {
                rootComments.add(res);
            } else {
                CommentResponse parent = map.get(parentId);
                if (parent != null) {
                    parent.getReplies().add(res);
                } else {
                    rootComments.add(res);
                }
            }
        }
        enrichCompleteTree(rootComments);

        return rootComments;
    }

    public CommentResponse getCommentById(UUID commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));
        CommentResponse response = commentMapper.toResponse(comment);
        return enrichWithUserDetails(Collections.singletonList(response)).get(0);
    }

    private List<CommentResponse> enrichWithUserDetails(List<CommentResponse> responses) {
        if (responses == null || responses.isEmpty()) return responses;

        Set<UUID> userIds = responses.stream()
                .map(CommentResponse::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (userIds.isEmpty()) return responses;

        Map<UUID, UserDto> userMap = new HashMap<>();
        try {
            List<UserDto> users = userClient.getUsersByIds(new ArrayList<>(userIds));
            userMap = users.stream().collect(Collectors.toMap(UserDto::getUserId, u -> u));
        } catch (Exception e) {
            log.warn("Lỗi khi lấy thông tin user cho comments: {}", e.getMessage());
        }

        for (CommentResponse res : responses) {
            if (res.getUserId() != null && userMap.containsKey(res.getUserId())) {
                UserDto user = userMap.get(res.getUserId());
                res.setUserName(user.getFullName() != null ? user.getFullName() : user.getUsername());
                res.setUserAvatar(user.getAvatarUrl() != null ? user.getAvatarUrl() : user.getUsername().substring(0, 1).toUpperCase());
            }
        }
        return responses;
    }

    private void enrichCompleteTree(List<CommentResponse> comments) {
        if (comments == null || comments.isEmpty()) return;

        // Thu thập tất cả userId có trong cả cha và con
        Set<UUID> userIds = new HashSet<>();
        collectUserIds(comments, userIds);

        if (userIds.isEmpty()) return;

        Map<UUID, UserDto> userMap = new HashMap<>();
        try {
            List<UserDto> users = userClient.getUsersByIds(new ArrayList<>(userIds));
            userMap = users.stream().collect(Collectors.toMap(UserDto::getUserId, u -> u));
        } catch (Exception e) {
            log.warn("Lỗi khi lấy thông tin user cho comments tree: {}", e.getMessage());
        }

        applyUserDetails(comments, userMap);
    }

    private void collectUserIds(List<CommentResponse> comments, Set<UUID> userIds) {
        for (CommentResponse c : comments) {
            if (c.getUserId() != null) userIds.add(c.getUserId());
            if (c.getReplies() != null && !c.getReplies().isEmpty()) {
                collectUserIds(c.getReplies(), userIds);
            }
        }
    }

    private void applyUserDetails(List<CommentResponse> comments, Map<UUID, UserDto> userMap) {
        for (CommentResponse res : comments) {
            if (res.getUserId() != null && userMap.containsKey(res.getUserId())) {
                UserDto user = userMap.get(res.getUserId());
                res.setUserName(user.getFullName() != null ? user.getFullName() : user.getUsername());
                res.setUserAvatar(user.getAvatarUrl() != null ? user.getAvatarUrl() : user.getUsername().substring(0, 1).toUpperCase());
            }
            if (res.getReplies() != null && !res.getReplies().isEmpty()) {
                applyUserDetails(res.getReplies(), userMap);
            }
        }
    }
}