import React, { useState } from "react";
import { 
  Settings, Shield, Mail, Database, Globe, 
  Save, CheckCircle2 
} from "lucide-react";

export default function SettingsPage() {
  // State riêng biệt cho từng khối chức năng
  const [general, setGeneral] = useState({
    appName: "WorkFlow ",
    supportEmail: "support@workflow.vn",
    maintenanceMode: false,
  });
  const [savedGeneral, setSavedGeneral] = useState(false);

  const [security, setSecurity] = useState({
    enforce2FA: true,
    sessionTimeout: 60,
  });
  const [savedSecurity, setSavedSecurity] = useState(false);

  const [smtp, setSmtp] = useState({
    smtpHost: "smtp.sendgrid.net",
    smtpPort: "587",
    smtpUser: "apikey",
  });
  const [savedSmtp, setSavedSmtp] = useState(false);

  const [limits, setLimits] = useState({
    backupSchedule: "daily",
    apiRateLimit: 1000,
  });
  const [savedLimits, setSavedLimits] = useState(false);

  const handleSaveSection = (setSavedState) => {
    setSavedState(true);
    setTimeout(() => setSavedState(false), 3000);
  };

  return (
    <div className="h-full overflow-y-auto p-6 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] pb-20">
      
      {/* TIÊU ĐỀ CHUNG */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Cài đặt hệ thống </h1>
        <p className="text-[13px] text-gray-500 mt-1">Quản lý toàn bộ tham số vận hành, bảo mật và tích hợp bên thứ ba theo từng phân vùng riêng biệt.</p>
      </div>

      {/* SẮP XẾP DẠNG LƯỚI 2 KHỐI MỖI HÀNG - MỖI KHỐI CÓ NÚT LƯU RIÊNG */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* KHỐI 1: CẤU HÌNH CHUNG & THƯƠNG HIỆU */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Globe size={16} className="text-indigo-600" />
                <h2 className="text-[13.5px] font-bold text-gray-800">Cấu hình chung & Thương hiệu</h2>
              </div>
              {savedGeneral && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 size={13} /> Đã lưu
                </span>
              )}
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Tên nền tảng (App Name)</label>
                <input 
                  type="text" 
                  value={general.appName} 
                  onChange={(e) => setGeneral({...general, appName: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Email Hỗ trợ kỹ thuật</label>
                <input 
                  type="email" 
                  value={general.supportEmail} 
                  onChange={(e) => setGeneral({...general, supportEmail: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium"
                />
              </div>
              <div className="flex items-center justify-between p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl">
                <div>
                  <h4 className="text-[12.5px] font-bold text-gray-900">Chế độ bảo trì (Maintenance)</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Hiển thị thông báo bảo trì cho user thường.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={general.maintenanceMode} 
                    onChange={(e) => setGeneral({...general, maintenanceMode: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 border-t border-gray-100 flex justify-end">
            <button 
              onClick={() => handleSaveSection(setSavedGeneral)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
            >
              <Save size={14} /> Lưu cấu hình chung
            </button>
          </div>
        </div>

        {/* KHỐI 2: BẢO MẬT & XÁC THỰC */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield size={16} className="text-indigo-600" />
                <h2 className="text-[13.5px] font-bold text-gray-800">Bảo mật & Xác thực</h2>
              </div>
              {savedSecurity && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 size={13} /> Đã lưu
                </span>
              )}
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200/80 rounded-xl">
                <div>
                  <h4 className="text-[12.5px] font-bold text-gray-800">Xác thực 2 bước (2FA)</h4>
                  <p className="text-[11px] text-gray-500">Áp dụng cho tài khoản quản trị.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={security.enforce2FA} 
                  onChange={(e) => setSecurity({...security, enforce2FA: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Thời gian hết hạn phiên (Timeout - Phút)</label>
                <input 
                  type="number" 
                  value={security.sessionTimeout} 
                  onChange={(e) => setSecurity({...security, sessionTimeout: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium"
                />
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 border-t border-gray-100 flex justify-end">
            <button 
              onClick={() => handleSaveSection(setSavedSecurity)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
            >
              <Save size={14} /> Cập nhật bảo mật
            </button>
          </div>
        </div>

        {/* KHỐI 3: CỔNG SMTP EMAIL */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mail size={16} className="text-indigo-600" />
                <h2 className="text-[13.5px] font-bold text-gray-800">Cổng Gửi Thư Tín (SMTP Mail Server)</h2>
              </div>
              {savedSmtp && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 size={13} /> Đã lưu
                </span>
              )}
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">SMTP Host</label>
                  <input 
                    type="text" 
                    value={smtp.smtpHost} 
                    onChange={(e) => setSmtp({...smtp, smtpHost: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Port</label>
                  <input 
                    type="text" 
                    value={smtp.smtpPort} 
                    onChange={(e) => setSmtp({...smtp, smtpPort: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">SMTP Username / API Key</label>
                <input 
                  type="text" 
                  value={smtp.smtpUser} 
                  onChange={(e) => setSmtp({...smtp, smtpUser: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium"
                />
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 border-t border-gray-100 flex items-center justify-between">
            <button 
              type="button" 
              onClick={() => alert("Đã gửi email test thành công!")}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer"
            >
              Gửi Email Test
            </button>
            <button 
              onClick={() => handleSaveSection(setSavedSmtp)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
            >
              <Save size={14} /> Lưu cấu hình SMTP
            </button>
          </div>
        </div>

        {/* KHỐI 4: SAO LƯU & GIỚI HẠN API */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database size={16} className="text-indigo-600" />
                <h2 className="text-[13.5px] font-bold text-gray-800">Sao lưu Dữ liệu & Giới hạn Tải</h2>
              </div>
              {savedLimits && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 size={13} /> Đã lưu
                </span>
              )}
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Lịch trình tự động Backup Database</label>
                <select 
                  value={limits.backupSchedule} 
                  onChange={(e) => setLimits({...limits, backupSchedule: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium cursor-pointer"
                >
                  <option value="hourly">Mỗi giờ một lần</option>
                  <option value="daily">Hàng ngày (02:00 AM)</option>
                  <option value="weekly">Hàng tuần</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Giới hạn API Rate Limit (Requests / Phút)</label>
                <input 
                  type="number" 
                  value={limits.apiRateLimit} 
                  onChange={(e) => setLimits({...limits, apiRateLimit: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-medium"
                />
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 pt-2 border-t border-gray-100 flex justify-end">
            <button 
              onClick={() => handleSaveSection(setSavedLimits)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[12.5px] font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
            >
              <Save size={14} /> Lưu thiết lập
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}