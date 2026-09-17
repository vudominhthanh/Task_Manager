import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../utils/apiClient";
import { FileText, Search, Filter, AlertTriangle, ShieldAlert, Loader2, LogIn, Trash2, UserCheck, RefreshCw, AlertCircle, } from "lucide-react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [search, setSearch] = useState("");

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`http://localhost:8081/api/activities?search=${search}`);
      const data = res.data;
      if (data) {
        const flatList = data.flatMap((g) => g.logs || []);
        setLogs(flatList);
      } else {
        setFetchError(true);
      }
    } catch (e) {
      console.error("Lỗi tải audit logs:", e);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuditLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAuditLogs]);

  const getLogSeverity = (actionType = "") => {
    if (actionType.includes("DELETE") || actionType.includes("REMOVED")) {
      return {
        label: "HIGH",
        color: "bg-red-50 text-red-600 border-red-200",
        icon: Trash2,
      };
    }
    if (actionType.includes("ROLE") || actionType.includes("STATUS")) {
      return {
        label: "MEDIUM",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        icon: AlertTriangle,
      };
    }
    return {
      label: "INFO",
      color: "bg-blue-50 text-blue-600 border-blue-200",
      icon: LogIn,
    };
  };

  return (
    <>
      {/* Khai báo CSS keyframes cho hiệu ứng mượt mà */}
      <style>
        {`
          @keyframes fadeInUpSlow {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          /* Khối header và bảng */
          .animate-stagger {
            opacity: 0;
            animation: fadeInUpSlow 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .delay-0 { animation-delay: 0s; }
          .delay-1 { animation-delay: 0.15s; }
          
          /* Hiệu ứng trượt cho từng dòng lịch sử (Row) */
          .animate-row {
            opacity: 0;
            animation: fadeInUpSlow 0.6s ease-out forwards;
          }
        `}
      </style>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Thanh tìm kiếm */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-stagger delay-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Security Audit Logs
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Ghi vết bất biến toàn bộ hành vi CRUD, đăng nhập và phân quyền
              trên hệ thống
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Lọc sự kiện, user, mục tiêu..."
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs transition-shadow"
            />
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden animate-stagger delay-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Mức độ</th>
                  <th className="py-3 px-5">Người thực hiện</th>
                  <th className="py-3 px-5">Hành động</th>
                  <th className="py-3 px-5">Đối tượng tác động</th>
                  <th className="py-3 px-5">Dự án</th>
                  <th className="py-3 px-5">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[13px]">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-gray-400">
                      <Loader2
                        size={24}
                        className="animate-spin text-indigo-600 mx-auto mb-2"
                      />
                      Đang nạp dữ liệu kiểm toán...
                    </td>
                  </tr>
                ) : fetchError ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle size={28} className="text-red-400" />
                        <span className="text-[13px] text-gray-700 font-medium">
                          Không thể nạp nhật ký kiểm toán!
                        </span>
                        <button
                          onClick={fetchAuditLogs}
                          className="mt-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          <RefreshCw size={13} /> Thử lại
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400">
                      Không có log nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => {
                    const severity = getLogSeverity(log.actionType);
                    const Icon = severity.icon;
                    return (
                      <tr
                        key={log.id || idx}
                        className="animate-row hover:bg-gray-50/50 transition-colors"
                        style={{ animationDelay: `${0.15 + idx * 0.05}s` }}
                      >
                        <td className="py-3 px-5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${severity.color}`}
                          >
                            <Icon size={11} /> {severity.label}
                          </span>
                        </td>
                        <td className="py-3 px-5 font-bold text-gray-900">
                          {log.user || log.username || "System"}
                        </td>
                        <td className="py-3 px-5 font-mono text-[12px] text-indigo-600">
                          {log.actionType}
                        </td>
                        <td className="py-3 px-5 text-gray-700 font-medium">
                          {log.target || log.targetName || "N/A"}
                        </td>
                        <td className="py-3 px-5 text-gray-500">
                          {log.project || log.projectName || "Chung"}
                        </td>
                        <td className="py-3 px-5 text-gray-400 text-[12px]">
                          {log.date} {log.time}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
