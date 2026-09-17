package Task_Manager.task_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StorageConfigDto {
    private Long maxFileSizeMb;
    private String allowedExtensions;
    private String smtpHost;
    private String smtpPort;
    private String smtpEmail;
    private Boolean systemMaintenance;
}