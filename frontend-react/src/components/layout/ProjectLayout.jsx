import React, { useState, useEffect } from "react";
import { Menu, Star, Plus, Bell, Loader2 } from "lucide-react";
import { NavLink, Outlet, useParams, useOutletContext, useNavigate } from "react-router-dom";
import CreateTaskPage from "../function/CreateTaskPage";

const ProjectLayout = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const tabs = [
    { name: "Bảng", path: "" },
    { name: "Danh sách", path: "list" },
    { name: "Lịch", path: "calendar" },
    { name: "Tổng quan", path: "overview" },
    { name: "Hoạt động", path: "activities" },
    { name: "Tệp", path: "files" },
    { name: "Cài đặt", path: "settings" },
  ];

  const avatarColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-purple-500", "bg-indigo-600"];

  const getToken = () => localStorage.getItem("accessToken") || "";

  const context = useOutletContext();

  useEffect(() => {
    if (!projectId) return;

    const fetchProjectData = async () => {
      setLoading(true);
      try {
        const projectRes = await fetch(`http://localhost:8083/api/projects/${projectId}`, {
          headers: { "Authorization": `Bearer ${getToken()}` },
        });
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          setProject(projectData);
        }

        const membersRes = await fetch(`http://localhost:8083/api/projects/${projectId}/members`, {
          headers: { "Authorization": `Bearer ${getToken()}` },
        });
        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData);
        }
      } catch (error) {
        console.error("Lỗi tải dữ liệu ProjectLayout:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [projectId]);

  const handleHeaderAddTask = () => {
    setIsCreateTaskOpen(true); 
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-[#F9FAFB]">
        <Loader2 className="animate-spin text-indigo-600 mb-2" size={36} />
        <p className="text-gray-500 text-sm">Đang tải dữ liệu dự án...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-[#F9FAFB]">
        <p className="text-red-500 font-bold text-lg">Không tìm thấy dự án!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <header className="bg-white flex flex-col px-6 pt-5 shrink-0 z-10 border-b border-gray-200 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 text-[13px] text-gray-500 mb-1 cursor-pointer hover:text-gray-800 transition-colors">
              <Menu size={16} />
              <span className="font-medium">Dự án</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">
                {project.name}
              </h1>
              <Star size={18} className="text-orange-400 fill-orange-400 cursor-pointer hover:scale-110 transition-transform" />
            </div>
            <p className="text-[13px] text-gray-500 mt-1">{project.description}</p>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center">
              <div className="flex -space-x-2 mr-2">
                {members.slice(0, 4).map((user, index) => {
                  const initial = user.fullName ? user.fullName.charAt(0).toUpperCase() : "U";
                  const color = avatarColors[index % avatarColors.length];
                  
                  return (
                    <div 
                      key={user.userId || user.id} 
                      className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[11px] font-bold shadow-sm cursor-pointer hover:-translate-y-1 transition-transform ${color}`} 
                      title={user.fullName}
                    >
                      {initial}
                    </div>
                  );
                })}
              </div>
              
              {members.length > 4 && (
                <span className="text-[12px] text-gray-500 font-medium bg-gray-100 px-2.5 py-1 rounded-full cursor-pointer hover:bg-gray-200 transition-colors">
                  +{members.length - 4}
                </span>
              )}
            </div>
            
            {/* Gắn sự kiện onClick vào nút Thêm task */}
            <button 
              onClick={handleHeaderAddTask}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} /> Thêm task
            </button>
            <button className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors border border-gray-200 shadow-sm cursor-pointer">
              <Bell size={18} />
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                ?
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-7 mt-6">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end
              className={({ isActive }) => `
                pb-3 text-[14px] font-medium cursor-pointer transition-colors relative
                ${isActive ? "text-indigo-600" : "text-gray-500 hover:text-gray-900"}
              `}
            >
              {({ isActive }) => (
                <>
                  {tab.name}
                  {isActive && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-indigo-600 rounded-t-md"></div>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB] overflow-hidden">
       <Outlet context={context} />
      </main>

      <CreateTaskPage 
        isOpen={isCreateTaskOpen} 
        onClose={() => setIsCreateTaskOpen(false)} 
        projectId={projectId}
        defaultStatus="TO_DO" 
      />

    </div>
  );
};

export default ProjectLayout;