package Task_Manager.task_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectDto {
    private UUID id;
    private String name;
    private String description;
    private UUID ownerId;
    private LocalDate startDate;
    private LocalDate endDate;
}