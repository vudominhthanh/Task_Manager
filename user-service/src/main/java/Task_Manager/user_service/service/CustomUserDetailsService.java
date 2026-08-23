package Task_Manager.user_service.service;

import Task_Manager.user_service.entity.User;
import Task_Manager.user_service.repository.UserRepository;
import Task_Manager.user_service.security.CustomUserDetails;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        User user = userRepository.findByEmailOrUsername(identifier)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản: " + identifier));

        return new CustomUserDetails(user);
    }
}
