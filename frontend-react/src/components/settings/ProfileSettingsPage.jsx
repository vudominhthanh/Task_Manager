import React, { useState, useEffect, useRef } from "react";
import { User, Mail, Save, Camera, Check, Phone, Shield, Loader2, } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../../utils/apiClient";
import { emitEvent, EVENTS } from "../../hooks/useEventBus";

const USER_API_BASE = "http://localhost:8086/api/users";

export default function ProfileSettingsPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullname: "",
    phoneNumber: "",
    avatarUrl: "",
    role: "MEMBER",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const getToken = () => localStorage.getItem("accessToken") || "";

  useEffect(() => {
    const fetchUserData = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await apiClient.get(`${USER_API_BASE}/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (data) {
          setFormData({
            username: data.username || "",
            email: data.email || "",
            fullname: data.fullName || data.fullname || "",
            phoneNumber: data.phoneNumber || "",
            avatarUrl: data.avatarUrl || "",
            role: data.role || "MEMBER",
          });
        }
      } catch (err) {
        console.error("Lỗi khi tải hồ sơ cá nhân:", err);
        const localUser = JSON.parse(localStorage.getItem("user") || "{}");
        setFormData({
          username: localUser.userName || localUser.username || "user",
          email: localUser.email || "",
          fullname: localUser.fullName || localUser.fullname || "Người dùng",
          phoneNumber: localUser.phoneNumber || "",
          avatarUrl: localUser.avatarUrl || "",
          role: localUser.role || "MEMBER",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.fullname.trim()) {
      toast.error("Họ và tên không được để trống!");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Đang lưu thông tin...");

    try {
      const res = await apiClient.put(`${USER_API_BASE}/profile/me`, {
        fullname: formData.fullname.trim(),
        phoneNumber: formData.phoneNumber ? formData.phoneNumber.trim() : "",
        avatarUrl: formData.avatarUrl ? formData.avatarUrl.trim() : "",
      });

      const updated = res.data || {};
      const newFullName =
        updated.fullName || updated.fullname || formData.fullname.trim();
      const newPhone = updated.phoneNumber || formData.phoneNumber;

      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.fullName = newFullName;
      storedUser.fullname = newFullName;
      storedUser.phoneNumber = newPhone;
      localStorage.setItem("user", JSON.stringify(storedUser));
      localStorage.setItem("fullName", newFullName);

      emitEvent(EVENTS.USER, {
        ...storedUser,
        fullName: newFullName,
        phoneNumber: newPhone,
      });

      toast.success("Cập nhật thông tin thành công!", { id: toastId });
    } catch (err) {
      console.error("Lỗi cập nhật hồ sơ:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Cập nhật thất bại. Vui lòng kiểm tra lại quyền truy cập!";
      toast.error(msg, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-gray-400">
        <Loader2 size={30} className="animate-spin text-indigo-600 mb-2" />
        <span className="text-[13px] font-medium">
          Đang tải thông tin hồ sơ...
        </span>
      </div>
    );
  }

  const initialLetter = (formData.fullname || formData.username || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <>
      {/* Khai báo CSS keyframes cho hiệu ứng fade-in-up */}
      <style>
        {`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-stagger {
            opacity: 0;
            animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .delay-0 { animation-delay: 0s; }
          .delay-1 { animation-delay: 0.1s; }
          .delay-2 { animation-delay: 0.2s; }
          .delay-3 { animation-delay: 0.3s; }
        `}
      </style>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Phần 1: Tiêu đề */}
        <div className="flex justify-between items-end animate-stagger delay-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Hồ sơ cá nhân
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Quản lý thông tin tài khoản và danh tính của bạn trên hệ thống
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSave}
          className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-6"
        >
          {/* Phần 2: Avatar & Username */}
          <div className="flex items-center gap-5 pb-6 border-b border-gray-100 animate-stagger delay-1">
            <div className="relative">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt="Avatar"
                  className="w-20 h-20 rounded-2xl object-cover shadow-sm border border-gray-100"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-2xl uppercase shadow-md">
                  {initialLetter}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 shadow-sm cursor-pointer transition-colors"
                title="Đổi ảnh đại diện"
              >
                <Camera size={14} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h4 className="text-[15px] font-bold text-gray-900">
                  {formData.fullname || "Chưa đặt tên"}
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {formData.role}
                </span>
              </div>
              <span className="text-[12px] text-gray-400 font-mono mt-0.5">
                @{formData.username}
              </span>
            </div>
          </div>

          {/* Phần 3: Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-stagger delay-2">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-gray-400" /> Họ và tên *
              </label>
              <input
                type="text"
                required
                placeholder="Nhập họ và tên..."
                value={formData.fullname}
                onChange={(e) =>
                  setFormData({ ...formData, fullname: e.target.value })
                }
                className="w-full p-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-800 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Phone size={14} className="text-gray-400" /> Số điện thoại
              </label>
              <input
                type="text"
                placeholder="VD: 0987654321..."
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                className="w-full p-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-800 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Mail size={14} className="text-gray-400" /> Email hệ thống
              </label>
              <input
                type="email"
                disabled
                value={formData.email}
                className="w-full p-2.5 text-[13px] border border-gray-200 rounded-xl bg-gray-50 text-gray-400 outline-none cursor-not-allowed font-medium select-none"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Shield size={14} className="text-gray-400" /> Tên tài khoản
                (Username)
              </label>
              <input
                type="text"
                disabled
                value={formData.username}
                className="w-full p-2.5 text-[13px] border border-gray-200 rounded-xl bg-gray-50 text-gray-400 outline-none cursor-not-allowed font-medium select-none"
              />
            </div>
          </div>

          {/* Phần 4: Nút lưu */}
          <div className="flex justify-end pt-3 border-t border-gray-100 animate-stagger delay-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              <span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
