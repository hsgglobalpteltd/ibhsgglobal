"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { NavigationTabs } from "../navigation-tabs";
import { CustomButton } from "../custom-button";

import { 
  fetchLatestContract, 
  adminUpdateContract,
  fetchConsoleContexts,
  saveConsoleContext,
  deleteConsoleContext,
  ConsoleContextItem
} from "@/lib/api";
import { APP_PAGES_CONFIG } from "@/config/modules-config";
import { fetchMaintenanceSettings, saveModuleUnderConstruction, saveAllUnderConstructionModules } from "@/lib/maintenance";
import { Search, Construction, CheckCircle2, SlidersHorizontal, BookOpen, Plus, Trash2, Edit3, Tag } from "lucide-react";

interface SettingModuleProps {
  profile?: {
    role: string;
  } | null;
  idToken?: string;
}

const apiColumns: Column[] = [
  { id: 'id', header: 'id', accessor: 'id' },
  { id: "Name", header: "API Name", accessor: "Name" },
  { id: "Key", header: "API Key", accessor: "Key" }
];

export function SettingModule({ profile, idToken }: SettingModuleProps) {
  const tabs = [
    { id: "configuration", label: "Configuration", desc: "System parameters and configurations." },
    { id: "console_context", label: "Console Context", desc: "Manage AI context knowledge, operational rules, and keywords for the briefing console." },
    { id: "under_construction", label: "Under Construction", desc: "Control module availability and toggle under construction status." },
    { id: "api", label: "API", desc: "Manage API integrations and secure credentials." }
  ];

  const [activeTab, setActiveTab] = React.useState<"configuration" | "console_context" | "under_construction" | "api">("configuration");
  const [data, setData] = React.useState<any[]>([]);
  const [fetching, setFetching] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editingApi, setEditingApi] = React.useState<any | null>(null);

  // Console Contexts state
  const [contexts, setContexts] = React.useState<ConsoleContextItem[]>([]);
  const [contextsLoading, setContextsLoading] = React.useState(false);
  const [contextSearch, setContextSearch] = React.useState("");
  const [editingContext, setEditingContext] = React.useState<Partial<ConsoleContextItem> | null>(null);
  const [isSavingContext, setIsSavingContext] = React.useState(false);

  // Under construction state
  const [moduleMaintenance, setModuleMaintenance] = React.useState<Record<string, boolean>>({});
  const [maintenanceLoading, setMaintenanceLoading] = React.useState(false);
  const [searchFilter, setSearchFilter] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");

  // Contract upload states
  const [contractText, setContractText] = React.useState<string>("");
  const [contractUpdatedAt, setContractUpdatedAt] = React.useState<number>(0);
  const [selectedFileContent, setSelectedFileContent] = React.useState<string>("");
  const [fileName, setFileName] = React.useState<string>("");
  const [uploadingContract, setUploadingContract] = React.useState<boolean>(false);
  const [showPreview, setShowPreview] = React.useState<boolean>(false);
  const [showUpload, setShowUpload] = React.useState<boolean>(false);

  const loadContexts = React.useCallback(async () => {
    setContextsLoading(true);
    try {
      const res = await fetchConsoleContexts();
      if (res.success && Array.isArray(res.contexts)) {
        setContexts(res.contexts);
      }
    } catch (err: any) {
      console.error("Failed to load console contexts:", err);
    } finally {
      setContextsLoading(false);
    }
  }, []);

  const loadContract = React.useCallback(async () => {
    try {
      const contract = await fetchLatestContract();
      setContractText(contract.text || "");
      setContractUpdatedAt(contract.updated_at || 0);
    } catch (err: any) {
      console.error("Failed to load contract:", err);
    }
  }, []);

  const loadMaintenance = React.useCallback(async () => {
    setMaintenanceLoading(true);
    try {
      const settings = await fetchMaintenanceSettings();
      setModuleMaintenance(settings.moduleMaintenance || {});
    } catch (err: any) {
      console.error("Failed to load maintenance settings:", err);
    } finally {
      setMaintenanceLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === "configuration") {
      loadContract();
    } else if (activeTab === "console_context") {
      loadContexts();
    } else if (activeTab === "under_construction") {
      loadMaintenance();
    }
  }, [activeTab, loadContract, loadContexts, loadMaintenance]);

  const handleSaveContext = async (contextData: Partial<ConsoleContextItem>) => {
    setIsSavingContext(true);
    try {
      const res = await saveConsoleContext(contextData);
      if (res.success) {
        showToast("Console context saved successfully!", "success");
        setEditingContext(null);
        loadContexts();
      } else {
        showToast("Failed to save context", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save context", "error");
    } finally {
      setIsSavingContext(false);
    }
  };

  const handleDeleteContext = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete context "${title}"?`)) return;
    try {
      const res = await deleteConsoleContext(id);
      if (res.success) {
        showToast("Context deleted successfully", "success");
        setContexts((prev) => prev.filter((c) => c.id !== id));
      } else {
        showToast("Failed to delete context", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete context", "error");
    }
  };

  const filteredContexts = React.useMemo(() => {
    if (!contextSearch.trim()) return contexts;
    const q = contextSearch.toLowerCase();
    return contexts.filter((c) => {
      const titleMatch = c.title?.toLowerCase().includes(q);
      const kwMatch = Array.isArray(c.keywords) && c.keywords.some((kw) => kw.toLowerCase().includes(q));
      const detailMatch = c.detail_context?.toLowerCase().includes(q);
      return titleMatch || kwMatch || detailMatch;
    });
  }, [contexts, contextSearch]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/plain" && !file.name.endsWith(".txt")) {
      showToast("Only .txt files are allowed", "error");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setSelectedFileContent(text || "");
    };
    reader.readAsText(file);
  };

  const handleUpdateContract = async () => {
    if (!selectedFileContent.trim()) {
      showToast("Please upload a valid .txt file first", "warning");
      return;
    }

    setUploadingContract(true);
    try {
      const myToken = idToken || "simulated-id-token";
      const res = await adminUpdateContract(myToken, selectedFileContent);
      if (res.success) {
        showToast("Contract updated successfully! All users will be prompted to sign this new contract.", "success");
        setContractText(selectedFileContent);
        setContractUpdatedAt(res.updated_at);
        setSelectedFileContent("");
        setFileName("");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update contract", "error");
    } finally {
      setUploadingContract(false);
    }
  };

  const fetchFreshData = async (forceSync = false) => {
    setFetching(true);
    try {
      if (forceSync) {
        const syncRes = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db?table=Setting_API`, {
          method: "POST"
        });
        if (!syncRes.ok) throw new Error("Failed to refresh server cache");
      }

      const res = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db?table=Setting_API`);
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const json = await res.json();
      const items = Array.isArray(json) ? json : (json.value || []);

      localStorage.setItem("Setting_API_data", JSON.stringify(items));
      if (activeTab === "api") {
        setData(items);
      }
      return items;
    } catch (err: any) {
      showToast("Failed to fetch API settings: " + err.message, "error");
      return null;
    } finally {
      setFetching(false);
    }
  };

  // Sync data when activeTab changes
  React.useEffect(() => {
    if (activeTab === "api") {
      const cached = localStorage.getItem("Setting_API_data");
      if (cached) {
        try {
          const items = JSON.parse(cached);
          setData(items);
        } catch (e) {
          // ignore
        }
      }
      // Always fetch fresh data from network to ensure it is synchronized
      fetchFreshData();
    } else {
      setData([]);
    }
  }, [activeTab]);

  // Global Refresh Listener
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      if (activeTab === "api") {
        await fetchFreshData(true);
        showToast("API Cache refreshed successfully!", "success");
      }
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [activeTab]);



  // Handle toggle under construction mode for a module
  const handleToggleModule = async (moduleTitle: string) => {
    const current = !!moduleMaintenance[moduleTitle];
    const next = !current;

    const updatedMaintenance = {
      ...moduleMaintenance,
      [moduleTitle]: next
    };

    if (!next) {
      delete updatedMaintenance[moduleTitle];
    }

    setModuleMaintenance(updatedMaintenance);

    try {
      const success = await saveModuleUnderConstruction(moduleTitle, next);
      if (success) {
        showToast(
          next
            ? `"${moduleTitle}" is now Under Construction.`
            : `"${moduleTitle}" is now Active.`,
          "success"
        );
        window.dispatchEvent(new CustomEvent("db-refresh"));
      } else {
        showToast("Failed to save setting to database", "error");
        setModuleMaintenance(moduleMaintenance);
      }
    } catch (err: any) {
      showToast("Failed to save setting: " + err.message, "error");
      setModuleMaintenance(moduleMaintenance);
    }
  };

  // Flattened modules list from APP_PAGES_CONFIG
  const allModulesList = React.useMemo(() => {
    const list: { pageId: string; pageLabel: string; title: string; description: string }[] = [];
    APP_PAGES_CONFIG.forEach((page) => {
      page.modules.forEach((mod) => {
        list.push({
          pageId: page.id,
          pageLabel: page.label,
          title: mod.title,
          description: mod.description
        });
      });
    });
    return list;
  }, []);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    allModulesList.forEach((m) => set.add(m.pageLabel));
    return ["All", ...Array.from(set)];
  }, [allModulesList]);

  const filteredModules = React.useMemo(() => {
    return allModulesList.filter((mod) => {
      const matchesCat = selectedCategory === "All" || mod.pageLabel === selectedCategory;
      const q = searchFilter.trim().toLowerCase();
      const matchesSearch =
        !q ||
        mod.title.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        mod.pageLabel.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [allModulesList, selectedCategory, searchFilter]);

  const underConstructionCount = React.useMemo(() => {
    return Object.values(moduleMaintenance).filter(Boolean).length;
  }, [moduleMaintenance]);

  const handleSetAll = async (underConst: boolean) => {
    const updated: Record<string, boolean> = {};
    allModulesList.forEach((m) => {
      updated[m.title] = underConst;
    });
    setModuleMaintenance(underConst ? updated : {});

    try {
      const success = await saveAllUnderConstructionModules(updated);
      if (success) {
        showToast(
          underConst
            ? "All modules set to Under Construction."
            : "All modules set to Active.",
          "success"
        );
        window.dispatchEvent(new CustomEvent("db-refresh"));
      } else {
        showToast("Failed to update all modules", "error");
        setModuleMaintenance(moduleMaintenance);
      }
    } catch (err: any) {
      showToast("Error updating modules: " + err.message, "error");
      setModuleMaintenance(moduleMaintenance);
    }
  };

  const handleEditModeChange = (edit: boolean) => {
    setIsEditMode(edit);
    if (edit) {
      fetchFreshData(true);
    }
  };

  const handleEditRow = (row: any) => {
    setEditingApi({ ...row, isNew: false });
  };

  const handleAddNew = () => {
    setEditingApi({ isNew: true, id: "", Name: "", Key: "" });
  };

  const handleSaveItem = async (updatedItem: any) => {
    const isNew = !!updatedItem.isNew;

    setEditingApi(null);

    const cleanData = { ...updatedItem };
    delete cleanData.isNew;

    // Validate keys
    if (!cleanData.id || !String(cleanData.id).trim()) {
      showToast("Save failed: ID is required!", "error");
      return;
    }
    if (!cleanData.Name || !String(cleanData.Name).trim()) {
      showToast("Save failed: API Name is required!", "error");
      return;
    }

    if (isNew) {
      const exists = data.some(
        (item) => String(item.id).trim().toLowerCase() === String(cleanData.id).trim().toLowerCase()
      );
      if (exists) {
        showToast("Save failed: A record with this ID already exists!", "error");
        return;
      }
    }

    showToast("Saving API record...", "info");

    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "Setting_API",
          action: isNew ? "insert" : "update",
          data: cleanData
        })
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to save API record");

      showToast("API record saved successfully!", "success");

      let updatedList;
      if (isNew) {
        updatedList = [...data, cleanData];
      } else {
        updatedList = data.map((item) =>
          String(item.id) === String(cleanData.id) ? { ...item, ...cleanData } : item
        );
      }
      setData(updatedList);
      localStorage.setItem("Setting_API_data", JSON.stringify(updatedList));
      fetchFreshData(false);
    } catch (err: any) {
      showToast("Save failed: " + err.message, "error");
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    const targetItem = data.find((item) => String(item.id) === String(rowId));
    if (!targetItem) return;

    showToast("Deleting API record...", "info");

    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db-write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "Setting_API",
          action: "delete",
          data: { id: targetItem.id }
        })
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to delete API record");

      showToast("API record deleted successfully!", "success");

      const updatedList = data.filter((item) => String(item.id) !== String(targetItem.id));
      setData(updatedList);
      localStorage.setItem("Setting_API_data", JSON.stringify(updatedList));
      fetchFreshData(false);
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
    }
  };

  if (profile?.role !== "Administrator") {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-lg shadow-xs font-primary">
        <span className="text-zinc-500 text-sm font-semibold italic text-center">
          Access Denied: Only Administrators can configure system settings.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] font-primary min-w-0">
      <div className="content-header">
        <NavigationTabs
          tabs={tabs}
          activeTabId={activeTab}
          onTabSelect={(tabId) => {
            setActiveTab(tabId as any);
            setIsEditMode(false);
          }}
          titleSuffix="Control"
        />
      </div>

      <div className="content-body flex-1 w-full overflow-y-auto no-scrollbar">
        {activeTab === "configuration" ? (
          <div className="flex flex-col gap-4 bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex-1 flex flex-col gap-0.5">
                <h3 className="text-sm font-bold text-zinc-900">Sign-Up Contract Management</h3>
                <p className="text-[11px] text-zinc-555 leading-relaxed mt-0.5">
                  Manage the mandatory NDA/Contract users must sign upon registration.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-xs font-bold text-zinc-700 rounded-md transition duration-150 cursor-pointer flex items-center gap-1.5 outline-none active:scale-98"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-650" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View Active Contract</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpload(!showUpload)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition duration-150 cursor-pointer flex items-center gap-1.5 outline-none border ${
                    showUpload 
                      ? "bg-slate-100 border-slate-300 text-zinc-750" 
                      : "bg-[#0B57D0] border-[#0B57D0] hover:bg-[#0842A0] text-white"
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span>{showUpload ? "Cancel Update" : "Publish New"}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Upload Panel */}
            {showUpload ? (
              <div className="flex flex-col gap-3 bg-[#F0F4F9] border border-transparent rounded-lg p-4 animate-in slide-in-from-top-2 duration-150 mt-1">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Choose Plain Text (.txt) File</label>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileChange}
                      className="w-full text-xs text-zinc-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-[#C2E7FF] file:text-[#001D35] hover:file:bg-[#B3DBF2] file:cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    <CustomButton
                      type="button"
                      onClick={handleUpdateContract}
                      disabled={!selectedFileContent || uploadingContract}
                      className="px-4 h-8 text-[11px] font-bold bg-[#0B57D0] border-[#0B57D0] hover:bg-[#0842A0] text-white rounded transition active:scale-98 shadow-sm flex-shrink-0"
                    >
                      {uploadingContract ? "Publishing..." : "Update Contract (Force Re-sign)"}
                    </CustomButton>
                  </div>
                </div>

                {fileName && (
                  <div className="flex flex-col gap-1 bg-white border border-slate-200 rounded-lg p-3">
                    <span className="text-xs font-bold text-zinc-700 truncate">Selected File: {fileName}</span>
                    <span className="text-[10px] text-zinc-500">Previewing first 200 characters:</span>
                    <p className="text-[10px] text-zinc-650 italic truncate bg-[#F0F4F9] p-2 rounded border border-slate-200 mt-1 leading-relaxed">
                      {selectedFileContent.substring(0, 200)}...
                    </p>
                  </div>
                )}

                {contractUpdatedAt > 0 && (
                  <div className="border-t border-[#D3E3FD] pt-2 flex justify-end">
                    <span className="text-[10px] text-zinc-500 italic font-medium select-none">
                      Active NDA Last Updated: {new Date(contractUpdatedAt).toLocaleDateString("en-GB")} {new Date(contractUpdatedAt).toLocaleTimeString([], { hour12: false })}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg p-6 text-center select-none bg-slate-50/20 min-h-[160px]">
                <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs font-bold text-zinc-750">Active Contract Details</span>
                <span className="text-[10px] text-zinc-450 mt-1 max-w-[240px] leading-relaxed">
                  NDA Signature is fully enforced. Click "View Active Contract" to review content or "Publish New" to replace.
                </span>
              </div>
            )}
          </div>
        ) : activeTab === "console_context" ? (
          <div className="flex flex-col gap-4">
            {/* Header Controls: Search & Add Context */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900">AI Console Context Knowledge Base</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0B57D0] border border-blue-200">
                      {contexts.length} Active Context{contexts.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Add reference knowledge, operational rules, tutorials, and keywords that Gemini 2.5 Flash will use when chatting with users.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingContext({ title: "", keywords: [], detail_context: "" })}
                    className="px-3.5 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-bold rounded-md transition duration-150 cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-98"
                  >
                    <Plus size={14} />
                    <span>Add New Context</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-sm pt-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={contextSearch}
                  onChange={(e) => setContextSearch(e.target.value)}
                  placeholder="Search context title, keywords, or content..."
                  className="w-full h-8.5 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:bg-white transition"
                />
                {contextSearch && (
                  <button
                    type="button"
                    onClick={() => setContextSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Context Cards Grid */}
            {contextsLoading ? (
              <div className="flex items-center justify-center h-48 bg-white border border-slate-200 rounded-lg">
                <span className="text-xs font-semibold text-zinc-400 animate-pulse">Loading console contexts...</span>
              </div>
            ) : filteredContexts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 bg-white border border-dashed border-slate-200 rounded-lg p-6 text-center">
                <BookOpen size={28} className="text-slate-300 mb-2" />
                <span className="text-xs font-bold text-zinc-700">No context entries found</span>
                <span className="text-[11px] text-zinc-400 mt-1 max-w-xs">
                  Create a context card with titles, keywords, and up to 10,000 words of operational text to train the chat assistant.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                {filteredContexts.map((ctx) => (
                  <div
                    key={ctx.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md"
                  >
                    <div>
                      {/* Top Header: Title & Actions */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-bold text-zinc-950 tracking-tight leading-snug">
                          {ctx.title}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingContext(ctx)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-zinc-500 hover:text-[#0B57D0] transition cursor-pointer"
                            title="Edit Context"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContext(ctx.id, ctx.title)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-600 transition cursor-pointer"
                            title="Delete Context"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Keywords Badges */}
                      {Array.isArray(ctx.keywords) && ctx.keywords.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mb-2.5">
                          {ctx.keywords.map((kw, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0B57D0] bg-[#D3E3FD]/50 px-2 py-0.5 rounded-md border border-blue-200/60"
                            >
                              <Tag size={9} />
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Detail Text Preview */}
                      <p className="text-xs text-zinc-600 leading-relaxed line-clamp-4 whitespace-pre-wrap bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {ctx.detail_context}
                      </p>
                    </div>

                    {/* Footer Meta: Word Count & Date */}
                    <div className="border-t border-slate-100 pt-2.5 mt-3 flex items-center justify-between text-[10px] text-zinc-400">
                      <span>
                        {ctx.detail_context?.split(/\s+/).filter(Boolean).length || 0} words
                      </span>
                      <span>
                        Updated {new Date(ctx.updated_at).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "under_construction" ? (
          <div className="flex flex-col gap-4">
            {/* Header Controls: Search, Category Filter, and Bulk Actions */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-900">Under Construction Control</h3>
                    {underConstructionCount > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {underConstructionCount} Under Construction
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        All Modules Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Toggle construction mode for individual workspace modules. Modules in construction mode will be locked in the user portal.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSetAll(false)}
                    disabled={underConstructionCount === 0}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-xs font-bold text-zinc-700 rounded-md transition duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>Set All Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAll(true)}
                    disabled={underConstructionCount === allModulesList.length}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-700 rounded-md transition duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Construction size={13} className="text-blue-600" />
                    <span>Set All Under Construction</span>
                  </button>
                </div>
              </div>

              {/* Search & Category Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-100">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search module name or description..."
                    className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md whitespace-nowrap transition cursor-pointer ${
                        selectedCategory === cat
                          ? "bg-zinc-900 text-white shadow-xs"
                          : "bg-slate-100 text-zinc-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3 or 4 Column Cards Grid */}
            {maintenanceLoading ? (
              <div className="flex items-center justify-center h-48 bg-white border border-slate-200 rounded-lg">
                <span className="text-xs font-semibold text-zinc-400 animate-pulse">Loading module settings...</span>
              </div>
            ) : filteredModules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 bg-white border border-dashed border-slate-200 rounded-lg p-6 text-center">
                <span className="text-xs font-bold text-zinc-700">No modules found</span>
                <span className="text-[11px] text-zinc-400 mt-1">Try adjusting your search query or category filter.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
                {filteredModules.map((mod) => {
                  const isUnderConstruction = !!moduleMaintenance[mod.title];
                  return (
                    <div
                      key={mod.title}
                      className={`bg-white border rounded-xl p-4 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md ${
                        isUnderConstruction
                          ? "border-blue-200 bg-blue-50/20"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        {/* Top Meta: Category & Status */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 bg-slate-100 px-2 py-0.5 rounded">
                            {mod.pageLabel}
                          </span>
                          {isUnderConstruction ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                              Under Construction
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <h4 className="text-sm font-bold text-zinc-950 tracking-tight">
                          {mod.title}
                        </h4>
                        <p className="text-xs text-zinc-500 leading-relaxed mt-1.5 line-clamp-3">
                          {mod.description}
                        </p>
                      </div>

                      {/* Footer Control: Toggle Switch */}
                      <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-600 select-none">
                          Construction Mode
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isUnderConstruction}
                          onClick={() => handleToggleModule(mod.title)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isUnderConstruction ? "bg-[#0B57D0]" : "bg-[#D1D5DB]"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              isUnderConstruction ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <DataTable
            columns={apiColumns}
            data={data}
            userRole="admin"
            title="API Credentials Control"
            fetching={fetching}
            onEditModeChange={handleEditModeChange}
            onEditRow={handleEditRow}
            onAddNew={handleAddNew}
            onDeleteRow={handleDeleteRow}
            addNewText="Add API Key"
            height="h-full"
          />
        )}
      </div>

      {editingApi && (
        <ApiEditForm
          record={editingApi}
          onSave={handleSaveItem}
          onCancel={() => setEditingApi(null)}
        />
      )}

      {/* Contract Modal Popup */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl flex flex-col gap-4 max-h-[80vh] border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wide">Active NDA Contract Text</h3>
                {contractUpdatedAt > 0 && (
                  <span className="text-[10px] text-zinc-400 font-bold uppercase block mt-0.5">
                    Last Updated: {new Date(contractUpdatedAt).toLocaleDateString("en-GB")} {new Date(contractUpdatedAt).toLocaleTimeString([], { hour12: false })}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold cursor-pointer transition active:scale-90"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs leading-relaxed text-zinc-700 whitespace-pre-wrap select-text custom-scrollbar min-h-[300px]">
              {contractText || "No active contract uploaded yet. Fallback standard agreement is being used."}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-black cursor-pointer active:scale-95 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Edit Modal Popup */}
      {editingContext && (
        <ContextEditModal
          record={editingContext}
          isSaving={isSavingContext}
          onSave={handleSaveContext}
          onCancel={() => setEditingContext(null)}
        />
      )}
    </div>
  );
}

// Context Edit Modal Component (Title, Keywords Tag Input, 10,000-word max textarea)
function ContextEditModal({
  record,
  isSaving,
  onSave,
  onCancel,
}: {
  record: Partial<ConsoleContextItem>;
  isSaving: boolean;
  onSave: (data: Partial<ConsoleContextItem>) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState(record.title || "");
  const [keywords, setKeywords] = React.useState<string[]>(Array.isArray(record.keywords) ? [...record.keywords] : []);
  const [keywordInput, setKeywordInput] = React.useState("");
  const [detailContext, setDetailContext] = React.useState(record.detail_context || "");

  const wordCount = React.useMemo(() => {
    return detailContext.trim().split(/\s+/).filter(Boolean).length;
  }, [detailContext]);

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput("");
    }
  };

  const handleKeyDownKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setKeywords(keywords.filter((k) => k !== kwToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Please provide a title for this context", "warning");
      return;
    }
    if (!detailContext.trim()) {
      showToast("Please provide context text", "warning");
      return;
    }
    if (wordCount > 10000) {
      showToast("Detail context exceeds maximum 10,000 words limit", "error");
      return;
    }

    onSave({
      ...record,
      title: title.trim(),
      keywords,
      detail_context: detailContext.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 font-primary"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div>
            <h3 className="text-base font-bold text-zinc-950">
              {record.id ? "Edit Console Knowledge Context" : "Create Console Knowledge Context"}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Provide context data, instructions, or rules for Gemini 2.5 Flash to reference.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700">
              Context Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Merchandiser Store Visit Target Rules & Pace Analysis"
              className="h-9.5 px-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:bg-white transition font-medium placeholder:text-zinc-400"
            />
          </div>

          {/* Multiple Keywords / Tags Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700">
                Trigger Keywords & Tags
              </label>
              <span className="text-[10px] text-zinc-400">
                Type keyword and press Enter or comma (,) to add
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg min-h-[42px]">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B57D0] bg-[#D3E3FD] px-2.5 py-0.5 rounded-md border border-blue-200 shadow-2xs"
                >
                  <span>{kw}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(kw)}
                    className="text-blue-700 hover:text-red-600 font-bold ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDownKeyword}
                placeholder={keywords.length === 0 ? "e.g. visit, schedule, merchandiser, pace" : "+ add tag..."}
                className="flex-1 min-w-[120px] bg-transparent text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none border-none py-1 px-1"
              />
            </div>
          </div>

          {/* Detail Context (up to 10,000 words) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700">
                Detail Context (Full Text / Instructions) <span className="text-red-500">*</span>
              </label>
              <span className={`text-[10px] font-semibold ${wordCount > 10000 ? "text-red-600" : "text-zinc-500"}`}>
                {wordCount.toLocaleString()} / 10,000 words max
              </span>
            </div>
            <textarea
              required
              rows={12}
              value={detailContext}
              onChange={(e) => setDetailContext(e.target.value)}
              placeholder="Paste complete guidelines, operational definitions, SOPs, pricing tables, or domain knowledge here (up to 10,000 words)..."
              className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:bg-white transition leading-relaxed resize-y font-sans min-h-[220px]"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-slate-100 cursor-pointer shadow-2xs transition"
          >
            Cancel
          </button>
          <CustomButton
            type="submit"
            disabled={isSaving || wordCount > 10000}
            className="h-9 px-5 text-xs font-semibold bg-[#0B57D0] border-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg shadow-2xs transition disabled:opacity-50"
          >
            {isSaving ? "Saving Context..." : "Save Context"}
          </CustomButton>
        </div>
      </form>
    </div>
  );
}

// API Edit Form Dialog Sub-component
function ApiEditForm({ record, onSave, onCancel }: { record: any; onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [formData, setFormData] = React.useState({ ...record });
  const isNew = !!record.isNew;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-tableFadeInOnly">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col font-primary"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#F0F4F9]">
          <h3 className="text-base font-bold text-zinc-950">
            {isNew ? "Create API Credential" : "Edit API Credential"}
          </h3>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">ID</label>
            <input
              type="text"
              required
              disabled={!isNew}
              value={formData.id}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, id: e.target.value }))}
              placeholder="e.g. gemini_api"
              className="h-9 px-3 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 disabled:opacity-60 disabled:cursor-not-allowed font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">API Name</label>
            <input
              type="text"
              required
              value={formData.Name}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, Name: e.target.value }))}
              placeholder="e.g. Gemini OCR Flash"
              className="h-9 px-3 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">API Key</label>
            <input
              type="text"
              required
              value={formData.Key}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, Key: e.target.value }))}
              placeholder="e.g. API Key..."
              className="h-9 px-3 bg-[#F0F4F9] border border-slate-200 rounded text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-400/20 font-semibold"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 bg-[#F0F4F9] border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 text-xs font-bold rounded border border-slate-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <CustomButton type="submit" className="h-9 text-xs bg-[#0B57D0] border-[#0B57D0] hover:bg-[#0842A0] text-white rounded">
            Save
          </CustomButton>
        </div>
      </form>
    </div>
  );
}
