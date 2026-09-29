import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import apiClient from "../../utils/apiClient";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams, useOutletContext } from "react-router-dom";
import {
  Search, MoreHorizontal, Calendar, CheckCircle2, Circle, Clock,
  Loader2, X, ChevronDown, Check, User, AlertCircle, RefreshCw,
  Trash2, CheckSquare,
} from "lucide-react";
import toast from "react-hot-toast";

import { usePreferences } from "../../hooks/usePreferences";
import { getAccent, getDensity } from "../../utils/preferenceTokens";

const parseJwt = (token) => {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
};

const avatarColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-purple-500", "bg-indigo-600"];

const ProjectList = () => {
  const { projectId } = useParams();
  const outletContext = useOutletContext() || {};
  const { setSelectedTaskId } = outletContext;

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [userPermissions, setUserPermissions] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedAssignee, setSelectedAssignee] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");

  const [openDropdown, setOpenDropdown] = useState(null);
  const [activeMenuTaskId, setActiveMenuTaskId] = useState(null);
  const filterRef = useRef(null);

  // ==== Preferences ====
  const { accent, density } = usePreferences();
  const A = getAccent(accent);
  const D = getDensity(density);

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

  const canUpdateTask = userPermissions.includes("TASK_UPDATE") || userPermissions.includes("PROJECT_UPDATE");
  const canDeleteTask = userPermissions.includes("TASK_DELETE") || userPermissions.includes("PROJECT_DELETE");

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8085/api/tasks/project/${projectId}`);
      setTasks(res.data || []);
    } catch (err) {
      console.error("Lỗi tải task:", err);
      throw err;
    }
  }, [projectId]);

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8083/api/projects/${projectId}/members`);
      setMembers(res.data || []);
    } catch (err) { console.error("Lỗi tải thành viên:", err); }
  }, [projectId]);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setFetchError(false);
    try {
      await Promise.all([fetchTasks(), fetchMembers()]);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchTasks, fetchMembers]);

  useEffect(() => { loadData(); }, [loadData]);

  useEvent(EVENTS.TASK, (d) => { if (String(d.projectId) === String(projectId)) fetchTasks(); });
  useEvent(EVENTS.MEMBER, (d) => { if (String(d.projectId) === String(projectId)) fetchMembers(); });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
      if (!event.target.closest(".action-menu-container")) {
        setActiveMenuTaskId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteTask = async (e, taskId) => {
    e.stopPropagation();
    setActiveMenuTaskId(null);
    if (!canDeleteTask) return toast.error("Bạn không có quyền xóa công việc này!");
    if (!window.confirm("Bạn có chắc chắn muốn xóa công việc này?")) return;

    try {
      await apiClient.delete(`http://localhost:8085/api/tasks/${taskId}`);
      toast.success("Đã xóa công việc!");
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi xóa công việc!");
    }
  };

  const handleToggleComplete = async (e, task) => {
    e.stopPropagation();
    setActiveMenuTaskId(null);
    if (!canUpdateTask) return toast.error("Bạn không có quyền cập nhật trạng thái!");

    const newStatus = task.status === "DONE" ? "TO_DO" : "DONE";
    try {
      await apiClient.patch(`http://localhost:8085/api/tasks/${task.id}/status`, { status: newStatus });
      toast.success(newStatus === "DONE" ? "Đã hoàn thành công việc!" : "Đã mở lại công việc!");
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi cập nhật trạng thái!");
    }
  };

  const getAssigneeInfo = (assigneeId) => {
    if (!assigneeId) return { fullName: "Chưa giao", avatarLetter: "?", avatarColor: "bg-gray-400" };
    const idx = members.findIndex((m) => m.userId === assigneeId);
    const member = members[idx];
    if (member) {
      const name = member.fullName || "User";
      return {
        fullName: name,
        avatarLetter: name.charAt(0).toUpperCase() || "U",
        avatarColor: avatarColors[idx % avatarColors.length],
      };
    }
    return { fullName: "Chưa giao", avatarLetter: "?", avatarColor: "bg-gray-400" };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "DONE":        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case "IN_PROGRESS": return <Clock size={14} className="text-blue-500" />;
      case "REVIEW":      return <Circle size={14} className="text-amber-500 fill-amber-100 dark:fill-amber-500/30" />;
      default:            return <Circle size={14} className="text-gray-300 dark:text-gray-600" />;
    }
  };

  const formatStatusText = (status) => {
    switch (status) {
      case "DONE":        return "Done";
      case "IN_PROGRESS": return "In Progress";
      case "REVIEW":      return "Review";
      default:            return "To Do";
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "URGENT": return "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400";
      case "HIGH":   return "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400";
      case "MEDIUM": return "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400";
      default:       return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        (task.title && task.title.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        (task.description && task.description.toLowerCase().includes(searchKeyword.toLowerCase()));
      const matchesStatus = selectedStatus === "ALL" || task.status === selectedStatus;
      const matchesAssignee = selectedAssignee === "ALL" || task.assigneeId === selectedAssignee;
      const matchesPriority = selectedPriority === "ALL" || task.priority === selectedPriority;
      return matchesSearch && matchesStatus && matchesAssignee && matchesPriority;
    });
  }, [tasks, searchKeyword, selectedStatus, selectedAssignee, selectedPriority]);

  const clearAllFilters = () => {
    setSearchKeyword(""); setSelectedStatus("ALL"); setSelectedAssignee("ALL"); setSelectedPriority("ALL");
  };

  const hasActiveFilters =
    searchKeyword || selectedStatus !== "ALL" || selectedAssignee !== "ALL" || selectedPriority !== "ALL";

  const statusLabels = { ALL: "Mọi trạng thái", TO_DO: "To Do", IN_PROGRESS: "In Progress", REVIEW: "Review", DONE: "Done" };
  const priorityLabels = { ALL: "Mọi độ ưu tiên", URGENT: "Urgent", HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

  const selectedAssigneeObj = members.find((m) => m.userId === selectedAssignee);
  const assigneeLabelText = selectedAssignee === "ALL"
    ? "Tất cả người phụ trách"
    : selectedAssigneeObj?.fullName || selectedAssigneeObj?.username || "Thành viên";

  return (
    <div className={`p-4 lg:p-6 h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden relative font-sans transition-colors`}>
      {loading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
          <Loader2 className={`animate-spin mb-2 ${A.text}`} size={32} />
          <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium">Đang tải danh sách...</span>
        </div>
      )}

      {/* Toolbar */}
      <div className={`flex flex-wrap justify-between items-center ${D.sectionMb} ${D.gap} shrink-0 relative z-40`} ref={filterRef}>
        <div className={`flex flex-wrap items-center ${D.gapSm}`}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm kiếm task..."
              className={`w-[220px] pl-9 pr-3 py-2 ${D.textSize} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${A.ring} text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500`}
            />
          </div>

          {/* Status */}
          <div className="relative">
            <div
              onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
              className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 ${D.textSize} font-medium rounded-lg px-3 py-2 shadow-sm cursor-pointer min-w-[160px] flex items-center justify-between gap-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors select-none`}
            >
              <span className="truncate">{statusLabels[selectedStatus]}</span>
              <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform duration-200 ${openDropdown === "status" ? "rotate-180" : ""}`} />
            </div>
            {openDropdown === "status" && (
              <div className="absolute left-0 top-full mt-1.5 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl py-1 z-[99999]">
                {["ALL", "TO_DO", "IN_PROGRESS", "REVIEW", "DONE"].map((st) => (
                  <div
                    key={st}
                    onClick={() => { setSelectedStatus(st); setOpenDropdown(null); }}
                    className={`${D.itemSm} ${D.textSize} cursor-pointer flex items-center justify-between transition-colors ${
                      selectedStatus === st
                        ? `${A.softBg} ${A.text} font-medium`
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span>{statusLabels[st]}</span>
                    {selectedStatus === st && <Check size={14} className={`shrink-0 ${A.icon}`} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignee */}
          <div className="relative">
            <div
              onClick={() => setOpenDropdown(openDropdown === "assignee" ? null : "assignee")}
              className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 ${D.textSize} font-medium rounded-lg px-3 py-2 shadow-sm cursor-pointer min-w-[210px] flex items-center justify-between gap-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors select-none`}
            >
              <div className={`flex items-center ${D.gapSm} truncate`}>
                <User size={15} className={`shrink-0 ${A.icon}`} />
                <span className="truncate">{assigneeLabelText}</span>
              </div>
              <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform duration-200 ${openDropdown === "assignee" ? "rotate-180" : ""}`} />
            </div>
            {openDropdown === "assignee" && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl py-1 max-h-56 overflow-y-auto z-[99999]">
                <div
                  onClick={() => { setSelectedAssignee("ALL"); setOpenDropdown(null); }}
                  className={`${D.itemSm} ${D.textSize} cursor-pointer flex items-center justify-between transition-colors ${
                    selectedAssignee === "ALL"
                      ? `${A.softBg} ${A.text} font-medium`
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <span>Tất cả người phụ trách</span>
                  {selectedAssignee === "ALL" && <Check size={14} className={A.icon} />}
                </div>
                {members.map((m) => (
                  <div
                    key={m.userId}
                    onClick={() => { setSelectedAssignee(m.userId); setOpenDropdown(null); }}
                    className={`${D.itemSm} ${D.textSize} cursor-pointer flex items-center justify-between transition-colors ${
                      selectedAssignee === m.userId
                        ? `${A.softBg} ${A.text} font-medium`
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span className="truncate">{m.fullName || m.username}</span>
                    {selectedAssignee === m.userId && <Check size={14} className={`shrink-0 ${A.icon}`} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="relative">
            <div
              onClick={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
              className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 ${D.textSize} font-medium rounded-lg px-3 py-2 shadow-sm cursor-pointer min-w-[160px] flex items-center justify-between gap-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors select-none`}
            >
              <span className="truncate">{priorityLabels[selectedPriority]}</span>
              <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform duration-200 ${openDropdown === "priority" ? "rotate-180" : ""}`} />
            </div>
            {openDropdown === "priority" && (
              <div className="absolute left-0 top-full mt-1.5 w-44 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl py-1 z-[99999]">
                {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => (
                  <div
                    key={p}
                    onClick={() => { setSelectedPriority(p); setOpenDropdown(null); }}
                    className={`${D.itemSm} ${D.textSize} cursor-pointer flex items-center justify-between transition-colors ${
                      selectedPriority === p
                        ? `${A.softBg} ${A.text} font-medium`
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span>{priorityLabels[p]}</span>
                    {selectedPriority === p && <Check size={14} className={`shrink-0 ${A.icon}`} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className={`flex items-center gap-1 ${D.textSizeSm} text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 dark:bg-red-500/10 px-2.5 py-2 rounded-lg border border-red-100 dark:border-red-500/20 transition-colors cursor-pointer`}
            >
              <X size={14} /> Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className={`flex-1 overflow-auto border ${D.borderColor} ${D.borderRadius} ${D.shadow} relative`}>
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-gray-50/80 dark:bg-gray-800/80 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className={`${D.cellPadding} ${D.textSizeSm} font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b ${D.borderColor} w-[40%]`}>Tên công việc</th>
              <th className={`${D.cellPadding} ${D.textSizeSm} font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b ${D.borderColor}`}>Trạng thái</th>
              <th className={`${D.cellPadding} ${D.textSizeSm} font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b ${D.borderColor}`}>Mức độ</th>
              <th className={`${D.cellPadding} ${D.textSizeSm} font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b ${D.borderColor}`}>Phụ trách</th>
              <th className={`${D.cellPadding} ${D.textSizeSm} font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b ${D.borderColor}`}>Hạn chót</th>
              <th className={`${D.cellPadding} border-b ${D.borderColor} w-12`}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {fetchError ? (
              <tr>
                <td colSpan="6" className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle size={28} className="text-red-400" />
                    <span className={`${D.textSize} text-gray-700 dark:text-gray-300 font-medium`}>Không thể nạp danh sách công việc!</span>
                    <button
                      onClick={loadData}
                      className={`mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${A.softBg} ${A.text} ${A.softHoverBg}`}
                    >
                      <RefreshCw size={13} /> Thử lại
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const assignee = getAssigneeInfo(task.assigneeId);
                const isMenuOpen = activeMenuTaskId === task.id;

                return (
                  <tr
                    key={task.id}
                    onClick={() => { if (setSelectedTaskId) setSelectedTaskId(task.id); }}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer relative"
                  >
                    <td className={D.cellPadding}>
                      <div className="flex flex-col">
                        <span className={`${D.textSizeLg} font-semibold text-gray-900 dark:text-gray-100 transition-colors group-hover:${A.text}`}>
                          {task.title}
                        </span>
                        <span className={`${D.textSizeSm} text-gray-400 dark:text-gray-500 truncate max-w-xs`}>
                          {task.description || "Không có mô tả"}
                        </span>
                      </div>
                    </td>
                    <td className={D.cellPadding}>
                      <div className={`flex items-center ${D.gapSm}`}>
                        {getStatusIcon(task.status)}
                        <span className={`${D.textSize} font-medium text-gray-700 dark:text-gray-300`}>
                          {formatStatusText(task.status)}
                        </span>
                      </div>
                    </td>
                    <td className={D.cellPadding}>
                      <span className={`${D.textSizeSm} font-bold px-2 py-1 rounded-md ${getPriorityStyle(task.priority)}`}>
                        {task.priority || "MEDIUM"}
                      </span>
                    </td>
                    <td className={D.cellPadding}>
                      <div className={`flex items-center ${D.gapSm}`}>
                        <div className={`${D.avatarSizeSm} rounded-full flex items-center justify-center text-white ${D.avatarText} font-bold ${assignee.avatarColor}`}>
                          {assignee.avatarLetter}
                        </div>
                        <span className={`${D.textSize} font-medium text-gray-700 dark:text-gray-300`}>
                          {assignee.fullName}
                        </span>
                      </div>
                    </td>
                    <td className={D.cellPadding}>
                      <div className={`flex items-center gap-1.5 ${D.textSizeSm} text-gray-500 dark:text-gray-400`}>
                        <Calendar size={14} /> {task.dueDate || "N/A"}
                      </div>
                    </td>
                    <td className={`${D.cellPadding} text-right relative action-menu-container`}>
                      {(canUpdateTask || canDeleteTask) && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveMenuTaskId(isMenuOpen ? null : task.id); }}
                          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Tùy chọn"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      )}

                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-4 top-10 w-44 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50 text-left animate-dropdown"
                        >
                          {canUpdateTask && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleToggleComplete(e, task)}
                                className={`w-full ${D.itemSm} ${D.textSize} text-gray-700 dark:text-gray-300 flex items-center gap-2 cursor-pointer transition-colors ${A.textHover} ${A.softHoverBg}`}
                              >
                                <CheckSquare size={14} />
                                <span>{task.status === "DONE" ? "Mở lại việc" : "Đánh dấu Done"}</span>
                              </button>
                              {canDeleteTask && <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>}
                            </>
                          )}
                          {canDeleteTask && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteTask(e, task.id)}
                              className={`w-full ${D.itemSm} ${D.textSize} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 cursor-pointer transition-colors`}
                            >
                              <Trash2 size={14} />
                              <span>Xóa công việc</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className={`py-8 text-center text-gray-400 dark:text-gray-500 ${D.textSize}`}>
                  {!loading && "Không tìm thấy công việc phù hợp."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectList;