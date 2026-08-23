package Task_Manager.project_service.mapper;

import Task_Manager.project_service.dto.ProjectRequest;
import Task_Manager.project_service.dto.ProjectResponse;
import Task_Manager.project_service.entity.Project;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ProjectMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "ownerId", ignore = true)
    Project toEntity(ProjectRequest projectRequest);

    ProjectResponse toResponse(Project project);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "ownerId", ignore = true)
    void updateEnityFromRequest(ProjectRequest projectRequest, @MappingTarget Project project);
}
