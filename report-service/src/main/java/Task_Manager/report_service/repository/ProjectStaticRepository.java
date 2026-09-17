package Task_Manager.report_service.repository;

import Task_Manager.report_service.entity.ProjectStatic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ProjectStaticRepository extends JpaRepository<ProjectStatic, UUID> {
}