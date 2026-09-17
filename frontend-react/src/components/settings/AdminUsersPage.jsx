import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../utils/apiClient";
import { Users, Search, Shield, Lock, Unlock, Mail, Calendar, Loader2, UserCheck, UserX, RefreshCw, } from "lucide-react";
import toast from "react-hot-toast";

const USER_API_BASE = "http://localhost:8086/api/users";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(USER_API_BASE, {
        params: search.trim() ? { search: search.trim() } : undefined,
      });

      const data = res.data;
      setUsers(Array.isArray(data) ? data : data?.content || []);
    } catch (err) {
      console.error("Lỗi fetch danh sách users:", err);
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleToggleBanUser = async (user) => {
    const nextStatus = !user.isActive;
    const confirmMsg = nextStatus
      ? `Xác nhận mở khóa tài khoản: "${user.fullName || user.username}"?`
      : `Bạn có chắc muốn KHÓA tài khoản: "${user.fullName || user.username}"? Người này sẽ bị chặn đăng nhập!`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(user.id);
    try {
      const res = await apiClient.patch(`${USER_API_BASE}/${user.id}/status`, {
        isActive: nextStatus,
      });

      const updated = res.data;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: updated.isActive } : u,
        ),
      );
      toast.success(
        nextStatus
          ? "Đã mở khóa tài khoản thành công!"
          : "Đã khóa tài khoản thành công!",
      );
    } catch (e) {
      console.error("Lỗi cập nhật trạng thái user:", e);
      const msg =
        e.response?.data?.message ||
        e.message ||
        "Cập nhật trạng thái thất bại. Vui lòng kiểm tra quyền Admin!";
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeSystemRole = async (user) => {
    const currentRole = user.role || "USR";
    const nextRole = currentRole === "SYS_AD" ? "USR" : "SYS_AD";
    const nextRoleLabel =
      nextRole === "SYS_AD"
        ? "System Admin (SYS_AD)"
        : "Thành viên thường (USR)";

    if (
      !window.confirm(
        `Xác nhận đổi quyền của "${user.fullName || user.username}" thành ${nextRoleLabel}?`,
      )
    ) {
      return;
    }

    setActionLoadingId(user.id);
    try {
      const res = await apiClient.patch(`${USER_API_BASE}/${user.id}/role`, {
        role: nextRole,
      });

      const updated = res.data;
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: updated.role } : u)),
      );
      toast.success(`Đã chuyển vai trò sang ${nextRoleLabel}!`);
    } catch (e) {
      console.error("Lỗi đổi role:", e);
      const msg =
        e.response?.data?.message ||
        e.message ||
        "Đổi vai trò thất bại. Vui lòng kiểm tra quyền hạn!";
      toast.error(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const isSysAdmin = u.role === "SYS_AD" || u.role === "ROLE_ADMIN";

    let matchRole = true;
    if (roleFilter === "SYS_AD") matchRole = isSysAdmin;
    if (roleFilter === "USR") matchRole = !isSysAdmin;

    const matchSearch =
      (u.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.username || "").toLowerCase().includes(search.toLowerCase());

    return matchRole && matchSearch;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("vi-VN");
  };

  const handleManualRefresh = async () => {
    await fetchUsers();
    toast.success("Đã làm mới danh sách tài khoản!");
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeInUpSlow {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          /* Component bọc ngoài (Khung Header và Bảng) */
          .animate-stagger {
            opacity: 0;
            animation: fadeInUpSlow 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .delay-0 { animation-delay: 0s; }
          .delay-1 { animation-delay: 0.15s; }
          
          /* Hiệu ứng trượt lên cho từng dòng (Row) trong bảng */
          .animate-row {
            opacity: 0;
            animation: fadeInUpSlow 0.6s ease-out forwards;
          }
        `}
      </style>

      <div className="max-w-6xl mx-auto space-y-6 font-sans">
        {/* Header & Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-stagger delay-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Quản lý người dùng toàn hệ thống
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                {filteredUsers.length} tài khoản
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Dữ liệu tài khoản được quản lý trực tiếp trên PostgreSQL
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên, email, username..."
                className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs transition-shadow"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-[13px] bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none cursor-pointer shadow-2xs text-gray-700 font-medium transition-shadow"
            >
              <option value="ALL">Mọi quyền</option>
              <option value="SYS_AD">System Admin</option>
              <option value="USR">User / Member</option>
            </select>

            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="p-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 text-gray-600 cursor-pointer shadow-2xs transition-colors"
              title="Làm mới danh sách"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden animate-stagger delay-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px]">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Tài khoản</th>
                  <th className="py-3 px-5">Email & Liên hệ</th>
                  <th className="py-3 px-5">Vai trò hệ thống</th>
                  <th className="py-3 px-5">Trạng thái</th>
                  <th className="py-3 px-5">Ngày tạo</th>
                  <th className="py-3 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[13px]">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-14 text-center text-gray-400">
                      <Loader2
                        size={24}
                        className="animate-spin text-indigo-600 mx-auto mb-2"
                      />
                      Đang nạp danh sách tài khoản từ database...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="py-10 text-center text-gray-400 italic"
                    >
                      Không tìm thấy người dùng phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, index) => {
                    const isBanned = u.isActive === false;
                    const isSysAdmin =
                      u.role === "SYS_AD" || u.role === "ROLE_ADMIN";
                    const isOperating = actionLoadingId === u.id;

                    return (
                      <tr
                        key={u.id}
                        className="animate-row hover:bg-gray-50/50 transition-colors"
                        style={{ animationDelay: `${0.15 + index * 0.05}s` }}
                      >
                        {/* Avatar & Tên */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt="Avatar"
                                className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-2xs"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                                {u.fullName?.charAt(0) ||
                                  u.username?.charAt(0) ||
                                  "U"}
                              </div>
                            )}
                            <div>
                              <span className="font-semibold text-gray-900 block leading-tight">
                                {u.fullName || "Chưa đặt tên"}
                              </span>
                              <span className="text-[11px] text-gray-400 font-mono">
                                @{u.username}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email & Số điện thoại */}
                        <td className="py-3.5 px-5">
                          <div className="flex flex-col">
                            <span className="text-gray-800 font-medium">
                              {u.email}
                            </span>
                            <span className="text-[11px] text-gray-400">
                              {u.phoneNumber || "Chưa có SĐT"}
                            </span>
                          </div>
                        </td>

                        {/* Vai trò (Role) */}
                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                              isSysAdmin
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200/60"
                            }`}
                          >
                            <Shield size={12} />{" "}
                            {isSysAdmin ? "System Admin" : "User (USR)"}
                          </span>
                        </td>

                        {/* Trạng thái (Active / Banned) */}
                        <td className="py-3.5 px-5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isBanned
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${isBanned ? "bg-red-500" : "bg-emerald-500"}`}
                            />
                            {isBanned ? "Bị khóa" : "Hoạt động"}
                          </span>
                        </td>

                        {/* Ngày tạo */}
                        <td className="py-3.5 px-5 text-gray-500 text-[12px]">
                          {formatDate(u.createdAt)}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleChangeSystemRole(u)}
                              disabled={isOperating}
                              className="px-2.5 py-1 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                              title="Chuyển đổi giữa SYS_AD và USR"
                            >
                              Đổi vai trò
                            </button>

                            <button
                              onClick={() => handleToggleBanUser(u)}
                              disabled={isOperating}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-50 ${
                                isBanned
                                  ? "text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                                  : "text-red-600 border-red-200 bg-red-50 hover:bg-red-100"
                              }`}
                              title={
                                isBanned
                                  ? "Mở khóa tài khoản"
                                  : "Khóa tài khoản"
                              }
                            >
                              {isOperating ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : isBanned ? (
                                <Unlock size={14} />
                              ) : (
                                <Lock size={14} />
                              )}
                            </button>
                          </div>
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
