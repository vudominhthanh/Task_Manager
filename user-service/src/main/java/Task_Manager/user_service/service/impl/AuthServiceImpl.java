package Task_Manager.user_service.service.impl;

import Task_Manager.common_lib.exception.BusinessRuleException;
import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.utils.Translator;
import Task_Manager.user_service.dto.AuthResponse;
import Task_Manager.user_service.dto.LoginRequest;
import Task_Manager.user_service.dto.RegisterRequest;
import Task_Manager.user_service.dto.VerifyOtpRequest; // DTO nhận { email, otp, registerRequest }
import Task_Manager.user_service.entity.EmailVerification;
import Task_Manager.user_service.entity.User;
import Task_Manager.user_service.kafka.AuthEventPublisher;
import Task_Manager.user_service.repository.EmailVerificationRepository;
import Task_Manager.user_service.repository.UserRepository;
import Task_Manager.user_service.security.JwtUtil;
import Task_Manager.user_service.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationRepository verificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthEventPublisher authEventPublisher;

    public void initiateRegister(RegisterRequest request) {
        validateNewUser(request);

        String email = request.getEmail().trim().toLowerCase();
        String otp = String.format("%06d", new SecureRandom().nextInt(1_000_000));

        EmailVerification verification = EmailVerification.builder()
                .email(email)
                .otpCode(otp)
                .expiryTime(Instant.now().plus(5, ChronoUnit.MINUTES))
                .build();
        verificationRepository.save(verification);

        Map<String, Object> emailPayload = Map.of(
                "email", email,
                "otp", otp,
                "fullName", request.getFullname() != null ? request.getFullname() : request.getUsername()
        );
        authEventPublisher.publishOtpCreated(emailPayload);

//        log.info("🔑 [TEST OTP CONSOLE] Mã xác thực của [{}] là: {}", email, otp);
    }

    @Transactional
    public AuthResponse verifyAndRegister(VerifyOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        EmailVerification verification = verificationRepository.findById(email)
                .orElseThrow(() -> new BusinessRuleException("Yêu cầu xác thực không tồn tại hoặc đã hết hạn!"));

        if (verification.getExpiryTime().isBefore(Instant.now())) {
            verificationRepository.delete(verification);
            throw new BusinessRuleException("Mã OTP đã hết hiệu lực (quá 5 phút). Vui lòng lấy mã mới!");
        }

        if (!verification.getOtpCode().equals(request.getOtp().trim())) {
            throw new BusinessRuleException("Mã OTP không chính xác!");
        }

        User user = User.builder()
                .fullname(request.getFullname())
                .username(request.getUsername())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);
        verificationRepository.delete(verification);

        AuthResponse response = buildAuthResponse(user);
        publishAuthEvent(user, "REGISTER");

        return response;
    }

    @Override
    public AuthResponse register(RegisterRequest request) {
        validateNewUser(request);

        User user = User.builder()
                .fullname(request.getFullname())
                .username(request.getUsername())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        userRepository.save(user);

        AuthResponse response = buildAuthResponse(user);
        publishAuthEvent(user, "REGISTER");

        return response;
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailOrUsername(request.getEmailOrUsername())
                .orElseThrow(() -> new ResourceNotFoundException(Translator.toLocale("error.auth.user_not_found")));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException(Translator.toLocale("error.auth.wrong_password"));
        }

        if (!user.isActive()) {
            throw new BusinessRuleException(Translator.toLocale("error.auth.account_disabled"));
        }

        AuthResponse response = buildAuthResponse(user);
        publishAuthEvent(user, "LOGIN");

        return response;
    }

    public AuthResponse refreshToken(String refreshToken) {
        String userIdStr = jwtUtil.extractUsername(refreshToken);
        if (userIdStr != null && jwtUtil.isTokenValid(refreshToken, userIdStr)) {
            User user = userRepository.findById(java.util.UUID.fromString(userIdStr))
                    .orElseThrow(() -> new BusinessRuleException("User không tồn tại"));
            if (!user.isActive()) {
                throw new BusinessRuleException("Tài khoản đã bị vô hiệu hóa");
            }
            return buildAuthResponse(user);
        }
        throw new BusinessRuleException("Refresh Token không hợp lệ hoặc đã hết hạn");
    }

    private void validateNewUser(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessRuleException(Translator.toLocale("error.auth.username_exists"));
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessRuleException(Translator.toLocale("error.auth.email_exists"));
        }
        if (userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new BusinessRuleException(Translator.toLocale("error.auth.phone_exists"));
        }
    }

    private AuthResponse buildAuthResponse(User user) {
        String token = jwtUtil.generateToken(user);
        String refreshToken = jwtUtil.generateRefreshToken(user);
        return AuthResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .email(user.getEmail())
                .userName(user.getUsername())
                .fullName(user.getFullname())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole().name())
                .build();
    }

    private void publishAuthEvent(User user, String eventType) {
        Map<String, Object> safeUserInfo = Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "fullName", user.getFullname()
        );

        String avatarLetter = (user.getFullname() != null && !user.getFullname().trim().isEmpty())
                ? String.valueOf(user.getFullname().trim().charAt(0)).toUpperCase()
                : "U";

        Map<String, Object> payload = new HashMap<>(Map.of(
                "user", safeUserInfo,
                "username", user.getUsername(),
                "fullName", user.getFullname(),
                "targetName", user.getUsername(),
                "userAvatar", avatarLetter
        ));

        if ("REGISTER".equals(eventType)) {
            payload.put("avatarColor", "bg-indigo-600");
            payload.put("createdBy", user.getId());
            authEventPublisher.publishUserRegistered(user.getId(), payload);
        } else if ("LOGIN".equals(eventType)) {
            payload.put("avatarColor", "bg-emerald-600");
            payload.put("loggedInBy", user.getId());
            authEventPublisher.publishUserLoggedIn(user.getId(), payload);
        }
    }
}