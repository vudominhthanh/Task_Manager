import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { MessageSquare, Paperclip, MoreHorizontal, Calendar, Plus, Search, Filter, CheckCircle2, Loader2, X, ChevronDown, Check, User } from "lucide-react";

const getPriorityStyles = (priority) => {
  switch (priority) {
    case 'HIGH': return 'text-red-500 font-bold';
    case 'MEDIUM': return 'text-orange-500 font-bold';
    case 'LOW': return 'text-green-500 font-bold';
    case 'URGENT': return 'text-red-600 font-black animate-pulse';
    default: return 'text-gray-500 font-bold';
  }
};

const avatarColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-purple-500", "bg-indigo-600"];

const KanbanBoard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const outletContext = useOutletContext() || {};
  const { setSelectedTaskId } = outletContext;

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");
  const [selectedLabel, setSelectedLabel] = useState("ALL");

  const [openDropdown, setOpenDropdown] = useState(null);
  const filterRef = useRef(null);

  const getToken = () => localStorage.getItem("accessToken") || "";

  useEffect(() => {
    if (!projectId) return;
  }, [projectId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getAssignee = (assigneeId) => {
    if (!assigneeId) return { fullName: "Chưa giao", avatarLetter: "?", avatarColor: "bg-gray-400" };
    
    const memberIndex = members.findIndex(m => m.userId === assigneeId);
    const member = members[memberIndex];
    
    if (member) {
      return { 
        fullName: member.fullName || "User", 
        avatarLetter: member.fullName ? member.fullName.charAt(0).toUpperCase() : "U", 
        avatarColor: avatarColors[memberIndex % avatarColors.length]
      };
    }
    return { fullName: "Chưa giao", avatarLetter: "?", avatarColor: "bg-gray-400" };
  };

  const columnsConfig = [
    { id: "TO_DO", title: "To Do", bgColumn: "bg-gray-50/70" },
    { id: "IN_PROGRESS", title: "In Progress", bgColumn: "bg-blue-50/40" },
    { id: "REVIEW", title: "Review", bgColumn: "bg-amber-50/40" },
    { id: "DONE", title: "Done", bgColumn: "bg-emerald-50/40", isDoneColumn: true }
  ];

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData("taskId", task.id);
    e.dataTransfer.setData("sourceStatus", task.status);
    setTimeout(() => {
      e.target.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = "1";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const sourceStatus = e.dataTransfer.getData("sourceStatus");

    if (!taskId || sourceStatus === targetStatus) return;

    setTasks(prevTasks => prevTasks.map(t => 
      t.id === taskId ? { ...t, status: targetStatus } : t
    ));

    try {
      const res = await fetch(`http://localhost:8085/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: targetStatus }) 
      });

      if (!res.ok) {
        throw new Error("Lỗi cập nhật từ server");
      }
    } catch (error) {
      console.error("Lỗi kéo thả:", error);
      setTasks(prevTasks => prevTasks.map(t => 
        t.id === taskId ? { ...t, status: sourceStatus } : t
      ));
      alert("Không thể cập nhật trạng thái, vui lòng kiểm tra lại kết nối / CORS!");
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = 
        (task.title && task.title.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        (task.description && task.description.toLowerCase().includes(searchKeyword.toLowerCase()));

      const matchesAssignee = selectedAssignee === "ALL" || task.assigneeId === selectedAssignee;
      const matchesPriority = selectedPriority === "ALL" || task.priority === selectedPriority;
      const matchesLabel = selectedLabel === "ALL" || (task.labels && task.labels.includes(selectedLabel));

      return matchesSearch && matchesAssignee && matchesPriority && matchesLabel;
    });
  }, [tasks, searchKeyword, selectedAssignee, selectedPriority, selectedLabel]);

  const clearAllFilters = () => {
    setSearchKeyword("");
    setSelectedAssignee("ALL");
    setSelectedPriority("ALL");
    setSelectedLabel("ALL");
  };

  const hasActiveFilters = searchKeyword || selectedAssignee !== "ALL" || selectedPriority !== "ALL" || selectedLabel !== "ALL";

  const selectedAssigneeObj = members.find(m => m.userId === selectedAssignee);
  const assigneeLabelText = selectedAssignee === "ALL" ? "Tất cả người phụ trách" : (selectedAssigneeObj?.fullName || selectedAssigneeObj?.username || "Thành viên");

  const priorityLabels = {
    ALL: "Mọi độ ưu tiên",
    URGENT: "Urgent",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low"
  };

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`http://localhost:8085/api/tasks/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Lỗi tải task:", err);
    }
  }, [projectId]);

  const fetchBoardMembers = useCallback(async () => {
    if (!projectId) return;
    try {
      const token = localStorage.getItem("accessToken");
      const membersRes = await fetch(`http://localhost:8083/api/projects/${projectId}/members`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (membersRes.ok) setMembers(await membersRes.json());
    } catch (err) {
      console.error("Lỗi tải danh sách thành viên:", err);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([fetchTasks(), fetchBoardMembers()]).finally(() => setLoading(false));
  }, [projectId, fetchTasks, fetchBoardMembers]);

  useEvent(EVENTS.TASK, fetchTasks);
  useEvent(EVENTS.COMMENT, fetchTasks);
  useEvent(EVENTS.ATTACHMENT, fetchTasks);
  useEvent(EVENTS.MEMBER, fetchBoardMembers);

  useEvent(EVENTS.NOTIFICATION, fetchTasks);

  return (
    <div className="pt-5 px-4 lg:px-6 bg-white w-full h-full font-sans flex flex-col min-h-0 overflow-hidden relative">
      
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
          <span className="text-gray-500 text-[13px] font-medium">Đang tải công việc...</span>
        </div>
      )}

      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="flex flex-wrap justify-between items-center mb-5 gap-3 shrink-0 relative z-40" ref={filterRef}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm kiếm task..." 
              className="w-[200px] pl-9 pr-3 py-2 text-[13px] bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-indigo-400 text-gray-700" 
            />
          </div>

          {/* Custom Dropdown Lọc Người phụ trách */}
          <div className="relative">
            <div 
              onClick={() => setOpenDropdown(openDropdown === 'assignee' ? null : 'assignee')}
              className="bg-white border border-gray-200 text-gray-700 text-[13px] font-medium rounded-lg px-3 py-2 shadow-sm cursor-pointer min-w-[210px] flex items-center justify-between gap-2 hover:border-gray-300 transition-colors select-none"
            >
              <div className="flex items-center gap-2 truncate">
                <User size={15} className="text-indigo-600 shrink-0" />
                <span className="truncate">{assigneeLabelText}</span>
              </div>
              <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform duration-200 ${openDropdown === 'assignee' ? 'rotate-180' : ''}`} />
            </div>

            {openDropdown === 'assignee' && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-gray-100 rounded-xl shadow-2xl py-1 max-h-56 overflow-y-auto z-[99999]">
                <div 
                  onClick={() => { setSelectedAssignee("ALL"); setOpenDropdown(null); }}
                  className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition-colors ${selectedAssignee === "ALL" ? 'bg-indigo-50/70 text-indigo-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <span>Tất cả người phụ trách</span>
                  {selectedAssignee === "ALL" && <Check size={14} className="text-indigo-600" />}
                </div>
                {members.map(m => {
                  const isSelected = selectedAssignee === m.userId;
                  const name = m.fullName || m.username;
                  return (
                    <div 
                      key={m.userId}
                      onClick={() => { setSelectedAssignee(m.userId); setOpenDropdown(null); }}
                      className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-50/70 text-indigo-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <span className="truncate">{name}</span>
                      {isSelected && <Check size={14} className="text-indigo-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Dropdown Lọc Độ ưu tiên */}
          <div className="relative">
            <div 
              onClick={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
              className="bg-white border border-gray-200 text-gray-700 text-[13px] font-medium rounded-lg px-3 py-2 shadow-sm cursor-pointer min-w-[160px] flex items-center justify-between gap-2 hover:border-gray-300 transition-colors select-none"
            >
              <span className="truncate">{priorityLabels[selectedPriority]}</span>
              <ChevronDown size={15} className={`text-gray-400 shrink-0 transition-transform duration-200 ${openDropdown === 'priority' ? 'rotate-180' : ''}`} />
            </div>

            {openDropdown === 'priority' && (
              <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-gray-100 rounded-xl shadow-2xl py-1 z-[99999]">
                {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => {
                  const isSelected = selectedPriority === p;
                  return (
                    <div 
                      key={p}
                      onClick={() => { setSelectedPriority(p); setOpenDropdown(null); }}
                      className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-50/70 text-indigo-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <span>{priorityLabels[p]}</span>
                      {isSelected && <Check size={14} className="text-indigo-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Nút reset bộ lọc nếu có thay đổi */}
          {hasActiveFilters && (
            <button 
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-[12px] text-red-500 hover:text-red-700 bg-red-50 px-2.5 py-2 rounded-lg border border-red-100 transition-colors cursor-pointer"
            >
              <X size={14} /> Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 xl:gap-4 h-full min-h-0 pb-3 overflow-x-auto">
        {columnsConfig.map((column) => {
          const columnTasks = filteredTasks.filter(task => task.status === column.id);

          return (
            <div 
              key={column.id} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`flex flex-col flex-1 min-w-[220px] max-w-[320px] h-full rounded-xl overflow-hidden ${column.bgColumn}`}
            >
              <div className="flex justify-between items-center p-3 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-[13px] font-bold ${column.id === 'IN_PROGRESS' ? 'text-indigo-600' : column.id === 'REVIEW' ? 'text-amber-600' : column.id === 'DONE' ? 'text-emerald-600' : 'text-gray-800'}`}>
                    {column.title}
                  </h3>
                  <span className="text-[11px] font-semibold text-gray-500 bg-white/70 border border-gray-200 px-2 rounded-full">{columnTasks.length}</span>
                </div>
                <button className="text-gray-400 hover:text-gray-700 cursor-pointer"><MoreHorizontal size={16} /></button>
              </div>

              <div className="flex-1 flex flex-col gap-3 overflow-y-auto px-2 pb-3 min-h-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {columnTasks.map((task) => {
                  const assignee = getAssignee(task.assigneeId);
                  
                  return (
                    <div 
                      key={task.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (setSelectedTaskId) setSelectedTaskId(task.id);
                      }}
                      className="bg-white p-3 rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col group relative"
                    >
                      {column.isDoneColumn && <CheckCircle2 size={16} className="absolute top-3 right-3 text-emerald-500" />}

                      <span className={`text-[9px] w-fit uppercase tracking-wider mb-1 px-1.5 py-0.5 rounded-sm bg-gray-50 ${getPriorityStyles(task.priority)}`}>
                        {task.priority || "MEDIUM"}
                      </span>

                      <h4 className="text-[13px] font-bold text-gray-900 leading-snug group-hover:text-indigo-600 transition-colors mb-1 pr-4 truncate">
                        {task.title}
                      </h4>
                      
                      <p className="text-[11.5px] text-gray-500 leading-relaxed mb-3 line-clamp-2">
                        {task.description || "Chưa có mô tả..."}
                      </p>

                      <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-gray-50">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${assignee.avatarColor}`}>
                              {assignee.avatarLetter}
                            </div>
                            <span className="text-[11px] font-medium text-gray-600 truncate">{assignee.fullName}</span>
                          </div>
                          
                          {task.dueDate && (
                            <div className={`flex items-center gap-1 text-[10px] font-medium shrink-0 ${task.priority === 'HIGH' || task.priority === 'URGENT' ? 'text-red-500' : 'text-gray-400'}`}>
                              <Calendar size={11} /> {task.dueDate}
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                          <div className="flex items-center gap-2.5">
                            <span 
                              className={`flex items-center gap-1 ${task.commentCount > 0 ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}
                              title={`${task.commentCount || 0} bình luận`}
                            >
                              <MessageSquare size={12} /> {task.commentCount || 0}
                            </span>
                            <span 
                              className={`flex items-center gap-1 ${task.attachmentCount > 0 ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}
                              title={`${task.attachmentCount || 0} tệp đính kèm`}
                            >
                              <Paperclip size={12} /> {task.attachmentCount || 0}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 flex-1 max-w-[60px] justify-end">
                            <div className="flex-1 bg-gray-100 rounded-full h-1">
                              <div className={`h-1 rounded-full ${column.isDoneColumn ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: column.isDoneColumn ? '100%' : '50%' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })} 
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;