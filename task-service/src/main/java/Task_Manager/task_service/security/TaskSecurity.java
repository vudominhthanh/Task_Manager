package Task_Manager.task_service.security;

import Task_Manager.task_service.client.ProjectClient;
import Task_Manager.task_service.entity.Task;
import Task_Manager.task_service.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Component("taskSecurity")
@RequiredArgsConstructor
public class TaskSecurity {

    private final TaskRepository taskRepository;
    private final ProjectClient projectClient;

    public boolean hasProjectPermission(UUID projectId, String requiredPermission) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return false;

        boolean isSystemAdmin = authentication.getAuthorities().stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
        if (isSystemAdmin) {
//            log.info("[TaskSecurity] Cho phép System Admin truy cập Project: {}", projectId);
            return true;
        }

        try {
            Set<String> permissions = projectClient.getUserPermissions(projectId, UUID.fromString(authentication.getName()));
            boolean hasPerm = permissions != null && permissions.contains(requiredPermission);
//            log.info("[TaskSecurity] Project: {}, User: {}, Check Perm: {} -> Result: {}",
//                    projectId, authentication.getName(), requiredPermission, hasPerm);
            return hasPerm;
        } catch (Exception e) {
            log.error("[TaskSecurity] Lỗi gọi ProjectClient: {}", e.getMessage());
            return false;
        }
    }

    public boolean hasTaskPermission(UUID taskId, String requiredPermission) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return false;

        boolean isSystemAdmin = authentication.getAuthorities().stream()
                .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));
        if (isSystemAdmin) return true;

        Task task = taskRepository.findById(taskId).orElse(null);
        if (task == null) {
            return false;
        }

        UUID currentUserId = UUID.fromString(authentication.getName());

        if (requiredPermission.startsWith("COMMENT_")) {
            boolean isReporter = task.getReporter() != null && task.getReporter().equals(currentUserId);
            boolean isAssignee = task.getAssignee() != null && task.getAssignee().equals(currentUserId);
            boolean isSubTask = task.getParentTask() != null;

            if (requiredPermission.equals("COMMENT_VIEW") || requiredPermission.equals("COMMENT_CREATE")) {
                if (isSubTask) {
                    boolean isParentReporter = task.getParentTask().getReporter() != null && task.getParentTask().getReporter().equals(currentUserId);
                    boolean isParentAssignee = task.getParentTask().getAssignee() != null && task.getParentTask().getAssignee().equals(currentUserId);
                    if (isReporter || isAssignee || isParentReporter || isParentAssignee) return false;
                } else {
                    if (isReporter || isAssignee) return true;
                    List<Task> subTasks = taskRepository.findByParentTaskId(task.getId());
                    boolean isAnySubtaskAssignee = subTasks.stream()
                            .anyMatch(sub -> sub.getAssignee() != null && sub.getAssignee().equals(currentUserId));
                    if (isAnySubtaskAssignee) return true;
                    return false;
                }
            }
            return true;
        }

        if (requiredPermission.endsWith("_VIEW")) {
            return hasProjectPermission(task.getProject(), requiredPermission);
        }

        return true;
    }
}