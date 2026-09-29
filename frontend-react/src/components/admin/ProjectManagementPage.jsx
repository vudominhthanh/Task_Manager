import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, FolderKanban, Calendar, Users, ChevronDown, Check,
  PlayCircle, CheckCircle2, Archive, AlertCircle, Loader2,
  RefreshCw, ChevronLeft, ChevronRight, Inbox, Shield, Crown,
} from "lucide-react";
import apiClient from "../../utils/apiClient";
import toast from "react-hot-toast";
import ProjectDetailsModal from "../function/ProjectDetailsModal";

const PROJECT_API = "http://localhost:8083/api";

const STATUS_OPTIONS = [
  { value: "ALL",       label: "Tất cả trạng thái" },
  { value: "ACTIVE",    label: "Đang chạy" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "ARCHIVED",  label: "Đã lưu trữ" },
  { value: "SUSPENDED", label: "Tạm dừng" },
];

// ============================================================
//  Admin/role detection helpers
// ============================================================
const ADMIN_ROLE_KEYS = ["ADMIN", "PROJECT_ADMIN", "OWNER", "MANAGER", "LEADER"];

const isMemberAdmin = (member) => {
  if (!member) return false;
  if (member.isAdmin === true) return true;
  const role = (member.role || member.roleName || "").toUpperCase();
  return ADMIN_ROLE_KEYS.includes(role);
};

// Chọn admin "đại diện" của project — ưu tiên role cao nhất
const pickProjectAdmin = (members) => {
  if (!members || members.length === 0) return null;
  // Ưu tiên: ADMIN > PROJECT_ADMIN > OWNER > MANAGER > LEADER
  const priority = ["ADMIN", "PROJECT_ADMIN", "OWNER", "MANAGER", "LEADER"];
  for (const roleKey of priority) {
    const found = members.find((m) => {
      const r = (m.role || m.roleName || "").toUpperCase();
      return r === roleKey;
    });
    if (found) return found;
  }
  // Fallback: cờ isAdmin
  return members.find((m) => m.isAdmin === true) || null;
};

// ============================================================
//  Main component
// ============================================================
export default function ProjectManagementPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedProject, setSelectedProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  const [page, setPage] = useState(0);
  const [size] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // ========== CLICK OUTSIDE ==========
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
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

  useEffect(() => { setPage(0); }, [debouncedSearch, statusFilter]);

  // ============================================================
  //  FETCH: projects + members song song
  // ============================================================
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        size,
        ...(debouncedSearch.trim() ? { keyword: debouncedSearch.trim() } : {}),
      };

      const res = await apiClient.get(`${PROJECT_API}/projects`, { params });

      const data = res.data;
      let list = [];
      let total = 0;
      let pages = 1;

      if (Array.isArray(data)) {
        list = data;
        total = data.length;
      } else if (data?.content) {
        list = data.content;
        total = data.totalElements ?? list.length;
        pages = data.totalPages ?? 1;
      }

      // ✅ FETCH MEMBERS SONG SONG cho từng project
      const enriched = await Promise.all(
        list.map(async (p) => {
          try {
            const memRes = await apiClient.get(
              `${PROJECT_API}/projects/${p.id}/members`
            );
            const members = Array.isArray(memRes.data) ? memRes.data : [];

            const adminMember = pickProjectAdmin(members);
            const adminName =
              adminMember?.fullName ||
              adminMember?.fullname ||
              adminMember?.username ||
              adminMember?.email ||
              null;

            return {
              ...p,
              _members: members,
              membersCount: members.length,
              adminName,
              adminMember,
              // Đếm thêm: có bao nhiêu admin
              adminCount: members.filter(isMemberAdmin).length,
            };
          } catch (err) {
            // Không có quyền xem members → hiển thị 0 / null
            return {
              ...p,
              _members: [],
              membersCount: 0,
              adminName: null,
              adminMember: null,
              adminCount: 0,
            };
          }
        })
      );

      setProjects(enriched);
      setTotalPages(pages);
      setTotalElements(total);
    } catch (err) {
      console.error("Lỗi tải dự án:", err);
      setError("Không thể tải danh sách dự án!");
      toast.error("Không thể tải danh sách dự án!");
    } finally {
      setLoading(false);
    }
  }, [page, size, debouncedSearch]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // ========== HANDLERS ==========
  const handleCardClick = (project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleUpdateProject = async (updated) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
    );
    try {
      await apiClient.put(`${PROJECT_API}/projects/${updated.id}`, {
        name: updated.name,
        description: updated.description,
        status: updated.status,
        startDate: updated.startDate,
        endDate: updated.endDate,
      });
      toast.success("Cập nhật dự án thành công!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Cập nhật thất bại!");
      fetchProjects();
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await apiClient.delete(`${PROJECT_API}/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setTotalElements((n) => Math.max(0, n - 1));
      toast.success("Đã xóa dự án!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Xóa dự án thất bại!");
    }
  };

  const displayedProjects = projects.filter((p) => {
    if (statusFilter === "ALL") return true;
    return (p.status || "ACTIVE") === statusFilter;
  });


  return (
    <div className="h-full overflow-y-auto p-6 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] dark:[scrollbar-color:#4B5563_transparent] transition-colors">

      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-end gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 dark:text-white tracking-tight">
            Quản lý toàn bộ dự án
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
            Giám sát và quản trị tất cả workspace, dự án trên nền tảng.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-3 py-1.5 rounded-lg shadow-sm">
            Tổng số: {totalElements} dự án
          </span>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors">
        <div className="relative w-full sm:w-[320px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Tìm theo tên dự án..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchProjects}
            disabled={loading}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          <div className="relative flex-1 sm:flex-none" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="w-full sm:w-[180px] flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-[13px] font-medium hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer shadow-sm transition-colors"
            >
              <span>{STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || "Tất cả"}</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-1 w-full sm:w-[180px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl rounded-xl overflow-hidden py-1 z-20">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setStatusFilter(opt.value); setIsFilterOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-[12px] font-medium cursor-pointer transition-colors ${
                      statusFilter === opt.value
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-semibold"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {opt.label}
                    {statusFilter === opt.value && (
                      <Check size={14} className="text-indigo-600 dark:text-indigo-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
          <span className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">
            Đang tải danh sách dự án...
          </span>
        </div>
      )}

      {!loading && error && (
        <div className="py-16 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <AlertCircle size={36} className="text-red-400 mb-3" />
          <p className="text-[14px] font-semibold text-gray-700 dark:text-gray-300 mb-1">{error}</p>
          <button
            onClick={fetchProjects}
            className="mt-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[13px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Thử lại
          </button>
        </div>
      )}

      {!loading && !error && displayedProjects.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <Inbox size={28} className="text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 mb-1">
            Không có dự án nào
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 max-w-sm text-center">
            {searchTerm || statusFilter !== "ALL"
              ? "Không tìm thấy dự án nào khớp với bộ lọc hiện tại."
              : "Chưa có dự án nào được tạo trong hệ thống."}
          </p>
        </div>
      )}

      {/* ✅ GRID 4 CỘT — dùng xl:grid-cols-4 */}
      {!loading && !error && displayedProjects.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
            {displayedProjects.map((project) => {        
              const memberCount = project.membersCount ?? 0;
              const adminName = project.adminName;

              return (
                <div
                  key={project.id}
                  onClick={() => handleCardClick(project)}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Header card */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="text-[14px] font-bold text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 flex-1">
                        {project.name || "Dự án chưa đặt tên"}
                      </h3>
                      <ProjectStatusBadge status={project.status || "ACTIVE"} />
                    </div>

                    <p className="text-[11.5px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed min-h-[30px]">
                      {project.description || "Chưa có mô tả cho dự án này."}
                    </p>

                    {/* Dates */}
                    <div className="bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 rounded-lg p-2 mb-3 flex items-center justify-between text-[10.5px] font-medium text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="truncate">{formatDate(project.startDate) || "---"}</span>
                      </div>
                      <span className="text-gray-300 dark:text-gray-600 shrink-0">➔</span>
                      <div className="flex items-center gap-1">
                        <Calendar size={11} className="text-rose-600 dark:text-rose-400 shrink-0" />
                        <span className="truncate">{formatDate(project.endDate) || "---"}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {/* ✅ ADMIN DỰ ÁN — dòng riêng, chính xác từ members */}
                    <div className="flex items-center gap-2 text-[11.5px] mb-2">
                      <Crown size={12} className="text-amber-500 shrink-0" />
                      <span className="text-gray-500 dark:text-gray-400 shrink-0">Admin:</span>
                      {adminName ? (
                        <span className="font-semibold text-gray-800 dark:text-gray-100 truncate" title={adminName}>
                          {adminName}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 italic truncate">
                          Chưa phân quyền
                        </span>
                      )}
                    </div>

                    {/* ✅ MEMBERS count + extra admins */}
                    <div className="flex items-center justify-between text-[11.5px] mb-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <Users size={12} className="text-indigo-500 shrink-0" />
                        <span className="font-bold text-gray-800 dark:text-gray-200">
                          {memberCount}
                        </span>
                        <span>thành viên</span>
                      </span>

                      {project.adminCount > 1 && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                          title={`${project.adminCount} admin trong dự án`}
                        >
                          <Shield size={10} />
                          {project.adminCount} admin
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">
                Trang {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <ProjectDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        project={selectedProject}
        onUpdate={handleUpdateProject}
        onDelete={handleDeleteProject}
        userPermissions={["PROJECT_UPDATE", "PROJECT_DELETE", "ROLE_ADMIN"]}
      />
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const DD = String(d.getDate()).padStart(2, "0");
    const MM = String(d.getMonth() + 1).padStart(2, "0");
    return `${DD}/${MM}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function ProjectStatusBadge({ status }) {
  const map = {
    ACTIVE:    { label: "Active",  icon: PlayCircle,   color: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" },
    COMPLETED: { label: "Done",    icon: CheckCircle2, color: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" },
    ARCHIVED:  { label: "Lưu",     icon: Archive,      color: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600" },
    SUSPENDED: { label: "Dừng",    icon: AlertCircle,  color: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20" },
  };
  const cfg = map[status] || map.ACTIVE;
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border shrink-0 ${cfg.color}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}