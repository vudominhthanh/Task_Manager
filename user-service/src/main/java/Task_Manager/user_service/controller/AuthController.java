package Task_Manager.user_service.controller;

import Task_Manager.user_service.dto.*;
import Task_Manager.user_service.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;
//đnawg kí
    @PostMapping("/register/init")
    public ResponseEntity<Map<String, String>> initiateRegister(@Valid @RequestBody RegisterRequest registerRequest) {
        authService.initiateRegister(registerRequest);
        return ResponseEntity.ok(Map.of("message", "Mã xác thực OTP đã được gửi tới email của bạn!"));
    }

    @PostMapping("/register/verify")
    public ResponseEntity<AuthResponse> verifyAndRegister(@Valid @RequestBody VerifyOtpRequest verifyRequest) {
        return ResponseEntity.ok(authService.verifyAndRegister(verifyRequest));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        return ResponseEntity.ok(authService.register(registerRequest));
    }

    // sau login
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.login(loginRequest));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(authService.refreshToken(refreshToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(@RequestBody Map<String, String> request) {
        String refreshToken = request.get("refreshToken");
        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken);
        }
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công!"));
    }


    //google và 2fa
    @PostMapping("/login/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        return ResponseEntity.ok(authService.googleLogin(request));
    }

    @PostMapping("/login/2fa-verify")
    public ResponseEntity<AuthResponse> verify2FaLogin(@Valid @RequestBody TwoFactorRequest request) {
        return ResponseEntity.ok(authService.verify2FaLogin(request));
    }


//pass control
    @PostMapping("/password/forgot")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(Map.of("message", "Mã xác thực đã được gửi đến email của bạn."));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Đổi mật khẩu thành công. Vui lòng đăng nhập lại."));
    }


    //check 2fa
    @PostMapping("/2fa/setup")
    public ResponseEntity<TwoFactorSetupResponse> setup2FA(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        UUID userId = UUID.fromString(principal.getName());
        return ResponseEntity.ok(authService.generate2FaSecret(userId));
    }

    @PostMapping("/2fa/enable")
    public ResponseEntity<Map<String, String>> enable2FA(
            Principal principal,
            @Valid @RequestBody TwoFactorRequest request) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        UUID userId = UUID.fromString(principal.getName());
        authService.verifyAndEnable2Fa(userId, request);
        return ResponseEntity.ok(Map.of("message", "Tính năng bảo mật 2 lớp đã được bật thành công!"));
    }
}