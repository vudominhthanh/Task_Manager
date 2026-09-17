package Task_Manager.project_service.service;

import Task_Manager.project_service.dto.ProjectRequest;
import Task_Manager.project_service.dto.ProjectResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface ProjectService {
    boolean isProjectAdmin(UUID projectId, UUID userId);

    ProjectResponse createProject(ProjectRequest request, UUID ownerId);

    ProjectResponse updateProject(UUID id, ProjectRequest request, UUID currentUserId, boolean isSystemAdmin);

    void deleteProject(UUID id, UUID currentUserId, boolean isSystemAdmin);

    List<UUID> findProjectIdsByUserId(UUID userId);

    ProjectResponse getProjectById(UUID id);

    List<ProjectResponse> getAllProjects();

    Page<ProjectResponse> getProjects(UUID currentUserId, String keyword, Pageable pageable);

    List<ProjectResponse> getProjectByOwnerId(UUID ownerId);

    List<ProjectResponse> getProjectsByIds(List<UUID> projectIds);
}