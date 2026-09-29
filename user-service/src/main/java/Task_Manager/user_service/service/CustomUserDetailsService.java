package Task_Manager.user_service.service;

import Task_Manager.user_service.entity.User;
import Task_Manager.user_service.repository.UserRepository;
import Task_Manager.user_service.security.CustomUserDetails;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user;

        if (identifier.matches("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")) {
            user = userRepository.findById(java.util.UUID.fromString(identifier))
                    .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy ID: " + identifier));
        } else {
            user = userRepository.findByEmailOrUsername(identifier)
                    .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản: " + identifier));
        }

        return new CustomUserDetails(user);
    }
}
