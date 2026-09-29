package Task_Manager.project_service.mapper;

import Task_Manager.project_service.dto.ProjectEventDto;
import Task_Manager.project_service.dto.ProjectRequest;
import Task_Manager.project_service.dto.ProjectResponse;
import Task_Manager.project_service.entity.Project;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.util.UUID;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ProjectMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "ownerId", ignore = true)
    @Mapping(target = "status", ignore = true)
    Project toEntity(ProjectRequest projectRequest);

    ProjectResponse toResponse(Project project);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "ownerId", ignore = true)
    @Mapping(target = "status", ignore = true)
    void updateEnityFromRequest(ProjectRequest projectRequest, @MappingTarget Project project);

    @Mapping(target = "eventType", source = "eventType")
    @Mapping(target = "projectId", source = "projectId")
    @Mapping(target = "project", source = "project")
    @Mapping(target = "actorId", source = "actorId")
    @Mapping(target = "username", source = "actorName")
    @Mapping(target = "userAvatar", source = "userAvatar")
    @Mapping(target = "projectName", source = "projectName")
    @Mapping(target = "targetName", source = "targetName")
    ProjectEventDto toEventDto(String eventType, UUID projectId, ProjectResponse project,
                               UUID actorId, String actorName, String userAvatar,
                               String projectName, String targetName);

    default ProjectEventDto toProjectCreatedEvent(UUID projectId, ProjectResponse project, UUID actorId, String actorName, String userAvatar) {
        return toEventDto("PROJECT_CREATED", projectId, project, actorId, actorName, userAvatar, project.getName(), project.getName());
    }

    default ProjectEventDto toProjectUpdatedEvent(UUID projectId, ProjectResponse project, UUID actorId, String actorName, String userAvatar) {
        return toEventDto("PROJECT_UPDATED", projectId, project, actorId, actorName, userAvatar, project.getName(), project.getName());
    }

    default ProjectEventDto toProjectDeletedEvent(UUID projectId, String projectName, UUID actorId, String actorName) {
        return toEventDto("PROJECT_DELETED", projectId, null, actorId, actorName, null, projectName, projectName);
    }
}
