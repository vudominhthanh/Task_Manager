import React, { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "../../utils/apiClient";
import toast from "react-hot-toast";
import {
  User, Calendar, GitMerge, CheckSquare, Square, Plus, Trash2,
  FileText, Download, Loader2, ChevronDown, Check,
} from "lucide-react";
import { emitEvent, EVENTS, useEvent } from "../../hooks/useEventBus";

import CreateSubTaskModal from "../function/CreateSubTaskModal";
import SubTaskDetailModal from "../function/SubTaskDetailModal";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const avatarColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-purple-500", "bg-indigo-600"];
const getAvatarColor = (str) => {
  if (!str) return "bg-blue-500";
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const TaskDetails = ({ task, taskId, members, permissions, currentUserId, onUpdateTaskField }) => {
  const [attachments, setAttachments] = useState([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const [isCreateSubTaskOpen, setIsCreateSubTaskOpen] = useState(false);
  const [selectedSubTaskId, setSelectedSubTaskId] = useState(null);

  // ==== Preferences ====
  const { accent } = usePreferences();
  const A = getAccent(accent);

  const isProjectAdmin = permissions?.isAdmin || permissions?.canDeleteProject;
  const isReporter = String(task?.reporterId) === String(currentUserId);
  const isAssignee = String(task?.assigneeId) === String(currentUserId);
  const canUpdateTask = isProjectAdmin || isAssignee || isReporter;
  const canCreateSubTask = isProjectAdmin || isAssignee || isReporter;

  const checkSubTaskPermissions = (subTask) => {
    const isSubAssignee = String(subTask?.assigneeId) === String(currentUserId);
    const isSubReporter = String(subTask?.reporterId) === String(currentUserId);
    return {
      canUpdate: isProjectAdmin || isSubAssignee || isSubReporter || isAssignee || isReporter,
      canDelete: isProjectAdmin || isSubReporter || isAssignee || isReporter,
    };
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAttachments = useCallback(async () => {
    if (!taskId) return;
    try {
      const attachRes = await apiClient.get(`http://localhost:8085/api/tasks/${taskId}/attachments`);
      setAttachments(attachRes.data || []);
    } catch (err) { console.error("Lỗi fetch attachments:", err); }
  }, [taskId]);

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  // ✅ FIX BUG: dùng fetchAttachments() thay vì fetchTaskDetails() (không tồn tại ở scope này)
  useEvent(EVENTS.TASK, (data) => {
    const p = data?.payload || {};
    const incomingTaskId = p.task?.id || p.id || p.taskId || data?.taskId;
    const incomingParentId = p.task?.parentTaskId || p.parentTaskId;
    if (
      String(incomingTaskId) === String(taskId) ||
      String(incomingParentId) === String(taskId)
    ) {
      fetchAttachments();
    }
  });

  useEvent(EVENTS.ATTACHMENT, (data) => {
    if (String(data.taskId) === String(taskId)) fetchAttachments();
  });

  const handleToggleSubTask = async (subTask) => {
    const perm = checkSubTaskPermissions(subTask);
    if (!perm.canUpdate) return toast.error("Bạn không có quyền cập nhật việc con này!");
    const nextStatus = (subTask.status === "DONE" || subTask.status === "COMPLETED") ? "TO_DO" : "DONE";
    try {
      await apiClient.patch(`http://localhost:8085/api/tasks/${subTask.id}/status`, { status: nextStatus });
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
    } catch { toast.error("Không thể cập nhật trạng thái!"); }
  };

  const handleDeleteSubTask = async (e, subTask) => {
    e.stopPropagation();
    const perm = checkSubTaskPermissions(subTask);
    if (!perm.canDelete) return toast.error("Bạn không có quyền xóa việc con này!");
    try {
      await apiClient.delete(`http://localhost:8085/api/tasks/${subTask.id}`);
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
      toast.success("Đã xóa việc con!");
    } catch { toast.error("Không thể xóa việc con!"); }
  };

  const handleFileUpload = async (e) => {
    if (!permissions.canUploadFile) return toast.error("Bạn không có quyền tải tệp lên!");
    const file = e.target.files[0];
    if (!file || !taskId) return;
    const formData = new FormData();
    formData.append("file", file);
    setIsUploadingFile(true);
    const tid = toast.loading(`Đang tải lên ${file.name}...`);
    try {
      await apiClient.post(`http://localhost:8085/api/tasks/${taskId}/attachments`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      emitEvent(EVENTS.ATTACHMENT, { taskId });
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
      toast.success("Đã tải tệp lên", { id: tid });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải tệp lên!", { id: tid });
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attId, uploaderId) => {
    if (!permissions.canDeleteAnyFile && (!permissions.canDeleteOwnFile || currentUserId !== uploaderId)) {
      return toast.error("Bạn không có quyền xóa tệp này!");
    }
    try {
      await apiClient.delete(`http://localhost:8085/api/tasks/${taskId}/attachments/${attId}`);
      emitEvent(EVENTS.ATTACHMENT, { taskId });
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
      toast.success("Đã xóa tệp đính kèm!");
    } catch (error) { toast.error(error.response?.data?.message || "Bạn không có quyền xóa tệp này!"); }
  };

  const handleViewAttachment = async (fileUrl, fileName, fileType = "") => {
    if (!fileUrl) return;
    const isImage = fileType.includes("image") || /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName);
    const isPdf = fileType.includes("pdf") || /\.pdf$/i.test(fileName);
    if (!isImage && !isPdf) return toast.error(`Định dạng "${fileName}" không hỗ trợ xem trực tiếp. Hãy bấm tải xuống!`);
    const fullUrl = fileUrl.startsWith("http") ? fileUrl : `http://localhost:8085${fileUrl}`;
    const newTab = window.open("about:blank", "_blank");
    if (newTab) newTab.document.write('<div style="font-family: sans-serif; display: flex; height: 100vh; justify-content: center; align-items: center; color: #666;">Đang tải tệp xem trước...</div>');
    try {
      const res = await apiClient.get(fullUrl, { responseType: "blob" });
      const typedBlob = new Blob([res.data], { type: fileType || (isPdf ? "application/pdf" : "image/png") });
      if (newTab) newTab.location.href = window.URL.createObjectURL(typedBlob);
    } catch {
      if (newTab) newTab.close();
      toast.error("Không thể xem tệp này trực tiếp!");
    }
  };

  const handleDownloadAttachment = async (fileUrl, fileName) => {
    if (!fileUrl) return;
    const fullUrl = fileUrl.startsWith("http") ? fileUrl : `http://localhost:8085${fileUrl}`;
    const downloadUrl = fullUrl.includes("?download=true") ? fullUrl : `${fullUrl}?download=true`;
    const tid = toast.loading("Đang chuẩn bị tệp...");
    try {
      const res = await apiClient.get(downloadUrl, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Tải xuống hoàn tất", { id: tid });
    } catch { toast.error("Tải tệp về máy thất bại!", { id: tid }); }
  };

  const subTasksList = task?.subTasks || [];
  const completedSubTasksCount = subTasksList.filter((st) => st.status === "DONE" || st.status === "COMPLETED").length;
  const progressPercent = subTasksList.length > 0
    ? Math.round((completedSubTasksCount / subTasksList.length) * 100)
    : task?.status === "DONE" || task?.status === "COMPLETED" ? 100 : task?.status === "IN_PROGRESS" ? 50 : 0;

  const currentAssignee = members.find((m) => String(m.userId || m.id) === String(task?.assigneeId));

  return (
    <div className="flex flex-col" ref={dropdownRef}>
      {/* MÔ TẢ */}
      <div className="mb-6">
        <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
          Mô tả
        </h3>
        {canUpdateTask ? (
          <textarea
            rows="4"
            defaultValue={task.description || ""}
            onBlur={(e) => onUpdateTaskField("description", e.target.value)}
            placeholder="Nhập mô tả cho công việc này..."
            className={`w-full bg-gray-50/50 dark:bg-gray-800/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 ${A.ring} rounded-xl p-3 text-[13px] text-gray-700 dark:text-gray-200 leading-relaxed outline-none resize-y transition-all shadow-sm`}
          />
        ) : (
          <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60">
            {task.description || "Chưa có mô tả cho công việc này."}
          </p>
        )}
      </div>

      {/* THUỘC TÍNH */}
      <div className="flex flex-col gap-3.5 mb-7">
        <div className="grid grid-cols-[100px_1fr] items-center text-[12px] relative">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <User size={14} /> Phụ trách
          </span>
          <div className="relative">
            <div
              onClick={() => { if (canUpdateTask) setOpenDropdown(openDropdown === "assignee" ? null : "assignee"); }}
              className={`w-full max-w-[220px] border rounded-xl px-3 py-2 text-[12px] font-medium text-gray-800 dark:text-gray-200 flex items-center justify-between shadow-sm transition-all ${
                canUpdateTask
                  ? "cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  : "cursor-not-allowed opacity-80 bg-gray-50 dark:bg-gray-800/50 border-transparent"
              }`}
            >
              <span className="truncate">
                {currentAssignee ? currentAssignee.fullName || currentAssignee.username || currentAssignee.email : "-- Chưa giao --"}
              </span>
              {canUpdateTask && (
                <ChevronDown size={13} className={`text-gray-400 shrink-0 transition-transform ${openDropdown === "assignee" ? "rotate-180" : ""}`} />
              )}
            </div>
            {openDropdown === "assignee" && canUpdateTask && (
              <div className="absolute left-0 top-full mt-1.5 w-full min-w-[220px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50 max-h-48 overflow-y-auto">
                <div
                  onClick={() => { onUpdateTaskField("assigneeId", null); setOpenDropdown(null); }}
                  className="px-3 py-2 text-[12px] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer italic"
                >
                  -- Chưa giao --
                </div>
                {members.map((m) => {
                  const mId = m.userId || m.id;
                  const isSelected = String(task.assigneeId) === String(mId);
                  return (
                    <div
                      key={mId}
                      onClick={() => { onUpdateTaskField("assigneeId", mId); setOpenDropdown(null); }}
                      className={`px-3 py-2 text-[12px] cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? `${A.softBg} ${A.text} font-semibold`
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                      }`}
                    >
                      <span className="truncate">{m.fullName || m.username || m.email}</span>
                      {isSelected && <Check size={13} className={A.icon} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[100px_1fr] items-center text-[12px]">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <User size={14} /> Người tạo
          </span>
          <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200">
            <div className={`w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold uppercase ${getAvatarColor(task.reporterId)}`}>
              {task.reporterName ? task.reporterName.charAt(0) : "U"}
            </div>
            {task.reporterName || "Hệ thống"}
          </div>
        </div>

        <div className="grid grid-cols-[100px_1fr] items-center text-[12px]">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Calendar size={14} /> Deadline
          </span>
          <input
            type="date"
            disabled={!canUpdateTask}
            defaultValue={task.dueDate || ""}
            onBlur={(e) => onUpdateTaskField("dueDate", e.target.value)}
            className={`border rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-gray-800 dark:text-gray-200 outline-none w-fit transition-colors ${
              canUpdateTask
                ? `bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer focus:ring-2 ${A.ring}`
                : "bg-gray-100 dark:bg-gray-800/50 cursor-not-allowed border-transparent"
            }`}
          />
        </div>

        <div className="grid grid-cols-[100px_1fr] items-center text-[12px]">
          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <GitMerge size={14} /> Tiến độ
          </span>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${progressPercent === 100 ? "bg-emerald-500" : A.bgOnly}`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* SUBTASKS */}
      <div className="mb-7">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Subtasks ({completedSubTasksCount}/{subTasksList.length})
          </h3>
          {canCreateSubTask && (
            <button
              onClick={() => setIsCreateSubTaskOpen(true)}
              className={`px-2.5 py-1 rounded-md text-[12px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${A.softBg} ${A.text} ${A.softHoverBg}`}
            >
              <Plus size={14} /> Thêm Subtask
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {subTasksList.length > 0 ? (
            subTasksList.map((st) => {
              const perm = checkSubTaskPermissions(st);
              const isDone = st.status === "DONE" || st.status === "COMPLETED";
              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedSubTaskId(st.id)}
                  className={`flex items-center justify-between text-[12.5px] p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm group cursor-pointer transition-colors hover:${A.border}`}
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <div
                      onClick={(e) => { e.stopPropagation(); handleToggleSubTask(st); }}
                      className={`shrink-0 ${perm.canUpdate ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                      title={perm.canUpdate ? "Đổi trạng thái" : "Không có quyền"}
                    >
                      {isDone
                        ? <CheckSquare size={16} className={A.icon} />
                        : <Square size={16} className={`text-gray-300 dark:text-gray-600 hover:${A.text}`} />
                      }
                    </div>
                    <span className={isDone ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-800 dark:text-gray-100 font-semibold"}>
                      {st.title}
                    </span>
                  </div>

                  {perm.canDelete && (
                    <button
                      onClick={(e) => handleDeleteSubTask(e, st)}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Xóa nhanh"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-[12px] text-gray-400 dark:text-gray-500 italic bg-gray-50/50 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 p-3 rounded-xl text-center">
              Chưa có công việc con nào. Nhấn "Thêm Subtask" để tạo mới.
            </p>
          )}
        </div>
      </div>

      {/* ATTACHMENTS */}
      <div className="pb-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Tệp đính kèm ({attachments.length})
          </h3>
          {permissions.canUploadFile && (
            <label className={`text-[12px] font-semibold flex items-center gap-1 cursor-pointer ${A.text} ${A.textHover}`}>
              {isUploadingFile ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Tải lên</>}
              <input type="file" onChange={handleFileUpload} className="hidden" disabled={isUploadingFile} />
            </label>
          )}
        </div>
        {attachments.length === 0 ? (
          <p className="text-[12px] text-gray-400 dark:text-gray-500 italic">Không có tệp đính kèm nào.</p>
        ) : (
          attachments.map((att) => (
            <div key={att.id} className="flex justify-between items-center p-2.5 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/40 mb-2 group transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  onClick={() => handleViewAttachment(att.fileUrl, att.fileName, att.fileType)}
                  className={`p-2 rounded-md shrink-0 cursor-pointer transition-colors ${A.softBg} ${A.icon} ${A.softHoverBg}`}
                  title="Xem tệp"
                >
                  <FileText size={16} />
                </div>
                <div className="flex flex-col truncate">
                  <button
                    type="button"
                    onClick={() => handleViewAttachment(att.fileUrl, att.fileName, att.fileType)}
                    className={`text-left text-[12px] font-semibold text-gray-800 dark:text-gray-100 truncate cursor-pointer transition-colors ${A.textHover}`}
                    title="Bấm để xem trực tiếp"
                  >
                    {att.fileName || "Tài liệu"}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(att.fileUrl, att.fileName)}
                  className={`text-gray-400 dark:text-gray-500 p-1 cursor-pointer ${A.textHover}`}
                  title="Tải về máy"
                >
                  <Download size={15} />
                </button>
                {(permissions.canDeleteAnyFile || (permissions.canDeleteOwnFile && currentUserId === att.userId)) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(att.id, att.userId)}
                    className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1 cursor-pointer"
                    title="Xóa tệp"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODALS */}
      <CreateSubTaskModal
        isOpen={isCreateSubTaskOpen}
        onClose={() => setIsCreateSubTaskOpen(false)}
        parentTaskId={taskId}
        projectId={task?.projectId}
        members={members}
      />

      <SubTaskDetailModal
        isOpen={!!selectedSubTaskId}
        onClose={() => setSelectedSubTaskId(null)}
        subTaskId={selectedSubTaskId}
        parentTaskId={taskId}
        projectId={task?.projectId}
        members={members}
        permissions={permissions}
      />
    </div>
  );
};

export default TaskDetails;