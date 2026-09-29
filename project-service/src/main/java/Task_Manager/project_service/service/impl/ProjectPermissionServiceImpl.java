package Task_Manager.project_service.service.impl;

import Task_Manager.common_lib.constant.ProjectPermissions;
import Task_Manager.common_lib.exception.ForbiddenAccessException;
import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.utils.Translator;
import Task_Manager.project_service.entity.Project;
import Task_Manager.project_service.entity.ProjectMember;
import Task_Manager.project_service.entity.ProjectPermission;
import Task_Manager.project_service.repository.ProjectMemberRepository;
import Task_Manager.project_service.repository.ProjectRepository;
import Task_Manager.project_service.service.ProjectPermissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.lang.reflect.Field;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectPermissionServiceImpl implements ProjectPermissionService {

    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;

    private static final Set<String> ALL_PERMISSIONS = loadAllPermissions();

    @Override
    public Set<String> getUserPermissionsInProject(UUID projectId, UUID userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.project.not_found", projectId)));

        if (project.getOwnerId().equals(userId)) {
            return ALL_PERMISSIONS;
        }

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new ForbiddenAccessException(Translator.toLocale("error.member.permission_denied")));

        if (member.getProjectRole() == null) {
            log.warn("CẢNH BÁO: Thành viên {} trong dự án {} không có Role! Có thể do dữ liệu DB bị lỗi.", userId, projectId);
            return Collections.emptySet(); // Không có role thì trả về mảng rỗng (không có quyền gì)
        }

        if ("ADMIN".equals(member.getProjectRole().getName())) {
            return ALL_PERMISSIONS;
        }

        if (member.getProjectRole().getPermissions() == null) {
            return Collections.emptySet();
        }

        return member.getProjectRole().getPermissions().stream()
                .map(ProjectPermission::getName)
                .collect(Collectors.toSet());
    }

    private static Set<String> loadAllPermissions() {
        Set<String> set = new HashSet<>();
        for (Field f : ProjectPermissions.class.getDeclaredFields()) {
            if (f.getType().equals(String.class)) {
                try {
                    set.add((String) f.get(null));
                } catch (Exception ignored) {}
            }
        }
        return Set.copyOf(set);
    }
}