package Task_Manager.task_service.service.impl;

import Task_Manager.common_lib.constant.ProjectPermissions;
import Task_Manager.common_lib.exception.ForbiddenAccessException;
import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.utils.Translator;
import Task_Manager.task_service.client.ProjectClient;
import Task_Manager.task_service.client.UserClient;
import Task_Manager.task_service.dto.CommentEventDto;
import Task_Manager.task_service.dto.CommentRequest;
import Task_Manager.task_service.dto.CommentResponse;
import Task_Manager.task_service.dto.UserDto;
import Task_Manager.task_service.entity.Comment;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.kafka.CommentEventPublisher;
import Task_Manager.task_service.mapper.CommentMapper;
import Task_Manager.task_service.repository.CommentRepository;
import Task_Manager.task_service.repository.TaskRepository;
import Task_Manager.task_service.security.TaskSecurity;
import Task_Manager.task_service.service.CommentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final TaskSecurity taskSecurity;
    private final UserClient userClient;
    private final ProjectClient projectClient;

    @Override
    @Transactional
    public CommentResponse addComment(UUID taskId, UUID userId, CommentRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.task.not_found", taskId)));

        validateTaskCommentAccess(task, userId);

        Comment parentComment = null;
        if (request.getParentCommentId() != null) {
            parentComment = commentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.comment.parent_not_found", request.getParentCommentId())));
        }

        Comment comment = commentMapper.toEntity(request, taskId, task.getProject(), userId, parentComment);
        Comment savedComment = commentRepository.save(comment);

        CommentResponse enriched = enrichSingleComment(commentMapper.toResponse(savedComment));

        UUID recipientId = (task.getAssignee() != null && !task.getAssignee().equals(userId))
                ? task.getAssignee()
                : (!Objects.equals(task.getReporter(), userId) ? task.getReporter() : null);

        CommentEventDto event = commentMapper.toCommentCreatedEvent(taskId, task.getProject(), task.getTitle(), task.getProject(), enriched, userId, recipientId);
        commentEventPublisher.publishCommentCreated(savedComment.getId(), event);

        return enriched;
    }

    @Override
    @Transactional
    public CommentResponse updateComment(UUID commentId, UUID userId, CommentRequest request) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.comment.not_found", commentId)));

        if (!comment.getUserId().equals(userId)) {
            throw new ForbiddenAccessException("Bạn không có quyền sửa bình luận của người khác!");
        }

        commentMapper.updateEntityFromRequest(request, comment);
        Comment updatedComment = commentRepository.save(comment);

        CommentResponse enriched = enrichSingleComment(commentMapper.toResponse(updatedComment));

        CommentEventDto event = commentMapper.toCommentUpdatedEvent(comment.getTaskId(), comment.getProjectId(), comment.getProjectId(), enriched, userId, truncateContent(enriched.getContent()));
        commentEventPublisher.publishCommentUpdated(commentId, event);

        return enriched;
    }

    @Override
    @Transactional
    public void deleteComment(UUID commentId, UUID userId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.comment.not_found", commentId)));


        boolean isOwner = comment.getUserId().equals(userId);
        if (!isOwner) {
            boolean canDeleteAny = taskSecurity.hasTaskPermission(comment.getTaskId(), ProjectPermissions.COMMENT_DELETE_ANY);
            if (!canDeleteAny) {
                throw new ForbiddenAccessException("Bạn không có quyền xóa bình luận này!");
            }
        }

        commentRepository.deleteById(commentId);

        CommentEventDto event = commentMapper.toCommentDeletedEvent(comment.getTaskId(), comment.getProjectId(), comment.getProjectId(), commentId, userId);
        commentEventPublisher.publishCommentDeleted(commentId, event);
    }

    @Override
    @Transactional
    public CommentResponse addProjectComment(UUID projectId, UUID userId, CommentRequest request) {
        if (!projectClient.existsById(projectId)) {
            throw new ResourceNotFoundException("Không tìm thấy dự án: " + projectId);
        }

        Comment parentComment = null;
        if (request.getParentCommentId() != null) {
            parentComment = commentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bình luận cha!"));
        }

        Comment comment = commentMapper.toEntity(request, null, projectId, userId, parentComment);
        Comment savedComment = commentRepository.save(comment);

        CommentResponse enriched = enrichSingleComment(commentMapper.toResponse(savedComment));

        CommentEventDto event = commentMapper.toCommentCreatedEvent(null, projectId, null, projectId, enriched, userId, null);
        commentEventPublisher.publishCommentCreated(savedComment.getId(), event);

        return enriched;
    }



    @Override
    public List<CommentResponse> getCommentsByProjectId(UUID projectId) {
        List<Comment> allComments = commentRepository.findByProjectIdAndTaskIdIsNull(projectId);
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
    public List<CommentResponse> getCommentByTaskId(UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy công việc"));

        Authentication authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated() && !authentication.getName().equals("anonymousUser")) {
            UUID userId = UUID.fromString(authentication.getName());
            validateTaskCommentAccess(task, userId);
        }

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

    private String truncateContent(String content) {
        if (content == null) return "";
        return content.length() > 20 ? content.substring(0, 20) + "..." : content;
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

    private void validateTaskCommentAccess(Task task, UUID userId) {

        boolean isDirect = (task.getAssignee() != null && task.getAssignee().equals(userId)) ||
                (task.getReporter() != null && task.getReporter().equals(userId));
        if (isDirect) return;

        if (task.getParentTask() != null) {
            Task parent = task.getParentTask();
            boolean isParentInvolved = (parent.getAssignee() != null && parent.getAssignee().equals(userId)) ||
                    (parent.getReporter() != null && parent.getReporter().equals(userId));
            if (isParentInvolved) return;
        } else {
            List<Task> subTasks = taskRepository.findByParentTaskId(task.getId());
            boolean isSubtaskAssignee = subTasks.stream()
                    .anyMatch(st -> st.getAssignee() != null && st.getAssignee().equals(userId));
            if (isSubtaskAssignee) return;
        }

        throw new ForbiddenAccessException("Bạn không có quyền tham gia vào không gian của công việc này!");
    }
}