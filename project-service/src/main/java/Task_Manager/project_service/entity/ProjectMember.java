package Task_Manager.project_service.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "project_members")
@IdClass(ProjectMemberId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectMember {
    @Id
    @Column(name = "project_id",nullable = false)
    private UUID projectId;

    @Id
    @Column(name = "user_id",nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(length = 10,nullable = false, name = "project_role")
    @Builder.Default
    private ProjectRole projectRole = ProjectRole.MEMBER;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", insertable = false, updatable = false)
    private Project project;
}
