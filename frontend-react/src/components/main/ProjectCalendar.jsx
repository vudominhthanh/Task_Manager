import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';

const ProjectCalendar = () => {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date()); 

  const getToken = () => localStorage.getItem("accessToken") || "";

  const fetchCalendarTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`http://localhost:8085/api/tasks/project/${projectId}`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setTasks(await res.json());
      }
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

  // Realtime: Task thay đổi ngày/trạng thái/tạo mới -> Lịch tự cập nhật
  useEvent(EVENTS.TASK, fetchCalendarTasks);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); 
  const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

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
    gridCells.push({ dayNumber: i, month: month, year: year, isCurrentMonth: true });
  }

  const totalCellsNeeded = gridCells.length <= 35 ? 35 : 42;
  const remainingCells = totalCellsNeeded - gridCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nMonth = month === 11 ? 0 : month + 1;
    const nYear = month === 11 ? year + 1 : year;
    gridCells.push({ dayNumber: i, month: nMonth, year: nYear, isCurrentMonth: false });
  }

  const today = new Date();
  const isTodayCheck = (dayNum, cellMonth, cellYear) => {
    return today.getDate() === dayNum &&
           today.getMonth() === cellMonth &&
           today.getFullYear() === cellYear;
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200';
    }
  };

  const daysHeader = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  // ----------------------------------------------------------------------
  // THUẬT TOÁN TIỀN XỬ LÝ TASK CHO LỊCH
  // ----------------------------------------------------------------------
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

        return { ...task, startObj, dueObj };
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
  }, [tasks]);

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col bg-white overflow-y-auto relative font-sans">
      
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
          <span className="text-gray-500 text-[13px] font-medium">Đang tải lịch biểu...</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-[18px] font-bold text-gray-900">{monthNames[month]}, {year}</h2>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer">
            <ChevronLeft size={16} />
          </button>
          <button onClick={handleToday} className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-[13px] font-medium text-gray-700 transition-colors cursor-pointer">
            Hôm nay
          </button>
          <button onClick={handleNextMonth} className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
        <div className="min-w-[700px] min-h-[600px] flex-1 flex flex-col">
          
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {daysHeader.map(d => (
              <div key={d} className="py-2 text-center text-[12px] font-bold text-gray-500">{d}</div>
            ))}
          </div>
          
          <div className={`flex-1 grid grid-cols-7 ${gridCells.length === 42 ? 'grid-rows-6' : 'grid-rows-5'}`}>
            {gridCells.map((cell, idx) => {
              const { dayNumber, month: cellMonth, year: cellYear, isCurrentMonth } = cell;
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
                  const isDone = task.status === 'DONE' || task.status === 'COMPLETED';
                  
                  // LOGIC MỚI: Nếu Done thì ép cứng nền xám, bỏ qua màu Priority
                  const displayStyle = isDone 
                    ? 'bg-gray-200 border-gray-300 text-gray-500 opacity-80' 
                    : getPriorityStyle(task.priority);
                  
                  const isActualStart = cellTime === task.startObj.getTime();
                  const isActualEnd = cellTime === task.dueObj.getTime();
                  const isStartOfWeek = cellDateObj.getDay() === 1; // Thứ 2
                  
                  let shapeClass = "border-y "; 
                  
                  if (isActualStart) shapeClass += "rounded-l-[4px] border-l ml-1 ";
                  else shapeClass += "border-l-0 ml-0 "; 

                  if (isActualEnd) shapeClass += "rounded-r-[4px] border-r mr-1 ";
                  else shapeClass += "border-r-0 mr-0 "; 

                  const showText = isActualStart || isStartOfWeek;

                  rowsToRender.push(
                    <div
                      key={task.id}
                      className={`h-[22px] mb-[2px] flex items-center cursor-pointer transition-opacity duration-200 ${shapeClass} ${displayStyle}`}
                      title={`${task.title} [${task.priority || 'MEDIUM'}]`}
                    >
                      {showText && (
                        <div className={`flex items-center gap-1.5 px-1.5 overflow-hidden whitespace-nowrap w-full ${isDone ? "line-through decoration-gray-400" : ""}`}>
                          {isDone && <CheckCircle2 size={10} className="shrink-0 text-gray-500" />}
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
                  className={`border-r border-b border-gray-100 pt-1 pb-1 transition-colors flex flex-col gap-0 overflow-hidden ${
                    isCurrentMonth 
                      ? 'bg-white bg-[radial-gradient(#f3f4f6_1px,transparent_1px)] [background-size:12px_12px] hover:bg-gray-50/50' 
                      : 'bg-gray-50/60 text-gray-400'
                  }`}
                >
                  <div className="flex justify-end px-1.5 mb-1">
                    <span className={`text-[12px] font-medium w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${
                      isToday ? 'bg-indigo-600 text-white shadow-sm' : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'
                    }`}>
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