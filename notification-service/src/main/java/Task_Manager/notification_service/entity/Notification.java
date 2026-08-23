package Task_Manager.notification_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.validator.constraints.br.CPF;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "recipient_id")
    private UUID recipientId;
    @Column(name = "actor_id")
    private UUID actorId;
    @Column(columnDefinition = "TEXT")
    private String message;
    @Column(name = "is_read")
    private boolean isRead;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
