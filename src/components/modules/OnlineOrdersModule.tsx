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
  RefreshCw,
  FileText,
  Upload,
  Image as ImageIcon,
  Building2,
  Send,
  Calendar
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { NavigationTabs, TabItem } from "../navigation-tabs";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

const ONLINE_ORDER_TABS: TabItem[] = [
  { id: "pending", label: "Pending" },
  { id: "complete", label: "Complete" },
  { id: "void", label: "Void" }
];

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
  in_track_order?: boolean;
  track_status?: string;
  track_detail_status?: string | null;
  created_at: number;
  updated_at: number;
}

// Sanitize delivery notes: Strip legacy server-injected prefix and keep genuine customer notes only
const cleanCustomerNote = (notes?: string | null): string => {
  if (!notes) return "";
  let cleaned = notes.trim();
  cleaned = cleaned.replace(/\[SELF-PICKUP AT WAREHOUSE\][^\n•]*(?:•\s*Note:\s*)?/gi, "").trim();
  cleaned = cleaned.replace(/\[Auto-verified via PayNow Email alert:[^\]]*\]/gi, "").trim();
  cleaned = cleaned.replace(/\[REJECTED:[^\]]*\]/gi, "").trim();
  cleaned = cleaned.replace(/^•\s*|•\s*$/g, "").trim();
  cleaned = cleaned.replace(/^Note:\s*/gi, "").trim();
  return cleaned;
};

// Helper to extract clean operator display name (never display raw email)
const getOperatorName = (prof?: any): string => {
  if (prof?.name && typeof prof.name === "string" && prof.name.trim()) {
    return prof.name.trim();
  }
  if (prof?.displayName && typeof prof.displayName === "string" && prof.displayName.trim()) {
    return prof.displayName.trim();
  }
  if (prof?.full_name && typeof prof.full_name === "string" && prof.full_name.trim()) {
    return prof.full_name.trim();
  }
  try {
    const cached = typeof window !== "undefined" ? localStorage.getItem("ib_user_profile") : null;
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.name && typeof parsed.name === "string" && parsed.name.trim()) {
        return parsed.name.trim();
      }
      if (parsed?.displayName && typeof parsed.displayName === "string" && parsed.displayName.trim()) {
        return parsed.displayName.trim();
      }
    }
  } catch {}
  if (prof?.email && typeof prof.email === "string" && prof.email.includes("@")) {
    const raw = prof.email.split("@")[0].replace(/[._-]/g, " ");
    return raw.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return "Operator";
};

// Format verifier name for display: handles email bot, matches current user profile, or cleans email format
const formatVerifierName = (verifier?: string | null, prof?: any): string => {
  if (!verifier) return "Admin";
  if (verifier.startsWith("PayNow_Auto_Email_Bot")) return verifier;
  if (prof?.email && verifier.toLowerCase() === prof.email.toLowerCase() && (prof.name || prof.displayName)) {
    return prof.name || prof.displayName;
  }
  if (verifier.includes("@")) {
    const raw = verifier.split("@")[0].replace(/[._-]/g, " ");
    return raw.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  return verifier;
};

// Helper to calculate Last 2 Weeks range (14 days ago to today)
const getLast2WeeksRange = (): { start: string; end: string } => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 14);
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return {
    start: formatYMD(start),
    end: formatYMD(end)
  };
};

export function OnlineOrdersModule({ profile }: { profile?: any }) {
  const [orders, setOrders] = React.useState<ShopOrder[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<"pending" | "complete" | "void">("pending");
  const [startDate, setStartDate] = React.useState<string>(() => getLast2WeeksRange().start);
  const [endDate, setEndDate] = React.useState<string>(() => getLast2WeeksRange().end);
  const [selectedOrder, setSelectedOrder] = React.useState<ShopOrder | null>(null);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [rejectReason, setRejectReason] = React.useState<string>("");
  const [showRejectInput, setShowRejectInput] = React.useState<boolean>(false);
  const [uploadingReceipt, setUploadingReceipt] = React.useState<boolean>(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = React.useState<string | null>(null);
  const [sendingOrderId, setSendingOrderId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleUploadReceipt = async (file: File) => {
    if (!selectedOrder) return;
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast("File size exceeds 15MB limit", "error");
      return;
    }

    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("order_id", selectedOrder.id);
      formData.append("file", file);

      const res = await fetch(`${WORKER_URL}/api/shop/admin/orders/upload-receipt`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to upload receipt");
      }

      const data = await res.json();
      if (data.success && data.payment_proof_url) {
        showToast("Payment receipt uploaded successfully", "success");
        setSelectedOrder((prev) => (prev ? { ...prev, payment_proof_url: data.payment_proof_url } : null));
        setOrders((prev) =>
          prev.map((o) => (o.id === selectedOrder.id ? { ...o, payment_proof_url: data.payment_proof_url } : o))
        );
      }
    } catch (err: any) {
      showToast(err.message || "Failed to upload receipt", "error");
    } finally {
      setUploadingReceipt(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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

  // Listen for Escape key to close review drawer or receipt lightbox
  React.useEffect(() => {
    if (!selectedOrder && !previewReceiptUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previewReceiptUrl) {
          setPreviewReceiptUrl(null);
        } else if (selectedOrder) {
          setSelectedOrder(null);
          setShowRejectInput(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedOrder, previewReceiptUrl]);

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
    const hasReceipt = Boolean(selectedOrder?.payment_proof_url && selectedOrder.payment_proof_url.trim());
    if (!hasReceipt) {
      showToast("Please upload the customer payment receipt before verifying payment.", "warning");
      fileInputRef.current?.click();
      return;
    }
    setActionLoading(true);
    const operatorName = getOperatorName(profile);
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
    const operatorName = getOperatorName(profile);
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

  // Send Order to Track Order (Direct skipping drafts)
  const handleSendOrder = async (order: ShopOrder) => {
    setSendingOrderId(order.id);
    const operatorName = getOperatorName(profile);
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/orders/send-to-track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          operator_name: operatorName
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to send order to Track Order");
      }

      const data = await res.json();
      showToast(
        `Order #${order.order_ref} sent to Track Order with Mark [${data.mark || "assigned"}]`,
        "success"
      );

      await fetchOrders();
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                fulfillment_status: "in_progress",
                in_track_order: true,
                track_status: "Ready to Pick",
                track_detail_status: "Ready to Pick"
              }
            : null
        );
      }
      window.dispatchEvent(new CustomEvent("db-refresh"));
    } catch (err: any) {
      showToast(err.message || "Failed to send order", "error");
    } finally {
      setSendingOrderId(null);
    }
  };

  // Print Warehouse Packing Slip / Official Receipt (100% Project 8 digital receipt look)
  const handlePrintSlip = (order: ShopOrder) => {
    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) return;

    const isPickup = order.delivery_address?.toLowerCase().includes("self-pickup");
    const isVerified = order.payment_status === "verified";
    const subtotal =
      Number(order.subtotal || 0) > 0
        ? Number(order.subtotal)
        : order.items.reduce((s, it) => s + Number(it.carton_price || 0) * Number(it.carton_qty || 1), 0);
    const deliveryFee = Number(order.delivery_fee || 0);
    const discountAmount = Number(order.discount_amount || 0);
    const totalAmount = Number(order.total_amount || 0);
    const bcrsAmount = Math.max(0, Math.round((totalAmount - subtotal - deliveryFee + discountAmount) * 100) / 100);

    const formattedDate = order.created_at
      ? new Date(order.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })
      : "-";

    const itemsHtml = order.items
      .map((item) => {
        const isMix = item.carton_type === "custom_mix" || Boolean(item.loose_bottles && item.loose_bottles.length > 0);
        const lineTotal = Number(item.carton_price || 0) * Number(item.carton_qty || 1);
        const hasItemBcrs = Boolean(
          (item as any).has_bcrs || (item.loose_bottles && item.loose_bottles.length > 0) || bcrsAmount > 0
        );

        let looseHtml = "";
        if (isMix && item.loose_bottles && item.loose_bottles.length > 0) {
          looseHtml = `
            <div style="margin-top: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 10px 14px;">
              <span style="font-size: 10px; font-weight: 800; color: #A1A1AA; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">
                Intra-Brand Mix Selections:
              </span>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 4px; font-size: 11px;">
                ${item.loose_bottles
                  .map(
                    (b) => `
                  <div style="display: flex; justify-content: space-between; padding-right: 8px; color: #3F3F46;">
                    <span>• ${b.flavor || b.sku}</span>
                    <strong style="color: #09090B;">${b.qty} pcs</strong>
                  </div>`
                  )
                  .join("")}
              </div>
            </div>`;
        }

        return `
          <div style="padding: 14px 0; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
            <div style="flex: 1;">
              <div style="font-size: 14px; font-weight: 700; color: #09090B; margin-bottom: 4px;">
                ${item.name}
              </div>
              <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 11px;">
                ${item.sku ? `<span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #71717A;">SKU: ${item.sku}</span>` : ""}
                ${hasItemBcrs ? `<span style="background: #F1F5F9; color: #52525B; border: 1px solid #E2E8F0; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 600;">BCRS Applied</span>` : ""}
              </div>
              ${looseHtml}
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <div style="font-size: 14px; font-weight: 900; color: #09090B;">
                SGD $${lineTotal.toFixed(2)}
              </div>
              <div style="font-size: 11px; color: #A1A1AA; margin-top: 2px;">
                ${item.carton_qty} ctn × $${Number(item.carton_price).toFixed(2)}
              </div>
            </div>
          </div>`;
      })
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt Preview - ${order.order_ref}</title>
          <style>
            @media print {
              @page { margin: 12mm; size: auto; }
              body { padding: 0 !important; background: white !important; }
              .receipt-wrapper { border: none !important; box-shadow: none !important; padding: 0 !important; max-width: 100% !important; }
              .no-print { display: none !important; }
            }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 24px;
              background: #F8FAFC;
              color: #0F172A;
              display: flex;
              flex-direction: column;
              align-items: center;
              -webkit-font-smoothing: antialiased;
            }
            .receipt-wrapper {
              max-width: 680px;
              width: 100%;
              background: #FFFFFF;
              border: 1px solid #E2E8F0;
              border-radius: 24px;
              padding: 28px 32px;
              box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
            }
            .toolbar-container {
              max-width: 680px;
              width: 100%;
              margin: 0 auto 16px auto;
              padding: 8px 12px;
              background: #FFFFFF;
              border: 1px solid #E2E8F0;
              border-radius: 10px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
            }
            .toolbar-left {
              font-size: 12px;
              font-weight: 600;
              color: #1E293B;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .toolbar-dot {
              display: inline-block;
              width: 8px;
              height: 8px;
              border-radius: 9999px;
              background: #0B57D0;
            }
            .toolbar-title {
              font-weight: 700;
              color: #0F172A;
            }
            .toolbar-sep {
              color: #CBD5E1;
            }
            .toolbar-ref {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              color: #64748B;
              font-size: 11px;
            }
            .toolbar-right {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .btn-print {
              height: 32px;
              padding: 0 14px;
              background: #0B57D0;
              color: #FFFFFF;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              font-family: inherit;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              transition: background 0.15s ease;
            }
            .btn-print:hover {
              background: #0842A0;
            }
            .btn-close {
              height: 32px;
              padding: 0 14px;
              background: #FFFFFF;
              border: 1px solid #DADCE0;
              color: #3C4043;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              font-family: inherit;
              cursor: pointer;
              transition: background 0.15s ease, border-color 0.15s ease;
            }
            .btn-close:hover {
              background: #F8F9FA;
              border-color: #CBD5E1;
            }
          </style>
        </head>
        <body>
          <!-- Preview Actions Bar (hidden when printing) -->
          <div class="toolbar-container no-print">
            <div class="toolbar-left">
              <span class="toolbar-dot"></span>
              <span class="toolbar-title">Receipt Preview</span>
              <span class="toolbar-sep">•</span>
              <span class="toolbar-ref">${order.order_ref}</span>
            </div>
            <div class="toolbar-right">
              <button onclick="window.print()" class="btn-print">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Print Slip</span>
              </button>
              <button onclick="window.close()" class="btn-close">
                Close
              </button>
            </div>
          </div>

          <div class="receipt-wrapper">
            <!-- Receipt Top Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #E2E8F0; padding-bottom: 20px; margin-bottom: 20px;">
              <div>
                <div style="font-size: 18px; font-weight: 900; color: #09090B; letter-spacing: -0.02em; display: flex; align-items: center; gap: 8px;">
                  <span>HSG GLOBAL PTE. LTD.</span>
                  <span style="font-size: 10px; background: #F1F5F9; color: #52525B; padding: 2px 8px; border-radius: 9999px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; border: 1px solid #E2E8F0;">
                    OFFICIAL RECEIPT
                  </span>
                </div>
                <div style="font-size: 11px; color: #71717A; line-height: 1.5; margin-top: 4px;">
                  <div>UEN: <strong style="color: #09090B;">202301234K</strong> • Registered in Singapore</div>
                  <div>Warehouse: 9 Eunos Ave 8A, Eunos Industrial Estate, Singapore 409461</div>
                  <div>Support: sales@hsgglobal.sg</div>
                </div>
              </div>

              <div style="text-align: right;">
                <span style="font-size: 10px; font-weight: 800; color: #A1A1AA; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 2px;">
                  Receipt Number
                </span>
                <span style="font-size: 18px; font-weight: 900; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #09090B; display: block;">
                  ${order.order_ref}
                </span>
                <span style="font-size: 11px; color: #71717A; margin-top: 2px; display: block;">
                  ${formattedDate}
                </span>
              </div>
            </div>

            <!-- Receipt Information Grid -->
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px; font-size: 12px;">
              <!-- Customer Details -->
              <div>
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #A1A1AA; display: block; margin-bottom: 4px;">
                  Customer Information
                </span>
                <div style="font-size: 13px; font-weight: 700; color: #09090B;">${order.customer_name}</div>
                <div style="color: #52525B; font-size: 12px; margin-top: 2px;">${order.customer_phone}</div>
                ${order.customer_email ? `<div style="color: #71717A; font-size: 11px; margin-top: 1px;">${order.customer_email}</div>` : ""}
              </div>

              <!-- Fulfillment Details -->
              <div>
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #A1A1AA; display: block; margin-bottom: 4px;">
                  Fulfillment Method
                </span>
                <div style="font-size: 13px; font-weight: 700; color: #09090B;">
                  ${isPickup ? "Warehouse Self-Pickup" : "Doorstep Delivery"}
                </div>
                ${
                  isPickup
                    ? `<div style="font-weight: 600; color: #18181B; font-size: 12px; margin-top: 2px;">HSG Global Warehouse (Eunos)</div>
                       <div style="color: #52525B; font-size: 12px; margin-top: 1px; line-height: 1.4;">9 Eunos Ave 8A, EUNOS INDUSTRIAL ESTATE, Singapore 409461</div>
                       <div style="font-size: 11px; color: #71717A; font-weight: 500; margin-top: 2px;">Collection Hours: Mon - Fri: 10:00 AM - 6:00 PM</div>`
                    : `<div style="color: #52525B; font-size: 12px; margin-top: 2px; line-height: 1.4;">
                         ${order.delivery_address || ""} ${order.unit_no ? `, ${order.unit_no}` : ""} (S${order.postal_code || ""})
                       </div>`
                }
                ${
                  cleanCustomerNote(order.delivery_notes)
                    ? `<div style="font-size: 11px; color: #71717A; font-style: italic; margin-top: 4px;">Note: "${cleanCustomerNote(order.delivery_notes)}"</div>`
                    : ""
                }
              </div>

              <!-- Payment Method & Status -->
              <div style="grid-column: span 2; border-top: 1px solid #E2E8F0; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <div>
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #A1A1AA; display: block; margin-bottom: 2px;">
                    Payment Method
                  </span>
                  <span style="font-weight: 700; color: #27272A; font-size: 12px;">Singapore PayNow SGQR</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 11px; color: #71717A;">Payment Status:</span>
                  <span style="display: inline-block; font-weight: 700; padding: 3px 10px; border-radius: 9999px; font-size: 11px; ${
                    isVerified
                      ? "background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0;"
                      : "background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A;"
                  }">
                    ${isVerified ? "Verified / Paid" : "Pending Verification"}
                  </span>
                </div>
              </div>
            </div>

            <!-- Ordered Cartons Section -->
            <div style="margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 4px;">
                <h3 style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #09090B;">
                  Ordered Cartons (${order.total_cartons} CTN)
                </h3>
                <span style="font-size: 11px; color: #A1A1AA;">Itemized Specifications</span>
              </div>

              <div>
                ${itemsHtml}
              </div>
            </div>

            <!-- Financial Summary / Receipt Totals -->
            <div style="border-top: 2px dashed #E2E8F0; padding-top: 14px; margin-bottom: 20px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #52525B;">
                <span>Cartons Subtotal:</span>
                <span style="font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #09090B;">
                  SGD $${subtotal.toFixed(2)}
                </span>
              </div>

              ${
                bcrsAmount > 0
                  ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #52525B;">
                  <span>BCRS Applied:</span>
                  <span style="font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #09090B;">
                    +SGD $${bcrsAmount.toFixed(2)}
                  </span>
                </div>`
                  : ""
              }

              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #52525B;">
                <span>Delivery Fee (${isPickup ? "Warehouse Self-Pickup" : "Singapore Mainland"}):</span>
                <span style="font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #09090B;">
                  ${deliveryFee === 0 ? "SGD $0.00 (Free)" : `SGD $${deliveryFee.toFixed(2)}`}
                </span>
              </div>

              ${
                discountAmount > 0
                  ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #047857; font-weight: 600;">
                  <span>Discount Applied (${order.applied_discount_rule || "Promo"}):</span>
                  <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                    -SGD $${discountAmount.toFixed(2)}
                  </span>
                </div>`
                  : ""
              }

              <div style="display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid #E2E8F0; padding-top: 10px; margin-top: 10px;">
                <span style="font-size: 13px; font-weight: 900; text-transform: uppercase; color: #09090B;">
                  Total Payable:
                </span>
                <span style="font-size: 22px; font-weight: 900; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #09090B;">
                  SGD $${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <!-- Receipt Footer Print Notice -->
            <div style="border-top: 1px solid #F1F5F9; padding-top: 16px; text-align: center; font-size: 11px; color: #A1A1AA;">
              Thank you for purchasing with HSG Global Pte. Ltd. This receipt is computer-generated.
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
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
        ord.in_track_order ||
        ord.fulfillment_status === "in_progress" ||
        ord.fulfillment_status === "packing" ||
        ord.fulfillment_status === "out_for_delivery"
      ) {
        return "in_progress";
      }
      if (ord.payment_status === "verified" || ord.fulfillment_status === "verified") {
        return "verified";
      }
      return "pending";
    },
    []
  );

  // Date filtered orders (default: last 2 weeks)
  const dateFilteredOrders = React.useMemo(() => {
    const startEpoch = startDate ? new Date(startDate + "T00:00:00").getTime() : null;
    const endEpoch = endDate ? new Date(endDate + "T23:59:59.999").getTime() : null;

    return orders.filter((ord) => {
      const ordTime = Number(ord.created_at) || (ord.created_at ? new Date(ord.created_at).getTime() : 0);
      if (ordTime > 0) {
        if (startEpoch && ordTime < startEpoch) return false;
        if (endEpoch && ordTime > endEpoch) return false;
      }
      return true;
    });
  }, [orders, startDate, endDate]);

  // Counts for tabs (based on date-filtered orders)
  const counts = React.useMemo(() => {
    return {
      pending: dateFilteredOrders.filter((o) => {
        const s = getOrderStatus(o);
        return s === "pending" || s === "verified" || s === "in_progress";
      }).length,
      complete: dateFilteredOrders.filter((o) => getOrderStatus(o) === "complete").length,
      void: dateFilteredOrders.filter((o) => getOrderStatus(o) === "cancelled").length
    };
  }, [dateFilteredOrders, getOrderStatus]);

  // Filter orders by search & status
  const filteredOrders = React.useMemo(() => {
    return dateFilteredOrders.filter((ord) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesSearch =
          ord.order_ref.toLowerCase().includes(q) ||
          ord.customer_name.toLowerCase().includes(q) ||
          ord.customer_phone.toLowerCase().includes(q) ||
          ord.postal_code.includes(q);

        if (!matchesSearch) return false;
      }

      const orderStatus = getOrderStatus(ord);
      if (statusFilter === "pending") {
        return orderStatus === "pending" || orderStatus === "verified" || orderStatus === "in_progress";
      }
      if (statusFilter === "complete") {
        return orderStatus === "complete";
      }
      if (statusFilter === "void") {
        return orderStatus === "cancelled";
      }

      return true;
    });
  }, [dateFilteredOrders, searchQuery, statusFilter, getOrderStatus]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* 1. Sub-Navigation Tabs dispatched to TopBar */}
      <NavigationTabs
        tabs={ONLINE_ORDER_TABS}
        activeTabId={statusFilter}
        onTabSelect={(id) => setStatusFilter(id as "pending" | "complete" | "void")}
      />

      {/* 2. TOP HEADER BAR: TITLE, DATE FILTER & SEARCH */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">Online Order</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage incoming public shop orders, verify PayNow SGQR transfers, and coordinate warehouse packing.
          </p>
        </div>

        {/* Filter & Search Controls */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Date Start & End Inputs (Default: Last 2 Weeks) */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-600">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0]"
              title="Start Date"
            />
            <span className="text-zinc-400 font-medium text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 px-2 bg-white border border-slate-300 rounded-lg text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0]"
              title="End Date"
            />
          </div>

          {/* Search Box */}
          <div className="relative w-52 sm:w-60">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search Ref, Name, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
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
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400 text-center p-6">
            <Package size={32} className="text-slate-300 stroke-[1.5]" />
            <span className="text-xs text-zinc-400 font-medium">No record found</span>
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
                <th className="px-4 py-2.5 text-right font-semibold text-zinc-600 text-xs">Action</th>
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
                      <div className="inline-flex items-center justify-center gap-1.5 relative group">
                        <span className="font-semibold text-zinc-900">{ord.total_cartons} CTN</span>
                        <div
                          className="w-5 h-5 rounded bg-slate-100 group-hover:bg-[#D3E3FD] text-zinc-500 group-hover:text-[#0B57D0] flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
                          title="Hover to view items ordered"
                        >
                          <Package size={12} />
                        </div>

                        {/* Hover Popover with Seamless Bridge & Google Workspace Theme */}
                        <div
                          className={`absolute ${
                            filteredOrders.indexOf(ord) < 2 ? "top-full pt-1.5" : "bottom-full pb-1.5"
                          } left-1/2 -translate-x-1/2 hidden group-hover:block z-40 w-80 pointer-events-auto animate-in fade-in duration-150`}
                        >
                          <div className="relative bg-white text-zinc-800 rounded-xl shadow-xl border border-slate-200 p-3 text-left text-xs">
                            {/* Decorative Arrow */}
                            <div
                              className={`absolute ${
                                filteredOrders.indexOf(ord) < 2
                                  ? "-top-1 border-t border-l border-slate-200 bg-white"
                                  : "-bottom-1 border-b border-r border-slate-200 bg-white"
                              } left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45`}
                            />

                            {/* Header */}
                            <div className="font-semibold text-zinc-900 border-b border-slate-100 pb-2 mb-2 flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-zinc-800">
                                <Package size={13} className="text-[#0B57D0]" /> Items Ordered
                              </span>
                              <span className="text-zinc-600 font-mono text-[11px] font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {ord.total_cartons} CTN
                              </span>
                            </div>

                            {/* Unwrapped Clean Items List */}
                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
                              {ord.items && ord.items.length > 0 ? (
                                ord.items.map((it, iIdx) => (
                                  <div
                                    key={iIdx}
                                    className="bg-slate-50/70 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                                  >
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                      <span
                                        className="truncate whitespace-nowrap text-zinc-800 font-medium"
                                        title={it.name}
                                      >
                                        {iIdx + 1}. {it.name}
                                      </span>
                                      <span className="font-mono text-zinc-700 font-semibold shrink-0 text-[11px]">
                                        {it.carton_qty} ctn
                                      </span>
                                    </div>
                                    {it.sku && (
                                      <div className="text-[10px] font-mono text-zinc-400 pl-3 mt-0.5 truncate whitespace-nowrap">
                                        SKU: {it.sku}
                                      </div>
                                    )}
                                    {it.loose_bottles && it.loose_bottles.length > 0 && (
                                      <div className="pt-1.5 mt-1.5 border-t border-slate-200/60 text-[11px] text-zinc-500 space-y-0.5 pl-2">
                                        <span className="text-[9px] uppercase font-semibold text-zinc-400 block tracking-wider">
                                          Mix Selections:
                                        </span>
                                        {it.loose_bottles.map((lb, bIdx) => (
                                          <div
                                            key={bIdx}
                                            className="flex items-center justify-between text-zinc-600 pr-1 text-[11px]"
                                          >
                                            <span className="truncate whitespace-nowrap" title={lb.flavor}>
                                              • {lb.flavor}
                                            </span>
                                            <span className="font-mono text-zinc-800 font-medium shrink-0 ml-2">
                                              {lb.qty} pcs
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="text-zinc-400 italic text-[11px]">No line items found</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
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
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-[#0B57D0] border border-blue-200">
                            In-Progress
                          </span>
                          {ord.track_detail_status && (
                            <span className="text-[10px] font-semibold text-zinc-500 tracking-tight whitespace-nowrap">
                              {isPickup && ord.track_detail_status.toLowerCase() === "ready to deliver"
                                ? "Ready to Collect"
                                : ord.track_detail_status}
                            </span>
                          )}
                        </div>
                      )}
                      {status === "complete" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-zinc-800 border border-slate-200">
                          Complete
                        </span>
                      )}
                      {status === "cancelled" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          Void
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {status === "verified" && !ord.in_track_order && (
                          <button
                            onClick={() => handleSendOrder(ord)}
                            disabled={sendingOrderId === ord.id}
                            className="px-2.5 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
                            title="Send order directly to Track Order"
                          >
                            {sendingOrderId === ord.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Send size={12} />
                            )}
                            <span>Send Order</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-zinc-700 rounded-md text-xs font-medium transition-colors cursor-pointer shrink-0 shadow-2xs"
                        >
                          Review
                        </button>
                        <button
                          onClick={() => handlePrintSlip(ord)}
                          className="w-7 h-7 flex items-center justify-center border border-slate-200 hover:bg-slate-50 text-zinc-600 hover:text-zinc-950 rounded-md transition-colors cursor-pointer shrink-0 shadow-2xs"
                          title="Preview Receipt"
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
        <div
          onClick={() => {
            setSelectedOrder(null);
            setShowRejectInput(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs font-primary"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 border-l border-slate-200"
          >
            {/* 1. Drawer Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-950">Order #{selectedOrder.order_ref}</h3>
                  <span className="text-[11px] font-mono font-medium text-zinc-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
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
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 2. Status & Quick Actions Toolbar (Flat layout matching Direct Order) */}
            <div className="px-5 py-3 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-600">Status:</span>
                {getOrderStatus(selectedOrder) === "complete" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Complete
                  </span>
                )}
                {getOrderStatus(selectedOrder) === "in_progress" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-[#0B57D0] border border-blue-200">
                    In-Progress
                  </span>
                )}
                {getOrderStatus(selectedOrder) === "verified" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#D3E3FD]/60 text-[#041E49] border border-blue-200">
                    Verified
                  </span>
                )}
                {getOrderStatus(selectedOrder) === "pending" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-zinc-700 border border-slate-200">
                    Pending
                  </span>
                )}
                {getOrderStatus(selectedOrder) === "cancelled" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                    Void
                  </span>
                )}
                {getOrderStatus(selectedOrder) === "in_progress" && selectedOrder.track_detail_status && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0B57D0] bg-[#D3E3FD]/50 px-2 py-0.5 rounded border border-blue-200">
                    <Truck size={12} />
                    <span>
                      {selectedOrder.delivery_address?.toLowerCase().includes("self-pickup") &&
                      selectedOrder.track_detail_status.toLowerCase() === "ready to deliver"
                        ? "Ready to Collect"
                        : selectedOrder.track_detail_status}
                    </span>
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {getOrderStatus(selectedOrder) === "verified" && !selectedOrder.in_track_order && (
                  <button
                    onClick={() => handleSendOrder(selectedOrder)}
                    disabled={sendingOrderId === selectedOrder.id}
                    className="h-8 px-3 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Send order directly to Track Order"
                  >
                    {sendingOrderId === selectedOrder.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Send size={12} />
                    )}
                    <span>Send Order</span>
                  </button>
                )}

                {selectedOrder.payment_status !== "verified" && selectedOrder.payment_status !== "rejected" && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedOrder.payment_proof_url) {
                          showToast("Please upload payment receipt before verifying payment.", "warning");
                          fileInputRef.current?.click();
                          return;
                        }
                        handleVerifyPayment(selectedOrder.id);
                      }}
                      disabled={actionLoading}
                      className={`h-8 px-3 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs ${
                        selectedOrder.payment_proof_url
                          ? "bg-[#0B57D0] hover:bg-[#0842A0] text-white cursor-pointer"
                          : "bg-slate-100 text-zinc-400 border border-slate-200 cursor-not-allowed opacity-75"
                      }`}
                    >
                      {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Verify Payment
                    </button>
                    <button
                      onClick={() => setShowRejectInput(!showRejectInput)}
                      className="h-8 px-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-zinc-700 rounded-md font-medium text-xs transition-colors cursor-pointer shadow-2xs"
                    >
                      Reject
                    </button>
                  </div>
                )}

                <select
                  value={getOrderStatus(selectedOrder)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const targetFulfillment = val === "complete" ? "completed" : val;
                    handleUpdateFulfillment(selectedOrder.id, targetFulfillment);
                  }}
                  className="h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-zinc-700 cursor-pointer shadow-2xs outline-none focus:border-[#0B57D0]"
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="in_progress">In-Progress</option>
                  <option value="complete">Complete</option>
                  <option value="cancelled">Void</option>
                </select>
              </div>
            </div>

            {/* Reject Form Dropdown */}
            {showRejectInput && (
              <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Reason (e.g. Funds not received)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-md text-xs outline-none focus:border-rose-500"
                />
                <button
                  onClick={() => handleRejectPayment(selectedOrder.id)}
                  className="h-7 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-medium text-xs cursor-pointer shadow-2xs"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => setShowRejectInput(false)}
                  className="h-7 px-2.5 bg-white border border-slate-200 text-zinc-600 rounded-md text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* 3. Main Drawer Body (Flat structure with divide-y divide-slate-100) */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
              {/* Section 1: Customer & Delivery Details */}
              <div className="p-5">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                  Customer & Delivery Information
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Customer Name</span>
                    <span className="font-semibold text-zinc-900 text-xs">{selectedOrder.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Phone / WhatsApp</span>
                    <a
                      href={`https://wa.me/${selectedOrder.customer_phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#0B57D0] hover:underline flex items-center gap-1 text-xs"
                    >
                      {selectedOrder.customer_phone} <ExternalLink size={11} />
                    </a>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] text-zinc-500 block">Fulfillment Method</span>
                    <span className="font-medium text-zinc-900 text-xs">
                      {selectedOrder.delivery_address?.toLowerCase().includes("self-pickup")
                        ? "Warehouse Self-Pickup (9 Eunos Ave 8A, Eunos Industrial Estate, Singapore 409461)"
                        : `${selectedOrder.delivery_address || ""}${selectedOrder.unit_no ? ` #${selectedOrder.unit_no}` : ""} (S${selectedOrder.postal_code || ""})`}
                    </span>
                  </div>
                  {cleanCustomerNote(selectedOrder.delivery_notes) && (
                    <div className="col-span-2 text-zinc-600 bg-slate-50 p-2.5 rounded-md border border-slate-200 text-[11px]">
                      <span className="font-semibold text-zinc-700">Note: </span>
                      {cleanCustomerNote(selectedOrder.delivery_notes)}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Items Ordered Table (Direct Order style) */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Items Ordered ({selectedOrder.total_cartons} CTN)
                  </h4>
                </div>
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-zinc-500 font-semibold text-[11px]">
                      <th className="pb-2 text-left">Item / SKU</th>
                      <th className="pb-2 text-center w-20">Cartons</th>
                      <th className="pb-2 text-right w-24">Price</th>
                      <th className="pb-2 text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items.map((item, idx) => {
                      const isMix =
                        item.carton_type === "custom_mix" ||
                        Boolean(item.loose_bottles && item.loose_bottles.length > 0);
                      const lineTotal = Number(item.carton_price || 0) * Number(item.carton_qty || 1);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 pr-2">
                            <div className="font-medium text-zinc-900 text-xs">{item.name}</div>
                            {item.sku && (
                              <div className="text-[10px] font-mono text-zinc-400 mt-0.5">SKU: {item.sku}</div>
                            )}
                            {isMix && item.loose_bottles && (
                              <div className="mt-1 text-[11px] text-zinc-500 pl-2 border-l border-slate-200 space-y-0.5">
                                {item.loose_bottles.map((b, bIdx) => (
                                  <div key={bIdx} className="flex items-center justify-between">
                                    <span>• {b.flavor || b.sku}</span>
                                    <span className="font-mono text-zinc-700 font-medium">{b.qty} pcs</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 text-center font-mono font-medium text-zinc-700 whitespace-nowrap">
                            {item.carton_qty} ctn
                          </td>
                          <td className="py-2.5 text-right font-mono text-zinc-600 whitespace-nowrap">
                            ${Number(item.carton_price || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-zinc-900 whitespace-nowrap">
                            ${lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pricing Summary */}
                {(() => {
                  const subtotal = Number(selectedOrder.subtotal || 0);
                  const deliveryFee = Number(selectedOrder.delivery_fee || 0);
                  const discountAmount = Number(selectedOrder.discount_amount || 0);
                  const totalAmount = Number(selectedOrder.total_amount || 0);
                  const expectedTotalBeforeBcrs = subtotal + deliveryFee - discountAmount;
                  const bcrsAmount = Math.max(0, Math.round((totalAmount - expectedTotalBeforeBcrs) * 100) / 100);

                  return (
                    <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col gap-1 text-xs">
                      <div className="flex justify-between text-zinc-600">
                        <span>Subtotal:</span>
                        <span className="font-mono">${subtotal.toFixed(2)}</span>
                      </div>
                      {deliveryFee > 0 && (
                        <div className="flex justify-between text-zinc-600">
                          <span>Delivery Fee:</span>
                          <span className="font-mono">+${deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                      {bcrsAmount > 0 && (
                        <div className="flex justify-between text-zinc-600">
                          <span>BCRS Applied:</span>
                          <span className="font-mono">+${bcrsAmount.toFixed(2)}</span>
                        </div>
                      )}
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-medium">
                          <span>Discount ({selectedOrder.applied_discount_rule || "Promo"}):</span>
                          <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 font-bold text-zinc-950 text-sm">
                        <span>Total Payable:</span>
                        <span className="font-mono text-base text-[#0B57D0]">${totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Section 3: Customer Payment Receipt */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Payment Receipt Proof
                  </h4>
                  {selectedOrder.payment_proof_url && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingReceipt}
                      className="text-xs text-[#0B57D0] hover:underline font-semibold cursor-pointer"
                    >
                      {uploadingReceipt ? "Uploading..." : "Replace Receipt"}
                    </button>
                  )}
                </div>

                {selectedOrder.payment_proof_url ? (
                  <div className="space-y-2">
                    <div className="relative group bg-slate-50 rounded-md overflow-hidden border border-slate-200 flex items-center justify-center max-h-44">
                      {selectedOrder.payment_proof_url.toLowerCase().endsWith(".pdf") ? (
                        <div className="p-4 flex items-center justify-between w-full">
                          <span className="text-xs font-medium text-zinc-800">PDF Document Attached</span>
                          <a
                            href={selectedOrder.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-zinc-800 rounded-md flex items-center gap-1 shadow-2xs"
                          >
                            Open PDF <ExternalLink size={11} />
                          </a>
                        </div>
                      ) : (
                        <>
                          <img
                            src={selectedOrder.payment_proof_url}
                            alt="Payment Receipt"
                            onClick={() => setPreviewReceiptUrl(selectedOrder.payment_proof_url || null)}
                            className="max-h-44 w-full object-contain cursor-zoom-in"
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewReceiptUrl(selectedOrder.payment_proof_url || null)}
                            className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/75 hover:bg-black text-white text-[11px] font-medium rounded-md backdrop-blur-xs flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink size={11} /> Full View
                          </button>
                        </>
                      )}
                    </div>
                    {selectedOrder.payment_verified_at && (
                      <p className="text-[11px] text-zinc-500">
                        Verified by{" "}
                        <strong className="text-zinc-800">
                          {formatVerifierName(selectedOrder.payment_verified_by, profile)}
                        </strong>{" "}
                        on {formatDateTime(selectedOrder.payment_verified_at)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-slate-300 hover:border-[#0B57D0] rounded-md p-3 text-center cursor-pointer transition-colors bg-slate-50/50"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadReceipt(f);
                      }}
                    />
                    {uploadingReceipt ? (
                      <div className="flex items-center justify-center gap-2 text-zinc-500 py-1">
                        <Loader2 size={14} className="animate-spin text-[#0B57D0]" />
                        <span className="text-xs">Uploading receipt...</span>
                      </div>
                    ) : (
                      <div className="py-1 flex flex-col items-center">
                        <Upload size={16} className="text-zinc-400 mb-1" />
                        <span className="text-xs font-medium text-zinc-700">Attach Payment Receipt</span>
                        <span className="text-[10px] text-zinc-400 mt-0.5">Click to upload screenshot image or PDF</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedOrder.payment_proof_url && (
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadReceipt(f);
                    }}
                  />
                )}
              </div>
            </div>

            {/* 4. Drawer Footer (Direct Order style) */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <a
                href={`https://wa.me/${selectedOrder.customer_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Hi ${selectedOrder.customer_name}, regarding your order #${selectedOrder.order_ref} on HSG Global Store...`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Phone size={13} />
                <span>WhatsApp</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintSlip(selectedOrder)}
                  className="h-8 px-3 border border-slate-200 bg-white hover:bg-slate-100 text-zinc-700 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Printer size={13} />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="h-8 px-3.5 border border-slate-200 bg-white hover:bg-slate-100 text-zinc-700 font-medium text-xs rounded-md transition-colors cursor-pointer shadow-2xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Image / Lightbox Modal */}
      {previewReceiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewReceiptUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-zinc-900 text-white flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-2">
                <FileText size={14} className="text-[#0B57D0]" />
                Customer WhatsApp Payment Receipt
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewReceiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-[11px] bg-white/10 hover:bg-white/20 text-white rounded-md font-medium flex items-center gap-1 transition-colors"
                >
                  <ExternalLink size={12} /> Open in New Tab
                </a>
                <button
                  onClick={() => setPreviewReceiptUrl(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-md transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="p-4 bg-zinc-950 flex items-center justify-center overflow-auto max-h-[calc(90vh-56px)]">
              <img
                src={previewReceiptUrl}
                alt="Payment Receipt Full"
                className="max-h-[80vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
