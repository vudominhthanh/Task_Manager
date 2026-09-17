package Task_Manager.task_service.service.impl;

import Task_Manager.common_lib.exception.ForbiddenAccessException;
import Task_Manager.common_lib.utils.Translator;
import Task_Manager.task_service.dto.StorageConfigDto;
import Task_Manager.task_service.entity.SystemConfig;
import Task_Manager.task_service.repository.SystemConfigRepository;
import Task_Manager.task_service.service.SystemConfigService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SystemConfigServiceImpl implements SystemConfigService {

    private static final String STORAGE_CONFIG_KEY = "STORAGE_POLICY";
    private final SystemConfigRepository configRepository;
    private final ObjectMapper objectMapper;

    @Override
    public StorageConfigDto getStorageConfig() {
        return configRepository.findById(STORAGE_CONFIG_KEY)
                .map(config -> {
                    try {
                        return objectMapper.readValue(config.getConfigValue(), StorageConfigDto.class);
                    } catch (Exception e) {
                        log.error("Lỗi parse config từ DB: {}", e.getMessage());
                        return getDefaultConfig();
                    }
                })
                .orElseGet(this::getDefaultConfig);
    }

    @Override
    public StorageConfigDto updateStorageConfig(StorageConfigDto dto, boolean isSystemAdmin) {
        if (!isSystemAdmin) {
            throw new ForbiddenAccessException(Translator.toLocale("error.admin.access_denied"));
        }

        try {
            String jsonVal = objectMapper.writeValueAsString(dto);
            SystemConfig entity = configRepository.findById(STORAGE_CONFIG_KEY)
                    .orElse(new SystemConfig(STORAGE_CONFIG_KEY, jsonVal));
            entity.setConfigValue(jsonVal);
            configRepository.save(entity);
            return dto;
        } catch (Exception e) {
            log.error("Lỗi lưu cấu hình hệ thống: {}", e.getMessage());
            throw new RuntimeException("Không thể lưu cấu hình hệ thống");
        }
    }

    private StorageConfigDto getDefaultConfig() {
        return StorageConfigDto.builder()
                .maxFileSizeMb(25L)
                .allowedExtensions(".pdf, .png, .jpg, .docx, .zip")
                .smtpHost("smtp.gmail.com")
                .smtpPort("587")
                .smtpEmail("notifications@workflow.com")
                .systemMaintenance(false)
                .build();
    }
}