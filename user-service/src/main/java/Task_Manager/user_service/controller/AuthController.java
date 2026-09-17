package Task_Manager.user_service.controller;

import Task_Manager.user_service.dto.AuthResponse;
import Task_Manager.user_service.dto.LoginRequest;
import Task_Manager.user_service.dto.RegisterRequest;
import Task_Manager.user_service.dto.VerifyOtpRequest;
import Task_Manager.user_service.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register/init")
    public ResponseEntity<?> initiateRegister(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            authService.initiateRegister(registerRequest);
            return ResponseEntity.ok(Map.of("message", "Mã xác thực OTP đã được gửi tới email của bạn!"));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Không thể gửi mã xác thực: " + ex.getMessage()));
        }
    }

    @PostMapping("/register/verify")
    public ResponseEntity<?> verifyAndRegister(@Valid @RequestBody VerifyOtpRequest verifyRequest) {
        try {
            AuthResponse response = authService.verifyAndRegister(verifyRequest);
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Xác thực thất bại: " + ex.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            AuthResponse response = authService.register(registerRequest);
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Đăng ký thất bại: " + ex.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            AuthResponse response = authService.login(loginRequest);
            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Đăng nhập thất bại: " + ex.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(authService.refreshToken(refreshToken));
    }
}