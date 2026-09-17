package Task_Manager.project_service.service.impl;

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
import Task_Manager.project_service.service.ProjectMemberService;

import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.exception.ForbiddenAccessException;
import Task_Manager.common_lib.exception.BusinessRuleException;
import Task_Manager.common_lib.utils.Translator;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProjectMemberServiceImpl implements ProjectMemberService {

    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberMapper projectMemberMapper;
    private final ProjectEventPublisher projectEventPublisher;
    private final UserClient userClient;

    @Override
    public void addMember(UUID projectId, ProjectMemberRequest projectMemberRequest, UUID currentUserId, boolean isSystemAdmin) {
        Project project = findProjectOrThrow(projectId);
        validateAdminPermission(project, currentUserId, isSystemAdmin);

        if (projectMemberRequest.getEmail() == null || projectMemberRequest.getEmail().trim().isEmpty()) {
            throw new BusinessRuleException(Translator.toLocale("error.member.email_empty"));
        }

        UserDto targetUser = fetchUserByEmailOrThrow(projectMemberRequest.getEmail().trim());
        UUID targetUserId = targetUser.getId();

        if (projectMemberRepository.existsByProjectIdAndUserId(projectId, targetUserId)) {
            throw new BusinessRuleException(Translator.toLocale("error.member.already_exists"));
        }

        ProjectRole role = projectMemberRequest.getProjectRole() != null ? projectMemberRequest.getProjectRole() : ProjectRole.MEMBER;

        ProjectMember projectMember = ProjectMember.builder()
                .projectId(projectId)
                .userId(targetUserId)
                .projectRole(role)
                .build();

        projectMemberRepository.save(projectMember);

        String actorName = fetchUserName(currentUserId);
        String targetName = resolveFullName(targetUser);

        projectEventPublisher.publishMemberAdded(projectId, Map.of(
                "projectId", projectId,
                "addedUserId", targetUserId,
                "role", role,
                "addedBy", currentUserId,
                "username", actorName,
                "projectName", project.getName(),
                "targetName", targetName
        ));
    }

    @Override
    public void removeMember(UUID projectId, UUID targetID, UUID currentUserId, boolean isSystemAdmin) {
        Project project = findProjectOrThrow(projectId);
        validateAdminPermission(project, currentUserId, isSystemAdmin);

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, targetID)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.member.not_found")));

        if (project.getOwnerId() != null && project.getOwnerId().equals(targetID)) {
            throw new BusinessRuleException(Translator.toLocale("error.member.cannot_remove_owner"));
        }

        projectMemberRepository.delete(member);

        String actorName = fetchUserName(currentUserId);
        String targetName = fetchUserName(targetID);

        projectEventPublisher.publishMemberRemoved(projectId, Map.of(
                "projectId", projectId,
                "removedUserId", targetID,
                "removedBy", currentUserId,
                "username", actorName,
                "projectName", project.getName(),
                "targetName", targetName
        ));
    }

    @Override
    public void updateMemberRole(UUID projectId, UUID targetUserId, String newRole, UUID currentUserId, boolean isSystemAdmin) {
        Project project = findProjectOrThrow(projectId);
        validateAdminPermission(project, currentUserId, isSystemAdmin);

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(projectId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.member.not_found")));

        member.setProjectRole(ProjectRole.valueOf(newRole));
        projectMemberRepository.save(member);

        String actorName = fetchUserName(currentUserId);
        String targetName = fetchUserName(targetUserId);

        projectEventPublisher.publishMemberRoleUpdated(projectId, Map.of(
                "projectId", projectId,
                "updatedUserId", targetUserId,
                "newRole", newRole,
                "updatedBy", currentUserId,
                "username", actorName,
                "projectName", project.getName(),
                "targetName", targetName
        ));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean checkProjectAdmin(UUID projectId, UUID userId) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project != null && project.getOwnerId() != null && project.getOwnerId().equals(userId)) {
            return true;
        }
        return projectMemberRepository.existsByProjectIdAndUserIdAndProjectRoleIn(projectId, userId, List.of(ProjectRole.ADMIN));
    }

    @Override
    public List<ProjectMemberResponse> getMembersByProjectId(UUID projectId, UUID currentUserId) {
        Project project = findProjectOrThrow(projectId);
        List<ProjectMember> members = projectMemberRepository.findByProjectId(projectId);

        if (project.getOwnerId() != null) {
            boolean ownerExists = members.stream().anyMatch(m -> m.getUserId().equals(project.getOwnerId()));
            if (!ownerExists) {
                ProjectMember ownerMember = ProjectMember.builder()
                        .projectId(projectId)
                        .userId(project.getOwnerId())
                        .projectRole(ProjectRole.ADMIN)
                        .build();
                members = new ArrayList<>(members);
                members.add(ownerMember);
            }
        }

        return mapMembersWithFullName(members);
    }

    @Override
    public List<ProjectMemberResponse> getAllMembersInMyProjects(UUID currentUserId) {
        List<ProjectMember> members = projectMemberRepository.findAllMembersInMyProjects(currentUserId);
        return mapMembersWithFullName(members);
    }

    private Project findProjectOrThrow(UUID id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.project.not_found", id)));
    }

    private void validateAdminPermission(Project project, UUID currentUserId, boolean isSystemAdmin) {
        if (isSystemAdmin || project.getOwnerId().equals(currentUserId)) return;

        ProjectMember member = projectMemberRepository.findByProjectIdAndUserId(project.getId(), currentUserId)
                .orElseThrow(() -> new ForbiddenAccessException(Translator.toLocale("error.member.permission_denied")));

        if (member.getProjectRole() != ProjectRole.ADMIN) {
            throw new ForbiddenAccessException(Translator.toLocale("error.member.admin_required"));
        }
    }

    private UserDto fetchUserByEmailOrThrow(String email) {
        try {
            UserDto targetUser = userClient.getUserByEmail(email);
            if (targetUser == null || targetUser.getId() == null) {
                throw new BusinessRuleException(Translator.toLocale("error.member.not_registered"));
            }
            return targetUser;
        } catch (Exception e) {
            throw new ResourceNotFoundException(Translator.toLocale("error.member.user_not_found", email));
        }
    }

    private String fetchUserName(UUID userId) {
        try {
            UserDto user = userClient.getUserById(userId);
            if (user != null) {
                return resolveFullName(user);
            }
        } catch (Exception e) {
            log.warn("Lỗi khi lấy thông tin user ID: {}", userId, e);
        }
        return "Thành viên";
    }

    private String resolveFullName(UserDto user) {
        return (user.getFullName() != null && !user.getFullName().trim().isEmpty())
                ? user.getFullName()
                : user.getUsername();
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
                .collect(Collectors.toMap(ProjectMemberResponse::getUserId, ProjectMemberResponse::getFullName, (existing, replacement) -> existing));

        Map<UUID, String> emailMap = userResponses.stream()
                .collect(Collectors.toMap(ProjectMemberResponse::getUserId, ProjectMemberResponse::getEmail, (existing, replacement) -> existing));

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
}