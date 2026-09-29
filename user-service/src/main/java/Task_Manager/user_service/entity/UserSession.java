package Task_Manager.user_service.entity;

import Task_Manager.common_lib.entity.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.TimeToLive;
import org.springframework.data.redis.core.index.Indexed;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@RedisHash("UserSession")
public class UserSession {
    @Id
    private String id;

    @Indexed
    private UUID userId;

    @Indexed
    private String refreshToken;

    private String deviceInfo;
    private String ipAddress;
    private LocalDateTime expiresAt;

    private boolean revoked;

    @TimeToLive
    private Long expirationInSeconds;

}