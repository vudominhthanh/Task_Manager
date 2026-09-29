package Task_Manager.user_service.service;

import Task_Manager.common_lib.exception.BusinessRuleException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class RateLimiterService {
    private final StringRedisTemplate redisTemplate;

    public void checkRateLimit(String action, int maxRequests, int blockMinutes) {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) return;

        String ipAddress = attributes.getRequest().getRemoteAddr();
        String key = "rate_limit:" + action + ":" + ipAddress;

        Long requests = redisTemplate.opsForValue().increment(key);
        if (requests != null && requests == 1) {
            redisTemplate.expire(key, Duration.ofMinutes(blockMinutes));
        }

        if (requests != null && requests > maxRequests) {
            throw new BusinessRuleException("Bạn đã thao tác quá nhiều lần. Hệ thống tạm khóa IP. Vui lòng thử lại sau " + blockMinutes + " phút.");
        }
    }
}