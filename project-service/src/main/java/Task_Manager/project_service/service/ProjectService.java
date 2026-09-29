package Task_Manager.project_service.service;

import Task_Manager.project_service.dto.ProjectRequest;
import Task_Manager.project_service.dto.ProjectResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import Task_Manager.project_service.entity.ProjectStatus;

import java.util.List;
import java.util.UUID;

public interface ProjectService {
    boolean isProjectAdmin(UUID projectId, UUID userId);

    ProjectResponse createProject(ProjectRequest request, UUID ownerId);

    ProjectResponse updateProject(UUID id, ProjectRequest request, UUID currentUserId);

    void deleteProject(UUID id, UUID currentUserId);

    List<UUID> findProjectIdsByUserId(UUID userId);

    ProjectResponse getProjectById(UUID id);

    List<ProjectResponse> getAllProjects();

    Page<ProjectResponse> getProjects(UUID currentUserId, String keyword, Pageable pageable);

    List<ProjectResponse> getProjectByOwnerId(UUID ownerId);

    List<ProjectResponse> getProjectsByIds(List<UUID> projectIds);

    ProjectResponse updateProjectStatus(UUID id, ProjectStatus newStatus, UUID currentUserId);

    void autoCompleteProjectIfAllTasksDone(UUID projectId);
}