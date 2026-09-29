import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams, useOutletContext } from "react-router-dom";
import apiClient from "../../utils/apiClient";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const parseJwt = (token) => {
  try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; }
};

const ProjectCalendar = () => {
  const { projectId } = useParams();
  const outletContext = useOutletContext() || {};
  const { setSelectedTaskId } = outletContext;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userPermissions, setUserPermissions] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // ==== Preferences ====
  const { accent } = usePreferences();
  const A = getAccent(accent);

  useEffect(() => {
    if (!projectId) return;
    const token = localStorage.getItem("accessToken")
      || (localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).token : null);
    if (token) {
      const decoded = parseJwt(token);
      const userId = decoded?.sub || decoded?.id || decoded?.userId;
      setCurrentUserId(userId);
      if (userId) {
        apiClient.get(`http://localhost:8083/api/projects/${projectId}/users/${userId}/permissions`)
          .then(res => setUserPermissions(res.data || []))
          .catch(err => console.error("Lỗi lấy quyền:", err));
      }
    }
  }, [projectId]);

  const canUpdateTask = userPermissions.includes("TASK_UPDATE") || userPermissions.includes("PROJECT_UPDATE");

  const fetchCalendarTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8085/api/tasks/project/${projectId}`);
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Lỗi tải task cho lịch:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchCalendarTasks();
  }, [projectId, fetchCalendarTasks]);

  useEvent(EVENTS.TASK, (data) => {
    if (String(data.projectId) === String(projectId)) fetchCalendarTasks();
  });

  const handlePrevMonth = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

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
    gridCells.push({ dayNumber: dayNum, month: pMonth, year: pYear, isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    gridCells.push({ dayNumber: i, month, year, isCurrentMonth: true });
  }
  const totalCellsNeeded = gridCells.length <= 35 ? 35 : 42;
  const remainingCells = totalCellsNeeded - gridCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nMonth = month === 11 ? 0 : month + 1;
    const nYear = month === 11 ? year + 1 : year;
    gridCells.push({ dayNumber: i, month: nMonth, year: nYear, isCurrentMonth: false });
  }

  const today = new Date();
  const isTodayCheck = (dayNum, cellMonth, cellYear) =>
    today.getDate() === dayNum && today.getMonth() === cellMonth && today.getFullYear() === cellYear;

  // Priority colors là SEMANTIC — giữ nguyên
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "URGENT": return "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/20";
      case "HIGH":   return "bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20 hover:bg-orange-200 dark:hover:bg-orange-500/20";
      case "MEDIUM": return "bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/20";
      default:       return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600";
    }
  };

  const daysHeader = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const { validTasks, taskRows } = useMemo(() => {
    const processedTasks = tasks
      .map((task) => {
        let startObj = null, dueObj = null;
        if (task.dueDate) {
          const dParts = task.dueDate.split("-");
          dueObj = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, parseInt(dParts[2], 10));
          dueObj.setHours(0, 0, 0, 0);
        }
        if (task.startDate) {
          const sParts = task.startDate.split("-");
          startObj = new Date(parseInt(sParts[0], 10), parseInt(sParts[1], 10) - 1, parseInt(sParts[2], 10));
          startObj.setHours(0, 0, 0, 0);
        } else if (dueObj) startObj = new Date(dueObj);
        return { ...task, startObj, dueObj };
      })
      .filter((t) => t.startObj && t.dueObj);

    processedTasks.sort((a, b) =>
      a.startObj.getTime() - b.startObj.getTime() ||
      b.dueObj.getTime() - a.dueObj.getTime() ||
      a.id.localeCompare(b.id)
    );

    const allocationRows = {};
    const occupiedSlots = {};

    processedTasks.forEach((task) => {
      let row = 0, foundSpace = false;
      const dateKeys = [];
      let current = new Date(task.startObj);
      while (current <= task.dueObj) {
        dateKeys.push(current.getTime());
        current.setDate(current.getDate() + 1);
      }
      while (!foundSpace) {
        let conflict = false;
        for (const t of dateKeys) {
          if (occupiedSlots[t] && occupiedSlots[t][row]) { conflict = true; break; }
        }
        if (!conflict) foundSpace = true; else row++;
      }
      allocationRows[task.id] = row;
      for (const t of dateKeys) {
        if (!occupiedSlots[t]) occupiedSlots[t] = {};
        occupiedSlots[t][row] = true;
      }
    });

    return { validTasks: processedTasks, taskRows: allocationRows };
  }, [tasks]);

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col bg-white dark:bg-gray-900 overflow-y-auto relative font-sans transition-colors">
      {loading && (
        <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
          <Loader2 className={`animate-spin mb-2 ${A.text}`} size={32} />
          <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium">Đang tải lịch biểu...</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-[18px] font-bold text-gray-900 dark:text-white">
          {monthNames[month]}, {year}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors cursor-pointer">
            <ChevronLeft size={16} />
          </button>
          <button onClick={handleToday} className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-[13px] font-medium text-gray-700 dark:text-gray-300 transition-colors cursor-pointer">
            Hôm nay
          </button>
          <button onClick={handleNextMonth} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors cursor-pointer">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col border border-gray-200 dark:border-gray-700 rounded-xl overflow-x-auto shadow-sm transition-colors">
        <div className="min-w-[700px] min-h-[600px] flex-1 flex flex-col">
          <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 transition-colors">
            {daysHeader.map((d) => (
              <div key={d} className="py-2 text-center text-[12px] font-bold text-gray-500 dark:text-gray-400">{d}</div>
            ))}
          </div>

          <div className={`flex-1 grid grid-cols-7 ${gridCells.length === 42 ? "grid-rows-6" : "grid-rows-5"}`}>
            {gridCells.map((cell, idx) => {
              const { dayNumber, month: cellMonth, year: cellYear, isCurrentMonth } = cell;
              const isToday = isTodayCheck(dayNumber, cellMonth, cellYear);

              const cellDateObj = new Date(cellYear, cellMonth, dayNumber);
              cellDateObj.setHours(0, 0, 0, 0);
              const cellTime = cellDateObj.getTime();

              const todaysTasks = validTasks.filter((t) => cellTime >= t.startObj.getTime() && cellTime <= t.dueObj.getTime());
              const maxRow = todaysTasks.length > 0 ? Math.max(...todaysTasks.map((t) => taskRows[t.id])) : -1;

              const rowsToRender = [];
              for (let r = 0; r <= maxRow; r++) {
                const task = todaysTasks.find((t) => taskRows[t.id] === r);

                if (task) {
                  const isDone = task.status === "DONE" || task.status === "COMPLETED";
                  const displayStyle = isDone
                    ? "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 opacity-80"
                    : getPriorityStyle(task.priority);

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
                      onClick={() => { if (setSelectedTaskId) setSelectedTaskId(task.id); }}
                      className={`h-[22px] mb-[2px] flex items-center cursor-pointer transition-opacity duration-200 ${shapeClass} ${displayStyle} hover:shadow-sm`}
                      title={`${task.title} [${task.priority || "MEDIUM"}]`}
                    >
                      {showText && (
                        <div className={`flex items-center gap-1.5 px-1.5 overflow-hidden whitespace-nowrap w-full ${isDone ? "line-through decoration-gray-400" : ""}`}>
                          {isDone && <CheckCircle2 size={10} className="shrink-0 text-gray-500" />}
                          <span className="text-[10.5px] font-semibold truncate leading-none mt-[1px]">{task.title}</span>
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
                  className={`border-r border-b border-gray-100 dark:border-gray-800 pt-1 pb-1 transition-colors flex flex-col gap-0 overflow-hidden ${
                    isCurrentMonth
                      ? `bg-white dark:bg-gray-900 bg-[radial-gradient(#f3f4f6_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:12px_12px] ${A.softHoverBg}`
                      : "bg-gray-50/60 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600"
                  }`}
                >
                  <div className="flex justify-end px-1.5 mb-1">
                    <span
                      className={`text-[12px] font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${
                        isToday
                          ? `${A.bgOnly} text-white shadow-sm`
                          : isCurrentMonth
                          ? "text-gray-700 dark:text-gray-300"
                          : "text-gray-400 dark:text-gray-500"
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
    </div>
  );
};

export default ProjectCalendar;