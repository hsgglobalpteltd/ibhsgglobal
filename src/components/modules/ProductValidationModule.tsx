"use client";

import * as React from "react";
import { 
  UserProfile, 
  ValidationProduct, 
  ProductValidationReview, 
  fetchValidationProducts, 
  fetchProductValidationMetadata, 
  saveValidationProduct, 
  deleteValidationProduct,
  submitProductValidationReview,
  deleteProductValidationReview,
  uploadProductValidationImage,
  uploadScannedForm
} from "@/lib/api";
import { showToast } from "@/lib/toast";
import { canEditModule, canDeleteModule } from "@/lib/permissions";
import { CustomButton } from "@/components/custom-button";
import { 
  Search, Plus, RefreshCw, Filter, Eye, Edit2, Trash2, Printer, 
  Download, CheckSquare, Square, ChevronDown, ChevronRight, 
  Award, AlertCircle, CheckCircle2, XCircle, ArrowUpDown, 
  Layers, FileText, UserCheck, Clock, TrendingUp, DollarSign, Store,
  Upload, Image as ImageIcon, X, ZoomIn, Calculator, Percent, Sparkles,
  ArrowRight, ShieldCheck, Box, Tag, Building2, FileDown, Scan, Link as LinkIcon, Share2, Copy
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface ProductValidationModuleProps {
  profile?: UserProfile | null;
}

const CRITERIA_QUESTIONS = [
  {
    id: "taste_aroma",
    title: "1. Taste & Aroma",
    scoreQuestion: "Does the product deliver a pleasant and memorable taste experience?",
    prompts: [
      "What flavour and aroma should consumers experience?",
      "What makes the taste distinctive compared with similar products?",
      "What consumer taste feedback have you collected, including dislikes?",
      "How should the product be prepared or served for the best taste?"
    ]
  },
  {
    id: "texture_quality",
    title: "2. Texture / Quality",
    scoreQuestion: "Does the product feel consistent, well-made and suitable for market expectations?",
    prompts: [
      "What texture should consumers expect?",
      "How do you maintain consistent taste, texture and quality across batches?",
      "Does the texture or quality change during the stated shelf life or after opening?",
      "What storage and handling conditions are needed to preserve quality?"
    ]
  },
  {
    id: "packaging_appeal",
    title: "3. Packaging Appeal",
    scoreQuestion: "Does the product look attractive, credible and retail-ready?",
    prompts: [
      "Who is the packaging designed to appeal to?",
      "How does the pack communicate what the product is and why consumers should buy it?",
      "What feedback have consumers given on the packaging?",
      "Is this the final retail packaging, and are any improvements planned?"
    ]
  },
  {
    id: "price_believability",
    title: "4. Price Believability",
    scoreQuestion: "Does the product feel worth the expected selling price?",
    prompts: [
      "What is the recommended selling price for this pack size?",
      "Which comparable products and prices have you benchmarked against?",
      "What product benefits justify the price?",
      "Have consumers purchased at this price, or has willingness to pay been tested? What were the results?"
    ]
  },
  {
    id: "usage_occasion",
    title: "5. Usage Occasion",
    scoreQuestion: "Is there a clear reason and occasion for consumers to buy it?",
    prompts: [
      "Who is the primary consumer, and what need does the product meet?",
      "When, where and how would consumers typically use it?",
      "Is it intended for everyday use, occasional consumption or gifting?",
      "What recipes, serving suggestions or demonstrations help explain its use?"
    ]
  },
  {
    id: "repeat_purchase",
    title: "6. Repeat Purchase Potential",
    scoreQuestion: "Would consumers have a reason to buy it again?",
    prompts: [
      "What would motivate consumers to buy this product again?",
      "How often would you expect a typical consumer to repurchase, and why?",
      "Do you have repeat-order data or customer feedback showing repeat purchase intent?",
      "What complaints or barriers could prevent repurchase, and how have you addressed them?"
    ]
  }
];

const COMMERCIAL_FIELDS = [
  { id: "sales_channels", label: "1. Current Sales Channels", question: "Where are these products currently sold? Please list countries, retailers and platforms." },
  { id: "marketing_activities", label: "2. Current Marketing Activities", question: "What marketing activities are you currently running, and on which channels?" },
  { id: "marketing_support", label: "3. Marketing Support", question: "What marketing support can you provide HSG, such as budget, samples, promotions or content?" },
  { id: "moq", label: "4. Minimum Order Quantity (MOQ)", question: "What is the MOQ per SKU and per order? Please specify units or cartons." },
  { id: "delivery_timeline", label: "5. Delivery Timeline", question: "What is the delivery lead time from order confirmation for initial and repeat orders?" },
  { id: "payment_terms", label: "6. Payment Terms", question: "What payment terms do you offer, including deposit, balance and credit period?" },
  { id: "influencer_engagement", label: "7. Influencer Engagement", question: "Which influencers or creators have you engaged? Please share campaigns and results." },
  { id: "existing_sg_sales", label: "8. Existing Singapore Sales", question: "Are these products already sold in Singapore online or through other channels? Please name the platforms, retailers or distributors." }
];

export function ProductValidationModule({ profile }: ProductValidationModuleProps) {
  const isEditable = canEditModule(profile, "Product Validation");
  const isDeletable = canDeleteModule(profile, "Product Validation");

  const [loading, setLoading] = React.useState<boolean>(true);
  const [products, setProducts] = React.useState<ValidationProduct[]>([]);
  const [allReviews, setAllReviews] = React.useState<ProductValidationReview[]>([]);
  
  // Metadata for autocomplete
  const [availableProducts, setAvailableProducts] = React.useState<any[]>([]);
  const [availableBrands, setAvailableBrands] = React.useState<any[]>([]);

  // UI Filters and View State
  const [viewMode, setViewMode] = React.useState<"products" | "reviews">("products");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [decisionFilter, setDecisionFilter] = React.useState<string>("all");
  const [expandedProducts, setExpandedProducts] = React.useState<Record<string, boolean>>({});

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = React.useState<boolean>(false);
  const [editingProduct, setEditingProduct] = React.useState<Partial<ValidationProduct> | null>(null);
  const [isSavingProduct, setIsSavingProduct] = React.useState<boolean>(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = React.useState<boolean>(false);
  const productImageInputRef = React.useRef<HTMLInputElement | null>(null);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = React.useState<boolean>(false);
  const [activeReviewTab, setActiveReviewTab] = React.useState<"scorecard" | "criteria13" | "criteria46" | "commercial" | "decision">("scorecard");
  const [editingReview, setEditingReview] = React.useState<Partial<ProductValidationReview> | null>(null);
  const [selectedParentProduct, setSelectedParentProduct] = React.useState<ValidationProduct | null>(null);
  const [isSavingReview, setIsSavingReview] = React.useState<boolean>(false);

  // Lightbox / Image Preview State
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ type: "product" | "review"; id: string } | null>(null);

  // Print Preview Modal
  const [printReview, setPrintReview] = React.useState<ProductValidationReview | null>(null);

  // Universal Worksheet Print Modal
  const [isPrintWorksheetOpen, setIsPrintWorksheetOpen] = React.useState<boolean>(false);

  // Consolidated Product Report Print Modal
  const [printProductReport, setPrintProductReport] = React.useState<ValidationProduct | null>(null);

  // Scanned Form Ingestion Modal
  const [isScanModalOpen, setIsScanModalOpen] = React.useState<boolean>(false);
  const [isProcessingScan, setIsProcessingScan] = React.useState<boolean>(false);
  const [scanSelectedProductId, setScanSelectedProductId] = React.useState<string>("");
  const scanFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Public Review Link Share Modal
  const [shareLinkProduct, setShareLinkProduct] = React.useState<ValidationProduct | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, metaRes] = await Promise.all([
        fetchValidationProducts(),
        fetchProductValidationMetadata().catch(() => ({ success: true, products: [], brands: [] }))
      ]);

      if (prodRes.success) {
        setProducts(prodRes.data || []);
        setAllReviews(prodRes.all_reviews || []);
      }
      if (metaRes && metaRes.success) {
        setAvailableProducts(metaRes.products || []);
        setAvailableBrands(metaRes.brands || []);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load validation data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen to global refresh button
  React.useEffect(() => {
    const handleDbRefresh = () => {
      loadData();
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, [loadData]);

  const toggleProductExpand = (productId: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // -------------------------------------------------------------
  // DISTRIBUTOR PRICING WATERFALL CALCULATOR
  // Cost Price (Goods Price) > Land Price > Overhead > Our Price > Price to Retailer > RSP
  // -------------------------------------------------------------
  const recalculateWaterfall = (
    current: Partial<ValidationProduct>, 
    changedField: "cost_price" | "landed_cost_rate" | "land_price" | "overhead_rate" | "our_margin_rate" | "price_to_retailer" | "retailer_margin_rate" | "rsp",
    value: number
  ) => {
    let cost = changedField === "cost_price" ? value : Number(current.cost_price || 0);
    let landRate = changedField === "landed_cost_rate" ? value : Number(current.landed_cost_rate !== undefined ? current.landed_cost_rate : 10);
    let landPrice = changedField === "land_price" ? value : Number((cost * (1 + landRate / 100)).toFixed(2));
    
    // If Land Price was edited directly, update landRate
    if (changedField === "land_price" && cost > 0) {
      landRate = Number((((landPrice - cost) / cost) * 100).toFixed(1));
    }

    let overheadRate = changedField === "overhead_rate" ? value : Number(current.overhead_rate !== undefined ? current.overhead_rate : 5);
    let ourPrice = Number((landPrice * (1 + overheadRate / 100)).toFixed(2));

    let ourMargin = changedField === "our_margin_rate" ? value : Number(current.our_margin_rate !== undefined ? current.our_margin_rate : 25);
    let priceToRetailer = Number(current.price_to_retailer || 0);

    if (changedField === "price_to_retailer") {
      priceToRetailer = value;
      if (priceToRetailer > 0 && ourPrice > 0) {
        ourMargin = Number((((priceToRetailer - ourPrice) / priceToRetailer) * 100).toFixed(1));
      }
    } else {
      priceToRetailer = ourMargin < 100 ? Number((ourPrice / (1 - ourMargin / 100)).toFixed(2)) : ourPrice;
    }

    let retailerMargin = changedField === "retailer_margin_rate" ? value : Number(current.retailer_margin_rate !== undefined ? current.retailer_margin_rate : 35);
    let rsp = Number(current.rsp || 0);

    if (changedField === "rsp") {
      rsp = value;
      if (rsp > 0 && priceToRetailer > 0) {
        retailerMargin = Number((((rsp - priceToRetailer) / rsp) * 100).toFixed(1));
      }
    } else {
      rsp = retailerMargin < 100 ? Number((priceToRetailer / (1 - retailerMargin / 100)).toFixed(2)) : priceToRetailer;
    }

    return {
      ...current,
      cost_price: cost,
      landed_cost_rate: landRate,
      land_price: landPrice,
      landed_cost: landPrice,
      overhead_rate: overheadRate,
      our_price: ourPrice,
      our_margin_rate: ourMargin,
      margin_percentage: ourMargin,
      price_to_retailer: priceToRetailer,
      retailer_margin_rate: retailerMargin,
      rsp: rsp,
      expected_selling_price: rsp
    };
  };

  // -------------------------------------------------------------
  // 1. PRODUCT MASTER ACTIONS
  // -------------------------------------------------------------
  const handleOpenNewProduct = () => {
    if (!isEditable) {
      showToast("⚠️ You have read-only access to this module.", "warning");
      return;
    }
    const base: Partial<ValidationProduct> = {
      product_name: "",
      brand_name: "",
      sku: "",
      product_owner: "",
      cost_price: 0,
      landed_cost_rate: 10,
      land_price: 0,
      landed_cost: 0,
      overhead_rate: 5,
      our_price: 0,
      our_margin_rate: 25,
      margin_percentage: 25,
      price_to_retailer: 0,
      retailer_margin_rate: 35,
      rsp: 0,
      expected_selling_price: 0,
      images: [],
      notes: "",
      status: "pending",
      created_by: profile?.name || ""
    };
    setEditingProduct(recalculateWaterfall(base, "cost_price", 0));
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (prod: ValidationProduct) => {
    if (!isEditable) {
      showToast("⚠️ You have read-only access to this module.", "warning");
      return;
    }
    setEditingProduct(JSON.parse(JSON.stringify(prod)));
    setIsProductModalOpen(true);
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingProduct) return;

    const currentImages = editingProduct.images || [];
    const remainingSlots = 5 - currentImages.length;
    if (remainingSlots <= 0) {
      showToast("Maximum 5 images allowed per product.", "warning");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploadingProductImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of filesToUpload) {
        if (!file.type.startsWith("image/")) {
          showToast(`Skipped ${file.name}: Not an image file`, "warning");
          continue;
        }
        const res = await uploadProductValidationImage(file);
        if (res.success && res.url) {
          uploadedUrls.push(res.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setEditingProduct({
          ...editingProduct,
          images: [...currentImages, ...uploadedUrls]
        });
        showToast(`Uploaded ${uploadedUrls.length} image(s).`, "success");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to upload image", "error");
    } finally {
      setIsUploadingProductImage(false);
      if (productImageInputRef.current) productImageInputRef.current.value = "";
    }
  };

  const handleRemoveProductImage = (index: number) => {
    if (!editingProduct) return;
    const currentImages = [...(editingProduct.images || [])];
    currentImages.splice(index, 1);
    setEditingProduct({
      ...editingProduct,
      images: currentImages
    });
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    if (!editingProduct.product_name?.trim()) {
      showToast("Product Name is required", "warning");
      return;
    }
    if (!editingProduct.brand_name?.trim()) {
      showToast("Brand Name is required", "warning");
      return;
    }

    const attachedImages = editingProduct.images || [];
    if (attachedImages.length === 0) {
      showToast("⚠️ Please upload at least 1 product / packaging photo (Minimum 1, Maximum 5).", "warning");
      return;
    }

    setIsSavingProduct(true);
    try {
      await saveValidationProduct(editingProduct);
      showToast(editingProduct.id ? "Product updated." : "New product registered for validation.", "success");
      setIsProductModalOpen(false);
      setEditingProduct(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to save product", "error");
    } finally {
      setIsSavingProduct(false);
    }
  };

  // -------------------------------------------------------------
  // 2. REVIEW ACTIONS
  // -------------------------------------------------------------
  const handleOpenAddReview = (prod: ValidationProduct) => {
    if (!isEditable) {
      showToast("⚠️ You have read-only access to this module.", "warning");
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    setSelectedParentProduct(prod);
    setEditingReview({
      product_id: prod.id,
      product_name: prod.product_name,
      brand_name: prod.brand_name,
      sku: prod.sku,
      buyer_name: profile?.name || "",
      product_owner: prod.product_owner || "",
      assessment_date: todayStr,
      total_score: 0,
      score_band: "Below 18: Pause before proceeding unless key improvements are made.",
      buyer_decision: "Pending",
      status: "completed",
      images: prod.images || [],
      before_assessment: {
        sample_available: false,
        packaging_available: false,
        selling_price_confirmed: false,
        consumer_usage_understood: false,
        owner_responses_recorded: false
      },
      scorecard: {
        taste_aroma: 0,
        texture_quality: 0,
        packaging_appeal: 0,
        price_believability: 0,
        usage_occasion: 0,
        repeat_purchase: 0
      },
      criteria_details: {
        taste_aroma: { prompts_checked: [], owner_response: "", buyer_observations: "" },
        texture_quality: { prompts_checked: [], owner_response: "", buyer_observations: "" },
        packaging_appeal: { prompts_checked: [], owner_response: "", buyer_observations: "" },
        price_believability: { prompts_checked: [], owner_response: "", buyer_observations: "" },
        usage_occasion: { prompts_checked: [], owner_response: "", buyer_observations: "" },
        repeat_purchase: { prompts_checked: [], owner_response: "", buyer_observations: "" }
      },
      commercial_terms: {
        sales_channels: "",
        marketing_activities: "",
        marketing_support: "",
        moq: "",
        delivery_timeline: "",
        payment_terms: "",
        influencer_engagement: "",
        existing_sg_sales: ""
      },
      decision_data: {
        checklist: {
          all_criteria_scored: false,
          owner_responses_reviewed: false,
          missing_evidence_recorded: false
        },
        key_strengths: "",
        concerns: "",
        missing_info: "",
        next_action: "",
        action_owner: profile?.name || "",
        due_date: "",
        buyer_sign_off: profile?.name || "",
        sign_off_date: todayStr
      }
    });
    setActiveReviewTab("scorecard");
    setIsReviewModalOpen(true);
  };

  const handleEditReview = (rev: ProductValidationReview) => {
    if (!isEditable) {
      showToast("⚠️ You have read-only access to this module.", "warning");
      return;
    }
    const parentProd = products.find(p => p.id === rev.product_id) || null;
    setSelectedParentProduct(parentProd);
    setEditingReview(JSON.parse(JSON.stringify(rev)));
    setActiveReviewTab("scorecard");
    setIsReviewModalOpen(true);
  };

  // Live Score Calculator
  const currentTotalScore = React.useMemo(() => {
    if (!editingReview || !editingReview.scorecard) return 0;
    const sc = editingReview.scorecard;
    return (
      (Number(sc.taste_aroma) || 0) +
      (Number(sc.texture_quality) || 0) +
      (Number(sc.packaging_appeal) || 0) +
      (Number(sc.price_believability) || 0) +
      (Number(sc.usage_occasion) || 0) +
      (Number(sc.repeat_purchase) || 0)
    );
  }, [editingReview?.scorecard]);

  const currentScoreBand = React.useMemo(() => {
    if (currentTotalScore >= 24) {
      return "24-30: Strong candidate for market testing.";
    } else if (currentTotalScore >= 18) {
      return "18-23: Proceed with further validation or refinement.";
    }
    return "Below 18: Pause before proceeding unless key improvements are made.";
  }, [currentTotalScore]);

  const handleSaveReview = async () => {
    if (!editingReview || !editingReview.product_id) return;
    if (!editingReview.buyer_name?.trim()) {
      showToast("Buyer / Reviewer Name is required", "warning");
      return;
    }

    setIsSavingReview(true);
    try {
      const payload: Partial<ProductValidationReview> = {
        ...editingReview,
        total_score: currentTotalScore,
        score_band: currentScoreBand
      };

      await submitProductValidationReview(payload);
      showToast(editingReview.id ? "Validation review updated." : "New review submitted.", "success");
      setIsReviewModalOpen(false);
      setEditingReview(null);
      setSelectedParentProduct(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to save review", "error");
    } finally {
      setIsSavingReview(false);
    }
  };

  // Process & Ingest Scanned Paper Worksheet
  const handleProcessScannedForm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetProduct = products.find(p => p.id === scanSelectedProductId);
    if (!targetProduct) {
      showToast("Please select a target product before uploading the scan.", "warning");
      return;
    }

    setIsProcessingScan(true);
    try {
      const res = await uploadScannedForm(file);
      if (res.success && res.scan_url) {
        const ext = res.extracted_data || {};
        const todayStr = new Date().toISOString().split("T")[0];

        // Prepare pre-populated review draft
        const newReviewDraft: Partial<ProductValidationReview> = {
          product_id: targetProduct.id,
          product_name: targetProduct.product_name,
          brand_name: targetProduct.brand_name,
          sku: targetProduct.sku,
          product_owner: targetProduct.product_owner || ext.product_owner || "",
          buyer_name: ext.buyer_name || profile?.name || "Reviewer",
          assessment_date: ext.assessment_date || todayStr,
          total_score: 0,
          score_band: "Below 18: Pause before proceeding unless key improvements are made.",
          buyer_decision: ext.buyer_decision || "Pending",
          status: "completed",
          scanned_form_url: res.scan_url,
          images: targetProduct.images || [],
          before_assessment: {
            sample_available: ext.before_assessment?.sample_available ?? true,
            packaging_available: ext.before_assessment?.packaging_available ?? true,
            selling_price_confirmed: ext.before_assessment?.selling_price_confirmed ?? true,
            consumer_usage_understood: ext.before_assessment?.consumer_usage_understood ?? true,
            owner_responses_recorded: ext.before_assessment?.owner_responses_recorded ?? true
          },
          scorecard: {
            taste_aroma: Number(ext.scorecard?.taste_aroma) || 4,
            texture_quality: Number(ext.scorecard?.texture_quality) || 4,
            packaging_appeal: Number(ext.scorecard?.packaging_appeal) || 4,
            price_believability: Number(ext.scorecard?.price_believability) || 4,
            usage_occasion: Number(ext.scorecard?.usage_occasion) || 4,
            repeat_purchase: Number(ext.scorecard?.repeat_purchase) || 4
          },
          criteria_details: ext.criteria_details || {
            taste_aroma: { prompts_checked: [], owner_response: "", buyer_observations: "" },
            texture_quality: { prompts_checked: [], owner_response: "", buyer_observations: "" },
            packaging_appeal: { prompts_checked: [], owner_response: "", buyer_observations: "" },
            price_believability: { prompts_checked: [], owner_response: "", buyer_observations: "" },
            usage_occasion: { prompts_checked: [], owner_response: "", buyer_observations: "" },
            repeat_purchase: { prompts_checked: [], owner_response: "", buyer_observations: "" }
          },
          commercial_terms: ext.commercial_terms || {
            sales_channels: "",
            marketing_activities: "",
            marketing_support: "",
            moq: "",
            delivery_timeline: "",
            payment_terms: "",
            influencer_engagement: "",
            existing_sg_sales: ""
          },
          decision_data: ext.decision_data || {
            checklist: {
              all_criteria_scored: true,
              owner_responses_reviewed: true,
              missing_evidence_recorded: false
            },
            key_strengths: "",
            concerns: "",
            missing_info: "",
            next_action: "",
            action_owner: profile?.name || "",
            due_date: "",
            buyer_sign_off: ext.buyer_name || profile?.name || "",
            sign_off_date: todayStr
          }
        };

        setSelectedParentProduct(targetProduct);
        setEditingReview(newReviewDraft);
        setIsScanModalOpen(false);
        setActiveReviewTab("scorecard");
        setIsReviewModalOpen(true);
        showToast("Scanned worksheet processed and original copy archived!", "success");
      } else {
        showToast("Failed to process scanned form.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to process form scan", "error");
    } finally {
      setIsProcessingScan(false);
      if (scanFileInputRef.current) scanFileInputRef.current.value = "";
    }
  };

  // Delete Handling
  const triggerDelete = (type: "product" | "review", id: string) => {
    if (!isDeletable) {
      showToast("⚠️ You do not have permission to delete records in this module.", "warning");
      return;
    }
    setDeleteTarget({ type, id });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "product") {
        await deleteValidationProduct(deleteTarget.id);
        showToast("Product and associated reviews deleted.", "success");
      } else {
        await deleteProductValidationReview(deleteTarget.id);
        showToast("Review deleted successfully.", "success");
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete", "error");
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  // Filtered Products & Reviews
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery = 
        !q ||
        (p.product_name || "").toLowerCase().includes(q) ||
        (p.brand_name || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.product_owner || "").toLowerCase().includes(q);

      const matchesDecision = 
        decisionFilter === "all" || 
        (p.latest_decision || p.status || "Pending").toLowerCase() === decisionFilter.toLowerCase();

      return matchesQuery && matchesDecision;
    });
  }, [products, searchQuery, decisionFilter]);

  const filteredReviews = React.useMemo(() => {
    return allReviews.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery = 
        !q ||
        (r.product_name || "").toLowerCase().includes(q) ||
        (r.brand_name || "").toLowerCase().includes(q) ||
        (r.sku || "").toLowerCase().includes(q) ||
        (r.buyer_name || "").toLowerCase().includes(q) ||
        (r.product_owner || "").toLowerCase().includes(q);

      const matchesDecision = 
        decisionFilter === "all" || 
        (r.buyer_decision || "Pending").toLowerCase() === decisionFilter.toLowerCase();

      return matchesQuery && matchesDecision;
    });
  }, [allReviews, searchQuery, decisionFilter]);

  // Overall KPIs
  const kpis = React.useMemo(() => {
    const totalProducts = products.length;
    const totalReviews = allReviews.length;
    const avgScore = totalReviews > 0 
      ? (allReviews.reduce((acc, v) => acc + (Number(v.total_score) || 0), 0) / totalReviews).toFixed(1) 
      : "0.0";
    const marketTestCount = allReviews.filter(v => (v.buyer_decision === "Market test" || v.total_score >= 24)).length;
    const refinementCount = allReviews.filter(v => (v.buyer_decision === "Further validation / refinement" || (v.total_score >= 18 && v.total_score < 24))).length;
    const pauseCount = allReviews.filter(v => (v.buyer_decision === "Pause" || v.total_score < 18)).length;

    return { totalProducts, totalReviews, avgScore, marketTestCount, refinementCount, pauseCount };
  }, [products, allReviews]);

  // Export CSV
  const handleExportCSV = () => {
    if (products.length === 0) {
      showToast("No data to export", "info");
      return;
    }
    const headers = [
      "Product ID", "Product Name", "Brand", "SKU", "Product Owner",
      "Cost Price (Goods)", "Land Price", "Our Price (Distributor)", "Price to Retailer", "RSP (Shelf)",
      "Our Margin (%)", "Retailer Margin (%)", "Total Reviews", "Average Score (/30)", "Status"
    ];
    const rows = products.map(p => [
      `"${p.id}"`,
      `"${p.product_name || ""}"`,
      `"${p.brand_name || ""}"`,
      `"${p.sku || ""}"`,
      `"${p.product_owner || ""}"`,
      `$${Number(p.cost_price || 0).toFixed(2)}`,
      `$${Number(p.land_price || p.landed_cost || 0).toFixed(2)}`,
      `$${Number(p.our_price || 0).toFixed(2)}`,
      `$${Number(p.price_to_retailer || 0).toFixed(2)}`,
      `$${Number(p.rsp || p.expected_selling_price || 0).toFixed(2)}`,
      `${Number(p.our_margin_rate || p.margin_percentage || 0).toFixed(1)}%`,
      `${Number(p.retailer_margin_rate || 35).toFixed(1)}%`,
      p.reviews_count || 0,
      p.average_score || 0,
      `"${p.status || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Product_Validations_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Product validation data exported to CSV.", "success");
  };

  const getDecisionBadge = (decision: string) => {
    const d = (decision || "").toLowerCase();
    if (d === "market test" || d === "proceed") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0B57D0] mr-1.5" />
          Market Test
        </span>
      );
    }
    if (d.includes("further") || d.includes("refinement") || d.includes("conditions")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-1.5" />
          Further Validation
        </span>
      );
    }
    if (d === "pause" || d === "reject") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
          Paused
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        {decision || "Pending"}
      </span>
    );
  };

  const getScoreBadge = (score: number) => {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded font-bold text-xs bg-slate-100 text-slate-800 border border-slate-200 font-mono">
        {score} <span className="text-slate-400 font-normal ml-0.5">/ 30</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* 1. Top Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
        <div>
          <h1 className="text-base font-bold text-zinc-950">Product Validation</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Distributor pricing waterfall (Cost &gt; Land &gt; Overhead &gt; Our Price &gt; Price to Retailer &gt; RSP) and multi-admin tasting validation scorecard.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintWorksheetOpen(true)}
            className="h-9 px-3 border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Download blank universal paper worksheet"
          >
            <FileDown size={14} className="text-[#0B57D0]" />
            Download Form
          </button>
          <button
            onClick={() => {
              if (products.length === 0) {
                showToast("Please register a product first.", "warning");
                return;
              }
              setScanSelectedProductId(products[0].id);
              setIsScanModalOpen(true);
            }}
            disabled={!isEditable}
            className="h-9 px-3 border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Upload and ingest signed paper worksheet"
          >
            <Scan size={14} className="text-[#0B57D0]" />
            Upload Form
          </button>
          <button
            onClick={handleExportCSV}
            className="h-9 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
          <CustomButton
            onClick={handleOpenNewProduct}
            disabled={!isEditable}
            className="h-9 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus size={15} />
            Add Product to Validate
          </CustomButton>
        </div>
      </div>

      {/* 2. KPI Summary Bar (Clean Neutral Google Workspace Aesthetic) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-3 bg-[#F8F9FA] border-b border-slate-200 shrink-0">
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-slate-500">Products in Pipeline</span>
          <span className="text-lg font-bold text-slate-900 mt-0.5">{kpis.totalProducts}</span>
        </div>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-slate-500">Admin Reviews</span>
          <span className="text-lg font-bold text-slate-900 mt-0.5">{kpis.totalReviews}</span>
        </div>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-slate-500">Overall Taste Score</span>
          <span className="text-lg font-bold text-[#0B57D0] mt-0.5 font-mono">{kpis.avgScore} <span className="text-xs text-slate-400 font-normal">/ 30</span></span>
        </div>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-slate-600">Market Test (24-30)</span>
          <span className="text-lg font-bold text-slate-900 mt-0.5">{kpis.marketTestCount}</span>
        </div>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-slate-600">Refinement (18-23)</span>
          <span className="text-lg font-bold text-slate-900 mt-0.5">{kpis.refinementCount}</span>
        </div>
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col">
          <span className="text-[11px] font-medium text-slate-600">Paused (&lt;18)</span>
          <span className="text-lg font-bold text-slate-900 mt-0.5">{kpis.pauseCount}</span>
        </div>
      </div>

      {/* 3. Filter & Controls Toolbar */}
      <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by product, brand, SKU, supplier, or reviewer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Decision Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter size={13} className="text-slate-400" />
            <select
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              className="h-8 px-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20"
            >
              <option value="all">All Decisions</option>
              <option value="Market test">Market test</option>
              <option value="Further validation / refinement">Further validation</option>
              <option value="Pause">Pause</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode("products")}
              className={`h-7 px-2.5 text-xs font-semibold rounded-md flex items-center gap-1 transition-all ${
                viewMode === "products" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers size={13} />
              Products Pipeline ({filteredProducts.length})
            </button>
            <button
              onClick={() => setViewMode("reviews")}
              className={`h-7 px-2.5 text-xs font-semibold rounded-md flex items-center gap-1 transition-all ${
                viewMode === "reviews" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText size={13} />
              All Reviews ({filteredReviews.length})
            </button>
          </div>

          <button
            onClick={() => loadData()}
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 4. Main Viewport Content Area */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
            <RefreshCw size={24} className="animate-spin text-blue-600" />
            <span className="text-xs">Loading validation pipeline...</span>
          </div>
        ) : viewMode === "products" ? (
          /* PRODUCTS PIPELINE (With Nested Reviews) */
          filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-xs gap-1">
              <AlertCircle size={28} className="text-slate-300" />
              <span>No products in validation pipeline.</span>
              <span className="text-[11px] text-slate-400">Click &quot;Add Product to Validate&quot; to register a product pitch.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredProducts.map((prod) => {
                const isExpanded = !!expandedProducts[prod.id];
                const prodReviews = prod.reviews || [];

                return (
                  <div key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Master Product Header Row */}
                    <div 
                      onClick={() => toggleProductExpand(prod.id)}
                      className="px-4 py-3.5 flex items-center justify-between cursor-pointer gap-4 select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button className="text-slate-400 hover:text-slate-600 shrink-0">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>

                        {/* Photo Thumbnail */}
                        {prod.images && prod.images.length > 0 ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(prod.images[0]);
                            }}
                            className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative group cursor-zoom-in"
                          >
                            <img src={prod.images[0]} alt={prod.product_name} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ZoomIn size={13} className="text-white" />
                            </div>
                            {prod.images.length > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[9px] px-1 rounded font-bold">
                                {prod.images.length}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon size={20} />
                          </div>
                        )}

                        {/* Product Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 truncate">{prod.product_name}</span>
                            {prod.sku && (
                              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                {prod.sku}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 flex-wrap">
                            <span className="font-semibold text-slate-700">{prod.brand_name}</span>
                            {prod.product_owner && (
                              <>
                                <span>•</span>
                                <span>Owner: <strong>{prod.product_owner}</strong></span>
                              </>
                            )}
                            <span>•</span>
                            <span className="text-blue-700 font-semibold">{prod.reviews_count || 0} Admin {prod.reviews_count === 1 ? "Review" : "Reviews"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Distributor Supply Chain Pricing Waterfall Capsule (Clean Monochromatic Google Style) */}
                      <div className="hidden xl:flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs shrink-0 shadow-xs">
                        <div>
                          <span className="text-[9px] text-slate-500 font-medium block uppercase tracking-tight">Cost Price</span>
                          <span className="font-semibold text-slate-800">${Number(prod.cost_price || 0).toFixed(2)}</span>
                        </div>
                        <span className="text-slate-300 text-xs">›</span>
                        <div>
                          <span className="text-[9px] text-slate-500 font-medium block uppercase tracking-tight">Land Price</span>
                          <span className="font-semibold text-slate-800">${Number(prod.land_price || prod.landed_cost || 0).toFixed(2)}</span>
                        </div>
                        <span className="text-slate-300 text-xs">›</span>
                        <div>
                          <span className="text-[9px] text-slate-500 font-medium block uppercase tracking-tight">Our Price</span>
                          <span className="font-semibold text-slate-900">${Number(prod.our_price || 0).toFixed(2)}</span>
                        </div>
                        <span className="text-slate-300 text-xs">›</span>
                        <div>
                          <span className="text-[9px] text-slate-700 font-medium block uppercase tracking-tight">To Retailer</span>
                          <span className="font-bold text-slate-900">${Number(prod.price_to_retailer || 0).toFixed(2)} <span className="text-[10px] text-slate-500">({Number(prod.our_margin_rate || prod.margin_percentage || 0).toFixed(0)}%)</span></span>
                        </div>
                        <span className="text-slate-300 text-xs">›</span>
                        <div>
                          <span className="text-[9px] text-[#0B57D0] font-medium block uppercase tracking-tight">RSP (Shelf)</span>
                          <span className="font-bold text-[#0B57D0]">${Number(prod.rsp || prod.expected_selling_price || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Score & Review Action */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-500 font-medium">Average Score</div>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            {getScoreBadge(Math.round(prod.average_score || 0))}
                          </div>
                        </div>

                        <div className="w-28 text-right">
                          <div className="text-[11px] text-slate-500 font-medium">Status</div>
                          <div className="mt-0.5">
                            {getDecisionBadge(prod.latest_decision || prod.status)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setShareLinkProduct(prod)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200"
                            title="Share Public Review Link"
                          >
                            <Share2 size={13} className="text-[#0B57D0]" />
                          </button>
                          <button
                            onClick={() => setPrintProductReport(prod)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200"
                            title="Print Consolidated Product Report"
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenAddReview(prod)}
                            className="h-8 px-3 bg-blue-50 hover:bg-blue-100 text-[#0B57D0] border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Plus size={13} />
                            Add Review
                          </button>
                          <button
                            onClick={() => handleEditProduct(prod)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg"
                            title="Edit Product"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => triggerDelete("product", prod.id)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-rose-600 rounded-lg"
                            title="Delete Product"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Sub-Reviews List */}
                    {isExpanded && (
                      <div className="bg-[#F8F9FA] px-10 py-3.5 border-t border-slate-100">
                        {prodReviews.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400">
                            No reviews submitted yet for this product. Click &quot;Add Review&quot; above to submit the first assessment.
                          </div>
                        ) : (
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="text-slate-500 border-b border-slate-200">
                                <th className="pb-2 font-semibold">Review ID</th>
                                <th className="pb-2 font-semibold">Admin Reviewer</th>
                                <th className="pb-2 font-semibold">Tasting Date</th>
                                <th className="pb-2 font-semibold text-center">Score (/30)</th>
                                <th className="pb-2 font-semibold">Score Band</th>
                                <th className="pb-2 font-semibold">Decision</th>
                                <th className="pb-2 font-semibold text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60">
                              {prodReviews.map((rev) => (
                                <tr key={rev.id} className="hover:bg-white transition-colors">
                                  <td className="py-2.5 font-mono text-[11px] text-slate-600 font-semibold">{rev.id}</td>
                                  <td className="py-2.5 font-medium text-slate-800">{rev.buyer_name}</td>
                                  <td className="py-2.5 text-slate-600">{rev.assessment_date}</td>
                                  <td className="py-2.5 text-center">{getScoreBadge(rev.total_score)}</td>
                                  <td className="py-2.5 text-slate-600 text-[11px] max-w-xs truncate">{rev.score_band}</td>
                                  <td className="py-2.5">{getDecisionBadge(rev.buyer_decision)}</td>
                                  <td className="py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => setPrintReview(rev)}
                                        className="p-1 hover:bg-slate-200 rounded text-slate-600"
                                        title="Print / View PDF"
                                      >
                                        <Printer size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleEditReview(rev)}
                                        className="p-1 hover:bg-blue-50 rounded text-blue-600"
                                        title="Edit Review"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => triggerDelete("review", rev.id)}
                                        className="p-1 hover:bg-rose-50 rounded text-rose-600"
                                        title="Delete Review"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* FLAT ALL REVIEWS VIEW */
          filteredReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-xs gap-1">
              <AlertCircle size={28} className="text-slate-300" />
              <span>No validation reviews found matching your search.</span>
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA] text-slate-600 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-semibold">Review ID</th>
                  <th className="py-2.5 px-3 font-semibold">Brand / Product</th>
                  <th className="py-2.5 px-3 font-semibold">Admin Reviewer</th>
                  <th className="py-2.5 px-3 font-semibold">Tasting Date</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Score</th>
                  <th className="py-2.5 px-3 font-semibold">Score Band</th>
                  <th className="py-2.5 px-3 font-semibold">Decision</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReviews.map((val) => (
                  <tr key={val.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 font-semibold">{val.id}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{val.product_name}</div>
                      <div className="text-[11px] text-slate-500">{val.brand_name} {val.sku ? `• ${val.sku}` : ""}</div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">{val.buyer_name}</td>
                    <td className="py-3 px-3 text-slate-600">{val.assessment_date}</td>
                    <td className="py-3 px-3 text-center">{getScoreBadge(val.total_score)}</td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{val.score_band}</td>
                    <td className="py-3 px-3">{getDecisionBadge(val.buyer_decision)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPrintReview(val)}
                          className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
                          title="Print Assessment"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => handleEditReview(val)}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                          title="Edit Review"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => triggerDelete("review", val.id)}
                          className="p-1.5 hover:bg-rose-50 rounded text-rose-600"
                          title="Delete Review"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. ADD / EDIT PRODUCT MODAL (Distributor Pricing Waterfall & Photos) */}
      {/* ------------------------------------------------------------- */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Distributor Pipeline</span>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingProduct.id ? `Edit Product — ${editingProduct.product_name}` : "Add Product to Validation Pipeline"}
                </h2>
              </div>
              <button
                onClick={() => {
                  setIsProductModalOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
              {/* Product Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Snack Brand Co."
                    value={editingProduct.brand_name || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, brand_name: e.target.value })}
                    className="w-full h-8 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Kyoto Ceremonial Matcha Crisps"
                    value={editingProduct.product_name || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, product_name: e.target.value })}
                    className="w-full h-8 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. ZB-MAT-01"
                    value={editingProduct.sku || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full h-8 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Owner (Supplier / Vendor)</label>
                  <input
                    type="text"
                    placeholder="e.g. Kyoto Green Foods Ltd"
                    value={editingProduct.product_owner || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, product_owner: e.target.value })}
                    className="w-full h-8 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* DISTRIBUTOR PRICING WATERFALL */}
              {/* Cost Price > Land Price > Overhead > Our Price > Price to Retailer > RSP */}
              <div className="bg-[#F8F9FA] p-4.5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-blue-600" />
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Distributor Supply Chain Pricing Waterfall
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Cost Price → Land Price → Overhead → Our Price → Price to Retailer → RSP
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  {/* Step 1: Cost Price (Goods Price) */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <label className="block text-[10px] font-bold uppercase tracking-tight text-slate-600 mb-1">
                      1. Cost Price
                    </label>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editingProduct.cost_price || ""}
                        onChange={(e) => setEditingProduct(recalculateWaterfall(editingProduct, "cost_price", parseFloat(e.target.value) || 0))}
                        className="w-full h-7 pl-5 pr-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-slate-900"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">Supplier Goods Price</span>
                  </div>

                  {/* Step 2: Land Price */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold uppercase tracking-tight text-slate-600">
                        2. Land Price
                      </label>
                      <span className="text-[9px] text-blue-600 font-bold">+{editingProduct.landed_cost_rate || 10}%</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editingProduct.land_price || ""}
                        onChange={(e) => setEditingProduct(recalculateWaterfall(editingProduct, "land_price", parseFloat(e.target.value) || 0))}
                        className="w-full h-7 pl-5 pr-1.5 text-xs bg-white border border-slate-300 rounded font-mono font-bold text-slate-900"
                      />
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">Landed Freight/Duty</span>
                  </div>

                  {/* Step 3: Overhead Rate */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <label className="block text-[10px] font-bold uppercase tracking-tight text-slate-600 mb-1">
                      3. Overhead Rate
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        placeholder="5"
                        value={editingProduct.overhead_rate !== undefined ? editingProduct.overhead_rate : 5}
                        onChange={(e) => setEditingProduct(recalculateWaterfall(editingProduct, "overhead_rate", parseFloat(e.target.value) || 0))}
                        className="w-full h-7 px-2 pr-5 text-xs bg-white border border-slate-300 rounded font-mono text-slate-800"
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-slate-400 font-bold">%</span>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block">Storage &amp; Logistics</span>
                  </div>

                  {/* Step 4: Our Price (Distributor Base) */}
                  <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs">
                    <label className="block text-[10px] font-bold uppercase tracking-tight text-slate-900 mb-1">
                      4. Our Price
                    </label>
                    <div className="h-7 px-2 flex items-center bg-slate-100 rounded border border-slate-200 font-mono font-bold text-slate-900 text-xs">
                      ${Number(editingProduct.our_price || 0).toFixed(2)}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1 block">Distributor Total Base</span>
                  </div>

                  {/* Step 5: Price to Retailer */}
                  <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold uppercase tracking-tight text-emerald-800">
                        5. To Retailer
                      </label>
                      <span className="text-[9px] text-emerald-700 font-bold">{editingProduct.our_margin_rate || 25}% Margin</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-xs text-emerald-600 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editingProduct.price_to_retailer || ""}
                        onChange={(e) => setEditingProduct(recalculateWaterfall(editingProduct, "price_to_retailer", parseFloat(e.target.value) || 0))}
                        className="w-full h-7 pl-5 pr-1.5 text-xs bg-white border border-emerald-300 rounded font-mono font-bold text-emerald-900"
                      />
                    </div>
                    <span className="text-[9px] text-emerald-600 mt-1 block">
                      Profit: ${Number((editingProduct.price_to_retailer || 0) - (editingProduct.our_price || 0)).toFixed(2)}
                    </span>
                  </div>

                  {/* Step 6: RSP (Shelf Price) */}
                  <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold uppercase tracking-tight text-blue-900">
                        6. RSP (Shelf)
                      </label>
                      <span className="text-[9px] text-blue-700 font-bold">{editingProduct.retailer_margin_rate || 35}% Ret.</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-xs text-blue-600 font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editingProduct.rsp || ""}
                        onChange={(e) => setEditingProduct(recalculateWaterfall(editingProduct, "rsp", parseFloat(e.target.value) || 0))}
                        className="w-full h-7 pl-5 pr-1.5 text-xs bg-white border border-blue-300 rounded font-mono font-black text-blue-900 text-sm"
                      />
                    </div>
                    <span className="text-[9px] text-blue-600 mt-1 block">Recommended Shelf Price</span>
                  </div>
                </div>
              </div>

              {/* Product Photos (Min 1, Max 5) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Product &amp; Packaging Photos (Min 1, Max 5) *
                  </label>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    (editingProduct.images?.length || 0) >= 1 && (editingProduct.images?.length || 0) <= 5
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}>
                    {editingProduct.images?.length || 0} / 5 Photos Attached
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(editingProduct.images || []).map((imgUrl, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg border border-slate-200 overflow-hidden bg-white shadow-2xs">
                      <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPreviewImage(imgUrl)}
                          className="p-1 bg-white/90 rounded-full text-slate-700 hover:text-blue-600"
                        >
                          <ZoomIn size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductImage(idx)}
                          className="p-1 bg-white/90 rounded-full text-slate-700 hover:text-rose-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1 rounded">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}

                  {(editingProduct.images?.length || 0) < 5 && (
                    <div
                      onClick={() => productImageInputRef.current?.click()}
                      className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                        isUploadingProductImage 
                          ? "border-blue-400 bg-blue-50/50 cursor-wait" 
                          : "border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 bg-[#F8F9FA]"
                      }`}
                    >
                      <input
                        ref={productImageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleProductImageUpload}
                        className="hidden"
                      />
                      {isUploadingProductImage ? (
                        <RefreshCw size={18} className="animate-spin text-blue-600" />
                      ) : (
                        <>
                          <Upload size={18} className="text-slate-400 group-hover:text-blue-600" />
                          <span className="text-[11px] font-semibold text-slate-600 mt-1">Upload Photo</span>
                          <span className="text-[9px] text-slate-400">JPG, PNG, WEBP</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Product Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes on supplier pitch, packing carton, shelf life, or market testing target..."
                  value={editingProduct.notes || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, notes: e.target.value })}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                Our Price: <strong>${Number(editingProduct.our_price || 0).toFixed(2)}</strong> → Price to Retailer: <strong className="text-emerald-700">${Number(editingProduct.price_to_retailer || 0).toFixed(2)}</strong> → RSP: <strong className="text-blue-800">${Number(editingProduct.rsp || 0).toFixed(2)}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="h-9 px-4 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProduct}
                  disabled={isSavingProduct || isUploadingProductImage}
                  className="h-9 px-5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isSavingProduct && <RefreshCw size={13} className="animate-spin" />}
                  {editingProduct.id ? "Save Changes" : "Register Product"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. ADMIN REVIEW EVALUATION FORM (Clean Non-Overlapping Tabs) */}
      {/* ------------------------------------------------------------- */}
      {isReviewModalOpen && editingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Review Modal Header */}
            <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Buyer Checklist &amp; Scorecard</span>
                <h2 className="text-base font-bold text-slate-900">
                  {editingReview.id ? `Edit Review — ${editingReview.product_name}` : `Taste & Commercial Review: ${editingReview.product_name}`}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                  <span className="text-xs text-blue-700 font-medium">Taste Score:</span>
                  <span className="text-sm font-bold text-blue-900 font-mono">{currentTotalScore} / 30</span>
                </div>
                <button
                  onClick={() => {
                    setIsReviewModalOpen(false);
                    setEditingReview(null);
                    setSelectedParentProduct(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-lg p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Product Meta Header Bar */}
            <div className="bg-[#F8F9FA] px-6 py-2.5 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Product / Brand:</span>
                <div className="font-bold text-slate-900 truncate">{editingReview.product_name} ({editingReview.brand_name})</div>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Supplier / Owner:</span>
                <div className="font-semibold text-slate-800">{editingReview.product_owner || "-"}</div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-0.5">Admin Reviewer *</label>
                <input
                  type="text"
                  value={editingReview.buyer_name || ""}
                  onChange={(e) => setEditingReview({ ...editingReview, buyer_name: e.target.value })}
                  className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-600 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 font-medium mb-0.5">Assessment Date</label>
                <input
                  type="date"
                  value={editingReview.assessment_date || ""}
                  onChange={(e) => setEditingReview({ ...editingReview, assessment_date: e.target.value })}
                  className="w-full h-7 px-2 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Clean Non-Overlapping Tabs Bar */}
            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 gap-1 overflow-x-auto py-1.5">
              {[
                { id: "scorecard", label: "1. Scorecard (/30)" },
                { id: "criteria13", label: "2. Criteria 1-3 (Taste, Texture, Pack)" },
                { id: "criteria46", label: "3. Criteria 4-6 (Price, Occasion, Repurchase)" },
                { id: "commercial", label: "4. Commercial & Sales Terms" },
                { id: "decision", label: "5. Decision & Next Steps" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveReviewTab(tab.id as any)}
                  className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    activeReviewTab === tab.id
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-slate-600 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Review Modal Body Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: SCORECARD & PREPARATION */}
              {activeReviewTab === "scorecard" && (
                <div className="space-y-6">
                  {/* Before Assessment Checklist */}
                  <div className="bg-[#F8F9FA] p-4 rounded-xl border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Before Assessment Checklist</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700">
                      {[
                        { key: "sample_available", label: "Product sample available for tasting." },
                        { key: "packaging_available", label: "Packaging available for review." },
                        { key: "selling_price_confirmed", label: "Expected selling price confirmed." },
                        { key: "consumer_usage_understood", label: "Intended consumer and usage occasion understood." },
                        { key: "owner_responses_recorded", label: "Product owner's responses and supporting evidence recorded." }
                      ].map((chk) => {
                        const checked = !!(editingReview.before_assessment as any)?.[chk.key];
                        return (
                          <label key={chk.key} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setEditingReview({
                                  ...editingReview,
                                  before_assessment: {
                                    ...editingReview.before_assessment,
                                    [chk.key]: e.target.checked
                                  }
                                });
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{chk.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Buyer Assessment Scorecard (6 Criteria) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Buyer Assessment Scorecard</h3>
                        <p className="text-xs text-slate-500">Score each criterion from 1 to 5, then calculate the total.</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-500">Score Band:</span>
                        <div className="text-xs font-bold text-blue-700 mt-0.5">{currentScoreBand}</div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                      {CRITERIA_QUESTIONS.map((crit) => {
                        const currentVal = Number((editingReview.scorecard as any)?.[crit.id]) || 0;
                        return (
                          <div key={crit.id} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                            <div className="max-w-xl">
                              <h4 className="text-xs font-bold text-slate-900">{crit.title}</h4>
                              <p className="text-xs text-slate-600 mt-0.5">{crit.scoreQuestion}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {[1, 2, 3, 4, 5].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => {
                                    setEditingReview({
                                      ...editingReview,
                                      scorecard: {
                                        ...editingReview.scorecard,
                                        [crit.id]: num
                                      }
                                    });
                                  }}
                                  className={`w-9 h-9 rounded-lg font-bold text-xs transition-all ${
                                    currentVal === num
                                      ? "bg-[#0B57D0] text-white shadow-md scale-105"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                              <span className="text-xs text-slate-400 font-semibold ml-1">/ 5</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Scorecard Total Score Footer */}
                    <div className="mt-4 p-4 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-blue-900">Total Score</span>
                        <p className="text-[11px] text-blue-700 mt-0.5">Calculated sum from all 6 taste &amp; market validation questions.</p>
                      </div>
                      <div className="text-2xl font-black text-blue-900 font-mono">
                        {currentTotalScore} <span className="text-sm font-semibold text-blue-600">/ 30</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CRITERIA 1 - 3 DETAILS */}
              {activeReviewTab === "criteria13" && (
                <div className="space-y-5">
                  {CRITERIA_QUESTIONS.slice(0, 3).map((crit) => {
                    const detail = (editingReview.criteria_details as any)?.[crit.id] || {};
                    return (
                      <div key={crit.id} className="bg-[#F8F9FA] p-4.5 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{crit.title}</h3>
                          <span className="text-xs font-semibold text-blue-700">
                            Score: {(editingReview.scorecard as any)?.[crit.id] || 0} / 5
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-500">Prompts:</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-slate-600">
                            {crit.prompts.map((p, idx) => (
                              <div key={idx} className="flex items-start gap-1">
                                <span className="text-blue-600 font-bold">•</span>
                                <span>{p}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Owner&apos;s Response / Evidence:
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Record supplier's comments, ingredients details, or claims..."
                              value={detail.owner_response || ""}
                              onChange={(e) => {
                                setEditingReview({
                                  ...editingReview,
                                  criteria_details: {
                                    ...editingReview.criteria_details,
                                    [crit.id]: {
                                      ...detail,
                                      owner_response: e.target.value
                                    }
                                  }
                                });
                              }}
                              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Buyer&apos;s Observations &amp; Tasting Notes:
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Record sensory notes, texture perception, consistency..."
                              value={detail.buyer_observations || ""}
                              onChange={(e) => {
                                setEditingReview({
                                  ...editingReview,
                                  criteria_details: {
                                    ...editingReview.criteria_details,
                                    [crit.id]: {
                                      ...detail,
                                      buyer_observations: e.target.value
                                    }
                                  }
                                });
                              }}
                              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: CRITERIA 4 - 6 DETAILS */}
              {activeReviewTab === "criteria46" && (
                <div className="space-y-5">
                  {CRITERIA_QUESTIONS.slice(3, 6).map((crit) => {
                    const detail = (editingReview.criteria_details as any)?.[crit.id] || {};
                    return (
                      <div key={crit.id} className="bg-[#F8F9FA] p-4.5 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{crit.title}</h3>
                          <span className="text-xs font-semibold text-blue-700">
                            Score: {(editingReview.scorecard as any)?.[crit.id] || 0} / 5
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-500">Prompts:</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-slate-600">
                            {crit.prompts.map((p, idx) => (
                              <div key={idx} className="flex items-start gap-1">
                                <span className="text-blue-600 font-bold">•</span>
                                <span>{p}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Owner&apos;s Response / Evidence:
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Record supplier's pricing benchmarks, usage suggestions, repeat order data..."
                              value={detail.owner_response || ""}
                              onChange={(e) => {
                                setEditingReview({
                                  ...editingReview,
                                  criteria_details: {
                                    ...editingReview.criteria_details,
                                    [crit.id]: {
                                      ...detail,
                                      owner_response: e.target.value
                                    }
                                  }
                                });
                              }}
                              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Buyer&apos;s Observations &amp; Commercial Notes:
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Record buyer's assessment on price-value fit, occasion fit, repurchase barrier..."
                              value={detail.buyer_observations || ""}
                              onChange={(e) => {
                                setEditingReview({
                                  ...editingReview,
                                  criteria_details: {
                                    ...editingReview.criteria_details,
                                    [crit.id]: {
                                      ...detail,
                                      buyer_observations: e.target.value
                                    }
                                  }
                                });
                              }}
                              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 4: COMMERCIAL & SALES TERMS */}
              {activeReviewTab === "commercial" && (
                <div className="space-y-4">
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-800">
                    ℹ️ <strong>Sales, Marketing and Commercial Terms</strong> — Record responses below. These questions do not add to the 30-point taste score.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {COMMERCIAL_FIELDS.map((comm) => (
                      <div key={comm.id} className="bg-[#F8F9FA] p-3.5 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-900 mb-0.5">{comm.label}</label>
                        <p className="text-[11px] text-slate-500 mb-2">{comm.question}</p>
                        <textarea
                          rows={2}
                          placeholder="Enter details..."
                          value={(editingReview.commercial_terms as any)?.[comm.id] || ""}
                          onChange={(e) => {
                            setEditingReview({
                              ...editingReview,
                              commercial_terms: {
                                ...editingReview.commercial_terms,
                                [comm.id]: e.target.value
                              }
                            });
                          }}
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: DECISION & FEEDBACK */}
              {activeReviewTab === "decision" && (
                <div className="space-y-5">
                  {/* Decision Checklist */}
                  <div className="bg-[#F8F9FA] p-4 rounded-xl border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Decision Checklist</h3>
                    <div className="space-y-2 text-xs text-slate-700">
                      {[
                        { key: "all_criteria_scored", label: "All six criteria assessed and scored." },
                        { key: "owner_responses_reviewed", label: "Owner's responses reviewed against tasting observations and available evidence." },
                        { key: "missing_evidence_recorded", label: "Missing evidence and required improvements recorded." }
                      ].map((chk) => {
                        const checked = !!(editingReview.decision_data?.checklist as any)?.[chk.key];
                        return (
                          <label key={chk.key} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setEditingReview({
                                  ...editingReview,
                                  decision_data: {
                                    ...editingReview.decision_data,
                                    checklist: {
                                      ...editingReview.decision_data?.checklist,
                                      [chk.key]: e.target.checked
                                    }
                                  }
                                });
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{chk.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Buyer Decision Selector */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Buyer Decision *</span>
                      <span className="text-xs text-slate-500">Based on score band: <strong>{currentScoreBand}</strong></span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { value: "Market test", label: "Market Test", desc: "Strong candidate for retail / online testing (24-30 pts)" },
                        { value: "Further validation / refinement", label: "Further Validation", desc: "Proceed with formulation/packaging refinement (18-23 pts)" },
                        { value: "Pause", label: "Pause", desc: "Pause before proceeding unless key improvements are made (<18 pts)" }
                      ].map((opt) => {
                        const isSelected = editingReview.buyer_decision === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEditingReview({ ...editingReview, buyer_decision: opt.value })}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? "border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20"
                                : "border-slate-200 bg-[#F8F9FA] hover:bg-slate-100"
                            }`}
                          >
                            <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                              <span>{opt.label}</span>
                              {isSelected && <CheckCircle2 size={15} className="text-blue-600" />}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">{opt.desc}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback Textboxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Key Strengths:</label>
                      <textarea
                        rows={2}
                        placeholder="What makes this product standout?"
                        value={editingReview.decision_data?.key_strengths || ""}
                        onChange={(e) => setEditingReview({
                          ...editingReview,
                          decision_data: { ...editingReview.decision_data, key_strengths: e.target.value }
                        })}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Concerns / Improvements:</label>
                      <textarea
                        rows={2}
                        placeholder="Areas needing rework or changes before listing..."
                        value={editingReview.decision_data?.concerns || ""}
                        onChange={(e) => setEditingReview({
                          ...editingReview,
                          decision_data: { ...editingReview.decision_data, concerns: e.target.value }
                        })}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Missing Information / Evidence:</label>
                      <textarea
                        rows={2}
                        placeholder="Additional certificates, test reports, pricing evidence..."
                        value={editingReview.decision_data?.missing_info || ""}
                        onChange={(e) => setEditingReview({
                          ...editingReview,
                          decision_data: { ...editingReview.decision_data, missing_info: e.target.value }
                        })}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Next Action:</label>
                      <textarea
                        rows={2}
                        placeholder="Immediate follow-up steps..."
                        value={editingReview.decision_data?.next_action || ""}
                        onChange={(e) => setEditingReview({
                          ...editingReview,
                          decision_data: { ...editingReview.decision_data, next_action: e.target.value }
                        })}
                        className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Sign-off Details */}
                  <div className="bg-[#F8F9FA] p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Action Owner</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={editingReview.decision_data?.action_owner || ""}
                        onChange={(e) => setEditingReview({
                          ...editingReview,
                          decision_data: { ...editingReview.decision_data, action_owner: e.target.value }
                        })}
                        className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={editingReview.decision_data?.due_date || ""}
                        onChange={(e) => setEditingReview({
                          ...editingReview,
                          decision_data: { ...editingReview.decision_data, due_date: e.target.value }
                        })}
                        className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Buyer Sign-Off</label>
                      <input
                        type="text"
                        placeholder="Reviewer Signature Name"
                        value={editingReview.decision_data?.buyer_sign_off || ""}
                        onChange={(e) => setEditingReview({
                          ...editingReview,
                          decision_data: { ...editingReview.decision_data, buyer_sign_off: e.target.value }
                        })}
                        className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-md font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sign-Off Date</label>
                      <input
                        type="date"
                        value={editingReview.decision_data?.sign_off_date || ""}
                        onChange={(e) => setEditingReview({
                          ...editingReview,
                          decision_data: { ...editingReview.decision_data, sign_off_date: e.target.value }
                        })}
                        className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500">
                Taste Score: <strong className="text-slate-900">{currentTotalScore} / 30</strong> • Decision: <strong className="text-slate-900">{editingReview.buyer_decision || "Pending"}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsReviewModalOpen(false);
                    setEditingReview(null);
                    setSelectedParentProduct(null);
                  }}
                  className="h-9 px-4 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveReview}
                  disabled={isSavingReview}
                  className="h-9 px-5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isSavingReview && <RefreshCw size={13} className="animate-spin" />}
                  {editingReview.id ? "Save Changes" : "Submit Validation Review"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. PRINT PREVIEW MODAL */}
      {/* ------------------------------------------------------------- */}
      {printReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-[#F8F9FA] shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-blue-600" />
                <span className="text-sm font-bold text-slate-900">Print Assessment Sheet — {printReview.product_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="h-8 px-3 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer size={13} />
                  Print Now
                </button>
                <button
                  onClick={() => setPrintReview(null)}
                  className="h-8 px-3 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Print Document Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-6 text-slate-900 font-serif">
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4">
                <div className="text-xs font-sans font-bold tracking-widest text-slate-500 uppercase">HSG / BUYER CHECKLIST</div>
                <h1 className="text-2xl font-sans font-black text-slate-900 mt-1">Product Taste &amp; Commercial Validation</h1>
                <p className="text-xs text-slate-600 mt-0.5">Assess real repeat purchase potential, not just a good first impression.</p>
              </div>

              {/* Header Info Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-sans border-b border-slate-200 pb-4">
                <div><strong>Brand:</strong> {printReview.brand_name || "-"}</div>
                <div><strong>Product / SKU:</strong> {printReview.product_name} {printReview.sku ? `(${printReview.sku})` : ""}</div>
                <div><strong>Admin Reviewer:</strong> {printReview.buyer_name || "-"}</div>
                <div><strong>Date:</strong> {printReview.assessment_date || "-"}</div>
                <div><strong>Product Owner:</strong> {printReview.product_owner || "-"}</div>
              </div>

              {/* Attached Photos in Print */}
              {printReview.images && printReview.images.length > 0 && (
                <div>
                  <h2 className="text-sm font-sans font-bold text-slate-900 uppercase tracking-wider mb-2">Attached Product &amp; Packaging Photos</h2>
                  <div className="grid grid-cols-4 gap-3">
                    {printReview.images.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded border border-slate-300 overflow-hidden">
                        <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scorecard Table */}
              <div>
                <h2 className="text-sm font-sans font-bold text-slate-900 uppercase tracking-wider mb-2">Buyer Assessment Scorecard</h2>
                <table className="w-full text-xs font-sans border border-slate-300">
                  <thead className="bg-slate-100">
                    <tr className="border-b border-slate-300">
                      <th className="p-2 text-left">Criterion / Assessment Question</th>
                      <th className="p-2 text-right w-24">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {CRITERIA_QUESTIONS.map((crit) => (
                      <tr key={crit.id}>
                        <td className="p-2">
                          <span className="font-bold">{crit.title}:</span> {crit.scoreQuestion}
                        </td>
                        <td className="p-2 text-right font-bold font-mono">
                          {(printReview.scorecard as any)?.[crit.id] || 0} / 5
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                      <td className="p-2">TOTAL SCORE</td>
                      <td className="p-2 text-right font-mono text-sm">{printReview.total_score} / 30</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Decision Section */}
              <div className="border border-slate-300 rounded-lg p-4 font-sans text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold uppercase">Buyer Decision:</span>
                  <span className="font-bold text-sm px-3 py-1 bg-slate-100 rounded border border-slate-300">
                    {printReview.buyer_decision || "Pending"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><strong>Key Strengths:</strong> {printReview.decision_data?.key_strengths || "-"}</div>
                  <div><strong>Concerns / Improvements:</strong> {printReview.decision_data?.concerns || "-"}</div>
                  <div><strong>Missing Info:</strong> {printReview.decision_data?.missing_info || "-"}</div>
                  <div><strong>Next Action:</strong> {printReview.decision_data?.next_action || "-"}</div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <div><strong>Buyer Sign-Off:</strong> {printReview.decision_data?.buyer_sign_off || printReview.buyer_name}</div>
                  <div><strong>Date:</strong> {printReview.decision_data?.sign_off_date || printReview.assessment_date}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. UNIVERSAL BLANK WORKSHEET PRINT MODAL */}
      {isPrintWorksheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Universal Product Validation Worksheet (Blank Template)</h2>
                <p className="text-xs text-slate-500">Print or save as PDF for manual tasting reviews and supplier evaluations.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="h-8 px-3 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer size={13} />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setIsPrintWorksheetOpen(false)}
                  className="h-8 px-3 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-6 text-slate-900 font-sans text-xs">
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">INTERNAL BRIDGE / QUALITY &amp; SOURCING</div>
                  <h1 className="text-xl font-black text-slate-900 mt-0.5">Product Taste &amp; Commercial Validation Worksheet</h1>
                  <p className="text-[11px] text-slate-600">Standardized Universal Evaluation Form across all goods &amp; product categories.</p>
                </div>
                <div className="text-right border border-slate-300 rounded p-2 text-[10px] bg-slate-50">
                  <div><strong>Form ID:</strong> HSG-PV-UNIV</div>
                  <div><strong>Version:</strong> 2.4 (Universal)</div>
                </div>
              </div>

              {/* Blank Product & Reviewer Header Fields */}
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/60 grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div><strong>Product Name:</strong> ___________________________________</div>
                  <div><strong>Brand Name:</strong> ___________________________________</div>
                  <div><strong>SKU / Code:</strong> ___________________________________</div>
                </div>
                <div className="space-y-2">
                  <div><strong>Reviewer Name:</strong> ___________________________________</div>
                  <div><strong>Tasting Date:</strong> ___________________________________</div>
                  <div><strong>Supplier / Owner:</strong> ___________________________________</div>
                </div>
              </div>

              {/* Before Assessment Checklist */}
              <div className="border border-slate-300 rounded-lg p-3">
                <h3 className="font-bold uppercase text-[11px] text-slate-800 mb-2">Before Assessment Checklist</h3>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>[ &nbsp; ] 1. Product sample available for tasting</div>
                  <div>[ &nbsp; ] 2. Packaging available for visual inspection</div>
                  <div>[ &nbsp; ] 3. Selling price &amp; margins confirmed</div>
                  <div>[ &nbsp; ] 4. Usage occasion &amp; target audience understood</div>
                </div>
              </div>

              {/* Scorecard Matrix (Criteria 1 to 6) */}
              <div>
                <h3 className="font-bold uppercase text-[11px] text-slate-800 mb-2">1. Scorecard (/30 Points)</h3>
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="p-2 text-left w-12 border-r border-slate-300">No.</th>
                      <th className="p-2 text-left border-r border-slate-300">Criterion &amp; Key Evaluation Question</th>
                      <th className="p-2 text-center w-28">Score (1 to 5)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {CRITERIA_QUESTIONS.map((crit, idx) => (
                      <tr key={crit.id}>
                        <td className="p-2 font-bold text-center border-r border-slate-300">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-300">
                          <strong className="text-slate-900">{crit.title}:</strong> {crit.scoreQuestion}
                        </td>
                        <td className="p-2 text-center font-mono font-bold">
                          [ &nbsp; &nbsp; ] / 5
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                      <td colSpan={2} className="p-2 text-right border-r border-slate-300">TOTAL SCORE (SUM OF 1-6):</td>
                      <td className="p-2 text-center font-mono text-xs">[ &nbsp; &nbsp; ] / 30</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deep Criteria Prompts (Criteria 1-6 Notes) */}
              <div className="border border-slate-300 rounded-lg p-3 space-y-3">
                <h3 className="font-bold uppercase text-[11px] text-slate-800">2. Criteria Observations &amp; Evidence Notes</h3>
                <div className="grid grid-cols-2 gap-4">
                  {CRITERIA_QUESTIONS.map((crit) => (
                    <div key={crit.id} className="border-b border-slate-200 pb-2">
                      <strong className="block text-[11px] text-slate-900">{crit.title}:</strong>
                      <div className="text-[10px] text-slate-500 italic mb-1">{crit.prompts[0]}</div>
                      <div className="h-8 border-b border-dotted border-slate-400" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Commercial Terms & Decision Verdict */}
              <div className="border border-slate-300 rounded-lg p-3 space-y-3">
                <h3 className="font-bold uppercase text-[11px] text-slate-800">3. Decision Verdict &amp; Sign-off</h3>
                <div className="flex gap-4 items-center">
                  <strong>Decision:</strong>
                  <span>[ &nbsp; ] Market Test (Approved)</span>
                  <span>[ &nbsp; ] Further Validation</span>
                  <span>[ &nbsp; ] Paused</span>
                  <span>[ &nbsp; ] Rejected</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                  <div>
                    <strong>Reviewer Signature:</strong>
                    <div className="h-10 border-b border-dotted border-slate-400 mt-1" />
                  </div>
                  <div>
                    <strong>Date &amp; Sign-off:</strong>
                    <div className="h-10 border-b border-dotted border-slate-400 mt-1" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. SCANNED WORKSHEET INGESTION MODAL */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Scan size={16} className="text-[#0B57D0]" />
                <h2 className="text-sm font-bold text-slate-900">Upload Scanned Paper Form</h2>
              </div>
              <button
                onClick={() => setIsScanModalOpen(false)}
                disabled={isProcessingScan}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  1. Select Target Product to Link <span className="text-rose-500">*</span>
                </label>
                <select
                  value={scanSelectedProductId}
                  onChange={(e) => setScanSelectedProductId(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B57D0]/20 font-semibold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand_name} - {p.product_name} {p.sku ? `(${p.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  2. Choose Scanned Form / Photo (JPG, PNG) <span className="text-rose-500">*</span>
                </label>
                <div
                  onClick={() => !isProcessingScan && scanFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-[#0B57D0] rounded-xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/40 transition-colors flex flex-col items-center justify-center gap-2"
                >
                  <Upload size={24} className={isProcessingScan ? "animate-bounce text-[#0B57D0]" : "text-slate-400"} />
                  <div className="text-xs font-bold text-slate-800">
                    {isProcessingScan ? "Uploading scan & processing fields..." : "Click to select or drop scanned form image"}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Archives the original signed copy and extracts scorecard ratings automatically.
                  </p>
                  <input
                    ref={scanFileInputRef}
                    type="file"
                    accept="image/*"
                    disabled={isProcessingScan}
                    onChange={handleProcessScannedForm}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsScanModalOpen(false)}
                disabled={isProcessingScan}
                className="h-8 px-4 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. SHARE PUBLIC REVIEW LINK MODAL */}
      {shareLinkProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Share2 size={16} className="text-[#0B57D0]" />
                <h2 className="text-sm font-bold text-slate-900">Share Public Review Link</h2>
              </div>
              <button onClick={() => setShareLinkProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-xs font-bold text-slate-900">{shareLinkProduct.product_name}</div>
                <div className="text-[11px] text-slate-500">{shareLinkProduct.brand_name} {shareLinkProduct.sku ? `• ${shareLinkProduct.sku}` : ""}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Public Review Link (For Guest / Staff Tasters)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/review?pid=${encodeURIComponent(shareLinkProduct.id)}`}
                    className="flex-1 h-9 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-700 select-all"
                  />
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/review?pid=${encodeURIComponent(shareLinkProduct.id)}`;
                      navigator.clipboard.writeText(link);
                      showToast("Review link copied to clipboard!", "success");
                    }}
                    className="h-9 px-3 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Copy size={13} />
                    Copy
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Anyone with this link can taste the sample, enter their name, and submit a 6-criteria scorecard from their phone.
                </p>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShareLinkProduct(null)}
                className="h-8 px-4 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. CONSOLIDATED PRODUCT REPORT PRINT MODAL */}
      {printProductReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Consolidated Product Validation Report</h2>
                <p className="text-xs text-slate-500">Includes distributor waterfall pricing and all reviewer scorecards.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="h-8 px-3 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Printer size={13} />
                  Print Report
                </button>
                <button
                  onClick={() => setPrintProductReport(null)}
                  className="h-8 px-3 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-6 text-slate-900 font-sans text-xs">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">PRODUCT EVALUATION &amp; VALIDATION REPORT</div>
                  <h1 className="text-2xl font-black text-slate-900 mt-0.5">{printProductReport.product_name}</h1>
                  <p className="text-xs text-slate-600">Brand: <strong>{printProductReport.brand_name}</strong> {printProductReport.sku ? `• SKU: ${printProductReport.sku}` : ""}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 font-semibold">Average Taste Score</div>
                  <div className="text-2xl font-black text-[#0B57D0] font-mono">
                    {Number(printProductReport.average_score || 0).toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 30</span>
                  </div>
                </div>
              </div>

              {/* Product Photos */}
              {printProductReport.images && printProductReport.images.length > 0 && (
                <div>
                  <h3 className="font-bold uppercase text-[11px] text-slate-800 mb-2">Product Photos</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {printProductReport.images.map((img, idx) => (
                      <div key={idx} className="aspect-square rounded border border-slate-300 overflow-hidden">
                        <img src={img} alt={`Product Angle ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Waterfall */}
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
                <h3 className="font-bold uppercase text-[11px] text-slate-800 mb-2">Distributor Pricing Waterfall</h3>
                <div className="grid grid-cols-5 gap-2 text-center text-[11px]">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Cost Price</span>
                    <strong className="text-slate-900 text-xs">${Number(printProductReport.cost_price || 0).toFixed(2)}</strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Land Price</span>
                    <strong className="text-slate-900 text-xs">${Number(printProductReport.land_price || printProductReport.landed_cost || 0).toFixed(2)}</strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Our Price</span>
                    <strong className="text-slate-900 text-xs">${Number(printProductReport.our_price || 0).toFixed(2)}</strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Price to Retailer</span>
                    <strong className="text-slate-900 text-xs">${Number(printProductReport.price_to_retailer || 0).toFixed(2)}</strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Final Shelf RSP</span>
                    <strong className="text-[#0B57D0] text-xs">${Number(printProductReport.rsp || 0).toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Reviewers Scorecards Table */}
              <div>
                <h3 className="font-bold uppercase text-[11px] text-slate-800 mb-2">
                  Reviewer Scorecards ({printProductReport.reviews?.length || 0})
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <th className="p-2 text-left">Reviewer</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-center">Score (/30)</th>
                      <th className="p-2 text-left">Decision</th>
                      <th className="p-2 text-left">Notes / Conditions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {printProductReport.reviews && printProductReport.reviews.length > 0 ? (
                      printProductReport.reviews.map((rev) => (
                        <tr key={rev.id}>
                          <td className="p-2 font-bold text-slate-900">{rev.buyer_name}</td>
                          <td className="p-2 text-slate-600">{rev.assessment_date}</td>
                          <td className="p-2 text-center font-mono font-bold">{rev.total_score} / 30</td>
                          <td className="p-2">{rev.buyer_decision || "Pending"}</td>
                          <td className="p-2 text-slate-600">{rev.decision_data?.concerns || rev.decision_data?.next_action || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">No review submissions recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Image Lightbox Zoom Preview */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-black rounded-lg overflow-hidden flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 text-white bg-black/60 p-1.5 rounded-full hover:bg-black"
            >
              <X size={18} />
            </button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded" />
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={deleteTarget?.type === "product" ? "Delete Product" : "Delete Review"}
        description={
          deleteTarget?.type === "product"
            ? "Are you sure you want to delete this product and all associated reviews? This action cannot be undone."
            : "Are you sure you want to delete this validation review? This action cannot be undone."
        }
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
