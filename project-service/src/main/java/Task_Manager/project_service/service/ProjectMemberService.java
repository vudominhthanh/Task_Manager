package Task_Manager.project_service.service;

import Task_Manager.project_service.dto.ProjectMemberRequest;
import Task_Manager.project_service.dto.ProjectResponse;
import Task_Manager.project_service.entity.Project;
import Task_Manager.project_service.entity.ProjectMember;
import Task_Manager.project_service.entity.ProjectRole;
import Task_Manager.project_service.kafka.ProjectEventPublisher;
import Task_Manager.project_service.repository.ProjectMemberRepository;
import Task_Manager.project_service.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectMemberService {
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectService projectService;
    private final ProjectEventPublisher projectEventPublisher;

    @Transactional
    public void addMember(UUID projectId, ProjectMemberRequest projectMemberRequest, UUID currentUserId) {
        Project project = findProjectOrThrow(projectId);
        validateAdminPermission(project, currentUserId);

        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, projectMemberRequest.getUserId())) {
            throw new RuntimeException("User này đã ở trong dự án rồi");
        }

        ProjectMember projectMember = ProjectMember.builder()
                .projectId(projectId)
                .userId(projectMemberRequest.getUserId())
                .projectRole(projectMemberRequest.getProjectRole() != null ? projectMemberRequest.getProjectRole() : ProjectRole.MEMBER)
                .build();

        projectMemberRepository.save(projectMember);
        projectEventPublisher.publishMemberAdded(projectId, Map.of(
                "addedUserId", projectMemberRequest.getUserId(),
                "role", projectMember.getProjectRole(),
                "addedBy", currentUserId
        ));
    }

    @Transactional
    public void removeMember(UUID projectId, UUID targetID, UUID currentUserId) {
        Project project = findProjectOrThrow(projectId);
        validateAdminPermission(project, currentUserId);

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, targetID)
                .orElseThrow(() -> new RuntimeException("Thành viên không tồn tại trong dự án"));
        projectMemberRepository.delete(member);

        projectEventPublisher.publishMemberRemoved(projectId, Map.of(
                "removedUserId", targetID,
                "removedBy", currentUserId
        ));
    }

    private Project findProjectOrThrow(UUID id) {
        return projectRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy dự án với ID: " + id));
    }

    private void validateAdminPermission(Project project, UUID currentUserId) {
        if (project.getOwnerId().equals(currentUserId)) return;

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(project.getId(), currentUserId)
                .orElseThrow(() -> new RuntimeException("Bạn không có quyền thực hiện hành động này"));

        if (member.getProjectRole() != ProjectRole.ADMIN) {
            throw new RuntimeException("Yêu cầu quyền ADMIN dự án để thực hiện thao tác");
        }
    }
}
