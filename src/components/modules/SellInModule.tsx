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
  Download,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Printer,
  SlidersHorizontal,
  DollarSign,
  RotateCcw,
  ChevronUp,
  BarChart3,
  Eye,
  EyeOff
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { PDFDocument } from "pdf-lib";

const API_BASE = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface PdfChunk {
  blob: Blob;
  fileName: string;
  startPage: number;
  endPage: number;
  totalPages: number;
}

// Split large multi-page PDFs into batches of 8 pages to prevent AI timeouts & token overflow
async function splitPdfIntoChunks(
  file: File,
  chunkSize: number = 8
): Promise<PdfChunk[]> {
  const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
  if (!isPdf) {
    return [{
      blob: file,
      fileName: file.name,
      startPage: 1,
      endPage: 1,
      totalPages: 1
    }];
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();

    if (totalPages <= chunkSize) {
      return [{
        blob: file,
        fileName: file.name,
        startPage: 1,
        endPage: totalPages,
        totalPages
      }];
    }

    const chunks: PdfChunk[] = [];
    for (let i = 0; i < totalPages; i += chunkSize) {
      const end = Math.min(i + chunkSize, totalPages);
      const subDoc = await PDFDocument.create();
      const pageIndices: number[] = [];
      for (let p = i; p < end; p++) {
        pageIndices.push(p);
      }
      const copiedPages = await subDoc.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => subDoc.addPage(page));
      const subPdfBytes = await subDoc.save();
      const subBlob = new Blob([subPdfBytes as any], { type: "application/pdf" });
      chunks.push({
        blob: subBlob,
        fileName: `${file.name.replace(/\.pdf$/i, "")}_p${i + 1}-${end}.pdf`,
        startPage: i + 1,
        endPage: end,
        totalPages
      });
    }

    return chunks;
  } catch (err) {
    console.warn("Failed to split PDF with pdf-lib, falling back to full file:", err);
    return [{
      blob: file,
      fileName: file.name,
      startPage: 1,
      endPage: 1,
      totalPages: 1
    }];
  }
}

function normalizeBuyerName(name?: string | null): string {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

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

const getSingaporeCurrentPeriod = (): string => {
  const now = new Date();
  const sgtDate = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return sgtDate.toISOString().slice(0, 7);
};

const ITEM_TYPES = [
  {
    value: "product",
    label: "Product",
    shortLabel: "Product",
    description: "Standard physical merchandise for inventory resale. Included in demand quantities.",
    badgeClass: "bg-slate-100 text-zinc-700 border-slate-200/90 hover:bg-slate-200/70"
  },
  {
    value: "settlement",
    label: "Settlement (Consignment / Payout)",
    shortLabel: "Settlement",
    description: "Lump-sum sales settlement or platform payout (e.g. TikTok, Retailer Consignment). Demand qty is 0.",
    badgeClass: "bg-slate-100 text-zinc-700 border-slate-200/90 hover:bg-slate-200/70"
  },
  {
    value: "rebate",
    label: "Sale Rebate / Discount",
    shortLabel: "Sale Rebate",
    description: "Invoice line rebates, trade discounts, or promotional allowances. Demand qty is 0.",
    badgeClass: "bg-slate-100 text-zinc-700 border-slate-200/90 hover:bg-slate-200/70"
  },
  {
    value: "fee",
    label: "Reg / Listing Fee",
    shortLabel: "Reg / Fee",
    description: "Slotting fees, registration charges, or administrative fees. Demand qty is 0.",
    badgeClass: "bg-slate-100 text-zinc-700 border-slate-200/90 hover:bg-slate-200/70"
  },
  {
    value: "service",
    label: "Delivery / Service Charge",
    shortLabel: "Delivery",
    description: "Transportation, pallet charges, or delivery handling fee. Demand qty is 0.",
    badgeClass: "bg-slate-100 text-zinc-700 border-slate-200/90 hover:bg-slate-200/70"
  },
  {
    value: "bcrs",
    label: "BCRS (Container Return Scheme)",
    shortLabel: "BCRS",
    description: "Beverage Container Return Scheme deposit/mark ($0.10). Demand qty is 0.",
    badgeClass: "bg-slate-100 text-zinc-700 border-slate-200/90 hover:bg-slate-200/70"
  }
];

interface SellInModuleProps {
  profile?: any;
}

export function SellInModule({ profile }: SellInModuleProps) {
  // Global Month Filter initialized to Singapore active current month
  const [currentPeriod, setCurrentPeriod] = React.useState<string>(() => {
    return getSingaporeCurrentPeriod();
  });

  const isCurrentActiveMonth = currentPeriod === getSingaporeCurrentPeriod();
  const isFutureMonth = currentPeriod > getSingaporeCurrentPeriod();

  // Missing Invoices Modal State (Track Order health check)
  const [showMissingInvoicesModal, setShowMissingInvoicesModal] = React.useState<boolean>(false);
  const [missingInvoicesList, setMissingInvoicesList] = React.useState<any[]>([]);

  // TopBar Tab Switcher State: "sellin" | "buyers" | "products" | "reports"
  const [activeMainTab, setActiveMainTab] = React.useState<"sellin" | "buyers" | "products" | "reports">("sellin");

  // Temporary Products State
  const [tempProductsList, setTempProductsList] = React.useState<any[]>([]);
  const [loadingTempProducts, setLoadingTempProducts] = React.useState<boolean>(false);
  const [productSearch, setProductSearch] = React.useState<string>("");
  const [productBrandFilter, setProductBrandFilter] = React.useState<string>("all");
  const [productTypeFilter, setProductTypeFilter] = React.useState<"all" | "master" | "temp">("all");

  // Add / Edit Temp Product Modal State
  const [showTempProductModal, setShowTempProductModal] = React.useState<boolean>(false);
  const [editingTempProduct, setEditingTempProduct] = React.useState<any | null>(null);
  const [tempProductSku, setTempProductSku] = React.useState<string>("");
  const [tempProductName, setTempProductName] = React.useState<string>("");
  const [tempProductBrand, setTempProductBrand] = React.useState<string>("");
  const [tempProductCostPrice, setTempProductCostPrice] = React.useState<string>("0");
  const [tempProductRemarks, setTempProductRemarks] = React.useState<string>("");
  const [savingTempProduct, setSavingTempProduct] = React.useState<boolean>(false);

  // Print Reports State
  const [availableYears, setAvailableYears] = React.useState<string[]>([]);
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
  const [selectedPrintLayout, setSelectedPrintLayout] = React.useState<string | null>(null);

  // Brand Store Group Mapping Modal States (Only when buyer has >1 store group)
  const [showBrandStoreModal, setShowBrandStoreModal] = React.useState<boolean>(false);
  const [brandStoreModalAction, setBrandStoreModalAction] = React.useState<"pdf" | "excel" | "edit_only">("edit_only");
  const [loadingBrandStoreMapping, setLoadingBrandStoreMapping] = React.useState<boolean>(false);
  const [brandStoreAssignments, setBrandStoreAssignments] = React.useState<
    Array<{
      brand_name: string;
      buyer_code: string;
      buyer_name: string;
      channel: string;
      available_groups: Array<{ group_name: string; store_count: number }>;
      selected_groups: string[];
      assigned_store_count: number;
    }>
  >([]);
  const [savingBrandStoreMapping, setSavingBrandStoreMapping] = React.useState<boolean>(false);
  const [newTagInput, setNewTagInput] = React.useState<Record<string, { name: string; count: number }>>({});

  // Dynamic Year Options: only show years that actually have Sell-In data
  const yearSelectOptions = React.useMemo(() => {
    if (availableYears.length === 0) {
      const currentY = String(reportSelectedYear || new Date().getFullYear());
      return [{ label: currentY, value: currentY }];
    }
    return availableYears.map((y) => ({ label: y, value: y }));
  }, [availableYears, reportSelectedYear]);

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
  const [sheetItemsList, setSheetItemsList] = React.useState<any[]>([]);
  const [productsList, setProductsList] = React.useState<any[]>([]);
  const [brandsList, setBrandsList] = React.useState<any[]>([]);

  // Sub-filter tab in Sell-In view
  const [subFilterTab, setSubFilterTab] = React.useState<"all" | "si" | "cn" | "non_sales" | "unresolved">("all");
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [channelFilter, setChannelFilter] = React.useState<string>("all");
  const [brandFilter, setBrandFilter] = React.useState<string>("all");

  // Buyers Tab States
  const [buyersSearch, setBuyersSearch] = React.useState<string>("");
  const [buyersChannelFilter, setBuyersChannelFilter] = React.useState<string>("all");
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);
  const [buyerDrafts, setBuyerDrafts] = React.useState<Record<string, { buyer_code: string; buyer_name: string; channel: string }>>({});
  const [savingBuyers, setSavingBuyers] = React.useState<boolean>(false);

  // Edit Buyer Modal State
  const [showEditBuyerModal, setShowEditBuyerModal] = React.useState<boolean>(false);
  const [editingBuyer, setEditingBuyer] = React.useState<any | null>(null);
  const [editBuyerCode, setEditBuyerCode] = React.useState<string>("");
  const [editBuyerName, setEditBuyerName] = React.useState<string>("");
  const [editBuyerChannel, setEditBuyerChannel] = React.useState<string>("");
  const [editBuyerPaymentTerm, setEditBuyerPaymentTerm] = React.useState<string>("90");
  const [editBuyerStoreGroups, setEditBuyerStoreGroups] = React.useState<Array<{ group_name: string; store_count: number }>>([
    { group_name: "", store_count: 1 }
  ]);
  const [savingEditBuyer, setSavingEditBuyer] = React.useState<boolean>(false);

  // Channels Management Modal
  const [showChannelModal, setShowChannelModal] = React.useState<boolean>(false);
  const [newChannelName, setNewChannelName] = React.useState<string>("");
  const [newChannelDesc, setNewChannelDesc] = React.useState<string>("");
  const [savingChannel, setSavingChannel] = React.useState<boolean>(false);

  // Invoices PDF Parsing & Import States
  const [parsingInvoices, setParsingInvoices] = React.useState<boolean>(false);
  const [parsingStatusText, setParsingStatusText] = React.useState<string>("");
  const [parsingProgress, setParsingProgress] = React.useState<number>(0);
  const [parsedInvoices, setParsedInvoices] = React.useState<any[]>([]);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = React.useState<boolean>(false);
  const [uploadedPdfUrl, setUploadedPdfUrl] = React.useState<string>("");
  const [uploadedPdfName, setUploadedPdfName] = React.useState<string>("");
  const [detectedPeriod, setDetectedPeriod] = React.useState<string>("");
  const [savingInvoices, setSavingInvoices] = React.useState<boolean>(false);
  const [selectedInvoiceBreakdownRow, setSelectedInvoiceBreakdownRow] = React.useState<any | null>(null);
  const [activeAssignBuyerInvoiceIndex, setActiveAssignBuyerInvoiceIndex] = React.useState<number | null>(null);
  const [togglingInvoiceIdx, setTogglingInvoiceIdx] = React.useState<number | null>(null);
  const [showMonthPickerModal, setShowMonthPickerModal] = React.useState<boolean>(false);
  const [monthPickerYear, setMonthPickerYear] = React.useState<number>(() => {
    const parts = (currentPeriod || "").split("-");
    return parts[0] ? Number(parts[0]) : new Date().getFullYear();
  });

  // Credit Notes PDF Parsing & Import States
  const [parsingCreditNotes, setParsingCreditNotes] = React.useState<boolean>(false);
  const [parsingCnStatusText, setParsingCnStatusText] = React.useState<string>("");
  const [parsingCnProgress, setParsingCnProgress] = React.useState<number>(0);
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
  const [newBuyerChannel, setNewBuyerChannel] = React.useState<string>("");
  const [newBuyerPaymentTerm, setNewBuyerPaymentTerm] = React.useState<string>("3");
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

  // Assign Master Product SKU Modal State
  const [showAssignProductModal, setShowAssignProductModal] = React.useState<boolean>(false);
  const [assignProductTarget, setAssignProductTarget] = React.useState<any | null>(null);
  const [selectedMasterSku, setSelectedMasterSku] = React.useState<string>("");
  const [applyProductToAllMatchingRows, setApplyProductToAllMatchingRows] = React.useState<boolean>(true);
  const [productSearchTerm, setProductSearchTerm] = React.useState<string>("");
  const [savingAssignProduct, setSavingAssignProduct] = React.useState<boolean>(false);

  // Assign / Edit Item Type Modal State (Product / Rebate / Fee / Service)
  const [showAssignItemTypeModal, setShowAssignItemTypeModal] = React.useState<boolean>(false);
  const [assignItemTypeTarget, setAssignItemTypeTarget] = React.useState<any | null>(null);
  const [selectedItemType, setSelectedItemType] = React.useState<string>("product");
  const [isItemTypeDropdownOpen, setIsItemTypeDropdownOpen] = React.useState<boolean>(false);
  const [applyItemTypeToAllMatching, setApplyItemTypeToAllMatching] = React.useState<boolean>(true);
  const [savingAssignItemType, setSavingAssignItemType] = React.useState<boolean>(false);

  // Price Mismatch Modal State
  const [showPriceMismatchModal, setShowPriceMismatchModal] = React.useState<boolean>(false);
  const [priceMismatchTarget, setPriceMismatchTarget] = React.useState<any | null>(null);
  const [savingUpdateListingPrice, setSavingUpdateListingPrice] = React.useState<boolean>(false);

  // Snapshot Cost Price Modal State (This Month Only)
  const [showCostSnapshotModal, setShowCostSnapshotModal] = React.useState<boolean>(false);
  const [costSnapshotTarget, setCostSnapshotTarget] = React.useState<any | null>(null);
  const [editingCostPrice, setEditingCostPrice] = React.useState<string>("");
  const [isEditingCostPrice, setIsEditingCostPrice] = React.useState<boolean>(false);
  const [savingCostSnapshot, setSavingCostSnapshot] = React.useState<boolean>(false);

  // Settlement Breakdown Modal State
  const [showSettlementModal, setShowSettlementModal] = React.useState<boolean>(false);
  const [settlementTarget, setSettlementTarget] = React.useState<any | null>(null);
  const [settlementItemsList, setSettlementItemsList] = React.useState<Array<{
    sku: string;
    description: string;
    qty: number;
    unit_cost: number;
    total_cost: number;
  }>>([]);
  const [settlementFileName, setSettlementFileName] = React.useState<string>("");
  const [savingSettlementItems, setSavingSettlementItems] = React.useState<boolean>(false);
  const settlementFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // View Mode: "summary" (Default when Published) vs "details" (Line-by-line items)
  const [sellinViewMode, setSellinViewMode] = React.useState<"summary" | "details">("details");
  const [summaryBuyerSearch, setSummaryBuyerSearch] = React.useState<string>("");
  const [summarySkuSearch, setSummarySkuSearch] = React.useState<string>("");
  const [expandedBuyerKeys, setExpandedBuyerKeys] = React.useState<Record<string, boolean>>({});

  // Confirmation dialog
  const [confirmConfig, setConfirmConfig] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText?: string;
    variant?: "danger" | "default" | "dark" | "primary";
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    variant: "dark",
    onConfirm: () => {},
  });

  // Fetch all batch & Sell-In details
  const fetchBatchDetails = React.useCallback(async (period: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/batch-details?period=${encodeURIComponent(period)}`);
      if (res.ok) {
        const data = await res.json();
        const batch = data.batch || null;
        setBatchData(batch);
        if (batch?.status === "published") {
          setSellinViewMode("summary");
        } else {
          setSellinViewMode("details");
        }
        setRecords(Array.isArray(data.records) ? data.records : []);
        setBuyersList(Array.isArray(data.buyers) ? data.buyers : []);
        setChannelsList(Array.isArray(data.channels) ? data.channels : []);
        setSheetsList(Array.isArray(data.sheets) ? data.sheets : []);
        setSheetItemsList(Array.isArray(data.sheet_items) ? data.sheet_items : []);
        setProductsList(Array.isArray(data.products) ? data.products : []);
        setBrandsList(Array.isArray(data.brands) ? data.brands : []);
        if (Array.isArray(data.temp_products)) {
          setTempProductsList(data.temp_products);
        }

        // Check if Track Order has deliver orders missing invoices >3 days for active month (exclude return orders)
        if (data.is_current_active_month && Array.isArray(data.live_data?.over_3_days_missing)) {
          const deliverOrdersOnly = data.live_data.over_3_days_missing.filter((item: any) => {
            const ordId = String(item.id || "").trim();
            const ordType = String(item.type || "").trim().toLowerCase();
            return !ordId.startsWith("RET-") && ordType !== "return";
          });
          if (deliverOrdersOnly.length > 0 && !sessionStorage.getItem(`dismissed_missing_${period}`)) {
            setMissingInvoicesList(deliverOrdersOnly);
            setShowMissingInvoicesModal(true);
          }
        }
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

  // Fetch temporary products independently
  const fetchTempProducts = React.useCallback(async () => {
    try {
      setLoadingTempProducts(true);
      const res = await fetch(`${API_BASE}/api/sellin/temp-products`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.temp_products)) {
          setTempProductsList(data.temp_products);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch temp products:", err);
    } finally {
      setLoadingTempProducts(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeMainTab === "products") {
      fetchTempProducts();
    }
  }, [activeMainTab, fetchTempProducts]);

  // Fetch only years that actually have Sell-In data
  const fetchAvailableYears = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sellin/available-years`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.years) && data.years.length > 0) {
          setAvailableYears(data.years);
          return;
        }
      }
      // Fallback: fetch distinct years from batches
      const bRes = await fetch(`${API_BASE}/api/sellin/batches`);
      if (bRes.ok) {
        const batches = await bRes.json();
        if (Array.isArray(batches)) {
          const distinctYears = Array.from(
            new Set(
              batches
                .map((b: any) => b.period?.split("-")?.[0])
                .filter((y: any) => y && /^\d{4}$/.test(y))
            )
          ).sort().reverse() as string[];
          if (distinctYears.length > 0) {
            setAvailableYears(distinctYears);
          }
        }
      }
    } catch (err) {
      console.warn("Could not fetch available years:", err);
    }
  }, []);

  React.useEffect(() => {
    fetchAvailableYears();
  }, [fetchAvailableYears]);

  React.useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(String(reportSelectedYear))) {
      setReportSelectedYear(Number(availableYears[0]));
    }
  }, [availableYears, reportSelectedYear]);

  React.useEffect(() => {
    if (activeMainTab === "reports") {
      fetchAvailableYears();
    }
  }, [activeMainTab, fetchAvailableYears]);

  React.useEffect(() => {
    fetchBatchDetails(currentPeriod);
  }, [currentPeriod, fetchBatchDetails]);

  // Global Refresh event
  React.useEffect(() => {
    const handleDbRefresh = () => {
      fetchBatchDetails(currentPeriod, false);
      fetchAvailableYears();
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [fetchBatchDetails, fetchAvailableYears, currentPeriod]);

  // TopBar Tabs Integration (Sell-In Demand | Buyers & Channels | Product List | Print Report)
  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("set-topbar-tabs", {
        detail: {
          tabs: [
            { id: "sellin", label: "Sell-In Demand" },
            { id: "buyers", label: "Buyers & Channels" },
            { id: "products", label: "Product List" },
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
      if (
        customEvent.detail === "sellin" ||
        customEvent.detail === "buyers" ||
        customEvent.detail === "products" ||
        customEvent.detail === "reports"
      ) {
        setActiveMainTab(customEvent.detail as "sellin" | "buyers" | "products" | "reports");
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
    if (currentPeriod >= getSingaporeCurrentPeriod()) {
      showToast("Future periods cannot be previewed.", "info");
      return;
    }
    const [y, m] = currentPeriod.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const nextY = nextDate.getFullYear();
    const nextM = String(nextDate.getMonth() + 1).padStart(2, "0");
    const target = `${nextY}-${nextM}`;
    if (target > getSingaporeCurrentPeriod()) {
      showToast("Future periods cannot be previewed.", "info");
      return;
    }
    setCurrentPeriod(target);
  };

  const openMonthPicker = () => {
    const parts = (currentPeriod || "").split("-");
    const y = parts[0] ? Number(parts[0]) : new Date().getFullYear();
    setMonthPickerYear(y);
    setShowMonthPickerModal(true);
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
    let nonSalesCount = 0;
    let totalCost = 0;

    records.forEach((r) => {
      const isSettlement = r.item_type === "settlement";
      const isNonProduct = r.item_type && r.item_type !== "product" && !isSettlement;
      const dQty = (isNonProduct || isSettlement) ? 0 : Number(r.demand_qty ?? r.quantity ?? 0);
      const cQty = (isNonProduct || isSettlement) ? 0 : Number(r.reject_qty ?? r.cn_quantity ?? 0);
      const netQty = dQty - cQty;
      const cPrice = (isNonProduct || isSettlement) ? 0 : Number(r.cost_price || 0);
      totalCost += Math.max(0, netQty) * cPrice;

      grossDemand += Number(r.total_demand || 0);
      demandQty += dQty;
      cnAmount += Number(r.cn_amount || 0);
      cnQty += cQty;

      if (isSettlement) {
        // Settlement counts towards sales demand revenue, 0 pcs, not a non-sales fee, valid
      } else if (isNonProduct) {
        nonSalesCount++;
      } else {
        const isDirectConsumer = 
          String(r.channel || "").trim().toLowerCase() === "direct consumer" ||
          String(r.buyer_name || "").toLowerCase().startsWith("cash sales");
        const isRegisteredInDb = buyersList.some((b) => 
          (r.buyer_code && (b.buyer_code === r.buyer_code || b.id === r.buyer_code)) ||
          (b.buyer_name && r.buyer_name && (
            b.buyer_name.trim().toLowerCase() === r.buyer_name.trim().toLowerCase() ||
            normalizeBuyerName(b.buyer_name) === normalizeBuyerName(r.buyer_name)
          ))
        );
        const isUnresolvedBuyer = !isDirectConsumer && (r.validation_status === "unregistered_buyer" || !isRegisteredInDb);
        const isNoListing = !isDirectConsumer && !isUnresolvedBuyer && r.validation_status === "no_listing";
        const isUnmappedSku = !isUnresolvedBuyer && r.validation_status === "unmapped_sku";
        if (isUnresolvedBuyer || isNoListing || isUnmappedSku || r.has_price_mismatch) {
          unresolvedCount++;
        }
      }
    });

    const netAmount = grossDemand - cnAmount;
    const grossProfit = netAmount - totalCost;
    const marginPercent = netAmount > 0 ? (grossProfit / netAmount) * 100 : 0;
    return { grossDemand, demandQty, cnAmount, cnQty, netAmount, unresolvedCount, nonSalesCount, totalCost, grossProfit, marginPercent };
  }, [records, buyersList]);

  // Distinct Brands from records (excluding unbranded)
  const availableBrands = React.useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const b = (r.brand || "").trim();
      const isUnbranded = !b || 
        b.toLowerCase() === "unassigned" || 
        b.toLowerCase() === "unassigned brand" || 
        b.toLowerCase() === "unbrand" || 
        b.toLowerCase() === "unbranded" || 
        b.toLowerCase() === "(unassigned)" ||
        b.toLowerCase() === "unassigned brands";
      if (b && !isUnbranded) set.add(b);
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
      const isSettlement = r.item_type === "settlement";
      const isNonProduct = r.item_type && r.item_type !== "product" && !isSettlement;
      if (subFilterTab === "si") {
        if (isNonProduct) return false;
        if (isSettlement) {
          if (Number(r.total_demand || 0) <= 0) return false;
        } else {
          if (Number(r.quantity || 0) <= 0) return false;
        }
      }
      if (subFilterTab === "cn" && (isNonProduct || isSettlement || Number(r.cn_amount || 0) <= 0)) return false;
      if (subFilterTab === "non_sales" && (!isNonProduct || isSettlement)) return false;
      if (subFilterTab === "unresolved") {
        if (isNonProduct || isSettlement) return false;
        const isDirectConsumer = 
          String(r.channel || "").trim().toLowerCase() === "direct consumer" ||
          String(r.buyer_name || "").toLowerCase().startsWith("cash sales");
        const isRegisteredInDb = buyersList.some((b) => 
          (r.buyer_code && (b.buyer_code === r.buyer_code || b.id === r.buyer_code)) ||
          (b.buyer_name && r.buyer_name && (
            b.buyer_name.trim().toLowerCase() === r.buyer_name.trim().toLowerCase() ||
            normalizeBuyerName(b.buyer_name) === normalizeBuyerName(r.buyer_name)
          ))
        );
        const isUnresolvedBuyer = !isDirectConsumer && (r.validation_status === "unregistered_buyer" || !isRegisteredInDb);
        const isNoListing = !isDirectConsumer && !isUnresolvedBuyer && r.validation_status === "no_listing";
        const isUnmappedSku = !isUnresolvedBuyer && r.validation_status === "unmapped_sku";
        const isMismatch = Boolean(r.has_price_mismatch);
        if (!isUnresolvedBuyer && !isNoListing && !isUnmappedSku && !isMismatch) return false;
      }

      if (channelFilter !== "all" && r.channel !== channelFilter) return false;
      if (brandFilter !== "all" && r.brand !== brandFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const buyer = String(r.buyer_name || "").toLowerCase();
        const bcode = String(r.buyer_code || "").toLowerCase();
        const sku = String(r.product_sku || "").toLowerCase();
        const name = String(r.product_name || "").toLowerCase();
        const brand = String(r.brand || "").toLowerCase();
        const itType = String(r.item_type || "").toLowerCase();
        if (!buyer.includes(q) && !bcode.includes(q) && !sku.includes(q) && !name.includes(q) && !brand.includes(q) && !itType.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [records, subFilterTab, channelFilter, brandFilter, searchTerm, buyersList]);

  // Compiled Summary Datamart: pre-aggregated figures, expected cash collection, buyers & SKUs
  const compiledSummaryData = React.useMemo(() => {
    if (batchData?.sellin_summary?.buyers_summary && batchData?.sellin_summary?.sku_summary) {
      return batchData.sellin_summary;
    }

    const calcColl = (pStr: string, tStr: string) => {
      const parts = (pStr || "").split("-").map(Number);
      const y = parts[0] || new Date().getFullYear();
      const m = parts[1] || (new Date().getMonth() + 1);
      const t = Math.max(0, parseInt(String(tStr || "3").replace(/[^0-9]/g, ""), 10) || 0);
      const d = new Date(Date.UTC(y, m - 1, 15));
      d.setUTCDate(d.getUTCDate() + t);
      const cY = d.getUTCFullYear();
      const cM = String(d.getUTCMonth() + 1).padStart(2, "0");
      const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        period: `${cY}-${cM}`,
        label: `${mNames[d.getUTCMonth()]} ${cY}`
      };
    };

    const buyerTermMap = new Map<string, any>();
    (buyersList || []).forEach((b: any) => {
      const term = String(b.payment_term || "90").replace(/[^0-9]/g, "") || "90";
      const info = {
        term,
        buyer_name: String(b.buyer_name || b.name || "").trim(),
        buyer_code: String(b.buyer_code || b.code || "").trim(),
        channel: String(b.channel || "").trim()
      };
      if (b.buyer_code) buyerTermMap.set(String(b.buyer_code).trim().toLowerCase(), info);
      if (b.buyer_name) buyerTermMap.set(String(b.buyer_name).trim().toLowerCase(), info);
      if (b.id) buyerTermMap.set(String(b.id).trim().toLowerCase(), info);
    });

    const skuMap = new Map<string, any>();
    const buyerMap = new Map<string, any>();
    const collMap = new Map<string, any>();

    let totalDemandQty = 0;
    let totalDemandAmount = 0;
    let totalCnQty = 0;
    let totalCnAmount = 0;
    let totalNonSalesAmount = 0;
    let netAmount = 0;
    let totalCostAmount = 0;

    (records || []).forEach((r: any) => {
      const isSettlement = r.item_type === "settlement";
      const isNonProduct = r.item_type && r.item_type !== "product" && !isSettlement;
      const dQty = (isNonProduct || isSettlement) ? 0 : Number(r.demand_qty ?? r.quantity ?? 0);
      const cQty = (isNonProduct || isSettlement) ? 0 : Number(r.reject_qty ?? r.cn_quantity ?? 0);
      const netQty = dQty - cQty;
      const up = Number(r.unit_price || 0);
      const dAmt = (isNonProduct || isSettlement) ? Number(r.total_demand || 0) : dQty * up;
      const cAmt = Number(r.cn_amount || 0);
      const nAmt = dAmt - cAmt;
      const cPrice = (isNonProduct || isSettlement) ? 0 : Number(r.cost_price || 0);
      const rowCost = (isNonProduct || isSettlement) ? 0 : (Math.max(0, netQty) * cPrice);

      if (isNonProduct) {
        totalNonSalesAmount += dAmt;
      } else {
        totalDemandQty += dQty;
        totalCnQty += cQty;
      }
      totalDemandAmount += dAmt;
      totalCnAmount += cAmt;
      netAmount += nAmt;
      totalCostAmount += rowCost;

      const skuCode = String(r.product_sku || "").trim();
      const bBrand = String(r.brand || "Unassigned Brand").trim();

      if (!isNonProduct && skuCode) {
        let s = skuMap.get(skuCode);
        if (!s) {
          s = {
            sku: skuCode,
            name: r.product_name || skuCode,
            brand: bBrand,
            demand_qty: 0,
            reject_qty: 0,
            net_qty: 0,
            gross_amount: 0,
            cn_amount: 0,
            net_amount: 0,
            unit_cost: cPrice,
            total_cost: 0,
            gross_profit: 0,
            margin_percent: 0
          };
        }
        s.demand_qty += dQty;
        s.reject_qty += cQty;
        s.net_qty += netQty;
        s.gross_amount += dAmt;
        s.cn_amount += cAmt;
        s.net_amount += nAmt;
        s.total_cost += rowCost;
        if (cPrice > 0 && !s.unit_cost) s.unit_cost = cPrice;
        s.gross_profit = s.net_amount - s.total_cost;
        s.margin_percent = s.net_amount > 0 ? (s.gross_profit / s.net_amount) * 100 : 0;
        skuMap.set(skuCode, s);
      }

      const bCode = String(r.buyer_code || "").trim();
      const bName = String(r.buyer_name || bCode || "Unknown Buyer").trim();
      const bKey = (bCode || bName).toLowerCase();
      const isRegistered = buyerTermMap.has(bKey) || buyerTermMap.has(bCode.toLowerCase()) || buyerTermMap.has(bName.toLowerCase());
      const bInfo = buyerTermMap.get(bKey) || buyerTermMap.get(bCode.toLowerCase()) || buyerTermMap.get(bName.toLowerCase()) || {
        term: "3", // For unregistered buyer, payment term is 3 days
        buyer_name: bName,
        buyer_code: bCode,
        channel: r.channel || ""
      };

      const term = bInfo.term || (isRegistered ? "90" : "3");
      const { period: collPeriod, label: collLabel } = calcColl(currentPeriod, term);

      let bEntry = buyerMap.get(bKey);
      if (!bEntry) {
        bEntry = {
          buyer_code: bInfo.buyer_code || bCode,
          buyer_name: bInfo.buyer_name || bName,
          channel: r.channel || bInfo.channel || "",
          payment_term: term,
          expected_collection_period: collPeriod,
          expected_collection_label: collLabel,
          demand_qty: 0,
          demand_amount: 0,
          reject_qty: 0,
          reject_amount: 0,
          non_sales_amount: 0,
          net_amount: 0,
          items: new Map<string, any>(),
          non_sales_items: []
        };
      }

      if (isNonProduct) {
        bEntry.non_sales_amount += dAmt;
        bEntry.net_amount += nAmt;
        bEntry.non_sales_items.push({
          item_type: r.item_type,
          description: r.product_name || "Charge / Fee",
          amount: dAmt
        });
      } else {
        bEntry.demand_qty += dQty;
        bEntry.demand_amount += dAmt;
        bEntry.reject_qty += cQty;
        bEntry.reject_amount += cAmt;
        bEntry.net_amount += nAmt;

        const buyerSku = skuCode || r.product_name;
        const bItem = bEntry.items.get(buyerSku) || {
          sku: skuCode,
          name: r.product_name || skuCode,
          brand: bBrand,
          qty: 0,
          reject_qty: 0,
          net_qty: 0,
          unit_price: up,
          total_demand: 0,
          cn_amount: 0,
          nett_amount: 0
        };
        bItem.qty += dQty;
        bItem.reject_qty += cQty;
        bItem.net_qty += netQty;
        bItem.total_demand += dAmt;
        bItem.cn_amount += cAmt;
        bItem.nett_amount += nAmt;
        bEntry.items.set(buyerSku, bItem);
      }
      buyerMap.set(bKey, bEntry);

      const coll = collMap.get(collPeriod) || {
        period: collPeriod,
        label: collLabel,
        amount: 0,
        buyer_count: 0,
        buyers: []
      };
      coll.amount += nAmt;
      const dispName = bInfo.buyer_name || bName;
      if (!coll.buyers.includes(dispName)) {
        coll.buyers.push(dispName);
        coll.buyer_count = coll.buyers.length;
      }
      collMap.set(collPeriod, coll);
    });

    const buyersSummary = Array.from(buyerMap.values())
      .sort((a, b) => b.net_amount - a.net_amount)
      .map((b) => ({
        ...b,
        items: Array.from(b.items.values()).sort((x: any, y: any) => y.nett_amount - x.nett_amount)
      }));

    const skuSummary = Array.from(skuMap.values()).sort((a, b) => b.net_amount - a.net_amount);
    const cashCollectionTimeline = Array.from(collMap.values()).sort((a, b) => a.period.localeCompare(b.period));

    const grossProfit = netAmount - totalCostAmount;
    const marginPercent = netAmount > 0 ? (grossProfit / netAmount) * 100 : 0;

    return {
      period: currentPeriod,
      total_demand_qty: totalDemandQty,
      total_demand_amount: totalDemandAmount,
      total_cn_qty: totalCnQty,
      total_cn_amount: totalCnAmount,
      total_non_sales_amount: totalNonSalesAmount,
      total_net_qty: totalDemandQty - totalCnQty,
      net_amount: netAmount,
      total_cost_amount: totalCostAmount,
      gross_profit: grossProfit,
      margin_percent: marginPercent,
      buyers_summary: buyersSummary,
      sku_summary: skuSummary,
      cash_collection_timeline: cashCollectionTimeline
    };
  }, [batchData, records, buyersList, currentPeriod]);

  // Summary filtered buyers
  const filteredSummaryBuyers = React.useMemo(() => {
    const list = compiledSummaryData?.buyers_summary || [];
    if (!summaryBuyerSearch.trim()) return list;
    const q = summaryBuyerSearch.toLowerCase().trim();
    return list.filter((b: any) =>
      String(b.buyer_code || "").toLowerCase().includes(q) ||
      String(b.buyer_name || "").toLowerCase().includes(q) ||
      String(b.channel || "").toLowerCase().includes(q)
    );
  }, [compiledSummaryData, summaryBuyerSearch]);

  // Summary filtered SKUs
  const filteredSummarySkus = React.useMemo(() => {
    const list = compiledSummaryData?.sku_summary || [];
    if (!summarySkuSearch.trim()) return list;
    const q = summarySkuSearch.toLowerCase().trim();
    return list.filter((s: any) =>
      String(s.sku || "").toLowerCase().includes(q) ||
      String(s.product_name || "").toLowerCase().includes(q) ||
      String(s.brand || "").toLowerCase().includes(q)
    );
  }, [compiledSummaryData, summarySkuSearch]);

  // Toggle expanded state for buyer items in summary
  const toggleBuyerExpand = (key: string) => {
    setExpandedBuyerKeys((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Handle Tax Invoice PDF/Image Upload and AI Parsing with 8-page batching
  const handleInvoicePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      showToast("Only 1 master PDF file is allowed per upload. Processing first file.", "info");
    }

    const file = files[0];
    setParsingInvoices(true);
    setParsingProgress(0);
    setParsingStatusText(`Preparing ${file.name}...`);

    try {
      const allExtractedInvoices: any[] = [];
      let latestFileUrl = "";
      let latestFileName = file.name;
      let detectedPeriodStr = "";

      // 1. Inspect single PDF and split multi-page PDF into 8-page batches
      setParsingStatusText(`Inspecting ${file.name}...`);
      const chunks = await splitPdfIntoChunks(file, 8);
      const filePlans: { file: File; chunks: PdfChunk[] }[] = [{ file, chunks }];

      const totalChunksAcrossFiles = filePlans.reduce((sum, fp) => sum + fp.chunks.length, 0);
      let completedChunks = 0;

      // 2. Process each 8-page batch sequentially
      for (const { file, chunks } of filePlans) {
        const totalPages = chunks[0]?.totalPages || 1;
        let fileOriginalUrl = "";

        // Pre-upload the FULL complete PDF to R2 so all pages are preserved intact
        try {
          const preUploadFd = new FormData();
          preUploadFd.append("file", file);
          preUploadFd.append("period", currentPeriod || "general");
          preUploadFd.append("type", "invoice");
          const preRes = await fetch(`${API_BASE}/api/sellin/upload-file`, {
            method: "POST",
            body: preUploadFd
          });
          if (preRes.ok) {
            const preData = await preRes.json();
            if (preData.file_url) {
              fileOriginalUrl = preData.file_url;
              latestFileUrl = fileOriginalUrl;
              latestFileName = file.name;
            }
          }
        } catch (uploadErr) {
          console.warn("Failed to pre-upload full PDF to R2, falling back to chunk upload:", uploadErr);
        }

        for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
          const chunk = chunks[cIdx];
          const progressPercent = Math.round(((completedChunks) / totalChunksAcrossFiles) * 100);
          setParsingProgress(progressPercent);

          if (totalPages > 1) {
            setParsingStatusText(
              `Analyzing ${file.name}: Processing pages ${chunk.startPage}–${chunk.endPage} of ${totalPages} (${progressPercent}%)...`
            );
          } else {
            setParsingStatusText(
              `Analyzing document ${completedChunks + 1} of ${totalChunksAcrossFiles}: ${file.name}...`
            );
          }

          const formData = new FormData();
          formData.append("file", chunk.blob, chunk.fileName);
          formData.append("period", currentPeriod);
          if (fileOriginalUrl) {
            formData.append("original_file_url", fileOriginalUrl);
          }

          const res = await fetch(`${API_BASE}/api/sellin/parse-invoice-pdf`, {
            method: "POST",
            body: formData
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Failed to parse pages ${chunk.startPage}–${chunk.endPage} of ${file.name}`);
          }

          const data = await res.json();
          if (data.success && Array.isArray(data.invoices)) {
            allExtractedInvoices.push(...data.invoices);
            if (!fileOriginalUrl && data.file_url) {
              fileOriginalUrl = data.file_url;
            }
            latestFileUrl = fileOriginalUrl || data.file_url || latestFileUrl;
            latestFileName = file.name;
            if (data.suggested_period && !detectedPeriodStr) {
              detectedPeriodStr = data.suggested_period;
            }
          }

          completedChunks++;
          setParsingProgress(Math.round((completedChunks / totalChunksAcrossFiles) * 100));
        }
      }

      if (allExtractedInvoices.length === 0) {
        showToast("No invoices or line items could be detected in the provided file(s).", "error");
        return;
      }

      // 3. Merge multi-page invoices with same invoice_no across chunks
      const mergedInvoicesMap = new Map<string, any>();
      for (const inv of allExtractedInvoices) {
        const key = inv.invoice_no ? String(inv.invoice_no).trim() : `${inv.customer_name}_${inv.invoice_date}_${Math.random()}`;
        if (mergedInvoicesMap.has(key)) {
          const existing = mergedInvoicesMap.get(key);
          existing.items = [...(existing.items || []), ...(inv.items || [])];
          existing.page_number = `${existing.page_number}, ${inv.page_number}`;
        } else {
          mergedInvoicesMap.set(key, { ...inv });
        }
      }
      const finalInvoices = Array.from(mergedInvoicesMap.values());

      setParsedInvoices(finalInvoices);
      setUploadedPdfUrl(latestFileUrl);
      setUploadedPdfName(latestFileName);
      setDetectedPeriod(detectedPeriodStr || currentPeriod);
      setShowInvoicePreviewModal(true);
      showToast(`Detected ${finalInvoices.length} invoice(s) with AI! Review items below.`, "success");
    } catch (err: any) {
      console.error("Invoice upload error:", err);
      showToast(err.message || "Failed to process invoices", "error");
    } finally {
      setParsingInvoices(false);
      setParsingProgress(0);
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
      targetInv.channel = buyer.channel || "";
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
        fetchAvailableYears();
      } else {
        showToast(data.error || "Failed to save invoices", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to save invoices", "error");
    } finally {
      setSavingInvoices(false);
    }
  };

  // Upload and parse Credit Notes (PDF / Image) with Gemini AI in 8-page batches
  const handleCreditNotePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      showToast("Only 1 credit note PDF file is allowed per upload. Processing first file.", "info");
    }

    const file = files[0];
    setParsingCreditNotes(true);
    setParsingCnProgress(0);
    setParsingCnStatusText(`Preparing ${file.name}...`);

    try {
      const allExtractedCns: any[] = [];
      let latestFileUrl = "";
      let latestFileName = file.name;
      let detectedPeriodStr = "";

      // 1. Inspect single PDF and split multi-page PDF into 8-page batches
      setParsingCnStatusText(`Inspecting ${file.name}...`);
      const chunks = await splitPdfIntoChunks(file, 8);
      const filePlans: { file: File; chunks: PdfChunk[] }[] = [{ file, chunks }];

      const totalChunksAcrossFiles = filePlans.reduce((sum, fp) => sum + fp.chunks.length, 0);
      let completedChunks = 0;

      // 2. Process each 8-page batch sequentially
      for (const { file, chunks } of filePlans) {
        const totalPages = chunks[0]?.totalPages || 1;
        let fileOriginalUrl = "";

        // Pre-upload the FULL complete Credit Note PDF to R2 so all pages are preserved intact
        try {
          const preUploadFd = new FormData();
          preUploadFd.append("file", file);
          preUploadFd.append("period", currentPeriod || "general");
          preUploadFd.append("type", "credit_note");
          const preRes = await fetch(`${API_BASE}/api/sellin/upload-file`, {
            method: "POST",
            body: preUploadFd
          });
          if (preRes.ok) {
            const preData = await preRes.json();
            if (preData.file_url) {
              fileOriginalUrl = preData.file_url;
              latestFileUrl = fileOriginalUrl;
              latestFileName = file.name;
            }
          }
        } catch (uploadErr) {
          console.warn("Failed to pre-upload full CN PDF to R2, falling back to chunk upload:", uploadErr);
        }

        for (let cIdx = 0; cIdx < chunks.length; cIdx++) {
          const chunk = chunks[cIdx];
          const progressPercent = Math.round((completedChunks / totalChunksAcrossFiles) * 100);
          setParsingCnProgress(progressPercent);

          if (totalPages > 1) {
            setParsingCnStatusText(
              `Analyzing ${file.name}: Processing pages ${chunk.startPage}–${chunk.endPage} of ${totalPages} (${progressPercent}%)...`
            );
          } else {
            setParsingCnStatusText(
              `Analyzing credit note ${completedChunks + 1} of ${totalChunksAcrossFiles}: ${file.name}...`
            );
          }

          const formData = new FormData();
          formData.append("file", chunk.blob, chunk.fileName);
          formData.append("period", currentPeriod);
          if (fileOriginalUrl) {
            formData.append("original_file_url", fileOriginalUrl);
          }

          const res = await fetch(`${API_BASE}/api/sellin/parse-creditnote-pdf`, {
            method: "POST",
            body: formData
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Failed to parse pages ${chunk.startPage}–${chunk.endPage} of ${file.name}`);
          }

          const data = await res.json();
          if (data.success && Array.isArray(data.credit_notes)) {
            allExtractedCns.push(...data.credit_notes);
            if (!fileOriginalUrl && data.file_url) {
              fileOriginalUrl = data.file_url;
            }
            latestFileUrl = fileOriginalUrl || data.file_url || latestFileUrl;
            latestFileName = file.name;
            if (data.suggested_period && !detectedPeriodStr) {
              detectedPeriodStr = data.suggested_period;
            }
          }

          completedChunks++;
          setParsingCnProgress(Math.round((completedChunks / totalChunksAcrossFiles) * 100));
        }
      }

      if (allExtractedCns.length === 0) {
        showToast("No credit notes or returned goods could be detected in the provided file(s).", "error");
        return;
      }

      // 3. Merge multi-page credit notes with same cn_no across chunks
      const mergedCnMap = new Map<string, any>();
      for (const cn of allExtractedCns) {
        const key = cn.cn_no ? String(cn.cn_no).trim() : `${cn.customer_name}_${cn.cn_date}_${Math.random()}`;
        if (mergedCnMap.has(key)) {
          const existing = mergedCnMap.get(key);
          existing.items = [...(existing.items || []), ...(cn.items || [])];
          existing.page_number = `${existing.page_number}, ${cn.page_number}`;
        } else {
          mergedCnMap.set(key, { ...cn });
        }
      }
      const finalCns = Array.from(mergedCnMap.values());

      setParsedCreditNotes(finalCns);
      setUploadedCnPdfUrl(latestFileUrl);
      setUploadedCnPdfName(latestFileName);
      setDetectedCnPeriod(detectedPeriodStr || currentPeriod);
      setShowCreditNotePreviewModal(true);
      showToast(`Detected ${finalCns.length} credit note(s) with AI! Review return items below.`, "success");
    } catch (err: any) {
      console.error("Credit Note upload error:", err);
      showToast(err.message || "Failed to process credit notes", "error");
    } finally {
      setParsingCreditNotes(false);
      setParsingCnProgress(0);
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
      targetCn.channel = buyer.channel || "";
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
        fetchAvailableYears();
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
          channel: channel || "",
          payment_term: (payment_term || "3").replace(/[^0-9]/g, "") || "3",
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
        setNewBuyerPaymentTerm("3");
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
        setSellinViewMode("summary");
        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast(data.error || "Failed to publish batch", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Publish failed", "error");
    }
  };

  const handlePublishBatchWithConfirm = () => {
    setConfirmConfig({
      open: true,
      title: `Publish ${formatPeriodLabel(currentPeriod)} Sell-In`,
      description: `Are you sure you want to publish ${formatPeriodLabel(currentPeriod)} Sell-In? This will compile the official financial summary, cash collection timeline, and buyer breakdown.`,
      confirmText: "Publish",
      variant: "primary",
      onConfirm: async () => {
        await handlePublishBatch();
      }
    });
  };

  const [revokingBatch, setRevokingBatch] = React.useState<boolean>(false);
  const handleRevokePublish = () => {
    setConfirmConfig({
      open: true,
      title: "Revoke Published Batch",
      description: `Are you sure you want to revoke ${formatPeriodLabel(currentPeriod)} back to Draft Inflow? This will unlock the month, allow row editing, and restore the Reset button.`,
      onConfirm: async () => {
        setRevokingBatch(true);
        try {
          const res = await fetch(`${API_BASE}/api/sellin/revoke-publish`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              period: currentPeriod,
              user: profile?.full_name || profile?.email || "Admin"
            })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(data.message || `Revoked ${formatPeriodLabel(currentPeriod)} back to Draft Inflow!`, "success");
            setSellinViewMode("details");
            fetchBatchDetails(currentPeriod, true);
          } else {
            showToast(data.error || "Failed to revoke batch", "error");
          }
        } catch (e: any) {
          showToast(e.message || "Revoke error", "error");
        } finally {
          setRevokingBatch(false);
        }
      }
    });
  };

  // Open Reset Month Modal
  const handleOpenResetModal = () => {
    if (records.length === 0) {
      showToast("No Sell-In records exist in this period to reset", "error");
      return;
    }
    setResetConfirmText("");
    setShowResetModal(true);
  };

  // Confirm Month Reset
  const handleConfirmReset = async () => {
    const cleanConf = resetConfirmText.trim().toLowerCase();
    if (cleanConf !== "reset" && cleanConf !== `reset ${currentPeriod}`.toLowerCase()) {
      showToast(`Please type "reset" to confirm`, "error");
      return;
    }

    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/reset-period?period=${encodeURIComponent(currentPeriod)}`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Reset all data for ${formatPeriodLabel(currentPeriod)}!`, "success");
        setShowResetModal(false);
        setResetConfirmText("");
        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast(data.error || "Failed to reset month data", "error");
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

  // =========================================================================
  // BRAND STORE GROUP MAPPING & REPORT GENERATORS
  // =========================================================================

  const groupedBrandStoreAssignments = React.useMemo(() => {
    const map = new Map<string, typeof brandStoreAssignments>();
    brandStoreAssignments.forEach((item) => {
      const b = item.brand_name;
      if (!map.has(b)) map.set(b, []);
      map.get(b)!.push(item);
    });
    return Array.from(map.entries()).map(([brandName, buyers]) => ({ brandName, buyers }));
  }, [brandStoreAssignments]);

  const handleToggleStoreGroup = (brandName: string, buyerCode: string, groupName: string) => {
    setBrandStoreAssignments((prev) =>
      prev.map((item) => {
        if (item.brand_name === brandName && item.buyer_code === buyerCode) {
          const isSelected = item.selected_groups.includes(groupName);
          const newSelected = isSelected
            ? item.selected_groups.filter((g) => g !== groupName)
            : [...item.selected_groups, groupName];

          const newCount = item.available_groups
            .filter((g) => newSelected.includes(g.group_name))
            .reduce((sum, g) => sum + (Number(g.store_count) || 0), 0);

          return {
            ...item,
            selected_groups: newSelected,
            assigned_store_count: newCount
          };
        }
        return item;
      })
    );
  };

  const handleUpdateStoreCount = (brandName: string, buyerCode: string, count: number) => {
    setBrandStoreAssignments((prev) =>
      prev.map((item) => {
        if (item.brand_name === brandName && item.buyer_code === buyerCode) {
          return {
            ...item,
            assigned_store_count: Math.max(0, count)
          };
        }
        return item;
      })
    );
  };

  const handleAddNewStoreTag = (brandName: string, buyerCode: string) => {
    const key = `${brandName}::${buyerCode}`;
    const draft = newTagInput[key];
    if (!draft || !draft.name.trim()) return;

    const tagName = draft.name.trim();
    const tagCount = Number(draft.count) || 1;

    setBrandStoreAssignments((prev) =>
      prev.map((item) => {
        if (item.brand_name === brandName && item.buyer_code === buyerCode) {
          const exists = item.available_groups.find((g) => g.group_name.toLowerCase() === tagName.toLowerCase());
          let nextAvailable = item.available_groups;
          if (!exists) {
            nextAvailable = [...item.available_groups, { group_name: tagName, store_count: tagCount }];
          }
          const nextSelected = item.selected_groups.includes(tagName)
            ? item.selected_groups
            : [...item.selected_groups, tagName];

          const nextCount = nextAvailable
            .filter((g) => nextSelected.includes(g.group_name))
            .reduce((sum, g) => sum + (Number(g.store_count) || 0), 0);

          return {
            ...item,
            available_groups: nextAvailable,
            selected_groups: nextSelected,
            assigned_store_count: nextCount
          };
        }
        return item;
      })
    );

    setNewTagInput((prev) => ({
      ...prev,
      [key]: { name: "", count: 1 }
    }));
  };

  // Compile & Open PDF in new tab
  const compileAndOpenPdf = async (data: any, existingTab?: Window | null) => {
    let newTab = existingTab;
    if (!newTab && typeof window !== "undefined") {
      newTab = window.open("", "_blank");
    }
    if (newTab && !newTab.closed) {
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

        const numMonths = periods.length;
        let channelWidth = 24;
        let buyerWidth = 65;
        let storesWidth = 15;
        let tableFontSize = 7.5;
        let headerFontSize = 7.5;

        if (numMonths >= 12) {
          channelWidth = 18;
          buyerWidth = 40;
          storesWidth = 12;
          tableFontSize = 6.2;
          headerFontSize = 6.5;
        } else if (numMonths >= 6) {
          channelWidth = 20;
          buyerWidth = 52;
          storesWidth = 14;
          tableFontSize = 7.0;
          headerFontSize = 7.2;
        } else {
          channelWidth = 24;
          buyerWidth = 65;
          storesWidth = 15;
          tableFontSize = 7.5;
          headerFontSize = 7.5;
        }

        // Header Row 1 & Row 2
        const headRow1: any[] = [
          { content: "CHANNEL", rowSpan: 2, styles: { halign: "center", valign: "middle", fillColor: [248, 250, 252], textColor: [24, 24, 27], fontStyle: "bold" } },
          { content: "BUYERS", rowSpan: 2, styles: { halign: "left", valign: "middle", fillColor: [248, 250, 252], textColor: [24, 24, 27], fontStyle: "bold" } },
          { content: "STORES", rowSpan: 2, styles: { halign: "center", valign: "middle", fillColor: [248, 250, 252], textColor: [24, 24, 27], fontStyle: "bold" } },
          { content: yearText, colSpan: periods.length * 2, styles: { halign: "center", valign: "middle", fillColor: [248, 250, 252], textColor: [24, 24, 27], fontStyle: "bold" } }
        ];

        const headRow2: any[] = periods.map((p: any) => ({
          content: p.label,
          colSpan: 2,
          styles: { halign: "center", valign: "middle", fillColor: [248, 250, 252], textColor: [24, 24, 27], fontStyle: "bold", fontSize: headerFontSize }
        }));

        // Group buyers by channel for clean rowSpan merging
        const channelGroups = new Map<string, any[]>();
        (brand.buyers || []).forEach((b: any) => {
          const ch = (b.channel || "Not Set").trim();
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
            row.push({
              content: b.buyer_name,
              styles: { halign: "left", overflow: "ellipsize" }
            });
            row.push({
              content: String(b.total_store || 1),
              styles: { halign: "center" }
            });

            periods.forEach((p: any) => {
              const m = b.monthly_data?.[p.period] || { qty: 0, amount: 0 };
              const isQtyZero = !m.qty || m.qty <= 0;
              const isAmountZero = !m.amount || m.amount <= 0;

              row.push({
                content: isQtyZero ? "" : m.qty.toLocaleString(),
                styles: {
                  halign: "right",
                  fillColor: isQtyZero ? [243, 244, 246] : [255, 255, 255]
                }
              });
              row.push({
                content: isAmountZero ? "" : `$ ${m.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                styles: {
                  halign: "right",
                  fillColor: isAmountZero ? [243, 244, 246] : [255, 255, 255]
                }
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
          const isTotQtyZero = !tot.qty || tot.qty <= 0;
          const isTotAmtZero = !tot.amount || tot.amount <= 0;

          totRow.push({
            content: isTotQtyZero ? "" : tot.qty.toLocaleString(),
            styles: {
              fontStyle: "bold",
              halign: "right",
              fillColor: isTotQtyZero ? [243, 244, 246] : [245, 247, 250]
            }
          });
          totRow.push({
            content: isTotAmtZero ? "" : `$ ${tot.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            styles: {
              fontStyle: "bold",
              halign: "right",
              fillColor: isTotAmtZero ? [243, 244, 246] : [245, 247, 250]
            }
          });
        });
        bodyRows.push(totRow);

        // Distribute remaining page width equally across all month columns
        // A4 landscape width = 297mm. Left margin = 14mm, right margin = 14mm. Usable width = 269mm.
        const totalUsableWidth = 297 - 14 - 14;
        const fixedLeftWidth = channelWidth + buyerWidth + storesWidth;
        const remainingForMonths = Math.max(totalUsableWidth - fixedLeftWidth, 50);
        // Each period has 2 columns: Qty and Amount. Total sub-columns = periods.length * 2.
        // We can allocate ~38% to Qty and ~62% to Amount for each month pair, or split evenly.
        const pairWidth = remainingForMonths / Math.max(periods.length, 1);
        const monthQtyWidth = Number((pairWidth * 0.38).toFixed(2));
        const monthAmtWidth = Number((pairWidth - monthQtyWidth).toFixed(2));

        const colStyles: Record<number, any> = {
          0: { cellWidth: channelWidth, halign: "center", fontStyle: "bold" },
          1: { cellWidth: buyerWidth, halign: "left", overflow: "ellipsize" },
          2: { cellWidth: storesWidth, halign: "center" }
        };

        periods.forEach((_: any, pIdx: number) => {
          const colQtyIdx = 3 + (pIdx * 2);
          const colAmtIdx = 3 + (pIdx * 2) + 1;
          colStyles[colQtyIdx] = { cellWidth: monthQtyWidth, halign: "right" };
          colStyles[colAmtIdx] = { cellWidth: monthAmtWidth, halign: "right" };
        });

        autoTable(doc, {
          startY: 19,
          head: [headRow1, headRow2],
          body: bodyRows,
          theme: "grid",
          styles: {
            font: "helvetica",
            fontSize: tableFontSize,
            cellPadding: 1.5,
            lineColor: [180, 185, 195],
            lineWidth: 0.2,
            textColor: [30, 41, 59]
          },
          columnStyles: colStyles,
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

  // Generate & Open Brand Sales Report PDF directly
  const handleGenerateReportPdf = async () => {
    if (generatingPdf) return;
    setGeneratingPdf(true);

    try {
      const endPeriod = `${reportSelectedYear}-${String(reportSelectedMonth).padStart(2, "0")}`;
      const res = await fetch(
        `${API_BASE}/api/sellin/report-by-brands?end_period=${encodeURIComponent(endPeriod)}&months=${reportDurationMonths}&brand=${encodeURIComponent(reportBrandFilter)}`
      );
      const data = await res.json();
      if (!res.ok || !data.success || !data.brands || data.brands.length === 0) {
        showToast("No sales records found for this period range", "error");
        setGeneratingPdf(false);
        return;
      }

      await compileAndOpenPdf(data);
    } catch (err: any) {
      showToast("Failed to compile report: " + err.message, "error");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Compile & Download Excel
  const compileAndDownloadExcel = async (data: any) => {
    try {
      const rows: any[] = [];
      const periods = data.period_columns || [];
      const endPeriod = `${reportSelectedYear}-${String(reportSelectedMonth).padStart(2, "0")}`;

      data.brands.forEach((brand: any) => {
        rows.push([brand.brand_name.toUpperCase()]);
        const row1: any[] = ["CHANNEL", "BUYERS", "STORES"];
        row1.push(data.year || reportSelectedYear);
        rows.push(row1);

        const row2: any[] = ["", "", ""];
        periods.forEach((p: any) => {
          row2.push(p.label);
          row2.push("");
        });
        rows.push(row2);

        brand.buyers.forEach((b: any) => {
          const bRow: any[] = [b.channel || "Not Set", b.buyer_name, b.total_store || 1];
          periods.forEach((p: any) => {
            const m = b.monthly_data?.[p.period] || { qty: 0, amount: 0 };
            bRow.push(m.qty || 0);
            bRow.push(m.amount || 0);
          });
          rows.push(bRow);
        });

        const totRow: any[] = ["TOTAL SALE PCS / AMOUNT", "", ""];
        periods.forEach((p: any) => {
          const tot = brand.totals_by_period?.[p.period] || { qty: 0, amount: 0 };
          totRow.push(tot.qty || 0);
          totRow.push(tot.amount || 0);
        });
        rows.push(totRow);

        rows.push([]);
        rows.push(["YTD", `${brand.ytd_days || data.ytd_days || 0} DAY`]);
        rows.push(["TOTAL SALE TY", brand.ytd_total_amount || 0]);
        rows.push(["TOTAL QTY TY", brand.ytd_total_qty || 0]);
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

  // Export Brand Sales Report to Excel directly
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
        setExportingExcel(false);
        return;
      }

      await compileAndDownloadExcel(data);
    } catch (err: any) {
      showToast("Failed to export Excel: " + err.message, "error");
    } finally {
      setExportingExcel(false);
    }
  };

  // Open Store Group Mapping Editor Modal
  const handleOpenEditStoreMapping = async () => {
    if (loadingBrandStoreMapping) return;
    setLoadingBrandStoreMapping(true);

    try {
      const endPeriod = `${reportSelectedYear}-${String(reportSelectedMonth).padStart(2, "0")}`;
      const [res, mapRes] = await Promise.all([
        fetch(
          `${API_BASE}/api/sellin/report-by-brands?end_period=${encodeURIComponent(endPeriod)}&months=${reportDurationMonths}&brand=${encodeURIComponent(reportBrandFilter)}`
        ),
        fetch(`${API_BASE}/api/sellin/brand-buyer-store-mappings`)
      ]);
      const data = await res.json();
      if (!res.ok || !data.success || !data.brands || data.brands.length === 0) {
        showToast("No brand sales records found for the selected period", "info");
        return;
      }

      const savedMappings: any[] = mapRes.ok ? (await mapRes.json()).mappings || [] : [];
      const multiGroupAssignments: any[] = [];
      const seenKeys = new Set<string>();

      data.brands.forEach((brand: any) => {
        (brand.buyers || []).forEach((b: any) => {
          const bCode = (b.buyer_code || "").trim();
          const bName = (b.buyer_name || "").trim();
          const matchedBuyer = buyersList.find((bl) =>
            (bCode && bl.buyer_code && String(bl.buyer_code).trim().toLowerCase() === bCode.toLowerCase()) ||
            (bName && bl.buyer_name && String(bl.buyer_name).trim().toLowerCase() === bName.toLowerCase())
          );

          if (matchedBuyer && Array.isArray(matchedBuyer.store_groups) && matchedBuyer.store_groups.length > 1) {
            const itemKey = `${brand.brand_name}::${bCode || bName}`;
            if (seenKeys.has(itemKey)) return;
            seenKeys.add(itemKey);

            const savedMap = savedMappings.find((m: any) =>
              String(m.brand_name || "").toLowerCase().trim() === String(brand.brand_name || "").toLowerCase().trim() &&
              ((bCode && String(m.buyer_code || "").toLowerCase().trim() === bCode.toLowerCase()) ||
               (bName && String(m.buyer_name || "").toLowerCase().trim() === bName.toLowerCase()))
            );

            let selectedGroups: string[] = [];
            let assignedCount = 0;

            if (savedMap && savedMap.assigned_store_count > 0) {
              selectedGroups = Array.isArray(savedMap.selected_groups) ? savedMap.selected_groups : [];
              assignedCount = Number(savedMap.assigned_store_count) || 0;
            } else {
              selectedGroups = matchedBuyer.store_groups.map((g: any) => g.group_name);
              assignedCount = matchedBuyer.store_groups.reduce((sum: number, g: any) => sum + (Number(g.store_count) || 0), 0);
            }

            multiGroupAssignments.push({
              brand_name: brand.brand_name,
              buyer_code: bCode || matchedBuyer.buyer_code || "",
              buyer_name: bName || matchedBuyer.buyer_name || "",
              channel: b.channel || matchedBuyer.channel || "",
              available_groups: matchedBuyer.store_groups,
              selected_groups: selectedGroups,
              assigned_store_count: assignedCount
            });
          }
        });
      });

      if (multiGroupAssignments.length === 0) {
        showToast("None of the buyers for the selected brands have multiple store groups.", "info");
        return;
      }

      setBrandStoreAssignments(multiGroupAssignments);
      setBrandStoreModalAction("edit_only");
      setShowBrandStoreModal(true);
    } catch (err: any) {
      showToast("Failed to load store group mapping: " + err.message, "error");
    } finally {
      setLoadingBrandStoreMapping(false);
    }
  };

  // Save brand store group mappings to backend database and proceed with PDF/Excel
  const handleSaveBrandStoreMappingsAndProceed = async () => {
    setSavingBrandStoreMapping(true);
    let newTab: Window | null = null;
    if (brandStoreModalAction === "pdf" && typeof window !== "undefined") {
      newTab = window.open("", "_blank");
      if (newTab) {
        newTab.document.title = "Generating Sales Report PDF...";
        newTab.document.body.innerHTML = `
          <div style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: #334155;">
            <div style="width: 32px; height: 32px; border: 3px solid #cbd5e1; border-top-color: #0B57D0; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <p style="margin-top: 16px; font-size: 14px; font-weight: 500;">Saving Store Mappings & Compiling PDF...</p>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
          </div>
        `;
      }
    }

    try {
      const saveRes = await fetch(`${API_BASE}/api/sellin/brand-buyer-store-mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappings: brandStoreAssignments.map((a) => ({
            brand_name: a.brand_name,
            buyer_code: a.buyer_code,
            buyer_name: a.buyer_name,
            selected_groups: a.selected_groups,
            assigned_store_count: a.assigned_store_count
          }))
        })
      });

      if (!saveRes.ok) {
        const errJson = await saveRes.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to persist mapping");
      }

      showToast("Store group mappings saved to database!", "success");
      setShowBrandStoreModal(false);

      if (brandStoreModalAction === "edit_only") {
        return;
      }

      // Re-fetch report data with newly saved mappings applied
      const endPeriod = `${reportSelectedYear}-${String(reportSelectedMonth).padStart(2, "0")}`;
      const res = await fetch(
        `${API_BASE}/api/sellin/report-by-brands?end_period=${encodeURIComponent(endPeriod)}&months=${reportDurationMonths}&brand=${encodeURIComponent(reportBrandFilter)}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (newTab) newTab.close();
        showToast(data.error || "Failed to load updated report data", "error");
        return;
      }

      if (brandStoreModalAction === "pdf") {
        await compileAndOpenPdf(data, newTab);
      } else {
        await compileAndDownloadExcel(data);
      }
    } catch (err: any) {
      if (newTab) newTab.close();
      showToast("Failed to save mappings: " + err.message, "error");
    } finally {
      setSavingBrandStoreMapping(false);
    }
  };

  // Proceed with current temporary values without saving to database
  const handleSkipAndProceed = async () => {
    setShowBrandStoreModal(false);
    let newTab: Window | null = null;
    if (brandStoreModalAction === "pdf" && typeof window !== "undefined") {
      newTab = window.open("", "_blank");
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

      // Apply in-memory store counts
      if (data.brands && Array.isArray(data.brands)) {
        data.brands.forEach((brand: any) => {
          (brand.buyers || []).forEach((b: any) => {
            const assignment = brandStoreAssignments.find((a) =>
              a.brand_name.toLowerCase().trim() === brand.brand_name.toLowerCase().trim() &&
              ((a.buyer_code && a.buyer_code.toLowerCase().trim() === (b.buyer_code || "").toLowerCase().trim()) ||
               (a.buyer_name && a.buyer_name.toLowerCase().trim() === (b.buyer_name || "").toLowerCase().trim()))
            );
            if (assignment && assignment.assigned_store_count > 0) {
              b.total_store = assignment.assigned_store_count;
            }
          });
        });
      }

      if (brandStoreModalAction === "pdf") {
        await compileAndOpenPdf(data, newTab);
      } else {
        await compileAndDownloadExcel(data);
      }
    } catch (err: any) {
      if (newTab) newTab.close();
      showToast("Failed to compile report: " + err.message, "error");
    } finally {
      setSavingBrandStoreMapping(false);
    }
  };

  // =============================================================
  // Temporary Products Handlers & Calculations
  // =============================================================
  const isSkuInMaster = React.useMemo(() => {
    const clean = tempProductSku.trim().toLowerCase();
    if (!clean) return false;
    return productsList.some((p: any) => {
      const s = String(p.sku || p.sku_number || p.id || "").trim().toLowerCase();
      return s === clean;
    });
  }, [tempProductSku, productsList]);

  const handleOpenAddTempProduct = () => {
    setEditingTempProduct(null);
    setTempProductSku("");
    setTempProductName("");
    setTempProductBrand(brandsList?.[0]?.display_name || brandsList?.[0]?.name || "");
    setTempProductCostPrice("0");
    setTempProductRemarks("");
    setShowTempProductModal(true);
  };

  const handleOpenEditTempProduct = (item: any) => {
    setEditingTempProduct(item);
    setTempProductSku(item.sku || "");
    setTempProductName(item.product_name || "");
    setTempProductBrand(item.brand || "");
    setTempProductCostPrice(String(item.cost_price ?? 0));
    setTempProductRemarks(item.remarks || "");
    setShowTempProductModal(true);
  };

  const handleSaveTempProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempProductSku.trim()) {
      showToast("SKU is required", "error");
      return;
    }
    if (!tempProductName.trim()) {
      showToast("Product name is required", "error");
      return;
    }
    if (isSkuInMaster) {
      showToast("This SKU already exists in Master Catalog", "error");
      return;
    }

    try {
      setSavingTempProduct(true);
      const res = await fetch(`${API_BASE}/api/sellin/temp-products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTempProduct?.id,
          sku: tempProductSku.trim(),
          product_name: tempProductName.trim(),
          brand: tempProductBrand.trim() || "Unassigned Brand",
          cost_price: parseFloat(tempProductCostPrice) || 0,
          remarks: tempProductRemarks.trim() || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save temporary product");
      }
      showToast(
        editingTempProduct ? "Temporary product updated" : "Temporary product added successfully",
        "success"
      );
      setShowTempProductModal(false);
      fetchTempProducts();
      fetchBatchDetails(currentPeriod, true);
    } catch (err: any) {
      showToast(err.message || "Failed to save temporary product", "error");
    } finally {
      setSavingTempProduct(false);
    }
  };

  const handleDeleteTempProduct = (item: any) => {
    setConfirmConfig({
      open: true,
      title: "Delete Temporary Product",
      description: `Are you sure you want to delete "${item.product_name}" (${item.sku})? Past Sell-In records will keep their existing data safely.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/sellin/temp-products/${encodeURIComponent(item.id)}`, {
            method: "DELETE"
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to delete temporary product");
          }
          showToast(`Temporary product ${item.sku} deleted`, "success");
          fetchTempProducts();
          fetchBatchDetails(currentPeriod, true);
        } catch (err: any) {
          showToast(err.message || "Failed to delete temporary product", "error");
        }
      }
    });
  };

  const productFilterBrands = React.useMemo(() => {
    const set = new Set<string>();
    brandsList.forEach((b: any) => {
      const name = b.display_name || b.name || b.brand_name;
      if (name) set.add(name);
    });
    tempProductsList.forEach((tp: any) => {
      if (tp.brand) set.add(tp.brand);
    });
    return Array.from(set).sort();
  }, [brandsList, tempProductsList]);

  const unifiedProductList = React.useMemo(() => {
    // 1. Master products
    const masterItems = (productsList || []).map((p: any) => {
      let bName = "Unassigned Brand";
      const bKey = String(p['Brands ID'] || p.brands_id || p.brand_id || p.brand || "").trim().toLowerCase();
      const matchedBrand = brandsList.find((b: any) => 
        String(b.id || "").toLowerCase() === bKey || 
        String(b.name || "").toLowerCase() === bKey ||
        String(b.display_name || "").toLowerCase() === bKey
      );
      if (matchedBrand) {
        bName = matchedBrand.display_name || matchedBrand.name || matchedBrand.brand_name || bKey;
      } else if (p.brand_name || p.brand) {
        bName = p.brand_name || p.brand;
      }

      // Cost price resolution: Check 'Cost', 'cost', 'Cost Price', 'cost_price', 'price'
      const rawCost = p.Cost !== undefined && p.Cost !== "" && p.Cost !== null
        ? Number(p.Cost)
        : (p.cost !== undefined && p.cost !== "" && p.cost !== null
          ? Number(p.cost)
          : (p['Cost Price'] !== undefined && p['Cost Price'] !== "" && p['Cost Price'] !== null
            ? Number(p['Cost Price'])
            : (p.cost_price !== undefined && p.cost_price !== "" && p.cost_price !== null
              ? Number(p.cost_price)
              : Number(p.price || 0))));

      let finalCost = isNaN(rawCost) ? 0 : rawCost;
      if ((!finalCost || finalCost === 0) && sheetItemsList && sheetItemsList.length > 0) {
        const sSkuLower = String(p.sku || p['SKU Number'] || p.sku_number || p.id || "").toLowerCase().trim();
        const matchedItem = sheetItemsList.find((si: any) => 
          (si.product_sku && String(si.product_sku).toLowerCase().trim() === sSkuLower) ||
          (si.retailer_sku && String(si.retailer_sku).toLowerCase().trim() === sSkuLower)
        );
        if (matchedItem) {
          finalCost = Number(matchedItem['Cost Price'] || matchedItem.cost_price || matchedItem.retailer_price || matchedItem.market_price || 0);
          if (isNaN(finalCost)) finalCost = 0;
        }
      }

      const masterSku = p.sku || p['SKU Number'] || p.sku_number || p.id || "";
      return {
        id: p.id || masterSku,
        sku: masterSku,
        product_name: p['Display Name'] || p.display_name || p.name || p.product_name || "—",
        brand: bName,
        cost_price: finalCost,
        remarks: null,
        is_temp: false
      };
    });

    // 2. Temp products
    const tempItems = (tempProductsList || []).map((tp: any) => ({
      id: tp.id || tp.sku,
      sku: tp.sku,
      product_name: tp.product_name,
      brand: tp.brand || "Unassigned Brand",
      cost_price: Number(tp.cost_price || 0),
      remarks: tp.remarks || null,
      is_temp: true
    }));

    // Combined
    let combined = [...masterItems, ...tempItems];

    // Filter by type
    if (productTypeFilter === "master") {
      combined = combined.filter((x) => !x.is_temp);
    } else if (productTypeFilter === "temp") {
      combined = combined.filter((x) => x.is_temp);
    }

    // Filter by brand
    if (productBrandFilter !== "all") {
      const bFilterLower = productBrandFilter.toLowerCase();
      combined = combined.filter((x) => x.brand.toLowerCase() === bFilterLower);
    }

    // Filter by search
    if (productSearch.trim()) {
      const term = productSearch.trim().toLowerCase();
      combined = combined.filter((x) => 
        x.sku.toLowerCase().includes(term) || 
        x.product_name.toLowerCase().includes(term) ||
        x.brand.toLowerCase().includes(term)
      );
    }

    // Sort alphabetically by product name
    return combined.sort((a, b) => a.product_name.localeCompare(b.product_name));
  }, [productsList, tempProductsList, productTypeFilter, productBrandFilter, productSearch, brandsList, sheetItemsList]);

  // Assign Sales Channel to Record(s)
  const handleSaveAssignChannel = async () => {
    if (!assignChannelTarget || !selectedAssignChannel) {
      showToast("Please select a sales channel", "error");
      return;
    }
    setSavingAssignChannel(true);
    try {
      const matchedBuyer = buyersList.find((b) => 
        (assignChannelTarget.buyer_code && (b.buyer_code === assignChannelTarget.buyer_code || b.id === assignChannelTarget.buyer_code)) ||
        (b.buyer_name && assignChannelTarget.buyer_name && b.buyer_name.trim().toLowerCase() === assignChannelTarget.buyer_name.trim().toLowerCase())
      );
      const resolvedBuyerCode = assignChannelTarget.buyer_code || matchedBuyer?.buyer_code || "";

      const res = await fetch(`${API_BASE}/api/sellin/assign-channel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assignChannelTarget.id,
          buyer_code: resolvedBuyerCode,
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

  // Open Assign Item Type Modal
  const handleOpenAssignItemTypeModal = (record: any) => {
    setAssignItemTypeTarget(record);
    setSelectedItemType(record.item_type || "product");
    setIsItemTypeDropdownOpen(false);
    setApplyItemTypeToAllMatching(true);
    setShowAssignItemTypeModal(true);
  };

  // Save Assign Item Type
  const handleSaveAssignItemType = async () => {
    if (!assignItemTypeTarget || !selectedItemType) return;
    setSavingAssignItemType(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/assign-item-type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assignItemTypeTarget.id,
          period: currentPeriod,
          item_type: selectedItemType,
          target_name: assignItemTypeTarget.product_name,
          target_sku: assignItemTypeTarget.product_sku,
          apply_to_all_matching: applyItemTypeToAllMatching
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const typeObj = ITEM_TYPES.find((t) => t.value === selectedItemType);
        if (selectedItemType !== "product") {
          showToast(`Item categorized as "${typeObj?.label || selectedItemType}"! Non-sales items appear under the "Non-Sales" tab.`, "success");
        } else {
          showToast(`Item type changed to "${typeObj?.label || selectedItemType}"!`, "success");
        }
        setShowAssignItemTypeModal(false);
        setAssignItemTypeTarget(null);

        // Optimistically update records state
        const targetDescLower = String(assignItemTypeTarget.product_name || "").trim().toLowerCase();
        const targetSkuLower = String(assignItemTypeTarget.product_sku || "").trim().toLowerCase();
        setRecords((prev) =>
          prev.map((r) => {
            const isDirect = r.id === assignItemTypeTarget.id;
            const rDesc = String(r.product_name || "").trim().toLowerCase();
            const rSku = String(r.product_sku || "").trim().toLowerCase();
            const isDescMatch = applyItemTypeToAllMatching && Boolean(targetDescLower && (rDesc === targetDescLower || (targetDescLower.length > 4 && rDesc.includes(targetDescLower))));
            const isSkuMatch = applyItemTypeToAllMatching && Boolean(targetSkuLower && rSku === targetSkuLower);
            if (isDirect || isDescMatch || isSkuMatch) {
              const isNonProduct = selectedItemType !== "product";
              return {
                ...r,
                item_type: selectedItemType,
                product_sku: isNonProduct ? "" : r.product_sku,
                quantity: isNonProduct ? 0 : r.quantity,
                demand_qty: isNonProduct ? 0 : r.demand_qty,
                cost_price: isNonProduct ? 0 : r.cost_price,
                validation_status: isNonProduct ? "valid" : r.validation_status
              };
            }
            return r;
          })
        );

        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast(data.error || "Failed to update item type", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to update item type", "error");
    } finally {
      setSavingAssignItemType(false);
    }
  };

  // Open Assign Product Modal
  const handleOpenAssignProductModal = (row: any) => {
    setAssignProductTarget(row);

    const rowSku = String(row.product_sku || "").trim().toLowerCase();
    const rowName = String(row.product_name || "").trim().toLowerCase();

    let matched: any = null;

    // 1. If data has SKU, match SKU first
    if (rowSku && rowSku !== "(blank sku)") {
      matched = unifiedProductList.find((p) => 
        String(p.sku || p.id || "").trim().toLowerCase() === rowSku
      );
    }

    // 2. If data doesn't have SKU, or if SKU not found in Product List, match Product Name
    if (!matched && rowName) {
      matched = unifiedProductList.find((p) => 
        String(p.product_name || "").trim().toLowerCase() === rowName
      );
      if (!matched) {
        matched = unifiedProductList.find((p) => {
          const pName = String(p.product_name || "").trim().toLowerCase();
          return pName && ((pName.length > 4 && rowName.includes(pName)) || (rowName.length > 4 && pName.includes(rowName)));
        });
      }
    }

    if (matched) {
      setSelectedMasterSku(matched.sku);
      setProductSearchTerm("");
    } else {
      setSelectedMasterSku(row.product_sku || "");
      setProductSearchTerm(row.product_name || row.product_sku || "");
    }

    setApplyProductToAllMatchingRows(true);
    setShowAssignProductModal(true);
  };

  // Save Assign Product
  const handleSaveAssignProduct = async () => {
    if (!assignProductTarget || !selectedMasterSku) {
      showToast("Please select a product SKU", "error");
      return;
    }
    setSavingAssignProduct(true);
    try {
      const chosenProduct = unifiedProductList.find((p) => 
        String(p.sku).toLowerCase() === selectedMasterSku.toLowerCase() ||
        String(p.id).toLowerCase() === selectedMasterSku.toLowerCase()
      );
      const res = await fetch(`${API_BASE}/api/sellin/assign-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assignProductTarget.id,
          period: currentPeriod,
          product_sku: chosenProduct ? chosenProduct.sku : selectedMasterSku,
          product_name: chosenProduct?.product_name || assignProductTarget.product_name,
          brand: chosenProduct?.brand || assignProductTarget.brand,
          target_description: assignProductTarget.product_name,
          target_sku: assignProductTarget.product_sku,
          apply_to_all_matching_desc: applyProductToAllMatchingRows
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Product SKU "${selectedMasterSku}" assigned successfully!`, "success");
        setShowAssignProductModal(false);
        setAssignProductTarget(null);
        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast(data.error || "Failed to assign product", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Assign product error", "error");
    } finally {
      setSavingAssignProduct(false);
    }
  };

  // Open Price Mismatch Modal
  const handleOpenPriceMismatchModal = (record: any) => {
    setPriceMismatchTarget(record);
    setShowPriceMismatchModal(true);
  };

  // Update Listing Sheet Price from Price Mismatch Modal
  const handleUpdateListingPrice = async () => {
    if (!priceMismatchTarget) return;
    setSavingUpdateListingPrice(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/update-listing-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet_id: priceMismatchTarget.matched_sheet_id,
          product_sku: priceMismatchTarget.product_sku,
          new_price: Number(priceMismatchTarget.unit_price || 0),
          item_id: priceMismatchTarget.matched_listing_item_id,
          period: currentPeriod
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || `Listing Sheet price updated to $${Number(priceMismatchTarget.unit_price || 0).toFixed(2)}!`, "success");
        setShowPriceMismatchModal(false);
        setPriceMismatchTarget(null);
        fetchBatchDetails(currentPeriod, true);
      } else {
        showToast(data.error || "Failed to update listing price", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Update listing price error", "error");
    } finally {
      setSavingUpdateListingPrice(false);
    }
  };

  // Open Cost Snapshot Modal
  const handleOpenCostSnapshotModal = (record: any) => {
    setCostSnapshotTarget(record);
    const existingCost = record.cost_price !== undefined && record.cost_price !== null ? Number(record.cost_price) : 0;
    setEditingCostPrice(existingCost > 0 ? String(existingCost) : "");
    setIsEditingCostPrice(false);
    setShowCostSnapshotModal(true);
  };

  // Save Cost Snapshot (This Month Only)
  const handleSaveCostSnapshot = async () => {
    if (!costSnapshotTarget) return;
    const parsedCost = parseFloat(editingCostPrice);
    if (isNaN(parsedCost) || parsedCost < 0) {
      showToast("Please enter a valid cost price (0 or higher)", "error");
      return;
    }
    setSavingCostSnapshot(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/records/${encodeURIComponent(costSnapshotTarget.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cost_price: parsedCost,
          period: currentPeriod
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Cost price ($${parsedCost.toFixed(2)}) saved for this month!`, "success");
        setShowCostSnapshotModal(false);
        setCostSnapshotTarget(null);
        // Optimistically update record in memory
        setRecords(prev => prev.map(r => r.id === costSnapshotTarget.id ? { ...r, cost_price: parsedCost } : r));
        fetchBatchDetails(currentPeriod, false);
      } else {
        showToast(data.error || "Failed to update cost price", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Save cost price error", "error");
    } finally {
      setSavingCostSnapshot(false);
    }
  };

  // Open Settlement Breakdown Modal
  const handleOpenSettlementModal = (record: any) => {
    setSettlementTarget(record);
    const existingItems = Array.isArray(record.settlement_items) ? record.settlement_items : [];
    setSettlementItemsList(existingItems);
    setSettlementFileName(record.settlement_file_name || "");
    setShowSettlementModal(true);
  };

  // Download Sample Excel Template for Settlement Breakdown
  const handleDownloadSettlementTemplate = () => {
    const wb = XLSX.utils.book_new();
    const sampleData = [
      { SKU: "BIVCL-325", Description: "BOOM+ ISOTONIC - LEMON FLAVOUR 325ML", Qty: 100 },
      { SKU: "BIVCO-325", Description: "BOOM+ ISOTONIC - ORANGE FLAVOUR 325ML", Qty: 80 }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData, { header: ["SKU", "Description", "Qty"] });
    ws["!cols"] = [{ wch: 18 }, { wch: 45 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "Settlement_Breakdown");
    XLSX.writeFile(wb, "Settlement_Breakdown_Template.xlsx");
  };

  // Download Existing Settlement Items or Template
  const handleDownloadSettlementExcel = (record: any) => {
    const items = Array.isArray(record.settlement_items) ? record.settlement_items : [];
    if (items.length === 0) {
      handleDownloadSettlementTemplate();
      return;
    }
    const wb = XLSX.utils.book_new();
    const rows = items.map((it: any) => ({
      SKU: it.sku || "",
      Description: it.description || "",
      Qty: Number(it.qty || 0),
      "Unit Cost ($)": Number(it.unit_cost || 0),
      "Total Cost ($)": Number(it.total_cost || 0)
    }));
    const ws = XLSX.utils.json_to_sheet(rows, { header: ["SKU", "Description", "Qty", "Unit Cost ($)", "Total Cost ($)"] });
    ws["!cols"] = [{ wch: 18 }, { wch: 45 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, "Settlement_Items");
    const safeName = String(record.product_name || record.buyer_name || "Settlement").replace(/[^a-zA-Z0-9_-]/g, "_");
    XLSX.writeFile(wb, `${safeName}_Breakdown_${currentPeriod}.xlsx`);
  };

  // Parse Uploaded Excel File for Settlement Breakdown
  const handleParseSettlementExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) throw new Error("Excel file has no sheets");
        const ws = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          showToast("Uploaded Excel sheet is empty", "error");
          return;
        }

        // Build master products map for cost price lookup
        const prodMap = new Map<string, any>();
        productsList.forEach((p) => {
          if (p.sku) prodMap.set(String(p.sku).trim().toUpperCase(), p);
        });

        const parsedItems: Array<{
          sku: string;
          description: string;
          qty: number;
          unit_cost: number;
          total_cost: number;
        }> = [];

        rawJson.forEach((row) => {
          const skuKey = Object.keys(row).find((k) => /^(sku|item_?code|product_?code|code)$/i.test(k.trim())) || "SKU";
          const descKey = Object.keys(row).find((k) => /^(desc|description|item_?name|product_?name|name)$/i.test(k.trim())) || "Description";
          const qtyKey = Object.keys(row).find((k) => /^(qty|quantity|units?|pcs)$/i.test(k.trim())) || "Qty";

          const rawSku = String(row[skuKey] || "").trim();
          if (!rawSku) return;

          const rawDesc = String(row[descKey] || "").trim();
          const rawQty = Number(row[qtyKey] || 0);

          const matchedProd = prodMap.get(rawSku.toUpperCase());
          const unitCost = Number(matchedProd?.cost_price ?? matchedProd?.cost ?? 0);
          const totalCost = Math.round(rawQty * unitCost * 100) / 100;

          parsedItems.push({
            sku: rawSku,
            description: rawDesc || matchedProd?.product_name || rawSku,
            qty: rawQty,
            unit_cost: unitCost,
            total_cost: totalCost
          });
        });

        if (parsedItems.length === 0) {
          showToast("No valid rows found. Please ensure headers are SKU, Description, Qty.", "error");
          return;
        }

        setSettlementItemsList(parsedItems);
        setSettlementFileName(file.name);
        showToast(`Loaded ${parsedItems.length} items from ${file.name}`, "success");
      } catch (err: any) {
        showToast(`Failed to parse Excel: ${err.message}`, "error");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Save Settlement Breakdown Items to Backend
  const handleSaveSettlementItems = async () => {
    if (!settlementTarget) return;
    if (settlementItemsList.length === 0) {
      showToast("Please upload an Excel breakdown first", "error");
      return;
    }
    setSavingSettlementItems(true);
    try {
      const res = await fetch(`${API_BASE}/api/sellin/save-settlement-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: settlementTarget.id,
          period: currentPeriod,
          items: settlementItemsList,
          file_name: settlementFileName
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "Settlement breakdown saved successfully!", "success");
        const newTotalCost = settlementItemsList.reduce((acc, it) => acc + Number(it.total_cost || 0), 0);
        setRecords((prev) =>
          prev.map((r) =>
            r.id === settlementTarget.id
              ? {
                  ...r,
                  settlement_items: data.settlement_items || settlementItemsList,
                  settlement_file_name: settlementFileName,
                  total_cost: newTotalCost,
                  gross_profit: Number(r.nett_amount || r.total_demand || 0) - newTotalCost,
                  validation_status: "valid"
                }
              : r
          )
        );
        setShowSettlementModal(false);
        setSettlementTarget(null);
        fetchBatchDetails(currentPeriod, false);
      } else {
        showToast(data.error || "Failed to save settlement breakdown", "error");
      }
    } catch (err: any) {
      showToast("Error saving settlement items: " + err.message, "error");
    } finally {
      setSavingSettlementItems(false);
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
      "Channel": r.channel || "Not Set",
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
          const channel = String(getVal(["channel", "saleschannel", "group"]) || row["channel"] || "").trim();
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

  // Open Edit Buyer Modal
  const handleOpenEditBuyer = (buyer: any) => {
    setEditingBuyer(buyer);
    setEditBuyerCode(buyer.buyer_code || "");
    setEditBuyerName(buyer.buyer_name || "");
    setEditBuyerChannel(buyer.channel || "");
    setEditBuyerPaymentTerm(String(buyer.payment_term || "90").replace(/[^0-9]/g, "") || "90");
    setEditBuyerStoreGroups(
      Array.isArray(buyer.store_groups) && buyer.store_groups.length > 0
        ? buyer.store_groups.map((g: any) => ({ group_name: g.group_name || "", store_count: Number(g.store_count) || 1 }))
        : [{ group_name: "", store_count: 1 }]
    );
    setShowEditBuyerModal(true);
  };

  // Save Edit Buyer Modal
  const handleSaveEditBuyer = async () => {
    if (!editingBuyer || !editBuyerCode.trim() || !editBuyerName.trim()) {
      showToast("Buyer Code and Name are required", "error");
      return;
    }
    setSavingEditBuyer(true);
    try {
      const validGroups = editBuyerStoreGroups
        .filter((g) => g.group_name && g.group_name.trim().length > 0)
        .map((g) => ({ group_name: g.group_name.trim(), store_count: Number(g.store_count) || 1 }));

      const res = await fetch(`${API_BASE}/api/sellin/buyers/${encodeURIComponent(editingBuyer.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_code: editBuyerCode.trim(),
          buyer_name: editBuyerName.trim(),
          channel: editBuyerChannel || "",
          payment_term: editBuyerPaymentTerm.replace(/[^0-9]/g, "") || "90",
          store_groups: validGroups,
          period: currentPeriod
        })
      });
      if (res.ok) {
        showToast(`Buyer "${editBuyerName.trim()}" updated successfully!`, "success");
        setShowEditBuyerModal(false);
        setEditingBuyer(null);
        await fetchBatchDetails(currentPeriod, true);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || "Failed to update buyer", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to update buyer", "error");
    } finally {
      setSavingEditBuyer(false);
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
    const list = channelsList.map((ch) => ({
      label: ch.channel_name || ch.name,
      value: ch.channel_name || ch.name
    }));
    return [
      { label: "-- Not Set --", value: "" },
      ...list
    ];
  }, [channelsList]);

  // Source PDF URLs (Invoice and Credit Note)
  const invoiceSourceUrl = React.useMemo(() => {
    if (batchData?.source_file_url) return batchData.source_file_url;
    const recWithInv = records.find(
      (r: any) =>
        r.invoice_file_url ||
        (r.source_type !== "pdf_credit_note" && r.source_file_url) ||
        r.invoices?.[0]?.source_file_url
    );
    return recWithInv?.invoice_file_url || (recWithInv?.source_type !== "pdf_credit_note" ? recWithInv?.source_file_url : "") || recWithInv?.invoices?.[0]?.source_file_url || "";
  }, [batchData, records]);

  const cnSourceUrl = React.useMemo(() => {
    if (batchData?.cn_file_url) return batchData.cn_file_url;
    const recWithCn = records.find(
      (r: any) =>
        r.cn_file_url ||
        (r.source_type === "pdf_credit_note" && r.source_file_url) ||
        r.credit_notes?.find((c: any) => c.source_file_url)
    );
    return recWithCn?.cn_file_url || (recWithCn?.source_type === "pdf_credit_note" ? recWithCn?.source_file_url : "") || recWithCn?.credit_notes?.find((c: any) => c.source_file_url)?.source_file_url || "";
  }, [batchData, records]);

  // Dynamic Date Range for Million System Instructions (e.g. 01/09/2025 to 30/09/2025)
  const periodDateRange = React.useMemo(() => {
    const [yStr, mStr] = currentPeriod.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (!y || !m) return { start: "01/01/2025", end: "31/01/2025" };
    const lastDay = new Date(y, m, 0).getDate();
    const padM = String(m).padStart(2, "0");
    return {
      start: `01/${padM}/${y}`,
      end: `${String(lastDay).padStart(2, "0")}/${padM}/${y}`
    };
  }, [currentPeriod]);

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

              {/* Profit / Revenue Margin Pill */}
              <div 
                className="h-7 flex items-center gap-1 px-2 rounded-md bg-[#F8F9FA] border border-slate-200 text-[11px]"
                title={`Total Net Revenue / Gross Profit after COGS ($${kpis.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
              >
                <span className="text-zinc-500 font-normal">Profit:</span>
                <span className={`font-medium ${kpis.grossProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  ${kpis.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-zinc-400 font-normal">({kpis.marginPercent.toFixed(1)}%)</span>
              </div>

              {/* Diagnostics Alert / Validation Status Pill (Draft mode only) */}
              {batchData?.status !== "published" && (
                kpis.unresolvedCount > 0 ? (
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
                )
              )}

              {/* Action Buttons in Top Container */}
              {records.length > 0 && !isCurrentActiveMonth && batchData?.status !== "published" && (
                <button
                  type="button"
                  onClick={handleOpenResetModal}
                  className="h-7 px-2 rounded-md bg-white border border-red-200 hover:bg-red-50 text-red-600 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title={`Reset all data for ${formatPeriodLabel(currentPeriod)}`}
                >
                  <Trash2 size={11} className="text-red-500" />
                  <span>Reset Month</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleExportExcel}
                className="h-7 px-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                title="Export current Sell-In rows to Excel"
              >
                <Download size={11} className="text-zinc-500" />
                <span>Export</span>
              </button>

              {batchData?.status !== "published" && (
                <button
                  type="button"
                  onClick={handlePublishBatchWithConfirm}
                  className="h-7 px-3 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-[11px] font-medium flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-98"
                >
                  <span>Publish</span>
                </button>
              )}
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
                      initial[b.id] = { buyer_code: b.buyer_code, buyer_name: b.buyer_name, channel: b.channel || "" };
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
                  setNewBuyerChannel("");
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
        ) : activeMainTab === "products" ? (
          <>
            <div>
              <h1 className="text-base font-semibold text-zinc-900">Product List</h1>
              <p className="text-xs text-zinc-500 mt-0.5">
                Unified product registry for Sell-In demand. Temporary products registered here are stored separately and do not alter the Master Catalog.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddTempProduct}
                className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-98"
              >
                <Plus size={14} />
                <span>Add Temp Product</span>
              </button>
            </div>
          </>
        ) : (
          <div>
            <h1 className="text-base font-semibold text-zinc-900">Print Reports</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Generate and print landscape executive reports and multi-month sales summaries.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. TAB 1: SELL-IN DEMAND MASTER VIEW                                      */}
      {/* ========================================================================= */}
      {activeMainTab === "sellin" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Published View Mode Navigation Bar (Dedicated Level: ONLY appears when Published) */}
          {batchData?.status === "published" && (
            <div className="px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setSellinViewMode("summary")}
                  className={`py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    sellinViewMode === "summary"
                      ? "border-[#0B57D0] text-[#0B57D0]"
                      : "border-transparent text-zinc-500 hover:text-zinc-800 hover:border-slate-300"
                  }`}
                >
                  <BarChart3 size={14} />
                  <span>Summary View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSellinViewMode("details")}
                  className={`py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    sellinViewMode === "details"
                      ? "border-[#0B57D0] text-[#0B57D0]"
                      : "border-transparent text-zinc-500 hover:text-zinc-800 hover:border-slate-300"
                  }`}
                >
                  <FileText size={14} />
                  <span>Detailed Sell-In ({records.length})</span>
                </button>
              </div>

              {/* Right side indicators, Source Files, & Month Selector */}
              <div className="flex items-center gap-2 py-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  <span>Published Snapshot</span>
                </span>
                <button
                  type="button"
                  onClick={handleRevokePublish}
                  disabled={revokingBatch}
                  className="h-7 px-2.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98 disabled:opacity-50"
                  title="Revoke published status back to Draft Inflow"
                >
                  <RotateCcw size={12} className={revokingBatch ? "animate-spin text-zinc-500" : "text-zinc-500"} />
                  <span>{revokingBatch ? "Revoking..." : "Revoke Publish"}</span>
                </button>

                {/* Source Invoice & Credit Note Download / View Buttons (Historical months only) */}
                {!isCurrentActiveMonth && invoiceSourceUrl && (
                  <a
                    href={invoiceSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Download / View Source Invoice PDF"
                  >
                    <FileText size={13} className="text-[#0B57D0]" />
                    <span>Source Invoice</span>
                  </a>
                )}

                {!isCurrentActiveMonth && cnSourceUrl && (
                  <a
                    href={cnSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 px-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Download / View Source Credit Note PDF"
                  >
                    <FileText size={13} className="text-zinc-600" />
                    <span>Source Credit Note</span>
                  </a>
                )}

                {/* Month Selector Capsule with Fixed Width */}
                <div className="h-8 w-[185px] min-w-[185px] shrink-0 flex items-center justify-between px-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    disabled={loading}
                    className="w-5 h-5 shrink-0 rounded flex items-center justify-center text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-40 text-xs font-medium"
                    title="Previous Month"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={openMonthPicker}
                    className="relative flex-1 flex items-center justify-center gap-1.5 px-1 py-1 rounded hover:bg-slate-100/70 transition-colors cursor-pointer"
                    title="Click to select month & year directly"
                  >
                    <Calendar size={13} className="text-[#0B57D0] shrink-0" />
                    <span className="text-xs font-medium text-zinc-800 tracking-tight whitespace-nowrap text-center">
                      {formatPeriodLabel(currentPeriod)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    disabled={loading}
                    className="w-5 h-5 shrink-0 rounded flex items-center justify-center text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-40 text-xs font-medium"
                    title="Next Month"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Filter & Action Toolbar (Only shown in Draft OR when viewing Detailed Sell-In) */}
          {(batchData?.status !== "published" || sellinViewMode === "details") && (
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
                    onClick={() => setSubFilterTab("non_sales")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      subFilterTab === "non_sales" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    <span>Non-Sales</span>
                    {kpis.nonSalesCount > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium ${subFilterTab === "non_sales" ? "bg-white/20 text-white" : "bg-slate-100 text-zinc-600 border border-slate-200"}`}>
                        {kpis.nonSalesCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubFilterTab("cn")}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      subFilterTab === "cn" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    Returns & Rejects
                  </button>
                  {batchData?.status !== "published" && (
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
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative max-w-[200px] flex-1">
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
                  minWidth="min-w-[120px]"
                />

                {/* Custom Brand Filter Dropdown */}
                <CustomSelect
                  value={brandFilter}
                  onChange={setBrandFilter}
                  options={brandFilterOptions}
                  placeholder="All Brands"
                  minWidth="min-w-[110px]"
                />
              </div>

              {/* Right Action Area (Draft Mode Only): Source Files & Month Selector */}
              {batchData?.status !== "published" && (
                <div className="flex items-center gap-2 shrink-0">
                  {/* Source Invoice & Credit Note Download / View Buttons (Historical months only) */}
                  {!isCurrentActiveMonth && invoiceSourceUrl && (
                    <a
                      href={invoiceSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Download / View Source Invoice PDF"
                    >
                      <FileText size={13} className="text-[#0B57D0]" />
                      <span>Source Invoice</span>
                    </a>
                  )}

                  {!isCurrentActiveMonth && cnSourceUrl && (
                    <a
                      href={cnSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Download / View Source Credit Note PDF"
                    >
                      <FileText size={13} className="text-zinc-600" />
                      <span>Source Credit Note</span>
                    </a>
                  )}

                  {/* Import Buttons when no source file yet (Historical months only) */}
                  {!isCurrentActiveMonth && !invoiceSourceUrl && (
                    <label className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs">
                      {parsingInvoices ? <RefreshCw size={13} className="animate-spin text-zinc-500" /> : <FileText size={13} className="text-zinc-500" />}
                      <span>{parsingInvoices ? "Parsing AI..." : "Upload Invoice"}</span>
                      <input
                        type="file"
                        accept=".pdf"
                        multiple={false}
                        disabled={parsingInvoices}
                        onChange={handleInvoicePdfUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  {!isCurrentActiveMonth && !cnSourceUrl && (
                    <label className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs">
                      {parsingCreditNotes ? <RefreshCw size={13} className="animate-spin text-zinc-500" /> : <FileText size={13} className="text-zinc-500" />}
                      <span>{parsingCreditNotes ? "Parsing CN..." : "Upload Credit Note"}</span>
                      <input
                        type="file"
                        accept=".pdf"
                        multiple={false}
                        disabled={parsingCreditNotes}
                        onChange={handleCreditNotePdfUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  {/* Month Selector Capsule with Fixed Width */}
                  <div className="h-8 w-[185px] min-w-[185px] shrink-0 flex items-center justify-between px-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-all shadow-2xs">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      disabled={loading}
                      className="w-5 h-5 shrink-0 rounded flex items-center justify-center text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-40 text-xs font-medium"
                      title="Previous Month"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={openMonthPicker}
                      className="relative flex-1 flex items-center justify-center gap-1.5 px-1 py-1 rounded hover:bg-slate-100/70 transition-colors cursor-pointer"
                      title="Click to select month & year directly"
                    >
                      <Calendar size={13} className="text-[#0B57D0] shrink-0" />
                      <span className="text-xs font-medium text-zinc-800 tracking-tight whitespace-nowrap text-center">
                        {formatPeriodLabel(currentPeriod)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      disabled={loading}
                      className="w-5 h-5 shrink-0 rounded flex items-center justify-center text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-40 text-xs font-medium"
                      title="Next Month"
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Table Viewport Area */}
          <div className="flex-1 min-h-0 overflow-auto bg-white">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#0B57D0] animate-spin" />
                <span className="text-xs text-zinc-500 font-medium">Loading Sell-In records...</span>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                {isCurrentActiveMonth ? (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0B57D0] flex items-center justify-center mb-3">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">
                        {formatPeriodLabel(currentPeriod)} is currently in progress
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 max-w-md leading-relaxed">
                        Sales figures are actively synced from Track Orders. As invoices are attached to orders in Track Order, live demand will appear here automatically.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center max-w-lg mx-auto py-6 text-center px-4 w-full">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mb-3 shadow-2xs">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900">
                        {formatPeriodLabel(currentPeriod)} has ended — Master Tax Invoice Required
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        Follow the instructions below to export and upload official sales data from Million System.
                      </p>
                    </div>

                    {/* Step-by-Step Instructions Card */}
                    <div className="mt-4 w-full text-left bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      {/* Notice Header Banner */}
                      <div className="p-3.5 bg-amber-50/80 border-b border-amber-200/80 flex items-start gap-2.5">
                        <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-950 font-medium leading-relaxed">
                          <span className="font-bold">Important:</span> Ensure all Sales Invoices and Credit Notes for <span className="font-bold">{formatPeriodLabel(currentPeriod)}</span> are fully recorded in <strong>Million System</strong> before exporting to PDF.
                        </p>
                      </div>

                      {/* Steps list */}
                      <div className="p-4 space-y-3 divide-y divide-slate-100">
                        <div className="flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-zinc-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                          <div className="text-xs text-zinc-700 leading-relaxed">
                            Log in to <strong>Million System</strong> and go to the <strong>Sales</strong> page.
                          </div>
                        </div>

                        <div className="pt-3 flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-zinc-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                          <div className="text-xs text-zinc-700 leading-relaxed">
                            At the bottom footer menu, locate and click <strong>Print Bill</strong>.
                          </div>
                        </div>

                        <div className="pt-3 flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-zinc-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                          <div className="text-xs text-zinc-700 leading-relaxed">
                            Select <strong className="text-zinc-900">Sales Invoice</strong>, set the Date Range from <strong className="font-mono bg-slate-100 px-1 py-0.5 rounded text-zinc-800">{periodDateRange.start}</strong> to <strong className="font-mono bg-slate-100 px-1 py-0.5 rounded text-zinc-800">{periodDateRange.end}</strong>, then click <strong>Print</strong>.
                          </div>
                        </div>

                        <div className="pt-3 flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-zinc-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                          <div className="text-xs text-zinc-700 leading-relaxed">
                            Choose <strong>Print to PDF</strong>, rename the exported file to <strong className="font-mono text-[#0B57D0]">{currentPeriod}.pdf</strong>, and upload it via <strong className="text-[#0B57D0]">Upload Invoice</strong> in the toolbar above.
                          </div>
                        </div>

                        <div className="pt-3 flex items-start gap-3">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-zinc-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">5</span>
                          <div className="text-xs text-zinc-700 leading-relaxed">
                            Repeat the same steps for <strong className="text-zinc-900">Credit Note</strong> (if any) with the same date range, and upload it via <strong className="text-[#0B57D0]">Upload Credit Note</strong>.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : sellinViewMode === "summary" ? (
              <div className="p-4 space-y-5 bg-[#F8F9FA]/60 min-h-full">
                {/* 1. FINANCIAL SUMMARY METRIC CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs">
                    <span className="text-[11px] font-medium text-zinc-500">Gross Sales Demand</span>
                    <div className="text-lg font-bold text-zinc-900 mt-0.5 font-mono">
                      ${(compiledSummaryData?.total_demand_amount ?? kpis.grossDemand).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {(compiledSummaryData?.total_demand_qty ?? kpis.demandQty).toLocaleString()} units demanded
                    </span>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs">
                    <span className="text-[11px] font-medium text-zinc-500">Returns & Non-Sales Deductions</span>
                    <div className="text-lg font-bold text-zinc-700 mt-0.5 font-mono">
                      -${((compiledSummaryData?.total_cn_amount ?? kpis.cnAmount) + (compiledSummaryData?.total_non_sales_amount ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {(compiledSummaryData?.total_cn_qty ?? kpis.cnQty).toLocaleString()} returned units
                    </span>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs">
                    <span className="text-[11px] font-medium text-zinc-500">Net Receivable Revenue</span>
                    <div className="text-lg font-bold text-[#0B57D0] mt-0.5 font-mono">
                      ${(compiledSummaryData?.net_revenue ?? compiledSummaryData?.net_amount ?? kpis.netAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {(compiledSummaryData?.total_net_qty ?? (kpis.demandQty - kpis.cnQty)).toLocaleString()} net deliverable units
                    </span>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 p-3.5 shadow-2xs">
                    <span className="text-[11px] font-medium text-zinc-500">Gross Profit & Margin</span>
                    <div className={`text-lg font-bold mt-0.5 font-mono ${(compiledSummaryData?.gross_profit ?? kpis.grossProfit) >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      ${(compiledSummaryData?.gross_profit ?? kpis.grossProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {(compiledSummaryData?.margin_percent ?? kpis.marginPercent).toFixed(1)}% margin (COGS: ${(compiledSummaryData?.total_cost_amount ?? kpis.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  </div>
                </div>

                {/* 2. EXPECTED CASH COLLECTION TIMELINE */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="px-4 py-3 border-b border-slate-200 bg-[#F8F9FA] flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        Expected Cash Collection Schedule
                      </h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Forecasted cash inflow month calculated from individual buyer payment terms (e.g. 30, 60, 90 days from mid-month).
                      </p>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {(compiledSummaryData?.cash_collection_timeline || []).length} scheduled collection periods
                    </span>
                  </div>
                  
                  {(!compiledSummaryData?.cash_collection_timeline || compiledSummaryData.cash_collection_timeline.length === 0) ? (
                    <div className="p-6 text-center text-xs text-zinc-400">
                      No payment terms configured for buyers in this period.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
                      {compiledSummaryData.cash_collection_timeline.map((item: any) => (
                        <div 
                          key={item.period} 
                          className="p-3.5 rounded-lg border border-slate-200 bg-[#F8F9FA]/40 hover:bg-white hover:border-[#0B57D0]/40 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{item.period}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-50 text-[#0B57D0] border border-blue-100">
                                {item.buyer_count || item.buyers?.length || 0} {(item.buyer_count || item.buyers?.length || 0) === 1 ? "buyer" : "buyers"}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-zinc-900 mt-1">
                              {item.label}
                            </div>
                            <div className="text-base font-bold text-[#0B57D0] mt-1 font-mono">
                              ${(item.expected_amount ?? item.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div 
                            className="text-[10px] text-zinc-500 mt-2 truncate pt-2 border-t border-slate-100" 
                            title={Array.isArray(item.buyers) ? item.buyers.join(", ") : ""}
                          >
                            {Array.isArray(item.buyers) ? item.buyers.join(", ") : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. BUYER BREAKDOWN & ORDERS */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="px-4 py-3 border-b border-slate-200 bg-[#F8F9FA] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        Buyer Breakdown & Orders ({filteredSummaryBuyers.length})
                      </h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Itemized demand, return deductions, credit notes, payment terms, and net receivable per customer.
                      </p>
                    </div>

                    <div className="relative w-64">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search buyer, code, channel..."
                        value={summaryBuyerSearch}
                        onChange={(e) => setSummaryBuyerSearch(e.target.value)}
                        className="w-full h-7 pl-8 pr-2.5 bg-white border border-slate-200 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#F8F9FA] border-b border-slate-200 text-[11px] font-medium text-zinc-500">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Buyer Name & Code</th>
                          <th className="py-2.5 px-3 w-28">Channel</th>
                          <th className="py-2.5 px-3 w-24 text-center">Payment Term</th>
                          <th className="py-2.5 px-3 w-32 text-center">Expected Month</th>
                          <th className="py-2.5 px-3 w-24 text-right">Demand (pcs)</th>
                          <th className="py-2.5 px-3 w-28 text-right">Gross Demand ($)</th>
                          <th className="py-2.5 px-3 w-24 text-right">CN Deduct ($)</th>
                          <th className="py-2.5 px-3 w-24 text-right">Non-Sales ($)</th>
                          <th className="py-2.5 px-3 w-28 text-right">Net Receivable ($)</th>
                          <th className="py-2.5 px-3 w-20 text-center">Items</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSummaryBuyers.map((b: any, bIdx: number) => {
                          const isExpanded = Boolean(expandedBuyerKeys[b.buyer_code || b.buyer_name]);
                          const buyerNetAmt = b.net_receivable ?? b.net_amount ?? 0;
                          const buyerCnAmt = b.cn_amount ?? b.reject_amount ?? 0;
                          const itemsCount = Array.isArray(b.items) ? b.items.length : 0;
                          const nonSalesCount = Array.isArray(b.non_sales_items) ? b.non_sales_items.length : 0;

                          return (
                            <React.Fragment key={b.buyer_code || b.buyer_name || bIdx}>
                              <tr className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3 text-center text-zinc-400 font-mono text-[11px]">{bIdx + 1}</td>
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-zinc-900">{b.buyer_name || "—"}</div>
                                  <div className="text-[11px] text-zinc-400 font-mono">{b.buyer_code}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10.5px] font-medium border ${
                                    !b.channel || b.channel === "Not Set"
                                      ? "bg-amber-50 text-amber-700 border-amber-200 italic"
                                      : "bg-slate-100 text-zinc-600 border-slate-200"
                                  }`}>
                                    {b.channel || "Not Set"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center text-zinc-700 font-mono">
                                  {b.payment_term || "90"} Days
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#0B57D0] border border-blue-100">
                                    {b.expected_collection_label || b.expected_collection_period || "—"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right text-zinc-800 font-mono font-medium">
                                  {Number(b.demand_qty || 0).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 text-right text-zinc-800 font-mono">
                                  ${Number(b.demand_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-right text-zinc-600 font-mono">
                                  {buyerCnAmt > 0 ? `-$${Number(buyerCnAmt).toFixed(2)}` : "-"}
                                </td>
                                <td className="py-2.5 px-3 text-right text-zinc-500 font-mono">
                                  {Number(b.non_sales_amount || 0) > 0 ? `-$${Number(b.non_sales_amount).toFixed(2)}` : "-"}
                                </td>
                                <td className="py-2.5 px-3 text-right text-[#0B57D0] font-mono font-bold">
                                  ${Number(buyerNetAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleBuyerExpand(b.buyer_code || b.buyer_name)}
                                    className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-zinc-700 text-[10.5px] font-medium inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                    title="View itemized products purchased"
                                  >
                                    <span>{itemsCount} {itemsCount === 1 ? "SKU" : "SKUs"}</span>
                                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded Itemized Order Details */}
                              {isExpanded && (
                                <tr className="bg-slate-50/50">
                                  <td colSpan={11} className="py-3 px-6 border-y border-slate-200/80">
                                    <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
                                      <div className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                                        <span>Product Deliveries for {b.buyer_name}</span>
                                        <span className="text-zinc-400 font-normal">
                                          {itemsCount} line items {nonSalesCount > 0 ? `+ ${nonSalesCount} deductions` : ""}
                                        </span>
                                      </div>
                                      <table className="w-full text-left border-collapse text-xs">
                                        <thead className="border-b border-slate-100 text-[10.5px] font-medium text-zinc-400 bg-slate-50/60">
                                          <tr>
                                            <th className="py-1.5 px-2.5">Product SKU & Name</th>
                                            <th className="py-1.5 px-2.5 w-28">Brand</th>
                                            <th className="py-1.5 px-2.5 w-20 text-right">Demand Qty</th>
                                            <th className="py-1.5 px-2.5 w-24 text-right">Unit Price</th>
                                            <th className="py-1.5 px-2.5 w-24 text-right">Total Demand</th>
                                            <th className="py-1.5 px-2.5 w-24 text-right">CN Rejects</th>
                                            <th className="py-1.5 px-2.5 w-24 text-right">Net Amount</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {(b.items || []).map((it: any, itIdx: number) => {
                                            const itNetAmt = it.nett_amount ?? it.net_receivable ?? (Number(it.total_demand || 0) - Number(it.cn_amount || 0));
                                            return (
                                              <tr key={it.sku || itIdx} className="hover:bg-slate-50/60 text-[11px]">
                                                <td className="py-1.5 px-2.5">
                                                  <span className="font-semibold text-zinc-900">{it.sku || "—"}</span>
                                                  <span className="text-zinc-600 ml-2">{it.name || "—"}</span>
                                                </td>
                                                <td className="py-1.5 px-2.5 text-zinc-600">{it.brand || "—"}</td>
                                                <td className="py-1.5 px-2.5 text-right font-mono text-zinc-800">
                                                  {Number(it.qty ?? it.demand_qty ?? 0).toLocaleString()}
                                                </td>
                                                <td className="py-1.5 px-2.5 text-right font-mono text-zinc-600">
                                                  ${Number(it.unit_price || 0).toFixed(2)}
                                                </td>
                                                <td className="py-1.5 px-2.5 text-right font-mono text-zinc-800">
                                                  ${Number(it.total_demand ?? it.demand_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-1.5 px-2.5 text-right font-mono text-zinc-500">
                                                  {Number(it.cn_amount || 0) > 0 ? `-$${Number(it.cn_amount).toFixed(2)}` : "-"}
                                                </td>
                                                <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-zinc-900">
                                                  ${Number(itNetAmt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>

                                      {/* Non sales items for this buyer */}
                                      {Array.isArray(b.non_sales_items) && b.non_sales_items.length > 0 && (
                                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                                          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Non-Sales Deductions:</span>
                                          {b.non_sales_items.map((ns: any, nsIdx: number) => (
                                            <span key={nsIdx} className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-red-50 text-red-700 border border-red-200">
                                              {ns.description}: -${Number(ns.amount || 0).toFixed(2)}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. SKU OUTPUT SUMMARY (Product Catalog Only) */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="px-4 py-3 border-b border-slate-200 bg-[#F8F9FA] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        SKU Output Summary ({filteredSummarySkus.length})
                      </h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Compiled physical product volumes, net shipments, revenue, inventory COGS, and gross profit margins.
                      </p>
                    </div>

                    <div className="relative w-64">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search SKU, name, brand..."
                        value={summarySkuSearch}
                        onChange={(e) => setSummarySkuSearch(e.target.value)}
                        className="w-full h-7 pl-8 pr-2.5 bg-white border border-slate-200 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#F8F9FA] border-b border-slate-200 text-[11px] font-medium text-zinc-500">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">#</th>
                          <th className="py-2.5 px-3 w-32">Product SKU</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Product Description</th>
                          <th className="py-2.5 px-3 w-28">Brand</th>
                          <th className="py-2.5 px-3 w-24 text-right">Demand (pcs)</th>
                          <th className="py-2.5 px-3 w-24 text-right">Reject (pcs)</th>
                          <th className="py-2.5 px-3 w-24 text-right">Net Qty (pcs)</th>
                          <th className="py-2.5 px-3 w-28 text-right">Demand ($)</th>
                          <th className="py-2.5 px-3 w-24 text-right">CN ($)</th>
                          <th className="py-2.5 px-3 w-28 text-right">Net Revenue ($)</th>
                          <th className="py-2.5 px-3 w-24 text-right">Unit Cost ($)</th>
                          <th className="py-2.5 px-3 w-28 text-right">Total COGS ($)</th>
                          <th className="py-2.5 px-3 w-28 text-right">Gross Profit ($)</th>
                          <th className="py-2.5 px-3 w-20 text-right">Margin (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSummarySkus.map((s: any, sIdx: number) => {
                          const sNetRev = s.net_revenue ?? s.net_amount ?? (Number(s.demand_amount || 0) - Number(s.cn_amount || 0));
                          const sProfit = s.gross_profit ?? (sNetRev - Number(s.total_cost || 0));
                          const sMargin = s.margin_percent ?? (sNetRev > 0 ? (sProfit / sNetRev) * 100 : 0);

                          return (
                            <tr key={s.sku || sIdx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-center text-zinc-400 font-mono text-[11px]">{sIdx + 1}</td>
                              <td className="py-2.5 px-3 font-semibold text-zinc-900 font-mono">{s.sku}</td>
                              <td className="py-2.5 px-3 text-zinc-700">{s.product_name || "—"}</td>
                              <td className="py-2.5 px-3 text-zinc-600">{s.brand || "—"}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-zinc-800">{Number(s.demand_qty || 0).toLocaleString()}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-zinc-500">
                                {Number(s.reject_qty || 0) > 0 ? Number(s.reject_qty).toLocaleString() : "-"}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-zinc-900">
                                {Number(s.net_qty || (Number(s.demand_qty || 0) - Number(s.reject_qty || 0))).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-zinc-800">
                                ${Number(s.demand_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-zinc-500">
                                {Number(s.cn_amount || 0) > 0 ? `-$${Number(s.cn_amount).toFixed(2)}` : "-"}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#0B57D0]">
                                ${Number(sNetRev).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-zinc-600">
                                ${Number(s.cost_price || 0).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-zinc-600">
                                ${Number(s.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-mono font-semibold ${sProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                                ${Number(sProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`py-2.5 px-3 text-right font-mono font-semibold ${sMargin >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                                {Number(sMargin).toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-zinc-400 flex items-center justify-center mb-3">
                  <Search size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">No matching Sell-In records</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm leading-relaxed">
                    No records match your active search or filter criteria. Try clearing your search term or adjusting filters.
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[11px] font-medium text-zinc-500 whitespace-nowrap">
                    <th className="py-2.5 px-3 w-12 text-center whitespace-nowrap">#</th>
                    <th className="py-2.5 px-2 w-14 text-center whitespace-nowrap"></th>
                    {batchData?.status !== "published" && (
                      <th className="py-2.5 px-3 min-w-[150px] text-center whitespace-nowrap">Diagnostic Status</th>
                    )}
                    <th className="py-2.5 px-3 w-[150px] max-w-[150px] whitespace-nowrap">Buyer</th>
                    <th className="py-2.5 px-3 min-w-[120px] whitespace-nowrap">Channel</th>
                    <th className="py-2.5 px-3 min-w-[110px] whitespace-nowrap">Type</th>
                    <th className="py-2.5 px-3 w-[160px] max-w-[170px] whitespace-nowrap">Product SKU & Description</th>
                    <th className="py-2.5 px-3 min-w-[110px] whitespace-nowrap">Brand</th>
                    <th className="py-2.5 px-3 min-w-[105px] text-right whitespace-nowrap">Unit Price ($)</th>
                    <th className="py-2.5 px-3 min-w-[105px] text-right bg-emerald-50/80 text-emerald-900 border-x border-emerald-100 whitespace-nowrap">Demand Qty</th>
                    <th className="py-2.5 px-3 min-w-[105px] text-right bg-emerald-50/80 text-emerald-900 border-r border-emerald-100 whitespace-nowrap">Total $</th>
                    <th className="py-2.5 px-3 min-w-[105px] text-right bg-red-50/80 text-red-900 border-r border-red-100 whitespace-nowrap">Reject Qty</th>
                    <th className="py-2.5 px-3 min-w-[105px] text-right bg-red-50/80 text-red-900 border-r border-red-100 whitespace-nowrap">Total $</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((r, idx) => {
                    const isDirectConsumer = 
                      String(r.channel || "").trim().toLowerCase() === "direct consumer" ||
                      String(r.buyer_name || "").toLowerCase().startsWith("cash sales");

                    const matchedBuyer = buyersList.find((b) => 
                      (r.buyer_code && (b.buyer_code === r.buyer_code || b.id === r.buyer_code)) ||
                      (b.buyer_name && r.buyer_name && (
                        b.buyer_name.trim().toLowerCase() === r.buyer_name.trim().toLowerCase() ||
                        normalizeBuyerName(b.buyer_name) === normalizeBuyerName(r.buyer_name)
                      ))
                    );

                    const isUnregistered = !isDirectConsumer && r.item_type !== "settlement" && (
                      r.validation_status === "unregistered_buyer" || !matchedBuyer
                    );
                    const isNoListing = !isDirectConsumer && !isUnregistered && r.validation_status === "no_listing";
                    const isUnmappedSku = !isUnregistered && r.validation_status === "unmapped_sku";
                    const isValid = r.validation_status === "valid" && !isUnregistered && !isNoListing && !isUnmappedSku;

                    return (
                      <tr 
                        key={r.id || idx} 
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Index */}
                        <td className="py-2 px-3 text-center text-zinc-400 text-[11px] font-mono">
                          {idx + 1}
                        </td>

                        {/* Row Actions: Invoice/CN Breakdown & Edit Snapshot Cost (At Very Left Side) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap w-14">
                          <div className="flex items-center justify-center gap-1">
                            {((Array.isArray(r.invoices) && r.invoices.length > 0) || 
                              (Array.isArray(r.credit_notes) && r.credit_notes.length > 0) || 
                              Number(r.demand_qty ?? r.quantity ?? 0) > 0 ||
                              Number(r.reject_qty ?? r.cn_quantity ?? 0) > 0 ||
                              !!r.source_file_url ||
                              !!r.invoice_file_url ||
                              !!r.cn_file_url) && (
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceBreakdownRow(r)}
                                className="p-1 rounded hover:bg-blue-50 text-[#0B57D0] transition-colors cursor-pointer inline-flex items-center justify-center"
                                title="View invoice & credit note breakdown"
                              >
                                <FileText size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenCostSnapshotModal(r)}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                Number(r.cost_price || 0) > 0 
                                  ? "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" 
                                  : "text-zinc-400 hover:text-[#0B57D0] hover:bg-blue-50"
                              }`}
                              title={
                                batchData?.status === "published"
                                  ? (Number(r.cost_price || 0) > 0 
                                      ? `Cost Price: $${Number(r.cost_price).toFixed(2)} (Published)` 
                                      : "Cost Price: $0.00 (Published)")
                                  : (Number(r.cost_price || 0) > 0 
                                      ? `Cost Price: $${Number(r.cost_price).toFixed(2)} (Click to edit)` 
                                      : "Set Cost Price for this month")
                              }
                            >
                              <DollarSign size={13} />
                            </button>
                          </div>
                        </td>

                        {/* 3-Tier Diagnostic Badges & Actions (Then Diagnose) */}
                        {batchData?.status !== "published" && (
                          <td className="py-2 px-3 text-center">
                          {isUnregistered ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNewBuyerCode(r.buyer_code);
                                setNewBuyerName(r.buyer_name || r.buyer_code);
                                setNewBuyerChannel(r.channel || (r.source_type === "tiktok" ? "TikTok" : ""));
                                setNewBuyerPaymentTerm("3");
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
                          ) : r.item_type === "settlement" ? (
                            (!r.settlement_items || r.settlement_items.length === 0) ? (
                              <button
                                type="button"
                                onClick={() => handleOpenSettlementModal(r)}
                                className="px-2 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10.5px] font-medium border border-amber-200/90 transition-colors cursor-pointer flex items-center justify-center gap-1 mx-auto"
                                title="Click to upload settlement breakdown (SKU, Description, Qty)"
                              >
                                <AlertCircle size={11} className="text-amber-600" />
                                <span>Pending Summary</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenSettlementModal(r)}
                                className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 text-[10.5px] font-medium cursor-pointer mx-auto"
                                title="Click to preview settlement items"
                              >
                                <CheckCircle2 size={11} className="text-emerald-600" />
                                <span>Valid</span>
                              </button>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-zinc-500 text-[10.5px]">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              <span>Valid</span>
                            </span>
                          )}
                        </td>
                      )}

                        {/* Buyer Code & Name */}
                        <td className="py-2 px-3 w-[150px] max-w-[150px] overflow-hidden">
                          {(() => {
                            const matchedBuyer = buyersList.find((b) => 
                              (r.buyer_code && (b.buyer_code === r.buyer_code || b.id === r.buyer_code)) ||
                              (b.buyer_name && r.buyer_name && b.buyer_name.trim().toLowerCase() === r.buyer_name.trim().toLowerCase())
                            );
                            const displayCode = r.buyer_code || matchedBuyer?.buyer_code || "";
                            const displayName = r.buyer_name || matchedBuyer?.buyer_name || displayCode || "Unknown Buyer";

                            return (
                              <div className="flex flex-col min-w-0 max-w-[140px]">
                                <span className="text-zinc-800 font-medium truncate block" title={displayName}>
                                  {displayName}
                                </span>
                                {displayCode ? (
                                  <span className="text-[10px] text-zinc-500 font-mono font-medium truncate block" title={displayCode}>{displayCode}</span>
                                ) : isDirectConsumer ? (
                                  <span className="text-[10px] text-zinc-400 font-medium truncate block">Direct Consumer</span>
                                ) : (
                                  <span className="text-[10px] text-amber-600 font-medium italic truncate block">Unregistered Buyer</span>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Channel */}
                        <td className="py-2 px-3">
                          {batchData?.status === "published" ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border inline-flex items-center ${
                              !r.channel || r.channel === "Not Set"
                                ? "bg-amber-50 text-amber-700 border-amber-200 italic"
                                : "bg-slate-100 text-slate-700 border-slate-200/80"
                            }`}>
                              {r.channel || "Not Set"}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setAssignChannelTarget(r);
                                setSelectedAssignChannel(r.channel || "Not Set");
                                setApplyChannelToAllBuyerRows(true);
                                setShowAssignChannelModal(true);
                              }}
                              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer inline-flex items-center gap-1 group ${
                                !r.channel || r.channel === "Not Set"
                                  ? "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 italic"
                                  : "bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#0B57D0] border-slate-200/80 hover:border-blue-200"
                              }`}
                              title="Click to assign sales channel"
                            >
                              <span>{r.channel || "Not Set"}</span>
                              <Edit2 size={9} className="text-zinc-400 group-hover:text-[#0B57D0] opacity-60 group-hover:opacity-100" />
                            </button>
                          )}
                        </td>

                        {/* Type */}
                        <td className="py-2 px-3">
                          {(() => {
                            const itType = r.item_type || "product";
                            const config = ITEM_TYPES.find((t) => t.value === itType) || ITEM_TYPES[0];
                            if (batchData?.status === "published") {
                              return (
                                <span className={`px-2 py-0.5 rounded text-[11px] font-medium border inline-flex items-center ${config.badgeClass}`}>
                                  {config.shortLabel}
                                </span>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenAssignItemTypeModal(r)}
                                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer inline-flex items-center gap-1 group ${config.badgeClass}`}
                                title={`Type: ${config.label}. Click to assign or edit.`}
                              >
                                <span>{config.shortLabel}</span>
                                <Edit2 size={9} className="opacity-60 group-hover:opacity-100" />
                              </button>
                            );
                          })()}
                        </td>

                        {/* Product SKU & Name */}
                        <td className="py-2 px-3 w-[160px] max-w-[170px] overflow-hidden">
                          <div className="flex flex-col min-w-0 max-w-[160px]">
                            <span 
                              className="text-zinc-800 truncate block font-medium" 
                              title={r.product_name || r.product_sku || ""}
                            >
                              {r.product_name || r.product_sku || "(No Description)"}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                              {r.item_type === "settlement" ? (
                                <div className="flex items-center gap-1.5 w-full">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenSettlementModal(r)}
                                    className="text-[10px] font-mono text-zinc-600 hover:text-[#0B57D0] hover:underline font-medium truncate flex items-center gap-1 cursor-pointer"
                                    title="Click to preview/manage settlement breakdown items"
                                  >
                                    <span>Settlement Line</span>
                                    {Array.isArray(r.settlement_items) && r.settlement_items.length > 0 && (
                                      <span className="text-[9.5px] px-1 py-0.2 bg-blue-50 text-[#0B57D0] rounded font-semibold shrink-0">
                                        ({r.settlement_items.length})
                                      </span>
                                    )}
                                  </button>
                                  <div className="flex items-center gap-0.5 ml-auto shrink-0">
                                    {batchData?.status !== "published" && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenSettlementModal(r)}
                                        className="p-1 rounded text-zinc-400 hover:text-[#0B57D0] hover:bg-blue-50 transition-colors cursor-pointer"
                                        title="Upload Excel breakdown (SKU, Description, Qty)"
                                      >
                                        <Upload size={11} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadSettlementExcel(r)}
                                      className="p-1 rounded text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                                      title={Array.isArray(r.settlement_items) && r.settlement_items.length > 0 ? "Download settlement breakdown Excel" : "Download sample template Excel"}
                                    >
                                      <Download size={11} />
                                    </button>
                                  </div>
                                </div>
                              ) : (r.item_type && r.item_type !== "product") ? (
                                <span className="text-[10px] font-mono text-zinc-400 italic">
                                  — (Non-Inventory Item)
                                </span>
                              ) : (
                                <>
                                  <span 
                                    className={`text-[10px] font-mono truncate shrink min-w-0 max-w-[130px] ${!r.product_sku ? "text-amber-600 font-semibold" : "text-zinc-500"}`}
                                    title={r.product_sku || "(Blank SKU)"}
                                  >
                                    {r.product_sku || "(Blank SKU)"}
                                  </span>
                                  {batchData?.status !== "published" && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAssignProductModal(r)}
                                      className="p-0.5 rounded text-zinc-400 hover:text-[#0B57D0] hover:bg-blue-50 transition-colors cursor-pointer inline-flex items-center justify-center group shrink-0"
                                      title="Click to assign master product SKU"
                                    >
                                      <Edit2 size={10} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Brand */}
                        <td className="py-2 px-3 text-zinc-600">
                          {(() => {
                            if (r.item_type && r.item_type !== "product") {
                              if (r.brand && r.brand !== "Unassigned Brand" && r.brand !== "Unassigned") return r.brand;
                              if (r.item_type === "bcrs") return "BCRS";
                              if (r.item_type === "rebate") return "Sale Rebate";
                              if (r.item_type === "fee") return "Fee";
                              if (r.item_type === "service") return "Service";
                              if (r.item_type === "settlement") return "Settlement";
                              return "Non-Product";
                            }
                            return r.brand || "Unassigned";
                          })()}
                        </td>

                        {/* Unit Price ($/pcs) - 100% from Invoice, non-editable */}
                        <td className="py-2 px-3 text-right text-zinc-800 font-mono">
                          <div className="flex items-center justify-end gap-1.5">
                            {r.has_price_mismatch && (
                              batchData?.status === "published" ? (
                                <span
                                  className="p-0.5 rounded-full text-amber-600 inline-flex items-center justify-center shrink-0 cursor-default"
                                  title={`List Price : $${Number(r.listing_price || 0).toFixed(2)}`}
                                >
                                  <AlertCircle size={13} className="stroke-[2.2]" />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPriceMismatchModal(r)}
                                  className="p-0.5 rounded-full text-amber-600 hover:text-amber-700 hover:bg-amber-100/70 transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
                                  title={`List Price : $${Number(r.listing_price || 0).toFixed(2)}`}
                                >
                                  <AlertCircle size={13} className="stroke-[2.2]" />
                                </button>
                              )
                            )}
                            <span>${Number(r.unit_price || 0).toFixed(2)}</span>
                          </div>
                        </td>

                        {/* Demand Quantity - Light Green */}
                        <td className="py-2 px-3 text-right text-emerald-950 font-mono bg-emerald-50/50 border-x border-emerald-100/50 whitespace-nowrap">
                          <span>{r.item_type === "settlement" ? "—" : Number(r.demand_qty ?? r.quantity ?? 0).toLocaleString()}</span>
                        </td>

                        {/* Total Demand ($) - Light Green */}
                        <td className="py-2 px-3 text-right text-emerald-950 font-mono font-medium bg-emerald-50/50 border-r border-emerald-100/50 whitespace-nowrap">
                          ${Number(r.total_demand || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Reject Qty - Light Red */}
                        <td className="py-2 px-3 text-right text-red-950 font-mono bg-red-50/50 border-r border-red-100/50 whitespace-nowrap">
                          {Number(r.reject_qty ?? r.cn_quantity ?? 0) > 0 ? Number(r.reject_qty ?? r.cn_quantity ?? 0).toLocaleString() : "-"}
                        </td>

                        {/* CN Total ($) - Light Red */}
                        <td className="py-2 px-3 text-right text-red-950 font-mono bg-red-50/50 border-r border-red-100/50 whitespace-nowrap">
                          {Number(r.cn_amount || 0) > 0 ? `-$${Number(r.cn_amount).toFixed(2)}` : "-"}
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
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-32">Buyer Code</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Buyer / Retailer Name</th>
                    <th className="py-2.5 px-3 w-36">Assigned Sales Channel</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Store Name</th>
                    <th className="py-2.5 px-3 w-24 text-center">Total Stores</th>
                    <th className="py-2.5 px-3 w-28 text-center">Registered Date</th>
                    <th className="py-2.5 px-3 w-20 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBuyers.map((b, idx) => {
                    const draft = buyerDrafts[b.id] || { buyer_code: b.buyer_code, buyer_name: b.buyer_name, channel: b.channel || "" };

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
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border whitespace-nowrap ${
                              !b.channel || b.channel === "Not Set"
                                ? "bg-amber-50 text-amber-700 border-amber-200 italic"
                                : "bg-slate-100 text-slate-700 border-slate-200/80"
                            }`}>
                              {b.channel || "Not Set"}
                            </span>
                          )}
                        </td>

                        {/* Store Name / Groups with (qty) */}
                        <td className="py-2 px-3">
                          {(() => {
                            const groups = (Array.isArray(b.store_groups) ? b.store_groups : [])
                              .filter((g: any) => g.group_name && g.group_name.trim().length > 0);

                            if (groups.length === 0) {
                              return (
                                <span className="text-zinc-400 italic text-[11px]">
                                  {b.buyer_name || "Main Store"} (1)
                                </span>
                              );
                            }

                            return (
                              <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                                {groups.map((g: any, gIdx: number) => (
                                  <span
                                    key={gIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-zinc-700 border border-slate-200/80 text-[11px]"
                                  >
                                    <span className="font-medium text-zinc-800">{g.group_name}</span>
                                    <span className="font-mono text-zinc-500 font-semibold">({g.store_count || 1})</span>
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Total Stores */}
                        <td className="py-2 px-3 text-center">
                          {(() => {
                            const groups = Array.isArray(b.store_groups) ? b.store_groups : [];
                            const computedCount = groups.reduce((acc: number, curr: any) => acc + (Number(curr.store_count) || 0), 0);
                            const storeCount = computedCount > 0 ? computedCount : 1;
                            const validGroupsCount = groups.filter((g: any) => g.group_name && g.group_name.trim().length > 0).length;

                            return (
                              <div className="flex flex-col items-center justify-center">
                                <span className="font-mono font-semibold text-zinc-900">
                                  {storeCount.toLocaleString()}
                                </span>
                                {validGroupsCount > 1 && (
                                  <span className="text-[10px] text-zinc-400" title={`${validGroupsCount} store groups configured`}>
                                    ({validGroupsCount} groups)
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Registered Date */}
                        <td className="py-2 px-3 text-center text-zinc-400 font-mono text-[11px]">
                          {b.created_at ? new Date(Number(b.created_at)).toLocaleDateString() : "-"}
                        </td>

                        {/* Action Buttons: Edit Pen & Trash */}
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditBuyer(b)}
                              className="p-1 rounded text-zinc-400 hover:text-[#0B57D0] hover:bg-blue-50 transition-colors cursor-pointer"
                              title={`Edit Buyer: ${b.buyer_name}`}
                            >
                              <Edit2 size={13} />
                            </button>
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
                              title={`Delete Buyer: ${b.buyer_name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
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
      {/* 3. TAB 2B: PRODUCT LIST (Unified Master & Temporary Products)              */}
      {/* ========================================================================= */}
      {activeMainTab === "products" && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Filter & Controls Toolbar */}
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              
              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search SKU, name, or brand..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-8 pl-8 pr-3 w-64 bg-white border border-slate-200 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* Brand Filter Dropdown */}
              <select
                value={productBrandFilter}
                onChange={(e) => setProductBrandFilter(e.target.value)}
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs text-zinc-700 focus:outline-none focus:border-[#0B57D0] cursor-pointer"
              >
                <option value="all">All Brands ({productFilterBrands.length})</option>
                {productFilterBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {/* Type Filter Pills */}
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setProductTypeFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                    productTypeFilter === "all" ? "bg-slate-100 text-zinc-900 font-semibold" : "text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  All ({productsList.length + tempProductsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProductTypeFilter("master")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer",
                    productTypeFilter === "master" ? "bg-slate-100 text-zinc-900 font-semibold" : "text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Master ({productsList.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProductTypeFilter("temp")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer",
                    productTypeFilter === "temp" ? "bg-slate-100 text-zinc-900 font-semibold" : "text-zinc-500 hover:text-zinc-900"
                  )}
                >
                  <CheckCircle2 size={13} className="text-zinc-400" />
                  <span>Temp ({tempProductsList.length})</span>
                </button>
              </div>

            </div>

            <div className="text-[11px] text-zinc-400">
              Showing {unifiedProductList.length} products
            </div>
          </div>

          {/* Unified Table Viewport */}
          <div className="flex-1 min-h-0 overflow-auto bg-white">
            {loadingTempProducts ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-zinc-400">
                <RefreshCw size={18} className="animate-spin text-[#0B57D0]" />
                <span className="text-xs">Loading products...</span>
              </div>
            ) : unifiedProductList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                <p className="text-xs text-zinc-500">No products found matching the criteria.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200 text-zinc-600 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12" title="Green check = Master Catalog, Gray check = Temporary">
                      Type
                    </th>
                    <th className="py-2.5 px-3 w-40">SKU Number</th>
                    <th className="py-2.5 px-4">Product Name</th>
                    <th className="py-2.5 px-4 w-44">Brand</th>
                    <th className="py-2.5 px-4 text-right w-28">Cost Price</th>
                    <th className="py-2.5 px-4 w-48">Remarks</th>
                    <th className="py-2.5 px-3 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unifiedProductList.map((item, idx) => (
                    <tr key={`${item.is_temp ? 'temp' : 'master'}_${item.id || item.sku || idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center">
                          {item.is_temp ? (
                            <span title="Temporary Product (Sell-In only)">
                              <CheckCircle2 size={16} className="text-zinc-400" />
                            </span>
                          ) : (
                            <span title="Master Product (Official catalog)">
                              <CheckCircle2 size={16} className="text-emerald-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-zinc-900">
                        {item.sku}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-zinc-900">
                        {item.product_name}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-600">
                        {item.brand}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-zinc-800">
                        ${item.cost_price ? item.cost_price.toFixed(2) : "0.00"}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-500 text-[11px] truncate max-w-xs">
                        {item.remarks || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {item.is_temp ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTempProduct(item)}
                              className="p-1 text-zinc-400 hover:text-[#0B57D0] rounded transition-colors cursor-pointer"
                              title="Edit Temporary Product"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTempProduct(item)}
                              className="p-1 text-zinc-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Delete Temporary Product"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-300 font-mono text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
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
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-5 bg-[#F8F9FA] select-none">
          <div className="w-full flex flex-col gap-4 relative">
            <div className="w-full p-2">
              <div className="flex flex-wrap gap-6 items-start">
                
                {/* Card 1: Report by Brands */}
                <div
                  className={cn(
                    "bg-white border rounded-lg transition-all duration-300 shadow-xs hover:shadow-md select-none flex flex-col justify-between overflow-hidden",
                    selectedPrintLayout === "report-by-brands"
                      ? "w-[480px] min-h-[220px] border-[#0B57D0] scale-[1.01]"
                      : "group relative w-[240px] h-[180px] border-slate-200 hover:bg-[#D3E3FD] cursor-pointer flex items-center justify-center hover:scale-[1.03]"
                  )}
                  onClick={() => {
                    if (selectedPrintLayout !== "report-by-brands") {
                      setSelectedPrintLayout("report-by-brands");
                    }
                  }}
                >
                  {selectedPrintLayout !== "report-by-brands" ? (
                    <div className="w-full h-full p-6 flex flex-col items-center justify-center relative pointer-events-none">
                      <span className="font-primary text-sm font-semibold text-zinc-800 transition-all duration-300 group-hover:opacity-0 group-hover:scale-90 text-center px-4 absolute">
                        Report by Brands
                      </span>
                      <span className="font-primary text-xs leading-relaxed font-semibold text-[#041E49] transition-all duration-300 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 text-center px-5 absolute">
                        Print landscape sales matrix by brand across selected months.
                      </span>
                    </div>
                  ) : (
                    <div className="w-[480px] p-5 flex flex-col gap-4 text-xs font-primary shrink-0 transition-opacity duration-300 animate-in fade-in fill-mode-both">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0B57D0]">
                          Configure Report by Brands
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPrintLayout(null);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Clean Form Controls */}
                      <div className="space-y-3">
                        {/* Year & Month End Selectors */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                              Select Year
                            </label>
                            <CustomSelect
                              value={String(reportSelectedYear)}
                              onChange={(val) => setReportSelectedYear(Number(val))}
                              options={yearSelectOptions}
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

                        {/* Reporting Duration */}
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

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={handleOpenEditStoreMapping}
                          disabled={loadingBrandStoreMapping || exportingExcel || generatingPdf}
                          className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                          title="Edit which store groups each brand carries"
                        >
                          {loadingBrandStoreMapping ? (
                            <RefreshCw size={12} className="animate-spin text-zinc-500" />
                          ) : (
                            <SlidersHorizontal size={12} className="text-zinc-500" />
                          )}
                          <span>Edit Store Mapping</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleExportBrandReportExcel()}
                            disabled={exportingExcel || generatingPdf || loadingBrandStoreMapping}
                            className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                          >
                            {exportingExcel ? <RefreshCw size={13} className="animate-spin text-emerald-600" /> : <FileSpreadsheet size={13} className="text-emerald-600" />}
                            <span>{exportingExcel ? "Exporting..." : "Download Excel"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleGenerateReportPdf}
                            disabled={generatingPdf || exportingExcel || loadingBrandStoreMapping}
                            className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-98 disabled:opacity-50"
                          >
                            {generatingPdf ? <RefreshCw size={13} className="animate-spin text-white" /> : <Printer size={13} className="text-white" />}
                            <span>{generatingPdf ? "Compiling..." : "Generate Report"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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

      {/* Modal: Assign Store Groups to Brands (Only for buyers with >1 store group) */}
      {showBrandStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-100">
            
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <h2 className="text-sm font-bold text-zinc-950">Assign Store Groups to Brands</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Select which store groups each brand carries for accurate store count calculations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBrandStoreModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body: Clean Flat List without Nested Containers */}
            <div className="px-5 py-2 flex-1 overflow-y-auto min-h-0 bg-white divide-y divide-slate-200 text-xs font-primary">
              {groupedBrandStoreAssignments.map(({ brandName, buyers }) => (
                <div key={brandName} className="py-3.5 first:pt-2 last:pb-2 space-y-3">
                  
                  {/* Brand Title (Clean Neutral Header) */}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wide text-zinc-900">
                      {brandName}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      • {buyers.length} {buyers.length > 1 ? "buyers" : "buyer"} with multiple store groups
                    </span>
                  </div>

                  {/* Buyers List (Direct Rows) */}
                  <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                    {buyers.map((b) => {
                      const draftKey = `${brandName}::${b.buyer_code}`;
                      const draft = newTagInput[draftKey] || { name: "", count: 1 };

                      return (
                        <div key={b.buyer_code || b.buyer_name} className="space-y-1.5">
                          
                          {/* Row 1: Buyer Name & Numeric Store Qty */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-zinc-900 text-xs">
                                {b.buyer_name}
                              </span>
                              {b.buyer_code && (
                                <span className="font-mono text-[10px] bg-slate-100 text-zinc-600 px-1.5 py-0.5 rounded">
                                  {b.buyer_code}
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-400">
                                ({b.channel || "Not Set"})
                              </span>
                            </div>

                            {/* Store Qty inline */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] text-zinc-500">Store Qty:</span>
                              <input
                                type="number"
                                min="0"
                                value={b.assigned_store_count}
                                onChange={(e) => handleUpdateStoreCount(brandName, b.buyer_code, parseInt(e.target.value, 10) || 0)}
                                className="w-16 h-7 px-1.5 border border-slate-300 rounded text-center text-xs font-bold text-zinc-900 bg-white focus:outline-none focus:border-zinc-500"
                              />
                            </div>
                          </div>

                          {/* Row 2: Clickable Store Groups Tags (Soft Neutral Design) */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {b.available_groups.map((grp) => {
                              const isSelected = b.selected_groups.includes(grp.group_name);
                              return (
                                <button
                                  key={grp.group_name}
                                  type="button"
                                  onClick={() => handleToggleStoreGroup(brandName, b.buyer_code, grp.group_name)}
                                  className={cn(
                                    "h-6 px-2.5 rounded-full text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer border",
                                    isSelected
                                      ? "bg-slate-100 border-slate-300 text-zinc-900 font-semibold shadow-2xs"
                                      : "bg-white border-slate-200 text-zinc-500 hover:bg-slate-50 hover:text-zinc-800"
                                  )}
                                >
                                  {isSelected ? <Check size={11} className="text-zinc-700" /> : <Plus size={11} className="text-zinc-400" />}
                                  <span>{grp.group_name}</span>
                                  <span className={cn("text-[10px] font-mono", isSelected ? "text-zinc-600" : "text-zinc-400")}>
                                    ({grp.store_count})
                                  </span>
                                </button>
                              );
                            })}

                            {/* Inline Add Tag */}
                            <div className="flex items-center gap-1 border border-slate-200 rounded-md px-1.5 py-0.5 bg-white">
                              <input
                                type="text"
                                value={draft.name}
                                onChange={(e) =>
                                  setNewTagInput((prev) => ({
                                    ...prev,
                                    [draftKey]: { ...draft, name: e.target.value }
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddNewStoreTag(brandName, b.buyer_code);
                                  }
                                }}
                                placeholder="+ Group tag"
                                className="w-20 h-5 text-[11px] text-zinc-800 focus:outline-none"
                              />
                              <input
                                type="number"
                                min="1"
                                value={draft.count}
                                onChange={(e) =>
                                  setNewTagInput((prev) => ({
                                    ...prev,
                                    [draftKey]: { ...draft, count: Math.max(1, parseInt(e.target.value, 10) || 1) }
                                  }))
                                }
                                placeholder="Qty"
                                className="w-10 h-5 px-1 text-[11px] font-mono text-center text-zinc-800 border-l border-slate-200 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddNewStoreTag(brandName, b.buyer_code)}
                                disabled={!draft.name.trim()}
                                className="h-5 px-1.5 text-zinc-600 hover:text-zinc-900 text-[10px] font-bold cursor-pointer disabled:opacity-30"
                              >
                                Add
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-zinc-500">
                Saved mappings will be stored in database and remembered for future reports.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBrandStoreModal(false)}
                  className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                {brandStoreModalAction !== "edit_only" && (
                  <button
                    type="button"
                    onClick={handleSkipAndProceed}
                    className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Skip & Generate
                  </button>
                )}
                <button
                  type="button"
                  disabled={savingBrandStoreMapping}
                  onClick={handleSaveBrandStoreMappingsAndProceed}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {savingBrandStoreMapping ? <RefreshCw size={13} className="animate-spin text-white" /> : <Check size={13} />}
                  <span>
                    {savingBrandStoreMapping
                      ? "Saving Mappings..."
                      : brandStoreModalAction === "edit_only"
                      ? "Save Store Mapping"
                      : "Save Mapping & Generate Report"}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Add / Edit Temporary Product */}
      {showTempProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-100">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div>
                <h2 className="text-sm font-bold text-zinc-950">
                  {editingTempProduct ? "Edit Temporary Product" : "Add Temporary Product"}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Registered for Sell-In only and kept separated from Master Products.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTempProductModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTempProduct} className="p-5 space-y-3.5 text-xs font-primary">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  SKU Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TMP-CLEAR-01"
                  value={tempProductSku}
                  onChange={(e) => setTempProductSku(e.target.value)}
                  className={cn(
                    "w-full h-8 px-2.5 border rounded-lg text-xs font-mono text-zinc-900 bg-white focus:outline-none",
                    isSkuInMaster
                      ? "border-red-400 focus:border-red-500 bg-red-50/20"
                      : "border-slate-300 focus:border-[#0B57D0]"
                  )}
                />
                {isSkuInMaster && (
                  <p className="text-[11px] text-red-600 mt-1 font-medium flex items-center gap-1">
                    <AlertCircle size={12} />
                    This SKU already exists in Master Catalog
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Special Clearance Bundle 500g"
                  value={tempProductName}
                  onChange={(e) => setTempProductName(e.target.value)}
                  className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs text-zinc-900 bg-white focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    list="temp-brand-options"
                    placeholder="Select or enter brand"
                    value={tempProductBrand}
                    onChange={(e) => setTempProductBrand(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs text-zinc-900 bg-white focus:outline-none focus:border-[#0B57D0]"
                  />
                  <datalist id="temp-brand-options">
                    {brandsList.map((b: any) => {
                      const name = b.display_name || b.name || b.brand_name;
                      return <option key={b.id || name} value={name} />;
                    })}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                    Cost / Unit Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={tempProductCostPrice}
                    onChange={(e) => setTempProductCostPrice(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs font-mono text-zinc-900 bg-white focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. One-time promo item, June 2026 batch"
                  value={tempProductRemarks}
                  onChange={(e) => setTempProductRemarks(e.target.value)}
                  className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs text-zinc-900 bg-white focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTempProductModal(false)}
                  className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTempProduct || isSkuInMaster}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {savingTempProduct ? <RefreshCw size={13} className="animate-spin text-white" /> : <Check size={13} />}
                  <span>{editingTempProduct ? "Update Product" : "Save Temp Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: AI Parsing Progress Overlay */}
      {(parsingInvoices || parsingCreditNotes) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-2xl p-6 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0B57D0]">
              <RefreshCw size={24} className="animate-spin text-[#0B57D0]" />
            </div>
            <div className="w-full">
              <h3 className="text-sm font-semibold text-zinc-900">
                {parsingCreditNotes ? "AI Credit Note Analysis in Progress" : "AI Document Analysis in Progress"}
              </h3>
              <p className="text-xs text-zinc-600 mt-1 leading-relaxed break-words">
                {(parsingCreditNotes ? parsingCnStatusText : parsingStatusText) || "Extracting document data with Gemini Vision..."}
              </p>

              {/* Real-time Progress Bar */}
              {((parsingCreditNotes ? parsingCnProgress : parsingProgress) > 0) && (
                <div className="w-full mt-3">
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="bg-[#0B57D0] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${parsingCreditNotes ? parsingCnProgress : parsingProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] font-mono text-zinc-500 mt-1.5">
                    <span>Processing Pages</span>
                    <span className="font-semibold text-[#0B57D0]">
                      {parsingCreditNotes ? parsingCnProgress : parsingProgress}%
                    </span>
                  </div>
                </div>
              )}
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

            <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-[#F8F9FA] min-h-0">
              {parsedInvoices.map((inv, invIdx) => (
                <div key={invIdx} className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden shrink-0">
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
                              setNewBuyerChannel("");
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
                              <td className="py-2 px-3 text-zinc-800 max-w-[200px] overflow-hidden">
                                <span className="font-medium truncate block" title={it.description}>{it.description}</span>
                                {it.product_name && it.product_name !== it.description && (
                                  <span className="text-[10px] text-zinc-400 truncate block" title={it.product_name}>{it.product_name}</span>
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

            <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-[#F8F9FA] min-h-0">
              {parsedCreditNotes.map((cn, cnIdx) => (
                <div key={cnIdx} className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden shrink-0">
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
                              setNewBuyerChannel("");
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
                              <td className="py-2 px-3 text-zinc-800 max-w-[200px] overflow-hidden">
                                <span className="font-medium truncate block" title={it.description}>{it.description}</span>
                                {it.product_name && it.product_name !== it.description && (
                                  <span className="text-[10px] text-zinc-400 truncate block" title={it.product_name}>{it.product_name}</span>
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
                    <th className="py-1.5 px-2 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {(() => {
                    const invs = Array.isArray(selectedInvoiceBreakdownRow.invoices) && selectedInvoiceBreakdownRow.invoices.length > 0
                      ? selectedInvoiceBreakdownRow.invoices
                      : (Number(selectedInvoiceBreakdownRow.total_demand || 0) > 0 || Number(selectedInvoiceBreakdownRow.demand_qty ?? selectedInvoiceBreakdownRow.quantity ?? 0) > 0)
                        ? [{
                            invoice_no: selectedInvoiceBreakdownRow.invoice_file_name || selectedInvoiceBreakdownRow.source_file_name || "Invoice",
                            invoice_date: "-",
                            qty: Number(selectedInvoiceBreakdownRow.demand_qty ?? selectedInvoiceBreakdownRow.quantity ?? 0),
                            unit_price: Number(selectedInvoiceBreakdownRow.unit_price || 0),
                            amount: Number(selectedInvoiceBreakdownRow.total_demand || 0)
                          }]
                        : [];

                    if (invs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="py-3 text-center text-zinc-400 text-xs">
                            No invoice breakdown details available.
                          </td>
                        </tr>
                      );
                    }

                    const handleToggleExclusion = async (invIdx: number, inv: any) => {
                      if (!selectedInvoiceBreakdownRow?.id || togglingInvoiceIdx !== null) return;
                      setTogglingInvoiceIdx(invIdx);
                      try {
                        const nextExcluded = !inv.is_excluded;
                        const targetRecordId = inv.parent_record_id || selectedInvoiceBreakdownRow.id;
                        const res = await fetch(`${API_BASE}/api/sellin/toggle-invoice-exclusion`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            record_id: targetRecordId,
                            invoice_index: invIdx,
                            invoice_no: inv.invoice_no,
                            is_excluded: nextExcluded
                          })
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          // Update local modal state immediately without truncating consolidated invoices
                          const updatedInvs = Array.isArray(selectedInvoiceBreakdownRow.invoices) ? [...selectedInvoiceBreakdownRow.invoices] : [];
                          if (updatedInvs[invIdx]) {
                            updatedInvs[invIdx] = { ...updatedInvs[invIdx], is_excluded: nextExcluded };
                          }

                          const invQty = Number(inv.qty || 0);
                          const invAmt = Number(inv.amount || (invQty * Number(inv.unit_price || 0)) || 0);
                          const deltaQty = nextExcluded ? -invQty : invQty;
                          const deltaAmt = nextExcluded ? -invAmt : invAmt;
                          const nextDemandQty = Math.max(0, Number(selectedInvoiceBreakdownRow.demand_qty ?? selectedInvoiceBreakdownRow.quantity ?? 0) + deltaQty);
                          const nextTotalDemand = Math.max(0, Number(selectedInvoiceBreakdownRow.total_demand || 0) + deltaAmt);

                          setSelectedInvoiceBreakdownRow((prev: any) => ({
                            ...prev,
                            invoices: updatedInvs,
                            quantity: nextDemandQty,
                            demand_qty: nextDemandQty,
                            total_demand: nextTotalDemand
                          }));
                          showToast(nextExcluded ? `Excluded invoice ${inv.invoice_no} from demand` : `Restored invoice ${inv.invoice_no} to demand`, "success");
                          // Optimistically update main table records immediately
                          setRecords((prevRecs) =>
                            prevRecs.map((rec) =>
                              rec.id === selectedInvoiceBreakdownRow.id
                                ? {
                                    ...rec,
                                    invoices: updatedInvs,
                                    quantity: nextDemandQty,
                                    demand_qty: nextDemandQty,
                                    total_demand: nextTotalDemand
                                  }
                                : rec
                            )
                          );
                          // Refresh batch details in background silently
                          fetchBatchDetails(currentPeriod, true);
                        } else {
                          showToast(data.error || "Failed to update invoice exclusion", "error");
                        }
                      } catch (err: any) {
                        showToast(err.message || "Failed to toggle invoice exclusion", "error");
                      } finally {
                        setTogglingInvoiceIdx(null);
                      }
                    };

                    return invs.map((inv: any, idx: number) => {
                      const isExcluded = Boolean(inv.is_excluded);
                      return (
                        <tr key={idx} className={isExcluded ? "bg-slate-50/70 opacity-60 text-zinc-400" : ""}>
                          <td className="py-2 px-2">
                            <span className={cn("font-semibold", isExcluded ? "line-through text-zinc-400" : "text-[#0B57D0]")}>
                              {inv.invoice_no}
                            </span>
                            {isExcluded && (
                              <span className="ml-1.5 text-[9px] font-sans px-1 py-0.2 rounded bg-zinc-200 text-zinc-600 uppercase font-medium">
                                Excluded
                              </span>
                            )}
                          </td>
                          <td className={cn("py-2 px-2", isExcluded ? "line-through text-zinc-400" : "text-zinc-600")}>
                            {inv.invoice_date || "-"}
                          </td>
                          <td className={cn("py-2 px-2 text-right font-semibold", isExcluded ? "line-through text-zinc-400" : "text-zinc-800")}>
                            {inv.qty}
                          </td>
                          <td className={cn("py-2 px-2 text-right", isExcluded ? "line-through text-zinc-400" : "text-zinc-600")}>
                            ${Number(inv.unit_price || 0).toFixed(2)}
                          </td>
                          <td className={cn("py-2 px-2 text-right font-semibold", isExcluded ? "line-through text-zinc-400" : "text-zinc-900")}>
                            ${Number(inv.amount || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {Array.isArray(selectedInvoiceBreakdownRow.invoices) && selectedInvoiceBreakdownRow.invoices.length > 0 ? (
                              <button
                                type="button"
                                disabled={togglingInvoiceIdx !== null}
                                onClick={() => handleToggleExclusion(idx, inv)}
                                className={cn(
                                  "p-1 rounded cursor-pointer transition-colors inline-flex items-center justify-center",
                                  isExcluded 
                                    ? "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60" 
                                    : "text-zinc-500 hover:text-[#0B57D0] hover:bg-blue-50"
                                )}
                                title={isExcluded ? "Include back in calculation" : "Exclude from calculation"}
                              >
                                {isExcluded ? <EyeOff size={13} className="text-zinc-500" /> : <Eye size={13} />}
                              </button>
                            ) : (
                              <span className="text-zinc-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>

              {(() => {
                const cns = Array.isArray(selectedInvoiceBreakdownRow.credit_notes) && selectedInvoiceBreakdownRow.credit_notes.length > 0
                  ? selectedInvoiceBreakdownRow.credit_notes
                  : (Number(selectedInvoiceBreakdownRow.cn_amount || 0) > 0 || Number(selectedInvoiceBreakdownRow.reject_qty ?? selectedInvoiceBreakdownRow.cn_quantity ?? 0) > 0)
                    ? [{
                        cn_no: selectedInvoiceBreakdownRow.cn_file_name || selectedInvoiceBreakdownRow.source_file_name || "Credit Note",
                        cn_date: "-",
                        qty: Number(selectedInvoiceBreakdownRow.reject_qty ?? selectedInvoiceBreakdownRow.cn_quantity ?? 0),
                        unit_price: Number(selectedInvoiceBreakdownRow.unit_price || 0),
                        amount: Number(selectedInvoiceBreakdownRow.cn_amount || 0)
                      }]
                    : [];

                if (cns.length === 0) return null;

                return (
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="text-xs font-semibold text-zinc-900 mb-2 flex items-center gap-1.5">
                      <span>Credit Notes / Rejects</span>
                      <span className="text-[10px] bg-slate-100 text-zinc-700 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                        {cns.length}
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
                        {cns.map((cn: any, idx: number) => (
                          <tr key={idx}>
                            <td className="py-2 px-2 text-zinc-900 font-semibold">{cn.cn_no}</td>
                            <td className="py-2 px-2 text-zinc-600">{cn.cn_date || "-"}</td>
                            <td className="py-2 px-2 text-right text-zinc-800 font-semibold">{cn.qty}</td>
                            <td className="py-2 px-2 text-right text-zinc-600">${Number(cn.unit_price || 0).toFixed(2)}</td>
                            <td className="py-2 px-2 text-right text-zinc-900 font-semibold">-${Number(cn.amount || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
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

      {/* Modal: Month Picker (Year by Year) */}
      {showMonthPickerModal && (
        <div
          onClick={() => setShowMonthPickerModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[290px] bg-white rounded-xl border border-slate-200 shadow-2xl p-3.5 flex flex-col animate-in zoom-in-95 duration-100"
          >
            {/* Header: Prev Year, Year, Next Year, Close */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMonthPickerYear((prev) => prev - 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-[#0B57D0] hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Previous Year"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold text-zinc-900 tracking-tight font-mono px-1">
                  {monthPickerYear}
                </span>
                <button
                  type="button"
                  onClick={() => setMonthPickerYear((prev) => prev + 1)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-600 hover:text-[#0B57D0] hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Next Year"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowMonthPickerModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* 12 Months Grid (3 x 4) */}
            <div className="grid grid-cols-3 gap-2 pt-3">
              {[
                { name: "Jan", num: "01" },
                { name: "Feb", num: "02" },
                { name: "Mar", num: "03" },
                { name: "Apr", num: "04" },
                { name: "May", num: "05" },
                { name: "Jun", num: "06" },
                { name: "Jul", num: "07" },
                { name: "Aug", num: "08" },
                { name: "Sep", num: "09" },
                { name: "Oct", num: "10" },
                { name: "Nov", num: "11" },
                { name: "Dec", num: "12" },
              ].map((m) => {
                const targetPeriod = `${monthPickerYear}-${m.num}`;
                const isSelected = targetPeriod === currentPeriod;
                const isFuture = targetPeriod > getSingaporeCurrentPeriod();

                return (
                  <button
                    key={m.num}
                    type="button"
                    disabled={isFuture}
                    onClick={() => {
                      if (isFuture) return;
                      setCurrentPeriod(targetPeriod);
                      setShowMonthPickerModal(false);
                    }}
                    className={`w-full h-10 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#0B57D0] text-white shadow-xs"
                        : isFuture
                        ? "text-zinc-300 bg-slate-50/60 cursor-not-allowed border border-dashed border-slate-200/60"
                        : "text-zinc-700 bg-white hover:bg-[#E8F0FE] hover:text-[#0B57D0] hover:border-[#0B57D0]/40 border border-slate-200 shadow-2xs"
                    }`}
                    title={isFuture ? "Future period cannot be selected" : `${m.name} ${monthPickerYear}`}
                  >
                    <span>{m.name}</span>
                  </button>
                );
              })}
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

      {/* Modal: Edit Buyer Master */}
      {showEditBuyerModal && editingBuyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-visible flex flex-col animate-in zoom-in-95 duration-100">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Edit Buyer Master</h2>
                <p className="text-xs text-zinc-500">Update customer codes, sales channel, payment terms, and store groups.</p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowEditBuyerModal(false);
                  setEditingBuyer(null);
                }} 
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-medium text-zinc-700 block mb-1">Buyer Code / CustCode <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={editBuyerCode}
                    onChange={(e) => setEditBuyerCode(e.target.value)}
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
                      value={editBuyerPaymentTerm}
                      onChange={(e) => setEditBuyerPaymentTerm(e.target.value.replace(/[^0-9]/g, ""))}
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
                <label className="font-medium text-zinc-700 block mb-1">Buyer / Company Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editBuyerName}
                  onChange={(e) => setEditBuyerName(e.target.value)}
                  placeholder="e.g. FairPrice Supermarket"
                  className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* Sales Channel Dropdown with ample z-index */}
              <div className="relative z-30">
                <label className="font-medium text-zinc-700 block mb-1">Sales Channel</label>
                <CustomSelect
                  value={editBuyerChannel}
                  onChange={setEditBuyerChannel}
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
                    <p className="text-[11px] text-zinc-500">Edit retail banners & outlet counts (e.g. Cheers, FairPrice Supermarket)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditBuyerStoreGroups((prev) => [...prev, { group_name: "", store_count: 1 }])}
                    className="h-6 px-2 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-[#0B57D0] text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus size={11} />
                    <span>Add Group</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-0.5">
                  {editBuyerStoreGroups.map((grp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        value={grp.group_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditBuyerStoreGroups((prev) => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], group_name: val };
                            return copy;
                          });
                        }}
                        placeholder="Group / Banner (e.g. Cheers, FairPrice Finest)"
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
                            setEditBuyerStoreGroups((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], store_count: val };
                              return copy;
                            });
                          }}
                          className="w-16 h-7 px-1.5 border border-slate-200 rounded text-xs font-mono text-center text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
                        />
                      </div>
                      {editBuyerStoreGroups.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditBuyerStoreGroups((prev) => prev.filter((_, i) => i !== idx))}
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
                  <span>Total Groups: <strong>{editBuyerStoreGroups.filter(g => g.group_name.trim().length > 0).length || 1}</strong></span>
                  <span>Total Outlets: <strong>{editBuyerStoreGroups.reduce((acc, curr) => acc + (Number(curr.store_count) || 1), 0)} stores</strong></span>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowEditBuyerModal(false);
                  setEditingBuyer(null);
                }}
                className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEditBuyer || !editBuyerCode.trim() || !editBuyerName.trim()}
                onClick={handleSaveEditBuyer}
                className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {savingEditBuyer ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Assign / Edit Item Type */}
      {showAssignItemTypeModal && assignItemTypeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-visible animate-in zoom-in-95 duration-100 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 rounded-t-xl">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Assign Item Type</h2>
                <p className="text-xs text-zinc-500">Categorize this invoice row as merchandise, rebate, fee, or delivery charge.</p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowAssignItemTypeModal(false);
                  setAssignItemTypeTarget(null);
                }} 
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3.5 text-xs">
              {/* Item Context Card */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-zinc-500 font-medium text-[11px] shrink-0">Item:</span>
                  <span className="font-semibold text-zinc-900 text-right break-words">
                    {assignItemTypeTarget.product_name || assignItemTypeTarget.product_sku || "(No Description)"}
                  </span>
                </div>
                {assignItemTypeTarget.product_sku && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium text-[11px]">Invoice Code:</span>
                    <span className="font-mono text-zinc-700">{assignItemTypeTarget.product_sku}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium text-[11px]">Buyer:</span>
                  <span className="text-zinc-700 font-medium">{assignItemTypeTarget.buyer_name || assignItemTypeTarget.buyer_code || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium text-[11px]">Line Amount:</span>
                  <span className="font-mono font-semibold text-zinc-800">${Number(assignItemTypeTarget.total_demand || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Dropdown Selection with Details */}
              {(() => {
                const selectedConfig = ITEM_TYPES.find((t) => t.value === selectedItemType) || ITEM_TYPES[0];

                return (
                  <div className="flex flex-col gap-2">
                    <label className="font-semibold text-zinc-800 text-xs flex items-center justify-between">
                      <span>Select Item Classification <span className="text-red-500">*</span></span>
                      <span className="text-[11px] text-zinc-400 font-normal">Categorize item</span>
                    </label>

                    {/* Relative dropdown container */}
                    <div className="relative">
                      {/* Invisible backdrop to close dropdown on outside click */}
                      {isItemTypeDropdownOpen && (
                        <div
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setIsItemTypeDropdownOpen(false)}
                        />
                      )}

                      {/* Dropdown Trigger */}
                      <button
                        type="button"
                        onClick={() => setIsItemTypeDropdownOpen(!isItemTypeDropdownOpen)}
                        className="w-full h-11 px-3 bg-white border border-slate-300 hover:border-slate-400 rounded-lg flex items-center justify-between transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] relative z-20"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-zinc-900 truncate">
                            {selectedConfig.label}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${selectedConfig.badgeClass}`}>
                            {selectedConfig.shortLabel}
                          </span>
                        </div>
                        <ChevronDown
                          size={14}
                          className={cn("text-zinc-500 shrink-0 transition-transform duration-150", isItemTypeDropdownOpen && "rotate-180")}
                        />
                      </button>

                      {/* Dropdown Menu Options with Details */}
                      {isItemTypeDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-lg border border-slate-200 shadow-xl z-30 overflow-hidden divide-y divide-slate-100 max-h-[280px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                          {ITEM_TYPES.map((t) => {
                            const isSelected = selectedItemType === t.value;
                            return (
                              <button
                                type="button"
                                key={t.value}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedItemType(t.value);
                                  setIsItemTypeDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full p-3 transition-colors cursor-pointer flex items-start justify-between gap-3 text-left focus:outline-none",
                                  isSelected ? "bg-blue-50/80 hover:bg-blue-50" : "hover:bg-slate-50"
                                )}
                              >
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className={cn("text-xs font-semibold", isSelected ? "text-[#0B57D0]" : "text-zinc-900")}>
                                      {t.label}
                                    </span>
                                    <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0", t.badgeClass)}>
                                      {t.shortLabel}
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                                    {t.description}
                                  </span>
                                </div>
                                {isSelected && (
                                  <Check size={14} className="text-[#0B57D0] shrink-0 mt-0.5" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Classification Details Box */}
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-zinc-700">Classification Details:</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${selectedConfig.badgeClass}`}>
                          {selectedConfig.shortLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 leading-relaxed">
                        {selectedConfig.description}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Checkbox: Apply to all matching items in this period */}
              {assignItemTypeTarget.product_name && (
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 cursor-pointer text-zinc-700">
                  <input
                    type="checkbox"
                    checked={applyItemTypeToAllMatching}
                    onChange={(e) => setApplyItemTypeToAllMatching(e.target.checked)}
                    className="rounded border-slate-300 text-[#0B57D0] focus:ring-0 mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-800">
                      Apply to all rows matching this item in {formatPeriodLabel(currentPeriod)}
                    </span>
                    <span className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                      Classifies all invoice lines with description "{assignItemTypeTarget.product_name}" as {ITEM_TYPES.find(t => t.value === selectedItemType)?.label}.
                    </span>
                  </div>
                </label>
              )}
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowAssignItemTypeModal(false);
                  setAssignItemTypeTarget(null);
                }}
                className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAssignItemType}
                onClick={handleSaveAssignItemType}
                className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {savingAssignItemType ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save Item Type</span>
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
                {(() => {
                  const bCode = assignChannelTarget.buyer_code || buyersList.find((b) => 
                    (b.buyer_name && assignChannelTarget.buyer_name && b.buyer_name.trim().toLowerCase() === assignChannelTarget.buyer_name.trim().toLowerCase())
                  )?.buyer_code;
                  return (
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 font-medium text-[11px]">Buyer Code / ID:</span>
                      <span className="font-mono text-zinc-700">{bCode || "(Unregistered Buyer)"}</span>
                    </div>
                  );
                })()}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium text-[11px]">Current Channel:</span>
                  <span className={`font-medium ${!assignChannelTarget.channel || assignChannelTarget.channel === "Not Set" ? "text-amber-700 italic" : "text-zinc-700"}`}>
                    {assignChannelTarget.channel || "Not Set"}
                  </span>
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
                  options={[
                    { label: "-- Clear Channel (Not Set) --", value: "Not Set" },
                    ...channelsList.map((ch) => ({
                      label: ch.channel_name,
                      value: ch.channel_name
                    }))
                  ]}
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

      {/* Modal: Assign Product SKU */}
      {showAssignProductModal && assignProductTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Assign Product SKU</h2>
                <p className="text-xs text-zinc-500">Map this invoice item description to a product from the Product List.</p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowAssignProductModal(false);
                  setAssignProductTarget(null);
                }} 
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-3.5 text-xs overflow-y-auto">
              {/* Target Line Item Context Card */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-zinc-500 font-medium text-[11px] shrink-0">Item Description:</span>
                  <span className="font-semibold text-zinc-900 text-right break-words">{assignProductTarget.product_name || assignProductTarget.product_sku || "(No Description)"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium text-[11px]">Current SKU:</span>
                  <span className="font-mono text-zinc-700">{assignProductTarget.product_sku || "(Blank SKU)"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium text-[11px]">Current Brand:</span>
                  <span className="text-zinc-700 font-medium">{assignProductTarget.brand || "(Unassigned)"}</span>
                </div>
              </div>

              {/* Product Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-zinc-700 flex items-center justify-between">
                  <span>Select Product from Product List <span className="text-red-500">*</span></span>
                  <span className="text-[11px] text-zinc-400 font-normal">
                    {unifiedProductList.length} products available
                  </span>
                </label>

                {/* Search input */}
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    placeholder="Search product by SKU, name, or brand..."
                    className="w-full h-8 pl-8 pr-3 border border-slate-300 rounded-lg text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#0B57D0]"
                  />
                  <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-400" />
                </div>

                {/* Products List */}
                <div className="mt-1 border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {unifiedProductList
                    .filter((p) => {
                      if (!productSearchTerm.trim()) return true;
                      const q = productSearchTerm.toLowerCase();
                      return (
                        (p.sku && p.sku.toLowerCase().includes(q)) ||
                        (p.product_name && p.product_name.toLowerCase().includes(q)) ||
                        (p.brand && p.brand.toLowerCase().includes(q))
                      );
                    })
                    .slice(0, 100)
                    .map((p) => {
                      const isSelected = selectedMasterSku === p.sku;
                      const brandLabel = p.brand || "";
                      return (
                        <button
                          key={`${p.is_temp ? 'temp' : 'master'}_${p.id || p.sku}`}
                          type="button"
                          onClick={() => setSelectedMasterSku(p.sku)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-blue-50/80 text-[#0B57D0]"
                              : "hover:bg-slate-50 text-zinc-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span title={p.is_temp ? "Temporary Product" : "Master Product"}>
                              {p.is_temp ? (
                                <CheckCircle2 size={14} className="text-slate-400 shrink-0" />
                              ) : (
                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              )}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-xs text-zinc-900">{p.sku}</span>
                                {brandLabel && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                    {brandLabel}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-zinc-600 truncate mt-0.5">{p.product_name}</span>
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-[#0B57D0] shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Checkbox Option: Apply to all matching rows */}
              {(() => {
                const targetDesc = assignProductTarget.product_name || assignProductTarget.product_sku || "";
                const matchingCount = records.filter(r => 
                  (targetDesc && (r.product_name === targetDesc || r.product_sku === targetDesc)) ||
                  (assignProductTarget.product_sku && r.product_sku === assignProductTarget.product_sku)
                ).length;

                return (
                  <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 cursor-pointer text-zinc-700">
                    <input
                      type="checkbox"
                      checked={applyProductToAllMatchingRows}
                      onChange={(e) => setApplyProductToAllMatchingRows(e.target.checked)}
                      className="rounded border-slate-300 text-[#0B57D0] focus:ring-0 mt-0.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-zinc-800">
                        Also assign to all matching records in {formatPeriodLabel(currentPeriod)} ({matchingCount} record{matchingCount === 1 ? '' : 's'})
                      </span>
                      <span className="text-[11px] text-zinc-500 leading-tight mt-0.5">
                        Applies this product SKU and brand to all line items with description "{targetDesc}".
                      </span>
                    </div>
                  </label>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowAssignProductModal(false);
                  setAssignProductTarget(null);
                }}
                className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAssignProduct || !selectedMasterSku}
                onClick={handleSaveAssignProduct}
                className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {savingAssignProduct ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Assign Product</span>
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
      {/* 4D. MODAL: RESET MONTH SALES WITH TYPED CONFIRMATION       */}
      {/* ========================================================= */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-visible animate-in zoom-in-95 duration-100">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-red-50/50 shrink-0 rounded-t-xl">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle size={16} />
                <h2 className="text-sm font-bold">Reset Month Records</h2>
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
                You are about to reset all Sell-In data for <span className="font-bold text-zinc-900">{formatPeriodLabel(currentPeriod)}</span>.
              </p>

              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 space-y-1">
                <p className="font-bold">⚠️ Warning: Irreversible Action</p>
                <p className="text-[11px] leading-relaxed">
                  All sell-in records and uploaded Tax Invoice / Credit Note PDF documents for <span className="font-semibold">{formatPeriodLabel(currentPeriod)}</span> will be permanently deleted. This will reopen the upload button so you can upload a new master file.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  To confirm, type <span className="font-mono font-bold text-red-600 select-all">reset</span> below:
                </label>
                <input
                  type="text"
                  placeholder="reset"
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
                className="h-8 px-3 rounded-lg border border-slate-200 text-zinc-700 hover:bg-zinc-100 font-medium text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetting || resetConfirmText.trim().toLowerCase() !== "reset"}
                className="h-8 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {resetting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{resetting ? "Resetting..." : "Confirm & Reset Month"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4E. MODAL: MISSING INVOICES IN TRACK ORDER (>3 DAYS)      */}
      {/* ========================================================= */}
      {showMissingInvoicesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-amber-50/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                  <AlertCircle size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900">Track Order Invoice Update Required</h3>
                  <p className="text-[10px] text-zinc-500">Orders older than 3 days missing invoice proof</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem(`dismissed_missing_${currentPeriod}`, "1");
                  setShowMissingInvoicesModal(false);
                }}
                className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 text-xs leading-relaxed">
                <span className="font-bold">Notice:</span> Some orders for this month have been without an invoice attachment in <strong>Track Orders</strong> for more than 3 days. Please update invoice proofs in Track Order to enable accurate live sales tracking.
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8F9FA] text-[11px] font-semibold text-zinc-600 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Order ID</th>
                      <th className="px-3 py-2">Buyer</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {missingInvoicesList
                      .filter((item: any) => !String(item.id || "").startsWith("RET-") && String(item.type || "").toLowerCase() !== "return")
                      .map((item: any, idx: number) => {
                      const ageDays = Math.floor((Date.now() - (item.timestamp || Date.now())) / (1000 * 60 * 60 * 24));
                      const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString('en-GB') : '-';
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-[11px] font-semibold text-zinc-800">{item.id}</td>
                          <td className="px-3 py-2 text-zinc-700 truncate max-w-[150px]">{item.buyer_name || '-'}</td>
                          <td className="px-3 py-2 text-zinc-500">{dateStr}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              {ageDays}d ago
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem(`dismissed_missing_${currentPeriod}`, "1");
                  setShowMissingInvoicesModal(false);
                }}
                className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Modal: Listing Price Discrepancy */}
      {showPriceMismatchModal && priceMismatchTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <AlertTriangle size={14} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-950">List Price Discrepancy</h2>
                  <p className="text-[11px] text-zinc-500">Invoice price differs from registered List Price.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowPriceMismatchModal(false);
                  setPriceMismatchTarget(null);
                }} 
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-3 text-xs">
              {/* Product & Buyer Context */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-zinc-500 font-medium text-[11px] shrink-0">Buyer:</span>
                  <span className="font-semibold text-zinc-900 text-right">{priceMismatchTarget.buyer_name || priceMismatchTarget.buyer_code}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-zinc-500 font-medium text-[11px] shrink-0">Product:</span>
                  <span className="font-medium text-zinc-900 text-right break-words">{priceMismatchTarget.product_name || priceMismatchTarget.product_sku}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium text-[11px]">SKU:</span>
                  <span className="font-mono text-zinc-700">{priceMismatchTarget.product_sku}</span>
                </div>
                {priceMismatchTarget.matched_sheet_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500 font-medium text-[11px]">Listing Sheet:</span>
                    <span className="text-zinc-700 font-medium">{priceMismatchTarget.matched_sheet_name}</span>
                  </div>
                )}
              </div>

              {/* Price Comparison Card */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Invoiced Unit Price */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col items-center text-center">
                  <span className="text-[10.5px] font-medium text-zinc-500 uppercase tracking-wider">Invoice Unit Price</span>
                  <span className="text-lg font-bold text-zinc-900 font-mono mt-1">
                    ${Number(priceMismatchTarget.unit_price || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium mt-0.5">Used in Demand Total</span>
                </div>

                {/* Listing Sheet Contract Price */}
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex flex-col items-center text-center">
                  <span className="text-[10.5px] font-medium text-amber-700 uppercase tracking-wider">Buyer Cost Price (Listing Sheet)</span>
                  <span className="text-lg font-bold text-amber-900 font-mono mt-1">
                    ${Number(priceMismatchTarget.listing_price || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-amber-600 font-medium mt-0.5">
                    Variance: ${(Number(priceMismatchTarget.unit_price || 0) - Number(priceMismatchTarget.listing_price || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px] text-zinc-600 leading-relaxed">
                The actual billed invoice price is kept safe for accounting calculations. If the registered Buyer Cost Price in Market Price is outdated, you can update it directly below.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 rounded-b-xl">
              <button
                type="button"
                onClick={() => {
                  setShowPriceMismatchModal(false);
                  setPriceMismatchTarget(null);
                }}
                className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100 cursor-pointer"
              >
                Keep Invoice Price (Close)
              </button>
              <button
                type="button"
                disabled={savingUpdateListingPrice}
                onClick={handleUpdateListingPrice}
                className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {savingUpdateListingPrice ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Update Listing Buyer Price to ${Number(priceMismatchTarget.unit_price || 0).toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Snapshot Cost Price (This Month Only) */}
      {showCostSnapshotModal && costSnapshotTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <DollarSign size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-950">Cost Price</h2>
                    {batchData?.status === "published" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Published
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">Internal cost price for {currentPeriod}.</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowCostSnapshotModal(false);
                  setCostSnapshotTarget(null);
                }} 
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex flex-col gap-3 text-xs">
              {/* Product & Buyer Context */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-zinc-500 font-medium text-[11px] shrink-0">Buyer:</span>
                  <span className="font-semibold text-zinc-900 text-right">{costSnapshotTarget.buyer_name || costSnapshotTarget.buyer_code}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-zinc-500 font-medium text-[11px] shrink-0">Product:</span>
                  <span className="font-medium text-zinc-900 text-right break-words">{costSnapshotTarget.product_name || costSnapshotTarget.product_sku}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium text-[11px]">SKU:</span>
                  <span className="font-mono text-zinc-700">{costSnapshotTarget.product_sku || "(No SKU)"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium text-[11px]">Period / Month:</span>
                  <span className="font-semibold text-zinc-800">{currentPeriod}</span>
                </div>
              </div>

              {/* Input Form */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center text-center">
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Invoice Unit Price</span>
                  <span className="text-base font-bold text-zinc-900 font-mono mt-1">
                    ${Number(costSnapshotTarget.unit_price || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">Billed Price</span>
                </div>

                {batchData?.status === "published" ? (
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center text-center">
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Cost Price ($)</span>
                    <span className="text-base font-bold text-zinc-900 font-mono mt-1">
                      ${(parseFloat(editingCostPrice) || 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">Land Cost</span>
                  </div>
                ) : !isEditingCostPrice ? (
                  <div
                    onClick={() => setIsEditingCostPrice(true)}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/60 hover:border-slate-300 transition-colors flex flex-col items-center text-center relative cursor-pointer group"
                    title="Click to edit Cost Price"
                  >
                    <div className="w-full flex items-center justify-center relative">
                      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Cost Price ($)</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingCostPrice(true);
                        }}
                        className="absolute right-0 flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-[#0B57D0] hover:bg-blue-100/60 rounded cursor-pointer transition-colors"
                      >
                        <Edit2 size={10} />
                        <span>Edit</span>
                      </button>
                    </div>
                    <span className="text-base font-bold text-zinc-900 font-mono mt-1">
                      ${(parseFloat(editingCostPrice) || 0).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">Land Cost</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-[#0B57D0]/40 bg-white flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Cost Price ($)</label>
                      <button
                        type="button"
                        onClick={() => setIsEditingCostPrice(false)}
                        className="text-[10px] font-semibold text-[#0B57D0] hover:underline cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={editingCostPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "" || /^\d*\.?\d*$/.test(val)) {
                          setEditingCostPrice(val);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      autoFocus
                    />
                    <span className="text-[10px] text-zinc-400 mt-1">Land Cost</span>
                  </div>
                )}
              </div>

              {/* Live Impact Preview */}
              {(() => {
                const cost = parseFloat(editingCostPrice) || 0;
                const dQty = Number(costSnapshotTarget.demand_qty ?? costSnapshotTarget.quantity ?? 0);
                const rQty = Number(costSnapshotTarget.reject_qty ?? costSnapshotTarget.cn_quantity ?? 0);
                const netQty = Math.max(0, dQty - rQty);
                const totalDemand = Number(costSnapshotTarget.total_demand || (dQty * Number(costSnapshotTarget.unit_price || 0)));
                const cnAmount = Number(costSnapshotTarget.cn_amount || 0);
                const nettSales = totalDemand - cnAmount;
                const totalCost = netQty * cost;
                const profit = nettSales - totalCost;
                const margin = nettSales > 0 ? (profit / nettSales) * 100 : 0;

                return (
                  <div className="p-3 bg-slate-50/90 rounded-lg border border-slate-200 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between text-zinc-500 font-sans text-[11px] font-semibold mb-1">
                      <span>Monthly Impact Calculation</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>Net Sold Qty:</span>
                      <span>{netQty.toLocaleString()} pcs</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>Nett Sales:</span>
                      <span>${nettSales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>Total Cost of Goods:</span>
                      <span>${totalCost.toFixed(2)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold">
                      <span className="font-sans">Est. Gross Profit:</span>
                      <span className={profit >= 0 ? "text-emerald-700" : "text-red-600"}>
                        ${profit.toFixed(2)} ({margin.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 rounded-b-xl">
              <button
                type="button"
                disabled={savingCostSnapshot}
                onClick={() => {
                  setShowCostSnapshotModal(false);
                  setCostSnapshotTarget(null);
                }}
                className="h-8 px-4 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100 cursor-pointer"
              >
                {batchData?.status === "published" ? "Close" : "Cancel"}
              </button>
              {batchData?.status !== "published" && (
                <button
                  type="button"
                  disabled={savingCostSnapshot}
                  onClick={handleSaveCostSnapshot}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {savingCostSnapshot ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Save</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Settlement Breakdown Output Items */}
      {showSettlementModal && settlementTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0B57D0] shrink-0">
                  <FileSpreadsheet size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-950">Settlement Breakdown Output</h2>
                    {batchData?.status === "published" ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Published (Read-Only)
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-[#0B57D0] border border-blue-200">
                        {settlementItemsList.length > 0 ? `${settlementItemsList.length} SKUs` : "Upload Required"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {settlementTarget.product_name || "Settlement Line"} • {settlementTarget.buyer_name || "Platform"} ({formatPeriodLabel(currentPeriod)})
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowSettlementModal(false);
                  setSettlementTarget(null);
                }} 
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Hidden File Input & Upload Bar */}
            <input 
              type="file" 
              ref={settlementFileInputRef}
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleParseSettlementExcel(f);
                e.target.value = "";
              }}
              className="hidden" 
            />

            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {batchData?.status !== "published" && (
                  <button
                    type="button"
                    onClick={() => settlementFileInputRef.current?.click()}
                    className="h-8 px-3 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-semibold text-zinc-800 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Upload size={13} className="text-[#0B57D0]" />
                    <span>Upload Excel</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownloadSettlementTemplate}
                  className="h-8 px-2.5 rounded-lg text-xs font-medium text-[#0B57D0] hover:bg-blue-50/80 transition-colors cursor-pointer flex items-center gap-1"
                  title="Download Excel format template with columns: SKU, Description, Qty"
                >
                  <Download size={13} />
                  <span>Download Sample Template</span>
                </button>
              </div>

              {settlementFileName && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  <span className="font-mono font-medium max-w-[200px] truncate" title={settlementFileName}>
                    {settlementFileName}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Body / Table Preview */}
            <div className="flex-1 min-h-[220px] max-h-[380px] overflow-y-auto">
              {settlementItemsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-zinc-400 mb-3">
                    <FileSpreadsheet size={24} />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-800">No settlement summary uploaded</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                    Upload an Excel file with format <span className="font-mono font-bold text-zinc-700">SKU, Description, Qty</span> to track physical restock units and landed costs.
                  </p>
                  {batchData?.status !== "published" && (
                    <button
                      type="button"
                      onClick={() => settlementFileInputRef.current?.click()}
                      className="mt-4 h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Upload size={13} />
                      <span>Upload Excel File</span>
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-zinc-600 font-semibold z-10">
                    <tr>
                      <th className="py-2 px-3 text-center w-10">#</th>
                      <th className="py-2 px-3 min-w-[120px]">SKU</th>
                      <th className="py-2 px-3 min-w-[180px]">Description</th>
                      <th className="py-2 px-3 text-right min-w-[80px]">Qty Out</th>
                      <th className="py-2 px-3 text-right min-w-[100px]" title="Cost price based on Master Products catalog">Master Unit Cost</th>
                      <th className="py-2 px-3 text-right min-w-[100px]">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {settlementItemsList.map((it, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3 text-center text-zinc-400 font-mono text-[11px]">{i + 1}</td>
                        <td className="py-2 px-3 font-mono font-semibold text-zinc-900">{it.sku || "—"}</td>
                        <td className="py-2 px-3 text-zinc-700 max-w-[220px] truncate" title={it.description}>
                          {it.description || "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-zinc-900">
                          {Number(it.qty || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-zinc-600">
                          ${Number(it.unit_cost || 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-zinc-900">
                          ${Number(it.total_cost || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Calculations Summary Card */}
            {settlementItemsList.length > 0 && (() => {
              const totalQty = settlementItemsList.reduce((acc, it) => acc + Number(it.qty || 0), 0);
              const totalCost = settlementItemsList.reduce((acc, it) => acc + Number(it.total_cost || 0), 0);
              return (
                <div className="px-4 py-2.5 bg-slate-50/90 border-t border-slate-200 grid grid-cols-3 gap-2 shrink-0 font-mono text-xs">
                  <div className="p-2 rounded-lg bg-white border border-slate-200 flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-sans font-semibold uppercase">Total SKUs</span>
                    <span className="text-sm font-bold text-zinc-900 mt-0.5">{settlementItemsList.length} items</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200 flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-sans font-semibold uppercase">Physical Qty Out</span>
                    <span className="text-sm font-bold text-zinc-900 mt-0.5">{totalQty.toLocaleString()} pcs</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200 flex flex-col">
                    <span className="text-[10px] text-zinc-500 font-sans font-semibold uppercase">Total Landed Cost</span>
                    <span className="text-sm font-bold text-zinc-900 mt-0.5">${totalCost.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0 rounded-b-xl">
              <div>
                {settlementItemsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleDownloadSettlementExcel(settlementTarget)}
                    className="h-8 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-medium text-zinc-700 flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  >
                    <Download size={13} className="text-zinc-500" />
                    <span>Download Excel</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingSettlementItems}
                  onClick={() => {
                    setShowSettlementModal(false);
                    setSettlementTarget(null);
                  }}
                  className="h-8 px-4 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100 cursor-pointer"
                >
                  {batchData?.status === "published" ? "Close" : "Cancel"}
                </button>
                {batchData?.status !== "published" && (
                  <button
                    type="button"
                    disabled={savingSettlementItems || settlementItemsList.length === 0}
                    onClick={handleSaveSettlementItems}
                    className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {savingSettlementItems ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>Save Settlement Items</span>
                  </button>
                )}
              </div>
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
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
