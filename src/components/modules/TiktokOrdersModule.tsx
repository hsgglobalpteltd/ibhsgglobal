"use client";

import * as React from "react";
import { 
  Search, RefreshCw, Printer, Download, Eye, FileText, CheckCircle2, 
  XCircle, AlertCircle, Clock, ExternalLink, Filter, Calendar, 
  ChevronDown, ChevronUp, Package, Shield, Layers, Camera, X
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { PDFDocument } from "pdf-lib";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface OrderItem {
  product_name: string;
  sku_name: string;
  seller_sku: string;
  sku_image: string;
  quantity: number;
  sale_price: string;
  currency: string;
}

interface IssueItem {
  id: string;
  title: string;
  note: string;
  done: boolean;
}

interface Order {
  id: string;
  shop_id: string;
  shop_name: string;
  create_time: number;
  actual_status: string;
  system_status: string;
  recipient_name: string;
  shipping_provider: string;
  tracking_number: string;
  total_amount: string;
  currency: string;
  items: OrderItem[];
  package_list?: any[];
  packed_by?: string;
  packed_at?: number;
  proof_photo?: string;
  is_printed?: boolean;
  issues?: IssueItem[];
  logs?: any[];
  before_pack_photo?: string;
  transit_at?: number;
  delivered_at?: number;
}

interface Shop {
  id: string;
  name: string;
}

const formatStatusLabel = (status: string) => {
  switch ((status || "").toUpperCase()) {
    case "AWAITING_SHIPMENT": return "Awaiting Shipment";
    case "AWAITING_COLLECTION": return "Awaiting Collection";
    case "IN_TRANSIT":
    case "SHIPPED":
    case "PICK_UP":
      return "In Transit";
    case "DELIVERED":
    case "COMPLETED":
      return "Delivered";
    case "CANCELLED": return "Cancelled";
    default: return (status || "").toLowerCase().replace(/_/g, " ");
  }
};

const getStatusBadgeClass = (status: string) => {
  const s = (status || "").toUpperCase();
  if (s === "AWAITING_SHIPMENT") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "AWAITING_COLLECTION") return "bg-blue-50 text-blue-700 border-blue-200";
  if (s === "IN_TRANSIT" || s === "SHIPPED" || s === "PICK_UP") return "bg-purple-50 text-purple-700 border-purple-200";
  if (s === "DELIVERED" || s === "COMPLETED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "CANCELLED") return "bg-red-50 text-red-700 border-red-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export function TiktokOrdersModule({ profile }: { profile?: any }) {
  const [shops, setShops] = React.useState<Shop[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Filter & Search states
  const [selectedShopId, setSelectedShopId] = React.useState<string>("all");
  const [selectedTab, setSelectedTab] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"newest" | "oldest">("newest");
  
  // Date filters (empty by default to show all orders)
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");

  // Modals & Active selections
  const [selectedOrderItems, setSelectedOrderItems] = React.useState<Order | null>(null);
  const [selectedOrderForLogs, setSelectedOrderForLogs] = React.useState<Order | null>(null);
  const [issuesOrder, setIssuesOrder] = React.useState<Order | null>(null);
  const [newIssueTitle, setNewIssueTitle] = React.useState("");
  const [newIssueNote, setNewIssueNote] = React.useState("");
  const [awbLoadingOrderId, setAwbLoadingOrderId] = React.useState<string | null>(null);
  const [selectedProofOrder, setSelectedProofOrder] = React.useState<Order | null>(null);
  const [zoomImgUrl, setZoomImgUrl] = React.useState<string | null>(null);

  // Bulk operations
  const [selectedOrderIds, setSelectedOrderIds] = React.useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = React.useState(false);
  const [bulkDownloadProgress, setBulkDownloadProgress] = React.useState("");
  const [isBulkMarkingPrinted, setIsBulkMarkingPrinted] = React.useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 50;

  const fetchOrders = React.useCallback(async (sync = false, silent = false) => {
    try {
      if (sync && !silent) setIsSyncing(true);
      else if (!silent) setIsLoading(true);
      setError(null);

      const syncStartDateParam = sync ? `&sync_start_date=${Date.now() - 15 * 86400000}` : "";
      const res = await fetch(`${WORKER_URL}/api/tiktok/orders?sync=${sync}${syncStartDateParam}&_t=${Date.now()}`, {
        cache: "no-store"
      });
      if (!res.ok) throw new Error(`Failed to load orders: ${res.statusText}`);
      
      const data = (await res.json()) as any;
      if (data.success) {
        setShops(data.shops || []);
        setOrders(data.orders || []);
        if (sync && !silent) showToast("Orders synchronized with TikTok successfully", "success");
      } else {
        throw new Error(data.error || "Failed to fetch orders");
      }
    } catch (err: any) {
      if (!silent) {
        setError(err.message);
        showToast(err.message || "Failed to fetch orders", "error");
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
        setIsSyncing(false);
      }
    }
  }, []);

  React.useEffect(() => {
    // 1. Instant load from cached tiktok_orders in database
    fetchOrders(false);

    // 2. 5-Minute polling from TikTok API (last 15 days only)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchOrders(true, true);
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchOrders]);

  // Global db-refresh listener
  React.useEffect(() => {
    const handleDbRefresh = () => fetchOrders(true, false);
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [fetchOrders]);

  // Filtered orders computation
  const filteredOrders = React.useMemo(() => {
    return orders.filter(order => {
      // Shop filter
      if (selectedShopId !== "all" && order.shop_id !== selectedShopId) return false;

      // Tab / Status filter
      if (selectedTab !== "all") {
        const actual = (order.actual_status || "").toUpperCase();
        if (selectedTab === "awaiting_shipment" && actual !== "AWAITING_SHIPMENT") return false;
        if (selectedTab === "awaiting_collection" && actual !== "AWAITING_COLLECTION") return false;
        if (selectedTab === "in_transit" && actual !== "IN_TRANSIT" && actual !== "SHIPPED" && actual !== "PICK_UP") return false;
        if (selectedTab === "delivered" && actual !== "DELIVERED" && actual !== "COMPLETED") return false;
        if (selectedTab === "cancelled" && actual !== "CANCELLED") return false;
      }

      // Date range filter
      if (startDate || endDate) {
        const orderDate = new Date(order.create_time * 1000).toISOString().split("T")[0];
        if (startDate && orderDate < startDate) return false;
        if (endDate && orderDate > endDate) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = (order.id || "").toLowerCase().includes(q);
        const trackMatch = (order.tracking_number || "").toLowerCase().includes(q);
        const nameMatch = (order.recipient_name || "").toLowerCase().includes(q);
        const itemMatch = (order.items || []).some(
          it => (it.product_name || "").toLowerCase().includes(q) || (it.sku_name || "").toLowerCase().includes(q) || (it.seller_sku || "").toLowerCase().includes(q)
        );
        if (!idMatch && !trackMatch && !nameMatch && !itemMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "newest") return b.create_time - a.create_time;
      return a.create_time - b.create_time;
    });
  }, [orders, selectedShopId, selectedTab, startDate, endDate, searchQuery, sortBy]);

  // Tab counts
  const tabCounts = React.useMemo(() => {
    const counts = { all: 0, awaiting_shipment: 0, awaiting_collection: 0, in_transit: 0, delivered: 0, cancelled: 0 };
    orders.forEach(o => {
      if (selectedShopId !== "all" && o.shop_id !== selectedShopId) return;
      counts.all++;
      const s = (o.actual_status || "").toUpperCase();
      if (s === "AWAITING_SHIPMENT") counts.awaiting_shipment++;
      else if (s === "AWAITING_COLLECTION") counts.awaiting_collection++;
      else if (s === "IN_TRANSIT" || s === "SHIPPED" || s === "PICK_UP") counts.in_transit++;
      else if (s === "DELIVERED" || s === "COMPLETED") counts.delivered++;
      else if (s === "CANCELLED") counts.cancelled++;
    });
    return counts;
  }, [orders, selectedShopId]);

  // Paged orders
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pagedOrders = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  // Selection handlers
  const handleSelectAllOnPage = () => {
    const next = new Set(selectedOrderIds);
    const allPageSelected = pagedOrders.every(o => next.has(o.id));
    if (allPageSelected) {
      pagedOrders.forEach(o => next.delete(o.id));
    } else {
      pagedOrders.forEach(o => next.add(o.id));
    }
    setSelectedOrderIds(next);
  };

  const handleToggleSelectOrder = (id: string) => {
    const next = new Set(selectedOrderIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOrderIds(next);
  };

  // Toggle Printed status
  const handleTogglePrinted = async (orderId: string, currentStatus: boolean) => {
    try {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, is_printed: !currentStatus } : o));
      const res = await fetch(`${WORKER_URL}/api/tiktok/orders/toggle-printed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, is_printed: !currentStatus })
      });
      if (!res.ok) throw new Error("Failed to update printed status");
      showToast("Printed status updated", "success");
    } catch (err: any) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, is_printed: currentStatus } : o));
      showToast(err.message, "error");
    }
  };

  // Mark all selected as printed
  const handleBulkMarkAsPrinted = async () => {
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0 || isBulkMarkingPrinted) return;
    setIsBulkMarkingPrinted(true);
    showToast(`Marking ${ids.length} orders as printed...`, "info");
    try {
      for (const id of ids) {
        await fetch(`${WORKER_URL}/api/tiktok/orders/toggle-printed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: id, is_printed: true })
        });
      }
      setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, is_printed: true } : o));
      setSelectedOrderIds(new Set());
      showToast("Selected orders marked as printed", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsBulkMarkingPrinted(false);
    }
  };

  // Single AWB Download / Print
  const handlePrintAWB = async (order: Order) => {
    try {
      setAwbLoadingOrderId(order.id);
      showToast("Fetching AWB document...", "info");
      const res = await fetch(`${WORKER_URL}/api/tiktok/orders/single-awb-pdf?order_id=${encodeURIComponent(order.id)}&shop_id=${encodeURIComponent(order.shop_id)}`);
      if (!res.ok) throw new Error("Failed to load AWB PDF");
      const blob = await res.blob();
      triggerBlobDownload(blob, `AWB_${order.id}.pdf`);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, is_printed: true } : o));
      showToast("AWB downloaded successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to download AWB", "error");
    } finally {
      setAwbLoadingOrderId(null);
    }
  };

  // Bulk AWB Merge & Download
  const handleBulkDownloadAWB = async () => {
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0 || isBulkDownloading) return;

    setIsBulkDownloading(true);
    setBulkDownloadProgress(`0 / ${ids.length}`);
    try {
      const mergedPdf = await PDFDocument.create();
      let successCount = 0;

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        setBulkDownloadProgress(`${i + 1} / ${ids.length}`);
        const ord = orders.find(o => o.id === id);
        if (!ord) continue;

        try {
          const res = await fetch(`${WORKER_URL}/api/tiktok/orders/single-awb-pdf?order_id=${encodeURIComponent(ord.id)}&shop_id=${encodeURIComponent(ord.shop_id)}`);
          if (res.ok) {
            const pdfBytes = await res.arrayBuffer();
            const srcPdf = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
            successCount++;
          }
        } catch (e) {
          console.error(`Failed to fetch AWB for ${id}`, e);
        }
      }

      if (successCount === 0) {
        throw new Error("No AWB documents could be fetched for the selected orders.");
      }

      const mergedPdfBytes = await mergedPdf.save();
      const blob = new Blob([mergedPdfBytes as any], { type: "application/pdf" });
      triggerBlobDownload(blob, `Bulk_AWB_${Date.now()}_${successCount}_orders.pdf`);
      
      // Update local printed status
      setOrders(prev => prev.map(o => ids.includes(o.id) ? { ...o, is_printed: true } : o));
      showToast(`Merged ${successCount} AWBs downloaded successfully`, "success");
    } catch (err: any) {
      showToast(err.message || "Bulk download failed", "error");
    } finally {
      setIsBulkDownloading(false);
      setBulkDownloadProgress("");
    }
  };

  // Issues management
  const handleSaveIssue = async () => {
    if (!issuesOrder || !newIssueTitle.trim()) return;
    try {
      const currentIssues = issuesOrder.issues || [];
      const newIssue: IssueItem = {
        id: "iss_" + Date.now(),
        title: newIssueTitle.trim(),
        note: newIssueNote.trim(),
        done: false
      };
      const updatedIssues = [...currentIssues, newIssue];
      const res = await fetch(`${WORKER_URL}/api/tiktok/orders/update-issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: issuesOrder.id, issues: updatedIssues })
      });
      if (!res.ok) throw new Error("Failed to update issues");
      
      setOrders(prev => prev.map(o => o.id === issuesOrder.id ? { ...o, issues: updatedIssues } : o));
      setIssuesOrder(prev => prev ? { ...prev, issues: updatedIssues } : null);
      setNewIssueTitle("");
      setNewIssueNote("");
      showToast("Issue added", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleToggleIssueDone = async (issueId: string) => {
    if (!issuesOrder) return;
    try {
      const updatedIssues = (issuesOrder.issues || []).map(iss => 
        iss.id === issueId ? { ...iss, done: !iss.done } : iss
      );
      const res = await fetch(`${WORKER_URL}/api/tiktok/orders/update-issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: issuesOrder.id, issues: updatedIssues })
      });
      if (!res.ok) throw new Error("Failed to update issue status");

      setOrders(prev => prev.map(o => o.id === issuesOrder.id ? { ...o, issues: updatedIssues } : o));
      setIssuesOrder(prev => prev ? { ...prev, issues: updatedIssues } : null);
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] min-w-0">
      {/* Top Header & Actions Bar */}
      <div className="content-header flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pr-2">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="font-primary text-base font-bold text-zinc-900 flex items-center gap-2">
              TikTok Orders
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
              </span>
            </h3>
            <p className="font-primary text-xs text-zinc-500">
              Manage order fulfillment, AWB downloads, shipping labels, and status synchronization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Shop Selector */}
          <select
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
            className="px-3 py-1.5 border border-zinc-300 rounded-lg text-xs font-semibold bg-white text-zinc-700 focus:outline-none focus:border-[#0b57d0]"
          >
            <option value="all">All Shops ({shops.length})</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Sync Orders Button */}
          <button
            onClick={() => fetchOrders(true)}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0b57d0] text-white text-xs font-bold rounded-lg hover:bg-[#0842a0] transition duration-150 shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync TikTok"}
          </button>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-zinc-200 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
            {[
              { id: "all", label: "All", count: tabCounts.all },
              { id: "awaiting_shipment", label: "Awaiting Shipment", count: tabCounts.awaiting_shipment },
              { id: "awaiting_collection", label: "Awaiting Collection", count: tabCounts.awaiting_collection },
              { id: "in_transit", label: "In Transit", count: tabCounts.in_transit },
              { id: "delivered", label: "Delivered", count: tabCounts.delivered },
              { id: "cancelled", label: "Cancelled", count: tabCounts.cancelled },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setSelectedTab(tab.id); setCurrentPage(1); }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedTab === tab.id
                    ? "bg-[#0b57d0] text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedTab === tab.id ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-700"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Bulk Action Controls */}
          {selectedOrderIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0b57d0]">
                {selectedOrderIds.size} Selected
              </span>
              <button
                onClick={handleBulkDownloadAWB}
                disabled={isBulkDownloading}
                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 transition"
              >
                <Download size={12} />
                {isBulkDownloading ? bulkDownloadProgress : "Download AWB"}
              </button>
              <button
                onClick={handleBulkMarkAsPrinted}
                disabled={isBulkMarkingPrinted}
                className="flex items-center gap-1 px-2.5 py-1 bg-zinc-700 text-white text-xs font-bold rounded hover:bg-zinc-800 transition"
              >
                <CheckCircle2 size={12} />
                Mark Printed
              </button>
            </div>
          )}
        </div>

        {/* Search & Date Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order ID, Tracking Number, Recipient, Product, SKU..."
              className="w-full pl-8 pr-3 py-1.5 border border-zinc-300 rounded-lg text-xs bg-zinc-50 focus:bg-white focus:outline-none focus:border-[#0b57d0]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 border border-zinc-300 rounded text-xs bg-white text-zinc-700"
            />
            <span className="text-xs text-zinc-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 border border-zinc-300 rounded text-xs bg-white text-zinc-700"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="text-xs text-[#0b57d0] hover:underline font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 border border-zinc-300 rounded-lg text-xs bg-white text-zinc-700 font-medium"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="content-body flex-1 w-full overflow-hidden bg-white border border-zinc-200 rounded-lg shadow-2xs flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="animate-spin text-[#0b57d0]" size={24} />
              <span className="text-xs font-semibold text-zinc-500">Loading TikTok orders...</span>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center p-6">
              <Package className="text-zinc-300" size={40} />
              <span className="text-sm font-bold text-zinc-700">No Orders Found</span>
              <p className="text-xs text-zinc-500 max-w-sm">
                No orders match your selected shop, status, date filters, or search term. Click "Sync TikTok" to fetch new orders.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f8f9fa] border-b border-zinc-200 sticky top-0 z-10 text-zinc-600 font-bold">
                <tr>
                  <th className="p-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={pagedOrders.length > 0 && pagedOrders.every(o => selectedOrderIds.has(o.id))}
                      onChange={handleSelectAllOnPage}
                      className="rounded border-zinc-300 text-[#0b57d0] focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="p-2.5">Order ID / Shop</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Tracking / Courier</th>
                  <th className="p-2.5">Recipient</th>
                  <th className="p-2.5">Items</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-center">AWB</th>
                  <th className="p-2.5 text-center">Proofs</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {pagedOrders.map(order => {
                  const isSelected = selectedOrderIds.has(order.id);
                  const isPrinted = !!order.is_printed;
                  const hasIssues = (order.issues || []).length > 0;
                  const totalItemsQty = (order.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);

                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-[#f4f7fc] transition-colors ${isSelected ? "bg-blue-50/60" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          className="rounded border-zinc-300 text-[#0b57d0] focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Order ID & Shop */}
                      <td className="p-2.5 font-mono">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900 hover:text-[#0b57d0] cursor-pointer" onClick={() => setSelectedOrderItems(order)}>
                            {order.id}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-sans">
                            {order.shop_name}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-2.5 text-zinc-600 whitespace-nowrap">
                        {new Date(order.create_time * 1000).toLocaleDateString("en-GB")}
                        <div className="text-[10px] text-zinc-400">
                          {new Date(order.create_time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Tracking / Courier */}
                      <td className="p-2.5">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-zinc-900 font-medium">
                            {order.tracking_number || "—"}
                          </span>
                          <span className="text-[10px] font-semibold text-zinc-500">
                            {order.shipping_provider || "Standard"}
                          </span>
                        </div>
                      </td>

                      {/* Recipient */}
                      <td className="p-2.5 text-zinc-800 font-medium">
                        {order.recipient_name || "—"}
                      </td>

                      {/* Items */}
                      <td className="p-2.5">
                        <button
                          onClick={() => setSelectedOrderItems(order)}
                          className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded font-semibold text-xs transition"
                        >
                          {totalItemsQty} {totalItemsQty === 1 ? 'Item' : 'Items'}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="p-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeClass(order.actual_status)}`}>
                          {formatStatusLabel(order.actual_status)}
                        </span>
                      </td>

                      {/* AWB Status Toggle */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePrinted(order.id, isPrinted)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
                            isPrinted 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                              : "bg-zinc-100 text-zinc-500 border-zinc-300 hover:bg-zinc-200"
                          }`}
                          title="Click to toggle printed status"
                        >
                          {isPrinted ? "✓ Printed" : "Unprinted"}
                        </button>
                      </td>

                      {/* Proofs & Photos */}
                      <td className="p-2.5 text-center">
                        {order.proof_photo || order.before_pack_photo ? (
                          <button
                            onClick={() => setSelectedProofOrder(order)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                            title="View packing proof photos"
                          >
                            <Camera size={15} />
                          </button>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Print Single AWB */}
                          <button
                            onClick={() => handlePrintAWB(order)}
                            disabled={awbLoadingOrderId === order.id}
                            className="p-1 text-zinc-600 hover:text-[#0b57d0] hover:bg-zinc-100 rounded transition"
                            title="Download AWB PDF"
                          >
                            <Download size={14} className={awbLoadingOrderId === order.id ? "animate-bounce" : ""} />
                          </button>

                          {/* Issues button */}
                          <button
                            onClick={() => setIssuesOrder(order)}
                            className={`p-1 rounded transition ${
                              hasIssues 
                                ? "text-red-600 bg-red-50 hover:bg-red-100 font-bold" 
                                : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                            }`}
                            title="Manage Order Issues"
                          >
                            <AlertCircle size={14} />
                          </button>

                          {/* Order Log Timeline */}
                          <button
                            onClick={() => setSelectedOrderForLogs(order)}
                            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition"
                            title="View Audit Logs"
                          >
                            <Clock size={14} />
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

        {/* Footer Pagination */}
        <div className="p-3 bg-[#f8f9fa] border-t border-zinc-200 flex justify-between items-center text-xs text-zinc-600">
          <span>
            Showing <b>{Math.min(filteredOrders.length, (currentPage - 1) * pageSize + 1)}</b> to <b>{Math.min(filteredOrders.length, currentPage * pageSize)}</b> of <b>{filteredOrders.length}</b> orders
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 border border-zinc-300 rounded bg-white hover:bg-zinc-100 disabled:opacity-40 transition"
            >
              Previous
            </button>
            <span className="font-bold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 border border-zinc-300 rounded bg-white hover:bg-zinc-100 disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Order Items Modal */}
      {selectedOrderItems && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden font-primary animate-in fade-in zoom-in-95 duration-150">
            <header className="px-5 py-3.5 bg-[#f8f9fa] border-b border-zinc-200 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">Order Items Details</h4>
                <p className="text-[11px] text-zinc-500 font-mono">Order ID: {selectedOrderItems.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrderItems(null)} 
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
              >
                ✕
              </button>
            </header>

            <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar flex flex-col gap-3">
              {(selectedOrderItems.items || []).map((item, idx) => (
                <div key={idx} className="flex gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg items-center">
                  {item.sku_image ? (
                    <img src={item.sku_image} alt="SKU" className="w-14 h-14 object-cover rounded border border-zinc-300 shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-zinc-200 rounded flex items-center justify-center text-zinc-400 text-xs shrink-0">
                      No Img
                    </div>
                  )}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-xs font-bold text-zinc-900 line-clamp-2">{item.product_name}</span>
                    <span className="text-[11px] text-zinc-600">{item.sku_name}</span>
                    {item.seller_sku && (
                      <span className="text-[10px] font-mono text-zinc-400">SKU: {item.seller_sku}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#0b57d0]">x{item.quantity}</span>
                    <div className="text-[11px] text-zinc-500">{item.currency} {item.sale_price}</div>
                  </div>
                </div>
              ))}
            </div>

            <footer className="p-3 bg-[#f8f9fa] border-t border-zinc-200 flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-700">
                Total: {selectedOrderItems.currency} {selectedOrderItems.total_amount}
              </span>
              <button
                onClick={() => setSelectedOrderItems(null)}
                className="px-3 py-1.5 bg-[#0b57d0] text-white text-xs font-bold rounded-lg hover:bg-[#0842a0]"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Proof Photo Modal */}
      {selectedProofOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden font-primary animate-in fade-in zoom-in-95 duration-150">
            <header className="px-5 py-3.5 bg-[#f8f9fa] border-b border-zinc-200 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">Packing Proof Photos</h4>
                <p className="text-[11px] text-zinc-500 font-mono">Order ID: {selectedProofOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedProofOrder(null)} 
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
              >
                ✕
              </button>
            </header>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-zinc-700">Before Packing Photo:</span>
                {selectedProofOrder.before_pack_photo ? (
                  <img src={selectedProofOrder.before_pack_photo} alt="Before Pack" className="w-full rounded-lg border border-zinc-300 shadow-xs" />
                ) : (
                  <div className="h-48 bg-zinc-100 rounded-lg flex items-center justify-center text-xs text-zinc-400">
                    No Before Photo
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-zinc-700">After Packing Proof:</span>
                {selectedProofOrder.proof_photo ? (
                  <img src={selectedProofOrder.proof_photo} alt="After Pack" className="w-full rounded-lg border border-zinc-300 shadow-xs" />
                ) : (
                  <div className="h-48 bg-zinc-100 rounded-lg flex items-center justify-center text-xs text-zinc-400">
                    No After Photo
                  </div>
                )}
              </div>
            </div>

            <footer className="p-3 bg-[#f8f9fa] border-t border-zinc-200 flex justify-between items-center">
              <span className="text-xs text-zinc-500">
                Packed by: <b>{selectedProofOrder.packed_by || "—"}</b>
              </span>
              <button
                onClick={() => setSelectedProofOrder(null)}
                className="px-3 py-1.5 bg-[#0b57d0] text-white text-xs font-bold rounded-lg hover:bg-[#0842a0]"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Issues Management Modal */}
      {issuesOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden font-primary animate-in fade-in zoom-in-95 duration-150">
            <header className="px-5 py-3.5 bg-[#f8f9fa] border-b border-zinc-200 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">Order Issues & Remarks</h4>
                <p className="text-[11px] text-zinc-500 font-mono">Order ID: {issuesOrder.id}</p>
              </div>
              <button onClick={() => setIssuesOrder(null)} className="text-zinc-400 hover:text-zinc-700 font-bold">✕</button>
            </header>

            <div className="p-4 flex flex-col gap-4">
              {/* Existing issues list */}
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                {(issuesOrder.issues || []).length === 0 ? (
                  <span className="text-xs text-zinc-400 italic">No issues registered for this order.</span>
                ) : (
                  (issuesOrder.issues || []).map(iss => (
                    <div key={iss.id} className="flex items-start gap-2 p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg">
                      <input
                        type="checkbox"
                        checked={iss.done}
                        onChange={() => handleToggleIssueDone(iss.id)}
                        className="mt-0.5 rounded border-zinc-300 text-[#0b57d0] cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className={`text-xs font-bold ${iss.done ? "line-through text-zinc-400" : "text-zinc-800"}`}>
                          {iss.title}
                        </div>
                        {iss.note && <div className="text-[11px] text-zinc-500">{iss.note}</div>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add new issue form */}
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200">
                <span className="text-xs font-bold text-zinc-700">Add New Issue / Note:</span>
                <input
                  type="text"
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  placeholder="Issue title (e.g. Missing Item, Damaged Box)"
                  className="px-3 py-1.5 border border-zinc-300 rounded text-xs focus:outline-none focus:border-[#0b57d0]"
                />
                <textarea
                  value={newIssueNote}
                  onChange={(e) => setNewIssueNote(e.target.value)}
                  placeholder="Additional note / remark..."
                  rows={2}
                  className="px-3 py-1.5 border border-zinc-300 rounded text-xs focus:outline-none focus:border-[#0b57d0]"
                />
                <button
                  type="button"
                  onClick={handleSaveIssue}
                  className="self-end px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
                >
                  + Add Issue
                </button>
              </div>
            </div>

            <footer className="p-3 bg-[#f8f9fa] border-t border-zinc-200 flex justify-end">
              <button
                onClick={() => setIssuesOrder(null)}
                className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Right Slide-in Timeline Panel: Order Audit History */}
      {selectedOrderForLogs && (
        <>
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-zinc-950/30 z-50 transition-opacity duration-300 animate-in fade-in"
            onClick={() => setSelectedOrderForLogs(null)}
          />

          {/* Right Drawer Panel */}
          <div className="fixed top-0 right-0 h-screen w-full sm:w-[480px] bg-white shadow-2xl border-l border-zinc-200 z-50 transform transition-transform duration-300 ease-in-out flex flex-col font-primary animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <header className="p-5 border-b border-zinc-200 flex items-center justify-between bg-[#f8f9fa] shrink-0">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#0b57d0]" />
                  <h3 className="font-bold text-sm text-zinc-900">Order Audit History</h3>
                </div>
                <span className="text-xs font-mono font-bold text-zinc-600">
                  {selectedOrderForLogs.id}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrderForLogs(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 transition"
              >
                <X size={18} />
              </button>
            </header>

            {/* Order Overview Card */}
            <div className="p-4 bg-zinc-50 border-b border-zinc-200 text-xs flex flex-col gap-2 shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Shop: <b>{selectedOrderForLogs.shop_name}</b></span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(selectedOrderForLogs.actual_status)}`}>
                  {formatStatusLabel(selectedOrderForLogs.actual_status)}
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-600 font-mono text-[11px]">
                <span>Tracking: <b>{selectedOrderForLogs.tracking_number || "—"}</b></span>
                <span>Courier: <b>{selectedOrderForLogs.shipping_provider || "Standard"}</b></span>
              </div>
            </div>

            {/* Timeline Body */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-white">
              {Array.isArray(selectedOrderForLogs.logs) && selectedOrderForLogs.logs.length > 0 ? (
                <div className="relative pl-6 flex flex-col gap-6">
                  {/* Vertical Timeline Line */}
                  <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-zinc-200" />

                  {selectedOrderForLogs.logs.map((log: any, idx: number) => {
                    const actionName = log.action || log.title || "Event";
                    const isLatest = idx === selectedOrderForLogs.logs!.length - 1;
                    
                    let dotColor = "bg-[#0b57d0]";
                    if (actionName.includes("Proof") || actionName.includes("Delivered")) dotColor = "bg-emerald-600";
                    else if (actionName.includes("AWB")) dotColor = "bg-purple-600";
                    else if (actionName.includes("Collection") || actionName.includes("Pack")) dotColor = "bg-amber-600";
                    else if (actionName.includes("Cancel")) dotColor = "bg-red-600";

                    return (
                      <div key={idx} className="relative flex items-start group">
                        {/* Timeline Circle Node */}
                        <div className={`absolute -left-[19px] top-1.5 w-3.5 h-3.5 rounded-full ${dotColor} border-2 border-white shadow-xs z-10`} />

                        {/* Event Card Content */}
                        <div className="flex flex-col gap-1.5 bg-zinc-50 hover:bg-zinc-100/80 p-3.5 rounded-xl border border-zinc-200/80 w-full transition shadow-2xs">
                          <div className="flex justify-between items-start flex-wrap gap-1">
                            <span className="font-bold text-xs text-zinc-900">
                              {actionName}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-semibold bg-white px-2 py-0.5 rounded border border-zinc-200">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString("en-GB") : ""}
                            </span>
                          </div>

                          {(log.action_by || log.actionBy) && (
                            <div className="text-[11px] text-zinc-600">
                              By: <span className="font-semibold text-zinc-800">{log.action_by || log.actionBy}</span>
                            </div>
                          )}

                          {(log.details || log.remark) && (
                            <p className="text-[11px] text-zinc-600 bg-white p-2 rounded border border-zinc-200/60 leading-relaxed select-text">
                              {log.details || log.remark}
                            </p>
                          )}

                          {log.photoUrl && (
                            <div className="mt-1">
                              <img
                                src={log.photoUrl}
                                alt="Proof"
                                className="w-24 h-24 object-cover rounded-lg border border-zinc-300 shadow-xs cursor-pointer hover:scale-105 transition"
                                onClick={() => setZoomImgUrl(log.photoUrl)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                  <Clock size={36} className="text-zinc-300 mb-2" />
                  <span className="text-xs font-semibold">No audit timeline recorded yet</span>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <footer className="p-4 bg-[#f8f9fa] border-t border-zinc-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedOrderForLogs(null)}
                className="px-4 py-2 bg-[#0b57d0] hover:bg-[#0842a0] text-white text-xs font-bold rounded-lg transition shadow-sm"
              >
                Close
              </button>
            </footer>
          </div>
        </>
      )}
    </div>
  );
}
