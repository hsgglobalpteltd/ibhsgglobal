"use client";

import * as React from "react";
import { CustomButton } from "../custom-button";
import { NavigationTabs, TabItem } from "../navigation-tabs";
import { ConfirmDialog } from "../confirm-dialog";
import { showToast } from "@/lib/toast";
import { loadScript, loadStyle } from "@/lib/script-loader";
import { UserProfile } from "@/lib/api";
import {
  FileText,
  Plus,
  X,
  Trash2,
  Loader2,
  Upload,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Calendar,
  CreditCard,
  User,
  Building,
  DollarSign,
  Receipt,
  Send,
  Check,
  Ban,
  ShieldCheck,
  Edit3,
  Search
} from "lucide-react";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";
const MAX_BATCH_LIMIT = 100.00;

interface OperatorExpense {
  id: string;
  employee_id: string;
  employee_name?: string;
  date: string;
  description: string;
  amount: number | string;
  remarks?: string;
  receipt_url: string;
  status: "unsubmitted" | "submitted" | "paid" | "rejected";
  batch_id?: string;
  created_at: number;
}

interface OperatorBatch {
  id: string;
  employee_id: string;
  employee_name?: string;
  target_admin_email?: string;
  target_admin_name?: string;
  claim_date: string;
  expense_ids: string[];
  items: Array<{
    id: string;
    date: string;
    description: string;
    amount: number | string;
    remarks?: string;
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

interface AdminUser {
  email: string;
  name: string;
  phone_number?: string;
  role?: string;
}

interface StaffClaimsModuleProps {
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

export function StaffClaimsModule({ profile }: StaffClaimsModuleProps) {
  const [activeTab, setActiveTab] = React.useState<"expenses" | "batches">("expenses");
  const [scriptsReady, setScriptsReady] = React.useState(false);

  // Employee & PayNow Profile details
  const [employeeDetails, setEmployeeDetails] = React.useState<{
    name: string;
    role: string;
    paynow: string;
    id: string;
  }>({
    name: profile?.name || "",
    role: "",
    paynow: "",
    id: profile?.employee_id || ""
  });

  // Admin routing state
  const [adminsList, setAdminsList] = React.useState<AdminUser[]>([]);
  const [selectedAdminEmail, setSelectedAdminEmail] = React.useState<string>("");

  // PayNow Quick Update Modal state
  const [showPayNowModal, setShowPayNowModal] = React.useState(false);
  const [payNowInput, setPayNowInput] = React.useState("");
  const [isSavingPayNow, setIsSavingPayNow] = React.useState(false);

  // Submit Claim Batch Modal state
  const [showSubmitModal, setShowSubmitModal] = React.useState(false);

  // Form states for logging an expense
  const [editingExpenseId, setEditingExpenseId] = React.useState<string | null>(null);
  const [expenseDate, setExpenseDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [remarks, setRemarks] = React.useState("");

  // Receipt image attachment states
  const [receiptImage, setReceiptImage] = React.useState<{
    src: string;
    name: string;
    type: string;
    url?: string;
    file_key?: string;
  } | null>(null);

  // Cropper states
  const [showCropModal, setShowCropModal] = React.useState(false);
  const [cropSrc, setCropSrc] = React.useState("");
  const [cropFileName, setCropFileName] = React.useState("");
  const [cropFileType, setCropFileType] = React.useState("");
  const [baseRotation, setBaseRotation] = React.useState(0);
  const [fineRotation, setFineRotation] = React.useState(0);

  // Ledger and Batches states
  const [expenses, setExpenses] = React.useState<OperatorExpense[]>([]);
  const [batches, setBatches] = React.useState<OperatorBatch[]>([]);
  const [selectedExpenseIds, setSelectedExpenseIds] = React.useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = React.useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = React.useState(false);
  const [isSubmittingBatch, setIsSubmittingBatch] = React.useState(false);
  const [batchSearchQuery, setBatchSearchQuery] = React.useState("");
  const [resubmittingBatch, setResubmittingBatch] = React.useState<OperatorBatch | null>(null);

  // Modals
  const [viewingBatch, setViewingBatch] = React.useState<OperatorBatch | null>(null);
  const [previewingReceiptUrl, setPreviewingReceiptUrl] = React.useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant?: "danger" | "dark" | "default";
    onConfirm: () => void;
  } | null>(null);

  // Refs
  const cropperRef = React.useRef<any>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const userEmail = (profile?.email || "").toLowerCase().trim();

  // Load Cropper.js scripts on mount
  React.useEffect(() => {
    async function initScripts() {
      try {
        await loadStyle("https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css");
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js");
        if (typeof window !== "undefined" && (window as any).Cropper) {
          setScriptsReady(true);
        }
      } catch (err: any) {
        console.error("Script load error:", err);
      }
    }
    initScripts();
  }, []);

  // Fetch employee record to extract PayNow details
  React.useEffect(() => {
    async function fetchEmployeeProfile() {
      if (!profile?.employee_id && !userEmail) return;
      try {
        const res = await fetch(`${WORKER_URL}/api/employees`);
        if (res.ok) {
          const empList = (await res.json()) as any[];
          let matched = null;
          if (profile?.employee_id) {
            matched = empList.find((e: any) => String(e.id) === String(profile.employee_id));
          }
          if (!matched && userEmail) {
            matched = empList.find((e: any) => (e.email || "").toLowerCase() === userEmail);
          }

          if (matched) {
            const rawPNow = matched.paynow_number || matched.phone || "";
            const cleanPNow = formatCleanPayNow(rawPNow);
            setEmployeeDetails({
              name: matched.name || matched.full_name || profile?.name || "",
              role: matched.role || "",
              paynow: cleanPNow,
              id: matched.id || profile?.employee_id || ""
            });
            setPayNowInput(cleanPNow);
          }
        }
      } catch (err) {
        console.warn("Failed to load employee details:", err);
      }
    }
    fetchEmployeeProfile();
  }, [profile, userEmail]);

  // Fetch list of Administrators/Supervisors for dropdown
  const loadAdmins = React.useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_URL}/api/claims/admins`);
      if (res.ok) {
        const data = (await res.json()) as AdminUser[];
        setAdminsList(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0 && !selectedAdminEmail) {
          setSelectedAdminEmail(data[0].email);
        }
      }
    } catch (err) {
      console.warn("Failed to load admins list:", err);
    }
  }, [selectedAdminEmail]);

  React.useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  // Fetch operator's expenses and submitted batches
  const loadOperatorData = React.useCallback(async () => {
    const empId = employeeDetails.id || profile?.employee_id;
    if (!empId && !userEmail) return;
    setLoadingData(true);
    try {
      const queryParam = empId ? `employee_id=${encodeURIComponent(empId)}` : `email=${encodeURIComponent(userEmail)}`;
      const expRes = await fetch(`${WORKER_URL}/api/claims/operator/expenses?${queryParam}`);
      if (expRes.ok) {
        const expData = (await expRes.json()) as OperatorExpense[];
        setExpenses(Array.isArray(expData) ? expData : []);
      }

      const batRes = await fetch(`${WORKER_URL}/api/claims/operator/batches?${queryParam}`);
      if (batRes.ok) {
        const batData = (await batRes.json()) as OperatorBatch[];
        setBatches(Array.isArray(batData) ? batData : []);
      }
    } catch (err: any) {
      console.error("Failed to load staff claim data:", err);
      showToast("Failed to load data: " + err.message, "error");
    } finally {
      setLoadingData(false);
    }
  }, [userEmail, employeeDetails.id, profile?.employee_id]);

  React.useEffect(() => {
    loadOperatorData();
  }, [loadOperatorData]);

  // Global Header Refresh Listener ("db-refresh")
  React.useEffect(() => {
    const handleGlobalRefresh = () => {
      loadOperatorData();
      loadAdmins();
    };
    window.addEventListener("db-refresh", handleGlobalRefresh);
    return () => window.removeEventListener("db-refresh", handleGlobalRefresh);
  }, [loadOperatorData, loadAdmins]);

  // Quick PayNow Save/Update
  const handleSavePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payNowInput.trim()) {
      showToast("Please enter a valid PayNow mobile / UEN number.", "warning");
      return;
    }

    const cleanInput = formatCleanPayNow(payNowInput);
    setIsSavingPayNow(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/claims/operator/update-paynow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: employeeDetails.id || profile?.employee_id,
          user_email: userEmail,
          paynow_number: cleanInput
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);

      setEmployeeDetails((prev) => ({ ...prev, paynow: cleanInput }));
      setShowPayNowModal(false);
      showToast("PayNow number updated successfully!", "success");
    } catch (err: any) {
      showToast("Failed to update PayNow: " + err.message, "error");
    } finally {
      setIsSavingPayNow(false);
    }
  };

  // Handle receipt image select & cropper setup
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropSrc(event.target?.result as string);
      setBaseRotation(0);
      setFineRotation(0);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Setup Cropper.js instance inside modal
  React.useEffect(() => {
    if (showCropModal && imageRef.current && (window as any).Cropper) {
      if (cropperRef.current) {
        cropperRef.current.destroy();
      }
      cropperRef.current = new (window as any).Cropper(imageRef.current, {
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 0.9,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false
      });
    }
    return () => {
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
    };
  }, [showCropModal, cropSrc]);

  // Apply Crop & Save to State
  const applyCrop = () => {
    if (!cropperRef.current) return;
    const canvas = cropperRef.current.getCroppedCanvas({
      maxWidth: 1600,
      maxHeight: 1600,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high"
    });
    if (canvas) {
      const croppedBase64 = canvas.toDataURL("image/jpeg", 0.85);
      setReceiptImage({
        src: croppedBase64,
        name: `receipt_${Date.now()}.jpg`,
        type: "image/jpeg"
      });
      setShowCropModal(false);
    }
  };

  // Load expense into form for editing
  const handleEditExpense = (exp: OperatorExpense) => {
    if (exp.status === "rejected" && (!resubmittingBatch || resubmittingBatch.id !== exp.batch_id)) {
      showToast(`This expense is locked under rejected claim ${exp.batch_id || ""}. Click "Edit & Resubmit" on that claim in Claim Submitted tab to edit it.`, "warning");
      return;
    }
    setEditingExpenseId(exp.id);
    setExpenseDate(exp.date);
    setDescription(exp.description);
    setAmount(String(exp.amount));
    setRemarks(exp.remarks || "");
    if (exp.receipt_url) {
      setReceiptImage({
        src: exp.receipt_url,
        name: "existing_receipt.jpg",
        type: "image/jpeg"
      });
    } else {
      setReceiptImage(null);
    }
    setActiveTab("expenses");
  };

  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setDescription("");
    setAmount("");
    setRemarks("");
    setReceiptImage(null);
    setExpenseDate(new Date().toISOString().split("T")[0]);
  };

  // Save new expense or update existing expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const empId = employeeDetails.id || profile?.employee_id;
    if (!empId) {
      showToast("Employee binding is required to record expenses.", "error");
      return;
    }

    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      showToast("Please enter a valid description and amount.", "warning");
      return;
    }

    if (!receiptImage) {
      showToast("Receipt photo is mandatory for all expense claims.", "warning");
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const payload = {
        ...(editingExpenseId ? { id: editingExpenseId } : {}),
        employee_id: empId,
        employee_name: employeeDetails.name || profile?.name || "Staff",
        date: expenseDate,
        description: description.trim(),
        amount: parseFloat(amount),
        remarks: remarks.trim(),
        receipt: receiptImage
      };

      const res = await fetch(`${WORKER_URL}/api/claims/operator/expense/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());
      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);

      showToast(editingExpenseId ? "Expense updated successfully!" : "Expense recorded successfully!", "success");

      // Reset form fields
      setEditingExpenseId(null);
      setDescription("");
      setAmount("");
      setRemarks("");
      setReceiptImage(null);
      setExpenseDate(new Date().toISOString().split("T")[0]);

      // Refresh data
      loadOperatorData();
    } catch (err: any) {
      console.error("Save expense error:", err);
      showToast("Failed to save expense: " + err.message, "error");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Delete unsubmitted expense
  const handleDeleteExpense = (exp: OperatorExpense | string) => {
    const id = typeof exp === "string" ? exp : exp.id;
    const expObj = typeof exp === "string" ? expenses.find((e) => e.id === exp) : exp;
    if (expObj && expObj.status === "rejected" && (!resubmittingBatch || resubmittingBatch.id !== expObj.batch_id)) {
      showToast(`This expense is locked under rejected claim ${expObj.batch_id || ""}. Click "Edit & Resubmit" on that claim to modify it.`, "warning");
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Delete Expense",
      description: "Are you sure you want to delete this recorded expense and its receipt?",
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
        if (editingExpenseId === id) {
          handleCancelEdit();
        }
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        setSelectedExpenseIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        try {
          const res = await fetch(`${WORKER_URL}/api/claims/operator/expense/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
          });
          if (!res.ok) throw new Error(await res.text());
          showToast("Expense deleted successfully!", "success");
          loadOperatorData();
        } catch (err: any) {
          showToast("Failed to delete expense: " + err.message, "error");
          loadOperatorData();
        }
      }
    });
  };

  // Toggle selection for batching
  const toggleSelectExpense = (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    if (exp && exp.status === "rejected" && (!resubmittingBatch || resubmittingBatch.id !== exp.batch_id)) {
      showToast(`This expense is locked under rejected claim ${exp.batch_id || ""}. Click "Edit & Resubmit" on that claim in Claim Submitted tab to modify it.`, "warning");
      return;
    }
    setSelectedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Selected totals & validation
  const unsubmittedExpenses = expenses.filter(
    (e) => e.status === "unsubmitted" || e.status === "rejected"
  );
  const selectedExpenses = expenses.filter(
    (e) => selectedExpenseIds.has(e.id) && (e.status === "unsubmitted" || (resubmittingBatch && e.batch_id === resubmittingBatch.id))
  );
  const selectedTotal = selectedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const roundedSelectedTotal = Number(selectedTotal.toFixed(2));
  const isOverLimit = roundedSelectedTotal > MAX_BATCH_LIMIT;
  const isPayNowMissing = !employeeDetails.paynow;
  const isUnboundEmployee = !employeeDetails.id && !profile?.employee_id;

  // Start Resubmitting a Rejected Batch
  const handleStartResubmitBatch = (batch: OperatorBatch) => {
    setResubmittingBatch(batch);
    if (batch.target_admin_email) {
      setSelectedAdminEmail(batch.target_admin_email);
    }
    // Pre-select existing items from this batch
    const batchExpenseIds = Array.isArray(batch.expense_ids) && batch.expense_ids.length > 0
      ? batch.expense_ids
      : (batch.items || []).map((i) => i.id).filter(Boolean);
    setSelectedExpenseIds(new Set(batchExpenseIds));
    setViewingBatch(null);
    setActiveTab("expenses");
    showToast(`Editing rejected claim ${batch.id}. Modify items and resubmit when ready.`, "info");
  };

  // Cancel Resubmission
  const handleCancelResubmit = () => {
    setResubmittingBatch(null);
    setSelectedExpenseIds(new Set());
    showToast("Resubmission cancelled.", "info");
  };

  // Delete a Rejected Claim Batch (Returns tied expenses to unsubmitted status)
  const handleDeleteRejectedBatch = async (batch: OperatorBatch) => {
    if (!confirm(`Are you sure you want to delete rejected claim ${batch.id}?\n\nAll ${batch.items?.length || 0} expense items will be returned to your active ledger as unsubmitted expenses.`)) {
      return;
    }

    try {
      const res = await fetch(`${WORKER_URL}/api/claims/operator/batch/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: batch.id,
          employee_id: employeeDetails.id || profile?.employee_id
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);

      if (resubmittingBatch?.id === batch.id) {
        setResubmittingBatch(null);
        setSelectedExpenseIds(new Set());
      }
      setViewingBatch(null);
      showToast("Claim deleted. All items returned to your expenses ledger.", "success");
      loadOperatorData();
    } catch (err: any) {
      console.error("Delete batch error:", err);
      showToast("Failed to delete claim: " + err.message, "error");
    }
  };

  // Open submit batch modal
  const handleOpenSubmitBatchModal = () => {
    if (selectedExpenseIds.size === 0) {
      showToast("Please select at least one expense to submit.", "warning");
      return;
    }
    if (isOverLimit) {
      showToast(`Selected total is $${roundedSelectedTotal.toFixed(2)}. Max batch limit is $${MAX_BATCH_LIMIT.toFixed(2)}.`, "warning");
      return;
    }
    if (isPayNowMissing) {
      showToast("Please update your PayNow number before submitting for reimbursement.", "warning");
      setShowPayNowModal(true);
      return;
    }
    setShowSubmitModal(true);
  };

  // Confirm submit batch to Supervisor
  const handleConfirmSubmitBatch = async () => {
    const empId = employeeDetails.id || profile?.employee_id;
    if (!empId) {
      showToast("Employee binding is required to submit claims.", "error");
      return;
    }

    if (selectedExpenseIds.size === 0 || isOverLimit) return;
    if (!selectedAdminEmail) {
      showToast("Please select an Administrator to route this claim to.", "warning");
      return;
    }

    if (isPayNowMissing) {
      showToast("PayNow number is required to receive payout.", "warning");
      setShowSubmitModal(false);
      setShowPayNowModal(true);
      return;
    }

    const matchedAdmin = adminsList.find((a) => a.email.toLowerCase() === selectedAdminEmail.toLowerCase());
    const adminName = matchedAdmin?.name || selectedAdminEmail;

    setIsSubmittingBatch(true);
    try {
      const isResubmit = !!resubmittingBatch;
      const endpoint = isResubmit
        ? `${WORKER_URL}/api/claims/operator/batch/resubmit`
        : `${WORKER_URL}/api/claims/operator/batch/submit`;

      const payload = {
        ...(isResubmit ? { id: resubmittingBatch.id } : {}),
        employee_id: empId,
        employee_name: employeeDetails.name || profile?.name || "Staff",
        paynow_number: employeeDetails.paynow,
        target_admin_email: selectedAdminEmail,
        target_admin_name: adminName,
        expense_ids: Array.from(selectedExpenseIds)
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(await res.text());
      const resData = await res.json();
      if (resData.error) throw new Error(resData.error);

      if (isResubmit) {
        showToast(`Claim ${resubmittingBatch.id} updated and resubmitted successfully!`, "success");
        setResubmittingBatch(null);
      } else {
        showToast(`Claim batch submitted to ${adminName} successfully!`, "success");
      }
      setShowSubmitModal(false);
      setSelectedExpenseIds(new Set());
      loadOperatorData();
      setActiveTab("batches");
    } catch (err: any) {
      console.error("Batch submit error:", err);
      showToast("Failed to submit batch: " + err.message, "error");
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const tabs: TabItem[] = [
    {
      id: "expenses",
      label: "My Expenses",
      desc: "Record out-of-pocket expenses and combine into claim batches."
    },
    {
      id: "batches",
      label: "Claim Submitted",
      desc: "Track supervisor approval and PayNow payout status."
    }
  ];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden relative min-w-0 font-primary">
      
      {/* TOPBAR NAVIGATION TABS */}
      <NavigationTabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(tabId: string) => setActiveTab(tabId as any)}
      />

      {/* UNBOUND EMPLOYEE ACCOUNT NOTICE */}
      {isUnboundEmployee ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
          <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md shadow-xs flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-zinc-500">
              <User className="w-6 h-6 text-[#0B57D0]" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Employee Profile Required
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Your user account is not currently linked to an active Employee record in the system. 
              Please contact an Administrator to bind your account in <strong>Administrator &gt; Users</strong> to enable Staff Claims.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* PAYNOW MISSING NOTICE BANNER */}
          {isPayNowMissing && (
            <div className="mx-3 mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#0B57D0] shrink-0" />
                <span className="text-zinc-700">
                  <strong className="font-semibold text-zinc-900">PayNow Number Required:</strong> Register your PayNow number to enable reimbursement payouts.
                </span>
              </div>
              <button
                onClick={() => {
                  setPayNowInput(employeeDetails.paynow || "");
                  setShowPayNowModal(true);
                }}
                className="px-3 py-1 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded text-xs font-medium transition-colors shrink-0 cursor-pointer"
              >
                Update PayNow
              </button>
            </div>
          )}

          {/* TAB 1: RECORD EXPENSES & LEDGER */}
          {activeTab === "expenses" && (
            <div className="flex-1 overflow-hidden p-3 min-h-0 flex flex-col gap-3">
              {/* RESUBMISSION BANNER */}
              {resubmittingBatch && (
                <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg flex items-center justify-between shrink-0 text-xs shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-amber-950">
                          Editing Rejected Claim: {resubmittingBatch.id}
                        </span>
                        {resubmittingBatch.reject_reason && (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px] font-medium">
                            Reason: {resubmittingBatch.reject_reason}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Uncheck/remove wrong items or edit particulars on the left. Click "Resubmit Claim" when ready.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelResubmit}
                    className="px-2.5 py-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-slate-100 border border-slate-300 rounded cursor-pointer transition-colors shrink-0 ml-3"
                  >
                    Cancel Resubmission
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
                
                {/* LEFT PANEL: RECORD EXPENSE FORM (4 Cols) */}
                <div className="lg:col-span-4 xl:col-span-4 bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col gap-3 overflow-y-auto min-h-0">
                  
                  {/* Form Header */}
                  <div className="flex items-center justify-between border-b border-zinc-150 pb-2.5 shrink-0">
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-900">
                        {editingExpenseId ? "Edit Expense" : "Record Expense"}
                      </h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {editingExpenseId ? "Update details and save to ledger" : "Attach receipt to save to ledger"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {editingExpenseId && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-2 py-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      {employeeDetails.paynow ? (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-zinc-700 text-xs">
                          <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{employeeDetails.paynow}</span>
                          <button
                            onClick={() => {
                              setPayNowInput(employeeDetails.paynow);
                              setShowPayNowModal(true);
                            }}
                            className="text-zinc-400 hover:text-[#0B57D0] cursor-pointer"
                            title="Edit PayNow"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setPayNowInput("");
                            setShowPayNowModal(true);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-zinc-700 text-xs font-medium cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add PayNow
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <form onSubmit={handleSaveExpense} className="flex flex-col gap-3 flex-1">
                    
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Expense Date */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-zinc-700">
                          Expense Date *
                        </label>
                        <input
                          type="date"
                          required
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
                          className="h-9 px-2.5 border border-zinc-300 rounded text-xs text-zinc-800 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] bg-white"
                        />
                      </div>

                      {/* Amount */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-zinc-700">
                          Amount ($ SGD) *
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-xs text-zinc-400">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-9 pl-6 pr-2.5 w-full border border-zinc-300 rounded text-xs text-zinc-900 font-medium focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-zinc-700">
                        Description / Particulars *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Parking fee at FairPrice Suntec, fuel, materials"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-9 px-2.5 border border-zinc-300 rounded text-xs text-zinc-800 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] bg-white"
                      />
                    </div>

                    {/* Remarks */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-zinc-700">
                        Remarks
                      </label>
                      <input
                        type="text"
                        placeholder="Optional remarks (e.g. Emergency store visit)"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="h-9 px-2.5 border border-zinc-300 rounded text-xs text-zinc-800 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] bg-white"
                      />
                    </div>

                    {/* Receipt Upload Box */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-700 flex items-center justify-between">
                        <span>Receipt Attachment *</span>
                        {receiptImage && (
                          <span className="text-[11px] font-normal text-emerald-600 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Ready
                          </span>
                        )}
                      </label>

                      {receiptImage ? (
                        <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded">
                          <div
                            onClick={() => setPreviewingReceiptUrl(receiptImage.src)}
                            className="flex items-center gap-2 overflow-hidden cursor-pointer group"
                            title="Click to view full receipt photo"
                          >
                            <img
                              src={receiptImage.src}
                              alt="Receipt"
                              className="w-9 h-9 object-cover rounded border border-slate-200 shrink-0 group-hover:opacity-85 transition-opacity"
                            />
                            <div className="truncate">
                              <span className="text-xs font-medium text-zinc-900 group-hover:text-[#0B57D0] truncate block transition-colors">
                                {receiptImage.name}
                              </span>
                              <span className="text-[11px] text-zinc-500">
                                Click to preview
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewingReceiptUrl(receiptImage.src)}
                              className="text-xs font-medium text-zinc-700 hover:text-zinc-950 px-2 py-0.5 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer inline-flex items-center gap-1 transition-colors"
                              title="View receipt"
                            >
                              <Eye className="w-3.5 h-3.5 text-zinc-500" />
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-xs font-medium text-[#0B57D0] hover:text-[#0842A0] px-2 py-0.5 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer transition-colors"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => setReceiptImage(null)}
                              className="p-1 text-zinc-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Remove receipt"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
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
                      )}

                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleReceiptUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>

                    {/* Submit Form Button */}
                    <div className="pt-2 mt-auto flex gap-2">
                      {editingExpenseId && (
                        <CustomButton
                          type="button"
                          variant="secondary"
                          onClick={handleCancelEdit}
                          className="w-1/3 h-9 text-xs font-medium rounded"
                        >
                          Cancel
                        </CustomButton>
                      )}
                      <CustomButton
                        type="submit"
                        variant="default"
                        disabled={isSubmittingExpense || !receiptImage || !description.trim() || !amount}
                        className={`h-9 text-xs font-medium rounded bg-[#0B57D0] hover:bg-[#0842A0] text-white ${editingExpenseId ? "flex-1" : "w-full"}`}
                      >
                        {isSubmittingExpense ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            {editingExpenseId ? "Updating..." : "Saving..."}
                          </>
                        ) : editingExpenseId ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            Update Expense
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Record Expense
                          </>
                        )}
                      </CustomButton>
                    </div>

                  </form>

                </div>

                {/* RIGHT PANEL: UNCLAIMED EXPENSES LEDGER TABLE (8 Cols) */}
                <div className="lg:col-span-8 xl:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col shadow-xs min-h-0">
                  
                  {/* Header Bar */}
                  <div className="bg-slate-50/80 border-b border-zinc-200 px-4 py-3 flex items-center justify-between shrink-0">
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-900">
                        Unclaimed Expenses Ledger ({unsubmittedExpenses.length})
                      </h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Select items to combine into a claim batch. Maximum limit: $100.00
                      </p>
                    </div>
                  </div>

                  {/* Scrollable Table */}
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <table className="w-full border-collapse text-left">
                      <thead className="bg-slate-50/80 border-b border-zinc-200 sticky top-0 z-10 text-[11px] font-medium text-zinc-500">
                        <tr>
                          <th className="p-3 text-center w-10">
                            <input
                              type="checkbox"
                              checked={
                                (() => {
                                  const selectable = unsubmittedExpenses.filter((e) => e.status === "unsubmitted" || (resubmittingBatch && e.batch_id === resubmittingBatch.id));
                                  return selectable.length > 0 && selectedExpenseIds.size === selectable.length;
                                })()
                              }
                              onChange={(e) => {
                                const selectable = unsubmittedExpenses.filter((e) => e.status === "unsubmitted" || (resubmittingBatch && e.batch_id === resubmittingBatch.id));
                                if (e.target.checked) {
                                  setSelectedExpenseIds(new Set(selectable.map((ex) => ex.id)));
                                } else {
                                  setSelectedExpenseIds(new Set());
                                }
                              }}
                              className="rounded border-zinc-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                            />
                          </th>
                          <th className="p-3 w-28">Date</th>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-right w-24">Amount</th>
                          <th className="p-3 text-center w-20">Receipt</th>
                          <th className="p-3 text-center w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-150 text-xs">
                        {loadingData ? (
                          <tr>
                            <td colSpan={6} className="p-10 text-center text-zinc-500">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-[#0B57D0]" />
                                <span className="font-medium text-xs">Loading ledger...</span>
                              </div>
                            </td>
                          </tr>
                        ) : unsubmittedExpenses.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-10 text-center text-zinc-400">
                              <div className="flex flex-col items-center justify-center gap-1">
                                <Receipt className="w-6 h-6 text-zinc-300" />
                                <span className="font-medium text-xs text-zinc-600">
                                  No unclaimed expenses in your ledger.
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                  Use the form on the left to record an out-of-pocket purchase.
                                </span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          unsubmittedExpenses.map((exp) => {
                            const isLockedByRejected = exp.status === "rejected" && (!resubmittingBatch || resubmittingBatch.id !== exp.batch_id);
                            const isChecked = selectedExpenseIds.has(exp.id);
                            const isEditing = editingExpenseId === exp.id;
                            return (
                              <tr
                                key={exp.id}
                                className={`transition-colors ${
                                  isLockedByRejected
                                    ? "bg-slate-50/60 opacity-80 cursor-not-allowed"
                                    : isEditing
                                    ? "bg-amber-50/40 cursor-pointer"
                                    : isChecked
                                    ? "bg-[#D3E3FD]/20 cursor-pointer"
                                    : "hover:bg-slate-50/80 cursor-pointer"
                                }`}
                                onClick={() => toggleSelectExpense(exp.id)}
                              >
                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isLockedByRejected}
                                    onChange={() => toggleSelectExpense(exp.id)}
                                    className={`rounded border-zinc-300 text-[#0B57D0] focus:ring-0 ${
                                      isLockedByRejected ? "cursor-not-allowed opacity-40" : "cursor-pointer"
                                    }`}
                                  />
                                </td>
                                <td className="p-3 text-zinc-600 whitespace-nowrap">
                                  {formatDateDisplay(exp.date)}
                                </td>
                                <td className="p-3 text-zinc-900">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>{exp.description}</span>
                                    {isEditing && (
                                      <span className="px-1.5 py-0.2 text-[9px] font-medium bg-amber-100 text-amber-800 rounded">
                                        Editing
                                      </span>
                                    )}
                                    {isLockedByRejected && (
                                      <span className="px-1.5 py-0.5 text-[9px] font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded">
                                        Locked (Rejected Claim)
                                      </span>
                                    )}
                                  </div>
                                  {exp.remarks && (
                                    <span className="block text-[11px] text-zinc-400 font-normal mt-0.5">
                                      {exp.remarks}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right font-medium text-zinc-900">
                                  ${Number(exp.amount || 0).toFixed(2)}
                                </td>
                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  {exp.receipt_url ? (
                                    <button
                                      onClick={() => setPreviewingReceiptUrl(exp.receipt_url)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-zinc-700 text-[11px] font-medium border border-slate-200 cursor-pointer"
                                    >
                                      <Eye className="w-3 h-3 text-zinc-400" /> View
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-zinc-400">-</span>
                                  )}
                                </td>
                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleEditExpense(exp)}
                                      className={`p-1 rounded transition-colors ${
                                        isLockedByRejected
                                          ? "text-zinc-300 hover:text-zinc-300 hover:bg-transparent cursor-not-allowed"
                                          : "text-zinc-400 hover:text-[#0B57D0] hover:bg-slate-100 cursor-pointer"
                                      }`}
                                      title={isLockedByRejected ? "Locked: Click 'Edit & Resubmit' on claim to modify" : "Edit Expense"}
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteExpense(exp)}
                                      className={`p-1 rounded transition-colors ${
                                        isLockedByRejected
                                          ? "text-zinc-300 hover:text-zinc-300 hover:bg-transparent cursor-not-allowed"
                                          : "text-zinc-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                      }`}
                                      title={isLockedByRejected ? "Locked: Click 'Edit & Resubmit' on claim to modify" : "Delete Expense"}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
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

                  {/* Bottom Batch Action Bar */}
                  <div className="bg-slate-50/80 border-t border-zinc-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-600">
                        {selectedExpenseIds.size} of {unsubmittedExpenses.length} selected
                      </span>

                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium ${
                        isOverLimit
                          ? "bg-red-50 text-red-700 border-red-200"
                          : selectedExpenseIds.size > 0
                          ? "bg-white text-zinc-900 border-slate-300"
                          : "bg-white text-zinc-500 border-zinc-200"
                      }`}>
                        <span>Total: ${roundedSelectedTotal.toFixed(2)}</span>
                        <span className="text-[11px] text-zinc-400">/ $100 max</span>
                      </div>

                      {isOverLimit && (
                        <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Exceeds $100 limit
                        </span>
                      )}
                    </div>

                    <CustomButton
                      onClick={handleOpenSubmitBatchModal}
                      variant="default"
                      disabled={isSubmittingBatch || selectedExpenseIds.size === 0 || isOverLimit}
                      className="h-9 px-4 text-xs font-medium rounded bg-[#0B57D0] hover:bg-[#0842A0] text-white"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {resubmittingBatch
                        ? `Resubmit Claim ${resubmittingBatch.id} ($${roundedSelectedTotal.toFixed(2)})`
                        : `Submit Claim Batch ($${roundedSelectedTotal.toFixed(2)})`}
                    </CustomButton>
                  </div>

                </div>

              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: CLAIM SUBMITTED & STATUS TRACKING */}
      {activeTab === "batches" && (
        <div className="flex flex-col flex-1 h-full overflow-hidden gap-3 pb-2 p-3 min-h-0">
          
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
            {/* Left: Info */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-900">
                Claim Submitted ({batches.length})
              </span>
            </div>

            {/* Right: Search Input Bar */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={batchSearchQuery}
                onChange={(e) => setBatchSearchQuery(e.target.value)}
                placeholder="Search Claim ID, description..."
                className="w-full h-9 pl-9 pr-7 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0]"
              />
              {batchSearchQuery && (
                <button
                  type="button"
                  onClick={() => setBatchSearchQuery("")}
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
                    const filtered = batches.filter((b) => {
                      if (batchSearchQuery.trim()) {
                        const q = batchSearchQuery.toLowerCase();
                        const idMatch = (b.id || "").toLowerCase().includes(q);
                        const empName = (b.employee_name || employeeDetails.name || "").toLowerCase();
                        const nameMatch = empName.includes(q);
                        const adminMatch = (b.target_admin_name || b.target_admin_email || "").toLowerCase().includes(q);
                        const itemsMatch = Array.isArray(b.items) && b.items.some((it: any) =>
                          (it.description || "").toLowerCase().includes(q) || (it.remarks || "").toLowerCase().includes(q)
                        );
                        if (!idMatch && !nameMatch && !adminMatch && !itemsMatch) return false;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={11} className="p-12 text-center text-zinc-400">
                            <div className="flex flex-col items-center justify-center gap-1.5">
                              <Clock className="w-7 h-7 text-zinc-300" />
                              <span className="font-medium text-sm text-zinc-600">
                                {batchSearchQuery.trim()
                                  ? `No claims matching "${batchSearchQuery}".`
                                  : "No claims submitted yet."}
                              </span>
                              <span className="text-xs text-zinc-400">
                                Select recorded expenses from your ledger to submit a claim batch.
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((batch) => {
                      const isRejected = batch.status === "rejected";
                      const staffPayNow = employeeDetails.paynow || "";
                      const staffName = batch.employee_name || employeeDetails.name || "Staff";

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
                          <td className="p-3 text-left text-xs text-zinc-700 truncate max-w-[160px]" title={batch.target_admin_name || batch.target_admin_email || "-"}>
                            {batch.target_admin_name || batch.target_admin_email || "-"}
                          </td>

                          {/* 8. Paid Date */}
                          <td className="p-3 text-left text-xs text-zinc-600">
                            {batch.approved_at ? formatDateDisplay(batch.approved_at) : "-"}
                          </td>

                          {/* 9. Payment Ref */}
                          <td className="p-3 text-left text-xs font-mono text-zinc-600 truncate max-w-[150px]" title={batch.payment_reference}>
                            {batch.payment_reference || "-"}
                          </td>

                          {/* 10. Pay by */}
                          <td className="p-3 text-left text-xs text-zinc-700 truncate max-w-[140px]">
                            {batch.approved_by || "-"}
                          </td>

                          {/* 11. Action */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingBatch(batch)}
                                className="h-7 px-2.5 text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-white hover:bg-slate-100 rounded border border-slate-200 cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors shrink-0"
                                title="View Claim Details & Receipts"
                              >
                                <Eye className="w-3.5 h-3.5 text-zinc-500" /> View Claim
                              </button>
                              {isRejected && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartResubmitBatch(batch)}
                                    className="h-7 px-2.5 text-xs font-medium text-[#0B57D0] hover:text-[#0842A0] bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors shrink-0"
                                    title="Edit and Resubmit this Claim"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" /> Edit & Resubmit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRejectedBatch(batch)}
                                    className="h-7 px-2.5 text-xs font-medium text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors shrink-0"
                                    title="Delete this rejected claim and return expenses to ledger"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete Claim
                                  </button>
                                </>
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

      {/* SUBMIT CLAIM BATCH MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {resubmittingBatch ? `Resubmit Claim Batch (${resubmittingBatch.id})` : "Submit Claim Batch for Payout"}
                </h3>
                <span className="text-xs text-zinc-500">
                  {selectedExpenses.length} expense(s) selected
                </span>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              
              {/* Reimbursement info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-zinc-500 block">Reimbursement Target</span>
                  <span className="font-semibold text-zinc-900">{employeeDetails.name}</span>
                  <span className="text-[11px] text-zinc-600 block mt-0.5">PayNow: {employeeDetails.paynow}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-500 block">Total Claim</span>
                  <span className="text-base font-semibold text-zinc-900">${roundedSelectedTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Admin Selection Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-700 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-[#0B57D0]" />
                  Select Administrator / Supervisor to Claim *
                </label>
                <select
                  value={selectedAdminEmail}
                  onChange={(e) => setSelectedAdminEmail(e.target.value)}
                  className="h-9 px-3 border border-zinc-300 rounded text-xs text-zinc-900 bg-white focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0]"
                >
                  {adminsList.length === 0 ? (
                    <option value="">No Administrators found</option>
                  ) : (
                    adminsList.map((admin) => (
                      <option key={admin.email} value={admin.email}>
                        {admin.name} ({admin.email})
                      </option>
                    ))
                  )}
                </select>
                <span className="text-[11px] text-zinc-400">
                  The selected supervisor will receive your claim in their review queue.
                </span>
              </div>

              <div className="text-xs text-zinc-500 border-t border-zinc-150 pt-2.5">
                Once submitted, these expenses are locked and cannot be edited while under review.
              </div>

            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <CustomButton variant="secondary" onClick={() => setShowSubmitModal(false)} className="h-9 text-xs rounded">
                Cancel
              </CustomButton>
              <CustomButton
                variant="default"
                disabled={isSubmittingBatch || !selectedAdminEmail}
                onClick={handleConfirmSubmitBatch}
                className="h-9 text-xs rounded bg-[#0B57D0] hover:bg-[#0842A0] text-white"
              >
                {isSubmittingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    {resubmittingBatch
                      ? `Confirm & Resubmit (${resubmittingBatch.id})`
                      : `Confirm & Submit ($${roundedSelectedTotal.toFixed(2)})`}
                  </>
                )}
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* QUICK PAYNOW UPDATE MODAL */}
      {showPayNowModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0B57D0]" />
                <h3 className="text-sm font-semibold text-zinc-900">Update PayNow Number</h3>
              </div>
              <button
                onClick={() => setShowPayNowModal(false)}
                className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayNow} className="p-5 flex flex-col gap-3.5">
              <p className="text-xs text-zinc-600">
                Enter your mobile number, UEN, or NRIC registered with PayNow so supervisors can send reimbursement payouts.
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-700">
                  PayNow Number / Mobile *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 91234567 or 201912345A"
                  value={payNowInput}
                  onChange={(e) => setPayNowInput(e.target.value)}
                  className="h-9 px-3 border border-zinc-300 rounded text-xs font-medium text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] bg-white font-mono"
                />
              </div>

              <div className="px-5 py-3 -mx-5 -mb-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 mt-2">
                <CustomButton variant="secondary" onClick={() => setShowPayNowModal(false)} className="h-9 text-xs rounded">
                  Cancel
                </CustomButton>
                <CustomButton type="submit" variant="default" disabled={isSavingPayNow || !payNowInput.trim()} className="h-9 text-xs rounded bg-[#0B57D0] hover:bg-[#0842A0] text-white">
                  {isSavingPayNow ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    "Save PayNow"
                  )}
                </CustomButton>
              </div>
            </form>
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
                      {viewingBatch.employee_name || employeeDetails.name || "Staff"}
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

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {viewingBatch.status === "rejected" && (
                  <>
                    <CustomButton
                      variant="default"
                      onClick={() => handleStartResubmitBatch(viewingBatch)}
                      className="h-9 text-xs rounded bg-[#0B57D0] hover:bg-[#0842A0] text-white"
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                      Edit & Resubmit Claim
                    </CustomButton>
                    <CustomButton
                      variant="secondary"
                      onClick={() => handleDeleteRejectedBatch(viewingBatch)}
                      className="h-9 text-xs rounded text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete Claim
                    </CustomButton>
                  </>
                )}
              </div>
              <CustomButton variant="secondary" onClick={() => setViewingBatch(null)}>
                Close
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {previewingReceiptUrl && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900">Receipt Image Preview</span>
              <button
                onClick={() => setPreviewingReceiptUrl(null)}
                className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[75vh] bg-slate-100">
              <img
                src={previewingReceiptUrl}
                alt="Receipt Preview"
                className="max-w-full max-h-[70vh] object-contain rounded shadow-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* CROP & ROTATE MODAL */}
      {showCropModal && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-900">
                Crop & Rotate Receipt
              </h3>
              <button
                onClick={() => setShowCropModal(false)}
                className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-grow p-4 bg-slate-100 flex items-center justify-center overflow-hidden min-h-[300px] max-h-[50vh]">
              <div className="w-full h-full max-h-[350px] flex justify-center items-center">
                <img
                  ref={imageRef}
                  src={cropSrc}
                  alt="To Crop"
                  style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const rot = (baseRotation - 90) % 360;
                    setBaseRotation(rot);
                    cropperRef.current?.rotateTo(rot + fineRotation);
                  }}
                  className="p-2 bg-white border border-slate-200 hover:border-slate-400 rounded flex items-center justify-center cursor-pointer"
                  title="Rotate Left 90°"
                >
                  <RotateCcw className="w-4 h-4 text-zinc-700" />
                </button>

                <div className="flex items-center gap-2 flex-grow max-w-xs">
                  <span className="text-[11px] font-medium text-zinc-500">Angle</span>
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
                    className="w-full accent-[#0B57D0] h-1 rounded bg-zinc-200 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-zinc-600 w-8 text-right">{fineRotation}°</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const rot = (baseRotation + 90) % 360;
                    setBaseRotation(rot);
                    cropperRef.current?.rotateTo(rot + fineRotation);
                  }}
                  className="p-2 bg-white border border-slate-200 hover:border-slate-400 rounded flex items-center justify-center cursor-pointer"
                  title="Rotate Right 90°"
                >
                  <RotateCw className="w-4 h-4 text-zinc-700" />
                </button>
              </div>

              <div className="flex justify-end gap-2">
                <CustomButton variant="secondary" onClick={() => setShowCropModal(false)} className="h-9 text-xs rounded">
                  Cancel
                </CustomButton>
                <CustomButton variant="default" onClick={applyCrop} className="h-9 text-xs rounded bg-[#0B57D0] hover:bg-[#0842A0] text-white">
                  Apply Crop
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG */}
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

    </div>
  );
}
