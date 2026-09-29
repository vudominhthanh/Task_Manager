import React, { useState, useEffect } from "react";
import { Megaphone, X } from "lucide-react";
import RightAside from "../layout/RightAside";
import LeftAside from "../layout/LeftAside";
import { useGlobalWebSocket } from "../../hooks/useGlobalWebSocket";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { Outlet, useSearchParams } from "react-router-dom";

import { usePreferences } from "../../hooks/usePreferences";
import { getAccent, getDensity } from "../../utils/preferenceTokens";

const Home = () => {
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [broadcastAlert, setBroadcastAlert] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlTaskId = searchParams.get("selectedTaskId");

  const { accent, density } = usePreferences();
  const A = getAccent(accent);
  const D = getDensity(density);

  useEffect(() => {
    if (urlTaskId) {
      setSelectedTaskId(urlTaskId);
    }
  }, [urlTaskId]);

  useGlobalWebSocket();

  useEvent(EVENTS.BROADCAST, (data) => {
    setBroadcastAlert(data);
  });

  const handleCloseTask = () => {
    setSelectedTaskId(null);
    if (urlTaskId) {
      searchParams.delete("selectedTaskId");
      setSearchParams(searchParams);
    }
  };

  return (
    <div className="relative h-screen w-full bg-[#F9FAFB] dark:bg-gray-950 text-gray-800 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-300">
      {/* Banner thông báo nổi bật trên đầu */}
      {broadcastAlert && (
        <div className={`fixed top-0 left-0 right-0 z-50 text-white px-4 py-2.5 flex items-center justify-between shadow-md ${A.bgOnly}`}>
          <div className="flex items-center gap-2 mx-auto">
            <Megaphone size={18} className="text-amber-300 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold tracking-wide">
              {broadcastAlert.message}
            </span>
          </div>
          <button
            onClick={() => setBroadcastAlert(null)}
            className="p-1 hover:bg-white/20 rounded cursor-pointer shrink-0 transition-colors"
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Layout 3 cột */}
      <div
        className={`grid grid-cols-1 lg:grid-cols-[220px_minmax(0,_1fr)_330px] h-full w-full transition-all duration-300 ${
          broadcastAlert ? "pt-10" : ""
        }`}
      >
        <div className="hidden lg:block border-r border-gray-200 dark:border-gray-800 z-10">
          <LeftAside />
        </div>

        <div className="flex flex-col min-w-0 bg-[#F9FAFB] dark:bg-gray-950 overflow-hidden h-full">
          <Outlet context={{ selectedTaskId, setSelectedTaskId }} />
        </div>

        <div className="hidden lg:block border-l border-gray-200 dark:border-gray-800 shadow-[-4px_0_15px_rgba(0,0,0,0.02)] dark:shadow-none z-10 h-full overflow-hidden bg-white dark:bg-gray-900">
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