"use client";

import * as React from "react";
import { 
  Printer, 
  Tag, 
  Barcode as BarcodeIcon, 
  FileSpreadsheet, 
  Search, 
  CheckSquare, 
  Square, 
  Loader2, 
  ExternalLink,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  CheckCircle2
} from "lucide-react";
import { CustomButton } from "../custom-button";
import { showToast } from "@/lib/toast";
import { loadScript } from "@/lib/script-loader";
import { cn } from "@/lib/utils";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

interface ShelfTagBarcodePrintModuleProps {
  profile?: any;
}

interface ProductItem {
  sku: string;
  display_name: string;
  image?: string;
  brands_id?: string;
  brand_name?: string;
  single_barcode?: string;
  carton_barcode?: string;
  rank?: number;
  [key: string]: any;
}

interface BrandItem {
  id: string;
  display_name: string;
  rank?: number;
  [key: string]: any;
}

type TemplateType = "shelf_tag" | "barcode_list" | "pallet_placard" | "pallet_manifest" | "stock_count_sheet";

// Helper: Convert and downscale image url to lightweight Base64 data URL (max 200px to prevent huge PDF memory & printer hang)
async function getBase64ImageFromUrl(imageUrl: string, maxDim: number = 200, quality: number = 0.70): Promise<string | null> {
  if (!imageUrl) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width || maxDim;
        const origH = img.naturalHeight || img.height || maxDim;
        
        let targetW = origW;
        let targetH = origH;
        
        // Downscale to max 200px
        if (targetW > maxDim || targetH > maxDim) {
          if (targetW > targetH) {
            targetH = Math.max(1, Math.round((targetH * maxDim) / targetW));
            targetW = maxDim;
          } else {
            targetW = Math.max(1, Math.round((targetW * maxDim) / targetH));
            targetH = maxDim;
          }
        }
        
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // White background for JPEG
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          // Export as compressed JPEG to avoid printer buffer hang
          const dataURL = canvas.toDataURL("image/jpeg", quality);
          resolve(dataURL);
          return;
        }
      } catch (e) {
        console.warn("Canvas downscale export error:", e);
      }
      resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

// Helper: Strict Barcode Validation (prevents text strings like "No Barcode", "N/A", etc. from encoding into CODE128)
function isValidBarcode(val?: string | null): boolean {
  if (!val) return false;
  const s = String(val).trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (
    lower === "no barcode" || 
    lower === "nobarcode" || 
    lower === "no_barcode" || 
    lower === "no-barcode" ||
    lower === "n/a" || 
    lower === "na" || 
    lower === "none" || 
    lower === "null" || 
    lower === "nil" || 
    lower === "-" || 
    lower === "--" ||
    lower === "undefined"
  ) {
    return false;
  }
  // A real product/carton barcode must consist primarily of numeric digits (e.g. EAN13, UPC, ITF14)
  const digitsOnly = s.replace(/\D/g, "");
  if (digitsOnly.length < 6) {
    return false;
  }
  return true;
}

// Helper: Generate Barcode Data URL using JsBarcode on an offscreen canvas
function generateBarcodeDataUrl(code: string, format: string = "EAN13", width = 2, height = 50, fontSize = 14): string | null {
  if (!isValidBarcode(code) || typeof window === "undefined" || !(window as any).JsBarcode) return null;
  const cleanCode = String(code).trim();
  try {
    const canvas = document.createElement("canvas");
    (window as any).JsBarcode(canvas, cleanCode, {
      format: format,
      width: width,
      height: height,
      fontSize: fontSize,
      margin: 4,
      background: "#ffffff",
      lineColor: "#000000",
      displayValue: true,
    });
    return canvas.toDataURL("image/png");
  } catch (err) {
    // If format is not standard EAN13, only attempt numeric fallback
    const digitsOnly = cleanCode.replace(/\D/g, "");
    if (digitsOnly.length >= 6) {
      try {
        const canvas = document.createElement("canvas");
        (window as any).JsBarcode(canvas, digitsOnly, {
          format: "CODE128",
          width: width,
          height: height,
          fontSize: fontSize,
          margin: 4,
          background: "#ffffff",
          lineColor: "#000000",
          displayValue: true,
        });
        return canvas.toDataURL("image/png");
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function ShelfTagBarcodePrintModule({ profile }: ShelfTagBarcodePrintModuleProps) {
  const [scriptsReady, setScriptsReady] = React.useState(false);
  const [loadingData, setLoadingData] = React.useState(true);
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [brands, setBrands] = React.useState<BrandItem[]>([]);
  
  // Filtering & Selection
  const [selectedBrand, setSelectedBrand] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [selectedSkus, setSelectedSkus] = React.useState<Set<string>>(new Set());

  // Template & Options
  const [activeTemplate, setActiveTemplate] = React.useState<TemplateType>("shelf_tag");
  const [barcodeType, setBarcodeType] = React.useState<"single" | "carton">("single"); // for barcode list & order form

  // Generation state
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationProgress, setGenerationProgress] = React.useState("");

  // Preview state
  const [previewPage, setPreviewPage] = React.useState(1);

  // Load jspdf and JsBarcode scripts
  React.useEffect(() => {
    async function initLibraries() {
      try {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
        await loadScript("https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js");
        if (typeof window !== "undefined" && (window as any).jspdf && (window as any).JsBarcode) {
          setScriptsReady(true);
        } else {
          showToast("Failed to initialize PDF / Barcode libraries", "error");
        }
      } catch (err: any) {
        showToast("Error loading libraries: " + err.message, "error");
      }
    }
    initLibraries();
  }, []);

  // Fetch Products and Brands
  const fetchData = React.useCallback(async () => {
    setLoadingData(true);
    try {
      const [prodRes, brandRes] = await Promise.all([
        fetch(`${WORKER_URL}/api/directorder/products`),
        fetch(`${WORKER_URL}/api/directorder/brands`),
      ]);

      let prodList: ProductItem[] = [];
      let brandList: BrandItem[] = [];

      if (brandRes.ok) {
        const bJson = await brandRes.json();
        brandList = Array.isArray(bJson) ? bJson : [];
        brandList.sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999));
        setBrands(brandList);
      }

      if (prodRes.ok) {
        const pJson = await prodRes.json();
        const rawProds = Array.isArray(pJson) ? pJson : [];
        const brandMap = new Map(brandList.map(b => [String(b.id), b.display_name]));
        
        prodList = rawProds.map(p => ({
          ...p,
          brand_name: brandMap.get(String(p.brands_id)) || p.brand_name || "General"
        }));

        setProducts(prodList);
        // Default: select all active products
        const allSkus = new Set<string>(prodList.map(p => p.sku).filter(Boolean));
        setSelectedSkus(allSkus);
      }
    } catch (err: any) {
      showToast("Failed to load products database: " + err.message, "error");
    } finally {
      setLoadingData(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered Products
  const filteredProducts = React.useMemo(() => {
    let list = [...products];

    // Filter by Brand
    if (selectedBrand !== "all") {
      list = list.filter(p => String(p.brands_id) === String(selectedBrand));
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.display_name && p.display_name.toLowerCase().includes(q)) ||
        (p.brand_name && p.brand_name.toLowerCase().includes(q)) ||
        (p.single_barcode && p.single_barcode.includes(q)) ||
        (p.carton_barcode && p.carton_barcode.includes(q))
      );
    }

    // Sort by Brand, then Rank, then SKU
    list.sort((a, b) => {
      const brandA = a.brand_name || "";
      const brandB = b.brand_name || "";
      if (brandA !== brandB) return brandA.localeCompare(brandB);
      const rankA = Number(a.rank || 9999);
      const rankB = Number(b.rank || 9999);
      if (rankA !== rankB) return rankA - rankB;
      return (a.sku || "").localeCompare(b.sku || "");
    });

    return list;
  }, [products, selectedBrand, searchQuery]);

  // Selected Products List
  const selectedProducts = React.useMemo(() => {
    return products
      .filter(p => selectedSkus.has(p.sku))
      .sort((a, b) => {
        const brandA = a.brand_name || "";
        const brandB = b.brand_name || "";
        if (brandA !== brandB) return brandA.localeCompare(brandB);
        const rankA = Number(a.rank || 9999);
        const rankB = Number(b.rank || 9999);
        if (rankA !== rankB) return rankA - rankB;
        return (a.sku || "").localeCompare(b.sku || "");
      });
  }, [products, selectedSkus]);

  // Selection handlers
  const handleToggleSku = (sku: string) => {
    setSelectedSkus(prev => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedSkus(prev => {
      const next = new Set(prev);
      filteredProducts.forEach(p => next.add(p.sku));
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedSkus(prev => {
      const next = new Set(prev);
      filteredProducts.forEach(p => next.delete(p.sku));
      return next;
    });
  };

  const handleSelectAllTotal = () => {
    const all = new Set<string>(products.map(p => p.sku).filter(Boolean));
    setSelectedSkus(all);
  };

  const handleDeselectAllTotal = () => {
    setSelectedSkus(new Set());
  };

  // Pagination calculation for preview
  const itemsPerPage = 
    activeTemplate === "shelf_tag" ? 4 : 
    activeTemplate === "barcode_list" ? 21 : 
    activeTemplate === "pallet_placard" ? 1 : 
    activeTemplate === "pallet_manifest" ? 6 : 
    16;
  const totalPages = Math.max(1, Math.ceil(selectedProducts.length / itemsPerPage));

  React.useEffect(() => {
    if (previewPage > totalPages) {
      setPreviewPage(1);
    }
  }, [totalPages, previewPage]);

  // PDF Generation Function
  const handleGeneratePdfBlob = async () => {
    if (selectedProducts.length === 0) {
      showToast("Please select at least one product to generate PDF", "warning");
      return;
    }
    if (!scriptsReady || !(window as any).jspdf) {
      showToast("PDF compiler is initializing, please wait...", "info");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress("Preparing document layout...");

    try {
      const { jsPDF } = (window as any).jspdf;
      // Standard A4 portrait: 210mm x 297mm
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Pre-cache all product images in base64
      setGenerationProgress(`Rendering product images (0/${selectedProducts.length})...`);
      const imageCache: Map<string, string | null> = new Map();
      
      for (let i = 0; i < selectedProducts.length; i++) {
        const item = selectedProducts[i];
        if (item.image) {
          try {
            const b64 = await getBase64ImageFromUrl(item.image);
            imageCache.set(item.sku, b64);
          } catch {
            imageCache.set(item.sku, null);
          }
        }
        if ((i + 1) % 5 === 0 || i === selectedProducts.length - 1) {
          setGenerationProgress(`Rendering product images (${i + 1}/${selectedProducts.length})...`);
        }
      }

      // ==========================================
      // TEMPLATE 1: SHELF TAG (2x2 = 4 per A4 page)
      // ==========================================
      if (activeTemplate === "shelf_tag") {
        setGenerationProgress("Compiling Shelf Tags (2x2)...");
        const pageWidth = 210;
        const pageHeight = 297;
        const colWidth = pageWidth / 2; // 105mm
        const rowHeight = pageHeight / 2; // 148.5mm

        for (let i = 0; i < selectedProducts.length; i++) {
          const item = selectedProducts[i];
          const pageIndex = Math.floor(i / 4);
          const posOnPage = i % 4;

          if (i > 0 && posOnPage === 0) {
            doc.addPage();
          }

          // Pos 0 = Top-Left (0, 0), Pos 1 = Top-Right (105, 0)
          // Pos 2 = Bottom-Left (0, 148.5), Pos 3 = Bottom-Right (105, 148.5)
          const col = posOnPage % 2;
          const row = Math.floor(posOnPage / 2);
          const x0 = col * colWidth;
          const y0 = row * rowHeight;

          // Draw subtle cut-lines on page
          doc.setDrawColor(220, 220, 220);
          doc.setLineDashPattern([2, 2], 0);
          doc.rect(x0, y0, colWidth, rowHeight);
          doc.setLineDashPattern([], 0); // reset

          // Inner tag max content width
          const innerWidth = colWidth - 16; // 89mm

          // Measure title lines first to calculate total content height
          const titleText = String(item.display_name || item.sku || "");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          const splitTitle = doc.splitTextToSize(titleText, innerWidth);

          // Content block dimensions (mm)
          const imgSize = 58;
          const gapImageToSku = 9;
          const skuFontSize = 22;
          const skuHeight = 8;
          const gapSkuToTitle = 6;
          const titleLineHeight = 4.2;
          const titleHeight = splitTitle.length * titleLineHeight;

          const totalBlockHeight = imgSize + gapImageToSku + skuHeight + gapSkuToTitle + titleHeight;
          const startY = y0 + Math.max(6, (rowHeight - totalBlockHeight) / 2);

          // 1. 1:1 Image Centered
          const imgX = x0 + (colWidth - imgSize) / 2;
          const imgY = startY;

          const imgData = imageCache.get(item.sku);
          if (imgData) {
            try {
              doc.addImage(imgData, "JPEG", imgX, imgY, imgSize, imgSize, undefined, "FAST");
            } catch (e) {
              doc.setDrawColor(230, 230, 230);
              doc.rect(imgX, imgY, imgSize, imgSize);
            }
          } else {
            doc.setDrawColor(230, 230, 230);
            doc.setFillColor(248, 249, 250);
            doc.roundedRect(imgX, imgY, imgSize, imgSize, 2, 2, "FD");
            doc.setFontSize(8);
            doc.setTextColor(160, 160, 160);
            doc.text("NO IMAGE", imgX + imgSize / 2, imgY + imgSize / 2, { align: "center" });
          }

          // 2. SKU Big (Bold, centered below image)
          const skuY = imgY + imgSize + gapImageToSku + 5;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(skuFontSize);
          doc.setTextColor(15, 23, 42); // slate-900
          
          const skuText = String(item.sku || "").toUpperCase();
          doc.text(skuText, x0 + colWidth / 2, skuY, { align: "center", maxWidth: innerWidth });

          // 3. Product Title Small (below SKU, centered)
          const titleY = skuY + gapSkuToTitle + 2;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(71, 85, 105); // slate-600
          doc.text(splitTitle, x0 + colWidth / 2, titleY, { align: "center" });
        }
      }

      // ==========================================
      // TEMPLATE 2: BARCODE LIST (3 Columns)
      // ==========================================
      else if (activeTemplate === "barcode_list") {
        setGenerationProgress("Compiling 3-Column Barcode List...");
        const marginX = 10;
        const marginY = 10;
        const availableWidth = 210 - marginX * 2; // 190mm
        const colWidth = (availableWidth - 8) / 3; // ~60.6mm per col with 4mm gap
        const colGap = 4;
        const rowHeight = 37; // mm
        const rowsPerPage = 7; // 7 * 37 = 259mm + 20mm margins = 279mm <= 297mm
        const itemsPerPage = rowsPerPage * 3; // 21 items

        for (let i = 0; i < selectedProducts.length; i++) {
          const item = selectedProducts[i];
          const posOnPage = i % itemsPerPage;

          if (i > 0 && posOnPage === 0) {
            doc.addPage();
          }

          const col = posOnPage % 3;
          const row = Math.floor(posOnPage / 3);
          const cellX = marginX + col * (colWidth + colGap);
          const cellY = marginY + row * rowHeight;

          // Cell outline box
          doc.setDrawColor(220, 226, 232);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(cellX, cellY, colWidth, rowHeight - 2, 1.5, 1.5, "FD");

          // Inner content
          // 1. SKU Header
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(15, 23, 42);
          doc.text(String(item.sku || "").toUpperCase(), cellX + 3, cellY + 5);

          // 2. Title Small
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          const titleText = String(item.display_name || "");
          const truncatedTitle = doc.splitTextToSize(titleText, colWidth - 6)[0] || "";
          doc.text(truncatedTitle, cellX + 3, cellY + 8.5);

          // 3. Barcode EAN13 Image (Strictly only if valid barcode exists)
          const rawBarcode = barcodeType === "carton" ? item.carton_barcode : item.single_barcode;
          const barcodeValue = isValidBarcode(rawBarcode) ? String(rawBarcode).trim() : "";

          if (barcodeValue) {
            const barcodeB64 = generateBarcodeDataUrl(barcodeValue, "EAN13", 2, 45, 13);
            if (barcodeB64) {
              try {
                const bWidth = colWidth - 6;
                const bHeight = 18;
                const bX = cellX + 3;
                const bY = cellY + 11;
                doc.addImage(barcodeB64, "PNG", bX, bY, bWidth, bHeight);
              } catch (e) {
                // If draw fails, leave empty
              }
            }
          }
          // If no barcode, leave space completely empty
        }
      }

      // ==========================================
      // TEMPLATE 3: PALLET IDENTIFICATION PLACARD (1 Full A4 per Pallet)
      // ==========================================
      else if (activeTemplate === "pallet_placard") {
        setGenerationProgress("Compiling Pallet Placards...");
        for (let i = 0; i < selectedProducts.length; i++) {
          if (i > 0) doc.addPage();
          const item = selectedProducts[i];

          // Outer frame border
          doc.setDrawColor(15, 23, 42);
          doc.setLineWidth(0.8);
          doc.rect(8, 8, 194, 281);
          doc.setLineWidth(0.2); // reset

          // Top Header Banner
          doc.setFillColor(11, 87, 208);
          doc.rect(8, 8, 194, 18, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          doc.setTextColor(255, 255, 255);
          doc.text("WAREHOUSE PALLET IDENTIFICATION PLACARD", 105, 19.5, { align: "center" });

          // Product Spotlight Box (Y: 29 to 89)
          doc.setDrawColor(210, 220, 235);
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(12, 29, 186, 60, 2, 2, "FD");

          // 1:1 Image on Left (52mm x 52mm)
          const imgSize = 52;
          const imgX = 16;
          const imgY = 33;
          const imgData = imageCache.get(item.sku);
          if (imgData) {
            try {
              doc.addImage(imgData, "JPEG", imgX, imgY, imgSize, imgSize, undefined, "FAST");
            } catch {
              doc.rect(imgX, imgY, imgSize, imgSize);
            }
          } else {
            doc.setFillColor(240, 244, 248);
            doc.roundedRect(imgX, imgY, imgSize, imgSize, 2, 2, "FD");
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text("NO IMAGE", imgX + imgSize / 2, imgY + imgSize / 2, { align: "center" });
          }

          // SKU & Title on Right
          const textX = 73;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.setTextColor(15, 23, 42);
          doc.text(String(item.sku || "").toUpperCase(), textX, 42);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(51, 65, 85);
          const splitTitle = doc.splitTextToSize(String(item.display_name || ""), 118);
          doc.text(splitTitle.slice(0, 2), textX, 49);

          // Barcode inside spotlight (Carton / Piece)
          const rawBarcode = barcodeType === "carton" ? item.carton_barcode : item.single_barcode;
          const barcodeValue = isValidBarcode(rawBarcode) ? String(rawBarcode).trim() : "";
          if (barcodeValue) {
            const barcodeB64 = generateBarcodeDataUrl(barcodeValue, "EAN13", 2, 38, 11);
            if (barcodeB64) {
              try {
                doc.addImage(barcodeB64, "PNG", textX, 60, 118, 25);
              } catch {}
            }
          }

          // Helper: Draw manual write-in container box
          const drawWriteBox = (x: number, y: number, w: number, h: number, title: string, placeholder?: string) => {
            doc.setDrawColor(160, 175, 195);
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x, y, w, h, 1.5, 1.5, "FD");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            doc.text(title.toUpperCase(), x + 3.5, y + 5.5);

            if (placeholder) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(8);
              doc.setTextColor(180, 190, 205);
              doc.text(placeholder, x + w - 3.5, y + 5.5, { align: "right" });
            }
          };

          let startY = 93;
          const boxGap = 4;
          const rowH = 28;

          // Row 1: Pallet Number & Date
          drawWriteBox(12, startY, 91, rowH, "Pallet Number", "e.g. PLT-001");
          drawWriteBox(107, startY, 91, rowH, "Date Received / Stacked", "DD / MM / YYYY");

          // Row 2: Total Cartons & Pcs Per Carton
          startY += rowH + boxGap;
          drawWriteBox(12, startY, 91, rowH, "Total Cartons On Pallet", "______ CTNS");
          drawWriteBox(107, startY, 91, rowH, "Units Per Carton", "______ PCS / CTN");

          // Row 3: Total Quantity & Batch / Lot
          startY += rowH + boxGap;
          drawWriteBox(12, startY, 91, rowH, "Total Quantity (Pieces)", "______ TOTAL PCS");
          drawWriteBox(107, startY, 91, rowH, "Batch / Lot Number", "");

          // Row 4: Expiry Date & Rack / Bin Location
          startY += rowH + boxGap;
          drawWriteBox(12, startY, 91, rowH, "Expiry / Best Before Date", "DD / MM / YYYY");
          drawWriteBox(107, startY, 91, rowH, "Warehouse Rack / Bin Location", "e.g. RACK-A-01");

          // Row 5: Staff Sign-Off & Inspection Notes
          startY += rowH + boxGap;
          drawWriteBox(12, startY, 186, 27, "Staff Sign-Off & Inspection Notes", "Name / Signature / Date");
        }
      }

      // ==========================================
      // TEMPLATE 4: PALLET MANIFEST (3 Columns: Product Description, Barcode (Top/Bottom), Blank Quantity)
      // Max 6 SKUs per page
      // ==========================================
      else if (activeTemplate === "pallet_manifest") {
        setGenerationProgress("Compiling Pallet Manifest (6 SKU/Page)...");
        const marginX = 8;
        const availableWidth = 210 - marginX * 2; // 194mm
        const rowsPerPage = 6;
        const totalPages = Math.max(1, Math.ceil(selectedProducts.length / rowsPerPage));

        const col1W = 68; // Product Description
        const col2W = 82; // Barcode (Top: Single, Bottom: Carton)
        const col3W = 44; // Quantity (Blank)

        let currentIndex = 0;
        let pageNum = 1;

        while (currentIndex < selectedProducts.length) {
          if (pageNum > 1) doc.addPage();

          // 1. Centered Header Title & Subtitle
          doc.setFont("helvetica", "bold");
          doc.setFontSize(15);
          doc.setTextColor(11, 87, 208);
          doc.text("WAREHOUSE PALLET MANIFEST", 105, 12, { align: "center" });

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`HSG Global Warehouse Packing & Logistics Manifest • Page ${pageNum} of ${totalPages}`, 105, 16.5, { align: "center" });

          // 2. Header Fields Grid (Centered below title)
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(30, 41, 59);
          
          doc.text("Pallet ID: ________________________", marginX + 4, 22.5);
          doc.text("Manifest Date: ________________________", 112, 22.5);
          doc.text("Destination: ________________________", marginX + 4, 28);
          doc.text("Loaded By: ________________________", 112, 28);

          doc.setDrawColor(200, 210, 225);
          doc.line(marginX, 31, marginX + availableWidth, 31);

          // 3. Table Column Headers (Height: 7mm, Y: 33 to 40)
          const tableTop = 33;
          const headerH = 7;
          doc.setFillColor(241, 245, 249);
          doc.rect(marginX, tableTop, availableWidth, headerH, "F");
          doc.setDrawColor(203, 213, 225);
          doc.rect(marginX, tableTop, availableWidth, headerH, "S");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(51, 65, 85);
          
          doc.text("Product Description", marginX + 3, tableTop + 4.8);
          doc.line(marginX + col1W, tableTop, marginX + col1W, tableTop + headerH);

          doc.text("Barcode", marginX + col1W + 3, tableTop + 4.8);
          doc.line(marginX + col1W + col2W, tableTop, marginX + col1W + col2W, tableTop + headerH);

          doc.text("Quantity", marginX + col1W + col2W + 3, tableTop + 4.8);

          // 4. Rows (6 rows, height = 37mm each, Y = 40 to 262)
          let rowY = tableTop + headerH;
          const rowHeight = 37;

          for (let r = 0; r < rowsPerPage && currentIndex < selectedProducts.length; r++) {
            const item = selectedProducts[currentIndex];
            const pcsBarcode = isValidBarcode(item.single_barcode) ? String(item.single_barcode).trim() : "";
            const ctnBarcode = isValidBarcode(item.carton_barcode) ? String(item.carton_barcode).trim() : "";

            doc.setDrawColor(226, 232, 240);
            doc.rect(marginX, rowY, availableWidth, rowHeight);

            // Col 1: Product Description (No running number)
            const col1X = marginX;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(String(item.sku || "").toUpperCase(), col1X + 3.5, rowY + 8);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(71, 85, 105);
            const splitName = doc.splitTextToSize(String(item.display_name || "-"), col1W - 7);
            doc.text(splitName.slice(0, 4), col1X + 3.5, rowY + 14);

            // Vertical divider 1
            doc.setDrawColor(226, 232, 240);
            doc.line(marginX + col1W, rowY, marginX + col1W, rowY + rowHeight);

            // Col 2: Barcodes (Top: Single / Piece, Bottom: Carton)
            const col2X = marginX + col1W;
            const halfRowH = rowHeight / 2; // 18.5mm

            // Top: Single Barcode
            doc.setFont("helvetica", "bold");
            doc.setFontSize(5.5);
            doc.setTextColor(100, 116, 139);
            doc.text("PIECE (PCS):", col2X + 2.5, rowY + 3.8);

            if (pcsBarcode) {
              const pcsB64 = generateBarcodeDataUrl(pcsBarcode, "EAN13", 2, 22, 7.5);
              if (pcsB64) {
                try {
                  doc.addImage(pcsB64, "PNG", col2X + 2.5, rowY + 4.5, col2W - 5, 12.5);
                } catch {}
              }
            }

            // Horizontal separator between Single & Carton
            doc.setDrawColor(240, 243, 246);
            doc.line(col2X + 1, rowY + halfRowH, col2X + col2W - 1, rowY + halfRowH);

            // Bottom: Carton Barcode
            doc.setFont("helvetica", "bold");
            doc.setFontSize(5.5);
            doc.setTextColor(100, 116, 139);
            doc.text("CARTON (CTN):", col2X + 2.5, rowY + halfRowH + 3.8);

            if (ctnBarcode) {
              const ctnB64 = generateBarcodeDataUrl(ctnBarcode, "EAN13", 2, 22, 7.5);
              if (ctnB64) {
                try {
                  doc.addImage(ctnB64, "PNG", col2X + 2.5, rowY + halfRowH + 4.5, col2W - 5, 12.5);
                } catch {}
              }
            }

            // Vertical divider 2
            doc.setDrawColor(226, 232, 240);
            doc.line(marginX + col1W + col2W, rowY, marginX + col1W + col2W, rowY + rowHeight);

            // Col 3: Quantity (Completely blank cell)
            // (Leave blank as requested)

            rowY += rowHeight;
            currentIndex++;
          }

          // 5. Footer (Y = 274)
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text("Total Pallet Qty: ____________________", marginX, 276);
          doc.text("Loaded / Prepared By: ____________________", 80, 276);
          doc.text("Driver / Receiver: ____________________", 145, 276);

          pageNum++;
        }
      }

      // ==========================================
      // TEMPLATE 4: STOCK COUNT AUDIT SHEET (A4 Portrait Table - 16 rows/page)
      // ==========================================
      else if (activeTemplate === "stock_count_sheet") {
        setGenerationProgress("Compiling Stock Count Audit Sheet...");
        const marginX = 8;
        const availableWidth = 210 - marginX * 2; // 194mm
        const rowsPerPage = 16;
        const totalPages = Math.max(1, Math.ceil(selectedProducts.length / rowsPerPage));

        let currentIndex = 0;
        let pageNum = 1;

        while (currentIndex < selectedProducts.length) {
          if (pageNum > 1) doc.addPage();

          // 1. Header (Top 26mm)
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          doc.setTextColor(11, 87, 208);
          doc.text("WAREHOUSE PHYSICAL STOCK COUNT AUDIT SHEET", marginX, 13);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(`HSG Global Inventory Control • Page ${pageNum} of ${totalPages}`, marginX, 17.5);

          // Header write-in fields
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(30, 41, 59);
          doc.text("Location: ____________________", 110, 13);
          doc.text("Audit Date: ____________________", 158, 13);
          doc.text("Auditor: ____________________", 110, 18);
          doc.text("Supervisor: ____________________", 158, 18);

          doc.setDrawColor(200, 210, 225);
          doc.line(marginX, 22, marginX + availableWidth, 22);

          // 2. Table Column Headers (Y = 24 to 31)
          const tableTop = 24;
          const headerH = 7;
          doc.setFillColor(241, 245, 249);
          doc.rect(marginX, tableTop, availableWidth, headerH, "F");
          doc.setDrawColor(203, 213, 225);
          doc.rect(marginX, tableTop, availableWidth, headerH, "S");

          const colDefs = [
            { label: "#", w: 7, align: "center" },
            { label: "SKU", w: 28, align: "left" },
            { label: "PRODUCT NAME", w: 55, align: "left" },
            { label: "BARCODE", w: 34, align: "left" },
            { label: "1ST COUNT", w: 23, align: "center" },
            { label: "2ND COUNT", w: 23, align: "center" },
            { label: "REMARKS / DISCREPANCY", w: 24, align: "left" },
          ];

          let curX = marginX;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(51, 65, 85);
          for (const col of colDefs) {
            if (col.align === "center") {
              doc.text(col.label, curX + col.w / 2, tableTop + 4.8, { align: "center" });
            } else {
              doc.text(col.label, curX + 2, tableTop + 4.8);
            }
            doc.line(curX + col.w, tableTop, curX + col.w, tableTop + headerH);
            curX += col.w;
          }

          // 3. Rows (16 rows, height = 15mm each)
          let rowY = tableTop + headerH;
          const rowHeight = 15;

          for (let r = 0; r < rowsPerPage && currentIndex < selectedProducts.length; r++) {
            const item = selectedProducts[currentIndex];
            const rawBarcode = barcodeType === "carton" ? item.carton_barcode : item.single_barcode;
            const barcodeValue = isValidBarcode(rawBarcode) ? String(rawBarcode).trim() : "";

            doc.setDrawColor(226, 232, 240);
            doc.rect(marginX, rowY, availableWidth, rowHeight);

            let cellX = marginX;
            // Col 0: #
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(String(currentIndex + 1), cellX + 3.5, rowY + 9, { align: "center" });
            cellX += 7;

            // Col 1: SKU
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text(String(item.sku || "").toUpperCase(), cellX + 2, rowY + 9);
            cellX += 28;

            // Col 2: Product Name
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.setTextColor(71, 85, 105);
            const splitName = doc.splitTextToSize(String(item.display_name || "-"), 51);
            doc.text(splitName.slice(0, 2), cellX + 2, rowY + 6);
            cellX += 55;

            // Col 3: Barcode
            if (barcodeValue) {
              const barcodeB64 = generateBarcodeDataUrl(barcodeValue, "EAN13", 2, 28, 9);
              if (barcodeB64) {
                try {
                  doc.addImage(barcodeB64, "PNG", cellX + 1, rowY + 1.5, 32, 12);
                } catch {}
              }
            }
            cellX += 34;

            // Col 4: 1st Count write-box
            doc.setDrawColor(180, 190, 205);
            doc.rect(cellX + 2, rowY + 2, 19, 11);
            cellX += 23;

            // Col 5: 2nd Count write-box
            doc.rect(cellX + 2, rowY + 2, 19, 11);
            cellX += 23;

            // Col 6: Remarks write-box
            // Draw vertical grid lines
            doc.setDrawColor(226, 232, 240);
            curX = marginX;
            for (const col of colDefs) {
              doc.line(curX + col.w, rowY, curX + col.w, rowY + rowHeight);
              curX += col.w;
            }

            rowY += rowHeight;
            currentIndex++;
          }

          // Footer signature line (Y = 282)
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text("Stock Count Completed By: __________________________", marginX, 282);
          doc.text("Verified By (Supervisor): __________________________", 115, 282);

          pageNum++;
        }
      }

      setGenerationProgress("Opening Blob PDF...");
      const blob = doc.output("blob");
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");

      showToast("PDF generated successfully and opened in a new tab!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Failed to compile PDF: " + err.message, "error");
    } finally {
      setIsGenerating(false);
      setGenerationProgress("");
    }
  };

  // Preview items for currently selected preview page
  const previewItems = React.useMemo(() => {
    const startIdx = (previewPage - 1) * itemsPerPage;
    return selectedProducts.slice(startIdx, startIdx + itemsPerPage);
  }, [selectedProducts, previewPage, itemsPerPage]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            Print Manager
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Generate and export custom shelf tags, barcode labels, and warehouse printable templates.
          </p>
        </div>

        {/* Top Action Button */}
        <div className="flex items-center gap-2">
          <CustomButton
            onClick={handleGeneratePdfBlob}
            variant="dark"
            disabled={selectedProducts.length === 0 || isGenerating || loadingData}
            className="h-8 px-3 text-xs font-bold gap-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg shadow-xs"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{generationProgress || "Compiling PDF..."}</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                <span>Generate & Open PDF ({selectedProducts.length})</span>
              </>
            )}
          </CustomButton>
        </div>
      </div>

      {/* Main Workspace split into 2 Columns: Left Controls & Right A4 Preview */}
      <div className="content-body flex-1 w-full overflow-hidden flex flex-row gap-4 p-4 bg-[#F8F9FA]/60">
        
        {/* LEFT COLUMN: Controls, Filters & Product Selection Table */}
        <div className="w-[420px] shrink-0 flex flex-col gap-3 h-full overflow-hidden bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5">
          
          {/* Template Selection Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              1. Choose Print Template
            </label>
            <div className="relative">
              <select
                value={activeTemplate}
                onChange={(e) => {
                  setActiveTemplate(e.target.value as TemplateType);
                  setPreviewPage(1);
                }}
                className="w-full h-9 pl-3 pr-8 text-xs font-semibold bg-[#F8F9FC] border border-slate-200 rounded-lg text-zinc-900 outline-none focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/15 cursor-pointer appearance-none transition-all shadow-2xs"
              >
                <option value="shelf_tag">Shelf Tag (2x2 A4 Cut-out Cards)</option>
                <option value="barcode_list">Barcode List (3-Column A4 Grid)</option>
                <option value="pallet_placard">Pallet Identification Placard (1 A4 per Pallet - Manual Fill)</option>
                <option value="pallet_manifest">Pallet Manifest (3-Column A4 - Manual Qty Fill)</option>
                <option value="stock_count_sheet">Stock Count & Audit Sheet (A4 Table - Manual Write-down)</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-2.5 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {/* Additional Options (Barcode Type switcher) */}
          {activeTemplate !== "shelf_tag" && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8F9FA] border border-slate-200/80">
              <span className="text-[11px] font-semibold text-zinc-700">Barcode Source:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBarcodeType("single")}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all",
                    barcodeType === "single"
                      ? "bg-[#0B57D0] text-white shadow-2xs"
                      : "bg-white text-zinc-600 hover:bg-zinc-100 border border-slate-200"
                  )}
                >
                  Piece (EAN13 pcs)
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeType("carton")}
                  className={cn(
                    "px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all",
                    barcodeType === "carton"
                      ? "bg-[#0B57D0] text-white shadow-2xs"
                      : "bg-white text-zinc-600 hover:bg-zinc-100 border border-slate-200"
                  )}
                >
                  Carton (EAN13 ctn)
                </button>
              </div>
            </div>
          )}

          {/* Product Filter and Selection Controls */}
          <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                2. Filter & Select Products
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#D3E3FD] text-[#041E49]">
                {selectedSkus.size} / {products.length} Selected
              </span>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-1/2 h-8 px-2 text-xs bg-[#F8F9FA] border border-slate-200 rounded-md text-zinc-800 outline-none focus:border-[#0B57D0]"
              >
                <option value="all">All Brands ({brands.length})</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.display_name}
                  </option>
                ))}
              </select>

              <div className="w-1/2 relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search SKU/name..."
                  className="w-full h-8 pl-7 pr-2 text-xs bg-[#F8F9FA] border border-slate-200 rounded-md text-zinc-800 outline-none focus:border-[#0B57D0]"
                />
              </div>
            </div>

            {/* Bulk Selection Buttons */}
            <div className="flex items-center justify-between text-[11px] text-zinc-600 px-0.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="hover:text-[#0B57D0] font-semibold cursor-pointer underline"
                >
                  Select Filtered ({filteredProducts.length})
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllFiltered}
                  className="hover:text-red-600 font-semibold cursor-pointer underline"
                >
                  Unselect Filtered
                </button>
              </div>

              <button
                type="button"
                onClick={selectedSkus.size === products.length ? handleDeselectAllTotal : handleSelectAllTotal}
                className="text-[#0B57D0] font-bold cursor-pointer hover:underline"
              >
                {selectedSkus.size === products.length ? "Clear All" : "Select All Total"}
              </button>
            </div>
          </div>

          {/* Product Items List Table */}
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-[#FDFDFD]">
            {loadingData ? (
              <div className="flex items-center justify-center h-48 gap-2 text-zinc-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading products...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 italic">
                No matching products found.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = selectedSkus.has(p.sku);
                return (
                  <div
                    key={p.sku}
                    onClick={() => handleToggleSku(p.sku)}
                    className={cn(
                      "flex items-center gap-2.5 p-2 transition-colors cursor-pointer select-none",
                      isSelected ? "bg-[#D3E3FD]/25 hover:bg-[#D3E3FD]/40" : "hover:bg-zinc-50"
                    )}
                  >
                    <button type="button" className="text-zinc-700 shrink-0">
                      {isSelected ? (
                        <CheckSquare size={16} className="text-[#0B57D0]" />
                      ) : (
                        <Square size={16} className="text-zinc-300" />
                      )}
                    </button>

                    {/* Product Image Thumbnail */}
                    <div className="w-8 h-8 rounded bg-zinc-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt={p.sku} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[8px] text-zinc-400">N/A</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-zinc-900 truncate">
                          {p.sku}
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 truncate max-w-[90px]">
                          {p.brand_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 truncate">
                        {p.display_name || "-"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive A4 Print Preview */}
        <div className="flex-1 flex flex-col h-full bg-[#F0F4F9] rounded-xl border border-slate-200/80 p-3 overflow-hidden">
          
          {/* Preview Navigation & Meta */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-800">
                A4 Document Preview
              </span>
              <span className="text-[10px] text-zinc-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                {activeTemplate === "shelf_tag"
                  ? "Shelf Tag (4 cards / page)"
                  : activeTemplate === "barcode_list"
                  ? "Barcode List (21 items / page)"
                  : activeTemplate === "pallet_placard"
                  ? "Pallet Placard (1 item / page)"
                  : activeTemplate === "pallet_manifest"
                  ? "Pallet Manifest (10 items / page)"
                  : "Stock Audit Sheet (16 items / page)"}
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600 font-medium">
                Page {previewPage} of {totalPages} ({selectedProducts.length} items total)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={previewPage <= 1}
                  onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                  className="p-1 rounded bg-white border border-slate-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  disabled={previewPage >= totalPages}
                  onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))}
                  className="p-1 rounded bg-white border border-slate-200 text-zinc-700 hover:bg-zinc-100 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Scaled A4 Sheet Canvas Preview */}
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-md shadow-md border border-slate-300 relative select-none overflow-hidden transition-all"
              style={{
                width: "480px",
                height: "678px", // exact A4 aspect ratio 1 : 1.4142
                maxHeight: "100%",
                padding: "16px",
              }}
            >
              {selectedProducts.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
                  <Tag size={32} className="opacity-30" />
                  <span className="text-xs font-semibold">No products selected</span>
                  <span className="text-[10px]">Select products on the left panel to preview</span>
                </div>
              ) : activeTemplate === "shelf_tag" ? (
                /* SHELF TAG PREVIEW: 2x2 QUADRANTS */
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-2">
                  {previewItems.map((item, idx) => (
                    <div
                      key={item.sku || idx}
                      className="border border-dashed border-slate-300 rounded p-3 flex flex-col items-center justify-center text-center bg-white relative overflow-hidden"
                    >
                      {/* 1:1 Image */}
                      <div className="w-24 h-24 rounded bg-zinc-50 border border-slate-200 overflow-hidden mb-2 flex items-center justify-center shrink-0">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt={item.sku} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] text-zinc-400">NO IMAGE</span>
                        )}
                      </div>

                      {/* SKU Big */}
                      <span className="text-base font-extrabold text-zinc-950 tracking-tight leading-tight uppercase">
                        {item.sku}
                      </span>

                      {/* Title Small */}
                      <span className="text-[10px] text-zinc-600 line-clamp-2 mt-0.5 leading-snug px-1">
                        {item.display_name || "-"}
                      </span>
                    </div>
                  ))}

                  {/* Empty Fillers if less than 4 on the last page */}
                  {Array.from({ length: Math.max(0, 4 - previewItems.length) }).map((_, idx) => (
                    <div
                      key={`empty-${idx}`}
                      className="border border-dashed border-slate-200 rounded p-3 flex items-center justify-center text-zinc-300 text-[10px] italic"
                    >
                      [Cut Line Slot]
                    </div>
                  ))}
                </div>
              ) : activeTemplate === "barcode_list" ? (
                /* BARCODE LIST PREVIEW: 3 COLUMNS */
                <div className="w-full h-full grid grid-cols-3 gap-1.5 content-start overflow-hidden">
                  {previewItems.map((item, idx) => {
                    const rawBarcode = barcodeType === "carton" ? item.carton_barcode : item.single_barcode;
                    const bcVal = isValidBarcode(rawBarcode) ? String(rawBarcode).trim() : "";

                    return (
                      <div
                        key={item.sku || idx}
                        className="border border-slate-200 rounded p-1.5 flex flex-col justify-between bg-white text-left h-[78px]"
                      >
                        <div>
                          <div className="text-[9px] font-bold text-zinc-950 truncate uppercase">
                            {item.sku}
                          </div>
                          <div className="text-[7px] text-zinc-500 line-clamp-1">
                            {item.display_name || "-"}
                          </div>
                        </div>

                        {/* Barcode visual simulation or empty */}
                        {bcVal ? (
                          <div className="flex flex-col items-center justify-center bg-zinc-50 rounded py-0.5 border border-slate-100">
                            <div className="h-4 flex items-center gap-[1px] px-1 w-full justify-center">
                              {Array.from({ length: 22 }).map((_, i) => (
                                 <div
                                   key={i}
                                   className={cn(
                                     "h-full",
                                     i % 3 === 0 ? "w-[2px] bg-zinc-950" : i % 2 === 0 ? "w-[1px] bg-zinc-800" : "w-[1px] bg-transparent"
                                   )}
                                 />
                              ))}
                            </div>
                            <span className="text-[6.5px] font-mono text-zinc-600 tracking-wider">
                              {bcVal}
                            </span>
                          </div>
                        ) : (
                          <div className="h-6" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : activeTemplate === "pallet_placard" ? (
                /* PALLET PLACARD PREVIEW: 1 ITEM PER PAGE */
                <div className="w-full h-full border-2 border-zinc-900 rounded p-2.5 flex flex-col justify-between bg-white text-zinc-900 overflow-hidden">
                  <div className="bg-[#0B57D0] text-white text-center py-1 rounded font-bold text-[9.5px] uppercase tracking-wide">
                    Warehouse Pallet Identification Placard
                  </div>

                  {previewItems[0] && (() => {
                    const item = previewItems[0];
                    const rawBarcode = barcodeType === "carton" ? item.carton_barcode : item.single_barcode;
                    const bcVal = isValidBarcode(rawBarcode) ? String(rawBarcode).trim() : "";

                    return (
                      <div className="flex flex-col gap-2 flex-1 pt-2">
                        {/* Spotlight Card */}
                        <div className="border border-slate-300 rounded p-2 bg-[#F8F9FC] flex items-center gap-3">
                          <div className="w-14 h-14 rounded bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image} alt={item.sku} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[7px] text-zinc-400">NO IMAGE</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-extrabold text-zinc-950 uppercase truncate leading-none">
                              {item.sku}
                            </div>
                            <div className="text-[8px] text-zinc-600 truncate mt-0.5">
                              {item.display_name || "-"}
                            </div>
                            {bcVal && (
                              <div className="mt-1 bg-white p-0.5 rounded border border-slate-200 flex flex-col items-center max-w-[130px]">
                                <div className="h-2.5 flex items-center gap-[1px] w-full justify-center">
                                  {Array.from({ length: 22 }).map((_, i) => (
                                    <div key={i} className={cn("h-full", i % 2 === 0 ? "w-[1px] bg-zinc-950" : "w-[1px] bg-transparent")} />
                                  ))}
                                </div>
                                <span className="text-[5.5px] font-mono text-zinc-600">{bcVal}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 4 Rows of Manual Write-In Boxes */}
                        <div className="grid grid-cols-2 gap-1.5 text-[7px]">
                          <div className="border border-slate-300 rounded p-1.5 h-11 flex flex-col justify-between bg-white">
                            <span className="font-bold text-zinc-600">PALLET NUMBER</span>
                            <span className="text-zinc-300 italic text-[6px]">e.g. PLT-001</span>
                          </div>
                          <div className="border border-slate-300 rounded p-1.5 h-11 flex flex-col justify-between bg-white">
                            <span className="font-bold text-zinc-600">DATE STACKED / RECEIVED</span>
                            <span className="text-zinc-300 italic text-[6px]">DD / MM / YYYY</span>
                          </div>

                          <div className="border border-slate-300 rounded p-1.5 h-11 flex flex-col justify-between bg-white">
                            <span className="font-bold text-zinc-600">TOTAL CARTONS ON PALLET</span>
                            <span className="text-zinc-300 italic text-[6px]">______ CTNS</span>
                          </div>
                          <div className="border border-slate-300 rounded p-1.5 h-11 flex flex-col justify-between bg-white">
                            <span className="font-bold text-zinc-600">UNITS PER CARTON</span>
                            <span className="text-zinc-300 italic text-[6px]">______ PCS / CTN</span>
                          </div>

                          <div className="border border-slate-300 rounded p-1.5 h-11 flex flex-col justify-between bg-white">
                            <span className="font-bold text-zinc-600">TOTAL QUANTITY (PCS)</span>
                            <span className="text-zinc-300 italic text-[6px]">______ TOTAL PCS</span>
                          </div>
                          <div className="border border-slate-300 rounded p-1.5 h-11 flex flex-col justify-between bg-white">
                            <span className="font-bold text-zinc-600">BATCH / LOT NUMBER</span>
                            <span className="text-zinc-300 italic text-[6px]">Lot / Batch</span>
                          </div>

                          <div className="border border-slate-300 rounded p-1.5 h-11 flex flex-col justify-between bg-white">
                            <span className="font-bold text-zinc-600">EXPIRY / BEST BEFORE DATE</span>
                            <span className="text-zinc-300 italic text-[6px]">DD / MM / YYYY</span>
                          </div>
                          <div className="border border-slate-300 rounded p-1.5 h-11 flex flex-col justify-between bg-white">
                            <span className="font-bold text-zinc-600">RACK / BIN LOCATION</span>
                            <span className="text-zinc-300 italic text-[6px]">e.g. RACK-A-01</span>
                          </div>
                        </div>

                        {/* Sign-off box */}
                        <div className="border border-slate-300 rounded p-1.5 h-10 flex flex-col justify-between bg-white text-[7px]">
                          <span className="font-bold text-zinc-600">STAFF SIGN-OFF & INSPECTION NOTES</span>
                          <span className="text-zinc-300 italic text-[6px]">Name / Signature / Date</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : activeTemplate === "pallet_manifest" ? (
                /* PALLET MANIFEST PREVIEW: 3 COLUMNS (Max 6 SKUs) */
                <div className="w-full h-full flex flex-col justify-between bg-white text-zinc-900 overflow-hidden text-[7px]">
                  {/* Centered Header */}
                  <div className="border-b border-slate-300 pb-1.5 shrink-0 text-center">
                    <div className="font-bold text-[9px] text-[#0B57D0] tracking-wide uppercase">
                      WAREHOUSE PALLET MANIFEST
                    </div>
                    <div className="text-[5.5px] text-zinc-400">
                      HSG Global Warehouse Packing & Logistics Manifest • Page {previewPage} of {totalPages}
                    </div>
                    
                    {/* Header Manual Fields Grid */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-[5.5px] text-zinc-600 text-left px-1">
                      <div>Pallet ID: ______________________</div>
                      <div>Manifest Date: ______________________</div>
                      <div>Destination: ______________________</div>
                      <div>Loaded By: ______________________</div>
                    </div>
                  </div>

                  {/* Table Grid (3 Columns) */}
                  <div className="flex-1 flex flex-col border border-slate-300 rounded mt-1 overflow-hidden">
                    <div className="grid grid-cols-12 bg-slate-100 font-bold border-b border-slate-300 py-0.5 text-center text-[6px] text-zinc-700">
                      <div className="col-span-5 text-left pl-1">Product Description</div>
                      <div className="col-span-4 text-left pl-1">Barcode</div>
                      <div className="col-span-3 text-center">Quantity</div>
                    </div>

                    <div className="flex-1 flex flex-col divide-y divide-slate-200">
                      {previewItems.map((item, idx) => {
                        const pcsBc = isValidBarcode(item.single_barcode) ? String(item.single_barcode).trim() : "";
                        const ctnBc = isValidBarcode(item.carton_barcode) ? String(item.carton_barcode).trim() : "";

                        return (
                          <div key={item.sku || idx} className="grid grid-cols-12 py-1 items-stretch text-left text-[6px] flex-1">
                            {/* Col 1: Product Description (No running number) */}
                            <div className="col-span-5 pl-1.5 min-w-0 pr-1 flex flex-col justify-center">
                              <span className="font-bold text-zinc-950 uppercase truncate block text-[7px]">
                                {item.sku}
                              </span>
                              <span className="text-zinc-500 line-clamp-2 text-[5.5px] mt-0.5">
                                {item.display_name || "-"}
                              </span>
                            </div>

                            {/* Col 2: Barcodes (Top: Single, Bottom: Carton) */}
                            <div className="col-span-4 pl-1 pr-1 text-[5px] text-zinc-600 flex flex-col justify-between py-0.5 font-mono border-l border-slate-200">
                              <div>
                                <span className="font-bold text-zinc-400">PCS:</span> {pcsBc || "-"}
                              </div>
                              <div className="border-t border-slate-100 pt-0.5">
                                <span className="font-bold text-zinc-400">CTN:</span> {ctnBc || "-"}
                              </div>
                            </div>

                            {/* Col 3: Quantity (Completely blank cell) */}
                            <div className="col-span-3 border-l border-slate-200 bg-white" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-1 text-[6px] text-zinc-500 flex justify-between border-t border-slate-200 shrink-0 mt-1">
                    <span>Total Pallet Qty: _________________</span>
                    <span>Loaded By: _________________</span>
                    <span>Driver / Receiver: _________________</span>
                  </div>
                </div>
              ) : (
                /* STOCK COUNT AUDIT SHEET PREVIEW */
                <div className="w-full h-full flex flex-col justify-between bg-white text-zinc-900 overflow-hidden text-[7px]">
                  {/* Header */}
                  <div className="border-b border-slate-300 pb-1 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[8.5px] text-[#0B57D0]">
                        WAREHOUSE STOCK COUNT AUDIT SHEET
                      </div>
                      <div className="text-[6.5px] text-zinc-500">
                        Location: ________ Date: ________
                      </div>
                    </div>
                    <div className="text-[6.5px] text-zinc-400 mt-0.5">
                      Auditor: __________________ Supervisor: __________________
                    </div>
                  </div>

                  {/* Table Grid */}
                  <div className="flex-1 flex flex-col border border-slate-300 rounded mt-1 overflow-hidden">
                    <div className="grid grid-cols-12 bg-slate-100 font-bold border-b border-slate-300 py-0.5 text-center text-[6px] text-zinc-700">
                      <div className="col-span-1">#</div>
                      <div className="col-span-2 text-left pl-1">SKU</div>
                      <div className="col-span-4 text-left pl-1">Product Name</div>
                      <div className="col-span-2 text-left pl-1">Barcode</div>
                      <div className="col-span-1">1st</div>
                      <div className="col-span-1">2nd</div>
                      <div className="col-span-1">Note</div>
                    </div>

                    <div className="flex-1 flex flex-col divide-y divide-slate-200">
                      {previewItems.map((item, idx) => {
                        const rawBarcode = barcodeType === "carton" ? item.carton_barcode : item.single_barcode;
                        const bcVal = isValidBarcode(rawBarcode) ? String(rawBarcode).trim() : "";
                        const globalIdx = (previewPage - 1) * itemsPerPage + idx + 1;

                        return (
                          <div key={item.sku || idx} className="grid grid-cols-12 py-1 items-center text-center text-[6px]">
                            <div className="col-span-1 font-bold text-zinc-500">{globalIdx}</div>
                            <div className="col-span-2 text-left pl-1 font-bold text-zinc-950 truncate uppercase">{item.sku}</div>
                            <div className="col-span-4 text-left pl-1 text-zinc-600 truncate">{item.display_name || "-"}</div>
                            <div className="col-span-2 text-left pl-1 font-mono text-zinc-500 truncate">{bcVal || "-"}</div>
                            <div className="col-span-1 border border-slate-300 rounded mx-0.5 h-3.5 bg-slate-50" />
                            <div className="col-span-1 border border-slate-300 rounded mx-0.5 h-3.5 bg-slate-50" />
                            <div className="col-span-1 border-b border-slate-300 mx-0.5" />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-1 text-[6.5px] text-zinc-500 flex justify-between border-t border-slate-200 shrink-0 mt-1">
                    <span>Counted: _________________</span>
                    <span>Verified: _________________</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
