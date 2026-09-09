package Task_Manager.task_service.repository;

import Task_Manager.task_service.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {
    @Query("SELECT c FROM Comment c JOIN FETCH c.task WHERE c.id = :id")
    Optional<Comment> findByIdWithTask(@Param("id") UUID id);

    List<Comment> findByTaskId(UUID taskId);

    @Query("SELECT c.task.id, COUNT(c.id) FROM Comment c WHERE c.task.id IN :taskIds GROUP BY c.task.id")
    List<Object[]> countCommentsByTaskIds(@Param("taskIds") List<UUID> taskIds);
}
