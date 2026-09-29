import React, { useState, useEffect, useRef, useCallback } from "react";
import { useEvent, emitEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../utils/apiClient";
import {
  Save, UserMinus, ShieldAlert, Loader2, UserPlus, X,
  ChevronDown, Check, KeySquare, Users, Settings2, Edit, Trash2,
} from "lucide-react";

import ManageMembersModal from "../function/ManageMembersModal";

import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const permissionMatrix = [
  { module: "Dự án", actions: { view: "PROJECT_VIEW", create: null, update: "PROJECT_UPDATE", delete: "PROJECT_DELETE", other: null } },
  { module: "Thành viên", actions: { view: "MEMBER_VIEW", create: "MEMBER_ADD", update: "MEMBER_ROLE_UPDATE", delete: "MEMBER_REMOVE", other: null } },
  { module: "Công việc (Task)", actions: { view: "TASK_VIEW", create: "TASK_CREATE", update: "TASK_UPDATE", delete: "TASK_DELETE", other: { label: "Giao việc", value: "TASK_ASSIGN" } } },
  { module: "Bình luận", actions: { view: "COMMENT_VIEW", create: "COMMENT_CREATE", update: "COMMENT_UPDATE_OWN", delete: "COMMENT_DELETE_OWN", other: { label: "Xóa của người khác", value: "COMMENT_DELETE_ANY" } } },
  { module: "Tệp đính kèm", actions: { view: "ATTACHMENT_VIEW", create: "ATTACHMENT_UPLOAD", update: null, delete: "ATTACHMENT_DELETE_OWN", other: { label: "Xóa của người khác", value: "ATTACHMENT_DELETE_ANY" } } },
];

const ProjectSettings = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ id: null, name: "", permissions: [] });
  const [savingRole, setSavingRole] = useState(false);

  const [openDropdownId, setOpenDropdownId] = useState(null);
  const containerRef = useRef(null);

  // ==== Preferences ====
  const { accent } = usePreferences();
  const A = getAccent(accent);

  const hasPerm = useCallback((perm) => userPermissions.includes(perm), [userPermissions]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [projRes, membersRes, rolesRes, permsRes] = await Promise.all([
        apiClient.get(`http://localhost:8083/api/projects/${projectId}`),
        apiClient.get(`http://localhost:8083/api/projects/${projectId}/members`),
        apiClient.get(`http://localhost:8083/api/projects/${projectId}/roles`),
        apiClient.get(`http://localhost:8083/api/projects/${projectId}/my-permissions`),
      ]);
      setProjectName(projRes.data?.name || "");
      setProjectDesc(projRes.data?.description || "");
      setMembers(membersRes.data || []);
      setRoles(rolesRes.data || []);
      setUserPermissions(permsRes.data || []);
    } catch (error) {
      console.error("Lỗi tải trang settings:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEvent(EVENTS.MEMBER, () => loadData());
  useEvent(EVENTS.PROJECT, () => loadData());

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!hasPerm("PROJECT_UPDATE")) {
      toast.error("Bạn không có quyền sửa thông tin dự án!");
      return;
    }
    setSaving(true);
    try {
      await apiClient.put(`http://localhost:8083/api/projects/${projectId}`, {
        name: projectName,
        description: projectDesc,
      });
      toast.success("Cập nhật thông tin dự án thành công!");
      emitEvent(EVENTS.PROJECT, { projectId });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không có quyền chỉnh sửa dự án này!");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!hasPerm("PROJECT_DELETE")) {
      toast.error("Bạn không có quyền xóa dự án!");
      return;
    }
    if (!window.confirm("CẢNH BÁO: Xóa vĩnh viễn dự án này và toàn bộ dữ liệu đi kèm?")) return;
    setDeleting(true);
    try {
      await apiClient.delete(`http://localhost:8083/api/projects/${projectId}`);
      toast.success("Đã xóa dự án vĩnh viễn!");
      emitEvent(EVENTS.PROJECT, { projectId, deleted: true });
      navigate("/", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa dự án!");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenRoleModal = (role = null) => {
    if (role) setRoleForm({ id: role.id, name: role.name, permissions: role.permissions || [] });
    else setRoleForm({ id: null, name: "", permissions: [] });
    setIsRoleModalOpen(true);
  };

  const handleTogglePermission = (permValue) => {
    if (!permValue) return;
    setRoleForm((prev) => {
      const perms = new Set(prev.permissions);
      if (perms.has(permValue)) perms.delete(permValue);
      else perms.add(permValue);
      return { ...prev, permissions: Array.from(perms) };
    });
  };

  const handleSaveCustomRole = async () => {
    if (!roleForm.name.trim()) { toast.error("Vui lòng nhập tên vai trò!"); return; }
    setSavingRole(true);
    try {
      const payload = {
        name: roleForm.name.trim().toUpperCase(),
        permissions: roleForm.permissions,
      };

      if (roleForm.id) {
        await apiClient.put(`http://localhost:8083/api/projects/${projectId}/roles/${roleForm.id}`, payload);
        toast.success("Cập nhật vai trò thành công!");
      } else {
        await apiClient.post(`http://localhost:8083/api/projects/${projectId}/roles`, payload);
        toast.success("Tạo vai trò mới thành công!");
      }

      loadData();
      setIsRoleModalOpen(false);
      setRoleForm({ id: null, name: "", permissions: [] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi lưu vai trò!");
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteCustomRole = async (roleId) => {
    if (!window.confirm("Xóa vai trò này? (Không thể xóa nếu đang có người dùng vai trò này)")) return;
    try {
      await apiClient.delete(`http://localhost:8083/api/projects/${projectId}/roles/${roleId}`);
      toast.success("Đã xóa vai trò!");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa vai trò!");
    }
  };

  const handleChangeRole = async (memberIdentifier, newRole) => {
    if (!window.confirm("Xác nhận thay đổi quyền của thành viên này?")) return;
    try {
      await apiClient.put(`http://localhost:8083/api/projects/${projectId}/members/${memberIdentifier}`, { role: newRole });
      toast.success("Cập nhật quyền thành công!");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bạn không đủ quyền để đổi vai trò!");
    }
  };

  const handleRemoveMember = async (memberIdentifier) => {
    if (!window.confirm("Bạn có chắc muốn xóa thành viên này khỏi dự án?")) return;
    try {
      await apiClient.delete(`http://localhost:8083/api/projects/${projectId}/members/${memberIdentifier}`);
      toast.success("Đã xóa thành viên khỏi dự án!");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bạn không có quyền xóa thành viên này!");
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F9FAFB] dark:bg-gray-950 transition-colors">
        <Loader2 className={`animate-spin ${A.text}`} size={36} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 h-full overflow-y-auto bg-[#F9FAFB] dark:bg-gray-950 flex justify-center font-sans transition-colors">
      <div className="w-full max-w-4xl space-y-6 pb-12 relative" ref={containerRef}>
        {(saving || deleting) && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-[1px] z-50 flex items-center justify-center rounded-2xl">
            <Loader2 className={`animate-spin ${A.text}`} size={32} />
          </div>
        )}

        {/* ======================= 1. THÔNG TIN CHUNG ======================= */}
        <form onSubmit={handleUpdateProject} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 shadow-sm transition-colors">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Settings2 size={18} className="text-gray-500 dark:text-gray-400" />
                Thông tin dự án
              </h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                Cập nhật tên và mô tả cơ bản của dự án
              </p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Tên dự án
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                disabled={!hasPerm("PROJECT_UPDATE")}
                required
                className={`w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 ${A.ring} outline-none text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:text-gray-500 dark:disabled:text-gray-500`}
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Mô tả
              </label>
              <textarea
                rows="3"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                disabled={!hasPerm("PROJECT_UPDATE")}
                className={`w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 ${A.ring} outline-none resize-none text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 transition-all disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:text-gray-500 dark:disabled:text-gray-500`}
              />
            </div>
            {hasPerm("PROJECT_UPDATE") && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className={`text-white px-5 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 ${A.solidBg}`}
                >
                  <Save size={16} /> Lưu thay đổi
                </button>
              </div>
            )}
          </div>
        </form>

        {/* ======================= 2. QUẢN LÝ VAI TRÒ (ROLES) ======================= */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 shadow-sm flex flex-col transition-colors">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <KeySquare size={18} className="text-amber-500" />
                Vai trò (Roles)
              </h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                Các nhóm quyền hạn hiện có trong dự án
              </p>
            </div>
            {hasPerm("PROJECT_UPDATE") && (
              <button
                type="button"
                onClick={() => handleOpenRoleModal()}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3.5 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <KeySquare size={16} className="text-amber-500" /> Tạo Role Tùy chỉnh
              </button>
            )}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {roles.map((r) => {
                const membersCount = members.filter((m) => m.role === r.name).length;
                return (
                  <div
                    key={r.name}
                    className={`border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col gap-2 transition-colors bg-white dark:bg-gray-800 group hover:${A.border}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-[14px] text-gray-800 dark:text-gray-100 break-all">
                        {r.name}
                      </span>

                      {r.custom ? (
                        <div className="flex items-center gap-2">
                          {hasPerm("PROJECT_UPDATE") && (
                            <div className="hidden group-hover:flex items-center gap-1 bg-gray-50 dark:bg-gray-700 rounded-md p-1 border border-gray-200 dark:border-gray-600 mr-2">
                              <button
                                onClick={() => handleOpenRoleModal(r)}
                                className={`p-1 text-gray-500 dark:text-gray-400 cursor-pointer ${A.textHover}`}
                                title="Sửa Role"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteCustomRole(r.id)}
                                className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 cursor-pointer"
                                title="Xóa Role"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                          <span className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            CUSTOM
                          </span>
                        </div>
                      ) : (
                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 text-[9px] px-2 py-0.5 rounded-full font-bold">
                          SYSTEM
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1 font-medium">
                      <Users size={14} className="text-gray-400 dark:text-gray-500" />
                      <span>{membersCount} thành viên</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ======================= 3. QUẢN LÝ THÀNH VIÊN ======================= */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800 shadow-sm flex flex-col transition-colors">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex justify-between items-center rounded-t-2xl">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={18} className={A.icon} />
                Thành viên dự án
              </h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                Thêm, xóa và thiết lập vai trò cho từng thành viên
              </p>
            </div>
            {hasPerm("MEMBER_ADD") && (
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(true)}
                className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${A.softBg} ${A.text} ${A.softHoverBg}`}
              >
                <UserPlus size={16} /> Thêm thành viên
              </button>
            )}
          </div>

          <div className="flex flex-col">
            {members.length === 0 ? (
              <div className="px-6 py-8 text-center text-[13px] text-gray-500 dark:text-gray-400">
                Chưa có thành viên nào trong dự án này.
              </div>
            ) : (
              members.map((member) => {
                const memberKey = member.id || member.userId;
                const dropdownKey = `member-${memberKey}`;
                const isDropdownOpen = openDropdownId === dropdownKey;
                const canEditRole = hasPerm("MEMBER_ROLE_UPDATE");

                return (
                  <div
                    key={memberKey}
                    className={`flex justify-between items-center px-6 py-4 transition-colors relative border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                      isDropdownOpen
                        ? `z-50 ${A.softBg}`
                        : "z-10 hover:bg-gray-50/50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-[14px] shadow-sm uppercase ${A.bgOnly}`}>
                        {member.fullName ? member.fullName.charAt(0) : "U"}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
                          {member.fullName || member.username}
                        </p>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400">
                          {member.email || "Không có email"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          onClick={() => canEditRole && setOpenDropdownId(isDropdownOpen ? null : dropdownKey)}
                          className={`w-36 px-3 py-1.5 border rounded-lg text-[12px] font-medium bg-white dark:bg-gray-800 flex items-center justify-between select-none transition-colors ${
                            canEditRole
                              ? "cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                              : "cursor-not-allowed bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-70"
                          } ${
                            isDropdownOpen
                              ? `${A.border} ring-2 ${A.ring.replace("focus:", "")}`
                              : "border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
                            {member.role}
                          </span>
                          {canEditRole && (
                            <ChevronDown
                              size={14}
                              className={`shrink-0 transition-transform duration-200 ${
                                isDropdownOpen ? `rotate-180 ${A.icon}` : "text-gray-400 dark:text-gray-500"
                              }`}
                            />
                          )}
                        </div>

                        {isDropdownOpen && canEditRole && (
                          <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] py-1 z-[99999] overflow-hidden">
                            {roles.map((r) => {
                              const isSelected = member.role === r.name;
                              return (
                                <div
                                  key={r.name}
                                  onClick={() => { handleChangeRole(memberKey, r.name); setOpenDropdownId(null); }}
                                  className={`px-3 py-2 text-[12px] cursor-pointer flex items-center justify-between transition-colors ${
                                    isSelected
                                      ? `${A.softBg} ${A.textStrong} font-semibold`
                                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                  }`}
                                >
                                  <span className="flex items-center gap-1.5">
                                    {r.name}
                                    {r.custom && (
                                      <span className="text-[8px] bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1 py-[1px] rounded uppercase font-bold">
                                        Custom
                                      </span>
                                    )}
                                  </span>
                                  {isSelected && <Check size={14} className={A.icon} />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {hasPerm("MEMBER_REMOVE") && (
                        <button
                          onClick={() => handleRemoveMember(memberKey)}
                          className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-lg transition-colors cursor-pointer"
                          title="Xóa thành viên"
                        >
                          <UserMinus size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================= 4. DANGER ZONE ======================= */}
        {hasPerm("PROJECT_DELETE") && (
          <div className="bg-red-50/50 dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-500/20 shadow-sm overflow-hidden transition-colors">
            <div className="p-6 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
              <div className="flex gap-3">
                <ShieldAlert className="text-red-500 mt-1 sm:mt-0 shrink-0" size={24} />
                <div>
                  <h3 className="text-[15px] font-bold text-red-700 dark:text-red-400">
                    Khu vực nguy hiểm
                  </h3>
                  <p className="text-[12px] text-red-600/80 dark:text-red-400/80 mt-0.5">
                    Xóa vĩnh viễn dự án này và toàn bộ dữ liệu đi kèm. Thao tác này không thể hoàn tác.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-[13px] font-bold shadow-sm transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Đang xóa..." : "Xóa dự án"}
              </button>
            </div>
          </div>
        )}
      </div>

      <ManageMembersModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        projectId={projectId}
      />

      {/* ======================= MODAL TẠO/SỬA ROLE ======================= */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/80 dark:bg-gray-800/60 rounded-t-2xl shrink-0">
              <div>
                <h3 className="text-[16px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <KeySquare size={18} className="text-amber-500" />
                  {roleForm.id ? "Sửa Custom Role" : "Tạo Custom Role"}
                </h3>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Phân quyền chi tiết cho nhóm chức danh trong dự án
                </p>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 [scrollbar-width:thin]">
              <div className="mb-6">
                <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tên Vai trò (Role Name)
                </label>
                <input
                  type="text"
                  placeholder="VD: DEVELOPER, VIEWER..."
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value.toUpperCase() })}
                  className={`w-full sm:w-1/2 px-4 py-2.5 text-[14px] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 ${A.ring} outline-none text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 uppercase font-bold transition-all`}
                />
              </div>

              {/* BẢNG MA TRẬN QUYỀN HẠN */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      <th className="py-3 px-4 text-[12px] font-bold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                        Module / Chức năng
                      </th>
                      <th className="py-3 px-4 text-[12px] font-bold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 text-center">Xem</th>
                      <th className="py-3 px-4 text-[12px] font-bold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 text-center">Tạo mới</th>
                      <th className="py-3 px-4 text-[12px] font-bold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 text-center">Sửa</th>
                      <th className="py-3 px-4 text-[12px] font-bold text-red-600 dark:text-red-400 border-b border-gray-200 dark:border-gray-700 text-center">Xóa</th>
                      <th className="py-3 px-4 text-[12px] font-bold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 text-center">Khác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {permissionMatrix.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="py-3.5 px-4 text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                          {row.module}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.actions.view && (
                            <input
                              type="checkbox"
                              checked={roleForm.permissions.includes(row.actions.view)}
                              onChange={() => handleTogglePermission(row.actions.view)}
                              className={`w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer ${A.text} ${A.ring}`}
                            />
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.actions.create && (
                            <input
                              type="checkbox"
                              checked={roleForm.permissions.includes(row.actions.create)}
                              onChange={() => handleTogglePermission(row.actions.create)}
                              className={`w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer ${A.text} ${A.ring}`}
                            />
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.actions.update && (
                            <input
                              type="checkbox"
                              checked={roleForm.permissions.includes(row.actions.update)}
                              onChange={() => handleTogglePermission(row.actions.update)}
                              className={`w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer ${A.text} ${A.ring}`}
                            />
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.actions.delete && (
                            <input
                              type="checkbox"
                              checked={roleForm.permissions.includes(row.actions.delete)}
                              onChange={() => handleTogglePermission(row.actions.delete)}
                              className="w-4 h-4 text-red-500 rounded border-gray-300 dark:border-gray-600 focus:ring-red-500 cursor-pointer"
                            />
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {row.actions.other && (
                            <label className="flex items-center justify-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={roleForm.permissions.includes(row.actions.other.value)}
                                onChange={() => handleTogglePermission(row.actions.other.value)}
                                className="w-4 h-4 text-amber-500 rounded border-gray-300 dark:border-gray-600 focus:ring-amber-500 cursor-pointer"
                              />
                              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                                {row.actions.other.label}
                              </span>
                            </label>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/60 rounded-b-2xl flex justify-between items-center shrink-0">
              <span className="text-[13px] font-medium text-gray-600 dark:text-gray-400">
                Đã chọn: <strong className={`font-bold ${A.text}`}>{roleForm.permissions.length}</strong> quyền
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomRole}
                  disabled={savingRole}
                  className={`text-white px-6 py-2.5 text-[13px] font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer ${A.solidBg}`}
                >
                  {savingRole && <Loader2 size={16} className="animate-spin" />}
                  {roleForm.id ? "Cập nhật Role" : "Lưu Role Mới"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSettings;