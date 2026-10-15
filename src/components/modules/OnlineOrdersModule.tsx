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
  Building2
} from "lucide-react";
import { showToast } from "@/lib/toast";

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

export function OnlineOrdersModule({ profile }: { profile?: any }) {
  const [orders, setOrders] = React.useState<ShopOrder[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedOrder, setSelectedOrder] = React.useState<ShopOrder | null>(null);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [rejectReason, setRejectReason] = React.useState<string>("");
  const [showRejectInput, setShowRejectInput] = React.useState<boolean>(false);
  const [uploadingReceipt, setUploadingReceipt] = React.useState<boolean>(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = React.useState<string | null>(null);
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
      if (statusFilter === "rejected") return orderStatus === "cancelled";

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
      complete: orders.filter((o) => getOrderStatus(o) === "complete").length,
      rejected: orders.filter((o) => getOrderStatus(o) === "cancelled").length
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
          <button
            onClick={() => setStatusFilter("rejected")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              statusFilter === "rejected" ? "bg-rose-100 text-rose-800 font-semibold" : "text-zinc-600 hover:bg-slate-200/60"
            }`}
          >
            Rejected ({counts.rejected})
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
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          Rejected
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

                {/* Payment Receipt Proof Section (Always visible whether pending or verified, or OCR) */}
                <div className="mb-3 p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-zinc-800 flex items-center gap-1.5">
                      <FileText size={13} className="text-[#0B57D0]" />
                      Customer Payment Receipt
                    </span>
                    {selectedOrder.payment_proof_url && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingReceipt}
                        className="text-[10px] text-[#0B57D0] hover:underline font-semibold cursor-pointer"
                      >
                        {uploadingReceipt ? "Uploading..." : "Replace Receipt"}
                      </button>
                    )}
                  </div>

                  {selectedOrder.payment_proof_url ? (
                    <div>
                      {selectedOrder.payment_proof_url.toLowerCase().endsWith(".pdf") ? (
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center justify-center">
                              PDF
                            </span>
                            <span className="text-xs text-zinc-800 font-medium">Payment Proof Document</span>
                          </div>
                          <a
                            href={selectedOrder.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-zinc-800 rounded-md flex items-center gap-1"
                          >
                            Open PDF <ExternalLink size={11} />
                          </a>
                        </div>
                      ) : (
                        <div className="relative group bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center max-h-48">
                          <img
                            src={selectedOrder.payment_proof_url}
                            alt="Customer Payment Receipt"
                            onClick={() => setPreviewReceiptUrl(selectedOrder.payment_proof_url || null)}
                            className="max-h-48 w-full object-contain cursor-zoom-in group-hover:opacity-95 transition-opacity"
                          />
                          <button
                            type="button"
                            onClick={() => setPreviewReceiptUrl(selectedOrder.payment_proof_url || null)}
                            className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/75 hover:bg-black text-white text-[10px] font-medium rounded backdrop-blur-xs flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink size={10} /> Full View
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-slate-300 hover:border-[#0B57D0] rounded-lg p-3 text-center cursor-pointer transition-colors bg-slate-50/50"
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
                          <span className="text-[11px]">Uploading receipt to secure storage...</span>
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

                  {/* Hidden file input when receipt already exists (for replace) */}
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

                {selectedOrder.payment_status === "verified" ? (
                  <div className="text-[11px] text-zinc-600 bg-white p-2.5 rounded-lg border border-slate-200">
                    Verified by <span className="font-medium text-zinc-900">{formatVerifierName(selectedOrder.payment_verified_by, profile)}</span> on{" "}
                    {formatDateTime(selectedOrder.payment_verified_at)}
                  </div>
                ) : selectedOrder.payment_status === "rejected" ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-[11px] text-rose-800 bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex items-start gap-2">
                      <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Order Rejected</span>
                        <span className="text-rose-700">
                          {selectedOrder.payment_verified_by?.includes("Rejected:")
                            ? selectedOrder.payment_verified_by
                            : selectedOrder.delivery_notes?.startsWith("[REJECTED:")
                            ? selectedOrder.delivery_notes.replace(/^\[REJECTED:\s*|\]$/g, "")
                            : "Payment rejected by admin"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const hasReceipt = Boolean(selectedOrder.payment_proof_url && selectedOrder.payment_proof_url.trim());
                        if (!hasReceipt) {
                          showToast("Please upload the customer payment receipt before verifying payment.", "warning");
                          fileInputRef.current?.click();
                          return;
                        }
                        handleVerifyPayment(selectedOrder.id);
                      }}
                      disabled={actionLoading}
                      className={`w-full h-8 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors ${
                        selectedOrder.payment_proof_url
                          ? "bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 cursor-pointer"
                          : "bg-slate-100 text-zinc-400 border border-slate-200 cursor-not-allowed opacity-75"
                      }`}
                      title={!selectedOrder.payment_proof_url ? "Please upload customer payment receipt first" : "Re-open & Verify Payment"}
                    >
                      {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Re-open & Verify Payment
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {!selectedOrder.payment_proof_url && (
                      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                        <AlertCircle size={13} className="shrink-0 text-amber-600" />
                        <span>Please attach the customer payment receipt above to enable verification.</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const hasReceipt = Boolean(selectedOrder.payment_proof_url && selectedOrder.payment_proof_url.trim());
                          if (!hasReceipt) {
                            showToast("Please upload the customer payment receipt before verifying payment.", "warning");
                            fileInputRef.current?.click();
                            return;
                          }
                          handleVerifyPayment(selectedOrder.id);
                        }}
                        disabled={actionLoading}
                        title={!selectedOrder.payment_proof_url ? "Please upload customer payment receipt first" : "Verify Payment"}
                        className={`flex-1 h-9 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          selectedOrder.payment_proof_url
                            ? "bg-[#0B57D0] hover:bg-[#0842A0] active:scale-98 text-white cursor-pointer shadow-xs"
                            : "bg-slate-100 text-zinc-400 border border-slate-200 cursor-not-allowed opacity-75"
                        }`}
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
                  <option value="cancelled">Rejected</option>
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
                    <div className="col-span-2 space-y-1">
                      <span className="text-zinc-500 text-[11px] block">Fulfillment Method</span>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#0B57D0] border border-blue-200">
                          Warehouse Self-Pickup
                        </span>
                      </div>
                      <div className="text-xs text-zinc-700 space-y-0.5 pt-1">
                        <div className="font-semibold text-zinc-900">HSG Global Warehouse (Eunos)</div>
                        <div className="text-zinc-600">9 Eunos Ave 8A, EUNOS INDUSTRIAL ESTATE, Singapore 409461</div>
                        <div className="text-[11px] text-zinc-500 font-medium">Collection Hours: Mon - Fri: 10:00 AM - 6:00 PM</div>
                      </div>
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
                  {cleanCustomerNote(selectedOrder.delivery_notes) && (
                    <div className="col-span-2 bg-slate-50 border border-slate-200 rounded p-2 text-zinc-700 text-[11px]">
                      <span className="font-medium text-zinc-900">Customer Note:</span> {cleanCustomerNote(selectedOrder.delivery_notes)}
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
                    title="Preview Official Receipt"
                  >
                    <Printer size={13} /> Preview Receipt
                  </button>
                </div>
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
