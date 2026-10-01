"use client";

import * as React from "react";
import { 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Layers, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  Calendar, 
  Building2, 
  Search, 
  FileSpreadsheet, 
  Sparkles, 
  Download,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Printer
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
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  minWidth = "min-w-[130px]",
  placement = "auto",
  maxHeight = "max-h-44"
}: CustomSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [openUp, setOpenUp] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
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
      if (placement === "top" || (placement === "auto" && spaceBelow < 210)) {
        setOpenUp(true);
      } else {
        setOpenUp(false);
      }
    }
    setOpen((prev) => !prev);
  };

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
        <div className={`absolute left-0 ${openUp ? "bottom-full mb-1" : "top-full mt-1"} w-full min-w-[160px] ${maxHeight} overflow-auto bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-xs font-medium text-zinc-700 animate-in fade-in zoom-in-95 duration-100`}>
          {options.length === 0 ? (
            <div className="px-3 py-2 text-zinc-400 text-[11px] text-center">No options</div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
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

const YEAR_OPTIONS = [
  { label: "2024", value: "2024" },
  { label: "2025", value: "2025" },
  { label: "2026", value: "2026" },
  { label: "2027", value: "2027" },
  { label: "2028", value: "2028" },
];

const MONTH_OPTIONS = [
  { label: "01 - January", value: 1, short: "Jan" },
  { label: "02 - February", value: 2, short: "Feb" },
  { label: "03 - March", value: 3, short: "Mar" },
  { label: "04 - April", value: 4, short: "Apr" },
  { label: "05 - May", value: 5, short: "May" },
  { label: "06 - June", value: 6, short: "Jun" },
  { label: "07 - July", value: 7, short: "Jul" },
  { label: "08 - August", value: 8, short: "Aug" },
  { label: "09 - September", value: 9, short: "Sep" },
  { label: "10 - October", value: 10, short: "Oct" },
  { label: "11 - November", value: 11, short: "Nov" },
  { label: "12 - December", value: 12, short: "Dec" },
];

interface SellInModuleProps {
  profile?: any;
}

export function SellInModule({ profile }: SellInModuleProps) {
  // Global Month Filter initialized to previous month (matching sales cycle)
  const [currentPeriod, setCurrentPeriod] = React.useState<string>(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = prev.getFullYear();
    const m = String(prev.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  // TopBar Tab Switcher State: "sellin" | "buyers" | "reports"
  const [activeMainTab, setActiveMainTab] = React.useState<"sellin" | "buyers" | "reports">("sellin");

  // Print Reports State
  const [reportSelectedYear, setReportSelectedYear] = React.useState<number>(() => {
    const parts = (currentPeriod || "2026-08").split("-");
    return parseInt(parts[0], 10) || 2026;
  });
  const [reportSelectedMonth, setReportSelectedMonth] = React.useState<number>(() => {
    const parts = (currentPeriod || "2026-08").split("-");
    return parseInt(parts[1], 10) || 8;
  });
  const [reportDurationMonths, setReportDurationMonths] = React.useState<number>(3); // 3, 6, 12
  const [reportBrandFilter, setReportBrandFilter] = React.useState<string>("all");
  const [generatingPdf, setGeneratingPdf] = React.useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = React.useState<boolean>(false);

  const reportAsOfPeriod = React.useMemo(() => {
    return `${reportSelectedYear}-${String(reportSelectedMonth).padStart(2, "0")}`;
  }, [reportSelectedYear, reportSelectedMonth]);

  const calculatedReportPeriods = React.useMemo(() => {
    const list: { period: string; label: string; year: number; month: number }[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = reportDurationMonths - 1; i >= 0; i--) {
      const d = new Date(reportSelectedYear, reportSelectedMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const p = `${y}-${String(m).padStart(2, "0")}`;
      list.push({
        period: p,
        label: `${monthNames[m - 1]} ${y}`,
        year: y,
        month: m
      });
    }
    return list;
  }, [reportSelectedYear, reportSelectedMonth, reportDurationMonths]);

  // Data States
  const [loading, setLoading] = React.useState<boolean>(false);
  const [batchData, setBatchData] = React.useState<any | null>(null);
  const [records, setRecords] = React.useState<any[]>([]);
  const [buyersList, setBuyersList] = React.useState<any[]>([]);
  const [channelsList, setChannelsList] = React.useState<any[]>([]);
  const [sheetsList, setSheetsList] = React.useState<any[]>([]);
  const [productsList, setProductsList] = React.useState<any[]>([]);
  const [brandsList, setBrandsList] = React.useState<any[]>([]);

  // Sub-filter tab in Sell-In view
  const [subFilterTab, setSubFilterTab] = React.useState<"all" | "si" | "cn" | "unresolved">("all");
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [channelFilter, setChannelFilter] = React.useState<string>("all");
  const [brandFilter, setBrandFilter] = React.useState<string>("all");

  // Buyers Tab States
  const [buyersSearch, setBuyersSearch] = React.useState<string>("");
  const [buyersChannelFilter, setBuyersChannelFilter] = React.useState<string>("all");
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);
  const [buyerDrafts, setBuyerDrafts] = React.useState<Record<string, { buyer_code: string; buyer_name: string; channel: string }>>({});
  const [savingBuyers, setSavingBuyers] = React.useState<boolean>(false);

  // Channels Management Modal
  const [showChannelModal, setShowChannelModal] = React.useState<boolean>(false);
  const [newChannelName, setNewChannelName] = React.useState<string>("");
  const [newChannelDesc, setNewChannelDesc] = React.useState<string>("");
  const [savingChannel, setSavingChannel] = React.useState<boolean>(false);

  // Invoices PDF Parsing & Import States
  const [parsingInvoices, setParsingInvoices] = React.useState<boolean>(false);
  const [parsingStatusText, setParsingStatusText] = React.useState<string>("");
  const [parsedInvoices, setParsedInvoices] = React.useState<any[]>([]);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = React.useState<boolean>(false);
  const [uploadedPdfUrl, setUploadedPdfUrl] = React.useState<string>("");
  const [uploadedPdfName, setUploadedPdfName] = React.useState<string>("");
  const [detectedPeriod, setDetectedPeriod] = React.useState<string>("");
  const [savingInvoices, setSavingInvoices] = React.useState<boolean>(false);
  const [selectedInvoiceBreakdownRow, setSelectedInvoiceBreakdownRow] = React.useState<any | null>(null);
  const [activeAssignBuyerInvoiceIndex, setActiveAssignBuyerInvoiceIndex] = React.useState<number | null>(null);

  // Credit Notes PDF Parsing & Import States
  const [parsingCreditNotes, setParsingCreditNotes] = React.useState<boolean>(false);
  const [parsingCnStatusText, setParsingCnStatusText] = React.useState<string>("");
  const [parsedCreditNotes, setParsedCreditNotes] = React.useState<any[]>([]);
  const [showCreditNotePreviewModal, setShowCreditNotePreviewModal] = React.useState<boolean>(false);
  const [uploadedCnPdfUrl, setUploadedCnPdfUrl] = React.useState<string>("");
  const [uploadedCnPdfName, setUploadedCnPdfName] = React.useState<string>("");
  const [detectedCnPeriod, setDetectedCnPeriod] = React.useState<string>("");
  const [savingCreditNotes, setSavingCreditNotes] = React.useState<boolean>(false);
  const [activeAssignBuyerCnIndex, setActiveAssignBuyerCnIndex] = React.useState<number | null>(null);

  const [showAddBuyerModal, setShowAddBuyerModal] = React.useState<boolean>(false);
  const [newBuyerCode, setNewBuyerCode] = React.useState<string>("");
  const [newBuyerName, setNewBuyerName] = React.useState<string>("");
  const [newBuyerChannel, setNewBuyerChannel] = React.useState<string>("Retailer");
  const [newBuyerPaymentTerm, setNewBuyerPaymentTerm] = React.useState<string>("90");
  const [newBuyerStoreGroups, setNewBuyerStoreGroups] = React.useState<Array<{ group_name: string; store_count: number }>>([
    { group_name: "", store_count: 1 }
  ]);
  const [savingNewBuyer, setSavingNewBuyer] = React.useState<boolean>(false);

  const [showAddSkuModal, setShowAddSkuModal] = React.useState<boolean>(false);
  const [addSkuTarget, setAddSkuTarget] = React.useState<{
    sheet_id: string;
    product_sku: string;
    product_name: string;
    buyer_code: string;
    cost_price: number;
  } | null>(null);
  const [savingAddSku, setSavingAddSku] = React.useState<boolean>(false);

  const [showBuyersImportModal, setShowBuyersImportModal] = React.useState<boolean>(false);
  const [importedBuyers, setImportedBuyers] = React.useState<any[]>([]);
  const [importingBuyers, setImportingBuyers] = React.useState<boolean>(false);

  // Inline Unit Price Edit Temp State
  const [editingPriceRowId, setEditingPriceRowId] = React.useState<string | null>(null);
  const [editingPriceVal, setEditingPriceVal] = React.useState<string>("");

  // Reset Modal states (100% same layout as Sell-Out)
  const [showResetModal, setShowResetModal] = React.useState<boolean>(false);
  const [resetBuyer, setResetBuyer] = React.useState<string>("");
  const [resetConfirmText, setResetConfirmText] = React.useState<string>("");
  const [resetting, setResetting] = React.useState<boolean>(false);
  const [recalculating, setRecalculating] = React.useState<boolean>(false);

  // Assign Channel Modal State
  const [showAssignChannelModal, setShowAssignChannelModal] = React.useState<boolean>(false);
  const [assignChannelTarget, setAssignChannelTarget] = React.useState<any | null>(null);
  const [selectedAssignChannel, setSelectedAssignChannel] = React.useState<string>("");
  const [applyChannelToAllBuyerRows, setApplyChannelToAllBuyerRows] = React.useState<boolean>(true);
  const [savingAssignChannel, setSavingAssignChannel] = React.useState<boolean>(false);

  // Confirmation dialog
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

  // Fetch all batch & Sell-In details
  const fetchBatchDetails = React.useCallback(async (period: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/batch-details?period=${encodeURIComponent(period)}`);
      if (res.ok) {
        const data = await res.json();
        setBatchData(data.batch || null);
        setRecords(Array.isArray(data.records) ? data.records : []);
        setBuyersList(Array.isArray(data.buyers) ? data.buyers : []);
        setChannelsList(Array.isArray(data.channels) ? data.channels : []);
        setSheetsList(Array.isArray(data.sheets) ? data.sheets : []);
        setProductsList(Array.isArray(data.products) ? data.products : []);
        setBrandsList(Array.isArray(data.brands) ? data.brands : []);
      } else {
        setRecords([]);
      }
    } catch (err: any) {
      if (!silent) showToast("Failed to load Sell-In data: " + err.message, "error");
      setRecords([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBatchDetails(currentPeriod);
  }, [currentPeriod, fetchBatchDetails]);

  // Global Refresh event
  React.useEffect(() => {
    const handleDbRefresh = () => fetchBatchDetails(currentPeriod, false);
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [fetchBatchDetails, currentPeriod]);

  // TopBar Tabs Integration (Sell-In Demand | Buyers & Channels)
  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("set-topbar-tabs", {
        detail: {
          tabs: [
            { id: "sellin", label: "Sell-In Demand" },
            { id: "buyers", label: "Buyers & Channels" },
            { id: "reports", label: "Print Report" },
          ],
          activeTabId: activeMainTab,
        },
      })
    );

    return () => {
      window.dispatchEvent(new CustomEvent("set-topbar-tabs", { detail: null }));
    };
  }, [activeMainTab]);

  React.useEffect(() => {
    const handleSelectTab = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === "sellin" || customEvent.detail === "buyers" || customEvent.detail === "reports") {
        setActiveMainTab(customEvent.detail as "sellin" | "buyers" | "reports");
      }
    };
    window.addEventListener("topbar-select-tab", handleSelectTab);
    return () => window.removeEventListener("topbar-select-tab", handleSelectTab);
  }, []);

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
    let grossDemand = 0;
    let demandQty = 0;
    let cnAmount = 0;
    let cnQty = 0;
    let unresolvedCount = 0;

    records.forEach((r) => {
      grossDemand += Number(r.total_demand || 0);
      demandQty += Number(r.demand_qty ?? r.quantity ?? 0);
      cnAmount += Number(r.cn_amount || 0);
      cnQty += Number(r.reject_qty ?? r.cn_quantity ?? 0);
      if (r.validation_status && r.validation_status !== "valid") {
        unresolvedCount++;
      }
    });

    const netAmount = grossDemand - cnAmount;
    return { grossDemand, demandQty, cnAmount, cnQty, netAmount, unresolvedCount };
  }, [records]);

  // Distinct Brands from records
  const availableBrands = React.useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.brand && r.brand.trim()) set.add(r.brand.trim());
    });
    return Array.from(set).sort();
  }, [records]);

  // Distinct Buyers strictly having existing Sell-In records in this period
  const existingDataBuyers = React.useMemo(() => {
    const list: Array<{ label: string; value: string; count: number; total_qty: number }> = [];
    const map = new Map<string, { count: number; total_qty: number }>();

    records.forEach((r) => {
      const bName = String(r.buyer_name || "").trim();
      if (!bName) return;
      const existing = map.get(bName) || { count: 0, total_qty: 0 };
      existing.count += 1;
      existing.total_qty += Number(r.demand_qty ?? r.quantity ?? 0);
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

  // Filtered Records for Sell-In Tab
  const filteredRecords = React.useMemo(() => {
    return records.filter((r) => {
      if (subFilterTab === "si" && Number(r.quantity || 0) <= 0) return false;
      if (subFilterTab === "cn" && Number(r.cn_amount || 0) <= 0) return false;
      if (subFilterTab === "unresolved" && (r.validation_status === "valid" || !r.validation_status)) return false;

      if (channelFilter !== "all" && r.channel !== channelFilter) return false;
      if (brandFilter !== "all" && r.brand !== brandFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const buyer = String(r.buyer_name || "").toLowerCase();
        const bcode = String(r.buyer_code || "").toLowerCase();
        const sku = String(r.product_sku || "").toLowerCase();
        const name = String(r.product_name || "").toLowerCase();
        const brand = String(r.brand || "").toLowerCase();
        if (!buyer.includes(q) && !bcode.includes(q) && !sku.includes(q) && !name.includes(q) && !brand.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [records, subFilterTab, channelFilter, brandFilter, searchTerm]);

  // Handle Tax Invoice PDF/Image Upload and AI Parsing
  const handleInvoicePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setParsingInvoices(true);
    setParsingStatusText(`Uploading ${files.length} invoice document(s)...`);

    try {
      const allExtractedInvoices: any[] = [];
      let latestFileUrl = "";
      let latestFileName = "";
      let detectedPeriodStr = "";

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setParsingStatusText(`Analyzing invoice document (${i + 1}/${files.length}): ${file.name}...`);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("period", currentPeriod);

        const res = await fetch(`${API_BASE}/api/sellin/parse-invoice-pdf`, {
          method: "POST",
          body: formData
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to parse ${file.name}`);
        }

        const data = await res.json();
        if (data.success && Array.isArray(data.invoices)) {
          allExtractedInvoices.push(...data.invoices);
          latestFileUrl = data.file_url || latestFileUrl;
          latestFileName = data.file_name || latestFileName;
          if (data.suggested_period && !detectedPeriodStr) {
            detectedPeriodStr = data.suggested_period;
          }
        }
      }

      if (allExtractedInvoices.length === 0) {
        showToast("No invoices or line items could be detected in the provided file(s).", "error");
        return;
      }

      setParsedInvoices(allExtractedInvoices);
      setUploadedPdfUrl(latestFileUrl);
      setUploadedPdfName(latestFileName);
      setDetectedPeriod(detectedPeriodStr || currentPeriod);
      setShowInvoicePreviewModal(true);
      showToast(`Detected ${allExtractedInvoices.length} invoice(s) with AI! Review items below.`, "success");
    } catch (err: any) {
      console.error("Invoice upload error:", err);
      showToast(err.message || "Failed to process invoices", "error");
    } finally {
      setParsingInvoices(false);
      setParsingStatusText("");
      e.target.value = "";
    }
  };

  // Assign SKU to a specific item in the Invoice preview modal
  const handleAssignSkuInPreview = (invIdx: number, itemIdx: number, newSku: string) => {
    setParsedInvoices((prev) => {
      const updated = [...prev];
      const targetInv = { ...updated[invIdx] };
      const items = [...targetInv.items];
      const targetItem = { ...items[itemIdx] };

      targetItem.product_sku = newSku;
      if (newSku) {
        const prod = productsList.find((p) => p.sku === newSku || p.sku_number === newSku);
        if (prod) {
          targetItem.product_name = prod.display_name || targetItem.description;
          targetItem.brand = prod.brands_id || prod.brand_name || "Unassigned Brand";
        }
        targetItem.validation_status = targetInv.buyer_code ? "valid" : "unmapped_sku";
      } else {
        targetItem.validation_status = "unmapped_sku";
      }

      items[itemIdx] = targetItem;
      targetInv.items = items;
      updated[invIdx] = targetInv;
      return updated;
    });
  };

  // Assign existing Buyer to invoice in the preview modal
  const handleAssignBuyerInPreview = (invIdx: number, buyer: any) => {
    setParsedInvoices((prev) => {
      const updated = [...prev];
      const targetInv = { ...updated[invIdx] };
      targetInv.buyer_code = buyer.buyer_code;
      targetInv.buyer_name = buyer.buyer_name;
      targetInv.channel = buyer.channel || "Retailer";
      targetInv.is_unregistered = false;

      targetInv.items = targetInv.items.map((it: any) => ({
        ...it,
        validation_status: it.product_sku ? "valid" : "unmapped_sku"
      }));

      updated[invIdx] = targetInv;
      return updated;
    });
    setActiveAssignBuyerInvoiceIndex(null);
    showToast(`Assigned buyer [${buyer.buyer_code}] ${buyer.buyer_name} to invoice ${parsedInvoices[invIdx]?.invoice_no}`, "success");
  };

  // Save parsed Invoices to database (Approach A)
  const handleSaveInvoices = async () => {
    if (parsedInvoices.length === 0) return;
    setSavingInvoices(true);
    try {
      const savePeriod = detectedPeriod || currentPeriod;
      const res = await fetch(`${API_BASE}/api/sellin/save-invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: savePeriod,
          source_file_name: uploadedPdfName || "invoice.pdf",
          source_file_url: uploadedPdfUrl || "",
          invoices: parsedInvoices
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Successfully imported ${data.count} demand rows from ${parsedInvoices.length} invoice(s)!`, "success");
        setShowInvoicePreviewModal(false);
        setParsedInvoices([]);
        setUploadedPdfUrl("");
        setUploadedPdfName("");
        if (savePeriod !== currentPeriod) {
          setCurrentPeriod(savePeriod);
        } else {
          fetchBatchDetails(currentPeriod, true);
        }
      } else {
        showToast(data.error || "Failed to save invoices", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to save invoices", "error");
    } finally {
      setSavingInvoices(false);
    }
  };

  // Upload and parse Credit Notes (PDF / Image) with Gemini AI
  const handleCreditNotePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setParsingCreditNotes(true);
    setParsingCnStatusText("Uploading credit note files to secure storage...");

    try {
      const allExtractedCns: any[] = [];
      let latestFileUrl = "";
      let latestFileName = "";
      let detectedPeriodStr = "";

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setParsingCnStatusText(`Analyzing credit note ${i + 1} of ${files.length} (${file.name}) with AI...`);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("period", currentPeriod);

        const res = await fetch(`${API_BASE}/api/sellin/parse-creditnote-pdf`, {
          method: "POST",
          body: formData
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to parse ${file.name}`);
        }

        const data = await res.json();
        if (data.success && Array.isArray(data.credit_notes)) {
          allExtractedCns.push(...data.credit_notes);
          latestFileUrl = data.file_url || latestFileUrl;
          latestFileName = data.file_name || latestFileName;
          if (data.suggested_period && !detectedPeriodStr) {
            detectedPeriodStr = data.suggested_period;
          }
        }
      }

      if (allExtractedCns.length === 0) {
        showToast("No credit notes or returned goods could be detected in the provided file(s).", "error");
        return;
      }

      setParsedCreditNotes(allExtractedCns);
      setUploadedCnPdfUrl(latestFileUrl);
      setUploadedCnPdfName(latestFileName);
      setDetectedCnPeriod(detectedPeriodStr || currentPeriod);
      setShowCreditNotePreviewModal(true);
      showToast(`Detected ${allExtractedCns.length} credit note(s) with AI! Review return items below.`, "success");
    } catch (err: any) {
      console.error("Credit Note upload error:", err);
      showToast(err.message || "Failed to process credit notes", "error");
    } finally {
      setParsingCreditNotes(false);
      setParsingCnStatusText("");
      e.target.value = "";
    }
  };

  // Assign SKU to a specific item in the Credit Note preview modal
  const handleAssignSkuInCnPreview = (cnIdx: number, itemIdx: number, newSku: string) => {
    setParsedCreditNotes((prev) => {
      const updated = [...prev];
      const targetCn = { ...updated[cnIdx] };
      const items = [...targetCn.items];
      const targetItem = { ...items[itemIdx] };

      targetItem.product_sku = newSku;
      if (newSku) {
        const prod = productsList.find((p) => p.sku === newSku || p.sku_number === newSku);
        if (prod) {
          targetItem.product_name = prod.display_name || targetItem.description;
          targetItem.brand = prod.brands_id || prod.brand_name || "Unassigned Brand";
        }
        targetItem.validation_status = targetCn.buyer_code ? "valid" : "unmapped_sku";
      } else {
        targetItem.validation_status = "unmapped_sku";
      }

      items[itemIdx] = targetItem;
      targetCn.items = items;
      updated[cnIdx] = targetCn;
      return updated;
    });
  };

  // Assign existing Buyer to credit note in the preview modal
  const handleAssignBuyerInCnPreview = (cnIdx: number, buyer: any) => {
    setParsedCreditNotes((prev) => {
      const updated = [...prev];
      const targetCn = { ...updated[cnIdx] };
      targetCn.buyer_code = buyer.buyer_code;
      targetCn.buyer_name = buyer.buyer_name;
      targetCn.channel = buyer.channel || "Retailer";
      targetCn.is_unregistered = false;

      targetCn.items = targetCn.items.map((it: any) => ({
        ...it,
        validation_status: it.product_sku ? "valid" : "unmapped_sku"
      }));

      updated[cnIdx] = targetCn;
      return updated;
    });
    setActiveAssignBuyerCnIndex(null);
    showToast(`Assigned buyer [${buyer.buyer_code}] ${buyer.buyer_name} to credit note ${parsedCreditNotes[cnIdx]?.cn_no}`, "success");
  };

  // Save parsed Credit Notes to database
  const handleSaveCreditNotes = async () => {
    if (parsedCreditNotes.length === 0) return;
    setSavingCreditNotes(true);
    try {
      const savePeriod = detectedCnPeriod || currentPeriod;
      const res = await fetch(`${API_BASE}/api/sellin/save-credit-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: savePeriod,
          source_file_name: uploadedCnPdfName || "credit_note.pdf",
          source_file_url: uploadedCnPdfUrl || "",
          credit_notes: parsedCreditNotes
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Successfully ingested ${data.count} return item(s) from ${parsedCreditNotes.length} credit note(s)!`, "success");
        setShowCreditNotePreviewModal(false);
        setParsedCreditNotes([]);
        setUploadedCnPdfUrl("");
        setUploadedCnPdfName("");
        if (savePeriod !== currentPeriod) {
          setCurrentPeriod(savePeriod);
        } else {
          fetchBatchDetails(currentPeriod, true);
        }
      } else {
        showToast(data.error || "Failed to save credit notes", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to save credit notes", "error");
    } finally {
      setSavingCreditNotes(false);
    }
  };

  // 1-Click Register Buyer
  const handleQuickRegisterBuyer = async (
    code: string, 
    name: string, 
    channel: string, 
    payment_term: string = newBuyerPaymentTerm, 
    store_groups: any[] = newBuyerStoreGroups
  ) => {
    setSavingNewBuyer(true);
    try {
      const validGroups = store_groups
        .filter((g) => g.group_name && g.group_name.trim().length > 0)
        .map((g) => ({ group_name: g.group_name.trim(), store_count: Number(g.store_count) || 1 }));

      const res = await fetch(`${API_BASE}/api/sellin/quick-register-buyer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_code: code,
          buyer_name: name || code,
          channel: channel || "Retailer",
          payment_term: (payment_term || "90").replace(/[^0-9]/g, "") || "90",
          store_groups: validGroups,
          period: currentPeriod
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Buyer ${name} registered successfully!`, "success");
        setShowAddBuyerModal(false);
        setNewBuyerCode("");
        setNewBuyerName("");
        setNewBuyerPaymentTerm("90");
        setNewBuyerStoreGroups([{ group_name: "", store_count: 1 }]);
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Failed to register buyer", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Register error", "error");
    } finally {
      setSavingNewBuyer(false);
    }
  };

  // 1-Click Add SKU to Listing Sheet
  const handleAddSkuToListing = async () => {
    if (!addSkuTarget) return;
    setSavingAddSku(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/add-sku-to-listing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet_id: addSkuTarget.sheet_id,
          product_sku: addSkuTarget.product_sku,
          product_name: addSkuTarget.product_name,
          buyer_code: addSkuTarget.buyer_code,
          cost_price: Number(addSkuTarget.cost_price || 0)
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Added ${addSkuTarget.product_sku} to listing sheet!`, "success");
        setShowAddSkuModal(false);
        setAddSkuTarget(null);
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Failed to add SKU to listing", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Add SKU error", "error");
    } finally {
      setSavingAddSku(false);
    }
  };

  // Save Inline Unit Price Edit
  const handleSaveUnitPrice = async (recordId: string, newUnitPrice: number) => {
    setEditingPriceRowId(null);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/records/${encodeURIComponent(recordId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recordId, unit_price: newUnitPrice })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Updated unit price and recalculated demand", "success");
        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast(data.error || "Failed to update unit price", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Update error", "error");
    }
  };

  // Publish Snapshot
  const handlePublishBatch = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sellin/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod,
          user: profile?.full_name || profile?.email || "Admin"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Batch published successfully!", "success");
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Failed to publish batch", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Publish failed", "error");
    }
  };

  // Open Reset Modal
  const handleOpenResetModal = () => {
    if (existingDataBuyers.length === 0) {
      showToast("No Sell-In records exist in this period to reset", "error");
      return;
    }
    setResetBuyer(existingDataBuyers[0]?.value || "");
    setResetConfirmText("");
    setShowResetModal(true);
  };

  // Confirm Buyer Reset
  const handleConfirmReset = async () => {
    if (!resetBuyer) {
      showToast("Please select a buyer to reset", "error");
      return;
    }
    const expected = `reset_sales_${currentPeriod}`.toLowerCase();
    if (resetConfirmText.trim().toLowerCase() !== expected) {
      showToast(`Please type "${expected}" exactly to confirm`, "error");
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod,
          buyer_name: resetBuyer,
          confirmation: resetConfirmText.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Reset records for ${resetBuyer}!`, "success");
        setShowResetModal(false);
        setResetConfirmText("");
        setResetBuyer("");
        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast(data.error || "Failed to reset buyer records", "error");
      }
    } catch (e: any) {
      showToast("Reset error: " + e.message, "error");
    } finally {
      setResetting(false);
    }
  };

  // Recalculate Month Demand & Reject Quantities
  const handleRecalculateMonth = async () => {
    setRecalculating(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/recalculate-all?period=${encodeURIComponent(currentPeriod)}`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Recalculated Demand & Reject Qty for ${currentPeriod} successfully!`, "success");
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Recalculation failed", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Recalculation error", "error");
    } finally {
      setRecalculating(false);
    }
  };

  // Generate & Open Brand Sales Report PDF in New Tab (Blob URL, Landscape)
  const handleGenerateReportPdf = async () => {
    if (generatingPdf) return;
    setGeneratingPdf(true);

    // Open a blank new tab immediately on user click to avoid popup blocker
    const newTab = typeof window !== "undefined" ? window.open("", "_blank") : null;
    if (newTab) {
      newTab.document.title = "Generating Sales Report PDF...";
      newTab.document.body.innerHTML = `
        <div style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: #334155;">
          <div style="width: 32px; height: 32px; border: 3px solid #cbd5e1; border-top-color: #0B57D0; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p style="margin-top: 16px; font-size: 14px; font-weight: 500;">Compiling Landscape Sales Report PDF...</p>
          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        </div>
      `;
    }

    try {
      const endPeriod = `${reportSelectedYear}-${String(reportSelectedMonth).padStart(2, "0")}`;
      const res = await fetch(
        `${API_BASE}/api/sellin/report-by-brands?end_period=${encodeURIComponent(endPeriod)}&months=${reportDurationMonths}&brand=${encodeURIComponent(reportBrandFilter)}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (newTab) newTab.close();
        showToast(data.error || "Failed to load report data", "error");
        return;
      }

      if (!data.brands || data.brands.length === 0) {
        if (newTab) newTab.close();
        showToast("No sales records found for this period range", "error");
        return;
      }

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const periods = data.period_columns || [];
      const yearText = String(data.year || reportSelectedYear);

      data.brands.forEach((brand: any, bIdx: number) => {
        if (bIdx > 0) {
          doc.addPage("a4", "landscape");
        }

        // Brand Header (matching template bold title)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(24, 24, 27);
        doc.text(brand.brand_name.toUpperCase(), 14, 15);

        // Header Row 1 & Row 2
        const headRow1: any[] = [
          { content: "CHANNEL", rowSpan: 2, styles: { halign: "center", valign: "middle", fillColor: [248, 250, 252], textColor: [24, 24, 27], fontStyle: "bold" } },
          { content: "BUYERS", rowSpan: 2, styles: { halign: "left", valign: "middle", fillColor: [248, 250, 252], textColor: [24, 24, 27], fontStyle: "bold" } },
          { content: "TOTAL STORE\nCARRY BRANDS", rowSpan: 2, styles: { halign: "center", valign: "middle", fillColor: [248, 250, 252], textColor: [24, 24, 27], fontStyle: "bold" } },
          { content: yearText, colSpan: periods.length * 2, styles: { halign: "center", valign: "middle", fillColor: [248, 250, 252], textColor: [24, 24, 27], fontStyle: "bold" } }
        ];

        const headRow2: any[] = periods.map((p: any) => ({
          content: p.label,
          colSpan: 2,
          styles: { halign: "center", valign: "middle", fillColor: [248, 250, 252], textColor: [24, 24, 27], fontStyle: "bold", fontSize: 7.5 }
        }));

        // Group buyers by channel for clean rowSpan merging
        const channelGroups = new Map<string, any[]>();
        (brand.buyers || []).forEach((b: any) => {
          const ch = (b.channel || "Retailer").trim();
          if (!channelGroups.has(ch)) channelGroups.set(ch, []);
          channelGroups.get(ch)!.push(b);
        });

        const bodyRows: any[] = [];
        channelGroups.forEach((buyersInCh, chName) => {
          buyersInCh.forEach((b: any, bSubIdx: number) => {
            const row: any[] = [];
            if (bSubIdx === 0) {
              row.push({
                content: chName,
                rowSpan: buyersInCh.length,
                styles: { valign: "middle", halign: "center", fontStyle: "bold", fillColor: [255, 255, 255] }
              });
            }
            row.push({ content: b.buyer_name, styles: { halign: "left" } });
            row.push({ content: String(b.total_store || 1), styles: { halign: "center" } });

            periods.forEach((p: any) => {
              const m = b.monthly_data?.[p.period] || { qty: 0, amount: 0 };
              row.push({
                content: m.qty > 0 ? m.qty.toLocaleString() : "-",
                styles: { halign: "right" }
              });
              row.push({
                content: m.amount > 0 ? `$ ${m.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$ 0.00",
                styles: { halign: "right" }
              });
            });

            bodyRows.push(row);
          });
        });

        // Summary Total Row: TOTAL SALE PCS / AMOUNT
        const totRow: any[] = [
          { content: "TOTAL SALE PCS / AMOUNT", colSpan: 3, styles: { fontStyle: "bold", halign: "left", fillColor: [245, 247, 250] } }
        ];
        periods.forEach((p: any) => {
          const tot = brand.totals_by_period?.[p.period] || { qty: 0, amount: 0 };
          totRow.push({
            content: tot.qty > 0 ? tot.qty.toLocaleString() : "-",
            styles: { fontStyle: "bold", halign: "right", fillColor: [245, 247, 250] }
          });
          totRow.push({
            content: tot.amount > 0 ? `$ ${tot.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$ 0.00",
            styles: { fontStyle: "bold", halign: "right", fillColor: [245, 247, 250] }
          });
        });
        bodyRows.push(totRow);

        autoTable(doc, {
          startY: 19,
          head: [headRow1, headRow2],
          body: bodyRows,
          theme: "grid",
          styles: {
            font: "helvetica",
            fontSize: 7.5,
            cellPadding: 2,
            lineColor: [180, 185, 195],
            lineWidth: 0.2,
            textColor: [30, 41, 59]
          },
          headStyles: {
            fillColor: [248, 250, 252],
            textColor: [15, 23, 42],
            fontStyle: "bold"
          },
          margin: { left: 14, right: 14 }
        });

        // YTD summary below table (matching img1 layout)
        const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 160;
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);

        doc.text("YTD", 14, finalY);
        doc.setFont("helvetica", "normal");
        doc.text(`${brand.ytd_days || data.ytd_days || 0} DAY`, 50, finalY);

        doc.setFont("helvetica", "bold");
        doc.text("TOTAL SALE TY", 14, finalY + 4.5);
        doc.setFont("helvetica", "normal");
        doc.text(`$ ${(brand.ytd_total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 50, finalY + 4.5);

        doc.setFont("helvetica", "bold");
        doc.text("TOTAL QTY TY", 14, finalY + 9);
        doc.setFont("helvetica", "normal");
        doc.text(`${(brand.ytd_total_qty || 0).toLocaleString()}`, 50, finalY + 9);
      });

      const pdfBlob = doc.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);

      if (newTab) {
        newTab.location.href = blobUrl;
      } else {
        window.open(blobUrl, "_blank");
      }

      showToast("Sales Report PDF opened in new tab", "success");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      if (newTab) newTab.close();
      showToast("Failed to compile PDF: " + err.message, "error");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Export Brand Sales Report to Excel matching img1 format
  const handleExportBrandReportExcel = async () => {
    if (exportingExcel) return;
    setExportingExcel(true);
    try {
      const endPeriod = `${reportSelectedYear}-${String(reportSelectedMonth).padStart(2, "0")}`;
      const res = await fetch(
        `${API_BASE}/api/sellin/report-by-brands?end_period=${encodeURIComponent(endPeriod)}&months=${reportDurationMonths}&brand=${encodeURIComponent(reportBrandFilter)}`
      );
      const data = await res.json();
      if (!res.ok || !data.success || !data.brands || data.brands.length === 0) {
        showToast("No report data available to export for this period", "error");
        return;
      }

      const rows: any[] = [];
      const periods = data.period_columns || [];

      data.brands.forEach((brand: any) => {
        // 1. Brand Section Header (Bold, uppercase)
        rows.push([brand.brand_name.toUpperCase()]);

        // 2. Table Header Row 1: CHANNEL, BUYERS, TOTAL STORE CARRY BRANDS, Year spanning all months
        const row1: any[] = ["CHANNEL", "BUYERS", "TOTAL STORE CARRY BRANDS"];
        row1.push(data.year || reportSelectedYear);
        rows.push(row1);

        // 3. Table Header Row 2: Month Names spanning Qty & Amount
        const row2: any[] = ["", "", ""];
        periods.forEach((p: any) => {
          row2.push(p.label);
          row2.push("");
        });
        rows.push(row2);

        // 4. Data Rows for each buyer
        brand.buyers.forEach((b: any) => {
          const bRow: any[] = [b.channel || "Retailer", b.buyer_name, b.total_store || 1];
          periods.forEach((p: any) => {
            const m = b.monthly_data?.[p.period] || { qty: 0, amount: 0 };
            bRow.push(m.qty || 0);
            bRow.push(m.amount || 0);
          });
          rows.push(bRow);
        });

        // 5. Total Row: TOTAL SALE PCS / AMOUNT
        const totRow: any[] = ["TOTAL SALE PCS / AMOUNT", "", ""];
        periods.forEach((p: any) => {
          const tot = brand.totals_by_period?.[p.period] || { qty: 0, amount: 0 };
          totRow.push(tot.qty || 0);
          totRow.push(tot.amount || 0);
        });
        rows.push(totRow);

        // 6. Blank separator
        rows.push([]);

        // 7. YTD Rows (matching img1)
        rows.push(["YTD", `${brand.ytd_days || data.ytd_days || 0} DAY`]);
        rows.push(["TOTAL SALE TY", brand.ytd_total_amount || 0]);
        rows.push(["TOTAL QTY TY", brand.ytd_total_qty || 0]);

        // Blank spacing before next brand
        rows.push([]);
        rows.push([]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sales_By_Brand");
      XLSX.writeFile(wb, `Sale_Report_By_Brands_${reportDurationMonths}M_${endPeriod}.xlsx`);
      showToast(`Exported Sales Report by Brands for ${endPeriod}!`, "success");
    } catch (e: any) {
      showToast("Excel export error: " + e.message, "error");
    } finally {
      setExportingExcel(false);
    }
  };

  // Assign Sales Channel to Record(s)
  const handleSaveAssignChannel = async () => {
    if (!assignChannelTarget || !selectedAssignChannel) {
      showToast("Please select a sales channel", "error");
      return;
    }
    setSavingAssignChannel(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/assign-channel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assignChannelTarget.id,
          buyer_code: assignChannelTarget.buyer_code,
          buyer_name: assignChannelTarget.buyer_name,
          period: currentPeriod,
          channel: selectedAssignChannel,
          apply_all_buyer_records: applyChannelToAllBuyerRows
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Channel assigned to "${selectedAssignChannel}"!`, "success");
        setShowAssignChannelModal(false);
        setAssignChannelTarget(null);
        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast(data.error || "Failed to assign channel", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Assign channel error", "error");
    } finally {
      setSavingAssignChannel(false);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (records.length === 0) {
      showToast("No records to export", "error");
      return;
    }

    const exportRows = records.map((r, idx) => ({
      "No": idx + 1,
      "Source": (() => {
        const isCnOnly = r.source_type === "pdf_credit_note";
        const hasInv = !isCnOnly && (Number(r.quantity || 0) > 0 || Number(r.total_demand || 0) > 0 || !!r.source_file_url);
        const hasCn = (Array.isArray(r.credit_notes) && r.credit_notes.length > 0) || Number(r.cn_quantity || 0) > 0 || isCnOnly;
        if (hasInv && hasCn) return "INVOICE + CN";
        if (hasCn) return "CREDIT NOTE";
        return r.source_type?.toUpperCase() || "INVOICE";
      })(),
      "Buyer Code": r.buyer_code,
      "Buyer Name": r.buyer_name,
      "Channel": r.channel || "Retailer",
      "Product SKU": r.product_sku,
      "Product Name": r.product_name,
      "Brand": r.brand || "Unassigned",
      "Demand Qty (pcs)": Number(r.quantity || 0),
      "Unit Price ($/pcs)": Number(r.unit_price || 0),
      "Total Demand ($)": Number(r.total_demand || 0),
      "CN Qty": Number(r.cn_quantity || 0),
      "CN Amount ($)": Number(r.cn_amount || 0),
      "Nett Amount ($)": Number(r.nett_amount || 0),
      "Validation Status": r.validation_status || "valid"
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `SellIn_${currentPeriod}`);
    XLSX.writeFile(wb, `SellIn_Demand_${currentPeriod}.xlsx`);
    showToast("Exported Sell-In Excel spreadsheet", "success");
  };

  // Channel Management Actions
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      showToast("Please enter a channel name", "error");
      return;
    }
    setSavingChannel(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_name: newChannelName.trim(),
          description: newChannelDesc.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Channel "${newChannelName}" added!`, "success");
        setNewChannelName("");
        setNewChannelDesc("");
        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast(data.error || "Failed to add channel", "error");
      }
    } catch (e: any) {
      showToast("Channel create failed: " + e.message, "error");
    } finally {
      setSavingChannel(false);
    }
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/sellin/channels/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Channel "${name}" removed`, "success");
        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast(data.error || "Failed to delete channel", "error");
      }
    } catch (e: any) {
      showToast("Delete channel error: " + e.message, "error");
    }
  };

  // Download Buyers Excel Template
  const handleDownloadBuyersTemplate = () => {
    const templateRows = [
      { "Buyer Code": "3000/F011", "Buyer Name": "FairPrice Supermarket", "Channel": "Retailer" },
      { "Buyer Code": "3000/S001", "Buyer Name": "Sheng Siong Supermarket", "Channel": "Retailer" },
      { "Buyer Code": "TIKTOK_OFFICIAL", "Buyer Name": "HSG SG Official Shop", "Channel": "TikTok" },
      { "Buyer Code": "7ELEVEN_SG", "Buyer Name": "7-Eleven Convenience", "Channel": "Convenience Store" },
      { "Buyer Code": "MOSQUE_SULTAN", "Buyer Name": "Sultan Mosque", "Channel": "Mosque" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Buyers_Template");
    XLSX.writeFile(wb, "SellIn_Buyers_Template.xlsx");
    showToast("Downloaded Buyers template spreadsheet", "success");
  };

  // Handle Buyers Excel Upload
  const handleBuyersExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const parsed = rawJson.map((row) => {
          const keys = Object.keys(row);
          const getVal = (possibleKeys: string[]) => {
            for (const k of keys) {
              const cleanK = k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
              for (const pk of possibleKeys) {
                if (cleanK.includes(pk)) return row[k];
              }
            }
            return "";
          };
          const buyer_code = String(getVal(["buyercode", "code", "custcode"]) || row["buyer_code"] || "").trim();
          const buyer_name = String(getVal(["buyername", "name", "customername"]) || row["buyer_name"] || buyer_code).trim();
          const channel = String(getVal(["channel", "saleschannel", "group"]) || row["channel"] || "Retailer").trim();
          return { buyer_code, buyer_name, channel };
        }).filter((b) => b.buyer_code.length > 0);

        if (parsed.length === 0) {
          showToast("No valid buyers found in Excel file", "error");
          return;
        }

        setImportedBuyers(parsed);
        setShowBuyersImportModal(true);
      } catch (err: any) {
        showToast("Failed to parse buyers Excel: " + err.message, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Submit Bulk Buyers Import
  const handleSubmitBuyersImport = async () => {
    if (importedBuyers.length === 0) return;
    setImportingBuyers(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/buyers/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: importedBuyers })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Successfully imported ${data.count} buyers!`, "success");
        setShowBuyersImportModal(false);
        setImportedBuyers([]);
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Failed to import buyers", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Import error", "error");
    } finally {
      setImportingBuyers(false);
    }
  };

  // Delete Single Record
  const handleDeleteRecord = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/sellin/records/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("Record removed", "success");
        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast("Failed to delete record", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Delete Buyer Master
  const handleDeleteBuyer = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/sellin/buyers/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("Buyer removed", "success");
        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast("Failed to delete buyer", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Save Bulk Buyer Edits
  const handleSaveBuyerDrafts = async () => {
    setSavingBuyers(true);
    try {
      const items = Object.entries(buyerDrafts).map(([id, val]) => ({
        id,
        buyer_code: val.buyer_code,
        buyer_name: val.buyer_name,
        channel: val.channel
      }));

      const res = await fetch(`${API_BASE}/api/sellin/buyers/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Saved all buyer modifications", "success");
        setIsEditMode(false);
        setBuyerDrafts({});
        fetchBatchDetails(currentPeriod);
      } else {
        showToast(data.error || "Failed to save buyer changes", "error");
      }
    } catch (e: any) {
      showToast("Failed to save buyers: " + e.message, "error");
    } finally {
      setSavingBuyers(false);
    }
  };

  // Filtered Buyers list for Buyers Tab
  const filteredBuyers = React.useMemo(() => {
    return buyersList.filter((b) => {
      if (buyersChannelFilter !== "all" && b.channel !== buyersChannelFilter) return false;
      if (buyersSearch.trim()) {
        const q = buyersSearch.toLowerCase();
        const code = String(b.buyer_code || "").toLowerCase();
        const name = String(b.buyer_name || "").toLowerCase();
        const ch = String(b.channel || "").toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !ch.includes(q)) return false;
      }
      return true;
    });
  }, [buyersList, buyersChannelFilter, buyersSearch]);

  // Dropdown option sets
  const channelFilterOptions = React.useMemo(() => {
    const list = [{ label: "All Channels", value: "all" }];
    channelsList.forEach((ch) => {
      const name = ch.channel_name || ch.name;
      if (name) list.push({ label: name, value: name });
    });
    return list;
  }, [channelsList]);

  const brandFilterOptions = React.useMemo(() => {
    const list = [{ label: "All Brands", value: "all" }];
    availableBrands.forEach((b) => {
      list.push({ label: b, value: b });
    });
    return list;
  }, [availableBrands]);

  const buyersChannelSelectOptions = React.useMemo(() => {
    return channelsList.map((ch) => ({
      label: ch.channel_name || ch.name,
      value: ch.channel_name || ch.name
    }));
  }, [channelsList]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary select-none animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. DYNAMIC TOP HEADER BAR (Contextual to Active Tab)                      */}
      {/* ========================================================================= */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
        {activeMainTab === "sellin" ? (
          <>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-zinc-900">Sell-In Demand</h1>
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
              {/* Gross Demand Pill */}
              <div className="h-7 flex items-center gap-1 px-2 rounded-md bg-[#F8F9FA] border border-slate-200 text-[11px]">
                <span className="text-zinc-500 font-normal">Demand:</span>
                <span className="font-medium text-zinc-800">
                  ${kpis.grossDemand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-400 font-normal">({kpis.demandQty.toLocaleString()} pcs)</span>
              </div>

              {/* Reject (CN) Pill */}
              <div className="h-7 flex items-center gap-1 px-2 rounded-md bg-[#F8F9FA] border border-slate-200 text-[11px]">
                <span className="text-zinc-500 font-normal">Reject:</span>
                <span className="font-medium text-zinc-700">
                  ${kpis.cnAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-400 font-normal">({kpis.cnQty.toLocaleString()} pcs)</span>
              </div>

              {/* Return Rate Pill */}
              <div className="h-7 flex items-center gap-1 px-2 rounded-md bg-[#F8F9FA] border border-slate-200 text-[11px]">
                <span className="text-zinc-500 font-normal">Return:</span>
                <span className="font-medium text-zinc-700">
                  {kpis.grossDemand > 0 ? ((kpis.cnAmount / kpis.grossDemand) * 100).toFixed(1) : "0.0"}%
                </span>
              </div>

              {/* Diagnostics Alert / Validation Status Pill */}
              {kpis.unresolvedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setActiveMainTab("sellin");
                    setSubFilterTab("unresolved");
                  }}
                  className="h-7 px-2 rounded-md bg-slate-50 hover:bg-slate-100 text-zinc-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                >
                  <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                  <span>{kpis.unresolvedCount} Diagnostics</span>
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
          </>
        ) : activeMainTab === "buyers" ? (
          <>
            <div>
              <h1 className="text-base font-semibold text-zinc-900">Buyers & Channels Directory</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Manage buyer masters, customer codes, and sales channel classifications.
              </p>
            </div>

            {/* Buyers Tab Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Manage Channels Button */}
              <button
                type="button"
                onClick={() => setShowChannelModal(true)}
                className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Layers size={13} className="text-zinc-500" />
                <span>Channels ({channelsList.length})</span>
              </button>

              {/* Download Excel Template */}
              <button
                type="button"
                onClick={handleDownloadBuyersTemplate}
                className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download size={13} className="text-zinc-500" />
                <span>Template</span>
              </button>

              {/* Upload Excel */}
              <label className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs">
                <Upload size={13} className="text-zinc-600" />
                <span>Import Excel</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleBuyersExcelChange} className="hidden" />
              </label>

              {/* Edit Mode Toggle */}
              {isEditMode ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMode(false);
                      setBuyerDrafts({});
                    }}
                    className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-zinc-700 text-xs font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingBuyers}
                    onClick={handleSaveBuyerDrafts}
                    className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    {savingBuyers ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                    <span>Save Edits</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const initial: Record<string, any> = {};
                    buyersList.forEach((b) => {
                      initial[b.id] = { buyer_code: b.buyer_code, buyer_name: b.buyer_name, channel: b.channel || "Retailer" };
                    });
                    setBuyerDrafts(initial);
                    setIsEditMode(true);
                  }}
                  className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Edit2 size={12} className="text-zinc-500" />
                  <span>Edit Mode</span>
                </button>
              )}

              {/* Add Single Buyer */}
              <button
                type="button"
                onClick={() => {
                  setNewBuyerCode("");
                  setNewBuyerName("");
                  setNewBuyerChannel(channelsList[0]?.channel_name || "Retailer");
                  setNewBuyerPaymentTerm("90");
                  setNewBuyerStoreGroups([{ group_name: "", store_count: 1 }]);
                  setShowAddBuyerModal(true);
                }}
                className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Plus size={13} />
                <span>Add Buyer</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-base font-semibold text-zinc-900">Print Reports</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Generate and print landscape executive reports and multi-month sales summaries.
              </p>
            </div>

            {/* Year & Month End Selector in Header Bar */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-zinc-600">Month End:</span>
              <div className="flex items-center gap-1.5">
                <CustomSelect
                  value={String(reportSelectedYear)}
                  onChange={(val) => setReportSelectedYear(Number(val))}
                  options={YEAR_OPTIONS}
                  className="w-24 text-xs"
                  minWidth="min-w-[85px]"
                />
                <CustomSelect
                  value={String(reportSelectedMonth)}
                  onChange={(val) => setReportSelectedMonth(Number(val))}
                  options={MONTH_OPTIONS.map((m) => ({ label: m.label, value: String(m.value) }))}
                  className="w-38 text-xs"
                  minWidth="min-w-[135px]"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB 1: SELL-IN DEMAND MASTER VIEW                                      */}
      {/* ========================================================================= */}
      {activeMainTab === "sellin" && (
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
                  onClick={() => setSubFilterTab("si")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    subFilterTab === "si" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Demand Inflow
                </button>
                <button
                  type="button"
                  onClick={() => setSubFilterTab("cn")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    subFilterTab === "cn" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Adjustments (CN)
                </button>
                <button
                  type="button"
                  onClick={() => setSubFilterTab("unresolved")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    subFilterTab === "unresolved" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span>Diagnostics</span>
                  {kpis.unresolvedCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-medium flex items-center justify-center">
                      {kpis.unresolvedCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-[220px] flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search buyer, SKU, brand..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-8 pl-8 pr-2.5 bg-white border border-slate-200 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* Custom Channel Filter Dropdown */}
              <CustomSelect
                value={channelFilter}
                onChange={setChannelFilter}
                options={channelFilterOptions}
                placeholder="All Channels"
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
              {/* Recalculate Month Demand & Reject Qty */}
              {records.length > 0 && (
                <button
                  type="button"
                  onClick={handleRecalculateMonth}
                  disabled={recalculating}
                  className="h-8 px-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                  title={`Recalculate Demand Qty & Reject Qty for ${currentPeriod}`}
                >
                  <RefreshCw size={13} className={`text-zinc-500 ${recalculating ? "animate-spin" : ""}`} />
                  <span>Recalc Qty</span>
                </button>
              )}

              {/* Reset Month Button */}
              {records.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenResetModal}
                  className="h-8 px-2.5 rounded-lg bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title={`Reset buyer records for ${currentPeriod}`}
                >
                  <Trash2 size={13} className="text-red-500" />
                  <span>Reset</span>
                </button>
              )}

              {/* Import Invoices PDF Button */}
              <label className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs">
                {parsingInvoices ? <RefreshCw size={13} className="animate-spin text-zinc-500" /> : <FileText size={13} className="text-zinc-500" />}
                <span>{parsingInvoices ? "Parsing AI..." : "Import Invoices (PDF)"}</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  multiple
                  disabled={parsingInvoices}
                  onChange={handleInvoicePdfUpload}
                  className="hidden"
                />
              </label>

              {/* Import Credit Notes PDF Button */}
              <label className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs">
                {parsingCreditNotes ? <RefreshCw size={13} className="animate-spin text-[#0B57D0]" /> : <FileText size={13} className="text-[#0B57D0]" />}
                <span>{parsingCreditNotes ? "Parsing CN..." : "Import Credit Notes (PDF)"}</span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  multiple
                  disabled={parsingCreditNotes}
                  onChange={handleCreditNotePdfUpload}
                  className="hidden"
                />
              </label>


              {/* Export Excel Button */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="h-8 px-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Export current Sell-In rows to Excel"
              >
                <Download size={13} className="text-zinc-500" />
              </button>

              {/* Publish Snapshot Button */}
              <button
                type="button"
                onClick={handlePublishBatch}
                className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98"
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
                <span className="text-xs text-zinc-500 font-medium">Loading Sell-In records...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center p-6">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-zinc-400">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-800">No Sell-In Records for {currentPeriod}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 max-w-sm leading-relaxed">
                    Upload your Tax Invoice PDF(s) to load this month's demand with AI.
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <label className="h-8 px-3 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs">
                    {parsingInvoices ? <RefreshCw size={12} className="animate-spin text-white" /> : <FileText size={12} className="text-blue-100" />}
                    <span>{parsingInvoices ? "Parsing AI..." : "Import Invoices (PDF)"}</span>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" multiple disabled={parsingInvoices} onChange={handleInvoicePdfUpload} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[11px] font-medium text-zinc-500">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3 w-20">Source</th>
                    <th className="py-2.5 px-3 min-w-[150px]">Buyer</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Channel</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Product SKU & Description</th>
                    <th className="py-2.5 px-3 min-w-[110px]">Brand</th>
                    <th className="py-2.5 px-3 w-24 text-right">Demand Qty</th>
                    <th className="py-2.5 px-3 w-28 text-right">Unit Price ($)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Total Demand</th>
                    <th className="py-2.5 px-3 w-24 text-right">Reject Qty</th>
                    <th className="py-2.5 px-3 w-24 text-right">CN ($)</th>
                    <th className="py-2.5 px-3 min-w-[160px] text-center">Diagnostic Status</th>
                    <th className="py-2.5 px-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((r, idx) => {
                    const isUnregistered = r.validation_status === "unregistered_buyer";
                    const isNoListing = r.validation_status === "no_listing";
                    const isUnmappedSku = r.validation_status === "unmapped_sku";
                    const isValid = r.validation_status === "valid" || (!isUnregistered && !isNoListing && !isUnmappedSku);

                    const isEditingPrice = editingPriceRowId === r.id;

                    return (
                      <tr 
                        key={r.id || idx} 
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Index */}
                        <td className="py-2 px-3 text-center text-zinc-400 text-[11px] font-mono">
                          {idx + 1}
                        </td>

                        {/* Source */}
                        <td className="py-2 px-3">
                          {(() => {
                            const isCnOnly = r.source_type === "pdf_credit_note";
                            const hasInvoices = !isCnOnly && (!!r.source_file_url || (Array.isArray(r.invoices) && r.invoices.length > 0));
                            const invoiceUrl = !isCnOnly ? r.source_file_url : (r.invoices?.[0]?.source_file_url || "");
                            
                            const hasCns = (Array.isArray(r.credit_notes) && r.credit_notes.length > 0) || isCnOnly;
                            const cnUrl = r.credit_notes?.find((c: any) => c.source_file_url)?.source_file_url || (isCnOnly ? r.source_file_url : "");

                            if (hasInvoices && hasCns && invoiceUrl && cnUrl) {
                              return (
                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                  <a
                                    href={invoiceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-[#0B57D0] hover:bg-blue-100 text-[10.5px] font-mono font-medium transition-colors"
                                    title={`View Invoice: ${r.source_file_name || 'Invoice'}`}
                                  >
                                    <FileText size={10} className="text-[#0B57D0]" />
                                    <span>INV</span>
                                  </a>
                                  <span className="text-zinc-300">•</span>
                                  <a
                                    href={cnUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-zinc-700 hover:bg-slate-200 text-[10.5px] font-mono font-medium transition-colors"
                                    title="View Credit Note"
                                  >
                                    <FileText size={10} className="text-zinc-500" />
                                    <span>CN</span>
                                  </a>
                                </div>
                              );
                            }

                            if (hasCns && cnUrl) {
                              return (
                                <a
                                  href={cnUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-zinc-700 hover:bg-slate-200 text-[10.5px] font-mono font-medium transition-colors"
                                  title={`View Credit Note: ${r.source_file_name || 'Credit Note'}`}
                                >
                                  <FileText size={10} className="text-zinc-500" />
                                  <span className="truncate max-w-[85px]">{r.source_file_name || "CN"}</span>
                                </a>
                              );
                            }

                            if (hasInvoices && invoiceUrl) {
                              return (
                                <a
                                  href={invoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#0B57D0] hover:underline inline-flex items-center gap-1 text-[10.5px] font-mono group"
                                  title={`View source invoice: ${r.source_file_name || 'Invoice'}`}
                                >
                                  <FileText size={11} className="shrink-0 text-blue-600 group-hover:scale-110 transition-transform" />
                                  <span className="truncate max-w-[85px]">{r.source_file_name || "INVOICE"}</span>
                                </a>
                              );
                            }

                            return (
                              <span className="text-[10.5px] font-mono text-zinc-500">
                                {r.source_type?.toUpperCase() || "INVOICE"}
                              </span>
                            );
                          })()}
                        </td>

                        {/* Buyer Code & Name */}
                        <td className="py-2 px-3">
                          <div className="flex flex-col min-w-0">
                            <span className="text-zinc-800 font-medium truncate">{r.buyer_name || r.buyer_code}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">{r.buyer_code}</span>
                          </div>
                        </td>

                        {/* Channel */}
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => {
                              setAssignChannelTarget(r);
                              setSelectedAssignChannel(r.channel || channelsList[0]?.channel_name || "Retailer");
                              setApplyChannelToAllBuyerRows(true);
                              setShowAssignChannelModal(true);
                            }}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0B57D0] border border-slate-200/80 hover:border-blue-200 transition-colors cursor-pointer inline-flex items-center gap-1 group"
                            title="Click to assign sales channel"
                          >
                            <span>{r.channel || "Retailer"}</span>
                            <Edit2 size={9} className="text-zinc-400 group-hover:text-[#0B57D0] opacity-60 group-hover:opacity-100" />
                          </button>
                        </td>

                        {/* Product SKU & Name */}
                        <td className="py-2 px-3">
                          <div className="flex flex-col min-w-0">
                            <span className="text-zinc-800 truncate">{r.product_name || r.product_sku || "(No Description)"}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{r.product_sku || "(Blank SKU)"}</span>
                          </div>
                        </td>

                        {/* Brand */}
                        <td className="py-2 px-3 text-zinc-600">
                          {r.brand || "Unassigned"}
                        </td>

                        {/* Demand Quantity */}
                        <td className="py-2 px-3 text-right text-zinc-800 font-mono">
                          <div className="flex items-center justify-end gap-1.5">
                            <span>{Number(r.demand_qty ?? r.quantity ?? 0).toLocaleString()}</span>
                            {Array.isArray(r.invoices) && r.invoices.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceBreakdownRow(r)}
                                className="p-1 rounded hover:bg-blue-50 text-[#0B57D0] transition-colors cursor-pointer inline-flex items-center justify-center"
                                title={`Click to view invoice breakdown (${r.invoices.length} invoice${r.invoices.length === 1 ? '' : 's'})`}
                              >
                                <FileText size={13} />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Editable Unit Price ($/pcs) */}
                        <td className="py-2 px-3 text-right">
                          {isEditingPrice ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                step="0.01"
                                autoFocus
                                value={editingPriceVal}
                                onChange={(e) => setEditingPriceVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveUnitPrice(r.id, Number(editingPriceVal || 0));
                                  } else if (e.key === "Escape") {
                                    setEditingPriceRowId(null);
                                  }
                                }}
                                onBlur={() => handleSaveUnitPrice(r.id, Number(editingPriceVal || 0))}
                                className="w-20 h-6 text-right px-1.5 bg-white border border-[#0B57D0] rounded text-xs font-mono text-zinc-800 focus:outline-none"
                              />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPriceRowId(r.id);
                                setEditingPriceVal(String(r.unit_price || 0));
                              }}
                              className="px-1 py-0.5 rounded hover:bg-slate-100 text-zinc-800 font-mono hover:text-[#0B57D0] transition-colors cursor-pointer text-right group"
                              title="Click to edit unit cost price"
                            >
                              <span>${Number(r.unit_price || 0).toFixed(2)}</span>
                              <Edit2 size={10} className="inline ml-1 text-zinc-400 group-hover:text-[#0B57D0]" />
                            </button>
                          )}
                        </td>

                        {/* Total Gross Demand ($) */}
                        <td className="py-2 px-3 text-right text-zinc-800 font-mono font-medium">
                          ${Number(r.total_demand || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Reject Qty */}
                        <td className="py-2 px-3 text-right text-zinc-600 font-mono">
                          {Number(r.reject_qty ?? r.cn_quantity ?? 0) > 0 ? Number(r.reject_qty ?? r.cn_quantity ?? 0).toLocaleString() : "-"}
                        </td>

                        {/* CN Amount ($) */}
                        <td className="py-2 px-3 text-right text-zinc-500 font-mono">
                          {Number(r.cn_amount || 0) > 0 ? `-$${Number(r.cn_amount).toFixed(2)}` : "-"}
                        </td>

                        {/* 3-Tier Diagnostic Badges & Actions */}
                        <td className="py-2 px-3 text-center">
                          {isUnregistered ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNewBuyerCode(r.buyer_code);
                                setNewBuyerName(r.buyer_name || r.buyer_code);
                                setNewBuyerChannel(r.source_type === "tiktok" ? "TikTok" : "Retailer");
                                setNewBuyerPaymentTerm("90");
                                setNewBuyerStoreGroups([{ group_name: "", store_count: 1 }]);
                                setShowAddBuyerModal(true);
                              }}
                              className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-zinc-700 text-[10.5px] font-medium border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            >
                              <AlertTriangle size={11} className="text-amber-600" />
                              <span>Register Buyer</span>
                            </button>
                          ) : isNoListing ? (
                            <a
                              href="#market-price"
                              onClick={(e) => {
                                e.preventDefault();
                                showToast("Please create a listing sheet for this buyer in the Market Price module.", "info");
                              }}
                              className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-zinc-700 text-[10.5px] font-medium border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            >
                              <ExternalLink size={11} className="text-zinc-500" />
                              <span>No Listing Sheet</span>
                            </a>
                          ) : isUnmappedSku ? (
                            <button
                              type="button"
                              onClick={() => {
                                const b = buyersList.find((x) => x.buyer_code === r.buyer_code);
                                const sh = sheetsList.find((s) => {
                                  if (s.buyer_id === b?.id || s.buyer_id === b?.buyer_code) return true;
                                  let rIds: any[] = [];
                                  if (Array.isArray(s.retailer_ids)) rIds = s.retailer_ids;
                                  else if (typeof s.retailer_ids === "string") {
                                    try { rIds = JSON.parse(s.retailer_ids); } catch {}
                                  }
                                  return rIds.includes(b?.id) || rIds.includes(b?.buyer_code);
                                });
                                setAddSkuTarget({
                                  sheet_id: sh?.id || (sheetsList[0]?.id || ""),
                                  product_sku: r.product_sku,
                                  product_name: r.product_name,
                                  buyer_code: r.buyer_code,
                                  cost_price: Number(r.unit_price || 0)
                                });
                                setShowAddSkuModal(true);
                              }}
                              className="px-2 py-0.5 rounded bg-white hover:bg-slate-50 text-zinc-700 text-[10.5px] font-medium border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            >
                              <Plus size={11} className="text-zinc-500" />
                              <span>Add to Listing</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-zinc-500 text-[10.5px]">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              <span>Valid</span>
                            </span>
                          )}
                        </td>

                        {/* Delete Row Button */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmConfig({
                                open: true,
                                title: "Delete Demand Record",
                                description: `Remove ${r.product_sku} for ${r.buyer_name || r.buyer_code}?`,
                                onConfirm: () => handleDeleteRecord(r.id)
                              });
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Row"
                          >
                            <Trash2 size={13} />
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
      )}

      {/* ========================================================================= */}
      {/* 3. TAB 2: BUYERS & CHANNELS MASTER VIEW                                   */}
      {/* ========================================================================= */}
      {activeMainTab === "buyers" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Buyers Filter Toolbar (Clean Search & Channel Dropdown) */}
          <div className="px-4 py-2 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Search & Channel Filter */}
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative max-w-[280px] flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search buyer code, name, channel..."
                  value={buyersSearch}
                  onChange={(e) => setBuyersSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-2.5 bg-white border border-slate-200 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* Custom Channel Filter Dropdown */}
              <CustomSelect
                value={buyersChannelFilter}
                onChange={setBuyersChannelFilter}
                options={channelFilterOptions}
                placeholder="All Channels"
                minWidth="min-w-[140px]"
              />
            </div>

            <div className="text-xs text-zinc-500 font-medium">
              Showing {filteredBuyers.length} of {buyersList.length} registered buyers
            </div>
          </div>

          {/* Buyers DataTable */}
          <div className="flex-1 min-h-0 overflow-auto bg-white">
            {filteredBuyers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-6">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-zinc-400">
                  <Building2 size={24} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-800">No Buyers Registered</h3>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Click Add Buyer or Import Excel to register your Sell-In customer masters.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[11px] font-semibold text-zinc-600">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3 w-36">Buyer Code</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Buyer / Retailer Name</th>
                    <th className="py-2.5 px-3 w-48">Assigned Sales Channel</th>
                    <th className="py-2.5 px-3 w-32 text-center">Registered Date</th>
                    <th className="py-2.5 px-3 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBuyers.map((b, idx) => {
                    const draft = buyerDrafts[b.id] || { buyer_code: b.buyer_code, buyer_name: b.buyer_name, channel: b.channel || "Retailer" };

                    return (
                      <tr key={b.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>

                        {/* Buyer Code */}
                        <td className="py-2 px-3">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={draft.buyer_code}
                              onChange={(e) => {
                                setBuyerDrafts((prev) => ({
                                  ...prev,
                                  [b.id]: { ...draft, buyer_code: e.target.value }
                                }));
                              }}
                              className="w-full h-7 px-2 bg-white border border-[#0B57D0] rounded text-xs font-mono font-medium text-zinc-900 focus:outline-none"
                            />
                          ) : (
                            <span className="font-mono font-medium text-[#0B57D0]">{b.buyer_code}</span>
                          )}
                        </td>

                        {/* Buyer Name */}
                        <td className="py-2 px-3">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={draft.buyer_name}
                              onChange={(e) => {
                                setBuyerDrafts((prev) => ({
                                  ...prev,
                                  [b.id]: { ...draft, buyer_name: e.target.value }
                                }));
                              }}
                              className="w-full h-7 px-2 bg-white border border-[#0B57D0] rounded text-xs font-medium text-zinc-900 focus:outline-none"
                            />
                          ) : (
                            <span className="font-medium text-zinc-800">{b.buyer_name}</span>
                          )}
                        </td>

                        {/* Channel */}
                        <td className="py-2 px-3">
                          {isEditMode ? (
                            <CustomSelect
                              value={draft.channel}
                              onChange={(newCh) => {
                                setBuyerDrafts((prev) => ({
                                  ...prev,
                                  [b.id]: { ...draft, channel: newCh }
                                }));
                              }}
                              options={buyersChannelSelectOptions}
                              minWidth="min-w-[130px]"
                            />
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-nowrap">
                              {b.channel || "Retailer"}
                            </span>
                          )}
                        </td>

                        {/* Registered Date */}
                        <td className="py-2 px-3 text-center text-zinc-400 font-mono text-[11px]">
                          {b.created_at ? new Date(Number(b.created_at)).toLocaleDateString() : "-"}
                        </td>

                        {/* Delete Button */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmConfig({
                                open: true,
                                title: "Remove Buyer Master",
                                description: `Are you sure you want to remove ${b.buyer_name} (${b.buyer_code})?`,
                                onConfirm: () => handleDeleteBuyer(b.id)
                              });
                            }}
                            className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
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
      )}

      {/* ========================================================================= */}
      {/* 4. TAB 3: PRINT REPORTS VIEW                                              */}
      {/* ========================================================================= */}
      {activeMainTab === "reports" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-5 bg-[#F8F9FA]">
          <div className="max-w-5xl mx-auto w-full space-y-6">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Available Reports</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Select a report below to configure timeframes and generate printable landscape documents.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
              {/* Card 1: Sale Report By Brands */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
                <div>
                  {/* Clean Minimal Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B57D0]">
                        <Printer size={15} />
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900">Sale Report By Brands</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-[#0B57D0] border border-blue-200">
                      Landscape PDF
                    </span>
                  </div>

                  {/* Clean Form Controls (Flat, No Container Over-nesting) */}
                  <div className="py-3 space-y-3">
                    {/* Year & Month End Selectors */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                          Select Year
                        </label>
                        <CustomSelect
                          value={String(reportSelectedYear)}
                          onChange={(val) => setReportSelectedYear(Number(val))}
                          options={YEAR_OPTIONS}
                          className="w-full text-xs"
                          minWidth="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                          Select Month End
                        </label>
                        <CustomSelect
                          value={String(reportSelectedMonth)}
                          onChange={(val) => setReportSelectedMonth(Number(val))}
                          options={MONTH_OPTIONS.map((m) => ({ label: m.label, value: String(m.value) }))}
                          className="w-full text-xs"
                          minWidth="w-full"
                        />
                      </div>
                    </div>

                    {/* Reporting Duration (Equal Width, Single Text) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                        Reporting Duration
                      </label>
                      <div className="grid grid-cols-3 gap-2 w-full">
                        {[
                          { label: "3 Months", val: 3 },
                          { label: "6 Months", val: 6 },
                          { label: "12 Months", val: 12 },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setReportDurationMonths(opt.val)}
                            className={`h-8 w-full rounded-lg text-xs font-medium text-center border transition-all cursor-pointer flex items-center justify-center ${
                              reportDurationMonths === opt.val
                                ? "bg-[#0B57D0] text-white border-[#0B57D0] font-semibold shadow-2xs"
                                : "bg-white text-zinc-700 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Brand Filter */}
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                        Brand Filter
                      </label>
                      <CustomSelect
                        value={reportBrandFilter}
                        onChange={setReportBrandFilter}
                        options={[
                          { label: "All Brands (Separate Tables)", value: "all" },
                          ...availableBrands.map((b) => ({ label: b, value: b })),
                        ]}
                        className="w-full text-xs"
                        minWidth="w-full"
                      />
                    </div>

                    {/* Minimal Date Range Indicator */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-zinc-500">
                      <span>Generated Range:</span>
                      <span className="font-semibold text-zinc-800 font-mono text-[11px]">
                        {calculatedReportPeriods[0]?.label} → {calculatedReportPeriods[calculatedReportPeriods.length - 1]?.label} ({reportDurationMonths}M)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportBrandReportExcel()}
                    disabled={exportingExcel || generatingPdf}
                    className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {exportingExcel ? <RefreshCw size={13} className="animate-spin text-emerald-600" /> : <FileSpreadsheet size={13} className="text-emerald-600" />}
                    <span>{exportingExcel ? "Exporting..." : "Download Excel"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateReportPdf}
                    disabled={generatingPdf || exportingExcel}
                    className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98 disabled:opacity-50"
                  >
                    {generatingPdf ? <RefreshCw size={13} className="animate-spin text-white" /> : <Printer size={13} className="text-white" />}
                    <span>{generatingPdf ? "Compiling..." : "Print PDF (New Tab)"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODALS & POPUPS                                                        */}
      {/* ========================================================================= */}

      {/* Modal: Channels Management */}
      {showChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Sales Channels Management</h2>
                <p className="text-xs text-zinc-500">Configure channels used for buyer segmentation</p>
              </div>
              <button type="button" onClick={() => setShowChannelModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X size={16} />
              </button>
            </div>

            {/* Existing Channels List */}
            <div className="p-4 flex-1 overflow-auto flex flex-col gap-3">
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                {channelsList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-400">No channels configured</div>
                ) : (
                  channelsList.map((ch) => (
                    <div key={ch.id} className="px-3 py-2 flex items-center justify-between bg-white hover:bg-slate-50 text-xs">
                      <div>
                        <span className="font-medium text-zinc-800">{ch.channel_name || ch.name}</span>
                        {ch.description && <p className="text-[11px] text-zinc-400">{ch.description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteChannel(ch.id, ch.channel_name || ch.name)}
                        className="p-1 text-zinc-400 hover:text-red-600 rounded"
                        title="Delete Channel"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Channel Form */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-2.5">
                <h3 className="text-xs font-semibold text-zinc-800">Add New Channel</h3>
                <div>
                  <input
                    type="text"
                    placeholder="Channel Name (e.g. Modern Trade, Supermarket)"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newChannelDesc}
                    onChange={(e) => setNewChannelDesc(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <button
                  type="button"
                  disabled={savingChannel || !newChannelName.trim()}
                  onClick={handleCreateChannel}
                  className="h-8 px-3 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 self-end shadow-2xs"
                >
                  {savingChannel ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                  <span>Add Channel</span>
                </button>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowChannelModal(false)}
                className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Invoices AI Parsing Progress */}
      {parsingInvoices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-2xl p-6 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B57D0]">
              <RefreshCw size={24} className="animate-spin text-[#0B57D0]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">AI Document Analysis in Progress</h3>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                {parsingStatusText || "Extracting invoice numbers, customer details, and line items..."}
              </p>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 mt-1">Please keep this window open</span>
          </div>
        </div>
      )}

      {/* Modal: Tax Invoices AI Extraction Preview */}
      {showInvoicePreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-5xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-zinc-950">Tax Invoices AI Extraction Review</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-[#0B57D0] border border-blue-200 font-mono">
                    {detectedPeriod || currentPeriod}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                  {uploadedPdfName && (
                    <span className="font-mono text-zinc-700 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[280px]">
                      {uploadedPdfName}
                    </span>
                  )}
                  <span>• {parsedInvoices.length} invoice(s) detected • {parsedInvoices.reduce((acc, inv) => acc + (inv.items?.length || 0), 0)} total line items</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowInvoicePreviewModal(false);
                  setParsedInvoices([]);
                  setUploadedPdfUrl("");
                  setUploadedPdfName("");
                }} 
                className="p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex flex-col gap-4 bg-[#F8F9FA]">
              {parsedInvoices.map((inv, invIdx) => (
                <div key={invIdx} className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                  {/* Invoice Header */}
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-zinc-900 font-mono">
                        Invoice No: {inv.invoice_no || "(Not specified)"}
                      </span>
                      <span className="text-xs text-zinc-500 font-medium">
                        Date: {inv.invoice_date || "—"}
                      </span>
                      {inv.page_number && (
                        <span className="text-[11px] text-zinc-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          Page {inv.page_number}
                        </span>
                      )}
                    </div>

                    {/* Customer Status & Matching */}
                    <div className="flex items-center gap-2">
                      {!inv.is_unregistered && inv.buyer_code ? (
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] text-emerald-800">
                          <Check size={11} className="text-emerald-600" />
                          <span>Matched: <strong>[{inv.buyer_code}] {inv.buyer_name}</strong> ({inv.channel})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] text-amber-800 font-medium">
                            <AlertTriangle size={11} className="text-amber-600" />
                            <span>Unregistered: "{inv.customer_name}"</span>
                          </div>

                          {/* Quick Assign Buyer Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveAssignBuyerInvoiceIndex(activeAssignBuyerInvoiceIndex === invIdx ? null : invIdx)}
                              className="h-6 px-2 rounded bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <span>Assign Existing</span>
                              <ChevronDown size={10} />
                            </button>

                            {activeAssignBuyerInvoiceIndex === invIdx && (
                              <div className="absolute right-0 top-7 z-30 w-64 bg-white rounded-lg border border-slate-200 shadow-xl p-2 max-h-48 overflow-y-auto">
                                <span className="text-[10px] text-zinc-400 font-semibold px-2 py-1 block">SELECT REGISTERED BUYER</span>
                                {buyersList.map((b) => (
                                  <button
                                    key={b.id || b.buyer_code}
                                    type="button"
                                    onClick={() => handleAssignBuyerInPreview(invIdx, b)}
                                    className="w-full text-left px-2 py-1.5 rounded hover:bg-blue-50 text-xs text-zinc-800 flex flex-col cursor-pointer"
                                  >
                                    <span className="font-medium truncate">{b.buyer_name}</span>
                                    <span className="text-[10px] text-zinc-400 font-mono">[{b.buyer_code}] • {b.channel}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Create Buyer Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setNewBuyerName(inv.customer_name);
                              setNewBuyerCode(inv.customer_name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10).toUpperCase());
                              setNewBuyerChannel("Retailer");
                              setShowAddBuyerModal(true);
                            }}
                            className="h-6 px-2 rounded bg-[#0B57D0] hover:bg-[#0842A0] text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={10} />
                            <span>Register New</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/60 text-zinc-500 font-medium border-b border-slate-200 text-[11px]">
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3 min-w-[120px]">Code (Invoice)</th>
                          <th className="py-2 px-3 min-w-[150px]">SKU Assigned</th>
                          <th className="py-2 px-3 min-w-[200px]">Description</th>
                          <th className="py-2 px-3 text-right w-24">Qty</th>
                          <th className="py-2 px-3 text-right w-24">Unit Price</th>
                          <th className="py-2 px-3 text-right w-28">Amount</th>
                          <th className="py-2 px-3 text-center w-28">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inv.items.map((it: any, itemIdx: number) => {
                          const isUnmapped = !it.product_sku;
                          return (
                            <tr key={itemIdx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 text-center text-zinc-400 font-mono text-[11px]">
                                {itemIdx + 1}
                              </td>
                              <td className="py-2 px-3 font-mono text-zinc-700">
                                {it.product_code ? (
                                  <span className="font-semibold text-zinc-800">{it.product_code}</span>
                                ) : (
                                  <span className="text-zinc-400 italic text-[11px]">(No Code)</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {it.product_sku ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-semibold text-[#0B57D0]">{it.product_sku}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleAssignSkuInPreview(invIdx, itemIdx, "")}
                                      className="text-zinc-400 hover:text-red-500 text-[10px] cursor-pointer"
                                      title="Clear assigned SKU"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <select
                                      value=""
                                      onChange={(e) => handleAssignSkuInPreview(invIdx, itemIdx, e.target.value)}
                                      className="h-6 px-1.5 border border-amber-300 rounded text-[11px] bg-amber-50 text-amber-900 focus:outline-none cursor-pointer max-w-[130px]"
                                    >
                                      <option value="">(Blank SKU)</option>
                                      {productsList.map((p) => (
                                        <option key={p.sku} value={p.sku}>
                                          {p.sku} - {p.display_name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-zinc-800">
                                <span className="font-medium">{it.description}</span>
                                {it.product_name && it.product_name !== it.description && (
                                  <span className="text-[10px] text-zinc-400 block">{it.product_name}</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-zinc-800">
                                {it.qty} {it.uom}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-zinc-800">
                                ${Number(it.unit_price || 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-medium text-zinc-900">
                                ${Number(it.amount || 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {it.validation_status === "valid" ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Valid
                                  </span>
                                ) : it.validation_status === "unregistered_buyer" ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    Unreg Buyer
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    Unmapped SKU
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-zinc-500 font-medium">
                Review all lines. Unmapped SKUs will be recorded with their original description preserved.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInvoicePreviewModal(false);
                    setParsedInvoices([]);
                    setUploadedPdfUrl("");
                    setUploadedPdfName("");
                  }}
                  className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingInvoices}
                  onClick={handleSaveInvoices}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {savingInvoices ? <RefreshCw size={13} className="animate-spin text-white" /> : <Check size={13} />}
                  <span>{savingInvoices ? "Saving Invoices..." : `Confirm & Ingest ${parsedInvoices.length} Invoices`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Credit Notes AI Extraction Preview */}
      {showCreditNotePreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-5xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-zinc-950">Credit Notes AI Extraction Review</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-[#0B57D0] border border-blue-200 font-mono">
                    {detectedCnPeriod || currentPeriod}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                  {uploadedCnPdfName && (
                    <span className="font-mono text-zinc-700 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[280px]">
                      {uploadedCnPdfName}
                    </span>
                  )}
                  <span>• {parsedCreditNotes.length} credit note(s) detected • {parsedCreditNotes.reduce((acc, cn) => acc + (cn.items?.length || 0), 0)} total return line items</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowCreditNotePreviewModal(false);
                  setParsedCreditNotes([]);
                  setUploadedCnPdfUrl("");
                  setUploadedCnPdfName("");
                }} 
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex flex-col gap-4 bg-[#F8F9FA]">
              {parsedCreditNotes.map((cn, cnIdx) => (
                <div key={cnIdx} className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                  {/* Credit Note Header */}
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-zinc-900 font-mono">
                        CN No: {cn.cn_no || "(Not specified)"}
                      </span>
                      <span className="text-xs text-zinc-500 font-medium">
                        Date: {cn.cn_date || "—"}
                      </span>
                      {cn.page_number && (
                        <span className="text-[11px] text-zinc-400 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          Page {cn.page_number}
                        </span>
                      )}
                    </div>

                    {/* Customer Status & Matching */}
                    <div className="flex items-center gap-2">
                      {!cn.is_unregistered && cn.buyer_code ? (
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] text-emerald-800">
                          <Check size={11} className="text-emerald-600" />
                          <span>Matched: <strong>[{cn.buyer_code}] {cn.buyer_name}</strong> ({cn.channel})</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] text-amber-800 font-medium">
                            <AlertTriangle size={11} className="text-amber-600" />
                            <span>Unregistered: "{cn.customer_name}"</span>
                          </div>

                          {/* Quick Assign Buyer Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveAssignBuyerCnIndex(activeAssignBuyerCnIndex === cnIdx ? null : cnIdx)}
                              className="h-6 px-2 rounded bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <span>Assign Existing</span>
                              <ChevronDown size={10} />
                            </button>

                            {activeAssignBuyerCnIndex === cnIdx && (
                              <div className="absolute right-0 top-7 z-30 w-64 bg-white rounded-lg border border-slate-200 shadow-xl p-2 max-h-48 overflow-y-auto">
                                <span className="text-[10px] text-zinc-400 font-semibold px-2 py-1 block">SELECT REGISTERED BUYER</span>
                                {buyersList.map((b) => (
                                  <button
                                    key={b.id || b.buyer_code}
                                    type="button"
                                    onClick={() => handleAssignBuyerInCnPreview(cnIdx, b)}
                                    className="w-full text-left px-2 py-1.5 rounded hover:bg-blue-50 text-xs text-zinc-800 flex flex-col cursor-pointer"
                                  >
                                    <span className="font-medium truncate">{b.buyer_name}</span>
                                    <span className="text-[10px] text-zinc-400 font-mono">[{b.buyer_code}] • {b.channel}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Create Buyer Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setNewBuyerName(cn.customer_name);
                              setNewBuyerCode(cn.customer_name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 10).toUpperCase());
                              setNewBuyerChannel("Retailer");
                              setShowAddBuyerModal(true);
                            }}
                            className="h-6 px-2 rounded bg-[#0B57D0] hover:bg-[#0842A0] text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={10} />
                            <span>Register New</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/60 text-zinc-500 font-medium border-b border-slate-200 text-[11px]">
                          <th className="py-2 px-3 w-10 text-center">#</th>
                          <th className="py-2 px-3 min-w-[120px]">Code (Credit Note)</th>
                          <th className="py-2 px-3 min-w-[150px]">SKU Assigned</th>
                          <th className="py-2 px-3 min-w-[200px]">Description</th>
                          <th className="py-2 px-3 text-right w-24">Reject Qty</th>
                          <th className="py-2 px-3 text-right w-24">Unit Price</th>
                          <th className="py-2 px-3 text-right w-28">CN Amount</th>
                          <th className="py-2 px-3 text-center w-28">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cn.items.map((it: any, itemIdx: number) => {
                          return (
                            <tr key={itemIdx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-3 text-center text-zinc-400 font-mono text-[11px]">
                                {itemIdx + 1}
                              </td>
                              <td className="py-2 px-3 font-mono text-zinc-700">
                                {it.product_code ? (
                                  <span className="font-semibold text-zinc-800">{it.product_code}</span>
                                ) : (
                                  <span className="text-zinc-400 italic text-[11px]">(No Code)</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {it.product_sku ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-semibold text-[#0B57D0]">{it.product_sku}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleAssignSkuInCnPreview(cnIdx, itemIdx, "")}
                                      className="text-zinc-400 hover:text-red-500 text-[10px] cursor-pointer"
                                      title="Clear assigned SKU"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <select
                                      value=""
                                      onChange={(e) => handleAssignSkuInCnPreview(cnIdx, itemIdx, e.target.value)}
                                      className="h-6 px-1.5 border border-slate-300 rounded text-[11px] bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] cursor-pointer max-w-[130px]"
                                    >
                                      <option value="">(Blank SKU)</option>
                                      {productsList.map((p) => (
                                        <option key={p.sku} value={p.sku}>
                                          {p.sku} - {p.display_name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-zinc-800">
                                <span className="font-medium">{it.description}</span>
                                {it.product_name && it.product_name !== it.description && (
                                  <span className="text-[10px] text-zinc-400 block">{it.product_name}</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-zinc-800 font-semibold">
                                {it.qty} {it.uom}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-zinc-800">
                                ${Number(it.unit_price || 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-medium text-zinc-900">
                                -${Number(it.amount || 0).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {it.validation_status === "valid" ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Valid
                                  </span>
                                ) : it.validation_status === "unregistered_buyer" ? (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    Unreg Buyer
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                    Unmapped SKU
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-zinc-500 font-medium">
                Reject returns deduct from demand and are strictly excluded from Sales by Brand reports.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreditNotePreviewModal(false);
                    setParsedCreditNotes([]);
                    setUploadedCnPdfUrl("");
                    setUploadedCnPdfName("");
                  }}
                  className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingCreditNotes}
                  onClick={handleSaveCreditNotes}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {savingCreditNotes ? <RefreshCw size={13} className="animate-spin text-white" /> : <Check size={13} />}
                  <span>{savingCreditNotes ? "Ingesting..." : `Confirm & Ingest ${parsedCreditNotes.length} Credit Notes`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Individual Row Invoice Breakdown */}
      {selectedInvoiceBreakdownRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Invoice & CN Breakdown</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {selectedInvoiceBreakdownRow.buyer_name} • {selectedInvoiceBreakdownRow.product_sku || selectedInvoiceBreakdownRow.product_name}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedInvoiceBreakdownRow(null)} 
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-auto max-h-80">
              <div className="text-xs font-semibold text-zinc-700 mb-2">Demand Invoices</div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-zinc-500 font-medium border-b border-slate-200 text-[11px]">
                    <th className="py-1.5 px-2">Invoice No</th>
                    <th className="py-1.5 px-2">Date</th>
                    <th className="py-1.5 px-2 text-right">Qty</th>
                    <th className="py-1.5 px-2 text-right">Unit Price</th>
                    <th className="py-1.5 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {Array.isArray(selectedInvoiceBreakdownRow.invoices) && selectedInvoiceBreakdownRow.invoices.length > 0 ? (
                    selectedInvoiceBreakdownRow.invoices.map((inv: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 text-[#0B57D0] font-semibold">{inv.invoice_no}</td>
                        <td className="py-2 px-2 text-zinc-600">{inv.invoice_date}</td>
                        <td className="py-2 px-2 text-right text-zinc-800 font-semibold">{inv.qty}</td>
                        <td className="py-2 px-2 text-right text-zinc-600">${Number(inv.unit_price || 0).toFixed(2)}</td>
                        <td className="py-2 px-2 text-right text-zinc-900 font-semibold">${Number(inv.amount || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-3 text-center text-zinc-400 text-xs">
                        No invoice breakdown details available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {Array.isArray(selectedInvoiceBreakdownRow.credit_notes) && selectedInvoiceBreakdownRow.credit_notes.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="text-xs font-semibold text-zinc-900 mb-2 flex items-center gap-1.5">
                    <span>Credit Notes / Rejects</span>
                    <span className="text-[10px] bg-slate-100 text-zinc-700 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                      {selectedInvoiceBreakdownRow.credit_notes.length}
                    </span>
                  </div>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-zinc-500 font-medium border-b border-slate-200 text-[11px]">
                        <th className="py-1.5 px-2">CN No</th>
                        <th className="py-1.5 px-2">Date</th>
                        <th className="py-1.5 px-2 text-right">Reject Qty</th>
                        <th className="py-1.5 px-2 text-right">Unit Price</th>
                        <th className="py-1.5 px-2 text-right">CN Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {selectedInvoiceBreakdownRow.credit_notes.map((cn: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-2 text-zinc-900 font-semibold">{cn.cn_no}</td>
                          <td className="py-2 px-2 text-zinc-600">{cn.cn_date}</td>
                          <td className="py-2 px-2 text-right text-zinc-800 font-semibold">{cn.qty}</td>
                          <td className="py-2 px-2 text-right text-zinc-600">${Number(cn.unit_price || 0).toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-zinc-900 font-semibold">-${Number(cn.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedInvoiceBreakdownRow(null)}
                className="h-8 px-4 rounded-lg bg-zinc-900 hover:bg-black text-white text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quick Register Buyer */}
      {showAddBuyerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-visible flex flex-col animate-in zoom-in-95 duration-100">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Register New Buyer</h2>
                <p className="text-xs text-zinc-500">Add to isolated Sell-In Buyers Master</p>
              </div>
              <button type="button" onClick={() => setShowAddBuyerModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-medium text-zinc-700 block mb-1">Buyer Code / CustCode</label>
                  <input
                    type="text"
                    value={newBuyerCode}
                    onChange={(e) => setNewBuyerCode(e.target.value)}
                    placeholder="e.g. 3000/F011 or TIKTOK_SHOP1"
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>

                <div>
                  <label className="font-medium text-zinc-700 block mb-1">Payment Term</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newBuyerPaymentTerm}
                      onChange={(e) => setNewBuyerPaymentTerm(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="90"
                      className="w-full h-8 pl-2.5 pr-12 border border-slate-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:border-[#0B57D0]"
                    />
                    <span className="absolute right-2.5 text-xs text-zinc-400 pointer-events-none select-none">
                      days
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-medium text-zinc-700 block mb-1">Buyer / Company Name</label>
                <input
                  type="text"
                  value={newBuyerName}
                  onChange={(e) => setNewBuyerName(e.target.value)}
                  placeholder="e.g. FairPrice Supermarket"
                  className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* Sales Channel Dropdown with ample z-index and overflow-visible */}
              <div className="relative z-30">
                <label className="font-medium text-zinc-700 block mb-1">Sales Channel</label>
                <CustomSelect
                  value={newBuyerChannel}
                  onChange={setNewBuyerChannel}
                  options={buyersChannelSelectOptions}
                  className="w-full"
                  minWidth="w-full"
                />
              </div>

              {/* Store Groups & Outlets Dynamic Builder */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 flex flex-col gap-2.5 mt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-zinc-800 text-xs">Store Groups & Outlets</span>
                    <p className="text-[11px] text-zinc-500">Add retail banners & outlet counts (e.g. FairPrice Supermarket, Cheers)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewBuyerStoreGroups((prev) => [...prev, { group_name: "", store_count: 1 }])}
                    className="h-6 px-2 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-[#0B57D0] text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus size={11} />
                    <span>Add Group</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-0.5">
                  {newBuyerStoreGroups.map((grp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        value={grp.group_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewBuyerStoreGroups((prev) => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], group_name: val };
                            return copy;
                          });
                        }}
                        placeholder="Group / Banner (e.g. Cheers, FairPrice Supermarket)"
                        className="flex-1 h-7 px-2 border border-slate-200 rounded text-xs text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] text-zinc-400">Stores:</span>
                        <input
                          type="number"
                          min="1"
                          value={grp.store_count}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setNewBuyerStoreGroups((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], store_count: val };
                              return copy;
                            });
                          }}
                          className="w-16 h-7 px-1.5 border border-slate-200 rounded text-xs font-mono text-center text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
                        />
                      </div>
                      {newBuyerStoreGroups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewBuyerStoreGroups((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-1 text-zinc-400 hover:text-red-600 rounded cursor-pointer"
                          title="Remove Group"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-1 border-t border-slate-200/80">
                  <span>Total Groups: <strong>{newBuyerStoreGroups.filter(g => g.group_name.trim().length > 0).length || 1}</strong></span>
                  <span>Total Outlets: <strong>{newBuyerStoreGroups.reduce((acc, curr) => acc + (Number(curr.store_count) || 1), 0)} stores</strong></span>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 rounded-b-xl">
              <button
                type="button"
                onClick={() => setShowAddBuyerModal(false)}
                className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingNewBuyer || !newBuyerCode.trim() || !newBuyerName.trim()}
                onClick={() => handleQuickRegisterBuyer(newBuyerCode.trim(), newBuyerName.trim(), newBuyerChannel, newBuyerPaymentTerm, newBuyerStoreGroups)}
                className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {savingNewBuyer ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save Buyer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Assign Sales Channel */}
      {showAssignChannelModal && assignChannelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-visible animate-in zoom-in-95 duration-100 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Assign Sales Channel</h2>
                <p className="text-xs text-zinc-500">Categorize this buyer demand into a registered sales channel.</p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowAssignChannelModal(false);
                  setAssignChannelTarget(null);
                }} 
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3.5 text-xs">
              {/* Buyer Context Card */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium text-[11px]">Buyer:</span>
                  <span className="font-semibold text-zinc-900">{assignChannelTarget.buyer_name || assignChannelTarget.buyer_code}</span>
                </div>
                {assignChannelTarget.buyer_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium text-[11px]">Buyer Code / ID:</span>
                    <span className="font-mono text-zinc-700">{assignChannelTarget.buyer_code}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium text-[11px]">Current Channel:</span>
                  <span className="text-zinc-700 font-medium">{assignChannelTarget.channel || "Retailer"}</span>
                </div>
              </div>

              {/* Registered Channel Selector with high stacking and compact height */}
              <div className="relative z-30">
                <label className="font-medium text-zinc-700 block mb-1">
                  Assign to Registered Channel <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  value={selectedAssignChannel}
                  onChange={setSelectedAssignChannel}
                  options={channelsList.map((ch) => ({
                    label: ch.channel_name,
                    value: ch.channel_name
                  }))}
                  placeholder="Select registered channel..."
                  className="w-full"
                  minWidth="w-full"
                  maxHeight="max-h-40"
                  placement="auto"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Only registered channels from the <b>Buyers & Channels</b> directory are available.
                </p>
              </div>

              {/* Checkbox Option: Apply to all rows for this buyer */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 cursor-pointer text-zinc-700">
                <input
                  type="checkbox"
                  checked={applyChannelToAllBuyerRows}
                  onChange={(e) => setApplyChannelToAllBuyerRows(e.target.checked)}
                  className="rounded border-slate-300 text-[#0B57D0] focus:ring-0 mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-zinc-800">
                    Apply to all rows for this buyer in {formatPeriodLabel(currentPeriod)}
                  </span>
                  <span className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                    Updates all demand items matching "{assignChannelTarget.buyer_name || assignChannelTarget.buyer_code}".
                  </span>
                </div>
              </label>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowAssignChannelModal(false);
                  setAssignChannelTarget(null);
                }}
                className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAssignChannel || !selectedAssignChannel}
                onClick={handleSaveAssignChannel}
                className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {savingAssignChannel ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save Channel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add SKU to Listing Sheet */}
      {showAddSkuModal && addSkuTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Add SKU to Listing Sheet</h2>
                <p className="text-xs text-zinc-500">Map SKU into buyer's listing to set standard cost</p>
              </div>
              <button type="button" onClick={() => setShowAddSkuModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 text-xs">
              <div>
                <label className="font-medium text-zinc-700 block mb-1">Target Listing Sheet</label>
                <CustomSelect
                  value={addSkuTarget.sheet_id}
                  onChange={(val) => setAddSkuTarget({ ...addSkuTarget, sheet_id: val })}
                  options={sheetsList.map((s) => ({ label: `${s.name} (${s.id})`, value: s.id }))}
                  className="w-full"
                  minWidth="w-full"
                />
              </div>

              <div>
                <label className="font-medium text-zinc-700 block mb-1">Product SKU</label>
                <input
                  type="text"
                  disabled
                  value={addSkuTarget.product_sku}
                  className="w-full h-8 px-2.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-medium text-zinc-700"
                />
              </div>

              <div>
                <label className="font-medium text-zinc-700 block mb-1">Product Name</label>
                <input
                  type="text"
                  value={addSkuTarget.product_name}
                  onChange={(e) => setAddSkuTarget({ ...addSkuTarget, product_name: e.target.value })}
                  className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div>
                <label className="font-medium text-zinc-700 block mb-1">Cost Price to Buyer ($/pcs)</label>
                <input
                  type="number"
                  step="0.01"
                  value={addSkuTarget.cost_price}
                  onChange={(e) => setAddSkuTarget({ ...addSkuTarget, cost_price: Number(e.target.value || 0) })}
                  className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:border-[#0B57D0]"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddSkuModal(false)}
                className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAddSku || !addSkuTarget.sheet_id}
                onClick={handleAddSkuToListing}
                className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                {savingAddSku ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Add to Listing</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Buyers Excel Import Preview */}
      {showBuyersImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Import Buyers Preview</h2>
                <p className="text-xs text-zinc-500">{importedBuyers.length} buyers parsed from Excel</p>
              </div>
              <button type="button" onClick={() => setShowBuyersImportModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-zinc-500 font-medium border-b border-slate-200">
                    <th className="py-1.5 px-2">Code</th>
                    <th className="py-1.5 px-2">Name</th>
                    <th className="py-1.5 px-2">Channel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importedBuyers.map((b, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-2 font-mono font-medium text-[#0B57D0]">{b.buyer_code}</td>
                      <td className="py-1.5 px-2 font-medium text-zinc-800">{b.buyer_name}</td>
                      <td className="py-1.5 px-2">{b.channel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBuyersImportModal(false)}
                className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importingBuyers}
                onClick={handleSubmitBuyersImport}
                className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs"
              >
                {importingBuyers ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Import All</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4D. MODAL: RESET BUYER SALES WITH TYPED CONFIRMATION      */}
      {/* ========================================================= */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-visible animate-in fade-in zoom-in-95 duration-100">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-red-50/50 shrink-0 rounded-t-xl">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle size={16} />
                <h2 className="text-sm font-bold">Reset Buyer Sell-In Records</h2>
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
                  options={[
                    { label: `⚠️ All Retailers (Entire Month: ${currentPeriod})`, value: "__all__" },
                    ...existingDataBuyers.map((b) => ({ label: b.label, value: b.value }))
                  ]}
                  placeholder={existingDataBuyers.length === 0 ? "No buyers with data in this period" : "Select Buyer with data..."}
                  className="w-full"
                />
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 space-y-1">
                <p className="font-bold">⚠️ Warning: Irreversible Action</p>
                <p className="text-[11px]">
                  All sell-in records {resetBuyer === "__all__" ? `for all buyers in ${currentPeriod} and uploaded PDF document(s)` : <>for <span className="font-semibold">{resetBuyer || "the selected buyer"}</span> in {currentPeriod}</>} will be permanently removed.
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
                  className="w-full h-8 px-3 border border-red-300 rounded-lg text-xs font-mono focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-red-50/30"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 rounded-b-xl">
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


      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmConfig.open}
        onOpenChange={(open) => setConfirmConfig((prev) => ({ ...prev, open }))}
        title={confirmConfig.title}
        description={confirmConfig.description}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
