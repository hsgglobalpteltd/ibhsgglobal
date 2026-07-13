"use client";

import * as React from "react";
import { 
  RotateCcw, 
  ShieldAlert, 
  Sparkles, 
  Camera, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  Upload, 
  Lock, 
  FileText, 
  ChevronRight, 
  Loader2, 
  Printer, 
  Undo,
  FileSpreadsheet,
  Archive,
  Search
} from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";
import { CustomButton } from "../custom-button";
import { showToast } from "@/lib/toast";
import { toBlob } from "html-to-image";
import { DataTable, Column } from "../data-table";
import { ConfirmDialog } from "../confirm-dialog";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";
import { 
  fetchSnapDeals, 
  saveSnapDeal, 
  uploadSignedProof, 
  revokeSnapDeal, 
  fetchSnapDealLogs, 
  archiveSnapDeal,
  restoreSnapDeal,
  deleteSnapDeal,
  SnapDeal, 
  SnapDealLog 
} from "../../lib/api";

interface SnapDealsModuleProps {
  profile?: {
    role: string;
    modules_access: string[];
    email?: string;
    name?: string;
  } | null;
}

// Math.ceil helper to guarantee rounding up to 2 decimal places
function roundUpToTwoDecimals(num: number): number {
  return Math.ceil((num || 0) * 100) / 100;
}

const DEFAULT_TERMS = "Minimum order value is SGD 3,000 per order.\nDelivery will be made within a maximum of 2 weeks from the date the order is placed.\nAll prices stated are for goods only and exclude any additional charges unless otherwise specified.";

export function SnapDealsModule({ profile }: SnapDealsModuleProps) {
  // Navigation & Page level state
  const [activeTab, setActiveTab] = React.useState<string>("calculator2");
  const [deals, setDeals] = React.useState<SnapDeal[]>([]);
  const [loadingDeals, setLoadingDeals] = React.useState<boolean>(false);

  // Calculator states for active product item
  const [pricingMode, setPricingMode] = React.useState<"margin" | "rsp_cap">("margin");
  const [cost, setCost] = React.useState<string>("0");
  const [feeIf, setFeeIf] = React.useState<string>("4.50");
  const [feeDuty, setFeeDuty] = React.useState<string>("9.00");
  const [feeOther, setFeeOther] = React.useState<string>("12.00");
  const [marginHsg, setMarginHsg] = React.useState<string>("0.00");
  const [marginBuyer, setMarginBuyer] = React.useState<string>("0.00");
  const [customRsp, setCustomRsp] = React.useState<string>("");

  // Local state for margins to prevent keyboard stutter
  const [localMarginHsg, setLocalMarginHsg] = React.useState<string>("0.00");
  const [localMarginBuyer, setLocalMarginBuyer] = React.useState<string>("0.00");

  const hsgInputRef = React.useRef<HTMLInputElement>(null);
  const buyerInputRef = React.useRef<HTMLInputElement>(null);
  const breakdownRef = React.useRef<HTMLDivElement>(null);
  const centerColRef = React.useRef<HTMLDivElement>(null);
  const rightColRef = React.useRef<HTMLDivElement>(null);
  const [copying, setCopying] = React.useState(false);
  const [isSnapping, setIsSnapping] = React.useState(false);

  // New Deal Builder States
  const [editingDealId, setEditingDealId] = React.useState<string | null>(null);
  const [itemName, setItemName] = React.useState<string>("");
  const [itemDescription, setItemDescription] = React.useState<string>("");
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [itemList, setItemList] = React.useState<any[]>([]);

  // Deal Particulars states
  const [dealingWith, setDealingWith] = React.useState<string>("");
  const [handshakeDate, setHandshakeDate] = React.useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [notes, setNotes] = React.useState<string>("");
  const [termsConditions, setTermsConditions] = React.useState<string>("");

  // Drawer & Overlay States
  const [dealDrawerOpen, setDealDrawerOpen] = React.useState<boolean>(false);
  const [detailPanelOpen, setDetailPanelOpen] = React.useState<boolean>(false);
  const [selectedDeal, setSelectedDeal] = React.useState<SnapDeal | null>(null);
  const [selectedDealLogs, setSelectedDealLogs] = React.useState<SnapDealLog[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState<boolean>(false);

  // T&C Modal States
  const [selectedTermsDeal, setSelectedTermsDeal] = React.useState<SnapDeal | null>(null);
  const [showTermsModal, setShowTermsModal] = React.useState<boolean>(false);
  const [termsModalValue, setTermsModalValue] = React.useState<string>("");

  // View Modal States
  const [selectedViewDeal, setSelectedViewDeal] = React.useState<SnapDeal | null>(null);
  const [showViewModal, setShowViewModal] = React.useState<boolean>(false);
  const [viewDealLogs, setViewDealLogs] = React.useState<SnapDealLog[]>([]);
  const [loadingViewLogs, setLoadingViewLogs] = React.useState<boolean>(false);

  // Print Configuration States
  const [showMarketPriceInPrint, setShowMarketPriceInPrint] = React.useState<boolean>(false);

  // Load Dropdown States
  const [loadSearchQuery, setLoadSearchQuery] = React.useState<string>("");
  const [showLoadDropdown, setShowLoadDropdown] = React.useState<boolean>(false);
  const loadDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (loadDropdownRef.current && !loadDropdownRef.current.contains(event.target as Node)) {
        setShowLoadDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Save deal particulars modal
  const [saveModalOpen, setSaveModalOpen] = React.useState<boolean>(false);
  const [savingDeal, setSavingDeal] = React.useState<boolean>(false);

  // Generic Confirm Dialog States
  const [confirmModalOpen, setConfirmModalOpen] = React.useState<boolean>(false);
  const [confirmModalConfig, setConfirmModalConfig] = React.useState<{
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    variant?: "danger" | "default" | "dark";
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = (config: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "default" | "dark";
    onConfirm: () => void;
  }) => {
    setConfirmModalConfig({
      title: config.title,
      description: config.description,
      confirmText: config.confirmText || "Confirm",
      cancelText: config.cancelText || "Cancel",
      variant: config.variant,
      onConfirm: config.onConfirm
    });
    setConfirmModalOpen(true);
  };

  // Calculator 2 States & Refs
  const [loadDealIdInput, setLoadDealIdInput] = React.useState<string>("");
  const calculator2BreakdownRef = React.useRef<HTMLDivElement>(null);

  const tabs = React.useMemo(() => [
    { id: "calculator2", label: "Calculator" },
    { id: "draft", label: "Proposal" },
    { id: "active", label: "Accepted Deals" },
    { id: "archive", label: "Archive" }
  ], []);

  // Fetch deals on mount
  const loadDeals = React.useCallback(async () => {
    setLoadingDeals(true);
    try {
      const data = await fetchSnapDeals();
      setDeals(data);
    } catch (err: any) {
      showToast(err.message || "Failed to load snap deals", "error");
    } finally {
      setLoadingDeals(false);
    }
  }, []);

  React.useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // Lock scroll behavior on main wrapper
  React.useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.style.overflow = "hidden";
      mainEl.style.height = "calc(100vh - 64px)";
    }
    return () => {
      if (mainEl) {
        mainEl.style.overflow = "";
        mainEl.style.height = "";
      }
    };
  }, []);

  // Parse values safely
  const parsedCost = parseFloat(cost) || 0;
  const parsedIf = parseFloat(feeIf) || 0;
  const parsedDuty = parseFloat(feeDuty) || 0;
  const parsedOther = parseFloat(feeOther) || 0;

  // Intermediate calculations
  const ifCost = React.useMemo(() => roundUpToTwoDecimals(parsedCost * (parsedIf / 100)), [parsedCost, parsedIf]);
  const dutyCost = React.useMemo(() => roundUpToTwoDecimals(parsedCost * (parsedDuty / 100)), [parsedCost, parsedDuty]);
  const totalA = React.useMemo(() => roundUpToTwoDecimals(parsedCost + ifCost + dutyCost), [parsedCost, ifCost, dutyCost]);
  const otherCostVal = React.useMemo(() => roundUpToTwoDecimals(totalA * (parsedOther / 100)), [totalA, parsedOther]);
  const totalB = React.useMemo(() => roundUpToTwoDecimals(totalA + otherCostVal), [totalA, otherCostVal]);

  const parsedCustomRsp = parseFloat(customRsp) || 0;
  const totalMarginPercent = React.useMemo(() => {
    if (parsedCustomRsp <= 0) return 0;
    return ((parsedCustomRsp - totalB) / parsedCustomRsp) * 100;
  }, [parsedCustomRsp, totalB]);

  // Keep local inputs in sync with margin ground truth
  React.useEffect(() => {
    if (document.activeElement !== hsgInputRef.current) {
      setLocalMarginHsg(marginHsg);
    }
  }, [marginHsg]);

  React.useEffect(() => {
    if (document.activeElement !== buyerInputRef.current) {
      setLocalMarginBuyer(marginBuyer);
    }
  }, [marginBuyer]);

  // Balance margins helper (on cost change or target price load)
  const balanceOnCostChange = React.useCallback((newTotalB: number, currentRspVal: number, currentBuyerVal: number) => {
    if (currentRspVal <= 0) return;
    const marginPool = ((currentRspVal - newTotalB) / currentRspVal) * 100;
    const cappedBuyer = Math.min(Math.max(0, currentBuyerVal), Math.max(0, marginPool));
    const newHsg = Math.max(0, marginPool - cappedBuyer);
    
    const newBuyerStr = cappedBuyer.toFixed(2);
    const newHsgStr = newHsg.toFixed(2);
    
    setMarginBuyer(newBuyerStr);
    setMarginHsg(newHsgStr);
    setLocalMarginBuyer(newBuyerStr);
    setLocalMarginHsg(newHsgStr);
  }, []);

  const handleCostChange = (val: string) => {
    setCost(val);
    if (pricingMode === "rsp_cap") {
      const cVal = parseFloat(val) || 0;
      const ifC = roundUpToTwoDecimals(cVal * (parsedIf / 100));
      const dutyC = roundUpToTwoDecimals(cVal * (parsedDuty / 100));
      const tA = roundUpToTwoDecimals(cVal + ifC + dutyC);
      const oC = roundUpToTwoDecimals(tA * (parsedOther / 100));
      const tB = roundUpToTwoDecimals(tA + oC);
      balanceOnCostChange(tB, parsedCustomRsp, parseFloat(marginBuyer) || 0);
    }
  };

  const handleIfChange = (val: string) => {
    setFeeIf(val);
    if (pricingMode === "rsp_cap") {
      const ifPct = parseFloat(val) || 0;
      const ifC = roundUpToTwoDecimals(parsedCost * (ifPct / 100));
      const tA = roundUpToTwoDecimals(parsedCost + ifC + dutyCost);
      const oC = roundUpToTwoDecimals(tA * (parsedOther / 100));
      const tB = roundUpToTwoDecimals(tA + oC);
      balanceOnCostChange(tB, parsedCustomRsp, parseFloat(marginBuyer) || 0);
    }
  };

  const handleDutyChange = (val: string) => {
    setFeeDuty(val);
    if (pricingMode === "rsp_cap") {
      const dutyPct = parseFloat(val) || 0;
      const dutyC = roundUpToTwoDecimals(parsedCost * (dutyPct / 100));
      const tA = roundUpToTwoDecimals(parsedCost + ifCost + dutyC);
      const oC = roundUpToTwoDecimals(tA * (parsedOther / 100));
      const tB = roundUpToTwoDecimals(tA + oC);
      balanceOnCostChange(tB, parsedCustomRsp, parseFloat(marginBuyer) || 0);
    }
  };

  const handleOtherChange = (val: string) => {
    setFeeOther(val);
    if (pricingMode === "rsp_cap") {
      const otherPct = parseFloat(val) || 0;
      const oC = roundUpToTwoDecimals(totalA * (otherPct / 100));
      const tB = roundUpToTwoDecimals(totalA + oC);
      balanceOnCostChange(tB, parsedCustomRsp, parseFloat(marginBuyer) || 0);
    }
  };

  const handleHsgMarginChange = (val: string) => {
    setLocalMarginHsg(val);
  };

  const handleBuyerMarginChange = (val: string) => {
    setLocalMarginBuyer(val);
  };

  const handleHsgMarginBlur = () => {
    const val = parseFloat(localMarginHsg) || 0;
    if (pricingMode === "rsp_cap") {
      const cappedHsg = Math.min(Math.max(0, val), Math.max(0, totalMarginPercent));
      const buyerVal = Math.max(0, totalMarginPercent - cappedHsg);
      
      const newHsgStr = cappedHsg.toFixed(2);
      const newBuyerStr = buyerVal.toFixed(2);
      
      setMarginHsg(newHsgStr);
      setMarginBuyer(newBuyerStr);
      setLocalMarginHsg(newHsgStr);
      setLocalMarginBuyer(newBuyerStr);
    } else {
      const formatted = val.toFixed(2);
      setMarginHsg(formatted);
      setLocalMarginHsg(formatted);
    }
  };

  const handleBuyerMarginBlur = () => {
    const val = parseFloat(localMarginBuyer) || 0;
    if (pricingMode === "rsp_cap") {
      const cappedBuyer = Math.min(Math.max(0, val), Math.max(0, totalMarginPercent));
      const hsgVal = Math.max(0, totalMarginPercent - cappedBuyer);
      
      const newBuyerStr = cappedBuyer.toFixed(2);
      const newHsgStr = hsgVal.toFixed(2);
      
      setMarginBuyer(newBuyerStr);
      setMarginHsg(newHsgStr);
      setLocalMarginBuyer(newBuyerStr);
      setLocalMarginHsg(newHsgStr);
    } else {
      const formatted = val.toFixed(2);
      setMarginBuyer(formatted);
      setLocalMarginBuyer(formatted);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleRspChange = (val: string) => {
    setCustomRsp(val);
    const activeRsp = parseFloat(val) || 0;
    if (activeRsp > 0) {
      setPricingMode("rsp_cap");
      const pool = ((activeRsp - totalB) / activeRsp) * 100;
      setMarginBuyer("0.00");
      setMarginHsg(Math.max(0, pool).toFixed(2));
    } else {
      setPricingMode("margin");
      setMarginBuyer("0.00");
      setMarginHsg("0.00");
    }
  };

  const handleModeSwitch = (mode: "margin" | "rsp_cap") => {
    setPricingMode(mode);
    if (mode === "rsp_cap") {
      const activeRsp = parseFloat(customRsp) || 0;
      if (activeRsp > 0) {
        const pool = ((activeRsp - totalB) / activeRsp) * 100;
        setMarginBuyer("0.00");
        setMarginHsg(Math.max(0, pool).toFixed(2));
      } else {
        setMarginBuyer("0.00");
        setMarginHsg("0.00");
      }
    } else {
      if (calculations.priceTag > 0) {
        setCustomRsp(calculations.priceTag.toFixed(2));
      }
    }
  };

  const handleReset = () => {
    setCost("0");
    setFeeIf("4.50");
    setFeeDuty("9.00");
    setFeeOther("12.00");
    setMarginHsg("0.00");
    setMarginBuyer("0.00");
    setLocalMarginHsg("0.00");
    setLocalMarginBuyer("0.00");
    setCustomRsp("");
    setItemName("");
    setItemDescription("");
    setEditingItemId(null);
  };

  // Perform core calculations for current item
  const calculations = React.useMemo(() => {
    const parsedHsg = parseFloat(marginHsg) || 0;
    const parsedBuyer = parseFloat(marginBuyer) || 0;
    const parsedCustomRsp = parseFloat(customRsp) || 0;

    let computedPriceTag = 0;
    let computedCostToBuyer = 0;
    let computedHsgProfit = 0;
    let computedBuyerProfit = 0;
    let isFormulaValid = true;

    if (pricingMode === "margin") {
      if (parsedHsg >= 100) {
        isFormulaValid = false;
      } else {
        computedCostToBuyer = roundUpToTwoDecimals(totalB / (1 - parsedHsg / 100));
      }

      if (parsedBuyer >= 100) {
        isFormulaValid = false;
      } else {
        computedPriceTag = roundUpToTwoDecimals(computedCostToBuyer / (1 - parsedBuyer / 100));
      }

      computedHsgProfit = roundUpToTwoDecimals(computedCostToBuyer - totalB);
      computedBuyerProfit = roundUpToTwoDecimals(computedPriceTag - computedCostToBuyer);
    } else {
      computedPriceTag = parsedCustomRsp;
      if (parsedCustomRsp <= 0) {
        isFormulaValid = false;
      } else {
        computedBuyerProfit = roundUpToTwoDecimals(parsedCustomRsp * (parsedBuyer / 100));
        computedHsgProfit = roundUpToTwoDecimals(parsedCustomRsp * (parsedHsg / 100));
        computedCostToBuyer = roundUpToTwoDecimals(parsedCustomRsp - computedBuyerProfit);

        if (roundUpToTwoDecimals(computedBuyerProfit + computedHsgProfit) > parsedCustomRsp) {
          isFormulaValid = false;
        }
      }
    }

    const inputGST = roundUpToTwoDecimals(dutyCost + (otherCostVal * 0.09));
    const outputGST = roundUpToTwoDecimals(computedCostToBuyer * 0.09);
    const netGST = roundUpToTwoDecimals(outputGST - inputGST);
    const netProfit = roundUpToTwoDecimals(computedHsgProfit - netGST);
    const loss = computedHsgProfit < 0;

    const ourMarginRsp = computedPriceTag > 0 ? (computedHsgProfit / computedPriceTag) * 100 : 0;
    const ourMarginBuyerCost = computedCostToBuyer > 0 ? (computedHsgProfit / computedCostToBuyer) * 100 : 0;

    return {
      priceTag: computedPriceTag,
      costToBuyer: computedCostToBuyer,
      hsgProfit: computedHsgProfit,
      buyerProfit: computedBuyerProfit,
      inputGST,
      outputGST,
      netGST,
      netProfit,
      isFormulaValid,
      loss,
      ourMarginRsp,
      ourMarginBuyerCost,
    };
  }, [pricingMode, totalB, marginHsg, marginBuyer, customRsp, dutyCost, otherCostVal]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val);
  };

  const handleCapture = async () => {
    if (!itemName.trim() || !itemDescription.trim()) {
      showToast("Item Name and Description are required to snap deal.", "error");
      return;
    }
    if (!breakdownRef.current) return;
    setCopying(true);
    setIsSnapping(true);

    const centerCol = centerColRef.current;
    const rightCol = rightColRef.current;
    if (centerCol) centerCol.style.overflow = "hidden";
    if (rightCol) rightCol.style.overflow = "hidden";

    // Give browser a moment to repaint
    await new Promise((resolve) => setTimeout(resolve, 80));

    try {
      const blob = await toBlob(breakdownRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        width: breakdownRef.current.offsetWidth,
        height: breakdownRef.current.offsetHeight,
      });

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const cleanItem = (itemName || "item").trim().replace(/\s+/g, "_");
        const cleanDesc = (itemDescription || "description").trim().replace(/\s+/g, "_");
        a.download = `snapshot_cal_${cleanItem}_${cleanDesc}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Snapshot Complete, Check Download", "success");
      } else {
        throw new Error("Blob generation failed");
      }
    } catch (err) {
      console.error("Capture failed:", err);
      showToast("Screenshot failed.", "error");
    } finally {
      if (centerCol) centerCol.style.overflow = "";
      if (rightCol) rightCol.style.overflow = "";
      setIsSnapping(false);
      setCopying(false);
    }
  };

  // Add item from calculator to current list
  const handleAddItemToList = () => {
    if (!itemName.trim() || !itemDescription.trim()) {
      showToast("Item Name and Description are required", "error");
      return;
    }
    if (parsedCost <= 0) {
      showToast("Please enter a valid Cost Price", "error");
      return;
    }
    if (!calculations.isFormulaValid) {
      showToast("Formula is invalid. Review pricing or margins.", "error");
      return;
    }

    const newItem = {
      id: editingItemId || `item_${Date.now()}`,
      itemName: itemName.trim(),
      itemDescription: itemDescription.trim(),
      brand: itemName.trim(), // Keep brand/product for backward compatibility
      product: itemDescription.trim(),
      cost: parsedCost,
      feeIf: parsedIf,
      feeDuty: parsedDuty,
      feeOther: parsedOther,
      marginHsg: parseFloat(marginHsg) || 0,
      marginBuyer: parseFloat(marginBuyer) || 0,
      customRsp: parsedCustomRsp,
      pricingMode,
      // Cached computed values for table display
      computedRsp: calculations.priceTag,
      computedCostToBuyer: calculations.costToBuyer,
      computedHsgProfit: calculations.hsgProfit,
      computedBuyerProfit: calculations.buyerProfit,
      computedNetProfit: calculations.netProfit,
      computedNetGst: calculations.netGST
    };

    if (editingItemId) {
      setItemList((prev) => prev.map((item) => (item.id === editingItemId ? newItem : item)));
      showToast("Item updated in list!", "success");
    } else {
      setItemList((prev) => [...prev, newItem]);
      showToast("Item added to list!", "success");
    }

    handleReset();
  };

  const handleEditListItem = (item: any) => {
    setEditingItemId(item.id);
    setItemName(item.itemName || item.brand || "");
    setItemDescription(item.itemDescription || item.product || "");
    setCost(item.cost.toString());
    setFeeIf(item.feeIf.toString());
    setFeeDuty(item.feeDuty.toString());
    setFeeOther(item.feeOther.toString());
    setMarginHsg(item.marginHsg.toString());
    setMarginBuyer(item.marginBuyer.toString());
    setCustomRsp(item.customRsp ? item.customRsp.toString() : "");
    setPricingMode(item.pricingMode);
  };

  const handleDeleteListItem = (itemId: string) => {
    setItemList((prev) => prev.filter((i) => i.id !== itemId));
    showToast("Product removed from list", "info");
    if (editingItemId === itemId) {
      handleReset();
    }
  };

  // Save deal (triggers modal popup)
  const handleSaveDealClick = () => {
    if (itemList.length === 0) {
      showToast("Add at least 1 product to the list first", "error");
      return;
    }
    setSaveModalOpen(true);
  };

  const handleConfirmSaveDeal = async () => {
    if (!dealingWith.trim()) {
      showToast("Please enter Client Name", "error");
      return;
    }
    
    const dealId = editingDealId || `deal_${Date.now()}`;
    const payload = {
      id: dealId,
      dealing_with: dealingWith.trim(),
      handshake_date: new Date(handshakeDate).getTime(),
      notes,
      terms_conditions: termsConditions,
      deal_data: JSON.stringify(itemList),
      actor_email: profile?.email || "anonymous@hsg.com",
      actor_name: profile?.name || "Anonymous User"
    };

    // Optimistic UI Update: Create or modify the deal in local state immediately
    const tempDeal: SnapDeal = {
      id: dealId,
      dealing_with: dealingWith.trim(),
      handshake_date: new Date(handshakeDate).getTime(),
      notes,
      terms_conditions: termsConditions,
      deal_data: JSON.stringify(itemList),
      status: editingDealId ? (deals.find(d => d.id === editingDealId)?.status || "Draft") : "Draft",
      signed_proof_url: editingDealId ? (deals.find(d => d.id === editingDealId)?.signed_proof_url || undefined) : undefined
    };

    setDeals(prev => {
      const idx = prev.findIndex(d => d.id === dealId);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = tempDeal;
        return copy;
      } else {
        return [tempDeal, ...prev];
      }
    });

    // Instantly close panel, modal and reset input states
    showToast(editingDealId ? "Deal updated successfully!" : "Deal saved successfully!", "success");
    setSaveModalOpen(false);
    setDealDrawerOpen(false);
    setEditingDealId(null);
    setItemList([]);
    setDealingWith("");
    setNotes("");
    setTermsConditions("");
    handleReset();

    // Silently save in the background
    saveSnapDeal(payload)
      .then(res => {
        if (res.success) {
          // Silently sync the actual state from database
          loadDeals();
        } else {
          console.error("Failed to save snap deal silently", res);
        }
      })
      .catch(err => {
        console.error("Silent save snap deal error", err);
        showToast("Cloud sync failed. Will retry on next refresh.", "warning");
      });
  };

  const handleCancelEdit = () => {
    setEditingDealId(null);
    setItemList([]);
    setDealingWith("");
    setNotes("");
    setTermsConditions("");
    handleReset();
    showToast("Edit cancelled", "info");
  };

  // Open deal for editing in calculator
  const handleLoadDealForEdit = (deal: SnapDeal) => {
    try {
      const parsedItems = JSON.parse(deal.deal_data);
      setItemList(parsedItems);
      setEditingDealId(deal.id);
      setDealingWith(deal.dealing_with);
      setHandshakeDate(new Date(deal.handshake_date).toISOString().substring(0, 10));
      setNotes(deal.notes || "");
      setTermsConditions(deal.terms_conditions || "");
      
      // Open form
      handleReset();
      if (activeTab !== "calculator2") {
        setActiveTab("calculator2");
      }
      showToast("Loaded deal successfully!", "success");
    } catch (e) {
      showToast("Failed to parse deal items", "error");
    }
  };

  const handleLoadDealById = () => {
    const targetId = loadDealIdInput.trim();
    if (!targetId) {
      showToast("Please enter a Deal ID to load", "error");
      return;
    }
    const foundDeal = deals.find(d => d.id === targetId);
    if (foundDeal) {
      handleLoadDealForEdit(foundDeal);
    } else {
      showToast(`Deal with ID "${targetId}" not found`, "error");
    }
  };

  const handleCapture2 = async () => {
    if (!itemName.trim() || !itemDescription.trim()) {
      showToast("Item Name and Description are required to snap deal.", "error");
      return;
    }
    if (!calculator2BreakdownRef.current) return;
    setCopying(true);
    setIsSnapping(true);
    // Give browser a moment to repaint
    await new Promise((resolve) => setTimeout(resolve, 80));
    try {
      const blob = await toBlob(calculator2BreakdownRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        width: calculator2BreakdownRef.current.offsetWidth,
        height: calculator2BreakdownRef.current.offsetHeight,
      });

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const cleanItem = (itemName || "item").trim().replace(/\s+/g, "_");
        const cleanDesc = (itemDescription || "description").trim().replace(/\s+/g, "_");
        a.download = `snapshot_cal_${cleanItem}_${cleanDesc}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Snapshot Complete, Check Download", "success");
      } else {
        throw new Error("Blob generation failed");
      }
    } catch (err) {
      console.error("Capture failed:", err);
      showToast("Screenshot failed.", "error");
    } finally {
      setIsSnapping(false);
      setCopying(false);
    }
  };

  // Upload signed proof & lock
  const handleUploadProof = async (dealId: string, file: File) => {
    // Optimistic UI Update: Lock and activate the deal in the UI immediately
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: "Active" } : d));
    showToast("Signed contract captured! Syncing proof...", "success");

    // Silently upload file in the background
    uploadSignedProof(
      dealId,
      file,
      profile?.email || "anonymous@hsg.com",
      profile?.name || "Anonymous User"
    )
      .then(res => {
        if (res.success) {
          showToast("Contract uploaded successfully. Deal is locked!", "success");
          loadDeals();
        } else {
          console.error("Failed to upload signed proof silently", res);
        }
      })
      .catch(err => {
        console.error("Silent upload proof error", err);
        showToast("Signed contract upload failed. Please try again.", "error");
      });
  };

  // Revoke deal
  const handleRevokeDeal = async (dealId: string) => {
    showConfirm({
      title: "Revoke Signed Contract",
      description: "Are you sure you want to revoke this deal? This will delete the signed proof and unlock the deal for edits.",
      confirmText: "Revoke",
      onConfirm: () => {
        // Optimistic UI Update: Revert deal status to Draft immediately in the UI
        setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: "Draft", signed_proof_url: undefined } : d));
        showToast("Deal unlocked and reverted to active proposal status!", "success");

        // Silently update database in background
        revokeSnapDeal(
          dealId,
          profile?.email || "anonymous@hsg.com",
          profile?.name || "Anonymous User"
        )
          .then(res => {
            if (res.success) {
              loadDeals();
            } else {
              console.error("Failed to revoke deal silently", res);
            }
          })
          .catch(err => {
            console.error("Silent revoke error", err);
          });
      }
    });
  };

  const handleArchiveDeal = async (dealId: string) => {
    showConfirm({
      title: "Archive Deal",
      description: "Are you sure you want to archive this deal? It will be removed from Accepted Deals and stored in the Archive.",
      confirmText: "Archive",
      onConfirm: () => {
        // Optimistic UI Update: Change status to Archived immediately in the UI
        setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: "Archived" } : d));
        showToast("Deal archived successfully", "success");

        // Silently archive in database in background
        archiveSnapDeal(
          dealId,
          profile?.email || "anonymous@hsg.com",
          profile?.name || "Anonymous User"
        )
          .then(res => {
            if (res.success) {
              loadDeals();
            } else {
              console.error("Failed to archive silently", res);
            }
          })
          .catch(err => {
            console.error("Silent archive error", err);
          });
      }
    });
  };

  const handleDeleteDeal = async (dealId: string) => {
    showConfirm({
      title: "Delete Deal",
      description: "Are you sure you want to permanently delete this deal? This action cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
      onConfirm: () => {
        // Optimistic UI Update: remove from list
        setDeals(prev => prev.filter(d => d.id !== dealId));
        showToast("Deal deleted successfully", "success");

        // Silently delete in database in background
        deleteSnapDeal(
          dealId,
          profile?.email || "anonymous@hsg.com",
          profile?.name || "Anonymous User"
        )
          .then(res => {
            if (res.success) {
              loadDeals();
            } else {
              console.error("Failed to delete silently", res);
            }
          })
          .catch(err => {
            console.error("Silent delete error", err);
          });
      }
    });
  };

  const handleRestoreDeal = async (dealId: string) => {
    // Optimistic UI Update: Change status back to Active immediately in the UI
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: "Active" } : d));
    showToast("Deal restored to Accepted Deals!", "success");

    // Silently restore in database in background
    restoreSnapDeal(
      dealId,
      profile?.email || "anonymous@hsg.com",
      profile?.name || "Anonymous User"
    )
      .then(res => {
        if (res.success) {
          loadDeals();
        } else {
          console.error("Failed to restore silently", res);
        }
      })
      .catch(err => {
        console.error("Silent restore error", err);
      });
  };

  // Open detail panel
  const handleOpenDetailPanel = async (deal: SnapDeal) => {
    setSelectedDeal(deal);
    setDetailPanelOpen(true);
    setLoadingLogs(true);
    try {
      const logsData = await fetchSnapDealLogs(deal.id);
      setSelectedDealLogs(logsData);
    } catch (err: any) {
      showToast("Failed to load audit logs", "error");
    } finally {
      setLoadingLogs(false);
    }
  };

  // Dynamic A4 Blob PDF Generator using jsPDF
  const generateBlobPDF = (deal: SnapDeal, type: "proposal" | "contract") => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Main Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(24, 24, 27); // Zinc-900
    const title = type === "proposal" ? "HSG Global Deal Proposal" : "HSG Global Deal Contract";
    doc.text(title, 14, 20);

    // Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(113, 113, 122); // Zinc-500
    const formattedDate = formatDateString(deal.handshake_date);
    doc.text(formattedDate, 196, 20, { align: "right" });

    // Client particulars & Client Note
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(24, 24, 27);
    doc.text(deal.dealing_with, 14, 27);

    let yOffset = 31;
    if (type === "proposal" && deal.notes && deal.notes.trim()) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91); // Zinc-600
      const wrappedNote = doc.splitTextToSize(deal.notes, 180);
      doc.text(wrappedNote, 14, yOffset);
      yOffset += wrappedNote.length * 4 + 4;
    } else {
      yOffset += 2;
    }

    // Load items data
    let items: any[] = [];
    try {
      items = JSON.parse(deal.deal_data);
    } catch (e) {}

    // Columns structure
    const columns: { header: string; width: number; align: "left" | "right" | "center" }[] = [];
    columns.push({ header: "No.", width: 10, align: "center" });
    columns.push({ header: "Items", width: 25, align: "left" });
    columns.push({ header: "Description", width: 0, align: "left" }); // description is 100% grow width

    if (type === "proposal") {
      columns.push({ header: "Our Cost", width: 20, align: "right" });
      columns.push({ header: "Margin", width: 16, align: "right" });
      columns.push({ header: "Net Profit", width: 20, align: "right" });
      columns.push({ header: "Client Cost", width: 22, align: "right" });
    } else {
      columns.push({ header: "Cost", width: 25, align: "right" });
    }

    if (showMarketPriceInPrint) {
      columns.push({ header: "Market Price", width: 22, align: "right" });
    }

    // Calculate Description column width dynamically to fill the page width
    const totalFixedWidth = columns.reduce((sum, col) => sum + col.width, 0);
    const printableWidth = 182; // 210mm (A4 width) - 28mm (14mm margins left & right)
    const descWidth = printableWidth - totalFixedWidth;

    const descCol = columns.find(c => c.header === "Description");
    if (descCol) descCol.width = descWidth;

    // Draw Table Header
    doc.setFillColor(244, 244, 245); // Zinc-100
    doc.rect(14, yOffset - 4, printableWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(82, 82, 91); // Zinc-600

    let currentX = 14;
    columns.forEach(col => {
      let headerX = currentX;
      if (col.align === "right") {
        headerX = currentX + col.width - 2;
        doc.text(col.header, headerX, yOffset, { align: "right" });
      } else if (col.align === "center") {
        headerX = currentX + col.width / 2;
        doc.text(col.header, headerX, yOffset, { align: "center" });
      } else {
        doc.text(col.header, headerX + 2, yOffset);
      }
      currentX += col.width;
    });

    yOffset += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(39, 39, 42); // Zinc-800

    // Draw Rows
    items.forEach((item, index) => {
      const seqNo = (index + 1).toString();
      
      // Items: brand name, cut text if too long, no wrap, align top
      let brandText = item.brand || "";
      if (brandText.length > 14) {
        brandText = brandText.substring(0, 12) + "..";
      }

      // Description: product name, text wrap, align top
      const descLines = doc.splitTextToSize(item.product || "", descWidth - 4);
      
      // Calculate row height
      const rowHeight = Math.max(descLines.length * 4 + 2, 6);

      // Page overflow check
      if (yOffset + rowHeight > 280) {
        doc.addPage();
        yOffset = 20;

        // Redraw Header on new page
        doc.setFillColor(244, 244, 245);
        doc.rect(14, yOffset - 4, printableWidth, 7, "F");
        doc.setFont("helvetica", "bold");
        currentX = 14;
        columns.forEach(col => {
          let headerX = currentX;
          if (col.align === "right") {
            headerX = currentX + col.width - 2;
            doc.text(col.header, headerX, yOffset, { align: "right" });
          } else if (col.align === "center") {
            headerX = currentX + col.width / 2;
            doc.text(col.header, headerX, yOffset, { align: "center" });
          } else {
            doc.text(col.header, headerX + 2, yOffset);
          }
          currentX += col.width;
        });
        yOffset += 6;
        doc.setFont("helvetica", "normal");
      }

      // Draw bottom separator line
      doc.setDrawColor(228, 228, 231); // Zinc-200
      doc.line(14, yOffset - 4, 14 + printableWidth, yOffset - 4);

      // Draw cells
      currentX = 14;
      columns.forEach(col => {
        let cellText = "";
        if (col.header === "No.") cellText = seqNo;
        else if (col.header === "Items") cellText = brandText;
        else if (col.header === "Our Cost") {
          const landed = item.cost * (1 + (item.feeIf || 0)/100 + (item.feeDuty || 0)/100);
          const ourCost = landed * (1 + (item.feeOther || 0)/100);
          cellText = formatCurrency(ourCost);
        }
        else if (col.header === "Margin") cellText = `${(item.marginHsg || 0).toFixed(2)}%`;
        else if (col.header === "Net Profit") cellText = formatCurrency(item.computedNetProfit || 0);
        else if (col.header === "Client Cost" || col.header === "Cost") cellText = formatCurrency(item.computedCostToBuyer || 0);
        else if (col.header === "Market Price") cellText = formatCurrency(item.computedRsp || 0);

        if (col.header === "Description") {
          doc.text(descLines, currentX + 2, yOffset);
        } else {
          let cellX = currentX;
          if (col.align === "right") {
            cellX = currentX + col.width - 2;
            doc.text(cellText, cellX, yOffset, { align: "right" });
          } else if (col.align === "center") {
            cellX = currentX + col.width / 2;
            doc.text(cellText, cellX, yOffset, { align: "center" });
          } else {
            doc.text(cellText, cellX + 2, yOffset);
          }
        }
        currentX += col.width;
      });

      yOffset += rowHeight;
    });

    // Draw final table bottom line
    doc.line(14, yOffset - 4, 14 + printableWidth, yOffset - 4);

    // Terms & Conditions block
    if (deal.terms_conditions && deal.terms_conditions.trim()) {
      const wrappedTerms = doc.splitTextToSize(deal.terms_conditions, 182);
      const termsHeight = wrappedTerms.length * 4 + 6;

      if (yOffset + termsHeight > 280) {
        doc.addPage();
        yOffset = 20;
      } else {
        yOffset += 4;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91); // Zinc-600
      doc.text("Term & Condition", 14, yOffset);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122); // Zinc-500
      doc.text(wrappedTerms, 14, yOffset + 4.5);
      yOffset += termsHeight + 4;
    }

    // Draw Signatures for Contract (External)
    if (type === "contract") {
      if (yOffset + 35 > 280) {
        doc.addPage();
        yOffset = 20;
      } else {
        yOffset += 6;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91); // Zinc-600

      // Left Column: HSG
      doc.text("Authorized Signature", 14, yOffset);
      doc.text("HSG Global Pte Ltd", 14, yOffset + 4.5);
      doc.line(14, yOffset + 22, 74, yOffset + 22);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(113, 113, 122);
      doc.text("Date & Authorized Signature", 14, yOffset + 25.5);

      // Right Column: Client
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(82, 82, 91);
      doc.text("Accepted & Approved By", 120, yOffset);
      doc.text(deal.dealing_with, 120, yOffset + 4.5);
      doc.line(120, yOffset + 22, 180, yOffset + 22);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(113, 113, 122);
      doc.text("Date & Authorized Signature", 120, yOffset + 25.5);
    }

    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
  };

  // Parse items list safely for selected deal
  const selectedDealItems = React.useMemo(() => {
    if (!selectedDeal) return [];
    try {
      return JSON.parse(selectedDeal.deal_data);
    } catch (e) {
      return [];
    }
  }, [selectedDeal]);

  // Format Unix timestamp to dd/mm/yyyy
  const formatDateString = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateStringWithTime = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hrs = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hrs}:${mins}`;
  };

  // Modal controllers
  const handleOpenTermsModal = (deal: SnapDeal) => {
    setSelectedTermsDeal(deal);
    setTermsModalValue(deal.terms_conditions || "");
    setShowTermsModal(true);
  };

  const handleSaveTerms = async () => {
    if (!selectedTermsDeal) return;

    const isDraft = selectedTermsDeal.status === "Draft" || !selectedTermsDeal.status;
    if (!isDraft) {
      showToast("Only deals in Proposal status can have T&Cs added or updated.", "error");
      return;
    }

    const updatedTerms = termsModalValue.trim();
    const originalTerms = selectedTermsDeal.terms_conditions || "";

    // Optimistic UI update: update local deals list
    setDeals(prev => prev.map(d => d.id === selectedTermsDeal.id ? { ...d, terms_conditions: updatedTerms } : d));
    showToast("Saving terms & conditions...", "info");
    setShowTermsModal(false);

    try {
      // Silently update database
      await saveSnapDeal({
        id: selectedTermsDeal.id,
        dealing_with: selectedTermsDeal.dealing_with,
        handshake_date: selectedTermsDeal.handshake_date,
        notes: selectedTermsDeal.notes || "",
        deal_data: selectedTermsDeal.deal_data,
        status: selectedTermsDeal.status || "Draft",
        terms_conditions: updatedTerms,
        actor_email: profile?.email || "anonymous@hsg.com",
        actor_name: profile?.name || "System"
      });
      showToast("Terms & conditions updated successfully!", "success");
      loadDeals();
    } catch (err: any) {
      // Rollback on failure
      setDeals(prev => prev.map(d => d.id === selectedTermsDeal.id ? { ...d, terms_conditions: originalTerms } : d));
      showToast(err.message || "Failed to save terms & conditions", "error");
    }
  };

  const handleOpenViewModal = async (deal: SnapDeal) => {
    setSelectedViewDeal(deal);
    setShowViewModal(true);
    setLoadingViewLogs(true);
    try {
      const logs = await fetchSnapDealLogs(deal.id);
      setViewDealLogs(logs);
    } catch (e) {
      showToast("Failed to load audit logs", "error");
    } finally {
      setLoadingViewLogs(false);
    }
  };

  // Format DataTable rows
  const mapDealsToRows = (filteredDeals: SnapDeal[]) => {
    const isAdmin = profile?.role === "Administrator";
    return filteredDeals.map((deal) => {
      return {
        id_raw: deal.id,
        client_info: (
          <div className="flex flex-col gap-0.5 w-[100px] max-w-[100px] shrink-0 select-text">
            <div className="font-bold text-zinc-855 truncate" title={deal.dealing_with}>
              {deal.dealing_with}
            </div>
            <div className="text-[10px] text-zinc-400 font-bold font-mono truncate select-all" title={deal.id}>
              {deal.id}
            </div>
          </div>
        ),
        client_info_raw: `${deal.dealing_with} ${deal.id}`,
        notes: (
          <div className="line-clamp-3 w-[160px] max-w-[160px] shrink-0 font-medium text-zinc-500 whitespace-pre-wrap break-words" title={deal.notes || ""}>
            {deal.notes || "—"}
          </div>
        ),
        items: (
          <div className="flex flex-wrap gap-1 w-full min-w-0">
            {(() => {
              let list: any[] = [];
              try {
                list = JSON.parse(deal.deal_data);
              } catch (e) {}
              if (list.length === 0) return <span className="text-zinc-400 italic text-[10px]">No items</span>;
              return list.map((item: any, idx: number) => (
                <span key={idx} className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-[10px] font-bold text-zinc-700 truncate max-w-[130px]" title={`${item.brand} - ${item.product}`}>
                  {item.brand} - {item.product}
                </span>
              ));
            })()}
          </div>
        ),
        terms_link: (
          <div className="w-[60px] shrink-0 font-bold select-none text-left">
            {deal.terms_conditions && deal.terms_conditions.trim() ? (
              <button
                onClick={() => handleOpenTermsModal(deal)}
                className="text-xs text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer select-none font-bold"
              >
                View T&C
              </button>
            ) : (
              <button
                onClick={() => handleOpenTermsModal(deal)}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline cursor-pointer select-none font-bold"
              >
                Add T&C
              </button>
            )}
          </div>
        ),
        actions: (
          <div className="flex items-center gap-1 w-[130px] shrink-0 select-none">
            <button
              onClick={() => handleOpenViewModal(deal)}
              className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer flex items-center justify-center"
              title="View Deal"
            >
              <Eye size={12} />
            </button>

            <button
              onClick={() => generateBlobPDF(deal, "proposal")}
              className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer flex items-center justify-center"
              title="Print Proposal"
            >
              <Printer size={12} className="text-zinc-600" />
            </button>
            <button
              onClick={() => generateBlobPDF(deal, "contract")}
              className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-750 hover:text-zinc-950 transition-colors cursor-pointer flex items-center justify-center"
              title="Print Contract"
            >
              <Printer size={12} className="text-emerald-700" />
            </button>

            {deal.status === "Draft" && (
              <>
                <button
                  onClick={() => handleLoadDealForEdit(deal)}
                  className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer flex items-center justify-center"
                  title="Edit Deal"
                >
                  <Edit size={12} />
                </button>

                <label className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer relative flex items-center justify-center" title="Upload Signed Contract">
                  <Lock size={12} className="text-zinc-600" />
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleUploadProof(deal.id, e.target.files[0]);
                      }
                    }}
                  />
                </label>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteDeal(deal.id)}
                    className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-855 transition-colors cursor-pointer flex items-center justify-center"
                    title="Delete Proposal"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </>
            )}

            {deal.status === "Active" && (
              <>
                <button
                  onClick={() => handleRevokeDeal(deal.id)}
                  className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-855 transition-colors cursor-pointer flex items-center justify-center"
                  title="Revoke Signed Deal"
                >
                  <Undo size={12} />
                </button>

                <button
                  onClick={() => handleArchiveDeal(deal.id)}
                  className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer flex items-center justify-center"
                  title="Archive Deal"
                >
                  <Archive size={12} />
                </button>
              </>
            )}

            {deal.status === "Archived" && (
              <>
                <button
                  onClick={() => handleRestoreDeal(deal.id)}
                  className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-700 hover:text-emerald-900 transition-colors cursor-pointer flex items-center justify-center"
                  title="Restore to Active Deals"
                >
                  <Undo size={12} />
                </button>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteDeal(deal.id)}
                    className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-855 transition-colors cursor-pointer flex items-center justify-center"
                    title="Delete Archived Deal"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </>
            )}
          </div>
        )
      };
    });
  };

  const columns: Column[] = [
    { id: "actions", header: "", accessor: "actions" },
    { id: "client_info", header: "Client", accessor: "client_info" },
    { id: "notes", header: "Note", accessor: "notes" },
    { id: "items", header: "Deal Items", accessor: "items" },
    { id: "terms_link", header: "Term & Condition", accessor: "terms_link" }
  ];

  return (
    <div className="flex flex-col gap-4 font-primary text-zinc-900 h-full overflow-hidden relative">
      

      {/* UNIVERSAL NAVIGATION TABS */}
      <NavigationTabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(tabId) => setActiveTab(tabId)}
      />

      {/* TAB CONTENT BODY */}
      <div className="w-full flex-grow flex-shrink min-h-0 overflow-hidden">
        
        {/* TAB 1.5: CALCULATOR 2 TAB */}
        {activeTab === "calculator2" && (
          <div className="w-full h-full flex flex-wrap gap-4 p-2 overflow-y-auto select-none custom-scrollbar">
            
            {/* LEFT COLUMN: Pricing Inputs & Calculations */}
            <div className="flex-[58] min-w-[560px] bg-white border border-zinc-200 rounded p-5 flex flex-col justify-between overflow-hidden shadow-sm h-full">
              
              {/* Inner Snappable Content Container */}
              <div
                ref={calculator2BreakdownRef}
                className={cn(
                  "flex-grow flex flex-col justify-between overflow-hidden bg-white",
                  isSnapping ? "p-5" : ""
                )}
              >
                {/* Scrollable Content Container */}
                <div className={cn(
                  "flex-grow flex flex-col gap-4 pr-1",
                  isSnapping ? "overflow-hidden" : "overflow-y-auto"
                )}>
                {/* Top Inputs: Item, Description, Cost Price */}
                <div className="flex gap-3 bg-zinc-50 p-3 rounded border border-zinc-250/60 items-end w-full">
                  <div className="flex flex-col gap-1 flex-[3] min-w-0">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                      Item
                    </label>
                    <input
                      type="text"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder={isSnapping ? "" : "e.g. Brand A"}
                      className={cn(
                        "w-full px-2.5 py-1.5 text-xs font-semibold text-zinc-800 outline-none transition-all",
                        isSnapping
                          ? "bg-transparent border-transparent shadow-none pointer-events-none px-1.5"
                          : "bg-white border border-zinc-200 rounded focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 shadow-xs"
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-[7] min-w-0">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                      Description
                    </label>
                    <input
                      type="text"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder={isSnapping ? "" : "e.g. Description"}
                      className={cn(
                        "w-full px-2.5 py-1.5 text-xs font-semibold text-zinc-800 outline-none transition-all",
                        isSnapping
                          ? "bg-transparent border-transparent shadow-none pointer-events-none px-1.5"
                          : "bg-white border border-zinc-200 rounded focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 shadow-xs"
                      )}
                    />
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 w-24">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                      Cost Price
                    </label>
                    <div className={cn(
                      "relative flex items-center w-24 transition-all",
                      isSnapping ? "bg-transparent border-transparent" : ""
                    )}>
                      <span className={cn(
                        "absolute text-xs font-semibold select-none transition-all",
                        isSnapping ? "left-1 text-zinc-800 font-bold" : "left-2.5 text-zinc-400"
                      )}>$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cost}
                        onChange={(e) => handleCostChange(e.target.value)}
                        placeholder={isSnapping ? "" : "0.00"}
                        className={cn(
                          "w-full py-1.5 text-xs font-bold text-zinc-800 outline-none transition-all",
                          isSnapping
                            ? "bg-transparent border-transparent shadow-none pl-3.5 pr-0 pointer-events-none"
                            : "pl-5 pr-2 bg-white border border-zinc-200 rounded focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 shadow-xs placeholder:text-zinc-300"
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Subheader: CALCULATION */}
                <div className="flex flex-col items-center my-1.5">
                  <h3 className="text-sm font-black tracking-widest text-zinc-900 uppercase">CALCULATION</h3>
                  <div className="w-24 border-t border-2 border-[#0B57D0] mt-1 rounded-full" />
                </div>

                {/* Calculation Body: Split into Left Inputs and Right Outputs */}
                <div className="flex gap-6">
                  {/* Calculation Left Inputs */}
                  <div className="w-1/2 flex flex-col gap-2.5">
                    {/* Freight & Duty Inline */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5 whitespace-nowrap">
                          Freight
                        </span>
                        {isSnapping ? (
                          <div className="w-24 px-1.5 py-1 text-xs font-bold text-zinc-800 min-h-[24px] flex items-center justify-end">
                            {feeIf || "0.00"}%
                          </div>
                        ) : (
                          <div className="relative flex items-center w-24">
                            <input
                              type="number"
                              step="0.01"
                              value={feeIf}
                              onChange={(e) => handleIfChange(e.target.value)}
                              className="w-full pl-2 pr-5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all text-right"
                            />
                            <span className="absolute right-1.5 text-zinc-400 text-[10px] font-bold select-none">%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5 whitespace-nowrap">
                          Duty
                        </span>
                        {isSnapping ? (
                          <div className="w-24 px-1.5 py-1 text-xs font-bold text-zinc-800 min-h-[24px] flex items-center justify-end">
                            {feeDuty || "0.00"}%
                          </div>
                        ) : (
                          <div className="relative flex items-center w-24">
                            <input
                              type="number"
                              step="0.01"
                              value={feeDuty}
                              onChange={(e) => handleDutyChange(e.target.value)}
                              className="w-full pl-2 pr-5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all text-right"
                            />
                            <span className="absolute right-1.5 text-zinc-400 text-[10px] font-bold select-none">%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Overhead */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5 whitespace-nowrap">
                        Overhead (Logistic, Admin etc.)
                      </span>
                      {isSnapping ? (
                        <div className="w-24 px-1.5 py-1 text-xs font-bold text-zinc-800 min-h-[24px] flex items-center justify-end">
                          {feeOther || "0.00"}%
                        </div>
                      ) : (
                        <div className="relative flex items-center w-24">
                          <input
                            type="number"
                            step="0.01"
                            value={feeOther}
                            onChange={(e) => handleOtherChange(e.target.value)}
                            className="w-full pl-2 pr-5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all text-right"
                          />
                          <span className="absolute right-1.5 text-zinc-400 text-[10px] font-bold select-none">%</span>
                        </div>
                      )}
                    </div>

                    {/* Freight, Duty, Overhead helper text */}
                    <p className="text-[8.5px] text-zinc-400 leading-normal pl-0.5 -mt-1.5 font-medium border-b border-zinc-100/50 pb-2">
                      Enter the freight, duty, and overhead rates as percentages (%). Freight and duty calculate the landed cost, while overhead calculates our cost.
                    </p>

                    {/* Set Our Margin */}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5 whitespace-nowrap">
                        Set Our Margin
                      </span>
                      {isSnapping ? (
                        <div className="w-24 px-1.5 py-1 text-xs font-bold text-zinc-800 min-h-[24px] flex items-center justify-end">
                          {localMarginHsg || "0.00"}%
                        </div>
                      ) : (
                        <div className="relative flex items-center w-24">
                          <input
                            type="number"
                            step="0.01"
                            value={localMarginHsg}
                            onChange={(e) => handleHsgMarginChange(e.target.value)}
                            onBlur={handleHsgMarginBlur}
                            onKeyDown={handleKeyDown}
                            disabled={pricingMode === "rsp_cap" && parsedCustomRsp <= 0}
                            placeholder={pricingMode === "rsp_cap" && parsedCustomRsp <= 0 ? "Enter RSP" : "0.00"}
                            className="w-full pl-2 pr-5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all text-right disabled:opacity-50"
                          />
                          <span className="absolute right-1.5 text-zinc-400 text-[10px] font-bold select-none">%</span>
                        </div>
                      )}
                    </div>

                    {/* Set Our Margin helper text */}
                    <p className="text-[8.5px] text-zinc-400 leading-normal pl-0.5 -mt-1.5 font-medium border-b border-zinc-100/50 pb-2">
                      Enter our profit margin (%) used to calculate our selling price and profit.
                    </p>

                    {/* Set Buyer Margin */}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5 whitespace-nowrap">
                        Set Buyer Margin
                      </span>
                      {isSnapping ? (
                        <div className="w-24 px-1.5 py-1 text-xs font-bold text-zinc-800 min-h-[24px] flex items-center justify-end">
                          {localMarginBuyer || "0.00"}%
                        </div>
                      ) : (
                        <div className="relative flex items-center w-24">
                          <input
                            type="number"
                            step="0.01"
                            value={localMarginBuyer}
                            onChange={(e) => handleBuyerMarginChange(e.target.value)}
                            onBlur={handleBuyerMarginBlur}
                            onKeyDown={handleKeyDown}
                            disabled={pricingMode === "rsp_cap" && parsedCustomRsp <= 0}
                            placeholder={pricingMode === "rsp_cap" && parsedCustomRsp <= 0 ? "Enter RSP" : "0.00"}
                            className="w-full pl-2 pr-5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all text-right disabled:opacity-50"
                          />
                          <span className="absolute right-1.5 text-zinc-400 text-[10px] font-bold select-none">%</span>
                        </div>
                      )}
                    </div>

                    {/* Set Buyer Margin helper text */}
                    <p className="text-[8.5px] text-zinc-400 leading-normal pl-0.5 -mt-1.5 font-medium border-b border-zinc-100/50 pb-2">
                      Enter the buyer's target profit margin (%) if required. This field is optional.
                    </p>

                    {/* Set Market Cap */}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5 whitespace-nowrap">
                        Set Market Cap
                      </span>
                      {isSnapping ? (
                        <div className="w-24 px-1.5 py-1 text-xs font-bold text-zinc-800 min-h-[24px] flex items-center justify-end">
                          ${Number(customRsp || 0).toFixed(2)}
                        </div>
                      ) : (
                        <div className="relative flex items-center w-24">
                          <span className="absolute left-2.5 text-zinc-450 text-[10px] font-semibold select-none">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={customRsp}
                            onChange={(e) => handleRspChange(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-5 pr-2 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all text-right"
                          />
                        </div>
                      )}
                    </div>

                    {/* Set Market Cap helper text */}
                    <p className="text-[8.5px] text-zinc-400 leading-normal pl-0.5 -mt-1.5 font-medium border-b border-zinc-100/50 pb-2">
                      Enter the maximum retail price (price tag) for consumers. This field is optional and can be used when you have a target market price.
                    </p>

                    {/* Setting the Market Price Note (under Set Market Cap, inline width) */}
                    <div className="flex flex-col gap-1 pt-1">
                      <span className="text-[10px] font-black text-zinc-850 tracking-wide uppercase pl-0.5">
                        Setting the Market Price
                      </span>
                      <p className="text-[8.5px] text-zinc-400 leading-normal pl-0.5 font-medium">
                        When a Market Price is set, Our Margin (%) is automatically calculated to achieve the target Market Price. If a Buyer Margin (%) is entered, the margin is automatically redistributed between Our Margin and Buyer Margin while keeping the Market Price unchanged.
                      </p>
                    </div>
                  </div>

                  {/* Calculation Right Outputs (Ledger Receipt style) */}
                  <div className="w-1/2 flex flex-col justify-between border-l border-zinc-150 pl-6 text-xs text-zinc-655 font-semibold space-y-1.5 select-text">
                    <div className="flex flex-col gap-1.5">
                      
                      {/* Landed Cost */}
                      <div className="flex items-end justify-between gap-1 w-full">
                        <span className="bg-white pr-1 z-10 shrink-0">Landed Cost</span>
                        <div className="flex-grow border-b border-dotted border-zinc-300 min-w-[20px] mb-1" />
                        <span className="bg-white pl-1 z-10 font-bold text-zinc-900 shrink-0 font-mono">{formatCurrency(totalA)}</span>
                      </div>

                      {/* Our Cost */}
                      <div className="flex items-end justify-between gap-1 w-full">
                        <span className="bg-white pr-1 z-10 shrink-0">Our Cost</span>
                        <div className="flex-grow border-b border-dotted border-zinc-300 min-w-[20px] mb-1" />
                        <span className="bg-white pl-1 z-10 font-bold text-zinc-900 shrink-0 font-mono">{formatCurrency(totalB)}</span>
                      </div>

                      <div className="h-2" />

                      {/* Our Margin (Buyer Price) */}
                      <div className="flex items-end justify-between gap-1 w-full">
                        <span className="bg-white pr-1 z-10 shrink-0">Our Margin (Buyer Price)</span>
                        <div className="flex-grow border-b border-dotted border-zinc-300 min-w-[20px] mb-1" />
                        <span className="bg-white pl-1 z-10 font-bold text-zinc-900 shrink-0 font-mono">{calculations.ourMarginBuyerCost.toFixed(2)}%</span>
                      </div>

                      {/* Our Margin (Market Price) */}
                      <div className="flex items-end justify-between gap-1 w-full">
                        <span className="bg-white pr-1 z-10 shrink-0">Our Margin (Market Price)</span>
                        <div className="flex-grow border-b border-dotted border-zinc-300 min-w-[20px] mb-1" />
                        <span className="bg-white pl-1 z-10 font-bold text-zinc-900 shrink-0 font-mono">{calculations.ourMarginRsp.toFixed(2)}%</span>
                      </div>

                      <div className="h-2" />

                      {/* Our Gross Profit */}
                      <div className="flex items-end justify-between gap-1 w-full">
                        <span className="bg-white pr-1 z-10 shrink-0">Our Gross Profit</span>
                        <div className="flex-grow border-b border-dotted border-zinc-300 min-w-[20px] mb-1" />
                        <span className={`bg-white pl-1 z-10 font-black shrink-0 font-mono ${calculations.loss ? "text-red-600" : "text-emerald-655"}`}>
                          {formatCurrency(calculations.hsgProfit)}
                        </span>
                      </div>
                      <p className="text-[8px] text-zinc-400 font-medium pl-0.5 leading-normal -mt-0.5">
                        Calculated from the buyer price after deducting our cost to determine our gross profit.
                      </p>

                      {/* Our Net Profit */}
                      <div className="flex items-end justify-between gap-1 w-full pt-1">
                        <span className="bg-white pr-1 z-10 shrink-0 text-[#0B57D0]">Our Net Profit</span>
                        <div className="flex-grow border-b border-dotted border-zinc-300 min-w-[20px] mb-1" />
                        <span className={`bg-white pl-1 z-10 font-black shrink-0 font-mono text-base ${calculations.loss ? "text-red-600" : "text-[#0B57D0]"}`}>
                          {formatCurrency(calculations.netProfit)}
                        </span>
                      </div>
                      <p className="text-[8px] text-zinc-400 font-medium pl-0.5 leading-normal -mt-0.5">
                        Calculated from the buyer price after deducting our cost and GST to determine our net profit.
                      </p>

                      <div className="h-2" />

                      {/* Buyer Cost */}
                      <div className="flex items-end justify-between gap-1 w-full">
                        <span className="bg-white pr-1 z-10 shrink-0">Buyer Cost</span>
                        <div className="flex-grow border-b border-dotted border-zinc-300 min-w-[20px] mb-1" />
                        <span className="bg-white pl-1 z-10 font-bold text-zinc-900 shrink-0 font-mono">{formatCurrency(calculations.costToBuyer)}</span>
                      </div>

                      {/* Buyer Margin */}
                      <div className="flex items-end justify-between gap-1 w-full">
                        <span className="bg-white pr-1 z-10 shrink-0">Buyer Margin</span>
                        <div className="flex-grow border-b border-dotted border-zinc-300 min-w-[20px] mb-1" />
                        <span className="bg-white pl-1 z-10 font-bold text-zinc-900 shrink-0 font-mono">{(parseFloat(marginBuyer) || 0).toFixed(2)}%</span>
                      </div>

                      {/* Buyer Buyer Profit */}
                      <div className="flex items-end justify-between gap-1 w-full">
                        <span className="bg-white pr-1 z-10 shrink-0">Buyer Profit</span>
                        <div className="flex-grow border-b border-dotted border-zinc-300 min-w-[20px] mb-1" />
                        <span className="bg-white pl-1 z-10 font-bold text-zinc-900 shrink-0 font-mono">{formatCurrency(calculations.buyerProfit)}</span>
                      </div>

                      <div className="h-2" />

                      {/* Market Price */}
                      <div className="flex items-end justify-between gap-1 w-full">
                        <span className="bg-white pr-1 z-10 shrink-0">Market Price</span>
                        <div className="flex-grow border-b border-dotted border-zinc-300 min-w-[20px] mb-1" />
                        <span className="bg-white pl-1 z-10 font-black text-zinc-900 shrink-0 font-mono">{formatCurrency(calculations.priceTag)}</span>
                      </div>
                    </div>

                    {/* Pricing Mode Badge / Info */}
                    {!isSnapping && (
                      <div className="mt-auto pt-4 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase bg-zinc-50 p-2 rounded border border-zinc-200">
                          <span className="w-2 h-2 rounded-full bg-[#0B57D0] animate-pulse" />
                          <span className="whitespace-nowrap">Pricing Mode: {pricingMode === "rsp_cap" ? "Market Cap" : "Margin Formula"}</span>
                        </div>
                        
                        {calculations.loss && calculations.priceTag > 0 && (
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded p-2 text-red-755">
                            <ShieldAlert size={12} className="shrink-0 text-red-655 animate-bounce" />
                            <span className="text-[9px] font-bold leading-normal">Warning: Our Margin results in a net loss.</span>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              </div>
              </div>

              {/* Action Buttons: Reset, Snap, Add (Sticky at bottom, matches right card) */}
              <div className="flex gap-2.5 mt-5 border-t border-zinc-150 pt-4 shrink-0">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-[20%] h-9 px-3 text-xs font-bold text-white bg-[#F5A623] hover:bg-[#E09612] rounded transition-all shadow-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer select-none"
                  title="Reset inputs"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={handleCapture2}
                  disabled={copying}
                  className="w-[30%] h-9 px-3 text-xs font-bold text-white bg-[#2EC4B6] hover:bg-[#20A396] rounded transition-all shadow-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 select-none"
                  title="Download Image Snapshot"
                >
                  <Camera size={13} className={copying ? "animate-pulse" : ""} />
                  <span>Snap Deal</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddItemToList}
                  className="w-[50%] h-9 px-4 text-xs font-bold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded transition-all shadow-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer select-none"
                >
                  <Plus size={14} />
                  <span>{editingItemId ? "Update Item in List" : "Add to Deal List >"}</span>
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN: Client Info, Items list table, Load/Save Deal */}
            <div className="flex-[42] min-w-[420px] bg-white border border-zinc-200 rounded p-5 flex flex-col justify-between overflow-hidden shadow-sm h-full">
              {/* Scrollable Content Container */}
              <div className="flex-grow flex flex-col gap-4 overflow-y-auto pr-1">
                {/* Section Header: Client Particulars */}
                <div className="flex items-center justify-between border-b border-zinc-150 pb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText size={15} className="text-zinc-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950">Deal Particulars</h3>
                  </div>
                  {editingDealId && (
                    <span className="flex items-center gap-1.5 text-[9px] font-black text-amber-700 bg-amber-50 pl-2 pr-1.5 py-0.5 rounded border border-amber-200 uppercase">
                      <span>Editing Deal: {editingDealId}</span>
                      <button
                        type="button"
                        onClick={() => {
                          handleReset();
                          setEditingDealId(null);
                          setDealingWith("");
                          setNotes("");
                          setItemList([]);
                          setLoadDealIdInput("");
                          showToast("Edit cancelled. Ready to create a new deal.", "info");
                        }}
                        className="p-0.5 hover:bg-amber-100 rounded text-amber-800 transition-colors cursor-pointer flex items-center justify-center"
                        title="Cancel edit"
                      >
                        <X size={10} className="stroke-[3]" />
                      </button>
                    </span>
                  )}
                </div>

                {/* Client Particulars Fields (Horizontal layout matching original image) */}
                <div className="flex flex-col gap-3.5 bg-zinc-50/50 p-3 rounded border border-zinc-250/60">
                  {/* Row 1: Client Name & Date (stacked labels) */}
                  <div className="flex gap-3 items-end w-full">
                    <div className="flex flex-col gap-1 flex-grow min-w-0">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                        Client Name
                      </span>
                      <input
                        type="text"
                        value={dealingWith}
                        onChange={(e) => setDealingWith(e.target.value)}
                        placeholder="e.g. Client Name"
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 w-[100px]">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                        Date
                      </span>
                      <input
                        type="date"
                        value={handshakeDate}
                        onChange={(e) => setHandshakeDate(e.target.value)}
                        className="w-full !px-1.5 py-1.5 bg-white border border-zinc-200 rounded text-[10.5px] font-semibold text-zinc-800 outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-xs cursor-pointer"
                      />
                    </div>
                  </div>
                  
                  {/* Row 2: Client Note (stacked labels, paragraph textarea, 3 lines height, full width) */}
                  <div className="flex flex-col gap-1 w-full max-w-none">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                      Client Note
                    </span>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Enter Client Note..."
                      rows={3}
                      className="w-full max-w-none px-2.5 py-1.5 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-xs resize-none"
                    />
                  </div>
                </div>

                {/* Section Header: Items list table */}
                <div className="flex items-center justify-between border-b border-zinc-150 pb-2 mt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <FileSpreadsheet size={15} className="text-zinc-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950">
                        Products List ({itemList.length})
                      </h3>
                    </div>

                    {/* Display Market Price Checkbox */}
                    <label className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 select-none cursor-pointer hover:text-zinc-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={showMarketPriceInPrint}
                        onChange={(e) => setShowMarketPriceInPrint(e.target.checked)}
                        className="rounded border-zinc-300 text-[#0B57D0] focus:ring-[#0B57D0] h-3 w-3 cursor-pointer"
                      />
                      <span>Display Market Price</span>
                    </label>
                  </div>
                </div>

                {/* Compact Items List Table */}
                <div className="border border-zinc-200 rounded overflow-hidden flex flex-col flex-grow flex-1 min-h-[220px] bg-zinc-50/20">
                  <div className="w-full overflow-auto custom-scrollbar flex-grow">
                    <table className={cn(
                      "w-full text-xs text-left border-collapse",
                      showMarketPriceInPrint ? "min-w-[660px]" : "min-w-[550px]"
                    )}>
                      <thead>
                        <tr className="bg-zinc-100/80 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 select-none whitespace-nowrap">
                          <th className="py-2 px-2 text-center w-14"></th>
                          <th className="py-2 px-3">Items</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3 text-right">$ Land Cost</th>
                          <th className="py-2 px-3 text-right">% Margin</th>
                          <th className="py-2 px-3 text-right">$ Net Profit</th>
                          {showMarketPriceInPrint && (
                            <th className="py-2 px-3 text-right">$ Market Price</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-medium text-zinc-700">
                        {itemList.length === 0 ? (
                          <tr>
                            <td colSpan={showMarketPriceInPrint ? 7 : 6} className="py-12 text-center text-zinc-400 font-bold select-none">
                              <FileSpreadsheet size={24} className="stroke-1 mx-auto mb-2 opacity-50" />
                              <span className="block text-[11px]">No items in deal yet.</span>
                              <span className="block text-[9.5px] font-medium leading-normal px-6 mt-1 text-zinc-400">
                                Configure values on the left and click "Add to Deal List &gt;"
                              </span>
                            </td>
                          </tr>
                        ) : (
                          itemList.map((item, idx) => (
                            <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="py-2 px-2 text-center w-14 align-top">
                                <div className="flex items-center justify-center gap-1 mt-0.5">
                                  <button
                                    onClick={() => handleEditListItem(item)}
                                    className="p-1 rounded bg-white hover:bg-slate-100 border border-zinc-200 text-zinc-655 hover:text-zinc-950 transition-colors cursor-pointer"
                                    title="Edit item values"
                                  >
                                    <Edit size={10} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteListItem(item.id)}
                                    className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-155 text-red-655 hover:text-red-800 transition-colors cursor-pointer"
                                    title="Remove item"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-3 truncate max-w-[80px] align-top" title={item.brand}>
                                {item.brand}
                              </td>
                              <td className="py-2 px-3 whitespace-pre-wrap max-w-[120px] align-top" title={item.product}>
                                {item.product}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold align-top">
                                {formatCurrency(item.cost + (item.cost * (item.feeIf / 100)) + (item.cost * (item.feeDuty / 100)))}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold align-top">
                                {item.marginHsg.toFixed(2)}%
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-black text-emerald-655 align-top">
                                {formatCurrency(item.computedNetProfit)}
                              </td>
                              {showMarketPriceInPrint && (
                                <td className="py-2 px-3 text-right font-mono font-semibold align-top">
                                  {formatCurrency(item.computedRsp || 0)}
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Load Deal & Save Deal */}
              <div className="flex gap-2.5 mt-5 border-t border-zinc-150 pt-4 shrink-0">
                <div ref={loadDropdownRef} className={cn(
                  "relative flex flex-col select-none",
                  editingDealId ? "w-[45%]" : "w-[55%]"
                )}>
                  {/* Select Trigger */}
                  <div className="relative w-full h-9">
                    <button
                      type="button"
                      onClick={() => setShowLoadDropdown(prev => !prev)}
                      className="w-full h-full pl-3 pr-8 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-700 hover:border-zinc-950 flex items-center justify-between transition-all shadow-xs cursor-pointer"
                    >
                      <span className="truncate pr-2">
                        {(() => {
                          const loaded = deals.find(d => d.id === loadDealIdInput);
                          return loaded ? `${loaded.dealing_with} (${loaded.id})` : "Load Deal (Search client)";
                        })()}
                      </span>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                        {loadDealIdInput && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReset();
                              setLoadDealIdInput("");
                            }}
                            className="p-0.5 hover:bg-slate-100 rounded text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                            title="Clear Loaded Deal & Reset Calculator"
                          >
                            <X size={10} />
                          </span>
                        )}
                        <span className="text-zinc-400 font-mono text-[9px] select-none pointer-events-none">
                          ▼
                        </span>
                      </span>
                    </button>
                  </div>

                  {/* Dropdown Options List */}
                  {showLoadDropdown && (
                    <div className="absolute left-0 bottom-full mb-1 w-full bg-white border border-slate-200 rounded shadow-lg z-30 flex flex-col max-h-56 overflow-hidden">
                      {/* Search box inside dropdown */}
                      <div className="p-2 border-b border-slate-100 bg-slate-50 shrink-0 flex items-center gap-1.5">
                        <Search size={11} className="text-zinc-400 shrink-0" />
                        <input
                          type="text"
                          value={loadSearchQuery}
                          onChange={(e) => setLoadSearchQuery(e.target.value)}
                          placeholder="Search by Client Name..."
                          className="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1 text-zinc-800 focus:outline-none focus:border-zinc-950 outline-none font-semibold"
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>

                      {/* Deals List */}
                      <div className="flex-grow overflow-y-auto custom-scrollbar divide-y divide-slate-100 font-medium text-xs text-zinc-700 bg-white">
                        {(() => {
                          const query = loadSearchQuery.toLowerCase().trim();
                          const filtered = deals.filter(d => 
                            d.dealing_with.toLowerCase().includes(query) || 
                          d.id.toLowerCase().includes(query)
                          );

                          if (filtered.length === 0) {
                            return <div className="p-3 text-center text-[10.5px] text-zinc-400 italic">No deals found</div>;
                          }

                          return filtered.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={async () => {
                                setShowLoadDropdown(false);
                                setLoadSearchQuery("");
                                if (d.status === "Active") {
                                  showConfirm({
                                    title: "Revoke Signed Contract",
                                    description: "This deal has a signed contract. Do you want to edit and revoke the signature?",
                                    confirmText: "Revoke & Edit",
                                    onConfirm: () => {
                                      // Optimistic UI Update: Revert deal status to Draft immediately in the UI
                                      setDeals(prev => prev.map(dealObj => dealObj.id === d.id ? { ...dealObj, status: "Draft", signed_proof_url: undefined } : dealObj));
                                      showToast("Deal unlocked and reverted to active proposal status!", "success");

                                      // Silently update database in background
                                      revokeSnapDeal(
                                        d.id,
                                        profile?.email || "anonymous@hsg.com",
                                        profile?.name || "Anonymous User"
                                      )
                                        .then(res => {
                                          if (res.success) {
                                            loadDeals();
                                          } else {
                                            console.error("Failed to revoke deal silently", res);
                                          }
                                        })
                                        .catch(err => {
                                          console.error("Silent revoke error", err);
                                        });

                                      // Load the deal into Calculator
                                      setLoadDealIdInput(d.id);
                                      handleLoadDealForEdit({ ...d, status: "Draft", signed_proof_url: undefined });
                                    }
                                  });
                                } else {
                                  setLoadDealIdInput(d.id);
                                  handleLoadDealForEdit(d);
                                }
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 cursor-pointer"
                            >
                              <span className="font-bold text-zinc-800 truncate">{d.dealing_with}</span>
                              <span className="text-[9.5px] text-zinc-400 font-mono flex items-center justify-between w-full">
                                <span>ID: {d.id}</span>
                                <span className={`px-1 rounded-full text-[8px] font-black uppercase ${
                                  d.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-amber-50 text-amber-700 border border-amber-150"
                                }`}>
                                  {d.status === "Active" ? "Accepted" : (d.status === "Draft" || !d.status ? "Proposal" : d.status)}
                                </span>
                              </span>
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {editingDealId && (
                  <button
                    type="button"
                    onClick={() => {
                      handleReset();
                      setEditingDealId(null);
                      setDealingWith("");
                      setNotes("");
                      setItemList([]);
                      setLoadDealIdInput("");
                      showToast("Edit cancelled. Ready to create a new deal.", "info");
                    }}
                    className="w-[20%] h-9 px-3 text-xs font-bold text-zinc-700 bg-slate-100 hover:bg-slate-200 border border-zinc-200 rounded transition-all shadow-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer select-none"
                    title="Cancel edit"
                  >
                    <X size={13} />
                    <span>Cancel</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveDealClick}
                  disabled={itemList.length === 0}
                  className={cn(
                    "h-9 px-4 text-xs font-bold text-white bg-[#0B57D0] hover:bg-[#0842A0] rounded transition-all shadow-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 select-none",
                    editingDealId ? "w-[35%]" : "w-[45%]"
                  )}
                  title="Save deal"
                >
                  <Save size={13} />
                  <span>{editingDealId ? "Update Deal" : "Save Deal"}</span>
                </button>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: DRAFT TAB */}
        {activeTab === "draft" && (
          <div className="w-full h-full p-2 overflow-hidden flex flex-col snap-deals-table">
            {loadingDeals ? (
              <div className="w-full h-48 flex items-center justify-center gap-2 text-zinc-500 font-semibold animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading proposals...</span>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={mapDealsToRows(deals.filter(d => d.status === "Draft" || !d.status))}
                height="h-full"
                title="Proposal Deals (Unsigned)"
                userRole="admin"
              />
            )}
          </div>
        )}

        {/* TAB 3: ACTIVE DEALS TAB */}
        {activeTab === "active" && (
          <div className="w-full h-full p-2 overflow-hidden flex flex-col snap-deals-table">
            {loadingDeals ? (
              <div className="w-full h-48 flex items-center justify-center gap-2 text-zinc-500 font-semibold animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading accepted deals...</span>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={mapDealsToRows(deals.filter(d => d.status === "Active"))}
                height="h-full"
                title="Accepted Deals (Signed)"
                userRole="admin"
              />
            )}
          </div>
        )}

        {/* TAB 4: ARCHIVE TAB */}
        {activeTab === "archive" && (
          <div className="w-full h-full p-2 overflow-hidden flex flex-col snap-deals-table">
            {loadingDeals ? (
              <div className="w-full h-48 flex items-center justify-center gap-2 text-zinc-500 font-semibold animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading archives...</span>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={mapDealsToRows(deals.filter(d => d.status === "Archived"))}
                height="h-full"
                title="Archived Deals"
                userRole="admin"
              />
            )}
          </div>
        )}

      </div>

      {/* SLIDE-IN PANEL: Right-side detailed audit log and preview panel */}
      {detailPanelOpen && selectedDeal && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-200"
            onClick={() => setDetailPanelOpen(false)}
          />
          <div className="fixed right-0 top-0 h-screen w-[420px] bg-white border-l border-slate-200 shadow-2xl z-50 p-6 flex flex-col justify-between animate-in slide-in-from-right duration-350 ease-out font-primary select-none">
            <div className="flex flex-col gap-5 overflow-y-auto flex-grow pr-1 custom-scrollbar">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Snap Deal Record</h3>
                  <p className="text-[10px] text-zinc-500 font-medium">Record ID: {selectedDeal.id}</p>
                </div>
                <button 
                  onClick={() => setDetailPanelOpen(false)}
                  className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-zinc-650 hover:text-zinc-950 transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
 
              {/* Deal Particulars Overview */}
              <div className="flex flex-col gap-2.5 bg-white border border-slate-200 rounded p-4 shadow-xs">
                <span className="block text-[8px] uppercase text-zinc-400 font-bold tracking-wider border-b border-zinc-100 pb-1">Deal Details</span>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Client Name</p>
                    <p className="font-semibold text-zinc-800 mt-0.5">{selectedDeal.dealing_with}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Handshake Date</p>
                    <p className="font-semibold text-zinc-800 mt-0.5">{formatDateString(selectedDeal.handshake_date)}</p>
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-2 text-xs">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Terms & Conditions</p>
                  <p className="text-zinc-700 mt-1 whitespace-pre-wrap leading-relaxed text-[11px]">{selectedDeal.terms_conditions || "No terms provided."}</p>
                </div>

                <div className="border-t border-zinc-100 pt-2 text-xs">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Notes</p>
                  <p className="text-zinc-700 mt-1 whitespace-pre-wrap leading-relaxed text-[11px]">{selectedDeal.notes || "No notes provided."}</p>
                </div>

                {selectedDeal.signed_proof_url && (
                  <div className="border-t border-zinc-100 pt-2 text-xs">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Signed Contract Proof</p>
                    <a
                      href={selectedDeal.signed_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-zinc-750 font-bold transition-all text-[10px] uppercase flex items-center justify-center gap-1.5 w-full text-center shadow-xs"
                    >
                      <Lock size={12} className="text-emerald-700" />
                      <span>View Signed Proof File</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Items list inside panel */}
              <div className="flex flex-col gap-2.5 bg-white border border-slate-200 rounded p-4 shadow-xs max-h-[220px]">
                <span className="block text-[8px] uppercase text-zinc-400 font-bold tracking-wider border-b border-zinc-100 pb-1">Products ({selectedDealItems.length})</span>
                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-0.5">
                  {selectedDealItems.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 border-b border-zinc-100 text-xs last:border-b-0">
                      <div className="flex flex-col truncate">
                        <span className="font-semibold text-zinc-800 truncate">{item.brand} - {item.product}</span>
                        <span className="text-[10px] text-zinc-500">Cost: {formatCurrency(item.cost)} | RSP: {formatCurrency(item.computedRsp)}</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-700 shrink-0 font-mono">{formatCurrency(item.computedNetProfit)}</span>
                    </div>
                  ))}
                </div>
              </div>
 
              {/* Section 3: Audit Trail Log */}
              <div className="flex flex-col gap-3 bg-white border border-slate-200 rounded p-4 shadow-xs flex-grow min-h-[160px]">
                <span className="block text-[8px] uppercase text-zinc-400 font-bold tracking-wider border-b border-zinc-100 pb-1">Audit Logs & History</span>
                
                {loadingLogs ? (
                  <div className="flex items-center justify-center p-6 text-zinc-500 text-xs font-semibold gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Loading timeline...</span>
                  </div>
                ) : selectedDealLogs.length === 0 ? (
                  <div className="text-center p-6 text-zinc-400 text-[10px] italic">No logs found for this deal.</div>
                ) : (
                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[180px] custom-scrollbar pr-0.5 relative pl-3.5 border-l border-zinc-200">
                    {selectedDealLogs.map((log) => (
                      <div key={log.id} className="relative text-xs">
                        {/* Dot indicator */}
                        <div className="absolute -left-[19.5px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-400 border-2 border-white shadow-xs" />
                        
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-800">{log.action}</span>
                          <span className="text-[9px] text-zinc-500 mt-0.5">By: {log.actor_name} ({log.actor_email})</span>
                          <span className="text-[8px] text-zinc-400 font-mono mt-0.5">{formatDateStringWithTime(log.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Panel Footer */}
            <div className="border-t border-slate-200 pt-4 mt-4 flex gap-2">
              <button
                onClick={() => {
                  setDetailPanelOpen(false);
                  generateBlobPDF(selectedDeal, "proposal");
                }}
                className="w-1/2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-zinc-700 rounded text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={12} />
                <span>Print Proposal</span>
              </button>
              <button
                onClick={() => {
                  setDetailPanelOpen(false);
                  generateBlobPDF(selectedDeal, "contract");
                }}
                className="w-1/2 py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={12} className="text-white" />
                <span>Print Contract</span>
              </button>
            </div>

          </div>
        </>
      )}

      {/* SAVE DIALOG MODAL */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center font-primary select-none">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded p-5 shadow-xl animate-modalSlideUp">
            <h4 className="text-sm font-bold text-zinc-950 uppercase tracking-wider mb-2">Confirm Save Snap Deal</h4>
            <p className="text-xs text-zinc-500 mb-4">
              Confirm transaction data for **{dealingWith || "Brand Client"}**. This deal contains **{itemList.length} product(s)**.
            </p>
 
            <div className="flex flex-col gap-3 mb-5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200/40">
                <span className="text-zinc-500 font-semibold">Client Name</span>
                <span className="font-bold text-zinc-850">{dealingWith}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/40">
                <span className="text-zinc-500 font-semibold">Handshake Date</span>
                <span className="font-bold text-zinc-850">{formatDateString(new Date(handshakeDate).getTime())}</span>
              </div>
            </div>
 
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-4 py-2 border border-slate-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-slate-100 rounded transition-all cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveDeal}
                disabled={savingDeal}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded shadow transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {savingDeal && <Loader2 size={12} className="animate-spin" />}
                <span>Save Deal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TERMS & CONDITIONS MODAL */}
      {showTermsModal && selectedTermsDeal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center font-primary select-none">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded p-5 shadow-xl animate-modalSlideUp">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <h4 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                Terms & Conditions - ID: {selectedTermsDeal.id}
              </h4>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-1 rounded hover:bg-slate-100 border border-slate-200 text-zinc-650 hover:text-zinc-950 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed font-medium">
              Configure custom terms and conditions for this deal. If left empty, default templates might apply.
            </p>

            <textarea
              value={termsModalValue}
              onChange={(e) => setTermsModalValue(e.target.value)}
              disabled={selectedTermsDeal.status !== "Draft" && selectedTermsDeal.status !== undefined}
              rows={8}
              placeholder="Enter deal terms & conditions here..."
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-xs resize-none disabled:opacity-60"
            />

            <div className="flex justify-end gap-2 text-xs font-bold mt-5">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-4 py-2 border border-slate-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-slate-100 rounded transition-all cursor-pointer shadow-xs"
              >
                {selectedTermsDeal.status !== "Draft" && selectedTermsDeal.status !== undefined ? "Close" : "Cancel"}
              </button>
              {(selectedTermsDeal.status === "Draft" || selectedTermsDeal.status === undefined) && (
                <button
                  onClick={handleSaveTerms}
                  className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded shadow transition-all cursor-pointer shadow-xs"
                >
                  Save T&C
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2-COLUMN VIEW MODAL */}
      {showViewModal && selectedViewDeal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center font-primary select-none p-6">
          <div className="w-full max-w-5xl bg-white border border-slate-200 rounded shadow-2xl animate-modalSlideUp flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-200 p-5 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Detailed Deal Profile</h3>
                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Deal Record ID: {selectedViewDeal.id}</p>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-1 rounded hover:bg-slate-100 border border-slate-200 text-zinc-650 hover:text-zinc-950 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-1 overflow-hidden p-5 gap-6">
              {/* Left Column (35%) */}
              <div className="w-[35%] flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {/* Client Details Card */}
                <div className="bg-zinc-50/50 p-4 rounded border border-zinc-200 flex flex-col gap-2.5">
                  <span className="block text-[8px] uppercase text-zinc-400 font-bold tracking-wider border-b border-zinc-100 pb-1">Client Details</span>
                  
                  <div className="font-bold text-sm text-zinc-950">{selectedViewDeal.dealing_with}</div>
                  <div className="text-[10px] font-bold text-zinc-450">{formatDateString(selectedViewDeal.handshake_date)}</div>
                  {selectedViewDeal.notes && (
                    <div className="text-xs font-semibold text-zinc-600 whitespace-pre-wrap leading-relaxed mt-1">
                      {selectedViewDeal.notes}
                    </div>
                  )}

                  {selectedViewDeal.signed_proof_url && (
                    <div className="mt-1">
                      <a
                        href={selectedViewDeal.signed_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-zinc-750 font-bold transition-all text-[10px] uppercase flex items-center justify-center gap-1.5 w-full text-center shadow-xs"
                      >
                        <Lock size={12} className="text-emerald-700" />
                        <span>Download Signed Contract</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Logs/Audit Trail Card */}
                <div className="bg-zinc-50/50 p-4 rounded border border-zinc-200 flex-grow min-h-[180px] flex flex-col gap-3">
                  <span className="block text-[8px] uppercase text-zinc-400 font-bold tracking-wider border-b border-zinc-100 pb-1">Audit Trail & Logs</span>
                  {loadingViewLogs ? (
                    <div className="flex items-center justify-center p-6 text-zinc-500 text-xs font-semibold gap-1.5 flex-grow">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Loading timeline...</span>
                    </div>
                  ) : viewDealLogs.length === 0 ? (
                    <div className="text-center p-6 text-zinc-400 text-[10px] italic flex-grow">No log timeline found.</div>
                  ) : (
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[220px] custom-scrollbar pl-3 relative border-l border-zinc-200">
                      {viewDealLogs.map((log) => (
                        <div key={log.id} className="relative text-xs">
                          <div className="absolute -left-[16.5px] top-1 w-2 h-2 rounded-full bg-zinc-400 border border-white shadow-xs" />
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-800">{log.action}</span>
                            <span className="text-[9px] text-zinc-550 mt-0.5">By: {log.actor_name}</span>
                            <span className="text-[8px] text-zinc-400 font-mono mt-0.5">{formatDateString(log.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column (65%) */}
              <div className="w-[65%] flex flex-col gap-3 overflow-hidden">
                <span className="block text-[9px] uppercase text-zinc-500 font-bold tracking-wider pb-1">Products List</span>
                <div className="border border-zinc-200 rounded overflow-hidden flex flex-col flex-1 bg-zinc-50/10">
                  <div className="w-full overflow-auto custom-scrollbar flex-grow">
                    <table className="w-full min-w-[650px] text-xs text-left border-collapse table-auto">
                      <thead>
                        <tr className="bg-zinc-100/90 text-[9.5px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 select-none">
                          <th className="py-2.5 px-3">Item</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3 text-right">$ Our Cost</th>
                          <th className="py-2.5 px-3 text-right">% Margin</th>
                          <th className="py-2.5 px-3 text-right">$ Net Profit</th>
                          <th className="py-2.5 px-3 text-right">$ Client Cost</th>
                          {showMarketPriceInPrint && <th className="py-2.5 px-3 text-right">$ Market Price</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-medium text-zinc-700">
                        {(() => {
                          let pList: any[] = [];
                          try {
                            pList = JSON.parse(selectedViewDeal.deal_data);
                          } catch (e) {}

                          if (pList.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-zinc-400 font-bold select-none">
                                  No products registered inside this deal profile.
                                </td>
                              </tr>
                            );
                          }

                          return pList.map((item: any, idx: number) => {
                            const landed = item.cost * (1 + (item.feeIf || 0)/100 + (item.feeDuty || 0)/100);
                            const ourCost = landed * (1 + (item.feeOther || 0)/100);
                            return (
                              <tr key={idx} className="hover:bg-zinc-50/60 transition-colors">
                                <td className="py-2 px-3 truncate max-w-[120px]" title={item.brand}>{item.brand}</td>
                                <td className="py-2 px-3 whitespace-pre-wrap max-w-[200px]" title={item.product}>{item.product}</td>
                                <td className="py-2 px-3 text-right font-mono font-semibold">{formatCurrency(ourCost)}</td>
                                <td className="py-2 px-3 text-right font-mono font-semibold">{(item.marginHsg || 0).toFixed(2)}%</td>
                                <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">{formatCurrency(item.computedNetProfit || 0)}</td>
                                <td className="py-2 px-3 text-right font-mono font-semibold">{formatCurrency(item.computedCostToBuyer || 0)}</td>
                                {showMarketPriceInPrint && (
                                  <td className="py-2 px-3 text-right font-mono font-semibold">{formatCurrency(item.computedRsp || 0)}</td>
                                )}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 p-4 bg-zinc-50 flex items-center justify-end shrink-0">
              {/* Buttons */}
              <div className="flex gap-2 text-xs font-bold">
                <button
                  onClick={() => generateBlobPDF(selectedViewDeal, "proposal")}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-zinc-700 hover:text-zinc-950 rounded transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Printer size={13} className="text-zinc-500" />
                  <span>Print Proposal</span>
                </button>
                <button
                  onClick={() => generateBlobPDF(selectedViewDeal, "contract")}
                  className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded shadow transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Printer size={13} className="text-white" />
                  <span>Print Contract</span>
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 border border-zinc-200 bg-white text-zinc-700 hover:text-zinc-900 rounded hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generic Confirmation Modal */}
      {confirmModalConfig && (
        <ConfirmDialog
          open={confirmModalOpen}
          onOpenChange={setConfirmModalOpen}
          title={confirmModalConfig.title}
          description={confirmModalConfig.description}
          confirmText={confirmModalConfig.confirmText}
          cancelText={confirmModalConfig.cancelText}
          variant={confirmModalConfig.variant || "dark"}
          onConfirm={confirmModalConfig.onConfirm}
        />
      )}
    </div>
  );
}
