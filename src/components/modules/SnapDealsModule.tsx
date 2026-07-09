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
  Archive
} from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";
import { CustomButton } from "../custom-button";
import { showToast } from "@/lib/toast";
import { toBlob } from "html-to-image";
import { DataTable, Column } from "../data-table";
import { 
  fetchSnapDeals, 
  saveSnapDeal, 
  uploadSignedProof, 
  revokeSnapDeal, 
  fetchSnapDealLogs, 
  archiveSnapDeal,
  restoreSnapDeal,
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
  const [activeTab, setActiveTab] = React.useState<string>("calculator");
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

  // New Deal Builder States
  const [editingDealId, setEditingDealId] = React.useState<string | null>(null);
  const [brandName, setBrandName] = React.useState<string>("");
  const [productName, setProductName] = React.useState<string>("");
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);
  const [itemList, setItemList] = React.useState<any[]>([]);

  // Deal Particulars states
  const [dealingWith, setDealingWith] = React.useState<string>("");
  const [handshakeDate, setHandshakeDate] = React.useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [notes, setNotes] = React.useState<string>("");
  const [termsConditions, setTermsConditions] = React.useState<string>(DEFAULT_TERMS);

  // Drawer & Overlay States
  const [dealDrawerOpen, setDealDrawerOpen] = React.useState<boolean>(false);
  const [detailPanelOpen, setDetailPanelOpen] = React.useState<boolean>(false);
  const [selectedDeal, setSelectedDeal] = React.useState<SnapDeal | null>(null);
  const [selectedDealLogs, setSelectedDealLogs] = React.useState<SnapDealLog[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState<boolean>(false);

  // Print states
  const [printDeal, setPrintDeal] = React.useState<SnapDeal | null>(null);
  const [printType, setPrintType] = React.useState<"internal" | "external" | null>(null);

  // Save deal particulars modal
  const [saveModalOpen, setSaveModalOpen] = React.useState<boolean>(false);
  const [savingDeal, setSavingDeal] = React.useState<boolean>(false);

  const tabs = React.useMemo(() => [
    { id: "calculator", label: "Calculator" },
    { id: "draft", label: "Draft" },
    { id: "active", label: "Active Deals" },
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
    if (pricingMode === "rsp_cap") {
      const activeRsp = parseFloat(val) || 0;
      if (activeRsp > 0) {
        const pool = ((activeRsp - totalB) / activeRsp) * 100;
        setMarginBuyer("0.00");
        setMarginHsg(Math.max(0, pool).toFixed(2));
      } else {
        setMarginBuyer("0.00");
        setMarginHsg("0.00");
      }
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
    setBrandName("");
    setProductName("");
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
    if (!breakdownRef.current) return;
    setCopying(true);

    const centerCol = centerColRef.current;
    const rightCol = rightColRef.current;
    if (centerCol) centerCol.style.overflow = "hidden";
    if (rightCol) rightCol.style.overflow = "hidden";

    try {
      const blob = await toBlob(breakdownRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        width: breakdownRef.current.offsetWidth,
        height: breakdownRef.current.offsetHeight,
        skipFonts: true,
      });

      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `snap-deal-${brandName || "calculator"}.png`;
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
      setCopying(false);
    }
  };

  // Add item from calculator to current list
  const handleAddItemToList = () => {
    if (!brandName.trim() || !productName.trim()) {
      showToast("Please enter Brand and Product Name", "error");
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
      brand: brandName.trim(),
      product: productName.trim(),
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
      showToast("Product updated in list!", "success");
    } else {
      setItemList((prev) => [...prev, newItem]);
      showToast("Product added to list!", "success");
    }

    handleReset();
  };

  const handleEditListItem = (item: any) => {
    setEditingItemId(item.id);
    setBrandName(item.brand);
    setProductName(item.product);
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
    setTermsConditions(DEFAULT_TERMS);
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
    setTermsConditions(DEFAULT_TERMS);
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
      setTermsConditions(deal.terms_conditions || DEFAULT_TERMS);
      
      // Open form
      handleReset();
      setActiveTab("calculator");
      setDealDrawerOpen(true);
      showToast("Loaded deal to Calculator!", "success");
    } catch (e) {
      showToast("Failed to parse deal items", "error");
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
    const confirm = window.confirm("Are you sure you want to revoke this deal? This will delete the signed proof and unlock the deal for edits.");
    if (!confirm) return;

    // Optimistic UI Update: Revert deal status to Draft immediately in the UI
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: "Draft", signed_proof_url: undefined } : d));
    showToast("Deal unlocked and reverted to active draft status!", "success");

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
  };

  const handleArchiveDeal = async (dealId: string) => {
    const confirm = window.confirm("Are you sure you want to archive this deal? It will be removed from Active Deals and stored in the Archive.");
    if (!confirm) return;

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
  };

  const handleRestoreDeal = async (dealId: string) => {
    // Optimistic UI Update: Change status back to Active immediately in the UI
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, status: "Active" } : d));
    showToast("Deal restored to Active Deals!", "success");

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

  // Local printer trigger
  const triggerPrint = (deal: SnapDeal, type: "internal" | "external") => {
    setPrintDeal(deal);
    setPrintType(type);
    setTimeout(() => {
      window.print();
      setPrintDeal(null);
      setPrintType(null);
    }, 500);
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

  // Format DataTable rows
  const mapDealsToRows = (filteredDeals: SnapDeal[]) => {
    return filteredDeals.map((deal) => {
      let itemsCount = 0;
      try {
        itemsCount = JSON.parse(deal.deal_data).length;
      } catch (e) {}

      return {
        id: deal.id,
        id_raw: deal.id,
        dealing_with: deal.dealing_with,
        handshake_date: formatDateString(deal.handshake_date),
        handshake_date_raw: deal.handshake_date,
        items_count: `${itemsCount} item(s)`,
        status_badge: (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            deal.status === "Archived"
              ? "bg-zinc-150 text-zinc-650 border border-zinc-300"
              : deal.status === "Active" 
              ? "bg-emerald-50 text-emerald-700 border border-emerald-250"
              : "bg-amber-50 text-amber-700 border border-amber-250"
          }`}>
            {deal.status === "Archived" ? "Archived" : deal.status === "Active" ? "Active (Signed)" : "Draft (Unsigned)"}
          </span>
        ),
        status_badge_raw: deal.status,
        actions: (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleOpenDetailPanel(deal)}
              className="p-1 rounded bg-zinc-150 hover:bg-zinc-250 border border-zinc-300 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
              title="View Details & Logs"
            >
              <Eye size={12} />
            </button>

            {deal.status === "Draft" && (
              <>
                <button
                  onClick={() => handleLoadDealForEdit(deal)}
                  className="p-1 rounded bg-zinc-150 hover:bg-zinc-250 border border-zinc-300 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
                  title="Edit Calculator"
                >
                  <Edit size={12} />
                </button>

                <label className="p-1 rounded bg-zinc-150 hover:bg-zinc-250 border border-zinc-300 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer relative flex items-center justify-center">
                  <Upload size={12} />
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
              </>
            )}

            {deal.status === "Active" && (
              <>
                <button
                  onClick={() => handleRevokeDeal(deal.id)}
                  className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                  title="Revoke / Re-edit (Revert to Draft)"
                >
                  <Undo size={12} />
                </button>

                <button
                  onClick={() => handleArchiveDeal(deal.id)}
                  className="p-1 rounded bg-zinc-150 hover:bg-zinc-250 border border-zinc-300 text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
                  title="Archive Deal"
                >
                  <Archive size={12} />
                </button>
              </>
            )}

            {deal.status === "Archived" && (
              <button
                onClick={() => handleRestoreDeal(deal.id)}
                className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-700 hover:text-emerald-900 transition-colors cursor-pointer"
                title="Restore to Active Deals"
              >
                <Undo size={12} />
              </button>
            )}

            {/* Print trigger options */}
            <button
              onClick={() => triggerPrint(deal, "internal")}
              className="p-1 rounded bg-zinc-150 hover:bg-zinc-250 border border-zinc-300 text-zinc-750 hover:text-zinc-950 transition-colors cursor-pointer"
              title="Print Internal Breakdown"
            >
              <Printer size={12} className="text-zinc-650" />
            </button>
            <button
              onClick={() => triggerPrint(deal, "external")}
              className="p-1 rounded bg-zinc-150 hover:bg-zinc-250 border border-zinc-300 text-zinc-750 hover:text-zinc-950 transition-colors cursor-pointer"
              title="Print Contract"
            >
              <Printer size={12} className="text-emerald-700" />
            </button>
          </div>
        )
      };
    });
  };

  const columns: Column[] = [
    { id: "id", header: "Deal ID", accessor: "id" },
    { id: "dealing_with", header: "Dealing With", accessor: "dealing_with" },
    { id: "handshake_date", header: "Handshake Date", accessor: "handshake_date" },
    { id: "items_count", header: "Products", accessor: "items_count" },
    { id: "status_badge", header: "Status", accessor: "status_badge" },
    { id: "actions", header: "Actions", accessor: "actions" }
  ];

  return (
    <div className="flex flex-col gap-4 font-primary text-zinc-900 h-full overflow-hidden relative">
      
      {/* Dynamic Client Print Area */}
      {printDeal && (
        <>
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #print-target, #print-target * {
                visibility: visible !important;
              }
              #print-target {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 99999 !important;
                background: white !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                padding: 40px !important;
                margin: 0 !important;
                box-sizing: border-box !important;
              }
            }
          `}} />
          <div id="print-target" className="absolute inset-0 bg-white z-50 p-10 font-sans text-zinc-900 text-xs hidden print:flex print:flex-col print:justify-between print:min-h-screen">
            
            {/* Top content block */}
            <div className="flex-grow">
              {/* Title Center */}
              <h1 className="text-xl font-bold text-center tracking-wide uppercase text-zinc-950">HSG Global Deals</h1>
              
              {/* Subtext small center */}
              <p className="text-[10px] text-zinc-500 text-center uppercase tracking-wider mt-1">
                {printDeal.id} &nbsp;|&nbsp; {formatDateString(printDeal.handshake_date)}
              </p>
              
              {/* Separator line */}
              <div className="w-full border-t border-dashed border-zinc-300 my-4" />

                {/* Client Details */}
              <div className="mb-6 text-xs bg-white space-y-0.5">
                <h2 className="text-[8px] uppercase font-bold text-zinc-400 tracking-wider">Client Details</h2>
                <p className="text-sm font-bold text-zinc-950">{printDeal.dealing_with}</p>
                {printType === "internal" && printDeal.notes && printDeal.notes.trim() && (
                  <p className="text-xs text-zinc-550 whitespace-pre-wrap leading-relaxed mt-0.5">{printDeal.notes}</p>
                )}
              </div>

              {/* Body Table columns */}
              <table className="w-full text-xs text-left border-collapse border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-150 font-semibold border-b border-zinc-300 uppercase tracking-wider text-[9px] text-zinc-655">
                    <th className="p-3 border-r border-zinc-300 text-center">Deal Items</th>
                    {printType === "internal" && (
                      <>
                        <th className="p-3 border-r border-zinc-300 text-center">Our Margin</th>
                        <th className="p-3 border-r border-zinc-300 text-center">Our Profit</th>
                      </>
                    )}
                    <th className="p-3 border-r border-zinc-300 text-center">Deal Cost</th>
                    <th className="p-3 text-center">Price Tag</th>
                  </tr>
                </thead>
              <tbody>
                {(() => {
                  let items: any[] = [];
                  try {
                    items = JSON.parse(printDeal.deal_data);
                  } catch (e) {}

                  return (
                    <>
                      {items.map((item: any, idx: number) => {
                        return (
                          <tr key={idx} className="border-b border-zinc-200">
                            {/* Deal Items (Brand, Product, Cost - Cost only in Internal) */}
                            <td className="p-3 border-r border-zinc-200">
                              <div className="font-bold text-zinc-900">{item.brand}</div>
                              <div className="text-zinc-550 mt-0.5">{item.product}</div>
                              {printType === "internal" && (
                                <div className="text-[10px] text-zinc-400 mt-1 font-mono">Cost: {formatCurrency(item.cost)}</div>
                              )}
                            </td>

                            {/* Our Margin (Internal Only - RSP / Buyer Cost) */}
                            {printType === "internal" && (() => {
                              const itemHsgProfit = item.computedHsgProfit || 0;
                              const itemCostToBuyer = item.computedCostToBuyer || 0;
                              const itemRsp = item.computedRsp || 0;
                              const dynamicOurMarginRsp = itemRsp > 0 ? (itemHsgProfit / itemRsp) * 100 : 0;
                              const dynamicOurMarginBuyerCost = itemCostToBuyer > 0 ? (itemHsgProfit / itemCostToBuyer) * 100 : 0;
                              return (
                                <td className="p-3 border-r border-zinc-200 text-right font-mono space-y-0.5">
                                  <div>RSP: {dynamicOurMarginRsp.toFixed(2)}%</div>
                                  <div className="text-[10px] text-zinc-400">Buyer Cost: {dynamicOurMarginBuyerCost.toFixed(2)}%</div>
                                </td>
                              );
                            })()}

                            {/* Our Profit (Internal Only - Gross / Net) */}
                            {printType === "internal" && (
                              <td className="p-3 border-r border-zinc-200 text-right font-mono space-y-0.5">
                                <div>Gross: {formatCurrency(item.computedHsgProfit)}</div>
                                <div className="font-bold text-emerald-700">Net: {formatCurrency(item.computedNetProfit)}</div>
                              </td>
                            )}

                            {/* Buyer (Cost Price / Margin) */}
                            <td className="p-3 border-r border-zinc-200 text-right font-mono space-y-0.5">
                              <div>Cost: {formatCurrency(item.computedCostToBuyer)}</div>
                              <div className="text-[10px] text-zinc-500">Margin: {(item.marginBuyer || 0).toFixed(2)}%</div>
                            </td>

                            {/* Price Tag (RSP No GST / with GST) */}
                            <td className="p-3 text-right font-mono space-y-0.5">
                              <div className="font-bold text-zinc-950">{formatCurrency(item.computedRsp)}</div>
                              <div className="text-[10px] text-emerald-600 font-sans font-semibold">w/ GST: {formatCurrency(item.computedRsp * 1.09)}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  );
                })()}
                </tbody>
              </table>
            </div>

            {/* Bottom layout elements */}
            <div className="shrink-0 mt-8">
              
              {/* Signature Placeholders (Only for Print Buyer Deals) */}
              {printType === "external" && (
                <div className="grid grid-cols-2 gap-16 mb-8 text-[11px]">
                  <div className="border-t border-zinc-300 pt-4">
                    <p className="font-bold text-zinc-400 uppercase tracking-wider text-[8px]">Authorized Signature</p>
                    <p className="font-semibold text-zinc-800 mt-1">HSG Global Pte Ltd</p>
                    <div className="h-14"></div>
                    <div className="border-b border-zinc-300/40 w-44"></div>
                    <p className="text-[9px] text-zinc-400 mt-1">Date & Authorized Signature</p>
                  </div>
                  <div className="border-t border-zinc-300 pt-4">
                    <p className="font-bold text-zinc-400 uppercase tracking-wider text-[8px]">Accepted & Approved By</p>
                    <p className="font-semibold text-zinc-800 mt-1">{printDeal.dealing_with}</p>
                    <div className="h-14"></div>
                    <div className="border-b border-zinc-300/40 w-44"></div>
                    <p className="text-[9px] text-zinc-400 mt-1">Buyer Stamp, Date & Signature</p>
                  </div>
                </div>
              )}

              {/* Footer small text Terms and Conditions */}
              <div className="border-t border-zinc-200 pt-3">
                <h3 className="text-[8px] uppercase font-bold text-zinc-400 tracking-wider mb-1">Terms & Conditions</h3>
                <p className="text-[9px] text-zinc-500 whitespace-pre-wrap leading-normal font-medium">
                  {printDeal.terms_conditions || "Standard payment within 30 days."}
                </p>
              </div>
            </div>

          </div>
        </>
      )}

      {/* UNIVERSAL NAVIGATION TABS */}
      <NavigationTabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(tabId) => setActiveTab(tabId)}
      />

      {/* TAB CONTENT BODY */}
      <div className="w-full flex-grow flex-shrink min-h-0 overflow-hidden">
        
        {/* TAB 1: CALCULATOR TAB */}
        {activeTab === "calculator" && (
          <div className="w-full h-full flex items-center justify-start pl-8 p-2">
            <div className="relative flex items-center">
              
              {/* Calculator Main Card Container (Exact Current Look) */}
              <div 
                className="w-full max-w-5xl h-[500px] bg-white border border-zinc-200 flex overflow-hidden"
              >
                {/* LEFT COLUMN: Inputs (32% width) */}
                <div className="w-[32%] p-5 flex flex-col justify-between overflow-y-auto border-r border-zinc-200">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles size={14} className="text-zinc-600" />
                          <h2 className="text-sm font-bold tracking-tight text-zinc-950">Inputs</h2>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-medium">Pricing inputs & modes</p>
                      </div>
                      
                      <button
                        onClick={handleReset}
                        className="p-1 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-650 hover:text-zinc-900 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        title="Reset inputs"
                      >
                        <RotateCcw size={12} className="hover:rotate-[-45deg] transition-transform duration-200" />
                      </button>
                    </div>

                    {/* Toggle Switch */}
                    <div className="w-full bg-slate-100 border border-slate-200 p-1 rounded flex gap-1 shrink-0">
                      <button
                        onClick={() => handleModeSwitch("margin")}
                        className={`w-full py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                          pricingMode === "margin"
                            ? "bg-[#0B57D0] text-white shadow-xs"
                            : "text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-200/50"
                        }`}
                      >
                        Margin
                      </button>
                      <button
                        onClick={() => handleModeSwitch("rsp_cap")}
                        className={`w-full py-1 text-[11px] font-bold rounded transition-all cursor-pointer ${
                          pricingMode === "rsp_cap"
                            ? "bg-[#0B57D0] text-white shadow-xs"
                            : "text-zinc-500 hover:text-[#0B57D0] hover:bg-slate-200/50"
                        }`}
                      >
                        Price Tag Cap
                      </button>
                    </div>

                    {/* Input fields stack */}
                    <div className="flex flex-col gap-3">
                      
                      {/* Product Metadata Info (Brand / Product Name) */}
                      <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-2 rounded border border-zinc-200">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                            Brand
                          </label>
                          <input
                            type="text"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            placeholder="Brand A"
                            className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-950 transition-all"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                            Product
                          </label>
                          <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="Description"
                            className="w-full px-2 py-1 bg-white border border-zinc-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-950 transition-all"
                          />
                        </div>
                      </div>

                      {/* Cost Price */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                          Cost Price
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-zinc-400 text-xs font-semibold select-none">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={cost}
                            onChange={(e) => handleCostChange(e.target.value)}
                            className="w-full pl-6 pr-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all placeholder:text-zinc-300"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Freight / Duty / Other Cost in small grid */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5 truncate">
                            Freight
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              step="0.01"
                              value={feeIf}
                              onChange={(e) => handleIfChange(e.target.value)}
                              className="w-full pl-1.5 pr-4 py-1 bg-zinc-50 border border-zinc-200 rounded text-[11px] font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all"
                            />
                            <span className="absolute right-1.5 text-zinc-400 text-[9px] font-bold select-none">%</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5 truncate">
                            Duty
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              step="0.01"
                              value={feeDuty}
                              onChange={(e) => handleDutyChange(e.target.value)}
                              className="w-full pl-1.5 pr-4 py-1 bg-zinc-50 border border-zinc-200 rounded text-[11px] font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all"
                            />
                            <span className="absolute right-1.5 text-zinc-400 text-[9px] font-bold select-none">%</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5 truncate" title="Storage, Admin, Log">
                            Other Cost
                          </label>
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              step="0.01"
                              value={feeOther}
                              onChange={(e) => handleOtherChange(e.target.value)}
                              className="w-full pl-1.5 pr-4 py-1 bg-zinc-50 border border-zinc-200 rounded text-[11px] font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all"
                            />
                            <span className="absolute right-1.5 text-zinc-400 text-[9px] font-bold select-none">%</span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing Mode Fields */}
                      <div className="flex flex-col gap-3 border-t border-zinc-100 pt-3">
                        {/* Price Tag Input (only shown in RSP Cap Mode, placed first) */}
                        {pricingMode === "rsp_cap" && (
                          <div className="flex flex-col gap-1 animate-in fade-in duration-200">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                              Price Tag (Cap)
                            </label>
                            <div className="relative flex items-center">
                              <span className="absolute left-2.5 text-zinc-400 text-xs font-semibold select-none">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={customRsp}
                                onChange={(e) => handleRspChange(e.target.value)}
                                className="w-full pl-6 pr-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all placeholder:text-zinc-300"
                                placeholder="0.00"
                                autoFocus
                              />
                            </div>
                          </div>
                        )}

                        {/* Margins Row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                              Our Margin
                            </label>
                            <div className="relative flex items-center">
                              <input
                                ref={hsgInputRef}
                                type="number"
                                step="0.01"
                                value={localMarginHsg}
                                onChange={(e) => handleHsgMarginChange(e.target.value)}
                                onBlur={handleHsgMarginBlur}
                                onKeyDown={handleKeyDown}
                                disabled={pricingMode === "rsp_cap" && parsedCustomRsp <= 0}
                                placeholder={pricingMode === "rsp_cap" && parsedCustomRsp <= 0 ? "Enter price tag" : "0.00"}
                                className="w-full pl-2 pr-5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-100/50"
                              />
                              <span className="absolute right-2 text-zinc-400 text-[9px] font-bold select-none">%</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider pl-0.5">
                              Buyer Margin
                            </label>
                            <div className="relative flex items-center">
                              <input
                                ref={buyerInputRef}
                                type="number"
                                step="0.01"
                                value={localMarginBuyer}
                                onChange={(e) => handleBuyerMarginChange(e.target.value)}
                                onBlur={handleBuyerMarginBlur}
                                onKeyDown={handleKeyDown}
                                disabled={pricingMode === "rsp_cap" && parsedCustomRsp <= 0}
                                placeholder={pricingMode === "rsp_cap" && parsedCustomRsp <= 0 ? "Enter price tag" : "0.00"}
                                className="w-full pl-2 pr-5 py-1 bg-zinc-50 border border-zinc-200 rounded text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-zinc-100/50"
                              />
                              <span className="absolute right-2 text-zinc-400 text-[9px] font-bold select-none">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add calculation to current deal builder list */}
                  <CustomButton
                    onClick={handleAddItemToList}
                    variant="dark"
                    className="w-full mt-4 h-10 text-xs font-bold uppercase tracking-wider"
                  >
                    <Plus size={14} />
                    <span>{editingItemId ? "Update Item in List" : "Add Current to List"}</span>
                  </CustomButton>

                  {/* Warning message if profit is negative */}
                  {calculations.loss && calculations.priceTag > 0 && (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg p-2 text-red-750 mt-2 shrink-0 animate-in slide-in-from-bottom-1 duration-200">
                      <ShieldAlert size={12} className="shrink-0 text-red-600 animate-bounce" />
                      <span className="text-[9.5px] font-bold leading-normal">Warning: Margin is negative (loss).</span>
                    </div>
                  )}
                </div>

                {/* BREAKDOWN SECTION: Targeted for screenshot (Exact Current Look) */}
                <div 
                  ref={breakdownRef}
                  className="w-[68%] flex h-full overflow-hidden"
                >
                  {/* CENTER COLUMN: Cost & HSG Breakdown (50% of parent width) */}
                  <div 
                    ref={centerColRef}
                    className="w-1/2 bg-zinc-50/50 p-5 flex flex-col justify-between overflow-y-auto"
                  >
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-2 shrink-0">
                        Cost & HSG Breakdown
                      </h3>
                      
                      {/* Cost Breakdown */}
                      <div className="bg-white border border-zinc-200 rounded-lg p-2.5 text-[10px] font-semibold text-zinc-650 space-y-1 shadow-2xs">
                        <span className="block text-[8px] uppercase text-zinc-400 font-bold tracking-wider border-b border-zinc-100 pb-1">Cost Breakdown</span>
                        <div className="flex justify-between"><span>Base Cost</span><span className="font-medium text-zinc-700">{formatCurrency(parsedCost)}</span></div>
                        <div className="flex justify-between"><span>Freight ({feeIf}%)</span><span className="font-medium text-zinc-700">+{formatCurrency(ifCost)}</span></div>
                        <div className="flex justify-between"><span>Duty GST ({feeDuty}%)</span><span className="font-medium text-zinc-700">+{formatCurrency(dutyCost)}</span></div>
                        <div className="flex justify-between border-t border-zinc-100 pt-0.5 font-bold text-zinc-800"><span>Landcost</span><span>{formatCurrency(totalA)}</span></div>
                        <div className="flex justify-between"><span>Logistic ({feeOther}%)</span><span className="font-medium text-zinc-700">+{formatCurrency(otherCostVal)}</span></div>
                        <div className="flex justify-between border-t border-zinc-200 pt-0.5 font-black text-zinc-950 text-[11px] font-mono"><span>Total Cost</span><span>{formatCurrency(totalB)}</span></div>
                      </div>

                      {/* Our Margin Breakdown */}
                      <div className="bg-white border border-zinc-200 rounded-lg p-2.5 text-[10px] font-semibold text-zinc-650 space-y-1 shadow-2xs">
                        <span className="block text-[8px] uppercase text-zinc-400 font-bold tracking-wider border-b border-zinc-100 pb-1">Our Margin Breakdown</span>
                        <div className="flex justify-between"><span>Our Margin (RSP)</span><span className="font-medium text-zinc-700">{calculations.ourMarginRsp.toFixed(2)}%</span></div>
                        <div className="flex justify-between"><span>Our Margin (Buyer Cost)</span><span className="font-medium text-zinc-700">{calculations.ourMarginBuyerCost.toFixed(2)}%</span></div>
                        <div className="flex justify-between border-t border-zinc-100 pt-1"><span>Our Profit (Gross)</span><span className={calculations.loss ? "text-red-600 font-bold" : "text-emerald-650 font-bold"}>{formatCurrency(calculations.hsgProfit)}</span></div>
                      </div>
                    </div>

                    {/* Our Net Profit Container */}
                    <div className={`mt-auto w-full h-[96px] rounded border text-center flex flex-col items-center justify-center gap-0.5 shadow-sm p-3 shrink-0 ${
                      calculations.loss ? "bg-red-50 border-red-200" : "bg-[#E8F0FE] border-[#D2E3FC]"
                    }`}>
                      <span className="text-[8.5px] font-bold text-[#0B57D0] uppercase tracking-wider">OUR NET PROFIT</span>
                      <span className={`text-2xl font-black font-mono leading-none ${calculations.loss ? "text-red-600" : "text-[#0B57D0]"}`}>
                        {formatCurrency(calculations.netProfit)}
                      </span>
                      <div className="text-[8px] text-zinc-500 font-medium italic mt-1.5">
                        Gross ({formatCurrency(calculations.hsgProfit)}) - Net GST ({formatCurrency(calculations.netGST)})
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Buyer & Price Tag Breakdown (50% of parent width, border-l) */}
                  <div 
                    ref={rightColRef}
                    className="w-1/2 bg-zinc-100/30 p-5 flex flex-col justify-between overflow-y-auto border-l border-zinc-200"
                  >
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider border-b border-zinc-200 pb-2 shrink-0">
                        Buyer & Price Tag
                      </h3>

                      {/* Buyer Margin & Profit Breakdown */}
                      <div className="bg-white border border-zinc-200 rounded-lg p-2.5 text-[10px] font-semibold text-zinc-650 space-y-1 shadow-2xs">
                        <span className="block text-[8px] uppercase text-zinc-400 font-bold tracking-wider border-b border-zinc-100 pb-1">Buyer Margin & Profit</span>
                        <div className="flex justify-between"><span>Buyer Cost</span><span className="font-medium text-zinc-700">{formatCurrency(calculations.costToBuyer)}</span></div>
                        <div className="flex justify-between"><span>Buyer Margin</span><span className="font-medium text-zinc-700">{(parseFloat(marginBuyer) || 0).toFixed(2)}%</span></div>
                        <div className="flex justify-between border-t border-zinc-100 pt-1"><span>Buyer Profit</span><span className="font-medium text-zinc-700">{formatCurrency(calculations.buyerProfit)}</span></div>
                      </div>

                      {/* Price Tag Breakdown */}
                      <div className="bg-white border border-zinc-200 rounded-lg p-2.5 text-[10px] font-semibold text-zinc-650 space-y-1.5 shadow-2xs">
                        <span className="block text-[8px] uppercase text-zinc-400 font-bold tracking-wider border-b border-zinc-100 pb-1">Price Tag Breakdown</span>
                        <div className="flex justify-between"><span>Standard RSP (No GST)</span><span className="text-zinc-950 font-bold">{formatCurrency(calculations.priceTag)}</span></div>
                        <div className="flex justify-between border-t border-zinc-100 pt-1 text-emerald-600 font-bold">
                          <span className="flex items-center gap-0.5">RSP + 9% GST</span>
                          <span>{formatCurrency(calculations.priceTag * 1.09)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Big Display Pricing Result Card */}
                    <div className="mt-auto w-full h-[96px] bg-[#E8F0FE] border border-[#D2E3FC] text-zinc-800 rounded p-3 text-center flex flex-col items-center justify-center gap-0.5 shadow-xs shrink-0">
                      <span className="text-[8.5px] font-bold text-[#0B57D0] uppercase tracking-wider">
                        Price Tag (Standard RSP)
                      </span>
                      <span className={`text-2xl font-black font-mono leading-none tracking-tight ${calculations.loss ? "text-[#C5221F]" : "text-[#0B57D0]"}`}>
                        {formatCurrency(calculations.priceTag)}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase mt-1">
                        Standard RSP (No GST)
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* FLOATING MASTER ACTIONS COLUMN (Right side of Calculator) */}
              <div className="absolute top-1/2 -right-12 -translate-y-1/2 flex flex-col gap-2.5 z-20">
                {/* 1. Open Deal drawer panel */}
                <button
                  onClick={() => setDealDrawerOpen(true)}
                  className="w-9 h-9 aspect-square shrink-0 bg-white hover:bg-slate-50 text-zinc-700 rounded-full flex items-center justify-center shadow-md border border-slate-200 transition-all cursor-pointer"
                  title="Open Deal Builder Panel"
                >
                  <FileText size={15} />
                </button>

                {/* 2. Cancel Edit button (visible only in Edit Mode) */}
                {editingDealId && (
                  <button
                    onClick={handleCancelEdit}
                    className="w-9 h-9 aspect-square shrink-0 bg-[#FCE8E6] hover:bg-[#FAD2CF] text-[#C5221F] rounded-full flex items-center justify-center shadow-md border border-[#FAD2CF] transition-all cursor-pointer"
                    title="Cancel active edit"
                  >
                    <X size={15} />
                  </button>
                )}

                {/* 3. Snapshot Camera button */}
                <button
                  onClick={handleCapture}
                  disabled={copying}
                  className="w-9 h-9 aspect-square shrink-0 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-full flex items-center justify-center shadow-md border border-transparent transition-all cursor-pointer disabled:opacity-50"
                  title="Download Image Snapshot"
                >
                  <Camera size={15} className={copying ? "animate-pulse" : ""} />
                </button>
              </div>

            </div>

            {/* SIDE PANEL: Slide-in Deal & Items Builder Drawer */}
            {dealDrawerOpen && (
              <>
                <div 
                  className="fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-200"
                  onClick={() => setDealDrawerOpen(false)}
                />
                <div className="fixed right-0 top-0 h-screen w-96 bg-white border-l border-slate-200 shadow-2xl z-50 p-6 flex flex-col justify-between animate-in slide-in-from-right duration-350 ease-out font-primary select-none">
                  <div className="flex flex-col gap-5 overflow-y-auto flex-grow pr-1 custom-scrollbar">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                          {editingDealId ? "Modify Snap Deal" : "New Snap Deal Builder"}
                        </h3>
                        <p className="text-[10px] text-zinc-500 font-medium">Manage particulars & item list</p>
                      </div>
                      <button 
                        onClick={() => setDealDrawerOpen(false)}
                        className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-zinc-600 hover:text-zinc-950 transition-all cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Section 1: Deal Particulars */}
                    <div className="flex flex-col gap-3.5 bg-white border border-slate-200 rounded p-4 shadow-xs">
                      <span className="block text-[8px] uppercase text-zinc-400 font-bold tracking-wider border-b border-zinc-100 pb-1">Deal Particulars</span>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Dealing With (Client Name)</label>
                        <input
                          type="text"
                          value={dealingWith}
                          onChange={(e) => setDealingWith(e.target.value)}
                          placeholder="e.g. Client Name"
                          className="w-full px-2.5 py-1.5 bg-[#F0F4F9] border border-slate-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
                        />
                      </div>
 
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Handshake Date</label>
                        <input
                          type="date"
                          value={handshakeDate}
                          onChange={(e) => setHandshakeDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-[#F0F4F9] border border-slate-200 rounded text-xs font-semibold text-zinc-800 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all"
                        />
                      </div>
 
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Terms & Conditions</label>
                        <textarea
                          rows={3}
                          value={termsConditions}
                          onChange={(e) => setTermsConditions(e.target.value)}
                          placeholder="Quote payment rules..."
                          className="w-full px-2.5 py-1.5 bg-[#F0F4F9] border border-slate-200 rounded text-[11px] font-semibold text-zinc-800 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all resize-none"
                        />
                      </div>
 
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Notes</label>
                        <textarea
                          rows={2}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any extra deal metadata..."
                          className="w-full px-2.5 py-1.5 bg-[#F0F4F9] border border-slate-200 rounded text-[11px] font-semibold text-zinc-800 outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Section 2: Items List */}
                    <div className="flex flex-col gap-2.5 bg-white border border-slate-200 rounded p-4 shadow-xs flex-grow min-h-[160px]">
                      <span className="block text-[8px] uppercase text-zinc-400 font-bold tracking-wider border-b border-zinc-100 pb-1">Products List ({itemList.length})</span>
                      
                      {itemList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-400 border border-dashed border-zinc-200 rounded-md flex-grow">
                          <FileSpreadsheet size={20} className="stroke-1 mb-1.5" />
                          <span className="text-[10px] font-bold">No items added to deal yet.</span>
                          <span className="text-[9px] leading-normal px-2 mt-1">Configure pricing in calculator and click Add to List!</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px] custom-scrollbar pr-0.5">
                          {itemList.map((item) => (
                            <div key={item.id} className="flex justify-between items-center p-2 rounded bg-zinc-50 border border-zinc-200 text-xs">
                              <div className="flex flex-col truncate pr-2">
                                <span className="font-semibold text-zinc-800 truncate">{item.brand} - {item.product}</span>
                                <span className="text-[10px] text-zinc-500 mt-0.5">Cost: {formatCurrency(item.cost)} | RSP: {formatCurrency(item.computedRsp)}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleEditListItem(item)}
                                  className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-zinc-650 hover:text-zinc-950 cursor-pointer"
                                  title="Edit Item details"
                                >
                                  <Edit size={10} />
                                </button>
                                <button
                                  onClick={() => handleDeleteListItem(item.id)}
                                  className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-800 cursor-pointer"
                                  title="Delete Item"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
 
                  </div>
 
                  {/* Drawer Footer Actions */}
                  <div className="border-t border-slate-200 pt-4 mt-4 flex gap-2">
                    <button
                      onClick={handleSaveDealClick}
                      disabled={itemList.length === 0}
                      className="w-full py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded text-xs font-bold shadow flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Save size={13} />
                      <span>{editingDealId ? "Update Snap Deal" : "Save Snap Deal"}</span>
                    </button>
                  </div>

                </div>
              </>
            )}

            {/* SAVE DIALOG MODAL */}
            {saveModalOpen && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center font-primary select-none">
                <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-5 shadow-xl animate-modalSlideUp">
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

          </div>
        )}

        {/* TAB 2: DRAFT TAB */}
        {activeTab === "draft" && (
          <div className="w-full h-full p-2 overflow-hidden flex flex-col">
            {loadingDeals ? (
              <div className="w-full h-48 flex items-center justify-center gap-2 text-zinc-500 font-semibold animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading draft deals...</span>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={mapDealsToRows(deals.filter(d => d.status === "Draft" || !d.status))}
                height="h-[500px]"
                title="Draft Deals (Unsigned)"
                userRole="admin"
              />
            )}
          </div>
        )}

        {/* TAB 3: ACTIVE DEALS TAB */}
        {activeTab === "active" && (
          <div className="w-full h-full p-2 overflow-hidden flex flex-col">
            {loadingDeals ? (
              <div className="w-full h-48 flex items-center justify-center gap-2 text-zinc-500 font-semibold animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading active deals...</span>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={mapDealsToRows(deals.filter(d => d.status === "Active"))}
                height="h-[500px]"
                title="Active Confirmed Deals (Signed)"
                userRole="admin"
              />
            )}
          </div>
        )}

        {/* TAB 4: ARCHIVE TAB */}
        {activeTab === "archive" && (
          <div className="w-full h-full p-2 overflow-hidden flex flex-col">
            {loadingDeals ? (
              <div className="w-full h-48 flex items-center justify-center gap-2 text-zinc-500 font-semibold animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                <span>Loading archives...</span>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={mapDealsToRows(deals.filter(d => d.status === "Archived"))}
                height="h-[500px]"
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
                  triggerPrint(selectedDeal, "internal");
                }}
                className="w-1/2 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-zinc-700 rounded text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={12} />
                <span>Print Internal</span>
              </button>
              <button
                onClick={() => {
                  setDetailPanelOpen(false);
                  triggerPrint(selectedDeal, "external");
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

    </div>
  );
}
