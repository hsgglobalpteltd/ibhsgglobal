"use client";

import * as React from "react";
import { showToast } from "@/lib/toast";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  History,
  Building2,
  Check,
  X,
  ArrowRight,
  TrendingUp,
  Layers,
  AlertCircle,
  Printer,
  SlidersHorizontal,
  Lock,
  Save,
  ChevronRight,
  ChevronDown,
  Store,
  FileText
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable, { applyPlugin } from "jspdf-autotable";

// Ensure autoTable plugin is registered on jsPDF instance
try {
  applyPlugin(jsPDF);
} catch (_) {
  // Ignored if already applied
}

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
  cost_price: number | null; // Our Price (Base Cost)
  retailer_price: number | null; // Cost to Retailer (Wholesale Price)
  market_price: number | null; // Market Price (Shelf Price / RSP)
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
  old_retailer_price?: number | null;
  new_retailer_price?: number | null;
  old_market?: number | null;
  new_market?: number | null;
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

  // View Mode: "sheet" | "retailer"
  const [sidebarViewMode, setSidebarViewMode] = React.useState<"sheet" | "retailer">("retailer");
  const [selectedRetailerId, setSelectedRetailerId] = React.useState<string>("");

  // Collapsible Brand Rows State: Set of "tier:::brandName" keys
  const [expandedBrandKeys, setExpandedBrandKeys] = React.useState<Set<string>>(new Set());

  // In-Table Edit Mode States
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editRowsMap, setEditRowsMap] = React.useState<Record<string, Partial<PriceItem>>>({});
  const [isSavingDirectEdit, setIsSavingDirectEdit] = React.useState(false);

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
  const [bulkRetailerPrice, setBulkRetailerPrice] = React.useState("");
  const [bulkMarketPrice, setBulkMarketPrice] = React.useState("");
  const [bulkPriceRemark, setBulkPriceRemark] = React.useState("");

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
    // Try immediate cache loading
    try {
      const cachedProds = localStorage.getItem("products_DB_data") || localStorage.getItem("products_db_data");
      if (cachedProds) {
        const parsed = JSON.parse(cachedProds);
        if (Array.isArray(parsed) && parsed.length > 0) setProducts(parsed);
      }
      const cachedBrands = localStorage.getItem("brands_DB_data") || localStorage.getItem("brands_db_data");
      if (cachedBrands) {
        const parsed = JSON.parse(cachedBrands);
        if (Array.isArray(parsed) && parsed.length > 0) setBrands(parsed);
      }
      const cachedRets = localStorage.getItem("retailers_DB_data") || localStorage.getItem("retailers_db_data");
      if (cachedRets) {
        const parsed = JSON.parse(cachedRets);
        if (Array.isArray(parsed) && parsed.length > 0) setRetailers(parsed);
      }
    } catch {}

    try {
      const [retRes, prodRes, brandRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/db?table=retailers_DB`),
        fetch(`${API_BASE}/api/products`),
        fetch(`${API_BASE}/api/brands`)
      ]);
      if (retRes.ok) {
        const retData = await retRes.json();
        const retList = Array.isArray(retData) ? retData : retData.value || [];
        setRetailers(retList);
        if (retList.length > 0 && !selectedRetailerId) {
          setSelectedRetailerId(String(retList[0].id || retList[0].ID || ""));
        }
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const pList = Array.isArray(prodData) ? prodData : prodData.value || [];
        setProducts(pList);
        try { localStorage.setItem("products_DB_data", JSON.stringify(pList)); } catch {}
      }
      if (brandRes.ok) {
        const brandData = await brandRes.json();
        const bList = Array.isArray(brandData) ? brandData : brandData.value || [];
        setBrands(bList);
        try { localStorage.setItem("brands_DB_data", JSON.stringify(bList)); } catch {}
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
      const itemList = Array.isArray(data) ? data : [];
      setItems(itemList);
      setSelectedItemIds(new Set()); // Reset selection
      // Initialize edit map
      const map: Record<string, Partial<PriceItem>> = {};
      itemList.forEach((it) => {
        map[it.id] = { ...it };
      });
      setEditRowsMap(map);
    } catch (err: any) {
      showToast("Error loading items: " + err.message, "error");
    } finally {
      setLoadingItems(false);
    }
  };

  // Fetch items when active sheet changes
  React.useEffect(() => {
    setIsEditMode(false);
    if (selectedSheetId) {
      fetchItems(selectedSheetId);
    } else {
      setItems([]);
      setEditRowsMap({});
    }
  }, [selectedSheetId]);

  // Find Retailer Name Helper
  const getRetailerName = (id: string) => {
    const found = retailers.find((r) => String(r.id || r.ID) === String(id));
    return found ? found.display_name || found["Display Name"] || found.name || `Retailer #${id}` : `Retailer #${id}`;
  };

  // Helper: Get Brand Name for a product SKU or PriceItem
  const getProductBrandName = React.useCallback((itemOrSku: PriceItem | string): string => {
    const sku = typeof itemOrSku === "string" ? itemOrSku : (itemOrSku.product_sku || "");
    const cleanSku = String(sku || "").trim().toLowerCase();
    const itemName = typeof itemOrSku === "string" ? "" : (itemOrSku.product_name || "");

    // 1. Try finding product in products table
    const prod = products.find((p) => {
      const pSku = String(p.sku || p.SKU || p.code || p.Code || "").trim().toLowerCase();
      return pSku === cleanSku;
    });

    if (prod) {
      // 1a. Check direct brand name field on product
      const directBrand = prod.brand_name || prod["Brand Name"] || prod.brand || prod.Brand || prod.brandName;
      if (directBrand && String(directBrand).trim() && String(directBrand).trim().toLowerCase() !== "null") {
        return String(directBrand).trim();
      }

      // 1b. Check brands_id on product
      const brandId = String(prod.brands_id || prod["Brands ID"] || prod.Brands_ID || prod.brand_id || prod.brandId || prod.Brand_ID || "").trim();
      if (brandId) {
        const foundBrand = brands.find((b) => {
          const bId = String(b.id || b.ID || b.brand_id || b["Brand ID"] || b.Brands_ID || "").trim().toLowerCase();
          return bId === brandId.toLowerCase();
        });
        if (foundBrand) {
          const bName = foundBrand.brand_name || foundBrand["Brand Name"] || foundBrand.display_name || foundBrand["Display Name"] || foundBrand.name;
          if (bName) return String(bName).trim();
        }
        // If not found in brands table, but brandId is not numeric, it might be the brand name itself
        if (brandId && isNaN(Number(brandId))) {
          return brandId;
        }
      }
    }

    // 2. If product not found in products array or no brand ID matched, check against brands array names
    const searchTarget = `${sku} ${itemName}`.toLowerCase();
    for (const b of brands) {
      const bName = String(b.brand_name || b["Brand Name"] || b.display_name || b["Display Name"] || b.name || "").trim();
      if (bName && bName.length >= 3 && searchTarget.includes(bName.toLowerCase())) {
        return bName;
      }
    }

    // 3. Check for [Brand] in product name, e.g. "[ABC] Coffee" or "ABC - Coffee"
    if (itemName) {
      const bracketMatch = itemName.match(/^\[(.*?)\]/);
      if (bracketMatch && bracketMatch[1]?.trim()) {
        return bracketMatch[1].trim();
      }
    }

    return "Other Products";
  }, [products, brands]);

  // Helper: Extract Product Spec / Quantity / Pack size from item or product name
  const extractItemSpec = React.useCallback((item: PriceItem): string => {
    if (item.pack_size && item.pack_size.trim()) return item.pack_size.trim();
    if (item.uom && item.uom.trim() && item.uom.trim() !== "1") return item.uom.trim();

    const name = (item.product_name || "").trim();
    // Match common FMCG quantity/volume/pack sizes (e.g. "80g", "120g", "5x85g", "6x330ml", "1.5L", "24s", "pack of 6", "500ml", "1kg")
    const regex = /(\d+(?:\.\d+)?\s*(?:x|\*)\s*\d+(?:\.\d+)?\s*(?:g|kg|ml|l|ltr|oz|cl|pcs|s|pk|ct)\b|\d+(?:\.\d+)?\s*(?:g|kg|ml|l|ltr|oz|cl|pcs|s|pk|ct)\b|pack\s+of\s+\d+|\d+\s*pack|\b\d+\s*pcs\b|\b\d+\s*s\b)/i;
    const match = name.match(regex);
    if (match) {
      return match[0].trim();
    }
    return "";
  }, []);

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

  // Retailer List with their associated listing sheets (Many-to-Many)
  const retailersWithSheets = React.useMemo(() => {
    return retailers.map((ret) => {
      const retIdStr = String(ret.id || ret.ID || "");
      const matchedSheets = sheets.filter((s) => {
        try {
          const rIds = typeof s.retailer_ids === "string" ? JSON.parse(s.retailer_ids) : (s.retailer_ids || []);
          return rIds.some((id: string) => String(id) === retIdStr);
        } catch {
          return false;
        }
      });
      return {
        retailer: ret,
        retailerId: retIdStr,
        retailerName: ret.display_name || ret["Display Name"] || ret.name || `Retailer #${retIdStr}`,
        sheets: matchedSheets
      };
    });
  }, [retailers, sheets]);

  // Filtered Retailers in Sidebar
  const filteredRetailersWithSheets = React.useMemo(() => {
    if (!sheetSearch.trim()) return retailersWithSheets;
    const q = sheetSearch.toLowerCase();
    return retailersWithSheets.filter((item) => {
      const matchRetName = item.retailerName.toLowerCase().includes(q);
      const matchSheetName = item.sheets.some((s) => s.name?.toLowerCase().includes(q));
      return matchRetName || matchSheetName;
    });
  }, [retailersWithSheets, sheetSearch]);

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
        getProductBrandName(it).toLowerCase().includes(q)
    );
  }, [items, itemSearch, getProductBrandName]);

  // Group items by Store Tier -> Brand Name (and split if varied / different specs / price points)
  const groupedTierBrandItems = React.useMemo(() => {
    const tierMap: Record<string, Record<string, PriceItem[]>> = {};

    filteredItems.forEach((item) => {
      const tier = item.store_tier || "Standard";
      const brand = getProductBrandName(item);

      if (!tierMap[tier]) tierMap[tier] = {};
      if (!tierMap[tier][brand]) tierMap[tier][brand] = [];
      tierMap[tier][brand].push(item);
    });

    // Structure into array with splitting for varied pricing / specs
    return Object.keys(tierMap).sort().map((tierName) => {
      const brandGroups: Array<{
        brandKey: string;
        brandName: string;
        specLabel: string;
        tierName: string;
        items: PriceItem[];
      }> = [];

      Object.keys(tierMap[tierName]).sort().forEach((brandName) => {
        const brandItems = tierMap[tierName][brandName];

        // Check if all items in this brand have the same price and/or same spec
        // We group items within this brand by: (spec + price signature) or price signature
        const subMap: Record<string, { spec: string; items: PriceItem[] }> = {};

        brandItems.forEach((item) => {
          const spec = extractItemSpec(item);
          // Pricing key: cost_price|retailer_price|market_price (rounded to 2 decimals)
          const cost = item.cost_price !== null && item.cost_price !== undefined ? Number(item.cost_price).toFixed(2) : "none";
          const ret = item.retailer_price !== null && item.retailer_price !== undefined ? Number(item.retailer_price).toFixed(2) : "none";
          const mkt = item.market_price !== null && item.market_price !== undefined ? Number(item.market_price).toFixed(2) : "none";

          // Primary grouping subkey: if spec exists, combine with spec; else use price key
          const subKey = spec ? `spec_${spec.toLowerCase()}__${cost}_${ret}_${mkt}` : `price_${cost}_${ret}_${mkt}`;

          if (!subMap[subKey]) {
            subMap[subKey] = { spec, items: [] };
          }
          subMap[subKey].items.push(item);
        });

        const subKeys = Object.keys(subMap);

        if (subKeys.length === 1) {
          // All items have uniform price / spec -> 1 brand row
          const sub = subMap[subKeys[0]];
          brandGroups.push({
            brandKey: `${tierName}:::${brandName}:::0`,
            brandName,
            specLabel: sub.spec,
            tierName,
            items: sub.items
          });
        } else {
          // Varied prices / specs -> split into separate brand rows
          subKeys.forEach((subKey, idx) => {
            const sub = subMap[subKey];
            brandGroups.push({
              brandKey: `${tierName}:::${brandName}:::${idx}_${subKey}`,
              brandName,
              specLabel: sub.spec,
              tierName,
              items: sub.items
            });
          });
        }
      });

      return {
        tierName,
        brandGroups
      };
    });
  }, [filteredItems, getProductBrandName, extractItemSpec]);

  // Toggle brand expand/collapse
  const toggleBrandExpand = (brandKey: string) => {
    setExpandedBrandKeys((prev) => {
      const next = new Set(prev);
      if (next.has(brandKey)) next.delete(brandKey);
      else next.add(brandKey);
      return next;
    });
  };

  // Expand all / collapse all brands
  const toggleExpandAllBrands = () => {
    const allKeys = groupedTierBrandItems.flatMap((t) => t.brandGroups.map((b) => b.brandKey));
    if (expandedBrandKeys.size === allKeys.length) {
      setExpandedBrandKeys(new Set());
    } else {
      setExpandedBrandKeys(new Set(allKeys));
    }
  };

  // Cascade brand-level price edit to all child SKU rows
  const handleBrandPriceChange = (brandItems: PriceItem[], field: "cost_price" | "retailer_price" | "market_price", val: number | null) => {
    setEditRowsMap((prev) => {
      const next = { ...prev };
      brandItems.forEach((item) => {
        next[item.id] = {
          ...next[item.id],
          [field]: val
        };
      });
      return next;
    });
  };

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
        const errData = await res.json().catch(() => ({}));
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
        retailer_price: null,
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
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to add products");
      }
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
          product_name: editingItem.product_name,
          retailer_sku: editingItem.retailer_sku,
          store_tier: editingItem.store_tier,
          cost_price: editingItem.cost_price,
          retailer_price: editingItem.retailer_price,
          market_price: editingItem.market_price,
          remark: "Manual Item Edit",
          action_by: profile?.name || profile?.email || "Operator"
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update item");
      }
      showToast("Pricing updated successfully", "success");
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
    if (!bulkCostPrice && !bulkRetailerPrice && !bulkMarketPrice) {
      showToast("Please enter at least one price to update", "error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/market-pricing/items/bulk-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_ids: Array.from(selectedItemIds),
          cost_price: bulkCostPrice || undefined,
          retailer_price: bulkRetailerPrice || undefined,
          market_price: bulkMarketPrice || undefined,
          remark: bulkPriceRemark || "Bulk Price Update",
          action_by: profile?.name || profile?.email || "Operator"
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to apply bulk pricing");
      }
      showToast(`Updated pricing for ${selectedItemIds.size} items`, "success");
      setIsBulkPriceModalOpen(false);
      setBulkCostPrice("");
      setBulkRetailerPrice("");
      setBulkMarketPrice("");
      setBulkPriceRemark("");
      await fetchItems(selectedSheetId);
    } catch (err: any) {
      showToast("Bulk update failed: " + err.message, "error");
    }
  };

  // Handle Direct In-Table CRUD Save All
  const handleSaveAllEditRows = async () => {
    if (!selectedSheetId) return;
    setIsSavingDirectEdit(true);

    const itemsToUpsert = items.map((orig) => {
      const edited = editRowsMap[orig.id] || {};
      return {
        ...orig,
        product_name: edited.product_name !== undefined ? edited.product_name : orig.product_name,
        retailer_sku: edited.retailer_sku !== undefined ? edited.retailer_sku : orig.retailer_sku,
        store_tier: edited.store_tier !== undefined ? edited.store_tier : orig.store_tier,
        cost_price: edited.cost_price !== undefined ? edited.cost_price : orig.cost_price,
        retailer_price: edited.retailer_price !== undefined ? edited.retailer_price : orig.retailer_price,
        market_price: edited.market_price !== undefined ? edited.market_price : orig.market_price,
      };
    });

    try {
      const res = await fetch(`${API_BASE}/api/market-pricing/items/upsert-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet_id: selectedSheetId,
          items: itemsToUpsert,
          action_by: profile?.name || profile?.email || "Operator"
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save table edits");
      }
      showToast("All table changes saved successfully!", "success");
      setIsEditMode(false);
      await fetchItems(selectedSheetId);
    } catch (err: any) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setIsSavingDirectEdit(false);
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

  // Export / Print to Blob PDF (Direct new tab opening, no browser print dialog)
  const handlePrintPdfBlob = (forBuyer: boolean = false) => {
    if (!activeSheet) return;
    try {
      showToast(forBuyer ? "Generating Buyer PDF Document..." : "Generating PDF Document...", "info");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Title & Header Information (Black & White Theme)
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20, 20, 20); // Pure Black
      doc.text(forBuyer ? "PRODUCT & RSP LISTING SHEET" : "MARKET PRICE & RSP LISTING SHEET", 14, 15);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60); // Neutral dark charcoal
      doc.text(`Listing Sheet: ${activeSheet.name}`, 14, 21);
      
      const retNames = activeSheetRetailerIds.map((rid) => getRetailerName(rid)).filter(Boolean).join(", ");
      let currentHeaderY = 26;
      if (retNames) {
        doc.text(`Assigned Retailers: ${retNames}`, 14, currentHeaderY);
        currentHeaderY += 5;
      }
      doc.text(`Generated Date: ${new Date().toLocaleString("en-SG")}`, 14, currentHeaderY);

      // Group items by Tier
      const tierGroups: { [tierName: string]: PriceItem[] } = {};
      filteredItems.forEach((item) => {
        const tier = item.store_tier || "Standard";
        if (!tierGroups[tier]) {
          tierGroups[tier] = [];
        }
        tierGroups[tier].push(item);
      });

      const tierNames = Object.keys(tierGroups);

      if (forBuyer) {
        // ================= BUYER-FACING PDF (HIDES OUR COST) =================
        tierNames.forEach((tierName, tierIdx) => {
          const items = tierGroups[tierName];
          const startY = tierIdx === 0 ? currentHeaderY + 5 : (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : currentHeaderY + 5;

          // Tier Header Banner / Label
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 30, 30);
          doc.text(`Price Tier : ${tierName}`, 14, startY + 2);

          autoTable(doc, {
            startY: startY + 4,
            head: [
              [
                "#",
                "SKU",
                "Description",
                "Buyer Cost",
                "Market Price"
              ]
            ],
            body: items.map((item, idx) => {
              const retCost = item.retailer_price !== null && item.retailer_price !== undefined ? Number(item.retailer_price) : 0;
              const mkt = item.market_price !== null && item.market_price !== undefined ? Number(item.market_price) : 0;
              
              let mktMarginStr = "-";
              if (mkt > 0 || retCost > 0) {
                const mktGain = mkt - retCost;
                const mktMarginPct = mkt > 0 ? Math.round(((mkt - retCost) / mkt) * 100) : (retCost > 0 ? -100 : 0);
                mktMarginStr = `${mktGain >= 0 ? "+" : "-"}$${Math.abs(mktGain).toFixed(2)} (${mktMarginPct}%)`;
              }

              const productCombined = `${item.product_sku || "-"}\n${item.product_name || ""}`.trim();
              const mktStr = item.market_price !== null && item.market_price !== undefined ? `$${Number(item.market_price).toFixed(2)}` : "-";
              const mktCombined = `${mktStr}\n${mktMarginStr}`;

              return [
                String(idx + 1),
                item.retailer_sku || item.product_sku || "-",
                productCombined,
                item.retailer_price !== null && item.retailer_price !== undefined ? `$${Number(item.retailer_price).toFixed(2)}` : "-",
                mktCombined
              ];
            }),
            theme: "grid",
            showHead: "everyPage",
            rowPageBreak: "avoid",
            margin: { top: 15, bottom: 20, left: 14, right: 14 },
            headStyles: {
              fillColor: [30, 30, 30],
              textColor: [255, 255, 255],
              fontStyle: "bold",
              fontSize: 8,
              halign: "center"
            },
            bodyStyles: {
              fontSize: 7.5,
              fontStyle: "normal",
              textColor: [0, 0, 0]
            },
            alternateRowStyles: {
              fillColor: [248, 248, 248]
            },
            columnStyles: {
              0: { halign: "center", cellWidth: 10, fontStyle: "normal" },
              1: { halign: "center", cellWidth: 32, fontStyle: "normal" },
              2: { cellWidth: "auto", fontStyle: "normal" },
              3: { halign: "right", cellWidth: 32, fontStyle: "normal" },
              4: { halign: "right", cellWidth: 36, fontStyle: "normal" }
            },
            didParseCell: (data) => {
              if (data.section === "body") {
                if (data.column.index === 2 || data.column.index === 4) {
                  data.cell.styles.minCellHeight = 9.5;
                  data.cell.text = [];
                }
              }
            },
            didDrawCell: (data) => {
              if (data.section === "body") {
                const item = items[data.row.index];
                if (!item) return;

                if (data.column.index === 2) {
                  const x = data.cell.x + 2;
                  const y = data.cell.y + 3.8;
                  // Our Product SKU (Bold)
                  doc.setFont("helvetica", "bold");
                  doc.setFontSize(7.5);
                  doc.setTextColor(20, 20, 20);
                  doc.text(item.product_sku || "-", x, y);
                  // Product Name (small, unbold)
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(6);
                  doc.setTextColor(80, 80, 80);
                  const maxW = data.cell.width - 4;
                  const nameLines = doc.splitTextToSize(item.product_name || "", maxW);
                  doc.text(nameLines.slice(0, 2), x, y + 3.4);
                } else if (data.column.index === 4) {
                  const mktVal = item.market_price !== null && item.market_price !== undefined ? `$${Number(item.market_price).toFixed(2)}` : "-";
                  const retCost = item.retailer_price !== null && item.retailer_price !== undefined ? Number(item.retailer_price) : 0;
                  const mNum = item.market_price !== null && item.market_price !== undefined ? Number(item.market_price) : 0;
                  let mktMarginText = "-";
                  if (mNum > 0 || retCost > 0) {
                    const mktGain = mNum - retCost;
                    const mktMarginPct = mNum > 0 ? Math.round(((mNum - retCost) / mNum) * 100) : (retCost > 0 ? -100 : 0);
                    mktMarginText = `${mktGain >= 0 ? "+" : "-"}$${Math.abs(mktGain).toFixed(2)} (${mktMarginPct}%)`;
                  }

                  const x = data.cell.x + data.cell.width - 2;
                  const y = data.cell.y + 3.8;
                  // Market Price
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(7.5);
                  doc.setTextColor(20, 20, 20);
                  doc.text(mktVal, x, y, { align: "right" });
                  // Market Margin (bottom, small font, unbold)
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(6);
                  doc.setTextColor(90, 90, 90);
                  doc.text(mktMarginText, x, y + 3.4, { align: "right" });
                }
              }
            },
            didDrawPage: (data) => {
              const pageCount = (doc.internal as any).getNumberOfPages();
              doc.setFontSize(8);
              doc.setTextColor(100, 100, 100);
              doc.text(
                `Page ${data.pageNumber} of ${pageCount} - HSG Global Internal Bridge (iB)`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 8,
                { align: "center" }
              );
            }
          });
        });
      } else {
        // ================= INTERNAL FULL PDF (INCLUDES OUR COST) =================
        tierNames.forEach((tierName, tierIdx) => {
          const items = tierGroups[tierName];
          const startY = tierIdx === 0 ? currentHeaderY + 5 : (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : currentHeaderY + 5;

          // Tier Header Banner / Label
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 30, 30);
          doc.text(`Price Tier : ${tierName}`, 14, startY + 2);

          autoTable(doc, {
            startY: startY + 4,
            head: [
              [
                "#",
                "SKU",
                "Description",
                "Our Cost",
                "Buyer Cost",
                "Market Price"
              ]
            ],
            body: items.map((item, idx) => {
              const cost = item.cost_price !== null && item.cost_price !== undefined ? Number(item.cost_price) : 0;
              const retCost = item.retailer_price !== null && item.retailer_price !== undefined ? Number(item.retailer_price) : 0;
              const mkt = item.market_price !== null && item.market_price !== undefined ? Number(item.market_price) : 0;
              
              let ourMarginStr = "-";
              if (retCost > 0 || cost > 0) {
                const gainAmt = retCost - cost;
                const marginPct = retCost > 0 ? Math.round(((retCost - cost) / retCost) * 100) : (cost > 0 ? -100 : 0);
                ourMarginStr = `${gainAmt >= 0 ? "+" : "-"}$${Math.abs(gainAmt).toFixed(2)} (${marginPct}%)`;
              }

              let mktMarginStr = "-";
              if (mkt > 0 || retCost > 0) {
                const mktGain = mkt - retCost;
                const mktMarginPct = mkt > 0 ? Math.round(((mkt - retCost) / mkt) * 100) : (retCost > 0 ? -100 : 0);
                mktMarginStr = `${mktGain >= 0 ? "+" : "-"}$${Math.abs(mktGain).toFixed(2)} (${mktMarginPct}%)`;
              }

              const productCombined = `${item.product_sku || "-"}\n${item.product_name || ""}`.trim();
              const costStr = item.cost_price !== null && item.cost_price !== undefined ? `$${Number(item.cost_price).toFixed(2)}` : "-";
              const costCombined = `${costStr}\n${ourMarginStr}`;
              const mktStr = item.market_price !== null && item.market_price !== undefined ? `$${Number(item.market_price).toFixed(2)}` : "-";
              const mktCombined = `${mktStr}\n${mktMarginStr}`;

              return [
                String(idx + 1),
                item.retailer_sku || item.product_sku || "-",
                productCombined,
                costCombined,
                item.retailer_price !== null && item.retailer_price !== undefined ? `$${Number(item.retailer_price).toFixed(2)}` : "-",
                mktCombined
              ];
            }),
            theme: "grid",
            showHead: "everyPage",
            rowPageBreak: "avoid",
            margin: { top: 15, bottom: 20, left: 14, right: 14 },
            headStyles: {
              fillColor: [30, 30, 30],
              textColor: [255, 255, 255],
              fontStyle: "bold",
              fontSize: 8,
              halign: "center"
            },
            bodyStyles: {
              fontSize: 7.5,
              fontStyle: "normal",
              textColor: [0, 0, 0]
            },
            alternateRowStyles: {
              fillColor: [248, 248, 248]
            },
            columnStyles: {
              0: { halign: "center", cellWidth: 10, fontStyle: "normal" },
              1: { halign: "center", cellWidth: 30, fontStyle: "normal" },
              2: { cellWidth: "auto", fontStyle: "normal" },
              3: { halign: "right", cellWidth: 32, fontStyle: "normal" },
              4: { halign: "right", cellWidth: 28, fontStyle: "normal" },
              5: { halign: "right", cellWidth: 32, fontStyle: "normal" }
            },
            didParseCell: (data) => {
              if (data.section === "body") {
                if (data.column.index === 2 || data.column.index === 3 || data.column.index === 5) {
                  data.cell.styles.minCellHeight = 9.5;
                  data.cell.text = [];
                }
              }
            },
            didDrawCell: (data) => {
              if (data.section === "body") {
                const item = items[data.row.index];
                if (!item) return;

                if (data.column.index === 2) {
                  const x = data.cell.x + 2;
                  const y = data.cell.y + 3.8;
                  // Our Product SKU (Bold)
                  doc.setFont("helvetica", "bold");
                  doc.setFontSize(7.5);
                  doc.setTextColor(20, 20, 20);
                  doc.text(item.product_sku || "-", x, y);
                  // Product Name (small, unbold)
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(6);
                  doc.setTextColor(80, 80, 80);
                  const maxW = data.cell.width - 4;
                  const nameLines = doc.splitTextToSize(item.product_name || "", maxW);
                  doc.text(nameLines.slice(0, 2), x, y + 3.4);
                } else if (data.column.index === 3) {
                  const cost = item.cost_price !== null && item.cost_price !== undefined ? `$${Number(item.cost_price).toFixed(2)}` : "-";
                  const retCost = item.retailer_price !== null && item.retailer_price !== undefined ? Number(item.retailer_price) : 0;
                  const cNum = item.cost_price !== null && item.cost_price !== undefined ? Number(item.cost_price) : 0;
                  let marginText = "-";
                  if (retCost > 0 || cNum > 0) {
                    const gainAmt = retCost - cNum;
                    const marginPct = retCost > 0 ? Math.round(((retCost - cNum) / retCost) * 100) : (cNum > 0 ? -100 : 0);
                    marginText = `${gainAmt >= 0 ? "+" : "-"}$${Math.abs(gainAmt).toFixed(2)} (${marginPct}%)`;
                  }

                  const x = data.cell.x + data.cell.width - 2;
                  const y = data.cell.y + 3.8;
                  // Our Cost
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(7.5);
                  doc.setTextColor(20, 20, 20);
                  doc.text(cost, x, y, { align: "right" });
                  // Margin (bottom, small font, unbold)
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(6);
                  doc.setTextColor(90, 90, 90);
                  doc.text(marginText, x, y + 3.4, { align: "right" });
                } else if (data.column.index === 5) {
                  const mktVal = item.market_price !== null && item.market_price !== undefined ? `$${Number(item.market_price).toFixed(2)}` : "-";
                  const retCost = item.retailer_price !== null && item.retailer_price !== undefined ? Number(item.retailer_price) : 0;
                  const mNum = item.market_price !== null && item.market_price !== undefined ? Number(item.market_price) : 0;
                  let mktMarginText = "-";
                  if (mNum > 0 || retCost > 0) {
                    const mktGain = mNum - retCost;
                    const mktMarginPct = mNum > 0 ? Math.round(((mNum - retCost) / mNum) * 100) : (retCost > 0 ? -100 : 0);
                    mktMarginText = `${mktGain >= 0 ? "+" : "-"}$${Math.abs(mktGain).toFixed(2)} (${mktMarginPct}%)`;
                  }

                  const x = data.cell.x + data.cell.width - 2;
                  const y = data.cell.y + 3.8;
                  // Market Price
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(7.5);
                  doc.setTextColor(20, 20, 20);
                  doc.text(mktVal, x, y, { align: "right" });
                  // Market Margin (bottom, small font, unbold)
                  doc.setFont("helvetica", "normal");
                  doc.setFontSize(6);
                  doc.setTextColor(90, 90, 90);
                  doc.text(mktMarginText, x, y + 3.4, { align: "right" });
                }
              }
            },
            didDrawPage: (data) => {
              const pageCount = (doc.internal as any).getNumberOfPages();
              doc.setFontSize(8);
              doc.setTextColor(100, 100, 100);
              doc.text(
                `Page ${data.pageNumber} of ${pageCount} - HSG Global Internal Bridge (iB)`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 8,
                { align: "center" }
              );
            }
          });
        });
      }

      // Output as Blob URL and open directly in new tab
      const blob = doc.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (err: any) {
      showToast("PDF generation failed: " + err.message, "error");
    }
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
              Organize listing sheets, assign retailer clusters, manage Cost Price (Our Cost), Cost to Retailer (Buyer Cost), Market Price (RSP), and Margin Gain.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeSheet && (
              <>
                <button
                  onClick={() => handlePrintPdfBlob(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-zinc-800 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                  title="Print full internal listing sheet with Our Cost"
                >
                  <Printer size={14} className="text-zinc-600" />
                  <span>Print PDF</span>
                </button>
                <button
                  onClick={() => handlePrintPdfBlob(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-zinc-800 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
                  title="Print buyer listing sheet (hides Our Cost)"
                >
                  <Printer size={14} className="text-[#0B57D0]" />
                  <span>Print to Buyer</span>
                </button>
              </>
            )}

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
          
          {/* ================= LEFT PANEL: SHEETS & RETAILERS LIST ================= */}
          <div className="w-80 shrink-0 flex flex-col bg-[#F8F9FA] overflow-hidden">
            
            {/* View Mode Toggle: View by Retailer vs View by Sheet */}
            <div className="p-2.5 border-b border-slate-200 bg-white">
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSidebarViewMode("retailer")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    sidebarViewMode === "retailer"
                      ? "bg-white text-[#0B57D0] shadow-xs font-bold"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Store size={13} />
                  <span>By Retailer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarViewMode("sheet")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    sidebarViewMode === "sheet"
                      ? "bg-white text-[#0B57D0] shadow-xs font-bold"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <FileText size={13} />
                  <span>By Sheet</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative mt-2">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder={sidebarViewMode === "retailer" ? "Search retailers or sheets..." : "Search listing sheets..."}
                  value={sheetSearch}
                  onChange={(e) => setSheetSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] transition-all"
                />
              </div>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loadingSheets ? (
                <div className="p-4 text-center text-xs text-zinc-400">Loading catalog...</div>
              ) : sidebarViewMode === "retailer" ? (
                // ========== VIEW BY RETAILER (Retailer -> Listing Sheets) ==========
                filteredRetailersWithSheets.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-400">No retailers found.</div>
                ) : (
                  filteredRetailersWithSheets.map((item) => {
                    const isRetailerActive = item.retailerId === selectedRetailerId;
                    const hasActiveSheetInRetailer = item.sheets.some((s) => s.id === selectedSheetId);

                    return (
                      <div
                        key={item.retailerId}
                        className={`rounded-lg border transition-all overflow-hidden ${
                          hasActiveSheetInRetailer
                            ? "bg-white border-blue-300 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {/* Retailer Header Card */}
                        <div
                          onClick={() => {
                            setSelectedRetailerId(item.retailerId);
                            if (item.sheets.length > 0 && !hasActiveSheetInRetailer) {
                              setSelectedSheetId(item.sheets[0].id);
                            }
                          }}
                          className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer ${
                            hasActiveSheetInRetailer ? "bg-[#D3E3FD]/30" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0 text-zinc-600">
                              <Building2 size={13} />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-zinc-900 truncate">
                                {item.retailerName}
                              </h3>
                              <p className="text-[10px] text-zinc-500">
                                {item.sheets.length} {item.sheets.length === 1 ? "Listing Sheet" : "Listing Sheets"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Associated Listing Sheets under this Retailer */}
                        {item.sheets.length > 0 ? (
                          <div className="p-1.5 bg-slate-50/70 border-t border-slate-100 space-y-1">
                            {item.sheets.map((sheet) => {
                              const isSheetSelected = sheet.id === selectedSheetId;
                              return (
                                <div
                                  key={sheet.id}
                                  onClick={() => {
                                    setSelectedRetailerId(item.retailerId);
                                    setSelectedSheetId(sheet.id);
                                  }}
                                  className={`group flex items-center justify-between p-2 rounded-md transition-all cursor-pointer ${
                                    isSheetSelected
                                      ? "bg-[#0B57D0] text-white shadow-xs font-semibold"
                                      : "bg-white hover:bg-slate-100 border border-slate-200 text-zinc-800"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <FileText size={12} className={isSheetSelected ? "text-white" : "text-[#0B57D0]"} />
                                    <span className="text-xs truncate">{sheet.name}</span>
                                  </div>

                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingSheet(sheet);
                                        setIsSheetModalOpen(true);
                                      }}
                                      className={`p-0.5 rounded ${isSheetSelected ? "text-white hover:bg-blue-700" : "text-zinc-500 hover:bg-slate-200"}`}
                                      title="Edit Sheet"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-2 text-[10px] text-zinc-400 text-center bg-slate-50/50">
                            No listing sheets assigned
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              ) : (
                // ========== VIEW BY LISTING SHEET (Flat Sheets List) ==========
                filteredSheets.length === 0 ? (
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
                )
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
                      {activeSheetRetailerIds.length > 0 && (
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
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Expand/Collapse All Brands Toggle */}
                    <button
                      type="button"
                      onClick={toggleExpandAllBrands}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium rounded-md shadow-xs cursor-pointer"
                      title="Expand / Collapse all brand groups"
                    >
                      <span>{expandedBrandKeys.size > 0 ? "Collapse All Brands" : "Expand All Brands"}</span>
                    </button>

                    {/* Toggle In-Table Edit Mode */}
                    <button
                      onClick={() => {
                        if (isEditMode) {
                          // Cancel edit mode and reset
                          const map: Record<string, Partial<PriceItem>> = {};
                          items.forEach((it) => { map[it.id] = { ...it }; });
                          setEditRowsMap(map);
                          setIsEditMode(false);
                        } else {
                          // Enter edit mode
                          const map: Record<string, Partial<PriceItem>> = {};
                          items.forEach((it) => { map[it.id] = { ...it }; });
                          setEditRowsMap(map);
                          setIsEditMode(true);
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer ${
                        isEditMode
                          ? "bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200"
                          : "bg-white border border-slate-300 hover:bg-slate-50 text-zinc-800"
                      }`}
                    >
                      <SlidersHorizontal size={13} className={isEditMode ? "text-amber-700" : "text-[#0B57D0]"} />
                      <span>{isEditMode ? "Exit Edit Mode" : "Edit Mode"}</span>
                    </button>

                    {isEditMode && (
                      <button
                        onClick={handleSaveAllEditRows}
                        disabled={isSavingDirectEdit}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Save size={13} />
                        <span>{isSavingDirectEdit ? "Saving..." : "Save All Changes"}</span>
                      </button>
                    )}

                    {!isEditMode && (
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
                    )}
                  </div>
                </div>

                {/* Bulk Actions & Filter Toolbar */}
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between gap-2 bg-white shrink-0">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative w-64">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search SKU, name, brand, or tier..."
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                      />
                    </div>
                  </div>

                  {/* Bulk Action Buttons (Appear when >= 1 item selected) */}
                  {selectedItemIds.size > 0 && !isEditMode && (
                    <div className="flex items-center gap-2 animate-in fade-in duration-150">
                      <span className="text-xs font-semibold text-zinc-500">
                        {selectedItemIds.size} Selected
                      </span>
                      <button
                        onClick={() => {
                          setBulkCostPrice("");
                          setBulkRetailerPrice("");
                          setBulkMarketPrice("");
                          setBulkPriceRemark("");
                          setIsBulkPriceModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-zinc-800 rounded shadow-xs cursor-pointer"
                      >
                        <TrendingUp size={12} className="text-blue-600" />
                        <span>Bulk Edit Prices</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Table View with Tier & Collapsible Brand Grouping */}
                <div className="flex-1 min-h-0 overflow-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#F8F9FA] sticky top-0 z-20 border-b border-slate-200 text-zinc-600 font-bold">
                      <tr>
                        <th className="w-10 px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={filteredItems.length > 0 && selectedItemIds.size === filteredItems.length}
                            onChange={toggleSelectAll}
                            className="rounded border-slate-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                          />
                        </th>
                        <th className="px-3 py-2 min-w-[150px]">Product / Brand</th>
                        <th className="px-3 py-2 min-w-[160px]">Product Name</th>
                        <th className="px-3 py-2 min-w-[120px]">Retailer SKU</th>
                        <th className="px-3 py-2 min-w-[90px]">Store Tier</th>
                        <th className="px-3 py-2 text-right min-w-[115px]">Cost Price</th>
                        <th className="px-3 py-2 text-right min-w-[115px]">Cost to Retailer</th>
                        <th className="px-3 py-2 text-right min-w-[115px]">Market Price (RSP)</th>
                        <th className="px-3 py-2 text-right min-w-[100px]">Margin</th>
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
                        groupedTierBrandItems.map((tierGroup) => (
                          <React.Fragment key={tierGroup.tierName}>
                            {/* Tier Header Divider */}
                            <tr className="bg-[#F8F9FA] border-y border-slate-200 text-zinc-600 font-medium">
                              <td colSpan={10} className="px-4 py-1 text-xs">
                                <span className="font-semibold text-zinc-700">Tier:</span> {tierGroup.tierName}{" "}
                                <span className="text-zinc-400 font-normal">
                                  ({tierGroup.brandGroups.reduce((acc, bg) => acc + bg.items.length, 0)} SKUs)
                                </span>
                              </td>
                            </tr>

                            {/* Brand Parent / Summary Rows */}
                            {tierGroup.brandGroups.map((bg) => {
                              const isExpanded = expandedBrandKeys.has(bg.brandKey);
                              const isAllSelected = bg.items.every((it) => selectedItemIds.has(it.id));
                              const isSomeSelected = bg.items.some((it) => selectedItemIds.has(it.id)) && !isAllSelected;

                              // Calculate brand summary prices (check if uniform or varied)
                              const brandCostPrices = bg.items.map((it) => {
                                const ed = editRowsMap[it.id] || it;
                                return isEditMode ? ed.cost_price : it.cost_price;
                              });
                              const brandRetailerPrices = bg.items.map((it) => {
                                const ed = editRowsMap[it.id] || it;
                                return isEditMode ? ed.retailer_price : it.retailer_price;
                              });
                              const brandMarketPrices = bg.items.map((it) => {
                                const ed = editRowsMap[it.id] || it;
                                return isEditMode ? ed.market_price : it.market_price;
                              });

                              const uniformCost = brandCostPrices.every((v) => v === brandCostPrices[0]) ? brandCostPrices[0] : null;
                              const uniformRetailer = brandRetailerPrices.every((v) => v === brandRetailerPrices[0]) ? brandRetailerPrices[0] : null;
                              const uniformMarket = brandMarketPrices.every((v) => v === brandMarketPrices[0]) ? brandMarketPrices[0] : null;

                              const numCost = uniformCost !== null && uniformCost !== undefined ? Number(uniformCost) : 0;
                              const numRet = uniformRetailer !== null && uniformRetailer !== undefined ? Number(uniformRetailer) : 0;
                              const brandGain = numRet - numCost;
                              const brandHasValues = uniformRetailer !== null || uniformCost !== null;

                              return (
                                <React.Fragment key={bg.brandKey}>
                                  {/* ============ BRAND PARENT ROW ============ */}
                                  <tr
                                    className={`border-b border-slate-200 transition-colors ${
                                      isExpanded ? "bg-slate-50/70" : "bg-white hover:bg-slate-50/50"
                                    }`}
                                  >
                                    {/* Selection Checkbox for all items in Brand */}
                                    <td className="px-3 py-2 text-center align-middle">
                                      <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                                        onChange={() => {
                                          const next = new Set(selectedItemIds);
                                          if (isAllSelected) {
                                            bg.items.forEach((it) => next.delete(it.id));
                                          } else {
                                            bg.items.forEach((it) => next.add(it.id));
                                          }
                                          setSelectedItemIds(next);
                                        }}
                                        className="rounded border-slate-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                                      />
                                    </td>

                                    {/* Brand Expand Toggle & Brand Name */}
                                    <td className="px-3 py-2 align-middle">
                                      <button
                                        type="button"
                                        onClick={() => toggleBrandExpand(bg.brandKey)}
                                        className="flex items-center gap-1.5 text-left text-zinc-900 hover:text-[#0B57D0] cursor-pointer group"
                                      >
                                        <div className="w-4 h-4 rounded bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0 text-zinc-500 group-hover:text-[#0B57D0] transition-colors">
                                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-semibold">{bg.brandName}</span>
                                          {bg.specLabel && (
                                            <span className="text-xs text-zinc-500 font-normal">
                                              ({bg.specLabel})
                                            </span>
                                          )}
                                        </div>
                                      </button>
                                    </td>

                                    {/* Product Count (Simple text) */}
                                    <td className="px-3 py-2 align-middle text-zinc-500 text-xs font-normal">
                                      {bg.items.length} {bg.items.length === 1 ? "SKU" : "SKUs"}
                                    </td>

                                    {/* Retailer SKU col (Brand placeholder) */}
                                    <td className="px-3 py-2 align-middle text-zinc-300 text-xs font-normal">
                                      -
                                    </td>

                                    {/* Store Tier */}
                                    <td className="px-3 py-2 align-middle text-zinc-500 text-xs font-normal">
                                      {bg.tierName}
                                    </td>

                                    {/* Brand Cost Price (Cascade Edit) */}
                                    <td className="px-3 py-2 text-right align-middle font-mono text-xs">
                                      {isEditMode ? (
                                        <div className="relative">
                                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">$</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            placeholder={uniformCost === null ? "?" : "0.00"}
                                            value={uniformCost !== null && uniformCost !== undefined ? uniformCost : ""}
                                            onChange={(e) => {
                                              const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                              handleBrandPriceChange(bg.items, "cost_price", val);
                                            }}
                                            className="w-20 pl-4 pr-1 py-1 text-right border border-slate-300 rounded bg-amber-50/50 text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                            title="Edit Cost Price for ALL products in this brand"
                                          />
                                        </div>
                                      ) : (
                                        <span className={uniformCost !== null && uniformCost !== undefined ? "text-zinc-800 font-normal" : "text-zinc-400 font-normal"}>
                                          {uniformCost !== null && uniformCost !== undefined ? `$${Number(uniformCost).toFixed(2)}` : "?"}
                                        </span>
                                      )}
                                    </td>

                                    {/* Brand Cost to Retailer (Cascade Edit) */}
                                    <td className="px-3 py-2 text-right align-middle font-mono text-xs">
                                      {isEditMode ? (
                                        <div className="relative">
                                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">$</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            placeholder={uniformRetailer === null ? "?" : "0.00"}
                                            value={uniformRetailer !== null && uniformRetailer !== undefined ? uniformRetailer : ""}
                                            onChange={(e) => {
                                              const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                              handleBrandPriceChange(bg.items, "retailer_price", val);
                                            }}
                                            className="w-20 pl-4 pr-1 py-1 text-right border border-blue-300 rounded bg-blue-50/40 text-xs font-mono font-medium text-[#0B57D0] focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                            title="Edit Cost to Retailer for ALL products in this brand"
                                          />
                                        </div>
                                      ) : (
                                        <span className={uniformRetailer !== null && uniformRetailer !== undefined ? "text-[#0B57D0] font-medium" : "text-zinc-400 font-normal"}>
                                          {uniformRetailer !== null && uniformRetailer !== undefined ? `$${Number(uniformRetailer).toFixed(2)}` : "?"}
                                        </span>
                                      )}
                                    </td>

                                    {/* Brand Market Price (Cascade Edit) */}
                                    <td className="px-3 py-2 text-right align-middle font-mono text-xs">
                                      {isEditMode ? (
                                        <div className="relative">
                                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">$</span>
                                          <input
                                            type="number"
                                            step="0.01"
                                            placeholder={uniformMarket === null ? "?" : "0.00"}
                                            value={uniformMarket !== null && uniformMarket !== undefined ? uniformMarket : ""}
                                            onChange={(e) => {
                                              const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                              handleBrandPriceChange(bg.items, "market_price", val);
                                            }}
                                            className="w-20 pl-4 pr-1 py-1 text-right border border-slate-300 rounded bg-amber-50/50 text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                            title="Edit Market Price for ALL products in this brand"
                                          />
                                        </div>
                                      ) : (
                                        <span className={uniformMarket !== null && uniformMarket !== undefined ? "text-zinc-800 font-normal" : "text-zinc-400 font-normal"}>
                                          {uniformMarket !== null && uniformMarket !== undefined ? `$${Number(uniformMarket).toFixed(2)}` : "?"}
                                        </span>
                                      )}
                                    </td>

                                    {/* Brand Margin */}
                                    <td className="px-3 py-2 text-right align-middle font-mono text-xs">
                                      {brandHasValues && uniformCost !== null && uniformRetailer !== null ? (
                                        (() => {
                                          const marginPct = numRet > 0 ? Math.round(((numRet - numCost) / numRet) * 100) : (numCost > 0 ? -100 : 0);
                                          return brandGain >= 0 ? (
                                            <span className="text-emerald-700 font-normal">
                                              +${brandGain.toFixed(2)} ({marginPct}%)
                                            </span>
                                          ) : (
                                            <span className="text-red-600 font-normal">
                                              -${Math.abs(brandGain).toFixed(2)} ({marginPct}%)
                                            </span>
                                          );
                                        })()
                                      ) : (
                                        <span className="text-zinc-400 font-normal">?</span>
                                      )}
                                    </td>

                                    {/* Brand Actions */}
                                    <td className="px-3 py-2 text-center align-middle">
                                      <button
                                        type="button"
                                        onClick={() => toggleBrandExpand(bg.brandKey)}
                                        className="text-xs text-zinc-500 hover:text-[#0B57D0] cursor-pointer"
                                      >
                                        {isExpanded ? "Collapse" : "Expand"}
                                      </button>
                                    </td>
                                  </tr>

                                  {/* ============ CHILD SKU ROWS (Expanded) ============ */}
                                  {isExpanded && bg.items.map((item) => {
                                    const isSelected = selectedItemIds.has(item.id);
                                    const editRow = editRowsMap[item.id] || item;

                                    const currentCost = isEditMode
                                      ? (editRow.cost_price !== undefined && editRow.cost_price !== null ? Number(editRow.cost_price) : 0)
                                      : (item.cost_price !== null && item.cost_price !== undefined ? Number(item.cost_price) : 0);

                                    const currentRetailerCost = isEditMode
                                      ? (editRow.retailer_price !== undefined && editRow.retailer_price !== null ? Number(editRow.retailer_price) : 0)
                                      : (item.retailer_price !== null && item.retailer_price !== undefined ? Number(item.retailer_price) : 0);

                                    const gainAmt = currentRetailerCost - currentCost;
                                    const hasValues = (isEditMode ? (editRow.retailer_price !== null && editRow.retailer_price !== undefined) : (item.retailer_price !== null && item.retailer_price !== undefined)) ||
                                                      (isEditMode ? (editRow.cost_price !== null && editRow.cost_price !== undefined) : (item.cost_price !== null && item.cost_price !== undefined));

                                    return (
                                      <tr
                                        key={item.id}
                                        className={`transition-colors bg-slate-50/30 ${
                                          isSelected ? "bg-[#D3E3FD]/20" : isEditMode ? "hover:bg-amber-50/40 bg-amber-50/10" : "hover:bg-[#F0F4F9]/50"
                                        }`}
                                      >
                                        {/* Child Checkbox */}
                                        <td className="px-3 py-2 text-center align-middle">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelectItem(item.id)}
                                            className="rounded border-slate-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                                          />
                                        </td>

                                        {/* Product SKU (Locked) with indented tree line */}
                                        <td className="px-3 py-2 align-middle">
                                          <div className="flex items-center gap-1.5 pl-4 font-mono text-zinc-600 text-xs">
                                            <span className="text-zinc-300">↳</span>
                                            <span>{item.product_sku}</span>
                                            {isEditMode && (
                                              <span title="Product SKU is locked">
                                                <Lock size={10} className="text-zinc-400" />
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        {/* Product Name */}
                                        <td className="px-3 py-2 align-middle">
                                          {isEditMode ? (
                                            <input
                                              type="text"
                                              value={editRow.product_name ?? ""}
                                              onChange={(e) => {
                                                setEditRowsMap((prev) => ({
                                                  ...prev,
                                                  [item.id]: { ...prev[item.id], product_name: e.target.value }
                                                }));
                                              }}
                                              className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                            />
                                          ) : (
                                            <span className="text-zinc-700 text-xs line-clamp-1" title={item.product_name}>
                                              {item.product_name || "-"}
                                            </span>
                                          )}
                                        </td>

                                        {/* Retailer SKU (Editable) */}
                                        <td className="px-3 py-2 align-middle">
                                          {isEditMode ? (
                                            <input
                                              type="text"
                                              value={editRow.retailer_sku ?? ""}
                                              onChange={(e) => {
                                                setEditRowsMap((prev) => ({
                                                  ...prev,
                                                  [item.id]: { ...prev[item.id], retailer_sku: e.target.value }
                                                }));
                                              }}
                                              className="w-full px-2 py-1 font-mono border border-slate-300 rounded bg-white text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                            />
                                          ) : (
                                            <span className="font-mono text-zinc-600 text-xs">
                                              {item.retailer_sku || item.product_sku}
                                            </span>
                                          )}
                                        </td>

                                        {/* Store Tier */}
                                        <td className="px-3 py-2 align-middle">
                                          {isEditMode ? (
                                            <select
                                              value={editRow.store_tier || "Standard"}
                                              onChange={(e) => {
                                                setEditRowsMap((prev) => ({
                                                  ...prev,
                                                  [item.id]: { ...prev[item.id], store_tier: e.target.value }
                                                }));
                                              }}
                                              className="w-full px-1.5 py-1 border border-slate-300 rounded bg-white text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                            >
                                              <option value="Standard">Standard</option>
                                              <option value="Tier 1">Tier 1</option>
                                              <option value="Tier 2">Tier 2</option>
                                              <option value="Tier 3">Tier 3</option>
                                            </select>
                                          ) : (
                                            <span className="text-zinc-500 text-xs">
                                              {item.store_tier || "Standard"}
                                            </span>
                                          )}
                                        </td>

                                        {/* Cost Price (Our Price) */}
                                        <td className="px-3 py-2 text-right align-middle font-mono text-xs">
                                          {isEditMode ? (
                                            <div className="relative">
                                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">$</span>
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={editRow.cost_price !== null && editRow.cost_price !== undefined ? editRow.cost_price : ""}
                                                onChange={(e) => {
                                                  const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                                  setEditRowsMap((prev) => ({
                                                    ...prev,
                                                    [item.id]: { ...prev[item.id], cost_price: val }
                                                  }));
                                                }}
                                                className="w-20 pl-4 pr-1 py-1 text-right border border-slate-300 rounded bg-white text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                              />
                                            </div>
                                          ) : (
                                            <span className="text-zinc-700">
                                              {item.cost_price !== null && item.cost_price !== undefined ? `$${Number(item.cost_price).toFixed(2)}` : "-"}
                                            </span>
                                          )}
                                        </td>

                                        {/* Cost to Retailer */}
                                        <td className="px-3 py-2 text-right align-middle font-mono text-xs">
                                          {isEditMode ? (
                                            <div className="relative">
                                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">$</span>
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={editRow.retailer_price !== null && editRow.retailer_price !== undefined ? editRow.retailer_price : ""}
                                                onChange={(e) => {
                                                  const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                                  setEditRowsMap((prev) => ({
                                                    ...prev,
                                                    [item.id]: { ...prev[item.id], retailer_price: val }
                                                  }));
                                                }}
                                                className="w-20 pl-4 pr-1 py-1 text-right border border-blue-300 rounded bg-white text-xs font-mono font-medium text-[#0B57D0] focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                              />
                                            </div>
                                          ) : (
                                            <span className="text-[#0B57D0] font-medium">
                                              {item.retailer_price !== null && item.retailer_price !== undefined ? `$${Number(item.retailer_price).toFixed(2)}` : "-"}
                                            </span>
                                          )}
                                        </td>

                                        {/* Market Price (RSP) */}
                                        <td className="px-3 py-2 text-right align-middle font-mono text-xs">
                                          {isEditMode ? (
                                            <div className="relative">
                                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">$</span>
                                              <input
                                                type="number"
                                                step="0.01"
                                                value={editRow.market_price !== null && editRow.market_price !== undefined ? editRow.market_price : ""}
                                                onChange={(e) => {
                                                  const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                                  setEditRowsMap((prev) => ({
                                                    ...prev,
                                                    [item.id]: { ...prev[item.id], market_price: val }
                                                  }));
                                                }}
                                                className="w-20 pl-4 pr-1 py-1 text-right border border-slate-300 rounded bg-white text-xs font-mono font-medium focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                              />
                                            </div>
                                          ) : (
                                            <span className="text-zinc-700">
                                              {item.market_price !== null && item.market_price !== undefined ? `$${Number(item.market_price).toFixed(2)}` : "-"}
                                            </span>
                                          )}
                                        </td>

                                        {/* Margin (Live calculation) */}
                                        <td className="px-3 py-2 text-right align-middle font-mono text-xs">
                                          {hasValues ? (
                                            (() => {
                                              const marginPct = currentRetailerCost > 0
                                                ? Math.round(((currentRetailerCost - currentCost) / currentRetailerCost) * 100)
                                                : (currentCost > 0 ? -100 : 0);
                                              return gainAmt >= 0 ? (
                                                <span className="text-emerald-700 font-normal">
                                                  +${gainAmt.toFixed(2)} ({marginPct}%)
                                                </span>
                                              ) : (
                                                <span className="text-red-600 font-normal">
                                                  -${Math.abs(gainAmt).toFixed(2)} ({marginPct}%)
                                                </span>
                                              );
                                            })()
                                          ) : (
                                            <span className="text-zinc-400 font-normal">-</span>
                                          )}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-3 py-2 text-center align-middle">
                                          <div className="flex items-center justify-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingItem(item);
                                                setIsEditItemModalOpen(true);
                                              }}
                                              className="p-1 hover:bg-slate-100 text-zinc-500 hover:text-[#0B57D0] rounded cursor-pointer transition-colors"
                                              title="Edit item details"
                                            >
                                              <Edit2 size={12} />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteItem(item.id)}
                                              className="p-1 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded cursor-pointer transition-colors"
                                              title="Remove product from sheet"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                          </React.Fragment>
                        ))
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
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
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
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-zinc-700 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-md shadow-xs cursor-pointer"
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
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
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
                  className="text-xs text-[#0B57D0] hover:underline font-semibold cursor-pointer"
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
                    <th className="px-3 py-2 text-right">Default Cost (Our Price)</th>
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
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-zinc-700 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddProductsToSheet}
                className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-md shadow-xs cursor-pointer"
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
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={editingItem.product_name || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, product_name: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              {/* Retailer SKU & Tier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Retailer SKU
                  </label>
                  <input
                    type="text"
                    value={editingItem.retailer_sku || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, retailer_sku: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Store Tier
                  </label>
                  <select
                    value={editingItem.store_tier || "Standard"}
                    onChange={(e) => setEditingItem({ ...editingItem, store_tier: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Tier 1">Tier 1</option>
                    <option value="Tier 2">Tier 2</option>
                    <option value="Tier 3">Tier 3</option>
                  </select>
                </div>
              </div>

              {/* Cost Price (Our Price) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Cost Price (Our Price / COGS)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editingItem.cost_price !== null && editingItem.cost_price !== undefined ? editingItem.cost_price : ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        cost_price: e.target.value !== "" ? parseFloat(e.target.value) : null
                      })
                    }
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Cost to Retailer (Wholesale Price) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Cost to Retailer (What Retailer Pays Us)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editingItem.retailer_price !== null && editingItem.retailer_price !== undefined ? editingItem.retailer_price : ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        retailer_price: e.target.value !== "" ? parseFloat(e.target.value) : null
                      })
                    }
                    className="w-full pl-7 pr-3 py-1.5 border border-blue-300 text-[#0B57D0] rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Market Price (Shelf Price / RSP) */}
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
                    value={editingItem.market_price !== null && editingItem.market_price !== undefined ? editingItem.market_price : ""}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        market_price: e.target.value !== "" ? parseFloat(e.target.value) : null
                      })
                    }
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Live Calculated Margin Badge */}
              {(() => {
                const cost = Number(editingItem.cost_price || 0);
                const retCost = Number(editingItem.retailer_price || 0);
                const gainAmt = retCost - cost;
                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-600 font-sans font-medium">Margin:</span>
                    {gainAmt >= 0 ? (
                      <span className="font-bold text-emerald-700 font-mono">
                        +${gainAmt.toFixed(2)}
                      </span>
                    ) : (
                      <span className="font-bold text-red-600 font-mono">
                        -${Math.abs(gainAmt).toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditItemModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-zinc-700 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-md shadow-xs cursor-pointer"
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
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  New Cost Price (Our Price) [Optional]
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
                  New Cost to Retailer [Optional]
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Leave blank to keep existing"
                    value={bulkRetailerPrice}
                    onChange={(e) => setBulkRetailerPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  New Market Price (RSP) [Optional]
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
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-zinc-700 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkPrice}
                  className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded-md shadow-xs cursor-pointer"
                >
                  Apply Price Update
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
                  <h2 className="text-sm font-bold text-zinc-950">Price & Audit Log</h2>
                  <p className="text-xs text-zinc-500">{historyDrawerItem.product_sku} - {historyDrawerItem.product_name}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryDrawerItem(null)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
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
                                <span className="text-zinc-500 font-sans">Cost Price (Our):</span>
                                <span>${Number(entry.old_cost || 0).toFixed(2)}</span>
                                <ArrowRight size={11} className="text-zinc-400" />
                                <span className="font-bold text-zinc-900">${Number(entry.new_cost || 0).toFixed(2)}</span>
                              </div>
                            )}

                            {(entry.old_retailer_price !== undefined || entry.new_retailer_price !== undefined) && (
                              <div className="text-xs text-zinc-700 flex items-center gap-1.5 mt-1 font-mono">
                                <span className="text-zinc-500 font-sans">Cost to Retailer:</span>
                                <span>${Number(entry.old_retailer_price || 0).toFixed(2)}</span>
                                <ArrowRight size={11} className="text-zinc-400" />
                                <span className="font-bold text-[#0B57D0]">${Number(entry.new_retailer_price || 0).toFixed(2)}</span>
                              </div>
                            )}

                            {(entry.old_market !== undefined || entry.new_market !== undefined) && (
                              <div className="text-xs text-zinc-700 flex items-center gap-1.5 mt-1 font-mono">
                                <span className="text-zinc-500 font-sans">Market RSP:</span>
                                <span>${Number(entry.old_market || 0).toFixed(2)}</span>
                                <ArrowRight size={11} className="text-zinc-400" />
                                <span className="font-bold text-zinc-900">${Number(entry.new_market || 0).toFixed(2)}</span>
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
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-zinc-700 rounded-md transition-colors cursor-pointer"
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
                className={`px-3.5 py-1.5 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer ${
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
