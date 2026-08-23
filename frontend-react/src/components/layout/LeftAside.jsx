import React from "react";
import { 
  CheckSquare, Home, Bell, Activity, Calendar, BarChart2, 
  Settings, ChevronRight, LayoutGrid
} from "lucide-react";

export default function LeftAside() {
  const menuItems = [
    { id: 1, icon: Home, label: "Tổng quan", active: false },
    { id: 2, icon: Bell, label: "Thông báo", badge: 5, active: false },
    { id: 3, icon: Activity, label: "Hoạt động", active: false },
    { id: 4, icon: Calendar, label: "Lịch", active: false },
    { id: 5, icon: BarChart2, label: "Báo cáo", active: false },
  ];

  // Đã thêm 2 dự án ảo để thấy rõ hiệu ứng cuộn
  const projects = [
    { id: 1, name: "E-Commerce Platform", active: true, color: "text-indigo-600", bg: "bg-indigo-100" },
    { id: 2, name: "Mobile App", active: false, color: "text-green-600", bg: "bg-green-100" },
    { id: 3, name: "Website Marketing", active: false, color: "text-orange-500", bg: "bg-orange-100" },
    { id: 4, name: "Internal System", active: false, color: "text-blue-500", bg: "bg-blue-100" },
    { id: 5, name: "CRM Dashboard", active: false, color: "text-purple-600", bg: "bg-purple-100" }, 
    { id: 6, name: "AI Integration", active: false, color: "text-rose-500", bg: "bg-rose-100" }, 
  ];

  // Đã thêm 2 thành viên ảo để thấy rõ hiệu ứng cuộn
  const onlineMembers = [
    { id: 1, name: "Nguyễn Minh", avatar: "N", status: "online" },
    { id: 2, name: "Trần Thành", avatar: "T", status: "online" },
    { id: 3, name: "Phạm Nam", avatar: "P", status: "online" },
    { id: 4, name: "Lê An", avatar: "L", status: "away" },
    { id: 5, name: "Bùi Ngọc", avatar: "B", status: "online" }, 
    { id: 6, name: "Hoàng Long", avatar: "H", status: "away" }, 
  ];

  return (
    <aside className="w-full h-full bg-white flex flex-col font-sans">
      
      {/* --- LOGO --- */}
      <div className="flex items-center gap-2 p-4 mb-2 cursor-pointer group">
        <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-sm group-hover:scale-105 transition-transform duration-300">
          <CheckSquare size={18} strokeWidth={2.5} />
        </div>
        <span className="text-[17px] font-bold text-indigo-700 tracking-tight">WorkFlow</span>
      </div>

      {/* --- SCROLLABLE CONTENT (Menu Chính) --- */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        
        {/* 1. MENU CHÍNH */}
        <div className="mb-6">
          <h5 className="text-[11px] font-bold text-gray-400 mb-2 ml-2 uppercase tracking-wider">Menu</h5>
          <nav className="flex flex-col gap-0.5">
            {menuItems.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between px-2 py-2 text-[13px] text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg cursor-pointer transition-all duration-200 group"
              >
                <div className="flex items-center gap-2 font-medium">
                  <item.icon size={15} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                  {item.label}
                </div>
                {item.badge && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* 2. DỰ ÁN CỦA TÔI (Scrollable - Fade - 3 Items) */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1 ml-2 pr-2">
            <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Dự án của tôi</h5>
            <span className="text-[11px] text-gray-400 cursor-pointer hover:text-indigo-600 transition-colors">
              + Thêm
            </span>
          </div>
          
          {/* VÙNG CUỘN ẨN THANH KÉO & MỜ 2 ĐẦU */}
          {/* max-h-[135px]: Chiều cao vừa khít 3 dự án */}
          <nav className="flex flex-col gap-0.5 overflow-y-auto max-h-[135px] py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)]">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className={`flex items-center gap-2 px-2 py-2 text-[13px] rounded-lg cursor-pointer transition-all duration-200 shrink-0 ${
                  project.active 
                    ? "bg-indigo-50 text-indigo-700 font-semibold" 
                    : "text-gray-600 hover:bg-gray-50 font-medium"
                }`}
              >
                <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${project.bg}`}>
                  <LayoutGrid size={12} className={project.color} />
                </div>
                <span className="truncate">{project.name}</span>
              </div>
            ))}
          </nav>
        </div>

        {/* 3. THÀNH VIÊN ONLINE (Scrollable - Fade - 3 Items) */}
        <div className="mb-2">
          <h5 className="text-[11px] font-bold text-gray-400 mb-1 ml-2 uppercase tracking-wider">Online</h5>
          
          {/* VÙNG CUỘN ẨN THANH KÉO & MỜ 2 ĐẦU */}
          {/* max-h-[120px]: Chiều cao vừa khít 3 người dùng */}
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[120px] py-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)]">
            {onlineMembers.map((member) => (
              <div 
                key={member.id} 
                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors group shrink-0"
              >
                <div className="relative shrink-0">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm group-hover:scale-110 transition-transform">
                    {member.avatar}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                    member.status === 'online' ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}></div>
                </div>
                <span className="text-[13px] font-medium text-gray-700 truncate">{member.name}</span>
              </div>
            ))}
          </div>
          
          <div className="px-2 mt-1">
            <span className="text-[11px] text-gray-400 font-medium cursor-pointer hover:text-indigo-600 transition-colors">
              + Thêm
            </span>
          </div>
        </div>

      </div>

      {/* --- CÀI ĐẶT --- */}
      <div className="p-3 border-t border-gray-100 mt-auto">
        <div className="flex items-center justify-between px-2 py-2 text-[13px] text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg cursor-pointer transition-all duration-200 group">
          <div className="flex items-center gap-2 font-medium">
            <Settings size={15} className="text-gray-400 group-hover:rotate-90 transition-transform duration-500" /> 
            Cài đặt
          </div>
          <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
        </div>
      </div>

    </aside>
  );
}