import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import apiClient from "../../utils/apiClient";
import { X, Users, Loader2, Search, ChevronDown, Check, FolderGit2, AlertCircle, ShieldAlert, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { emitEvent, EVENTS } from "../../hooks/useEventBus";
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const getAuthToken = () => {
  const t = localStorage.getItem("accessToken");
  if (t) return t;
  try { const raw = localStorage.getItem("user"); if (raw) return JSON.parse(raw).token || null; } catch {}
  return null;
};
const parseJwt = (token) => { try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; } };

export default function ManageMembersModal({ isOpen, onClose, projectId }) {
  const [projectsList, setProjectsList] = useState([]);
  const [selectedTargetProjectId, setSelectedTargetProjectId] = useState(projectId || "");
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [currentProjectName, setCurrentProjectName] = useState("");
  const [members, setMembers] = useState([]);
  const [projectRoles, setProjectRoles] = useState([]);
  const [userPermissions, setUserPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [pendingMembers, setPendingMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openRoleDropdownId, setOpenRoleDropdownId] = useState(null);

  const { accent } = usePreferences();
  const A = getAccent(accent);

  const activeProjectId = projectId || selectedTargetProjectId;

  useEffect(() => {
    if (isOpen) {
      setSelectedTargetProjectId(projectId || "");
      setPendingMembers([]);
      setSearchEmail("");
      setSearchError("");
    }
  }, [isOpen, projectId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProjectDropdownOpen(false);
        setOpenRoleDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (projectId) {
      apiClient.get(`http://localhost:8083/api/projects/${projectId}`)
        .then((res) => setCurrentProjectName(res.data?.name || "Dự án hiện tại"))
        .catch(() => setCurrentProjectName("Dự án hiện tại"));
    } else {
      apiClient.get("http://localhost:8083/api/projects")
        .then((res) => {
          const list = res.data?.content ? res.data.content : (Array.isArray(res.data) ? res.data : []);
          setProjectsList(list);
          if (list.length > 0 && !selectedTargetProjectId) setSelectedTargetProjectId(list[0].id);
        }).catch(() => {});
    }
  }, [projectId, isOpen, selectedTargetProjectId]);

  useEffect(() => {
    if (!activeProjectId || !isOpen) return;
    const token = getAuthToken();
    let currentUserId = null;
    if (token) {
      const decoded = parseJwt(token);
      currentUserId = decoded?.sub || decoded?.id || decoded?.userId;
    }

    const fetchData = async () => {
      setLoadingMembers(true);
      setLoadingPermissions(true);
      try {
        const memRes = await apiClient.get(`http://localhost:8083/api/projects/${activeProjectId}/members`);
        const memData = Array.isArray(memRes.data) ? memRes.data : memRes.data?.content || [];
        setMembers(memData.map((m) => {
          const name = m.fullName || m.fullname || m.username || m.name || "Thành viên";
          return { id: m.userId || m.id, name, email: m.email || "Chưa có email", role: m.role || "MEMBER", avatar: name.charAt(0).toUpperCase() };
        }));
        const roleRes = await apiClient.get(`http://localhost:8083/api/projects/${activeProjectId}/roles`);
        setProjectRoles(roleRes.data || []);
        if (currentUserId) {
          const permRes = await apiClient.get(`http://localhost:8083/api/projects/${activeProjectId}/users/${currentUserId}/permissions`);
          setUserPermissions(permRes.data || []);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu Modal Member:", error);
      } finally {
        setLoadingMembers(false);
        setLoadingPermissions(false);
      }
    };
    fetchData();
  }, [activeProjectId, isOpen]);

  const handleSearchUser = async (e) => {
    if (e) e.preventDefault();
    const query = searchEmail.trim();
    if (!query) return;
    setSearchError("");
    setSearching(true);
    try {
      if (pendingMembers.some((m) => m.email?.toLowerCase() === query.toLowerCase())) return setSearchError("Người dùng này đã có trong danh sách chuẩn bị thêm!");
      if (members.some((m) => m.email?.toLowerCase() === query.toLowerCase())) return setSearchError("Người dùng này đã là thành viên của dự án!");

      const res = await apiClient.get(`http://localhost:8086/api/users/email?email=${encodeURIComponent(query)}`);
      const userData = res.data;
      const realName = userData.fullName || userData.fullname || userData.username || query.split("@")[0];
      setPendingMembers((prev) => [...prev, {
        id: userData.id || userData.userId,
        email: userData.email || query,
        name: realName,
        role: projectRoles.length > 0 ? projectRoles[0].name : "MEMBER",
        avatar: realName.charAt(0).toUpperCase(),
      }]);
      setSearchEmail("");
    } catch {
      setSearchError("Không thể kết nối đến máy chủ hoặc User không tồn tại!");
    } finally { setSearching(false); }
  };

  const handleRemovePendingMember = (memberId) => setPendingMembers((prev) => prev.filter((m) => m.id !== memberId));
  const handleUpdatePendingRole = (memberId, newRole) => setPendingMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));

  const handleApplyAddMembers = async () => {
    if (pendingMembers.length === 0) return onClose();
    if (!activeProjectId) return toast.error("Vui lòng chọn dự án!");
    setIsSubmitting(true);
    try {
      let hasError = false;
      await Promise.all(pendingMembers.map(async (m) => {
        try {
          await apiClient.post(`http://localhost:8083/api/projects/${activeProjectId}/members`, { email: m.email, roleName: m.role });
        } catch (err) {
          hasError = true;
          toast.error(`Lỗi thêm ${m.email}: ${err.response?.data?.message || "Không đủ quyền!"}`);
        }
      }));
      emitEvent(EVENTS.MEMBER, { projectId: activeProjectId });
      if (!hasError) { toast.success("Thêm thành viên vào dự án thành công!"); onClose(); }
    } catch {
      toast.error("Không thể kết nối đến máy chủ!");
    } finally { setIsSubmitting(false); }
  };

  const selectedProjObj = projectsList.find((p) => String(p.id) === String(selectedTargetProjectId));
  const selectedProjectDropdownName = selectedProjObj ? selectedProjObj.name : "Chọn dự án quản lý";

  const hasMemberAddPermission = userPermissions.includes("MEMBER_ADD");
  const hasMemberRemovePermission = userPermissions.includes("MEMBER_REMOVE");
  const hasMemberRoleUpdatePermission = userPermissions.includes("MEMBER_ROLE_UPDATE");

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] bg-gray-900/70 overflow-y-auto flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 relative flex flex-col max-h-[90vh] transition-colors" ref={dropdownRef}>
        <button onClick={onClose} className="absolute top-5 right-5 p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full cursor-pointer z-10 transition-colors">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-800 pr-10 shrink-0">
          <div className={`p-2.5 rounded-xl ${A.softBg} ${A.icon}`}>
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Quản lý thành viên dự án</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Thêm hoặc quản lý thành viên trực tiếp trong dự án</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
          {projectId ? (
            <div className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm shrink-0 border ${A.softBg} ${A.border}`}>
              <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center shrink-0 ${A.bgOnly}`}>
                <FolderGit2 size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${A.text}`}>Đang quản lý dự án</span>
                <span className="font-bold text-gray-900 dark:text-white truncate">{currentProjectName || "Đang tải..."}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 relative shrink-0">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5">
                <FolderGit2 size={14} className={A.icon} /> Chọn dự án
              </label>
              <div onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium flex justify-between cursor-pointer bg-white dark:bg-gray-800">
                <span className="truncate text-gray-800 dark:text-gray-200">{selectedProjectDropdownName}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isProjectDropdownOpen ? "rotate-180" : ""}`} />
              </div>
              {isProjectDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl py-1 max-h-48 overflow-y-auto z-[99999]">
                  {projectsList.map((proj) => (
                    <div key={proj.id} onClick={() => { setSelectedTargetProjectId(proj.id); setIsProjectDropdownOpen(false); }}
                      className={`px-4 py-2 text-sm cursor-pointer flex justify-between ${
                        String(selectedTargetProjectId) === String(proj.id) ? `${A.softBg} ${A.text} font-semibold` : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}>
                      <span className="truncate">{proj.name}</span>
                      {String(selectedTargetProjectId) === String(proj.id) && <Check size={16} className={A.icon} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {loadingPermissions ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className={`animate-spin ${A.text}`} />
              <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">Đang xác thực quyền hạn...</p>
            </div>
          ) : !hasMemberAddPermission ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert size={28} />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Từ chối truy cập</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">Bạn không có quyền để thêm người dùng vào dự án này.</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5 shrink-0">
                <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300">Tìm kiếm người dùng</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Nhập email người dùng..." value={searchEmail}
                      onChange={(e) => { setSearchEmail(e.target.value); if (searchError) setSearchError(""); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchUser(); } }}
                      className={`w-full pl-10 pr-3.5 py-2.5 text-[14px] border rounded-xl outline-none transition-all bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 ${
                        searchError ? "border-red-400 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-500/30" : `border-gray-200 dark:border-gray-700 focus:ring-2 ${A.ring}`
                      }`} />
                  </div>
                  <button type="button" onClick={handleSearchUser} disabled={searching}
                    className={`text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-70 ${A.solidBg}`}>
                    {searching ? <Loader2 size={16} className="animate-spin" /> : <span>Tìm</span>}
                  </button>
                </div>
                {searchError && <p className="text-[12px] text-red-500 flex items-center gap-1 mt-1 font-medium"><AlertCircle size={14} /> {searchError}</p>}
              </div>

              <div className="space-y-1.5 shrink-0">
                <label className="block text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Thành viên chuẩn bị thêm ({pendingMembers.length})</label>
                {pendingMembers.length === 0 ? (
                  <div className="py-3 text-center text-gray-400 dark:text-gray-500 text-[12px] italic bg-gray-50/60 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">Chưa có thành viên nào được chọn.</div>
                ) : (
                  <div className="space-y-2 pr-1">
                    {pendingMembers.map((user) => {
                      const roleKey = `pending-${user.id}`;
                      const isRoleOpen = openRoleDropdownId === roleKey;
                      return (
                        <div key={user.id} className={`flex items-center justify-between p-2.5 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-xl shadow-sm gap-3 relative transition-all ${isRoleOpen ? `z-50 ring-2 ${A.ring.replace("focus:", "")}` : "z-10"}`}>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase ${A.bgOnly}`}>{user.avatar}</div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{user.name}</span>
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user.email}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="relative">
                              <div onClick={() => setOpenRoleDropdownId(isRoleOpen ? null : roleKey)}
                                className={`w-32 px-2.5 py-1.5 border rounded-lg text-[12px] font-medium flex justify-between items-center cursor-pointer transition-colors ${
                                  isRoleOpen ? `${A.border} ${A.softBg}` : "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}>
                                <span className="text-gray-700 dark:text-gray-300 truncate">{user.role}</span>
                                <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${isRoleOpen ? `rotate-180 ${A.icon}` : ""}`} />
                              </div>
                              {isRoleOpen && (
                                <div className="absolute right-0 top-full mt-1.5 w-36 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl py-1 z-[99999]">
                                  {projectRoles.length === 0 ? (
                                    <div className="px-3 py-2 text-[11px] text-gray-400 italic">Chưa tải được Roles</div>
                                  ) : (
                                    projectRoles.map((r) => (
                                      <div key={r.name} onClick={() => { handleUpdatePendingRole(user.id, r.name); setOpenRoleDropdownId(null); }}
                                        className="px-3 py-2 text-[12px] cursor-pointer flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <span className={user.role === r.name ? `${A.text} font-semibold` : "text-gray-700 dark:text-gray-300"}>{r.name}</span>
                                        {user.role === r.name && <Check size={14} className={A.icon} />}
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                            <button type="button" onClick={() => handleRemovePendingMember(user.id)}
                              className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer transition-colors">
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <label className="block text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Thành viên hiện tại ({members.length})</label>
            {loadingMembers ? (
              <div className="py-6 flex justify-center items-center"><Loader2 className={`animate-spin ${A.text}`} size={24} /></div>
            ) : members.length === 0 ? (
              <div className="py-4 text-center text-gray-400 dark:text-gray-500 text-[12px] italic bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">Chưa có thành viên nào.</div>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-2.5 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-full text-white flex justify-center items-center font-bold text-xs uppercase ${A.bgOnly}`}>{m.avatar}</div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-gray-900 dark:text-white truncate">{m.name}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{m.email}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasMemberRoleUpdatePermission ? (
                        <select value={m.role} onChange={async (e) => {
                          const newRole = e.target.value;
                          if (newRole === m.role) return;
                          try {
                            await apiClient.put(`http://localhost:8083/api/projects/${activeProjectId}/members/${m.id}`, { role: newRole });
                            setMembers((prev) => prev.map((member) => member.id === m.id ? { ...member, role: newRole } : member));
                            toast.success(`Đã cập nhật quyền của ${m.name}`);
                            emitEvent(EVENTS.MEMBER, { projectId: activeProjectId });
                          } catch (error) {
                            toast.error(`Lỗi đổi quyền: ${error.response?.data?.message || "Không đủ quyền!"}`);
                          }
                        }}
                          className={`text-[11px] font-semibold px-2 py-1 bg-white dark:bg-gray-800 border rounded-md outline-none cursor-pointer ${A.border} ${A.text}`}>
                          {projectRoles.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
                        </select>
                      ) : (
                        <span className={`text-[11px] font-semibold px-2 py-1 rounded-md shrink-0 ${A.softBg} ${A.text}`}>{m.role}</span>
                      )}
                      {hasMemberRemovePermission && (
                        <button onClick={async () => {
                          if (!window.confirm(`Bạn có chắc muốn xóa ${m.name} khỏi dự án?`)) return;
                          try {
                            await apiClient.delete(`http://localhost:8083/api/projects/${activeProjectId}/members/${m.id}`);
                            setMembers((prev) => prev.filter((member) => member.id !== m.id));
                            toast.success(`Đã xóa ${m.name} khỏi dự án`);
                            emitEvent(EVENTS.MEMBER, { projectId: activeProjectId });
                          } catch (error) {
                            toast.error(`Lỗi xóa thành viên: ${error.response?.data?.message || "Không đủ quyền!"}`);
                          }
                        }}
                          className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors" title="Xóa thành viên">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button type="button" onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl cursor-pointer transition-colors">
            {hasMemberAddPermission ? "Hủy" : "Đóng"}
          </button>
          {hasMemberAddPermission && (
            <button type="button" disabled={isSubmitting || pendingMembers.length === 0} onClick={handleApplyAddMembers}
              className={`text-white px-6 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-colors shadow-sm ${A.solidBg}`}>
              {isSubmitting && <Loader2 size={16} className="animate-spin" />} <span>Áp dụng</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}