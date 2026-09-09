package Task_Manager.notification_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

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

    @Column(name = "recipient_id", nullable = false)
    private UUID recipientId;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "is_read")
    private boolean read;

    @Column(length = 50, nullable = false)
    private String type;

    @Column(length = 255)
    private String target;

    @Column(length = 100)
    private String project;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}