package Task_Manager.common_lib.filter;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FilterCriteria {
    private String fieldName;
    private FilterOperator operator;
    private Object value;
}