import React, { useState, useEffect, useRef, useCallback } from "react";
import { Menu, Star, Plus, Loader2, ChevronDown, CheckCircle2, PlayCircle, Archive, AlertCircle } from "lucide-react";
import apiClient from "../../utils/apiClient";
import { NavLink, Outlet, useParams, useOutletContext, useNavigate } from "react-router-dom";
import CreateTaskPage from "../function/CreateTaskPage";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent, getDensity } from "../../utils/preferenceTokens";

const parseJwt = (token) => {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
};

const PROJECT_STATUSES = [
  { value: "ACTIVE",    label: "Đang chạy", icon: PlayCircle,   color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-500/10",       border: "border-blue-200 dark:border-blue-500/20" },
  { value: "COMPLETED", label: "Hoàn thành", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-500/20" },
  { value: "ARCHIVED",  label: "Lưu trữ",   icon: Archive,      color: "text-gray-600 dark:text-gray-400",       bg: "bg-gray-100 dark:bg-gray-800",         border: "border-gray-200 dark:border-gray-700" },
  { value: "SUSPENDED", label: "Tạm dừng",  icon: AlertCircle,  color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-500/10",     border: "border-amber-200 dark:border-amber-500/20" },
];

const ProjectLayout = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext();

  // ==== Preferences ====
  const { accent, density } = usePreferences();
  const A = getAccent(accent);
  const D = getDensity(density);

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const dropdownRef = useRef(null);
  const [userPermissions, setUserPermissions] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const tabs = [
    { name: "Bảng",      path: "" },
    { name: "Lịch",      path: "calendar" },
    { name: "Tổng quan", path: "overview" },
    { name: "Hoạt động", path: "activities" },
    { name: "Tệp",       path: "files" },
    { name: "Cài đặt",   path: "settings" },
  ];

  const avatarColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-purple-500", "bg-indigo-600"];

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [projectRes, membersRes] = await Promise.all([
        apiClient.get(`http://localhost:8083/api/projects/${projectId}`),
        apiClient.get(`http://localhost:8083/api/projects/${projectId}/members`),
      ]);
      const projectData = projectRes.data || null;
      if (projectData && !projectData.status) projectData.status = "ACTIVE";
      setProject(projectData);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu ProjectLayout:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { setLoading(true); fetchProjectData(); }, [fetchProjectData]);

  useEffect(() => {
    if (!projectId) return;
    const token = localStorage.getItem("accessToken")
      || (localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).token : null);
    if (token) {
      const decoded = parseJwt(token);
      const userId = decoded?.sub || decoded?.id || decoded?.userId;
      setCurrentUserId(userId);
      if (userId) {
        apiClient.get(`http://localhost:8083/api/projects/${projectId}/users/${userId}/permissions`)
          .then(res => setUserPermissions(res.data || []))
          .catch(err => console.error("Lỗi lấy quyền:", err));
      }
    }
  }, [projectId]);

  const canUpdateProject = userPermissions.includes("PROJECT_UPDATE");
  const canCreateTask = userPermissions.includes("TASK_CREATE") || userPermissions.includes("PROJECT_UPDATE");

  useEvent(EVENTS?.USER || "USER", fetchProjectData);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleHeaderAddTask = () => setIsCreateTaskOpen(true);

  const handleUpdateStatus = async (newStatus) => {
    if (!project || project.status === newStatus || !canUpdateProject) return;
    setIsUpdatingStatus(true);
    try {
      const res = await apiClient.patch(
        `http://localhost:8083/api/projects/${projectId}/status?status=${newStatus}`
      );
      setProject(prev => ({ ...prev, status: res.data.status || newStatus }));
      setIsStatusDropdownOpen(false);
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái:", err);
      alert("Không thể cập nhật trạng thái lúc này.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-[#F9FAFB] dark:bg-gray-900 transition-colors">
        <Loader2 className={`animate-spin mb-2 ${A.text}`} size={36} />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Đang tải dữ liệu dự án...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-[#F9FAFB] dark:bg-gray-900">
        <p className="text-red-500 dark:text-red-400 font-bold text-lg">Không tìm thấy dự án!</p>
      </div>
    );
  }

  const currentStatusConfig = PROJECT_STATUSES.find(s => s.value === project.status) || PROJECT_STATUSES[0];
  const StatusIcon = currentStatusConfig.icon;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <header className={`bg-white dark:bg-gray-900 flex flex-col px-6 ${density === "compact" ? "pt-3" : "pt-5"} shrink-0 relative z-50 border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300`}>
        <div className="flex justify-between items-start">

          {/* CỘT TRÁI */}
          <div>
            <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 mb-1 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              <Menu size={16} />
              <span className="font-medium">Dự án</span>
            </div>

            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight">
                {project.name}
              </h1>
              <Star size={18} className="text-orange-400 fill-orange-400 cursor-pointer hover:scale-110 transition-transform" />

              {/* DROPDOWN TRẠNG THÁI */}
              <div className="relative ml-2" ref={dropdownRef}>
                <button
                  onClick={() => canUpdateProject && setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  disabled={isUpdatingStatus || !canUpdateProject}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold uppercase tracking-wider
                    transition-all duration-200 ${currentStatusConfig.bg} ${currentStatusConfig.color} ${currentStatusConfig.border}
                    ${isUpdatingStatus ? "opacity-50 cursor-wait" : ""}
                    ${canUpdateProject ? "cursor-pointer hover:shadow-sm" : "cursor-default opacity-90"}`}
                  title={!canUpdateProject ? "Bạn không có quyền đổi trạng thái dự án" : "Đổi trạng thái"}
                >
                  {isUpdatingStatus ? <Loader2 size={14} className="animate-spin" /> : <StatusIcon size={14} strokeWidth={2.5} />}
                  {currentStatusConfig.label}
                  {canUpdateProject && <ChevronDown size={14} className={`transition-transform duration-200 ${isStatusDropdownOpen ? "rotate-180" : ""}`} />}
                </button>

                {isStatusDropdownOpen && canUpdateProject && (
                  <div className="absolute top-full left-0 mt-1 w-[160px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg rounded-lg overflow-hidden z-[100] py-1">
                    {PROJECT_STATUSES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => handleUpdateStatus(s.value)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors cursor-pointer
                          ${project.status === s.value
                            ? "bg-gray-50 dark:bg-gray-700/60 text-gray-900 dark:text-white cursor-default"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                      >
                        <div className={`p-1 rounded-md ${s.bg} ${s.color}`}>
                          <s.icon size={12} strokeWidth={2.5} />
                        </div>
                        {s.label}
                        {project.status === s.value && <CheckCircle2 size={14} className="ml-auto text-gray-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-[13px] text-gray-500 dark:text-gray-400">{project.description}</p>
          </div>

          {/* CỘT PHẢI */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center">
              <div className="flex -space-x-2 mr-2">
                {members.slice(0, 4).map((user, i) => {
                  const initial = user.fullName ? user.fullName.charAt(0).toUpperCase() : "U";
                  const color = avatarColors[i % avatarColors.length];
                  return (
                    <div
                      key={user.userId || user.id}
                      className={`w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-[11px] font-bold shadow-sm cursor-pointer hover:-translate-y-1 transition-transform ${color}`}
                      title={user.fullName}
                    >{initial}</div>
                  );
                })}
              </div>
              {members.length > 4 && (
                <span className="text-[12px] text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  +{members.length - 4}
                </span>
              )}
            </div>

            {canCreateTask && (
              <button
                onClick={handleHeaderAddTask}
                className={`${A.solidBg} text-white px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer`}
              >
                <Plus size={16} strokeWidth={2.5} /> Thêm task
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className={`flex items-center gap-7 ${density === "compact" ? "mt-3" : "mt-6"}`}>
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end
              className={({ isActive }) => `
                pb-3 text-[14px] font-medium cursor-pointer transition-colors relative
                ${isActive ? A.text : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}
              `}
            >
              {({ isActive }) => (
                <>
                  {tab.name}
                  {isActive && <div className={`absolute bottom-[-1px] left-0 w-full h-[2px] rounded-t-md ${A.bgOnly}`}></div>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB] dark:bg-gray-900 overflow-hidden transition-colors duration-300">
        <Outlet context={context} />
      </main>   

      <CreateTaskPage
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        projectId={projectId}
        defaultStatus="TO_DO"
      />
    </div>
  );
};

export default ProjectLayout;