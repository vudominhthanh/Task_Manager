import React, { useState, useEffect } from "react";
import {
  Bell, MessageSquare, CheckSquare, Mail, RotateCcw, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../../utils/apiClient";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const NOTIFICATION_API_BASE = "http://localhost:8082/api/notifications/settings";

const DEFAULT_SETTINGS = {
  notifyOnAssigned: true,
  notifyOnStatusChange: true,
  notifyOnMention: true,
  emailNotifications: true,
  pushNotifications: true,
};

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  // ==== Preferences ====
  const { accent } = usePreferences();
  const A = getAccent(accent);

  const getToken = () => localStorage.getItem("accessToken") || "";

  useEffect(() => {
    const fetchSettings = async () => {
      const token = getToken();
      if (!token) { setLoading(false); return; }
      try {
        const res = await apiClient.get(NOTIFICATION_API_BASE, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data) {
          setSettings({
            notifyOnAssigned:     res.data.notifyOnAssigned     ?? true,
            notifyOnStatusChange: res.data.notifyOnStatusChange ?? true,
            notifyOnMention:      res.data.notifyOnMention      ?? true,
            emailNotifications:   res.data.emailNotifications   ?? true,
            pushNotifications:    res.data.pushNotifications    ?? true,
          });
        }
      } catch (err) {
        console.error("Lỗi khi tải cấu hình thông báo:", err);
        toast.error("Không thể tải cấu hình thông báo từ máy chủ!");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggle = async (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSavingKey(key);
    const toastId = toast.loading("Đang lưu thay đổi...");

    try {
      const res = await apiClient.put(NOTIFICATION_API_BASE, updated, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.data) {
        setSettings({
          notifyOnAssigned:     res.data.notifyOnAssigned,
          notifyOnStatusChange: res.data.notifyOnStatusChange,
          notifyOnMention:      res.data.notifyOnMention,
          emailNotifications:   res.data.emailNotifications,
          pushNotifications:    res.data.pushNotifications,
        });
      }
      toast.success("Đã lưu thiết lập thông báo vào hệ thống!", { id: toastId });
    } catch (err) {
      console.error("Lỗi cập nhật cấu hình thông báo:", err);
      setSettings(settings);
      toast.error("Cập nhật thất bại. Vui lòng thử lại!", { id: toastId });
    } finally {
      setSavingKey(null);
    }
  };

  const handleReset = async () => {
    const toastId = toast.loading("Đang khôi phục mặc định...");
    try {
      const res = await apiClient.put(NOTIFICATION_API_BASE, DEFAULT_SETTINGS, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.data) {
        setSettings({
          notifyOnAssigned:     res.data.notifyOnAssigned,
          notifyOnStatusChange: res.data.notifyOnStatusChange,
          notifyOnMention:      res.data.notifyOnMention,
          emailNotifications:   res.data.emailNotifications,
          pushNotifications:    res.data.pushNotifications,
        });
      }
      toast.success("Đã khôi phục thiết lập mặc định thành công!", { id: toastId });
    } catch {
      toast.error("Khôi phục thất bại!", { id: toastId });
    }
  };

  // Class dùng chung cho switch toggle (accent-aware)
  const toggleSwitchClass = `w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${A.bgOnly.replace("bg-", "peer-checked:bg-")}`;

  // Danh sách item — data-driven để tránh lặp code
  const items = [
    {
      key: "notifyOnAssigned",
      title: "Khi được giao công việc mới",
      desc: "Nhận thông báo khi có thành viên khác tạo task hoặc sub-task và chỉ định bạn là người phụ trách",
      icon: CheckSquare,
      iconClass: `${A.softBg} ${A.icon}`,
    },
    {
      key: "notifyOnStatusChange",
      title: "Tiến độ & Trạng thái công việc",
      desc: "Thông báo khi task của bạn được chuyển cột trên bảng Kanban (To Do, In Progress, Done)",
      icon: Bell,
      iconClass: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "notifyOnMention",
      title: "Thảo luận & Nhắc đến (Mention)",
      desc: "Nhận chuông báo khi có thành viên nhắc đến tên bạn hoặc trao đổi bình luận trong công việc",
      icon: MessageSquare,
      iconClass: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      key: "pushNotifications",
      title: "Thông báo thời gian thực (WebSocket Push)",
      desc: "Nhận thông báo trực tiếp qua chuông web-socket khi có sự kiện mới diễn ra",
      icon: Bell,
      iconClass: "bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
    {
      key: "emailNotifications",
      title: "Nhận thông báo qua Email",
      desc: "Nhận bản tin và các thông báo quan trọng gửi trực tiếp vào hòm thư điện tử của bạn",
      icon: Mail,
      iconClass: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-400">
        <Loader2 size={30} className={`animate-spin mb-2 ${A.text}`} />
        <span className="text-[13px] font-medium">Đang tải cấu hình thông báo...</span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-stagger {
          opacity: 0;
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .delay-0 { animation-delay: 0s; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
        .delay-5 { animation-delay: 0.5s; }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6 font-sans">
        <div className="flex justify-between items-end animate-stagger delay-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Cấu hình thông báo
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Tùy biến các loại sự kiện bạn muốn nhận chuông và tin nhắn thông báo trên hệ thống
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              title="Khôi phục về mặc định"
            >
              <RotateCcw size={13} /> Mặc định
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs p-6 divide-y divide-gray-100 dark:divide-gray-800 transition-colors">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isSaving = savingKey === item.key;
            return (
              <div
                key={item.key}
                className={`flex items-center justify-between py-4 animate-stagger delay-${idx + 1} ${idx === 0 ? "first:pt-0" : ""} ${idx === items.length - 1 ? "last:pb-0" : ""}`}
              >
                <div className="flex items-start gap-3.5 pr-4">
                  <div className={`p-2.5 rounded-xl mt-0.5 ${item.iconClass}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <span className="text-[13.5px] font-bold text-gray-900 dark:text-white block">
                      {item.title}
                    </span>
                    <span className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed block mt-0.5">
                      {item.desc}
                    </span>
                  </div>
                </div>
                <label className={`relative inline-flex items-center cursor-pointer shrink-0 ${isSaving ? "opacity-60 pointer-events-none" : ""}`}>
                  <input
                    type="checkbox"
                    checked={settings[item.key]}
                    onChange={() => handleToggle(item.key)}
                    className="sr-only peer"
                  />
                  <div className={toggleSwitchClass}></div>
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}