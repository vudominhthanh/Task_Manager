import React, { useState, useEffect } from "react";
import { X, FolderKanban, Calendar, CheckSquare, Trash2, Edit3, Save } from "lucide-react";
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

export default function ProjectDetailsModal({ isOpen, onClose, project, onUpdate, onDelete, userPermissions = [] }) {
  const [isEditing, setIsEditing] = useState(false);
  const { accent } = usePreferences();
  const A = getAccent(accent);

  // ✅ FIX: nhận userPermissions qua props (default [] để không crash)
  const canUpdateProject = userPermissions.includes("PROJECT_UPDATE") || userPermissions.includes("ROLE_ADMIN");
  const canDeleteProject = userPermissions.includes("PROJECT_DELETE") || userPermissions.includes("ROLE_ADMIN");

  const [formData, setFormData] = useState({ name: "", description: "", status: "ACTIVE", startDate: "", endDate: "" });

  const [tasks] = useState([
    { id: 1, title: "Thiết kế cơ sở dữ liệu hệ thống", status: "DONE", assignee: "Minh Thành" },
    { id: 2, title: "Xây dựng Spring Cloud Gateway", status: "IN_PROGRESS", assignee: "Vũ Đỗ" },
    { id: 3, title: "Cấu hình Kafka Message Broker", status: "TO_DO", assignee: "Hải Nam" },
  ]);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || "",
        description: project.description || "",
        status: project.status || "ACTIVE",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
      });
      setIsEditing(false);
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onUpdate({ ...project, ...formData });
    setIsEditing(false);
  };

  const inputClass = `w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 disabled:bg-gray-50 dark:disabled:bg-gray-800/50 disabled:text-gray-600 dark:disabled:text-gray-500 outline-none transition-all font-medium focus:ring-2 ${A.ring}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto [scrollbar-gutter:stable]">
      <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col my-auto max-h-[85vh] transition-colors">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-50 dark:from-gray-900 dark:to-gray-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 text-white rounded-xl shadow-md ${A.bgOnly}`}>
              <FolderKanban size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">Chi tiết dự án hệ thống</h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">ID: {project.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6 [scrollbar-width:thin]">
          <form id="project-edit-form" onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className={`text-[12px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${A.text}`}>
                <FolderKanban size={14} /> Thông tin chung & Thời gian
              </h3>
              <div>
                {!isEditing ? (
                  canUpdateProject && (
                    <button type="button" onClick={() => setIsEditing(true)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 border rounded-lg text-[12px] font-semibold transition-colors cursor-pointer shadow-sm ${A.softBg} ${A.border} ${A.textStrong}`}>
                      <Edit3 size={14} /> Chỉnh sửa thông tin
                    </button>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer">
                      Hủy
                    </button>
                    <button type="submit" className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer shadow-sm">
                      <Save size={14} /> Lưu lại
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Tên dự án</label>
                <input type="text" name="name" disabled={!isEditing} value={formData.name} onChange={handleChange} className={inputClass} required />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Trạng thái dự án</label>
                <select name="status" disabled={!isEditing} value={formData.status} onChange={handleChange} className={`${inputClass} cursor-pointer`}>
                  <option value="ACTIVE">Đang chạy (Active)</option>
                  <option value="COMPLETED">Hoàn thành (Completed)</option>
                  <option value="ARCHIVED">Lưu trữ (Archived)</option>
                  <option value="SUSPENDED">Tạm đình chỉ (Suspended)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Calendar size={13} className="text-emerald-600" /> Ngày bắt đầu
                </label>
                <input type="date" name="startDate" disabled={!isEditing} value={formData.startDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Calendar size={13} className="text-rose-600" /> Ngày kết thúc (Deadline)
                </label>
                <input type="date" name="endDate" disabled={!isEditing} value={formData.endDate} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Mô tả dự án</label>
              <textarea name="description" disabled={!isEditing} rows="2" value={formData.description} onChange={handleChange} className={`${inputClass} resize-none`} />
            </div>
          </form>

          <hr className="border-gray-100 dark:border-gray-800" />

          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className={`text-[12px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${A.text}`}>
                <CheckSquare size={14} /> Danh sách Task thực thi ({tasks.length})
              </h3>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Giám sát tiến độ công việc nội bộ</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-inner">
              {tasks.length === 0 ? (
                <p className="text-center py-4 text-[12px] text-gray-400 italic">Chưa có task nào.</p>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-3 bg-white dark:bg-gray-800 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <CheckSquare size={16} className={task.status === "DONE" ? "text-emerald-500" : "text-gray-400"} />
                        <span className={`text-[13px] font-medium ${task.status === "DONE" ? "line-through text-gray-400" : "text-gray-800 dark:text-gray-200"}`}>{task.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 rounded-md font-semibold">{task.assignee}</span>
                        <TaskStatusBadge status={task.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center shrink-0">
          {canDeleteProject ? (
            <button type="button" onClick={() => {
              if (window.confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn dự án này?")) { onDelete(project.id); onClose(); }
            }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/20 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer shadow-sm">
              <Trash2 size={15} /> Xóa vĩnh viễn dự án
            </button>
          ) : <div />}
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer shadow-sm">
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskStatusBadge({ status }) {
  const map = {
    DONE: { label: "Hoàn thành", color: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" },
    IN_PROGRESS: { label: "Đang làm", color: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" },
    TO_DO: { label: "Cần làm", color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600" },
  };
  const cfg = map[status] || map.TO_DO;
  return <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${cfg.color}`}>{cfg.label}</span>;
}