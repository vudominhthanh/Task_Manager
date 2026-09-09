import React, { useState, useEffect, useRef, useCallback } from "react";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams, useNavigate } from "react-router-dom";
import { Save, UserMinus, ShieldAlert, Loader2, UserPlus, X, ChevronDown, Check, Search, FolderGit2 } from "lucide-react";

const ProjectSettings = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [members, setMembers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // State cho Modal Thêm thành viên theo giao diện mới
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);

  // State quản lý mở/đóng custom dropdown
  const [openDropdownId, setOpenDropdownId] = useState(null); 
  const containerRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getToken = () => localStorage.getItem("accessToken") || "";

  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) return;
    try {
      const resInfo = await fetch(
        `http://localhost:8083/api/projects/${projectId}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (resInfo.ok) {
        const data = await resInfo.json();
        setProjectName(data.name || "");
        setProjectDesc(data.description || "");
      }
    } catch (error) {
      console.error("Lỗi tải thông tin dự án:", error);
    }
  }, [projectId]);

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;
    try {
      const resMembers = await fetch(
        `http://localhost:8083/api/projects/${projectId}/members`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (resMembers.ok) {
        const membersData = await resMembers.json();
        setMembers(membersData);
      }
    } catch (error) {
      console.error("Lỗi khi tải thành viên:", error);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([fetchProjectDetails(), fetchMembers()]).finally(() => setLoading(false));
  }, [projectId, fetchProjectDetails, fetchMembers]);

  useEvent(EVENTS.MEMBER, fetchMembers);
  useEvent(EVENTS.PROJECT, fetchProjectDetails);

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(
        `http://localhost:8083/api/projects/${projectId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ name: projectName, description: projectDesc }),
        }
      );

      if (res.ok) {
        alert("Cập nhật thông tin dự án thành công!");
      } else {
        const err = await res.text();
        alert(`Cập nhật thất bại: ${err || "Bạn không có quyền chỉnh sửa!"}`);
      }
    } catch (error) {
      console.error("Lỗi cập nhật dự án:", error);
      alert("Đã xảy ra lỗi kết nối đến máy chủ.");
    } finally {
      setSaving(false);
    }
  };

  const handleSearchUser = async (e) => {
    if (e) e.preventDefault();
    if (!searchEmail.trim()) return;

    setSearching(true);
    try {
      const queryEmail = searchEmail.trim();
      const existsInPending = pendingMembers.some(m => m.email === queryEmail);
      const existsInOfficial = members.some(m => m.email === queryEmail);

      if (existsInPending || existsInOfficial) {
        alert("Thành viên này đã có trong danh sách!");
        setSearching(false);
        return;
      }

      const foundUser = {
        id: "temp-" + Date.now(),
        email: queryEmail,
        fullName: queryEmail.includes('@') ? queryEmail.split('@')[0] : queryEmail,
        role: "MEMBER",
        avatar: (queryEmail.charAt(0) || "U").toUpperCase()
      };

      setPendingMembers(prev => [...prev, foundUser]);
      setSearchEmail("");
    } catch (error) {
      console.error("Lỗi tìm kiếm user:", error);
      alert("Không tìm thấy người dùng!");
    } finally {
      setSearching(false);
    }
  };

  const handleRemovePendingMember = (tempId) => {
    setPendingMembers(prev => prev.filter(m => m.id !== tempId));
  };

  const handleUpdatePendingRole = (tempId, newRole) => {
    setPendingMembers(prev => prev.map(m => m.id === tempId ? { ...m, role: newRole } : m));
  };

  const handleApplyAddMembers = async () => {
    if (pendingMembers.length === 0 || !projectId) {
      setIsAddModalOpen(false);
      return;
    }

    setAddingMembers(true);
    try {
      const promises = pendingMembers.map(m => 
        fetch(`http://localhost:8083/api/projects/${projectId}/members`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ email: m.email, role: m.role })
        })
      );

      const results = await Promise.all(promises);
      const allSuccess = results.every(res => res.ok);

      if (allSuccess) {
        const resMembers = await fetch(
          `http://localhost:8083/api/projects/${projectId}/members`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (resMembers.ok) {
          setMembers(await resMembers.json());
        }

        alert("Thêm thành viên vào dự án thành công!");
        setIsAddModalOpen(false);
        setPendingMembers([]);
      } else {
        alert("Có một vài thành viên thêm thất bại, vui lòng kiểm tra lại email!");
      }
    } catch (error) {
      console.error("Lỗi khi apply thành viên:", error);
      alert("Đã xảy ra lỗi kết nối.");
    } finally {
      setAddingMembers(false);
    }
  };

  const handleChangeRole = async (memberIdentifier, newRole) => {
    if (!window.confirm("Xác nhận thay đổi quyền của thành viên này?")) return;
    
    try {
      const res = await fetch(`http://localhost:8083/api/projects/${projectId}/members/${memberIdentifier}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        setMembers(prev => prev.map(m => (m.id === memberIdentifier || m.userId === memberIdentifier) ? { ...m, role: newRole } : m));
        alert("Thay đổi quyền thành công!");
      } else {
        alert("Cập nhật thất bại. Bạn có đủ quyền không?");
      }
    } catch (error) {
      console.error("Lỗi khi đổi quyền:", error);
    }
  };

  const handleRemoveMember = async (memberIdentifier) => {
    if (!window.confirm("Bạn có chắc muốn xóa thành viên này khỏi dự án?")) return;

    try {
      const res = await fetch(`http://localhost:8083/api/projects/${projectId}/members/${memberIdentifier}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (res.ok || res.status === 204) {
        setMembers(prev => prev.filter(m => m.id !== memberIdentifier && m.userId !== memberIdentifier));
        alert("Đã xóa thành viên thành công!");
      } else {
        alert("Xóa thất bại. Bạn có đủ quyền không?");
      }
    } catch (error) {
      console.error("Lỗi khi xóa thành viên:", error);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn dự án này? Thao tác này không thể hoàn tác!")) return;

    setDeleting(true);
    try {
      const res = await fetch(
        `http://localhost:8083/api/projects/${projectId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      if (res.ok || res.status === 204) {
        alert("Đã xóa dự án thành công.");
        navigate("/projects");
      } else {
        alert("Xóa dự án thất bại. Bạn phải là Chủ sở hữu mới có quyền này!");
      }
    } catch (error) {
      console.error("Lỗi khi xóa dự án:", error);
      alert("Đã xảy ra lỗi kết nối.");
    } finally {
      setDeleting(false);
    }
  };

  const roleLabels = {
    ADMIN: "Quản trị viên",
    MEMBER: "Thành viên"
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F9FAFB]">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 h-full overflow-y-auto bg-[#F9FAFB] flex justify-center font-sans" ref={containerRef}>
      <div className="w-full max-w-4xl space-y-6 pb-12 relative">
        {(saving || deleting) && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        )}

        {/* Block 1: Thông tin chung */}
        <form
          onSubmit={handleUpdateProject}
          className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-[15px] font-bold text-gray-900">Thông tin dự án</h3>
            <p className="text-[12px] text-gray-500">Cập nhật tên và mô tả dự án</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Tên dự án</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Mô tả</label>
              <textarea
                rows="3"
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-700"
              ></textarea>
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <Save size={16} /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </form>

        {/* Block 2: Quản lý thành viên */}
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-visible">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">Quản lý thành viên</h3>
              <p className="text-[12px] text-gray-500">Phân quyền và thêm/xóa thành viên khỏi dự án</p>
            </div>
            <button
              onClick={() => { setPendingMembers([]); setIsAddModalOpen(true); }}
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3.5 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus size={16} /> Thêm thành viên
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {members.length === 0 ? (
              <div className="px-6 py-6 text-center text-[13px] text-gray-500">
                Chưa có thành viên nào trong dự án này.
              </div>
            ) : (
              members.map((member) => {
                const memberKey = member.id || member.userId;
                const dropdownKey = `member-${memberKey}`;
                const isDropdownOpen = openDropdownId === dropdownKey;

                return (
                  <div
                    key={memberKey}
                    className={`flex justify-between items-center px-6 py-4 transition-colors relative ${
                      isDropdownOpen ? "z-50 bg-indigo-50/20" : "hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-[13px] shadow-sm uppercase">
                        {member.fullName ? member.fullName.charAt(0) : "U"}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-gray-900">
                          {member.fullName || member.username}
                        </p>
                        <p className="text-[12px] text-gray-500">
                          {member.email || member.status || "Online"} • {roleLabels[member.role] || "Thành viên"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          onClick={() => setOpenDropdownId(isDropdownOpen ? null : dropdownKey)}
                          className="w-36 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] font-medium bg-white flex items-center justify-between cursor-pointer select-none hover:border-gray-300 transition-colors shadow-xs"
                        >
                          <span className="text-gray-700 truncate">{roleLabels[member.role] || member.role}</span>
                          <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isDropdownOpen && (
                          <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-gray-100 rounded-xl shadow-2xl py-1 z-[99999]">
                            {["ADMIN", "MEMBER"].map((r) => {
                              const isSelected = member.role === r;
                              return (
                                <div
                                  key={r}
                                  onClick={() => {
                                    handleChangeRole(memberKey, r);
                                    setOpenDropdownId(null);
                                  }}
                                  className={`px-3 py-2 text-[12px] cursor-pointer flex items-center justify-between transition-colors ${
                                    isSelected ? "bg-indigo-50/70 text-indigo-600 font-medium" : "text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  <span>{roleLabels[r]}</span>
                                  {isSelected && <Check size={13} className="text-indigo-600" />}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveMember(memberKey)}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors cursor-pointer"
                        title="Xóa thành viên"
                      >
                        <UserMinus size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Block 3: Danger Zone */}
        <div className="bg-red-50/30 rounded-2xl border border-red-200 shadow-sm overflow-hidden">
          <div className="p-6 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex gap-3">
              <ShieldAlert className="text-red-500 mt-1 sm:mt-0 shrink-0" size={24} />
              <div>
                <h3 className="text-[15px] font-bold text-red-700">Khu vực nguy hiểm</h3>
                <p className="text-[12px] text-red-500/80 mt-0.5">
                  Xóa vĩnh viễn dự án này và toàn bộ dữ liệu đi kèm. Thao tác này không thể hoàn tác.
                </p>
              </div>
            </div>
            <button
              onClick={handleDeleteProject}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-[13px] font-bold shadow-sm transition-colors whitespace-nowrap cursor-pointer"
            >
              {deleting ? "Đang xóa..." : "Xóa dự án"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Thêm thành viên tích hợp bên trong ProjectSettings */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 overflow-visible relative flex flex-col max-h-[90vh]">
            
            {/* 1. Tiêu đề popup kèm nút thoát ở trên cùng */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl shrink-0">
              <h3 className="text-[16px] font-bold text-gray-900 flex items-center gap-2">
                <UserPlus size={18} className="text-indigo-600" /> Thêm thành viên mới
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* 2. Thanh nhập email có nút tìm kiếm */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-gray-700">Tìm kiếm người dùng</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Nhập email hoặc tên đăng nhập..."
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchUser(); }}}
                      className="w-full pl-10 pr-3.5 py-2.5 text-[14px] border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700 shadow-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchUser}
                    disabled={searching}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {searching ? <Loader2 size={16} className="animate-spin" /> : <span>Tìm</span>}
                  </button>
                </div>
              </div>

              {/* 3. Khung hiển thị user chuẩn bị thêm (Avatar, Fullname, Role, nút X) */}
              <div className="space-y-2">
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
                      const isOpen = openDropdownId === roleKey;

                      return (
                        <div key={user.id} className="flex items-center justify-between p-2.5 bg-white border border-gray-200/80 rounded-xl shadow-2xs gap-3 relative">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase shadow-2xs">
                              {user.avatar}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[13px] font-bold text-gray-900 truncate">{user.fullName}</span>
                              <span className="text-[11px] text-gray-500 truncate">{user.email}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="relative">
                              <div
                                onClick={() => setOpenDropdownId(isOpen ? null : roleKey)}
                                className="w-32 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[12px] font-medium bg-white flex items-center justify-between cursor-pointer select-none hover:border-gray-300 transition-colors"
                              >
                                <span className="text-gray-700 truncate">{roleLabels[user.role]}</span>
                                <ChevronDown size={13} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </div>

                              {isOpen && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-100 rounded-xl shadow-2xl py-1 z-[99999]">
                                  {["MEMBER", "ADMIN"].map((r) => {
                                    const isSelected = user.role === r;
                                    return (
                                      <div
                                        key={r}
                                        onClick={() => {
                                          handleUpdatePendingRole(user.id, r);
                                          setOpenDropdownId(null);
                                        }}
                                        className={`px-3 py-1.5 text-[12px] cursor-pointer flex items-center justify-between transition-colors ${
                                          isSelected ? "bg-indigo-50/70 text-indigo-600 font-medium" : "text-gray-700 hover:bg-gray-50"
                                        }`}
                                      >
                                        <span>{roleLabels[r]}</span>
                                        {isSelected && <Check size={12} className="text-indigo-600" />}
                                      </div>
                                    );
                                  })}
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

              {/* 4. Khung hiển thị các thành viên hiện tại của dự án */}
              <div className="space-y-2 pt-2 border-t border-gray-100 shrink-0">
                <label className="block text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                  Thành viên hiện tại trong dự án ({members.length})
                </label>
                
                {members.length === 0 ? (
                  <div className="py-4 text-center text-gray-400 text-[12px] italic bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    Chưa có thành viên nào.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {members.map((m) => {
                      const mKey = m.id || m.userId;
                      return (
                        <div key={mKey} className="flex items-center justify-between p-2.5 bg-gray-50/80 border border-gray-100 rounded-xl">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {m.fullName ? m.fullName.charAt(0) : "U"}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[12px] font-bold text-gray-800 truncate">{m.fullName || m.username}</span>
                              <span className="text-[10px] text-gray-500 truncate">{m.email}</span>
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md shrink-0">
                            {roleLabels[m.role] || m.role}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Footer với nút Apply xác nhận */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-gray-600 hover:bg-gray-200/60 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={addingMembers || pendingMembers.length === 0}
                onClick={handleApplyAddMembers}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 text-sm font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {addingMembers && <Loader2 size={16} className="animate-spin" />}
                <span>Apply</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSettings;