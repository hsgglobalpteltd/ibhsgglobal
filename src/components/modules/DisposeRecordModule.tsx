"use client";

import * as React from "react";
import { jsPDF } from "jspdf";
import { DataTable, Column } from "../data-table";
import { 
  Trash2, 
  Pencil, 
  Lock, 
  Printer, 
  Plus, 
  X, 
  Search, 
  Image as ImageIcon, 
  Loader2, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";

interface DisposeRecordModuleProps {
  profile?: {
    role: string;
    modules_access: string[];
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
  ID: string;
  Date: number; // Unix epoch ms
  Reference: string;
  Items: string; // JSON string of DisposeItem[]
  Cost: number;
  Dispose_By: string;
  Remarks: string;
  Proof: string; // JSON string of string[] (URLs)
}

export function DisposeRecordModule({ profile }: DisposeRecordModuleProps) {
  const [records, setRecords] = React.useState<DisposeRecord[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [fetching, setFetching] = React.useState(false);
  
  // Modals & Panels State
  const [view, setView] = React.useState<"list" | "form">("list");
  const [editingRecord, setEditingRecord] = React.useState<DisposeRecord | null>(null);
  const [isLockOpen, setIsLockOpen] = React.useState(false);
  const [lockingRecord, setLockingRecord] = React.useState<DisposeRecord | null>(null);
  const [lockReference, setLockReference] = React.useState("");
  const [activePhotoList, setActivePhotoList] = React.useState<string[] | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = React.useState(0);

  // Form Fields State
  const [formDate, setFormDate] = React.useState<string>("");
  const [formDisposeBy, setFormDisposeBy] = React.useState<string>("");
  const [formRemarks, setFormRemarks] = React.useState<string>("");
  const [formItems, setFormItems] = React.useState<DisposeItem[]>([]);
  const [formPhotos, setFormPhotos] = React.useState<string[]>([]);
  
  // Image Uploading / Compression State
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState("");

  // Product Autocomplete State
  const [productQuery, setProductQuery] = React.useState("");
  const [filteredProducts, setFilteredProducts] = React.useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = React.useState(false);

  // Global search input for DataTable
  const [searchQuery, setSearchQuery] = React.useState("");

  // Resolve Product Name by SKU
  const lookupProductName = React.useCallback((sku: string) => {
    const prod = products.find(p => String(p.SKU || "").trim().toLowerCase() === String(sku).trim().toLowerCase());
    return prod ? (prod["Display Name"] || prod.Display_Name || prod.Name || sku) : sku;
  }, [products]);

  // Load Dispose Records and Products
  const loadData = React.useCallback(async (forceSync = false) => {
    setFetching(true);
    try {
      // 1. Load Products from cache/fetch
      let cachedProds = localStorage.getItem("products_DB_data");
      let prodList = [];
      if (cachedProds && !forceSync) {
        prodList = JSON.parse(cachedProds);
        setProducts(prodList);
      } else {
        const prodRes = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=products_DB");
        if (prodRes.ok) {
          prodList = await prodRes.json();
          localStorage.setItem("products_DB_data", JSON.stringify(prodList));
          setProducts(prodList);
        }
      }

      // 2. Load Dispose Records
      const sheetName = "Dispose_Goods";
      if (forceSync) {
        await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`, {
          method: "POST"
        });
      }
      const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`);
      if (res.ok) {
        const dataList = await res.json();
        localStorage.setItem(`${sheetName}_data`, JSON.stringify(dataList));
        setRecords(dataList);
      } else if (res.status === 404) {
        console.warn("Dispose_Goods database sheet missing. Please initialize in spreadsheet.");
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

  // Format Unix timestamp as dd/mm/yyyy
  const formatDateDisplay = (timestamp: number) => {
    if (!timestamp) return "~";
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

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

          // Scale down if dimensions are huge
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
        
        // Auto compress
        const compressedBlob = await compressImage(file);
        const compressedFile = new File([compressedBlob], file.name, { type: "image/jpeg" });

        setUploadProgress(`Uploading photo ${i + 1} of ${files.length}: ${file.name}...`);
        
        const fileName = `dispose_goods/dispose_${Date.now()}_${compressedFile.name.replace(/\s+/g, "_")}`;
        const uploadRes = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(fileName)}`, {
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
      e.target.value = ""; // Clear file input
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
      String(p.SKU || "").toLowerCase().includes(q) ||
      String(p["Display Name"] || p.Display_Name || "").toLowerCase().includes(q)
    );
    setFilteredProducts(matches.slice(0, 10));
  }, [productQuery, products]);

  const addDisposeItem = (prod: any) => {
    // Check duplicate SKU
    if (formItems.some(item => item.sku === prod.SKU)) {
      showToast("Product is already added to the list.", "warning");
      return;
    }

    const newItem: DisposeItem = {
      sku: prod.SKU,
      qty: 1,
      cost: Number(prod.Cost) || 0
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

  // Open Form Panel for Add New
  const handleOpenAddForm = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    setEditingRecord(null);
    setFormDate(todayStr);
    setFormDisposeBy(profile?.name || profile?.email || "");
    setFormRemarks("");
    setFormItems([]);
    setFormPhotos([]);
    setView("form");
  };

  // Open Form Panel for Edit
  const handleOpenEditForm = (record: DisposeRecord) => {
    if (record.Reference) {
      showToast("Cannot edit a locked record.", "error");
      return;
    }

    // Convert epoch to YYYY-MM-DD
    const dateObj = new Date(record.Date);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    
    let parsedItems: DisposeItem[] = [];
    try {
      parsedItems = JSON.parse(record.Items || "[]");
    } catch (e) {}

    let parsedPhotos: string[] = [];
    try {
      parsedPhotos = JSON.parse(record.Proof || "[]");
    } catch (e) {}

    setEditingRecord(record);
    setFormDate(`${yyyy}-${mm}-${dd}`);
    setFormDisposeBy(record.Dispose_By || "");
    setFormRemarks(record.Remarks || "");
    setFormItems(parsedItems);
    setFormPhotos(parsedPhotos);
    setView("form");
  };

  // Save / Update record
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formItems.length === 0) {
      showToast("Please add at least one item to dispose.", "error");
      return;
    }

    const epochDate = new Date(formDate + "T00:00:00").getTime();
    const recordId = editingRecord ? editingRecord.ID : `disp_${Date.now()}`;
    
    const recordPayload: DisposeRecord = {
      ID: recordId,
      Date: epochDate,
      Reference: editingRecord ? editingRecord.Reference : "",
      Items: JSON.stringify(formItems),
      Cost: totalDisposalCost,
      Dispose_By: formDisposeBy,
      Remarks: formRemarks,
      Proof: JSON.stringify(formPhotos)
    };

    // Optimistic UI updates
    const originalRecords = [...records];
    let updatedRecords;
    if (editingRecord) {
      updatedRecords = records.map(r => r.ID === recordId ? recordPayload : r);
    } else {
      updatedRecords = [recordPayload, ...records];
    }

    setRecords(updatedRecords);
    localStorage.setItem("Dispose_Goods_data", JSON.stringify(updatedRecords));
    setView("list");

    // Silent background sync
    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Dispose_Goods",
          action: editingRecord ? "update" : "insert",
          data: recordPayload
        })
      });

      if (!res.ok) {
        throw new Error("Worker request failed");
      }
      
      loadData(); // Pull fresh database data
    } catch (err: any) {
      showToast("Failed to save changes. Rolling back.", "error");
      setRecords(originalRecords);
      localStorage.setItem("Dispose_Goods_data", JSON.stringify(originalRecords));
    }
  };

  // Delete Record
  const handleDeleteRecord = async (record: DisposeRecord) => {
    if (record.Reference) {
      showToast("Cannot delete a locked record.", "error");
      return;
    }

    if (!confirm("Are you sure you want to delete this disposal record?")) {
      return;
    }

    // Optimistic delete
    const originalRecords = [...records];
    const updatedRecords = records.filter(r => r.ID !== record.ID);
    
    setRecords(updatedRecords);
    localStorage.setItem("Dispose_Goods_data", JSON.stringify(updatedRecords));

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Dispose_Goods",
          action: "delete",
          data: { ID: record.ID }
        })
      });

      if (!res.ok) {
        throw new Error("Worker deletion request failed");
      }

      loadData();
    } catch (err: any) {
      showToast("Failed to delete record. Rolling back.", "error");
      setRecords(originalRecords);
      localStorage.setItem("Dispose_Goods_data", JSON.stringify(originalRecords));
    }
  };

  // Lock Action Modal Submit (Adds Reference number to lock)
  const handleLockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lockingRecord) return;
    if (!lockReference.trim()) {
      showToast("Please enter a valid Reference Number.", "error");
      return;
    }

    const targetRecord = { ...lockingRecord, Reference: lockReference.trim() };
    const originalRecords = [...records];
    const updatedRecords = records.map(r => r.ID === lockingRecord.ID ? targetRecord : r);

    setRecords(updatedRecords);
    localStorage.setItem("Dispose_Goods_data", JSON.stringify(updatedRecords));
    setIsLockOpen(false);
    setLockReference("");

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Dispose_Goods",
          action: "update",
          data: targetRecord
        })
      });

      if (!res.ok) {
        throw new Error("Worker locking failed");
      }

      loadData();
      showToast("Record successfully locked.", "success");
    } catch (err: any) {
      showToast("Failed to lock record. Rolling back.", "error");
      setRecords(originalRecords);
      localStorage.setItem("Dispose_Goods_data", JSON.stringify(originalRecords));
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
    
    let parsedItems: DisposeItem[] = [];
    try {
      parsedItems = JSON.parse(record.Items || "[]");
    } catch (e) {}

    let parsedPhotos: string[] = [];
    try {
      parsedPhotos = JSON.parse(record.Proof || "[]");
    } catch (e) {}

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
    doc.text(formatDateDisplay(record.Date), 55, 41);

    doc.setFont("helvetica", "bold");
    doc.text("Disposed By:", 15, 47);
    doc.setFont("helvetica", "normal");
    doc.text(record.Dispose_By || "~", 55, 47);

    doc.setFont("helvetica", "bold");
    doc.text("Remarks:", 15, 53);
    doc.setFont("helvetica", "normal");
    const wrappedRemarks = doc.splitTextToSize(record.Remarks || "~", 140);
    doc.text(wrappedRemarks, 55, 53);

    const remarksHeight = Math.max(1, wrappedRemarks.length) * 6;
    const costY = 53 + remarksHeight;

    doc.setFont("helvetica", "bold");
    doc.text("Total Disposal Cost:", 15, costY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 38, 38); // red-600
    doc.text(`$${Number(record.Cost || 0).toFixed(2)}`, 55, costY);

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

      // Page break check for table rows (ensure buffer for footer signature)
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

    let endY = currentY + 15;

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
        // Page break check for photo rows
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
      endY = photoY;
    }

    // Add Signature Lines to the bottom of EVERY page
    const totalPages = doc.getNumberOfPages();
    const sigY = 260; // Pinned to the bottom of page (A4 height is 297mm)

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
      doc.text(record.Dispose_By || "~", 15, sigY + 22);

      // Acknowledge By Signature Line
      doc.setFont("helvetica", "normal");
      doc.line(125, sigY + 12, 185, sigY + 12);
      doc.text("Acknowledge By", 125, sigY + 17);
    }

    // Output PDF Blob
    const blob = doc.output("blob");
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
  };

  // DataTable Column Definitions
  const columns: Column[] = React.useMemo(() => [
    {
      id: "actions",
      header: " ", // no label
      accessor: "actions"
    },
    {
      id: "Date",
      header: "Date",
      accessor: "Date"
    },
    {
      id: "Reference",
      header: "Reference",
      accessor: "Reference"
    },
    {
      id: "Items",
      header: "Dispose Items",
      accessor: "Items"
    },
    {
      id: "Cost",
      header: "Dispose Cost",
      accessor: "Cost"
    },
    {
      id: "Dispose_By",
      header: "Dispose By",
      accessor: "Dispose_By"
    },
    {
      id: "Remarks",
      header: "Remarks",
      accessor: "Remarks"
    },
    {
      id: "Proof",
      header: "Proof",
      accessor: "Proof"
    }
  ], []);

  // Map Dispose records to DataTable compatible data list
  const tableData = React.useMemo(() => {
    return records.map((record) => {
      // 1. Parse items
      let parsedItems: DisposeItem[] = [];
      try {
        parsedItems = JSON.parse(record.Items || "[]");
      } catch (e) {}

      // 2. Parse photos
      let parsedPhotos: string[] = [];
      try {
        parsedPhotos = JSON.parse(record.Proof || "[]");
      } catch (e) {}

      // 3. Render Badges list
      const itemsBadgeList = (
        <div className="flex flex-wrap gap-1 max-w-[280px] overflow-x-auto py-1">
          {parsedItems.map((item, idx) => (
            <span 
              key={idx} 
              className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200 select-none whitespace-nowrap"
              title={lookupProductName(item.sku)}
            >
              {item.sku} ({item.qty})
            </span>
          ))}
          {parsedItems.length === 0 && <span className="text-[10px] text-zinc-400 italic">No Items</span>}
        </div>
      );

      // 4. Render Photo Viewer Trigger
      const photoViewerButton = (
        <div className="flex items-center">
          {parsedPhotos.length > 0 ? (
            <button
              onClick={() => {
                setActivePhotoList(parsedPhotos);
                setActivePhotoIdx(0);
              }}
              className="h-[22px] px-2 bg-white hover:bg-zinc-50 border border-zinc-200 rounded text-[10px] font-bold text-zinc-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Browse proof images"
            >
              <ImageIcon size={11} className="text-zinc-500" />
              <span>{parsedPhotos.length}</span>
            </button>
          ) : (
            <span className="text-[10px] text-zinc-400 italic">No Proof</span>
          )}
        </div>
      );

      // 5. Render custom Actions column
      const customActions = (
        <div className="flex items-center gap-1.5 justify-end whitespace-nowrap min-w-[155px]">
          {record.Reference ? (
            <>
              {/* Locked actions */}
              <button
                onClick={() => handlePrintProof(record)}
                className="h-[22px] px-2 bg-[#EEEEEE] hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-zinc-300 shadow-sm transition-colors cursor-pointer flex items-center gap-1 focus:outline-none text-[10px] font-bold rounded"
                title="Print proof document"
              >
                <Printer size={11} className="stroke-[2.5]" />
                <span>Print</span>
              </button>
              <div title="This record is locked because a reference number is uploaded.">
                <Lock size={13} className="text-zinc-400 ml-1" />
              </div>
            </>
          ) : (
            <>
              {/* Draft actions */}
              <button
                onClick={() => handleOpenEditForm(record)}
                className="p-1 rounded bg-[#EEEEEE] hover:bg-[#E5E5E5] text-zinc-650 hover:text-zinc-950 border border-zinc-300/85 shadow-xs transition-colors cursor-pointer flex items-center justify-center focus:outline-none"
                title="Edit record"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => {
                  setLockingRecord(record);
                  setLockReference("");
                  setIsLockOpen(true);
                }}
                className="p-1 rounded bg-[#EEEEEE] hover:bg-amber-50 text-amber-600 hover:text-amber-700 border border-zinc-300/85 shadow-xs transition-colors cursor-pointer flex items-center justify-center focus:outline-none"
                title="Enter reference number to lock"
              >
                <Lock size={12} />
              </button>
              <button
                onClick={() => handlePrintProof(record)}
                className="h-[22px] px-2 bg-[#EEEEEE] hover:bg-blue-50 text-blue-600 hover:text-blue-700 border border-zinc-300 shadow-sm transition-colors cursor-pointer flex items-center gap-1 focus:outline-none text-[10px] font-bold rounded"
                title="Print proof document"
              >
                <Printer size={11} className="stroke-[2.5]" />
                <span>Print</span>
              </button>
              <button
                onClick={() => handleDeleteRecord(record)}
                className="p-1 rounded bg-[#EEEEEE] hover:bg-red-50 text-red-600 hover:text-red-700 border border-zinc-300/85 shadow-xs transition-colors cursor-pointer flex items-center justify-center focus:outline-none"
                title="Delete record"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      );

      // Simple text representation for search/export filters
      const itemsRawStr = parsedItems.map(item => `${item.sku} (${item.qty})`).join(", ");

      return {
        ...record,
        isLocked: !!record.Reference,
        
        // Custom Render JSX elements
        actions: customActions,
        Date: formatDateDisplay(record.Date),
        Reference: record.Reference || "~",
        Items: itemsBadgeList,
        Cost: `$${Number(record.Cost || 0).toFixed(2)}`,
        Dispose_By: record.Dispose_By || "~",
        Remarks: record.Remarks || "~",
        Proof: photoViewerButton,

        // Raw plain-text properties for search filters
        actions_raw: record.Reference ? "locked" : "draft",
        Date_raw: formatDateDisplay(record.Date),
        Reference_raw: record.Reference || "",
        Items_raw: itemsRawStr,
        Cost_raw: String(record.Cost),
        Dispose_By_raw: record.Dispose_By || "",
        Remarks_raw: record.Remarks || "",
        Proof_raw: `${parsedPhotos.length} photos`
      };
    });
  }, [records, lookupProductName]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden select-none font-primary gap-[10px]">
      
      {view === "list" ? (
        <>
          {/* Header Controls */}
          <div className="content-header flex justify-between items-center px-1 border-b border-zinc-300/40 pb-4 shrink-0">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-zinc-955">Dispose Goods Portal</h2>
              <p className="text-sm text-zinc-500">Record, lock, and print proof documents for disposed inventory assets.</p>
            </div>
            <CustomButton
              onClick={handleOpenAddForm}
              className="bg-[#0B57D0] text-white border-transparent hover:bg-[#0842A0] rounded px-4 shadow-sm"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Add New Record</span>
            </CustomButton>
          </div>

          {/* Main Table Body */}
          <div className="content-body flex-1 overflow-hidden flex flex-col">
            <DataTable
              columns={columns}
              data={tableData}
              title="Dispose Goods List"
              fetching={fetching}
              height="h-[calc(100vh-220px)]"
            />
          </div>
        </>
      ) : (
        /* Full Page Form View */
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          
          {/* Header */}
          <div className="content-header flex justify-between items-center px-1 border-b border-zinc-300/40 pb-4 shrink-0">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-zinc-955">
                {editingRecord ? "Edit Disposal Record" : "Add Disposal Record"}
              </h2>
              <p className="text-sm text-zinc-500">
                {editingRecord ? "Modify the fields and items of the disposal record below." : "Create a new disposal log by searching and adding items."}
              </p>
            </div>
            <CustomButton
              onClick={() => setView("list")}
              className="bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded px-4"
            >
              Back to List
            </CustomButton>
          </div>

          {/* Form Container */}
          <div className="content-body flex-1 flex flex-col mt-2 max-w-[1440px] mx-auto w-full">
            <form onSubmit={handleSaveRecord} className="flex flex-col flex-1 h-[calc(100vh-220px)] bg-white border border-zinc-200 rounded relative shadow-sm overflow-hidden">
              
              {/* Form Scrollable Grid Body */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 overflow-y-auto p-5">
                
                {/* Left Column: Metadata & Photo Proofs */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  
                  {/* Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Disposal Date</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full text-xs bg-white border border-zinc-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-500 font-semibold"
                    />
                  </div>

                  {/* Disposed By */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Disposed By</label>
                    <input
                      type="text"
                      required
                      value={formDisposeBy}
                      onChange={(e) => setFormDisposeBy(e.target.value)}
                      placeholder="Enter employee name or email"
                      className="w-full text-xs bg-white border border-zinc-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-500 font-semibold"
                    />
                  </div>

                  {/* Remarks */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Remarks / Notes</label>
                    <textarea
                      value={formRemarks}
                      onChange={(e) => setFormRemarks(e.target.value)}
                      placeholder="Reason for disposal, discard details, etc."
                      rows={3}
                      className="w-full text-xs bg-white border border-zinc-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-500 font-semibold resize-none"
                    />
                  </div>

                  {/* Photo Proof Upload Section */}
                  <div className="border border-zinc-200 rounded p-3 bg-zinc-50/50 flex flex-col gap-2.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-zinc-755 uppercase tracking-wider">Proof Photos (Max 10)</label>
                      <span className="text-[10px] font-bold text-zinc-500">{formPhotos.length}/10 uploaded</span>
                    </div>

                    <div className="flex items-center justify-center border border-dashed border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors p-4 relative cursor-pointer group">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploading || formPhotos.length >= 10}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <ImageIcon className="w-7 h-7 text-zinc-400 group-hover:text-zinc-650 transition-colors" />
                        <span className="text-xs font-bold text-zinc-600">Click to upload photos</span>
                        <span className="text-[9.5px] text-zinc-400">Photos are auto-compressed to keep file sizes under 100KB</span>
                      </div>
                    </div>

                    {/* Uploaded Photos Grid */}
                    {formPhotos.length > 0 && (
                      <div className="grid grid-cols-5 gap-2 mt-2">
                        {formPhotos.map((url, idx) => (
                          <div key={idx} className="relative aspect-square border border-zinc-200 rounded overflow-hidden bg-zinc-100 group shadow-xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="Proof" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removePhoto(idx)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 transition-colors cursor-pointer"
                            >
                              <X size={10} className="stroke-[3]" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Column: Items List Form Builder */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  
                  {/* Items Section */}
                  <div className="border border-zinc-200 rounded p-3 bg-zinc-50/50 flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-zinc-750 uppercase tracking-wider">Disposal Items</label>
                      <span className="text-[10px] font-bold text-zinc-500">Total: {formItems.length} items</span>
                    </div>

                    {/* Autocomplete Input */}
                    <div className="relative">
                      <div className="flex items-center bg-white border border-zinc-200 rounded px-2.5 py-1.5 shadow-xs">
                        <Search size={13} className="text-zinc-400 mr-2" />
                        <input
                          type="text"
                          placeholder="Search product SKU or name to add..."
                          value={productQuery}
                          onChange={(e) => {
                            setProductQuery(e.target.value);
                            setShowProductDropdown(true);
                          }}
                          onFocus={() => setShowProductDropdown(true)}
                          className="w-full text-xs bg-transparent border-none outline-none font-semibold text-zinc-900"
                        />
                        {productQuery && (
                          <button type="button" onClick={() => setProductQuery("")} className="text-zinc-400 hover:text-zinc-700">
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Autocomplete Results Dropdown */}
                      {showProductDropdown && filteredProducts.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded shadow-lg max-h-48 overflow-y-auto z-10">
                          {filteredProducts.map((p) => (
                            <div
                              key={p.SKU}
                              onClick={() => addDisposeItem(p)}
                              className="px-3 py-2 text-xs hover:bg-zinc-100 cursor-pointer flex justify-between items-center border-b border-zinc-100 last:border-0"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-zinc-800">{p.SKU}</span>
                                <span className="text-[10px] text-zinc-500 font-semibold">{p["Display Name"] || p.Display_Name || p.Name}</span>
                              </div>
                              <span className="text-[10px] font-bold text-[#0B57D0]">${Number(p.Cost || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {showProductDropdown && productQuery.trim() && filteredProducts.length === 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-zinc-200 rounded shadow-lg p-3 text-center text-xs text-zinc-400 italic z-10">
                          No matching products found
                        </div>
                      )}
                    </div>

                    {/* Items List Table */}
                    {formItems.length > 0 ? (
                      <div className="border border-zinc-200 rounded overflow-hidden bg-white max-h-[380px] overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-100 border-b border-zinc-200 font-bold text-zinc-650 text-[10px] uppercase">
                              <th className="p-2">SKU</th>
                              <th className="p-2 w-16 text-center">Qty</th>
                              <th className="p-2 w-20 text-right">Cost</th>
                              <th className="p-2 w-10"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {formItems.map((item) => (
                              <tr key={item.sku} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                                <td className="p-2">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-zinc-800 leading-tight">{item.sku}</span>
                                    <span className="text-[9.5px] text-zinc-500 font-semibold truncate max-w-[280px] leading-tight mt-0.5" title={lookupProductName(item.sku)}>
                                      {lookupProductName(item.sku)}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="number"
                                    min={1}
                                    value={item.qty}
                                    onChange={(e) => updateItemQty(item.sku, parseInt(e.target.value) || 1)}
                                    className="w-12 text-center text-xs bg-white border border-zinc-200 rounded py-0.5 outline-none font-bold text-zinc-800"
                                  />
                                </td>
                                <td className="p-2 text-right">
                                  <div className="flex items-center justify-end gap-0.5">
                                    <span className="text-zinc-400 font-semibold">$</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min={0}
                                      value={item.cost}
                                      onChange={(e) => updateItemCost(item.sku, parseFloat(e.target.value) || 0)}
                                      className="w-16 text-right text-xs bg-white border border-zinc-200 rounded py-0.5 px-1 outline-none font-bold text-zinc-800"
                                    />
                                  </div>
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeDisposeItem(item.sku)}
                                    className="text-red-500 hover:text-red-750 cursor-pointer p-0.5"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-xs text-zinc-400 italic bg-white border border-zinc-200 rounded">
                        No items added yet. Search and select a product to begin.
                      </div>
                    )}

                    {/* Summary Cost */}
                    {formItems.length > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-200 px-1 font-bold">
                        <span className="text-xs text-zinc-700">Total Disposal Cost:</span>
                        <span className="text-sm text-red-600">${totalDisposalCost.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* Sticky Footer Buttons */}
              <div className="px-5 py-3.5 border-t border-zinc-200 bg-zinc-50 flex gap-2.5 justify-end shrink-0">
                <CustomButton
                  type="button"
                  onClick={() => setView("list")}
                  className="bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded px-4"
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  onClick={handleSaveRecord}
                  className="bg-[#0B57D0] text-white border-transparent hover:bg-[#0842A0] rounded px-4 shadow-sm"
                >
                  Save Disposal
                </CustomButton>
              </div>

              {/* Upload progress overlay inside form card */}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 text-white rounded">
                  <div className="flex flex-col items-center gap-3.5 max-w-xs px-6 text-center animate-pulse">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                    <span className="text-xs font-bold leading-normal">{uploadProgress}</span>
                    <p className="text-[10px] text-zinc-350">Uploading and saving photo evidence. Please wait.</p>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* Lock Reference Dialog Modal */}
      {isLockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <form onSubmit={handleLockSubmit} className="bg-white border border-zinc-300 w-96 rounded p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle size={16} />
              <h3 className="text-sm font-bold uppercase tracking-wider">Lock Disposal Record</h3>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
              Entering a reference number will lock this record. Once locked, you will no longer be able to edit or delete it.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">Reference Number</label>
              <input
                type="text"
                required
                value={lockReference}
                onChange={(e) => setLockReference(e.target.value)}
                placeholder="e.g. REF-2026-0041"
                className="w-full text-xs bg-white border border-zinc-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-500 font-semibold"
              />
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <CustomButton
                type="button"
                onClick={() => {
                  setIsLockOpen(false);
                  setLockingRecord(null);
                  setLockReference("");
                }}
                className="bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50 rounded px-3 py-1.5"
              >
                Cancel
              </CustomButton>
              <CustomButton
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white border-transparent rounded px-4 py-1.5 shadow-sm"
              >
                Confirm Lock
              </CustomButton>
            </div>
          </form>
        </div>
      )}

      {/* Photo Browser Lightbox Modal */}
      {activePhotoList && activePhotoList.length > 0 && (
        <div 
          onClick={() => setActivePhotoList(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xs select-none"
        >
          <button 
            onClick={() => setActivePhotoList(null)}
            className="absolute top-5 right-5 text-white/60 hover:text-white p-2 cursor-pointer focus:outline-none"
          >
            <X size={24} />
          </button>

          {/* Carousel Body */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[80vh] flex flex-col items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={activePhotoList[activePhotoIdx]} 
              alt="Proof Lightbox" 
              className="max-w-full max-h-[70vh] object-contain border border-white/10 rounded shadow-2xl"
            />

            {/* Pagination Controls */}
            {activePhotoList.length > 1 && (
              <div className="flex gap-4 items-center justify-center mt-4">
                <button
                  onClick={() => setActivePhotoIdx(prev => (prev - 1 + activePhotoList.length) % activePhotoList.length)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  Prev
                </button>
                <span className="text-white/80 text-xs font-semibold">
                  {activePhotoIdx + 1} of {activePhotoList.length}
                </span>
                <button
                  onClick={() => setActivePhotoIdx(prev => (prev + 1) % activePhotoList.length)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
