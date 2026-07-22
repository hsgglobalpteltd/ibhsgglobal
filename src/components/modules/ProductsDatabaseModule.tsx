"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { Upload, X } from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";

const defaultBrandColumns: Column[] = [
  { id: "ID", header: "ID", accessor: "ID" },
  { id: "Display Name", header: "Display Name", accessor: "Display Name" },
  { id: "Logo Image", header: "Logo Image", accessor: "Logo Image" },
  { id: "Rank", header: "Rank", accessor: "Rank" }
];

const defaultProductColumns: Column[] = [
  { id: "SKU", header: "SKU", accessor: "SKU" },
  { id: "Brand Name", header: "Brand Name", accessor: "Brand Name" },
  { id: "Display Name", header: "Display Name", accessor: "Display Name" },
  { id: "Image", header: "Image", accessor: "Image" },
  { id: "Carton", header: "Carton", accessor: "Carton" },
  { id: "Cost", header: "Cost", accessor: "Cost" },
  { id: "Rank", header: "Rank", accessor: "Rank" },
  { id: "Status", header: "Status", accessor: "Status" },
  { id: "Single Barcode", header: "Single Barcode", accessor: "Single Barcode" },
  { id: "Carton Barcode", header: "Carton Barcode", accessor: "Carton Barcode" },
  { id: " Carton Weight", header: "Carton Weight", accessor: " Carton Weight" }
];

interface ProductsDatabaseModuleProps {
  profile?: {
    role: string;
  } | null;
}

export function ProductsDatabaseModule({ profile }: ProductsDatabaseModuleProps) {
  const tabs = [
    { id: "products", label: "Products", desc: "Manage product SKUs, pricing structures, status, and details." },
    { id: "brands", label: "Brands", desc: "Manage catalog brands, rankings, and logo image assets." }
  ];
  const [activeTab, setActiveTab] = React.useState<"brands" | "products">("products");
  const [data, setData] = React.useState<any[]>([]);
  const [columns, setColumns] = React.useState<Column[]>(defaultProductColumns);
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
  const [editingBrand, setEditingBrand] = React.useState<any | null>(null);
  const [editingProduct, setEditingProduct] = React.useState<any | null>(null);

  // Helper to fetch fresh data from worker
  const fetchFreshData = async (sheetName: "brands_DB" | "products_DB", forceSync = false) => {
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
      const currentTabSheet = activeTab === "brands" ? "brands_DB" : "products_DB";
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
      const allKeys = Object.keys(items[0]);
      const keys = allKeys.filter(key => {
        const hasUpperCaseEquivalent = allKeys.some(otherKey => 
          otherKey !== key && 
          otherKey.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, '') &&
          otherKey !== otherKey.toLowerCase()
        );
        return !hasUpperCaseEquivalent;
      });

      const cols = keys.map((key) => {
        // Replace Brands ID column with Brand Name for products database visual rendering
        if (activeTab === "products" && key === "Brands ID") {
          return {
            id: "Brand Name",
            header: "Brand Name",
            accessor: "Brand Name"
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
      setColumns(activeTab === "brands" ? defaultBrandColumns : defaultProductColumns);
    }
  };

  // Helper to read brands catalog for dropdown lookup
  const getBrandsList = (): any[] => {
    const cached = localStorage.getItem("brands_DB_data");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // Preprocess products list to swap Brands ID for looked up Brand Name
  const processedData = React.useMemo(() => {
    if (activeTab !== "products") return data;
    const brandsList = getBrandsList();
    return data.map((product) => {
      const brandId = product["Brands ID"];
      const brand = brandsList.find((b) => String(b.ID) === String(brandId));
      return {
        ...product,
        "Brand Name": brand ? brand["Display Name"] : (brandId || "")
      };
    });
  }, [data, activeTab]);

  // On mount: prefetch both brand and product tables silently
  React.useEffect(() => {
    fetchFreshData("brands_DB", false);
    fetchFreshData("products_DB", false);

    // Trigger silent background sync after mount
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("db-refresh"));
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Sync data when activeTab changes, loading from localStorage first
  React.useEffect(() => {
    const sheet = activeTab === "brands" ? "brands_DB" : "products_DB";
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
      const sheet = activeTab === "brands" ? "brands_DB" : "products_DB";
      await fetchFreshData(sheet, true);
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
      const sheet = activeTab === "brands" ? "brands_DB" : "products_DB";
      fetchFreshData(sheet, true);
    }
  };

  // Intercept row edit pencil triggers
  const handleEditRow = (row: any) => {
    if (activeTab === "brands") {
      setEditingBrand(row);
    } else {
      setEditingProduct(row);
    }
  };

  // Triggered by the "Add New" button in the table header
  const handleAddNew = () => {
    if (activeTab === "brands") {
      setEditingBrand({ isNew: true, ID: "", "Display Name": "", "Logo Image": "", Rank: "" });
    } else {
      setEditingProduct({
        isNew: true,
        SKU: "",
        "Brands ID": "",
        "Display Name": "",
        Image: "",
        Carton: "",
        Cost: "",
        Rank: "",
        Status: "Active",
        "Single Barcode": "",
        "Carton Barcode": "",
        " Carton Weight": ""
      });
    }
  };

  // Save changes to GAS (handles both updates and additions)
  const handleSaveItem = async (updatedItem: any) => {
    const sheet = activeTab === "brands" ? "brands_DB" : "products_DB";
    const idKey = activeTab === "brands" ? "ID" : "SKU";
    const previousData = [...data];
    const isNew = !!updatedItem.isNew;

    // 1. Instantly close modals
    setEditingBrand(null);
    setEditingProduct(null);

    // 2. Prepare clean data
    const cleanData = { ...updatedItem };
    delete cleanData.id;
    delete cleanData.isNew;
    delete cleanData["Brand Name"];

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
    const sheet = activeTab === "brands" ? "brands_DB" : "products_DB";
    const idKey = activeTab === "brands" ? "ID" : "SKU";

    const targetItem = data.find(
      (item) => String(item.id || item[idKey]) === String(rowId) || String(item[idKey]) === String(rowId)
    );
    if (!targetItem) return;



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
          columns={columns}
          data={processedData}
          userRole={userRole}
          title={`${activeTab === "brands" ? "Brands" : "Products"} Record`}
          fetching={fetching}
          syncStatus={syncStatus}
          onEditModeChange={handleEditModeChange}
          onEditRow={handleEditRow}
          onDeleteRow={handleDeleteRow}
          onAddNew={handleAddNew}
          addNewText={activeTab === "brands" ? "Add Brand" : "Add Product"}
          height="h-full"
        />
      </div>

      {/* Brand Edit Modal Component */}
      {editingBrand && (
        <BrandEditForm
          brand={editingBrand}
          onSave={handleSaveItem}
          onCancel={() => setEditingBrand(null)}
        />
      )}

      {/* Product Edit Modal Component */}
      {editingProduct && (
        <ProductEditForm
          product={editingProduct}
          brands={getBrandsList()}
          onSave={handleSaveItem}
          onCancel={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}

// Brand Form Sub-component
function BrandEditForm({ brand, onSave, onCancel }: { brand: any; onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [formData, setFormData] = React.useState({ ...brand });
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isNew = !!brand.isNew;

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
          <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">{isNew ? "Add Brand" : "Edit Brand"}</h3>
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Rank</label>
            <input
              type="text"
              value={formData.Rank !== undefined ? formData.Rank : ""}
              onChange={(e) => handleChange("Rank", e.target.value)}
              className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
            />
          </div>
          
          {/* Generic fields editor for other sheets scale-up */}
          {Object.keys(formData)
            .filter((k) => {
              if (["ID", "Display Name", "Logo Image", "Rank", "id", "isNew"].includes(k)) return false;
              const hasUpperCaseEquivalent = Object.keys(formData).some(otherKey => 
                otherKey !== k && 
                otherKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '') &&
                otherKey !== otherKey.toLowerCase()
              );
              return !hasUpperCaseEquivalent;
            })
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

// Product Form Sub-component
function ProductEditForm({ product, brands, onSave, onCancel }: { product: any; brands: any[]; onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [formData, setFormData] = React.useState({ ...product });
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isNew = !!product.isNew;

  const handleChange = (key: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const filename = `asset/products/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const currentImage = formData["Image"];
      const deleteQuery = currentImage ? `&deleteUrl=${encodeURIComponent(currentImage)}` : "";
      const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(filename)}${deleteQuery}`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      if (json.success && json.url) {
        handleChange("Image", json.url);
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
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-lg p-6 shadow-xl flex flex-col gap-4 animate-tableFadeIn animate-duration-200 max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200">
          <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">{isNew ? "Add Product" : "Edit Product"}</h3>
          <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-800 focus:outline-none cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">SKU (Primary Key)</label>
            <input
              type="text"
              value={formData.SKU || ""}
              disabled={!isNew}
              onChange={(e) => handleChange("SKU", e.target.value)}
              required
              className={`w-full text-xs rounded px-3 py-2 font-semibold outline-none border ${
                !isNew 
                  ? "bg-[#F0F4F9] border-slate-200 text-zinc-500 cursor-not-allowed" 
                  : "bg-[#F0F4F9] border-slate-200 text-zinc-900 focus:border-blue-400"
              }`}
            />
          </div>
 
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Brand (Assign to Brand)</label>
            <select
              value={formData["Brands ID"] || ""}
              onChange={(e) => handleChange("Brands ID", e.target.value)}
              required
              className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold cursor-pointer"
            >
              <option value="">-- Select Brand --</option>
              {brands.map((b) => (
                <option key={b.ID} value={b.ID}>
                  {b["Display Name"] || b.ID} ({b.ID})
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
              className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Product Image</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData["Image"] || ""}
                onChange={(e) => handleChange("Image", e.target.value)}
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
            {formData["Image"] && (
              <div className="mt-1.5 border border-slate-200 rounded overflow-hidden h-24 bg-[#F0F4F9] flex items-center justify-center relative group">
                <img src={formData["Image"]} alt="Preview" className="max-h-full max-w-full object-contain" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Carton</label>
            <input
              type="text"
              value={formData.Carton !== undefined ? formData.Carton : ""}
              onChange={(e) => handleChange("Carton", e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>
 
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Cost</label>
            <input
              type="text"
              value={formData.Cost !== undefined ? formData.Cost : ""}
              onChange={(e) => handleChange("Cost", e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>
 
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Rank</label>
            <input
              type="text"
              value={formData.Rank !== undefined ? formData.Rank : ""}
              onChange={(e) => handleChange("Rank", e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>
 
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Status</label>
            <select
              value={formData.Status || "Active"}
              onChange={(e) => handleChange("Status", e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
 
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Single Barcode</label>
            <input
              type="text"
              value={formData["Single Barcode"] !== undefined ? formData["Single Barcode"] : ""}
              onChange={(e) => handleChange("Single Barcode", e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>
 
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Carton Barcode</label>
            <input
              type="text"
              value={formData["Carton Barcode"] !== undefined ? formData["Carton Barcode"] : ""}
              onChange={(e) => handleChange("Carton Barcode", e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>
 
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Carton Weight</label>
            <input
              type="text"
              value={formData[" Carton Weight"] !== undefined ? formData[" Carton Weight"] : ""}
              onChange={(e) => handleChange(" Carton Weight", e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-500 font-semibold"
            />
          </div>

          {/* Generic fields editor for other sheets scale-up */}
          {Object.keys(formData)
            .filter((k) => {
              if (["SKU", "Brands ID", "Brand Name", "Display Name", "Image", "Carton", "Cost", "Rank", "Status", "Single Barcode", "Carton Barcode", " Carton Weight", "id", "isNew"].includes(k)) return false;
              const hasUpperCaseEquivalent = Object.keys(formData).some(otherKey => 
                otherKey !== k && 
                otherKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '') &&
                otherKey !== otherKey.toLowerCase()
              );
              return !hasUpperCaseEquivalent;
            })
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
