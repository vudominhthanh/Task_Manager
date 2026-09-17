package Task_Manager.common_lib.exception;

import lombok.Getter;

@Getter
public class BaseException extends RuntimeException {
    private final int status;

    public BaseException(int status, String message) {
        super(message);
        this.status = status;
    }
}