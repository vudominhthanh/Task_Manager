import React, { useState, useEffect, useCallback } from "react";
import { useEvent, emitEvent, EVENTS } from "../../hooks/useEventBus";
import {
  X,
  User,
  Calendar,
  GitMerge,
  Send,
  Loader2,
  LayoutGrid,
  Trash2,
  CheckSquare,
  Square,
  Plus,
  FileText,
  Download,
} from "lucide-react";

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

  const getToken = () => localStorage.getItem("accessToken") || "";

  const fetchMembers = useCallback(async (projId) => {
    const targetProjectId = projId || task?.projectId;
    if (!targetProjectId) return;
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      const memRes = await fetch(
        `http://localhost:8083/api/projects/${targetProjectId}/members`,
        { headers },
      );
      if (memRes.ok) setMembers(await memRes.json());
    } catch (err) {
      console.error("Lỗi fetch members:", err);
    }
  }, [task?.projectId]);

  const fetchTaskDetails = useCallback(async () => {
    if (!taskId) return;
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      const taskRes = await fetch(`http://localhost:8085/api/tasks/${taskId}`, {
        headers,
      });
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        setTask(taskData);
        if (taskData.projectId) {
          fetchMembers(taskData.projectId);
        }
      }
    } catch (err) {
      console.error("Lỗi fetch task:", err);
    }
  }, [taskId, fetchMembers]);

  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      const cmtRes = await fetch(
        `http://localhost:8085/api/tasks/${taskId}/comments`,
        { headers },
      );
      if (cmtRes.ok) {
        const cmtData = await cmtRes.json();
        setComments(cmtData); // Giữ nguyên data chuẩn tree có replies từ Backend
      }
    } catch (err) {
      console.error("Lỗi fetch comments:", err);
    }
  }, [taskId]);

  const fetchAttachments = useCallback(async () => {
    if (!taskId) return;
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      const attachRes = await fetch(
        `http://localhost:8085/api/tasks/${taskId}/attachments`,
        { headers },
      );
      if (attachRes.ok) setAttachments(await attachRes.json());
    } catch (err) {
      console.error("Lỗi fetch attachments:", err);
    }
  }, [taskId]);

  const fetchActivities = useCallback(async () => {
    if (!taskId) return;
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      const actRes = await fetch(
        `http://localhost:8081/api/activities/task/${taskId}`,
        { headers },
      );
      if (actRes.ok) setActivities(await actRes.json());
    } catch (err) {
      console.error("Lỗi fetch activities:", err);
    }
  }, [taskId]);

  // Load ban đầu khi mở taskId
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
    const targetId = eventData?.payload?.task?.id || eventData?.payload?.id || eventData?.payload?.taskId;
    if (!targetId || targetId === taskId) {
      fetchTaskDetails();
      fetchActivities();
    }
  });

  useEvent(EVENTS.COMMENT, () => {
    fetchComments();
    fetchActivities();
  });

  useEvent(EVENTS.ATTACHMENT, () => {
    fetchAttachments();
    fetchActivities();
  });

  useEvent(EVENTS.MEMBER, () => {
    fetchMembers();
  });

  const handleUpdateTaskField = async (field, value) => {
  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    };

    const endpoint =
      field === "status"
        ? `http://localhost:8085/api/tasks/${taskId}/status`
        : `http://localhost:8085/api/tasks/${taskId}`;

    const bodyData =
      field === "status" ? { status: value } : { [field]: value };

    const res = await fetch(endpoint, {
      method: field === "status" ? "PATCH" : "PUT",
      headers,
      body: JSON.stringify(bodyData),
    });

    if (res.ok) {
      const updatedTask = await res.json();
      setTask((prev) => ({ ...prev, ...updatedTask }));
      fetchActivities();

      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId, task: updatedTask });
    } else {
      const errorData = await res.json().catch(() => ({}));
      alert(errorData.message || "Cập nhật thất bại!");
    }
  } catch (error) {
    console.error("Lỗi cập nhật task:", error);
  }
};

  const handleAddComment = async (e, parentId = null) => {
    if (e) e.preventDefault();
    const textToSend = parentId ? replyContent : newComment;
    if (!textToSend.trim() || !taskId) return;

    setIsPostingComment(true);
    try {
      const res = await fetch(
        `http://localhost:8085/api/tasks/${taskId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            content: textToSend,
            parentCommentId: parentId,
          }),
        },
      );

      if (res.ok) {
        fetchComments();
        fetchActivities();
        if (parentId) {
          setReplyingToId(null);
          setReplyContent("");
          setExpandedReplies((prev) => ({ ...prev, [parentId]: true })); 
        emitEvent(EVENTS.COMMENT, { taskId }); // 🔥
        emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
        } else {
          setNewComment("");
        }
      }
    } catch (error) {
      console.error("Lỗi khi thêm bình luận:", error);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) return;
    try {
      const res = await fetch(
        `http://localhost:8085/api/tasks/${taskId}/comments/${commentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ content: editContent }),
        },
      );

      if (res.ok) {
        setEditingCommentId(null);
        setEditContent("");
        fetchComments();
        emitEvent(EVENTS.COMMENT, { taskId }); 
        emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
      } else {
        alert("Không thể chỉnh sửa bình luận này.");
      }
    } catch (error) {
      console.error("Lỗi khi sửa bình luận:", error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này không?")) return;
    try {
      const res = await fetch(
        `http://localhost:8085/api/tasks/${taskId}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );
      if (res.ok || res.status === 204) {
        fetchComments();
        fetchActivities();
        emitEvent(EVENTS.COMMENT, { taskId }); 
        emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
      }
    } catch (error) {
      console.error("Lỗi xóa bình luận:", error);
    }
  };

  const handleAddSubTask = async (e) => {
    e.preventDefault();
    if (!newSubTaskTitle.trim() || !taskId) return;

    try {
      const res = await fetch(
        `http://localhost:8085/api/tasks/${taskId}/sub-tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            title: newSubTaskTitle,
            priority: "MEDIUM",
            projectId: task.projectId,
          }),
        },
      );

     if (res.ok) {
      setNewSubTaskTitle("");
      setIsAddingSubTask(false);
      fetchTaskDetails();
      fetchActivities();
      emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
    }
    } catch (error) {
      console.error("Lỗi khi thêm subtask:", error);
    }
  };

  const handleToggleSubTask = async (subTaskId, currentStatus) => {
    const nextStatus = currentStatus === "DONE" ? "TO_DO" : "DONE";
    try {
      const res = await fetch(
        `http://localhost:8085/api/tasks/${subTaskId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (res.ok) {
        fetchTaskDetails();
        fetchActivities();
        emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId }); 
      }
    } catch (error) {
      console.error("Lỗi cập nhật subtask:", error);
    }
  };

  const handleDeleteSubTask = async (subTaskId) => {
    try {
      const res = await fetch(`http://localhost:8085/api/tasks/${subTaskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (res.ok || res.status === 204) {
        fetchTaskDetails();
        fetchActivities();
      }
    } catch (error) {
      console.error("Lỗi xóa subtask:", error);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa công việc này không?"))
      return;

    try {
      const res = await fetch(`http://localhost:8085/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (res.ok || res.status === 204) {
        fetchTaskDetails();
        fetchActivities();
        emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId, deleted: true });
      } else {
        alert("Không thể xóa công việc này.");
      }
    } catch (error) {
      console.error("Lỗi khi xóa task:", error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !taskId) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploadingFile(true);
    try {
      const res = await fetch(
        `http://localhost:8085/api/tasks/${taskId}/attachments`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        },
      );

      if (res.ok) {
        fetchAttachments();
        fetchActivities();
        emitEvent(EVENTS.ATTACHMENT, { taskId }); 
        emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
      }
    } catch (error) {
      console.error("Lỗi upload file:", error);
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attId) => {
    try {
      const res = await fetch(
        `http://localhost:8085/api/tasks/${taskId}/attachments/${attId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );

      if (res.ok) {
        fetchAttachments();
        fetchActivities();
        emitEvent(EVENTS.ATTACHMENT, { taskId }); 
        emitEvent(EVENTS.TASK, { taskId, projectId: task?.projectId });
      }
    } catch (error) {
      console.error("Lỗi xóa file đính kèm:", error);
    }
  };

  const subTasksList = task?.subTasks || [];
  const completedSubTasksCount = subTasksList.filter(
    (st) => st.status === "DONE",
  ).length;
  const progressPercent =
    subTasksList.length > 0
      ? Math.round((completedSubTasksCount / subTasksList.length) * 100)
      : task?.status === "DONE"
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

  return (
    <div className="flex flex-col h-full w-full relative bg-white">
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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {/* Đổi Priority */}
              <select
                value={task.priority || "MEDIUM"}
                onChange={(e) =>
                  handleUpdateTaskField("priority", e.target.value)
                }
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer border border-transparent ${
                  task.priority === "URGENT"
                    ? "bg-red-100 text-red-700"
                    : task.priority === "HIGH"
                      ? "bg-red-50 text-red-600"
                      : task.priority === "MEDIUM"
                        ? "bg-orange-50 text-orange-600"
                        : "bg-green-50 text-green-600"
                }`}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>

              {/* Đổi Status */}
              <select
                value={task.status || "TO_DO"}
                onChange={(e) =>
                  handleUpdateTaskField("status", e.target.value)
                }
                className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-md text-[12px] font-semibold outline-none cursor-pointer border border-indigo-100"
              >
                <option value="TO_DO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <button
              onClick={handleDeleteTask}
              className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded-md text-[12px] font-semibold transition-colors cursor-pointer"
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
            className={`text-[13px] font-medium pb-2.5 transition-colors relative cursor-pointer ${
              activeTab === "details"
                ? "text-indigo-600 font-bold border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Chi tiết
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            className={`text-[13px] font-medium pb-2.5 flex items-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === "comments"
                ? "text-indigo-600 font-bold border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Bình luận{" "}
            <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              {comments.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`text-[13px] font-medium pb-2.5 transition-colors relative cursor-pointer ${
              activeTab === "activity"
                ? "text-indigo-600 font-bold border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Hoạt động
          </button>
        </div>
      </div>

      {/* Nội dung Tab */}
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
              <div className="grid grid-cols-[100px_1fr] items-center text-[12px]">
                <span className="text-gray-500 flex items-center gap-2">
                  <User size={14} /> Phụ trách
                </span>
                <select
                  value={task.assigneeId || ""}
                  onChange={(e) =>
                    handleUpdateTaskField("assigneeId", e.target.value)
                  }
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[12px] font-medium text-gray-800 outline-none cursor-pointer"
                >
                  <option value="">-- Chưa giao --</option>
                  {members.map((m) => (
                    <option key={m.userId || m.id} value={m.userId || m.id}>
                      {m.fullName || m.username || m.email}
                    </option>
                  ))}
                </select>
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
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[12px] font-medium text-gray-800 outline-none cursor-pointer w-fit"
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
                        {st.status === "DONE" ? (
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
                            st.status === "DONE"
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
                      <div className="p-2 bg-indigo-50 text-indigo-500 rounded-md shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-[12px] font-semibold text-gray-800 truncate">
                          {att.fileName || "Tài liệu"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {timeAgo(att.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-400 hover:text-indigo-600 p-1"
                      >
                        <Download size={15} />
                      </a>
                      <button
                        onClick={() => handleDeleteAttachment(att.id)}
                        className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
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

        {/* TAB 2: BÌNH LUẬN PHÂN CẤP */}
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
                      {/* COMMENT CHA */}
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

                      {/* NÚT ẨN / HIỆN COMMENT CON */}
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

                      {/* KHUNG TRẢ LỜI */}
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

                      {/* COMMENT CON */}
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

            {/* Form gửi bình luận gốc */}
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
