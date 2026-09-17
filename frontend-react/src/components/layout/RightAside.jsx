import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apiClient from "../../utils/apiClient";
import { LayoutGrid, LogOut, Sparkles } from "lucide-react";
import ProjectRight from "../right-aside/ProjectRight"; 
import { useEvent , EVENTS } from "../../hooks/useEventBus";

const RightAside = ({ selectedTaskId, onCloseTask }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isProjectRoute = location.pathname.startsWith("/project");

  const [currentUser, setCurrentUser] = useState(null);

  const loadCurrentUser = useCallback((updatedUserData = null) => {
    if (updatedUserData && typeof updatedUserData === "object") {
      setCurrentUser(prev => ({ ...prev, ...updatedUserData }));
      return;
    }

    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      } else {
        setCurrentUser({
          fullName: localStorage.getItem("fullName") || "Thành viên",
          email: localStorage.getItem("email") || "user@workflow.com"
        });
      }
    } catch (e) {
      console.error("Lỗi đọc thông tin user:", e);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEvent(EVENTS.USER, (eventData) => {
    loadCurrentUser(eventData);
  });

  const handleLogout = () => {
    localStorage.clear(); 
    window.location.href = "/login";
  };

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : "U";
  };

  return (
    <aside className="w-full h-full bg-white flex flex-col font-sans text-gray-800 overflow-hidden border-l border-gray-200">
      
      {/* 1. HEADER USER HIỆN TẠI & NÚT LOGOUT */}
      <div className="pt-4 pb-4 px-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-indigo-50/40 via-white to-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              {currentUser ? getInitial(currentUser.fullName) : "U"}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>

          <div className="flex flex-col truncate">
            <span className="text-[13px] font-bold text-gray-900 truncate flex items-center gap-1">
              {currentUser?.fullName || "Người dùng"}
              <Sparkles size={12} className="text-amber-500 fill-amber-400 shrink-0" />
            </span>
            <span className="text-[11px] text-gray-400 truncate font-medium">
              {currentUser?.email || "workspace@workflow.com"}
            </span>
          </div>
        </div>

        {/* Nút Logout gọi hàm handleLogout */}
        <button 
          onClick={handleLogout}
          title="Đăng xuất hệ thống"
          className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 shrink-0 border border-gray-100 shadow-2xs cursor-pointer group"
        >
          <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* 2. NỘI DUNG ĐỘNG BÊN DƯỚI */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {!isProjectRoute ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50/30">
            <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center text-indigo-400 mb-3">
              <LayoutGrid size={24} />
            </div>
            <h3 className="text-[14px] font-bold text-gray-800 mb-1">Hệ thống WorkFlow</h3>
            <p className="text-[12px] text-gray-400 max-w-[210px] leading-relaxed">
              Chọn một dự án ở menu bên trái để bắt đầu quản lý và theo dõi công việc.
            </p>
          </div>
        ) : (
          <ProjectRight 
            taskId={selectedTaskId} 
            onClose={onCloseTask} 
          />
        )}
      </div>
    </aside>
  );
};

export default RightAside;