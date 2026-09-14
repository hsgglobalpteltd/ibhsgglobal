"use client";

import * as React from "react";
import {
  UserProfile,
  QuickDropFile,
  fetchQuickDropFiles,
  uploadQuickDropFile,
  deleteQuickDropFile,
} from "@/lib/api";
import {
  Upload,
  FolderUp,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
} from "lucide-react";

interface QuickDropModuleProps {
  profile?: UserProfile | null;
}

export function QuickDropModule({ profile }: QuickDropModuleProps) {
  const [files, setFiles] = React.useState<QuickDropFile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<{ current: number; total: number; filename: string } | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<"all" | "pdf" | "image" | "document" | "other">("all");
  const [previewFile, setPreviewFile] = React.useState<QuickDropFile | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [now, setNow] = React.useState(Date.now());

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);
  const dropZoneRef = React.useRef<HTMLDivElement>(null);

  const userEmail = profile?.email || "";
  const userName = profile?.name || "Staff";

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  // Keep countdown timer updated every minute
  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load files
  const loadFiles = React.useCallback(async (silent = false) => {
    if (!userEmail) {
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    try {
      const res = await fetchQuickDropFiles(userEmail);
      if (res.success && res.files) {
        // Strict sort: newest on top
        const sorted = [...res.files].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
        setFiles(sorted);
      }
    } catch (err: any) {
      console.error("Failed to load Quick Drop files:", err);
      if (!silent) showToast(err.message || "Failed to load files", "error");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [userEmail]);

  React.useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Process and upload a list of raw File objects
  const processUploadFiles = async (fileList: File[]) => {
    if (!fileList || fileList.length === 0) return;
    if (!userEmail) {
      showToast("Please sign in to upload files.", "error");
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    const total = fileList.length;

    for (let i = 0; i < total; i++) {
      const file = fileList[i];
      setUploadProgress({ current: i + 1, total, filename: file.name });
      try {
        const res = await uploadQuickDropFile(file, userName, userEmail);
        if (res.success && res.file) {
          successCount++;
          // Prepend newly uploaded file to state (newest on top)
          setFiles((prev) => [res.file, ...prev.filter((f) => f.id !== res.file.id)]);
        }
      } catch (uploadErr: any) {
        console.error(`Failed to upload ${file.name}:`, uploadErr);
        showToast(`Failed to upload ${file.name}: ${uploadErr.message || "Error"}`, "error");
      }
    }

    setIsUploading(false);
    setUploadProgress(null);
    if (successCount > 0) {
      showToast(`Successfully dropped ${successCount} file${successCount > 1 ? "s" : ""}!`, "success");
      loadFiles(true);
    }
  };

  // Helper to recursively traverse dropped folder items via FileSystem API
  const traverseFileTree = async (item: any, fileList: File[], path = ""): Promise<void> => {
    if (item.isFile) {
      return new Promise<void>((resolve) => {
        item.file((file: File) => {
          // Wrap with proper path name if needed
          const renamedFile = new File([file], path ? `${path}/${file.name}` : file.name, {
            type: file.type,
            lastModified: file.lastModified,
          });
          fileList.push(renamedFile);
          resolve();
        });
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      return new Promise<void>((resolve) => {
        const readEntries = () => {
          dirReader.readEntries(async (entries: any[]) => {
            if (entries.length === 0) {
              resolve();
            } else {
              for (const entry of entries) {
                await traverseFileTree(entry, fileList, path ? `${path}/${item.name}` : item.name);
              }
              readEntries();
            }
          });
        };
        readEntries();
      });
    }
  };

  // Handle Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only turn off if leaving outer container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const extractedFiles: File[] = [];

    if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === "function") {
      const promises: Promise<void>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = item.webkitGetAsEntry();
        if (entry) {
          promises.push(traverseFileTree(entry, extractedFiles));
        }
      }
      await Promise.all(promises);
      if (extractedFiles.length > 0) {
        await processUploadFiles(extractedFiles);
        return;
      }
    }

    // Fallback standard files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      await processUploadFiles(filesArray);
    }
  };

  // Handle Clipboard Paste (Ctrl + V anywhere)
  React.useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Ignore paste if focused on search input or form inputs
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }

      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        e.preventDefault();
        const pastedFiles: File[] = [];
        for (let i = 0; i < e.clipboardData.files.length; i++) {
          const file = e.clipboardData.files[i];
          let filename = file.name;
          if (!filename || filename === "image.png") {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
            filename = `Pasted_Screenshot_${timestamp}.png`;
          }
          const safeFile = new File([file], filename, { type: file.type || "image/png" });
          pastedFiles.push(safeFile);
        }
        showToast(`Pasting ${pastedFiles.length} file(s) from clipboard...`, "info");
        await processUploadFiles(pastedFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [userEmail, userName]);

  // Handle Delete
  const handleDelete = async (file: QuickDropFile) => {
    try {
      // Optimistic update
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setDeleteConfirmId(null);
      if (previewFile?.id === file.id) setPreviewFile(null);

      const res = await deleteQuickDropFile(file.id, userEmail);
      if (res.success) {
        showToast(`Deleted ${file.file_name}`, "info");
      }
    } catch (err: any) {
      console.error("Delete failed:", err);
      showToast(err.message || "Failed to delete file", "error");
      loadFiles(true);
    }
  };

  // Direct Download Trigger
  const handleDownload = async (file: QuickDropFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const link = document.createElement("a");
      link.href = file.file_url;
      link.download = file.file_name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloading ${file.file_name}...`, "info");
    } catch (err: any) {
      console.error("Download failed:", err);
      window.open(file.file_url, "_blank");
    }
  };

  // Copy Link
  const handleCopyLink = (file: QuickDropFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(file.file_url);
    showToast("File link copied to clipboard!", "success");
  };

  // Helper: format expiry countdown
  const getExpiryCountdown = (expiresAt: number) => {
    const diff = expiresAt - now;
    if (diff <= 0) return "Expired (Purging)";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours === 0) return `${mins}m left`;
    return `${hours}h ${mins}m left`;
  };

  const isExpiringSoon = (expiresAt: number) => {
    const diff = expiresAt - now;
    return diff > 0 && diff < 2 * 60 * 60 * 1000; // less than 2 hours
  };

  // Helper: format file size
  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Helper: format relative time
  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return "";
    const diff = now - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString("en-SG", { day: "2-digit", month: "short" });
  };

  // Category classifier
  const getFileCategory = (file: QuickDropFile): "pdf" | "image" | "document" | "other" => {
    const ext = file.file_name.split(".").pop()?.toLowerCase() || "";
    const mime = file.mime_type.toLowerCase();
    if (ext === "pdf" || mime.includes("pdf")) return "pdf";
    if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext) || mime.startsWith("image/")) return "image";
    if (["doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "txt"].includes(ext) || mime.includes("text") || mime.includes("spreadsheet") || mime.includes("word")) return "document";
    return "other";
  };

  // Filtered files
  const filteredFiles = React.useMemo(() => {
    return files.filter((f) => {
      const matchesSearch = f.file_name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;
      if (selectedCategory === "all") return true;
      return getFileCategory(f) === selectedCategory;
    });
  }, [files, searchQuery, selectedCategory]);

  const totalBytes = React.useMemo(() => {
    return files.reduce((acc, f) => acc + (f.file_size || 0), 0);
  }, [files]);

  return (
    <div
      className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Visual Drag-Over Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[#0B57D0]/10 border-2 border-dashed border-[#0B57D0] rounded-lg flex flex-col items-center justify-center pointer-events-none backdrop-blur-[2px]">
          <div className="p-4 bg-white rounded-2xl shadow-xl border border-blue-100 flex flex-col items-center gap-2">
            <Upload className="w-10 h-10 text-[#0B57D0] animate-bounce" />
            <span className="text-base font-bold text-zinc-900">Drop files or folder here</span>
            <span className="text-xs text-zinc-500">Files will be uploaded and kept for 24 hours</span>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">Quick Drop</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Temporary cross-device file transfer for your account • Files automatically purge after 24 hours.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadFiles()}
            disabled={isLoading}
            className="h-9 px-3 text-xs font-semibold text-zinc-700 bg-white border border-slate-200 rounded-lg hover:bg-zinc-50 flex items-center gap-1.5 transition-colors"
            title="Refresh file list"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          {/* Folder Drop Button */}
          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading}
            className="h-9 px-3.5 text-xs font-semibold text-zinc-800 bg-white border border-slate-300 rounded-lg hover:bg-zinc-50 active:scale-98 flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <FolderUp className="w-3.5 h-3.5 text-zinc-600" />
            <span>Drop Folder</span>
          </button>

          {/* Files Drop Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-9 px-4 text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] active:scale-98 rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-white" />
            <span>Drop Files</span>
          </button>

          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processUploadFiles(Array.from(e.target.files));
                e.target.value = "";
              }
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore
            webkitdirectory="true"
            directory=""
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processUploadFiles(Array.from(e.target.files));
                e.target.value = "";
              }
            }}
          />
        </div>
      </div>

      {/* 2. INSTANT DROP & PASTE DROPZONE BOX */}
      <div className="p-4 pb-2 shrink-0">
        <div
          ref={dropZoneRef}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-[#0B57D0]/60 bg-[#F8F9FA] hover:bg-[#F0F4F9]/60 rounded-lg p-3.5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 group-hover:text-[#0B57D0] transition-colors">
            <Upload className="w-4 h-4 text-zinc-500 group-hover:text-[#0B57D0]" />
            <span>Drag & drop files or folder here, or press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-zinc-700 shadow-2xs">Ctrl + V</kbd> to paste</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Supports PDFs, shipping labels, photos, documents, and folders • Account-isolated • 24h auto-expiry
          </p>
        </div>

        {/* Uploading progress bar */}
        {isUploading && uploadProgress && (
          <div className="mt-2.5 p-2.5 bg-blue-50/80 border border-blue-100 rounded-lg flex items-center justify-between gap-3 text-xs text-blue-900">
            <div className="flex items-center gap-2 min-w-0">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0B57D0] shrink-0" />
              <span className="font-semibold shrink-0">Uploading ({uploadProgress.current}/{uploadProgress.total}):</span>
              <span className="truncate text-zinc-600">{uploadProgress.filename}</span>
            </div>
            <span className="font-bold text-[#0B57D0] shrink-0">
              {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* 3. FILTER & STATS TOOLBAR */}
      <div className="px-4 py-2 border-y border-slate-200 bg-[#F8F9FA] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-[450px]">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "all", label: "All Files", count: files.length },
            { id: "pdf", label: "PDFs", count: files.filter((f) => getFileCategory(f) === "pdf").length },
            { id: "image", label: "Images", count: files.filter((f) => getFileCategory(f) === "image").length },
            { id: "document", label: "Docs", count: files.filter((f) => getFileCategory(f) === "document").length },
            { id: "other", label: "Others", count: files.filter((f) => getFileCategory(f) === "other").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`h-7 px-2.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all ${
                selectedCategory === tab.id
                  ? "bg-[#D3E3FD] text-[#041E49] font-bold"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 border border-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1 rounded-full ${selectedCategory === tab.id ? "bg-[#0B57D0] text-white" : "bg-zinc-100 text-zinc-500"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="text-xs text-zinc-500 flex items-center gap-2 shrink-0">
          <span className="font-semibold text-zinc-700">{filteredFiles.length} active</span>
          <span>•</span>
          <span>{formatFileSize(totalBytes)}</span>
          <span>•</span>
          <span className="text-[11px] text-zinc-400 italic">Sorted newest first</span>
        </div>
      </div>

      {/* 4. MAIN FILE GRID (1:1 ASPECT RATIO SQUARE CARDS) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {isLoading && files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0B57D0]" />
            <span className="text-xs">Loading your Quick Drop files...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border border-dashed border-slate-200 rounded-lg bg-[#F8F9FA] p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0B57D0] flex items-center justify-center mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">
              {searchQuery ? "No matching files found" : "No temporary files right now"}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mb-4">
              {searchQuery
                ? `No files match "${searchQuery}". Try clearing your search filter.`
                : "Drop files or folders above, or paste directly with Ctrl + V to access them from another computer."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3.5 text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded-lg transition-colors"
              >
                Drop First File
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
            {filteredFiles.map((file) => {
              const category = getFileCategory(file);
              const countdown = getExpiryCountdown(file.expires_at);
              const expiringSoon = isExpiringSoon(file.expires_at);
              const isDeleting = deleteConfirmId === file.id;

              return (
                <div
                  key={file.id}
                  onClick={() => setPreviewFile(file)}
                  className="group relative bg-white border border-slate-200 hover:border-[#0B57D0]/60 rounded-lg shadow-2xs hover:shadow-md transition-all duration-150 flex flex-col aspect-square overflow-hidden cursor-pointer"
                >
                  {/* Top Bar inside Card: Type Badge & Expiry Countdown */}
                  <div className="px-2.5 py-1.5 flex items-center justify-between gap-1 z-10 bg-white/90 backdrop-blur-xs border-b border-slate-100 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase ${
                        category === "pdf"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : category === "image"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : category === "document"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                      }`}
                    >
                      {file.file_name.split(".").pop() || "FILE"}
                    </span>

                    <span
                      className={`text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded-full ${
                        expiringSoon
                          ? "bg-amber-100 text-amber-900 animate-pulse font-bold"
                          : "bg-slate-100 text-zinc-600"
                      }`}
                      title={`Expires at: ${new Date(file.expires_at).toLocaleString()}`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      <span>{countdown}</span>
                    </span>
                  </div>

                  {/* Middle: Visual Thumbnail Preview */}
                  <div className="flex-1 min-h-0 flex items-center justify-center p-2 bg-[#F8F9FA]/60 group-hover:bg-[#F0F4F9]/40 transition-colors overflow-hidden relative">
                    {category === "image" ? (
                      <img
                        src={file.file_url}
                        alt={file.file_name}
                        className="w-full h-full object-contain rounded transition-transform group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : category === "pdf" ? (
                      <div className="flex flex-col items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
                        <FileText className="w-10 h-10 stroke-[1.5]" />
                        <span className="text-[10px] font-bold mt-1 text-zinc-500 uppercase">PDF Document</span>
                      </div>
                    ) : category === "document" ? (
                      <div className="flex flex-col items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        <FileText className="w-10 h-10 stroke-[1.5]" />
                        <span className="text-[10px] font-bold mt-1 text-zinc-500 uppercase">Document</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-500 group-hover:scale-110 transition-transform">
                        <FileIcon className="w-10 h-10 stroke-[1.5]" />
                        <span className="text-[10px] font-bold mt-1 text-zinc-500 uppercase">File</span>
                      </div>
                    )}

                    {/* Hover View overlay indicator */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="px-2 py-1 bg-white/95 rounded-md text-[11px] font-bold text-zinc-900 shadow-md flex items-center gap-1">
                        <Eye className="w-3 h-3 text-[#0B57D0]" /> Preview
                      </span>
                    </div>
                  </div>

                  {/* Bottom: File Name, Size & 2 Action Buttons (Download & Delete only) */}
                  <div
                    className="p-2 bg-white border-t border-slate-100 shrink-0 flex flex-col gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col">
                      <span
                        className="text-xs font-semibold text-zinc-900 truncate"
                        title={file.file_name}
                      >
                        {file.file_name}
                      </span>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-0.5">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>{formatRelativeTime(file.created_at)}</span>
                      </div>
                    </div>

                    {/* Strictly Two Action Buttons: Download & Delete */}
                    {isDeleting ? (
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-red-600">Delete file?</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(file)}
                            className="px-2 py-1 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-[10px] font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                        {/* Download Button */}
                        <button
                          onClick={(e) => handleDownload(file, e)}
                          className="h-6 px-2 text-[11px] font-semibold text-zinc-700 bg-[#F0F4F9] hover:bg-[#D3E3FD] hover:text-[#041E49] rounded flex items-center justify-center gap-1 transition-colors"
                          title="Download to PC"
                        >
                          <Download className="w-3 h-3 text-[#0B57D0]" />
                          <span>Download</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(file.id);
                          }}
                          className="h-6 px-2 text-[11px] font-semibold text-zinc-600 bg-white hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-200 rounded flex items-center justify-center gap-1 transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="w-3 h-3 text-zinc-400 hover:text-red-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. IN-MODAL PREVIEW DIALOG */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-zinc-950 truncate" title={previewFile.file_name}>
                  {previewFile.file_name}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                  <span>{formatFileSize(previewFile.file_size)}</span>
                  <span>•</span>
                  <span>Uploaded {formatRelativeTime(previewFile.created_at)}</span>
                  <span>•</span>
                  <span className="text-[#0B57D0] font-semibold">⏳ {getExpiryCountdown(previewFile.expires_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleCopyLink(previewFile, e)}
                  className="h-8 px-2.5 text-xs font-semibold text-zinc-700 bg-white border border-slate-200 rounded-lg hover:bg-zinc-50 flex items-center gap-1.5 transition-colors"
                  title="Copy direct file URL"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy Link</span>
                </button>

                <button
                  onClick={(e) => handleDownload(previewFile, e)}
                  className="h-8 px-3 text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => setPreviewFile(null)}
                  className="w-8 h-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content Preview Viewport */}
            <div className="flex-1 min-h-[360px] bg-zinc-900 flex items-center justify-center overflow-auto p-4">
              {getFileCategory(previewFile) === "image" ? (
                <img
                  src={previewFile.file_url}
                  alt={previewFile.file_name}
                  className="max-h-[70vh] max-w-full object-contain rounded shadow-lg"
                />
              ) : getFileCategory(previewFile) === "pdf" ? (
                <iframe
                  src={previewFile.file_url}
                  title={previewFile.file_name}
                  className="w-full h-[70vh] bg-white rounded border-0 shadow-lg"
                />
              ) : (
                <div className="text-center p-8 bg-zinc-800 rounded-xl border border-zinc-700 max-w-md">
                  <FileIcon className="w-16 h-16 text-zinc-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-white mb-1">{previewFile.file_name}</p>
                  <p className="text-xs text-zinc-400 mb-4">Direct preview is not available for this file type.</p>
                  <button
                    onClick={(e) => handleDownload(previewFile, e)}
                    className="h-9 px-4 text-xs font-semibold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded-lg inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Download to View
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div
            className={`px-4 py-2.5 rounded-lg shadow-lg border text-xs font-semibold flex items-center gap-2 ${
              toastMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : toastMessage.type === "error"
                ? "bg-red-50 border-red-200 text-red-900"
                : "bg-zinc-900 border-zinc-800 text-white"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : toastMessage.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-red-600" />
            ) : (
              <Clock className="w-4 h-4 text-blue-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
