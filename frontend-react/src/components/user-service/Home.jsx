import { Sidebar } from "lucide-react";
import React from "react";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import RightAside from "../layout/RightAside";
import LeftAside from "../layout/LeftAside";
import { useGlobalWebSocket } from "../../hooks/useGlobalWebSocket";

const Home = () => {
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useGlobalWebSocket();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,_1fr)_330px] h-screen w-full bg-[#F9FAFB] text-gray-800 overflow-hidden font-sans">
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
  );
};

export default Home;
