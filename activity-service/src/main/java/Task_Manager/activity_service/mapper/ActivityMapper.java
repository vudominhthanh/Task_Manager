package Task_Manager.activity_service.mapper;

import Task_Manager.activity_service.dto.ActivityEvent;
import Task_Manager.activity_service.dto.ActivityResponse;
import Task_Manager.activity_service.entity.Activity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@Mapper(componentModel = "spring")
public interface ActivityMapper {

    @Mapping(source = "targetType", target = "targetType")
    @Mapping(source = "targetId", target = "targetId")
    @Mapping(source = "actionType", target = "actionType")
    @Mapping(source = "userId", target = "userId")
    @Mapping(source = "username", target = "username")
    @Mapping(source = "userAvatar", target = "userAvatar")
    @Mapping(source = "avatarColor", target = "avatarColor")
    @Mapping(source = "projectId", target = "projectId")
    @Mapping(source = "projectName", target = "projectName")
    @Mapping(source = "targetName", target = "targetName")
    @Mapping(source = "payloadDetails", target = "payloadDetails")
    Activity toEntity(ActivityEvent event);

    @Mapping(source = "id", target = "id", qualifiedByName = "uuidToString")
    @Mapping(source = "username", target = "user")
    @Mapping(source = "userAvatar", target = "userAvatar")
    @Mapping(source = "avatarColor", target = "avatarColor", qualifiedByName = "defaultAvatarColor")
    @Mapping(source = "actionType", target = "action", qualifiedByName = "actionText")
    @Mapping(source = "actionType", target = "actionType")
    @Mapping(source = "targetName", target = "target")
    @Mapping(source = "targetType", target = "targetType")
    @Mapping(source = "payloadDetails", target = "details", qualifiedByName = "extractDetails")
    @Mapping(source = "projectId", target = "project", qualifiedByName = "resolveProjectName")
    @Mapping(source = "createdAt", target = "time", qualifiedByName = "formatTime")
    @Mapping(source = "createdAt", target = "date", qualifiedByName = "formatDate")
    ActivityResponse.Item toItem(Activity activity);

    @Named("uuidToString")
    default String uuidToString(UUID id) {
        return id != null ? id.toString() : null;
    }

    @Named("defaultAvatarColor")
    default String defaultAvatarColor(String avatarColor) {
        return avatarColor != null ? avatarColor : "bg-blue-500";
    }

    @Named("actionText")
    default String actionText(String actionType) {
        if (actionType == null) {
            return "đã thực hiện thao tác trên";
        }

        return switch (actionType) {
            case "USER_REGISTERED" -> "đã đăng ký tài khoản";
            case "USER_LOGGED" -> "đã đăng nhập hệ thống";

            case "TASK_CREATED" -> "đã tạo công việc";
            case "SUB_TASK_CREATED" -> "đã tạo công việc con trong";
            case "TASK_UPDATED" -> "đã chỉnh sửa công việc";
            case "TASK_STATUS_UPDATED" -> "đã thay đổi trạng thái của";
            case "TASK_DELETED" -> "đã xóa công việc";
            case "TASK_ASSIGNED" -> "đã giao công việc";

            case "PROJECT_CREATED" -> "đã khởi tạo dự án";
            case "PROJECT_UPDATED" -> "đã cập nhật thông tin dự án";
            case "PROJECT_DELETED" -> "đã xóa dự án";
            case "MEMBER_ADDED" -> "đã thêm thành viên vào";
            case "MEMBER_REMOVED" -> "đã xóa thành viên khỏi";
            case "MEMBER_ROLE_UPDATED" -> "đã thay đổi vai trò thành viên trong";

            case "COMMENT_CREATED" -> "đã để lại bình luận trong";
            case "COMMENT_UPDATED" -> "đã chỉnh sửa bình luận trong";
            case "COMMENT_DELETED" -> "đã gỡ một bình luận khỏi";

            case "ATTACHMENT_CREATED" -> "đã tải lên tệp đính kèm trong";
            case "ATTACHMENT_DELETED" -> "đã xóa tệp đính kèm khỏi";

            default -> "đã cập nhật";
        };
    }

    @Named("extractDetails")
    default String extractDetails(Map<String, Object> payloadDetails) {
        if (payloadDetails == null || !payloadDetails.containsKey("details")) {
            return "";
        }

        Object details = payloadDetails.get("details");

        return details != null ? String.valueOf(details) : "";
    }

    @Named("formatTime")
    default String formatTime(LocalDateTime createdAt) {
        if (createdAt == null) {
            return "";
        }
        return createdAt.format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    @Named("formatDate")
    default String formatDate(LocalDateTime createdAt) {
        if (createdAt == null) {
            return "";
        }

        LocalDate date = createdAt.toLocalDate();
        LocalDate today = LocalDate.now();

        if (date.equals(today)) {
            return "Hôm nay, " +
                    date.format(DateTimeFormatter.ofPattern("dd/MM"));
        }

        if (date.equals(today.minusDays(1))) {
            return "Hôm qua, " +
                    date.format(DateTimeFormatter.ofPattern("dd/MM"));
        }

        return date.format(
                DateTimeFormatter.ofPattern("dd/MM/yyyy")
        );
    }

    @Named("resolveProjectName")
    default String resolveProjectName(UUID projectId) {
        return projectId != null ? projectId.toString() : "";
    }

}
