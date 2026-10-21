import jsPDF from "jspdf";
import { CatalogProduct, BrandInfo, PdfCustomOptions } from "./catalogPdf";

// Helper: Extract candidate image URLs for a product
function getProductCandidateUrls(prod: CatalogProduct): string[] {
  const meta = prod.product_meta || {};
  const candidates: string[] = [];

  const rawThumb = prod.thumbnail;
  const rawImage = prod.image || (meta.Images && meta.Images[0]) || "";

  if (rawThumb) candidates.push(rawThumb);

  if (rawImage) {
    if (rawImage.includes("i.imgur.com/")) {
      const clean = rawImage.replace(/([sbtml])\.(png|jpg|jpeg|webp)$/i, ".$2");
      candidates.push(clean.replace(/(\.[a-zA-Z0-9]+)$/, "m$1"));
      candidates.push(clean.replace(/(\.[a-zA-Z0-9]+)$/, "l$1"));
      candidates.push(rawImage);
    } else {
      candidates.push(rawImage);
    }
  }

  return candidates.filter(Boolean);
}

// Brand Cover Image Resolver
function getBrandCoverImage(brand: { id?: string; display_name?: string; cover_img?: string; Cover_Image?: string; cover_image?: string; banner_image?: string; [key: string]: any }): string {
  const sanitize = (url?: string) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.includes('192.168.') || trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
      return '';
    }
    return trimmed;
  };
  return sanitize(brand.cover_img) || sanitize(brand.Cover_Image) || sanitize(brand.cover_image) || sanitize(brand.banner_image) || '';
}

// Preload image and convert to clean Data URL (with optional rounded top corners & aspect ratio preservation)
async function loadImageAsDataUrl(
  url: string,
  maxDimension = 320,
  isLogo = false,
  roundedTop = false,
  coverCrop?: { w: number; h: number },
  isWatermark = false
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!url) return null;

  const sanitize = (raw: string) => {
    if (!raw || typeof raw !== "string") return "";
    const trimmed = raw.trim();
    if (trimmed.includes("192.168.") || trimmed.includes("localhost") || trimmed.includes("127.0.0.1")) {
      return "";
    }
    return trimmed;
  };

  const cleanUrl = sanitize(url);
  if (!cleanUrl) return null;

  const imgToDataUrl = (img: HTMLImageElement | ImageBitmap): { dataUrl: string; width: number; height: number } | null => {
    try {
      const canvas = document.createElement("canvas");
      const origW = "naturalWidth" in img ? img.naturalWidth : img.width;
      const origH = "naturalHeight" in img ? img.naturalHeight : img.height;
      if (!origW || !origH) return null;

      if (coverCrop) {
        // Proportional center-cropping for cover banner (object-fit: cover, no stretch)
        const targetW = coverCrop.w;
        const targetH = coverCrop.h;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        const imgAspect = origW / origH;
        const targetAspect = targetW / targetH;
        let rw = targetW;
        let rh = targetH;
        let rx = 0;
        let ry = 0;

        if (imgAspect > targetAspect) {
          rw = Math.round(targetH * imgAspect);
          rx = Math.round((targetW - rw) / 2);
        } else {
          rh = Math.round(targetW / imgAspect);
          ry = Math.round((targetH - rh) / 2);
        }

        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, rx, ry, rw, rh);
        return {
          dataUrl: canvas.toDataURL("image/jpeg", 0.88),
          width: targetW,
          height: targetH
        };
      }

      if (roundedTop) {
        // Prepare 43:36 lookbook product image with clipped top corners matching the 2mm card radius
        const targetW = 344;
        const targetH = 288;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;

        const rad = 16; // 2mm radius in pixel scale
        ctx.clearRect(0, 0, targetW, targetH);
        ctx.beginPath();
        ctx.moveTo(rad, 0);
        ctx.lineTo(targetW - rad, 0);
        ctx.quadraticCurveTo(targetW, 0, targetW, rad);
        ctx.lineTo(targetW, targetH);
        ctx.lineTo(0, targetH);
        ctx.lineTo(0, rad);
        ctx.quadraticCurveTo(0, 0, rad, 0);
        ctx.closePath();
        ctx.clip();

        // Object-fit: cover center product image
        const imgAspect = origW / origH;
        const targetAspect = targetW / targetH;
        let rw = targetW;
        let rh = targetH;
        let rx = 0;
        let ry = 0;
        if (imgAspect > targetAspect) {
          rw = Math.round(targetH * imgAspect);
          rx = Math.round((targetW - rw) / 2);
        } else {
          rh = Math.round(targetW / imgAspect);
          ry = Math.round((targetH - rh) / 2);
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, rx, ry, rw, rh);

        return {
          dataUrl: canvas.toDataURL("image/png"),
          width: targetW,
          height: targetH
        };
      }

      let w = origW;
      let h = origH;

      if (w > maxDimension || h > maxDimension) {
        if (w > h) {
          h = Math.round((h * maxDimension) / w);
          w = maxDimension;
        } else {
          w = Math.round((w * maxDimension) / h);
          h = maxDimension;
        }
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      if (isWatermark) {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a > 0) {
            // Recolor all visible pixels to official HSG Theme Sage Green #3A4B38 (58, 75, 56)
            data[i] = 58;
            data[i + 1] = 75;
            data[i + 2] = 56;
            // Soft translucent watermark alpha (~7.5% opacity)
            data[i + 3] = Math.round((a / 255) * 19);
          }
        }
        ctx.putImageData(imgData, 0, 0);
        return {
          dataUrl: canvas.toDataURL("image/png"),
          width: w,
          height: h
        };
      }

      if (!isLogo) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      return {
        dataUrl: canvas.toDataURL(isLogo ? "image/png" : "image/jpeg", 0.85),
        width: origW,
        height: origH
      };
    } catch {
      return null;
    }
  };

  try {
    let res: Response | null = null;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      res = await fetch(cleanUrl, { signal: controller.signal });
      clearTimeout(t);
    } catch {}

    if (!res || !res.ok) {
      if (cleanUrl.startsWith("http")) {
        const proxyUrl = `https://ib-v2.hsgglobalpteltd.workers.dev/api/proxy?url=${encodeURIComponent(cleanUrl)}`;
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(t);
      }
    }

    if (res && res.ok) {
      const blob = await res.blob();
      if (typeof createImageBitmap === "function") {
        try {
          const bitmap = await createImageBitmap(blob);
          const result = imgToDataUrl(bitmap);
          bitmap.close();
          if (result) return result;
        } catch {}
      }

      return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(imgToDataUrl(img));
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        };
        img.src = objectUrl;
      });
    }
  } catch {}

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 6000);
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      clearTimeout(timer);
      resolve(imgToDataUrl(img));
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = cleanUrl;
  });
}

// Draw rounded rectangle helper
function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, style: string) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

/**
 * Generate Master Catalog PDF V2 (Lookbook Edition)
 * - Variation 1A: Full-Width Brand Cover Banner (40mm height)
 * - Brand Logo centered over cover banner in a crisp white badge
 * - Clean 4-Column Product Cards (up to 12 items per page)
 * - Master Carton & Pallet Packaging Details Box at the bottom right
 */
export async function generateExportCatalogPdfV2(
  products: CatalogProduct[],
  brands: BrandInfo[],
  prospectName?: string,
  companyName?: string,
  catalogHash?: string,
  customOptions?: PdfCustomOptions,
  options?: { returnBlob?: boolean; uploadToR2?: boolean }
): Promise<{ doc: jsPDF; blob?: Blob; blobUrl?: string; r2Url?: string }> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const brandMap = new Map(brands.map((b) => [b.id, b]));

  // 1. Group products by Brand
  const brandGroups: { [brandId: string]: CatalogProduct[] } = {};
  const brandPrimaryCategoryMap: { [brandId: string]: string } = {};

  products.forEach((prod) => {
    const bId = prod.brands_id || "BRAND_OTHER";
    if (!brandGroups[bId]) brandGroups[bId] = [];
    brandGroups[bId].push(prod);

    if (!brandPrimaryCategoryMap[bId]) {
      const cat = (prod.product_meta && prod.product_meta.Category) || prod.category || "";
      if (cat) brandPrimaryCategoryMap[bId] = cat;
    }
  });

  const getCategoryPriority = (catName: string): number => {
    const lower = (catName || "").toLowerCase();
    if (lower.includes("cook") || lower.includes("paste") || lower.includes("sauce") || lower.includes("culinary") || lower.includes("food") || lower.includes("ambient")) return 1;
    if (lower.includes("beverage") || lower.includes("drink") || lower.includes("soda") || lower.includes("juice") || lower.includes("tea")) return 2;
    if (lower.includes("snack") || lower.includes("biscuit") || lower.includes("cracker")) return 3;
    return 4;
  };

  const sortedBrandIds = Object.keys(brandGroups).sort((a, b) => {
    const catA = brandPrimaryCategoryMap[a] || "";
    const catB = brandPrimaryCategoryMap[b] || "";
    const prioA = getCategoryPriority(catA);
    const prioB = getCategoryPriority(catB);
    if (prioA !== prioB) return prioA - prioB;

    const brandA = brandMap.get(a);
    const brandB = brandMap.get(b);
    const rankA = Number(brandA?.rank || 999);
    const rankB = Number(brandB?.rank || 999);
    if (rankA !== rankB) return rankA - rankB;

    const nameA = (brandA?.display_name || a).toLowerCase();
    const nameB = (brandB?.display_name || b).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  for (const bId of sortedBrandIds) {
    brandGroups[bId].sort((a, b) => {
      const nameA = (a.product_meta?.Short_Title || a.product_meta?.Title || a.display_name || a.sku).toLowerCase();
      const nameB = (b.product_meta?.Short_Title || b.product_meta?.Title || b.display_name || b.sku).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  // 2. Preload Company Logo & Product Images & Brand Assets
  const productImagesMap: { [sku: string]: string | null } = {};
  const brandCoverP1Map: { [bId: string]: string | null } = {};
  const brandCoverP2Map: { [bId: string]: string | null } = {};
  const brandLogoImagesMap: { [bId: string]: { dataUrl: string; width: number; height: number } | null } = {};
  let companyLogoBase64: string | null = null;
  let watermarkBase64: string | null = null;

  // Preload Company Logo (Prioritize new official HSG logo)
  const compLogo =
    await loadImageAsDataUrl("/assets/logo/HSG Logo.jpeg", 360, true) ||
    await loadImageAsDataUrl("/assets/logo/HSG Logo.jpg", 360, true) ||
    await loadImageAsDataUrl("/HSG Logo.jpeg", 360, true) ||
    await loadImageAsDataUrl("/hsg-logo.jpeg", 360, true) ||
    await loadImageAsDataUrl("/assets/logo/Logo.png", 360, true) ||
    await loadImageAsDataUrl("/logo.png", 360, true);
  if (compLogo) companyLogoBase64 = compLogo.dataUrl;

  // Preload Translucent Colored Watermark Emblem
  const wmRes =
    await loadImageAsDataUrl("/assets/logo/Logo-Watermark-Opt.png", 450, true) ||
    await loadImageAsDataUrl("/assets/logo/Logo-Watermark-Theme.png", 450, true) ||
    await loadImageAsDataUrl("/assets/logo/White-Logo.webp", 450, true, false, undefined, true) ||
    await loadImageAsDataUrl("/assets/logo/White-Logo.png", 450, true, false, undefined, true);
  if (wmRes) watermarkBase64 = wmRes.dataUrl;

  // Preload Brand Covers (Cropped for Page 1 40mm banner and Page 2 26mm banner) and Logos
  await Promise.all(
    sortedBrandIds.map(async (bId) => {
      const bObj = brandMap.get(bId) || { id: bId, display_name: bId };
      const coverUrl = getBrandCoverImage(bObj);
      if (coverUrl) {
        const [resP1, resP2] = await Promise.all([
          loadImageAsDataUrl(coverUrl, 910, false, false, { w: 910, h: 200 }),
          loadImageAsDataUrl(coverUrl, 910, false, false, { w: 910, h: 130 })
        ]);
        if (resP1) brandCoverP1Map[bId] = resP1.dataUrl;
        if (resP2) brandCoverP2Map[bId] = resP2.dataUrl;
      }

      const logoUrl = bObj.logo_image || (bObj as any).Logo_Image || "";
      if (logoUrl) {
        const res = await loadImageAsDataUrl(logoUrl, 320, true);
        if (res) brandLogoImagesMap[bId] = res;
      }
    })
  );

  // Preload Product Images with roundedTop = true (matching card corners)
  const BATCH_SIZE = 8;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (prod) => {
        const candidateUrls = getProductCandidateUrls(prod);
        for (const cUrl of candidateUrls) {
          const res = await loadImageAsDataUrl(cUrl, 360, false, true);
          if (res) {
            productImagesMap[prod.sku] = res.dataUrl;
            break;
          }
        }
      })
    );
  }

  // Helper: Draw Top Global Header on any page
  const drawPageHeader = (pageNumber: number, totalExpectedPages?: number) => {
    // Header Background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 36, "F");

    // Top Theme Accent Bar (Matching Logo Theme #3A4B38)
    doc.setFillColor(58, 75, 56);
    doc.rect(0, 0, pageWidth, 2.5, "F");

    let textStartX = 14;
    if (companyLogoBase64) {
      try {
        doc.addImage(companyLogoBase64, "PNG", 14, 6, 22, 22);
        textStartX = 40;
      } catch (e) {
        textStartX = 14;
      }
    }

    // Company Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text("HSG GLOBAL PTE LTD", textStartX, 13);

    // Subtitle / Catalog Badge
    const currentYear = new Date().getFullYear();
    const headerTitle = customOptions?.headerTitle || `MASTER PRODUCT CATALOG ${currentYear}`;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(58, 75, 56); // Theme Sage Green #3A4B38
    doc.text(headerTitle, textStartX, 18.5);

    // Subtext / Terms
    const subtext = customOptions?.subtext || "Singapore • Malaysia • Global FMCG Distribution & Brand Gateway | Distribution & Supply Terms";
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(subtext, textStartX, 23.5);

    // Contact link (Neutral Dark Slate / Gray)
    doc.setFontSize(6.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105); // Neutral Slate Gray
    doc.text("sales@hsg-global.com | https://hsgglobal.sg", textStartX, 27.5);

    // Hairline divider
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.4);
    doc.line(14, 32, pageWidth - 14, 32);
  };

  // Helper: Draw Translucent Brand Watermark Emblem in Page Center
  const drawPageWatermark = () => {
    if (!watermarkBase64) return;
    try {
      const wmW = 110;
      const wmH = 110;
      const wmX = (pageWidth - wmW) / 2; // Horizontally centered (50mm on A4)
      const wmY = 125; // Centered in the middle-lower region of A4
      doc.addImage(watermarkBase64, "PNG", wmX, wmY, wmW, wmH);
    } catch {}
  };

  // Helper: Draw Packaging Details Card on the right side
  const drawPackagingDetailsCard = (
    x: number,
    y: number,
    w: number,
    h: number,
    sampleProd?: CatalogProduct
  ) => {
    // 1. Background & border (matching product card styling)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    drawRoundedRect(doc, x, y, w, h, 2, "FD");

    // 2. Header strip
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(x, y, w, 5.5, 2, 2, "F");
    doc.rect(x, y + 3.5, w, 2, "F"); // square bottom of header strip
    doc.setDrawColor(226, 232, 240);
    doc.line(x, y + 5.5, x + w, y + 5.5);

    // Simple Header Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text("Packaging Details", x + 3.5, y + 4.0);

    // Re-draw outer border for crisp outline
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    drawRoundedRect(doc, x, y, w, h, 2, "D");

    // Extract values
    const ctnUnits = sampleProd?.carton || sampleProd?.carton_units || "24";
    let cartonWeight = "-";
    if (sampleProd?.carton_weight) {
      const numWeight = Number(sampleProd.carton_weight);
      if (!isNaN(numWeight) && numWeight > 0) {
        // If in database as grams (e.g. >= 100), convert to kg (e.g. 7941 -> 7.94 kg)
        const inKg = numWeight >= 100 ? (numWeight / 1000).toFixed(2).replace(/\.?0+$/, '') : numWeight.toString();
        cartonWeight = `${inKg} kg`;
      } else {
        cartonWeight = String(sampleProd.carton_weight);
      }
    } else {
      cartonWeight = "7.20 kg";
    }
    const ctnL = sampleProd?.carton_l_mm || 320;
    const ctnW = sampleProd?.carton_w_mm || 240;
    const ctnH = sampleProd?.carton_h_mm || 180;
    const shelfLife = sampleProd?.shelf_life || "18 - 24 Months";
    const storage = sampleProd?.storage_condition || "Ambient Cool & Dry";
    const palletCtn = sampleProd?.pallet_ctn || "100 ctns/pallet";

    const col1X = x + 3.5;
    const col2X = x + (w / 2) + 1.5;

    doc.setFontSize(5.5);

    // Row 1
    let lineY = y + 10.0;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Pcs/Ctn:", col1X, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(ctnUnits), col1X + 17, lineY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Carton Dim:", col2X, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(`${ctnL}x${ctnW}x${ctnH} mm`, col2X + 15, lineY);

    // Row 2
    lineY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Carton Weight:", col1X, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(cartonWeight), col1X + 17, lineY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Shelf Life:", col2X, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(shelfLife), col2X + 15, lineY);

    // Row 3
    lineY += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Storage:", col1X, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(storage).slice(0, 20), col1X + 17, lineY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Ctn/Pallet:", col2X, lineY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(String(palletCtn), col2X + 15, lineY);

    // Footnote
    lineY += 4.5;
    doc.setFontSize(4.6);
    doc.setTextColor(148, 163, 184);
    doc.text("* FCL & consolidated LCL pallets available with COA.", col1X, lineY);
  };

  // Helper: Draw Curved/Wavy Dual-Tone Slogan ("Scaling Brands, Expanding Markets...") with Container Overlap
  const drawAngledSlogan = (targetPkgX: number) => {
    // Smooth cubic bezier wave starting at the left content edge (14mm) and curving upward to overlap the Packaging Details container
    const p0 = { x: 14, y: 280.5 };
    const p1 = { x: 38, y: 282.5 };
    const p2 = { x: 74, y: 275.5 };
    const p3 = { x: targetPkgX + 5.3, y: 271.5 };

    const getBezierPoint = (t: number) => {
      const u = 1 - t;
      const tt = t * t;
      const uu = u * u;
      const uuu = uu * u;
      const ttt = tt * t;

      const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
      const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;

      const dx = 3 * uu * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * tt * (p3.x - p2.x);
      const dy = 3 * uu * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * tt * (p3.y - p2.y);

      return { x, y, dx, dy };
    };

    // Precalculate arc length table for smooth letter pacing along the wave
    const samples = 150;
    const arcLengths: number[] = [0];
    let totalLength = 0;
    let prevPt = getBezierPoint(0);

    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const pt = getBezierPoint(t);
      totalLength += Math.hypot(pt.x - prevPt.x, pt.y - prevPt.y);
      arcLengths.push(totalLength);
      prevPt = pt;
    }

    const tForDistance = (dist: number) => {
      if (dist <= 0) return 0;
      if (dist >= totalLength) return 1;
      for (let i = 0; i < samples; i++) {
        if (arcLengths[i] <= dist && dist <= arcLengths[i + 1]) {
          const seg = arcLengths[i + 1] - arcLengths[i];
          const frac = seg === 0 ? 0 : (dist - arcLengths[i]) / seg;
          return (i + frac) / samples;
        }
      }
      return 1;
    };

    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(15.5); // Enlarged tagline font size

    const part1 = "Scaling Brands, ";
    const part2 = "Expanding Markets...";
    const fullText = part1 + part2;

    let currentDist = 0;
    for (let i = 0; i < fullText.length; i++) {
      const char = fullText[i];
      const charW = doc.getTextWidth(char);
      const midDist = currentDist + charW / 2;
      const t = tForDistance(midDist);
      const pt = getBezierPoint(t);

      // In jsPDF, angle is in degrees; dy is in down coordinates, so -dy inverts for PDF
      const angleRad = Math.atan2(-pt.dy, pt.dx);
      const angleDeg = (angleRad * 180) / Math.PI;

      // Position character baseline centered on the wave tangent
      const posX = pt.x - (charW / 2) * Math.cos(angleRad);
      const posY = pt.y + (charW / 2) * Math.sin(angleRad);

      // Dual-tone: Part 1 in Dark Slate 900 (#0F172A), Part 2 in Theme Sage Green (#3A4B38)
      if (i < part1.length) {
        doc.setTextColor(15, 23, 42);
      } else {
        doc.setTextColor(58, 75, 56);
      }

      doc.text(char, posX, posY, { angle: angleDeg });
      currentDist += charW;
    }
  };

  // 3. RENDER EACH BRAND AS A CLEAN SHOWCASE CHAPTER
  let isFirstPage = true;

  for (const bId of sortedBrandIds) {
    const brandProducts = brandGroups[bId];
    const brandObj = brandMap.get(bId);
    const brandTitle = (brandObj?.full_brand_name || brandObj?.display_name || bId).toUpperCase();
    const brandDesc = brandObj?.description || "Authentic Southeast Asian heritage culinary brand, commercially packaged for retail supermarkets and foodservice distribution.";
    const coverP1 = brandCoverP1Map[bId];
    const logoInfo = brandLogoImagesMap[bId];

    // Each brand begins on its own fresh page
    if (!isFirstPage) {
      doc.addPage();
    } else {
      isFirstPage = false;
    }

    drawPageWatermark();
    drawPageHeader(doc.internal.pages.length - 1);

    // --- BRAND COVER BANNER (40mm Height, Proportional Center Crop) ---
    const bannerX = 14;
    const bannerY = 35;
    const bannerW = pageWidth - 28; // 182mm
    const bannerH = 40; // 40mm height

    if (coverP1) {
      try {
        doc.addImage(coverP1, "JPEG", bannerX, bannerY, bannerW, bannerH);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.rect(bannerX, bannerY, bannerW, bannerH, "D");
      } catch (e) {
        doc.setFillColor(15, 23, 42);
        doc.rect(bannerX, bannerY, bannerW, bannerH, "F");
      }
    } else {
      doc.setFillColor(24, 28, 38);
      doc.rect(bannerX, bannerY, bannerW, bannerH, "F");
      doc.setFillColor(58, 75, 56);
      doc.rect(bannerX, bannerY + bannerH - 2, bannerW, 2, "F");
    }

    // --- CENTERED BRAND LOGO BADGE (INSIDE BANNER) ---
    const badgeW = 38;
    const badgeH = 22;
    const badgeX = (pageWidth - badgeW) / 2;
    const badgeY = bannerY + (bannerH - badgeH) / 2;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(58, 75, 56);
    doc.setLineWidth(0.4);
    drawRoundedRect(doc, badgeX, badgeY, badgeW, badgeH, 2, "FD");

    if (logoInfo?.dataUrl) {
      try {
        const maxLogoW = badgeW - 6;
        const maxLogoH = badgeH - 5;
        const aspect = (logoInfo.width && logoInfo.height) ? (logoInfo.width / logoInfo.height) : 1;

        let drawW = maxLogoW;
        let drawH = drawW / aspect;
        if (drawH > maxLogoH) {
          drawH = maxLogoH;
          drawW = drawH * aspect;
        }
        const drawX = badgeX + (badgeW - drawW) / 2;
        const drawY = badgeY + (badgeH - drawH) / 2;
        doc.addImage(logoInfo.dataUrl, "PNG", drawX, drawY, drawW, drawH);
      } catch (e) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(brandTitle, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1, { align: "center" });
      }
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(58, 75, 56);
      doc.text(brandTitle, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1, { align: "center" });
    }

    // --- BRAND TITLE & HERITAGE STORY (Expanded breathing room below banner) ---
    let textY = bannerY + bannerH + 8.5; // 8.5mm generous breathing gap

    // Brand Name Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(brandTitle, pageWidth / 2, textY, { align: "center" });

    // Description (1-2 lines)
    textY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    const descLines = doc.splitTextToSize(brandDesc, pageWidth - 40);
    const printedDesc = descLines.slice(0, 2);
    doc.text(printedDesc, pageWidth / 2, textY, { align: "center" });

    // Hairline Divider
    const dividerY = textY + (printedDesc.length * 3.3) + 2.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, dividerY, pageWidth - 14, dividerY);

    // --- PRODUCT CARDS (4-COLUMN GRID, BALANCED SMART PAGINATION & HORIZONTAL CENTERING) ---
    const cardStartX = 14;
    const cardGapX = 3.33;
    const gapY = 3.5;
    const cardW = (pageWidth - 28 - (cardGapX * 3)) / 4; // 43mm width
    const cardH = 48; // 48mm height (compact & proportional)
    const photoH = 35; // 35mm photo height
    const cardStartY = dividerY + 3.5;

    // Smart Pagination: Page 1 fits up to 12 products.
    // If brandProducts.length > 12, balance so Page 2 has at least 3 products (never 1 or 2 orphan cards).
    let page1Count = Math.min(12, brandProducts.length);
    if (brandProducts.length > 12 && (brandProducts.length - page1Count) < 3) {
      page1Count = brandProducts.length - 3;
    }
    if (brandProducts.length === 14) page1Count = 10; // Leaves 4 for Page 2 (1 full row)

    const page1Products = brandProducts.slice(0, page1Count);
    const remainingProducts = brandProducts.slice(page1Count);

    // Render Page 1 Product Rows with auto-centering for incomplete rows
    const totalP1Rows = Math.ceil(page1Products.length / 4);
    for (let r = 0; r < totalP1Rows; r++) {
      const rowItems = page1Products.slice(r * 4, (r + 1) * 4);
      const rowCount = rowItems.length;
      const rowW = (rowCount * cardW) + ((rowCount - 1) * cardGapX);
      const rowStartX = cardStartX + (pageWidth - 28 - rowW) / 2;

      rowItems.forEach((prod, c) => {
        const cx = rowStartX + (c * (cardW + cardGapX));
        const cy = cardStartY + (r * (cardH + gapY));

        // 1. Product Card Background Container
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.35);
        drawRoundedRect(doc, cx, cy, cardW, cardH, 2, "FD");

        // 2. Product Photo Box (Fit flush to end of card - clipped top corners)
        const prodImgData = productImagesMap[prod.sku];
        if (prodImgData) {
          try {
            doc.addImage(prodImgData, "PNG", cx, cy, cardW, photoH);
          } catch (e) {}
        } else {
          doc.setFillColor(248, 250, 252);
          doc.rect(cx + 0.3, cy + 0.3, cardW - 0.6, photoH - 0.3, "F");
          doc.setFontSize(6);
          doc.setTextColor(148, 163, 184);
          doc.text("No Photo", cx + cardW / 2, cy + photoH / 2, { align: "center" });
        }

        // Hairline under image
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(cx, cy + photoH, cx + cardW, cy + photoH);

        // Re-draw outer card border for crisp rounded edges framing the image
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.35);
        drawRoundedRect(doc, cx, cy, cardW, cardH, 2, "D");

        // 3. Centered Product Title
        const detailsY = cy + photoH + 2.5;
        const pTitle = prod.product_meta?.Short_Title || prod.product_meta?.Title || prod.display_name || prod.sku;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(15, 23, 42);
        const titleLines = doc.splitTextToSize(pTitle, cardW - 3);
        const printedTitle = titleLines.slice(0, 2);
        doc.text(printedTitle, cx + cardW / 2, detailsY, { align: "center" });

        const skuY = detailsY + (printedTitle.length * 2.7) + 0.8;

        // 4. Centered SKU & Barcode
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`SKU: ${prod.sku}`, cx + cardW / 2, skuY, { align: "center" });

        if (prod.single_barcode) {
          doc.setFontSize(5.2);
          doc.setTextColor(71, 85, 105);
          doc.text(`Barcode: ${prod.single_barcode}`, cx + cardW / 2, skuY + 2.5, { align: "center" });
        }
      });
    }

    // Draw Packaging Details on Page 1: Fixed under the grid at the BOTTOM RIGHT!
    const pkgW = (cardW * 2) + cardGapX; // 89.33mm
    const pkgH = 26; // 26mm compact height
    const pkgX = cardStartX + (2 * (cardW + cardGapX)); // 106.66mm
    const pkgY = pageHeight - 11 - pkgH; // 260mm (sitting right above footer)
    drawPackagingDetailsCard(pkgX, pkgY, pkgW, pkgH, brandProducts[0]);
    drawAngledSlogan(pkgX);

    // Handle Continuation Pages (if brand has products beyond Page 1)
    if (remainingProducts.length > 0) {
      const CHUNK_SIZE = 12; // Continuation page fits up to 12 items (3 rows of 4)

      for (let i = 0; i < remainingProducts.length; i += CHUNK_SIZE) {
        doc.addPage();
        drawPageWatermark();
        const contPageNum = Math.floor(i / CHUNK_SIZE) + 2;
        drawPageHeader(doc.internal.pages.length - 1);

        // --- SLIM BRAND COVER BANNER (Option 1: 26mm Height, Proportional Center Crop) ---
        const contBannerX = 14;
        const contBannerY = 35;
        const contBannerW = pageWidth - 28;
        const contBannerH = 26;

        const coverP2 = brandCoverP2Map[bId];
        if (coverP2) {
          try {
            doc.addImage(coverP2, "JPEG", contBannerX, contBannerY, contBannerW, contBannerH);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.rect(contBannerX, contBannerY, contBannerW, contBannerH, "D");
          } catch {
            doc.setFillColor(15, 23, 42);
            doc.rect(contBannerX, contBannerY, contBannerW, contBannerH, "F");
          }
        } else {
          doc.setFillColor(24, 28, 38);
          doc.rect(contBannerX, contBannerY, contBannerW, contBannerH, "F");
          doc.setFillColor(58, 75, 56);
          doc.rect(contBannerX, contBannerY + contBannerH - 2, contBannerW, 2, "F");
        }

        // Centered Brand Logo Badge on Slim Banner
        const contBadgeW = 32;
        const contBadgeH = 18;
        const contBadgeX = (pageWidth - contBadgeW) / 2;
        const contBadgeY = contBannerY + (contBannerH - contBadgeH) / 2;

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(58, 75, 56);
        doc.setLineWidth(0.35);
        drawRoundedRect(doc, contBadgeX, contBadgeY, contBadgeW, contBadgeH, 1.8, "FD");

        if (logoInfo?.dataUrl) {
          try {
            const maxW = contBadgeW - 5;
            const maxH = contBadgeH - 4;
            const aspect = (logoInfo.width && logoInfo.height) ? (logoInfo.width / logoInfo.height) : 1;
            let dW = maxW;
            let dH = dW / aspect;
            if (dH > maxH) {
              dH = maxH;
              dW = dH * aspect;
            }
            const dX = contBadgeX + (contBadgeW - dW) / 2;
            const dY = contBadgeY + (contBadgeH - dH) / 2;
            doc.addImage(logoInfo.dataUrl, "PNG", dX, dY, dW, dH);
          } catch {}
        }

        // 2-line Subheader below slim banner
        let contTextY = contBannerY + contBannerH + 6.5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(brandTitle, pageWidth / 2, contTextY, { align: "center" });

        contTextY += 4.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Product Collection (Page ${contPageNum})`, pageWidth / 2, contTextY, { align: "center" });

        // Hairline divider
        const contDividerY = contTextY + 3.5;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, contDividerY, pageWidth - 14, contDividerY);

        const contGridStartY = contDividerY + 4;
        const subBatch = remainingProducts.slice(i, i + CHUNK_SIZE);

        // Render Page 2 Product Rows with auto-centering for incomplete rows
        const totalContRows = Math.ceil(subBatch.length / 4);
        for (let r = 0; r < totalContRows; r++) {
          const rowItems = subBatch.slice(r * 4, (r + 1) * 4);
          const rowCount = rowItems.length;
          const rowW = (rowCount * cardW) + ((rowCount - 1) * cardGapX);
          const rowStartX = cardStartX + (pageWidth - 28 - rowW) / 2;

          rowItems.forEach((prod, c) => {
            const cx = rowStartX + (c * (cardW + cardGapX));
            const cy = contGridStartY + (r * (cardH + gapY));

            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.35);
            drawRoundedRect(doc, cx, cy, cardW, cardH, 2, "FD");

            const prodImgData = productImagesMap[prod.sku];
            if (prodImgData) {
              try {
                doc.addImage(prodImgData, "PNG", cx, cy, cardW, photoH);
              } catch (e) {}
            } else {
              doc.setFillColor(248, 250, 252);
              doc.rect(cx + 0.3, cy + 0.3, cardW - 0.6, photoH - 0.3, "F");
              doc.setFontSize(6);
              doc.setTextColor(148, 163, 184);
              doc.text("No Photo", cx + cardW / 2, cy + photoH / 2, { align: "center" });
            }

            doc.setDrawColor(241, 245, 249);
            doc.setLineWidth(0.3);
            doc.line(cx, cy + photoH, cx + cardW, cy + photoH);

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.35);
            drawRoundedRect(doc, cx, cy, cardW, cardH, 2, "D");

            const detailsY = cy + photoH + 2.5;
            const pTitle = prod.product_meta?.Short_Title || prod.product_meta?.Title || prod.display_name || prod.sku;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(15, 23, 42);
            const titleLines = doc.splitTextToSize(pTitle, cardW - 3);
            const printedTitle = titleLines.slice(0, 2);
            doc.text(printedTitle, cx + cardW / 2, detailsY, { align: "center" });

            const skuY = detailsY + (printedTitle.length * 2.7) + 0.8;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(5.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`SKU: ${prod.sku}`, cx + cardW / 2, skuY, { align: "center" });

            if (prod.single_barcode) {
              doc.setFontSize(5.2);
              doc.setTextColor(71, 85, 105);
              doc.text(`Barcode: ${prod.single_barcode}`, cx + cardW / 2, skuY + 2.5, { align: "center" });
            }
          });
        }

        // Draw Packaging Details on Page 2: Also fixed at the BOTTOM RIGHT!
        drawPackagingDetailsCard(pkgX, pkgY, pkgW, pkgH, brandProducts[0]);
        drawAngledSlogan(pkgX);
      }
    }
  }

  // 4. Global Footers on all pages
  const totalPages = doc.internal.pages.length - 1;
  const footerLabel = customOptions?.footerText || `Master Product Catalog ${new Date().getFullYear()}`;

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const str = `Page ${i} of ${totalPages} | HSG Global Pte Ltd • ${footerLabel} • Inquiries: sales@hsg-global.com`;
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(str, pageWidth / 2, pageHeight - 7, { align: "center" });

    // Subtle theme footer hairline (#3A4B38)
    doc.setFillColor(58, 75, 56);
    doc.rect(14, pageHeight - 10, pageWidth - 28, 0.3, "F");
  }

  // Generate output options
  let blob: Blob | undefined;
  let blobUrl: string | undefined;
  let r2Url: string | undefined;

  const pdfOutput = doc.output("blob");
  blob = pdfOutput;
  blobUrl = URL.createObjectURL(pdfOutput);

  // If uploadToR2 is requested or catalogHash is provided
  if (options?.uploadToR2 || catalogHash) {
    try {
      const pdfBase64 = doc.output("datauristring").split(",")[1];
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/exhibitor/upload-catalog-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalog_hash: catalogHash ? `${catalogHash}_v2` : "v2_preview",
          base64Data: pdfBase64
        })
      });
      if (res.ok) {
        const data = await res.json();
        r2Url = data.url;
      }
    } catch (e) {}
  }

  // If not returning blob only, trigger browser download
  if (!options?.returnBlob) {
    doc.save("HSG_Global_Master_Product_Catalog_v2.pdf");
  }

  return { doc, blob, blobUrl, r2Url };
}
