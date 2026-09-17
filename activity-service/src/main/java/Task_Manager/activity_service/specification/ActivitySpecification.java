package Task_Manager.activity_service.specification;

import Task_Manager.activity_service.entity.Activity;
import Task_Manager.common_lib.filter.FilterOperator;
import Task_Manager.common_lib.filter.GenericSpecification;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ActivitySpecification {

    public static Specification<Activity> filterActivities(
            String keyword,
            String projectName,
            UUID userId,
            List<String> userProjectIds) {

        GenericSpecification<Activity> spec = new GenericSpecification<>();

        // 1. Phân quyền người dùng (Cụm OR)
        if (userId != null) {
            spec.addCustom((root, query, cb) -> {
                List<Predicate> userPredicates = new ArrayList<>();
                userPredicates.add(cb.equal(root.get("userId"), userId.toString()));
                userPredicates.add(cb.equal(root.get("targetId"), userId.toString()));

                if (userProjectIds != null && !userProjectIds.isEmpty()) {
                    userPredicates.add(root.get("projectId").in(userProjectIds));
                }

                return cb.or(userPredicates.toArray(new Predicate[0]));
            });
        }

        if (projectName != null && !projectName.trim().isEmpty() && !projectName.equalsIgnoreCase("Tất cả dự án")) {
            spec.add("projectId", FilterOperator.EQUALS, projectName);
        }

        if (keyword != null && !keyword.trim().isEmpty()) {
            spec.addCustom((root, query, cb) -> {
                String searchPattern = "%" + keyword.trim().toLowerCase() + "%";
                return cb.or(
                        cb.like(cb.lower(root.get("username")), searchPattern),
                        cb.like(cb.lower(root.get("targetName")), searchPattern),
                        cb.like(cb.lower(root.get("actionType")), searchPattern)
                );
            });
        }

        spec.addCustom((root, query, cb) -> {
            query.orderBy(cb.desc(root.get("createdAt")));
            return null;
        });

        return spec;
    }
}