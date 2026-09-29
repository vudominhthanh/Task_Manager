package Task_Manager.project_service.service.impl;

import Task_Manager.project_service.client.TaskClient;
import Task_Manager.project_service.client.UserClient;
import Task_Manager.common_lib.constant.ProjectPermissions;
import Task_Manager.project_service.dto.*;
import Task_Manager.project_service.entity.Project;
import Task_Manager.project_service.entity.ProjectMember;
import Task_Manager.project_service.entity.ProjectStatus;
import Task_Manager.project_service.kafka.ProjectEventPublisher;
import Task_Manager.project_service.mapper.ProjectMapper;
import Task_Manager.project_service.repository.ProjectMemberRepository;
import Task_Manager.project_service.repository.ProjectRepository;
import Task_Manager.project_service.service.ProjectService;

import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.exception.ForbiddenAccessException;
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
    private final TaskClient taskClient;
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

        ProjectEventDto event = projectMapper.toProjectCreatedEvent(
                savedProject.getId(), response, ownerId, userInfo.getName(), userInfo.getAvatar()
        );
        projectEventPublisher.publishProjectCreated(savedProject.getId(), event);

        return response;
    }

    @Override
    public ProjectResponse updateProject(UUID id, ProjectRequest request, UUID currentUserId) {
        Project project = findProjectOrThrow(id);

        projectMapper.updateEnityFromRequest(request, project);
        Project updatedProject = projectRepository.save(project);
        ProjectResponse response = projectMapper.toResponse(updatedProject);

        UserActionInfo userInfo = fetchUserActionInfo(currentUserId);

        ProjectEventDto event = projectMapper.toProjectUpdatedEvent(
                updatedProject.getId(), response, currentUserId, userInfo.getName(), userInfo.getAvatar()
        );
        projectEventPublisher.publishProjectUpdated(updatedProject.getId(), event);

        return response;
    }

    @Override
    public void deleteProject(UUID id, UUID currentUserId) {
        Project project = findProjectOrThrow(id);

        projectRepository.delete(project);

        UserActionInfo userInfo = fetchUserActionInfo(currentUserId);

        ProjectEventDto event = projectMapper.toProjectDeletedEvent(
                project.getId(), project.getName(), currentUserId, userInfo.getName()
        );
        projectEventPublisher.publishProjectDeleted(project.getId(), event);
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
                    return projectMemberRepository.existsByProjectIdAndUserIdAndProjectRole_NameIn(
                            projectId, userId, List.of("ADMIN")
                    );
                })
                .orElse(false);
    }

    @Override
    public ProjectResponse updateProjectStatus(UUID id, ProjectStatus newStatus, UUID currentUserId) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        project.setStatus(newStatus);
        project = projectRepository.save(project);


        return projectMapper.toResponse(project);
    }

    @Override
    public void autoCompleteProjectIfAllTasksDone(UUID projectId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null || project.getStatus() == ProjectStatus.COMPLETED) {
            return;
        }

        try {
            TaskStatisticsDto stats = taskClient.getTaskStatistics(projectId);

            if (stats.totalTasks() > 0 && stats.totalTasks() == stats.completedTasks()) {
                project.setStatus(ProjectStatus.COMPLETED);
                projectRepository.save(project);
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi kiểm tra task của project: " + e.getMessage());
        }
    }

    private Project findProjectOrThrow(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        Translator.toLocale("error.project.not_found", id)
                ));
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