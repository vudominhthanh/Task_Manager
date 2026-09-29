package Task_Manager.notification_service.Service;

import Task_Manager.notification_service.Mapper.NotificationMapper;
import Task_Manager.notification_service.client.UserClient;
import Task_Manager.notification_service.dto.NotificationResponse;
import Task_Manager.notification_service.dto.UserDto;
import Task_Manager.notification_service.entity.Notification;
import Task_Manager.notification_service.entity.NotificationSetting;
import Task_Manager.notification_service.repository.NotificationRepository;

import Task_Manager.common_lib.exception.ResourceNotFoundException;
import Task_Manager.common_lib.exception.ForbiddenAccessException;
import Task_Manager.common_lib.utils.Translator;

import Task_Manager.notification_service.repository.NotificationSettingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final UserClient userClient;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationSettingRepository notificationSettingRepository;

    @Override
    public List<NotificationResponse> getUserNotifications(UUID userId) {
        List<Notification> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);
        if (notifications.isEmpty()) {
            return List.of();
        }
        Map<UUID, UserDto> actorMap = fetchActorDetails(notifications);

        return notifications.stream()
                .map(noti -> enrichNotificationResponse(noti, actorMap))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public NotificationResponse createNotification(UUID recipientId, UUID actorId, String type, String target, String project, String message) {
        NotificationSetting setting = getOrCreateUserSetting(recipientId);

        if (!shouldSendNotification(setting, type)) {
            log.info("Bỏ qua thông báo loại [{}] cho user [{}] do cấu hình cá nhân đang tắt.", type, recipientId);
            return null;
        }

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
        response.setProject(resolveProjectName(project));

        if (setting.isPushNotifications()) {
            messagingTemplate.convertAndSendToUser(
                    recipientId.toString(),
                    "/queue/notifications",
                    response
            );
        }

        return response;
    }

    @Override
    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        Translator.toLocale("error.notification.not_found", notificationId)
                ));

        if (!notification.getRecipientId().equals(userId)) {
            throw new ForbiddenAccessException(Translator.toLocale("error.access.denied"));
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Override
    @Transactional
    public void markAllAsRead(UUID userId) {
        List<Notification> unreadList = notificationRepository.findByRecipientIdAndReadFalse(userId);
        if (!unreadList.isEmpty()) {
            unreadList.forEach(n -> n.setRead(true));
            notificationRepository.saveAll(unreadList);
        }
    }

    @Override
    public long countUnreadNotifications(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    public void createGlobalNotification(UUID adminId, String message, List<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) return;

        List<Notification> notifications = userIds.stream().map(userId -> {
            Notification notif = new Notification();
            notif.setRecipientId(userId);
            notif.setActorId(adminId);
            notif.setType("SYSTEM_BROADCAST");
            notif.setMessage(message);
            notif.setRead(false);
            return notif;
        }).toList();

        notificationRepository.saveAll(notifications);

        Map<String, String> wsPayload = Map.of(
                "type", "SYSTEM_ALERT",
                "message", message,
                "timestamp", String.valueOf(System.currentTimeMillis())
        );

        for (UUID userId : userIds) {
            messagingTemplate.convertAndSendToUser(userId.toString(), "/queue/notifications", wsPayload);
        }
    }


    public NotificationSetting getOrCreateUserSetting(UUID userId) {
        return notificationSettingRepository.findById(userId)
                .orElseGet(() -> notificationSettingRepository.save(
                        NotificationSetting.builder()
                                .id(userId)
                                .notifyOnAssigned(true)
                                .notifyOnMention(true)
                                .notifyOnStatusChange(false)
                                .emailNotifications(true)
                                .pushNotifications(true)
                                .build()
                ));
    }

    @Transactional
    public NotificationSetting updateUserNotificationSetting(UUID userId, NotificationSetting newSetting) {
        NotificationSetting current = getOrCreateUserSetting(userId);
        current.setNotifyOnAssigned(newSetting.isNotifyOnAssigned());
        current.setNotifyOnMention(newSetting.isNotifyOnMention());
        current.setNotifyOnStatusChange(newSetting.isNotifyOnStatusChange());
        current.setEmailNotifications(newSetting.isEmailNotifications());
        current.setPushNotifications(newSetting.isPushNotifications());
        return notificationSettingRepository.save(current);
    }




    private boolean shouldSendNotification(NotificationSetting setting, String type) {
        if (type == null) return true;

        return switch (type.toUpperCase()) {
            case "TASK_ASSIGNED", "TASK_CREATED" -> setting.isNotifyOnAssigned();
            case "TASK_STATUS_UPDATED" -> setting.isNotifyOnStatusChange();
            case "MENTION", "COMMENT_MENTION" -> setting.isNotifyOnMention();
            default -> true;
        };
    }

    private Map<UUID, UserDto> fetchActorDetails(List<Notification> notifications) {
        List<UUID> actorIds = notifications.stream()
                .map(Notification::getActorId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        if (actorIds.isEmpty()) {
            return Map.of();
        }

        try {
            List<UserDto> users = userClient.getUsersByIds(actorIds);
            return users.stream().collect(Collectors.toMap(UserDto::getId, Function.identity(), (u1, u2) -> u1));
        } catch (Exception e) {
            log.warn("Lỗi batch user khi gọi UserClient: {}", e.getMessage());
            return Map.of();
        }
    }

    private NotificationResponse enrichNotificationResponse(Notification noti, Map<UUID, UserDto> actorMap) {
        NotificationResponse response = notificationMapper.toResponse(noti);

        response.setAvatar(resolveAvatar(noti.getActorId(), actorMap));
        response.setProject(resolveProjectName(noti.getProject()));

        if (noti.getActorId() != null && actorMap.containsKey(noti.getActorId())) {
            UserDto actor = actorMap.get(noti.getActorId());
            String actorName = (actor.getFullName() != null && !actor.getFullName().trim().isEmpty())
                    ? actor.getFullName() : actor.getUsername();
            response.setActorName(actorName);
        } else {
            response.setActorName("Hệ thống");
        }

        return response;
    }

    private String resolveAvatar(UUID actorId, Map<UUID, UserDto> actorMap) {
        if (actorId == null || !actorMap.containsKey(actorId)) {
            return "U";
        }

        UserDto actor = actorMap.get(actorId);

        if (actor.getAvatarUrl() != null && !actor.getAvatarUrl().isEmpty()) {
            return actor.getAvatarUrl();
        }

        if (actor.getUsername() != null && !actor.getUsername().isEmpty()) {
            return actor.getUsername().substring(0, 1).toUpperCase();
        }

        return "U";
    }

    private String resolveProjectName(String project) {
        return (project != null && !project.trim().isEmpty()) ? project : "Hệ thống Quản lý";
    }
}