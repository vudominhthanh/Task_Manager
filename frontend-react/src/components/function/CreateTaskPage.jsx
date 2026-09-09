import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Save, CheckSquare, X, User, ChevronDown, Check, Calendar } from "lucide-react";

const CreateTaskPage = ({ isOpen, onClose, projectId, defaultStatus = "TO_DO", onTaskCreated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [members, setMembers] = useState([]);

  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    projectId: projectId || "", // Lấy trực tiếp từ prop
    assigneeId: "",
    priority: "MEDIUM",
    status: defaultStatus,
    startDate: "",
    dueDate: "",
  });

  const [subTasks, setSubTasks] = useState([]);

  useEffect(() => {
    // Reset form khi mở lại
    if (isOpen) {
      setTaskData({
        title: "", description: "", projectId: projectId || "", assigneeId: "",
        priority: "MEDIUM", status: defaultStatus, startDate: "", dueDate: ""
      });
      setSubTasks([]);
    }
  }, [isOpen, projectId, defaultStatus]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!projectId || !isOpen) return;
    const token = localStorage.getItem("accessToken");
    fetch(`http://localhost:8083/api/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setProjectName(data.name || "Dự án hiện tại"))
      .catch((err) => console.error("Lỗi tải thông tin dự án", err));
  }, [projectId, isOpen]);

  useEffect(() => {
    if (!projectId || !isOpen) return;
    const token = localStorage.getItem("accessToken");
    fetch(`http://localhost:8083/api/projects/${projectId}/members`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setMembers(data || []))
      .catch((err) => console.error("Lỗi tải thành viên dự án", err));
  }, [projectId, isOpen]);

  const handleAddSubtask = () => setSubTasks([...subTasks, { title: "", priority: "MEDIUM" }]);
  const handleRemoveSubtask = (index) => setSubTasks(subTasks.filter((_, i) => i !== index));
  const handleSubtaskChange = (index, field, value) => {
    const updated = [...subTasks];
    updated[index][field] = value;
    setSubTasks(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem("accessToken");
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      const parentRes = await fetch("http://localhost:8085/api/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify(taskData),
      });
      
      if (!parentRes.ok) throw new Error("Lỗi tạo task cha");
      const parentTask = await parentRes.json();

      if (subTasks.length > 0) {
        const subTaskPromises = subTasks.map((st) =>
          fetch(`http://localhost:8085/api/tasks/${parentTask.id}/sub-tasks`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              title: st.title,
              priority: st.priority,
              projectId: taskData.projectId, 
            }),
          })
        );
        await Promise.all(subTaskPromises);
      }

      window.dispatchEvent(
        new CustomEvent("taskCreated", { detail: taskData.projectId })
      );
      
      if (onTaskCreated) onTaskCreated();
      onClose(); 
    } catch (error) {
      console.error(error);
      alert("Đã xảy ra lỗi khi tạo công việc!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityLabels = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };
  const selectedAssigneeName = members.find(m => (m.userId || m.id) === taskData.assigneeId);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] bg-gray-900/70 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 md:p-8">
        <div ref={dropdownRef} className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 p-6 md:p-8 relative">
          
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 pr-10">
            <CheckSquare className="text-indigo-600" size={24} />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Tạo Công Việc Mới</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Thuộc dự án: <span className="font-semibold text-indigo-600">{projectName || "Đang tải..."}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="relative">
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <User size={15} /> Người phụ trách
              </label>
              <div 
                onClick={() => setOpenDropdown(openDropdown === 'assignee' ? null : 'assignee')}
                className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg bg-white flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors"
              >
                <span className={taskData.assigneeId ? "text-gray-900" : "text-gray-400"}>
                  {selectedAssigneeName ? (selectedAssigneeName.fullName || selectedAssigneeName.username || selectedAssigneeName.email) : "-- Chưa giao --"}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${openDropdown === 'assignee' ? 'rotate-180' : ''}`} />
              </div>

              {openDropdown === 'assignee' && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-48 overflow-y-auto py-1">
                  <div 
                    onClick={() => { setTaskData({ ...taskData, assigneeId: "" }); setOpenDropdown(null); }}
                    className="px-3.5 py-2 text-[14px] text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer flex items-center justify-between"
                  >
                    <span>-- Chưa giao --</span>
                    {!taskData.assigneeId && <Check size={15} className="text-indigo-600" />}
                  </div>
                  {members.map((m) => {
                    const id = m.userId || m.id;
                    const name = m.fullName || m.username || m.email;
                    const isSelected = taskData.assigneeId === id;
                    return (
                      <div 
                        key={id}
                        onClick={() => { setTaskData({ ...taskData, assigneeId: id }); setOpenDropdown(null); }}
                        className={`px-3.5 py-2 text-[14px] cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-50/70 text-indigo-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <span>{name}</span>
                        {isSelected && <Check size={15} className="text-indigo-600" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Tên công việc *</label>
                <input
                  required
                  type="text"
                  placeholder="Nhập tiêu đề công việc..."
                  value={taskData.title}
                  onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                  className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg outline-none focus:border-indigo-500 text-gray-700"
                />
              </div>

              <div className="relative">
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Độ ưu tiên</label>
                <div 
                  onClick={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
                  className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg bg-white flex items-center justify-between cursor-pointer hover:border-gray-300 transition-colors"
                >
                  <span className="text-gray-900">{priorityLabels[taskData.priority]}</span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${openDropdown === 'priority' ? 'rotate-180' : ''}`} />
                </div>

                {openDropdown === 'priority' && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl py-1">
                    {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => {
                      const isSelected = taskData.priority === p;
                      return (
                        <div 
                          key={p}
                          onClick={() => { setTaskData({ ...taskData, priority: p }); setOpenDropdown(null); }}
                          className={`px-3.5 py-2 text-[14px] cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-indigo-50/70 text-indigo-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                        >
                          <span>{priorityLabels[p]}</span>
                          {isSelected && <Check size={15} className="text-indigo-600" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={15} className="text-gray-500" /> Ngày bắt đầu
                </label>
                <input
                  type="date"
                  value={taskData.startDate}
                  onChange={(e) => setTaskData({ ...taskData, startDate: e.target.value })}
                  className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg outline-none focus:border-indigo-500 text-gray-700 bg-white"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={15} className="text-gray-500" /> Hạn hoàn thành
                </label>
                <input
                  type="date"
                  min={taskData.startDate} 
                  value={taskData.dueDate}
                  onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })}
                  className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg outline-none focus:border-indigo-500 text-gray-700 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Mô tả chi tiết</label>
              <textarea
                rows="3"
                placeholder="Nhập mô tả công việc..."
                value={taskData.description}
                onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                className="w-full p-2.5 text-[14px] border border-gray-200 rounded-lg outline-none focus:border-indigo-500 resize-none text-gray-700"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[13px] font-bold text-gray-800">Danh sách Sub-tasks</h3>
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-2.5 py-1 bg-white border border-gray-200 text-indigo-600 rounded-md text-[12px] font-semibold flex items-center gap-1 hover:bg-gray-100 cursor-pointer shadow-sm transition-colors"
                >
                  <Plus size={14} /> Thêm Sub-task
                </button>
              </div>
              
              <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto">
                {subTasks.map((st, index) => (
                  <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm relative">
                    <input
                      type="text"
                      required
                      placeholder="Tên sub-task..."
                      value={st.title}
                      onChange={(e) => handleSubtaskChange(index, "title", e.target.value)}
                      className="flex-1 p-1.5 border border-gray-200 rounded-md text-[13px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 border border-gray-300 text-gray-700 text-[13px] font-medium rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 text-white text-[13px] font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              >
                <Save size={16} />
                {isSubmitting ? "Đang lưu..." : "Lưu Công Việc"}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateTaskPage;