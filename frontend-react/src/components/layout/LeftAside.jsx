import React, { useState, useEffect, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../../utils/apiClient";
import { useTapUnlock } from "../../hooks/useTapUnlock";
import toast from "react-hot-toast";
import { CheckSquare, Home, Bell, Activity, Calendar, BarChart2, Settings, ChevronRight, LayoutGrid, } from "lucide-react";
import CreateProjectPage from "../function/CreateProjectPage";
import ManageMembersModal from "../function/ManageMembersModal";
import { useEvent, EVENTS } from "../../hooks/useEventBus";

import { usePreferences } from "../../hooks/usePreferences";
import { getAccent, getDensity } from "../../utils/preferenceTokens";

export default function LeftAside() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);

  const location = useLocation();
  const matchProject = location.pathname.match(/^\/project\/([^/]+)/);
  const currentProjectId = matchProject ? matchProject[1] : null;

  const { accent, density } = usePreferences();
  const A = getAccent(accent);      
  const D = getDensity(density);  

  const getToken = () => localStorage.getItem("accessToken") || "";

  const fetchUnreadCount = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await apiClient.get("http://localhost:8082/api/notifications/unread-count");
      const data = res.data;
      let count = 0;
      if (typeof data === "number") count = data;
      else if (data && typeof data === "object")
        count = data.count ?? data.unreadCount ?? data.data ?? 0;
      else count = parseInt(data, 10) || 0;
      setUnreadCount(Number.isFinite(count) ? count : 0);
    } catch (err) {
      console.error("Lỗi khi tải số lượng thông báo:", err);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiClient.get("http://localhost:8083/api/projects");
      const list = res.data?.content ?? res.data ?? [];
      setProjects(list.map((p) => ({
        id: p.id,
        name: p.name,
        path: `/project/${p.id}`,
      })));
    } catch (err) {
      console.error("Lỗi tải danh sách dự án:", err);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const url = currentProjectId
        ? `http://localhost:8083/api/projects/${currentProjectId}/members`
        : `http://localhost:8083/api/projects/my-members`;
      const res = await apiClient.get(url);
      const data = res.data;
      const list = Array.isArray(data) ? data : data.content || [];
      const formatted = list.map((m) => {
        const name = m.fullName || m.fullname || m.name || "Thành viên";
        return {
          id: m.userId || m.id,
          name,
          avatar: name.charAt(0).toUpperCase(),
          status: m.status || "online",
          color: "bg-blue-500",
        };
      });
      setMembers(
        Array.from(new Map(formatted.map((i) => [i.id, i])).values())
      );
    } catch (err) {
      console.error("Lỗi tải danh sách thành viên:", err);
    }
  }, [currentProjectId]);

  useEffect(() => {
    fetchUnreadCount();
    fetchProjects();
    fetchMembers();
  }, [fetchUnreadCount, fetchProjects, fetchMembers]);

  useEvent(EVENTS.NOTIFICATION, fetchUnreadCount);
  useEvent(EVENTS.PROJECT, fetchProjects);
  useEvent(EVENTS.MEMBER, (d) => {
    if (!d?.projectId || String(d.projectId) === String(currentProjectId)) fetchMembers();
  });
  useEvent(EVENTS.USER, fetchMembers);

  const menuItems = [
    { id: 1, icon: Home,      label: "Tổng quan",  path: "/" },
    { id: 2, icon: Bell,      label: "Thông báo",  path: "/notifications",
      badge: unreadCount, hasNewNotification: unreadCount > 0 },
    { id: 3, icon: Activity,  label: "Hoạt động",  path: "/activities" },
    { id: 4, icon: Calendar,  label: "Lịch",       path: "/calendar" },
    { id: 5, icon: BarChart2, label: "Báo cáo",    path: "/reports" },
  ];

  const sortedMembers = [...members].sort((a, b) => {
    if (a.status === "online" && b.status !== "online") return -1;
    if (a.status !== "online" && b.status === "online") return 1;
    return 0;
  });

  const navItemClass = ({ isActive }, padClass = D.item) => `
    flex items-center justify-between ${padClass} ${D.textSize} rounded-lg cursor-pointer
    transition-all duration-200 group
    ${isActive
      ? `${A.softBg} ${A.textStrong} font-semibold`
      : `text-gray-500 dark:text-gray-400 ${A.textHover} hover:bg-gray-50 dark:hover:bg-gray-800/50`
    }
  `;

  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isSystemAdmin =
    user.role === "ADMIN" ||
    user.isSystemAdmin === true ||
    user.systemRoles?.some?.((r) => r.name === "ADMIN");

  const handleVersionTap = useTapUnlock({
    targetTaps: 7,
    enabled: isSystemAdmin,
    onUnlock: () => {
      toast.success("🛡️ Admin Mode đã mở khóa!", { duration: 2000 });
      setTimeout(() => navigate("/admin-dashboard"), 500);
    },
  });

  return (
    <aside className="w-full h-full bg-white dark:bg-gray-900 border-r border-transparent dark:border-gray-800 flex flex-col font-sans transition-colors duration-300">
      {/* ==== LOGO ==== */}
      <div className="flex items-center gap-2 p-4 mb-2 cursor-pointer group">
        <div className={`${A.solidBg} p-1.5 rounded-lg text-white shadow-sm group-hover:scale-105 transition-transform duration-300`}>
          <CheckSquare size={18} strokeWidth={2.5} />
        </div>
        <span className={`text-[17px] font-bold tracking-tight ${A.textStrong}`}>
          WorkFlow
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {/* ==== 1. MENU ==== */}
        <div className={D.sectionMb}>
          <h5 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mb-2 ml-2 uppercase tracking-wider">
            Menu
          </h5>
          <nav className={`flex flex-col ${D.gapSm}`}>
            {menuItems.map((item) => (
              <NavLink key={item.id} to={item.path} className={(s) => navItemClass(s)}>
                <div className={`flex items-center ${D.gap} font-medium`}>
                  <div className="relative">
                    <item.icon
                      size={15}
                      className="text-gray-400 dark:text-gray-500 group-hover:transition-colors"
                    />
                    {item.hasNewNotification && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900 animate-pulse" />
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

        {/* ==== 2. DỰ ÁN ==== */}
        <div className={D.sectionMb}>
          <div className="flex justify-between items-center mb-1 ml-2 pr-2">
            <h5 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Dự án của tôi
            </h5>
            <button
              onClick={() => setIsCreateProjectOpen(true)}
              className={`text-[11px] text-gray-400 dark:text-gray-500 ${A.textHover} transition-colors cursor-pointer`}
            >
              + Thêm
            </button>
          </div>

          <nav className={`
            flex flex-col ${D.gapSm} overflow-y-auto max-h-[120px] pb-4 mt-1
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
            ${projects.length > 3
              ? "[mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)]"
              : ""}
          `}>
            {projects.map((p) => (
              <NavLink key={p.id} to={p.path} className={(s) => `${navItemClass(s)} shrink-0`}>
                <div className={`flex items-center ${D.gap} truncate`}>
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${A.iconBg}`}>
                    <LayoutGrid size={12} className={A.iconColor} />
                  </div>
                  <span className="truncate font-medium">{p.name}</span>
                </div>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* ==== 3. THÀNH VIÊN ==== */}
        <div className="mb-2 relative">
          <div className="flex justify-between items-center mb-1 ml-2 pr-2">
            <h5 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Thành viên
            </h5>
            {currentProjectId && (
              <button
                onClick={() => setIsManageMembersOpen(true)}
                className={`text-[11px] text-gray-400 dark:text-gray-500 ${A.textHover} transition-colors font-semibold cursor-pointer`}
              >
                + Thêm
              </button>
            )}
          </div>

          <div className={`
            flex flex-col ${D.gapSm} overflow-y-auto max-h-[160px] pb-4 mt-1
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
            ${sortedMembers.length > 4
              ? "[mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)]"
              : ""}
          `}>
            {sortedMembers.length === 0 ? (
              <div className="text-center px-2 py-4">
                <span className="text-[12px] text-gray-400 dark:text-gray-500 font-medium italic">
                  Không có ai trực tuyến
                </span>
              </div>
            ) : (
              sortedMembers.map((m, i) => (
                <div key={`${m.id}-${i}`}
                  className={`flex items-center ${D.gap} ${D.itemSm} cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors group shrink-0`}>
                  <div className="relative shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm group-hover:scale-110 transition-transform dark:opacity-90 ${m.color}`}>
                      {m.avatar}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-white dark:border-gray-900 ${
                      m.status === "online" ? "bg-emerald-500" : "bg-amber-400"
                    }`} />
                  </div>
                  <span className={`${D.textSize} font-medium truncate transition-colors ${
                    m.status === "online"
                      ? "text-gray-700 dark:text-gray-200"
                      : "text-gray-400 dark:text-gray-500"
                  }`}>
                    {m.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ==== FOOTER: CÀI ĐẶT + VERSION ==== */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 mt-auto">
        <NavLink to="/settings" className={(s) => navItemClass(s)}>
          <div className={`flex items-center ${D.gap} font-medium`}>
            <Settings size={15} className="text-gray-400 dark:text-gray-500 group-hover:rotate-90 transition-transform duration-500"/>
            Cài đặt
          </div>
          <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors"/>
        </NavLink>
        <div onClick={handleVersionTap} className="text-center text-[10px] text-gray-300 dark:text-gray-600 font-mono py-2 select-none cursor-default transition-colors hover:text-gray-400 dark:hover:text-gray-500" title="" >
          WorkFlow v1.0.0
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