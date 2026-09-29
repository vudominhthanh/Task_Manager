package Task_Manager.task_service.entity;

import Task_Manager.common_lib.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "attachments")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class Attachment extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_type", length = 100)
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "s3_key", length = 500, nullable = false)
    private String s3Key;
    @Column(name = "visibility_type", length = 30)
    @Builder.Default
    private String visibilityType = "PROJECT";

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "attachment_access",
            joinColumns = @JoinColumn(name = "attachment_id")
    )
    @Column(name = "user_id")
    @Builder.Default
    private Set<UUID> allowedUserIds = new HashSet<>();
}
