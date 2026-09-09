import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Calendar,
  FolderGit2,
  X,
  Clock,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

const GlobalCalendar = () => {
  const [tasks, setTasks] = useState([]);
  const [projectsMap, setProjectsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [selectedTaskIndex, setSelectedTaskIndex] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const getToken = () => localStorage.getItem("accessToken") || "";

  const projectColors = [
    "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
    "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100",
    "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
    "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100",
  ];

  const getProjectStyle = (projectId) => {
    if (!projectId) return "bg-gray-50 text-gray-700 border-gray-200";
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
      hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % projectColors.length;
    return projectColors[index];
  };

  const fetchMyCalendarTasks = useCallback(async () => {
    try {
      const token = getToken();
      
      const projIdsRes = await fetch(`http://localhost:8083/api/projects/my-project-ids`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!projIdsRes.ok) return;
      const projectIds = await projIdsRes.json();

      const projMap = {};
      for (const pId of projectIds) {
        try {
          const pRes = await fetch(`http://localhost:8083/api/projects/${pId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (pRes.ok) {
            const pData = await pRes.json();
            projMap[pId] = pData.name || "Dự án không tên";
          }
        } catch (e) {
          projMap[pId] = "Dự án";
        }
      }
      setProjectsMap(projMap);

      const taskRes = await fetch(`http://localhost:8085/api/tasks/assignee/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (taskRes.ok) {
        const myTasks = await taskRes.json();
        setTasks(myTasks);
      }
    } catch (error) {
      console.error("Lỗi đồng bộ lịch tổng hợp cá nhân:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchMyCalendarTasks();
  }, [fetchMyCalendarTasks]);

  // Nhận Realtime: Task đổi ngày, thêm mới, xóa -> Lịch tự cập nhật
  useEvent(EVENTS.TASK, fetchMyCalendarTasks);
  useEvent(EVENTS.PROJECT, fetchMyCalendarTasks);

  const triggerMonthChange = (callback) => {
    setIsAnimating(true);
    setTimeout(() => {
      callback();
      setIsAnimating(false);
    }, 150);
  };

  const handlePrevMonth = () =>
    triggerMonthChange(() =>
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    );
  const handleNextMonth = () =>
    triggerMonthChange(() =>
      setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    );
  const handleToday = () =>
    triggerMonthChange(() => setCurrentDate(new Date()));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
  ];

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let startDayIndex = firstDayOfMonth.getDay() - 1;
  if (startDayIndex === -1) startDayIndex = 6;

  const daysInCurrentMonth = lastDayOfMonth.getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const gridCells = [];
  for (let i = startDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const pMonth = month === 0 ? 11 : month - 1;
    const pYear = month === 0 ? year - 1 : year;
    gridCells.push({
      dayNumber: dayNum,
      month: pMonth,
      year: pYear,
      isCurrentMonth: false,
    });
  }

  for (let i = 1; i <= daysInCurrentMonth; i++) {
    gridCells.push({
      dayNumber: i,
      month: month,
      year: year,
      isCurrentMonth: true,
    });
  }

  const totalCellsNeeded = gridCells.length <= 35 ? 35 : 42;
  const remainingCells = totalCellsNeeded - gridCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nMonth = month === 11 ? 0 : month + 1;
    const nYear = month === 11 ? year + 1 : year;
    gridCells.push({
      dayNumber: i,
      month: nMonth,
      year: nYear,
      isCurrentMonth: false,
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isTodayCheck = (dayNum, cellMonth, cellYear) => {
    return (
      today.getDate() === dayNum &&
      today.getMonth() === cellMonth &&
      today.getFullYear() === cellYear
    );
  };

  const daysHeader = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const selectedTask =
    selectedTaskIndex !== null ? tasks[selectedTaskIndex] : null;

  const handlePrevTask = () => {
    if (selectedTaskIndex > 0) setSelectedTaskIndex(selectedTaskIndex - 1);
  };

  const handleNextTask = () => {
    if (selectedTaskIndex < tasks.length - 1)
      setSelectedTaskIndex(selectedTaskIndex + 1);
  };

  const { validTasks, taskRows } = useMemo(() => {
    const processedTasks = tasks
      .map((task) => {
        let startObj = null;
        let dueObj = null;

        if (task.dueDate) {
          const dParts = task.dueDate.split("-");
          dueObj = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, parseInt(dParts[2], 10));
          dueObj.setHours(0, 0, 0, 0);
        }
        if (task.startDate) {
          const sParts = task.startDate.split("-");
          startObj = new Date(parseInt(sParts[0], 10), parseInt(sParts[1], 10) - 1, parseInt(sParts[2], 10));
          startObj.setHours(0, 0, 0, 0);
        } else if (dueObj) {
          startObj = new Date(dueObj); 
        }

        const isDone = task.status === "DONE" || task.status === "COMPLETED";
        const isOverdue = !isDone && dueObj && dueObj < today;

        // Nếu quá hạn và chưa xong, kéo dài hạn chót giả định đến ngày hôm nay để lấp đầy lịch
        let effectiveDueObj = dueObj;
        if (isOverdue && dueObj < today) {
          effectiveDueObj = new Date(today);
        }

        return { ...task, startObj, dueObj: effectiveDueObj, isOverdue, isDone };
      })
      .filter((t) => t.startObj && t.dueObj); 

    processedTasks.sort((a, b) => {
      return (
        a.startObj.getTime() - b.startObj.getTime() ||
        b.dueObj.getTime() - a.dueObj.getTime() ||
        a.id.localeCompare(b.id)
      );
    });

    const allocationRows = {}; 
    const occupiedSlots = {};  

    processedTasks.forEach((task) => {
      let row = 0;
      let foundSpace = false;

      const dateKeys = [];
      let current = new Date(task.startObj);
      while (current <= task.dueObj) {
        dateKeys.push(current.getTime());
        current.setDate(current.getDate() + 1);
      }

      while (!foundSpace) {
        let conflict = false;
        for (const t of dateKeys) {
          if (occupiedSlots[t] && occupiedSlots[t][row]) {
            conflict = true;
            break;
          }
        }
        if (!conflict) {
          foundSpace = true;
        } else {
          row++;
        }
      }

      allocationRows[task.id] = row;
      for (const t of dateKeys) {
        if (!occupiedSlots[t]) occupiedSlots[t] = {};
        occupiedSlots[t][row] = true;
      }
    });

    return { validTasks: processedTasks, taskRows: allocationRows };
  }, [tasks, today]);

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col bg-white overflow-y-auto relative font-sans">
      <style>{`
        @keyframes pageSlideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoomInCenter {
          0% { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-page-slide {
          animation: pageSlideUp 0.4s ease-out forwards;
          opacity: 0;
        }
        .animate-zoom-in {
          animation: zoomInCenter 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {loading && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center transition-all">
          <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
          <span className="text-gray-500 text-[13px] font-medium">
            Đang tổng hợp lịch từ các dự án...
          </span>
        </div>
      )}

      {/* Header điều hướng Tháng / Năm */}
      <div className="flex justify-between items-center mb-6 shrink-0 animate-page-slide stagger-1" style={{ animationFillMode: 'forwards' }}>
        <div>
          <h2 className="text-[18px] font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="text-indigo-600" size={20} /> Lịch Tổng Hợp Dự Án
          </h2>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Toàn bộ công việc của bạn trên các hệ thống dự án
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-[16px] font-bold text-gray-800 transition-all">
            {monthNames[month]}, {year}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 text-gray-600 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 text-[13px] font-medium text-gray-700 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              Hôm nay
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 text-gray-600 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Lưới lịch */}
      <div className="flex-1 flex flex-col border border-gray-200 rounded-xl overflow-x-auto shadow-xs animate-page-slide stagger-2" style={{ animationFillMode: 'forwards' }}>
        <div className="min-w-[800px] flex-1 flex flex-col">
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {daysHeader.map((d) => (
              <div
                key={d}
                className="py-2 text-center text-[12px] font-bold text-gray-500 tracking-wider"
              >
                {d}
              </div>
            ))}
          </div>

          <div
            className={`grid grid-cols-7 ${
              gridCells.length === 42 ? "grid-rows-6" : "grid-rows-5"
            } transition-opacity duration-200 ${isAnimating ? "opacity-30 scale-[0.99]" : "opacity-100 scale-100"}`}
            style={{ minHeight: "750px" }}
          >
            {gridCells.map((cell, idx) => {
              const {
                dayNumber,
                month: cellMonth,
                year: cellYear,
                isCurrentMonth,
              } = cell;
              
              const isToday = isTodayCheck(dayNumber, cellMonth, cellYear);
              
              const cellDateObj = new Date(cellYear, cellMonth, dayNumber);
              cellDateObj.setHours(0, 0, 0, 0);
              const cellTime = cellDateObj.getTime();

              const todaysTasks = validTasks.filter(
                (t) => cellTime >= t.startObj.getTime() && cellTime <= t.dueObj.getTime()
              );

              const maxRow = todaysTasks.length > 0 
                ? Math.max(...todaysTasks.map(t => taskRows[t.id])) 
                : -1;

              const rowsToRender = [];
              for (let r = 0; r <= maxRow; r++) {
                const task = todaysTasks.find((t) => taskRows[t.id] === r);
                
                if (task) {
                  const projectName = projectsMap[task.projectId] || "Dự án";
                  const originalIndex = tasks.findIndex((t) => t.id === task.id);
                  
                  // Ưu tiên style màu đỏ nếu task bị quá hạn và chưa hoàn thành
                  const displayStyle = task.isDone
                    ? "bg-gray-100 border-gray-200 text-gray-400 opacity-75"
                    : task.isOverdue
                    ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-2xs"
                    : getProjectStyle(task.projectId);
                  
                  const isActualStart = cellTime === task.startObj.getTime();
                  const isActualEnd = cellTime === task.dueObj.getTime();
                  const isStartOfWeek = cellDateObj.getDay() === 1; 
                  
                  let shapeClass = "border-y "; 
                  
                  if (isActualStart) shapeClass += "rounded-l-[4px] border-l ml-1 ";
                  else shapeClass += "border-l-0 ml-0 "; 

                  if (isActualEnd) shapeClass += "rounded-r-[4px] border-r mr-1 ";
                  else shapeClass += "border-r-0 mr-0 "; 

                  const showText = isActualStart || isStartOfWeek;

                  rowsToRender.push(
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskIndex(originalIndex)}
                      className={`h-[22px] mb-[2px] flex items-center cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:brightness-95 ${shapeClass} ${displayStyle}`}
                      title={`[${projectName}] ${task.title} ${task.isOverdue ? "(Quá hạn)" : ""}`}
                    >
                      {showText && (
                        <div className={`flex items-center gap-1.5 px-1.5 overflow-hidden whitespace-nowrap w-full ${task.isDone ? "line-through decoration-gray-300" : ""}`}>
                          {task.isDone ? (
                            <CheckCircle2 size={10} className="shrink-0 text-gray-400" />
                          ) : task.isOverdue ? (
                            <AlertCircle size={10} className="shrink-0 text-red-500 animate-pulse" />
                          ) : (
                            <FolderGit2 size={10} className="shrink-0 opacity-70" />
                          )}
                          <span className="text-[10.5px] font-semibold truncate leading-none mt-[1px]">
                            {task.title}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                } else {
                  rowsToRender.push(<div key={`empty-${r}`} className="h-[22px] mb-[2px]"></div>);
                }
              }

              return (
                <div
                  key={idx}
                  className={`border-r border-b border-gray-100 pt-1 pb-1 transition-all duration-200 flex flex-col gap-0 overflow-hidden group ${
                    isCurrentMonth
                      ? "bg-white bg-[radial-gradient(#f3f4f6_1px,transparent_1px)] [background-size:12px_12px] hover:bg-indigo-50/20"
                      : "bg-gray-50/60 text-gray-400"
                  }`}
                >
                  <div className="flex justify-end px-1.5 mb-1">
                    <span
                      className={`text-[12px] font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0 transition-transform group-hover:scale-110 ${
                        isToday
                          ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200"
                          : isCurrentMonth
                          ? "text-gray-700"
                          : "text-gray-400"
                      }`}
                    >
                      {dayNumber}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col w-full">
                    {rowsToRender}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL CHI TIẾT */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-opacity duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 relative animate-zoom-in">
            <button
              onClick={handlePrevTask}
              disabled={selectedTaskIndex === 0}
              className={`absolute left-3 md:left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all active:scale-90 z-10 cursor-pointer ${
                selectedTaskIndex === 0 ? "opacity-30 cursor-not-allowed" : ""
              }`}
            >
              <ArrowLeft size={16} />
            </button>

            <button
              onClick={handleNextTask}
              disabled={selectedTaskIndex === tasks.length - 1}
              className={`absolute right-3 md:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white shadow-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all active:scale-90 z-10 cursor-pointer ${
                selectedTaskIndex === tasks.length - 1 ? "opacity-30 cursor-not-allowed" : ""
              }`}
            >
              <ArrowRight size={16} />
            </button>

            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs">
                <FolderGit2 size={12} />{" "}
                {projectsMap[selectedTask.projectId] || "Dự án"}
              </span>
              <button
                onClick={() => setSelectedTaskIndex(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-200/50 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-6 px-14 md:px-16 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      selectedTask.priority === "URGENT"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {selectedTask.priority || "MEDIUM"}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    Task {selectedTaskIndex + 1} / {tasks.length}
                  </span>
                </div>
                <h3 className={`text-[16px] font-bold leading-snug ${
                   selectedTask.status === "DONE" || selectedTask.status === "COMPLETED" 
                   ? "text-gray-400 line-through" 
                   : "text-gray-900"
                }`}>
                  {selectedTask.title}
                </h3>
                <p className="text-[13px] text-gray-500 mt-1.5 whitespace-pre-line max-h-32 overflow-y-auto leading-relaxed">
                  {selectedTask.description ||
                    "Không có mô tả chi tiết cho công việc này."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-[12px]">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">
                    Bắt đầu: <b>{selectedTask.startDate || "Chưa cập nhật"}</b>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={14} className="text-red-500 shrink-0" />
                  <span className="truncate">
                    Hạn chót: <b className="text-red-600">{selectedTask.dueDate || "Không có"}</b>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-[12px] text-gray-500 flex items-center gap-1">
                  Trạng thái:{" "}
                  <strong className="text-gray-800">
                    {selectedTask.status}
                  </strong>
                </span>
                <button
                  onClick={() => {
                    window.location.href = `/project/${selectedTask.projectId}/tasks?selectedTaskId=${selectedTask.id}`;
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[12px] font-semibold transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  Đi tới dự án
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalCalendar;