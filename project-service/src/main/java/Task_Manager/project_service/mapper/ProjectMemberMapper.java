//package Task_Manager.project_service.mapper;
//
//import Task_Manager.project_service.dto.ProjectMemberRequest;
//import Task_Manager.project_service.entity.ProjectMember;
//import org.mapstruct.Mapper;
//import org.mapstruct.Mapping;
//import org.mapstruct.NullValuePropertyMappingStrategy;
//
//import java.util.UUID;
//
//@Mapper(componentModel = "spring")
//public interface ProjectMemberMapper {
//    @Mapping(source = "projectId", target = "projectId")
//    @Mapping(source = "request.userId", target = "userId")
//    @Mapping(source = "request.projectRole", target = "projectRole", defaultValue = "MEMBER")
//    @Mapping(target = "project", ignore = true)
//    ProjectMember toEntity(UUID projectId, ProjectMemberRequest request);
//}
