"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { showToast } from "@/lib/toast";
import { 
  RefreshCw, 
  Plus, 
  Minus, 
  DollarSign, 
  ExternalLink, 
  Download, 
  Search, 
  Printer, 
  Layers, 
  Receipt, 
  TrendingUp, 
  CheckCircle2, 
  X, 
  Tag, 
  Package, 
  Trash2, 
  AlertCircle,
  PlusCircle,
  Ban,
  Archive,
  RotateCcw
} from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";

interface ManagePOSModuleProps {
  profile?: any;
}

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface TierPricingRule {
  min_qty: number;
  bundle_price: number;
}

export interface BrandPromo {
  id: string;
  brand_id: string;
  brand_name: string;
  included_skus?: string[];
  min_qty: number;
  promo_type: "bundle_price" | "percent_off" | "fixed_off";
  promo_val: number;
  is_active: boolean;
  created_at: number;
}

interface POSProduct {
  sku: string;
  display_name: string;
  brand_id?: string;
  brand_name?: string;
  category?: string;
  image?: string;
  single_barcode?: string;
  carton_barcode?: string;
  status: string;
  selling_price: number;
  stock_allocated: number;
  tier_pricing?: TierPricingRule[];
  is_active_pos: boolean;
  is_in_pos?: boolean;
  updated_at?: number | null;
}

interface POSOrder {
  id: string;
  ref_code?: string;
  cashier_id: string;
  cashier_name: string;
  items: Array<{
    sku: string;
    name: string;
    price: number;
    qty: number;
    discount_type?: string;
    discount_val?: number;
    discount_amount?: number;
    is_foc?: boolean;
    subtotal: number;
    image?: string;
  }>;
  subtotal: number;
  discount_type: string;
  discount_val: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  cash_received: number;
  cash_change: number;
  is_foc: boolean;
  notes?: string;
  status: string;
  created_at: number;
}

interface POSVoidOrder extends POSOrder {
  original_order_id: string;
  void_reason: string;
  voided_by: string;
  voided_by_id?: string;
  approved_by?: string;
  approved_by_id?: string;
  voided_at: number;
  original_created_at: number;
}

const mainTabs = [
  { id: "catalog", label: "POS Catalog & Stock", desc: "Add products to POS, set selling prices, allocate and deduct retail stocks." },
  { id: "promos", label: "Brand Mix & Match Promos", desc: "Configure quantity bundle discounts across multiple SKUs within the same brand." },
  { id: "ledger", label: "Sales & Orders Ledger", desc: "View transaction records, revenue summaries, and export sales reports." },
  { id: "voided", label: "Voided Transactions", desc: "Audit trail of cancelled / voided sales transactions." }
];

export function ManagePOSModule({ profile }: ManagePOSModuleProps) {
  const [activeTab, setActiveTab] = React.useState<"catalog" | "promos" | "ledger" | "voided">("catalog");
  const [posProducts, setPosProducts] = React.useState<POSProduct[]>([]);
  const [masterProducts, setMasterProducts] = React.useState<POSProduct[]>([]);
  const [brandPromos, setBrandPromos] = React.useState<BrandPromo[]>([]);
  const [orders, setOrders] = React.useState<POSOrder[]>([]);
  const [voidOrders, setVoidOrders] = React.useState<POSVoidOrder[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Brand Promos Modal
  const [isPromoModalOpen, setIsPromoModalOpen] = React.useState(false);
  const [editingPromo, setEditingPromo] = React.useState<BrandPromo | null>(null);
  const [promoBrandId, setPromoBrandId] = React.useState("");
  const [promoBrandName, setPromoBrandName] = React.useState("");
  const [promoSelectedSkus, setPromoSelectedSkus] = React.useState<string[]>([]);
  const [promoSkuSearch, setPromoSkuSearch] = React.useState("");
  const [promoMinQty, setPromoMinQty] = React.useState("5");
  const [promoType, setPromoType] = React.useState<"bundle_price" | "percent_off" | "fixed_off">("bundle_price");
  const [promoVal, setPromoVal] = React.useState("3.00");
  const [promoActive, setPromoActive] = React.useState(true);
  const [promoSaving, setPromoSaving] = React.useState(false);

  // Filters for Catalog
  const [catalogSearch, setCatalogSearch] = React.useState("");
  const [catalogBrand, setCatalogBrand] = React.useState("all");

  // Filters for Ledger & Voided
  const [ledgerSearch, setLedgerSearch] = React.useState("");
  const [ledgerPayment, setLedgerPayment] = React.useState("all");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [voidSearch, setVoidSearch] = React.useState("");

  // Add Product to POS Modal
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [selectedMasterSku, setSelectedMasterSku] = React.useState("");
  const [addPrice, setAddPrice] = React.useState("0.00");
  const [addStock, setAddStock] = React.useState("10");
  const [addTiers, setAddTiers] = React.useState<TierPricingRule[]>([]);
  const [addReason, setAddReason] = React.useState("Initial POS stock allocation");
  const [addingSaving, setAddingSaving] = React.useState(false);
  const [masterSearch, setMasterSearch] = React.useState("");

  // Stock Adjustment Modal
  const [adjustingProduct, setAdjustingProduct] = React.useState<POSProduct | null>(null);
  const [adjustAction, setAdjustAction] = React.useState<"add" | "remove" | "set">("add");
  const [adjustQty, setAdjustQty] = React.useState<string>("1");
  const [adjustReason, setAdjustReason] = React.useState<string>("");
  const [adjustingSaving, setAdjustingSaving] = React.useState(false);

  // Price & Status Modal
  const [pricingProduct, setPricingProduct] = React.useState<POSProduct | null>(null);
  const [newPrice, setNewPrice] = React.useState<string>("0.00");
  const [newTiers, setNewTiers] = React.useState<TierPricingRule[]>([]);
  const [newActive, setNewActive] = React.useState<boolean>(true);
  const [pricingSaving, setPricingSaving] = React.useState(false);

  // Delete Confirmation Modal (Product)
  const [deletingProduct, setDeletingProduct] = React.useState<POSProduct | null>(null);
  const [deletingSaving, setDeletingSaving] = React.useState(false);

  // Delete Confirmation Modal (Transaction Order)
  const [deletingOrder, setDeletingOrder] = React.useState<POSOrder | null>(null);
  const [deleteOrderRestoreStock, setDeleteOrderRestoreStock] = React.useState(true);
  const [deletingOrderSaving, setDeletingOrderSaving] = React.useState(false);

  // Order Details Modal
  const [viewingOrder, setViewingOrder] = React.useState<POSOrder | POSVoidOrder | null>(null);

  // Load all data
  const loadAllData = React.useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch POS Products (only added to POS)
      const prodRes = await fetch(`${WORKER_URL}/api/pos/products`);
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setPosProducts(Array.isArray(prodData) ? prodData : []);
      }

      // 2. Fetch Master Products (all products for the "+ Add Product" selector)
      const masterRes = await fetch(`${WORKER_URL}/api/pos/products?master=true`);
      if (masterRes.ok) {
        const masterData = await masterRes.json();
        setMasterProducts(Array.isArray(masterData) ? masterData : []);
      }

      // 3. Fetch Brand Promos
      const promoRes = await fetch(`${WORKER_URL}/api/pos/brand-promos`);
      if (promoRes.ok) {
        const promoData = await promoRes.json();
        setBrandPromos(Array.isArray(promoData) ? promoData : []);
      }

      // 4. Fetch POS Orders
      const orderRes = await fetch(`${WORKER_URL}/api/pos/orders`);
      if (orderRes.ok) {
        const orderData = await orderRes.json();
        setOrders(Array.isArray(orderData) ? orderData : []);
      }

      // 5. Fetch Voided Orders
      const voidRes = await fetch(`${WORKER_URL}/api/pos/orders/voided`);
      if (voidRes.ok) {
        const voidData = await voidRes.json();
        setVoidOrders(Array.isArray(voidData) ? voidData : []);
      }
    } catch (err: any) {
      showToast("Failed to load POS data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Global refresh integration
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      await loadAllData();
      showToast("POS data refreshed successfully!", "success");
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [loadAllData]);

  // Brands list for dropdown
  const brandsList = React.useMemo(() => {
    const set = new Set<string>();
    posProducts.forEach(p => {
      if (p.brand_name) set.add(p.brand_name);
    });
    return Array.from(set).sort();
  }, [posProducts]);

  // Filtered POS Products
  const filteredProducts = React.useMemo(() => {
    return posProducts.filter(p => {
      const q = catalogSearch.toLowerCase().trim();
      const matchQuery = !q || p.sku.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q) || (p.single_barcode && p.single_barcode.includes(q));
      const matchBrand = catalogBrand === "all" || (p.brand_name && p.brand_name.toLowerCase() === catalogBrand.toLowerCase());
      return matchQuery && matchBrand;
    });
  }, [posProducts, catalogSearch, catalogBrand]);

  // Master products available to be added (excluding those already in POS)
  const availableMasterProducts = React.useMemo(() => {
    const existingSkus = new Set(posProducts.map(p => p.sku.toLowerCase()));
    return masterProducts.filter(p => {
      if (existingSkus.has(p.sku.toLowerCase())) return false;
      const q = masterSearch.toLowerCase().trim();
      return !q || p.sku.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q) || (p.single_barcode && p.single_barcode.includes(q));
    });
  }, [masterProducts, posProducts, masterSearch]);

  // Filtered Orders
  const filteredOrders = React.useMemo(() => {
    return orders.filter(o => {
      const q = ledgerSearch.toLowerCase().trim();
      const matchQuery = !q || o.id.toLowerCase().includes(q) || o.cashier_name.toLowerCase().includes(q);
      const matchPayment = ledgerPayment === "all" || o.payment_method.toLowerCase() === ledgerPayment.toLowerCase();

      let matchDate = true;
      if (startDate) {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        if (o.created_at < start) matchDate = false;
      }
      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        if (o.created_at > end) matchDate = false;
      }

      return matchQuery && matchPayment && matchDate;
    });
  }, [orders, ledgerSearch, ledgerPayment, startDate, endDate]);

  // Filtered Voided Orders
  const filteredVoidOrders = React.useMemo(() => {
    return voidOrders.filter(o => {
      const q = voidSearch.toLowerCase().trim();
      return !q || 
        o.id.toLowerCase().includes(q) || 
        (o.original_order_id && o.original_order_id.toLowerCase().includes(q)) || 
        o.cashier_name.toLowerCase().includes(q) ||
        (o.void_reason && o.void_reason.toLowerCase().includes(q)) ||
        (o.voided_by && o.voided_by.toLowerCase().includes(q));
    });
  }, [voidOrders, voidSearch]);

  // Ledger Summary Calculations
  const ledgerMetrics = React.useMemo(() => {
    let totalSales = 0;
    let totalDiscount = 0;
    let totalOrders = filteredOrders.length;
    let cashSales = 0;
    let paynowSales = 0;
    let cardSales = 0;
    let focOrders = 0;
    let totalItems = 0;

    filteredOrders.forEach(o => {
      totalSales += Number(o.total_amount || 0);
      totalDiscount += Number(o.discount_amount || 0);
      const pm = String(o.payment_method || "").toLowerCase();
      if (o.is_foc || pm === "foc") focOrders++;
      else if (pm === "cash") cashSales += Number(o.total_amount || 0);
      else if (pm === "qr" || pm === "paynow") paynowSales += Number(o.total_amount || 0);
      else if (pm === "transfer bank" || pm === "bank transfer" || pm === "card") cardSales += Number(o.total_amount || 0);

      if (Array.isArray(o.items)) {
        o.items.forEach(it => {
          totalItems += Number(it.qty || 1);
        });
      }
    });

    return { totalSales, totalDiscount, totalOrders, cashSales, paynowSales, cardSales, focOrders, totalItems };
  }, [filteredOrders]);

  // Handle Add Product to POS
  const handleAddProduct = async () => {
    if (!selectedMasterSku) {
      showToast("Please select a product from the list", "warning");
      return;
    }

    const priceNum = parseFloat(addPrice);
    const stockNum = parseInt(addStock, 10);

    if (isNaN(priceNum) || priceNum < 0) {
      showToast("Please enter a valid selling price", "warning");
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      showToast("Please enter a valid stock quantity", "warning");
      return;
    }

    setAddingSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/products/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: selectedMasterSku,
          selling_price: priceNum,
          stock_allocated: stockNum,
          tier_pricing: addTiers,
          reason: addReason.trim() || "Initial POS stock allocation",
          updated_by: profile?.name || "Admin"
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to add product");

      showToast(`Product ${selectedMasterSku} added to POS catalog!`, "success");
      setIsAddModalOpen(false);
      setSelectedMasterSku("");
      setAddPrice("0.00");
      setAddStock("10");
      setAddTiers([]);
      loadAllData();
    } catch (err: any) {
      showToast("Failed to add product: " + err.message, "error");
    } finally {
      setAddingSaving(false);
    }
  };

  // Handle Save Stock Adjustment
  const handleSaveStockAdjustment = async () => {
    if (!adjustingProduct) return;
    const qtyNum = parseInt(adjustQty, 10);
    if (isNaN(qtyNum) || (qtyNum <= 0 && adjustAction !== "set")) {
      showToast("Please enter a valid positive quantity", "warning");
      return;
    }

    setAdjustingSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/products/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: adjustingProduct.sku,
          action: adjustAction,
          qty: qtyNum,
          reason: adjustReason.trim() || (adjustAction === "add" ? "Stock replenishment" : "Stock removal"),
          updated_by: profile?.name || "Admin"
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Adjustment failed");

      showToast(`Stock for ${adjustingProduct.sku} updated to ${data.new_stock}!`, "success");
      setAdjustingProduct(null);
      loadAllData();
    } catch (err: any) {
      showToast("Failed to adjust stock: " + err.message, "error");
    } finally {
      setAdjustingSaving(false);
    }
  };

  // Handle Save Pricing
  const handleSavePricing = async () => {
    if (!pricingProduct) return;
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast("Please enter a valid selling price", "warning");
      return;
    }

    setPricingSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/products/price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: pricingProduct.sku,
          selling_price: priceNum,
          tier_pricing: newTiers,
          is_active: newActive,
          updated_by: profile?.name || "Admin"
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Update failed");

      showToast(`Price for ${pricingProduct.sku} updated to $${priceNum.toFixed(2)}!`, "success");
      setPricingProduct(null);
      loadAllData();
    } catch (err: any) {
      showToast("Failed to update pricing: " + err.message, "error");
    } finally {
      setPricingSaving(false);
    }
  };

  // Handle Save Brand Mix & Match Promo
  const handleSaveBrandPromo = async () => {
    if (!promoBrandName.trim()) {
      showToast("Please enter or select a brand", "warning");
      return;
    }

    const minQ = parseInt(promoMinQty, 10);
    const valNum = parseFloat(promoVal);

    if (isNaN(minQ) || minQ <= 1) {
      showToast("Minimum quantity must be 2 or more", "warning");
      return;
    }

    if (isNaN(valNum) || valNum <= 0) {
      showToast("Please enter a valid promotion value", "warning");
      return;
    }

    setPromoSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/brand-promos/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPromo?.id,
          brand_id: promoBrandId || promoBrandName.toLowerCase().replace(/\s+/g, "_"),
          brand_name: promoBrandName.trim(),
          included_skus: promoSelectedSkus,
          min_qty: minQ,
          promo_type: promoType,
          promo_val: valNum,
          is_active: promoActive
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save promo");

      showToast(`Promo for brand ${promoBrandName} saved!`, "success");
      setIsPromoModalOpen(false);
      setEditingPromo(null);
      loadAllData();
    } catch (err: any) {
      showToast("Failed to save brand promo: " + err.message, "error");
    } finally {
      setPromoSaving(false);
    }
  };

  // Handle Delete Brand Promo
  const handleDeleteBrandPromo = async (id: string, name: string) => {
    if (!confirm(`Delete promotion rule for "${name}"?`)) return;
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/brand-promos/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error(await res.text());
      showToast(`Promo rule removed`, "success");
      loadAllData();
    } catch (err: any) {
      showToast("Failed to delete promo: " + err.message, "error");
    }
  };

  // Handle Remove Product from POS
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setDeletingSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/products/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: deletingProduct.sku,
          updated_by: profile?.name || "Admin"
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Removal failed");

      showToast(`Product ${deletingProduct.sku} removed from POS catalog.`, "success");
      setDeletingProduct(null);
      loadAllData();
    } catch (err: any) {
      showToast("Failed to remove product: " + err.message, "error");
    } finally {
      setDeletingSaving(false);
    }
  };

  // Handle Admin Permanent Delete Order
  const handleConfirmDeleteOrder = async () => {
    if (!deletingOrder) return;
    setDeletingOrderSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/orders/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deletingOrder.id,
          restore_stock: deleteOrderRestoreStock,
          deleted_by: profile?.name || "Admin"
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Deletion failed");

      showToast(`Order ${deletingOrder.id} deleted successfully.${deleteOrderRestoreStock ? " (Stock restored)" : ""}`, "success");
      setDeletingOrder(null);
      loadAllData();
    } catch (err: any) {
      showToast("Failed to delete order: " + err.message, "error");
    } finally {
      setDeletingOrderSaving(false);
    }
  };

  // Export Sales Ledger to Excel
  const handleExportExcel = () => {
    if (filteredOrders.length === 0) {
      showToast("No orders available to export", "warning");
      return;
    }

    const rows: any[] = [];
    filteredOrders.forEach(o => {
      const dateStr = new Date(Number(o.created_at)).toLocaleString("en-SG");
      const itemsList = Array.isArray(o.items)
        ? o.items.map(it => `${it.name} (${it.sku}) x${it.qty} @ $${Number(it.price).toFixed(2)}${it.is_foc ? " [FOC]" : ""}`).join("; ")
        : "";

      rows.push({
        "Order ID": o.id,
        "Ref Code (WhatsApp)": o.ref_code || "-",
        "Date & Time": dateStr,
        "Cashier": o.cashier_name,
        "Items Sold": itemsList,
        "Subtotal ($)": Number(o.subtotal).toFixed(2),
        "Discount ($)": Number(o.discount_amount || 0).toFixed(2),
        "Total Paid ($)": Number(o.total_amount).toFixed(2),
        "Payment Mode": o.payment_method,
        "Cash Received ($)": Number(o.cash_received || 0).toFixed(2),
        "Change ($)": Number(o.cash_change || 0).toFixed(2),
        "Is FOC": o.is_foc ? "YES" : "NO",
        "Notes": o.notes || ""
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "POS Sales Ledger");
    const dateStamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `POS_Sales_Ledger_${dateStamp}.xlsx`);
    showToast("Sales ledger exported successfully!", "success");
  };

  // Print Receipt Dialogue
  const handlePrintReceipt = (order: POSOrder) => {
    const dateStr = new Date(Number(order.created_at)).toLocaleString("en-SG");
    const itemsHtml = Array.isArray(order.items) ? order.items.map(it => `
      <tr style="border-bottom: 1px dashed #ddd;">
        <td style="padding: 6px 0; font-size: 11px;">
          <strong>${it.name}</strong><br>
          <span style="color: #666; font-size: 10px;">${it.sku}</span>
        </td>
        <td style="padding: 6px 0; font-size: 11px; text-align: center;">${it.qty}</td>
        <td style="padding: 6px 0; font-size: 11px; text-align: right;">
          ${it.is_foc ? '<span style="color: #0B57D0; font-weight: bold;">FOC</span>' : `$${(Number(it.price) * Number(it.qty)).toFixed(2)}`}
        </td>
      </tr>
    `).join("") : "";

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${order.id}</title>
        <style>
          @page { size: 80mm auto; margin: 5mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 10px; width: 70mm; }
          .center { text-align: center; }
          .divider { border-top: 1px dashed #888; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
          .bold { font-weight: bold; }
          .big { font-size: 14px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 style="margin: 0; font-size: 16px;">HSG GLOBAL</h2>
          <p style="margin: 2px 0 6px 0; font-size: 10px; color: #555;">Retail POS Checkout</p>
          <p style="margin: 0; font-size: 10px; color: #777;">Order: ${order.id}</p>
          <p style="margin: 0; font-size: 10px; color: #777;">Date: ${dateStr}</p>
          <p style="margin: 0; font-size: 10px; color: #777;">Cashier: ${order.cashier_name}</p>
        </div>
        <div class="divider"></div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #111; font-size: 10px; text-transform: uppercase;">
              <th style="text-align: left; padding-bottom: 4px;">Item</th>
              <th style="text-align: center; padding-bottom: 4px;">Qty</th>
              <th style="text-align: right; padding-bottom: 4px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="row">
          <span>Subtotal:</span>
          <span>$${Number(order.subtotal).toFixed(2)}</span>
        </div>
        ${Number(order.discount_amount) > 0 ? `
          <div class="row" style="color: #0B57D0;">
            <span>Discount / FOC:</span>
            <span>-$${Number(order.discount_amount).toFixed(2)}</span>
          </div>
        ` : ""}
        <div class="row big" style="margin-top: 6px; border-top: 1px solid #111; padding-top: 4px;">
          <span>TOTAL:</span>
          <span>$${Number(order.total_amount).toFixed(2)}</span>
        </div>
        <div class="divider"></div>
        <div class="row">
          <span>Payment Mode:</span>
          <span class="bold">${order.payment_method}</span>
        </div>
        ${order.payment_method === "Cash" ? `
          <div class="row">
            <span>Cash Tendered:</span>
            <span>$${Number(order.cash_received).toFixed(2)}</span>
          </div>
          <div class="row">
            <span>Change Due:</span>
            <span>$${Number(order.cash_change).toFixed(2)}</span>
          </div>
        ` : ""}
        <div class="center" style="margin-top: 15px; font-size: 10px; color: #777;">
          <p style="margin: 0;">Thank you for shopping with us!</p>
          <p style="margin: 2px 0 0 0;">Please keep this receipt for verification.</p>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([printHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* 1. Header Navigation Tabs */}
      <div className="content-header">
        <NavigationTabs
          tabs={mainTabs}
          activeTabId={activeTab}
          onTabSelect={(id) => setActiveTab(id as any)}
          titleSuffix="Management"
        />
      </div>

      {/* 2. Top Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            {activeTab === "catalog" 
              ? "POS Catalog & Allocated Stock" 
              : activeTab === "promos"
                ? "Brand Mix & Match Promotions"
                : "POS Sales Ledger & Financial Summary"}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeTab === "catalog" 
              ? "Explicitly add products to POS, set selling prices, and allocate/deduct retail stock."
              : activeTab === "promos"
                ? "Configure automatic bundle pricing (e.g. Any 5 Hausboom items for $3.00) across all SKUs under the same brand."
                : "Audit cashier checkout transactions, payment records (Cash, QR, Bank Transfer), and export reports."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "catalog" && (
            <button
              onClick={() => {
                setSelectedMasterSku("");
                setAddPrice("0.00");
                setAddStock("10");
                setAddReason("Initial POS stock allocation");
                setMasterSearch("");
                setIsAddModalOpen(true);
              }}
              className="px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Product to POS
            </button>
          )}

          {activeTab === "promos" && (
            <button
              onClick={() => {
                setEditingPromo(null);
                const firstBrand = brandsList[0] || "";
                setPromoBrandId("");
                setPromoBrandName(firstBrand);
                const brandSkus = posProducts
                  .filter(p => p.brand_name && p.brand_name.toLowerCase() === firstBrand.toLowerCase())
                  .map(p => p.sku);
                setPromoSelectedSkus(brandSkus);
                setPromoSkuSearch("");
                setPromoMinQty("5");
                setPromoType("bundle_price");
                setPromoVal("3.00");
                setPromoActive(true);
                setIsPromoModalOpen(true);
              }}
              className="px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Brand Promo
            </button>
          )}

          {activeTab === "ledger" && (
            <button
              onClick={handleExportExcel}
              disabled={filteredOrders.length === 0}
              className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Export Excel
            </button>
          )}

          <a
            href="/pos"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#0B57D0]" />
            Open POS Terminal
          </a>
        </div>
      </div>

      {/* 3. Tab Specific Render */}
      {activeTab === "promos" ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Filter Toolbar */}
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Tag className="w-3.5 h-3.5 text-[#0B57D0]" />
              <span>Active Brand Promos: <strong className="text-zinc-900 font-bold">{brandPromos.length}</strong></span>
            </div>
          </div>

          {/* Promos Table */}
          <div className="flex-1 overflow-auto min-h-0">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-[#F0F4F9] sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-48">Brand Name</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-32">Min Quantity</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-40">Promotion Type</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px]">Promo Rule & Value</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-28">Status</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {brandPromos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-16 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0B57D0]">
                          <Tag className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-zinc-800">No Brand Mix & Match Promotions configured yet</p>
                          <p className="text-xs text-zinc-400 mt-0.5">Create promo rules like "Any 5 Hausboom items for $3.00" across SKUs.</p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingPromo(null);
                            setPromoBrandId("");
                            setPromoBrandName(brandsList[0] || "");
                            setPromoMinQty("5");
                            setPromoType("bundle_price");
                            setPromoVal("3.00");
                            setPromoActive(true);
                            setIsPromoModalOpen(true);
                          }}
                          className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create First Brand Promo</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  brandPromos.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-bold text-zinc-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#0B57D0]"></span>
                        {p.brand_name}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0B57D0] border border-blue-200 font-bold font-mono">
                          Any {p.min_qty} pcs
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="font-semibold text-zinc-700 uppercase text-[10px]">
                          {p.promo_type === "bundle_price" ? "Bundle Price ($)" : p.promo_type === "percent_off" ? "Percentage Off (%)" : "Fixed Discount ($)"}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                          {p.promo_type === "bundle_price" && `Bundle ${p.min_qty} items for $${Number(p.promo_val).toFixed(2)}`}
                          {p.promo_type === "percent_off" && `${p.promo_val}% off when buying ${p.min_qty}+ items`}
                          {p.promo_type === "fixed_off" && `-$${Number(p.promo_val).toFixed(2)} off when buying ${p.min_qty}+ items`}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          p.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-zinc-500 border-slate-200"
                        }`}>
                          {p.is_active ? "ACTIVE" : "PAUSED"}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPromo(p);
                              setPromoBrandId(p.brand_id);
                              setPromoBrandName(p.brand_name);
                              const defaultBrandSkus = posProducts
                                .filter(prod => prod.brand_name && prod.brand_name.toLowerCase() === p.brand_name.toLowerCase())
                                .map(prod => prod.sku);
                              setPromoSelectedSkus(Array.isArray(p.included_skus) && p.included_skus.length > 0 ? p.included_skus : defaultBrandSkus);
                              setPromoSkuSearch("");
                              setPromoMinQty(String(p.min_qty));
                              setPromoType(p.promo_type);
                              setPromoVal(String(p.promo_val));
                              setPromoActive(p.is_active);
                              setIsPromoModalOpen(true);
                            }}
                            className="px-2 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-[11px] rounded-md transition-all shadow-xs cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBrandPromo(p.id, p.brand_name)}
                            className="p-1 border border-red-200 bg-red-50/50 hover:bg-red-100 text-red-600 rounded-md transition-all shadow-xs cursor-pointer"
                            title="Delete Promotion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "catalog" ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Filter Toolbar */}
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Package className="w-3.5 h-3.5 text-[#0B57D0]" />
              <span>Products in POS: <strong className="text-zinc-900 font-bold">{filteredProducts.length}</strong></span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search SKU, Name, Barcode..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              {brandsList.length > 0 && (
                <select
                  value={catalogBrand}
                  onChange={(e) => setCatalogBrand(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                >
                  <option value="all">All Brands</option>
                  {brandsList.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Products Table */}
          <div className="flex-1 overflow-auto min-h-0">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-[#F0F4F9] sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-14">Image</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-28">SKU Code</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px]">Product Description</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-36">Brand / Category</th>
                  <th className="px-3.5 py-2.5 text-right font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-32">POS Selling Price</th>
                  <th className="px-3.5 py-2.5 text-right font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-36">Stock Allocated</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-24">Status</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {loading && posProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-zinc-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#0B57D0]" />
                        <span>Loading POS catalog products...</span>
                      </div>
                    </td>
                  </tr>
                ) : posProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-16 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-zinc-400">
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-zinc-800">No products added to POS yet</p>
                          <p className="text-xs text-zinc-400 mt-0.5">Click the button below to select products from inventory and allocate stock.</p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedMasterSku("");
                            setAddPrice("0.00");
                            setAddStock("10");
                            setAddReason("Initial POS stock allocation");
                            setMasterSearch("");
                            setIsAddModalOpen(true);
                          }}
                          className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Add First Product to POS</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.sku} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {p.image ? (
                            <img src={p.image} alt={p.sku} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-zinc-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap font-mono font-bold text-zinc-900">{p.sku}</td>
                      <td className="px-3.5 py-2">
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-900">{p.display_name}</span>
                          {p.single_barcode && (
                            <span className="text-[10px] text-zinc-400 font-mono">Barcode: {p.single_barcode}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-zinc-800 font-medium">{p.brand_name || "HSG"}</span>
                          <span className="text-[10px] text-zinc-400">{p.category}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap text-right">
                        <span className={`font-mono font-bold ${p.selling_price > 0 ? "text-emerald-700" : "text-amber-600"}`}>
                          ${p.selling_price.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          p.stock_allocated > 10 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : p.stock_allocated > 0 
                              ? "bg-amber-50 text-amber-700 border-amber-200" 
                              : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {p.stock_allocated} pcs
                        </span>
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          p.is_active_pos 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : "bg-slate-100 text-zinc-500 border-slate-200"
                        }`}>
                          {p.is_active_pos ? "ACTIVE" : "HIDDEN"}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPricingProduct(p);
                              setNewPrice(String(p.selling_price || 0));
                              setNewActive(p.is_active_pos);
                            }}
                            className="px-2 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-[11px] rounded-md transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Set Price & Visibility"
                          >
                            <DollarSign className="w-3 h-3 text-[#0B57D0]" />
                            <span>Price</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingProduct(p);
                              setAdjustAction("add");
                              setAdjustQty("1");
                              setAdjustReason("");
                            }}
                            className="px-2 py-1 border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#0B57D0] font-semibold text-[11px] rounded-md transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Add or Remove Stock"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Stock</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingProduct(p)}
                            className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-md transition-colors cursor-pointer"
                            title="Remove product from POS"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "ledger" ? (
        /* Sales Ledger & Analytics Tab */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* KPI Summary Cards */}
          <div className="p-4 bg-[#F8F9FA] border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Total Sales</span>
                <h3 className="text-lg font-bold text-zinc-950">${ledgerMetrics.totalSales.toFixed(2)}</h3>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Total Orders</span>
                <h3 className="text-lg font-bold text-zinc-950">{ledgerMetrics.totalOrders}</h3>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0B57D0] flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Items Sold</span>
                <h3 className="text-lg font-bold text-zinc-950">{ledgerMetrics.totalItems} pcs</h3>
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">Discounts / FOC</span>
                <h3 className="text-lg font-bold text-amber-700">${ledgerMetrics.totalDiscount.toFixed(2)}</h3>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-52">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search Order ID, Cashier..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F8F9FA] border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              <select
                value={ledgerPayment}
                onChange={(e) => setLedgerPayment(e.target.value)}
                className="px-2.5 py-1.5 bg-[#F8F9FA] border border-slate-200 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
              >
                <option value="all">All Payment Modes</option>
                <option value="Cash">Cash</option>
                <option value="QR">QR</option>
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="FOC">FOC (Complimentary)</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1 bg-[#F8F9FA] border border-slate-200 rounded-lg text-xs font-semibold text-zinc-800"
                />
                <span>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1 bg-[#F8F9FA] border border-slate-200 rounded-lg text-xs font-semibold text-zinc-800"
                />
              </div>

              {(ledgerSearch || ledgerPayment !== "all" || startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setLedgerSearch("");
                    setLedgerPayment("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-800 underline font-semibold transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <span className="text-xs text-zinc-500">
              Showing <strong className="text-zinc-900">{filteredOrders.length}</strong> orders
            </span>
          </div>

          {/* Orders Table */}
          <div className="flex-1 overflow-auto min-h-0">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-[#F0F4F9] sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-36">Order ID</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-24">Ref Mark</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-36">Date & Time</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-28">Cashier</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px]">Items Summary</th>
                  <th className="px-3.5 py-2.5 text-right font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-24">Subtotal</th>
                  <th className="px-3.5 py-2.5 text-right font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-24">Discount</th>
                  <th className="px-3.5 py-2.5 text-right font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-28">Total Paid</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-28">Payment Mode</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-24">Status</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-16 text-center text-zinc-400 italic">
                      No sales transactions found for selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-zinc-900">{o.id}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        {o.ref_code ? (
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-[#0B57D0] border border-blue-200 font-mono font-black text-xs">
                            {o.ref_code}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-zinc-500 font-medium">
                        {new Date(Number(o.created_at)).toLocaleString("en-SG", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold text-zinc-800">{o.cashier_name}</td>
                      <td className="px-3.5 py-2.5 text-zinc-600">
                        {Array.isArray(o.items) && (
                          <div className="flex flex-col">
                            <span>{o.items.map(it => `${it.name} (x${it.qty})`).join(", ")}</span>
                            <span className="text-[10px] text-zinc-400">{o.items.reduce((acc, it) => acc + (it.qty || 1), 0)} total pcs</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-medium text-zinc-700">${Number(o.subtotal).toFixed(2)}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-medium text-amber-700">
                        {Number(o.discount_amount || 0) > 0 ? `-$${Number(o.discount_amount).toFixed(2)}` : "-"}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-700">${Number(o.total_amount).toFixed(2)}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          o.is_foc || o.payment_method === "FOC" 
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : o.payment_method === "QR" || o.payment_method === "PayNow"
                              ? "bg-blue-50 text-[#0B57D0] border-blue-200"
                              : o.payment_method === "Transfer Bank" || o.payment_method === "Bank Transfer"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {o.is_foc ? "FOC" : o.payment_method}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          COMPLETED
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingOrder(o)}
                            className="p-1 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 rounded-md transition-all shadow-xs cursor-pointer"
                            title="View Receipt Details"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[#0B57D0]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingOrder(o);
                              setDeleteOrderRestoreStock(true);
                            }}
                            className="p-1 border border-red-200 bg-red-50/50 hover:bg-red-100 text-red-600 rounded-md transition-all shadow-xs cursor-pointer"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Voided Transactions Tab */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Filter Toolbar */}
          <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative w-72">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search Void ID, Ref, Reason, Staff..."
                  value={voidSearch}
                  onChange={(e) => setVoidSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F8F9FA] border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              {voidSearch && (
                <button
                  type="button"
                  onClick={() => setVoidSearch("")}
                  className="text-xs text-zinc-500 hover:text-zinc-800 underline font-semibold transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              )}
            </div>

            <span className="text-xs text-zinc-500">
              Showing <strong className="text-zinc-900">{filteredVoidOrders.length}</strong> voided records
            </span>
          </div>

          {/* Voided Table */}
          <div className="flex-1 overflow-auto min-h-0">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-[#F0F4F9] sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-36">Void ID</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-24">Ref Mark</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-36">Voided At</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-32">Voided By (Staff)</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-32">Approved By (2nd Staff)</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px]">Void Reason</th>
                  <th className="px-3.5 py-2.5 text-right font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-28">Amount ($)</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-24">Status</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-20">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredVoidOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-12 text-center text-zinc-400 italic">
                      No voided transactions found in archive.
                    </td>
                  </tr>
                ) : (
                  filteredVoidOrders.map((vo) => (
                    <tr key={vo.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-red-600">{vo.id}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">Ref: {vo.original_order_id || vo.id}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        {vo.ref_code ? (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-[#0B57D0] border border-blue-200 font-mono font-bold text-xs">
                            {vo.ref_code}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-zinc-500 font-medium">
                        {new Date(Number(vo.voided_at || vo.created_at)).toLocaleString("en-SG", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold text-zinc-800">{vo.voided_by || vo.cashier_name}</td>
                      <td className="px-3.5 py-2.5 font-semibold text-amber-800">
                        {vo.approved_by ? (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                            {vo.approved_by}
                          </span>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-zinc-700">
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-medium text-[11px]">
                          {vo.void_reason || "Voided at POS Cashier"}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-zinc-700 line-through">
                        ${Number(vo.total_amount).toFixed(2)}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                          VOIDED
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => setViewingOrder(vo)}
                          className="p-1 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 rounded-md transition-all shadow-xs cursor-pointer"
                          title="View Void Details"
                        >
                          <Receipt className="w-3.5 h-3.5 text-[#0B57D0]" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ADD PRODUCT TO POS MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col p-6 gap-4 animate-in fade-in zoom-in duration-150 max-h-[90vh]">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Add Product to POS Catalog</h3>
                <p className="text-xs text-zinc-500">Pick a product from inventory, assign selling price, and allocate stock.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-1">
              {/* Product Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-700">Select Inventory Product</label>
                
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Filter by SKU or Product name..."
                    value={masterSearch}
                    onChange={(e) => setMasterSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#F8F9FA] border border-slate-200 rounded-lg text-xs font-semibold mb-1.5 focus:bg-white"
                  />
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto divide-y divide-slate-100 bg-[#F8F9FA]/40">
                  {availableMasterProducts.length === 0 ? (
                    <div className="p-4 text-center text-zinc-400 text-xs italic">
                      No matching products available to add
                    </div>
                  ) : (
                    availableMasterProducts.map((p) => {
                      const selected = selectedMasterSku === p.sku;
                      return (
                        <div
                          key={p.sku}
                          onClick={() => {
                            setSelectedMasterSku(p.sku);
                            if (p.selling_price) setAddPrice(String(p.selling_price));
                          }}
                          className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors text-xs ${
                            selected ? "bg-blue-50/80 border-l-4 border-l-[#0B57D0]" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                              {p.image ? (
                                <img src={p.image} alt={p.sku} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-3.5 h-3.5 text-zinc-400" />
                              )}
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="font-bold text-zinc-900 truncate">{p.display_name}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">{p.sku} • {p.brand_name || "HSG"}</span>
                            </div>
                          </div>

                          {selected && (
                            <CheckCircle2 className="w-4 h-4 text-[#0B57D0] shrink-0" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Price & Initial Stock Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-700">Retail Selling Price ($ SGD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">$</span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={addPrice}
                      onChange={(e) => setAddPrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-700">Initial Stock Quantity (pcs)</label>
                  <input
                    type="number"
                    min="0"
                    value={addStock}
                    onChange={(e) => setAddStock(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Reference Note */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-700">Reason / Reference</label>
                <input
                  type="text"
                  value={addReason}
                  onChange={(e) => setAddReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={addingSaving}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddProduct}
                disabled={addingSaving || !selectedMasterSku}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {addingSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Add Product to POS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. STOCK ADJUSTMENT MODAL */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden flex flex-col p-6 gap-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Adjust Retail Stock</h3>
                <p className="text-xs text-zinc-500">{adjustingProduct.sku} - {adjustingProduct.display_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingProduct(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-600">Current Stock:</span>
                <span className="text-base font-bold font-mono text-zinc-950">{adjustingProduct.stock_allocated} pcs</span>
              </div>

              {/* Action Type */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "add", label: "Add (+)" },
                  { id: "remove", label: "Deduct (-)" },
                  { id: "set", label: "Set Exact" }
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setAdjustAction(act.id as any)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                      adjustAction === act.id 
                        ? "bg-[#0B57D0] text-white border-[#0B57D0]" 
                        : "bg-white border-slate-200 text-zinc-700 hover:bg-slate-50"
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>

              {/* Qty Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-700">Quantity (pcs)</label>
                <input
                  type="number"
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              {/* Reason */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-700">Reason / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Replenishment, damaged, stocktake audit"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAdjustingProduct(null)}
                disabled={adjustingSaving}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStockAdjustment}
                disabled={adjustingSaving}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {adjustingSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Confirm Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. PRICING & VISIBILITY MODAL */}
      {pricingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden flex flex-col p-6 gap-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Set Price & Visibility</h3>
                <p className="text-xs text-zinc-500">{pricingProduct.sku} - {pricingProduct.display_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setPricingProduct(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Selling Price */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-700">Retail Price ($ SGD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="pos_active_cb"
                  checked={newActive}
                  onChange={(e) => setNewActive(e.target.checked)}
                  className="w-4 h-4 text-[#0B57D0] rounded border-slate-300 focus:ring-[#0B57D0]"
                />
                <label htmlFor="pos_active_cb" className="text-xs font-semibold text-zinc-800 cursor-pointer">
                  Show and enable item in POS Terminal
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPricingProduct(null)}
                disabled={pricingSaving}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePricing}
                disabled={pricingSaving}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {pricingSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Save Pricing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7B. DELETE TRANSACTION ORDER MODAL (ADMIN) */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full overflow-hidden flex flex-col p-5 gap-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Delete Sales Transaction?</h3>
                <p className="text-xs text-zinc-500">{deletingOrder.id} • ${Number(deletingOrder.total_amount).toFixed(2)}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to permanently delete transaction <strong className="font-mono text-zinc-900">{deletingOrder.id}</strong> from the sales ledger?
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2">
              <input
                type="checkbox"
                id="restore_stock_cb"
                checked={deleteOrderRestoreStock}
                onChange={(e) => setDeleteOrderRestoreStock(e.target.checked)}
                className="w-4 h-4 text-[#0B57D0] rounded border-slate-300 focus:ring-[#0B57D0]"
              />
              <label htmlFor="restore_stock_cb" className="text-xs font-semibold text-zinc-800 cursor-pointer">
                Restore allocated retail stocks for purchased items
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                disabled={deletingOrderSaving}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                disabled={deletingOrderSaving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {deletingOrderSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. VIEW ORDER DETAILS MODAL */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Transaction Details</h3>
                <span className="text-xs text-[#0B57D0] font-mono font-semibold">{viewingOrder.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 bg-[#F8F9FA] p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-zinc-400 text-[10px] uppercase font-bold">Date & Time</span>
                  <p className="font-semibold text-zinc-900">{new Date(Number((viewingOrder as any).voided_at || viewingOrder.created_at)).toLocaleString("en-SG")}</p>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px] uppercase font-bold">Cashier / Staff</span>
                  <p className="font-semibold text-zinc-900">{(viewingOrder as any).voided_by || viewingOrder.cashier_name}</p>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px] uppercase font-bold">Payment Mode</span>
                  <p className="font-semibold text-zinc-900">{viewingOrder.payment_method}</p>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px] uppercase font-bold">Status</span>
                  <p className={`font-semibold uppercase ${(viewingOrder as any).void_reason ? "text-red-600" : "text-emerald-700"}`}>
                    {(viewingOrder as any).void_reason ? "VOIDED" : viewingOrder.status}
                  </p>
                </div>
              </div>

              {(viewingOrder as any).void_reason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex flex-col gap-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-red-600" />
                    <span>Void Justification &amp; Dual Authorization</span>
                  </div>
                  <p className="text-red-700 leading-relaxed font-medium">{(viewingOrder as any).void_reason}</p>
                  
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-red-200/60 text-[11px]">
                    <div>
                      <span className="text-red-500 font-bold block">Void Initiator:</span>
                      <span className="font-semibold text-zinc-900">{(viewingOrder as any).voided_by || viewingOrder.cashier_name}</span>
                    </div>
                    <div>
                      <span className="text-amber-700 font-bold block">Second Staff Approver:</span>
                      <span className="font-semibold text-zinc-900">{(viewingOrder as any).approved_by || "Authorized Staff"}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-red-500 font-mono">Voided at: {new Date(Number((viewingOrder as any).voided_at)).toLocaleString("en-SG")}</p>
                </div>
              )}

              {/* Items List */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Purchased Items</span>
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {Array.isArray(viewingOrder.items) && viewingOrder.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-900">{it.name}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{it.sku}</span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <span className="text-zinc-500 font-medium">x{it.qty}</span>
                        <span className="font-mono font-bold text-zinc-900 w-16">
                          {it.is_foc ? <span className="text-[#0B57D0]">FOC</span> : `$${Number(it.subtotal || (it.price * it.qty)).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="flex flex-col gap-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium">${Number(viewingOrder.subtotal).toFixed(2)}</span>
                </div>
                {Number(viewingOrder.discount_amount) > 0 && (
                  <div className="flex justify-between text-[#0B57D0]">
                    <span>Discount / FOC Deduction:</span>
                    <span className="font-mono font-medium">-${Number(viewingOrder.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-950 font-bold text-sm pt-2 border-t border-slate-200">
                  <span>Total Amount Paid:</span>
                  <span className={`font-mono ${(viewingOrder as any).void_reason ? "line-through text-zinc-400" : "text-emerald-700"}`}>
                    ${Number(viewingOrder.total_amount).toFixed(2)}
                  </span>
                </div>
                {viewingOrder.payment_method === "Cash" && (
                  <div className="flex justify-between text-zinc-500 text-[11px] pt-1">
                    <span>Cash Tendered: ${Number(viewingOrder.cash_received).toFixed(2)}</span>
                    <span>Change: ${Number(viewingOrder.cash_change).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              {!(viewingOrder as any).void_reason && (
                <button
                  type="button"
                  onClick={() => handlePrintReceipt(viewingOrder as POSOrder)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-zinc-800 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 9. BRAND PROMO MODAL */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col p-6 gap-4 animate-in fade-in zoom-in duration-150 max-h-[92vh]">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">
                  {editingPromo ? "Edit Brand Mix & Match Promotion" : "Create Brand Mix & Match Promotion"}
                </h3>
                <p className="text-xs text-zinc-500">Pick a brand and select which SKUs participate in the bundle promotion.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPromoModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
              {/* Brand Selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-700">Target Brand</label>
                {brandsList.length > 0 ? (
                  <select
                    value={promoBrandName}
                    onChange={(e) => {
                      const newB = e.target.value;
                      setPromoBrandName(newB);
                      // Auto-select all SKUs of that brand by default
                      const brandSkus = posProducts
                        .filter(p => p.brand_name && p.brand_name.toLowerCase() === newB.toLowerCase())
                        .map(p => p.sku);
                      setPromoSelectedSkus(brandSkus);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  >
                    <option value="">-- Select Brand --</option>
                    {brandsList.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Hausboom"
                    value={promoBrandName}
                    onChange={(e) => setPromoBrandName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                )}
              </div>

              {/* SKU Selection Multi-check Container */}
              {promoBrandName && (
                <div className="flex flex-col gap-1.5 p-3 bg-[#F8F9FA] rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800">
                      Participating SKUs ({promoSelectedSkus.length} selected)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allBrandSkus = posProducts
                            .filter(p => p.brand_name && p.brand_name.toLowerCase() === promoBrandName.toLowerCase())
                            .map(p => p.sku);
                          setPromoSelectedSkus(allBrandSkus);
                        }}
                        className="text-[11px] font-bold text-[#0B57D0] hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-zinc-300">•</span>
                      <button
                        type="button"
                        onClick={() => setPromoSelectedSkus([])}
                        className="text-[11px] font-bold text-red-600 hover:underline"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="relative my-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Filter brand SKUs..."
                      value={promoSkuSearch}
                      onChange={(e) => setPromoSkuSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 bg-white border border-slate-200 rounded-lg">
                    {posProducts
                      .filter(p => p.brand_name && p.brand_name.toLowerCase() === promoBrandName.toLowerCase())
                      .filter(p => {
                        const q = promoSkuSearch.toLowerCase().trim();
                        return !q || p.sku.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q);
                      })
                      .map((p) => {
                        const isChecked = promoSelectedSkus.includes(p.sku);
                        return (
                          <label
                            key={p.sku}
                            className="p-2 flex items-center justify-between gap-2 hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPromoSelectedSkus(prev => [...prev, p.sku]);
                                  } else {
                                    setPromoSelectedSkus(prev => prev.filter(s => s !== p.sku));
                                  }
                                }}
                                className="w-4 h-4 text-[#0B57D0] rounded border-slate-300 focus:ring-[#0B57D0]"
                              />
                              <div className="flex flex-col truncate">
                                <span className="font-semibold text-zinc-900 truncate">{p.display_name}</span>
                                <span className="text-[10px] text-zinc-400 font-mono">{p.sku} • ${p.selling_price.toFixed(2)}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-zinc-500 font-mono shrink-0">{p.stock_allocated} in stock</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Min Qty & Promo Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-700">Min Quantity (pcs)</label>
                  <input
                    type="number"
                    min="2"
                    value={promoMinQty}
                    onChange={(e) => setPromoMinQty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-700">Promotion Type</label>
                  <select
                    value={promoType}
                    onChange={(e) => setPromoType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  >
                    <option value="bundle_price">Fixed Bundle Price ($)</option>
                    <option value="percent_off">Percentage Off (%)</option>
                    <option value="fixed_off">Fixed Discount Off ($)</option>
                  </select>
                </div>
              </div>

              {/* Value Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-700">
                  {promoType === "bundle_price" ? "Bundle Price ($ SGD)" : promoType === "percent_off" ? "Discount Percentage (% Off)" : "Discount Amount ($ Off)"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">
                    {promoType === "percent_off" ? "%" : "$"}
                  </span>
                  <input
                    type="number"
                    step={promoType === "percent_off" ? "1" : "0.10"}
                    min="0"
                    value={promoVal}
                    onChange={(e) => setPromoVal(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promo_active_cb"
                  checked={promoActive}
                  onChange={(e) => setPromoActive(e.target.checked)}
                  className="w-4 h-4 text-[#0B57D0] rounded border-slate-300 focus:ring-[#0B57D0]"
                />
                <label htmlFor="promo_active_cb" className="text-xs font-semibold text-zinc-800 cursor-pointer">
                  Activate this promotion immediately in POS Terminal
                </label>
              </div>

              {/* Preview banner */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-[#0B57D0] font-medium flex items-center gap-2">
                <Tag className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Preview:</strong> Customer buys any {promoMinQty} items across {promoSelectedSkus.length > 0 ? `${promoSelectedSkus.length} selected SKUs` : "all SKUs"} of <em>{promoBrandName || "Brand"}</em> ➔{" "}
                  {promoType === "bundle_price" && `Total price is $${Number(promoVal || 0).toFixed(2)}`}
                  {promoType === "percent_off" && `Gets ${promoVal}% discount`}
                  {promoType === "fixed_off" && `Gets $${Number(promoVal || 0).toFixed(2)} discount`}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPromoModalOpen(false)}
                disabled={promoSaving}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBrandPromo}
                disabled={promoSaving || promoSelectedSkus.length === 0}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {promoSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Save Promotion Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
