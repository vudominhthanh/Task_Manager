import React, { useState, useEffect, useRef, useCallback } from "react";
import apiClient from "../../utils/apiClient";
import { X, LayoutGrid, Loader2, ChevronDown, Check, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { emitEvent, EVENTS, useEvent } from "../../hooks/useEventBus";

import TaskDetails from "./TaskDetails";
import TaskComments from "./TaskComments";
import TaskActivity from "./TaskActivity";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const parseJwt = (token) => {
  try { return JSON.parse(atob(token.split(".")[1])); }
  catch { return null; }
};

const priorityLabels = {
  LOW:     { label: "Low",    bg: "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20" },
  MEDIUM:  { label: "Medium", bg: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20" },
  HIGH:    { label: "High",   bg: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20" },
  URGENT:  { label: "Urgent", bg: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/30 font-bold" },
  DEFAULT: { label: "Medium", bg: "bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20" },
};

const statusLabels = {
  TO_DO:       { label: "To Do",       bg: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600" },
  IN_PROGRESS: { label: "In Progress", bg: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" },
  REVIEW:      { label: "Review",      bg: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" },
  DONE:        { label: "Done",        bg: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" },
  COMPLETED:   { label: "Done",        bg: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" },
  DEFAULT:     { label: "To Do",       bg: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600" },
};

const ProjectRight = ({ taskId, onClose }) => {
  const [activeTab, setActiveTab] = useState("details");
  const [task, setTask] = useState(null);
  const [activities, setActivities] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openDropdown, setOpenDropdown] = useState(null);
  const containerRef = useRef(null);

  const [userPermissions, setUserPermissions] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const { accent } = usePreferences();
  const A = getAccent(accent);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!task?.projectId) return;
    const token = localStorage.getItem("accessToken")
      || (localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).token : null);
    if (token) {
      const decoded = parseJwt(token);
      const userId = decoded?.sub || decoded?.id || decoded?.userId;
      setCurrentUserId(userId);
      if (userId) {
        apiClient.get(`http://localhost:8083/api/projects/${task.projectId}/users/${userId}/permissions`)
          .then((res) => setUserPermissions(res.data || []))
          .catch((err) => console.error("Lỗi lấy quyền:", err));
      }
    }
  }, [task?.projectId]);

  const isProjectAdmin = userPermissions.includes("PROJECT_DELETE") || userPermissions.includes("PROJECT_UPDATE");
  const isReporter = task && String(task.reporterId) === String(currentUserId);
  const isAssignee = task && String(task.assigneeId) === String(currentUserId);

  const permissions = {
    isAdmin: isProjectAdmin,
    canUpdateTask: isProjectAdmin || isAssignee || isReporter,
    canDeleteTask: isProjectAdmin || isReporter,
    canAssignTask: isProjectAdmin || isAssignee || isReporter,
    canCreateComment: userPermissions.includes("COMMENT_CREATE"),
    canUpdateOwnComment: userPermissions.includes("COMMENT_UPDATE_OWN"),
    canDeleteOwnComment: userPermissions.includes("COMMENT_DELETE_OWN"),
    canDeleteAnyComment: userPermissions.includes("COMMENT_DELETE_ANY"),
    canUploadFile: userPermissions.includes("ATTACHMENT_UPLOAD"),
    canDeleteOwnFile: userPermissions.includes("ATTACHMENT_DELETE_OWN"),
    canDeleteAnyFile: userPermissions.includes("ATTACHMENT_DELETE_ANY"),
  };

  const fetchMembers = useCallback(async (projId) => {
    const targetProjectId = projId || task?.projectId;
    if (!targetProjectId) return;
    try {
      const memRes = await apiClient.get(`http://localhost:8083/api/projects/${targetProjectId}/members`);
      setMembers(memRes.data || []);
    } catch (err) { console.error("Lỗi fetch members:", err); }
  }, [task?.projectId]);

  const fetchTaskDetails = useCallback(async () => {
    if (!taskId) return;
    try {
      const taskRes = await apiClient.get(`http://localhost:8085/api/tasks/${taskId}`);
      setTask(taskRes.data);
      if (taskRes.data?.projectId) fetchMembers(taskRes.data.projectId);
    } catch (err) { console.error("Lỗi fetch task:", err); }
  }, [taskId, fetchMembers]);

  const fetchActivities = useCallback(async () => {
    if (!taskId) return;
    try {
      const actRes = await apiClient.get(`http://localhost:8081/api/activities/task/${taskId}`);
      setActivities(actRes.data || []);
    } catch (err) { console.error("Lỗi fetch activities:", err); }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    Promise.all([fetchTaskDetails(), fetchActivities()]).finally(() => setLoading(false));
  }, [taskId, fetchTaskDetails, fetchActivities]);

  useEvent(EVENTS.TASK, (eventData) => {
    const p = eventData?.payload || {};
    const incomingTaskId = p.task?.id || p.id || p.taskId || eventData?.taskId;
    const incomingParentId = p.task?.parentTaskId || p.parentTaskId;
    const isCurrentTask = incomingTaskId && String(incomingTaskId) === String(taskId);
    const isChildSubTask = incomingParentId && String(incomingParentId) === String(taskId);
    const isExistingSubTask = task?.subTasks?.some((st) => String(st.id) === String(incomingTaskId));
    if (!incomingTaskId || isCurrentTask || isChildSubTask || isExistingSubTask) {
      fetchTaskDetails();
      fetchActivities();
    }
  });

  useEvent(EVENTS.COMMENT, () => fetchActivities());
  useEvent(EVENTS.ATTACHMENT, () => fetchActivities());
  useEvent(EVENTS.MEMBER, (eventData) => {
    const pId = eventData?.payload?.projectId || eventData?.projectId;
    if (!pId || !task?.projectId || String(pId) === String(task.projectId)) {
      fetchMembers(task?.projectId);
    }
  });

  const handleUpdateTaskField = async (field, value) => {
    if (!permissions.canUpdateTask) {
      return toast.error("Bạn không có quyền sửa công việc hoặc thay đổi trạng thái!");
    }
    if (field === "assigneeId" && !permissions.canAssignTask && value !== currentUserId) {
      return toast.error("Bạn không có quyền giao việc cho người khác!");
    }
    try {
      const isStatus = field === "status";
      const endpoint = isStatus
        ? `http://localhost:8085/api/tasks/${taskId}/status`
        : `http://localhost:8085/api/tasks/${taskId}`;
      const bodyData = isStatus ? { status: value } : { [field]: value };
      const res = isStatus
        ? await apiClient.patch(endpoint, bodyData)
        : await apiClient.put(endpoint, bodyData);
      const updatedTask = res.data;
      setTask((prev) => ({ ...prev, ...updatedTask }));
      fetchActivities();
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId, task: updatedTask });
      toast.success("Đã cập nhật công việc!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Cập nhật thất bại!");
    }
  };

  const handleDeleteTask = async () => {
    if (!permissions.canDeleteTask) return toast.error("Bạn không có quyền xóa công việc này!");
    if (!window.confirm("Bạn có chắc chắn muốn xóa công việc này không?")) return;
    try {
      await apiClient.delete(`http://localhost:8085/api/tasks/${taskId}`);
      toast.success("Đã xóa công việc!");
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId, deleted: true });
      if (onClose) onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bạn không có quyền xóa công việc này!");
    }
  };

  if (!taskId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50/30 dark:bg-gray-800/30 h-full transition-colors">
        <div className={`w-14 h-14 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-center mb-3 ${A.icon}`}>
          <LayoutGrid size={24} />
        </div>
        <h3 className="text-[14px] font-bold text-gray-800 dark:text-gray-100 mb-1">
          Chi tiết công việc
        </h3>
        <p className="text-[12px] text-gray-400 dark:text-gray-500 max-w-[210px] leading-relaxed">
          Chọn một task ở bảng Kanban để xem và quản lý thông tin chi tiết.
        </p>
      </div>
    );
  }

  const currentPriorityConfig = priorityLabels[task?.priority] || priorityLabels.DEFAULT;
  const currentStatusConfig = statusLabels[task?.status] || statusLabels.DEFAULT;

  return (
    <div className="flex flex-col h-full w-full relative bg-white dark:bg-gray-900 font-sans transition-colors" ref={containerRef}>
      {loading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] z-20 flex items-center justify-center">
          <Loader2 className={`animate-spin ${A.text}`} size={28} />
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-5 pb-2 shrink-0 bg-white dark:bg-gray-900">
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-[18px] font-bold text-gray-900 dark:text-white leading-snug pr-4">
            {task ? task.title : "Đang tải..."}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-md transition-colors shrink-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {task && (
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2 relative z-30">
            <div className="flex items-center gap-2">
              {/* Priority */}
              <div className="relative">
                <div
                  onClick={() => { if (permissions.canUpdateTask) setOpenDropdown(openDropdown === "priority" ? null : "priority"); }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border flex items-center gap-2 select-none transition-all shadow-sm ${currentPriorityConfig.bg} ${permissions.canUpdateTask ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
                >
                  <span>{currentPriorityConfig.label}</span>
                  {permissions.canUpdateTask && (
                    <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdown === "priority" ? "rotate-180" : ""}`} />
                  )}
                </div>
                {openDropdown === "priority" && permissions.canUpdateTask && (
                  <div className="absolute left-0 top-full mt-1.5 w-36 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                      <div
                        key={p}
                        onClick={() => { handleUpdateTaskField("priority", p); setOpenDropdown(null); }}
                        className={`px-3 py-2 text-[12px] cursor-pointer flex items-center justify-between transition-colors ${
                          (task.priority || "MEDIUM") === p
                            ? `${A.softBg} ${A.text} font-semibold`
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                        }`}
                      >
                        <span>{(priorityLabels[p] || priorityLabels.DEFAULT).label}</span>
                        {(task.priority || "MEDIUM") === p && <Check size={13} className={A.icon} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="relative">
                <div
                  onClick={() => { if (permissions.canUpdateTask) setOpenDropdown(openDropdown === "status" ? null : "status"); }}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border flex items-center gap-2 select-none transition-all shadow-sm ${currentStatusConfig.bg} ${permissions.canUpdateTask ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
                >
                  <span>{currentStatusConfig.label}</span>
                  {permissions.canUpdateTask && (
                    <ChevronDown size={13} className={`transition-transform duration-200 ${openDropdown === "status" ? "rotate-180" : ""}`} />
                  )}
                </div>
                {openDropdown === "status" && permissions.canUpdateTask && (
                  <div className="absolute left-0 top-full mt-1.5 w-40 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {["TO_DO", "IN_PROGRESS", "REVIEW", "DONE"].map((s) => (
                      <div
                        key={s}
                        onClick={() => { handleUpdateTaskField("status", s); setOpenDropdown(null); }}
                        className={`px-3 py-2 text-[12px] cursor-pointer flex items-center justify-between transition-colors ${
                          (task.status || "TO_DO") === s
                            ? `${A.softBg} ${A.text} font-semibold`
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                        }`}
                      >
                        <span>{(statusLabels[s] || statusLabels.DEFAULT).label}</span>
                        {(task.status || "TO_DO") === s && <Check size={13} className={A.icon} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {permissions.canDeleteTask && (
              <button
                onClick={handleDeleteTask}
                className="flex items-center gap-1 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer"
                title="Xóa công việc"
              >
                <Trash2 size={14} /> Xóa
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 gap-5">
          {[
            { id: "details",  label: "Chi tiết" },
            { id: "comments", label: "Bình luận" },
            { id: "activity", label: "Hoạt động" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-[13px] font-medium pb-2.5 transition-colors relative cursor-pointer ${
                activeTab === tab.id
                  ? `${A.text} font-bold border-b-2 ${A.border}`
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-h-0 flex flex-col">
        {activeTab === "details" && task && (
          <TaskDetails
            task={task}
            taskId={taskId}
            members={members}
            permissions={permissions}
            currentUserId={currentUserId}
            onUpdateTaskField={handleUpdateTaskField}
          />
        )}
        {activeTab === "comments" && (
          <TaskComments
            taskId={taskId}
            projectId={task?.projectId}
            permissions={permissions}
            currentUserId={currentUserId}
          />
        )}
        {activeTab === "activity" && <TaskActivity activities={activities} />}
      </div>
    </div>
  );
};

export default ProjectRight;