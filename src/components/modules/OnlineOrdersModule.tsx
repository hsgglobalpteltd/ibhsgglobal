"use client";

import * as React from "react";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  Printer,
  X,
  ExternalLink,
  Clock,
  Package,
  Truck,
  Check,
  ChevronRight,
  Filter,
  Copy,
  Trash2,
  RefreshCw
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { ConfirmDialog } from "../confirm-dialog";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface OrderItem {
  carton_type: "standard" | "custom_mix";
  sku?: string;
  name: string;
  carton_qty: number;
  carton_price: number;
  price_per_piece?: number;
  loose_bottles?: Array<{
    sku: string;
    flavor: string;
    qty: number;
    price_per_piece?: number;
  }>;
}

interface ShopOrder {
  id: string;
  order_ref: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address: string;
  postal_code: string;
  unit_no?: string;
  delivery_notes?: string;
  items: OrderItem[];
  total_cartons: number;
  subtotal: number;
  discount_amount: number;
  applied_discount_rule?: string;
  delivery_fee: number;
  total_amount: number;
  payment_method: string;
  payment_status: "pending_payment" | "submitted_via_whatsapp" | "verified" | "rejected" | "refunded";
  fulfillment_status: "pending" | "verified" | "in_progress" | "packing" | "out_for_delivery" | "completed" | "cancelled";
  payment_proof_url?: string;
  payment_verified_at?: number;
  payment_verified_by?: string;
  created_at: number;
  updated_at: number;
}

export function OnlineOrdersModule({ profile }: { profile?: any }) {
  const [orders, setOrders] = React.useState<ShopOrder[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedOrder, setSelectedOrder] = React.useState<ShopOrder | null>(null);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [rejectReason, setRejectReason] = React.useState<string>("");
  const [showRejectInput, setShowRejectInput] = React.useState<boolean>(false);
  const [clearConfirmOpen, setClearConfirmOpen] = React.useState<boolean>(false);

  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/orders`);
      if (!res.ok) throw new Error("Failed to fetch shop orders");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOrders();

    const handleGlobalRefresh = () => {
      fetchOrders();
    };
    window.addEventListener("db-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("db-refresh", handleGlobalRefresh);
  }, [fetchOrders]);

  // Format timestamp dd/mm/yyyy hh:mm
  const formatDateTime = (epochMs?: number) => {
    if (!epochMs) return "-";
    const d = new Date(Number(epochMs));
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Verify Payment Action
  const handleVerifyPayment = async (orderId: string) => {
    setActionLoading(true);
    const operatorName = profile?.displayName || profile?.email || "Operator";
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/orders/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          operator_name: operatorName
        })
      });
      if (!res.ok) throw new Error("Failed to verify payment");
      showToast("Payment verified successfully", "success");
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                payment_status: "verified",
                fulfillment_status: "verified",
                payment_verified_at: Date.now(),
                payment_verified_by: operatorName
              }
            : null
        );
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Payment Action
  const handleRejectPayment = async (orderId: string) => {
    setActionLoading(true);
    const operatorName = profile?.displayName || profile?.email || "Operator";
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/orders/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          operator_name: operatorName,
          reject: true,
          reject_reason: rejectReason || "Payment not received"
        })
      });
      if (!res.ok) throw new Error("Failed to reject payment");
      showToast("Order marked as rejected", "info");
      setShowRejectInput(false);
      setRejectReason("");
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, payment_status: "rejected", fulfillment_status: "cancelled" } : null
        );
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Update Fulfillment Status
  const handleUpdateFulfillment = async (orderId: string, nextStatus: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/orders/update-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, fulfillment_status: nextStatus })
      });
      if (!res.ok) throw new Error("Failed to update status");
      showToast(`Fulfillment status changed to ${nextStatus}`, "success");
      await fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, fulfillment_status: nextStatus } : null));
      }
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Clear All Past Online Orders
  const handleClearAllOrders = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/orders/clear-all`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to clear online orders");
      setOrders([]);
      setSelectedOrder(null);
      showToast("All past online orders cleared successfully", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to clear online orders", "error");
    } finally {
      setActionLoading(false);
      setClearConfirmOpen(false);
    }
  };

  // Print Warehouse Packing Slip
  const handlePrintSlip = (order: ShopOrder) => {
    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) return;

    const itemsHtml = order.items
      .map((it, idx) => {
        let looseHtml = "";
        if (it.loose_bottles && it.loose_bottles.length > 0) {
          looseHtml = `
          <div style="margin-top: 6px; padding-left: 12px; font-size: 12px; color: #475569;">
            <strong>Loose Bottles Breakdown:</strong>
            <ul style="margin: 4px 0; padding-left: 16px;">
              ${it.loose_bottles.map((lb) => `<li>${lb.qty}x ${lb.flavor} (${lb.sku})</li>`).join("")}
            </ul>
          </div>`;
        }
        return `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 8px; font-weight: 600;">
            ${idx + 1}. ${it.name}
            ${looseHtml}
          </td>
          <td style="padding: 10px 8px; text-align: center; font-weight: 700;">${it.carton_qty} CTN</td>
          <td style="padding: 10px 8px; text-align: right; font-weight: 600;">$${Number(it.carton_price * it.carton_qty).toFixed(2)}</td>
        </tr>`;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Packing Slip - ${order.order_ref}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0F172A; }
            table { width: 100%; border-collapse: collapse; }
            .header { border-bottom: 2px solid #0F172A; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #E2E8F0; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800;">HSG GLOBAL STORE</h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">WAREHOUSE PACKING & DISPATCH SLIP</p>
            </div>
            <div style="text-align: right;">
              <h2 style="margin: 0; font-size: 18px; font-family: monospace; font-weight: 700;">${order.order_ref}</h2>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748B;">Date: ${formatDateTime(order.created_at)}</p>
            </div>
          </div>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 18px; font-size: 13px;">
            <div style="font-weight: 700; color: #334155; margin-bottom: 6px;">DELIVERY RECIPIENT</div>
            <div><strong>${order.customer_name}</strong> (${order.customer_phone})</div>
            <div>${order.delivery_address} ${order.unit_no ? `, ${order.unit_no}` : ""}</div>
            <div>Singapore ${order.postal_code}</div>
            ${order.delivery_notes ? `<div style="margin-top: 6px; color: #B45309; font-weight: 600;">⚠️ Note: ${order.delivery_notes}</div>` : ""}
          </div>

          <table style="margin-bottom: 20px; font-size: 13px;">
            <thead>
              <tr style="background: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
                <th style="padding: 8px; text-align: left;">Item Description</th>
                <th style="padding: 8px; text-align: center; width: 100px;">Carton Qty</th>
                <th style="padding: 8px; text-align: right; width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 8px; text-align: right; font-weight: 600;">Total Cartons:</td>
                <td style="padding: 8px; text-align: right; font-weight: 800;">${order.total_cartons} CTN</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 8px; text-align: right; font-weight: 600;">Total Amount Paid:</td>
                <td style="padding: 8px; text-align: right; font-weight: 800; font-size: 15px;">SGD $${Number(order.total_amount).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="border-top: 1px dashed #CBD5E1; padding-top: 12px; font-size: 11px; color: #64748B; text-align: center;">
            Order verified & packed via iB - HSG Global System • shop.hsgglobal.sg
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Helper to determine single simplified lifecycle status
  const getOrderStatus = React.useCallback(
    (ord: ShopOrder): "pending" | "verified" | "in_progress" | "complete" | "cancelled" => {
      if (ord.payment_status === "rejected" || ord.fulfillment_status === "cancelled") {
        return "cancelled";
      }
      if (ord.fulfillment_status === "completed") {
        return "complete";
      }
      if (
        ord.fulfillment_status === "in_progress" ||
        ord.fulfillment_status === "packing" ||
        ord.fulfillment_status === "out_for_delivery"
      ) {
        return "in_progress";
      }
      if (ord.payment_status === "verified") {
        return "verified";
      }
      return "pending";
    },
    []
  );

  // Filter orders
  const filteredOrders = React.useMemo(() => {
    return orders.filter((ord) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ord.order_ref.toLowerCase().includes(q) ||
        ord.customer_name.toLowerCase().includes(q) ||
        ord.customer_phone.toLowerCase().includes(q) ||
        ord.postal_code.includes(q);

      if (!matchesSearch) return false;

      const orderStatus = getOrderStatus(ord);
      if (statusFilter === "all") return true;
      if (statusFilter === "pending") return orderStatus === "pending";
      if (statusFilter === "verified") return orderStatus === "verified";
      if (statusFilter === "in_progress") return orderStatus === "in_progress";
      if (statusFilter === "complete") return orderStatus === "complete";

      return true;
    });
  }, [orders, searchQuery, statusFilter, getOrderStatus]);

  // Counts for pills
  const counts = React.useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => getOrderStatus(o) === "pending").length,
      verified: orders.filter((o) => getOrderStatus(o) === "verified").length,
      in_progress: orders.filter((o) => getOrderStatus(o) === "in_progress").length,
      complete: orders.filter((o) => getOrderStatus(o) === "complete").length
    };
  }, [orders, getOrderStatus]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">Online Order</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage incoming public shop orders, verify PayNow SGQR transfers, and coordinate warehouse packing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {orders.length > 0 && (
            <button
              onClick={() => setClearConfirmOpen(true)}
              disabled={loading || actionLoading}
              className="h-9 px-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Clear all past online orders"
            >
              <Trash2 size={14} />
              Clear All Orders
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTER & CONTROLS TOOLBAR */}
      <div className="bg-[#F8F9FA] border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Search Input */}
        <div className="relative w-72">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Ref, Name, Phone, Postal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === "all" ? "bg-[#D3E3FD] text-[#041E49]" : "text-zinc-600 hover:bg-slate-200/60"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === "pending" ? "bg-[#D3E3FD] text-[#041E49]" : "text-zinc-600 hover:bg-slate-200/60"
            }`}
          >
            Pending ({counts.pending})
          </button>
          <button
            onClick={() => setStatusFilter("verified")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === "verified" ? "bg-[#D3E3FD] text-[#041E49]" : "text-zinc-600 hover:bg-slate-200/60"
            }`}
          >
            Verified ({counts.verified})
          </button>
          <button
            onClick={() => setStatusFilter("in_progress")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === "in_progress" ? "bg-[#D3E3FD] text-[#041E49]" : "text-zinc-600 hover:bg-slate-200/60"
            }`}
          >
            In-Progress ({counts.in_progress})
          </button>
          <button
            onClick={() => setStatusFilter("complete")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === "complete" ? "bg-[#D3E3FD] text-[#041E49]" : "text-zinc-600 hover:bg-slate-200/60"
            }`}
          >
            Complete ({counts.complete})
          </button>
        </div>
      </div>

      {/* 3. MAIN CONTENT / ORDERS TABLE */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500">
            <Loader2 className="animate-spin text-[#0B57D0]" size={24} />
            <span className="text-xs">Loading shop orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500 text-center p-6">
            <Package size={32} className="text-slate-300" />
            <p className="text-sm font-semibold text-zinc-700">No Orders Found</p>
            <p className="text-xs text-zinc-400">
              {searchQuery ? "Try searching with a different keyword or reset filters." : "Incoming consumer orders will appear here automatically."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-zinc-600 font-semibold z-10">
              <tr>
                <th className="px-4 py-2.5">Order Ref</th>
                <th className="px-3 py-2.5">Date / Time</th>
                <th className="px-3 py-2.5">Customer Contact</th>
                <th className="px-3 py-2.5">Delivery Address</th>
                <th className="px-3 py-2.5 text-center">Cartons</th>
                <th className="px-3 py-2.5 text-right">Amount (SGD)</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-4 py-2.5 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((ord) => {
                const status = getOrderStatus(ord);
                const isPickup = ord.delivery_address?.toLowerCase().includes("self-pickup");
                return (
                  <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-zinc-900">
                        {ord.order_ref}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-zinc-500 whitespace-nowrap text-xs">
                      {formatDateTime(ord.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-zinc-900 text-xs">{ord.customer_name}</div>
                      <a
                        href={`https://wa.me/${ord.customer_phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-zinc-500 hover:text-[#0B57D0] flex items-center gap-1 mt-0.5"
                      >
                        <Phone size={10} />
                        {ord.customer_phone}
                      </a>
                    </td>
                    <td className="px-3 py-3 max-w-xs">
                      {isPickup ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-zinc-700 border border-slate-200">
                          Self-Pickup
                        </span>
                      ) : (
                        <div>
                          <div className="text-zinc-700 text-xs truncate font-normal">
                            {ord.delivery_address} {ord.unit_no ? `, ${ord.unit_no}` : ""}
                          </div>
                          <div className="text-[11px] text-zinc-400">S({ord.postal_code})</div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-zinc-700 text-xs font-normal">
                      {ord.total_cartons} CTN
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-zinc-900 text-xs tabular-nums">
                      ${Number(ord.total_amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {status === "pending" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-zinc-700 border border-slate-200">
                          Pending
                        </span>
                      )}
                      {status === "verified" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#D3E3FD]/60 text-[#041E49] border border-blue-200">
                          Verified
                        </span>
                      )}
                      {status === "in_progress" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-[#0B57D0] border border-blue-200">
                          In-Progress
                        </span>
                      )}
                      {status === "complete" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-zinc-800 border border-slate-200">
                          Complete
                        </span>
                      )}
                      {status === "cancelled" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-2.5 py-1 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => handlePrintSlip(ord)}
                          className="p-1 border border-slate-200 hover:bg-slate-50 text-zinc-600 rounded-md transition-colors cursor-pointer"
                          title="Print Packing Slip"
                        >
                          <Printer size={13} />
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

      {/* ========================================================= */}
      {/* DRAWER: ORDER REVIEW & VERIFICATION                       */}
      {/* ========================================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 border-l border-slate-200">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-950">Order {selectedOrder.order_ref}</h2>
                  <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono">
                    {selectedOrder.id}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">Submitted on {formatDateTime(selectedOrder.created_at)}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setShowRejectInput(false);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 text-xs">
              {/* Payment Verification Card */}
              <div
                className={`p-4 rounded-xl border ${
                  selectedOrder.payment_status === "verified"
                    ? "bg-[#D3E3FD]/20 border-blue-200"
                    : selectedOrder.payment_status === "rejected"
                    ? "bg-rose-50/60 border-rose-200"
                    : "bg-[#F8F9FA] border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    {selectedOrder.payment_status === "verified" ? (
                      <>
                        <CheckCircle2 size={15} className="text-[#0B57D0]" />
                        <span className="text-[#041E49] font-medium">Payment Verified</span>
                      </>
                    ) : selectedOrder.payment_status === "rejected" ? (
                      <>
                        <AlertCircle size={15} className="text-rose-600" />
                        <span className="text-rose-900 font-medium">Payment Rejected</span>
                      </>
                    ) : (
                      <>
                        <Clock size={15} className="text-zinc-600" />
                        <span className="text-zinc-800 font-medium">Awaiting Verification</span>
                      </>
                    )}
                  </div>
                  <span className="font-medium text-xs text-zinc-900 tabular-nums">
                    SGD ${Number(selectedOrder.total_amount).toFixed(2)}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-600 mb-3 font-normal">
                  Confirm receipt of{" "}
                  <strong className="font-semibold text-zinc-900">${Number(selectedOrder.total_amount).toFixed(2)}</strong> against PayNow reference{" "}
                  <code className="bg-white px-1.5 py-0.5 rounded font-mono text-zinc-900 border border-slate-200">{selectedOrder.order_ref}</code>.
                </p>

                {selectedOrder.payment_status === "verified" ? (
                  <div className="text-[11px] text-zinc-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    Verified by <span className="font-medium text-zinc-900">{selectedOrder.payment_verified_by || "Admin"}</span> on{" "}
                    {formatDateTime(selectedOrder.payment_verified_at)}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerifyPayment(selectedOrder.id)}
                        disabled={actionLoading}
                        className="flex-1 h-9 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        Verify Payment
                      </button>
                      <button
                        onClick={() => setShowRejectInput(!showRejectInput)}
                        className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 rounded-lg font-medium text-xs transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>

                    {showRejectInput && (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          placeholder="Reason (e.g. Funds not received)"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                        <button
                          onClick={() => handleRejectPayment(selectedOrder.id)}
                          className="h-8 px-3 bg-rose-600 text-white rounded-lg font-medium text-xs"
                        >
                          Confirm
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Status Control */}
              <div className="bg-[#F8F9FA] border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-zinc-800 text-xs block">Order Status:</span>
                  <span className="text-[11px] text-zinc-500">Update order lifecycle stage</span>
                </div>
                <select
                  value={getOrderStatus(selectedOrder)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const targetFulfillment = val === "complete" ? "completed" : val;
                    handleUpdateFulfillment(selectedOrder.id, targetFulfillment);
                  }}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-zinc-800 cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="in_progress">In-Progress</option>
                  <option value="complete">Complete</option>
                </select>
              </div>

              {/* Customer & Address Details */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <h3 className="font-medium text-zinc-900 text-xs mb-2 border-b border-slate-100 pb-1.5">
                  Customer & Delivery Location
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <span className="text-zinc-500 text-[11px] block">Customer Name</span>
                    <span className="font-medium text-zinc-900">{selectedOrder.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[11px] block">Phone / WhatsApp</span>
                    <a
                      href={`https://wa.me/${selectedOrder.customer_phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#0B57D0] hover:underline flex items-center gap-1"
                    >
                      {selectedOrder.customer_phone} <ExternalLink size={11} />
                    </a>
                  </div>
                  {selectedOrder.delivery_address?.toLowerCase().includes("self-pickup") ? (
                    <div className="col-span-2">
                      <span className="text-zinc-500 text-[11px] block">Fulfillment Method</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-zinc-700 border border-slate-200 mt-0.5">
                        Self-Pickup at Warehouse
                      </span>
                    </div>
                  ) : (
                    <div className="col-span-2">
                      <span className="text-zinc-500 text-[11px] block">Delivery Address</span>
                      <span className="font-medium text-zinc-900">
                        {selectedOrder.delivery_address} {selectedOrder.unit_no ? `, ${selectedOrder.unit_no}` : ""}
                      </span>
                      <div className="text-[11px] text-zinc-400 font-mono">Postal Code: {selectedOrder.postal_code}</div>
                    </div>
                  )}
                  {selectedOrder.delivery_notes && (
                    <div className="col-span-2 bg-slate-50 border border-slate-200 rounded p-2 text-zinc-700 text-[11px]">
                      <span className="font-medium text-zinc-900">Delivery Note:</span> {selectedOrder.delivery_notes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <a
                    href={`https://wa.me/${selectedOrder.customer_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Hi ${selectedOrder.customer_name}, regarding your order #${selectedOrder.order_ref} on HSG Global Store...`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone size={13} />
                    Message Customer on WhatsApp
                  </a>
                  <button
                    onClick={() => handlePrintSlip(selectedOrder)}
                    className="h-8 px-3 border border-slate-200 bg-white hover:bg-slate-100 text-zinc-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer size={13} /> Print Slip
                  </button>
                </div>
              </div>

              {/* Items & Loose Bottle Packing Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-1.5">
                  <h3 className="font-bold text-zinc-900">Items Ordered ({selectedOrder.total_cartons} Cartons)</h3>
                  <span className="text-[11px] font-bold text-zinc-500">Pick Checklist</span>
                </div>

                <div className="flex flex-col gap-3">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-zinc-900">
                            {idx + 1}. {it.name}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-medium">
                            Type: {it.carton_type === "custom_mix" ? "🎨 Custom Mix Carton" : "📦 Standard Carton"}
                          </div>
                        </div>
                        <span className="font-bold text-zinc-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {it.carton_qty} CTN • ${Number(it.carton_price * it.carton_qty).toFixed(2)}
                        </span>
                      </div>

                      {/* Loose bottle breakdown if custom mix */}
                      {it.loose_bottles && it.loose_bottles.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                          <span className="text-[11px] font-bold text-zinc-700 block mb-1">
                            Loose Bottle Picking Recipe:
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {it.loose_bottles.map((lb, lIdx) => (
                              <div
                                key={lIdx}
                                className="bg-white px-2 py-1 rounded border border-slate-200 text-[11px] flex items-center justify-between"
                              >
                                <span className="font-semibold text-zinc-800">{lb.flavor}</span>
                                <span className="font-bold text-[#0B57D0]">{lb.qty} bottles</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="mt-4 pt-3 border-t border-slate-200 space-y-1 text-right">
                  <div className="text-zinc-600">
                    Subtotal: <span className="font-semibold">${Number(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(selectedOrder.discount_amount) > 0 && (
                    <div className="text-emerald-600">
                      Discount ({selectedOrder.applied_discount_rule || "Promo"}):{" "}
                      <span className="font-semibold">-${Number(selectedOrder.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="text-zinc-600">
                    Delivery Fee:{" "}
                    <span className="font-semibold">
                      {Number(selectedOrder.delivery_fee) === 0 ? "FREE" : `$${Number(selectedOrder.delivery_fee).toFixed(2)}`}
                    </span>
                  </div>
                  <div className="text-base font-bold text-zinc-950 pt-1 border-t border-slate-200">
                    Total Payable: SGD ${Number(selectedOrder.total_amount).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Orders Confirmation Dialog */}
      <ConfirmDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title="Clear All Past Online Orders"
        description="Are you sure you want to permanently clear and delete all past online orders? This will permanently remove all 18+ records from the database."
        variant="danger"
        confirmText="Clear All Orders"
        cancelText="Cancel"
        onConfirm={handleClearAllOrders}
      />
    </div>
  );
}
