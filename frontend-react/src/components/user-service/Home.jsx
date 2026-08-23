import { Sidebar } from "lucide-react";
import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../layout/Header";
import RightAside from "../layout/RightAside";
import LeftAside from "../layout/LeftAside";

const Home = () => {
  const [activeTask, setActiveTask] = useState(null);

  const handleTaskClick = (taskData) => {
    setActiveTask(taskData);
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_380px] h-screen w-full bg-white text-gray-800 overflow-hidden font-sans">
      <div className="hidden lg:block border-r border-gray-200">
        <LeftAside />
      </div>

      <div className="flex flex-col min-w-0 bg-[#F9FAFB] overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-auto p-6">
          <p className="text-gray-500">Main Content Area</p>
        </main>
      </div>

      <div className="hidden lg:block border-l border-gray-200 shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
        <RightAside />
      </div>
    </div>
  );
};

export default Home;
