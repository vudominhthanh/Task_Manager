package Task_Manager.report_service;

import Task_Manager.common_lib.exception.GlobalExceptionHandler;
import Task_Manager.common_lib.security.FeignJwtInterceptor;
import Task_Manager.common_lib.security.JwtAccessDeniedHandler;
import Task_Manager.common_lib.security.JwtAuthenticationEntryPoint;
import Task_Manager.common_lib.security.JwtValidationFilter;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@EnableFeignClients
@Import({JwtValidationFilter.class, FeignJwtInterceptor.class, GlobalExceptionHandler.class, JwtAuthenticationEntryPoint.class, JwtAccessDeniedHandler.class})
public class ReportServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ReportServiceApplication.class, args);
    }
}

