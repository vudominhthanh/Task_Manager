package Task_Manager.project_service.repository;

import Task_Manager.project_service.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, ProjectMemberId> {
    boolean existsByProjectIdAndUserId(UUID projectId, UUID userId);
    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId);
    Optional<ProjectMember> findByProjectId(UUID projectId);
}
