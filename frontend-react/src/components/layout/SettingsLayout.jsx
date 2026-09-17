import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import apiClient from "../../utils/apiClient";
import { User, Shield, Bell, Palette, Users, FolderGit2, FileText, Sliders, ArrowLeft, Sparkles } from "lucide-react";

export default function SettingsLayout() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      } else {
        setCurrentUser({
          fullName: localStorage.getItem("fullName") || "Người dùng",
          email: localStorage.getItem("email") || "user@workflow.com",
          role: localStorage.getItem("role") || "ROLE_USER"
        });
      }
    } catch (e) {
      console.error("Lỗi đọc user:", e);
    }
  }, []);

  const isSystemAdmin = currentUser?.role === "SYS_AD" || currentUser?.isSystemAdmin === true;

  const userTabs = [
    { to: "/settings/profile", icon: User, label: "Hồ sơ" },
    { to: "/settings/security", icon: Shield, label: "Bảo mật" },
    { to: "/settings/notifications", icon: Bell, label: "Thông báo" },
    { to: "/settings/preferences", icon: Palette, label: "Giao diện" },
  ];

  const adminTabs = [
    { to: "/settings/admin/users", icon: Users, label: "Quản lý User" },
    { to: "/settings/admin/projects", icon: FolderGit2, label: "Quản trị Dự án" },
    { to: "/settings/admin/audit-logs", icon: FileText, label: "Audit Logs" },
    { to: "/settings/admin/config", icon: Sliders, label: "Cấu hình sàn" },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#F9FAFB] overflow-hidden font-sans">
      {/* 1. Header Trang & Thanh Tabs ngang */}
      <header className="bg-white border-b border-gray-200 px-6 pt-5 shrink-0 z-10 shadow-xs">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-[20px] font-bold text-gray-900 tracking-tight leading-tight">
                Cài đặt hệ thống
              </h1>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Quản lý tài khoản cá nhân {isSystemAdmin && "& Phân hệ quản trị toàn sàn"}
              </p>
            </div>
          </div>

          {isSystemAdmin && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold rounded-lg shrink-0">
              <Sparkles size={12} className="text-indigo-600" /> System Admin
            </span>
          )}
        </div>

        {/* Danh sách Tabs cuộn mượt */}
        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-t border-gray-100 pt-1">
          {/* Nhóm tab cá nhân */}
          {userTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `
                flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium transition-all relative whitespace-nowrap cursor-pointer
                ${isActive 
                  ? "text-indigo-600 font-bold" 
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/80 rounded-t-lg"
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={15} className={isActive ? "text-indigo-600" : "text-gray-400"} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 rounded-t-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {isSystemAdmin && <div className="h-4 w-px bg-gray-200 mx-2 shrink-0" />}

          {isSystemAdmin && adminTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `
                flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium transition-all relative whitespace-nowrap cursor-pointer
                ${isActive 
                  ? "text-indigo-600 font-bold" 
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50/80 rounded-t-lg"
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={15} className={isActive ? "text-indigo-600" : "text-gray-400"} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 rounded-t-full" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </header>

      {/* 2. Vùng Content bên dưới (Render trang con) */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 min-h-0">
        <div className="max-w-4xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}