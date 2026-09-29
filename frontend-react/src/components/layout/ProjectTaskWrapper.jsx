import React, { useState } from "react";
import { LayoutGrid, List as ListIcon } from "lucide-react";

import KanbanBoard from "../main/KanbanBoard";
import ProjectList from "../main/ProjectList";

// ==== Preferences ====
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

export default function ProjectTaskWrapper() {
  // ✅ Giữ nguyên: viewMode vẫn localStorage, không đưa vào BE
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("project_task_view_mode") || "kanban";
  });

  // ==== Preferences ====
  const { accent } = usePreferences();
  const A = getAccent(accent);

  const switchView = (mode) => {
    setViewMode(mode);
    localStorage.setItem("project_task_view_mode", mode);
  };

  const btnClass = (active) => `
    flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer
    ${
      active
        ? `bg-white dark:bg-gray-700 ${A.text} shadow-sm`
        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
    }
  `;

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-gray-900 relative transition-colors duration-300">
      {/* NÚT CHUYỂN ĐỔI VIEW */}
      <div className="absolute top-6 right-6 z-50">
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors">
          <button
            onClick={() => switchView("kanban")}
            className={btnClass(viewMode === "kanban")}
            title="Chế độ Kanban"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => switchView("list")}
            className={btnClass(viewMode === "list")}
            title="Chế độ danh sách"
          >
            <ListIcon size={14} />
          </button>
        </div>
      </div>

      {/* RENDER VIEW */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "kanban" ? <KanbanBoard /> : <ProjectList />}
      </div>
    </div>
  );
}