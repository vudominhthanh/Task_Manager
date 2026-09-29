package Task_Manager.project_service.service;

import Task_Manager.project_service.dto.ProjectMemberRequest;
import Task_Manager.project_service.dto.ProjectMemberResponse;

import java.util.List;
import java.util.UUID;

public interface ProjectMemberService {
    void addMember(UUID projectId, ProjectMemberRequest projectMemberRequest, UUID currentUserId);

    void removeMember(UUID projectId, UUID targetID, UUID currentUserId);

    void updateMemberRole(UUID projectId, UUID targetUserId, String newRole, UUID currentUserId);

    boolean checkProjectAdmin(UUID projectId, UUID userId);

    List<ProjectMemberResponse> getMembersByProjectId(UUID projectId, UUID currentUserId);

    List<ProjectMemberResponse> getAllMembersInMyProjects(UUID currentUserId);
}