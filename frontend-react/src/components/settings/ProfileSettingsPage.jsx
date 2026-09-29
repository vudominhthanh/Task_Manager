import React, { useState, useEffect, useRef } from "react";
import {
  User, Mail, Save, Camera, Phone, Shield,
  Loader2, KeyRound, Smartphone, ShieldCheck, QrCode, Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../../utils/apiClient";
import { emitEvent, EVENTS } from "../../hooks/useEventBus";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const USER_API_BASE = "http://localhost:8086/api/users";
const AUTH_API_BASE = "http://localhost:8086/api/auth";

export default function ProfileSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  const fileInputRef = useRef(null);

  // ==== Preferences ====
  const { accent } = usePreferences();
  const A = getAccent(accent);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullname: "",
    phoneNumber: "",
    avatarUrl: "",
    role: "MEMBER",
    is2faEnabled: false,
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [twoFaData, setTwoFaData] = useState(null);
  const [twoFaCode, setTwoFaCode] = useState("");

  const getToken = () => localStorage.getItem("accessToken") || "";

  useEffect(() => {
    const fetchUserData = async () => {
      const token = getToken();
      if (!token) { setLoading(false); return; }
      try {
        const res = await apiClient.get(`${USER_API_BASE}/profile/me`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const data = res.data;
        if (data) {
          setFormData({
            username:    data.username || "",
            email:       data.email || "",
            fullname:    data.fullName || data.fullname || "",
            phoneNumber: data.phoneNumber || "",
            avatarUrl:   data.avatarUrl || "",
            role:        data.role || data.systemRoles?.[0]?.name || "MEMBER",
            is2faEnabled: data.twoFactorEnabled || data.is2faEnabled || false,
          });
        }
      } catch (err) {
        console.error("Lỗi khi tải hồ sơ cá nhân:", err);
        const localUser = JSON.parse(localStorage.getItem("user") || "{}");
        setFormData({
          username:    localUser.userName || localUser.username || "user",
          email:       localUser.email || "",
          fullname:    localUser.fullName || localUser.fullname || "Người dùng",
          phoneNumber: localUser.phoneNumber || "",
          avatarUrl:   localUser.avatarUrl || "",
          role:        localUser.role || "MEMBER",
          is2faEnabled: localUser.twoFactorEnabled || false,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.fullname.trim()) {
      toast.error("Họ và tên không được để trống!");
      return;
    }
    setSavingProfile(true);
    const toastId = toast.loading("Đang lưu thông tin...");
    try {
      const res = await apiClient.put(`${USER_API_BASE}/profile/me`, {
        fullname:    formData.fullname.trim(),
        phoneNumber: formData.phoneNumber ? formData.phoneNumber.trim() : "",
        avatarUrl:   formData.avatarUrl ? formData.avatarUrl.trim() : "",
      });
      const updated = res.data || {};
      const newFullName = updated.fullName || updated.fullname || formData.fullname.trim();
      const newPhone = updated.phoneNumber || formData.phoneNumber;

      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      storedUser.fullName = newFullName;
      storedUser.fullname = newFullName;
      storedUser.phoneNumber = newPhone;
      localStorage.setItem("user", JSON.stringify(storedUser));
      localStorage.setItem("fullName", newFullName);

      emitEvent(EVENTS.USER, { ...storedUser, fullName: newFullName, phoneNumber: newPhone });
      toast.success("Cập nhật thông tin thành công!", { id: toastId });
    } catch (err) {
      console.error("Lỗi cập nhật hồ sơ:", err);
      toast.error(err.response?.data?.message || err.message || "Cập nhật thất bại!", { id: toastId });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có tối thiểu 6 ký tự!"); return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!"); return;
    }
    setPasswordLoading(true);
    const toastId = toast.loading("Đang đổi mật khẩu...");
    try {
      await apiClient.put(`${USER_API_BASE}/profile/change-password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
        confirmPassword: passwords.confirmPassword,
      });
      toast.success("Đổi mật khẩu thành công!", { id: toastId });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error("Lỗi đổi mật khẩu:", err);
      toast.error(err.response?.data?.message || err.message || "Đổi mật khẩu thất bại!", { id: toastId });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    setTwoFaLoading(true);
    try {
      const res = await apiClient.post(`${AUTH_API_BASE}/2fa/setup`);
      setTwoFaData(res.data);
      toast.success("Đã tạo mã QR 2FA. Vui lòng quét bằng ứng dụng Authenticator!");
    } catch {
      toast.error("Không thể khởi tạo 2FA. Vui lòng thử lại!");
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleEnable2FA = async (e) => {
    e.preventDefault();
    if (!twoFaCode || twoFaCode.length !== 6) {
      toast.error("Vui lòng nhập mã OTP 6 số hợp lệ!"); return;
    }
    setTwoFaLoading(true);
    const toastId = toast.loading("Đang kích hoạt 2FA...");
    try {
      await apiClient.post(`${AUTH_API_BASE}/2fa/enable`, { code: twoFaCode });
      toast.success("Đã bật xác thực 2 lớp (2FA) thành công!", { id: toastId });
      setFormData((prev) => ({ ...prev, is2faEnabled: true }));
      setTwoFaData(null);
      setTwoFaCode("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Mã xác thực 2FA không chính xác!", { id: toastId });
    } finally {
      setTwoFaLoading(false);
    }
  };

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    const os = ua.includes("Win") ? "Windows" : ua.includes("Mac") ? "macOS" : "Linux";
    const browser = ua.includes("Edg") ? "Edge" : ua.includes("Chrome") ? "Chrome" : "Safari";
    return `${browser} trên ${os}`;
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-gray-400">
        <Loader2 size={32} className={`animate-spin mb-2 ${A.text}`} />
        <span className="text-[13px] font-medium">Đang tải thiết lập tài khoản...</span>
      </div>
    );
  }

  const initialLetter = (formData.fullname || formData.username || "U").charAt(0).toUpperCase();

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade {
          animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-8 pb-16 font-sans animate-fade">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            Cài đặt tài khoản
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Quản lý toàn diện hồ sơ cá nhân, bảo mật mật khẩu, 2FA và thiết bị đăng nhập
          </p>
        </div>

        {/* PHẦN 1: HỒ SƠ CÁ NHÂN */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs p-6 space-y-6 transition-colors">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <User size={18} className={A.icon} />
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                Hồ sơ cá nhân
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Cập nhật danh tính hiển thị trên toàn hệ thống
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                {formData.avatarUrl ? (
                  <img
                    src={formData.avatarUrl}
                    alt="Avatar"
                    className="w-20 h-20 rounded-2xl object-cover shadow-sm border border-gray-100 dark:border-gray-700"
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-2xl text-white flex items-center justify-center font-bold text-2xl uppercase shadow-md bg-gradient-to-tr ${A.headerGradient} to-violet-600`}>
                    {initialLetter}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`absolute -bottom-1 -right-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 shadow-sm cursor-pointer transition-colors ${A.textHover}`}
                  title="Đổi ảnh đại diện"
                >
                  <Camera size={14} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h4 className="text-[15px] font-bold text-gray-900 dark:text-white">
                    {formData.fullname || "Chưa đặt tên"}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${A.softBg} ${A.textStrong} ${A.border}`}>
                    {formData.role}
                  </span>
                </div>
                <span className="text-[12px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                  @{formData.username}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { key: "fullname",    label: "Họ và tên *",              icon: User,   placeholder: "Nhập họ và tên...", required: true },
                { key: "phoneNumber", label: "Số điện thoại",            icon: Phone,  placeholder: "VD: 0987654321...", required: false },
                { key: "email",       label: "Email hệ thống",           icon: Mail,   disabled: true },
                { key: "username",    label: "Tên tài khoản (Username)", icon: Shield, disabled: true },
              ].map((field) => {
                const Icon = field.icon;
                return (
                  <div key={field.key}>
                    <label className="block text-[12px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                      <Icon size={14} className="text-gray-400 dark:text-gray-500" /> {field.label}
                    </label>
                    <input
                      type={field.key === "email" ? "email" : "text"}
                      required={field.required}
                      disabled={field.disabled}
                      placeholder={field.placeholder}
                      value={formData[field.key]}
                      onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                      className={`w-full p-2.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-xl outline-none font-medium transition-colors ${
                        field.disabled
                          ? "bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          : `bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 ${A.ring}`
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className={`text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 ${A.solidBg}`}
              >
                {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{savingProfile ? "Đang lưu..." : "Lưu thay đổi hồ sơ"}</span>
              </button>
            </div>
          </form>
        </section>

        {/* PHẦN 2: ĐỔI MẬT KHẨU */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs p-6 space-y-6 transition-colors">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <KeyRound size={18} className={A.icon} />
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                Bảo mật & Đổi mật khẩu
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Nên sử dụng mật khẩu mạnh kết hợp chữ, số và ký tự đặc biệt
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            {[
              { key: "currentPassword", label: "Mật khẩu hiện tại *",     placeholder: "••••••••" },
              { key: "newPassword",     label: "Mật khẩu mới *",           placeholder: "Tối thiểu 6 ký tự..." },
              { key: "confirmPassword", label: "Xác nhận mật khẩu mới *",  placeholder: "Nhập lại mật khẩu mới..." },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-[12px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {f.label}
                </label>
                <input
                  type="password"
                  required
                  placeholder={f.placeholder}
                  value={passwords[f.key]}
                  onChange={(e) => setPasswords({ ...passwords, [f.key]: e.target.value })}
                  className={`w-full p-2.5 text-[13px] border border-gray-200 dark:border-gray-700 rounded-xl outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 ${A.ring}`}
                />
              </div>
            ))}

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className={`text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm cursor-pointer transition-colors disabled:opacity-50 ${A.solidBg}`}
              >
                {passwordLoading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                <span>{passwordLoading ? "Đang xử lý..." : "Cập nhật mật khẩu"}</span>
              </button>
            </div>
          </form>
        </section>

        {/* PHẦN 3: 2FA */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs p-6 space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              <Lock size={18} className={A.icon} />
              <div>
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                  Xác thực 2 bước (2FA - TOTP)
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Bảo vệ tài khoản bằng Google Authenticator hoặc Authy
                </p>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
              formData.is2faEnabled
                ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}>
              {formData.is2faEnabled ? "Đã bật" : "Chưa bật"}
            </span>
          </div>

          {!formData.is2faEnabled && !twoFaData && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Tăng cường bảo mật đăng nhập hệ thống bằng mã xác thực cấu hình qua ứng dụng di động.
              </p>
              <button
                type="button"
                onClick={handleSetup2FA}
                disabled={twoFaLoading}
                className="bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
              >
                {twoFaLoading ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />} Thiết lập 2FA
              </button>
            </div>
          )}

          {twoFaData && !formData.is2faEnabled && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4 max-w-md">
              <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                1. Mở Google Authenticator và quét mã hoặc nhập Secret Key:
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 inline-block shadow-xs">
                <div className={`text-[11px] font-mono break-all font-bold p-2 rounded ${A.softBg} ${A.text}`}>
                  Secret: {twoFaData.secretKey}
                </div>
              </div>
              <form onSubmit={handleEnable2FA} className="space-y-3">
                <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  2. Nhập mã OTP gồm 6 chữ số từ ứng dụng để xác nhận:
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Nhập mã 6 số..."
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl font-mono tracking-widest text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="submit"
                  disabled={twoFaLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {twoFaLoading ? "Đang xác thực..." : "Xác nhận và Bật 2FA"}
                </button>
              </form>
            </div>
          )}

          {formData.is2faEnabled && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <ShieldCheck size={14} /> Tài khoản của bạn đã được bảo vệ bằng xác thực 2 bước an toàn tuyệt đối.
            </p>
          )}
        </section>

        {/* PHẦN 4: THIẾT BỊ ĐĂNG NHẬP */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs p-6 space-y-4 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              <Smartphone size={18} className={A.icon} />
              <div>
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                  Thiết bị đang đăng nhập
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Danh sách các phiên làm việc đang duy trì quyền truy cập
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Bạn có chắc chắn muốn đăng xuất toàn bộ không?")) {
                  localStorage.clear();
                  window.location.href = "/login";
                }
              }}
              className="text-xs text-red-600 dark:text-red-400 hover:underline font-semibold cursor-pointer"
            >
              Đăng xuất tất cả
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${A.softBg} ${A.border} ${A.icon}`}>
                <Smartphone size={20} />
              </div>
              <div>
                <span className="text-[13px] font-bold text-gray-800 dark:text-gray-100 block">
                  {getDeviceInfo()} (Thiết bị này)
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Đang hoạt động trực tuyến
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg">
              Hiện tại
            </span>
          </div>
        </section>
      </div>
    </>
  );
}