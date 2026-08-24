"use client";

import * as React from "react";
import { CustomButton } from "../custom-button";
import { NavigationTabs, TabItem } from "../navigation-tabs";
import { ConfirmDialog } from "../confirm-dialog";
import { showToast } from "@/lib/toast";
import { loadScript, loadStyle } from "@/lib/script-loader";
import { UserProfile } from "@/lib/api";
import { canEditModule, canDeleteModule } from "@/lib/permissions";
import {
  FileText,
  Plus,
  X,
  Trash2,
  Loader2,
  Upload,
  Printer,
  Edit,
  CheckCircle2,
  Archive,
  Search,
  RefreshCw,
  Calendar,
  Save,
  Check,
  AlertCircle,
  Eye,
  FileCheck,
  Download,
  CreditCard,
  Ban,
  Clock,
  Send,
  UserCheck,
  Layers,
  RotateCw,
  RotateCcw
} from "lucide-react";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";
const GST_RATE = 0.09;

interface ClaimRow {
  id: number;
  desc: string;
  amt: string;
  type: "EXCL" | "INCL" | "NONE";
  remark: string;
}

interface ReceiptImage {
  src: string;
  name: string;
  url?: string;
  file_key?: string;
  extracted: boolean;
  type: string;
}

interface ClaimRecord {
  id: string;
  user_email: string;
  user_name?: string;
  company_name: string;
  project_department: string;
  employee_name: string;
  position: string;
  claim_date: string;
  claim_rows: ClaimRow[];
  receipts: ReceiptImage[];
  total_before_gst: number | string;
  gst_amount: number | string;
  total_amount: number | string;
  status: "active" | "completed";
  created_at: number;
  updated_at: number;
}

interface OperatorBatch {
  id: string;
  user_email: string;
  user_name: string;
  employee_id?: string;
  employee_name?: string;
  employee_role?: string;
  paynow_number?: string;
  target_admin_email?: string;
  target_admin_name?: string;
  claim_date: string;
  expense_ids: string[];
  items: Array<{
    id: string;
    date: string;
    description: string;
    amount: number | string;
    project_department?: string;
    remarks?: string;
    receipt_name?: string;
    receipt_url: string;
  }>;
  total_amount: number | string;
  status: "pending" | "paid" | "rejected" | "claimed_to_finance";
  approved_by?: string;
  approved_at?: number;
  payment_reference?: string;
  reject_reason?: string;
  created_at: number;
}

interface FinanceClaimsModuleProps {
  profile?: UserProfile | null;
}

function formatCleanPayNow(val?: string): string {
  if (!val) return "";
  let clean = val.trim().replace(/[\s-]/g, "");
  if (clean.startsWith("+65")) {
    clean = clean.substring(3);
  } else if (clean.startsWith("65") && clean.length === 10) {
    clean = clean.substring(2);
  }
  return clean;
}

function formatDateDisplay(dStr?: string): string {
  if (!dStr) return "";
  if (dStr.includes("-")) {
    const parts = dStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dStr;
}

export function FinanceClaimsModule({ profile }: FinanceClaimsModuleProps) {
  const [activeTab, setActiveTab] = React.useState<"form" | "staff_approvals" | "finance_claims" | "archived_claims">("form");
  const [scriptsReady, setScriptsReady] = React.useState(false);

  const canEdit = canEditModule(profile, "Finance Claims") || canEditModule(profile, "Claim Form Generator");
  const canDelete = canDeleteModule(profile, "Finance Claims") || canDeleteModule(profile, "Claim Form Generator");
  const isAdmin = profile?.role === "Administrator";

  // Form Fields State
  const [editingClaimId, setEditingClaimId] = React.useState<string | null>(null);
  const [company, setCompany] = React.useState("HSG Global Pte. Ltd.");
  const [project, setProject] = React.useState("");
  const [employeeName, setEmployeeName] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [claimDate, setClaimDate] = React.useState("");
  const [importedBatchIds, setImportedBatchIds] = React.useState<string[]>([]);

  const [receiptImages, setReceiptImages] = React.useState<ReceiptImage[]>([]);
  const [claimRows, setClaimRows] = React.useState<ClaimRow[]>([
    { id: 1, desc: "", amt: "", type: "EXCL", remark: "" },
  ]);

  // Cropper states
  const [showCropModal, setShowCropModal] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState("");
  const [cropFileName, setCropFileName] = React.useState("");
  const [cropFileType, setCropFileType] = React.useState("");
  const [baseRotation, setBaseRotation] = React.useState(0);
  const [fineRotation, setFineRotation] = React.useState(0);

  // Database Records State
  const [claims, setClaims] = React.useState<ClaimRecord[]>([]);
  const [staffBatches, setStaffBatches] = React.useState<OperatorBatch[]>([]);
  const [paidStaffClaims, setPaidStaffClaims] = React.useState<OperatorBatch[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Loading and PDF compilation states
  const [isScanningIndex, setIsScanningIndex] = React.useState<number | null>(null);
  const [isSavingClaim, setIsSavingClaim] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [printingClaim, setPrintingClaim] = React.useState<ClaimRecord | null>(null);

  // Modals
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [selectedImportBatchIds, setSelectedImportBatchIds] = React.useState<Set<string>>(new Set());
  const [approvingBatch, setApprovingBatch] = React.useState<OperatorBatch | null>(null);
  const [paynowRefInput, setPaynowRefInput] = React.useState("");
  const [rejectingBatch, setRejectingBatch] = React.useState<OperatorBatch | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = React.useState("");
  const [previewingReceiptUrl, setPreviewingReceiptUrl] = React.useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant?: "danger" | "dark" | "default";
    onConfirm: () => void;
  } | null>(null);

  // DOM Refs
  const cropperRef = React.useRef<any>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const isDraftLoadedRef = React.useRef(false);

  const page1Ref = React.useRef<HTMLDivElement>(null);
  const page2Ref = React.useRef<HTMLDivElement>(null);

  const userEmail = (profile?.email || "default_user").toLowerCase().trim();
  const draftKey = `finance_claim_draft_${userEmail}`;

  // 1. Set default date & load scripts on mount
  React.useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setClaimDate(today);
  }, []);

  React.useEffect(() => {
    async function initScripts() {
      try {
        await loadStyle("https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
        await loadScript("https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.8/dist/html2canvas-pro.min.js");

        if (
          typeof window !== "undefined" &&
          (window as any).jspdf &&
          (window as any).html2canvas &&
          (window as any).Cropper
        ) {
          setScriptsReady(true);
        } else {
          showToast("Failed to initialize claim compiler libraries", "error");
        }
      } catch (err: any) {
        showToast("Error loading claim compiler scripts: " + err.message, "error");
      }
    }
    initScripts();
  }, []);

  // 2. Load Local Draft on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed) {
          if (parsed.company !== undefined) setCompany(parsed.company);
          if (parsed.project !== undefined) setProject(parsed.project);
          if (parsed.employeeName !== undefined) setEmployeeName(parsed.employeeName);
          if (parsed.position !== undefined) setPosition(parsed.position);
          if (parsed.claimDate !== undefined) setClaimDate(parsed.claimDate);
          if (Array.isArray(parsed.claimRows) && parsed.claimRows.length > 0) setClaimRows(parsed.claimRows);
          if (Array.isArray(parsed.receiptImages)) setReceiptImages(parsed.receiptImages);
          if (Array.isArray(parsed.importedBatchIds)) setImportedBatchIds(parsed.importedBatchIds);
        }
      } else if (profile?.name && !employeeName) {
        setEmployeeName(profile.name);
      }
    } catch (e) {
      console.warn("Failed to load local finance claim draft:", e);
    } finally {
      isDraftLoadedRef.current = true;
    }
  }, [draftKey, profile]);

  // 3. Auto-save Local Draft on Form Changes
  React.useEffect(() => {
    if (typeof window === "undefined" || !isDraftLoadedRef.current) return;
    if (editingClaimId) return;

    const draftData = {
      company,
      project,
      employeeName,
      position,
      claimDate,
      claimRows,
      receiptImages,
      importedBatchIds
    };

    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    } catch (e) {
      console.warn("Failed to auto-save finance claim draft:", e);
    }
  }, [draftKey, editingClaimId, company, project, employeeName, position, claimDate, claimRows, receiptImages, importedBatchIds]);

  // 4. Fetch Claims and Staff Batches from Backend
  const loadData = React.useCallback(async () => {
    setLoadingData(true);
    try {
      // Fetch official finance claims for current user
      if (userEmail) {
        const res = await fetch(`${WORKER_URL}/api/claims?email=${encodeURIComponent(userEmail)}`);
        if (res.ok) {
          const data = (await res.json()) as ClaimRecord[];
          setClaims(Array.isArray(data) ? data : []);
        }
      }

      // Fetch all staff batches for review
      const batchRes = await fetch(`${WORKER_URL}/api/claims/operator/batches?all=true`);
      if (batchRes.ok) {
        const batchData = (await batchRes.json()) as OperatorBatch[];
        setStaffBatches(Array.isArray(batchData) ? batchData : []);
      }

      // Fetch paid staff claims available for finance import
      const paidRes = await fetch(`${WORKER_URL}/api/claims/operator/paid-unclaimed`);
      if (paidRes.ok) {
        const paidData = (await paidRes.json()) as OperatorBatch[];
        setPaidStaffClaims(Array.isArray(paidData) ? paidData : []);
      }
    } catch (err: any) {
      console.error("Failed to load claims data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [userEmail]);

  React.useEffect(() => {
    loadData();
    const handleGlobalRefresh = () => {
      loadData();
    };
    window.addEventListener("db-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("db-refresh", handleGlobalRefresh);
  }, [loadData]);

  // Reset form and clear local draft
  const handleResetForm = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch (_) {}

    setEditingClaimId(null);
    setCompany("HSG Global Pte. Ltd.");
    setProject("");
    setEmployeeName(profile?.name || "");
    setPosition("");
    setClaimDate(new Date().toISOString().split("T")[0]);
    setReceiptImages([]);
    setImportedBatchIds([]);
    setClaimRows([{ id: 1, desc: "", amt: "", type: "EXCL", remark: "" }]);
    showToast("Form fields reset to default.", "info");
  };

  // Add Item Row
  const handleAddClaimRow = () => {
    if (claimRows.length >= 8) {
      showToast("Maximum of 8 items allowed per claim form layout.", "warning");
      return;
    }
    const maxId = claimRows.length > 0 ? Math.max(...claimRows.map((r) => r.id)) : 0;
    setClaimRows([
      ...claimRows,
      { id: maxId + 1, desc: "", amt: "", type: "EXCL", remark: "" },
    ]);
  };

  const handleRemoveClaimRow = (id: number) => {
    if (claimRows.length === 1) {
      setClaimRows([{ id: 1, desc: "", amt: "", type: "EXCL", remark: "" }]);
    } else {
      setClaimRows(claimRows.filter((r) => r.id !== id));
    }
  };

  const handleRowChange = (id: number, field: keyof ClaimRow, value: any) => {
    setClaimRows(
      claimRows.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  // Upload handler for receipt
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (receiptImages.length >= 8) {
      showToast("Maximum of 8 documents allowed.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropSrc(event.target.result as string);
        setCropFileName(file.name);
        setCropFileType(file.type || "image/jpeg");
        setBaseRotation(0);
        setFineRotation(0);
        setShowCropModal(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Instantiate Cropper
  React.useEffect(() => {
    if (showCropModal && imageRef.current && (window as any).Cropper) {
      const Cropper = (window as any).Cropper;
      if (cropperRef.current) cropperRef.current.destroy();

      cropperRef.current = new Cropper(imageRef.current, {
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 0.9,
        restore: false,
        guides: true,
        center: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        aspectRatio: NaN
      });
    }

    return () => {
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
    };
  }, [showCropModal, cropSrc]);

  const applyCrop = () => {
    if (!cropperRef.current) return;
    const canvas = cropperRef.current.getCroppedCanvas({ maxWidth: 1024, maxHeight: 1024 });
    const croppedSrc = canvas.toDataURL(cropFileType || "image/jpeg");

    setReceiptImages([
      ...receiptImages,
      { src: croppedSrc, name: cropFileName, extracted: false, type: cropFileType || "image/jpeg" },
    ]);
    setShowCropModal(false);
    showToast("Receipt document cropped and added!", "success");
  };

  const deleteReceipt = (index: number) => {
    setReceiptImages(receiptImages.filter((_, idx) => idx !== index));
  };

  // AI OCR Scanning
  const triggerExtraction = async (idx: number) => {
    const file = receiptImages[idx];
    setIsScanningIndex(idx);

    try {
      let base64Data = "";
      if (file.src && file.src.includes(",")) {
        base64Data = file.src.split(",")[1];
      } else if (file.url) {
        const imgRes = await fetch(file.url);
        const blob = await imgRes.blob();
        const reader = new FileReader();
        base64Data = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res.split(",")[1]);
          };
          reader.readAsDataURL(blob);
        });
      }

      if (!base64Data) throw new Error("Receipt image data is not available for OCR scan");

      const response = await fetch(`${WORKER_URL}/api/admin/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Data,
          type: file.type || "image/jpeg",
        }),
      });

      if (!response.ok) throw new Error("OCR scanner error");
      const res = await response.json();
      if (!res.success) throw new Error(res.error || "Failed to scan receipt");
      const data = res.data;

      const updated = receiptImages.map((img, i) => (i === idx ? { ...img, extracted: true } : img));
      setReceiptImages(updated);

      const maxId = claimRows.length > 0 ? Math.max(...claimRows.map((r) => r.id)) : 0;
      const newRow: ClaimRow = {
        id: maxId + 1,
        desc: data.merchant || "RECEIPT CHARGES",
        amt: (parseFloat(data.total) || 0.0).toFixed(2),
        type: data.is_gst ? "INCL" : "EXCL",
        remark: "",
      };

      if (claimRows.length === 1 && claimRows[0].desc === "" && claimRows[0].amt === "") {
        setClaimRows([newRow]);
      } else {
        setClaimRows([...claimRows, newRow]);
      }

      showToast("Receipt data parsed successfully!", "success");
    } catch (err: any) {
      showToast("OCR Scanner failed. Please check System Settings.", "error");
    } finally {
      setIsScanningIndex(null);
    }
  };

  // Calculations
  const calculateTotals = () => {
    let b = 0, g = 0, t = 0;
    claimRows.forEach((row) => {
      const amt = parseFloat(row.amt) || 0;
      const gst =
        row.type === "EXCL"
          ? amt * GST_RATE
          : row.type === "INCL"
          ? amt - amt / (1 + GST_RATE)
          : 0;
      const before = row.type === "EXCL" ? amt : amt - gst;
      const total = row.type === "EXCL" ? amt + gst : amt;

      b += before;
      g += gst;
      t += total;
    });

    return {
      before: b.toFixed(2),
      gst: g.toFixed(2),
      total: t.toFixed(2),
    };
  };

  const totals = calculateTotals();

  // Save Claim to Supabase
  const handleSaveClaim = async () => {
    if (!canEdit) {
      showToast("⚠️ You have read-only access to this module.", "warning");
      return;
    }

    if (!company.trim() || !project.trim() || !employeeName.trim() || !position.trim() || !claimDate) {
      showToast("Please complete all required claim details.", "warning");
      return;
    }

    const validRows = claimRows.filter((r) => r.desc.trim() !== "" && parseFloat(r.amt) > 0);
    if (validRows.length === 0) {
      showToast("Please enter at least one valid claim item.", "warning");
      return;
    }

    setIsSavingClaim(true);
    try {
      const payload = {
        id: editingClaimId || undefined,
        user_email: userEmail,
        user_name: profile?.name || employeeName,
        company_name: company.trim(),
        project_department: project.trim(),
        employee_name: employeeName.trim(),
        position: position.trim(),
        claim_date: claimDate,
        claim_rows: claimRows,
        receipts: receiptImages.map((rc) => ({
          name: rc.name,
          src: rc.src && rc.src.startsWith("data:") ? rc.src : undefined,
          url: rc.url || (!rc.src.startsWith("data:") ? rc.src : undefined),
          file_key: rc.file_key,
          extracted: rc.extracted,
          type: rc.type || "image/jpeg"
        })),
        total_before_gst: totals.before,
        gst_amount: totals.gst,
        total_amount: totals.total,
        status: "active",
        imported_batch_ids: importedBatchIds
      };

      const res = await fetch(`${WORKER_URL}/api/claims/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());

      try {
        localStorage.removeItem(draftKey);
      } catch (_) {}

      showToast(
        editingClaimId ? "Finance claim report updated successfully!" : "Finance claim report compiled and saved!",
        "success"
      );

      setEditingClaimId(null);
      handleResetForm();
      loadData();
      setActiveTab("finance_claims");
    } catch (err: any) {
      console.error("Save claim error:", err);
      showToast("Failed to save claim: " + err.message, "error");
    } finally {
      setIsSavingClaim(false);
    }
  };

  // Import Paid Staff Claims into Form
  const handleImportStaffClaims = () => {
    if (selectedImportBatchIds.size === 0) {
      showToast("Please select at least 1 paid claim batch to import.", "warning");
      return;
    }

    const batchesToImport = paidStaffClaims.filter((b) => selectedImportBatchIds.has(b.id));
    const newRows: ClaimRow[] = [];
    const newReceipts: ReceiptImage[] = [...receiptImages];
    const importedIds: string[] = [...importedBatchIds];

    let maxId = claimRows.length > 0 && claimRows[0].desc ? Math.max(...claimRows.map((r) => r.id)) : 0;
    let existingRows = claimRows.length === 1 && !claimRows[0].desc ? [] : [...claimRows];

    batchesToImport.forEach((b) => {
      importedIds.push(b.id);
      (b.items || []).forEach((item) => {
        if (existingRows.length + newRows.length < 8) {
          maxId += 1;
          newRows.push({
            id: maxId,
            desc: `${item.description} (${b.employee_name || "Staff"})`,
            amt: Number(item.amount || 0).toFixed(2),
            type: "EXCL",
            remark: item.project_department ? `Project: ${item.project_department}` : ""
          });

          if (item.receipt_url && newReceipts.length < 8) {
            newReceipts.push({
              name: item.receipt_name || `${b.employee_name}_receipt.jpg`,
              src: item.receipt_url,
              url: item.receipt_url,
              extracted: false,
              type: "image/jpeg"
            });
          }
        }
      });
    });

    setClaimRows([...existingRows, ...newRows]);
    setReceiptImages(newReceipts);
    setImportedBatchIds(importedIds);
    setShowImportModal(false);
    setSelectedImportBatchIds(new Set());
    showToast(`Imported ${newRows.length} expense item(s) and receipt proofs into form!`, "success");
  };

  // Approve Staff Batch Payout
  const handleApproveBatch = async () => {
    if (!approvingBatch) return;

    try {
      const res = await fetch(`${WORKER_URL}/api/claims/operator/batch/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: approvingBatch.id,
          approved_by: profile?.name || profile?.email || "Supervisor",
          payment_reference: paynowRefInput.trim()
        })
      });

      if (!res.ok) throw new Error(await res.text());

      showToast(`Batch ${approvingBatch.id} marked as Paid via PayNow!`, "success");
      setApprovingBatch(null);
      setPaynowRefInput("");
      loadData();
    } catch (err: any) {
      showToast("Approval failed: " + err.message, "error");
    }
  };

  // Reject Staff Batch
  const handleRejectBatch = async () => {
    if (!rejectingBatch) return;

    try {
      const res = await fetch(`${WORKER_URL}/api/claims/operator/batch/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rejectingBatch.id,
          approved_by: profile?.name || profile?.email || "Supervisor",
          reject_reason: rejectReasonInput.trim() || "Receipt or particulars require review"
        })
      });

      if (!res.ok) throw new Error(await res.text());

      showToast(`Batch ${rejectingBatch.id} rejected. Expenses unlocked for operator.`, "info");
      setRejectingBatch(null);
      setRejectReasonInput("");
      loadData();
    } catch (err: any) {
      showToast("Rejection failed: " + err.message, "error");
    }
  };

  // Print PDF Trigger
  const handleGeneratePDF = async (recordToPrint?: ClaimRecord) => {
    const newTab = window.open("about:blank", "_blank");
    if (!newTab) {
      showToast("Please allow popups to preview the PDF in a new tab.", "warning");
      return;
    }

    newTab.document.write(`
      <title>Generating PDF...</title>
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f8fafc; color: #475569;">
          <div style="width: 48px; height: 48px; border: 4px solid #e2e8f0; border-top: 4px solid #0B57D0; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px;"></div>
          <span style="font-size: 14px; font-weight: 600; letter-spacing: -0.2px;">Assembling high-fidelity claim report...</span>
          <p style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Rendering Vector Print Layers</p>
          <style>
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
      </div>
    `);

    if (recordToPrint) setPrintingClaim(recordToPrint);
    else setPrintingClaim(null);

    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const { jsPDF } = (window as any).jspdf;
      const html2canvas = (window as any).html2canvas;

      const doc = new jsPDF("p", "mm", "a4");

      if (!page1Ref.current) throw new Error("Page 1 ref is empty");
      const canvas1 = await html2canvas(page1Ref.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData1 = canvas1.toDataURL("image/jpeg", 0.95);
      doc.addImage(imgData1, "JPEG", 0, 0, 210, 297);

      const targetReceipts = recordToPrint ? (recordToPrint.receipts || []) : receiptImages;
      if (targetReceipts.length > 0) {
        doc.addPage();
        if (!page2Ref.current) throw new Error("Page 2 ref is empty");
        const canvas2 = await html2canvas(page2Ref.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
        });
        const imgData2 = canvas2.toDataURL("image/jpeg", 0.95);
        doc.addImage(imgData2, "JPEG", 0, 0, 210, 297);
      }

      const pdfBlob = doc.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      newTab.location.href = blobUrl;
      showToast("Expenses Claim PDF generated in a new tab!", "success");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      newTab.close();
      showToast("Failed to compile PDF: " + err.message, "error");
    } finally {
      setIsGenerating(false);
      setPrintingClaim(null);
    }
  };

  if (!scriptsReady) {
    return (
      <div className="flex h-[calc(100vh-135px)] items-center justify-center p-6 font-primary">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#0B57D0] animate-spin" />
          <span className="text-zinc-500 text-sm font-semibold italic">
            Loading claim compiler libraries...
          </span>
        </div>
      </div>
    );
  }

  const activePrintData = printingClaim || {
    company_name: company,
    project_department: project,
    employee_name: employeeName,
    position,
    claim_date: claimDate,
    claim_rows: claimRows,
    receipts: receiptImages,
    total_before_gst: totals.before,
    gst_amount: totals.gst,
    total_amount: totals.total,
  };

  let formattedDisplayDate = "";
  if (activePrintData.claim_date) {
    const parts = activePrintData.claim_date.split("-");
    formattedDisplayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : activePrintData.claim_date;
  }

  const printReceipts = activePrintData.receipts || [];
  let gridCols = "1fr";
  let imgHeight = "950px";
  const count = printReceipts.length;
  if (count === 2) {
    gridCols = "1fr 1fr";
    imgHeight = "950px";
  } else if (count === 3 || count === 4) {
    gridCols = "1fr 1fr";
    imgHeight = "460px";
  } else if (count >= 5) {
    gridCols = "1fr 1fr";
    imgHeight = "220px";
  }

  const isFormValid =
    company.trim() !== "" &&
    project.trim() !== "" &&
    employeeName.trim() !== "" &&
    position.trim() !== "" &&
    claimDate !== "" &&
    claimRows.length > 0 &&
    claimRows.some((row) => row.desc.trim() !== "" && parseFloat(row.amt) > 0);

  const pendingApprovalsCount = staffBatches.filter((b) => b.status === "pending").length;

  const tabs: TabItem[] = [
    {
      id: "form",
      label: editingClaimId ? "Edit Claim" : "Claim Form",
      desc: "Official Operations ➔ Finance claim form builder."
    },
    {
      id: "staff_approvals",
      label: `Staff Approvals (${pendingApprovalsCount})`,
      desc: "Review operator submissions and pay via PayNow."
    },
    {
      id: "finance_claims",
      label: "Finance Claims",
      desc: "Submitted official claim reports."
    },
    {
      id: "archived_claims",
      label: "Archive",
      desc: "Completed and archived finance claims."
    }
  ];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden relative min-w-0 font-primary">
      
      {/* UNIVERSAL TOPBAR NAVIGATION TABS */}
      <NavigationTabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(tabId: string) => setActiveTab(tabId as any)}
      />

      {/* TAB 1: OFFICIAL FINANCE CLAIM FORM */}
      {activeTab === "form" && (
        <div className="flex flex-col flex-1 h-full overflow-hidden relative min-w-0">
          
          {editingClaimId && (
            <div className="mb-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#0B57D0]" />
                <span className="text-xs font-semibold text-blue-900">
                  Editing Claim: <strong className="font-bold">{editingClaimId}</strong>
                </span>
              </div>
              <button
                onClick={() => {
                  setEditingClaimId(null);
                  handleResetForm();
                }}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
              >
                Cancel Edit
              </button>
            </div>
          )}

          <div className="content-body flex-1 w-full overflow-hidden pr-1 pb-4">
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch h-full">
              
              {/* Left Side: Claim Details Panel (col-span-3) */}
              <div className="lg:col-span-3 flex flex-col gap-5 border-r border-zinc-300/40 pr-6 h-full overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-widest pl-1">
                    Claim Details
                  </h2>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="h-9 w-full px-3 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                      Site / Project / Dept
                    </label>
                    <input
                      type="text"
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      placeholder="e.g. Operations Department"
                      className="h-9 w-full px-3 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                      Claiming By (Manager / Supervisor)
                    </label>
                    <input
                      type="text"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="Manager Full Name"
                      className="h-9 w-full px-3 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                        Position
                      </label>
                      <input
                        type="text"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="e.g. Operations Manager"
                        className="h-9 w-full px-3 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] bg-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                        Claim Date
                      </label>
                      <input
                        type="date"
                        value={claimDate}
                        onChange={(e) => setClaimDate(e.target.value)}
                        className="h-9 w-full px-3 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Receipts Upload Panel */}
                <div className="border border-zinc-300 rounded-lg p-3 bg-white flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
                      Receipt Attachments ({receiptImages.length}/8)
                    </span>
                  </div>

                  <CustomButton
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    className="w-full h-9 text-xs font-bold uppercase tracking-wider"
                  >
                    <Upload className="w-4 h-4 mr-1.5" />
                    Upload Receipt
                  </CustomButton>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleReceiptUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {receiptImages.length > 0 && (
                    <div className="flex flex-col gap-1.5 h-[96px] min-h-[96px] max-h-[96px] overflow-y-auto pr-1 border border-zinc-200/50 rounded-lg p-1.5 bg-zinc-50/20">
                      {receiptImages.map((file, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-zinc-50 border border-zinc-200 p-2 rounded-lg"
                        >
                          <div className="flex items-center gap-2 overflow-hidden w-[60%]">
                            <span className="text-[9px] font-semibold text-zinc-700 truncate block">
                              {file.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isScanningIndex === idx ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                            ) : file.extracted ? (
                              <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 uppercase">
                                Scanned
                              </span>
                            ) : (
                              <button
                                onClick={() => triggerExtraction(idx)}
                                className="text-[8px] font-bold text-zinc-700 hover:text-zinc-950 bg-zinc-200 border border-zinc-300 px-1 py-0.5 rounded uppercase cursor-pointer"
                              >
                                Scan
                              </button>
                            )}
                            <button
                              onClick={() => deleteReceipt(idx)}
                              className="text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Claim Particulars Table (col-span-7) */}
              <div className="lg:col-span-7 flex flex-col gap-4 pl-2 h-full flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">
                      Claim Particulars
                    </h2>
                    <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">
                      Itemized expenses list (Maximum 8 items)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {paidStaffClaims.length > 0 && (
                      <CustomButton
                        onClick={() => setShowImportModal(true)}
                        variant="secondary"
                        className="h-8 text-xs font-bold border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/60"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Import Reimbursed Staff Claims ({paidStaffClaims.length})
                      </CustomButton>
                    )}

                    <CustomButton
                      onClick={handleAddClaimRow}
                      variant="secondary"
                      disabled={claimRows.length >= 8}
                      className="h-8"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </CustomButton>
                  </div>
                </div>

                {/* Custom Input Table */}
                <div className="border border-zinc-300 rounded-lg bg-white shadow-xs flex-1 h-full min-h-0 overflow-y-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-zinc-50 border-b border-zinc-300 text-left sticky top-0 z-10">
                      <tr>
                        <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-center w-10">#</th>
                        <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-[40%]">Particulars</th>
                        <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-28">Amount</th>
                        <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-28">GST Type</th>
                        <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase">Remarks</th>
                        <th className="p-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {claimRows.map((row, idx) => (
                        <tr key={row.id} className="hover:bg-zinc-50/50">
                          <td className="p-3 text-center text-xs font-bold text-zinc-400 align-top pt-[19px]">
                            {idx + 1}
                          </td>
                          <td className="p-2 align-top">
                            <textarea
                              rows={1}
                              value={row.desc}
                              onChange={(e) => handleRowChange(row.id, "desc", e.target.value)}
                              placeholder="Particulars description..."
                              className="w-full p-2 border border-zinc-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0B57D0] bg-white resize-none min-h-[38px] leading-normal"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <div className="flex items-center gap-1 bg-white border border-zinc-300 rounded-lg px-2 h-[38px] focus-within:ring-1 focus-within:ring-[#0B57D0]">
                              <span className="text-xs font-bold text-zinc-400 select-none">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={row.amt}
                                onChange={(e) => handleRowChange(row.id, "amt", e.target.value)}
                                placeholder="0.00"
                                className="w-full text-xs font-bold text-zinc-800 focus:outline-none bg-transparent"
                              />
                            </div>
                          </td>
                          <td className="p-2 align-top">
                            <select
                              value={row.type}
                              onChange={(e) => handleRowChange(row.id, "type", e.target.value)}
                              className="h-[38px] w-full px-2 border border-zinc-300 rounded-lg text-xs font-bold text-zinc-800 bg-white focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                            >
                              <option value="EXCL">+ GST</option>
                              <option value="INCL">inc. GST</option>
                              <option value="NONE">No. GST</option>
                            </select>
                          </td>
                          <td className="p-2 align-top">
                            <textarea
                              ref={(el) => {
                                if (el) {
                                  el.style.height = "auto";
                                  el.style.height = `${Math.min(el.scrollHeight, 78)}px`;
                                }
                              }}
                              rows={1}
                              value={row.remark}
                              onChange={(e) => handleRowChange(row.id, "remark", e.target.value)}
                              placeholder="Project remarks..."
                              className="w-full p-2 border border-zinc-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#0B57D0] bg-white resize-none min-h-[38px] max-h-[78px] overflow-y-auto leading-normal"
                            />
                          </td>
                          <td className="p-2 text-center align-top pt-2.5">
                            <button
                              onClick={() => handleRemoveClaimRow(row.id)}
                              className={`p-1.5 rounded-lg border border-zinc-300 bg-[#EEEEEE] text-zinc-500 hover:text-red-500 transition-colors shadow-xs cursor-pointer ${
                                claimRows.length === 1 && idx === 0 ? "invisible" : ""
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>

          {/* Sticky Bottom Footer */}
          <div className="border-t border-slate-200 pt-3 pb-1 flex flex-col sm:flex-row justify-between items-center bg-transparent gap-4 z-10 flex-shrink-0">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <CustomButton
                onClick={handleSaveClaim}
                variant="default"
                disabled={!isFormValid || isSavingClaim}
                className="w-full sm:w-48 h-10 text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                {isSavingClaim ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Claim...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingClaimId ? "Update Claim" : "Save Claim"}
                  </>
                )}
              </CustomButton>

              <CustomButton
                onClick={() => handleGeneratePDF()}
                variant="dark"
                disabled={!isFormValid || isGenerating}
                className="w-full sm:w-56 h-10 text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                {isGenerating && !printingClaim ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Preview PDF
                  </>
                )}
              </CustomButton>

              <CustomButton
                onClick={handleResetForm}
                variant="danger"
                className="h-10 px-4 text-xs font-bold uppercase tracking-wider"
              >
                Reset
              </CustomButton>
            </div>

            <div className="text-zinc-600 text-xs font-bold uppercase tracking-wider flex items-center">
              Estimated Net Total:
              <span className="font-extrabold text-zinc-950 ml-2 text-base">
                $ {totals.total}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: STAFF APPROVALS & PAYOUTS (ADMIN / SUPERVISOR) */}
      {activeTab === "staff_approvals" && (
        <div className="flex flex-col flex-1 h-full overflow-hidden gap-3 pb-2">
          
          <div className="bg-white p-3.5 rounded-lg border border-zinc-300/80 shadow-xs flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Staff Claims & PayNow Approval Queue
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Review submitted operator expense batches, inspect receipts, and mark paid via PayNow.
              </p>
            </div>
          </div>

          <div className="flex-1 bg-white border border-zinc-300 rounded-lg overflow-hidden flex flex-col shadow-xs min-h-0">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-zinc-50 border-b border-zinc-300 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-36">Claim Date</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-48">Staff & PayNow</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase">Itemized Particulars</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-right w-28">Amount</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-center w-28">Status</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-center w-48">Supervisor Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs">
                  {loadingData ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#0B57D0]" />
                          <span className="font-semibold text-xs">Loading staff submissions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : staffBatches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-zinc-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <UserCheck className="w-8 h-8 text-zinc-300" />
                          <span className="font-semibold text-sm text-zinc-600">
                            No staff claims in approval queue.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    staffBatches.map((batch) => {
                      const itemsList = Array.isArray(batch.items) ? batch.items : [];
                      return (
                        <tr key={batch.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="p-3">
                            <span className="font-bold text-zinc-900 block text-xs flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                              {formatDateDisplay(batch.claim_date)}
                            </span>
                            <span className="font-mono text-[10px] text-zinc-400 font-semibold block mt-0.5">
                              {batch.id}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-zinc-900 block">
                              {batch.employee_name || batch.user_name}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-mono font-semibold flex items-center gap-1 mt-0.5">
                              <CreditCard className="w-3 h-3" /> {formatCleanPayNow(batch.paynow_number) || "No PayNow"}
                            </span>
                            {batch.target_admin_name && (
                              <span className="text-[9px] text-zinc-400 font-semibold block mt-0.5">
                                Assigned to: {batch.target_admin_name}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-zinc-800 block truncate max-w-md">
                              {itemsList.map((i) => i.description).join(", ")}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold">
                              {itemsList.length} expense item{itemsList.length !== 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-zinc-950 text-sm">
                            ${Number(batch.total_amount || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            {batch.status === "paid" || batch.status === "claimed_to_finance" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3" /> Paid
                              </span>
                            ) : batch.status === "rejected" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <Ban className="w-3 h-3" /> Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {batch.status === "pending" ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setApprovingBatch(batch);
                                      setPaynowRefInput("");
                                    }}
                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" /> Pay & Approve
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectingBatch(batch);
                                      setRejectReasonInput("");
                                    }}
                                    className="px-2 py-1 rounded bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span className="text-[11px] text-zinc-400 font-semibold">
                                  {batch.status === "claimed_to_finance" ? "Claimed to Finance" : "Completed"}
                                </span>
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

        </div>
      )}

      {/* TAB 3 & 4: OFFICIAL FINANCE CLAIMS & ARCHIVE */}
      {(activeTab === "finance_claims" || activeTab === "archived_claims") && (
        <div className="flex flex-col flex-1 h-full overflow-hidden gap-3 pb-2">
          
          <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-lg border border-zinc-300/80 shadow-xs shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search finance claims by ID, project, employee..."
                className="w-full pl-9 pr-3 py-1.5 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <CustomButton
                onClick={() => {
                  setEditingClaimId(null);
                  setActiveTab("form");
                }}
                variant="default"
                className="h-8 px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New Finance Claim
              </CustomButton>
            </div>
          </div>

          <div className="flex-1 bg-white border border-zinc-300 rounded-lg overflow-hidden flex flex-col shadow-xs min-h-0">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-zinc-50 border-b border-zinc-300 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-32">Claim ID / Date</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-48">Project / Dept</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-44">Manager</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase">Particulars Summary</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-right w-28">Net Total</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-center w-24">Receipts</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-center w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs">
                  {loadingData ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#0B57D0]" />
                          <span className="font-semibold text-xs">Loading claim records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : claims.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-zinc-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText className="w-8 h-8 text-zinc-300" />
                          <span className="font-semibold text-sm text-zinc-600">No finance claims found.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    claims.map((claim) => {
                      const claimRowsList = Array.isArray(claim.claim_rows) ? claim.claim_rows : [];
                      const rcList = Array.isArray(claim.receipts) ? claim.receipts : [];

                      let dDisplay = claim.claim_date || "";
                      if (dDisplay.includes("-")) {
                        const parts = dDisplay.split("-");
                        if (parts.length === 3) dDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
                      }

                      return (
                        <tr key={claim.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="p-3">
                            <span className="font-bold text-zinc-900 font-mono text-[11px] block">{claim.id}</span>
                            <span className="text-[10px] font-semibold text-zinc-500 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-400" /> {dDisplay}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-zinc-800">
                            <span className="truncate block max-w-[180px]">{claim.project_department || "-"}</span>
                            <span className="text-[10px] text-zinc-400 font-semibold">{claim.company_name}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-zinc-900 block">{claim.employee_name || "-"}</span>
                            <span className="text-[10px] text-zinc-500 font-semibold">{claim.position || "-"}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-zinc-800 font-medium text-xs truncate block max-w-[320px]">
                              {claimRowsList.length > 0 ? claimRowsList.map((r) => r.desc).join(", ") : "-"}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold">
                              {claimRowsList.length} items
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-extrabold text-zinc-950 text-sm font-mono block">
                              ${Number(claim.total_amount || 0).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-semibold">
                              GST: ${Number(claim.gst_amount || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {rcList.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0B57D0] border border-blue-200">
                                {rcList.length} docs
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-semibold">None</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleGeneratePDF(claim)}
                                disabled={isGenerating}
                                title="Print Official PDF"
                                className="p-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 transition-colors shadow-xs cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingClaimId(claim.id);
                                  setCompany(claim.company_name || "HSG Global Pte. Ltd.");
                                  setProject(claim.project_department || "");
                                  setEmployeeName(claim.employee_name || "");
                                  setPosition(claim.position || "");
                                  setClaimDate(claim.claim_date || new Date().toISOString().split("T")[0]);
                                  setClaimRows(claim.claim_rows || [{ id: 1, desc: "", amt: "", type: "EXCL", remark: "" }]);
                                  setReceiptImages(claim.receipts || []);
                                  setActiveTab("form");
                                }}
                                title="Edit Claim"
                                className="p-1.5 rounded-md border border-zinc-300 bg-white hover:bg-zinc-100 text-blue-600 transition-colors shadow-xs cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
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

        </div>
      )}

      {/* IMPORT PAID STAFF CLAIMS MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-zinc-300 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-pop-in">
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Import Reimbursed Staff Claims</h3>
                <span className="text-xs text-zinc-500">
                  Select staff claims you previously paid out of pocket to import into the official Finance claim form.
                </span>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="w-7 h-7 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-3">
              {paidStaffClaims.length === 0 ? (
                <div className="text-center py-8 text-zinc-400 text-xs font-semibold">
                  No unclaimed paid staff claims found.
                </div>
              ) : (
                paidStaffClaims.map((batch) => {
                  const isSelected = selectedImportBatchIds.has(batch.id);
                  return (
                    <div
                      key={batch.id}
                      onClick={() => {
                        setSelectedImportBatchIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(batch.id)) next.delete(batch.id);
                          else next.add(batch.id);
                          return next;
                        });
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-blue-50/50 border-[#0B57D0]"
                          : "bg-white border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-zinc-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-xs text-zinc-900 block">
                            {batch.employee_name} ({batch.id})
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            {batch.claim_date} • {(batch.items || []).map((i) => i.description).join(", ")}
                          </span>
                        </div>
                      </div>

                      <span className="font-mono font-extrabold text-sm text-zinc-950">
                        ${Number(batch.total_amount || 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-600">
                {selectedImportBatchIds.size} batch(es) selected
              </span>

              <div className="flex items-center gap-2">
                <CustomButton variant="secondary" onClick={() => setShowImportModal(false)}>
                  Cancel
                </CustomButton>
                <CustomButton
                  variant="default"
                  disabled={selectedImportBatchIds.size === 0}
                  onClick={handleImportStaffClaims}
                >
                  Import Selected Claims
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVE PAYOUT MODAL */}
      {approvingBatch && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-zinc-300 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-pop-in">
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-950">Approve & Mark PayNow Payout</h3>
              <button
                onClick={() => setApprovingBatch(null)}
                className="w-7 h-7 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Send PayNow To</span>
                  <span className="text-sm font-bold text-emerald-950">{approvingBatch.employee_name}</span>
                  <span className="text-xs font-mono font-bold text-emerald-700 block">{formatCleanPayNow(approvingBatch.paynow_number) || "No PayNow"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Payout Amount</span>
                  <span className="text-lg font-mono font-extrabold text-emerald-950">${Number(approvingBatch.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                  Payment Reference / Trans ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PN-123456789"
                  value={paynowRefInput}
                  onChange={(e) => setPaynowRefInput(e.target.value)}
                  className="h-10 px-3 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <CustomButton variant="secondary" onClick={() => setApprovingBatch(null)}>
                Cancel
              </CustomButton>
              <CustomButton variant="default" onClick={handleApproveBatch}>
                Confirm Payout & Approve
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingBatch && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-zinc-300 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-pop-in">
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-950">Reject Staff Claim Batch</h3>
              <button
                onClick={() => setRejectingBatch(null)}
                className="w-7 h-7 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <p className="text-xs text-zinc-600">
                Rejecting batch <strong>{rejectingBatch.id}</strong> will unlock all included expenses back to the operator's ledger so they can make corrections.
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                  Rejection Reason / Feedback *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Receipt photo is blurry, amount mismatch"
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  className="p-3 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] bg-white resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-2">
              <CustomButton variant="secondary" onClick={() => setRejectingBatch(null)}>
                Cancel
              </CustomButton>
              <CustomButton variant="danger" onClick={handleRejectBatch}>
                Reject Batch
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* CROP & ROTATE MODAL */}
      {showCropModal && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-zinc-300 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-pop-in">
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-widest">
                Crop & Rotate Receipt
              </h3>
              <button
                onClick={() => setShowCropModal(false)}
                className="w-7 h-7 rounded-lg border border-zinc-300 bg-[#EEEEEE] hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-grow p-6 bg-zinc-100 flex items-center justify-center overflow-hidden min-h-[300px] max-h-[50vh]">
              <div className="w-full h-full max-h-[350px] flex justify-center items-center">
                <img
                  ref={imageRef}
                  src={cropSrc}
                  alt="To Crop"
                  style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }}
                />
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex flex-col gap-4">
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={() => {
                    const rot = (baseRotation - 90) % 360;
                    setBaseRotation(rot);
                    cropperRef.current?.rotateTo(rot + fineRotation);
                  }}
                  className="p-2.5 bg-white border border-zinc-200 hover:border-zinc-500 rounded-lg flex items-center justify-center cursor-pointer"
                  title="Rotate Left 90°"
                >
                  <RotateCcw className="w-4 h-4 text-zinc-700" />
                </button>

                <div className="flex items-center gap-3 flex-grow max-w-xs">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Angle</span>
                  <input
                    type="range"
                    min="-45"
                    max="45"
                    value={fineRotation}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFineRotation(val);
                      cropperRef.current?.rotateTo(baseRotation + val);
                    }}
                    className="w-full accent-zinc-800 h-1 rounded-lg bg-zinc-200 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-zinc-600 w-10 text-right">{fineRotation}°</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const rot = (baseRotation + 90) % 360;
                    setBaseRotation(rot);
                    cropperRef.current?.rotateTo(rot + fineRotation);
                  }}
                  className="p-2.5 bg-white border border-zinc-200 hover:border-zinc-500 rounded-lg flex items-center justify-center cursor-pointer"
                  title="Rotate Right 90°"
                >
                  <RotateCw className="w-4 h-4 text-zinc-700" />
                </button>
              </div>

              <div className="flex justify-end gap-3">
                <CustomButton variant="secondary" onClick={() => setShowCropModal(false)}>
                  Cancel
                </CustomButton>
                <CustomButton variant="dark" onClick={applyCrop}>
                  Apply Crop
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ACTION DIALOG */}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => !open && setConfirmDialog(null)}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmText={confirmDialog.confirmText}
          variant={confirmDialog.variant}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* OFF-SCREEN RENDERING CONTAINER FOR OFFICIAL PDF GENERATION */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "100vw",
          width: "794px",
          height: "1123px",
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: -9999,
          backgroundColor: "#ffffff",
          color: "#000000",
        }}
      >
        <div
          id="generated-view"
          style={{
            width: "794px",
            height: "1123px",
            backgroundColor: "#ffffff",
            color: "#000000",
          }}
        >
          {/* PAGE 1: CLAIM FORM */}
          <div
            ref={page1Ref}
            className="pdf-page"
            style={{
              width: "794px",
              height: "1123px",
              padding: "40px",
              boxSizing: "border-box",
              backgroundColor: "#ffffff",
              position: "relative",
            }}
          >
            <div
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "11px",
                lineHeight: "1.4",
                padding: 0,
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
                color: "#000000",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                height: "100%",
              }}
            >
              <div>
                <div style={{ marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                    <span style={{ fontWeight: "bold", fontSize: "12px", whiteSpace: "nowrap" }}>
                      Company Name:
                    </span>
                    <div
                      style={{
                        flexGrow: 1,
                        borderBottom: "1px solid black",
                        fontWeight: "bold",
                        fontSize: "12px",
                        paddingLeft: "8px",
                      }}
                    >
                      {(activePrintData.company_name || "").toUpperCase()}
                    </div>
                  </div>
                  <h1
                    style={{
                      fontSize: "18px",
                      fontWeight: "bold",
                      textAlign: "center",
                      textDecoration: "underline",
                      textTransform: "uppercase",
                      letterSpacing: "2px",
                      marginTop: "15px",
                      marginBottom: "10px",
                    }}
                  >
                    EXPENSES CLAIM FORM
                  </h1>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(12, 1fr)",
                    gap: "10px 20px",
                    marginBottom: "15px",
                    fontSize: "11px",
                  }}
                >
                  <div style={{ gridColumn: "span 8", display: "flex", alignItems: "flex-end", gap: "8px" }}>
                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                      Site / Project / Dept:
                    </span>
                    <div style={{ flexGrow: 1, borderBottom: "1px solid black", paddingLeft: "8px", minHeight: "18px" }}>
                      {(activePrintData.project_department || "").toUpperCase()}
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 4", display: "flex", alignItems: "flex-end", gap: "8px" }}>
                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Date:</span>
                    <div style={{ flexGrow: 1, borderBottom: "1px solid black", paddingLeft: "8px", minHeight: "18px" }}>
                      {formattedDisplayDate}
                    </div>
                  </div>

                  <div style={{ gridColumn: "span 8", display: "flex", alignItems: "flex-end", gap: "8px" }}>
                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Name:</span>
                    <div style={{ flexGrow: 1, borderBottom: "1px solid black", paddingLeft: "8px", minHeight: "18px" }}>
                      {(activePrintData.employee_name || "").toUpperCase()}
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 4", display: "flex", alignItems: "flex-end", gap: "8px" }}>
                    <span style={{ fontWeight: "bold", whiteSpace: "nowrap" }}>Position:</span>
                    <div style={{ flexGrow: 1, borderBottom: "1px solid black", paddingLeft: "8px", minHeight: "18px" }}>
                      {(activePrintData.position || "").toUpperCase()}
                    </div>
                  </div>
                </div>

                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    border: "1px solid black",
                    marginBottom: "15px",
                    fontSize: "10px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6", textAlign: "center", height: "28px" }}>
                      <th style={{ width: "35px", padding: "4px", fontWeight: "bold", textAlign: "center", border: "1px solid black", borderBottom: "2px solid black" }}>No</th>
                      <th style={{ padding: "4px", fontWeight: "bold", textAlign: "center", border: "1px solid black", borderBottom: "2px solid black" }}>Particulars</th>
                      <th style={{ width: "100px", padding: "4px", fontWeight: "bold", textAlign: "center", border: "1px solid black", borderBottom: "2px solid black" }}>Amount before GST</th>
                      <th style={{ width: "60px", padding: "4px", fontWeight: "bold", textAlign: "center", border: "1px solid black", borderBottom: "2px solid black" }}>GST</th>
                      <th style={{ width: "110px", padding: "4px", fontWeight: "bold", textAlign: "center", border: "1px solid black", borderBottom: "2px solid black" }}>Total Amount with GST</th>
                      <th style={{ width: "120px", padding: "4px", fontWeight: "bold", textAlign: "center", border: "1px solid black", borderBottom: "2px solid black" }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activePrintData.claim_rows || [])
                      .filter((row: any) => (row.desc || "").trim() !== "" || parseFloat(row.amt) > 0)
                      .map((row: any, i: number) => {
                        const amt = parseFloat(row.amt) || 0;
                        const gst =
                          row.type === "EXCL"
                            ? amt * GST_RATE
                            : row.type === "INCL"
                            ? amt - amt / (1 + GST_RATE)
                            : 0;
                        const before = row.type === "EXCL" ? amt : amt - gst;
                        const total = row.type === "EXCL" ? amt + gst : amt;

                        return (
                          <tr key={row.id || i} style={{ height: "32px" }}>
                            <td style={{ textAlign: "center", fontWeight: "bold", verticalAlign: "top", paddingTop: "6px", border: "1px solid black" }}>{i + 1}</td>
                            <td style={{ padding: "6px", textAlign: "left", verticalAlign: "top", wordBreak: "break-all", border: "1px solid black" }}>{row.desc}</td>
                            <td style={{ padding: "6px", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap", border: "1px solid black" }}>$ {before.toFixed(2)}</td>
                            <td style={{ padding: "6px", textAlign: "right", verticalAlign: "top", whiteSpace: "nowrap", border: "1px solid black" }}>$ {gst.toFixed(2)}</td>
                            <td style={{ padding: "6px", textAlign: "right", fontWeight: "bold", verticalAlign: "top", whiteSpace: "nowrap", border: "1px solid black" }}>$ {total.toFixed(2)}</td>
                            <td style={{ padding: "6px", textAlign: "left", fontSize: "9px", verticalAlign: "top", wordBreak: "break-all", border: "1px solid black" }}>{row.remark}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: "bold", backgroundColor: "#f9fafb", height: "32px" }}>
                      <td colSpan={2} style={{ textAlign: "right", paddingRight: "15px", textTransform: "uppercase", border: "1px solid black", borderTop: "2px solid black" }}>TOTAL</td>
                      <td style={{ padding: "6px", textAlign: "right", whiteSpace: "nowrap", border: "1px solid black", borderTop: "2px solid black" }}>$ {Number(activePrintData.total_before_gst || 0).toFixed(2)}</td>
                      <td style={{ padding: "6px", textAlign: "right", whiteSpace: "nowrap", border: "1px solid black", borderTop: "2px solid black" }}>$ {Number(activePrintData.gst_amount || 0).toFixed(2)}</td>
                      <td style={{ padding: "6px", textAlign: "right", fontWeight: "900", whiteSpace: "nowrap", border: "1px solid black", borderTop: "2px solid black" }}>$ {Number(activePrintData.total_amount || 0).toFixed(2)}</td>
                      <td style={{ padding: "6px", border: "1px solid black", borderTop: "2px solid black" }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "10px", fontSize: "10px" }}>
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "15px" }}>
                    <div style={{ border: "1.5px solid black", padding: "12px", height: "210px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
                      <div>
                        <p style={{ fontWeight: "bold", fontStyle: "italic", marginBottom: "2px", marginTop: 0, textTransform: "uppercase", fontSize: "11px" }}>For approval</p>
                        <p style={{ margin: 0, fontSize: "9px", color: "#4b5563" }}>Supervisor/ Manager</p>
                      </div>
                      <div style={{ flexGrow: 1, borderBottom: "1.5px solid black", marginBottom: "5px", minHeight: "50px" }}></div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ textAlign: "center", marginBottom: "5px" }}>
                          <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "bold" }}>Signature</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                          <span style={{ fontWeight: "bold" }}>Name:</span>
                          <div style={{ flexGrow: 1, borderBottom: "1px solid black", minHeight: "14px" }}></div>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                          <span style={{ fontWeight: "bold" }}>Date:</span>
                          <div style={{ flexGrow: 1, borderBottom: "1px solid black", minHeight: "14px" }}></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ border: "1.5px solid black", padding: "12px", height: "110px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
                      <p style={{ fontWeight: "bold", marginBottom: 0, textTransform: "uppercase", marginTop: 0, fontStyle: "italic", fontSize: "11px" }}>Claiming by</p>
                      <div style={{ flexGrow: 1, borderBottom: "1.5px solid black", marginBottom: "5px", minHeight: "35px" }}></div>
                      <p style={{ fontWeight: "bold", textAlign: "center", marginTop: 0, fontSize: "9px", textTransform: "uppercase" }}>SIGNATURE, DATE</p>
                    </div>
                  </div>

                  <div style={{ border: "1.5px solid black", padding: "12px", height: "335px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
                    <div>
                      <p style={{ fontWeight: "bold", marginBottom: "6px", textTransform: "uppercase", marginTop: 0, fontStyle: "italic", fontSize: "11px" }}>For Finance Dept.</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                          <span style={{ fontWeight: "bold", color: "#4b5563", fontSize: "9px" }}>Remarks:</span>
                          <div style={{ flexGrow: 1, borderBottom: "1px solid black", minHeight: "14px" }}></div>
                        </div>
                        <div style={{ borderBottom: "1px solid black", minHeight: "14px", marginTop: "4px" }}></div>
                      </div>

                      <div style={{ border: "1px solid black", marginBottom: "8px", marginTop: "10px" }}>
                        <div style={{ fontSize: "8px", fontWeight: "bold", textAlign: "center", borderBottom: "1px solid black", backgroundColor: "#f3f4f6", padding: "2px 0", textTransform: "uppercase" }}>
                          GST Expenses
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "9px" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid black" }}>
                              <th style={{ borderRight: "1px solid black", width: "33.3%", padding: "3px", fontWeight: "bold" }}>Amt</th>
                              <th style={{ borderRight: "1px solid black", width: "33.3%", padding: "3px", fontWeight: "bold" }}>GST</th>
                              <th style={{ width: "33.3%", padding: "3px", fontWeight: "bold" }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ height: "18px" }}>
                              <td style={{ borderRight: "1px solid black" }}></td>
                              <td style={{ borderRight: "1px solid black" }}></td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div style={{ border: "1px solid black", marginBottom: "8px" }}>
                        <div style={{ fontSize: "8px", fontWeight: "bold", textAlign: "center", borderBottom: "1px solid black", backgroundColor: "#f3f4f6", padding: "2px 0", textTransform: "uppercase" }}>
                          Non-GST Expenses
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center", fontSize: "9px" }}>
                          <thead>
                            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid black" }}>
                              <th style={{ borderRight: "1px solid black", width: "50%", padding: "3px", fontWeight: "bold" }}>Amt</th>
                              <th style={{ width: "50%", padding: "3px", fontWeight: "bold" }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ height: "18px" }}>
                              <td style={{ borderRight: "1px solid black" }}></td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "5px" }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                        <span style={{ fontWeight: "bold" }}>Check by:</span>
                        <div style={{ flexGrow: 1, borderBottom: "1px solid black", minHeight: "14px" }}></div>
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                        <span style={{ fontWeight: "bold" }}>Date:</span>
                        <div style={{ flexGrow: 1, borderBottom: "1px solid black", minHeight: "14px" }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "8px", lineHeight: "1.4", borderTop: "0.5px solid #ccc", paddingTop: "6px", color: "#4b5563" }}>
                  <p style={{ fontWeight: "bold", textDecoration: "underline", marginBottom: "3px", marginTop: 0, color: "#1f2937", textTransform: "uppercase" }}>
                    Note:
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "12px 1fr", columnGap: "4px", marginBottom: "1px" }}>
                    <span>1</span>
                    <span>To expedite your petty cash, kindly proceed to your dept. head for approval before submitting.</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "12px 1fr", columnGap: "4px", marginBottom: "1px" }}>
                    <span>2</span>
                    <span>Purchase of materials for site/projects must issued RFA and PO and attach all the related documents.</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "12px 1fr", columnGap: "4px", marginBottom: "1px" }}>
                    <span>3</span>
                    <span>To indicate locations, purposes & description of items should be clearly stated before submission.</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "12px 1fr", columnGap: "4px" }}>
                    <span>4</span>
                    <span>Claims must be submit within <strong style={{ color: "black" }}>2 months</strong>, total expenses claim more than <strong style={{ color: "black" }}>$500.00</strong> will issued by cheque.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE 2: RECEIPTS */}
          {printReceipts.length > 0 && (
            <div
              ref={page2Ref}
              className="pdf-page page-break"
              style={{
                width: "794px",
                height: "1123px",
                padding: "40px",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "11px",
                  lineHeight: "1.4",
                  padding: 0,
                  boxSizing: "border-box",
                  backgroundColor: "#ffffff",
                  color: "#000000",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  height: "100%",
                }}
              >
                <div>
                  <div style={{ textAlign: "center", marginBottom: "25px" }}>
                    <h2 style={{ fontSize: "14px", fontWeight: "bold", textDecoration: "underline", textTransform: "uppercase" }}>
                      Supporting Documents (Receipts)
                    </h2>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: gridCols,
                      gap: "20px",
                      width: "100%",
                      justifyItems: "center",
                      alignItems: "center",
                    }}
                  >
                    {printReceipts.map((file: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          width: "100%",
                          height: imgHeight,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          overflow: "hidden",
                        }}
                      >
                        <img
                          src={file.url || file.src}
                          alt={file.name}
                          crossOrigin="anonymous"
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "center",
                    fontSize: "8px",
                    color: "#cbd5e1",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    marginTop: "20px",
                  }}
                >
                  End of Supporting Documents
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}

// Alias for backwards compatibility
export const ClaimFormGeneratorModule = FinanceClaimsModule;
