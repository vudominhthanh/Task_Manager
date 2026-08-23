package Task_Manager.activity_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "activities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Activity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "target_type")
    private String targetType;
    @Column(name = "target_id")
    private String targetId;
    @Column(name = "action_type")
    private String actionType;

    @Column(name = "payload_details", columnDefinition = "jsonb")
    private String payloadDetails;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
