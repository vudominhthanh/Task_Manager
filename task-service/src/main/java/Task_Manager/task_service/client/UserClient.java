package Task_Manager.task_service.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.UUID;

@FeignClient(name = "user-service")
public interface UserClient {
    @GetMapping("/api/users/{userId}/exists")
    boolean existsById(@PathVariable("userId") UUID userId);
}