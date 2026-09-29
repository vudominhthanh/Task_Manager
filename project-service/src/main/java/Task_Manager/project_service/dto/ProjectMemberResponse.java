    package Task_Manager.project_service.dto;

    import lombok.AllArgsConstructor;
    import lombok.Builder;
    import lombok.Data;
    import lombok.NoArgsConstructor;

    import java.util.UUID;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public class ProjectMemberResponse {
        private UUID projectId;
        private UUID userId;
        private String fullName;
        private String email;
        private String role;
        private String status;
    }
