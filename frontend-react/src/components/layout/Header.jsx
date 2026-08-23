import React from "react";
import { Menu, Star, Plus, Bell } from "lucide-react";

const Header = () => {
  // Dữ liệu giả lập cho các Tabs
  const tabs = ["Bảng", "Danh sách", "Lịch", "Tổng quan", "Hoạt động", "Tệp", "Cài đặt"];

  // Dữ liệu giả lập cho nhóm Avatar
  const avatars = [
    { id: 1, name: "Minh", color: "bg-blue-500" },
    { id: 2, name: "Thành", color: "bg-emerald-500" },
    { id: 3, name: "Nam", color: "bg-amber-500" },
    { id: 4, name: "An", color: "bg-rose-500" },
  ];

  return (
    <header className="bg-white flex flex-col px-6 pt-5 shrink-0">
      
      {/* --- KHU VỰC TRÊN: Thông tin & Hành động --- */}
      <div className="flex justify-between items-start">
        
        {/* Trái: Thông tin dự án */}
        <div>
          <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-1 cursor-pointer hover:text-gray-800 transition-colors">
            <Menu size={16} />
            <span className="font-medium">Dự án</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">
              E-Commerce Platform
            </h1>
            <Star size={18} className="text-orange-400 fill-orange-400 cursor-pointer hover:scale-110 transition-transform" />
          </div>
          <p className="text-[13px] text-gray-500 mt-1">
            Xây dựng hệ thống bán hàng trực tuyến
          </p>
        </div>

        {/* Phải: Avatar Team & Nút chức năng */}
        <div className="flex items-center gap-4 mt-2">
          
          {/* Nhóm Avatar chồng lên nhau */}
          <div className="flex items-center">
            <div className="flex -space-x-2 mr-2">
              {avatars.map((user) => (
                <div 
                  key={user.id} 
                  className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[11px] font-bold shadow-sm cursor-pointer hover:-translate-y-1 transition-transform ${user.color}`}
                  title={user.name}
                >
                  {user.name.charAt(0)}
                </div>
              ))}
            </div>
            {/* Nút +3 */}
            <span className="text-[12px] text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-full cursor-pointer hover:bg-gray-200 transition-colors">
              +3
            </span>
          </div>

          {/* Nút Thêm Task */}
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm">
            <Plus size={16} strokeWidth={2.5} />
            Thêm task
          </button>

          {/* Chuông Thông báo */}
          <button className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors border border-gray-200 shadow-sm">
            <Bell size={18} />
            {/* Chấm đỏ chứa số 5 */}
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
              5
            </span>
          </button>

        </div>
      </div>

      {/* --- KHU VỰC DƯỚI: Thanh Điều hướng (Tabs) --- */}
      {/* Căn lề dưới sát viền border */}
      <div className="flex items-center gap-7 mt-6 border-b border-gray-200">
        {tabs.map((tab, index) => (
          <div
            key={index}
            className={`pb-3 text-[14px] font-medium cursor-pointer transition-colors relative ${
              index === 0 // Giả lập tab đầu tiên ("Bảng") đang được chọn
                ? "text-indigo-600"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab}
            {/* Thanh gạch dưới màu xanh cho Tab đang Active */}
            {index === 0 && (
              <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-indigo-600 rounded-t-md"></div>
            )}
          </div>
        ))}
      </div>

    </header>
  );
};

export default Header;