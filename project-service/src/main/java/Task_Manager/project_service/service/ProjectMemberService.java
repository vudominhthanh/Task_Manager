package Task_Manager.project_service.service;

import Task_Manager.project_service.client.UserClient;
import Task_Manager.project_service.dto.ProjectMemberRequest;
import Task_Manager.project_service.dto.ProjectMemberResponse;
import Task_Manager.project_service.dto.UserDto;
import Task_Manager.project_service.entity.Project;
import Task_Manager.project_service.entity.ProjectMember;
import Task_Manager.project_service.entity.ProjectRole;
import Task_Manager.project_service.kafka.ProjectEventPublisher;
import Task_Manager.project_service.mapper.ProjectMemberMapper;
import Task_Manager.project_service.repository.ProjectMemberRepository;
import Task_Manager.project_service.repository.ProjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectMemberService {
    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberMapper projectMemberMapper;
    private final ProjectEventPublisher projectEventPublisher;
    private final UserClient userClient;

    public void addMember(UUID projectId, ProjectMemberRequest projectMemberRequest, UUID currentUserId, boolean isSystemAdmin) {
        Project project = findProjectOrThrow(projectId);
        validateAdminPermission(project, currentUserId, isSystemAdmin);

        if (projectMemberRequest.getEmail() == null || projectMemberRequest.getEmail().trim().isEmpty()) {
            throw new RuntimeException("Email không được để trống");
        }

        UserDto targetUser;
        try {
            targetUser = userClient.getUserByEmail(projectMemberRequest.getEmail().trim());
        } catch (Exception e) {
            throw new RuntimeException("Không tìm thấy người dùng với email: " + projectMemberRequest.getEmail());
        }
        if (targetUser == null || targetUser.getId() == null) {
            throw new RuntimeException("Email này chưa đăng ký tài khoản trên hệ thống");
        }

        UUID targetUserId = targetUser.getId();

        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, targetUserId)) {
            throw new RuntimeException("User này đã ở trong dự án rồi");
        }

        ProjectRole role = projectMemberRequest.getProjectRole() != null ? projectMemberRequest.getProjectRole() : ProjectRole.MEMBER;

        ProjectMember projectMember = ProjectMember.builder()
                .projectId(projectId)
                .userId(targetUserId)
                .projectRole(role)
                .build();

        projectMemberRepository.save(projectMember);

        String actorName = "Thành viên";
        try {
            UserDto actor = userClient.getUserById(currentUserId);
            if (actor != null) actorName = actor.getFullName() != null ? actor.getFullName() : actor.getUsername();
        } catch (Exception ignored) {}

        String targetName = targetUser.getFullName() != null ? targetUser.getFullName() : targetUser.getUsername();

        projectEventPublisher.publishMemberAdded(projectId, Map.of(
                "addedUserId", targetUserId,
                "role", role,
                "addedBy", currentUserId,
                "username", actorName,
                "projectName", project.getName(),
                "targetName", targetName
        ));
    }

    public void removeMember(UUID projectId, UUID targetID, UUID currentUserId, boolean isSystemAdmin) {
        Project project = findProjectOrThrow(projectId);
        validateAdminPermission(project, currentUserId, isSystemAdmin);

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, targetID)
                .orElseThrow(() -> new RuntimeException("Thành viên không tồn tại trong dự án"));

        if (project.getOwnerId() != null && project.getOwnerId().equals(targetID)) {
            throw new RuntimeException("Không thể xóa chủ sở hữu khỏi dự án");
        }

        projectMemberRepository.delete(member);

        String actorName = "Thành viên";
        String targetName = "Thành viên";
        try {
            UserDto actor = userClient.getUserById(currentUserId);
            if (actor != null) actorName = actor.getFullName() != null ? actor.getFullName() : actor.getUsername();

            UserDto target = userClient.getUserById(targetID);
            if (target != null) targetName = target.getFullName() != null ? target.getFullName() : target.getUsername();
        } catch (Exception ignored) {}

        projectEventPublisher.publishMemberRemoved(projectId, Map.of(
                "removedUserId", targetID,
                "removedBy", currentUserId,
                "username", actorName,
                "projectName", project.getName(),
                "targetName", targetName
        ));
    }

    public void updateMemberRole(UUID projectId, UUID targetUserId, String newRole, UUID currentUserId, boolean isSystemAdmin) {
        Project project = findProjectOrThrow(projectId);
        validateAdminPermission(project, currentUserId, isSystemAdmin);

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Thành viên không tồn tại trong dự án"));

        member.setProjectRole(ProjectRole.valueOf(newRole));
        projectMemberRepository.save(member);

        String actorName = "Thành viên";
        String targetName = "Thành viên";
        try {
            UserDto actor = userClient.getUserById(currentUserId);
            if (actor != null) actorName = actor.getFullName() != null ? actor.getFullName() : actor.getUsername();

            UserDto target = userClient.getUserById(targetUserId);
            if (target != null) targetName = target.getFullName() != null ? target.getFullName() : target.getUsername();
        } catch (Exception ignored) {}

        projectEventPublisher.publishMemberRoleUpdated(projectId, Map.of(
                "updatedUserId", targetUserId,
                "newRole", newRole,
                "updatedBy", currentUserId,
                "username", actorName,
                "projectName", project.getName(),
                "targetName", targetName
        ));
    }

    @Transactional(readOnly = true)
    public boolean checkProjectAdmin(UUID projectId, UUID userId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project != null && project.getOwnerId() != null && project.getOwnerId().equals(userId)) {
            return true;
        }

        List<ProjectRole> adminRoles = List.of(ProjectRole.ADMIN);

        return projectMemberRepository.existsByProjectIdAndUserIdAndProjectRoleIn(projectId, userId, adminRoles);
    }

    public List<ProjectMemberResponse> getMembersByProjectId(UUID projectId, UUID currentUserId) {
        Project project = findProjectOrThrow(projectId);
        List<ProjectMember> members = projectMemberRepository.findByProjectId(projectId);

        if (project.getOwnerId() != null) {
            boolean ownerExists = members.stream()
                    .anyMatch(m -> m.getUserId().equals(project.getOwnerId()));

            if (!ownerExists) {
                ProjectMember ownerMember = ProjectMember.builder()
                        .projectId(projectId)
                        .userId(project.getOwnerId())
                        .projectRole(ProjectRole.ADMIN)
                        .build();
                members = new java.util.ArrayList<>(members);
                members.add(ownerMember);
            }
        }

        return mapMembersWithFullName(members);
    }

    public List<ProjectMemberResponse> getAllMembersInMyProjects(UUID currentUserId) {
        List<ProjectMember> members = projectMemberRepository.findAllMembersInMyProjects(currentUserId);

        return mapMembersWithFullName(members);
    }

    private List<ProjectMemberResponse> mapMembersWithFullName(List<ProjectMember> members) {
        if (members == null || members.isEmpty()) {
            return List.of();
        }

        List<UUID> userIds = members.stream()
                .map(ProjectMember::getUserId)
                .distinct()
                .collect(Collectors.toList());


        List<ProjectMemberResponse> userResponses = userClient.getUsersByIds(userIds);

        Map<UUID, String> fullNameMap = userResponses.stream()
                .collect(Collectors.toMap(
                        dto -> dto.getUserId(),
                        dto -> dto.getFullName(),
                        (existing, replacement) -> existing
                ));

        Map<UUID, String> emailMap = userResponses.stream()
                .collect(Collectors.toMap(
                        dto -> dto.getUserId(),
                        dto -> dto.getEmail(),
                        (existing, replacement) -> existing
                ));

        return members.stream()
                .distinct()
                .map(member -> {
                    ProjectMemberResponse response = projectMemberMapper.toResponse(member);
                    response.setFullName(fullNameMap.get(member.getUserId()));
                    response.setEmail(emailMap.get(member.getUserId()));
                    response.setRole(member.getProjectRole().name());
                    return response;
                })
                .collect(Collectors.toList());
    }

    private Project findProjectOrThrow(UUID id) {
        return projectRepository.findById(id).orElseThrow(() -> new RuntimeException("Không tìm thấy dự án với ID: " + id));
    }

    private void validateAdminPermission(Project project, UUID currentUserId, boolean isSystemAdmin) {
        if (isSystemAdmin) return;
        if (project.getOwnerId().equals(currentUserId)) return;

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(project.getId(), currentUserId)
                .orElseThrow(() -> new RuntimeException("Bạn không có quyền thực hiện hành động này"));

        if (member.getProjectRole() != ProjectRole.ADMIN) {
            throw new RuntimeException("Yêu cầu quyền ADMIN dự án để thực hiện thao tác");
        }
    }
}
