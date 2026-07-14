"use client";

import * as React from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Plus, 
  Trash2, 
  Users, 
  Check, 
  X, 
  MapPin, 
  Clock,
  Calendar as CalendarIcon,
  Megaphone,
  Printer,
  Pencil,
  FileText,
  Undo,
  Redo,
  Archive,
  GripVertical,
  Copy,
  Files,
  ClipboardPaste,
  RefreshCw,
  AlertTriangle,
  Upload,
  CreditCard
} from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";
import { DataTable } from "../data-table";
import { ConfirmDialog } from "../confirm-dialog";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";

interface UserProfile {
  role: string;
  modules_access: string[];
  name?: string;
  email?: string;
}

interface PromoterModuleProps {
  profile?: UserProfile | null;
}

export function PromoterModule({ profile }: PromoterModuleProps) {
  const [activeTab, setActiveTab] = React.useState<string>("calendar");
  const [calendarMode, setCalendarMode] = React.useState<"monthly" | "campaign">("monthly");
  
  const [promoters, setPromoters] = React.useState<any[]>([]);
  const [loadingPromoters, setLoadingPromoters] = React.useState<boolean>(false);

  // Database dependencies
  const [brands, setBrands] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [stores, setStores] = React.useState<any[]>([]);
  const [retailers, setRetailers] = React.useState<any[]>([]);
  const [productLogs, setProductLogs] = React.useState<any[]>([]);

  // Campaigns state
  const [campaigns, setCampaigns] = React.useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = React.useState<boolean>(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = React.useState<boolean>(false);
  const [editingCampaignId, setEditingCampaignId] = React.useState<string | null>(null);

  // Campaign Form fields
  const [campTitle, setCampTitle] = React.useState<string>("");
  const [campDesc, setCampDesc] = React.useState<string>("");
  const [campInstr, setCampInstr] = React.useState<string>("");
  const [campBrand, setCampBrand] = React.useState<string>("");
  const [campProducts, setCampProducts] = React.useState<string[]>([]);

  // Schedules state
  const [schedules, setSchedules] = React.useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = React.useState<boolean>(false);

  // Payout states
  const [payouts, setPayouts] = React.useState<any[]>([]);
  const [loadingPayouts, setLoadingPayouts] = React.useState<boolean>(false);

  // Admin Shift Tasks states (Monthly Calendar view)
  const [selectedShiftId, setSelectedShiftId] = React.useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = React.useState<string | null>(null);
  const [expandedScheduleId, setExpandedScheduleId] = React.useState<string | null>(null);
  const [customTaskTexts, setCustomTaskTexts] = React.useState<Record<string, string>>({});
  const [newCustomTaskText, setNewCustomTaskText] = React.useState<string>("");

  // Monthly Calendar states
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = React.useState<number>(new Date().getDate());
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string>("all");
  const [campaignSubTab, setCampaignSubTab] = React.useState<"active" | "archive">("active");

  // Campaign Mode view states
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };
  const [selectedWeekStart, setSelectedWeekStart] = React.useState<Date>(getMonday(new Date()));
  const [manuallyAddedPromoterIds, setManuallyAddedPromoterIds] = React.useState<string[]>([]);
  const [hiddenPromoterIds, setHiddenPromoterIds] = React.useState<string[]>([]);
  const [showAddColDropdown, setShowAddColDropdown] = React.useState<boolean>(false);
  const [storeSearch, setStoreSearch] = React.useState<string>("");
  const [selectedRetailerFilter, setSelectedRetailerFilter] = React.useState<string>("all");
  const [isStoreLibraryCollapsed, setIsStoreLibraryCollapsed] = React.useState<boolean>(true);

  // Draft / Edit Mode states
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);
  const [schedulesBackup, setSchedulesBackup] = React.useState<any[]>([]);
  const [history, setHistory] = React.useState<any[][]>([]);
  const [historyIndex, setHistoryIndex] = React.useState<number>(-1);

  // Collapse open task cards when exiting edit mode
  React.useEffect(() => {
    if (!isEditMode) {
      setExpandedCardId(null);
    }
  }, [isEditMode]);

  // Promoters sub-tab and form states
  const [promoterSubTab, setPromoterSubTab] = React.useState<"active" | "archive">("active");
  const [isCreatingPromoter, setIsCreatingPromoter] = React.useState<boolean>(false);
  const [editingPromoterId, setEditingPromoterId] = React.useState<string | null>(null);
  const [promoterId, setPromoterId] = React.useState<string>("");
  const [promoterName, setPromoterName] = React.useState<string>("");
  const [promoterFullName, setPromoterFullName] = React.useState<string>("");
  const [promoterPhone, setPromoterPhone] = React.useState<string>("");
  const [promoterEmail, setPromoterEmail] = React.useState<string>("");
  const [promoterPaynow, setPromoterPaynow] = React.useState<string>("");
  const [promoterPin, setPromoterPin] = React.useState<string>("");
  const [copiedSchedule, setCopiedSchedule] = React.useState<any | null>(null);

  // Confirm dialog configurations
  const [confirmOpen, setConfirmOpen] = React.useState<boolean>(false);
  const [confirmConfig, setConfirmConfig] = React.useState<{
    title: string;
    description: string;
    variant?: "danger" | "default" | "dark";
    onConfirm: () => void;
  } | null>(null);

  const [selectedPrintLayout, setSelectedPrintLayout] = React.useState<"master-calendar" | "campaign-schedule" | "promoter-schedule" | null>(null);
  const [printMonth, setPrintMonth] = React.useState<number>(new Date().getMonth());
  const [printYear, setPrintYear] = React.useState<number>(new Date().getFullYear());
  const [printCampaignId, setPrintCampaignId] = React.useState<string>("");
  const [printPromoterId, setPrintPromoterId] = React.useState<string>("");
  const [printStartDate, setPrintStartDate] = React.useState<string>(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const yyyy = start.getFullYear();
    const mm = String(start.getMonth() + 1).padStart(2, "0");
    const dd = String(start.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [printEndDate, setPrintEndDate] = React.useState<string>(() => {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const yyyy = end.getFullYear();
    const mm = String(end.getMonth() + 1).padStart(2, "0");
    const dd = String(end.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const printContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!selectedPrintLayout) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (printContainerRef.current && !printContainerRef.current.contains(e.target as Node)) {
        setSelectedPrintLayout(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [selectedPrintLayout]);

  const showConfirm = (config: {
    title: string;
    description: string;
    variant?: "danger" | "default" | "dark";
    onConfirm: () => void;
  }) => {
    setConfirmConfig(config);
    setConfirmOpen(true);
  };

  const isAuthorized = profile?.role === "Administrator" || profile?.role === "Manager";

  const tabs = React.useMemo(() => {
    const list = [
      { id: "calendar", label: "Schedule" },
      { id: "print", label: "Print" }
    ];
    if (isAuthorized) {
      list.push({ id: "payout", label: "Payout" });
    }
    list.push(
      { id: "campaign", label: "Campaign" },
      { id: "promoters", label: "Promoters" }
    );
    return list;
  }, [isAuthorized]);

  // Fetch Database dependencies
  const loadDatabaseData = React.useCallback(async () => {
    try {
      const [resBrands, resProducts, resStores, resLogs, resRetailers] = await Promise.all([
        fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=brands_DB"),
        fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=products_DB"),
        fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Store_Retailer_DB"),
        fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Merch_Visit_Product_Audit_Logs"),
        fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=retailers_DB")
      ]);

      if (resBrands.ok) {
        const json = await resBrands.json();
        setBrands(Array.isArray(json) ? json : (json.value || []));
      }
      if (resProducts.ok) {
        const json = await resProducts.json();
        setProducts(Array.isArray(json) ? json : (json.value || []));
      }
      if (resStores.ok) {
        const json = await resStores.json();
        setStores(Array.isArray(json) ? json : (json.value || []));
      }
      if (resLogs.ok) {
        const json = await resLogs.json();
        setProductLogs(Array.isArray(json) ? json : (json.value || []));
      }
      if (resRetailers.ok) {
        const json = await resRetailers.json();
        setRetailers(Array.isArray(json) ? json : (json.value || []));
      }
    } catch (e) {
      console.error("Failed to load database dependencies", e);
    }
  }, []);

  // Fetch Promoters from sheets
  const loadPromoters = React.useCallback(async (forceSync = false) => {
    setLoadingPromoters(true);
    try {
      const sheetName = "Promoter_Users";
      if (forceSync) {
        await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`, { method: "POST" });
      }
      const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`);
      if (!res.ok) throw new Error(`Server status ${res.status}`);
      const json = await res.json();
      setPromoters(Array.isArray(json) ? json : (json.value || []));
    } catch (err: any) {
      showToast("Failed to load promoters: " + err.message, "error");
    } finally {
      setLoadingPromoters(false);
    }
  }, []);

  // Fetch Campaigns from sheets
  const loadCampaigns = React.useCallback(async (forceSync = false) => {
    setLoadingCampaigns(true);
    try {
      const sheetName = "Promoter_Campaign";
      if (forceSync) {
        await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`, { method: "POST" });
      }
      const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`);
      if (!res.ok) throw new Error(`Server status ${res.status}`);
      const json = await res.json();
      setCampaigns(Array.isArray(json) ? json : (json.value || []));
    } catch (err: any) {
      showToast("Failed to load campaigns: " + err.message, "error");
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  // Fetch Schedules from sheets
  const loadSchedules = React.useCallback(async (forceSync = false) => {
    setLoadingSchedules(true);
    try {
      const sheetName = "Promoter_Schedule";
      if (forceSync) {
        await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`, { method: "POST" });
      }
      const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`);
      if (!res.ok) throw new Error(`Server status ${res.status}`);
      const json = await res.json();
      setSchedules(Array.isArray(json) ? json : (json.value || []));
    } catch (err: any) {
      showToast("Failed to load schedules: " + err.message, "error");
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  // Fetch Payouts from sheets
  const loadPayouts = React.useCallback(async (forceSync = false) => {
    // Load from localStorage cache first
    const cached = localStorage.getItem("ib_promoter_payouts_cache");
    if (cached) {
      try {
        setPayouts(JSON.parse(cached));
      } catch (e) {}
    }
    setLoadingPayouts(true);
    try {
      const sheetName = "Promoter_Payout";
      if (forceSync) {
        await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`, { method: "POST" });
      }
      const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`);
      if (res.status === 404) {
        setPayouts([]);
        localStorage.removeItem("ib_promoter_payouts_cache");
        return;
      }
      const json = await res.json();
      if (json && json.error === "Database missing") {
        setPayouts([]);
        localStorage.removeItem("ib_promoter_payouts_cache");
        return;
      }
      if (!res.ok) throw new Error(`Server status ${res.status}`);
      const list = Array.isArray(json) ? json : (json.value || []);
      setPayouts(list);
      localStorage.setItem("ib_promoter_payouts_cache", JSON.stringify(list));
    } catch (err: any) {
      console.error("Failed to load payouts: " + err.message);
    } finally {
      setLoadingPayouts(false);
    }
  }, []);

  // Helper to format Store Name with 5-char Uppercase Retailer prefix
  const getFormattedStoreName = React.useCallback((storeId: any, baseStoreName: string) => {
    if (!storeId || !baseStoreName) return baseStoreName || "";
    const storeObj = stores.find(st => String(st.ID) === String(storeId));
    const retId = storeObj ? (storeObj["Retailers ID"] || storeObj["Retailer ID"]) : null;
    const retailerObj = retId ? retailers.find(r => String(r.ID) === String(retId)) : null;
    const retailerName = retailerObj ? (retailerObj["Display Name"] || retailerObj.Name || "") : "";
    const retailerPrefix = retailerName ? retailerName.substring(0, 5).toUpperCase() : "";
    return retailerPrefix ? `${retailerPrefix} - ${baseStoreName}` : baseStoreName;
  }, [stores, retailers]);

  const formatTimeDisplay = (timeVal: any) => {
    if (!timeVal) return "";
    const str = String(timeVal).trim();
    
    if (str.includes("T")) {
      try {
        const date = new Date(str);
        if (!isNaN(date.getTime())) {
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          return `${hours}:${minutes}`;
        }
      } catch (e) {}
    }
    
    if (str.includes("1899") || str.includes("1900")) {
      const match = str.match(/(\d{2}):(\d{2}):\d{2}/);
      if (match) {
        return `${match[1]}:${match[2]}`;
      }
    }

    const num = Number(str);
    if (!isNaN(num) && num > 0 && num < 1) {
      const totalMinutes = Math.round(num * 24 * 60);
      const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
      const minutes = String(totalMinutes % 60).padStart(2, "0");
      return `${hours}:${minutes}`;
    }

    const timeMatch = str.match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, "0");
      const minutes = timeMatch[2];
      return `${hours}:${minutes}`;
    }

    return str;
  };

  // Check if a shift date and promoter is locked under completed payouts
  const isShiftLocked = React.useCallback((dateVal: any, promoterId: any): boolean => {
    if (!dateVal || !promoterId) return false;
    const dateNum = new Date(dateVal).getTime();
    return payouts.some(p => {
      if (String(p["Promoter ID"]) !== String(promoterId)) return false;
      if (p.Status !== "Paid") return false;
      const start = Number(p["Start Date"]);
      const end = Number(p["End Date"]);
      return dateNum >= start && dateNum <= end;
    });
  }, [payouts]);

  // Pay Out UI States
  const [isCreatePayoutOpen, setIsCreatePayoutOpen] = React.useState<boolean>(false);
  const [editingPayoutId, setEditingPayoutId] = React.useState<string | null>(null);
  const [selectedPayoutPromoterId, setSelectedPayoutPromoterId] = React.useState<string>("");
  const [payoutStartDate, setPayoutStartDate] = React.useState<string>("");
  const [payoutEndDate, setPayoutEndDate] = React.useState<string>("");
  const [payoutHourlyRate, setPayoutHourlyRate] = React.useState<string>("");
  const [editedPayoutRows, setEditedPayoutRows] = React.useState<any[]>([]);
  const [payoutFetchError, setPayoutFetchError] = React.useState<string | null>(null);
  const [isPayoutFetching, setIsPayoutFetching] = React.useState<boolean>(false);
  const [isPayoutSaving, setIsPayoutSaving] = React.useState<boolean>(false);

  // Paid modal states
  const [paymentModalPayout, setPaymentModalPayout] = React.useState<any | null>(null);
  const [paymentRef, setPaymentRef] = React.useState<string>("");
  const [paymentDate, setPaymentDate] = React.useState<string>("");
  const [paymentReceiptFile, setPaymentReceiptFile] = React.useState<File | null>(null);
  const [isPaymentSaving, setIsPaymentSaving] = React.useState<boolean>(false);

  // Helper: Format date or timestamp to YYYY-MM-DD
  const formatDateToYYYYMMDD = React.useCallback((ts: any): string => {
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Helper: Convert time string "HH:MM" to minutes for calculation
  const calculateHours = React.useCallback((start: string, end: string): number => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const diffMins = endMins - startMins;
    if (diffMins <= 0) return 0;
    return Number((diffMins / 60).toFixed(2));
  }, []);

  // Fetch Schedules for Payout creation
  const fetchPayoutSchedules = React.useCallback(() => {
    if (!selectedPayoutPromoterId || !payoutStartDate || !payoutEndDate || !payoutHourlyRate) {
      showToast("Please fill all configuration fields.", "warning");
      return;
    }

    setIsPayoutFetching(true);
    setPayoutFetchError(null);
    setEditedPayoutRows([]);

    // Normalize date ranges to absolute millisecond timestamps
    const startRange = new Date(payoutStartDate + "T00:00:00").getTime();
    const endRange = new Date(payoutEndDate + "T23:59:59").getTime();

    // Check if promoter already has a payout that overlaps this date range
    const hasOverlap = payouts.some(p => {
      if (editingPayoutId && p.ID === editingPayoutId) return false;
      if (String(p["Promoter ID"]) !== String(selectedPayoutPromoterId)) return false;
      const pStart = Number(p["Start Date"]);
      const pEnd = Number(p["End Date"]);
      return startRange <= pEnd && endRange >= pStart;
    });

    if (hasOverlap) {
      setPayoutFetchError("Error: This promoter already has a payout recorded that overlaps with the selected date range. Please select another date range.");
      setIsPayoutFetching(false);
      return;
    }

    // Filter schedules
    const filtered = schedules.filter(s => {
      if (String(s["Promoter ID"]) !== String(selectedPayoutPromoterId)) return false;
      const sTime = new Date(s.Date).getTime();
      return sTime >= startRange && sTime <= endRange;
    });

    if (filtered.length === 0) {
      showToast("No schedules found for this promoter in the selected date range.", "warning");
      setIsPayoutFetching(false);
      return;
    }

    // Check for unkeyed actual times
    const unkeyed = filtered.filter(s => {
      const actualStart = s["Actual Start"];
      if (actualStart === "Absent") return false; // absent is valid
      if (!actualStart || String(actualStart).trim() === "") return true;
      const actualEnd = s["Actual End"];
      if (!actualEnd || String(actualEnd).trim() === "") return true;
      return false;
    });

    if (unkeyed.length > 0) {
      setPayoutFetchError("Error: Actual start/end times are missing for some scheduled shifts in this range. Please settle this in the Schedule tab before creating a payout.");
      setIsPayoutFetching(false);
      return;
    }

    // Build payout rows
    const rows = filtered.map(s => {
      const isAbsent = s["Actual Start"] === "Absent";
      const displayStart = isAbsent ? "" : formatTimeDisplay(s["Actual Start"]);
      const displayEnd = isAbsent ? "" : formatTimeDisplay(s["Actual End"]);
      const totalTime = isAbsent ? 0 : calculateHours(displayStart, displayEnd);
      const rate = Number(payoutHourlyRate);
      const totalPayout = isAbsent ? 0 : Number((totalTime * rate).toFixed(2));

      // Resolve store name
      const storeObj = stores.find(st => String(st.ID) === String(s["Store ID"]));
      const storeName = s["Store Name"] || (storeObj ? storeObj["Display Name"] : "");
      const formattedStore = getFormattedStoreName(s["Store ID"], storeName);

      // Resolve campaign name
      const campaign = campaigns.find(c => String(c.ID) === String(s["Campaign ID"]));
      const campaignTitle = campaign ? campaign["Campaign Title"] : (s["Campaign Title"] || "");

      return {
        scheduleId: s.ID,
        date: s.Date,
        startTime: displayStart,
        endTime: displayEnd,
        totalTime,
        hourlyRate: rate,
        totalPayout,
        taskDetails: `${campaignTitle} @ ${formattedStore}`,
        absent: isAbsent,
        absentReason: isAbsent ? (s["Actual End"] || "Not specified") : ""
      };
    });

    // Sort rows by date asc
    rows.sort((a, b) => Number(a.date) - Number(b.date));

    setEditedPayoutRows(rows);
    setIsPayoutFetching(false);
  }, [selectedPayoutPromoterId, payoutStartDate, payoutEndDate, payoutHourlyRate, schedules, stores, campaigns, getFormattedStoreName, calculateHours, payouts, editingPayoutId]);

  // Save Payout to database
  const handleSavePayout = async () => {
    if (editedPayoutRows.length === 0) {
      showToast("Please fetch schedules first.", "warning");
      return;
    }

    // Double check overlap on save
    const startRange = new Date(payoutStartDate + "T00:00:00").getTime();
    const endRange = new Date(payoutEndDate + "T23:59:59").getTime();

    const hasOverlap = payouts.some(p => {
      if (editingPayoutId && p.ID === editingPayoutId) return false;
      if (String(p["Promoter ID"]) !== String(selectedPayoutPromoterId)) return false;
      const pStart = Number(p["Start Date"]);
      const pEnd = Number(p["End Date"]);
      return startRange <= pEnd && endRange >= pStart;
    });

    if (hasOverlap) {
      showToast("Cannot save payout: date range overlaps with an existing payout for this promoter.", "error");
      return;
    }

    const promoterName = promoters.find(p => String(p.ID) === String(selectedPayoutPromoterId))?.Name || "";
    const totalSum = Number(editedPayoutRows.reduce((acc, curr) => acc + curr.totalPayout, 0).toFixed(2));
    
    const payload = {
      ID: editingPayoutId || `payout_${Date.now()}`,
      "Promoter ID": selectedPayoutPromoterId,
      "Promoter Name": promoterName,
      "Start Date": new Date(payoutStartDate + "T00:00:00").getTime(),
      "End Date": new Date(payoutEndDate + "T23:59:59").getTime(),
      "Hourly Rate": Number(payoutHourlyRate),
      "Total Payout": totalSum,
      "Payout Details": JSON.stringify(editedPayoutRows),
      Status: editingPayoutId ? (payouts.find(p => p.ID === editingPayoutId)?.Status || "Draft") : "Draft",
      "Receipt Photo URL": editingPayoutId ? (payouts.find(p => p.ID === editingPayoutId)?.["Receipt Photo URL"] || "") : "",
      "Payment Reference": editingPayoutId ? (payouts.find(p => p.ID === editingPayoutId)?.["Payment Reference"] || "") : "",
      "Payment Date": editingPayoutId ? (payouts.find(p => p.ID === editingPayoutId)?.["Payment Date"] || "") : "",
      "Created At": Date.now()
    };

    // Capture snapshot for rollback
    const payoutsBeforeSave = [...payouts];

    // Optimistically update local state and cache
    let nextPayouts = [...payouts];
    const idx = nextPayouts.findIndex(p => p.ID === payload.ID);
    if (idx > -1) {
      nextPayouts[idx] = payload;
    } else {
      nextPayouts = [payload, ...nextPayouts];
    }
    setPayouts(nextPayouts);
    localStorage.setItem("ib_promoter_payouts_cache", JSON.stringify(nextPayouts));

    // Close form instantly
    setIsCreatePayoutOpen(false);
    setEditingPayoutId(null);

    // Silent background sync
    (async () => {
      try {
        const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheet: "Promoter_Payout",
            action: editingPayoutId ? "update" : "insert",
            data: payload
          })
        });

        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json() as any;
        if (!data.success) throw new Error(data.error || "Save failed");

        // Silent cache bust write
        await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Promoter_Payout`, { method: "POST" });
      } catch (err: any) {
        showToast("Background sync failed. Rolling back payout.", "error");
        setPayouts(payoutsBeforeSave);
        localStorage.setItem("ib_promoter_payouts_cache", JSON.stringify(payoutsBeforeSave));
      }
    })();
  };

  // Delete Payout record
  const handleDeletePayout = (payoutId: string) => {
    showConfirm({
      title: "Delete Payout",
      description: "Are you sure you want to delete this payout draft? This action cannot be undone.",
      variant: "danger",
      onConfirm: async () => {
        // Capture snapshot for rollback
        const payoutsBeforeDelete = [...payouts];

        // Optimistically update local state and cache
        const nextPayouts = payouts.filter(p => p.ID !== payoutId);
        setPayouts(nextPayouts);
        localStorage.setItem("ib_promoter_payouts_cache", JSON.stringify(nextPayouts));

        // Silent background delete
        (async () => {
          try {
            const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sheet: "Promoter_Payout",
                action: "delete",
                data: { ID: payoutId }
              })
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);

            // Silent cache bust write
            await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Promoter_Payout`, { method: "POST" });
          } catch (err: any) {
            showToast("Background delete failed. Rolling back deletion.", "error");
            setPayouts(payoutsBeforeDelete);
            localStorage.setItem("ib_promoter_payouts_cache", JSON.stringify(payoutsBeforeDelete));
          }
        })();
      }
    });
  };

  // Mark payout as Paid and upload receipt image
  const handleSavePayment = async () => {
    if (!paymentRef.trim()) {
      showToast("Please enter a payment reference number.", "warning");
      return;
    }
    if (!paymentDate) {
      showToast("Please select the payment date.", "warning");
      return;
    }
    if (!paymentReceiptFile) {
      showToast("Please upload the receipt photo.", "warning");
      return;
    }

    setIsPaymentSaving(true);
    try {
      // 1. Upload receipt to R2
      const extension = paymentReceiptFile.name.split(".").pop() || "jpg";
      const filename = `Promoters/Payout_Receipts/${paymentModalPayout.ID}_${Date.now()}.${extension}`;
      
      const uploadRes = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        headers: { "Content-Type": paymentReceiptFile.type || "image/jpeg" },
        body: paymentReceiptFile
      });

      if (!uploadRes.ok) throw new Error("Receipt upload failed");
      const uploadData = await uploadRes.json() as any;
      if (!uploadData.success) throw new Error(uploadData.error || "Upload failed");
      
      const receiptUrl = uploadData.url;

      // 2. Update payout record
      const updatedPayout = {
        ...paymentModalPayout,
        Status: "Paid",
        "Receipt Photo URL": receiptUrl,
        "Payment Reference": paymentRef,
        "Payment Date": new Date(paymentDate + "T12:00:00").getTime()
      };

      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Promoter_Payout",
          action: "update",
          data: updatedPayout
        })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json() as any;
      if (!data.success) throw new Error(data.error || "Payment save failed");

      showToast("Payment recorded and payout locked.", "success");
      setPaymentModalPayout(null);
      setPaymentRef("");
      setPaymentDate("");
      setPaymentReceiptFile(null);
      loadPayouts(true);
    } catch (err: any) {
      showToast("Failed to record payment: " + err.message, "error");
    } finally {
      setIsPaymentSaving(false);
    }
  };

  // Generate and print invoice PDF
  const handlePrintPayoutPDF = (payout: any) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const formatTimestamp = (ts: any): string => {
      if (!ts) return "-";
      const d = new Date(Number(ts));
      if (isNaN(d.getTime())) return "-";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const getDayName = (ts: any): string => {
      const d = new Date(Number(ts));
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return isNaN(d.getTime()) ? "" : days[d.getDay()];
    };

    // Lookup Promoter details
    const promoterId = payout["Promoter ID"];
    const promoterObj = promoters.find(p => String(p.ID) === String(promoterId));
    const nickname = payout["Promoter Name"] || (promoterObj ? promoterObj.Name : "-");
    const fullname = promoterObj ? (promoterObj["Full Name"] || promoterObj.FullName || "~") : "~";
    const paynowAccount = promoterObj ? (promoterObj["Paynow Account"] || promoterObj.Paynow || "~") : "~";
    const phone = promoterObj ? (promoterObj.Phone || "~") : "~";
    const email = promoterObj ? (promoterObj.Email || "~") : "~";

    // Calculate total hours
    let totalHours = 0;
    let detailRows: any[] = [];
    try {
      detailRows = JSON.parse(payout["Payout Details"]);
      totalHours = detailRows.reduce((acc, curr) => acc + Number(curr.totalTime || 0), 0);
    } catch (e) {
      console.error(e);
    }

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(24, 24, 27);
    doc.text("iB - Promoter Payout Supporting Document", 15, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(113, 113, 122);
    const todayStr = new Date().toLocaleDateString("en-GB");
    doc.text(`Generated: ${todayStr}`, 195, 20, { align: "right" });
    doc.text(`Document ID: ${payout.ID}`, 15, 25);

    doc.setDrawColor(228, 228, 231);
    doc.line(15, 28, 195, 28);

    // Summary Info Block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(39, 39, 42);
    doc.text("Payout Details", 15, 36);

    // Left Column Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(113, 113, 122);
    doc.text("Nickname:", 15, 43);
    doc.text("Full Name:", 15, 49);
    doc.text("PayNow Account:", 15, 55);
    doc.text("Phone Number:", 15, 61);
    doc.text("Email Address:", 15, 67);

    doc.setFont("helvetica", "semibold");
    doc.setTextColor(24, 24, 27);
    doc.text(String(nickname), 45, 43);
    doc.text(String(fullname), 45, 49);
    doc.text(String(paynowAccount), 45, 55);
    doc.text(String(phone), 45, 61);
    doc.text(String(email), 45, 67);

    // Right Column Info
    doc.setFont("helvetica", "bold");
    doc.setTextColor(113, 113, 122);
    doc.text("Date Range:", 110, 43);
    doc.text("Total Hours:", 110, 49);
    doc.text("Hourly Rate:", 110, 55);
    doc.text("Total Payout:", 110, 61);

    doc.setFont("helvetica", "semibold");
    doc.setTextColor(24, 24, 27);
    doc.text(String(`${formatTimestamp(payout["Start Date"])} - ${formatTimestamp(payout["End Date"])}`), 135, 43);
    doc.text(String(`${totalHours.toFixed(2)} hrs`), 135, 49);
    doc.text(String(`$${Number(payout["Hourly Rate"])?.toFixed(2)}/hr`), 135, 55);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 87, 208); // blue
    doc.text(String(`$${Number(payout["Total Payout"])?.toFixed(2)}`), 135, 61);

    // PAID Rubber Stamp (red color, angled by -15 degrees)
    if (payout.Status === "Paid") {
      doc.saveGraphicsState();
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(197, 27, 27);
      doc.text("PAID", 155, 50, { angle: -15 });
      
      doc.setFontSize(6.5);
      const paidDateStr = formatTimestamp(payout["Payment Date"]);
      const paidRefStr = payout["Payment Reference"] || "";
      doc.text(`DATE: ${paidDateStr}`, 153, 54, { angle: -15 });
      doc.text(`REF: ${paidRefStr}`, 152, 57, { angle: -15 });
      
      // Draw rotated stamp border box centered at (170, 51)
      const cx = 170, cy = 51;
      const w = 19, h = 8;
      const rad = -15 * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      
      const x1 = cx - w * cos + h * sin, y1 = cy - w * sin - h * cos;
      const x2 = cx + w * cos + h * sin, y2 = cy + w * sin - h * cos;
      const x3 = cx + w * cos - h * sin, y3 = cy + w * sin + h * cos;
      const x4 = cx - w * cos - h * sin, y4 = cy - w * sin + h * cos;
      
      doc.setDrawColor(197, 27, 27);
      doc.setLineWidth(0.6);
      doc.line(x1, y1, x2, y2);
      doc.line(x2, y2, x3, y3);
      doc.line(x3, y3, x4, y4);
      doc.line(x4, y4, x1, y1);
      
      doc.restoreGraphicsState();
    }

    doc.setDrawColor(228, 228, 231);
    doc.line(15, 74, 195, 74);

    // Table Headers
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(39, 39, 42);

    doc.setFillColor(244, 244, 245);
    doc.rect(15, 78, 180, 7, "F");
    doc.rect(15, 78, 180, 7, "S");

    doc.text("Date", 17, 82.5);
    doc.text("Hours / Remarks", 48, 82.5);
    doc.text("Total Time", 98, 82.5, { align: "right" });
    doc.text("Rate", 118, 82.5, { align: "right" });
    doc.text("Amount", 143, 82.5, { align: "right" });
    doc.text("Task Details", 148, 82.5);

    let yPos = 85;

    doc.setFont("helvetica", "normal");
    detailRows.forEach((r, idx) => {
      // Check page overflow (cap at 240 to reserve space for bottom signatures)
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
        // Redraw Headers
        doc.setFillColor(244, 244, 245);
        doc.rect(15, yPos, 180, 7, "F");
        doc.rect(15, yPos, 180, 7, "S");
        doc.setFont("helvetica", "bold");
        doc.text("Date", 17, yPos + 4.5);
        doc.text("Hours / Remarks", 48, yPos + 4.5);
        doc.text("Total Time", 98, yPos + 4.5, { align: "right" });
        doc.text("Rate", 118, yPos + 4.5, { align: "right" });
        doc.text("Amount", 143, yPos + 4.5, { align: "right" });
        doc.text("Task Details", 148, yPos + 4.5);
        yPos += 7;
        doc.setFont("helvetica", "normal");
      }

      // Draw Row Box
      doc.rect(15, yPos, 180, 8, "S");

      // Date & Day
      const dateText = `${formatTimestamp(r.date)} (${getDayName(r.date)})`;
      doc.text(dateText, 17, yPos + 5);

      if (r.absent) {
        // Combined absent details
        doc.setFont("helvetica", "bold");
        doc.setTextColor(153, 27, 27); // red
        doc.text(`Absent: ${r.absentReason || "Reason not specified"}`, 48, yPos + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(24, 24, 27);
        doc.text("-", 98, yPos + 5, { align: "right" });
        doc.text("-", 118, yPos + 5, { align: "right" });
      } else {
        // Work shift details
        doc.text(`${r.startTime} - ${r.endTime}`, 48, yPos + 5);
        doc.text(`${Number(r.totalTime)?.toFixed(2)} hrs`, 98, yPos + 5, { align: "right" });
        doc.text(`$${Number(r.hourlyRate)?.toFixed(2)}`, 118, yPos + 5, { align: "right" });
      }

      // Total Payout & details
      doc.text(`$${Number(r.totalPayout)?.toFixed(2)}`, 143, yPos + 5, { align: "right" });
      
      doc.setFontSize(5);
      const taskLines = doc.splitTextToSize(r.taskDetails || "", 45);
      doc.text(taskLines, 148, yPos + 4.5);
      doc.setFontSize(8.5);

      yPos += 8;
    });

    // Add spacing and total row at end of table
    yPos += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Net Total Payout:", 118, yPos, { align: "right" });
    doc.text(`$${Number(payout["Total Payout"])?.toFixed(2)}`, 143, yPos, { align: "right" });

    // Signatures block - pinned at the bottom of the final page
    const sigY = 265;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    
    // Column 1: Prepared By
    doc.line(15, sigY, 65, sigY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Prepared By", 15, sigY + 4);
    doc.setFont("helvetica", "bold");
    doc.text("(Operator / Admin)", 15, sigY + 8);

    // Column 2: Approved By Manager
    doc.line(75, sigY, 125, sigY);
    doc.setFont("helvetica", "normal");
    doc.text("Approved By", 75, sigY + 4);
    doc.setFont("helvetica", "bold");
    doc.text("(Manager / Director)", 75, sigY + 8);

    // Column 3: Signature / Acknowledgment
    doc.line(135, sigY, 185, sigY);
    doc.setFont("helvetica", "normal");
    doc.text("Signature / Acknowledgment", 135, sigY + 4);
    doc.setFont("helvetica", "bold");
    doc.text("(Promoter)", 135, sigY + 8);

    // Open PDF as Blob URL in new browser tab for native print/download actions
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // Sync all on mount
  React.useEffect(() => {
    loadDatabaseData();
    loadPromoters();
    loadCampaigns();
    loadSchedules();
    loadPayouts();

    // Trigger silent background sync after mount
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("db-refresh"));
    }, 150);
    return () => clearTimeout(timer);
  }, [loadDatabaseData, loadPromoters, loadCampaigns, loadSchedules, loadPayouts]);

  const isEditAuthorized = profile?.role === "Administrator" || profile?.role === "Manager";

  // Reset manually added/hidden promoters when campaign changes
  React.useEffect(() => {
    setManuallyAddedPromoterIds([]);
    setHiddenPromoterIds([]);
  }, [selectedCampaignId]);

  // Check for local storage drafts on mount
  React.useEffect(() => {
    const draft = localStorage.getItem("ib_promoter_schedules_draft");
    const backup = localStorage.getItem("ib_promoter_schedules_backup");
    if (draft && backup) {
      try {
        const parsedDraft = JSON.parse(draft);
        const parsedBackup = JSON.parse(backup);
        setSchedules(parsedDraft);
        setSchedulesBackup(parsedBackup);
        setHistory([parsedDraft]);
        setHistoryIndex(0);
        setIsEditMode(true);
      } catch (e) {}
    }
  }, []);

  // Listen to clear edit mode event
  React.useEffect(() => {
    const handleClearEditMode = () => {
      setIsEditMode(false);
      setHistory([]);
      setHistoryIndex(-1);
    };
    window.addEventListener("ib-clear-edit-mode", handleClearEditMode);
    return () => {
      window.removeEventListener("ib-clear-edit-mode", handleClearEditMode);
    };
  }, []);

  // Reset expanded card when selected shift changes
  React.useEffect(() => {
    setExpandedCardId(null);
  }, [selectedShiftId]);

  // Reset expanded schedule when date changes
  React.useEffect(() => {
    setExpandedScheduleId(null);
    setExpandedCardId(null);
  }, [selectedDay, currentDate]);

  // Global db-refresh listener
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      await Promise.all([
        loadDatabaseData(),
        loadPromoters(true),
        loadCampaigns(true),
        loadSchedules(true),
        loadPayouts(true)
      ]);
      setIsEditMode(false);
      setHistory([]);
      setHistoryIndex(-1);
    };

    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, [loadDatabaseData, loadPromoters, loadCampaigns, loadSchedules, loadPayouts]);

  // Lock scroll behavior on main wrapper
  React.useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.style.overflow = "hidden";
      mainEl.style.height = "calc(100vh - 64px)";
    }
    return () => {
      if (mainEl) {
        mainEl.style.overflow = "";
        mainEl.style.height = "";
      }
    };
  }, []);

  // Filter products by selected brand in campaign form
  const brandProducts = React.useMemo(() => {
    if (!campBrand) return [];
    return products.filter(p => String(p["Brands ID"] || p["Brand ID"]) === String(campBrand));
  }, [products, campBrand]);

  // Undo / Redo history controller helper
  const pushHistory = (newSchedules: any[]) => {
    const nextHist = history.slice(0, historyIndex + 1);
    setHistory([...nextHist, newSchedules]);
    setHistoryIndex(nextHist.length);
    setSchedules(newSchedules);
    localStorage.setItem("ib_promoter_schedules_draft", JSON.stringify(newSchedules));
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setSchedules(history[prevIndex]);
      localStorage.setItem("ib_promoter_schedules_draft", JSON.stringify(history[prevIndex]));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setSchedules(history[nextIndex]);
      localStorage.setItem("ib_promoter_schedules_draft", JSON.stringify(history[nextIndex]));
    }
  };

  // Campaign Save (Insert/Update)
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campTitle.trim()) {
      showToast("Campaign Title is required.", "error");
      return;
    }
    if (!campBrand) {
      showToast("Please select a brand.", "error");
      return;
    }

    const campaignId = editingCampaignId || `camp_${Date.now()}`;
    const payload = {
      sheet: "Promoter_Campaign",
      action: editingCampaignId ? "update" : "insert",
      data: {
        ID: campaignId,
        "Campaign Title": campTitle.trim(),
        "Campaign Description": campDesc.trim(),
        "Campaign Instruction": campInstr.trim(),
        Brand: campBrand,
        Products: campProducts.join(",")
      }
    };

    // Optimistic Update
    const tempCampaign = {
      ID: campaignId,
      "Campaign Title": payload.data["Campaign Title"],
      "Campaign Description": payload.data["Campaign Description"],
      "Campaign Instruction": payload.data["Campaign Instruction"],
      Brand: payload.data.Brand,
      Products: payload.data.Products
    };

    setCampaigns(prev => {
      const idx = prev.findIndex(c => c.ID === campaignId);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = tempCampaign;
        return copy;
      } else {
        return [tempCampaign, ...prev];
      }
    });

    setIsCreatingCampaign(false);
    setEditingCampaignId(null);
    setCampTitle("");
    setCampDesc("");
    setCampInstr("");
    setCampBrand("");
    setCampProducts([]);
    showToast("Campaign saved successfully!", "success");

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        loadCampaigns();
      }
    } catch (err: any) {
      showToast("Failed to sync campaign to server: " + err.message, "error");
    }
  };

  // Campaign Delete
  const handleDeleteCampaign = (campId: string) => {
    showConfirm({
      title: "Delete Campaign",
      description: "Are you sure you want to permanently delete this campaign? This action cannot be undone.",
      variant: "danger",
      onConfirm: async () => {
        setCampaigns(prev => prev.filter(c => c.ID !== campId));
        showToast("Campaign deleted successfully", "success");

        try {
          const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sheet: "Promoter_Campaign",
              action: "delete",
              data: { ID: campId }
            })
          });
          if (res.ok) {
            loadCampaigns();
          }
        } catch (err: any) {
          showToast("Failed to delete campaign: " + err.message, "error");
        }
      }
    });
  };

  // Toggle Campaign Archive Status
  const handleToggleCampaignArchive = async (campaignId: string, isArchive: boolean) => {
    // Optimistic Update
    setCampaigns(prev => prev.map(c => c.ID === campaignId ? { ...c, Archived: isArchive ? 1 : "" } : c));

    try {
      const currentCampaign = campaigns.find(c => c.ID === campaignId);
      if (!currentCampaign) return;

      const payload = {
        sheet: "Promoter_Campaign",
        action: "update",
        data: {
          ...currentCampaign,
          Archived: isArchive ? 1 : ""
        }
      };

      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(isArchive ? "Campaign archived successfully." : "Campaign restored successfully.", "success");
        loadCampaigns();
      } else {
        throw new Error("Server error");
      }
    } catch (err: any) {
      showToast("Failed to update campaign status: " + err.message, "error");
      loadCampaigns(); // Rollback/reload
    }
  };

  // Save Promoter (Insert/Update)
  const handleSavePromoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!String(promoterName || "").trim()) {
      showToast("Promoter Name is required.", "error");
      return;
    }

    const id = editingPromoterId || String(promoterId || "").trim() || `prom_${Date.now()}`;
    const payload = {
      sheet: "Promoter_Users",
      action: editingPromoterId ? "update" : "insert",
      data: {
        ID: id,
        Name: String(promoterName || "").trim(),
        "Full Name": String(promoterFullName || "").trim(),
        Phone: String(promoterPhone || "").trim(),
        Email: String(promoterEmail || "").trim(),
        "Paynow Account": String(promoterPaynow || "").trim(),
        PIN: String(promoterPin || "").trim(),
        Archived: editingPromoterId ? (promoters.find(p => p.ID === editingPromoterId)?.Archived || "") : ""
      }
    };

    // Optimistic Update
    const tempPromoter = {
      ID: id,
      Name: payload.data.Name,
      "Full Name": payload.data["Full Name"],
      Phone: payload.data.Phone,
      Email: payload.data.Email,
      "Paynow Account": payload.data["Paynow Account"],
      PIN: payload.data.PIN,
      Archived: payload.data.Archived
    };

    setPromoters(prev => {
      const idx = prev.findIndex(p => p.ID === id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = tempPromoter;
        return copy;
      } else {
        return [tempPromoter, ...prev];
      }
    });

    setIsCreatingPromoter(false);
    setEditingPromoterId(null);
    setPromoterId("");
    setPromoterName("");
    setPromoterFullName("");
    setPromoterPhone("");
    setPromoterEmail("");
    setPromoterPaynow("");
    setPromoterPin("");
    showToast("Promoter saved successfully!", "success");

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        loadPromoters();
      }
    } catch (err: any) {
      showToast("Failed to sync promoter to server: " + err.message, "error");
      loadPromoters();
    }
  };

  // Toggle Promoter Archive Status
  const handleTogglePromoterArchive = async (pId: string, isArchive: boolean) => {
    // Optimistic Update
    setPromoters(prev => prev.map(p => p.ID === pId ? { ...p, Archived: isArchive ? 1 : "" } : p));

    try {
      const currentPromoter = promoters.find(p => p.ID === pId);
      if (!currentPromoter) return;

      const payload = {
        sheet: "Promoter_Users",
        action: "update",
        data: {
          ...currentPromoter,
          Archived: isArchive ? 1 : ""
        }
      };

      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(isArchive ? "Promoter archived successfully." : "Promoter restored successfully.", "success");
        loadPromoters();
      } else {
        throw new Error("Server error");
      }
    } catch (err: any) {
      showToast("Failed to update promoter status: " + err.message, "error");
      loadPromoters(); // Rollback/reload
    }
  };

  // Delete Promoter
  const handleDeletePromoter = (pId: string) => {
    showConfirm({
      title: "Delete Promoter",
      description: "Are you sure you want to permanently delete this promoter from the registry? This action cannot be undone.",
      variant: "danger",
      onConfirm: async () => {
        setPromoters(prev => prev.filter(p => p.ID !== pId));
        showToast("Promoter deleted successfully", "success");

        try {
          const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sheet: "Promoter_Users",
              action: "delete",
              data: { ID: pId }
            })
          });
          if (res.ok) {
            loadPromoters();
          }
        } catch (err: any) {
          showToast("Failed to delete promoter: " + err.message, "error");
          loadPromoters();
        }
      }
    });
  };

  // Print Campaign PDF
  const handlePrintCampaign = (c: any) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(24, 24, 27);
    doc.text("Campaign Briefing Sheet", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(113, 113, 122);
    const dateStr = new Date().toLocaleDateString("en-GB");
    doc.text(`Generated: ${dateStr}`, 196, 20, { align: "right" });

    doc.line(14, 23, 196, 23);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(24, 24, 27);
    doc.text(c["Campaign Title"], 14, 32);

    // Brand info
    const brandName = brands.find(b => String(b.ID) === String(c.Brand))?.["Display Name"] || c.Brand;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(113, 113, 122);
    doc.text(`Brand: ${brandName}`, 14, 38);

    // Description
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text("Description", 14, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(39, 39, 42);
    const descLines = doc.splitTextToSize(c["Campaign Description"] || "No description provided.", 182);
    doc.text(descLines, 14, 53);

    let yPos = 55 + descLines.length * 4.5;

    // Instructions
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text("Instructions", 14, yPos);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(39, 39, 42);
    const instrLines = doc.splitTextToSize(c["Campaign Instruction"] || "No instructions provided.", 182);
    doc.text(instrLines, 14, yPos + 5);

    yPos = yPos + 7 + instrLines.length * 4.5;

    // Products
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text("Target Products", 14, yPos);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(39, 39, 42);
    let targetProds = "All Products in Brand";
    if (c.Products && c.Products.trim()) {
      const prodSkus = c.Products.split(",");
      const prodNames = prodSkus.map((sku: string) => {
        const p = products.find(prod => String(prod.SKU).toLowerCase() === sku.toLowerCase());
        return p ? p["Display Name"] : sku;
      });
      targetProds = prodNames.join(", ");
    }
    const prodLines = doc.splitTextToSize(targetProds, 182);
    doc.text(prodLines, 14, yPos + 5);

    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
  };

  // Campaigns Table columns mapping
  const campaignsColumns = React.useMemo(() => [
    { id: "actions", header: "", accessor: "actions" },
    { id: "title", header: "Title", accessor: "title" },
    { id: "description", header: "Description", accessor: "description" },
    { id: "instruction", header: "Instruction", accessor: "instruction" }
  ], []);

  const mappedCampaigns = React.useMemo(() => {
    const list = campaigns.filter(c => {
      const isArchived = c.Archived && (String(c.Archived) === "1" || String(c.Archived) === "true");
      return campaignSubTab === "archive" ? isArchived : !isArchived;
    });

    return list.map(c => {
      const brandName = brands.find(b => String(b.ID) === String(c.Brand))?.["Display Name"] || c.Brand;
      const isArchived = c.Archived && (String(c.Archived) === "1" || String(c.Archived) === "true");

      return {
        id: c.ID,
        title: (
          <div className="flex flex-col gap-0.5 select-text">
            <span className="font-bold text-zinc-900">{c["Campaign Title"]}</span>
            <span className="text-[10px] text-zinc-400 font-bold font-mono">Brand: {brandName}</span>
          </div>
        ),
        title_raw: `${c["Campaign Title"]} ${brandName}`,
        description: (
          <div className="line-clamp-2 whitespace-pre-wrap break-words font-medium text-zinc-500 w-[240px] max-w-[240px]" title={c["Campaign Description"]}>
            {c["Campaign Description"] || "—"}
          </div>
        ),
        description_raw: c["Campaign Description"],
        instruction: (
          <div className="line-clamp-2 whitespace-pre-wrap break-words font-medium text-zinc-500 w-[240px] max-w-[240px]" title={c["Campaign Instruction"]}>
            {c["Campaign Instruction"] || "—"}
          </div>
        ),
        instruction_raw: c["Campaign Instruction"],
        actions: (
          <div className="flex items-center gap-1.5 w-[110px] shrink-0 select-none">
            <button
              onClick={() => handlePrintCampaign(c)}
              className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-650 hover:text-zinc-955 transition-colors cursor-pointer flex items-center justify-center"
              title="Print Campaign Details"
            >
              <Printer size={12} className="text-zinc-650" />
            </button>
            <button
              onClick={() => {
                setEditingCampaignId(c.ID);
                setCampTitle(c["Campaign Title"]);
                setCampDesc(c["Campaign Description"] || "");
                setCampInstr(c["Campaign Instruction"] || "");
                setCampBrand(c.Brand || "");
                setCampProducts(c.Products ? c.Products.split(",") : []);
                setIsCreatingCampaign(true);
              }}
              className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-655 hover:text-zinc-955 transition-colors cursor-pointer flex items-center justify-center"
              title="Edit Campaign"
            >
              <Pencil size={12} />
            </button>

            {isArchived ? (
              <>
                <button
                  type="button"
                  onClick={() => handleToggleCampaignArchive(c.ID, false)}
                  className="p-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0B57D0] hover:text-[#0842A0] transition-colors cursor-pointer flex items-center justify-center"
                  title="Revoke Archive"
                >
                  <Undo size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteCampaign(c.ID)}
                  className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-655 hover:text-red-800 transition-colors cursor-pointer flex items-center justify-center"
                  title="Delete Permanently"
                >
                  <Trash2 size={12} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleCampaignArchive(c.ID, true)}
                className="p-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 hover:text-amber-900 transition-colors cursor-pointer flex items-center justify-center"
                title="Archive Campaign"
              >
                <Archive size={12} />
              </button>
            )}
          </div>
        )
      };
    });
  }, [campaigns, campaignSubTab, brands, products]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(1);
  };

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getDaysInMonth = (y: number, m: number) => {
    return new Date(y, m + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Convert first day of month to start weeks on Monday index
  const blanksCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const blanks = Array(blanksCount).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const allCells = [...blanks, ...days];

  const isToday = (dayNum: number) => {
    const today = new Date();
    return today.getDate() === dayNum && today.getMonth() === month && today.getFullYear() === year;
  };



  // Helper to filter schedule events by date and selected campaign tab
  const getEventsForDay = React.useCallback((dayNum: number) => {
    const targetDate = new Date(year, month, dayNum).toDateString();
    let filtered = schedules.filter(s => new Date(s.Date).toDateString() === targetDate);
    
    if (selectedCampaignId !== "all" && selectedCampaignId !== "") {
      filtered = filtered.filter(s => String(s["Campaign ID"]) === String(selectedCampaignId));
    }
    return filtered;
  }, [schedules, selectedCampaignId, year, month]);

  const isChecklistPendingForDay = React.useCallback((dayNum: number) => {
    const targetDate = new Date(year, month, dayNum).toDateString();
    let daySchedules = schedules.filter(s => new Date(s.Date).toDateString() === targetDate);
    
    if (selectedCampaignId !== "all" && selectedCampaignId !== "") {
      daySchedules = daySchedules.filter(s => String(s["Campaign ID"]) === String(selectedCampaignId));
    }

    return daySchedules.some(s => {
      let customTasks: any[] = [];
      try {
        customTasks = JSON.parse(s["Custom Tasks"] || "[]");
      } catch (err) {}
      
      const shiftDate = new Date(s.Date);
      shiftDate.setHours(0,0,0,0);
      const today = new Date();
      today.setHours(0,0,0,0);
      const isPastDate = shiftDate.getTime() < today.getTime();

      const customTasksCount = customTasks.length;
      const customDoneCount = customTasks.filter((t: any) => !!t.answer).length;
      const permDone = s["Permission By"] ? 1 : 0;
      const stockDone = s["Stock Checked"] ? 1 : 0;
      const actualDone = (isPastDate && s["Actual Start"] && s["Actual End"]) ? 1 : 0;

      const totalCount = 2 + customTasksCount + (isPastDate ? 1 : 0);
      const doneCount = permDone + stockDone + customDoneCount + actualDone;

      return doneCount < totalCount;
    });
  }, [schedules, selectedCampaignId, year, month]);

  // Draft Save Handler (Updates state + pushes to history list)
  const executeSaveSchedule = (payloadData: any) => {
    const tempSchedule = {
      ID: payloadData.ID,
      Date: payloadData.Date,
      "Campaign ID": payloadData["Campaign ID"],
      "Campaign Title": payloadData["Campaign Title"],
      "Store ID": payloadData["Store ID"],
      "Store Name": payloadData["Store Name"],
      "Promoter ID": payloadData["Promoter ID"],
      "Promoter Name": payloadData["Promoter Name"],
      "Shift Start": payloadData["Shift Start"],
      "Shift End": payloadData["Shift End"],
      Remarks: payloadData.Remarks || ""
    };

    const newSchedules = [tempSchedule, ...schedules];
    pushHistory(newSchedules);
    showToast("Shift assigned to draft schedule.", "success");
  };

  // Save changes batch deployment handler
  const handleSaveAndDeploy = () => {
    const added = schedules.filter(s => !schedulesBackup.some(b => b.ID === s.ID));
    const deleted = schedulesBackup.filter(b => !schedules.some(s => s.ID === b.ID));
    const updated = schedules.filter(s => {
      const backupItem = schedulesBackup.find(b => b.ID === s.ID);
      if (!backupItem) return false;
      return (
        formatTimeDisplay(backupItem["Shift Start"]) !== formatTimeDisplay(s["Shift Start"]) ||
        formatTimeDisplay(backupItem["Shift End"]) !== formatTimeDisplay(s["Shift End"]) ||
        backupItem["Permission By"] !== s["Permission By"] ||
        backupItem["Stock Checked"] !== s["Stock Checked"] ||
        backupItem["Promotion Checked"] !== s["Promotion Checked"] ||
        backupItem["Photo URL"] !== s["Photo URL"] ||
        backupItem["Actual Start"] !== s["Actual Start"] ||
        backupItem["Actual End"] !== s["Actual End"] ||
        backupItem["Custom Tasks"] !== s["Custom Tasks"] ||
        backupItem.Remarks !== s.Remarks
      );
    });

    if (added.length === 0 && deleted.length === 0 && updated.length === 0) {
      setIsEditMode(false);
      setHistory([]);
      setHistoryIndex(-1);
      localStorage.removeItem("ib_promoter_schedules_draft");
      localStorage.removeItem("ib_promoter_schedules_backup");
      showToast("No changes to deploy.", "info");
      return;
    }

    // Capture snapshot for rollback
    const schedulesBeforeSave = [...schedules];
    const backupBeforeSave = [...schedulesBackup];

    // Optimistic UI updates - commit locally instantly
    setIsEditMode(false);
    setSchedulesBackup([...schedules]);
    setHistory([]);
    setHistoryIndex(-1);
    localStorage.removeItem("ib_promoter_schedules_draft");
    localStorage.removeItem("ib_promoter_schedules_backup");

    // Silent background sync
    (async () => {
      try {
        const promises = [];

        // Additions
        for (const item of added) {
          promises.push(
            fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sheet: "Promoter_Schedule", action: "insert", data: item })
            })
          );
        }

        // Deletions
        for (const item of deleted) {
          promises.push(
            fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sheet: "Promoter_Schedule", action: "delete", data: { ID: item.ID } })
            })
          );
        }

        // Updates
        for (const item of updated) {
          promises.push(
            fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sheet: "Promoter_Schedule", action: "update", data: item })
            })
          );
        }

        const results = await Promise.all(promises);
        const allOk = results.every(r => r.ok);
        if (allOk) {
          loadSchedules(); // Reload database data
        } else {
          throw new Error("One or more update requests failed.");
        }
      } catch (e: any) {
        showToast("Background sync failed: " + e.message + ". Rolling back changes.", "error");
        setSchedules(schedulesBeforeSave);
        setSchedulesBackup(backupBeforeSave);
        setIsEditMode(true);
        localStorage.setItem("ib_promoter_schedules_draft", JSON.stringify(schedulesBeforeSave));
        localStorage.setItem("ib_promoter_schedules_backup", JSON.stringify(backupBeforeSave));
      }
    })();
  };

  // Schedule Delete
  const handleDeleteSchedule = (schId: string) => {
    if (!isEditMode) {
      showToast("Please click 'Edit Mode' to make changes.", "warning");
      return;
    }
    const sch = schedules.find(s => s.ID === schId);
    if (sch && isShiftLocked(sch.Date, sch["Promoter ID"])) {
      showToast("This shift is locked because the promoter has already been paid for this date range.", "error");
      return;
    }
    showConfirm({
      title: "Remove Assignment",
      description: "Are you sure you want to remove this promoter shift assignment?",
      variant: "danger",
      onConfirm: () => {
        const newSchedules = schedules.filter(s => s.ID !== schId);
        pushHistory(newSchedules);
        showToast("Shift assignment removed from draft.", "success");
      }
    });
  };

  const checkShiftTimeOverlap = (startA: string, endA: string, startB: string, endB: string): boolean => {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return (isNaN(h) ? 9 : h) * 60 + (isNaN(m) ? 0 : m);
    };
    const aStart = toMinutes(startA);
    const aEnd = toMinutes(endA);
    const bStart = toMinutes(startB);
    const bEnd = toMinutes(endB);

    // Conflict exists if they overlap with a 1-hour (60 min) buffer.
    // Shift B must start at least 60 mins after Shift A ends, OR Shift A must start at least 60 mins after Shift B ends.
    // Therefore, they DO overlap/conflict if: bStart < aEnd + 60 AND aStart < bEnd + 60.
    return bStart < aEnd + 60 && aStart < bEnd + 60;
  };

  const getConflictingShift = (promoterId: string, dateVal: number, newStart: string, newEnd: string, excludeShiftId?: string): any | null => {
    const dateStr = new Date(dateVal).toDateString();
    const conflicting = schedules.find(s => {
      if (excludeShiftId && s.ID === excludeShiftId) return false;
      const sDateStr = new Date(s.Date).toDateString();
      if (sDateStr !== dateStr || String(s["Promoter ID"]) !== String(promoterId)) return false;

      const otherStart = formatTimeDisplay(s["Shift Start"]) || "09:00";
      const otherEnd = formatTimeDisplay(s["Shift End"]) || "17:00";
      return checkShiftTimeOverlap(newStart, newEnd, otherStart, otherEnd);
    });
    return conflicting || null;
  };

  const validateShiftBuffer = (promoterId: string, dateVal: number, newStart: string, newEnd: string, excludeShiftId?: string): boolean => {
    return getConflictingShift(promoterId, dateVal, newStart, newEnd, excludeShiftId) === null;
  };

  const checkAndToastConflict = (promoterId: string, dateVal: number, start: string, end: string, excludeShiftId?: string): boolean => {
    const conflict = getConflictingShift(promoterId, dateVal, start, end, excludeShiftId);
    if (conflict) {
      const promoter = conflict["Promoter Name"] || "Promoter";
      const campTitle = conflict["Campaign Title"] || "";
      const shortCamp = campTitle.length > 10 ? campTitle.substring(0, 10) + "..." : campTitle;
      const shStart = formatTimeDisplay(conflict["Shift Start"]) || "";
      const shEnd = formatTimeDisplay(conflict["Shift End"]) || "";
      const timeStr = shStart && shEnd ? `${shStart} - ${shEnd}` : "";
      
      showToast(`${promoter} has been assigned to ${shortCamp} at this time ${timeStr}`, "error");
      return false;
    }
    return true;
  };

  // Drag and Drop Cell Assignment / Re-assignment (Campaign Mode)
  const handleStoreDrop = async (e: React.DragEvent, date: Date, promoterId: string) => {
    e.preventDefault();
    if (!isEditMode) {
      showToast("Please click 'Edit Mode' to make changes.", "warning");
      return;
    }

    const scheduleId = e.dataTransfer.getData("scheduleId");
    const dragAction = e.dataTransfer.getData("dragAction");

    if (scheduleId) {
      // Dragged a schedule card to move/duplicate
      const sch = schedules.find(s => s.ID === scheduleId);
      if (!sch) return;

      const start = formatTimeDisplay(sch["Shift Start"]) || "09:00";
      const end = formatTimeDisplay(sch["Shift End"]) || "17:00";
      const destPromoter = promoters.find(p => String(p.ID) === String(promoterId));
      if (!destPromoter) return;

      if (dragAction === "move") {
        if (isShiftLocked(sch.Date, sch["Promoter ID"]) || isShiftLocked(date.getTime(), promoterId)) {
          showToast("Operation blocked: One or both dates are locked due to completed promoter payouts.", "error");
          return;
        }
        if (!checkAndToastConflict(promoterId, date.getTime(), start, end, sch.ID)) {
          return;
        }

        const newSchedules = schedules.map(s => s.ID === sch.ID ? {
          ...s,
          Date: date.getTime(),
          "Promoter ID": String(promoterId),
          "Promoter Name": destPromoter.Name
        } : s);
        pushHistory(newSchedules);
        showToast("Shift moved successfully.", "success");
      } else if (dragAction === "duplicate") {
        if (isShiftLocked(date.getTime(), promoterId)) {
          showToast("Operation blocked: The target date is locked due to completed promoter payouts.", "error");
          return;
        }
        if (!checkAndToastConflict(promoterId, date.getTime(), start, end)) {
          return;
        }

        const newSch = {
          ...sch,
          ID: `sch_${Date.now()}`,
          Date: date.getTime(),
          "Promoter ID": String(promoterId),
          "Promoter Name": destPromoter.Name
        };
        const newSchedules = [...schedules, newSch];
        pushHistory(newSchedules);
        showToast("Shift duplicated successfully (retained times).", "success");
      }
      return;
    }

    const storeId = e.dataTransfer.getData("storeId");
    if (!storeId) return;

    if (selectedCampaignId === "") {
      showToast("Please select a Campaign from the dropdown first before dragging stores to assign shifts.", "error");
      return;
    }

    const selectedCampaign = campaigns.find(c => c.ID === selectedCampaignId);
    const selectedStore = stores.find(s => String(s.ID) === String(storeId));
    const selectedPromoter = promoters.find(p => String(p.ID) === String(promoterId));

    if (!selectedCampaign || !selectedStore || !selectedPromoter) return;

    if (isShiftLocked(date.getTime(), promoterId)) {
      showToast("Operation blocked: The target date is locked due to completed promoter payouts.", "error");
      return;
    }

    // Calculate next shift time block dynamically
    const dayShifts = schedules.filter(s => 
      String(s["Promoter ID"]) === String(promoterId) &&
      new Date(s.Date).toDateString() === date.toDateString()
    );

    let shiftStart = "09:00";
    let shiftEnd = "11:00";

    if (dayShifts.length > 0) {
      let latestEndMinutes = 0;
      dayShifts.forEach(s => {
        const endTimeStr = formatTimeDisplay(s["Shift End"]) || "11:00";
        const [h, m] = endTimeStr.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          const totalMinutes = h * 60 + m;
          if (totalMinutes > latestEndMinutes) {
            latestEndMinutes = totalMinutes;
          }
        }
      });

      const nextStartMinutes = latestEndMinutes + 60; // 1-hour buffer
      const nextEndMinutes = nextStartMinutes + 240; // 4-hour session

      const startH = Math.floor(nextStartMinutes / 60) % 24;
      const startM = nextStartMinutes % 60;
      const endH = Math.floor(nextEndMinutes / 60) % 24;
      const endM = nextEndMinutes % 60;

      shiftStart = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
      shiftEnd = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    }

    if (!checkAndToastConflict(promoterId, date.getTime(), shiftStart, shiftEnd)) {
      return;
    }

    // Validation 2: Merchandiser Brand Carry lookup
    const brandId = selectedCampaign.Brand;
    const brandName = brands.find(b => String(b.ID) === String(brandId))?.["Display Name"] || brandId;

    const storeLogs = productLogs.filter(log => {
      const logStoreId = log["Retailer Stores ID"] || log["Store ID"];
      return String(logStoreId) === String(storeId);
    });

    const sortedStoreLogs = [...storeLogs].sort((a, b) => Number(b.Timestamp) - Number(a.Timestamp));

    let carriesBrand = false;
    let hasLogs = sortedStoreLogs.length > 0;

    if (hasLogs) {
      const latestLog = sortedStoreLogs[0];
      const remark = String(latestLog.Remark || "").trim();
      if (remark !== "Store Not Carry") {
        let auditJson: any[] = [];
        try {
          auditJson = JSON.parse(latestLog["Audit JSON"] || "[]");
        } catch (err) {}

        const brandSkus = products
          .filter(p => String(p["Brands ID"] || p["Brand ID"]) === String(brandId))
          .map(p => String(p.SKU).toLowerCase());

        carriesBrand = auditJson.some((item: any) => {
          const sku = String(item.sku).toLowerCase();
          return brandSkus.includes(sku) && (Number(item.qty) || 0) > 0;
        });
      }
    }

    const scheduleData = {
      ID: `sch_${Date.now()}`,
      Date: date.getTime(),
      "Campaign ID": selectedCampaign.ID,
      "Campaign Title": selectedCampaign["Campaign Title"],
      "Store ID": String(storeId),
      "Store Name": selectedStore["Display Name"],
      "Promoter ID": String(promoterId),
      "Promoter Name": selectedPromoter.Name,
      "Shift Start": shiftStart,
      "Shift End": shiftEnd
    };

    if (!carriesBrand) {
      showConfirm({
        title: "Brand Not Carried Warning",
        description: `According to the latest merchandiser audits, this store does not carry the brand "${brandName}". Do you still want to continue deploying a promoter here?`,
        onConfirm: () => executeSaveSchedule(scheduleData)
      });
    } else {
      executeSaveSchedule(scheduleData);
    }
  };

  // Clipboard Paste Schedule Assignment
  const handlePasteSchedule = (date: Date, promoterId: string) => {
    if (!copiedSchedule) return;

    // Calculate next shift time block dynamically
    const dayShifts = schedules.filter(s => 
      String(s["Promoter ID"]) === String(promoterId) &&
      new Date(s.Date).toDateString() === date.toDateString()
    );

    let shiftStart = "09:00";
    let shiftEnd = "11:00";

    if (dayShifts.length > 0) {
      let latestEndMinutes = 0;
      dayShifts.forEach(s => {
        const endTimeStr = formatTimeDisplay(s["Shift End"]) || "11:00";
        const [h, m] = endTimeStr.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          const totalMinutes = h * 60 + m;
          if (totalMinutes > latestEndMinutes) {
            latestEndMinutes = totalMinutes;
          }
        }
      });

      const nextStartMinutes = latestEndMinutes + 60; // 1-hour buffer
      const nextEndMinutes = nextStartMinutes + 240; // 4-hour session

      const startH = Math.floor(nextStartMinutes / 60) % 24;
      const startM = nextStartMinutes % 60;
      const endH = Math.floor(nextEndMinutes / 60) % 24;
      const endM = nextEndMinutes % 60;

      shiftStart = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
      shiftEnd = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    }

    if (!checkAndToastConflict(promoterId, date.getTime(), shiftStart, shiftEnd)) {
      return;
    }

    const selectedPromoter = promoters.find(p => String(p.ID) === String(promoterId));
    if (!selectedPromoter) return;

    const newSch = {
      ID: `sch_${Date.now()}`,
      Date: date.getTime(),
      "Campaign ID": copiedSchedule["Campaign ID"],
      "Campaign Title": copiedSchedule["Campaign Title"],
      "Store ID": copiedSchedule["Store ID"],
      "Store Name": copiedSchedule["Store Name"],
      "Promoter ID": String(promoterId),
      "Promoter Name": selectedPromoter.Name,
      "Shift Start": shiftStart,
      "Shift End": shiftEnd,
      Remarks: copiedSchedule.Remarks || ""
    };

    const newSchedules = [...schedules, newSch];
    pushHistory(newSchedules);
    setCopiedSchedule(null); // Clear clipboard
    showToast("Shift pasted successfully with default times.", "success");
  };

  // Inline Shift Time Updates (Campaign Mode)
  const handleUpdateTime = (schId: string, field: "Shift Start" | "Shift End", value: string) => {
    if (!isEditMode) {
      showToast("Please click 'Edit Mode' to make changes.", "warning");
      return;
    }
    const current = schedules.find(s => s.ID === schId);
    if (!current) return;
    if (isShiftLocked(current.Date, current["Promoter ID"])) {
      showToast("This shift is locked because the promoter has already been paid for this date range.", "error");
      return;
    }
    const nextStart = field === "Shift Start" ? value : (formatTimeDisplay(current["Shift Start"]) || "09:00");
    const nextEnd = field === "Shift End" ? value : (formatTimeDisplay(current["Shift End"]) || "17:00");

    if (!checkAndToastConflict(current["Promoter ID"], current.Date, nextStart, nextEnd, schId)) {
      return;
    }

    const newSchedules = schedules.map(s => s.ID === schId ? { ...s, [field]: value } : s);
    pushHistory(newSchedules);
  };

  // Inline Shift Remarks Updates (Campaign Mode)
  const handleUpdateRemark = (schId: string, value: string) => {
    if (!isEditMode) {
      showToast("Please click 'Edit Mode' to make changes.", "warning");
      return;
    }
    const current = schedules.find(s => s.ID === schId);
    if (current && isShiftLocked(current.Date, current["Promoter ID"])) {
      showToast("This shift is locked because the promoter has already been paid for this date range.", "error");
      return;
    }
    const newSchedules = schedules.map(s => s.ID === schId ? { ...s, Remarks: value } : s);
    pushHistory(newSchedules);
  };

  // Admin Shift Tasks Actions (Monthly Calendar view)
  const handleUpdateShiftField = (shiftId: string, field: string, value: any) => {
    if (!isEditMode) {
      showToast("Please click 'Edit Mode' to make changes.", "warning");
      return;
    }
    const current = schedules.find(s => s.ID === shiftId);
    if (current && isShiftLocked(current.Date, current["Promoter ID"])) {
      showToast("This shift is locked because the promoter has already been paid for this date range.", "error");
      return;
    }
    const newSchedules = schedules.map(s => s.ID === shiftId ? { ...s, [field]: value } : s);
    pushHistory(newSchedules);
  };

  const handleAddCustomTask = async (shiftId: string, taskText: string) => {
    if (!taskText.trim()) return;
    const activeShift = schedules.find(s => s.ID === shiftId);
    if (!activeShift) return;

    let existingCustomTasks: any[] = [];
    if (activeShift["Custom Tasks"]) {
      try {
        existingCustomTasks = JSON.parse(activeShift["Custom Tasks"]);
      } catch (e) {
        existingCustomTasks = [];
      }
    }

    const newTask = {
      id: `ctask_${Date.now()}`,
      text: taskText.trim(),
      done: 0
    };

    const updatedCustomTasks = [...existingCustomTasks, newTask];
    setCustomTaskTexts(prev => ({ ...prev, [shiftId]: "" }));

    await handleUpdateShiftField(shiftId, "Custom Tasks", JSON.stringify(updatedCustomTasks));
  };

  const handleToggleCustomTask = async (shiftId: string, taskId: string) => {
    const activeShift = schedules.find(s => s.ID === shiftId);
    if (!activeShift) return;

    let existingCustomTasks: any[] = [];
    if (activeShift["Custom Tasks"]) {
      try {
        existingCustomTasks = JSON.parse(activeShift["Custom Tasks"]);
      } catch (e) {
        existingCustomTasks = [];
      }
    }

    const updatedCustomTasks = existingCustomTasks.map((t: any) =>
      t.id === taskId ? { ...t, done: t.done === 1 ? 0 : 1 } : t
    );

    await handleUpdateShiftField(shiftId, "Custom Tasks", JSON.stringify(updatedCustomTasks));
  };

  const handleDeleteCustomTask = async (shiftId: string, taskId: string) => {
    const activeShift = schedules.find(s => s.ID === shiftId);
    if (!activeShift) return;

    let existingCustomTasks: any[] = [];
    if (activeShift["Custom Tasks"]) {
      try {
        existingCustomTasks = JSON.parse(activeShift["Custom Tasks"]);
      } catch (e) {
        existingCustomTasks = [];
      }
    }

    const updatedCustomTasks = existingCustomTasks.filter((t: any) => t.id !== taskId);

    await handleUpdateShiftField(shiftId, "Custom Tasks", JSON.stringify(updatedCustomTasks));
  };

  // Campaign Mode helper dates
  const weekDates = React.useMemo(() => {
    const dates = [];
    const temp = new Date(selectedWeekStart);
    for (let i = 0; i < 7; i++) {
      dates.push(new Date(temp));
      temp.setDate(temp.getDate() + 1);
    }
    return dates;
  }, [selectedWeekStart]);

  const selectedDayShifts = React.useMemo(() => {
    const targetDate = new Date(year, month, selectedDay).toDateString();
    return schedules.filter(s => new Date(s.Date).toDateString() === targetDate);
  }, [schedules, selectedDay, year, month]);



  const handlePrevWeek = () => {
    setSelectedWeekStart(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000));
  };

  const handleNextWeek = () => {
    setSelectedWeekStart(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const handlePrintReport = (paperSize: string) => {
    if (selectedPrintLayout === "master-calendar") {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3"
      });

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(24, 24, 27); // zinc-900
      doc.text("iB - Promoter Calendar", 15, 20);

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(13);
      doc.setTextColor(113, 113, 122); // zinc-500
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      doc.text(`${monthNames[printMonth]} ${printYear}`, 15, 26);

      const dateStr = new Date().toLocaleDateString("en-GB");
      doc.setFontSize(9);
      doc.text(`Generated: ${dateStr}`, 405, 20, { align: "right" });

      // Column Headers
      const colWidth = 390 / 7; // 55.71mm
      const headers = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      
      doc.setFillColor(244, 244, 245);
      doc.rect(15, 32, 390, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(39, 39, 42); // zinc-800
      
      headers.forEach((h, idx) => {
        const x = 15 + idx * colWidth;
        doc.rect(x, 32, colWidth, 8);
        doc.text(h, x + colWidth / 2, 37.5, { align: "center" });
      });

      // Grid Cells
      const daysInMonth = new Date(printYear, printMonth + 1, 0).getDate();
      const firstDayIndex = new Date(printYear, printMonth, 1).getDay();
      const blanksCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
      const blanks = Array(blanksCount).fill(null);
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      const cells = [...blanks, ...days];
      const numRows = Math.ceil(cells.length / 7);
      
      const gridStartY = 40;
      const totalAvailableHeight = 297 - gridStartY - 15; // 242mm
      const rowHeight = totalAvailableHeight / numRows;

      cells.forEach((dayNum, idx) => {
        const row = Math.floor(idx / 7);
        const col = idx % 7;
        const x = 15 + col * colWidth;
        const y = gridStartY + row * rowHeight;

        // Draw Cell border
        doc.setFillColor(dayNum === null ? "#fafafa" : "#ffffff");
        if (dayNum === null) {
          doc.rect(x, y, colWidth, rowHeight, "F");
        }
        doc.rect(x, y, colWidth, rowHeight);

        if (dayNum !== null) {
          // Draw Day number
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(63, 63, 70); // zinc-700
          doc.text(String(dayNum), x + colWidth - 3, y + 5, { align: "right" });

          // Find shifts
          const cellDate = new Date(printYear, printMonth, dayNum);
          const cellDateStr = cellDate.toDateString();
          const daySchedules = schedules.filter(s => new Date(s.Date).toDateString() === cellDateStr);

          // Write shifts
          let shiftY = y + 8;
          doc.setFont("helvetica", "normal");
          
          daySchedules.forEach((s) => {
            if (shiftY + 11 > y + rowHeight) {
              doc.setFont("helvetica", "italic");
              doc.setFontSize(7);
              doc.setTextColor(113, 113, 122);
              doc.text("... more shifts", x + 3, y + rowHeight - 2);
              return;
            }

            // Accent bar
            doc.setFillColor(11, 87, 208);
            doc.rect(x + 2, shiftY, 1, 8.5, "F");

            // Text
            doc.setFontSize(7.5);
            doc.setTextColor(30, 58, 138); // Blue-900
            doc.setFont("helvetica", "bold");
            const nickname = s["Promoter Name"] || "";
            const campTitle = s["Campaign Title"] || "";
            const titleLine = `${nickname} - ${campTitle}`;
            const wrappedTitle = doc.splitTextToSize(titleLine, colWidth - 7);
            doc.text(wrappedTitle[0] || "", x + 4, shiftY + 2.5);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(75, 85, 99); // gray-600
            
            // Resolve retailer name
            const storeObj = stores.find(st => String(st.ID) === String(s["Store ID"]));
            const retId = storeObj ? (storeObj["Retailers ID"] || storeObj["Retailer ID"]) : null;
            const retailerObj = retId ? retailers.find(r => String(r.ID) === String(retId)) : null;
            const retailerName = retailerObj ? (retailerObj["Display Name"] || retailerObj.Name || "") : "";
            const storeName = s["Store Name"] || (storeObj ? storeObj["Display Name"] : "");
            const storeLine = retailerName ? `${retailerName} - ${storeName}` : storeName;
            
            const wrappedStore = doc.splitTextToSize(storeLine, colWidth - 7);
            doc.text(wrappedStore[0] || "", x + 4, shiftY + 5.5);

            doc.setTextColor(31, 41, 55); // gray-800
            doc.setFont("helvetica", "bold");
            const timeLine = `${formatTimeDisplay(s["Shift Start"])} - ${formatTimeDisplay(s["Shift End"])}`;
            doc.text(timeLine, x + 4, shiftY + 8);

            shiftY += 9.5;
          });
        }
      });

      // Draw footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122);
      doc.text("iB - HSG Global Internal Bridge", 210, 292, { align: "center" });

      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    }

    else if (selectedPrintLayout === "campaign-schedule") {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const startMs = new Date(printStartDate + "T00:00:00").getTime();
      const endMs = new Date(printEndDate + "T23:59:59").getTime();

      const campaignSchedules = schedules.filter(s => 
        String(s["Campaign ID"]) === String(printCampaignId) &&
        s.Date >= startMs && s.Date <= endMs
      );

      const reportDates: Date[] = [];
      let tempDate = new Date(printStartDate + "T00:00:00");
      const maxEnd = new Date(printEndDate + "T23:59:59");
      while (tempDate <= maxEnd) {
        const currentDateStr = tempDate.toDateString();
        const hasShift = campaignSchedules.some(s => new Date(s.Date).toDateString() === currentDateStr);
        if (hasShift) {
          reportDates.push(new Date(tempDate));
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }

      const campaign = campaigns.find(c => String(c.ID) === String(printCampaignId));
      const campaignTitle = campaign ? campaign["Campaign Title"] : "Campaign Schedule";
      const activePromoterIds = Array.from(new Set(campaignSchedules.map(s => String(s["Promoter ID"]))));
      const activeCampPromoters = promoters.filter(p => activePromoterIds.includes(String(p.ID)) && !(p.Archived && (String(p.Archived) === "1" || String(p.Archived) === "true")));

      const promoterChunks: any[][] = [];
      if (activeCampPromoters.length === 0) {
        promoterChunks.push([]);
      } else {
        for (let i = 0; i < activeCampPromoters.length; i += 4) {
          promoterChunks.push(activeCampPromoters.slice(i, i + 4));
        }
      }

      const formatPrintDateStr = (dateVal: Date | number) => {
        const d = new Date(dateVal);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const getDayName = (dateVal: Date) => {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return days[dateVal.getDay()];
      };

      promoterChunks.forEach((chunk, chunkIdx) => {
        if (chunkIdx > 0) {
          doc.addPage();
        }

        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(24, 24, 27);
        doc.text("iB - Campaign Schedule", 15, 13);
        
        doc.setFontSize(11);
        doc.text(campaignTitle, 15, 19);

        let nextY = 24;

        // Add campaign description under title, without label prefix
        const campDescText = campaign ? String(campaign["Campaign Description"] || "").trim() : "";
        if (campDescText) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(63, 63, 70);
          const wrappedDesc = doc.splitTextToSize(campDescText, 267);
          doc.text(wrappedDesc, 15, nextY);
          nextY += wrappedDesc.length * 4.5;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(113, 113, 122);
        doc.text(`Range: ${formatPrintDateStr(startMs)} - ${formatPrintDateStr(endMs)} (Generated: ${formatPrintDateStr(new Date())})`, 15, nextY);

        const tableHeaderY = nextY + 5;
        let currentY = tableHeaderY + 8;

        // Table Header
        const colWidths = [43, 56, 56, 56, 56];
        doc.setFillColor(244, 244, 245);
        doc.rect(15, tableHeaderY, 267, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(63, 63, 70);

        doc.rect(15, tableHeaderY, 43, 8);
        doc.text("Campaign Date", 17, tableHeaderY + 5);

        for (let i = 0; i < 4; i++) {
          const promoter = chunk[i];
          const x = 58 + i * 56;
          doc.rect(x, tableHeaderY, 56, 8);
          doc.text(promoter ? promoter.Name : "", x + 2, tableHeaderY + 5);
        }

        reportDates.forEach((date) => {
          const cellTexts: string[][] = [];
          
          const dateColText = `${getDayName(date)}\n${formatPrintDateStr(date)}`;
          const wrappedDate = doc.splitTextToSize(dateColText, 39);
          cellTexts.push(wrappedDate);

          for (let i = 0; i < 4; i++) {
            const promoter = chunk[i];
            if (!promoter) {
              cellTexts.push([]);
              continue;
            }

            const sch = campaignSchedules.find(s => 
              String(s["Promoter ID"]) === String(promoter.ID) && 
              new Date(s.Date).toDateString() === date.toDateString()
            );

            if (!sch) {
              cellTexts.push([]);
            } else {
              const textLines = [
                getFormattedStoreName(sch["Store ID"], sch["Store Name"]),
                `${formatTimeDisplay(sch["Shift Start"])} - ${formatTimeDisplay(sch["Shift End"])}`,
                sch.Remarks || ""
              ].filter(Boolean);
              
              const wrappedText = doc.splitTextToSize(textLines.join("\n"), 52);
              cellTexts.push(wrappedText);
            }
          }

          const lineCounts = cellTexts.map(ct => ct.length);
          const maxLines = Math.max(...lineCounts, 1);
          const rowHeight = maxLines * 4 + 6;

          if (currentY + rowHeight > 195) {
            doc.addPage();
            
            doc.setFillColor(244, 244, 245);
            doc.rect(15, 15, 267, 8, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(63, 63, 70);

            doc.rect(15, 15, 43, 8);
            doc.text("Campaign Date", 17, 20);

            for (let i = 0; i < 4; i++) {
              const promoter = chunk[i];
              const x = 58 + i * 56;
              doc.rect(x, 15, 56, 8);
              doc.text(promoter ? promoter.Name : "", x + 2, 20);
            }

            currentY = 23;
          }

          doc.rect(15, currentY, 43, rowHeight);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(39, 39, 42);
          
          let lineY = currentY + 4.5;
          cellTexts[0].forEach((line: string, lineIdx: number) => {
            if (lineIdx === 0) {
              doc.setFont("helvetica", "bold");
              doc.setTextColor(24, 24, 27);
            } else {
              doc.setFont("helvetica", "normal");
              doc.setTextColor(113, 113, 122);
            }
            doc.text(line, 17, lineY);
            lineY += 4;
          });

          for (let i = 0; i < 4; i++) {
            const x = 58 + i * 56;
            doc.rect(x, currentY, 56, rowHeight);
            
            const lines = cellTexts[i + 1];
            if (lines.length > 0) {
              let cellLineY = currentY + 4.5;
              lines.forEach((line: string, lineIdx: number) => {
                if (lineIdx === 0) {
                  doc.setFont("helvetica", "bold");
                  doc.setTextColor(30, 58, 138);
                } else if (lineIdx === 1) {
                  doc.setFont("helvetica", "bold");
                  doc.setTextColor(63, 63, 70);
                } else {
                  doc.setFont("helvetica", "italic");
                  doc.setTextColor(113, 113, 122);
                }
                doc.setFontSize(7.5);
                doc.text(line, x + 2, cellLineY);
                cellLineY += 4;
              });
            }
          }

          currentY += rowHeight;
        });
      });

      // Add footer to all pages
      const pageCount = doc.getNumberOfPages();
      const campInstrText = campaign ? String(campaign["Campaign Instruction"] || "").trim() : "";
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        if (campInstrText) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(63, 63, 70);
          doc.text("Instruction:", 15, 198);
          
          doc.setFont("helvetica", "normal");
          doc.setTextColor(113, 113, 122);
          const wrappedInstr = doc.splitTextToSize(campInstrText, 245);
          doc.text(wrappedInstr[0] || "", 32, 198);
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(113, 113, 122);
        doc.text("iB - HSG Global Internal Bridge", 148.5, 205, { align: "center" });
      }

      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    }

    else if (selectedPrintLayout === "promoter-schedule") {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });

      const startMs = new Date(printStartDate + "T00:00:00").getTime();
      const endMs = new Date(printEndDate + "T23:59:59").getTime();

      const promoter = promoters.find(p => String(p.ID) === String(printPromoterId));
      const promoterNameLabel = promoter ? promoter.Name : "Promoter";

      const promoterSchedules = schedules.filter(s => 
        String(s["Promoter ID"]) === String(printPromoterId) &&
        s.Date >= startMs && s.Date <= endMs
      );
      promoterSchedules.sort((a, b) => a.Date - b.Date);

      const formatPrintDateStr = (dateVal: Date | number) => {
        const d = new Date(dateVal);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const getDayName = (dateVal: Date) => {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return days[dateVal.getDay()];
      };

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(24, 24, 27);
      doc.text("iB - Promoter Schedule", 15, 15);
      
      doc.setFontSize(11);
      doc.text(promoterNameLabel, 15, 21);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(113, 113, 122);
      doc.text(`Range: ${formatPrintDateStr(startMs)} - ${formatPrintDateStr(endMs)} (Generated: ${formatPrintDateStr(new Date())})`, 15, 26);

      const colWidths = [40, 85, 71, 71];
      doc.setFillColor(244, 244, 245);
      doc.rect(15, 32, 267, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(63, 63, 70);

      const headers = ["Assign Date", "Assign Location", "Task", "Instruction"];
      let headerX = 15;
      headers.forEach((h, idx) => {
        doc.rect(headerX, 32, colWidths[idx], 8);
        doc.text(h, headerX + 2.5, 37);
        headerX += colWidths[idx];
      });

      let currentY = 40;

      if (promoterSchedules.length === 0) {
        doc.rect(15, currentY, 267, 15);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(113, 113, 122);
        doc.text("No shifts scheduled within this date range.", 15 + 267 / 2, currentY + 9, { align: "center" });
      } else {
        promoterSchedules.forEach((sch) => {
          const dateObj = new Date(sch.Date);
          const storeObj = stores.find(st => String(st.ID) === String(sch["Store ID"]));
          const storeAddress = storeObj ? storeObj.Address : "";

          const campaign = campaigns.find(c => String(c.ID) === String(sch["Campaign ID"]));
          const campaignTitle = campaign ? campaign["Campaign Title"] : sch["Campaign Title"];
          const campaignDescLocal = campaign ? campaign["Campaign Description"] : "";
          const campaignInstrLocal = campaign ? campaign["Campaign Instruction"] : "";

          const colTexts = [
            `${getDayName(dateObj)}\n${formatPrintDateStr(dateObj)}`,
            `${getFormattedStoreName(sch["Store ID"], sch["Store Name"])}\n${storeAddress}\n${formatTimeDisplay(sch["Shift Start"])} - ${formatTimeDisplay(sch["Shift End"])}`,
            `${campaignTitle}\n${campaignDescLocal}`,
            `${sch.Remarks ? 'Remarks: ' + sch.Remarks : ''}\n${campaignInstrLocal}`
          ];

          const wrappedTexts = colTexts.map((txt, idx) => 
            doc.splitTextToSize(txt.trim(), colWidths[idx] - 5)
          );

          const maxLines = Math.max(...wrappedTexts.map(wt => wt.length), 1);
          const rowHeight = maxLines * 4 + 6;

          if (currentY + rowHeight > 195) {
            doc.addPage();
            
            doc.setFillColor(244, 244, 245);
            doc.rect(15, 15, 267, 8, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(63, 63, 70);

            let pageHeaderX = 15;
            headers.forEach((h, idx) => {
              doc.rect(pageHeaderX, 15, colWidths[idx], 8);
              doc.text(h, pageHeaderX + 2.5, 20);
              pageHeaderX += colWidths[idx];
            });

            currentY = 23;
          }

          let colX = 15;
          wrappedTexts.forEach((lines: string[], colIdx: number) => {
            doc.rect(colX, currentY, colWidths[colIdx], rowHeight);
            
            let lineY = currentY + 4.5;
            lines.forEach((line: string, lineIdx: number) => {
              if (colIdx === 0) {
                if (lineIdx === 0) {
                  doc.setFont("helvetica", "bold");
                  doc.setTextColor(24, 24, 27);
                } else {
                  doc.setFont("helvetica", "normal");
                  doc.setTextColor(113, 113, 122);
                }
              } else if (colIdx === 1) {
                if (lineIdx === 0) {
                  doc.setFont("helvetica", "bold");
                  doc.setTextColor(30, 58, 138);
                } else if (lineIdx === lines.length - 1) {
                  doc.setFont("helvetica", "bold");
                  doc.setTextColor(63, 63, 70);
                } else {
                  doc.setFont("helvetica", "normal");
                  doc.setTextColor(113, 113, 122);
                }
              } else if (colIdx === 2) {
                if (lineIdx === 0) {
                  doc.setFont("helvetica", "bold");
                  doc.setTextColor(11, 87, 208);
                } else {
                  doc.setFont("helvetica", "normal");
                  doc.setTextColor(82, 82, 91);
                }
              } else {
                if (lineIdx === 0 && line.startsWith("Remarks:")) {
                  doc.setFont("helvetica", "bold");
                  doc.setTextColor(220, 38, 38);
                } else {
                  doc.setFont("helvetica", "normal");
                  doc.setTextColor(82, 82, 91);
                }
              }

              doc.setFontSize(7.5);
              doc.text(line, colX + 2.5, lineY);
              lineY += 4;
            });

            colX += colWidths[colIdx];
          });

          currentY += rowHeight;
        });
      }

      // Add footer to all pages
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(113, 113, 122);
        doc.text("iB - HSG Global Internal Bridge", 148.5, 205, { align: "center" });
      }

      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
    }
  };

  // Printing helpers
  const formatPrintDate = (dateVal: Date | number) => {
    const d = new Date(dateVal);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getPrintDayName = (dateVal: Date) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dateVal.getDay()];
  };

  const getCampaignTitle = (campaignId: string) => {
    const campaign = campaigns.find(c => String(c.ID) === String(campaignId));
    return campaign ? campaign["Campaign Title"] : "Campaign Schedule";
  };

  // 1. Master Calendar Cells
  const printMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const daysInPrintMonth = React.useMemo(() => {
    return new Date(printYear, printMonth + 1, 0).getDate();
  }, [printYear, printMonth]);

  const firstDayPrintIndex = React.useMemo(() => {
    return new Date(printYear, printMonth, 1).getDay();
  }, [printYear, printMonth]);

  const printCells = React.useMemo(() => {
    const printBlanksCount = firstDayPrintIndex === 0 ? 6 : firstDayPrintIndex - 1;
    const printBlanks = Array(printBlanksCount).fill(null);
    const printDays = Array.from({ length: daysInPrintMonth }, (_, i) => i + 1);
    return [...printBlanks, ...printDays];
  }, [firstDayPrintIndex, daysInPrintMonth]);

  // 2. Campaign Schedule print data
  const campaignPrintData = React.useMemo(() => {
    if (selectedPrintLayout !== "campaign-schedule" || !printCampaignId) {
      return { reportDates: [], promoterChunks: [], campaignSchedules: [] };
    }

    const startMs = new Date(printStartDate + "T00:00:00").getTime();
    const endMs = new Date(printEndDate + "T23:59:59").getTime();

    const reportDates: Date[] = [];
    let tempDate = new Date(printStartDate + "T00:00:00");
    const maxEnd = new Date(printEndDate + "T23:59:59");
    while (tempDate <= maxEnd) {
      reportDates.push(new Date(tempDate));
      tempDate.setDate(tempDate.getDate() + 1);
    }

    const campaignSchedules = schedules.filter(s => 
      String(s["Campaign ID"]) === String(printCampaignId) &&
      s.Date >= startMs && s.Date <= endMs
    );
    const activePromoterIds = Array.from(new Set(campaignSchedules.map(s => String(s["Promoter ID"]))));
    const activeCampPromoters = promoters.filter(p => activePromoterIds.includes(String(p.ID)) && !(p.Archived && (String(p.Archived) === "1" || String(p.Archived) === "true")));

    const promoterChunks: any[][] = [];
    if (activeCampPromoters.length === 0) {
      promoterChunks.push([]);
    } else {
      for (let i = 0; i < activeCampPromoters.length; i += 4) {
        promoterChunks.push(activeCampPromoters.slice(i, i + 4));
      }
    }

    return { reportDates, promoterChunks, campaignSchedules };
  }, [selectedPrintLayout, printCampaignId, printStartDate, printEndDate, schedules, promoters]);

  // 3. Promoter Schedule print data
  const promoterPrintData = React.useMemo(() => {
    if (selectedPrintLayout !== "promoter-schedule" || !printPromoterId) {
      return [];
    }

    const startMs = new Date(printStartDate + "T00:00:00").getTime();
    const endMs = new Date(printEndDate + "T23:59:59").getTime();

    const promoterSchedules = schedules.filter(s => 
      String(s["Promoter ID"]) === String(printPromoterId) &&
      s.Date >= startMs && s.Date <= endMs
    );
    const sorted = [...promoterSchedules];
    sorted.sort((a, b) => a.Date - b.Date);
    return sorted;
  }, [selectedPrintLayout, printPromoterId, printStartDate, printEndDate, schedules]);

  // Calculate visible promoter columns (Only those assigned to this campaign + manually added)
  const visiblePromoters = React.useMemo(() => {
    if (selectedCampaignId === "") return [];

    const assignedSet = new Set<string>();

    schedulesBackup
      .filter(s => String(s["Campaign ID"]) === String(selectedCampaignId))
      .forEach(s => assignedSet.add(String(s["Promoter ID"])));

    schedules
      .filter(s => String(s["Campaign ID"]) === String(selectedCampaignId))
      .forEach(s => assignedSet.add(String(s["Promoter ID"])));

    manuallyAddedPromoterIds.forEach(id => assignedSet.add(id));

    return promoters.filter(p => 
      assignedSet.has(String(p.ID)) && 
      !hiddenPromoterIds.includes(String(p.ID)) &&
      !(p.Archived && (String(p.Archived) === "1" || String(p.Archived) === "true"))
    );
  }, [promoters, schedules, schedulesBackup, selectedCampaignId, manuallyAddedPromoterIds, hiddenPromoterIds]);

  const handleShowPromoter = (id: any) => {
    setManuallyAddedPromoterIds(prev => [...prev, String(id)]);
    setHiddenPromoterIds(prev => prev.filter(hid => hid !== String(id)));
    setShowAddColDropdown(false);
  };

  const handleHidePromoter = (id: any) => {
    setHiddenPromoterIds(prev => [...prev, String(id)]);
    setManuallyAddedPromoterIds(prev => prev.filter(mid => mid !== String(id)));
  };

  const getCellSchedules = (date: Date, promoterId: any) => {
    const dateStr = date.toDateString();
    let filtered = schedules.filter(s => {
      const sDateStr = new Date(s.Date).toDateString();
      return sDateStr === dateStr && String(s["Promoter ID"]) === String(promoterId);
    });

    if (selectedCampaignId !== "all" && selectedCampaignId !== "") {
      filtered = filtered.filter(s => String(s["Campaign ID"]) === String(selectedCampaignId));
    }
    return filtered;
  };

  // Campaign Mode Store List Search / Filter logic
  const filteredStores = React.useMemo(() => {
    let result = [...stores];
    if (selectedRetailerFilter !== "all") {
      result = result.filter(s => {
        const retId = s["Retailers ID"] || s["Retailer ID"];
        return String(retId) === String(selectedRetailerFilter);
      });
    }
    if (storeSearch.trim()) {
      const q = storeSearch.toLowerCase();
      result = result.filter(s => 
        String(s["Display Name"] || "").toLowerCase().includes(q) ||
        String(s.Address || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [stores, storeSearch, selectedRetailerFilter]);

  const promotersColumns = React.useMemo(() => [
    { id: "actions", header: "", accessor: "actions" },
    { id: "ID", header: "ID", accessor: "ID" },
    { id: "Nickname", header: "Nickname", accessor: "Nickname" },
    { id: "FullName", header: "Full Name", accessor: "FullName" },
    { id: "Phone", header: "Phone", accessor: "Phone" },
    { id: "Email", header: "Email", accessor: "Email" },
    { id: "Paynow", header: "Paynow Account", accessor: "Paynow" }
  ], []);

  const mappedPromoters = React.useMemo(() => {
    const list = promoters.filter(p => {
      const isArchived = p.Archived && (String(p.Archived) === "1" || String(p.Archived) === "true");
      return promoterSubTab === "archive" ? isArchived : !isArchived;
    });

    return list.map(p => {
      const isArchived = p.Archived && (String(p.Archived) === "1" || String(p.Archived) === "true");

      return {
        id: p.ID,
        ID: <span className="font-bold text-zinc-900">{p.ID}</span>,
        Nickname: <span className="font-bold text-zinc-850">{p.Name || "—"}</span>,
        FullName: <span className="font-semibold text-zinc-700">{p["Full Name"] || p.FullName || "—"}</span>,
        Phone: <span className="font-semibold text-zinc-500">{p.Phone || "—"}</span>,
        Email: <span className="font-semibold text-zinc-500">{p.Email || "—"}</span>,
        Paynow: <span className="font-semibold text-zinc-500 font-mono text-[11px]">{p["Paynow Account"] || p.Paynow || "—"}</span>,
        actions: (
          <div className="flex items-center gap-1.5 w-[80px] shrink-0 select-none">
            <button
              onClick={() => {
                setEditingPromoterId(p.ID);
                setPromoterId(p.ID);
                setPromoterName(p.Name ? String(p.Name) : "");
                setPromoterFullName(p["Full Name"] ? String(p["Full Name"]) : (p.FullName ? String(p.FullName) : ""));
                setPromoterPhone(p.Phone ? String(p.Phone) : "");
                setPromoterEmail(p.Email ? String(p.Email) : "");
                setPromoterPaynow(p["Paynow Account"] ? String(p["Paynow Account"]) : (p.Paynow ? String(p.Paynow) : ""));
                setPromoterPin(p.PIN ? String(p.PIN) : (p.Pin ? String(p.Pin) : ""));
                setIsCreatingPromoter(true);
              }}
              className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-655 hover:text-zinc-955 transition-colors cursor-pointer flex items-center justify-center"
              title="Edit Promoter"
            >
              <Pencil size={12} />
            </button>

            {isArchived ? (
              <>
                <button
                  type="button"
                  onClick={() => handleTogglePromoterArchive(p.ID, false)}
                  className="p-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0B57D0] hover:text-[#0842A0] transition-colors cursor-pointer flex items-center justify-center"
                  title="Revoke Archive"
                >
                  <Undo size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePromoter(p.ID)}
                  className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-655 hover:text-red-800 transition-colors cursor-pointer flex items-center justify-center"
                  title="Delete Permanently"
                >
                  <Trash2 size={12} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleTogglePromoterArchive(p.ID, true)}
                className="p-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 hover:text-amber-900 transition-colors cursor-pointer flex items-center justify-center"
                title="Archive Promoter"
              >
                <Archive size={12} />
              </button>
            )}
          </div>
        )
      };
    });
  }, [promoters, promoterSubTab]);

  const payoutColumns = React.useMemo(() => [
    { id: "actions", header: "", accessor: "actions" },
    { id: "PromoterName", header: "Promoter Name", accessor: "PromoterName" },
    { id: "RangeDate", header: "Range Date Payout", accessor: "RangeDate" },
    { id: "TotalPayout", header: "Total Payout", accessor: "TotalPayout" },
    { id: "Status", header: "Status", accessor: "Status" },
    { id: "DatePayout", header: "Date Payout", accessor: "DatePayout" },
    { id: "Reference", header: "Reference", accessor: "Reference" }
  ], []);

  const mappedPayouts = React.useMemo(() => {
    return payouts.map((p) => {
      const isPaid = p.Status === "Paid";
      const formatTimestamp = (ts: any): string => {
        if (!ts) return "-";
        const d = new Date(Number(ts));
        if (isNaN(d.getTime())) return "-";
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      };

      return {
        id: p.ID,
        PromoterName: <span className="font-bold text-zinc-900">{p["Promoter Name"]}</span>,
        PromoterName_raw: p["Promoter Name"] || "",
        RangeDate: (
          <span className="font-semibold text-zinc-700">
            {formatTimestamp(p["Start Date"])} - {formatTimestamp(p["End Date"])}
          </span>
        ),
        RangeDate_raw: `${formatTimestamp(p["Start Date"])} - ${formatTimestamp(p["End Date"])}`,
        TotalPayout: <span className="font-bold text-[#0B57D0]">${Number(p["Total Payout"])?.toFixed(2)}</span>,
        TotalPayout_raw: `$${Number(p["Total Payout"])?.toFixed(2)}`,
        Status: (
          <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
            isPaid ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"
          )}>
            {p.Status || "Draft"}
          </span>
        ),
        Status_raw: p.Status || "Draft",
        DatePayout: <span className="font-semibold text-zinc-700">{p["Payment Date"] ? formatTimestamp(p["Payment Date"]) : "-"}</span>,
        DatePayout_raw: p["Payment Date"] ? formatTimestamp(p["Payment Date"]) : "-",
        Reference: <span className="font-mono font-bold text-zinc-800">{p["Payment Reference"] || "-"}</span>,
        Reference_raw: p["Payment Reference"] || "-",
        actions: (
          <div className="flex items-center gap-1.5 shrink-0 select-none">
            {!isPaid && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPayoutId(p.ID);
                    setSelectedPayoutPromoterId(p["Promoter ID"]);
                    setPayoutStartDate(formatDateToYYYYMMDD(p["Start Date"]));
                    setPayoutEndDate(formatDateToYYYYMMDD(p["End Date"]));
                    setPayoutHourlyRate(p["Hourly Rate"].toString());
                    try {
                      setEditedPayoutRows(JSON.parse(p["Payout Details"]));
                    } catch (err) {
                      setEditedPayoutRows([]);
                    }
                    setPayoutFetchError(null);
                    setIsCreatePayoutOpen(true);
                  }}
                  className="p-1 rounded hover:bg-zinc-100 border border-zinc-200 text-zinc-650 hover:text-zinc-900 transition-colors cursor-pointer flex items-center justify-center"
                  title="Edit Draft"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePayout(p.ID)}
                  className="p-1 rounded hover:bg-red-50 border border-zinc-200 text-red-600 hover:text-red-850 transition-colors cursor-pointer flex items-center justify-center"
                  title="Delete Draft"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => handlePrintPayoutPDF(p)}
              className="px-2 py-1 rounded hover:bg-zinc-100 border border-zinc-200 text-[#0B57D0] hover:text-[#0842A0] font-semibold text-[10px] transition-colors cursor-pointer flex items-center justify-center gap-1"
              title="Print Supporting Document"
            >
              <Printer size={12} />
              Print
            </button>

            {!isPaid && (
              <button
                type="button"
                onClick={() => {
                  setPaymentModalPayout(p);
                  setPaymentRef("");
                  setPaymentDate(new Date().toISOString().split("T")[0]);
                  setPaymentReceiptFile(null);
                }}
                className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                title="Mark as Paid"
              >
                <CreditCard size={10} />
                Paid
              </button>
            )}
          </div>
        )
      };
    });
  }, [payouts, promoters]);

  return (
    <div className="flex flex-col gap-4 font-primary text-zinc-900 h-full overflow-hidden relative min-w-0">
      
      {/* Universal Tab Menu */}
      <NavigationTabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(tabId) => setActiveTab(tabId)}
      />

      {/* Tab Contents */}
      <div className="w-full flex-grow flex-shrink min-h-0 overflow-hidden">
        
        {/* Calendar & Scheduler Tab */}
        {activeTab === "calendar" && (
          <div className="w-full h-full flex flex-col gap-2 overflow-hidden relative">
            
            {/* Mode Selector Toggle Buttons & Edit Actions */}
            {/* Calendar Mode contents */}
            {calendarMode === "monthly" ? (
              /* MONTHLY MODE (Original Calendar) */
              <div className="w-full h-full flex flex-col xl:flex-row gap-4 overflow-y-auto select-none flex-grow pr-1.5 custom-scrollbar">
                
                {/* Left Box (70%): Calendar monthly view */}
                <div className="flex-[70] bg-white border border-zinc-200 rounded p-4 flex flex-col justify-between overflow-hidden shadow-sm h-full min-h-[580px] xl:min-w-[800px] w-full">
                  <div className="flex flex-col flex-grow overflow-hidden">
                    
                    {/* Unified Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 mb-3 border-b border-zinc-150 shrink-0 flex-wrap">
                      {/* Left: Mode toggles and Edit Actions */}
                      <div className="flex items-center gap-3 select-none flex-wrap whitespace-nowrap">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarMode("monthly");
                              setSelectedCampaignId("all");
                            }}
                            className="h-[26px] px-2.5 text-[11px] font-bold rounded border transition-all cursor-pointer bg-[#0B57D0] text-white border-transparent shadow-xs flex items-center justify-center whitespace-nowrap"
                          >
                            Calendar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarMode("campaign");
                              setIsStoreLibraryCollapsed(true);
                              setSelectedCampaignId("");
                            }}
                            className="h-[26px] px-2.5 text-[11px] font-bold rounded border transition-all cursor-pointer bg-white text-zinc-655 border-zinc-200 hover:bg-zinc-50 flex items-center justify-center whitespace-nowrap"
                          >
                            Schedule
                          </button>
                        </div>

                        {isEditAuthorized && (
                          <div className="flex items-center border-l border-zinc-200 pl-4 h-5">
                            {!isEditMode ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditMode(true);
                                  setSchedulesBackup([...schedules]);
                                  setHistory([[...schedules]]);
                                  setHistoryIndex(0);
                                  localStorage.setItem("ib_promoter_schedules_draft", JSON.stringify(schedules));
                                  localStorage.setItem("ib_promoter_schedules_backup", JSON.stringify(schedules));
                                }}
                                className="h-[26px] px-2.5 text-[11px] font-bold bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded transition-all cursor-pointer flex items-center gap-1 shadow-sm justify-center whitespace-nowrap"
                              >
                                <Pencil size={11} className="stroke-[2.5]" />
                                Edit Mode
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left duration-200">
                                <button
                                  type="button"
                                  onClick={handleSaveAndDeploy}
                                  className="h-[26px] px-2.5 text-[11px] font-bold bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded shadow-sm transition-all cursor-pointer flex items-center gap-1 justify-center whitespace-nowrap"
                                >
                                  <Check size={11} className="stroke-[2.5]" />
                                  Exit Edit Mode
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSchedules(schedulesBackup);
                                    setIsEditMode(false);
                                    setHistory([]);
                                    setHistoryIndex(-1);
                                    localStorage.removeItem("ib_promoter_schedules_draft");
                                    localStorage.removeItem("ib_promoter_schedules_backup");
                                    showToast("Draft changes discarded.", "info");
                                  }}
                                  className="h-[26px] px-2.5 text-[11px] font-bold bg-white text-zinc-555 border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-850 rounded transition-all cursor-pointer flex items-center justify-center whitespace-nowrap"
                                >
                                  Discard
                                </button>
                                {historyIndex > 0 && (
                                  <button
                                    type="button"
                                    onClick={handleUndo}
                                    className="h-[26px] w-[26px] bg-white border border-zinc-200 hover:bg-zinc-50 rounded text-zinc-650 hover:text-zinc-955 transition-all cursor-pointer flex items-center justify-center shadow-xs"
                                    title="Undo"
                                  >
                                    <Undo size={11} className="stroke-[2.5]" />
                                  </button>
                                )}
                                {historyIndex < history.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={handleRedo}
                                    className="h-[26px] w-[26px] bg-white border border-zinc-200 hover:bg-zinc-50 rounded text-zinc-650 hover:text-zinc-955 transition-all cursor-pointer flex items-center justify-center shadow-xs"
                                    title="Redo"
                                  >
                                    <Redo size={11} className="stroke-[2.5]" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Select Campaign Dropdown */}
                        <div className="flex items-center gap-1.5 md:border-l md:border-zinc-200 md:pl-3 h-5">
                          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Select Campaign:</span>
                          <select
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                            className="h-[26px] px-2 py-0 bg-white border border-zinc-200 rounded text-[11px] font-bold text-zinc-800 outline-none focus:border-zinc-955 cursor-pointer whitespace-nowrap"
                          >
                            <option value="">-- Choose Campaign --</option>
                            <option value="all">All Campaigns</option>
                            {campaigns
                              .filter(c => !c.Archived || (String(c.Archived) !== "1" && String(c.Archived) !== "true"))
                              .map((c) => (
                                <option key={c.ID} value={c.ID}>
                                  {c["Campaign Title"]}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                      
                      {/* Right: Month navigation switcher */}
                      <div className="h-[26px] flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded px-1 select-none whitespace-nowrap">
                        <button
                          onClick={handlePrevMonth}
                          className="p-0.5 rounded hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer flex items-center justify-center"
                          title="Previous Month"
                        >
                          <ChevronLeft size={13} className="stroke-[2.5]" />
                        </button>
                        <span className="text-[11px] font-bold font-mono text-zinc-800 uppercase px-1.5 w-[90px] text-center select-none leading-none whitespace-nowrap">
                          {currentDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </span>
                        <button
                          onClick={handleNextMonth}
                          className="p-0.5 rounded hover:bg-zinc-200 text-zinc-655 transition-colors cursor-pointer flex items-center justify-center"
                          title="Next Month"
                        >
                          <ChevronRight size={13} className="stroke-[2.5]" />
                        </button>
                      </div>
                    </div>

                    {/* Weekday headers starting Monday */}
                    <div className="grid grid-cols-7 gap-1 mt-3 text-center border-b border-zinc-150 pb-2 shrink-0">
                      {weekdays.map((day) => (
                        <span 
                          key={day} 
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider text-zinc-400",
                            (day === "Sat" || day === "Sun") ? "text-amber-500/80" : ""
                          )}
                        >
                          {day}
                        </span>
                      ))}
                    </div>

                    {/* Monthly cells */}
                    <div className="grid grid-cols-7 gap-1.5 mt-2 flex-grow overflow-y-auto custom-scrollbar px-1 py-1 pr-1.5">
                      {allCells.map((cell, idx) => {
                        if (cell === null) {
                          return <div key={`empty-${idx}`} className="bg-zinc-50/20 border border-zinc-100/40 min-h-[65px] rounded-md" />;
                        }

                        const dayEvents = getEventsForDay(cell);
                        const isSelected = selectedDay === cell;

                        return (
                          <div
                            key={`day-${cell}`}
                            onClick={() => {
                              setSelectedDay(cell);
                              setSelectedShiftId(null);
                            }}
                            className={cn(
                              "border p-1.5 min-h-[65px] flex flex-col justify-between hover:bg-zinc-50/70 transition-all cursor-pointer rounded-md text-left relative",
                              isToday(cell) ? "border-[#0B57D0] bg-blue-50/10" : "border-zinc-200 bg-white",
                              isSelected ? "ring-2 ring-[#0B57D0]/60 bg-[#0B57D0]/5" : ""
                            )}
                          >
                            <span className={cn(
                              "text-xs font-bold leading-none",
                              isToday(cell) ? "text-[#0B57D0] font-bold" : "text-zinc-650"
                            )}>
                              {cell}
                            </span>
                            
                            {isChecklistPendingForDay(cell) && (
                              <div 
                                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" 
                                title="Checklist Deployment Pending"
                              />
                            )}
                            
                            {dayEvents.length > 0 && (
                              <div className="flex flex-col gap-0.5 mt-1 overflow-hidden">
                                {dayEvents.slice(0, 2).map((e) => (
                                  <div 
                                    key={e.ID} 
                                    className="text-[8.5px] font-bold px-1 py-0.5 rounded bg-[#0B57D0]/10 text-[#0B57D0] flex flex-col gap-0.5 text-left mb-0.5"
                                    title={`${e["Promoter Name"]} @ ${getFormattedStoreName(e["Store ID"], e["Store Name"])} - ${e["Campaign Title"]}`}
                                  >
                                    <div className="truncate leading-none">{e["Promoter Name"]} @ {getFormattedStoreName(e["Store ID"], e["Store Name"])}</div>
                                    <div className="text-[7.5px] text-[#0B57D0]/80 font-semibold truncate leading-none">{e["Campaign Title"]}</div>
                                  </div>
                                ))}
                                {dayEvents.length > 2 && (
                                  <span className="text-[7.5px] font-bold text-zinc-400 pl-1 leading-none">
                                    +{dayEvents.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                  </div>
                <div className="flex-[30] bg-white border border-zinc-200 rounded p-5 flex flex-col overflow-hidden shadow-sm h-full min-h-[400px] xl:min-w-[320px] w-full">
                  {/* Header */}
                  <div className="flex flex-col pb-3 border-b border-zinc-150 shrink-0">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-955">
                      Checklist Deployment
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold font-mono mt-0.5">
                      {String(selectedDay).padStart(2, "0")}/{String(month + 1).padStart(2, "0")}/{year}
                    </p>
                  </div>

                  {/* Body Content */}
                  {selectedDayShifts.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center font-primary">
                      <div className="py-12 text-center text-zinc-400 font-bold select-none border border-dashed border-zinc-200 rounded p-4 bg-zinc-50/20 w-full">
                        <CalendarIcon size={20} className="stroke-1 mx-auto mb-2 opacity-50 text-zinc-450" />
                        <span className="block text-[10.5px]">No shifts assigned today.</span>
                        <span className="block text-[8.5px] font-medium leading-normal px-4 mt-1 text-zinc-400">
                          Use Schedule mode to assign promoters to stores first.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow overflow-y-auto custom-scrollbar mt-4 pr-1 space-y-5">
                      {selectedDayShifts.map((s) => {
                        // Parse custom tasks
                        let customTasks: any[] = [];
                        if (s["Custom Tasks"]) {
                          try {
                            customTasks = JSON.parse(s["Custom Tasks"]);
                          } catch (e) {
                            customTasks = [];
                          }
                        }

                        // Check if date has passed (strictly past date)
                        const shiftDate = new Date(s.Date);
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        shiftDate.setHours(0,0,0,0);
                        const isPastDate = shiftDate.getTime() < today.getTime();

                        // Task completions count
                        const customTasksCount = customTasks.length;
                        const customDoneCount = customTasks.filter((t: any) => !!t.answer).length;
                        const permDone = s["Permission By"] ? 1 : 0;
                        const stockDone = s["Stock Checked"] ? 1 : 0;
                        const actualDone = (isPastDate && s["Actual Start"] && s["Actual End"]) ? 1 : 0;

                        const totalCount = 2 + customTasksCount + (isPastDate ? 1 : 0);
                        const doneCount = permDone + stockDone + customDoneCount + actualDone;

                        const taskInputText = customTaskTexts[s.ID] || "";
                        const isScheduleExpanded = expandedScheduleId === s.ID;

                        return (
                          <div key={s.ID} className="flex flex-col select-none font-primary transition-all duration-200">
                            {/* Details Schedule Card Header */}
                            <div 
                              onClick={() => setExpandedScheduleId(isScheduleExpanded ? null : s.ID)}
                              className={cn(
                                "bg-zinc-50 border border-zinc-200 p-3 shrink-0 transition-all cursor-pointer hover:bg-zinc-100/50 flex flex-col gap-2 shadow-xs",
                                isScheduleExpanded ? "rounded-t border-b-0" : "rounded"
                              )}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="min-w-0 flex-grow">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="text-[11px] font-bold uppercase text-zinc-905 tracking-wider truncate">
                                      {s["Promoter Name"]}
                                    </h4>
                                    {isScheduleExpanded ? (
                                      <ChevronUp size={11} className="text-zinc-500 stroke-[3.5] shrink-0" />
                                    ) : (
                                      <ChevronDown size={11} className="text-zinc-500 stroke-[3.5] shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[9.5px] text-zinc-900 font-bold truncate leading-tight mt-0.5">
                                    {s["Campaign Title"]}
                                  </p>
                                  <p className="text-[9.5px] text-zinc-500 font-bold truncate leading-tight mt-0.5">
                                    {getFormattedStoreName(s["Store ID"], s["Store Name"])}
                                  </p>
                                </div>
                                
                                <div className="flex flex-col items-end gap-1 shrink-0 text-[9px] font-bold font-mono text-zinc-400">
                                  <div className="flex items-center gap-1.5">
                                    <Clock size={10} className="stroke-[2.5]" />
                                    <span>{formatTimeDisplay(s["Shift Start"])} - {formatTimeDisplay(s["Shift End"])}</span>
                                  </div>
                                  {/* Progress badge */}
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded font-bold font-primary text-[8.5px] border transition-colors",
                                    doneCount === totalCount
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  )}>
                                    {doneCount}/{totalCount} Done
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Tasks List Container: scrollable, max-height 500px */}
                            {isScheduleExpanded && (
                              <div className="border border-zinc-200 rounded-b p-3 bg-white max-h-[500px] overflow-y-auto custom-scrollbar space-y-3 animate-in slide-in-from-top-1 duration-150">
                              
                              {/* Task 1: Store Permission */}
                              {(() => {
                                const isDone = !!s["Permission By"];
                                const isExpanded = expandedCardId === `${s.ID}_permission`;
                                const canClick = isEditMode || isDone;
                                return (
                                  <div 
                                    onClick={canClick ? () => setExpandedCardId(isExpanded ? null : `${s.ID}_permission`) : undefined}
                                    className={cn(
                                      "bg-white border rounded p-2.5 shadow-xs flex flex-col gap-2 transition-all select-none",
                                      canClick ? "cursor-pointer hover:bg-zinc-50/50" : "cursor-default",
                                      isExpanded ? "border-[#0B57D0] ring-1 ring-[#0B57D0]/20" : "border-zinc-200"
                                    )}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className="mt-0.5 shrink-0 select-none">
                                        {isDone ? (
                                          <div className="w-3.5 h-3.5 rounded-full bg-[#0B57D0] flex items-center justify-center text-white">
                                            <Check size={8} className="stroke-[3]" />
                                          </div>
                                        ) : (
                                          <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-300 flex items-center justify-center text-transparent" />
                                        )}
                                      </div>
                                      <div className="flex-grow min-w-0">
                                        <div className="font-bold text-zinc-800 leading-snug text-[10.5px]">Get permission from the store</div>
                                        <div className="mt-1 text-[9.5px] font-semibold">
                                          {isDone ? (
                                            <span className="text-zinc-500 leading-normal">
                                              Authorized by: <span className="text-[#0B57D0] font-bold">{s["Permission By"]}</span>
                                            </span>
                                          ) : (
                                            <span className="text-amber-500 font-bold uppercase tracking-wider text-[8px]">Pending</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div className="border-t border-zinc-100 pt-2 mt-0.5 flex flex-col gap-2 animate-in slide-in-from-top-1 duration-150">
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                                            Authorized By (Store Manager Name)
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="Enter manager name..."
                                            value={s["Permission By"] || ""}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                              setSchedules(prev => prev.map(item => item.ID === s.ID ? { ...item, "Permission By": e.target.value } : item));
                                            }}
                                            onBlur={(e) => {
                                              handleUpdateShiftField(s.ID, "Permission By", e.target.value.trim());
                                            }}
                                            disabled={!isEditMode}
                                            className="w-full px-2 py-1 border border-zinc-200 rounded text-xs font-semibold outline-none focus:border-zinc-555 bg-white shadow-xs disabled:bg-zinc-50 disabled:cursor-not-allowed"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Task 2: Check Availability Stock */}
                              {(() => {
                                const isDone = !!s["Stock Checked"];
                                const isExpanded = expandedCardId === `${s.ID}_stock`;
                                const canClick = isEditMode || isDone;
                                return (
                                  <div 
                                    onClick={canClick ? () => setExpandedCardId(isExpanded ? null : `${s.ID}_stock`) : undefined}
                                    className={cn(
                                      "bg-white border rounded p-2.5 shadow-xs flex flex-col gap-2 transition-all select-none",
                                      canClick ? "cursor-pointer hover:bg-zinc-50/50" : "cursor-default",
                                      isExpanded ? "border-[#0B57D0] ring-1 ring-[#0B57D0]/20" : "border-zinc-200"
                                    )}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className="mt-0.5 shrink-0 select-none">
                                        {isDone ? (
                                          <div className="w-3.5 h-3.5 rounded-full bg-[#0B57D0] flex items-center justify-center text-white">
                                            <Check size={8} className="stroke-[3]" />
                                          </div>
                                        ) : (
                                          <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-300 flex items-center justify-center text-transparent" />
                                        )}
                                      </div>
                                      <div className="flex-grow min-w-0">
                                        <div className="font-bold text-zinc-805 leading-snug text-[10.5px]">Check availability stock at store</div>
                                        <div className="mt-1 text-[9.5px] font-semibold">
                                          {isDone ? (
                                            <span className="text-zinc-555 leading-normal">
                                              Status: <span className="text-[#0B57D0] font-bold">{s["Stock Checked"]}</span>
                                            </span>
                                          ) : (
                                            <span className="text-amber-500 font-bold uppercase tracking-wider text-[8px]">Pending</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div className="border-t border-zinc-100 pt-2 mt-0.5 flex flex-col gap-2 animate-in slide-in-from-top-1 duration-150">
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                                            Stock Remarks / Findings
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="e.g. Fully stocked / Out of Pak Man 1kg..."
                                            value={s["Stock Checked"] || ""}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                              setSchedules(prev => prev.map(item => item.ID === s.ID ? { ...item, "Stock Checked": e.target.value } : item));
                                            }}
                                            onBlur={(e) => {
                                              handleUpdateShiftField(s.ID, "Stock Checked", e.target.value.trim());
                                            }}
                                            disabled={!isEditMode}
                                            className="w-full px-2 py-1 border border-zinc-200 rounded text-xs font-semibold outline-none focus:border-zinc-555 bg-white shadow-xs disabled:bg-zinc-50 disabled:cursor-not-allowed"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Task 3: Custom checklist items */}
                              {customTasks.map((t) => {
                                const isDone = !!t.answer;
                                const isExpanded = expandedCardId === `${s.ID}_${t.id}`;
                                const canClick = isEditMode || isDone;
                                return (
                                  <div 
                                    key={t.id}
                                    onClick={canClick ? () => setExpandedCardId(isExpanded ? null : `${s.ID}_${t.id}`) : undefined}
                                    className={cn(
                                      "bg-white border rounded p-2.5 shadow-xs flex flex-col gap-2 transition-all select-none",
                                      canClick ? "cursor-pointer hover:bg-zinc-50/50" : "cursor-default",
                                      isExpanded ? "border-[#0B57D0] ring-1 ring-[#0B57D0]/20" : "border-zinc-200"
                                    )}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className="mt-0.5 shrink-0 select-none">
                                        {isDone ? (
                                          <div className="w-3.5 h-3.5 rounded-full bg-[#0B57D0] flex items-center justify-center text-white">
                                            <Check size={8} className="stroke-[3]" />
                                          </div>
                                        ) : (
                                          <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-300 flex items-center justify-center text-transparent" />
                                        )}
                                      </div>
                                      <div className="flex-grow min-w-0">
                                        <div className="font-bold text-zinc-805 leading-snug text-[10.5px]">{t.text}</div>
                                        <div className="mt-1 text-[9.5px] font-semibold">
                                          {isDone ? (
                                            <span className="text-zinc-555 leading-normal">
                                              Answer: <span className="text-[#0B57D0] font-bold">{t.answer}</span>
                                            </span>
                                          ) : (
                                            <span className="text-amber-500 font-bold uppercase tracking-wider text-[8px]">Pending</span>
                                          )}
                                        </div>
                                      </div>
                                      {isEditMode && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCustomTask(s.ID, t.id);
                                          }}
                                          className="text-zinc-400 hover:text-red-500 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                                          title="Delete custom task"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>

                                    {isExpanded && (
                                      <div className="border-t border-zinc-100 pt-2 mt-0.5 flex flex-col gap-2 animate-in slide-in-from-top-1 duration-150">
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                                            Task Answer / Result
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="Type task answer/status..."
                                            value={t.answer || ""}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => {
                                              const updatedCustomTasks = customTasks.map((ct: any) =>
                                                ct.id === t.id ? { ...ct, answer: e.target.value } : ct
                                              );
                                              setSchedules(prev => prev.map(item => item.ID === s.ID ? { ...item, "Custom Tasks": JSON.stringify(updatedCustomTasks) } : item));
                                            }}
                                            onBlur={(e) => {
                                              const updatedCustomTasks = customTasks.map((ct: any) =>
                                                ct.id === t.id ? { ...ct, answer: e.target.value.trim() } : ct
                                              );
                                              handleUpdateShiftField(s.ID, "Custom Tasks", JSON.stringify(updatedCustomTasks));
                                            }}
                                            disabled={!isEditMode}
                                            className="w-full px-2 py-1 border border-zinc-200 rounded text-xs font-semibold outline-none focus:border-zinc-555 bg-white shadow-xs disabled:bg-zinc-50 disabled:cursor-not-allowed"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Task 4: Actual Time Log */}
                              {isPastDate && (() => {
                                const isDone = (!!s["Actual Start"] && !!s["Actual End"]) || s["Actual Start"] === "Absent";
                                const isExpanded = expandedCardId === `${s.ID}_actual_time`;
                                const isAbsent = s["Actual Start"] === "Absent";
                                const canClick = isEditMode || isDone;
                                
                                const timeAnswer = isAbsent ? (
                                  <span className="text-red-600 font-bold">Absent (Reason: {s["Actual End"] || "Not specified"})</span>
                                ) : (
                                  <span className="text-[#0B57D0] font-bold">{formatTimeDisplay(s["Actual Start"])} - {formatTimeDisplay(s["Actual End"])}</span>
                                );
                                
                                return (
                                  <div 
                                    onClick={canClick ? () => setExpandedCardId(isExpanded ? null : `${s.ID}_actual_time`) : undefined}
                                    className={cn(
                                      "bg-white border rounded p-2.5 shadow-xs flex flex-col gap-2 transition-all select-none",
                                      canClick ? "cursor-pointer hover:bg-zinc-50/50" : "cursor-default",
                                      isExpanded ? "border-[#0B57D0] ring-1 ring-[#0B57D0]/20" : "border-zinc-200"
                                    )}
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className="mt-0.5 shrink-0 select-none">
                                        {isDone ? (
                                          <div className="w-3.5 h-3.5 rounded-full bg-[#0B57D0] flex items-center justify-center text-white">
                                            <Check size={8} className="stroke-[3]" />
                                          </div>
                                        ) : (
                                          <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-300 flex items-center justify-center text-transparent" />
                                        )}
                                      </div>
                                      <div className="flex-grow min-w-0">
                                        <div className="font-bold text-zinc-855 leading-snug text-[10.5px]">Confirm promoter actual shift times</div>
                                        <div className="mt-1 text-[9.5px] font-semibold">
                                          {isDone ? (
                                            <span className="text-zinc-550 leading-normal font-primary">
                                              Actual Time: {timeAnswer}
                                            </span>
                                          ) : (
                                            <span className="text-amber-500 font-bold uppercase tracking-wider text-[8px]">Pending</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
 
                                    {isExpanded && (
                                      <div className="border-t border-zinc-100 pt-2 mt-0.5 flex flex-col gap-2 animate-in slide-in-from-top-1 duration-150">
                                        {isAbsent ? (
                                          <div className="flex flex-col gap-2">
                                            <div className="flex flex-col gap-1">
                                              <label className="text-[9px] font-bold text-red-500 uppercase tracking-wider pl-0.5">
                                                Reason for Absence (Required)
                                              </label>
                                              <input
                                                type="text"
                                                placeholder="e.g. Medical Leave, Emergency, No Show..."
                                                value={s["Actual End"] || ""}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => {
                                                  setSchedules(prev => prev.map(item => item.ID === s.ID ? { ...item, "Actual End": e.target.value } : item));
                                                }}
                                                onBlur={(e) => {
                                                  handleUpdateShiftField(s.ID, "Actual End", e.target.value.trim());
                                                }}
                                                disabled={!isEditMode}
                                                className="w-full px-2 py-1 bg-white border border-red-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-red-500 transition-all shadow-xs disabled:bg-red-50/50 disabled:cursor-not-allowed"
                                              />
                                            </div>
                                            {isEditMode && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const newSchedules = schedules.map(item => 
                                                    item.ID === s.ID ? { ...item, "Actual Start": "", "Actual End": "" } : item
                                                  );
                                                  setSchedules(newSchedules);
                                                  pushHistory(newSchedules);
                                                }}
                                                className="text-[10px] font-bold text-[#0B57D0] hover:underline cursor-pointer text-left pl-0.5"
                                              >
                                                ← Reset to shift start/end times
                                              </button>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="flex flex-col gap-2">
                                            <div className="flex gap-2 items-end">
                                              <div className="flex flex-col gap-1 flex-1">
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                                                  Actual Start Time
                                                </label>
                                                <input
                                                  type="time"
                                                  value={s["Actual Start"] || ""}
                                                  onClick={(e) => e.stopPropagation()}
                                                  onChange={(e) => {
                                                    handleUpdateShiftField(s.ID, "Actual Start", e.target.value);
                                                  }}
                                                  disabled={!isEditMode}
                                                  className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-555 transition-all cursor-pointer shadow-xs disabled:bg-zinc-50 disabled:cursor-not-allowed"
                                                />
                                              </div>
                                              
                                              <div className="flex flex-col gap-1 flex-1">
                                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                                                  Actual End Time
                                                </label>
                                                <input
                                                  type="time"
                                                  value={s["Actual End"] || ""}
                                                  onClick={(e) => e.stopPropagation()}
                                                  onChange={(e) => {
                                                    handleUpdateShiftField(s.ID, "Actual End", e.target.value);
                                                  }}
                                                  disabled={!isEditMode}
                                                  className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-555 transition-all cursor-pointer shadow-xs disabled:bg-zinc-50 disabled:cursor-not-allowed"
                                                />
                                              </div>
 
                                              {isEditMode && (
                                                <div className="flex flex-col gap-1">
                                                  <span className="text-[9px] invisible select-none font-bold uppercase pl-0.5">
                                                    Spacer
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const newSchedules = schedules.map(item => 
                                                        item.ID === s.ID ? { ...item, "Actual Start": "Absent", "Actual End": "" } : item
                                                      );
                                                      setSchedules(newSchedules);
                                                      pushHistory(newSchedules);
                                                    }}
                                                    className="py-1 px-3 border border-red-200 hover:bg-red-50 text-red-650 rounded text-xs font-bold transition-colors cursor-pointer text-center h-[26px] flex items-center justify-center"
                                                  >
                                                    Absent
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Custom task creation input */}
                              {isEditMode && (
                                <div className="border-t border-zinc-100 pt-3 space-y-2">
                                  <span className="text-[9px] font-bold text-[#0B57D0] uppercase tracking-widest block pl-0.5">
                                    Add Custom Task
                                  </span>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={taskInputText}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        setCustomTaskTexts(prev => ({ ...prev, [s.ID]: e.target.value }));
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.stopPropagation();
                                          handleAddCustomTask(s.ID, taskInputText);
                                        }
                                      }}
                                      placeholder="Add custom task..."
                                      className="flex-grow px-2.5 py-1.5 border border-zinc-200 rounded outline-none focus:border-zinc-555 bg-white shadow-xs text-xs font-semibold"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddCustomTask(s.ID, taskInputText);
                                      }}
                                      className="px-2.5 py-1.5 bg-zinc-955 hover:bg-zinc-800 text-white rounded font-bold shadow-xs transition-colors cursor-pointer text-xs"
                                    >
                                      Add
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  )}

                  </div>
                </div>

            ) : (
              /* CAMPAIGN MODE / WEEK PLANNED GRID WITH COLLAPSIBLE STORES DRAWER */
              <div className="w-full h-full flex flex-row gap-4 overflow-hidden select-none flex-grow">
                
                {/* Left Panel: Weekly day-by-promoter layout grid */}
                <div className={cn(
                  "bg-white border border-zinc-200 rounded p-4 flex flex-col justify-between overflow-hidden shadow-sm h-full font-primary transition-all duration-300",
                  (isStoreLibraryCollapsed || !isEditMode) ? "flex-[100]" : "flex-[70]"
                )}>
                  <div className="flex flex-col flex-grow overflow-hidden">
                    
                    {/* Unified Header */}
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-zinc-150 shrink-0">
                      {/* Left: Mode toggles and Edit Actions */}
                      <div className="flex items-center gap-4 select-none">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarMode("monthly");
                              setSelectedCampaignId("all");
                            }}
                            className="h-[26px] px-2.5 text-[11px] font-bold rounded border transition-all cursor-pointer bg-white text-zinc-655 border-zinc-200 hover:bg-zinc-50 flex items-center justify-center"
                          >
                            Calendar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarMode("campaign");
                              setIsStoreLibraryCollapsed(true);
                              setSelectedCampaignId("");
                            }}
                            className="h-[26px] px-2.5 text-[11px] font-bold rounded border transition-all cursor-pointer bg-[#0B57D0] text-white border-transparent shadow-xs flex items-center justify-center"
                          >
                            Schedule
                          </button>
                        </div>

                        {isEditAuthorized && (
                          <div className="flex items-center border-l border-zinc-200 pl-4 h-5">
                            {!isEditMode ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditMode(true);
                                  setSchedulesBackup([...schedules]);
                                  setHistory([[...schedules]]);
                                  setHistoryIndex(0);
                                  localStorage.setItem("ib_promoter_schedules_draft", JSON.stringify(schedules));
                                  localStorage.setItem("ib_promoter_schedules_backup", JSON.stringify(schedules));
                                }}
                                className="h-[26px] px-2.5 text-[11px] font-bold bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded transition-all cursor-pointer flex items-center gap-1 shadow-sm justify-center"
                              >
                                <Pencil size={11} className="stroke-[2.5]" />
                                Edit Mode
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left duration-200">
                                <button
                                  type="button"
                                  onClick={handleSaveAndDeploy}
                                  className="h-[26px] px-2.5 text-[11px] font-bold bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded shadow-sm transition-all cursor-pointer flex items-center gap-1 justify-center"
                                >
                                  <Check size={11} className="stroke-[2.5]" />
                                  Exit Edit Mode
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSchedules(schedulesBackup);
                                    setIsEditMode(false);
                                    setHistory([]);
                                    setHistoryIndex(-1);
                                    localStorage.removeItem("ib_promoter_schedules_draft");
                                    localStorage.removeItem("ib_promoter_schedules_backup");
                                    showToast("Draft changes discarded.", "info");
                                  }}
                                  className="h-[26px] px-2.5 text-[11px] font-bold bg-white text-zinc-555 border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-850 rounded transition-all cursor-pointer flex items-center justify-center"
                                >
                                  Discard
                                </button>
                                {historyIndex > 0 && (
                                  <button
                                    type="button"
                                    onClick={handleUndo}
                                    className="h-[26px] w-[26px] bg-white border border-zinc-200 hover:bg-zinc-50 rounded text-zinc-650 hover:text-zinc-955 transition-all cursor-pointer flex items-center justify-center shadow-xs"
                                    title="Undo"
                                  >
                                    <Undo size={11} className="stroke-[2.5]" />
                                  </button>
                                )}
                                {historyIndex < history.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={handleRedo}
                                    className="h-[26px] w-[26px] bg-white border border-zinc-200 hover:bg-zinc-50 rounded text-zinc-650 hover:text-zinc-955 transition-all cursor-pointer flex items-center justify-center shadow-xs"
                                    title="Redo"
                                  >
                                    <Redo size={11} className="stroke-[2.5]" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Select Campaign Dropdown */}
                        <div className="flex items-center gap-1.5 border-l border-zinc-200 pl-4 h-5">
                          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Select Campaign:</span>
                          <select
                            value={selectedCampaignId}
                            onChange={(e) => setSelectedCampaignId(e.target.value)}
                            className="h-[26px] px-2 py-0 bg-white border border-zinc-200 rounded text-[11px] font-bold text-zinc-800 outline-none focus:border-zinc-955 cursor-pointer"
                          >
                            <option value="">-- Choose Campaign --</option>
                            {campaigns
                              .filter(c => !c.Archived || (String(c.Archived) !== "1" && String(c.Archived) !== "true"))
                              .map((c) => (
                                <option key={c.ID} value={c.ID}>
                                  {c["Campaign Title"]}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      {/* Right: Show Stores */}
                      <div className="flex items-center gap-3 select-none">
                        {isStoreLibraryCollapsed && isEditMode && (
                          <button
                            type="button"
                            onClick={() => setIsStoreLibraryCollapsed(false)}
                            className="h-[26px] px-2.5 bg-white border border-[#0B57D0] hover:bg-[#0B57D0]/5 rounded text-[11px] font-bold text-[#0B57D0] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs justify-center"
                            title="Expand Stores Library"
                          >
                            <ChevronLeft size={12} className="stroke-[2.5]" />
                            Show Stores
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedCampaignId === "" ? (
                      <div className="flex-grow flex flex-col items-center justify-center p-12 bg-zinc-50 border border-zinc-200 border-dashed rounded text-center my-4 h-[380px]">
                        <Megaphone size={36} className="text-zinc-400 stroke-1 mb-2.5 animate-pulse" />
                        <span className="text-zinc-555 text-xs font-bold uppercase tracking-wider">Campaign Selection Required</span>
                        <p className="text-[11px] text-zinc-450 mt-1.5 max-w-xs font-semibold leading-relaxed">
                          Please select a campaign from the dropdown above to view the promoter weekly planner and drag stores to assign shifts.
                        </p>
                      </div>
                    ) : (
                      /* Planner weekly table grid */
                      <div className="flex-grow flex flex-col overflow-auto border border-zinc-200 rounded bg-white custom-scrollbar">
                        <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                          <thead>
                            <tr className="bg-zinc-50 border-b border-zinc-200">
                              {/* Date switcher in top-left cell (sticky top & left) */}
                              <th className="py-2.5 px-3 text-center border-r border-zinc-200 w-[150px] shrink-0 select-none bg-zinc-50 sticky top-0 left-0 z-30 shadow-[2px_0_5px_0_rgba(0,0,0,0.05)] border-b border-zinc-200">
                                <div className="flex gap-1 justify-center w-full">
                                  <button
                                    type="button"
                                    onClick={handlePrevWeek}
                                    className="flex-1 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 rounded text-[10px] font-bold text-[#0B57D0] hover:bg-zinc-50 transition-colors cursor-pointer shadow-xs"
                                    title="Previous Week"
                                  >
                                    Prev
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleNextWeek}
                                    className="flex-1 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 rounded text-[10px] font-bold text-[#0B57D0] hover:bg-zinc-50 transition-colors cursor-pointer shadow-xs"
                                    title="Next Week"
                                  >
                                    Next
                                  </button>
                                </div>
                              </th>
                              
                              {/* Promoter headers (sticky top) */}
                              {visiblePromoters.map((p) => (
                                <th 
                                  key={p.ID} 
                                  className="py-3 px-4 font-bold text-xs text-zinc-700 text-center border-r border-zinc-200 w-[320px] shrink-0 relative group select-none bg-zinc-50 sticky top-0 z-20 border-b border-zinc-200"
                                >
                                  <span>{p.Name}</span>
                                  {isEditMode && (
                                    <button 
                                      onClick={() => handleHidePromoter(p.ID)}
                                      className="absolute right-1 top-1 p-0.5 rounded text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      title="Hide column"
                                    >
                                      <X size={10} />
                                    </button>
                                  )}
                                </th>
                              ))}
 
                              {/* + column header selector (sticky top) */}
                              <th className="py-3 px-3 text-left border-zinc-200 relative select-none bg-zinc-50 sticky top-0 z-20 border-b border-zinc-200">
                                {isEditMode && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setShowAddColDropdown(!showAddColDropdown)}
                                      className="px-2 py-1 rounded bg-zinc-50 hover:bg-zinc-150 border border-zinc-250 text-zinc-650 hover:text-zinc-955 transition-colors cursor-pointer text-xs font-bold"
                                      title="Show promoter column"
                                    >
                                      +
                                    </button>
                                    
                                    {showAddColDropdown && (
                                      <div className="absolute left-2 mt-2 w-48 bg-white border border-slate-200 rounded shadow-lg z-30 p-2 text-left font-normal max-h-48 overflow-y-auto custom-scrollbar">
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block pb-1 border-b border-zinc-100 mb-1">Show Promoter</span>
                                        {promoters
                                          .filter(p => 
                                            !visiblePromoters.some(vp => String(vp.ID) === String(p.ID)) &&
                                            !(p.Archived && (String(p.Archived) === "1" || String(p.Archived) === "true"))
                                          )
                                          .map(p => (
                                            <button
                                              key={p.ID}
                                              onClick={() => handleShowPromoter(p.ID)}
                                              className="w-full text-left text-xs px-2 py-1 hover:bg-zinc-50 rounded text-zinc-700 hover:text-zinc-955 font-semibold cursor-pointer truncate"
                                            >
                                              {p.Name}
                                            </button>
                                          ))}
                                        {promoters.filter(p => 
                                          !visiblePromoters.some(vp => String(vp.ID) === String(p.ID)) &&
                                          !(p.Archived && (String(p.Archived) === "1" || String(p.Archived) === "true"))
                                        ).length === 0 && (
                                          <span className="text-[10px] text-zinc-400 italic block p-1">All promoters visible</span>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {weekDates.map((date) => {
                              const formattedDay = date.toLocaleDateString("en-US", { weekday: "long" });
                              const formattedDateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                              
                              return (
                                <tr key={date.toDateString()} className="border-b border-zinc-200 hover:bg-zinc-50/10">
                                  {/* Left date column */}
                                  <td className="py-4 px-4 font-bold text-xs text-zinc-805 border-r border-zinc-200 bg-zinc-50 sticky left-0 z-10 select-none min-h-[110px] shadow-[2px_0_5px_0_rgba(0,0,0,0.05)]">
                                    <div className="font-bold text-zinc-900">{formattedDay}</div>
                                    <div className="text-zinc-450 text-[10px] font-bold font-mono mt-0.5">{formattedDateStr}</div>
                                  </td>

                                  {/* Day Planner Droppable cells */}
                                  {visiblePromoters.map((p) => {
                                    const cellSchedules = getCellSchedules(date, p.ID);
                                    return (
                                      <td
                                        key={p.ID}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleStoreDrop(e, date, p.ID)}
                                        className="py-2.5 px-3 border-r border-zinc-200 w-[320px] shrink-0 min-h-[110px] align-top bg-white relative transition-colors hover:bg-blue-50/5"
                                      >
                                        <div className="flex flex-col gap-2 min-h-[85px] w-full">
                                          {cellSchedules.map((sch) => (
                                            <div 
                                              key={sch.ID}
                                              className="bg-zinc-50 border border-zinc-200 rounded p-2.5 shadow-xs relative flex gap-2 text-xs font-primary group/card"
                                            >
                                              {/* Left side actions bar (edit only) */}
                                              {isEditMode && (
                                                <div className="flex flex-col items-center gap-1.5 border-r border-zinc-150 pr-1.5 shrink-0 select-none">
                                                  {/* Drag handle */}
                                                  <div
                                                    draggable
                                                    onDragStart={(e) => {
                                                      e.dataTransfer.setData("dragAction", "move");
                                                      e.dataTransfer.setData("scheduleId", String(sch.ID));
                                                    }}
                                                    className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-650 p-0.5 rounded hover:bg-zinc-150 transition-all"
                                                    title="Drag to move shift"
                                                  >
                                                    <GripVertical size={13} />
                                                  </div>
                                                  
                                                  {/* Copy button */}
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setCopiedSchedule(sch);
                                                      showToast(`Shift copied! Use "Paste Shift" in another cell to deploy with default times.`, "success");
                                                    }}
                                                    className="text-zinc-400 hover:text-zinc-650 p-0.5 rounded hover:bg-zinc-150 transition-all cursor-pointer"
                                                    title="Copy shift details (paste with default times)"
                                                  >
                                                    <Copy size={11} />
                                                  </button>

                                                  {/* Duplicate drag handle */}
                                                  <div
                                                    draggable
                                                    onDragStart={(e) => {
                                                      e.dataTransfer.setData("dragAction", "duplicate");
                                                      e.dataTransfer.setData("scheduleId", String(sch.ID));
                                                    }}
                                                    className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-[#0B57D0] p-0.5 rounded hover:bg-zinc-150 transition-all"
                                                    title="Drag to duplicate shift (retains times)"
                                                  >
                                                    <Files size={11} />
                                                  </div>
                                                </div>
                                              )}

                                              {/* Right side shift details */}
                                              <div className="flex-1 min-w-0 flex flex-col gap-1 pr-3">
                                                <div className="flex justify-between items-start">
                                                  <span className="font-bold text-zinc-800 text-[11px] truncate leading-tight w-full pr-1.5" title={getFormattedStoreName(sch["Store ID"], sch["Store Name"])}>
                                                    {getFormattedStoreName(sch["Store ID"], sch["Store Name"])}
                                                  </span>
                                                  {isEditMode && (
                                                    <button
                                                      onClick={() => handleDeleteSchedule(sch.ID)}
                                                      className="absolute right-1 top-1 p-0.5 rounded text-zinc-400 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-pointer"
                                                      title="Remove assignment"
                                                    >
                                                      <Trash2 size={11} />
                                                    </button>
                                                  )}
                                                </div>
                                                
                                                <div className="text-[9.5px] text-[#0B57D0] font-bold truncate leading-none" title={sch["Campaign Title"]}>
                                                  {sch["Campaign Title"]}
                                                </div>

                                                {/* Inline time selector inside promoter card cell */}
                                                {isEditMode ? (
                                                  <div className="flex flex-col gap-1.5 mt-1 border-t border-zinc-150 pt-1.5 shrink-0 animate-in fade-in duration-150">
                                                    <div className="flex items-center gap-1">
                                                      <Clock size={10} className="text-zinc-400 shrink-0" />
                                                      <div className="flex items-center gap-0.5">
                                                        <input
                                                          type="time"
                                                          value={formatTimeDisplay(sch["Shift Start"]) || "09:00"}
                                                          onChange={(e) => handleUpdateTime(sch.ID, "Shift Start", e.target.value)}
                                                          className="px-1 py-0.5 border border-zinc-200 rounded text-[9.5px] font-semibold text-zinc-850 bg-white outline-none focus:border-zinc-500 cursor-pointer w-[92px]"
                                                        />
                                                        <span className="text-[9px] text-zinc-400 font-bold">-</span>
                                                        <input
                                                          type="time"
                                                          value={formatTimeDisplay(sch["Shift End"]) || "17:00"}
                                                          onChange={(e) => handleUpdateTime(sch.ID, "Shift End", e.target.value)}
                                                          className="px-1 py-0.5 border border-zinc-200 rounded text-[9.5px] font-semibold text-zinc-850 bg-white outline-none focus:border-zinc-500 cursor-pointer w-[92px]"
                                                        />
                                                      </div>
                                                    </div>
                                                    <textarea
                                                      rows={3}
                                                      value={sch.Remarks || ""}
                                                      onChange={(e) => handleUpdateRemark(sch.ID, e.target.value)}
                                                      placeholder="Add Remark..."
                                                      className="px-1.5 py-1 border border-zinc-200 rounded text-[9.5px] font-medium text-zinc-800 bg-white outline-none focus:border-zinc-450 w-full resize-none leading-normal"
                                                    />
                                                  </div>
                                                ) : (
                                                  <div className="flex flex-col mt-1 border-t border-zinc-150 pt-1.5 shrink-0 gap-0.5">
                                                    <div className="flex items-center gap-1.5 text-zinc-550 font-semibold text-[9.5px]">
                                                      <Clock size={11} className="text-zinc-400 shrink-0" />
                                                      <span>{formatTimeDisplay(sch["Shift Start"]) || "09:00"} - {formatTimeDisplay(sch["Shift End"]) || "17:00"}</span>
                                                    </div>
                                                    {sch.Remarks && (
                                                      <div className="text-[9.5px] text-zinc-500 italic pl-4 whitespace-pre-wrap leading-tight w-full" title={sch.Remarks}>
                                                        {sch.Remarks}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          ))}

                                          {copiedSchedule && isEditMode && (
                                            <button
                                              type="button"
                                              onClick={() => handlePasteSchedule(date, p.ID)}
                                              className="w-full py-1 border border-dashed border-[#0B57D0]/40 hover:bg-blue-50/50 hover:border-[#0B57D0] text-[#0B57D0] text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-all cursor-pointer mt-1"
                                              title="Paste copied shift with default times"
                                            >
                                              <ClipboardPaste size={11} />
                                              Paste Shift
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  })}

                                  {/* Empty spacing cell */}
                                  <td className="border-zinc-250 bg-zinc-50/5" />
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                  </div>
                </div>

                {/* Right Panel (30%): Draggable Stores List */}
                {!isStoreLibraryCollapsed && isEditMode && (
                  <div className="flex-[30] bg-white border border-zinc-200 rounded p-5 flex flex-col justify-between overflow-hidden shadow-sm h-full animate-in slide-in-from-right duration-300">
                    <div className="flex flex-col flex-grow overflow-hidden">
                      
                      <div className="flex justify-between items-center border-b border-zinc-150 pb-2.5 shrink-0">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                          Stores Library
                        </h3>
                        <button
                          type="button"
                          onClick={() => setIsStoreLibraryCollapsed(true)}
                          className="p-1 hover:bg-zinc-100 rounded text-zinc-550 hover:text-zinc-805 cursor-pointer transition-colors"
                          title="Collapse Stores Library"
                        >
                          <ChevronRight size={14} className="stroke-[2.5]" />
                        </button>
                      </div>

                      {/* Stores filtering options */}
                      <div className="flex flex-col gap-2 mt-3 shrink-0">
                        <input
                          type="text"
                          value={storeSearch}
                          onChange={(e) => setStoreSearch(e.target.value)}
                          placeholder="Search store name..."
                          className="w-full px-2.5 py-1.5 border border-zinc-200 rounded text-xs font-semibold outline-none focus:border-zinc-500 shadow-xs"
                        />
                        <select
                          value={selectedRetailerFilter}
                          onChange={(e) => setSelectedRetailerFilter(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-850 outline-none cursor-pointer focus:border-zinc-555"
                        >
                          <option value="all">All Retailers</option>
                          {retailers.map(r => (
                            <option key={r.ID} value={r.ID}>
                              {r["Display Name"]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Draggable Stores library card container */}
                      <div className="flex-grow overflow-y-auto custom-scrollbar mt-4 pr-1">
                        <div className="flex flex-col gap-2">
                          {filteredStores.map((store) => (
                            <div
                              key={store.ID}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData("storeId", String(store.ID))}
                              className="bg-zinc-50/40 hover:bg-blue-50/5 border border-zinc-200 hover:border-[#0B57D0] rounded p-3 shadow-xs cursor-grab active:cursor-grabbing select-none transition-all flex flex-col gap-1.5 text-xs font-primary animate-in fade-in duration-200"
                            >
                              <div className="font-bold text-zinc-805 leading-tight">
                                {getFormattedStoreName(store.ID, store["Display Name"])}
                              </div>
                              <div className="text-[10.5px] text-zinc-500 font-normal whitespace-normal leading-normal">
                                {store.Address || "No address listed"}
                              </div>
                            </div>
                          ))}
                          {filteredStores.length === 0 && (
                            <div className="text-center text-zinc-400 font-bold select-none border border-dashed border-zinc-200 rounded p-6 bg-zinc-50/20 text-[10.5px]">
                              No stores found
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* Campaign Management Tab */}
        {activeTab === "campaign" && (
          <div className="w-full h-full flex flex-col gap-4 overflow-hidden relative">
            
            {isCreatingCampaign ? (
              /* Campaign Creation / Edit Form */
              <div className="flex flex-col flex-1 bg-white border border-zinc-200 rounded relative shadow-sm overflow-hidden select-none max-w-5xl mx-auto w-full h-[calc(100vh-220px)]">
                <form onSubmit={handleSaveCampaign} className="flex flex-col flex-1 h-full overflow-hidden text-xs font-primary">
                  <div className="flex justify-between items-center border-b border-zinc-150 px-6 py-4 bg-zinc-50 shrink-0">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                      {editingCampaignId ? "Edit Campaign Details" : "Create New Campaign"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCampaign(false);
                        setEditingCampaignId(null);
                        setCampTitle("");
                        setCampDesc("");
                        setCampInstr("");
                        setCampBrand("");
                        setCampProducts([]);
                      }}
                      className="p-1 hover:bg-zinc-100 rounded text-zinc-450 hover:text-zinc-855 cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Form Two Column Fields wrapper */}
                  <div className="grid grid-cols-2 gap-6 items-start flex-grow overflow-y-auto p-6">
                    
                    {/* Left Column: Metadata Details */}
                    <div className="flex flex-col gap-4">
                      {/* Campaign Title */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                          Campaign Title
                        </label>
                        <input
                          type="text"
                          value={campTitle}
                          onChange={(e) => setCampTitle(e.target.value)}
                          placeholder="e.g. Pak Man Product Launch"
                          className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-855 outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-xs"
                        />
                      </div>

                      {/* Select Brand */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                          Select Brand (Choose 1)
                        </label>
                        <select
                          value={campBrand}
                          onChange={(e) => {
                            setCampBrand(e.target.value);
                            setCampProducts([]); // Reset products selection when brand changes
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-855 outline-none focus:border-zinc-955 focus:ring-1 focus:ring-zinc-955 transition-all cursor-pointer"
                        >
                          <option value="">-- Select Brand --</option>
                          {brands.map(b => (
                            <option key={b.ID} value={b.ID}>
                              {b["Display Name"]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Select Products Checklist */}
                      {campBrand && (
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                            Target Products (Optional checklist - Unchecked implies all products of brand)
                          </label>
                          <div className="flex flex-col gap-1.5 mt-2 max-h-56 overflow-y-auto border border-zinc-200 rounded p-2.5 bg-zinc-50/30 custom-scrollbar">
                            {brandProducts.length === 0 ? (
                              <span className="text-[10px] text-zinc-455 italic pl-1">No products found for this brand in the database.</span>
                            ) : (
                              brandProducts.map(p => (
                                <label key={p.SKU} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 hover:text-zinc-955 select-none">
                                  <input
                                    type="checkbox"
                                    checked={campProducts.includes(p.SKU)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setCampProducts(prev => [...prev, p.SKU]);
                                      } else {
                                        setCampProducts(prev => prev.filter(sku => sku !== p.SKU));
                                      }
                                    }}
                                    className="rounded border-zinc-300 text-[#0B57D0] focus:ring-[#0B57D0] h-3.5 w-3.5"
                                  />
                                  <span>{p["Display Name"]} ({p.SKU})</span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Descriptions & Guidelines (Bigger!) */}
                    <div className="flex flex-col gap-4">
                      {/* Campaign Description */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                          Campaign Description
                        </label>
                        <textarea
                          value={campDesc}
                          onChange={(e) => setCampDesc(e.target.value)}
                          placeholder="Describe the campaign objectives, timelines, and details..."
                          className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-850 outline-none focus:border-zinc-955 focus:ring-1 focus:ring-zinc-955 transition-all shadow-xs resize-none h-[160px]"
                        />
                      </div>

                      {/* Campaign Instruction */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                          Campaign Instruction (For Promoters)
                        </label>
                        <textarea
                          value={campInstr}
                          onChange={(e) => setCampInstr(e.target.value)}
                          placeholder="Provide step-by-step guidelines for promoters during field work..."
                          className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-850 outline-none focus:border-zinc-955 focus:ring-1 focus:ring-zinc-955 transition-all shadow-xs resize-none h-[240px]"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-2 text-xs font-bold px-6 py-4 border-t border-zinc-150 bg-zinc-50 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingCampaign(false);
                        setEditingCampaignId(null);
                        setCampTitle("");
                        setCampDesc("");
                        setCampInstr("");
                        setCampBrand("");
                        setCampProducts([]);
                      }}
                      className="px-4 py-2 border border-slate-200 bg-white text-zinc-700 hover:text-zinc-955 hover:bg-slate-100 rounded transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded shadow transition-all cursor-pointer"
                    >
                      Save Campaign
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Campaign List Table view */
              <div className="w-full h-full flex flex-col gap-3 snap-deals-table">
                <div className="flex justify-between items-center pb-1 border-b border-zinc-150 shrink-0">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCampaignSubTab("active")}
                      className={cn(
                        "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer",
                        campaignSubTab === "active"
                          ? "border-[#0B57D0] text-[#0B57D0]"
                          : "border-transparent text-zinc-400 hover:text-zinc-600"
                      )}
                    >
                      Active Campaigns
                    </button>
                    <button
                      type="button"
                      onClick={() => setCampaignSubTab("archive")}
                      className={cn(
                        "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer",
                        campaignSubTab === "archive"
                          ? "border-[#0B57D0] text-[#0B57D0]"
                          : "border-transparent text-zinc-400 hover:text-zinc-600"
                      )}
                    >
                      Archive
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCreatingCampaign(true)}
                    className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-bold rounded shadow transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus size={13} className="stroke-[2.5]" />
                    Create Campaign
                  </button>
                </div>

                <DataTable
                  columns={campaignsColumns}
                  data={mappedCampaigns}
                  height="h-full"
                  title=""
                  userRole="admin"
                  fetching={loadingCampaigns}
                />
              </div>
            )}

          </div>
        )}

        {/* Promoters Database Tab */}
        {activeTab === "promoters" && (
          <div className="w-full h-full flex flex-col gap-4 overflow-hidden relative">
            
            {isCreatingPromoter ? (
              /* Promoter Creation / Edit Form */
              <div className="flex flex-col flex-1 bg-white border border-zinc-200 rounded relative shadow-sm overflow-hidden select-none max-w-xl mx-auto w-full h-[calc(100vh-220px)]">
                <form onSubmit={handleSavePromoter} className="flex flex-col flex-1 h-full overflow-hidden text-xs font-primary">
                  <div className="flex justify-between items-center border-b border-zinc-150 px-6 py-4 bg-zinc-50 shrink-0">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                      {editingPromoterId ? "Edit Promoter Details" : "Add New Promoter"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingPromoter(false);
                        setEditingPromoterId(null);
                        setPromoterId("");
                        setPromoterName("");
                        setPromoterFullName("");
                        setPromoterPhone("");
                        setPromoterEmail("");
                        setPromoterPaynow("");
                      }}
                      className="p-1 hover:bg-zinc-100 rounded text-zinc-455 hover:text-zinc-855 cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-4 flex-grow overflow-y-auto p-6">
                    {/* Promoter ID */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                        Promoter ID
                      </label>
                      <input
                        type="text"
                        value={promoterId}
                        onChange={(e) => setPromoterId(e.target.value)}
                        disabled={!!editingPromoterId}
                        placeholder={editingPromoterId ? "" : "e.g. prom_01 (Leave blank to auto-generate)"}
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-855 outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-xs disabled:bg-zinc-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Nickname */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                        Nickname
                      </label>
                      <input
                        type="text"
                        value={promoterName}
                        onChange={(e) => setPromoterName(e.target.value)}
                        placeholder="e.g. John"
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-855 outline-none focus:border-zinc-955 focus:ring-1 focus:ring-zinc-955 transition-all shadow-xs"
                      />
                    </div>

                    {/* Full Name */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={promoterFullName}
                        onChange={(e) => setPromoterFullName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-855 outline-none focus:border-zinc-955 focus:ring-1 focus:ring-zinc-955 transition-all shadow-xs"
                      />
                    </div>

                    {/* Promoter Phone */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={promoterPhone}
                        onChange={(e) => setPromoterPhone(e.target.value)}
                        placeholder="e.g. +65 91234567"
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-855 outline-none focus:border-zinc-955 focus:ring-1 focus:ring-zinc-955 transition-all shadow-xs"
                      />
                    </div>

                    {/* Promoter Email */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={promoterEmail}
                        onChange={(e) => setPromoterEmail(e.target.value)}
                        placeholder="e.g. john.doe@example.com"
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-855 outline-none focus:border-zinc-955 focus:ring-1 focus:ring-zinc-955 transition-all shadow-xs"
                      />
                    </div>

                    {/* Paynow Account */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                        Paynow Account
                      </label>
                      <input
                        type="text"
                        value={promoterPaynow}
                        onChange={(e) => setPromoterPaynow(e.target.value)}
                        placeholder="e.g. Mobile No. or NRIC"
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-855 outline-none focus:border-zinc-955 focus:ring-1 focus:ring-zinc-955 transition-all shadow-xs"
                      />
                    </div>

                    {/* PIN - Only visible inside Edit form */}
                    {editingPromoterId && (
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                          Login PIN (4 digits)
                        </label>
                        <input
                          type="text"
                          value={promoterPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            if (val.length <= 4) setPromoterPin(val);
                          }}
                          placeholder="e.g. 1234"
                          maxLength={4}
                          className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-855 outline-none focus:border-zinc-955 focus:ring-1 focus:ring-zinc-955 transition-all shadow-xs"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 border-t border-zinc-150 px-6 py-4 bg-zinc-50 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingPromoter(false);
                        setEditingPromoterId(null);
                        setPromoterId("");
                        setPromoterName("");
                        setPromoterFullName("");
                        setPromoterPhone("");
                        setPromoterEmail("");
                        setPromoterPaynow("");
                        setPromoterPin("");
                      }}
                      className="px-4 py-2 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-650 font-bold rounded cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold rounded cursor-pointer shadow-sm transition-all"
                    >
                      Save Promoter
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Promoter Table list view */
              <div className="w-full h-full flex flex-col gap-3 snap-deals-table">
                <div className="flex justify-between items-center pb-1 border-b border-zinc-150 shrink-0">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPromoterSubTab("active")}
                      className={cn(
                        "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer",
                        promoterSubTab === "active"
                          ? "border-[#0B57D0] text-[#0B57D0]"
                          : "border-transparent text-zinc-400 hover:text-zinc-600"
                      )}
                    >
                      Active Promoter
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromoterSubTab("archive")}
                      className={cn(
                        "px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer",
                        promoterSubTab === "archive"
                          ? "border-[#0B57D0] text-[#0B57D0]"
                          : "border-transparent text-zinc-400 hover:text-zinc-600"
                      )}
                    >
                      Archive
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingPromoter(true);
                      setEditingPromoterId(null);
                      setPromoterId("");
                      setPromoterName("");
                      setPromoterPhone("");
                    }}
                    className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-bold rounded shadow transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus size={13} className="stroke-[2.5]" />
                    Add Promoter
                  </button>
                </div>

                <DataTable
                  columns={promotersColumns}
                  data={mappedPromoters}
                  height="h-full"
                  title=""
                  userRole="admin"
                  fetching={loadingPromoters}
                />
              </div>
            )}
          </div>
        )}

        {/* Print Tab */}
        {activeTab === "print" && (
          <div className="w-full flex flex-col gap-4 relative select-none">
            <div className="content-body w-full p-2">
              <div ref={printContainerRef} className="flex flex-wrap gap-6 items-start">
                
                {/* Master Calendar Card */}
                <div
                  className={cn(
                    "bg-white border rounded-lg transition-all duration-300 shadow-xs hover:shadow-md select-none flex flex-col justify-between overflow-hidden",
                    selectedPrintLayout === "master-calendar"
                      ? "w-[480px] min-h-[220px] border-[#0B57D0] scale-[1.01]"
                      : "group relative w-[240px] h-[180px] border-slate-200 hover:bg-[#D3E3FD] cursor-pointer flex items-center justify-center hover:scale-[1.03]"
                  )}
                  onClick={() => {
                    if (selectedPrintLayout !== "master-calendar") {
                      setSelectedPrintLayout("master-calendar");
                      setPrintMonth(new Date().getMonth());
                      setPrintYear(new Date().getFullYear());
                    }
                  }}
                >
                  {selectedPrintLayout !== "master-calendar" ? (
                    <div className="w-full h-full p-6 flex flex-col items-center justify-center relative pointer-events-none">
                      <span className="font-primary text-sm font-bold text-zinc-800 transition-all duration-300 group-hover:opacity-0 group-hover:scale-90 text-center px-4 absolute">
                        Print Master Calendar
                      </span>
                      <span className="font-primary text-xs leading-relaxed font-semibold text-[#041E49] transition-all duration-300 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 text-center px-5 absolute">
                        Print landscape A3 calendar grid. Requires selecting a month.
                      </span>
                    </div>
                  ) : (
                    <div className="w-[480px] p-5 flex flex-col gap-4 text-xs font-primary shrink-0 transition-opacity duration-300 animate-in fade-in fill-mode-both">
                      <div className="flex justify-between items-center border-b border-zinc-150 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B57D0]">
                          Configure Master Calendar
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPrintLayout(null);
                          }}
                          className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex flex-col gap-1 flex-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider pl-0.5">Select Month</label>
                          <select
                            value={printMonth}
                            onChange={(e) => setPrintMonth(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none cursor-pointer focus:border-[#0B57D0]"
                          >
                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => (
                              <option key={m} value={idx}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider pl-0.5">Select Year</label>
                          <input
                            type="number"
                            value={printYear}
                            onChange={(e) => setPrintYear(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-[#0B57D0] shadow-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-zinc-150">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPrintLayout(null);
                          }}
                          className="px-3 py-1.5 border border-zinc-250 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 font-bold rounded cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintReport("A3 landscape");
                          }}
                          className="px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold rounded shadow transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Printer size={12} className="stroke-[2.5]" />
                          Print Report
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Campaign Schedule Card */}
                <div
                  className={cn(
                    "bg-white border rounded-lg transition-all duration-300 shadow-xs hover:shadow-md select-none flex flex-col justify-between overflow-hidden",
                    selectedPrintLayout === "campaign-schedule"
                      ? "w-[480px] min-h-[220px] border-[#0B57D0] scale-[1.01]"
                      : "group relative w-[240px] h-[180px] border-slate-200 hover:bg-[#D3E3FD] cursor-pointer flex items-center justify-center hover:scale-[1.03]"
                  )}
                  onClick={() => {
                    if (selectedPrintLayout !== "campaign-schedule") {
                      setSelectedPrintLayout("campaign-schedule");
                      setPrintCampaignId("");
                    }
                  }}
                >
                  {selectedPrintLayout !== "campaign-schedule" ? (
                    <div className="w-full h-full p-6 flex flex-col items-center justify-center relative pointer-events-none">
                      <span className="font-primary text-sm font-bold text-zinc-800 transition-all duration-300 group-hover:opacity-0 group-hover:scale-90 text-center px-4 absolute">
                        Print Campaign Schedule
                      </span>
                      <span className="font-primary text-xs leading-relaxed font-semibold text-[#041E49] transition-all duration-300 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 text-center px-5 absolute">
                        Print landscape A4 campaign schedule. Requires selecting campaign & date range.
                      </span>
                    </div>
                  ) : (
                    <div className="w-[480px] p-5 flex flex-col gap-4 text-xs font-primary shrink-0 transition-opacity duration-300 animate-in fade-in fill-mode-both">
                      <div className="flex justify-between items-center border-b border-zinc-150 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B57D0]">
                          Configure Campaign Schedule
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPrintLayout(null);
                          }}
                          className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider pl-0.5">Select Campaign</label>
                          <select
                            value={printCampaignId}
                            onChange={(e) => setPrintCampaignId(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none cursor-pointer focus:border-[#0B57D0]"
                          >
                            <option value="">-- Choose Campaign --</option>
                            {campaigns.filter(c => !(c.Archived && (String(c.Archived) === "1" || String(c.Archived) === "true"))).map(c => (
                              <option key={c.ID} value={c.ID}>{c["Campaign Title"]}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex flex-col gap-1 flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider pl-0.5">Start Date</label>
                            <input
                              type="date"
                              value={printStartDate}
                              onChange={(e) => setPrintStartDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-[#0B57D0] shadow-xs"
                            />
                          </div>
                          <div className="flex flex-col gap-1 flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider pl-0.5">End Date</label>
                            <input
                              type="date"
                              value={printEndDate}
                              onChange={(e) => setPrintEndDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-[#0B57D0] shadow-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-zinc-150">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPrintLayout(null);
                          }}
                          className="px-3 py-1.5 border border-zinc-250 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 font-bold rounded cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!printCampaignId) {
                              showToast("Please select a campaign.", "warning");
                              return;
                            }
                            handlePrintReport("A4 landscape");
                          }}
                          className="px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold rounded shadow transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Printer size={12} className="stroke-[2.5]" />
                          Print Report
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Promoter Schedule Card */}
                <div
                  className={cn(
                    "bg-white border rounded-lg transition-all duration-300 shadow-xs hover:shadow-md select-none flex flex-col justify-between overflow-hidden",
                    selectedPrintLayout === "promoter-schedule"
                      ? "w-[480px] min-h-[220px] border-[#0B57D0] scale-[1.01]"
                      : "group relative w-[240px] h-[180px] border-slate-200 hover:bg-[#D3E3FD] cursor-pointer flex items-center justify-center hover:scale-[1.03]"
                  )}
                  onClick={() => {
                    if (selectedPrintLayout !== "promoter-schedule") {
                      setSelectedPrintLayout("promoter-schedule");
                      setPrintPromoterId("");
                    }
                  }}
                >
                  {selectedPrintLayout !== "promoter-schedule" ? (
                    <div className="w-full h-full p-6 flex flex-col items-center justify-center relative pointer-events-none">
                      <span className="font-primary text-sm font-bold text-zinc-800 transition-all duration-300 group-hover:opacity-0 group-hover:scale-90 text-center px-4 absolute">
                        Print Promoter Schedule
                      </span>
                      <span className="font-primary text-xs leading-relaxed font-semibold text-[#041E49] transition-all duration-300 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 text-center px-5 absolute">
                        Print landscape A4 promoter schedule. Requires selecting promoter & date range.
                      </span>
                    </div>
                  ) : (
                    <div className="w-[480px] p-5 flex flex-col gap-4 text-xs font-primary shrink-0 transition-opacity duration-300 animate-in fade-in fill-mode-both">
                      <div className="flex justify-between items-center border-b border-zinc-150 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B57D0]">
                          Configure Promoter Schedule
                        </h3>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPrintLayout(null);
                          }}
                          className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider pl-0.5">Select Promoter</label>
                          <select
                            value={printPromoterId}
                            onChange={(e) => setPrintPromoterId(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none cursor-pointer focus:border-[#0B57D0]"
                          >
                            <option value="">-- Choose Promoter --</option>
                            {promoters.filter(p => !(p.Archived && (String(p.Archived) === "1" || String(p.Archived) === "true"))).map(p => (
                              <option key={p.ID} value={p.ID}>{p.Name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex flex-col gap-1 flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider pl-0.5">Start Date</label>
                            <input
                              type="date"
                              value={printStartDate}
                              onChange={(e) => setPrintStartDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-[#0B57D0] shadow-xs"
                            />
                          </div>
                          <div className="flex flex-col gap-1 flex-1">
                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider pl-0.5">End Date</label>
                            <input
                              type="date"
                              value={printEndDate}
                              onChange={(e) => setPrintEndDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-[#0B57D0] shadow-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-zinc-150">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPrintLayout(null);
                          }}
                          className="px-3 py-1.5 border border-zinc-250 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 font-bold rounded cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!printPromoterId) {
                              showToast("Please select a promoter.", "warning");
                              return;
                            }
                            handlePrintReport("A4 landscape");
                          }}
                          className="px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold rounded shadow transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Printer size={12} className="stroke-[2.5]" />
                          Print Report
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {activeTab === "payout" && (
          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {!isCreatePayoutOpen ? (
              <>
                {/* Header section */}
                <div className="flex justify-between items-center select-none pb-1">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-base font-bold text-zinc-900">Promoter Payout Management</h2>
                    <p className="text-xs text-zinc-505 font-medium">Create, review, and mark payments for promoter shifts</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPayoutId(null);
                      setSelectedPayoutPromoterId("");
                      setPayoutStartDate("");
                      setPayoutEndDate("");
                      setPayoutHourlyRate("");
                      setEditedPayoutRows([]);
                      setPayoutFetchError(null);
                      setIsCreatePayoutOpen(true);
                    }}
                    className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold rounded text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus size={14} className="stroke-[2.5]" />
                    Create Payout
                  </button>
                </div>

                {/* List and Table View */}
                <DataTable
                  columns={payoutColumns}
                  data={mappedPayouts}
                  height="h-[calc(100vh-220px)]"
                  title="Promoter Payout Records"
                  userRole="viewer"
                  fetching={loadingPayouts}
                />
              </>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col gap-4">
                {/* Form Header */}
                <div className="flex justify-between items-center pb-1 select-none">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-bold text-zinc-900">
                      {editingPayoutId ? "Edit Promoter Payout" : "Create Promoter Payout"}
                    </h3>
                    <p className="text-[11px] text-zinc-500 font-semibold">
                      Configure Date Range and Hourly Wage Rate to fetch scheduler shifts
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatePayoutOpen(false);
                      setEditingPayoutId(null);
                    }}
                    className="p-1 rounded hover:bg-zinc-200 text-zinc-505 hover:text-zinc-800 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 min-h-0 overflow-auto flex flex-col gap-4">
                  {/* Setup Card */}
                  <div className="bg-white p-4 rounded border border-zinc-200 shadow-2xs flex flex-col gap-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Payout Configurations</h4>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-zinc-650 uppercase tracking-wider pl-0.5">Select Promoter</label>
                        <select
                          value={selectedPayoutPromoterId}
                          onChange={(e) => setSelectedPayoutPromoterId(e.target.value)}
                          disabled={!!editingPayoutId}
                          className="px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-[#0B57D0] cursor-pointer disabled:bg-zinc-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        >
                          <option value="">-- Choose Promoter --</option>
                          {promoters.filter(p => !(p.Archived && (String(p.Archived) === "1" || String(p.Archived) === "true"))).map(p => (
                            <option key={p.ID} value={p.ID}>{p.Name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-zinc-655 uppercase tracking-wider pl-0.5">Start Date</label>
                        <input
                          type="date"
                          value={payoutStartDate}
                          onChange={(e) => setPayoutStartDate(e.target.value)}
                          disabled={!!editingPayoutId}
                          className="px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-[#0B57D0] shadow-2xs disabled:bg-zinc-50 disabled:text-zinc-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-zinc-655 uppercase tracking-wider pl-0.5">End Date</label>
                        <input
                          type="date"
                          value={payoutEndDate}
                          onChange={(e) => setPayoutEndDate(e.target.value)}
                          disabled={!!editingPayoutId}
                          className="px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-[#0B57D0] shadow-2xs disabled:bg-zinc-50 disabled:text-zinc-500"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-zinc-655 uppercase tracking-wider pl-0.5">Hour Rate ($)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400">$</span>
                          <input
                            type="number"
                            value={payoutHourlyRate}
                            onChange={(e) => setPayoutHourlyRate(e.target.value)}
                            disabled={!!editingPayoutId}
                            placeholder="e.g. 15.00"
                            className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-[#0B57D0] shadow-2xs disabled:bg-zinc-50 disabled:text-zinc-500"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {!editingPayoutId && (
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={fetchPayoutSchedules}
                          disabled={isPayoutFetching}
                          className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white font-bold rounded text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isPayoutFetching ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-zinc-400 border-t-white"></div>
                              Fetching...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={12} />
                              Fetch Schedules
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Validation Error Message */}
                  {payoutFetchError && (
                    <div className="bg-red-50 border border-red-200 text-red-750 px-4 py-3 rounded flex items-start gap-2.5 text-xs font-semibold shadow-2xs leading-relaxed animate-in fade-in zoom-in-95 duration-150">
                      <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-red-855 mb-0.5">Time Logging Conflict Detected</span>
                        {payoutFetchError}
                      </div>
                    </div>
                  )}

                  {/* Schedules Table */}
                  {editedPayoutRows.length > 0 && (
                    <div className="flex-1 bg-white border border-zinc-200 rounded overflow-hidden shadow-2xs flex flex-col min-h-[250px]">
                      <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200 flex justify-between items-center">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Shift Wage Breakdown</span>
                        <span className="text-[10px] font-semibold text-zinc-505">
                          Total Wages: <span className="font-bold text-[#0B57D0] text-xs">${editedPayoutRows.reduce((acc, curr) => acc + curr.totalPayout, 0).toFixed(2)}</span>
                        </span>
                      </div>
                      <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-250 text-zinc-650 font-bold uppercase tracking-wider sticky top-0 select-none">
                              <th className="py-2.5 px-4 w-12 text-center">No.</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Start Time</th>
                              <th className="py-2.5 px-3">End Time</th>
                              <th className="py-2.5 px-3">Total Time</th>
                              <th className="py-2.5 px-3 text-center">Rate / Hour ($)</th>
                              <th className="py-2.5 px-3">Total Payout</th>
                              <th className="py-2.5 px-3">Task Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-medium">
                            {editedPayoutRows.map((row, idx) => {
                              const formatRowTimestamp = (ts: any): string => {
                                const d = new Date(Number(ts));
                                if (isNaN(d.getTime())) return "-";
                                const day = String(d.getDate()).padStart(2, "0");
                                const month = String(d.getMonth() + 1).padStart(2, "0");
                                const year = d.getFullYear();
                                const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                                return `${day}/${month}/${year} (${days[d.getDay()]})`;
                              };

                              return (
                                <tr key={row.scheduleId} className="hover:bg-zinc-50/20 transition-colors">
                                  <td className="py-2.5 px-4 text-center font-bold text-zinc-400">{idx + 1}</td>
                                  <td className="py-2.5 px-3 font-semibold text-zinc-800">{formatRowTimestamp(row.date)}</td>
                                  {row.absent ? (
                                    <td colSpan={4} className="py-2.5 px-3 text-red-650 font-bold">
                                      Absent: {row.absentReason || "Reason not specified"}
                                    </td>
                                  ) : (
                                    <>
                                      <td className="py-2.5 px-3 font-semibold text-zinc-700">{row.startTime}</td>
                                      <td className="py-2.5 px-3 font-semibold text-zinc-700">{row.endTime}</td>
                                      <td className="py-2.5 px-3 font-bold text-zinc-800">{row.totalTime.toFixed(2)} hrs</td>
                                      <td className="py-2.5 px-3 text-center">
                                        <div className="relative inline-block">
                                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-450 font-bold">$</span>
                                          <input
                                            type="number"
                                            value={row.hourlyRate}
                                            onChange={(e) => {
                                              const newRate = Number(e.target.value);
                                              const updated = editedPayoutRows.map(r => r.scheduleId === row.scheduleId ? {
                                                ...r,
                                                hourlyRate: newRate,
                                                totalPayout: Number((r.totalTime * newRate).toFixed(2))
                                              } : r);
                                              setEditedPayoutRows(updated);
                                            }}
                                            className="w-16 pl-4 pr-1.5 py-0.5 border border-zinc-200 rounded-lg text-center text-xs font-semibold focus:border-[#0B57D0] outline-none shadow-2xs"
                                          />
                                        </div>
                                      </td>
                                    </>
                                  )}
                                  <td className="py-2.5 px-3 font-bold text-[#0B57D0]">${row.totalPayout.toFixed(2)}</td>
                                  <td className="py-2.5 px-3 text-zinc-600 font-semibold">{row.taskDetails}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Footer */}
                <div className="flex justify-between items-center pt-2 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatePayoutOpen(false);
                      setEditingPayoutId(null);
                    }}
                    className="px-4 py-2 border border-zinc-250 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 font-bold rounded text-xs cursor-pointer transition-colors shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePayout}
                    disabled={editedPayoutRows.length === 0 || isPayoutSaving}
                    className="px-5 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold rounded text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPayoutSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-zinc-400 border-t-white"></div>
                        Saving Payout...
                      </>
                    ) : (
                      <>
                        <Check size={14} className="stroke-[2.5]" />
                        Save Payout
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Paid Details Modal Overlay */}
            {paymentModalPayout && (
              <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
                <div className="w-[450px] bg-white rounded border border-zinc-200 shadow-2xl flex flex-col font-primary animate-in zoom-in-95 duration-150">
                  <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-150 rounded-t flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-655">Record Payout Payment</h3>
                    <button
                      type="button"
                      onClick={() => setPaymentModalPayout(null)}
                      className="p-1 hover:bg-zinc-250 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="p-5 flex flex-col gap-4 text-xs">
                    <div className="flex flex-col gap-1.5 p-3 bg-blue-50/40 border border-blue-100 rounded">
                      <div className="flex justify-between items-center text-zinc-655">
                        <span className="font-semibold">Promoter Name:</span>
                        <span className="font-bold text-zinc-800">{paymentModalPayout["Promoter Name"]}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-655">
                        <span className="font-semibold">Total Wage:</span>
                        <span className="font-bold text-[#0B57D0]">${Number(paymentModalPayout["Total Payout"])?.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-655 uppercase tracking-wider pl-0.5">Reference Number (Receipt Ref)</label>
                      <input
                        type="text"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="e.g. TXN9234857"
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-850 outline-none focus:border-[#0B57D0] shadow-2xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-655 uppercase tracking-wider pl-0.5">Payment Date</label>
                      <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-855 outline-none focus:border-[#0B57D0] shadow-2xs"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-zinc-655 uppercase tracking-wider pl-0.5">Upload Receipt Photo</label>
                      <div className="flex items-center gap-2">
                        <label className="h-8 px-3 rounded border border-zinc-300 bg-[#E5E5E5] text-zinc-700 hover:text-zinc-950 hover:bg-[#EEEEEE]/50 transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 font-bold text-[10px]">
                          <Upload size={12} />
                          {paymentReceiptFile ? "Change Receipt" : "Choose File"}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                setPaymentReceiptFile(files[0]);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[10px] text-zinc-500 font-semibold truncate max-w-[200px]">
                          {paymentReceiptFile ? paymentReceiptFile.name : "No file chosen"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-zinc-150 rounded-b flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentModalPayout(null)}
                      className="px-3.5 py-1.5 border border-zinc-250 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 font-bold rounded text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePayment}
                      disabled={isPaymentSaving || !paymentRef.trim() || !paymentDate || !paymentReceiptFile}
                      className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPaymentSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-zinc-400 border-t-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check size={14} className="stroke-[2.5]" />
                          Save Payment
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Confirmation Dialog Overlays */}
      {confirmConfig && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirmConfig.title}
          description={confirmConfig.description}
          variant={confirmConfig.variant || "dark"}
          onConfirm={confirmConfig.onConfirm}
        />
      )}

    </div>
  );
}
