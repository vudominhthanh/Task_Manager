package Task_Manager.project_service.repository;

import Task_Manager.project_service.entity.ProjectMember;
import Task_Manager.project_service.entity.ProjectRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, ProjectMemberId> {
    boolean existsByProjectIdAndUserId(UUID projectId, UUID userId);
    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId);
    List<ProjectMember> findByProjectId(UUID projectId);

    @Query("SELECT pm FROM ProjectMember pm WHERE pm.projectId IN " +
            "(SELECT p.id FROM Project p LEFT JOIN ProjectMember m ON p.id = m.projectId " +
            "WHERE p.ownerId = :currentUserId OR m.userId = :currentUserId)")
    List<ProjectMember> findAllMembersInMyProjects(@Param("currentUserId") UUID currentUserId);

    boolean existsByProjectIdAndUserIdAndProjectRoleIn(UUID projectId, UUID ownerId, List<ProjectRole> projectRoles);
}
