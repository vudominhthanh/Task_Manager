package Task_Manager.task_service.client;

import Task_Manager.common_lib.security.FeignJwtInterceptor;
import Task_Manager.task_service.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "user-service", url = "http://localhost:8086", configuration = FeignJwtInterceptor.class)
public interface UserClient {
    @GetMapping("/api/users/{userId}/exists")
    boolean existsById(@PathVariable("userId") UUID userId);

    @PostMapping("/api/users/batch")
    List<UserDto> getUsersByIds(@RequestBody List<UUID> userIds);
}