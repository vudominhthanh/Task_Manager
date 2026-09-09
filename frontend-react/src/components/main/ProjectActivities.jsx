import React, { useState, useEffect, useCallback } from 'react';
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams } from 'react-router-dom';
import { PlusCircle, MessageSquare, ArrowRightLeft, CheckCircle, Loader2, Activity, Trash2, Edit3 } from 'lucide-react';

const ProjectActivities = () => {
  const { projectId } = useParams();
  const [activityGroups, setActivityGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem("accessToken") || "";

  const fetchAllData = useCallback(async () => {
    if (!projectId) return;
    try {
      const [activitiesRes, membersRes, tasksRes, projectRes] = await Promise.all([
        fetch(`http://localhost:8081/api/activities/project/${projectId}`, {
          headers: { "Authorization": `Bearer ${getToken()}` }
        }),
        fetch(`http://localhost:8083/api/projects/${projectId}/members`, {
          headers: { "Authorization": `Bearer ${getToken()}` }
        }),
        fetch(`http://localhost:8085/api/tasks/project/${projectId}`, {
          headers: { "Authorization": `Bearer ${getToken()}` }
        }),
        fetch(`http://localhost:8083/api/projects/${projectId}`, {
          headers: { "Authorization": `Bearer ${getToken()}` }
        })
      ]);

      if (activitiesRes.ok) setActivityGroups(await activitiesRes.json());
      if (membersRes.ok) setMembers(await membersRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (projectRes.ok) {
        const projData = await projectRes.json();
        setProjectName(projData.name || projData.projectName || "Dự án hiện tại");
      }
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

  useEvent(EVENTS.TASK, fetchAllData);
  useEvent(EVENTS.COMMENT, fetchAllData);
  useEvent(EVENTS.ATTACHMENT, fetchAllData);
  useEvent(EVENTS.MEMBER, fetchAllData);

  const resolveUserName = (userIdOrName) => {
    if (!userIdOrName) return "Hệ thống";
    const found = members.find(m => m.userId === userIdOrName || m.id === userIdOrName);
    if (found) return found.fullName || found.username;
    return userIdOrName;
  };

  const resolveTaskName = (taskIdOrTitle) => {
    if (!taskIdOrTitle) return "Công việc";
    const found = tasks.find(t => t.id === taskIdOrTitle || t.taskId === taskIdOrTitle);
    if (found) return found.title;
    return taskIdOrTitle;
  };

  // Hàm chuyển đổi actionType kỹ thuật thành văn bản tiếng Việt mượt mà
  const translateActionText = (actionType) => {
    const type = (actionType || "").toUpperCase();
    switch (type) {
      case 'TASK_CREATED':
        return { text: "đã tạo mới", icon: <PlusCircle size={14} />, color: "bg-indigo-100 text-indigo-600" };
      case 'TASK_UPDATED':
        return { text: "đã cập nhật", icon: <Edit3 size={14} />, color: "bg-gray-100 text-gray-600" };
      case 'TASK_STATUS_UPDATED':
        return { text: "đã chuyển trạng thái", icon: <ArrowRightLeft size={14} />, color: "bg-blue-100 text-blue-600" };
      case 'TASK_DELETED':
        return { text: "đã xóa", icon: <Trash2 size={14} />, color: "bg-red-100 text-red-600" };
      case 'SUB_TASK_CREATED':
        return { text: "đã thêm công việc phụ cho", icon: <PlusCircle size={14} />, color: "bg-emerald-100 text-emerald-600" };
      case 'COMMENT_CREATED':
        return { text: "đã bình luận vào", icon: <MessageSquare size={14} />, color: "bg-purple-100 text-purple-600" };
      default:
        return { text: `đã thực hiện (${actionType}) trên`, icon: <CheckCircle size={14} />, color: "bg-gray-100 text-gray-600" };
    }
  };

  return (
    <div className="p-4 lg:p-8 h-full overflow-y-auto bg-[#F9FAFB] relative font-sans">
      
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
          <span className="text-gray-500 text-[13px] font-medium">Đang tải toàn bộ lịch sử hoạt động...</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Activity size={18} className="text-indigo-600" />
          <h2 className="text-[16px] font-bold text-gray-900">Lịch sử hoạt động dự án</h2>
        </div>
        
        {activityGroups.length > 0 ? (
          <div className="space-y-8">
            {activityGroups.map((group) => (
              <div key={group.id} className="flex flex-col gap-4">
                <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2.5 py-1 rounded-md w-fit border border-gray-100">
                  {group.date}
                </span>

                <div className="relative border-l border-gray-100 ml-3 md:ml-4 space-y-6">
                  {group.logs.map((act, idx) => {
                    const { text: actionText, icon, color } = translateActionText(act.actionType);
                    
                    const displayUser = resolveUserName(act.user);
                    const displayTarget = resolveTaskName(act.target);
                    const displayProject = projectName || act.project || "Dự án hiện tại";

                    return (
                      <div key={idx} className="relative pl-6 md:pl-8">
                        <div className={`absolute -left-3.5 top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${act.avatarColor || color}`}>
                          {icon}
                        </div>
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                          <p className="text-[13px] text-gray-700 leading-relaxed">
                            <span className="font-bold text-gray-900">{displayUser}</span>{" "}
                            <span className="font-medium text-indigo-600">{actionText}</span>{" "}
                            công việc <span className="font-bold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors">{displayTarget}</span>
                          </p>
                          
                          {act.payloadDetails && act.payloadDetails.comment && (
                            <div className="mt-2 text-[13px] text-gray-600 italic bg-white p-3 rounded-lg border border-gray-200/60 border-l-2 border-l-purple-500">
                              "{act.payloadDetails.comment}"
                            </div>
                          )}
                          
                          <span className="block mt-2 text-[11px] text-gray-400 font-medium">Dự án: {displayProject}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">
            {!loading && "Chưa có hoạt động nào được ghi nhận trong dự án này."}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectActivities;