import React, { useState, useEffect, useCallback } from "react";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import apiClient from "../../utils/apiClient";
import { Briefcase, CheckCircle, AlertCircle, Clock, Star, ChevronRight, TrendingUp, TrendingDown, MessageSquare, Activity as ActivityIcon, Plus, Trash2, Edit2, LogIn, } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import CreateProjectPage from "../function/CreateProjectPage";

const SystemOverview = () => {
  const [stats, setStats] = useState({
    activeProjects: { value: 0, trend: "Đang tham gia" },
    completedThisWeek: { value: 0, trend: "7 ngày qua" },
    overdueTasks: { value: 0, trend: "Cần xử lý" },
  });

  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [quickProjects, setQuickProjects] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const overviewRes = await apiClient.get("http://localhost:8084/api/reports/overview/user");
      const overviewData = overviewRes.data || {};

      if (overviewData.stats) setStats(overviewData.stats);
      if (overviewData.quickProjects) setQuickProjects(overviewData.quickProjects);
      if (overviewData.recentActivities) setRecentActivities(overviewData.recentActivities);

      const tasksRes = await apiClient.get("http://localhost:8085/api/tasks/assignee/me");
      const allMyTasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];

      const parseLocalDate = (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split("-");
        if (parts.length < 3) return new Date(dateStr);
        return new Date(
          Number(parts[0]),
          Number(parts[1]) - 1,
          Number(parts[2]),
        );
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const next7Days = new Date();
      next7Days.setDate(today.getDate() + 7);
      next7Days.setHours(23, 59, 59, 999);

      const filtered = allMyTasks.filter((task) => {
        const isDone = task.status === "DONE" || task.status === "COMPLETED";
        if (isDone) return false;

        let dueObj = parseLocalDate(task.dueDate);
        let startObj = parseLocalDate(task.startDate) || dueObj;

        if (!dueObj && !startObj) return false;
        if (!dueObj) dueObj = new Date(startObj);
        if (!startObj) startObj = new Date(dueObj);

        dueObj.setHours(23, 59, 59, 999);
        startObj.setHours(0, 0, 0, 0);

        const isInNext7Days = startObj <= next7Days && dueObj >= today;
        const isOverdue = dueObj < today;

        return isInNext7Days || isOverdue;
      });

      setUpcomingTasks(filtered);

    } catch (err) {
      console.error("Lỗi gọi API Dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEvent(EVENTS.TASK, fetchDashboardData);
  useEvent(EVENTS.PROJECT, fetchDashboardData);
  useEvent(EVENTS.COMMENT, fetchDashboardData);

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case "TASK_STATUS_UPDATED":
      case "status_update":
        return <CheckCircle size={14} className="text-emerald-500" />;
      case "COMMENT_CREATED":
      case "comment":
        return <MessageSquare size={14} className="text-blue-500" />;
      case "TASK_CREATED":
      case "PROJECT_CREATED":
      case "SUB_TASK_CREATED":
        return <Plus size={14} className="text-indigo-500" />;
      case "TASK_DELETED":
      case "PROJECT_DELETED":
        return <Trash2 size={14} className="text-red-500" />;
      case "TASK_UPDATED":
      case "PROJECT_UPDATED":
        return <Edit2 size={14} className="text-amber-500" />;
      case "USER_LOGGED":
        return <LogIn size={14} className="text-teal-600" />;
      default:
        return <ActivityIcon size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="p-6 bg-[#F9FAFB] w-full min-h-full font-sans overflow-y-auto text-gray-800">
      <style>{`
        @keyframes pageSlideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-page-slide { animation: pageSlideUp 0.4s ease-out forwards; }
        .stagger-1 { animation-delay: 0.05s; }
        .stagger-2 { animation-delay: 0.1s; }
        .stagger-3 { animation-delay: 0.15s; }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div
          className="mb-6 transition-all duration-300 animate-page-slide stagger-1 opacity-0"
          style={{ animationFillMode: "forwards" }}
        >
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Tổng quan hệ thống
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Theo dõi tiến độ và tình trạng toàn bộ dự án
          </p>
        </div>

        {/* --- KHU VỰC 1: WIDGET THỐNG KÊ --- */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6 animate-page-slide stagger-2 opacity-0"
          style={{ animationFillMode: "forwards" }}
        >
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div className="flex justify-between items-start mb-3">
              <p className="text-[12px] text-gray-500 font-bold uppercase tracking-wider">
                Dự án đang chạy
              </p>
              <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 transition-transform duration-300 hover:rotate-12">
                <Briefcase size={18} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1 transition-all duration-300">
              {loading ? (
                <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded"></span>
              ) : (
                (stats.activeProjects?.value ?? 0)
              )}
            </h2>
            <div className="flex items-center gap-1.5 text-[12px] text-indigo-600 font-medium">
              <TrendingUp size={14} />{" "}
              {stats.activeProjects?.trend || "Đang tham gia"}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div className="flex justify-between items-start mb-3">
              <p className="text-[12px] text-gray-500 font-bold uppercase tracking-wider">
                Hoàn thành (Tuần)
              </p>
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 transition-transform duration-300 hover:rotate-12">
                <CheckCircle size={18} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-1 transition-all duration-300">
              {loading ? (
                <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded"></span>
              ) : (
                (stats.completedThisWeek?.value ?? 0)
              )}
            </h2>
            <div className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-medium">
              <TrendingUp size={14} />{" "}
              {stats.completedThisWeek?.trend || "7 ngày qua"}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 border-l-[3px] border-l-red-500">
            <div className="flex justify-between items-start mb-3">
              <p className="text-[12px] text-gray-500 font-bold uppercase tracking-wider">
                Công việc quá hạn
              </p>
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 transition-transform duration-300 hover:scale-110">
                <AlertCircle size={18} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-red-600 mb-1 transition-all duration-300">
              {loading ? (
                <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded"></span>
              ) : (
                (stats.overdueTasks?.value ?? 0)
              )}
            </h2>
            <div className="flex items-center gap-1.5 text-[12px] text-red-500 font-medium">
              <TrendingDown size={14} />{" "}
              {stats.overdueTasks?.trend || "Cần xử lý"}
            </div>
          </div>
        </div>

        {/* --- KHU VỰC 2: GRID CHÍNH --- */}
        <div
          className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-page-slide stagger-3 opacity-0"
          style={{ animationFillMode: "forwards" }}
        >
          {/* CỘT TRÁI (Span 3/5): Công việc 7 ngày tới */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1">
              <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                <h3 className="text-[15px] font-bold text-gray-900">
                  Công việc 7 ngày tới
                </h3>
                <Link
                  to="/calendar"
                  className="text-[12px] text-indigo-600 font-medium hover:underline flex items-center gap-1 group"
                >
                  Xem lịch{" "}
                  <ChevronRight
                    size={14}
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
              </div>

              <div className="p-2">
                {loading ? (
                  <div className="p-6 text-center text-sm text-gray-400 animate-pulse">
                    Đang tải danh sách công việc...
                  </div>
                ) : upcomingTasks.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">
                    Không có công việc nào trong 7 ngày tới.
                  </div>
                ) : (
                  upcomingTasks.map((task) => {
                    const targetProjectId = task.projectId || task.project;
                    const matchedProject = quickProjects.find(
                      (p) =>
                        String(p.id || p.projectId) === String(targetProjectId),
                    );
                    const projectName =
                      task.projectName || matchedProject?.name || "Dự án";

                    return (
                      <div
                        key={task.id}
                        onClick={() => {
                          if (targetProjectId)
                            navigate(`/project/${targetProjectId}`);
                        }}
                        className="flex items-center justify-between p-3 m-2 bg-white rounded-lg border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200 cursor-pointer group transform hover:-translate-y-0.5"
                      >
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                                task.priority === "URGENT"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-blue-100 text-blue-700 border-blue-200"
                              }`}
                            >
                              {task.priority || "MEDIUM"}
                            </span>
                            <h4 className="font-semibold text-[14px] text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {task.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-4 text-[11px] text-gray-500 font-medium">
                            <span className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                              {task.status}
                            </span>
                            <span className="flex items-center gap-1">
                              <Briefcase size={12} className="text-gray-400" />{" "}
                              {projectName}
                            </span>
                            <span className="flex items-center gap-1 text-orange-600 font-semibold">
                              <Clock size={12} />{" "}
                              {task.dueDate || "Chưa có hạn"}
                            </span>
                          </div>
                        </div>

                        {task.assigneeAvatar && (
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[12px] font-bold shadow-sm shrink-0">
                            {task.assigneeAvatar}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (Span 2/5): Truy cập nhanh & Hoạt động */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Box: Truy cập nhanh */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
              <div className="p-4 border-b border-gray-50 bg-gray-50/50 rounded-t-xl">
                <h3 className="text-[15px] font-bold text-gray-900">
                  Truy cập nhanh
                </h3>
              </div>

              <div className="p-5 flex flex-col gap-5">
                {quickProjects.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-400">
                    Chưa có dự án nào tham gia
                  </div>
                ) : (
                  quickProjects.map((project) => {
                    const projId = project.id || project.projectId;
                    const projName = project.name || "Dự án chưa đặt tên";
                    // Fallback đọc cả completionRate và progress
                    const progressVal =
                      project.progress !== undefined
                        ? project.progress
                        : project.completionRate !== undefined
                          ? Number(project.completionRate)
                          : 0;

                    return (
                      <div
                        key={projId}
                        onClick={() => projId && navigate(`/project/${projId}`)}
                        className="group cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[13px] font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                                {projName}
                              </h4>
                              {project.isStarred && (
                                <Star
                                  size={12}
                                  className="text-orange-400 fill-orange-400 transition-transform duration-300 group-hover:rotate-45"
                                />
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400">
                              {project.lastActive || "Hoạt động gần đây"}
                            </p>
                          </div>
                          <span className="text-[12px] font-bold text-gray-700">
                            {progressVal}%
                          </span>
                        </div>

                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(progressVal, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}

                <button
                  onClick={() => setIsCreateProjectOpen(true)}
                  className="w-full py-2 mt-2 border border-dashed border-gray-300 rounded-lg text-gray-500 text-[12px] font-medium hover:border-indigo-400 hover:text-indigo-600 hover:shadow-sm transition-all duration-200 bg-gray-50 hover:bg-indigo-50/30 active:scale-[0.98] cursor-pointer"
                >
                  + Thêm dự án mới
                </button>
              </div>
            </div>

            {/* Box: Hoạt động mới nhất */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1">
              <div className="p-4 border-b border-gray-50 bg-gray-50/50 rounded-t-xl flex justify-between items-center">
                <h3 className="text-[15px] font-bold text-gray-900">
                  Hoạt động mới nhất
                </h3>
              </div>

              <div className="p-4 flex flex-col gap-3">
                {recentActivities.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-400">
                    Chưa có hoạt động gần đây
                  </div>
                ) : (
                  recentActivities.map((activity, idx) => (
                    <div
                      key={activity.id || idx}
                      className="flex gap-3 items-start transition-all duration-200 hover:bg-gray-50/80 p-1.5 rounded-lg"
                    >
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-500 transition-colors duration-200">
                        {getActionIcon(activity.actionType || activity.type)}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-[12px] text-gray-600 leading-snug truncate">
                          <span className="font-bold text-gray-900">
                            {activity.user || activity.username || "Thành viên"}
                          </span>{" "}
                          {activity.action || "đã thao tác"}{" "}
                          <span className="font-semibold text-gray-800">
                            {activity.target || activity.targetName || ""}
                          </span>
                        </p>
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          {activity.time || "Vừa xong"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateProjectPage
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={fetchDashboardData}
      />
    </div>
  );
};

export default SystemOverview;
