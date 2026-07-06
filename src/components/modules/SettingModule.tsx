"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { NavigationTabs } from "../navigation-tabs";
import { CustomButton } from "../custom-button";

import { fetchLatestContract, adminUpdateContract } from "@/lib/api";

interface SettingModuleProps {
  profile?: {
    role: string;
  } | null;
  idToken?: string;
}

const apiColumns: Column[] = [
  { id: "ID", header: "ID", accessor: "ID" },
  { id: "Name", header: "API Name", accessor: "Name" },
  { id: "Key", header: "API Key", accessor: "Key" }
];

export function SettingModule({ profile, idToken }: SettingModuleProps) {
  const tabs = [
    { id: "configuration", label: "Configuration", desc: "System parameters and configurations." },
    { id: "api", label: "API", desc: "Manage API integrations and secure credentials." }
  ];

  const [activeTab, setActiveTab] = React.useState<"configuration" | "api">("configuration");
  const [data, setData] = React.useState<any[]>([]);
  const [fetching, setFetching] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editingApi, setEditingApi] = React.useState<any | null>(null);

  // Contract upload states
  const [contractText, setContractText] = React.useState<string>("");
  const [contractUpdatedAt, setContractUpdatedAt] = React.useState<number>(0);
  const [selectedFileContent, setSelectedFileContent] = React.useState<string>("");
  const [fileName, setFileName] = React.useState<string>("");
  const [uploadingContract, setUploadingContract] = React.useState<boolean>(false);

  const loadContract = React.useCallback(async () => {
    try {
      const contract = await fetchLatestContract();
      setContractText(contract.text || "");
      setContractUpdatedAt(contract.updated_at || 0);
    } catch (err: any) {
      console.error("Failed to load contract:", err);
    }
  }, []);

  React.useEffect(() => {
    if (activeTab === "configuration") {
      loadContract();
    }
  }, [activeTab, loadContract]);

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
        const syncRes = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Setting_API`, {
          method: "POST"
        });
        if (!syncRes.ok) throw new Error("Failed to refresh server cache");
      }

      const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Setting_API`);
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
          fetchFreshData();
        }
      } else {
        fetchFreshData();
      }
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
    setEditingApi({ isNew: true, ID: "", Name: "", Key: "" });
  };

  const handleSaveItem = async (updatedItem: any) => {
    const previousData = [...data];
    const isNew = !!updatedItem.isNew;

    setEditingApi(null);

    const cleanData = { ...updatedItem };
    delete cleanData.id;
    delete cleanData.isNew;

    // Validate keys
    if (!cleanData.ID || !String(cleanData.ID).trim()) {
      showToast("Save failed: ID is required!", "error");
      return;
    }
    if (!cleanData.Name || !String(cleanData.Name).trim()) {
      showToast("Save failed: API Name is required!", "error");
      return;
    }

    if (isNew) {
      const exists = data.some(
        (item) => String(item.ID).trim().toLowerCase() === String(cleanData.ID).trim().toLowerCase()
      );
      if (exists) {
        showToast("Save failed: A record with this ID already exists!", "error");
        return;
      }
    }

    let updatedList;
    if (isNew) {
      updatedList = [...data, cleanData];
    } else {
      updatedList = data.map((item) =>
        String(item.ID) === String(cleanData.ID) ? { ...item, ...cleanData } : item
      );
    }
    setData(updatedList);
    localStorage.setItem("Setting_API_data", JSON.stringify(updatedList));

    showToast("Saving API record in background...", "info");

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Setting_API",
          action: isNew ? "insert" : "update",
          data: cleanData
        })
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to save API record");

      fetchFreshData(false);
      showToast("API record saved successfully!", "success");
    } catch (err: any) {
      showToast("Background sync failed: " + err.message + ". Reverting changes...", "error");
      setData(previousData);
      localStorage.setItem("Setting_API_data", JSON.stringify(previousData));
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    const targetItem = data.find((item) => String(item.ID) === String(rowId));
    if (!targetItem) return;

    const previousData = [...data];
    showToast("Deleting API record from database...", "info");

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Setting_API",
          action: "delete",
          data: { ID: targetItem.ID }
        })
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to delete API record");

      const updatedList = data.filter((item) => String(item.ID) !== String(targetItem.ID));
      setData(updatedList);
      localStorage.setItem("Setting_API_data", JSON.stringify(updatedList));

      fetchFreshData(false);
      showToast("API record deleted successfully!", "success");
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
      setData(previousData);
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
    <div className="flex flex-col gap-6 font-primary">
      <NavigationTabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(tabId) => {
          setActiveTab(tabId as any);
          setIsEditMode(false);
        }}
        titleSuffix="Control"
      />

      <div className="w-full">
        {activeTab === "configuration" ? (
          <div className="flex flex-col gap-6 bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
            <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-zinc-900">Sign-Up Contract Management</h3>
              <p className="text-xs text-zinc-500">
                Upload a new plain text contract (.txt file). When updated, all users will be prompted to read and sign it on their next login.
              </p>
            </div>
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Current Contract View */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Active Contract Preview</label>
                <div className="flex-1 min-h-[250px] max-h-[350px] overflow-y-auto bg-slate-50/50 border border-slate-200 rounded-lg p-4 text-xs leading-relaxed text-zinc-700 whitespace-pre-wrap select-text custom-scrollbar">
                  {contractText || "No active contract uploaded yet. Fallback standard agreement is being used."}
                </div>
                {contractUpdatedAt > 0 && (
                  <span className="text-[10px] text-zinc-500 italic font-medium">
                    Last updated: {new Date(contractUpdatedAt).toLocaleDateString("en-GB")} {new Date(contractUpdatedAt).toLocaleTimeString([], { hour12: false })}
                  </span>
                )}
              </div>

              {/* Right Column: Upload Panel */}
              <div className="flex flex-col gap-4 bg-[#F0F4F9] border border-transparent rounded-lg p-5">
                <h4 className="text-sm font-bold text-zinc-800">Publish New Contract</h4>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Choose Plain Text (.txt) File</label>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#C2E7FF] file:text-[#001D35] hover:file:bg-[#B3DBF2] file:cursor-pointer"
                  />
                </div>

                {fileName && (
                  <div className="flex flex-col gap-1 bg-white border border-slate-200 rounded p-3">
                    <span className="text-xs font-bold text-zinc-700 truncate">Selected: {fileName}</span>
                    <span className="text-[10px] text-zinc-500">Previewing first 200 characters:</span>
                    <p className="text-[10px] text-zinc-600 italic truncate bg-[#F0F4F9] p-1.5 rounded border border-slate-200 mt-1">
                      {selectedFileContent.substring(0, 200)}...
                    </p>
                  </div>
                )}

                <CustomButton
                  type="button"
                  onClick={handleUpdateContract}
                  disabled={!selectedFileContent || uploadingContract}
                  className="w-full h-10 text-xs mt-2 bg-[#0B57D0] border-[#0B57D0] hover:bg-[#0842A0] text-white rounded"
                >
                  {uploadingContract ? "Updating Contract..." : "Update Contract (Force Re-sign)"}
                </CustomButton>
              </div>
            </div>
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
            height="h-[calc(100vh-220px)]"
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
              value={formData.ID}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, ID: e.target.value }))}
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
              placeholder="e.g. AIzaSy..."
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
