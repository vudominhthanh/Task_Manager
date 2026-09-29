package Task_Manager.user_service.repository;

import Task_Manager.user_service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    @Query("SELECT u FROM User u WHERE u.email = :identifier OR u.username = :identifier")
    Optional<User> findByEmailOrUsername(@Param("identifier") String identifier);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.systemRoles r LEFT JOIN FETCH r.permissions WHERE u.id = :id")
    Optional<User> findByIdWithRoles(@Param("id") UUID id);

    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByPhoneNumber(String phone);

    Optional<User> findByEmail(String email);
    Optional<User> findByUsername(String username);

    @Query("SELECT u.id FROM User u")
    List<UUID> findAllUserIds();

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.systemRoles r LEFT JOIN FETCH r.permissions WHERE u.email = :email OR u.username = :email")
    Optional<User> findByIdentifierWithRoles(@Param("email") String email);
}
