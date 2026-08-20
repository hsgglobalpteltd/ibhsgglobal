"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { Upload, X } from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";

const API_BASE = "https://ib-v2.hsgglobalpteltd.workers.dev";

export interface RetailerItem {
  id: string;
  display_name: string;
  logo_image?: string;
  rank?: string;
  retailer_group?: string;
  email?: string;
  [key: string]: any;
}

export interface StoreItem {
  id: string;
  retailers_id?: string;
  retailer_id?: string;
  display_name: string;
  address?: string;
  pin_locations?: string;
  zones?: string;
  status?: string;
  store_rank?: string;
  [key: string]: any;
}

const retailerColumns: Column[] = [
  { id: "id", header: "ID", accessor: "id" },
  { id: "display_name", header: "Display Name", accessor: "display_name" },
  { id: "logo_image", header: "Logo Image", accessor: "logo_image" },
  { id: "retailer_group", header: "Retailer Group", accessor: "retailer_group" },
  { id: "rank", header: "Rank", accessor: "rank" },
  { id: "email", header: "Email", accessor: "email" }
];

const storeColumns: Column[] = [
  { id: "id", header: "ID", accessor: "id" },
  { id: "retailer_name", header: "Retailer Name", accessor: "retailer_name" },
  { id: "display_name", header: "Display Name", accessor: "display_name" },
  { id: "address", header: "Address", accessor: "address" },
  { id: "zones", header: "Zones", accessor: "zones" },
  { id: "pin_locations", header: "Pin Locations", accessor: "pin_locations" },
  { id: "status", header: "Status", accessor: "status" },
  { id: "store_rank", header: "Store Rank", accessor: "store_rank" }
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
  const [activeTab, setActiveTab] = React.useState<"stores" | "retailers">("stores");
  const [storesData, setStoresData] = React.useState<StoreItem[]>([]);
  const [retailersData, setRetailersData] = React.useState<RetailerItem[]>([]);
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

  // Load stores from dedicated endpoint
  const fetchStores = React.useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      const res = await fetch(`${API_BASE}/api/stores`);
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const json = await res.json();
      const items = Array.isArray(json) ? json : [];
      setStoresData(items);
      localStorage.setItem("stores_db_data", JSON.stringify(items));
      setSyncStatus("synced");
      return items;
    } catch (err: any) {
      if (!silent) showToast("Failed to fetch stores: " + err.message, "error");
      return null;
    } finally {
      if (!silent) setFetching(false);
    }
  }, []);

  // Load retailers from dedicated endpoint
  const fetchRetailers = React.useCallback(async (silent = false) => {
    if (!silent) setFetching(true);
    try {
      const res = await fetch(`${API_BASE}/api/retailers`);
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const json = await res.json();
      const items = Array.isArray(json) ? json : [];
      setRetailersData(items);
      localStorage.setItem("retailers_db_data", JSON.stringify(items));
      setSyncStatus("synced");
      return items;
    } catch (err: any) {
      if (!silent) showToast("Failed to fetch retailers: " + err.message, "error");
      return null;
    } finally {
      if (!silent) setFetching(false);
    }
  }, []);

  // Initial load on mount
  React.useEffect(() => {
    const cachedStores = localStorage.getItem("stores_db_data");
    const cachedRetailers = localStorage.getItem("retailers_db_data");
    if (cachedStores) {
      try { setStoresData(JSON.parse(cachedStores)); } catch (e) {}
    }
    if (cachedRetailers) {
      try { setRetailersData(JSON.parse(cachedRetailers)); } catch (e) {}
    }

    fetchStores(false);
    fetchRetailers(false);
  }, [fetchStores, fetchRetailers]);

  // Global db-refresh listener
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      setSyncStatus("syncing");
      await Promise.all([fetchStores(true), fetchRetailers(true)]);
      setSyncStatus("synced");
    };

    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, [fetchStores, fetchRetailers]);

  // Preprocess stores list to match retailer names for visual display
  const processedStoresData = React.useMemo(() => {
    const retailerMap = new Map<string, string>();
    for (const r of retailersData) {
      if (r.id) {
        retailerMap.set(String(r.id), r.display_name || r.id);
      }
    }

    return storesData.map((store) => {
      const retailerId = store.retailers_id || store.retailer_id || "";
      const retailerName = retailerMap.get(String(retailerId)) || retailerId;
      return {
        ...store,
        retailer_name: retailerName
      };
    });
  }, [storesData, retailersData]);

  // Filtered retailers data (exclude group placeholders if any)
  const processedRetailersData = React.useMemo(() => {
    return retailersData.filter(r => !String(r.id || "").startsWith("Group"));
  }, [retailersData]);

  // Edit Mode Handler
  const handleEditModeChange = (edit: boolean) => {
    setIsEditMode(edit);
    if (edit) {
      if (activeTab === "stores") fetchStores(true);
      else fetchRetailers(true);
    }
  };

  // Row Edit Trigger
  const handleEditRow = (row: any) => {
    if (activeTab === "retailers") {
      setEditingRetailer({ ...row });
    } else {
      setEditingStore({ ...row });
    }
  };

  // Add New Trigger
  const handleAddNew = () => {
    if (activeTab === "retailers") {
      setEditingRetailer({
        isNew: true,
        id: "",
        display_name: "",
        logo_image: "",
        rank: "",
        retailer_group: "Individual",
        email: ""
      });
    } else {
      setEditingStore({
        isNew: true,
        id: "",
        retailers_id: "",
        retailer_id: "",
        display_name: "",
        address: "",
        zones: "",
        pin_locations: "",
        status: "Active",
        store_rank: ""
      });
    }
  };

  // Direct save changes (waits directly for API response)
  const handleSaveItem = async (updatedItem: any) => {
    const isNew = !!updatedItem.isNew;
    const isRetailer = activeTab === "retailers";
    const endpoint = isRetailer ? `${API_BASE}/api/retailers` : `${API_BASE}/api/stores`;
    const storageKey = isRetailer ? "retailers_db_data" : "stores_db_data";

    // Prepare clean snake_case payload
    const cleanData = { ...updatedItem };
    delete cleanData.isNew;
    delete cleanData.retailer_name;

    // Validation check for ID
    if (isNew) {
      if (!cleanData.id || !String(cleanData.id).trim()) {
        showToast("Save failed: ID is required!", "error");
        return;
      }
      const existingList = isRetailer ? retailersData : storesData;
      const exists = existingList.some(
        (item) => String(item.id).trim().toLowerCase() === String(cleanData.id).trim().toLowerCase()
      );
      if (exists) {
        showToast("Save failed: A record with this ID already exists!", "error");
        return;
      }
    }

    // Keep retailers_id / retailer_id in sync for stores
    if (!isRetailer) {
      const retId = cleanData.retailers_id || cleanData.retailer_id || "";
      cleanData.retailers_id = retId;
      cleanData.retailer_id = retId;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isNew ? "insert" : "update",
          data: cleanData
        })
      });

      if (!res.ok) {
        let errMsg = `Server returned status ${res.status}`;
        try {
          const errData = await res.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to save record");

      // Update state and close modal on confirmed success
      if (isRetailer) {
        const updatedList = isNew
          ? [...retailersData, cleanData]
          : retailersData.map((item) => (String(item.id) === String(cleanData.id) ? { ...item, ...cleanData } : item));
        setRetailersData(updatedList);
        localStorage.setItem(storageKey, JSON.stringify(updatedList));
        setEditingRetailer(null);
      } else {
        const updatedList = isNew
          ? [...storesData, cleanData]
          : storesData.map((item) => (String(item.id) === String(cleanData.id) ? { ...item, ...cleanData } : item));
        setStoresData(updatedList);
        localStorage.setItem(storageKey, JSON.stringify(updatedList));
        setEditingStore(null);
      }

      showToast(`${isRetailer ? "Retailer" : "Store"} saved successfully!`, "success");

    } catch (err: any) {
      showToast("Save failed: " + err.message, "error");
    }
  };

  // Handle direct row deletion
  const handleDeleteRow = async (rowId: string) => {
    const isRetailer = activeTab === "retailers";
    const endpoint = isRetailer ? `${API_BASE}/api/retailers` : `${API_BASE}/api/stores`;
    const storageKey = isRetailer ? "retailers_db_data" : "stores_db_data";

    const currentList = isRetailer ? retailersData : storesData;
    const targetItem = currentList.find((item) => String(item.id) === String(rowId));
    if (!targetItem) return;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          data: { id: targetItem.id }
        })
      });

      if (!res.ok) {
        let errMsg = `Server returned status ${res.status}`;
        try {
          const errData = await res.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to delete record");

      // Update state on confirmed deletion
      if (isRetailer) {
        const updated = retailersData.filter((r) => String(r.id) !== String(rowId));
        setRetailersData(updated);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } else {
        const updated = storesData.filter((s) => String(s.id) !== String(rowId));
        setStoresData(updated);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }

      showToast(`${isRetailer ? "Retailer" : "Store"} deleted successfully!`, "success");

    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] font-primary relative min-w-0">
      {/* Reusable Sub-Navigation NavigationTabs Component */}
      <div className="content-header">
        <NavigationTabs 
          tabs={tabs}
          activeTabId={activeTab}
          onTabSelect={(tabId) => {
            setActiveTab(tabId as any);
            setIsEditMode(false);
          }}
          titleSuffix="Record"
        />
      </div>

      {/* Data Table */}
      <div className="content-body flex-1 w-full overflow-hidden">
        <DataTable
          columns={activeTab === "retailers" ? retailerColumns : storeColumns}
          data={activeTab === "retailers" ? processedRetailersData : processedStoresData}
          userRole={userRole}
          title={`${activeTab === "retailers" ? "Retailers" : "Stores"} Record`}
          fetching={fetching}
          syncStatus={syncStatus}
          onEditModeChange={handleEditModeChange}
          onEditRow={handleEditRow}
          onDeleteRow={handleDeleteRow}
          onAddNew={handleAddNew}
          addNewText={activeTab === "retailers" ? "Add Retailer" : "Add Store"}
          height="h-full"
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
          retailers={retailersData}
          onSave={handleSaveItem}
          onCancel={() => setEditingStore(null)}
        />
      )}
    </div>
  );
}

// Retailer Form Sub-component (pure snake_case)
function RetailerEditForm({
  retailer,
  onSave,
  onCancel
}: {
  retailer: RetailerItem;
  onSave: (data: RetailerItem) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = React.useState<RetailerItem>({ ...retailer });
  const [submitting, setSubmitting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isNew = !!retailer.isNew;

  const handleChange = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const res = await fetch(`${API_BASE}/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      if (json.success && json.url) {
        handleChange("logo_image", json.url);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-50 font-primary">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-lg p-6 shadow-xl flex flex-col gap-4 animate-tableFadeIn animate-duration-200">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
            {isNew ? "Add Retailer" : "Edit Retailer"}
          </h3>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-800 focus:outline-none cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">ID (Primary Key)</label>
            <input
              type="text"
              value={formData.id || ""}
              disabled={!isNew}
              onChange={(e) => handleChange("id", e.target.value)}
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
              value={formData.display_name || ""}
              onChange={(e) => handleChange("display_name", e.target.value)}
              required
              className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Logo Image</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.logo_image || ""}
                onChange={(e) => handleChange("logo_image", e.target.value)}
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
            {formData.logo_image && (
              <div className="mt-1.5 border border-slate-200 rounded overflow-hidden h-20 bg-[#F0F4F9] flex items-center justify-center relative group">
                <img src={formData.logo_image} alt="Preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Retailer Group</label>
            <select
              value={formData.retailer_group || "Individual"}
              onChange={(e) => handleChange("retailer_group", e.target.value)}
              className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold cursor-pointer"
            >
              <option value="Individual">Individual</option>
              <option value="Group A">Group A</option>
              <option value="Group B">Group B</option>
              <option value="Group C">Group C</option>
              <option value="Group D">Group D</option>
              <option value="Group E">Group E</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Rank</label>
            <input
              type="text"
              value={formData.rank || ""}
              onChange={(e) => handleChange("rank", e.target.value)}
              placeholder="e.g. 1"
              className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="e.g. buyer@retailer.com"
              className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 mt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onCancel}
              className="h-8 px-4 text-xs font-bold rounded border border-slate-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-slate-100 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-8 px-4 text-xs font-bold rounded border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Store Form Sub-component (pure snake_case)
function StoreEditForm({
  store,
  retailers,
  onSave,
  onCancel
}: {
  store: StoreItem;
  retailers: RetailerItem[];
  onSave: (data: StoreItem) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = React.useState<StoreItem>({ ...store });
  const [submitting, setSubmitting] = React.useState(false);
  const isNew = !!store.isNew;

  const handleChange = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleRetailerChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      retailers_id: val,
      retailer_id: val
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-50 font-primary">
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-lg p-6 shadow-xl flex flex-col gap-4 animate-tableFadeIn animate-duration-200 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
            {isNew ? "Add Store" : "Edit Store"}
          </h3>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-800 focus:outline-none cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">ID (Primary Key)</label>
            <input
              type="text"
              value={formData.id || ""}
              disabled={!isNew}
              onChange={(e) => handleChange("id", e.target.value)}
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
              value={formData.retailers_id || formData.retailer_id || ""}
              onChange={(e) => handleRetailerChange(e.target.value)}
              required
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="">-- Select Retailer --</option>
              {retailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.display_name || r.id} ({r.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Display Name</label>
            <input
              type="text"
              value={formData.display_name || ""}
              onChange={(e) => handleChange("display_name", e.target.value)}
              required
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Address</label>
            <textarea
              value={formData.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              rows={2}
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Zones</label>
            <input
              type="text"
              value={formData.zones || ""}
              onChange={(e) => handleChange("zones", e.target.value)}
              placeholder="e.g. North, Central"
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Pin Locations (Lat, Lng)</label>
            <input
              type="text"
              value={formData.pin_locations || ""}
              onChange={(e) => handleChange("pin_locations", e.target.value)}
              placeholder="e.g. 1.3521, 103.8198"
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Status</label>
            <select
              value={formData.status || "Active"}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Store Rank</label>
            <input
              type="text"
              value={formData.store_rank || ""}
              onChange={(e) => handleChange("store_rank", e.target.value)}
              placeholder="e.g. 1"
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 mt-2 col-span-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onCancel}
              className="h-8 px-4 text-xs font-bold rounded border border-slate-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-slate-100 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-8 px-4 text-xs font-bold rounded border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
