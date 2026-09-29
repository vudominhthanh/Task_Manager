package Task_Manager.user_service.service;

import Task_Manager.user_service.dto.UserPreferenceDto;
import java.util.UUID;

public interface UserPreferenceService {
    UserPreferenceDto getMyPreferences(UUID userId);
    UserPreferenceDto updatePreferences(UUID userId, UserPreferenceDto request);
}