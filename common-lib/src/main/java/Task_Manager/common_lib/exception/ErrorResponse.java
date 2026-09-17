package Task_Manager.common_lib.exception;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ErrorResponse {
    private int status;
    private String message;
    private long timestamp;
}