package Task_Manager.user_service.repository;

import Task_Manager.user_service.entity.SystemPermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SystemPermissionRepository extends JpaRepository<SystemPermission, UUID> {
    Optional<SystemPermission> findByCode(String code);
}
