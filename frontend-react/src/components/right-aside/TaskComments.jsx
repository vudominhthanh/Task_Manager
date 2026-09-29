import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../utils/apiClient";
import toast from "react-hot-toast";
import { Send, Loader2 } from "lucide-react";
import { emitEvent, EVENTS, useEvent } from "../../hooks/useEventBus";

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

const TaskComments = ({ taskId, projectId, permissions, currentUserId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [replyingToId, setReplyingToId] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({});

  // ==== Preferences ====
  const { accent } = usePreferences();
  const A = getAccent(accent);

  const fetchComments = useCallback(async () => {
    if (!taskId) return;
    try {
      const cmtRes = await apiClient.get(`http://localhost:8085/api/tasks/${taskId}/comments`);
      setComments(cmtRes.data || []);
    } catch (err) { console.error("Lỗi fetch comments:", err); }
  }, [taskId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  useEvent(EVENTS.COMMENT, (data) => {
    if (String(data?.taskId) === String(taskId)) fetchComments();
  });

  const handleAddComment = async (e, parentId = null) => {
    if (e) e.preventDefault();
    if (!permissions.canCreateComment) return toast.error("Bạn không có quyền bình luận!");
    const textToSend = parentId ? replyContent : newComment;
    if (!textToSend.trim() || !taskId) return;
    setIsPostingComment(true);
    try {
      await apiClient.post(`http://localhost:8085/api/tasks/${taskId}/comments`, { content: textToSend, parentCommentId: parentId });
      if (parentId) {
        setReplyingToId(null);
        setReplyContent("");
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      } else {
        setNewComment("");
      }
      emitEvent(EVENTS.COMMENT, { taskId });
      emitEvent(EVENTS.TASK, { taskId, projectId });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể gửi bình luận!");
    } finally { setIsPostingComment(false); }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editContent.trim()) return;
    try {
      await apiClient.put(`http://localhost:8085/api/tasks/${taskId}/comments/${commentId}`, { content: editContent });
      setEditingCommentId(null);
      setEditContent("");
      emitEvent(EVENTS.COMMENT, { taskId });
      emitEvent(EVENTS.TASK, { taskId, projectId });
    } catch (error) { toast.error(error.response?.data?.message || "Bạn không có quyền sửa bình luận này!"); }
  };

  const handleDeleteComment = async (commentId, cUserId) => {
    if (!permissions.canDeleteAnyComment && (!permissions.canDeleteOwnComment || currentUserId !== cUserId)) {
      return toast.error("Bạn không có quyền xóa bình luận này!");
    }
    if (!window.confirm("Bạn có chắc muốn xóa bình luận này không?")) return;
    try {
      await apiClient.delete(`http://localhost:8085/api/tasks/${taskId}/comments/${commentId}`);
      emitEvent(EVENTS.COMMENT, { taskId });
      emitEvent(EVENTS.TASK, { taskId, projectId });
      toast.success("Đã xóa bình luận!");
    } catch (error) { toast.error(error.response?.data?.message || "Bạn không có quyền xóa bình luận này!"); }
  };

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex flex-col gap-4 mb-4 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-6">
            Chưa có bình luận nào.
          </div>
        ) : (
          comments.map((c) => {
            const isEditingParent = editingCommentId === c.id;
            const isReplying = replyingToId === c.id;
            const isExpanded = expandedReplies[c.id] || false;
            const hasReplies = c.replies && c.replies.length > 0;
            const isEdited = c.updateDate && c.createdAt && new Date(c.updateDate) > new Date(c.createdAt);

            return (
              <div key={c.id} className="flex flex-col gap-2">
                <div className="flex gap-2.5 bg-gray-50/80 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700 group transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm ${getAvatarColor(c.userId)}`}>
                    {c.userAvatar || (c.userName || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[12px] font-bold text-gray-900 dark:text-white truncate">
                        {c.userName || "User"}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    {isEditingParent ? (
                      <div className="flex flex-col gap-2 mt-1">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className={`w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg p-2 text-[12px] outline-none focus:ring-2 ${A.ring}`}
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                            Hủy
                          </button>
                          <button onClick={() => handleUpdateComment(c.id)} className={`text-xs text-white px-3 py-1 rounded-md cursor-pointer ${A.solidBg}`}>
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
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                      {permissions.canCreateComment && (
                        <button
                          onClick={() => { setReplyingToId(isReplying ? null : c.id); setReplyContent(""); }}
                          className={`cursor-pointer ${A.textHover}`}
                        >
                          Phản hồi
                        </button>
                      )}
                      {permissions.canUpdateOwnComment && currentUserId === c.userId && (
                        <button
                          onClick={() => { setEditingCommentId(c.id); setEditContent(c.content); }}
                          className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                        >
                          Sửa
                        </button>
                      )}
                      {(permissions.canDeleteAnyComment || (permissions.canDeleteOwnComment && currentUserId === c.userId)) && (
                        <button
                          onClick={() => handleDeleteComment(c.id, c.userId)}
                          className="hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {hasReplies && (
                  <div className="ml-9">
                    <button
                      onClick={() => setExpandedReplies((prev) => ({ ...prev, [c.id]: !isExpanded }))}
                      className={`text-[11.5px] font-semibold flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg transition-colors ${A.text} ${A.softBg} ${A.softHoverBg}`}
                    >
                      <span className={`w-3 h-px ${A.bgOnly}`}></span>
                      {isExpanded ? `Ẩn câu trả lời (${c.replies.length})` : `Xem ${c.replies.length} câu trả lời`}
                    </button>
                  </div>
                )}

                {isReplying && permissions.canCreateComment && (
                  <div className="ml-9 flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={`Phản hồi ${c.userName || "thành viên"}...`}
                      className={`flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:ring-2 ${A.ring}`}
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddComment(null, c.id)}
                      className={`text-white px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer ${A.solidBg}`}
                    >
                      Gửi
                    </button>
                    <button onClick={() => setReplyingToId(null)} className="text-gray-400 dark:text-gray-500 text-xs px-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded py-1.5">
                      Hủy
                    </button>
                  </div>
                )}

                {isExpanded && hasReplies && (
                  <div className={`ml-8 pl-3 border-l-2 ${A.border} flex flex-col gap-2.5 mt-1`}>
                    {c.replies.map((r) => {
                      const isEditingChild = editingCommentId === r.id;
                      const isChildEdited = r.updateDate && r.createdAt && new Date(r.updateDate) > new Date(r.createdAt);
                      return (
                        <div key={r.id} className="flex gap-2.5 bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${getAvatarColor(r.userId)}`}>
                            {r.userAvatar || (r.userName || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[11.5px] font-bold text-gray-900 dark:text-white truncate">
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
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className={`w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg p-1.5 text-[11.5px] outline-none focus:ring-2 ${A.ring}`}
                                />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => setEditingCommentId(null)} className="text-[11px] text-gray-500 dark:text-gray-400 px-2 py-0.5 cursor-pointer">
                                    Hủy
                                  </button>
                                  <button onClick={() => handleUpdateComment(r.id)} className={`text-[11px] text-white px-2.5 py-0.5 rounded-md cursor-pointer ${A.solidBg}`}>
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
                              {permissions.canUpdateOwnComment && currentUserId === r.userId && (
                                <button
                                  onClick={() => { setEditingCommentId(r.id); setEditContent(r.content); }}
                                  className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                                >
                                  Sửa
                                </button>
                              )}
                              {(permissions.canDeleteAnyComment || (permissions.canDeleteOwnComment && currentUserId === r.userId)) && (
                                <button
                                  onClick={() => handleDeleteComment(r.id, r.userId)}
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

      {permissions.canCreateComment ? (
        <form onSubmit={(e) => handleAddComment(e, null)} className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Viết bình luận..."
            disabled={isPostingComment}
            className={`flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-2 ${A.ring}`}
          />
          <button
            type="submit"
            disabled={isPostingComment || !newComment.trim()}
            className={`text-white p-2 rounded-lg transition-colors cursor-pointer ${A.solidBg} disabled:opacity-50`}
          >
            {isPostingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      ) : (
        <div className="mt-auto pt-2 text-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg border border-amber-100 dark:border-amber-500/20">
          Bạn không có quyền đăng bình luận.
        </div>
      )}
    </div>
  );
};

export default TaskComments;