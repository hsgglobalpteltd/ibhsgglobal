"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { Upload, X } from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";

const defaultBrandColumns: Column[] = [
  { id: 'id', header: 'id', accessor: 'id' },
  { id: "Display Name", header: "Display Name", accessor: "Display Name" },
  { id: "Description", header: "Description", accessor: "Description" },
  { id: "Logo Image", header: "Logo Image", accessor: "Logo Image" },
  { id: "Rank", header: "Rank", accessor: "Rank" }
];

function normalizeKeysToPretty(item: any): any {
  if (!item) return item;
  const pretty: any = {};
  const map: Record<string, string> = {
    sku: "sku",
    brands_id: "Brands ID",
    display_name: "Display Name",
    description: "Description",
    image: "Image",
    carton: "Carton",
    cost: "Cost",
    rank: "Rank",
    status: "Status",
    single_barcode: "Single Barcode",
    carton_barcode: "Carton Barcode",
    carton_weight: " Carton Weight",
    carton_h_mm: "Carton H (mm)",
    carton_w_mm: "Carton W (mm)",
    carton_l_mm: "Carton L (mm)",
    pallet_ctn: "Pallet CTN",
    storage_condition: "Storage Condition",
    shelf_life: "Shelf Life",
    id: "id",
    logo_image: "Logo Image",
  };

  const isNew = !!item.isNew;
  for (const [k, v] of Object.entries(item)) {
    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    let matchedKey = k;
    for (const [mk, mv] of Object.entries(map)) {
      if (mk.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanK) {
        matchedKey = mv;
        break;
      }
    }
    pretty[matchedKey] = v;
  }
  if (isNew) {
    pretty.isNew = true;
  }
  return pretty;
}

function normalizeKeysToRaw(item: any): any {
  if (!item) return item;
  const raw: any = {};
  const map: Record<string, string> = {
    sku: "sku",
    brandsid: "brands_id",
    displayname: "display_name",
    description: "description",
    image: "image",
    carton: "carton",
    cost: "cost",
    rank: "rank",
    status: "status",
    singlebarcode: "single_barcode",
    cartonbarcode: "carton_barcode",
    cartonweight: "carton_weight",
    cartonhmm: "carton_h_mm",
    cartonwmm: "carton_w_mm",
    cartonlmm: "carton_l_mm",
    palletctn: "pallet_ctn",
    storagecondition: "storage_condition",
    shelflife: "shelf_life",
    id: "id",
    logoimage: "logo_image"
  };

  const isNew = !!item.isNew;
  for (const [k, v] of Object.entries(item)) {
    if (k === "isNew") continue;
    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    let matchedKey = k.toLowerCase();
    if (map[cleanK]) {
      matchedKey = map[cleanK];
    }
    raw[matchedKey] = v;
  }
  if (isNew) {
    raw.isNew = true;
  }
  return raw;
}

const defaultProductColumns: Column[] = [
  { id: 'sku', header: 'sku', accessor: 'sku' },
  { id: "Brand Name", header: "Brand Name", accessor: "Brand Name" },
  { id: "Display Name", header: "Display Name", accessor: "Display Name" },
  { id: "Image", header: "Image", accessor: "Image" },
  { id: "Carton", header: "Carton", accessor: "Carton" },
  { id: "Cost", header: "Cost", accessor: "Cost" },
  { id: "Rank", header: "Rank", accessor: "Rank" },
  { id: "Status", header: "Status", accessor: "Status" },
  { id: "Single Barcode", header: "Single Barcode", accessor: "Single Barcode" },
  { id: "Carton Barcode", header: "Carton Barcode", accessor: "Carton Barcode" },
  { id: " Carton Weight", header: "Carton Weight", accessor: " Carton Weight" },
  { id: "Carton H (mm)", header: "Carton H (mm)", accessor: "Carton H (mm)" },
  { id: "Carton W (mm)", header: "Carton W (mm)", accessor: "Carton W (mm)" },
  { id: "Carton L (mm)", header: "Carton L (mm)", accessor: "Carton L (mm)" },
  { id: "Pallet CTN", header: "Pallet CTN", accessor: "Pallet CTN" },
  { id: "Storage Condition", header: "Storage Condition", accessor: "Storage Condition" },
  { id: "Shelf Life", header: "Shelf Life", accessor: "Shelf Life" }
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
        // Force Cloudflare Worker to update Database from Google Sheets
        const syncRes = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db?table=${sheetName}`, {
          method: "POST"
        });
        if (!syncRes.ok) throw new Error("Failed to refresh server cache");
      }

      const res = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db?table=${sheetName}`);
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
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey === "productmeta" || cleanKey === "listincatalog") {
          return false;
        }
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
      const brand = brandsList.find((b) => String(b.id) === String(brandId));
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
      setEditingBrand({ isNew: true, id: "", "Display Name": "", "Logo Image": "", Rank: "" });
    } else {
      setEditingProduct({
        isNew: true,
        sku: "",
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
    const idKey = activeTab === "brands" ? 'id' : 'sku';
    const previousData = [...data];
    const isNew = !!updatedItem.isNew;

    // 1. Instantly close modals
    setEditingBrand(null);
    setEditingProduct(null);

    // 2. Prepare clean data
    const cleanData = { ...updatedItem };
    if (activeTab !== "brands") {
      delete cleanData.id;
    }
    delete cleanData.isNew;
    delete cleanData["Brand Name"];

    const rawCleanData = normalizeKeysToRaw(cleanData);

    // Validation check for duplicates
    if (isNew) {
      if (!rawCleanData[idKey] || !String(rawCleanData[idKey]).trim()) {
        showToast(`Save failed: ${idKey} is required!`, "error");
        return;
      }
      const exists = data.some(
        (item) => String(item[idKey]).trim().toLowerCase() === String(rawCleanData[idKey]).trim().toLowerCase()
      );
      if (exists) {
        showToast(`Save failed: A record with this ${idKey} already exists!`, "error");
        return;
      }
    }

    // 3. Optimistically update local state & localStorage
    let updatedList;
    if (isNew) {
      updatedList = [...data, rawCleanData];
    } else {
      updatedList = data.map((item) =>
        String(item[idKey]) === String(rawCleanData[idKey]) ? { ...item, ...rawCleanData } : item
      );
    }
    setData(updatedList);
    localStorage.setItem(`${sheet}_data`, JSON.stringify(updatedList));



    // 4. Perform network request in background
    (async () => {
      try {
        const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db-write", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sheet,
            action: isNew ? "insert" : "update",
            data: rawCleanData
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

        // Silent refresh of Database from server in background
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
    const idKey = activeTab === "brands" ? 'id' : 'sku';

    const targetItem = data.find(
      (item) => String(item.id || item[idKey]) === String(rowId) || String(item[idKey]) === String(rowId)
    );
    if (!targetItem) return;



    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db-write", {
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
            {activeTab === "brands" ? "Brands Master Registry" : "Products Master Database"}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeTab === "brands"
              ? "Manage brand profiles, display names, logos, and display rankings."
              : "Master catalog of active SKUs, barcodes, packaging specifications, UOM, and brand assignments."}
          </p>
        </div>
      </div>

      {/* 3. DATA TABLE BODY */}
      <div className="flex-1 w-full overflow-hidden min-h-0">
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
  const [formData, setFormData] = React.useState(() => normalizeKeysToPretty(brand));
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
      const res = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(filename)}`, {
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 font-primary p-4">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-lg shadow-xl flex flex-col overflow-hidden animate-tableFadeIn animate-duration-200">
        {/* Dialog Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-bold text-zinc-950">{isNew ? "Add Brand" : "Edit Brand"}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Configure brand identity, display name, and catalog logo asset.</p>
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
            {/* Brand Logo on top */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Brand Logo</label>
              <div className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-lg border border-slate-200">
                <div className="w-20 h-20 aspect-square rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {formData["Logo Image"] ? (
                    <img src={formData["Logo Image"]} alt="Brand Logo" className="w-full h-full object-contain p-1.5" />
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
                      {uploading ? "Uploading..." : formData["Logo Image"] ? "Change Logo" : "Upload Logo"}
                    </button>
                    {formData["Logo Image"] && (
                      <button
                        type="button"
                        onClick={() => handleChange("Logo Image", "")}
                        className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 transition-all cursor-pointer shadow-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500">1:1 square brand logo asset</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Brand ID</label>
                <input
                  type="text"
                  value={formData.id || ""}
                  disabled={!isNew}
                  onChange={(e) => handleChange('id', e.target.value)}
                  placeholder="e.g. BRAND_01"
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
                  value={formData.Rank !== undefined ? formData.Rank : ""}
                  onChange={(e) => handleChange("Rank", e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Display Name</label>
              <input
                type="text"
                value={formData["Display Name"] || ""}
                onChange={(e) => handleChange("Display Name", e.target.value)}
                placeholder="Official brand display name"
                required
                className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Brand Description</label>
              <textarea
                value={formData["Description"] || ""}
                onChange={(e) => handleChange("Description", e.target.value)}
                placeholder="Brand story, background, and culinary profile..."
                rows={3}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium resize-none transition-all"
              />
            </div>

            {/* Extra fields if dynamically present */}
            {Object.keys(formData)
              .filter((k) => {
                if (['id', "Display Name", "Description", "Logo Image", "Rank", "isNew"].includes(k)) return false;
                const hasUpperCaseEquivalent = Object.keys(formData).some(otherKey => 
                  otherKey !== k && 
                  otherKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '') &&
                  otherKey !== otherKey.toLowerCase()
                );
                return !hasUpperCaseEquivalent;
              })
              .map((key) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">{key}</label>
                  <input
                    type="text"
                    value={formData[key] !== undefined ? formData[key] : ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                  />
                </div>
              ))}
          </div>

          {/* Dialog Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-100 hover:text-zinc-950 transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs active:scale-98"
            >
              {isNew ? "Create Brand" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Product Form Sub-component
function ProductEditForm({ product, brands, onSave, onCancel }: { product: any; brands: any[]; onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [formData, setFormData] = React.useState(() => normalizeKeysToPretty(product));
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
      const res = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(filename)}${deleteQuery}`, {
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 font-primary p-4">
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-lg shadow-xl flex flex-col overflow-hidden animate-tableFadeIn animate-duration-200">
        {/* Dialog Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-bold text-zinc-950">{isNew ? "Add Product" : "Edit Product"}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Configure SKU identifiers, pricing, barcodes, and packaging specifications.</p>
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
            {/* 1:1 Product Image on top */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Product Image</label>
              <div className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-lg border border-slate-200">
                <div className="w-20 h-20 aspect-square rounded-lg border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {formData["Image"] ? (
                    <img src={formData["Image"]} alt="Product Preview" className="w-full h-full object-contain p-1.5" />
                  ) : (
                    <div className="text-center text-zinc-400 p-1">
                      <Upload size={16} className="mx-auto mb-0.5 opacity-50" />
                      <span className="text-[10px] block leading-tight font-medium">No Image</span>
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
                      {uploading ? "Uploading..." : formData["Image"] ? "Change Image" : "Upload Image"}
                    </button>
                    {formData["Image"] && (
                      <button
                        type="button"
                        onClick={() => handleChange("Image", "")}
                        className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-red-600 transition-all cursor-pointer shadow-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500">1:1 square product packshot image</span>
                </div>
              </div>
            </div>

            {/* Primary Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">SKU Code</label>
                <input
                  type="text"
                  value={formData.sku || ""}
                  disabled={!isNew}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  placeholder="e.g. SKU-1001"
                  required
                  className={`w-full h-9 text-xs px-3 rounded-lg border font-medium outline-none transition-all ${
                    !isNew 
                      ? "bg-slate-50 border-slate-200 text-zinc-400 cursor-not-allowed" 
                      : "bg-white border-slate-200 text-zinc-900 focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Assigned Brand</label>
                <select
                  value={formData["Brands ID"] || ""}
                  onChange={(e) => handleChange("Brands ID", e.target.value)}
                  required
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium cursor-pointer transition-all"
                >
                  <option value="">Select Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b["Display Name"] || b.id} ({b.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Display Name</label>
              <input
                type="text"
                value={formData["Display Name"] || ""}
                onChange={(e) => handleChange("Display Name", e.target.value)}
                placeholder="Full product title with size / variant"
                required
                className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
              />
            </div>

            {/* Pricing, Packaging & Status */}
            <div className="grid grid-cols-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Carton UOM</label>
                <input
                  type="text"
                  placeholder="e.g. 24"
                  value={formData.Carton !== undefined ? formData.Carton : ""}
                  onChange={(e) => handleChange("Carton", e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Cost ($)</label>
                <input
                  type="text"
                  placeholder="0.00"
                  value={formData.Cost !== undefined ? formData.Cost : ""}
                  onChange={(e) => handleChange("Cost", e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Rank</label>
                <input
                  type="text"
                  placeholder="e.g. 1"
                  value={formData.Rank !== undefined ? formData.Rank : ""}
                  onChange={(e) => handleChange("Rank", e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Status</label>
                <select
                  value={formData.Status || "Active"}
                  onChange={(e) => handleChange("Status", e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium cursor-pointer transition-all"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Barcodes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Single Barcode</label>
                <input
                  type="text"
                  placeholder="Single unit barcode"
                  value={formData["Single Barcode"] !== undefined ? formData["Single Barcode"] : ""}
                  onChange={(e) => handleChange("Single Barcode", e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Carton Barcode</label>
                <input
                  type="text"
                  placeholder="Carton outer barcode"
                  value={formData["Carton Barcode"] !== undefined ? formData["Carton Barcode"] : ""}
                  onChange={(e) => handleChange("Carton Barcode", e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>
            </div>

            {/* Carton Specifications */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-600">Carton Specifications (Weight & Dimensions)</label>
              <div className="grid grid-cols-4 gap-2.5">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Weight"
                    value={formData[" Carton Weight"] !== undefined ? formData[" Carton Weight"] : ""}
                    onChange={(e) => handleChange(" Carton Weight", e.target.value)}
                    className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg pl-3 pr-6 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                  />
                  <span className="absolute right-2.5 text-[10px] font-semibold text-zinc-400">g</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Height"
                    value={formData["Carton H (mm)"] !== undefined ? formData["Carton H (mm)"] : ""}
                    onChange={(e) => handleChange("Carton H (mm)", e.target.value)}
                    className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg pl-3 pr-8 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                  />
                  <span className="absolute right-2.5 text-[10px] font-semibold text-zinc-400">mm</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Width"
                    value={formData["Carton W (mm)"] !== undefined ? formData["Carton W (mm)"] : ""}
                    onChange={(e) => handleChange("Carton W (mm)", e.target.value)}
                    className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg pl-3 pr-8 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                  />
                  <span className="absolute right-2.5 text-[10px] font-semibold text-zinc-400">mm</span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Length"
                    value={formData["Carton L (mm)"] !== undefined ? formData["Carton L (mm)"] : ""}
                    onChange={(e) => handleChange("Carton L (mm)", e.target.value)}
                    className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg pl-3 pr-8 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                  />
                  <span className="absolute right-2.5 text-[10px] font-semibold text-zinc-400">mm</span>
                </div>
              </div>
            </div>

            {/* Logistics & Storage Specs - 3 Column Input Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Pallet CTN</label>
                <input
                  type="text"
                  placeholder="e.g. 55"
                  value={formData["Pallet CTN"] !== undefined ? formData["Pallet CTN"] : ""}
                  onChange={(e) => handleChange("Pallet CTN", e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Storage Condition</label>
                <input
                  type="text"
                  placeholder="e.g. 15°-25°C"
                  value={formData["Storage Condition"] !== undefined ? formData["Storage Condition"] : ""}
                  onChange={(e) => handleChange("Storage Condition", e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Shelf Life</label>
                <input
                  type="text"
                  placeholder="e.g. 12 Months"
                  value={formData["Shelf Life"] !== undefined ? formData["Shelf Life"] : ""}
                  onChange={(e) => handleChange("Shelf Life", e.target.value)}
                  className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                />
              </div>
            </div>

            {/* Extra Dynamic Fields */}
            {Object.keys(formData)
              .filter((k) => {
                if (['sku', "Brands ID", "Brand Name", "Display Name", "Image", "Carton", "Cost", "Rank", "Status", "Single Barcode", "Carton Barcode", " Carton Weight", "Carton H (mm)", "Carton W (mm)", "Carton L (mm)", "Pallet CTN", "Storage Condition", "Shelf Life", "id", "isNew"].includes(k)) return false;
                const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cleanK === "productmeta" || cleanK === "listincatalog") return false;
                const hasUpperCaseEquivalent = Object.keys(formData).some(otherKey => 
                  otherKey !== k && 
                  otherKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '') &&
                  otherKey !== otherKey.toLowerCase()
                );
                return !hasUpperCaseEquivalent;
              })
              .map((key) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">{key}</label>
                  <input
                    type="text"
                    value={formData[key] !== undefined ? formData[key] : ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full h-9 text-xs bg-white border border-slate-200 rounded-lg px-3 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-medium transition-all"
                  />
                </div>
              ))}
          </div>

          {/* Dialog Footer */}
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-100 hover:text-zinc-950 transition-all cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-[#0B57D0] bg-[#0B57D0] hover:bg-[#0842A0] text-white transition-all cursor-pointer shadow-xs active:scale-98"
            >
              {isNew ? "Create Product" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

