package Task_Manager.project_service.entity;

import Task_Manager.common_lib.entity.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "project_roles")
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
public class ProjectRole extends AuditableEntity{
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "is_custom")
    @Builder.Default
    private boolean isCustom = false;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "proj_role_permissions",
            joinColumns = @JoinColumn(name = "role_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @Builder.Default
    private Set<ProjectPermission> permissions = new HashSet<>();
}
