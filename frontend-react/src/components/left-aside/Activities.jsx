import React, { useState, useRef, useEffect, useCallback } from "react";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import apiClient from "../../utils/apiClient";
import {
  Activity, CheckCircle, MessageSquare, Plus, Edit2, Trash2,
  Search, ChevronDown, Paperclip, LogIn,
} from "lucide-react";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent, getDensity } from "../../utils/preferenceTokens";

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState("");
  const [fetchError, setFetchError] = useState(false);

  const [selectedProject, setSelectedProject] = useState({
    id: "",
    name: "Tất cả dự án",
  });

  const [projects, setProjects] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // ==== Preferences toàn cục (thay thế `const density = "comfortable"`) ====
  const { accent, density } = usePreferences();
  const A = getAccent(accent);
  const D = getDensity(density);

  const fetchProjects = async () => {
    try {
      const response = await apiClient.get("http://localhost:8083/api/projects", {
        params: { size: 50 },
      });
      const data = response.data;
      setProjects(Array.isArray(data) ? data : data?.content || []);
    } catch (error) {
      console.error("Lỗi khi tải danh sách dự án:", error);
    }
  };

  const fetchActivities = useCallback(async (searchQuery, projId) => {
    try {
      const params = {};
      if (searchQuery && searchQuery.trim()) params.search = searchQuery.trim();
      if (projId) params.project = projId;

      const response = await apiClient.get("http://localhost:8081/api/activities", { params });
      setActivities(response.data || []);
      setFetchError(false);
    } catch (error) {
      console.error("Lỗi khi tải nhật ký hoạt động:", error);
      setFetchError(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActivities(search, selectedProject.id);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, selectedProject.id, fetchActivities]);

  useEffect(() => {
    fetchProjects();
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEvent(EVENTS.TASK,       () => fetchActivities(search, selectedProject.id));
  useEvent(EVENTS.COMMENT,    () => fetchActivities(search, selectedProject.id));
  useEvent(EVENTS.ATTACHMENT, () => fetchActivities(search, selectedProject.id));
  useEvent(EVENTS.PROJECT,    () => fetchActivities(search, selectedProject.id));
  useEvent(EVENTS.MEMBER,     () => fetchActivities(search, selectedProject.id));

  // ==== getActionIcon dùng closure `A` — không cần truyền token ====
  const getActionIcon = (type) => {
    switch (type) {
      case "TASK_STATUS_UPDATED":
      case "status_update":
        return <CheckCircle size={14} className="text-emerald-500" />;
      case "COMMENT_CREATED":
      case "comment":
        return <MessageSquare size={14} className="text-blue-500" />;
      case "TASK_CREATED":
      case "PROJECT_CREATED":
      case "SUB_TASK_CREATED":
      case "MEMBER_ADDED":
      case "USER_REGISTERED":
      case "create":
        return <Plus size={14} className={A.icon} />;
      case "TASK_DELETED":
      case "PROJECT_DELETED":
      case "COMMENT_DELETED":
      case "ATTACHMENT_DELETED":
      case "MEMBER_REMOVED":
      case "delete":
        return <Trash2 size={14} className="text-red-500" />;
      case "ATTACHMENT_CREATED":
      case "attachment":
        return <Paperclip size={14} className="text-orange-500" />;
      case "TASK_UPDATED":
      case "PROJECT_UPDATED":
      case "MEMBER_ROLE_UPDATED":
      case "edit":
        return <Edit2 size={14} className="text-gray-500 dark:text-gray-400" />;
      case "USER_LOGGED_IN":
        return <LogIn size={14} className="text-emerald-600" />;
      default:
        return <Activity size={14} className="text-gray-500 dark:text-gray-400" />;
    }
  };

  return (
    <div className="p-6 bg-[#F9FAFB] dark:bg-gray-900 w-full min-h-full font-sans overflow-y-auto text-gray-800 dark:text-gray-200 flex justify-center transition-colors duration-300">
      <style>{`
        @keyframes smoothFadeUp {
          0% { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-smooth-enter {
          opacity: 0;
          animation: smoothFadeUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .stagger-header { animation-delay: 0.08s; }
        .stagger-container { animation-delay: 0.18s; }
        .timeline-log-enter {
          opacity: 0;
          animation: smoothFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes menuPop {
          0% { opacity: 0; transform: translateY(-6px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-dropdown {
          animation: menuPop 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="max-w-5xl w-full">
        {/* HEADER TRANG & TÌM KIẾM */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 animate-smooth-enter stagger-header relative z-30">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2 transition-colors">
              Nhật ký hoạt động
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 transition-colors">
              Lưu trữ các thao tác diễn ra trên hệ thống
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 transition-colors"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm hoạt động, user..."
                className={`w-full sm:w-[250px] pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 shadow-sm ${A.ring.replace("focus:", "")}`}
              />
            </div>

            <div className="relative z-50" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full sm:w-auto flex items-center justify-between gap-3 text-[13px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 shadow-sm whitespace-nowrap cursor-pointer"
              >
                <span>{selectedProject.name}</span>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 ${
                    showDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 max-h-60 overflow-y-auto animate-dropdown">
                  <button
                    onClick={() => {
                      setSelectedProject({ id: "", name: "Tất cả dự án" });
                      setShowDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-[13px] transition-colors duration-150 cursor-pointer ${A.softHoverBg} ${A.textHover} ${
                      selectedProject.id === ""
                        ? `font-semibold ${A.text} ${A.softBg}`
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    Tất cả dự án
                  </button>
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setSelectedProject({ id: proj.id, name: proj.name });
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-[13px] transition-colors duration-150 truncate cursor-pointer ${A.softHoverBg} ${A.textHover} ${
                        selectedProject.id === proj.id
                          ? `font-semibold ${A.text} ${A.softBg}`
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {proj.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TIMELINE */}
        <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/80 shadow-sm ${density === "compact" ? "p-4" : "p-6"} relative animate-smooth-enter stagger-container transition-colors`}>
          <div className="absolute left-[47px] top-6 bottom-6 w-[2px] bg-gray-100 dark:bg-gray-700/50 hidden sm:block transition-colors"></div>

          {activities.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500 text-[13px] animate-smooth-enter">
              {fetchError
                ? "Không thể tải nhật ký hoạt động."
                : "Không có hoạt động nào được ghi nhận."}
            </div>
          ) : (
            activities.map((group, groupIndex) => (
              <div
                key={group.date || groupIndex}
                className={`${groupIndex !== 0 ? "mt-9" : ""}`}
              >
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="hidden sm:flex w-10 h-10 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 items-center justify-center text-gray-400 dark:text-gray-500 shrink-0 shadow-sm transition-colors">
                    <Activity size={16} />
                  </div>
                  <h3 className="text-[13.5px] font-bold text-gray-900 dark:text-gray-100 bg-gray-50/80 dark:bg-gray-900/50 backdrop-blur px-3 py-1 rounded-md border border-gray-100 dark:border-gray-700/50 transition-colors">
                    {group.date}
                  </h3>
                </div>

                <div className="flex flex-col gap-5 sm:pl-16">
                  {group.logs?.map((log, logIndex) => {
                    const itemDelay = `${0.22 + groupIndex * 0.08 + logIndex * 0.04}s`;

                    return (
                      <div
                        key={log.id || logIndex}
                        style={{ animationDelay: itemDelay }}
                        className="group flex gap-4 timeline-log-enter p-2 -m-2 rounded-xl transition-all duration-200 hover:bg-gray-50/80 dark:hover:bg-gray-700/50"
                      >
                        <div className="relative shrink-0 mt-0.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm ${
                              log.avatarColor || A.bgOnly
                            } z-10 relative ring-4 ring-white dark:ring-gray-800 transition-transform duration-300 group-hover:scale-105`}
                          >
                            {log.userAvatar ||
                              log.username?.substring(0, 1).toUpperCase() ||
                              "U"}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700 z-20 transition-colors">
                            {getActionIcon(log.actionType)}
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                          <p className="text-[13.5px] text-gray-600 dark:text-gray-300 leading-snug transition-colors">
                            {(() => {
                              const type = (log.actionType || "").toUpperCase();
                              const userName = log.username || log.user || "Thành viên";
                              const actionText = log.action || log.actionType;
                              const targetName = log.targetName || log.target || "đối tượng";

                              const userSpan = (
                                <span className={`font-bold text-gray-900 dark:text-gray-100 cursor-pointer ${A.textHover} transition-colors duration-150`}>
                                  {userName}
                                </span>
                              );
                              const targetSpan = (
                                <span className={`font-semibold text-gray-800 dark:text-gray-200 cursor-pointer ${A.textHover} transition-colors duration-150 underline decoration-gray-200 dark:decoration-gray-700 underline-offset-2`}>
                                  {targetName}
                                </span>
                              );

                              if (["USER_LOGGED", "USER_LOGGED_IN", "USER_REGISTERED"].includes(type)) {
                                return <>{userSpan} {actionText}</>;
                              }

                              return <>{userSpan} {actionText} {targetSpan}</>;
                            })()}
                          </p>

                          {log.details && (
                            <div className="text-[13px] text-gray-500 dark:text-gray-400 bg-gray-50/90 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50 mt-0.5 inline-block transition-colors">
                              {log.actionType?.includes("COMMENT") ? (
                                <span className="italic">
                                  "{log.details.replace(/"/g, "")}"
                                </span>
                              ) : (
                                <span>{log.details}</span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded flex items-center gap-1 transition-colors">
                              {log.projectName || log.project || "Hệ thống chung"}
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium transition-colors">
                              {log.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Activities;