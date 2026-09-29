package Task_Manager.common_lib.security;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Getter;
import org.springframework.security.web.authentication.WebAuthenticationDetails;

@Getter
public class CustomWebAuthenticationDetails extends WebAuthenticationDetails {

    private final String sessionId;

    public CustomWebAuthenticationDetails(HttpServletRequest request, String sessionId) {
        super(request);
        this.sessionId = sessionId;
    }

}