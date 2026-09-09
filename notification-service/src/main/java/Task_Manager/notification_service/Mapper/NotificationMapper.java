package Task_Manager.notification_service.Mapper;

import Task_Manager.notification_service.dto.NotificationResponse;
import Task_Manager.notification_service.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    @Mapping(source = "id", target = "id")
    @Mapping(source = "message", target = "title")
    @Mapping(source = "type", target = "type")
    @Mapping(source = "target", target = "target")
    @Mapping(source = "project", target = "project")
    @Mapping(source = "read", target = "read")
    @Mapping(source = "createdAt", target = "time", qualifiedByName = "formatTime")
    @Mapping(target = "avatar", ignore = true)
    NotificationResponse toResponse(Notification notification);

    @Named("formatTime")
    default String formatTime(LocalDateTime createdAt) {
        if (createdAt == null) return "";

        LocalDate itemDate = createdAt.toLocalDate();
        LocalDate today = LocalDate.now();

        if (itemDate.equals(today)) {
            return createdAt.format(DateTimeFormatter.ofPattern("HH:mm"));
        }
        if (itemDate.equals(today.minusDays(1))) {
            return "Hôm qua " + createdAt.format(DateTimeFormatter.ofPattern("HH:mm"));
        }
        return createdAt.format(DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy"));
    }
}