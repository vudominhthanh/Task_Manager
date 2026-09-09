package Task_Manager.report_service.dto;

import lombok.*;
import java.util.List;
import java.util.UUID;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class OverViewResponse {
    private Stats stats;
    private List<QuickProject> quickProjects;
    private List<ActivityDto> recentActivities;

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Stats {
        private Metric activeProjects;
        private Metric completedThisWeek;
        private Metric overdueTasks;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Metric {
        private String value;
        private String trend;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class QuickProject {
        private UUID id;
        private String name;
        private boolean isStarred;
        private String lastActive;
        private int progress;
    }

    @Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ActivityDto {
        private UUID id;
        private String type;
        private String user;
        private String action;
        private String target;
        private String time;
    }
}