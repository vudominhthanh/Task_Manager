import React, { useState } from "react";
import { KeyRound, Smartphone, Loader2, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import apiClient from "../../utils/apiClient";

export default function SecuritySettingsPage() {
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    let os = "Thiết bị không xác định";
    if (userAgent.indexOf("Win") !== -1) os = "Windows";
    if (userAgent.indexOf("Mac") !== -1) os = "macOS";
    if (userAgent.indexOf("Linux") !== -1) os = "Linux";
    if (userAgent.indexOf("Android") !== -1) os = "Android";
    if (userAgent.indexOf("like Mac") !== -1) os = "iOS";

    let browser = "Trình duyệt Web";
    if (userAgent.indexOf("Edg") !== -1) browser = "Microsoft Edge";
    else if (userAgent.indexOf("Chrome") !== -1) browser = "Google Chrome";
    else if (userAgent.indexOf("Safari") !== -1) browser = "Apple Safari";
    else if (userAgent.indexOf("Firefox") !== -1) browser = "Mozilla Firefox";

    return `${browser} trên ${os}`;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwords.newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có tối thiểu 6 ký tự!");
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Đang xác thực...");

    try {
      await apiClient.put(
        "http://localhost:8086/api/users/profile/change-password",
        {
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
          confirmPassword: passwords.confirmPassword,
        }
      );

      toast.success("Đổi mật khẩu thành công!", { id: toastId });
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      console.error("Lỗi đổi mật khẩu:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Đổi mật khẩu thất bại. Mật khẩu cũ không chính xác!";
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = () => {
    if (
      window.confirm(
        "Bạn có chắc chắn muốn đăng xuất khỏi tất cả thiết bị khác không?",
      )
    ) {
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  return (
    <>
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

      <div className="max-w-3xl mx-auto space-y-6 font-sans">
        {/* Tiêu đề */}
        <div className="animate-stagger delay-0">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Bảo mật & Đăng nhập
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Bảo vệ tài khoản và giám sát các phiên truy cập của bạn
          </p>
        </div>

        {/* Form Đổi mật khẩu */}
        <form
          onSubmit={handlePasswordChange}
          className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4 animate-stagger delay-1"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <KeyRound size={18} className="text-indigo-600" />
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">
                Đổi mật khẩu
              </h3>
              <p className="text-[11px] text-gray-400">
                Nên sử dụng mật khẩu mạnh kết hợp chữ, số và ký tự đặc biệt
              </p>
            </div>
          </div>

          <div className="space-y-3 max-w-md">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">
                Mật khẩu hiện tại *
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwords.currentPassword}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    currentPassword: e.target.value,
                  })
                }
                className="w-full p-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">
                Mật khẩu mới *
              </label>
              <input
                type="password"
                required
                placeholder="Tối thiểu 6 ký tự..."
                value={passwords.newPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, newPassword: e.target.value })
                }
                className="w-full p-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">
                Xác nhận mật khẩu mới *
              </label>
              <input
                type="password"
                required
                placeholder="Nhập lại mật khẩu mới..."
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords({
                    ...passwords,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full p-2.5 text-[13px] border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              <span>{loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}</span>
            </button>
          </div>
        </form>

        {/* Thiết bị đăng nhập */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4 animate-stagger delay-2">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <Smartphone size={18} className="text-indigo-600" />
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">
                  Thiết bị đang đăng nhập
                </h3>
                <p className="text-[11px] text-gray-400">
                  Danh sách các phiên làm việc đang duy trì token của bạn
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogoutAll}
              className="text-xs text-red-600 hover:text-red-700 hover:underline font-semibold cursor-pointer"
            >
              Đăng xuất phiên này
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-gray-50/70 rounded-xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Smartphone size={20} />
              </div>
              <div>
                <span className="text-[13px] font-bold text-gray-800 block">
                  {getDeviceInfo()} (Thiết bị này)
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">
                  Đang hoạt động trực tuyến
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg">
              Hiện tại
            </span>
          </div>
        </div>
      </div>
    </>
  );
}