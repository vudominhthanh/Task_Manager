package Task_Manager.project_service.config;

import Task_Manager.common_lib.constant.ProjectPermissions;
import Task_Manager.project_service.entity.ProjectPermission;
import Task_Manager.project_service.entity.ProjectRole;
import Task_Manager.project_service.repository.ProjectPermissionRepository;
import Task_Manager.project_service.repository.ProjectRoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseSeeder implements CommandLineRunner {

    private final ProjectPermissionRepository permissionRepository;
    private final ProjectRoleRepository roleRepository;

    @Override
    public void run(String... args) {
        seedPermissions();
        seedDefaultRoles();
    }

    private void seedPermissions() {
        List<String> allPermissions = List.of(
                ProjectPermissions.PROJECT_VIEW, ProjectPermissions.PROJECT_UPDATE, ProjectPermissions.PROJECT_DELETE,
                ProjectPermissions.MEMBER_VIEW, ProjectPermissions.MEMBER_ADD, ProjectPermissions.MEMBER_REMOVE, ProjectPermissions.MEMBER_ROLE_UPDATE,
                ProjectPermissions.TASK_VIEW, ProjectPermissions.TASK_CREATE, ProjectPermissions.TASK_UPDATE, ProjectPermissions.TASK_DELETE, ProjectPermissions.TASK_ASSIGN,
                ProjectPermissions.COMMENT_VIEW, ProjectPermissions.COMMENT_CREATE, ProjectPermissions.COMMENT_UPDATE_OWN, ProjectPermissions.COMMENT_DELETE_OWN, ProjectPermissions.COMMENT_DELETE_ANY,
                ProjectPermissions.ATTACHMENT_VIEW, ProjectPermissions.ATTACHMENT_UPLOAD, ProjectPermissions.ATTACHMENT_DELETE_OWN, ProjectPermissions.ATTACHMENT_DELETE_ANY
        );


        for (String permName : allPermissions) {
            if (permissionRepository.findByName(permName).isEmpty()) {

                String moduleName = permName.contains("_") ? permName.substring(0, permName.indexOf("_")) : "PROJECT";

                ProjectPermission permission = ProjectPermission.builder()
                        .name(permName)
                        .code(permName)
                        .module(moduleName)
                        .description("Quyền hệ thống tự động: " + permName)
                        .build();
                permissionRepository.save(permission);
            }
        }
    }

    @Transactional
    private void seedDefaultRoles() {
        if (roleRepository.findByNameAndProjectIdIsNull("ADMIN").isEmpty()) {
            Set<ProjectPermission> allPerms = new HashSet<>(permissionRepository.findAll());
            ProjectRole adminRole = ProjectRole.builder()
                    .name("ADMIN")
                    .projectId(null)
                    .isCustom(false)
                    .permissions(allPerms)
                    .build();
            roleRepository.save(adminRole);
        }

        if (roleRepository.findByNameAndProjectIdIsNull("MEMBER").isEmpty()) {
            Set<ProjectPermission> memberPerms = new HashSet<>();
            List.of(
                    ProjectPermissions.PROJECT_VIEW, ProjectPermissions.MEMBER_VIEW,
                    ProjectPermissions.TASK_VIEW, ProjectPermissions.TASK_CREATE, ProjectPermissions.TASK_UPDATE,
                    ProjectPermissions.COMMENT_VIEW, ProjectPermissions.COMMENT_CREATE, ProjectPermissions.COMMENT_UPDATE_OWN, ProjectPermissions.COMMENT_DELETE_OWN,
                    ProjectPermissions.ATTACHMENT_VIEW, ProjectPermissions.ATTACHMENT_UPLOAD, ProjectPermissions.ATTACHMENT_DELETE_OWN
            ).forEach(name -> permissionRepository.findByName(name).ifPresent(memberPerms::add));

            ProjectRole memberRole = ProjectRole.builder()
                    .name("MEMBER")
                    .projectId(null)
                    .isCustom(false)
                    .permissions(memberPerms)
                    .build();
            roleRepository.save(memberRole);
        }

        if (roleRepository.findByNameAndProjectIdIsNull("VIEWER").isEmpty()) {
            Set<ProjectPermission> viewerPerms = new HashSet<>();
            List.of(
                    ProjectPermissions.PROJECT_VIEW, ProjectPermissions.MEMBER_VIEW,
                    ProjectPermissions.TASK_VIEW, ProjectPermissions.COMMENT_VIEW, ProjectPermissions.ATTACHMENT_VIEW
            ).forEach(name -> permissionRepository.findByName(name).ifPresent(viewerPerms::add));

            ProjectRole viewerRole = ProjectRole.builder()
                    .name("VIEWER")
                    .projectId(null)
                    .isCustom(false)
                    .permissions(viewerPerms)
                    .build();
            roleRepository.save(viewerRole);
        }
    }
}