package Task_Manager.project_service.repository;

import Task_Manager.project_service.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID>, JpaSpecificationExecutor<Project> {
    List<Project> findAllByOwnerId(UUID ownerId);

    @Query(value = """
        SELECT id FROM projects WHERE owner_id = :userId
        UNION
        SELECT project_id FROM project_members WHERE user_id = :userId
    """, nativeQuery = true)
    List<UUID> findProjectIdsByUserId(@Param("userId") UUID userId);
}