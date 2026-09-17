import React, { useState, useEffect } from "react";
import { Bell, MessageSquare, CheckSquare, Mail, Check, RotateCcw } from "lucide-react";
import { emitEvent, EVENTS } from "../../hooks/useEventBus";
import toast from "react-hot-toast";
import apiClient from "../../utils/apiClient";

const DEFAULT_SETTINGS = {
  taskAssigned: true,       
  taskStatusChanged: true,  
  commentMention: true,     
  projectActivities: true,  
  emailDigest: false        
};

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("notification_preferences");
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Lỗi đọc cấu hình thông báo:", e);
    }
  }, []);

  const handleToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    
    localStorage.setItem("notification_preferences", JSON.stringify(updated));

    emitEvent(EVENTS.NOTIFICATION, { configUpdated: true, preferences: updated });

    toast.success("Đã lưu thiết lập thông báo!");
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem("notification_preferences", JSON.stringify(DEFAULT_SETTINGS));
    emitEvent(EVENTS.NOTIFICATION, { configUpdated: true, preferences: DEFAULT_SETTINGS });
    toast.success("Đã khôi phục thiết lập mặc định!");
  };

  return (
    <>
      {/* Khai báo CSS keyframes cho hiệu ứng fade-in-up */}
      <style>
        {`
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
        `}
      </style>

      <div className="max-w-3xl mx-auto space-y-6 font-sans">
        {/* Phần 1: Tiêu đề */}
        <div className="flex justify-between items-end animate-stagger delay-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Cấu hình thông báo</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tùy biến các loại sự kiện bạn muốn nhận chuông và tin nhắn thông báo</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-[12px] font-medium text-gray-500 hover:text-gray-800 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
              title="Khôi phục về mặc định"
            >
              <RotateCcw size={13} /> Mặc định
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 divide-y divide-gray-100">
          
          {/* Mục 1: Công việc được giao */}
          <div className="flex items-center justify-between py-4 first:pt-0 animate-stagger delay-1">
            <div className="flex items-start gap-3.5 pr-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5">
                <CheckSquare size={18} />
              </div>
              <div>
                <span className="text-[13.5px] font-bold text-gray-900 block">Khi được giao công việc mới</span>
                <span className="text-[12px] text-gray-500 leading-relaxed block mt-0.5">
                  Nhận thông báo khi có thành viên khác tạo task hoặc sub-task và chỉ định bạn là người phụ trách
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.taskAssigned}
                onChange={() => handleToggle("taskAssigned")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Mục 2: Trạng thái Task */}
          <div className="flex items-center justify-between py-4 animate-stagger delay-2">
            <div className="flex items-start gap-3.5 pr-4">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl mt-0.5">
                <Bell size={18} />
              </div>
              <div>
                <span className="text-[13.5px] font-bold text-gray-900 block">Tiến độ & Trạng thái công việc</span>
                <span className="text-[12px] text-gray-500 leading-relaxed block mt-0.5">
                  Thông báo khi task của bạn được chuyển cột trên bảng Kanban (To Do, In Progress, Done)
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.taskStatusChanged}
                onChange={() => handleToggle("taskStatusChanged")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Mục 3: Bình luận */}
          <div className="flex items-center justify-between py-4 animate-stagger delay-3">
            <div className="flex items-start gap-3.5 pr-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl mt-0.5">
                <MessageSquare size={18} />
              </div>
              <div>
                <span className="text-[13.5px] font-bold text-gray-900 block">Thảo luận & Bình luận</span>
                <span className="text-[12px] text-gray-500 leading-relaxed block mt-0.5">
                  Nhận chuông báo khi có thành viên bình luận hoặc trả lời trao đổi trong công việc bạn tham gia
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.commentMention}
                onChange={() => handleToggle("commentMention")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Mục 4: Dự án & Thành viên */}
          <div className="flex items-center justify-between py-4 animate-stagger delay-4">
            <div className="flex items-start gap-3.5 pr-4">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl mt-0.5">
                <Bell size={18} />
              </div>
              <div>
                <span className="text-[13.5px] font-bold text-gray-900 block">Dự án & Thành viên</span>
                <span className="text-[12px] text-gray-500 leading-relaxed block mt-0.5">
                  Nhận cập nhật khi được thêm vào dự án mới hoặc khi có thay đổi quyền hạn thành viên
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.projectActivities}
                onChange={() => handleToggle("projectActivities")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Mục 5: Email Digest */}
          <div className="flex items-center justify-between py-4 last:pb-0 animate-stagger delay-5">
            <div className="flex items-start gap-3.5 pr-4">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl mt-0.5">
                <Mail size={18} />
              </div>
              <div>
                <span className="text-[13.5px] font-bold text-gray-900 block">Gửi tóm tắt qua Email</span>
                <span className="text-[12px] text-gray-500 leading-relaxed block mt-0.5">
                  Nhận email tổng hợp danh sách công việc sắp tới hạn vào 8:00 sáng mỗi ngày
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.emailDigest}
                onChange={() => handleToggle("emailDigest")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
        </div>
      </div>
    </>
  );
}