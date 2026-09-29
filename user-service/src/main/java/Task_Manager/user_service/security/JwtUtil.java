package Task_Manager.user_service.security;

import Task_Manager.user_service.entity.User;
import Task_Manager.user_service.entity.SystemRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Function;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String SECRET_KEY;

    private final long ACCESS_TOKEN_EXPIRATION = 1000 * 60 * 30;
    private final long REFRESH_TOKEN_EXPIRATION = 1000 * 60 * 60 * 24 * 7;

    private SecretKey getSignInKey() {
        return Keys.hmacShaKeyFor(SECRET_KEY.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(User user, String sessionId) {
        Set<String> permissions = new HashSet<>();
        String primaryRole = "MEMBER";

        if (user.getSystemRoles() != null && !user.getSystemRoles().isEmpty()) {
            primaryRole = user.getSystemRoles().iterator().next().getName();
            for (SystemRole role : user.getSystemRoles()) {
                if (role.getPermissions() != null) {
                    role.getPermissions().forEach(p -> permissions.add(p.getCode()));
                }
            }
        }

        Map<String, Object> claims = new HashMap<>();
        claims.put("permissions", new ArrayList<>(permissions));
        claims.put("sessionId", sessionId);
        claims.put("username", user.getUsername());

        return Jwts.builder()
                .setSubject(user.getId().toString())
                .claim("permissions", new ArrayList<>(permissions))
                .claim("sessionId", sessionId)
                .claim("username", user.getUsername())
                .claim("role", primaryRole)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + ACCESS_TOKEN_EXPIRATION))
                .signWith(getSignInKey())
                .compact();
    }

    public String generateRefreshToken(User user, String sessionId) {
        return Jwts.builder()
                .setSubject(user.getId().toString())
                .claim("type", "REFRESH")
                .claim("sessionId", sessionId)
                .claim("username", user.getUsername())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + REFRESH_TOKEN_EXPIRATION))
                .signWith(getSignInKey())
                .compact();
    }


    public String extractUsername(String token) {
        return extractClaim(token, claims -> claims.get("username", String.class));
    }

    public String extractUserId(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    @SuppressWarnings("deprecation")
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}