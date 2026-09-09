package Task_Manager.activity_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityEvent {
    private String targetType;
    private String targetId;
    private String actionType;
    private String userId;
    private String username;
    private String userAvatar;
    private String avatarColor;
    private String projectId;
    private String projectName;
    private String targetName;
    private Map<String, Object> payloadDetails;
}
