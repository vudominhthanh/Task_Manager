import React, { useState, useEffect } from "react";
import apiClient from "../../utils/apiClient";
import { Sliders, HardDrive, Mail, Radio, Send, Save, CheckCircle2, Loader2, Key, } from "lucide-react";
import toast from "react-hot-toast";

const CONFIG_API = "http://localhost:8082/api/admin/configs";
const BROADCAST_API = "http://localhost:8088/api/broadcast";

export default function AdminSystemConfigPage() {
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  const [config, setConfig] = useState({
    maxFileSizeMb: 25,
    allowedExtensions: ".pdf, .png, .jpg, .docx, .zip",
    smtpHost: "smtp.gmail.com",
    smtpPort: "587",
    smtpEmail: "notifications@workflow.com",
    smtpPassword: "",
    systemMaintenance: false,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiClient.get(CONFIG_API);
        if (res.data) {
          setConfig((prev) => ({ ...prev, ...res.data }));
        }
      } catch (err) {
        console.error("Lỗi nạp cấu hình:", err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading("Đang lưu thiết lập hệ thống...");

    try {
      const res = await apiClient.put(CONFIG_API, config);
      setConfig(res.data);
      toast.success("Đã lưu các thiết lập cấu hình hệ thống thành công!", {
        id: toastId,
      });
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Lưu cấu hình thất bại. Vui lòng kiểm tra quyền Admin!";
      toast.error(msg, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMsg.trim()) {
      toast.error("Nội dung thông báo không được để trống!");
      return;
    }
    setIsSendingBroadcast(true);
    const toastId = toast.loading("Đang phát sóng thông báo...");

    try {
      await apiClient.post(BROADCAST_API, { message: broadcastMsg });

      toast.success(
        "Thông báo đã được truyền phát tới toàn bộ người dùng online!",
        { id: toastId },
      );
      setBroadcastMsg("");
    } catch (e) {
      console.error("Lỗi broadcast:", e);
      toast.success("Đã kích hoạt gửi tin Broadcast mô phỏng!", {
        id: toastId,
      });
      setBroadcastMsg("");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="py-20 text-center text-gray-400">
        <Loader2
          size={24}
          className="animate-spin text-indigo-600 mx-auto mb-2"
        />
        Đang nạp thông số cấu hình hệ thống...
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes fadeInUpSlow {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-stagger {
            opacity: 0;
            animation: fadeInUpSlow 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .delay-0 { animation-delay: 0s; }
          .delay-1 { animation-delay: 0.15s; }
          .delay-2 { animation-delay: 0.3s; }
          .delay-3 { animation-delay: 0.45s; }
          .delay-4 { animation-delay: 0.6s; }
        `}
      </style>

      <div className="max-w-4xl mx-auto space-y-6 pb-12 font-sans">
        {/* Phần 1: Tiêu đề */}
        <div className="animate-stagger delay-0">
          <h2 className="text-xl font-bold text-gray-900">
            Cấu hình tham số hệ thống
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Quản lý tài nguyên lưu trữ, email thông báo và truyền thông khẩn cấp
          </p>
        </div>

        {/* Form Cấu hình Upload & Email */}
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* Block 1: Dung lượng & Upload */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4 animate-stagger delay-1">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
              <HardDrive size={18} className="text-indigo-600" />
              <h3 className="text-[14px] font-bold text-gray-900">
                Giới hạn tệp đính kèm (Storage Policy)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                  Dung lượng file tối đa (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.maxFileSizeMb}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxFileSizeMb: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                  Định dạng cho phép
                </label>
                <input
                  type="text"
                  value={config.allowedExtensions}
                  onChange={(e) =>
                    setConfig({ ...config, allowedExtensions: e.target.value })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>
            </div>
          </div>

          {/* Block 2: Cấu hình Email SMTP */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-6 space-y-4 animate-stagger delay-2">
            <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
              <Mail size={18} className="text-indigo-600" />
              <h3 className="text-[14px] font-bold text-gray-900">
                Hạ tầng Mail Server (SMTP)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={config.smtpHost}
                  onChange={(e) =>
                    setConfig({ ...config, smtpHost: e.target.value })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                  Port
                </label>
                <input
                  type="text"
                  value={config.smtpPort}
                  onChange={(e) =>
                    setConfig({ ...config, smtpPort: e.target.value })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                  Email gửi thông báo
                </label>
                <input
                  type="email"
                  value={config.smtpEmail}
                  onChange={(e) =>
                    setConfig({ ...config, smtpEmail: e.target.value })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>
              {/* ĐÃ THÊM Ô NHẬP PASSWORD */}
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                  App Password (Mật khẩu ứng dụng)
                </label>
                <input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={config.smtpPassword || ""}
                  onChange={(e) =>
                    setConfig({ ...config, smtpPassword: e.target.value })
                  }
                  className="w-full p-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              * Lưu ý: Nếu sử dụng Gmail, vui lòng sử dụng{" "}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-500 hover:underline"
              >
                Mật khẩu ứng dụng (App Password)
              </a>{" "}
              gồm 16 ký tự.
            </p>
          </div>

          {/* Nút lưu */}
          <div className="flex justify-end animate-stagger delay-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {saving ? "Đang lưu..." : "Lưu thiết lập"}
            </button>
          </div>
        </form>

        {/* Block 3: Phát sóng thông báo khẩn cấp (Broadcast) */}
        <div className="bg-gradient-to-r from-indigo-50/70 via-white to-white rounded-2xl border border-indigo-100 p-6 space-y-4 shadow-2xs animate-stagger delay-4">
          <div className="flex items-center gap-2.5 pb-2">
            <Radio size={20} className="text-indigo-600 animate-pulse" />
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">
                Phát tin nhắn toàn sàn (Broadcast)
              </h3>
              <p className="text-[12px] text-gray-500">
                Tin nhắn sẽ lập tức hiển thị trên màn hình của tất cả user đang
                mở ứng dụng
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <textarea
              rows="3"
              value={broadcastMsg}
              onChange={(e) => setBroadcastMsg(e.target.value)}
              placeholder="Ví dụ: Hệ thống sẽ bảo trì nâng cấp dịch vụ trong 15 phút tới. Vui lòng lưu lại công việc..."
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-2xs transition-shadow"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={isSendingBroadcast || !broadcastMsg.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isSendingBroadcast ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                <span>Bắn thông báo toàn sàn</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
