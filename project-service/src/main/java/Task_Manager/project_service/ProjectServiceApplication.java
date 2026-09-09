package Task_Manager.project_service;

import Task_Manager.common_lib.security.FeignJwtInterceptor;
import Task_Manager.common_lib.security.JwtValidationFilter;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@EnableDiscoveryClient
@EnableFeignClients
@Import({FeignJwtInterceptor.class, JwtValidationFilter.class})
public class ProjectServiceApplication {
	public static void main(String[] args) {
		SpringApplication.run(ProjectServiceApplication.class, args);
	}
}
