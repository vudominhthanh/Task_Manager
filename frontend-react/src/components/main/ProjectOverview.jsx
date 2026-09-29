import React, { useState, useEffect, useCallback } from "react";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams } from "react-router-dom";
import apiClient from "../../utils/apiClient";
import {
  Target, CheckCircle, Clock, AlertCircle, Loader2, Activity, UserCheck, History,
} from "lucide-react";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const ProjectOverview = () => {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==== Preferences ====
  const { accent } = usePreferences();
  const A = getAccent(accent);

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8085/api/tasks/project/${projectId}`);
      setTasks(res.data || []);
    } catch (err) { console.error("Lỗi tải task:", err); }
  }, [projectId]);

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8083/api/projects/${projectId}/members`);
      setMembers(res.data || []);
    } catch (err) { console.error("Lỗi tải thành viên:", err); }
  }, [projectId]);

  const fetchActivities = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8081/api/activities/project/${projectId}`);
      const data = res.data;
      const flatLogs = data.flatMap((group) => group.logs || []).slice(0, 5);
      setActivities(flatLogs);
    } catch (err) { console.error("Lỗi tải hoạt động:", err); }
  }, [projectId]);

  const fetchOverviewData = useCallback(async () => {
    if (!projectId) return;
    try {
      await Promise.all([fetchTasks(), fetchMembers(), fetchActivities()]);
    } catch (error) {
      console.error("Lỗi tải dữ liệu tổng quan:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchTasks, fetchMembers, fetchActivities]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchOverviewData();
  }, [projectId, fetchOverviewData]);

  useEvent(EVENTS.TASK, (data) => {
    if (String(data.projectId) === String(projectId)) fetchOverviewData();
  });
  useEvent(EVENTS.COMMENT, (data) => {
    if (String(data.projectId) === String(projectId) && data.taskId) {
      fetchOverviewData();   // ✅ FIX: typo `fetchTfetchOverviewDataasks()` → `fetchOverviewData()`
    }
  });
  useEvent(EVENTS.MEMBER, (data) => {
    if (String(data.projectId) === String(projectId)) fetchOverviewData();
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS" || t.status === "REVIEW").length;

  const todayStr = new Date().toISOString().split("T")[0];
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === "DONE") return false;
    return t.dueDate < todayStr;
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Metric card colors giữ nguyên — đây là SEMANTIC (blue/emerald/amber/red), không phải accent
  const metrics = [
    { label: "Tổng task",      value: totalTasks,      icon: Target,       color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Đã hoàn thành",  value: completedTasks,  icon: CheckCircle,  color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { label: "Đang tiến hành", value: inProgressTasks, icon: Clock,        color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: "Quá hạn",        value: overdueTasks,    icon: AlertCircle,  color: "text-red-600 dark:text-red-400",         bg: "bg-red-50 dark:bg-red-500/10" },
  ];

  return (
    <div className="p-4 lg:p-6 h-full bg-[#F9FAFB] dark:bg-gray-900 overflow-y-auto relative font-sans transition-colors">
      {loading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
          <Loader2 className={`animate-spin mb-2 ${A.text}`} size={32} />
          <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium">
            Đang tổng hợp thông tin dự án...
          </span>
        </div>
      )}

      {/* 4 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200/60 dark:border-gray-700/80 shadow-sm flex items-center gap-4 transition-colors">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${metric.bg} ${metric.color}`}>
              <metric.icon size={22} />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-[12px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider truncate">
                {metric.label}
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
                {metric.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/80 shadow-sm p-6 flex flex-col justify-between transition-colors">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                  Tiến độ hoàn thành dự án
                </h3>
                <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${A.text} ${A.softBg}`}>
                  {completionRate}%
                </span>
              </div>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">
                Tỷ lệ hoàn thành công việc dựa trên tổng số task đã khởi tạo trong hệ thống.
              </p>

              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3.5 mb-6 overflow-hidden">
                <div
                  className={`h-3.5 rounded-full transition-all duration-500 ${A.bgOnly}`}
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
            </div>

            {/* Phân bổ trạng thái */}
            <div className="bg-gray-50/70 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-100 dark:border-gray-700/50 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[12px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Phân bổ trạng thái công việc
                </span>
                <Activity size={16} className="text-gray-400 dark:text-gray-500" />
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-xs">
                  <span className="text-[11px] text-gray-400 font-medium">To Do</span>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {tasks.filter((t) => t.status === "TO_DO").length}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-xs">
                  <span className="text-[11px] text-blue-500 font-medium">In Progress</span>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {tasks.filter((t) => t.status === "IN_PROGRESS").length}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-xs">
                  <span className="text-[11px] text-amber-500 font-medium">Review</span>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {tasks.filter((t) => t.status === "REVIEW").length}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50 shadow-xs">
                  <span className="text-[11px] text-emerald-500 font-medium">Done</span>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {completedTasks}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hoạt động gần đây */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/80 shadow-sm p-6 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History size={18} className={A.icon} />
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                  Hoạt động gần đây
                </h3>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">Real-time log</span>
            </div>

            <div className="flex flex-col gap-3">
              {activities.length > 0 ? (
                activities.map((act, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${A.softBg} ${A.text}`}>
                        {act.user ? act.user.charAt(0).toUpperCase() : "U"}
                      </div>
                      <p className="text-[13px] text-gray-800 dark:text-gray-200">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{act.user}</span>{" "}
                        đã{" "}
                        <span className={`font-medium ${A.text}`}>{act.actionType}</span>{" "}
                        task{" "}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{act.target}</span>
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      {act.time || act.date}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 dark:text-gray-500 text-xs py-4">
                  Chưa có hoạt động nào được ghi nhận gần đây.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải: Thành viên */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/80 shadow-sm p-6 flex flex-col h-fit transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
              Thành viên dự án
            </h3>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {members.length} người
            </span>
          </div>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-4">
            Nhân sự phối hợp thực hiện dự án.
          </p>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3 max-h-[400px] [scrollbar-width:none]">
            {members.length > 0 ? (
              members.map((member, index) => {
                const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-purple-500", "bg-indigo-600"];
                const color = colors[index % colors.length];
                const initial = member.fullName ? member.fullName.charAt(0).toUpperCase() : "U";

                return (
                  <div key={member.userId} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${color}`}>
                        {initial}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">
                          {member.fullName}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">Thành viên</span>
                      </div>
                    </div>
                    <UserCheck size={16} className="text-emerald-500" />
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-400 dark:text-gray-500 text-xs py-6">
                Chưa có thành viên nào.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectOverview;