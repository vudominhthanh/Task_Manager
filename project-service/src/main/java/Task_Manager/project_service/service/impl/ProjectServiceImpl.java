package Task_Manager.project_service.service.impl;

import Task_Manager.project_service.client.UserClient;
import Task_Manager.project_service.dto.ProjectRequest;
import Task_Manager.project_service.dto.ProjectResponse;
import Task_Manager.project_service.dto.UserDto;
import Task_Manager.project_service.entity.Project;
import Task_Manager.project_service.entity.ProjectRole;
import Task_Manager.project_service.kafka.ProjectEventPublisher;
import Task_Manager.project_service.mapper.ProjectMapper;
import Task_Manager.project_service.repository.ProjectMemberRepository;
import Task_Manager.project_service.repository.ProjectRepository;
import Task_Manager.project_service.service.ProjectService;

// Import các Exception và Translator chuẩn Enterprise
import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.exception.ForbiddenAccessException;
import Task_Manager.common_lib.exception.BusinessRuleException;
import Task_Manager.common_lib.utils.Translator;

import Task_Manager.project_service.specification.ProjectSpecification;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectEventPublisher projectEventPublisher;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserClient userClient;
    private final ProjectMapper projectMapper;

    @Override
    public ProjectResponse createProject(ProjectRequest request, UUID ownerId) {
        if (!userClient.existsById(ownerId)) {
            throw new ResourceNotFoundException(Translator.toLocale("error.project.owner_not_found", ownerId));
        }

        Project project = projectMapper.toEntity(request);
        project.setOwnerId(ownerId);

        Project savedProject = projectRepository.save(project);
        ProjectResponse response = projectMapper.toResponse(savedProject);

        UserActionInfo userInfo = fetchUserActionInfo(ownerId);

        projectEventPublisher.publishProjectCreated(savedProject.getId(), Map.of(
                "projectId", savedProject.getId(),
                "project", response,
                "createdBy", ownerId,
                "username", userInfo.getName(),
                "userAvatar", userInfo.getAvatar(),
                "projectName", response.getName(),
                "targetName", response.getName()
        ));

        return response;
    }

    @Override
    public ProjectResponse updateProject(UUID id, ProjectRequest request, UUID currentUserId, boolean isSystemAdmin) {
        Project project = findProjectOrThrow(id);
        validateManagePermission(project, currentUserId, isSystemAdmin);

        projectMapper.updateEnityFromRequest(request, project);
        Project updatedProject = projectRepository.save(project);
        ProjectResponse response = projectMapper.toResponse(updatedProject);

        UserActionInfo userInfo = fetchUserActionInfo(currentUserId);

        projectEventPublisher.publishProjectUpdated(updatedProject.getId(), Map.of(
                "projectId", project.getId(),
                "project", response,
                "updatedBy", currentUserId,
                "username", userInfo.getName(),
                "userAvatar", userInfo.getAvatar(),
                "projectName", response.getName(),
                "targetName", response.getName()
        ));

        return response;
    }

    @Override
    public void deleteProject(UUID id, UUID currentUserId, boolean isSystemAdmin) {
        Project project = findProjectOrThrow(id);
        validateManagePermission(project, currentUserId, isSystemAdmin);

        projectRepository.delete(project);

        UserActionInfo userInfo = fetchUserActionInfo(currentUserId);

        projectEventPublisher.publishProjectDeleted(project.getId(), Map.of(
                "projectId", project.getId(),
                "deletedBy", currentUserId,
                "username", userInfo.getName(),
                "projectName", project.getName(),
                "targetName", project.getName()
        ));
    }

    @Override
    public List<UUID> findProjectIdsByUserId(UUID userId) {
        return projectRepository.findProjectIdsByUserId(userId);
    }

    @Override
    public ProjectResponse getProjectById(UUID id) {
        Project project = findProjectOrThrow(id);
        return projectMapper.toResponse(project);
    }

    @Override
    public List<ProjectResponse> getAllProjects() {
        return projectRepository.findAll().stream()
                .map(projectMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public Page<ProjectResponse> getProjects(UUID currentUserId, String keyword, Pageable pageable) {
        Specification<Project> spec = ProjectSpecification.getInvolvedProjects(currentUserId, keyword);

        return projectRepository.findAll(spec, pageable).map(projectMapper::toResponse);
    }

    @Override
    public List<ProjectResponse> getProjectByOwnerId(UUID ownerId) {
        return projectRepository.findAllByOwnerId(ownerId).stream()
                .map(projectMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectResponse> getProjectsByIds(List<UUID> projectIds) {
        return projectRepository.findAllById(projectIds).stream()
                .map(projectMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public boolean isProjectAdmin(UUID projectId, UUID userId) {
        if (projectId == null || userId == null) {
            return false;
        }

        return projectRepository.findById(projectId)
                .map(project -> {
                    if (project.getOwnerId() != null && project.getOwnerId().equals(userId)) {
                        return true;
                    }
                    return projectMemberRepository.existsByProjectIdAndUserIdAndProjectRoleIn(
                            projectId, userId, List.of(ProjectRole.ADMIN)
                    );
                })
                .orElse(false);
    }

    private Project findProjectOrThrow(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        Translator.toLocale("error.project.not_found", id)
                ));
    }

    private void validateManagePermission(Project project, UUID currentUserId, boolean isSystemAdmin) {
        if (isSystemAdmin || project.getOwnerId().equals(currentUserId)) {
            return;
        }

        boolean isProjectAdmin = projectMemberRepository.existsByProjectIdAndUserIdAndProjectRoleIn(
                project.getId(), currentUserId, List.of(ProjectRole.ADMIN)
        );

        if (!isProjectAdmin) {
            throw new ForbiddenAccessException(Translator.toLocale("error.project.access_denied"));
        }
    }

    private UserActionInfo fetchUserActionInfo(UUID userId) {
        String name = "Thành viên";
        String avatarLetter = "U";

        try {
            UserDto user = userClient.getUserById(userId);
            if (user != null) {
                name = (user.getFullName() != null && !user.getFullName().trim().isEmpty())
                        ? user.getFullName()
                        : user.getUsername();

                if (name != null && !name.trim().isEmpty()) {
                    avatarLetter = name.trim().substring(0, 1).toUpperCase();
                }
            }
        } catch (Exception e) {
            log.warn("Không thể lấy thông tin User để gửi Kafka event - ID: {}, Lỗi: {}", userId, e.getMessage());
        }

        return new UserActionInfo(name, avatarLetter);
    }

    @Getter
    @AllArgsConstructor
    private static class UserActionInfo {
        private String name;
        private String avatar;
    }
}