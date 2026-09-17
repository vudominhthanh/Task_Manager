import React, { useState, useEffect, useCallback } from "react";
import apiClient from "../../utils/apiClient";
import { FolderGit2, Search, Calendar, Trash2, UserCheck, Loader2, ExternalLink, ShieldAlert, } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { emitEvent, EVENTS } from "../../hooks/useEventBus";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchAllProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("http://localhost:8083/api/projects");
      const data = await res.data;
      if (data) {
        setProjects(Array.isArray(data) ? data : data.content || []);
      }
    } catch (err) {
      console.error("Lỗi fetch all projects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAllProjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAllProjects]);

  const handleForceDeleteProject = async (projectId, projectName) => {
    if (
      !window.confirm(
        `[ADMIN FORCE] Bạn có chắc muốn xóa vĩnh viễn dự án "${projectName}"? Thao tác này sẽ xóa mọi Task, Comment và File của dự án!`,
      )
    ) {
      return;
    }

    const toastId = toast.loading(`Đang xóa dự án "${projectName}"...`);

    try {
      await apiClient.delete(`http://localhost:8083/api/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      emitEvent(EVENTS.PROJECT, { projectId, deleted: true }); 
      toast.success(`Đã xóa vĩnh viễn dự án "${projectName}"!`, {
        id: toastId,
      });
    } catch (error) {
      console.error(error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Xóa dự án thất bại. Vui lòng kiểm tra quyền hạn!";
      toast.error(msg, { id: toastId });
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      {/* Khai báo CSS keyframes cho hiệu ứng mượt mà */}
      <style>
        {`
          @keyframes fadeInUpSlow {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          /* Component bọc ngoài (Khung Header và Grid) */
          .animate-stagger {
            opacity: 0;
            animation: fadeInUpSlow 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .delay-0 { animation-delay: 0s; }
          .delay-1 { animation-delay: 0.15s; }
          
          /* Hiệu ứng trượt lên cho từng card dự án */
          .animate-row {
            opacity: 0;
            animation: fadeInUpSlow 0.6s ease-out forwards;
          }
        `}
      </style>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header & Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-stagger delay-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Quản trị dự án toàn sàn
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Admin có quyền can thiệp, xóa hoặc xem bất kỳ workspace nào mà
              không cần được thêm vào
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
              placeholder="Tìm kiếm dự án..."
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-2xs transition-shadow"
            />
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger delay-1">
          {loading ? (
            <div className="col-span-full py-12 text-center text-gray-400">
              <Loader2
                size={24}
                className="animate-spin text-indigo-600 mx-auto mb-2"
              />
              Đang tải dữ liệu dự án toàn sàn...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-400 italic">
              Không tìm thấy dự án nào.
            </div>
          ) : (
            filteredProjects.map((proj, index) => (
              <div
                key={proj.id}
                className="animate-row bg-white border border-gray-200/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-indigo-200 transition-all group"
                // Tạo delay động cho từng card để hiệu ứng nối đuôi nhau
                style={{ animationDelay: `${0.15 + index * 0.05}s` }}
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FolderGit2 size={16} />
                      </div>
                      <h3
                        className="text-[14px] font-bold text-gray-900 truncate"
                        title={proj.name}
                      >
                        {proj.name}
                      </h3>
                    </div>
                    <Link
                      to={`/project/${proj.id}`}
                      className="text-gray-400 hover:text-indigo-600 p-1 transition-colors"
                      title="Mở bảng điều khiển dự án"
                    >
                      <ExternalLink size={15} />
                    </Link>
                  </div>

                  <p className="text-[12px] text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                    {proj.description || "Chưa có phần mô tả."}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5 text-[11px] text-gray-500">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <UserCheck size={13} className="text-gray-400" /> Owner
                      ID:
                    </span>
                    <span className="font-mono text-gray-700 font-semibold">
                      {proj.ownerId
                        ? String(proj.ownerId).substring(0, 8)
                        : "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-400" /> Thời
                      gian:
                    </span>
                    <span>
                      {proj.startDate || "N/A"} → {proj.endDate || "N/A"}
                    </span>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() =>
                        handleForceDeleteProject(proj.id, proj.name)
                      }
                      className="flex items-center gap-1 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} /> Xóa cưỡng chế
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
