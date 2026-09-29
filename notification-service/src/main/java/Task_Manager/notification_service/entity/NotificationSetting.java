package Task_Manager.notification_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "notification_settings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSetting{

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID id;

    @Builder.Default
    @Column(name = "notify_on_assigned")
    private boolean notifyOnAssigned = true;

    @Builder.Default
    @Column(name = "notify_on_mention")
    private boolean notifyOnMention = true;

    @Builder.Default
    @Column(name = "notify_on_status_change")
    private boolean notifyOnStatusChange = false;

    @Builder.Default
    @Column(name = "email_notifications")
    private boolean emailNotifications = true;

    @Builder.Default
    @Column(name = "push_notifications")
    private boolean pushNotifications = true;
}