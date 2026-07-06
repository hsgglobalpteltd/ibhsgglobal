"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { History, X, Clock, UserCheck, Plus, Check, Tag } from "lucide-react";
import { NavigationTabs } from "../navigation-tabs";
import { CustomButton } from "../custom-button";
import { TagInput } from "./MerchandiserModule";

interface RetailerSkusModuleProps {
  profile?: {
    role: string;
    name?: string;
    email?: string;
  } | null;
}

const defaultColumns: Column[] = [
  { id: "SKU Number", header: "SKU Number", accessor: "SKU Number" },
  { id: "SKU Name", header: "SKU Name", accessor: "SKU Name" },
  { id: "Link to Product SKU", header: "Products Linked", accessor: "Link to Product SKU" },
  { id: "Cost Price", header: "Cost Price", accessor: "Cost Price" },
  { id: "RSP", header: "RSP Tiers", accessor: "RSP" },
  { id: "Promotion", header: "Promotions", accessor: "Promotion" }
];

export function RetailerSkusModule({ profile }: RetailerSkusModuleProps) {
  const userRole = React.useMemo(() => {
    const role = profile?.role;
    if (role === "Administrator" || role === "Manager") return "admin";
    if (role === "Operator" || role === "Operation") return "operator";
    return "viewer";
  }, [profile]);

  const tabs = [
    { id: "active", label: "Active Product Listing", desc: "Currently active SKU catalog listings." },
    { id: "discontinued", label: "Discontinued", desc: "SKU listings that have been discontinued." }
  ];

  const [activeTab, setActiveTab] = React.useState<"active" | "discontinued">("active");
  const [retailers, setRetailers] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [skus, setSkus] = React.useState<any[]>([]);
  const [selectedRetailerId, setSelectedRetailerId] = React.useState<string>("");
  const [fetching, setFetching] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);

  // Edit/Add modal state
  const [editingRecord, setEditingRecord] = React.useState<any | null>(null);

  // Form helper states for price/promo updates
  const [newCostVal, setNewCostVal] = React.useState("");
  
  // RSP dynamic form tiers (1 by default, addable dynamically)
  const [rspFormTiers, setRspFormTiers] = React.useState<{ Tier: string; Price: string; "Range Date Start": string; "Range Date End": string; }[]>([
    { Tier: "Tier 1", Price: "", "Range Date Start": "", "Range Date End": "" }
  ]);

  // Promo dynamic form items (1 by default, addable dynamically)
  const [promoFormItems, setPromoFormItems] = React.useState<{ "Promo Name": string; Price: string; "Range Date Start": string; "Range Date End": string; }[]>([
    { "Promo Name": "", Price: "", "Range Date Start": "", "Range Date End": "" }
  ]);

  // Log View sidebar state
  const [viewingLogType, setViewingLogType] = React.useState<"cost" | "rsp" | "promo" | null>(null);
  const [activeLogRecord, setActiveLogRecord] = React.useState<any | null>(null);

  // Sheet fetching
  const fetchSheet = async (sheetName: string) => {
    const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${encodeURIComponent(sheetName)}`);
    if (!res.ok) throw new Error(`Failed to fetch ${sheetName}`);
    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.value || []);
    localStorage.setItem(`${sheetName}_data`, JSON.stringify(items));
    return items;
  };

  const fetchFreshData = async (sheetName: string, forceSync = false) => {
    try {
      if (forceSync) {
        await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${encodeURIComponent(sheetName)}`, { method: "POST" });
      }
      return await fetchSheet(sheetName);
    } catch (e) {
      console.warn("Background fetch failed for " + sheetName, e);
      return [];
    }
  };

  // Initial load
  React.useEffect(() => {
    const cachedRetailers = localStorage.getItem("retailers_DB_data");
    const cachedProducts = localStorage.getItem("products_DB_data");
    const cachedSkus = localStorage.getItem("Retailers_SKU_data");

    if (cachedRetailers) setRetailers(JSON.parse(cachedRetailers));
    if (cachedProducts) setProducts(JSON.parse(cachedProducts));
    if (cachedSkus) setSkus(JSON.parse(cachedSkus));

    setFetching(true);
    Promise.all([
      cachedRetailers ? Promise.resolve(JSON.parse(cachedRetailers)) : fetchSheet("retailers_DB"),
      cachedProducts ? Promise.resolve(JSON.parse(cachedProducts)) : fetchSheet("products_DB"),
      cachedSkus ? Promise.resolve(JSON.parse(cachedSkus)) : fetchSheet("Retailers_SKU")
    ]).then(([r, p, s]) => {
      setRetailers(r);
      setProducts(p);
      setSkus(s);
    }).catch((e) => {
      showToast("Error loading SKU database: " + e.message, "error");
    }).finally(() => {
      setFetching(false);
    });
  }, []);

  // Global Refresh Listener
  React.useEffect(() => {
    const handleRefresh = async () => {
      setFetching(true);
      try {
        await Promise.all([
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=retailers_DB`, { method: "POST" }),
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=products_DB`, { method: "POST" }),
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Retailers_SKU`, { method: "POST" })
        ]);
        const [r, p, s] = await Promise.all([
          fetchSheet("retailers_DB"),
          fetchSheet("products_DB"),
          fetchSheet("Retailers_SKU")
        ]);
        setRetailers(r);
        setProducts(p);
        setSkus(s);
        showToast("SKU database refreshed successfully!", "success");
      } catch (err: any) {
        showToast("Refresh failed: " + err.message, "error");
      } finally {
        setFetching(false);
      }
    };
    window.addEventListener("db-refresh", handleRefresh);
    return () => window.removeEventListener("db-refresh", handleRefresh);
  }, []);





  // Keydown Escape Listener to close log sidebar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && viewingLogType) {
        setViewingLogType(null);
        setActiveLogRecord(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingLogType]);

  // Log Parsing Helpers
  const getLatestCostPrice = (logStr: string) => {
    try {
      const logs = JSON.parse(logStr || "[]");
      if (Array.isArray(logs) && logs.length > 0) {
        const latest = logs[logs.length - 1];
        return latest?.Price !== undefined ? `$${Number(latest.Price).toFixed(2)}` : "-";
      }
    } catch (e) {}
    return "-";
  };

  const getLatestRsp = (logStr: string) => {
    try {
      const logs = JSON.parse(logStr || "[]");
      if (Array.isArray(logs) && logs.length > 0) {
        const latest = logs[logs.length - 1];
        if (Array.isArray(latest.Tiers) && latest.Tiers.length > 0) {
          return latest.Tiers.map((t: any) => `${t.Tier}: $${Number(t.Price).toFixed(2)}`).join(" | ");
        }
      }
    } catch (e) {}
    return "-";
  };

  const getLatestPromo = (logStr: string) => {
    try {
      const logs = JSON.parse(logStr || "[]");
      if (Array.isArray(logs) && logs.length > 0) {
        const latest = logs[logs.length - 1];
        if (Array.isArray(latest.Promos) && latest.Promos.length > 0) {
          return latest.Promos.map((p: any) => `${p["Promo Name"]}: $${Number(p.Price).toFixed(2)}`).join(" | ");
        }
      }
    } catch (e) {}
    return "-";
  };

  // Grid Action Handlers
  const handleEditModeChange = (edit: boolean) => {
    setIsEditMode(edit);
    if (edit) {
      fetchFreshData("Retailers_SKU", true).then((s) => {
        if (s) setSkus(s);
      });
    }
  };

  const handleEditRow = (row: any) => {
    setNewCostVal("");

    // Find original database record to avoid using mapped React elements
    const originalRecord = skus.find(s => String(s.ID) === String(row.ID)) || row;

    // Parse RSP Tiers from latest log entry
    try {
      const logs = JSON.parse(originalRecord["RSP Log"] || "[]");
      if (Array.isArray(logs) && logs.length > 0) {
        const latest = logs[logs.length - 1];
        if (Array.isArray(latest.Tiers) && latest.Tiers.length > 0) {
          setRspFormTiers(latest.Tiers.map((t: any) => ({
            Tier: String(t.Tier || ""),
            Price: String(t.Price || ""),
            "Range Date Start": String(t["Range Date Start"] || ""),
            "Range Date End": String(t["Range Date End"] || "")
          })));
        } else {
          setRspFormTiers([{ Tier: "Tier 1", Price: "", "Range Date Start": "", "Range Date End": "" }]);
        }
      } else {
        setRspFormTiers([{ Tier: "Tier 1", Price: "", "Range Date Start": "", "Range Date End": "" }]);
      }
    } catch (e) {
      setRspFormTiers([{ Tier: "Tier 1", Price: "", "Range Date Start": "", "Range Date End": "" }]);
    }

    // Parse Promos from latest log entry
    try {
      const logs = JSON.parse(originalRecord["Promotion Log"] || "[]");
      if (Array.isArray(logs) && logs.length > 0) {
        const latest = logs[logs.length - 1];
        if (Array.isArray(latest.Promos) && latest.Promos.length > 0) {
          setPromoFormItems(latest.Promos.map((p: any) => ({
            "Promo Name": String(p["Promo Name"] || ""),
            Price: String(p.Price || ""),
            "Range Date Start": String(p["Range Date Start"] || ""),
            "Range Date End": String(p["Range Date End"] || "")
          })));
        } else {
          setPromoFormItems([{ "Promo Name": "", Price: "", "Range Date Start": "", "Range Date End": "" }]);
        }
      } else {
        setPromoFormItems([{ "Promo Name": "", Price: "", "Range Date Start": "", "Range Date End": "" }]);
      }
    } catch (e) {
      setPromoFormItems([{ "Promo Name": "", Price: "", "Range Date Start": "", "Range Date End": "" }]);
    }

    // Split product SKU links
    const links = originalRecord["Link to Product SKU"] 
      ? String(originalRecord["Link to Product SKU"]).split(",").map(s => s.trim()).filter(Boolean) 
      : [];

    setEditingRecord({
      ...originalRecord,
      "Link to Product SKU": links,
      isNew: false
    });
  };

  const handleAddNew = () => {
    setNewCostVal("");
    setRspFormTiers([{ Tier: "Tier 1", Price: "", "Range Date Start": "", "Range Date End": "" }]);
    setPromoFormItems([{ "Promo Name": "", Price: "", "Range Date Start": "", "Range Date End": "" }]);

    setEditingRecord({
      ID: "",
      "Retailer ID": selectedRetailerId,
      "SKU Number": "",
      "SKU Name": "",
      "Link to Product SKU": [],
      "Cost Price Log": "[]",
      "RSP Log": "[]",
      "Promotion Log": "[]",
      Status: "TRUE",
      isNew: true
    });
  };

  const handleDeleteRecord = async (rowId: string) => {
    const targetItem = skus.find(s => String(s.ID) === String(rowId));
    if (!targetItem) return;

    const previousSkus = [...skus];
    const updatedList = skus.filter(s => String(s.ID) !== String(targetItem.ID));
    setSkus(updatedList);
    localStorage.setItem("Retailers_SKU_data", JSON.stringify(updatedList));

    showToast("Deleting SKU record...", "info");

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Retailers_SKU",
          action: "delete",
          data: { ID: targetItem.ID }
        })
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to delete record");

      fetchFreshData("Retailers_SKU", false);
      showToast("SKU record deleted successfully!", "success");
    } catch (err: any) {
      showToast("Delete failed: " + err.message + ". Reverting changes...", "error");
      setSkus(previousSkus);
      localStorage.setItem("Retailers_SKU_data", JSON.stringify(previousSkus));
    }
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRetailerId) {
      showToast("Please select a retailer first!", "error");
      return;
    }

    const isNew = editingRecord.isNew;
    const skuNumberVal = Number(editingRecord["SKU Number"]);
    if (isNaN(skuNumberVal) || skuNumberVal <= 0) {
      showToast("SKU Number must be a valid positive number!", "error");
      return;
    }

    if (!editingRecord["SKU Name"]?.trim()) {
      showToast("SKU Name cannot be empty!", "error");
      return;
    }

    if (isNew) {
      const exists = skus.some(s => String(s["Retailer ID"]) === String(selectedRetailerId) && Number(s["SKU Number"]) === skuNumberVal);
      if (exists) {
        showToast("SKU Number already exists for this Retailer!", "error");
        return;
      }
    }

    // Append logs if new pricing updates are provided
    let costLog = editingRecord["Cost Price Log"] || "[]";
    if (newCostVal.trim()) {
      try {
        const costArr = JSON.parse(costLog);
        const logNow = new Date();
        const logDateStr = logNow.toLocaleDateString("en-GB") + " " + logNow.toLocaleTimeString([], { hour12: false });
        costArr.push({
          Price: Number(newCostVal),
          Timestamp: logDateStr,
          "Update by": profile?.name || profile?.email || "System User"
        });
        costLog = JSON.stringify(costArr);
      } catch (e) {}
    }

    // Filter and clean RSP tiers
    let rspLog = editingRecord["RSP Log"] || "[]";
    const newTiers = rspFormTiers
      .filter(t => t.Price.trim() !== "")
      .map(t => ({
        Tier: t.Tier.trim() || "Tier",
        Price: Number(t.Price),
        "Range Date Start": t["Range Date Start"],
        "Range Date End": t["Range Date End"]
      }));

    let latestTiers = [];
    try {
      const logs = JSON.parse(rspLog);
      if (Array.isArray(logs) && logs.length > 0) {
        latestTiers = logs[logs.length - 1].Tiers || [];
      }
    } catch (e) {}

    // Format and clean compare objects
    const formatCompare = (arr: any[]) => arr.map(x => ({
      Tier: String(x.Tier || "").trim(),
      Price: Number(x.Price),
      "Range Date Start": String(x["Range Date Start"] || "").trim(),
      "Range Date End": String(x["Range Date End"] || "").trim()
    }));

    const hasRspChanged = JSON.stringify(formatCompare(newTiers)) !== JSON.stringify(formatCompare(latestTiers));
    if (newTiers.length > 0 && hasRspChanged) {
      try {
        const rspArr = JSON.parse(rspLog);
        const logNow = new Date();
        const logDateStr = logNow.toLocaleDateString("en-GB") + " " + logNow.toLocaleTimeString([], { hour12: false });
        rspArr.push({
          "Update ID": `RSP-${Date.now()}`,
          Timestamp: logDateStr,
          "Update by": profile?.name || profile?.email || "System User",
          Tiers: newTiers
        });
        rspLog = JSON.stringify(rspArr);
      } catch (e) {}
    }

    // Filter and clean Promotion items
    let promoLog = editingRecord["Promotion Log"] || "[]";
    const newPromos = promoFormItems
      .filter(p => p["Promo Name"].trim() !== "" && p.Price.trim() !== "")
      .map(p => ({
        "Promo Name": p["Promo Name"].trim(),
        Price: Number(p.Price),
        "Range Date Start": p["Range Date Start"],
        "Range Date End": p["Range Date End"]
      }));

    let latestPromos = [];
    try {
      const logs = JSON.parse(promoLog);
      if (Array.isArray(logs) && logs.length > 0) {
        latestPromos = logs[logs.length - 1].Promos || [];
      }
    } catch (e) {}

    const formatPromoCompare = (arr: any[]) => arr.map(x => ({
      "Promo Name": String(x["Promo Name"] || "").trim(),
      Price: Number(x.Price),
      "Range Date Start": String(x["Range Date Start"] || "").trim(),
      "Range Date End": String(x["Range Date End"] || "").trim()
    }));

    const hasPromoChanged = JSON.stringify(formatPromoCompare(newPromos)) !== JSON.stringify(formatPromoCompare(latestPromos));
    if (newPromos.length > 0 && hasPromoChanged) {
      try {
        const promoArr = JSON.parse(promoLog);
        const logNow = new Date();
        const logDateStr = logNow.toLocaleDateString("en-GB") + " " + logNow.toLocaleTimeString([], { hour12: false });
        promoArr.push({
          "Update ID": `PRM-${Date.now()}`,
          Timestamp: logDateStr,
          "Update by": profile?.name || profile?.email || "System User",
          Promos: newPromos
        });
        promoLog = JSON.stringify(promoArr);
      } catch (e) {}
    }

    const isRecordActive = editingRecord.Status === true || editingRecord.Status === "TRUE" || editingRecord.Status === "true" || editingRecord.Status === 1 || String(editingRecord.Status) === "1";

    const finalRecord = {
      ID: `${selectedRetailerId}_${skuNumberVal}`,
      "Retailer ID": selectedRetailerId,
      "SKU Number": skuNumberVal,
      "SKU Name": editingRecord["SKU Name"].trim(),
      "Link to Product SKU": (editingRecord["Link to Product SKU"] || []).join(", "),
      "Cost Price Log": costLog,
      "RSP Log": rspLog,
      "Promotion Log": promoLog,
      Status: isRecordActive ? "TRUE" : "FALSE",
      Remove: "FALSE"
    };

    const previousSkus = [...skus];
    let updatedList;
    if (isNew) {
      updatedList = [...skus, finalRecord];
    } else {
      updatedList = skus.map(s => String(s.ID) === String(finalRecord.ID) ? finalRecord : s);
    }

    setSkus(updatedList);
    localStorage.setItem("Retailers_SKU_data", JSON.stringify(updatedList));
    setEditingRecord(null);

    showToast("Saving SKU profile...", "info");

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Retailers_SKU",
          action: isNew ? "insert" : "update",
          data: finalRecord
        })
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to save record");

      fetchFreshData("Retailers_SKU", false);
      showToast("SKU profile saved and synced successfully!", "success");
    } catch (err: any) {
      showToast("Sync failed: " + err.message + ". Reverting changes...", "error");
      setSkus(previousSkus);
      localStorage.setItem("Retailers_SKU_data", JSON.stringify(previousSkus));
    }
  };

  // Mapped Table Data Rendering
  const filteredData = React.useMemo(() => {
    if (!selectedRetailerId) return [];
    return skus.filter(s => {
      if (String(s["Retailer ID"]) !== String(selectedRetailerId)) return false;
      const isActive = s.Status === true || s.Status === "TRUE" || s.Status === "true" || s.Status === 1 || String(s.Status) === "1";
      return activeTab === "active" ? isActive : !isActive;
    });
  }, [skus, selectedRetailerId, activeTab]);

  const rows = React.useMemo(() => {
    return filteredData.map((item) => {
      // Map multiple core SKU links to badges
      const links = item["Link to Product SKU"]
        ? String(item["Link to Product SKU"]).split(",").map((s: any) => s.trim()).filter(Boolean)
        : [];

      const getProductName = (skuStr: string) => {
        const prod = products.find(p => String(p.SKU).trim() === String(skuStr).trim());
        return prod ? prod["Display Name"] || skuStr : skuStr;
      };

      const linkNodes = (
        <div className="flex flex-wrap gap-1">
          {links.length > 0 ? (
            links.map((lnk: string, idx: number) => (
              <span 
                key={idx} 
                title={getProductName(lnk)}
                className="bg-zinc-200 text-zinc-700 border border-zinc-300 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold cursor-help"
              >
                {lnk}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-zinc-400 italic">Unlinked</span>
          )}
        </div>
      );

      // Render pricing click-to-view logs buttons
      const costNode = (
        <button
          type="button"
          onClick={() => {
            setActiveLogRecord(item);
            setViewingLogType("cost");
          }}
          className="flex items-center gap-1.5 text-zinc-700 hover:text-zinc-950 font-bold hover:underline cursor-pointer text-left focus:outline-none transition-colors border-0 bg-transparent p-0"
          title="Click to view full cost logs"
        >
          <History size={11} className="text-zinc-400" />
          <span>{getLatestCostPrice(item["Cost Price Log"])}</span>
        </button>
      );

      const rspNode = (
        <button
          type="button"
          onClick={() => {
            setActiveLogRecord(item);
            setViewingLogType("rsp");
          }}
          className="flex items-center gap-1.5 text-zinc-700 hover:text-zinc-950 font-medium hover:underline cursor-pointer text-left focus:outline-none transition-colors border-0 bg-transparent p-0"
          title="Click to view full RSP logs"
        >
          <History size={11} className="text-zinc-400" />
          <span>{getLatestRsp(item["RSP Log"])}</span>
        </button>
      );

      const promoNode = (
        <button
          type="button"
          onClick={() => {
            setActiveLogRecord(item);
            setViewingLogType("promo");
          }}
          className="flex items-center gap-1.5 text-zinc-700 hover:text-zinc-950 font-medium hover:underline cursor-pointer text-left focus:outline-none transition-colors border-0 bg-transparent p-0"
          title="Click to view full promo logs"
        >
          <History size={11} className="text-zinc-400" />
          <span>{getLatestPromo(item["Promotion Log"])}</span>
        </button>
      );

      return {
        ...item,
        "SKU Name": (
          <span className="font-semibold text-zinc-900">{item["SKU Name"]}</span>
        ),
        "SKU Name_raw": item["SKU Name"],
        "Link to Product SKU": linkNodes,
        "Link to Product SKU_raw": links.join(" "),
        "Cost Price": costNode,
        "Cost Price_raw": getLatestCostPrice(item["Cost Price Log"]),
        RSP: rspNode,
        RSP_raw: getLatestRsp(item["RSP Log"]),
        Promotion: promoNode,
        Promotion_raw: getLatestPromo(item["Promotion Log"])
      };
    });
  }, [filteredData, products]);

  // Sidebar Log History Timelines Parsing
  const timelineLogItems = React.useMemo(() => {
    if (!activeLogRecord || !viewingLogType) return [];
    try {
      const fieldKey = viewingLogType === "cost" ? "Cost Price Log" : viewingLogType === "rsp" ? "RSP Log" : "Promotion Log";
      const arr = JSON.parse(activeLogRecord[fieldKey] || "[]");
      if (Array.isArray(arr)) {
        return [...arr].reverse(); // Show latest first in sidebar
      }
    } catch (e) {}
    return [];
  }, [activeLogRecord, viewingLogType]);

  return (
    <div className="flex flex-col gap-5 font-primary h-full relative">
      
      {/* Top Bar Filter Dropdown */}
      <div className="flex items-center gap-3.5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs w-fit font-primary">
        <label className="text-xs font-extrabold text-zinc-700 uppercase tracking-wider whitespace-nowrap">Select Retailer:</label>
        <select
          value={selectedRetailerId}
          onChange={(e) => {
            setSelectedRetailerId(e.target.value);
            setIsEditMode(false);
          }}
          className="bg-slate-50 border border-slate-200 hover:bg-slate-100/50 hover:border-slate-350 rounded-lg px-3 py-1.5 text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 cursor-pointer min-w-[200px] transition-all duration-150"
        >
          <option value="">-- Choose Retailer --</option>
          {retailers.map((r) => (
            <option key={r.ID} value={r.ID}>
              {r["Display Name"] || r.ID}
            </option>
          ))}
        </select>
      </div>

      {!selectedRetailerId ? (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl select-none p-6 text-center">
          <Tag className="w-8 h-8 text-zinc-400 mb-3 stroke-[1.5]" />
          <span className="font-primary text-xs font-semibold text-zinc-500 max-w-xs leading-relaxed">
            Please select a retailer from the dropdown above to view the SKU registry.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <NavigationTabs
            tabs={tabs}
            activeTabId={activeTab}
            onTabSelect={(id: any) => {
              setActiveTab(id);
              setIsEditMode(false);
            }}
            titleSuffix="Listings"
          />

          <DataTable
            columns={defaultColumns}
            data={rows}
            userRole={userRole}
            title="Retailer SKU Catalog Bridge"
            fetching={fetching}
            onEditModeChange={handleEditModeChange}
            onEditRow={handleEditRow}
            onAddNew={handleAddNew}
            onDeleteRow={handleDeleteRecord}
            addNewText="Add SKU Row"
            height="h-[calc(100vh-320px)]"
          />
        </div>
      )}

      {/* SIDEBAR: Log Timelines Sidebar View */}
      {viewingLogType && activeLogRecord && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes sidebarSlideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            @keyframes backdropFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            .animate-sidebarSlideIn {
              animation: sidebarSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .animate-backdropFadeIn {
              animation: backdropFadeIn 0.25s ease-out forwards;
            }
          `}} />

          {/* Backdrop */}
          <div
            onClick={() => { setViewingLogType(null); setActiveLogRecord(null); }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-backdropFadeIn"
          />

          {/* Sidebar */}
          <div
            className="relative w-full max-w-md h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col z-10 animate-sidebarSlideIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-6 flex-shrink-0">
              <div className="flex items-center gap-2">
                <History size={16} className="text-zinc-700" />
                <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-wider">
                  {viewingLogType === "cost" ? "Cost Price Log History" : viewingLogType === "rsp" ? "RSP Log History" : "Promotion Log History"}
                </h3>
              </div>
              <button
                onClick={() => { setViewingLogType(null); setActiveLogRecord(null); }}
                className="p-1 rounded hover:bg-slate-100 text-zinc-500 hover:text-zinc-800 focus:outline-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Context Info */}
            <div className="mx-6 my-4 flex flex-col gap-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-zinc-700 flex-shrink-0">
              <span className="font-bold text-zinc-800">
                SKU: {activeLogRecord["SKU Number"]} - {activeLogRecord["SKU Name"]}
              </span>
            </div>

            {/* Timeline scroll items */}
            <div className="flex-1 overflow-y-auto px-6 pr-4 pb-6 flex flex-col gap-5 relative pl-10">
              <div className="absolute left-[33px] top-2 bottom-6 w-0.5 bg-slate-200" />

              {timelineLogItems.length > 0 ? (
                timelineLogItems.map((log: any, idx: number) => {
                  return (
                    <div key={idx} className="relative flex gap-4 text-xs font-primary">
                      {/* Timeline dot */}
                      <div className="relative z-10 w-5 h-5 rounded-full flex items-center justify-center border bg-zinc-800 text-white border-zinc-950 font-black text-[8px] flex-shrink-0 shadow-2xs">
                        {idx + 1}
                      </div>

                      {/* Log details card */}
                      <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 w-full shadow-2xs hover:bg-slate-100/50 transition-colors">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="text-[9px] text-zinc-400 font-mono">
                            {log.Timestamp || "Unknown Date"}
                          </span>
                        </div>

                        {/* Rendering logs based on type */}
                        {viewingLogType === "cost" && (
                          <div className="font-extrabold text-zinc-800 text-sm">
                            Cost Price: ${Number(log.Price).toFixed(2)}
                          </div>
                        )}

                        {viewingLogType === "rsp" && Array.isArray(log.Tiers) && (
                          <div className="flex flex-col gap-1">
                            {log.Tiers.map((tier: any, tIdx: number) => (
                              <div key={tIdx} className="bg-zinc-200/50 p-1.5 rounded border border-zinc-300/35 flex flex-col gap-0.5 text-[10px]">
                                <div className="flex justify-between font-bold text-zinc-700">
                                  <span>{tier.Tier}</span>
                                  <span className="underline">${Number(tier.Price).toFixed(2)}</span>
                                </div>
                                <div className="text-[8px] text-zinc-400 font-mono">
                                  Dates: {tier["Range Date Start"] || "N/A"} to {tier["Range Date End"] || "N/A"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {viewingLogType === "promo" && Array.isArray(log.Promos) && (
                          <div className="flex flex-col gap-1">
                            {log.Promos.map((promo: any, pIdx: number) => (
                              <div key={pIdx} className="bg-zinc-200/50 p-1.5 rounded border border-zinc-300/35 flex flex-col gap-0.5 text-[10px]">
                                <div className="flex justify-between font-bold text-zinc-700">
                                  <span>{promo["Promo Name"]}</span>
                                  <span className="underline">${Number(promo.Price).toFixed(2)}</span>
                                </div>
                                <div className="text-[8px] text-zinc-400 font-mono">
                                  Dates: {promo["Range Date Start"] || "N/A"} to {promo["Range Date End"] || "N/A"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold border-t border-zinc-300/25 pt-1 mt-1">
                          <UserCheck size={10} className="text-zinc-400" />
                          <span>Updated by: <span className="text-zinc-700 underline">{log["Update by"] || "System User"}</span></span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-zinc-400 italic">
                  No log records found.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-slate-200 p-6 bg-slate-50/50 flex items-center justify-center flex-shrink-0">
              <CustomButton
                onClick={() => { setViewingLogType(null); setActiveLogRecord(null); }}
                className="bg-zinc-900 text-white hover:bg-black text-xs font-bold w-full flex justify-center py-2 rounded"
              >
                Close View
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* EDIT/ADD RECORD OVERLAY MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-tableFadeInOnly">
          <form
            onSubmit={handleSaveRecord}
            className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-lg w-full p-6 animate-modalSlideUp flex flex-col gap-4 overflow-y-auto max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-sm text-zinc-850 uppercase tracking-wider">
                {editingRecord.isNew ? "Add Retailer SKU" : "Edit Retailer SKU"}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1 rounded hover:bg-slate-100 text-zinc-500 hover:text-zinc-800 focus:outline-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* SKU Number */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">SKU Number (Integer ID)</label>
                <input
                  type="number"
                  value={editingRecord["SKU Number"]}
                  onChange={(e) => setEditingRecord({ ...editingRecord, "SKU Number": e.target.value })}
                  disabled={!editingRecord.isNew}
                  required
                  placeholder="e.g. 100201"
                  className={`w-full text-xs border rounded-lg px-3 py-2 font-semibold focus:outline-none ${
                    !editingRecord.isNew
                      ? "bg-slate-100 border-slate-200 text-zinc-500 cursor-not-allowed"
                      : "bg-slate-50/50 border-slate-200 text-zinc-900 focus:border-blue-500 focus:bg-white"
                  }`}
                />
              </div>

              {/* SKU Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">SKU Name</label>
                <input
                  type="text"
                  value={editingRecord["SKU Name"]}
                  onChange={(e) => setEditingRecord({ ...editingRecord, "SKU Name": e.target.value })}
                  required
                  placeholder="e.g. Bibik Crispy Fried Chicken (Regular)"
                  className="w-full text-xs bg-slate-50/50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-2 text-zinc-900 focus:outline-none font-semibold transition-all duration-150"
                />
              </div>

              {/* Link to Core SKUs TagInput */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Link to Product SKU(s)</label>
                <TagInput
                  tags={editingRecord["Link to Product SKU"]}
                  onChange={(newTags) => setEditingRecord({ ...editingRecord, "Link to Product SKU": newTags })}
                  suggestions={products.map(p => p.SKU)}
                  placeholder="Type product SKU and press Enter"
                  id="sku-links"
                />
              </div>

              {/* Status Switch */}
              <div className="flex items-center gap-3 border-t border-b border-zinc-300/40 py-2">
                <input
                  type="checkbox"
                  id="sku-status"
                  checked={
                    editingRecord.Status === true ||
                    editingRecord.Status === "TRUE" ||
                    editingRecord.Status === "true" ||
                    editingRecord.Status === 1 ||
                    String(editingRecord.Status) === "1"
                  }
                  onChange={(e) => setEditingRecord({ ...editingRecord, Status: e.target.checked })}
                  className="w-4 h-4 rounded text-zinc-800 border-zinc-300 focus:ring-zinc-400 cursor-pointer"
                />
                <label htmlFor="sku-status" className="text-xs font-bold text-zinc-700 cursor-pointer select-none">
                  Active in SKU Listing
                </label>
              </div>

              {/* NEW COST PRICE */}
              <div className="border-t border-slate-200 pt-3">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Cost Price Update</h4>
                <div className="flex flex-col gap-1 bg-slate-50/60 border border-slate-200/60 rounded-xl p-3">
                  <div className="text-[9px] text-zinc-500 font-bold mb-1">
                    Current: {getLatestCostPrice(editingRecord["Cost Price Log"])}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">New Cost Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCostVal}
                      onChange={(e) => setNewCostVal(e.target.value)}
                      placeholder="e.g. 10.50"
                      className="w-full text-xs bg-white border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-3 py-2 text-zinc-900 focus:outline-none font-semibold transition-all duration-150"
                    />
                  </div>
                </div>
              </div>

              {/* NEW RSP LOG */}
              <div className="border-t border-slate-200 pt-3">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">RSP Tiers Update</h4>
                <div className="flex flex-col gap-3 bg-slate-50/60 border border-slate-200/60 rounded-xl p-3 text-xs">
                  <div className="text-[9px] text-zinc-500 font-bold border-b border-slate-200/20 pb-1.5 mb-1">
                    Current: {getLatestRsp(editingRecord["RSP Log"])}
                  </div>
                  
                  {rspFormTiers.map((tier, idx) => (
                    <div key={idx} className="flex flex-col gap-2 border-b border-slate-200/20 pb-2 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-zinc-600 uppercase">Tier #{idx + 1}</span>
                        {rspFormTiers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setRspFormTiers(rspFormTiers.filter((_, i) => i !== idx))}
                            className="text-[9px] text-red-500 hover:text-red-700 font-bold focus:outline-none cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="flex flex-col gap-0.5 col-span-1 font-primary">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase">Tier Label</span>
                          <input 
                            type="text" 
                            placeholder="e.g. Tier 1" 
                            value={tier.Tier} 
                            onChange={(e) => {
                              const updated = [...rspFormTiers];
                              updated[idx].Tier = e.target.value;
                              setRspFormTiers(updated);
                            }} 
                            className="w-full bg-white border border-slate-200 text-xs px-2 py-1 rounded focus:outline-none font-semibold text-zinc-800" 
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 col-span-1 font-primary">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase">Price</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            placeholder="Price" 
                            value={tier.Price} 
                            onChange={(e) => {
                              const updated = [...rspFormTiers];
                              updated[idx].Price = e.target.value;
                              setRspFormTiers(updated);
                            }} 
                            className="w-full bg-white border border-slate-200 text-xs px-2 py-1 rounded focus:outline-none font-semibold text-zinc-800" 
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 col-span-1 font-primary">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase">Start Date</span>
                          <input 
                            type="date" 
                            value={tier["Range Date Start"]} 
                            onChange={(e) => {
                              const updated = [...rspFormTiers];
                              updated[idx]["Range Date Start"] = e.target.value;
                              setRspFormTiers(updated);
                            }} 
                            className="w-full bg-white border border-slate-200 text-xs px-1 py-0.5 rounded focus:outline-none text-zinc-750" 
                          />
                        </div>
                        <div className="flex flex-col gap-0.5 col-span-1 font-primary">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase">End Date</span>
                          <input 
                            type="date" 
                            value={tier["Range Date End"]} 
                            onChange={(e) => {
                              const updated = [...rspFormTiers];
                              updated[idx]["Range Date End"] = e.target.value;
                              setRspFormTiers(updated);
                            }} 
                            className="w-full bg-white border border-slate-200 text-xs px-1 py-0.5 rounded focus:outline-none text-zinc-750" 
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setRspFormTiers([...rspFormTiers, { Tier: `Tier ${rspFormTiers.length + 1}`, Price: "", "Range Date Start": "", "Range Date End": "" }])}
                    className="mt-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-zinc-700 border border-slate-200 font-extrabold text-[10px] rounded focus:outline-none cursor-pointer w-fit shadow-3xs"
                  >
                    + Add Tier Row
                  </button>
                </div>
              </div>

              {/* NEW PROMOTIONS LOG */}
              <div className="border-t border-slate-200 pt-3 font-primary">
                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Promotions Update</h4>
                <div className="flex flex-col gap-3 bg-slate-50/60 border border-slate-200/60 rounded-xl p-3 text-xs">
                  <div className="text-[9px] text-zinc-500 font-bold border-b border-slate-200/20 pb-1.5 mb-1">
                    Current: {getLatestPromo(editingRecord["Promotion Log"])}
                  </div>
                  
                  {promoFormItems.map((promo, idx) => (
                    <div key={idx} className="flex flex-col gap-2 border-b border-slate-200/20 pb-2 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold text-zinc-600 uppercase">Promo #{idx + 1}</span>
                        {promoFormItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setPromoFormItems(promoFormItems.filter((_, i) => i !== idx))}
                            className="text-[9px] text-red-500 hover:text-red-700 font-bold focus:outline-none cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        <div className="flex flex-col gap-0.5 col-span-1">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase">Promo Name</span>
                          <input 
                            type="text" 
                            placeholder="Promo Name" 
                            value={promo["Promo Name"]} 
                            onChange={(e) => {
                              const updated = [...promoFormItems];
                              updated[idx]["Promo Name"] = e.target.value;
                              setPromoFormItems(updated);
                            }} 
                            className="w-full bg-white border border-slate-200 text-[10px] px-1.5 py-1 rounded focus:outline-none font-semibold text-zinc-800" 
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase">Price</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            placeholder="Price" 
                            value={promo.Price} 
                            onChange={(e) => {
                              const updated = [...promoFormItems];
                              updated[idx].Price = e.target.value;
                              setPromoFormItems(updated);
                            }} 
                            className="w-full bg-white border border-slate-200 text-[10px] px-1.5 py-1 rounded focus:outline-none font-semibold text-zinc-800" 
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase">Start</span>
                          <input 
                            type="date" 
                            value={promo["Range Date Start"]} 
                            onChange={(e) => {
                              const updated = [...promoFormItems];
                              updated[idx]["Range Date Start"] = e.target.value;
                              setPromoFormItems(updated);
                            }} 
                            className="w-full bg-white border border-slate-200 text-[10px] px-1 py-0.5 rounded focus:outline-none text-zinc-700" 
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase">End</span>
                          <input 
                            type="date" 
                            value={promo["Range Date End"]} 
                            onChange={(e) => {
                              const updated = [...promoFormItems];
                              updated[idx]["Range Date End"] = e.target.value;
                              setPromoFormItems(updated);
                            }} 
                            className="w-full bg-white border border-slate-200 text-[10px] px-1 py-0.5 rounded focus:outline-none text-zinc-700" 
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPromoFormItems([...promoFormItems, { "Promo Name": "", Price: "", "Range Date Start": "", "Range Date End": "" }])}
                    className="mt-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-zinc-700 border border-slate-200 font-extrabold text-[10px] rounded focus:outline-none cursor-pointer w-fit shadow-3xs"
                  >
                    + Add Promo Row
                  </button>
                </div>
              </div>

            </div>

            {/* Form footer */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 mt-2 font-primary">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-zinc-900 hover:bg-black text-white rounded-lg transition-colors cursor-pointer"
              >
                Save Record
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
