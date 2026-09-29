import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import apiClient from "../../utils/apiClient";
import { Plus, Trash2, Save, CheckSquare, X, User, ChevronDown, Check, Calendar, ShieldAlert, Loader2 } from "lucide-react";
import { emitEvent, EVENTS } from "../../hooks/useEventBus";
import toast from "react-hot-toast";
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const getAuthToken = () => {
  const t = localStorage.getItem("accessToken");
  if (t) return t;
  try { const raw = localStorage.getItem("user"); if (raw) return JSON.parse(raw).token || null; } catch {}
  return null;
};
const parseJwt = (token) => { try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; } };

const CreateTaskPage = ({ isOpen, onClose, projectId, defaultStatus = "TO_DO", onTaskCreated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [members, setMembers] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const [taskData, setTaskData] = useState({
    title: "", description: "", projectId: projectId || "",
    assigneeId: "", priority: "MEDIUM", status: defaultStatus, startDate: "", dueDate: "",
  });
  const [subTasks, setSubTasks] = useState([]);

  const { accent } = usePreferences();
  const A = getAccent(accent);

  useEffect(() => {
    if (isOpen) {
      setTaskData({ title: "", description: "", projectId: projectId || "", assigneeId: "", priority: "MEDIUM", status: defaultStatus, startDate: "", dueDate: "" });
      setSubTasks([]);
    }
  }, [isOpen, projectId, defaultStatus]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!projectId || !isOpen) return;
    apiClient.get(`http://localhost:8083/api/projects/${projectId}`)
      .then((res) => setProjectName(res.data?.name || "Dự án hiện tại"))
      .catch(() => {});
    apiClient.get(`http://localhost:8083/api/projects/${projectId}/members`)
      .then((res) => {
        const memData = res.data;
        setMembers(Array.isArray(memData) ? memData : memData?.content || []);
      }).catch(() => setMembers([]));
  }, [projectId, isOpen]);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    const token = getAuthToken();
    if (token) {
      const decoded = parseJwt(token);
      const userId = decoded?.sub || decoded?.id || decoded?.userId;
      setCurrentUserId(userId);
      if (userId) {
        setLoadingPermissions(true);
        apiClient.get(`http://localhost:8083/api/projects/${projectId}/users/${userId}/permissions`)
          .then((res) => setUserPermissions(res.data || []))
          .catch(() => setUserPermissions([]))
          .finally(() => setLoadingPermissions(false));
      }
    }
  }, [isOpen, projectId]);

  const handleAddSubtask = () => setSubTasks([...subTasks, { title: "", priority: "MEDIUM" }]);
  const handleRemoveSubtask = (index) => setSubTasks(subTasks.filter((_, i) => i !== index));
  const handleSubtaskChange = (index, field, value) => {
    const updated = [...subTasks];
    updated[index][field] = value;
    setSubTasks(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (taskData.startDate && taskData.dueDate && new Date(taskData.startDate) > new Date(taskData.dueDate)) {
      toast.error("Hạn hoàn thành không được trước ngày bắt đầu!"); return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiClient.post("http://localhost:8085/api/tasks", taskData);
      const parentTask = res.data;
      if (subTasks.length > 0) {
        await Promise.all(subTasks.map(async (st) => {
          try {
            await apiClient.post(`http://localhost:8085/api/tasks/${parentTask.id}/sub-tasks`, {
              title: st.title, priority: st.priority, projectId: taskData.projectId,
            });
          } catch { toast.error(`Lỗi tạo sub-task "${st.title}"`); }
        }));
      }
      toast.success("Tạo công việc thành công!");
      emitEvent(EVENTS.TASK, { taskId: parentTask.id, projectId: taskData.projectId });
      if (onTaskCreated) onTaskCreated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bạn không có quyền tạo công việc!");
    } finally { setIsSubmitting(false); }
  };

  const hasTaskCreatePermission = userPermissions.includes("TASK_CREATE") || userPermissions.includes("PROJECT_UPDATE");
  const hasTaskAssignPermission = userPermissions.includes("TASK_ASSIGN") || userPermissions.includes("PROJECT_UPDATE");
  const priorityLabels = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };
  const selectedAssigneeName = members.find((m) => (m.userId || m.id) === taskData.assigneeId);
  const inputClass = `w-full p-2.5 text-[14px] border border-gray-200 dark:border-gray-700 rounded-lg outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 ${A.ring} transition-all`;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] bg-gray-900/70 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 md:p-8">
        <div ref={dropdownRef} className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 relative transition-colors">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <X size={20} />
          </button>

          {loadingPermissions ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className={`animate-spin ${A.text}`} />
              <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">Đang xác thực quyền hạn...</p>
            </div>
          ) : !hasTaskCreatePermission ? (
            <div className="py-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Từ chối truy cập</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">Bạn không có quyền <strong>(TASK_CREATE)</strong> để tạo công việc mới.</p>
              <button onClick={onClose} className={`px-6 py-2 text-white text-sm font-semibold rounded-lg ${A.solidBg}`}>Đóng cửa sổ</button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800 pr-10">
                <CheckSquare className={A.icon} size={24} />
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Tạo Công Việc Mới</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Thuộc dự án: <span className={`font-semibold ${A.text}`}>{projectName || "Đang tải..."}</span></p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="relative">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <User size={15} /> Người phụ trách
                    </label>
                    {!hasTaskAssignPermission && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">Chỉ có thể tạo việc cho chính mình</span>
                    )}
                  </div>
                  <div
                    onClick={() => {
                      if (hasTaskAssignPermission) setOpenDropdown(openDropdown === "assignee" ? null : "assignee");
                      else setTaskData({ ...taskData, assigneeId: currentUserId });
                    }}
                    className={`w-full p-2.5 text-[14px] border rounded-lg flex items-center justify-between transition-colors ${
                      hasTaskAssignPermission
                        ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                        : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 cursor-not-allowed text-gray-500"
                    }`}>
                    <span className={taskData.assigneeId ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}>
                      {!hasTaskAssignPermission && !taskData.assigneeId
                        ? "Bấm để tự nhận việc"
                        : selectedAssigneeName
                          ? selectedAssigneeName.fullName || selectedAssigneeName.username || selectedAssigneeName.email
                          : "-- Chưa giao --"}
                    </span>
                    {hasTaskAssignPermission && <ChevronDown size={16} className={`text-gray-400 transition-transform ${openDropdown === "assignee" ? "rotate-180" : ""}`} />}
                  </div>

                  {openDropdown === "assignee" && hasTaskAssignPermission && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1">
                      <div onClick={() => { setTaskData({ ...taskData, assigneeId: "" }); setOpenDropdown(null); }}
                        className={`px-3.5 py-2 text-[14px] cursor-pointer flex items-center justify-between ${A.textHover}`}>
                        <span>-- Chưa giao --</span>
                        {!taskData.assigneeId && <Check size={15} className={A.icon} />}
                      </div>
                      {members.map((m) => {
                        const id = m.userId || m.id;
                        const name = m.fullName || m.username || m.email;
                        const isSelected = taskData.assigneeId === id;
                        return (
                          <div key={id} onClick={() => { setTaskData({ ...taskData, assigneeId: id }); setOpenDropdown(null); }}
                            className={`px-3.5 py-2 text-[14px] cursor-pointer flex items-center justify-between ${
                              isSelected ? `${A.softBg} ${A.text} font-medium` : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}>
                            <span>{name}</span>
                            {isSelected && <Check size={15} className={A.icon} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tên công việc *</label>
                    <input required type="text" placeholder="Nhập tiêu đề công việc..."
                      value={taskData.title} onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                      className={inputClass} />
                  </div>
                  <div className="relative">
                    <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Độ ưu tiên</label>
                    <div onClick={() => setOpenDropdown(openDropdown === "priority" ? null : "priority")}
                      className="w-full p-2.5 text-[14px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-between cursor-pointer hover:border-gray-300 dark:hover:border-gray-600">
                      <span className="text-gray-900 dark:text-gray-100">{priorityLabels[taskData.priority]}</span>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform ${openDropdown === "priority" ? "rotate-180" : ""}`} />
                    </div>
                    {openDropdown === "priority" && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl py-1">
                        {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                          <div key={p} onClick={() => { setTaskData({ ...taskData, priority: p }); setOpenDropdown(null); }}
                            className={`px-3.5 py-2 text-[14px] cursor-pointer flex items-center justify-between ${
                              taskData.priority === p ? `${A.softBg} ${A.text} font-medium` : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}>
                            <span>{priorityLabels[p]}</span>
                            {taskData.priority === p && <Check size={15} className={A.icon} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5"><Calendar size={15} className="text-gray-500" /> Ngày bắt đầu</label>
                    <input type="date" value={taskData.startDate} onChange={(e) => setTaskData({ ...taskData, startDate: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5"><Calendar size={15} className="text-gray-500" /> Hạn hoàn thành</label>
                    <input type="date" min={taskData.startDate} value={taskData.dueDate} onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Mô tả chi tiết</label>
                  <textarea rows="3" placeholder="Nhập mô tả công việc..." value={taskData.description}
                    onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                    className={`${inputClass} resize-none`} />
                </div>

                {/* <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[13px] font-bold text-gray-800 dark:text-gray-200">Danh sách Sub-tasks</h3>
                    <button type="button" onClick={handleAddSubtask}
                      className={`px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-[12px] font-semibold flex items-center gap-1 cursor-pointer shadow-sm ${A.text} ${A.textHover}`}>
                      <Plus size={14} /> Thêm Sub-task
                    </button>
                  </div>
                  <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto">
                    {subTasks.map((st, index) => (
                      <div key={index} className="flex gap-2 items-center bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm relative">
                        <input type="text" required placeholder="Tên sub-task..." value={st.title}
                          onChange={(e) => handleSubtaskChange(index, "title", e.target.value)}
                          className={`flex-1 p-1.5 border border-gray-200 dark:border-gray-700 rounded-md text-[13px] outline-none bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 ${A.ring}`} />
                        <button type="button" onClick={() => handleRemoveSubtask(index)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md cursor-pointer">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div> */}

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800 mt-2">
                  <button type="button" onClick={onClose}
                    className="px-5 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[13px] font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    Hủy
                  </button>
                  <button type="submit" disabled={isSubmitting}
                    className={`px-5 py-2 text-white text-[13px] font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer ${A.solidBg}`}>
                    <Save size={16} /> {isSubmitting ? "Đang lưu..." : "Lưu Công Việc"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateTaskPage;