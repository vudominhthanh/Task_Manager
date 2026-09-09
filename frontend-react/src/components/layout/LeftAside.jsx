import React, { useState, useEffect, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  CheckSquare,
  Home,
  Bell,
  Activity,
  Calendar,
  BarChart2,
  Settings,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";
import CreateProjectPage from "../function/CreateProjectPage";
import ManageMembersModal from "../function/ManageMembersModal";
import { useEvent, EVENTS } from "../../hooks/useEventBus";

export default function LeftAside() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);

  const location = useLocation();
  const matchProject = location.pathname.match(/^\/project\/([^/]+)/);
  const currentProjectId = matchProject ? matchProject[1] : null;

  const getToken = () => localStorage.getItem("accessToken") || "";

  const fetchUnreadCount = useCallback(async () => {
  const token = getToken();
  if (!token) return; 

  try {
    const response = await fetch(
      "http://localhost:8082/api/notifications/unread-count",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json, text/plain",
        },
      }
    );

    if (!response.ok) {
      console.error(`Fetch unread count failed with status: ${response.status}`);
      return;
    }
    const contentType = response.headers.get("content-type") || "";
    let count = 0;

    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (typeof data === "number") {
        count = data;
      } else if (typeof data === "object" && data !== null) {
        count = data.count ?? data.unreadCount ?? data.data ?? 0;
      }
    } else {
      const text = await response.text();
      count = parseInt(text, 10) || 0;
    }

    setUnreadCount(Number.isFinite(count) ? count : 0);
  } catch (error) {
    console.error("Lỗi khi tải số lượng thông báo:", error);
  }
}, []);


  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:8083/api/projects", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        const projectList = data.content ? data.content : data;

        const formattedProjects = projectList.map((p) => ({
          id: p.id,
          name: p.name,
          path: `/project/${p.id}`,
          color: "text-indigo-600",
          bg: "bg-indigo-100",
        }));
        setProjects(formattedProjects);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách dự án:", error);
    }
  }, []);

  // 3. Tải danh sách thành viên (theo dự án hiện tại hoặc toàn bộ team)
  const fetchMembers = useCallback(async () => {
    try {
      const url = currentProjectId
        ? `http://localhost:8083/api/projects/${currentProjectId}/members`
        : `http://localhost:8083/api/projects/my-members`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (response.ok) {
        const data = await response.json();
        const memberList = Array.isArray(data) ? data : data.content || [];

        const formattedMembers = memberList.map((m) => {
          const memberName = m.fullName || m.fullname || m.name || "Thành viên";
          return {
            id: m.userId || m.id,
            name: memberName,
            avatar: memberName.charAt(0).toUpperCase(),
            status: m.status || "online",
            color: "bg-blue-500",
          };
        });
        const uniqueMembers = Array.from(
          new Map(formattedMembers.map((item) => [item.id, item])).values(),
        );
        setMembers(uniqueMembers);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách thành viên:", error);
    }
  }, [currentProjectId]);

  // Load ban đầu hoặc khi đổi Project trên URL
  useEffect(() => {
    fetchUnreadCount();
    fetchProjects();
    fetchMembers();
  }, [fetchUnreadCount, fetchProjects, fetchMembers]);

  // ==========================================
  // REALTIME QUA USEEVENT (GỌN GÀNG - CHUẨN XÁC)
  // ==========================================
  // 1. Nhận thông báo mới -> Cập nhật số badge đỏ
  useEvent(EVENTS.NOTIFICATION, fetchUnreadCount);

  // 2. Dự án thay đổi (Tạo mới, sửa tên, xóa) -> Reload list dự án
  useEvent(EVENTS.PROJECT, fetchProjects);

  // 3. Thành viên thay đổi (Thêm/xóa/đổi role) -> Reload list thành viên
  useEvent(EVENTS.MEMBER, fetchMembers);

  const menuItems = [
    { id: 1, icon: Home, label: "Tổng quan", path: "/" },
    {
      id: 2,
      icon: Bell,
      label: "Thông báo",
      badge: unreadCount,
      hasNewNotification: unreadCount > 0,
      path: "/notifications",
    },
    { id: 3, icon: Activity, label: "Hoạt động", path: "/activities" },
    { id: 4, icon: Calendar, label: "Lịch", path: "/calendar" },
    { id: 5, icon: BarChart2, label: "Báo cáo", path: "/reports" },
  ];

  const sortedMembers = [...members].sort((a, b) => {
    if (a.status === "online" && b.status !== "online") return -1;
    if (a.status !== "online" && b.status === "online") return 1;
    return 0;
  });

  return (
    <aside className="w-full h-full bg-white flex flex-col font-sans">
      <div className="flex items-center gap-2 p-4 mb-2 cursor-pointer group">
        <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-sm group-hover:scale-105 transition-transform duration-300">
          <CheckSquare size={18} strokeWidth={2.5} />
        </div>
        <span className="text-[17px] font-bold text-indigo-700 tracking-tight">
          WorkFlow
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {/* 1. MENU CHÍNH */}
        <div className="mb-6">
          <h5 className="text-[11px] font-bold text-gray-400 mb-2 ml-2 uppercase tracking-wider">
            Menu
          </h5>
          <nav className="flex flex-col gap-0.5">
            {menuItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center justify-between px-2 py-2 text-[13px] rounded-lg cursor-pointer transition-all duration-200 group
                  ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50"
                  }
                `}
              >
                <div className="flex items-center gap-2 font-medium">
                  <div className="relative">
                    <item.icon
                      size={15}
                      className="text-gray-400 group-hover:text-indigo-500 transition-colors"
                    />
                    {item.hasNewNotification && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                    )}
                  </div>
                  <span>{item.label}</span>
                </div>

                {item.badge > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* 2. DỰ ÁN CỦA TÔI */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1 ml-2 pr-2">
            <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Dự án của tôi
            </h5>
            <button
              onClick={() => setIsCreateProjectOpen(true)}
              className="text-[11px] text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              + Thêm
            </button>
          </div>

          <nav
            className={`flex flex-col gap-0.5 overflow-y-auto max-h-[120px] pb-4 mt-1 
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden 
            ${projects.length > 3 ? "[mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)]" : ""}
          `}
          >
            {projects.map((project) => (
              <NavLink
                key={project.id}
                to={project.path}
                className={({ isActive }) => `
                  flex items-center gap-2 px-2 py-2 text-[13px] rounded-lg cursor-pointer transition-all duration-200 shrink-0
                  ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-50 font-medium"
                  }
                `}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${project.bg}`}
                >
                  <LayoutGrid size={12} className={project.color} />
                </div>
                <span className="truncate">{project.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* 3. THÀNH VIÊN */}
        <div className="mb-2 relative">
          <div className="flex justify-between items-center mb-1 ml-2 pr-2">
            <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Thành viên
            </h5>
            {currentProjectId && (
              <button
                onClick={() => setIsManageMembersOpen(true)}
                className="text-[11px] text-gray-400 hover:text-indigo-600 transition-colors font-semibold cursor-pointer"
              >
                + Thêm
              </button>
            )}
          </div>

          <div
            className={`flex flex-col gap-1 overflow-y-auto max-h-[160px] pb-4 mt-1 
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden 
            ${sortedMembers.length > 4 ? "[mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)]" : ""}
          `}
          >
            {sortedMembers.length === 0 ? (
              <div className="text-center px-2 py-4">
                <span className="text-[12px] text-gray-400 font-medium italic">
                  Không có ai trực tuyến
                </span>
              </div>
            ) : (
              sortedMembers.map((member, index) => (
                <div
                  key={`${member.id}-${index}`}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors group shrink-0"
                >
                  <div className="relative shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm group-hover:scale-110 transition-transform ${member.color}`}
                    >
                      {member.avatar}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-white ${
                        member.status === "online"
                          ? "bg-emerald-500"
                          : "bg-amber-400"
                      }`}
                    ></div>
                  </div>

                  <span
                    className={`text-[13px] font-medium truncate transition-colors ${
                      member.status === "online"
                        ? "text-gray-700"
                        : "text-gray-400"
                    }`}
                  >
                    {member.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-gray-100 mt-auto">
        <div className="flex items-center justify-between px-2 py-2 text-[13px] text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg cursor-pointer transition-all duration-200 group">
          <div className="flex items-center gap-2 font-medium">
            <Settings
              size={15}
              className="text-gray-400 group-hover:rotate-90 transition-transform duration-500"
            />
            Cài đặt
          </div>
          <ChevronRight
            size={14}
            className="text-gray-300 group-hover:text-gray-500 transition-colors"
          />
        </div>
      </div>

      <CreateProjectPage
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={fetchProjects}
      />

      <ManageMembersModal
        isOpen={isManageMembersOpen}
        onClose={() => setIsManageMembersOpen(false)}
        projectId={currentProjectId}
      />
    </aside>
  );
}
