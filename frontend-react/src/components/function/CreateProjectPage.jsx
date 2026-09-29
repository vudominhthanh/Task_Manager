import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import apiClient from "../../utils/apiClient";
import { Plus, Trash2, Save, Briefcase, Calendar, X, UserPlus, Mail, Shield, ChevronDown, Check } from "lucide-react";
import toast from "react-hot-toast";
import { emitEvent, EVENTS } from "../../hooks/useEventBus";
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const CreateProjectPage = ({ isOpen, onClose, onProjectCreated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectData, setProjectData] = useState({ name: "", description: "", startDate: "", endDate: "" });
  const [members, setMembers] = useState([]);
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null);
  const containerRef = useRef(null);

  const { accent } = usePreferences();
  const A = getAccent(accent);

  useEffect(() => {
    if (isOpen) {
      setProjectData({ name: "", description: "", startDate: "", endDate: "" });
      setMembers([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpenDropdownIndex(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddMember = () => setMembers([...members, { email: "", role: "MEMBER" }]);
  const handleRemoveMember = (index) => {
    setMembers(members.filter((_, i) => i !== index));
    if (openDropdownIndex === index) setOpenDropdownIndex(null);
  };
  const handleMemberChange = (index, field, value) => {
    const updated = [...members];
    updated[index][field] = value;
    setMembers(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (projectData.startDate && projectData.endDate && new Date(projectData.startDate) > new Date(projectData.endDate)) {
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu!");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiClient.post("http://localhost:8083/api/projects", projectData);
      const newProjectId = res.data.id;

      if (members.length > 0) {
        await Promise.all(members.map(async (m) => {
          try {
            await apiClient.post(`http://localhost:8083/api/projects/${newProjectId}/members`, { email: m.email, role: m.role });
          } catch (memberError) {
            toast.error(`Lỗi thêm ${m.email}: ${memberError.response?.data?.message || "Thao tác thất bại"}`);
          }
        }));
      }

      toast.success("Tạo dự án mới thành công!");
      window.dispatchEvent(new CustomEvent("projectCreated", { detail: newProjectId }));
      emitEvent(EVENTS.PROJECT, { projectId: newProjectId });
      emitEvent(EVENTS.MEMBER, { projectId: newProjectId });
      if (onProjectCreated) onProjectCreated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Không thể tạo dự án!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabels = { MEMBER: "Member", ADMIN: "Admin" };
  const inputClass = `w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 ${A.ring} outline-none text-[14px] bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100`;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] bg-gray-900/70 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 md:p-8">
        <div ref={containerRef} className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 md:p-8 relative transition-colors">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer">
            <X size={24} />
          </button>

          <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-100 dark:border-gray-800 pr-10">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Briefcase className={A.icon} /> Tạo Dự Án Mới
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Khởi tạo thông tin dự án và mời thành viên tham gia</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tên dự án *</label>
                <input required type="text" placeholder="Ví dụ: Nâng cấp hệ thống Backend..."
                  value={projectData.name} onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                  className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Mô tả tổng quan</label>
                <textarea rows="3" placeholder="Mục tiêu của dự án này là gì..."
                  value={projectData.description} onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                  className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={16} /> Ngày bắt đầu
                </label>
                <input type="date" value={projectData.startDate} onChange={(e) => setProjectData({ ...projectData, startDate: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar size={16} /> Ngày kết thúc
                </label>
                <input type="date" value={projectData.endDate} onChange={(e) => setProjectData({ ...projectData, endDate: e.target.value })} className={inputClass} />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">Thành viên tham gia</h3>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">Mời thành viên vào dự án ngay từ đầu</p>
                </div>
                <button type="button" onClick={handleAddMember}
                  className={`px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${A.text} ${A.textHover}`}>
                  <UserPlus size={14} /> Thêm
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                {members.map((member, index) => {
                  const isDropOpen = openDropdownIndex === index;
                  return (
                    <div key={index} className="flex gap-2.5 items-center bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm relative">
                      <div className="relative flex-1">
                        <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="email" required placeholder="Email thành viên..." value={member.email}
                          onChange={(e) => handleMemberChange(index, "email", e.target.value)}
                          className={`w-full p-1.5 pl-8 border border-gray-200 dark:border-gray-700 rounded-md text-[13px] outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 ${A.ring}`} />
                      </div>
                      <div className="relative w-36">
                        <Shield size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none" />
                        <div onClick={() => setOpenDropdownIndex(isDropOpen ? null : index)}
                          className="w-full p-1.5 pl-8 pr-7 border border-gray-200 dark:border-gray-700 rounded-md text-[13px] bg-white dark:bg-gray-800 flex items-center justify-between cursor-pointer select-none hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                          <span className="text-gray-700 dark:text-gray-300 truncate">{roleLabels[member.role]}</span>
                          <ChevronDown size={14} className={`text-gray-400 transition-transform ${isDropOpen ? "rotate-180" : ""}`} />
                        </div>
                        {isDropOpen && (
                          <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1">
                            {["MEMBER", "ADMIN"].map((r) => (
                              <div key={r} onClick={() => { handleMemberChange(index, "role", r); setOpenDropdownIndex(null); }}
                                className={`px-3 py-1.5 text-[13px] cursor-pointer flex items-center justify-between ${
                                  member.role === r ? `${A.softBg} ${A.text} font-medium` : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                }`}>
                                <span>{roleLabels[r]}</span>
                                {member.role === r && <Check size={14} className={A.icon} />}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => handleRemoveMember(index)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md cursor-pointer">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button type="button" onClick={onClose}
                className="px-5 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[13px] font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                Hủy
              </button>
              <button type="submit" disabled={isSubmitting}
                className={`px-5 py-2 text-white text-[13px] font-semibold rounded-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer ${A.solidBg}`}>
                <Save size={16} /> {isSubmitting ? "Đang xử lý..." : "Lưu dự án"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateProjectPage;