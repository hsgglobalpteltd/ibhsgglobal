"use client";

import * as React from "react";
import { 
  Folder, 
  FolderPlus, 
  File as FileIcon, 
  FileImage, 
  FileText, 
  FileVideo, 
  ChevronRight, 
  Upload, 
  Plus, 
  Loader2, 
  Download, 
  ExternalLink, 
  RefreshCw,
  X,
  Trash2
} from "lucide-react";
import { CustomButton } from "../custom-button";
import { showToast } from "@/lib/toast";
import { ConfirmDialog } from "../confirm-dialog";
import { fetchAssets, createAssetFolder, uploadAssetFile, deleteAssetFile, AssetFile } from "@/lib/api";

interface AssetLibraryModuleProps {
  profile?: any;
  idToken?: string;
}

export function AssetLibraryModule({ profile, idToken }: AssetLibraryModuleProps) {
  const [folders, setFolders] = React.useState<AssetFile[]>([]);
  const [files, setFiles] = React.useState<AssetFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentFolderId, setCurrentFolderId] = React.useState<string>("");
  const [breadcrumbs, setBreadcrumbs] = React.useState<{ id: string; name: string }[]>([
    { id: "", name: "Asset Root" }
  ]);

  // Keep a ref of currentFolderId to prevent stale closure in async callbacks
  const currentFolderIdRef = React.useRef<string>("");
  React.useEffect(() => {
    currentFolderIdRef.current = currentFolderId;
  }, [currentFolderId]);

  // Modal and Upload states
  const [newFolderModalOpen, setNewFolderModalOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState("");
  const [dragActive, setDragActive] = React.useState(false);

  // Delete confirm states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [fileToDelete, setFileToDelete] = React.useState<{ id: string; name: string } | null>(null);

  // Load assets from Google Drive (with debounced loader to prevent flashing)
  const loadAssets = React.useCallback(async (folderId: string, skipCache = false) => {
    // Show loading indicator only if the fetch takes longer than 200ms
    const loadingTimer = setTimeout(() => {
      setLoading(true);
    }, 200);

    try {
      const response = await fetchAssets(folderId, skipCache);
      setFolders(response.folders || []);
      setFiles(response.files || []);

      // If we loaded the root (folderId is empty), update breadcrumbs with the real parentId
      if (!folderId && response.parentId) {
        setBreadcrumbs([{ id: response.parentId, name: "Asset Root" }]);
        setCurrentFolderId(response.parentId);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load library assets", "error");
    } finally {
      clearTimeout(loadingTimer);
      setLoading(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    loadAssets("");
  }, [loadAssets]);

  // Global db-refresh listener
  React.useEffect(() => {
    const handleDbRefresh = () => {
      loadAssets(currentFolderId, true);
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, [currentFolderId, loadAssets]);

  // Activity-based auto-refresh (3-minute debounce/click trigger)
  const lastRefreshTimeRef = React.useRef<number>(Date.now());

  // Update timestamp when a refresh occurs (manual or automatic)
  React.useEffect(() => {
    const handleDbRefreshTime = () => {
      lastRefreshTimeRef.current = Date.now();
    };
    window.addEventListener("db-refresh", handleDbRefreshTime);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefreshTime);
    };
  }, []);

  const handleModuleClick = React.useCallback(() => {
    const timeSinceLastRefresh = Date.now() - lastRefreshTimeRef.current;
    if (timeSinceLastRefresh >= 3 * 60 * 1000) { // 3 minutes
      const globalRefreshBtn = document.getElementById("global-refresh-button");
      if (globalRefreshBtn) {
        globalRefreshBtn.click();
        lastRefreshTimeRef.current = Date.now(); // update immediately to prevent spam click issues
      }
    }
  }, []);

  // Folder navigation
  const handleFolderClick = (folder: AssetFile) => {
    const nextBreadcrumbs = [...breadcrumbs, { id: folder.id, name: folder.name }];
    setBreadcrumbs(nextBreadcrumbs);
    setCurrentFolderId(folder.id);
    setFolders([]); // Clear immediately for instant visual feedback
    setFiles([]);   // Clear immediately for instant visual feedback
    loadAssets(folder.id);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === breadcrumbs.length - 1) return;
    const nextBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(nextBreadcrumbs);
    const targetFolderId = nextBreadcrumbs[index].id;
    setCurrentFolderId(targetFolderId);
    setFolders([]); // Clear immediately for instant visual feedback
    setFiles([]);   // Clear immediately for instant visual feedback
    loadAssets(targetFolderId);
  };

  // Create folder action
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setLoading(true);
    setNewFolderModalOpen(false);
    try {
      await createAssetFolder(newFolderName.trim(), currentFolderId);
      showToast(`Folder "${newFolderName}" created successfully!`, "success");
      setNewFolderName("");
      loadAssets(currentFolderId, true);
    } catch (err: any) {
      showToast(err.message || "Failed to create folder", "error");
      setLoading(false);
    }
  };

  // File upload logic
  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress(`Uploading ${i + 1}/${fileList.length}: ${file.name}...`);
        await uploadAssetFile(file, currentFolderId);
      }
      showToast("All files uploaded successfully!", "success");
      loadAssets(currentFolderId, true);
    } catch (err: any) {
      showToast(err.message || "Failed to upload file(s)", "error");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  // Delete file handlers (Optimistic UI & Silent Background Sync)
  const handleDeleteClick = (fileId: string, fileName: string) => {
    setFileToDelete({ id: fileId, name: fileName });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    const { id: fileId, name: fileName } = fileToDelete;

    // 1. Optimistic UI update: Save original and update state instantly
    const originalFiles = [...files];
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    showToast(`Deleting "${fileName}"...`, "info");

    const folderIdToRefresh = currentFolderIdRef.current;

    try {
      await deleteAssetFile(fileId);
      showToast(`File "${fileName}" deleted successfully!`, "success");
      
      // Fetch fresh data silently in the background using the correct folder ID
      const response = await fetchAssets(folderIdToRefresh, true);
      setFolders(response.folders || []);
      setFiles(response.files || []);
    } catch (err: any) {
      // 3. Rollback on failure
      setFiles(originalFiles);
      showToast(`Failed to delete file: ${err.message || "Network error"}`, "error");
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Utilities
  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <FileImage className="w-8 h-8 text-blue-500" />;
    }
    if (mimeType.startsWith("video/")) {
      return <FileVideo className="w-8 h-8 text-purple-500" />;
    }
    if (mimeType === "application/pdf") {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (
      mimeType.includes("spreadsheet") || 
      mimeType.includes("excel") || 
      mimeType.includes("csv") ||
      mimeType.includes("sheet")
    ) {
      return <FileText className="w-8 h-8 text-emerald-500" />;
    }
    return <FileIcon className="w-8 h-8 text-zinc-400" />;
  };

  return (
    <div 
      className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] font-primary w-full select-none"
      onDragEnter={handleDrag}
      onClick={handleModuleClick}
    >
      {/* Action Bar */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="content-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 rounded-lg p-4 shadow-xs"
      >
        {/* Breadcrumbs Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-zinc-800">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id || idx}>
              {idx > 0 && <ChevronRight className="w-4 h-4 text-zinc-400" />}
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(idx)}
                className={`hover:text-zinc-950 transition-colors focus:outline-none cursor-pointer ${
                  idx === breadcrumbs.length - 1 ? "text-zinc-950 font-bold" : "text-zinc-500"
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold pr-1.5 select-none animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B57D0]" />
              <span className="text-[#0B57D0]">Syncing...</span>
            </div>
          )}
          <CustomButton 
            onClick={() => setNewFolderModalOpen(true)}
            disabled={loading || uploading}
            className="bg-[#C2E7FF] border-[#C2E7FF] text-[#001D35] hover:bg-[#B3DBF2] rounded px-4 shadow-xs"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#001D35]" />
            <span>New Folder</span>
          </CustomButton>

          <label className="h-8 px-4 text-xs font-bold rounded border shadow-xs flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer bg-[#0B57D0] border-[#0B57D0] text-white hover:bg-[#0842A0] disabled:opacity-50 disabled:pointer-events-none">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
            <input 
              type="file" 
              multiple 
              onChange={(e) => handleFiles(e.target.files)}
              disabled={loading || uploading}
              className="hidden" 
            />
          </label>
        </div>
      </div>

      {/* Main Files Display & Drag-Drop overlay */}
      <div 
        className="content-body relative bg-white border border-slate-200 rounded-lg p-6 shadow-xs flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {/* Loading Spinner - Removed to support non-blocking background loading */}

        {/* Uploading Overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-25 rounded-lg text-white">
            <div className="flex flex-col items-center gap-3 max-w-sm px-6 text-center animate-pulse">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
              <span className="text-sm font-bold">{uploadProgress}</span>
              <p className="text-[10px] text-zinc-300">Uploading assets to the library. Please do not close this window.</p>
            </div>
          </div>
        )}

        {/* Drag Over Active Overlay */}
        {dragActive && (
          <div className="absolute inset-0 border-2 border-dashed border-zinc-500 bg-zinc-200/80 backdrop-blur-xs flex items-center justify-center z-20 rounded-lg">
            <div className="flex flex-col items-center gap-2 pointer-events-none">
              <Upload className="w-10 h-10 text-zinc-600 animate-bounce" />
              <span className="text-sm font-bold text-zinc-700">Drop files to upload here</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && folders.length === 0 && files.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-2">
            <Folder className="w-12 h-12 text-zinc-400 stroke-[1.5]" />
            <span className="text-sm font-bold text-zinc-700">This folder is empty</span>
            <p className="text-xs text-zinc-500 max-w-xs leading-normal">
              Click **Upload File**, or drag and drop items here to save them to this folder.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 flex-1">
            {/* Folders Section */}
            {folders.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Folders</span>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFolderClick(folder);
                      }}
                      className="bg-[#F0F4F9] border border-transparent rounded-lg p-3.5 flex items-center gap-3 hover:bg-[#D3E3FD] hover:shadow-xs transition-all cursor-pointer group select-none h-12"
                    >
                      <Folder className="w-5 h-5 text-amber-500 fill-amber-100 group-hover:fill-amber-200 shrink-0" />
                      <span className="text-xs font-bold text-zinc-800 truncate group-hover:text-zinc-950 flex-1">
                        {folder.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files Section */}
            {files.length > 0 && (
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Files</span>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-[#F0F4F9] border border-transparent rounded-lg flex flex-col justify-between hover:bg-[#E0E8F6] hover:shadow-xs transition-all select-none group relative overflow-hidden"
                    >
                      {/* File Preview Thumbnail (for images) or File Icon */}
                      <div className="relative aspect-square w-full bg-zinc-50 border-b border-slate-200 flex items-center justify-center overflow-hidden rounded-t-lg">
                        {file.mimeType.startsWith("image/") ? (
                          <img
                            src={`https://drive.google.com/thumbnail?id=${file.id}&sz=w300`}
                            alt={file.name}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4">
                            {getFileIcon(file.mimeType)}
                          </div>
                        )}
                        
                        {/* Actions overlay on card hover */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-zinc-950/85 backdrop-blur-xs rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md border border-zinc-800">
                          {file.downloadUrl && (
                            <a
                              href={file.downloadUrl}
                              download={file.name}
                              title="Download Asset"
                              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {file.url && (
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View Asset"
                              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {(profile?.role === "Administrator" || profile?.role === "Manager") && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(file.id, file.name)}
                              title="Delete Asset"
                              className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* File details footer */}
                      <div className="p-3.5 flex flex-col gap-0.5 bg-[#F0F4F9] group-hover:bg-[#E0E8F6] transition-colors shrink-0 rounded-b-lg">
                        <span 
                          className="text-xs font-bold text-zinc-800 group-hover:text-zinc-950 truncate"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                        <span className="text-[10px] font-medium text-zinc-500">
                          {formatBytes(file.size)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {newFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-tableFadeInOnly">
          <form
            onSubmit={handleCreateFolderSubmit}
            className="w-full max-w-sm bg-[#E5E5E5] border border-zinc-300 rounded-lg shadow-xl overflow-hidden flex flex-col font-primary"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-300 bg-[#EEEEEE]">
              <h3 className="text-sm font-bold text-zinc-950">Create New Folder</h3>
              <button 
                type="button" 
                onClick={() => {
                  setNewFolderModalOpen(false);
                  setNewFolderName("");
                }}
                className="text-zinc-400 hover:text-zinc-800 rounded-md p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Folder Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  className="h-9 px-3 bg-[#EEEEEE] border border-zinc-300 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400/20 font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 px-5 py-3.5 bg-[#EEEEEE] border-t border-zinc-300">
              <button
                type="button"
                onClick={() => {
                  setNewFolderModalOpen(false);
                  setNewFolderName("");
                }}
                className="h-8 px-4 text-xs font-bold rounded border border-zinc-300 bg-[#E5E5E5] text-zinc-700 hover:text-zinc-950 hover:bg-[#EEEEEE]/50 cursor-pointer"
              >
                Cancel
              </button>
              <CustomButton variant="dark" type="submit" className="h-8 text-xs">
                Create
              </CustomButton>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete File"
        description={`Are you sure you want to delete "${fileToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        variant="danger"
      />
    </div>
  );
}
