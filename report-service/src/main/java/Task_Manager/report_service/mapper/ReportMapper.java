package Task_Manager.report_service.mapper;

import Task_Manager.report_service.dto.ReportResponse;
import Task_Manager.report_service.dto.OverViewResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

import java.math.BigDecimal;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ReportMapper {

    @Mapping(target = "progress", source = "completionRate")
    @Mapping(target = "isStarred", constant = "false")
    @Mapping(target = "lastActive", constant = "Hoạt động gần đây")
    OverViewResponse.QuickProject toQuickProject(ReportResponse.ProjectDropdownDto project, BigDecimal completionRate);
}