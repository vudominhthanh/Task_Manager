package Task_Manager.notification_service.client;

import Task_Manager.notification_service.dto.UserDto;
import lombok.Data;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(name = "user-service", url = "http://localhost:8080")
public interface UserClient {
    @GetMapping("/api/users/{id}")
    UserDto getUserById(@PathVariable("id") UUID id);
}

