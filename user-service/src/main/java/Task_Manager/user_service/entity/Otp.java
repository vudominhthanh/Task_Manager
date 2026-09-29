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
@RedisHash("OTP")
public class Otp {

    @Id
    private String id;

    @Indexed
    private UUID userId;

    private String otpCode;

    @Indexed
    private String type;

    private LocalDateTime createdAt;

    @Indexed
    private boolean used;

    @TimeToLive
    private Long expirationInSeconds;
}