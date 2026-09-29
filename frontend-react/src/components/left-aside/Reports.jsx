import React, { useState, useEffect, useRef, useCallback } from "react";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import apiClient from "../../utils/apiClient";
import {
  BarChart2, TrendingUp, Filter, Download, Target, CheckCircle, Clock,
  AlertCircle, ChevronRight, Loader2, ChevronDown, Check, Briefcase,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent, getDensity, getAccentHex } from "../../utils/preferenceTokens";

const Reports = () => {
  const [selectedProject, setSelectedProject] = useState("all");
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ==== Preferences toàn cục ====
  const { accent, density } = usePreferences();
  const A = getAccent(accent);
  const D = getDensity(density);
  const accentHex = getAccentHex(accent);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [metrics, setMetrics] = useState([
    { label: "Tổng dự án", value: "0", icon: Target, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Tỷ lệ hoàn thành", value: "0%", icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { label: "Đang xử lý (WIP)", value: "0", icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: "Công việc tồn đọng", value: "0", icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
  ]);

  const [performanceData, setPerformanceData] = useState([]);
  const [statusData, setStatusData] = useState([
    { name: "To Do", value: 0, color: "#94a3b8" },
    { name: "In Progress", value: 0, color: "#3b82f6" },
    { name: "Review", value: 0, color: "#f59e0b" },
    { name: "Done", value: 0, color: "#10b981" },
  ]);

  const [teamPerformance, setTeamPerformance] = useState([]);
  const [totalTasksDonut, setTotalTasksDonut] = useState(0);

  useEffect(() => { fetchProjectsDropdown(); }, []);

  useEffect(() => { fetchReportData(selectedProject); }, [selectedProject]);

  useEvent(EVENTS.TASK, () => fetchReportData(selectedProject));
  useEvent(EVENTS.PROJECT, () => {
    fetchProjectsDropdown();
    fetchReportData(selectedProject);
  });

  const fetchProjectsDropdown = useCallback(async () => {
    try {
      const res = await apiClient.get("http://localhost:8084/api/reports/projects-dropdown");
      setProjectsList(res.data || []);
    } catch (error) {
      console.error("Lỗi tải danh sách dự án:", error);
    }
  }, []);

  const fetchReportData = useCallback(async (projectId) => {
    try {
      setLoading(true);
      const queryParam = projectId !== "all" ? `?projectId=${projectId}` : "";

      const summaryRes = await apiClient.get(`http://localhost:8084/api/reports/summary${queryParam}`);
      const data = summaryRes.data;

      setMetrics([
        { label: "Tổng dự án", value: data.totalProjects || 0, icon: Target, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
        { label: "Tỷ lệ hoàn thành", value: `${data.completionRate || 0}%`, icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
        { label: "Đang xử lý (WIP)", value: data.inProgressTasks || 0, icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
        { label: "Công việc tồn đọng", value: data.overdueTasks || 0, icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
      ]);

      setStatusData([
        { name: "To Do", value: data.todoTasks || 0, color: "#94a3b8" },
        { name: "In Progress", value: data.inProgressTasks || 0, color: "#3b82f6" },
        { name: "Review", value: data.reviewTasks || 0, color: "#f59e0b" },
        { name: "Done", value: data.doneTasks || 0, color: "#10b981" },
      ]);
      setTotalTasksDonut(data.totalTasks || 0);

      const chartRes = await apiClient.get(`http://localhost:8084/api/reports/performance-chart${queryParam}`);
      setPerformanceData(chartRes.data || []);

      const teamRes = await apiClient.get(`http://localhost:8084/api/reports/team-performance${queryParam}`);
      setTeamPerformance(teamRes.data || []);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu báo cáo:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 text-[12px] z-50">
          <p className="font-bold text-gray-800 dark:text-gray-100 mb-2">{label}</p>
          <div className="flex flex-col gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Hoàn thành: {payload[0]?.value || 0} task
            </span>
            <span className={`font-medium ${A.text}`}>
              Thêm mới: {payload[1]?.value || 0} task
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const selectedProjectObj = projectsList.find((p) => String(p.id) === String(selectedProject));
  const currentProjectName = selectedProject === "all"
    ? "Tất cả dự án"
    : selectedProjectObj?.name || "Chọn dự án";

  return (
    <div className="p-6 bg-[#F9FAFB] dark:bg-gray-900 w-full h-full font-sans overflow-y-auto text-gray-800 dark:text-gray-200 flex justify-center relative transition-colors duration-300">
      {loading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-[2px] z-50 flex items-center justify-center">
          <Loader2 className={`animate-spin ${A.text}`} size={36} />
        </div>
      )}

      <div className="max-w-[1400px] w-full flex flex-col gap-6 pb-12 min-h-min">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0 relative z-50">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight">
              Báo cáo & Thống kê
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
              Phân tích hiệu suất hệ thống và tiến độ dự án
            </p>
          </div>

          <div className="flex items-center gap-3 relative">
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[13px] font-medium rounded-lg px-3 py-2 shadow-sm cursor-pointer min-w-[200px] flex items-center justify-between gap-2 hover:border-gray-300 dark:hover:border-gray-600 transition-colors select-none"
              >
                <div className="flex items-center gap-2 truncate">
                  <Briefcase size={15} className={`shrink-0 ${A.icon}`} />
                  <span className="truncate">{currentProjectName}</span>
                </div>
                <ChevronDown
                  size={15}
                  className={`text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>

              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto z-[99999]">
                  <div
                    onClick={() => { setSelectedProject("all"); setIsDropdownOpen(false); }}
                    className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition-colors ${
                      selectedProject === "all"
                        ? `${A.softBg} ${A.text} font-medium`
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <span>Tất cả dự án</span>
                    {selectedProject === "all" && <Check size={14} className={A.icon} />}
                  </div>
                  {projectsList.map((proj) => {
                    const isSelected = String(selectedProject) === String(proj.id);
                    return (
                      <div
                        key={proj.id}
                        onClick={() => { setSelectedProject(proj.id); setIsDropdownOpen(false); }}
                        className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? `${A.softBg} ${A.text} font-medium`
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span className="truncate">{proj.name}</span>
                        {isSelected && <Check size={14} className={`shrink-0 ${A.icon}`} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className={`bg-white dark:bg-gray-800 ${density === "compact" ? "p-4" : "p-5"} rounded-xl border border-gray-100 dark:border-gray-700/80 shadow-sm flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md`}
            >
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

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
          {/* Area chart */}
          <div className={`lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/80 shadow-sm flex flex-col h-[380px] ${density === "compact" ? "p-4" : "p-6"}`}>
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                  Hiệu suất hoàn thành công việc
                </h3>
                <p className="text-[12px] text-gray-500 dark:text-gray-400">
                  So sánh số task thêm mới và hoàn thành trong 30 ngày qua
                </p>
              </div>
              <div className={`p-1.5 rounded-md ${A.softBg} ${A.icon}`}>
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accentHex.base} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={accentHex.base} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} dy={10} minTickGap={20} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="completed" name="Hoàn thành" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCompleted)" />
                  <Area type="monotone" dataKey="newTasks" name="Thêm mới" stroke={accentHex.base} strokeWidth={2.5} fillOpacity={1} fill="url(#colorNew)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut chart */}
          <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/80 shadow-sm flex flex-col h-[380px] ${density === "compact" ? "p-4" : "p-6"}`}>
            <div className="mb-4 shrink-0">
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                Phân bổ trạng thái
              </h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                Tỷ lệ task theo các trạng thái
              </p>
            </div>
            <div className="flex-1 relative w-full min-h-0 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={3} dataKey="value" stroke="none">
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} task`, "Số lượng"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                <span className="text-3xl font-black text-gray-900 dark:text-white">
                  {totalTasksDonut}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                  Tổng Task
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TEAM PERFORMANCE TABLE */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/80 shadow-sm flex flex-col overflow-hidden shrink-0">
          <div className={`${density === "compact" ? "p-4" : "p-5"} border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50`}>
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
              Hiệu suất thành viên
            </h3>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">
              Đánh giá tiến độ xử lý công việc và chỉ số hiệu suất cá nhân
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/50">
                  <th className={`${density === "compact" ? "py-2 px-3" : "py-3 px-5"} text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase`}>Thành viên</th>
                  <th className={`${density === "compact" ? "py-2 px-3" : "py-3 px-5"} text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase text-center`}>Tổng Task</th>
                  <th className={`${density === "compact" ? "py-2 px-3" : "py-3 px-5"} text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase text-center`}>Đã xong</th>
                  <th className={`${density === "compact" ? "py-2 px-3" : "py-3 px-5"} text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase text-center`}>Quá hạn</th>
                  <th className={`${density === "compact" ? "py-2 px-3" : "py-3 px-5"} text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase`}>Tỷ lệ hiệu suất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {teamPerformance.length > 0 ? (
                  teamPerformance.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className={`${density === "compact" ? "py-2 px-3" : "py-3 px-5"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold shadow-sm ${A.bgOnly}`}>
                            {user.avatar}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-semibold text-gray-900 dark:text-white">{user.name}</span>
                            <span className="text-[12px] text-gray-500 dark:text-gray-400">{user.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className={`${density === "compact" ? "py-2 px-3" : "py-3 px-5"} text-center font-medium text-gray-700 dark:text-gray-300`}>{user.total}</td>
                      <td className={`${density === "compact" ? "py-2 px-3" : "py-3 px-5"} text-center font-medium text-emerald-600 dark:text-emerald-400`}>{user.done}</td>
                      <td className={`${density === "compact" ? "py-2 px-3" : "py-3 px-5"} text-center font-medium`}>
                        {user.overdue > 0 ? (
                          <span className="bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md text-[12px] font-bold">
                            {user.overdue}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className={`${density === "compact" ? "py-2 px-3" : "py-3 px-5"}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 max-w-[150px]">
                            <div
                              className={`h-2 rounded-full ${
                                user.efficiency >= 80
                                  ? "bg-emerald-500"
                                  : user.efficiency >= 50
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${user.efficiency}%` }}
                            ></div>
                          </div>
                          <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300 w-10">
                            {user.efficiency}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-400 dark:text-gray-500 text-[13px]">
                      Không có dữ liệu thành viên nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;