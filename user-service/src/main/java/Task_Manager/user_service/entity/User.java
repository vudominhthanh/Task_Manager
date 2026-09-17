package Task_Manager.user_service.entity;

import Task_Manager.common_lib.entity.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends AuditableEntity {
    @Column(unique = true, nullable = false, length = 50)
    private String username;

    @Column(name = "fullname", length = 50)
    private String fullname;

    @Column(unique = true, nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "phone_number", nullable = false, length = 20, unique = true)
    private String phoneNumber;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(length = 10, nullable = false)
    @Builder.Default
    private UserRole role = UserRole.USR;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    @Version
    @Column(name = "_version")
    private Integer version;
}
