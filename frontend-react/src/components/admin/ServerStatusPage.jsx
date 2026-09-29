import React, { useState } from "react";
import { 
  Server, Database, Cpu, HardDrive, RefreshCw, 
  ShieldCheck, AlertTriangle, Power, DownloadCloud, Wrench, 
  CheckCircle2, Network, Activity, Clock, Terminal, RotateCw, DatabaseZap
} from "lucide-react";

export default function ServerStatusPage() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isRestarting, setIsRestarting] = useState(null);

  const handleRestartService = (serviceName) => {
    if (window.confirm(`CẢNH BÁO: Bạn có chắc chắn muốn khởi động lại phân vùng [${serviceName}] không?`)) {
      setIsRestarting(serviceName);
      setTimeout(() => {
        setIsRestarting(null);
        alert(`Đã khởi động lại thành công dịch vụ ${serviceName}!`);
      }, 2000);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] flex flex-col gap-6">
      
      {/* 1. TIÊU ĐỀ & THANH CÔNG CỤ TỔNG THỂ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Trạng thái Server & Database</h1>
          <p className="text-[13px] text-gray-500 mt-1">Trung tâm giám sát hạ tầng phần cứng, quản lý Cluster microservices và vận hành CSDL.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMaintenance(!isMaintenance)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors shadow-sm cursor-pointer border ${
              isMaintenance 
                ? 'bg-amber-500 text-white border-amber-600 animate-pulse' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Wrench size={15} /> {isMaintenance ? "Đang bật chế độ bảo trì" : "Bật chế độ bảo trì"}
          </button>
          <button 
            onClick={() => alert("Đã kích hoạt quét bảo mật toàn bộ hệ thống (Security Audit)...")}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
          >
            <ShieldCheck size={16} className="text-emerald-600" /> Quét bảo mật
          </button>
          <button 
            onClick={() => alert("Đang tiến hành tạo bản snapshot Database lên AWS S3...")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-[13px] font-semibold hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
          >
            <DownloadCloud size={16} /> Backup DB ngay
          </button>
        </div>
      </div>

      {/* 2. KHỐI THÔNG SỐ PHẦN CỨNG TỔNG QUAN (4 CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <ServerMetricCard title="CPU Compute Load" value="1.24 (8 Cores)" percent={42} color="emerald" icon={Cpu} sub="Load avg: 1.24, 1.15, 1.08" />
        <ServerMetricCard title="RAM Allocation" value="43.6 / 64.0 GB" percent={68} color="amber" icon={Server} sub="Available: 20.4 GB" />
        <ServerMetricCard title="Primary Storage (SSD)" value="845 / 1000 GB" percent={84.5} color="rose" icon={HardDrive} alert sub="Phân vùng /var/lib/pg" />
        <ServerMetricCard title="Network Throughput" value="124.5 Mbps" percent={35} color="indigo" icon={Network} sub="In: 95 Mbps | Out: 29.5 Mbps" />
      </div>

      {/* 3. QUẢN LÝ CLUSTER MICROSERVICES */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
            <Server size={16} className="text-indigo-600" /> Quản lý Cluster Microservices (Docker Swarm / K8s Nodes)
          </h3>
          <span className="text-[11px] text-gray-500 font-mono bg-gray-50 px-2.5 py-1 rounded border border-gray-100">
            Total Instances: 6 Running
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: "Project Service", port: "8083", pid: "PID 4102", status: "Healthy", uptime: "14 ngày", memory: "512 MB", cpu: "1.4%" },
            { name: "Task Service", port: "8084", pid: "PID 4185", status: "Healthy", uptime: "14 ngày", memory: "640 MB", cpu: "2.1%" },
            { name: "Auth & Security Service", port: "8081", pid: "PID 3920", status: "Healthy", uptime: "28 ngày", memory: "256 MB", cpu: "0.5%" },
            { name: "API Gateway", port: "8080", pid: "PID 3810", status: "Warning", uptime: "2 ngày", memory: "412 MB", cpu: "4.8%" },
          ].map((svc, idx) => (
            <div key={idx} className="p-4 bg-gray-50/60 border border-gray-200/80 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${svc.status === 'Healthy' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13.5px] font-bold text-gray-800">{svc.name}</h4>
                    <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">:{svc.port}</span>
                  </div>
                  <p className="text-[11.5px] text-gray-500 mt-0.5">
                    {svc.pid} • RAM: <span className="font-semibold text-gray-700">{svc.memory}</span> • CPU: <span className="font-semibold text-gray-700">{svc.cpu}</span>
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => handleRestartService(svc.name)}
                disabled={isRestarting === svc.name}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-indigo-600 hover:border-indigo-200 rounded-lg text-[12px] font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
              >
                <RefreshCw size={13} className={isRestarting === svc.name ? "animate-spin text-indigo-600" : ""} /> 
                {isRestarting === svc.name ? "Đang khởi động..." : "Restart"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 4. CHẨN ĐOÁN CƠ SỞ DỮ LIỆU & MESSAGE BROKER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PostgreSQL Diagnostics */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
                <Database size={16} className="text-indigo-600" /> PostgreSQL 15.4 Cluster Diagnostics
              </h3>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                Primary Master Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase">Active Connections</p>
                <p className="text-[20px] font-bold text-gray-800 mt-1">18 <span className="text-[12px] font-normal text-gray-500">/ 100 max</span></p>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase">Avg Query Latency</p>
                <p className="text-[20px] font-bold text-gray-800 mt-1">4.2 <span className="text-[12px] font-normal text-gray-500">ms</span></p>
              </div>
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <p className="text-[11px] font-bold text-gray-400 uppercase">Slow Queries (&gt;1s)</p>
                <p className="text-[20px] font-bold text-emerald-600 mt-1">0 <span className="text-[12px] font-normal text-gray-500">queries</span></p>
              </div>
            </div>

            {/* Bảng dung lượng bảng dữ liệu lớn nhất */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2">Tên Bảng (Table Name)</th>
                    <th className="px-3 py-2">Số lượng bản ghi</th>
                    <th className="px-3 py-2 text-right">Dung lượng (Size)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr>
                    <td className="px-3 py-2 font-mono text-gray-700">audit_logs_history</td>
                    <td className="px-3 py-2 text-gray-600">458,210 rows</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-800">342 MB</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-gray-700">tasks</td>
                    <td className="px-3 py-2 text-gray-600">12,450 rows</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-800">84 MB</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono text-gray-700">projects</td>
                    <td className="px-3 py-2 text-gray-600">3,210 rows</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-800">28 MB</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[12px] text-gray-500">Thao tác an toàn cho database cache:</span>
            <button 
              onClick={() => alert("Đã xóa sạch Redis Cache thành công!")}
              className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[12px] font-bold transition-colors cursor-pointer"
            >
              Flush Redis Cache
            </button>
          </div>
        </div>

        {/* Message Broker & Event Bus (Kafka / Redis) */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-gray-800 flex items-center gap-2 mb-4">
              <Activity size={16} className="text-indigo-600" /> Message Broker (Kafka & Redis)
            </h3>

            <div className="flex flex-col gap-3.5">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-[12px] font-bold text-gray-800">Kafka Broker (Cluster)</p>
                  <p className="text-[11px] text-gray-500">Brokers online: 3/3 • Topics: 12</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">STABLE</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-[12px] font-bold text-gray-800">WebSocket / STOMP Relay</p>
                  <p className="text-[11px] text-gray-500">Active sessions: 1,420 clients</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">RUNNING</span>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-[12px] font-bold text-gray-800">Redis In-Memory Cache</p>
                  <p className="text-[11px] text-gray-500">Hit rate: 98.4% • Memory: 112 MB</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100">OPTIMIZED</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <button 
              onClick={() => alert("Đã làm mới toàn bộ kết nối Event Bus!")}
              className="w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[12px] font-bold transition-colors cursor-pointer"
            >
              Reset Event Bus Connections
            </button>
          </div>
        </div>

      </div>

      {/* 5. TRUNG TÂM SAO LƯU & LỊCH SỬ SNAPSHOT (DISASTER RECOVERY) */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
            <DownloadCloud size={16} className="text-indigo-600" /> Nhật ký Sao lưu & Phục hồi (Automated S3 Backups)
          </h3>
          <span className="text-[11px] text-gray-500">Lịch lưu trữ: Giữ tự động trong 30 ngày gần nhất</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] min-w-[700px]">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5">Tên bản Backup (Snapshot ID)</th>
                <th className="px-4 py-2.5">Thời gian tạo</th>
                <th className="px-4 py-2.5">Dung lượng</th>
                <th className="px-4 py-2.5">Trạng thái lưu trữ</th>
                <th className="px-4 py-2.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { id: "snapshot_prod_2026_09_21_0200", time: "Hôm nay, 02:00 AM", size: "1.42 GB", status: "Available (AWS S3)" },
                { id: "snapshot_prod_2026_09_20_0200", time: "Hôm qua, 02:00 AM", size: "1.40 GB", status: "Available (AWS S3)" },
                { id: "snapshot_prod_2026_09_19_0200", time: "19/09/2026, 02:00 AM", size: "1.38 GB", status: "Available (AWS S3)" },
              ].map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-gray-800">{item.id}</td>
                  <td className="px-4 py-3 text-gray-600">{item.time}</td>
                  <td className="px-4 py-3 text-gray-600">{item.size}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px] border border-emerald-100">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => alert(`Đang chuẩn bị khôi phục từ bản ${item.id}...`)}
                      className="text-indigo-600 font-semibold hover:underline cursor-pointer mr-3"
                    >
                      Restore
                    </button>
                    <button 
                      onClick={() => alert(`Đang tải xuống tệp sao lưu...`)}
                      className="text-gray-500 font-semibold hover:text-gray-800 cursor-pointer"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function ServerMetricCard({ title, value, percent, color, icon: Icon, alert, sub }) {
  const colorMap = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    indigo: "bg-indigo-500",
  };

  return (
    <div className={`bg-white p-5 rounded-xl border ${alert ? 'border-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.1)]' : 'border-gray-200'} shadow-sm flex flex-col justify-between`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-[20px] font-bold text-gray-800 leading-none">{value}</h3>
        </div>
        <div className="p-2.5 rounded-lg bg-gray-50 text-gray-600 border border-gray-100">
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4">
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full ${colorMap[color]} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
        </div>
        <p className="text-[11px] text-gray-500 font-medium">{sub}</p>
      </div>
    </div>
  );
}