"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { Upload, X } from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";

const defaultRetailerColumns: Column[] = [
  { id: "ID", header: "ID", accessor: "ID" },
  { id: "Display Name", header: "Display Name", accessor: "Display Name" },
  { id: "Logo Image", header: "Logo Image", accessor: "Logo Image" }
];

const defaultStoreColumns: Column[] = [
  { id: "ID", header: "ID", accessor: "ID" },
  { id: "Retailer Name", header: "Retailer Name", accessor: "Retailer Name" },
  { id: "Display Name", header: "Display Name", accessor: "Display Name" },
  { id: "Address", header: "Address", accessor: "Address" }
];

interface StoresDatabaseModuleProps {
  profile?: {
    role: string;
  } | null;
}

export function StoresDatabaseModule({ profile }: StoresDatabaseModuleProps) {
  const tabs = [
    { id: "stores", label: "Stores", desc: "Manage store locations, address mappings, and associated retailers." },
    { id: "retailers", label: "Retailers", desc: "Manage retailer profiles, brand association, and logo assets." }
  ];
  const [activeTab, setActiveTab] = React.useState<"retailers" | "stores">("stores");
  const [data, setData] = React.useState<any[]>([]);
  const [columns, setColumns] = React.useState<Column[]>(defaultStoreColumns);
  const [fetching, setFetching] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<"idle" | "syncing" | "synced">("idle");
  const [isEditMode, setIsEditMode] = React.useState(false);

  const userRole = React.useMemo(() => {
    const role = profile?.role;
    if (role === "Administrator" || role === "Manager") return "admin";
    if (role === "Operator" || role === "Operation") return "operator";
    return "viewer";
  }, [profile]);

  // Modal edit states
  const [editingRetailer, setEditingRetailer] = React.useState<any | null>(null);
  const [editingStore, setEditingStore] = React.useState<any | null>(null);

  // Helper to fetch fresh data from worker
  const fetchFreshData = async (sheetName: "retailers_DB" | "Store_Retailer_DB", forceSync = false) => {
    setFetching(true);
    if (forceSync) {
      setSyncStatus("syncing");
    }
    try {
      if (forceSync) {
        // Force Cloudflare Worker to update D1 cache from Google Sheets
        const syncRes = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`, {
          method: "POST"
        });
        if (!syncRes.ok) throw new Error("Failed to refresh server cache");
      }

      const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`);
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const json = await res.json();
      
      const items = Array.isArray(json) ? json : (json.value || []);
      
      // Save directly to localStorage
      localStorage.setItem(`${sheetName}_data`, JSON.stringify(items));

      // Only update active state if the loaded sheet matches the currently active tab
      const currentTabSheet = activeTab === "retailers" ? "retailers_DB" : "Store_Retailer_DB";
      if (sheetName === currentTabSheet) {
        setData(items);
        updateColumnsForData(items);
        setSyncStatus("synced");
      }
      return items;
    } catch (err: any) {
      showToast("Failed to fetch fresh records: " + err.message, "error");
      setSyncStatus("idle");
      return null;
    } finally {
      setFetching(false);
    }
  };

  // Helper to update column definitions dynamically
  const updateColumnsForData = (items: any[]) => {
    if (items.length > 0) {
      const keys = Object.keys(items[0]);
      const cols = keys.map((key) => {
        // Replace Retailer ID column with Retailer Name for stores database visual rendering
        if (activeTab === "stores" && (key === "Retailer ID" || key === "Retailers ID")) {
          return {
            id: "Retailer Name",
            header: "Retailer Name",
            accessor: "Retailer Name"
          };
        }
        return {
          id: key,
          header: key,
          accessor: key
        };
      });
      setColumns(cols);
    } else {
      setColumns(activeTab === "retailers" ? defaultRetailerColumns : defaultStoreColumns);
    }
  };

  // Helper to read retailers catalog for dropdown lookup
  const getRetailersList = (): any[] => {
    const cached = localStorage.getItem("retailers_DB_data");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // Preprocess stores list to swap Retailer ID for looked up Retailer Name
  const processedData = React.useMemo(() => {
    if (activeTab !== "stores") return data;
    const retailersList = getRetailersList();
    return data.map((store) => {
      const retailerId = store["Retailers ID"] || store["Retailer ID"];
      const retailer = retailersList.find((r) => String(r.ID) === String(retailerId));
      return {
        ...store,
        "Retailer Name": retailer ? retailer["Display Name"] : (retailerId || "")
      };
    });
  }, [data, activeTab]);

  // On mount: prefetch both retailer and store tables silently if they are not in cache
  React.useEffect(() => {
    const cachedRetailers = localStorage.getItem("retailers_DB_data");
    if (!cachedRetailers) {
      fetchFreshData("retailers_DB", false);
    }
    const cachedStores = localStorage.getItem("Store_Retailer_DB_data");
    if (!cachedStores) {
      fetchFreshData("Store_Retailer_DB", false);
    }
  }, []);

  // Sync data when activeTab changes, loading from localStorage first
  React.useEffect(() => {
    const sheet = activeTab === "retailers" ? "retailers_DB" : "Store_Retailer_DB";
    const cached = localStorage.getItem(`${sheet}_data`);
    if (cached) {
      try {
        const items = JSON.parse(cached);
        setData(items);
        updateColumnsForData(items);
        setSyncStatus("synced");
      } catch (e) {
        fetchFreshData(sheet, false);
      }
    } else {
      fetchFreshData(sheet, false);
    }
  }, [activeTab]);

  // Listen for the global db-refresh event
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      const sheet = activeTab === "retailers" ? "retailers_DB" : "Store_Retailer_DB";
      await fetchFreshData(sheet, true);
      showToast("Database cache refreshed from Google Sheets!", "success");
    };

    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, [activeTab]);



  // Edit Mode Handler
  const handleEditModeChange = (edit: boolean) => {
    setIsEditMode(edit);
    if (edit) {
      // Pull fresh data from server when entering edit mode to ensure latest records
      const sheet = activeTab === "retailers" ? "retailers_DB" : "Store_Retailer_DB";
      fetchFreshData(sheet, true);
    }
  };

  // Intercept row edit pencil triggers
  const handleEditRow = (row: any) => {
    if (activeTab === "retailers") {
      setEditingRetailer(row);
    } else {
      setEditingStore(row);
    }
  };

  // Triggered by the "Add New" button in the table header
  const handleAddNew = () => {
    if (activeTab === "retailers") {
      setEditingRetailer({ isNew: true, ID: "", "Display Name": "", "Logo Image": "", Rank: "" });
    } else {
      setEditingStore({
        isNew: true,
        ID: "",
        "Retailer ID": "",
        "Retailers ID": "",
        "Display Name": "",
        Address: "",
        Zones: "",
        "Pin Locations": "",
        Status: ""
      });
    }
  };

  // Save changes to GAS (handles updates and additions)
  const handleSaveItem = async (updatedItem: any) => {
    const sheet = activeTab === "retailers" ? "retailers_DB" : "Store_Retailer_DB";
    const idKey = "ID"; // First column ID is treated as primary key in GAS
    const previousData = [...data];
    const isNew = !!updatedItem.isNew;

    // 1. Instantly close modals
    setEditingRetailer(null);
    setEditingStore(null);

    // 2. Prepare clean data
    const cleanData = { ...updatedItem };
    delete cleanData.id;
    delete cleanData.isNew;
    delete cleanData["Retailer Name"];

    // Validation check for duplicates
    if (isNew) {
      if (!cleanData[idKey] || !String(cleanData[idKey]).trim()) {
        showToast(`Save failed: ${idKey} is required!`, "error");
        return;
      }
      const exists = data.some(
        (item) => String(item[idKey]).trim().toLowerCase() === String(cleanData[idKey]).trim().toLowerCase()
      );
      if (exists) {
        showToast(`Save failed: A record with this ${idKey} already exists!`, "error");
        return;
      }
    }

    // 3. Optimistically update local state & localStorage
    let updatedList;
    if (isNew) {
      updatedList = [...data, cleanData];
    } else {
      updatedList = data.map((item) =>
        String(item[idKey]) === String(cleanData[idKey]) ? { ...item, ...cleanData } : item
      );
    }
    setData(updatedList);
    localStorage.setItem(`${sheet}_data`, JSON.stringify(updatedList));

    showToast("Saving changes in background...", "info");

    // 4. Perform network request in background
    (async () => {
      try {
        const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sheet,
            action: isNew ? "insert" : "update",
            data: cleanData
          })
        });

        if (!res.ok) {
          let errMsg = `Server returned status ${res.status}`;
          try {
            const errData = await res.json();
            if (errData && errData.error) {
              errMsg = errData.error;
            }
          } catch (e) {}
          throw new Error(errMsg);
        }

        const result = await res.json();
        if (!result.success) throw new Error(result.error || "Failed to save record");

        // Silent refresh of D1 cache from server in background
        fetchFreshData(sheet, false);
        showToast("Changes synced successfully to Google Sheets!", "success");
      } catch (err: any) {
        showToast("Background sync failed: " + err.message + ". Reverting changes...", "error");
        // Revert to previous state
        setData(previousData);
        localStorage.setItem(`${sheet}_data`, JSON.stringify(previousData));
      }
    })();
  };

  // Handle row deletion
  const handleDeleteRow = async (rowId: string) => {
    const sheet = activeTab === "retailers" ? "retailers_DB" : "Store_Retailer_DB";
    const idKey = "ID";

    const targetItem = data.find(
      (item) => String(item.id || item[idKey]) === String(rowId) || String(item[idKey]) === String(rowId)
    );
    if (!targetItem) return;

    showToast("Deleting record from Google Sheets...", "info");

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sheet,
          action: "delete",
          data: {
            [idKey]: targetItem[idKey]
          }
        })
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to delete record");

      // Update local state and localStorage
      const updatedList = data.filter((item) => String(item[idKey]) !== String(targetItem[idKey]));
      setData(updatedList);
      localStorage.setItem(`${sheet}_data`, JSON.stringify(updatedList));

      // Pull fresh data in background
      fetchFreshData(sheet, false);

      showToast("Record deleted successfully from Google Sheets!", "success");
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
    }
  };

  return (
    <div className="flex flex-col gap-5 font-primary h-full relative">
      {/* Reusable Sub-Navigation NavigationTabs Component */}
      <NavigationTabs 
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(tabId) => {
          setActiveTab(tabId as any);
          setIsEditMode(false);
        }}
        titleSuffix="Record"
      />

      {/* Data Table */}
      <div className="w-full flex-1">
        <DataTable
          columns={columns}
          data={processedData}
          userRole={userRole}
          title={`${activeTab === "retailers" ? "Retailers" : "Stores"} Record`}
          fetching={fetching}
          syncStatus={syncStatus}
          onEditModeChange={handleEditModeChange}
          onEditRow={handleEditRow}
          onDeleteRow={handleDeleteRow}
          onAddNew={handleAddNew}
          addNewText={activeTab === "retailers" ? "Add Retailer" : "Add Store"}
          height="h-[calc(100vh-220px)]"
        />
      </div>

      {/* Retailer Edit Modal Component */}
      {editingRetailer && (
        <RetailerEditForm
          retailer={editingRetailer}
          onSave={handleSaveItem}
          onCancel={() => setEditingRetailer(null)}
        />
      )}

      {/* Store Edit Modal Component */}
      {editingStore && (
        <StoreEditForm
          store={editingStore}
          retailers={getRetailersList()}
          onSave={handleSaveItem}
          onCancel={() => setEditingStore(null)}
        />
      )}
    </div>
  );
}

// Retailer Form Sub-component
function RetailerEditForm({ retailer, onSave, onCancel }: { retailer: any; onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [formData, setFormData] = React.useState({ ...retailer });
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isNew = !!retailer.isNew;

  const handleChange = (key: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      if (json.success && json.url) {
        handleChange("Logo Image", json.url);
        showToast("Image uploaded successfully!", "success");
      } else {
        throw new Error(json.error || "Failed to get upload URL");
      }
    } catch (err: any) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-50 font-primary">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-lg p-6 shadow-xl flex flex-col gap-4 animate-tableFadeIn animate-duration-200">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">{isNew ? "Add Retailer" : "Edit Retailer"}</h3>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-800 focus:outline-none cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">ID (Primary Key)</label>
            <input
              type="text"
              value={formData.ID || ""}
              disabled={!isNew}
              onChange={(e) => handleChange("ID", e.target.value)}
              required
              className={`w-full text-xs rounded px-3 py-2 font-semibold outline-none border ${
                !isNew 
                  ? "bg-[#F0F4F9] border-slate-200 text-zinc-500 cursor-not-allowed" 
                  : "bg-[#F0F4F9] border-slate-200 text-zinc-900 focus:border-blue-400"
              }`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              value={formData["Display Name"] || ""}
              onChange={(e) => handleChange("Display Name", e.target.value)}
              required
              className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Logo Image</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData["Logo Image"] || ""}
                onChange={(e) => handleChange("Logo Image", e.target.value)}
                placeholder="Image URL or upload a file"
                className="flex-1 text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-3 text-xs font-bold rounded border border-slate-200 bg-white hover:bg-slate-100 text-zinc-700 hover:text-zinc-950 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
              >
                <Upload size={13} />
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
            {formData["Logo Image"] && (
              <div className="mt-1.5 border border-slate-200 rounded overflow-hidden h-20 bg-[#F0F4F9] flex items-center justify-center relative group">
                <img src={formData["Logo Image"]} alt="Preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>
          
          {/* Generic fields editor for other sheets scale-up */}
          {Object.keys(formData)
            .filter((k) => !["ID", "Display Name", "Logo Image", "id", "isNew"].includes(k))
            .map((key) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">{key}</label>
                <input
                  type="text"
                  value={formData[key] !== undefined ? formData[key] : ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
                />
              </div>
            ))}
 
          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-8 px-4 text-xs font-bold rounded border border-slate-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-4 text-xs font-bold rounded border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Store Form Sub-component
function StoreEditForm({ store, retailers, onSave, onCancel }: { store: any; retailers: any[]; onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [formData, setFormData] = React.useState({ ...store });
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isNew = !!store.isNew;

  const handleChange = (key: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      if (json.success && json.url) {
        // Find if store has an image column dynamically or default to "Image"
        const imgKey = Object.keys(formData).find(k => k.toLowerCase().includes("image") || k.toLowerCase().includes("logo")) || "Image";
        handleChange(imgKey, json.url);
        showToast("Image uploaded successfully!", "success");
      } else {
        throw new Error(json.error || "Failed to get upload URL");
      }
    } catch (err: any) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Find if there is an image column key to preview
  const imgKey = Object.keys(formData).find(k => k.toLowerCase().includes("image") || k.toLowerCase().includes("logo"));

  // Check the key used for Retailer ID in the store object
  const retailerIdKey = formData["Retailers ID"] !== undefined ? "Retailers ID" : "Retailer ID";

  const handleRetailerChange = (val: string) => {
    handleChange(retailerIdKey, val);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-50 font-primary">
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-lg p-6 shadow-xl flex flex-col gap-4 animate-tableFadeIn animate-duration-200 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">{isNew ? "Add Store" : "Edit Store"}</h3>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-800 focus:outline-none cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">ID (Primary Key)</label>
            <input
              type="text"
              value={formData.ID || ""}
              disabled={!isNew}
              onChange={(e) => handleChange("ID", e.target.value)}
              required
              className={`w-full text-xs rounded px-3 py-2 font-semibold outline-none border ${
                !isNew 
                  ? "bg-slate-50 border-slate-200 text-zinc-500 cursor-not-allowed" 
                  : "bg-white border-slate-300 text-zinc-900 focus:border-blue-500"
              }`}
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Retailer (Assign to Retailer)</label>
            <select
              value={formData[retailerIdKey] || ""}
              onChange={(e) => handleRetailerChange(e.target.value)}
              required
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="">-- Select Retailer --</option>
              {retailers.map((r) => (
                <option key={r.ID} value={r.ID}>
                  {r["Display Name"] || r.ID} ({r.ID})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              value={formData["Display Name"] || ""}
              onChange={(e) => handleChange("Display Name", e.target.value)}
              required
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Address</label>
            <textarea
              value={formData["Address"] || ""}
              onChange={(e) => handleChange("Address", e.target.value)}
              rows={2}
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold resize-none"
            />
          </div>

          {imgKey && (
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Store Image</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData[imgKey] || ""}
                  onChange={(e) => handleChange(imgKey, e.target.value)}
                  placeholder="Image URL or upload a file"
                  className="flex-1 text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 px-3 text-xs font-bold rounded border border-slate-200 bg-white hover:bg-slate-100 text-zinc-700 hover:text-zinc-950 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                >
                  <Upload size={13} />
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
              {formData[imgKey] && (
                <div className="mt-1.5 border border-slate-200 rounded overflow-hidden h-24 bg-[#F0F4F9] flex items-center justify-center relative group">
                  <img src={formData[imgKey]} alt="Preview" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </div>
          )}

          {/* Generic fields editor for other sheets scale-up */}
          {Object.keys(formData)
            .filter((k) => !["ID", "Retailers ID", "Retailer ID", "Retailer Name", "Display Name", "Address", "id", "isNew"].includes(k) && k !== imgKey)
            .map((key) => (
              <div key={key} className="flex flex-col gap-1.5 col-span-2">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">{key}</label>
                <input
                  type="text"
                  value={formData[key] !== undefined ? formData[key] : ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
                />
              </div>
            ))}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 mt-2 col-span-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-8 px-4 text-xs font-bold rounded border border-slate-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-slate-100 transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-8 px-4 text-xs font-bold rounded border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
