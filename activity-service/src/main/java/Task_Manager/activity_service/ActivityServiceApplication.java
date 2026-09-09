package Task_Manager.activity_service;

import Task_Manager.common_lib.security.JwtValidationFilter;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.cloud.openfeign.FeignClientsConfiguration;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@EnableFeignClients
@Import({JwtValidationFilter.class, FeignClientsConfiguration.class})
public class ActivityServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(ActivityServiceApplication.class, args);
	}

}
