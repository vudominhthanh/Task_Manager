package Task_Manager.report_service.client;

import Task_Manager.report_service.dto.ReportResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "project-service")
public interface ProjectClient {

    @GetMapping("/api/projects/my-project-ids")
    List<UUID> getProjectIdsByUserId();

    @PostMapping("/api/projects/batch")
    List<ReportResponse.ProjectDropdownDto> getProjectsByIds(@RequestBody List<UUID> projectIds);

    @GetMapping("/api/projects/my-members")
    List<ReportResponse.ProjectMemberDto> getMyProjectsMembers();

    @GetMapping("/api/projects/{projectId}/members")
    List<ReportResponse.ProjectMemberDto> getProjectMembers(@PathVariable("projectId") UUID projectId);
}