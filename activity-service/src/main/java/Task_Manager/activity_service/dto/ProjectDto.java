package Task_Manager.activity_service.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ProjectDto {
    private UUID id;
    private String name;
    private String description;
    private UUID ownerId;
    private LocalDate startDate;
    private LocalDate endDate;
}

