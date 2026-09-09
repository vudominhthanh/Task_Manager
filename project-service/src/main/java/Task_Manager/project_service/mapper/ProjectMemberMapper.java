package Task_Manager.project_service.mapper;

import Task_Manager.project_service.dto.ProjectMemberRequest;
import Task_Manager.project_service.dto.ProjectMemberResponse;
import Task_Manager.project_service.entity.ProjectMember;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ProjectMemberMapper {

    @Mapping(target = "status", expression = "java(\"online\")")
    ProjectMemberResponse toResponse(ProjectMember projectMember);
}