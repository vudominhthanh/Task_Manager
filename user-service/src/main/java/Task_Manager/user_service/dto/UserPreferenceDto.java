package Task_Manager.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreferenceDto {
    private String theme;
    private String accentColor;
    private String density;
    private String language;
    private String dateFormat;
    private String timeFormat;
}