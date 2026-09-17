import React, { useState, useEffect, useCallback } from "react";
import { useEvent, EVENTS, emitEvent } from "../../hooks/useEventBus";
import apiClient from "../../utils/apiClient";
import { Bell, CheckCircle2, MessageSquare, AlertTriangle, Clock, UserPlus, FileEdit, FolderKanban, Check, Paperclip, Trash2, ListTodo, PlayCircle, Eye, } from "lucide-react";

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiClient.get(
        "http://localhost:8082/api/notifications"
      );

      const data = response.data;
      setNotifications(data);
    } catch (err) {
      console.error("Lỗi tải thông báo:", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
      await apiClient.patch(
        `http://localhost:8082/api/notifications/${id}/read`);

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      emitEvent(EVENTS.NOTIFICATION);
    } catch (err) {
      console.error("Lỗi cập nhật đã đọc:", err);
    }
  };

  const getNotificationIcon = (type, text = "") => {
    const textUpper = text.toUpperCase();

    if (type === "TASK_STATUS_UPDATED") {
      if (
        textUpper.includes("CẦN LÀM") ||
        textUpper.includes("TO_DO") ||
        textUpper.includes("MỚI")
      ) {
        return {
          icon: ListTodo,
          color: "text-slate-500",
          bgColor: "bg-slate-100",
        };
      }
      if (
        textUpper.includes("ĐANG THỰC HIỆN") ||
        textUpper.includes("IN_PROGRESS")
      ) {
        return {
          icon: PlayCircle,
          color: "text-blue-500",
          bgColor: "bg-blue-50",
        };
      }
      if (textUpper.includes("CHỜ DUYỆT") || textUpper.includes("REVIEW")) {
        return { icon: Eye, color: "text-amber-500", bgColor: "bg-amber-50" };
      }
      if (textUpper.includes("HOÀN THÀNH") || textUpper.includes("DONE")) {
        return {
          icon: CheckCircle2,
          color: "text-emerald-500",
          bgColor: "bg-emerald-50",
        };
      }
      return {
        icon: CheckCircle2,
        color: "text-emerald-500",
        bgColor: "bg-emerald-50",
      };
    }

    switch (type) {
      case "COMMENT_CREATED":
      case "COMMENT_UPDATED":
        return {
          icon: MessageSquare,
          color: "text-blue-500",
          bgColor: "bg-blue-50",
        };
      case "TASK_CREATED":
      case "SUB_TASK_CREATED":
        return {
          icon: Clock,
          color: "text-indigo-500",
          bgColor: "bg-indigo-50",
        };
      case "TASK_UPDATED":
        return {
          icon: FileEdit,
          color: "text-amber-500",
          bgColor: "bg-amber-50",
        };
      case "TASK_DELETED":
      case "COMMENT_DELETED":
        return { icon: Trash2, color: "text-red-500", bgColor: "bg-red-50" };
      case "MEMBER_ADDED":
      case "MEMBER_ROLE_UPDATED":
        return {
          icon: UserPlus,
          color: "text-purple-500",
          bgColor: "bg-purple-50",
        };
      case "PROJECT_CREATED":
      case "PROJECT_UPDATED":
        return {
          icon: FolderKanban,
          color: "text-cyan-500",
          bgColor: "bg-cyan-50",
        };
      case "ATTACHMENT_CREATED":
        return {
          icon: Paperclip,
          color: "text-teal-500",
          bgColor: "bg-teal-50",
        };
      default:
        return { icon: Bell, color: "text-gray-500", bgColor: "bg-gray-50" };
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
    if (
      !prefs.taskAssigned &&
      (type === "TASK_CREATED" || type === "SUB_TASK_CREATED")
    )
      return false;
    if (!prefs.taskStatusChanged && type.includes("TASK_STATUS_UPDATED"))
      return false;
    if (!prefs.commentMention && type.includes("COMMENT")) return false;
    if (
      !prefs.projectActivities &&
      (type.includes("MEMBER") || type.includes("PROJECT"))
    )
      return false;

    const isUnread = !noti.read;
    if (activeTab === "unread") return isUnread;
    if (activeTab === "comments") return type.includes("COMMENT");
    if (activeTab === "tasks") return type.includes("TASK");
    if (activeTab === "projects")
      return type.includes("MEMBER") || type.includes("PROJECT");

    return true;
  });

  return (
    <div className="p-6 bg-[#F9FAFB] w-full min-h-full font-sans overflow-y-auto text-gray-800 flex justify-center">
      <div className="max-w-4xl w-full">
        {/* HEADER TRANG */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Thông báo hệ thống
            </h1>
            <p className="text-[13px] text-gray-500 mt-1">
              Quản lý và theo dõi các cập nhật mới nhất từ dự án và công việc
              của bạn
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 text-[13px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm cursor-pointer"
            >
              <Check size={14} /> Đánh dấu đã đọc tất cả
            </button>
          </div>
        </div>

        {/* BỘ LỌC TABS */}
        <div className="flex gap-4 border-b border-gray-200 mb-4 px-2">
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
                  ? "text-indigo-600"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-600 rounded-t-md"></div>
              )}
            </button>
          ))}
        </div>

        {/* DANH SÁCH THÔNG BÁO */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {filteredNotifications.map((noti, index) => {
            const isUnread = !noti.read;

            // Lấy text để phân tích lấy icon
            const notificationText = formatMessageText(
              noti.title || noti.message,
            );
            // Truyền text vào getNotificationIcon
            const iconConfig = getNotificationIcon(noti.type, notificationText);
            const IconComponent = iconConfig.icon;

            return (
              <div
                key={noti.id || index}
                onClick={() => markAsRead(noti.id, noti.read)}
                className={`flex items-start gap-4 p-4 border-b border-gray-100 transition-all cursor-pointer group relative ${
                  isUnread
                    ? "bg-gradient-to-r from-indigo-50/60 via-blue-50/20 to-white border-l-4 border-l-indigo-500 hover:from-indigo-50/90"
                    : "hover:bg-gray-50/80"
                }`}
              >
                {/* AVATAR HOẶC ICON */}
                <div className="relative shrink-0 mt-0.5">
                  {noti.avatar && noti.avatar.startsWith("http") ? (
                    <img
                      src={noti.avatar}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-200"
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${iconConfig.bgColor} ${iconConfig.color}`}
                    >
                      <IconComponent size={20} />
                    </div>
                  )}

                  {/* Chấm tròn chưa đọc */}
                  {isUnread && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white shadow-sm"></div>
                  )}
                </div>

                {/* NỘI DUNG THÔNG BÁO */}
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p
                      className={`text-[13.5px] leading-snug ${
                        isUnread
                          ? "font-semibold text-gray-900"
                          : "font-normal text-gray-700"
                      }`}
                    >
                      {notificationText}
                    </p>
                    <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
                      {noti.time || "Vừa xong"}
                    </span>
                  </div>

                  {/* DỰ ÁN & MỤC TIÊU */}
                  <div className="flex items-center gap-1.5 mt-0.5 text-[12px] text-gray-500">
                    {noti.target && (
                      <span className="font-medium text-gray-700 truncate max-w-[280px]">
                        {noti.target}
                      </span>
                    )}
                    {noti.target && noti.project && (
                      <span className="text-gray-300">•</span>
                    )}
                    <span className="text-indigo-600 font-medium bg-indigo-50/80 px-2 py-0.5 rounded text-[11px] truncate max-w-[200px]">
                      {noti.project || "Hệ thống Quản lý"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredNotifications.length === 0 && (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-3">
                <Bell size={24} />
              </div>
              <h3 className="text-[15px] font-bold text-gray-900 mb-1">
                Không có thông báo nào
              </h3>
              <p className="text-[13px] text-gray-500">
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
