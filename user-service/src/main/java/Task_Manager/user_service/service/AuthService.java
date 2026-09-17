package Task_Manager.user_service.service;

import Task_Manager.user_service.dto.AuthResponse;
import Task_Manager.user_service.dto.LoginRequest;
import Task_Manager.user_service.dto.RegisterRequest;
import Task_Manager.user_service.dto.VerifyOtpRequest;

public interface AuthService {
    void initiateRegister(RegisterRequest request);
    AuthResponse verifyAndRegister(VerifyOtpRequest request);
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse refreshToken(String refreshToken);
}