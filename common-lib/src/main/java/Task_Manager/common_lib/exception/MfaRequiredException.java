package Task_Manager.common_lib.exception;

import lombok.Getter;

@Getter
public class MfaRequiredException extends RuntimeException {
    private final String userId;
    private final String email;

    public MfaRequiredException(String message, String userId, String email) {
        super(message);
        this.userId = userId;
        this.email = email;
    }
}