package Task_Manager.activity_service.entity;

import Task_Manager.common_lib.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "activities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class Activity extends BaseEntity{
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "target_type")
    private String targetType;

    @Column(name = "target_id")
    private String targetId;

    @Column(name = "action_type")
    private String actionType;

    @Column(name = "user_id", length = 255)
    private String userId;

    @Column(name = "username", length = 100)
    private String username;

    @Column(name = "user_avatar", length = 10)
    private String userAvatar;

    @Column(name = "avatar_color", length = 50)
    private String avatarColor;

    @Column(name = "project_id")
    private String projectId;

    @Column(name = "project_name", length = 100)
    private String projectName;

    @Column(name = "target_name", length = 255)
    private String targetName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_details", columnDefinition = "jsonb")
    private Map<String, Object> payloadDetails;
}
