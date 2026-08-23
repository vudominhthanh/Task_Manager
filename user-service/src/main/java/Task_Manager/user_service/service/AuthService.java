package Task_Manager.user_service.service;

import Task_Manager.common_lib.exception.BusinessException;
import Task_Manager.user_service.dto.AuthResponse;
import Task_Manager.user_service.dto.LoginRequest;
import Task_Manager.user_service.dto.RegisterRequest;
import Task_Manager.user_service.entity.User;
import Task_Manager.user_service.kafka.AuthEventPublisher;
import Task_Manager.user_service.repository.UserRepository;
import Task_Manager.user_service.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthEventPublisher authEventPublisher;

    public AuthResponse register(RegisterRequest registerRequest) {
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            throw new BusinessException(400, "Username Already Exists");
        }
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new BusinessException(400, "Email Already Exists");
        }
        if (userRepository.existsByPhoneNumber(registerRequest.getPhoneNumber())) {
            throw new BusinessException(400, "Phone Already Exists");
        }
        User user = User.builder()
                .fullname(registerRequest.getFullname())
                .username(registerRequest.getUsername())
                .email(registerRequest.getEmail())
                .phoneNumber(registerRequest.getPhoneNumber())
                .passwordHash(passwordEncoder.encode(registerRequest.getPassword()))
                .build();

        userRepository.save(user);

        String token = jwtUtil.generateToken(user);

        AuthResponse response = AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .userName(user.getUsername())
                .role(user.getRole().name())
                .build();
        authEventPublisher.publishUserRegistered(user.getId(), response);
        return response;
    }

    public AuthResponse login(LoginRequest loginRequest) {
        String identifier = loginRequest.getEmailOrUsername();

        User user = userRepository.findByEmailOrUsername(identifier)
                .orElseThrow(() -> new BusinessException(404, "Tên đăng nhập hoặc email không tồn tại!"));

        if(!passwordEncoder.matches(loginRequest.getPassword(), user.getPasswordHash())) {
            throw new BusinessException(400, "Sai mật khẩu!");
        }

        if(!user.isActive()) {
            throw new BusinessException(400, "Tài khoản của bạn đã bị vô hiệu hóa!");
        }

        String token = jwtUtil.generateToken(user);

        AuthResponse response = AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .userName(user.getUsername())
                .role(user.getRole().name())
                .build();

        authEventPublisher.publishUserLoggedIn(user.getId(), response);
        return response;
    }
}
