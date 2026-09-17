package Task_Manager.task_service.service;

import Task_Manager.task_service.dto.StorageConfigDto;

public interface SystemConfigService {
    StorageConfigDto getStorageConfig();
    StorageConfigDto updateStorageConfig(StorageConfigDto dto, boolean isSystemAdmin);
}