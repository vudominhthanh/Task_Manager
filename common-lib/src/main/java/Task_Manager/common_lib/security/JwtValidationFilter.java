package Task_Manager.common_lib.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class JwtValidationFilter extends OncePerRequestFilter {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");

//        logger.info("--> [JwtValidationFilter] Nhận request tới URI: " + request.getRequestURI());
//        logger.info("--> Header Authorization: " + (header != null ? "CÓ" : "KHÔNG"));

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Claims claims = Jwts.parserBuilder()
                        .setSigningKey(Keys.hmacShaKeyFor(jwtSecret.getBytes()))
                        .build()
                        .parseClaimsJws(token)
                        .getBody();

//                logger.info("--> Parse token thành công! Subject (userId): " + claims.getSubject());
//                logger.info("--> Quyền trong token: " + claims.get("permissions"));

                String userId = claims.getSubject();
                String sessionId = claims.get("sessionId", String.class);

                List<GrantedAuthority> authorities = new ArrayList<>();

                String role = claims.get("role", String.class);
                if (role != null && !role.trim().isEmpty()) {
                    String formattedRole = role.trim();
                    if (!formattedRole.startsWith("ROLE_")) {
                        formattedRole = "ROLE_" + formattedRole;
                    }
                    authorities.add(new SimpleGrantedAuthority(formattedRole));
                }

                Object permissionsObj = claims.get("permissions");
                if (permissionsObj instanceof List<?>) {
                    List<?> rawPermissions = (List<?>) permissionsObj;
                    for (Object perm : rawPermissions) {
                        if (perm != null && !String.valueOf(perm).trim().isEmpty()) {
                            authorities.add(new SimpleGrantedAuthority(String.valueOf(perm).trim()));
                        }
                    }
                }

//                logger.info("--> Authorities thực tế tạo ra: " + authorities);

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userId, null, authorities);

                if (sessionId != null) {
                    CustomWebAuthenticationDetails details = new CustomWebAuthenticationDetails(request, sessionId);
                    authentication.setDetails(details);
                } else {
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                }

//                logger.info("--> Set SecurityContext thành công!");

                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (Exception e) {
                logger.error("Token không hợp lệ hoặc đã hết hạn: " + e.getMessage());

                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("""
                    {
                        "status": 401,
                        "error": "Unauthorized",
                        "message": "Token không hợp lệ hoặc đã hết hạn!"
                    }
                """);
                return;
            }
        }  else {
        logger.info("--> Request KHÔNG CÓ token hoặc sai định dạng Bearer");
        }
        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator/");
    }

}