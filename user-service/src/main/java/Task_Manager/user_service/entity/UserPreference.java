package Task_Manager.user_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreference {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "theme", nullable = false, length = 20)
    @Builder.Default
    private String theme = "system";

    @Column(name = "accent_color", nullable = false, length = 20)
    @Builder.Default
    private String accentColor = "indigo";

    @Column(name = "density", nullable = false, length = 20)
    @Builder.Default
    private String density = "comfortable";

    @Column(name = "language", nullable = false, length = 10)
    @Builder.Default
    private String language = "vi";

    @Column(name = "date_format", nullable = false, length = 20)
    @Builder.Default
    private String dateFormat = "DD/MM/YYYY";

    @Column(name = "time_format", nullable = false, length = 10)
    @Builder.Default
    private String timeFormat = "24h";

    @Column(name = "_updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}