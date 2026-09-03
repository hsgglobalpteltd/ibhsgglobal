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
  RotateCcw,
  ArrowRightLeft,
  Lock,
  Pencil
} from "lucide-react";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";
const GST_RATE = 0.09;

interface AdminUser {
  email: string;
  name: string;
  phone_number?: string;
  role?: string;
}

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
  batch_id?: string;
  staff_name?: string;
  claim_date?: string;
  line_number?: number;
  item_desc?: string;
  item_amt?: string | number;
  item_date?: string;
  item_remarks?: string;
  item_project?: string;
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
  status: "active" | "completed" | "submitted" | "payment_received";
  payment_received_date?: string | number;
  payment_received_by?: string;
  payment_received_ref?: string;
  payment_received_at?: number;
  created_at: number;
  updated_at: number;
}

interface OperatorBatch {
  id: string;
  employee_id: string;
  employee_name?: string;
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

function formatDateDisplay(d?: string | number): string {
  if (!d) return "";
  if (typeof d === "number") {
    const dateObj = new Date(d);
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const dStr = String(d);
  if (dStr.includes("-")) {
    const parts = dStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dStr;
}

export function FinanceClaimsModule({ profile }: FinanceClaimsModuleProps) {
  const [activeTab, setActiveTab] = React.useState<"form" | "staff_approvals" | "rejected_claims" | "finance_claims" | "archived_claims">("form");
  const [scriptsReady, setScriptsReady] = React.useState(false);

  const canEdit = canEditModule(profile, "Finance Claims") || canEditModule(profile, "Claim Form Generator");
  const canDelete = canDeleteModule(profile, "Finance Claims") || canDeleteModule(profile, "Claim Form Generator");
  const isAdmin = profile?.role === "Administrator";

  // Form Fields State
  const [editingClaimId, setEditingClaimId] = React.useState<string | null>(null);
  const [company, setCompany] = React.useState("HSG Global Pte. Ltd.");
  const [project, setProject] = React.useState("");
  const [employeeName, setEmployeeName] = React.useState(profile?.name || "");
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
  const [confirmDeleteReceiptIdx, setConfirmDeleteReceiptIdx] = React.useState<number | null>(null);
  const [isSavingClaim, setIsSavingClaim] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [printingClaim, setPrintingClaim] = React.useState<ClaimRecord | null>(null);

  // Modals
  const [viewingBatch, setViewingBatch] = React.useState<OperatorBatch | null>(null);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [selectedImportBatchIds, setSelectedImportBatchIds] = React.useState<Set<string>>(new Set());
  const [approvingBatch, setApprovingBatch] = React.useState<OperatorBatch | null>(null);
  const [paynowRefInput, setPaynowRefInput] = React.useState("");
  const [rejectingBatch, setRejectingBatch] = React.useState<OperatorBatch | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = React.useState("");
  const [previewingReceiptUrl, setPreviewingReceiptUrl] = React.useState<string | null>(null);
  const [viewingClaimDetails, setViewingClaimDetails] = React.useState<ClaimRecord | null>(null);
  const [receivingPaymentClaim, setReceivingPaymentClaim] = React.useState<ClaimRecord | null>(null);
  const [paymentReceivedDateInput, setPaymentReceivedDateInput] = React.useState("");
  const [paymentReceivedByInput, setPaymentReceivedByInput] = React.useState("");
  const [paymentReceivedRefInput, setPaymentReceivedRefInput] = React.useState("");
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);

  const [editingRefBatch, setEditingRefBatch] = React.useState<OperatorBatch | null>(null);
  const [editingRefInput, setEditingRefInput] = React.useState("");
  const [isUpdatingRef, setIsUpdatingRef] = React.useState(false);

  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant?: "danger" | "dark" | "default";
    onConfirm: () => void;
  } | null>(null);

  // Transfer state & Admin list
  const [adminsList, setAdminsList] = React.useState<AdminUser[]>([]);
  const [transferringBatch, setTransferringBatch] = React.useState<OperatorBatch | null>(null);
  const [selectedTransferAdminEmail, setSelectedTransferAdminEmail] = React.useState<string>("");
  const [isTransferring, setIsTransferring] = React.useState(false);
  const [adminFilter, setAdminFilter] = React.useState<"assigned_to_me" | "all">("assigned_to_me");
  const [staffSubTab, setStaffSubTab] = React.useState<"active" | "rejected">("active");
  const [staffSearchQuery, setStaffSearchQuery] = React.useState<string>("");
  const [employeesMap, setEmployeesMap] = React.useState<Record<string, any>>({});

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
    if (profile?.name && !employeeName) {
      setEmployeeName(profile.name);
    }
  }, [profile?.name]);

  // Fetch employees to resolve active PayNow numbers
  React.useEffect(() => {
    async function loadEmployees() {
      try {
        const res = await fetch(`${WORKER_URL}/api/employees`);
        if (res.ok) {
          const list = (await res.json()) as any[];
          const map: Record<string, any> = {};
          list.forEach((emp) => {
            if (emp.id) map[String(emp.id)] = emp;
          });
          setEmployeesMap(map);
        }
      } catch (err) {
        console.warn("Failed to load employees for claims module:", err);
      }
    }
    loadEmployees();
  }, []);

  React.useEffect(() => {
    async function initScripts() {
      try {
        await loadStyle("https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
        try {
          await loadScript("https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.11/dist/html2canvas-pro.min.js");
        } catch {
          await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
        }
        setScriptsReady(true);
      } catch (err) {
        console.error("Failed to load PDF / cropper scripts:", err);
      }
    }
    initScripts();
  }, []);

  // 2. Fetch Administrators List for Transfer
  const loadAdmins = React.useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_URL}/api/claims/admins`);
      if (res.ok) {
        const data = (await res.json()) as AdminUser[];
        setAdminsList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn("Failed to load admins list:", err);
    }
  }, []);

  React.useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  // 3. Draft Auto-save and Loading
  React.useEffect(() => {
    if (isDraftLoadedRef.current) return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.company) setCompany(parsed.company);
        if (parsed.project) setProject(parsed.project);
        if (parsed.employeeName) setEmployeeName(parsed.employeeName);
        if (parsed.position) setPosition(parsed.position);
        if (parsed.claimDate) setClaimDate(parsed.claimDate);
        if (parsed.claimRows && Array.isArray(parsed.claimRows)) setClaimRows(parsed.claimRows);
        if (parsed.receiptImages && Array.isArray(parsed.receiptImages)) setReceiptImages(parsed.receiptImages);
        if (parsed.importedBatchIds && Array.isArray(parsed.importedBatchIds)) setImportedBatchIds(parsed.importedBatchIds);
      }
      isDraftLoadedRef.current = true;
    } catch (_) {
      isDraftLoadedRef.current = true;
    }
  }, [draftKey]);

  React.useEffect(() => {
    if (!isDraftLoadedRef.current) return;
    if (editingClaimId) return;

    try {
      const draft = {
        company,
        project,
        employeeName,
        position,
        claimDate,
        claimRows,
        receiptImages,
        importedBatchIds,
        savedAt: Date.now(),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (err) {
      console.warn("Auto-save failed (likely storage quota exceeded):", err);
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

      // Fetch staff batches: filter by current admin (or all if adminFilter === 'all')
      const batchUrl = adminFilter === "all"
        ? `${WORKER_URL}/api/claims/operator/batches?all=true`
        : `${WORKER_URL}/api/claims/operator/batches?target_admin_email=${encodeURIComponent(userEmail)}`;
      
      const batchRes = await fetch(batchUrl);
      if (batchRes.ok) {
        const batchData = (await batchRes.json()) as OperatorBatch[];
        setStaffBatches(Array.isArray(batchData) ? batchData : []);
      }

      // Fetch paid staff claims available for finance import (assigned to current admin)
      const paidUrl = adminFilter === "all"
        ? `${WORKER_URL}/api/claims/operator/paid-unclaimed`
        : `${WORKER_URL}/api/claims/operator/paid-unclaimed?target_admin_email=${encodeURIComponent(userEmail)}`;

      const paidRes = await fetch(paidUrl);
      if (paidRes.ok) {
        const paidData = (await paidRes.json()) as OperatorBatch[];
        setPaidStaffClaims(Array.isArray(paidData) ? paidData : []);
      }
    } catch (err: any) {
      console.error("Failed to load claims data:", err);
    } finally {
      setLoadingData(false);
    }
  }, [userEmail, adminFilter]);

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
    const rowToRemove = claimRows.find((r) => r.id === id);
    const match = rowToRemove?.remark?.match(/Claim ID:\s*([A-Za-z0-9_-]+)/i);
    const batchId = match ? match[1] : null;
    const staffName = rowToRemove?.desc ? rowToRemove.desc.trim().toLowerCase() : "";

    // 1. Remove all matching receipts from the drawer
    setReceiptImages((prev) =>
      prev.filter((img) => {
        if (batchId && (img.batch_id === batchId || (img.name && img.name.includes(batchId)))) {
          return false;
        }
        if (img.line_number === id) {
          return false;
        }
        if (staffName && img.staff_name && img.staff_name.trim().toLowerCase() === staffName) {
          return false;
        }
        return true;
      })
    );

    // 2. Remove batchId from registry
    if (batchId) {
      setImportedBatchIds((prev) => prev.filter((bId) => bId !== batchId));
    }

    // 3. Update claimRows and recalculate total amounts
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
      {
        src: croppedSrc,
        name: cropFileName,
        extracted: false,
        type: cropFileType || "image/jpeg",
        line_number: undefined,
        item_desc: cropFileName,
        item_amt: undefined,
        item_remarks: ""
      },
    ]);
    setShowCropModal(false);
    showToast("Receipt document cropped and added!", "success");
  };

  const deleteReceipt = (index: number) => {
    const targetReceipt = receiptImages[index];
    const targetLineNumber = targetReceipt?.line_number;
    const batchId = targetReceipt?.batch_id;

    // 1. Remove receipt from receiptImages
    setReceiptImages((prev) => prev.filter((_, idx) => idx !== index));

    // 2. If it is tied to a batch, remove from importedBatchIds if no more receipts for this batch
    if (batchId) {
      const otherBatchReceipts = receiptImages.filter((r, idx) => idx !== index && r.batch_id === batchId);
      if (otherBatchReceipts.length === 0) {
        setImportedBatchIds((prev) => prev.filter((bId) => bId !== batchId));
      }
    }

    // 3. Auto-delete or reset the tied claim particular row
    if (targetLineNumber) {
      setClaimRows((prev) => {
        if (prev.length === 1 && prev[0].id === targetLineNumber) {
          return [{ id: 1, desc: "", amt: "", type: "EXCL", remark: "" }];
        }
        return prev.filter((r) => r.id !== targetLineNumber);
      });
    }

    showToast("Receipt and tied claim particular removed.", "info");
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

      const isInitialBlank = claimRows.length === 1 && claimRows[0].desc === "" && claimRows[0].amt === "";
      const maxId = claimRows.length > 0 ? Math.max(...claimRows.map((r) => r.id)) : 0;
      
      // If receipt already has a line_number tied to an existing row, update that row; otherwise add a new row
      const existingRowIndex = file.line_number ? claimRows.findIndex(r => r.id === file.line_number) : -1;
      const targetRowId = existingRowIndex >= 0 ? claimRows[existingRowIndex].id : (isInitialBlank ? 1 : maxId + 1);
      const targetLineNumber = existingRowIndex >= 0 ? claimRows[existingRowIndex].id : (isInitialBlank ? 1 : claimRows.length + 1);

      const newRow: ClaimRow = {
        id: targetRowId,
        desc: data.merchant || file.item_desc || "RECEIPT CHARGES",
        amt: (parseFloat(data.total) || 0.0).toFixed(2),
        type: data.is_gst ? "INCL" : "EXCL",
        remark: existingRowIndex >= 0 ? claimRows[existingRowIndex].remark : "",
      };

      const updated = receiptImages.map((img, i) =>
        i === idx ? { ...img, extracted: true, line_number: targetLineNumber, item_desc: data.merchant || img.item_desc } : img
      );
      setReceiptImages(updated);

      if (existingRowIndex >= 0) {
        setClaimRows(claimRows.map((r, i) => i === existingRowIndex ? newRow : r));
      } else if (isInitialBlank) {
        setClaimRows([newRow]);
      } else {
        setClaimRows([...claimRows, newRow]);
      }

      showToast(`Receipt parsed and linked to item line #${targetLineNumber}!`, "success");
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
          type: rc.type || "image/jpeg",
          batch_id: rc.batch_id,
          staff_name: rc.staff_name,
          claim_date: rc.claim_date,
          line_number: rc.line_number,
          item_desc: rc.item_desc,
          item_amt: rc.item_amt,
          item_date: rc.item_date,
          item_remarks: rc.item_remarks,
          item_project: rc.item_project
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
      const resData = await res.json();
      const savedClaimRecord = resData.data || payload;

      try {
        localStorage.removeItem(draftKey);
      } catch (_) {}

      showToast(
        editingClaimId ? "Finance claim updated and submitted!" : "Finance claim submitted successfully!",
        "success"
      );

      // 1. Open official PDF preview in a new window/tab
      handleGeneratePDF(savedClaimRecord);

      // 2. Reset the form to a fresh blank state
      setEditingClaimId(null);
      handleResetForm();

      // 3. Reload data and navigate directly to Claims Submitted tab
      loadData();
      setActiveTab("finance_claims");
    } catch (err: any) {
      console.error("Save claim error:", err);
      showToast("Failed to save claim: " + err.message, "error");
    } finally {
      setIsSavingClaim(false);
    }
  };

  // Import Paid Staff Claims into Form (Combines all items of each batch into 1 row: Staff Name, Claim Date, Claim ID)
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
      const staffName = b.employee_name || "Staff";
      const claimDateStr = formatDateDisplay(b.claim_date);
      const itemsList = Array.isArray(b.items) ? b.items : [];

      if (existingRows.length + newRows.length < 8) {
        maxId += 1;
        const rowId = maxId;

        const compiledRemark = `Claim ID: ${b.id} • Date: ${claimDateStr}`;

        // 1 row per staff batch in the main claim table
        newRows.push({
          id: rowId,
          desc: staffName,
          amt: Number(b.total_amount || 0).toFixed(2),
          type: "EXCL",
          remark: compiledRemark
        });

        // Add all itemized receipts for print breakdown reference
        itemsList.forEach((item, itemIdx) => {
          newReceipts.push({
            name: (item as any).receipt_name || `${staffName}_receipt_${itemIdx + 1}.jpg`,
            src: item.receipt_url || "",
            url: item.receipt_url || "",
            extracted: false,
            type: "image/jpeg",
            batch_id: b.id,
            staff_name: staffName,
            claim_date: b.claim_date,
            line_number: rowId,
            item_desc: item.description || "Expense Item",
            item_amt: item.amount,
            item_date: item.date,
            item_remarks: item.remarks,
            item_project: item.project_department
          });
        });
      }
    });

    setClaimRows([...existingRows, ...newRows]);
    setReceiptImages(newReceipts);
    setImportedBatchIds(importedIds);
    setShowImportModal(false);
    setSelectedImportBatchIds(new Set());
    showToast(`Imported ${batchesToImport.length} staff claim(s) into form!`, "success");
  };

  // Approve Staff Claim Payout
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

      showToast(`Staff claim ${approvingBatch.id} marked as Paid via PayNow!`, "success");
      setApprovingBatch(null);
      setPaynowRefInput("");
      loadData();
    } catch (err: any) {
      showToast("Approval failed: " + err.message, "error");
    }
  };

  // Reject Staff Claim
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

      showToast(`Staff claim ${rejectingBatch.id} rejected. Expenses returned to operator.`, "info");
      setRejectingBatch(null);
      setRejectReasonInput("");
      loadData();
    } catch (err: any) {
      showToast("Rejection failed: " + err.message, "error");
    }
  };

  // Update Payment Reference for Staff Claim
  const handleSavePaymentRef = async () => {
    if (!editingRefBatch) return;
    if (!editingRefInput.trim()) {
      showToast("Please enter a valid payment transaction reference.", "warning");
      return;
    }

    setIsUpdatingRef(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/claims/operator/batch/update-ref`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRefBatch.id,
          payment_reference: editingRefInput.trim()
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);

      showToast(`Payment reference updated for claim ${editingRefBatch.id}!`, "success");
      setEditingRefBatch(null);
      setEditingRefInput("");
      loadData();
    } catch (err: any) {
      showToast(`Failed to update payment reference: ${err.message}`, "error");
    } finally {
      setIsUpdatingRef(false);
    }
  };

  // Revoke Paid Status for Staff Claim
  const handleRevokePaid = (batch: OperatorBatch) => {
    setConfirmDialog({
      open: true,
      title: "Revoke Paid Status",
      description: `Are you sure you want to revoke the paid status for claim ${batch.id} (${batch.employee_name || "Staff"})? This will revert the claim back to Pending Review.`,
      confirmText: "Revoke Paid",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`${WORKER_URL}/api/claims/operator/batch/revoke-paid`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: batch.id,
              revoked_by: profile?.name || profile?.email || "Admin"
            })
          });

          if (!res.ok) throw new Error(await res.text());
          const resData = await res.json();
          if (resData.error) throw new Error(resData.error);

          showToast(`Paid status for claim ${batch.id} revoked. Reverted to Pending Review!`, "info");
          if (viewingBatch?.id === batch.id) {
            setViewingBatch(null);
          }
          loadData();
        } catch (err: any) {
          showToast("Failed to revoke paid status: " + err.message, "error");
        }
      }
    });
  };

  // Transfer Staff Claim to another Admin
  const handleTransferBatch = async () => {
    if (!transferringBatch || !selectedTransferAdminEmail) {
      showToast("Please select a target administrator.", "warning");
      return;
    }

    const targetAdmin = adminsList.find((a) => a.email.toLowerCase() === selectedTransferAdminEmail.toLowerCase());
    const targetAdminName = targetAdmin?.name || selectedTransferAdminEmail;
    setIsTransferring(true);

    try {
      const res = await fetch(`${WORKER_URL}/api/claims/operator/batch/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: transferringBatch.id,
          target_admin_email: selectedTransferAdminEmail,
          target_admin_name: targetAdminName,
          transferred_by: profile?.name || profile?.email || "Admin"
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);

      showToast(`Staff claim ${transferringBatch.id} transferred to ${targetAdminName}!`, "success");
      setTransferringBatch(null);
      setSelectedTransferAdminEmail("");
      if (viewingBatch?.id === transferringBatch.id) {
        setViewingBatch(null);
      }
      loadData();
    } catch (err: any) {
      showToast("Transfer failed: " + err.message, "error");
    } finally {
      setIsTransferring(false);
    }
  };

  // Receive Payment from Finance
  const handleConfirmReceivePayment = async () => {
    if (!receivingPaymentClaim || !paymentReceivedDateInput.trim()) {
      showToast("Please select a valid payment received date.", "warning");
      return;
    }
    setIsProcessingPayment(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/claims/receive-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: receivingPaymentClaim.id,
          payment_received_date: paymentReceivedDateInput.trim(),
          payment_received_by: paymentReceivedByInput.trim() || profile?.name || "Finance",
          payment_received_ref: paymentReceivedRefInput.trim()
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);

      showToast(`Payment received recorded for claim ${receivingPaymentClaim.id}.`, "success");
      setReceivingPaymentClaim(null);
      setPaymentReceivedDateInput("");
      setPaymentReceivedByInput("");
      setPaymentReceivedRefInput("");
      if (viewingClaimDetails?.id === receivingPaymentClaim.id) {
        setViewingClaimDetails((prev) => prev ? {
          ...prev,
          status: "payment_received",
          payment_received_date: paymentReceivedDateInput.trim(),
          payment_received_by: paymentReceivedByInput.trim() || profile?.name || "Finance",
          payment_received_ref: paymentReceivedRefInput.trim()
        } : null);
      }
      loadData();
    } catch (err: any) {
      showToast(`Failed to record payment: ${err.message}`, "error");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRevokeReceivePayment = async (claim: ClaimRecord) => {
    setConfirmDialog({
      open: true,
      title: "Revoke Received Payment?",
      description: `Are you sure you want to revert claim ${claim.id} back to Submitted? This will unlock editing.`,
      confirmText: "Revoke & Unlock",
      variant: "dark",
      onConfirm: async () => {
        try {
          const res = await fetch(`${WORKER_URL}/api/claims/revoke-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: claim.id })
          });
          if (!res.ok) throw new Error(await res.text());
          const resData = await res.json();
          if (resData.error) throw new Error(resData.error);

          showToast(`Claim ${claim.id} reverted to Submitted and editing unlocked.`, "success");
          if (viewingClaimDetails?.id === claim.id) {
            setViewingClaimDetails((prev) => prev ? {
              ...prev,
              status: "active",
              payment_received_date: undefined,
              payment_received_by: undefined,
              payment_received_ref: undefined
            } : null);
          }
          loadData();
        } catch (err: any) {
          showToast(`Failed to revoke payment: ${err.message}`, "error");
        }
      }
    });
  };

  // Delete Submitted Claim
  const handleDeleteSubmittedClaim = (claim: ClaimRecord) => {
    if (!canDelete) {
      showToast("⚠️ You do not have permission to delete records in this module.", "warning");
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Delete Submitted Claim",
      description: `Are you sure you want to permanently delete claim ${claim.id} (${claim.employee_name || "Claim"} • $${Number(claim.total_amount || 0).toFixed(2)})? Any imported staff claims will be restored to the unclaimed pool.`,
      confirmText: "Delete Claim",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`${WORKER_URL}/api/claims/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: claim.id })
          });

          if (!res.ok) throw new Error(await res.text());
          const resData = await res.json();
          if (resData.error) throw new Error(resData.error);

          showToast(`Claim ${claim.id} deleted successfully.`, "success");
          if (viewingClaimDetails?.id === claim.id) {
            setViewingClaimDetails(null);
          }
          loadData();
        } catch (err: any) {
          showToast(`Failed to delete claim: ${err.message}`, "error");
        }
      }
    });
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
      const html2canvas = (window as any).html2canvasPro || (window as any).html2canvas;

      const doc = new jsPDF("p", "mm", "a4");

      const canvasOptions = {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc: Document) => {
          // Normalize any modern CSS colors (lab, oklch) in cloned elements to prevent canvas errors
          const allEls = clonedDoc.querySelectorAll<HTMLElement>("*");
          allEls.forEach((el) => {
            try {
              const comp = window.getComputedStyle(el);
              if (comp.color && (comp.color.includes("lab") || comp.color.includes("oklch"))) {
                el.style.color = "#000000";
              }
              if (comp.backgroundColor && (comp.backgroundColor.includes("lab") || comp.backgroundColor.includes("oklch"))) {
                el.style.backgroundColor = "transparent";
              }
              if (comp.borderColor && (comp.borderColor.includes("lab") || comp.borderColor.includes("oklch"))) {
                el.style.borderColor = "#000000";
              }
            } catch (_) {}
          });
        }
      };

      if (!page1Ref.current) throw new Error("Page 1 ref is empty");
      const canvas1 = await html2canvas(page1Ref.current, canvasOptions);
      const imgData1 = canvas1.toDataURL("image/jpeg", 0.95);
      doc.addImage(imgData1, "JPEG", 0, 0, 210, 297);

      const targetReceipts = recordToPrint ? (recordToPrint.receipts || []) : receiptImages;
      if (targetReceipts.length > 0) {
        // Find all receipt chunk pages rendered offscreen (strictly max 4 pictures per page)
        const receiptPageElements = document.querySelectorAll<HTMLElement>(".receipt-pdf-page");
        for (let i = 0; i < receiptPageElements.length; i++) {
          doc.addPage();
          const canvasReceipt = await html2canvas(receiptPageElements[i], canvasOptions);
          const imgDataReceipt = canvasReceipt.toDataURL("image/jpeg", 0.95);
          doc.addImage(imgDataReceipt, "JPEG", 0, 0, 210, 297);
        }
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
  const receiptChunks: ReceiptImage[][] = [];
  for (let i = 0; i < printReceipts.length; i += 4) {
    receiptChunks.push(printReceipts.slice(i, i + 4));
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
  const rejectedBatchesCount = staffBatches.filter((b) => b.status === "rejected").length;

  const editingClaimRecord = editingClaimId ? claims.find((c) => c.id === editingClaimId) : null;
  const isEditingLocked = editingClaimRecord?.status === "payment_received";

  const tabs: TabItem[] = [
    {
      id: "form",
      label: editingClaimId ? "Edit Claim" : "Claim Form",
      desc: "Official Operations ➔ Finance claim form builder."
    },
    {
      id: "staff_approvals",
      label: `Staff Claims (${pendingApprovalsCount})`,
      desc: "Review operator submissions and pay via PayNow."
    },
    {
      id: "finance_claims",
      label: "Claims Submitted",
      desc: "Submitted official claim reports & payment tracking."
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
        <div className="flex-1 overflow-hidden p-3 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full min-h-0">
            
            {/* LEFT PANEL: CLAIM DETAILS FORM (4 Cols) */}
            <div className="lg:col-span-4 xl:col-span-4 bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col gap-3 overflow-y-auto min-h-0">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-150 pb-2.5 shrink-0">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-900">
                    {editingClaimId ? "Edit Claim" : "Claim Details"}
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {editingClaimId ? `Updating claim ID: ${editingClaimId}` : "Enter claim header info and receipts"}
                  </p>
                </div>

                {editingClaimId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingClaimId(null);
                      handleResetForm();
                    }}
                    className="px-2 py-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>

              {/* Form Inputs */}
              <div className="flex flex-col gap-3 flex-1">
                
                {/* 2-Col Grid: Claim Date & Position */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-700">
                      Claim Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={claimDate}
                      onChange={(e) => setClaimDate(e.target.value)}
                      className="h-9 px-2.5 border border-zinc-300 rounded text-xs text-zinc-800 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-700">
                      Position
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Operations Manager"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="h-9 px-2.5 border border-zinc-300 rounded text-xs text-zinc-800 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] bg-white"
                    />
                  </div>
                </div>

                {/* Company Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="h-9 px-2.5 border border-zinc-300 rounded text-xs text-zinc-800 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] bg-white"
                  />
                </div>

                {/* Site / Project / Dept */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700">
                    Site / Project / Dept *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Operations Department"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    className="h-9 px-2.5 border border-zinc-300 rounded text-xs text-zinc-800 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] bg-white"
                  />
                </div>

                {/* Claiming By (Manager / Supervisor) -> Auto filled */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-700">
                    Claiming By (Manager / Supervisor) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Manager Full Name"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="h-9 px-2.5 border border-zinc-300 rounded text-xs text-zinc-800 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] bg-white"
                  />
                </div>

                {/* Receipt Attachments Section */}
                <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-700 flex items-center justify-between w-full">
                      <span>Receipt Attachments ({receiptImages.length})</span>
                      {receiptImages.length > 0 && (
                        <span className="text-[11px] font-normal text-emerald-600 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </label>
                  </div>

                  {receiptImages.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-zinc-300 hover:border-[#0B57D0] rounded p-4 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors text-center"
                    >
                      <Upload className="w-5 h-5 text-zinc-400" />
                      <span className="text-xs font-medium text-zinc-700">
                        Upload Receipt Photo
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        Click to select and crop receipt
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto border border-slate-200 rounded p-1.5 bg-slate-50/50 max-h-52 min-h-[90px]">
                      {receiptImages.map((file, idx) => {
                        const isStaffClaimReceipt = !!file.batch_id;
                        const isInputDisabled = isStaffClaimReceipt || !!file.extracted;
                        return (
                          <div
                            key={idx}
                            onClick={() => setPreviewingReceiptUrl(file.url || file.src)}
                            className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded shrink-0 hover:bg-slate-50 hover:border-slate-300 transition-colors gap-2 cursor-pointer group shadow-2xs"
                            title="Click to view full receipt photo"
                          >
                            {/* Left: Line #[ ] + Thumbnail Image + Prefix Text + Description */}
                            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                              {/* Line Number Input at the front */}
                              <div
                                className="flex items-center gap-0.5 shrink-0"
                                title="Link to item line #"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-[11px] font-semibold text-zinc-400">#</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={claimRows.length || 8}
                                  value={file.line_number ?? ""}
                                  disabled={isInputDisabled}
                                  placeholder="-"
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                                    setReceiptImages((prev) =>
                                      prev.map((img, i) => (i === idx ? { ...img, line_number: val } : img))
                                    );
                                  }}
                                  className={`w-6 h-6 p-0 text-center text-xs font-semibold rounded border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                    isInputDisabled
                                      ? "bg-zinc-100 text-zinc-500 border-zinc-200 cursor-not-allowed"
                                      : "bg-white text-zinc-900 border-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                                  }`}
                                />
                              </div>

                              {/* Thumbnail preview */}
                              {(file.url || file.src) && (
                                <div className="w-6 h-6 rounded border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                                  <img
                                    src={file.url || file.src}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}

                              {/* Prefix text + Name */}
                              <div className="truncate flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className={`text-[11px] font-semibold shrink-0 ${file.batch_id ? "text-[#0B57D0]" : "text-emerald-700"}`}>
                                    {file.batch_id ? "[Staff Claim]" : "[My Claim]"}
                                  </span>
                                  <span className="text-xs font-medium text-zinc-900 group-hover:text-[#0B57D0] truncate block transition-colors">
                                    {file.item_desc || file.name}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right: [Scan Receipt] [Delete] - Unified height h-7 */}
                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {!isStaffClaimReceipt && (
                                isScanningIndex === idx ? (
                                  <div className="h-7 px-2.5 text-xs text-zinc-500 flex items-center gap-1.5 bg-white border border-slate-200 rounded shrink-0">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B57D0]" />
                                    <span className="text-[11px]">Scanning...</span>
                                  </div>
                                ) : file.extracted ? (
                                  <span className="h-7 px-2.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 rounded border border-emerald-200 flex items-center shrink-0">
                                    Scanned
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => triggerExtraction(idx)}
                                    className="h-7 px-2.5 text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer inline-flex items-center gap-1 transition-colors shrink-0"
                                    title="Scan receipt with OCR"
                                  >
                                    Scan Receipt
                                  </button>
                                )
                              )}

                              {!isStaffClaimReceipt && (
                                confirmDeleteReceiptIdx === idx ? (
                                  <div className="flex items-center gap-1 shrink-0 animate-in fade-in duration-150">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteReceipt(idx);
                                        setConfirmDeleteReceiptIdx(null);
                                      }}
                                      className="h-7 w-7 flex items-center justify-center text-white bg-red-600 hover:bg-red-700 rounded transition-colors cursor-pointer shrink-0 shadow-xs"
                                      title="Confirm Delete"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteReceiptIdx(null)}
                                      className="h-7 w-7 flex items-center justify-center text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded border border-slate-200 transition-colors cursor-pointer shrink-0"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteReceiptIdx(idx)}
                                    className="h-7 w-7 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded border border-slate-200 transition-colors cursor-pointer shrink-0"
                                    title="Delete Receipt"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {receiptImages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1 text-xs font-medium text-[#0B57D0] hover:text-[#0842A0] px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Another Receipt
                    </button>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleReceiptUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

              </div>

            </div>

            {/* RIGHT PANEL: CLAIM PARTICULARS TABLE (8 Cols) */}
            <div className="lg:col-span-8 xl:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-xs min-h-0">
              
              {/* Header Bar */}
              <div className="bg-slate-50/80 border-b border-zinc-200 px-4 py-3 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-900">
                    Claim Particulars ({claimRows.filter(r => r.desc || r.amt).length}/8)
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Itemized expenses list (Maximum 8 items per claim form)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <CustomButton
                    onClick={() => setShowImportModal(true)}
                    variant="secondary"
                    className="h-8 text-xs font-medium border-blue-200 bg-blue-50/60 text-[#0B57D0] hover:bg-blue-100/60 rounded"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Import Reimbursed Staff Claims ({paidStaffClaims.length})
                  </CustomButton>

                  <CustomButton
                    onClick={handleAddClaimRow}
                    variant="secondary"
                    disabled={claimRows.length >= 8}
                    className="h-8 text-xs font-medium rounded"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Item
                  </CustomButton>
                </div>
              </div>

              {/* Scrollable Table */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-slate-50/80 border-b border-zinc-200 sticky top-0 z-10 text-[11px] font-medium text-zinc-500">
                    <tr>
                      <th className="p-3 text-center w-10">#</th>
                      <th className="p-3 w-[38%]">Particulars Description</th>
                      <th className="p-3 text-right w-28">Amount</th>
                      <th className="p-3 text-center w-28">GST Type</th>
                      <th className="p-3">Remarks</th>
                      <th className="p-3 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 text-xs">
                    {claimRows.map((row, idx) => {
                      const isReimbursedStaffRow = !!(row.remark && (row.remark.startsWith("Claim ID:") || row.remark.includes("Claim ID:")));

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/60">
                          <td className="p-2.5 text-center text-xs font-medium text-zinc-400 align-top pt-[18px]">
                            {idx + 1}
                          </td>
                          <td className="p-2 align-top">
                            <textarea
                              rows={1}
                              value={row.desc}
                              onChange={(e) => handleRowChange(row.id, "desc", e.target.value)}
                              placeholder="Particulars description..."
                              className="w-full p-2 border border-zinc-300 rounded text-xs font-normal text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] bg-white resize-none min-h-[38px] leading-normal"
                            />
                          </td>
                          <td className="p-2 align-top">
                            <div className="flex items-center gap-1 bg-white border border-zinc-300 rounded px-2 h-[38px] focus-within:ring-1 focus-within:ring-[#0B57D0] focus-within:border-[#0B57D0]">
                              <span className="text-xs text-zinc-400 select-none">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={row.amt}
                                onChange={(e) => handleRowChange(row.id, "amt", e.target.value)}
                                placeholder="0.00"
                                className="w-full text-xs font-semibold text-zinc-900 focus:outline-none bg-transparent"
                              />
                            </div>
                          </td>
                          <td className="p-2 align-top">
                            <select
                              value={row.type}
                              onChange={(e) => handleRowChange(row.id, "type", e.target.value)}
                              className="h-[38px] w-full px-2 border border-zinc-300 rounded text-xs font-medium text-zinc-800 bg-white focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0]"
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
                              readOnly={isReimbursedStaffRow}
                              onChange={(e) => !isReimbursedStaffRow && handleRowChange(row.id, "remark", e.target.value)}
                              placeholder={isReimbursedStaffRow ? "Staff Claim Remark (Locked)" : "Project remarks..."}
                              className={`w-full p-2 border rounded text-xs font-normal focus:outline-none resize-none min-h-[38px] max-h-[78px] overflow-y-auto leading-normal ${
                                isReimbursedStaffRow
                                  ? "bg-slate-100 text-zinc-600 border-slate-200 cursor-not-allowed select-text"
                                  : "bg-white text-zinc-900 border-zinc-300 focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0]"
                              }`}
                              title={isReimbursedStaffRow ? "Staff reimbursement remarks are compiled and locked from the claim." : undefined}
                            />
                          </td>
                          <td className="p-2 text-center align-top pt-2.5">
                            <button
                              type="button"
                              onClick={() => handleRemoveClaimRow(row.id)}
                              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors shadow-2xs cursor-pointer"
                              title="Delete Item & Linked Receipt"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer Bar */}
              <div className="bg-slate-50/80 border-t border-zinc-200 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 font-medium">
                    Total: <strong className="text-zinc-950 font-semibold">${totals.total}</strong>
                  </span>
                  {Number(totals.gst) > 0 && (
                    <span className="text-[11px] text-zinc-500">
                      (Subtotal: ${totals.before} + GST: ${totals.gst})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <CustomButton
                    onClick={handleResetForm}
                    variant="secondary"
                    className="h-9 px-3 text-xs font-medium rounded"
                  >
                    Reset Form
                  </CustomButton>

                  <CustomButton
                    onClick={handleSaveClaim}
                    variant="default"
                    disabled={!isFormValid || isSavingClaim || isEditingLocked}
                    className={`h-9 px-4 text-xs font-medium rounded bg-[#0B57D0] hover:bg-[#0842A0] text-white ${
                      isEditingLocked ? "opacity-50 cursor-not-allowed bg-zinc-400" : ""
                    }`}
                  >
                    {isSavingClaim ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Submitting...
                      </>
                    ) : isEditingLocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5 mr-1.5" />
                        Locked (Paid)
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        {editingClaimId ? "Update Submit Claim" : `Submit Claim ($${totals.total})`}
                      </>
                    )}
                  </CustomButton>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* TAB 2: STAFF CLAIMS & PAYOUTS (ADMIN / SUPERVISOR) */}
      {activeTab === "staff_approvals" && (
        <div className="flex flex-col flex-1 h-full overflow-hidden gap-3 pb-2 p-3 min-h-0">
          
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
            {/* Left: Sub Tabs Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 bg-slate-100/80 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setStaffSubTab("active")}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    staffSubTab === "active"
                      ? "bg-white text-[#0B57D0] shadow-xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Active Claims ({staffBatches.filter((b) => b.status !== "rejected").length})
                </button>
                <button
                  type="button"
                  onClick={() => setStaffSubTab("rejected")}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    staffSubTab === "rejected"
                      ? "bg-white text-rose-600 shadow-xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  Rejected Claims ({staffBatches.filter((b) => b.status === "rejected").length})
                </button>
              </div>

              {staffSubTab === "active" && (
                <div className="flex items-center p-0.5 bg-slate-100/80 rounded-lg border border-slate-200 text-xs ml-1">
                  <button
                    type="button"
                    onClick={() => setAdminFilter("assigned_to_me")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      adminFilter === "assigned_to_me"
                        ? "bg-white text-[#0B57D0] shadow-xs font-semibold"
                        : "text-zinc-600 hover:text-zinc-900 font-medium"
                    }`}
                  >
                    Assigned to Me
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminFilter("all")}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      adminFilter === "all"
                        ? "bg-white text-[#0B57D0] shadow-xs font-semibold"
                        : "text-zinc-600 hover:text-zinc-900 font-medium"
                    }`}
                  >
                    All
                  </button>
                </div>
              )}
            </div>

            {/* Right: Search Input Bar */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                placeholder="Search Claim ID, staff, details..."
                className="w-full h-9 pl-9 pr-7 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0]"
              />
              {staffSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStaffSearchQuery("")}
                  className="absolute right-2 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-xs min-h-0">
            <div className="flex-1 overflow-auto min-h-0">
              <table className="w-full border-collapse text-left whitespace-nowrap min-w-[1100px]">
                <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-[11px] font-medium text-zinc-500 text-left">Claim ID</th>
                    <th className="p-3 text-[11px] font-medium text-zinc-500 text-left">Status</th>
                    <th className="p-3 text-[11px] font-medium text-zinc-500 text-left">Submit Date</th>
                    <th className="p-3 text-[11px] font-medium text-zinc-500 text-left">Staff Name</th>
                    <th className="p-3 text-[11px] font-medium text-zinc-500 text-right">Claim Amount</th>
                    <th className="p-3 text-[11px] font-medium text-zinc-500 text-left">Paynow to</th>
                    <th className="p-3 text-[11px] font-medium text-zinc-500 text-left">Claim to</th>
                    <th className="p-3 text-[11px] font-medium text-zinc-500 text-left">Paid Date</th>
                    <th className="p-3 text-[11px] font-medium text-zinc-500 text-left">Payment Ref</th>
                    <th className="p-3 text-[11px] font-medium text-zinc-500 text-left">Pay by</th>
                    <th className="p-3 text-[11px] font-medium text-zinc-500 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loadingData ? (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#0B57D0]" />
                          <span className="font-medium text-xs text-zinc-600">Loading submissions...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (() => {
                    const filtered = staffBatches.filter((b) => {
                      if (staffSubTab === "active") {
                        if (b.status === "rejected") return false;
                        if (adminFilter === "assigned_to_me" && profile?.email) {
                          if (b.target_admin_email && b.target_admin_email !== profile.email) return false;
                        }
                      } else {
                        if (b.status !== "rejected") return false;
                      }

                      if (staffSearchQuery.trim()) {
                        const q = staffSearchQuery.toLowerCase();
                        const idMatch = (b.id || "").toLowerCase().includes(q);
                        const empName = b.employee_name || employeesMap[b.employee_id]?.name || "";
                        const nameMatch = empName.toLowerCase().includes(q);
                        const empPayNow = b.paynow_number || employeesMap[b.employee_id]?.paynow_number || employeesMap[b.employee_id]?.phone || "";
                        const paynowMatch = empPayNow.toLowerCase().includes(q);
                        const adminMatch = (b.target_admin_name || b.target_admin_email || "").toLowerCase().includes(q);
                        const itemsMatch = Array.isArray(b.items) && b.items.some((it: any) =>
                          (it.description || "").toLowerCase().includes(q) || (it.remarks || "").toLowerCase().includes(q)
                        );
                        if (!idMatch && !nameMatch && !paynowMatch && !adminMatch && !itemsMatch) return false;
                      }

                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={11} className="p-12 text-center text-zinc-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              {staffSubTab === "rejected" ? (
                                <CheckCircle2 className="w-8 h-8 text-zinc-300" />
                              ) : (
                                <UserCheck className="w-8 h-8 text-zinc-300" />
                              )}
                              <span className="font-medium text-sm text-zinc-600">
                                {staffSearchQuery.trim()
                                  ? `No claims matching "${staffSearchQuery}".`
                                  : staffSubTab === "rejected"
                                  ? "No rejected staff claims found."
                                  : adminFilter === "assigned_to_me"
                                  ? "No active staff claims assigned to you."
                                  : "No active staff claims in approval queue."}
                              </span>
                              {staffSearchQuery.trim() && (
                                <button
                                  type="button"
                                  onClick={() => setStaffSearchQuery("")}
                                  className="text-xs text-[#0B57D0] font-medium hover:underline cursor-pointer"
                                >
                                  Clear search
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((batch) => {
                      const isRejected = batch.status === "rejected";
                      const staffPayNow = batch.paynow_number || employeesMap[batch.employee_id]?.paynow_number || employeesMap[batch.employee_id]?.phone || "";
                      const staffName = batch.employee_name || employeesMap[batch.employee_id]?.name || "Staff";

                      return (
                        <tr
                          key={batch.id}
                          className={`hover:bg-slate-50/70 transition-colors h-11 ${
                            isRejected ? "bg-rose-50/10" : ""
                          }`}
                        >
                          {/* 1. Claim ID */}
                          <td className="p-3 text-left font-mono text-xs text-zinc-700">
                            {batch.id}
                          </td>

                          {/* 2. Status */}
                          <td className="p-3 text-left">
                            {isRejected ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
                                Rejected
                              </span>
                            ) : batch.status === "paid" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <Check className="w-3 h-3" /> Paid
                              </span>
                            ) : batch.status === "claimed_to_finance" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
                                Imported
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                          </td>

                          {/* 3. Submit Date */}
                          <td className="p-3 text-left text-xs text-zinc-700">
                            {formatDateDisplay(batch.claim_date || batch.created_at)}
                          </td>

                          {/* 4. Staff Name */}
                          <td className="p-3 text-left text-xs font-medium text-zinc-900">
                            {staffName}
                          </td>

                          {/* 5. Claim Amount */}
                          <td className="p-3 text-right text-xs font-semibold text-zinc-900 tabular-nums">
                            ${Number(batch.total_amount || 0).toFixed(2)}
                          </td>

                          {/* 6. Paynow to */}
                          <td className="p-3 text-left text-xs font-mono text-zinc-700">
                            {formatCleanPayNow(staffPayNow) || "-"}
                          </td>

                          {/* 7. Claim to */}
                          <td className="p-3 text-left">
                            <div className="flex items-center gap-1.5 max-w-[160px] group/admin">
                              <span className="text-xs text-zinc-700 truncate" title={batch.target_admin_name || batch.target_admin_email || "-"}>
                                {batch.target_admin_name || batch.target_admin_email || "-"}
                              </span>
                              {batch.status === "pending" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTransferringBatch(batch);
                                    setSelectedTransferAdminEmail("");
                                  }}
                                  className="p-1 text-zinc-400 hover:text-[#0B57D0] hover:bg-blue-50 rounded transition-all cursor-pointer shrink-0 opacity-0 group-hover/admin:opacity-100"
                                  title="Transfer claim to another Admin"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 8. Paid Date */}
                          <td className="p-3 text-left text-xs text-zinc-600">
                            {batch.approved_at ? formatDateDisplay(batch.approved_at) : "-"}
                          </td>

                          {/* 9. Payment Ref */}
                          <td className="p-3 text-left">
                            <div className="flex items-center gap-1.5 max-w-[150px] group/ref">
                              <span className="text-xs font-mono text-zinc-600 truncate" title={batch.payment_reference}>
                                {batch.payment_reference || "-"}
                              </span>
                              {batch.payment_reference && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingRefBatch(batch);
                                    setEditingRefInput(batch.payment_reference || "");
                                  }}
                                  className="p-1 text-zinc-400 hover:text-[#0B57D0] hover:bg-blue-50 rounded transition-all cursor-pointer shrink-0 opacity-0 group-hover/ref:opacity-100"
                                  title="Edit Payment Reference"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 10. Pay by */}
                          <td className="p-3 text-left text-xs text-zinc-700">
                            {batch.approved_by || "-"}
                          </td>

                          {/* 11. Action */}
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingBatch(batch)}
                                className="h-7 px-2.5 text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors shrink-0"
                                title="Review Claim Details & Receipts"
                              >
                                <Eye className="w-3.5 h-3.5 text-zinc-500" /> Review Claim
                              </button>

                              {batch.status === "pending" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setApprovingBatch(batch);
                                      setPaynowRefInput("");
                                    }}
                                    className="h-7 px-2.5 text-xs font-medium text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded border border-transparent transition-colors cursor-pointer inline-flex items-center justify-center gap-1 shrink-0"
                                    title="Pay Claim via PayNow"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Pay
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingBatch(batch);
                                      setRejectReasonInput("");
                                    }}
                                    className="h-7 w-7 flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-slate-200 transition-colors cursor-pointer shrink-0"
                                    title="Reject Claim"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {(batch.status === "paid" || batch.status === "claimed_to_finance") && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokePaid(batch)}
                                  className="h-7 px-2.5 text-xs font-medium text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors cursor-pointer inline-flex items-center justify-center gap-1 shrink-0"
                                  title="Revoke paid status"
                                >
                                  <RotateCcw className="w-3 h-3" /> Revoke
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3 & 4: OFFICIAL FINANCE CLA      {/* TAB 3: OFFICIAL CLAIMS SUBMITTED */}
      {activeTab === "finance_claims" && (
        <div className="flex flex-col flex-1 h-full overflow-hidden gap-3 pb-2">
          
          <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-xs shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search submitted claims by ID, project, claimant..."
                className="w-full pl-9 pr-8 py-1.5 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0] bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
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
                New Claim Form
              </CustomButton>
            </div>
          </div>

          <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-xs min-h-0">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-left table-fixed">
                <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-xs font-semibold text-zinc-600 w-[13%] text-left">Claim Date</th>
                    <th className="p-3 text-xs font-semibold text-zinc-600 w-[23%] text-left">Claim Header</th>
                    <th className="p-3 text-xs font-semibold text-zinc-600 w-[12%] text-left">Claim Amount</th>
                    <th className="p-3 text-xs font-semibold text-zinc-600 w-[15%] text-left">Status</th>
                    <th className="p-3 text-xs font-semibold text-zinc-600 w-[37%] text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loadingData ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#0B57D0]" />
                          <span className="font-medium text-xs text-zinc-600">Loading submitted claims...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (() => {
                    const filteredClaims = claims.filter((claim) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase();
                      const idMatch = (claim.id || "").toLowerCase().includes(q);
                      const projMatch = (claim.project_department || "").toLowerCase().includes(q);
                      const empMatch = (claim.employee_name || "").toLowerCase().includes(q);
                      const compMatch = (claim.company_name || "").toLowerCase().includes(q);
                      const payerMatch = (claim.payment_received_by || "").toLowerCase().includes(q);
                      const rowsMatch = Array.isArray(claim.claim_rows) && claim.claim_rows.some((r) =>
                        (r.desc || "").toLowerCase().includes(q) || (r.remark || "").toLowerCase().includes(q)
                      );
                      return idMatch || projMatch || empMatch || compMatch || payerMatch || rowsMatch;
                    });

                    if (filteredClaims.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="p-12 text-center text-zinc-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <FileText className="w-8 h-8 text-zinc-300" />
                              <span className="font-medium text-sm text-zinc-600">
                                {searchQuery.trim()
                                  ? `No claims matching "${searchQuery}".`
                                  : "No submitted claims found."}
                              </span>
                              {searchQuery.trim() && (
                                <button
                                  type="button"
                                  onClick={() => setSearchQuery("")}
                                  className="text-xs text-[#0B57D0] font-medium hover:underline cursor-pointer"
                                >
                                  Clear search
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return filteredClaims.map((claim) => {
                      const isPaidReceived = claim.status === "payment_received";

                      return (
                        <tr key={claim.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => setViewingClaimDetails(claim)}>
                          {/* 1. Claim Date & ID */}
                          <td className="p-3 text-left">
                            <div className="flex flex-col">
                              <span className="font-medium text-zinc-900 text-xs flex items-center gap-1.5 whitespace-nowrap">
                                <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                {formatDateDisplay(claim.claim_date)}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono pl-5 whitespace-nowrap mt-0.5">
                                {claim.id}
                              </span>
                            </div>
                          </td>

                          {/* 2. Claim Header */}
                          <td className="p-3 text-left">
                            <span className="font-medium text-zinc-900 block truncate">
                              {claim.project_department || "General Operations"}
                            </span>
                            <span className="text-[11px] text-zinc-600 block mt-0.5 truncate">
                              Claimant: <strong className="text-zinc-800">{claim.employee_name || "-"}</strong> {claim.position ? `(${claim.position})` : ""}
                            </span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5 truncate">
                              {claim.company_name}
                            </span>
                          </td>

                          {/* 3. Claim Amount */}
                          <td className="p-3 text-left">
                            <span className="font-semibold text-zinc-950 text-sm whitespace-nowrap block">
                              ${Number(claim.total_amount || 0).toFixed(2)}
                            </span>
                            {Number(claim.gst_amount || 0) > 0 && (
                              <span className="text-[10px] text-zinc-500 whitespace-nowrap block">
                                GST: ${Number(claim.gst_amount || 0).toFixed(2)}
                              </span>
                            )}
                          </td>

                          {/* 4. Status */}
                          <td className="p-3 text-left">
                            {isPaidReceived ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit whitespace-nowrap">
                                  <Check className="w-3 h-3" /> Payment Received
                                </span>
                                {claim.payment_received_date && (
                                  <span className="text-[10px] text-emerald-800 font-medium whitespace-nowrap">
                                    Date: {formatDateDisplay(claim.payment_received_date)}
                                  </span>
                                )}
                                {claim.payment_received_by && (
                                  <span className="text-[10px] text-zinc-500 truncate" title={claim.payment_received_by}>
                                    By: {claim.payment_received_by}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-[#0B57D0] border border-blue-200 w-fit whitespace-nowrap">
                                <Clock className="w-3 h-3" /> Submitted
                              </span>
                            )}
                          </td>

                          {/* 5. Action */}
                          <td className="p-3 text-left" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-start gap-1 flex-nowrap whitespace-nowrap">
                              <button
                                onClick={() => setViewingClaimDetails(claim)}
                                className="px-2 py-1 rounded-md bg-white hover:bg-slate-50 text-zinc-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                                title="View Itemized Particulars & Receipts"
                              >
                                <Eye className="w-3.5 h-3.5 text-zinc-500" /> Details
                              </button>

                              <button
                                onClick={() => handleGeneratePDF(claim)}
                                disabled={isGenerating}
                                className="px-2 py-1 rounded-md bg-white hover:bg-slate-50 text-zinc-700 text-xs font-medium border border-slate-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                                title="Print Official PDF Claim Form"
                              >
                                <Printer className="w-3.5 h-3.5 text-zinc-500" /> Print
                              </button>

                              {isPaidReceived ? (
                                <button
                                  disabled
                                  className="px-2 py-1 rounded-md bg-zinc-100 text-zinc-400 border border-zinc-200 text-xs font-medium cursor-not-allowed flex items-center gap-1 shrink-0 whitespace-nowrap"
                                  title="Editing is locked because payment has been received"
                                >
                                  <Lock className="w-3 h-3" /> Edit
                                </button>
                              ) : (
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
                                  className="px-2 py-1 rounded-md bg-white hover:bg-blue-50 text-[#0B57D0] border border-blue-200 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                                  title="Edit Claim"
                                >
                                  <Edit className="w-3 h-3" /> Edit
                                </button>
                              )}

                              {!isPaidReceived ? (
                                <button
                                  onClick={() => {
                                    setReceivingPaymentClaim(claim);
                                    setPaymentReceivedDateInput(new Date().toISOString().split("T")[0]);
                                    setPaymentReceivedByInput(profile?.name || "Finance");
                                    setPaymentReceivedRefInput("");
                                  }}
                                  className="px-2.5 py-1 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                                  title="Record payment received from Finance"
                                >
                                  <Check className="w-3 h-3" /> Receive Payment
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRevokeReceivePayment(claim)}
                                  className="px-2 py-1 rounded-md bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                                  title="Revoke payment received status and unlock editing"
                                >
                                  <RotateCcw className="w-3 h-3" /> Revoke
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteSubmittedClaim(claim)}
                                className="px-2 py-1 rounded-md bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
                                title="Delete Submitted Claim"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* IMPORT PAID STAFF CLAIMS MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-pop-in">
            <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Import Reimbursed Staff Claims</h3>
                <span className="text-xs text-zinc-500">
                  Select staff claims you previously paid out of pocket to import into the official Finance claim form.
                </span>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-3">
              {paidStaffClaims.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 flex flex-col items-center justify-center gap-2">
                  <CreditCard className="w-8 h-8 text-zinc-300" />
                  <span className="text-xs font-semibold text-zinc-700">No unreimbursed paid staff claims available.</span>
                  <p className="text-xs text-zinc-400 max-w-sm text-center">
                    Only operator claims that have been reviewed and marked as Paid in the <strong>Staff Claims</strong> tab will appear here for Finance reimbursement.
                  </p>
                </div>
              ) : (
                paidStaffClaims.map((batch) => {
                  const isSelected = selectedImportBatchIds.has(batch.id);
                  const itemsList = Array.isArray(batch.items) ? batch.items : [];
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
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col gap-2.5 ${
                        isSelected
                          ? "bg-blue-50/50 border-[#0B57D0]"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-zinc-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <span className="font-semibold text-xs text-zinc-900 block">
                              {batch.employee_name || "Staff"} ({batch.id})
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              Claim Date: {formatDateDisplay(batch.claim_date)} • {itemsList.length} item(s)
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-semibold text-sm text-zinc-950 block">
                            ${Number(batch.total_amount || 0).toFixed(2)}
                          </span>
                          {batch.payment_reference && (
                            <span className="text-[10px] font-mono text-zinc-400">
                              Ref: {batch.payment_reference}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Item Breakdown & Receipt Previews */}
                      <div className="bg-slate-50 p-2 rounded-md border border-slate-200 divide-y divide-slate-200/60 text-xs">
                        {itemsList.map((it, iIdx) => (
                          <div key={iIdx} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-[10px] text-zinc-400 font-mono">#{iIdx + 1}</span>
                              <span className="font-medium text-zinc-800 text-xs truncate">{it.description}</span>
                              {it.remarks && (
                                <span className="text-[10px] text-zinc-400 italic truncate hidden sm:inline">
                                  ({it.remarks})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-semibold text-zinc-900 text-xs">
                                ${Number(it.amount || 0).toFixed(2)}
                              </span>
                              {it.receipt_url && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewingReceiptUrl(it.receipt_url);
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-white hover:bg-blue-50 text-[#0B57D0] text-[10px] font-medium border border-slate-200 cursor-pointer flex items-center gap-0.5"
                                  title="Preview Receipt Photo"
                                >
                                  <Eye className="w-3 h-3" /> Photo
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-600">
                {selectedImportBatchIds.size} claim(s) selected
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

      {/* BATCH CLAIM DETAILS MODAL (SIMPLIFIED FULL-WIDTH RECEIPT & DETAILS ON TOP) */}
      {viewingBatch && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-pop-in">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900">
                      {viewingBatch.employee_name || "Staff"}
                    </h3>
                    {viewingBatch.status === "paid" || viewingBatch.status === "claimed_to_finance" ? (
                      <span className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-800 rounded border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Paid
                      </span>
                    ) : viewingBatch.status === "rejected" ? (
                      <span className="px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-800 rounded border border-rose-200 flex items-center gap-1">
                        <Ban className="w-3 h-3" /> Rejected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-800 rounded border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    Submitted on {formatDateDisplay(viewingBatch.claim_date || viewingBatch.created_at)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block">Total Amount</span>
                  <span className="font-semibold text-base text-zinc-900 block tabular-nums">
                    ${Number(viewingBatch.total_amount || 0).toFixed(2)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingBatch(null)}
                  className="w-7 h-7 rounded-md hover:bg-slate-200/70 flex items-center justify-center text-zinc-500 hover:text-zinc-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-banner: References or Rejection Alerts */}
            {(viewingBatch.payment_reference || viewingBatch.reject_reason) && (
              <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 text-xs shrink-0 flex items-center justify-between">
                {viewingBatch.payment_reference && (
                  <span className="text-emerald-800 font-mono text-xs">
                    Ref: <strong>{viewingBatch.payment_reference}</strong>
                  </span>
                )}
                {viewingBatch.reject_reason && (
                  <span className="text-rose-700 text-xs">
                    Reason: {viewingBatch.reject_reason}
                  </span>
                )}
              </div>
            )}

            {/* Modal Body: Scrollable Itemized List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50/50">
              <div className="flex items-center justify-between text-xs text-zinc-500 font-medium px-0.5">
                <span>{(viewingBatch.items || []).length} Expense Item{(viewingBatch.items || []).length !== 1 ? "s" : ""}</span>
              </div>

              <div className="flex flex-col gap-4">
                {(viewingBatch.items || []).map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs flex flex-col"
                  >
                    {/* Item Details on Top */}
                    <div className="p-3.5 flex items-start justify-between gap-4 bg-white">
                      {/* Left: Description & Remark */}
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="w-5 h-5 rounded bg-slate-100 text-zinc-700 text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-zinc-900 text-xs">
                              {item.description}
                            </span>
                            {item.project_department && (
                              <span className="text-[10px] text-zinc-500 font-medium">
                                • {item.project_department}
                              </span>
                            )}
                          </div>
                          {item.remarks && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {item.remarks}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Date & Amount */}
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span className="text-xs text-zinc-500">
                          {formatDateDisplay(item.date)}
                        </span>
                        <span className="font-semibold text-zinc-900 text-sm tabular-nums mt-0.5">
                          ${Number(item.amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Full-width Receipt Photo Underneath */}
                    {item.receipt_url ? (
                      <div
                        onClick={() => setPreviewingReceiptUrl(item.receipt_url)}
                        className="w-full bg-slate-100/70 border-t border-slate-200 p-2 flex items-center justify-center cursor-pointer group relative"
                        title="Click to zoom receipt"
                      >
                        <img
                          src={item.receipt_url}
                          alt={item.description}
                          className="max-w-full max-h-[460px] w-auto h-auto object-contain rounded group-hover:opacity-95 transition-opacity"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                            const parent = e.currentTarget.parentElement;
                            if (parent && !parent.querySelector(".img-fallback")) {
                              const fb = document.createElement("div");
                              fb.className = "img-fallback w-full py-6 flex flex-col items-center justify-center text-zinc-400 text-xs text-center";
                              fb.innerHTML = '<span class="font-medium text-rose-500">Image Missing</span><span class="text-[10px] text-zinc-400 mt-0.5">Please re-upload</span>';
                              parent.appendChild(fb);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center text-zinc-400 text-xs gap-1.5">
                        <FileText className="w-4 h-4 text-zinc-300" />
                        <span>No receipt attached</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer: Only Close Button */}
            <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200 flex justify-end shrink-0">
              <CustomButton variant="secondary" onClick={() => setViewingBatch(null)}>
                Close
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* SUBMITTED FINANCE CLAIM DETAILS MODAL */}
      {viewingClaimDetails && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-pop-in">
            {/* Header */}
            <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-950 font-mono">
                    {viewingClaimDetails.id}
                  </h3>
                  {viewingClaimDetails.status === "payment_received" ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Payment Received
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-50 text-[#0B57D0] border border-blue-200 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Submitted
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-zinc-500">
                  <span>Project: <strong className="text-zinc-700">{viewingClaimDetails.project_department || "General Operations"}</strong></span>
                  <span>•</span>
                  <span>Claimant: <strong className="text-zinc-700">{viewingClaimDetails.employee_name}</strong></span>
                  <span>•</span>
                  <span>Company: <strong className="text-zinc-700">{viewingClaimDetails.company_name}</strong></span>
                  <span>•</span>
                  <span>Date: <strong className="text-zinc-700">{formatDateDisplay(viewingClaimDetails.claim_date)}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setViewingClaimDetails(null)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              
              {/* Payment Summary Info Banner */}
              {viewingClaimDetails.status === "payment_received" && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-emerald-950 block">Payment Received & Locked</span>
                      <span className="text-xs text-emerald-800">
                        Paid on {formatDateDisplay(viewingClaimDetails.payment_received_date)} • Processed by {viewingClaimDetails.payment_received_by || "Finance"}
                        {viewingClaimDetails.payment_received_ref && ` (Ref: ${viewingClaimDetails.payment_received_ref})`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeReceivePayment(viewingClaimDetails)}
                    className="px-2.5 py-1 rounded-md bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Unlock & Revoke
                  </button>
                </div>
              )}

              {/* Itemized Particulars Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-zinc-800">
                    Itemized Claim Particulars ({(viewingClaimDetails.claim_rows || []).length})
                  </h4>
                  <span className="text-xs font-medium text-zinc-700">
                    Net Total: <strong className="text-zinc-950 text-sm font-semibold">${Number(viewingClaimDetails.total_amount || 0).toFixed(2)}</strong>
                  </span>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-zinc-600 font-semibold w-12 text-center">#</th>
                        <th className="p-2.5 text-zinc-600 font-semibold">Description</th>
                        <th className="p-2.5 text-zinc-600 font-semibold w-24 text-center">Type</th>
                        <th className="p-2.5 text-zinc-600 font-semibold w-28 text-right">Amount</th>
                        <th className="p-2.5 text-zinc-600 font-semibold w-48">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(viewingClaimDetails.claim_rows || []).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 text-center text-zinc-400 font-medium">{idx + 1}</td>
                          <td className="p-2.5 font-medium text-zinc-900">{row.desc || "—"}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md ${
                              row.type === "INCL" ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-slate-100 text-zinc-700"
                            }`}>
                              {row.type || "EXCL"}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-semibold text-zinc-900 font-mono">
                            ${Number(row.amt || 0).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-zinc-500 font-normal">{row.remark || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Supporting Document Receipts Gallery */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-800 mb-2">
                  Supporting Document Receipts ({(viewingClaimDetails.receipts || []).length})
                </h4>
                {(viewingClaimDetails.receipts || []).length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-xs text-zinc-400">
                    No receipt images attached to this claim.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {viewingClaimDetails.receipts.map((rc, idx) => {
                      const imgUrl = rc.url || rc.src;
                      return (
                        <div
                          key={idx}
                          onClick={() => imgUrl && setPreviewingReceiptUrl(imgUrl)}
                          className="group relative border border-slate-200 rounded-lg overflow-hidden bg-slate-100 aspect-3/4 flex flex-col cursor-pointer hover:border-[#0B57D0] transition-colors shadow-2xs"
                        >
                          <div className="flex-1 overflow-hidden relative">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={rc.name || `Receipt #${idx + 1}`}
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                  const parent = e.currentTarget.parentElement;
                                  if (parent && !parent.querySelector(".img-fallback")) {
                                    const fb = document.createElement("div");
                                    fb.className = "img-fallback w-full h-full flex flex-col items-center justify-center text-zinc-400 text-[10px] text-center p-2 bg-slate-100";
                                    fb.innerHTML = '<span class="text-[10px] font-semibold text-rose-500">Image Missing</span><span class="text-[8px] text-zinc-400 mt-0.5">Please re-upload</span>';
                                    parent.appendChild(fb);
                                  }
                                }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                <FileText className="w-8 h-8" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-medium gap-1 backdrop-blur-[1px]">
                              <Eye className="w-5 h-5" />
                              <span>Click to Zoom</span>
                            </div>
                          </div>
                          <div className="p-2 bg-white border-t border-slate-100 text-[10px] text-zinc-600 truncate font-medium">
                            {rc.name || `Receipt #${idx + 1}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* Footer Actions */}
            <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                Created: {formatDateDisplay(viewingClaimDetails.created_at)}
              </span>
              <div className="flex items-center gap-2">
                <CustomButton
                  variant="danger"
                  onClick={() => handleDeleteSubmittedClaim(viewingClaimDetails)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </CustomButton>
                <CustomButton
                  variant="secondary"
                  onClick={() => handleGeneratePDF(viewingClaimDetails)}
                  disabled={isGenerating}
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Print PDF
                </CustomButton>
                <CustomButton
                  variant="default"
                  onClick={() => setViewingClaimDetails(null)}
                >
                  Close
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECEIVE PAYMENT MODAL */}
      {receivingPaymentClaim && (
        <div className="fixed inset-0 z-[155] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-pop-in">
            <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Record Payment Received</h3>
                <span className="text-xs text-zinc-500 font-mono">Claim ID: {receivingPaymentClaim.id}</span>
              </div>
              <button
                onClick={() => setReceivingPaymentClaim(null)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Claimant</span>
                  <span className="text-xs font-semibold text-zinc-900">{receivingPaymentClaim.employee_name}</span>
                  <span className="text-[11px] text-zinc-500 block">{receivingPaymentClaim.project_department || "General"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Net Claim Amount</span>
                  <span className="text-base font-semibold text-zinc-950">
                    ${Number(receivingPaymentClaim.total_amount || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">
                  Payment Received Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentReceivedDateInput}
                  onChange={(e) => setPaymentReceivedDateInput(e.target.value)}
                  className="h-9 px-3 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0] bg-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">
                  Processed / Paid By
                </label>
                <input
                  type="text"
                  placeholder="e.g. Finance / Admin Name"
                  value={paymentReceivedByInput}
                  onChange={(e) => setPaymentReceivedByInput(e.target.value)}
                  className="h-9 px-3 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0] bg-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">
                  Transaction / Bank Ref (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TR-987654321"
                  value={paymentReceivedRefInput}
                  onChange={(e) => setPaymentReceivedRefInput(e.target.value)}
                  className="h-9 px-3 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0] bg-white"
                />
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Recording payment will mark this claim as <strong>Payment Received</strong> and lock it from further editing.
                </span>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-200 flex justify-end gap-2">
              <CustomButton variant="secondary" onClick={() => setReceivingPaymentClaim(null)}>
                Cancel
              </CustomButton>
              <CustomButton
                variant="default"
                disabled={!paymentReceivedDateInput || isProcessingPayment}
                onClick={handleConfirmReceivePayment}
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Confirm & Lock Claim
                  </>
                )}
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER CLAIM BATCH MODAL */}
      {transferringBatch && (
        <div className="fixed inset-0 z-[155] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-pop-in">
            <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Transfer Staff Claim</h3>
                <span className="text-xs text-zinc-500">Reassign claim {transferringBatch.id} to another manager</span>
              </div>
              <button
                onClick={() => setTransferringBatch(null)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex flex-col gap-1">
                <span className="font-semibold text-zinc-700 block">Claim Details:</span>
                <span className="text-zinc-900 font-medium">
                  {transferringBatch.employee_name || "Staff"} • ${Number(transferringBatch.total_amount || 0).toFixed(2)}
                </span>
                <span className="text-zinc-500 text-[11px] block mt-0.5">
                  Currently Assigned To: <strong>{transferringBatch.target_admin_name || transferringBatch.target_admin_email || "Me"}</strong>
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">
                  Select Target Administrator / Supervisor *
                </label>
                <select
                  value={selectedTransferAdminEmail}
                  onChange={(e) => setSelectedTransferAdminEmail(e.target.value)}
                  className="h-9 px-3 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 bg-white focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0]"
                >
                  <option value="">-- Choose Administrator --</option>
                  {adminsList
                    .filter((a) => a.email.toLowerCase() !== (transferringBatch.target_admin_email || "").toLowerCase())
                    .map((admin) => (
                      <option key={admin.email} value={admin.email}>
                        {admin.name} ({admin.email})
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-zinc-500">
                  The selected administrator will now have responsibility to review and pay this claim.
                </span>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-200 flex justify-end gap-2">
              <CustomButton variant="secondary" onClick={() => setTransferringBatch(null)}>
                Cancel
              </CustomButton>
              <CustomButton
                variant="default"
                disabled={!selectedTransferAdminEmail || isTransferring}
                onClick={handleTransferBatch}
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    Confirm Transfer
                  </>
                )}
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* FULL RECEIPT IMAGE PREVIEW MODAL */}
      {previewingReceiptUrl && (
        <div
          onClick={() => setPreviewingReceiptUrl(null)}
          className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-pop-in cursor-default"
          >
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900">Receipt Image Preview</span>
              <button
                onClick={() => setPreviewingReceiptUrl(null)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[75vh] bg-slate-100">
              <img
                src={previewingReceiptUrl}
                alt="Receipt Full Preview"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* APPROVE PAYOUT MODAL */}
      {approvingBatch && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-pop-in">
            <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">Approve & Mark PayNow Payout</h3>
              <button
                onClick={() => setApprovingBatch(null)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Send PayNow To</span>
                  <span className="text-xs font-semibold text-zinc-900">{approvingBatch.employee_name}</span>
                  <span className="text-xs font-mono font-medium text-emerald-700 block mt-0.5">{formatCleanPayNow(employeesMap[approvingBatch.employee_id]?.paynow_number || employeesMap[approvingBatch.employee_id]?.phone) || "No PayNow"}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Payout Amount</span>
                  <span className="text-base font-semibold text-zinc-950">${Number(approvingBatch.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">
                  Payment Reference / Transaction ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PN-123456789"
                  value={paynowRefInput}
                  onChange={(e) => setPaynowRefInput(e.target.value)}
                  className="h-9 px-3 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0] bg-white font-mono"
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-200 flex justify-end gap-2">
              <CustomButton variant="secondary" onClick={() => setApprovingBatch(null)}>
                Cancel
              </CustomButton>
              <CustomButton
                variant="default"
                disabled={!paynowRefInput.trim()}
                onClick={handleApproveBatch}
              >
                Confirm Payout & Approve
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PAYMENT REFERENCE MODAL */}
      {editingRefBatch && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden flex flex-col animate-pop-in">
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Edit Payment Reference</h3>
                <span className="text-[11px] text-zinc-500 font-mono">Claim ID: {editingRefBatch.id}</span>
              </div>
              <button
                onClick={() => setEditingRefBatch(null)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">
                  Transaction Reference ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PN-123456789"
                  value={editingRefInput}
                  onChange={(e) => setEditingRefInput(e.target.value)}
                  className="h-9 px-3 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0] bg-white font-mono"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200 flex justify-end gap-2">
              <CustomButton variant="secondary" onClick={() => setEditingRefBatch(null)}>
                Cancel
              </CustomButton>
              <CustomButton
                variant="default"
                disabled={!editingRefInput.trim() || isUpdatingRef}
                onClick={handleSavePaymentRef}
              >
                {isUpdatingRef ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Save Reference
                  </>
                )}
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingBatch && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-pop-in">
            <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">Reject Staff Claim</h3>
              <button
                onClick={() => setRejectingBatch(null)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <p className="text-xs text-zinc-600">
                Rejecting claim <strong>{rejectingBatch.id}</strong> will return all included expenses to the operator so they can make corrections and resubmit.
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-zinc-600">
                  Rejection Reason / Feedback *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Receipt photo is blurry, amount mismatch"
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  className="p-3 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0] bg-white resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-200 flex justify-end gap-2">
              <CustomButton variant="secondary" onClick={() => setRejectingBatch(null)}>
                Cancel
              </CustomButton>
              <CustomButton variant="danger" onClick={handleRejectBatch}>
                Reject Claim
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* CROP & ROTATE MODAL */}
      {showCropModal && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-pop-in">
            <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-900">
                Crop & Rotate Receipt
              </h3>
              <button
                onClick={() => setShowCropModal(false)}
                className="w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-grow p-6 bg-slate-100 flex items-center justify-center overflow-hidden min-h-[300px] max-h-[50vh]">
              <div className="w-full h-full max-h-[350px] flex justify-center items-center">
                <img
                  ref={imageRef}
                  src={cropSrc}
                  alt="To Crop"
                  style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col gap-4">
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={() => {
                    const rot = (baseRotation - 90) % 360;
                    setBaseRotation(rot);
                    cropperRef.current?.rotateTo(rot + fineRotation);
                  }}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center justify-center cursor-pointer"
                  title="Rotate Left 90°"
                >
                  <RotateCcw className="w-4 h-4 text-zinc-700" />
                </button>

                <div className="flex items-center gap-3 flex-grow max-w-xs">
                  <span className="text-xs font-medium text-zinc-500">Angle</span>
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
                    className="w-full accent-[#0B57D0] h-1 rounded-lg bg-slate-200 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-medium text-zinc-600 w-10 text-right">{fineRotation}°</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const rot = (baseRotation + 90) % 360;
                    setBaseRotation(rot);
                    cropperRef.current?.rotateTo(rot + fineRotation);
                  }}
                  className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center justify-center cursor-pointer"
                  title="Rotate Right 90°"
                >
                  <RotateCw className="w-4 h-4 text-zinc-700" />
                </button>
              </div>

              <div className="flex justify-end gap-2">
                <CustomButton variant="secondary" onClick={() => setShowCropModal(false)}>
                  Cancel
                </CustomButton>
                <CustomButton variant="default" onClick={applyCrop}>
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

          {/* SUPPORTING DOCUMENTS (RECEIPTS) - 4 PICTURES PER PAGE (2x2 GRID) */}
          {receiptChunks.map((chunk, chunkIdx) => (
            <div
              key={`receipt-page-${chunkIdx}`}
              className="pdf-page receipt-pdf-page page-break"
              style={{
                width: "794px",
                height: "1123px",
                padding: "32px",
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
                  <div style={{ textAlign: "center", marginBottom: "12px", borderBottom: "1.5px solid #000000", paddingBottom: "6px" }}>
                    <h2 style={{ fontSize: "13px", fontWeight: "bold", textDecoration: "underline", textTransform: "uppercase", margin: 0, letterSpacing: "0.5px" }}>
                      Supporting Documents (Receipts) {receiptChunks.length > 1 ? `- Page ${chunkIdx + 1} of ${receiptChunks.length}` : ""}
                    </h2>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      width: "100%",
                    }}
                  >
                    {chunk.map((file: any, idx: number) => {
                      const overallIndex = chunkIdx * 4 + idx + 1;

                      // Accurately resolve matching row from activePrintData.claim_rows
                      let matchingRow: any = null;
                      let lineNum = 1;

                      if (file.batch_id) {
                        // This receipt belongs to an imported staff batch
                        const batchRowIdx = activePrintData.claim_rows.findIndex((r) => r.remark && r.remark.includes(file.batch_id));
                        if (batchRowIdx !== -1) {
                          matchingRow = activePrintData.claim_rows[batchRowIdx];
                          lineNum = batchRowIdx + 1;
                        } else {
                          matchingRow = activePrintData.claim_rows.find((r) => r.id === file.line_number) || activePrintData.claim_rows[0];
                          const foundIdx = activePrintData.claim_rows.indexOf(matchingRow);
                          lineNum = foundIdx !== -1 ? foundIdx + 1 : (file.line_number || 1);
                        }
                      } else {
                        // This receipt is a direct/manual receipt uploaded by admin
                        if (file.line_number) {
                          const exactRowIdx = activePrintData.claim_rows.findIndex((r) => r.id === file.line_number);
                          if (exactRowIdx !== -1) {
                            matchingRow = activePrintData.claim_rows[exactRowIdx];
                            lineNum = exactRowIdx + 1;
                          }
                        }

                        if (!matchingRow) {
                          // Map this manual receipt by its relative index among all non-batch receipts
                          const nonBatchReceipts = (activePrintData.receipts || []).filter((r: any) => !r.batch_id);
                          const manualReceiptIdx = nonBatchReceipts.indexOf(file);
                          const nonBatchRows = activePrintData.claim_rows.filter((r) => !r.remark || !r.remark.includes("Claim ID:"));
                          
                          matchingRow = nonBatchRows[manualReceiptIdx] || nonBatchRows[nonBatchRows.length - 1] || activePrintData.claim_rows[activePrintData.claim_rows.length - 1];
                          const foundIdx = activePrintData.claim_rows.indexOf(matchingRow);
                          lineNum = foundIdx !== -1 ? foundIdx + 1 : (manualReceiptIdx + 1);
                        }
                      }

                      const staffName = file.staff_name || activePrintData.employee_name;
                      const claimId = file.batch_id || "";

                      // Filter out raw image filenames (e.g. .jpg, .png) and display genuine expense description
                      const isImageFileName = (str?: string) => {
                        if (!str) return true;
                        return /\.(jpg|jpeg|png|gif|webp|pdf|heic)$/i.test(str.trim()) || /^receipt_\d+/i.test(str.trim()) || /^crop_\d+/i.test(str.trim());
                      };

                      const description = file.item_desc && !isImageFileName(file.item_desc)
                        ? file.item_desc
                        : (matchingRow && matchingRow.desc ? matchingRow.desc : (file.name && !isImageFileName(file.name) ? file.name : `Expense Item #${lineNum}`));

                      const remarks = file.item_remarks || (matchingRow && matchingRow.remark ? matchingRow.remark : "");
                      const amount = (file.item_amt !== undefined && file.item_amt !== null && file.item_amt !== "")
                        ? file.item_amt
                        : (matchingRow && matchingRow.amt ? matchingRow.amt : undefined);

                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            border: "1.5px solid #cbd5e1",
                            borderRadius: "6px",
                            backgroundColor: "#ffffff",
                            overflow: "hidden",
                            height: "475px",
                            boxSizing: "border-box",
                          }}
                        >
                          {/* Receipt Details Header Banner */}
                          <div
                            style={{
                              backgroundColor: "#f8fafc",
                              borderBottom: "1px solid #cbd5e1",
                              padding: "6px 8px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "3px",
                              fontSize: "9px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: "bold", color: "#334155" }}>
                                Staff: <strong style={{ color: "#0f172a" }}>{staffName}</strong>
                              </span>
                              {amount !== undefined && amount !== null && amount !== "" && (
                                <span style={{ fontFamily: "monospace", color: "#0B57D0", fontWeight: "bold", fontSize: "10.5px" }}>
                                  ${Number(amount).toFixed(2)}
                                </span>
                              )}
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <span style={{ fontWeight: "bold", color: "#0f172a", fontSize: "9.5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "330px" }}>
                                Item #{lineNum}: {description}
                              </span>
                            </div>

                            {remarks && (
                              <div style={{ fontSize: "8.5px", color: "#475569", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "330px" }}>
                                Remark: {remarks}
                              </div>
                            )}
                          </div>

                          {/* Receipt Image Box */}
                          <div
                            style={{
                              flex: 1,
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              overflow: "hidden",
                              backgroundColor: "#ffffff",
                              padding: "4px",
                              boxSizing: "border-box",
                            }}
                          >
                            {file.url || file.src ? (
                              <img
                                src={file.url || file.src}
                                alt={file.name}
                                crossOrigin="anonymous"
                                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                              />
                            ) : (
                              <div style={{ color: "#94a3b8", fontSize: "9px", fontStyle: "italic" }}>
                                No receipt image
                              </div>
                            )}
                          </div>

                          {/* Bottom Footer Bar: Claim ID (for reimbursed claims) or Line Item Ref (for direct claims) */}
                          <div
                            style={{
                              backgroundColor: "#f8fafc",
                              borderTop: "1px solid #cbd5e1",
                              padding: "4px 8px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "8.5px",
                              color: "#475569",
                            }}
                          >
                            {claimId ? (
                              <>
                                <span>Claim ID: <strong style={{ color: "#0B57D0" }}>{claimId}</strong></span>
                                {file.item_date && <span>Date: {formatDateDisplay(file.item_date)}</span>}
                              </>
                            ) : (
                              <>
                                <span>Line Particulars Ref: <strong style={{ color: "#0f172a" }}>Item #{lineNum}</strong></span>
                                <span>Date: {formatDateDisplay(file.item_date || activePrintData.claim_date)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "center",
                    fontSize: "8px",
                    color: "#94a3b8",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    marginTop: "8px",
                  }}
                >
                  {chunkIdx === receiptChunks.length - 1 ? "End of Supporting Documents" : `Continued on Page ${chunkIdx + 2}...`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}

// Alias for backwards compatibility
export const ClaimFormGeneratorModule = FinanceClaimsModule;
