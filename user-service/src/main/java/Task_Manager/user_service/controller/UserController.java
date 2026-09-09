package Task_Manager.user_service.controller;


import Task_Manager.user_service.dto.MemberProjectDto;
import Task_Manager.user_service.dto.UserResponse;
import Task_Manager.user_service.entity.User;
import Task_Manager.user_service.repository.UserRepository;
import Task_Manager.user_service.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserRepository userRepository;
    private final UserService userService;

    @GetMapping("/{userId}/exists")
    public ResponseEntity<Boolean> checkUserExists(@PathVariable UUID userId) {
        boolean exists = userRepository.existsById(userId);
        return ResponseEntity.ok(exists);
    }

    @PostMapping("/batch")
    public ResponseEntity<List<MemberProjectDto>> getUsersByIds(@RequestBody List<UUID> userIds) {
        List<User> users = userRepository.findAllById(userIds);

        List<MemberProjectDto> response = users.stream().map(user -> {
            MemberProjectDto dto = new MemberProjectDto();
            dto.setUserId(user.getId());
            dto.setUsername(user.getUsername());
            dto.setFullName(user.getFullname());
            dto.setEmail(user.getEmail());
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID userId) {
        UserResponse response = userService.getUserById(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/email")
    public ResponseEntity<UserResponse> getUserByEmail(@RequestParam("email") String email) {
        return ResponseEntity.ok(userService.findByEmail(email));
    }
}
