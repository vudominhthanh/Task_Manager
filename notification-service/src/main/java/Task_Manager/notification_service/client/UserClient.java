package Task_Manager.notification_service.client;

import Task_Manager.notification_service.dto.UserDto;
import lombok.Data;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "user-service", url = "http://localhost:8086")
public interface UserClient {
    @GetMapping("/api/users/{id}")
    UserDto getUserById(@PathVariable("id") UUID id);

    @PostMapping("/api/users/batch")
    List<UserDto> getUsersByIds(@RequestBody List<UUID> userIds);

    @GetMapping("/api/users/all-ids")
    List<UUID> getAllUsers();
}

