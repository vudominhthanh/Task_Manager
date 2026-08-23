package Task_Manager.task_service.repository;

import Task_Manager.task_service.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findByProjectId(UUID projectId);
    List<Task> findByAssigneeId(UUID assigneeId);
    List<Task> findByParentTaskId(UUID parentTaskId);
    Optional<Task> findById(UUID taskId);
}
