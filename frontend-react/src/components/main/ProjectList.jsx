import React, { useState, useEffect, useMemo, useRef, useCallback, } from "react";
import apiClient from "../../utils/apiClient";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams, useOutletContext } from "react-router-dom";
import { Search, MoreHorizontal, Calendar, CheckCircle2, Circle, Clock, Loader2, X, ChevronDown, Check, User, AlertCircle, RefreshCw, Trash2, CheckSquare, } from "lucide-react";
import toast from "react-hot-toast";

const avatarColors = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-purple-500",
  "bg-indigo-600",
];

const ProjectList = () => {
  const { projectId } = useParams();

  const outletContext = useOutletContext() || {};
  const { setSelectedTaskId } = outletContext;

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedAssignee, setSelectedAssignee] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");

  const [openDropdown, setOpenDropdown] = useState(null);
  const [activeMenuTaskId, setActiveMenuTaskId] = useState(null);
  const filterRef = useRef(null);

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await apiClient.get(`http://localhost:8085/api/tasks/project/${projectId}`);

      const data = res.data;
      setTasks(data || []);
    } catch (err) {
      console.error("Lỗi tải task:", err);
      throw err;
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

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setFetchError(false);
    try {
      await Promise.all([fetchTasks(), fetchMembers()]);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchTasks, fetchMembers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEvent(EVENTS.TASK, fetchTasks);
  useEvent(EVENTS.MEMBER, fetchMembers);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
      if (!event.target.closest(".action-menu-container")) {
        setActiveMenuTaskId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteTask = async (e, taskId) => {
    e.stopPropagation();
    setActiveMenuTaskId(null);

    if (!window.confirm("Bạn có chắc chắn muốn xóa công việc này?")) return;

    try {
      await apiClient.delete(`http://localhost:8085/api/tasks/${taskId}`);
      toast.success("Đã xóa công việc!");
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Bạn không có quyền xóa công việc này!";
      toast.error(errorMsg);
    }
  };

  const handleToggleComplete = async (e, task) => {
    e.stopPropagation();
    setActiveMenuTaskId(null);

    const newStatus = task.status === "DONE" ? "TO_DO" : "DONE";
    try {
      await apiClient.patch(
        `http://localhost:8085/api/tasks/${task.id}/status`,
        { status: newStatus }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Không thể cập nhật trạng thái!");
      }

      toast.success(
        newStatus === "DONE"
          ? "Đã hoàn thành công việc!"
          : "Đã mở lại công việc!"
      );
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)),
      );
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Không thể cập nhật trạng thái!";
      toast.error(errorMsg);
    }
  };

  const getAssigneeInfo = (assigneeId) => {
    if (!assigneeId)
      return {
        fullName: "Chưa giao",
        avatarLetter: "?",
        avatarColor: "bg-gray-400",
      };

    const index = members.findIndex((m) => m.userId === assigneeId);
    const member = members[index];

    if (member) {
      return {
        fullName: member.fullName || "User",
        avatarLetter: member.fullName
          ? member.fullName.charAt(0).toUpperCase()
          : "U",
        avatarColor: avatarColors[index % avatarColors.length],
      };
    }
    return {
      fullName: "Chưa giao",
      avatarLetter: "?",
      avatarColor: "bg-gray-400",
    };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "DONE":
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case "IN_PROGRESS":
        return <Clock size={14} className="text-blue-500" />;
      case "REVIEW":
        return <Circle size={14} className="text-amber-500 fill-amber-100" />;
      default:
        return <Circle size={14} className="text-gray-300" />;
    }
  };

  const formatStatusText = (status) => {
    switch (status) {
      case "DONE":
        return "Done";
      case "IN_PROGRESS":
        return "In Progress";
      case "REVIEW":
        return "Review";
      default:
        return "To Do";
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-700";
      case "HIGH":
        return "bg-orange-100 text-orange-700";
      case "MEDIUM":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        (task.title &&
          task.title.toLowerCase().includes(searchKeyword.toLowerCase())) ||
        (task.description &&
          task.description.toLowerCase().includes(searchKeyword.toLowerCase()));

      const matchesStatus =
        selectedStatus === "ALL" || task.status === selectedStatus;
      const matchesAssignee =
        selectedAssignee === "ALL" || task.assigneeId === selectedAssignee;
      const matchesPriority =
        selectedPriority === "ALL" || task.priority === selectedPriority;

      return (
        matchesSearch && matchesStatus && matchesAssignee && matchesPriority
      );
    });
  }, [
    tasks,
    searchKeyword,
    selectedStatus,
    selectedAssignee,
    selectedPriority,
  ]);

  const clearAllFilters = () => {
    setSearchKeyword("");
    setSelectedStatus("ALL");
    setSelectedAssignee("ALL");
    setSelectedPriority("ALL");
  };

  const hasActiveFilters =
    searchKeyword ||
    selectedStatus !== "ALL" ||
    selectedAssignee !== "ALL" ||
    selectedPriority !== "ALL";

  const statusLabels = {
    ALL: "Mọi trạng thái",
    TO_DO: "To Do",
    IN_PROGRESS: "In Progress",
    REVIEW: "Review",
    DONE: "Done",
  };

  const selectedAssigneeObj = members.find(
    (m) => m.userId === selectedAssignee,
  );
  const assigneeLabelText =
    selectedAssignee === "ALL"
      ? "Tất cả người phụ trách"
      : selectedAssigneeObj?.fullName ||
        selectedAssigneeObj?.username ||
        "Thành viên";

  const priorityLabels = {
    ALL: "Mọi độ ưu tiên",
    URGENT: "Urgent",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
  };

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col bg-white overflow-hidden relative font-sans">
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
          <span className="text-gray-500 text-[13px] font-medium">
            Đang tải danh sách...
          </span>
        </div>
      )}

      {/* Thanh công cụ tìm kiếm và lọc */}
      <div
        className="flex flex-wrap justify-between items-center mb-5 gap-3 shrink-0 relative z-40"
        ref={filterRef}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm kiếm task..."
              className="w-[220px] pl-9 pr-3 py-2 text-[13px] bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-indigo-400 text-gray-700"
            />
          </div>

          {/* Lọc Trạng thái */}
          <div className="relative">
            <div
              onClick={() =>
                setOpenDropdown(openDropdown === "status" ? null : "status")
              }
              className="bg-white border border-gray-200 text-gray-700 text-[13px] font-medium rounded-lg px-3 py-2 shadow-sm cursor-pointer min-w-[160px] flex items-center justify-between gap-2 hover:border-gray-300 transition-colors select-none"
            >
              <span className="truncate">{statusLabels[selectedStatus]}</span>
              <ChevronDown
                size={15}
                className={`text-gray-400 shrink-0 transition-transform duration-200 ${openDropdown === "status" ? "rotate-180" : ""}`}
              />
            </div>

            {openDropdown === "status" && (
              <div className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-gray-100 rounded-xl shadow-2xl py-1 z-[99999]">
                {["ALL", "TO_DO", "IN_PROGRESS", "REVIEW", "DONE"].map((st) => {
                  const isSelected = selectedStatus === st;
                  return (
                    <div
                      key={st}
                      onClick={() => {
                        setSelectedStatus(st);
                        setOpenDropdown(null);
                      }}
                      className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition-colors ${isSelected ? "bg-indigo-50/70 text-indigo-600 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      <span>{statusLabels[st]}</span>
                      {isSelected && (
                        <Check size={14} className="text-indigo-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lọc Phụ trách */}
          <div className="relative">
            <div
              onClick={() =>
                setOpenDropdown(openDropdown === "assignee" ? null : "assignee")
              }
              className="bg-white border border-gray-200 text-gray-700 text-[13px] font-medium rounded-lg px-3 py-2 shadow-sm cursor-pointer min-w-[210px] flex items-center justify-between gap-2 hover:border-gray-300 transition-colors select-none"
            >
              <div className="flex items-center gap-2 truncate">
                <User size={15} className="text-indigo-600 shrink-0" />
                <span className="truncate">{assigneeLabelText}</span>
              </div>
              <ChevronDown
                size={15}
                className={`text-gray-400 shrink-0 transition-transform duration-200 ${openDropdown === "assignee" ? "rotate-180" : ""}`}
              />
            </div>

            {openDropdown === "assignee" && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-gray-100 rounded-xl shadow-2xl py-1 max-h-56 overflow-y-auto z-[99999]">
                <div
                  onClick={() => {
                    setSelectedAssignee("ALL");
                    setOpenDropdown(null);
                  }}
                  className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition-colors ${selectedAssignee === "ALL" ? "bg-indigo-50/70 text-indigo-600 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                >
                  <span>Tất cả người phụ trách</span>
                  {selectedAssignee === "ALL" && (
                    <Check size={14} className="text-indigo-600" />
                  )}
                </div>
                {members.map((m) => {
                  const isSelected = selectedAssignee === m.userId;
                  const name = m.fullName || m.username;
                  return (
                    <div
                      key={m.userId}
                      onClick={() => {
                        setSelectedAssignee(m.userId);
                        setOpenDropdown(null);
                      }}
                      className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition-colors ${isSelected ? "bg-indigo-50/70 text-indigo-600 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      <span className="truncate">{name}</span>
                      {isSelected && (
                        <Check size={14} className="text-indigo-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lọc Độ ưu tiên */}
          <div className="relative">
            <div
              onClick={() =>
                setOpenDropdown(openDropdown === "priority" ? null : "priority")
              }
              className="bg-white border border-gray-200 text-gray-700 text-[13px] font-medium rounded-lg px-3 py-2 shadow-sm cursor-pointer min-w-[160px] flex items-center justify-between gap-2 hover:border-gray-300 transition-colors select-none"
            >
              <span className="truncate">
                {priorityLabels[selectedPriority]}
              </span>
              <ChevronDown
                size={15}
                className={`text-gray-400 shrink-0 transition-transform duration-200 ${openDropdown === "priority" ? "rotate-180" : ""}`}
              />
            </div>

            {openDropdown === "priority" && (
              <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-gray-100 rounded-xl shadow-2xl py-1 z-[99999]">
                {["ALL", "URGENT", "HIGH", "MEDIUM", "LOW"].map((p) => {
                  const isSelected = selectedPriority === p;
                  return (
                    <div
                      key={p}
                      onClick={() => {
                        setSelectedPriority(p);
                        setOpenDropdown(null);
                      }}
                      className={`px-3.5 py-2 text-[13px] cursor-pointer flex items-center justify-between transition-colors ${isSelected ? "bg-indigo-50/70 text-indigo-600 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      <span>{priorityLabels[p]}</span>
                      {isSelected && (
                        <Check size={14} className="text-indigo-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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

      <div className="flex-1 overflow-auto border border-gray-200 rounded-xl shadow-sm relative">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="py-3 px-4 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-[40%]">
                Tên công việc
              </th>
              <th className="py-3 px-4 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Trạng thái
              </th>
              <th className="py-3 px-4 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Mức độ
              </th>
              <th className="py-3 px-4 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Phụ trách
              </th>
              <th className="py-3 px-4 text-[12px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Hạn chót
              </th>
              <th className="py-3 px-4 border-b border-gray-200 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fetchError ? (
              <tr>
                <td colSpan="6" className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <AlertCircle size={28} className="text-red-400" />
                    <span className="text-[13px] text-gray-700 font-medium">
                      Không thể nạp danh sách công việc!
                    </span>
                    <button
                      onClick={loadData}
                      className="mt-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      <RefreshCw size={13} /> Thử lại
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const assignee = getAssigneeInfo(task.assigneeId);
                const isMenuOpen = activeMenuTaskId === task.id;

                return (
                  <tr
                    key={task.id}
                    onClick={() => {
                      if (setSelectedTaskId) setSelectedTaskId(task.id);
                    }}
                    className="hover:bg-gray-50/50 transition-colors group cursor-pointer relative"
                  >
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {task.title}
                        </span>
                        <span className="text-[11px] text-gray-400 truncate max-w-xs">
                          {task.description || "Không có mô tả"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(task.status)}
                        <span className="text-[13px] font-medium text-gray-700">
                          {formatStatusText(task.status)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-bold px-2 py-1 rounded-md ${getPriorityStyle(task.priority)}`}
                      >
                        {task.priority || "MEDIUM"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${assignee.avatarColor}`}
                        >
                          {assignee.avatarLetter}
                        </div>
                        <span className="text-[13px] font-medium text-gray-700">
                          {assignee.fullName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                        <Calendar size={14} /> {task.dueDate || "N/A"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right relative action-menu-container">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuTaskId(isMenuOpen ? null : task.id);
                        }}
                        className="text-gray-400 hover:text-gray-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-md hover:bg-gray-100"
                        title="Tùy chọn"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {/* Menu xổ xuống thực hiện Action */}
                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-4 top-10 w-44 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-50 text-left animate-dropdown"
                        >
                          <button
                            type="button"
                            onClick={(e) => handleToggleComplete(e, task)}
                            className="w-full px-3.5 py-2 text-[12px] text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <CheckSquare size={14} />
                            <span>
                              {task.status === "DONE"
                                ? "Mở lại việc"
                                : "Đánh dấu Done"}
                            </span>
                          </button>
                          <div className="h-px bg-gray-100 my-1"></div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTask(e, task.id)}
                            className="w-full px-3.5 py-2 text-[12px] text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Trash2 size={14} />
                            <span>Xóa công việc</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan="6"
                  className="py-8 text-center text-gray-400 text-[13px]"
                >
                  {!loading && "Không tìm thấy công việc phù hợp."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectList;
