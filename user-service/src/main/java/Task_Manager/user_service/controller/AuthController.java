package Task_Manager.user_service.controller;

import Task_Manager.common_lib.response.ApiResponse;
import Task_Manager.user_service.dto.AuthResponse;
import Task_Manager.user_service.dto.LoginRequest;
import Task_Manager.user_service.dto.RegisterRequest;
import Task_Manager.user_service.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<?>> register(@Valid @RequestBody RegisterRequest registerRequest){
        try {
            AuthResponse response = authService.register(registerRequest);
            return ResponseEntity.ok(ApiResponse.success(response, "Đăng kí tài khoản thành công !"));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "Đăng kí thất bại: " + ex.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<?>> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            AuthResponse response = authService.login(loginRequest);
            return ResponseEntity.ok(ApiResponse.success(response, "Đăng nhập tài khoản thành công !"));
        } catch (Exception ex) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "Đăng nhập thất bại: " + ex.getMessage()));
        }
    }
}
