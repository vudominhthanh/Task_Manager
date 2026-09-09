package Task_Manager.report_service.client;

import Task_Manager.report_service.dto.OverViewResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "activity-service", url = "${application.config.activity-service-url:http://localhost:8081}")
public interface ActivityClient {
    @GetMapping("/api/activities/recent")
    List<OverViewResponse.ActivityDto> getRecentActivitiesByUserId(@RequestParam("userId") UUID userId);
}