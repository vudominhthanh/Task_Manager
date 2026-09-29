import React, { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "../../utils/apiClient";
import toast from "react-hot-toast";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { emitEvent, EVENTS, useEvent } from "../../hooks/useEventBus";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent, getDensity } from "../../utils/preferenceTokens";

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

const ProjectChat = ({ projectId, currentUser }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newMessage, setNewMessage] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const [replyingToId, setReplyingToId] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({});

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState("");

  const chatEndRef = useRef(null);

  // ==== Preferences ====
  const { accent, density } = usePreferences();
  const A = getAccent(accent);

  const fetchChats = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8085/api/projects/${projectId}/chats`);
      setChats(res.data || []);
    } catch (err) {
      console.error("Lỗi fetch project chats:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    fetchChats();
  }, [fetchChats]);

  useEvent(EVENTS.COMMENT, (data) => {
    if (String(data?.projectId) === String(projectId) && !data?.taskId) {
      fetchChats();
    }
  });

  useEffect(() => {
    if (chatEndRef.current && !replyingToId && !editingCommentId) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chats, replyingToId, editingCommentId]);

  const handleAddChat = async (e, parentId = null) => {
    if (e) e.preventDefault();
    const textToSend = parentId ? replyContent : newMessage;
    if (!textToSend.trim() || !projectId) return;

    setIsPosting(true);
    try {
      await apiClient.post(`http://localhost:8085/api/projects/${projectId}/chats`, {
        content: textToSend,
        parentCommentId: parentId,
      });

      if (parentId) {
        setReplyingToId(null);
        setReplyContent("");
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      } else {
        setNewMessage("");
      }

      fetchChats();
      emitEvent(EVENTS.COMMENT, { projectId });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể gửi tin nhắn!");
    } finally {
      setIsPosting(false);
    }
  };

  const handleUpdateChat = async (chatId) => {
    if (!editContent.trim()) return;
    try {
      await apiClient.put(`http://localhost:8085/api/projects/${projectId}/chats/${chatId}`, {
        content: editContent,
      });
      setEditingCommentId(null);
      setEditContent("");
      fetchChats();
      emitEvent(EVENTS.COMMENT, { projectId });
    } catch (error) {
      toast.error(error.response?.data?.message || "Bạn không có quyền sửa tin nhắn này!");
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!window.confirm("Bạn có chắc muốn xóa tin nhắn này không?")) return;
    try {
      await apiClient.delete(`http://localhost:8085/api/projects/${projectId}/chats/${chatId}`);
      fetchChats();
      emitEvent(EVENTS.COMMENT, { projectId });
      toast.success("Đã xóa tin nhắn!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Bạn không có quyền xóa tin nhắn này!");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/30 dark:bg-gray-800/30 transition-colors">
        <Loader2 className={`animate-spin ${A.text}`} size={28} />
      </div>
    );
  }

  const currentUserId = String(currentUser?.id || currentUser?.userId || "");

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 relative transition-colors duration-300">

      {/* HEADER */}
      <div className={`px-5 ${density === "compact" ? "py-3" : "py-4"} border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 flex items-center gap-3 transition-colors`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${A.softBg} ${A.border} border ${A.icon}`}>
          <MessageSquare size={20} />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">
            Thảo luận dự án
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
            Kênh chat chung của tất cả thành viên
          </p>
        </div>
      </div>

      {/* DANH SÁCH TIN NHẮN */}
      <div className={`flex-1 overflow-y-auto p-4 ${density === "compact" ? "space-y-4" : "space-y-6"} bg-gray-50/30 dark:bg-gray-900/40 [scrollbar-width:thin] transition-colors`}>
        {chats.length === 0 ? (
          <div className="text-center text-[12px] text-gray-400 dark:text-gray-500 py-10 italic">
            Chưa có đoạn hội thoại nào. Hãy là người bắt đầu!
          </div>
        ) : (
          chats.map((chat) => {
            const isMe = String(chat.userId) === currentUserId;
            const isEditingParent = editingCommentId === chat.id;
            const isReplying = replyingToId === chat.id;
            const isExpanded = expandedReplies[chat.id] || false;
            const hasReplies = chat.replies && chat.replies.length > 0;
            const isEdited = chat.updateDate && chat.createdAt && new Date(chat.updateDate) > new Date(chat.createdAt);

            return (
              <div key={chat.id} className="flex flex-col gap-1.5 w-full">

                {/* BONG BÓNG CHAT GỐC */}
                <div className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-sm ${getAvatarColor(chat.userId)}`}>
                    {chat.userAvatar || (chat.userName || "U").charAt(0).toUpperCase()}
                  </div>

                  <div className={`flex flex-col max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                        {chat.userName || "User"}
                      </span>
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                        {timeAgo(chat.createdAt)}
                      </span>
                    </div>

                    {isEditingParent ? (
                      <div className="flex flex-col gap-2 mt-1 w-[280px] max-w-full">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className={`w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg p-2.5 text-[13px] outline-none focus:ring-2 ${A.ring} shadow-sm`}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={() => handleUpdateChat(chat.id)}
                            className={`text-xs text-white px-3 py-1 rounded-md cursor-pointer transition-colors ${A.solidBg}`}
                          >
                            Lưu
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words shadow-sm transition-colors ${
                          isMe
                            ? `${A.solidBg.split(" ")[0]} text-white rounded-tr-sm`
                            : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 text-gray-800 dark:text-gray-100 rounded-tl-sm"
                        }`}
                      >
                        {chat.content}
                      </div>
                    )}
                    {isEdited && !isEditingParent && (
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 italic mt-1 block">
                        Đã chỉnh sửa
                      </span>
                    )}

                    {/* Nút hành động */}
                    <div className={`flex items-center gap-3 mt-1.5 text-[10.5px] text-gray-500 dark:text-gray-400 font-medium ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                      <button
                        onClick={() => { setReplyingToId(isReplying ? null : chat.id); setReplyContent(""); }}
                        className={`cursor-pointer transition-colors ${A.textHover}`}
                      >
                        Phản hồi
                      </button>
                      {isMe && (
                        <button
                          onClick={() => { setEditingCommentId(chat.id); setEditContent(chat.content); }}
                          className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                        >
                          Sửa
                        </button>
                      )}
                      {isMe && (
                        <button
                          onClick={() => handleDeleteChat(chat.id)}
                          className="hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* NÚT XEM PHẢN HỒI CON */}
                {hasReplies && (
                  <div className={`${isMe ? "mr-11 text-right" : "ml-11 text-left"}`}>
                    <button
                      onClick={() => setExpandedReplies((prev) => ({ ...prev, [chat.id]: !isExpanded }))}
                      className={`text-[11.5px] font-semibold flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg transition-colors inline-flex ${A.text} ${A.softBg} ${A.softHoverBg}`}
                    >
                      <span className={`w-3 h-px ${A.bgOnly}`}></span>
                      {isExpanded ? `Ẩn câu trả lời (${chat.replies.length})` : `Xem ${chat.replies.length} câu trả lời`}
                    </button>
                  </div>
                )}

                {/* FORM NHẬP REPLY */}
                {isReplying && (
                  <div className={`flex items-center gap-2 mt-1 ${isMe ? "mr-11 justify-end" : "ml-11 justify-start"}`}>
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={`Phản hồi ${chat.userName || "thành viên"}...`}
                      className={`w-[200px] sm:w-[280px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3.5 py-2 text-[12.5px] focus:outline-none focus:ring-2 ${A.ring} shadow-sm transition-colors`}
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddChat(null, chat.id)}
                      className={`text-white px-3 py-2 rounded-xl text-[12px] font-medium cursor-pointer transition-colors shadow-sm ${A.solidBg}`}
                    >
                      Gửi
                    </button>
                    <button
                      onClick={() => setReplyingToId(null)}
                      className="text-gray-400 dark:text-gray-500 text-xs px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg py-2 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                )}

                {/* DANH SÁCH PHẢN HỒI CON */}
                {isExpanded && hasReplies && (
                  <div className={`flex flex-col gap-3 mt-2 ${isMe ? `mr-11 pr-3 border-r-2 ${A.border} items-end` : `ml-11 pl-3 border-l-2 ${A.border} items-start`}`}>
                    {chat.replies.map((r) => {
                      const isChildMe = String(r.userId) === currentUserId;
                      const isEditingChild = editingCommentId === r.id;
                      const isChildEdited = r.updateDate && r.createdAt && new Date(r.updateDate) > new Date(r.createdAt);

                      return (
                        <div key={r.id} className={`flex gap-2 max-w-[95%] ${isChildMe ? "flex-row-reverse" : "flex-row"}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 shadow-sm mt-1 ${getAvatarColor(r.userId)}`}>
                            {r.userAvatar || (r.userName || "U").charAt(0).toUpperCase()}
                          </div>

                          <div className={`flex flex-col ${isChildMe ? "items-end" : "items-start"}`}>
                            <div className={`flex items-center gap-2 mb-0.5 ${isChildMe ? "flex-row-reverse" : "flex-row"}`}>
                              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                                {r.userName || "User"}
                              </span>
                              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                                {timeAgo(r.createdAt)}
                              </span>
                            </div>

                            {isEditingChild ? (
                              <div className="flex flex-col gap-1.5 mt-1 w-[240px]">
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className={`w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-lg p-2 text-[12px] outline-none focus:ring-2 ${A.ring} shadow-sm`}
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => setEditingCommentId(null)}
                                    className="text-[11px] text-gray-500 dark:text-gray-400 px-2 py-0.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                  >
                                    Hủy
                                  </button>
                                  <button
                                    onClick={() => handleUpdateChat(r.id)}
                                    className={`text-[11px] text-white px-2.5 py-1 rounded-md cursor-pointer transition-colors ${A.solidBg}`}
                                  >
                                    Lưu
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`px-3.5 py-2 rounded-2xl text-[12.5px] leading-relaxed break-words shadow-sm transition-colors ${
                                  isChildMe
                                    ? `${A.solidBg.split(" ")[0]} text-white rounded-tr-sm`
                                    : "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 text-gray-800 dark:text-gray-100 rounded-tl-sm"
                                }`}
                              >
                                {r.content}
                              </div>
                            )}
                            {isChildEdited && !isEditingChild && (
                              <span className="text-[8.5px] text-gray-400 dark:text-gray-500 italic mt-0.5 block">
                                Đã chỉnh sửa
                              </span>
                            )}

                            <div className={`flex items-center gap-2.5 mt-1 text-[10px] text-gray-500 dark:text-gray-400 font-medium ${isChildMe ? "flex-row-reverse" : "flex-row"}`}>
                              {isChildMe && (
                                <button
                                  onClick={() => { setEditingCommentId(r.id); setEditContent(r.content); }}
                                  className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                                >
                                  Sửa
                                </button>
                              )}
                              {isChildMe && (
                                <button
                                  onClick={() => handleDeleteChat(r.id)}
                                  className="hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors"
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
        <div ref={chatEndRef} />
      </div>

      {/* INPUT GỬI TIN NHẮN CHÍNH */}
      <form onSubmit={(e) => handleAddChat(e, null)} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-2 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Gửi tin nhắn vào kênh chung..."
            disabled={isPosting}
            className={`flex-1 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-xl pl-4 pr-12 py-3 text-[13px] text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 ${A.ring} focus:bg-white dark:focus:bg-gray-800 transition-all shadow-sm`}
          />
          <button
            type="submit"
            disabled={isPosting || !newMessage.trim()}
            className={`absolute right-1.5 p-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
              newMessage.trim()
                ? `${A.solidBg} text-white shadow-sm`
                : "text-gray-400 dark:text-gray-600 bg-transparent cursor-not-allowed"
            }`}
          >
            {isPosting
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} className={newMessage.trim() ? "ml-0.5" : ""} />}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectChat;