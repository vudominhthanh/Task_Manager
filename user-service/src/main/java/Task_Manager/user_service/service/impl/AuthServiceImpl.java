package Task_Manager.user_service.service.impl;

import Task_Manager.common_lib.exception.BusinessRuleException;
import Task_Manager.common_lib.exception.MfaRequiredException;
import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.exception.UnauthorizedException;
import Task_Manager.user_service.constant.RoleConstant;
import Task_Manager.user_service.dto.*;
import Task_Manager.user_service.entity.*;
import Task_Manager.user_service.kafka.AuthEventPublisher;
import Task_Manager.user_service.mapper.UserMapper;
import Task_Manager.user_service.repository.OtpRepository;
import Task_Manager.user_service.repository.SystemRoleRepository;
import Task_Manager.user_service.repository.UserRepository;
import Task_Manager.user_service.repository.UserSessionRepository;
import Task_Manager.user_service.security.JwtUtil;
import Task_Manager.user_service.service.AuthService;
import Task_Manager.user_service.service.RateLimiterService;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import eu.bitwalker.useragentutils.UserAgent;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final OtpRepository otpRepository;
    private final UserSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthEventPublisher authEventPublisher;
    private final UserMapper userMapper;
    private final RateLimiterService rateLimiterService;
    private final SystemRoleRepository systemRoleRepository;

    private final GoogleAuthenticator gAuth = new GoogleAuthenticator();
    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    @Transactional
    public void initiateRegister(RegisterRequest request) {
//        rateLimiterService.checkRateLimit("REGISTER", 5, 60);

        validateNewUser(request);

        User pendingUser = userMapper.toEntity(request, passwordEncoder.encode(request.getPassword()), false);
        userRepository.save(pendingUser);

        String otpCode = generateNumericOtp();
        saveOtp(pendingUser.getId(), otpCode, "VERIFY_EMAIL", 5);

        authEventPublisher.publishOtpCreated(Map.of(
                "email", pendingUser.getEmail(),
                "otp", otpCode,
                "fullName", pendingUser.getFullname()
        ));
    }

    @Override
    @Transactional
    public AuthResponse verifyAndRegister(VerifyOtpRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new BusinessRuleException("Email không tồn tại"));

        if (user.isActive()) {
            throw new BusinessRuleException("Tài khoản này đã được kích hoạt từ trước!");
        }

        verifyOtpCode(user.getId(), request.getOtp(), "VERIFY_EMAIL");

        SystemRole defaultRole = systemRoleRepository.findByName(RoleConstant.MEMBER)
                .orElseThrow(() -> new BusinessRuleException("Hệ thống chưa thiết lập role mặc định"));

        user.getSystemRoles().add(defaultRole);
        user.setActive(true);
        userRepository.save(user);

        authEventPublisher.publishUserRegistered(user.getId(), Map.of("email", user.getEmail()));

        LoginRequest loginReq = new LoginRequest();
        loginReq.setEmailOrUsername(user.getEmail());
        loginReq.setPassword(request.getPassword());
        return login(loginReq);
    }

    @Override
    public AuthResponse register(RegisterRequest request) { return null; }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        rateLimiterService.checkRateLimit("LOGIN_ATTEMPT", 10, 5);

        User user = userRepository.findByIdentifierWithRoles(request.getEmailOrUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản không tồn tại"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException("Sai mật khẩu");
        }
        if (!user.isActive()) {
            throw new BusinessRuleException("Tài khoản đã bị vô hiệu hóa hoặc chưa xác thực");
        }

        if (user.is2faEnabled()) {
            throw new MfaRequiredException("Tài khoản yêu cầu xác thực 2 bước", user.getId().toString(), user.getEmail());
        }

        return buildAndSaveSession(user);
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(String refreshToken) {
        UserSession session = sessionRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new UnauthorizedException("Refresh Token không tồn tại"));

        if (session.isRevoked() || session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Phiên đăng nhập đã hết hạn hoặc bị thu hồi");
        }

        User user = userRepository.findByIdWithRoles(session.getUserId())
                .orElseThrow(() -> new UnauthorizedException("User không tồn tại"));

        String newAccessToken = jwtUtil.generateToken(user, session.getId().toString());
        String newRefreshToken = jwtUtil.generateRefreshToken(user, session.getId().toString());

        session.setRefreshToken(newRefreshToken);
        session.setExpiresAt(LocalDateTime.now().plusDays(7));
        sessionRepository.save(session);

        return userMapper.toAuthResponse(user, newAccessToken, newRefreshToken, session.getId().toString(), extractPermissions(user));
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        sessionRepository.findByRefreshToken(refreshToken).ifPresent(session -> {
            session.setRevoked(true);
            sessionRepository.save(session);
        });
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        rateLimiterService.checkRateLimit("FORGOT_PWD", 3, 60);

        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("Email không tồn tại trong hệ thống"));

        String otpCode = generateNumericOtp();
        saveOtp(user.getId(), otpCode, "RESET_PWD", 15);

        authEventPublisher.publishForgotPasswordOtp(Map.of(
                "email", user.getEmail(), "otp", otpCode, "fullName", user.getFullname()
        ));
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("Email không tồn tại"));

        verifyOtpCode(user.getId(), request.getOtp(), "RESET_PWD");

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    @Override
    @Transactional
    public TwoFactorSetupResponse generate2FaSecret(UUID userId) {
        User user = userRepository.findById(userId).orElseThrow();

        GoogleAuthenticatorKey key = gAuth.createCredentials();
        user.setTwoFactorSecret(key.getKey());
        userRepository.save(user);

        String qrUrl = String.format("otpauth://totp/TaskManager:%s?secret=%s&issuer=TaskManager",
                user.getEmail(), key.getKey());

        return TwoFactorSetupResponse.builder()
                .secretKey(key.getKey())
                .qrCodeUrl(qrUrl)
                .build();
    }

    @Override
    @Transactional
    public void verifyAndEnable2Fa(UUID userId, TwoFactorRequest request) {
        User user = userRepository.findById(userId).orElseThrow();
        boolean isCodeValid = gAuth.authorize(user.getTwoFactorSecret(), Integer.parseInt(request.getCode()));
        if (!isCodeValid) throw new BusinessRuleException("Mã xác thực 2FA không chính xác");

        user.set2faEnabled(true);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public AuthResponse verify2FaLogin(TwoFactorRequest request) {
        User user;
        try {
            UUID userId = UUID.fromString(request.getUserId());
            user = userRepository.findByIdWithRoles(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Tài khoản không tồn tại"));
        } catch (IllegalArgumentException e) {
            user = userRepository.findByIdentifierWithRoles(request.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Tài khoản không tồn tại"));
        }

        boolean isCodeValid = gAuth.authorize(user.getTwoFactorSecret(), Integer.parseInt(request.getCode()));
        if (!isCodeValid) throw new BusinessRuleException("Mã xác thực 2FA không chính xác");

        return buildAndSaveSession(user);
    }

    @Override
    @Transactional
    public AuthResponse googleLogin(GoogleLoginRequest request) {
        try {
            String googleApiUrl = "https://oauth2.googleapis.com/tokeninfo?id_token=" + request.getIdToken();
            ResponseEntity<Map<String, Object>> response = restTemplate.getForEntity(googleApiUrl, (Class<Map<String, Object>>)(Class<?>)Map.class);
            Map<String, Object> payload = response.getBody();

            if (payload == null || !payload.containsKey("email")) {
                throw new UnauthorizedException("Google Token không hợp lệ");
            }

            String email = payload.get("email").toString();
            String name = payload.get("name") != null ? payload.get("name").toString() : "Google User";
            String sub = payload.get("sub").toString();

            Optional<User> userOpt = userRepository.findByIdentifierWithRoles(email);
            User user;

            if (userOpt.isPresent()) {
                user = userOpt.get();
                if (!user.isActive()) throw new BusinessRuleException("Tài khoản đang bị khóa");
                if (user.is2faEnabled()) throw new MfaRequiredException("Cần 2FA", user.getId().toString(), user.getEmail());
            } else {
                user = userMapper.toGoogleUserEntity(email, name, sub);
                systemRoleRepository.findByName(RoleConstant.MEMBER).ifPresent(role -> user.getSystemRoles().add(role));
                userRepository.save(user);
                authEventPublisher.publishUserRegistered(user.getId(), Map.of("email", email));
            }
            return buildAndSaveSession(user);
        } catch (Exception e) {
            log.error("Google Login Error: ", e);
            throw new UnauthorizedException("Xác thực Google thất bại: " + e.getMessage());
        }
    }

    private AuthResponse buildAndSaveSession(User user) {
        String deviceInfo = "Unknown Device";
        String ipAddress = "Unknown IP";

        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest request = attrs.getRequest();
            ipAddress = request.getRemoteAddr();
            String userAgentString = request.getHeader("User-Agent");
            if (userAgentString != null) {
                UserAgent agent = UserAgent.parseUserAgentString(userAgentString);
                deviceInfo = agent.getOperatingSystem().getName() + " - " + agent.getBrowser().getName();
            }
        }

        UserSession session = userMapper.toUserSession(user.getId(), deviceInfo, ipAddress);
        sessionRepository.save(session);

        String sessionId = session.getId();
        String accessToken = jwtUtil.generateToken(user, sessionId);
        String refreshToken = jwtUtil.generateRefreshToken(user, sessionId);

        session.setRefreshToken(refreshToken);
        sessionRepository.save(session);

        authEventPublisher.publishUserLoggedIn(user.getId(), Map.of("email", user.getEmail()));
        return userMapper.toAuthResponse(user, accessToken, refreshToken, sessionId, extractPermissions(user));
    }

    private void saveOtp(UUID userId, String otpCode, String type, int validMinutes) {
        Otp otp = userMapper.toOtp(userId, otpCode, type, (long) validMinutes * 60);
        otpRepository.save(otp);
    }

    private void verifyOtpCode(UUID userId, String code, String type) {
        List<Otp> otps = otpRepository.findByUserIdAndTypeAndUsedFalse(userId, type);

        if (otps == null || otps.isEmpty()) {
            throw new BusinessRuleException("Mã OTP không hợp lệ hoặc đã hết hạn!");
        }

        Otp latestOtp = otps.stream()
                .max(Comparator.comparing(Otp::getCreatedAt))
                .orElseThrow(() -> new BusinessRuleException("Mã OTP không hợp lệ!"));

        if (!latestOtp.getOtpCode().equals(code.trim())) {
            throw new BusinessRuleException("Mã OTP không chính xác");
        }

        latestOtp.setUsed(true);
        otpRepository.save(latestOtp);
    }

    private String generateNumericOtp() {
        return String.format("%06d", new SecureRandom().nextInt(1_000_000));
    }

    private List<String> extractPermissions(User user) {
        if (user.getSystemRoles() == null) return Collections.emptyList();
        return user.getSystemRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(SystemPermission::getCode)
                .collect(Collectors.toList());
    }

    private void validateNewUser(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) throw new BusinessRuleException("Username đã tồn tại");
        if (userRepository.existsByEmail(request.getEmail())) throw new BusinessRuleException("Email đã tồn tại");
    }
}