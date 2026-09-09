package Task_Manager.project_service.service;

import Task_Manager.project_service.dto.ProjectRequest;
import Task_Manager.project_service.dto.ProjectResponse;
import Task_Manager.project_service.dto.UserDto;
import Task_Manager.project_service.entity.Project;
import Task_Manager.project_service.entity.ProjectRole;
import Task_Manager.project_service.kafka.ProjectEventPublisher;
import Task_Manager.project_service.mapper.ProjectMapper;
import Task_Manager.project_service.repository.ProjectMemberRepository;
import Task_Manager.project_service.repository.ProjectRepository;
import Task_Manager.project_service.client.UserClient;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final ProjectEventPublisher projectEventPublisher;
    private final ProjectMemberRepository projectMemberRepository;

    private final UserClient userClient;
    private final ProjectMapper projectMapper;

    public ProjectResponse createProject(ProjectRequest request, UUID ownerId) {
        if (!userClient.existsById(ownerId)) {
            throw new RuntimeException("Owner (User) không tồn tại!");
        }

        Project project = projectMapper.toEntity(request);
        project.setOwnerId(ownerId);

        Project savedProject = projectRepository.save(project);
        ProjectResponse response = projectMapper.toResponse(savedProject);

        String ownerName = "Thành viên";
        String avatarLetter = "U";
        try {
            UserDto owner = userClient.getUserById(ownerId);
            if (owner != null) {
                ownerName = owner.getFullName() != null ? owner.getFullName() : owner.getUsername();
                avatarLetter = ownerName.trim().substring(0, 1).toUpperCase();
            }
        } catch (Exception ignored) {}

        projectEventPublisher.publishProjectCreated(savedProject.getId(), Map.of(
                "project", response,
                "createdBy", ownerId,
                "username", ownerName,
                "userAvatar", avatarLetter,
                "projectName", response.getName(),
                "targetName", response.getName()
        ));
        return response;
    }

    public ProjectResponse updateProject(UUID id, ProjectRequest request, UUID currentUserId, boolean isSystemAdmin) {
        Project project = findProjectOrThrow(id);
        validateManagePermission(project, currentUserId, isSystemAdmin);

        projectMapper.updateEnityFromRequest(request, project);
        Project updateProject = projectRepository.save(project);
        ProjectResponse response = projectMapper.toResponse(updateProject);

        String updaterName = "Thành viên";
        String avatarLetter = "U";
        try {
            UserDto updater = userClient.getUserById(currentUserId);
            if (updater != null) {
                updaterName = updater.getFullName() != null ? updater.getFullName() : updater.getUsername();
                avatarLetter = updaterName.trim().substring(0, 1).toUpperCase();
            }
        } catch (Exception ignored) {}

        projectEventPublisher.publishProjectUpdated(updateProject.getId(), Map.of(
                "project", response,
                "updatedBy", currentUserId,
                "username", updaterName,
                "userAvatar", avatarLetter,
                "projectName", response.getName(),
                "targetName", response.getName()
        ));
        return response;
    }

    public void deleteProject(UUID id, UUID currentUserId, boolean isSystemAdmin) {
        Project project = findProjectOrThrow(id);
        validateManagePermission(project, currentUserId, isSystemAdmin);

        projectRepository.delete(project);
        String deleterName = "Thành viên";
        try {
            UserDto deleter = userClient.getUserById(currentUserId);
            if (deleter != null) {
                deleterName = deleter.getFullName() != null ? deleter.getFullName() : deleter.getUsername();
            }
        } catch (Exception ignored) {}

        projectEventPublisher.publishProjectDeleted(project.getId(), Map.of(
                "projectId", project.getId(),
                "deletedBy", currentUserId,
                "username", deleterName,
                "projectName", project.getName(),
                "targetName", project.getName()
        ));
    }

    public List<UUID> findProjectIdsByUserId(UUID userId) {
        return projectRepository.findProjectIdsByUserId(userId);
    }

    public ProjectResponse getProjectById(UUID id) {
        Project project = findProjectOrThrow(id);
        return projectMapper.toResponse(project);
    }

    public List<ProjectResponse> getAllProjects() {
        List<Project> projects = projectRepository.findAll();
        return projects.stream()
                .map(projectMapper::toResponse)
                .collect(Collectors.toList());
    }

    public Page<ProjectResponse> getProjects(UUID currentUserId , String keyword, Pageable pageable) {
        Page<Project> projects = projectRepository.searchInvolvedProjects(currentUserId, keyword, pageable);

        return projects.map(projectMapper::toResponse);
    }

    public List<ProjectResponse> getProjectByOwnerId(UUID ownerId) {
        return projectRepository.findAllByOwnerId(ownerId).stream()
                .map(projectMapper::toResponse)
                .collect(Collectors.toList());
    }

    private Project findProjectOrThrow(UUID id) {
        return projectRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy dự án với ID: " + id));
    }

    private void validateManagePermission(Project project, UUID currentUserId, boolean isSystemAdmin) {
        if (isSystemAdmin) return;
        if (project.getOwnerId().equals(currentUserId)) return;

        boolean isProjectAdmin = projectMemberRepository.existsByProjectIdAndUserIdAndProjectRoleIn(
                project.getId(), currentUserId, List.of(ProjectRole.ADMIN)
        );

        if (!isProjectAdmin) {
            throw new RuntimeException("Access Denied: Chỉ có Admin hệ thống hoặc Admin dự án mới có quyền này");
        }
    }

    public List<ProjectResponse> getProjectsByIds(List<UUID> projectIds) {
        List<Project> projects = projectRepository.findAllById(projectIds);
        return projects.stream()
                .map(project -> ProjectResponse.builder()
                        .id(project.getId())
                        .name(project.getName())
                        .description(project.getDescription())
                        .ownerId(project.getOwnerId())
                        .startDate(project.getStartDate())
                        .endDate(project.getEndDate())
                        .build())
                .collect(Collectors.toList());
    }
}
