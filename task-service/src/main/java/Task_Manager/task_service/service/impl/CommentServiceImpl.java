package Task_Manager.task_service.service.impl;

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
import Task_Manager.task_service.service.CommentService;

import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.exception.ForbiddenAccessException;
import Task_Manager.common_lib.utils.Translator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final CommentMapper commentMapper;
    private final CommentEventPublisher commentEventPublisher;
    private final ProjectClient projectClient;
    private final UserClient userClient;

    @Override
    public CommentResponse addComment(UUID taskId, UUID userId, CommentRequest request, boolean isSystemAdmin) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.task.not_found", taskId)));

        validateAddPermission(task, userId, isSystemAdmin);

        Comment parentComment = null;
        if (request.getParentCommentId() != null) {
            parentComment = commentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.comment.parent_not_found", request.getParentCommentId())));
        }

        Comment comment = commentMapper.toEntity(request, task, userId, parentComment);
        Comment savedComment = commentRepository.save(comment);

        CommentResponse enriched = enrichSingleComment(commentMapper.toResponse(savedComment));

        UUID recipientId = (task.getAssignee() != null && !task.getAssignee().equals(userId))
                ? task.getAssignee()
                : (!Objects.equals(task.getReporter(), userId) ? task.getReporter() : null);

        Map<String, Object> eventPayload = new HashMap<>();
        eventPayload.put("projectId", task.getProject());
        eventPayload.put("taskId", taskId);
        eventPayload.put("comment", enriched);
        eventPayload.put("createdBy", userId);
        eventPayload.put("recipientId", recipientId);
        eventPayload.put("targetName", task.getTitle() != null ? task.getTitle() : "công việc");
        eventPayload.put("username", resolveName(enriched.getUserName()));
        eventPayload.put("userAvatar", resolveAvatar(enriched.getUserAvatar()));

        commentEventPublisher.publishCommentCreated(savedComment.getId(), eventPayload);

        return enriched;
    }

    @Override
    public CommentResponse updateComment(UUID commentId, UUID userId, CommentRequest request, boolean isSystemAdmin) {
        Comment comment = commentRepository.findByIdWithTask(commentId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.comment.not_found", commentId)));

        Task task = comment.getTask();
        validateModifyPermission(task, comment, userId, isSystemAdmin, "chỉnh sửa");

        commentMapper.updateEntityFromRequest(request, comment);
        Comment updatedComment = commentRepository.save(comment);

        CommentResponse enriched = enrichSingleComment(commentMapper.toResponse(updatedComment));

        commentEventPublisher.publishCommentUpdated(commentId, Map.of(
                "projectId", task != null ? task.getProject() : null,
                "taskId", task != null ? task.getId() : null,
                "comment", enriched,
                "updatedBy", userId,
                "username", resolveName(enriched.getUserName()),
                "userAvatar", resolveAvatar(enriched.getUserAvatar()),
                "targetName", truncateContent(enriched.getContent())
        ));

        return enriched;
    }

    @Override
    public void deleteComment(UUID commentId, UUID userId, boolean isSystemAdmin) {
        Comment comment = commentRepository.findByIdWithTask(commentId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.comment.not_found", commentId)));

        Task task = comment.getTask();
        validateModifyPermission(task, comment, userId, isSystemAdmin, "xóa");

        commentRepository.deleteById(commentId);

        commentEventPublisher.publishCommentDeleted(commentId, Map.of(
                "projectId", task != null ? task.getProject() : null,
                "taskId", task != null ? task.getId() : null,
                "commentId", commentId,
                "deletedBy", userId,
                "targetName", "Bình luận"
        ));
    }

    @Override
    public List<CommentResponse> getCommentByTaskId(UUID taskId) {
        List<Comment> allComments = commentRepository.findByTaskId(taskId);
        if (allComments.isEmpty()) return Collections.emptyList();

        List<CommentResponse> allResponses = allComments.stream()
                .map(commentMapper::toResponse)
                .collect(Collectors.toList());

        Map<UUID, CommentResponse> responseMap = new HashMap<>();
        for (CommentResponse res : allResponses) {
            res.setReplies(new ArrayList<>());
            responseMap.put(res.getId(), res);
        }

        List<CommentResponse> rootComments = new ArrayList<>();
        for (CommentResponse res : allResponses) {
            UUID parentId = res.getParentCommentId();
            if (parentId == null) {
                rootComments.add(res);
            } else {
                CommentResponse parent = responseMap.get(parentId);
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

    @Override
    public CommentResponse getCommentById(UUID commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.comment.not_found", commentId)));

        return enrichSingleComment(commentMapper.toResponse(comment));
    }

    private void validateAddPermission(Task task, UUID userId, boolean isSystemAdmin) {
        if (isSystemAdmin) return;
        UUID projectId = task.getProject();
        if (projectId != null && projectClient.isProjectAdmin(projectId, userId)) return;
        if (task.getAssignee() != null && task.getAssignee().equals(userId)) return;
        if (task.getReporter() != null && task.getReporter().equals(userId)) return;

        throw new ForbiddenAccessException(Translator.toLocale("error.comment.access_denied_add"));
    }

    private void validateModifyPermission(Task task, Comment comment, UUID userId, boolean isSystemAdmin, String actionName) {
        if (isSystemAdmin) return;
        UUID projectId = task != null ? task.getProject() : null;
        if (projectId != null && projectClient.isProjectAdmin(projectId, userId)) return;
        if (comment.getUserId().equals(userId)) return;

        throw new ForbiddenAccessException(Translator.toLocale("error.comment.access_denied_modify", actionName));
    }

    private String truncateContent(String content) {
        if (content == null) return "";
        return content.length() > 20 ? content.substring(0, 20) + "..." : content;
    }

    private String resolveName(String name) {
        return (name != null && !name.trim().isEmpty()) ? name : "Thành viên";
    }

    private String resolveAvatar(String avatar) {
        return (avatar != null && !avatar.trim().isEmpty()) ? avatar : "U";
    }

    private CommentResponse enrichSingleComment(CommentResponse response) {
        return enrichWithUserDetails(Collections.singletonList(response)).get(0);
    }

    private List<CommentResponse> enrichWithUserDetails(List<CommentResponse> responses) {
        if (responses == null || responses.isEmpty()) return responses;

        Set<UUID> userIds = responses.stream()
                .map(CommentResponse::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (userIds.isEmpty()) return responses;

        Map<UUID, UserDto> userMap = fetchUsersMap(userIds);

        for (CommentResponse res : responses) {
            applyUserToComment(res, userMap);
        }
        return responses;
    }

    private void enrichCompleteTree(List<CommentResponse> comments) {
        if (comments == null || comments.isEmpty()) return;

        Set<UUID> userIds = new HashSet<>();
        collectUserIds(comments, userIds);

        if (userIds.isEmpty()) return;

        Map<UUID, UserDto> userMap = fetchUsersMap(userIds);
        applyUserDetailsToTree(comments, userMap);
    }

    private void collectUserIds(List<CommentResponse> comments, Set<UUID> userIds) {
        for (CommentResponse c : comments) {
            if (c.getUserId() != null) userIds.add(c.getUserId());
            if (c.getReplies() != null && !c.getReplies().isEmpty()) {
                collectUserIds(c.getReplies(), userIds);
            }
        }
    }

    private void applyUserDetailsToTree(List<CommentResponse> comments, Map<UUID, UserDto> userMap) {
        for (CommentResponse res : comments) {
            applyUserToComment(res, userMap);
            if (res.getReplies() != null && !res.getReplies().isEmpty()) {
                applyUserDetailsToTree(res.getReplies(), userMap);
            }
        }
    }

    private Map<UUID, UserDto> fetchUsersMap(Set<UUID> userIds) {
        try {
            List<UserDto> users = userClient.getUsersByIds(new ArrayList<>(userIds));
            if (users != null) {
                return users.stream()
                        .filter(u -> u != null && u.getUserId() != null)
                        .collect(Collectors.toMap(UserDto::getUserId, u -> u, (existing, replacement) -> existing));
            }
        } catch (Exception e) {
            log.warn("Lỗi khi lấy thông tin user cho comments: {}", e.getMessage());
        }
        return new HashMap<>();
    }

    private void applyUserToComment(CommentResponse res, Map<UUID, UserDto> userMap) {
        if (res.getUserId() != null && userMap.containsKey(res.getUserId())) {
            UserDto user = userMap.get(res.getUserId());
            res.setUserName(user.getFullName() != null ? user.getFullName() : user.getUsername());
            res.setUserAvatar(user.getAvatarUrl() != null ? user.getAvatarUrl()
                    : (user.getUsername() != null && !user.getUsername().isEmpty() ? user.getUsername().substring(0, 1).toUpperCase() : "U"));
        }
    }
}