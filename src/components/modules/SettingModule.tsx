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
  fetchBrainCells,
  saveBrainCell,
  deleteBrainCell,
  fetchDbSchema,
  ConsoleContextItem,
  BrainCellItem,
  BrainCellMapping
} from "@/lib/api";
import { APP_PAGES_CONFIG } from "@/config/modules-config";
import { fetchMaintenanceSettings, saveModuleUnderConstruction, saveAllUnderConstructionModules } from "@/lib/maintenance";
import { Search, Construction, CheckCircle2, SlidersHorizontal, BookOpen, Plus, Trash2, Edit3, Tag, Cpu, Database, Sparkles, RefreshCw, Check, CheckSquare, Square, Layers } from "lucide-react";

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
    { id: "console", label: "Console", desc: "AI Console Brain & Knowledge Base: Manage live database Brain Cells and reference Contexts." },
    { id: "under_construction", label: "Under Construction", desc: "Control module availability and toggle under construction status." },
    { id: "api", label: "API", desc: "Manage API integrations and secure credentials." }
  ];

  const [activeTab, setActiveTab] = React.useState<"configuration" | "console" | "under_construction" | "api">("configuration");
  const [consoleSubTab, setConsoleSubTab] = React.useState<"brain_cells" | "console_context">("brain_cells");
  const [data, setData] = React.useState<any[]>([]);
  const [fetching, setFetching] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editingApi, setEditingApi] = React.useState<any | null>(null);

  // Brain Cells state
  const [brainCells, setBrainCells] = React.useState<BrainCellItem[]>([]);
  const [brainCellsLoading, setBrainCellsLoading] = React.useState(false);
  const [brainCellSearch, setBrainCellSearch] = React.useState("");
  const [editingBrainCell, setEditingBrainCell] = React.useState<Partial<BrainCellItem> | null>(null);
  const [isSavingBrainCell, setIsSavingBrainCell] = React.useState(false);
  const [dbSchema, setDbSchema] = React.useState<Record<string, string[]>>({});
  const [schemaLoading, setSchemaLoading] = React.useState(false);

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

  const loadBrainCells = React.useCallback(async () => {
    setBrainCellsLoading(true);
    try {
      const res = await fetchBrainCells();
      if (res.success && Array.isArray(res.brain_cells)) {
        setBrainCells(res.brain_cells);
      }
    } catch (err: any) {
      console.error("Failed to load brain cells:", err);
    } finally {
      setBrainCellsLoading(false);
    }
  }, []);

  const loadDbSchema = React.useCallback(async () => {
    setSchemaLoading(true);
    try {
      const res = await fetchDbSchema();
      if (res.success && res.schema) {
        setDbSchema(res.schema);
      }
    } catch (err: any) {
      console.error("Failed to load db schema:", err);
    } finally {
      setSchemaLoading(false);
    }
  }, []);

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
    } else if (activeTab === "console") {
      loadBrainCells();
      loadDbSchema();
      loadContexts();
    } else if (activeTab === "under_construction") {
      loadMaintenance();
    }
  }, [activeTab, loadContract, loadBrainCells, loadDbSchema, loadContexts, loadMaintenance]);

  const handleSaveBrainCell = async (cellData: Partial<BrainCellItem>) => {
    setIsSavingBrainCell(true);
    try {
      const res = await saveBrainCell(cellData);
      if (res.success) {
        showToast("Brain Cell saved successfully!", "success");
        setEditingBrainCell(null);
        loadBrainCells();
      } else {
        showToast("Failed to save brain cell", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save brain cell", "error");
    } finally {
      setIsSavingBrainCell(false);
    }
  };

  const handleDeleteBrainCell = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete Brain Cell "${name}"?`)) return;
    try {
      const res = await deleteBrainCell(id);
      if (res.success) {
        showToast("Brain Cell deleted successfully", "success");
        setBrainCells((prev) => prev.filter((c) => c.id !== id));
      } else {
        showToast("Failed to delete brain cell", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete brain cell", "error");
    }
  };

  const handleToggleBrainCellActive = async (cell: BrainCellItem) => {
    const updated = { ...cell, is_active: !cell.is_active };
    setBrainCells((prev) => prev.map((c) => (c.id === cell.id ? updated : c)));
    try {
      await saveBrainCell(updated);
      showToast(`Brain Cell "${cell.name}" is now ${updated.is_active ? "Active" : "Disabled"}`, "info");
    } catch (err: any) {
      setBrainCells((prev) => prev.map((c) => (c.id === cell.id ? cell : c)));
      showToast("Failed to update status", "error");
    }
  };

  const filteredBrainCells = React.useMemo(() => {
    if (!brainCellSearch.trim()) return brainCells;
    const q = brainCellSearch.toLowerCase();
    return brainCells.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(q);
      const kwMatch = Array.isArray(c.keywords) && c.keywords.some((kw) => kw.toLowerCase().includes(q));
      const modMatch = Array.isArray(c.assigned_modules) && c.assigned_modules.some((m) => m.toLowerCase().includes(q));
      const ruleMatch = c.custom_rules?.toLowerCase().includes(q);
      const mappingMatch = Array.isArray(c.mappings) && c.mappings.some((m) => m.table?.toLowerCase().includes(q) || m.column?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q));
      return nameMatch || kwMatch || modMatch || ruleMatch || mappingMatch;
    });
  }, [brainCells, brainCellSearch]);

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
        ) : activeTab === "console" ? (
          <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
            {/* Top Header Bar: Clean Single Title & Actions */}
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div>
                <h1 className="text-base font-bold text-zinc-950">AI Console Intelligence</h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {consoleSubTab === "brain_cells"
                    ? "Configure role-secured trigger keywords, map live database tables & columns, and define calculation rules."
                    : "Manage reference knowledge, operational rules, tutorials, and FAQs for Gemini 2.5."}
                </p>
              </div>

              {/* Action Buttons Group */}
              <div className="flex items-center gap-2 shrink-0">
                {consoleSubTab === "brain_cells" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => loadDbSchema()}
                      disabled={schemaLoading}
                      title="Refresh Supabase Database Schema"
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-zinc-700 text-xs font-semibold rounded-md transition duration-150 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <RefreshCw size={13} className={schemaLoading ? "animate-spin text-[#0B57D0]" : "text-zinc-500"} />
                      <span>Refresh Schema</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBrainCell({
                          name: "",
                          assigned_modules: [],
                          keywords: [],
                          mappings: [{ table: Object.keys(dbSchema)[0] || "stocks", column: "quantity", description: "" }],
                          custom_rules: "",
                          is_active: true
                        });
                      }}
                      className="px-3.5 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-bold rounded-md transition duration-150 cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-98"
                    >
                      <Plus size={14} />
                      <span>Create Brain Cell</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingContext({ title: "", keywords: [], detail_context: "" })}
                    className="px-3.5 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-bold rounded-md transition duration-150 cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-98"
                  >
                    <Plus size={14} />
                    <span>Add New Context</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter & Controls Toolbar: Sub-tabs + Search */}
            <div className="bg-[#F8F9FA] px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Segmented Sub-tab switcher */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-200/80 rounded-lg border border-slate-300/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setConsoleSubTab("brain_cells")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    consoleSubTab === "brain_cells"
                      ? "bg-white text-[#0B57D0] shadow-xs"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-slate-100/60"
                  }`}
                >
                  <Cpu size={13} className={consoleSubTab === "brain_cells" ? "text-[#0B57D0]" : "text-zinc-500"} />
                  <span>Brain Cells</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    consoleSubTab === "brain_cells" ? "bg-blue-50 text-[#0B57D0] border border-blue-200" : "bg-slate-100 text-zinc-600"
                  }`}>
                    {brainCells.filter(c => c.is_active).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setConsoleSubTab("console_context")}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    consoleSubTab === "console_context"
                      ? "bg-white text-[#0B57D0] shadow-xs"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-slate-100/60"
                  }`}
                >
                  <BookOpen size={13} className={consoleSubTab === "console_context" ? "text-[#0B57D0]" : "text-zinc-500"} />
                  <span>Console Context</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    consoleSubTab === "console_context" ? "bg-blue-50 text-[#0B57D0] border border-blue-200" : "bg-slate-100 text-zinc-600"
                  }`}>
                    {contexts.length}
                  </span>
                </button>
              </div>

              {/* Dynamic Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={consoleSubTab === "brain_cells" ? brainCellSearch : contextSearch}
                  onChange={(e) => {
                    if (consoleSubTab === "brain_cells") {
                      setBrainCellSearch(e.target.value);
                    } else {
                      setContextSearch(e.target.value);
                    }
                  }}
                  placeholder={
                    consoleSubTab === "brain_cells"
                      ? "Search name, keyword, module, table..."
                      : "Search title, keywords, or content..."
                  }
                  className="w-full h-8 pl-8 pr-7 bg-white border border-slate-200 rounded-lg text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] transition"
                />
                {((consoleSubTab === "brain_cells" && brainCellSearch) || (consoleSubTab === "console_context" && contextSearch)) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (consoleSubTab === "brain_cells") setBrainCellSearch("");
                      else setContextSearch("");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Main Content Area: Cards Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 custom-scrollbar">
              {consoleSubTab === "brain_cells" ? (
                /* Brain Cells Grid */
                brainCellsLoading ? (
                  <div className="flex items-center justify-center h-48 bg-white border border-slate-200 rounded-lg">
                    <span className="text-xs font-semibold text-zinc-400 animate-pulse">Loading AI brain cells...</span>
                  </div>
                ) : filteredBrainCells.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 bg-white border border-dashed border-slate-200 rounded-lg p-6 text-center">
                    <Cpu size={28} className="text-slate-300 mb-2" />
                    <span className="text-xs font-bold text-zinc-700">No brain cells configured</span>
                    <span className="text-[11px] text-zinc-400 mt-1 max-w-xs">
                      Create a Brain Cell to teach Gemini how to query Supabase tables and compute mathematical rules.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                    {filteredBrainCells.map((cell) => (
                      <div
                        key={cell.id}
                        className={`bg-white border ${cell.is_active ? "border-slate-200 hover:border-slate-300" : "border-slate-200/60 opacity-75"} rounded-xl p-4 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md gap-3`}
                      >
                        <div className="flex flex-col gap-2.5">
                          {/* Top Header: Title, Active Toggle & Actions */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleBrainCellActive(cell)}
                                title={cell.is_active ? "Active (Click to disable)" : "Disabled (Click to activate)"}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                                  cell.is_active
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200"
                                }`}
                              >
                                {cell.is_active ? "● Active" : "○ Inactive"}
                              </button>
                              <h4 className="text-sm font-bold text-zinc-950 tracking-tight leading-snug">
                                {cell.name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setEditingBrainCell(cell)}
                                className="p-1.5 rounded-md hover:bg-slate-100 text-zinc-500 hover:text-[#0B57D0] transition cursor-pointer"
                                title="Edit Brain Cell"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBrainCell(cell.id, cell.name)}
                                className="p-1.5 rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-600 transition cursor-pointer"
                                title="Delete Brain Cell"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Assigned Modules (Role Control) */}
                          {Array.isArray(cell.assigned_modules) && cell.assigned_modules.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-1">Modules:</span>
                              {cell.assigned_modules.map((mod, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-semibold text-zinc-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                                >
                                  {mod}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] font-semibold text-zinc-400 italic">
                              Universal (All logged-in roles can query)
                            </div>
                          )}

                          {/* Keywords Badges */}
                          {Array.isArray(cell.keywords) && cell.keywords.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {cell.keywords.map((kw, i) => (
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

                          {/* Mapped Database Columns Summary */}
                          {Array.isArray(cell.mappings) && cell.mappings.length > 0 && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                <span className="flex items-center gap-1">
                                  <Database size={11} className="text-[#0B57D0]" />
                                  Mapped Columns ({cell.mappings.length})
                                </span>
                              </div>
                              <div className="flex flex-col gap-1 max-h-24 overflow-y-auto no-scrollbar">
                                {cell.mappings.map((m, mi) => (
                                  <div key={mi} className="text-[11px] flex items-baseline justify-between gap-2 border-b border-slate-100 pb-0.5 last:border-b-0">
                                    <span className="font-mono font-bold text-zinc-800 text-[10px] truncate">
                                      {m.table}.<span className="text-[#0B57D0]">{m.column}</span>
                                    </span>
                                    <span className="text-[10px] text-zinc-500 truncate max-w-[140px]" title={m.description}>
                                      {m.description || "—"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Custom Rules Snippet */}
                          {cell.custom_rules && (
                            <div className="bg-[#F0F4F9] rounded-md p-2 text-[11px] text-zinc-650 leading-relaxed font-sans border border-slate-200/60 line-clamp-2" title={cell.custom_rules}>
                              <span className="font-bold text-zinc-800 mr-1">Rule:</span>
                              {cell.custom_rules}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                          <span>Updated {new Date(cell.updated_at || Date.now()).toLocaleDateString("en-GB")}</span>
                          <span className="font-mono text-[9px] text-zinc-350">{cell.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
            : (
              /* Console Context Grid */
              contextsLoading ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
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
              )
            )}
          </div>
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

      {/* Brain Cell Edit Modal Popup */}
      {editingBrainCell && (
        <BrainCellEditModal
          record={editingBrainCell}
          allModulesList={allModulesList}
          dbSchema={dbSchema}
          isSaving={isSavingBrainCell}
          onSave={handleSaveBrainCell}
          onCancel={() => setEditingBrainCell(null)}
        />
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

// Brain Cell Edit Modal Component (Name, Assigned Modules, Keywords, Dynamic Mapping Table, Custom Rules)
function BrainCellEditModal({
  record,
  allModulesList,
  dbSchema,
  isSaving,
  onSave,
  onCancel,
}: {
  record: Partial<BrainCellItem>;
  allModulesList: { pageId: string; pageLabel: string; title: string; description: string }[];
  dbSchema: Record<string, string[]>;
  isSaving: boolean;
  onSave: (data: Partial<BrainCellItem>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(record.name || "");
  const [assignedModules, setAssignedModules] = React.useState<string[]>(
    Array.isArray(record.assigned_modules) ? [...record.assigned_modules] : []
  );
  const [keywords, setKeywords] = React.useState<string[]>(
    Array.isArray(record.keywords) ? [...record.keywords] : []
  );
  const [keywordInput, setKeywordInput] = React.useState("");
  const [mappings, setMappings] = React.useState<BrainCellMapping[]>(
    Array.isArray(record.mappings) && record.mappings.length > 0
      ? record.mappings.map((m) => ({ ...m }))
      : [{ table: Object.keys(dbSchema)[0] || "stocks", column: "quantity", description: "" }]
  );
  const [customRules, setCustomRules] = React.useState(record.custom_rules || "");
  const [isActive, setIsActive] = React.useState(record.is_active !== undefined ? record.is_active : true);

  const [moduleInput, setModuleInput] = React.useState("");

  const availableTables = React.useMemo(() => {
    const keys = Object.keys(dbSchema);
    return keys.length > 0 ? keys : ["stocks", "products", "direct_orders", "track_orders", "tiktok_orders", "promoter_attendance", "merch_visits", "stores", "claims", "stock_flow", "users", "employees"];
  }, [dbSchema]);

  const allModuleTitles = React.useMemo(() => {
    const set = new Set<string>();
    allModulesList.forEach((m) => {
      if (m.title) set.add(m.title);
    });
    return Array.from(set);
  }, [allModulesList]);

  // Process comma-separated or single module tag addition
  const handleAddModule = (val?: string) => {
    const raw = (val !== undefined ? val : moduleInput).trim();
    if (!raw) return;
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    const newItems = parts.filter((p) => !assignedModules.some((m) => m.toLowerCase() === p.toLowerCase()));
    if (newItems.length > 0) {
      setAssignedModules([...assignedModules, ...newItems]);
    }
    setModuleInput("");
  };

  const handleKeyDownModule = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddModule();
    }
  };

  const handleRemoveModule = (modToRemove: string) => {
    setAssignedModules(assignedModules.filter((m) => m !== modToRemove));
  };

  // Process comma-separated or single keyword tag addition
  const handleAddKeyword = (val?: string) => {
    const raw = (val !== undefined ? val : keywordInput).trim().toLowerCase();
    if (!raw) return;
    const parts = raw.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
    const newItems = parts.filter((p) => !keywords.includes(p));
    if (newItems.length > 0) {
      setKeywords([...keywords, ...newItems]);
    }
    setKeywordInput("");
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

  const handleAddMappingRow = () => {
    const firstTable = availableTables[0] || "stocks";
    const firstCol = (dbSchema[firstTable] && dbSchema[firstTable][0]) || "id";
    setMappings([...mappings, { table: firstTable, column: firstCol, description: "" }]);
  };

  const handleRemoveMappingRow = (index: number) => {
    if (mappings.length <= 1) {
      showToast("A Brain Cell must have at least one mapping row", "warning");
      return;
    }
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleMappingChange = (index: number, field: keyof BrainCellMapping, value: string) => {
    setMappings((prev) => {
      const updated = [...prev];
      const currentRow = { ...updated[index], [field]: value };

      // If table changed, reset column to first available column in that table
      if (field === "table") {
        const tableCols = dbSchema[value] || [];
        currentRow.column = tableCols[0] || "id";
      }

      updated[index] = currentRow;
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-flush any pending typed inputs before saving
    let finalModules = [...assignedModules];
    if (moduleInput.trim()) {
      const parts = moduleInput.split(",").map((p) => p.trim()).filter(Boolean);
      const newItems = parts.filter((p) => !finalModules.some((m) => m.toLowerCase() === p.toLowerCase()));
      if (newItems.length > 0) finalModules = [...finalModules, ...newItems];
    }

    let finalKeywords = [...keywords];
    if (keywordInput.trim()) {
      const parts = keywordInput.split(",").map((p) => p.trim().toLowerCase()).filter(Boolean);
      const newItems = parts.filter((p) => !finalKeywords.includes(p));
      if (newItems.length > 0) finalKeywords = [...finalKeywords, ...newItems];
    }

    if (!name.trim()) {
      showToast("Please provide a name for this Brain Cell", "warning");
      return;
    }
    if (finalKeywords.length === 0) {
      showToast("Please provide at least one trigger keyword", "warning");
      return;
    }
    if (mappings.length === 0) {
      showToast("Please add at least one table/column mapping", "warning");
      return;
    }

    onSave({
      ...record,
      name: name.trim(),
      assigned_modules: finalModules,
      keywords: finalKeywords,
      mappings,
      custom_rules: customRules.trim(),
      is_active: isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 font-primary"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0B57D0]">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950">
                {record.id ? "Edit AI Brain Cell" : "Create AI Brain Cell"}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure dynamic database table mappings and mathematical reasoning rules.
              </p>
            </div>
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
        <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Top Row: Brain Cell Name & Active Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#F8F9FA] p-3.5 rounded-xl border border-slate-200">
            <div className="flex-1 w-full flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-700">
                Brain Cell Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Stock Balance & Reorder Alerts"
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] transition"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <label className="text-xs font-semibold text-zinc-600 select-none">Active Status:</label>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-slate-100 text-zinc-500 border-slate-300"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-zinc-400"}`} />
                <span>{isActive ? "Enabled" : "Disabled"}</span>
              </button>
            </div>
          </div>

          {/* Assigned Modules (Role Permission Guard - Simple Tag Input) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700">
                Assigned Modules (Role Security Check)
              </label>
              <span className="text-[10px] text-zinc-400">
                {assignedModules.length === 0 ? "Universal access (all roles)" : `${assignedModules.length} module(s) restricted`}
              </span>
            </div>
            <div className="min-h-[40px] p-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#0B57D0]/20 focus-within:bg-white focus-within:border-[#0B57D0] transition">
              {assignedModules.map((mod) => (
                <span
                  key={mod}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs"
                >
                  <Layers size={11} className="text-[#0B57D0]" />
                  <span>{mod}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveModule(mod)}
                    className="text-zinc-400 hover:text-red-600 font-bold ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                list="available-modules-list"
                value={moduleInput}
                onChange={(e) => setModuleInput(e.target.value)}
                onKeyDown={handleKeyDownModule}
                onBlur={() => handleAddModule()}
                placeholder={assignedModules.length === 0 ? "Type module name (e.g. Stocks, TikTok Orders) separated by comma..." : "+ add module..."}
                className="flex-1 min-w-[160px] bg-transparent text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none border-none py-0.5 px-1"
              />
              <datalist id="available-modules-list">
                {allModuleTitles.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <p className="text-[10px] text-zinc-400">
              Type module name and press Enter or comma (,). Leave empty for universal access.
            </p>
          </div>

          {/* Trigger Keywords Tag Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700">
                Trigger Keywords / Phrases <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] font-normal text-zinc-400">Separate by comma (,) or press Enter</span>
            </div>
            <div className="min-h-[40px] p-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center gap-1.5 focus-within:ring-2 focus-within:ring-[#0B57D0]/20 focus-within:bg-white focus-within:border-[#0B57D0] transition">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B57D0] bg-[#D3E3FD] px-2.5 py-0.5 rounded-md border border-blue-200 shadow-2xs"
                >
                  <Tag size={10} />
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
                onBlur={() => handleAddKeyword()}
                placeholder={keywords.length === 0 ? "e.g. lowest stock, out of stock, balance, reorder" : "+ add keyword..."}
                className="flex-1 min-w-[140px] bg-transparent text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none border-none py-0.5 px-1"
              />
            </div>
          </div>

          {/* Dynamic Table & Column Mapping Sub-Table */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <Database size={13} className="text-[#0B57D0]" />
                  <span>Data Source &amp; Column Knowledge Mappings <span className="text-red-500">*</span></span>
                </label>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Select Supabase tables and columns. Provide calculation rules and meaning for Gemini.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddMappingRow}
                className="px-2.5 py-1 bg-[#D3E3FD] hover:bg-[#C2E7FF] text-[#0B57D0] text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Add Row</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-slate-200 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-[28%]">Select Table</th>
                      <th className="py-2.5 px-3 w-[28%]">Select Column</th>
                      <th className="py-2.5 px-3">Meaning / Calculation Rule</th>
                      <th className="py-2.5 px-2 w-10 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mappings.map((row, idx) => {
                      const columnsForSelectedTable = dbSchema[row.table] || [];
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition">
                          {/* Table Select */}
                          <td className="p-2">
                            <select
                              value={row.table}
                              onChange={(e) => handleMappingChange(idx, "table", e.target.value)}
                              className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:bg-white"
                            >
                              {availableTables.map((tbl) => (
                                <option key={tbl} value={tbl}>
                                  {tbl}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Column Select */}
                          <td className="p-2">
                            <select
                              value={row.column}
                              onChange={(e) => handleMappingChange(idx, "column", e.target.value)}
                              className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-[#0B57D0] focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:bg-white"
                            >
                              {columnsForSelectedTable.length > 0 ? (
                                columnsForSelectedTable.map((col) => (
                                  <option key={col} value={col}>
                                    {col}
                                  </option>
                                ))
                              ) : (
                                <option value={row.column}>{row.column}</option>
                              )}
                            </select>
                          </td>

                          {/* Description Input */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => handleMappingChange(idx, "description", e.target.value)}
                              placeholder="e.g. Physical inventory count. Lowest stock is sorted ASC. Out of stock if <= 0."
                              className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:bg-white transition"
                            />
                          </td>

                          {/* Delete Action */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveMappingRow(idx)}
                              className="p-1 text-zinc-400 hover:text-red-600 rounded hover:bg-red-50 transition cursor-pointer"
                              title="Delete Row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Additional AI Instructions & Calculation Rules */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 flex items-center justify-between">
              <span>Additional AI Reasoning &amp; Formatting Rules (Optional)</span>
              <span className="text-[10px] font-normal text-zinc-400">Custom prompt instructions</span>
            </label>
            <textarea
              rows={3}
              value={customRules}
              onChange={(e) => setCustomRules(e.target.value)}
              placeholder="e.g. When answering, list top 5 items in a clean table with SKU, Name, and current Balance. Highlight out-of-stock items in red alert and suggest immediate reorder."
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:bg-white transition leading-relaxed resize-y font-sans min-h-[75px]"
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
            disabled={isSaving}
            className="h-9 px-5 text-xs font-semibold bg-[#0B57D0] border-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg shadow-2xs transition disabled:opacity-50"
          >
            {isSaving ? "Saving Brain Cell..." : "Save Brain Cell"}
          </CustomButton>
        </div>
      </form>
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
