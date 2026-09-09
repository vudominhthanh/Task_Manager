package Task_Manager.websocket_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;

@SpringBootApplication
public class WebsocketServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(WebsocketServiceApplication.class, args);
	}

}
