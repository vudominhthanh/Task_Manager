package Task_Manager.project_service.service;

import Task_Manager.project_service.dto.ProjectMemberRequest;
import Task_Manager.project_service.dto.ProjectMemberResponse;

import java.util.List;
import java.util.UUID;

public interface ProjectMemberService {
    void addMember(UUID projectId, ProjectMemberRequest projectMemberRequest, UUID currentUserId, boolean isSystemAdmin);

    void removeMember(UUID projectId, UUID targetID, UUID currentUserId, boolean isSystemAdmin);

    void updateMemberRole(UUID projectId, UUID targetUserId, String newRole, UUID currentUserId, boolean isSystemAdmin);

    boolean checkProjectAdmin(UUID projectId, UUID userId);

    List<ProjectMemberResponse> getMembersByProjectId(UUID projectId, UUID currentUserId);

    List<ProjectMemberResponse> getAllMembersInMyProjects(UUID currentUserId);
}