package Task_Manager.project_service.service.impl;

import Task_Manager.common_lib.exception.BusinessRuleException;
import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.project_service.dto.ProjectPermissionResponse;
import Task_Manager.project_service.dto.ProjectRoleRequest;
import Task_Manager.project_service.dto.ProjectRoleResponse;
import Task_Manager.project_service.entity.ProjectPermission;
import Task_Manager.project_service.entity.ProjectRole;
import Task_Manager.project_service.repository.ProjectPermissionRepository;
import Task_Manager.project_service.repository.ProjectRoleRepository;
import Task_Manager.project_service.service.ProjectRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectRoleServiceImpl implements ProjectRoleService {

    private final ProjectRoleRepository projectRoleRepository;
    private final ProjectPermissionRepository projectPermissionRepository;

    @Override
    public List<ProjectPermissionResponse> getAllSystemPermissions() {
        return projectPermissionRepository.findAll().stream()
                .map(p -> new ProjectPermissionResponse(p.getId(), p.getName(), p.getDescription()))
                .collect(Collectors.toList());
    }

    @Override
    public ProjectRoleResponse createCustomRole(UUID projectId, ProjectRoleRequest request) {
        if (projectRoleRepository.findByNameAndProjectId(request.getName(), projectId).isPresent()) {
            throw new BusinessRuleException("Tên vai trò này đã tồn tại trong dự án!");
        }

        Set<ProjectPermission> permissions = request.getPermissions().stream()
                .map(permName -> projectPermissionRepository.findByName(permName)
                        .orElseThrow(() -> new BusinessRuleException("Quyền không tồn tại: " + permName)))
                .collect(Collectors.toSet());

        ProjectRole customRole = ProjectRole.builder()
                .name(request.getName())
                .projectId(projectId)
                .isCustom(true)
                .permissions(permissions)
                .build();

        projectRoleRepository.save(customRole);

        return new ProjectRoleResponse(
                customRole.getId(),
                customRole.getName(),
                customRole.isCustom(),
                request.getPermissions()
        );
    }

    @Override
    public List<ProjectRoleResponse> getRolesByProjectId(UUID projectId) {
        List<ProjectRole> roles = projectRoleRepository.findAllByProjectIdIsNullOrProjectId(projectId);

        return roles.stream().map(role -> new ProjectRoleResponse(
                role.getId(),
                role.getName(),
                role.isCustom(),
                role.getPermissions().stream().map(ProjectPermission::getName).collect(Collectors.toSet())
        )).collect(Collectors.toList());
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public ProjectRoleResponse updateCustomRole(UUID projectId, UUID roleId, ProjectRoleRequest request) {
        ProjectRole role = projectRoleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role không tồn tại"));

        if (!role.getProjectId().equals(projectId) || !role.isCustom()) {
            throw new BusinessRuleException("Không thể sửa role hệ thống hoặc sai dự án!");
        }

        if (!role.getName().equalsIgnoreCase(request.getName())) {
            if (projectRoleRepository.findByNameAndProjectId(request.getName(), projectId).isPresent()) {
                throw new BusinessRuleException("Tên vai trò này đã tồn tại trong dự án!");
            }
        }

        Set<ProjectPermission> permissions = request.getPermissions().stream()
                .map(permName -> projectPermissionRepository.findByName(permName)
                        .orElseThrow(() -> new BusinessRuleException("Quyền không tồn tại: " + permName)))
                .collect(Collectors.toSet());

        role.setName(request.getName().toUpperCase());
        role.setPermissions(permissions);
        projectRoleRepository.save(role);

        return new ProjectRoleResponse(role.getId(), role.getName(), role.isCustom(), request.getPermissions());
    }

    @Override
    public void deleteCustomRole(UUID projectId, UUID roleId) {
        ProjectRole role = projectRoleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role không tồn tại"));

        if (!role.getProjectId().equals(projectId) || !role.isCustom()) {
            throw new BusinessRuleException("Không thể xóa role hệ thống!");
        }

        try {
            projectRoleRepository.delete(role);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new BusinessRuleException("Không thể xóa Role này vì đang có thành viên sử dụng!");
        }
    }
}