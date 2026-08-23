package Task_Manager.user_service.controller;


import Task_Manager.user_service.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

public class UserController {
    private UserRepository userRepository;

    @GetMapping("/{userId}/exists")
    public ResponseEntity<Boolean> checkUserExists(@PathVariable UUID userId) {
        boolean exists = userRepository.existsById(userId);
        return ResponseEntity.ok(exists);
    }
}
