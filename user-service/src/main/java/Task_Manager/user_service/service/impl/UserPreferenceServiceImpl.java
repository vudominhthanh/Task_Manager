package Task_Manager.user_service.service.impl;

import Task_Manager.user_service.dto.UserPreferenceDto;
import Task_Manager.user_service.entity.UserPreference;
import Task_Manager.user_service.repository.UserPreferenceRepository;
import Task_Manager.user_service.service.UserPreferenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserPreferenceServiceImpl implements UserPreferenceService {

    private final UserPreferenceRepository preferenceRepository;

    @Override
    public UserPreferenceDto getMyPreferences(UUID userId) {
        UserPreference pref = getOrCreateEntity(userId);
        return mapToDto(pref);
    }

    @Override
    @Transactional
    public UserPreferenceDto updatePreferences(UUID userId, UserPreferenceDto request) {
        UserPreference current = getOrCreateEntity(userId);

        if (request.getTheme() != null) current.setTheme(request.getTheme());
        if (request.getAccentColor() != null) current.setAccentColor(request.getAccentColor());
        if (request.getDensity() != null) current.setDensity(request.getDensity());
        if (request.getLanguage() != null) current.setLanguage(request.getLanguage());
        if (request.getDateFormat() != null) current.setDateFormat(request.getDateFormat());
        if (request.getTimeFormat() != null) current.setTimeFormat(request.getTimeFormat());

        UserPreference saved = preferenceRepository.save(current);
        return mapToDto(saved);
    }

    private UserPreference getOrCreateEntity(UUID userId) {
        return preferenceRepository.findById(userId).orElseGet(() -> {
            UserPreference newPref = UserPreference.builder()
                    .userId(userId)
                    .theme("system")
                    .accentColor("indigo")
                    .density("comfortable")
                    .language("vi")
                    .dateFormat("DD/MM/YYYY")
                    .timeFormat("24h")
                    .build();
            return preferenceRepository.save(newPref);
        });
    }

    private UserPreferenceDto mapToDto(UserPreference entity) {
        return UserPreferenceDto.builder()
                .theme(entity.getTheme())
                .accentColor(entity.getAccentColor())
                .density(entity.getDensity())
                .language(entity.getLanguage())
                .dateFormat(entity.getDateFormat())
                .timeFormat(entity.getTimeFormat())
                .build();
    }
}