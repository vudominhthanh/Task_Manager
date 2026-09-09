    package Task_Manager.project_service.dto;

    import lombok.Data;

    import java.util.UUID;

    @Data
    public class ProjectMemberResponse {
        private UUID userId;
        private String fullName;
        private String email;
        private String status;
        private UUID projectId;
        private String role;
    }
