import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useEvent, EVENTS } from "../../hooks/useEventBus";
import { useParams } from "react-router-dom";
import apiClient from "../../utils/apiClient";
import {
  UploadCloud, FileText, Image as ImageIcon, File, Download,
  Trash2, Loader2, User, Clock, Hash, X, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { usePreferences } from "../../hooks/usePreferences";
import { getAccent } from "../../utils/preferenceTokens";

const ProjectFiles = () => {
  const { projectId } = useParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    file: null,
    blobUrl: null,
    isUnsupported: false,
    loading: false,
  });

  const fileInputRef = useRef(null);

  const { accent } = usePreferences();
  const A = getAccent(accent);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const fetchProjectFiles = useCallback(async () => {
    if (!projectId) return;
    try {
      const tasksRes = await apiClient.get(`http://localhost:8085/api/tasks/project/${projectId}`);
      const tasks = tasksRes.data;
      if (!Array.isArray(tasks) || tasks.length === 0) {
        setFiles([]);
        return;
      }

      const attachmentPromises = tasks.map(async (task) => {
        try {
          const attRes = await apiClient.get(`http://localhost:8085/api/tasks/${task.id}/attachments`);
          const atts = attRes.data;
          return atts.map((att) => ({
            ...att,
            taskId: task.id,
            uploaderName: att.userName || att.uploaderName || "Thành viên",
            formattedSize: formatFileSize(att.fileSize),
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

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchProjectFiles();
  }, [projectId, fetchProjectFiles]);

  useEvent(EVENTS.TASK, (data) => { if (String(data.projectId) === String(projectId)) fetchProjectFiles(); });
  useEvent(EVENTS.ATTACHMENT, (data) => { if (String(data.projectId) === String(projectId)) fetchProjectFiles(); });

  const closePreviewModal = useCallback(() => {
    setPreviewModal((prev) => {
      if (prev.blobUrl) window.URL.revokeObjectURL(prev.blobUrl);
      return { isOpen: false, file: null, blobUrl: null, isUnsupported: false, loading: false };
    });
  }, []);

  const handleOpenFile = async (file) => {
    const isImage =
      file.fileType?.includes("image") ||
      /\.(png|jpe?g|gif|webp|svg)$/i.test(file.fileName);
    const isPdf =
      file.fileType?.includes("pdf") || /\.pdf$/i.test(file.fileName);

    if (!isImage && !isPdf) {
      setPreviewModal({ isOpen: true, file, blobUrl: null, isUnsupported: true, loading: false });
      return;
    }

    setPreviewModal({ isOpen: true, file, blobUrl: null, isUnsupported: false, loading: true });

    try {
      const rawUrl = file.fileUrl || "";
      const fullUrl = rawUrl.startsWith("http")
        ? rawUrl
        : `http://localhost:8085${rawUrl}`;

      const res = await apiClient.get(fullUrl, { responseType: "blob" });
      const typedBlob = new Blob([res.data], {
        type: file.fileType || (isPdf ? "application/pdf" : "image/png"),
      });
      const blobUrl = window.URL.createObjectURL(typedBlob);
      setPreviewModal((prev) => ({ ...prev, blobUrl, loading: false }));
    } catch (err) {
      console.error("Lỗi xem file:", err);
      toast.error(err.message || "Không thể tải nội dung tệp để xem!");
      closePreviewModal();
    }
  };

  useEffect(() => {
    if (previewModal.isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [previewModal.isOpen]);

  const handleDownloadFile = async (fileUrl, fileName) => {
    if (!fileUrl) {
      toast.error("Đường dẫn tệp không tồn tại!");
      return;
    }
    const fullUrl = fileUrl.startsWith("http") ? fileUrl : `http://localhost:8085${fileUrl}`;
    const downloadUrl = fullUrl.includes("?download=true") ? fullUrl : `${fullUrl}?download=true`;

    const downloadToastId = toast.loading("Đang chuẩn bị tệp tải về...");

    try {
      const res = await apiClient.get(downloadUrl, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "tai-lieu";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success("Tải tệp thành công!", { id: downloadToastId });
    } catch (err) {
      console.error("Lỗi download file:", err);
      toast.error(err.message || "Tải tệp về máy thất bại!", { id: downloadToastId });
    }
  };

  const handleDeleteFile = async (taskId, fileId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tệp đính kèm này không?")) return;

    try {
      await apiClient.delete(`http://localhost:8085/api/tasks/${taskId}/attachments/${fileId}`);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success("Đã xóa tệp đính kèm!");
    } catch (err) {
      console.error("Lỗi khi xóa tệp:", err);
      toast.error(err.response?.data?.message || err.message || "Đã xảy ra lỗi khi xóa tệp!");
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile || !projectId) return;

    setUploading(true);
    const uploadToastId = toast.loading(`Đang tải lên "${selectedFile.name}"...`);

    try {
      const tasksRes = await apiClient.get(`http://localhost:8085/api/tasks/project/${projectId}`);
      const tasks = tasksRes.data;

      if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new Error("Dự án chưa có Task nào. Hãy tạo Task trước khi đính kèm tệp!");
      }

      const targetTaskId = tasks[0].id;
      const formData = new FormData();
      formData.append("file", selectedFile);

      await apiClient.post(
        `http://localhost:8085/api/tasks/${targetTaskId}/attachments`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      toast.success("Tải tệp lên thành công!", { id: uploadToastId });
      fetchProjectFiles();
    } catch (error) {
      console.error("Lỗi tải tệp:", error);
      toast.error(error.message || "Đã xảy ra sự cố khi tải tệp lên!", { id: uploadToastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (fileType = "") => {
    const type = fileType.toLowerCase();
    if (type.includes("pdf")) return <FileText size={24} className="text-red-500" />;
    if (type.includes("image") || type.includes("png") || type.includes("jpg"))
      return <ImageIcon size={24} className="text-blue-500" />;
    if (type.includes("doc") || type.includes("word"))
      return <FileText size={24} className={A.icon} />;
    return <File size={24} className="text-gray-500 dark:text-gray-400" />;
  };

  const getInitials = (name) => {
    if (!name || name === "Ẩn danh") return <User size={12} />;
    return name.charAt(0).toUpperCase();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Vừa xong";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Vừa xong";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`;
  };

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col bg-[#F9FAFB] dark:bg-gray-900 overflow-y-auto relative font-sans transition-colors">
      {(loading || uploading) && (
        <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 z-50 flex flex-col items-center justify-center">
          <Loader2 className={`animate-spin mb-2 ${A.text}`} size={32} />
          <span className="text-gray-500 dark:text-gray-400 text-[13px] font-medium">
            {uploading ? "Đang tải tệp lên hệ thống..." : "Đang đồng bộ kho tài liệu..."}
          </span>
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-[18px] font-bold text-gray-900 dark:text-white">
            Tài liệu đính kèm
          </h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            Tất cả tệp tin liên quan đến dự án
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`disabled:opacity-50 text-white px-4 py-2 rounded-lg text-[13px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer ${A.solidBg}`}
        >
          <UploadCloud size={16} /> Tải tệp lên
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.length > 0
          ? files.map((file) => (
              <div
                key={file.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group relative flex flex-col p-4 hover:${A.border}`}
              >
                {/* Actions */}
                <div className="absolute top-3 right-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-gray-800 rounded-md shadow-xs border border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(file.fileUrl, file.fileName)}
                    className={`p-1.5 transition-colors cursor-pointer ${A.textHover}`}
                    title="Tải về máy"
                  >
                    <Download size={14} />
                  </button>
                  <div className="w-[1px] h-3 bg-gray-200 dark:bg-gray-700"></div>
                  <button
                    type="button"
                    onClick={() => handleDeleteFile(file.taskId, file.id)}
                    className="p-1.5 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                    title="Xóa tệp"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Icon + Tên */}
                <div className="flex items-start gap-3 mb-4 pr-12">
                  <div
                    onClick={() => handleOpenFile(file)}
                    className={`w-10 h-10 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors ${A.softHoverBg}`}
                    title="Bấm để xem tệp"
                  >
                    {getFileIcon(file.fileType)}
                  </div>
                  <div className="flex flex-col overflow-hidden pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleOpenFile(file)}
                      className={`text-left text-[14px] font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight mb-1 cursor-pointer transition-colors ${A.textHover}`}
                      title={`Xem trực tiếp ${file.fileName}`}
                    >
                      {file.fileName}
                    </button>
                    <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 w-max px-1.5 py-0.5 rounded">
                      {file.formattedSize}
                    </span>
                  </div>
                </div>

                <div className="h-px w-full bg-gray-100 dark:bg-gray-700 mb-3 mt-auto"></div>

                {/* Uploader */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 overflow-hidden" title={`Đăng bởi: ${file.uploaderName}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold shrink-0 bg-gradient-to-tr ${A.headerGradient} to-purple-500`}>
                      {getInitials(file.uploaderName)}
                    </div>
                    <span className="text-[12px] text-gray-700 dark:text-gray-300 font-semibold truncate">
                      {file.uploaderName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 pl-1" title="Thời gian tải lên">
                    <Clock size={12} className="shrink-0" />
                    <span className="text-[11px] font-medium">{formatDateTime(file.createdAt)}</span>
                  </div>

                  <div className="flex items-center mt-1">
                    <div
                      className={`flex items-center gap-1.5 border px-2 py-1 rounded-md text-[11px] font-medium truncate max-w-full w-max ${A.softBg} ${A.border} ${A.textStrong}`}
                      title={`Thuộc Task ID: ${file.taskId}`}
                    >
                      <Hash size={12} className={A.icon} />
                      <span className="truncate">
                        Task: {file.taskId ? file.taskId.substring(0, 8).toUpperCase() : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          : !loading && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-3">
                  <FileText size={28} className="text-gray-300 dark:text-gray-600" />
                </div>
                <h3 className="text-[14px] font-bold text-gray-800 dark:text-gray-100 mb-1">
                  Chưa có tài liệu
                </h3>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 max-w-xs">
                  Tải lên các tệp thiết kế, tài liệu yêu cầu hoặc hình ảnh liên quan đến dự án này.
                </p>
              </div>
            )}
      </div>

      {/* PORTAL MODAL */}
      {previewModal.isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl h-[85vh] rounded-xl flex flex-col shadow-xl overflow-hidden will-change-transform">
              <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-2 overflow-hidden mr-4">
                  <FileText size={18} className={`shrink-0 ${A.icon}`} />
                  <span className="text-[14px] font-bold text-gray-800 dark:text-gray-100 truncate" title={previewModal.file?.fileName}>
                    {previewModal.file?.fileName}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(previewModal.file?.fileUrl, previewModal.file?.fileName)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer ${A.softBg} ${A.text} ${A.softHoverBg}`}
                  >
                    <Download size={14} /> Tải về
                  </button>
                  <button
                    type="button"
                    onClick={closePreviewModal}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4 overflow-hidden relative">
                {previewModal.loading && (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={32} className={`animate-spin ${A.text}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Đang nạp dữ liệu...</span>
                  </div>
                )}

                {!previewModal.loading && previewModal.isUnsupported && (
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 max-w-md text-center flex flex-col items-center shadow-xs">
                    <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                      <AlertCircle size={24} />
                    </div>
                    <h4 className="text-[15px] font-bold text-gray-800 dark:text-gray-100 mb-1">
                      Không hỗ trợ xem trực tiếp
                    </h4>
                    <p className="text-[12.5px] text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                      Định dạng tệp này không thể dựng trực tiếp trên trình duyệt web. Nếu bạn muốn mở trên máy, hãy bấm nút <b>Tải về</b> ở góc trên.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(previewModal.file?.fileUrl, previewModal.file?.fileName)}
                      className={`text-white px-4 py-2 rounded-lg text-[12px] font-semibold flex items-center gap-2 transition-colors cursor-pointer ${A.solidBg}`}
                    >
                      <Download size={15} /> Tải về máy ngay
                    </button>
                  </div>
                )}

                {!previewModal.loading &&
                  !previewModal.isUnsupported &&
                  previewModal.blobUrl &&
                  previewModal.file?.fileType?.includes("image") && (
                    <img
                      src={previewModal.blobUrl}
                      alt={previewModal.file?.fileName}
                      className="max-w-full max-h-full object-contain rounded shadow-sm"
                    />
                  )}

                {!previewModal.loading &&
                  !previewModal.isUnsupported &&
                  previewModal.blobUrl &&
                  previewModal.file?.fileType?.includes("pdf") && (
                    <iframe
                      src={previewModal.blobUrl}
                      title={previewModal.file?.fileName}
                      className="w-full h-full rounded border-0 bg-white"
                    />
                  )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ProjectFiles;