import React, { useState, useEffect, useCallback } from "react";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams } from "react-router-dom";
import apiClient from "../../utils/apiClient";
import {
  PlusCircle, MessageSquare, ArrowRightLeft, CheckCircle,
  Loader2, Activity, Trash2, Edit3,
} from "lucide-react";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const ProjectActivities = () => {
  const { projectId } = useParams();
  const [activityGroups, setActivityGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);

  // ==== Preferences ====
  const { accent } = usePreferences();
  const A = getAccent(accent);

  const fetchAllData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [activitiesRes, membersRes, tasksRes, projectRes] = await Promise.all([
        apiClient.get(`http://localhost:8081/api/activities/project/${projectId}`),
        apiClient.get(`http://localhost:8083/api/projects/${projectId}/members`),
        apiClient.get(`http://localhost:8085/api/tasks/project/${projectId}`),
        apiClient.get(`http://localhost:8083/api/projects/${projectId}`),
      ]);

      setActivityGroups(activitiesRes.data || []);
      setMembers(membersRes.data || []);
      setTasks(tasksRes.data || []);
      const projData = projectRes.data;
      setProjectName(projData.name || projData.projectName || "Dự án hiện tại");
    } catch (error) {
      console.error("Lỗi khi tải lịch sử hoạt động:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchAllData();
  }, [projectId, fetchAllData]);

  useEvent(EVENTS.TASK, (data) => { if (String(data.projectId) === String(projectId)) fetchAllData(); });
  useEvent(EVENTS.COMMENT, (data) => { if (String(data.projectId) === String(projectId) && data.taskId) fetchAllData(); });
  useEvent(EVENTS.ATTACHMENT, (data) => { if (String(data.projectId) === String(projectId)) fetchAllData(); });
  useEvent(EVENTS.MEMBER, (data) => { if (String(data.projectId) === String(projectId)) fetchAllData(); });

  const resolveUserName = (userIdOrName) => {
    if (!userIdOrName) return "Hệ thống";
    const found = members.find((m) => m.userId === userIdOrName || m.id === userIdOrName);
    if (found) return found.fullName || found.username;
    return userIdOrName;
  };

  const resolveTaskName = (taskIdOrTitle) => {
    if (!taskIdOrTitle) return "Công việc";
    const found = tasks.find((t) => t.id === taskIdOrTitle || t.taskId === taskIdOrTitle);
    if (found) return found.title;
    return taskIdOrTitle;
  };

  // ==== translateActionText — closure bắt `A` ====
  // Màu của từng case là STATUS-SEMANTIC (xanh lá, đỏ, tím, xanh dương) — giữ nguyên.
  // Riêng TASK_CREATED mới theo accent.
  const translateActionText = (actionType) => {
    const type = (actionType || "").toUpperCase();
    switch (type) {
      case "TASK_CREATED":
        return { text: "đã tạo mới", icon: <PlusCircle size={14} />, color: `${A.softBg} ${A.text}` };
      case "TASK_UPDATED":
        return { text: "đã cập nhật", icon: <Edit3 size={14} />, color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" };
      case "TASK_STATUS_UPDATED":
        return { text: "đã chuyển trạng thái", icon: <ArrowRightLeft size={14} />, color: "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" };
      case "TASK_DELETED":
        return { text: "đã xóa", icon: <Trash2 size={14} />, color: "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400" };
      case "SUB_TASK_CREATED":
        return { text: "đã thêm công việc phụ cho", icon: <PlusCircle size={14} />, color: "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
      case "COMMENT_CREATED":
        return { text: "đã bình luận vào", icon: <MessageSquare size={14} />, color: "bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400" };
      default:
        return { text: `đã thực hiện (${actionType}) trên`, icon: <CheckCircle size={14} />, color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" };
    }
  };

  return (
    <div className="p-4 lg:p-8 h-full overflow-y-auto bg-[#F9FAFB] dark:bg-gray-900 relative font-sans transition-colors">
      {loading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
          <Loader2 className={`animate-spin mb-2 ${A.text}`} size={32} />
          <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium">
            Đang tải toàn bộ lịch sử hoạt động...
          </span>
        </div>
      )}

      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/60 dark:border-gray-700/80 shadow-sm transition-colors">
        <div className="flex items-center gap-2 mb-6">
          <Activity size={18} className={A.icon} />
          <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">
            Lịch sử hoạt động dự án
          </h2>
        </div>

        {activityGroups.length > 0 ? (
          <div className="space-y-8">
            {activityGroups.map((group) => (
              <div key={group.id} className="flex flex-col gap-4">
                <span className="text-[12px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50 px-2.5 py-1 rounded-md w-fit border border-gray-100 dark:border-gray-700/50 transition-colors">
                  {group.date}
                </span>

                <div className="relative border-l border-gray-100 dark:border-gray-700 ml-3 md:ml-4 space-y-6">
                  {group.logs.map((act, idx) => {
                    const { text: actionText, icon, color } = translateActionText(act.actionType);

                    const displayUser = resolveUserName(act.user);
                    const displayTarget = resolveTaskName(act.target);
                    const displayProject = projectName || act.project || "Dự án hiện tại";

                    return (
                      <div key={idx} className="relative pl-6 md:pl-8">
                        <div className={`absolute -left-3.5 top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-sm ${act.avatarColor || color}`}>
                          {icon}
                        </div>
                        <div className="bg-gray-50/50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-colors">
                          <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
                            {(() => {
                              const type = (act.actionType || "").toUpperCase();
                              const userSpan = (
                                <span className="font-bold text-gray-900 dark:text-gray-100">{displayUser}</span>
                              );
                              const targetSpan = (
                                <span className={`font-bold text-gray-900 dark:text-gray-100 cursor-pointer transition-colors ${A.textHover}`}>
                                  {displayTarget}
                                </span>
                              );
                              if (["USER_LOGGED", "USER_LOGGED_IN", "USER_REGISTERED"].includes(type)) {
                                return <>{userSpan} <span className={`font-medium ${A.text}`}>{actionText}</span></>;
                              }
                              return <>{userSpan} <span className={`font-medium ${A.text}`}>{actionText}</span> {targetSpan}</>;
                            })()}
                          </p>

                          {act.payloadDetails && act.payloadDetails.comment && (
                            <div className="mt-2 text-[13px] text-gray-600 dark:text-gray-400 italic bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200/60 dark:border-gray-700/60 border-l-2 border-l-purple-500">
                              "{act.payloadDetails.comment}"
                            </div>
                          )}

                          <span className="block mt-2 text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                            Dự án: {displayProject}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
            {!loading && "Chưa có hoạt động nào được ghi nhận trong dự án này."}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectActivities;