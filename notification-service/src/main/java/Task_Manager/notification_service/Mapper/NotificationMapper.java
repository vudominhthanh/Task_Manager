package Task_Manager.notification_service.Mapper;

import Task_Manager.notification_service.client.UserClient;
import Task_Manager.notification_service.dto.NotificationResponse;
import Task_Manager.notification_service.dto.UserDto;
import Task_Manager.notification_service.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

@Mapper(componentModel = "spring")
public abstract class NotificationMapper {

    @Autowired
    protected UserClient userClient;

    @Mapping(target = "actor", expression = "java(getActorInfo(notification.getActorId()))")
    public abstract NotificationResponse toDto(Notification notification);

    protected UserDto getActorInfo(UUID actorId) {
        if (actorId == null) return null;
        try {
            return userClient.getUserById(actorId);
        } catch (Exception e) {
            return null;
        }
    }


}
