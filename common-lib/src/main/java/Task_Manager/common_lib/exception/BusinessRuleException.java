package Task_Manager.common_lib.exception;

import lombok.Getter;

@Getter
public class BusinessRuleException extends RuntimeException {
    private final int status;

    public BusinessRuleException(int status, String message) {
        super(message);
        this.status = status;
    }

    public BusinessRuleException(String message) {
        super(message);
        this.status = 400;
    }
}
