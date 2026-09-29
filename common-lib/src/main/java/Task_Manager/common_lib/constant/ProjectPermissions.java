package Task_Manager.common_lib.constant;

public class ProjectPermissions {
    // --- 1. Quyền quản lý Dự án (Project) ---
    public static final String PROJECT_VIEW = "PROJECT_VIEW";
    public static final String PROJECT_UPDATE = "PROJECT_UPDATE";
    public static final String PROJECT_DELETE = "PROJECT_DELETE";

    // --- 2. Quyền quản lý Thành viên (Member) ---
    public static final String MEMBER_VIEW = "MEMBER_VIEW";
    public static final String MEMBER_ADD = "MEMBER_ADD";
    public static final String MEMBER_REMOVE = "MEMBER_REMOVE";
    public static final String MEMBER_ROLE_UPDATE = "MEMBER_ROLE_UPDATE";

    // --- 3. Quyền quản lý Công việc (Task) ---
    public static final String TASK_VIEW = "TASK_VIEW";
    public static final String TASK_CREATE = "TASK_CREATE";
    public static final String TASK_UPDATE = "TASK_UPDATE";
    public static final String TASK_DELETE = "TASK_DELETE";
    public static final String TASK_ASSIGN = "TASK_ASSIGN";

    // --- 4. Quyền quản lý Bình luận (Comment) ---
    public static final String COMMENT_VIEW = "COMMENT_VIEW";
    public static final String COMMENT_CREATE = "COMMENT_CREATE";
    public static final String COMMENT_UPDATE_OWN = "COMMENT_UPDATE_OWN";
    public static final String COMMENT_DELETE_OWN = "COMMENT_DELETE_OWN";
    public static final String COMMENT_DELETE_ANY = "COMMENT_DELETE_ANY";

    // --- 5. Quyền quản lý Tệp đính kèm (Attachment) ---
    public static final String ATTACHMENT_VIEW = "ATTACHMENT_VIEW";
    public static final String ATTACHMENT_UPLOAD = "ATTACHMENT_UPLOAD";
    public static final String ATTACHMENT_DELETE_OWN = "ATTACHMENT_DELETE_OWN";
    public static final String ATTACHMENT_DELETE_ANY = "ATTACHMENT_DELETE_ANY";
}