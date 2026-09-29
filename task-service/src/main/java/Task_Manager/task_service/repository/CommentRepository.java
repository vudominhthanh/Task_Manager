package Task_Manager.task_service.repository;

import Task_Manager.task_service.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {

    List<Comment> findByTaskId(UUID taskId);

    @Query("SELECT c.taskId, COUNT(c.id) FROM Comment c WHERE c.taskId IN :taskIds GROUP BY c.taskId")
    List<Object[]> countCommentsByTaskIds(@Param("taskIds") List<UUID> taskIds);

    List<Comment> findByProjectIdAndTaskIdIsNull(UUID projectId);
}
