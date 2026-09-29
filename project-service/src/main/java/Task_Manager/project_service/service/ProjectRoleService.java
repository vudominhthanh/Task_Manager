package Task_Manager.project_service.service;

import Task_Manager.project_service.dto.ProjectPermissionResponse;
import Task_Manager.project_service.dto.ProjectRoleRequest;
import Task_Manager.project_service.dto.ProjectRoleResponse;
import java.util.List;
import java.util.UUID;

public interface ProjectRoleService {
    List<ProjectPermissionResponse> getAllSystemPermissions();
    ProjectRoleResponse createCustomRole(UUID projectId, ProjectRoleRequest request);
    List<ProjectRoleResponse> getRolesByProjectId(UUID projectId);
    ProjectRoleResponse updateCustomRole(UUID projectId, UUID roleId, ProjectRoleRequest request);
    void deleteCustomRole(UUID projectId, UUID roleId);
}