"use client";

import * as React from "react";
import { 
  Upload, 
  RefreshCw, 
  Layers, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Check, 
  Building2, 
  Search, 
  Download,
  ChevronDown
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import * as XLSX from "xlsx";

const API_BASE = "https://ib-v2.hsgglobalpteltd.workers.dev";

// Reusable Custom Dropdown Component
interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  minWidth?: string;
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  minWidth = "min-w-[130px]"
}: CustomSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const selectedOpt = options.find((o) => o.value === value);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`h-8 px-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-zinc-700 flex items-center justify-between gap-1.5 focus:outline-none focus:border-[#0B57D0] cursor-pointer transition-colors shadow-2xs ${minWidth}`}
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <ChevronDown size={12} className={`text-zinc-400 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-full min-w-[160px] max-h-56 overflow-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-40 text-xs font-medium text-zinc-700 animate-in fade-in zoom-in-95 duration-100">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-zinc-400 text-[11px] text-center">No options</div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isSelected ? "bg-[#E8F0FE] text-[#0B57D0] font-semibold" : "hover:bg-slate-50 text-zinc-700"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check size={12} className="text-[#0B57D0] shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

interface BuyersChannelsModuleProps {
  profile?: any;
}

const formatDateDDMMYYYY = (timestamp?: number | string | null) => {
  if (!timestamp) return "-";
  const num = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
  if (!num || isNaN(num)) return "-";
  const d = new Date(num);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export function BuyersChannelsModule({ profile }: BuyersChannelsModuleProps) {
  // Data States
  const [loading, setLoading] = React.useState<boolean>(false);
  const [buyersList, setBuyersList] = React.useState<any[]>([]);
  const [channelsList, setChannelsList] = React.useState<any[]>([]);

  // Filter & Search States
  const [buyersSearch, setBuyersSearch] = React.useState<string>("");
  const [buyersChannelFilter, setBuyersChannelFilter] = React.useState<string>("all");

  // In-table Edit Mode
  const [isEditMode, setIsEditMode] = React.useState<boolean>(false);
  const [buyerDrafts, setBuyerDrafts] = React.useState<Record<string, { buyer_code: string; buyer_name: string; channel: string }>>({});
  const [savingBuyers, setSavingBuyers] = React.useState<boolean>(false);

  // Channels Management Modal
  const [showChannelModal, setShowChannelModal] = React.useState<boolean>(false);
  const [newChannelName, setNewChannelName] = React.useState<string>("");
  const [newChannelDesc, setNewChannelDesc] = React.useState<string>("");
  const [savingChannel, setSavingChannel] = React.useState<boolean>(false);

  // Add Buyer Modal
  const [showAddBuyerModal, setShowAddBuyerModal] = React.useState<boolean>(false);
  const [newBuyerCode, setNewBuyerCode] = React.useState<string>("");
  const [newBuyerName, setNewBuyerName] = React.useState<string>("");
  const [newBuyerChannel, setNewBuyerChannel] = React.useState<string>("Retailer");
  const [savingNewBuyer, setSavingNewBuyer] = React.useState<boolean>(false);

  // Excel Import Modal
  const [showBuyersImportModal, setShowBuyersImportModal] = React.useState<boolean>(false);
  const [importedBuyers, setImportedBuyers] = React.useState<any[]>([]);
  const [importingBuyers, setImportingBuyers] = React.useState<boolean>(false);

  // Confirm dialog
  const [confirmConfig, setConfirmConfig] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  // Fetch Buyers & Channels from standalone tables
  const fetchData = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [bRes, chRes] = await Promise.all([
        fetch(`${API_BASE}/api/buyers`),
        fetch(`${API_BASE}/api/sales-channels`)
      ]);
      if (bRes.ok) {
        const bData = await bRes.json();
        setBuyersList(Array.isArray(bData) ? bData : []);
      }
      if (chRes.ok) {
        const chData = await chRes.json();
        setChannelsList(Array.isArray(chData) ? chData : []);
      }
    } catch (err: any) {
      if (!silent) showToast("Failed to load buyers: " + err.message, "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Global Refresh event listener
  React.useEffect(() => {
    const handleDbRefresh = () => fetchData(false);
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [fetchData]);

  // Channel Management Actions
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      showToast("Please enter a channel name", "error");
      return;
    }
    setSavingChannel(true);
    try {
      const res = await fetch(`${API_BASE}/api/sales-channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_name: newChannelName.trim(),
          description: newChannelDesc.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Channel "${newChannelName}" added!`, "success");
        setNewChannelName("");
        setNewChannelDesc("");
        fetchData(true);
      } else {
        showToast(data.error || "Failed to add channel", "error");
      }
    } catch (e: any) {
      showToast("Channel create failed: " + e.message, "error");
    } finally {
      setSavingChannel(false);
    }
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/sales-channels/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Channel "${name}" removed`, "success");
        fetchData(true);
      } else {
        showToast(data.error || "Failed to delete channel", "error");
      }
    } catch (e: any) {
      showToast("Delete channel error: " + e.message, "error");
    }
  };

  // Add Buyer Action
  const handleAddBuyer = async () => {
    if (!newBuyerCode.trim() || !newBuyerName.trim()) return;
    setSavingNewBuyer(true);
    try {
      const res = await fetch(`${API_BASE}/api/buyers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_code: newBuyerCode.trim(),
          buyer_name: newBuyerName.trim(),
          channel: newBuyerChannel || "Retailer"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Buyer "${newBuyerName}" registered successfully!`, "success");
        setShowAddBuyerModal(false);
        setNewBuyerCode("");
        setNewBuyerName("");
        fetchData();
      } else {
        showToast(data.error || "Failed to register buyer", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Register error", "error");
    } finally {
      setSavingNewBuyer(false);
    }
  };

  // Delete Buyer Action
  const handleDeleteBuyer = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/buyers/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        showToast("Buyer removed", "success");
        fetchData(true);
      } else {
        showToast("Failed to delete buyer", "error");
      }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Save Bulk In-Table Edits
  const handleSaveBuyerDrafts = async () => {
    setSavingBuyers(true);
    try {
      const items = Object.entries(buyerDrafts).map(([id, val]) => ({
        id,
        buyer_code: val.buyer_code,
        buyer_name: val.buyer_name,
        channel: val.channel
      }));

      const res = await fetch(`${API_BASE}/api/buyers/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Saved all buyer modifications", "success");
        setIsEditMode(false);
        setBuyerDrafts({});
        fetchData();
      } else {
        showToast(data.error || "Failed to save buyer changes", "error");
      }
    } catch (e: any) {
      showToast("Failed to save buyers: " + e.message, "error");
    } finally {
      setSavingBuyers(false);
    }
  };

  // Download Excel Template
  const handleDownloadBuyersTemplate = () => {
    const templateRows = [
      { "Buyer Code": "3000/F011", "Buyer Name": "FairPrice Supermarket", "Channel": "Retailer" },
      { "Buyer Code": "3000/S001", "Buyer Name": "Sheng Siong Supermarket", "Channel": "Retailer" },
      { "Buyer Code": "TIKTOK_OFFICIAL", "Buyer Name": "HSG SG Official Shop", "Channel": "TikTok" },
      { "Buyer Code": "7ELEVEN_SG", "Buyer Name": "7-Eleven Convenience", "Channel": "Convenience Store" },
      { "Buyer Code": "MOSQUE_SULTAN", "Buyer Name": "Sultan Mosque", "Channel": "Mosque" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Buyers_Template");
    XLSX.writeFile(wb, "Buyers_Directory_Template.xlsx");
    showToast("Downloaded template spreadsheet", "success");
  };

  // Excel File Upload
  const handleBuyersExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const parsed = rawJson.map((row) => {
          const keys = Object.keys(row);
          const getVal = (possibleKeys: string[]) => {
            for (const k of keys) {
              const cleanK = k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
              for (const pk of possibleKeys) {
                if (cleanK.includes(pk)) return row[k];
              }
            }
            return "";
          };
          const buyer_code = String(getVal(["buyercode", "code", "custcode"]) || row["buyer_code"] || "").trim();
          const buyer_name = String(getVal(["buyername", "name", "customername"]) || row["buyer_name"] || buyer_code).trim();
          const channel = String(getVal(["channel", "saleschannel", "group"]) || row["channel"] || "Retailer").trim();
          return { buyer_code, buyer_name, channel };
        }).filter((b) => b.buyer_code.length > 0);

        if (parsed.length === 0) {
          showToast("No valid buyers found in Excel file", "error");
          return;
        }

        setImportedBuyers(parsed);
        setShowBuyersImportModal(true);
      } catch (err: any) {
        showToast("Failed to parse buyers Excel: " + err.message, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Submit Bulk Buyers Import
  const handleSubmitBuyersImport = async () => {
    if (importedBuyers.length === 0) return;
    setImportingBuyers(true);
    try {
      const res = await fetch(`${API_BASE}/api/buyers/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: importedBuyers })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Successfully imported ${data.count} buyers!`, "success");
        setShowBuyersImportModal(false);
        setImportedBuyers([]);
        fetchData();
      } else {
        showToast(data.error || "Failed to import buyers", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Import error", "error");
    } finally {
      setImportingBuyers(false);
    }
  };

  // Filtered Buyers list
  const filteredBuyers = React.useMemo(() => {
    return buyersList.filter((b) => {
      if (buyersChannelFilter !== "all" && b.channel !== buyersChannelFilter) return false;
      if (buyersSearch.trim()) {
        const q = buyersSearch.toLowerCase();
        const code = String(b.buyer_code || "").toLowerCase();
        const name = String(b.buyer_name || "").toLowerCase();
        const ch = String(b.channel || "").toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !ch.includes(q)) return false;
      }
      return true;
    });
  }, [buyersList, buyersChannelFilter, buyersSearch]);

  const channelFilterOptions = React.useMemo(() => {
    const list = [{ label: "All Channels", value: "all" }];
    channelsList.forEach((ch) => {
      const name = ch.channel_name || ch.name;
      if (name) list.push({ label: name, value: name });
    });
    return list;
  }, [channelsList]);

  const buyersChannelSelectOptions = React.useMemo(() => {
    return channelsList.map((ch) => ({
      label: ch.channel_name || ch.name,
      value: ch.channel_name || ch.name
    }));
  }, [channelsList]);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary select-none animate-in fade-in duration-150">
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white">
        <div>
          <h1 className="text-base font-semibold text-zinc-900">Buyers & Channels Directory</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage buyer customer codes, retailer masters, and sales channel classifications.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Manage Channels Button */}
          <button
            type="button"
            onClick={() => setShowChannelModal(true)}
            className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Layers size={13} className="text-zinc-500" />
            <span>Channels ({channelsList.length})</span>
          </button>

          {/* Download Template */}
          <button
            type="button"
            onClick={handleDownloadBuyersTemplate}
            className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Download size={13} className="text-zinc-500" />
            <span>Template</span>
          </button>

          {/* Upload Excel */}
          <label className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs">
            <Upload size={13} className="text-zinc-600" />
            <span>Import Excel</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleBuyersExcelChange} className="hidden" />
          </label>

          {/* In-Table Edit Mode */}
          {isEditMode ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsEditMode(false);
                  setBuyerDrafts({});
                }}
                className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-zinc-700 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingBuyers}
                onClick={handleSaveBuyerDrafts}
                className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {savingBuyers ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                <span>Save Edits</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                const initial: Record<string, any> = {};
                buyersList.forEach((b) => {
                  initial[b.id] = { buyer_code: b.buyer_code, buyer_name: b.buyer_name, channel: b.channel || "Retailer" };
                });
                setBuyerDrafts(initial);
                setIsEditMode(true);
              }}
              className="h-8 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Edit2 size={12} className="text-zinc-500" />
              <span>Edit Mode</span>
            </button>
          )}

          {/* Add Single Buyer */}
          <button
            type="button"
            onClick={() => {
              setNewBuyerCode("");
              setNewBuyerName("");
              setNewBuyerChannel(channelsList[0]?.channel_name || "Retailer");
              setShowAddBuyerModal(true);
            }}
            className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Plus size={13} />
            <span>Add Buyer</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER & SEARCH TOOLBAR */}
      <div className="px-4 py-2 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative max-w-[280px] flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search buyer code, name, channel..."
              value={buyersSearch}
              onChange={(e) => setBuyersSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-2.5 bg-white border border-slate-200 rounded-lg text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#0B57D0]"
            />
          </div>

          <CustomSelect
            value={buyersChannelFilter}
            onChange={setBuyersChannelFilter}
            options={channelFilterOptions}
            placeholder="All Channels"
            minWidth="min-w-[140px]"
          />
        </div>

        <div className="text-xs text-zinc-500 font-medium">
          Showing {filteredBuyers.length} of {buyersList.length} registered buyers
        </div>
      </div>

      {/* 3. BUYERS DATA TABLE */}
      <div className="flex-1 min-h-0 overflow-auto bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#0B57D0] animate-spin" />
            <span className="text-xs text-zinc-500 font-medium">Loading buyers...</span>
          </div>
        ) : filteredBuyers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-6">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-zinc-400">
              <Building2 size={24} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800">No Buyers Registered</h3>
            <p className="text-xs text-zinc-500 max-w-sm">
              Click Add Buyer or Import Excel to register your Sell-In and Market Price buyers.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
              <tr className="text-[11px] font-medium text-zinc-500">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3 w-36">Buyer Code</th>
                <th className="py-2.5 px-3 min-w-[220px]">Buyer Name</th>
                <th className="py-2.5 px-3 w-48">Assigned Sales Channel</th>
                <th className="py-2.5 px-3 w-32 text-center">Registered Date</th>
                <th className="py-2.5 px-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBuyers.map((b, idx) => {
                const draft = buyerDrafts[b.id] || { buyer_code: b.buyer_code, buyer_name: b.buyer_name, channel: b.channel || "Retailer" };

                return (
                  <tr key={b.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-center text-zinc-400 font-mono text-[11px]">{idx + 1}</td>

                    {/* Buyer Code */}
                    <td className="py-2 px-3">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={draft.buyer_code}
                          onChange={(e) => {
                            setBuyerDrafts((prev) => ({
                              ...prev,
                              [b.id]: { ...draft, buyer_code: e.target.value }
                            }));
                          }}
                          className="w-full h-7 px-2 bg-white border border-[#0B57D0] rounded text-xs font-mono font-medium text-zinc-900 focus:outline-none"
                        />
                      ) : (
                        <span className="font-mono font-medium text-[#0B57D0]">{b.buyer_code}</span>
                      )}
                    </td>

                    {/* Buyer Name */}
                    <td className="py-2 px-3">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={draft.buyer_name}
                          onChange={(e) => {
                            setBuyerDrafts((prev) => ({
                              ...prev,
                              [b.id]: { ...draft, buyer_name: e.target.value }
                            }));
                          }}
                          className="w-full h-7 px-2 bg-white border border-[#0B57D0] rounded text-xs font-medium text-zinc-900 focus:outline-none"
                        />
                      ) : (
                        <span className="font-medium text-zinc-800">{b.buyer_name}</span>
                      )}
                    </td>

                    {/* Channel */}
                    <td className="py-2 px-3">
                      {isEditMode ? (
                        <CustomSelect
                          value={draft.channel}
                          onChange={(newCh) => {
                            setBuyerDrafts((prev) => ({
                              ...prev,
                              [b.id]: { ...draft, channel: newCh }
                            }));
                          }}
                          options={buyersChannelSelectOptions}
                          minWidth="min-w-[130px]"
                        />
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 whitespace-nowrap">
                          {b.channel || "Retailer"}
                        </span>
                      )}
                    </td>

                    {/* Registered Date */}
                    <td className="py-2 px-3 text-center text-zinc-400 font-mono text-[11px]">
                      {formatDateDDMMYYYY(b.created_at)}
                    </td>

                    {/* Delete Button */}
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmConfig({
                            open: true,
                            title: "Remove Buyer Master",
                            description: `Are you sure you want to remove ${b.buyer_name} (${b.buyer_code})?`,
                            onConfirm: () => handleDeleteBuyer(b.id)
                          });
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Buyer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 4. MODALS & POPUPS */}

      {/* Modal: Channels Management */}
      {showChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Sales Channels Management</h2>
                <p className="text-xs text-zinc-500">Configure channels used for buyer segmentation</p>
              </div>
              <button type="button" onClick={() => setShowChannelModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto flex flex-col gap-3">
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                {channelsList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-400">No channels configured</div>
                ) : (
                  channelsList.map((ch) => (
                    <div key={ch.id} className="px-3 py-2 flex items-center justify-between bg-white hover:bg-slate-50 text-xs">
                      <div>
                        <span className="font-medium text-zinc-800">{ch.channel_name || ch.name}</span>
                        {ch.description && <p className="text-[11px] text-zinc-400">{ch.description}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteChannel(ch.id, ch.channel_name || ch.name)}
                        className="p-1 text-zinc-400 hover:text-red-600 rounded"
                        title="Delete Channel"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Channel Form */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-2.5">
                <h3 className="text-xs font-semibold text-zinc-800">Add New Channel</h3>
                <div>
                  <input
                    type="text"
                    placeholder="Channel Name (e.g. Modern Trade, Supermarket)"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={newChannelDesc}
                    onChange={(e) => setNewChannelDesc(e.target.value)}
                    className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs text-zinc-800 focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <button
                  type="button"
                  disabled={savingChannel || !newChannelName.trim()}
                  onClick={handleCreateChannel}
                  className="h-8 px-3 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 self-end shadow-2xs"
                >
                  {savingChannel ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                  <span>Add Channel</span>
                </button>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowChannelModal(false)}
                className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quick Register Buyer */}
      {showAddBuyerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Register New Buyer</h2>
                <p className="text-xs text-zinc-500">Add to standalone Buyers Master directory</p>
              </div>
              <button type="button" onClick={() => setShowAddBuyerModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3 text-xs">
              <div>
                <label className="font-medium text-zinc-700 block mb-1">Buyer Code / CustCode</label>
                <input
                  type="text"
                  value={newBuyerCode}
                  onChange={(e) => setNewBuyerCode(e.target.value)}
                  placeholder="e.g. 3000/F011 or TIKTOK_SHOP1"
                  className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs font-mono font-medium text-zinc-900 focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div>
                <label className="font-medium text-zinc-700 block mb-1">Buyer / Company Name</label>
                <input
                  type="text"
                  value={newBuyerName}
                  onChange={(e) => setNewBuyerName(e.target.value)}
                  placeholder="e.g. FairPrice Supermarket"
                  className="w-full h-8 px-2.5 border border-slate-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div>
                <label className="font-medium text-zinc-700 block mb-1">Sales Channel</label>
                <CustomSelect
                  value={newBuyerChannel}
                  onChange={setNewBuyerChannel}
                  options={buyersChannelSelectOptions}
                  className="w-full"
                  minWidth="w-full"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBuyerModal(false)}
                className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingNewBuyer || !newBuyerCode.trim() || !newBuyerName.trim()}
                onClick={handleAddBuyer}
                className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
              >
                {savingNewBuyer ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Save Buyer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Buyers Excel Import Preview */}
      {showBuyersImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-950">Import Buyers Preview</h2>
                <p className="text-xs text-zinc-500">{importedBuyers.length} buyers parsed from Excel</p>
              </div>
              <button type="button" onClick={() => setShowBuyersImportModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-zinc-500 font-medium border-b border-slate-200">
                    <th className="py-1.5 px-2">Code</th>
                    <th className="py-1.5 px-2">Name</th>
                    <th className="py-1.5 px-2">Channel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importedBuyers.map((b, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-2 font-mono font-medium text-[#0B57D0]">{b.buyer_code}</td>
                      <td className="py-1.5 px-2 font-medium text-zinc-800">{b.buyer_name}</td>
                      <td className="py-1.5 px-2">{b.channel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBuyersImportModal(false)}
                className="h-8 px-3 rounded-lg border border-slate-300 text-xs font-medium text-zinc-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={importingBuyers}
                onClick={handleSubmitBuyersImport}
                className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs"
              >
                {importingBuyers ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Import All</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmConfig.open}
        onOpenChange={(open) => setConfirmConfig((prev) => ({ ...prev, open }))}
        title={confirmConfig.title}
        description={confirmConfig.description}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
