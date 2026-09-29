package Task_Manager.project_service.security;

import Task_Manager.common_lib.constant.ProjectPermissions;
import Task_Manager.project_service.entity.Project;
import Task_Manager.project_service.repository.ProjectMemberRepository;
import Task_Manager.project_service.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component("projectSecurity")
@RequiredArgsConstructor
public class ProjectSecurity {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    public boolean hasPermission(UUID projectId, String requiredPermission) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        boolean isSystemAdmin = authentication.getAuthorities().stream()
                .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
        if (isSystemAdmin) return true;

        UUID currentUserId = UUID.fromString(authentication.getName());

        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null) return false;

        if (project.getOwnerId() != null && project.getOwnerId().equals(currentUserId)) {
            return true;
        }

        if (requiredPermission.equals(ProjectPermissions.PROJECT_UPDATE) ||
                requiredPermission.equals(ProjectPermissions.PROJECT_DELETE) ||
                requiredPermission.equals(ProjectPermissions.MEMBER_ROLE_UPDATE) ||
                requiredPermission.equals(ProjectPermissions.MEMBER_REMOVE)) {

            return projectMemberRepository.findByProjectIdAndUserId(projectId, currentUserId)
                    .map(member -> {
                        if (member.getProjectRole() == null || member.getProjectRole().getName() == null) {
                            return false;
                        }
                        String role = member.getProjectRole().getName().toUpperCase();
                        return role.equals("ADMIN");
                    })
                    .orElse(false);
        }
        return projectMemberRepository.hasProjectPermission(projectId, currentUserId, requiredPermission);
    }
}