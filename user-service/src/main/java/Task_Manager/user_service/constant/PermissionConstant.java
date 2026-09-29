package Task_Manager.user_service.constant;

public final class PermissionConstant {
    private PermissionConstant() {}

    // --- 1. QUẢN LÝ NGƯỜI DÙNG (USER MANAGEMENT) ---
    public static final String USER_READ = "USER_READ";
    public static final String USER_WRITE = "USER_WRITE";
    public static final String USER_DELETE = "USER_DELETE";
    public static final String USER_STATUS_UPDATE = "USER_STATUS_UPDATE";
    public static final String USER_ROLE_UPDATE = "USER_ROLE_UPDATE";

    // --- 2. QUẢN LÝ VAI TRÒ & QUYỀN HỆ THỐNG (RBAC MANAGEMENT) ---
    public static final String ROLE_READ = "ROLE_READ";
    public static final String ROLE_WRITE = "ROLE_WRITE";
    public static final String ROLE_DELETE = "ROLE_DELETE";

    // --- 3. QUẢN LÝ DỰ ÁN CẤP HỆ THỐNG (GLOBAL PROJECT MANAGEMENT) ---
    public static final String PROJECT_CREATE = "PROJECT_CREATE";
    public static final String PROJECT_VIEW_ALL = "PROJECT_VIEW_ALL";
    public static final String PROJECT_DELETE_ANY = "PROJECT_DELETE_ANY";

    // --- 4. BÁO CÁO & THỐNG KÊ (REPORTING & ANALYTICS) ---
    public static final String REPORT_SYSTEM_VIEW = "REPORT_SYSTEM_VIEW";
    public static final String REPORT_FINANCIAL_VIEW = "REPORT_FINANCIAL_VIEW";

    // --- 5. CẤU HÌNH HỆ THỐNG (SYSTEM SETTINGS) ---
    public static final String SYSTEM_CONFIG_READ = "SYSTEM_CONFIG_READ";
    public static final String SYSTEM_CONFIG_WRITE = "SYSTEM_CONFIG_WRITE";
}