import React, { useState } from "react";
import { Palette, Globe, Clock } from "lucide-react";
import toast from "react-hot-toast";

export default function PreferenceSettingsPage() {
  const [theme, setTheme] = useState("light");
  const [lang, setLang] = useState("vi");

  const handleSelectTheme = (selectedTheme) => {
    if (selectedTheme === "dark") {
      toast("Chế độ Dark Mode đang được hoàn thiện!", {
        icon: "🚧",
      });
      return;
    }
    setTheme(selectedTheme);
    localStorage.setItem("app_theme", selectedTheme);
    toast.success("Đã chuyển sang giao diện Sáng!");
  };

  const handleSelectLang = (selectedLang) => {
    setLang(selectedLang);
    localStorage.setItem("app_lang", selectedLang);
    toast.success("Đã cập nhật ngôn ngữ hiển thị!");
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
        `}
      </style>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Phần 1: Tiêu đề */}
        <div className="animate-stagger delay-0">
          <h2 className="text-xl font-bold text-gray-900">Giao diện & Hiển thị</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Tùy biến môi trường làm việc phù hợp với thói quen của bạn
          </p>
        </div>

        {/* Phần 2: Nội dung cài đặt */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-5 animate-stagger delay-1">
          <div>
            <label className="block text-[13px] font-bold text-gray-800 mb-2">
              Chủ đề giao diện
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <button
                type="button"
                onClick={() => handleSelectTheme("light")}
                className={`p-3 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all ${
                  theme === "light"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-xs"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                Giao diện Sáng (Mặc định)
              </button>
              <button
                type="button"
                onClick={() => handleSelectTheme("dark")}
                className={`p-3 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all ${
                  theme === "dark"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-xs"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                Giao diện Tối (Đang phát triển)
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-[13px] font-bold text-gray-800 mb-2">
              Ngôn ngữ hiển thị
            </label>
            <select
              value={lang}
              onChange={(e) => handleSelectLang(e.target.value)}
              className="p-2.5 border border-gray-200 rounded-xl text-xs outline-none bg-white min-w-[200px]"
            >
              <option value="vi">Tiếng Việt (Vietnamese)</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}