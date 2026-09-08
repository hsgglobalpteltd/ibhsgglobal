"use client";

import * as React from "react";
import { 
  ArrowUpDown, 
  Search, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Edit3, 
  Trash2, 
  FileText, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Repeat, 
  RefreshCw, 
  X, 
  Check, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  Image as ImageIcon,
  Camera,
  Eye,
  PackageSearch,
  Printer,
  ChevronDown,
  Package
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";

interface UserProfile {
  name?: string;
  role?: string;
  modules_access?: any;
}

interface ManageStockModuleProps {
  profile?: UserProfile | null;
}

interface ProductItem {
  sku: string;
  name: string;
  brandName: string;
  brandRank: number;
  uom: number;
}

interface BrandItem {
  id: string;
  display_name?: string;
  name?: string;
  rank?: number;
}

interface MovementItem {
  sku: string;
  qty: number;
}

interface StockMovementRecord {
  id: string;
  timestamp: number;
  create_by: string;
  action_type: string;
  items: MovementItem[];
  reference: {
    action_type?: string;
    action?: string;
    document_ref?: string;
    description?: string;
    approved_by?: string;
    photos?: string[];
    [key: string]: any;
  };
  status: boolean;
}

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

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

function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
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

function getSingaporeDateTimeDefaults(epoch?: number) {
  const targetDate = epoch ? new Date(epoch) : new Date();
  const sgDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(targetDate);

  const sgTimeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(targetDate);

  return { date: sgDateStr, time: sgTimeStr };
}

function formatCartonCalculation(totalQty: number, cartonSize: number): string {
  if (!cartonSize || cartonSize <= 1) {
    return `${totalQty} pcs`;
  }
  const cartons = Math.floor(totalQty / cartonSize);
  const loose = totalQty % cartonSize;
  if (cartons === 0) return `${loose} pcs`;
  if (loose === 0) return `${cartons} ctn`;
  return `${cartons} ctn + ${loose} pcs`;
}

// Searchable Product Dropdown Component
function ProductSearchSelect({
  value,
  onChange,
  productsList,
  productMap,
  placeholder = "Search SKU or Product Name..."
}: {
  value: string;
  onChange: (sku: string) => void;
  productsList: any[];
  productMap: Record<string, ProductItem>;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedProduct = productMap[value.toLowerCase()];

  // Filter products by SKU or Name or Brand
  const filteredProducts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeList = productsList.filter((p) => {
      const status = String(p.status || p.Status || "Active").trim().toLowerCase();
      return status === "active";
    });

    if (!q) return activeList.slice(0, 30);

    return activeList
      .filter((p) => {
        const sku = String(p.sku || p.SKU || p.Code || "").toLowerCase();
        const name = String(p.display_name || p.name || p.productName || "").toLowerCase();
        const info = productMap[sku];
        const brand = info ? info.brandName.toLowerCase() : "";
        return sku.includes(q) || name.includes(q) || brand.includes(q);
      })
      .slice(0, 40);
  }, [productsList, search, productMap]);

  return (
    <div className="relative flex-1" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setSearch("");
        }}
        className={`w-full h-8 px-2.5 bg-white border rounded text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
          isOpen ? "border-[#0B57D0] ring-1 ring-[#0B57D0]/20" : "border-zinc-300 hover:border-zinc-400"
        }`}
      >
        {selectedProduct ? (
          <div className="flex items-center gap-1.5 truncate pr-1">
            <span className="font-mono font-bold text-zinc-900 shrink-0">{selectedProduct.sku}</span>
            <span className="text-zinc-400">•</span>
            <span className="text-zinc-600 truncate">{selectedProduct.name}</span>
          </div>
        ) : value ? (
          <span className="font-mono text-zinc-800">{value}</span>
        ) : (
          <span className="text-zinc-400">{placeholder}</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full sm:min-w-[340px] max-w-[420px] bg-white rounded-lg border border-slate-200 shadow-xl z-50 overflow-hidden flex flex-col font-primary animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type SKU or product name to filter..."
              className="w-full bg-transparent text-xs text-zinc-800 focus:outline-none placeholder:text-zinc-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-zinc-400 hover:text-zinc-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-zinc-400">
                No matching active products found.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const sku = String(p.sku || p.SKU || p.Code || "").trim();
                const info = productMap[sku.toLowerCase()];
                const isSelected = value.toLowerCase() === sku.toLowerCase();

                return (
                  <button
                    key={sku}
                    type="button"
                    onClick={() => {
                      onChange(sku);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex flex-col hover:bg-[#D3E3FD]/40 transition-colors cursor-pointer ${
                      isSelected ? "bg-[#D3E3FD]/60 font-semibold" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-zinc-900">{sku}</span>
                      {info?.brandName && (
                        <span className="text-[10px] font-semibold text-zinc-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {info.brandName}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-600 truncate mt-0.5">
                      {info?.name || p.display_name || p.name || sku}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ManageStockModule({ profile }: ManageStockModuleProps) {
  // Raw state
  const [movements, setMovements] = React.useState<StockMovementRecord[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<BrandItem[]>([]);
  const [usersList, setUsersList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);

  // Filters
  const [datePreset, setDatePreset] = React.useState<"current_week" | "last_week" | "this_month" | "all" | "custom">("current_week");
  const [startDate, setStartDate] = React.useState<string>(() => getCurrentWeekRange().start);
  const [endDate, setEndDate] = React.useState<string>(() => getCurrentWeekRange().end);
  const [statusFilter, setStatusFilter] = React.useState<"all" | "pending" | "recorded">("all");
  const [actionFilter, setActionFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Multi-selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Photo Lightbox state
  const [viewingPhotos, setViewingPhotos] = React.useState<{ title: string; photos: string[] } | null>(null);

  // SKU Items List Popup state
  const [viewingItems, setViewingItems] = React.useState<{
    id: string;
    action_type: string;
    doc_ref: string;
    items: MovementItem[];
  } | null>(null);

  // Modal States
  const [showBatchModal, setShowBatchModal] = React.useState<boolean>(false);
  const [batchDocRef, setBatchDocRef] = React.useState<string>("");
  const [batchDate, setBatchDate] = React.useState<string>("");
  const [batchTime, setBatchTime] = React.useState<string>("");
  const [batchStatus, setBatchStatus] = React.useState<boolean>(true);
  const [batchApprovedBy, setBatchApprovedBy] = React.useState<string>("");
  const [isSubmittingBatch, setIsSubmittingBatch] = React.useState<boolean>(false);

  // Single Edit Modal State
  const [editingRecord, setEditingRecord] = React.useState<StockMovementRecord | null>(null);
  const [editActionType, setEditActionType] = React.useState<string>("Stock Out");
  const [editDate, setEditDate] = React.useState<string>("");
  const [editTime, setEditTime] = React.useState<string>("");
  const [editDocRef, setEditDocRef] = React.useState<string>("");
  const [editDescription, setEditDescription] = React.useState<string>("");
  const [editApprovedBy, setEditApprovedBy] = React.useState<string>("");
  const [editStatus, setEditStatus] = React.useState<boolean>(false);
  const [editItems, setEditItems] = React.useState<Array<{ sku: string; qty: number | string }>>([]);
  const [isSavingEdit, setIsSavingEdit] = React.useState<boolean>(false);

  // Create New Record Modal State
  const [showCreateModal, setShowCreateModal] = React.useState<boolean>(false);
  const [newActionType, setNewActionType] = React.useState<string>("Stock Out");
  const [newDate, setNewDate] = React.useState<string>("");
  const [newTime, setNewTime] = React.useState<string>("");
  const [newHasDoc, setNewHasDoc] = React.useState<boolean>(false);
  const [newDocRef, setNewDocRef] = React.useState<string>("");
  const [newDescription, setNewDescription] = React.useState<string>("");
  const [newApprovedBy, setNewApprovedBy] = React.useState<string>("");
  const [newStatus, setNewStatus] = React.useState<boolean>(false);
  const [newItems, setNewItems] = React.useState<Array<{ sku: string; qty: number | string }>>([{ sku: "", qty: "" }]);
  const [isSavingNew, setIsSavingNew] = React.useState<boolean>(false);

  // Load Data
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [smRes, prodRes, brandRes, userRes] = await Promise.all([
        fetch(`${WORKER_URL}/api/stock-movement`, { cache: "no-store" }).catch(() => null),
        fetch(`${WORKER_URL}/api/inventory/products`, { cache: "no-store" }).catch(() => null),
        fetch(`${WORKER_URL}/api/inventory/brands`, { cache: "no-store" }).catch(() => null),
        fetch(`${WORKER_URL}/api/inventory/users`, { cache: "no-store" }).catch(() => null)
      ]);

      if (smRes && smRes.ok) {
        const smData = await smRes.json();
        const rawList = Array.isArray(smData) ? smData : [];
        const formatted: StockMovementRecord[] = rawList.map((r: any) => {
          const ref = typeof r.reference === "string" ? JSON.parse(r.reference || "{}") : (r.reference || {});
          const rawItems = Array.isArray(r.items) ? r.items : (typeof r.items === "string" ? JSON.parse(r.items || "[]") : []);
          const isConfirmed = r.status === true || r.status === 1 || String(r.status).toLowerCase() === "true";
          return {
            id: String(r.id || ""),
            timestamp: Number(r.timestamp) || 0,
            create_by: String(r.create_by || "Staff"),
            action_type: String(r.action_type || ref.action_type || ref.action || "Stock Out"),
            items: rawItems.map((it: any) => ({
              sku: String(it.sku || it.SKU || it.Code || "").trim(),
              qty: Number(it.qty || it.quantity || 0)
            })).filter((it: any) => it.sku),
            reference: ref,
            status: isConfirmed
          };
        });
        setMovements(formatted);
      }

      if (prodRes && prodRes.ok) {
        const pData = await prodRes.json();
        setProducts(Array.isArray(pData) ? pData : []);
      }

      if (brandRes && brandRes.ok) {
        const bData = await brandRes.json();
        setBrands(Array.isArray(bData) ? bData : []);
      }

      if (userRes && userRes.ok) {
        const uData = await userRes.json();
        setUsersList(Array.isArray(uData) ? uData : []);
      }
    } catch (err: any) {
      console.error("Failed to load manage stock data:", err);
      showToast("Failed to fetch stock movements: " + err.message, "error");
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
      showToast("Stock movements refreshed!", "success");
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [loadData]);

  // Product Map
  const productMap = React.useMemo(() => {
    const map: Record<string, ProductItem> = {};
    products.forEach((p) => {
      const sku = String(p.sku || p.SKU || p.Code || "").trim();
      if (!sku) return;
      const normSku = sku.toLowerCase();
      const rawBrandId = String(p.brands_id || p.brandId || "").trim();
      const bObj = brands.find((b) => String(b.id || "").toLowerCase() === rawBrandId.toLowerCase());
      const brandName = bObj ? (bObj.display_name || bObj.name || rawBrandId) : (rawBrandId || "Unbranded");
      const name = p.display_name || p.name || p.productName || sku;
      const uom = Number(p.carton || p.uom) || 1;

      map[normSku] = {
        sku,
        name,
        brandName,
        brandRank: Number(bObj?.rank || 999),
        uom
      };
    });
    return map;
  }, [products, brands]);

  // Date range calculation
  const { startEpoch, endEpoch } = React.useMemo(() => {
    if (datePreset === "all") {
      return { startEpoch: 0, endEpoch: Infinity };
    }
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
  }, [datePreset, startDate, endDate]);

  const handleSelectPreset = (preset: "current_week" | "last_week" | "this_month" | "all") => {
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
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Filtered Movements
  const filteredMovements = React.useMemo(() => {
    return movements.filter((m) => {
      // Date filter
      if (datePreset !== "all") {
        if (m.timestamp < startEpoch || m.timestamp > endEpoch) return false;
      }

      // Status filter
      if (statusFilter === "recorded" && !m.status) return false;
      if (statusFilter === "pending" && m.status) return false;

      // Action type filter
      if (actionFilter !== "all") {
        const actLower = m.action_type.toLowerCase();
        if (actionFilter === "in" && !actLower.includes("in")) return false;
        if (actionFilter === "out" && (!actLower.includes("out") || actLower.includes("transfer"))) return false;
        if (actionFilter === "transfer" && !actLower.includes("transfer")) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = m.id.toLowerCase().includes(q);
        const refMatch = String(m.reference?.document_ref || "").toLowerCase().includes(q);
        const descMatch = String(m.reference?.description || "").toLowerCase().includes(q);
        const creatorMatch = m.create_by.toLowerCase().includes(q);
        const itemMatch = m.items.some((it) => {
          const pInfo = productMap[it.sku.toLowerCase()];
          return it.sku.toLowerCase().includes(q) || (pInfo && pInfo.name.toLowerCase().includes(q));
        });

        if (!idMatch && !refMatch && !descMatch && !creatorMatch && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [movements, datePreset, startEpoch, endEpoch, statusFilter, actionFilter, searchQuery, productMap]);

  // Toggle selection
  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredMovements.length && filteredMovements.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMovements.map((m) => m.id)));
    }
  };

  // Open Batch Combine Modal
  const handleOpenBatchModal = () => {
    if (selectedIds.size < 2) {
      showToast("Please select at least 2 transactions to combine/update", "warning");
      return;
    }
    const { date, time } = getSingaporeDateTimeDefaults();
    setBatchDate(date);
    setBatchTime(time);
    setBatchDocRef("");
    setBatchStatus(true);
    setBatchApprovedBy(profile?.name || "Admin");
    setShowBatchModal(true);
  };

  // Submit Batch Update
  const handleSubmitBatchUpdate = async () => {
    if (!batchDocRef.trim()) {
      showToast("Please enter a Million Document Reference Number", "error");
      return;
    }

    setIsSubmittingBatch(true);
    try {
      let manualTimestamp: number | undefined = undefined;
      if (batchDate) {
        const fullTime = batchTime ? `${batchTime}:00` : "00:00:00";
        const iso = `${batchDate}T${fullTime}+08:00`;
        const parsed = new Date(iso).getTime();
        if (!isNaN(parsed) && parsed > 0) {
          manualTimestamp = parsed;
        }
      }

      const res = await fetch(`${WORKER_URL}/api/stock-movement/batch-update-stock-movement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          document_ref: batchDocRef.trim(),
          timestamp: manualTimestamp,
          status: batchStatus,
          approved_by: batchApprovedBy.trim()
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Server failed to batch update");
      }

      showToast(`Successfully combined & updated ${selectedIds.size} transactions!`, "success");
      setShowBatchModal(false);
      setSelectedIds(new Set());
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast("Batch update failed: " + err.message, "error");
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // Open Single Edit Modal
  const handleOpenEditModal = (rec: StockMovementRecord) => {
    setEditingRecord(rec);
    const { date, time } = getSingaporeDateTimeDefaults(rec.timestamp);
    setEditDate(date);
    setEditTime(time);
    setEditActionType(rec.action_type || "Stock Out");
    setEditDocRef(cleanRefNumber(rec.reference?.document_ref || ""));
    setEditDescription(rec.reference?.description || "");
    setEditApprovedBy(rec.reference?.approved_by || "");
    setEditStatus(rec.status);
    setEditItems(rec.items.length > 0 ? rec.items.map((i) => ({ sku: i.sku, qty: i.qty })) : [{ sku: "", qty: "" }]);
    setShowCreateModal(false);
  };

  // Save Single Edit
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setIsSavingEdit(true);
    try {
      let manualTimestamp = editingRecord.timestamp;
      if (editDate) {
        const fullTime = editTime ? `${editTime}:00` : "00:00:00";
        const iso = `${editDate}T${fullTime}+08:00`;
        const parsed = new Date(iso).getTime();
        if (!isNaN(parsed) && parsed > 0) {
          manualTimestamp = parsed;
        }
      }

      const validItems = editItems
        .map((i) => ({ sku: String(i.sku).trim(), qty: Number(i.qty) || 0 }))
        .filter((i) => i.sku && i.qty > 0);

      const res = await fetch(`${WORKER_URL}/api/stock-movement/update-stock-movement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRecord.id,
          timestamp: manualTimestamp,
          action_type: editActionType,
          items: validItems,
          document_ref: editDocRef.trim() ? editDocRef.trim() : "None",
          description: editDescription.trim(),
          approved_by: editApprovedBy.trim(),
          status: editStatus
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to update record");
      }

      showToast("Movement record updated successfully!", "success");
      setEditingRecord(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast("Update failed: " + err.message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Create New Modal
  const handleOpenCreateModal = () => {
    const { date, time } = getSingaporeDateTimeDefaults();
    setNewDate(date);
    setNewTime(time);
    setNewActionType("Stock Out");
    setNewHasDoc(false);
    setNewDocRef("");
    setNewDescription("");
    setNewApprovedBy(profile?.name || "Admin");
    setNewStatus(false);
    setNewItems([{ sku: "", qty: "" }]);
    setShowCreateModal(true);
    setEditingRecord(null);
  };

  // Submit Create New Record
  const handleSaveNewMovement = async () => {
    const validItems = newItems
      .map((i) => ({ sku: String(i.sku).trim(), qty: Number(i.qty) || 0 }))
      .filter((i) => i.sku && i.qty > 0);

    if (validItems.length === 0) {
      showToast("Please add at least 1 valid product with quantity > 0", "error");
      return;
    }

    setIsSavingNew(true);
    try {
      let manualTimestamp = Date.now();
      if (newDate) {
        const fullTime = newTime ? `${newTime}:00` : "00:00:00";
        const iso = `${newDate}T${fullTime}+08:00`;
        const parsed = new Date(iso).getTime();
        if (!isNaN(parsed) && parsed > 0) {
          manualTimestamp = parsed;
        }
      }

      const res = await fetch(`${WORKER_URL}/api/stock-movement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: newActionType,
          items: validItems,
          has_document: newHasDoc || Boolean(newDocRef.trim()),
          ref_number: newDocRef.trim(),
          description: newDescription.trim(),
          approved_by: newApprovedBy.trim(),
          created_by: profile?.name || "Admin",
          created_at: manualTimestamp,
          status: newStatus
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to create movement record");
      }

      showToast("New stock movement record created!", "success");
      setShowCreateModal(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast("Creation failed: " + err.message, "error");
    } finally {
      setIsSavingNew(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete movement record ${id}?`)) {
      return;
    }

    try {
      const res = await fetch(`${WORKER_URL}/api/stock-movement/delete-stock-movement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      showToast(`Record ${id} deleted`, "success");
      await loadData();
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
    }
  };

  // 1. Generate & Open PDF Blob for INDIVIDUAL Stock Movement Record (Exact format as Sales Report Activation)
  const handlePrintSingleRecord = async (m: StockMovementRecord) => {
    try {
      showToast(`Generating PDF for ${m.reference?.document_ref || m.id}...`, "info");
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      // 1. Header (Minimal High-Contrast Corporate Design)
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("HSG GLOBAL PTE LTD", margin, 17);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text("STOCK MOVEMENT VOUCHER", margin, 23);

      // Top Right Reference & Date
      const docRefNum = cleanRefNumber(m.reference?.document_ref) || m.id;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`REF: ${docRefNum}`, pageWidth - margin, 17, { align: "right" });

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const printDateStr = new Date().toLocaleDateString("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      doc.text(`Date: ${printDateStr}`, pageWidth - margin, 23, { align: "right" });

      // Clean Solid Divider
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, 27, pageWidth - margin, 27);

      // 2. Transaction Summary Header
      let curY = 34;
      autoTable(doc, {
        startY: curY,
        theme: "plain",
        styles: {
          cellPadding: { top: 1.2, bottom: 1.2, left: 0, right: 0 },
          fontSize: 9,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: "bold" },
          1: { cellWidth: 68 },
          2: { cellWidth: 28, fontStyle: "bold" },
          3: { cellWidth: 58 }
        },
        body: [
          [
            "Transaction ID:",
            m.id,
            "Movement Date:",
            formatDateTimeDisplay(m.timestamp)
          ],
          [
            "Action Type:",
            m.action_type || "Stock Out",
            "Million Ref #:",
            cleanRefNumber(m.reference?.document_ref) || "Pending"
          ],
          [
            "Created By:",
            m.create_by || "Operator",
            "Approved By:",
            m.reference?.approved_by || "Admin"
          ],
          [
            "Status:",
            m.status ? "Recorded in Million" : "Pending Record",
            "Remarks:",
            m.reference?.description || "-"
          ]
        ],
        margin: { left: margin, right: margin }
      });

      curY = (doc as any).lastAutoTable?.finalY + 8 || curY + 30;

      // 3. Movement Items Table
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("ITEMS SUMMARY", margin, curY);

      let totalPieces = 0;
      const itemRows = m.items.map((it, idx) => {
        const pInfo = productMap[it.sku.toLowerCase()];
        const cSize = pInfo?.uom || 0;
        const cCalc = formatCartonCalculation(it.qty, cSize);
        totalPieces += Number(it.qty) || 0;

        return [
          String(idx + 1),
          it.sku,
          pInfo?.name || "-",
          cCalc,
          Number(it.qty).toLocaleString()
        ];
      });

      if (itemRows.length > 0) {
        itemRows.push([
          { content: "TOTAL", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } } as any,
          { content: `${totalPieces.toLocaleString()} pcs`, styles: { halign: "right", fontStyle: "bold" } } as any
        ]);
      }

      autoTable(doc, {
        startY: curY + 3,
        head: [["#", "SKU", "Description", "Carton Breakdown", "Quantity (Pcs)"]],
        body: itemRows.length > 0 ? itemRows : [["-", "-", "No items recorded", "-", "-"]],
        theme: "plain",
        pageBreak: "auto",
        showHead: "everyPage",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "left",
          valign: "middle",
          cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          lineWidth: 0.3,
          lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "left", cellWidth: 32, fontStyle: "bold" },
          2: { halign: "left", cellWidth: 80 },
          3: { halign: "left", cellWidth: 36 },
          4: { halign: "right", cellWidth: 24, fontStyle: "bold" }
        },
        styles: {
          fontSize: 8.5,
          cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          textColor: [0, 0, 0],
          lineWidth: 0.2,
          lineColor: [0, 0, 0]
        },
        margin: { left: margin, right: margin }
      });

      const lastY = (doc as any).lastAutoTable?.finalY || curY + 40;

      // 4. Page Numbers
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(
          `Page ${i} of ${totalPages} — Stock Movement Voucher: ${docRefNum}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: "center" }
        );
      }

      // Open Blob PDF URL
      const pdfBlob = doc.output("blob");
      const pdfBlobUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfBlobUrl, "_blank");
    } catch (err: any) {
      console.error("Single Movement PDF error:", err);
      showToast("Failed to generate PDF: " + err.message, "error");
    }
  };

  // 2. Generate & Open PDF Blob for SUMMARY ONLY Report
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState<boolean>(false);

  const handlePrintSummaryReport = async () => {
    const listToPrint = selectedIds.size > 0 
      ? filteredMovements.filter(m => selectedIds.has(m.id))
      : filteredMovements;

    if (listToPrint.length === 0) {
      showToast("No stock movements to print", "warning");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      showToast("Generating Stock Movements Summary PDF...", "info");
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 14;

      // 1. Header (Minimal High-Contrast Design matching Sales Report)
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("HSG GLOBAL PTE LTD", margin, 17);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text("STOCK MOVEMENTS SUMMARY REPORT", margin, 23);

      // Top Right Reference & Date
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(
        selectedIds.size > 0 ? `BATCH (${selectedIds.size} SELECTED)` : `ALL FILTERED (${listToPrint.length} RECORDS)`,
        pageWidth - margin,
        17,
        { align: "right" }
      );

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const printDateStr = new Date().toLocaleDateString("en-SG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      doc.text(`Generated: ${printDateStr}`, pageWidth - margin, 23, { align: "right" });

      // Clean Solid Divider
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, 27, pageWidth - margin, 27);

      // 2. Scope & Period Summary
      let curY = 34;
      const dateRangeLabel = datePreset === "all" ? "All Time" : `${startDate} to ${endDate}`;
      const actionFilterLabel = actionFilter === "all" ? "All Actions" : actionFilter.toUpperCase();
      const statusFilterLabel = statusFilter === "all" ? "All Statuses" : statusFilter === "recorded" ? "Recorded in Million" : "Pending Record";

      autoTable(doc, {
        startY: curY,
        theme: "plain",
        styles: {
          cellPadding: { top: 1, bottom: 1, left: 0, right: 0 },
          fontSize: 8.5,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 28, fontStyle: "bold" },
          1: { cellWidth: 68 },
          2: { cellWidth: 28, fontStyle: "bold" },
          3: { cellWidth: 58 }
        },
        body: [
          [
            "Date Range:",
            dateRangeLabel,
            "Action Filter:",
            actionFilterLabel
          ],
          [
            "Status Filter:",
            statusFilterLabel,
            "Total Records:",
            `${listToPrint.length} movements`
          ],
          [
            "Printed By:",
            profile?.name || "Admin",
            "Scope:",
            selectedIds.size > 0 ? `Custom Selection (${selectedIds.size} items)` : "Current Filter Results"
          ]
        ],
        margin: { left: margin, right: margin }
      });

      curY = (doc as any).lastAutoTable?.finalY + 6 || curY + 20;

      // 3. Aggregate SKU Summary Only
      const skuSummaryMap: { [sku: string]: { sku: string; name: string; inQty: number; outQty: number; netQty: number } } = {};
      let grandTotalIn = 0;
      let grandTotalOut = 0;

      listToPrint.forEach(m => {
        const isStockIn = m.action_type.toLowerCase().includes("in");
        m.items.forEach(it => {
          const skuUpper = (it.sku || "").toUpperCase().trim();
          if (!skuUpper) return;
          const pInfo = productMap[it.sku.toLowerCase()];
          if (!skuSummaryMap[skuUpper]) {
            skuSummaryMap[skuUpper] = {
              sku: skuUpper,
              name: pInfo?.name || "-",
              inQty: 0,
              outQty: 0,
              netQty: 0
            };
          }
          const q = Number(it.qty) || 0;
          if (isStockIn) {
            skuSummaryMap[skuUpper].inQty += q;
            grandTotalIn += q;
          } else {
            skuSummaryMap[skuUpper].outQty += q;
            grandTotalOut += q;
          }
          skuSummaryMap[skuUpper].netQty = skuSummaryMap[skuUpper].inQty - skuSummaryMap[skuUpper].outQty;
        });
      });

      const skuSummaryRows = Object.values(skuSummaryMap)
        .sort((a, b) => a.sku.localeCompare(b.sku))
        .map((it, idx) => [
          String(idx + 1),
          it.sku,
          it.name,
          it.inQty > 0 ? `+${it.inQty.toLocaleString()}` : "0",
          it.outQty > 0 ? `-${it.outQty.toLocaleString()}` : "0",
          `${it.netQty >= 0 ? "+" : ""}${it.netQty.toLocaleString()}`
        ]);

      if (skuSummaryRows.length > 0) {
        skuSummaryRows.push([
          { content: "TOTAL", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } } as any,
          { content: `+${grandTotalIn.toLocaleString()}`, styles: { halign: "right", fontStyle: "bold" } } as any,
          { content: `-${grandTotalOut.toLocaleString()}`, styles: { halign: "right", fontStyle: "bold" } } as any,
          { content: `${(grandTotalIn - grandTotalOut) >= 0 ? "+" : ""}${(grandTotalIn - grandTotalOut).toLocaleString()}`, styles: { halign: "right", fontStyle: "bold" } } as any
        ]);
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("SKU SUMMARY", margin, curY);

      autoTable(doc, {
        startY: curY + 2.5,
        head: [["#", "SKU", "Description", "Total In", "Total Out", "Net Qty"]],
        body: skuSummaryRows.length > 0 ? skuSummaryRows : [["-", "-", "No SKU items found", "-", "-", "-"]],
        theme: "plain",
        pageBreak: "auto",
        showHead: "everyPage",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "left",
          valign: "middle",
          cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          lineWidth: 0.3,
          lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "left", cellWidth: 32, fontStyle: "bold" },
          2: { halign: "left", cellWidth: 76 },
          3: { halign: "right", cellWidth: 22 },
          4: { halign: "right", cellWidth: 22 },
          5: { halign: "right", cellWidth: 20, fontStyle: "bold" }
        },
        styles: {
          fontSize: 8.5,
          cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          textColor: [0, 0, 0],
          lineWidth: 0.2,
          lineColor: [0, 0, 0]
        },
        margin: { left: margin, right: margin }
      });

      // 4. Page Numbers
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(
          `Page ${i} of ${totalPages} — Stock Movements Summary Report`,
          pageWidth / 2,
          pageHeight - 6,
          { align: "center" }
        );
      }

      // Open PDF in new tab as Blob URL
      const pdfBlob = doc.output("blob");
      const pdfBlobUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfBlobUrl, "_blank");
    } catch (err: any) {
      console.error("PDF generation error:", err);
      showToast("Failed to generate Stock Movement PDF: " + err.message, "error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs">
      
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            Manage Stock Movements
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Audit, verify, and combine stock movements with Million Accounting Reference numbers.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Print Summary PDF Report Button (Opens as Blob PDF with SKU aggregate totals only) */}
          <CustomButton
            variant="secondary"
            onClick={handlePrintSummaryReport}
            disabled={isGeneratingPdf}
            className="h-8 px-3 text-xs rounded-lg border-slate-300 hover:bg-slate-50 text-zinc-800"
            title="Generate & open SKU Summary PDF report for current filter / selected rows"
          >
            <FileText className="w-3.5 h-3.5 mr-1 text-[#0B57D0]" />
            {isGeneratingPdf ? "Printing..." : selectedIds.size > 0 ? `Print Summary (${selectedIds.size})` : "Print Summary"}
          </CustomButton>

          {/* Combine & Update Button (Appears when 2 or more records are selected) */}
          {selectedIds.size >= 2 && (
            <CustomButton
              variant="dark"
              onClick={handleOpenBatchModal}
              className="h-8 px-3 text-xs rounded-lg bg-[#0B57D0] hover:bg-[#0842A0]"
              title="Combine and assign Million Ref to selected transactions"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Combine & Update ({selectedIds.size})
            </CustomButton>
          )}

          {/* Create New Movement Button */}
          <CustomButton
            variant="secondary"
            onClick={handleOpenCreateModal}
            className="h-8 px-3 text-xs rounded-lg border-slate-300 hover:bg-slate-50 text-zinc-800"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-[#0B57D0]" />
            New Movement
          </CustomButton>
        </div>
      </div>

      {/* 2. FILTER & CYCLE TOOLBAR */}
      <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Left: Date Presets */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center bg-white border border-zinc-300/80 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => handleSelectPreset("current_week")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                datePreset === "current_week" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Current Week
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("last_week")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                datePreset === "last_week" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Last Week
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("this_month")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                datePreset === "this_month" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                datePreset === "all" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              All Time
            </button>
          </div>

          {datePreset !== "all" && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="h-7 px-2 border border-zinc-300 rounded text-xs text-zinc-800 bg-white focus:outline-none focus:border-[#0B57D0]"
              />
              <span className="text-zinc-400">to</span>
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
          )}
        </div>

        {/* Right: Status, Action Type & Search */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-8 px-2.5 text-xs bg-white border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
          >
            <option value="all">All Verification Status</option>
            <option value="pending">Pending Record in Million</option>
            <option value="recorded">Recorded in Million</option>
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-8 px-2.5 text-xs bg-white border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
          >
            <option value="all">All Actions</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
            <option value="transfer">Stock Transfer</option>
          </select>

          {/* Search Box */}
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, SKU, Million Ref..."
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

      {/* 3. DATA TABLE */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1000px]">
          <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="p-3 w-10 text-center">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-zinc-600 hover:text-zinc-900 cursor-pointer"
                  title="Select All"
                >
                  {selectedIds.size > 0 && selectedIds.size === filteredMovements.length ? (
                    <CheckSquare className="w-4 h-4 text-[#0B57D0]" />
                  ) : (
                    <Square className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              </th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Verification Status</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Date & Time</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Million Ref. Number</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Action Type</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600 text-center w-16">SKU List</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Total Qty</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Created / Approved By</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Description / Remarks</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#0B57D0]" />
                    <span className="font-medium text-xs text-zinc-600">Loading stock movements...</span>
                  </div>
                </td>
              </tr>
            ) : filteredMovements.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-12 text-center text-zinc-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <FileText className="w-7 h-7 text-zinc-300" />
                    <span className="font-medium text-sm text-zinc-600">No stock movements found.</span>
                    <span className="text-xs text-zinc-400">Try adjusting your date range or filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredMovements.map((m) => {
                const isSelected = selectedIds.has(m.id);
                const millionRef = cleanRefNumber(m.reference?.document_ref);
                const totalQty = m.items.reduce((acc, i) => acc + (i.qty || 0), 0);
                const actLower = m.action_type.toLowerCase();

                return (
                  <tr 
                    key={m.id} 
                    className={`hover:bg-slate-50/70 transition-colors h-11 ${isSelected ? "bg-blue-50/40" : ""}`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectRow(m.id)}
                        className="cursor-pointer text-zinc-500 hover:text-zinc-900"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#0B57D0]" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-300" />
                        )}
                      </button>
                    </td>

                    {/* Status Toggle / Badge */}
                    <td className="p-3">
                      {m.status ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-zinc-800 border border-slate-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#0B57D0]" /> Recorded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-50 text-zinc-500 border border-zinc-200">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" /> Pending Record
                        </span>
                      )}
                    </td>

                    {/* Date & Time */}
                    <td className="p-3 text-zinc-600 font-mono text-[11px]">
                      {formatDateTimeDisplay(m.timestamp)}
                    </td>

                    {/* Million Ref Number */}
                    <td className="p-3">
                      {millionRef ? (
                        <span className="font-mono font-medium text-zinc-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          {millionRef}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs">
                          -
                        </span>
                      )}
                    </td>

                    {/* Action Type */}
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-zinc-800 border border-slate-200">
                        {actLower.includes("in") ? (
                          <ArrowDownLeft className="w-3 h-3 text-[#0B57D0]" />
                        ) : actLower.includes("transfer") ? (
                          <Repeat className="w-3 h-3 text-[#0B57D0]" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 text-zinc-500" />
                        )}
                        <span>{m.action_type || "Stock Movement"}</span>
                      </span>
                    </td>

                    {/* Items SKU Icon Button */}
                    <td className="p-3 text-center">
                      {m.items.length === 0 ? (
                        <span className="text-zinc-300">-</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setViewingItems({
                            id: m.id,
                            action_type: m.action_type,
                            doc_ref: m.reference?.document_ref || "None",
                            items: m.items
                          })}
                          className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded-md bg-slate-50 hover:bg-[#D3E3FD]/50 text-zinc-700 hover:text-[#0B57D0] border border-slate-200 hover:border-[#0B57D0]/30 transition-colors cursor-pointer"
                          title={`View ${m.items.length} SKU item(s)`}
                        >
                          <PackageSearch className="w-3.5 h-3.5 text-[#0B57D0]" />
                          <span className="text-[11px] font-bold font-mono">{m.items.length}</span>
                        </button>
                      )}
                    </td>

                    {/* Total Qty */}
                    <td className="p-3 font-semibold text-zinc-800 tabular-nums">
                      {totalQty.toLocaleString()} <span className="text-[10px] text-zinc-400 font-normal">pcs</span>
                    </td>

                    {/* Created / Approved By */}
                    <td className="p-3 text-zinc-700 text-xs">
                      <div>
                        <span className="font-medium text-zinc-900">{m.create_by}</span>
                        {m.reference?.approved_by && (
                          <div className="text-[10px] text-zinc-500 font-medium">
                            Appr: {m.reference.approved_by}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Remarks / Destination & Photo Badges */}
                    <td className="p-3 max-w-[240px] text-zinc-600">
                      <div className="flex items-center gap-2">
                        {/* Attached Photos Indicator */}
                        {Array.isArray(m.reference?.photos) && m.reference.photos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setViewingPhotos({
                              title: `${m.action_type} (${m.reference?.document_ref || m.id})`,
                              photos: m.reference.photos || []
                            })}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-zinc-700 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
                            title="View attached photos"
                          >
                            <Camera className="w-3 h-3 text-zinc-500" />
                            <span>{m.reference.photos.length}</span>
                          </button>
                        )}
                        <span className="truncate" title={m.reference?.description || "-"}>
                          {m.reference?.description || "-"}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handlePrintSingleRecord(m)}
                          className="p-1 rounded text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Print Stock Movement Voucher (PDF Blob)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(m)}
                          className="p-1 rounded text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Transaction"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(m.id)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* ========================================================================= */}
      {/* BATCH COMBINE & UPDATE MODAL */}
      {/* ========================================================================= */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0B57D0]" />
                  Combine & Update Selected Transactions
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Updating {selectedIds.size} stock movement records simultaneously.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto text-xs">
              
              {/* Million Ref Input */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Million Document Ref. Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={batchDocRef}
                  onChange={(e) => setBatchDocRef(e.target.value)}
                  placeholder="e.g. DO-99214, GRN-10023, TR-5541..."
                  className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-mono font-medium"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  This reference number will be assigned to all {selectedIds.size} selected movement records.
                </span>
              </div>

              {/* Manual Date & Time Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Manual Date</label>
                  <input
                    type="date"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Manual Time</label>
                  <input
                    type="time"
                    value={batchTime}
                    onChange={(e) => setBatchTime(e.target.value)}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Approved By */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Approved By</label>
                <input
                  type="text"
                  value={batchApprovedBy}
                  onChange={(e) => setBatchApprovedBy(e.target.value)}
                  placeholder="e.g. Admin / Supervisor Name"
                  className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* Status Toggle (Strict Admin Verification) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-800 block text-xs">
                    Mark as Recorded in Million (`status: true`)
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    Confirms that you have checked and posted these movements in the Million Accounting System.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={batchStatus}
                    onChange={(e) => setBatchStatus(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0B57D0]"></div>
                </label>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <CustomButton
                variant="secondary"
                onClick={() => setShowBatchModal(false)}
                disabled={isSubmittingBatch}
                className="h-9 px-4 text-xs"
              >
                Cancel
              </CustomButton>
              <CustomButton
                variant="dark"
                onClick={handleSubmitBatchUpdate}
                disabled={isSubmittingBatch}
                className="h-9 px-4 text-xs bg-[#0B57D0] hover:bg-[#0842A0]"
              >
                {isSubmittingBatch ? "Updating..." : `Combine & Update (${selectedIds.size})`}
              </CustomButton>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SINGLE RECORD EDIT MODAL */}
      {/* ========================================================================= */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#0B57D0]" />
                  Edit Movement Record
                </h3>
                <span className="text-[11px] font-mono text-zinc-500">{editingRecord.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto text-xs">
              
              {/* Action Type Selector */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1.5">Action Type</label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditActionType("Stock Out")}
                    className={`h-9 px-3 rounded-lg border text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editActionType === "Stock Out" 
                        ? "bg-[#D3E3FD] border-[#0B57D0] text-[#041E49] font-bold shadow-2xs" 
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 font-medium"
                    }`}
                  >
                    <ArrowUpRight className={`w-4 h-4 ${editActionType === "Stock Out" ? "text-[#0B57D0]" : "text-zinc-500"}`} />
                    <span>Stock Out</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditActionType("Stock In")}
                    className={`h-9 px-3 rounded-lg border text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editActionType === "Stock In" 
                        ? "bg-[#D3E3FD] border-[#0B57D0] text-[#041E49] font-bold shadow-2xs" 
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 font-medium"
                    }`}
                  >
                    <ArrowDownLeft className={`w-4 h-4 ${editActionType === "Stock In" ? "text-[#0B57D0]" : "text-zinc-500"}`} />
                    <span>Stock In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditActionType("Stock Transfer")}
                    className={`h-9 px-3 rounded-lg border text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editActionType === "Stock Transfer" 
                        ? "bg-[#D3E3FD] border-[#0B57D0] text-[#041E49] font-bold shadow-2xs" 
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 font-medium"
                    }`}
                  >
                    <Repeat className={`w-4 h-4 ${editActionType === "Stock Transfer" ? "text-[#0B57D0]" : "text-zinc-500"}`} />
                    <span>Transfer</span>
                  </button>
                </div>
              </div>

              {/* Million Ref */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Million Ref. Number (Document Reference)
                </label>
                <input
                  type="text"
                  value={editDocRef}
                  onChange={(e) => setEditDocRef(e.target.value)}
                  placeholder="e.g. DO-99214 / TR-1024..."
                  className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Items List Builder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-zinc-700">Products & Quantities</label>
                  <button
                    type="button"
                    onClick={() => setEditItems((prev) => [...prev, { sku: "", qty: "" }])}
                    className="text-[11px] font-bold text-[#0B57D0] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {editItems.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <ProductSearchSelect
                        value={it.sku}
                        onChange={(selectedSku) => {
                          setEditItems((prev) => {
                            const next = [...prev];
                            next[idx].sku = selectedSku;
                            return next;
                          });
                        }}
                        productsList={products}
                        productMap={productMap}
                        placeholder="Search SKU or product name..."
                      />
                      <input
                        type="number"
                        value={it.qty}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditItems((prev) => {
                            const next = [...prev];
                            next[idx].qty = val;
                            return next;
                          });
                        }}
                        placeholder="Qty"
                        className="w-24 h-8 px-2.5 border border-zinc-300 rounded text-xs text-right focus:outline-none focus:border-[#0B57D0]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEditItems((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className="text-zinc-400 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description / Remarks */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Description / Remarks</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Reason, destination, remarks..."
                  className="w-full p-2 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* Approved By */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Approved By</label>
                <input
                  type="text"
                  value={editApprovedBy}
                  onChange={(e) => setEditApprovedBy(e.target.value)}
                  placeholder="Approver name..."
                  className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* Status Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-800 block text-xs">
                    Recorded in Million (`status: true`)
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    Admin verification check status.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editStatus}
                    onChange={(e) => setEditStatus(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0B57D0]"></div>
                </label>
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <CustomButton
                variant="secondary"
                onClick={() => setEditingRecord(null)}
                disabled={isSavingEdit}
                className="h-9 px-4 text-xs"
              >
                Cancel
              </CustomButton>
              <CustomButton
                variant="dark"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="h-9 px-4 text-xs bg-[#0B57D0] hover:bg-[#0842A0]"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </CustomButton>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE NEW MOVEMENT MODAL */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#0B57D0]" />
                  Create New Stock Movement
                </h3>
                <span className="text-[11px] text-zinc-500">Record a new In, Out, or Transfer transaction</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto text-xs">
              
              {/* Action Type Selector */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1.5">Action Type</label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewActionType("Stock Out")}
                    className={`h-9 px-3 rounded-lg border text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      newActionType === "Stock Out" 
                        ? "bg-[#D3E3FD] border-[#0B57D0] text-[#041E49] font-bold shadow-2xs" 
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 font-medium"
                    }`}
                  >
                    <ArrowUpRight className={`w-4 h-4 ${newActionType === "Stock Out" ? "text-[#0B57D0]" : "text-zinc-500"}`} />
                    <span>Stock Out</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewActionType("Stock In")}
                    className={`h-9 px-3 rounded-lg border text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      newActionType === "Stock In" 
                        ? "bg-[#D3E3FD] border-[#0B57D0] text-[#041E49] font-bold shadow-2xs" 
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 font-medium"
                    }`}
                  >
                    <ArrowDownLeft className={`w-4 h-4 ${newActionType === "Stock In" ? "text-[#0B57D0]" : "text-zinc-500"}`} />
                    <span>Stock In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewActionType("Stock Transfer")}
                    className={`h-9 px-3 rounded-lg border text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      newActionType === "Stock Transfer" 
                        ? "bg-[#D3E3FD] border-[#0B57D0] text-[#041E49] font-bold shadow-2xs" 
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 font-medium"
                    }`}
                  >
                    <Repeat className={`w-4 h-4 ${newActionType === "Stock Transfer" ? "text-[#0B57D0]" : "text-zinc-500"}`} />
                    <span>Transfer</span>
                  </button>
                </div>
              </div>

              {/* Million Ref Input */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Million Ref. Number (Optional)
                </label>
                <input
                  type="text"
                  value={newDocRef}
                  onChange={(e) => setNewDocRef(e.target.value)}
                  placeholder="e.g. DO-99214, GRN-10023, TR-5541..."
                  className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs font-mono focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Items List Builder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-zinc-700">Products & Quantities</label>
                  <button
                    type="button"
                    onClick={() => setNewItems((prev) => [...prev, { sku: "", qty: "" }])}
                    className="text-[11px] font-bold text-[#0B57D0] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {newItems.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <ProductSearchSelect
                        value={it.sku}
                        onChange={(selectedSku) => {
                          setNewItems((prev) => {
                            const next = [...prev];
                            next[idx].sku = selectedSku;
                            return next;
                          });
                        }}
                        productsList={products}
                        productMap={productMap}
                        placeholder="Search SKU or product name..."
                      />
                      <input
                        type="number"
                        value={it.qty}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewItems((prev) => {
                            const next = [...prev];
                            next[idx].qty = val;
                            return next;
                          });
                        }}
                        placeholder="Qty"
                        className="w-24 h-8 px-2.5 border border-zinc-300 rounded text-xs text-right focus:outline-none focus:border-[#0B57D0]"
                      />
                      {newItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewItems((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="text-zinc-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Description / Remarks */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Description / Remarks</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Reason, destination, remarks..."
                  className="w-full p-2 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* Approved By */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Approved By</label>
                <input
                  type="text"
                  value={newApprovedBy}
                  onChange={(e) => setNewApprovedBy(e.target.value)}
                  placeholder="Approver name..."
                  className="w-full h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* Status Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-800 block text-xs">
                    Recorded in Million (`status: true`)
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    Check if you have already recorded this in Million System. Default is pending (false).
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStatus}
                    onChange={(e) => setNewStatus(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0B57D0]"></div>
                </label>
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <CustomButton
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={isSavingNew}
                className="h-9 px-4 text-xs"
              >
                Cancel
              </CustomButton>
              <CustomButton
                variant="dark"
                onClick={handleSaveNewMovement}
                disabled={isSavingNew}
                className="h-9 px-4 text-xs bg-[#0B57D0] hover:bg-[#0842A0]"
              >
                {isSavingNew ? "Creating..." : "Create Movement"}
              </CustomButton>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW SKU ITEMS DETAIL MODAL */}
      {/* ========================================================================= */}
      {viewingItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[85vh]">
            
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <PackageSearch className="w-4 h-4 text-[#0B57D0]" />
                  Stock Movement SKU List ({viewingItems.items.length} {viewingItems.items.length === 1 ? "Item" : "Items"})
                </h3>
                <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                  <span className="font-semibold text-zinc-700">{viewingItems.action_type}</span>
                  <span>•</span>
                  <span>Doc Ref: <strong className="text-zinc-800 font-mono">{viewingItems.doc_ref}</strong></span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-zinc-400">{viewingItems.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingItems(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items Table */}
            <div className="overflow-y-auto flex-1 p-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F8F9FA] text-[11px] font-bold text-zinc-600 uppercase border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-12 text-center text-zinc-400">#</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Carton Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingItems.items.map((item, idx) => {
                    const pInfo = productMap[item.sku.toLowerCase()];
                    const cSize = pInfo?.uom || 0;
                    const cCalc = formatCartonCalculation(item.qty, cSize);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-zinc-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.sku}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-800 font-medium">
                          {pInfo?.name || <span className="text-zinc-400 italic">Unknown Product</span>}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-900 text-sm">
                          {item.qty.toLocaleString()} <span className="text-xs font-normal text-zinc-500">pcs</span>
                        </td>
                        <td className="p-3 text-right font-mono text-zinc-600">
                          {cCalc}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="px-5 py-3 bg-[#F8F9FA] border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-zinc-500">Total Unique SKUs:</span>{" "}
                  <strong className="text-zinc-900 font-mono">{viewingItems.items.length}</strong>
                </div>
                <div>
                  <span className="text-zinc-500">Total Pieces:</span>{" "}
                  <strong className="text-[#0B57D0] font-mono font-bold text-sm">
                    {viewingItems.items.reduce((acc, i) => acc + (i.qty || 0), 0).toLocaleString()} pcs
                  </strong>
                </div>
              </div>
              <CustomButton
                variant="secondary"
                onClick={() => setViewingItems(null)}
                className="h-8 px-4 text-xs"
              >
                Close
              </CustomButton>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHOTO LIGHTBOX PREVIEW MODAL */}
      {/* ========================================================================= */}
      {viewingPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[85vh]">
            
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#0B57D0]" />
                  Attached Movement Photos ({viewingPhotos.photos.length})
                </h3>
                <span className="text-xs text-zinc-500">{viewingPhotos.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingPhotos(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photos Grid */}
            <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {viewingPhotos.photos.map((url, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-black/5 aspect-4/3 flex items-center justify-center">
                    <img 
                      src={url} 
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1"
                    >
                      <ExternalLink className="w-4 h-4" /> Open Full
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <CustomButton
                variant="secondary"
                onClick={() => setViewingPhotos(null)}
                className="h-8 px-4 text-xs"
              >
                Close
              </CustomButton>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
