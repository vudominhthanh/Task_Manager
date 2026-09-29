import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, Loader2, Trash2, Check, Edit2, Calendar,
  User, Clock, Paperclip, AlertCircle, Send, MessageCircle,
  Reply, PencilLine, Sparkles, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../../utils/apiClient";
import { emitEvent, EVENTS, useEvent } from "../../hooks/useEventBus";
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const avatarColors = [
  "bg-gradient-to-br from-blue-400 to-blue-600",
  "bg-gradient-to-br from-emerald-400 to-emerald-600",
  "bg-gradient-to-br from-amber-400 to-amber-600",
  "bg-gradient-to-br from-rose-400 to-rose-600",
  "bg-gradient-to-br from-purple-400 to-purple-600",
  "bg-gradient-to-br from-indigo-400 to-indigo-600",
];

const getAvatarColor = (str) => {
  if (!str) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const timeAgo = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";
  return "Vừa xong";
};

const statusConfig = {
  TO_DO:       { label: "To Do",       bg: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600" },
  IN_PROGRESS: { label: "In Progress", bg: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" },
  REVIEW:      { label: "Review",      bg: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" },
  DONE:        { label: "Done",        bg: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" },
};

const priorityConfig = {
  LOW:    { label: "Thấp",       color: "text-gray-600 dark:text-gray-400" },
  MEDIUM: { label: "Trung bình", color: "text-blue-600 dark:text-blue-400" },
  HIGH:   { label: "Cao",        color: "text-orange-600 dark:text-orange-400" },
  URGENT: { label: "Khẩn cấp",   color: "text-red-600 dark:text-red-400" },
};

const SubTaskDetailModal = ({
  subTaskId,
  parentTaskId,
  projectId,
  isOpen,
  onClose,
  members,
  permissions,
  currentUserId,
}) => {
  const [subTask, setSubTask] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState("");

  const [openDropdown, setOpenDropdown] = useState(null);
  const containerRef = useRef(null);

  const [comments, setComments] = useState([]);
  const [commentAccessDenied, setCommentAccessDenied] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({});

  const isReporter = subTask && String(subTask.reporterId) === String(currentUserId);
  const isAssignee = subTask && String(subTask.assigneeId) === String(currentUserId);
  const canEditDetails = isReporter || isAssignee || permissions.canUpdateTask;
  const canAssignTask = permissions.canAssignTask || isReporter || permissions.canUpdateTask;
  const canDeleteTask = permissions.canUpdateTask || isReporter;

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

  const fetchSubTask = useCallback(async () => {
    if (!subTaskId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`http://localhost:8085/api/tasks/${subTaskId}`);
      setSubTask(res.data);
      setEditTitle(res.data.title);
      setEditDesc(res.data.description || "");
    } catch {
      toast.error("Không thể tải chi tiết công việc con!");
      onClose();
    } finally {
      setLoading(false);
    }
  }, [subTaskId, onClose]);

  const fetchComments = useCallback(async () => {
    if (!subTaskId) return;
    try {
      const cmtRes = await apiClient.get(`http://localhost:8085/api/tasks/${subTaskId}/comments`);
      setComments(cmtRes.data || []);
      setCommentAccessDenied(false);
    } catch (err) {
      if (err.response?.status === 403) {
        setCommentAccessDenied(true);
        setComments([]);
      } else {
        console.error("Lỗi fetch comments:", err);
      }
    }
  }, [subTaskId]);

  useEffect(() => {
    if (isOpen) {
      fetchSubTask();
      fetchComments();
    }
  }, [isOpen, fetchSubTask, fetchComments]);

  useEvent(EVENTS.COMMENT, (data) => {
    if (!data || data.taskId === subTaskId || data.subTaskId === subTaskId) {
      fetchComments();
    }
  });

  if (!isOpen) return null;

  const handleUpdateField = async (field, value) => {
    if (!canEditDetails && field !== "assigneeId") return toast.error("Không có quyền chỉnh sửa!");
    if (field === "assigneeId" && !canAssignTask) return toast.error("Bạn không có quyền giao việc!");

    try {
      const isStatus = field === "status";
      const endpoint = isStatus
        ? `http://localhost:8085/api/tasks/${subTaskId}/status`
        : `http://localhost:8085/api/tasks/${subTaskId}`;
      const payload = isStatus ? { status: value } : { [field]: value };

      const res = isStatus
        ? await apiClient.patch(endpoint, payload)
        : await apiClient.put(endpoint, payload);

      setSubTask((prev) => ({ ...prev, ...res.data }));

      if (field === "title") setIsEditingTitle(false);
      if (field === "description") setIsEditingDesc(false);

      toast.success("Đã cập nhật!");
      emitEvent(EVENTS.TASK, { taskId: parentTaskId, projectId });
    } catch {
      toast.error("Lỗi cập nhật việc con!");
    }
  };

  const handleDelete = async () => {
    if (!canDeleteTask) return toast.error("Không có quyền xóa!");
    if (!window.confirm("Xác nhận xóa việc con này?")) return;
    try {
      await apiClient.delete(`http://localhost:8085/api/tasks/${subTaskId}`);
      toast.success("Đã xóa việc con!");
      emitEvent(EVENTS.TASK, { taskId: parentTaskId, projectId });
      onClose();
    } catch {
      toast.error("Lỗi xóa việc con!");
    }
  };

  const handleAddComment = async (e, parentId = null) => {
    if (e) e.preventDefault();
    if (!permissions.canCreateComment) return toast.error("Bạn không có quyền bình luận!");
    const textToSend = parentId ? replyContent : newComment;
    if (!textToSend.trim() || !subTaskId) return;

    setIsPostingComment(true);
    try {
      await apiClient.post(`http://localhost:8085/api/tasks/${subTaskId}/comments`, {
        content: textToSend,
        parentCommentId: parentId,
      });

      if (parentId) {
        setReplyingToId(null);
        setReplyContent("");
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      } else {
        setNewComment("");
      }

      emitEvent(EVENTS.COMMENT, { taskId: subTaskId });
      emitEvent(EVENTS.TASK, { taskId: parentTaskId, projectId });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể gửi bình luận!");
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) return;
    try {
      await apiClient.put(
        `http://localhost:8085/api/tasks/${subTaskId}/comments/${commentId}`,
        { content: editContent }
      );
      setEditingCommentId(null);
      setEditContent("");
      emitEvent(EVENTS.COMMENT, { taskId: subTaskId });
      emitEvent(EVENTS.TASK, { taskId: parentTaskId, projectId });
    } catch (error) {
      toast.error(error.response?.data?.message || "Bạn không có quyền sửa bình luận này!");
    }
  };

  const handleDeleteComment = async (commentId, cUserId) => {
    if (
      !permissions.canDeleteAnyComment &&
      (!permissions.canDeleteOwnComment || currentUserId !== cUserId)
    ) {
      return toast.error("Bạn không có quyền xóa bình luận này!");
    }
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này không?")) return;
    try {
      await apiClient.delete(
        `http://localhost:8085/api/tasks/${subTaskId}/comments/${commentId}`
      );
      emitEvent(EVENTS.COMMENT, { taskId: subTaskId });
      emitEvent(EVENTS.TASK, { taskId: parentTaskId, projectId });
      toast.success("Đã xóa bình luận!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Bạn không có quyền xóa bình luận này!");
    }
  };

  const currentAssignee = members.find(
    (m) => String(m.userId || m.id) === String(subTask?.assigneeId)
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-gray-900/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-6"
      ref={containerRef}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* ================= HEADER ================= */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50 dark:bg-gray-800/50 shrink-0">
          <div className="flex-1 mr-4">
            <div className={`text-[12px] font-semibold mb-1 flex items-center gap-2 ${A.text}`}>
              <span>QUẢN LÝ SUBTASK</span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="text-gray-500 dark:text-gray-400">
                ID: #{subTaskId?.substring(0, 8)}
              </span>
            </div>

            {loading ? (
              <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ) : isEditingTitle ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`text-[18px] font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border outline-none rounded px-3 py-1 w-full max-w-xl focus:ring-2 ${A.ring} ${A.border}`}
                  autoFocus
                />
                <button
                  onClick={() => handleUpdateField("title", editTitle)}
                  className={`p-1.5 rounded cursor-pointer transition-colors ${A.softBg} ${A.text} ${A.softHoverBg}`}
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => {
                    setIsEditingTitle(false);
                    setEditTitle(subTask.title);
                  }}
                  className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group mt-1">
                <h2 className="text-[18px] font-bold text-gray-900 dark:text-white">
                  {subTask?.title}
                </h2>
                {canEditDetails && (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className={`text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${A.textHover}`}
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-white dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-full transition-colors shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ================= BODY ================= */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 flex flex-col lg:flex-row">
          {loading ? (
            <div className="flex justify-center items-center w-full py-20">
              <Loader2 className={`animate-spin w-10 h-10 ${A.text}`} />
            </div>
          ) : (
            <>
              {/* ============ CỘT TRÁI ============ */}
              <div className="flex-[1.2] p-6 border-r border-gray-100 dark:border-gray-800 space-y-6 overflow-y-auto">
                {/* Trạng thái + Xóa */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50/80 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-3 flex-1 relative">
                    <label className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Trạng thái:
                    </label>
                    <div className="relative">
                      <div
                        onClick={() => {
                          if (canEditDetails)
                            setOpenDropdown(openDropdown === "status" ? null : "status");
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold border flex items-center gap-2 transition-all shadow-sm ${
                          statusConfig[subTask?.status || "TO_DO"]?.bg
                        } ${canEditDetails ? "cursor-pointer" : "cursor-not-allowed opacity-80"}`}
                      >
                        <span>{statusConfig[subTask?.status || "TO_DO"]?.label}</span>
                        {canEditDetails && (
                          <ChevronDown
                            size={14}
                            className={`transition-transform ${
                              openDropdown === "status" ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </div>

                      {openDropdown === "status" && canEditDetails && (
                        <div className="absolute left-0 top-full mt-1.5 w-44 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50">
                          {Object.entries(statusConfig).map(([key, cfg]) => (
                            <div
                              key={key}
                              onClick={() => {
                                handleUpdateField("status", key);
                                setOpenDropdown(null);
                              }}
                              className={`px-3.5 py-2 text-[12.5px] font-medium cursor-pointer flex items-center justify-between transition-colors ${
                                subTask?.status === key
                                  ? `${A.text} font-bold ${A.softBg}`
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                              }`}
                            >
                              <span className={`px-2 py-0.5 rounded-md text-xs border ${cfg.bg}`}>
                                {cfg.label}
                              </span>
                              {subTask?.status === key && <Check size={14} className={A.icon} />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {canDeleteTask && (
                    <button
                      onClick={handleDelete}
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} /> Xóa Subtask
                    </button>
                  )}
                </div>

                {/* Grid: Phụ trách / Ưu tiên / Deadline */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Phụ trách */}
                  <div className="relative">
                    <label className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <User size={13} /> Phụ trách
                    </label>
                    <div
                      onClick={() => {
                        if (canAssignTask)
                          setOpenDropdown(openDropdown === "assignee" ? null : "assignee");
                      }}
                      className={`w-full px-3.5 py-2.5 text-[13px] border rounded-xl outline-none transition-all shadow-sm flex items-center justify-between ${
                        canAssignTask
                          ? "cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          : "opacity-70 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-transparent"
                      }`}
                    >
                      <span className="truncate text-gray-800 dark:text-gray-200">
                        {currentAssignee
                          ? currentAssignee.fullName ||
                            currentAssignee.username ||
                            currentAssignee.email
                          : "-- Chưa giao --"}
                      </span>
                      {canAssignTask && (
                        <ChevronDown
                          size={14}
                          className={`text-gray-400 shrink-0 transition-transform ${
                            openDropdown === "assignee" ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </div>

                    {openDropdown === "assignee" && canAssignTask && (
                      <div className="absolute left-0 top-full mt-1.5 w-full min-w-[200px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50 max-h-48 overflow-y-auto">
                        <div
                          onClick={() => {
                            handleUpdateField("assigneeId", null);
                            setOpenDropdown(null);
                          }}
                          className="px-3.5 py-2 text-[12px] text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer italic"
                        >
                          -- Chưa giao --
                        </div>
                        {members.map((m) => {
                          const mId = m.userId || m.id;
                          const isSelected = String(subTask?.assigneeId) === String(mId);
                          return (
                            <div
                              key={mId}
                              onClick={() => {
                                handleUpdateField("assigneeId", mId);
                                setOpenDropdown(null);
                              }}
                              className={`px-3.5 py-2 text-[12.5px] cursor-pointer flex items-center justify-between transition-colors ${
                                isSelected
                                  ? `${A.softBg} ${A.text} font-bold`
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                              }`}
                            >
                              <span className="truncate">
                                {m.fullName || m.username || m.email}
                              </span>
                              {isSelected && <Check size={13} className={A.icon} />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Ưu tiên */}
                  <div className="relative">
                    <label className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <AlertCircle size={13} /> Ưu tiên
                    </label>
                    <div
                      onClick={() => {
                        if (canEditDetails)
                          setOpenDropdown(openDropdown === "priority" ? null : "priority");
                      }}
                      className={`w-full px-3.5 py-2.5 text-[13px] border rounded-xl outline-none transition-all shadow-sm flex items-center justify-between ${
                        canEditDetails
                          ? "cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                          : "opacity-70 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-transparent"
                      }`}
                    >
                      <span
                        className={`font-semibold ${
                          priorityConfig[subTask?.priority || "MEDIUM"]?.color
                        }`}
                      >
                        {priorityConfig[subTask?.priority || "MEDIUM"]?.label}
                      </span>
                      {canEditDetails && (
                        <ChevronDown
                          size={14}
                          className={`text-gray-400 shrink-0 transition-transform ${
                            openDropdown === "priority" ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </div>

                    {openDropdown === "priority" && canEditDetails && (
                      <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl py-1 z-50">
                        {Object.entries(priorityConfig).map(([key, cfg]) => (
                          <div
                            key={key}
                            onClick={() => {
                              handleUpdateField("priority", key);
                              setOpenDropdown(null);
                            }}
                            className={`px-3.5 py-2 text-[12.5px] cursor-pointer flex items-center justify-between transition-colors ${
                              subTask?.priority === key
                                ? `${A.softBg} font-bold ${A.text}`
                                : "font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                          >
                            <span className={cfg.color}>{cfg.label}</span>
                            {subTask?.priority === key && <Check size={13} className={A.icon} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Calendar size={13} /> Deadline
                    </label>
                    <input
                      type="date"
                      value={subTask?.dueDate ? subTask.dueDate.substring(0, 10) : ""}
                      onChange={(e) => handleUpdateField("dueDate", e.target.value)}
                      disabled={!canEditDetails}
                      className={`w-full px-3.5 py-2.5 text-[13px] border rounded-xl outline-none transition-all shadow-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 ${
                        !canEditDetails
                          ? "opacity-70 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 border-transparent"
                          : `cursor-pointer border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:ring-2 ${A.ring}`
                      }`}
                    />
                  </div>
                </div>

                {/* Mô tả */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[14px] font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      <Paperclip size={16} className="text-gray-400" /> Mô tả việc con
                    </h3>
                    {!isEditingDesc && canEditDetails && (
                      <button
                        onClick={() => setIsEditingDesc(true)}
                        className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[12px] font-semibold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit2 size={12} /> Chỉnh sửa
                      </button>
                    )}
                  </div>

                  {isEditingDesc ? (
                    <div className="space-y-2">
                      <textarea
                        rows="5"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Nhập mô tả chi tiết..."
                        className={`w-full p-3 text-[13px] bg-gray-50 dark:bg-gray-800 border rounded-xl outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-2 resize-y text-gray-800 dark:text-gray-200 transition-all ${A.border} ${A.ring}`}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateField("description", editDesc)}
                          className={`px-3.5 py-1.5 text-white text-[12px] font-bold rounded-lg transition-colors cursor-pointer ${A.solidBg}`}
                        >
                          Lưu mô tả
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingDesc(false);
                            setEditDesc(subTask.description || "");
                          }}
                          className="px-3.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[12px] font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`text-[13px] leading-relaxed p-3.5 rounded-xl border transition-colors ${
                        subTask?.description
                          ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                          : "bg-gray-50 dark:bg-gray-800/40 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
                      } ${
                        canEditDetails && !subTask?.description
                          ? "hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          : ""
                      }`}
                      onClick={() =>
                        canEditDetails && !subTask?.description && setIsEditingDesc(true)
                      }
                    >
                      {subTask?.description ? (
                        <div className="whitespace-pre-wrap">{subTask.description}</div>
                      ) : canEditDetails ? (
                        "Chưa có mô tả. Nhấn vào đây để thêm..."
                      ) : (
                        "Chưa có mô tả."
                      )}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <Clock size={13} />
                  Được tạo lúc:{" "}
                  {subTask?.createdAt
                    ? new Date(subTask.createdAt).toLocaleString("vi-VN")
                    : "N/A"}
                </div>
              </div>

              {/* ============ CỘT PHẢI: COMMENTS ============ */}
              <div className="flex-[1] bg-gray-50/50 dark:bg-gray-900/40 p-5 flex flex-col h-[520px]">
                {/* Header */}
                <div className="pb-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2 mb-3">
                  <div className={`p-1.5 rounded-lg ${A.softBg} ${A.icon}`}>
                    <MessageCircle size={16} />
                  </div>
                  <h3 className="text-[14px] font-bold text-gray-800 dark:text-gray-200">
                    Thảo luận việc con
                  </h3>
                  <span
                    className={`ml-auto bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full text-xs font-bold border shadow-sm ${A.text} ${A.border}`}
                  >
                    {comments.length}
                  </span>
                </div>

                {/* Danh sách comments */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {commentAccessDenied ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-80 p-4">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 mb-3">
                        <AlertCircle size={22} />
                      </div>
                      <p className="text-[12px] font-semibold text-gray-600 dark:text-gray-400">
                        Nội dung bình luận đã bị ẩn do giới hạn quyền truy cập riêng tư của
                        công việc này.
                      </p>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-70">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${A.softBg} ${A.icon}`}
                      >
                        <Sparkles size={22} />
                      </div>
                      <p className="text-[12px] font-bold text-gray-600 dark:text-gray-400">
                        Chưa có bình luận nào
                      </p>
                    </div>
                  ) : (
                    comments.map((c) => {
                      const isEditingParent = editingCommentId === c.id;
                      const isReplying = replyingToId === c.id;
                      const isExpanded = expandedReplies[c.id] || false;
                      const hasReplies = c.replies && c.replies.length > 0;
                      const isEdited =
                        c.updateDate &&
                        c.createdAt &&
                        new Date(c.updateDate) > new Date(c.createdAt);

                      return (
                        <div key={c.id} className="flex flex-col gap-1.5">
                          <div className="flex gap-2.5 bg-gray-50/80 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700 group shadow-sm">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm ${getAvatarColor(
                                c.userId
                              )}`}
                            >
                              {c.userAvatar ||
                                (c.userName || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <div className="flex items-baseline justify-between mb-1">
                                <span className="text-[12px] font-bold text-gray-900 dark:text-gray-100 truncate">
                                  {c.userName || "Thành viên"}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {timeAgo(c.createdAt)}
                                </span>
                              </div>

                              {isEditingParent ? (
                                <div className="flex flex-col gap-2 mt-1">
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className={`w-full bg-white dark:bg-gray-800 border rounded-lg p-2 text-[12px] outline-none focus:ring-2 text-gray-800 dark:text-gray-200 ${A.border} ${A.ring}`}
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => setEditingCommentId(null)}
                                      className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                    >
                                      Hủy
                                    </button>
                                    <button
                                      onClick={() => handleUpdateComment(c.id)}
                                      className={`text-xs text-white px-3 py-1 rounded-md cursor-pointer ${A.solidBg}`}
                                    >
                                      Lưu
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-[12.5px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line break-words">
                                    {c.content}
                                  </p>
                                  {isEdited && (
                                    <span className="text-[9.5px] text-gray-400 dark:text-gray-500 italic mt-0.5 block">
                                      Đã chỉnh sửa
                                    </span>
                                  )}
                                </div>
                              )}

                              {!isEditingParent && (
                                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                                  {permissions.canCreateComment && !commentAccessDenied && (
                                    <button
                                      onClick={() => {
                                        setReplyingToId(isReplying ? null : c.id);
                                        setReplyContent("");
                                      }}
                                      className={`flex items-center gap-1 cursor-pointer ${A.textHover}`}
                                    >
                                      <Reply size={11} /> Phản hồi
                                    </button>
                                  )}
                                  {permissions.canUpdateOwnComment &&
                                    currentUserId === c.userId && (
                                      <button
                                        onClick={() => {
                                          setEditingCommentId(c.id);
                                          setEditContent(c.content);
                                        }}
                                        className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                                      >
                                        <PencilLine size={11} /> Sửa
                                      </button>
                                    )}
                                  {(permissions.canDeleteAnyComment ||
                                    (permissions.canDeleteOwnComment &&
                                      currentUserId === c.userId)) && (
                                    <button
                                      onClick={() => handleDeleteComment(c.id, c.userId)}
                                      className="hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 size={11} /> Xóa
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Replies toggle */}
                          {hasReplies && (
                            <div className="ml-9">
                              <button
                                onClick={() =>
                                  setExpandedReplies((prev) => ({
                                    ...prev,
                                    [c.id]: !isExpanded,
                                  }))
                                }
                                className={`text-[11.5px] font-semibold flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg transition-colors ${A.text} ${A.softBg} ${A.softHoverBg}`}
                              >
                                <span className={`w-3 h-px ${A.bgOnly}`}></span>
                                {isExpanded
                                  ? `Ẩn câu trả lời (${c.replies.length})`
                                  : `Xem ${c.replies.length} câu trả lời`}
                              </button>
                            </div>
                          )}

                          {/* Reply input */}
                          {isReplying &&
                            permissions.canCreateComment &&
                            !commentAccessDenied && (
                              <div className="ml-9 flex items-center gap-2 mt-1">
                                <input
                                  type="text"
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder={`Phản hồi ${
                                    c.userName || "thành viên"
                                  }...`}
                                  className={`flex-1 bg-gray-50 dark:bg-gray-800 border rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 text-gray-800 dark:text-gray-200 ${A.border} ${A.ring}`}
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleAddComment(null, c.id)}
                                  className={`text-white px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer ${A.solidBg}`}
                                >
                                  Gửi
                                </button>
                                <button
                                  onClick={() => setReplyingToId(null)}
                                  className="text-gray-400 dark:text-gray-500 text-xs px-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded py-1.5 transition-colors"
                                >
                                  Hủy
                                </button>
                              </div>
                            )}

                          {/* Replies list */}
                          {isExpanded && hasReplies && (
                            <div
                              className={`ml-8 pl-3 border-l-2 flex flex-col gap-2.5 mt-1 ${A.border}`}
                            >
                              {c.replies.map((r) => {
                                const isEditingChild = editingCommentId === r.id;
                                const isChildEdited =
                                  r.updateDate &&
                                  r.createdAt &&
                                  new Date(r.updateDate) > new Date(r.createdAt);
                                return (
                                  <div
                                    key={r.id}
                                    className="flex gap-2.5 bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm"
                                  >
                                    <div
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${getAvatarColor(
                                        r.userId
                                      )}`}
                                    >
                                      {r.userAvatar ||
                                        (r.userName || "U").charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-[11.5px] font-bold text-gray-900 dark:text-gray-100 truncate">
                                          {r.userName || "User"}
                                        </span>
                                        <span className="text-[9.5px] text-gray-400 dark:text-gray-500 shrink-0">
                                          {timeAgo(r.createdAt)}
                                        </span>
                                      </div>
                                      {isEditingChild ? (
                                        <div className="flex flex-col gap-1.5 mt-1">
                                          <textarea
                                            value={editContent}
                                            onChange={(e) =>
                                              setEditContent(e.target.value)
                                            }
                                            className={`w-full bg-gray-50 dark:bg-gray-800 border rounded-lg p-1.5 text-[11.5px] outline-none focus:ring-2 text-gray-800 dark:text-gray-200 ${A.border} ${A.ring}`}
                                          />
                                          <div className="flex gap-2 justify-end">
                                            <button
                                              onClick={() =>
                                                setEditingCommentId(null)
                                              }
                                              className="text-[11px] text-gray-500 dark:text-gray-400 px-2 py-0.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                            >
                                              Hủy
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleUpdateComment(r.id)
                                              }
                                              className={`text-[11px] text-white px-2.5 py-0.5 rounded-md cursor-pointer ${A.solidBg}`}
                                            >
                                              Lưu
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          <p className="text-[12px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line break-words">
                                            {r.content}
                                          </p>
                                          {isChildEdited && (
                                            <span className="text-[9px] text-gray-400 dark:text-gray-500 italic mt-0.5 block">
                                              Đã chỉnh sửa
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-3 mt-1.5 text-[10.5px] text-gray-500 dark:text-gray-400 font-medium">
                                        {permissions.canUpdateOwnComment &&
                                          currentUserId === r.userId && (
                                            <button
                                              onClick={() => {
                                                setEditingCommentId(r.id);
                                                setEditContent(r.content);
                                              }}
                                              className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                                            >
                                              Sửa
                                            </button>
                                          )}
                                        {(permissions.canDeleteAnyComment ||
                                          (permissions.canDeleteOwnComment &&
                                            currentUserId === r.userId)) && (
                                          <button
                                            onClick={() =>
                                              handleDeleteComment(r.id, r.userId)
                                            }
                                            className="hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                                          >
                                            Xóa
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* New comment form */}
                {commentAccessDenied ? (
                  <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-center text-[12px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl border border-rose-100 dark:border-rose-500/20 flex items-center justify-center gap-2">
                      <AlertCircle size={14} />
                      Bạn không có quyền tham gia thảo luận trong công việc này.
                    </div>
                  </div>
                ) : permissions.canCreateComment ? (
                  <form
                    onSubmit={(e) => handleAddComment(e, null)}
                    className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Viết bình luận việc con..."
                      disabled={isPostingComment}
                      className={`flex-1 bg-gray-50 dark:bg-gray-800 border rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-2 text-gray-800 dark:text-gray-200 disabled:opacity-70 disabled:cursor-not-allowed ${A.border} ${A.ring}`}
                    />
                    <button
                      type="submit"
                      disabled={isPostingComment || !newComment.trim()}
                      className={`text-white p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${A.solidBg}`}
                    >
                      {isPostingComment ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="text-center text-[12px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700">
                      Tính năng bình luận đang bị khóa với vai trò của bạn.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SubTaskDetailModal;