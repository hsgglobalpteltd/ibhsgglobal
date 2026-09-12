"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { Upload, X, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";
import { CustomButton } from "../custom-button";
import * as XLSX from "xlsx";

const API_BASE = "https://ib-v2.hsgglobalpteltd.workers.dev";

export interface RetailerItem {
  id: string;
  display_name: string;
  logo_image?: string;
  rank?: string;
  email?: string;
  payment_terms?: string;
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
  { id: "rank", header: "Rank", accessor: "rank" },
  { id: "email", header: "Email", accessor: "email" },
  { id: "payment_terms", header: "Payment Terms", accessor: "payment_terms" }
];

const storeColumns: Column[] = [
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

  // Bulk Upload states
  const excelFileInputRef = React.useRef<HTMLInputElement>(null);
  const [bulkUploading, setBulkUploading] = React.useState(false);
  const [bulkUploadState, setBulkUploadState] = React.useState<{
    isOpen: boolean;
    items: any[];
    fileName: string;
    target: "Stores" | "Retailers";
    errors: string[];
  }>({
    isOpen: false,
    items: [],
    fileName: "",
    target: "Stores",
    errors: []
  });

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

  // Download Excel Template with all current data handler
  const handleDownloadTemplate = () => {
    try {
      const isRetailer = activeTab === "retailers";
      let exportRows: any[] = [];
      let fileName = "";
      let colWidths: any[] = [];

      if (isRetailer) {
        fileName = `Retailers_Master_Data_${new Date().toISOString().split("T")[0]}.xlsx`;
        if (retailersData && retailersData.length > 0) {
          exportRows = retailersData.map((r) => ({
            "ID (Mandatory)": r.id || "",
            "Display Name": r.display_name || "",
            "Logo Image": r.logo_image || "",
            "Rank": r.rank || "",
            "Email": r.email || "",
            "Payment Terms": r.payment_terms || "30d"
          }));
        } else {
          exportRows = [
            {
              "ID (Mandatory)": "FAIRPRICE",
              "Display Name": "FairPrice Supermarket",
              "Logo Image": "https://example.com/fairprice.png",
              "Rank": "1",
              "Email": "info@fairprice.com.sg",
              "Payment Terms": "30d"
            }
          ];
        }
        colWidths = [
          { wch: 20 },
          { wch: 30 },
          { wch: 35 },
          { wch: 10 },
          { wch: 30 },
          { wch: 16 }
        ];
      } else {
        fileName = `Stores_Master_Data_${new Date().toISOString().split("T")[0]}.xlsx`;
        if (storesData && storesData.length > 0) {
          exportRows = storesData.map((s) => ({
            "Store ID (Mandatory)": s.id || "",
            "Retailer ID (Mandatory)": s.retailers_id || s.retailer_id || "",
            "Display Name": s.display_name || "",
            "Address": s.address || "",
            "Zones": s.zones || "",
            "Pin Locations": s.pin_locations || "",
            "Status": s.status || "Active",
            "Store Rank": s.store_rank || ""
          }));
        } else {
          exportRows = [
            {
              "Store ID (Mandatory)": "FP-001",
              "Retailer ID (Mandatory)": "FAIRPRICE",
              "Display Name": "FairPrice Finest Star Vista",
              "Address": "1 Vista Exchange Green, #B1-01, The Star Vista, Singapore 138617",
              "Zones": "Central",
              "Pin Locations": "1.3068,103.7885",
              "Status": "Active",
              "Store Rank": "1"
            }
          ];
        }
        colWidths = [
          { wch: 22 },
          { wch: 24 },
          { wch: 35 },
          { wch: 55 },
          { wch: 15 },
          { wch: 20 },
          { wch: 12 },
          { wch: 12 }
        ];
      }

      const ws = XLSX.utils.json_to_sheet(exportRows);
      ws["!cols"] = colWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, isRetailer ? "Retailers" : "Stores");
      XLSX.writeFile(wb, fileName);
      showToast(`Downloaded ${fileName} (${exportRows.length} records)`, "success");
    } catch (err: any) {
      showToast("Failed to generate template: " + err.message, "error");
    }
  };

  // Upload Excel File selection & parser
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawRows || rawRows.length === 0) {
          showToast("Uploaded Excel file is empty", "error");
          return;
        }

        const isRetailer = activeTab === "retailers";
        const parsedItems: any[] = [];
        const errors: string[] = [];

        rawRows.forEach((row, idx) => {
          if (isRetailer) {
            const id = String(row["ID (Mandatory)"] ?? row["ID"] ?? row["id"] ?? row["Retailer ID"] ?? row["retailer_id"] ?? "").trim();
            if (!id) {
              errors.push(`Row ${idx + 2}: Missing ID`);
              return;
            }
            parsedItems.push({
              id,
              display_name: String(row["Display Name"] ?? row["display_name"] ?? row["Name"] ?? id).trim(),
              logo_image: String(row["Logo Image"] ?? row["logo_image"] ?? row["Logo"] ?? "").trim(),
              rank: String(row["Rank"] ?? row["rank"] ?? "").trim(),
              email: String(row["Email"] ?? row["email"] ?? "").trim(),
              payment_terms: String(row["Payment Terms"] ?? row["payment_terms"] ?? row["Terms"] ?? "30d").trim()
            });
          } else {
            const id = String(row["Store ID (Mandatory)"] ?? row["Store ID"] ?? row["store_id"] ?? row["ID"] ?? row["id"] ?? "").trim();
            const retailerId = String(row["Retailer ID (Mandatory)"] ?? row["Retailer ID"] ?? row["retailers_id"] ?? row["retailer_id"] ?? "").trim();
            if (!id) {
              errors.push(`Row ${idx + 2}: Missing Store ID`);
              return;
            }
            parsedItems.push({
              id,
              retailer_id: retailerId,
              retailers_id: retailerId,
              display_name: String(row["Display Name"] ?? row["display_name"] ?? row["Store Name"] ?? id).trim(),
              address: String(row["Address"] ?? row["address"] ?? "").trim(),
              zones: String(row["Zones"] ?? row["zones"] ?? row["Zone"] ?? "").trim(),
              pin_locations: String(row["Pin Locations"] ?? row["pin_locations"] ?? row["Coordinates"] ?? "").trim(),
              status: String(row["Status"] ?? row["status"] ?? "Active").trim(),
              store_rank: String(row["Store Rank"] ?? row["store_rank"] ?? row["Rank"] ?? "").trim()
            });
          }
        });

        if (parsedItems.length === 0) {
          showToast(`No valid records found. ${errors.slice(0, 3).join(", ")}`, "error");
          return;
        }

        setBulkUploadState({
          isOpen: true,
          items: parsedItems,
          fileName: file.name,
          target: isRetailer ? "Retailers" : "Stores",
          errors
        });
      } catch (err: any) {
        showToast("Failed to parse Excel file: " + err.message, "error");
      } finally {
        if (excelFileInputRef.current) {
          excelFileInputRef.current.value = "";
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm and execute bulk upsert
  const handleConfirmBulkUpload = async () => {
    if (!bulkUploadState.items.length) return;
    setBulkUploading(true);
    try {
      const isRetailer = bulkUploadState.target === "Retailers";
      const endpoint = isRetailer ? `${API_BASE}/api/retailers` : `${API_BASE}/api/stores`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_upsert",
          items: bulkUploadState.items
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server returned ${res.status}`);
      }

      const resJson = await res.json();
      if (resJson.error) throw new Error(resJson.error);

      showToast(`Successfully uploaded ${resJson.count || bulkUploadState.items.length} ${bulkUploadState.target}!`, "success");
      setBulkUploadState({ isOpen: false, items: [], fileName: "", target: "Stores", errors: [] });
      
      // Refresh data
      if (isRetailer) {
        await fetchRetailers(false);
      } else {
        await fetchStores(false);
      }
    } catch (err: any) {
      showToast("Bulk upload failed: " + err.message, "error");
    } finally {
      setBulkUploading(false);
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
          headerActions={
            isEditMode ? (
              <CustomButton
                variant="default"
                onClick={() => {
                  setBulkUploadState({
                    isOpen: true,
                    items: [],
                    fileName: "",
                    target: activeTab === "retailers" ? "Retailers" : "Stores",
                    errors: []
                  });
                }}
                title={`Bulk Update ${activeTab === "retailers" ? "Retailers" : "Stores"}`}
              >
                <FileSpreadsheet size={13} className="text-[#0B57D0]" />
                <span>Bulk Update</span>
              </CustomButton>
            ) : null
          }
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

      {/* Bulk Update Modal Component */}
      {bulkUploadState.isOpen && (
        <BulkUpdateModal
          state={bulkUploadState}
          loading={bulkUploading}
          onDownload={handleDownloadTemplate}
          onFileSelect={handleFileSelected}
          onConfirm={handleConfirmBulkUpload}
          onCancel={() => setBulkUploadState({ isOpen: false, items: [], fileName: "", target: "Stores", errors: [] })}
          onResetFile={() => setBulkUploadState(prev => ({ ...prev, items: [], fileName: "", errors: [] }))}
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
                <label className="text-xs font-semibold text-zinc-600">Contact Email</label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="e.g. buyer@retailer.com"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Payment Terms</label>
                <input
                  type="text"
                  value={formData.payment_terms || ""}
                  onChange={(e) => handleChange("payment_terms", e.target.value)}
                  placeholder="e.g. 30d, 60d, 90d, COD"
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

// Bulk Update Window with instructions, download, upload & preview
function BulkUpdateModal({
  state,
  loading,
  onDownload,
  onFileSelect,
  onConfirm,
  onCancel,
  onResetFile
}: {
  state: {
    isOpen: boolean;
    items: any[];
    fileName: string;
    target: "Stores" | "Retailers";
    errors: string[];
  };
  loading: boolean;
  onDownload: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  onResetFile: () => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isRetailer = state.target === "Retailers";
  const hasFile = state.items.length > 0;
  const previewItems = state.items.slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 font-primary p-4">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-lg shadow-xl flex flex-col overflow-hidden animate-tableFadeIn animate-duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-bold text-zinc-950">Bulk Update {state.target}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Update existing records and batch-insert new {state.target.toLowerCase()} via Excel.
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          accept=".xlsx, .xls, .csv"
          className="hidden"
        />

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto min-h-0 flex-1">
          {/* Instruction Steps */}
          <div className="bg-[#F8F9FA] border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
            <div className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
              How Bulk Update Works
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-md border border-slate-200 flex flex-col gap-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B57D0]">
                  <span className="w-5 h-5 rounded-full bg-[#E8F0FE] text-[#0B57D0] flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
                  Download Data
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Download the master file containing all current database records.
                </p>
              </div>

              <div className="bg-white p-3 rounded-md border border-slate-200 flex flex-col gap-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B57D0]">
                  <span className="w-5 h-5 rounded-full bg-[#E8F0FE] text-[#0B57D0] flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
                  Edit or Add New
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Edit values to update records, or append new rows at the bottom to add new ones.
                </p>
              </div>

              <div className="bg-white p-3 rounded-md border border-slate-200 flex flex-col gap-1 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B57D0]">
                  <span className="w-5 h-5 rounded-full bg-[#E8F0FE] text-[#0B57D0] flex items-center justify-center text-[11px] font-bold shrink-0">3</span>
                  Upload File
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Upload your saved Excel file to apply updates and insert new records.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons Section (Download & Upload) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onDownload}
              className="p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-left transition-all flex items-start gap-3 shadow-2xs group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:scale-105 transition-transform">
                <FileSpreadsheet size={20} />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-bold text-zinc-900 group-hover:text-[#0B57D0] transition-colors">
                  1. Download Master File
                </span>
                <span className="text-[11px] text-zinc-500">
                  Export all active {state.target.toLowerCase()} in Excel (.xlsx)
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-left transition-all flex items-start gap-3 shadow-2xs group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-[#E8F0FE] text-[#0B57D0] flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
                <Upload size={20} />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-bold text-zinc-900 group-hover:text-[#0B57D0] transition-colors">
                  2. Upload Excel File
                </span>
                <span className="text-[11px] text-zinc-500">
                  Select and import modified .xlsx spreadsheet
                </span>
              </div>
            </button>
          </div>

          {/* File Selected & Preview Section */}
          {hasFile && (
            <div className="flex flex-col gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    File <span className="font-bold">{state.fileName}</span>: {state.items.length} records ready to bulk upsert
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onResetFile}
                  className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-950 underline cursor-pointer"
                >
                  Clear File
                </button>
              </div>

              {state.errors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                  <AlertCircle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold">Skipped {state.errors.length} invalid rows:</span>
                    <span className="text-[11px] text-amber-700 ml-1">{state.errors.slice(0, 3).join(", ")}</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <div className="text-xs font-bold text-zinc-700">
                  Preview (Showing {previewItems.length} of {state.items.length} records):
                </div>
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-48">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-zinc-600 font-semibold">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">{isRetailer ? "Retailer ID" : "Store ID"}</th>
                        {!isRetailer && <th className="px-3 py-2">Retailer ID</th>}
                        <th className="px-3 py-2">Display Name</th>
                        {!isRetailer && <th className="px-3 py-2">Address</th>}
                        {!isRetailer && <th className="px-3 py-2">Zone</th>}
                        {isRetailer && <th className="px-3 py-2">Email</th>}
                        <th className="px-3 py-2">Rank</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-zinc-800">
                      {previewItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 font-mono text-zinc-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-semibold text-[#0B57D0]">{item.id}</td>
                          {!isRetailer && <td className="px-3 py-2 text-zinc-600">{item.retailer_id || "-"}</td>}
                          <td className="px-3 py-2 font-medium">{item.display_name}</td>
                          {!isRetailer && <td className="px-3 py-2 text-zinc-500 max-w-[200px] truncate">{item.address || "-"}</td>}
                          {!isRetailer && <td className="px-3 py-2 text-zinc-600">{item.zones || "-"}</td>}
                          {isRetailer && <td className="px-3 py-2 text-zinc-500">{item.email || "-"}</td>}
                          <td className="px-3 py-2 text-zinc-600">{item.rank || item.store_rank || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="h-9 px-4 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-100 hover:text-zinc-950 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {hasFile ? "Cancel" : "Close"}
          </button>
          {hasFile && (
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-98 flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Uploading {state.items.length} records...</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Confirm & Save {state.items.length} Records</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
