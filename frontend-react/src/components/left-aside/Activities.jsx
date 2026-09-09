import React, { useState, useRef, useEffect, useCallback } from "react";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import axios from "axios";
import { 
  Activity, CheckCircle, MessageSquare, Plus, Edit2, 
  Trash2, Search, ChevronDown, Paperclip, UserCheck, LogIn
} from "lucide-react";

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("Tất cả dự án");

  const [projects, setProjects] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.get("http://localhost:8083/api/projects", {
        headers: { Authorization: `Bearer ${token}` },
        params: { size: 50 }
      });
      setProjects(response.data.content || response.data);
    } catch (error) {
      console.error("Lỗi khi tải danh sách dự án:", error);
    }
  };

  const fetchActivities = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");

      const response = await axios.get("http://localhost:8081/api/activities", {
        headers: {
          Authorization: `Bearer ${token}`, 
          "Content-Type": "application/json",
        },
        params: {
          search: search,
          project: selectedProject === "Tất cả dự án" ? "" : selectedProject
        }
      });
      setActivities(response.data);
    } catch (error) {
      console.error("Lỗi khi tải nhật ký hoạt động:", error);
    }
  }, [search, selectedProject]);

  useEffect(() => {
    fetchProjects();

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [search, selectedProject]);

  useEvent(EVENTS.TASK, fetchActivities);
  useEvent(EVENTS.COMMENT, fetchActivities);
  useEvent(EVENTS.ATTACHMENT, fetchActivities);
  useEvent(EVENTS.PROJECT, fetchActivities);
  useEvent(EVENTS.MEMBER, fetchActivities);

  const getActionIcon = (type) => {
    switch(type) {
      case 'TASK_STATUS_UPDATED':
      case 'status_update': return <CheckCircle size={14} className="text-emerald-500" />;
      case 'COMMENT_CREATED':
      case 'comment': return <MessageSquare size={14} className="text-blue-500" />;
      case 'TASK_CREATED':
      case 'PROJECT_CREATED':
      case 'SUB_TASK_CREATED':
      case 'MEMBER_ADDED':
      case 'USER_REGISTERED':
      case 'create': return <Plus size={14} className="text-indigo-500" />;
      case 'TASK_DELETED':
      case 'PROJECT_DELETED':
      case 'COMMENT_DELETED':
      case 'ATTACHMENT_DELETED':
      case 'MEMBER_REMOVED':
      case 'delete': return <Trash2 size={14} className="text-red-500" />;
      case 'ATTACHMENT_CREATED':
      case 'attachment': return <Paperclip size={14} className="text-orange-500" />;
      case 'TASK_UPDATED':
      case 'PROJECT_UPDATED':
      case 'MEMBER_ROLE_UPDATED':
      case 'edit': return <Edit2 size={14} className="text-gray-500" />;
      case 'USER_LOGGED_IN': return <LogIn size={14} className="text-emerald-600" />;
      default: return <Activity size={14} className="text-gray-500" />;
    }
  };

  return (
    <div className="p-6 bg-[#F9FAFB] w-full min-h-full font-sans overflow-y-auto text-gray-800 flex justify-center">
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
          animation: pageSlideUp 0.4s ease-out forwards;
        }
        .stagger-1 { animation-delay: 0.05s; }
        .stagger-2 { animation-delay: 0.1s; }
        .stagger-3 { animation-delay: 0.15s; }
        .item-slide-up {
          animation: pageSlideUp 0.35s ease-out forwards;
          opacity: 0;
        }
      `}</style>

      <div className="max-w-5xl w-full">
        
        {/* HEADER TRANG & TÌM KIẾM */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 animate-page-slide stagger-1 opacity-0 relative z-30" style={{ animationFillMode: 'forwards' }}>
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Nhật ký hoạt động
            </h1>
            <p className="text-[13px] text-gray-500 mt-1">Lưu trữ toàn bộ thao tác diễn ra trên hệ thống</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Thanh Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Tìm kiếm hoạt động, user..." 
                className="w-full sm:w-[250px] pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all shadow-sm"
              />
            </div>
            
            {/* Nút Lọc dự án */}
            <div className="relative z-50" ref={dropdownRef}>
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full sm:w-auto flex items-center justify-between gap-3 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
              >
                <span>{selectedProject}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 max-h-60 overflow-y-auto">
                  <button
                    onClick={() => { setSelectedProject("Tất cả dự án"); setShowDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-[13px] hover:bg-indigo-50 hover:text-indigo-600 ${selectedProject === "Tất cả dự án" ? "font-semibold text-indigo-600 bg-indigo-50/50" : ""}`}
                  >
                    Tất cả dự án
                  </button>
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => { setSelectedProject(proj.name); setShowDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-[13px] hover:bg-indigo-50 hover:text-indigo-600 truncate ${selectedProject === proj.name ? "font-semibold text-indigo-600 bg-indigo-50/50" : ""}`}
                    >
                      {proj.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DANH SÁCH TIMELINE */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative animate-page-slide stagger-3 opacity-0" style={{ animationFillMode: 'forwards' }}>
          
          {/* Đường dọc Timeline chạy xuyên suốt */}
          <div className="absolute left-[47px] top-6 bottom-6 w-[2px] bg-gray-100 hidden sm:block"></div>

          {activities.map((group, groupIndex) => (
            <div key={group.date || groupIndex} className={`${groupIndex !== 0 ? 'mt-8' : ''}`}>
              
              {/* Tiêu đề Ngày */}
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="hidden sm:flex w-10 h-10 rounded-full bg-white border-2 border-gray-100 items-center justify-center text-gray-400 shrink-0">
                  <Activity size={16} />
                </div>
                <h3 className="text-[14px] font-bold text-gray-900 bg-gray-50 px-3 py-1 rounded-md border border-gray-100">
                  {group.date}
                </h3>
              </div>

              {/* Các log trong ngày */}
              <div className="flex flex-col gap-6 sm:pl-16">
                {group.logs.map((log, logIndex) => {
                  const itemDelay = { animationDelay: `${(groupIndex * 0.1) + (logIndex * 0.05)}s`, animationFillMode: 'forwards' };
                  return (
                    <div key={log.id || logIndex} style={itemDelay} className="group flex gap-4 item-slide-up">
                      
                      {/* Cột trái: Avatar User (hoặc Icon) */}
                      <div className="relative shrink-0 mt-0.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-sm ${log.avatarColor || 'bg-indigo-600'} z-10 relative ring-4 ring-white`}>
                          {log.userAvatar || log.username?.substring(0, 1).toUpperCase() || 'U'}
                        </div>
                        {/* Icon loại action nhỏ nằm đè lên góc phải avatar */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 z-20">
                          {getActionIcon(log.actionType)}
                        </div>
                      </div>

                      {/* Cột phải: Nội dung Log */}
                      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        
                        <p className="text-[13.5px] text-gray-600 leading-snug">
                          <span className="font-bold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors">
                            {log.username || log.user || 'Thành viên'}
                          </span>
                          {" "}{log.action || log.actionType}{" "}
                          <span className="font-semibold text-gray-800 cursor-pointer hover:text-indigo-600 transition-colors underline decoration-gray-200 underline-offset-2">
                            {log.targetName || log.target || 'đối tượng'}
                          </span>
                        </p>

                        {/* Thông tin chi tiết */}
                        {log.details && (
                          <div className="text-[13px] text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-1 inline-block">
                            {log.actionType?.includes('COMMENT') ? (
                               <span className="italic">"{log.details.replace(/"/g, '')}"</span>
                            ) : (
                               <span>{log.details}</span>
                            )}
                          </div>
                        )}

                        {/* Meta Date (Project Tag & Time) */}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                            {log.projectName || log.project || 'Hệ thống chung'}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {log.time}
                          </span>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          ))}

        </div>

      </div>
    </div>
  );
};

export default Activities;