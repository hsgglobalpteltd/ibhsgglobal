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
  RefreshCw,
  Check,
  Ban
} from "lucide-react";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";
const MAX_BATCH_LIMIT = 100.00;

interface OperatorExpense {
  id: string;
  user_email: string;
  user_name: string;
  employee_id?: string;
  employee_name?: string;
  employee_role?: string;
  paynow_number?: string;
  date: string;
  description: string;
  amount: number | string;
  project_department?: string;
  remarks?: string;
  receipt_name?: string;
  receipt_url: string;
  receipt_file_key?: string;
  status: "unsubmitted" | "submitted" | "paid" | "rejected";
  batch_id?: string;
  created_at: number;
}

interface OperatorBatch {
  id: string;
  user_email: string;
  user_name: string;
  employee_id?: string;
  employee_name?: string;
  employee_role?: string;
  paynow_number?: string;
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

interface StaffClaimsModuleProps {
  profile?: UserProfile | null;
}

export function StaffClaimsModule({ profile }: StaffClaimsModuleProps) {
  const [activeTab, setActiveTab] = React.useState<"log" | "ledger" | "batches">("log");
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

  // Form states for logging an expense
  const [expenseDate, setExpenseDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [projectDept, setProjectDept] = React.useState("");
  const [remarks, setRemarks] = React.useState("");

  // Receipt image attachment states
  const [receiptImage, setReceiptImage] = React.useState<{
    src: string;
    name: string;
    type: string;
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
            setEmployeeDetails({
              name: matched.name || matched.full_name || profile?.name || "",
              role: matched.role || "",
              paynow: matched.paynow_number || matched.phone || "",
              id: matched.id || profile?.employee_id || ""
            });
          }
        }
      } catch (err) {
        console.warn("Failed to load employee details:", err);
      }
    }
    fetchEmployeeProfile();
  }, [profile, userEmail]);

  // Fetch operator's expenses and submitted batches
  const loadOperatorData = React.useCallback(async () => {
    if (!userEmail) return;
    setLoadingData(true);
    try {
      // 1. Fetch expenses
      const expRes = await fetch(`${WORKER_URL}/api/claims/operator/expenses?email=${encodeURIComponent(userEmail)}`);
      if (expRes.ok) {
        const expData = (await expRes.json()) as OperatorExpense[];
        setExpenses(Array.isArray(expData) ? expData : []);
      }

      // 2. Fetch batches
      const batRes = await fetch(`${WORKER_URL}/api/claims/operator/batches?email=${encodeURIComponent(userEmail)}`);
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
  }, [userEmail]);

  React.useEffect(() => {
    loadOperatorData();
  }, [loadOperatorData]);

  // Handle receipt image select & cropper setup
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

    setReceiptImage({
      src: croppedSrc,
      name: cropFileName,
      type: cropFileType || "image/jpeg"
    });
    setShowCropModal(false);
    showToast("Receipt photo attached successfully!", "success");
  };

  // Save new expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userEmail) {
      showToast("User session not found. Please log in.", "error");
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
        user_email: userEmail,
        user_name: profile?.name || employeeDetails.name,
        employee_id: employeeDetails.id,
        employee_name: employeeDetails.name || profile?.name,
        employee_role: employeeDetails.role,
        paynow_number: employeeDetails.paynow,
        date: expenseDate,
        description: description.trim(),
        amount: parseFloat(amount),
        project_department: projectDept.trim(),
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

      showToast("Expense recorded successfully!", "success");

      // Reset form
      setDescription("");
      setAmount("");
      setRemarks("");
      setReceiptImage(null);

      // Refresh data & switch to ledger tab
      loadOperatorData();
      setActiveTab("ledger");
    } catch (err: any) {
      console.error("Save expense error:", err);
      showToast("Failed to save expense: " + err.message, "error");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Delete unsubmitted expense
  const handleDeleteExpense = (id: string) => {
    setConfirmDialog({
      open: true,
      title: "Delete Expense",
      description: "Are you sure you want to delete this recorded expense and its receipt?",
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
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
            body: JSON.stringify({ id, user_email: userEmail })
          });
          if (!res.ok) throw new Error(await res.text());
          showToast("Expense removed.", "info");
        } catch (err: any) {
          showToast("Failed to delete expense: " + err.message, "error");
          loadOperatorData();
        }
      }
    });
  };

  // Toggle selection for batching
  const toggleSelectExpense = (id: string) => {
    setSelectedExpenseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Calculate selected total
  const unsubmittedExpenses = expenses.filter((e) => e.status === "unsubmitted");
  const selectedExpenses = unsubmittedExpenses.filter((e) => selectedExpenseIds.has(e.id));
  const selectedTotal = selectedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const roundedSelectedTotal = Number(selectedTotal.toFixed(2));
  const isOverLimit = roundedSelectedTotal > MAX_BATCH_LIMIT;

  // Submit Claim Batch
  const handleSubmitBatch = async () => {
    if (selectedExpenses.length === 0) {
      showToast("Please select at least 1 expense to submit.", "warning");
      return;
    }

    if (isOverLimit) {
      showToast(`Selected total is $${roundedSelectedTotal.toFixed(2)}. Max claim limit is $100.00 per batch.`, "warning");
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Submit Claim Batch to Admin",
      description: `You are submitting ${selectedExpenses.length} expense(s) totaling $${roundedSelectedTotal.toFixed(2)} for supervisor review and PayNow reimbursement to ${employeeDetails.paynow || "your registered PayNow"}. Once submitted, these expenses are locked and cannot be edited.`,
      confirmText: `Submit Batch ($${roundedSelectedTotal.toFixed(2)})`,
      variant: "dark",
      onConfirm: async () => {
        setIsSubmittingBatch(true);
        try {
          const payload = {
            user_email: userEmail,
            user_name: profile?.name || employeeDetails.name,
            employee_id: employeeDetails.id,
            employee_name: employeeDetails.name || profile?.name,
            employee_role: employeeDetails.role,
            paynow_number: employeeDetails.paynow,
            expense_ids: Array.from(selectedExpenseIds)
          };

          const res = await fetch(`${WORKER_URL}/api/claims/operator/batch/submit`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          if (!res.ok) throw new Error(await res.text());
          const resData = await res.json();
          if (resData.error) throw new Error(resData.error);

          showToast("Claim batch submitted to supervisor successfully!", "success");
          setSelectedExpenseIds(new Set());
          loadOperatorData();
          setActiveTab("batches");
        } catch (err: any) {
          console.error("Batch submit error:", err);
          showToast("Failed to submit batch: " + err.message, "error");
        } finally {
          setIsSubmittingBatch(false);
        }
      }
    });
  };

  const tabs: TabItem[] = [
    {
      id: "log",
      label: "Log Expense",
      desc: "Record on-the-go out-of-pocket expenses."
    },
    {
      id: "ledger",
      label: "My Expenses Ledger",
      desc: "Unclaimed expenses list with $100 batch selection."
    },
    {
      id: "batches",
      label: "Submitted Batches",
      desc: "Track supervisor approval and PayNow payout status."
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

      {/* TAB 1: LOG EXPENSE */}
      {activeTab === "log" && (
        <div className="flex-1 overflow-y-auto p-4 flex justify-center">
          <div className="w-full max-w-2xl bg-white border border-zinc-300 rounded-2xl p-6 shadow-xs flex flex-col gap-5">
            
            {/* Header & Bound Employee Info */}
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-950">Record New Out-Of-Pocket Expense</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Attach receipt photo. Expenses stay in your ledger until you batch and submit.
                </p>
              </div>
              
              {employeeDetails.paynow && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>PayNow: <strong>{employeeDetails.paynow}</strong></span>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveExpense} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Expense Date */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="h-10 px-3 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] bg-white"
                  />
                </div>

                {/* Amount */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    Amount ($ SGD) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-zinc-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-10 pl-7 pr-3 w-full border border-zinc-300 rounded-lg text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] bg-white"
                    />
                  </div>
                </div>

              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                  Description / Particulars *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Parking fee at FairPrice Suntec, fuel, materials purchase"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-10 px-3 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] bg-white"
                />
              </div>

              {/* Remarks */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                  Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Emergency store visit"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="h-10 px-3 border border-zinc-300 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] bg-white"
                />
              </div>

              {/* Receipt Upload Box */}
              <div className="border border-zinc-300 rounded-xl p-4 bg-zinc-50/50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-zinc-600" />
                    Receipt Attachment *
                  </span>
                  {receiptImage && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Ready
                    </span>
                  )}
                </div>

                {receiptImage ? (
                  <div className="flex items-center justify-between p-2.5 bg-white border border-zinc-200 rounded-lg">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={receiptImage.src}
                        alt="Receipt"
                        className="w-12 h-12 object-cover rounded-md border border-zinc-200"
                      />
                      <div className="truncate">
                        <span className="text-xs font-bold text-zinc-800 truncate block">
                          {receiptImage.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-semibold">
                          Cropped & Verified
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 px-2 py-1 bg-blue-50 rounded border border-blue-200 cursor-pointer"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setReceiptImage(null)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-300 hover:border-[#0B57D0] rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-white transition-colors"
                  >
                    <Upload className="w-6 h-6 text-zinc-400" />
                    <span className="text-xs font-bold text-zinc-700">
                      Click to upload receipt photo
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Supports JPG, PNG, WEBP (Image will open in crop editor)
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

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <CustomButton
                  type="submit"
                  variant="default"
                  disabled={isSubmittingExpense || !receiptImage || !description.trim() || !amount}
                  className="h-10 px-6 text-xs font-bold uppercase tracking-wider"
                >
                  {isSubmittingExpense ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Saving Expense...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1.5" />
                      Record Expense
                    </>
                  )}
                </CustomButton>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* TAB 2: MY EXPENSES LEDGER (UNSUBMITTED WITH $100 BATCH SELECTION) */}
      {activeTab === "ledger" && (
        <div className="flex flex-col flex-1 h-full overflow-hidden gap-3 pb-2">
          
          {/* Header Info & Refresh */}
          <div className="bg-white p-3.5 rounded-lg border border-zinc-300/80 shadow-xs flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Unclaimed Expense Records
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Check the boxes next to expenses to combine into a claim batch. Maximum limit is <strong>$100.00 per submission</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <CustomButton
                onClick={loadOperatorData}
                variant="secondary"
                disabled={loadingData}
                className="h-8 px-3 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingData ? "animate-spin" : ""}`} />
                Refresh
              </CustomButton>

              <CustomButton
                onClick={() => setActiveTab("log")}
                variant="default"
                className="h-8 px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Expense
              </CustomButton>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="flex-1 bg-white border border-zinc-300 rounded-lg overflow-hidden flex flex-col shadow-xs min-h-0">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-zinc-50 border-b border-zinc-300 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={
                          unsubmittedExpenses.length > 0 &&
                          selectedExpenseIds.size === unsubmittedExpenses.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExpenseIds(new Set(unsubmittedExpenses.map((ex) => ex.id)));
                          } else {
                            setSelectedExpenseIds(new Set());
                          }
                        }}
                        className="rounded border-zinc-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-28">Date</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase">Description</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-44">Site / Project</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-right w-28">Amount</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-center w-24">Receipt</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-center w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs">
                  {loadingData ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#0B57D0]" />
                          <span className="font-semibold text-xs">Loading unsubmitted expenses...</span>
                        </div>
                      </td>
                    </tr>
                  ) : unsubmittedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-zinc-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Receipt className="w-8 h-8 text-zinc-300" />
                          <span className="font-semibold text-sm text-zinc-600">
                            No unclaimed expenses in your ledger.
                          </span>
                          <span className="text-xs text-zinc-400">
                            Click "Add Expense" to record an out-of-pocket purchase.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    unsubmittedExpenses.map((exp) => {
                      const isChecked = selectedExpenseIds.has(exp.id);
                      return (
                        <tr
                          key={exp.id}
                          className={`hover:bg-zinc-50/80 transition-colors cursor-pointer ${
                            isChecked ? "bg-blue-50/40" : ""
                          }`}
                          onClick={() => toggleSelectExpense(exp.id)}
                        >
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectExpense(exp.id)}
                              className="rounded border-zinc-300 text-[#0B57D0] focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-semibold text-zinc-700 whitespace-nowrap">
                            {exp.date}
                          </td>
                          <td className="p-3 font-bold text-zinc-900">
                            {exp.description}
                            {exp.remarks && (
                              <span className="block text-[10px] text-zinc-400 font-normal">
                                {exp.remarks}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-zinc-600 truncate max-w-[160px]">
                            {exp.project_department || "-"}
                          </td>
                          <td className="p-3 text-right font-mono font-extrabold text-zinc-950 text-sm">
                            ${Number(exp.amount || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            {exp.receipt_url ? (
                              <button
                                onClick={() => setPreviewingReceiptUrl(exp.receipt_url)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold border border-zinc-300 cursor-pointer"
                              >
                                <Eye className="w-3 h-3 text-zinc-500" /> View
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-400">None</span>
                            )}
                          </td>
                          <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Batch Action Bar */}
            <div className="bg-zinc-50 border-t border-zinc-300 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold text-zinc-600">
                  {selectedExpenseIds.size} of {unsubmittedExpenses.length} expense(s) selected
                </span>

                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold font-mono ${
                    isOverLimit
                      ? "bg-red-50 text-red-700 border-red-300"
                      : selectedExpenseIds.size > 0
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200"
                  }`}
                >
                  <span>Selected: ${roundedSelectedTotal.toFixed(2)}</span>
                  <span className="text-[10px] font-normal text-zinc-400">/ $100.00 max</span>
                </div>

                {isOverLimit && (
                  <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Limit exceeded! Please uncheck an item.
                  </span>
                )}
              </div>

              <CustomButton
                onClick={handleSubmitBatch}
                variant="default"
                disabled={isSubmittingBatch || selectedExpenseIds.size === 0 || isOverLimit}
                className="h-9 px-5 text-xs font-bold uppercase tracking-wider shadow-sm"
              >
                {isSubmittingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    Submit Claim Batch (${roundedSelectedTotal.toFixed(2)})
                  </>
                )}
              </CustomButton>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: SUBMITTED BATCHES & STATUS TRACKING */}
      {activeTab === "batches" && (
        <div className="flex flex-col flex-1 h-full overflow-hidden gap-3 pb-2">
          
          <div className="bg-white p-3.5 rounded-lg border border-zinc-300/80 shadow-xs flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Submitted Claim Batches
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Track supervisor review, approval status, and PayNow payout references.
              </p>
            </div>

            <CustomButton
              onClick={loadOperatorData}
              variant="secondary"
              disabled={loadingData}
              className="h-8 px-3 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingData ? "animate-spin" : ""}`} />
              Refresh
            </CustomButton>
          </div>

          <div className="flex-1 bg-white border border-zinc-300 rounded-lg overflow-hidden flex flex-col shadow-xs min-h-0">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-zinc-50 border-b border-zinc-300 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase w-36">Batch ID / Date</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase">Items Breakdown</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-right w-28">Total Amount</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-center w-36">Payout Status</th>
                    <th className="p-3 text-[10px] font-bold text-zinc-500 uppercase text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-xs">
                  {loadingData ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-[#0B57D0]" />
                          <span className="font-semibold text-xs">Loading submitted batches...</span>
                        </div>
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-zinc-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Clock className="w-8 h-8 text-zinc-300" />
                          <span className="font-semibold text-sm text-zinc-600">
                            No submitted claim batches yet.
                          </span>
                          <span className="text-xs text-zinc-400">
                            Select recorded expenses from your ledger to submit a claim batch.
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => {
                      const itemsList = Array.isArray(batch.items) ? batch.items : [];
                      return (
                        <tr key={batch.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="p-3">
                            <span className="font-mono font-bold text-zinc-900 block text-[11px]">
                              {batch.id}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" /> {batch.claim_date}
                            </span>
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
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3 h-3" /> Paid by Supervisor
                                </span>
                                {batch.payment_reference && (
                                  <span className="block text-[9px] text-zinc-500 font-mono mt-0.5">
                                    Ref: {batch.payment_reference}
                                  </span>
                                )}
                              </div>
                            ) : batch.status === "rejected" ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <Ban className="w-3 h-3" /> Rejected
                                </span>
                                {batch.reject_reason && (
                                  <span className="block text-[9px] text-rose-600 truncate max-w-[140px] mt-0.5">
                                    {batch.reject_reason}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setViewingBatch(batch)}
                              className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold border border-zinc-300 transition-colors cursor-pointer"
                            >
                              Details
                            </button>
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

      {/* BATCH DETAILS MODAL */}
      {viewingBatch && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-zinc-300 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-pop-in">
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Claim Batch {viewingBatch.id}</h3>
                <span className="text-xs text-zinc-500">Submitted on {viewingBatch.claim_date}</span>
              </div>
              <button
                onClick={() => setViewingBatch(null)}
                className="w-7 h-7 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              <div className="flex items-center justify-between bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-xs font-semibold">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase">Reimbursement Target</span>
                  <span className="font-bold text-zinc-900">{viewingBatch.employee_name} ({viewingBatch.paynow_number || "-"})</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-500 block text-[10px] uppercase">Total Payout</span>
                  <span className="font-extrabold text-base font-mono text-zinc-950">${Number(viewingBatch.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">Itemized Expenses</span>
                <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg overflow-hidden bg-white">
                  {(viewingBatch.items || []).map((it, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-zinc-900 block">{it.description}</span>
                        <span className="text-[10px] text-zinc-400 font-semibold">{it.date} • {it.project_department || "HQ"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-zinc-900">${Number(it.amount || 0).toFixed(2)}</span>
                        {it.receipt_url && (
                          <button
                            onClick={() => setPreviewingReceiptUrl(it.receipt_url)}
                            className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 cursor-pointer"
                          >
                            Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex justify-end">
              <CustomButton variant="secondary" onClick={() => setViewingBatch(null)}>
                Close
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT FULL PREVIEW MODAL */}
      {previewingReceiptUrl && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-zinc-300 shadow-2xl max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900">Receipt Image Preview</span>
              <button
                onClick={() => setPreviewingReceiptUrl(null)}
                className="w-7 h-7 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[75vh] bg-zinc-100">
              <img
                src={previewingReceiptUrl}
                alt="Receipt Full Preview"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
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
