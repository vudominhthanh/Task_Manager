package Task_Manager.project_service.mapper;

import Task_Manager.project_service.dto.ProjectMemberEventDto;
import Task_Manager.project_service.dto.ProjectMemberRequest;
import Task_Manager.project_service.dto.ProjectMemberResponse;
import Task_Manager.project_service.entity.Project;
import Task_Manager.project_service.entity.ProjectMember;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.util.UUID;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ProjectMemberMapper {

    @Mapping(target = "status", expression = "java(\"online\")")
    ProjectMemberResponse toResponse(ProjectMember projectMember);

    @Mapping(target = "projectId", source = "project.id")
    @Mapping(target = "projectName", source = "project.name")
    @Mapping(target = "actorId", source = "actorId")
    @Mapping(target = "actorName", source = "actorName")
    @Mapping(target = "targetUserId", source = "targetUserId")
    @Mapping(target = "targetName", source = "targetName")
    @Mapping(target = "role", source = "role")
    @Mapping(target = "eventType", source = "eventType")
    ProjectMemberEventDto toEventDto(Project project, UUID actorId, String actorName,
                                     UUID targetUserId, String targetName, String role, String eventType);

    default ProjectMemberEventDto toMemberAddedEvent(Project project, UUID actorId, String actorName, UUID targetUserId, String targetName, String role) {
        return toEventDto(project, actorId, actorName, targetUserId, targetName, role, "MEMBER_ADDED");
    }

    default ProjectMemberEventDto toMemberRemovedEvent(Project project, UUID actorId, String actorName, UUID targetUserId, String targetName) {
        return toEventDto(project, actorId, actorName, targetUserId, targetName, null, "MEMBER_REMOVED");
    }

    default ProjectMemberEventDto toMemberRoleUpdatedEvent(Project project, UUID actorId, String actorName, UUID targetUserId, String targetName, String role) {
        return toEventDto(project, actorId, actorName, targetUserId, targetName, role, "MEMBER_ROLE_UPDATED");
    }
}