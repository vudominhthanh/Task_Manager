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

    import java.util.Map;

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
                    .email(user.getEmail())
                    .userName(user.getUsername())
                    .fullName(user.getFullname())
                    .role(user.getRole().name())
                    .build();

            Map<String, Object> safeUserInfo = Map.of(
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "email", user.getEmail(),
                    "fullName", user.getFullname()
            );
            String avatarLetter = user.getFullname() != null && !user.getFullname().isEmpty()
                    ? String.valueOf(user.getFullname().trim().charAt(0)).toUpperCase()
                    : "U";
            authEventPublisher.publishUserRegistered(user.getId(), Map.of(
                    "user", safeUserInfo,
                    "username", user.getUsername(),
                    "fullName", user.getFullname(),
                    "targetName", user.getUsername(),
                    "userAvatar", avatarLetter,
                    "avatarColor", "bg-indigo-600",
                    "createdBy", user.getId()
            ));

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
                    .email(user.getEmail())
                    .userName(user.getUsername())
                    .fullName(user.getFullname())
                    .role(user.getRole().name())
                    .build();

            Map<String, Object> safeUserInfo = Map.of(
                    "id", user.getId(),
                    "username", user.getUsername(),
                    "email", user.getEmail(),
                    "fullName", user.getFullname()
            );
            String avatarLetter = user.getFullname() != null && !user.getFullname().isEmpty()
                    ? String.valueOf(user.getFullname().trim().charAt(0)).toUpperCase()
                    : "U";
            authEventPublisher.publishUserLoggedIn(user.getId(), Map.of(
                    "user", safeUserInfo,
                    "username", user.getUsername(),
                    "fullName", user.getFullname(),
                    "targetName", user.getUsername(),
                    "userAvatar", avatarLetter,
                    "avatarColor", "bg-emerald-600",
                    "loggedInBy", user.getId()
            ));

            return response;
        }
    }
