import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import apiClient from "../../utils/apiClient";
import { X, Users, Loader2, Search, ChevronDown, Check, FolderGit2, AlertCircle, } from "lucide-react";
import toast from "react-hot-toast";
import { emitEvent, EVENTS } from "../../hooks/useEventBus";

const getAuthToken = () => {
  const directToken = localStorage.getItem("accessToken");
  if (directToken) return directToken;
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      return parsed.token || null;
    }
  } catch (e) {
    console.error("Lỗi khi đọc token:", e);
  }
  return null;
};

export default function ManageMembersModal({ isOpen, onClose, projectId }) {
  const [projectsList, setProjectsList] = useState([]);
  const [selectedTargetProjectId, setSelectedTargetProjectId] = useState(
    projectId || "",
  );
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [currentProjectName, setCurrentProjectName] = useState("");
  const [members, setMembers] = useState([]);

  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [pendingMembers, setPendingMembers] = useState([]);

  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openRoleDropdownId, setOpenRoleDropdownId] = useState(null);

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
    const token = getAuthToken();

    if (projectId) {
      const fetchCurrentProjectName = async () => {
        try {
          const res = await apiClient.get(`http://localhost:8083/api/projects/${projectId}`);
          setCurrentProjectName(res.data?.name || "Dự án hiện tại");
        } catch (err) {
          setCurrentProjectName("Dự án hiện tại");
        }
      };
      fetchCurrentProjectName();
    } else {
      const fetchProjects = async () => {
        try {
          const res = await apiClient.get("http://localhost:8083/api/projects");
            const data = await res.json();
            const list = data?.content ? data.content : (Array.isArray(data) ? data : []);
            setProjectsList(list);
            if (list.length > 0 && !selectedTargetProjectId) {
              setSelectedTargetProjectId(list[0].id);
            }
        } catch (error) {}
      };
      fetchProjects();
    }
  }, [projectId, isOpen, selectedTargetProjectId]);

  useEffect(() => {
    if (!activeProjectId || !isOpen) return;
    const fetchProjectMembers = async () => {
      setLoadingMembers(true);
      try {
        const res = await apiClient.get(`http://localhost:8083/api/projects/${activeProjectId}/members`,);

        const data = res.data;
        const memberList = Array.isArray(data) ? data : data.content || [];

        const formatted = memberList.map((m) => {
          const name =
            m.fullName || m.fullname || m.username || m.name || "Thành viên";
          return {
            id: m.userId || m.id,
            name: name,
            email: m.email || "Chưa có email",
            role: m.role || "MEMBER",
            avatar: name.charAt(0).toUpperCase(),
          };
        });
        setMembers(formatted);
      } catch (error) {
        console.error("Lỗi tải thành viên:", error);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchProjectMembers();
  }, [activeProjectId, isOpen]);

  const handleSearchUser = async (e) => {
    if (e) e.preventDefault();
    const query = searchEmail.trim();
    if (!query) return;

    setSearchError("");
    setSearching(true);

    try {
      const token = getAuthToken();

      const existsInPending = pendingMembers.some(
        (m) => m.email?.toLowerCase() === query.toLowerCase(),
      );
      const existsInOfficial = members.some(
        (m) => m.email?.toLowerCase() === query.toLowerCase(),
      );

      if (existsInPending) {
        setSearchError("Người dùng này đã có trong danh sách chuẩn bị thêm!");
        return;
      }
      if (existsInOfficial) {
        setSearchError("Người dùng này đã là thành viên của dự án!");
        return;
      }

      const res = await apiClient.get(`http://localhost:8086/api/users/email?email=${encodeURIComponent(query)}`);

      const userData = res.data

      const realName =
        userData.fullName ||
        userData.fullname ||
        userData.username ||
        userData.userName ||
        query.split("@")[0];

      const realUser = {
        id: userData.id || userData.userId,
        email: userData.email || query,
        name: realName,
        role: "MEMBER",
        avatar: realName.charAt(0).toUpperCase(),
      };

      setPendingMembers((prev) => [...prev, realUser]);
      setSearchEmail("");
    } catch (error) {
      console.error("Lỗi khi tìm kiếm User:", error);
      setSearchError("Không thể kết nối đến máy chủ User!");
    } finally {
      setSearching(false);
    }
  };

  const handleRemovePendingMember = (memberId) =>
    setPendingMembers((prev) => prev.filter((m) => m.id !== memberId));

  const handleUpdatePendingRole = (memberId, newRole) =>
    setPendingMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
    );

  const handleApplyAddMembers = async () => {
    if (pendingMembers.length === 0) {
      onClose();
      return;
    }
    if (!activeProjectId) {
      toast.error("Vui lòng chọn dự án cần thêm thành viên!");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      let hasError = false;

      const promises = pendingMembers.map(async (m) => {
        try {
          await apiClient.post(`http://localhost:8083/api/projects/${activeProjectId}/members`,{ email: m.email, role: m.role });
        } catch (err) {
          hasError = true;
          const msg = err.res?.data?.message || "Không đủ quyền hạn!";
          toast.error(`Lỗi thêm ${m.email}: ${msg}`);
        }
      });

      await Promise.all(promises);

      if (!hasError) {
        toast.success("Thêm thành viên vào dự án thành công!");
        emitEvent(EVENTS.MEMBER, { projectId: activeProjectId });
        onClose();
      } else {
        emitEvent(EVENTS.MEMBER, { projectId: activeProjectId });
      }
    } catch (error) {
      console.error("Lỗi thêm thành viên:", error);
      toast.error("Không thể kết nối đến máy chủ!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleLabels = { ADMIN: "Quản trị viên", MEMBER: "Thành viên" };
  const selectedProjObj = projectsList.find(
    (p) => String(p.id) === String(selectedTargetProjectId),
  );
  const selectedProjectDropdownName = selectedProjObj
    ? selectedProjObj.name
    : "Chọn dự án quản lý";

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] bg-gray-900/70 overflow-y-auto flex items-center justify-center p-4">
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 p-6 relative flex flex-col max-h-[90vh]"
        ref={dropdownRef}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:bg-gray-100 rounded-full cursor-pointer z-10 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 pr-10 shrink-0">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Quản lý thành viên dự án
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Thêm hoặc quản lý thành viên trực tiếp trong dự án
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
          {projectId ? (
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-indigo-900 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <FolderGit2 size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider">
                  Đang quản lý dự án
                </span>
                <span className="font-bold text-gray-900 truncate">
                  {currentProjectName || "Đang tải tên dự án..."}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 relative shrink-0">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
                <FolderGit2 size={14} className="text-indigo-600" /> Chọn dự án
              </label>
              <div
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium flex justify-between cursor-pointer"
              >
                <span className="truncate text-gray-800">
                  {selectedProjectDropdownName}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform ${
                    isProjectDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
              {isProjectDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl py-1 max-h-48 overflow-y-auto z-[99999]">
                  {projectsList.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => {
                        setSelectedTargetProjectId(proj.id);
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`px-4 py-2 text-sm cursor-pointer flex justify-between ${
                        String(selectedTargetProjectId) === String(proj.id)
                          ? "bg-indigo-50/70 text-indigo-600 font-semibold"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="truncate">{proj.name}</span>
                      {String(selectedTargetProjectId) === String(proj.id) && (
                        <Check size={16} className="text-indigo-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ô TÌM KIẾM NGƯỜI DÙNG BẰNG EMAIL */}
          <div className="space-y-1.5 shrink-0">
            <label className="block text-[13px] font-semibold text-gray-700">
              Tìm kiếm người dùng
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Nhập email người dùng..."
                  value={searchEmail}
                  onChange={(e) => {
                    setSearchEmail(e.target.value);
                    if (searchError) setSearchError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchUser();
                    }
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-[14px] border rounded-xl outline-none transition-all ${
                    searchError
                      ? "border-red-400 focus:ring-2 focus:ring-red-200"
                      : "border-gray-200 focus:ring-2 focus:ring-indigo-500"
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={handleSearchUser}
                disabled={searching}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-70 transition-colors"
              >
                {searching ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span>Tìm</span>
                )}
              </button>
            </div>
            {searchError && (
              <p className="text-[12px] text-red-500 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle size={14} /> {searchError}
              </p>
            )}
          </div>

          {/* DANH SÁCH THÀNH VIÊN THẬT ĐƯỢC CHỌN THÊM */}
          <div className="space-y-1.5 shrink-0">
            <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              Thành viên chuẩn bị thêm ({pendingMembers.length})
            </label>
            {pendingMembers.length === 0 ? (
              <div className="py-3 text-center text-gray-400 text-[12px] italic bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                Chưa có thành viên nào được chọn.
              </div>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {pendingMembers.map((user) => {
                  const roleKey = `pending-${user.id}`;
                  const isRoleOpen = openRoleDropdownId === roleKey;
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2.5 bg-white border border-gray-200/80 rounded-xl shadow-2xs gap-3 relative"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                          {user.avatar}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[13px] font-bold text-gray-900 truncate">
                            {user.name}
                          </span>
                          <span className="text-[11px] text-gray-500 truncate">
                            {user.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                          <div
                            onClick={() =>
                              setOpenRoleDropdownId(isRoleOpen ? null : roleKey)
                            }
                            className="w-32 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] font-medium flex justify-between items-center cursor-pointer bg-gray-50/50 hover:bg-gray-100"
                          >
                            <span className="text-gray-700 truncate">
                              {roleLabels[user.role]}
                            </span>
                            <ChevronDown size={13} className="text-gray-400" />
                          </div>

                          {isRoleOpen && (
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-100 rounded-xl shadow-2xl py-1 z-[99999]">
                              {["MEMBER", "ADMIN"].map((r) => (
                                <div
                                  key={r}
                                  onClick={() => {
                                    handleUpdatePendingRole(user.id, r);
                                    setOpenRoleDropdownId(null);
                                  }}
                                  className="px-3 py-1.5 text-[12px] cursor-pointer flex justify-between items-center hover:bg-indigo-50"
                                >
                                  <span
                                    className={
                                      user.role === r
                                        ? "text-indigo-600 font-semibold"
                                        : "text-gray-700"
                                    }
                                  >
                                    {roleLabels[r]}
                                  </span>
                                  {user.role === r && (
                                    <Check
                                      size={12}
                                      className="text-indigo-600"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePendingMember(user.id)}
                          className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DANH SÁCH THÀNH VIÊN HIỆN TẠI */}
          <div className="space-y-1.5 pt-2 border-t border-gray-100 shrink-0">
            <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider">
              Thành viên hiện tại ({members.length})
            </label>
            {loadingMembers ? (
              <div className="py-6 flex justify-center items-center">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
              </div>
            ) : members.length === 0 ? (
              <div className="py-4 text-center text-gray-400 text-[12px] italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Chưa có thành viên nào.
              </div>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 bg-gray-50/80 border border-gray-100 rounded-xl"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex justify-center items-center font-bold text-xs uppercase">
                        {m.avatar}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-gray-900 truncate">
                          {m.name}
                        </span>
                        <span className="text-[10px] text-gray-500 truncate">
                          {m.email}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md shrink-0">
                      {roleLabels[m.role] || m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-4 mt-4 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl cursor-pointer transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isSubmitting || pendingMembers.length === 0}
            onClick={handleApplyAddMembers}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            <span>Áp dụng</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
