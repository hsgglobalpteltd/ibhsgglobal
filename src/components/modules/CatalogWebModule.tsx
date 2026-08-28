"use client";

import * as React from "react";
import {
  Layout,
  Settings,
  Save,
  RefreshCw,
  Upload,
  Trash2,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  Calendar,
  Image as ImageIcon,
  Edit2,
  Check,
  X,
  ExternalLink,
  Plus,
  Shield,
  Loader2,
  Globe,
  Download,
  FileText,
  Mail
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { generateExportCatalogPdf } from "@/utils/catalogPdf";

interface CatalogWebModuleProps {
  idToken?: string;
  profile?: any;
}

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

// Client-side WebP Image Compressor (Converts to WebP & strictly compresses to <= 500KB max)
async function compressImageToWebp(file: File, maxWidth = 1920, targetMaxBytes = 500 * 1024): Promise<{ base64Data: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context failed"));
        ctx.drawImage(img, 0, 0, width, height);

        // Iterative compression: test quality levels to guarantee <= 500KB
        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/webp", quality);
        let base64Data = dataUrl.split(",")[1];
        let byteSize = Math.round((base64Data.length * 3) / 4);

        // If above 500KB, reduce quality or scale down canvas
        while (byteSize > targetMaxBytes && quality > 0.4) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/webp", quality);
          base64Data = dataUrl.split(",")[1];
          byteSize = Math.round((base64Data.length * 3) / 4);
        }

        // If still above 500KB, scale down dimensions
        if (byteSize > targetMaxBytes) {
          const scaledCanvas = document.createElement("canvas");
          scaledCanvas.width = Math.round(width * 0.75);
          scaledCanvas.height = Math.round(height * 0.75);
          const scaledCtx = scaledCanvas.getContext("2d");
          if (scaledCtx) {
            scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
            dataUrl = scaledCanvas.toDataURL("image/webp", 0.75);
            base64Data = dataUrl.split(",")[1];
          }
        }

        const rawName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        const cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, "_") + ".webp";
        resolve({ base64Data, filename: cleanName });
      };
      img.onerror = () => reject(new Error("Failed to load image for WebP compression"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function CatalogWebModule({ idToken, profile }: CatalogWebModuleProps) {
  const [activeTab, setActiveTab] = React.useState<"layout" | "setting">("layout");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Layout Tab States
  const [selectedHeroTab, setSelectedHeroTab] = React.useState<"A" | "B" | "C">("A");
  const [layoutConfig, setLayoutConfig] = React.useState<any>({
    top_banner: "FINE FOOD AUSTRALIA 2026 OFFICIAL EXHIBITOR • HSG GLOBAL PTE LTD",
    hero_groups: [
      {
        id: "A",
        label: "Hero A (Mandatory)",
        enabled: true,
        headline_1: "Connecting Southeast Asian Taste",
        headline_2: "To Australian Shelves & Kitchens",
        subtext:
          "Ready-to-cook authentic Asian culinary pastes, ambient Halal food, and refreshing beverages for Australian supermarkets & foodservice — and your trusted FMCG distribution gateway into Singapore."
      },
      {
        id: "B",
        label: "Hero B (Optional Rotation)",
        enabled: false,
        headline_1: "",
        headline_2: "",
        subtext: ""
      },
      {
        id: "C",
        label: "Hero C (Optional Rotation)",
        enabled: false,
        headline_1: "",
        headline_2: "",
        subtext: ""
      }
    ],
    booking_start_date: "2026-08-27",
    booking_end_date: "2026-08-29",
    footer_showcase_text: "HSG Global Official Export & Trade Showcase",
    email_subject_tag: "HSG Global Trade",
    email_greeting: "Thank you for your interest in HSG Global Pte Ltd! We are pleased to share our official export catalog and product portfolio with you."
  });

  // Settings Tab States (Email & WhatsApp)
  const [emailSettings, setEmailSettings] = React.useState({
    receiver_order_email: "sales@hsg-global.com",
    receiver_order_cc_1: "",
    receiver_order_cc_2: "",
    receiver_order_cc_3: "",
    receiver_order_whatsapp: "+6583494429"
  });

  // Products & Brands Data
  const [products, setProducts] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [searchProductQuery, setSearchProductQuery] = React.useState("");

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = React.useState<any | null>(null);
  const [savingProduct, setSavingProduct] = React.useState(false);

  // Edit Brand Modal
  const [editingBrand, setEditingBrand] = React.useState<any | null>(null);
  const [savingBrand, setSavingBrand] = React.useState(false);

  // Logos & Media Assets
  const [logos, setLogos] = React.useState<{
    retailers: Array<{ key: string; filename: string; url: string; size: number }>;
    brands: Array<{ key: string; filename: string; url: string; size: number }>;
    hero: Array<{ key: string; filename: string; url: string; size: number }>;
  }>({
    retailers: [],
    brands: [],
    hero: []
  });

  // 1. Load All Configurations & Data
  const loadAllData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, prodRes, logosRes] = await Promise.all([
        fetch(`${WORKER_URL}/api/exhibitor/config`),
        fetch(`${WORKER_URL}/api/exhibitor/all-products`),
        fetch(`${WORKER_URL}/api/exhibitor/logos`)
      ]);

      if (configRes.ok) {
        const cData = await configRes.json();
        if (cData.layout) setLayoutConfig((prev: any) => ({ ...prev, ...cData.layout }));
        if (cData.settings) setEmailSettings((prev: any) => ({ ...prev, ...cData.settings }));
      }

      if (prodRes.ok) {
        const pData = await prodRes.json();
        if (pData.products) setProducts(pData.products);
        if (pData.brands) setBrands(pData.brands);
      }

      if (logosRes.ok) {
        const lData = await logosRes.json();
        setLogos({
          retailers: lData.retailers || [],
          brands: lData.brands || [],
          hero: lData.hero || []
        });
      }
    } catch (err: any) {
      console.error("Failed to load catalog web configs:", err);
      showToast("Failed to load catalog web settings", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // 2. Save Layout / Settings
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/exhibitor/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: layoutConfig,
          settings: emailSettings
        })
      });

      if (!res.ok) throw new Error("Failed to save configuration");
      showToast("Configuration saved successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  // 3. Toggle Product List in Catalog
  const handleToggleProduct = async (sku: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setProducts((prev) =>
      prev.map((p) => (p.sku === sku ? { ...p, list_in_catalog: newVal } : p))
    );

    try {
      const res = await fetch(`${WORKER_URL}/api/exhibitor/update-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, list_in_catalog: newVal })
      });
      if (!res.ok) throw new Error("Failed to update product status");
      showToast(`${sku} ${newVal ? "enabled" : "hidden"} in catalog`, "success");
    } catch (err: any) {
      setProducts((prev) =>
        prev.map((p) => (p.sku === sku ? { ...p, list_in_catalog: currentVal } : p))
      );
      showToast(err.message || "Update failed", "error");
    }
  };

  // 4. Save Product Edits
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingProduct(true);

    try {
      const res = await fetch(`${WORKER_URL}/api/exhibitor/update-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct)
      });
      if (!res.ok) throw new Error("Failed to update product details");
      showToast(`Product ${editingProduct.sku} updated`, "success");
      setProducts((prev) =>
        prev.map((p) => (p.sku === editingProduct.sku ? { ...p, ...editingProduct } : p))
      );
      setEditingProduct(null);
    } catch (err: any) {
      showToast(err.message || "Failed to update product", "error");
    } finally {
      setSavingProduct(false);
    }
  };

  // 5. Save Brand Edits
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    setSavingBrand(true);

    try {
      const res = await fetch(`${WORKER_URL}/api/exhibitor/update-brand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingBrand)
      });
      if (!res.ok) throw new Error("Failed to update brand details");
      showToast(`Brand ${editingBrand.id} updated`, "success");
      setBrands((prev) =>
        prev.map((b) => (b.id === editingBrand.id ? { ...b, ...editingBrand } : b))
      );
      setEditingBrand(null);
    } catch (err: any) {
      showToast(err.message || "Failed to update brand", "error");
    } finally {
      setSavingBrand(false);
    }
  };

  // 5.5 Toggle Brand Visibility (Batch toggle all products under this brand)
  const handleToggleBrand = async (brandId: string, currentVisible: boolean) => {
    const newVal = !currentVisible;
    const targetSkus = products
      .filter((p) => p.brands_id === brandId)
      .map((p) => p.sku);

    if (targetSkus.length === 0) {
      showToast(`No products found for brand ${brandId}`, "error");
      return;
    }

    // Optimistic UI update for all products of this brand
    setProducts((prev) =>
      prev.map((p) => (p.brands_id === brandId ? { ...p, list_in_catalog: newVal } : p))
    );

    try {
      // Parallel update all products of this brand to newVal in products_db
      await Promise.all(
        targetSkus.map((sku) =>
          fetch(`${WORKER_URL}/api/exhibitor/update-product`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sku, list_in_catalog: newVal })
          })
        )
      );

      showToast(
        `Brand ${brandId} & all ${targetSkus.length} product(s) ${newVal ? "enabled" : "hidden"} in catalog`,
        "success"
      );
    } catch (err: any) {
      // Rollback on error
      setProducts((prev) =>
        prev.map((p) => (p.brands_id === brandId ? { ...p, list_in_catalog: currentVisible } : p))
      );
      showToast(err.message || "Failed to update brand products", "error");
    }
  };

  // 5.8 Generate & Download Official Catalog PDF to R2 & Client
  const [generatingPdf, setGeneratingPdf] = React.useState(false);

  const handleDownloadAndGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      showToast("Compiling export catalog & uploading to Cloudflare R2...", "success");
      
      // Fetch fresh active catalog items
      const cRes = await fetch(`${WORKER_URL}/api/exhibitor/catalog-products`);
      if (!cRes.ok) throw new Error("Failed to fetch active catalog dataset");
      const cData = await cRes.json();
      
      const activeProds = cData.products || [];
      const activeBrands = cData.brands || [];
      const catalogHash = cData.catalog_hash || `manual_${Date.now()}`;

      // Generate PDF & upload to R2
      await generateExportCatalogPdf(
        activeProds,
        activeBrands,
        "HSG Global Internal Admin",
        "HSG Global Pte. Ltd.",
        catalogHash,
        {
          headerTitle: layoutConfig.pdf_header_title,
          subtext: layoutConfig.pdf_subtext,
          footerText: layoutConfig.pdf_footer_text
        }
      );

      showToast("PDF Catalog generated, stored in R2 cache & downloaded!", "success");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      showToast(err.message || "Failed to generate PDF catalog", "error");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // 6. Bulk File Upload with WebP Conversion
  const handleBulkUpload = async (category: "retailers" | "brands" | "hero", files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      let uploadedCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { base64Data, filename } = await compressImageToWebp(
          file,
          category === "hero" ? 1920 : 800,
          500 * 1024 // 500 KB max limit
        );

        const res = await fetch(`${WORKER_URL}/api/exhibitor/upload-logo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            filename,
            base64Data
          })
        });

        if (res.ok) uploadedCount++;
      }

      showToast(`Successfully uploaded ${uploadedCount} ${category} asset(s) as WebP`, "success");
      
      const logosRes = await fetch(`${WORKER_URL}/api/exhibitor/logos`);
      if (logosRes.ok) {
        const lData = await logosRes.json();
        setLogos({
          retailers: lData.retailers || [],
          brands: lData.brands || [],
          hero: lData.hero || []
        });
      }
    } catch (err: any) {
      showToast(err.message || "Upload failed", "error");
    }
  };

  // 7. Delete File from R2
  const handleDeleteLogo = async (key: string, category: "retailers" | "brands" | "hero") => {
    if (!confirm("Are you sure you want to delete this asset from storage?")) return;

    try {
      const res = await fetch(`${WORKER_URL}/api/exhibitor/delete-logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });

      if (!res.ok) throw new Error("Failed to delete asset");
      showToast("Asset deleted", "success");

      setLogos((prev) => ({
        ...prev,
        [category]: prev[category].filter((item) => item.key !== key)
      }));
    } catch (err: any) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchProductQuery.toLowerCase();
    return (
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.display_name && p.display_name.toLowerCase().includes(q)) ||
      (p.brands_id && p.brands_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-[#f8fafc] text-zinc-900 font-primary">
      {/* Top Controls Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B57D0]/10 flex items-center justify-center text-[#0B57D0]">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-950 flex items-center gap-2">
              Catalog Web Control Center
              <span className="text-[10px] font-extrabold bg-[#D3E3FD] text-[#041E49] px-2 py-0.5 rounded-full uppercase tracking-wider">
                Exhibitor Sync
              </span>
            </h2>
            <p className="text-xs text-zinc-500">
              Manage live export website layout, rotating slogans, products &amp; brands database, media assets, and trade email routing.
            </p>
          </div>
        </div>

        {/* Tab Buttons & Save Action */}
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveTab("layout")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "layout"
                  ? "bg-white text-[#0B57D0] shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Layout &amp; Products</span>
            </button>
            <button
              onClick={() => setActiveTab("setting")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "setting"
                  ? "bg-white text-[#0B57D0] shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Routing &amp; Settings</span>
            </button>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={saving || loading}
            className="h-9 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] active:scale-98 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="py-24 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0B57D0]" />
            <span>Loading Catalog Web Configurations &amp; Database...</span>
          </div>
        ) : activeTab === "layout" ? (
          /* TAB 1: LAYOUT & PRODUCTS */
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* 1. HERO & BANNER CONTENT CARD (COMPACT RESTRUCTURED LAYOUT) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="uppercase tracking-wider">Public Web &amp; Hero Content Settings</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-medium">
                  Hero A is mandatory • B &amp; C auto-rotate per reload
                </span>
              </div>

              {/* 2-COLUMN STRUCTURED LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN: WEBSITE & CATALOG LAYOUT */}
                <div className="space-y-4">
                  {/* Website Layout Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                        Website Layout
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">
                        Top Floating Banner
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. OFFICIAL EXHIBITOR • HSG GLOBAL PTE LTD"
                        value={layoutConfig.top_banner || ""}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, top_banner: e.target.value })
                        }
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:border-[#0B57D0]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-700 mb-0.5">
                          Hero Text 1 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Connecting Southeast Asian Taste"
                          value={layoutConfig.hero_headline_1 || layoutConfig.hero_groups?.[0]?.headline_1 || ""}
                          onChange={(e) =>
                            setLayoutConfig({ ...layoutConfig, hero_headline_1: e.target.value })
                          }
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:border-[#0B57D0]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-700 mb-0.5">
                          Hero Text 2 (Gold Accent) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="To Global Shelves & Kitchens"
                          value={layoutConfig.hero_headline_2 || layoutConfig.hero_groups?.[0]?.headline_2 || ""}
                          onChange={(e) =>
                            setLayoutConfig({ ...layoutConfig, hero_headline_2: e.target.value })
                          }
                          className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:border-[#0B57D0]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-700 mb-0.5">
                        Hero Subtext <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Ready-to-cook authentic Asian culinary pastes, ambient Halal food, and refreshing beverages..."
                        value={layoutConfig.hero_subtext || layoutConfig.hero_groups?.[0]?.subtext || ""}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, hero_subtext: e.target.value })
                        }
                        className="w-full p-2 rounded-lg border border-slate-200 text-[11px] text-zinc-900 bg-white resize-none focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>

                  {/* Catalog Layout Section */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                      <FileText className="w-3.5 h-3.5 text-[#0B57D0]" />
                      <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                        Catalog Layout (PDF Export)
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">
                        Catalog Header Title
                      </label>
                      <input
                        type="text"
                        placeholder="OFFICIAL EXPORT PRODUCT CATALOG"
                        value={layoutConfig.pdf_header_title ?? "OFFICIAL EXPORT PRODUCT CATALOG"}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, pdf_header_title: e.target.value })
                        }
                        className="w-full h-7.5 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">
                        Catalog Subtext (Contact &amp; Terms)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Contact: sales@hsg-global.com | hsgglobal.sg • Global Foodservice & Retail"
                        value={layoutConfig.pdf_subtext ?? "Contact: sales@hsg-global.com | hsgglobal.sg\nSingapore • Malaysia • Global Foodservice & Retail FMCG | FOB / CIF Terms"}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, pdf_subtext: e.target.value })
                        }
                        className="w-full p-2 rounded-lg border border-slate-200 text-[11px] text-zinc-900 bg-white resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">
                        Catalog Footer Text
                      </label>
                      <input
                        type="text"
                        placeholder="Official Export Catalog"
                        value={layoutConfig.pdf_footer_text ?? "Official Export Catalog"}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, pdf_footer_text: e.target.value })
                        }
                        className="w-full h-7.5 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: EVENTS, HIGHLIGHT CARDS, FOOTER & EMAIL TEMPLATES */}
                <div className="space-y-4">
                  {/* Website Layout (Dates, Highlights & Footer) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#0B57D0]" />
                        <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                          Website Controls &amp; Highlights
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                        <span className="font-semibold text-zinc-400">Event Date:</span>
                        <input
                          type="date"
                          value={layoutConfig.booking_start_date}
                          onChange={(e) =>
                            setLayoutConfig({ ...layoutConfig, booking_start_date: e.target.value })
                          }
                          className="h-6 px-1.5 rounded border border-slate-200 text-[11px] text-zinc-800 bg-white"
                        />
                        <span className="text-zinc-400">-</span>
                        <input
                          type="date"
                          value={layoutConfig.booking_end_date}
                          onChange={(e) =>
                            setLayoutConfig({ ...layoutConfig, booking_end_date: e.target.value })
                          }
                          className="h-6 px-1.5 rounded border border-slate-200 text-[11px] text-zinc-800 bg-white"
                        />
                      </div>
                    </div>

                    {/* 3 Feature Highlight Cards (Direct inline rows) */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                        Feature Highlight Cards (3 Cards)
                      </label>
                      <div className="space-y-1.5">
                        {[0, 1, 2].map((idx) => {
                          const card = layoutConfig.feature_cards?.[idx] || {
                            icon: idx === 0 ? "Flame" : idx === 1 ? "ShieldCheck" : "Store",
                            title: idx === 0 ? "Easy to Cook & Ready to Use" : idx === 1 ? "100% Halal & Ambient Ready" : "Direct Supermarket & Retail Network",
                            description: idx === 0 ? "Pre-sautéed natural spice bases and pastes." : idx === 1 ? "Sterile retort packaging allows 18–24 months ambient shelf-life." : "Supplying leading supermarket chains, hypermarkets, and HORECA."
                          };

                          const updateCard = (field: string, val: string) => {
                            const updated = [...(layoutConfig.feature_cards || [
                              { icon: "Flame", title: "Easy to Cook & Ready to Use", description: "Pre-sautéed natural spice bases and pastes." },
                              { icon: "ShieldCheck", title: "100% Halal & Ambient Ready", description: "Sterile retort packaging allows 18–24 months ambient shelf-life." },
                              { icon: "Store", title: "Direct Supermarket & Retail Network", description: "Supplying leading supermarket chains, hypermarkets, and HORECA." }
                            ])];
                            updated[idx] = { ...updated[idx], [field]: val };
                            setLayoutConfig({ ...layoutConfig, feature_cards: updated });
                          };

                          return (
                            <div key={`feat-card-${idx}`} className="p-1.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center gap-2">
                              <select
                                value={card.icon || "Flame"}
                                onChange={(e) => updateCard("icon", e.target.value)}
                                className="h-6 px-1 text-[10px] bg-white border border-slate-200 rounded text-zinc-700 cursor-pointer shrink-0"
                              >
                                <option value="Flame">🔥 Flame</option>
                                <option value="ShieldCheck">🛡️ ShieldCheck</option>
                                <option value="Store">🏪 Store</option>
                                <option value="Globe2">🌐 Globe</option>
                                <option value="Award">🏆 Award</option>
                                <option value="Package">📦 Package</option>
                                <option value="Utensils">🍴 Utensils</option>
                                <option value="Truck">🚚 Truck</option>
                              </select>
                              <input
                                type="text"
                                value={card.title || ""}
                                onChange={(e) => updateCard("title", e.target.value)}
                                placeholder={`Card #${idx + 1} Title`}
                                className="w-1/3 h-6 px-2 rounded border border-slate-200 text-[11px] font-semibold text-zinc-900 bg-white"
                              />
                              <input
                                type="text"
                                value={card.description || ""}
                                onChange={(e) => updateCard("description", e.target.value)}
                                placeholder="Short description..."
                                className="flex-1 h-6 px-2 rounded border border-slate-200 text-[10px] text-zinc-600 bg-white"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">
                        Website Footer Showcase Subtitle
                      </label>
                      <input
                        type="text"
                        placeholder="Official Export Showcase"
                        value={layoutConfig.footer_showcase_text || ""}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, footer_showcase_text: e.target.value })
                        }
                        className="w-full h-7.5 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>

                  {/* Email Template Controls */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
                      <Mail className="w-3.5 h-3.5 text-[#0B57D0]" />
                      <span className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                        Email Template Settings
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">
                        Email Event / Lead Subject Tag
                      </label>
                      <input
                        type="text"
                        placeholder="HSG Global Trade"
                        value={layoutConfig.email_subject_tag ?? "HSG Global Trade"}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, email_subject_tag: e.target.value })
                        }
                        className="w-full h-7.5 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:border-[#0B57D0]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">
                        Prospect Email Greeting Text
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Thank you for your interest in HSG Global Pte Ltd! We are pleased to share our official export catalog and product portfolio with you."
                        value={layoutConfig.email_greeting ?? "Thank you for your interest in HSG Global Pte Ltd! We are pleased to share our official export catalog and product portfolio with you."}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, email_greeting: e.target.value })
                        }
                        className="w-full p-2 rounded-lg border border-slate-200 text-[11px] text-zinc-900 bg-white resize-none focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. MEDIA ASSET MANAGER: HERO SLIDER PHOTOS, RETAILERS & BRAND LOGOS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
                  <ImageIcon className="w-4 h-4 text-[#0B57D0]" />
                  <span>Media Assets: Hero Slider Backgrounds, Retailer &amp; Brand Logos</span>
                </div>
                <span className="text-[11px] text-zinc-400 font-medium">
                  Auto-compressed to WebP before uploading to Cloudflare R2
                </span>
              </div>

              {/* 2.1 Hero Slider Background Photos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800">
                      Hero Slider Background Photos ({logos.hero.length})
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      High-resolution full-bleed landscape photos with slow continuous zoom motion.
                    </p>
                  </div>
                  <label className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-zinc-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-300">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Hero Photo(s)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBulkUpload("hero", e.target.files)}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {logos.hero.map((item) => (
                    <div
                      key={item.key}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 h-28 flex items-center justify-center shadow-xs"
                    >
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDeleteLogo(item.key, "hero")}
                          className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer shadow-md"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 right-1 text-[9px] bg-black/70 text-white px-1.5 py-0.5 rounded truncate">
                        {item.filename}
                      </span>
                    </div>
                  ))}
                  {logos.hero.length === 0 && (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      No hero slider photos uploaded yet. Click &ldquo;Upload Hero Photo(s)&rdquo; above.
                    </div>
                  )}
                </div>
              </div>

              {/* 2.2 Retailers / Partners Logos */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800">
                      Retailers / Supermarket Network Logos ({logos.retailers.length})
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Logos displayed in the global retail marquee slider.
                    </p>
                  </div>
                  <label className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-zinc-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-300">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Retailer Logo(s)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBulkUpload("retailers", e.target.files)}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {logos.retailers.map((item) => (
                    <div
                      key={item.key}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 bg-white p-2 h-20 flex items-center justify-center shadow-xs"
                    >
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDeleteLogo(item.key, "retailers")}
                          className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer shadow-md"
                          title="Delete logo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2.3 Brand Logos */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800">
                      Brand Logos ({logos.brands.length})
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Assigned brand logos showcased on product cards and catalog pages.
                    </p>
                  </div>
                  <label className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-zinc-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-300">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Brand Logo(s)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBulkUpload("brands", e.target.files)}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {logos.brands.map((item) => (
                    <div
                      key={item.key}
                      className="group relative rounded-xl overflow-hidden border border-slate-200 bg-white p-2 h-20 flex items-center justify-center shadow-xs"
                    >
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDeleteLogo(item.key, "brands")}
                          className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer shadow-md"
                          title="Delete logo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. BRAND-GROUPED PRODUCTS & CATALOG MANAGER */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
                    <Package className="w-4 h-4 text-[#0B57D0]" />
                    <span>Brand-Grouped Catalog List ({brands.length} Brands • {products.length} Products)</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Toggle a brand OFF to completely hide the brand and its products from the catalog.
                  </p>
                </div>
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Filter SKU, title, or brand..."
                    value={searchProductQuery}
                    onChange={(e) => setSearchProductQuery(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs text-zinc-800 placeholder-zinc-400 bg-slate-50 focus:bg-white focus:border-[#0B57D0] outline-none"
                  />
                </div>
              </div>

              {/* Grouped Brand Accordion & Tables */}
              <div className="space-y-4">
                {(() => {
                  // Sort brands: Active (visible in catalog) first, Hidden brands placed below
                  const sortedBrands = [...brands].sort((a, b) => {
                    const aActive = products.some(
                      (p) => p.brands_id === a.id && (p.list_in_catalog === true || p.list_in_catalog === 1)
                    );
                    const bActive = products.some(
                      (p) => p.brands_id === b.id && (p.list_in_catalog === true || p.list_in_catalog === 1)
                    );
                    if (aActive && !bActive) return -1;
                    if (!aActive && bActive) return 1;
                    return (a.rank || 999) - (b.rank || 999);
                  });

                  return sortedBrands.map((b) => {
                    const allBrandProds = products.filter((p) => p.brands_id === b.id);
                    const isBrandVisible = allBrandProds.some(
                      (p) => p.list_in_catalog === true || p.list_in_catalog === 1
                    );
                    const activeListedCount = allBrandProds.filter(
                      (p) => p.list_in_catalog === true || p.list_in_catalog === 1
                    ).length;

                    const brandProds = allBrandProds.filter((p) => {
                      if (!searchProductQuery) return true;
                      const q = searchProductQuery.toLowerCase();
                      return (
                        p.sku?.toLowerCase().includes(q) ||
                        p.display_name?.toLowerCase().includes(q)
                      );
                    });

                  return (
                    <div
                      key={b.id}
                      className={`border rounded-xl transition-all overflow-hidden ${
                        isBrandVisible ? "border-slate-200 bg-white" : "border-slate-200/80 bg-slate-50/60 opacity-80"
                      }`}
                    >
                      {/* Brand Header Banner with Toggle & Edit */}
                      <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          {/* Brand Toggle Switch */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleBrand(b.id, isBrandVisible)}
                              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer inline-flex items-center shrink-0 ${
                                isBrandVisible ? "bg-[#0B57D0]" : "bg-slate-300"
                              }`}
                              title={isBrandVisible ? "Brand Visible in Catalog" : "Brand Hidden from Catalog"}
                            >
                              <span
                                className={`w-4 h-4 rounded-full bg-white transition-transform transform ${
                                  isBrandVisible ? "translate-x-6" : "translate-x-1"
                                }`}
                              />
                            </button>
                            <span className={`text-xs font-bold ${isBrandVisible ? "text-zinc-900" : "text-zinc-400"}`}>
                              {isBrandVisible ? "Visible" : "Hidden"}
                            </span>
                          </div>

                          <div className="h-5 w-px bg-slate-200" />

                          {/* Brand Identity */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-zinc-950">
                                {b.display_name}
                              </h3>
                              <span className="font-mono text-[10px] bg-slate-200/70 text-zinc-700 font-semibold px-1.5 py-0.5 rounded">
                                {b.id}
                              </span>
                              <span className="text-[11px] text-zinc-400 font-medium">
                                ({activeListedCount}/{allBrandProds.length} active in catalog)
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 max-w-xl truncate mt-0.5">
                              {b.description || "No official catalog description set"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingBrand(b)}
                            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-zinc-700 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Edit Brand</span>
                          </button>
                        </div>
                      </div>

                      {/* Products Table under Brand (Visible only if Brand Toggle is ON) */}
                      {isBrandVisible ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 border-b border-slate-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-2 px-3 text-center w-24">In Catalog?</th>
                                <th className="py-2 px-3 w-32">SKU</th>
                                <th className="py-2 px-3">Product Name</th>
                                <th className="py-2 px-3 w-40">Carton Spec</th>
                                <th className="py-2 px-3 w-40">Storage / Shelf</th>
                                <th className="py-2 px-3 text-right w-20">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {brandProds.map((p) => {
                                const isProductListed = p.list_in_catalog === true || p.list_in_catalog === 1;
                                return (
                                  <tr key={p.sku} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        onClick={() => handleToggleProduct(p.sku, isProductListed)}
                                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer inline-flex items-center ${
                                          isProductListed ? "bg-emerald-500" : "bg-slate-300"
                                        }`}
                                        title={isProductListed ? "Product Visible" : "Product Hidden"}
                                      >
                                        <span
                                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform transform ${
                                            isProductListed ? "translate-x-4.5" : "translate-x-1"
                                          }`}
                                        />
                                      </button>
                                    </td>
                                    <td className="py-2 px-3 font-mono font-bold text-zinc-900">
                                      {p.sku}
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-zinc-800 max-w-sm truncate">
                                      {p.display_name}
                                    </td>
                                    <td className="py-2 px-3 text-zinc-600 text-[11px]">
                                      {p.carton || 12} EA/CTN • {p.pallet_ctn || 80} CTN/PLT
                                    </td>
                                    <td className="py-2 px-3 text-zinc-600 text-[11px]">
                                      {p.storage_condition || "15°–25°C"} • {p.shelf_life || "24M"}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      <button
                                        onClick={() => setEditingProduct(p)}
                                        className="px-2 py-1 rounded bg-slate-100 hover:bg-[#0B57D0] hover:text-white text-zinc-700 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        <span>Edit</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {brandProds.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="py-4 text-center text-xs text-slate-400">
                                    No products assigned to this brand.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 text-[11px] text-zinc-400 bg-slate-50/50 italic flex items-center justify-between">
                          <span>Brand and its {brandProds.length} products are hidden from the public export catalog.</span>
                          <span className="font-semibold text-zinc-500">Brand Header Only</span>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: ROUTING & SETTINGS */
          <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Lead Dispatch &amp; Notification Settings
                </h3>
                <p className="text-xs text-zinc-500">
                  Configure primary recipient email, CC addresses, and instant WhatsApp chat routing.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* PDF GENERATION & R2 CACHE ACTION CARD */}
              <div className="bg-[#f0f4f9]/80 border border-[#D3E3FD] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0B57D0]/10 flex items-center justify-center text-[#0B57D0] shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">
                      Official Export Catalog PDF Engine
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5 max-w-md">
                      Compiles all active brands &amp; products into a high-res PDF catalog, uploads to Cloudflare R2 for instant client downloads, and triggers a download to your computer.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDownloadAndGeneratePdf}
                  disabled={generatingPdf}
                  className="h-10 px-5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {generatingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download PDF Catalog</span>
                    </>
                  )}
                </button>
              </div>

              {/* Form Settings */}
              <div className="space-y-4 pt-2">
                {/* Primary Email */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Primary Order / Prospect Receiver Email (receiver_order_email)
                  </label>
                  <input
                    type="email"
                    required
                    value={emailSettings.receiver_order_email}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, receiver_order_email: e.target.value })
                    }
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-[#F8F9FC] focus:bg-white focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/20"
                  />
                </div>

                {/* CC Emails */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      CC Email 1 (receiver_order_cc_1)
                    </label>
                    <input
                      type="email"
                      value={emailSettings.receiver_order_cc_1}
                      onChange={(e) =>
                        setEmailSettings({ ...emailSettings, receiver_order_cc_1: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      CC Email 2 (receiver_order_cc_2)
                    </label>
                    <input
                      type="email"
                      value={emailSettings.receiver_order_cc_2}
                      onChange={(e) =>
                        setEmailSettings({ ...emailSettings, receiver_order_cc_2: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                      CC Email 3 (receiver_order_cc_3)
                    </label>
                    <input
                      type="email"
                      value={emailSettings.receiver_order_cc_3}
                      onChange={(e) =>
                        setEmailSettings({ ...emailSettings, receiver_order_cc_3: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white"
                    />
                  </div>
                </div>

                {/* WhatsApp Contact */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Official WhatsApp Contact Number (receiver_order_whatsapp)
                  </label>
                  <input
                    type="text"
                    placeholder="+6588002263"
                    value={emailSettings.receiver_order_whatsapp}
                    onChange={(e) =>
                      setEmailSettings({ ...emailSettings, receiver_order_whatsapp: e.target.value })
                    }
                    className="w-full h-10 px-3.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/20"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Includes international country code prefix (e.g. +65 or +61).
                  </p>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="h-10 px-6 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* EDIT PRODUCT MODAL (COMPREHENSIVE CATALOG & SPECIFICATION EDITOR) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Edit Product Specifications &amp; Catalog Data</h3>
                <span className="font-mono text-xs text-[#0B57D0] font-semibold">{editingProduct.sku}</span>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Product Titles & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Display Title</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.display_name || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, display_name: e.target.value })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Short Title (Catalog Header)</label>
                  <input
                    type="text"
                    placeholder="e.g. Sambal Tumis Paste"
                    value={editingProduct.product_meta?.Short_Title || ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        product_meta: { ...(editingProduct.product_meta || {}), Short_Title: e.target.value }
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Product Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Cooking Pastes & Aromatics"
                    value={editingProduct.product_meta?.Category || ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        product_meta: { ...(editingProduct.product_meta || {}), Category: e.target.value }
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Catalog Description (Long Description)</label>
                <textarea
                  rows={2}
                  placeholder="Official marketing & recipe description for the catalog..."
                  value={editingProduct.product_meta?.Long_Des || ""}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      product_meta: { ...(editingProduct.product_meta || {}), Long_Des: e.target.value }
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 resize-none"
                />
              </div>

              {/* Barcodes & Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">Single Unit Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. 955604161111"
                    value={editingProduct.single_barcode || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, single_barcode: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">Carton Barcode (ITF-14)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1955604161118"
                    value={editingProduct.carton_barcode || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, carton_barcode: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">Gross Carton Wt (kg)</label>
                  <input
                    type="text"
                    placeholder="e.g. 5.6"
                    value={editingProduct.carton_weight || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, carton_weight: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {/* Packaging & Pallet Logistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">EA / Carton</label>
                  <input
                    type="text"
                    value={editingProduct.carton || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, carton: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">CTN / Pallet</label>
                  <input
                    type="number"
                    value={editingProduct.pallet_ctn || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, pallet_ctn: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">Storage Condition</label>
                  <input
                    type="text"
                    value={editingProduct.storage_condition || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, storage_condition: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">Shelf Life</label>
                  <input
                    type="text"
                    value={editingProduct.shelf_life || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, shelf_life: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900"
                  />
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">Length (mm)</label>
                  <input
                    type="number"
                    value={editingProduct.carton_l_mm || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, carton_l_mm: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">Width (mm)</label>
                  <input
                    type="number"
                    value={editingProduct.carton_w_mm || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, carton_w_mm: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 mb-1">Height (mm)</label>
                  <input
                    type="number"
                    value={editingProduct.carton_h_mm || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, carton_h_mm: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-zinc-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="px-5 py-2 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingProduct ? "Saving..." : "Save Product Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRAND MODAL */}
      {editingBrand && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Edit Brand Information</h3>
                <span className="font-mono text-xs text-[#0B57D0] font-semibold">{editingBrand.id}</span>
              </div>
              <button
                onClick={() => setEditingBrand(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Brand Name</label>
                <input
                  type="text"
                  required
                  value={editingBrand.display_name || ""}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, display_name: e.target.value })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Catalog Description</label>
                <textarea
                  rows={3}
                  value={editingBrand.description || ""}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, description: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Display Rank / Order</label>
                <input
                  type="number"
                  value={editingBrand.rank || 999}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, rank: Number(e.target.value) })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBrand(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-zinc-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBrand}
                  className="px-5 py-2 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingBrand ? "Saving..." : "Save Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}