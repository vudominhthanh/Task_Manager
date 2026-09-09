package Task_Manager.activity_service.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ActivityResponse {
    @Data
    @Builder
    public static class Group {
        private Long id;
        private String date;
        private List<Item> logs;
    }

    @Data
    @Builder
    public static class Item {
        private String id;
        private String user;
        private String userAvatar;
        private String avatarColor;
        private String action;
        private String actionType;
        private String target;
        private String targetType;
        private String details;
        private String project;
        private String time;
        private String date;
    }
}