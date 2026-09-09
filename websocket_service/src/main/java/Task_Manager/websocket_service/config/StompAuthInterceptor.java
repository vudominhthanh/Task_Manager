package Task_Manager.websocket_service.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.util.Collections;

@Component
public class StompAuthInterceptor implements ChannelInterceptor {

    private final String SECRET_KEY = "qwertyuiopasdfghjklzxcvbnm1234567890qwertyuiopasdfghjklzxcvbnm";

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                try {
                    Claims claims = Jwts.parser()
                            .verifyWith(Keys.hmacShaKeyFor(SECRET_KEY.getBytes(StandardCharsets.UTF_8)))
                            .build()
                            .parseSignedClaims(token)
                            .getPayload();

                    String userId = claims.getSubject();

                    Principal principal = new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList());
                    accessor.setUser(principal);

                } catch (Exception e) {
                    System.err.println("Xác thực WebSocket thất bại do Token không hợp lệ: " + e.getMessage());
                }
            }
        }
        return message;
    }
}