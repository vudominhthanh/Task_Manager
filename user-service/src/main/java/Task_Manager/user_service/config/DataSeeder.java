package Task_Manager.user_service.config;

import Task_Manager.user_service.constant.PermissionConstant;
import Task_Manager.user_service.constant.RoleConstant;
import Task_Manager.user_service.entity.SystemPermission;
import Task_Manager.user_service.entity.SystemRole;
import Task_Manager.user_service.repository.SystemPermissionRepository;
import Task_Manager.user_service.repository.SystemRoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final SystemPermissionRepository permissionRepository;
    private final SystemRoleRepository roleRepository;

    @Override
    @Transactional
    public void run(String... args) {
        Map<String, String[]> permissionsToCreate = Map.ofEntries(
                // USER
                Map.entry(PermissionConstant.USER_READ, new String[]{"USER", "Xem danh sách và chi tiết tất cả người dùng"}),
                Map.entry(PermissionConstant.USER_WRITE, new String[]{"USER", "Chỉnh sửa thông tin cá nhân của người dùng khác"}),
                Map.entry(PermissionConstant.USER_DELETE, new String[]{"USER", "Xóa người dùng khỏi hệ thống"}),
                Map.entry(PermissionConstant.USER_STATUS_UPDATE, new String[]{"USER", "Khóa (Ban) hoặc Mở khóa tài khoản"}),
                Map.entry(PermissionConstant.USER_ROLE_UPDATE, new String[]{"USER", "Thay đổi Vai trò hệ thống của người dùng"}),

                // ROLE & PERMISSION
                Map.entry(PermissionConstant.ROLE_READ, new String[]{"RBAC", "Xem danh sách Vai trò & Quyền hạn hệ thống"}),
                Map.entry(PermissionConstant.ROLE_WRITE, new String[]{"RBAC", "Tạo mới hoặc Sửa Vai trò hệ thống"}),
                Map.entry(PermissionConstant.ROLE_DELETE, new String[]{"RBAC", "Xóa Vai trò hệ thống"}),

                // PROJECT
                Map.entry(PermissionConstant.PROJECT_CREATE, new String[]{"PROJECT", "Được phép khởi tạo dự án mới"}),
                Map.entry(PermissionConstant.PROJECT_VIEW_ALL, new String[]{"PROJECT", "Xem toàn bộ dự án trên hệ thống (Super Admin)"}),
                Map.entry(PermissionConstant.PROJECT_DELETE_ANY, new String[]{"PROJECT", "Xóa dự án bất kỳ (Quản lý vi phạm)"}),

                // REPORT
                Map.entry(PermissionConstant.REPORT_SYSTEM_VIEW, new String[]{"REPORT", "Xem thống kê tổng quan hệ thống"}),
                Map.entry(PermissionConstant.REPORT_FINANCIAL_VIEW, new String[]{"REPORT", "Xem báo cáo tài chính/tài nguyên"}),

                // SYSTEM CONFIG
                Map.entry(PermissionConstant.SYSTEM_CONFIG_READ, new String[]{"SYSTEM", "Xem các cấu hình nền tảng"}),
                Map.entry(PermissionConstant.SYSTEM_CONFIG_WRITE, new String[]{"SYSTEM", "Sửa đổi cấu hình nền tảng (SMTP, Storage...)"})
        );

        Map<String, SystemPermission> savedPermissions = new HashMap<>();
        permissionsToCreate.forEach((code, meta) -> {
            SystemPermission permission = permissionRepository.findByCode(code)
                    .orElseGet(() -> permissionRepository.save(
                            SystemPermission.builder()
                                    .code(code)
                                    .module(meta[0])
                                    .description(meta[1])
                                    .build()
                    ));
            savedPermissions.put(code, permission);
        });

        initRole(RoleConstant.ADMIN, "Quản trị viên Hệ thống (Tối cao)", new HashSet<>(savedPermissions.values()));

        Set<SystemPermission> managerPerms = new HashSet<>();
        managerPerms.add(savedPermissions.get(PermissionConstant.USER_READ));
        managerPerms.add(savedPermissions.get(PermissionConstant.USER_STATUS_UPDATE));
        managerPerms.add(savedPermissions.get(PermissionConstant.PROJECT_CREATE));
        managerPerms.add(savedPermissions.get(PermissionConstant.PROJECT_VIEW_ALL));
        managerPerms.add(savedPermissions.get(PermissionConstant.REPORT_SYSTEM_VIEW));
        initRole("ROLE_MANAGER", "Quản lý cấp trung", managerPerms);

        Set<SystemPermission> memberPerms = new HashSet<>();
        memberPerms.add(savedPermissions.get(PermissionConstant.PROJECT_CREATE));
        initRole(RoleConstant.MEMBER, "Người dùng hệ thống", memberPerms);

//        log.info("===> Khởi tạo RBAC Cấp Hệ Thống thành công!");
    }

    private void initRole(String roleName, String description, Set<SystemPermission> permissions) {
        Optional<SystemRole> existing = roleRepository.findByName(roleName);
        if (existing.isEmpty()) {
            SystemRole role = SystemRole.builder()
                    .name(roleName)
                    .description(description)
                    .permissions(permissions)
                    .build();
            roleRepository.save(role);
        }
    }
}