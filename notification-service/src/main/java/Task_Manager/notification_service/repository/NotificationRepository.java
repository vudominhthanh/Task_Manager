package Task_Manager.notification_service.repository;

import Task_Manager.notification_service.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId);

    List<Notification> findByRecipientIdAndReadFalse(UUID recipientId);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.recipientId = :userId AND n.read = false")
    long countByUserIdAndIsReadFalse(@Param("userId") UUID userId);
}
