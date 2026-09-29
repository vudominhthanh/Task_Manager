package Task_Manager.user_service.service;

import Task_Manager.user_service.dto.*;

import java.util.UUID;

public interface AuthService {
    void initiateRegister(RegisterRequest request);
    AuthResponse verifyAndRegister(VerifyOtpRequest request);
    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);
    AuthResponse googleLogin(GoogleLoginRequest request);
    AuthResponse refreshToken(String refreshToken);
    void logout(String refreshToken);

    void forgotPassword(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);

    TwoFactorSetupResponse generate2FaSecret(UUID userId);
    void verifyAndEnable2Fa(UUID userId, TwoFactorRequest request);
    AuthResponse verify2FaLogin(TwoFactorRequest request);
}