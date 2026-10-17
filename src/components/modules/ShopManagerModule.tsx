"use client";

import * as React from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Edit2,
  X,
  Save,
  Tag,
  Building2,
  Sliders,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  Percent,
  Power,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Edit3,
  ShoppingBag,
  Pencil,
  Copy,
  Mail,
  Check,
  ChevronUp,
  ChevronDown,
  Upload
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { NavigationTabs, TabItem } from "../navigation-tabs";
import { ConfirmDialog } from "../confirm-dialog";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

function formatOrderDate(ts: any) {
  if (!ts) return "-";
  const num = Number(ts);
  const d = isNaN(num) ? new Date(ts) : new Date(num);
  if (isNaN(d.getTime())) return String(ts);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

interface MasterBrand {
  id: string;
  display_name: string;
  logo_image?: string;
}

interface ShopBrand {
  brand_id: string;
  brand_name: string;
  allow_custom_mix: boolean;
  mix_carton_size: number;
  sort_order: number;
  is_active: boolean;
}

interface MasterProduct {
  sku: string;
  display_name: string;
  brands_id: string;
  image: string;
  carton: string;
  product_meta: any;
  status: string;
  has_bcrs?: boolean;
}

interface ShopProduct {
  sku: string;
  brand_id: string;
  price_per_piece: number;
  slash_price?: number | null;
  status: "in_stock" | "out_of_stock" | "hidden";
  sort_order: number;
  badge_text: string;
  custom_display_name?: string;
  custom_image?: string;
  custom_meta?: any;
  has_bcrs?: boolean;
}

interface PriceRule {
  id: string;
  name: string;
  rule_type: "volume_tier" | "spend_threshold" | "promo_code";
  min_cartons: number;
  min_spend: number;
  promo_code: string;
  discount_type: "flat_amount" | "percentage" | "per_carton";
  discount_value: number;
  is_active: boolean;
  sort_order: number;
  usage_limit?: number | null;
  used_count?: number;
  claimed_orders?: any[];
}

interface ShopSettings {
  id: string;
  is_store_open: boolean;
  pause_notice_message: string;
  company_name: string;
  company_uen: string;
  company_address: string;
  whatsapp_number: string;
  support_email: string;
  paynow_uen: string;
  paynow_merchant_name: string;
  order_ref_prefix: string;
  min_order_cartons: number;
  max_order_cartons?: number;
  max_order_amount?: number;
  delivery_fee: number;
  free_delivery_threshold: number;
  estimated_delivery_days: string;
  delivery_terms: string;
  refund_policy: string;
  hero_slides?: HeroSlide[];
  warehouse_address?: string;
  store_person_contact?: string;
  store_person_name?: string;
  pickup_hours?: string;
  allow_self_pickup?: boolean;
  show_hero_section?: boolean;
  paynow_inbound_email?: string;
  paynow_sender_whitelist?: string[];
  paynow_auto_approve?: boolean;
  paynow_email_logs?: any[];
  cart_upsell_enabled?: boolean;
  cart_upsell_title?: string;
  cart_upsell_subtitle?: string;
  cart_upsell_items?: CartUpsellItem[];
}

export interface CartUpsellItem {
  sku: string;
  display_name: string;
  image: string;
  price_per_piece: number;
  max_qty: number;
}

interface HeroSlide {
  id: string;
  badge_text?: string;
  title: string;
  subtitle: string;
  bg_image?: string;
  cta_text?: string;
  cta_link?: string;
  tags?: string[];
}

export function ShopManagerModule({ profile }: { profile?: any }) {
  const [activeTab, setActiveTab] = React.useState<"brands" | "rules" | "settings">("brands");
  const [loading, setLoading] = React.useState<boolean>(true);
  const [saving, setSaving] = React.useState<boolean>(false);

  // Hero Slider State (Min 1, Max 5)
  const [slides, setSlides] = React.useState<HeroSlide[]>([
    {
      id: "slide-1",
      badge_text: "Official Direct Storefront",
      title: "HSG GLOBAL GOODS DIRECT TO YOUR DOOR.",
      subtitle:
        "Enjoy wholesale direct carton pricing across our signature beverage & consumer goods brands. Mix any combination of flavors in a 24-piece carton or buy standard cases with fast islandwide delivery.",
      bg_image: "",
      cta_text: "Shop Cartons",
      cta_link: "",
      tags: ["Min. 2 Cartons", "Loose Mix & Match", "Dynamic SGQR"]
    }
  ]);
  const [selectedSlidePreviewIdx, setSelectedSlidePreviewIdx] = React.useState<number>(0);

  // Master & Shop Data
  const [masterBrands, setMasterBrands] = React.useState<MasterBrand[]>([]);
  const [shopBrands, setShopBrands] = React.useState<ShopBrand[]>([]);
  const [masterProducts, setMasterProducts] = React.useState<MasterProduct[]>([]);
  const [shopProducts, setShopProducts] = React.useState<ShopProduct[]>([]);
  const [priceRules, setPriceRules] = React.useState<PriceRule[]>([]);
  const [settings, setSettings] = React.useState<ShopSettings>({
    id: "default",
    is_store_open: true,
    pause_notice_message: "We are currently preparing existing orders. Shop will reopen soon.",
    company_name: "HSG GLOBAL PTE. LTD.",
    company_uen: "202301234K",
    company_address: "Singapore",
    whatsapp_number: "+65 9123 4567",
    support_email: "sales@hsgglobal.sg",
    paynow_uen: "202301234K",
    paynow_merchant_name: "HSG GLOBAL PTE LTD",
    order_ref_prefix: "HSG-",
    min_order_cartons: 2,
    max_order_cartons: 50,
    max_order_amount: 1000,
    delivery_fee: 5.0,
    free_delivery_threshold: 50.0,
    estimated_delivery_days: "2 - 3 business days",
    delivery_terms: "Islandwide delivery within 2-3 business days. Delivery hours: Mon-Fri 10am-7pm.",
    refund_policy: "Goods once sold are non-refundable except for damaged or defective bottles reported within 24 hours of delivery.",
    warehouse_address: "9 Eunos Ave 8A, EUNOS INDUSTRIAL ESTATE, Singapore 409461",
    store_person_contact: "+65 8234 5678",
    store_person_name: "Warehouse Store Person",
    pickup_hours: "Mon - Fri: 10:00 AM - 6:00 PM",
    allow_self_pickup: true,
    show_hero_section: false,
    paynow_inbound_email: "paynow-alerts@hsgglobal.sg",
    paynow_sender_whitelist: ["alerts@dbs.com", "posb.alerts@posb.com.sg", "ibanking@uobgroup.com", "alerts@ocbc.com", "paynow"],
    paynow_auto_approve: true,
    paynow_email_logs: [],
    cart_upsell_enabled: false,
    cart_upsell_title: "Try Something New",
    cart_upsell_subtitle: "Add single pieces to your delivery",
    cart_upsell_items: []
  });

  // PayNow Email Parser Sandbox State
  const [testEmailText, setTestEmailText] = React.useState<string>("");
  const [testEmailSender, setTestEmailSender] = React.useState<string>("alerts@dbs.com");
  const [testEmailSubject, setTestEmailSubject] = React.useState<string>("PayNow Payment Received");
  const [testResult, setTestResult] = React.useState<any | null>(null);
  const [isTestingParser, setIsTestingParser] = React.useState<boolean>(false);

  // Modals
  const [addBrandModalOpen, setAddBrandModalOpen] = React.useState(false);
  const [selectedBrandToAdd, setSelectedBrandToAdd] = React.useState<string>("");
  const [ruleModalOpen, setRuleModalOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<PriceRule | null>(null);
  const [viewingClaimsRule, setViewingClaimsRule] = React.useState<PriceRule | null>(null);
  const [editingProductModal, setEditingProductModal] = React.useState<{
    shopProduct: ShopProduct;
    masterProduct?: MasterProduct;
  } | null>(null);
  const [syncToMaster, setSyncToMaster] = React.useState(false);

  // Confirm Dialog State (Replaces native browser confirm())
  const [confirmOpen, setConfirmOpen] = React.useState<boolean>(false);
  const [confirmConfig, setConfirmConfig] = React.useState<{
    title: string;
    description: string;
    variant?: "danger" | "default" | "dark" | "primary";
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);

  const requestConfirm = (config: {
    title: string;
    description: string;
    variant?: "danger" | "default" | "dark" | "primary";
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }) => {
    setConfirmConfig(config);
    setConfirmOpen(true);
  };

  // Edit Mode state (Default: Read Mode)
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);

  // TopBar Module Tabs configuration
  const MODULE_TABS: TabItem[] = [
    { id: "brands", label: "Products" },
    { id: "rules", label: "Price Rules" },
    { id: "settings", label: "Settings" }
  ];

  // Tab dynamic header titles & subtexts
  const TAB_HEADERS: Record<"brands" | "rules" | "settings", { title: string; subtext: string }> = {
    brands: {
      title: "Products",
      subtext: "Manage storefront products, carton piece counts, pricing, and stock visibility."
    },
    rules: {
      title: "Price Rules",
      subtext: "Set automatic carton bundle volume discounts or promo codes for customers at checkout."
    },
    settings: {
      title: "Settings",
      subtext: "Configure storefront operations, delivery rules, self-pickup, PayNow SGQR, and hero slider."
    }
  };

  // Fetch all shop admin data
  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/data`);
      if (!res.ok) throw new Error("Failed to load shop admin data");
      const data = await res.json();
      if (data.success) {
        setMasterBrands(data.master_brands || []);
        setShopBrands(data.shop_brands || []);
        setMasterProducts(data.master_products || []);
        setShopProducts(data.shop_products || []);
        setPriceRules(data.price_rules || []);
        if (data.settings) {
          setSettings({
            ...data.settings,
            show_hero_section: data.settings.show_hero_section ?? false
          });
          if (Array.isArray(data.settings.hero_slides) && data.settings.hero_slides.length > 0) {
            setSlides(data.settings.hero_slides);
          }
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to fetch shop data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Global Header Refresh Event Listener
  React.useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchData();
    };
    window.addEventListener("db-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("db-refresh", handleGlobalRefresh);
  }, [fetchData]);

  // Brand Management
  const handleAddBrand = async () => {
    if (!selectedBrandToAdd) return;
    const mb = masterBrands.find((b) => b.id === selectedBrandToAdd);
    if (!mb) return;

    setSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/brand/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: mb.id,
          brand_name: mb.display_name,
          allow_custom_mix: true,
          mix_carton_size: 24,
          is_active: true
        })
      });
      if (!res.ok) throw new Error("Failed to add brand to shop");
      showToast(`${mb.display_name} added to shop!`, "success");
      setAddBrandModalOpen(false);
      setSelectedBrandToAdd("");
      await fetchData();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBrandMix = async (brand: ShopBrand) => {
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/brand/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand.brand_id,
          allow_custom_mix: !brand.allow_custom_mix,
          mix_carton_size: brand.mix_carton_size,
          is_active: brand.is_active
        })
      });
      if (!res.ok) throw new Error("Failed to update brand mix rule");
      setShopBrands((prev) =>
        prev.map((b) => (b.brand_id === brand.brand_id ? { ...b, allow_custom_mix: !b.allow_custom_mix } : b))
      );
      showToast("Custom mix setting updated", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  const handleRemoveBrand = (brandId: string, brandName?: string) => {
    requestConfirm({
      title: "Remove Brand from Shop",
      description: `Are you sure you want to remove ${brandName ? `"${brandName}"` : "this brand"} and its products from the shop?`,
      variant: "danger",
      confirmText: "Remove",
      onConfirm: async () => {
        try {
          const res = await fetch(`${WORKER_URL}/api/shop/admin/brand/toggle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ brand_id: brandId, delete_brand: true })
          });
          if (!res.ok) throw new Error("Failed to remove brand");
          showToast("Brand removed from shop", "success");
          await fetchData();
        } catch (e: any) {
          showToast(e.message, "error");
        }
      }
    });
  };

  // Product In-Table Local State Updates (persisted on "Save Changes")
  const handleUpdateProductPriceLocal = (sku: string, price: number) => {
    setShopProducts((prev) => prev.map((p) => (p.sku === sku ? { ...p, price_per_piece: price } : p)));
  };

  const handleUpdateProductStatusLocal = (
    sku: string,
    status: "in_stock" | "out_of_stock" | "hidden"
  ) => {
    setShopProducts((prev) => prev.map((p) => (p.sku === sku ? { ...p, status } : p)));
  };

  const handleUpdateProductBadgeLocal = (sku: string, badge_text: string) => {
    setShopProducts((prev) => prev.map((p) => (p.sku === sku ? { ...p, badge_text } : p)));
  };

  const handleUpdateProductSlashPriceLocal = (sku: string, slash_price: number | null) => {
    setShopProducts((prev) =>
      prev.map((p) =>
        p.sku === sku
          ? {
              ...p,
              slash_price,
              custom_meta: { ...(p.custom_meta || {}), slash_price }
            }
          : p
      )
    );
  };

  const handleUpdateProductBcrsLocal = (sku: string, has_bcrs: boolean) => {
    setShopProducts((prev) =>
      prev.map((p) =>
        p.sku === sku
          ? {
              ...p,
              has_bcrs,
              custom_meta: { ...(p.custom_meta || {}), has_bcrs }
            }
          : p
      )
    );
  };

  // TopBar Save / Cancel Handlers for Edit Mode
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      if (activeTab === "brands") {
        // Batch save all current shop products
        const res = await fetch(`${WORKER_URL}/api/shop/admin/products/batch-save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ products: shopProducts })
        });
        if (!res.ok) throw new Error("Failed to save product updates");
        showToast("Products saved successfully", "success");
      } else if (activeTab === "settings") {
        const res = await fetch(`${WORKER_URL}/api/shop/admin/settings/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...settings, hero_slides: slides })
        });
        if (!res.ok) throw new Error("Failed to save store settings");
        showToast("Settings and hero slider saved successfully", "success");
      }
      setIsEditMode(false);
      await fetchData();
    } catch (e: any) {
      showToast(e.message || "Failed to save changes", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    fetchData();
    showToast("Edits cancelled", "info");
  };

  // Price Rule Management
  const handleSavePriceRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !editingRule.name) return;

    setSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/price-rule/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingRule)
      });
      if (!res.ok) throw new Error("Failed to save price rule");
      showToast("Price rule saved successfully", "success");
      setRuleModalOpen(false);
      setEditingRule(null);
      await fetchData();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePriceRule = (id: string, ruleName?: string) => {
    requestConfirm({
      title: "Delete Price Rule",
      description: `Are you sure you want to delete ${ruleName ? `the rule "${ruleName}"` : "this price rule"}? This action cannot be undone.`,
      variant: "danger",
      confirmText: "Delete Rule",
      onConfirm: async () => {
        try {
          const res = await fetch(`${WORKER_URL}/api/shop/admin/price-rule/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
          });
          if (!res.ok) throw new Error("Failed to delete price rule");
          showToast("Price rule removed", "success");
          await fetchData();
        } catch (e: any) {
          showToast(e.message, "error");
        }
      }
    });
  };

  const handleToggleRuleActive = async (rule: PriceRule) => {
    const newActive = !rule.is_active;
    // Optimistic UI update
    setPriceRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: newActive } : r))
    );
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/price-rule/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, is_active: newActive })
      });
      if (!res.ok) throw new Error("Failed to toggle rule status");
      showToast(newActive ? `Rule "${rule.name}" activated` : `Rule "${rule.name}" deactivated`, "success");
      await fetchData();
    } catch (e: any) {
      showToast(e.message || "Failed to update rule status", "error");
      await fetchData();
    }
  };

  // Sort price rules so active rules are always on top
  const sortedPriceRules = React.useMemo(() => {
    return [...priceRules].sort((a, b) => {
      if (a.is_active === b.is_active) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      }
      return a.is_active ? -1 : 1;
    });
  }, [priceRules]);

  // Active Shop Brand IDs
  const activeShopBrandIds = React.useMemo(() => {
    return new Set(shopBrands.filter((b) => b.is_active !== false).map((b) => b.brand_id));
  }, [shopBrands]);

  // Products belonging strictly to the active shop list (excluding hidden ones)
  const shopListProducts = React.useMemo(() => {
    return masterProducts
      .filter((mp) => activeShopBrandIds.has(mp.brands_id) && mp.status !== "inactive")
      .map((mp) => {
        const sp = shopProducts.find((p) => p.sku === mp.sku);
        return {
          sku: mp.sku,
          brand_id: mp.brands_id,
          display_name: sp?.custom_display_name || mp.display_name || mp.sku,
          image: sp?.custom_image || mp.image || "",
          price_per_piece: Number(sp?.price_per_piece ?? 2.0),
          status: sp?.status || "in_stock"
        };
      })
      .filter((p) => p.status !== "hidden")
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [masterProducts, activeShopBrandIds, shopProducts]);

  // Store Settings Save
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Sync each upsell item with the latest live shop price and product display info
      const syncedUpsellItems = (settings.cart_upsell_items || []).map((item) => {
        const sp = shopProducts.find((p) => p.sku === item.sku);
        const mp = masterProducts.find((p) => p.sku === item.sku);
        return {
          ...item,
          display_name: sp?.custom_display_name || mp?.display_name || item.display_name || item.sku,
          image: sp?.custom_image || mp?.image || item.image || "",
          price_per_piece: sp?.price_per_piece !== undefined ? Number(sp.price_per_piece) : Number(item.price_per_piece || 2.0),
          max_qty: 6
        };
      });

      const updatedSettings = {
        ...settings,
        cart_upsell_items: syncedUpsellItems,
        hero_slides: slides
      };

      const res = await fetch(`${WORKER_URL}/api/shop/admin/settings/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save store settings");
      }
      setSettings(updatedSettings);
      showToast("Shop settings and hero slider saved successfully", "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Cart Upsell Management (Try Something New, Max 6 SKUs)
  // Strictly restricted to active shop products; price follows shop list
  const handleAddUpsellItem = () => {
    const current = settings.cart_upsell_items || [];
    if (current.length >= 6) {
      showToast("Maximum 6 items allowed for Try Something New", "info");
      return;
    }
    if (shopListProducts.length === 0) {
      showToast("No active products available in the shop list", "info");
      return;
    }
    const usedSkus = new Set(current.map((it) => it.sku));
    const available = shopListProducts.find((p) => !usedSkus.has(p.sku)) || shopListProducts[0];
    if (!available) return;

    const newItem: CartUpsellItem = {
      sku: available.sku,
      display_name: available.display_name,
      image: available.image,
      price_per_piece: available.price_per_piece,
      max_qty: 6
    };

    setSettings((prev) => ({
      ...prev,
      cart_upsell_items: [...(prev.cart_upsell_items || []), newItem]
    }));
    showToast("Upsell item added. Click 'Save Store Settings' to publish.", "info");
  };

  const handleDeleteUpsellItem = (idx: number) => {
    setSettings((prev) => ({
      ...prev,
      cart_upsell_items: (prev.cart_upsell_items || []).filter((_, i) => i !== idx)
    }));
    showToast("Upsell item removed. Click 'Save Store Settings' to publish.", "info");
  };

  const handleMoveUpsellItem = (idx: number, direction: "up" | "down") => {
    const current = [...(settings.cart_upsell_items || [])];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const temp = current[idx];
    current[idx] = current[targetIdx];
    current[targetIdx] = temp;
    setSettings((prev) => ({
      ...prev,
      cart_upsell_items: current
    }));
  };

  const handleSelectUpsellSku = (idx: number, sku: string) => {
    const current = [...(settings.cart_upsell_items || [])];
    const match = shopListProducts.find((p) => p.sku === sku);
    if (!match) return;

    current[idx] = {
      ...current[idx],
      sku: match.sku,
      display_name: match.display_name,
      image: match.image,
      price_per_piece: match.price_per_piece,
      max_qty: 6
    };
    setSettings((prev) => ({
      ...prev,
      cart_upsell_items: current
    }));
  };

  const handleUpdateUpsellField = (idx: number, field: keyof CartUpsellItem, val: any) => {
    const current = [...(settings.cart_upsell_items || [])];
    current[idx] = {
      ...current[idx],
      [field]: val
    };
    setSettings((prev) => ({
      ...prev,
      cart_upsell_items: current
    }));
  };

  // Hero Slider Management (Min 1, Max 5)
  const handleAddSlide = () => {
    if (slides.length >= 5) {
      showToast("Maximum 5 slides allowed for the hero slider", "info");
      return;
    }
    const newSlide: HeroSlide = {
      id: `slide_${Date.now()}`,
      badge_text: "Featured Promotion",
      title: "NEW CAMPAIGN / HEADLINE",
      subtitle: "Special wholesale direct rates on signature goods. Fast islandwide delivery.",
      bg_image: "",
      cta_text: "Shop Cartons",
      cta_link: "",
      tags: ["Wholesale Direct", "Islandwide Delivery"]
    };
    setSlides((prev) => [...prev, newSlide]);
    setSelectedSlidePreviewIdx(slides.length);
    showToast("New slide added. Click 'Save Slider Changes' to publish.", "info");
  };

  const handleDeleteSlide = (idx: number) => {
    if (slides.length <= 1) {
      showToast("Minimum 1 slide is required for the hero slider", "error");
      return;
    }
    const targetSlide = slides[idx];
    requestConfirm({
      title: "Delete Slide",
      description: `Are you sure you want to delete Slide #${idx + 1}${targetSlide?.title ? ` ("${targetSlide.title}")` : ""}? Click "Save Slider Changes" afterwards to publish.`,
      variant: "danger",
      confirmText: "Delete Slide",
      onConfirm: () => {
        setSlides((prev) => prev.filter((_, i) => i !== idx));
        setSelectedSlidePreviewIdx(0);
        showToast("Slide removed. Click 'Save Slider Changes' to publish.", "info");
      }
    });
  };

  const handleMoveSlide = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    setSlides((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
    setSelectedSlidePreviewIdx(targetIdx);
  };

  const handleUpdateSlide = (idx: number, field: keyof HeroSlide, value: any) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  };

  const [uploadingSlideIdx, setUploadingSlideIdx] = React.useState<number | null>(null);

  /**
   * Compresses and converts an image to WebP format targeting a maximum file size (default: 200 KB).
   * Performs proportional downscaling and progressive quality stepping.
   */
  const compressImageToWebP = async (
    file: File,
    maxSizeBytes: number = 200 * 1024
  ): Promise<{ blob: Blob; size: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Failed to load image for compression"));
        img.onload = async () => {
          try {
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            // Target max 1920px width/1080px height for crisp hero banner display without extreme bloat
            const MAX_WIDTH = 1920;
            const MAX_HEIGHT = 1080;
            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
              const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Canvas context not available"));
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            const getBlob = (q: number): Promise<Blob | null> => {
              return new Promise((res) => {
                canvas.toBlob((b) => res(b), "image/webp", q);
              });
            };

            // Step 1: Step through qualities from 0.85 down to 0.25
            let bestBlob: Blob | null = null;
            let quality = 0.85;

            while (quality >= 0.25) {
              const blob = await getBlob(quality);
              if (blob) {
                bestBlob = blob;
                if (blob.size <= maxSizeBytes) {
                  break;
                }
              }
              quality -= 0.08;
            }

            // Step 2: If still > 200KB even at quality 0.25, progressively downscale dimensions
            if (bestBlob && bestBlob.size > maxSizeBytes) {
              let scale = 0.85;
              while (scale >= 0.35 && bestBlob && bestBlob.size > maxSizeBytes) {
                const sw = Math.round(width * scale);
                const sh = Math.round(height * scale);
                canvas.width = sw;
                canvas.height = sh;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, 0, 0, sw, sh);

                const blob = await getBlob(0.70);
                if (blob) {
                  bestBlob = blob;
                  if (blob.size <= maxSizeBytes) break;
                }
                scale -= 0.15;
              }
            }

            if (!bestBlob) {
              reject(new Error("Failed to convert image to WebP"));
              return;
            }

            resolve({ blob: bestBlob, size: bestBlob.size });
          } catch (err) {
            reject(err);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSlideImageUpload = async (idx: number, file: File) => {
    if (!file) return;
    setUploadingSlideIdx(idx);
    try {
      showToast("Converting image to WebP (max 200 KB)...", "info");
      const { blob, size } = await compressImageToWebP(file, 200 * 1024);
      const filename = `shop/hero_${Date.now()}_${idx}.webp`;
      const res = await fetch(`${WORKER_URL}/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        headers: { "Content-Type": "image/webp" },
        body: blob
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || "Failed to upload image");
      }
      handleUpdateSlide(idx, "bg_image", data.url);
      const kb = Math.round(size / 1024);
      showToast(`Image converted to WebP (${kb} KB) and uploaded successfully`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to upload image", "error");
    } finally {
      setUploadingSlideIdx(null);
    }
  };

  const handleSaveSlides = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/settings/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, hero_slides: slides })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to save hero slider settings");
      }
      setSettings((prev) => ({ ...prev, hero_slides: slides }));
      showToast(`Hero slider updated! (${slides.length} slide${slides.length > 1 ? "s" : ""} published)`, "success");
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  // Store Open / Store Close Setter
  const handleSetStoreOpen = async (isOpen: boolean) => {
    if (settings.is_store_open === isOpen) return;
    setSettings((prev) => ({ ...prev, is_store_open: isOpen }));
    try {
      await fetch(`${WORKER_URL}/api/shop/admin/settings/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, is_store_open: isOpen })
      });
      showToast(
        isOpen ? "Store is now Open! Customers can place orders" : "Store is now Closed! Checkout paused",
        isOpen ? "success" : "info"
      );
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Test Bank Email Parser in Sandbox
  const handleTestParser = async () => {
    if (!testEmailText.trim()) {
      showToast("Please paste email body text to test", "info");
      return;
    }
    setIsTestingParser(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/payment-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: testEmailText,
          sender: testEmailSender,
          subject: testEmailSubject
        })
      });
      if (!res.ok) throw new Error("Failed to test parser");
      const data = (await res.json()) as { success: boolean; parsed: any };
      setTestResult(data.parsed);
      showToast("Email text parsed successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to parse email", "error");
    } finally {
      setIsTestingParser(false);
    }
  };

  // Save Detailed Product Modal
  const handleSaveDetailedProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductModal) return;
    setSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/shop/admin/product/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingProductModal.shopProduct,
          sync_to_master: syncToMaster
        })
      });
      if (!res.ok) throw new Error("Failed to save product details");
      showToast("Product details updated", "success");
      setEditingProductModal(null);
      await fetchData();
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* TopBar Navigation Tabs Integration */}
      <NavigationTabs
        tabs={MODULE_TABS}
        activeTabId={activeTab}
        onTabSelect={(id) => setActiveTab(id as "brands" | "rules" | "settings")}
      />

      {/* 1. TOP HEADER BAR (Clean Text Only — Dynamic Title/Subtext from Active Tab) */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">{TAB_HEADERS[activeTab].title}</h1>
          <p className="text-xs text-zinc-500 mt-0.5">{TAB_HEADERS[activeTab].subtext}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isEditMode ? (
            <>
              {activeTab === "rules" && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRule({
                      id: "",
                      name: "",
                      rule_type: "volume_tier",
                      min_cartons: 3,
                      min_spend: 0,
                      promo_code: "",
                      discount_type: "flat_amount",
                      discount_value: 10.0,
                      is_active: true,
                      sort_order: 0,
                      usage_limit: null
                    });
                    setRuleModalOpen(true);
                  }}
                  className="h-9 px-3.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={15} />
                  Add Price Rule
                </button>
              )}
              {activeTab !== "rules" && (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="h-9 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 size={14} />
                  Edit Mode
                </button>
              )}
            </>
          ) : (
            <>
              {activeTab === "brands" && (
                <button
                  type="button"
                  onClick={() => setAddBrandModalOpen(true)}
                  className="h-9 px-3.5 bg-white border border-slate-300 hover:bg-slate-50 text-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={15} />
                  Add Brand to Shop
                </button>
              )}
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="h-9 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saving}
                className="h-9 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3. MAIN CONTENT / VIEWPORT AREA */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-[#F8F9FA]/40">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-500">
            <Loader2 className="animate-spin text-[#0B57D0]" size={24} />
            <span className="text-xs">Loading shop settings & catalog...</span>
          </div>
        ) : (
          <>
            {/* ========================================================= */}
            {/* TAB 1: PRODUCTS                                           */}
            {/* ========================================================= */}
            {activeTab === "brands" && (
              <div className="flex flex-col gap-5 w-full">
                {shopBrands.length === 0 ? (
                  <div className="bg-white rounded-lg border border-dashed border-slate-300 p-8 text-center flex flex-col items-center gap-2">
                    <Package className="text-slate-400" size={32} />
                    <h3 className="text-sm font-bold text-zinc-800">No Brands Added to Shop</h3>
                    <p className="text-xs text-zinc-500 max-w-md">
                      Click the &quot;Add Brand to Shop&quot; button above to select brands from your master database and activate them for online ordering.
                    </p>
                    <button
                      onClick={() => setAddBrandModalOpen(true)}
                      className="mt-2 h-8 px-3 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add Brand
                    </button>
                  </div>
                ) : (
                  shopBrands.map((brand) => {
                    const mb = masterBrands.find((b) => b.id === brand.brand_id);
                    // Filter master products belonging to this brand
                    const prodsForBrand = masterProducts.filter((p) => p.brands_id === brand.brand_id);

                    return (
                      <div
                        key={brand.brand_id}
                        className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden"
                      >
                        {/* Brand Container Header */}
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {mb?.logo_image ? (
                              <img
                                src={mb.logo_image}
                                alt={brand.brand_name}
                                className="w-9 h-9 object-contain bg-white rounded border border-slate-200 p-0.5 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 bg-slate-200 rounded flex items-center justify-center font-bold text-xs text-slate-600 shrink-0">
                                {brand.brand_name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <h3 className="text-sm font-bold text-zinc-900">{brand.brand_name}</h3>
                              <span className="text-xs text-zinc-500">
                                {prodsForBrand.length} products available
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Allow Custom Mix Switch */}
                            <label
                              className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                                isEditMode
                                    ? "bg-white border-slate-200 text-zinc-700 cursor-pointer hover:bg-slate-50"
                                    : "bg-slate-50 border-slate-200 text-zinc-500 cursor-default"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={brand.allow_custom_mix}
                                disabled={!isEditMode}
                                onChange={() => handleToggleBrandMix(brand)}
                                className="rounded text-[#0B57D0] focus:ring-0 cursor-pointer disabled:cursor-default"
                              />
                              <span>Allow Custom Mix</span>
                            </label>

                            {isEditMode && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBrand(brand.brand_id, brand.brand_name)}
                                title="Remove Brand"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Products Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100/60 border-b border-slate-200 text-zinc-600 font-semibold">
                                <th className="px-4 py-2.5 w-12 text-center">Photo</th>
                                <th className="px-4 py-2.5 min-w-[200px]">SKU & Product Name</th>
                                <th className="px-3 py-2.5 w-24 text-center">Carton Pcs</th>
                                <th className="px-3 py-2.5 w-28">Price / Pcs</th>
                                <th className="px-3 py-2.5 w-28">Carton Total</th>
                                <th className="px-3 py-2.5 w-32">Slice Price</th>
                                <th className="px-3 py-2.5 w-20 text-center">BCRS</th>
                                <th className="px-3 py-2.5 w-28">Status</th>
                                <th className="px-3 py-2.5 w-40">Badge Tag</th>
                                {isEditMode && <th className="px-4 py-2.5 w-16 text-center">Actions</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {prodsForBrand.map((mp) => {
                                const sp = shopProducts.find((p) => p.sku === mp.sku) || {
                                  sku: mp.sku,
                                  brand_id: brand.brand_id,
                                  price_per_piece: 2.0,
                                  status: "in_stock",
                                  badge_text: "",
                                  sort_order: 0
                                };

                                const cartonPcs = Number(mp.carton || brand.mix_carton_size || 24);
                                const cartonTotal = (Number(sp.price_per_piece || 2.0) * cartonPcs).toFixed(2);
                                const isBeverage = String(mp.product_meta?.Category || "").toLowerCase().trim() === "beverage";

                                return (
                                  <tr key={mp.sku} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-4 py-2 text-center">
                                      {mp.image ? (
                                        <img
                                          src={sp.custom_image || mp.image}
                                          alt={mp.display_name}
                                          className="w-8 h-8 object-contain rounded bg-white border border-slate-200 mx-auto"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 mx-auto">
                                          N/A
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="font-semibold text-zinc-900">{sp.custom_display_name || mp.display_name}</div>
                                      <div className="text-[10px] text-zinc-500 font-mono">{mp.sku}</div>
                                    </td>
                                    <td className="px-3 py-2 text-center font-medium text-zinc-600">
                                      {cartonPcs} pcs
                                    </td>
                                    <td className="px-3 py-2">
                                      {isEditMode ? (
                                        <div className="flex items-center gap-1">
                                          <span className="text-zinc-500 font-semibold">$</span>
                                          <input
                                            type="number"
                                            step="0.05"
                                            min="0"
                                            value={sp.price_per_piece ?? 2.0}
                                            onChange={(e) =>
                                              handleUpdateProductPriceLocal(mp.sku, parseFloat(e.target.value) || 0)
                                            }
                                            className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                          />
                                        </div>
                                      ) : (
                                        <span className="font-semibold text-zinc-900">
                                          ${Number(sp.price_per_piece || 2.0).toFixed(2)}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 font-semibold text-zinc-900">
                                      ${cartonTotal}
                                    </td>
                                    <td className="px-3 py-2">
                                      {isEditMode ? (
                                        <div className="flex items-center gap-1">
                                          <span className="text-zinc-500 font-semibold text-xs">$</span>
                                          <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            placeholder="Optional"
                                            value={sp.slash_price ?? (sp.custom_meta?.slash_price ?? "")}
                                            onChange={(e) =>
                                              handleUpdateProductSlashPriceLocal(
                                                mp.sku,
                                                e.target.value ? parseFloat(e.target.value) : null
                                              )
                                            }
                                            className="w-20 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                          />
                                        </div>
                                      ) : sp.slash_price && Number(sp.slash_price) > 0 ? (
                                        <span className="font-semibold text-zinc-900">
                                          ${Number(sp.slash_price).toFixed(2)}
                                        </span>
                                      ) : (
                                        <span className="text-zinc-400 text-xs font-mono">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {isBeverage ? (
                                        isEditMode ? (
                                          <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                            <input
                                              type="checkbox"
                                              checked={Boolean(sp.has_bcrs ?? sp.custom_meta?.has_bcrs)}
                                              onChange={(e) => handleUpdateProductBcrsLocal(mp.sku, e.target.checked)}
                                              className="w-4 h-4 rounded text-[#0B57D0] border-slate-300 focus:ring-[#0B57D0] cursor-pointer"
                                              title="Toggle BCRS (+$0.10/bottle deposit)"
                                            />
                                          </label>
                                        ) : Boolean(sp.has_bcrs ?? sp.custom_meta?.has_bcrs) ? (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="BCRS active (+$0.10/bottle deposit)">
                                            <Check size={11} className="stroke-[3]" />
                                            <span>$0.10</span>
                                          </span>
                                        ) : (
                                          <span className="text-zinc-300 text-xs font-mono">—</span>
                                        )
                                      ) : (
                                        <span className="text-zinc-300 text-xs font-mono">—</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {isEditMode ? (
                                        <select
                                          value={sp.status || "in_stock"}
                                          onChange={(e) =>
                                            handleUpdateProductStatusLocal(mp.sku, e.target.value as any)
                                          }
                                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                        >
                                          <option value="in_stock">In Stock</option>
                                          <option value="out_of_stock">Out of Stock</option>
                                          <option value="hidden">Hidden</option>
                                        </select>
                                      ) : sp.status === "out_of_stock" ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                          Out of Stock
                                        </span>
                                      ) : sp.status === "hidden" ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                          Hidden
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          In Stock
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2">
                                      {isEditMode ? (
                                        <input
                                          type="text"
                                          placeholder="e.g. Bestseller"
                                          value={sp.badge_text || ""}
                                          onChange={(e) =>
                                            handleUpdateProductBadgeLocal(mp.sku, e.target.value)
                                          }
                                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                        />
                                      ) : sp.badge_text ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-[#0B57D0] border border-blue-200 text-xs font-semibold">
                                          {sp.badge_text}
                                        </span>
                                      ) : (
                                        <span className="text-zinc-400 text-xs">—</span>
                                      )}
                                    </td>
                                    {isEditMode && (
                                      <td className="px-4 py-2 text-center">
                                        <button
                                          onClick={() => {
                                            setEditingProductModal({
                                              shopProduct: sp,
                                              masterProduct: mp
                                            });
                                            setSyncToMaster(false);
                                          }}
                                          className="p-1.5 text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                          title="Edit Details & Meta"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: PRICE RULES                                        */}
            {/* ========================================================= */}
            {activeTab === "rules" && (
              <div className="flex flex-col gap-4 w-full">
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                  {sortedPriceRules.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-zinc-500">
                      No discount rules currently configured. Click &quot;Add Price Rule&quot; to set up volume savings or promo codes.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-zinc-600 font-semibold">
                            <th className="px-3.5 py-2.5">Rule & Code</th>
                            <th className="px-3.5 py-2.5">Type</th>
                            <th className="px-3.5 py-2.5">Condition</th>
                            <th className="px-3.5 py-2.5">Discount</th>
                            <th className="px-3.5 py-2.5">Claims / Limit</th>
                            <th className="px-3.5 py-2.5">Status</th>
                            <th className="px-3.5 py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedPriceRules.map((rule) => (
                            <tr key={rule.id} className="hover:bg-slate-50/70">
                              <td className="px-3.5 py-2.5">
                                <span className="font-medium text-zinc-900">{rule.name}</span>
                                {rule.promo_code && (
                                  <span className="text-[11px] font-mono text-zinc-500 ml-1.5 font-normal">
                                    ({rule.promo_code})
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 text-zinc-600">
                                {rule.rule_type === "volume_tier"
                                  ? "Volume Tier"
                                  : rule.rule_type === "spend_threshold"
                                  ? "Spend Threshold"
                                  : "Promo Code"}
                              </td>
                              <td className="px-3.5 py-2.5 text-zinc-600">
                                {rule.rule_type === "volume_tier" && `≥ ${rule.min_cartons} ctn`}
                                {rule.rule_type === "spend_threshold" && `≥ $${Number(rule.min_spend).toFixed(2)}`}
                                {rule.rule_type === "promo_code" && (
                                  rule.min_cartons > 0
                                    ? `≥ ${rule.min_cartons} ctn`
                                    : rule.min_spend > 0
                                    ? `≥ $${Number(rule.min_spend).toFixed(2)}`
                                    : "No minimum"
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 text-zinc-800 font-medium">
                                {rule.discount_type === "percentage"
                                  ? `${rule.discount_value}% off`
                                  : rule.discount_type === "per_carton"
                                  ? `-$${Number(rule.discount_value).toFixed(2)} / ctn`
                                  : `-$${Number(rule.discount_value).toFixed(2)} flat`}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingClaimsRule(rule)}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-zinc-700 hover:text-[#0B57D0] hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Click to view claimed orders"
                                >
                                  <ShoppingBag size={13} className="text-zinc-400" />
                                  <span>
                                    {rule.used_count || 0} / {rule.usage_limit ? rule.usage_limit : "Unlimited"}
                                  </span>
                                </button>
                              </td>
                              <td className="px-3.5 py-2.5">
                                <div className="flex items-center gap-1.5 text-zinc-600">
                                  <span
                                    className={`w-2 h-2 rounded-full ${
                                      rule.is_active ? "bg-emerald-500" : "bg-slate-300"
                                    }`}
                                  />
                                  <span>{rule.is_active ? "Active" : "Inactive"}</span>
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <div className="inline-flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRuleActive(rule)}
                                    className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer border ${
                                      rule.is_active
                                        ? "border-slate-200 text-zinc-600 hover:bg-slate-100 hover:text-zinc-900"
                                        : "border-[#0B57D0] text-[#0B57D0] hover:bg-blue-50 font-medium"
                                    }`}
                                  >
                                    {rule.is_active ? "Deactivate" : "Activate"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingRule({ ...rule });
                                      setRuleModalOpen(true);
                                    }}
                                    className="text-zinc-500 hover:text-zinc-800 p-1 hover:bg-slate-100 rounded cursor-pointer"
                                    title="Edit Rule"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePriceRule(rule.id, rule.name)}
                                    className="text-zinc-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded cursor-pointer"
                                    title="Delete Rule"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 3: STORE SETTINGS & HERO SLIDER                       */}
            {/* ========================================================= */}
            {activeTab === "settings" && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start w-full">
                {/* LEFT COLUMN: Store Operations, Delivery & PayNow */}
                <div className="flex flex-col gap-5">
                  {/* CARD 1: Store Operations & Delivery */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">Store Operations & Delivery</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Ordering availability, minimum thresholds, delivery fees, and pickup.</p>
                      </div>
                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-md border border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isEditMode) return showToast("Click 'Edit Mode' above to change settings", "info");
                            handleSetStoreOpen(true);
                          }}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                            settings.is_store_open ? "bg-emerald-600 text-white" : "text-zinc-600 hover:text-zinc-900"
                          } ${isEditMode ? "cursor-pointer" : "cursor-default"}`}
                        >
                          Store Open
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isEditMode) return showToast("Click 'Edit Mode' above to change settings", "info");
                            handleSetStoreOpen(false);
                          }}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                            !settings.is_store_open ? "bg-rose-600 text-white" : "text-zinc-600 hover:text-zinc-900"
                          } ${isEditMode ? "cursor-pointer" : "cursor-default"}`}
                        >
                          Store Closed
                        </button>
                      </div>
                    </div>

                    {!settings.is_store_open && (
                      <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                        <label className="font-medium block mb-1">Pause Notice Message</label>
                        <input
                          type="text"
                          disabled={!isEditMode}
                          value={settings.pause_notice_message || ""}
                          onChange={(e) => setSettings({ ...settings, pause_notice_message: e.target.value })}
                          placeholder="e.g. Orders are temporarily paused. We'll be back shortly!"
                          className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    )}

                    {/* Delivery Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-xs text-zinc-600 block mb-1">Minimum Cartons</label>
                        <input
                          type="number"
                          min="1"
                          disabled={!isEditMode}
                          value={settings.min_order_cartons || 2}
                          onChange={(e) => setSettings({ ...settings, min_order_cartons: parseInt(e.target.value) || 2 })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-600 block mb-1">Delivery Fee ($)</label>
                        <input
                          type="number"
                          step="0.5"
                          disabled={!isEditMode}
                          value={settings.delivery_fee || 5.0}
                          onChange={(e) => setSettings({ ...settings, delivery_fee: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-600 block mb-1">Free Delivery Spend ($)</label>
                        <input
                          type="number"
                          step="1"
                          disabled={!isEditMode}
                          value={settings.free_delivery_threshold || 50.0}
                          onChange={(e) => setSettings({ ...settings, free_delivery_threshold: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-600 block mb-1">Estimated Delivery Days</label>
                        <input
                          type="text"
                          disabled={!isEditMode}
                          value={settings.estimated_delivery_days || ""}
                          onChange={(e) => setSettings({ ...settings, estimated_delivery_days: e.target.value })}
                          placeholder="e.g. 2 - 3 business days"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-600 block mb-1">Max Purchase Limit (Cartons)</label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          disabled={!isEditMode}
                          value={settings.max_order_cartons ?? 50}
                          onChange={(e) => setSettings({ ...settings, max_order_cartons: parseInt(e.target.value) || 50 })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        />
                        <span className="text-[10px] text-zinc-400 mt-0.5 block">
                          Orders over this carton count require contacting sales for bulk special pricing.
                        </span>
                      </div>
                    </div>

                    {/* Self-Pickup Settings */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-zinc-800">Warehouse Self-Pickup</span>
                        <label className="flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            disabled={!isEditMode}
                            checked={settings.allow_self_pickup ?? true}
                            onChange={(e) => setSettings({ ...settings, allow_self_pickup: e.target.checked })}
                            className="rounded text-[#0B57D0]"
                          />
                          <span>Allow Self-Pickup</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-xs text-zinc-500 block mb-1">Collection Address</label>
                          <input
                            type="text"
                            disabled={!isEditMode}
                            value={settings.warehouse_address || ""}
                            onChange={(e) => setSettings({ ...settings, warehouse_address: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                            placeholder="e.g. 9 Eunos Ave 8A, Singapore 409461"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Store Person Contact</label>
                          <input
                            type="text"
                            disabled={!isEditMode}
                            value={settings.store_person_contact || ""}
                            onChange={(e) => setSettings({ ...settings, store_person_contact: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                            placeholder="+65 8234 5678"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Store Person Name</label>
                          <input
                            type="text"
                            disabled={!isEditMode}
                            value={settings.store_person_name || ""}
                            onChange={(e) => setSettings({ ...settings, store_person_name: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                            placeholder="e.g. Warehouse Store Person"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-xs text-zinc-500 block mb-1">Operating Hours</label>
                          <input
                            type="text"
                            disabled={!isEditMode}
                            value={settings.pickup_hours || ""}
                            onChange={(e) => setSettings({ ...settings, pickup_hours: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                            placeholder="e.g. Mon - Fri: 10:00 AM - 6:00 PM"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Company Details & Legal Policies */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="text-xs font-semibold text-zinc-800 mb-2">Company & Contact</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Registered Name</label>
                          <input
                            type="text"
                            disabled={!isEditMode}
                            value={settings.company_name || ""}
                            onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Company UEN</label>
                          <input
                            type="text"
                            disabled={!isEditMode}
                            value={settings.company_uen || ""}
                            onChange={(e) => setSettings({ ...settings, company_uen: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">WhatsApp Order Number</label>
                          <input
                            type="text"
                            disabled={!isEditMode}
                            value={settings.whatsapp_number || ""}
                            onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Support Email</label>
                          <input
                            type="email"
                            disabled={!isEditMode}
                            value={settings.support_email || ""}
                            onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 mt-3">
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Delivery Terms Policy</label>
                          <textarea
                            rows={2}
                            disabled={!isEditMode}
                            value={settings.delivery_terms || ""}
                            onChange={(e) => setSettings({ ...settings, delivery_terms: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-500 block mb-1">Refund & Replacement Policy</label>
                          <textarea
                            rows={2}
                            disabled={!isEditMode}
                            value={settings.refund_policy || ""}
                            onChange={(e) => setSettings({ ...settings, refund_policy: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 2: PayNow & Bank Email Verification */}
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">PayNow & Bank Verification</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">PayNow SGQR code generation and inbound email auto-matching.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Auto-Approval:</span>
                        <button
                          type="button"
                          disabled={!isEditMode}
                          onClick={() => {
                            if (!isEditMode) return showToast("Click 'Edit Mode' above to change settings", "info");
                            setSettings({ ...settings, paynow_auto_approve: !settings.paynow_auto_approve });
                          }}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                            settings.paynow_auto_approve !== false
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-zinc-600"
                          } ${isEditMode ? "cursor-pointer" : "cursor-default"}`}
                        >
                          {settings.paynow_auto_approve !== false ? "Active" : "Paused"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className="text-xs text-zinc-600 block mb-1">PayNow UEN</label>
                        <input
                          type="text"
                          disabled={!isEditMode}
                          value={settings.paynow_uen || ""}
                          onChange={(e) => setSettings({ ...settings, paynow_uen: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-600 block mb-1">Merchant Name</label>
                        <input
                          type="text"
                          disabled={!isEditMode}
                          value={settings.paynow_merchant_name || ""}
                          onChange={(e) => setSettings({ ...settings, paynow_merchant_name: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-600 block mb-1">Order Ref Prefix</label>
                        <input
                          type="text"
                          disabled={!isEditMode}
                          value={settings.order_ref_prefix || ""}
                          onChange={(e) => setSettings({ ...settings, order_ref_prefix: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Email Routing Info & Whitelist */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
                        <div>
                          <span className="text-zinc-600">Inbound Bank Alert Email: </span>
                          <span className="font-mono text-[#0B57D0] font-semibold">{settings.paynow_inbound_email || "paynow-alerts@hsgglobal.sg"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(settings.paynow_inbound_email || "paynow-alerts@hsgglobal.sg");
                            showToast("Inbound email copied", "success");
                          }}
                          className="px-2 py-0.5 bg-white border border-slate-200 hover:bg-slate-100 text-xs text-zinc-700 rounded cursor-pointer"
                        >
                          Copy
                        </button>
                      </div>

                      <div>
                        <label className="text-xs text-zinc-600 block mb-1">Authorized Bank Senders (Whitelist)</label>
                        <input
                          type="text"
                          disabled={!isEditMode}
                          value={
                            Array.isArray(settings.paynow_sender_whitelist)
                              ? settings.paynow_sender_whitelist.join(", ")
                              : (settings.paynow_sender_whitelist || "")
                          }
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              paynow_sender_whitelist: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                            })
                          }
                          placeholder="alerts@dbs.com, posb.alerts@posb.com.sg, ibanking@uobgroup.com, alerts@ocbc.com, paynow"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
                        />
                      </div>

                      {/* Simple Inline Parser Test */}
                      <div className="pt-2">
                        <label className="text-xs text-zinc-600 block mb-1">Test Parser Sandbox</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={testEmailText}
                            onChange={(e) => setTestEmailText(e.target.value)}
                            placeholder="Paste sample bank text, e.g. 'Received SGD 72.00 from John. Ref: HSG-9X28AL'"
                            className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-zinc-800 focus:bg-white focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleTestParser}
                            disabled={isTestingParser || !testEmailText.trim()}
                            className="px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold rounded cursor-pointer disabled:opacity-50"
                          >
                            {isTestingParser ? "Testing..." : "Test"}
                          </button>
                        </div>
                        {testResult && (
                          <div className="mt-2 text-xs font-mono text-zinc-700 bg-slate-50 p-2 rounded border border-slate-200 flex items-center gap-3">
                            <span>Ref: <strong className={testResult.refNumber ? "text-[#0B57D0]" : "text-rose-600"}>{testResult.refNumber || "None"}</strong></span>
                            <span>•</span>
                            <span>Amount: <strong className={testResult.amount ? "text-emerald-700" : "text-rose-600"}>{testResult.amount ? `$${testResult.amount}` : "None"}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Recent Inbound Email Logs Table */}
                      {Array.isArray(settings.paynow_email_logs) && settings.paynow_email_logs.length > 0 && (
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-zinc-800">Recent Inbound Email Logs ({settings.paynow_email_logs.length})</span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await fetch(`${WORKER_URL}/api/shop/admin/settings/save`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ ...settings, paynow_email_logs: [] })
                                  });
                                  setSettings((prev) => ({ ...prev, paynow_email_logs: [] }));
                                  showToast("Inbound email logs cleared", "info");
                                } catch (e: any) {
                                  showToast(e.message, "error");
                                }
                              }}
                              className="text-[11px] text-zinc-500 hover:text-rose-600 cursor-pointer"
                            >
                              Clear Logs
                            </button>
                          </div>
                          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 border-b border-slate-200 text-zinc-500 font-medium">
                                <tr>
                                  <th className="py-1.5 px-2.5">Date</th>
                                  <th className="py-1.5 px-2.5">Sender</th>
                                  <th className="py-1.5 px-2.5">Ref</th>
                                  <th className="py-1.5 px-2.5">Amount</th>
                                  <th className="py-1.5 px-2.5">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                {settings.paynow_email_logs.slice(0, 10).map((log: any, i: number) => (
                                  <tr key={log.id || i} className="hover:bg-slate-50/70">
                                    <td className="py-1.5 px-2.5 text-zinc-500">{formatOrderDate(log.created_at)}</td>
                                    <td className="py-1.5 px-2.5 text-zinc-700 max-w-[120px] truncate" title={log.sender}>{log.sender || "-"}</td>
                                    <td className="py-1.5 px-2.5 font-bold text-[#0B57D0]">{log.ref_number || "-"}</td>
                                    <td className="py-1.5 px-2.5 text-zinc-800">{log.amount ? `$${Number(log.amount).toFixed(2)}` : "-"}</td>
                                    <td className="py-1.5 px-2.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                        log.status === "matched" ? "bg-emerald-100 text-emerald-800" :
                                        log.status === "amount_mismatch" ? "bg-rose-100 text-rose-800" :
                                        log.status === "sender_rejected" ? "bg-zinc-200 text-zinc-700" :
                                        "bg-amber-100 text-amber-800"
                                      }`} title={log.note || log.status}>
                                        {log.status === "matched" ? "Auto-Verified" : log.status || "Unmatched"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Homepage Slides */}
                <div className="flex flex-col gap-4">
                  <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">Homepage Hero Slides</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">Announcement banners displayed at the top of the storefront (1 to 5 slides).</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            disabled={!isEditMode}
                            checked={settings.show_hero_section !== false}
                            onChange={(e) => setSettings({ ...settings, show_hero_section: e.target.checked })}
                            className="rounded text-[#0B57D0]"
                          />
                          <span>Show on Store</span>
                        </label>
                        <span className="text-[11px] font-medium text-zinc-500 bg-slate-100 px-2 py-0.5 rounded">
                          {slides.length} / 5
                        </span>
                        <button
                          type="button"
                          onClick={handleAddSlide}
                          disabled={!isEditMode || slides.length >= 5}
                          className="h-7 px-2.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          + Add Slide
                        </button>
                      </div>
                    </div>

                    {/* Slides List - Clean & Flat */}
                    <div className="divide-y divide-slate-100 mt-2">
                      {slides.map((slide, idx) => (
                        <div key={slide.id || idx} className="py-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-zinc-800">Slide #{idx + 1}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={!isEditMode || idx === 0}
                                onClick={() => handleMoveSlide(idx, "up")}
                                className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 cursor-pointer"
                                title="Move Up"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={!isEditMode || idx === slides.length - 1}
                                onClick={() => handleMoveSlide(idx, "down")}
                                className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30 cursor-pointer"
                                title="Move Down"
                              >
                                <ChevronDown size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={!isEditMode || slides.length <= 1}
                                onClick={() => handleDeleteSlide(idx)}
                                className="p-1 text-rose-500 hover:text-rose-700 disabled:opacity-30 cursor-pointer ml-1"
                                title="Delete Slide"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-[11px] text-zinc-500 block mb-0.5">Headline</label>
                              <input
                                type="text"
                                disabled={!isEditMode}
                                value={slide.title || ""}
                                onChange={(e) => handleUpdateSlide(idx, "title", e.target.value)}
                                placeholder="Headline text"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-zinc-500 block mb-0.5">Badge / Highlight Text</label>
                              <input
                                type="text"
                                disabled={!isEditMode}
                                value={slide.badge_text || ""}
                                onChange={(e) => handleUpdateSlide(idx, "badge_text", e.target.value)}
                                placeholder="e.g. Featured Promotion"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[11px] text-zinc-500 block mb-0.5">Subtitle / Description</label>
                              <input
                                type="text"
                                disabled={!isEditMode}
                                value={slide.subtitle || ""}
                                onChange={(e) => handleUpdateSlide(idx, "subtitle", e.target.value)}
                                placeholder="Description text"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[11px] text-zinc-600 font-semibold block mb-1">Background Image</label>
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                                {slide.bg_image ? (
                                  <div className="relative group w-24 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-2xs">
                                    <img
                                      src={slide.bg_image}
                                      alt="Slide background"
                                      className="w-full h-full object-cover"
                                    />
                                    {isEditMode && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateSlide(idx, "bg_image", "")}
                                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                                        title="Remove image"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                ) : null}

                                <div className="flex-1 w-full space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <label
                                      className={`h-7 px-2.5 rounded-md border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                        !isEditMode || uploadingSlideIdx === idx
                                          ? "bg-slate-100 text-zinc-400 border-slate-200 cursor-not-allowed pointer-events-none"
                                          : "bg-white hover:bg-slate-50 text-zinc-700 border-slate-300 shadow-2xs"
                                      }`}
                                    >
                                      {uploadingSlideIdx === idx ? (
                                        <>
                                          <Loader2 size={12} className="animate-spin text-[#0B57D0]" />
                                          <span>Uploading...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Upload size={12} className="text-[#0B57D0]" />
                                          <span>{slide.bg_image ? "Change Image" : "Upload Image"}</span>
                                        </>
                                      )}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        disabled={!isEditMode || uploadingSlideIdx === idx}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) handleSlideImageUpload(idx, file);
                                          e.target.value = "";
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                    {slide.bg_image && (
                                      <a
                                        href={slide.bg_image}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-[#0B57D0] hover:underline inline-flex items-center gap-1"
                                      >
                                        <span>View</span>
                                        <ExternalLink size={10} />
                                      </a>
                                    )}
                                    <span className="text-[10px] text-zinc-500 font-medium ml-auto">
                                      Auto-WebP (Max 200 KB)
                                    </span>
                                  </div>

                                  <input
                                    type="text"
                                    disabled={!isEditMode}
                                    value={slide.bg_image || ""}
                                    onChange={(e) => handleUpdateSlide(idx, "bg_image", e.target.value)}
                                    placeholder="Or paste direct image URL (https://...)"
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500"
                                  />
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="text-[11px] text-zinc-500 block mb-0.5">Button Label</label>
                              <input
                                type="text"
                                disabled={!isEditMode}
                                value={slide.cta_text || ""}
                                onChange={(e) => handleUpdateSlide(idx, "cta_text", e.target.value)}
                                placeholder="Shop Now"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-zinc-500 block mb-0.5">Key Highlights (Comma-separated)</label>
                              <input
                                type="text"
                                disabled={!isEditMode}
                                value={(slide.tags || []).join(", ")}
                                onChange={(e) =>
                                  handleUpdateSlide(
                                    idx,
                                    "tags",
                                    e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                                  )
                                }
                                placeholder="e.g. Min 2 Cartons, Free Delivery"
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cart Upsell Shelf: Try Something New (Max 6 SKUs) */}
                  <div className="border-t border-slate-200 pt-5 mt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900">Try Something New (Cart Upsell)</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Featured single-piece items shown in customer cart. Customers must fulfill minimum cartons to checkout.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            disabled={!isEditMode}
                            checked={Boolean(settings.cart_upsell_enabled)}
                            onChange={(e) => setSettings({ ...settings, cart_upsell_enabled: e.target.checked })}
                            className="rounded text-[#0B57D0]"
                          />
                          <span>Show in Cart</span>
                        </label>
                        <span className="text-[11px] font-medium text-zinc-500 bg-slate-100 px-2 py-0.5 rounded">
                          {(settings.cart_upsell_items || []).length} / 6
                        </span>
                        <button
                          type="button"
                          onClick={handleAddUpsellItem}
                          disabled={!isEditMode || (settings.cart_upsell_items || []).length >= 6}
                          className="h-7 px-2.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          + Add Item
                        </button>
                      </div>
                    </div>

                    {(!settings.cart_upsell_items || settings.cart_upsell_items.length === 0) ? (
                      <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-zinc-500 mt-2">
                        No upsell items configured yet. Click <strong>+ Add Item</strong> above to select up to 6 single-piece products for customers to try in their cart.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                        {settings.cart_upsell_items.map((item, uIdx) => {
                          const shopProd = shopListProducts.find((p) => p.sku === item.sku);
                          const livePrice = Number(shopProd?.price_per_piece ?? item.price_per_piece ?? 0);
                          const displayImg = shopProd?.image || masterProducts.find((p) => p.sku === item.sku)?.image || item.image;
                          const displayName = shopProd?.display_name || masterProducts.find((p) => p.sku === item.sku)?.display_name || item.display_name;

                          return (
                            <div key={item.sku || uIdx} className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-2.5 relative">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                  Slot #{uIdx + 1}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={!isEditMode || uIdx === 0}
                                    onClick={() => handleMoveUpsellItem(uIdx, "up")}
                                    className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-20 cursor-pointer rounded hover:bg-slate-50 transition-colors"
                                    title="Move Left/Up"
                                  >
                                    <ChevronUp size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!isEditMode || uIdx === (settings.cart_upsell_items?.length || 0) - 1}
                                    onClick={() => handleMoveUpsellItem(uIdx, "down")}
                                    className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-20 cursor-pointer rounded hover:bg-slate-50 transition-colors"
                                    title="Move Right/Down"
                                  >
                                    <ChevronDown size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!isEditMode}
                                    onClick={() => handleDeleteUpsellItem(uIdx)}
                                    className="p-1 text-rose-500 hover:text-rose-700 disabled:opacity-20 cursor-pointer ml-1 rounded hover:bg-rose-50 transition-colors"
                                    title="Remove from upsell"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5">
                                <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                  {displayImg ? (
                                    <img src={displayImg} alt={displayName} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package size={18} className="text-zinc-400" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <select
                                    disabled={!isEditMode}
                                    value={item.sku}
                                    onChange={(e) => handleSelectUpsellSku(uIdx, e.target.value)}
                                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 disabled:bg-slate-50 disabled:text-zinc-500 truncate focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                  >
                                    <option value="">-- Choose Product --</option>
                                    {shopListProducts.map((sp) => (
                                      <option key={sp.sku} value={sp.sku}>
                                        {sp.display_name} (${Number(sp.price_per_piece).toFixed(2)})
                                      </option>
                                    ))}
                                    {item.sku && !shopListProducts.some((p) => p.sku === item.sku) && (
                                      <option value={item.sku}>
                                        {item.display_name || item.sku} (Inactive / Not in shop)
                                      </option>
                                    )}
                                  </select>
                                </div>
                              </div>

                              {/* Live Price: Follows Shop List, Read-Only */}
                              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
                                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Shop Price:</span>
                                <span className="font-bold text-zinc-900 font-mono text-sm">
                                  ${livePrice.toFixed(2)}
                                  <span className="text-[11px] font-normal text-zinc-500 font-sans ml-1">/ pc</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD BRAND TO SHOP                                  */}
      {/* ========================================================= */}
      {addBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900">Add Brand to Shop</h3>
              <button
                onClick={() => setAddBrandModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                  Select Master Brand:
                </label>
                <select
                  value={selectedBrandToAdd}
                  onChange={(e) => setSelectedBrandToAdd(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                >
                  <option value="">-- Choose Brand --</option>
                  {masterBrands
                    .filter((mb) => !shopBrands.some((sb) => sb.brand_id === mb.id))
                    .map((mb) => (
                      <option key={mb.id} value={mb.id}>
                        {mb.display_name} ({mb.id})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Adding a brand will automatically make all its master catalog SKUs available to configure in the shop.
                </p>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setAddBrandModalOpen(false)}
                className="h-8 px-3 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-zinc-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBrand}
                disabled={!selectedBrandToAdd || saving}
                className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Add Brand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT PRICE RULE                              */}
      {/* ========================================================= */}
      {ruleModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900">
                {editingRule.id ? "Edit Price Rule" : "Create Price Rule"}
              </h3>
              <button
                onClick={() => setRuleModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePriceRule} className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3-Carton Bundle Saver"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-zinc-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Trigger Type</label>
                  <select
                    value={editingRule.rule_type}
                    onChange={(e) => setEditingRule({ ...editingRule, rule_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="volume_tier">Carton Volume Tier</option>
                    <option value="spend_threshold">Spend Threshold ($)</option>
                    <option value="promo_code">Promo / Voucher Code</option>
                  </select>
                </div>

                {editingRule.rule_type === "volume_tier" && (
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Minimum Cartons</label>
                    <input
                      type="number"
                      min="1"
                      value={editingRule.min_cartons}
                      onChange={(e) => setEditingRule({ ...editingRule, min_cartons: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                )}

                {editingRule.rule_type === "spend_threshold" && (
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 block mb-1">Minimum Subtotal ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRule.min_spend}
                      onChange={(e) => setEditingRule({ ...editingRule, min_spend: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                )}

                {editingRule.rule_type === "promo_code" && (
                  <div className="grid grid-cols-2 gap-3 col-span-2">
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 block mb-1">Promo Code</label>
                      <input
                        type="text"
                        placeholder="e.g. LAUNCH2026"
                        value={editingRule.promo_code}
                        onChange={(e) => setEditingRule({ ...editingRule, promo_code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 block mb-1">Minimum Cartons (Optional)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 3 (leave empty for any)"
                        value={editingRule.min_cartons || ""}
                        onChange={(e) => setEditingRule({ ...editingRule, min_cartons: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Discount Calculation</label>
                  <select
                    value={editingRule.discount_type}
                    onChange={(e) => setEditingRule({ ...editingRule, discount_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="flat_amount">Flat Dollar Off ($)</option>
                    <option value="percentage">Percentage Off (%)</option>
                    <option value="per_carton">Per Carton Off ($/ctn)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Discount Value</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editingRule.discount_value}
                    onChange={(e) => setEditingRule({ ...editingRule, discount_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Usage Limit (Claims)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Unlimited (leave empty or 0)"
                  value={editingRule.usage_limit || ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setEditingRule({ ...editingRule, usage_limit: isNaN(val) || val <= 0 ? null : val });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <p className="text-[11px] text-zinc-400 mt-1">Leave empty or 0 for unlimited claims.</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rule_is_active"
                  checked={editingRule.is_active}
                  onChange={(e) => setEditingRule({ ...editingRule, is_active: e.target.checked })}
                  className="w-4 h-4 text-[#0B57D0] rounded border-slate-300 focus:ring-[#0B57D0] cursor-pointer"
                />
                <label htmlFor="rule_is_active" className="text-xs font-medium text-zinc-700 cursor-pointer">
                  Rule is Active
                </label>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 -mx-5 -mb-5 flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setRuleModalOpen(false)}
                  className="h-8 px-3 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VIEW RULE CLAIMS & ORDERS                          */}
      {/* ========================================================= */}
      {viewingClaimsRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Rule Claims & Usage History</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  <span className="font-medium text-zinc-700">{viewingClaimsRule.name}</span>
                  {viewingClaimsRule.promo_code && (
                    <span className="font-mono text-zinc-500 ml-1.5 font-normal">
                      ({viewingClaimsRule.promo_code})
                    </span>
                  )}
                  {" • "}
                  {viewingClaimsRule.used_count || 0} claim{(viewingClaimsRule.used_count || 0) === 1 ? "" : "s"} of{" "}
                  {viewingClaimsRule.usage_limit ? viewingClaimsRule.usage_limit : "Unlimited"}
                </p>
              </div>
              <button
                onClick={() => setViewingClaimsRule(null)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer p-1 rounded-md hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {!viewingClaimsRule.claimed_orders || viewingClaimsRule.claimed_orders.length === 0 ? (
                <div className="border border-dashed border-slate-200 rounded-lg p-8 text-center text-xs text-zinc-500">
                  No customer orders have claimed this price rule yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-zinc-600 font-semibold">
                        <th className="px-3 py-2.5">Order Ref</th>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Customer</th>
                        <th className="px-3 py-2.5 text-center">Cartons</th>
                        <th className="px-3 py-2.5 text-right">Discount Saved</th>
                        <th className="px-3 py-2.5 text-right">Total Amount</th>
                        <th className="px-3 py-2.5 text-center">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingClaimsRule.claimed_orders.map((order: any, idx: number) => (
                        <tr key={order.order_ref || idx} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2 font-mono font-medium text-zinc-900">{order.order_ref}</td>
                          <td className="px-3 py-2 text-zinc-500">{formatOrderDate(order.created_at)}</td>
                          <td className="px-3 py-2">
                            <div className="text-zinc-800 font-medium">{order.customer_name || "Customer"}</div>
                            {order.customer_phone && (
                              <div className="text-[11px] text-zinc-400">{order.customer_phone}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center text-zinc-700">{order.total_cartons} ctn</td>
                          <td className="px-3 py-2 text-right text-emerald-600 font-medium">
                            -${Number(order.discount_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-zinc-900">
                            ${Number(order.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                order.payment_status === "paid"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {order.payment_status === "paid" ? "Paid" : "Pending"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewingClaimsRule(null)}
                className="h-8 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-zinc-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT PRODUCT DETAILS & MASTER SYNC                 */}
      {/* ========================================================= */}
      {editingProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Edit Product Details</h3>
                <span className="text-[10px] text-zinc-500 font-mono">{editingProductModal.shopProduct.sku}</span>
              </div>
              <button
                onClick={() => setEditingProductModal(null)}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveDetailedProduct} className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Display Title (Storefront)</label>
                <input
                  type="text"
                  value={
                    editingProductModal.shopProduct.custom_display_name ||
                    editingProductModal.masterProduct?.display_name ||
                    ""
                  }
                  onChange={(e) =>
                    setEditingProductModal({
                      ...editingProductModal,
                      shopProduct: { ...editingProductModal.shopProduct, custom_display_name: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Product Image URL</label>
                <input
                  type="text"
                  value={
                    editingProductModal.shopProduct.custom_image ||
                    editingProductModal.masterProduct?.image ||
                    ""
                  }
                  onChange={(e) =>
                    setEditingProductModal({
                      ...editingProductModal,
                      shopProduct: { ...editingProductModal.shopProduct, custom_image: e.target.value }
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Slice Price (Discounted Carton Price)
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 font-semibold text-xs">$</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="Optional (e.g. 42.00)"
                    value={
                      editingProductModal.shopProduct.slash_price ??
                      (editingProductModal.shopProduct.custom_meta?.slash_price ?? "")
                    }
                    onChange={(e) =>
                      setEditingProductModal({
                        ...editingProductModal,
                        shopProduct: {
                          ...editingProductModal.shopProduct,
                          slash_price: e.target.value ? parseFloat(e.target.value) : null
                        }
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Leave empty to use regular carton price ($price/pc × carton pcs).
                </p>
              </div>

              {String(editingProductModal.masterProduct?.product_meta?.Category || (editingProductModal.masterProduct as any)?.category || "").toLowerCase().trim() === "beverage" && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(
                        editingProductModal.shopProduct.has_bcrs ??
                        editingProductModal.shopProduct.custom_meta?.has_bcrs
                      )}
                      onChange={(e) =>
                        setEditingProductModal({
                          ...editingProductModal,
                          shopProduct: {
                            ...editingProductModal.shopProduct,
                            has_bcrs: e.target.checked,
                            custom_meta: {
                              ...(editingProductModal.shopProduct.custom_meta || {}),
                              has_bcrs: e.target.checked
                            }
                          }
                        })
                      }
                      className="w-4 h-4 rounded text-[#0B57D0] border-slate-300 focus:ring-[#0B57D0]"
                    />
                    <span>Beverage Container Return Scheme (BCRS)</span>
                  </label>
                  <p className="text-[11px] text-zinc-500 mt-1 pl-6">
                    Applies a refundable $0.10 deposit per bottle/can (0% tax) to this SKU.
                  </p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-zinc-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncToMaster}
                    onChange={(e) => setSyncToMaster(e.target.checked)}
                    className="rounded text-[#0B57D0]"
                  />
                  <span>Sync updates directly to master products database</span>
                </label>
                <p className="text-[11px] text-zinc-500 mt-1 pl-6">
                  When enabled, changes to the display title and image will update the master product record across all modules.
                </p>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 -mx-5 -mb-5 flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingProductModal(null)}
                  className="h-8 px-3 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg text-xs font-semibold text-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Overlay */}
      {confirmConfig && (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={confirmConfig.title}
          description={confirmConfig.description}
          variant={confirmConfig.variant || "danger"}
          confirmText={confirmConfig.confirmText || "Confirm"}
          cancelText={confirmConfig.cancelText || "Cancel"}
          onConfirm={confirmConfig.onConfirm}
        />
      )}
    </div>
  );
}
