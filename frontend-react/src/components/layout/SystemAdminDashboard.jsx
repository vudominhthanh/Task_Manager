import React, { useEffect, useState, useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  ShieldAlert, LayoutDashboard, Users, FolderKanban,
  Settings, Activity, Server, Bell, LogOut, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

const checkIsAdmin = (authData) => {
  if (!authData) return false;
  const user = authData.user || authData;
  const permissions = authData.permissions || user.permissions || [];
  const roles = user.roles || user.systemRoles || [];

  const ROLE_KEYS = ["SYS_AD", "ADMIN", "ROLE_ADMIN", "ROLE_SYS_AD", "SUPER_ADMIN"];
  const PERM_KEYS = [
    "SYSTEM_CONFIG_READ", "USER_READ", "ROLE_READ",
    "REPORT_SYSTEM_VIEW", "PROJECT_VIEW_ALL",
  ];

  if (user.isSystemAdmin === true) return true;
  if (ROLE_KEYS.includes(user.role)) return true;
  if (roles.some((r) => ROLE_KEYS.includes(r?.name || r))) return true;
  if (permissions.some((p) => ROLE_KEYS.includes(p))) return true;
  if (permissions.some((p) => PERM_KEYS.includes(p))) return true;
  return false;
};

export default function SystemAdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminInfo, setAdminInfo] = useState({ name: "Admin", avatar: "A" });

  const adminMenus = useMemo(
    () => [
      { id: "overview", path: "/admin-dashboard",                icon: LayoutDashboard, label: "System Monitor" },
      { id: "users",    path: "/admin-dashboard/user-manage",    icon: Users,           label: "Quản lý người dùng" },
      { id: "projects", path: "/admin-dashboard/project-manage", icon: FolderKanban,    label: "Quản lý dự án" },
      { id: "server",   path: "/admin-dashboard/server",         icon: Server,          label: "Trạng thái Server" },
      { id: "logs",     path: "/admin-dashboard/logs",           icon: Activity,        label: "Nhật ký hệ thống" },
      { id: "settings", path: "/admin-dashboard/settings",       icon: Settings,        label: "Cài đặt nền tảng" },
    ],
    []
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const root = document.documentElement;

    const applyOSTheme = () => {
      root.classList.toggle("dark", mq.matches);
    };

    applyOSTheme();

    mq.addEventListener("change", applyOSTheme);

    return () => {
      mq.removeEventListener("change", applyOSTheme);

      const savedTheme = localStorage.getItem("wf_theme") || "system";
      const shouldDark =
        savedTheme === "dark" ||
        (savedTheme === "system" && mq.matches);

      root.classList.toggle("dark", shouldDark);
    };
  }, []);

  useEffect(() => {
    const authenticate = () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        navigate("/login", { replace: true, state: { from: location.pathname } });
        return;
      }
      try {
        const raw = localStorage.getItem("user");
        if (!raw) {
          navigate("/login", { replace: true });
          return;
        }
        const authData = JSON.parse(raw);

        if (!checkIsAdmin(authData)) {
          toast.error("Bạn không có quyền truy cập khu vực quản trị!");
          navigate("/", { replace: true });
          return;
        }

        const user = authData.user || authData;
        const displayName = user.fullname || user.fullName || user.username || "System Admin";
        setAdminInfo({ name: displayName, avatar: displayName.charAt(0).toUpperCase() });
        setIsAuthorized(true);
      } catch (err) {
        console.error("Lỗi xác thực admin:", err);
        navigate("/login", { replace: true });
      } finally {
        setCheckingAuth(false);
      }
    };
    authenticate();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (checkingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa] dark:bg-gray-950 transition-colors">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={40} />
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 animate-pulse">
            Đang xác thực quyền truy cập...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="flex h-screen w-full bg-[#f8f9fa] dark:bg-gray-950 font-sans overflow-hidden transition-colors">

      {/* ================= ADMIN SIDEBAR ================= */}
      <aside className="w-[260px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0 z-20 shadow-sm transition-colors">
        {/* Logo */}
        <div className="flex items-center gap-2 p-5 mb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="bg-slate-800 dark:bg-slate-700 p-1.5 rounded-lg text-white shadow-sm">
            <ShieldAlert size={18} strokeWidth={2.5} className="text-amber-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[16px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              WorkFlow
            </span>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
              System Admin
            </span>
          </div>
        </div>

        {/* Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <h5 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mb-3 ml-2 uppercase tracking-wider">
            Quản trị hệ thống
          </h5>
          <nav className="flex flex-col gap-1">
            {adminMenus.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 text-[13px] rounded-lg
                  cursor-pointer transition-all duration-200 w-full text-left group
                  ${isActive
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 font-medium"
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={16}
                      className={
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors"
                      }
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 mt-auto transition-colors">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 border border-transparent rounded-lg font-semibold transition-all cursor-pointer"
          >
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ================= MAIN + HEADER ================= */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">

        {/* HEADER */}
        <header className="h-[64px] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shrink-0 transition-colors">
          {/* Search (disabled) */}
          <div className="relative w-[320px]">
            <input
              type="text"
              disabled
              placeholder="Tìm kiếm thông tin hệ thống (đang phát triển)..."
              className="w-full pl-4 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-500 dark:text-gray-400 cursor-not-allowed select-none"
            />
          </div>

          <div className="flex items-center gap-5">
            {/* Bell */}
            <div className="relative cursor-pointer group p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-colors">
              <Bell size={18} className="text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 flex items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-900 animate-pulse"></span>
            </div>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

            {/* Admin info */}
            <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1.5 pr-2 rounded-xl transition-colors">
              <div className="text-right">
                <p className="text-[13px] font-bold text-gray-800 dark:text-gray-100 leading-tight truncate max-w-[120px]">
                  {adminInfo.name}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                  Ops Center
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-slate-700 dark:from-indigo-400 dark:to-slate-600 flex items-center justify-center text-white text-[13px] font-bold shadow-sm">
                {adminInfo.avatar}
              </div>
            </div>
          </div>
        </header>

        {/* MAIN OUTLET */}
        <main className="flex-1 overflow-y-auto bg-[#f8f9fa] dark:bg-gray-950 [scrollbar-width:thin] transition-colors">
          <Outlet />
        </main>
      </div>
    </div>
  );
}