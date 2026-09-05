"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { Eye, User, Calendar, ClipboardCheck, X, FileText, CheckCircle2, AlertCircle, Layers, History, Search, Printer, Plus, Check, Camera, Sparkles, Info } from "lucide-react";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";
import { NavigationTabs } from "../navigation-tabs";

interface InventoryModuleProps {
  profile?: {
    role: string;
    modules_access: string[];
    name?: string;
  } | null;
}

interface StockTakeItem {
  sku: string;
  qty: number;
  skipped: boolean;
}

interface ParsedLog {
  id: string;
  timestamp: number;
  dateStr: string;
  auditorId: string;
  itemsCount: number;
  items: StockTakeItem[];
}

export function InventoryModule({ profile }: InventoryModuleProps) {
  const [logs, setLogs] = React.useState<ParsedLog[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [trackOrders, setTrackOrders] = React.useState<any[]>([]);
  const [stockMovements, setStockMovements] = React.useState<any[]>([]);
  const [fetching, setFetching] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<"idle" | "syncing" | "synced">("idle");
  const [selectedLog, setSelectedLog] = React.useState<ParsedLog | null>(null);

  // Manual stock take submission modal state
  const [showSubmitModal, setShowSubmitModal] = React.useState(false);
  const [submitAuditDate, setSubmitAuditDate] = React.useState("");
  const [submitAuditTime, setSubmitAuditTime] = React.useState("");
  const [submitAuditor, setSubmitAuditor] = React.useState("Admin");
  const [stockTakeForm, setStockTakeForm] = React.useState<Record<string, { qty: number | string; skipped: boolean }>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isScanning, setIsScanning] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sub-tabs: "stock" or "logs"
  const [subTab, setSubTab] = React.useState<"stock" | "logs">("stock");

  // Filters state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchAuditor, setSearchAuditor] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [selectedBrand, setSelectedBrand] = React.useState("all");

  const tabsListItems = React.useMemo(() => [
    { id: "stock", label: "Current Stock Levels" },
    { id: "logs", label: "Audit Logs History" }
  ], []);

  // Get latest log date formatted as dd/mm/yyyy
  const latestLogDateStr = React.useMemo(() => {
    if (logs.length === 0) return "";
    const date = new Date(logs[0].timestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, [logs]);

  // Helper to format date to dd/mm/yyyy hh:mm
  const formatDateTime = (epoch: number) => {
    if (!epoch) return "N/A";
    const date = new Date(epoch);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Helper to lookup user details by ID/PIN/code
  const lookupUser = React.useCallback((userId: string) => {
    if (!userId || userId === "Unknown") return "Unknown";
    const user = users.find(u => String(u.id || u.ID || u.PIN || u.pin || "").trim().toLowerCase() === String(userId).trim().toLowerCase());
    return user ? (user.Name || user.name || userId) : userId;
  }, [users]);

  // Helper to lookup product details by SKU
  const lookupProduct = React.useCallback((sku: string) => {
    const prod = products.find(p => String(p.sku || p.SKU || p.Code || "").trim().toLowerCase() === String(sku).trim().toLowerCase());
    if (prod) {
      const brandId = String(prod.brands_id || prod["Brands ID"] || prod.Brands_ID || prod.brandId || "").trim();
      const brandObj = brands.find(b => String(b.id || b.ID || "").trim().toLowerCase() === brandId.toLowerCase());
      const brandName = brandObj ? (brandObj.display_name || brandObj["Display Name"] || brandObj.Display_Name || brandObj.name || brandId) : (brandId || "Unbranded");
      const category = String(prod.product_meta?.Category || prod.product_meta?.category || prod.category || prod.Category || prod["Category"] || "").trim();

      return {
        name: prod.display_name || prod["Display Name"] || prod.Display_Name || prod.productName || prod.Name || "Unknown Product",
        brand: brandName,
        category,
        uom: Number(prod.carton || prod.Carton || prod.uom || prod.UOM) || 1
      };
    }
    return { name: "Unknown Product", brand: "N/A", category: "", uom: 1 };
  }, [products, brands]);

  // Group all products by brand for manual stock take modal
  const productsByBrand = React.useMemo(() => {
    // Map brand ID to brand metadata
    const brandMap: Record<string, { id: string; name: string; rank: number }> = {};
    brands.forEach((b: any) => {
      const bId = String(b.id || b.ID || "").trim();
      if (!bId) return;
      const bName = String(b.display_name || b["Display Name"] || b.Display_Name || b.name || bId).trim();
      const bRank = Number(b.rank || b.Rank || 999);
      brandMap[bId.toLowerCase()] = { id: bId, name: bName, rank: isNaN(bRank) ? 999 : bRank };
    });

    // Group items by combined Brand Display Name
    const groupsByName: Record<string, {
      brandName: string;
      minBrandId: string;
      minRank: number;
      items: Array<{ sku: string; name: string; uom: number; brandId: string }>;
    }> = {};

    products.forEach((p: any) => {
      const status = String(p.status || p.Status || "").trim().toLowerCase();
      if (status !== "active") return;

      const rawSku = String(p.sku || p.SKU || p.Code || "").trim();
      if (!rawSku) return;

      const rawBrandId = String(p.brands_id || p["Brands ID"] || p.Brands_ID || p.brandId || "").trim();
      const bMeta = brandMap[rawBrandId.toLowerCase()];
      const brandName = bMeta ? bMeta.name : (rawBrandId || "Unbranded");
      const brandRank = bMeta ? bMeta.rank : 999;
      const brandKey = brandName.toLowerCase();

      const name = p.display_name || p["Display Name"] || p.Display_Name || p.productName || p.Name || "Unknown Product";
      const uom = Number(p.carton || p.Carton || p.uom || p.UOM) || 1;

      if (!groupsByName[brandKey]) {
        groupsByName[brandKey] = {
          brandName,
          minBrandId: rawBrandId,
          minRank: brandRank,
          items: []
        };
      } else {
        if (brandRank < groupsByName[brandKey].minRank) {
          groupsByName[brandKey].minRank = brandRank;
        }
        if (rawBrandId && (!groupsByName[brandKey].minBrandId || rawBrandId < groupsByName[brandKey].minBrandId)) {
          groupsByName[brandKey].minBrandId = rawBrandId;
        }
      }

      groupsByName[brandKey].items.push({
        sku: rawSku,
        name,
        uom,
        brandId: rawBrandId
      });
    });

    // Sort products inside each group by brandId, then by SKU
    Object.values(groupsByName).forEach(group => {
      group.items.sort((a, b) => {
        if (a.brandId !== b.brandId) {
          return a.brandId.localeCompare(b.brandId, undefined, { numeric: true });
        }
        return a.sku.localeCompare(b.sku, undefined, { numeric: true });
      });
    });

    // Sort brand groups by brand ID / rank
    const sortedGroups = Object.values(groupsByName).sort((a, b) => {
      if (a.minRank !== b.minRank) return a.minRank - b.minRank;
      if (a.minBrandId && b.minBrandId) {
        return a.minBrandId.localeCompare(b.minBrandId, undefined, { numeric: true });
      }
      return a.brandName.localeCompare(b.brandName);
    });

    return sortedGroups;
  }, [products, brands]);

  // Helper for current Singapore Date & Time
  const getSingaporeDateTime = () => {
    const now = new Date();
    const sgDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(now);

    const sgTimeStr = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Singapore",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(now);

    return { date: sgDateStr, time: sgTimeStr };
  };

  // Open manual stock take submission modal
  const handleOpenSubmitModal = () => {
    const { date, time } = getSingaporeDateTime();

    setSubmitAuditDate(date);
    setSubmitAuditTime(time);
    setSubmitAuditor(profile?.name || "Admin");

    const initialForm: Record<string, { qty: number | string; skipped: boolean }> = {};
    products.forEach(p => {
      const status = String(p.status || p.Status || "").trim().toLowerCase();
      if (status !== "active") return;

      const rawSku = String(p.sku || p.SKU || p.Code || "").trim();
      if (rawSku) {
        initialForm[rawSku.toLowerCase()] = { qty: "", skipped: false };
      }
    });
    setStockTakeForm(initialForm);
    setShowSubmitModal(true);
  };

  // Submit manual stock take to backend
  const handleSubmitStockTake = async () => {
    if (!submitAuditDate) {
      showToast("Please select the audit date", "error");
      return;
    }
    if (!submitAuditor.trim()) {
      showToast("Please specify the auditor name", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const sgNow = getSingaporeDateTime();
      const currentSec = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Singapore", second: "2-digit" }).format(new Date());
      
      const timePart = (submitAuditTime && submitAuditTime.trim() !== "00:00" && submitAuditTime.trim() !== "") 
        ? submitAuditTime.trim() 
        : sgNow.time;
      
      const fullTimeStr = timePart.includes(":") && timePart.split(":").length === 2 
        ? `${timePart}:${currentSec}` 
        : timePart;
      
      // Parse ISO with Singapore GMT+8 (+08:00)
      const isoStr = `${submitAuditDate}T${fullTimeStr}+08:00`;
      let selectedTimestamp = new Date(isoStr).getTime();
      if (isNaN(selectedTimestamp) || selectedTimestamp <= 0) {
        selectedTimestamp = Date.now();
      }

      const itemsList = products
        .filter(p => String(p.status || p.Status || "").trim().toLowerCase() === "active")
        .map(p => {
          const rawSku = String(p.sku || p.SKU || p.Code || "").trim();
          const normSku = rawSku.toLowerCase();
          const entry = stockTakeForm[normSku] || { qty: 0, skipped: false };
          return {
            sku: rawSku,
            qty: entry.skipped ? 0 : (Number(entry.qty) || 0),
            skipped: Boolean(entry.skipped)
          };
        }).filter(i => i.sku);

      if (itemsList.length === 0) {
        showToast("No products available to submit", "error");
        setIsSubmitting(false);
        return;
      }

      const logPayload = {
        timestamp: selectedTimestamp,
        audit_by: submitAuditor.trim(),
        audit: itemsList
      };

      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/inventory/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logPayload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server returned ${res.status}`);
      }

      showToast("Stock take submitted successfully!", "success");
      setShowSubmitModal(false);
      await fetchFreshData(true);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to submit stock take: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scanned Paper PDF Parser
  const handleScanPaper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      showToast("Please select a PDF file containing the scanned paper.", "warning");
      return;
    }

    setIsScanning(true);
    showToast("Reading scanned PDF document...", "info");

    try {
      // Read PDF file as base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const cleanBase64 = result.replace(/^data:[^;]+;base64,/, "");
          resolve(cleanBase64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/inventory/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf: base64Data,
          type: "application/pdf"
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server returned ${res.status}`);
      }

      const resData = await res.json();
      const scannedItems: Array<{ sku: string; actual_qty?: number; qty?: number; skipped?: boolean }> = resData.items || [];

      if (scannedItems.length === 0) {
        showToast("No product SKUs found in scanned PDF. Please check document clarity.", "warning");
        return;
      }

      let matchedCount = 0;
      setStockTakeForm(prev => {
        const next = { ...prev };
        scannedItems.forEach(item => {
          const scannedSku = String(item.sku || "").trim().toLowerCase();
          if (!scannedSku) return;

          // Match against catalog products
          const matchedProd = products.find(p => {
            const pSku = String(p.sku || p.SKU || p.Code || "").trim().toLowerCase();
            return pSku === scannedSku || pSku.replace(/[^a-z0-9]/g, "") === scannedSku.replace(/[^a-z0-9]/g, "");
          });

          if (matchedProd) {
            const realSku = String(matchedProd.sku || matchedProd.SKU || matchedProd.Code || "").trim().toLowerCase();
            const qtyVal = item.actual_qty !== undefined ? item.actual_qty : (item.qty !== undefined ? item.qty : "");
            const isSkipped = Boolean(item.skipped);
            next[realSku] = {
              qty: isSkipped ? "" : (qtyVal !== "" ? Number(qtyVal) : ""),
              skipped: isSkipped
            };
            matchedCount++;
          }
        });
        return next;
      });

      showToast(`Successfully extracted and matched ${matchedCount} SKUs from paper!`, "success");
    } catch (err: any) {
      console.error("Scan error:", err);
      showToast("Scan failed: " + (err.message || String(err)), "error");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Reusable parser to parse raw logs row items case-insensitively
  const parseLogs = React.useCallback((rawData: any[]): ParsedLog[] => {
    return rawData.map((row: any, index: number) => {
      // Find keys case-insensitively
      const auditKey = Object.keys(row).find(k => k.trim().toLowerCase() === "audit");
      const timestampKey = Object.keys(row).find(k => k.trim().toLowerCase() === "timestamp");
      const auditByKey = Object.keys(row).find(k => k.trim().toLowerCase() === "audit by" || k.trim().toLowerCase() === "audit_by");

      const rawAudit = auditKey ? row[auditKey] : null;
      const rawTimestamp = timestampKey ? row[timestampKey] : null;
      const rawAuditBy = auditByKey ? row[auditByKey] : null;

      let items: StockTakeItem[] = [];
      try {
        if (rawAudit) {
          const parsedAudit = typeof rawAudit === "string" ? JSON.parse(rawAudit) : rawAudit;
          if (Array.isArray(parsedAudit)) {
            items = parsedAudit.map((item: any) => {
              const skuKey = Object.keys(item).find(k => k.trim().toLowerCase() === "sku") || "sku";
              const qtyKey = Object.keys(item).find(k => k.trim().toLowerCase() === "qty") || "qty";
              const skippedKey = Object.keys(item).find(k => k.trim().toLowerCase() === "skipped") || "skipped";

              return {
                sku: String(item[skuKey] || "").trim(),
                qty: Number(item[qtyKey]) || 0,
                skipped: !!item[skippedKey]
              };
            });
          }
        }
      } catch (e) {
        console.warn("Failed to parse Audit items", e);
      }

      const epoch = Number(rawTimestamp) || Date.now();

      return {
        id: String(rawTimestamp || index),
        timestamp: epoch,
        dateStr: formatDateTime(epoch),
        auditorId: String(rawAuditBy || "Unknown").trim(),
        itemsCount: items.length,
        items
      };
    });
  }, []);

  const fetchFreshData = async (forceSync = false) => {
    setFetching(true);
    if (forceSync) {
      setSyncStatus("syncing");
    }

    try {
      // Fetch fresh live data without any local cache
      const [brandRes, prodRes, usersRes, logsRes, toRes, smRes] = await Promise.all([
        fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/inventory/brands", { cache: "no-store" }),
        fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/inventory/products", { cache: "no-store" }),
        fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/inventory/users", { cache: "no-store" }),
        fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/inventory/logs", { cache: "no-store" }),
        fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", { cache: "no-store" }).catch(() => null),
        fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/app4/stock-movement", { cache: "no-store" }).catch(() => null)
      ]);

      if (brandRes && brandRes.ok) {
        const brandList = await brandRes.json();
        setBrands(Array.isArray(brandList) ? brandList : []);
      }

      if (prodRes && prodRes.ok) {
        const prodList = await prodRes.json();
        setProducts(Array.isArray(prodList) ? prodList : []);
      }

      if (usersRes && usersRes.ok) {
        const userList = await usersRes.json();
        setUsers(Array.isArray(userList) ? userList : []);
      }

      if (logsRes && logsRes.ok) {
        const rawLogs = await logsRes.json();
        const parsed = parseLogs(Array.isArray(rawLogs) ? rawLogs : []);
        parsed.sort((a, b) => b.timestamp - a.timestamp);
        setLogs(parsed);
      }

      if (toRes && toRes.ok) {
        const toData = await toRes.json();
        if (Array.isArray(toData)) {
          setTrackOrders(toData);
        }
      }

      if (smRes && smRes.ok) {
        const smData = await smRes.json();
        if (Array.isArray(smData)) {
          setStockMovements(smData);
        }
      }

      if (forceSync) {
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 2000);
      }
    } catch (err: any) {
      console.error(err);
      showToast("Failed to fetch stock data: " + err.message, "error");
      setSyncStatus("idle");
    } finally {
      setFetching(false);
    }
  };

  // Always fetch fresh live data on mount
  React.useEffect(() => {
    fetchFreshData(false);
  }, []);

  // Listen for the global db-refresh event
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      await fetchFreshData(true);
      showToast("Inventory log refreshed!", "success");
    };

    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, []);

  // Compute Brand list for dropdown filter
  const brandsList = React.useMemo(() => {
    const set = new Set<string>();
    brands.forEach(b => {
      const name = b.display_name || b["Display Name"] || b.Display_Name || b.name || b.id || b.ID;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [brands]);

  // Helper to format carton / loose for positive and negative numbers
  const formatCartonLoose = (qty: number, uom: number) => {
    if (!uom || uom <= 0) uom = 1;
    const absQty = Math.abs(qty);
    const cartons = Math.floor(absQty / uom);
    const loose = absQty % uom;
    const sign = qty < 0 ? "-" : "";

    if (cartons > 0 && loose > 0) {
      return `${sign}${cartons}ctn ${loose}pcs`;
    } else if (cartons > 0) {
      return `${sign}${cartons}ctn`;
    } else {
      return `${sign}${loose}pcs`;
    }
  };

  // Compute Current Stock levels: products grouped by combined brand, with latest stock take quantity & deductions
  const currentStockLevels = React.useMemo(() => {
    // 1. Map SKU -> latest count info (newest count overrides older count)
    const latestCounts: Record<string, { qty: number; timestamp: number; dateStr: string; auditorId: string; skipped: boolean }> = {};

    // Sort logs oldest to newest so that newer ones overwrite older ones
    const sortedLogsAsc = [...logs].sort((a, b) => a.timestamp - b.timestamp);
    sortedLogsAsc.forEach(log => {
      log.items.forEach(item => {
        if (item.sku) {
          const normSku = String(item.sku).trim().toLowerCase();
          latestCounts[normSku] = {
            qty: item.qty,
            timestamp: log.timestamp,
            dateStr: log.dateStr,
            auditorId: log.auditorId,
            skipped: item.skipped
          };
        }
      });
    });

    // Map brand ID to brand metadata
    const brandMap: Record<string, { id: string; name: string; rank: number }> = {};
    brands.forEach((b: any) => {
      const bId = String(b.id || b.ID || "").trim();
      if (!bId) return;
      const bName = String(b.display_name || b["Display Name"] || b.Display_Name || b.name || bId).trim();
      const bRank = Number(b.rank || b.Rank || 999);
      brandMap[bId.toLowerCase()] = { id: bId, name: bName, rank: isNaN(bRank) ? 999 : bRank };
    });

    // 2. Group products by combined brand name
    const groupsByName: Record<string, {
      brandName: string;
      minBrandId: string;
      minRank: number;
      items: Array<{
        sku: string;
        name: string;
        uom: number;
        brandId: string;
        category?: string;
        qty: number;
        dateStr: string;
        auditor: string;
        hasRecord: boolean;
        skipped: boolean;
      }>;
    }> = {};

    products.forEach(p => {
      const status = String(p.status || p.Status || "").trim().toLowerCase();
      if (status !== "active") return;

      const rawSku = p.sku || p.SKU || p.Code || "";
      const sku = String(rawSku).trim();
      const normSku = sku.toLowerCase();

      // Resolve Brand Name from Brands ID using brands_DB
      const rawBrandId = String(p.brands_id || p["Brands ID"] || p.Brands_ID || p.brandId || "").trim();
      const bMeta = brandMap[rawBrandId.toLowerCase()];
      const brand = bMeta ? bMeta.name : (rawBrandId || "Unbranded");
      const brandRank = bMeta ? bMeta.rank : 999;
      const brandKey = brand.toLowerCase();

      const name = p.display_name || p["Display Name"] || p.Display_Name || p.productName || p.Name || "Unknown Product";
      const uom = Number(p.carton || p.Carton || p.uom || p.UOM) || 1;

      // Filter by search query if present
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSku = sku.toLowerCase().includes(query);
        const matchesName = name.toLowerCase().includes(query);
        if (!matchesSku && !matchesName) return;
      }

      // Filter by brand if selected
      if (selectedBrand !== "all" && brand.toLowerCase() !== selectedBrand.toLowerCase()) {
        return;
      }

      const count = latestCounts[normSku];

      // Math deduction calculation:
      // (A) = count.qty
      // (B) = track_orders delivered after stocktake date (type not return)
      // (C) = stock_movement out/transfer after stocktake date
      // (D) = A - (B + C)
      let finalQty = 0;
      let hasRecord = false;
      let skipped = false;
      let dateStr = "N/A";
      let auditor = "N/A";

      if (count) {
        hasRecord = true;
        skipped = count.skipped;
        dateStr = count.dateStr;
        auditor = lookupUser(count.auditorId);
        const A = count.qty;

        // (B) Track Orders deduction
        let B = 0;
        trackOrders.forEach(order => {
          const type = String(order.type || "").trim().toLowerCase();
          const status = String(order.status || "").trim().toLowerCase();
          if (type !== "return" && status === "delivered") {
            let deliveredTs = Number(order.delivered_at) || 0;
            if (!deliveredTs) {
              try {
                const logsArr = typeof order.logs === "string" ? JSON.parse(order.logs) : (order.logs || []);
                const match = logsArr.find((l: any) => l.action && l.action.toLowerCase().includes("delivered"));
                if (match) deliveredTs = Number(match.timestamp) || 0;
              } catch (_) {}
            }
            if (!deliveredTs) {
              deliveredTs = Number(order.timestamp) || 0;
            }

            if (deliveredTs > count.timestamp) {
              try {
                const items = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []);
                if (Array.isArray(items)) {
                  items.forEach((it: any) => {
                    const itSku = String(it.sku || it.Code || it.code || "").trim().toLowerCase();
                    if (itSku === normSku) {
                      B += Number(it.qty || it.quantity || 0) || 0;
                    }
                  });
                }
              } catch (_) {}
            }
          }
        });

        // (C) Stock Movement deduction (Stock Out & Transfer)
        let C = 0;
        stockMovements.forEach(m => {
          const act = String(m.action_type || m.reference?.action_type || m.reference?.action || "").trim().toLowerCase();
          if (act.includes("out") || act.includes("transfer")) {
            const moveTs = Number(m.timestamp) || 0;
            if (moveTs > count.timestamp) {
              try {
                const mItems = Array.isArray(m.items) ? m.items : (typeof m.items === "string" ? JSON.parse(m.items) : []);
                if (Array.isArray(mItems)) {
                  mItems.forEach((it: any) => {
                    const itSku = String(it.sku || it.Code || it.code || "").trim().toLowerCase();
                    if (itSku === normSku) {
                      C += Number(it.qty || it.quantity || 0) || 0;
                    }
                  });
                }
              } catch (_) {}
            }
          }
        });

        finalQty = A - (B + C);
      }

      if (!groupsByName[brandKey]) {
        groupsByName[brandKey] = {
          brandName: brand,
          minBrandId: rawBrandId,
          minRank: brandRank,
          items: []
        };
      } else {
        if (brandRank < groupsByName[brandKey].minRank) {
          groupsByName[brandKey].minRank = brandRank;
        }
        if (rawBrandId && (!groupsByName[brandKey].minBrandId || rawBrandId < groupsByName[brandKey].minBrandId)) {
          groupsByName[brandKey].minBrandId = rawBrandId;
        }
      }

      const category = String(
        p.product_meta?.Category ||
        p.product_meta?.category ||
        (typeof p.product_meta === "string" ? (() => { try { return JSON.parse(p.product_meta).Category || ""; } catch (_) { return ""; } })() : "") ||
        p.category ||
        p.Category ||
        p["Category"] ||
        ""
      ).trim();

      groupsByName[brandKey].items.push({
        sku,
        name,
        uom,
        brandId: rawBrandId,
        category,
        qty: finalQty,
        dateStr,
        auditor,
        hasRecord,
        skipped
      });
    });

    // Sort products inside each group by brandId, then by SKU
    Object.values(groupsByName).forEach(group => {
      group.items.sort((a, b) => {
        if (a.brandId !== b.brandId) {
          return a.brandId.localeCompare(b.brandId, undefined, { numeric: true });
        }
        return a.sku.localeCompare(b.sku, undefined, { numeric: true });
      });
    });

    // Sort brand groups by brand ID / rank
    const sortedGroups = Object.values(groupsByName).sort((a, b) => {
      if (a.minRank !== b.minRank) return a.minRank - b.minRank;
      if (a.minBrandId && b.minBrandId) {
        return a.minBrandId.localeCompare(b.minBrandId, undefined, { numeric: true });
      }
      return a.brandName.localeCompare(b.brandName);
    });

    return sortedGroups;
  }, [logs, products, brands, trackOrders, stockMovements, searchQuery, selectedBrand, lookupUser]);

  // Filter logs based on inputs (for history tab)
  const filteredLogs = React.useMemo(() => {
    return logs.filter(log => {
      const auditorName = lookupUser(log.auditorId);
      if (searchAuditor && !auditorName.toLowerCase().includes(searchAuditor.toLowerCase())) {
        return false;
      }
      if (startDate) {
        const filterStart = new Date(startDate).setHours(0, 0, 0, 0);
        if (log.timestamp < filterStart) return false;
      }
      if (endDate) {
        const filterEnd = new Date(endDate).setHours(23, 59, 59, 999);
        if (log.timestamp > filterEnd) return false;
      }
      return true;
    });
  }, [logs, searchAuditor, startDate, endDate, lookupUser]);

  const columns: Column[] = [
    { id: "dateStr", header: "Audit Date/Time", accessor: "dateStr" },
    { id: "auditor", header: "Audited By", accessor: "auditor" },
    { id: "itemsCount", header: "Unique SKU Counted", accessor: "itemsCount" },
    { id: "actions", header: "Action", accessor: "actions" }
  ];

  const logsTableData = React.useMemo(() => {
    return filteredLogs.map(log => ({
      id: log.id,
      dateStr: log.dateStr,
      auditor: lookupUser(log.auditorId),
      itemsCount: log.itemsCount,
      actions: (
        <button
          type="button"
          onClick={() => setSelectedLog(log)}
          className="hover:text-blue-800 hover:underline inline-flex items-center gap-1.5 font-bold cursor-pointer text-blue-600 bg-transparent border-0 p-0 focus:outline-none text-[11px]"
        >
          <Eye size={13} className="text-blue-500" />
          <span>View Details</span>
        </button>
      )
    }));
  }, [filteredLogs, lookupUser]);

  // Print function helper: simple stock count sheet
  const generatePrintReport = (stockLevels: typeof currentStockLevels) => {
    // Flatten and sort products by Category, then Brand Name, then Brand ID, then SKU
    const allItems: Array<{
      sku: string;
      name: string;
      category: string;
      brandName: string;
      brandId: string;
      qty: number;
      hasRecord: boolean;
    }> = [];

    stockLevels.forEach(group => {
      group.items.forEach(item => {
        allItems.push({
          sku: item.sku,
          name: item.name,
          category: item.category || "",
          brandName: group.brandName,
          brandId: item.brandId,
          qty: item.qty,
          hasRecord: item.hasRecord
        });
      });
    });

    // Sort by category first, then by brand name, then if same brand name sort by brand id, then SKU
    allItems.sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category, undefined, { sensitivity: "base" });
      if (catCompare !== 0) return catCompare;
      const brandCompare = a.brandName.localeCompare(b.brandName, undefined, { sensitivity: "base" });
      if (brandCompare !== 0) return brandCompare;
      const brandIdCompare = (a.brandId || "").localeCompare(b.brandId || "", undefined, { numeric: true });
      if (brandIdCompare !== 0) return brandIdCompare;
      return a.sku.localeCompare(b.sku, undefined, { numeric: true });
    });

    const rowsHtml = allItems.map((item, idx) => {
      const systemQtyText = `${item.hasRecord ? item.qty : 0} pcs`;
      return `
        <tr>
          <td class="col-num">${idx + 1}</td>
          <td class="col-sku font-mono">${item.sku}</td>
          <td class="col-desc">${item.name}</td>
          <td class="col-sys-qty text-right font-mono">${systemQtyText}</td>
          <td class="col-actual-qty"></td>
        </tr>
      `;
    }).join("");

    const printDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>HSG Global - Stock Count Sheet</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            line-height: 1.4;
            font-size: 11px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .header h1 {
            font-size: 18px;
            font-weight: 800;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .header .meta {
            font-size: 10px;
            color: #475569;
            font-weight: 600;
            text-align: right;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
            text-align: left;
            vertical-align: middle;
          }
          th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9.5px;
            letter-spacing: 0.5px;
          }
          .col-num {
            width: 32px;
            text-align: center;
            color: #64748B;
            font-size: 10px;
          }
          .col-sku {
            width: 140px;
            font-weight: 600;
            color: #0f172a;
          }
          .col-desc {
            color: #1e293b;
          }
          .col-sys-qty {
            width: 110px;
            font-weight: 700;
            color: #0f172a;
          }
          .col-actual-qty {
            width: 120px;
            background-color: #ffffff;
          }
          .text-right {
            text-align: right;
          }
          .font-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          tr:nth-child(even) td:not(.col-actual-qty) {
            background-color: #f8fafc;
          }
          @media print {
            body {
              padding: 0;
            }
            tr {
              page-break-inside: avoid;
            }
            thead {
              display: table-header-group;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>HSG Global - Stock Count Sheet</h1>
          </div>
          <div class="meta">
            <div>Printed Date: ${printDate}</div>
            <div>Total Items: ${allItems.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="col-num">#</th>
              <th class="col-sku">SKU</th>
              <th class="col-desc">Description</th>
              <th class="col-sys-qty text-right">System Qty</th>
              <th class="col-actual-qty">Actual Qty</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          }
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([printHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // Handler to print overall current inventory status
  const handlePrintStockReport = () => {
    generatePrintReport(currentStockLevels);
  };

  // Handler to print a specific audit log from history
  const handlePrintLogReport = (log: ParsedLog) => {
    const auditorName = lookupUser(log.auditorId);
    
    // Group this log's items by brand
    const groupsByName: Record<string, {
      brandName: string;
      minBrandId: string;
      minRank: number;
      items: Array<{
        sku: string;
        name: string;
        uom: number;
        brandId: string;
        category?: string;
        qty: number;
        dateStr: string;
        auditor: string;
        hasRecord: boolean;
        skipped: boolean;
      }>;
    }> = {};

    log.items.forEach(item => {
      const prodInfo = lookupProduct(item.sku);
      const prod = products.find(p => String(p.sku || p.SKU || p.Code || "").trim().toLowerCase() === String(item.sku).trim().toLowerCase());
      const rawBrandId = prod ? String(prod.brands_id || prod["Brands ID"] || prod.Brands_ID || prod.brandId || "").trim() : "";
      const category = prodInfo.category || (prod ? String(prod.category || prod.Category || prod["Category"] || "").trim() : "");
      const brand = prodInfo.brand || "Unbranded";
      const brandKey = brand.toLowerCase();
      
      if (!groupsByName[brandKey]) {
        groupsByName[brandKey] = {
          brandName: brand,
          minBrandId: rawBrandId,
          minRank: 999,
          items: []
        };
      }
      
      groupsByName[brandKey].items.push({
        sku: item.sku,
        name: prodInfo.name,
        uom: prodInfo.uom,
        brandId: rawBrandId,
        category,
        qty: item.qty,
        dateStr: log.dateStr,
        auditor: auditorName,
        hasRecord: true,
        skipped: item.skipped
      });
    });

    const stockLevels = Object.values(groupsByName);
    generatePrintReport(stockLevels);
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* Headless component to project the sub-tabs into TopBar (with no icons) */}
      <NavigationTabs
        tabs={tabsListItems}
        activeTabId={subTab}
        onTabSelect={(id) => setSubTab(id as "stock" | "logs")}
      />

      {/* 1. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            {subTab === "stock" ? "Inventory & Current Stock Levels" : "Stock Audit Records Database"}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {subTab === "stock"
              ? (latestLogDateStr 
                  ? `Current stock is counted from the last physical stock take (${latestLogDateStr}), adjusted (+/-) for all subsequent stock movements.`
                  : "Current stock is counted from the last physical stock take, adjusted (+/-) for all subsequent stock movements.")
              : "Historical ledger of all manual and warehouse physical stock take counts."}
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2">
          {subTab === "stock" && (
            <CustomButton
              onClick={handlePrintStockReport}
              variant="secondary"
              className="h-8 px-3 text-xs rounded-lg border-slate-300 hover:bg-slate-50 text-zinc-800"
              title="Print current stock inventory report"
            >
              <Printer className="w-3.5 h-3.5 mr-1 text-zinc-600" />
              Print Report
            </CustomButton>
          )}

          <CustomButton
            onClick={handleOpenSubmitModal}
            variant="dark"
            className="h-8 px-3 text-xs rounded-lg bg-[#0B57D0] hover:bg-[#0842A0]"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Submit Stock Take
          </CustomButton>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR */}
      <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          {subTab === "stock" ? (
            <div className="flex items-center gap-1.5 text-xs text-zinc-650">
              <Info className="w-3.5 h-3.5 text-[#0B57D0] shrink-0" />
              <span className="text-zinc-600 font-medium text-[11px] sm:text-xs">
                Counted by <strong className="text-zinc-900 font-bold">last stock take</strong> and <strong className="text-zinc-900 font-bold">(+/-) movements</strong> recorded after stock take.
              </span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-zinc-700">Filter Logs:</span>
          )}
        </div>

        {subTab === "stock" ? (
          // Stock Tab Filters
          <div className="flex flex-wrap items-center gap-3">
            {(searchQuery || selectedBrand !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedBrand("all");
                }}
                className="text-xs text-zinc-500 hover:text-zinc-800 underline font-semibold transition-colors cursor-pointer whitespace-nowrap mr-1"
                title="Clear filters"
              >
                Clear Filters
              </button>
            )}

            {/* Search Input */}
            <div className="relative w-52">
              <input
                type="text"
                placeholder="Search Product / SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded p-1.5 pl-7 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 h-9"
              />
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>

            {/* Brand Dropdown Filter */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-white border border-zinc-300 rounded p-1.5 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 h-9"
            >
              <option value="all">All Brands</option>
              {brandsList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        ) : (
          // Logs Tab Filters
          <div className="flex flex-wrap items-center gap-3">
            {(searchAuditor || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchAuditor("");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs text-zinc-500 hover:text-zinc-800 underline font-semibold transition-colors cursor-pointer whitespace-nowrap mr-1"
                title="Clear filters"
              >
                Clear Filters
              </button>
            )}

            {/* Search Auditor Input */}
            <div className="relative w-44">
              <input
                type="text"
                placeholder="Search Auditor..."
                value={searchAuditor}
                onChange={(e) => setSearchAuditor(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded p-1.5 pl-7 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 h-9"
              />
              <User size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>

            {/* Range Inputs */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold">
              <Calendar size={12} className="text-zinc-400" />
              <span>Range</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-zinc-300 rounded p-1.5 font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 h-9 text-xs"
              />
              <span className="mx-0.5 text-zinc-400 font-normal">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-zinc-300 rounded p-1.5 font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 h-9 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main View Area */}
      <div className={`flex-1 min-h-0 ${subTab === "stock" ? "overflow-y-auto p-4 bg-[#F8F9FA]/40" : "overflow-hidden flex flex-col h-full"}`}>
        {fetching && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500" />
            <span className="text-xs font-semibold">Loading stock take data...</span>
          </div>
        ) : subTab === "stock" ? (
          // 1. Current Stock Levels View (Grouped by Brand - Masonry Columns Layout)
          <div className="columns-1 xl:columns-2 gap-4 pb-2 [column-fill:balance]">
            {currentStockLevels.length === 0 ? (
              <div className="flex items-center justify-center h-48 bg-[#F0F4F9] border border-dashed border-slate-200 rounded select-none w-full">
                <span className="font-primary text-sm text-zinc-500 italic">
                  No matching products found.
                </span>
              </div>
            ) : (
              currentStockLevels.map(({ brandName, items: brandItems }) => (
                <div key={brandName} className="break-inside-avoid bg-white border border-slate-200 rounded p-4 shadow-xs flex flex-col gap-3 mb-6">
                  {/* Brand Header */}
                  <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
                    <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">{brandName}</span>
                    <span className="text-[10px] font-bold text-zinc-400 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 uppercase tracking-wider">
                      {brandItems.length} {brandItems.length === 1 ? "Product" : "Products"}
                    </span>
                  </div>

                  {/* Brand Products Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">SKU Code</th>
                          <th className="py-2.5 px-3">Product Name</th>
                          <th className="py-2.5 px-3 text-right">Current Stock</th>
                          <th className="py-2.5 px-3 text-right">Carton/Loose</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150 text-xs">
                        {brandItems.map((item) => {
                          const displayCartonLoose = item.hasRecord ? formatCartonLoose(item.qty, item.uom) : "-";

                          return (
                            <tr key={item.sku} className="hover:bg-slate-50 text-zinc-800">
                              <td className="py-2 px-3 text-zinc-600 font-medium">{item.sku}</td>
                              <td className="py-2 px-3 text-zinc-900 truncate max-w-[150px]" title={item.name}>{item.name}</td>
                              <td className="py-2 px-3 text-right">
                                {item.hasRecord ? (
                                  <span className="text-zinc-800 font-medium">
                                    {item.qty}{item.skipped ? "*" : ""} pcs
                                  </span>
                                ) : (
                                  <span className="text-zinc-400 font-normal italic">No count recorded</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {item.hasRecord ? (
                                  <span className="text-zinc-600">{displayCartonLoose}</span>
                                ) : (
                                  <span className="text-zinc-400 font-normal italic">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // 2. Logs Table View
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col h-full">
            <DataTable
              columns={columns}
              data={logsTableData}
              title="Stock Audit Records"
              userRole="viewer"
              fetching={fetching}
              syncStatus={syncStatus}
              height="h-full"
            />
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-6 animate-fadeIn animate-duration-150">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-lg p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden animate-scaleIn animate-duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2 text-zinc-800">
                <FileText size={18} className="text-blue-500" />
                <h3 className="text-base font-bold">Audit Report Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Subheader Details */}
            <div className="grid grid-cols-2 gap-4 bg-[#F0F4F9]/50 border border-slate-200/50 rounded-lg p-4 text-xs font-semibold text-zinc-700">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium uppercase tracking-wider">Audited By:</span>
                <span className="text-zinc-900 font-bold">{lookupUser(selectedLog.auditorId)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium uppercase tracking-wider">Timestamp:</span>
                <span className="text-zinc-900 font-bold">{selectedLog.dateStr}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-grow overflow-y-auto border border-zinc-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">SKU Code</th>
                    <th className="py-2.5 px-4">Product Name</th>
                    <th className="py-2.5 px-4">Brand</th>
                    <th className="py-2.5 px-4 text-right">Counted Qty</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs">
                  {selectedLog.items.map((item, idx) => {
                    const prodInfo = lookupProduct(item.sku);
                    const cartons = Math.floor(item.qty / prodInfo.uom);
                    const loose = item.qty % prodInfo.uom;
                    let displayQty = `${item.qty} pcs`;
                    if (cartons > 0 && loose > 0) {
                      displayQty = `${cartons} ctn, ${loose} pcs`;
                    } else if (cartons > 0) {
                      displayQty = `${cartons} ctn`;
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50 text-zinc-800">
                        <td className="py-2 px-4 text-zinc-600 font-medium">{item.sku}</td>
                        <td className="py-2 px-4 max-w-[200px] truncate text-zinc-900" title={prodInfo.name}>
                          {prodInfo.name}
                        </td>
                        <td className="py-2 px-4 text-zinc-500">{prodInfo.brand}</td>
                        <td className={`py-2 px-4 text-right ${item.skipped ? "text-red-600 font-medium" : "text-zinc-800"}`}>{displayQty}</td>
                        <td className="py-2 px-4 text-center">
                          {item.skipped ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] text-amber-600 font-bold">
                              <AlertCircle size={10} />
                              <span>Skipped</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-600 font-bold">
                              <CheckCircle2 size={10} />
                              <span>Counted</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-3 border-t border-zinc-200 gap-2">
              <CustomButton onClick={() => handlePrintLogReport(selectedLog)} variant="default" className="px-4 gap-1.5">
                <Printer size={13} />
                <span>Print Report</span>
              </CustomButton>
              <CustomButton onClick={() => setSelectedLog(null)} variant="secondary" className="px-4">
                Close Report
              </CustomButton>
            </div>
          </div>
        </div>
      )}
      {/* Manual Stock Take Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-6 animate-fadeIn animate-duration-150">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn animate-duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Manual Stock Take Submission</h3>
                <p className="text-xs text-zinc-500">Record a physical stock take count grouped by brand.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Subheader Inputs: Date, Auditor & AI Scanner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-3 border-b border-zinc-200 bg-slate-50/50 text-xs items-end">
              <div className="flex flex-col gap-1">
                <label className="text-zinc-600 font-medium flex items-center gap-1.5">
                  <Calendar size={13} className="text-zinc-400" />
                  <span>Stock Take Date & Time</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={submitAuditDate}
                    onChange={(e) => setSubmitAuditDate(e.target.value)}
                    className="flex-1 bg-white border border-zinc-300 rounded p-2 text-zinc-900 focus:outline-none focus:border-zinc-500 h-9 text-xs"
                  />
                  <input
                    type="time"
                    value={submitAuditTime}
                    onChange={(e) => setSubmitAuditTime(e.target.value)}
                    className="w-24 bg-white border border-zinc-300 rounded p-2 text-zinc-900 focus:outline-none focus:border-zinc-500 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-zinc-600 font-medium flex items-center gap-1.5">
                  <User size={13} className="text-zinc-400" />
                  <span>Auditor / Counted By</span>
                </label>
                <input
                  type="text"
                  placeholder="Auditor name..."
                  value={submitAuditor}
                  onChange={(e) => setSubmitAuditor(e.target.value)}
                  className="bg-white border border-zinc-300 rounded p-2 text-zinc-900 focus:outline-none focus:border-zinc-500 h-9 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-zinc-600 font-medium flex items-center gap-1.5">
                  <FileText size={13} className="text-zinc-500" />
                  <span>Scan Paper PDF</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleScanPaper}
                  accept="application/pdf,.pdf"
                  className="hidden"
                />
                <CustomButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="default"
                  disabled={isScanning}
                  className="h-9 gap-1.5 font-semibold text-xs cursor-pointer bg-white hover:bg-slate-100 text-zinc-800 border border-zinc-300 shadow-xs w-full justify-center"
                >
                  {isScanning ? (
                    <>
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-zinc-700" />
                      <span>Reading PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileText size={14} className="text-zinc-600" />
                      <span>Upload Scanned PDF</span>
                    </>
                  )}
                </CustomButton>
              </div>
            </div>

            {/* Single Cohesive Table Body */}
            <div className="flex-grow overflow-y-auto border-b border-zinc-200">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">SKU Code</th>
                    <th className="py-2.5 px-4">Product Name</th>
                    <th className="py-2.5 px-4 text-center w-24">Carton Size</th>
                    <th className="py-2.5 px-4 text-right w-36">Counted Qty (pcs)</th>
                    <th className="py-2.5 px-4 text-right w-32">Carton / Loose</th>
                    <th className="py-2.5 px-4 text-center w-20">Skip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150 text-xs">
                  {productsByBrand.map(({ brandName, items: brandItems }) => (
                    <React.Fragment key={brandName}>
                      {/* Brand Group Row */}
                      <tr className="bg-slate-100/90 border-y border-slate-200">
                        <td colSpan={6} className="py-2 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wide">{brandName}</span>
                              <span className="text-[11px] text-zinc-500 font-normal">({brandItems.length} Products)</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setStockTakeForm(prev => {
                                    const next = { ...prev };
                                    brandItems.forEach(item => {
                                      const norm = item.sku.toLowerCase();
                                      next[norm] = { ...(next[norm] || { qty: "" }), skipped: false };
                                    });
                                    return next;
                                  });
                                }}
                                className="text-[11px] text-zinc-600 hover:text-zinc-900 font-medium hover:underline cursor-pointer"
                              >
                                Mark All Counted
                              </button>
                              <span className="text-zinc-300">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setStockTakeForm(prev => {
                                    const next = { ...prev };
                                    brandItems.forEach(item => {
                                      const norm = item.sku.toLowerCase();
                                      next[norm] = { ...(next[norm] || { qty: 0 }), skipped: true };
                                    });
                                    return next;
                                  });
                                }}
                                className="text-[11px] text-zinc-600 hover:text-zinc-900 font-medium hover:underline cursor-pointer"
                              >
                                Mark All Skipped
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Brand Product Rows */}
                      {brandItems.map((item) => {
                        const normSku = item.sku.toLowerCase();
                        const entry = stockTakeForm[normSku] || { qty: "", skipped: false };
                        const numQty = Number(entry.qty) || 0;
                        const displayCartonLoose = entry.skipped ? "-" : (entry.qty !== "" ? formatCartonLoose(numQty, item.uom) : "-");

                        return (
                          <tr key={item.sku} className={`hover:bg-slate-50 ${entry.skipped ? "bg-zinc-50/60 text-zinc-400" : "text-zinc-800"}`}>
                            <td className="py-2 px-4 font-medium text-zinc-600">{item.sku}</td>
                            <td className="py-2 px-4 text-zinc-900 truncate max-w-[220px]" title={item.name}>
                              {item.name}
                            </td>
                            <td className="py-2 px-4 text-center text-zinc-500">
                              {item.uom} pcs/ctn
                            </td>
                            <td className="py-2 px-4 text-right">
                              <input
                                type="number"
                                disabled={entry.skipped}
                                placeholder="0"
                                value={entry.skipped ? "" : entry.qty}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setStockTakeForm(prev => ({
                                    ...prev,
                                    [normSku]: {
                                      ...(prev[normSku] || { skipped: false }),
                                      qty: val === "" ? "" : Number(val)
                                    }
                                  }));
                                }}
                                className={`w-28 text-right bg-white border rounded p-1 text-xs focus:outline-none h-8 ${
                                  entry.skipped
                                    ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                                    : "border-zinc-300 text-zinc-900 focus:border-zinc-500"
                                }`}
                              />
                            </td>
                            <td className="py-2 px-4 text-right text-zinc-600">
                              {displayCartonLoose}
                            </td>
                            <td className="py-2 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={entry.skipped}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setStockTakeForm(prev => ({
                                    ...prev,
                                    [normSku]: {
                                      ...(prev[normSku] || { qty: "" }),
                                      skipped: checked
                                    }
                                  }));
                                }}
                                className="rounded border-zinc-300 text-zinc-700 h-4 w-4 cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50">
              <div className="text-xs text-zinc-600 font-medium">
                {(() => {
                  const total = products.length;
                  const skippedCount = Object.values(stockTakeForm).filter(e => e.skipped).length;
                  const countedCount = total - skippedCount;
                  return (
                    <span>
                      {total} Products Total • {countedCount} Counted • {skippedCount} Skipped
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2">
                <CustomButton
                  onClick={() => setShowSubmitModal(false)}
                  variant="secondary"
                  className="px-4"
                  disabled={isSubmitting}
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  onClick={handleSubmitStockTake}
                  variant="default"
                  className="px-5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-medium"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <span className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                      <span>Submitting...</span>
                    </span>
                  ) : (
                    <span>Submit Stock Take</span>
                  )}
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
