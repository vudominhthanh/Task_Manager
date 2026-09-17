    package Task_Manager.task_service.repository;

    import Task_Manager.task_service.entity.Attachment;
    import org.springframework.data.jpa.repository.JpaRepository;
    import org.springframework.data.jpa.repository.Query;
    import org.springframework.data.repository.query.Param;
    import org.springframework.stereotype.Repository;

    import java.util.List;
    import java.util.Optional;
    import java.util.UUID;

    @Repository
    public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {
        @Query("SELECT a FROM Attachment a JOIN FETCH a.task WHERE a.id = :id")
        Optional<Attachment> findByIdWithTask(@Param("id") UUID id);

        List<Attachment> findByTaskId(UUID taskId);

        @Query("SELECT a.task.id, COUNT(a.id) FROM Attachment a WHERE a.task.id IN :taskIds GROUP BY a.task.id")
        List<Object[]> countAttachmentsByTaskIds(@Param("taskIds") List<UUID> taskIds);
    }
