import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useEvent, emitEvent, EVENTS } from "../../hooks/useEventBus";
import apiClient from "../../utils/apiClient";
import { useParams, useOutletContext } from "react-router-dom";
import {
  MessageSquare, Paperclip, MoreHorizontal, Calendar, Search,
  CheckCircle2, Loader2, X, ChevronDown, Check, User,
} from "lucide-react";
import toast from "react-hot-toast";

import { usePreferences } from "../../hooks/usePreferences";
import { getAccent, getDensity } from "../../utils/preferenceTokens";

const parseJwt = (token) => {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
};

const getPriorityStyles = (priority) => {
  switch (priority) {
    case "HIGH":   return "text-red-500 font-bold";
    case "MEDIUM": return "text-orange-500 font-bold";
    case "LOW":    return "text-green-500 font-bold";
    case "URGENT": return "text-red-600 font-black animate-pulse";
    default:       return "text-gray-500 font-bold";
  }
};

const avatarColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-purple-500", "bg-indigo-600"];

const columnsConfig = [
  { id: "TO_DO",       title: "To Do",       bgColumn: "bg-gray-50/70 dark:bg-gray-800/40" },
  { id: "IN_PROGRESS", title: "In Progress", bgColumn: "bg-blue-50/40 dark:bg-blue-500/5" },
  { id: "REVIEW",      title: "Review",      bgColumn: "bg-amber-50/40 dark:bg-amber-500/5" },
  { id: "DONE",        title: "Done",        bgColumn: "bg-emerald-50/40 dark:bg-emerald-500/5", isDoneColumn: true },
];

const priorityLabels = { ALL: "Mọi độ ưu tiên", URGENT: "Urgent", HIGH: "High", MEDIUM: "Medium", LOW: "Low" };

const KanbanBoard = () => {
  const { projectId } = useParams();
  const outletContext = useOutletContext() || {};
  const { setSelectedTaskId } = outletContext;

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [userPermissions, setUserPermissions] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [draggingTaskId, setDraggingTaskId] = useState(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [openDropdown, setOpenDropdown] = useState(null);
  const filterRef = useRef(null);

  // ==== Preferences ====
  const { accent, density } = usePreferences();
  const A = getAccent(accent);
  const D = getDensity(density);

  // ==== 3 chế độ hiển thị ====
  const isCompact      = density === "compact";
  const isComfortable  = density === "comfortable";
  // normal = !isCompact && !isComfortable

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const checkCanEditTask = (task) => {
    if (!task) return false;
    if (userPermissions.includes("PROJECT_UPDATE") || userPermissions.includes("PROJECT_DELETE")) return true;
    if (userPermissions.includes("TASK_UPDATE")) return true;
    if (task.assigneeId === currentUserId) return true;
    if (task.reporterId === currentUserId) return true;
    return false;
  };

  const getAssignee = useCallback((assigneeId) => {
    if (!assigneeId) return { fullName: "Chưa giao", avatarLetter: "?", avatarColor: "bg-gray-400" };
    const idx = members.findIndex((m) => m.userId === assigneeId);
    const member = members[idx];
    if (member) {
      const name = member.fullName || member.username || "User";
      return {
        fullName: name,
        avatarLetter: name.charAt(0).toUpperCase(),
        avatarColor: avatarColors[idx % avatarColors.length],
      };
    }
    return { fullName: "Chưa giao", avatarLetter: "?", avatarColor: "bg-gray-400" };
  }, [members]);

  const handleDragStart = (e, task) => {
    if (!checkCanEditTask(task)) {
      e.preventDefault();
      toast.error("Bạn không có quyền chuyển đổi trạng thái công việc!");
      return;
    }
    setDraggingTaskId(task.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.setData("sourceStatus", task.status);
  };

  const handleDragEnd = () => { setDraggingTaskId(null); };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDraggingTaskId(null);
    const taskId = e.dataTransfer.getData("text/plain");
    const sourceStatus = e.dataTransfer.getData("sourceStatus");
    if (!taskId || sourceStatus === targetStatus) return;

    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: targetStatus } : t));

    try {
      await apiClient.patch(`http://localhost:8085/api/tasks/${taskId}/status`, { status: targetStatus });
      emitEvent(EVENTS.TASK, { taskId, projectId, status: targetStatus });
      toast.success("Cập nhật trạng thái thành công!");
    } catch (error) {
      console.error("Lỗi cập nhật task:", error);
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: sourceStatus } : t));
      toast.error(error.response?.data?.message || error.message || "Không thể cập nhật trạng thái!");
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = !searchKeyword.trim()
        || (task.title && task.title.toLowerCase().includes(searchKeyword.toLowerCase()))
        || (task.description && task.description.toLowerCase().includes(searchKeyword.toLowerCase()));
      const matchesAssignee = selectedAssignee === "ALL" || task.assigneeId === selectedAssignee;
      const matchesPriority = selectedPriority === "ALL" || task.priority === selectedPriority;
      return matchesSearch && matchesAssignee && matchesPriority;
    });
  }, [tasks, searchKeyword, selectedAssignee, selectedPriority]);

  const clearAllFilters = () => {
    setSearchKeyword(""); setSelectedAssignee("ALL"); setSelectedPriority("ALL");
  };

  const hasActiveFilters = searchKeyword.trim() !== "" || selectedAssignee !== "ALL" || selectedPriority !== "ALL";
  const selectedAssigneeObj = members.find((m) => m.userId === selectedAssignee);
  const assigneeLabelText = selectedAssignee === "ALL"
    ? "Tất cả người phụ trách"
    : selectedAssigneeObj?.fullName || selectedAssigneeObj?.username || "Thành viên";

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8085/api/tasks/project/${projectId}`);
      setTasks(res.data);
    } catch (err) { console.error("Lỗi tải task:", err); }
  }, [projectId]);

  const fetchBoardMembers = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8083/api/projects/${projectId}/members`);
      setMembers(res.data);
    } catch (err) { console.error("Lỗi tải thành viên:", err); }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([fetchTasks(), fetchBoardMembers()]).finally(() => setLoading(false));
  }, [projectId, fetchTasks, fetchBoardMembers]);

  useEvent(EVENTS.TASK, (d) => { if (String(d.projectId) === String(projectId)) fetchTasks(); });
  useEvent(EVENTS.COMMENT, (d) => { if (String(d.projectId) === String(projectId) && d.taskId) fetchTasks(); });
  useEvent(EVENTS.ATTACHMENT, (d) => { if (String(d.projectId) === String(projectId)) fetchTasks(); });
  useEvent(EVENTS.MEMBER, (d) => { if (String(d.projectId) === String(projectId)) fetchBoardMembers(); });
  useEvent(EVENTS.NOTIFICATION, fetchTasks);

  return (
    <div className={`pt-5 px-4 lg:px-6 bg-white dark:bg-gray-900 w-full h-full font-sans flex flex-col min-h-0 overflow-hidden relative transition-colors ${D.sectionPt}`}>
      {loading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
          <Loader2 className={`animate-spin mb-2 ${A.text}`} size={32} />
          <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium">Đang tải công việc...</span>
        </div>
      )}

      {/* Toolbar filter */}
      <div className={`flex flex-wrap justify-between items-center ${D.sectionMb} ${D.gap} shrink-0 relative z-40`} ref={filterRef}>
        <div className={`flex flex-wrap items-center ${D.gapSm}`}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm kiếm task..."
              className={`w-[200px] pl-9 pr-3 py-2 ${D.textSize} bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 ${A.ring} text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500`}
            />
          </div>

          {/* Assignee dropdown */}
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
                {members.map((m) => {
                  const isSelected = selectedAssignee === m.userId;
                  return (
                    <div
                      key={m.userId}
                      onClick={() => { setSelectedAssignee(m.userId); setOpenDropdown(null); }}
                      className={`${D.itemSm} ${D.textSize} cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? `${A.softBg} ${A.text} font-medium`
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <span className="truncate">{m.fullName || m.username}</span>
                      {isSelected && <Check size={14} className={`shrink-0 ${A.icon}`} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Priority dropdown */}
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
                {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => {
                  const isSelected = selectedPriority === p;
                  return (
                    <div
                      key={p}
                      onClick={() => { setSelectedPriority(p); setOpenDropdown(null); }}
                      className={`${D.itemSm} ${D.textSize} cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? `${A.softBg} ${A.text} font-medium`
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <span>{priorityLabels[p]}</span>
                      {isSelected && <Check size={14} className={`shrink-0 ${A.icon}`} />}
                    </div>
                  );
                })}
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

      {/* Kanban columns */}
      <div className={`flex ${D.gap} xl:gap-4 h-full min-h-0 pb-3 overflow-x-auto`}>
        {columnsConfig.map((column) => {
          const columnTasks = filteredTasks.filter((task) => task.status === column.id);

          return (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`flex flex-col flex-1 min-w-[220px] max-w-[320px] h-full ${D.borderRadius} overflow-hidden ${column.bgColumn}`}
            >
              {/* Column header */}
              <div className={`flex justify-between items-center ${D.itemSm} shrink-0`}>
                <div className={`flex items-center ${D.gapSm}`}>
                  <h3
                    className={`${D.textSize} font-bold ${
                      column.id === "REVIEW"
                        ? "text-amber-600 dark:text-amber-400"
                        : column.id === "DONE"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : column.id === "IN_PROGRESS"
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {column.title}
                  </h3>
                  <span className={`${D.textSizeSm} font-semibold text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-2 rounded-full`}>
                    {columnTasks.length}
                  </span>
                </div>
                <button className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer">
                  <MoreHorizontal size={D.iconSize} />
                </button>
              </div>

              {/* Tasks list */}
              <div className={`flex-1 flex flex-col ${D.gap} overflow-y-auto px-2 pb-3 min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
                {columnTasks.map((task) => {
                  const assignee = getAssignee(task.assigneeId);
                  const isDragging = draggingTaskId === task.id;
                  const canEdit = checkCanEditTask(task);

                  return (
                    <div
                      key={task.id}
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (draggingTaskId) return;
                        if (setSelectedTaskId) setSelectedTaskId(task.id);
                      }}
                      className={`bg-white dark:bg-gray-800 ${D.item} ${D.borderRadius} border ${D.borderColor} ${D.shadow} hover:shadow-md transition-all ${
                        canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                      } flex flex-col group relative select-none ${
                        isDragging
                          ? `opacity-40 border-dashed ${A.border}`
                          : "opacity-100"
                      }`}
                    >
                      {column.isDoneColumn && (
                        <CheckCircle2 size={16} className="absolute top-3 right-3 text-emerald-500" />
                      )}

                      {/* Priority badge — luôn hiện */}
                      <span className={`text-[9px] w-fit uppercase tracking-wider mb-1 px-1.5 py-0.5 rounded-sm bg-gray-50 dark:bg-gray-700/50 ${getPriorityStyles(task.priority)}`}>
                        {task.priority || "MEDIUM"}
                      </span>

                      {/* Title — luôn hiện */}
                      <h4 className={`${D.textSize} font-bold text-gray-900 dark:text-gray-100 ${D.lineHeight} transition-colors mb-1 pr-4 truncate group-hover:${A.text}`}>
                        {task.title}
                      </h4>

                      {/* Description — ẩn ở compact, hiện ở normal/comfortable */}
                      {!isCompact && (
                        <p className={`${D.textSizeSm} text-gray-500 dark:text-gray-400 ${D.lineHeight} mb-3 ${isComfortable ? "line-clamp-3" : "line-clamp-2"}`}>
                          {task.description || "Chưa có mô tả..."}
                        </p>
                      )}

                      {/* Comfortable: Task ID + Created date */}
                      {isComfortable && (
                        <div className={`flex items-center ${D.gapSm} ${D.textSizeXs} text-gray-400 dark:text-gray-500 mb-2 font-mono`}>
                          <span>#{task.id?.substring(0, 6).toUpperCase()}</span>
                          {task.createdAt && (
                            <>
                              <span>•</span>
                              <span>{new Date(task.createdAt).toLocaleDateString("vi-VN")}</span>
                            </>
                          )}
                        </div>
                      )}

                      <div className={`flex flex-col ${D.gapSm} mt-auto ${isCompact ? "pt-1" : "pt-2"} border-t border-gray-50 dark:border-gray-700`}>
                        {/* Row 1: Assignee + DueDate — luôn hiện */}
                        <div className="flex justify-between items-center">
                          <div className={`flex items-center ${D.gapXs} min-w-0`}>
                            <div className={`${D.avatarSizeSm} rounded-full flex items-center justify-center text-white ${D.avatarText} font-bold shrink-0 ${assignee.avatarColor}`}>
                              {assignee.avatarLetter}
                            </div>
                            <span className={`${D.textSizeSm} font-medium text-gray-600 dark:text-gray-300 truncate`}>
                              {assignee.fullName}
                            </span>
                          </div>

                          {task.dueDate && (
                            <div className={`flex items-center gap-1 ${D.textSizeXs} font-medium shrink-0 ${
                              task.priority === "HIGH" || task.priority === "URGENT"
                                ? "text-red-500"
                                : "text-gray-400 dark:text-gray-500"
                            }`}>
                              <Calendar size={11} /> {task.dueDate}
                            </div>
                          )}
                        </div>

                        {/* Row 2: Comment + File + Progress — CHỈ Ở normal & comfortable */}
                        {!isCompact && (
                          <div className={`flex justify-between items-center ${D.textSizeXs} text-gray-400`}>
                            <div className={`flex items-center ${D.gapSm}`}>
                              <span className={`flex items-center gap-1 ${task.commentCount > 0 ? `${A.text} font-semibold` : "text-gray-400 dark:text-gray-500"}`} title={`${task.commentCount || 0} bình luận`}>
                                <MessageSquare size={12} /> {task.commentCount || 0}
                              </span>
                              <span className={`flex items-center gap-1 ${task.attachmentCount > 0 ? `${A.text} font-semibold` : "text-gray-400 dark:text-gray-500"}`} title={`${task.attachmentCount || 0} tệp đính kèm`}>
                                <Paperclip size={12} /> {task.attachmentCount || 0}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-1 max-w-[60px] justify-end">
                              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1">
                                <div
                                  className={`h-1 rounded-full ${column.isDoneColumn ? "bg-emerald-500" : A.bgOnly}`}
                                  style={{ width: column.isDoneColumn ? "100%" : "50%" }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Compact: chỉ hiện comment count nếu > 0 */}
                        {isCompact && task.commentCount > 0 && (
                          <div className={`flex items-center ${D.textSizeXs} text-gray-400 dark:text-gray-500`}>
                            <span className={`flex items-center gap-1 ${A.text}`} title={`${task.commentCount} bình luận`}>
                              <MessageSquare size={10} /> {task.commentCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;