import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams } from 'react-router-dom';
import { 
  UploadCloud, FileText, Image as ImageIcon, File, 
  Download, MoreVertical, Loader2, User, Clock, Hash 
} from 'lucide-react';

const ProjectFiles = () => {
  const { projectId } = useParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef(null);
  const getToken = () => localStorage.getItem("accessToken") || "";

  // 1. TẢI TOÀN BỘ FILE TRONG DỰ ÁN (TỐI ƯU HÓA)
  const fetchProjectFiles = useCallback(async () => {
    if (!projectId) return;
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      
      // Bước 1: Lấy toàn bộ task thuộc project
      const tasksRes = await fetch(`http://localhost:8085/api/tasks/project/${projectId}`, { headers });
      if (!tasksRes.ok) return;

      const tasks = await tasksRes.json();
      if (!Array.isArray(tasks) || tasks.length === 0) {
        setFiles([]);
        return;
      }

      // Bước 2: Tải song song attachments của từng task
      const attachmentPromises = tasks.map(async (task) => {
        try {
          const attRes = await fetch(`http://localhost:8085/api/tasks/${task.id}/attachments`, { headers });
          if (!attRes.ok) return [];
          const atts = await attRes.json();

          // Dữ liệu Backend trả về đã có sẵn userName từ enrichWithUserDetails
          return atts.map((att) => ({
            ...att,
            taskId: task.id,
            uploaderName: att.userName || att.uploaderName || "Thành viên",
            formattedSize: att.fileSize 
              ? `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB` 
              : "0.5 MB"
          }));
        } catch {
          return [];
        }
      });

      const nestedFiles = await Promise.all(attachmentPromises);
      const sortedFiles = nestedFiles
        .flat()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setFiles(sortedFiles);
    } catch (error) {
      console.error("Lỗi khi tải tài liệu dự án:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Nạp dữ liệu khởi tạo
  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchProjectFiles();
  }, [projectId, fetchProjectFiles]);

  // 2. LẮNG NGHE REALTIME
  useEvent(EVENTS.ATTACHMENT, fetchProjectFiles);
  useEvent(EVENTS.TASK, fetchProjectFiles);

  // 3. TẢI FILE LÊN (DÙNG MULTIPART FORMDATA CHUẨN)
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile || !projectId) return;

    setUploading(true);
    try {
      const headers = { Authorization: `Bearer ${getToken()}` };
      
      // Tìm task đầu tiên để gắn file vào
      const tasksRes = await fetch(`http://localhost:8085/api/tasks/project/${projectId}`, { headers });
      if (!tasksRes.ok) throw new Error("Không thể kiểm tra công việc");

      const tasks = await tasksRes.json();
      if (!Array.isArray(tasks) || tasks.length === 0) {
        alert("Vui lòng tạo ít nhất một công việc (Task) trong dự án trước khi tải tệp lên!");
        return;
      }

      const targetTaskId = tasks[0].id;
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch(`http://localhost:8085/api/tasks/${targetTaskId}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }, // Để trình duyệt tự động sinh Content-Type multipart
        body: formData
      });

      if (uploadRes.ok) {
        fetchProjectFiles();
      } else {
        alert("Tải tệp lên thất bại! Vui lòng kiểm tra quyền hạn.");
      }
    } catch (error) {
      console.error("Lỗi tải tệp:", error);
      alert("Đã xảy ra lỗi kết nối khi tải tệp.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (fileType = '') => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return <FileText size={24} className="text-red-500" />;
    if (type.includes('image') || type.includes('png') || type.includes('jpg')) return <ImageIcon size={24} className="text-blue-500" />;
    if (type.includes('doc') || type.includes('word')) return <FileText size={24} className="text-indigo-600" />;
    return <File size={24} className="text-gray-500" />;
  };

  const getInitials = (name) => {
    if (!name || name === "Ẩn danh") return <User size={12} />;
    return name.charAt(0).toUpperCase();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Vừa xong";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Vừa xong";
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`;
  };

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col bg-[#F9FAFB] overflow-y-auto relative font-sans">
      {(loading || uploading) && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
          <span className="text-gray-500 text-[13px] font-medium">
            {uploading ? "Đang tải tệp lên hệ thống..." : "Đang đồng bộ kho tài liệu..."}
          </span>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-[18px] font-bold text-gray-900">Tài liệu đính kèm</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">Tất cả tệp tin liên quan đến dự án</p>
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <UploadCloud size={16} /> Tải tệp lên
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.length > 0 ? (
          files.map((file) => (
            <div key={file.id} className="bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group relative flex flex-col p-4">
              <div className="absolute top-3 right-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 backdrop-blur rounded-md shadow-xs border border-gray-100">
                <a 
                  href={file.fileUrl || file.s3Key} 
                  target="_blank" 
                  rel="noreferrer" 
                  download={file.fileName}
                  className="p-1.5 hover:text-indigo-600 transition-colors cursor-pointer" 
                  title="Tải xuống"
                >
                  <Download size={14} />
                </a>
                <div className="w-[1px] h-3 bg-gray-200"></div>
                <button className="p-1.5 hover:text-gray-700 transition-colors cursor-pointer" title="Tùy chọn">
                  <MoreVertical size={14} />
                </button>
              </div>

              {/* Vùng trên: Icon và Tên File */}
              <div className="flex items-start gap-3 mb-4 pr-12">
                <div className="w-10 h-10 bg-gray-50/80 border border-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  {getFileIcon(file.fileType)}
                </div>
                <div className="flex flex-col overflow-hidden pt-0.5">
                  <h4 className="text-[14px] font-bold text-gray-800 line-clamp-2 leading-tight mb-1" title={file.fileName}>
                    {file.fileName}
                  </h4>
                  <span className="text-[11px] font-medium text-gray-400 bg-gray-50 w-max px-1.5 py-0.5 rounded">
                    {file.formattedSize}
                  </span>
                </div>
              </div>

              <div className="h-px w-full bg-gray-100 mb-3 mt-auto"></div>

              {/* Vùng dưới: Thông tin người tải và Task */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 overflow-hidden" title={`Đăng bởi: ${file.uploaderName}`}>
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                    {getInitials(file.uploaderName)}
                  </div>
                  <span className="text-[12px] text-gray-700 font-semibold truncate">
                    {file.uploaderName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-gray-400 pl-1" title="Thời gian tải lên">
                  <Clock size={12} className="shrink-0" />
                  <span className="text-[11px] font-medium">{formatDateTime(file.createdAt)}</span>
                </div>

                <div className="flex items-center mt-1">
                  <div className="flex items-center gap-1.5 bg-indigo-50/50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded-md text-[11px] font-medium truncate max-w-full w-max" title={`Thuộc Task ID: ${file.taskId}`}>
                    <Hash size={12} className="text-indigo-400" />
                    <span className="truncate">Task: {file.taskId ? file.taskId.substring(0, 8).toUpperCase() : "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          !loading && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-gray-200 dashed">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <FileText size={28} className="text-gray-300" />
              </div>
              <h3 className="text-[14px] font-bold text-gray-800 mb-1">Chưa có tài liệu</h3>
              <p className="text-[12px] text-gray-500 max-w-xs">
                Tải lên các tệp thiết kế, tài liệu yêu cầu hoặc hình ảnh liên quan đến dự án này.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ProjectFiles;