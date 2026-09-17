import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Megaphone, X } from "lucide-react";
import RightAside from "../layout/RightAside";
import LeftAside from "../layout/LeftAside";
import { useGlobalWebSocket } from "../../hooks/useGlobalWebSocket";
import { useEvent, EVENTS } from "../../hooks/useEventBus";

const Home = () => {
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [broadcastAlert, setBroadcastAlert] = useState(null);

  useGlobalWebSocket();

  // Bắt sự kiện bằng chính hook useEvent
  useEvent(EVENTS.BROADCAST, (data) => {
    setBroadcastAlert(data);
  });

  return (
    <div className="relative h-screen w-full bg-[#F9FAFB] text-gray-800 overflow-hidden font-sans">
      {/* Banner thông báo nổi bật trên cùng */}
      {broadcastAlert && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-indigo-600 text-white px-4 py-2.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 mx-auto">
            <Megaphone size={18} className="text-amber-300 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold tracking-wide">
              {broadcastAlert.message}
            </span>
          </div>
          <button
            onClick={() => setBroadcastAlert(null)}
            className="p-1 hover:bg-white/20 rounded cursor-pointer shrink-0"
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 3 Cột giao diện (tự tụt xuống khi có banner) */}
      <div 
        className={`grid grid-cols-1 lg:grid-cols-[220px_minmax(0,_1fr)_330px] h-full w-full transition-all duration-300 ${
          broadcastAlert ? "pt-10" : ""
        }`}
      >
        <div className="hidden lg:block border-r border-gray-200 z-10">
          <LeftAside />
        </div>

        <div className="flex flex-col min-w-0 bg-[#F9FAFB] overflow-hidden h-full">
          <Outlet context={{ selectedTaskId, setSelectedTaskId }} />
        </div>

        <div className="hidden lg:block border-l border-gray-200 shadow-[-4px_0_15px_rgba(0,0,0,0.02)] z-10 h-full overflow-hidden bg-white">
          <RightAside
            selectedTaskId={selectedTaskId}
            onCloseTask={() => setSelectedTaskId(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;