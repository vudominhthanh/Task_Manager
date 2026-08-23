package Task_Manager.project_service.service;

import Task_Manager.project_service.dto.ProjectRequest;
import Task_Manager.project_service.dto.ProjectResponse;
import Task_Manager.project_service.entity.Project;
import Task_Manager.project_service.kafka.ProjectEventPublisher;
import Task_Manager.project_service.mapper.ProjectMapper;
import Task_Manager.project_service.repository.ProjectRepository;
import Task_Manager.project_service.client.UserClient;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final ProjectEventPublisher projectEventPublisher;

    private final UserClient userClient;
    private final ProjectMapper projectMapper;

    @Transactional
    public ProjectResponse createProject(ProjectRequest request, UUID ownerId) {
        if (!userClient.existsById(ownerId)) {
            throw new RuntimeException("Owner (User) không tồn tại!");
        }

        Project project = projectMapper.toEntity(request);
        project.setOwnerId(ownerId);

        Project savedProject = projectRepository.save(project);
        ProjectResponse response = projectMapper.toResponse(savedProject);

        projectEventPublisher.publishProjectCreated(savedProject.getId(), response);
        return projectMapper.toResponse(savedProject);
    }

    @Transactional
    public ProjectResponse updateProject(UUID id, ProjectRequest request, UUID currentUserId) {
        Project project = findProjectOrThrow(id);
        validateOwnership(project, currentUserId);

        projectMapper.updateEnityFromRequest(request, project);
        Project updateProject = projectRepository.save(project);
        ProjectResponse response = projectMapper.toResponse(updateProject);

        projectEventPublisher.publishProjectUpdated(updateProject.getId(), response);
        return response;
    }

    @Transactional
    public void deleteProject(UUID id, UUID currentUserId) {
        Project project = findProjectOrThrow(id);
        validateOwnership(project, currentUserId);

        projectRepository.delete(project);
        projectEventPublisher.publishProjectDeleted(project.getId());
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

    private void validateOwnership(Project project, UUID currentUserId) {
        if(!project.getOwnerId().equals(currentUserId)) {
            throw new RuntimeException("Bạn không có quyền thực hiện hành động này trên dự án");
        }
    }
}
