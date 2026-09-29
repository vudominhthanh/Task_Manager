import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import apiClient from "../../utils/apiClient";
import {
  User, Bell, Palette, Users, FolderGit2, FileText, Sliders, Sparkles,
} from "lucide-react";
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent, getDensity } from "../../utils/preferenceTokens";

export default function SettingsLayout() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  const { accent, density } = usePreferences();
  const A = getAccent(accent);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      } else {
        setCurrentUser({
          fullName: localStorage.getItem("fullName") || "Người dùng",
          email: localStorage.getItem("email") || "user@workflow.com",
          role: localStorage.getItem("role") || "ROLE_USER",
        });
      }
    } catch (e) {
      console.error("Lỗi đọc user:", e);
    }
  }, []);

  const isSystemAdmin = currentUser?.role === "SYS_AD" || currentUser?.isSystemAdmin === true;

  const userTabs = [
    { to: "/settings/profile",       icon: User,    label: "Hồ sơ và bảo mật" },
    { to: "/settings/notifications", icon: Bell,    label: "Thông báo" },
    { to: "/settings/preferences",   icon: Palette, label: "Giao diện" },
  ];

  const adminTabs = isSystemAdmin
    ? [
        { to: "/admin-dashboard", icon: Users, label: "Người dùng" },
      ]
    : [];

  const tabClass = ({ isActive }) => `
    flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium transition-all relative whitespace-nowrap cursor-pointer
    ${isActive
      ? `${A.text} font-bold`
      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 rounded-t-lg"}
  `;

  const renderTab = (tab) => (
    <NavLink key={tab.to} to={tab.to} className={tabClass}>
      {({ isActive }) => (
        <>
          <tab.icon size={15} className={isActive ? A.icon : "text-gray-400 dark:text-gray-500"} />
          <span>{tab.label}</span>
          {isActive && <div className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full ${A.solidBg.split(" ")[0]}`} />}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#F9FAFB] dark:bg-gray-950 overflow-hidden font-sans transition-colors">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 pt-5 shrink-0 z-10 shadow-xs">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-[20px] font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                Cài đặt hệ thống
              </h1>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                Quản lý tài khoản cá nhân {isSystemAdmin && "& Phân hệ quản trị toàn sàn"}
              </p>
            </div>
          </div>

          {isSystemAdmin && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${A.softBg} border ${A.border} ${A.textStrong} text-[11px] font-bold rounded-lg shrink-0`}>
              <Sparkles size={12} className={A.icon} /> System Admin
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-t border-gray-100 dark:border-gray-800 pt-1">
          {userTabs.map(renderTab)}

          {isSystemAdmin && <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-2 shrink-0" />}

          {adminTabs.map(renderTab)}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 lg:p-8 min-h-0">
        <div className="max-w-4xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}