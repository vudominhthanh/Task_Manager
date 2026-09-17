import React, { useState, useEffect, useRef, useCallback } from "react";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import apiClient from "../../utils/apiClient";
import { BarChart2, TrendingUp, Filter, Download, Target, CheckCircle, Clock, AlertCircle, ChevronRight, Loader2, ChevronDown, Check, Briefcase, } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, } from "recharts";

const Reports = () => {
  const [selectedProject, setSelectedProject] = useState("all");
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    {
      label: "Tổng dự án",
      value: "0",
      icon: Target,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Tỷ lệ hoàn thành",
      value: "0%",
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Đang xử lý (WIP)",
      value: "0",
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Công việc tồn đọng",
      value: "0",
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
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

  useEffect(() => {
    fetchProjectsDropdown();
  }, []);

  useEffect(() => {
    fetchReportData(selectedProject);
  }, [selectedProject]);

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
      const queryParam = projectId !== "all" ? `?projectId=${projectId}` : "";

      const summaryRes = await apiClient.get(`http://localhost:8084/api/reports/summary${queryParam}`);

      const data = summaryRes.data;

      setMetrics([
        {
          label: "Tổng dự án",
          value: data.totalProjects || 0,
          icon: Target,
          color: "text-blue-600",
          bg: "bg-blue-50",
        },
        {
          label: "Tỷ lệ hoàn thành",
          value: `${data.completionRate || 0}%`,
          icon: CheckCircle,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
        },
        {
          label: "Đang xử lý (WIP)",
          value: data.inProgressTasks || 0,
          icon: Clock,
          color: "text-amber-600",
          bg: "bg-amber-50",
        },
        {
          label: "Công việc tồn đọng",
          value: data.overdueTasks || 0,
          icon: AlertCircle,
          color: "text-red-600",
          bg: "bg-red-50",
        },
      ]);

      setStatusData([
        { name: "To Do", value: data.todoTasks || 0, color: "#94a3b8" },
        {
          name: "In Progress",
          value: data.inProgressTasks || 0,
          color: "#3b82f6",
        },
        { name: "Review", value: data.reviewTasks || 0, color: "#f59e0b" },
        { name: "Done", value: data.doneTasks || 0, color: "#10b981" },
      ]);
      setTotalTasksDonut(data.totalTasks || 0);

      // const chartRes = await apiClient.get(`http://localhost:8084/api/reports/performance-chart${queryParam}`, {
      //   headers: { "Authorization": `Bearer ${getToken()}` }
      // });
      // if (chartRes.ok) {
      //   const data = await chartRes.json();
      //   console.log("Performance Data:", data);
      //   setPerformanceData(await chartRes.json());
      // }

      try {
        const chartRes = await apiClient.get(`http://localhost:8084/api/reports/performance-chart${queryParam}`);
        const data = chartRes.data;
        setPerformanceData(data);
      } catch (err) {
        console.error("Lỗi mạng hoặc ngoại lệ:", err);
      }

      const teamRes = await apiClient.get(`http://localhost:8084/api/reports/team-performance${queryParam}`);
      setTeamPerformance(teamRes.data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu báo cáo:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100 text-[12px] z-50">
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          <div className="flex flex-col gap-1">
            <span className="text-emerald-600 font-medium">
              Hoàn thành: {payload[0]?.value || 0} task
            </span>
            <span className="text-indigo-600 font-medium">
              Thêm mới: {payload[1]?.value || 0} task
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const selectedProjectObj = projectsList.find(
    (p) => String(p.id) === String(selectedProject),
  );
  const currentProjectName =
    selectedProject === "all"
      ? "Tất cả dự án"
      : selectedProjectObj?.name || "Chọn dự án";

  return (
    <div className="p-6 bg-[#F9FAFB] w-full h-full font-sans overflow-y-auto text-gray-800 flex justify-center relative">
      <style>{`
        @keyframes pageSlideUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-page-slide {
          animation: pageSlideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .stagger-1 { animation-delay: 0.05s; }
        .stagger-2 { animation-delay: 0.12s; }
        .stagger-3 { animation-delay: 0.2s; }
        .stagger-4 { animation-delay: 0.28s; }
      `}</style>

      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={36} />
        </div>
      )}

      <div className="max-w-[1400px] w-full flex flex-col gap-6 pb-12 min-h-min">
        {/* --- HEADER --- */}
        <div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 shrink-0 animate-page-slide stagger-1 relative z-50"
          style={{ animationFillMode: "forwards" }}
        >
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Báo cáo & Thống kê
            </h1>
            <p className="text-[13px] text-gray-500 mt-1">
              Phân tích hiệu suất hệ thống và tiến độ dự án
            </p>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Custom Dropdown chọn dự án */}
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-white border border-gray-200 text-gray-700 text-[13px] font-medium rounded-lg px-3 py-2 shadow-sm cursor-pointer min-w-[200px] flex items-center justify-between gap-2 hover:border-gray-300 transition-colors select-none"
              >
                <div className="flex items-center gap-2 truncate">
                  <Briefcase size={15} className="text-indigo-600 shrink-0" />
                  <span className="truncate">{currentProjectName}</span>
                </div>
                <ChevronDown
                  size={15}
                  className={`text-gray-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>

              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl py-1 max-h-60 overflow-y-auto z-[99999]">
                  <div
                    onClick={() => {
                      setSelectedProject("all");
                      setIsDropdownOpen(false);
                    }}
                    className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition-colors ${selectedProject === "all" ? "bg-indigo-50/70 text-indigo-600 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                  >
                    <span>Tất cả dự án</span>
                    {selectedProject === "all" && (
                      <Check size={14} className="text-indigo-600" />
                    )}
                  </div>
                  {projectsList.map((proj) => {
                    const isSelected =
                      String(selectedProject) === String(proj.id);
                    return (
                      <div
                        key={proj.id}
                        onClick={() => {
                          setSelectedProject(proj.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition-colors ${isSelected ? "bg-indigo-50/70 text-indigo-600 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                      >
                        <span className="truncate">{proj.name}</span>
                        {isSelected && (
                          <Check
                            size={14}
                            className="text-indigo-600 shrink-0"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- KHU VỰC 1: OVERVIEW METRICS --- */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0 animate-page-slide stagger-2"
          style={{ animationFillMode: "forwards" }}
        >
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
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

        {/* --- KHU VỰC 2: BIỂU ĐỒ CHÍNH --- */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 animate-page-slide stagger-3"
          style={{ animationFillMode: "forwards" }}
        >
          {/* CỘT TRÁI: Biểu đồ đường (Dữ liệu 30 ngày) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col h-[380px]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">
                  Hiệu suất hoàn thành công việc
                </h3>
                <p className="text-[12px] text-gray-500">
                  So sánh số task thêm mới và hoàn thành trong 1 tháng
                </p>
              </div>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
                <TrendingUp size={18} />
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={performanceData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorCompleted"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Hoàn thành"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCompleted)"
                    activeDot={{ r: 5, strokeWidth: 0, fill: "#10b981" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="newTasks"
                    name="Thêm mới"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorNew)"
                    activeDot={{ r: 5, strokeWidth: 0, fill: "#6366f1" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CỘT PHẢI: Donut Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col h-[380px]">
            <div className="mb-4 shrink-0">
              <h3 className="text-[15px] font-bold text-gray-900">
                Phân bổ trạng thái
              </h3>
              <p className="text-[12px] text-gray-500">
                Tỷ lệ task theo các cột Kanban
              </p>
            </div>

            <div className="flex-1 relative w-full min-h-0 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} task`, "Số lượng"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                    itemStyle={{ color: "#1f2937" }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                <span className="text-3xl font-black text-gray-900">
                  {totalTasksDonut}
                </span>
                <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                  Tổng Task
                </span>
              </div>
            </div>

            <div className="flex justify-between gap-2 mt-4 shrink-0 pt-4 border-t border-gray-100 px-2">
              {statusData.map((status, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: status.color }}
                    ></span>
                    <span className="text-[11px] text-gray-500 font-semibold whitespace-nowrap">
                      {status.name}
                    </span>
                  </div>
                  <span className="text-[14px] font-bold text-gray-900">
                    {status.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- KHU VỰC 3: BẢNG HIỆU SUẤT ĐỘI NGŨ --- */}
        <div
          className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden shrink-0 animate-page-slide stagger-4"
          style={{ animationFillMode: "forwards" }}
        >
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">
                Hiệu suất thành viên
              </h3>
              <p className="text-[12px] text-gray-500">
                Đánh giá tiến độ xử lý công việc của từng cá nhân
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="py-3 px-5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                    Thành viên
                  </th>
                  <th className="py-3 px-5 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">
                    Tổng Task
                  </th>
                  <th className="py-3 px-5 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">
                    Đã xong
                  </th>
                  <th className="py-3 px-5 text-[12px] font-bold text-gray-500 uppercase tracking-wider text-center">
                    Quá hạn
                  </th>
                  <th className="py-3 px-5 text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                    Tỷ lệ hoàn thành
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teamPerformance.length > 0 ? (
                  teamPerformance.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold shadow-sm bg-indigo-600">
                            {user.avatar}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[14px] font-semibold text-gray-900">
                              {user.name}
                            </span>
                            <span className="text-[12px] text-gray-500">
                              {user.role}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-center font-medium text-gray-700">
                        {user.total}
                      </td>
                      <td className="py-3 px-5 text-center font-medium text-emerald-600">
                        {user.done}
                      </td>
                      <td className="py-3 px-5 text-center font-medium">
                        {user.overdue > 0 ? (
                          <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-md text-[12px] font-bold">
                            {user.overdue}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-gray-100 rounded-full h-2 max-w-[150px]">
                            <div
                              className={`h-2 rounded-full ${user.efficiency >= 80 ? "bg-emerald-500" : user.efficiency >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${user.efficiency}%` }}
                            ></div>
                          </div>
                          <span className="text-[13px] font-bold text-gray-700 w-10">
                            {user.efficiency}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="5"
                      className="py-8 text-center text-gray-400 text-[13px]"
                    >
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
