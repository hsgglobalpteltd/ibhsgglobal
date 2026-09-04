"use client";

import * as React from "react";
import { 
  Search, 
  Calendar, 
  Download, 
  RefreshCw, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Repeat, 
  Truck, 
  RotateCcw, 
  Package, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Filter, 
  X, 
  ChevronRight,
  Sparkles,
  ArrowUpDown
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";
import { NavigationTabs } from "../navigation-tabs";
import * as XLSX from "xlsx";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface ProductItem {
  sku: string;
  display_name?: string;
  name?: string;
  brands_id?: string;
  carton?: number | string;
  uom?: number | string;
  status?: string;
  [key: string]: any;
}

interface BrandItem {
  id: string;
  display_name?: string;
  name?: string;
  rank?: number | string;
  [key: string]: any;
}

interface StockMovementItem {
  id: string;
  timestamp: number;
  create_by: string;
  action_type: string;
  items: Array<{ sku: string; qty: number; [key: string]: any }>;
  reference?: {
    ref_no?: string;
    do_no?: string;
    remark?: string;
    destination?: string;
    action_type?: string;
    [key: string]: any;
  };
  status?: boolean | number | string;
  [key: string]: any;
}

interface TrackOrderItem {
  id: string;
  do_number: string;
  ref_number: string;
  type: string;
  deliver_to: string;
  poscode: string;
  items: Array<{ sku: string; qty: number; [key: string]: any }> | string;
  status: string;
  timestamp: number;
  delivered_at?: number | string;
  credit_note_number?: string;
  [key: string]: any;
}

export interface StockCardModuleProps {
  profile?: {
    role?: string;
    name?: string;
    email?: string;
  } | null;
}

interface SummaryRow {
  sku: string;
  name: string;
  brandName: string;
  brandRank: number;
  uom: number;
  totalIn: number;
  totalOut: number;
  netMovement: number;
}

interface MovementEventRow {
  id: string;
  timestamp: number;
  dateStr: string;
  type: "Stock In" | "Stock Out" | "Stock Transfer" | "DO Delivery" | "Return (Credit Note)";
  typeCategory: "IN" | "OUT";
  millionRefNumber: string;
  refNumber: string;
  sku: string;
  productName: string;
  brandName: string;
  inQty: number;
  outQty: number;
  handledBy: string;
  destinationOrRemark: string;
}

// Calculate the start (Sunday 00:00:00) and end (Saturday 23:59:59) of the current week
function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 6 is Saturday
  
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  
  return {
    start: sunday.toISOString().split("T")[0],
    end: saturday.toISOString().split("T")[0]
  };
}

function getLastWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  
  const prevSunday = new Date(now);
  prevSunday.setDate(now.getDate() - day - 7);
  
  const prevSaturday = new Date(prevSunday);
  prevSaturday.setDate(prevSunday.getDate() + 6);
  
  return {
    start: prevSunday.toISOString().split("T")[0],
    end: prevSaturday.toISOString().split("T")[0]
  };
}

function getThisMonthRange(): { start: string; end: string } {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    start: firstDay.toISOString().split("T")[0],
    end: lastDay.toISOString().split("T")[0]
  };
}

function formatDateDisplay(epochOrStr: number | string): string {
  if (!epochOrStr) return "-";
  const d = typeof epochOrStr === "number" ? new Date(epochOrStr) : new Date(epochOrStr);
  if (isNaN(d.getTime())) return String(epochOrStr);
  
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTimeDisplay(epochOrStr: number | string): string {
  if (!epochOrStr) return "-";
  const d = typeof epochOrStr === "number" ? new Date(epochOrStr) : new Date(epochOrStr);
  if (isNaN(d.getTime())) return String(epochOrStr);
  
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

function cleanRefNumber(val: any): string {
  if (!val) return "";
  const s = String(val).trim();
  const lower = s.toLowerCase();
  if (
    lower === "none" ||
    lower === "null" ||
    lower === "undefined" ||
    lower === "-" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "nan"
  ) {
    return "";
  }
  return s;
}

export function StockCardModule({ profile }: StockCardModuleProps) {
  // Navigation Tabs: "summary" (By Total) or "movements" (By Movement List)
  const [activeTab, setActiveTab] = React.useState<"summary" | "movements">("summary");

  // Date Range state (Default to Current Week: Sunday - Saturday)
  const [datePreset, setDatePreset] = React.useState<"current_week" | "last_week" | "this_month" | "custom">("current_week");
  const [startDate, setStartDate] = React.useState<string>(() => getCurrentWeekRange().start);
  const [endDate, setEndDate] = React.useState<string>(() => getCurrentWeekRange().end);

  // Raw Database Data
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [brands, setBrands] = React.useState<BrandItem[]>([]);
  const [stockMovements, setStockMovements] = React.useState<StockMovementItem[]>([]);
  const [trackOrders, setTrackOrders] = React.useState<TrackOrderItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = React.useState<string>("" );
  const [selectedBrand, setSelectedBrand] = React.useState<string>("all");
  const [movementTypeFilter, setMovementTypeFilter] = React.useState<string>("all");

  // Sorting
  const [sortField, setSortField] = React.useState<string>("sku");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  // Load live data from endpoints
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [brandRes, prodRes, smRes, toRes] = await Promise.all([
        fetch(`${WORKER_URL}/api/inventory/brands`, { cache: "no-store" }).catch(() => null),
        fetch(`${WORKER_URL}/api/inventory/products`, { cache: "no-store" }).catch(() => null),
        fetch(`${WORKER_URL}/api/stock-movement`, { cache: "no-store" }).catch(() => null),
        fetch(`${WORKER_URL}/api/track-orders`, { cache: "no-store" }).catch(() => null)
      ]);

      if (brandRes && brandRes.ok) {
        const bData = await brandRes.json();
        setBrands(Array.isArray(bData) ? bData : []);
      }

      if (prodRes && prodRes.ok) {
        const pData = await prodRes.json();
        const rawList = Array.isArray(pData) ? pData : [];
        const activeOnly = rawList.filter((p: any) => {
          const st = String(p.status || p.Status || "Active").trim().toLowerCase();
          return st === "active";
        });
        setProducts(activeOnly);
      }

      if (smRes && smRes.ok) {
        const smData = await smRes.json();
        setStockMovements(Array.isArray(smData) ? smData : []);
      }

      if (toRes && toRes.ok) {
        const toData = await toRes.json();
        setTrackOrders(Array.isArray(toData) ? toData : []);
      }
    } catch (err: any) {
      console.error("Failed to load stock card data:", err);
      showToast("Failed to fetch stock card data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen to global db-refresh event
  React.useEffect(() => {
    const handleDbRefresh = () => {
      loadData();
      showToast("Stock card data refreshed!", "success");
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [loadData]);

  // Brand Metadata Map
  const brandMap = React.useMemo(() => {
    const map: Record<string, { id: string; name: string; rank: number }> = {};
    brands.forEach((b) => {
      const bId = String(b.id || "").trim();
      if (!bId) return;
      const bName = String(b.display_name || b.name || bId).trim();
      const bRank = Number(b.rank || 999);
      map[bId.toLowerCase()] = {
        id: bId,
        name: bName,
        rank: isNaN(bRank) ? 999 : bRank
      };
    });
    return map;
  }, [brands]);

  // Product Lookup Map (SKU lowercase -> Active Product Info)
  const productMap = React.useMemo(() => {
    const map: Record<string, { sku: string; name: string; brandName: string; brandRank: number; uom: number }> = {};
    products.forEach((p) => {
      const status = String(p.status || p.Status || "Active").trim().toLowerCase();
      if (status !== "active") return;

      const sku = String(p.sku || p.SKU || p.Code || "").trim();
      if (!sku) return;
      const normSku = sku.toLowerCase();
      const rawBrandId = String(p.brands_id || p.brandId || "").trim();
      const bMeta = brandMap[rawBrandId.toLowerCase()];
      const brandName = bMeta ? bMeta.name : (rawBrandId || "Unbranded");
      const brandRank = bMeta ? bMeta.rank : 999;
      const name = p.display_name || p.name || p.productName || sku;
      const uom = Number(p.carton || p.uom) || 1;

      map[normSku] = {
        sku,
        name,
        brandName,
        brandRank,
        uom
      };
    });
    return map;
  }, [products, brandMap]);

  // Unique Brand Options extracted ONLY from active products, deduplicated by name, sorted alphabetically (A-Z)
  const activeBrandOptions = React.useMemo(() => {
    const brandNameSet = new Set<string>();
    Object.values(productMap).forEach((p) => {
      const name = p.brandName.trim();
      if (name && name !== "-" && name.toLowerCase() !== "none") {
        brandNameSet.add(name);
      }
    });

    const list = Array.from(brandNameSet);
    list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return list;
  }, [productMap]);

  // Preset Date Handlers
  const handleSelectPreset = (preset: "current_week" | "last_week" | "this_month") => {
    setDatePreset(preset);
    if (preset === "current_week") {
      const r = getCurrentWeekRange();
      setStartDate(r.start);
      setEndDate(r.end);
    } else if (preset === "last_week") {
      const r = getLastWeekRange();
      setStartDate(r.start);
      setEndDate(r.end);
    } else if (preset === "this_month") {
      const r = getThisMonthRange();
      setStartDate(r.start);
      setEndDate(r.end);
    }
  };

  // Date Range Bounds in Epoch Milliseconds (Singapore GMT+8)
  const { startEpoch, endEpoch } = React.useMemo(() => {
    let start = 0;
    let end = Infinity;

    if (startDate) {
      const s = new Date(`${startDate}T00:00:00+08:00`);
      if (!isNaN(s.getTime())) start = s.getTime();
    }
    if (endDate) {
      const e = new Date(`${endDate}T23:59:59.999+08:00`);
      if (!isNaN(e.getTime())) end = e.getTime();
    }

    return { startEpoch: start, endEpoch: end };
  }, [startDate, endDate]);

  // ==========================================================================
  // PARSE AND CLASSIFY ALL INVENTORY MOVEMENT TRANSACTIONS
  // ==========================================================================
  const allMovementEvents = React.useMemo<MovementEventRow[]>(() => {
    const events: MovementEventRow[] = [];

    // 1. Ingest stock_movement records (Read all records regardless of status)
    stockMovements.forEach((m) => {
      const timestamp = Number(m.timestamp) || 0;
      if (timestamp < startEpoch || timestamp > endEpoch) return;

      const actTypeRaw = String(m.action_type || m.reference?.action_type || "Stock Out").trim();
      const actLower = actTypeRaw.toLowerCase();

      let eventType: MovementEventRow["type"] = "Stock Out";
      let eventCat: "IN" | "OUT" = "OUT";

      if (actLower.includes("in")) {
        eventType = "Stock In";
        eventCat = "IN";
      } else if (actLower.includes("transfer")) {
        eventType = "Stock Transfer";
        eventCat = "OUT";
      } else {
        eventType = "Stock Out";
        eventCat = "OUT";
      }

      const refObj = m.reference || {};
      const millionRef = cleanRefNumber(refObj.document_ref || refObj.documentRef || refObj.doc_ref || refObj.document_no || refObj.doc_no);
      const refNo = cleanRefNumber(refObj.ref_no) || m.id || "-";
      const handledBy = m.create_by || "Warehouse";
      const destOrRemark = refObj.destination || refObj.remark || "-";

      const rawItems = Array.isArray(m.items) ? m.items : (typeof m.items === "string" ? JSON.parse(m.items || "[]") : []);
      if (Array.isArray(rawItems)) {
        rawItems.forEach((it: any) => {
          const skuRaw = String(it.sku || it.SKU || it.Code || "").trim();
          if (!skuRaw) return;
          const normSku = skuRaw.toLowerCase();
          const prodInfo = productMap[normSku];
          // Skip items that are not active
          if (!prodInfo) return;

          const qty = Number(it.qty || it.quantity || 0) || 0;
          if (qty <= 0) return;

          events.push({
            id: `sm-${m.id}-${skuRaw}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp,
            dateStr: formatDateTimeDisplay(timestamp),
            type: eventType,
            typeCategory: eventCat,
            millionRefNumber: millionRef,
            refNumber: refNo,
            sku: prodInfo.sku,
            productName: prodInfo.name,
            brandName: prodInfo.brandName,
            inQty: eventCat === "IN" ? qty : 0,
            outQty: eventCat === "OUT" ? qty : 0,
            handledBy,
            destinationOrRemark: destOrRemark
          });
        });
      }
    });

    // 2. Ingest track_orders records
    trackOrders.forEach((order) => {
      const orderType = String(order.type || "").trim().toLowerCase();
      const status = String(order.status || "").trim().toLowerCase();

      // Timestamp resolution
      let orderTs = Number(order.delivered_at) || 0;
      if (!orderTs) {
        orderTs = Number(order.timestamp) || 0;
      }

      if (orderTs < startEpoch || orderTs > endEpoch) return;

      const isReturn = orderType === "return" || orderType.includes("return");
      const hasCreditNote = Boolean(order.credit_note_number && String(order.credit_note_number).trim() !== "");

      // RULE: Return orders are Stock In ONLY if credit note is present.
      // Non-return orders are Stock Out (Delivery Order).
      let eventType: MovementEventRow["type"] = "DO Delivery";
      let eventCat: "IN" | "OUT" = "OUT";

      if (isReturn) {
        if (!hasCreditNote) {
          // Ignored: pending verification / no credit note
          return;
        }
        eventType = "Return (Credit Note)";
        eventCat = "IN";
      } else {
        eventType = "DO Delivery";
        eventCat = "OUT";
      }

      // Million Ref Number:
      // - For Delivery Orders: Display invoice_number if present, else do_number
      // - For Return Orders: Display credit_note_number
      const millionRef = isReturn 
        ? cleanRefNumber(order.credit_note_number)
        : (cleanRefNumber(order.invoice_number) || cleanRefNumber(order.do_number || order.id));

      const refNo = isReturn ? (cleanRefNumber(order.credit_note_number) || cleanRefNumber(order.ref_number) || "-") : (cleanRefNumber(order.ref_number) || "-");
      const handledBy = order.driver || "Driver Dispatch";
      const destOrRemark = order.deliver_to || order.poscode || "-";

      let rawItems: any[] = [];
      try {
        rawItems = Array.isArray(order.items) ? order.items : (typeof order.items === "string" ? JSON.parse(order.items || "[]") : []);
      } catch (_) {
        rawItems = [];
      }

      if (Array.isArray(rawItems)) {
        rawItems.forEach((it: any) => {
          const skuRaw = String(it.sku || it.SKU || it.Code || "").trim();
          if (!skuRaw) return;
          const normSku = skuRaw.toLowerCase();
          const prodInfo = productMap[normSku];
          // Skip items that are not active
          if (!prodInfo) return;

          const qty = Number(it.qty || it.quantity || 0) || 0;
          if (qty <= 0) return;

          events.push({
            id: `to-${order.id}-${skuRaw}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: orderTs,
            dateStr: formatDateTimeDisplay(orderTs),
            type: eventType,
            typeCategory: eventCat,
            millionRefNumber: millionRef,
            refNumber: refNo,
            sku: prodInfo.sku,
            productName: prodInfo.name,
            brandName: prodInfo.brandName,
            inQty: eventCat === "IN" ? qty : 0,
            outQty: eventCat === "OUT" ? qty : 0,
            handledBy,
            destinationOrRemark: destOrRemark
          });
        });
      }
    });

    // Sort newest to oldest by timestamp
    events.sort((a, b) => b.timestamp - a.timestamp);
    return events;
  }, [stockMovements, trackOrders, startEpoch, endEpoch, productMap]);

  // ==========================================================================
  // AGGREGATE SUMMARY BY SKU (TAB 1: BY TOTAL)
  // ==========================================================================
  const summaryRows = React.useMemo<SummaryRow[]>(() => {
    // Map of normalized SKU -> In/Out totals
    const totalsMap: Record<string, { totalIn: number; totalOut: number }> = {};

    allMovementEvents.forEach((ev) => {
      const norm = ev.sku.toLowerCase();
      if (!totalsMap[norm]) {
        totalsMap[norm] = { totalIn: 0, totalOut: 0 };
      }
      totalsMap[norm].totalIn += ev.inQty;
      totalsMap[norm].totalOut += ev.outQty;
    });

    // Generate summary rows ONLY for active catalog products
    const rows: SummaryRow[] = [];

    products.forEach((p) => {
      const status = String(p.status || p.Status || "Active").trim().toLowerCase();
      if (status !== "active") return;

      const sku = String(p.sku || p.SKU || p.Code || "").trim();
      if (!sku) return;
      const norm = sku.toLowerCase();
      const info = productMap[norm];
      if (!info) return;

      const movement = totalsMap[norm] || { totalIn: 0, totalOut: 0 };

      rows.push({
        sku,
        name: info.name || sku,
        brandName: info.brandName || "Other",
        brandRank: info.brandRank || 999,
        uom: info.uom || 1,
        totalIn: movement.totalIn,
        totalOut: movement.totalOut,
        netMovement: movement.totalIn - movement.totalOut
      });
    });

    return rows;
  }, [allMovementEvents, products, productMap]);

  // Filtered and Sorted Summary Rows
  const filteredSummaryRows = React.useMemo(() => {
    let result = summaryRows.filter((r) => {
      // Brand filter
      if (selectedBrand !== "all" && r.brandName.toLowerCase() !== selectedBrand.toLowerCase()) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSku = r.sku.toLowerCase().includes(q);
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesBrand = r.brandName.toLowerCase().includes(q);
        if (!matchesSku && !matchesName && !matchesBrand) return false;
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let comp = 0;
      if (sortField === "sku") comp = a.sku.localeCompare(b.sku, undefined, { numeric: true });
      else if (sortField === "name") comp = a.name.localeCompare(b.name);
      else if (sortField === "brand") comp = (a.brandRank - b.brandRank) || a.brandName.localeCompare(b.brandName);
      else if (sortField === "in") comp = a.totalIn - b.totalIn;
      else if (sortField === "out") comp = a.totalOut - b.totalOut;
      else if (sortField === "net") comp = a.netMovement - b.netMovement;

      return sortDirection === "asc" ? comp : -comp;
    });

    return result;
  }, [summaryRows, selectedBrand, searchQuery, sortField, sortDirection]);

  // Filtered Movement Events (Tab 2: By Movement List)
  const filteredMovementEvents = React.useMemo(() => {
    return allMovementEvents.filter((ev) => {
      // Brand filter
      if (selectedBrand !== "all" && ev.brandName.toLowerCase() !== selectedBrand.toLowerCase()) {
        return false;
      }
      // Movement Type filter
      if (movementTypeFilter !== "all") {
        if (movementTypeFilter === "IN" && ev.typeCategory !== "IN") return false;
        if (movementTypeFilter === "OUT" && ev.typeCategory !== "OUT") return false;
        if (movementTypeFilter === "stock_in" && ev.type !== "Stock In") return false;
        if (movementTypeFilter === "stock_out" && ev.type !== "Stock Out") return false;
        if (movementTypeFilter === "transfer" && ev.type !== "Stock Transfer") return false;
        if (movementTypeFilter === "do" && ev.type !== "DO Delivery") return false;
        if (movementTypeFilter === "return" && ev.type !== "Return (Credit Note)") return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSku = ev.sku.toLowerCase().includes(q);
        const matchesName = ev.productName.toLowerCase().includes(q);
        const matchesRefNum = ev.millionRefNumber.toLowerCase().includes(q);
        const matchesRef = ev.refNumber.toLowerCase().includes(q);
        const matchesDest = ev.destinationOrRemark.toLowerCase().includes(q);
        if (!matchesSku && !matchesName && !matchesRefNum && !matchesRef && !matchesDest) return false;
      }
      return true;
    });
  }, [allMovementEvents, selectedBrand, movementTypeFilter, searchQuery]);

  // Total KPIs
  const totalInSum = React.useMemo(() => filteredSummaryRows.reduce((acc, r) => acc + r.totalIn, 0), [filteredSummaryRows]);
  const totalOutSum = React.useMemo(() => filteredSummaryRows.reduce((acc, r) => acc + r.totalOut, 0), [filteredSummaryRows]);
  const netFlowSum = totalInSum - totalOutSum;

  // Helper to format carton / loose
  const formatCartonLoose = (qty: number, uom: number) => {
    if (!uom || uom <= 0) uom = 1;
    const absQty = Math.abs(qty);
    const cartons = Math.floor(absQty / uom);
    const loose = absQty % uom;
    const sign = qty < 0 ? "-" : "";

    if (cartons > 0 && loose > 0) return `${sign}${cartons}ctn ${loose}pcs`;
    if (cartons > 0) return `${sign}${cartons}ctn`;
    return `${sign}${loose}pcs`;
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary By Total
      const summaryExportData = filteredSummaryRows.map((r) => ({
        "SKU": r.sku,
        "Product Description": r.name,
        "Brand": r.brandName,
        "UOM (Carton)": r.uom,
        "Total IN (Qty)": r.totalIn,
        "Total IN (Carton)": formatCartonLoose(r.totalIn, r.uom),
        "Total OUT (Qty)": r.totalOut,
        "Total OUT (Carton)": formatCartonLoose(r.totalOut, r.uom),
        "Net Movement (Qty)": r.netMovement,
        "Net Movement (Carton)": formatCartonLoose(r.netMovement, r.uom)
      }));
      const wsSummary = XLSX.utils.json_to_sheet(summaryExportData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Summary By Total");

      // Sheet 2: Movement Detail List
      const movementExportData = filteredMovementEvents.map((ev) => ({
        "Date & Time": ev.dateStr,
        "Movement Type": ev.type,
        "Category": ev.typeCategory,
        "Million Ref. Number": ev.millionRefNumber,
        "Ref / Source": ev.refNumber,
        "SKU": ev.sku,
        "Product Description": ev.productName,
        "Brand": ev.brandName,
        "IN Qty": ev.inQty || "",
        "OUT Qty": ev.outQty || "",
        "Handled By": ev.handledBy,
        "Destination / Remark": ev.destinationOrRemark
      }));
      const wsMovements = XLSX.utils.json_to_sheet(movementExportData);
      XLSX.utils.book_append_sheet(wb, wsMovements, "Movement Transactions");

      const filename = `Stock_Card_${startDate || "All"}_to_${endDate || "All"}.xlsx`;
      XLSX.writeFile(wb, filename);
      showToast("Stock Card report downloaded successfully!", "success");
    } catch (err: any) {
      console.error("Export error:", err);
      showToast("Failed to export Excel: " + err.message, "error");
    }
  };

  const tabs = [
    {
      id: "summary",
      label: "Summary by SKU",
      desc: "Aggregated Stock In, Stock Out, and Net Balance per active product SKU."
    },
    {
      id: "movements",
      label: "Transaction History",
      desc: "Chronological ledger of Stock In, Stock Out, Transfers, Delivery Orders, and Credit Note Returns."
    }
  ];

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      
      {/* 1. TOPBAR NAVIGATION TABS */}
      <NavigationTabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(tabId: string) => setActiveTab(tabId as any)}
      />

      {/* 2. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            Stock Card Ledger
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Analyze stock in, stock out, transfers, DO deliveries, and returns by weekly or custom cycles.
          </p>
        </div>

        {/* Top Action / Export Buttons */}
        <div className="flex items-center gap-2">
          <CustomButton
            variant="secondary"
            onClick={handleExportExcel}
            className="h-8 px-3 text-xs rounded-lg border-slate-300 hover:bg-slate-50 text-zinc-800"
            title="Download formatted Excel report"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-[#0B57D0]" />
            Export Excel
          </CustomButton>
        </div>
      </div>

      {/* 3. DATE CYCLE & FILTER CONTROLS BAR */}
      <div className="bg-[#F8F9FA] border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Left: Cycle Selector & Custom Date Range */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="font-semibold text-zinc-700 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#0B57D0]" /> Cycle:
          </span>

          <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-50 gap-0.5">
            <button
              type="button"
              onClick={() => handleSelectPreset("current_week")}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                datePreset === "current_week"
                  ? "bg-white text-[#0B57D0] shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
              title="Sunday to Saturday Cycle"
            >
              Current Week
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("last_week")}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                datePreset === "last_week"
                  ? "bg-white text-[#0B57D0] shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Last Week
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("this_month")}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                datePreset === "this_month"
                  ? "bg-white text-[#0B57D0] shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              This Month
            </button>
          </div>

          <div className="flex items-center gap-1.5 ml-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset("custom");
              }}
              className="h-7 px-2 border border-zinc-300 rounded text-xs text-zinc-800 bg-white focus:outline-none focus:border-[#0B57D0]"
            />
            <span className="text-zinc-400 font-medium">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset("custom");
              }}
              className="h-7 px-2 border border-zinc-300 rounded text-xs text-zinc-800 bg-white focus:outline-none focus:border-[#0B57D0]"
            />
          </div>
        </div>

        {/* Right: Quick Search, Brand Filter, and Export */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* Brand Filter (Only active products' brands, deduplicated and sorted A-Z) */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="h-8 px-2.5 text-xs bg-white border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
          >
            <option value="all">All Brands</option>
            {activeBrandOptions.map((brandName) => (
              <option key={brandName} value={brandName}>
                {brandName}
              </option>
            ))}
          </select>

          {/* Movement Type Filter (Only in movements tab) */}
          {activeTab === "movements" && (
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
            >
              <option value="all">All Movements</option>
              
              <optgroup label="Stock IN">
                <option value="IN">🟢 All Stock IN</option>
                <option value="stock_in">Stock In</option>
                <option value="return">Credit Note Return</option>
              </optgroup>

              <optgroup label="Stock OUT">
                <option value="OUT">🔴 All Stock OUT</option>
                <option value="do">Delivery Order</option>
                <option value="stock_out">Stock Out</option>
                <option value="transfer">Stock Transfer</option>
              </optgroup>
            </select>
          )}

          {/* Search Box */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SKU, name, DO..."
              className="w-full h-8 pl-8 pr-6 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 3. KPI SUMMARY STATS CARDS */}
      <div className="px-4 py-3 bg-slate-50/60 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        
        {/* Total IN */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Total Stock In
            </span>
            <span className="text-lg font-bold text-emerald-700 mt-0.5 block tabular-nums">
              +{totalInSum.toLocaleString()} <span className="text-xs font-normal text-zinc-400">pcs</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>

        {/* Total OUT */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Total Stock Out
            </span>
            <span className="text-lg font-bold text-rose-700 mt-0.5 block tabular-nums">
              -{totalOutSum.toLocaleString()} <span className="text-xs font-normal text-zinc-400">pcs</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        {/* Net Flow */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
              Net Movement
            </span>
            <span className={`text-lg font-bold mt-0.5 block tabular-nums ${
              netFlowSum > 0 ? "text-emerald-700" : netFlowSum < 0 ? "text-rose-700" : "text-zinc-700"
            }`}>
              {netFlowSum > 0 ? `+${netFlowSum.toLocaleString()}` : netFlowSum.toLocaleString()} <span className="text-xs font-normal text-zinc-400">pcs</span>
            </span>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            netFlowSum > 0 ? "bg-emerald-50 text-emerald-600" : netFlowSum < 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-zinc-500"
          }`}>
            <Repeat className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* 4. MAIN DATA DISPLAY VIEW */}
      <div className="flex-1 bg-white overflow-hidden flex flex-col min-h-0">
        
        {/* TAB 1: SUMMARY LEDGER TABLE */}
        {activeTab === "summary" && (
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full border-collapse text-left whitespace-nowrap min-w-[900px]">
              <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th 
                    onClick={() => handleSort("brand")}
                    className="p-3 text-[11px] font-semibold text-zinc-600 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Brand <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("sku")}
                    className="p-3 text-[11px] font-semibold text-zinc-600 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      SKU <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("name")}
                    className="p-3 text-[11px] font-semibold text-zinc-600 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      Product Description <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                    </div>
                  </th>
                  <th className="p-3 text-[11px] font-semibold text-zinc-500 text-center">UOM</th>
                  <th 
                    onClick={() => handleSort("in")}
                    className="p-3 text-[11px] font-semibold text-emerald-700 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total IN <ArrowUpDown className="w-3 h-3 text-emerald-600" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("out")}
                    className="p-3 text-[11px] font-semibold text-rose-700 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Total OUT <ArrowUpDown className="w-3 h-3 text-rose-600" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort("net")}
                    className="p-3 text-[11px] font-semibold text-zinc-800 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      Net Movement <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#0B57D0]" />
                        <span className="font-medium text-xs text-zinc-600">Calculating stock movements...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSummaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Package className="w-7 h-7 text-zinc-300" />
                        <span className="font-medium text-sm text-zinc-600">No product stock movements found.</span>
                        <span className="text-xs text-zinc-400">Adjust your date cycle or search filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSummaryRows.map((row) => (
                    <tr key={row.sku} className="hover:bg-slate-50/70 transition-colors h-11">
                      <td className="p-3 text-zinc-600 font-medium">{row.brandName}</td>
                      <td className="p-3 font-mono font-semibold text-zinc-900">{row.sku}</td>
                      <td className="p-3 text-zinc-800 max-w-[280px] truncate" title={row.name}>{row.name}</td>
                      <td className="p-3 text-center text-zinc-500 font-mono">{row.uom}</td>
                      
                      {/* Total IN */}
                      <td className="p-3 text-right">
                        {row.totalIn > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-emerald-700 tabular-nums">+{row.totalIn.toLocaleString()}</span>
                            <span className="text-[10px] text-zinc-400">{formatCartonLoose(row.totalIn, row.uom)}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </td>

                      {/* Total OUT */}
                      <td className="p-3 text-right">
                        {row.totalOut > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-semibold text-rose-700 tabular-nums">-{row.totalOut.toLocaleString()}</span>
                            <span className="text-[10px] text-zinc-400">{formatCartonLoose(row.totalOut, row.uom)}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </td>

                      {/* Net Movement */}
                      <td className="p-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-bold tabular-nums ${
                            row.netMovement > 0 ? "text-emerald-700" : row.netMovement < 0 ? "text-rose-700" : "text-zinc-500"
                          }`}>
                            {row.netMovement > 0 ? `+${row.netMovement.toLocaleString()}` : row.netMovement.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {formatCartonLoose(row.netMovement, row.uom)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: DETAILED TRANSACTION MOVEMENT LIST */}
        {activeTab === "movements" && (
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1100px]">
              <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-[11px] font-semibold text-zinc-600">Date & Time</th>
                  <th className="p-3 text-[11px] font-semibold text-zinc-600">Movement Type</th>
                  <th className="p-3 text-[11px] font-semibold text-zinc-600">Million Ref. Number</th>
                  <th className="p-3 text-[11px] font-semibold text-zinc-600">Ref / Source</th>
                  <th className="p-3 text-[11px] font-semibold text-zinc-600">SKU</th>
                  <th className="p-3 text-[11px] font-semibold text-zinc-600">Product Description</th>
                  <th className="p-3 text-[11px] font-semibold text-emerald-700 text-right">IN (Qty)</th>
                  <th className="p-3 text-[11px] font-semibold text-rose-700 text-right">OUT (Qty)</th>
                  <th className="p-3 text-[11px] font-semibold text-zinc-600">Handled By / Destination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#0B57D0]" />
                        <span className="font-medium text-xs text-zinc-600">Loading transactions...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredMovementEvents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <FileText className="w-7 h-7 text-zinc-300" />
                        <span className="font-medium text-sm text-zinc-600">No transaction records found.</span>
                        <span className="text-xs text-zinc-400">Try adjusting your date cycle or type filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMovementEvents.map((ev) => {
                    return (
                      <tr key={ev.id} className="hover:bg-slate-50/70 transition-colors h-11">
                        <td className="p-3 text-zinc-600 font-mono text-[11px]">{ev.dateStr}</td>
                        <td className="p-3">
                          {ev.type === "Stock In" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <ArrowDownLeft className="w-3 h-3" /> Stock In
                            </span>
                          ) : ev.type === "Return (Credit Note)" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <RotateCcw className="w-3 h-3" /> CN Return
                            </span>
                          ) : ev.type === "Stock Transfer" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                              <Repeat className="w-3 h-3" /> Transfer
                            </span>
                          ) : ev.type === "DO Delivery" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                              <Truck className="w-3 h-3" /> DO Delivery
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                              <ArrowUpRight className="w-3 h-3" /> Stock Out
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {ev.millionRefNumber && ev.millionRefNumber !== "-" ? (
                            <span className="font-mono font-medium text-zinc-900">{ev.millionRefNumber}</span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              Pending record in Million
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-zinc-600">{ev.refNumber}</td>
                        <td className="p-3 font-mono font-semibold text-zinc-900">{ev.sku}</td>
                        <td className="p-3 text-zinc-800 max-w-[220px] truncate" title={ev.productName}>{ev.productName}</td>
                        
                        {/* IN Qty */}
                        <td className="p-3 text-right">
                          {ev.inQty > 0 ? (
                            <span className="font-semibold text-emerald-700 tabular-nums">+{ev.inQty}</span>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>

                        {/* OUT Qty */}
                        <td className="p-3 text-right">
                          {ev.outQty > 0 ? (
                            <span className="font-semibold text-rose-700 tabular-nums">-{ev.outQty}</span>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>

                        {/* Handled By / Destination */}
                        <td className="p-3 text-zinc-600 max-w-[220px] truncate" title={`${ev.handledBy} | ${ev.destinationOrRemark}`}>
                          <span className="font-medium text-zinc-900">{ev.handledBy}</span>
                          {ev.destinationOrRemark !== "-" && (
                            <span className="text-zinc-500 text-[11px] ml-1.5">({ev.destinationOrRemark})</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* 5. FOOTER STATUS BAR */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-zinc-500 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span>Cycle: <strong>{formatDateDisplay(startDate)}</strong> - <strong>{formatDateDisplay(endDate)}</strong></span>
          <span>•</span>
          <span>{activeTab === "summary" ? `${filteredSummaryRows.length} SKUs Listed` : `${filteredMovementEvents.length} Movement Records`}</span>
        </div>
        <div>
          <span>Stock Take Cutoff: Saturday 23:59 • Week Starts: Sunday 00:00</span>
        </div>
      </div>

    </div>
  );
}
