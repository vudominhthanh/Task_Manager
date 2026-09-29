import React from "react";
import {
  Palette, Globe, LayoutGrid, Sun, Moon, Monitor, Check,
  Minimize2, Maximize2,
} from "lucide-react";
import toast from "react-hot-toast";

import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const ACCENT_COLORS = [
  { name: "Indigo",  value: "indigo",  bg: "bg-indigo-600" },
  { name: "Blue",    value: "blue",    bg: "bg-blue-600" },
  { name: "Emerald", value: "emerald", bg: "bg-emerald-600" },
  { name: "Violet",  value: "violet",  bg: "bg-violet-600" },
  { name: "Rose",    value: "rose",    bg: "bg-rose-600" },
];

const THEMES = [
  { id: "light",  label: "Sáng (Light)", icon: Sun },
  { id: "dark",   label: "Tối (Dark)",   icon: Moon },
  { id: "system", label: "Hệ thống",     icon: Monitor },
];

const DENSITIES = [
  {
    id: "compact",
    title: "Nhỏ gọn",
    desc: "Ẩn mô tả, quét nhanh nhiều task",
    icon: Minimize2,
  },
  {
    id: "normal",
    title: "Tiêu chuẩn",
    desc: "Cân bằng giữa thông tin và không gian",
    icon: LayoutGrid,
  },
  {
    id: "comfortable",
    title: "Thoáng đãng",
    desc: "Đọc kỹ, hiển thị đầy đủ metadata",
    icon: Maximize2,
  },
];

export default function PreferenceSettingsPage() {
  const { preferences, updatePreference, loading } = usePreferences();
  const A = getAccent(preferences.accentColor);

  const handleUpdatePref = async (key, value, successMsg) => {
    if (preferences[key] === value) return;
    try {
      await updatePreference({ [key]: value });
      toast.success(successMsg || "Đã cập nhật tùy chọn giao diện!");
    } catch {
      toast.error("Không thể lưu tùy chọn. Vui lòng thử lại!");
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-400">
        <span className="text-[13px] font-medium">Đang tải tùy chọn...</span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6 font-sans pb-12 animate-fade">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            Giao diện và Hiển thị
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Tùy biến môi trường làm việc, màu sắc và định dạng hiển thị phù hợp với thói quen của bạn
          </p>
        </div>

        {/* KHỐI 1: GIAO DIỆN VÀ MÀU SẮC */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs p-6 space-y-6 transition-colors">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <Palette size={18} className={A.icon} />
            <div>
              <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">
                Giao diện trực quan
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Lựa chọn chế độ sáng tối và màu chủ đạo nhận diện
              </p>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
              Chế độ màu (Theme)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {THEMES.map((item) => {
                const Icon = item.icon;
                const isSelected = preferences.theme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleUpdatePref("theme", item.id, `Đã chuyển sang chế độ ${item.label}`)}
                    className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-xs font-semibold cursor-pointer transition-all ${
                      isSelected
                        ? `${A.border} ${A.softBg} ${A.textStrong} shadow-xs`
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color */}
          <div className="pt-2">
            <label className="block text-[12px] font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
              Màu chủ đạo (Accent Color)
            </label>
            <div className="flex items-center gap-3">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => handleUpdatePref("accentColor", color.value, `Đã đổi màu chủ đạo sang ${color.name}`)}
                  className={`w-9 h-9 rounded-full ${color.bg} flex items-center justify-center text-white shadow-sm cursor-pointer transition-transform hover:scale-110 relative`}
                  title={color.name}
                >
                  {preferences.accentColor === color.value && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KHỐI 2: MẬT ĐỘ */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs p-6 space-y-5 transition-colors">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <LayoutGrid size={18} className={A.icon} />
            <div>
              <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">
                Bố cục hiển thị công việc
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Điều chỉnh khoảng cách và mật độ thông tin trên bảng Kanban/List
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DENSITIES.map((item) => {
              const Icon = item.icon;
              const isSelected = preferences.density === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleUpdatePref("density", item.id, `Đã chuyển bố cục sang ${item.title}`)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? `${A.border} ${A.softBg} shadow-xs`
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon
                    size={16}
                    className={`mb-1.5 ${isSelected ? A.textStrong : "text-gray-500 dark:text-gray-400"}`}
                  />
                  <span
                    className={`block text-xs font-bold ${
                      isSelected ? A.textStrong : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
                    {item.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* KHỐI 3: NGÔN NGỮ VÀ THỜI GIAN — ĐANG PHÁT TRIỂN */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs p-6 space-y-5 transition-colors relative overflow-hidden">
          {/* Overlay mờ nhẹ để biết khối bị khóa */}
          <div className="absolute inset-0 bg-white/40 dark:bg-gray-900/40 backdrop-blur-[0.5px] z-10 pointer-events-none"></div>

          {/* Header với badge */}
          <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-800 relative z-20">
            <div className="flex items-center gap-2.5">
              <Globe size={18} className={A.icon} />
              <div>
                <h3 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Ngôn ngữ và Thời gian
                  {/* Badge In Process */}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                    </span>
                    Đang phát triển
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Tính năng sẽ khả dụng trong phiên bản tới
                </p>
              </div>
            </div>
          </div>

          {/* Form bị khóa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-20 opacity-60">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Ngôn ngữ
              </label>
              <select
                value={preferences.language}
                disabled
                className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500 font-medium cursor-not-allowed select-none"
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English (US)</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Định dạng ngày
              </label>
              <select
                value={preferences.dateFormat}
                disabled
                className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500 font-medium cursor-not-allowed select-none"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2026-12-31)</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Định dạng giờ
              </label>
              <select
                value={preferences.timeFormat}
                disabled
                className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500 font-medium cursor-not-allowed select-none"
              >
                <option value="24h">24 giờ (14:30)</option>
                <option value="12h">12 giờ (02:30 PM)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}