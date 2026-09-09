package Task_Manager.activity_service.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class TaskDto {
    private UUID id;
    private String title;
}
