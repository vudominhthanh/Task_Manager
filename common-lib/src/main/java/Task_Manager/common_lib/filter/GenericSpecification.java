package Task_Manager.common_lib.filter;

import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

public class GenericSpecification<T> implements Specification<T> {

    private final List<FilterCriteria> criteriaList;
    private final List<Specification<T>> customSpecifications;

    public GenericSpecification() {
        this.criteriaList = new ArrayList<>();
        this.customSpecifications = new ArrayList<>();
    }

    public GenericSpecification<T> add(String fieldName, FilterOperator operator, Object value) {
        if (value != null) {
            if (value instanceof String str && str.trim().isEmpty()) {
                return this;
            }
            this.criteriaList.add(new FilterCriteria(fieldName, operator, value));
        }
        return this;
    }

    public GenericSpecification<T> add(FilterCriteria criteria) {
        if (criteria != null && criteria.getValue() != null) {
            this.criteriaList.add(criteria);
        }
        return this;
    }

    public GenericSpecification<T> addCustom(Specification<T> customSpec) {
        if (customSpec != null) {
            this.customSpecifications.add(customSpec);
        }
        return this;
    }

    @Override
    public Predicate toPredicate(Root<T> root, CriteriaQuery<?> query, CriteriaBuilder cb) {
        query.distinct(true);
        List<Predicate> predicates = new ArrayList<>();

        for (FilterCriteria criteria : criteriaList) {
            Path<?> path = resolvePath(root, criteria.getFieldName());
            Object value = criteria.getValue();

            switch (criteria.getOperator()) {
                case EQUALS:
                    predicates.add(cb.equal(path, value));
                    break;
                case NOT_EQUALS:
                    predicates.add(cb.notEqual(path, value));
                    break;
                case LIKE:
                    predicates.add(cb.like(cb.lower(path.as(String.class)), "%" + value.toString().toLowerCase() + "%"));
                    break;
                case GREATER_THAN:
                    predicates.add(cb.greaterThan(path.as(String.class), value.toString()));
                    break;
                case GREATER_THAN_OR_EQUAL:
                    predicates.add(cb.greaterThanOrEqualTo(path.as(String.class), value.toString()));
                    break;
                case LESS_THAN:
                    predicates.add(cb.lessThan(path.as(String.class), value.toString()));
                    break;
                case LESS_THAN_OR_EQUAL:
                    predicates.add(cb.lessThanOrEqualTo(path.as(String.class), value.toString()));
                    break;
                case IN:
                    if (value instanceof Collection<?> collection && !collection.isEmpty()) {
                        predicates.add(path.in(collection));
                    }
                    break;
            }
        }

        for (Specification<T> customSpec : customSpecifications) {
            Predicate customPredicate = customSpec.toPredicate(root, query, cb);
            if (customPredicate != null) {
                predicates.add(customPredicate);
            }
        }

        return cb.and(predicates.toArray(new Predicate[0]));
    }

    private Path<?> resolvePath(Root<T> root, String fieldName) {
        if (fieldName.contains(".")) {
            String[] parts = fieldName.split("\\.");
            Path<?> path = root.get(parts[0]);
            for (int i = 1; i < parts.length; i++) {
                path = path.get(parts[i]);
            }
            return path;
        }
        return root.get(fieldName);
    }
}