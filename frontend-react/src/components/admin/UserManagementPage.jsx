import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search, Download, Lock, Unlock, Shield, User, ShieldAlert,
  ChevronLeft, ChevronRight, Edit, ChevronDown, Check,
  Loader2, RefreshCw, AlertCircle, Inbox, Crown, UserCheck,
} from "lucide-react";
import apiClient from "../../utils/apiClient";
import toast from "react-hot-toast";
import UserDetailsModal from "../function/UserDetailsModal";

const USER_API = "http://localhost:8086/api";
const PAGE_SIZE = 10;

const FILTER_OPTIONS = [
  { value: "all",     label: "Tất cả trạng thái" },
  { value: "active",  label: "Đang hoạt động" },
  { value: "banned",  label: "Bị khóa" },
  { value: "pending", label: "Chờ duyệt" },
];

// Map role backend → tên hiển thị + style
const ROLE_MAP = {
  SYS_AD:        { display: "Super Admin", type: "super" },
  ROLE_SYS_AD:   { display: "Super Admin", type: "super" },
  SUPER_ADMIN:   { display: "Super Admin", type: "super" },
  ADMIN:         { display: "Admin",       type: "admin" },
  ROLE_ADMIN:    { display: "Admin",       type: "admin" },
  MANAGER:       { display: "Manager",     type: "manager" },
  ROLE_MANAGER:  { display: "Manager",     type: "manager" },
  USER:          { display: "User",        type: "user" },
  ROLE_USER:     { display: "User",        type: "user" },
};

const COLOR_PALETTE = [
  "bg-indigo-600", "bg-blue-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-purple-500",
  "bg-cyan-500", "bg-pink-500",
];

const pickColor = (seed) => {
  if (!seed) return COLOR_PALETTE[0];
  let h = 0;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return COLOR_PALETTE[Math.abs(h) % COLOR_PALETTE.length];
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const DD = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    return `${DD}/${MM}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

const mapUserFromBE = (u) => {
  const name = u.fullName || u.fullname || u.username || u.name || "Người dùng";
  const rawRole =
    u.roles?.[0]?.name ||
    u.systemRoles?.[0]?.name ||
    u.role ||
    "USER";
  const roleCfg = ROLE_MAP[rawRole] || { display: "User", type: "user" };

  let status = "Active";
  if (u.isActive === false || u.status === "BANNED" || u.status === "Banned") {
    status = "Banned";
  } else if (u.status === "PENDING" || u.status === "Pending") {
    status = "Pending";
  }

  const id = u.id || u.userId;

  return {
    id,
    name,
    email: u.email || "—",
    username: u.username || "",
    phoneNumber: u.phoneNumber || "",
    avatarUrl: u.avatarUrl || "",
    role: roleCfg.display,
    roleType: roleCfg.type,
    rawRole,
    status,
    isActive: status !== "Banned",
    joinDate: formatDate(u.createdAt || u.joinDate),
    avatar: name.charAt(0).toUpperCase(),
    color: pickColor(id),
    _raw: u,
  };
};

export default function UserManagementPage() {
  // ========== STATE ==========
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef(null);

  const [page, setPage] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // ========== CLICK OUTSIDE ==========
  useEffect(() => {
    const handler = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ========== DEBOUNCE ==========
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page khi filter/search đổi
  useEffect(() => { setPage(0); }, [debouncedSearch, filterStatus]);

  // ========== FETCH ==========
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {};
      const res = await apiClient.get(`${USER_API}/users`, { params });
      const data = res.data;
      const list = Array.isArray(data) ? data : data?.content || [];
      setUsers(list.map(mapUserFromBE));
    } catch (err) {
      console.error("Lỗi tải danh sách người dùng:", err);
      setError("Không thể tải danh sách người dùng!");
      toast.error("Không thể tải danh sách người dùng!");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ========== STATS (tính từ data) ==========
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "Active").length;
    const admins = users.filter((u) => ["super", "admin"].includes(u.roleType)).length;
    const banned = users.filter((u) => u.status === "Banned").length;
    const activePercent = total > 0 ? ((active / total) * 100).toFixed(1) : "0";
    return { total, active, admins, banned, activePercent };
  }, [users]);

  // ========== FILTER CLIENT-SIDE ==========
  const filteredUsers = useMemo(() => {
    if (filterStatus === "all") return users;
    return users.filter((u) => {
      if (filterStatus === "active")  return u.status === "Active";
      if (filterStatus === "banned")  return u.status === "Banned";
      if (filterStatus === "pending") return u.status === "Pending";
      return true;
    });
  }, [users, filterStatus]);

  // ========== PAGINATION CLIENT-SIDE ==========
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  // ========== ACTIONS ==========
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleToggleBan = async (user) => {
    const willBan = user.status !== "Banned";
    const nextIsActive = !willBan;

    // Optimistic update
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
              ...u,
              status: willBan ? "Banned" : "Active",
              isActive: nextIsActive,
            }
          : u
      )
    );

    try {
      await apiClient.patch(`${USER_API}/users/${user.id}/status`, {
        isActive: nextIsActive,
      });
      toast.success(
        willBan ? `Đã khóa tài khoản ${user.name}` : `Đã mở khóa ${user.name}`
      );
    } catch (err) {
      // Rollback
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, status: user.status, isActive: user.isActive }
            : u
        )
      );
      toast.error(err.response?.data?.message || "Thao tác thất bại!");
    }
  };

  const handleSaveUser = async (updatedUser) => {
    // Cập nhật UI ngay (optimistic)
    setUsers((prev) =>
      prev.map((u) =>
        u.id === updatedUser.id
          ? {
              ...u,
              name: updatedUser.name || u.name,
              role: updatedUser.role || u.role,
              status: updatedUser.status || u.status,
            }
          : u
      )
    );
    toast.success("Đã cập nhật thông tin người dùng!");
  };

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      toast.error("Không có dữ liệu để xuất!");
      return;
    }
    const headers = ["Tên", "Email", "Vai trò", "Trạng thái", "Ngày tham gia"];
    const rows = filteredUsers.map((u) => [
      u.name,
      u.email,
      u.role,
      u.status,
      u.joinDate,
    ]);
    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Đã xuất file CSV!");
  };

  // ========== RENDER ==========
  return (
    <div className="h-full overflow-y-auto p-6 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] dark:[scrollbar-color:#4B5563_transparent] transition-colors">

      {/* 1. HEADER */}
      <div className="flex flex-wrap justify-between items-end gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight">
            Quản lý người dùng
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
            Quản lý tài khoản, phân quyền và trạng thái truy cập của toàn hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-[13px] font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm cursor-pointer"
          >
            <Download size={16} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* 2. STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MiniStatCard
          title="Tổng người dùng"
          value={stats.total.toLocaleString("vi-VN")}
          trend="Toàn hệ thống"
          icon={User}
          iconBg="bg-indigo-50 dark:bg-indigo-500/10"
          iconColor="text-indigo-600 dark:text-indigo-400"
        />
        <MiniStatCard
          title="Đang hoạt động"
          value={stats.active.toLocaleString("vi-VN")}
          trend={`${stats.activePercent}%`}
          icon={UserCheck}
          iconBg="bg-emerald-50 dark:bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <MiniStatCard
          title="Quản trị viên"
          value={stats.admins.toLocaleString("vi-VN")}
          trend="Admin & Super Admin"
          icon={Crown}
          iconBg="bg-purple-50 dark:bg-purple-500/10"
          iconColor="text-purple-600 dark:text-purple-400"
        />
        <MiniStatCard
          title="Bị khóa"
          value={stats.banned.toLocaleString("vi-VN")}
          trend="Cần chú ý"
          icon={ShieldAlert}
          iconBg="bg-red-50 dark:bg-red-500/10"
          iconColor="text-red-600 dark:text-red-400"
          alert={stats.banned > 0}
        />
      </div>

      {/* 3. TABLE CONTAINER */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm flex flex-col transition-colors">

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
          <div className="relative w-full sm:w-[320px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Tìm kiếm tên, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none" ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="w-full flex items-center justify-between gap-2 min-w-[150px] px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer shadow-sm"
              >
                <span>{FILTER_OPTIONS.find((o) => o.value === filterStatus)?.label}</span>
                <ChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-1 w-full min-w-[160px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg rounded-xl overflow-hidden py-1 z-20">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setFilterStatus(opt.value); setIsFilterOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-[12px] font-medium transition-colors cursor-pointer ${
                        filterStatus === opt.value
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {opt.label}
                      {filterStatus === opt.value && <Check size={14} className="text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
            <span className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
              Đang tải danh sách người dùng...
            </span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="py-16 flex flex-col items-center justify-center">
            <AlertCircle size={36} className="text-red-400 mb-3" />
            <p className="text-[14px] font-semibold text-gray-700 dark:text-gray-300 mb-1">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[13px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Thử lại
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredUsers.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <Inbox size={28} className="text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 mb-1">
              Không có người dùng nào
            </h3>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 max-w-sm text-center">
              {searchTerm || filterStatus !== "all"
                ? "Không tìm thấy người dùng nào khớp với bộ lọc hiện tại."
                : "Chưa có người dùng nào trong hệ thống."}
            </p>
          </div>
        )}

        {/* Data table */}
        {!loading && !error && filteredUsers.length > 0 && (
          <>
            <div className="overflow-x-auto relative z-0">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-800/60 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">Người dùng</th>
                    <th className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">Vai trò</th>
                    <th className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">Trạng thái</th>
                    <th className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">Ngày tham gia</th>
                    <th className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group"
                    >
                      <td className="px-5 py-3 border-b border-gray-50 dark:border-gray-800/60">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.name}
                              className="w-9 h-9 rounded-full object-cover shadow-sm shrink-0 border border-gray-100 dark:border-gray-700"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold shadow-sm shrink-0 ${user.color}`}>
                              {user.avatar}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-[13.5px] font-semibold text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                              {user.name}
                            </span>
                            <span className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3 border-b border-gray-50 dark:border-gray-800/60">
                        <RoleBadge type={user.roleType} label={user.role} />
                      </td>

                      <td className="px-5 py-3 border-b border-gray-50 dark:border-gray-800/60">
                        <StatusBadge status={user.status} />
                      </td>

                      <td className="px-5 py-3 border-b border-gray-50 dark:border-gray-800/60 text-[13px] text-gray-600 dark:text-gray-300 font-medium">
                        {user.joinDate}
                      </td>

                      <td className="px-5 py-3 border-b border-gray-50 dark:border-gray-800/60 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-md transition-colors cursor-pointer border border-transparent"
                            title="Xem & Chỉnh sửa"
                          >
                            <Edit size={14} /> Sửa
                          </button>

                          <button
                            onClick={() => handleToggleBan(user)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-semibold rounded-md transition-colors cursor-pointer border border-transparent ${
                              user.status === "Banned"
                                ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                : "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                            }`}
                          >
                            {user.status === "Banned" ? (
                              <><Unlock size={14} /> Mở khóa</>
                            ) : (
                              <><Lock size={14} /> Khóa</>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-900 rounded-b-xl">
              <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">
                Hiển thị{" "}
                <span className="font-bold text-gray-700 dark:text-gray-200">
                  {filteredUsers.length === 0 ? 0 : page * PAGE_SIZE + 1}
                </span>{" "}
                đến{" "}
                <span className="font-bold text-gray-700 dark:text-gray-200">
                  {Math.min((page + 1) * PAGE_SIZE, filteredUsers.length)}
                </span>{" "}
                trong số{" "}
                <span className="font-bold text-gray-700 dark:text-gray-200">
                  {filteredUsers.length}
                </span>{" "}
                người dùng
              </p>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum = i;
                  if (totalPages > 5 && page >= 2) {
                    pageNum = Math.min(page - 2 + i, totalPages - 5 + i);
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-7 h-7 flex items-center justify-center text-[12px] rounded-md transition-colors cursor-pointer ${
                        page === pageNum
                          ? "font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : "font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      <UserDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveUser}
      />
    </div>
  );
}

/* ============================================================
   HELPER COMPONENTS
   ============================================================ */

function MiniStatCard({ title, value, trend, icon: Icon, iconBg, iconColor, alert }) {
  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {title}
        </p>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
            <Icon size={16} className={iconColor} />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <h3 className="text-[22px] font-bold text-gray-800 dark:text-gray-100 leading-none">
          {value}
        </h3>
        <span
          className={`text-[11px] font-medium ${
            alert
              ? "text-red-500 dark:text-red-400"
              : "text-emerald-500 dark:text-emerald-400"
          }`}
        >
          {trend}
        </span>
      </div>
    </div>
  );
}

function RoleBadge({ type, label }) {
  const configs = {
    super: {
      cls: "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-500/20",
      icon: ShieldAlert,
    },
    admin: {
      cls: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20",
      icon: Shield,
    },
    manager: {
      cls: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/20",
      icon: Shield,
    },
    user: {
      cls: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600",
      icon: User,
    },
  };
  const cfg = configs[type] || configs.user;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold border ${cfg.cls}`}>
      <Icon size={12} strokeWidth={2.5} /> {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const configs = {
    Active:  "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20",
    Banned:  "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/20",
    Pending: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/20",
  };

  return (
    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${configs[status] || configs.Pending}`}>
      {status}
    </span>
  );
}