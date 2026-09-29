package Task_Manager.project_service.client;

import Task_Manager.common_lib.security.FeignJwtInterceptor;
import Task_Manager.project_service.dto.ProjectMemberResponse;
import Task_Manager.project_service.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "user-service", url = "http://localhost:8086", configuration = FeignJwtInterceptor.class)
public interface UserClient {
    @GetMapping("/api/users/{userId}/exists")
    boolean existsById(@PathVariable("userId") UUID userId);

    @PostMapping("/api/users/batch")
    List<ProjectMemberResponse> getUsersByIds(@RequestBody List<UUID> userIds);

    @GetMapping("/api/users/email")
    UserDto getUserByEmail(@RequestParam("email") String email);

    @GetMapping("/api/users/{userId}")
    UserDto getUserById(@PathVariable("userId") UUID userId);
}