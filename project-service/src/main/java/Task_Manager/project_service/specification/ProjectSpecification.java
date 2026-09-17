package Task_Manager.project_service.specification;

import Task_Manager.common_lib.filter.FilterOperator;
import Task_Manager.common_lib.filter.GenericSpecification;
import Task_Manager.project_service.entity.Project;
import Task_Manager.project_service.entity.ProjectMember;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public class ProjectSpecification {

    public static Specification<Project> getInvolvedProjects(UUID userId, String keyword) {
        GenericSpecification<Project> spec = new GenericSpecification<>();

        if (userId != null) {
            spec.addCustom((root, query, cb) -> {
                Predicate isOwner = cb.equal(root.get("ownerId"), userId);

                Subquery<UUID> memberSubquery = query.subquery(UUID.class);
                Root<ProjectMember> memberRoot = memberSubquery.from(ProjectMember.class);
                memberSubquery.select(memberRoot.get("projectId"))
                        .where(cb.equal(memberRoot.get("userId"), userId));

                Predicate isMember = cb.in(root.get("id")).value(memberSubquery);

                return cb.or(isOwner, isMember);
            });
        }

        if (keyword != null && !keyword.trim().isEmpty()) {
            spec.add("name", FilterOperator.LIKE, keyword);
        }

        return spec;
    }
}