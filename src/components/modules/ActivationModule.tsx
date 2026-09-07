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
  RotateCcw,
  QrCode,
  Building,
  CreditCard,
  Save,
  Image as ImageIcon,
  HelpCircle,
  Video,
  Tv,
  Upload,
  UploadCloud,
  Play,
  Film,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  Users,
  MapPin,
  CheckSquare,
  Square,
  Lock,
  ClipboardCheck,
  FileText,
  FileSpreadsheet,
  Sparkles,
  Settings,
  Building2,
  Pencil,
  ShoppingBag,
  Clock,
  Crop,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check
} from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";

interface ActivationModuleProps {
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
  activation_id?: string;
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
  proof_photo_url?: string;
  proof_uploaded_at?: number;
  proof_uploaded_by?: string;
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

export interface POSActivation {
  id: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  foc_description: string;
  participants: Array<{ id: string; name: string; type?: string }>;
  stock_allocated: Array<{ sku: string; qty: number }>;
  stock_returned: Array<{ sku: string; qty: number }>;
  stock_damaged: Array<{ sku: string; qty: number; reason?: string }>;
  stock_sales: Array<{ sku: string; qty: number }>;
  stock_foc: Array<{ sku: string; qty: number }>;
  cash_deposit_receipts?: string[];
  status: "active" | "closed";
  use_pos?: boolean;
  created_by: string;
  created_at: number;
  closed_by?: string;
  closed_at?: number;
}

const mainTabs = [
  { id: "activations", label: "Event Activations", desc: "Manage event roadshows, allocate stocks, track staff & FOC reason, and reconcile returns to Manage Stock." },
  { id: "pos_terminal", label: "POS Terminal", desc: "Manage POS products catalog, pricing rules, cashier transactions, and display settings." }
];

export function ActivationModule({ profile }: ActivationModuleProps) {
  const [activeTab, setActiveTab] = React.useState<"activations" | "pos_terminal">("activations");
  const [posSubTab, setPosSubTab] = React.useState<"catalog" | "pricerules" | "transactions" | "settings">("catalog");
  const [transactionSubTab, setTransactionSubTab] = React.useState<"sales" | "void">("sales");
  const [posProducts, setPosProducts] = React.useState<POSProduct[]>([]);
  const [masterProducts, setMasterProducts] = React.useState<POSProduct[]>([]);
  const [brandPromos, setBrandPromos] = React.useState<BrandPromo[]>([]);
  const [orders, setOrders] = React.useState<POSOrder[]>([]);
  const [voidOrders, setVoidOrders] = React.useState<POSVoidOrder[]>([]);
  const [loading, setLoading] = React.useState(false);

  // POS Payment & QR Settings State
  const [posSettings, setPosSettings] = React.useState({
    qr_image_url: "",
    paynow_uen: "",
    paynow_name: "HSG GLOBAL PTE LTD",
    bank_name: "",
    bank_account_no: "",
    bank_account_name: "HSG GLOBAL PTE LTD",
    instructions: "Scan PayNow QR or transfer to bank account above. Inform cashier once payment is complete.",
    ad_mode: "photos" as "photos" | "video",
    ad_slides: [] as string[],
    ad_transition: "fade" as "fade" | "slide",
    ad_interval_sec: 5,
    ad_video_url: "",
    ad_media_url: "",
    ad_media_type: "image" as "image" | "video"
  });
  const [settingsSaving, setSettingsSaving] = React.useState(false);
  const [uploadingQR, setUploadingQR] = React.useState(false);
  const [uploadingSlide, setUploadingSlide] = React.useState(false);
  const [uploadingVideo, setUploadingVideo] = React.useState(false);

  // Direct R2 File Upload Helper
  const uploadFileToR2 = async (file: File, folder: string = "pos-media"): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const base64Data = result.split(",")[1];
          const res = await fetch(`${WORKER_URL}/api/pos/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              contentType: file.type,
              base64Data,
              folder
            })
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          if (!data.success || !data.url) throw new Error(data.error || "R2 upload failed");
          resolve(data.url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

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

  // Activations State
  const [activations, setActivations] = React.useState<POSActivation[]>([]);
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = React.useState<Set<string>>(new Set());
  const [assignTargetActId, setAssignTargetActId] = React.useState<string>("");
  const [isAssigningOrders, setIsAssigningOrders] = React.useState<boolean>(false);

  // Create & Edit Activation Modal State
  const [isCreateActModalOpen, setIsCreateActModalOpen] = React.useState(false);
  const [editingAct, setEditingAct] = React.useState<POSActivation | null>(null);
  const [newActName, setNewActName] = React.useState("");
  const [newActLocation, setNewActLocation] = React.useState("");
  const [newActStartDate, setNewActStartDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [newActEndDate, setNewActEndDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [newActFocDesc, setNewActFocDesc] = React.useState("");
  const [newActUsePos, setNewActUsePos] = React.useState(true);
  const [newActParticipants, setNewActParticipants] = React.useState<string[]>([]);
  const [newActAllocatedItems, setNewActAllocatedItems] = React.useState<Array<{ sku: string; qty: number | string }>>([{ sku: "", qty: "" }]);
  const [isSavingAct, setIsSavingAct] = React.useState(false);

  // Delete Confirmation Modal (Activation)
  const [deletingAct, setDeletingAct] = React.useState<POSActivation | null>(null);
  const [deletingActSaving, setDeletingActSaving] = React.useState(false);

  // Close & Reconcile Modal State
  const [closingAct, setClosingAct] = React.useState<POSActivation | null>(null);
  const [closingAllocations, setClosingAllocations] = React.useState<Record<string, number>>({});
  const [closingReturns, setClosingReturns] = React.useState<Record<string, number>>({});
  const [closingDamaged, setClosingDamaged] = React.useState<Record<string, number>>({});
  const [closingDamagedReasons, setClosingDamagedReasons] = React.useState<Record<string, string>>({});
  const [isClosingAct, setIsClosingAct] = React.useState(false);
  const [isSavingReturn, setIsSavingReturn] = React.useState(false);

  // Print Activation Report Modal State
  const [printingAct, setPrintingAct] = React.useState<POSActivation | null>(null);

  // Order Details Modal
  const [viewingOrder, setViewingOrder] = React.useState<POSOrder | POSVoidOrder | null>(null);

  // Photo Receipt Upload & Crop/Rotate Modal State (For QR / Bank Transfer Orders)
  const [receiptUploadOrder, setReceiptUploadOrder] = React.useState<POSOrder | null>(null);
  const [receiptRawImage, setReceiptRawImage] = React.useState<string | null>(null);
  const [receiptRotation, setReceiptRotation] = React.useState<number>(0);
  const [receiptCropBox, setReceiptCropBox] = React.useState<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 100, height: 100 });
  const [cropInteraction, setCropInteraction] = React.useState<{
    type: "drag" | "resize";
    handle?: string;
    startX: number;
    startY: number;
    box: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = React.useState<boolean>(false);
  const receiptFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Cash Deposit Receipts State (For Closing Activation with Cash Sales)
  const [cashDepositPhotos, setCashDepositPhotos] = React.useState<string[]>([]);
  const [isUploadingCashDeposit, setIsUploadingCashDeposit] = React.useState<boolean>(false);
  const [isCashCropModalOpen, setIsCashCropModalOpen] = React.useState<boolean>(false);
  const [cashRawImage, setCashRawImage] = React.useState<string | null>(null);
  const [cashRotation, setCashRotation] = React.useState<number>(0);
  const [cashCropBox, setCashCropBox] = React.useState<{ x: number; y: number; width: number; height: number }>({ x: 0, y: 0, width: 100, height: 100 });
  const cashFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [viewingPhotoUrl, setViewingPhotoUrl] = React.useState<string | null>(null);
  const [viewingStaffAct, setViewingStaffAct] = React.useState<POSActivation | null>(null);

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

      // 5b. Fetch Activations & Employees
      const [actRes, empRes] = await Promise.all([
        fetch(`${WORKER_URL}/api/pos/activations`).catch(() => null),
        fetch(`${WORKER_URL}/api/employees`).catch(() => null)
      ]);

      if (actRes && actRes.ok) {
        const actData = await actRes.json();
        setActivations(Array.isArray(actData) ? actData : []);
      }

      if (empRes && empRes.ok) {
        const empData = await empRes.json();
        setEmployees(Array.isArray(empData) ? empData : []);
      }

      // 6. Fetch POS Payment & QR Settings
      const settingsRes = await fetch(`${WORKER_URL}/api/pos/settings`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const s = settingsData.settings || settingsData.data;
        if (s) {
          setPosSettings({
            qr_image_url: s.qr_image_url || "",
            paynow_uen: s.paynow_uen || "",
            paynow_name: s.paynow_name || "HSG GLOBAL PTE LTD",
            bank_name: s.bank_name || "",
            bank_account_no: s.bank_account_no || "",
            bank_account_name: s.bank_account_name || "HSG GLOBAL PTE LTD",
            instructions: s.instructions || "Scan PayNow QR or transfer to bank account above. Inform cashier once payment is complete.",
            ad_mode: (s.ad_mode === "video" ? "video" : "photos") as "photos" | "video",
            ad_slides: Array.isArray(s.ad_slides) ? s.ad_slides : (s.ad_slides ? JSON.parse(s.ad_slides) : []),
            ad_transition: (s.ad_transition === "slide" ? "slide" : "fade") as "fade" | "slide",
            ad_interval_sec: Number(s.ad_interval_sec) || 5,
            ad_video_url: s.ad_video_url || "",
            ad_media_url: s.ad_media_url || "",
            ad_media_type: (s.ad_media_type === "video" ? "video" : "image") as "image" | "video"
          });
        }
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

  // Master products sorted by Brand Name, Brand ID, and SKU for dropdown selection
  const sortedMasterProducts = React.useMemo(() => {
    return [...masterProducts].sort((a, b) => {
      const brandNameA = (a.brand_name || "").toLowerCase();
      const brandNameB = (b.brand_name || "").toLowerCase();
      if (brandNameA !== brandNameB) return brandNameA.localeCompare(brandNameB);

      const brandIdA = String(a.brand_id || "").toLowerCase();
      const brandIdB = String(b.brand_id || "").toLowerCase();
      if (brandIdA !== brandIdB) return brandIdA.localeCompare(brandIdB);

      return (a.sku || "").localeCompare(b.sku || "");
    });
  }, [masterProducts]);

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

  // Handle Create or Edit Activation
  const handleSaveActivation = async () => {
    if (!newActName.trim()) {
      showToast("Please enter an activation name", "warning");
      return;
    }

    const validStock = newActAllocatedItems
      .map(it => ({ sku: String(it.sku).trim(), qty: Number(it.qty) || 0 }))
      .filter(it => it.sku && it.qty > 0)
      .sort((a, b) => {
        const prodA = masterProducts.find(p => p.sku.toLowerCase() === a.sku.toLowerCase()) || posProducts.find(p => p.sku.toLowerCase() === a.sku.toLowerCase());
        const prodB = masterProducts.find(p => p.sku.toLowerCase() === b.sku.toLowerCase()) || posProducts.find(p => p.sku.toLowerCase() === b.sku.toLowerCase());
        const brandA = (prodA?.brand_name || "").toLowerCase();
        const brandB = (prodB?.brand_name || "").toLowerCase();
        if (brandA !== brandB) return brandA.localeCompare(brandB);
        const brandIdA = String(prodA?.brand_id || "");
        const brandIdB = String(prodB?.brand_id || "");
        if (brandIdA !== brandIdB) return brandIdA.localeCompare(brandIdB);
        return a.sku.localeCompare(b.sku);
      });

    const participantObjs = newActParticipants.map(id => {
      const emp = employees.find(e => e.id === id);
      return {
        id,
        name: emp?.name || emp?.full_name || id,
        type: emp?.type || "Full Time"
      };
    });

    setIsSavingAct(true);
    try {
      if (editingAct) {
        // Edit existing activation
        const res = await fetch(`${WORKER_URL}/api/pos/activations/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingAct.id,
            name: newActName.trim(),
            location: newActLocation.trim(),
            start_date: newActStartDate,
            end_date: newActEndDate || newActStartDate,
            foc_description: newActFocDesc.trim(),
            participants: participantObjs,
            stock_allocated: validStock,
            use_pos: newActUsePos
          })
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to update activation");

        showToast(`Activation "${newActName}" updated!`, "success");
      } else {
        // Create new activation
        const res = await fetch(`${WORKER_URL}/api/pos/activations/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newActName.trim(),
            location: newActLocation.trim(),
            start_date: newActStartDate,
            end_date: newActEndDate || newActStartDate,
            foc_description: newActFocDesc.trim(),
            participants: participantObjs,
            stock_allocated: validStock,
            use_pos: newActUsePos,
            created_by: profile?.name || "Admin"
          })
        });

        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to create activation");

        showToast(`Activation "${newActName}" created!`, "success");
      }

      setIsCreateActModalOpen(false);
      setEditingAct(null);
      setNewActName("");
      setNewActLocation("");
      setNewActFocDesc("");
      setNewActUsePos(true);
      setNewActParticipants([]);
      setNewActAllocatedItems([{ sku: "", qty: "" }]);
      loadAllData();
    } catch (err: any) {
      showToast("Failed to save activation: " + err.message, "error");
    } finally {
      setIsSavingAct(false);
    }
  };

  // Open Edit Activation Modal
  const handleOpenEditActivation = (act: POSActivation) => {
    setEditingAct(act);
    setNewActName(act.name);
    setNewActLocation(act.location || "");
    setNewActStartDate(act.start_date || new Date().toISOString().split("T")[0]);
    setNewActEndDate(act.end_date || act.start_date || new Date().toISOString().split("T")[0]);
    setNewActFocDesc(act.foc_description || "");
    setNewActUsePos(act.use_pos !== false);
    setNewActParticipants((act.participants || []).map(p => p.id));
    
    let rawAlloc = Array.isArray(act.stock_allocated) && act.stock_allocated.length > 0
      ? act.stock_allocated.map(it => ({ sku: it.sku, qty: it.qty }))
      : [{ sku: "", qty: "" }];

    // Sort the allocated items rows by Brand Name, Brand ID, and SKU
    if (rawAlloc.length > 1) {
      rawAlloc.sort((a, b) => {
        const prodA = masterProducts.find(p => p.sku.toLowerCase() === (a.sku || "").toLowerCase()) || posProducts.find(p => p.sku.toLowerCase() === (a.sku || "").toLowerCase());
        const prodB = masterProducts.find(p => p.sku.toLowerCase() === (b.sku || "").toLowerCase()) || posProducts.find(p => p.sku.toLowerCase() === (b.sku || "").toLowerCase());
        const brandA = (prodA?.brand_name || "").toLowerCase();
        const brandB = (prodB?.brand_name || "").toLowerCase();
        if (brandA !== brandB) return brandA.localeCompare(brandB);
        const brandIdA = String(prodA?.brand_id || "");
        const brandIdB = String(prodB?.brand_id || "");
        if (brandIdA !== brandIdB) return brandIdA.localeCompare(brandIdB);
        return (a.sku || "").localeCompare(b.sku || "");
      });
    }

    setNewActAllocatedItems(rawAlloc);
    setIsCreateActModalOpen(true);
  };

  // Handle Delete Activation
  const handleConfirmDeleteActivation = async () => {
    if (!deletingAct) return;
    setDeletingActSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/activations/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingAct.id })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Deletion failed");

      showToast(`Activation "${deletingAct.name}" deleted successfully.`, "success");
      setDeletingAct(null);
      loadAllData();
    } catch (err: any) {
      showToast("Failed to delete activation: " + err.message, "error");
    } finally {
      setDeletingActSaving(false);
    }
  };

  // Handle Batch Assign Selected Orders to Activation
  const handleBatchAssignOrders = async () => {
    if (selectedOrderIds.size === 0) {
      showToast("Please select at least 1 order to assign", "warning");
      return;
    }

    setIsAssigningOrders(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/activations/assign-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activation_id: assignTargetActId || "",
          order_ids: Array.from(selectedOrderIds)
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Batch assignment failed");

      showToast(`Successfully assigned ${data.count} order(s)!`, "success");
      setSelectedOrderIds(new Set());
      setAssignTargetActId("");
      loadAllData();
    } catch (err: any) {
      showToast("Batch assignment error: " + err.message, "error");
    } finally {
      setIsAssigningOrders(false);
    }
  };

  // Open Close Activation Modal
  const handleOpenCloseModal = (act: POSActivation) => {
    setClosingAct(act);
    setCashDepositPhotos(Array.isArray(act.cash_deposit_receipts) ? [...act.cash_deposit_receipts] : []);
    const initialReturns: Record<string, number> = {};

    const assignedOrders = orders.filter(o => o.activation_id === act.id);
    const salesMap: Record<string, number> = {};
    const focMap: Record<string, number> = {};
    assignedOrders.forEach(ord => {
      const isOrdFoc = ord.is_foc || ord.payment_method === "FOC" || ord.discount_type === "foc";
      (ord.items || []).forEach(it => {
        const sku = it.sku;
        const qty = Number(it.qty || 1);
        if (isOrdFoc || it.is_foc || it.discount_type === "foc") {
          focMap[sku] = (focMap[sku] || 0) + qty;
        } else {
          salesMap[sku] = (salesMap[sku] || 0) + qty;
        }
      });
    });

    // Check if there are already saved returns in act.stock_returned
    const hasExistingReturns = Array.isArray(act.stock_returned) && act.stock_returned.length > 0;
    const existingReturnsMap: Record<string, number> = {};
    if (hasExistingReturns) {
      act.stock_returned.forEach(r => {
        if (r.sku) existingReturnsMap[r.sku] = Number(r.qty) || 0;
      });
    }

    const initialAlloc: Record<string, number> = {};
    (act.stock_allocated || []).forEach(it => {
      if (it.sku) initialAlloc[it.sku] = Number(it.qty) || 0;
    });
    setClosingAllocations(initialAlloc);

    // Default return to previously saved returns or expected unsold float
    (act.stock_allocated || []).forEach(it => {
      if (hasExistingReturns && existingReturnsMap[it.sku] !== undefined) {
        initialReturns[it.sku] = existingReturnsMap[it.sku];
      } else {
        const sold = salesMap[it.sku] || 0;
        const foc = focMap[it.sku] || 0;
        initialReturns[it.sku] = Math.max(0, it.qty - sold - foc);
      }
    });

    setClosingReturns(initialReturns);
  };

  // Save Physical Stock Return Draft (without final closing)
  const handleSaveStockReturn = async () => {
    if (!closingAct) return;
    setIsSavingReturn(true);
    try {
      const returnedList: { sku: string; qty: number }[] = [];
      Object.entries(closingReturns).forEach(([sku, qty]) => {
        const num = Number(qty) || 0;
        if (num >= 0) {
          returnedList.push({ sku, qty: num });
        }
      });

      const allocatedList: { sku: string; qty: number }[] = [];
      Object.entries(closingAllocations).forEach(([sku, qty]) => {
        const num = Number(qty) || 0;
        if (num >= 0) {
          allocatedList.push({ sku, qty: num });
        }
      });

      const res = await fetch(`${WORKER_URL}/api/pos/activations/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: closingAct.id,
          stock_allocated: allocatedList,
          stock_returned: returnedList,
          cash_deposit_receipts: cashDepositPhotos
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save stock return");

      // Update local state
      setClosingAct(prev => prev ? { ...prev, stock_allocated: allocatedList, stock_returned: returnedList, cash_deposit_receipts: cashDepositPhotos } : null);
      setActivations(prev => prev.map(a => a.id === closingAct.id ? { ...a, stock_allocated: allocatedList, stock_returned: returnedList, cash_deposit_receipts: cashDepositPhotos } : a));

      showToast("Allocation, Return counts and receipts saved!", "success");
    } catch (err: any) {
      showToast("Save failed: " + err.message, "error");
    } finally {
      setIsSavingReturn(false);
    }
  };

  // Confirm Close & Reconcile Activation
  const handleConfirmCloseActivation = async () => {
    if (!closingAct) return;

    // Strict Validation:
    const assignedOrders = orders.filter(o => o.activation_id === closingAct.id);
    const missingReceiptOrders = assignedOrders.filter(o => 
      ["QR", "Transfer Bank", "PayNow", "Bank Transfer"].includes(o.payment_method) && !o.proof_photo_url
    );

    if (missingReceiptOrders.length > 0) {
      showToast(`Cannot close activation: ${missingReceiptOrders.length} QR/Transfer order(s) are missing receipt photos!`, "warning");
      return;
    }

    const cashOrdersTotal = assignedOrders.reduce((sum, o) => {
      return (o.payment_method === "Cash" && !o.is_foc) ? sum + Number(o.total_amount || 0) : sum;
    }, 0);

    if (cashOrdersTotal > 0 && cashDepositPhotos.length === 0) {
      showToast("Cannot close activation: Cash sales recorded ($" + cashOrdersTotal.toFixed(2) + ") but no cash deposit receipt photo is uploaded!", "warning");
      return;
    }

    setIsClosingAct(true);
    try {
      const salesMap: Record<string, number> = {};
      const focMap: Record<string, number> = {};
      assignedOrders.forEach(ord => {
        const isOrdFoc = ord.is_foc || ord.payment_method === "FOC" || ord.discount_type === "foc";
        (ord.items || []).forEach(it => {
          const sku = it.sku;
          const qty = Number(it.qty || 1);
          if (isOrdFoc || it.is_foc || it.discount_type === "foc") {
            focMap[sku] = (focMap[sku] || 0) + qty;
          } else {
            salesMap[sku] = (salesMap[sku] || 0) + qty;
          }
        });
      });

      const returnedList: { sku: string; qty: number }[] = [];
      const damagedList: { sku: string; qty: number; reason?: string }[] = [];

      const allocatedList: { sku: string; qty: number }[] = [];
      Object.entries(closingAllocations).forEach(([sku, qty]) => {
        const num = Number(qty) || 0;
        if (num >= 0) {
          allocatedList.push({ sku, qty: num });
        }
      });

      const allSkus = Array.from(new Set([
        ...allocatedList.map(it => it.sku),
        ...(closingAct.stock_allocated || []).map(it => it.sku),
        ...Object.keys(salesMap),
        ...Object.keys(focMap)
      ]));

      allSkus.forEach(sku => {
        const alloc = closingAllocations[sku] !== undefined ? closingAllocations[sku] : ((closingAct.stock_allocated || []).find(it => it.sku === sku)?.qty || 0);
        const sold = salesMap[sku] || 0;
        const foc = focMap[sku] || 0;
        const ret = Number(closingReturns[sku]) || 0;
        
        if (ret > 0) {
          returnedList.push({ sku, qty: ret });
        }

        // Discrepancy is automatically absorbed into FOC Sampling / Tester (not Damaged/Lost)
        // damagedList remains empty unless physically broken goods are recorded
      });

      const res = await fetch(`${WORKER_URL}/api/pos/activations/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: closingAct.id,
          closed_by: profile?.name || "Admin",
          stock_allocated: allocatedList,
          stock_returned: returnedList,
          stock_damaged: damagedList,
          cash_deposit_receipts: cashDepositPhotos
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to close activation");

      showToast(`Activation ${closingAct.id} closed! 2 Stock Out entries created in Manage Stock.`, "success");
      setClosingAct(null);
      loadAllData();
    } catch (err: any) {
      showToast("Closing failed: " + err.message, "error");
    } finally {
      setIsClosingAct(false);
    }
  };

  // Handle Cash Deposit File Selection
  const handleCashDepositFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file (JPG, PNG, WebP)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCashRawImage(event.target?.result as string);
      setCashRotation(0);
      setCashCropBox({ x: 0, y: 0, width: 100, height: 100 });
      setIsCashCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  // Process & Upload Cropped Cash Deposit Receipt
  const handleSaveCashDepositPhoto = async () => {
    if (!cashRawImage || !closingAct) {
      showToast("Please select a photo receipt to upload", "warning");
      return;
    }

    setIsUploadingCashDeposit(true);
    try {
      const img = new window.Image();
      img.src = cashRawImage;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context creation failed");

      const rad = (cashRotation % 360) * (Math.PI / 180);
      const isSwapped = (cashRotation / 90) % 2 !== 0;
      
      const rotatedWidth = isSwapped ? img.naturalHeight : img.naturalWidth;
      const rotatedHeight = isSwapped ? img.naturalWidth : img.naturalHeight;

      const cropX = (cashCropBox.x / 100) * rotatedWidth;
      const cropY = (cashCropBox.y / 100) * rotatedHeight;
      const cropW = Math.max(10, (cashCropBox.width / 100) * rotatedWidth);
      const cropH = Math.max(10, (cashCropBox.height / 100) * rotatedHeight);

      const rotCanvas = document.createElement("canvas");
      rotCanvas.width = rotatedWidth;
      rotCanvas.height = rotatedHeight;
      const rotCtx = rotCanvas.getContext("2d")!;

      rotCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
      rotCtx.rotate(rad);
      rotCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const finalDataUrl = canvas.toDataURL("image/jpeg", 0.90);
      const base64Data = finalDataUrl.split(",")[1];

      const fileName = `cash_deposit_${closingAct.id}_${Date.now()}.jpg`;
      const uploadRes = await fetch(`${WORKER_URL}/api/pos/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          base64Data,
          contentType: "image/jpeg",
          folder: "pos-receipts"
        })
      });

      if (!uploadRes.ok) throw new Error(await uploadRes.text());
      const uploadJson = await uploadRes.json();
      if (!uploadJson.success || !uploadJson.url) {
        throw new Error(uploadJson.error || "Storage upload failed");
      }

      setCashDepositPhotos(prev => [...prev, uploadJson.url]);
      showToast("Cash deposit receipt photo attached!", "success");
      setIsCashCropModalOpen(false);
      setCashRawImage(null);
    } catch (err: any) {
      console.error("Cash deposit upload error:", err);
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setIsUploadingCashDeposit(false);
    }
  };

  // Generate & Open PDF Blob for High-Density Activation Audit Report
  const handlePrintReport = async (act: POSActivation) => {
    try {
      showToast("Generating Activation PDF...", "info");
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = 210;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      // 1. Clean Corporate Header (B&W High-Contrast Print Ready)
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("HSG GLOBAL PTE LTD", margin, 17);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text("EVENT ACTIVATION AUDIT & RECONCILIATION REPORT", margin, 23);

      // Top Right Reference & Date
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`DOC REF: ${act.id}`, pageWidth - margin, 17, { align: "right" });

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const printDateStr = new Date().toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      doc.text(`Generated: ${printDateStr}`, pageWidth - margin, 23, { align: "right" });

      // Clean Solid Divider
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, 27, pageWidth - margin, 27);

      // 2. Structured Metadata Grid (Section 1: Activation Summary)
      let curY = 35;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("1. ACTIVATION SUMMARY", margin, curY);

      const formatToDDMMYYYY = (dateStr?: string) => {
        if (!dateStr) return "N/A";
        const parts = dateStr.split("-");
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
      };

      const staffStr = Array.isArray(act.participants) && act.participants.length > 0
        ? act.participants.map(p => p.name).join(", ")
        : "None specified";

      const eventDatesStr = act.start_date === act.end_date || !act.end_date 
        ? formatToDDMMYYYY(act.start_date) 
        : `${formatToDDMMYYYY(act.start_date)} to ${formatToDDMMYYYY(act.end_date)}`;

      const todayStr = new Date().toISOString().split("T")[0];
      const isEnded = !act.end_date || todayStr >= act.end_date;
      const isClosed = act.status === "closed";
      const displayStatus = isClosed 
        ? "CLOSED" 
        : isEnded 
          ? "PENDING RECONCILIATION" 
          : "ACTIVE";
      const displayClosedBy = isClosed 
        ? (act.closed_by || "Operator") 
        : isEnded 
          ? "Pending Reconciliation / Audit" 
          : "Active / In Progress";

      const metaRows: any[] = [
        [
          { content: "Event Name:" },
          { content: act.name || "N/A", styles: { fontStyle: "bold" } },
          { content: "Status:" },
          { content: displayStatus, styles: { fontStyle: "bold" } }
        ],
        [
          { content: "Location:" },
          { content: act.location || "N/A" },
          { content: "Event Dates:" },
          { content: eventDatesStr }
        ],
        [
          { content: "Staff Joined:" },
          { content: staffStr },
          { content: "Closed By:" },
          { content: displayClosedBy }
        ]
      ];

      if (act.foc_description) {
        metaRows.push([
          { content: "FOC Reason:" },
          { content: act.foc_description, colSpan: 3, styles: { fontStyle: "italic" } }
        ]);
      }

      autoTable(doc, {
        startY: curY + 3,
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: { top: 1.8, bottom: 1.8, left: 1, right: 1 },
          textColor: [0, 0, 0],
          overflow: "linebreak"
        },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: "bold", textColor: [0, 0, 0] },
          1: { cellWidth: 64 },
          2: { cellWidth: 26, fontStyle: "bold", textColor: [0, 0, 0] },
          3: { cellWidth: 66 }
        },
        body: metaRows,
        margin: { left: margin, right: margin }
      });

      curY = (doc as any).lastAutoTable?.finalY || (curY + 24);

      // 3. Financial Summary Breakdown (Section 2)
      const actOrders = orders.filter(o => o.activation_id === act.id);
      let totalGross = 0;
      let cashTotal = 0;
      let qrTotal = 0;
      let transferTotal = 0;

      actOrders.forEach(o => {
        const amt = Number(o.total_amount || 0);
        totalGross += amt;
        const pm = String(o.payment_method || "").toLowerCase();
        if (pm === "cash") cashTotal += amt;
        else if (pm === "qr" || pm === "paynow") qrTotal += amt;
        else if (pm === "transfer bank" || pm === "bank transfer" || pm === "card") transferTotal += amt;
      });

      // Generous breathing space before Section 2
      curY += 12;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("2. FINANCIAL REVENUE BREAKDOWN", margin, curY);

      autoTable(doc, {
        startY: curY + 3,
        theme: "plain",
        styles: {
          cellPadding: { top: 1, bottom: 1, left: 1, right: 1 },
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 45 },
          2: { cellWidth: 45 },
          3: { cellWidth: 47 }
        },
        body: [
          [
            { content: "TOTAL GROSS SALES", styles: { fontSize: 8, fontStyle: "bold", textColor: [0, 0, 0] } },
            { content: "CASH COLLECTED", styles: { fontSize: 8, fontStyle: "bold", textColor: [0, 0, 0] } },
            { content: "QR / PAYNOW", styles: { fontSize: 8, fontStyle: "bold", textColor: [0, 0, 0] } },
            { content: "BANK TRANSFER / CARD", styles: { fontSize: 8, fontStyle: "bold", textColor: [0, 0, 0] } }
          ],
          [
            { content: `$${totalGross.toFixed(2)}`, styles: { fontSize: 13, fontStyle: "bold", textColor: [0, 0, 0] } },
            { content: `$${cashTotal.toFixed(2)}`, styles: { fontSize: 13, fontStyle: "bold", textColor: [0, 0, 0] } },
            { content: `$${qrTotal.toFixed(2)}`, styles: { fontSize: 13, fontStyle: "bold", textColor: [0, 0, 0] } },
            { content: `$${transferTotal.toFixed(2)}`, styles: { fontSize: 13, fontStyle: "bold", textColor: [0, 0, 0] } }
          ],
          [
            {
              content: "* Note: All cash collected has been deposited / transferred directly to the company bank account (no cash drawer maintained).",
              colSpan: 4,
              styles: { fontSize: 8, fontStyle: "italic", textColor: [0, 0, 0], cellPadding: { top: 3, bottom: 0 } }
            }
          ]
        ],
        margin: { left: margin, right: margin }
      });

      curY = (doc as any).lastAutoTable?.finalY || (curY + 22);

      // 4. Stock Movement & Reconciliation Table (Section 3)
      const salesMap: Record<string, number> = {};
      const focMap: Record<string, number> = {};

      actOrders.forEach(ord => {
        const isOrdFoc = ord.is_foc || ord.payment_method === "FOC" || ord.discount_type === "foc";
        (ord.items || []).forEach(it => {
          const sku = it.sku;
          const qty = Number(it.qty || 1);
          if (isOrdFoc || it.is_foc || it.discount_type === "foc") {
            focMap[sku] = (focMap[sku] || 0) + qty;
          } else {
            salesMap[sku] = (salesMap[sku] || 0) + qty;
          }
        });
      });

      const allSkus = Array.from(new Set([
        ...(act.stock_allocated || []).map(it => it.sku),
        ...(act.stock_returned || []).map(it => it.sku),
        ...(act.stock_damaged || []).map(it => it.sku),
        ...Object.keys(salesMap),
        ...Object.keys(focMap)
      ]));

      // Sort SKUs by Brand ID first, then by SKU code
      allSkus.sort((skuA, skuB) => {
        const prodA = posProducts.find(p => p.sku.toLowerCase() === skuA.toLowerCase());
        const prodB = posProducts.find(p => p.sku.toLowerCase() === skuB.toLowerCase());
        const brandA = (prodA?.brand_id || prodA?.brand_name || "").toLowerCase();
        const brandB = (prodB?.brand_id || prodB?.brand_name || "").toLowerCase();
        if (brandA !== brandB) return brandA.localeCompare(brandB);
        return skuA.localeCompare(skuB);
      });

      const tableRows = allSkus.map(sku => {
        const prod = posProducts.find(p => p.sku.toLowerCase() === sku.toLowerCase());
        const prodName = prod?.display_name || "";
        const alloc = (act.stock_allocated || []).find(it => it.sku === sku)?.qty || 0;
        const ret = (act.stock_returned || []).find(it => it.sku === sku)?.qty || 0;
        const dmg = (act.stock_damaged || []).find(it => it.sku === sku)?.qty || 0;
        const sold = salesMap[sku] || (act.stock_sales || []).find(it => it.sku === sku)?.qty || 0;
        const recordedFoc = focMap[sku] || 0;
        const savedFoc = (act.stock_foc || []).find(it => it.sku === sku)?.qty || 0;
        
        // Discrepancy absorbed into Sample: Current Stock (alloc - sold) - Returned to warehouse
        const currentStock = Math.max(0, alloc - sold);
        const sampleFromDiscrepancy = ret > 0 || isClosed ? Math.max(0, currentStock - ret) : 0;
        const effectiveFoc = Math.max(recordedFoc, sampleFromDiscrepancy, savedFoc);

        // Truncate cleanly so product name fits comfortably within the 62mm column
        const truncatedName = prodName.length > 38 ? prodName.substring(0, 36) + "..." : prodName;

        return [
          { content: truncatedName ? `${sku}\n${truncatedName}` : sku },
          String(alloc),
          String(sold),
          String(effectiveFoc),
          String(ret),
          String(dmg)
        ];
      });

      // Generous breathing space before Section 3
      curY += 12;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("3. STOCK ALLOCATION & AUDIT RECONCILIATION", margin, curY);

      autoTable(doc, {
        startY: curY + 3,
        head: [["SKU Code & Product Name", "Allocated\nFloat", "Sales\n(Invoice)", "FOC Sampling\n(Issue)", "Returned\n(Unsold)", "Damaged\n/ Lost"]],
        body: tableRows.length > 0 ? (tableRows as any) : [["No movements recorded", "-", "-", "-", "-", "-"]],
        theme: "plain",
        pageBreak: "auto",
        showHead: "everyPage",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 7.5,
          halign: "center",
          valign: "middle",
          cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
          lineWidth: 0.3,
          lineColor: [0, 0, 0],
          overflow: "linebreak"
        },
        columnStyles: {
          0: { halign: "left", cellWidth: 62 },
          1: { halign: "center", cellWidth: 24 },
          2: { halign: "center", cellWidth: 24 },
          3: { halign: "center", cellWidth: 24 },
          4: { halign: "center", cellWidth: 24 },
          5: { halign: "center", cellWidth: 24 }
        },
        styles: {
          fontSize: 9.5,
          minCellHeight: 9.5,
          cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
          textColor: [0, 0, 0],
          lineWidth: 0.2,
          lineColor: [0, 0, 0]
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 0) {
            const lines = data.cell.text || [];
            if (lines.length > 0) {
              const { doc: cDoc, cell } = data;

              // Clear default autoTable rendering inside cell
              cDoc.setFillColor(255, 255, 255);
              cDoc.rect(cell.x + 0.1, cell.y + 0.1, cell.width - 0.2, cell.height - 0.2, "F");

              // 1. SKU in Bold Pure Black (9.5pt)
              cDoc.setFont("helvetica", "bold");
              cDoc.setFontSize(9.5);
              cDoc.setTextColor(0, 0, 0);
              cDoc.text(lines[0] || "", cell.x + 2, cell.y + 3.8);

              // 2. Product Name in Regular Pure Black (7.5pt)
              if (lines[1]) {
                cDoc.setFont("helvetica", "normal");
                cDoc.setFontSize(7.5);
                cDoc.setTextColor(0, 0, 0);
                cDoc.text(lines[1], cell.x + 2, cell.y + 7.5);
              }
            }
          }
        },
        margin: { left: margin, right: margin }
      });

      // 5. Dynamic Multi-Page Signatures Block
      const lastY = (doc as any).lastAutoTable?.finalY || 160;
      const pageHeight = doc.internal.pageSize.getHeight();
      const neededSigSpace = 34; // mm

      let sigStartY = lastY + 10;
      if (sigStartY + neededSigSpace > pageHeight - margin) {
        doc.addPage();
        sigStartY = margin + 10;
      }

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.line(margin, sigStartY, pageWidth - margin, sigStartY);

      const sigCol1 = margin;
      const sigCol2 = 115;
      const lineY = sigStartY + 14;

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("PREPARED & RECONCILED BY", sigCol1, sigStartY + 4.5);
      doc.text("ADMIN / MANAGEMENT APPROVAL", sigCol2, sigStartY + 4.5);

      // Signature lines
      doc.setDrawColor(0, 0, 0);
      doc.line(sigCol1, lineY, sigCol1 + 65, lineY);
      doc.line(sigCol2, lineY, sigCol2 + 65, lineY);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text(`Name: ${act.closed_by || act.created_by || "Operator"}`, sigCol1, lineY + 5);
      doc.text("Date: ________________________", sigCol1, lineY + 9.5);

      doc.text("Name: ________________________", sigCol2, lineY + 5);
      doc.text("Date: ________________________", sigCol2, lineY + 9.5);

      const totalPages = (doc.internal as any).getNumberOfPages();

      // 6. Rotated DRAFT Watermark if Activation is still ACTIVE
      if (act.status !== "closed") {
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.saveGraphicsState();
          doc.setFont("helvetica", "bold");
          doc.setFontSize(75);
          doc.setTextColor(228, 228, 228); // subtle watermark that doesn't obscure black text
          doc.text("DRAFT", 105, 155, { align: "center", angle: 45 });
          doc.restoreGraphicsState();
        }
      }

      // 7. Page Numbers on all pages (Pure Black)
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(`Page ${i} of ${totalPages} — Activation Audit Report: ${act.id}`, pageWidth / 2, pageHeight - 6, { align: "center" });
      }

      // Open PDF in new tab as Blob URL
      const pdfBlob = doc.output("blob");
      const pdfBlobUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfBlobUrl, "_blank");
    } catch (err: any) {
      console.error("PDF generation error:", err);
      showToast("Failed to generate PDF: " + err.message, "error");
    }
  };

  // Generate & Open PDF Blob for Sales Report (Simple items list for Million system / sales audit entry)
  const handlePrintInvoicePDF = async (act: POSActivation) => {
    try {
      showToast("Generating Sales Report PDF...", "info");
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      // 1. Header (Minimal High-Contrast Design)
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("HSG GLOBAL PTE LTD", margin, 17);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text("EVENT SALES REPORT", margin, 23);

      // Top Right Reference & Date
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`REF: ${act.id}`, pageWidth - margin, 17, { align: "right" });

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const printDateStr = new Date().toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      doc.text(`Date: ${printDateStr}`, pageWidth - margin, 23, { align: "right" });

      // Clean Solid Divider
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, 27, pageWidth - margin, 27);

      // 2. Event Summary Header
      let curY = 34;
      const formatToDDMMYYYY = (dateStr?: string) => {
        if (!dateStr) return "N/A";
        const parts = dateStr.split("-");
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
      };

      const eventDatesStr = act.start_date === act.end_date || !act.end_date 
        ? formatToDDMMYYYY(act.start_date) 
        : `${formatToDDMMYYYY(act.start_date)} to ${formatToDDMMYYYY(act.end_date)}`;

      autoTable(doc, {
        startY: curY,
        theme: "plain",
        styles: {
          cellPadding: { top: 1, bottom: 1, left: 0, right: 0 },
          fontSize: 9,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: "bold" },
          1: { cellWidth: 70 },
          2: { cellWidth: 24, fontStyle: "bold" },
          3: { cellWidth: 62 }
        },
        body: [
          [
            { content: "Event Name:" },
            { content: act.name || "N/A" },
            { content: "Event Dates:" },
            { content: eventDatesStr }
          ],
          [
            { content: "Location:" },
            { content: act.location || "N/A", colSpan: 3 }
          ]
        ],
        margin: { left: margin, right: margin }
      });

      curY = (doc as any).lastAutoTable?.finalY || (curY + 16);

      // 3. Aggregate Sold Items for this Activation
      const actOrders = orders.filter(o => o.activation_id === act.id);
      
      // SKU -> { sku, name, unitPrice, qty, totalAmount }
      const itemMap: Record<string, { sku: string; name: string; unitPrice: number; qty: number; totalAmount: number }> = {};
      
      actOrders.forEach(ord => {
        const isOrdFoc = ord.is_foc || ord.payment_method === "FOC" || ord.discount_type === "foc";
        if (isOrdFoc) return; // Only billed sales items

        (ord.items || []).forEach(it => {
          if (it.is_foc || it.discount_type === "foc") return;
          const sku = it.sku;
          const qty = Number(it.qty || 1);
          const price = Number(it.price || 0);
          const subtotal = Number(it.subtotal || (price * qty));

          if (!itemMap[sku]) {
            const prod = posProducts.find(p => p.sku.toLowerCase() === sku.toLowerCase());
            itemMap[sku] = {
              sku,
              name: it.name || prod?.display_name || sku,
              unitPrice: price,
              qty: 0,
              totalAmount: 0
            };
          }
          itemMap[sku].qty += qty;
          itemMap[sku].totalAmount += subtotal;
        });
      });

      // Sort by SKU
      const sortedItems = Object.values(itemMap).sort((a, b) => a.sku.localeCompare(b.sku));

      let grandTotalQty = 0;
      let grandTotalAmount = 0;

      const invoiceRows = sortedItems.map(item => {
        grandTotalQty += item.qty;
        grandTotalAmount += item.totalAmount;
        // Average unit price if varied
        const unitPrice = item.qty > 0 ? (item.totalAmount / item.qty) : item.unitPrice;

        return [
          item.sku,
          item.name,
          `$${unitPrice.toFixed(2)}`,
          String(item.qty),
          `$${item.totalAmount.toFixed(2)}`
        ];
      });

      // Append Grand Total Row
      if (invoiceRows.length > 0) {
        invoiceRows.push([
          { content: "TOTAL", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } } as any,
          { content: String(grandTotalQty), styles: { halign: "center", fontStyle: "bold" } } as any,
          { content: `$${grandTotalAmount.toFixed(2)}`, styles: { halign: "right", fontStyle: "bold" } } as any
        ]);
      }

      curY += 6;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("SALES ITEMS SUMMARY", margin, curY);

      autoTable(doc, {
        startY: curY + 3,
        head: [["SKU", "Description", "Amount", "Qty", "Total Amount"]],
        body: invoiceRows.length > 0 ? invoiceRows : [["-", "No sales orders recorded", "-", "-", "-"]],
        theme: "plain",
        pageBreak: "auto",
        showHead: "everyPage",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "left",
          valign: "middle",
          cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          lineWidth: 0.3,
          lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { halign: "left", cellWidth: 32, fontStyle: "bold" },
          1: { halign: "left", cellWidth: 80 },
          2: { halign: "right", cellWidth: 24 },
          3: { halign: "center", cellWidth: 20 },
          4: { halign: "right", cellWidth: 26 }
        },
        styles: {
          fontSize: 9,
          cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          textColor: [0, 0, 0],
          lineWidth: 0.2,
          lineColor: [0, 0, 0]
        },
        margin: { left: margin, right: margin }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || curY + 30;

      // Remarks note
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(0, 0, 0);
      doc.text("* This document is an itemized sales report generated from POS event activation transactions.", margin, finalY + 8);

      // Page numbers
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(`Page ${i} of ${totalPages} — Sales Report: ${act.id}`, pageWidth / 2, pageHeight - 6, { align: "center" });
      }

      // Open PDF Blob
      const pdfBlob = doc.output("blob");
      const pdfBlobUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfBlobUrl, "_blank");
    } catch (err: any) {
      console.error("Sales Report PDF generation error:", err);
      showToast("Failed to generate Sales Report PDF: " + err.message, "error");
    }
  };

  // Generate & Open PDF Blob for Sample Report (Items list with quantity only, no amount / $0)
  const handlePrintSamplePDF = async (act: POSActivation) => {
    try {
      showToast("Generating Sample Report PDF...", "info");
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 14;

      // 1. Header (Minimal High-Contrast Design)
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("HSG GLOBAL PTE LTD", margin, 17);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text("EVENT SAMPLE REPORT", margin, 23);

      // Top Right Reference & Date
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`REF: ${act.id}`, pageWidth - margin, 17, { align: "right" });

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const printDateStr = new Date().toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      doc.text(`Date: ${printDateStr}`, pageWidth - margin, 23, { align: "right" });

      // Clean Solid Divider
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, 27, pageWidth - margin, 27);

      // 2. Event Summary Header
      let curY = 34;
      const formatToDDMMYYYY = (dateStr?: string) => {
        if (!dateStr) return "N/A";
        const parts = dateStr.split("-");
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return dateStr;
      };

      const eventDatesStr = act.start_date === act.end_date || !act.end_date 
        ? formatToDDMMYYYY(act.start_date) 
        : `${formatToDDMMYYYY(act.start_date)} to ${formatToDDMMYYYY(act.end_date)}`;

      autoTable(doc, {
        startY: curY,
        theme: "plain",
        styles: {
          cellPadding: { top: 1, bottom: 1, left: 0, right: 0 },
          fontSize: 9,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: "bold" },
          1: { cellWidth: 70 },
          2: { cellWidth: 24, fontStyle: "bold" },
          3: { cellWidth: 62 }
        },
        body: [
          [
            { content: "Event Name:" },
            { content: act.name || "N/A" },
            { content: "Event Dates:" },
            { content: eventDatesStr }
          ],
          [
            { content: "Location:" },
            { content: act.location || "N/A", colSpan: 3 }
          ]
        ],
        margin: { left: margin, right: margin }
      });

      curY = (doc as any).lastAutoTable?.finalY || (curY + 16);

      // 3. Aggregate Sample Items for this Activation:
      // - FOC inside POS
      // - Current Stock minus Stock Return to Warehouse (lost/damaged absorbed into Sample)
      const actOrders = orders.filter(o => o.activation_id === act.id);
      const sampleMap: Record<string, { sku: string; name: string; qty: number }> = {};

      // A. Count FOC transactions inside POS
      actOrders.forEach(ord => {
        const isOrdFoc = ord.is_foc || ord.payment_method === "FOC" || ord.discount_type === "foc";
        (ord.items || []).forEach(it => {
          if (!isOrdFoc && !it.is_foc && it.discount_type !== "foc") return;
          const sku = it.sku;
          const qty = Number(it.qty || 1);
          if (!sampleMap[sku]) {
            const prod = posProducts.find(p => p.sku.toLowerCase() === sku.toLowerCase());
            sampleMap[sku] = {
              sku,
              name: it.name || prod?.display_name || sku,
              qty: 0
            };
          }
          sampleMap[sku].qty += qty;
        });
      });

      // B. Count non-FOC billed Sales to derive Current Stock remaining before return
      const billedSalesMap: Record<string, number> = {};
      actOrders.forEach(ord => {
        const isOrdFoc = ord.is_foc || ord.payment_method === "FOC" || ord.discount_type === "foc";
        if (isOrdFoc) return;
        (ord.items || []).forEach(it => {
          if (it.is_foc || it.discount_type === "foc") return;
          const sku = it.sku;
          const qty = Number(it.qty || 1);
          billedSalesMap[sku] = (billedSalesMap[sku] || 0) + qty;
        });
      });

      // C. Reconcile with Allocated & Returned stock (Absorb discrepancy into Sample)
      const allAllocatedSkus = new Set([
        ...(act.stock_allocated || []).map(it => it.sku),
        ...(act.stock_returned || []).map(it => it.sku),
        ...(act.stock_foc || []).map(it => it.sku)
      ]);

      allAllocatedSkus.forEach(sku => {
        const alloc = (act.stock_allocated || []).find(it => it.sku === sku)?.qty || 0;
        const returned = (act.stock_returned || []).find(it => it.sku === sku)?.qty || 0;
        const billedSold = billedSalesMap[sku] || (act.stock_sales || []).find(it => it.sku === sku)?.qty || 0;
        const recordedFoc = sampleMap[sku]?.qty || 0;

        // Current Stock = Allocated - Billed Sales
        const currentStock = Math.max(0, alloc - billedSold);
        // Sample count from discrepancy = Current Stock - Stock Return to Warehouse
        const sampleFromDiscrepancy = Math.max(0, currentStock - returned);

        // If saved stock_foc exists from closed activation, compare with saved record
        const savedFoc = (act.stock_foc || []).find(it => it.sku === sku)?.qty || 0;
        const effectiveSample = Math.max(recordedFoc, sampleFromDiscrepancy, savedFoc);

        if (effectiveSample > 0) {
          if (!sampleMap[sku]) {
            const prod = posProducts.find(p => p.sku.toLowerCase() === sku.toLowerCase());
            sampleMap[sku] = {
              sku,
              name: prod?.display_name || sku,
              qty: effectiveSample
            };
          } else {
            sampleMap[sku].qty = effectiveSample;
          }
        }
      });

      // Sort by SKU
      const sortedSamples = Object.values(sampleMap).filter(s => s.qty > 0).sort((a, b) => a.sku.localeCompare(b.sku));

      let grandTotalQty = 0;
      const sampleRows = sortedSamples.map(item => {
        grandTotalQty += item.qty;
        return [
          item.sku,
          item.name,
          String(item.qty)
        ];
      });

      // Append Grand Total Row
      if (sampleRows.length > 0) {
        sampleRows.push([
          { content: "TOTAL SAMPLE QUANTITY", colSpan: 2, styles: { halign: "right", fontStyle: "bold" } } as any,
          { content: String(grandTotalQty), styles: { halign: "center", fontStyle: "bold" } } as any
        ]);
      }

      curY += 6;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("SAMPLE ITEMS SUMMARY", margin, curY);

      autoTable(doc, {
        startY: curY + 3,
        head: [["SKU", "Description", "Qty"]],
        body: sampleRows.length > 0 ? sampleRows : [["-", "No sample items recorded", "-"]],
        theme: "plain",
        pageBreak: "auto",
        showHead: "everyPage",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "left",
          valign: "middle",
          cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          lineWidth: 0.3,
          lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { halign: "left", cellWidth: 40, fontStyle: "bold" },
          1: { halign: "left", cellWidth: 112 },
          2: { halign: "center", cellWidth: 30 }
        },
        styles: {
          fontSize: 9,
          cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          textColor: [0, 0, 0],
          lineWidth: 0.2,
          lineColor: [0, 0, 0]
        },
        margin: { left: margin, right: margin }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || curY + 30;

      // Remarks note
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(0, 0, 0);
      doc.text("* This document is an itemized sample / tester report generated from POS event activation transactions.", margin, finalY + 8);

      // Page numbers
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(`Page ${i} of ${totalPages} — Sample Report: ${act.id}`, pageWidth / 2, pageHeight - 6, { align: "center" });
      }

      // Open PDF Blob
      const pdfBlob = doc.output("blob");
      const pdfBlobUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfBlobUrl, "_blank");
    } catch (err: any) {
      console.error("Sample Report PDF generation error:", err);
      showToast("Failed to generate Sample Report PDF: " + err.message, "error");
    }
  };

  // Generate & Open PDF Blob for Single Order Sales Slip
  const handlePrintOrderInvoicePDF = async (order: POSOrder) => {
    try {
      showToast("Generating Sales Order Slip PDF...", "info");
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 14;

      // Header
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("HSG GLOBAL PTE LTD", margin, 17);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.text("SALES ORDER REPORT", margin, 23);

      // Ref & Date
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`ORDER REF: ${order.id}`, pageWidth - margin, 17, { align: "right" });

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const dateStr = new Date(Number(order.created_at)).toLocaleString("en-SG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      doc.text(`Date: ${dateStr}`, pageWidth - margin, 23, { align: "right" });

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, 27, pageWidth - margin, 27);

      // Metadata summary
      let curY = 34;
      autoTable(doc, {
        startY: curY,
        theme: "plain",
        styles: {
          cellPadding: { top: 1, bottom: 1, left: 0, right: 0 },
          fontSize: 9,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 26, fontStyle: "bold" },
          1: { cellWidth: 70 },
          2: { cellWidth: 26, fontStyle: "bold" },
          3: { cellWidth: 60 }
        },
        body: [
          [
            { content: "Order ID:" },
            { content: order.id },
            { content: "Cashier:" },
            { content: order.cashier_name || "N/A" }
          ],
          [
            { content: "Payment Mode:" },
            { content: order.payment_method + (order.ref_code ? ` (Ref: ${order.ref_code})` : "") },
            { content: "Activation ID:" },
            { content: order.activation_id || "-" }
          ]
        ],
        margin: { left: margin, right: margin }
      });

      curY = (doc as any).lastAutoTable?.finalY || (curY + 16);

      // Items Table: SKU, Description, Amount, Qty, Total Amount
      let totalQty = 0;
      let grandTotal = 0;

      const itemsRows = (order.items || []).map(it => {
        const qty = Number(it.qty || 1);
        const price = Number(it.price || 0);
        const lineTotal = it.is_foc ? 0 : Number(it.subtotal || (price * qty));
        totalQty += qty;
        grandTotal += lineTotal;

        return [
          it.sku,
          it.name,
          it.is_foc ? "FOC" : `$${price.toFixed(2)}`,
          String(qty),
          it.is_foc ? "$0.00" : `$${lineTotal.toFixed(2)}`
        ];
      });

      if (itemsRows.length > 0) {
        itemsRows.push([
          { content: "TOTAL", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } } as any,
          { content: String(totalQty), styles: { halign: "center", fontStyle: "bold" } } as any,
          { content: `$${Number(order.total_amount || grandTotal).toFixed(2)}`, styles: { halign: "right", fontStyle: "bold" } } as any
        ]);
      }

      curY += 6;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("PURCHASED ITEMS", margin, curY);

      autoTable(doc, {
        startY: curY + 3,
        head: [["SKU", "Description", "Amount", "Qty", "Total Amount"]],
        body: itemsRows.length > 0 ? itemsRows : [["-", "No items recorded", "-", "-", "-"]],
        theme: "plain",
        pageBreak: "auto",
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "left",
          valign: "middle",
          cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          lineWidth: 0.3,
          lineColor: [0, 0, 0]
        },
        columnStyles: {
          0: { halign: "left", cellWidth: 32, fontStyle: "bold" },
          1: { halign: "left", cellWidth: 80 },
          2: { halign: "right", cellWidth: 24 },
          3: { halign: "center", cellWidth: 20 },
          4: { halign: "right", cellWidth: 26 }
        },
        styles: {
          fontSize: 9,
          cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
          textColor: [0, 0, 0],
          lineWidth: 0.2,
          lineColor: [0, 0, 0]
        },
        margin: { left: margin, right: margin }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || curY + 30;

      // Remarks note
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(0, 0, 0);
      doc.text("* This document is an itemized sales order report generated from POS event transactions.", margin, finalY + 8);

      // Open PDF Blob
      const pdfBlob = doc.output("blob");
      const pdfBlobUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfBlobUrl, "_blank");
    } catch (err: any) {
      console.error("Order sales report PDF generation error:", err);
      showToast("Failed to generate Sales Report PDF: " + err.message, "error");
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

  // Open Photo Receipt Upload Modal
  const handleOpenReceiptUpload = (order: POSOrder) => {
    setReceiptUploadOrder(order);
    setReceiptRawImage(order.proof_photo_url || null);
    setReceiptRotation(0);
    setReceiptCropBox({ x: 0, y: 0, width: 100, height: 100 });
  };

  // Handle Receipt File Input Selection
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file (JPG, PNG, WebP)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptRawImage(event.target?.result as string);
      setReceiptRotation(0);
      setReceiptCropBox({ x: 0, y: 0, width: 100, height: 100 });
    };
    reader.readAsDataURL(file);
  };

  // Process & Upload Cropped / Rotated Receipt to Storage and Link to Order
  const handleSaveReceiptPhoto = async () => {
    if (!receiptUploadOrder || !receiptRawImage) {
      showToast("Please select a photo receipt to upload", "warning");
      return;
    }

    setIsUploadingReceipt(true);
    try {
      // Create an image object to draw onto canvas with rotation & cropping
      const img = new window.Image();
      img.src = receiptRawImage;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context creation failed");

      const rad = (receiptRotation % 360) * (Math.PI / 180);
      const isSwapped = (receiptRotation / 90) % 2 !== 0;
      
      const rotatedWidth = isSwapped ? img.naturalHeight : img.naturalWidth;
      const rotatedHeight = isSwapped ? img.naturalWidth : img.naturalHeight;

      // Apply crop percentages to rotated dimensions
      const cropX = (receiptCropBox.x / 100) * rotatedWidth;
      const cropY = (receiptCropBox.y / 100) * rotatedHeight;
      const cropW = Math.max(10, (receiptCropBox.width / 100) * rotatedWidth);
      const cropH = Math.max(10, (receiptCropBox.height / 100) * rotatedHeight);

      // We render the rotated image to an offscreen full-rotation canvas first
      const rotCanvas = document.createElement("canvas");
      rotCanvas.width = rotatedWidth;
      rotCanvas.height = rotatedHeight;
      const rotCtx = rotCanvas.getContext("2d")!;

      rotCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
      rotCtx.rotate(rad);
      rotCtx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      // Now crop into destination canvas
      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      // Compress to high-quality JPEG
      const finalDataUrl = canvas.toDataURL("image/jpeg", 0.90);
      const base64Data = finalDataUrl.split(",")[1];

      // 1. Upload to Storage
      const fileName = `receipt_${receiptUploadOrder.id}_${Date.now()}.jpg`;
      const uploadRes = await fetch(`${WORKER_URL}/api/pos/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          base64Data,
          contentType: "image/jpeg",
          folder: "pos-receipts"
        })
      });

      if (!uploadRes.ok) throw new Error(await uploadRes.text());
      const uploadJson = await uploadRes.json();
      if (!uploadJson.success || !uploadJson.url) {
        throw new Error(uploadJson.error || "Storage upload failed");
      }

      const uploadedUrl = uploadJson.url;

      // 2. Link proof photo URL to order in Supabase
      const attachRes = await fetch(`${WORKER_URL}/api/pos/orders/upload-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: receiptUploadOrder.id,
          proof_photo_url: uploadedUrl,
          uploaded_by: profile?.name || "Operator"
        })
      });

      if (!attachRes.ok) throw new Error(await attachRes.text());
      const attachJson = await attachRes.json();
      if (!attachJson.success) throw new Error(attachJson.error || "Failed to link receipt proof to order");

      showToast(`Payment receipt attached successfully for order ${receiptUploadOrder.id}!`, "success");
      setReceiptUploadOrder(null);
      setReceiptRawImage(null);
      loadAllData();
    } catch (err: any) {
      console.error("Receipt upload error:", err);
      showToast("Receipt upload failed: " + err.message, "error");
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Handle Save Payment & QR Settings
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(posSettings)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save POS settings");

      showToast("Payment & QR settings updated successfully!", "success");
    } catch (err: any) {
      showToast("Failed to save settings: " + err.message, "error");
    } finally {
      setSettingsSaving(false);
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
            {activeTab === "activations"
              ? "Event Activations & Roadshows"
              : posSubTab === "catalog" 
                ? "POS Catalog & Allocated Stock" 
                : posSubTab === "pricerules"
                  ? "Price Rules & Brand Mix/Match"
                  : posSubTab === "transactions"
                    ? (transactionSubTab === "sales" ? "Sales & Orders Ledger" : "Voided Transactions Audit")
                    : "POS & Customer Display Settings"}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeTab === "activations"
              ? "Manage event roadshows, allocate stocks, track staff & FOC reason, and reconcile returns to Manage Stock."
              : posSubTab === "catalog" 
                ? "Explicitly add products to POS, set selling prices, and allocate/deduct retail stock."
                : posSubTab === "pricerules"
                  ? "Configure automatic bundle pricing (e.g. Any 5 Hausboom items for $3.00) across all SKUs under the same brand."
                  : posSubTab === "transactions"
                    ? (transactionSubTab === "sales" 
                        ? "Audit cashier checkout transactions, payment records (Cash, QR, Bank Transfer), and export reports."
                        : "Audit trail of cancelled or voided cashier sales transactions.")
                    : "Configure Customer Display idle ad media (video/photo), Universal QR code, PayNow UEN, and bank transfer credentials."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "activations" && (
            <button
              type="button"
              onClick={() => {
                setNewActName("");
                setNewActLocation("");
                setNewActStartDate(new Date().toISOString().split("T")[0]);
                setNewActEndDate(new Date().toISOString().split("T")[0]);
                setNewActFocDesc("");
                setNewActParticipants([]);
                setNewActAllocatedItems([{ sku: "", qty: "" }]);
                setIsCreateActModalOpen(true);
              }}
              className="px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Activation
            </button>
          )}

          {activeTab === "pos_terminal" && posSubTab === "settings" && (
            <button
              onClick={() => handleSaveSettings()}
              disabled={settingsSaving}
              className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {settingsSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Settings
            </button>
          )}

          {activeTab === "pos_terminal" && posSubTab === "catalog" && (
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

          {activeTab === "pos_terminal" && posSubTab === "pricerules" && (
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
              Create Price Rule
            </button>
          )}

          {activeTab === "pos_terminal" && posSubTab === "transactions" && transactionSubTab === "sales" && (
            <button
              onClick={handleExportExcel}
              disabled={filteredOrders.length === 0}
              className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Export Excel
            </button>
          )}

          {activeTab === "pos_terminal" && (
            <a
              href="/pos"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-800 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#0B57D0]" />
              Open POS Terminal
            </a>
          )}
        </div>
      </div>

      {/* POS Sub-Tabs Bar (When POS Terminal is active) */}
      {activeTab === "pos_terminal" && (
        <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setPosSubTab("catalog")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              posSubTab === "catalog"
                ? "bg-[#0B57D0] text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-slate-100"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>POS Catalog &amp; Stock</span>
          </button>
          <button
            type="button"
            onClick={() => setPosSubTab("pricerules")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              posSubTab === "pricerules"
                ? "bg-[#0B57D0] text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-slate-100"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Price Rule</span>
          </button>
          <button
            type="button"
            onClick={() => setPosSubTab("transactions")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              posSubTab === "transactions"
                ? "bg-[#0B57D0] text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-slate-100"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Transactions</span>
          </button>
          <button
            type="button"
            onClick={() => setPosSubTab("settings")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              posSubTab === "settings"
                ? "bg-[#0B57D0] text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-slate-100"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      )}

      {/* 3. Tab Specific Render */}
      {activeTab === "activations" ? (
        /* Event Activations Tab */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Activations Table */}
          <div className="flex-1 overflow-auto min-h-0">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-[#F0F4F9] sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px]">Activation Name &amp; Details</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-48">Event Date(s)</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-28">Status</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-zinc-700 uppercase tracking-wider text-[11px] w-52">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {activations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-16 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#0B57D0]">
                          <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-zinc-800">No Event Activations created yet</p>
                          <p className="text-xs text-zinc-400 mt-0.5">Create sessions for roadshows, allocate stocks, track staff &amp; FOC reasons, and reconcile returns.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewActName("");
                            setNewActLocation("");
                            setNewActStartDate(new Date().toISOString().split("T")[0]);
                            setNewActEndDate(new Date().toISOString().split("T")[0]);
                            setNewActFocDesc("");
                            setNewActParticipants([]);
                            setNewActAllocatedItems([{ sku: "", qty: "" }]);
                            setIsCreateActModalOpen(true);
                          }}
                          className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create First Activation</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activations.map((act) => {
                    const isClosed = act.status === "closed";
                    const todayStr = new Date().toISOString().split("T")[0];
                    const isEnded = !act.end_date || todayStr >= act.end_date;
                    const formatToDDMMYYYY = (dateStr?: string) => {
                      if (!dateStr) return "N/A";
                      const parts = dateStr.split("-");
                      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                      return dateStr;
                    };
                    const staffCount = Array.isArray(act.participants) ? act.participants.length : 0;

                    return (
                      <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-zinc-400 font-semibold tracking-tight">{act.id}</span>
                              {act.use_pos !== false ? (
                                <span className="px-1.5 py-0.2 bg-blue-50 text-[#0B57D0] border border-blue-200 rounded text-[9px] font-bold">POS Terminal</span>
                              ) : (
                                <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[9px] font-bold">Sampling Only (No POS)</span>
                              )}
                            </div>
                            <span className="font-bold text-sm text-zinc-900 leading-tight">{act.name}</span>
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                              {act.location ? (
                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                                  <span>{act.location}</span>
                                </span>
                              ) : null}

                              {/* (qty) Staff Join Button */}
                              <button
                                type="button"
                                onClick={() => setViewingStaffAct(act)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 hover:border-[#0B57D0]/40 bg-slate-50 hover:bg-blue-50 text-[#0B57D0] text-[11px] font-semibold transition-all cursor-pointer shadow-2xs select-none"
                                title="Click to view joined staff roster"
                              >
                                <Users className="w-3 h-3 text-[#0B57D0]" />
                                <span>({staffCount}) Staff Join</span>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-zinc-700 font-medium whitespace-nowrap">
                          {act.start_date === act.end_date || !act.end_date ? (
                            <span>{formatToDDMMYYYY(act.start_date)}</span>
                          ) : (
                            <span>{formatToDDMMYYYY(act.start_date)} → {formatToDDMMYYYY(act.end_date)}</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                          {isClosed ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-slate-100 text-zinc-600 border-slate-300">
                              CLOSED
                            </span>
                          ) : isEnded ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                              PENDING RECONCILIATION
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Activation (Active only) */}
                            {!isClosed && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditActivation(act)}
                                className="h-8 px-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all flex items-center gap-1 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                                title="Edit Activation Details"
                              >
                                <Pencil className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                <span>Edit</span>
                              </button>
                            )}

                            {/* Delete Activation (Active only) */}
                            {!isClosed && (
                              <button
                                type="button"
                                onClick={() => setDeletingAct(act)}
                                className="h-8 w-8 border border-slate-200 bg-white hover:bg-red-50 text-zinc-400 hover:text-red-600 font-semibold text-xs rounded-lg transition-all flex items-center justify-center shadow-xs cursor-pointer shrink-0"
                                title="Delete Activation"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              </button>
                            )}

                            {/* Report Buttons - Appear after event date has finished or when closed */}
                            {(isEnded || isClosed) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handlePrintInvoicePDF(act)}
                                  className="h-8 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                                  title="Print Sales Report"
                                >
                                  <FileText className="w-3.5 h-3.5 text-[#0B57D0] shrink-0" />
                                  <span>Sales Report</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintSamplePDF(act)}
                                  className="h-8 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                                  title="Print Sample Report (Tester & FOC items with Qty)"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <span>Sample Report</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrintReport(act)}
                                  className="h-8 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                                  title="Print Audit Report"
                                >
                                  <Printer className="w-3.5 h-3.5 text-[#0B57D0] shrink-0" />
                                  <span>Report</span>
                                </button>
                              </>
                            )}

                            {/* Close Activation Button - At very end of row actions */}
                            {!isClosed && (
                              isEnded ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCloseModal(act)}
                                  className="h-8 px-3 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                                  title="Close & Reconcile Activation"
                                >
                                  <Lock className="w-3.5 h-3.5 shrink-0" />
                                  <span>Close Activation</span>
                                </button>
                              ) : (
                                <span
                                  className="h-8 px-2.5 bg-slate-100 border border-slate-200 text-zinc-400 font-semibold text-[11px] rounded-lg flex items-center gap-1 cursor-not-allowed shrink-0 select-none"
                                  title={`Cannot close until event ends on ${formatToDDMMYYYY(act.end_date)}`}
                                >
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span>In Progress</span>
                                </span>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "pos_terminal" && posSubTab === "catalog" ? (
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
      ) : activeTab === "pos_terminal" && posSubTab === "pricerules" ? (
        /* Price Rule (Brand Mix & Match Promos) */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Filter Toolbar */}
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Tag className="w-3.5 h-3.5 text-[#0B57D0]" />
              <span>Active Price Rules: <strong className="text-zinc-900 font-bold">{brandPromos.length}</strong></span>
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
                  <th className="px-3.5 py-2.5 text-left font-bold text-zinc-700 uppercase tracking-wider text-[11px]">Promo Rule &amp; Value</th>
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
                          <p className="font-bold text-sm text-zinc-800">No Price Rules configured yet</p>
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
                          <span>Create First Price Rule</span>
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
      ) : activeTab === "pos_terminal" && posSubTab === "transactions" ? (
        /* Unified Transactions Tab (with Sales / Void Sub-tabs) */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          
          {/* Sub-Tabs Bar */}
          <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setTransactionSubTab("sales")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  transactionSubTab === "sales"
                    ? "bg-white text-[#0B57D0] shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Sales Orders ({orders.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTransactionSubTab("void")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  transactionSubTab === "void"
                    ? "bg-white text-red-600 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Ban className="w-3.5 h-3.5 text-red-500" />
                <span>Voided Transactions ({voidOrders.length})</span>
              </button>
            </div>

            <span className="text-xs text-zinc-500">
              Showing <strong className="text-zinc-900">{transactionSubTab === "sales" ? filteredOrders.length : filteredVoidOrders.length}</strong> {transactionSubTab === "sales" ? "orders" : "voided records"}
            </span>
          </div>

          {/* SUB-TAB 1: SALES ORDERS */}
          {transactionSubTab === "sales" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Ultra Clean Compact Metrics & Filter Bar */}
              <div className="px-4 py-2 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Minimal Inline KPIs */}
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] text-zinc-500 uppercase tracking-tight">Sales:</span>
                    <span className="font-mono font-bold text-zinc-900 text-sm">${ledgerMetrics.totalSales.toFixed(2)}</span>
                  </div>
                  <div className="h-3.5 w-px bg-slate-300" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] text-zinc-500 uppercase tracking-tight">Orders:</span>
                    <span className="font-mono font-bold text-zinc-900 text-sm">{ledgerMetrics.totalOrders}</span>
                  </div>
                  <div className="h-3.5 w-px bg-slate-300" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] text-zinc-500 uppercase tracking-tight">Items:</span>
                    <span className="font-mono font-bold text-zinc-900 text-sm">{ledgerMetrics.totalItems} pcs</span>
                  </div>
                  <div className="h-3.5 w-px bg-slate-300" />
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] text-zinc-500 uppercase tracking-tight">Discounts:</span>
                    <span className="font-mono font-bold text-zinc-700 text-sm">${ledgerMetrics.totalDiscount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Compact Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search ID, Cashier..."
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-[#0B57D0]"
                    />
                  </div>

                  <select
                    value={ledgerPayment}
                    onChange={(e) => setLedgerPayment(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs text-zinc-700 focus:outline-hidden"
                  >
                    <option value="all">All Modes</option>
                    <option value="Cash">Cash</option>
                    <option value="QR">QR</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="FOC">FOC</option>
                  </select>

                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-1.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-zinc-700"
                    />
                    <span>-</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-1.5 py-1 bg-white border border-slate-200 rounded-md text-xs text-zinc-700"
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
                      className="text-xs text-zinc-500 hover:text-zinc-800 underline font-medium transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Orders Table */}
              <div className="flex-1 overflow-auto min-h-0">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-[#F0F4F9] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5 text-left font-semibold text-zinc-600 uppercase tracking-wider text-[11px] w-44">Order &amp; Activation</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold text-zinc-600 uppercase tracking-wider text-[11px] w-36">Date &amp; Time</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold text-zinc-600 uppercase tracking-wider text-[11px] w-32">Cashier</th>
                      <th className="px-3.5 py-2.5 text-right font-semibold text-zinc-600 uppercase tracking-wider text-[11px] w-24">Subtotal</th>
                      <th className="px-3.5 py-2.5 text-right font-semibold text-zinc-600 uppercase tracking-wider text-[11px] w-24">Discount</th>
                      <th className="px-3.5 py-2.5 text-right font-semibold text-zinc-600 uppercase tracking-wider text-[11px] w-28">Total Paid</th>
                      <th className="px-3.5 py-2.5 text-center font-semibold text-zinc-600 uppercase tracking-wider text-[11px] w-32">Payment Mode</th>
                      <th className="px-3.5 py-2.5 text-center font-semibold text-zinc-600 uppercase tracking-wider text-[11px] w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-16 text-center text-zinc-400 italic">
                          No sales transactions found for selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => {
                        return (
                          <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3.5 py-2 whitespace-nowrap">
                              <div className="flex flex-col leading-tight">
                                <span className="font-mono font-medium text-zinc-800 text-xs">{o.id}</span>
                                {o.activation_id ? (
                                  <span className="text-[10px] font-mono text-zinc-500 font-normal">{o.activation_id}</span>
                                ) : (
                                  <span className="text-[10px] font-mono text-zinc-300">-</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3.5 py-2 text-zinc-600 font-normal whitespace-nowrap">
                              {new Date(Number(o.created_at)).toLocaleString("en-SG", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </td>
                            <td className="px-3.5 py-2 text-zinc-700 font-medium whitespace-nowrap">{o.cashier_name}</td>
                            <td className="px-3.5 py-2 text-right font-mono text-zinc-600 whitespace-nowrap">${Number(o.subtotal).toFixed(2)}</td>
                            <td className="px-3.5 py-2 text-right font-mono text-zinc-500 whitespace-nowrap">
                              {Number(o.discount_amount || 0) > 0 ? `-$${Number(o.discount_amount).toFixed(2)}` : "-"}
                            </td>
                            <td className="px-3.5 py-2 text-right font-mono font-semibold text-zinc-900 whitespace-nowrap">${Number(o.total_amount).toFixed(2)}</td>
                            <td className="px-3.5 py-2 text-center whitespace-nowrap">
                              {(() => {
                                const isQrOrTransfer = ["QR", "Transfer Bank", "PayNow", "Bank Transfer"].includes(o.payment_method);
                                const hasProof = !!o.proof_photo_url;

                                return (
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => isQrOrTransfer && handleOpenReceiptUpload(o)}
                                      className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 transition-all ${
                                        o.is_foc || o.payment_method === "FOC" 
                                          ? "bg-purple-50/70 text-purple-700 border-purple-200"
                                          : isQrOrTransfer
                                            ? (hasProof 
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold cursor-pointer hover:bg-emerald-100" 
                                                : "bg-amber-50 text-amber-700 border-amber-300 font-semibold cursor-pointer hover:bg-amber-100")
                                            : "bg-slate-50 text-zinc-700 border-slate-200"
                                      }`}
                                      title={isQrOrTransfer ? (hasProof ? "Payment receipt verified & uploaded (Click to view/change)" : "Missing photo receipt proof (Click to upload)") : o.payment_method}
                                    >
                                      {hasProof && (
                                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                      )}
                                      <span>{o.is_foc ? "FOC" : o.payment_method}</span>
                                    </button>
                                    {o.ref_code && (
                                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#0B57D0] border border-blue-200 font-mono font-semibold text-[10px]" title={`Payment Ref: ${o.ref_code}`}>
                                        {o.ref_code}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-3.5 py-2 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                {["QR", "Transfer Bank", "PayNow", "Bank Transfer"].includes(o.payment_method) && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReceiptUpload(o)}
                                    className={`p-1 rounded transition-all cursor-pointer ${
                                      o.proof_photo_url 
                                        ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                                        : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    }`}
                                    title={o.proof_photo_url ? "View / Replace Receipt Proof Photo" : "Upload Payment Receipt Photo"}
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handlePrintOrderInvoicePDF(o)}
                                  className="p-1 text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-100 rounded transition-all cursor-pointer"
                                  title="Print Sales Order Report"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViewingOrder(o)}
                                  className="p-1 text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-100 rounded transition-all cursor-pointer"
                                  title="View Items & Receipt Details"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingOrder(o);
                                    setDeleteOrderRestoreStock(true);
                                  }}
                                  className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                                  title="Delete Transaction"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: VOIDED TRANSACTIONS */}
          {transactionSubTab === "void" && (
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

        </div>
      ) : activeTab === "pos_terminal" && posSubTab === "settings" ? (
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-[#F8F9FA]">
          <form onSubmit={handleSaveSettings} className="w-full flex flex-col gap-6">
            
            {/* Top Info Banner with Open Display Screen Button */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <QrCode className="w-5 h-5 text-[#0B57D0] shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-700 leading-relaxed">
                  <p className="font-bold text-[#0B57D0] mb-0.5">Universal Static QR &amp; Payment Configuration</p>
                  <p>
                    Configure the company&apos;s static PayNow / Universal QR code and bank account information.
                    These details will be rendered directly on the <strong>Customer-Facing Dual Display</strong> (<code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[11px] text-blue-900">/pos/display</code>) and in the cashier checkout modal for direct transfers.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.open("/pos/display", "_blank", "width=1200,height=800")}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#0B57D0] border border-blue-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Open Display Screen
              </button>
            </div>

            {/* 2-Column Responsive Desktop Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              {/* COLUMN 1: Customer Display Idle Media (Photos / Video) */}
              <div className="flex flex-col gap-5">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4 text-[#0B57D0]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">Customer Display Idle Media</h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-blue-50 text-[#0B57D0] border border-blue-200 text-[10px] font-bold">
                      Full-Screen Idle Screen
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    When the POS is idle (empty cart), the customer screen automatically displays this media in <strong>edge-to-edge full screen</strong> (no header, no borders). When items are scanned, the media smoothly shrinks to the left while the live cart appears on the right.
                  </p>

                  {/* Mode Selector: Photo Slideshow vs Single Video Loop */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Display Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPosSettings({ ...posSettings, ad_mode: "photos" })}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          posSettings.ad_mode === "photos"
                            ? "bg-[#0B57D0] text-white border-[#0B57D0] shadow-xs"
                            : "bg-white border-slate-200 text-zinc-700 hover:bg-slate-50"
                        }`}
                      >
                        <ImageIcon className="w-4 h-4" />
                        Photo Slideshow (Max 10)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPosSettings({ ...posSettings, ad_mode: "video" })}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                          posSettings.ad_mode === "video"
                            ? "bg-[#0B57D0] text-white border-[#0B57D0] shadow-xs"
                            : "bg-white border-slate-200 text-zinc-700 hover:bg-slate-50"
                        }`}
                      >
                        <Video className="w-4 h-4" />
                        1 Looped Video
                      </button>
                    </div>
                  </div>

                  {/* PHOTO SLIDESHOW MODE */}
                  {posSettings.ad_mode === "photos" && (
                    <div className="flex flex-col gap-4 p-4 bg-[#F8F9FA] rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900">Slideshow Photos ({posSettings.ad_slides?.length || 0} / 10)</h4>
                          <p className="text-[11px] text-zinc-500">Upload high-resolution promotional banners or posters</p>
                        </div>

                        {/* Add Photo Button */}
                        <label className={`px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs ${
                          uploadingSlide || (posSettings.ad_slides?.length || 0) >= 10 ? "opacity-50 pointer-events-none" : ""
                        }`}>
                          {uploadingSlide ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          <span>Upload Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={uploadingSlide || (posSettings.ad_slides?.length || 0) >= 10}
                            className="hidden"
                            onChange={async (e) => {
                              const files = e.target.files;
                              if (!files || files.length === 0) return;
                              const availableSlots = 10 - (posSettings.ad_slides?.length || 0);
                              if (availableSlots <= 0) {
                                showToast("Maximum 10 slides reached", "warning");
                                return;
                              }
                              const filesToUpload = Array.from(files).slice(0, availableSlots);
                              setUploadingSlide(true);
                              try {
                                const newUrls: string[] = [];
                                for (const f of filesToUpload) {
                                  const url = await uploadFileToR2(f, "pos-slides");
                                  newUrls.push(url);
                                }
                                setPosSettings(prev => ({
                                  ...prev,
                                  ad_slides: [...(prev.ad_slides || []), ...newUrls].slice(0, 10)
                                }));
                                showToast(`${newUrls.length} slide photo(s) uploaded successfully!`, "success");
                              } catch (err: any) {
                                showToast("Upload error: " + err.message, "error");
                              } finally {
                                setUploadingSlide(false);
                                e.target.value = "";
                              }
                            }}
                          />
                        </label>
                      </div>

                      {/* Thumbnails Grid */}
                      {posSettings.ad_slides && posSettings.ad_slides.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                          {posSettings.ad_slides.map((slideUrl, idx) => (
                            <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white aspect-4/3 flex items-center justify-center">
                              <img src={slideUrl} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute top-1 left-1 bg-black/70 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                                #{idx + 1}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setPosSettings(prev => ({
                                    ...prev,
                                    ad_slides: prev.ad_slides.filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-700 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove slide"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-white rounded-lg border border-dashed border-slate-300 text-center text-xs text-zinc-400">
                          No photos added. Upload up to 10 photos to start the customer display slideshow.
                        </div>
                      )}

                      {/* Slideshow Transition & Interval */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/80">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-zinc-700">Transition Effect</label>
                          <select
                            value={posSettings.ad_transition}
                            onChange={(e) => setPosSettings({ ...posSettings, ad_transition: e.target.value as "fade" | "slide" })}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                          >
                            <option value="fade">✨ Smooth Cross-Fade</option>
                            <option value="slide">➡️ Horizontal Slide</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-zinc-700">Slide Duration (Seconds)</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="2"
                              max="60"
                              value={posSettings.ad_interval_sec}
                              onChange={(e) => setPosSettings({ ...posSettings, ad_interval_sec: Math.max(2, parseInt(e.target.value, 10) || 5) })}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-zinc-400">sec/slide</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VIDEO LOOP MODE */}
                  {posSettings.ad_mode === "video" && (
                    <div className="flex flex-col gap-4 p-4 bg-[#F8F9FA] rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900">Promo Video (Single MP4/WebM Loop)</h4>
                          <p className="text-[11px] text-zinc-500">Upload looped commercial or paste direct video URL</p>
                        </div>

                        {/* Upload Video Button */}
                        <label className={`px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs ${
                          uploadingVideo ? "opacity-50 pointer-events-none" : ""
                        }`}>
                          {uploadingVideo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          <span>Upload Video</span>
                          <input
                            type="file"
                            accept="video/mp4,video/webm"
                            disabled={uploadingVideo}
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 50 * 1024 * 1024) {
                                showToast("Video size exceeds 50MB limit", "warning");
                                return;
                              }
                              setUploadingVideo(true);
                              try {
                                const url = await uploadFileToR2(file, "pos-videos");
                                setPosSettings(prev => ({
                                  ...prev,
                                  ad_video_url: url
                                }));
                                showToast("Promo video uploaded successfully!", "success");
                              } catch (err: any) {
                                showToast("Upload error: " + err.message, "error");
                              } finally {
                                setUploadingVideo(false);
                                e.target.value = "";
                              }
                            }}
                          />
                        </label>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-zinc-700">Video Direct URL</label>
                        <input
                          type="url"
                          placeholder="https://.../video.mp4"
                          value={posSettings.ad_video_url}
                          onChange={(e) => setPosSettings({ ...posSettings, ad_video_url: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                        />
                      </div>

                      {posSettings.ad_video_url && (
                        <div className="rounded-lg overflow-hidden border border-slate-200 bg-black aspect-video max-h-56 flex items-center justify-center">
                          <video
                            src={posSettings.ad_video_url}
                            controls
                            muted
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* COLUMN 2: Payment Details (QR, PayNow, Bank & Instructions) */}
              <div className="flex flex-col gap-5">
                
                {/* Universal Static QR Code Section */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-[#0B57D0]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">Universal Static Payment QR</h3>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-20 bg-slate-50 rounded-xl border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        {posSettings.qr_image_url ? (
                          <img src={posSettings.qr_image_url} alt="QR Code" className="w-full h-full object-contain" />
                        ) : (
                          <QrCode className="w-8 h-8 text-zinc-300" />
                        )}
                      </div>

                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <label className={`px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs ${
                            uploadingQR ? "opacity-50 pointer-events-none" : ""
                          }`}>
                            {uploadingQR ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            <span>Upload QR Code</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingQR}
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingQR(true);
                                try {
                                  const url = await uploadFileToR2(file, "pos-qr");
                                  setPosSettings(prev => ({
                                    ...prev,
                                    qr_image_url: url
                                  }));
                                  showToast("Payment QR uploaded successfully!", "success");
                                } catch (err: any) {
                                  showToast("Upload error: " + err.message, "error");
                                } finally {
                                  setUploadingQR(false);
                                  e.target.value = "";
                                }
                              }}
                            />
                          </label>

                          {posSettings.qr_image_url && (
                            <button
                              type="button"
                              onClick={() => setPosSettings(prev => ({ ...prev, qr_image_url: "" }))}
                              className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-red-600 rounded-lg text-xs font-semibold"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <input
                          type="url"
                          placeholder="Or paste QR image direct URL..."
                          value={posSettings.qr_image_url}
                          onChange={(e) => setPosSettings({ ...posSettings, qr_image_url: e.target.value })}
                          className="w-full px-3 py-1.5 bg-[#F8F9FA] focus:bg-white border border-slate-200 rounded-lg text-xs font-mono text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PayNow / UEN Transfer Section */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">PayNow / Instant QR Details</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-700">PayNow UEN / Mobile No.</label>
                      <input
                        type="text"
                        placeholder="e.g. 202412345M or 91234567"
                        value={posSettings.paynow_uen}
                        onChange={(e) => setPosSettings({ ...posSettings, paynow_uen: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#F8F9FA] focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-zinc-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-700">PayNow Account Name</label>
                      <input
                        type="text"
                        placeholder="e.g. HSG GLOBAL PTE LTD"
                        value={posSettings.paynow_name}
                        onChange={(e) => setPosSettings({ ...posSettings, paynow_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#F8F9FA] focus:bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Bank Account Details Section */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Building className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">Direct Bank Account Transfer</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="flex flex-col gap-1.5 sm:col-span-1">
                      <label className="text-xs font-semibold text-zinc-700">Bank Name</label>
                      <input
                        type="text"
                        placeholder="e.g. DBS / OCBC / UOB"
                        value={posSettings.bank_name}
                        onChange={(e) => setPosSettings({ ...posSettings, bank_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#F8F9FA] focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-zinc-700">Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 012-345678-9"
                        value={posSettings.bank_account_no}
                        onChange={(e) => setPosSettings({ ...posSettings, bank_account_no: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#F8F9FA] focus:bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] transition-all"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 sm:col-span-3">
                      <label className="text-xs font-semibold text-zinc-700">Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. HSG GLOBAL PTE LTD"
                        value={posSettings.bank_account_name}
                        onChange={(e) => setPosSettings({ ...posSettings, bank_account_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-[#F8F9FA] focus:bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Customer Display Instructions */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">Customer Display Instruction Note</h3>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <textarea
                      rows={3}
                      placeholder="Instructions shown to customers under the QR code..."
                      value={posSettings.instructions}
                      onChange={(e) => setPosSettings({ ...posSettings, instructions: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#F8F9FA] focus:bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] transition-all"
                    />
                  </div>
                </div>

              </div>
            </div>

          </form>
        </div>
      ) : null}

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

              {/* Photo Receipt Proof (QR / Transfer payments) */}
              {["QR", "Transfer Bank", "PayNow", "Bank Transfer"].includes(viewingOrder.payment_method) && (
                <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#0B57D0]" />
                      Payment Receipt Photo Proof
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenReceiptUpload(viewingOrder as POSOrder)}
                      className="px-2 py-0.5 text-[11px] font-bold text-[#0B57D0] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      {viewingOrder.proof_photo_url ? "Replace Photo" : "Upload Photo"}
                    </button>
                  </div>

                  {viewingOrder.proof_photo_url ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black/5 max-h-64 flex items-center justify-center">
                        <img
                          src={viewingOrder.proof_photo_url}
                          alt="Payment Receipt Proof"
                          className="max-h-64 w-auto object-contain cursor-pointer"
                          onClick={() => window.open(viewingOrder.proof_photo_url, "_blank")}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>Click image to view full resolution</span>
                        {viewingOrder.proof_uploaded_at && (
                          <span>Uploaded: {new Date(Number(viewingOrder.proof_uploaded_at)).toLocaleString("en-SG")}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => handleOpenReceiptUpload(viewingOrder as POSOrder)}
                      className="border-2 border-dashed border-slate-200 hover:border-[#0B57D0]/50 rounded-lg p-4 text-center cursor-pointer transition-colors bg-white"
                    >
                      <UploadCloud className="w-6 h-6 text-zinc-400 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-zinc-700">No receipt photo attached yet</p>
                      <p className="text-[10px] text-zinc-400">Click to upload and crop payment proof image</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              {!(viewingOrder as any).void_reason && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePrintOrderInvoicePDF(viewingOrder as POSOrder)}
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-zinc-800 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#0B57D0]" />
                    Print Sales Report (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(viewingOrder as POSOrder)}
                    className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-zinc-800 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Receipt
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg transition-all cursor-pointer"
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

      {/* 9. CREATE / EDIT ACTIVATION MODAL */}
      {isCreateActModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">
                  {editingAct ? "Edit Event Activation" : "Create Event Activation"}
                </h3>
                <p className="text-xs text-zinc-500">Configure roadshow details, operational mode (POS / Sampling), assigned staff, and stock allocation float.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateActModalOpen(false);
                  setEditingAct(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-200 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
              {/* POS Terminal vs Sampling Mode Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-2">
                <span className="text-xs font-bold text-zinc-800">Event Operational Mode</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    newActUsePos
                      ? "bg-blue-50/70 border-[#0B57D0] text-[#041E49]"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-zinc-700"
                  }`}>
                    <input
                      type="radio"
                      name="use_pos_radio"
                      checked={newActUsePos}
                      onChange={() => setNewActUsePos(true)}
                      className="mt-0.5 w-4 h-4 text-[#0B57D0] focus:ring-[#0B57D0]"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-[#0B57D0]" />
                        Use POS Terminal
                      </span>
                      <span className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
                        Cashier sales enabled during event date. Allocated stocks appear in POS Terminal.
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    !newActUsePos
                      ? "bg-amber-50/70 border-amber-500 text-amber-950"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-zinc-700"
                  }`}>
                    <input
                      type="radio"
                      name="use_pos_radio"
                      checked={!newActUsePos}
                      onChange={() => setNewActUsePos(false)}
                      className="mt-0.5 w-4 h-4 text-amber-600 focus:ring-amber-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-amber-800">
                        <Tag className="w-3.5 h-3.5 text-amber-600" />
                        Sampling Roadshow Only
                      </span>
                      <span className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
                        No POS cashier sales. Items brought are for free sample distribution or event booth display.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Event Name & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-700">Activation / Roadshow Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Takashimaya Food Fair 2026"
                    value={newActName}
                    onChange={(e) => setNewActName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-700">Booth / Event Location</label>
                  <input
                    type="text"
                    placeholder="e.g. B2 Atrium Booth #04"
                    value={newActLocation}
                    onChange={(e) => setNewActLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Multi-Day Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-700">Start Date</label>
                  <input
                    type="date"
                    value={newActStartDate}
                    onChange={(e) => setNewActStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-zinc-700">End Date</label>
                  <input
                    type="date"
                    value={newActEndDate}
                    onChange={(e) => setNewActEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* FOC Campaign Reason */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-700">FOC Sampling Campaign Reason &amp; Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Free sample distribution for brand awareness campaign, VIP tasting, customer sampling promo..."
                  value={newActFocDesc}
                  onChange={(e) => setNewActFocDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              {/* Staff Participating */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700">Participating Staff ({newActParticipants.length} selected)</label>
                  <span className="text-[11px] text-zinc-400">Select employees assigned to this event</span>
                </div>
                <div className="max-h-36 overflow-y-auto p-2.5 bg-[#F8F9FA] rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {employees.length === 0 ? (
                    <span className="text-zinc-400 italic col-span-3 text-center py-2">No active employees found.</span>
                  ) : (
                    employees.map(emp => {
                      const isChecked = newActParticipants.includes(emp.id);
                      return (
                        <label key={emp.id} className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setNewActParticipants(prev => [...prev, emp.id]);
                              else setNewActParticipants(prev => prev.filter(id => id !== emp.id));
                            }}
                            className="w-3.5 h-3.5 text-[#0B57D0] rounded border-slate-300 focus:ring-[#0B57D0]"
                          />
                          <span className="text-xs font-semibold text-zinc-800 truncate">{emp.name || emp.full_name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Stock Float Allocation */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-zinc-800">Stock Allocation Float</label>
                    <p className="text-[11px] text-zinc-500">Products checked out from warehouse to bring to the activation booth</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewActAllocatedItems(prev => [...prev, { sku: "", qty: "" }])}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-zinc-700 rounded-md text-xs font-semibold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#0B57D0]" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {newActAllocatedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.sku}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewActAllocatedItems(prev => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], sku: val };
                            return next;
                          });
                        }}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-hidden"
                      >
                        <option value="">-- Select Product / SKU --</option>
                        {sortedMasterProducts.map(p => (
                          <option key={p.sku} value={p.sku}>
                            {p.brand_name ? `[${p.brand_name}] ` : ""}{p.sku} - {p.display_name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewActAllocatedItems(prev => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], qty: val };
                            return next;
                          });
                        }}
                        className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden"
                      />
                      {newActAllocatedItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setNewActAllocatedItems(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsCreateActModalOpen(false);
                  setEditingAct(null);
                }}
                disabled={isSavingAct}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveActivation}
                disabled={isSavingAct}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSavingAct ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {editingAct ? "Save Changes" : "Create Activation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. CLOSE & RECONCILE ACTIVATION MODAL (STOCK CHECK & RECEIPTS) */}
      {closingAct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-6xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150 font-primary">
            {/* Header */}
            <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-zinc-950">Close Event Activation</h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">{closingAct.name} • {closingAct.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setClosingAct(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2-COLUMN BODY (SIDE BY SIDE: 5 cols receipt, 7 cols stock) */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              {(() => {
                const assignedOrders = orders.filter(o => o.activation_id === closingAct.id);
                const unverifiedNonCash = assignedOrders.filter(o => 
                  ["QR", "Transfer Bank", "PayNow", "Bank Transfer"].includes(o.payment_method) && !o.proof_photo_url
                );
                const cashOrdersTotal = assignedOrders.reduce((sum, o) => {
                  return (o.payment_method === "Cash" && !o.is_foc) ? sum + Number(o.total_amount || 0) : sum;
                }, 0);
                const hasCash = cashOrdersTotal > 0;

                return (
                  <>
                    {/* LEFT COLUMN: RECEIPT VERIFICATION & CASH SLIP */}
                    <div className="flex flex-col p-4 overflow-y-auto gap-4 bg-slate-50/50 lg:col-span-5">
                      {/* Section Title */}
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                        <span className="text-xs font-bold text-zinc-900">Receipt Verification</span>
                        {unverifiedNonCash.length === 0 ? (
                          <span className="text-[11px] font-bold text-emerald-700">✓ All Verified</span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-700">{unverifiedNonCash.length} Missing</span>
                        )}
                      </div>

                      {/* Missing QR/Transfer Orders */}
                      {unverifiedNonCash.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {unverifiedNonCash.map(unOrder => (
                            <div key={unOrder.id} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {unOrder.ref_code && (
                                  <span className="px-1.5 py-0.5 bg-blue-50 text-[#0B57D0] border border-blue-200 font-mono font-bold text-[11px] rounded">
                                    Ref: {unOrder.ref_code}
                                  </span>
                                )}
                                <span className="font-mono text-zinc-700">{unOrder.id}</span>
                                <span className="text-zinc-500 font-semibold">${Number(unOrder.total_amount).toFixed(2)}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenReceiptUpload(unOrder)}
                                className="px-2.5 py-1 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-[11px] font-semibold rounded cursor-pointer transition-all shrink-0"
                              >
                                Upload
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>All QR &amp; Transfer receipts verified</span>
                        </div>
                      )}

                      {/* Cash Deposit Proof */}
                      {hasCash && (
                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-900">Cash Deposit Slip</span>
                            <span className="text-[11px] text-zinc-500">Total Cash: <strong className="text-emerald-700">${cashOrdersTotal.toFixed(2)}</strong></span>
                          </div>

                          <input
                            ref={cashFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCashDepositFileChange}
                          />

                          {cashDepositPhotos.length === 0 ? (
                            <div
                              onClick={() => cashFileInputRef.current?.click()}
                              className="border border-dashed border-red-300 bg-red-50/50 hover:bg-red-50 rounded-lg p-3 text-center cursor-pointer transition-colors"
                            >
                              <span className="text-xs font-bold text-red-700 block">No Deposit Slip Attached</span>
                              <span className="text-[10px] text-red-500">Click to upload photo of bank deposit slip</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs">
                              <div className="flex items-center gap-1.5">
                                {cashDepositPhotos.map((url, idx) => (
                                  <img
                                    key={idx}
                                    src={url}
                                    alt="Deposit"
                                    onClick={() => setViewingPhotoUrl(url)}
                                    className="w-8 h-8 object-cover rounded border border-slate-300 cursor-pointer hover:opacity-80"
                                  />
                                ))}
                                <span className="text-[11px] text-zinc-600 font-medium ml-1">{cashDepositPhotos.length} slip(s)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => cashFileInputRef.current?.click()}
                                className="text-[11px] text-[#0B57D0] hover:underline font-semibold cursor-pointer"
                              >
                                + Add More
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: STOCK RETURN TABLE */}
                    <div className="flex flex-col flex-1 min-h-0 bg-white overflow-hidden lg:col-span-7">
                      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-900">Physical Stock Return</span>
                          <span className="text-[10px] text-zinc-500">Confirm unsold count</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveStockReturn}
                          disabled={isSavingReturn || isClosingAct}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-zinc-700 font-semibold text-xs rounded-md transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Save physical return counts without closing the activation"
                        >
                          {isSavingReturn ? <RefreshCw className="w-3 h-3 animate-spin text-[#0B57D0]" /> : <Save className="w-3 h-3 text-[#0B57D0]" />}
                          <span>Save Stock Return</span>
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                          <thead className="bg-[#F8F9FA] sticky top-0 z-10">
                            <tr>
                              <th className="px-3 py-2 text-left font-bold text-zinc-700">Product / SKU</th>
                              <th className="px-2 py-2 text-center font-bold text-zinc-700 w-14">Alloc</th>
                              <th className="px-2 py-2 text-center font-bold text-zinc-700 w-12">Sold</th>
                              <th className="px-2 py-2 text-center font-bold text-purple-700 w-16">Sample</th>
                              <th className="px-3 py-2 text-right font-bold text-zinc-700 w-24">Return</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {(() => {
                              const salesMap: Record<string, number> = {};
                              const focMap: Record<string, number> = {};

                              assignedOrders.forEach(ord => {
                                const isOrdFoc = ord.is_foc || ord.payment_method === "FOC" || ord.discount_type === "foc";
                                (ord.items || []).forEach(it => {
                                  const sku = it.sku;
                                  const qty = Number(it.qty || 1);
                                  if (isOrdFoc || it.is_foc || it.discount_type === "foc") {
                                    focMap[sku] = (focMap[sku] || 0) + qty;
                                  } else {
                                    salesMap[sku] = (salesMap[sku] || 0) + qty;
                                  }
                                });
                              });

                              const allSkus = Array.from(new Set([
                                ...Object.keys(closingAllocations),
                                ...(closingAct.stock_allocated || []).map(it => it.sku),
                                ...Object.keys(salesMap),
                                ...Object.keys(focMap)
                              ]));

                              allSkus.sort((a, b) => {
                                const prodA = masterProducts.find(p => p.sku.toLowerCase() === a.toLowerCase()) || posProducts.find(p => p.sku.toLowerCase() === a.toLowerCase());
                                const prodB = masterProducts.find(p => p.sku.toLowerCase() === b.toLowerCase()) || posProducts.find(p => p.sku.toLowerCase() === b.toLowerCase());
                                const brandA = (prodA?.brand_name || "").toLowerCase();
                                const brandB = (prodB?.brand_name || "").toLowerCase();
                                if (brandA !== brandB) return brandA.localeCompare(brandB);
                                const brandIdA = String(prodA?.brand_id || "");
                                const brandIdB = String(prodB?.brand_id || "");
                                if (brandIdA !== brandIdB) return brandIdA.localeCompare(brandIdB);
                                return a.localeCompare(b);
                              });

                              if (allSkus.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-zinc-400 italic">
                                      No allocated stock found.
                                    </td>
                                  </tr>
                                );
                              }

                              return allSkus.map(sku => {
                                const prod = masterProducts.find(p => p.sku.toLowerCase() === sku.toLowerCase()) || posProducts.find(p => p.sku.toLowerCase() === sku.toLowerCase());
                                const prodName = prod?.display_name || "";
                                const brandName = prod?.brand_name || "";
                                const alloc = closingAllocations[sku] !== undefined ? closingAllocations[sku] : ((closingAct.stock_allocated || []).find(it => it.sku === sku)?.qty || 0);
                                const sold = salesMap[sku] || 0;
                                const foc = focMap[sku] || 0;
                                const retVal = closingReturns[sku] !== undefined ? closingReturns[sku] : Math.max(0, alloc - sold - foc);
                                const totalSample = Math.max(0, alloc - sold - retVal);

                                return (
                                  <tr key={sku} className="hover:bg-slate-50/60">
                                    <td className="px-3 py-2">
                                      {brandName && <div className="text-[10px] font-bold text-[#0B57D0] uppercase tracking-wider">{brandName}</div>}
                                      <div className="font-mono font-bold text-zinc-900">{sku}</div>
                                      {prodName && <div className="text-[10px] text-zinc-500 truncate max-w-[170px]">{prodName}</div>}
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        value={alloc}
                                        onChange={(e) => {
                                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                          setClosingAllocations(prev => ({ ...prev, [sku]: val }));
                                        }}
                                        className="w-14 px-1.5 py-1 bg-[#F8F9FA] focus:bg-white border border-slate-200 rounded text-center font-mono font-bold text-zinc-900 text-xs focus:ring-1 focus:ring-[#0B57D0]"
                                        title="Initial Allocated Goods (Editable)"
                                      />
                                    </td>
                                    <td className="px-2 py-2 text-center text-zinc-600 font-mono">{sold}</td>
                                    <td className="px-2 py-2 text-center font-mono">
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 font-bold text-[11px]" title={`POS FOC: ${foc}, Unreturned / Discrepancy: ${Math.max(0, totalSample - foc)}`}>
                                        {totalSample}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <input
                                        type="number"
                                        min="0"
                                        max={Math.max(0, alloc - sold)}
                                        value={retVal}
                                        onChange={(e) => {
                                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                          setClosingReturns(prev => ({ ...prev, [sku]: val }));
                                        }}
                                        className="w-18 px-2 py-1 bg-[#F8F9FA] focus:bg-white border border-slate-200 rounded text-right font-mono font-bold text-zinc-900 text-xs focus:ring-1 focus:ring-[#0B57D0]"
                                        title="Physical Stock Return to Warehouse"
                                      />
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Simple Footer */}
            {(() => {
              const assignedOrders = orders.filter(o => o.activation_id === closingAct.id);
              const unverifiedNonCash = assignedOrders.filter(o => 
                ["QR", "Transfer Bank", "PayNow", "Bank Transfer"].includes(o.payment_method) && !o.proof_photo_url
              );
              const cashOrdersTotal = assignedOrders.reduce((sum, o) => {
                return (o.payment_method === "Cash" && !o.is_foc) ? sum + Number(o.total_amount || 0) : sum;
              }, 0);
              const isBlocked = unverifiedNonCash.length > 0 || (cashOrdersTotal > 0 && cashDepositPhotos.length === 0);

              return (
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0">
                  <div className="text-xs text-zinc-500">
                    {isBlocked ? (
                      <span className="text-amber-700 font-medium">⚠️ Receipts required before closing</span>
                    ) : (
                      <span className="text-emerald-700 font-medium">✓ Ready to close</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setClosingAct(null)}
                      disabled={isClosingAct || isSavingReturn}
                      className="px-4 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveStockReturn}
                      disabled={isClosingAct || isSavingReturn}
                      className="px-3.5 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-zinc-800 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                      title="Save physical return counts and receipts without final closing"
                    >
                      {isSavingReturn ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0B57D0]" /> : <Save className="w-3.5 h-3.5 text-[#0B57D0]" />}
                      <span>Save Stock Return</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmCloseActivation}
                      disabled={isClosingAct || isSavingReturn || isBlocked}
                      className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isClosingAct ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Final Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 10b. CASH DEPOSIT RECEIPT CROP & ROTATE MODAL */}
      {isCashCropModalOpen && cashRawImage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150 font-primary">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#0B57D0]" />
                  Crop &amp; Upload Cash Deposit Receipt
                </h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Activation: {closingAct?.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCashCropModalOpen(false);
                  setCashRawImage(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-200 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                {/* Image Crop & Rotate Preview Canvas */}
                <div className="relative w-full h-72 bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center select-none shadow-inner">
                  <div
                    className="relative transition-transform duration-200"
                    style={{
                      transform: `rotate(${cashRotation}deg)`
                    }}
                  >
                    <img
                      src={cashRawImage}
                      alt="Cash Deposit Preview"
                      className="max-h-64 max-w-full object-contain pointer-events-none rounded"
                    />
                  </div>

                  {/* Subtle Grid */}
                  <div className="absolute inset-0 border-2 border-white/40 pointer-events-none grid grid-cols-3 grid-rows-3">
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div className="border-r border-b border-white/20"></div>
                    <div></div>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCashRotation((prev) => (prev + 90) % 360)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-zinc-800 font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-[#0B57D0]" />
                      <span>Rotate ({cashRotation}°)</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCashRotation(0);
                      setCashCropBox({ x: 0, y: 0, width: 100, height: 100 });
                    }}
                    className="text-[11px] text-zinc-400 hover:text-zinc-700 font-semibold transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                {/* Sliders */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-800 flex items-center gap-1">
                      <Crop className="w-3.5 h-3.5 text-[#0B57D0]" />
                      Adjust Margin / Framing
                    </span>
                    <span className="text-[10px] text-zinc-400">Trim background borders</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-zinc-600">
                        <span>Horizontal:</span>
                        <span className="font-mono font-bold">{cashCropBox.width}%</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="100"
                        value={cashCropBox.width}
                        onChange={(e) => {
                          const w = parseInt(e.target.value, 10);
                          const x = (100 - w) / 2;
                          setCashCropBox((prev) => ({ ...prev, width: w, x }));
                        }}
                        className="w-full accent-[#0B57D0]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] text-zinc-600">
                        <span>Vertical:</span>
                        <span className="font-mono font-bold">{cashCropBox.height}%</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="100"
                        value={cashCropBox.height}
                        onChange={(e) => {
                          const h = parseInt(e.target.value, 10);
                          const y = (100 - h) / 2;
                          setCashCropBox((prev) => ({ ...prev, height: h, y }));
                        }}
                        className="w-full accent-[#0B57D0]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsCashCropModalOpen(false);
                  setCashRawImage(null);
                }}
                disabled={isUploadingCashDeposit}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCashDepositPhoto}
                disabled={isUploadingCashDeposit || !cashRawImage}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isUploadingCashDeposit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Attach Cash Deposit Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10c. FULL PHOTO PREVIEW MODAL */}
      {viewingPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={() => setViewingPhotoUrl(null)}>
          <div className="relative max-w-2xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-2 bg-slate-900 text-white flex items-center justify-between text-xs font-bold">
              <span>Receipt Proof Preview</span>
              <button type="button" onClick={() => setViewingPhotoUrl(null)} className="p-1 hover:bg-slate-800 rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-zinc-950 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img src={viewingPhotoUrl} alt="Receipt Proof" className="max-w-full max-h-[75vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}

      {/* 11. PRINTABLE HIGH-DENSITY ACTIVATION AUDIT REPORT MODAL */}
      {printingAct && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-auto p-8 print:p-0">
          <div className="print:hidden flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#0B57D0]" />
              <h2 className="text-base font-bold text-zinc-950">Print Preview - Activation Audit Report</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
              >
                Print Now
              </button>
              <button
                type="button"
                onClick={() => setPrintingAct(null)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-bold text-xs rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>

          {/* Printable Sheet */}
          <div className="max-w-4xl mx-auto w-full font-primary text-zinc-900 border border-slate-200 p-8 rounded-xl print:border-0 print:p-0">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-4 mb-4">
              <div>
                <h1 className="text-xl font-black text-zinc-950 uppercase tracking-tight">HSG GLOBAL PTE. LTD.</h1>
                <p className="text-xs font-bold text-zinc-600 uppercase tracking-wider mt-0.5">Event Activation Audit &amp; Stock Reconciliation Report</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-base px-2.5 py-1 bg-zinc-100 rounded border border-zinc-300 inline-block">
                  {printingAct.id}
                </span>
                <p className="text-[10px] text-zinc-500 mt-1">Generated on: {new Date().toLocaleString("en-SG")}</p>
              </div>
            </div>

            {/* Event Meta Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-4">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Activation Name</span>
                <strong className="text-sm text-zinc-950 font-bold">{printingAct.name}</strong>
                {printingAct.location && <p className="text-zinc-600 mt-0.5">{printingAct.location}</p>}
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Event Duration</span>
                <p className="font-semibold text-zinc-900">{printingAct.start_date} {printingAct.end_date !== printingAct.start_date && `→ ${printingAct.end_date}`}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Status:{" "}
                  <strong className="uppercase">
                    {printingAct.status === "closed"
                      ? "CLOSED"
                      : (!printingAct.end_date || new Date().toISOString().split("T")[0] >= printingAct.end_date)
                        ? "PENDING RECONCILIATION"
                        : "ACTIVE"}
                  </strong>
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Staff Joined</span>
                <p className="font-semibold text-zinc-900">
                  {Array.isArray(printingAct.participants) && printingAct.participants.length > 0
                    ? printingAct.participants.map(p => p.name).join(", ")
                    : "None specified"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">FOC Sampling Campaign Reason</span>
                <p className="text-zinc-700 italic">{printingAct.foc_description || "Standard product sampling"}</p>
              </div>
            </div>

            {/* Financial Summary */}
            {(() => {
              const actOrders = orders.filter(o => o.activation_id === printingAct.id);
              let totalGross = 0;
              let cashTotal = 0;
              let qrTotal = 0;
              let transferTotal = 0;
              let focOrdersCount = 0;

              actOrders.forEach(o => {
                const amt = Number(o.total_amount || 0);
                totalGross += amt;
                const pm = String(o.payment_method || "").toLowerCase();
                if (o.is_foc || pm === "foc") focOrdersCount++;
                else if (pm === "cash") cashTotal += amt;
                else if (pm === "qr" || pm === "paynow") qrTotal += amt;
                else if (pm === "transfer bank" || pm === "bank transfer" || pm === "card") transferTotal += amt;
              });

              return (
                <div className="grid grid-cols-4 gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs mb-4 text-center">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Total Revenue</span>
                    <strong className="text-base text-zinc-950 font-bold">${totalGross.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Cash Collected</span>
                    <strong className="text-sm text-zinc-900 font-bold">${cashTotal.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">QR / PayNow</span>
                    <strong className="text-sm text-zinc-900 font-bold">${qrTotal.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Bank Transfer</span>
                    <strong className="text-sm text-zinc-900 font-bold">${transferTotal.toFixed(2)}</strong>
                  </div>
                </div>
              );
            })()}

            {/* Stock Reconciliation Table */}
            <div className="border border-zinc-300 rounded-lg overflow-hidden mb-6">
              <table className="min-w-full divide-y divide-zinc-200 text-xs">
                <thead className="bg-zinc-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold text-zinc-800 uppercase text-[10px]">Product / SKU</th>
                    <th className="px-2.5 py-2 text-center font-bold text-zinc-800 uppercase text-[10px]">Allocated Float</th>
                    <th className="px-2.5 py-2 text-center font-bold text-zinc-800 uppercase text-[10px]">POS Sales (Invoice)</th>
                    <th className="px-2.5 py-2 text-center font-bold text-zinc-800 uppercase text-[10px]">FOC Samples (Stock Issue)</th>
                    <th className="px-2.5 py-2 text-center font-bold text-zinc-800 uppercase text-[10px]">Returned Unsold</th>
                    <th className="px-2.5 py-2 text-center font-bold text-zinc-800 uppercase text-[10px]">Damaged / Lost</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-zinc-200">
                  {(() => {
                    const actOrders = orders.filter(o => o.activation_id === printingAct.id);
                    const salesMap: Record<string, number> = {};
                    const focMap: Record<string, number> = {};

                    actOrders.forEach(ord => {
                      const isOrdFoc = ord.is_foc || ord.payment_method === "FOC" || ord.discount_type === "foc";
                      (ord.items || []).forEach(it => {
                        const sku = it.sku;
                        const qty = Number(it.qty || 1);
                        if (isOrdFoc || it.is_foc || it.discount_type === "foc") {
                          focMap[sku] = (focMap[sku] || 0) + qty;
                        } else {
                          salesMap[sku] = (salesMap[sku] || 0) + qty;
                        }
                      });
                    });

                    const allSkus = Array.from(new Set([
                      ...(printingAct.stock_allocated || []).map(it => it.sku),
                      ...(printingAct.stock_returned || []).map(it => it.sku),
                      ...(printingAct.stock_damaged || []).map(it => it.sku),
                      ...Object.keys(salesMap),
                      ...Object.keys(focMap)
                    ]));

                    if (allSkus.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="px-3 py-6 text-center text-zinc-400 italic">
                            No SKU movement records for this activation.
                          </td>
                        </tr>
                      );
                    }

                    return allSkus.map(sku => {
                      const alloc = (printingAct.stock_allocated || []).find(it => it.sku === sku)?.qty || 0;
                      const ret = (printingAct.stock_returned || []).find(it => it.sku === sku)?.qty || 0;
                      const dmg = (printingAct.stock_damaged || []).find(it => it.sku === sku)?.qty || 0;
                      const sold = salesMap[sku] || (printingAct.stock_sales || []).find(it => it.sku === sku)?.qty || 0;
                      const foc = focMap[sku] || (printingAct.stock_foc || []).find(it => it.sku === sku)?.qty || 0;

                      return (
                        <tr key={sku}>
                          <td className="px-3 py-2 font-mono font-bold text-zinc-900">{sku}</td>
                          <td className="px-2.5 py-2 text-center font-mono font-bold">{alloc}</td>
                          <td className="px-2.5 py-2 text-center font-mono font-bold text-emerald-800">{sold}</td>
                          <td className="px-2.5 py-2 text-center font-mono font-bold text-purple-800">{foc}</td>
                          <td className="px-2.5 py-2 text-center font-mono font-bold text-zinc-800">{ret}</td>
                          <td className="px-2.5 py-2 text-center font-mono font-bold text-red-700">{dmg}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Attached Payment & Cash Deposit Proofs Gallery */}
            {(() => {
              const actOrders = orders.filter(o => o.activation_id === printingAct.id);
              const orderProofs = actOrders.filter(o => !!o.proof_photo_url);
              const depositProofs = Array.isArray(printingAct.cash_deposit_receipts) ? printingAct.cash_deposit_receipts : [];

              if (orderProofs.length === 0 && depositProofs.length === 0) return null;

              return (
                <div className="mb-6 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-zinc-600 block mb-3">
                    4. Verified Payment &amp; Deposit Receipts ({orderProofs.length + depositProofs.length} Attached)
                  </span>
                  <div className="grid grid-cols-4 gap-3">
                    {orderProofs.map(ord => (
                      <div key={ord.id} className="border border-zinc-300 rounded overflow-hidden bg-white p-1 flex flex-col">
                        <img
                          src={ord.proof_photo_url}
                          alt={`Order ${ord.id}`}
                          className="w-full h-28 object-cover rounded cursor-pointer"
                          onClick={() => setViewingPhotoUrl(ord.proof_photo_url || null)}
                        />
                        <div className="mt-1 text-[9px] font-mono text-center text-zinc-700 truncate">
                          {ord.id} ({ord.payment_method})
                        </div>
                      </div>
                    ))}
                    {depositProofs.map((url, idx) => (
                      <div key={idx} className="border border-emerald-300 rounded overflow-hidden bg-white p-1 flex flex-col">
                        <img
                          src={url}
                          alt={`Cash Deposit ${idx + 1}`}
                          className="w-full h-28 object-cover rounded cursor-pointer"
                          onClick={() => setViewingPhotoUrl(url)}
                        />
                        <div className="mt-1 text-[9px] font-bold text-center text-emerald-800 truncate">
                          Cash Deposit #{idx + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Signature Box Footer */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t border-zinc-300 text-xs">
              <div className="flex flex-col gap-8">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Prepared &amp; Reconciled By:</span>
                  <div className="border-b border-zinc-400 h-10"></div>
                  <p className="mt-1 font-semibold text-zinc-800">{printingAct.closed_by || printingAct.created_by || "Operator Name"}</p>
                </div>
              </div>
              <div className="flex flex-col gap-8">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Admin / Manager Approval:</span>
                  <div className="border-b border-zinc-400 h-10"></div>
                  <p className="mt-1 font-semibold text-zinc-800">Date: ________________________</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 12. DELETE ACTIVATION CONFIRMATION MODAL */}
      {deletingAct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-150 font-primary">
            <div className="p-5 flex flex-col gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Delete Event Activation?</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Are you sure you want to delete activation <strong className="text-zinc-800 font-semibold">{deletingAct.name}</strong> ({deletingAct.id})?
                </p>
                <p className="text-[11px] text-zinc-400 mt-2">
                  This action will remove the activation and reset any active stock reservations. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDeletingAct(null)}
                disabled={deletingActSaving}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteActivation}
                disabled={deletingActSaving}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {deletingActSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete Activation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. PHOTO RECEIPT UPLOAD, CROP & ROTATE MODAL */}
      {receiptUploadOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-150 font-primary">
            {/* Header: Exact img2 styling */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900">
                Crop &amp; Rotate Receipt
              </h3>
              <button
                type="button"
                onClick={() => {
                  setReceiptUploadOrder(null);
                  setReceiptRawImage(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
              <input
                ref={receiptFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReceiptFileChange}
              />

              {!receiptRawImage ? (
                <div
                  onClick={() => receiptFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-[#0B57D0] rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-[#F8F9FA] hover:bg-blue-50/30"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-[#0B57D0]">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-zinc-800">Click to browse or take receipt photo</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Supports JPG, PNG, WebP format</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {/* Interactive Crop & Rotate Canvas with Checkerboard Background */}
                  <div
                    className="relative w-full h-84 rounded overflow-hidden select-none flex items-center justify-center"
                    style={{
                      backgroundColor: "#f0f2f5",
                      backgroundImage: "linear-gradient(45deg, #71717a 25%, transparent 25%), linear-gradient(-45deg, #71717a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #71717a 75%), linear-gradient(-45deg, transparent 75%, #71717a 75%)",
                      backgroundSize: "16px 16px",
                      backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px"
                    }}
                    onMouseMove={(e) => {
                      if (!cropInteraction) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                      const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

                      if (cropInteraction.type === "drag") {
                        const newX = Math.max(0, Math.min(100 - cropInteraction.box.width, cropInteraction.box.x + (xPercent - cropInteraction.startX)));
                        const newY = Math.max(0, Math.min(100 - cropInteraction.box.height, cropInteraction.box.y + (yPercent - cropInteraction.startY)));
                        setReceiptCropBox((prev) => ({ ...prev, x: newX, y: newY }));
                      } else if (cropInteraction.type === "resize" && cropInteraction.handle) {
                        const h = cropInteraction.handle;
                        const b = cropInteraction.box;
                        let newX = b.x;
                        let newY = b.y;
                        let newW = b.width;
                        let newH = b.height;

                        if (h.includes("w")) {
                          const right = b.x + b.width;
                          newX = Math.max(0, Math.min(right - 10, xPercent));
                          newW = right - newX;
                        }
                        if (h.includes("e")) {
                          newW = Math.max(10, Math.min(100 - b.x, xPercent - b.x));
                        }
                        if (h.includes("n")) {
                          const bottom = b.y + b.height;
                          newY = Math.max(0, Math.min(bottom - 10, yPercent));
                          newH = bottom - newY;
                        }
                        if (h.includes("s")) {
                          newH = Math.max(10, Math.min(100 - b.y, yPercent - b.y));
                        }

                        setReceiptCropBox({ x: newX, y: newY, width: newW, height: newH });
                      }
                    }}
                    onMouseUp={() => setCropInteraction(null)}
                    onMouseLeave={() => setCropInteraction(null)}
                  >
                    {/* Centered Image with smooth rotation */}
                    <div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-100"
                      style={{
                        transform: `rotate(${receiptRotation}deg)`
                      }}
                    >
                      <img
                        src={receiptRawImage}
                        alt="Receipt Preview"
                        className="max-h-full max-w-full object-contain pointer-events-none select-none"
                      />
                    </div>

                    {/* Darkened semi-transparent overlay surrounding the crop box */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.45)`,
                        left: `${receiptCropBox.x}%`,
                        top: `${receiptCropBox.y}%`,
                        width: `${receiptCropBox.width}%`,
                        height: `${receiptCropBox.height}%`
                      }}
                    />

                    {/* Draggable & Resizable Blue Bounding Box (Exact img2 design) */}
                    <div
                      className="absolute cursor-move border border-[#1973E8]"
                      style={{
                        left: `${receiptCropBox.x}%`,
                        top: `${receiptCropBox.y}%`,
                        width: `${receiptCropBox.width}%`,
                        height: `${receiptCropBox.height}%`
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                        if (!rect) return;
                        const startX = ((e.clientX - rect.left) / rect.width) * 100;
                        const startY = ((e.clientY - rect.top) / rect.height) * 100;
                        setCropInteraction({
                          type: "drag",
                          startX,
                          startY,
                          box: { ...receiptCropBox }
                        });
                      }}
                    >
                      {/* Dashed 3x3 Rule-of-Thirds Grid lines */}
                      <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                        <div className="border-r border-b border-dashed border-white/60"></div>
                        <div className="border-r border-b border-dashed border-white/60"></div>
                        <div className="border-b border-dashed border-white/60"></div>
                        <div className="border-r border-b border-dashed border-white/60"></div>
                        <div className="border-r border-b border-dashed border-white/60"></div>
                        <div className="border-b border-dashed border-white/60"></div>
                        <div className="border-r border-dashed border-white/60"></div>
                        <div className="border-r border-dashed border-white/60"></div>
                        <div></div>
                      </div>

                      {/* 8 Handles (Corners & Midpoints) - Exact Blue Squares matching img2 */}
                      {[
                        { handle: "nw", cursor: "nwse-resize", style: { top: "-4px", left: "-4px" } },
                        { handle: "n", cursor: "ns-resize", style: { top: "-4px", left: "calc(50% - 4px)" } },
                        { handle: "ne", cursor: "nesw-resize", style: { top: "-4px", right: "-4px" } },
                        { handle: "e", cursor: "ew-resize", style: { top: "calc(50% - 4px)", right: "-4px" } },
                        { handle: "se", cursor: "nwse-resize", style: { bottom: "-4px", right: "-4px" } },
                        { handle: "s", cursor: "ns-resize", style: { bottom: "-4px", left: "calc(50% - 4px)" } },
                        { handle: "sw", cursor: "nesw-resize", style: { bottom: "-4px", left: "-4px" } },
                        { handle: "w", cursor: "ew-resize", style: { top: "calc(50% - 4px)", left: "-4px" } }
                      ].map((item) => (
                        <div
                          key={item.handle}
                          className="absolute w-2 h-2 bg-[#1973E8] border border-white z-10"
                          style={{ ...item.style, cursor: item.cursor }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setCropInteraction({
                              type: "resize",
                              handle: item.handle,
                              startX: 0,
                              startY: 0,
                              box: { ...receiptCropBox }
                            });
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Angle & Rotate Controls: Exact 100% img2 match */}
                  <div className="flex items-center justify-between gap-3 px-1 pt-1">
                    {/* Left Counter-Clockwise Rotate Button */}
                    <button
                      type="button"
                      onClick={() => setReceiptRotation((prev) => (prev - 90 < 0 ? (prev - 90 + 360) : (prev - 90)))}
                      className="w-10 h-10 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
                      title="Rotate counter-clockwise"
                    >
                      <RotateCcw className="w-4 h-4 text-zinc-700" />
                    </button>

                    {/* Angle Slider + Dynamic Indicator */}
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-xs font-semibold text-zinc-600 shrink-0 select-none">
                        Angle
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={receiptRotation}
                        onChange={(e) => setReceiptRotation(parseInt(e.target.value, 10))}
                        className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1973E8]"
                      />
                      <span className="text-xs font-semibold text-zinc-600 w-8 text-right tabular-nums select-none">
                        {receiptRotation}°
                      </span>
                    </div>

                    {/* Right Clockwise Rotate Button */}
                    <button
                      type="button"
                      onClick={() => setReceiptRotation((prev) => (prev + 90) % 360)}
                      className="w-10 h-10 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center text-zinc-700 transition-colors cursor-pointer shrink-0 shadow-2xs"
                      title="Rotate clockwise"
                    >
                      <RotateCw className="w-4 h-4 text-zinc-700" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer: Exact img2 styling (Cancel & Apply Crop) */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setReceiptUploadOrder(null);
                  setReceiptRawImage(null);
                }}
                disabled={isUploadingReceipt}
                className="px-6 py-2 bg-[#EBF2FE] hover:bg-[#DDE9FD] text-[#0B57D0] font-bold text-xs rounded-lg transition-colors cursor-pointer select-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReceiptPhoto}
                disabled={isUploadingReceipt || !receiptRawImage}
                className="px-6 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-zinc-900 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs select-none"
              >
                {isUploadingReceipt ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0B57D0]" /> : null}
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 14. VIEW JOINED STAFF MODAL */}
      {viewingStaffAct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[0.5px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-150 font-primary">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#0B57D0]" />
                  Joined Staff Roster ({Array.isArray(viewingStaffAct.participants) ? viewingStaffAct.participants.length : 0})
                </h3>
                <p className="text-xs text-zinc-500 font-medium truncate max-w-xs mt-0.5">
                  {viewingStaffAct.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingStaffAct(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Staff List */}
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-2">
              {Array.isArray(viewingStaffAct.participants) && viewingStaffAct.participants.length > 0 ? (
                viewingStaffAct.participants.map((staff, idx) => (
                  <div
                    key={staff.id || idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50/70 border border-slate-200/80 rounded-lg text-xs hover:bg-blue-50/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-[#0B57D0] font-bold flex items-center justify-center text-[11px] shrink-0">
                        {(staff.name || "S").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900 leading-tight">{staff.name}</p>
                        {staff.type ? (
                          <p className="text-[10px] text-zinc-400 mt-0.5 capitalize">{staff.type}</p>
                        ) : null}
                      </div>
                    </div>
                    {staff.type && (
                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-medium text-zinc-600 shrink-0 capitalize">
                        {staff.type}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-zinc-400 text-xs italic">
                  No staff members assigned to this activation.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingStaffAct(null)}
                className="px-4 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-zinc-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
