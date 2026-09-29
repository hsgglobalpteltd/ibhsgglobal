"use client";

import * as React from "react";
import { 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Search, 
  FileSpreadsheet, 
  Download,
  ShoppingBag,
  Store,
  Edit2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  X,
  Check,
  Building2,
  Tag,
  AlertCircle,
  Calendar,
  Sparkles,
  Trash2,
  Zap,
  MousePointerClick,
  RotateCcw
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import * as XLSX from "xlsx";

const API_BASE = "https://ib-v2.hsgglobalpteltd.workers.dev";

// Reusable Custom Dropdown Component (No Native Browser Select)
interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  minWidth?: string;
  placement?: "bottom" | "top" | "auto";
  maxHeight?: string;
  searchable?: boolean;
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  minWidth = "min-w-[130px]",
  placement = "auto",
  maxHeight = "max-h-56",
  searchable = true
}: CustomSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [openUp, setOpenUp] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (placement === "top" || (placement === "auto" && spaceBelow < 220)) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
    }
    setOpen((prev) => !prev);
    setQuery("");
  };

  const filteredOptions = React.useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, query]);

  const selectedOpt = options.find((o) => o.value === value);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        className={`h-8 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-zinc-700 flex items-center justify-between gap-1.5 focus:outline-none focus:border-[#0B57D0] cursor-pointer transition-colors shadow-2xs ${minWidth}`}
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <ChevronDown size={12} className={`text-zinc-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute left-0 ${openUp ? "bottom-full mb-1" : "top-full mt-1"} w-full min-w-[180px] ${maxHeight} overflow-auto bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-xs font-medium text-zinc-700 animate-in fade-in zoom-in-95 duration-100`}>
          {searchable && options.length > 6 && (
            <div className="p-1.5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-7 px-2 text-xs border border-slate-200 rounded focus:outline-none focus:border-[#0B57D0]"
              />
            </div>
          )}
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-zinc-400 text-[11px] text-center">No options</div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isSelected ? "bg-[#E8F0FE] text-[#0B57D0] font-semibold" : "hover:bg-slate-50 text-zinc-700"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={12} className="text-[#0B57D0] shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function SkuAutocompleteInput({
  value,
  onChange,
  productsList = [],
  placeholder = "Type or select SKU (e.g. CHM)..."
}: {
  value: string;
  onChange: (val: string) => void;
  productsList: any[];
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(value || "");
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setQuery(value || "");
  }, [value]);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = React.useMemo(() => {
    const q = (query || "").toLowerCase().trim();
    if (!q) return productsList.slice(0, 30);
    return productsList.filter((p) => {
      const s = String(p.product_sku || p.sku || "").toLowerCase();
      const n = String(p.product_name || p.display_name || "").toLowerCase();
      const b = String(p.brand || "").toLowerCase();
      return s.includes(q) || n.includes(q) || b.includes(q);
    }).slice(0, 30);
  }, [productsList, query]);

  return (
    <div className="relative w-full text-left" ref={wrapperRef} onClick={(e) => e.stopPropagation()}>
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();
            setQuery(val);
            onChange(val);
            setOpen(true);
          }}
          className="w-full h-7 px-2 pr-6 bg-blue-50/60 border border-blue-300 rounded text-xs font-mono font-bold text-blue-900 focus:outline-none focus:border-blue-600 uppercase"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange("");
            }}
            className="absolute right-1.5 p-0.5 text-zinc-400 hover:text-zinc-600 rounded cursor-pointer"
          >
            <X size={12} />
          </button>
        ) : (
          <ChevronDown size={12} className="absolute right-1.5 text-zinc-400 pointer-events-none" />
        )}
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-[260px] max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100 text-left">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-zinc-400 text-center">No matching SKU found</div>
          ) : (
            filtered.map((p, idx) => {
              const sku = p.product_sku || p.sku || "";
              const name = p.product_name || p.display_name || "";
              const brand = p.brand || "";
              const isSelected = sku === value;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(sku);
                    onChange(sku);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 hover:bg-blue-50 transition-colors flex flex-col cursor-pointer ${
                    isSelected ? "bg-blue-50/80 font-semibold" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-bold text-blue-900">{sku}</span>
                    {brand && <span className="text-[9.5px] px-1 py-0.2 rounded bg-slate-100 text-zinc-500 font-sans">{brand}</span>}
                  </div>
                  {name && <span className="text-[10.5px] text-zinc-600 truncate max-w-[240px] font-sans">{name}</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

interface SellOutModuleProps {
  profile?: any;
}

export function SellOutModule({ profile }: SellOutModuleProps) {
  // Global Month Filter initialized to previous sales cycle month (matching sales cycle)
  const [currentPeriod, setCurrentPeriod] = React.useState<string>(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = prev.getFullYear();
    const m = String(prev.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  // Data States
  const [loading, setLoading] = React.useState<boolean>(false);
  const [batchData, setBatchData] = React.useState<any | null>(null);
  const [records, setRecords] = React.useState<any[]>([]);
  const [buyersList, setBuyersList] = React.useState<any[]>([]);
  const [sellInBuyersList, setSellInBuyersList] = React.useState<any[]>([]);
  const [storesList, setStoresList] = React.useState<any[]>([]);
  const [productsList, setProductsList] = React.useState<any[]>([]);
  const [skuMappings, setSkuMappings] = React.useState<any[]>([]);

  // Sub-filter tab in Sell-Out view
  const [subFilterTab, setSubFilterTab] = React.useState<"all" | "so" | "diagnostics">("all");
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [buyerFilter, setBuyerFilter] = React.useState<string>("all");
  const [brandFilter, setBrandFilter] = React.useState<string>("all");

  // Import Modal States
  const [showImportModal, setShowImportModal] = React.useState<boolean>(false);
  const [importBuyer, setImportBuyer] = React.useState<string>("");
  const [customBuyerName, setCustomBuyerName] = React.useState<string>("");
  const [parsedRows, setParsedRows] = React.useState<any[]>([]);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importFileName, setImportFileName] = React.useState<string>("");
  const [rawSheetGrid, setRawSheetGrid] = React.useState<any[][]>([]);
  const [importing, setImporting] = React.useState<boolean>(false);
  const [fetchingPreview, setFetchingPreview] = React.useState<boolean>(false);
  const [savingTemplate, setSavingTemplate] = React.useState<boolean>(false);
  const [activeImportStep, setActiveImportStep] = React.useState<"template" | "preview">("template");
  // Template Configuration Rules & Visual Selection
  const [activeTarget, setActiveTarget] = React.useState<"sku" | "store" | "qty" | "amount" | null>("sku");
  const [templateSkuRule, setTemplateSkuRule] = React.useState<string>("");
  const [templateSkuMultiple, setTemplateSkuMultiple] = React.useState<boolean>(false);
  const [templateSingleSku, setTemplateSingleSku] = React.useState<string>("");
  const [templateStoreRule, setTemplateStoreRule] = React.useState<string>("");
  const [templateQtyRule, setTemplateQtyRule] = React.useState<string>("");
  const [templateAmountRule, setTemplateAmountRule] = React.useState<string>("");
  const [templateAdditionalPrompt, setTemplateAdditionalPrompt] = React.useState<string>("");
  const [loadedTemplateId, setLoadedTemplateId] = React.useState<string>("");

  // Visual Cell Selections Map (Target -> { minR, maxR, minC, maxC, label })
  const [skuRange, setSkuRange] = React.useState<{ minR: number; maxR: number; minC: number; maxC: number } | null>(null);
  const [storeRange, setStoreRange] = React.useState<{ minR: number; maxR: number; minC: number; maxC: number } | null>(null);
  const [qtyRange, setQtyRange] = React.useState<{ minR: number; maxR: number; minC: number; maxC: number } | null>(null);
  const [amountRange, setAmountRange] = React.useState<{ minR: number; maxR: number; minC: number; maxC: number } | null>(null);

  // Drag-to-select temp state
  const [isSelectingGrid, setIsSelectingGrid] = React.useState<boolean>(false);
  const [selectionStart, setSelectionStart] = React.useState<{ r: number; c: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = React.useState<{ r: number; c: number } | null>(null);
  const [lastClickedCell, setLastClickedCell] = React.useState<{ r: number; c: number } | null>(null);

  const [importReconciliation, setImportReconciliation] = React.useState<{
    totalQty: number;
    totalAmt: number;
    unregisteredCount: number;
  } | null>(null);

  // Reset Modal States
  const [showResetModal, setShowResetModal] = React.useState<boolean>(false);
  const [resetBuyer, setResetBuyer] = React.useState<string>("");
  const [resetConfirmText, setResetConfirmText] = React.useState<string>("");
  const [resetting, setResetting] = React.useState<boolean>(false);

  // Auto-Generate 100% Sell-Out Modal States
  const [showGenerateModal, setShowGenerateModal] = React.useState<boolean>(false);
  const [selectedSellInBuyers, setSelectedSellInBuyers] = React.useState<string[]>([]);
  const [generating, setGenerating] = React.useState<boolean>(false);

  // SKU Map / Edit Modal States
  const [showMapSkuModal, setShowMapSkuModal] = React.useState<boolean>(false);
  const [mapSkuTarget, setMapSkuTarget] = React.useState<{
    buyer_name: string;
    raw_product_description: string;
    current_sku: string;
    current_product_name: string;
    current_brand: string;
  } | null>(null);
  const [selectedStandardSku, setSelectedStandardSku] = React.useState<string>("");
  const [customMappedName, setCustomMappedName] = React.useState<string>("");
  const [customMappedBrand, setCustomMappedBrand] = React.useState<string>("");
  const [savingSkuMap, setSavingSkuMap] = React.useState<boolean>(false);

  // Store Mapping & Registration Modal States
  const [showMapStoreModal, setShowMapStoreModal] = React.useState<boolean>(false);
  const [mapStoreTarget, setMapStoreTarget] = React.useState<{
    buyer_name: string;
    raw_outlet_code: string;
    raw_outlet_name: string;
    current_store_id: string;
  } | null>(null);
  const [selectedMasterStoreId, setSelectedMasterStoreId] = React.useState<string>("");
  const [storeModalMode, setStoreModalMode] = React.useState<"map" | "register">("map");
  const [newStoreName, setNewStoreName] = React.useState<string>("");
  const [newStoreAddress, setNewStoreAddress] = React.useState<string>("");
  const [newStorePostal, setNewStorePostal] = React.useState<string>("");
  const [savingStoreMap, setSavingStoreMap] = React.useState<boolean>(false);
  const [storeMappings, setStoreMappings] = React.useState<any[]>([]);

  // Row Edit Modal State
  const [showEditRowModal, setShowEditRowModal] = React.useState<boolean>(false);
  const [editingRow, setEditingRow] = React.useState<any | null>(null);
  const [editQty, setEditQty] = React.useState<string>("");
  const [editAmount, setEditAmount] = React.useState<string>("");
  const [savingRowEdit, setSavingRowEdit] = React.useState<boolean>(false);

  // Publish State
  const [publishing, setPublishing] = React.useState<boolean>(false);

  // Confirmation Dialog
  const [confirmConfig, setConfirmConfig] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // Fetch Batch Details
  const fetchBatchDetails = React.useCallback(async (period: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellout/batch-details?period=${encodeURIComponent(period)}`);
      if (res.ok) {
        const data = await res.json();
        setBatchData(data.batch || null);
        setRecords(Array.isArray(data.records) ? data.records : []);
        setBuyersList(Array.isArray(data.buyers) ? data.buyers : []);
        setSellInBuyersList(Array.isArray(data.sellin_buyers) ? data.sellin_buyers : []);
        setStoresList(Array.isArray(data.stores) ? data.stores : []);
        setProductsList(Array.isArray(data.products) ? data.products : []);
        setSkuMappings(Array.isArray(data.sku_mappings) ? data.sku_mappings : []);
        setStoreMappings(Array.isArray(data.store_mappings) ? data.store_mappings : []);
      } else {
        setRecords([]);
      }
    } catch (err: any) {
      if (!silent) showToast("Failed to load Sell-Out data: " + err.message, "error");
      setRecords([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBatchDetails(currentPeriod);
  }, [currentPeriod, fetchBatchDetails]);

  // Global Refresh Listener
  React.useEffect(() => {
    const handleDbRefresh = () => fetchBatchDetails(currentPeriod, false);
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [fetchBatchDetails, currentPeriod]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = currentPeriod.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevY = prevDate.getFullYear();
    const prevM = String(prevDate.getMonth() + 1).padStart(2, "0");
    setCurrentPeriod(`${prevY}-${prevM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentPeriod.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const nextY = nextDate.getFullYear();
    const nextM = String(nextDate.getMonth() + 1).padStart(2, "0");
    setCurrentPeriod(`${nextY}-${nextM}`);
  };

  const formatPeriodLabel = (p: string) => {
    try {
      const [y, m] = p.split("-").map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleString("en-US", { month: "long", year: "numeric" });
    } catch {
      return p;
    }
  };

  // KPIs
  const kpis = React.useMemo(() => {
    let grossSales = 0;
    let totalQty = 0;
    const storeSet = new Set<string>();
    let diagnosticsCount = 0;

    records.forEach((r) => {
      grossSales += Number(r.sales_amount || 0);
      totalQty += Number(r.sales_quantity || 0);
      if (r.outlet_code) storeSet.add(r.outlet_code);
      if (r.validation_status === "diagnose_needed" || r.store_status !== "registered" || r.sku_status !== "mapped") {
        diagnosticsCount++;
      }
    });

    return {
      grossSales,
      totalQty,
      storeCount: storeSet.size,
      diagnosticsCount,
      totalRecords: records.length
    };
  }, [records]);

  // Distinct Brands from records
  const availableBrands = React.useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.brand && r.brand.trim()) set.add(r.brand.trim());
    });
    return Array.from(set).sort();
  }, [records]);

  // Fast Map for Buyer Channel lookup (Channel subtitle below Buyer name)
  const buyerChannelMap = React.useMemo(() => {
    const map = new Map<string, string>();
    buyersList.forEach((b) => {
      const name = String(b.buyer_name || b.name || "").trim().toLowerCase();
      const code = String(b.buyer_code || b.id || "").trim();
      const ch = String(b.channel || b.sales_channel || "Retailer").trim();
      if (name) {
        map.set(name, ch || "Retailer");
      }
      if (code) {
        map.set(code.toLowerCase(), ch || "Retailer");
      }
    });
    return map;
  }, [buyersList]);

  // Distinct Buyers strictly from BuyerDB (buyers_db) for Import & mapping
  const availableBuyers = React.useMemo(() => {
    const list: Array<{ label: string; value: string; code: string }> = [];
    const seen = new Set<string>();

    buyersList.forEach((b) => {
      const name = typeof b === "string" ? b : (b.buyer_name || b.name || "");
      const code = typeof b === "object" ? (b.buyer_code || b.channel || "") : "";
      if (name && !seen.has(name)) {
        seen.add(name);
        list.push({
          label: code ? `${name} (${code})` : name,
          value: name,
          code
        });
      }
    });

    records.forEach((r) => {
      if (r.buyer_name && !seen.has(r.buyer_name)) {
        seen.add(r.buyer_name);
        list.push({
          label: r.buyer_name,
          value: r.buyer_name,
          code: ""
        });
      }
    });

    return list;
  }, [buyersList, records]);

  // Distinct Buyers strictly having existing Sell-Out records in this period
  const existingDataBuyers = React.useMemo(() => {
    const list: Array<{ label: string; value: string; count: number; total_qty: number }> = [];
    const map = new Map<string, { count: number; total_qty: number }>();

    records.forEach((r) => {
      const bName = String(r.buyer_name || "").trim();
      if (!bName) return;
      const existing = map.get(bName) || { count: 0, total_qty: 0 };
      existing.count += 1;
      existing.total_qty += Number(r.sales_quantity || 0);
      map.set(bName, existing);
    });

    Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([name, stat]) => {
        list.push({
          label: `${name} (${stat.count} records)`,
          value: name,
          count: stat.count,
          total_qty: stat.total_qty
        });
      });

    return list;
  }, [records]);

  // Distinct Sell-In Buyers strictly with Sell-In records in this Period
  const availableSellInBuyers = React.useMemo(() => {
    if (sellInBuyersList.length > 0) {
      return sellInBuyersList
        .filter((b) => Number(b.total_qty || 0) > 0 || Number(b.total_amount || 0) > 0)
        .map((b) => ({
          label: b.buyer_name,
          value: b.buyer_name,
          channel: b.channel || buyerChannelMap.get(b.buyer_name.toLowerCase().trim()) || "Retailer",
          total_qty: Number(b.total_qty || 0),
          total_amount: Number(b.total_amount || 0),
          is_registered: b.is_registered
        }));
    }
    return [];
  }, [sellInBuyersList, buyerChannelMap]);

  // Dropdown Options for Main Table Filter (Only show buyers with existing data)
  const buyerFilterOptions = React.useMemo(() => {
    return [
      { label: "All Retailers", value: "all" },
      ...existingDataBuyers.map((b) => ({ label: b.value, value: b.value }))
    ];
  }, [existingDataBuyers]);

  const brandFilterOptions = React.useMemo(() => {
    const list = [{ label: "All Brands", value: "all" }];
    availableBrands.forEach((b) => {
      list.push({ label: b, value: b });
    });
    return list;
  }, [availableBrands]);

  // Filtered Records for Table
  const filteredRecords = React.useMemo(() => {
    return records.filter((r) => {
      if (subFilterTab === "so" && Number(r.sales_quantity || 0) <= 0) return false;
      if (subFilterTab === "diagnostics" && (r.store_status === "registered" && r.sku_status === "mapped")) return false;

      if (buyerFilter !== "all" && r.buyer_name !== buyerFilter) return false;
      if (brandFilter !== "all" && r.brand !== brandFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const code = String(r.outlet_code || "").toLowerCase();
        const name = String(r.store_name || r.outlet_name || "").toLowerCase();
        const sku = String(r.product_sku || "").toLowerCase();
        const pname = String(r.product_name || r.raw_product_description || "").toLowerCase();
        const brand = String(r.brand || "").toLowerCase();
        const buyer = String(r.buyer_name || "").toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !sku.includes(q) && !pname.includes(q) && !brand.includes(q) && !buyer.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [records, subFilterTab, buyerFilter, brandFilter, searchTerm]);

  // -------------------------------------------------------------
  // Visual Spreadsheet Grid Selection Helpers
  // -------------------------------------------------------------
  const sheetColumnCount = React.useMemo(() => {
    if (!rawSheetGrid || rawSheetGrid.length === 0) return 15;
    let max = 0;
    for (const r of rawSheetGrid) {
      if (Array.isArray(r) && r.length > max) max = r.length;
    }
    return Math.max(max, 15);
  }, [rawSheetGrid]);

  const getColumnName = (colIndex: number): string => {
    let name = "";
    let temp = colIndex;
    while (temp >= 0) {
      name = String.fromCharCode((temp % 26) + 65) + name;
      temp = Math.floor(temp / 26) - 1;
    }
    return name;
  };

  const formatCellRange = (range: { minR: number; maxR: number; minC: number; maxC: number } | null): string => {
    if (!range) return "Not selected";
    const startCell = `${getColumnName(range.minC)}${range.minR + 1}`;
    const endCell = `${getColumnName(range.maxC)}${range.maxR + 1}`;
    if (startCell === endCell) return startCell;
    return `${startCell}:${endCell}`;
  };

  const applyRangeToActiveTarget = (range: { minR: number; maxR: number; minC: number; maxC: number }) => {
    const rangeText = formatCellRange(range);
    if (activeTarget === "sku") {
      setSkuRange(range);
      if (!templateSkuRule) setTemplateSkuRule(`Range: ${rangeText}`);
    } else if (activeTarget === "store") {
      setStoreRange(range);
      if (!templateStoreRule) setTemplateStoreRule(`Range: ${rangeText}`);
    } else if (activeTarget === "qty") {
      setQtyRange(range);
      if (!templateQtyRule) setTemplateQtyRule(`Range: ${rangeText}`);
    } else if (activeTarget === "amount") {
      setAmountRange(range);
      if (!templateAmountRule) setTemplateAmountRule(`Range: ${rangeText}`);
    }
  };

  const handleCellMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    if (!activeTarget) return;

    // Shift + Click Range Selection
    if (e.shiftKey && lastClickedCell) {
      const minR = Math.min(lastClickedCell.r, r);
      const maxR = Math.max(lastClickedCell.r, r);
      const minC = Math.min(lastClickedCell.c, c);
      const maxC = Math.max(lastClickedCell.c, c);
      const range = { minR, maxR, minC, maxC };
      applyRangeToActiveTarget(range);
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelectingGrid(false);
      return;
    }

    setLastClickedCell({ r, c });
    setIsSelectingGrid(true);
    setSelectionStart({ r, c });
    setSelectionEnd({ r, c });
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    if (!isSelectingGrid) return;
    setSelectionEnd({ r, c });
  };

  const handleCellMouseUp = () => {
    if (!isSelectingGrid || !selectionStart || !selectionEnd || !activeTarget) {
      setIsSelectingGrid(false);
      return;
    }
    setIsSelectingGrid(false);
    const minR = Math.min(selectionStart.r, selectionEnd.r);
    const maxR = Math.max(selectionStart.r, selectionEnd.r);
    const minC = Math.min(selectionStart.c, selectionEnd.c);
    const maxC = Math.max(selectionStart.c, selectionEnd.c);

    const range = { minR, maxR, minC, maxC };
    applyRangeToActiveTarget(range);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const handleColumnHeaderClick = (colIdx: number) => {
    if (!activeTarget || rawSheetGrid.length === 0) return;
    const startR = rawSheetGrid.length > 1 ? 1 : 0;
    const endR = rawSheetGrid.length - 1;
    const range = { minR: startR, maxR: endR, minC: colIdx, maxC: colIdx };
    applyRangeToActiveTarget(range);
    setLastClickedCell({ r: startR, c: colIdx });
  };

  // -------------------------------------------------------------
  // Load Buyer Template when Buyer changes
  // -------------------------------------------------------------
  const loadBuyerTemplate = async (buyerName: string) => {
    if (!buyerName || buyerName === "__custom__") {
      setLoadedTemplateId("");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/sellout/templates?buyer_name=${encodeURIComponent(buyerName)}`);
      if (res.ok) {
        const data = await res.json();
        const tpls = data.templates || [];
        if (tpls.length > 0) {
          const cfg = tpls[0].template_config || {};
          setTemplateSkuRule(cfg.sku_rule || "");
          setTemplateSkuMultiple(Boolean(cfg.sku_has_multiple));
          setTemplateSingleSku(cfg.single_sku || "");
          setTemplateStoreRule(cfg.store_rule || "");
          setTemplateQtyRule(cfg.qty_rule || "");
          setTemplateAmountRule(cfg.amount_rule || "");
          setTemplateAdditionalPrompt(cfg.additional_prompt || "");
          setSkuRange(cfg.sku_range || null);
          setStoreRange(cfg.store_range || null);
          setQtyRange(cfg.qty_range || null);
          setAmountRange(cfg.amount_range || null);
          setLoadedTemplateId(tpls[0].id || "");
        } else {
          // Reset if no saved template exists for this buyer
          setLoadedTemplateId("");
        }
      }
    } catch (e) {
      console.warn("Could not load template for buyer:", e);
    }
  };

  const handleBuyerSelectionChange = (bName: string) => {
    setImportBuyer(bName);
    loadBuyerTemplate(bName);
  };

  // -------------------------------------------------------------
  // Save or Update Template for Buyer
  // -------------------------------------------------------------
  const handleSaveTemplate = async () => {
    const finalBuyerName = importBuyer === "__custom__" ? customBuyerName.trim() : importBuyer.trim();
    if (!finalBuyerName) {
      showToast("Please select or enter Buyer / Retailer name before saving template", "error");
      return;
    }

    setSavingTemplate(true);
    try {
      const templateConfig = {
        sku_rule: templateSkuMultiple ? (templateSkuRule.trim() || formatCellRange(skuRange)) : `Fixed Single SKU: ${templateSingleSku.trim()}`,
        sku_has_multiple: templateSkuMultiple,
        single_sku: templateSingleSku.trim(),
        sku_range: templateSkuMultiple ? skuRange : null,
        store_rule: templateStoreRule.trim() || formatCellRange(storeRange),
        store_range: storeRange,
        qty_rule: templateQtyRule.trim() || formatCellRange(qtyRange),
        qty_range: qtyRange,
        amount_rule: templateAmountRule.trim() || formatCellRange(amountRange),
        amount_range: amountRange,
        additional_prompt: templateAdditionalPrompt.trim()
      };

      const res = await fetch(`${API_BASE}/api/sellout/save-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_name: finalBuyerName,
          template_config: templateConfig
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLoadedTemplateId(data.id || "saved");
        showToast(`Template mapping saved for ${finalBuyerName}!`, "success");
      } else {
        showToast(data.error || "Failed to save template", "error");
      }
    } catch (err: any) {
      showToast("Save template error: " + err.message, "error");
    } finally {
      setSavingTemplate(false);
    }
  };

  // -------------------------------------------------------------
  // Excel File Parsing & Grid Extraction for Import Modal
  // -------------------------------------------------------------
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportFileName(file.name);
    setParsedRows([]);
    setImportReconciliation(null);
    setActiveImportStep("template");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        
        // Single sheet extraction (Sheet 1)
        const targetSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[targetSheetName];

        // 2D Array of all cells in Sheet 1
        const rawAoA: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (!rawAoA || rawAoA.length === 0) {
          showToast("No data rows found in sheet: " + targetSheetName, "error");
          return;
        }

        setRawSheetGrid(rawAoA);
        showToast(`Loaded ${rawAoA.length} rows from sheet "${targetSheetName}". Click and drag on cells to map SKU, Store, Qty, and Amount.`, "success");
      } catch (err: any) {
        showToast("Failed to read Excel file: " + err.message, "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  // -------------------------------------------------------------
  // Fetch Data Preview using Template Rules & Visual Cell Ranges
  // -------------------------------------------------------------
  const handleFetchPreview = async () => {
    const finalBuyerName = importBuyer === "__custom__" ? customBuyerName.trim() : importBuyer.trim();
    if (!finalBuyerName) {
      showToast("Please select or enter the Buyer / Retailer name", "error");
      return;
    }
    if (rawSheetGrid.length === 0) {
      showToast("Please select an Excel file first", "error");
      return;
    }

    if (!templateSkuMultiple && !templateSingleSku.trim() && !skuRange) {
      showToast("Please enter the Product SKU or enable Multi-SKU to select a range", "error");
      return;
    }

    setFetchingPreview(true);
    try {
      const skuInstruction = templateSkuMultiple
        ? `Selected Range: ${formatCellRange(skuRange)}. Multiple SKUs across rows/columns. ${templateSkuRule}`.trim()
        : `Fixed Single SKU for whole file: "${templateSingleSku.trim()}". ${templateSkuRule}`.trim();

      const templateConfig = {
        sku_rule: skuInstruction,
        sku_has_multiple: templateSkuMultiple,
        single_sku: templateSingleSku.trim(),
        sku_range: templateSkuMultiple ? skuRange : null,
        store_rule: `Selected Range: ${formatCellRange(storeRange)}. ${templateStoreRule}`.trim(),
        store_range: storeRange,
        qty_rule: `Selected Range: ${formatCellRange(qtyRange)}. ${templateQtyRule}`.trim(),
        qty_range: qtyRange,
        amount_rule: `Selected Range: ${formatCellRange(amountRange)}. ${templateAmountRule}`.trim(),
        amount_range: amountRange,
        additional_prompt: templateAdditionalPrompt.trim()
      };

      // 1. FAST LOCAL MATRIX & SPREADSHEET UNPIVOTER (Runs in 1ms)
      const isMatrixStoresHorizontal = 
        storeRange && 
        storeRange.minC < storeRange.maxC && 
        qtyRange && 
        qtyRange.minC < qtyRange.maxC;

      const isMatrixSkusHorizontal = 
        templateSkuMultiple &&
        skuRange && 
        skuRange.minC < skuRange.maxC && 
        storeRange && 
        qtyRange &&
        qtyRange.minC < qtyRange.maxC;

      if (isMatrixStoresHorizontal) {
        // MATRIX TYPE 1: Outlets horizontal on header row (e.g. I3:N3), SKUs down rows (e.g. E5:E7)
        const storeRowIdx = storeRange.minR;
        const storeHeaderRow = rawSheetGrid[storeRowIdx] || [];

        const startRow = Math.min(
          qtyRange ? qtyRange.minR : (skuRange ? skuRange.minR : 0),
          amountRange ? amountRange.minR : (skuRange ? skuRange.minR : 0)
        );
        const endRow = Math.max(
          qtyRange ? qtyRange.maxR : (skuRange ? skuRange.maxR : rawSheetGrid.length - 1),
          amountRange ? amountRange.maxR : (skuRange ? skuRange.maxR : rawSheetGrid.length - 1)
        );

        const startCol = Math.min(storeRange.minC, qtyRange.minC);
        const endCol = Math.max(storeRange.maxC, qtyRange.maxC, amountRange ? amountRange.maxC : storeRange.maxC);

        const localRows: any[] = [];
        let totalQ = 0;
        let totalA = 0;

        for (let r = startRow; r <= Math.min(endRow, rawSheetGrid.length - 1); r++) {
          const row = rawSheetGrid[r] || [];
          let skuVal = "";
          if (templateSkuMultiple && skuRange) {
            skuVal = String(row[skuRange.minC] ?? "").trim();
          } else {
            skuVal = String(templateSingleSku || "").trim();
          }
          if (!skuVal) continue;

          for (let c = startCol; c <= endCol; c += 2) {
            let storeVal = String(storeHeaderRow[c] || storeHeaderRow[c + 1] || "").trim();
            if (!storeVal || storeVal === "-" || storeVal.toLowerCase() === "total") continue;

            const qRaw = row[c];
            const aRaw = row[c + 1];

            const qNum = Math.abs(parseFloat(String(qRaw !== null && qRaw !== undefined ? qRaw : "").replace(/,/g, "")) || 0);
            const aNum = Math.abs(parseFloat(String(aRaw !== null && aRaw !== undefined ? aRaw : "").replace(/[\$,]/g, "")) || 0);

            if (qNum === 0 && aNum === 0) continue;

            totalQ += qNum;
            totalA += aNum;

            let code = storeVal;
            let name = storeVal;
            if (storeVal.includes(" - ")) {
              const parts = storeVal.split(" - ");
              code = parts[0].trim();
              name = parts.slice(1).join(" - ").trim();
            } else if (storeVal.includes("-")) {
              const parts = storeVal.split("-");
              code = parts[0].trim();
              name = parts.slice(1).join("-").trim();
            }

            localRows.push({
              id: `preview_${localRows.length + 1}`,
              outlet_code: code,
              outlet_name: name,
              raw_product_description: skuVal,
              product_sku: skuVal,
              product_name: skuVal,
              brand: "BIBIK EXPRESS",
              sales_quantity: qNum,
              sales_amount: aNum
            });
          }
        }

        if (localRows.length > 0) {
          setParsedRows(localRows);
          setImportReconciliation({ totalQty: totalQ, totalAmt: totalA, unregisteredCount: 0 });
          setActiveImportStep("preview");
          showToast(`Extracted ${localRows.length} sell-out line items from matrix table!`, "success");
          return;
        }
      } else if (isMatrixSkusHorizontal) {
        // MATRIX TYPE 2: SKUs horizontal on header row, Outlets down rows
        const skuRowIdx = skuRange!.minR;
        const skuHeaderRow = rawSheetGrid[skuRowIdx] || [];

        const startRow = Math.min(
          qtyRange ? qtyRange.minR : (storeRange ? storeRange.minR : 0),
          amountRange ? amountRange.minR : (storeRange ? storeRange.minR : 0)
        );
        const endRow = Math.max(
          qtyRange ? qtyRange.maxR : (storeRange ? storeRange.maxR : rawSheetGrid.length - 1),
          amountRange ? amountRange.maxR : (storeRange ? storeRange.maxR : rawSheetGrid.length - 1)
        );

        const startCol = Math.min(skuRange!.minC, qtyRange.minC);
        const endCol = Math.max(skuRange!.maxC, qtyRange.maxC, amountRange ? amountRange.maxC : skuRange!.maxC);

        const localRows: any[] = [];
        let totalQ = 0;
        let totalA = 0;

        for (let r = startRow; r <= Math.min(endRow, rawSheetGrid.length - 1); r++) {
          const row = rawSheetGrid[r] || [];
          const storeVal = storeRange ? String(row[storeRange.minC] ?? "").trim() : "";
          if (!storeVal || storeVal.toLowerCase() === "total" || storeVal.toLowerCase().includes("grand total")) continue;

          let code = storeVal;
          let name = storeVal;
          if (storeVal.includes(" - ")) {
            const parts = storeVal.split(" - ");
            code = parts[0].trim();
            name = parts.slice(1).join(" - ").trim();
          }

          for (let c = startCol; c <= endCol; c += 2) {
            const skuVal = String(skuHeaderRow[c] || skuHeaderRow[c + 1] || "").trim();
            if (!skuVal || skuVal === "-") continue;

            const qRaw = row[c];
            const aRaw = row[c + 1];

            const qNum = Math.abs(parseFloat(String(qRaw || 0).replace(/,/g, "")) || 0);
            const aNum = Math.abs(parseFloat(String(aRaw || 0).replace(/[\$,]/g, "")) || 0);

            if (qNum === 0 && aNum === 0) continue;

            totalQ += qNum;
            totalA += aNum;

            localRows.push({
              id: `preview_${localRows.length + 1}`,
              outlet_code: code,
              outlet_name: name,
              raw_product_description: skuVal,
              product_sku: skuVal,
              product_name: skuVal,
              brand: "BIBIK EXPRESS",
              sales_quantity: qNum,
              sales_amount: aNum
            });
          }
        }

        if (localRows.length > 0) {
          setParsedRows(localRows);
          setImportReconciliation({ totalQty: totalQ, totalAmt: totalA, unregisteredCount: 0 });
          setActiveImportStep("preview");
          showToast(`Extracted ${localRows.length} sell-out line items from matrix table!`, "success");
          return;
        }
      }

      // 2. BACKEND / AI EXTRACTION
      const res = await fetch(`${API_BASE}/api/sellout/fetch-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_name: finalBuyerName,
          raw_grid: rawSheetGrid,
          template_config: templateConfig
        })
      });

      const data = await res.json();

      if (res.ok && data.needs_client_fallback && data.api_key && data.system_prompt) {
        // Direct browser Gemini call (runs in Singapore client location without Cloudflare IP location blocking)
        const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"];
        let rawAiText = "";
        let aiErr = "";
        for (const m of models) {
          try {
            const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${data.api_key}`;
            const gRes = await fetch(gUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: data.system_prompt }] }],
                generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
              })
            });
            if (gRes.ok) {
              const gData = (await gRes.json()) as any;
              const parts = gData?.candidates?.[0]?.content?.parts || [];
              let txt = "";
              for (const p of parts) {
                if (p && typeof p.text === "string" && !p.thought) txt += p.text;
              }
              if (txt.trim()) {
                rawAiText = txt.trim();
                break;
              }
            } else {
              aiErr = await gRes.text();
            }
          } catch (e: any) {
            aiErr = e.message;
          }
        }

        if (rawAiText) {
          let clean = rawAiText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
          let parsed: any[] = [];
          try {
            parsed = JSON.parse(clean);
          } catch {
            const fb = clean.indexOf("[");
            const lb = clean.lastIndexOf("]");
            if (fb !== -1 && lb > fb) {
              try { parsed = JSON.parse(clean.substring(fb, lb + 1)); } catch {}
            }
          }

          if (Array.isArray(parsed) && parsed.length > 0) {
            let totalQ = 0;
            let totalA = 0;
            const formatted = parsed.map((r: any, i: number) => {
              const q = Math.abs(Number(r.sales_quantity || 0));
              const a = Math.abs(Number(r.sales_amount || 0));
              totalQ += q;
              totalA += a;
              return {
                id: `preview_${i + 1}`,
                outlet_code: String(r.outlet_code || "").trim(),
                outlet_name: String(r.outlet_name || "").trim(),
                raw_product_description: String(r.raw_product_description || r.product_name || "").trim(),
                product_sku: String(r.product_sku || templateSingleSku.trim() || "").trim(),
                product_name: String(r.raw_product_description || r.product_name || "").trim(),
                brand: String(r.brand || "BIBIK EXPRESS").trim(),
                sales_quantity: q,
                sales_amount: a
              };
            }).filter((r) => r.sales_quantity > 0 || r.sales_amount > 0 || r.raw_product_description.length > 0);

            setParsedRows(formatted);
            setImportReconciliation({ totalQty: totalQ, totalAmt: totalA, unregisteredCount: 0 });
            setActiveImportStep("preview");
            showToast(`Fetched ${formatted.length} sell-out line items! Please verify line by line before importing.`, "success");
            return;
          }
        } else if (data.direct_fallback_rows && Array.isArray(data.direct_fallback_rows)) {
          setParsedRows(data.direct_fallback_rows);
          setImportReconciliation({
            totalQty: data.total_quantity || 0,
            totalAmt: data.total_amount || 0,
            unregisteredCount: 0
          });
          setActiveImportStep("preview");
          showToast(`Fetched ${data.direct_fallback_rows.length} sell-out line items via grid mapping!`, "success");
          return;
        }
      }

      if (res.ok && data.success && Array.isArray(data.rows)) {
        setParsedRows(data.rows);
        setImportReconciliation({
          totalQty: data.total_quantity || 0,
          totalAmt: data.total_amount || 0,
          unregisteredCount: 0
        });
        setActiveImportStep("preview");
        showToast(`Fetched ${data.rows.length} sell-out line items! Please verify line by line before importing.`, "success");
      } else {
        showToast(data.error || "Failed to extract records. Please check template rules.", "error");
      }
    } catch (err: any) {
      showToast("Extraction error: " + err.message, "error");
    } finally {
      setFetchingPreview(false);
    }
  };

  // -------------------------------------------------------------
  // Submit Import to Backend
  // -------------------------------------------------------------
  const handleConfirmImport = async () => {
    const finalBuyerName = importBuyer === "__custom__" ? customBuyerName.trim() : importBuyer.trim();
    if (!finalBuyerName) {
      showToast("Please select or enter the Buyer / Retailer name", "error");
      return;
    }
    if (parsedRows.length === 0) {
      showToast("No parsed rows to import. Please click Fetch Data first.", "error");
      return;
    }

    setImporting(true);
    try {
      let fileUrl = "";
      if (importFile) {
        try {
          const fd = new FormData();
          fd.append("file", importFile);
          fd.append("period", currentPeriod);
          fd.append("buyer", finalBuyerName);
          const fRes = await fetch(`${API_BASE}/api/sellout/upload-file`, {
            method: "POST",
            body: fd
          });
          if (fRes.ok) {
            const fData = await fRes.json();
            fileUrl = fData.file_url || "";
          }
        } catch (fErr) {
          console.warn("File storage upload warning:", fErr);
        }
      }

      const res = await fetch(`${API_BASE}/api/sellout/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod,
          buyer_name: finalBuyerName,
          filename: importFileName || "sellout_import.xlsx",
          file_url: fileUrl,
          records: parsedRows
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Successfully imported ${data.count} sell-out records for ${finalBuyerName}!`, "success");
        setShowImportModal(false);
        setParsedRows([]);
        setRawSheetGrid([]);
        setImportFile(null);
        setImportFileName("");
        setImportBuyer("");
        setCustomBuyerName("");
        setActiveImportStep("template");
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Failed to import records", "error");
      }
    } catch (err: any) {
      showToast("Import error: " + err.message, "error");
    } finally {
      setImporting(false);
    }
  };

  // -------------------------------------------------------------
  // Buyer-Specific Reset Functionality
  // -------------------------------------------------------------
  const handleConfirmReset = async () => {
    if (!resetBuyer) {
      showToast("Please select the buyer to reset", "error");
      return;
    }
    const cleanConf = resetConfirmText.trim().toLowerCase();
    if (!cleanConf.includes("reset") || !cleanConf.includes(currentPeriod.toLowerCase())) {
      showToast(`Confirmation text must include "reset" and "${currentPeriod}" (e.g. reset_sales_${currentPeriod})`, "error");
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellout/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod,
          buyer_name: resetBuyer,
          confirmation: resetConfirmText
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Reset completed for ${resetBuyer}!`, "success");
        setShowResetModal(false);
        setResetBuyer("");
        setResetConfirmText("");
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Failed to reset buyer records", "error");
      }
    } catch (err: any) {
      showToast("Reset failed: " + err.message, "error");
    } finally {
      setResetting(false);
    }
  };

  // -------------------------------------------------------------
  // Auto-Generate 100% Sell-Out from Sell-In Functionality
  // -------------------------------------------------------------
  const handleConfirmGenerate = async () => {
    if (selectedSellInBuyers.length === 0) {
      showToast("Please select at least one Buyer to generate Sell-Out records for", "error");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellout/generate-from-sellin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod,
          buyer_names: selectedSellInBuyers,
          overwrite: true
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`⚡ Generated ${data.count} 100% Sell-Out records for ${selectedSellInBuyers.length} buyer(s)!`, "success");
        setShowGenerateModal(false);
        setSelectedSellInBuyers([]);
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Failed to generate records from Sell-In", "error");
      }
    } catch (err: any) {
      showToast("Generate failed: " + err.message, "error");
    } finally {
      setGenerating(false);
    }
  };

  // Relevant Master Stores for Store Mapping Modal
  const relevantStores = React.useMemo(() => {
    if (!mapStoreTarget) return [];
    const cleanTargetBuyer = (mapStoreTarget.buyer_name || "").toLowerCase().trim();

    // Filter stores that match this buyer name or retailer id
    const matching = storesList.filter((s) => {
      const rName = String(s.retailer_name || s.retailer || "").toLowerCase().trim();
      const rId = String(s.retailers_id || s.retailer_id || "").toLowerCase().trim();
      return rName === cleanTargetBuyer || rName.includes(cleanTargetBuyer) || cleanTargetBuyer.includes(rName);
    });

    const list = matching.length > 0 ? matching : storesList;

    return list.map((s) => {
      const code = s.store_number || s.store_code || s.code || s.id;
      const name = s.display_name || s.store_name || s.name || "";
      const ret = s.retailer_name ? ` [${s.retailer_name}]` : "";
      return {
        label: `${code} — ${name}${ret}`,
        value: String(s.id),
        store: s
      };
    });
  }, [storesList, mapStoreTarget]);

  // -------------------------------------------------------------
  // SKU Mapping Functionality (Edit Pen ✏️)
  // -------------------------------------------------------------
  const handleOpenMapSku = (rec: any) => {
    const rawDesc = rec.raw_product_description || rec.product_name || "";
    setMapSkuTarget({
      buyer_name: rec.buyer_name || "",
      raw_product_description: rawDesc,
      current_sku: rec.product_sku || "",
      current_product_name: rec.product_name || "",
      current_brand: rec.brand || ""
    });

    // Try finding matched product in productsList
    const matchedProd = productsList.find(
      (p) => (p.product_sku && p.product_sku === rec.product_sku) ||
             (p.sku && p.sku === rec.product_sku) ||
             (p.product_name && p.product_name.toLowerCase() === rawDesc.toLowerCase()) ||
             (p.display_name && p.display_name.toLowerCase() === rawDesc.toLowerCase())
    );

    if (matchedProd) {
      setSelectedStandardSku(matchedProd.product_sku || matchedProd.sku || "");
      setCustomMappedName(matchedProd.product_name || matchedProd.display_name || rawDesc);
      setCustomMappedBrand(matchedProd.brand || "BIBIK EXPRESS");
    } else {
      setSelectedStandardSku(rec.product_sku && rec.product_sku !== rawDesc ? rec.product_sku : "");
      setCustomMappedName(rec.product_name || rawDesc);
      setCustomMappedBrand(rec.brand || "BIBIK EXPRESS");
    }

    setShowMapSkuModal(true);
  };

  const handleSaveSkuMap = async () => {
    if (!mapSkuTarget || !selectedStandardSku) {
      showToast("Please select a standard master SKU", "error");
      return;
    }

    setSavingSkuMap(true);
    try {
      const matchedProd = productsList.find((p) => (p.product_sku || p.sku) === selectedStandardSku);
      const standardName = customMappedName.trim() || (matchedProd ? (matchedProd.product_name || matchedProd.display_name) : selectedStandardSku);
      const standardBrand = customMappedBrand.trim() || (matchedProd ? (matchedProd.brand || "BIBIK EXPRESS") : "BIBIK EXPRESS");

      const res = await fetch(`${API_BASE}/api/sellout/map-sku`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod,
          buyer_name: mapSkuTarget.buyer_name,
          raw_product_name: mapSkuTarget.raw_product_description,
          standard_sku: selectedStandardSku,
          product_name: standardName,
          brand: standardBrand
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Mapped SKU to all matching rows!`, "success");
        setShowMapSkuModal(false);
        setMapSkuTarget(null);
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Failed to save SKU mapping", "error");
      }
    } catch (err: any) {
      showToast("SKU map error: " + err.message, "error");
    } finally {
      setSavingSkuMap(false);
    }
  };

  // -------------------------------------------------------------
  // Store Mapping & Registration Functionality
  // -------------------------------------------------------------
  const handleOpenMapStore = (rec: any) => {
    const rawCode = rec.outlet_code || "";
    const rawName = rec.outlet_name || rec.store_name || "";
    setMapStoreTarget({
      buyer_name: rec.buyer_name || "",
      raw_outlet_code: rawCode,
      raw_outlet_name: rawName,
      current_store_id: rec.store_id || ""
    });

    // Try finding matching store in storesList
    const matched = storesList.find((s) => {
      const code = String(s.store_number || s.store_code || s.code || s.id || "").toLowerCase().trim();
      const dName = String(s.display_name || s.store_name || "").toLowerCase().trim();
      return (s.id && s.id === rec.store_id) ||
             (rawCode && (code === rawCode.toLowerCase() || dName.startsWith(rawCode.toLowerCase() + " "))) ||
             (rawName && dName === rawName.toLowerCase());
    });

    if (matched) {
      setSelectedMasterStoreId(String(matched.id));
    } else {
      setSelectedMasterStoreId("");
    }

    setStoreModalMode("map");
    setNewStoreName(rawName);
    setNewStoreAddress(rawName);
    setNewStorePostal("");
    setShowMapStoreModal(true);
  };

  const handleSaveMapStore = async () => {
    if (!mapStoreTarget || !selectedMasterStoreId) {
      showToast("Please select a Master Store from the list", "error");
      return;
    }

    const chosen = storesList.find((s) => String(s.id) === selectedMasterStoreId);
    const targetStoreName = chosen ? (chosen.display_name || chosen.store_name || chosen.name || mapStoreTarget.raw_outlet_name) : mapStoreTarget.raw_outlet_name;

    setSavingStoreMap(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellout/map-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod,
          buyer_name: mapStoreTarget.buyer_name,
          raw_outlet_code: mapStoreTarget.raw_outlet_code,
          raw_outlet_name: mapStoreTarget.raw_outlet_name,
          target_store_id: selectedMasterStoreId,
          target_store_name: targetStoreName
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Store mapped and rule saved!", "success");
        setShowMapStoreModal(false);
        setMapStoreTarget(null);
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Failed to map store", "error");
      }
    } catch (err: any) {
      showToast("Store mapping error: " + err.message, "error");
    } finally {
      setSavingStoreMap(false);
    }
  };

  const handleSaveRegisterStore = async () => {
    if (!mapStoreTarget || !mapStoreTarget.raw_outlet_code || !newStoreName.trim()) {
      showToast("Store code and official store name are required", "error");
      return;
    }

    setSavingStoreMap(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellout/register-store`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod,
          retailer_name: mapStoreTarget.buyer_name,
          store_code: mapStoreTarget.raw_outlet_code,
          store_name: newStoreName.trim(),
          address: newStoreAddress.trim(),
          postal_code: newStorePostal.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Store registered & mapped successfully!", "success");
        setShowMapStoreModal(false);
        setMapStoreTarget(null);
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Failed to register store", "error");
      }
    } catch (err: any) {
      showToast("Store registration error: " + err.message, "error");
    } finally {
      setSavingStoreMap(false);
    }
  };

  // -------------------------------------------------------------
  // Row Edit Functionality (No Delete)
  // -------------------------------------------------------------
  const handleOpenEditRow = (rec: any) => {
    setEditingRow(rec);
    setEditQty(String(rec.sales_quantity || 0));
    setEditAmount(String(rec.sales_amount || 0));
    setShowEditRowModal(true);
  };

  const handleSaveRowEdit = async () => {
    if (!editingRow) return;
    setSavingRowEdit(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellout/update-row`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRow.id,
          sales_quantity: Number(editQty),
          sales_amount: Number(editAmount)
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Row updated successfully!", "success");
        setShowEditRowModal(false);
        setEditingRow(null);
        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast(data.error || "Failed to update row", "error");
      }
    } catch (err: any) {
      showToast("Edit error: " + err.message, "error");
    } finally {
      setSavingRowEdit(false);
    }
  };

  // -------------------------------------------------------------
  // Publish Month Action
  // -------------------------------------------------------------
  const handlePublishMonth = async () => {
    if (records.length === 0) {
      showToast("No records to publish for " + currentPeriod, "error");
      return;
    }

    if (kpis.diagnosticsCount > 0) {
      setConfirmConfig({
        open: true,
        title: "⚠️ Unresolved Diagnostics Found",
        description: `There are ${kpis.diagnosticsCount} records with unregistered stores or unmapped SKUs. Do you still want to publish this month?`,
        onConfirm: async () => {
          proceedPublish();
        }
      });
      return;
    }

    proceedPublish();
  };

  const proceedPublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellout/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod,
          user: profile?.full_name || profile?.email || "Admin"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Sell-Out batch published successfully!", "success");
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Failed to publish batch", "error");
      }
    } catch (err: any) {
      showToast("Publish failed: " + err.message, "error");
    } finally {
      setPublishing(false);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      showToast("No records to export", "error");
      return;
    }

    const exportData = filteredRecords.map((r, idx) => ({
      "#": idx + 1,
      "Period": r.period || currentPeriod,
      "Retailer": r.buyer_name || "",
      "Store Code": r.outlet_code || "",
      "Store Name": r.store_name || r.outlet_name || "",
      "Store Status": r.store_status || "unregistered",
      "Brand": r.brand || "",
      "Product Name": r.product_name || r.raw_product_description || "",
      "Standard SKU": r.product_sku || "",
      "Qty Sold": Number(r.sales_quantity || 0),
      "Sales Amount ($)": Number(r.sales_amount || 0),
      "Diagnostic Status": r.validation_status === "valid" ? "Valid" : "Needs Review",
      "Source File": r.source_file_name || ""
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SellOut_Records");
    XLSX.writeFile(wb, `SellOut_${currentPeriod}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Exported Excel file successfully!", "success");
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary select-none animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. DYNAMIC TOP HEADER BAR (Contextual to Sell-Out)                        */}
      {/* ========================================================================= */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-zinc-900">Sell-Out Demand</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium tracking-wide bg-slate-100 text-zinc-600 border border-slate-200">
              {batchData?.status === "published" ? "Published" : "Draft Inflow"}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pure sales demand for stock, marketing, and manpower planning.
          </p>
        </div>

        {/* Action Controls: Clean Monochromatic Summary Pills + Month Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Gross Sales Pill */}
          <div className="h-7 flex items-center gap-1 px-2 rounded-md bg-[#F8F9FA] border border-slate-200 text-[11px]">
            <span className="text-zinc-500 font-normal">Demand:</span>
            <span className="font-medium text-zinc-800">
              ${kpis.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-400 font-normal">({kpis.totalQty.toLocaleString()} pcs)</span>
          </div>

          {/* Active Stores Pill */}
          <div className="h-7 flex items-center gap-1 px-2 rounded-md bg-[#F8F9FA] border border-slate-200 text-[11px]">
            <span className="text-zinc-500 font-normal">Stores:</span>
            <span className="font-medium text-zinc-700">{kpis.storeCount}</span>
          </div>

          {/* Diagnostics Alert / Validation Status Pill */}
          {kpis.diagnosticsCount > 0 ? (
            <button
              type="button"
              onClick={() => setSubFilterTab("diagnostics")}
              className="h-7 px-2 rounded-md bg-slate-50 hover:bg-slate-100 text-zinc-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
            >
              <AlertTriangle size={11} className="text-amber-600 shrink-0" />
              <span>{kpis.diagnosticsCount} Diagnostics</span>
            </button>
          ) : (
            <div className="h-7 flex items-center gap-1 text-zinc-600 text-[11px] font-medium px-2 rounded-md bg-slate-50 border border-slate-200">
              <CheckCircle2 size={11} className="shrink-0 text-emerald-600" />
              <span>Validated</span>
            </div>
          )}

          {/* Month Selector Capsule with Fixed Width */}
          <div className="h-7 w-[160px] flex items-center justify-between px-1.5 rounded-md bg-[#F8F9FA] border border-slate-200 hover:bg-slate-100 transition-all">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={loading}
              className="w-4.5 h-4.5 shrink-0 rounded flex items-center justify-center text-zinc-500 hover:text-[#0B57D0] hover:bg-white transition-all cursor-pointer disabled:opacity-40 text-xs font-medium"
              title="Previous Month"
            >
              ‹
            </button>
            <label className="relative flex-1 flex items-center justify-center gap-1 px-1 cursor-pointer overflow-hidden">
              <Calendar size={11} className="text-[#0B57D0] shrink-0" />
              <span className="text-[11px] font-medium text-zinc-800 tracking-tight whitespace-nowrap truncate text-center">
                {formatPeriodLabel(currentPeriod)}
              </span>
              <input
                type="month"
                value={currentPeriod}
                onChange={(e) => e.target.value && setCurrentPeriod(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </label>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={loading}
              className="w-4.5 h-4.5 shrink-0 rounded flex items-center justify-center text-zinc-500 hover:text-[#0B57D0] hover:bg-white transition-all cursor-pointer disabled:opacity-40 text-xs font-medium"
              title="Next Month"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB 1: SELL-OUT DEMAND MASTER VIEW                                     */}
      {/* ========================================================================= */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Filter & Action Toolbar */}
        <div className="px-4 py-2 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left Sub-filters & Custom Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
            {/* Sub-filter tabs */}
            <div className="flex items-center p-0.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setSubFilterTab("all")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  subFilterTab === "all" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                All ({records.length})
              </button>
              <button
                type="button"
                onClick={() => setSubFilterTab("so")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  subFilterTab === "so" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Demand Inflow
              </button>
              <button
                type="button"
                onClick={() => setSubFilterTab("diagnostics")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  subFilterTab === "diagnostics" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <span>Diagnostics</span>
                {kpis.diagnosticsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-medium flex items-center justify-center">
                    {kpis.diagnosticsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-[220px] flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search store, code, SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-8 pl-8 pr-2.5 bg-white border border-slate-200 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#0B57D0]"
              />
            </div>

            {/* Custom Retailer Filter Dropdown */}
            <CustomSelect
              value={buyerFilter}
              onChange={setBuyerFilter}
              options={buyerFilterOptions}
              placeholder="All Retailers"
              minWidth="min-w-[130px]"
            />

            {/* Custom Brand Filter Dropdown */}
            <CustomSelect
              value={brandFilter}
              onChange={setBrandFilter}
              options={brandFilterOptions}
              placeholder="All Brands"
              minWidth="min-w-[120px]"
            />
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Reset Month Button */}
            {records.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setResetBuyer(availableBuyers[0]?.value || "");
                  setResetConfirmText("");
                  setShowResetModal(true);
                }}
                className="h-8 px-2.5 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title={`Reset and clear data for ${currentPeriod}`}
              >
                <Trash2 size={13} className="text-red-500" />
                <span>Reset Month</span>
              </button>
            )}

            {/* Generate from Sell-In Button */}
            <button
              type="button"
              onClick={() => {
                setSelectedSellInBuyers(availableSellInBuyers.map((b) => b.value));
                setShowGenerateModal(true);
              }}
              className="h-8 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0B57D0] border border-blue-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Auto-mirror 100% Sell-Out from Sell-In for buyers without scanner reports"
            >
              <Zap size={13} className="text-[#0B57D0]" />
              <span>Generate from Sell-In</span>
            </button>

            {/* Upload Excel Button */}
            <button
              type="button"
              onClick={() => {
                setImportBuyer(availableBuyers[0]?.value || "");
                setCustomBuyerName("");
                setParsedRows([]);
                setImportFile(null);
                setImportFileName("");
                setShowImportModal(true);
              }}
              className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet size={13} className="text-zinc-500" />
              <span>Import Excel</span>
            </button>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="h-8 px-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Export current Sell-Out rows to Excel"
            >
              <Download size={13} className="text-zinc-500" />
            </button>

            {/* Publish Snapshot Button */}
            <button
              type="button"
              onClick={handlePublishMonth}
              disabled={publishing || records.length === 0}
              className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98 disabled:opacity-50"
            >
              <Sparkles size={13} className="text-blue-100" />
              <span>Publish</span>
            </button>
          </div>
        </div>

        {/* Table Viewport Area */}
        <div className="flex-1 min-h-0 overflow-auto bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#0B57D0] animate-spin" />
              <span className="text-xs text-zinc-500 font-medium">Loading Sell-Out records...</span>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center p-6">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-zinc-400">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-800">No Sell-Out Records for {currentPeriod}</h3>
                <p className="text-xs text-zinc-500 mt-0.5 max-w-sm leading-relaxed">
                  Upload your cleaned retailer sales spreadsheet to load this month&apos;s demand.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportBuyer(availableBuyers[0]?.value || "");
                    setCustomBuyerName("");
                    setParsedRows([]);
                    setImportFile(null);
                    setImportFileName("");
                    setShowImportModal(true);
                  }}
                  className="h-8 px-3 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={12} className="text-blue-100" />
                  <span>Upload Retailer Excel</span>
                </button>
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
                <tr className="text-[11px] font-medium text-zinc-500">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 w-24">Import</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Buyer</th>
                  <th className="py-2.5 px-3 min-w-[120px]">Store Code</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Store Name</th>
                  <th className="py-2.5 px-3 min-w-[110px]">Brand</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Product Name / SKU</th>
                  <th className="py-2.5 px-3 w-24 text-right">Qty Sold</th>
                  <th className="py-2.5 px-3 w-28 text-right">Sales ($)</th>
                  <th className="py-2.5 px-3 min-w-[160px] text-center">Diagnostic Status</th>
                  <th className="py-2.5 px-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r, idx) => {
                  const isUnregistered = r.store_status !== "registered";
                  const isUnmappedSku = r.sku_status !== "mapped";
                  const isValid = !isUnregistered && !isUnmappedSku;

                  return (
                    <tr 
                      key={r.id || idx} 
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Index */}
                      <td className="py-2 px-3 text-center text-zinc-400 text-[11px] font-mono">
                        {idx + 1}
                      </td>

                      {/* Import Source File */}
                      <td className="py-2 px-3">
                        {r.source_file_url ? (
                          <a
                            href={r.source_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0B57D0] hover:underline flex items-center gap-1 truncate text-[10.5px] font-mono"
                            title={r.source_file_name || "Source File"}
                          >
                            <FileText size={11} className="shrink-0" />
                            <span className="truncate">{r.source_file_name || "File"}</span>
                          </a>
                        ) : (
                          <span className="text-zinc-400 text-[10.5px] font-mono truncate flex items-center gap-1">
                            <FileText size={11} className="shrink-0 text-slate-300" />
                            <span className="truncate">{r.source_file_name || "Excel"}</span>
                          </span>
                        )}
                      </td>

                      {/* Buyer Name & Channel */}
                      <td className="py-2 px-3">
                        <div className="flex flex-col min-w-0">
                          <span className="text-zinc-800 font-medium truncate max-w-[160px]" title={r.buyer_name || "—"}>
                            {r.buyer_name ? (r.buyer_name.length > 20 ? `${r.buyer_name.slice(0, 20)}...` : r.buyer_name) : "—"}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[160px]">
                            {buyerChannelMap.get((r.buyer_name || "").toLowerCase().trim()) || r.channel || "Retailer"}
                          </span>
                        </div>
                      </td>

                      {/* Store Code (RED if not registered) */}
                      <td className="py-2 px-3">
                        {isUnregistered ? (
                          <button
                            type="button"
                            onClick={() => handleOpenMapStore(r)}
                            className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer inline-flex items-center gap-1 group"
                            title="Store not registered in Store Master. Click to map or register."
                          >
                            <AlertTriangle size={10} className="text-red-600 shrink-0" />
                            <span>{r.outlet_code || "Unknown"}</span>
                          </button>
                        ) : (
                          <span className="font-mono text-zinc-700 font-medium text-[11px]">{r.outlet_code || "—"}</span>
                        )}
                      </td>

                      {/* Store Name with Inline Pen ✏️ */}
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-between gap-1 group">
                          <div className="flex flex-col min-w-0">
                            <span className="text-zinc-800 font-medium truncate" title={r.store_name || r.outlet_name}>
                              {r.store_name || r.outlet_name || "—"}
                            </span>
                            {isUnregistered ? (
                              <span className="text-[10px] text-red-500">Unregistered in Master</span>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-mono truncate">{r.store_id || "Registered"}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenMapStore(r)}
                            className="p-1 rounded text-zinc-400 hover:text-[#0B57D0] hover:bg-blue-50 transition-colors shrink-0"
                            title="Click to map or register store"
                          >
                            <Edit2 size={11} />
                          </button>
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="py-2 px-3 text-zinc-600">
                        {r.brand || "Unassigned"}
                      </td>

                      {/* Product Name / SKU with Inline Pen ✏️ */}
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-between gap-1 group">
                          <div className="flex flex-col min-w-0">
                            <span className="text-zinc-800 truncate" title={r.product_name || r.raw_product_description}>
                              {r.product_name || r.raw_product_description || "—"}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">{r.product_sku ? `SKU: ${r.product_sku}` : "Unmapped SKU"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenMapSku(r)}
                            className="p-1 rounded text-zinc-400 hover:text-[#0B57D0] hover:bg-blue-50 transition-colors shrink-0"
                            title="Click to map standard SKU & brand"
                          >
                            <Edit2 size={11} />
                          </button>
                        </div>
                      </td>

                      {/* Quantity Sold */}
                      <td className="py-2 px-3 text-right text-zinc-800 font-mono font-medium">
                        {Number(r.sales_quantity || 0).toLocaleString()}
                      </td>

                      {/* Total Sales Amount ($) */}
                      <td className="py-2 px-3 text-right text-zinc-800 font-mono font-medium">
                        ${Number(r.sales_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Diagnostic Status */}
                      <td className="py-2 px-3 text-center">
                        {isUnregistered ? (
                          <button
                            type="button"
                            onClick={() => handleOpenMapStore(r)}
                            className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-zinc-700 text-[10.5px] font-medium border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                          >
                            <AlertTriangle size={11} className="text-amber-600" />
                            <span>Map Store</span>
                          </button>
                        ) : isUnmappedSku ? (
                          <button
                            type="button"
                            onClick={() => handleOpenMapSku(r)}
                            className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-zinc-700 text-[10.5px] font-medium border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                          >
                            <Plus size={11} className="text-zinc-500" />
                            <span>Map SKU</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-zinc-500 text-[10.5px]">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            <span>Valid</span>
                          </span>
                        )}
                      </td>

                      {/* Edit Row Action */}
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRow(r)}
                          className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit row details"
                        >
                          <Edit2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. MODAL: IMPORT EXCEL WITH TEMPLATE MAPPING & PREVIEW    */}
      {/* ========================================================= */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Import Monthly Sell-Out Data</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Target Period: <span className="font-semibold text-zinc-800">{formatPeriodLabel(currentPeriod)}</span>
                  {loadedTemplateId && <span className="ml-2 text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded text-[10.5px]">✓ Template Loaded</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeImportStep === "preview" && (
                  <button
                    type="button"
                    onClick={() => setActiveImportStep("template")}
                    className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 text-zinc-700 rounded text-xs font-medium transition-colors"
                  >
                    ← Edit Rules
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 min-h-0 overflow-y-auto space-y-4 text-xs">
              {/* Step 1: Buyer & File Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative z-30">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    1. Select Buyer / Retailer <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={importBuyer}
                    onChange={(val) => handleBuyerSelectionChange(val)}
                    options={[
                      ...availableBuyers.map((b) => ({ label: b.label, value: b.value })),
                      { label: "+ Enter New Retailer Name", value: "__custom__" }
                    ]}
                    placeholder="Choose Retailer from BuyerDB..."
                    className="w-full"
                  />
                  {importBuyer === "__custom__" && (
                    <input
                      type="text"
                      placeholder="Type Retailer Name (e.g. FairPrice, Sheng Siong, Cold Storage)..."
                      value={customBuyerName}
                      onChange={(e) => setCustomBuyerName(e.target.value)}
                      className="mt-2 w-full h-8 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    2. Select Excel File (Sheet 1) <span className="text-red-500">*</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-200 rounded-lg p-2.5 text-center hover:bg-slate-50/50 transition-colors relative">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex items-center justify-center gap-2 text-zinc-500 pointer-events-none">
                      <FileSpreadsheet size={20} className="text-[#0B57D0] shrink-0" />
                      {importFileName ? (
                        <span className="font-semibold text-zinc-800 text-xs truncate max-w-[240px]">{importFileName}</span>
                      ) : (
                        <span className="font-medium text-xs">Click or drag & drop Excel file here</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Visual Excel Grid Mapping Selector (When file is uploaded & in template step) */}
              {activeImportStep === "template" && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900">Interactive Visual Excel Mapping</h3>
                      <p className="text-[11px] text-zinc-500">
                        Select a target button below, then click or drag directly on the spreadsheet cells to map.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate || !importBuyer}
                      className="h-7 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-zinc-700 rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      {savingTemplate ? <RefreshCw size={12} className="animate-spin" /> : <Tag size={12} className="text-blue-600" />}
                      <span>Save Template</span>
                    </button>
                  </div>

                  {/* Mapping Target Control Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {/* SKU Target */}
                    <div 
                      onClick={() => {
                        if (templateSkuMultiple) setActiveTarget("sku");
                      }}
                      className={`p-2.5 rounded-lg border transition-all relative group ${
                        activeTarget === "sku" && templateSkuMultiple
                          ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11.5px] text-blue-900 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                          1. SKU / Product
                        </span>
                        <div className="flex items-center gap-1.5">
                          <label 
                            onClick={(e) => e.stopPropagation()} 
                            className="flex items-center gap-1 text-[10.5px] text-zinc-600 cursor-pointer font-normal"
                          >
                            <input
                              type="checkbox"
                              checked={templateSkuMultiple}
                              onChange={(e) => {
                                const isMulti = e.target.checked;
                                setTemplateSkuMultiple(isMulti);
                                if (isMulti) {
                                  setActiveTarget("sku");
                                } else {
                                  if (activeTarget === "sku") setActiveTarget("store");
                                }
                              }}
                              className="rounded text-[#0B57D0] focus:ring-0 cursor-pointer w-3 h-3"
                            />
                            <span>Multi-SKU</span>
                          </label>
                          {(skuRange || templateSkuRule || templateSingleSku) && (
                            <button
                              type="button"
                              title="Reset SKU mapping"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSkuRange(null);
                                setTemplateSkuRule("");
                                setTemplateSingleSku("");
                              }}
                              className="p-0.5 text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 rounded transition-colors"
                            >
                              <RotateCcw size={11} />
                            </button>
                          )}
                        </div>
                      </div>

                      {templateSkuMultiple ? (
                        <>
                          <div className="font-mono text-xs font-semibold text-blue-700 truncate">
                            {formatCellRange(skuRange)}
                          </div>
                          <textarea
                            rows={2}
                            placeholder="Note / prompt rule for SKU (optional)..."
                            value={templateSkuRule}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setTemplateSkuRule(e.target.value)}
                            className="mt-1.5 w-full p-1.5 bg-white/95 border border-slate-200 rounded text-[11px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 resize-none leading-tight"
                          />
                        </>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-[10px] text-zinc-500 font-medium">Select / Type Product SKU:</div>
                          <SkuAutocompleteInput
                            value={templateSingleSku}
                            onChange={(val) => setTemplateSingleSku(val)}
                            productsList={productsList}
                            placeholder="Type or select SKU (e.g. CHM)..."
                          />
                        </div>
                      )}
                    </div>

                    {/* Store Target */}
                    <div 
                      onClick={() => setActiveTarget("store")}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all relative group ${
                        activeTarget === "store" 
                          ? "bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11.5px] text-amber-900 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          2. Store / Outlet
                        </span>
                        <div className="flex items-center gap-1">
                          {storeRange && (
                            <span className="text-[10px] text-amber-700 bg-amber-100/70 px-1 rounded">Mapped</span>
                          )}
                          {(storeRange || templateStoreRule) && (
                            <button
                              type="button"
                              title="Reset Store mapping"
                              onClick={(e) => {
                                e.stopPropagation();
                                setStoreRange(null);
                                setTemplateStoreRule("");
                              }}
                              className="p-0.5 text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <RotateCcw size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="font-mono text-xs font-semibold text-amber-700 truncate">
                        {formatCellRange(storeRange)}
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Note / prompt rule for Store (optional)..."
                        value={templateStoreRule}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setTemplateStoreRule(e.target.value)}
                        className="mt-1.5 w-full p-1.5 bg-white/95 border border-slate-200 rounded text-[11px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-amber-500 resize-none leading-tight"
                      />
                    </div>

                    {/* Quantity Target */}
                    <div 
                      onClick={() => setActiveTarget("qty")}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all relative group ${
                        activeTarget === "qty" 
                          ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11.5px] text-emerald-900 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                          3. Quantity Sold
                        </span>
                        <div className="flex items-center gap-1">
                          {qtyRange && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-1 rounded">Mapped</span>
                          )}
                          {(qtyRange || templateQtyRule) && (
                            <button
                              type="button"
                              title="Reset Quantity mapping"
                              onClick={(e) => {
                                e.stopPropagation();
                                setQtyRange(null);
                                setTemplateQtyRule("");
                              }}
                              className="p-0.5 text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <RotateCcw size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="font-mono text-xs font-semibold text-emerald-700 truncate">
                        {formatCellRange(qtyRange)}
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Note / prompt rule for Qty (optional)..."
                        value={templateQtyRule}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setTemplateQtyRule(e.target.value)}
                        className="mt-1.5 w-full p-1.5 bg-white/95 border border-slate-200 rounded text-[11px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 resize-none leading-tight"
                      />
                    </div>

                    {/* Amount Target */}
                    <div 
                      onClick={() => setActiveTarget("amount")}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all relative group ${
                        activeTarget === "amount" 
                          ? "bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 shadow-xs" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[11.5px] text-purple-900 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                          4. Sales Amount ($)
                        </span>
                        <div className="flex items-center gap-1">
                          {amountRange && (
                            <span className="text-[10px] text-purple-700 bg-purple-100/70 px-1 rounded">Mapped</span>
                          )}
                          {(amountRange || templateAmountRule) && (
                            <button
                              type="button"
                              title="Reset Sales Amount mapping"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAmountRange(null);
                                setTemplateAmountRule("");
                              }}
                              className="p-0.5 text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            >
                              <RotateCcw size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="font-mono text-xs font-semibold text-purple-700 truncate">
                        {formatCellRange(amountRange)}
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Note / prompt rule for Amount (optional)..."
                        value={templateAmountRule}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setTemplateAmountRule(e.target.value)}
                        className="mt-1.5 w-full p-1.5 bg-white/95 border border-slate-200 rounded text-[11px] text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-purple-500 resize-none leading-tight"
                      />
                    </div>
                  </div>

                  {/* Additional Guidance prompt (one-liner) */}
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-semibold text-zinc-700 shrink-0">Extra Guidance:</span>
                    <input
                      type="text"
                      placeholder="e.g. Ignore summary rows with grand total, multiply unit price if total omitted..."
                      value={templateAdditionalPrompt}
                      onChange={(e) => setTemplateAdditionalPrompt(e.target.value)}
                      className="flex-1 h-7 px-2.5 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-[#0B57D0]"
                    />
                  </div>

                  {/* VISUAL SPREADSHEET TABLE VIEWER */}
                  {rawSheetGrid.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-zinc-500 gap-2">
                        <span className="font-medium flex items-center gap-1.5">
                          <MousePointerClick size={13} className="text-[#0B57D0]" />
                          <span>
                            Click & drag or <strong>Shift + Click</strong> to map to:{" "}
                            <strong className="text-zinc-900 uppercase">
                              {activeTarget === "sku" ? "1. SKU / Product" : activeTarget === "store" ? "2. Store / Outlet" : activeTarget === "qty" ? "3. Quantity Sold" : "4. Sales Amount"}
                            </strong>
                          </span>
                        </span>
                        <div className="flex items-center gap-3 text-[10.5px]">
                          <span className="text-zinc-400">Tip: Click column letter (e.g. A, B) to select entire column</span>
                          <span className="font-semibold text-zinc-700">Showing {Math.min(rawSheetGrid.length, 100)} rows</span>
                        </div>
                      </div>

                      <div 
                        className="border border-slate-300 rounded-lg overflow-x-auto overflow-y-auto max-h-[320px] bg-slate-100 select-none shadow-inner"
                        onMouseUp={handleCellMouseUp}
                      >
                        <table className="border-collapse text-[11.5px] font-mono bg-white w-full">
                          <thead>
                            <tr className="sticky top-0 bg-slate-200 text-zinc-700 font-bold border-b border-slate-300 z-10">
                              <th className="py-1 px-2 text-center bg-slate-300 border-r border-slate-300 w-12 text-[10.5px]">
                                #
                              </th>
                              {Array.from({ length: sheetColumnCount }).map((_, cIdx) => (
                                <th 
                                  key={cIdx} 
                                  onClick={() => handleColumnHeaderClick(cIdx)}
                                  className="py-1 px-2 text-center border-r border-slate-300 min-w-[100px] text-[11px] cursor-pointer hover:bg-slate-300 transition-colors group select-none"
                                  title={`Click to select entire column ${getColumnName(cIdx)} (from row 2 down)`}
                                >
                                  <span className="group-hover:text-[#0B57D0]">{getColumnName(cIdx)}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rawSheetGrid.slice(0, 100).map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-slate-200 hover:bg-slate-50/50">
                                {/* Row Number Index */}
                                <td className="py-1 px-2 text-center bg-slate-100 text-zinc-500 font-bold border-r border-slate-300 text-[10.5px] sticky left-0 z-5">
                                  {rIdx + 1}
                                </td>

                                {/* Cells */}
                                {Array.from({ length: sheetColumnCount }).map((_, cIdx) => {
                                  const cellVal = String(row[cIdx] !== null && row[cIdx] !== undefined ? row[cIdx] : "").trim();
                                  
                                  // Highlight Calculation
                                  const inSku = skuRange && rIdx >= skuRange.minR && rIdx <= skuRange.maxR && cIdx >= skuRange.minC && cIdx <= skuRange.maxC;
                                  const inStore = storeRange && rIdx >= storeRange.minR && rIdx <= storeRange.maxR && cIdx >= storeRange.minC && cIdx <= storeRange.maxC;
                                  const inQty = qtyRange && rIdx >= qtyRange.minR && rIdx <= qtyRange.maxR && cIdx >= qtyRange.minC && cIdx <= qtyRange.maxC;
                                  const inAmount = amountRange && rIdx >= amountRange.minR && rIdx <= amountRange.maxR && cIdx >= amountRange.minC && cIdx <= amountRange.maxC;

                                  // Active dragging highlight
                                  const isDragging = isSelectingGrid && selectionStart && selectionEnd &&
                                    rIdx >= Math.min(selectionStart.r, selectionEnd.r) &&
                                    rIdx <= Math.max(selectionStart.r, selectionEnd.r) &&
                                    cIdx >= Math.min(selectionStart.c, selectionEnd.c) &&
                                    cIdx <= Math.max(selectionStart.c, selectionEnd.c);

                                  let cellClass = "bg-white text-zinc-800";
                                  if (isDragging) {
                                    cellClass = activeTarget === "sku" ? "bg-blue-200 text-blue-900 ring-1 ring-blue-500" :
                                                activeTarget === "store" ? "bg-amber-200 text-amber-900 ring-1 ring-amber-500" :
                                                activeTarget === "qty" ? "bg-emerald-200 text-emerald-900 ring-1 ring-emerald-500" :
                                                "bg-purple-200 text-purple-900 ring-1 ring-purple-500";
                                  } else if (inSku) {
                                    cellClass = "bg-blue-100 text-blue-900 font-semibold border-blue-300";
                                  } else if (inStore) {
                                    cellClass = "bg-amber-100 text-amber-900 font-semibold border-amber-300";
                                  } else if (inQty) {
                                    cellClass = "bg-emerald-100 text-emerald-900 font-semibold border-emerald-300";
                                  } else if (inAmount) {
                                    cellClass = "bg-purple-100 text-purple-900 font-semibold border-purple-300";
                                  }

                                  return (
                                    <td
                                      key={cIdx}
                                      onMouseDown={(e) => handleCellMouseDown(rIdx, cIdx, e)}
                                      onMouseEnter={() => handleCellMouseEnter(rIdx, cIdx)}
                                      className={`py-1 px-2 border-r border-slate-200 truncate max-w-[180px] cursor-crosshair transition-colors ${cellClass}`}
                                      title={`Cell ${getColumnName(cIdx)}${rIdx + 1}: ${cellVal}`}
                                    >
                                      {cellVal || <span className="text-zinc-300 italic">-</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-lg text-center text-zinc-400 text-xs">
                      Please upload an Excel file above to preview spreadsheet grid and select mapping areas.
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Line-by-Line Preview Verification Table */}
              {activeImportStep === "preview" && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  {importReconciliation && (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-blue-900 flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-[#0B57D0]" />
                          <span>Fetched {parsedRows.length} Line Items</span>
                        </div>
                        <p className="text-[11px] text-blue-700 mt-0.5">Please review line by line before confirming import into database.</p>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="text-[10.5px] text-blue-600 uppercase font-semibold">Total Quantity</div>
                          <div className="font-bold text-blue-950 font-mono text-sm">{importReconciliation.totalQty.toLocaleString()} units</div>
                        </div>
                        <div>
                          <div className="text-[10.5px] text-blue-600 uppercase font-semibold">Total Amount</div>
                          <div className="font-bold text-blue-950 font-mono text-sm">
                            ${importReconciliation.totalAmt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-100 text-zinc-700 font-semibold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3">Store / Outlet Code</th>
                          <th className="py-2 px-3">Store Name</th>
                          <th className="py-2 px-3">Product Description / SKU</th>
                          <th className="py-2 px-3 text-right">Qty Sold</th>
                          <th className="py-2 px-3 text-right">Sales Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white font-mono text-[11.5px]">
                        {parsedRows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-1.5 px-3 text-center text-zinc-400 font-sans">{idx + 1}</td>
                            <td className="py-1.5 px-3 text-zinc-900 font-semibold">{r.outlet_code || "-"}</td>
                            <td className="py-1.5 px-3 text-zinc-700 font-sans truncate max-w-[160px]">{r.outlet_name || "-"}</td>
                            <td className="py-1.5 px-3 text-zinc-800 font-sans">
                              <div className="truncate max-w-[260px] font-medium">{r.raw_product_description || r.product_name}</div>
                              {r.product_sku && <div className="text-[10px] text-zinc-400 font-mono">{r.product_sku}</div>}
                            </td>
                            <td className="py-1.5 px-3 text-right text-zinc-900 font-bold">{Number(r.sales_quantity || 0).toLocaleString()}</td>
                            <td className="py-1.5 px-3 text-right text-zinc-900">
                              ${Number(r.sales_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div>
                {activeImportStep === "template" && (
                  <span className="text-[11px] text-zinc-500">Click Fetch Data to parse and verify the report before importing.</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-zinc-700 hover:bg-zinc-100 font-medium text-xs transition-colors"
                >
                  Cancel
                </button>

                {activeImportStep === "template" ? (
                  <button
                    type="button"
                    onClick={handleFetchPreview}
                    disabled={fetchingPreview || !importBuyer || rawSheetGrid.length === 0}
                    className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    {fetchingPreview ? <RefreshCw size={13} className="animate-spin" /> : <FileText size={13} />}
                    <span>{fetchingPreview ? "Extracting Data..." : "Fetch Data"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={importing || parsedRows.length === 0}
                    className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    {importing ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                    <span>{importing ? "Ingesting..." : "Confirm & Import"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MODAL: RESET BUYER SALES WITH TYPED CONFIRMATION       */}
      {/* ========================================================= */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-visible animate-in fade-in zoom-in-95 duration-100">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-red-50/50 shrink-0 rounded-t-xl">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle size={16} />
                <h2 className="text-sm font-bold">Reset Buyer Sell-Out Records</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs overflow-visible">
              <p className="text-zinc-600">
                Select the specific buyer you want to reset for <span className="font-bold text-zinc-900">{formatPeriodLabel(currentPeriod)}</span>.
              </p>

              <div className="relative z-30">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Select Retailer / Buyer to Reset
                </label>
                <CustomSelect
                  value={resetBuyer}
                  onChange={(val) => setResetBuyer(val)}
                  options={existingDataBuyers.map((b) => ({ label: b.label, value: b.value }))}
                  placeholder={existingDataBuyers.length === 0 ? "No buyers with data in this period" : "Select Buyer with data..."}
                  className="w-full"
                />
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 space-y-1">
                <p className="font-bold">⚠️ Warning: Irreversible Action</p>
                <p className="text-[11px]">
                  All sell-out records for <span className="font-semibold">{resetBuyer || "the selected buyer"}</span> in {currentPeriod} will be permanently removed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  To confirm, type <span className="font-mono font-bold text-red-600 select-all">reset_sales_{currentPeriod}</span> below:
                </label>
                <input
                  type="text"
                  placeholder={`reset_sales_${currentPeriod}`}
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  className="w-full h-8 px-3 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 rounded-b-xl">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 text-zinc-700 hover:bg-zinc-100 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetting || !resetConfirmText.toLowerCase().includes("reset")}
                className="h-8 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {resetting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{resetting ? "Resetting..." : "Confirm & Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4B. MODAL: AUTO-GENERATE 100% SELL-OUT FOR NON-SCAN BUYERS */}
      {/* ========================================================= */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-blue-50/50 shrink-0">
              <div className="flex items-center gap-2 text-[#0B57D0]">
                <Zap size={16} />
                <h2 className="text-sm font-bold">Auto-Generate 100% Sell-Out</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg text-zinc-700 space-y-1">
                <p className="font-semibold text-zinc-900">
                  Target Period: <span className="text-[#0B57D0]">{formatPeriodLabel(currentPeriod)}</span>
                </p>
                <p className="text-[11px] text-zinc-600">
                  This generates 100% deemed sell-out records directly from this month&apos;s Sell-In deliveries.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-zinc-800">
                    Select Buyer(s) to Mirror from Sell-In:
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedSellInBuyers(availableSellInBuyers.map((b) => b.value))}
                      className="text-[#0B57D0] hover:underline font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedSellInBuyers([])}
                      className="text-zinc-500 hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {availableSellInBuyers.length === 0 ? (
                    <div className="p-4 text-center text-zinc-400 text-xs">
                      No Sell-In records found for {formatPeriodLabel(currentPeriod)}.
                    </div>
                  ) : (
                    availableSellInBuyers.map((b) => {
                      const isSelected = selectedSellInBuyers.includes(b.value);
                      return (
                        <label
                          key={b.value}
                          className="flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSellInBuyers((prev) => [...prev, b.value]);
                                } else {
                                  setSelectedSellInBuyers((prev) => prev.filter((name) => name !== b.value));
                                }
                              }}
                              className="rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0] w-3.5 h-3.5"
                            />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-medium text-zinc-800 truncate">{b.value}</span>
                                {!b.is_registered && (
                                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    Unregistered
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
                                <span>{b.channel}</span>
                                {b.total_qty > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-zinc-600 font-medium">{b.total_qty.toLocaleString()} pcs Sell-In</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#0B57D0] shrink-0 border border-blue-200">
                              Selected
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-zinc-500 font-medium">
                {selectedSellInBuyers.length} buyer(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-zinc-700 hover:bg-zinc-100 font-medium text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmGenerate}
                  disabled={generating || selectedSellInBuyers.length === 0}
                  className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {generating ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                  <span>{generating ? "Generating..." : "Generate 100% Sell-Out"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MODAL: MAP TO MASTER SKU (PEN ✏️)                       */}
      {/* ========================================================= */}
      {showMapSkuModal && mapSkuTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-visible animate-in fade-in zoom-in-95 duration-100">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 rounded-t-xl bg-white">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Map Product to Master SKU & Brand</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Retailer: {mapSkuTarget.buyer_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapSkuModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs overflow-visible">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-[11px] text-zinc-500">Raw Description from Excel:</p>
                <p className="font-semibold text-zinc-900 mt-0.5">{mapSkuTarget.raw_product_description}</p>
              </div>

              <div className="relative z-30">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Select Master Product SKU <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={selectedStandardSku}
                  onChange={(val) => {
                    setSelectedStandardSku(val);
                    const p = productsList.find((item) => (item.product_sku || item.sku) === val);
                    if (p) {
                      setCustomMappedName(p.product_name || p.display_name || val);
                      let b = p.brand || "BIBIK EXPRESS";
                      if (b.toUpperCase().startsWith("BRAND")) b = "BIBIK EXPRESS";
                      setCustomMappedBrand(b);
                    }
                  }}
                  options={productsList.map((p) => {
                    const sku = p.product_sku || p.sku || "";
                    const name = p.product_name || p.display_name || "";
                    return {
                      label: `${sku} — ${name}`,
                      value: sku
                    };
                  })}
                  placeholder="Select standard product SKU..."
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Display Product Name</label>
                  <input
                    type="text"
                    value={customMappedName}
                    onChange={(e) => setCustomMappedName(e.target.value)}
                    className="w-full h-8 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={customMappedBrand}
                    onChange={(e) => setCustomMappedBrand(e.target.value)}
                    className="w-full h-8 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 text-[11px] flex items-start gap-1.5">
                <CheckCircle2 size={13} className="text-[#0B57D0] shrink-0 mt-0.5" />
                <span>
                  This will batch-update <strong>all matching rows</strong> in {currentPeriod} and save a persistent rule for future monthly imports.
                </span>
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 rounded-b-xl">
              <button
                type="button"
                onClick={() => setShowMapSkuModal(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 text-zinc-700 hover:bg-zinc-100 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSkuMap}
                disabled={savingSkuMap || !selectedStandardSku}
                className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {savingSkuMap ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>{savingSkuMap ? "Mapping..." : "Apply & Update All"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: MAP OR REGISTER STORE (FROM STORE PEN ✏️ OR RED)  */}
      {/* ========================================================= */}
      {showMapStoreModal && mapStoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-visible animate-in fade-in zoom-in-95 duration-100">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 rounded-t-xl bg-white">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Map or Register Store</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Retailer: {mapStoreTarget.buyer_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapStoreModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-visible">
              {/* Raw Source Info */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <p className="text-[10.5px] text-zinc-500">Excel Outlet Code:</p>
                  <p className="font-mono font-bold text-zinc-900 text-xs mt-0.5">{mapStoreTarget.raw_outlet_code || "—"}</p>
                </div>
                <div>
                  <p className="text-[10.5px] text-zinc-500">Excel Outlet Name:</p>
                  <p className="font-semibold text-zinc-900 text-xs mt-0.5 truncate" title={mapStoreTarget.raw_outlet_name}>
                    {mapStoreTarget.raw_outlet_name || "—"}
                  </p>
                </div>
              </div>

              {/* Mode Tabs */}
              <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setStoreModalMode("map")}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    storeModalMode === "map"
                      ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Link to Existing Master Store
                </button>
                <button
                  type="button"
                  onClick={() => setStoreModalMode("register")}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    storeModalMode === "register"
                      ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  + Register New Store
                </button>
              </div>

              {storeModalMode === "map" ? (
                <div className="space-y-3 overflow-visible">
                  <div className="relative z-30">
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Select Master Store <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                      value={selectedMasterStoreId}
                      onChange={(val) => setSelectedMasterStoreId(val)}
                      options={relevantStores}
                      placeholder="Search and select registered store..."
                      className="w-full"
                    />
                  </div>

                  {selectedMasterStoreId && (() => {
                    const chosen = storesList.find((s) => String(s.id) === selectedMasterStoreId);
                    if (!chosen) return null;
                    return (
                      <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-zinc-900">{chosen.display_name || chosen.store_name}</span>
                          <span className="font-mono text-[10.5px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">
                            {chosen.store_number || chosen.store_code || chosen.id}
                          </span>
                        </div>
                        {chosen.address && (
                          <p className="text-zinc-600 text-[11px]">{chosen.address}</p>
                        )}
                      </div>
                    );
                  })()}

                  <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 text-[11px] flex items-start gap-1.5">
                    <CheckCircle2 size={13} className="text-[#0B57D0] shrink-0 mt-0.5" />
                    <span>
                      This will map <strong>all matching rows</strong> with outlet code <strong>{mapStoreTarget.raw_outlet_code}</strong> for {mapStoreTarget.buyer_name} and remember this mapping rule for future uploads.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Official Store Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      placeholder="e.g. OUR TAMPINES HUB"
                      className="w-full h-8 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Store Address</label>
                    <input
                      type="text"
                      value={newStoreAddress}
                      onChange={(e) => setNewStoreAddress(e.target.value)}
                      placeholder="Street address..."
                      className="w-full h-8 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={newStorePostal}
                      onChange={(e) => setNewStorePostal(e.target.value)}
                      placeholder="6-digit postal code..."
                      className="w-full h-8 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 rounded-b-xl">
              <button
                type="button"
                onClick={() => setShowMapStoreModal(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 text-zinc-700 hover:bg-zinc-100 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              {storeModalMode === "map" ? (
                <button
                  type="button"
                  onClick={handleSaveMapStore}
                  disabled={savingStoreMap || !selectedMasterStoreId}
                  className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {savingStoreMap ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>{savingStoreMap ? "Mapping..." : "Apply & Map Store"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveRegisterStore}
                  disabled={savingStoreMap || !newStoreName.trim()}
                  className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  {savingStoreMap ? <RefreshCw size={13} className="animate-spin" /> : <Store size={13} />}
                  <span>{savingStoreMap ? "Registering..." : "Register & Map Store"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. MODAL: EDIT ROW (NO DELETE)                            */}
      {/* ========================================================= */}
      {showEditRowModal && editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Edit Record Values</h2>
              <button
                type="button"
                onClick={() => setShowEditRowModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <p className="font-semibold text-zinc-900">{editingRow.store_name || editingRow.outlet_name}</p>
                <p className="text-zinc-500 text-[11px]">{editingRow.product_name || editingRow.raw_product_description}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Sales Quantity</label>
                <input
                  type="number"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  className="w-full h-8 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Sales Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full h-8 px-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0B57D0]"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditRowModal(false)}
                className="h-8 px-3 rounded-lg border border-slate-200 text-zinc-700 hover:bg-zinc-100 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRowEdit}
                disabled={savingRowEdit}
                className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {savingRowEdit ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>{savingRowEdit ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmConfig.open}
        onOpenChange={(open) => setConfirmConfig((prev) => ({ ...prev, open }))}
        title={confirmConfig.title}
        description={confirmConfig.description}
        onConfirm={confirmConfig.onConfirm}
      />
    </div>
  );
}
