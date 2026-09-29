package Task_Manager.project_service.service;

import java.util.Set;
import java.util.UUID;

public interface ProjectPermissionService {
    Set<String> getUserPermissionsInProject(UUID projectId, UUID userId);
}