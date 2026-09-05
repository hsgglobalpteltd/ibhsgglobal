"use client";

import * as React from "react";
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  DollarSign, 
  Percent, 
  CreditCard, 
  QrCode, 
  Receipt, 
  Lock, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  X, 
  Package, 
  User, 
  Sparkles, 
  Tag, 
  Printer, 
  RefreshCw, 
  ShoppingBag,
  History,
  AlertCircle,
  Landmark,
  Ban,
  Camera,
  MessageSquare,
  ShieldCheck,
  KeyRound,
  UserCheck,
  Maximize,
  Minimize,
  Coins,
  HeartHandshake,
  Calculator,
  Delete,
  Equal
} from "lucide-react";
import { showToast } from "@/lib/toast";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

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
  is_active_pos: boolean;
}

interface CartItem {
  sku: string;
  name: string;
  brand_id?: string;
  brand_name: string;
  original_price: number;
  price: number;
  qty: number;
  image?: string;
  is_foc: boolean;
  discount_type: "none" | "percent" | "amount" | "foc";
  discount_val: number;
  discount_amount: number;
  subtotal: number;
}

interface CashierProfile {
  id: string;
  name: string;
  full_name: string;
  type: string;
  photo_url?: string;
  role: string[];
}

export default function POSCashierTerminal() {
  // Cashier Session & PIN Lock
  const [cashier, setCashier] = React.useState<CashierProfile | null>(null);
  const [isInitializingSession, setIsInitializingSession] = React.useState<boolean>(true);
  const [pinInput, setPinInput] = React.useState<string>("");
  const [pinVerifying, setPinVerifying] = React.useState<boolean>(false);
  const [pinError, setPinError] = React.useState<string>("");

  // Catalog & Inventory Data
  const [products, setProducts] = React.useState<POSProduct[]>([]);
  const [brandPromos, setBrandPromos] = React.useState<BrandPromo[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Cart State
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [cartDiscountType, setCartDiscountType] = React.useState<"none" | "percent" | "amount" | "foc">("none");
  const [cartDiscountVal, setCartDiscountVal] = React.useState<number>(0);
  const [cartNotes, setCartNotes] = React.useState<string>("");

  // Modals & Panels
  const [itemDiscountModal, setItemDiscountModal] = React.useState<{ item: CartItem; index: number } | null>(null);
  const [itemDiscType, setItemDiscType] = React.useState<"percent" | "amount" | "foc">("percent");
  const [itemDiscInput, setItemDiscInput] = React.useState<string>("10");

  const [cartDiscountModalOpen, setCartDiscountModalOpen] = React.useState<boolean>(false);
  const [billDiscType, setBillDiscType] = React.useState<"percent" | "amount" | "foc">("percent");
  const [billDiscInput, setBillDiscInput] = React.useState<string>("10");

  const [paymentModalOpen, setPaymentModalOpen] = React.useState<boolean>(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = React.useState<boolean>(false);
  const [recentOrders, setRecentOrders] = React.useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = React.useState<boolean>(false);

  // Void Order Modal (2-Person Dual Authorization)
  const [voidingOrder, setVoidingOrder] = React.useState<any | null>(null);
  const [voidReason, setVoidReason] = React.useState<string>("Customer requested cancellation");
  const [approverPin, setApproverPin] = React.useState<string>("");
  const [approverError, setApproverError] = React.useState<string>("");
  const [isVoiding, setIsVoiding] = React.useState<boolean>(false);

  // Payment Checkout State
  const [paymentMethod, setPaymentMethod] = React.useState<"Cash" | "QR" | "Transfer Bank" | "FOC">("Cash");
  const [cashTendered, setCashTendered] = React.useState<string>("");
  const [showCashCalculator, setShowCashCalculator] = React.useState<boolean>(false);
  const [calcInput, setCalcInput] = React.useState<string>("");
  const [isCheckingOut, setIsCheckingOut] = React.useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = React.useState<any | null>(null);
  const [nextRefCode, setNextRefCode] = React.useState<string>("A");
  const [loadingRefCode, setLoadingRefCode] = React.useState<boolean>(false);

  // Cashier Register Code & Screen Pairing Modal
  const [registerId, setRegisterId] = React.useState<string>("REG-1");
  const [pairModalOpen, setPairModalOpen] = React.useState<boolean>(false);
  const [editingRegisterId, setEditingRegisterId] = React.useState<string>("REG-1");

  // Load Register ID from localStorage
  React.useEffect(() => {
    try {
      const savedReg = localStorage.getItem("pos_register_id");
      if (savedReg) {
        setRegisterId(savedReg.toUpperCase());
        setEditingRegisterId(savedReg.toUpperCase());
      }
    } catch (e) {
      console.warn("Storage read error:", e);
    }
  }, []);

  // Live Clock & Fullscreen State
  const [timeStr, setTimeStr] = React.useState<string>("");
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  const [fullscreenPromptOpen, setFullscreenPromptOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (active) {
        setFullscreenPromptOpen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // 1-minute timer to prompt user to enter fullscreen if not already in fullscreen
  React.useEffect(() => {
    if (!cashier || isFullscreen) {
      setFullscreenPromptOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      if (!document.fullscreenElement) {
        setFullscreenPromptOpen(true);
      }
    }, 60000); // 1 minute

    return () => clearTimeout(timer);
  }, [cashier, isFullscreen]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreenPromptOpen(false);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err: any) {
      console.warn("Fullscreen toggle error:", err);
      showToast("Fullscreen is not supported or was blocked by browser", "warning");
    }
  };

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Restore cashier session from sessionStorage
  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem("pos_cashier_session");
      if (saved) {
        setCashier(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Session restore error:", e);
    } finally {
      setIsInitializingSession(false);
    }
  }, []);

  // Fetch POS Catalog Products & Brand Promos
  const loadProducts = React.useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [prodRes, promoRes] = await Promise.all([
        fetch(`${WORKER_URL}/api/pos/products`),
        fetch(`${WORKER_URL}/api/pos/brand-promos`)
      ]);

      if (prodRes.ok) {
        const list = await prodRes.json();
        const activeOnly = Array.isArray(list) ? list.filter((p: any) => p.is_active_pos !== false) : [];
        setProducts(activeOnly);
      }

      if (promoRes.ok) {
        const promoList = await promoRes.json();
        const activePromos = Array.isArray(promoList) ? promoList.filter((pr: any) => pr.is_active !== false) : [];
        setBrandPromos(activePromos);
      }
    } catch (err: any) {
      showToast("Failed to load POS catalog: " + err.message, "error");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  // Fetch recent cashier transactions
  const loadRecentOrders = React.useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/orders`);
      if (res.ok) {
        const list = await res.json();
        setRecentOrders(Array.isArray(list) ? list.slice(0, 30) : []);
      }
    } catch (err: any) {
      console.warn("Could not load recent orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Fetch next daily running reference code for QR / Transfer proof
  const loadNextRefCode = React.useCallback(async () => {
    setLoadingRefCode(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/next-ref-code`);
      if (res.ok) {
        const data = await res.json();
        if (data.next_ref_code) {
          setNextRefCode(data.next_ref_code);
        }
      }
    } catch (e) {
      console.warn("Could not load next ref code:", e);
    } finally {
      setLoadingRefCode(false);
    }
  }, []);

  React.useEffect(() => {
    if (cashier) {
      loadProducts();
      loadRecentOrders();
    }
  }, [cashier, loadProducts, loadRecentOrders]);

  React.useEffect(() => {
    if (cashier && paymentModalOpen && (paymentMethod === "QR" || paymentMethod === "Transfer Bank")) {
      loadNextRefCode();
    }
  }, [cashier, paymentModalOpen, paymentMethod, loadNextRefCode]);

  // Handle PIN Keypad Submit
  const handlePinSubmit = async (pinCode?: string) => {
    const pinToVerify = pinCode || pinInput;
    if (pinToVerify.length !== 4) {
      setPinError("Please enter a 4-digit PIN");
      return;
    }

    setPinVerifying(true);
    setPinError("");
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/auth/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinToVerify })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Authentication failed");
      }

      const data = await res.json();
      if (data.success && data.employee) {
        setCashier(data.employee);
        sessionStorage.setItem("pos_cashier_session", JSON.stringify(data.employee));
        setPinInput("");
        showToast(`Welcome, ${data.employee.name}!`, "success");
      }
    } catch (err: any) {
      setPinError(err.message || "Invalid PIN code. Access denied.");
      setPinInput("");
    } finally {
      setPinVerifying(false);
    }
  };

  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 4) {
      const newPin = pinInput + val;
      setPinInput(newPin);
      if (newPin.length === 4) {
        handlePinSubmit(newPin);
      }
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
    setPinError("");
  };

  const handleKeypadClear = () => {
    setPinInput("");
    setPinError("");
  };

  const handleLockTerminal = () => {
    setCashier(null);
    sessionStorage.removeItem("pos_cashier_session");
    setCart([]);
    setPinInput("");
    setPinError("");
    showToast("POS Terminal locked.", "info");
  };

  // Keyboard listener for physical keyboard PIN entry
  React.useEffect(() => {
    if (cashier) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        if (pinInput.length < 4) {
          const newPin = pinInput + e.key;
          setPinInput(newPin);
          if (newPin.length === 4) handlePinSubmit(newPin);
        }
      } else if (e.key === "Backspace") {
        handleKeypadBackspace();
      } else if (e.key === "Escape") {
        handleKeypadClear();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cashier, pinInput]);

  // Brands list for navigation tabs (grouped purely by brand name)
  const brandsList = React.useMemo(() => {
    const brandMap = new Map<string, { name: string; count: number }>();

    products.forEach(p => {
      const bName = (p.brand_name || "HSG Global").trim();
      const key = bName.toLowerCase();

      if (!brandMap.has(key)) {
        brandMap.set(key, { name: bName, count: 0 });
      }
      brandMap.get(key)!.count += 1;
    });

    return Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Selected Brand Tab ("All" or specific brand name)
  const [selectedBrandKey, setSelectedBrandKey] = React.useState<string>("All");

  // Filtered products
  const filteredProducts = React.useMemo(() => {
    return products.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || p.sku.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q) || (p.single_barcode && p.single_barcode.includes(q));
      const bName = (p.brand_name || "HSG Global").trim();
      const matchBrand = selectedBrandKey === "All" || bName.toLowerCase() === selectedBrandKey.toLowerCase();
      return matchQuery && matchBrand;
    });
  }, [products, searchQuery, selectedBrandKey]);

  // Sorted products by Brand Name, then Brand ID, then SKU
  const sortedProducts = React.useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const brandA = (a.brand_name || "").toLowerCase();
      const brandB = (b.brand_name || "").toLowerCase();
      if (brandA !== brandB) return brandA.localeCompare(brandB);

      const idA = (a.brand_id || "").toLowerCase();
      const idB = (b.brand_id || "").toLowerCase();
      if (idA !== idB) return idA.localeCompare(idB);

      return a.sku.localeCompare(b.sku);
    });
  }, [filteredProducts]);

  // Add Item to Cart with Stock Limit Enforcement
  const handleAddToCart = (product: POSProduct) => {
    const availableStock = Number(product.stock_allocated) || 0;
    
    if (availableStock <= 0) {
      showToast(`Out of Stock: ${product.display_name} has 0 units available.`, "warning");
      return;
    }

    setCart(prev => {
      const idx = prev.findIndex(item => item.sku === product.sku);
      if (idx >= 0) {
        const existing = prev[idx];
        if (existing.qty >= availableStock) {
          showToast(`Stock Limit Reached: Only ${availableStock} units of ${product.display_name} available in stock.`, "warning");
          return prev;
        }
        const next = [...prev];
        const newQty = existing.qty + 1;
        const sub = existing.is_foc ? 0 : (existing.price * newQty);
        next[idx] = { ...existing, qty: newQty, subtotal: sub };
        return next;
      } else {
        const price = Number(product.selling_price) || 0;
        return [...prev, {
          sku: product.sku,
          name: product.display_name,
          brand_id: product.brand_id,
          brand_name: product.brand_name || "General",
          original_price: price,
          price: price,
          qty: 1,
          image: product.image,
          is_foc: false,
          discount_type: "none",
          discount_val: 0,
          discount_amount: 0,
          subtotal: price
        }];
      }
    });
  };

  // Add Custom Tip / Adjustment Amount ($1.00, $0.01, etc.)
  const handleAddAdjustment = (amount: number, label: string) => {
    const sku = amount === 1 ? "ADJ-TIP-100" : "ADJ-TIP-001";
    setCart(prev => {
      const idx = prev.findIndex(item => item.sku === sku);
      if (idx >= 0) {
        const next = [...prev];
        const existing = next[idx];
        const newQty = existing.qty + 1;
        const sub = existing.price * newQty;
        next[idx] = { ...existing, qty: newQty, subtotal: sub };
        return next;
      } else {
        return [...prev, {
          sku: sku,
          name: label,
          brand_id: "CUSTOM",
          brand_name: "Adjustment",
          original_price: amount,
          price: amount,
          qty: 1,
          is_foc: false,
          discount_type: "none",
          discount_val: 0,
          discount_amount: 0,
          subtotal: amount
        }];
      }
    });
    showToast(`Added ${label}`, "success");
  };

  // Barcode Scanner Enter Key Listener on Search Bar
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;

      const exactMatch = products.find(p => 
        p.single_barcode === q || 
        p.carton_barcode === q || 
        p.sku.toLowerCase() === q.toLowerCase()
      );

      if (exactMatch) {
        handleAddToCart(exactMatch);
        setSearchQuery("");
      }
    }
  };

  // Update Cart Item Quantity with Stock Limit Check
  const handleUpdateQty = (index: number, delta: number) => {
    setCart(prev => {
      const item = prev[index];
      if (!item) return prev;

      // For custom adjustments (non-inventory items), allow without stock limit
      const isCustomAdjustment = item.sku.startsWith("ADJ-TIP-");

      if (delta > 0 && !isCustomAdjustment) {
        const matchedProduct = products.find(p => p.sku.toLowerCase() === item.sku.toLowerCase());
        const availableStock = matchedProduct ? (Number(matchedProduct.stock_allocated) || 0) : 0;
        
        if (item.qty >= availableStock) {
          showToast(`Stock limit reached: Only ${availableStock} units available for ${item.name}`, "warning");
          return prev;
        }
      }

      const next = [...prev];
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        const sub = item.is_foc ? 0 : (item.price * newQty);
        next[index] = { ...item, qty: newQty, subtotal: sub };
      }
      return next;
    });
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Apply Item-Level Discount or FOC
  const handleApplyItemDiscount = (index: number, type: "none" | "percent" | "amount" | "foc", val: number) => {
    setCart(prev => {
      const next = [...prev];
      const item = next[index];
      const orig = item.original_price;

      let finalPrice = orig;
      let isFoc = false;
      let discountAmt = 0;

      if (type === "foc") {
        finalPrice = 0;
        isFoc = true;
        discountAmt = orig * item.qty;
      } else if (type === "percent") {
        const percentOff = Math.min(100, Math.max(0, val));
        finalPrice = orig * ((100 - percentOff) / 100);
        discountAmt = (orig - finalPrice) * item.qty;
      } else if (type === "amount") {
        const amountOff = Math.min(orig, Math.max(0, val));
        finalPrice = orig - amountOff;
        discountAmt = amountOff * item.qty;
      }

      next[index] = {
        ...item,
        price: finalPrice,
        is_foc: isFoc,
        discount_type: type,
        discount_val: val,
        discount_amount: discountAmt,
        subtotal: isFoc ? 0 : (finalPrice * item.qty)
      };
      return next;
    });
    setItemDiscountModal(null);
  };

  // Cart Calculations with Brand Mix & Match Promo
  const cartTotals = React.useMemo(() => {
    let subtotal = 0;
    let itemsDiscountTotal = 0;

    // 1. Regular subtotal & manual line item discounts
    cart.forEach(item => {
      subtotal += (item.original_price * item.qty);
      if (item.discount_amount) {
        itemsDiscountTotal += item.discount_amount;
      }
    });

    // 2. Automatic Brand Mix & Match Promotions
    let brandPromoDiscountTotal = 0;
    const appliedBrandPromos: Array<{ brand_name: string; rule: string; discount: number }> = [];

    brandPromos.forEach(promo => {
      if (!promo.is_active) return;
      const bKey = (promo.brand_name || "").trim().toLowerCase();
      const includedSkusSet = Array.isArray(promo.included_skus) && promo.included_skus.length > 0
        ? new Set(promo.included_skus.map(s => s.toLowerCase()))
        : null;

      // Filter qualifying items in cart for this promo rule
      const qualifyingItems = cart.filter(item => {
        if (item.is_foc) return false;
        const itemBrand = (item.brand_name || "").trim().toLowerCase();
        if (itemBrand !== bKey) return false;
        if (includedSkusSet && !includedSkusSet.has(item.sku.toLowerCase())) return false;
        return true;
      });

      const totalQty = qualifyingItems.reduce((acc, it) => acc + it.qty, 0);
      const totalCost = qualifyingItems.reduce((acc, it) => acc + (it.original_price * it.qty), 0);

      if (totalQty < promo.min_qty) return;

      if (promo.promo_type === "bundle_price") {
        const bundleCount = Math.floor(totalQty / promo.min_qty);
        if (bundleCount > 0) {
          const promoItemsQty = bundleCount * promo.min_qty;
          const avgUnitPrice = totalCost / totalQty;
          const origCostForBundle = avgUnitPrice * promoItemsQty;
          const promoCostForBundle = promo.promo_val * bundleCount;
          const saving = Math.max(0, origCostForBundle - promoCostForBundle);
          if (saving > 0) {
            brandPromoDiscountTotal += saving;
            appliedBrandPromos.push({
              brand_name: promo.brand_name,
              rule: `${bundleCount}x (${promo.min_qty} for $${promo.promo_val.toFixed(2)})`,
              discount: saving
            });
          }
        }
      } else if (promo.promo_type === "percent_off") {
        const saving = totalCost * (promo.promo_val / 100);
        brandPromoDiscountTotal += saving;
        appliedBrandPromos.push({
          brand_name: promo.brand_name,
          rule: `${promo.promo_val}% off on ${totalQty} items`,
          discount: saving
        });
      } else if (promo.promo_type === "fixed_off") {
        const saving = promo.promo_val;
        brandPromoDiscountTotal += saving;
        appliedBrandPromos.push({
          brand_name: promo.brand_name,
          rule: `-$${promo.promo_val.toFixed(2)} off`,
          discount: saving
        });
      }
    });

    // 3. Bill-Level Global Discount
    let globalDiscountAmt = 0;
    const baseAfterItemAndBrandDiscounts = Math.max(0, subtotal - itemsDiscountTotal - brandPromoDiscountTotal);

    if (cartDiscountType === "foc" || paymentMethod === "FOC") {
      globalDiscountAmt = baseAfterItemAndBrandDiscounts;
    } else if (cartDiscountType === "percent") {
      globalDiscountAmt = baseAfterItemAndBrandDiscounts * (Math.min(100, Math.max(0, cartDiscountVal)) / 100);
    } else if (cartDiscountType === "amount") {
      globalDiscountAmt = Math.min(baseAfterItemAndBrandDiscounts, Math.max(0, cartDiscountVal));
    }

    const totalDiscount = (paymentMethod === "FOC" || cartDiscountType === "foc") ? subtotal : (itemsDiscountTotal + brandPromoDiscountTotal + globalDiscountAmt);
    const grandTotal = (paymentMethod === "FOC" || cartDiscountType === "foc") ? 0 : Math.max(0, subtotal - totalDiscount);
    const totalItemCount = cart.reduce((acc, it) => acc + it.qty, 0);

    return {
      subtotal,
      itemsDiscountTotal,
      brandPromoDiscountTotal,
      appliedBrandPromos,
      globalDiscountAmt,
      totalDiscount,
      grandTotal,
      totalItemCount
    };
  }, [cart, brandPromos, cartDiscountType, cartDiscountVal, paymentMethod]);

  // Cash Change calculation
  const cashChange = React.useMemo(() => {
    const tender = parseFloat(cashTendered) || 0;
    return Math.max(0, tender - cartTotals.grandTotal);
  }, [cashTendered, cartTotals.grandTotal]);

  // Real-Time Broadcast to Customer Dual Display Screen (Local + Cloud Wireless Multi-Device)
  React.useEffect(() => {
    const syncPayload = {
      type: "CART_UPDATE",
      register_id: registerId,
      cart,
      totals: cartTotals,
      completedOrder,
      paymentState: {
        isOpen: paymentModalOpen,
        method: paymentMethod,
        refCode: nextRefCode,
        cash_received: parseFloat(cashTendered) || 0,
        cash_change: cashChange
      },
      timestamp: Date.now()
    };

    // 1. Local 0ms Sync (BroadcastChannel + LocalStorage)
    try {
      localStorage.setItem("pos_display_sync", JSON.stringify(syncPayload));
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("pos_display_channel");
        channel.postMessage(syncPayload);
        channel.close();
      }
    } catch (e) {
      console.warn("Display broadcast sync error:", e);
    }

    // 2. Cloud Wireless Sync for separate tablets/iPads/phones
    const timer = setTimeout(() => {
      fetch(`${WORKER_URL}/api/pos/sync/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          register_id: registerId,
          payload: syncPayload
        })
      }).catch(err => console.warn("Cloud sync push error:", err));
    }, 120);

    return () => clearTimeout(timer);
  }, [registerId, cart, cartTotals, completedOrder, paymentModalOpen, paymentMethod, nextRefCode, cashTendered, cashChange]);

  // Complete Sale & Checkout
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    if (paymentMethod === "Cash") {
      const tender = parseFloat(cashTendered) || 0;
      if (tender < cartTotals.grandTotal) {
        showToast("Cash tendered is less than total amount due", "warning");
        return;
      }
    }

    setIsCheckingOut(true);
    const now = Date.now();
    const orderId = `POS-${now}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const payload = {
      id: orderId,
      cashier_id: cashier?.id || "admin",
      cashier_name: cashier?.name || "Cashier",
      items: cart,
      subtotal: cartTotals.subtotal,
      discount_type: cartDiscountType,
      discount_val: cartDiscountVal,
      discount_amount: cartTotals.totalDiscount,
      total_amount: cartTotals.grandTotal,
      payment_method: paymentMethod,
      cash_received: paymentMethod === "Cash" ? (parseFloat(cashTendered) || cartTotals.grandTotal) : cartTotals.grandTotal,
      cash_change: paymentMethod === "Cash" ? cashChange : 0,
      is_foc: cartTotals.grandTotal === 0 || cartDiscountType === "foc" || paymentMethod === "FOC",
      notes: cartNotes.trim()
    };

    try {
      const res = await fetch(`${WORKER_URL}/api/pos/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Checkout failed");

      showToast("Sale completed successfully!", "success");
      setCompletedOrder(data.order || payload);
      setPaymentModalOpen(false);
      setCart([]);
      setCartDiscountType("none");
      setCartDiscountVal(0);
      setCartNotes("");
      setCashTendered("");
      loadProducts();
    } catch (err: any) {
      showToast("Checkout failed: " + err.message, "error");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Void Sale Transaction (2-Person Dual Authorization)
  const handleConfirmVoid = async () => {
    if (!voidingOrder) return;

    if (!approverPin || approverPin.trim().length !== 4) {
      setApproverError("Second employee / manager 4-digit PIN is required.");
      return;
    }

    setApproverError("");
    setIsVoiding(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/pos/orders/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: voidingOrder.id,
          reason: voidReason.trim() || "Voided at POS Cashier",
          voided_by: cashier?.name || "Cashier",
          voided_by_id: cashier?.id || "",
          approver_pin: approverPin.trim()
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = errText;
        try {
          const errObj = JSON.parse(errText);
          if (errObj.error) errMsg = errObj.error;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Void operation failed");

      showToast(`Transaction ${voidingOrder.id} voided and authorized! Stock has been restored.`, "success");
      setVoidingOrder(null);
      setApproverPin("");
      setApproverError("");
      loadProducts();
      loadRecentOrders();
    } catch (err: any) {
      setApproverError(err.message || "Failed to void order");
      showToast(err.message || "Failed to void order", "error");
    } finally {
      setIsVoiding(false);
    }
  };

  // Print Thermal Receipt
  const handlePrintReceipt = (order: any) => {
    const dateStr = new Date(Number(order.created_at || Date.now())).toLocaleString("en-SG");
    const itemsHtml = Array.isArray(order.items) ? order.items.map((it: any) => `
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
          ${order.ref_code ? `<p style="margin: 2px 0; font-size: 12px; font-weight: bold; color: #0B57D0;">Payment Ref: [ ${order.ref_code} ]</p>` : ""}
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

  // -------------------------------------------------------------
  // RENDER 0: SESSION RESTORE LOADING (PREVENTS FLASH OF PIN GATE)
  // -------------------------------------------------------------
  if (isInitializingSession) {
    return (
      <div className="fixed inset-0 bg-[#F0F4F9] flex flex-col items-center justify-center p-4 font-primary select-none z-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0B57D0]/10 border border-[#0B57D0]/20 flex items-center justify-center text-[#0B57D0] shadow-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-[#0B57D0]" />
          </div>
          <span className="text-xs font-semibold text-zinc-500">Loading terminal session...</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 1: FULLSCREEN PIN GATE (LOCK SCREEN)
  // -------------------------------------------------------------
  if (!cashier) {
    return (
      <div className="fixed inset-0 bg-[#F0F4F9] flex flex-col items-center justify-center p-4 font-primary select-none z-50">
        <div className="absolute top-4 right-4">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-zinc-700 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen (F11)"}
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-4 h-4 text-zinc-600" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize className="w-4 h-4 text-zinc-600" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-8 max-w-sm w-full flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-200">
          <div className="flex flex-col items-center text-center gap-1.5">
            <div className="w-14 h-14 rounded-2xl bg-[#0B57D0]/10 border border-[#0B57D0]/20 flex items-center justify-center text-[#0B57D0] mb-1">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-zinc-950">POS Cashier Terminal</h1>
            <p className="text-xs text-zinc-500">Enter your 4-digit employee PIN to open terminal.</p>
          </div>

          {/* PIN Dots Display */}
          <div className="flex items-center justify-center gap-4 my-2">
            {[0, 1, 2, 3].map((idx) => {
              const filled = pinInput.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    filled 
                      ? "bg-[#0B57D0] scale-110 shadow-sm" 
                      : "bg-slate-200 border border-slate-300"
                  }`}
                />
              );
            })}
          </div>

          {pinError && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {/* Keypad Grid */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeypadPress(num)}
                disabled={pinVerifying}
                className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-lg font-bold text-zinc-900 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleKeypadClear}
              disabled={pinVerifying || pinInput.length === 0}
              className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-zinc-600 border border-slate-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 disabled:opacity-30"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress("0")}
              disabled={pinVerifying}
              className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-lg font-bold text-zinc-900 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleKeypadBackspace}
              disabled={pinVerifying || pinInput.length === 0}
              className="h-14 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-zinc-600 border border-slate-200 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 disabled:opacity-30"
            >
              ⌫
            </button>
          </div>

          {pinVerifying && (
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0B57D0]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying authorization...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 2: MAIN POS TERMINAL WORKSPACE
  // -------------------------------------------------------------
  return (
    <div className="h-screen w-screen bg-[#F0F4F9] flex flex-col overflow-hidden font-primary select-none">
      {/* 1. TOP STATUS / CASHIER HEADER BAR */}
      <header className="relative h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-4 shrink-0 shadow-2xs z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0B57D0] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            iB
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-950 leading-tight">HSG Retail POS</h2>
            <p className="text-[11px] text-zinc-500 font-medium">Terminal Active</p>
          </div>
        </div>

        {/* Centered 24-Hour Digital Clock (Fixed Width Slots to prevent shifting) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none select-none font-digital text-sm tracking-wider text-slate-600 font-bold">
          {timeStr.split("").map((ch, idx) => (
            <span
              key={idx}
              className={`inline-block text-center ${ch === ":" ? "w-2.5 opacity-60" : "w-3.5"}`}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* Actions & Cashier Controls */}
        <div className="flex items-center gap-2.5">
          {/* Register ID Badge & Pairing Button */}
          <button
            type="button"
            onClick={() => setPairModalOpen(true)}
            className="h-9 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            title="Wireless Customer Screen Pairing (Connect iPad/Tablet or separate monitor)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-zinc-900 font-black">{registerId}</span>
            <QrCode className="w-3.5 h-3.5 text-[#0B57D0]" />
            <span className="hidden xl:inline text-zinc-600 font-semibold">Pair Screen</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.open(`/pos/display?reg=${encodeURIComponent(registerId)}`, "_blank", "width=1200,height=800");
            }}
            className="h-9 px-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Open Customer-Facing Dual Screen Display (/pos/display)"
          >
            <Maximize className="w-3.5 h-3.5 text-[#0B57D0]" />
            <span className="hidden lg:inline">Open Display</span>
          </button>

          <button
            type="button"
            onClick={() => {
              loadRecentOrders();
              setHistoryDrawerOpen(true);
            }}
            className="h-9 px-3 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <History className="w-3.5 h-3.5 text-[#0B57D0]" />
            <span>Recent Sales</span>
          </button>

          {/* Cashier Info & Lock */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-300">
                {cashier.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-zinc-900 leading-tight">{cashier.name}</span>
            </div>

            <button
              type="button"
              onClick={handleLockTerminal}
              className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Lock POS Terminal"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>

          {/* Fullscreen Toggle Button at very end right */}
          <div className="pl-1 border-l border-slate-200">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen (F11)"}
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-zinc-700" />
              ) : (
                <Maximize className="w-4 h-4 text-zinc-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN SPLIT CANVAS: LEFT (PRODUCTS) | RIGHT (CART & CHECKOUT) */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT COLUMN: CATALOG CANVAS */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0 border-r border-slate-200">
          {/* Search Bar & Barcode Scanner Integration */}
          <div className="p-3 bg-white border-b border-slate-200 flex items-center gap-3 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search products by Name, SKU, or Scan Unit Barcode (Press Enter)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-xs font-semibold text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
              />
            </div>
          </div>

          {/* Brand Filter Pills */}
          <div className="px-3 py-2 bg-white border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setSelectedBrandKey("All")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedBrandKey === "All"
                  ? "bg-[#0B57D0] text-white shadow-xs"
                  : "bg-[#F0F4F9] text-zinc-600 hover:bg-slate-200 hover:text-zinc-900"
              }`}
            >
              All Brands ({products.length})
            </button>

            {brandsList.map((b) => {
              const isSelected = selectedBrandKey.toLowerCase() === b.name.toLowerCase();
              return (
                <button
                  key={b.name}
                  type="button"
                  onClick={() => setSelectedBrandKey(b.name)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#0B57D0] text-white shadow-xs"
                      : "bg-[#F0F4F9] text-zinc-600 hover:bg-slate-200 hover:text-zinc-900"
                  }`}
                >
                  <span>{b.name}</span>
                  <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-zinc-400"}`}>({b.count})</span>
                </button>
              );
            })}
          </div>

          {/* Products Grid Canvas - Seamless, Compact, Sorted by Brand */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#F8F9FA]">
            {loadingProducts && products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <RefreshCw className="w-6 h-6 animate-spin text-[#0B57D0]" />
                <span className="text-xs font-semibold">Loading product catalog...</span>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <Package className="w-8 h-8 text-zinc-300" />
                <span className="text-xs font-semibold">No products found matching filters</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {sortedProducts.map((p) => {
                  const hasStock = p.stock_allocated > 0;
                  return (
                    <button
                      key={p.sku}
                      type="button"
                      onClick={() => handleAddToCart(p)}
                      disabled={!hasStock}
                      className={`group bg-white rounded-xl border p-3 shadow-2xs transition-all flex flex-col text-left relative overflow-hidden ${
                        hasStock 
                          ? "border-slate-200 hover:border-[#0B57D0]/60 hover:shadow-md cursor-pointer active:scale-98" 
                          : "border-slate-200 opacity-60 cursor-not-allowed bg-slate-50/70"
                      }`}
                    >
                      {/* Product Image */}
                      <div className="w-full aspect-square rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden mb-2 relative">
                        {p.image ? (
                          <img src={p.image} alt={p.sku} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                        ) : (
                          <Package className="w-8 h-8 text-zinc-300" />
                        )}

                        {/* Stock Badge */}
                        <div className="absolute top-1.5 right-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border backdrop-blur-xs ${
                            p.stock_allocated > 10 
                              ? "bg-emerald-50/90 text-emerald-800 border-emerald-200" 
                              : p.stock_allocated > 0 
                                ? "bg-amber-50/90 text-amber-800 border-amber-200" 
                                : "bg-red-50/90 text-red-800 border-red-200"
                          }`}>
                            {p.stock_allocated} left
                          </span>
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="flex flex-col flex-1 justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase truncate">{p.sku}</span>
                            {/* Brand Promo Pill */}
                            {brandPromos.some(pr => {
                              if (!pr.is_active || !p.brand_name) return false;
                              if (pr.brand_name.toLowerCase() !== p.brand_name.toLowerCase()) return false;
                              if (Array.isArray(pr.included_skus) && pr.included_skus.length > 0) {
                                return pr.included_skus.map(s => s.toLowerCase()).includes(p.sku.toLowerCase());
                              }
                              return true;
                            }) && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-[#0B57D0] border border-blue-200 shrink-0">
                                PROMO
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-zinc-900 truncate whitespace-nowrap overflow-hidden" title={p.display_name}>
                            {p.display_name}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                          <span className="text-sm font-mono font-black text-[#0B57D0]">
                            ${Number(p.selling_price).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[100px]">{p.brand_name || "HSG"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Quick Tip / Rounding Cards at the END of catalog */}
                {(!searchQuery || "tip adjustment one dollar $1 1.00".includes(searchQuery.toLowerCase())) && (
                  <button
                    type="button"
                    onClick={() => handleAddAdjustment(1.00, "Tip / Rounding ($1.00)")}
                    className="group bg-gradient-to-b from-blue-50/60 via-white to-blue-50/40 rounded-xl border-2 border-dashed border-[#0B57D0]/40 hover:border-[#0B57D0] p-3 shadow-2xs hover:shadow-md transition-all flex flex-col text-left cursor-pointer active:scale-98 relative overflow-hidden"
                  >
                    <div className="w-full aspect-square rounded-lg bg-[#0B57D0]/10 border border-[#0B57D0]/20 flex flex-col items-center justify-center overflow-hidden mb-2 text-[#0B57D0]">
                      <span className="text-3xl font-black font-mono tracking-tight group-hover:scale-110 transition-transform drop-shadow-xs">
                        $1
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600/80 mt-1">
                        Adjustment
                      </span>
                    </div>

                    <div className="flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] text-blue-600 font-mono font-bold uppercase truncate">QUICK ADD</span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-900 truncate">
                          Tip / Rounding $1
                        </h4>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-blue-100">
                        <span className="text-sm font-mono font-black text-[#0B57D0]">+$1.00</span>
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded">+ $1.00</span>
                      </div>
                    </div>
                  </button>
                )}

                {(!searchQuery || "tip adjustment one cent 1c ¢1 0.01".includes(searchQuery.toLowerCase())) && (
                  <button
                    type="button"
                    onClick={() => handleAddAdjustment(0.01, "Tip / Rounding (1¢)")}
                    className="group bg-gradient-to-b from-blue-50/60 via-white to-blue-50/40 rounded-xl border-2 border-dashed border-[#0B57D0]/40 hover:border-[#0B57D0] p-3 shadow-2xs hover:shadow-md transition-all flex flex-col text-left cursor-pointer active:scale-98 relative overflow-hidden"
                  >
                    <div className="w-full aspect-square rounded-lg bg-[#0B57D0]/10 border border-[#0B57D0]/20 flex flex-col items-center justify-center overflow-hidden mb-2 text-[#0B57D0]">
                      <span className="text-3xl font-black font-mono tracking-tight group-hover:scale-110 transition-transform drop-shadow-xs">
                        1¢
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600/80 mt-1">
                        Adjustment
                      </span>
                    </div>

                    <div className="flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-[10px] text-blue-600 font-mono font-bold uppercase truncate">QUICK ADD</span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-900 truncate">
                          Tip / Rounding 1¢
                        </h4>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-blue-100">
                        <span className="text-sm font-mono font-black text-[#0B57D0]">+$0.01</span>
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded">+ 1¢</span>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </main>

        {/* RIGHT COLUMN: CART & CHECKOUT DRAWER */}
        <aside className="w-[380px] xl:w-[420px] bg-white flex flex-col justify-between overflow-hidden shrink-0 shadow-lg z-10">
          {/* Cart Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#0B57D0]" />
              <h3 className="text-sm font-bold text-zinc-950">Current Cart</h3>
              <span className="px-2 py-0.5 rounded-full bg-[#0B57D0] text-white text-[11px] font-bold">
                {cartTotals.totalItemCount}
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-red-600 hover:text-red-800 font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-400 gap-2">
                <ShoppingBag className="w-10 h-10 text-zinc-300 stroke-1" />
                <p className="text-xs font-semibold">Cart is currently empty</p>
                <p className="text-[11px] text-zinc-400 text-center max-w-[200px]">Tap any product on the left or scan a barcode to begin.</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={`${item.sku}-${idx}`} className="py-2.5 flex items-center justify-between gap-3">
                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-900 truncate">{item.name}</span>
                      {item.is_foc && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#0B57D0] text-white">FOC</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <span className="font-mono">{item.sku}</span>
                      <span>•</span>
                      <span className="font-mono">${item.original_price.toFixed(2)} each</span>
                      {item.discount_amount > 0 && !item.is_foc && (
                        <span className="text-amber-600 font-bold">(-${item.discount_amount.toFixed(2)})</span>
                      )}
                    </div>
                  </div>

                  {/* Quantity & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-[#F8F9FA] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, -1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 text-zinc-700 cursor-pointer font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-zinc-900 font-mono">
                        {item.qty}
                      </span>
                      {(() => {
                        const isCustom = item.sku.startsWith("ADJ-TIP-");
                        const matched = products.find(p => p.sku.toLowerCase() === item.sku.toLowerCase());
                        const maxStock = matched ? (Number(matched.stock_allocated) || 0) : 0;
                        const atLimit = !isCustom && item.qty >= maxStock;
                        return (
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, 1)}
                            disabled={atLimit}
                            className={`w-7 h-7 flex items-center justify-center font-bold transition-colors ${
                              atLimit 
                                ? "opacity-30 cursor-not-allowed bg-slate-100 text-zinc-400" 
                                : "hover:bg-slate-200 text-zinc-700 cursor-pointer"
                            }`}
                            title={atLimit ? `Max stock (${maxStock}) reached` : "Add one"}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        );
                      })()}
                    </div>

                    <div className="text-right w-16">
                      <span className="text-xs font-mono font-bold text-zinc-950">
                        ${item.subtotal.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setItemDiscountModal({ item, index: idx })}
                      className="p-1.5 text-zinc-400 hover:text-[#0B57D0] hover:bg-slate-100 rounded-md transition-colors"
                      title="Item discount / FOC"
                    >
                      <Tag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer Summary & Checkout */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3 shrink-0">
            {/* Discount summary row */}
            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">${cartTotals.subtotal.toFixed(2)}</span>
              </div>

              {/* Brand Mix & Match Promos Applied */}
              {cartTotals.appliedBrandPromos && cartTotals.appliedBrandPromos.length > 0 && (
                <div className="flex flex-col gap-1 py-1 border-y border-dashed border-blue-200 bg-blue-50/70 p-2 rounded-lg">
                  {cartTotals.appliedBrandPromos.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-[#0B57D0] font-bold text-[11px]">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3 shrink-0" />
                        <span>{p.brand_name} ({p.rule}):</span>
                      </span>
                      <span className="font-mono">-${p.discount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {cartTotals.totalDiscount > 0 && (!cartTotals.appliedBrandPromos || cartTotals.appliedBrandPromos.length === 0) && (
                <div className="flex justify-between text-[#0B57D0] font-semibold">
                  <span>Discount / FOC Deduction:</span>
                  <span className="font-mono">-${cartTotals.totalDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                <span className="text-sm font-bold text-zinc-950">Grand Total:</span>
                <span className="text-2xl font-bold font-mono text-emerald-700">
                  ${cartTotals.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quick Action Pills (Global Discount / FOC) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCartDiscountModalOpen(true)}
                disabled={cart.length === 0}
                className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-zinc-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 shadow-2xs disabled:opacity-50"
              >
                <Tag className="w-3.5 h-3.5 text-[#0B57D0]" />
                <span>
                  {cartDiscountType !== "none" ? `Discount (${cartDiscountType.toUpperCase()})` : "Apply Bill Discount / FOC"}
                </span>
              </button>
            </div>

            {/* Big Pay Button */}
            <button
              type="button"
              onClick={() => {
                setCashTendered(String(cartTotals.grandTotal.toFixed(2)));
                setPaymentModalOpen(true);
              }}
              disabled={cart.length === 0}
              className="w-full py-3.5 bg-[#0B57D0] hover:bg-[#0842A0] active:scale-98 text-white text-base font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-5 h-5" />
              <span>Checkout (${cartTotals.grandTotal.toFixed(2)})</span>
            </button>
          </div>
        </aside>
      </div>

      {/* 3. ITEM-LEVEL DISCOUNT / FOC MODAL */}
      {itemDiscountModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center p-4 font-primary">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 max-w-sm w-full flex flex-col gap-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Item Discount / FOC</h3>
                <span className="text-xs text-zinc-500 font-semibold">{itemDiscountModal.item.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setItemDiscountModal(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Discount Mode Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F0F4F9] rounded-lg">
              <button
                type="button"
                onClick={() => setItemDiscType("percent")}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  itemDiscType === "percent" ? "bg-white text-[#0B57D0] shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setItemDiscType("amount")}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  itemDiscType === "amount" ? "bg-white text-[#0B57D0] shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Fixed ($)
              </button>
              <button
                type="button"
                onClick={() => setItemDiscType("foc")}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  itemDiscType === "foc" ? "bg-[#0B57D0] text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Mark FOC
              </button>
            </div>

            {/* Value input if not FOC */}
            {itemDiscType !== "foc" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-700">
                  {itemDiscType === "percent" ? "Discount Percentage (% Off)" : "Discount Amount ($ Off)"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">
                    {itemDiscType === "percent" ? "%" : "$"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={itemDiscType === "percent" ? 100 : itemDiscountModal.item.original_price}
                    step={itemDiscType === "percent" ? "1" : "0.10"}
                    value={itemDiscInput}
                    onChange={(e) => setItemDiscInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                    placeholder="Enter discount..."
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  {itemDiscType === "percent" ? (
                    [5, 10, 15, 20, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setItemDiscInput(String(pct))}
                        className="flex-1 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded text-[11px] font-bold text-zinc-700"
                      >
                        {pct}%
                      </button>
                    ))
                  ) : (
                    [0.5, 1.0, 2.0, 5.0].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setItemDiscInput(String(amt))}
                        className="flex-1 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded text-[11px] font-bold text-zinc-700"
                      >
                        ${amt}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleApplyItemDiscount(itemDiscountModal.index, "none", 0)}
                className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 font-bold"
              >
                Clear Discount
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setItemDiscountModal(null)}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(itemDiscInput) || 0;
                    handleApplyItemDiscount(itemDiscountModal.index, itemDiscType, val);
                  }}
                  className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  Apply Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. BILL-LEVEL DISCOUNT / FOC MODAL */}
      {cartDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center p-4 font-primary">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full flex flex-col gap-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Total Bill Discount</h3>
                <span className="text-xs text-zinc-500">Apply custom discount (% or $) or entire bill FOC</span>
              </div>
              <button
                type="button"
                onClick={() => setCartDiscountModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Discount Mode Selector */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F0F4F9] rounded-lg">
              <button
                type="button"
                onClick={() => setBillDiscType("percent")}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  billDiscType === "percent" ? "bg-white text-[#0B57D0] shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setBillDiscType("amount")}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  billDiscType === "amount" ? "bg-white text-[#0B57D0] shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Fixed ($)
              </button>
              <button
                type="button"
                onClick={() => setBillDiscType("foc")}
                className={`py-1.5 text-xs font-bold rounded-md transition-all ${
                  billDiscType === "foc" ? "bg-[#0B57D0] text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Entire Bill FOC
              </button>
            </div>

            {/* Value input if not FOC */}
            {billDiscType !== "foc" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-700">
                  {billDiscType === "percent" ? "Discount Percentage (% Off Total Bill)" : "Discount Amount ($ Off Total Bill)"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">
                    {billDiscType === "percent" ? "%" : "$"}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={billDiscType === "percent" ? 100 : cartTotals.subtotal}
                    step={billDiscType === "percent" ? "1" : "0.50"}
                    value={billDiscInput}
                    onChange={(e) => setBillDiscInput(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                    placeholder="Enter discount..."
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-1">
                  {billDiscType === "percent" ? (
                    [5, 10, 15, 20, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setBillDiscInput(String(pct))}
                        className="flex-1 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded text-[11px] font-bold text-zinc-700"
                      >
                        {pct}%
                      </button>
                    ))
                  ) : (
                    [1, 2, 5, 10].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setBillDiscInput(String(amt))}
                        className="flex-1 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded text-[11px] font-bold text-zinc-700"
                      >
                        ${amt}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setCartDiscountType("none");
                  setCartDiscountVal(0);
                  setCartDiscountModalOpen(false);
                }}
                className="px-3 py-1.5 text-xs text-red-600 hover:text-red-800 font-bold"
              >
                Clear Discount
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCartDiscountModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(billDiscInput) || 0;
                    setCartDiscountType(billDiscType);
                    setCartDiscountVal(val);
                    setCartDiscountModalOpen(false);
                  }}
                  className="px-4 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  Apply Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. PAYMENT & CHECKOUT MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4 font-primary">
          <div className="relative max-w-lg w-full flex items-center justify-center">
            
            {/* FLOATING LEFT SIDE: POPUP CALCULATOR WIDGET (Absolute positioned to never shift modal) */}
            {showCashCalculator && (
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 w-72 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 flex flex-col gap-3 shrink-0 animate-in fade-in slide-in-from-right-4 duration-200 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-zinc-900 font-bold text-xs">
                    <Calculator className="w-4 h-4 text-[#0B57D0]" />
                    <span>Quick Calculator</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCashCalculator(false)}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-slate-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Calculator Screen */}
                <div className="flex flex-col gap-0.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-right">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Input</span>
                  <span className="font-mono text-xl font-black text-zinc-950 truncate">
                    {calcInput || "0"}
                  </span>
                </div>

                {/* Calculator Buttons Grid */}
                <div className="grid grid-cols-4 gap-1.5 font-mono">
                  {["7", "8", "9", "÷"].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setCalcInput((prev) => prev + (k === "÷" ? "/" : k))}
                      className={`py-2.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        k === "÷" ? "bg-blue-50 text-[#0B57D0] hover:bg-blue-100" : "bg-slate-50 text-zinc-800 hover:bg-slate-100 border border-slate-200/60"
                      }`}
                    >
                      {k}
                    </button>
                  ))}

                  {["4", "5", "6", "×"].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setCalcInput((prev) => prev + (k === "×" ? "*" : k))}
                      className={`py-2.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        k === "×" ? "bg-blue-50 text-[#0B57D0] hover:bg-blue-100" : "bg-slate-50 text-zinc-800 hover:bg-slate-100 border border-slate-200/60"
                      }`}
                    >
                      {k}
                    </button>
                  ))}

                  {["1", "2", "3", "-"].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setCalcInput((prev) => prev + k)}
                      className={`py-2.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        k === "-" ? "bg-blue-50 text-[#0B57D0] hover:bg-blue-100" : "bg-slate-50 text-zinc-800 hover:bg-slate-100 border border-slate-200/60"
                      }`}
                    >
                      {k}
                    </button>
                  ))}

                  {["C", "0", ".", "+"].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        if (k === "C") setCalcInput("");
                        else setCalcInput((prev) => prev + k);
                      }}
                      className={`py-2.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                        k === "C" ? "bg-red-50 text-red-600 hover:bg-red-100" : k === "+" ? "bg-blue-50 text-[#0B57D0] hover:bg-blue-100" : "bg-slate-50 text-zinc-800 hover:bg-slate-100 border border-slate-200/60"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                {/* Evaluate & Apply Actions */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const sanitized = calcInput.replace(/[^0-9+\-*/.]/g, "");
                        if (sanitized) {
                          // eslint-disable-next-line no-eval
                          const res = Function(`'use strict'; return (${sanitized})`)();
                          setCalcInput(String(Number(res).toFixed(2)));
                        }
                      } catch (e) {
                        showToast("Invalid calculation", "warning");
                      }
                    }}
                    className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-zinc-800 text-xs font-bold font-mono rounded-lg transition-colors cursor-pointer"
                  >
                    = Calculate
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      let finalVal = calcInput;
                      try {
                        const sanitized = calcInput.replace(/[^0-9+\-*/.]/g, "");
                        if (sanitized) {
                          // eslint-disable-next-line no-eval
                          const res = Function(`'use strict'; return (${sanitized})`)();
                          finalVal = String(Number(res).toFixed(2));
                        }
                      } catch (e) {}
                      if (finalVal && !isNaN(Number(finalVal))) {
                        setCashTendered(finalVal);
                        setCalcInput(finalVal);
                        setShowCashCalculator(false);
                        showToast(`Applied $${finalVal} to cash received`, "success");
                      }
                    }}
                    className="w-full py-2.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer font-primary"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply to Amount</span>
                  </button>
                </div>
              </div>
            )}

            {/* MAIN PAYMENT MODAL CARD (Sticks perfectly at Center) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 w-full flex flex-col gap-5 animate-in fade-in zoom-in duration-150 max-h-[95vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-950">Payment &amp; Checkout</h3>
                  <span className="text-xs text-zinc-500">Select customer payment method</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalOpen(false);
                    setShowCashCalculator(false);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 text-zinc-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Amount Due Big Banner */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Total Amount Due</span>
                <span className="text-3xl font-mono font-bold text-emerald-700">
                  ${cartTotals.grandTotal.toFixed(2)}
                </span>
              </div>

              {/* Payment Mode Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "Cash", label: "Cash", icon: DollarSign },
                    { id: "QR", label: "QR", icon: QrCode },
                    { id: "Transfer Bank", label: "Transfer Bank", icon: Landmark },
                    { id: "FOC", label: "FOC Takeout", icon: Tag }
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const active = paymentMethod === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPaymentMethod(mode.id as any)}
                        className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                          active 
                            ? "bg-[#0B57D0] text-white border-[#0B57D0] shadow-sm scale-102" 
                            : "bg-slate-50 border-slate-200 text-zinc-700 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Tender Calculation */}
              {paymentMethod === "Cash" && (
                <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-zinc-700">Cash Received ($)</label>

                    <div
                      onClick={() => {
                        setShowCashCalculator(true);
                        setCalcInput(cashTendered || "");
                      }}
                      className="relative cursor-pointer group"
                    >
                      <input
                        type="text"
                        readOnly
                        inputMode="none"
                        value={cashTendered ? `$${cashTendered}` : ""}
                        placeholder="Click to enter cash amount..."
                        className="w-full px-3.5 py-2.5 bg-white group-hover:bg-slate-50 border border-slate-200 group-hover:border-[#0B57D0] rounded-xl text-lg font-bold font-mono text-zinc-950 cursor-pointer shadow-2xs transition-colors"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[#0B57D0] pointer-events-none">
                        <Calculator className="w-4 h-4" />
                        <span className="text-xs font-bold hidden sm:inline">Keypad</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Bills Tender */}
                  <div className="flex items-center gap-2">
                    {[10, 20, 50, 100].map((bill) => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => setCashTendered(String(bill))}
                        className="flex-1 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-xs font-bold font-mono text-zinc-800 shadow-2xs cursor-pointer"
                      >
                        ${bill}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashTendered(String(cartTotals.grandTotal.toFixed(2)))}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-md text-xs font-bold text-zinc-800 shadow-2xs cursor-pointer"
                    >
                      Exact
                    </button>
                  </div>

                  {/* Change Due */}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-xs font-bold text-zinc-700">Change Due:</span>
                    <span className={`text-xl font-bold font-mono ${cashChange >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      ${cashChange.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* QR / Bank Transfer Running Reference & WhatsApp Workflow Indicator */}
              {(paymentMethod === "QR" || paymentMethod === "Transfer Bank") && (
                <div className="p-4 bg-blue-50/70 rounded-xl border-2 border-blue-200 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#0B57D0] text-white flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-zinc-950 block">Payment Proof Snapshot</span>
                        <span className="text-[11px] text-zinc-500">Snap customer payment &amp; send to WhatsApp</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Ref Mark</span>
                      <span className="px-3 py-0.5 bg-[#0B57D0] text-white font-mono font-black text-lg rounded-lg shadow-xs">
                        {loadingRefCode ? "..." : nextRefCode}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-blue-100 flex items-start gap-2.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-zinc-700 leading-relaxed">
                      <strong>Cashier Step:</strong> Snap picture of customer&apos;s payment screen on WhatsApp collection group. Type <span className="font-mono font-bold text-[#0B57D0] px-1.5 py-0.5 bg-blue-100 rounded text-xs">&quot;{nextRefCode}&quot;</span> and send to admin.
                    </div>
                  </div>
                </div>
              )}

              {/* Remarks / Reference Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-700">Notes / Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Customer name, phone, FOC takeout justification..."
                  value={cartNotes}
                  onChange={(e) => setCartNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              {/* Complete Sale Button */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentModalOpen(false);
                    setShowCashCalculator(false);
                  }}
                  disabled={isCheckingOut}
                  className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={isCheckingOut}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isCheckingOut ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Complete Sale (${cartTotals.grandTotal.toFixed(2)})</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. SALE COMPLETED / RECEIPT POPUP */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4 font-primary">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-sm w-full flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in duration-150">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-950">Payment Successful!</h3>
              <p className="text-xs text-zinc-500">Order Ref: {completedOrder.id}</p>
            </div>

            {/* Running Reference Code Badge for WhatsApp */}
            {completedOrder.ref_code && (
              <div className="w-full bg-blue-50 border-2 border-blue-200 rounded-xl p-3 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">WhatsApp Reference</span>
                  <span className="text-xs font-semibold text-zinc-800">Send photo with ref:</span>
                </div>
                <span className="px-3 py-1 bg-[#0B57D0] text-white font-mono font-black text-xl rounded-lg shadow-xs">
                  {completedOrder.ref_code}
                </span>
              </div>
            )}

            <div className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Paid:</span>
                <span className="font-bold font-mono text-zinc-950">${Number(completedOrder.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Payment Mode:</span>
                <span className="font-bold">{completedOrder.payment_method}</span>
              </div>
              {completedOrder.payment_method === "Cash" && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Change Due:</span>
                  <span className="font-mono">${Number(completedOrder.cash_change).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 w-full mt-2">
              <button
                type="button"
                onClick={() => handlePrintReceipt(completedOrder)}
                className="flex-1 py-2.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-bold text-xs rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. RECENT TRANSACTIONS DRAWER */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] flex justify-end font-primary">
          <div className="w-[400px] h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#0B57D0]" />
                <h3 className="text-sm font-bold text-zinc-950">Recent Sales History</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-zinc-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
              {loadingOrders ? (
                <div className="flex items-center justify-center py-20 gap-2 text-zinc-400 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0B57D0]" />
                  <span>Loading recent transactions...</span>
                </div>
              ) : recentOrders.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-20">No recent transactions</p>
              ) : (
                recentOrders.map((o) => (
                  <div key={o.id} className="py-3 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-zinc-900">{o.id}</span>
                        {o.ref_code && (
                          <span className="px-1.5 py-0.2 bg-blue-100 text-[#0B57D0] border border-blue-200 font-mono font-bold text-[10px] rounded">
                            Ref: {o.ref_code}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-emerald-700 text-xs">${Number(o.total_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{new Date(Number(o.created_at)).toLocaleTimeString("en-SG")} ({o.payment_method})</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(o)}
                          className="text-[#0B57D0] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                        <span className="text-zinc-300">•</span>
                        <button
                          type="button"
                          onClick={() => {
                            setVoidingOrder(o);
                            setVoidReason("Customer requested cancellation");
                          }}
                          className="text-red-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Void</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. VOID TRANSACTION MODAL */}
      {voidingOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4 font-primary">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden flex flex-col p-6 gap-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Void Sales Transaction?</h3>
                <p className="text-xs text-zinc-500">{voidingOrder.id} • ${Number(voidingOrder.total_amount).toFixed(2)}</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Are you sure you want to void this transaction? All items will be restored to inventory stock and this record will be archived as VOIDED.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-700">Reason for Void</label>
              <select
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F9FA] border border-slate-200 rounded-lg text-xs font-semibold text-zinc-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
              >
                <option value="Customer requested cancellation">Customer requested cancellation</option>
                <option value="Wrong items scanned / entered">Wrong items scanned / entered</option>
                <option value="Payment transaction error">Payment transaction error</option>
                <option value="Cashier test checkout">Cashier test checkout</option>
                <option value="Customer payment declined">Customer payment declined</option>
                <option value="Other justification">Other justification</option>
              </select>
            </div>

            {/* 2-Person Dual Authorization Approver PIN */}
            <div className="p-3.5 bg-amber-50/70 border-2 border-amber-200 rounded-xl flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-900 block">2-Person Dual Authorization</span>
                  <span className="text-[10px] text-zinc-500">Second staff or manager must tap 4-digit PIN</span>
                </div>
              </div>

              {/* 4-Digit Indicator Dots */}
              <div className="flex justify-center items-center gap-3 py-1">
                {[0, 1, 2, 3].map((idx) => {
                  const filled = approverPin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                        filled
                          ? "bg-amber-600 border-amber-600 scale-110 shadow-xs"
                          : "bg-white border-amber-300"
                      }`}
                    />
                  );
                })}
              </div>

              {/* On-Screen Touch Keypad */}
              <div className="grid grid-cols-3 gap-1.5 w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (approverPin.length < 4) {
                        const newPin = approverPin + num;
                        setApproverPin(newPin);
                        if (approverError) setApproverError("");
                      }
                    }}
                    className="h-10 rounded-lg bg-white border border-amber-200 hover:bg-amber-100/70 active:scale-95 font-bold font-mono text-sm text-zinc-800 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setApproverPin("");
                    setApproverError("");
                  }}
                  className="h-10 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 active:scale-95 text-xs font-bold text-zinc-600 transition-all flex items-center justify-center cursor-pointer"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (approverPin.length < 4) {
                      const newPin = approverPin + "0";
                      setApproverPin(newPin);
                      if (approverError) setApproverError("");
                    }
                  }}
                  className="h-10 rounded-lg bg-white border border-amber-200 hover:bg-amber-100/70 active:scale-95 font-bold font-mono text-sm text-zinc-800 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setApproverPin((prev) => prev.slice(0, -1));
                    if (approverError) setApproverError("");
                  }}
                  className="h-10 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 active:scale-95 text-xs font-bold text-zinc-600 transition-all flex items-center justify-center cursor-pointer"
                >
                  ⌫
                </button>
              </div>

              {approverError && (
                <div className="p-2 bg-red-100 text-red-700 rounded-md text-[11px] font-bold flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{approverError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setVoidingOrder(null);
                  setApproverPin("");
                  setApproverError("");
                }}
                disabled={isVoiding}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={isVoiding || approverPin.length !== 4}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isVoiding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                Authorize &amp; Void
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. WIRELESS CUSTOMER SCREEN PAIRING MODAL */}
      {pairModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1.5px] flex items-center justify-center p-4 font-primary animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 flex flex-col items-center text-center gap-5 animate-in zoom-in-95 duration-150">
            
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0B57D0] border border-blue-100 flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-950">Pair Customer Display Screen</h3>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
                Scan this QR code with any iPad, tablet, or phone camera to wirelessly link this register’s live cart.
              </p>
            </div>

            {/* Generated QR Code for Display URL */}
            <div className="w-56 h-56 bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-center relative shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                  typeof window !== "undefined"
                    ? `${window.location.origin}/pos/display?reg=${registerId}`
                    : `https://ib.hsgglobalpteltd.com/pos/display?reg=${registerId}`
                )}`}
                alt="Pairing QR Code"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            {/* Register Identifier Configuration */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-600">Register ID:</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Ready to Sync
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editingRegisterId}
                  onChange={(e) => setEditingRegisterId(e.target.value.toUpperCase().trim())}
                  placeholder="e.g. REG-1, COUNTER-2"
                  className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newReg = editingRegisterId || "REG-1";
                    setRegisterId(newReg);
                    localStorage.setItem("pos_register_id", newReg);
                    showToast(`Register ID updated to ${newReg}`, "success");
                  }}
                  className="h-9 px-3 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Save ID
                </button>
              </div>
            </div>

            {/* Direct URL & Copy Button */}
            <div className="w-full flex items-center justify-between text-xs bg-slate-100/70 p-2.5 rounded-lg border border-slate-200">
              <span className="font-mono text-zinc-600 truncate text-[11px] max-w-[260px]">
                /pos/display?reg={registerId}
              </span>
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/pos/display?reg=${registerId}`;
                  navigator.clipboard.writeText(url);
                  showToast("Pairing link copied to clipboard!", "success");
                }}
                className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-zinc-800 text-[11px] font-bold rounded transition-colors"
              >
                Copy Link
              </button>
            </div>

            <div className="w-full pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setPairModalOpen(false)}
                className="w-full py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 9. FULLSCREEN PROMPT MODAL (1-MINUTE REMINDER) */}
      {fullscreenPromptOpen && !isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1.5px] flex items-center justify-center p-4 font-primary animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-[#0B57D0]/10 border border-[#0B57D0]/20 flex items-center justify-center text-[#0B57D0]">
              <Maximize className="w-7 h-7" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-zinc-950">Switch to Fullscreen Mode?</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                For the best cashier checkout experience and to prevent accidental browser tab switching, switch this terminal to Fullscreen.
              </p>
            </div>

            <div className="flex gap-2 w-full mt-2">
              <button
                type="button"
                onClick={() => setFullscreenPromptOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Later
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="flex-1 py-2.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Maximize className="w-4 h-4" />
                <span>Go Fullscreen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GiftIcon(props: any) {
  return <Sparkles {...props} />;
}
