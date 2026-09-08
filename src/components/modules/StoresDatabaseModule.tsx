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
        status: "",
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
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      
      {/* 1. TOPBAR NAVIGATION TABS */}
      <NavigationTabs 
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(tabId) => {
          setActiveTab(tabId as any);
          setIsEditMode(false);
        }}
        titleSuffix="Record"
      />

      {/* 2. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            {activeTab === "retailers" ? "Retailer Groups Master Database" : "Retail Stores & Outlets Database"}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeTab === "retailers"
              ? "Manage master supermarket groups, corporate chains, logos, and retailer classifications."
              : "Comprehensive registry of retail store branches, addresses, GPS pin locations, and operational status."}
          </p>
        </div>
      </div>

      {/* 3. DATA TABLE BODY */}
      <div className="flex-1 w-full overflow-hidden min-h-0">
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 font-primary p-4">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-lg shadow-xl flex flex-col overflow-hidden animate-tableFadeIn animate-duration-200">
        {/* Dialog Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-bold text-zinc-950">
              {isNew ? "Add Retailer" : "Edit Retailer"}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Configure retailer entity details, group classification, and logo asset.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dialog Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 overflow-y-auto max-h-[calc(85vh-130px)] space-y-4">
            {/* Retailer Logo on top */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Retailer Logo</label>
              <div className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-lg border border-slate-200">
                <div className="w-20 h-20 aspect-square rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {formData.logo_image ? (
                    <img src={formData.logo_image} alt="Retailer Logo" className="w-full h-full object-contain p-1.5" />
                  ) : (
                    <div className="text-center text-zinc-400 p-1">
                      <Upload size={16} className="mx-auto mb-0.5 opacity-50" />
                      <span className="text-[10px] block leading-tight font-medium">No Logo</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-zinc-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                    >
                      <Upload size={13} />
                      {uploading ? "Uploading..." : formData.logo_image ? "Change Logo" : "Upload Logo"}
                    </button>
                    {formData.logo_image && (
                      <button
                        type="button"
                        onClick={() => handleChange("logo_image", "")}
                        className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 transition-all cursor-pointer shadow-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500">1:1 square retailer logo asset</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Retailer ID</label>
                <input
                  type="text"
                  value={formData.id || ""}
                  disabled={!isNew}
                  onChange={(e) => handleChange("id", e.target.value)}
                  placeholder="e.g. RET-001"
                  required
                  className={`w-full h-9 text-xs px-3 rounded-lg border font-medium outline-none transition-all ${
                    !isNew 
                      ? "bg-slate-50 border-slate-200 text-zinc-400 cursor-not-allowed" 
                      : "bg-white border-slate-200 text-zinc-900 focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Display Rank</label>
                <input
                  type="text"
                  value={formData.rank || ""}
                  onChange={(e) => handleChange("rank", e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Display Name</label>
              <input
                type="text"
                value={formData.display_name || ""}
                onChange={(e) => handleChange("display_name", e.target.value)}
                placeholder="Official retailer display name"
                required
                className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Retailer Group</label>
                <select
                  value={formData.retailer_group || "Individual"}
                  onChange={(e) => handleChange("retailer_group", e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium cursor-pointer transition-all"
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
                <label className="text-xs font-semibold text-zinc-600">Contact Email</label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="e.g. buyer@retailer.com"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={submitting}
              onClick={onCancel}
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-100 hover:text-zinc-950 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
            >
              {submitting ? "Saving..." : isNew ? "Create Retailer" : "Save Changes"}
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 font-primary p-4">
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-lg shadow-xl flex flex-col overflow-hidden animate-tableFadeIn animate-duration-200">
        {/* Dialog Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-bold text-zinc-950">
              {isNew ? "Add Store" : "Edit Store"}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Configure store branch information, physical address, and GPS pin coordinates.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dialog Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 overflow-y-auto max-h-[calc(85vh-130px)] space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Store ID</label>
                <input
                  type="text"
                  value={formData.id || ""}
                  disabled={!isNew}
                  onChange={(e) => handleChange("id", e.target.value)}
                  placeholder="e.g. STR-001"
                  required
                  className={`w-full h-9 text-xs px-3 rounded-lg border font-medium outline-none transition-all ${
                    !isNew 
                      ? "bg-slate-50 border-slate-200 text-zinc-400 cursor-not-allowed" 
                      : "bg-white border-slate-200 text-zinc-900 focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Assigned Retailer</label>
                <select
                  value={formData.retailers_id || formData.retailer_id || ""}
                  onChange={(e) => handleRetailerChange(e.target.value)}
                  required
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium cursor-pointer transition-all"
                >
                  <option value="">Select Retailer</option>
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name || r.id} ({r.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Display Name</label>
              <input
                type="text"
                value={formData.display_name || ""}
                onChange={(e) => handleChange("display_name", e.target.value)}
                placeholder="Store / outlet display name"
                required
                className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Physical Address</label>
              <textarea
                value={formData.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Full street address and unit number..."
                rows={2}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium resize-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Zone / Region</label>
                <input
                  type="text"
                  value={formData.zones || ""}
                  onChange={(e) => handleChange("zones", e.target.value)}
                  placeholder="e.g. North, Central, West"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Pin Locations (Lat, Lng)</label>
                <input
                  type="text"
                  value={formData.pin_locations || ""}
                  onChange={(e) => handleChange("pin_locations", e.target.value)}
                  placeholder="e.g. 1.3521, 103.8198"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Operation Status</label>
                <select
                  value={formData.status || ""}
                  onChange={(e) => handleChange("status", e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium cursor-pointer transition-all"
                >
                  <option value="">Select Status</option>
                  <option value="Carry">Carry</option>
                  <option value="Not Carry">Not Carry</option>
                  <option value="Store Closed">Store Closed</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Store Rank</label>
                <input
                  type="text"
                  value={formData.store_rank || ""}
                  onChange={(e) => handleChange("store_rank", e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={submitting}
              onClick={onCancel}
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-100 hover:text-zinc-950 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
            >
              {submitting ? "Saving..." : isNew ? "Create Store" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

