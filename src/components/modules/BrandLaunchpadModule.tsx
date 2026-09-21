"use client";

import * as React from "react";
import { 
  Building2, 
  Package, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Upload, 
  QrCode, 
  Sparkles, 
  FileText, 
  ChevronRight, 
  ExternalLink, 
  AlertCircle, 
  Sliders, 
  TrendingUp, 
  Store, 
  Layers, 
  Star, 
  Share2, 
  Eye, 
  Calendar, 
  DollarSign, 
  Check, 
  X, 
  FileCheck,
  ChevronDown
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  BrandLaunchpadBrand, 
  BrandLaunchpadProduct, 
  BrandLaunchpadReview, 
  BrandLaunchpadTrial, 
  BrandLaunchpadRetail, 
  fetchBrandLaunchpadBrands, 
  fetchBrandLaunchpadBrand, 
  saveBrandLaunchpadBrand, 
  deleteBrandLaunchpadBrand, 
  saveBrandLaunchpadProduct, 
  deleteBrandLaunchpadProduct, 
  fetchBrandLaunchpadReviews, 
  submitBrandLaunchpadReview, 
  deleteBrandLaunchpadReview, 
  saveBrandLaunchpadTrial, 
  saveBrandLaunchpadRetail, 
  uploadBrandLaunchpadFile, 
  uploadScannedForm, 
  UserProfile 
} from "@/lib/api";
import { getModulePermission } from "@/lib/permissions";
import { toast } from "sonner";

interface BrandLaunchpadModuleProps {
  profile?: UserProfile | null;
}

export function BrandLaunchpadModule({ profile }: BrandLaunchpadModuleProps) {
  const perm = getModulePermission(profile, "Brand Launchpad");

  // State
  const [brands, setBrands] = React.useState<BrandLaunchpadBrand[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedStepFilter, setSelectedStepFilter] = React.useState<number | "all">("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = React.useState<string>("all");

  // Selected Brand for Active Pipeline Management
  const [activeBrand, setActiveBrand] = React.useState<BrandLaunchpadBrand | null>(null);
  const [activeStepTab, setActiveStepTab] = React.useState<number>(1);

  // Modals
  const [showNewBrandModal, setShowNewBrandModal] = React.useState(false);
  const [editingBrand, setEditingBrand] = React.useState<Partial<BrandLaunchpadBrand> | null>(null);
  const [showAddSkuModal, setShowAddSkuModal] = React.useState(false);
  const [editingSku, setEditingSku] = React.useState<Partial<BrandLaunchpadProduct> | null>(null);
  const [showReviewModal, setShowReviewModal] = React.useState(false);
  const [reviewSkuTarget, setReviewSkuTarget] = React.useState<BrandLaunchpadProduct | null>(null);
  const [editingReview, setEditingReview] = React.useState<Partial<BrandLaunchpadReview> | null>(null);
  const [showScanModal, setShowScanModal] = React.useState(false);
  const [scanTargetType, setScanTargetType] = React.useState<"intake" | "scorecard" | "marketing">("scorecard");
  const [scanSkuTarget, setScanSkuTarget] = React.useState<BrandLaunchpadProduct | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanFile, setScanFile] = React.useState<File | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ type: "brand" | "sku" | "review"; id: string; name: string } | null>(null);

  // Step 4 & 5 form state
  const [trialForm, setTrialForm] = React.useState<Partial<BrandLaunchpadTrial>>({});
  const [retailForm, setRetailForm] = React.useState<Partial<BrandLaunchpadRetail>>({});
  const [isSavingStep, setIsSavingStep] = React.useState(false);

  // Fetch all brands
  const loadBrands = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchBrandLaunchpadBrands();
      if (res.success) {
        setBrands(res.brands || []);
        // Update active brand reference if currently open
        if (activeBrand) {
          const updated = res.brands.find(b => b.id === activeBrand.id);
          if (updated) {
            setActiveBrand(updated);
            if (updated.trial) setTrialForm(updated.trial);
            if (updated.retail) setRetailForm(updated.retail);
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load brands");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeBrand]);

  React.useEffect(() => {
    loadBrands();
    const handleRefresh = () => loadBrands(true);
    window.addEventListener("db-refresh", handleRefresh);
    return () => window.removeEventListener("db-refresh", handleRefresh);
  }, []);

  // When active brand changes, initialize step 4 and 5 states
  React.useEffect(() => {
    if (activeBrand) {
      setActiveStepTab(activeBrand.current_step || 1);
      setTrialForm(activeBrand.trial || {
        m1_channels: ["TikTok Live", "TikTok Shop"],
        m1_units_sold: 0,
        m1_sampling_feedback: "",
        m2_weekly_velocity: "",
        m2_price_response: "Full Price Accepted",
        m2_repeat_purchase_signs: "",
        m3_total_units: 0,
        m3_repeat_rate_percent: 0,
        m3_achieved_margin_percent: 0,
        m3_customer_rating: 0,
        m3_reviews_summary: "",
        trial_status: "In Progress"
      });
      setRetailForm(activeBrand.retail || {
        target_retail_channels: ["Supermarkets"],
        buyer_value_proposition: "",
        buffer_stock_units: 0,
        reorder_lead_time_days: 14,
        post_listing_marketing_budget: "",
        final_verdict: "Pending",
        verdict_notes: "",
        pitch_deck_url: "",
        signed_retail_agreement_url: "",
        approved_by: ""
      });
    }
  }, [activeBrand?.id]);

  // Permission Action Check
  const checkEditPermission = () => {
    if (!perm.edit) {
      toast.error("You have read-only access to this module.");
      return false;
    }
    return true;
  };

  const checkDeletePermission = () => {
    if (!perm.delete) {
      toast.error("You do not have permission to delete records in this module.");
      return false;
    }
    return true;
  };

  // Pricing Waterfall Auto Calculator
  const computeWaterfall = (
    cost: number,
    landedRate: number = 10,
    overheadRate: number = 5,
    ourMarginRate: number = 25,
    retailerMarginRate: number = 35
  ) => {
    const costVal = Number(cost) || 0;
    const landPrice = Number((costVal * (1 + landedRate / 100)).toFixed(2));
    const ourPrice = Number((landPrice * (1 + overheadRate / 100)).toFixed(2));
    const priceToRetailer = Number((ourPrice / (1 - ourMarginRate / 100)).toFixed(2));
    const rsp = Number((priceToRetailer / (1 - retailerMarginRate / 100)).toFixed(2));
    return { landPrice, ourPrice, priceToRetailer, rsp };
  };

  // Save Brand Details
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkEditPermission() || !editingBrand) return;
    if (!editingBrand.brand_name?.trim()) {
      toast.error("Brand Name is required");
      return;
    }

    try {
      const res = await saveBrandLaunchpadBrand(editingBrand);
      if (res.success) {
        toast.success(editingBrand.id ? "Brand updated successfully" : "Brand created successfully");
        setShowNewBrandModal(false);
        setEditingBrand(null);
        await loadBrands();
        if (editingBrand.id && activeBrand?.id === editingBrand.id) {
          setActiveBrand(res.brand);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save brand");
    }
  };

  // Save SKU
  const handleSaveSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkEditPermission() || !editingSku || !activeBrand) return;
    if (!editingSku.product_name?.trim()) {
      toast.error("Product Name is required");
      return;
    }

    try {
      const payload: Partial<BrandLaunchpadProduct> = {
        ...editingSku,
        brand_id: activeBrand.id,
        cost_price: Number(editingSku.cost_price) || 0,
        landed_cost_rate: Number(editingSku.landed_cost_rate) || 10,
        overhead_rate: Number(editingSku.overhead_rate) || 5,
        our_margin_rate: Number(editingSku.our_margin_rate) || 25,
        retailer_margin_rate: Number(editingSku.retailer_margin_rate) || 35,
        shelf_life_months: Number(editingSku.shelf_life_months) || 12,
        ...computeWaterfall(
          Number(editingSku.cost_price) || 0,
          Number(editingSku.landed_cost_rate) || 10,
          Number(editingSku.overhead_rate) || 5,
          Number(editingSku.our_margin_rate) || 25,
          Number(editingSku.retailer_margin_rate) || 35
        )
      };

      const res = await saveBrandLaunchpadProduct(payload);
      if (res.success) {
        toast.success(editingSku.id ? "SKU updated successfully" : "SKU added successfully");
        setShowAddSkuModal(false);
        setEditingSku(null);
        await loadBrands(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save SKU");
    }
  };

  // Submit Taste Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkEditPermission() || !editingReview || !reviewSkuTarget) return;

    try {
      const payload = {
        ...editingReview,
        product_id: reviewSkuTarget.id,
        reviewer_name: editingReview.reviewer_name?.trim() || "Staff Taster",
        assessment_date: editingReview.assessment_date || new Date().toISOString().split("T")[0],
        score_taste_aroma: Number(editingReview.score_taste_aroma) || 3,
        score_texture_quality: Number(editingReview.score_texture_quality) || 3,
        score_packaging_appeal: Number(editingReview.score_packaging_appeal) || 3,
        score_price_believability: Number(editingReview.score_price_believability) || 3,
        score_usage_occasion: Number(editingReview.score_usage_occasion) || 3,
        score_repeat_purchase: Number(editingReview.score_repeat_purchase) || 3,
        reviewer_decision: editingReview.reviewer_decision || "Proceed",
        tasting_notes: editingReview.tasting_notes || ""
      };

      const res = await submitBrandLaunchpadReview(payload);
      if (res.success) {
        toast.success("Taste review submitted successfully");
        setShowReviewModal(false);
        setEditingReview(null);
        setReviewSkuTarget(null);
        await loadBrands(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    }
  };

  // Save Step 4 (Online Trial)
  const handleSaveTrial = async () => {
    if (!checkEditPermission() || !activeBrand) return;
    setIsSavingStep(true);
    try {
      const res = await saveBrandLaunchpadTrial(activeBrand.id, trialForm);
      if (res.success) {
        toast.success("Online trial data saved successfully");
        await loadBrands(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save trial data");
    } finally {
      setIsSavingStep(false);
    }
  };

  // Save Step 5 (Retail Readiness)
  const handleSaveRetail = async () => {
    if (!checkEditPermission() || !activeBrand) return;
    setIsSavingStep(true);
    try {
      const res = await saveBrandLaunchpadRetail(activeBrand.id, retailForm);
      if (res.success) {
        toast.success("Retail readiness and final decision saved");
        await loadBrands(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save retail readiness");
    } finally {
      setIsSavingStep(false);
    }
  };

  // Advance Pipeline Step
  const handleUpdateStep = async (stepNumber: number) => {
    if (!checkEditPermission() || !activeBrand) return;
    try {
      const stepLabels = [
        "Step 1: Intake",
        "Step 2: Taste Scorecard",
        "Step 3: Marketing",
        "Step 4: Online Trial",
        "Step 5: Retail Ready"
      ];
      const res = await saveBrandLaunchpadBrand({
        id: activeBrand.id,
        current_step: stepNumber,
        status: stepLabels[stepNumber - 1] || activeBrand.status
      });
      if (res.success) {
        toast.success(`Advanced to Step ${stepNumber}`);
        setActiveStepTab(stepNumber);
        await loadBrands(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update step");
    }
  };

  // Delete Action Dispatcher
  const handleConfirmDelete = async () => {
    if (!checkDeletePermission() || !deleteConfirm) return;
    try {
      if (deleteConfirm.type === "brand") {
        await deleteBrandLaunchpadBrand(deleteConfirm.id);
        toast.success("Brand deleted successfully");
        if (activeBrand?.id === deleteConfirm.id) setActiveBrand(null);
      } else if (deleteConfirm.type === "sku") {
        await deleteBrandLaunchpadProduct(deleteConfirm.id);
        toast.success("SKU deleted successfully");
      } else if (deleteConfirm.type === "review") {
        await deleteBrandLaunchpadReview(deleteConfirm.id);
        toast.success("Taste review deleted");
      }
      setDeleteConfirm(null);
      await loadBrands(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    }
  };

  // --------------------------------------------------------------------------
  // PDF GENERATION FUNCTIONS (Clean Direct Download - No Window.Print)
  // --------------------------------------------------------------------------

  // 1. Download Blank Intake Form PDF
  const downloadIntakeFormPDF = (brand?: BrandLaunchpadBrand) => {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(11, 87, 208); // Google Blue #0B57D0
    doc.text("HSG GLOBAL - BRAND & PRODUCT INTAKE WORKSHEET", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Step 1: New Brand Pipeline Master Registration & Compliance Assessment", 14, 26);
    doc.line(14, 30, 196, 30);

    // Brand Profile Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("1. Brand & Company Profile", 14, 38);

    autoTable(doc, {
      startY: 42,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
      head: [["Field", "Details / Specifications"]],
      body: [
        ["Brand Name", brand?.brand_name || ""],
        ["Company / Manufacturer Name", brand?.company_name || ""],
        ["Owner Entity Type", brand?.owner_type || "Brand Owner / Manufacturer / Trader / Agent"],
        ["Contact Person & Title", brand?.contact_person || ""],
        ["Email Address", brand?.contact_email || ""],
        ["Phone / WhatsApp", brand?.contact_phone || ""],
        ["Country of Origin", brand?.country_of_origin || ""],
        ["Standard Payment Terms", brand?.payment_terms || "30 Days Net"],
        ["Order-to-Delivery Lead Time", `${brand?.lead_time_days || 14} Days`]
      ]
    });

    const finalY1 = (doc as any).lastAutoTable.finalY || 100;

    // SKUs & Pricing Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("2. Product Range & Commercial Pricing Waterfall", 14, finalY1 + 10);

    const skuRows = (brand?.products && brand.products.length > 0)
      ? brand.products.map(p => [
          p.product_name,
          p.sku || "-",
          p.pack_size || "-",
          `${p.shelf_life_months || 12} Mos`,
          p.storage_condition || "Ambient",
          `$${Number(p.cost_price).toFixed(2)}`,
          `$${Number(p.our_price).toFixed(2)}`,
          `$${Number(p.price_to_retailer).toFixed(2)}`,
          `$${Number(p.rsp).toFixed(2)}`
        ])
      : [
          ["Sample Product 1", "", "", "12 Mos", "Ambient", "$", "$", "$", "$"],
          ["Sample Product 2", "", "", "12 Mos", "Ambient", "$", "$", "$", "$"]
        ];

    autoTable(doc, {
      startY: finalY1 + 14,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [11, 87, 208], textColor: [255, 255, 255], fontStyle: "bold" },
      head: [["Product Name", "SKU", "Pack Size", "Shelf Life", "Storage", "Cost", "Our Price", "Trade Price", "Shelf RSP"]],
      body: skuRows
    });

    const finalY2 = (doc as any).lastAutoTable.finalY || 180;

    // Compliance Checklist
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("3. Initial Compliance & Import Readiness Checklist", 14, finalY2 + 10);

    autoTable(doc, {
      startY: finalY2 + 14,
      theme: "plain",
      styles: { fontSize: 9, cellPadding: 2, textColor: [51, 65, 85] },
      body: [
        ["[  ] English Ingredients & Nutritional Labeling verified compliant for Singapore SFA regulations."],
        ["[  ] Certificate of Analysis (COA) / Food Hygiene & Halal/HACCP certifications available."],
        ["[  ] Minimum 80% remaining shelf life guaranteed upon warehouse receipt."],
        ["[  ] Product barcodes registered (EAN-13 / UPC single and carton barcodes)."],
        ["[  ] Marketing and sample support commitment acknowledged."]
      ]
    });

    // Signature Block
    const finalY3 = (doc as any).lastAutoTable.finalY || 240;
    doc.line(14, finalY3 + 12, 90, finalY3 + 12);
    doc.line(120, finalY3 + 12, 196, finalY3 + 12);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Brand Owner / Authorized Representative Signature & Date", 14, finalY3 + 16);
    doc.text("HSG Global Sales Lead Sign-off & Date", 120, finalY3 + 16);

    doc.save(`HSG_Brand_Intake_${(brand?.brand_name || "Form").replace(/\s+/g, "_")}.pdf`);
    toast.success("Intake Worksheet PDF generated & downloaded");
  };

  // 2. Download Individual 1-Page Paper Scorecard PDF per SKU (with QR Code)
  const downloadSkuPaperScorecardPDF = async (product: BrandLaunchpadProduct, brandName: string) => {
    try {
      const doc = new jsPDF("p", "mm", "a4");

      // Header Banner
      doc.setFillColor(11, 87, 208); // Google Blue
      doc.rect(0, 0, 210, 24, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(255, 255, 255);
      doc.text("HSG GLOBAL - PRODUCT TASTE EVALUATION SCORECARD", 14, 12);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Step 2: Sensory & Commercial Product Assessment Worksheet", 14, 18);

      // SKU Metadata Grid
      autoTable(doc, {
        startY: 28,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2, textColor: [15, 23, 42] },
        body: [
          [
            `Brand: ${brandName || "-"}`,
            `Product Name: ${product.product_name}`,
            `SKU: ${product.sku || "-"}`
          ],
          [
            `Category: ${product.category || "-"}`,
            `Pack Size: ${product.pack_size || "-"}`,
            `Target Shelf RSP: $${Number(product.rsp).toFixed(2)}`
          ],
          [
            `Storage: ${product.storage_condition || "Ambient"}`,
            `Shelf Life: ${product.shelf_life_months || 12} Months`,
            `Date: ____________________`
          ],
          [
            `Reviewer Name: ________________________________`,
            `Reviewer Role: [ ] Admin  [ ] Staff  [ ] Guest Taster`,
            ``
          ]
        ]
      });

      const finalY1 = (doc as any).lastAutoTable.finalY || 55;

      // 6 Criteria Scoring Table (NO Total Score or Score Bands on Paper)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("Sensory & Commercial Evaluation (Score each criterion from 1 to 5 points)", 14, finalY1 + 6);

      autoTable(doc, {
        startY: finalY1 + 10,
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
        headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
        head: [["#", "Evaluation Criteria", "Key Considerations & Prompts", "Score (1 - 5)"]],
        body: [
          [
            "1",
            "Taste & Aroma",
            "Flavor profile, balance of sweetness/saltiness, aroma authentic to expectation, aftertaste.",
            "[   ] / 5"
          ],
          [
            "2",
            "Texture & Quality",
            "Mouthfeel, crunchiness/smoothness, ingredient consistency, visual premiumness.",
            "[   ] / 5"
          ],
          [
            "3",
            "Packaging Appeal",
            "Shelf stand-out, clarity of labeling, ease of opening, material quality & durability.",
            "[   ] / 5"
          ],
          [
            "4",
            "Price Believability",
            "Perceived value vs RSP ($" + Number(product.rsp).toFixed(2) + "), competitive advantage in retail.",
            "[   ] / 5"
          ],
          [
            "5",
            "Usage Occasion",
            "Clear consumer consumption moment (daily snack, gift, cooking, health/wellness).",
            "[   ] / 5"
          ],
          [
            "6",
            "Repeat Purchase",
            "Likelihood of buying again, customer stickiness, household staple potential.",
            "[   ] / 5"
          ]
        ]
      });

      const finalY2 = (doc as any).lastAutoTable.finalY || 135;

      // Tasting Notes Area
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("Tasting Notes, Feedback & Observations:", 14, finalY2 + 8);

      doc.rect(14, finalY2 + 11, 182, 32);
      doc.line(14, finalY2 + 19, 196, finalY2 + 19);
      doc.line(14, finalY2 + 27, 196, finalY2 + 27);
      doc.line(14, finalY2 + 35, 196, finalY2 + 35);

      // Recommendation & Sign-off
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("Reviewer Commercial Verdict:", 14, finalY2 + 50);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("[  ] Proceed to Online Trial      [  ] Proceed with Conditions      [  ] Pause / Need Refinement      [  ] Reject", 14, finalY2 + 56);

      // Embedded Dynamic QR Code Box
      const qrTargetUrl = `https://ib-v2.hsgglobalpteltd.workers.dev/review?pid=${encodeURIComponent(product.id)}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrTargetUrl)}`;

      try {
        const qrImgRes = await fetch(qrApiUrl);
        if (qrImgRes.ok) {
          const blob = await qrImgRes.blob();
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          await new Promise((resolve) => {
            reader.onloadend = () => {
              const base64data = reader.result as string;
              doc.addImage(base64data, "PNG", 14, finalY2 + 65, 28, 28);
              resolve(true);
            };
          });
        }
      } catch (qrErr) {
        console.warn("Could not embed dynamic QR image, drawing placeholder box:", qrErr);
        doc.rect(14, finalY2 + 65, 28, 28);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(11, 87, 208);
      doc.text("Scan QR to Score Online (Mobile)", 46, finalY2 + 74);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Guest tasters & staff can scan this code with a smartphone camera to submit ratings instantly.", 46, finalY2 + 79);
      doc.text(`Link: ${qrTargetUrl}`, 46, finalY2 + 84);

      // Signature line
      doc.line(130, finalY2 + 90, 196, finalY2 + 90);
      doc.setFontSize(8);
      doc.text("Reviewer Signature", 145, finalY2 + 94);

      doc.save(`Taste_Scorecard_${product.product_name.replace(/\s+/g, "_")}.pdf`);
      toast.success(`Scorecard PDF for ${product.product_name} downloaded`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate scorecard PDF");
    }
  };

  // 3. Download Marketing Support Agreement PDF
  const downloadMarketingAgreementPDF = (brand: BrandLaunchpadBrand) => {
    const doc = new jsPDF("p", "mm", "a4");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(11, 87, 208);
    doc.text("HSG GLOBAL - MARKETING SUPPORT & COMMERCIAL AGREEMENT", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Step 3: Brand Story, Creator Angles, Promotional Funding & Retail Goals", 14, 26);
    doc.line(14, 30, 196, 30);

    autoTable(doc, {
      startY: 36,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
      head: [["Category", "Marketing Commitment / Strategic Plan"]],
      body: [
        ["Brand / Company", `${brand.brand_name} (${brand.company_name || "-"})`],
        ["Brand Story & Origin", brand.brand_story || "Not provided"],
        ["Target Consumer & Need", `${brand.target_consumer || "-"} | ${brand.consumer_need_served || "-"}`],
        ["TikTok & Video Angles", brand.tiktok_hooks || "Not provided"],
        ["Launch Promo & Sampling Budget", brand.launch_promo_support || "Not provided"],
        ["Retail Ambition & Channel Fit", brand.retail_ambition || "Supermarkets, Modern Trade, Convenience"]
      ]
    });

    const finalY = (doc as any).lastAutoTable.finalY || 140;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("Commitment Acknowledgment", 14, finalY + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(
      "The Brand Owner confirms the provision of agreed promotional discounts, marketing samples for creator gifting,\n" +
      "and active co-branding support throughout the 3-Month Online Trial and subsequent Modern Trade retail listing.",
      14,
      finalY + 20
    );

    doc.line(14, finalY + 60, 90, finalY + 60);
    doc.line(120, finalY + 60, 196, finalY + 60);
    doc.setFontSize(8);
    doc.text("Authorized Brand Principal Signature", 14, finalY + 65);
    doc.text("HSG Global Commercial Director Sign-off", 120, finalY + 65);

    doc.save(`Marketing_Agreement_${brand.brand_name.replace(/\s+/g, "_")}.pdf`);
    toast.success("Marketing Agreement PDF downloaded");
  };

  // 4. Download 1-Page Retail Pitch Deck PDF (Step 5)
  const downloadRetailPitchDeckPDF = (brand: BrandLaunchpadBrand) => {
    const doc = new jsPDF("p", "mm", "a4");

    // Top Header Banner
    doc.setFillColor(11, 87, 208); // Google Blue
    doc.rect(0, 0, 210, 26, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(`${brand.brand_name.toUpperCase()} - RETAIL BUYER PITCH DECK`, 14, 12);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("HSG Global Modern Trade Listing Proposal & Product Validation Proof", 14, 19);

    // Section 1: Executive Summary & Value Prop
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("1. Executive Summary & Category Value Proposition", 14, 34);

    autoTable(doc, {
      startY: 38,
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59] },
      body: [
        [`Brand: ${brand.brand_name}`, `Origin: ${brand.country_of_origin || "Singapore"}`, `Lead Time: ${brand.lead_time_days || 14} Days`],
        [`Company: ${brand.company_name || "-"}`, `Payment Terms: ${brand.payment_terms || "30 Days Net"}`, `Status: Verified & Validated`],
        [`Buyer Value Prop: ${brand.retail?.buyer_value_proposition || brand.consumer_need_served || "Delivers high-velocity premium category growth."}`, "", ""]
      ]
    });

    const finalY1 = (doc as any).lastAutoTable.finalY || 60;

    // Section 2: Validated Products & Margin Waterfall
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("2. SKU Line-up & Commercial Profitability", 14, finalY1 + 8);

    const skuRows = (brand.products || []).map(p => [
      p.product_name,
      p.sku || "-",
      p.pack_size || "-",
      `${p.shelf_life_months || 12}M`,
      p.avg_taste_score ? `${Number(p.avg_taste_score).toFixed(1)}/30` : "Validated",
      `$${Number(p.price_to_retailer).toFixed(2)}`,
      `$${Number(p.rsp).toFixed(2)}`,
      `${Number(p.retailer_margin_rate || 35).toFixed(0)}%`
    ]);

    autoTable(doc, {
      startY: finalY1 + 12,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [11, 87, 208], textColor: [255, 255, 255], fontStyle: "bold" },
      head: [["Product Name", "SKU", "Pack Size", "Shelf Life", "Taste Score", "Trade Cost", "Shelf RSP", "Retail Margin"]],
      body: skuRows.length > 0 ? skuRows : [["Sample SKU", "-", "-", "12M", "28.0/30", "$3.50", "$5.50", "36%"]]
    });

    const finalY2 = (doc as any).lastAutoTable.finalY || 110;

    // Section 3: 3-Month Online Trial Proof Metrics
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("3. Online Traction & Velocity Proof (3-Month Pilot)", 14, finalY2 + 8);

    const trial = brand.trial;
    autoTable(doc, {
      startY: finalY2 + 12,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: "bold" },
      head: [["Online Metric", "Result / Observation"]],
      body: [
        ["Total Online Units Sold (Month 1-3)", `${trial?.m3_total_units || trial?.m1_units_sold || 0} Units`],
        ["Repeat Customer Rate", `${trial?.m3_repeat_rate_percent || 0}%`],
        ["Customer Satisfaction Rating", `${trial?.m3_customer_rating || "4.8"}/5.0`],
        ["Price Sensitivity Response", trial?.m2_price_response || "Full Price Accepted"],
        ["Customer Feedback Highlights", trial?.m3_reviews_summary || trial?.m1_sampling_feedback || "Strong organic repeat orders."]
      ]
    });

    const finalY3 = (doc as any).lastAutoTable.finalY || 170;

    // Section 4: Operational Readiness
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("4. Supply Chain & Listing Support", 14, finalY3 + 8);

    const retail = brand.retail;
    autoTable(doc, {
      startY: finalY3 + 12,
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59] },
      body: [
        [`Target Channels: ${(retail?.target_retail_channels || ["Supermarkets"]).join(", ")}`],
        [`Local Buffer Stock in SG Warehouse: ${retail?.buffer_stock_units || 500} Units`],
        [`Reorder Lead Time: ${retail?.reorder_lead_time_days || 14} Days`],
        [`Post-Listing Promo Budget: ${retail?.post_listing_marketing_budget || "In-store sampling & promotional end-cap support committed."}`]
      ]
    });

    const finalY4 = (doc as any).lastAutoTable.finalY || 220;

    // Decision Stamp
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, finalY4 + 8, 182, 28, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(11, 87, 208);
    doc.text(`Commercial Decision: ${retail?.final_verdict || "Scale Listing"}`, 20, finalY4 + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Approved by: ${retail?.approved_by || "HSG Global Commercial Team"} | Date: ${new Date().toLocaleDateString("en-SG")}`, 20, finalY4 + 26);

    doc.save(`Retail_Pitch_Deck_${brand.brand_name.replace(/\s+/g, "_")}.pdf`);
    toast.success("1-Page Retail Pitch Deck PDF downloaded");
  };

  // --------------------------------------------------------------------------
  // AI OCR FORM SCAN HANDLER
  // --------------------------------------------------------------------------
  const handleUploadAndScan = async () => {
    if (!checkEditPermission() || !scanFile || !activeBrand) return;
    setIsScanning(true);
    try {
      const uploadRes = await uploadScannedForm(scanFile);
      if (!uploadRes.success) throw new Error("Upload scan failed");

      toast.success("Scan uploaded to secure storage.");
      const ext = uploadRes.extracted_data;

      if (scanTargetType === "scorecard" && scanSkuTarget && ext?.scores) {
        // Pre-fill review form with AI parsed scores
        setEditingReview({
          product_id: scanSkuTarget.id,
          reviewer_name: ext.reviewer_name || "Scan Reviewer",
          assessment_date: ext.assessment_date || new Date().toISOString().split("T")[0],
          score_taste_aroma: ext.scores.taste_aroma || 3,
          score_texture_quality: ext.scores.texture_quality || 3,
          score_packaging_appeal: ext.scores.packaging_appeal || 3,
          score_price_believability: ext.scores.price_believability || 3,
          score_usage_occasion: ext.scores.usage_occasion || 3,
          score_repeat_purchase: ext.scores.repeat_purchase || 3,
          reviewer_decision: ext.reviewer_decision || "Proceed",
          tasting_notes: ext.tasting_notes || "",
          scanned_worksheet_url: uploadRes.scan_url
        });
        setReviewSkuTarget(scanSkuTarget);
        setShowScanModal(false);
        setShowReviewModal(true);
        toast.success("Handwritten scores parsed! Review and confirm before submitting.");
      } else if (scanTargetType === "intake") {
        await saveBrandLaunchpadBrand({
          id: activeBrand.id,
          scanned_intake_url: uploadRes.scan_url
        });
        setShowScanModal(false);
        await loadBrands(true);
        toast.success("Scanned Intake worksheet linked to brand.");
      } else if (scanTargetType === "marketing") {
        await saveBrandLaunchpadBrand({
          id: activeBrand.id,
          scanned_marketing_url: uploadRes.scan_url
        });
        setShowScanModal(false);
        await loadBrands(true);
        toast.success("Scanned Marketing agreement linked to brand.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to parse scan");
    } finally {
      setIsScanning(false);
      setScanFile(null);
    }
  };

  // Filtered Brands
  const filteredBrands = brands.filter((b) => {
    const matchesSearch =
      b.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.contact_person.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStep = selectedStepFilter === "all" || b.current_step === selectedStepFilter;
    const matchesStatus = selectedStatusFilter === "all" || b.status === selectedStatusFilter;
    return matchesSearch && matchesStep && matchesStatus;
  });

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* Top Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">Brand Launchpad</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            5-Step New Brand & Product launch pipeline: Intake, Taste Scorecards, Marketing Support, Online Trial, and Retail Readiness.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeBrand ? (
            <button
              onClick={() => setActiveBrand(null)}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back to Brand Pipeline
            </button>
          ) : (
            <button
              onClick={() => {
                if (!checkEditPermission()) return;
                setEditingBrand({
                  brand_name: "",
                  company_name: "",
                  owner_type: "Brand Owner",
                  contact_person: "",
                  contact_email: "",
                  contact_phone: "",
                  country_of_origin: "Singapore",
                  payment_terms: "30 Days Net",
                  lead_time_days: 14,
                  current_step: 1,
                  status: "Step 1: Intake",
                  brand_story: "",
                  target_consumer: "",
                  consumer_need_served: "",
                  tiktok_hooks: "",
                  launch_promo_support: "",
                  retail_ambition: ""
                });
                setShowNewBrandModal(true);
              }}
              disabled={!perm.edit}
              className={`h-8 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                perm.edit
                  ? "bg-[#0B57D0] hover:bg-[#0842A0] text-white cursor-pointer"
                  : "bg-[#0B57D0]/50 text-white cursor-not-allowed opacity-60"
              }`}
            >
              <Plus className="w-4 h-4" /> New Brand Pitch
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      {!activeBrand ? (
        // --------------------------------------------------------------------
        // MASTER BRANDS TABLE VIEW
        // --------------------------------------------------------------------
        <div className="flex flex-col flex-1 min-h-0">
          {/* Filter Toolbar */}
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search brand, company, contact..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedStepFilter}
                onChange={(e) => setSelectedStepFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] text-zinc-700"
              >
                <option value="all">All Steps (1 to 5)</option>
                <option value={1}>Step 1: Intake & Pricing</option>
                <option value={2}>Step 2: Taste Scorecard</option>
                <option value={3}>Step 3: Marketing Support</option>
                <option value={4}>Step 4: Online Trial</option>
                <option value={5}>Step 5: Retail Ready</option>
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] text-zinc-700"
              >
                <option value="all">All Statuses</option>
                <option value="Step 1: Intake">Step 1: Intake</option>
                <option value="Step 2: Taste Scorecard">Step 2: Taste Scorecard</option>
                <option value="Step 3: Marketing">Step 3: Marketing</option>
                <option value="Step 4: Online Trial">Step 4: Online Trial</option>
                <option value="Step 5: Retail Ready">Step 5: Retail Ready</option>
                <option value="Scale">Scale (Approved)</option>
                <option value="Improve">Improve</option>
                <option value="Hold">Hold</option>
                <option value="Stop">Stop</option>
              </select>

              <button
                onClick={() => loadBrands()}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-zinc-700 flex items-center gap-1 cursor-pointer"
                title="Refresh Brands"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Table Viewport */}
          <div className="flex-1 min-h-0 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-2 text-zinc-400">
                <RefreshCw className="w-6 h-6 animate-spin text-[#0B57D0]" />
                <span className="text-xs font-semibold">Loading Brand Pipeline...</span>
              </div>
            ) : filteredBrands.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-zinc-500">
                <Building2 className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-zinc-800">No brand pitches found</p>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Start by adding a new brand pitch with its initial product SKUs and pricing waterfall.
                </p>
                {perm.edit && (
                  <button
                    onClick={() => {
                      setEditingBrand({
                        brand_name: "",
                        company_name: "",
                        owner_type: "Brand Owner",
                        country_of_origin: "Singapore",
                        current_step: 1,
                        status: "Step 1: Intake"
                      });
                      setShowNewBrandModal(true);
                    }}
                    className="mt-4 h-8 px-3 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add First Brand
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200 text-zinc-600 font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Brand & Company</th>
                    <th className="py-2.5 px-3">Entity / Origin</th>
                    <th className="py-2.5 px-3">Products (SKUs)</th>
                    <th className="py-2.5 px-3">Current Step</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Sensory Score</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-zinc-800">
                  {filteredBrands.map((brand) => {
                    const skus = brand.products || [];
                    const avgScore = skus.length > 0 
                      ? (skus.reduce((acc, p) => acc + Number(p.avg_taste_score || 0), 0) / skus.length).toFixed(1)
                      : "0.0";

                    return (
                      <tr
                        key={brand.id}
                        onClick={() => setActiveBrand(brand)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4 font-semibold text-zinc-950">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-900 group-hover:text-[#0B57D0] transition-colors">
                              {brand.brand_name}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 font-normal mt-0.5">
                            {brand.company_name || "Direct Principal"} {brand.contact_person ? `• ${brand.contact_person}` : ""}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {brand.owner_type || "Brand Owner"}
                          </span>
                          <div className="text-[11px] text-zinc-500 mt-0.5">{brand.country_of_origin || "Singapore"}</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-semibold text-zinc-900">
                            {skus.length} SKU{skus.length !== 1 ? "s" : ""}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                            {skus.map(s => s.product_name).join(", ") || "No SKUs listed"}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#D3E3FD] text-[#041E49]">
                            Step {brand.current_step || 1}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            brand.status === "Scale" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            brand.status === "Stop" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            {brand.status}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 font-semibold text-zinc-900">
                            <Star className="w-3.5 h-3.5 text-[#0B57D0] fill-[#0B57D0]" />
                            <span>{avgScore} / 30</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => downloadIntakeFormPDF(brand)}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-zinc-600 hover:text-[#0B57D0] transition-colors"
                              title="Download Intake PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (!checkEditPermission()) return;
                                setEditingBrand(brand);
                                setShowNewBrandModal(true);
                              }}
                              disabled={!perm.edit}
                              className="p-1.5 rounded-md hover:bg-slate-100 text-zinc-600 hover:text-[#0B57D0] transition-colors disabled:opacity-40"
                              title="Edit Brand Profile"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (!checkDeletePermission()) return;
                                setDeleteConfirm({ type: "brand", id: brand.id, name: brand.brand_name });
                              }}
                              disabled={!perm.delete}
                              className="p-1.5 rounded-md hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors disabled:opacity-40"
                              title="Delete Brand"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setActiveBrand(brand)}
                              className="h-7 px-2.5 rounded-md bg-slate-100 hover:bg-[#D3E3FD] text-zinc-800 hover:text-[#041E49] text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              Open Pipeline <ChevronRight className="w-3 h-3" />
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
        </div>
      ) : (
        // --------------------------------------------------------------------
        // ACTIVE BRAND 5-STEP PIPELINE WORKSPACE
        // --------------------------------------------------------------------
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Brand Header Capsule */}
          <div className="px-4 py-3 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-950">{activeBrand.brand_name}</h2>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200 text-slate-800">
                    {activeBrand.owner_type}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#D3E3FD] text-[#041E49]">
                    {activeBrand.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {activeBrand.company_name} • Contact: {activeBrand.contact_person || "-"} ({activeBrand.contact_email || "-"}) • Lead Time: {activeBrand.lead_time_days || 14} Days
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (!checkEditPermission()) return;
                  setEditingBrand(activeBrand);
                  setShowNewBrandModal(true);
                }}
                disabled={!perm.edit}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>

              <button
                onClick={() => downloadRetailPitchDeckPDF(activeBrand)}
                className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> 1-Page Retail Pitch Deck
              </button>
            </div>
          </div>

          {/* 5-Step Stepper Navigation Bar */}
          <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
            {[
              { num: 1, title: "Step 1: Intake & Pricing", icon: Building2 },
              { num: 2, title: "Step 2: Taste Scorecard", icon: Star },
              { num: 3, title: "Step 3: Marketing Support", icon: TrendingUp },
              { num: 4, title: "Step 4: Online Trial", icon: Layers },
              { num: 5, title: "Step 5: Retail Ready", icon: Store }
            ].map((step) => {
              const isActive = activeStepTab === step.num;
              const isPast = (activeBrand.current_step || 1) >= step.num;
              return (
                <button
                  key={step.num}
                  onClick={() => setActiveStepTab(step.num)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                    isActive
                      ? "bg-[#D3E3FD] text-[#041E49] shadow-xs"
                      : "text-zinc-600 hover:bg-slate-100 hover:text-zinc-900"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? "bg-[#0B57D0] text-white"
                      : isPast
                      ? "bg-slate-200 text-slate-800"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {step.num}
                  </span>
                  <span>{step.title}</span>
                </button>
              );
            })}

            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              {activeStepTab < 5 && (
                <button
                  onClick={() => handleUpdateStep(activeStepTab + 1)}
                  disabled={!perm.edit}
                  className="h-7 px-3 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
                >
                  Advance to Step {activeStepTab + 1} <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Active Step Content Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-slate-50/50">
            {/* STEP 1: INTAKE & PRICING WATERFALL */}
            {activeStepTab === 1 && (
              <div className="flex flex-col gap-4 max-w-6xl mx-auto">
                {/* Step Toolbar & Forms */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Step 1: Brand & SKU Commercial Intake</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Configure multiple SKU variants, packaging dimensions, and 5-tier pricing waterfall (Cost $\to$ Land $\to$ Our Price $\to$ Trade Price $\to$ Shelf RSP).
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadIntakeFormPDF(activeBrand)}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Blank Worksheet
                    </button>

                    <button
                      onClick={() => {
                        if (!checkEditPermission()) return;
                        setScanTargetType("intake");
                        setShowScanModal(true);
                      }}
                      disabled={!perm.edit}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Signed Scan
                    </button>

                    <button
                      onClick={() => {
                        if (!checkEditPermission()) return;
                        setEditingSku({
                          product_name: "",
                          sku: "",
                          category: "Food & Beverage",
                          pack_size: "",
                          shelf_life_months: 12,
                          storage_condition: "Ambient",
                          cost_price: 0,
                          landed_cost_rate: 10,
                          overhead_rate: 5,
                          our_margin_rate: 25,
                          retailer_margin_rate: 35
                        });
                        setShowAddSkuModal(true);
                      }}
                      disabled={!perm.edit}
                      className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Product (SKU)
                    </button>
                  </div>
                </div>

                {/* SKU Cards / Table */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                      Product SKUs ({activeBrand.products?.length || 0})
                    </span>
                    {activeBrand.scanned_intake_url && (
                      <a
                        href={activeBrand.scanned_intake_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#0B57D0] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <FileCheck className="w-3.5 h-3.5" /> View Archived Intake Scan
                      </a>
                    )}
                  </div>

                  {(!activeBrand.products || activeBrand.products.length === 0) ? (
                    <div className="p-8 text-center text-zinc-500 text-xs">
                      No product SKUs added yet. Click &quot;Add Product (SKU)&quot; above to add individual products.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {activeBrand.products.map((sku, index) => {
                        return (
                          <div key={sku.id} className="p-4 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                                </span>
                                <div>
                                  <h4 className="text-sm font-bold text-zinc-950">{sku.product_name}</h4>
                                  <span className="text-xs text-zinc-500">
                                    SKU: {sku.sku || "N/A"} • {sku.category || "General"} • {sku.pack_size || "Standard"} • {sku.shelf_life_months} Mos • {sku.storage_condition}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => downloadSkuPaperScorecardPDF(sku, activeBrand.brand_name)}
                                  className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 flex items-center gap-1 cursor-pointer"
                                  title="Download Printable Scorecard for this SKU"
                                >
                                  <Download className="w-3 h-3" /> Scorecard PDF
                                </button>

                                <button
                                  onClick={() => {
                                    if (!checkEditPermission()) return;
                                    setEditingSku(sku);
                                    setShowAddSkuModal(true);
                                  }}
                                  disabled={!perm.edit}
                                  className="p-1.5 rounded-md hover:bg-slate-100 text-zinc-600 hover:text-[#0B57D0] transition-colors disabled:opacity-40"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    if (!checkDeletePermission()) return;
                                    setDeleteConfirm({ type: "sku", id: sku.id, name: sku.product_name });
                                  }}
                                  disabled={!perm.delete}
                                  className="p-1.5 rounded-md hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors disabled:opacity-40"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Pricing Waterfall Metrics Ribbon */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#F8F9FA] p-3 rounded-lg border border-slate-200 text-xs">
                              <div>
                                <span className="text-[10px] text-zinc-500 block">1. Cost Price</span>
                                <span className="font-bold text-zinc-900">${Number(sku.cost_price).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block">2. Land Price (+{sku.landed_cost_rate || 10}%)</span>
                                <span className="font-bold text-zinc-900">${Number(sku.land_price).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block">3. Our Price (+{sku.overhead_rate || 5}%)</span>
                                <span className="font-bold text-zinc-900">${Number(sku.our_price).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block">4. Trade Price ({sku.our_margin_rate || 25}% Mgn)</span>
                                <span className="font-bold text-[#0B57D0]">${Number(sku.price_to_retailer).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block">5. Shelf RSP ({sku.retailer_margin_rate || 35}% Mgn)</span>
                                <span className="font-bold text-emerald-700">${Number(sku.rsp).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: TASTE SCORECARDS */}
            {activeStepTab === 2 && (
              <div className="flex flex-col gap-4 max-w-6xl mx-auto">
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Step 2: Sensory & Taste Evaluation</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Multi-reviewer sensory evaluation across 6 criteria (1-5 pts each, max 30 pts). Download 1-page paper scorecards or review via smartphone QR code.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {(!activeBrand.products || activeBrand.products.length === 0) ? (
                    <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-zinc-500 text-xs">
                      No products available. Please add SKUs in Step 1 first.
                    </div>
                  ) : (
                    activeBrand.products.map((sku) => {
                      const reviews = sku.reviews || [];
                      return (
                        <div key={sku.id} className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                          {/* SKU Header */}
                          <div className="px-4 py-3 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-zinc-950">{sku.product_name}</h4>
                              <span className="text-xs text-zinc-500">SKU: {sku.sku || "-"} • RSP: ${Number(sku.rsp).toFixed(2)}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-xs">
                                <Star className="w-3.5 h-3.5 text-[#0B57D0] fill-[#0B57D0]" />
                                <span className="text-xs font-bold text-zinc-900">
                                  {Number(sku.avg_taste_score || 0).toFixed(1)} / 30
                                </span>
                                <span className="text-[10px] text-zinc-500">({sku.reviews_count || 0} reviews)</span>
                              </div>

                              <button
                                onClick={() => downloadSkuPaperScorecardPDF(sku, activeBrand.brand_name)}
                                className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3" /> Paper Sheet PDF
                              </button>

                              <button
                                onClick={() => {
                                  if (!checkEditPermission()) return;
                                  setScanSkuTarget(sku);
                                  setScanTargetType("scorecard");
                                  setShowScanModal(true);
                                }}
                                disabled={!perm.edit}
                                className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                              >
                                <Upload className="w-3 h-3" /> AI Scan OCR
                              </button>

                              <button
                                onClick={() => {
                                  if (!checkEditPermission()) return;
                                  setReviewSkuTarget(sku);
                                  setEditingReview({
                                    product_id: sku.id,
                                    reviewer_name: profile?.name || "Staff Reviewer",
                                    reviewer_type: "Admin",
                                    assessment_date: new Date().toISOString().split("T")[0],
                                    score_taste_aroma: 4,
                                    score_texture_quality: 4,
                                    score_packaging_appeal: 4,
                                    score_price_believability: 4,
                                    score_usage_occasion: 4,
                                    score_repeat_purchase: 4,
                                    reviewer_decision: "Proceed"
                                  });
                                  setShowReviewModal(true);
                                }}
                                disabled={!perm.edit}
                                className="h-7 px-3 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Plus className="w-3 h-3" /> Add Taste Review
                              </button>
                            </div>
                          </div>

                          {/* Reviews List */}
                          <div className="p-4">
                            {reviews.length === 0 ? (
                              <div className="text-center py-4 text-xs text-zinc-400">
                                No evaluations submitted yet for this product. Use the button above or scan QR code on the paper worksheet.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {reviews.map((rev) => (
                                  <div
                                    key={rev.id}
                                    className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs"
                                  >
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-zinc-900">{rev.reviewer_name}</span>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700">
                                          {rev.reviewer_type}
                                        </span>
                                        <span className="text-[11px] text-zinc-500">{rev.assessment_date}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          rev.total_score >= 24 ? "bg-emerald-100 text-emerald-800" :
                                          rev.total_score >= 18 ? "bg-amber-100 text-amber-800" :
                                          "bg-rose-100 text-rose-800"
                                        }`}>
                                          {rev.total_score} / 30 ({rev.score_band})
                                        </span>
                                      </div>
                                      {rev.tasting_notes && (
                                        <p className="text-zinc-600 italic mt-0.5">&quot;{rev.tasting_notes}&quot;</p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-zinc-700">Decision: {rev.reviewer_decision}</span>
                                      {perm.delete && (
                                        <button
                                          onClick={() => {
                                            if (!checkDeletePermission()) return;
                                            setDeleteConfirm({ type: "review", id: rev.id, name: `Review by ${rev.reviewer_name}` });
                                          }}
                                          className="p-1 text-zinc-400 hover:text-rose-600 transition-colors"
                                          title="Delete Review"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: MARKETING SUPPORT */}
            {activeStepTab === 3 && (
              <div className="flex flex-col gap-4 max-w-4xl mx-auto bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Step 3: Marketing & Creator Launch Alignment</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Brand origin story, TikTok content hooks, promotional discount funding, and creator gifting commitment.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadMarketingAgreementPDF(activeBrand)}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Agreement PDF
                    </button>

                    <button
                      onClick={() => {
                        if (!checkEditPermission()) return;
                        setScanTargetType("marketing");
                        setShowScanModal(true);
                      }}
                      disabled={!perm.edit}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Signed Scan
                    </button>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-zinc-800 block mb-1">Brand Origin Story & Unique Selling Point</label>
                    <textarea
                      rows={3}
                      value={activeBrand.brand_story || ""}
                      onChange={(e) => setActiveBrand({ ...activeBrand, brand_story: e.target.value })}
                      placeholder="Why this brand exists, heritage, craftsmanship, key ingredients..."
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-zinc-800 block mb-1">Target Consumer Profile</label>
                      <input
                        type="text"
                        value={activeBrand.target_consumer || ""}
                        onChange={(e) => setActiveBrand({ ...activeBrand, target_consumer: e.target.value })}
                        placeholder="e.g. Young families, health-conscious millennials"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-zinc-800 block mb-1">Key Consumer Need Served</label>
                      <input
                        type="text"
                        value={activeBrand.consumer_need_served || ""}
                        onChange={(e) => setActiveBrand({ ...activeBrand, consumer_need_served: e.target.value })}
                        placeholder="e.g. Quick authentic breakfast, premium gifting"
                        className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-zinc-800 block mb-1">TikTok Video Angles & Content Hooks</label>
                    <textarea
                      rows={2}
                      value={activeBrand.tiktok_hooks || ""}
                      onChange={(e) => setActiveBrand({ ...activeBrand, tiktok_hooks: e.target.value })}
                      placeholder="e.g. ASMR unboxing, blind taste tests vs top market brand, spicy challenge"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-zinc-800 block mb-1">Launch Promotion & Sampling Support</label>
                    <textarea
                      rows={2}
                      value={activeBrand.launch_promo_support || ""}
                      onChange={(e) => setActiveBrand({ ...activeBrand, launch_promo_support: e.target.value })}
                      placeholder="e.g. 50 free cartons for creator seeding, 20% discount subsidy for first 30 days"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={async () => {
                        if (!checkEditPermission()) return;
                        try {
                          await saveBrandLaunchpadBrand(activeBrand);
                          toast.success("Marketing support alignment saved");
                        } catch (e: any) {
                          toast.error(e.message || "Failed to save");
                        }
                      }}
                      className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold cursor-pointer transition-colors"
                    >
                      Save Marketing Alignment
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: ONLINE TRIAL */}
            {activeStepTab === 4 && (
              <div className="flex flex-col gap-4 max-w-4xl mx-auto bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Step 4: 3-Month Online Platform Trial</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Verify consumer demand velocity, price acceptance, repeat purchase signals, and customer feedback.
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    trialForm.trial_status === "Proof Established" ? "bg-emerald-100 text-emerald-800" :
                    "bg-slate-100 text-slate-800"
                  }`}>
                    {trialForm.trial_status || "In Progress"}
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Month 1 */}
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <h4 className="font-bold text-zinc-900 mb-2">Month 1: Launch Response & Sampling</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-zinc-600 block mb-1">Total Units Sold (M1)</label>
                        <input
                          type="number"
                          value={trialForm.m1_units_sold || 0}
                          onChange={(e) => setTrialForm({ ...trialForm, m1_units_sold: Number(e.target.value) })}
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-600 block mb-1">Early Sampling Feedback</label>
                        <input
                          type="text"
                          value={trialForm.m1_sampling_feedback || ""}
                          onChange={(e) => setTrialForm({ ...trialForm, m1_sampling_feedback: e.target.value })}
                          placeholder="Feedback from live streams & sample recipients"
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Month 2 */}
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <h4 className="font-bold text-zinc-900 mb-2">Month 2: Consistency & Price Sensitivity Check</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-zinc-600 block mb-1">Weekly Velocity Trend</label>
                        <input
                          type="text"
                          value={trialForm.m2_weekly_velocity || ""}
                          onChange={(e) => setTrialForm({ ...trialForm, m2_weekly_velocity: e.target.value })}
                          placeholder="e.g. 50 units/week stable"
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-600 block mb-1">Price Response</label>
                        <select
                          value={trialForm.m2_price_response || "Full Price Accepted"}
                          onChange={(e) => setTrialForm({ ...trialForm, m2_price_response: e.target.value })}
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="Full Price Accepted">Full Price Accepted</option>
                          <option value="Price Sensitive">Price Sensitive</option>
                          <option value="Discounts Needed">Discounts Needed</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-zinc-600 block mb-1">Repeat Purchase Signs</label>
                        <input
                          type="text"
                          value={trialForm.m2_repeat_purchase_signs || ""}
                          onChange={(e) => setTrialForm({ ...trialForm, m2_repeat_purchase_signs: e.target.value })}
                          placeholder="e.g. Returning buyers commenting"
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Month 3 */}
                  <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <h4 className="font-bold text-zinc-900 mb-2">Month 3: Retail Proof Pack Compilation</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-zinc-600 block mb-1">Total 3-Mo Units</label>
                        <input
                          type="number"
                          value={trialForm.m3_total_units || 0}
                          onChange={(e) => setTrialForm({ ...trialForm, m3_total_units: Number(e.target.value) })}
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-600 block mb-1">Repeat Rate (%)</label>
                        <input
                          type="number"
                          value={trialForm.m3_repeat_rate_percent || 0}
                          onChange={(e) => setTrialForm({ ...trialForm, m3_repeat_rate_percent: Number(e.target.value) })}
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-600 block mb-1">Achieved Margin (%)</label>
                        <input
                          type="number"
                          value={trialForm.m3_achieved_margin_percent || 0}
                          onChange={(e) => setTrialForm({ ...trialForm, m3_achieved_margin_percent: Number(e.target.value) })}
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-zinc-600 block mb-1">Avg Customer Rating (/5.0)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={trialForm.m3_customer_rating || 0}
                          onChange={(e) => setTrialForm({ ...trialForm, m3_customer_rating: Number(e.target.value) })}
                          className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveTrial}
                      disabled={isSavingStep || !perm.edit}
                      className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {isSavingStep ? "Saving..." : "Save Online Trial Data"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: RETAIL READY */}
            {activeStepTab === 5 && (
              <div className="flex flex-col gap-4 max-w-4xl mx-auto bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Step 5: Retail Readiness & Buyer Decision</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Target modern trade channels, buffer inventory, value proposition, and final commercial decision.
                    </p>
                  </div>
                  <button
                    onClick={() => downloadRetailPitchDeckPDF(activeBrand)}
                    className="h-8 px-3 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Pitch Deck PDF
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-zinc-800 block mb-1">Retail Buyer Value Proposition</label>
                    <textarea
                      rows={2}
                      value={retailForm.buyer_value_proposition || ""}
                      onChange={(e) => setRetailForm({ ...retailForm, buyer_value_proposition: e.target.value })}
                      placeholder="Why should supermarket category buyers list this brand over competitors?"
                      className="w-full p-2.5 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-zinc-800 block mb-1">SG Warehouse Buffer Stock (Units)</label>
                      <input
                        type="number"
                        value={retailForm.buffer_stock_units || 0}
                        onChange={(e) => setRetailForm({ ...retailForm, buffer_stock_units: Number(e.target.value) })}
                        className="w-full p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-zinc-800 block mb-1">Reorder Lead Time (Days)</label>
                      <input
                        type="number"
                        value={retailForm.reorder_lead_time_days || 14}
                        onChange={(e) => setRetailForm({ ...retailForm, reorder_lead_time_days: Number(e.target.value) })}
                        className="w-full p-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-zinc-800 block mb-1">Post-Listing Marketing Budget</label>
                    <input
                      type="text"
                      value={retailForm.post_listing_marketing_budget || ""}
                      onChange={(e) => setRetailForm({ ...retailForm, post_listing_marketing_budget: e.target.value })}
                      placeholder="In-store promoters, sampling allowance, catalog inclusion"
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                  </div>

                  {/* Commercial Decision Selector */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="font-bold text-zinc-950 block mb-2">Final Commercial Decision</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { val: "Scale", label: "Scale (Approve)", color: "bg-emerald-600 text-white" },
                        { val: "Improve", label: "Improve (Refine)", color: "bg-amber-600 text-white" },
                        { val: "Hold", label: "Hold (Wait)", color: "bg-slate-600 text-white" },
                        { val: "Stop", label: "Stop (Reject)", color: "bg-rose-600 text-white" }
                      ].map((btn) => (
                        <button
                          key={btn.val}
                          type="button"
                          onClick={() => setRetailForm({ ...retailForm, final_verdict: btn.val })}
                          className={`py-2 px-3 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                            retailForm.final_verdict === btn.val
                              ? `${btn.color} shadow-xs`
                              : "bg-white border border-slate-200 text-zinc-700 hover:bg-slate-100"
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveRetail}
                      disabled={isSavingStep || !perm.edit}
                      className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {isSavingStep ? "Saving..." : "Save Retail Decision"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: NEW / EDIT BRAND PROFILE */}
      {/* -------------------------------------------------------------------- */}
      {showNewBrandModal && editingBrand && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-950">
                {editingBrand.id ? "Edit Brand Profile" : "New Brand Registration"}
              </h3>
              <button
                onClick={() => { setShowNewBrandModal(false); setEditingBrand(null); }}
                className="p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
              <div>
                <label className="font-bold text-zinc-800 block mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={editingBrand.brand_name || ""}
                  onChange={(e) => setEditingBrand({ ...editingBrand, brand_name: e.target.value })}
                  placeholder="e.g. Golden Sun Crisps"
                  className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Company Name</label>
                  <input
                    type="text"
                    value={editingBrand.company_name || ""}
                    onChange={(e) => setEditingBrand({ ...editingBrand, company_name: e.target.value })}
                    placeholder="e.g. Sun Foods Pte Ltd"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Entity Type</label>
                  <select
                    value={editingBrand.owner_type || "Brand Owner"}
                    onChange={(e) => setEditingBrand({ ...editingBrand, owner_type: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Brand Owner">Brand Owner</option>
                    <option value="Manufacturer">Manufacturer</option>
                    <option value="Trader">Trader</option>
                    <option value="Agent">Agent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editingBrand.contact_person || ""}
                    onChange={(e) => setEditingBrand({ ...editingBrand, contact_person: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Email</label>
                  <input
                    type="email"
                    value={editingBrand.contact_email || ""}
                    onChange={(e) => setEditingBrand({ ...editingBrand, contact_email: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingBrand.contact_phone || ""}
                    onChange={(e) => setEditingBrand({ ...editingBrand, contact_phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Country of Origin</label>
                  <input
                    type="text"
                    value={editingBrand.country_of_origin || "Singapore"}
                    onChange={(e) => setEditingBrand({ ...editingBrand, country_of_origin: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={editingBrand.payment_terms || "30 Days Net"}
                    onChange={(e) => setEditingBrand({ ...editingBrand, payment_terms: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={editingBrand.lead_time_days || 14}
                    onChange={(e) => setEditingBrand({ ...editingBrand, lead_time_days: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowNewBrandModal(false); setEditingBrand(null); }}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold transition-colors"
                >
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT SKU WITH PRICING WATERFALL */}
      {/* -------------------------------------------------------------------- */}
      {showAddSkuModal && editingSku && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-950">
                {editingSku.id ? "Edit Product SKU" : "Add Product (SKU)"}
              </h3>
              <button
                onClick={() => { setShowAddSkuModal(false); setEditingSku(null); }}
                className="p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSku} className="p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
              <div>
                <label className="font-bold text-zinc-800 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={editingSku.product_name || ""}
                  onChange={(e) => setEditingSku({ ...editingSku, product_name: e.target.value })}
                  placeholder="e.g. Truffle Potato Crisps 120g"
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">SKU Code / Barcode</label>
                  <input
                    type="text"
                    value={editingSku.sku || ""}
                    onChange={(e) => setEditingSku({ ...editingSku, sku: e.target.value })}
                    placeholder="e.g. GSC-TRF-120"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Category</label>
                  <input
                    type="text"
                    value={editingSku.category || ""}
                    onChange={(e) => setEditingSku({ ...editingSku, category: e.target.value })}
                    placeholder="e.g. Snacks"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Pack Size</label>
                  <input
                    type="text"
                    value={editingSku.pack_size || ""}
                    onChange={(e) => setEditingSku({ ...editingSku, pack_size: e.target.value })}
                    placeholder="e.g. 120g x 24 cans"
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Shelf Life (Months)</label>
                  <input
                    type="number"
                    value={editingSku.shelf_life_months || 12}
                    onChange={(e) => setEditingSku({ ...editingSku, shelf_life_months: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Storage Condition</label>
                  <select
                    value={editingSku.storage_condition || "Ambient"}
                    onChange={(e) => setEditingSku({ ...editingSku, storage_condition: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Ambient">Ambient</option>
                    <option value="Chilled">Chilled (0°C to 4°C)</option>
                    <option value="Frozen">Frozen (-18°C)</option>
                  </select>
                </div>
              </div>

              {/* Pricing Waterfall Breakdown Box */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <h4 className="font-bold text-zinc-950">Pricing Waterfall Calculator</h4>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-600 block mb-0.5">Cost Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingSku.cost_price ?? 0}
                      onChange={(e) => setEditingSku({ ...editingSku, cost_price: Number(e.target.value) })}
                      className="w-full p-1.5 border border-slate-200 rounded-md bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 block mb-0.5">Landed Cost (+%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingSku.landed_cost_rate ?? 10}
                      onChange={(e) => setEditingSku({ ...editingSku, landed_cost_rate: Number(e.target.value) })}
                      className="w-full p-1.5 border border-slate-200 rounded-md bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 block mb-0.5">Overhead (+%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingSku.overhead_rate ?? 5}
                      onChange={(e) => setEditingSku({ ...editingSku, overhead_rate: Number(e.target.value) })}
                      className="w-full p-1.5 border border-slate-200 rounded-md bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-600 block mb-0.5">Our Margin Target (% on Trade)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingSku.our_margin_rate ?? 25}
                      onChange={(e) => setEditingSku({ ...editingSku, our_margin_rate: Number(e.target.value) })}
                      className="w-full p-1.5 border border-slate-200 rounded-md bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-600 block mb-0.5">Retailer Margin Target (% on RSP)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingSku.retailer_margin_rate ?? 35}
                      onChange={(e) => setEditingSku({ ...editingSku, retailer_margin_rate: Number(e.target.value) })}
                      className="w-full p-1.5 border border-slate-200 rounded-md bg-white"
                    />
                  </div>
                </div>

                {/* Real-time Computed Summary */}
                {(() => {
                  const wf = computeWaterfall(
                    Number(editingSku.cost_price) || 0,
                    Number(editingSku.landed_cost_rate) || 10,
                    Number(editingSku.overhead_rate) || 5,
                    Number(editingSku.our_margin_rate) || 25,
                    Number(editingSku.retailer_margin_rate) || 35
                  );
                  return (
                    <div className="p-2.5 bg-[#D3E3FD]/40 rounded-md border border-[#D3E3FD] flex items-center justify-between text-xs text-[#041E49] font-semibold">
                      <span>Our Cost: ${wf.ourPrice.toFixed(2)}</span>
                      <span>Trade Price: ${wf.priceToRetailer.toFixed(2)}</span>
                      <span className="text-[#0B57D0] font-bold">Suggested RSP: ${wf.rsp.toFixed(2)}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAddSkuModal(false); setEditingSku(null); }}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold transition-colors"
                >
                  Save SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: ADD TASTE SCORECARD REVIEW */}
      {/* -------------------------------------------------------------------- */}
      {showReviewModal && editingReview && reviewSkuTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Sensory Taste Scorecard</h3>
                <p className="text-[11px] text-zinc-500">{reviewSkuTarget.product_name}</p>
              </div>
              <button
                onClick={() => { setShowReviewModal(false); setEditingReview(null); setReviewSkuTarget(null); }}
                className="p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Reviewer Name *</label>
                  <input
                    type="text"
                    required
                    value={editingReview.reviewer_name || ""}
                    onChange={(e) => setEditingReview({ ...editingReview, reviewer_name: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-800 block mb-1">Reviewer Role</label>
                  <select
                    value={editingReview.reviewer_type || "Admin"}
                    onChange={(e) => setEditingReview({ ...editingReview, reviewer_type: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Staff">Staff</option>
                    <option value="Guest Taster">Guest Taster</option>
                  </select>
                </div>
              </div>

              {/* 6 Criteria Sliders */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                <h4 className="font-bold text-zinc-950">6 Evaluation Criteria (1 to 5 Points)</h4>

                {[
                  { key: "score_taste_aroma", label: "1. Taste & Aroma" },
                  { key: "score_texture_quality", label: "2. Texture & Quality" },
                  { key: "score_packaging_appeal", label: "3. Packaging Appeal" },
                  { key: "score_price_believability", label: "4. Price Believability" },
                  { key: "score_usage_occasion", label: "5. Usage Occasion" },
                  { key: "score_repeat_purchase", label: "6. Repeat Purchase Intent" }
                ].map((crit) => {
                  const currentVal = Number((editingReview as any)[crit.key]) || 3;
                  return (
                    <div key={crit.key} className="flex items-center justify-between gap-3">
                      <span className="text-zinc-800 font-semibold">{crit.label}</span>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setEditingReview({ ...editingReview, [crit.key]: num })}
                            className={`w-7 h-7 rounded-md font-bold text-xs cursor-pointer transition-all ${
                              currentVal === num
                                ? "bg-[#0B57D0] text-white shadow-xs"
                                : "bg-white border border-slate-200 text-zinc-700 hover:bg-slate-100"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Total Score & Score Band Display */}
                {(() => {
                  const total =
                    (Number(editingReview.score_taste_aroma) || 3) +
                    (Number(editingReview.score_texture_quality) || 3) +
                    (Number(editingReview.score_packaging_appeal) || 3) +
                    (Number(editingReview.score_price_believability) || 3) +
                    (Number(editingReview.score_usage_occasion) || 3) +
                    (Number(editingReview.score_repeat_purchase) || 3);
                  let band = "Below 18: Pause";
                  if (total >= 24) band = "24-30: Strong Candidate";
                  else if (total >= 18) band = "18-23: Refinement";

                  return (
                    <div className="p-2.5 bg-white rounded-md border border-slate-200 flex items-center justify-between font-semibold">
                      <span className="text-zinc-600">Total Score:</span>
                      <span className="text-sm font-bold text-[#0B57D0]">{total} / 30 PTS ({band})</span>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="font-bold text-zinc-800 block mb-1">Tasting Notes & Flavor Comments</label>
                <textarea
                  rows={2}
                  value={editingReview.tasting_notes || ""}
                  onChange={(e) => setEditingReview({ ...editingReview, tasting_notes: e.target.value })}
                  placeholder="Notes on crunchiness, aroma, aftertaste, packaging..."
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-800 block mb-1">Reviewer Recommendation</label>
                <select
                  value={editingReview.reviewer_decision || "Proceed"}
                  onChange={(e) => setEditingReview({ ...editingReview, reviewer_decision: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                >
                  <option value="Proceed">Proceed to Online Trial</option>
                  <option value="With Conditions">Proceed with Conditions</option>
                  <option value="Pause">Pause / Need Refinement</option>
                  <option value="Reject">Reject</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowReviewModal(false); setEditingReview(null); setReviewSkuTarget(null); }}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold transition-colors"
                >
                  Submit Scorecard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: AI SCAN OCR UPLOAD */}
      {/* -------------------------------------------------------------------- */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Upload & Parse Scanned Worksheet</h3>
                <p className="text-[11px] text-zinc-500">
                  {scanTargetType === "scorecard" ? `Sensory Scorecard for ${scanSkuTarget?.product_name || "SKU"}` : "Brand Worksheet / Agreement"}
                </p>
              </div>
              <button
                onClick={() => { setShowScanModal(false); setScanFile(null); }}
                className="p-1 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center flex flex-col items-center justify-center gap-2 hover:border-[#0B57D0] transition-colors cursor-pointer bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-400" />
                <label className="text-xs font-semibold text-zinc-700 cursor-pointer">
                  <span>{scanFile ? scanFile.name : "Click or drag & drop scanned PDF / image"}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setScanFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                <span className="text-[10px] text-zinc-400">Supports JPG, PNG, WEBP, or PDF scans</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowScanModal(false); setScanFile(null); }}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadAndScan}
                  disabled={!scanFile || isScanning}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Parsing with AI OCR...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Upload & Parse</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL: DELETE CONFIRMATION */}
      {/* -------------------------------------------------------------------- */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertCircle className="w-5 h-5" /> Confirm Deletion
            </div>
            <p className="text-xs text-zinc-600">
              Are you sure you want to delete <strong className="text-zinc-900">&quot;{deleteConfirm.name}&quot;</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-zinc-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
