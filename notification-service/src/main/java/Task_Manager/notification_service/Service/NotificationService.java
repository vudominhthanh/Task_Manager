package Task_Manager.notification_service.Service;

import Task_Manager.notification_service.Mapper.NotificationMapper;
import Task_Manager.notification_service.client.UserClient;
import Task_Manager.notification_service.dto.NotificationResponse;
import Task_Manager.notification_service.dto.UserDto;
import Task_Manager.notification_service.entity.Notification;
import Task_Manager.notification_service.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final UserClient userClient;

    public List<NotificationResponse> getUserNotifications(UUID userId) {
        List<Notification> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);

        if (notifications.isEmpty()) {
            return List.of();
        }

        List<UUID> actorIds = notifications.stream()
                .map(Notification::getActorId)
                .filter(id -> id != null)
                .distinct()
                .collect(Collectors.toList());

        Map<UUID, UserDto> userMap = Map.of();
        try {
            if (!actorIds.isEmpty()) {
                List<UserDto> users = userClient.getUsersByIds(actorIds);
                userMap = users.stream().collect(Collectors.toMap(UserDto::getId, Function.identity(), (u1, u2) -> u1));
            }
        } catch (Exception e) {
            log.warn("Lỗi batch user: {}", e.getMessage());
        }

        Map<UUID, UserDto> finalUserMap = userMap;

        return notifications.stream().map(noti -> {
            NotificationResponse response = notificationMapper.toResponse(noti);

            if (noti.getActorId() != null && finalUserMap.containsKey(noti.getActorId())) {
                UserDto actor = finalUserMap.get(noti.getActorId());
                String avatar = actor.getAvatarUrl() != null ? actor.getAvatarUrl() :
                        (actor.getUsername() != null && !actor.getUsername().isEmpty() ? actor.getUsername().substring(0, 1).toUpperCase() : "U");
                response.setAvatar(avatar);
            } else {
                response.setAvatar("U");
            }

            response.setProject(noti.getProject() != null && !noti.getProject().isEmpty() ? noti.getProject() : "Hệ thống Quản lý");

            return response;
        }).collect(Collectors.toList());
    }

    public NotificationResponse createNotification(UUID recipientId, UUID actorId, String type, String target, String project, String message) {
        Notification notification = Notification.builder()
                .recipientId(recipientId)
                .actorId(actorId)
                .type(type)
                .target(target)
                .project(project)
                .message(message)
                .read(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        NotificationResponse response = notificationMapper.toResponse(saved);
        response.setAvatar("U");
        response.setProject(project != null ? project : "Hệ thống Quản lý");

        return response;
    }

    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            if (notification.getRecipientId().equals(userId)) {
                notification.setRead(true);
                notificationRepository.save(notification);
            }
        });
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        List<Notification> unreadList = notificationRepository.findByRecipientIdAndReadFalse(userId);
        if (!unreadList.isEmpty()) {
            unreadList.forEach(n -> n.setRead(true));
            notificationRepository.saveAll(unreadList);
        }
    }

    public long countUnreadNotifications(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }
}