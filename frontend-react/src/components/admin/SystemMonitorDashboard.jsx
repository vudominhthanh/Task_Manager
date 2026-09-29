import React from "react";
import { ExternalLink } from "lucide-react";


const GRAFANA_URL =
  "http://localhost:3000/d/spring_boot_statistics/spring-boot-statistics?orgId=1&refresh=10s&kiosk&theme=dark";

export default function SystemMonitorDashboard() {
  return (
    <div className="h-full w-full flex flex-col bg-[#f8f9fa] dark:bg-gray-950 p-4 transition-colors">
      {/* Header nhỏ */}
      <div className="flex justify-between items-center mb-3 px-2 shrink-0">
        <div>
          <h1 className="text-[18px] font-bold text-gray-900 dark:text-white">
            System Monitor
          </h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
            Dữ liệu thật từ Prometheus + Grafana
          </p>
        </div>
        <a
          href={GRAFANA_URL.replace("&kiosk", "")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
        >
          <ExternalLink size={13} /> Mở Grafana
        </a>
      </div>

      {/* Iframe */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <iframe
          src={GRAFANA_URL}
          className="w-full h-full border-0"
          title="System Monitor Dashboard"
          allowFullScreen
        />
      </div>
    </div>
  );
}