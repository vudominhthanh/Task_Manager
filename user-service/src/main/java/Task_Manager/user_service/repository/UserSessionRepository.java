package Task_Manager.user_service.repository;

import Task_Manager.user_service.entity.UserSession;
import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserSessionRepository extends CrudRepository<UserSession, String> {
    Optional<UserSession> findByRefreshToken(String refreshToken);
    List<UserSession> findByUserIdAndRevokedFalse(UUID userId);
}
