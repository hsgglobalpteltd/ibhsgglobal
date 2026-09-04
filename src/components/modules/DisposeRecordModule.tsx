"use client";

import * as React from "react";
import { jsPDF } from "jspdf";
import { 
  Trash2, 
  Pencil, 
  Lock, 
  Printer, 
  Plus, 
  X, 
  Search, 
  Camera, 
  RefreshCw, 
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  DollarSign,
  Package,
  Layers,
  ChevronRight,
  ExternalLink,
  PackageSearch
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";

interface DisposeRecordModuleProps {
  profile?: {
    role?: string;
    modules_access?: any;
    name?: string;
    email?: string;
  } | null;
}

interface DisposeItem {
  sku: string;
  qty: number;
  cost: number;
}

interface DisposeRecord {
  id: string;
  date: number; // Unix epoch ms
  reference: string;
  items: string; // JSON string of DisposeItem[] or DisposeItem[]
  cost: number;
  dispose_by: string;
  remarks: string;
  proof: string; // JSON string of string[] or string[]
}

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

function getCurrentWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return {
    start: sunday.toISOString().split("T")[0],
    end: saturday.toISOString().split("T")[0]
  };
}

function getLastWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const prevSunday = new Date(now);
  prevSunday.setDate(now.getDate() - day - 7);
  const prevSaturday = new Date(prevSunday);
  prevSaturday.setDate(prevSunday.getDate() + 6);
  return {
    start: prevSunday.toISOString().split("T")[0],
    end: prevSaturday.toISOString().split("T")[0]
  };
}

function getThisMonthRange(): { start: string; end: string } {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: firstDay.toISOString().split("T")[0],
    end: lastDay.toISOString().split("T")[0]
  };
}

function formatDateDisplay(timestamp: number | string): string {
  const num = Number(timestamp);
  if (!num || isNaN(num)) return "-";
  const date = new Date(num);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function DisposeRecordModule({ profile }: DisposeRecordModuleProps) {
  const [records, setRecords] = React.useState<DisposeRecord[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [fetching, setFetching] = React.useState(false);
  
  // Date and Search Filters
  const [datePreset, setDatePreset] = React.useState<"current_week" | "last_week" | "this_month" | "all" | "custom">("all");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "draft" | "locked">("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Modals & Panels State
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<DisposeRecord | null>(null);
  
  const [isLockOpen, setIsLockOpen] = React.useState(false);
  const [lockingRecord, setLockingRecord] = React.useState<DisposeRecord | null>(null);
  const [lockReference, setLockReference] = React.useState("");

  const [viewingPhotos, setViewingPhotos] = React.useState<{ title: string; photos: string[] } | null>(null);
  const [viewingItems, setViewingItems] = React.useState<{ id: string; reference: string; items: DisposeItem[]; cost: number } | null>(null);

  // Form Fields State
  const [formDate, setFormDate] = React.useState<string>("");
  const [formDisposeBy, setFormDisposeBy] = React.useState<string>("");
  const [formRemarks, setFormRemarks] = React.useState<string>("");
  const [formItems, setFormItems] = React.useState<DisposeItem[]>([]);
  const [formPhotos, setFormPhotos] = React.useState<string[]>([]);
  
  // Image Uploading / Compression State
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  // Product Autocomplete State
  const [productQuery, setProductQuery] = React.useState("");
  const [filteredProducts, setFilteredProducts] = React.useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = React.useState(false);

  // Product Map for fast O(1) lookup
  const productMap = React.useMemo(() => {
    const map: Record<string, any> = {};
    products.forEach((p) => {
      if (p.sku) {
        map[String(p.sku).trim().toLowerCase()] = p;
      }
    });
    return map;
  }, [products]);

  // Resolve Product Name by SKU
  const lookupProductName = React.useCallback((sku: string) => {
    const p = productMap[String(sku || "").trim().toLowerCase()];
    return p ? (p.display_name || p.name || sku) : sku;
  }, [productMap]);

  // Safe helper to parse items array from string or array
  const parseItems = (itemsRaw: any): DisposeItem[] => {
    if (!itemsRaw) return [];
    if (Array.isArray(itemsRaw)) return itemsRaw;
    if (typeof itemsRaw === "string") {
      try {
        const parsed = JSON.parse(itemsRaw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Safe helper to parse proof array from string, array, or comma-separated list
  const parseProofPhotos = (proofRaw: any): string[] => {
    if (!proofRaw) return [];
    if (Array.isArray(proofRaw)) return proofRaw.filter(Boolean);
    if (typeof proofRaw === "string") {
      const trimmed = proofRaw.trim();
      if (!trimmed || trimmed === "[]") return [];
      if (trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {}
      }
      return trimmed.split(",").map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  // Load Dispose Records and Products
  const loadData = React.useCallback(async (forceSync = false) => {
    setFetching(true);
    try {
      // 1. Load Products from cache/fetch via dedicated endpoint
      let cachedProds = localStorage.getItem("dispose_products_data");
      let prodList = [];
      if (cachedProds && !forceSync) {
        try {
          prodList = JSON.parse(cachedProds);
          setProducts(prodList);
        } catch {}
      }
      
      if (prodList.length === 0 || forceSync) {
        const prodRes = await fetch(`${WORKER_URL}/api/dispose-goods/products`);
        if (prodRes.ok) {
          prodList = await prodRes.json();
          localStorage.setItem("dispose_products_data", JSON.stringify(prodList));
          setProducts(prodList);
        }
      }

      // 2. Load Dispose Records via dedicated endpoint
      const res = await fetch(`${WORKER_URL}/api/dispose-goods/list`);
      if (res.ok) {
        const dataList = await res.json();
        localStorage.setItem("dispose_goods_data", JSON.stringify(dataList));
        setRecords(dataList);
      }
    } catch (err: any) {
      showToast("Error loading data: " + err.message, "error");
    } finally {
      setFetching(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
    
    // Listen to global refresh events
    const handleGlobalRefresh = () => {
      loadData(true);
    };
    window.addEventListener("db-refresh", handleGlobalRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleGlobalRefresh);
    };
  }, [loadData]);

  // Date range timestamps
  const { startEpoch, endEpoch } = React.useMemo(() => {
    if (!startDate && !endDate) {
      return { startEpoch: 0, endEpoch: Infinity };
    }
    let s = 0;
    let e = Infinity;
    if (startDate) {
      s = new Date(startDate + "T00:00:00").getTime();
    }
    if (endDate) {
      e = new Date(endDate + "T23:59:59.999").getTime();
    }
    return { startEpoch: s, endEpoch: e };
  }, [startDate, endDate]);

  const handleSelectPreset = (preset: "current_week" | "last_week" | "this_month" | "all") => {
    setDatePreset(preset);
    if (preset === "current_week") {
      const r = getCurrentWeekRange();
      setStartDate(r.start);
      setEndDate(r.end);
    } else if (preset === "last_week") {
      const r = getLastWeekRange();
      setStartDate(r.start);
      setEndDate(r.end);
    } else if (preset === "this_month") {
      const r = getThisMonthRange();
      setStartDate(r.start);
      setEndDate(r.end);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Filtered records
  const filteredRecords = React.useMemo(() => {
    return records.filter((r) => {
      // Date filter
      if (datePreset !== "all") {
        if (r.date < startEpoch || r.date > endEpoch) return false;
      }

      // Status filter
      if (statusFilter === "locked" && !r.reference) return false;
      if (statusFilter === "draft" && r.reference) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = String(r.id || "").toLowerCase().includes(q);
        const refMatch = String(r.reference || "").toLowerCase().includes(q);
        const userMatch = String(r.dispose_by || "").toLowerCase().includes(q);
        const remarkMatch = String(r.remarks || "").toLowerCase().includes(q);
        const items = parseItems(r.items);
        const itemMatch = items.some((it) => {
          const pName = lookupProductName(it.sku).toLowerCase();
          return it.sku.toLowerCase().includes(q) || pName.includes(q);
        });

        if (!idMatch && !refMatch && !userMatch && !remarkMatch && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [records, datePreset, startEpoch, endEpoch, statusFilter, searchQuery, lookupProductName]);

  // Image Compressor (resizes and adjusts JPEG quality until size < 100KB)
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Scale down if dimensions are large
          const maxDimension = 1200;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          let quality = 0.95;
          const getBlob = (q: number): Promise<Blob | null> => {
            return new Promise((res) => {
              canvas.toBlob((blob) => res(blob), "image/jpeg", q);
            });
          };

          const tryCompress = async () => {
            let blob = await getBlob(quality);
            while (blob && blob.size > 100 * 1024 && quality > 0.1) {
              quality -= 0.1;
              blob = await getBlob(quality);
            }
            resolve(blob || file);
          };
          tryCompress();
        };
      };
    });
  };

  // Upload Photo to Secure Storage
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (formPhotos.length + files.length > 10) {
      showToast("You can upload a maximum of 10 photos.", "error");
      return;
    }

    setUploading(true);
    try {
      const uploadedUrls = [...formPhotos];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Compressing photo ${i + 1} of ${files.length}...`);
        
        const compressedBlob = await compressImage(file);
        const compressedFile = new File([compressedBlob], file.name, { type: "image/jpeg" });

        setUploadProgress(`Uploading photo ${i + 1} of ${files.length}: ${file.name}...`);
        
        const fileName = `dispose_goods/dispose_${Date.now()}_${compressedFile.name.replace(/\s+/g, "_")}`;
        const uploadRes = await fetch(`${WORKER_URL}/api/upload?filename=${encodeURIComponent(fileName)}`, {
          method: "POST",
          headers: {
            "Content-Type": "image/jpeg"
          },
          body: compressedFile
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const resData = await uploadRes.json() as any;
        if (resData.url) {
          uploadedUrls.push(resData.url);
        }
      }

      setFormPhotos(uploadedUrls);
      showToast("Photos uploaded and compressed successfully.", "success");
    } catch (err: any) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploading(false);
      setUploadProgress("");
      e.target.value = "";
    }
  };

  const removePhoto = (idx: number) => {
    setFormPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  // Product Autocomplete Helpers
  React.useEffect(() => {
    if (!productQuery.trim()) {
      setFilteredProducts([]);
      return;
    }
    const q = productQuery.toLowerCase();
    const matches = products.filter(p => 
      String(p.sku || "").toLowerCase().includes(q) ||
      String(p.display_name || p.name || "").toLowerCase().includes(q)
    );
    setFilteredProducts(matches.slice(0, 10));
  }, [productQuery, products]);

  const addDisposeItem = (prod: any) => {
    if (formItems.some(item => item.sku.toLowerCase() === prod.sku.toLowerCase())) {
      showToast("Product is already added to the list.", "warning");
      return;
    }

    const newItem: DisposeItem = {
      sku: prod.sku,
      qty: 1,
      cost: Number(prod.cost) || 0
    };
    setFormItems(prev => [...prev, newItem]);
    setProductQuery("");
    setShowProductDropdown(false);
  };

  const removeDisposeItem = (sku: string) => {
    setFormItems(prev => prev.filter(item => item.sku !== sku));
  };

  const updateItemQty = (sku: string, qty: number) => {
    setFormItems(prev => prev.map(item => item.sku === sku ? { ...item, qty: Math.max(1, qty) } : item));
  };

  const updateItemCost = (sku: string, cost: number) => {
    setFormItems(prev => prev.map(item => item.sku === sku ? { ...item, cost: Math.max(0, cost) } : item));
  };

  const totalDisposalCost = React.useMemo(() => {
    return formItems.reduce((sum, item) => sum + (item.qty * item.cost), 0);
  }, [formItems]);

  // Open Form Modal for Add New
  const handleOpenAddForm = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    setEditingRecord(null);
    setFormDate(todayStr);
    setFormDisposeBy(profile?.name || profile?.email || "Admin");
    setFormRemarks("");
    setFormItems([]);
    setFormPhotos([]);
    setIsFormOpen(true);
  };

  // Open Form Modal for Edit
  const handleOpenEditForm = (record: DisposeRecord) => {
    if (record.reference) {
      showToast("Cannot edit a locked record.", "warning");
      return;
    }

    const dateEpoch = Number(record.date) || Date.now();
    const dateObj = new Date(dateEpoch);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    
    const parsedItems = parseItems(record.items);
    const parsedPhotos = parseProofPhotos(record.proof);

    setEditingRecord(record);
    setFormDate(`${yyyy}-${mm}-${dd}`);
    setFormDisposeBy(record.dispose_by || "");
    setFormRemarks(record.remarks || "");
    setFormItems(parsedItems);
    setFormPhotos(parsedPhotos);
    setIsFormOpen(true);
  };

  // Save / Update record
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formItems.length === 0) {
      showToast("Please add at least one item to dispose.", "error");
      return;
    }

    setIsSaving(true);
    const epochDate = new Date(formDate + "T00:00:00").getTime();
    const recordId = editingRecord ? editingRecord.id : `disp_${Date.now()}`;
    
    const recordPayload: DisposeRecord = {
      id: recordId,
      date: epochDate,
      reference: editingRecord ? editingRecord.reference : "",
      items: JSON.stringify(formItems),
      cost: totalDisposalCost,
      dispose_by: formDisposeBy,
      remarks: formRemarks,
      proof: JSON.stringify(formPhotos)
    };

    // Optimistic UI updates
    const originalRecords = [...records];
    let updatedRecords;
    if (editingRecord) {
      updatedRecords = records.map(r => r.id === recordId ? recordPayload : r);
    } else {
      updatedRecords = [recordPayload, ...records];
    }

    setRecords(updatedRecords);
    localStorage.setItem("dispose_goods_data", JSON.stringify(updatedRecords));
    setIsFormOpen(false);

    try {
      const res = await fetch(`${WORKER_URL}/api/dispose-goods/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recordPayload)
      });

      if (!res.ok) {
        throw new Error("Worker request failed");
      }
      
      showToast(editingRecord ? "Disposal record updated" : "New disposal record created", "success");
      loadData();
    } catch (err: any) {
      showToast("Failed to save changes: " + err.message, "error");
      setRecords(originalRecords);
      localStorage.setItem("dispose_goods_data", JSON.stringify(originalRecords));
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = async (record: DisposeRecord) => {
    if (record.reference) {
      showToast("Cannot delete a locked record.", "warning");
      return;
    }

    if (!confirm(`Are you sure you want to delete disposal record ${record.id}?`)) {
      return;
    }

    const originalRecords = [...records];
    const updatedRecords = records.filter(r => r.id !== record.id);
    
    setRecords(updatedRecords);
    localStorage.setItem("dispose_goods_data", JSON.stringify(updatedRecords));

    try {
      const res = await fetch(`${WORKER_URL}/api/dispose-goods/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: record.id })
      });

      if (!res.ok) {
        throw new Error("Worker deletion request failed");
      }

      showToast(`Record ${record.id} deleted`, "success");
      loadData();
    } catch (err: any) {
      showToast("Failed to delete record. Rolling back.", "error");
      setRecords(originalRecords);
      localStorage.setItem("dispose_goods_data", JSON.stringify(originalRecords));
    }
  };

  // Lock Action Modal Submit
  const handleLockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockingRecord) return;
    if (!lockReference.trim()) {
      showToast("Please enter a valid Reference Number.", "error");
      return;
    }

    const targetRecord = { ...lockingRecord, reference: lockReference.trim() };
    const originalRecords = [...records];
    const updatedRecords = records.map(r => r.id === lockingRecord.id ? targetRecord : r);

    setRecords(updatedRecords);
    localStorage.setItem("dispose_goods_data", JSON.stringify(updatedRecords));
    setIsLockOpen(false);
    setLockReference("");

    try {
      const res = await fetch(`${WORKER_URL}/api/dispose-goods/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lockingRecord.id,
          reference: targetRecord.reference
        })
      });

      if (!res.ok) {
        throw new Error("Worker locking failed");
      }

      loadData();
      showToast("Record successfully locked with reference.", "success");
    } catch (err: any) {
      showToast("Failed to lock record. Rolling back.", "error");
      setRecords(originalRecords);
      localStorage.setItem("dispose_goods_data", JSON.stringify(originalRecords));
    }
  };

  // Image Base64 Loader Helper for jsPDF
  const loadImageBase64 = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        try {
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        } catch (e) {
          resolve("");
        }
      };
      img.onerror = () => {
        resolve("");
      };
    });
  };

  // Print Proof PDF (Open in new tab via Blob)
  const handlePrintProof = async (record: DisposeRecord) => {
    showToast("Generating disposal proof document...", "info");
    
    const parsedItems = parseItems(record.items);
    const parsedPhotos = parseProofPhotos(record.proof);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Header Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(24, 24, 27);
    doc.text("iB - Dispose Goods Proof", 15, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(113, 113, 122);
    doc.text(`Disposal Proof Document - HSG Global Pte Ltd`, 15, 23);

    // Summary Details Columns
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(63, 63, 70);
    
    doc.text("Disposal Details", 15, 33);
    doc.setDrawColor(228, 228, 231);
    doc.line(15, 35, 195, 35);

    doc.setFont("helvetica", "bold");
    doc.text("Date:", 15, 41);
    doc.setFont("helvetica", "normal");
    doc.text(formatDateDisplay(record.date), 55, 41);

    doc.setFont("helvetica", "bold");
    doc.text("Disposed By:", 15, 47);
    doc.setFont("helvetica", "normal");
    doc.text(record.dispose_by || "-", 55, 47);

    doc.setFont("helvetica", "bold");
    doc.text("Reference Number:", 15, 53);
    doc.setFont("helvetica", "normal");
    doc.text(record.reference || "Pending Lock", 55, 53);

    doc.setFont("helvetica", "bold");
    doc.text("Remarks:", 15, 59);
    doc.setFont("helvetica", "normal");
    const wrappedRemarks = doc.splitTextToSize(record.remarks || "-", 140);
    doc.text(wrappedRemarks, 55, 59);

    const remarksHeight = Math.max(1, wrappedRemarks.length) * 6;
    const costY = 59 + remarksHeight;

    doc.setFont("helvetica", "bold");
    doc.text("Total Disposal Cost:", 15, costY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(`$${Number(record.cost || 0).toFixed(2)}`, 55, costY);

    // Table Header
    doc.setTextColor(63, 63, 70);
    const tableStartY = costY + 8;
    doc.setFont("helvetica", "bold");
    doc.text("Disposed Items", 15, tableStartY);

    const thY = tableStartY + 3;
    doc.setFillColor(244, 244, 245);
    doc.rect(15, thY, 180, 7, "F");
    doc.rect(15, thY, 180, 7);

    doc.setFontSize(8.5);
    doc.text("SKU", 17, thY + 4.5);
    doc.text("Product Name", 57, thY + 4.5);
    doc.text("Qty", 142, thY + 4.5, { align: "right" });
    doc.text("Cost", 167, thY + 4.5, { align: "right" });
    doc.text("Total", 192, thY + 4.5, { align: "right" });

    // Table Rows
    doc.setFont("helvetica", "normal");
    let currentY = thY + 7;
    parsedItems.forEach((item) => {
      const prodName = lookupProductName(item.sku);
      const wrappedName = doc.splitTextToSize(prodName, 80);
      const rowHeight = Math.max(1, wrappedName.length) * 4.5 + 2;

      // Page break check for table rows
      if (currentY + rowHeight > 255) {
        doc.addPage();
        currentY = 20;
      }

      // Draw cell borders
      doc.rect(15, currentY, 180, rowHeight);

      doc.text(item.sku, 17, currentY + 4);
      doc.text(wrappedName, 57, currentY + 4);
      doc.text(String(item.qty), 142, currentY + 4, { align: "right" });
      doc.text(`$${Number(item.cost).toFixed(2)}`, 167, currentY + 4, { align: "right" });
      doc.text(`$${Number(item.qty * item.cost).toFixed(2)}`, 192, currentY + 4, { align: "right" });

      currentY += rowHeight;
    });

    // Render Proof Images Under Table
    if (parsedPhotos.length > 0) {
      let imageStartY = currentY + 10;
      
      // Page break check for image section header
      if (imageStartY + 25 > 255) {
        doc.addPage();
        imageStartY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("Disposal Proof Photos", 15, imageStartY);
      doc.setDrawColor(228, 228, 231);
      doc.line(15, imageStartY + 2, 195, imageStartY + 2);

      let photoY = imageStartY + 6;
      const imgWidth = 55;
      const imgHeight = 40;
      const spacing = 7;

      for (let i = 0; i < parsedPhotos.length; i++) {
        if (photoY + imgHeight > 255) {
          doc.addPage();
          photoY = 20;
        }

        const photoUrl = parsedPhotos[i];
        const base64Data = await loadImageBase64(photoUrl);
        if (base64Data) {
          const colIndex = i % 3;
          const photoX = 15 + colIndex * (imgWidth + spacing);
          doc.addImage(base64Data, "JPEG", photoX, photoY, imgWidth, imgHeight);
          
          if (colIndex === 2 || i === parsedPhotos.length - 1) {
            photoY += imgHeight + spacing;
          }
        }
      }
    }

    // Add Signature Lines to the bottom of EVERY page
    const totalPages = doc.getNumberOfPages();
    const sigY = 260;

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      doc.setDrawColor(200, 200, 200);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(63, 63, 70);

      // Dispose By Signature Line
      doc.line(15, sigY + 12, 75, sigY + 12);
      doc.text("Dispose By", 15, sigY + 17);
      doc.setFont("helvetica", "bold");
      doc.text(record.dispose_by || "-", 15, sigY + 22);

      // Acknowledge By Signature Line
      doc.setFont("helvetica", "normal");
      doc.line(125, sigY + 12, 185, sigY + 12);
      doc.text("Acknowledge By", 125, sigY + 17);
    }

    const blob = doc.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            Dispose Goods Portal
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Record, lock, and print proof documents for damaged, expired, or returned inventory disposal.
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2">
          <CustomButton
            variant="dark"
            onClick={handleOpenAddForm}
            className="h-8 px-3 text-xs rounded-lg bg-[#0B57D0] hover:bg-[#0842A0]"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Disposal Record
          </CustomButton>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR */}
      <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Left: Date Presets */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center bg-white border border-zinc-300/80 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => handleSelectPreset("current_week")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                datePreset === "current_week" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Current Week
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("last_week")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                datePreset === "last_week" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Last Week
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("this_month")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                datePreset === "this_month" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset("all")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                datePreset === "all" ? "bg-[#0B57D0] text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              All Time
            </button>
          </div>

          {datePreset !== "all" && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-600">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="h-8 px-2 bg-white border border-zinc-300 rounded-lg text-xs"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="h-8 px-2 bg-white border border-zinc-300 rounded-lg text-xs"
              />
            </div>
          )}
        </div>

        {/* Right: Status Filter & Search */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-8 px-2.5 text-xs bg-white border border-zinc-300 rounded-lg text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
          >
            <option value="all">All Status</option>
            <option value="draft">🟡 Draft (Editable)</option>
            <option value="locked">🔒 Locked (Reference Assigned)</option>
          </select>

          {/* Search Box */}
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SKU, Ref, Disposed By..."
              className="w-full h-8 pl-8 pr-6 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* 3. DATA TABLE */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1000px]">
          <thead className="bg-slate-50/90 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Status</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Disposal Date</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Reference Number</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Disposed Items</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600 text-right">Total Cost</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Disposed By</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600">Remarks</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600 text-center">Proof Photos</th>
              <th className="p-3 text-[11px] font-semibold text-zinc-600 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {fetching ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#0B57D0]" />
                    <span className="font-medium text-xs text-zinc-600">Loading disposal records...</span>
                  </div>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-12 text-center text-zinc-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <FileText className="w-7 h-7 text-zinc-300" />
                    <span className="font-medium text-sm text-zinc-600">No disposal records found.</span>
                    <span className="text-xs text-zinc-400">Try adjusting your date range or filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                const parsedItems = parseItems(record.items);
                const parsedPhotos = parseProofPhotos(record.proof);
                const isLocked = !!record.reference;

                return (
                  <tr 
                    key={record.id} 
                    className="hover:bg-slate-50/70 transition-colors h-11"
                  >
                    {/* Status Badge */}
                    <td className="p-3">
                      {isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Draft (Editable)
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="p-3 text-zinc-600 font-mono text-[11px]">
                      {formatDateDisplay(record.date)}
                    </td>

                    {/* Reference */}
                    <td className="p-3">
                      {record.reference ? (
                        <span className="font-mono font-semibold text-zinc-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {record.reference}
                        </span>
                      ) : (
                        <span className="text-zinc-400 italic text-[11px]">Pending Reference</span>
                      )}
                    </td>

                    {/* Items preview */}
                    <td className="p-3 max-w-[280px]">
                      {parsedItems.length === 0 ? (
                        <span className="text-zinc-400 italic">No items</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setViewingItems({
                            id: record.id,
                            reference: record.reference || "Draft",
                            items: parsedItems,
                            cost: record.cost
                          })}
                          className="flex items-center gap-1.5 flex-wrap text-left group hover:opacity-90 cursor-pointer"
                          title="Click to view full SKU disposal list"
                        >
                          {parsedItems.slice(0, 3).map((it, idx) => (
                            <span key={idx} className="bg-white border border-slate-200 group-hover:border-[#0B57D0]/40 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-700">
                              {it.sku} <span className="font-bold text-[#0B57D0]">x{it.qty}</span>
                            </span>
                          ))}
                          {parsedItems.length > 3 && (
                            <span className="text-[10px] font-semibold text-[#0B57D0] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              +{parsedItems.length - 3} more
                            </span>
                          )}
                          <Eye className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#0B57D0] ml-0.5 shrink-0" />
                        </button>
                      )}
                    </td>

                    {/* Total Cost */}
                    <td className="p-3 text-right font-mono font-bold text-rose-600 tabular-nums">
                      ${Number(record.cost || 0).toFixed(2)}
                    </td>

                    {/* Disposed By */}
                    <td className="p-3 text-zinc-800 font-medium">
                      {record.dispose_by || "-"}
                    </td>

                    {/* Remarks */}
                    <td className="p-3 max-w-[200px] text-zinc-600 truncate" title={record.remarks || "-"}>
                      {record.remarks || "-"}
                    </td>

                    {/* Proof Photos */}
                    <td className="p-3 text-center">
                      {parsedPhotos.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setViewingPhotos({
                            title: `Disposal Proof (${record.reference || record.id})`,
                            photos: parsedPhotos
                          })}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#0B57D0] border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="View attached disposal proof photos"
                        >
                          <Camera className="w-3 h-3" />
                          <span>{parsedPhotos.length}</span>
                        </button>
                      ) : (
                        <span className="text-zinc-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Print Proof */}
                        <button
                          type="button"
                          onClick={() => handlePrintProof(record)}
                          className="p-1 rounded text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Print Disposal Proof Document"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {isLocked ? (
                          <div title="Locked - Cannot edit or delete">
                            <Lock className="w-3.5 h-3.5 text-zinc-400 ml-1" />
                          </div>
                        ) : (
                          <>
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(record)}
                              className="p-1 rounded text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit Record"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Lock */}
                            <button
                              type="button"
                              onClick={() => {
                                setLockingRecord(record);
                                setLockReference("");
                                setIsLockOpen(true);
                              }}
                              className="p-1 rounded text-zinc-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Lock with Reference Number"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteRecord(record)}
                              className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete Draft Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
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

      {/* ========================================================================= */}
      {/* ADD / EDIT DISPOSAL RECORD MODAL */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  {editingRecord ? "Edit Disposal Record" : "Add Disposal Record"}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {editingRecord ? `Modifying record ${editingRecord.id}` : "Record and calculate damaged or expired items for disposal."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveRecord} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 text-xs">
              
              {/* Row 1: Date & Disposed By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Disposal Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full h-8 px-3 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Disposed By <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formDisposeBy}
                    onChange={(e) => setFormDisposeBy(e.target.value)}
                    placeholder="e.g. Warehouse Staff / Admin"
                    className="w-full h-8 px-3 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Row 2: Remarks */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Remarks / Reason for Disposal
                </label>
                <textarea
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="e.g. Expired stock, damaged packaging during delivery, QC rejected..."
                  rows={2}
                  className="w-full p-2.5 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-[#0B57D0] resize-none"
                />
              </div>

              {/* Row 3: Disposal Items Builder */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <PackageSearch className="w-3.5 h-3.5 text-[#0B57D0]" />
                    Disposed Items ({formItems.length})
                  </label>
                  {formItems.length > 0 && (
                    <span className="text-xs font-bold text-rose-600">
                      Total Cost: ${totalDisposalCost.toFixed(2)}
                    </span>
                  )}
                </div>

                {/* Autocomplete Input */}
                <div className="relative">
                  <div className="flex items-center bg-white border border-zinc-300 rounded-lg px-2.5 py-1.5 shadow-xs">
                    <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search product SKU or name to add..."
                      value={productQuery}
                      onChange={(e) => {
                        setProductQuery(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      className="w-full text-xs bg-transparent border-none outline-none font-medium text-zinc-900"
                    />
                    {productQuery && (
                      <button type="button" onClick={() => setProductQuery("")} className="text-zinc-400 hover:text-zinc-700">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Options */}
                  {showProductDropdown && filteredProducts.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-20 divide-y divide-slate-100">
                      {filteredProducts.map((p) => (
                        <div
                          key={p.sku}
                          onClick={() => addDisposeItem(p)}
                          className="px-3 py-2 text-xs hover:bg-blue-50/60 cursor-pointer flex justify-between items-center transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-900 font-mono">{p.sku}</span>
                            <span className="text-[11px] text-zinc-500">{p.display_name || p.name}</span>
                          </div>
                          <span className="font-mono font-bold text-[#0B57D0]">${Number(p.cost || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items Table */}
                {formItems.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#F8F9FA] text-[10px] font-bold text-zinc-600 uppercase border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-2">SKU & Product</th>
                          <th className="p-2 w-20 text-center">Qty (pcs)</th>
                          <th className="p-2 w-24 text-right">Unit Cost</th>
                          <th className="p-2 w-24 text-right">Subtotal</th>
                          <th className="p-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formItems.map((item) => (
                          <tr key={item.sku} className="hover:bg-slate-50/60">
                            <td className="p-2">
                              <span className="font-mono font-bold text-zinc-900">{item.sku}</span>
                              <div className="text-[10px] text-zinc-500 truncate max-w-[220px]">
                                {lookupProductName(item.sku)}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min={1}
                                value={item.qty}
                                onChange={(e) => updateItemQty(item.sku, parseInt(e.target.value) || 1)}
                                className="w-16 h-7 text-center text-xs bg-white border border-zinc-300 rounded px-1 font-bold text-zinc-900"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-zinc-400">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  value={item.cost}
                                  onChange={(e) => updateItemCost(item.sku, parseFloat(e.target.value) || 0)}
                                  className="w-16 h-7 text-right text-xs bg-white border border-zinc-300 rounded px-1 font-bold text-zinc-900 font-mono"
                                />
                              </div>
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-zinc-800">
                              ${(item.qty * item.cost).toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeDisposeItem(item.sku)}
                                className="text-zinc-400 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-zinc-400 italic bg-white border border-slate-200 rounded-lg">
                    No items added yet. Search and select a product SKU above.
                  </div>
                )}
              </div>

              {/* Row 4: Photo Proof Upload */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#0B57D0]" />
                    Proof Photos ({formPhotos.length}/10)
                  </label>
                  <span className="text-[10px] text-zinc-400">Auto-compressed &lt;100KB</span>
                </div>

                <div className="flex items-center justify-center border border-dashed border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors p-4 relative cursor-pointer group">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading || formPhotos.length >= 10}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div className="flex flex-col items-center gap-1 text-center">
                    <Camera className="w-5 h-5 text-zinc-400 group-hover:text-[#0B57D0] transition-colors" />
                    <span className="text-xs font-semibold text-zinc-700">Click or drag images to upload</span>
                    <span className="text-[10px] text-zinc-400">Attach photos of damaged goods / discard proof</span>
                  </div>
                </div>

                {/* Uploaded Photos Grid */}
                {formPhotos.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mt-1">
                    {formPhotos.map((url, idx) => (
                      <div key={idx} className="relative aspect-square border border-slate-200 rounded-lg overflow-hidden bg-slate-100 group shadow-xs">
                        <img src={url} alt="Proof" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white rounded-full p-1 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Footer */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <CustomButton
                  type="button"
                  variant="secondary"
                  onClick={() => setIsFormOpen(false)}
                  className="h-8 px-4 text-xs"
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  type="submit"
                  variant="dark"
                  disabled={isSaving || uploading}
                  className="h-8 px-4 text-xs bg-[#0B57D0] hover:bg-[#0842A0]"
                >
                  {isSaving ? "Saving..." : editingRecord ? "Save Changes" : "Save Disposal Record"}
                </CustomButton>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LOCK REFERENCE DIALOG MODAL */}
      {/* ========================================================================= */}
      {isLockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleLockSubmit} className="bg-white border border-slate-200 w-full max-w-sm rounded-xl p-5 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold">Lock Disposal Record</h3>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed">
              Enter the Million accounting reference number to lock this disposal record. Once locked, it can no longer be modified or deleted.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 mb-1">Reference Number</label>
              <input
                type="text"
                required
                value={lockReference}
                onChange={(e) => setLockReference(e.target.value)}
                placeholder="e.g. DISP-2026-0041"
                className="w-full h-8 px-3 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-[#0B57D0] font-mono font-semibold"
              />
            </div>

            <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-slate-100">
              <CustomButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsLockOpen(false);
                  setLockingRecord(null);
                  setLockReference("");
                }}
                className="h-8 px-3 text-xs"
              >
                Cancel
              </CustomButton>
              <CustomButton
                type="submit"
                variant="dark"
                className="h-8 px-4 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                Confirm Lock
              </CustomButton>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW SKU ITEMS DETAIL MODAL */}
      {/* ========================================================================= */}
      {viewingItems && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[85vh]">
            
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <PackageSearch className="w-4 h-4 text-[#0B57D0]" />
                  Disposed SKU Items ({viewingItems.items.length} {viewingItems.items.length === 1 ? "Item" : "Items"})
                </h3>
                <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                  <span>Ref: <strong className="text-zinc-800 font-mono">{viewingItems.reference}</strong></span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-zinc-400">{viewingItems.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingItems(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items Table */}
            <div className="overflow-y-auto flex-1 p-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#F8F9FA] text-[11px] font-bold text-zinc-600 uppercase border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 w-12 text-center text-zinc-400">#</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Unit Cost</th>
                    <th className="p-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {viewingItems.items.map((item, idx) => {
                    const pName = lookupProductName(item.sku);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="p-3">
                          <span className="font-mono font-bold text-zinc-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.sku}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-800 font-medium">
                          {pName}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-zinc-900">
                          {item.qty.toLocaleString()} <span className="text-xs font-normal text-zinc-500">pcs</span>
                        </td>
                        <td className="p-3 text-right font-mono text-zinc-600">
                          ${Number(item.cost || 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">
                          ${((item.qty || 0) * (item.cost || 0)).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="px-5 py-3 bg-[#F8F9FA] border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-zinc-500">Total Unique SKUs:</span>{" "}
                  <strong className="text-zinc-900 font-mono">{viewingItems.items.length}</strong>
                </div>
                <div>
                  <span className="text-zinc-500">Total Pieces:</span>{" "}
                  <strong className="text-zinc-900 font-mono font-bold">
                    {viewingItems.items.reduce((acc, i) => acc + (i.qty || 0), 0).toLocaleString()} pcs
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500">Total Cost:</span>{" "}
                  <strong className="text-rose-600 font-mono font-bold text-sm">
                    ${Number(viewingItems.cost || 0).toFixed(2)}
                  </strong>
                </div>
              </div>
              <CustomButton
                variant="secondary"
                onClick={() => setViewingItems(null)}
                className="h-8 px-4 text-xs"
              >
                Close
              </CustomButton>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHOTO LIGHTBOX PREVIEW MODAL */}
      {/* ========================================================================= */}
      {viewingPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[85vh]">
            
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#0B57D0]" />
                  Disposal Proof Photos ({viewingPhotos.photos.length})
                </h3>
                <span className="text-xs text-zinc-500">{viewingPhotos.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingPhotos(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photos Grid */}
            <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {viewingPhotos.photos.map((url, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-black/5 aspect-4/3 flex items-center justify-center">
                    <img 
                      src={url} 
                      alt={`Proof Photo ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1"
                    >
                      <ExternalLink className="w-4 h-4" /> Open Full
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <CustomButton
                variant="secondary"
                onClick={() => setViewingPhotos(null)}
                className="h-8 px-4 text-xs"
              >
                Close
              </CustomButton>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
