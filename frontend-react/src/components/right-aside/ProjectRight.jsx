import React, { useState, useEffect, useRef, useCallback } from "react";
import { useEvent, emitEvent, EVENTS } from "../../hooks/useEventBus";
import apiClient from "../../utils/apiClient";
import { X, User, Calendar, GitMerge, Send, Loader2, LayoutGrid, Trash2, CheckSquare, Square, Plus, FileText, Download, ChevronDown, Check, } from "lucide-react";
import toast from "react-hot-toast";

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

const avatarColors = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-purple-500",
  "bg-indigo-600",
];

const getAvatarColor = (str) => {
  if (!str) return "bg-blue-500";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const priorityLabels = {
  LOW: { label: "Low", bg: "bg-green-50 text-green-700 border-green-200" },
  MEDIUM: {
    label: "Medium",
    bg: "bg-orange-50 text-orange-700 border-orange-200",
  },
  HIGH: { label: "High", bg: "bg-red-50 text-red-600 border-red-200" },
  URGENT: {
    label: "Urgent",
    bg: "bg-red-100 text-red-700 border-red-300 font-bold",
  },
  DEFAULT: {
    label: "Medium",
    bg: "bg-orange-50 text-orange-700 border-orange-200",
  },
};

const statusLabels = {
  TO_DO: { label: "To Do", bg: "bg-gray-100 text-gray-700 border-gray-200" },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-blue-50 text-blue-700 border-blue-200",
  },
  REVIEW: {
    label: "Review",
    bg: "bg-amber-50 text-amber-700 border-amber-200",
  },
  DONE: {
    label: "Done",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  COMPLETED: {
    label: "Done",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  DEFAULT: { label: "To Do", bg: "bg-gray-100 text-gray-700 border-gray-200" },
};

const ProjectRight = ({ taskId, onClose }) => {
  const [activeTab, setActiveTab] = useState("details");
  const [task, setTask] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState("");
  const [isAddingSubTask, setIsAddingSubTask] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchMembers = useCallback(
    async (projId) => {
      const targetProjectId = projId || task?.projectId;
      if (!targetProjectId) return;
      try {
        const memRes = await apiClient.get(
          `http://localhost:8083/api/projects/${targetProjectId}/members`
        );
        setMembers(memRes.data || []);
      } catch (err) {
        console.error("Lỗi fetch members:", err);
      }
    },
    [task?.projectId],
  );

  const fetchTaskDetails = useCallback(async () => {
    if (!taskId) return;
    try {
      const taskRes = await apiClient.get(
        `http://localhost:8085/api/tasks/${taskId}`
      );
      const taskData = taskRes.data;
      setTask(taskData);
      if (taskData?.projectId) fetchMembers(taskData.projectId);
    } catch (err) {
      console.error("Lỗi fetch task:", err);
    }
  }, [taskId, fetchMembers]);

  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    try {
      const cmtRes = await apiClient.get(
        `http://localhost:8085/api/tasks/${taskId}/comments`
      );
      setComments(cmtRes.data || []);
    } catch (err) {
      console.error("Lỗi fetch comments:", err);
    }
  }, [taskId]);

  const fetchAttachments = useCallback(async () => {
    if (!taskId) return;
    try {
      const attachRes = await apiClient.get(
        `http://localhost:8085/api/tasks/${taskId}/attachments`
      );
      setAttachments(attachRes.data || []);
    } catch (err) {
      console.error("Lỗi fetch attachments:", err);
    }
  }, [taskId]);

  const fetchActivities = useCallback(async () => {
    if (!taskId) return;
    try {
      const actRes = await apiClient.get(
        `http://localhost:8081/api/activities/task/${taskId}`
      );
      setActivities(actRes.data || []);
    } catch (err) {
      console.error("Lỗi fetch activities:", err);
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    Promise.all([
      fetchTaskDetails(),
      fetchComments(),
      fetchAttachments(),
      fetchActivities(),
    ]).finally(() => setLoading(false));
  }, [
    taskId,
    fetchTaskDetails,
    fetchComments,
    fetchAttachments,
    fetchActivities,
  ]);

  useEvent(EVENTS.TASK, (eventData) => {
    const p = eventData?.payload || {};
    const incomingTaskId = p.task?.id || p.id || p.taskId || eventData?.taskId;
    const incomingParentId = p.task?.parentTaskId || p.parentTaskId;
    const isCurrentTask =
      incomingTaskId && String(incomingTaskId) === String(taskId);
    const isChildSubTask =
      incomingParentId && String(incomingParentId) === String(taskId);
    const isExistingSubTask = task?.subTasks?.some(
      (st) => String(st.id) === String(incomingTaskId),
    );
    if (
      !incomingTaskId ||
      isCurrentTask ||
      isChildSubTask ||
      isExistingSubTask
    ) {
      fetchTaskDetails();
      fetchActivities();
    }
  });

  useEvent(EVENTS.COMMENT, (eventData) => {
    const p = eventData?.payload || {};
    const incomingId = p.taskId || p.comment?.taskId || eventData?.taskId;
    if (!incomingId || !taskId || String(incomingId) === String(taskId)) {
      fetchComments();
      fetchActivities();
    }
  });

  useEvent(EVENTS.ATTACHMENT, () => {
    fetchAttachments();
    fetchActivities();
  });

  useEvent(EVENTS.MEMBER, (eventData) => {
    const pId = eventData?.payload?.projectId || eventData?.projectId;
    if (!pId || !task?.projectId || String(pId) === String(task.projectId)) {
      fetchMembers(task?.projectId);
    }
  });

  const handleViewAttachment = async (fileUrl, fileName, fileType = "") => {
    if (!fileUrl) return;
    const isImage =
      fileType.includes("image") ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName);
    const isPdf = fileType.includes("pdf") || /\.pdf$/i.test(fileName);

    if (!isImage && !isPdf) {
      toast.error(
        `Định dạng "${fileName}" không hỗ trợ xem trực tiếp. Hãy bấm tải xuống!`,
      );
      return;
    }

    const fullUrl = fileUrl.startsWith("http")
      ? fileUrl
      : `http://localhost:8085${fileUrl}`;
    const newTab = window.open("about:blank", "_blank");
    if (newTab) {
      newTab.document.write(
        '<div style="font-family: sans-serif; display: flex; height: 100vh; justify-content: center; align-items: center; color: #666;">Đang tải tệp xem trước...</div>',
      );
    }

    try {
      const res = await apiClient.get(fullUrl, { responseType: "blob" });
      const typedBlob = new Blob([res.data], {
        type: fileType || (isPdf ? "application/pdf" : "image/png"),
      });
      const blobUrl = window.URL.createObjectURL(typedBlob);
      if (newTab) newTab.location.href = blobUrl;
    } catch (err) {
      console.error("Lỗi xem file:", err);
      if (newTab) newTab.close();
      toast.error("Không thể xem tệp này trực tiếp!");
    }
  };

  const handleDownloadAttachment = async (fileUrl, fileName) => {
    if (!fileUrl) return;
    const fullUrl = fileUrl.startsWith("http")
      ? fileUrl
      : `http://localhost:8085${fileUrl}`;
    const downloadUrl = fullUrl.includes("?download=true")
      ? fullUrl
      : `${fullUrl}?download=true`;

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
    } catch (err) {
      console.error("Lỗi download:", err);
      toast.error("Tải tệp về máy thất bại!", { id: tid });
    }
  };

  const handleUpdateTaskField = async (field, value) => {
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
      emitEvent(EVENTS.TASK, {
        taskId,
        projectId: task?.projectId,
        task: updatedTask,
      });
      toast.success("Đã cập nhật công việc!");
    } catch (error) {
      console.error("Lỗi cập nhật task:", error);
      const msg = error.response?.data?.message || error.message || "Cập nhật thất bại!";
      toast.error(msg);
    }
  };

  const handleAddComment = async (e, parentId = null) => {
    if (e) e.preventDefault();
    const textToSend = parentId ? replyContent : newComment;
    if (!textToSend.trim() || !taskId) return;

    setIsPostingComment(true);
    try {
      await apiClient.post(
        `http://localhost:8085/api/tasks/${taskId}/comments`,
        {
          content: textToSend,
          parentCommentId: parentId,
        }
      );

      fetchComments();
      fetchActivities();
      if (parentId) {
        setReplyingToId(null);
        setReplyContent("");
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      } else {
        setNewComment("");
      }
      emitEvent(EVENTS.COMMENT, { taskId });
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
    } catch (error) {
      console.error("Lỗi khi thêm bình luận:", error);
      const msg = error.response?.data?.message || error.message || "Không thể gửi bình luận!";
      toast.error(msg);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) return;
    try {
      await apiClient.put(
        `http://localhost:8085/api/tasks/${taskId}/comments/${commentId}`,
        { content: editContent }
      );

      setEditingCommentId(null);
      setEditContent("");
      fetchComments();
      emitEvent(EVENTS.COMMENT, { taskId });
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
    } catch (error) {
      console.error("Lỗi sửa bình luận:", error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Bạn không có quyền sửa bình luận này!";
      toast.error(msg);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này không?")) return;
    try {
      await apiClient.delete(
        `http://localhost:8085/api/tasks/${taskId}/comments/${commentId}`
      );

      fetchComments();
      fetchActivities();
      emitEvent(EVENTS.COMMENT, { taskId });
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
      toast.success("Đã xóa bình luận!");
    } catch (error) {
      console.error("Lỗi xóa bình luận:", error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Bạn không có quyền xóa bình luận này!";
      toast.error(msg);
    }
  };

  const handleAddSubTask = async (e) => {
    e.preventDefault();
    if (!newSubTaskTitle.trim() || !taskId) return;
    try {
      await apiClient.post(
        `http://localhost:8085/api/tasks/${taskId}/sub-tasks`,
        {
          title: newSubTaskTitle,
          priority: "MEDIUM",
          projectId: task?.projectId,
        }
      );

      setNewSubTaskTitle("");
      setIsAddingSubTask(false);
      fetchTaskDetails();
      fetchActivities();
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
      toast.success("Đã tạo việc con!");
    } catch (error) {
      console.error("Lỗi thêm subtask:", error);
      const msg = error.response?.data?.message || error.message || "Không thể tạo việc con!";
      toast.error(msg);
    }
  };

  const handleToggleSubTask = async (subTaskId, currentStatus) => {
    const nextStatus = currentStatus === "DONE" ? "TO_DO" : "DONE";
    try {
      await apiClient.patch(
        `http://localhost:8085/api/tasks/${subTaskId}/status`,
        { status: nextStatus }
      );

      fetchTaskDetails();
      fetchActivities();
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
    } catch (error) {
      console.error("Lỗi cập nhật subtask:", error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Không thể cập nhật việc con!";
      toast.error(msg);
    }
  };

  const handleDeleteSubTask = async (subTaskId) => {
    try {
      await apiClient.delete(`http://localhost:8085/api/tasks/${subTaskId}`);
      fetchTaskDetails();
      fetchActivities();
      toast.success("Đã xóa việc con!");
    } catch (error) {
      console.error("Lỗi xóa subtask:", error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Không thể xóa việc con!";
      toast.error(msg);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa công việc này không?"))
      return;
    try {
      await apiClient.delete(`http://localhost:8085/api/tasks/${taskId}`);
      toast.success("Đã xóa công việc!");
      emitEvent(EVENTS.TASK, {
        taskId,
        projectId: task?.projectId,
        deleted: true,
      });
      if (onClose) onClose();
    } catch (error) {
      console.error("Lỗi xóa task:", error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Bạn không có quyền xóa công việc này!";
      toast.error(msg);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !taskId) return;

    const formData = new FormData();
    formData.append("file", file);
    setIsUploadingFile(true);
    const tid = toast.loading(`Đang tải lên ${file.name}...`);

    try {
      await apiClient.post(
        `http://localhost:8085/api/tasks/${taskId}/attachments`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      fetchAttachments();
      fetchActivities();
      emitEvent(EVENTS.ATTACHMENT, { taskId });
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
      toast.success("Đã tải tệp lên", { id: tid });
    } catch (error) {
      console.error("Lỗi upload file:", error);
      const msg = error.response?.data?.message || error.message || "Không thể tải tệp lên!";
      toast.error(msg, { id: tid });
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attId) => {
    try {
      await apiClient.delete(
        `http://localhost:8085/api/tasks/${taskId}/attachments/${attId}`
      );

      fetchAttachments();
      fetchActivities();
      emitEvent(EVENTS.ATTACHMENT, { taskId });
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
      toast.success("Đã xóa tệp đính kèm!");
    } catch (error) {
      console.error("Lỗi xóa file đính kèm:", error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Bạn không có quyền xóa tệp này!";
      toast.error(msg);
    }
  };

  const subTasksList = task?.subTasks || [];
  const completedSubTasksCount = subTasksList.filter(
    (st) => st.status === "DONE",
  ).length;
  const progressPercent =
    subTasksList.length > 0
      ? Math.round((completedSubTasksCount / subTasksList.length) * 100)
      : task?.status === "DONE" || task?.status === "COMPLETED"
        ? 100
        : task?.status === "IN_PROGRESS"
          ? 50
          : 0;

  if (!taskId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50/30 h-full">
        <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center text-indigo-400 mb-3">
          <LayoutGrid size={24} />
        </div>
        <h3 className="text-[14px] font-bold text-gray-800 mb-1">
          Chi tiết công việc
        </h3>
        <p className="text-[12px] text-gray-400 max-w-[210px] leading-relaxed">
          Chọn một task ở bảng Kanban để xem và quản lý thông tin chi tiết.
        </p>
      </div>
    );
  }

  const currentAssignee = members.find(
    (m) => String(m.userId || m.id) === String(task?.assigneeId),
  );
  const currentPriorityConfig =
    priorityLabels[task?.priority] || priorityLabels.DEFAULT;
  const currentStatusConfig =
    statusLabels[task?.status] || statusLabels.DEFAULT;

  return (
    <div
      className="flex flex-col h-full w-full relative bg-white font-sans"
      ref={containerRef}
    >
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
        </div>
      )}

      {/* Header Task */}
      <div className="px-5 pt-5 pb-2 shrink-0 bg-white">
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-[18px] font-bold text-gray-900 leading-snug pr-4">
            {task ? task.title : "Đang tải..."}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 bg-gray-50 p-1.5 rounded-md transition-colors shrink-0 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {task && (
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2 relative z-30">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === "priority" ? null : "priority",
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border flex items-center gap-2 cursor-pointer select-none transition-all shadow-2xs ${currentPriorityConfig.bg}`}
                >
                  <span>{currentPriorityConfig.label}</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${openDropdown === "priority" ? "rotate-180" : ""}`}
                  />
                </div>
                {openDropdown === "priority" && (
                  <div className="absolute left-0 top-full mt-1.5 w-36 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => {
                      const isSelected = (task.priority || "MEDIUM") === p;
                      const pItem = priorityLabels[p] || priorityLabels.DEFAULT;
                      return (
                        <div
                          key={p}
                          onClick={() => {
                            handleUpdateTaskField("priority", p);
                            setOpenDropdown(null);
                          }}
                          className={`px-3 py-2 text-[12px] cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-indigo-50 text-indigo-600 font-semibold"
                              : "text-gray-700 hover:bg-gray-50 font-medium"
                          }`}
                        >
                          <span>{pItem.label}</span>
                          {isSelected && (
                            <Check size={13} className="text-indigo-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="relative">
                <div
                  onClick={() =>
                    setOpenDropdown(openDropdown === "status" ? null : "status")
                  }
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border flex items-center gap-2 cursor-pointer select-none transition-all shadow-2xs ${currentStatusConfig.bg}`}
                >
                  <span>{currentStatusConfig.label}</span>
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 ${openDropdown === "status" ? "rotate-180" : ""}`}
                  />
                </div>
                {openDropdown === "status" && (
                  <div className="absolute left-0 top-full mt-1.5 w-38 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {["TO_DO", "IN_PROGRESS", "REVIEW", "DONE"].map((s) => {
                      const isSelected = (task.status || "TO_DO") === s;
                      const sItem = statusLabels[s] || statusLabels.DEFAULT;
                      return (
                        <div
                          key={s}
                          onClick={() => {
                            handleUpdateTaskField("status", s);
                            setOpenDropdown(null);
                          }}
                          className={`px-3 py-2 text-[12px] cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-indigo-50 text-indigo-600 font-semibold"
                              : "text-gray-700 hover:bg-gray-50 font-medium"
                          }`}
                        >
                          <span>{sItem.label}</span>
                          {isSelected && (
                            <Check size={13} className="text-indigo-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleDeleteTask}
              className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer"
              title="Xóa công việc"
            >
              <Trash2 size={14} /> Xóa
            </button>
          </div>
        )}

        {/* Tabs Nav */}
        <div className="flex border-b border-gray-200 gap-5">
          <button
            onClick={() => setActiveTab("details")}
            className={`text-[13px] font-medium pb-2.5 transition-colors relative cursor-pointer ${activeTab === "details" ? "text-indigo-600 font-bold border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-800"}`}
          >
            Chi tiết
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            className={`text-[13px] font-medium pb-2.5 flex items-center gap-1.5 transition-colors relative cursor-pointer ${activeTab === "comments" ? "text-indigo-600 font-bold border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-800"}`}
          >
            Bình luận{" "}
            <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {comments.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`text-[13px] font-medium pb-2.5 transition-colors relative cursor-pointer ${activeTab === "activity" ? "text-indigo-600 font-bold border-b-2 border-indigo-600" : "text-gray-500 hover:text-gray-800"}`}
          >
            Hoạt động
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-h-0 flex flex-col">
        {/* TAB 1: CHI TIẾT */}
        {activeTab === "details" && task && (
          <div className="flex flex-col">
            <div className="mb-6">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Mô tả
              </h3>
              <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">
                {task.description || "Chưa có mô tả cho công việc này."}
              </p>
            </div>

            <div className="flex flex-col gap-3.5 mb-7">
              <div className="grid grid-cols-[100px_1fr] items-center text-[12px] relative">
                <span className="text-gray-500 flex items-center gap-2">
                  <User size={14} /> Phụ trách
                </span>
                <div className="relative">
                  <div
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === "assignee" ? null : "assignee",
                      )
                    }
                    className="w-full max-w-[220px] bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] font-medium text-gray-800 flex items-center justify-between cursor-pointer hover:border-gray-300 shadow-2xs transition-all"
                  >
                    <span className="truncate">
                      {currentAssignee
                        ? currentAssignee.fullName ||
                          currentAssignee.username ||
                          currentAssignee.email
                        : "-- Chưa giao --"}
                    </span>
                    <ChevronDown
                      size={13}
                      className={`text-gray-400 shrink-0 transition-transform ${openDropdown === "assignee" ? "rotate-180" : ""}`}
                    />
                  </div>
                  {openDropdown === "assignee" && (
                    <div className="absolute left-0 top-full mt-1.5 w-full min-w-[220px] bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-50 max-h-48 overflow-y-auto">
                      <div
                        onClick={() => {
                          handleUpdateTaskField("assigneeId", null);
                          setOpenDropdown(null);
                        }}
                        className="px-3 py-2 text-[12px] text-gray-500 hover:bg-gray-50 cursor-pointer italic"
                      >
                        -- Chưa giao --
                      </div>
                      {members.map((m) => {
                        const mId = m.userId || m.id;
                        const isSelected =
                          String(task.assigneeId) === String(mId);
                        const mName = m.fullName || m.username || m.email;
                        return (
                          <div
                            key={mId}
                            onClick={() => {
                              handleUpdateTaskField("assigneeId", mId);
                              setOpenDropdown(null);
                            }}
                            className={`px-3 py-2 text-[12px] cursor-pointer flex items-center justify-between transition-colors ${isSelected ? "bg-indigo-50 text-indigo-600 font-semibold" : "text-gray-700 hover:bg-gray-50 font-medium"}`}
                          >
                            <span className="truncate">{mName}</span>
                            {isSelected && (
                              <Check size={13} className="text-indigo-600" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[100px_1fr] items-center text-[12px]">
                <span className="text-gray-500 flex items-center gap-2">
                  <User size={14} /> Người tạo
                </span>
                <div className="flex items-center gap-2 font-medium text-gray-800">
                  <div
                    className={`w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold uppercase ${getAvatarColor(task.reporterId)}`}
                  >
                    {task.reporterName ? task.reporterName.charAt(0) : "U"}
                  </div>
                  {task.reporterName || "Hệ thống"}
                </div>
              </div>

              <div className="grid grid-cols-[100px_1fr] items-center text-[12px]">
                <span className="text-gray-500 flex items-center gap-2">
                  <Calendar size={14} /> Deadline
                </span>
                <input
                  type="date"
                  value={task.dueDate || ""}
                  onChange={(e) =>
                    handleUpdateTaskField("dueDate", e.target.value)
                  }
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-gray-800 outline-none cursor-pointer w-fit focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-[100px_1fr] items-center text-[12px]">
                <span className="text-gray-500 flex items-center gap-2">
                  <GitMerge size={14} /> Tiến độ
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${progressPercent === 100 ? "bg-emerald-500" : "bg-indigo-600"}`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500">
                    {progressPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Subtasks */}
            <div className="mb-7">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Subtasks ({completedSubTasksCount}/{subTasksList.length})
                </h3>
                <button
                  onClick={() => setIsAddingSubTask(!isAddingSubTask)}
                  className="text-indigo-600 hover:text-indigo-700 text-[12px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Thêm
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {subTasksList.length > 0 ? (
                  subTasksList.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between text-[12.5px] p-1.5 rounded-lg hover:bg-gray-50 group"
                    >
                      <div
                        onClick={() => handleToggleSubTask(st.id, st.status)}
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                      >
                        {st.status === "DONE" || st.status === "COMPLETED" ? (
                          <CheckSquare
                            size={16}
                            className="text-indigo-600 shrink-0"
                          />
                        ) : (
                          <Square
                            size={16}
                            className="text-gray-300 shrink-0"
                          />
                        )}
                        <span
                          className={
                            st.status === "DONE" || st.status === "COMPLETED"
                              ? "text-gray-400 line-through"
                              : "text-gray-700 font-medium"
                          }
                        >
                          {st.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSubTask(st.id)}
                        className="text-gray-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-gray-400 italic">
                    Chưa có công việc con nào.
                  </p>
                )}

                {isAddingSubTask && (
                  <form
                    onSubmit={handleAddSubTask}
                    className="flex items-center gap-2 mt-2"
                  >
                    <input
                      type="text"
                      value={newSubTaskTitle}
                      onChange={(e) => setNewSubTaskTitle(e.target.value)}
                      placeholder="Nhập tên việc con..."
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer"
                    >
                      Lưu
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Tệp đính kèm */}
            <div className="pb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Tệp đính kèm ({attachments.length})
                </h3>
                <label className="text-indigo-600 hover:text-indigo-700 text-[12px] font-semibold flex items-center gap-1 cursor-pointer">
                  {isUploadingFile ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={14} /> Tải lên
                    </>
                  )}
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingFile}
                  />
                </label>
              </div>

              {attachments.length === 0 ? (
                <p className="text-[12px] text-gray-400 italic">
                  Không có tệp đính kèm nào.
                </p>
              ) : (
                attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex justify-between items-center p-2.5 rounded-lg border border-gray-100 bg-gray-50/30 mb-2 group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        onClick={() =>
                          handleViewAttachment(
                            att.fileUrl,
                            att.fileName,
                            att.fileType,
                          )
                        }
                        className="p-2 bg-indigo-50 text-indigo-500 rounded-md shrink-0 cursor-pointer hover:bg-indigo-100 transition-colors"
                        title="Xem tệp"
                      >
                        <FileText size={16} />
                      </div>
                      <div className="flex flex-col truncate">
                        <button
                          type="button"
                          onClick={() =>
                            handleViewAttachment(
                              att.fileUrl,
                              att.fileName,
                              att.fileType,
                            )
                          }
                          className="text-left text-[12px] font-semibold text-gray-800 hover:text-indigo-600 truncate cursor-pointer transition-colors"
                          title="Bấm để xem trực tiếp"
                        >
                          {att.fileName || "Tài liệu"}
                        </button>
                        <span className="text-[10px] text-gray-400">
                          {timeAgo(att.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadAttachment(att.fileUrl, att.fileName)
                        }
                        className="text-gray-400 hover:text-indigo-600 p-1 cursor-pointer"
                        title="Tải về máy"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                        title="Xóa tệp"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BÌNH LUẬN */}
        {activeTab === "comments" && (
          <div className="flex flex-col h-full justify-between">
            <div className="flex flex-col gap-4 mb-4 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-center text-xs text-gray-400 py-6">
                  Chưa có bình luận nào.
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
                    <div key={c.id} className="flex flex-col gap-2">
                      <div className="flex gap-2.5 bg-gray-50/80 p-3 rounded-xl border border-gray-100 group">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm ${getAvatarColor(c.userId)}`}
                        >
                          {c.userAvatar ||
                            (c.userName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[12px] font-bold text-gray-900 truncate">
                              {c.userName || "User"}
                            </span>
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {timeAgo(c.createdAt)}
                            </span>
                          </div>
                          {isEditingParent ? (
                            <div className="flex flex-col gap-2 mt-1">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-[12px] outline-none focus:border-indigo-500"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditingCommentId(null)}
                                  className="text-xs text-gray-500 px-2 py-1 cursor-pointer"
                                >
                                  Hủy
                                </button>
                                <button
                                  onClick={() => handleUpdateComment(c.id)}
                                  className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-md cursor-pointer"
                                >
                                  Lưu
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="text-[12.5px] text-gray-700 leading-relaxed whitespace-pre-line break-words">
                                {c.content}
                              </p>
                              {isEdited && (
                                <span className="text-[9.5px] text-gray-400 italic mt-0.5 block">
                                  Đã chỉnh sửa
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 font-medium">
                            <button
                              onClick={() => {
                                setReplyingToId(isReplying ? null : c.id);
                                setReplyContent("");
                              }}
                              className="hover:text-indigo-600 cursor-pointer"
                            >
                              Phản hồi
                            </button>
                            <button
                              onClick={() => {
                                setEditingCommentId(c.id);
                                setEditContent(c.content);
                              }}
                              className="hover:text-blue-600 cursor-pointer"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="hover:text-red-600 cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>

                      {hasReplies && (
                        <div className="ml-9">
                          <button
                            onClick={() =>
                              setExpandedReplies((prev) => ({
                                ...prev,
                                [c.id]: !isExpanded,
                              }))
                            }
                            className="text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 cursor-pointer bg-indigo-50/50 hover:bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <span className="w-3 h-px bg-indigo-400"></span>
                            {isExpanded
                              ? `Ẩn câu trả lời (${c.replies.length})`
                              : `Xem ${c.replies.length} câu trả lời`}
                          </button>
                        </div>
                      )}

                      {isReplying && (
                        <div className="ml-9 flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder={`Phản hồi ${c.userName || "thành viên"}...`}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-indigo-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleAddComment(null, c.id)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer"
                          >
                            Gửi
                          </button>
                          <button
                            onClick={() => setReplyingToId(null)}
                            className="text-gray-400 text-xs px-1 cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>
                      )}

                      {isExpanded && hasReplies && (
                        <div className="ml-8 pl-3 border-l-2 border-indigo-100 flex flex-col gap-2.5 mt-1">
                          {c.replies.map((r) => {
                            const isEditingChild = editingCommentId === r.id;
                            const isChildEdited =
                              r.updateDate &&
                              r.createdAt &&
                              new Date(r.updateDate) > new Date(r.createdAt);
                            return (
                              <div
                                key={r.id}
                                className="flex gap-2.5 bg-white p-2.5 rounded-xl border border-gray-100 shadow-2xs"
                              >
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${getAvatarColor(r.userId)}`}
                                >
                                  {r.userAvatar ||
                                    (r.userName || "U").charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-0.5">
                                    <span className="text-[11.5px] font-bold text-gray-900 truncate">
                                      {r.userName || "User"}
                                    </span>
                                    <span className="text-[9.5px] text-gray-400 shrink-0">
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
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-[11.5px] outline-none focus:border-indigo-500"
                                      />
                                      <div className="flex gap-2 justify-end">
                                        <button
                                          onClick={() =>
                                            setEditingCommentId(null)
                                          }
                                          className="text-[11px] text-gray-500 px-2 py-0.5 cursor-pointer"
                                        >
                                          Hủy
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleUpdateComment(r.id)
                                          }
                                          className="text-[11px] bg-indigo-600 text-white px-2.5 py-0.5 rounded-md cursor-pointer"
                                        >
                                          Lưu
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-line break-words">
                                        {r.content}
                                      </p>
                                      {isChildEdited && (
                                        <span className="text-[9px] text-gray-400 italic mt-0.5 block">
                                          Đã chỉnh sửa
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-3 mt-1.5 text-[10.5px] text-gray-500 font-medium">
                                    <button
                                      onClick={() => {
                                        setEditingCommentId(r.id);
                                        setEditContent(r.content);
                                      }}
                                      className="hover:text-blue-600 cursor-pointer"
                                    >
                                      Sửa
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(r.id)}
                                      className="hover:text-red-600 cursor-pointer"
                                    >
                                      Xóa
                                    </button>
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

            <form
              onSubmit={(e) => handleAddComment(e, null)}
              className="mt-auto pt-2 border-t border-gray-100 flex items-center gap-2"
            >
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Viết bình luận..."
                disabled={isPostingComment}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isPostingComment || !newComment.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white p-2 rounded-lg transition-colors cursor-pointer"
              >
                {isPostingComment ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: HOẠT ĐỘNG */}
        {activeTab === "activity" && (
          <div className="flex flex-col gap-3 text-[12px]">
            {activities.length === 0 ? (
              <div className="text-center text-xs text-gray-400 py-6">
                Chưa có lịch sử hoạt động.
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-2.5 text-gray-600 pb-3 border-b border-gray-100"
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
                  <div>
                    <span className="font-semibold text-gray-800">
                      {act.user || "Hệ thống"}
                    </span>{" "}
                    {act.action}{" "}
                    <span className="font-medium text-indigo-600">
                      {act.targetName || act.target}
                    </span>
                    <span className="text-gray-400 text-[11px] block mt-0.5">
                      {act.date} lúc {act.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectRight;