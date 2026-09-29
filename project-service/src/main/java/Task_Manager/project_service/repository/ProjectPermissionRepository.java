package Task_Manager.project_service.repository;

import Task_Manager.project_service.entity.ProjectPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ProjectPermissionRepository extends JpaRepository<ProjectPermission, UUID> {
    Optional<ProjectPermission> findByName(String name);
}