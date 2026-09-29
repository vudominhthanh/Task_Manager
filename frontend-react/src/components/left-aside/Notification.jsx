import React, { useState, useEffect, useCallback } from "react";
import { useEvent, EVENTS, emitEvent } from "../../hooks/useEventBus";
import apiClient from "../../utils/apiClient";
import {
  Bell, CheckCircle2, MessageSquare, Clock, UserPlus, FileEdit,
  FolderKanban, Check, Paperclip, Trash2, ListTodo, PlayCircle, Eye,
} from "lucide-react";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState([]);

  // ==== Preferences toàn cục ====
  const { accent, density } = usePreferences();
  const A = getAccent(accent);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get("http://localhost:8082/api/notifications");
      setNotifications(response.data);
    } catch (err) {
      console.error("Lỗi tải thông báo:", err);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEvent(EVENTS.NOTIFICATION, fetchNotifications);

  const markAllAsRead = async () => {
    try {
      await apiClient.patch("http://localhost:8082/api/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      emitEvent(EVENTS.NOTIFICATION);
    } catch (err) {
      console.error("Lỗi đánh dấu đã đọc tất cả:", err);
    }
  };

  const markAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await apiClient.put(`http://localhost:8082/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      emitEvent(EVENTS.NOTIFICATION);
    } catch (err) {
      console.error("Lỗi cập nhật đã đọc:", err);
    }
  };

  const getNotificationIcon = (type, text = "") => {
    const textUpper = text.toUpperCase();

    if (type === "TASK_STATUS_UPDATED") {
      if (textUpper.includes("CẦN LÀM") || textUpper.includes("TO_DO") || textUpper.includes("MỚI")) {
        return {
          icon: ListTodo,
          color: "text-slate-500 dark:text-slate-400",
          bgColor: "bg-slate-100 dark:bg-slate-800",
        };
      }
      if (textUpper.includes("ĐANG THỰC HIỆN") || textUpper.includes("IN_PROGRESS")) {
        return {
          icon: PlayCircle,
          color: "text-blue-500 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/30",
        };
      }
      if (textUpper.includes("CHỜ DUYỆT") || textUpper.includes("REVIEW")) {
        return {
          icon: Eye,
          color: "text-amber-500 dark:text-amber-400",
          bgColor: "bg-amber-50 dark:bg-amber-900/30",
        };
      }
      if (textUpper.includes("HOÀN THÀNH") || textUpper.includes("DONE")) {
        return {
          icon: CheckCircle2,
          color: "text-emerald-500 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
        };
      }
      return {
        icon: CheckCircle2,
        color: "text-emerald-500 dark:text-emerald-400",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
      };
    }

    switch (type) {
      case "COMMENT_CREATED":
      case "COMMENT_UPDATED":
        return {
          icon: MessageSquare,
          color: "text-blue-500 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/30",
        };
      case "TASK_CREATED":
      case "SUB_TASK_CREATED":
        return { icon: Clock, color: A.icon, bgColor: A.softBg };
      case "TASK_UPDATED":
        return {
          icon: FileEdit,
          color: "text-amber-500 dark:text-amber-400",
          bgColor: "bg-amber-50 dark:bg-amber-900/30",
        };
      case "TASK_DELETED":
      case "COMMENT_DELETED":
        return {
          icon: Trash2,
          color: "text-red-500 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-900/30",
        };
      case "MEMBER_ADDED":
      case "MEMBER_ROLE_UPDATED":
        return {
          icon: UserPlus,
          color: "text-purple-500 dark:text-purple-400",
          bgColor: "bg-purple-50 dark:bg-purple-900/30",
        };
      case "PROJECT_CREATED":
      case "PROJECT_UPDATED":
        return {
          icon: FolderKanban,
          color: "text-cyan-500 dark:text-cyan-400",
          bgColor: "bg-cyan-50 dark:bg-cyan-900/30",
        };
      case "ATTACHMENT_CREATED":
        return {
          icon: Paperclip,
          color: "text-teal-500 dark:text-teal-400",
          bgColor: "bg-teal-50 dark:bg-teal-900/30",
        };
      default:
        return {
          icon: Bell,
          color: "text-gray-500 dark:text-gray-400",
          bgColor: "bg-gray-50 dark:bg-gray-800",
        };
    }
  };

  const formatMessageText = (text) => {
    if (!text) return "";
    return text
      .replace(/TO_DO/g, "Cần làm")
      .replace(/IN_PROGRESS/g, "Đang thực hiện")
      .replace(/REVIEW/g, "Chờ duyệt")
      .replace(/DONE/g, "Hoàn thành")
      .replace(/ROLE_ADMIN/g, "Quản trị viên")
      .replace(/ROLE_USER/g, "Thành viên thường")
      .replace(/SYS_AD/g, "Admin hệ thống")
      .replace(/MEMBER/g, "Thành viên");
  };

  const filteredNotifications = notifications.filter((noti) => {
    const prefsStr = localStorage.getItem("notification_preferences");
    const prefs = prefsStr
      ? JSON.parse(prefsStr)
      : {
          taskAssigned: true,
          taskStatusChanged: true,
          commentMention: true,
          projectActivities: true,
        };

    const type = (noti.type || "").toUpperCase();
    if (!prefs.taskAssigned && (type === "TASK_CREATED" || type === "SUB_TASK_CREATED")) return false;
    if (!prefs.taskStatusChanged && type.includes("TASK_STATUS_UPDATED")) return false;
    if (!prefs.commentMention && type.includes("COMMENT")) return false;
    if (!prefs.projectActivities && (type.includes("MEMBER") || type.includes("PROJECT"))) return false;

    const isUnread = !noti.read;
    if (activeTab === "unread") return isUnread;
    if (activeTab === "comments") return type.includes("COMMENT");
    if (activeTab === "tasks") return type.includes("TASK");
    if (activeTab === "projects") return type.includes("MEMBER") || type.includes("PROJECT");

    return true;
  });

  return (
    <div className="p-6 bg-[#F9FAFB] dark:bg-gray-900 w-full min-h-full font-sans overflow-y-auto text-gray-800 dark:text-gray-200 flex justify-center transition-colors duration-300">
      <div className="max-w-4xl w-full">
        {/* HEADER */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              Thông báo hệ thống
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
              Quản lý và theo dõi các cập nhật mới nhất từ dự án và công việc của bạn
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={markAllAsRead}
              className={`flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg border transition-colors shadow-sm cursor-pointer ${A.text} ${A.softBg} ${A.border} ${A.softHoverBg}`}
            >
              <Check size={14} /> Đánh dấu đã đọc tất cả
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 mb-4 px-2 transition-colors">
          {[
            { id: "all", label: "Tất cả" },
            { id: "unread", label: "Chưa đọc" },
            { id: "tasks", label: "Công việc" },
            { id: "comments", label: "Bình luận" },
            { id: "projects", label: "Dự án & Thành viên" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-[13px] font-semibold transition-colors relative cursor-pointer ${
                activeTab === tab.id
                  ? A.text
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className={`absolute bottom-0 left-0 w-full h-[2px] rounded-t-md ${A.bgOnly}`}></div>
              )}
            </button>
          ))}
        </div>

        {/* DANH SÁCH */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-sm overflow-hidden flex flex-col transition-colors">
          {filteredNotifications.map((noti, index) => {
            const isUnread = !noti.read;

            const notificationText = formatMessageText(noti.title || noti.message);
            const iconConfig = getNotificationIcon(noti.type, notificationText);
            const IconComponent = iconConfig.icon;

            return (
              <div
                key={noti.id || index}
                onClick={() => markAsRead(noti.id, noti.read)}
                className={`flex items-start gap-4 ${density === "compact" ? "p-3" : "p-4"} border-b border-gray-100 dark:border-gray-700/50 transition-all cursor-pointer group relative ${
                  isUnread
                    ? `bg-gradient-to-r ${A.headerGradient} via-white to-white hover:brightness-[0.98] dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-l-4 ${A.border}`
                    : "hover:bg-gray-50/80 dark:hover:bg-gray-700/50"
                }`}
              >
                <div className="relative shrink-0 mt-0.5">
                  {noti.avatar && noti.avatar.startsWith("http") ? (
                    <img
                      src={noti.avatar}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-colors ${iconConfig.bgColor} ${iconConfig.color}`}>
                      <IconComponent size={20} />
                    </div>
                  )}

                  {isUnread && (
                    <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 shadow-sm transition-colors ${A.bgOnly}`}></div>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p
                      className={`text-[13.5px] leading-snug transition-colors ${
                        isUnread
                          ? "font-semibold text-gray-900 dark:text-gray-100"
                          : "font-normal text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {notificationText}
                    </p>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap shrink-0 mt-0.5 transition-colors">
                      {noti.time || "Vừa xong"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-gray-500 dark:text-gray-400">
                    {noti.target && (
                      <span className="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[280px] transition-colors">
                        {noti.target}
                      </span>
                    )}
                    {noti.target && noti.project && (
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                    )}
                    <span className={`font-medium px-2 py-0.5 rounded text-[11px] truncate max-w-[200px] transition-colors ${A.text} ${A.softBg}`}>
                      {noti.project || "Hệ thống Quản lý"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredNotifications.length === 0 && (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 mb-3 transition-colors">
                <Bell size={24} />
              </div>
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white mb-1 transition-colors">
                Không có thông báo nào
              </h3>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 transition-colors">
                Bạn đã xem hết tất cả thông báo trong mục này.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;