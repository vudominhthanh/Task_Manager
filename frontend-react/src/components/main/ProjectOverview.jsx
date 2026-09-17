import React, { useState, useEffect, useCallback } from "react";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams } from "react-router-dom";
import apiClient from "../../utils/apiClient";
import { Target, CheckCircle, Clock, AlertCircle, Loader2, Activity, UserCheck, History, } from "lucide-react";

const ProjectOverview = () => {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8085/api/tasks/project/${projectId}`);
      setTasks(res.data || []);
    } catch (err) {
      console.error("Lỗi tải task:", err);
    }
  }, [projectId]);

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8083/api/projects/${projectId}/members`);
      setMembers(res.data || []);
    } catch (err) {
      console.error("Lỗi tải thành viên:", err);
    }
  }, [projectId]);

  const fetchActivities = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8081/api/activities/project/${projectId}`);
      const data = res.data;
      const flatLogs = data.flatMap((group) => group.logs || []).slice(0, 5);
      setActivities(flatLogs);
    } catch (err) {
      console.error("Lỗi tải hoạt động:", err);
    }
  }, [projectId]);

  const fetchOverviewData = useCallback(async () => {
    if (!projectId) return;
    try {
      await Promise.all([
        fetchTasks(),
        fetchMembers(),
        fetchActivities(),
      ]);
    } catch (error) {
      console.error("Lỗi tải dữ liệu tổng quan:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchOverviewData();
  }, [projectId, fetchOverviewData]);

  useEvent(EVENTS.TASK, fetchOverviewData);
  useEvent(EVENTS.MEMBER, fetchOverviewData);
  useEvent(EVENTS.COMMENT, fetchOverviewData);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "DONE").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "REVIEW",
  ).length;

  const todayStr = new Date().toISOString().split("T")[0];
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === "DONE") return false;
    return t.dueDate < todayStr;
  }).length;

  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const metrics = [
    {
      label: "Tổng task",
      value: totalTasks,
      icon: Target,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Đã hoàn thành",
      value: completedTasks,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Đang tiến hành",
      value: inProgressTasks,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Quá hạn",
      value: overdueTasks,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="p-4 lg:p-6 h-full bg-[#F9FAFB] overflow-y-auto relative font-sans">
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
          <span className="text-gray-500 text-[13px] font-medium">
            Đang tổng hợp thông tin dự án...
          </span>
        </div>
      )}

      {/* 4 Thẻ chỉ số tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white p-5 rounded-xl border border-gray-200/60 shadow-sm flex items-center gap-4"
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${metric.bg} ${metric.color}`}
            >
              <metric.icon size={22} />
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-[12px] text-gray-500 font-bold uppercase tracking-wider truncate">
                {metric.label}
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">
                {metric.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Phần chia cột: Tiến độ trực quan, Thành viên & Hoạt động gần đây */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái (2 phần): Thanh tiến độ tổng thể và Phân bổ trạng thái */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[15px] font-bold text-gray-900">
                  Tiến độ hoàn thành dự án
                </h3>
                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {completionRate}%
                </span>
              </div>
              <p className="text-[13px] text-gray-500 mb-6">
                Tỷ lệ hoàn thành công việc dựa trên tổng số task đã khởi tạo
                trong hệ thống.
              </p>

              {/* Progress Bar lớn */}
              <div className="w-full bg-gray-100 rounded-full h-3.5 mb-6 overflow-hidden">
                <div
                  className="bg-indigo-600 h-3.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                ></div>
              </div>
            </div>

            {/* Phân bổ trạng thái công việc */}
            <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[12px] font-bold text-gray-600 uppercase tracking-wider">
                  Phân bổ trạng thái công việc
                </span>
                <Activity size={16} className="text-gray-400" />
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-white p-3 rounded-lg border border-gray-200/50 shadow-xs">
                  <span className="text-[11px] text-gray-400 font-medium">
                    To Do
                  </span>
                  <p className="text-lg font-bold text-gray-800">
                    {tasks.filter((t) => t.status === "TO_DO").length}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200/50 shadow-xs">
                  <span className="text-[11px] text-blue-500 font-medium">
                    In Progress
                  </span>
                  <p className="text-lg font-bold text-blue-600">
                    {tasks.filter((t) => t.status === "IN_PROGRESS").length}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200/50 shadow-xs">
                  <span className="text-[11px] text-amber-500 font-medium">
                    Review
                  </span>
                  <p className="text-lg font-bold text-amber-600">
                    {tasks.filter((t) => t.status === "REVIEW").length}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200/50 shadow-xs">
                  <span className="text-[11px] text-emerald-500 font-medium">
                    Done
                  </span>
                  <p className="text-lg font-bold text-emerald-600">
                    {completedTasks}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Khung hoạt động gần đây lấy từ Activity Service */}
          <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History size={18} className="text-indigo-600" />
                <h3 className="text-[15px] font-bold text-gray-900">
                  Hoạt động gần đây
                </h3>
              </div>
              <span className="text-xs text-gray-400">Real-time log</span>
            </div>

            <div className="flex flex-col gap-3">
              {activities.length > 0 ? (
                activities.map((act, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                        {act.user ? act.user.charAt(0).toUpperCase() : "U"}
                      </div>
                      <p className="text-[13px] text-gray-800">
                        <span className="font-semibold text-gray-900">
                          {act.user}
                        </span>{" "}
                        đã{" "}
                        <span className="text-indigo-600 font-medium">
                          {act.actionType}
                        </span>{" "}
                        task{" "}
                        <span className="font-semibold text-gray-900">
                          {act.target}
                        </span>
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-400">
                      {act.time || act.date}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 text-xs py-4">
                  Chưa có hoạt động nào được ghi nhận gần đây.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Cột phải (1 phần): Danh sách thành viên tham gia */}
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-6 flex flex-col h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-gray-900">
              Thành viên dự án
            </h3>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {members.length} người
            </span>
          </div>
          <p className="text-[12px] text-gray-500 mb-4">
            Nhân sự phối hợp thực hiện dự án.
          </p>

          <div className="flex-1 overflow-y-auto flex flex-col gap-3 max-h-[400px] [scrollbar-width:none]">
            {members.length > 0 ? (
              members.map((member, index) => {
                const colors = [
                  "bg-blue-500",
                  "bg-emerald-500",
                  "bg-amber-500",
                  "bg-rose-500",
                  "bg-purple-500",
                  "bg-indigo-600",
                ];
                const color = colors[index % colors.length];
                const initial = member.fullName
                  ? member.fullName.charAt(0).toUpperCase()
                  : "U";

                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${color}`}
                      >
                        {initial}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-gray-900">
                          {member.fullName}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          Thành viên
                        </span>
                      </div>
                    </div>
                    <UserCheck size={16} className="text-emerald-500" />
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-400 text-xs py-6">
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
