package Task_Manager.project_service.repository;

import Task_Manager.project_service.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findAllByOwnerId(UUID ownerId);

    @Query("SELECT DISTINCT p FROM Project p LEFT JOIN ProjectMember pm ON p.id = pm.projectId " +
            "WHERE (p.ownerId = :userId OR pm.userId = :userId) " +
            "AND (:keyword IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', CAST(:keyword AS string), '%')))")
    Page<Project> searchInvolvedProjects(@Param("userId") UUID userId,
                                         @Param("keyword") String keyword,
                                         Pageable pageable);

    @Query("SELECT p.id FROM Project p WHERE p.ownerId = :userId")
    List<UUID> findProjectIdsByUserId(@Param("userId") UUID userId);

}