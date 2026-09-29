package Task_Manager.project_service.repository;

import Task_Manager.project_service.entity.ProjectRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRoleRepository extends JpaRepository<ProjectRole, UUID> {
    Optional<ProjectRole> findByNameAndProjectId(String name, UUID projectId);
    Optional<ProjectRole> findByNameAndProjectIdIsNull(String name);
    List<ProjectRole> findAllByProjectIdIsNullOrProjectId(UUID projectId);
}