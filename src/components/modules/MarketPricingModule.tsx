"use client";

import * as React from "react";
import { showToast } from "@/lib/toast";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  History,
  Tag,
  Building2,
  Check,
  X,
  Clock,
  ArrowRight,
  TrendingUp,
  Percent,
  Layers,
  Sparkles,
  AlertCircle
} from "lucide-react";

interface MarketPricingModuleProps {
  profile?: {
    role: string;
    name?: string;
    email?: string;
  } | null;
}

interface PriceSheet {
  id: string;
  name: string;
  retailer_ids: string[] | string;
  description?: string;
  created_at?: number;
  updated_at?: number;
}

interface PriceItem {
  id: string;
  sheet_id: string;
  product_sku: string;
  product_name: string;
  retailer_sku: string;
  store_tier: string;
  cost_price: number | null;
  market_price: number | null;
  promo_price: number | null;
  promo_name: string | null;
  promo_start: string | null;
  promo_end: string | null;
  uom: string;
  pack_size: string;
  status: string;
  price_logs: string | any[];
  created_at?: number;
  updated_at?: number;
}

interface PriceLogEntry {
  action: string;
  old_cost?: number | null;
  new_cost?: number | null;
  old_market?: number | null;
  new_market?: number | null;
  promo_name?: string | null;
  promo_price?: number | null;
  promo_start?: string | null;
  promo_end?: string | null;
  remark?: string;
  action_by?: string;
  timestamp: number;
}

const API_BASE = "https://ib-v2.hsgglobalpteltd.workers.dev";

export function MarketPricingModule({ profile }: MarketPricingModuleProps) {
  const userRole = React.useMemo(() => {
    const role = profile?.role;
    if (role === "Administrator" || role === "Manager") return "admin";
    if (role === "Operator" || role === "Operation") return "operator";
    return "viewer";
  }, [profile]);

  // Data States
  const [sheets, setSheets] = React.useState<PriceSheet[]>([]);
  const [selectedSheetId, setSelectedSheetId] = React.useState<string>("");
  const [items, setItems] = React.useState<PriceItem[]>([]);
  const [retailers, setRetailers] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [loadingSheets, setLoadingSheets] = React.useState(false);
  const [loadingItems, setLoadingItems] = React.useState(false);

  // Search & Filters
  const [sheetSearch, setSheetSearch] = React.useState("");
  const [itemSearch, setItemSearch] = React.useState("");
  const [addProductSearch, setAddProductSearch] = React.useState("");
  const [addProductBrandFilter, setAddProductBrandFilter] = React.useState("all");

  // Selection for bulk actions
  const [selectedItemIds, setSelectedItemIds] = React.useState<Set<string>>(new Set());

  // Modals
  const [isSheetModalOpen, setIsSheetModalOpen] = React.useState(false);
  const [editingSheet, setEditingSheet] = React.useState<Partial<PriceSheet> | null>(null);

  const [isAddProductsModalOpen, setIsAddProductsModalOpen] = React.useState(false);
  const [selectedSkusToAdd, setSelectedSkusToAdd] = React.useState<Set<string>>(new Set());
  const [defaultStoreTier, setDefaultStoreTier] = React.useState("Standard");

  const [isEditItemModalOpen, setIsEditItemModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<PriceItem | null>(null);

  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = React.useState(false);
  const [bulkCostPrice, setBulkCostPrice] = React.useState("");
  const [bulkMarketPrice, setBulkMarketPrice] = React.useState("");
  const [bulkPriceRemark, setBulkPriceRemark] = React.useState("");

  const [isBulkPromoModalOpen, setIsBulkPromoModalOpen] = React.useState(false);
  const [bulkPromoName, setBulkPromoName] = React.useState("");
  const [bulkPromoPrice, setBulkPromoPrice] = React.useState("");
  const [bulkPromoStart, setBulkPromoStart] = React.useState("");
  const [bulkPromoEnd, setBulkPromoEnd] = React.useState("");
  const [bulkPromoRemark, setBulkPromoRemark] = React.useState("");

  // History Drawer State
  const [historyDrawerItem, setHistoryDrawerItem] = React.useState<PriceItem | null>(null);

  // Custom Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmButtonClass?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  // Initial Load: Retailers & Products
  React.useEffect(() => {
    fetchRetailersAndProducts();
    fetchSheets();
  }, []);

  const fetchRetailersAndProducts = async () => {
    try {
      const [retRes, prodRes, brandRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/db?table=retailers_DB`),
        fetch(`${API_BASE}/api/admin/db?table=products_DB`),
        fetch(`${API_BASE}/api/admin/db?table=brands_DB`)
      ]);
      if (retRes.ok) {
        const retData = await retRes.json();
        setRetailers(Array.isArray(retData) ? retData : retData.value || []);
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(Array.isArray(prodData) ? prodData : prodData.value || []);
      }
      if (brandRes.ok) {
        const brandData = await brandRes.json();
        setBrands(Array.isArray(brandData) ? brandData : brandData.value || []);
      }
    } catch (err) {
      console.error("Error loading baseline data:", err);
    }
  };

  const fetchSheets = async () => {
    setLoadingSheets(true);
    try {
      const res = await fetch(`${API_BASE}/api/market-pricing/sheets`);
      if (!res.ok) throw new Error("Failed to fetch price sheets");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setSheets(list);
      if (list.length > 0 && !selectedSheetId) {
        setSelectedSheetId(list[0].id);
      }
    } catch (err: any) {
      showToast("Error loading sheets: " + err.message, "error");
    } finally {
      setLoadingSheets(false);
    }
  };

  const fetchItems = async (sheetId: string) => {
    if (!sheetId) return;
    setLoadingItems(true);
    try {
      const res = await fetch(`${API_BASE}/api/market-pricing/items?sheet_id=${encodeURIComponent(sheetId)}`);
      if (!res.ok) throw new Error("Failed to fetch sheet items");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
      setSelectedItemIds(new Set()); // Reset selection
    } catch (err: any) {
      showToast("Error loading items: " + err.message, "error");
    } finally {
      setLoadingItems(false);
    }
  };

  // Fetch items when active sheet changes
  React.useEffect(() => {
    if (selectedSheetId) {
      fetchItems(selectedSheetId);
    } else {
      setItems([]);
    }
  }, [selectedSheetId]);

  // Find Retailer Name Helper
  const getRetailerName = (id: string) => {
    const found = retailers.find((r) => String(r.id || r.ID) === String(id));
    return found ? found.display_name || found["Display Name"] || found.name || `Retailer #${id}` : `Retailer #${id}`;
  };

  // Retailer Assignment Map (Check which retailer belongs to which sheet)
  const assignedRetailersMap = React.useMemo(() => {
    const map = new Map<string, string>(); // retailer_id -> sheet_name
    sheets.forEach((s) => {
      let rIds: string[] = [];
      try {
        rIds = typeof s.retailer_ids === "string" ? JSON.parse(s.retailer_ids) : (s.retailer_ids || []);
      } catch {
        rIds = [];
      }
      rIds.forEach((rid) => {
        map.set(String(rid), s.name);
      });
    });
    return map;
  }, [sheets]);

  // Filtered Sheets
  const filteredSheets = React.useMemo(() => {
    if (!sheetSearch.trim()) return sheets;
    const q = sheetSearch.toLowerCase();
    return sheets.filter((s) => {
      const matchName = s.name?.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q);
      let rIds: string[] = [];
      try {
        rIds = typeof s.retailer_ids === "string" ? JSON.parse(s.retailer_ids) : (s.retailer_ids || []);
      } catch {}
      const matchRetailer = rIds.some((rid) => getRetailerName(rid).toLowerCase().includes(q));
      return matchName || matchDesc || matchRetailer;
    });
  }, [sheets, sheetSearch, retailers]);

  // Active Sheet Object
  const activeSheet = React.useMemo(() => {
    return sheets.find((s) => s.id === selectedSheetId) || null;
  }, [sheets, selectedSheetId]);

  // Parsed Retailers for Active Sheet
  const activeSheetRetailerIds: string[] = React.useMemo(() => {
    if (!activeSheet) return [];
    try {
      return typeof activeSheet.retailer_ids === "string"
        ? JSON.parse(activeSheet.retailer_ids)
        : (activeSheet.retailer_ids || []);
    } catch {
      return [];
    }
  }, [activeSheet]);

  // Find Brand Name Helper
  const getBrandName = (brandId: string) => {
    const found = brands.find((b) => String(b.id || b.ID) === String(brandId));
    return found ? found.display_name || found["Display Name"] || found.name || brandId : brandId;
  };

  // Filtered and Brand-Sorted Products for Add Modal
  const sortedAndGroupedProductsToAdd = React.useMemo(() => {
    let list = [...products];

    // 1. Filter by Brand
    if (addProductBrandFilter !== "all") {
      list = list.filter((p) => {
        const bId = String(p.brands_id || p["Brands ID"] || p.brand_id || "");
        return bId === addProductBrandFilter;
      });
    }

    // 2. Filter by Search Query (SKU or Name)
    if (addProductSearch.trim()) {
      const q = addProductSearch.toLowerCase();
      list = list.filter((p) => {
        const sku = String(p.sku || p.SKU || "").toLowerCase();
        const name = String(p.display_name || p["Display Name"] || p.name || "").toLowerCase();
        return sku.includes(q) || name.includes(q);
      });
    }

    // 3. Sort primarily by Brand ID/Name, then by SKU/Rank
    list.sort((a, b) => {
      const bIdA = String(a.brands_id || a["Brands ID"] || a.brand_id || "ZZZ");
      const bIdB = String(b.brands_id || b["Brands ID"] || b.brand_id || "ZZZ");
      if (bIdA !== bIdB) {
        return bIdA.localeCompare(bIdB, undefined, { numeric: true, sensitivity: "base" });
      }
      const rankA = Number(a.rank || a.Rank || 9999);
      const rankB = Number(b.rank || b.Rank || 9999);
      if (rankA !== rankB) return rankA - rankB;
      const skuA = String(a.sku || a.SKU || "");
      const skuB = String(b.sku || b.SKU || "");
      return skuA.localeCompare(skuB);
    });

    return list;
  }, [products, brands, addProductBrandFilter, addProductSearch]);

  // Filtered Sheet Items
  const filteredItems = React.useMemo(() => {
    if (!itemSearch.trim()) return items;
    const q = itemSearch.toLowerCase();
    return items.filter(
      (it) =>
        it.product_sku?.toLowerCase().includes(q) ||
        it.product_name?.toLowerCase().includes(q) ||
        it.retailer_sku?.toLowerCase().includes(q) ||
        it.store_tier?.toLowerCase().includes(q) ||
        it.promo_name?.toLowerCase().includes(q)
    );
  }, [items, itemSearch]);

  // Handle Sheet Creation / Update
  const handleSaveSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSheet || !editingSheet.name?.trim()) {
      showToast("Sheet Name is required", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/market-pricing/sheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSheet)
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save sheet");
      }
      showToast("Listing Sheet saved successfully!", "success");
      setIsSheetModalOpen(false);
      setEditingSheet(null);
      await fetchSheets();
    } catch (err: any) {
      showToast("Save failed: " + err.message, "error");
    }
  };

  // Handle Sheet Deletion
  const handleDeleteSheet = (sheetId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Listing Sheet",
      message: "Are you sure you want to delete this Listing Sheet? All assigned pricing items and logs in this sheet will be deleted.",
      confirmText: "Delete Sheet",
      confirmButtonClass: "bg-red-600 hover:bg-red-700",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/market-pricing/sheets?id=${encodeURIComponent(sheetId)}`, {
            method: "DELETE"
          });
          if (!res.ok) throw new Error("Failed to delete sheet");
          showToast("Listing Sheet deleted", "success");
          if (selectedSheetId === sheetId) {
            setSelectedSheetId("");
          }
          await fetchSheets();
        } catch (err: any) {
          showToast("Delete failed: " + err.message, "error");
        }
      }
    });
  };

  // Handle Adding Products to Sheet
  const handleAddProductsToSheet = async () => {
    if (!selectedSheetId) return;
    if (selectedSkusToAdd.size === 0) {
      showToast("Please select at least one product", "error");
      return;
    }

    const itemsToAdd = Array.from(selectedSkusToAdd).map((sku) => {
      const prod = products.find((p) => String(p.sku || p.SKU) === String(sku));
      const prodName = prod ? prod.display_name || prod["Display Name"] || prod.name || sku : sku;
      const uom = prod ? prod.uom || prod.UOM || "CTN" : "CTN";
      const pack = prod ? prod.carton || prod.Carton || prod.pack || "" : "";
      const baseCost = prod ? parseFloat(String(prod.cost || prod.Cost || "0").replace(/[^0-9.]/g, "")) : 0;

      return {
        product_sku: sku,
        product_name: prodName,
        retailer_sku: sku, // Small retailers default to same SKU
        store_tier: defaultStoreTier,
        cost_price: baseCost || null,
        market_price: null,
        uom: uom,
        pack_size: pack,
        status: "active"
      };
    });

    try {
      const res = await fetch(`${API_BASE}/api/market-pricing/items/upsert-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet_id: selectedSheetId,
          items: itemsToAdd,
          action_by: profile?.name || profile?.email || "Operator"
        })
      });
      if (!res.ok) throw new Error("Failed to add products");
      showToast(`Added ${itemsToAdd.length} products to sheet`, "success");
      setIsAddProductsModalOpen(false);
      setSelectedSkusToAdd(new Set());
      await fetchItems(selectedSheetId);
    } catch (err: any) {
      showToast("Add failed: " + err.message, "error");
    }
  };

  // Handle Edit Single Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await fetch(`${API_BASE}/api/market-pricing/items/bulk-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_ids: [editingItem.id],
          update_type: "price",
          cost_price: editingItem.cost_price,
          market_price: editingItem.market_price,
          remark: "Manual Item Edit",
          action_by: profile?.name || profile?.email || "Operator"
        })
      });
      if (!res.ok) throw new Error("Failed to update item");
      showToast("Pricing updated", "success");
      setIsEditItemModalOpen(false);
      setEditingItem(null);
      await fetchItems(selectedSheetId);
    } catch (err: any) {
      showToast("Update failed: " + err.message, "error");
    }
  };

  // Handle Bulk Price Update
  const handleApplyBulkPrice = async () => {
    if (selectedItemIds.size === 0) return;
    if (!bulkCostPrice && !bulkMarketPrice) {
      showToast("Please enter either a Cost Price or Market Price", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/market-pricing/items/bulk-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_ids: Array.from(selectedItemIds),
          update_type: "price",
          cost_price: bulkCostPrice || undefined,
          market_price: bulkMarketPrice || undefined,
          remark: bulkPriceRemark || "Bulk Price Update",
          action_by: profile?.name || profile?.email || "Operator"
        })
      });
      if (!res.ok) throw new Error("Failed to apply bulk pricing");
      showToast(`Updated pricing for ${selectedItemIds.size} items`, "success");
      setIsBulkPriceModalOpen(false);
      setBulkCostPrice("");
      setBulkMarketPrice("");
      setBulkPriceRemark("");
      await fetchItems(selectedSheetId);
    } catch (err: any) {
      showToast("Bulk update failed: " + err.message, "error");
    }
  };

  // Handle Bulk Promo Update
  const handleApplyBulkPromo = async () => {
    if (selectedItemIds.size === 0) return;
    if (!bulkPromoPrice) {
      showToast("Promotion Price is required", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/market-pricing/items/bulk-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_ids: Array.from(selectedItemIds),
          update_type: "promotion",
          promo_name: bulkPromoName || "Special Promotion",
          promo_price: bulkPromoPrice,
          promo_start: bulkPromoStart || null,
          promo_end: bulkPromoEnd || null,
          remark: bulkPromoRemark || "Bulk Promo Update",
          action_by: profile?.name || profile?.email || "Operator"
        })
      });
      if (!res.ok) throw new Error("Failed to apply promotion");
      showToast(`Applied promotion to ${selectedItemIds.size} items`, "success");
      setIsBulkPromoModalOpen(false);
      setBulkPromoName("");
      setBulkPromoPrice("");
      setBulkPromoStart("");
      setBulkPromoEnd("");
      setBulkPromoRemark("");
      await fetchItems(selectedSheetId);
    } catch (err: any) {
      showToast("Bulk promo failed: " + err.message, "error");
    }
  };

  // Handle Remove Promotion
  const handleRemovePromo = async (itemId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/market-pricing/items/bulk-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_ids: [itemId],
          update_type: "remove_promotion",
          remark: "Promo Ended",
          action_by: profile?.name || profile?.email || "Operator"
        })
      });
      if (!res.ok) throw new Error("Failed to remove promotion");
      showToast("Promotion removed", "success");
      await fetchItems(selectedSheetId);
    } catch (err: any) {
      showToast("Action failed: " + err.message, "error");
    }
  };

  // Handle Delete Item from Sheet
  const handleDeleteItem = (itemId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Remove Product from Sheet",
      message: "Are you sure you want to remove this product from the listing sheet?",
      confirmText: "Remove Product",
      confirmButtonClass: "bg-red-600 hover:bg-red-700",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/market-pricing/items?id=${encodeURIComponent(itemId)}`, {
            method: "DELETE"
          });
          if (!res.ok) throw new Error("Failed to delete item");
          showToast("Item removed", "success");
          await fetchItems(selectedSheetId);
        } catch (err: any) {
          showToast("Delete failed: " + err.message, "error");
        }
      }
    });
  };

  // Selection Checkbox Helpers
  const toggleSelectAll = () => {
    if (selectedItemIds.size === filteredItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map((it) => it.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#F8F9FA] font-primary">
      {/* 🏛️ Outer Shell Container (Section 7 Standard) */}
      <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs m-2">
        
        {/* Top Header Bar */}
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
          <div>
            <h1 className="text-base font-bold text-zinc-950">Market Price & RSP Registry</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Organize pricing sheets, assign retailer clusters, manage shelf market prices, RSP tiers, and run bulk promotions with immutable audit logs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingSheet({
                  name: "",
                  retailer_ids: [],
                  description: ""
                });
                setIsSheetModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Listing Sheet</span>
            </button>
          </div>
        </div>

        {/* Two-Panel Layout */}
        <div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-slate-200">
          
          {/* ================= LEFT PANEL: SHEETS LIST ================= */}
          <div className="w-80 shrink-0 flex flex-col bg-[#F8F9FA] overflow-hidden">
            {/* Search Header */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search listing sheets..."
                  value={sheetSearch}
                  onChange={(e) => setSheetSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] transition-all"
                />
              </div>
            </div>

            {/* Sheets List Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {loadingSheets ? (
                <div className="p-4 text-center text-xs text-zinc-400">Loading sheets...</div>
              ) : filteredSheets.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">No listing sheets found.</div>
              ) : (
                filteredSheets.map((sheet) => {
                  const isSelected = sheet.id === selectedSheetId;
                  let rIds: string[] = [];
                  try {
                    rIds = typeof sheet.retailer_ids === "string" ? JSON.parse(sheet.retailer_ids) : (sheet.retailer_ids || []);
                  } catch {}

                  return (
                    <div
                      key={sheet.id}
                      onClick={() => setSelectedSheetId(sheet.id)}
                      className={`group relative p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#D3E3FD]/40 border-[#0B57D0] shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`text-xs font-bold leading-tight ${isSelected ? "text-[#0B57D0]" : "text-zinc-900"}`}>
                          {sheet.name}
                        </h3>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSheet(sheet);
                              setIsSheetModalOpen(true);
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-zinc-600 hover:text-zinc-900"
                            title="Edit Sheet"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSheet(sheet.id);
                            }}
                            className="p-1 hover:bg-red-50 rounded text-zinc-400 hover:text-red-600"
                            title="Delete Sheet"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {sheet.description && (
                        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">{sheet.description}</p>
                      )}

                      {/* Retailers Badge Pill */}
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          <Building2 size={10} />
                          {rIds.length} Retailers
                        </span>
                        {rIds.slice(0, 2).map((rid) => (
                          <span
                            key={rid}
                            className="text-[10px] text-zinc-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded truncate max-w-[110px]"
                            title={getRetailerName(rid)}
                          >
                            {getRetailerName(rid)}
                          </span>
                        ))}
                        {rIds.length > 2 && (
                          <span className="text-[9px] text-zinc-400 font-bold">+{rIds.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ================= RIGHT PANEL: PRODUCTS & PRICING TABLE ================= */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">
            {activeSheet ? (
              <>
                {/* Active Sheet Details Toolbar */}
                <div className="px-4 py-2.5 border-b border-slate-200 bg-[#F8F9FA] flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900">{activeSheet.name}</span>
                        <span className="text-[10px] font-semibold bg-blue-50 text-[#0B57D0] border border-blue-200 px-1.5 py-0.2 rounded">
                          {items.length} SKUs Listed
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
                        <span>Assigned Retailers:</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {activeSheetRetailerIds.map((rid) => (
                            <span key={rid} className="font-semibold text-zinc-700 bg-white border border-slate-200 px-1.5 py-0.2 rounded text-[10px]">
                              {getRetailerName(rid)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedSkusToAdd(new Set());
                        setIsAddProductsModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-zinc-800 rounded-md shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus size={13} className="text-[#0B57D0]" />
                      <span>Add Products</span>
                    </button>
                  </div>
                </div>

                {/* Bulk Actions & Filter Toolbar */}
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between gap-2 bg-white shrink-0">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative w-64">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search SKU, name, or promo..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                      />
                    </div>
                  </div>

                  {/* Bulk Action Buttons (Appear when >= 1 item selected) */}
                  {selectedItemIds.size > 0 && (
                    <div className="flex items-center gap-2 animate-in fade-in duration-150">
                      <span className="text-xs font-semibold text-zinc-500">
                        {selectedItemIds.size} Selected
                      </span>
                      <button
                        onClick={() => {
                          setBulkCostPrice("");
                          setBulkMarketPrice("");
                          setBulkPriceRemark("");
                          setIsBulkPriceModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-zinc-800 rounded shadow-xs cursor-pointer"
                      >
                        <TrendingUp size={12} className="text-blue-600" />
                        <span>Bulk Edit Prices</span>
                      </button>
                      <button
                        onClick={() => {
                          setBulkPromoName("");
                          setBulkPromoPrice("");
                          setBulkPromoStart("");
                          setBulkPromoEnd("");
                          setBulkPromoRemark("");
                          setIsBulkPromoModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0B57D0] hover:bg-[#0842A0] text-xs font-semibold text-white rounded shadow-xs cursor-pointer"
                      >
                        <Tag size={12} />
                        <span>Set Bulk Promotion</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Table View */}
                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200 text-zinc-600 font-bold">
                      <tr>
                        <th className="w-10 px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={filteredItems.length > 0 && selectedItemIds.size === filteredItems.length}
                            onChange={toggleSelectAll}
                            className="rounded border-slate-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                          />
                        </th>
                        <th className="px-3 py-2">Product SKU</th>
                        <th className="px-3 py-2">Product Name</th>
                        <th className="px-3 py-2">Retailer SKU</th>
                        <th className="px-3 py-2">Store Tier</th>
                        <th className="px-3 py-2 text-right">Cost Price</th>
                        <th className="px-3 py-2 text-right">Market Price (RSP)</th>
                        <th className="px-3 py-2 text-right">Margin / Gain</th>
                        <th className="px-3 py-2">Active Promotion</th>
                        <th className="w-24 px-3 py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-zinc-800">
                      {loadingItems ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-zinc-400">
                            Loading pricing catalog...
                          </td>
                        </tr>
                      ) : filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-zinc-400">
                            No products added to this sheet yet. Click <span className="font-semibold text-[#0B57D0]">"+ Add Products"</span> to begin.
                          </td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => {
                          const isSelected = selectedItemIds.has(item.id);
                          const cost = item.cost_price || 0;
                          const market = item.market_price || 0;
                          const promo = item.promo_price;
                          const effectiveShelfPrice = promo !== null && promo !== undefined ? promo : market;
                          const marginAmt = effectiveShelfPrice && cost ? effectiveShelfPrice - cost : 0;
                          const marginPct = effectiveShelfPrice && cost ? ((marginAmt / cost) * 100).toFixed(1) : "0.0";

                          return (
                            <tr
                              key={item.id}
                              className={`hover:bg-[#F0F4F9]/60 transition-colors ${
                                isSelected ? "bg-[#D3E3FD]/20" : ""
                              }`}
                            >
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectItem(item.id)}
                                  className="rounded border-slate-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-zinc-900">
                                {item.product_sku}
                              </td>
                              <td className="px-3 py-2 font-medium text-zinc-800 max-w-[200px] truncate" title={item.product_name}>
                                {item.product_name || "-"}
                              </td>
                              <td className="px-3 py-2 font-mono text-zinc-600">
                                {item.retailer_sku || item.product_sku}
                              </td>
                              <td className="px-3 py-2">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-zinc-700">
                                  {item.store_tier || "Standard"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-semibold text-zinc-900">
                                {item.cost_price !== null ? `$${Number(item.cost_price).toFixed(2)}` : "-"}
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-zinc-950">
                                {item.market_price !== null ? `$${Number(item.market_price).toFixed(2)}` : "-"}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-zinc-600">
                                {marginAmt > 0 ? (
                                  <span className="text-emerald-700 font-semibold">
                                    +${marginAmt.toFixed(2)} ({marginPct}%)
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {promo !== null && promo !== undefined ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                      <Tag size={9} />
                                      {item.promo_name || "Promo"}: ${Number(promo).toFixed(2)}
                                    </span>
                                    <button
                                      onClick={() => handleRemovePromo(item.id)}
                                      className="text-zinc-400 hover:text-red-600"
                                      title="Remove Promotion"
                                    >
                                      <X size={11} />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-zinc-400 italic">No Active Promo</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingItem(item);
                                      setIsEditItemModalOpen(true);
                                    }}
                                    className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-slate-100 rounded"
                                    title="Edit Price"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => setHistoryDrawerItem(item)}
                                    className="p-1 text-zinc-500 hover:text-[#0B57D0] hover:bg-blue-50 rounded"
                                    title="Price Audit Logs"
                                  >
                                    <History size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="Delete Item"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                <Layers size={32} className="text-zinc-300 mb-2" />
                <h3 className="text-sm font-bold text-zinc-700">No Listing Sheet Selected</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Select a Listing Sheet from the left panel, or click "Create Listing Sheet" to build a new pricing cluster.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODAL: CREATE / EDIT LISTING SHEET ================= */}
      {isSheetModalOpen && editingSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-950">
                {editingSheet.id ? "Edit Listing Sheet" : "Create New Listing Sheet"}
              </h2>
              <button
                onClick={() => {
                  setIsSheetModalOpen(false);
                  setEditingSheet(null);
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSheet} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Listing Sheet Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FairPrice Finest Standard Tier or General Provision Cluster"
                  value={editingSheet.name || ""}
                  onChange={(e) => setEditingSheet({ ...editingSheet, name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional sheet notes or grouping rationale..."
                  value={editingSheet.description || ""}
                  onChange={(e) => setEditingSheet({ ...editingSheet, description: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              {/* Retailers Multi-Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Select Retailers in this Sheet
                </label>
                <p className="text-[11px] text-zinc-500 mb-2">
                  Select one or more retailers to associate with this listing sheet.
                </p>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 divide-y divide-slate-100 bg-slate-50/50">
                  {retailers.map((ret) => {
                    const retId = String(ret.id || ret.ID);
                    const retName = ret.display_name || ret["Display Name"] || ret.name || `Retailer #${retId}`;
                    
                    let currentSheetRetailers: string[] = [];
                    try {
                      currentSheetRetailers = typeof editingSheet.retailer_ids === "string"
                        ? JSON.parse(editingSheet.retailer_ids)
                        : (editingSheet.retailer_ids || []);
                    } catch {}

                    const isChecked = currentSheetRetailers.includes(retId);

                    return (
                      <label
                        key={retId}
                        className="flex items-center justify-between p-1.5 rounded text-xs cursor-pointer hover:bg-slate-100/80"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              let next: string[] = [...currentSheetRetailers];
                              if (e.target.checked) next.push(retId);
                              else next = next.filter((id) => id !== retId);
                              setEditingSheet({ ...editingSheet, retailer_ids: next });
                            }}
                            className="rounded border-slate-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                          />
                          <span className="font-semibold text-zinc-800">{retName}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSheetModalOpen(false);
                    setEditingSheet(null);
                  }}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-zinc-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-md shadow-xs"
                >
                  Save Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD PRODUCTS TO SHEET ================= */}
      {isAddProductsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-bold text-zinc-950">Add Products to Listing Sheet</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Select products carried by this retailer cluster.</p>
              </div>
              <button
                onClick={() => setIsAddProductsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-[#F8F9FA] shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Brand Filter */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-zinc-700">Brand:</label>
                  <select
                    value={addProductBrandFilter}
                    onChange={(e) => setAddProductBrandFilter(e.target.value)}
                    className="h-8 px-2.5 bg-white border border-slate-300 rounded text-xs text-zinc-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                  >
                    <option value="all">All Brands ({brands.length})</option>
                    {brands.map((b) => (
                      <option key={b.id || b.ID} value={String(b.id || b.ID)}>
                        {b.id || b.ID} - {b.display_name || b["Display Name"] || b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Search Box */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search SKU or Name..."
                    value={addProductSearch}
                    onChange={(e) => setAddProductSearch(e.target.value)}
                    className="h-8 pl-7 pr-3 bg-white border border-slate-300 rounded text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] w-48"
                  />
                  {addProductSearch && (
                    <button
                      onClick={() => setAddProductSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Default Store Tier */}
                <div className="flex items-center gap-1.5 ml-1">
                  <label className="text-xs font-semibold text-zinc-700">Tier:</label>
                  <select
                    value={defaultStoreTier}
                    onChange={(e) => setDefaultStoreTier(e.target.value)}
                    className="h-8 px-2 bg-white border border-slate-300 rounded text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Tier 1">Tier 1 (High Street / Premium)</option>
                    <option value="Tier 2">Tier 2 (Heartland)</option>
                    <option value="Tier 3">Tier 3 (Small Outlets)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const availableSkus = sortedAndGroupedProductsToAdd
                      .filter((p) => !items.some((it) => it.product_sku === (p.sku || p.SKU)))
                      .map((p) => p.sku || p.SKU);
                    if (availableSkus.every((sku) => selectedSkusToAdd.has(sku))) {
                      const next = new Set(selectedSkusToAdd);
                      availableSkus.forEach((sku) => next.delete(sku));
                      setSelectedSkusToAdd(next);
                    } else {
                      const next = new Set(selectedSkusToAdd);
                      availableSkus.forEach((sku) => next.add(sku));
                      setSelectedSkusToAdd(next);
                    }
                  }}
                  className="text-xs text-[#0B57D0] hover:underline font-semibold"
                >
                  Select Filtered ({sortedAndGroupedProductsToAdd.length})
                </button>
                <span className="text-xs text-zinc-600 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  {selectedSkusToAdd.size} Selected
                </span>
              </div>
            </div>

            {/* Product Selector Table */}
            <div className="flex-1 min-h-0 overflow-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8F9FA] sticky top-0 border-b border-slate-200 text-zinc-600 font-bold z-10">
                  <tr>
                    <th className="w-8 px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={
                          sortedAndGroupedProductsToAdd.length > 0 &&
                          sortedAndGroupedProductsToAdd.every((p) => selectedSkusToAdd.has(p.sku || p.SKU))
                        }
                        onChange={() => {
                          const currentSkus = sortedAndGroupedProductsToAdd.map((p) => p.sku || p.SKU);
                          if (currentSkus.every((sku) => selectedSkusToAdd.has(sku))) {
                            const next = new Set(selectedSkusToAdd);
                            currentSkus.forEach((s) => next.delete(s));
                            setSelectedSkusToAdd(next);
                          } else {
                            const next = new Set(selectedSkusToAdd);
                            currentSkus.forEach((s) => next.add(s));
                            setSelectedSkusToAdd(next);
                          }
                        }}
                        className="rounded border-slate-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Product Name</th>
                    <th className="px-3 py-2">UOM</th>
                    <th className="px-3 py-2 text-right">Default Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedAndGroupedProductsToAdd.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-xs text-zinc-400">
                        No products match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedAndGroupedProductsToAdd.map((p) => {
                      const sku = p.sku || p.SKU;
                      const isChecked = selectedSkusToAdd.has(sku);
                      const alreadyInSheet = items.some((it) => it.product_sku === sku);

                      return (
                        <tr
                          key={sku}
                          onClick={() => {
                            if (alreadyInSheet) return;
                            const next = new Set(selectedSkusToAdd);
                            if (next.has(sku)) next.delete(sku);
                            else next.add(sku);
                            setSelectedSkusToAdd(next);
                          }}
                          className={`hover:bg-slate-50 cursor-pointer ${
                            alreadyInSheet ? "opacity-40 cursor-not-allowed bg-slate-50" : ""
                          }`}
                        >
                          <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              disabled={alreadyInSheet}
                              checked={isChecked}
                              onChange={(e) => {
                                const next = new Set(selectedSkusToAdd);
                                if (e.target.checked) next.add(sku);
                                else next.delete(sku);
                                setSelectedSkusToAdd(next);
                              }}
                              className="rounded border-slate-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-zinc-900">{sku}</td>
                          <td className="px-3 py-2 font-medium text-zinc-800">
                            {p.display_name || p["Display Name"] || p.name || sku}
                          </td>
                          <td className="px-3 py-2 text-zinc-600">{p.uom || p.UOM || "CTN"}</td>
                          <td className="px-3 py-2 text-right font-mono text-zinc-900">
                            ${parseFloat(String(p.cost || p.Cost || "0").replace(/[^0-9.]/g, "") || "0").toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setIsAddProductsModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-zinc-700 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddProductsToSheet}
                className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-md shadow-xs"
              >
                Add Selected to Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT SINGLE ITEM ================= */}
      {isEditItemModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-950">Edit Pricing: {editingItem.product_sku}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{editingItem.product_name}</p>
              </div>
              <button
                onClick={() => setIsEditItemModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Cost Price (What Retailer Pays Us)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editingItem.cost_price !== null ? editingItem.cost_price : ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        cost_price: e.target.value ? parseFloat(e.target.value) : null
                      })
                    }
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Market Price (Shelf Price / RSP)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editingItem.market_price !== null ? editingItem.market_price : ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        market_price: e.target.value ? parseFloat(e.target.value) : null
                      })
                    }
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditItemModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-zinc-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-md shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: BULK EDIT PRICES ================= */}
      {isBulkPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-950">Bulk Edit Prices</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Applying changes to {selectedItemIds.size} selected items</p>
              </div>
              <button
                onClick={() => setIsBulkPriceModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  New Cost Price (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Leave blank to keep existing"
                    value={bulkCostPrice}
                    onChange={(e) => setBulkCostPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  New Market Price (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Leave blank to keep existing"
                    value={bulkMarketPrice}
                    onChange={(e) => setBulkMarketPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Change Remark / Justification
                </label>
                <input
                  type="text"
                  placeholder="e.g. Annual inflation adjustment or supplier cost update"
                  value={bulkPriceRemark}
                  onChange={(e) => setBulkPriceRemark(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkPriceModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-zinc-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkPrice}
                  className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-md shadow-xs"
                >
                  Apply Price Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: BULK SET PROMOTION ================= */}
      {isBulkPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-zinc-950">Set Bulk Promotion</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Applying promotional pricing to {selectedItemIds.size} items</p>
              </div>
              <button
                onClick={() => setIsBulkPromoModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Promotion Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Great Singapore Sale, CNY Promo, Weekend Blitz"
                  value={bulkPromoName}
                  onChange={(e) => setBulkPromoName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Promo Shelf Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={bulkPromoPrice}
                    onChange={(e) => setBulkPromoPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={bulkPromoStart}
                    onChange={(e) => setBulkPromoStart(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={bulkPromoEnd}
                    onChange={(e) => setBulkPromoEnd(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Promo Remark</label>
                <input
                  type="text"
                  placeholder="Optional details or terms..."
                  value={bulkPromoRemark}
                  onChange={(e) => setBulkPromoRemark(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkPromoModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-zinc-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkPromo}
                  className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-md shadow-xs"
                >
                  Apply Promotion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SLIDE-OVER: PRICE AUDIT LOG TIMELINE ================= */}
      {historyDrawerItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-zinc-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#0B57D0]" />
                <div>
                  <h2 className="text-sm font-bold text-zinc-950">Price & Promo Audit Log</h2>
                  <p className="text-xs text-zinc-500">{historyDrawerItem.product_sku} - {historyDrawerItem.product_name}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryDrawerItem(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-5">
              {(() => {
                let logs: PriceLogEntry[] = [];
                try {
                  logs = typeof historyDrawerItem.price_logs === "string"
                    ? JSON.parse(historyDrawerItem.price_logs)
                    : (historyDrawerItem.price_logs || []);
                } catch {
                  logs = [];
                }

                if (logs.length === 0) {
                  return <div className="text-center text-xs text-zinc-400 py-8">No price logs recorded yet.</div>;
                }

                return (
                  <div className="relative border-l border-slate-200 ml-3 space-y-6">
                    {[...logs].reverse().map((entry, idx) => {
                      const dateStr = new Date(entry.timestamp).toLocaleString("en-SG", {
                        dateStyle: "medium",
                        timeStyle: "short"
                      });

                      return (
                        <div key={idx} className="relative pl-6">
                          <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-[#0B57D0] border-2 border-white ring-2 ring-blue-100" />
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-bold text-zinc-900">{entry.action}</span>
                              <span className="text-[10px] text-zinc-400">{dateStr}</span>
                            </div>

                            {/* Price Diffs */}
                            {(entry.old_cost !== undefined || entry.new_cost !== undefined) && (
                              <div className="text-xs text-zinc-700 flex items-center gap-1.5 mt-1 font-mono">
                                <span className="text-zinc-500 font-sans">Cost:</span>
                                <span>${Number(entry.old_cost || 0).toFixed(2)}</span>
                                <ArrowRight size={11} className="text-zinc-400" />
                                <span className="font-bold text-zinc-900">${Number(entry.new_cost || 0).toFixed(2)}</span>
                              </div>
                            )}

                            {(entry.old_market !== undefined || entry.new_market !== undefined) && (
                              <div className="text-xs text-zinc-700 flex items-center gap-1.5 mt-1 font-mono">
                                <span className="text-zinc-500 font-sans">Market RSP:</span>
                                <span>${Number(entry.old_market || 0).toFixed(2)}</span>
                                <ArrowRight size={11} className="text-zinc-400" />
                                <span className="font-bold text-blue-600">${Number(entry.new_market || 0).toFixed(2)}</span>
                              </div>
                            )}

                            {entry.promo_price !== undefined && entry.promo_price !== null && (
                              <div className="mt-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                {entry.promo_name || "Promotion"}: ${Number(entry.promo_price).toFixed(2)}
                              </div>
                            )}

                            {entry.remark && (
                              <p className="text-[11px] text-zinc-500 mt-2 italic">"{entry.remark}"</p>
                            )}

                            <div className="mt-2 text-[10px] text-zinc-400 flex items-center justify-end">
                              <span>By: {entry.action_by || "Operator"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CUSTOM CONFIRMATION DIALOG ================= */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">{confirmDialog.title}</h3>
                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{confirmDialog.message}</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-zinc-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const cb = confirmDialog.onConfirm;
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                  cb();
                }}
                className={`px-3.5 py-1.5 text-white text-xs font-semibold rounded-md shadow-xs transition-colors ${
                  confirmDialog.confirmButtonClass || "bg-red-600 hover:bg-red-700"
                }`}
              >
                {confirmDialog.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
