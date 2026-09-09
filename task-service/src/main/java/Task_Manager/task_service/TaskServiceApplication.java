package Task_Manager.task_service;

import Task_Manager.common_lib.security.FeignJwtInterceptor;
import Task_Manager.common_lib.security.JwtValidationFilter;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@EnableFeignClients
@Import({FeignJwtInterceptor.class, JwtValidationFilter.class})
public class TaskServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(TaskServiceApplication.class, args);
	}

}
