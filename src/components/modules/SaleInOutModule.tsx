"use client";

import * as React from "react";
import { PDFDocument } from "pdf-lib";
import { 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  FileText, 
  Layers, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  Calculator,
  Calendar,
  DollarSign,
  Store,
  Building2,
  Package,
  Clock,
  ArrowUpDown,
  Search,
  Filter,
  FileSpreadsheet,
  Sparkles
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";

import * as XLSX from "xlsx";

const API_BASE = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface SaleInOutModuleProps {
  profile?: any;
}

export function SaleInOutModule({ profile }: SaleInOutModuleProps) {
  const [currentPeriod, setCurrentPeriod] = React.useState<string>(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = prev.getFullYear();
    const m = String(prev.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });

  const [batches, setBatches] = React.useState<any[]>([]);
  const [currentBatch, setCurrentBatch] = React.useState<any | null>(null);
  const [salesIn, setSalesIn] = React.useState<any[]>([]);
  const [salesOut, setSalesOut] = React.useState<any[]>([]);
  const [retailersList, setRetailersList] = React.useState<any[]>([]);
  const [productsList, setProductsList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [revalidating, setRevalidating] = React.useState<boolean>(false);

  // Main UI Tabs & Sorting
  const [activeTab, setActiveTab] = React.useState<"reconciliation" | "sell_in" | "sell_out">("reconciliation");
  const [sortBy, setSortBy] = React.useState<"top_sale" | "bottom_sale" | "brand">("top_sale");
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [retailerFilter, setRetailerFilter] = React.useState<string>("all");

  // Centered Upload Modal State
  const [showUploadModal, setShowUploadModal] = React.useState<boolean>(false);
  const [uploadTab, setUploadTab] = React.useState<"sell_in" | "sell_out">("sell_in");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploadingExcel, setUploadingExcel] = React.useState<boolean>(false);
  const [actionLoadingRetailer, setActionLoadingRetailer] = React.useState<string | null>(null);
  const [posRetailerModal, setPosRetailerModal] = React.useState<any | null>(null);
  const [posUploadText, setPosUploadText] = React.useState<string>("");
  const [posUploading, setPosUploading] = React.useState<boolean>(false);

  // Clear / Reset Data Modal State
  const [showClearModal, setShowClearModal] = React.useState<boolean>(false);
  const [clearTab, setClearTab] = React.useState<"sell_in" | "sell_out">("sell_in");
  const [clearingData, setClearingData] = React.useState<boolean>(false);

  // Invoices Breakdown Modal State
  const [viewingInvoicesBreakdown, setViewingInvoicesBreakdown] = React.useState<any | null>(null);

  // Combine / Merge Retailers Modal State
  const [showMergeRetailerModal, setShowMergeRetailerModal] = React.useState<boolean>(false);
  const [selectedMergeSources, setSelectedMergeSources] = React.useState<string[]>([]);
  const [selectedMergeTarget, setSelectedMergeTarget] = React.useState<string>("");
  const [mergingRetailers, setMergingRetailers] = React.useState<boolean>(false);

  // Resolution Modal State
  const [showUnresolvedModal, setShowUnresolvedModal] = React.useState<boolean>(false);

  // Edit Single Record State
  const [editingSellIn, setEditingSellIn] = React.useState<any | null>(null);
  const [editingSellOut, setEditingSellOut] = React.useState<any | null>(null);

  // Confirm Dialog State
  const [confirmConfig, setConfirmConfig] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: "danger" | "default" | "dark";
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // Helper to persist dataset to state
  const persistDataset = React.useCallback(
    (period: string, batch: any, inList: any[], outList: any[], rets?: any[], prods?: any[]) => {
      setCurrentBatch(batch);
      setSalesIn(inList);
      setSalesOut(outList);
      if (rets && rets.length > 0) setRetailersList(rets);
      if (prods && prods.length > 0) setProductsList(prods);
    },
    []
  );

  // 1. Fetch batch details from live backend API
  const fetchBatchDetails = React.useCallback(async (period: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sales-inout/batch-details?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentBatch(data.batch || null);
        setSalesIn(Array.isArray(data.sales_in) ? data.sales_in : []);
        setSalesOut(Array.isArray(data.sales_out) ? data.sales_out : []);
      } else {
        setCurrentBatch(null);
        setSalesIn([]);
        setSalesOut([]);
      }
    } catch (err: any) {
      if (!silent) showToast("Failed to load records: " + err.message, "error");
      setCurrentBatch(null);
      setSalesIn([]);
      setSalesOut([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchBatchesList = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sales-inout/batches`);
      if (res.ok) {
        const data = await res.json();
        setBatches(Array.isArray(data) ? data : []);
      }
    } catch {}
  }, []);

  const fetchMetadata = React.useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sales-projections/metadata`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.retailers) && data.retailers.length > 0) setRetailersList(data.retailers);
        if (Array.isArray(data.products) && data.products.length > 0) setProductsList(data.products);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    fetchBatchesList();
    fetchBatchDetails(currentPeriod);
    fetchMetadata();
  }, [fetchBatchesList, fetchBatchDetails, fetchMetadata, currentPeriod]);

  // Listen to Global TopBar #global-refresh-button 'db-refresh' event
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      await Promise.all([
        fetchBatchDetails(currentPeriod, false),
        fetchBatchesList(),
        fetchMetadata()
      ]);
      showToast("Sales data refreshed", "success");
    };

    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, [fetchBatchDetails, fetchBatchesList, fetchMetadata, currentPeriod]);

  // Safely guarded array references
  const safeSalesIn = React.useMemo(() => (Array.isArray(salesIn) ? salesIn : []), [salesIn]);
  const safeSalesOut = React.useMemo(() => (Array.isArray(salesOut) ? salesOut : []), [salesOut]);

  // Derived unique unmapped statistics (deduplicated so each unique store, SKU, or retailer appears 1 time only)
  const unmappedSellInRet = React.useMemo(() => {
    const seen = new Set<string>();
    const registeredRetSet = new Set<string>();
    retailersList.forEach((r) => {
      if (!r.unmapped_retailer) {
        if (r.id) registeredRetSet.add(String(r.id).toLowerCase().trim());
        if (r.retailer_id) registeredRetSet.add(String(r.retailer_id).toLowerCase().trim());
      }
    });

    const list: any[] = [];
    [...safeSalesIn, ...safeSalesOut].forEach((r) => {
      const retId = String(r.retailer_id || "").toLowerCase().trim();
      if (!retId) return;

      const isUnregistered = 
        r.unmapped_retailer === true || 
        (!registeredRetSet.has(retId) && registeredRetSet.size > 0);

      if (isUnregistered && !seen.has(retId)) {
        seen.add(retId);
        const retObj = retailersList.find((x) => String(x.id || x.retailer_id || "").toLowerCase().trim() === retId);
        const name = retObj?.display_name || retObj?.name || r.retailer_name || r.retailer_id;

        list.push({
          retailer_id: r.retailer_id,
          retailer_name: name,
          unmapped_retailer: true,
        });
      }
    });
    return list;
  }, [safeSalesIn, safeSalesOut, retailersList]);

  const getRetailerDisplay = React.useCallback(
    (retailerId: string) => {
      if (!retailerId) return { name: "Unknown Retailer", isUnregistered: false };
      const cleanId = retailerId.toLowerCase().trim();
      const retObj = retailersList.find(
        (r) => String(r.id || r.retailer_id || "").toLowerCase().trim() === cleanId
      );

      const name = retObj?.display_name || retObj?.name || retailerId;

      const isUnregistered =
        retObj?.unmapped_retailer === true ||
        unmappedSellInRet.some((u) => u.retailer_id.toLowerCase().trim() === cleanId);

      return { name, isUnregistered };
    },
    [retailersList, unmappedSellInRet]
  );

  // Only include retailers that actually exist in the current data list below
  const activeTabRetailers = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    let targetList: any[] = [];
    if (activeTab === "sell_in") {
      targetList = safeSalesIn;
    } else if (activeTab === "sell_out") {
      targetList = safeSalesOut;
    } else {
      targetList = [...safeSalesIn, ...safeSalesOut];
    }

    targetList.forEach((r) => {
      const id = String(r.retailer_id || "");
      if (id && !map.has(id.toLowerCase().trim())) {
        const display = getRetailerDisplay(id);
        map.set(id.toLowerCase().trim(), { id, name: display.name });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeTab, safeSalesIn, safeSalesOut, getRetailerDisplay]);

  const unmappedSellOutStore = React.useMemo(() => {
    const seen = new Set<string>();
    return safeSalesOut.filter((r) => {
      if (!r.unmapped_store) return false;
      const key = String(r.store_id || r.raw_store_name || "").toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [safeSalesOut]);

  const unmappedSellInSku = React.useMemo(() => {
    const seen = new Set<string>();
    return safeSalesIn.filter((r) => {
      if (!r.unmapped_sku) return false;
      const key = String(r.sku || r.raw_sku || "").toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [safeSalesIn]);

  const unmappedSellOutSku = React.useMemo(() => {
    const seen = new Set<string>();
    return safeSalesOut.filter((r) => {
      if (!r.unmapped_sku) return false;
      const key = String(r.sku || r.raw_sku || "").toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [safeSalesOut]);

  const unmappedSellOutListing = React.useMemo(() => {
    const seen = new Set<string>();
    return safeSalesOut.filter((r) => {
      if (!r.unmapped_listing) return false;
      const key = `${r.retailer_id}_${r.sku}`.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [safeSalesOut]);

  const uniqueUnmappedSkus = React.useMemo(() => {
    const seen = new Set<string>();
    const list: any[] = [];
    [...unmappedSellInSku, ...unmappedSellOutSku].forEach((k) => {
      const key = String(k.sku || k.raw_sku || "").toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push(k);
      }
    });
    return list;
  }, [unmappedSellInSku, unmappedSellOutSku]);

  const totalUnresolvedCount = 
    unmappedSellInRet.length + 
    unmappedSellOutStore.length + 
    uniqueUnmappedSkus.length + 
    unmappedSellOutListing.length;

  // 2. Real-time Refresh / Re-validate with DB
  const handleRevalidate = async () => {
    setRevalidating(true);
    try {
      let newlyResolved = 0;
      const updatedIn = salesIn.map((r) => {
        if (r.unmapped_sku && productsList.some((p) => p.sku === r.sku && !p.unmapped_sku)) {
          newlyResolved++;
          return { ...r, unmapped_sku: false };
        }
        return r;
      });
      const updatedOut = salesOut.map((r) => {
        let unStore = r.unmapped_store;
        let unSku = r.unmapped_sku;
        if (unSku && productsList.some((p) => p.sku === r.sku && !p.unmapped_sku)) {
          unSku = false;
          newlyResolved++;
        }
        return { ...r, unmapped_store: unStore, unmapped_sku: unSku };
      });

      persistDataset(currentPeriod, currentBatch, updatedIn, updatedOut);
      showToast(`Batch synced! ${newlyResolved} items updated.`, "success");
    } catch (err: any) {
      showToast("Re-validation error: " + err.message, "error");
    } finally {
      setRevalidating(false);
    }
  };

  // 3. Fallback: Use Sell-In as Sell-Out for all non-reporting
  const handleCalculateSellOutFromSellIn = () => {
    setConfirmConfig({
      open: true,
      title: "Calculate Estimated Sell-Out",
      description: `Calculate estimated Sell-Out from Net Sell-In for non-reporting retailers (e.g. 7-Eleven Singapore) in ${currentPeriod}?`,
      variant: "default",
      onConfirm: async () => {
        setLoading(true);
        try {
          const reportingSet = new Set(salesOut.map((o) => String(o.retailer_id).toLowerCase()));
          const newEstimates: any[] = [];
          const now = Date.now();

          salesIn.forEach((si) => {
            const retId = String(si.retailer_id).toLowerCase();
            if (!reportingSet.has(retId) && Number(si.total_qty || 0) > 0) {
              const totalVal = Number((si.total_qty * si.unit_price).toFixed(2));
              newEstimates.push({
                id: `est_${currentPeriod}_${si.retailer_id.replace('/', '_')}_${si.sku}`,
                batch_id: `batch_${currentPeriod}`,
                period: currentPeriod,
                retailer_id: si.retailer_id,
                store_id: "ESTIMATED_DC",
                raw_store_name: "Consolidated DC (Sell-In Fallback)",
                sku: si.sku,
                raw_sku: si.raw_sku || si.sku,
                qty_sold: Number(si.total_qty || 0),
                buyer_cost: Number(si.unit_price || 0),
                total_value: totalVal,
                is_estimated: true,
                is_combined: false,
                combine_group: null,
                unmapped_store: false,
                unmapped_sku: Boolean(si.unmapped_sku),
                unmapped_listing: false,
                created_at: now,
                updated_at: now
              });
            }
          });

          const updatedOut = [...salesOut, ...newEstimates];
          const updatedSellOutTotal = updatedOut.reduce((acc, r) => acc + Number(r.total_value || 0), 0);
          const updatedBatch = {
            ...(currentBatch || {}),
            total_sellout: updatedSellOutTotal,
            sellout_row_count: updatedOut.length,
            updated_at: now
          };

          persistDataset(currentPeriod, updatedBatch, salesIn, updatedOut);
          showToast(`Generated ${newEstimates.length} estimated sell-out records for non-reporting accounts!`, "success");
        } catch (err: any) {
          showToast("Calculation error: " + err.message, "error");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // 4. Use Sell-In data for a single specific retailer
  const handleUseSellInForRetailer = async (retailerId: string) => {
    setActionLoadingRetailer(retailerId);
    try {
      const existingOutWithoutRet = salesOut.filter((o) => o.retailer_id !== retailerId);
      const retInRecords = salesIn.filter((i) => i.retailer_id === retailerId);
      const now = Date.now();

      const newRecords = retInRecords.map((si) => ({
        id: `est_${currentPeriod}_${si.retailer_id.replace('/', '_')}_${si.sku}_${Math.random().toString(36).substring(2, 6)}`,
        batch_id: `batch_${currentPeriod}`,
        period: currentPeriod,
        retailer_id: si.retailer_id,
        store_id: "ESTIMATED_DC",
        raw_store_name: "Consolidated DC (Sell-In Fallback)",
        sku: si.sku,
        raw_sku: si.raw_sku || si.sku,
        qty_sold: Number(si.total_qty || 0),
        buyer_cost: Number(si.unit_price || 0),
        total_value: Number((si.total_qty * si.unit_price).toFixed(2)),
        is_estimated: true,
        is_combined: false,
        combine_group: null,
        unmapped_store: false,
        unmapped_sku: Boolean(si.unmapped_sku),
        unmapped_listing: false,
        created_at: now,
        updated_at: now
      }));

      const updatedOut = [...existingOutWithoutRet, ...newRecords];
      const updatedSellOutTotal = updatedOut.reduce((acc, r) => acc + Number(r.total_value || 0), 0);
      const updatedBatch = {
        ...(currentBatch || {}),
        total_sellout: updatedSellOutTotal,
        sellout_row_count: updatedOut.length,
        updated_at: now
      };

      persistDataset(currentPeriod, updatedBatch, salesIn, updatedOut);
      showToast(`Copied ${newRecords.length} Sell-In records to Sell-Out for ${retailerId}`, "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoadingRetailer(null);
    }
  };

  // 5. Direct Fast Excel Upload & Ingest for Customer Sales Report
  const handleExcelUpload = async (file: File) => {
    if (!file) return;
    setUploadingExcel(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!rawRows || rawRows.length === 0) {
        throw new Error("The selected Excel spreadsheet contains no data rows.");
      }

      // Normalize row column keys to lowercase
      const parsedRows = rawRows.map((r: any) => {
        const normalized: Record<string, any> = {};
        Object.keys(r).forEach((k) => {
          const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, "");
          normalized[cleanKey] = r[k];
        });

        const custcode = String(
          normalized.custcode ||
          normalized.customercode ||
          normalized.customerid ||
          normalized.retailerid ||
          normalized.code ||
          ""
        ).trim();

        const name = String(
          normalized.name ||
          normalized.customername ||
          normalized.retailername ||
          ""
        ).trim();

        const prodcode = String(
          normalized.prodcode ||
          normalized.productcode ||
          normalized.sku ||
          normalized.itemcode ||
          ""
        ).trim();

        const proddesp = String(
          normalized.proddesp ||
          normalized.proddesc ||
          normalized.productname ||
          normalized.description ||
          ""
        ).trim();

        const qty = parseFloat(normalized.qty || normalized.quantity || 0) || 0;
        const totalsi = parseFloat(normalized.totalsi || normalized.si || normalized.salesinvoice || 0) || 0;
        const totalcn = parseFloat(normalized.totalcn || normalized.cn || normalized.creditnote || 0) || 0;
        const total = parseFloat(normalized.total || 0) || 0;
        const nett = parseFloat(normalized.nett || normalized.net || (totalsi - totalcn)) || (totalsi - totalcn);

        return {
          custcode,
          name,
          prodcode,
          proddesp,
          qty,
          totalsi,
          totalcn,
          total,
          nett
        };
      }).filter((r) => r.custcode && r.prodcode);

      if (parsedRows.length === 0) {
        throw new Error("Could not find required columns (custcode, prodcode, qty, totalsi, totalcn, nett) in Excel.");
      }

      // Ingest directly into Supabase via backend endpoint
      const res = await fetch(`${API_BASE}/api/sales-inout/upload-excel-sellin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod,
          rows: parsedRows
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || `Status ${res.status}`);

      showToast(resData.message || `Imported ${parsedRows.length} Sell-In rows successfully!`, "success");
      setSelectedFile(null);
      setShowUploadModal(false);
      await fetchBatchDetails(currentPeriod, true);
      await fetchBatchesList();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setUploadingExcel(false);
    }
  };

  // 5b. Upload POS rows for a single retailer
  const handlePosUploadSubmit = async () => {
    if (!posRetailerModal || !posUploadText.trim()) {
      showToast("Please enter POS rows or CSV text.", "error");
      return;
    }
    setPosUploading(true);
    try {
      const lines = posUploadText.trim().split("\n").filter((l) => l.trim().length > 0);
      const items: any[] = [];
      lines.forEach((line) => {
        const parts = line.split(",").map((p) => p.trim());
        if (parts.length >= 3) {
          items.push({
            store_id: parts[0],
            raw_store_name: parts[1] || parts[0],
            sku: parts[2],
            qty_sold: parseFloat(parts[3] || parts[2]) || 1,
            retail_price: parseFloat(parts[4] || parts[3]) || 0,
          });
        }
      });
      if (items.length === 0) throw new Error("Invalid POS format. Expected: Store Code, Store Name, SKU, Qty Sold");

      // Local storage persistence for uploaded POS rows
      const now = Date.now();
      const newPosRecords = items.map((it: any) => {
        const prod = productsList.find((p) => p.sku === it.sku);
        const buyerCost = it.retail_price || prod?.cost || 1.0;
        return {
          id: `so_${currentPeriod}_${posRetailerModal.id.replace('/', '_')}_${it.store_id}_${it.sku}_${Math.random().toString(36).substring(2, 6)}`,
          batch_id: `batch_${currentPeriod}`,
          period: currentPeriod,
          retailer_id: posRetailerModal.id,
          store_id: it.store_id,
          raw_store_name: it.raw_store_name || it.store_id,
          sku: it.sku,
          raw_sku: it.sku,
          qty_sold: it.qty_sold,
          buyer_cost: buyerCost,
          total_value: Number((it.qty_sold * buyerCost).toFixed(2)),
          is_estimated: false,
          is_combined: false,
          combine_group: null,
          unmapped_store: false,
          unmapped_sku: Boolean(!prod || prod.unmapped_sku),
          unmapped_listing: false,
          created_at: now,
          updated_at: now,
        };
      });

      const updatedOut = [...salesOut, ...newPosRecords];
      const updatedSellOutTotal = updatedOut.reduce((acc, r) => acc + Number(r.total_value || 0), 0);
      const updatedBatch = {
        ...(currentBatch || {}),
        total_sellout: updatedSellOutTotal,
        sellout_row_count: updatedOut.length,
        updated_at: now,
      };

      persistDataset(currentPeriod, updatedBatch, salesIn, updatedOut);
      showToast(`Uploaded ${items.length} POS records for ${posRetailerModal.display_name || posRetailerModal.name || posRetailerModal.id}!`, "success");
      setPosRetailerModal(null);
      setPosUploadText("");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setPosUploading(false);
    }
  };

  // 6. Publish Batch Guardrail
  const handlePublishBatch = () => {
    if (totalUnresolvedCount > 0) {
      showToast(`Cannot publish: ${totalUnresolvedCount} unresolved stores/SKUs exist. Please resolve or refresh.`, "error");
      return;
    }
    setConfirmConfig({
      open: true,
      title: "Publish Monthly Sales Report",
      description: `Are you sure you want to publish the sales report for ${currentPeriod} to live analytics?`,
      variant: "dark",
      onConfirm: async () => {
        setLoading(true);
        try {
          const updatedBatch = {
            ...(currentBatch || {}),
            status: "published",
            published_at: Date.now(),
            published_by: profile?.name || "Admin",
          };
          persistDataset(currentPeriod, updatedBatch, salesIn, salesOut);
          showToast("Sales report successfully published to live analytics!", "success");
        } catch (err: any) {
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 7. Lock Month
  const handleLockMonth = () => {
    setConfirmConfig({
      open: true,
      title: "Freeze & Lock Month",
      description: `Freeze and lock month ${currentPeriod}? This prevents further changes and edits.`,
      variant: "danger",
      onConfirm: async () => {
        setLoading(true);
        try {
          const updatedBatch = {
            ...(currentBatch || {}),
            status: "locked",
            locked_at: Date.now(),
            locked_by: profile?.name || "Admin",
          };
          persistDataset(currentPeriod, updatedBatch, salesIn, salesOut);
          showToast("Month frozen & locked!", "success");
        } catch (err: any) {
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 7b. Unlock Month
  const handleUnlockMonth = () => {
    setConfirmConfig({
      open: true,
      title: "Unlock Month",
      description: `Unlock month ${currentPeriod} to allow further edits and data updates?`,
      variant: "default",
      onConfirm: async () => {
        setLoading(true);
        try {
          const updatedBatch = {
            ...(currentBatch || {}),
            status: "published",
            unlocked_at: Date.now(),
            unlocked_by: profile?.name || "Admin",
          };
          persistDataset(currentPeriod, updatedBatch, salesIn, salesOut);
          showToast("Month unlocked for edits.", "success");
        } catch (err: any) {
          showToast(err.message, "error");
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 7c. Combine / Merge Unregistered Retailers
  const handleMergeRetailers = async () => {
    if (selectedMergeSources.length === 0) {
      showToast("Please select at least one retailer code to merge", "error");
      return;
    }
    if (!selectedMergeTarget) {
      showToast("Please choose a target registered retailer", "error");
      return;
    }

    setMergingRetailers(true);
    try {
      const res = await fetch(`${API_BASE}/api/sales-inout/merge-retailers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod,
          source_retailer_ids: selectedMergeSources,
          target_retailer_id: selectedMergeTarget,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to merge retailers");
      }

      const data = await res.json();
      showToast(data.message || "Retailers successfully merged!", "success");
      setShowMergeRetailerModal(false);
      setSelectedMergeSources([]);
      setSelectedMergeTarget("");
      await fetchBatchDetails(currentPeriod, true);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setMergingRetailers(false);
    }
  };

  // Reconciled SKU Matrix
  const reconciliationMatrix = React.useMemo(() => {
    const prodMap = new Map<string, any>();
    productsList.forEach((p) => {
      if (p.sku) prodMap.set(p.sku.toLowerCase().trim(), p);
    });

    const map = new Map<string, {
      sku: string;
      retailer_id: string;
      retailer_name: string;
      brand: string;
      product_name: string;
      sellin_qty: number;
      sellin_amount: number;
      sellout_qty: number;
      sellout_value: number;
      buyer_cost: number;
      sell_through: number;
      is_unregistered_retailer: boolean;
    }>();

    safeSalesIn.forEach((si) => {
      const key = `${si.retailer_id}_${si.sku}`;
      const prod = prodMap.get((si.sku || "").toLowerCase().trim());
      const retDisplay = getRetailerDisplay(si.retailer_id);
      const existing = map.get(key) || {
        sku: si.sku,
        retailer_id: si.retailer_id,
        retailer_name: retDisplay.name,
        brand: prod?.brand || "—",
        product_name: prod?.name || prod?.product_name || "",
        sellin_qty: 0,
        sellin_amount: 0,
        sellout_qty: 0,
        sellout_value: 0,
        buyer_cost: Number(si.unit_price || 0),
        sell_through: 0,
        is_unregistered_retailer: retDisplay.isUnregistered,
      };
      existing.sellin_qty += Number(si.total_qty || 0);
      existing.sellin_amount += Number(si.total_amount || 0);
      if (si.unit_price) existing.buyer_cost = Number(si.unit_price);
      if ((!existing.brand || existing.brand === "—") && prod?.brand) {
        existing.brand = prod.brand;
      }
      if (!existing.product_name && (prod?.name || prod?.product_name)) {
        existing.product_name = prod?.name || prod?.product_name;
      }
      if (retDisplay.name && (!existing.retailer_name || existing.retailer_name === si.retailer_id)) {
        existing.retailer_name = retDisplay.name;
      }
      map.set(key, existing);
    });

    safeSalesOut.forEach((so) => {
      const key = `${so.retailer_id}_${so.sku}`;
      const prod = prodMap.get((so.sku || "").toLowerCase().trim());
      const retDisplay = getRetailerDisplay(so.retailer_id);
      const existing = map.get(key) || {
        sku: so.sku,
        retailer_id: so.retailer_id,
        retailer_name: retDisplay.name,
        brand: prod?.brand || "—",
        product_name: prod?.name || prod?.product_name || "",
        sellin_qty: 0,
        sellin_amount: 0,
        sellout_qty: 0,
        sellout_value: 0,
        buyer_cost: Number(so.buyer_cost || 0),
        sell_through: 0,
        is_unregistered_retailer: retDisplay.isUnregistered,
      };
      existing.sellout_qty += Number(so.qty_sold || 0);
      existing.sellout_value += Number(so.total_value || 0);
      if (!existing.buyer_cost && so.buyer_cost) existing.buyer_cost = Number(so.buyer_cost);
      if ((!existing.brand || existing.brand === "—") && prod?.brand) {
        existing.brand = prod.brand;
      }
      if (!existing.product_name && (prod?.name || prod?.product_name)) {
        existing.product_name = prod?.name || prod?.product_name;
      }
      if (retDisplay.name && (!existing.retailer_name || existing.retailer_name === so.retailer_id)) {
        existing.retailer_name = retDisplay.name;
      }
      map.set(key, existing);
    });

    const items = Array.from(map.values()).map((item) => {
      item.sell_through = item.sellin_qty > 0 ? (item.sellout_qty / item.sellin_qty) * 100 : 0;
      return item;
    }).filter((item) => {
      if (retailerFilter !== "all" && item.retailer_id !== retailerFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          item.sku.toLowerCase().includes(term) ||
          item.retailer_id.toLowerCase().includes(term) ||
          (item.retailer_name || "").toLowerCase().includes(term) ||
          item.brand.toLowerCase().includes(term) ||
          item.product_name.toLowerCase().includes(term)
        );
      }
      return true;
    });

    return items.sort((a, b) => {
      if (sortBy === "top_sale") {
        return b.sellout_value - a.sellout_value || b.sellout_qty - a.sellout_qty;
      }
      if (sortBy === "bottom_sale") {
        return a.sellout_value - b.sellout_value || a.sellout_qty - b.sellout_qty;
      }
      if (sortBy === "brand") {
        return (a.brand || "").localeCompare(b.brand || "") || a.sku.localeCompare(b.sku);
      }
      return 0;
    });
  }, [safeSalesIn, safeSalesOut, productsList, retailerFilter, searchTerm, sortBy, getRetailerDisplay]);

  // Status computation
  const batchStatus = currentBatch?.status || "draft";
  const isLocked = batchStatus === "locked";
  const hasRecords = safeSalesIn.length > 0 || safeSalesOut.length > 0;

  const totalSellInNet = currentBatch?.total_sellin_net || 0;
  const totalSellOut = currentBatch?.total_sellout || 0;

  const netSellInUnits = React.useMemo(
    () => safeSalesIn.reduce((acc, r) => acc + Number(r.total_qty || 0), 0),
    [safeSalesIn]
  );
  const cnUnitsDeducted = React.useMemo(
    () => safeSalesIn.filter((r) => r.doc_type === "CN" || Number(r.total_amount || 0) < 0 || Number(r.total_qty || 0) < 0)
      .reduce((acc, r) => acc + Math.abs(Number(r.total_qty || 0)), 0),
    [safeSalesIn]
  );
  const sellOutUnits = React.useMemo(
    () => safeSalesOut.reduce((acc, r) => acc + Number(r.qty_sold || 0), 0),
    [safeSalesOut]
  );
  const sellThroughRate = netSellInUnits > 0 ? ((sellOutUnits / netSellInUnits) * 100).toFixed(1) : "0.0";

  // Check if current period is past the 7th of the following month
  const isPeriodOverdue = React.useMemo(() => {
    try {
      const [y, m] = currentPeriod.split("-").map(Number);
      // Month m is 1-indexed in period (1..12). In Date constructor (y, m, 7), m is next month (0-indexed).
      const deadline = new Date(y, m, 7, 23, 59, 59);
      return new Date() > deadline;
    } catch {
      return false;
    }
  }, [currentPeriod]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* 🏛️ Top Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
        <div>
          <h1 className="text-base font-bold text-zinc-950">Sale In & Sale Out Reconciliation</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Reconcile monthly sell-in delivery totals with retailer store sell-out off-take and inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 bg-[#F8F9FA] border border-slate-200 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <input
              type="month"
              value={currentPeriod}
              onChange={(e) => e.target.value && setCurrentPeriod(e.target.value)}
              className="bg-transparent text-xs font-semibold text-zinc-800 outline-hidden cursor-pointer"
            />
          </div>

          {/* Update Button (Primary Action) */}
          {!isLocked && (
            <>
              <button
                onClick={() => {
                  setUploadTab("sell_in");
                  setShowUploadModal(true);
                }}
                className="flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold bg-[#0B57D0] text-white hover:bg-[#0842A0] rounded-lg shadow-xs transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Update</span>
              </button>

              <button
                onClick={() => {
                  setClearTab("sell_in");
                  setShowClearModal(true);
                }}
                className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg shadow-xs transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Clear Data</span>
              </button>
            </>
          )}

          {/* Publish & Lock Integrated Toggle Action */}
          {batchStatus === "draft" && (
            <button
              onClick={handlePublishBatch}
              disabled={loading || !hasRecords || totalUnresolvedCount > 0}
              className={`flex items-center gap-1.5 h-8 px-3.5 text-xs font-semibold rounded-lg transition-all ${
                !hasRecords || totalUnresolvedCount > 0
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : "bg-[#0B57D0] text-white hover:bg-[#0842A0] shadow-xs"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Publish Report</span>
            </button>
          )}

          {batchStatus === "published" && (
            <div className="flex items-center bg-emerald-50 border border-emerald-200 rounded-lg p-0.5 h-8 shadow-xs">
              <div className="flex items-center gap-1.5 px-2.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Published</span>
              </div>
              <button
                onClick={handleLockMonth}
                title="Lock & Freeze this published report"
                className="flex items-center gap-1 h-6 px-2 text-xs font-semibold text-zinc-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-all shadow-xs"
              >
                <Lock className="w-3 h-3 text-zinc-600" />
                <span>Lock</span>
              </button>
            </div>
          )}

          {batchStatus === "locked" && (
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 h-8">
              <div className="flex items-center gap-1.5 px-2.5 text-xs font-bold text-zinc-700">
                <Lock className="w-3.5 h-3.5 text-zinc-600" />
                <span>Locked</span>
              </div>
              <button
                onClick={handleUnlockMonth}
                title="Unlock this month to allow edits"
                className="flex items-center gap-1 h-6 px-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-all shadow-xs"
              >
                <Unlock className="w-3 h-3 text-zinc-500" />
                <span>Unlock</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 📊 Sleek Compact Summary Strip */}
      <div className="px-4 py-2 bg-[#F8F9FA] border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-2.5 shrink-0 text-xs">
        {/* Metric 1: Net Sell-In */}
        <div className="bg-white border border-slate-200 rounded-md px-3 py-1.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight block">Net Sell-In</span>
            <div className="text-sm font-bold text-zinc-950 mt-0.5">
              ${Number(totalSellInNet).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[11px] text-zinc-500 font-medium">{netSellInUnits.toLocaleString()} units</span>
        </div>

        {/* Metric 2: Sell-Out */}
        <div className="bg-white border border-slate-200 rounded-md px-3 py-1.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight block">Sell-Out</span>
            <div className="text-sm font-bold text-zinc-950 mt-0.5">
              ${Number(totalSellOut).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <span className="text-[11px] text-zinc-500 font-medium">{sellOutUnits.toLocaleString()} units</span>
        </div>

        {/* Metric 3: Sell-Through Rate */}
        <div className="bg-white border border-slate-200 rounded-md px-3 py-1.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight block">Sell-Through</span>
            <div className="text-sm font-bold text-[#0B57D0] mt-0.5">{sellThroughRate}%</div>
          </div>
          <span className="text-[10px] text-zinc-400">Rate</span>
        </div>

        {/* Metric 4: Non-POS Fallback */}
        <div className="bg-white border border-slate-200 rounded-md px-3 py-1.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight block">Fallback</span>
            <div className="text-[11px] text-zinc-600 font-medium mt-0.5">Use Sell-In</div>
          </div>
          {!isLocked && (
            <button
              onClick={handleCalculateSellOutFromSellIn}
              disabled={safeSalesIn.length === 0}
              className="h-6 px-2.5 text-[11px] font-semibold text-[#0B57D0] bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded transition-all disabled:opacity-40 flex items-center gap-1"
            >
              <Calculator className="w-3 h-3 text-[#0B57D0]" />
              <span>Calculate</span>
            </button>
          )}
        </div>
      </div>

      {/* 🧭 Sub-Tabs & Filter Toolbar */}
      <div className="px-4 py-2 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1 bg-[#F0F4F9] p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
          <button
            onClick={() => setActiveTab("reconciliation")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "reconciliation" ? "bg-white text-zinc-950 font-bold shadow-xs" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Reconciliation Overview
          </button>
          <button
            onClick={() => setActiveTab("sell_in")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "sell_in" ? "bg-white text-zinc-950 font-bold shadow-xs" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <span>Sell-In</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-bold">{safeSalesIn.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("sell_out")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "sell_out" ? "bg-white text-zinc-950 font-bold shadow-xs" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <span>Sell-Out</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-bold">{safeSalesOut.length}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Sort Controls (Reconciliation Tab) */}
          {activeTab === "reconciliation" && (
            <div className="flex items-center gap-1 bg-[#F0F4F9] p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setSortBy("top_sale")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  sortBy === "top_sale" ? "bg-white text-[#0B57D0] shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
                title="Sort by highest sell-out value"
              >
                Top Sale
              </button>
              <button
                onClick={() => setSortBy("bottom_sale")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  sortBy === "bottom_sale" ? "bg-white text-[#0B57D0] shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
                title="Sort by lowest sell-out value"
              >
                Bottom Sale
              </button>
              <button
                onClick={() => setSortBy("brand")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  sortBy === "brand" ? "bg-white text-[#0B57D0] shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
                title="Sort alphabetically by brand"
              >
                By Brand
              </button>
            </div>
          )}

          {/* Unresolved Alert Indicator */}
          {totalUnresolvedCount > 0 && (
            <button
              onClick={() => setShowUnresolvedModal(true)}
              className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 rounded-lg transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{totalUnresolvedCount} Unresolved</span>
            </button>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SKU, Brand, Retailer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs border border-slate-200 rounded-lg bg-white w-48 focus:outline-none focus:border-[#0B57D0]"
            />
          </div>

          {/* Retailer Filter */}
          <select
            value={retailerFilter}
            onChange={(e) => setRetailerFilter(e.target.value)}
            className="h-8 px-2.5 text-xs border border-slate-200 rounded-lg bg-white text-zinc-700 focus:outline-none"
          >
            <option value="all">All Retailers</option>
            {activeTabRetailers.map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {/* Combine / Merge Retailers Button (Sell-In) */}
          {activeTab === "sell_in" && (
            <button
              onClick={() => {
                setSelectedMergeSources([]);
                setSelectedMergeTarget("");
                setShowMergeRetailerModal(true);
              }}
              className="flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold bg-white text-zinc-700 border border-slate-200 hover:bg-slate-50 hover:text-zinc-900 rounded-lg shadow-xs transition-all"
              title="Combine unmapped retailer codes under a registered retailer"
            >
              <Layers className="w-3.5 h-3.5 text-[#0B57D0]" />
              <span>Combine Retailers</span>
              {unmappedSellInRet.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-800 rounded font-bold">
                  {unmappedSellInRet.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 📄 Main Content Body / Tables */}
      <div className="flex-1 min-h-0 overflow-auto bg-[#F8F9FA]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0B57D0] mb-2" />
            <span>Loading {currentPeriod} sales records...</span>
          </div>
        ) : !hasRecords ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
              isPeriodOverdue ? "bg-red-50 text-red-500" : "bg-slate-100 text-zinc-400"
            }`}>
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-2">No records found for {currentPeriod}</h3>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1.5 ${
                isPeriodOverdue
                  ? "text-red-600 bg-red-50 border border-red-200"
                  : "text-zinc-500 bg-slate-100 border border-slate-200"
              }`}
            >
              {isPeriodOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              <span>Pending upload</span>
            </span>
          </div>
        ) : activeTab === "reconciliation" ? (
          /* 1. Reconciliation Matrix Table */
          <div className="p-4">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-slate-200 text-[11px] font-bold text-zinc-600 uppercase tracking-tight">
                    <th className="py-2.5 px-3">Retailer</th>
                    <th className="py-2.5 px-3">Brand</th>
                    <th className="py-2.5 px-3">Master SKU</th>
                    <th className="py-2.5 px-3 text-right">Sell-In Qty</th>
                    <th className="py-2.5 px-3 text-right">Sell-In ($)</th>
                    <th className="py-2.5 px-3 text-right">Sell-Out Qty</th>
                    <th className="py-2.5 px-3 text-right">Sell-Out ($)</th>
                    <th className="py-2.5 px-3 text-right">Sell-Through</th>
                    <th className="py-2.5 px-3 text-right">Stock Diff (Qty)</th>
                    <th className="py-2.5 px-3 text-right">Stock Diff ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconciliationMatrix.map((item, idx) => {
                    const stockDiffQty = item.sellin_qty - item.sellout_qty;
                    const stockDiffVal = item.sellin_amount - item.sellout_value;

                    return (
                      <tr key={`${item.retailer_id}_${item.sku}_${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                            <span>{item.retailer_name}</span>
                            {item.is_unregistered_retailer && (
                              <span className="px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-800 rounded font-bold">
                                Unregistered
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-zinc-400">{item.retailer_id}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-zinc-700">{item.brand || "—"}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-medium text-zinc-800">{item.sku}</div>
                          {item.product_name && (
                            <div className="text-[11px] text-zinc-500 truncate max-w-xs">{item.product_name}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-zinc-800">{item.sellin_qty.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-zinc-900">
                          ${item.sellin_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-zinc-800">{item.sellout_qty.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-zinc-900">
                          ${item.sellout_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            item.sell_through >= 80
                              ? "bg-emerald-50 text-emerald-700"
                              : item.sell_through >= 50
                              ? "bg-blue-50 text-[#0B57D0]"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {item.sell_through.toFixed(1)}%
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${stockDiffQty < 0 ? "text-red-600" : "text-zinc-900"}`}>
                          {stockDiffQty.toLocaleString()}
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${stockDiffVal < 0 ? "text-red-600" : "text-zinc-900"}`}>
                          ${stockDiffVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === "sell_in" ? (
          /* 2. Sell-In Records (Consolidated Customer Sales Report) */
          <div className="p-4">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-slate-200 text-[11px] font-bold text-zinc-600 uppercase tracking-tight">
                    <th className="py-2.5 px-3">Retailer</th>
                    <th className="py-2.5 px-3">Product / SKU</th>
                    <th className="py-2.5 px-3 text-right">Gross Qty (SI)</th>
                    <th className="py-2.5 px-3 text-right">Returns (CN)</th>
                    <th className="py-2.5 px-3 text-right">Net Qty</th>
                    <th className="py-2.5 px-3 text-right">Gross SI ($)</th>
                    <th className="py-2.5 px-3 text-right">Returns CN ($)</th>
                    <th className="py-2.5 px-3 text-right">Net Amount ($)</th>
                    <th className="py-2.5 px-3 text-right">Unit Price ($)</th>
                    <th className="py-2.5 px-3">Payment Terms</th>
                    <th className="py-2.5 px-3">Expected Cash Date</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeSalesIn
                    .filter((r) => {
                      if (retailerFilter !== "all" && r.retailer_id !== retailerFilter) return false;
                      if (searchTerm) {
                        const term = searchTerm.toLowerCase();
                        return (
                          (r.sku || "").toLowerCase().includes(term) ||
                          (r.product_name || "").toLowerCase().includes(term) ||
                          (r.retailer_id || "").toLowerCase().includes(term) ||
                          (r.retailer_name || "").toLowerCase().includes(term)
                        );
                      }
                      return true;
                    })
                    .map((item) => {
                      const retDisplay = getRetailerDisplay(item.retailer_id);
                      const grossQty = Number(item.gross_qty || (Number(item.total_qty || 0) > 0 ? item.total_qty : 0));
                      const returnsQty = Number(item.returns_qty || (Number(item.total_qty || 0) < 0 ? Math.abs(item.total_qty) : 0));
                      const netQty = Number(item.total_qty || 0);

                      const grossAmt = Number(item.gross_amount || (Number(item.total_amount || 0) > 0 ? item.total_amount : 0));
                      const returnsAmt = Number(item.returns_amount || (Number(item.total_amount || 0) < 0 ? Math.abs(item.total_amount) : 0));
                      const netAmt = Number(item.total_amount || 0);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                              <span>{retDisplay.name || item.retailer_name}</span>
                              {retDisplay.isUnregistered && (
                                <span className="px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-800 rounded font-bold">
                                  Unregistered
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-zinc-400">{item.retailer_id}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-medium text-zinc-800 flex items-center gap-1.5">
                              <span>{item.sku}</span>
                              {item.unmapped_sku && (
                                <span className="px-1 py-0.2 text-[10px] bg-amber-100 text-amber-800 rounded font-bold">
                                  New SKU
                                </span>
                              )}
                            </div>
                            {item.product_name && (
                              <div className="text-[11px] text-zinc-500 truncate max-w-xs">{item.product_name}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-zinc-700">{grossQty.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-rose-600">
                            {returnsQty > 0 ? `-${returnsQty.toLocaleString()}` : "0"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-zinc-900">{netQty.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-zinc-700">
                            ${grossAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-rose-600">
                            {returnsAmt > 0 ? `-$${returnsAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold ${netAmt < 0 ? "text-rose-600" : "text-zinc-900"}`}>
                            ${netAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-zinc-600">
                            ${Number(item.unit_price || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-zinc-600">{item.payment_terms || "30d"}</td>
                          <td className="py-2.5 px-3 font-medium text-zinc-800">{item.expected_cash_date || "—"}</td>
                          <td className="py-2.5 px-3 text-right">
                            {!isLocked && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setEditingSellIn(item)}
                                  className="p-1 text-zinc-500 hover:text-zinc-900 rounded hover:bg-slate-200"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await fetch(`${API_BASE}/api/sales-inout/sales-in/${item.id}`, { method: "DELETE" });
                                      showToast("Record deleted", "success");
                                      await fetchBatchDetails(currentPeriod, true);
                                    } catch (err: any) {
                                      showToast(err.message, "error");
                                    }
                                  }}
                                  className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* 3. Sell-Out Records (Store POS Breakdown) */
          <div className="p-4">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] border-b border-slate-200 text-[11px] font-bold text-zinc-600 uppercase tracking-tight">
                    <th className="py-2.5 px-3">Retailer</th>
                    <th className="py-2.5 px-3">Store Branch</th>
                    <th className="py-2.5 px-3">Master SKU</th>
                    <th className="py-2.5 px-3 text-right">Qty Sold</th>
                    <th className="py-2.5 px-3 text-right">Buyer Cost ($)</th>
                    <th className="py-2.5 px-3 text-right">Total Value ($)</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeSalesOut
                    .filter((r) => {
                      if (retailerFilter !== "all" && r.retailer_id !== retailerFilter) return false;
                      if (searchTerm) {
                        const term = searchTerm.toLowerCase();
                        return (
                          (r.sku || "").toLowerCase().includes(term) ||
                          (r.store_id || "").toLowerCase().includes(term) ||
                          (r.raw_store_name || "").toLowerCase().includes(term) ||
                          (r.retailer_id || "").toLowerCase().includes(term)
                        );
                      }
                      return true;
                    })
                    .map((item) => {
                      const retDisplay = getRetailerDisplay(item.retailer_id);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                              <span>{retDisplay.name}</span>
                              {retDisplay.isUnregistered && (
                                <span className="px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-800 rounded font-bold">
                                  Unregistered
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-zinc-400">{item.retailer_id}</div>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-800">
                            {item.raw_store_name || item.store_id}
                            {item.unmapped_store && (
                              <span className="ml-1.5 px-1 py-0.2 text-[10px] bg-amber-100 text-amber-800 rounded font-bold">
                                Unregistered Store
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-zinc-800">
                            {item.sku}
                            {item.unmapped_sku && (
                              <span className="ml-1.5 px-1 py-0.2 text-[10px] bg-amber-100 text-amber-800 rounded font-bold">
                                New SKU
                              </span>
                            )}
                            {item.unmapped_listing && (
                              <span className="ml-1.5 px-1 py-0.2 text-[10px] bg-amber-100 text-amber-800 rounded font-bold">
                                No Listing Price
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-zinc-800">{Number(item.qty_sold).toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-zinc-600">${Number(item.buyer_cost).toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-zinc-900">
                            ${Number(item.total_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.is_estimated ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">
                                Estimated Fallback
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                POS Actual
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {!isLocked && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setEditingSellOut(item)}
                                  className="p-1 text-zinc-500 hover:text-zinc-900 rounded hover:bg-slate-200"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      await fetch(`${API_BASE}/api/sales-inout/sales-out/${item.id}`, { method: "DELETE" });
                                      showToast("Record deleted", "success");
                                      await fetchBatchDetails(currentPeriod, true);
                                    } catch (err: any) {
                                      showToast(err.message, "error");
                                    }
                                  }}
                                  className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 🚀 7. Centered Upload Popup Modal (with Tabs: Sell In / Sell Out) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Update Sales Data</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Reconciliation Period: <strong>{currentPeriod}</strong></p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setPosRetailerModal(null);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs (Symmetrical 50/50 Full-Width Header) */}
            <div className="border-b border-slate-200 bg-[#F8F9FA] flex w-full">
              <button
                type="button"
                onClick={() => {
                  setUploadTab("sell_in");
                  setPosRetailerModal(null);
                }}
                className={`flex-1 w-1/2 h-11 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center ${
                  uploadTab === "sell_in"
                    ? "border-[#0B57D0] text-[#0B57D0] bg-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-slate-100/80"
                }`}
              >
                <span className="w-full text-center block">Update Sale In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadTab("sell_out");
                  setPosRetailerModal(null);
                }}
                className={`flex-1 w-1/2 h-11 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center ${
                  uploadTab === "sell_out"
                    ? "border-[#0B57D0] text-[#0B57D0] bg-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-slate-100/80"
                }`}
              >
                <span className="w-full text-center block">Update Sale Out</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4 text-xs">
              {uploadTab === "sell_in" ? (
                /* 📄 Sell-In PDF Upload */
                <div className="space-y-4">

                  {/* Excel Dropzone */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        setSelectedFile(file);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                      selectedFile
                        ? "border-[#0B57D0] bg-blue-50/20"
                        : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
                    }`}
                  >
                    <input
                      type="file"
                      id="monthly-excel-upload"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div className="font-bold text-zinc-900 text-sm">{selectedFile.name}</div>
                        <div className="text-[11px] text-zinc-500">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Excel Spreadsheet
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <label
                            htmlFor="monthly-excel-upload"
                            className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
                          >
                            Change File
                          </label>
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="monthly-excel-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-zinc-500 flex items-center justify-center">
                          <FileSpreadsheet className="w-6 h-6" />
                        </div>
                        <div className="font-bold text-zinc-800 text-sm">Upload Customer Sales Report Excel</div>
                        <p className="text-zinc-500 text-xs max-w-sm">
                          Upload your Excel (.xlsx / .xls) report containing columns: <code className="bg-slate-100 px-1 py-0.5 rounded text-zinc-700 font-mono">custcode, name, prodcode, proddesp, qty, totalsi, totalcn, nett</code>
                        </p>
                        <span className="mt-1 px-2.5 py-1 text-[11px] font-semibold text-[#0B57D0] bg-blue-50 border border-blue-200 rounded-md">
                          Select Excel File
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Sell-In Modal Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUploadModal(false);
                        setSelectedFile(null);
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedFile && handleExcelUpload(selectedFile)}
                      disabled={!selectedFile || uploadingExcel}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#0B57D0] text-white hover:bg-[#0842A0] rounded-lg shadow-xs transition-all disabled:opacity-50"
                    >
                      {uploadingExcel ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Importing Records...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Import Excel Statement</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* 🏪 Sell-Out per Retailer Action List */
                <div className="space-y-3">
                  {posRetailerModal ? (
                    /* Specific POS Upload Form for Selected Retailer */
                    <div className="space-y-3 bg-slate-50/60 p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div>
                          <span className="font-bold text-zinc-900 text-xs">
                            Upload POS Data: {posRetailerModal.display_name || posRetailerModal.name || posRetailerModal.id}
                          </span>
                          <p className="text-[11px] text-zinc-500 mt-0.5">Paste CSV or store line items for this retailer.</p>
                        </div>
                        <button
                          onClick={() => setPosRetailerModal(null)}
                          className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="font-bold text-zinc-700 block mb-1 text-[11px]">
                          Store POS Lines (Store Code, Store Name, SKU, Qty Sold):
                        </label>
                        <textarea
                          rows={6}
                          value={posUploadText}
                          onChange={(e) => setPosUploadText(e.target.value)}
                          placeholder={`FP-01, FairPrice AMK Hub, TEA-500, 150\nFP-02, FairPrice Jurong Point, TEA-500, 200\nFP-03, FairPrice VivoCity, TEA-500, 180`}
                          className="w-full font-mono text-xs p-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#0B57D0]"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setPosRetailerModal(null)}
                          className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-slate-200 rounded-lg"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={handlePosUploadSubmit}
                          disabled={posUploading || !posUploadText.trim()}
                          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#0B57D0] text-white hover:bg-[#0842A0] rounded-lg shadow-xs transition-all disabled:opacity-50"
                        >
                          {posUploading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Save POS Records</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* All Retailers Table with Per-Line Actions */
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#F8F9FA] border-b border-slate-200 text-[11px] font-bold text-zinc-600 uppercase tracking-tight">
                            <th className="py-2.5 px-3">Retailer</th>
                            <th className="py-2.5 px-3">Delivered (Sell-In)</th>
                            <th className="py-2.5 px-3">Sell-Out Status</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {retailersList.map((r: any) => {
                            const retId = String(r.id || "").toLowerCase();
                            const retSellIn = safeSalesIn.filter((s: any) => String(s.retailer_id || "").toLowerCase() === retId);
                            const retSellInUnits = retSellIn.reduce((sum: number, s: any) => sum + Number(s.total_qty || 0), 0);
                            const retSellOut = safeSalesOut.filter((s: any) => String(s.retailer_id || "").toLowerCase() === retId);
                            const isEstimated = retSellOut.length > 0 && retSellOut.every((s: any) => s.is_estimated);

                            return (
                              <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-zinc-900">{r.display_name || r.name || r.id}</div>
                                  <div className="text-[10px] font-mono text-zinc-500">{r.id}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  {retSellIn.length > 0 ? (
                                    <span className="font-medium text-zinc-800">
                                      {retSellInUnits.toLocaleString()} units ({retSellIn.length} SKUs)
                                    </span>
                                  ) : (
                                    <span className="text-zinc-400 text-[11px] italic">No Sell-In data</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {retSellOut.length > 0 ? (
                                    isEstimated ? (
                                      <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 rounded-md">
                                        Estimated ({retSellOut.length} lines)
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                                        {retSellOut.length} POS records
                                      </span>
                                    )
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-zinc-600 rounded-md">
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Upload Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPosRetailerModal(r);
                                        setPosUploadText("");
                                      }}
                                      className="px-2.5 py-1 text-xs font-semibold text-zinc-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-all flex items-center gap-1"
                                      title="Upload POS file or paste CSV for this retailer"
                                    >
                                      <Upload className="w-3 h-3 text-zinc-500" />
                                      <span>Upload</span>
                                    </button>

                                    {/* Use Sell-In Data Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleUseSellInForRetailer(r.id)}
                                      disabled={retSellIn.length === 0 || actionLoadingRetailer === r.id}
                                      className="px-2.5 py-1 text-xs font-semibold text-[#0B57D0] bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                                      title="Use this month's Sell-In data as estimated Sell-Out"
                                    >
                                      {actionLoadingRetailer === r.id ? (
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Calculator className="w-3 h-3 text-[#0B57D0]" />
                                      )}
                                      <span>Use Sell In</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Unresolved Items Modal */}
      {showUnresolvedModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Unresolved Items ({totalUnresolvedCount})</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Register these in their respective modules, then click Refresh.</p>
              </div>
              <button
                onClick={() => setShowUnresolvedModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4 text-xs">
              {/* Unmapped Retailers */}
              {unmappedSellInRet.length > 0 && (
                <div>
                  <h4 className="font-bold text-zinc-900 mb-2 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <span>Unregistered Retailers ({unmappedSellInRet.length})</span>
                  </h4>
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {unmappedSellInRet.map((r, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-zinc-900 mr-2">{r.retailer_id}</span>
                          {r.retailer_name && <span className="text-zinc-700 font-medium">{r.retailer_name}</span>}
                        </div>
                        <span className="text-zinc-500 text-[11px]">Add to Retailers Database</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmapped Stores */}
              {unmappedSellOutStore.length > 0 && (
                <div>
                  <h4 className="font-bold text-zinc-900 mb-2 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-amber-600" />
                    <span>Unregistered Stores ({unmappedSellOutStore.length})</span>
                  </h4>
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {unmappedSellOutStore.map((s, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-zinc-900 mr-2">{s.store_id || "No Code"}</span>
                          <span className="text-zinc-700">{s.raw_store_name}</span>
                        </div>
                        <span className="text-zinc-500 text-[11px]">Add to Stores DB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmapped SKUs */}
              {uniqueUnmappedSkus.length > 0 && (
                <div>
                  <h4 className="font-bold text-zinc-900 mb-2 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span>Unregistered SKUs ({uniqueUnmappedSkus.length})</span>
                  </h4>
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {uniqueUnmappedSkus.map((k, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between">
                        <span className="font-mono font-bold text-zinc-900">{k.sku || k.raw_sku}</span>
                        <span className="text-zinc-500 text-[11px]">Add to Products DB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-zinc-50 flex items-center justify-between shrink-0">
              <button
                onClick={() => setShowUnresolvedModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  await handleRevalidate();
                  setShowUnresolvedModal(false);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-[#0B57D0] text-white hover:bg-[#0842A0] rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync & Re-validate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Edit Sell-In Modal */}
      {editingSellIn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-950">Edit Sell-In Item</h3>
              <button onClick={() => setEditingSellIn(null)}><X className="w-4 h-4 text-zinc-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Total Qty:</label>
                <input
                  type="number"
                  value={editingSellIn.total_qty}
                  onChange={(e) => setEditingSellIn({ ...editingSellIn, total_qty: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Total Amount ($):</label>
                <input
                  type="number"
                  value={editingSellIn.total_amount}
                  onChange={(e) => setEditingSellIn({ ...editingSellIn, total_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Payment Terms:</label>
                <input
                  type="text"
                  value={editingSellIn.payment_terms || "30d"}
                  onChange={(e) => setEditingSellIn({ ...editingSellIn, payment_terms: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-zinc-50 flex items-center justify-end gap-2">
              <button onClick={() => setEditingSellIn(null)} className="px-3 py-1.5 text-xs text-zinc-600">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    await fetch(`${API_BASE}/api/sales-inout/sales-in`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        id: editingSellIn.id,
                        updates: {
                          total_qty: editingSellIn.total_qty,
                          total_amount: editingSellIn.total_amount,
                          payment_terms: editingSellIn.payment_terms
                        }
                      })
                    });
                    showToast("Sell-In updated", "success");
                    setEditingSellIn(null);
                    await fetchBatchDetails(currentPeriod, true);
                  } catch (err: any) {
                    showToast(err.message, "error");
                  }
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-[#0B57D0] text-white rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Edit Sell-Out Modal */}
      {editingSellOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-950">Edit Sell-Out Item</h3>
              <button onClick={() => setEditingSellOut(null)}><X className="w-4 h-4 text-zinc-400" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Store Name:</label>
                <input
                  type="text"
                  value={editingSellOut.raw_store_name || ""}
                  onChange={(e) => setEditingSellOut({ ...editingSellOut, raw_store_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Qty Sold:</label>
                <input
                  type="number"
                  value={editingSellOut.qty_sold}
                  onChange={(e) => setEditingSellOut({ ...editingSellOut, qty_sold: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Buyer Cost ($):</label>
                <input
                  type="number"
                  value={editingSellOut.buyer_cost}
                  onChange={(e) => setEditingSellOut({ ...editingSellOut, buyer_cost: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-zinc-50 flex items-center justify-end gap-2">
              <button onClick={() => setEditingSellOut(null)} className="px-3 py-1.5 text-xs text-zinc-600">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    await fetch(`${API_BASE}/api/sales-inout/sales-out`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        id: editingSellOut.id,
                        updates: {
                          raw_store_name: editingSellOut.raw_store_name,
                          qty_sold: editingSellOut.qty_sold,
                          buyer_cost: editingSellOut.buyer_cost,
                          total_value: editingSellOut.qty_sold * editingSellOut.buyer_cost
                        }
                      })
                    });
                    showToast("Sell-Out updated", "success");
                    setEditingSellOut(null);
                    await fetchBatchDetails(currentPeriod, true);
                  } catch (err: any) {
                    showToast(err.message, "error");
                  }
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-[#0B57D0] text-white rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 11. Combine / Merge Unregistered Retailers Modal */}
      {showMergeRetailerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-[#F8F9FA]">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#0B57D0]" />
                  <span>Combine & Merge Retailers</span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Select unregistered customer codes and merge them under a registered master retailer.
                </p>
              </div>
              <button
                onClick={() => setShowMergeRetailerModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Step 1: Select Unmapped Retailer Codes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-zinc-800 flex items-center gap-1">
                    <span>1. Select Retailer Codes to Merge:</span>
                    <span className="text-[10px] text-zinc-400 font-normal">
                      ({selectedMergeSources.length} of {unmappedSellInRet.length} selected)
                    </span>
                  </label>
                  {unmappedSellInRet.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedMergeSources(unmappedSellInRet.map((u) => u.retailer_id))}
                        className="text-[#0B57D0] hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span className="text-zinc-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMergeSources([])}
                        className="text-zinc-500 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {unmappedSellInRet.length === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-center">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                    <p className="font-semibold text-xs">All customer codes are already registered!</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">There are no unregistered retailers to merge for this period.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto bg-slate-50/50">
                    {unmappedSellInRet.map((u) => {
                      const isChecked = selectedMergeSources.includes(u.retailer_id);
                      return (
                        <label
                          key={u.retailer_id}
                          className={`flex items-center justify-between p-2.5 hover:bg-blue-50/40 cursor-pointer transition-colors ${
                            isChecked ? "bg-blue-50/60" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMergeSources((prev) => [...prev, u.retailer_id]);
                                } else {
                                  setSelectedMergeSources((prev) => prev.filter((id) => id !== u.retailer_id));
                                }
                              }}
                              className="rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0] w-4 h-4 cursor-pointer"
                            />
                            <div>
                              <div className="font-bold text-zinc-900">{u.retailer_name}</div>
                              <div className="font-mono text-[10px] text-zinc-500">{u.retailer_id}</div>
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded font-bold">
                            Unregistered
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 2: Select Target Registered Retailer */}
              <div>
                <label className="font-bold text-zinc-800 block mb-1.5">
                  2. Merge Under Registered Master Retailer:
                </label>
                <select
                  value={selectedMergeTarget}
                  onChange={(e) => setSelectedMergeTarget(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0]"
                >
                  <option value="">— Select Registered Retailer —</option>
                  {retailersList
                    .filter((r) => !r.unmapped_retailer)
                    .map((r) => (
                      <option key={r.id || r.retailer_id} value={r.id || r.retailer_id}>
                        {r.display_name || r.name || r.retailer_id} ({r.id || r.retailer_id})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-zinc-400 mt-1">
                  All transactions from the selected codes will be grouped and consolidated under this master retailer.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-[#F8F9FA] flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-zinc-500">
                {selectedMergeSources.length > 0 && selectedMergeTarget
                  ? `Ready to merge ${selectedMergeSources.length} code(s)`
                  : "Select codes and target to proceed"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMergeRetailerModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMergeRetailers}
                  disabled={selectedMergeSources.length === 0 || !selectedMergeTarget || mergingRetailers}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#0B57D0] text-white hover:bg-[#0842A0] rounded-lg shadow-xs transition-all disabled:opacity-40 cursor-pointer"
                >
                  {mergingRetailers ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Merging...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5" />
                      <span>Merge Retailers</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Clear / Reset Data Modal (Filter to retailers that have active data in currentPeriod) */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5 text-red-600">
                  <Trash2 className="w-4 h-4" />
                  <span>Clear & Reset Sales Data</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Reconciliation Period: <strong>{currentPeriod}</strong> • Select retailer or clear entire month dataset
                </p>
              </div>
              <button
                onClick={() => setShowClearModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Symmetrical 50/50 Tabs */}
            <div className="border-b border-slate-200 bg-[#F8F9FA] flex w-full">
              <button
                type="button"
                onClick={() => setClearTab("sell_in")}
                className={`flex-1 w-1/2 h-11 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center ${
                  clearTab === "sell_in"
                    ? "border-red-600 text-red-600 bg-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-slate-100/80"
                }`}
              >
                <span className="w-full text-center block">Clear Sell-In Records</span>
              </button>
              <button
                type="button"
                onClick={() => setClearTab("sell_out")}
                className={`flex-1 w-1/2 h-11 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center ${
                  clearTab === "sell_out"
                    ? "border-red-600 text-red-600 bg-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-slate-100/80"
                }`}
              >
                <span className="w-full text-center block">Clear Sell-Out Records</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4 text-xs">
              {clearTab === "sell_in" ? (
                /* Clear Sell-In List */
                <div>
                  {(() => {
                    const retMap = new Map<string, { id: string; name: string; count: number; totalAmount: number; totalUnits: number }>();
                    safeSalesIn.forEach((si) => {
                      const retDisplay = getRetailerDisplay(si.retailer_id);
                      const existing = retMap.get(si.retailer_id) || {
                        id: si.retailer_id,
                        name: retDisplay.name,
                        count: 0,
                        totalAmount: 0,
                        totalUnits: 0
                      };
                      existing.count += 1;
                      existing.totalAmount += Number(si.total_amount || 0);
                      existing.totalUnits += Number(si.total_qty || 0);
                      retMap.set(si.retailer_id, existing);
                    });
                    const availableRetailers = Array.from(retMap.values());

                    if (availableRetailers.length === 0) {
                      return (
                        <div className="p-8 text-center text-zinc-500 bg-slate-50 border border-slate-200 rounded-lg">
                          <Package className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                          <p className="font-semibold">No Sell-In records found for {currentPeriod}</p>
                          <span className="text-[11px] text-zinc-400">Upload a Million PDF or add records to get started.</span>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#F8F9FA] border-b border-slate-200 text-[11px] font-bold text-zinc-600 uppercase tracking-tight">
                                <th className="py-2.5 px-3">Retailer with Data</th>
                                <th className="py-2.5 px-3 text-right">SKUs / Lines</th>
                                <th className="py-2.5 px-3 text-right">Net Qty</th>
                                <th className="py-2.5 px-3 text-right">Total Billed ($)</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {availableRetailers.map((r) => (
                                <tr key={r.id} className="hover:bg-red-50/30 transition-colors">
                                  <td className="py-2.5 px-3">
                                    <div className="font-bold text-zinc-900">{r.name}</div>
                                    <div className="text-[10px] font-mono text-zinc-500">{r.id}</div>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-zinc-800">{r.count} lines</td>
                                  <td className="py-2.5 px-3 text-right font-medium text-zinc-800">{r.totalUnits.toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right font-bold text-zinc-900">
                                    ${r.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <button
                                      disabled={clearingData}
                                      onClick={() => {
                                        setConfirmConfig({
                                          open: true,
                                          title: `Clear Sell-In for ${r.name}`,
                                          description: `Are you sure you want to delete all Sell-In records for ${r.name} (${r.id}) in period ${currentPeriod}?`,
                                          variant: "danger",
                                          onConfirm: async () => {
                                            setClearingData(true);
                                            try {
                                              const res = await fetch(`${API_BASE}/api/sales-inout/clear`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                  period: currentPeriod,
                                                  type: "sell_in",
                                                  retailer_id: r.id
                                                })
                                              });
                                              const data = await res.json();
                                              if (!res.ok) throw new Error(data.error || "Failed to clear records");
                                              showToast(`Cleared Sell-In records for ${r.name}`, "success");
                                              await fetchBatchDetails(currentPeriod, true);
                                              await fetchBatchesList();
                                            } catch (err: any) {
                                              showToast(err.message, "error");
                                            } finally {
                                              setClearingData(false);
                                            }
                                          }
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-all shadow-xs disabled:opacity-50"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Clear</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Bulk Clear All Sell-In Button */}
                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500 font-medium">
                            Total {availableRetailers.length} retailers with Sell-In data
                          </span>
                          <button
                            disabled={clearingData}
                            onClick={() => {
                              setConfirmConfig({
                                open: true,
                                title: `Clear All Sell-In Records for ${currentPeriod}`,
                                description: `Are you sure you want to clear ALL Sell-In records for month ${currentPeriod}? This cannot be undone.`,
                                variant: "danger",
                                onConfirm: async () => {
                                  setClearingData(true);
                                  try {
                                    const res = await fetch(`${API_BASE}/api/sales-inout/clear`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        period: currentPeriod,
                                        type: "sell_in"
                                      })
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.error || "Failed to clear all sell-in records");
                                    showToast("All Sell-In records cleared for this month", "success");
                                    setShowClearModal(false);
                                    await fetchBatchDetails(currentPeriod, true);
                                    await fetchBatchesList();
                                  } catch (err: any) {
                                    showToast(err.message, "error");
                                  } finally {
                                    setClearingData(false);
                                  }
                                }
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg transition-all shadow-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Clear All Sell-In for {currentPeriod}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                /* Clear Sell-Out List */
                <div>
                  {(() => {
                    const retMap = new Map<string, { id: string; name: string; count: number; totalValue: number; totalQty: number }>();
                    safeSalesOut.forEach((so) => {
                      const retDisplay = getRetailerDisplay(so.retailer_id);
                      const existing = retMap.get(so.retailer_id) || {
                        id: so.retailer_id,
                        name: retDisplay.name,
                        count: 0,
                        totalValue: 0,
                        totalQty: 0
                      };
                      existing.count += 1;
                      existing.totalValue += Number(so.total_value || 0);
                      existing.totalQty += Number(so.qty_sold || 0);
                      retMap.set(so.retailer_id, existing);
                    });
                    const availableRetailers = Array.from(retMap.values());

                    if (availableRetailers.length === 0) {
                      return (
                        <div className="p-8 text-center text-zinc-500 bg-slate-50 border border-slate-200 rounded-lg">
                          <Store className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                          <p className="font-semibold">No Sell-Out records found for {currentPeriod}</p>
                          <span className="text-[11px] text-zinc-400">Upload store POS data or run fallback calculation.</span>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#F8F9FA] border-b border-slate-200 text-[11px] font-bold text-zinc-600 uppercase tracking-tight">
                                <th className="py-2.5 px-3">Retailer with POS Data</th>
                                <th className="py-2.5 px-3 text-right">Store / SKU Lines</th>
                                <th className="py-2.5 px-3 text-right">Total Qty Sold</th>
                                <th className="py-2.5 px-3 text-right">Total Value ($)</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {availableRetailers.map((r) => (
                                <tr key={r.id} className="hover:bg-red-50/30 transition-colors">
                                  <td className="py-2.5 px-3">
                                    <div className="font-bold text-zinc-900">{r.name}</div>
                                    <div className="text-[10px] font-mono text-zinc-500">{r.id}</div>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-medium text-zinc-800">{r.count} lines</td>
                                  <td className="py-2.5 px-3 text-right font-medium text-zinc-800">{r.totalQty.toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right font-bold text-zinc-900">
                                    ${r.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <button
                                      disabled={clearingData}
                                      onClick={() => {
                                        setConfirmConfig({
                                          open: true,
                                          title: `Clear Sell-Out for ${r.name}`,
                                          description: `Are you sure you want to delete all Sell-Out records for ${r.name} (${r.id}) in period ${currentPeriod}?`,
                                          variant: "danger",
                                          onConfirm: async () => {
                                            setClearingData(true);
                                            try {
                                              const res = await fetch(`${API_BASE}/api/sales-inout/clear`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({
                                                  period: currentPeriod,
                                                  type: "sell_out",
                                                  retailer_id: r.id
                                                })
                                              });
                                              const data = await res.json();
                                              if (!res.ok) throw new Error(data.error || "Failed to clear records");
                                              showToast(`Cleared Sell-Out records for ${r.name}`, "success");
                                              await fetchBatchDetails(currentPeriod, true);
                                              await fetchBatchesList();
                                            } catch (err: any) {
                                              showToast(err.message, "error");
                                            } finally {
                                              setClearingData(false);
                                            }
                                          }
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-all shadow-xs disabled:opacity-50"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Clear</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Bulk Clear All Sell-Out Button */}
                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500 font-medium">
                            Total {availableRetailers.length} retailers with Sell-Out data
                          </span>
                          <button
                            disabled={clearingData}
                            onClick={() => {
                              setConfirmConfig({
                                open: true,
                                title: `Clear All Sell-Out Records for ${currentPeriod}`,
                                description: `Are you sure you want to clear ALL Sell-Out records for month ${currentPeriod}? This cannot be undone.`,
                                variant: "danger",
                                onConfirm: async () => {
                                  setClearingData(true);
                                  try {
                                    const res = await fetch(`${API_BASE}/api/sales-inout/clear`, {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        period: currentPeriod,
                                        type: "sell_out"
                                      })
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.error || "Failed to clear all sell-out records");
                                    showToast("All Sell-Out records cleared for this month", "success");
                                    setShowClearModal(false);
                                    await fetchBatchDetails(currentPeriod, true);
                                    await fetchBatchesList();
                                  } catch (err: any) {
                                    showToast(err.message, "error");
                                  } finally {
                                    setClearingData(false);
                                  }
                                }
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg transition-all shadow-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Clear All Sell-Out for {currentPeriod}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-[#F8F9FA] flex items-center justify-between gap-4">
              <button
                type="button"
                disabled={clearingData}
                onClick={() => {
                  setConfirmConfig({
                    open: true,
                    title: `Reset & Purge Entire Dataset for ${currentPeriod}`,
                    description: `DANGER: Are you sure you want to completely purge BOTH Sell-In and Sell-Out data for ${currentPeriod}?`,
                    variant: "danger",
                    onConfirm: async () => {
                      setClearingData(true);
                      try {
                        const res = await fetch(`${API_BASE}/api/sales-inout/clear`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            period: currentPeriod,
                            type: "all"
                          })
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed to reset month data");
                        showToast("Entire month dataset reset successfully", "success");
                        setShowClearModal(false);
                        await fetchBatchDetails(currentPeriod, true);
                        await fetchBatchesList();
                      } catch (err: any) {
                        showToast(err.message, "error");
                      } finally {
                        setClearingData(false);
                      }
                    }
                  });
                }}
                className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                Reset Entire Month (Sell-In & Sell-Out)
              </button>

              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-zinc-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-xs shrink-0 whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Invoices Breakdown Modal (Drill-down for consolidated Sell-In row) */}
      {viewingInvoicesBreakdown && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0B57D0]" />
                  <span>Invoice Breakdown: {viewingInvoicesBreakdown.sku}</span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Retailer: <strong>{getRetailerDisplay(viewingInvoicesBreakdown.retailer_id).name}</strong> ({viewingInvoicesBreakdown.retailer_id})
                  {viewingInvoicesBreakdown.product_name && ` • ${viewingInvoicesBreakdown.product_name}`}
                </p>
              </div>
              <button
                onClick={() => setViewingInvoicesBreakdown(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Strip */}
            <div className="px-5 py-2.5 bg-[#F8F9FA] border-b border-slate-200 grid grid-cols-3 gap-2 text-xs">
              <div className="bg-white border border-slate-200 rounded-md px-3 py-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight block">Gross Billed</span>
                <div className="text-xs font-bold text-zinc-900 mt-0.5">
                  {Number(viewingInvoicesBreakdown.gross_qty || viewingInvoicesBreakdown.total_qty || 0).toLocaleString()} units (${Number(viewingInvoicesBreakdown.gross_amount || viewingInvoicesBreakdown.total_amount || 0).toFixed(2)})
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-md px-3 py-1.5">
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-tight block">Returns / Credit Notes</span>
                <div className="text-xs font-bold text-red-600 mt-0.5">
                  -{Number(viewingInvoicesBreakdown.returns_qty || 0).toLocaleString()} units (-${Number(viewingInvoicesBreakdown.returns_amount || 0).toFixed(2)})
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-md px-3 py-1.5">
                <span className="text-[10px] font-bold text-[#0B57D0] uppercase tracking-tight block">Net Total</span>
                <div className="text-xs font-bold text-[#0B57D0] mt-0.5">
                  {Number(viewingInvoicesBreakdown.total_qty || 0).toLocaleString()} units (${Number(viewingInvoicesBreakdown.total_amount || 0).toFixed(2)})
                </div>
              </div>
            </div>

            {/* Invoices List Table */}
            <div className="p-5 overflow-y-auto max-h-[50vh] text-xs">
              {Array.isArray(viewingInvoicesBreakdown.invoices_breakdown) && viewingInvoicesBreakdown.invoices_breakdown.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8F9FA] border-b border-slate-200 text-[11px] font-bold text-zinc-600 uppercase tracking-tight">
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Doc No</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-right">Qty</th>
                        <th className="py-2 px-3 text-right">Amount ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingInvoicesBreakdown.invoices_breakdown.map((inv: any, idx: number) => {
                        const isCN = inv.doc_type === "CN" || String(inv.doc_no || "").startsWith("CN") || Number(inv.qty || 0) < 0 || Number(inv.amount || 0) < 0;
                        return (
                          <tr key={idx} className={`hover:bg-slate-50 transition-colors ${isCN ? "bg-red-50/20" : ""}`}>
                            <td className="py-2 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isCN ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                              }`}>
                                {inv.doc_type || (isCN ? "CN" : "SI")}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono font-semibold text-zinc-900">{inv.doc_no || "—"}</td>
                            <td className="py-2 px-3 text-zinc-600">{inv.date || "—"}</td>
                            <td className={`py-2 px-3 text-right font-medium ${isCN ? "text-red-600 font-bold" : "text-zinc-800"}`}>
                              {Number(inv.qty || 0).toLocaleString()}
                            </td>
                            <td className={`py-2 px-3 text-right font-bold ${isCN ? "text-red-600" : "text-zinc-900"}`}>
                              ${Number(inv.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-zinc-500 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-semibold">Single Document: {viewingInvoicesBreakdown.invoice_number || "Direct Entry"}</p>
                  <p className="text-[11px] text-zinc-400 mt-1">No multi-line breakdown array attached to this record.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-[#F8F9FA] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewingInvoicesBreakdown(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-[#0B57D0] text-white hover:bg-[#0842A0] rounded-lg shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmConfig.open}
        onOpenChange={(open) => setConfirmConfig((prev) => ({ ...prev, open }))}
        title={confirmConfig.title}
        description={confirmConfig.description}
        variant={confirmConfig.variant || "dark"}
        onConfirm={confirmConfig.onConfirm}
      />
    </div>
  );
}
