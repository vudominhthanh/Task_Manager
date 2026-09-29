package Task_Manager.common_lib.security;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Slf4j
@Configuration
public class FeignJwtInterceptor implements RequestInterceptor {
    @Override
    public void apply(RequestTemplate requestTemplate) {
        ServletRequestAttributes servletRequestAttributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

        if(servletRequestAttributes != null) {
            HttpServletRequest request = servletRequestAttributes.getRequest();
            String authorization = request.getHeader("Authorization");
            if (authorization != null && authorization.startsWith("Bearer ")) {
                requestTemplate.header("Authorization", authorization);
            }
        }
        log.debug(">>> [FeignJwtInterceptor] Không tìm thấy HTTP Request Context hiện tại (Có thể đang chạy WebSocket/Async). Header Authorization không được đính kèm.");
    }
}
