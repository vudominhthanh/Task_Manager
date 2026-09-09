package Task_Manager.task_service.repository;

import Task_Manager.task_service.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {

    @Query("SELECT t FROM Task t WHERE t.project= :projectId")
    List<Task> findByProjectId(@Param("projectId") UUID projectId);

    Optional<Task> findById(UUID taskId);

    List<Task> findByAssignee(UUID assigneeId);

    List<Task> findByParentTaskId(UUID parentTaskId);
}
