import React, { useState, useEffect } from "react";
import { X, KeyRound, ShieldAlert, User, Mail, Shield } from "lucide-react";
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

export default function UserDetailsModal({ isOpen, onClose, user, onSave }) {
  const [formData, setFormData] = useState({ name: "", email: "", role: "User", status: "Active", newPassword: "" });

  const { accent } = usePreferences();
  const A = getAccent(accent);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "", email: user.email || "",
        role: user.role || "User", status: user.status || "Active", newPassword: "",
      });
    }
  }, [user]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...user, ...formData });
    onClose();
  };

  const inputClass = `w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:ring-2 ${A.ring} transition-all outline-none`;
  const inputReadonly = "w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-500 dark:text-gray-500 cursor-not-allowed outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col transition-colors">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${A.softBg} ${A.icon}`}>
              <User size={18} strokeWidth={2.5} />
            </div>
            <h2 className="text-[16px] font-bold text-gray-800 dark:text-white">Chi tiết người dùng</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form id="edit-user-form" onSubmit={handleSubmit} className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[70vh] [scrollbar-width:thin]">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Họ và tên</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" name="name" value={formData.name} onChange={handleChange} className={inputClass} required />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Địa chỉ Email (Đăng nhập)</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="email" name="email" value={formData.email} readOnly className={inputReadonly} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Vai trò hệ thống</label>
              <div className="relative">
                <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select name="role" value={formData.role} onChange={handleChange} className={`${inputClass} cursor-pointer appearance-none`}>
                  <option value="Super Admin">Super Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="User">User</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Trạng thái tài khoản</label>
              <select name="status" value={formData.status} onChange={handleChange} className={`w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:ring-2 ${A.ring} outline-none cursor-pointer`}>
                <option value="Active">Hoạt động (Active)</option>
                <option value="Banned">Khóa (Banned)</option>
                <option value="Pending">Chờ duyệt (Pending)</option>
              </select>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          <div className="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-xl p-4">
            <div className="flex items-start gap-2 mb-3">
              <ShieldAlert size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-[13px] font-bold text-gray-800 dark:text-gray-200 leading-tight">Admin Reset Password</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Đặt lại mật khẩu trực tiếp không cần xác thực mật khẩu cũ.</p>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Mật khẩu mới</label>
              <div className="relative">
                <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" name="newPassword" value={formData.newPassword} onChange={handleChange}
                  placeholder="Bỏ trống nếu không muốn đổi mật khẩu"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all outline-none" />
              </div>
            </div>
          </div>
        </form>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-[13px] font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            Hủy bỏ
          </button>
          <button type="submit" form="edit-user-form"
            className={`px-4 py-2 border text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm cursor-pointer ${A.solidBg} border-transparent`}>
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}