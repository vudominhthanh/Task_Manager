import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Download, RefreshCw, Info, AlertTriangle, XCircle,
  ChevronLeft, ChevronRight, Loader2, Inbox, Filter,
  Bug, Zap, ShieldCheck, X,
} from "lucide-react";
import toast from "react-hot-toast";

// ============================================================
//  CONSTANTS
// ============================================================
const LOG_API = "http://localhost:8081/api";   // Activity service
const PAGE_SIZE = 20;

const LEVEL_OPTIONS = [
  { value: "ALL",   label: "Tất cả", icon: Filter,        color: "text-gray-600 dark:text-gray-300" },
  { value: "INFO",  label: "INFO",   icon: Info,          color: "text-cyan-600 dark:text-cyan-400" },
  { value: "WARN",  label: "WARN",   icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400" },
  { value: "ERROR", label: "ERROR",  icon: XCircle,       color: "text-red-600 dark:text-red-400" },
];

// ============================================================
//  MOCK DATA (thay bằng fetch API khi BE sẵn sàng)
// ============================================================
const MOCK_LOGS = [
  { id: 1, timestamp: "2026-09-21 14:02:45", level: "INFO",  service: "project-service", message: "PostgreSQL connection pool initialized. (Active: 12/100)" },
  { id: 2, timestamp: "2026-09-21 14:02:50", level: "WARN",  service: "task-service",    message: "High latency detected on TaskService execution (450ms)." },
  { id: 3, timestamp: "2026-09-21 14:03:12", level: "INFO",  service: "kafka-broker",    message: "Kafka broker successfully consumed 1500 messages/sec." },
  { id: 4, timestamp: "2026-09-21 14:03:40", level: "ERROR", service: "api-gateway",     message: "Failed login attempt from suspicious IP: 103.45.xx.xx (Blocked by Firewall)." },
  { id: 5, timestamp: "2026-09-21 14:04:01", level: "INFO",  service: "auth-service",    message: "JWT Token generated successfully for user ID: 2310900099." },
  { id: 6, timestamp: "2026-09-21 14:04:15", level: "WARN",  service: "task-service",    message: "Retry attempt 2/3 for task sync to activity-service." },
  { id: 7, timestamp: "2026-09-21 14:04:32", level: "ERROR", service: "user-service",    message: "Duplicate email registration rejected: user@example.com" },
  { id: 8, timestamp: "2026-09-21 14:05:10", level: "INFO",  service: "api-gateway",     message: "Rate limit check passed for IP 14.225.xx.xx (87/100 req/min)." },
  { id: 9, timestamp: "2026-09-21 14:05:44", level: "INFO",  service: "project-service", message: "Scheduled task cleanup completed. 3 orphan rows removed." },
  { id: 10, timestamp: "2026-09-21 14:06:01", level: "WARN", service: "kafka-broker",    message: "Consumer lag on topic 'task-events' reached 5000 messages." },
  { id: 11, timestamp: "2026-09-21 14:06:30", level: "ERROR", service: "task-service",   message: "Failed to persist task status update. Rollback executed." },
  { id: 12, timestamp: "2026-09-21 14:06:58", level: "INFO",  service: "auth-service",   message: "Refresh token rotation completed for 15 active sessions." },
];

// ============================================================
//  HELPERS
// ============================================================
const LEVEL_ORDER = { ERROR: 0, WARN: 1, INFO: 2 };

const formatLogForExport = (log) =>
  `[${log.timestamp}] [${log.level}] [${log.service}] ${log.message}`;

// ============================================================
//  MAIN COMPONENT
// ============================================================
export default function SystemLogsPage() {
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("ALL");

  const [page, setPage] = useState(0);

  // ========== DEBOUNCE SEARCH ==========
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => { setPage(0); }, [debouncedSearch, selectedLevel]);

  // ============================================================
  //  FETCH LOGS
  //  TODO: Đổi thành apiClient.get(`${LOG_API}/admin/logs`) khi BE sẵn sàng
  // ============================================================
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ⚠️ Hiện tại dùng mock. Khi BE có endpoint:
      //   const res = await apiClient.get(`${LOG_API}/admin/logs`, { params: { search: debouncedSearch, level: selectedLevel } });
      //   setAllLogs(res.data || []);
      await new Promise((r) => setTimeout(r, 400));   // fake network delay
      setAllLogs(MOCK_LOGS);
    } catch (err) {
      console.error("Lỗi tải logs:", err);
      setError("Không thể tải nhật ký hệ thống!");
      toast.error("Không thể tải nhật ký hệ thống!");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ============================================================
  //  FILTER + SORT
  // ============================================================
  const filteredLogs = useMemo(() => {
    let list = [...allLogs];

    // Filter level
    if (selectedLevel !== "ALL") {
      list = list.filter((l) => l.level === selectedLevel);
    }

    // Filter search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (l) =>
          l.message?.toLowerCase().includes(q) ||
          l.service?.toLowerCase().includes(q) ||
          l.level?.toLowerCase().includes(q) ||
          l.timestamp?.includes(q)
      );
    }

    // Sort mới nhất lên đầu
    list.sort((a, b) => {
      const t1 = new Date(b.timestamp).getTime();
      const t2 = new Date(a.timestamp).getTime();
      if (t1 !== t2) return t1 - t2;
      return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
    });

    return list;
  }, [allLogs, selectedLevel, debouncedSearch]);

  // ============================================================
  //  STATS
  // ============================================================
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const info = filteredLogs.filter((l) => l.level === "INFO").length;
    const warn = filteredLogs.filter((l) => l.level === "WARN").length;
    const err = filteredLogs.filter((l) => l.level === "ERROR").length;
    return { total, info, warn, err };
  }, [filteredLogs]);

  // ============================================================
  //  PAGINATION
  // ============================================================
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pagedLogs = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, page]);

  // ============================================================
  //  ACTIONS
  // ============================================================
  const handleDownload = () => {
    if (filteredLogs.length === 0) {
      toast.error("Không có log để tải!");
      return;
    }
    const content = filteredLogs.map(formatLogForExport).join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `system-logs_${new Date().toISOString().slice(0, 10)}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Đã tải xuống ${filteredLogs.length} dòng log!`);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedLevel("ALL");
  };

  const hasActiveFilters = searchTerm || selectedLevel !== "ALL";

  // ============================================================
  //  RENDER
  // ============================================================
  return (
    <div className="h-full overflow-y-auto p-6 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] dark:[scrollbar-color:#4B5563_transparent] flex flex-col gap-6 transition-colors">

      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight">
            Nhật ký hệ thống
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
            Lịch sử vết hệ thống (Audit Trail) phục vụ công tác kiểm tra an ninh và gỡ lỗi kỹ thuật.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-[13px] font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} /> Tải Log
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[13px] font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Tổng log"
          value={stats.total}
          icon={Filter}
          iconBg="bg-indigo-50 dark:bg-indigo-500/10"
          iconColor="text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          label="INFO"
          value={stats.info}
          icon={Info}
          iconBg="bg-cyan-50 dark:bg-cyan-500/10"
          iconColor="text-cyan-600 dark:text-cyan-400"
        />
        <StatCard
          label="WARN"
          value={stats.warn}
          icon={AlertTriangle}
          iconBg="bg-amber-50 dark:bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          label="ERROR"
          value={stats.err}
          icon={XCircle}
          iconBg="bg-red-50 dark:bg-red-500/10"
          iconColor="text-red-600 dark:text-red-400"
          alert={stats.err > 0}
        />
      </div>

      {/* TOOLBAR */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 transition-colors">
        <div className="relative w-full md:w-[350px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Tìm theo từ khóa, service, level..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {LEVEL_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = selectedLevel === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedLevel(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer border ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <Icon size={12} />
                {opt.label}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors cursor-pointer"
            >
              <X size={12} /> Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* LOG STREAM */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden flex flex-col transition-colors">

        {/* Stream header */}
        <div className="bg-gray-50/80 dark:bg-gray-800/60 px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 justify-between items-center text-gray-500 dark:text-gray-400 text-[12px]">
          <span className="font-semibold flex items-center gap-1.5">
            <Zap size={12} className="text-indigo-500" />
            Luồng Log trực tiếp từ hệ thống Microservices
          </span>
          <span>
            {filteredLogs.length > 0
              ? `Hiển thị ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filteredLogs.length)} / ${filteredLogs.length} bản ghi`
              : "0 bản ghi"}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
            <span className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
              Đang tải nhật ký hệ thống...
            </span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="py-16 flex flex-col items-center justify-center">
            <XCircle size={36} className="text-red-400 mb-3" />
            <p className="text-[14px] font-semibold text-gray-700 dark:text-gray-300 mb-1">{error}</p>
            <button
              onClick={fetchLogs}
              className="mt-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[13px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Thử lại
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredLogs.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <Inbox size={28} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 mb-1">
              Không có log nào
            </h3>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 max-w-sm text-center">
              {hasActiveFilters
                ? "Không tìm thấy log nào khớp với bộ lọc hiện tại."
                : "Chưa có bản ghi log nào từ hệ thống."}
            </p>
          </div>
        )}

        {/* Logs list */}
        {!loading && !error && pagedLogs.length > 0 && (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {pagedLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5 shrink-0">
                    <LogLevelBadge level={log.level} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-mono font-bold text-gray-800 dark:text-gray-100">
                        {log.service}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                        • {log.timestamp}
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-600 dark:text-gray-300 mt-1 font-mono break-all">
                      {log.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && filteredLogs.length > 0 && (
          <div className="bg-gray-50/50 dark:bg-gray-800/40 px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap justify-between items-center gap-3 text-gray-600 dark:text-gray-400 text-[12px]">
            <span className="text-gray-400 dark:text-gray-500 font-medium">
              {PAGE_SIZE} dòng/trang — phân trang client-side
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 font-bold text-indigo-600 dark:text-indigo-400">
                Trang {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
//  HELPER COMPONENTS
// ============================================================
function StatCard({ label, value, icon: Icon, iconBg, iconColor, alert }) {
  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between transition-colors">
      <div>
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
          {label}
        </p>
        <h3 className={`text-[20px] font-bold leading-none ${
          alert ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-gray-100"
        }`}>
          {value}
        </h3>
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={16} className={iconColor} />
      </div>
    </div>
  );
}

function LogLevelBadge({ level }) {
  const map = {
    INFO:  { color: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20",   icon: Info },
    WARN:  { color: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20", icon: AlertTriangle },
    ERROR: { color: "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",           icon: XCircle },
    DEBUG: { color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600",          icon: Bug },
  };
  const cfg = map[level] || map.INFO;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border shrink-0 ${cfg.color}`}>
      <Icon size={12} strokeWidth={2.5} /> {level}
    </span>
  );
}