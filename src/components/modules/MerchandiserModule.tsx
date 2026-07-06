"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { NavigationTabs } from "../navigation-tabs";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";
import { jsPDF } from "jspdf";
import { X, Calendar, BarChart3, Settings2, Users as UsersIcon, Plus, ChevronLeft, ChevronRight, Printer, Clock, History, UserCheck, ClipboardCheck } from "lucide-react";

// Suggestions presets for Settings
const statusSuggestions = ["Carry", "Not Carry"];
const rankSuggestions = ["Top 10", "Bottom 10", "Rank A", "Rank B", "Rank C"];

// Graph colors
const colorPalette = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#8b5cf6", // Violet
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#3b82f6", // Blue
];

interface MerchUserEditFormProps {
  user: any | null;
  existingUsers: any[];
  onSave: (data: any, isNew: boolean) => void;
  onCancel: () => void;
}

export function MerchUserEditForm({ user, existingUsers, onSave, onCancel }: MerchUserEditFormProps) {
  const isNew = !user;
  const [idVal, setIdVal] = React.useState(user?.ID || "");
  const [nameVal, setNameVal] = React.useState(user?.Name || "");
  const [pinVal, setPinVal] = React.useState(user?.PIN || "");
  const [emailVal, setEmailVal] = React.useState(user?.Email || "");
  const [phoneVal, setPhoneVal] = React.useState(user?.Phone || "");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanId = idVal.trim();
    const cleanName = nameVal.trim();
    const cleanPin = String(pinVal).trim();
    const cleanEmail = emailVal.trim();
    const cleanPhone = phoneVal.trim();

    if (!cleanId) {
      showToast("Merch ID cannot be empty!", "error");
      return;
    }
    if (!cleanName) {
      showToast("Name cannot be empty!", "error");
      return;
    }
    if (!cleanPin || isNaN(Number(cleanPin))) {
      showToast("PIN must be a valid number!", "error");
      return;
    }

    if (isNew) {
      const exists = existingUsers.some(u => String(u.ID).toLowerCase() === cleanId.toLowerCase());
      if (exists) {
        showToast("A merchandiser with this ID already exists!", "error");
        return;
      }
    }

    onSave({
      ID: cleanId,
      Name: cleanName,
      PIN: Number(cleanPin),
      Email: cleanEmail,
      Phone: cleanPhone
    }, isNew);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-40 animate-tableFadeInOnly p-4">
      <div 
        className="bg-[#EEEEEE] border border-zinc-300 w-full max-w-md rounded-lg p-5 shadow-xl flex flex-col gap-4 animate-modalSlideUp relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-zinc-300/60">
          <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
            {isNew ? "Add New Merchandiser" : "Edit Merchandiser"}
          </h3>
          <button 
            onClick={onCancel} 
            className="text-zinc-400 hover:text-zinc-800 focus:outline-none cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Merch ID</label>
            <input
              type="text"
              value={idVal}
              onChange={(e) => setIdVal(e.target.value)}
              disabled={!isNew}
              placeholder="e.g. SM003"
              className={`w-full text-xs border rounded-lg px-3 py-2 font-semibold focus:outline-none ${
                !isNew 
                  ? "bg-zinc-200 border-zinc-300 text-zinc-500 cursor-not-allowed" 
                  : "bg-[#EEEEEE] border-zinc-300 text-zinc-900 focus:border-zinc-400"
              }`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Name</label>
            <input
              type="text"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              placeholder="e.g. Zubair"
              className="w-full text-xs bg-[#EEEEEE] border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-400 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">PIN (Numeric)</label>
            <input
              type="text"
              value={pinVal}
              onChange={(e) => setPinVal(e.target.value)}
              placeholder="e.g. 1234"
              className="w-full text-xs bg-[#EEEEEE] border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-400 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={emailVal}
              onChange={(e) => setEmailVal(e.target.value)}
              placeholder="e.g. user@example.com"
              className="w-full text-xs bg-[#EEEEEE] border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-400 font-semibold"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Phone</label>
            <input
              type="text"
              value={phoneVal}
              onChange={(e) => setPhoneVal(e.target.value)}
              placeholder="e.g. +65 1234 5678"
              className="w-full text-xs bg-[#EEEEEE] border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-400 font-semibold"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-300/60 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold bg-[#E5E5E5] hover:bg-zinc-300 border border-zinc-300 rounded-lg text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-950 text-white rounded-lg transition-colors cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TagInputProps {
  tags: string[];
  onChange: (newTags: string[]) => void;
  placeholder?: string;
  suggestions: string[];
  id: string;
  disabled?: boolean;
}

export function TagInput({ tags, onChange, placeholder, suggestions, id, disabled = false }: TagInputProps) {
  const [inputVal, setInputVal] = React.useState("");

  const addTag = (text: string) => {
    if (disabled) return;
    const trimmed = text.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputVal("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputVal);
    }
  };

  const removeTag = (indexToRemove: number) => {
    if (disabled) return;
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Badges */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1">
          {tags.map((tag, idx) => (
            <span 
              key={idx} 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E8F0FE] border border-transparent font-primary text-xs font-bold text-[#0B57D0] shadow-2xs hover:bg-[#D2E3FC] transition-colors"
            >
              {tag}
              {!disabled && (
                <button 
                  type="button" 
                  onClick={() => removeTag(idx)}
                  className="text-[#0B57D0] hover:text-red-600 focus:outline-none font-bold text-[10px] cursor-pointer"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      {!disabled && (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            list={`datalist_${id}`}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Type and press Enter..."}
            className="flex-1 h-8 text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold"
          />
          <CustomButton
            type="button"
            onClick={() => addTag(inputVal)}
            variant="default"
            className="h-8"
          >
            Add
          </CustomButton>
        </div>
      )}

      <datalist id={`datalist_${id}`}>
        {suggestions.map((s, idx) => (
          <option key={idx} value={s} />
        ))}
      </datalist>
    </div>
  );
}

export function MerchandiserModule({ profile }: { profile?: { role: string; name?: string; email?: string } | null }) {
  const userRole = React.useMemo(() => {
    const role = profile?.role;
    if (role === "Administrator" || role === "Manager") return "admin";
    if (role === "Operator" || role === "Operation") return "operator";
    return "viewer";
  }, [profile]);

  const isViewer = userRole === "viewer";

  const tabs = [
    { id: "performance", label: "Performance", desc: "Analyze store visit statistics, performance indicators, and monthly retailer volume graphs." },
    { id: "report", label: "Report", desc: "Detailed records of product audits, brand allocations, and photo captures in the last 60 days." },
    { id: "task", label: "Task", desc: "Manage and update merchandiser-specific field tasks." },
    { id: "setting", label: "Deploy", desc: "Configure merchandiser parameters, target status limits, and avoided store rankings." },
    { id: "users", label: "Users", desc: "Registry of active field merchandisers and secure PIN credentials." }
  ];

  const [activeTab, setActiveTab] = React.useState("performance");
  const [calcGroupBy, setCalcGroupBy] = React.useState<"zone" | "retailer">("zone");
  const [fetching, setFetching] = React.useState(false);

  // Print Report modal states
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
  const [printReportType, setPrintReportType] = React.useState<"weekly" | "monthly">("weekly");
  const [selectedPrintWeekIndex, setSelectedPrintWeekIndex] = React.useState(0);
  const [selectedPrintMonthIndex, setSelectedPrintMonthIndex] = React.useState(0);

  // States for Task Tab
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [isUpdateLogOpen, setIsUpdateLogOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);

  // Form states for log update
  const [newAction, setNewAction] = React.useState<"Visit" | "Call" | "Check Last Order">("Visit");
  const [newRemark, setNewRemark] = React.useState("");
  const [newActionBy, setNewActionBy] = React.useState("");
  const [nextAction, setNextAction] = React.useState<"Visit" | "Call" | "Check Last Order">("Visit");

  // States for dynamic sheets
  const [productLogs, setProductLogs] = React.useState<any[]>([]);
  const [shelfLogs, setShelfLogs] = React.useState<any[]>([]);
  const [settings, setSettings] = React.useState<any[]>([]);
  const [merchUsers, setMerchUsers] = React.useState<any[]>([]);

  // Dependency lookups
  const [stores, setStores] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [retailers, setRetailers] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);

  // Active Modals
  const [editingMerchUser, setEditingMerchUser] = React.useState<any | null>(null);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  // Setting input bindings
  const [settingFreq, setSettingFreq] = React.useState<number>(14);
  const [settingFocusRet, setSettingFocusRet] = React.useState<string[]>([]);
  const [settingFocusStatus, setSettingFocusStatus] = React.useState<string[]>([]);
  const [settingFocusRank, setSettingFocusRank] = React.useState<string[]>([]);
  const [settingAvoidRet, setSettingAvoidRet] = React.useState<string[]>([]);

  // Chart hover tooltip state for line points
  const [hoveredPoint, setHoveredPoint] = React.useState<{ 
    month: string; 
    val: number; 
    x: number; 
    y: number; 
  } | null>(null);

  // Navigational offsets for week and month counters
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [monthOffset, setMonthOffset] = React.useState(0);

  // Helper calculation functions for offset dates
  const getWeekRange = React.useCallback((offset: number) => {
    const todayDate = new Date();
    const baseDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + offset * 7);
    const currentDay = baseDate.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { monday, sunday };
  }, []);

  const getMonthRange = React.useCallback((offset: number) => {
    const todayDate = new Date();
    const baseDate = new Date(todayDate.getFullYear(), todayDate.getMonth() + offset, 1);
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }, []);

  const formatWeekRange = React.useCallback((monday: Date, sunday: Date): string => {
    const monStr = monday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const sunStr = sunday.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${monStr} - ${sunStr}`;
  }, []);

  const formatMonthName = React.useCallback((start: Date): string => {
    return start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }, []);

  // Generate last 52 weeks
  const weekOptions = React.useMemo(() => {
    const options = [];
    for (let i = 0; i < 52; i++) {
      const { monday, sunday } = getWeekRange(-i);
      const label = formatWeekRange(monday, sunday);
      options.push({ offset: -i, label, monday, sunday });
    }
    return options;
  }, [getWeekRange, formatWeekRange]);

  // Generate last 12 months
  const monthOptions = React.useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const { start } = getMonthRange(-i);
      const label = formatMonthName(start);
      options.push({ offset: -i, label, start });
    }
    return options;
  }, [getMonthRange, formatMonthName]);

  // Parser helper to safely handle Unix Epoch and ISO date strings
  const parseTimestamp = React.useCallback((timestamp: any): Date => {
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === "number") {
      if (timestamp >= 30000 && timestamp <= 60000) {
        return new Date(Math.round((timestamp - 25569) * 86400 * 1000));
      }
      return new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
    }
    const str = String(timestamp ?? "").trim();
    if (!str) return new Date(NaN);

    if (/^\d+(\.\d+)?$/.test(str)) {
      const num = Number(str);
      if (num >= 30000 && num <= 60000) {
        return new Date(Math.round((num - 25569) * 86400 * 1000));
      }
      return new Date(num < 10000000000 ? num * 1000 : num);
    }

    const matchSlash = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?/);
    if (matchSlash) {
      const day = Number(matchSlash[1]);
      const month = Number(matchSlash[2]) - 1;
      const year = Number(matchSlash[3]);
      const hours = matchSlash[4] ? Number(matchSlash[4]) : 0;
      const minutes = matchSlash[5] ? Number(matchSlash[5]) : 0;
      const seconds = matchSlash[6] ? Number(matchSlash[6]) : 0;
      return new Date(year, month, day, hours, minutes, seconds);
    }

    const matchDash = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?/);
    if (matchDash) {
      const year = Number(matchDash[1]);
      const month = Number(matchDash[2]) - 1;
      const day = Number(matchDash[3]);
      const hours = matchDash[4] ? Number(matchDash[4]) : 0;
      const minutes = matchDash[5] ? Number(matchDash[5]) : 0;
      const seconds = matchDash[6] ? Number(matchDash[6]) : 0;
      return new Date(year, month, day, hours, minutes, seconds);
    }

    return new Date(str);
  }, []);

  // Date formatting utility to dd/mm/yyyy
  const formatDate = React.useCallback((isoString: any): string => {
    if (!isoString) return "";
    const date = parseTimestamp(isoString);
    if (isNaN(date.getTime())) return String(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`; // dd/mm/yyyy
  }, [parseTimestamp]);

  // Retailer Name lookup helper by matching store and retailer tables
  const getRetailerName = React.useCallback((store: any): string => {
    if (!store) return "Unknown";
    const retailerId = store["Retailers ID"] || store["Retailer ID"];
    if (!retailerId) return "Unknown";
    const retailer = retailers.find(r => String(r.ID) === String(retailerId));
    return retailer ? (retailer["Display Name"] || retailer["ID"]) : String(retailerId);
  }, [retailers]);

  // Brand Logo lookup helper
  const getBrandLogo = React.useCallback((brandNameOrId: string): string => {
    if (!brandNameOrId) return "";
    const brand = brands.find(b => 
      String(b["Display Name"]).toLowerCase() === String(brandNameOrId).toLowerCase() ||
      String(b.ID).toLowerCase() === String(brandNameOrId).toLowerCase()
    );
    return brand ? String(brand["Logo Image"] || "") : "";
  }, [brands]);

  // Brand Name lookup helper
  const getBrandName = React.useCallback((brandId: string): string => {
    if (!brandId || brandId === "Unknown") return "Unknown";
    const brand = brands.find(b => String(b.ID).toLowerCase() === String(brandId).toLowerCase());
    return brand ? (brand["Display Name"] || brand.ID) : brandId;
  }, [brands]);

  // Unique list of retailer names for graph & legends
  const uniqueRetailers = React.useMemo(() => {
    const list = retailers.map(r => r["Display Name"] || r["ID"]).filter(Boolean);
    if (list.length === 0 && stores.length > 0) {
      const storeRets = stores.map(s => s["Retailers ID"] || s["Retailer ID"]).filter(Boolean);
      return Array.from(new Set(storeRets)) as string[];
    }
    return Array.from(new Set(list)) as string[];
  }, [retailers, stores]);

  // Helper helper to cache and return json
  const fetchSheet = async (sheetName: string) => {
    const res = await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`);
    if (!res.ok) throw new Error(`Failed to fetch ${sheetName}`);
    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.value || []);
    localStorage.setItem(`${sheetName}_data`, JSON.stringify(items));
    return items;
  };

  const fetchFreshData = async (sheetName: string, forceSync = false) => {
    try {
      if (forceSync) {
        await fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=${sheetName}`, { method: "POST" });
      }
      return await fetchSheet(sheetName);
    } catch (e) {
      console.warn("Background fetch failed for " + sheetName, e);
      return [];
    }
  };

  // Load cache on mount
  React.useEffect(() => {
    const pLogsCached = localStorage.getItem("Merch_Visit_Product_Audit_Logs_data");
    const sLogsCached = localStorage.getItem("Merch_Visit_Shelf_Audit_Logs_data");
    const settingsCached = localStorage.getItem("Merch_Visit_Setting_data");
    const mUsersCached = localStorage.getItem("Merch_Users_data");
    const storesCached = localStorage.getItem("Store_Retailer_DB_data");
    const productsCached = localStorage.getItem("products_DB_data");
    const retailersCached = localStorage.getItem("retailers_DB_data");
    const brandsCached = localStorage.getItem("brands_DB_data");
    const tasksCached = localStorage.getItem("Stores_Task_Assigned_data");

    if (pLogsCached) setProductLogs(JSON.parse(pLogsCached));
    if (sLogsCached) setShelfLogs(JSON.parse(sLogsCached));
    if (settingsCached) setSettings(JSON.parse(settingsCached));
    if (mUsersCached) setMerchUsers(JSON.parse(mUsersCached));
    if (storesCached) setStores(JSON.parse(storesCached));
    if (productsCached) setProducts(JSON.parse(productsCached));
    if (retailersCached) setRetailers(JSON.parse(retailersCached));
    if (brandsCached) setBrands(JSON.parse(brandsCached));
    if (tasksCached) setTasks(JSON.parse(tasksCached));

    setFetching(true);
    Promise.all([
      pLogsCached ? Promise.resolve(JSON.parse(pLogsCached)) : fetchSheet("Merch_Visit_Product_Audit_Logs"),
      sLogsCached ? Promise.resolve(JSON.parse(sLogsCached)) : fetchSheet("Merch_Visit_Shelf_Audit_Logs"),
      settingsCached ? Promise.resolve(JSON.parse(settingsCached)) : fetchSheet("Merch_Visit_Setting"),
      mUsersCached ? Promise.resolve(JSON.parse(mUsersCached)) : fetchSheet("Merch_Users"),
      storesCached ? Promise.resolve(JSON.parse(storesCached)) : fetchSheet("Store_Retailer_DB"),
      productsCached ? Promise.resolve(JSON.parse(productsCached)) : fetchSheet("products_DB"),
      retailersCached ? Promise.resolve(JSON.parse(retailersCached)) : fetchSheet("retailers_DB"),
      brandsCached ? Promise.resolve(JSON.parse(brandsCached)) : fetchSheet("brands_DB"),
      tasksCached ? Promise.resolve(JSON.parse(tasksCached)) : fetchSheet("Stores_Task_Assigned")
    ]).then(([p, s, set, u, st, prod, ret, br, t]) => {
      setProductLogs(p);
      setShelfLogs(s);
      setSettings(set);
      setMerchUsers(u);
      setStores(st);
      setProducts(prod);
      setRetailers(ret);
      setBrands(br);
      setTasks(t);
    }).catch((e) => {
      showToast("Error loading merchandiser workspace: " + e.message, "error");
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
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Merch_Visit_Product_Audit_Logs`, { method: "POST" }),
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Merch_Visit_Shelf_Audit_Logs`, { method: "POST" }),
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Merch_Visit_Setting`, { method: "POST" }),
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Merch_Users`, { method: "POST" }),
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Store_Retailer_DB`, { method: "POST" }),
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=products_DB`, { method: "POST" }),
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=retailers_DB`, { method: "POST" }),
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=brands_DB`, { method: "POST" }),
          fetch(`https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Stores_Task_Assigned`, { method: "POST" })
        ]);

        const [productLogsVal, shelfLogsVal, settingsVal, usersVal, storesVal, productsVal, retailersVal, brandsVal, tasksVal] = await Promise.all([
          fetchSheet("Merch_Visit_Product_Audit_Logs"),
          fetchSheet("Merch_Visit_Shelf_Audit_Logs"),
          fetchSheet("Merch_Visit_Setting"),
          fetchSheet("Merch_Users"),
          fetchSheet("Store_Retailer_DB"),
          fetchSheet("products_DB"),
          fetchSheet("retailers_DB"),
          fetchSheet("brands_DB"),
          fetchSheet("Stores_Task_Assigned")
        ]);

        setProductLogs(productLogsVal);
        setShelfLogs(shelfLogsVal);
        setSettings(settingsVal);
        setMerchUsers(usersVal);
        setStores(storesVal);
        setProducts(productsVal);
        setRetailers(retailersVal);
        setBrands(brandsVal);
        setTasks(tasksVal);
        setProducts(productsVal);
        setRetailers(retailersVal);
        setBrands(brandsVal);

        showToast("Records refreshed successfully!", "success");
      } catch (err: any) {
        showToast("Refresh failed: " + err.message, "error");
      } finally {
        setFetching(false);
      }
    };

    window.addEventListener("db-refresh", handleRefresh);
    return () => window.removeEventListener("db-refresh", handleRefresh);
  }, []);





  // Listen for escape key to close history sidebar
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isHistoryOpen) {
        setIsHistoryOpen(false);
        setSelectedTask(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHistoryOpen]);

  // Parse Settings rows into hook states
  React.useEffect(() => {
    if (settings.length > 0) {
      const parseTags = (val: any): string[] => {
        if (!val) return [];
        return String(val).split(",").map(s => s.trim()).filter(Boolean);
      };

      const getRetailerNameFromId = (id: string): string => {
        const ret = retailers.find(r => String(r.ID).toLowerCase() === id.toLowerCase());
        return ret ? (ret["Display Name"] || ret.ID) : id;
      };

      const freqObj = settings.find(s => s["ID Setting"] === "Visit Frequency");
      const focusRetObj = settings.find(s => s["ID Setting"] === "Focus Retailers");
      const focusStatusObj = settings.find(s => s["ID Setting"] === "Focus Status Stores");
      const focusRankObj = settings.find(s => s["ID Setting"] === "Focus Rank Stores");
      const avoidRetObj = settings.find(s => s["ID Setting"] === "Avoid Retailers");

      if (freqObj) setSettingFreq(Number(freqObj.Value || 14));
      if (focusRetObj) {
        const ids = parseTags(focusRetObj.Value);
        setSettingFocusRet(ids.map(getRetailerNameFromId));
      }
      if (focusStatusObj) setSettingFocusStatus(parseTags(focusStatusObj.Value));
      if (focusRankObj) setSettingFocusRank(parseTags(focusRankObj.Value));
      if (avoidRetObj) {
        const ids = parseTags(avoidRetObj.Value);
        setSettingAvoidRet(ids.map(getRetailerNameFromId));
      }
    }
  }, [settings, retailers]);

  // Autocomplete lists
  const retailerSuggestions = React.useMemo(() => {
    return Array.from(new Set(retailers.map(r => r["Display Name"]).filter(Boolean))) as string[];
  }, [retailers]);

  // Deploy settings
  const handleDeploySettings = async () => {
    showToast("Deploying settings in background...", "info");

    const getRetailerIdFromName = (name: string): string => {
      const ret = retailers.find(r => 
        String(r["Display Name"]).toLowerCase() === name.toLowerCase() ||
        String(r.ID).toLowerCase() === name.toLowerCase()
      );
      return ret ? ret.ID : name;
    };

    const focusRetIds = settingFocusRet.map(getRetailerIdFromName);
    const avoidRetIds = settingAvoidRet.map(getRetailerIdFromName);

    const payloadFreq = { "ID Setting": "Visit Frequency", "Input": "Number", "Value": String(settingFreq) };
    const payloadFocusRet = { "ID Setting": "Focus Retailers", "Input": "Retailer ID's", "Value": focusRetIds.join(", ") };
    const payloadFocusStatus = { "ID Setting": "Focus Status Stores", "Input": "Carry, Not Carry", "Value": settingFocusStatus.join(", ") };
    const payloadFocusRank = { "ID Setting": "Focus Rank Stores", "Input": "Top 10, Bottom 10", "Value": settingFocusRank.join(", ") };
    const payloadAvoidRet = { "ID Setting": "Avoid Retailers", "Input": "Retailer ID's", "Value": avoidRetIds.join(", ") };

    const updateRow = async (row: any) => {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Merch_Visit_Setting",
          action: "update",
          data: row
        })
      });
      if (!res.ok) throw new Error(`Deploy failed for ${row["ID Setting"]}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || `Deploy failed for ${row["ID Setting"]}`);
    };

    try {
      await Promise.all([
        updateRow(payloadFreq),
        updateRow(payloadFocusRet),
        updateRow(payloadFocusStatus),
        updateRow(payloadFocusRank),
        updateRow(payloadAvoidRet)
      ]);

      const newSettings = [
        payloadFreq,
        payloadFocusRet,
        payloadFocusStatus,
        payloadFocusRank,
        payloadAvoidRet
      ];
      setSettings(newSettings);
      localStorage.setItem("Merch_Visit_Setting_data", JSON.stringify(newSettings));
      
      showToast("Settings deployed successfully to Google Sheets!", "success");
      fetchFreshData("Merch_Visit_Setting", false);
    } catch (e: any) {
      showToast("Deploy failed: " + e.message, "error");
    }
  };

  // Performance Tab calculations
  const performanceStats = React.useMemo(() => {
    // 365 days filtering limit
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const filteredLogs = productLogs.filter(log => parseTimestamp(log.Timestamp) >= oneYearAgo);

    const isToday = (d: Date) => {
      const todayDate = new Date();
      return d.getDate() === todayDate.getDate() && d.getMonth() === todayDate.getMonth() && d.getFullYear() === todayDate.getFullYear();
    };

    // Selected week range
    const { monday, sunday } = getWeekRange(weekOffset);
    const isSelectedWeek = (d: Date) => {
      return d >= monday && d <= sunday;
    };

    // Selected month range
    const { start: monthStart, end: monthEnd } = getMonthRange(monthOffset);
    const isSelectedMonth = (d: Date) => {
      return d >= monthStart && d <= monthEnd;
    };

    // Calculate totals
    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    // Grouped by retailer
    const retailerGroup: Record<string, { today: number; week: number; month: number }> = {};

    filteredLogs.forEach((log) => {
      const logDate = parseTimestamp(log.Timestamp);
      const store = stores.find(s => String(s.ID) === String(log["Retailer Stores ID"]));
      const retName = getRetailerName(store);

      if (retName) {
        if (!retailerGroup[retName]) {
          retailerGroup[retName] = { today: 0, week: 0, month: 0 };
        }

        const matchesToday = isToday(logDate);
        const matchesWeek = isSelectedWeek(logDate);
        const matchesMonth = isSelectedMonth(logDate);

        if (matchesToday) {
          todayCount++;
          retailerGroup[retName].today++;
        }
        if (matchesWeek) {
          weekCount++;
          retailerGroup[retName].week++;
        }
        if (matchesMonth) {
          monthCount++;
          retailerGroup[retName].month++;
        }
      }
    });

    return {
      totals: { today: todayCount, week: weekCount, month: monthCount },
      retailers: Object.entries(retailerGroup).map(([name, counts]) => ({
        name,
        ...counts
      }))
    };
  }, [productLogs, stores, getRetailerName, weekOffset, monthOffset, getWeekRange, getMonthRange, parseTimestamp]);

  // 12-Month Performance Graph Calculations (total visits)
  const graphData = React.useMemo(() => {
    // Last 12 months array
    const resultMonths: { year: number; month: number; label: string }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      resultMonths.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString("default", { month: "short", year: "2-digit" })
      });
    }

    const data = resultMonths.map((m) => {
      const monthLogs = productLogs.filter((log) => {
        const logDate = parseTimestamp(log.Timestamp);
        return logDate.getFullYear() === m.year && logDate.getMonth() === m.month;
      });

      return {
        label: m.label,
        totalVisits: monthLogs.length
      };
    });

    const maxCount = Math.max(...data.map(d => d.totalVisits), 5);

    return {
      data,
      maxVal: maxCount
    };
  }, [productLogs, parseTimestamp]);

  const handlePrintPDF = React.useCallback(() => {
    const doc = new jsPDF();
    
    if (printReportType === "weekly") {
      // 1. Get week info
      const selectedWeek = weekOptions[selectedPrintWeekIndex] || weekOptions[0];
      const { monday, sunday } = selectedWeek;
      const weekLabel = selectedWeek.label;
      
      const startOfDay = (d: Date) => {
        const res = new Date(d);
        res.setHours(0, 0, 0, 0);
        return res;
      };
      const endOfDay = (d: Date) => {
        const res = new Date(d);
        res.setHours(23, 59, 59, 999);
        return res;
      };
      
      const minDate = startOfDay(monday);
      const maxDate = endOfDay(sunday);
      
      const filteredLogs = productLogs.filter(log => {
        const logDate = parseTimestamp(log.Timestamp);
        return logDate >= minDate && logDate <= maxDate;
      });
      
      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("iB HSG Global - Merchandiser Weekly Performance Report", 14, 20);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const reportNow = new Date();
      const reportDateStr = reportNow.toLocaleDateString("en-GB") + " " + reportNow.toLocaleTimeString([], { hour12: false });
      doc.text(`Generated: ${reportDateStr}`, 14, 26);
      doc.text(`Selected Week: ${weekLabel}`, 14, 31);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 35, 196, 35);
      
      // Calculate daily counts per retailer
      const retailerDays: Record<string, number[]> = {}; // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
      
      filteredLogs.forEach(log => {
        const logDate = parseTimestamp(log.Timestamp);
        const store = stores.find(s => String(s.ID) === String(log["Retailer Stores ID"]));
        const retName = getRetailerName(store);
        
        if (retName) {
          if (!retailerDays[retName]) {
            retailerDays[retName] = [0, 0, 0, 0, 0, 0, 0];
          }
          let dayIdx = logDate.getDay() - 1;
          if (dayIdx < 0) dayIdx = 6; // Sunday becomes index 6
          retailerDays[retName][dayIdx]++;
        }
      });
      
      // Draw Table
      let yOffset = 45;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("Daily Visits Breakdown", 14, yOffset);
      
      yOffset += 6;
      doc.setFillColor(229, 229, 229);
      doc.rect(14, yOffset, 182, 8, "F");
      
      doc.setFontSize(8.5);
      doc.text("Retailer", 16, yOffset + 5.5);
      doc.text("Mon", 70, yOffset + 5.5);
      doc.text("Tue", 86, yOffset + 5.5);
      doc.text("Wed", 102, yOffset + 5.5);
      doc.text("Thu", 118, yOffset + 5.5);
      doc.text("Fri", 134, yOffset + 5.5);
      doc.text("Sat", 150, yOffset + 5.5);
      doc.text("Sun", 166, yOffset + 5.5);
      doc.text("Total", 182, yOffset + 5.5);
      
      yOffset += 8;
      doc.setFont("helvetica", "normal");
      
      const retailerRows = Object.entries(retailerDays);
      if (retailerRows.length > 0) {
        retailerRows.forEach(([name, days], idx) => {
          if (idx % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(14, yOffset, 182, 7, "F");
          }
          const total = days.reduce((sum, d) => sum + d, 0);
          
          doc.text(String(name), 16, yOffset + 5);
          doc.text(String(days[0]), 70, yOffset + 5);
          doc.text(String(days[1]), 86, yOffset + 5);
          doc.text(String(days[2]), 102, yOffset + 5);
          doc.text(String(days[3]), 118, yOffset + 5);
          doc.text(String(days[4]), 134, yOffset + 5);
          doc.text(String(days[5]), 150, yOffset + 5);
          doc.text(String(days[6]), 166, yOffset + 5);
          
          doc.setFont("helvetica", "bold");
          doc.text(String(total), 182, yOffset + 5);
          doc.setFont("helvetica", "normal");
          
          yOffset += 7;
        });
      } else {
        doc.text("No visits recorded for this week.", 16, yOffset + 5);
        yOffset += 7;
      }
      
      doc.save(`merchandiser_weekly_report_${Date.now()}.pdf`);
    } else {
      // Monthly Report
      const selectedMonth = monthOptions[selectedPrintMonthIndex] || monthOptions[0];
      const { start: monthStart } = selectedMonth;
      const monthLabel = selectedMonth.label;
      
      const { start, end } = getMonthRange(-selectedPrintMonthIndex);
      
      const filteredLogs = productLogs.filter(log => {
        const logDate = parseTimestamp(log.Timestamp);
        return logDate >= start && logDate <= end;
      });
      
      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("iB HSG Global - Merchandiser Monthly Performance Report", 14, 20);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const reportNow = new Date();
      const reportDateStr = reportNow.toLocaleDateString("en-GB") + " " + reportNow.toLocaleTimeString([], { hour12: false });
      doc.text(`Generated: ${reportDateStr}`, 14, 26);
      doc.text(`Selected Month: ${monthLabel}`, 14, 31);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 35, 196, 35);
      
      // Calculate weekly counts per retailer
      const retailerWeeks: Record<string, number[]> = {}; // [W1, W2, W3, W4, W5]
      
      filteredLogs.forEach(log => {
        const logDate = parseTimestamp(log.Timestamp);
        const store = stores.find(s => String(s.ID) === String(log["Retailer Stores ID"]));
        const retName = getRetailerName(store);
        
        if (retName) {
          if (!retailerWeeks[retName]) {
            retailerWeeks[retName] = [0, 0, 0, 0, 0];
          }
          const day = logDate.getDate();
          let weekIdx = 0;
          if (day <= 7) weekIdx = 0;
          else if (day <= 14) weekIdx = 1;
          else if (day <= 21) weekIdx = 2;
          else if (day <= 28) weekIdx = 3;
          else weekIdx = 4;
          
          retailerWeeks[retName][weekIdx]++;
        }
      });
      
      // Draw Table
      let yOffset = 45;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text("Weekly Visits Breakdown", 14, yOffset);
      
      yOffset += 6;
      doc.setFillColor(229, 229, 229);
      doc.rect(14, yOffset, 182, 8, "F");
      
      doc.setFontSize(8.5);
      doc.text("Retailer", 16, yOffset + 5.5);
      doc.text("Week 1 (1-7)", 70, yOffset + 5.5);
      doc.text("Week 2 (8-14)", 95, yOffset + 5.5);
      doc.text("Week 3 (15-21)", 120, yOffset + 5.5);
      doc.text("Week 4 (22-28)", 145, yOffset + 5.5);
      doc.text("Week 5 (29+)", 167, yOffset + 5.5);
      doc.text("Total", 185, yOffset + 5.5);
      
      yOffset += 8;
      doc.setFont("helvetica", "normal");
      
      const retailerRows = Object.entries(retailerWeeks);
      if (retailerRows.length > 0) {
        retailerRows.forEach(([name, weeks], idx) => {
          if (idx % 2 === 0) {
            doc.setFillColor(245, 245, 245);
            doc.rect(14, yOffset, 182, 7, "F");
          }
          const total = weeks.reduce((sum, w) => sum + w, 0);
          
          doc.text(String(name), 16, yOffset + 5);
          doc.text(String(weeks[0]), 70, yOffset + 5);
          doc.text(String(weeks[1]), 95, yOffset + 5);
          doc.text(String(weeks[2]), 120, yOffset + 5);
          doc.text(String(weeks[3]), 145, yOffset + 5);
          doc.text(String(weeks[4]), 167, yOffset + 5);
          
          doc.setFont("helvetica", "bold");
          doc.text(String(total), 185, yOffset + 5);
          doc.setFont("helvetica", "normal");
          
          yOffset += 7;
        });
      } else {
        doc.text("No visits recorded for this month.", 16, yOffset + 5);
        yOffset += 7;
      }
      
      doc.save(`merchandiser_monthly_report_${Date.now()}.pdf`);
    }
    
    setIsPrintModalOpen(false);
  }, [printReportType, selectedPrintWeekIndex, selectedPrintMonthIndex, weekOptions, monthOptions, productLogs, stores, getRetailerName, parseTimestamp, getMonthRange]);

  // Report Tab calculations (60 days)
  const reportData = React.useMemo(() => {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const filtered = productLogs.filter(log => parseTimestamp(log.Timestamp) >= sixtyDaysAgo);
    
    // Group by store and only keep the latest visit log per store
    const latestStoreVisits: Record<string, any> = {};
    filtered.forEach((log) => {
      const storeId = String(log["Retailer Stores ID"]);
      const existing = latestStoreVisits[storeId];
      if (!existing || parseTimestamp(log.Timestamp) > parseTimestamp(existing.Timestamp)) {
        latestStoreVisits[storeId] = log;
      }
    });

    const uniqueLogs = Object.values(latestStoreVisits);

    // Sort descending by date
    uniqueLogs.sort((a, b) => parseTimestamp(b.Timestamp).getTime() - parseTimestamp(a.Timestamp).getTime());

    return uniqueLogs.map((log) => {
      const store = stores.find(s => String(s.ID) === String(log["Retailer Stores ID"]));
      const storeName = store ? store["Display Name"] : `Store #${log["Retailer Stores ID"]}`;
      const retailerName = store ? getRetailerName(store) : "-";

      // Calculate Brands (Qty SKU)
      const brandSkuCounts: Record<string, { brandId: string; count: number; shelfImage: string }> = {};
      let auditItems: any[] = [];
      try {
        auditItems = JSON.parse(log["Audit JSON"] || "[]");
      } catch (e) {}

      auditItems.forEach((item: any) => {
        const prod = products.find((p) => String(p.SKU).toLowerCase() === String(item.sku).toLowerCase());
        const brandId = prod ? prod["Brands ID"] : "Unknown";
        
        if (brandId) {
          if (!brandSkuCounts[brandId]) {
            // Find latest shelf photo specifically matching this Brand and Store (no date check!)
            const storeShelfLogs = shelfLogs.filter(sl => 
              String(sl["Retailer Stores ID"]) === String(log["Retailer Stores ID"]) && 
              String(sl["Brands ID"]).toLowerCase() === String(brandId).toLowerCase()
            );
            if (storeShelfLogs.length > 1) {
              storeShelfLogs.sort((a, b) => parseTimestamp(b.Timestamp).getTime() - parseTimestamp(a.Timestamp).getTime());
            }
            const shelfImageLink = storeShelfLogs.length > 0 ? storeShelfLogs[0]["Image Link"] : "";

            brandSkuCounts[brandId] = { 
              brandId,
              count: 0, 
              shelfImage: shelfImageLink
            };
          }
          brandSkuCounts[brandId].count++;
        }
      });

      const brandsNode = Object.keys(brandSkuCounts).length > 0 ? (
        <div className="flex flex-wrap gap-2.5 items-center">
          {Object.values(brandSkuCounts).map((info) => {
            const resolvedName = getBrandName(info.brandId);
            const resolvedLogo = getBrandLogo(info.brandId);
            return (
              <span key={info.brandId} className="inline-flex items-center gap-1.5 font-bold text-zinc-700 bg-zinc-200/50 border border-zinc-300/40 rounded px-1.5 py-0.5 shadow-2xs">
                {info.shelfImage ? (
                  <button
                    type="button"
                    onClick={() => setSelectedImage(info.shelfImage)}
                    className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 border border-zinc-300 transition-colors cursor-pointer flex items-center justify-center focus:outline-none"
                    title="View Shelf Photo"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                ) : resolvedLogo ? (
                  <img 
                    src={resolvedLogo} 
                    alt={resolvedName} 
                    className="w-4 h-4 rounded-xs bg-white object-contain border border-zinc-200 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-4 h-4 rounded-xs bg-zinc-300 border border-zinc-400 flex-shrink-0 flex items-center justify-center text-[7px] font-black text-zinc-500">
                    {resolvedName.substring(0, 1).toUpperCase()}
                  </div>
                )}
                <span>{resolvedName} ({info.count})</span>
              </span>
            );
          })}
        </div>
      ) : (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
          store?.Status === "Store Closed" ? "bg-rose-100 text-rose-700 border border-rose-200" :
          store?.Status === "Not Carry" ? "bg-amber-100 text-amber-700 border border-amber-200" :
          store?.Status === "Carry" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
          "text-zinc-400 italic bg-zinc-100 border border-zinc-200"
        }`}>
          {store?.Status || "No Audited SKUs"}
        </span>
      );

      const brandsRawText = Object.keys(brandSkuCounts).length > 0 
        ? Object.values(brandSkuCounts).map(info => `${getBrandName(info.brandId)} (${info.count})`).join(", ")
        : (store?.Status || "No Audited SKUs");

      return {
        id: log.Timestamp + "_" + log["Retailer Stores ID"],
        Date: formatDate(log.Timestamp),
        "Retailer Name": retailerName,
        "Retailer Name_raw": retailerName,
        "Store Name": storeName,
        "Store Name_raw": storeName,
        Brands: brandsNode,
        Brands_raw: brandsRawText
      };
    });
  }, [productLogs, shelfLogs, stores, products, brands, getBrandLogo, getBrandName, parseTimestamp, getRetailerName]);

  const formatDateTime = React.useCallback((timestamp: any): string => {
    const date = parseTimestamp(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    const secs = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
  }, [parseTimestamp]);

  const selectedTaskLogs = React.useMemo(() => {
    if (!selectedTask || !selectedTask["Task Log"]) return [];
    try {
      const parsed = JSON.parse(selectedTask["Task Log"]);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }, [selectedTask]);

  const handleCompleteTask = async (task: any) => {
    showToast("Completing task...", "info");

    const previousTasks = [...tasks];
    const updated = tasks.map((t) =>
      String(t["Created Date"]) === String(task["Created Date"]) &&
      String(t["Stores ID"]) === String(task["Stores ID"])
        ? { ...t, "is Complete": "Done" }
        : t
    );

    setTasks(updated);
    localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(updated));

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Stores_Task_Assigned",
          action: "update",
          data: {
            "Created Date": Number(task["Created Date"]),
            "Stores ID": Number(task["Stores ID"]),
            "is Complete": "Done"
          }
        })
      });
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to complete task");

      fetchFreshData("Stores_Task_Assigned", false).then(val => setTasks(val));
      showToast("Task marked as Complete!", "success");
    } catch (err: any) {
      showToast("Failed to complete task: " + err.message + ". Reverting...", "error");
      setTasks(previousTasks);
      localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(previousTasks));
    }
  };

  const handleUpdateLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    showToast("Updating task log...", "info");

    const newLogEntry = {
      Action: newAction,
      Remark: newRemark.trim(),
      "Action by": newActionBy.trim(),
      Timestamp: Date.now()
    };

    let logList: any[] = [];
    if (selectedTask["Task Log"] && String(selectedTask["Task Log"]).trim()) {
      try {
        logList = JSON.parse(selectedTask["Task Log"]);
      } catch (err) {}
    }
    if (!Array.isArray(logList)) logList = [];
    logList.push(newLogEntry);

    const updatedLogString = JSON.stringify(logList);

    const previousTasks = [...tasks];
    const updated = tasks.map((t) =>
      String(t["Created Date"]) === String(selectedTask["Created Date"]) &&
      String(t["Stores ID"]) === String(selectedTask["Stores ID"])
        ? { ...t, "Task Log": updatedLogString, "Task Action": nextAction }
        : t
    );

    setTasks(updated);
    localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(updated));

    setIsUpdateLogOpen(false);
    setSelectedTask(null);

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Stores_Task_Assigned",
          action: "update",
          data: {
            "Created Date": Number(selectedTask["Created Date"]),
            "Stores ID": Number(selectedTask["Stores ID"]),
            "Task Log": updatedLogString,
            "Task Action": nextAction
          }
        })
      });
      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to update task");

      fetchFreshData("Stores_Task_Assigned", false).then(val => setTasks(val));
      showToast("Task log updated successfully!", "success");
    } catch (err: any) {
      showToast("Failed to update task log: " + err.message + ". Reverting...", "error");
      setTasks(previousTasks);
      localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(previousTasks));
    }
  };

  const pendingTaskQty = React.useMemo(() => {
    return tasks.filter(t => 
      String(t["Task Action"]).toLowerCase() === "visit" && 
      String(t["is Complete"]).toLowerCase() !== "done"
    ).length;
  }, [tasks]);

  const merchandiserTasks = React.useMemo(() => {
    const list = tasks.filter(t => String(t["Task Action"]).toLowerCase() === "visit");
    list.sort((a, b) => {
      const timeA = parseTimestamp(a["Created Date"]).getTime();
      const timeB = parseTimestamp(b["Created Date"]).getTime();
      return timeB - timeA;
    });

    return list.map((t) => {
      const store = stores.find(s => String(s.ID) === String(t["Stores ID"]));
      const storeName = store ? store["Display Name"] : `Store #${t["Stores ID"]}`;

      let logs: any[] = [];
      if (t["Task Log"] && String(t["Task Log"]).trim()) {
        try {
          logs = JSON.parse(t["Task Log"]);
        } catch (e) {}
      }

      let latestActionNode = <span className="text-zinc-400 italic text-[11px]">No logs</span>;
      if (Array.isArray(logs) && logs.length > 0) {
        const latest = logs[logs.length - 1];
        latestActionNode = (
          <div className="flex flex-col gap-0.5 text-xs text-zinc-700">
            <span className="font-semibold text-zinc-800">
              {latest.Action} by <span className="underline decoration-zinc-400 decoration-1">{latest["Action by"] || "System User"}</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {String(formatDateTime(latest.Timestamp))}
            </span>
          </div>
        );
      }

      const logCellNode = (
        <div className="flex items-center gap-3">
          {latestActionNode}
          {Array.isArray(logs) && logs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedTask(t);
                setIsHistoryOpen(true);
              }}
              className="px-2 py-1 rounded bg-zinc-200 hover:bg-zinc-300 border border-zinc-300 text-zinc-700 font-extrabold text-[10px] cursor-pointer focus:outline-none flex items-center gap-1 transition-colors"
              title="View Complete Log History"
            >
              <History size={12} className="stroke-[2.5]" />
              <span>{logs.length} logs</span>
            </button>
          )}
        </div>
      );

      const statusBadge = (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
          String(t["is Complete"]).toLowerCase() === "done"
            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
            : "bg-amber-100 text-amber-700 border border-amber-200"
        }`}>
          {t["is Complete"] || "Pending"}
        </span>
      );

      const actionButtons = (
        <div className="flex items-center gap-2">
          <CustomButton
            onClick={() => {
              setSelectedTask(t);
              setNewAction("Visit");
              setNewRemark("");
              setNewActionBy("");
              setNextAction(t["Task Action"] || "Visit");
              setIsUpdateLogOpen(true);
            }}
            variant="default"
          >
            Update Log
          </CustomButton>
          {String(t["is Complete"]).toLowerCase() !== "done" && (
            <CustomButton
              onClick={() => handleCompleteTask(t)}
              variant="dark"
            >
              Complete Task
            </CustomButton>
          )}
        </div>
      );

      return {
        id: t["Created Date"] + "_" + t["Stores ID"],
        "Created Date": formatDate(t["Created Date"]),
        "Store Name": storeName,
        "Task Action": String(t["Task Action"] || "Visit"),
        "Task Description": String(t["Task Description"] || ""),
        "Task Log": logCellNode,
        "is Complete": statusBadge,
        Actions: actionButtons
      };
    });
  }, [tasks, stores, getRetailerName, parseTimestamp, formatDateTime]);

  const taskColumns: Column[] = [
    { id: "Created Date", header: "Created Date", accessor: "Created Date" },
    { id: "Store Name", header: "Store Name", accessor: "Store Name" },
    { id: "Task Action", header: "Task Action", accessor: "Task Action" },
    { id: "Task Description", header: "Task Description", accessor: "Task Description" },
    { id: "Task Log", header: "Latest Log / History", accessor: "Task Log" },
    { id: "is Complete", header: "Status", accessor: "is Complete" },
    { id: "Actions", header: "Actions", accessor: "Actions" }
  ];

  const settingCalculation = React.useMemo(() => {
    // 1. Filter stores based on focus/avoid options
    const filtered = stores.filter(store => {
      const rName = getRetailerName(store);
      
      // Focus Retailers filter
      if (settingFocusRet.length > 0) {
        if (!settingFocusRet.includes(rName)) return false;
      }
      
      // Avoid Retailers filter
      if (settingAvoidRet.length > 0) {
        if (settingAvoidRet.includes(rName)) return false;
      }
      
      // Focus Status filter
      if (settingFocusStatus.length > 0) {
        const storeStatus = store.Status || "";
        if (!settingFocusStatus.includes(storeStatus)) return false;
      }
      
      // Focus Rank filter
      if (settingFocusRank.length > 0) {
        const storeRank = store["Store Rank"] || "";
        if (!settingFocusRank.includes(storeRank)) return false;
      }
      
      return true;
    });

    // 2. Determine Visited vs Pending status
    const frequencyThresholdMs = settingFreq * 24 * 60 * 60 * 1000;
    const nowTime = Date.now();
    
    const latestVisitsMap: Record<string, number> = {};
    productLogs.forEach(log => {
      const storeId = String(log["Retailer Stores ID"]);
      const ts = parseTimestamp(log.Timestamp).getTime();
      if (!latestVisitsMap[storeId] || ts > latestVisitsMap[storeId]) {
        latestVisitsMap[storeId] = ts;
      }
    });

    const storeStatusList = filtered.map(store => {
      const storeId = String(store.ID);
      const latestTs = latestVisitsMap[storeId] || 0;
      const hasVisited = latestTs > 0 && (nowTime - latestTs) <= frequencyThresholdMs;
      return {
        store,
        hasVisited,
        zone: store.Zones || "Unknown",
        retailer: getRetailerName(store)
      };
    });

    // Grouping by Zone
    const zoneGroup: Record<string, { total: number; visited: number; pending: number }> = {};
    // Grouping by Retailer
    const retailerGroup: Record<string, { total: number; visited: number; pending: number }> = {};

    let totalActive = storeStatusList.length;
    let totalVisited = 0;
    let totalPending = 0;

    storeStatusList.forEach(item => {
      if (item.hasVisited) {
        totalVisited++;
      } else {
        totalPending++;
      }

      // Zone grouping
      if (!zoneGroup[item.zone]) {
        zoneGroup[item.zone] = { total: 0, visited: 0, pending: 0 };
      }
      zoneGroup[item.zone].total++;
      if (item.hasVisited) zoneGroup[item.zone].visited++;
      else zoneGroup[item.zone].pending++;

      // Retailer grouping
      if (!retailerGroup[item.retailer]) {
        retailerGroup[item.retailer] = { total: 0, visited: 0, pending: 0 };
      }
      retailerGroup[item.retailer].total++;
      if (item.hasVisited) retailerGroup[item.retailer].visited++;
      else retailerGroup[item.retailer].pending++;
    });

    return {
      totalActive,
      totalVisited,
      totalPending,
      byZone: Object.entries(zoneGroup).map(([name, counts]) => ({ name, ...counts })),
      byRetailer: Object.entries(retailerGroup).map(([name, counts]) => ({ name, ...counts }))
    };
  }, [stores, productLogs, settingFreq, settingFocusRet, settingFocusStatus, settingFocusRank, settingAvoidRet, getRetailerName, parseTimestamp]);

  const reportColumns: Column[] = [
    { id: "Date", header: "Visit Date", accessor: "Date" },
    { id: "Retailer Name", header: "Retailer", accessor: "Retailer Name" },
    { id: "Store Name", header: "Store", accessor: "Store Name" },
    { id: "Brands", header: "Brands Carry", accessor: "Brands" }
  ];

  // Users Tab handlers
  const handleEditModeChange = (edit: boolean) => {
    setIsEditMode(edit);
    if (edit) {
      fetchFreshData("Merch_Users", true).then((u) => {
        if (u) setMerchUsers(u);
      });
    }
  };

  const handleEditRow = (row: any) => {
    setEditingMerchUser({ ...row });
  };

  const handleAddNew = () => {
    setEditingMerchUser(null);
    // Trigger open creation mode
    setEditingMerchUser({ ID: "", Name: "", PIN: "", isNew: true });
  };

  const handleSaveMerchUser = async (cleanData: any, isNew: boolean) => {
    const previousUsers = [...merchUsers];
    setEditingMerchUser(null);

    let updatedList;
    if (isNew) {
      updatedList = [...merchUsers, cleanData];
    } else {
      updatedList = merchUsers.map((item) =>
        String(item.ID) === String(cleanData.ID) ? { ...item, ...cleanData } : item
      );
    }
    setMerchUsers(updatedList);
    localStorage.setItem("Merch_Users_data", JSON.stringify(updatedList));

    showToast("Saving merchandiser profile...", "info");

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Merch_Users",
          action: isNew ? "insert" : "update",
          data: cleanData
        })
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to save merchandiser");

      fetchFreshData("Merch_Users", false);
      showToast("Merchandiser profile synced successfully!", "success");
    } catch (err: any) {
      showToast("Sync failed: " + err.message + ". Reverting changes...", "error");
      setMerchUsers(previousUsers);
      localStorage.setItem("Merch_Users_data", JSON.stringify(previousUsers));
    }
  };

  const handleDeleteMerchUser = async (rowId: string) => {
    const targetItem = merchUsers.find(item => String(item.ID) === String(rowId));
    if (!targetItem) return;

    const previousUsers = [...merchUsers];
    showToast("Deleting merchandiser in background...", "info");

    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheet: "Merch_Users",
          action: "delete",
          data: {
            ID: targetItem.ID
          }
        })
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to delete merchandiser");

      const updatedList = merchUsers.filter(item => String(item.ID) !== String(targetItem.ID));
      setMerchUsers(updatedList);
      localStorage.setItem("Merch_Users_data", JSON.stringify(updatedList));

      fetchFreshData("Merch_Users", false);
      showToast("Merchandiser deleted successfully!", "success");
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
      setMerchUsers(previousUsers);
      localStorage.setItem("Merch_Users_data", JSON.stringify(previousUsers));
    }
  };

  const merchUserColumns: Column[] = [
    { id: "ID", header: "Merch ID", accessor: "ID" },
    { id: "Name", header: "Name", accessor: "Name" },
    { id: "Email", header: "Email", accessor: "Email" },
    { id: "Phone", header: "Phone", accessor: "Phone" },
    { id: "PIN", header: "PIN", accessor: "PIN" }
  ];

  return (
    <div className="flex flex-col gap-5 font-primary h-full relative">
      <NavigationTabs 
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={(id: any) => {
          setActiveTab(id);
          setIsEditMode(false);
        }}
        titleSuffix="Record"
        action={
          activeTab === "performance" ? (
            <CustomButton onClick={() => setIsPrintModalOpen(true)} variant="default">
              <Printer size={14} className="stroke-[2.5]" />
              <span>Print to PDF</span>
            </CustomButton>
          ) : undefined
        }
      />

      {/* Tabs Content */}
      <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {activeTab === "performance" && (
          <div className="flex flex-col gap-6 animate-tableFadeInOnly">
            {/* Summary metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded p-5 flex items-center justify-between shadow-xs hover:scale-[1.01] hover:shadow-sm transition-all duration-200">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Visits Today</span>
                  <span className="text-3xl font-black text-zinc-950 mt-1">{performanceStats.totals.today}</span>
                </div>
                <div className="h-10 w-10 bg-[#E8F0FE] rounded flex items-center justify-center text-[#0B57D0] border border-transparent">
                  <Calendar size={18} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded p-5 flex items-center justify-between shadow-xs hover:scale-[1.01] hover:shadow-sm transition-all duration-200">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Visits Selected Week</span>
                  <span className="text-3xl font-black text-zinc-950 mt-0.5">{performanceStats.totals.week}</span>
                  <div className="flex items-center gap-1 mt-1 bg-slate-100 rounded px-1.5 py-0.5 w-fit">
                    <button 
                      type="button" 
                      onClick={() => setWeekOffset(prev => Math.max(prev - 1, -52))}
                      disabled={weekOffset === -52}
                      className="p-0.5 rounded hover:bg-slate-200 text-zinc-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed focus:outline-none"
                      title="Previous Week"
                    >
                      <ChevronLeft size={12} className="stroke-[2.5]" />
                    </button>
                    <span className="text-[9px] font-extrabold text-zinc-700 min-w-[75px] text-center select-none tracking-tight">
                      {formatWeekRange(getWeekRange(weekOffset).monday, getWeekRange(weekOffset).sunday)}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setWeekOffset(prev => Math.min(prev + 1, 0))}
                      disabled={weekOffset === 0}
                      className="p-0.5 rounded hover:bg-slate-200 text-zinc-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed focus:outline-none"
                      title="Next Week"
                    >
                      <ChevronRight size={12} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>
                <div className="h-10 w-10 bg-[#E6F4EA] rounded flex items-center justify-center text-[#137333] border border-transparent">
                  <BarChart3 size={18} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded p-5 flex items-center justify-between shadow-xs hover:scale-[1.01] hover:shadow-sm transition-all duration-200">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Visits Selected Month</span>
                  <span className="text-3xl font-black text-zinc-950 mt-0.5">{performanceStats.totals.month}</span>
                  <div className="flex items-center gap-1 mt-1 bg-slate-100 rounded px-1.5 py-0.5 w-fit">
                    <button 
                      type="button" 
                      onClick={() => setMonthOffset(prev => Math.max(prev - 1, -12))}
                      disabled={monthOffset === -12}
                      className="p-0.5 rounded hover:bg-slate-200 text-zinc-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed focus:outline-none"
                      title="Previous Month"
                    >
                      <ChevronLeft size={12} className="stroke-[2.5]" />
                    </button>
                    <span className="text-[9px] font-extrabold text-zinc-700 min-w-[75px] text-center select-none tracking-tight">
                      {formatMonthName(getMonthRange(monthOffset).start)}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setMonthOffset(prev => Math.min(prev + 1, 0))}
                      disabled={monthOffset === 0}
                      className="p-0.5 rounded hover:bg-slate-200 text-zinc-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed focus:outline-none"
                      title="Next Month"
                    >
                      <ChevronRight size={12} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>
                <div className="h-10 w-10 bg-[#FEF7E0] rounded flex items-center justify-center text-[#B06000] border border-transparent">
                  <Calendar size={18} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded p-5 flex items-center justify-between shadow-xs hover:scale-[1.01] hover:shadow-sm transition-all duration-200">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pending Tasks</span>
                  <span className="text-3xl font-black text-zinc-950 mt-1">{pendingTaskQty}</span>
                </div>
                <div className="h-10 w-10 bg-[#FCE8E6] rounded flex items-center justify-center text-[#C5221F] border border-transparent">
                  <ClipboardCheck size={18} className="stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Main breakdown grids */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Retailer Breakdown table */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                  <UsersIcon size={14} className="text-zinc-600" />
                  <span className="font-bold text-xs text-zinc-700 uppercase tracking-wider">Visits per Retailer</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50 font-bold text-zinc-600">
                        <th className="py-2.5 px-4">Retailer</th>
                        <th className="py-2.5 px-4 text-center">Today</th>
                        <th className="py-2.5 px-4 text-center">Week</th>
                        <th className="py-2.5 px-4 text-center">Month</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {performanceStats.retailers.length > 0 ? (
                        performanceStats.retailers.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-zinc-800">{r.name}</td>
                            <td className="py-2.5 px-4 text-center font-bold text-zinc-700">{r.today}</td>
                            <td className="py-2.5 px-4 text-center font-bold text-zinc-700">{r.week}</td>
                            <td className="py-2.5 px-4 text-center font-bold text-zinc-900">{r.month}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 px-4 text-center text-zinc-400 italic">
                            No visits recorded in the last 365 days.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Grouped Bar Chart converted to Line Chart */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded p-4 shadow-xs relative flex flex-col gap-3 min-h-[360px]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-zinc-600" />
                    <span className="font-bold text-xs text-zinc-700 uppercase tracking-wider">12-Month Performance Comparison</span>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-2 text-[9px] font-bold text-zinc-600">
                    <div className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 bg-[#6366f1] inline-block" />
                      <span>Total Store Visits</span>
                    </div>
                  </div>
                </div>

                {/* SVG Render Container */}
                <div className="flex-1 w-full relative">
                  {fetching ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400 italic">
                      Loading graph metrics...
                    </div>
                  ) : (
                    <svg viewBox="0 0 700 280" className="w-full h-full select-none overflow-visible">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                        const y = 40 + (200 * (1 - p));
                        const val = Math.round(graphData.maxVal * p);
                        return (
                          <g key={idx} className="opacity-45">
                            <line x1="45" y1={y} x2="680" y2={y} stroke="#d4d4d8" strokeWidth="1" strokeDasharray="3,3" />
                            <text x="35" y={y + 4} textAnchor="end" className="fill-zinc-500 font-mono text-[9px] font-bold">{val}</text>
                          </g>
                        );
                      })}

                      {/* Render Line & Area if data exists */}
                      {graphData.data.length > 0 && (() => {
                        const points = graphData.data.map((d, i) => {
                          const colWidth = 635 / 11;
                          const px = 45 + (i * colWidth);
                          const py = 240 - (graphData.maxVal > 0 ? (d.totalVisits / graphData.maxVal) * 200 : 0);
                          return { px, py, label: d.label, val: d.totalVisits };
                        });

                        const pathD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.px} ${pt.py}`).join(' ');
                        const areaD = `${pathD} L 680 240 L 45 240 Z`;

                        return (
                          <g>
                            {/* Area under the line */}
                            <path d={areaD} fill="url(#chartGradient)" />

                            {/* Main Stroke line */}
                            <path 
                              d={pathD} 
                              fill="none" 
                              stroke="#6366f1" 
                              strokeWidth="3" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />

                            {/* Nodes / Hover targets */}
                            {points.map((pt, i) => (
                              <g key={i}>
                                {/* Invisible hover circle */}
                                <circle
                                  cx={pt.px}
                                  cy={pt.py}
                                  r={12}
                                  fill="transparent"
                                  className="cursor-pointer"
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const containerRect = e.currentTarget.parentElement?.parentElement?.parentElement?.getBoundingClientRect();
                                    if (containerRect) {
                                      setHoveredPoint({
                                        month: pt.label,
                                        val: pt.val,
                                        x: pt.px,
                                        y: pt.py - 8,
                                      });
                                    }
                                  }}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                />
                                {/* Small white circle with indigo stroke */}
                                <circle
                                  cx={pt.px}
                                  cy={pt.py}
                                  r={4.5}
                                  fill="#ffffff"
                                  stroke="#6366f1"
                                  strokeWidth={2.5}
                                  className="pointer-events-none"
                                />
                              </g>
                            ))}
                          </g>
                        );
                      })()}

                      {/* X and Y lines */}
                      <line x1="45" y1="240" x2="680" y2="240" stroke="#a1a1aa" strokeWidth="1.5" />
                      
                      {/* X-axis Month labels */}
                      {graphData.data.map((m, mIdx) => {
                        const colWidth = 635 / 11;
                        const px = 45 + (mIdx * colWidth);
                        return (
                          <text key={mIdx} x={px} y="260" textAnchor="middle" className="fill-zinc-500 font-semibold text-[9px]">
                            {m.label}
                          </text>
                        );
                      })}
                    </svg>
                  )}

                  {/* Tooltip Overlay */}
                  {hoveredPoint && (
                    <div 
                      className="absolute bg-zinc-950/95 text-white border border-zinc-800 rounded px-2.5 py-1.5 shadow-md text-[10px] font-primary z-30 pointer-events-none flex flex-col gap-0.5 -translate-x-1/2 -translate-y-full"
                      style={{ left: hoveredPoint.x, top: hoveredPoint.y }}
                    >
                      <span className="font-extrabold border-b border-zinc-800 pb-0.5 mb-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
                        {hoveredPoint.month}
                      </span>
                      <span className="font-medium">
                        Total Visits: <span className="font-bold text-indigo-400">{hoveredPoint.val}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "report" && (
          <div className="w-full flex flex-col h-full animate-tableFadeInOnly">
            <DataTable
              columns={reportColumns}
              data={reportData}
              userRole="viewer"
              title="Store Visits History (60 Days)"
              fetching={fetching}
              height="h-[calc(100vh-220px)]"
            />
          </div>
        )}

        {activeTab === "task" && (
          <div className="w-full flex flex-col h-full animate-tableFadeInOnly">
            <DataTable
              columns={taskColumns}
              data={merchandiserTasks}
              userRole="viewer"
              title="Merchandiser Specific Tasks (Action: Visit)"
              fetching={fetching}
              height="h-[calc(100vh-220px)]"
            />
          </div>
        )}

        {activeTab === "setting" && (
          <div className="bg-white border border-slate-200 rounded p-6 shadow-xs max-w-6xl mx-auto animate-tableFadeInOnly grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column - Setting Values */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Settings2 size={16} className="text-zinc-700" />
                <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-wider">Deploy System Configuration</h3>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Visit Frequency (Days)</label>
                  <input
                    type="number"
                    disabled={isViewer}
                    value={settingFreq}
                    onChange={(e) => setSettingFreq(Math.max(Number(e.target.value), 1))}
                    placeholder="e.g. 14"
                    className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-3 py-2 text-zinc-900 focus:outline-none focus:border-blue-400 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Focus Retailers</label>
                  <TagInput
                    tags={settingFocusRet}
                    onChange={setSettingFocusRet}
                    placeholder={isViewer ? "No focus retailers set" : "Type retailer name and press Enter..."}
                    suggestions={retailerSuggestions}
                    id="focus_retailers"
                    disabled={isViewer}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Focus Status Stores</label>
                  <TagInput
                    tags={settingFocusStatus}
                    onChange={setSettingFocusStatus}
                    placeholder={isViewer ? "No focus status stores set" : "Type carry status and press Enter..."}
                    suggestions={statusSuggestions}
                    id="focus_status"
                    disabled={isViewer}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Focus Rank Stores</label>
                  <TagInput
                    tags={settingFocusRank}
                    onChange={setSettingFocusRank}
                    placeholder={isViewer ? "No focus rank stores set" : "Type store ranking level and press Enter..."}
                    suggestions={rankSuggestions}
                    id="focus_rank"
                    disabled={isViewer}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Avoid Retailers</label>
                  <TagInput
                    tags={settingAvoidRet}
                    onChange={setSettingAvoidRet}
                    placeholder={isViewer ? "No avoided retailers set" : "Type retailer to exclude and press Enter..."}
                    suggestions={retailerSuggestions}
                    id="avoid_retailers"
                    disabled={isViewer}
                  />
                </div>
              </div>

              {!isViewer && (
                <div className="flex justify-end border-t border-zinc-300 pt-4 mt-2">
                  <CustomButton
                    variant="dark"
                    onClick={handleDeploySettings}
                  >
                    Deploy Configuration
                  </CustomButton>
                </div>
              )}
            </div>

            {/* Right Column - Calculations */}
            <div className="lg:col-span-7 bg-[#F8F9FC] border border-slate-200 rounded p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#0B57D0]" strokeWidth={2} />
                  <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-wider">Live Metrics Preview</h3>
                </div>
                <span className="text-[10px] font-bold text-[#0B57D0] bg-[#E8F0FE] px-2 py-0.5 rounded select-none">
                  Simulated Impact
                </span>
              </div>

              {/* Summary counters */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded p-3.5 flex flex-col gap-0.5 shadow-3xs">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider text-center lg:text-left">Active Stores</span>
                  <span className="text-xl font-black text-zinc-950 text-center lg:text-left">{settingCalculation.totalActive}</span>
                </div>
                <div className="bg-white border border-slate-200 rounded p-3.5 flex flex-col gap-0.5 shadow-3xs">
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider text-center lg:text-left">Have Visited</span>
                  <span className="text-xl font-black text-emerald-700 text-center lg:text-left">{settingCalculation.totalVisited}</span>
                </div>
                <div className="bg-white border border-slate-200 rounded p-3.5 flex flex-col gap-0.5 shadow-3xs">
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider text-center lg:text-left">Pending Visit</span>
                  <span className="text-xl font-black text-amber-700 text-center lg:text-left">{settingCalculation.totalPending}</span>
                </div>
              </div>
              {/* Switcher & Table */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Group breakdown</span>
                  
                  {/* Switch group button group */}
                  <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCalcGroupBy("zone")}
                      className={`px-3 py-1 text-[9px] font-bold rounded transition-all cursor-pointer ${
                        calcGroupBy === "zone"
                          ? "bg-white text-zinc-950 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      By Zones
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcGroupBy("retailer")}
                      className={`px-3 py-1 text-[9px] font-bold rounded transition-all cursor-pointer ${
                        calcGroupBy === "retailer"
                          ? "bg-white text-zinc-950 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      By Retailers
                    </button>
                  </div>
                </div>
 
                {/* Table Breakdown */}
                <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-3xs max-h-[220px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 font-bold text-zinc-600">
                        <th className="py-2 px-3">{calcGroupBy === "zone" ? "Store Zone" : "Retailer Name"}</th>
                        <th className="py-2 px-3 text-center">Total</th>
                        <th className="py-2 px-3 text-center text-emerald-700 font-bold">Visited</th>
                        <th className="py-2 px-3 text-center text-amber-700 font-bold">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {calcGroupBy === "zone" ? (
                        settingCalculation.byZone.length > 0 ? (
                          settingCalculation.byZone.map((z, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3 font-semibold text-zinc-800">{z.name}</td>
                              <td className="py-2 px-3 text-center font-bold text-zinc-700">{z.total}</td>
                              <td className="py-2 px-3 text-center font-bold text-emerald-600">{z.visited}</td>
                              <td className="py-2 px-3 text-center font-bold text-amber-600">{z.pending}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-4 px-3 text-center text-zinc-400 italic">
                              No data matching filters.
                            </td>
                          </tr>
                        )
                      ) : (
                        settingCalculation.byRetailer.length > 0 ? (
                          settingCalculation.byRetailer.map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3 font-semibold text-zinc-800">{r.name}</td>
                              <td className="py-2 px-3 text-center font-bold text-zinc-700">{r.total}</td>
                              <td className="py-2 px-3 text-center font-bold text-emerald-600">{r.visited}</td>
                              <td className="py-2 px-3 text-center font-bold text-amber-600">{r.pending}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-4 px-3 text-center text-zinc-400 italic">
                              No data matching filters.
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="w-full flex flex-col h-full animate-tableFadeInOnly">
            <DataTable
              columns={merchUserColumns}
              data={merchUsers}
              userRole={userRole}
              title="Merchandisers Security Registry"
              fetching={fetching}
              onEditModeChange={handleEditModeChange}
              onEditRow={handleEditRow}
              onAddNew={handleAddNew}
              onDeleteRow={handleDeleteMerchUser}
              addNewText="Add Merchandiser"
              height="h-[calc(100vh-220px)]"
            />
          </div>
        )}
      </div>

      {/* Merchandiser User Edit overlay modal */}
      {editingMerchUser && (
        <MerchUserEditForm
          user={editingMerchUser.isNew ? null : editingMerchUser}
          existingUsers={merchUsers}
          onSave={handleSaveMerchUser}
          onCancel={() => setEditingMerchUser(null)}
        />
      )}

      {/* Image Preview Modal Popup */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-tableFadeInOnly p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-3xl max-h-[85vh] bg-[#EEEEEE] border border-zinc-300 rounded-lg shadow-xl overflow-hidden flex flex-col animate-modalSlideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="h-10 flex items-center justify-between px-4 bg-[#E5E5E5] border-b border-zinc-300">
              <span className="font-bold text-xs text-zinc-700 uppercase tracking-wider select-none">
                Shelf Image Preview
              </span>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-full hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer focus:outline-none"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Image Container */}
            <div className="p-6 flex items-center justify-center bg-white overflow-auto max-h-[calc(85vh-40px)]">
              <img 
                src={selectedImage} 
                alt="Shelf Preview" 
                className="max-w-full max-h-[65vh] object-contain rounded border border-zinc-200 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Failed+to+Load+Image";
                }}
              />
            </div>
            
            {/* Modal Footer with URL link */}
            <div className="bg-[#E5E5E5] border-t border-zinc-300 px-4 py-2 flex justify-between items-center text-[10px] text-zinc-500 font-mono select-none">
              <span className="truncate max-w-[70%]">{selectedImage}</span>
              <a 
                href={selectedImage} 
                target="_blank" 
                rel="noreferrer" 
                className="text-zinc-600 hover:text-zinc-950 font-bold hover:underline cursor-pointer"
              >
                Open Original ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Update Task Log */}
      {isUpdateLogOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-tableFadeInOnly">
          <form
            onSubmit={handleUpdateLogSubmit}
            className="bg-[#EEEEEE] border border-zinc-300 rounded-lg shadow-lg max-w-md w-full p-6 animate-modalSlideUp flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-300 pb-2">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-zinc-700" />
                <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-wider">Append Action Log</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUpdateLogOpen(false);
                  setSelectedTask(null);
                }}
                className="p-1 rounded hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 focus:outline-none"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">Target Store</span>
                <span className="text-xs font-extrabold text-zinc-800">
                  {stores.find(s => String(s.ID) === String(selectedTask["Stores ID"]))?.["Display Name"] || `Store #${selectedTask["Stores ID"]}`}
                </span>
                <span className="text-[10px] text-zinc-500 italic mt-0.5">
                  &ldquo;{selectedTask["Task Description"]}&rdquo;
                </span>
              </div>

              <div className="flex flex-col gap-1.5 border-t border-zinc-300/60 pt-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Perform Action</label>
                <select
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value as any)}
                  className="w-full bg-[#E5E5E5] border border-zinc-300 rounded px-3 py-2 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  required
                >
                  <option value="Visit">Visit</option>
                  <option value="Call">Call</option>
                  <option value="Check Last Order">Check Last Order</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Next Action Required</label>
                <select
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value as any)}
                  className="w-full bg-[#E5E5E5] border border-zinc-300 rounded px-3 py-2 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                  required
                >
                  <option value="Visit">Visit</option>
                  <option value="Call">Call</option>
                  <option value="Check Last Order">Check Last Order</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Action Remark</label>
                <textarea
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder="E.g., Visit made to verify inventory. Checked displays and stock."
                  rows={3}
                  className="w-full bg-[#E5E5E5] border border-zinc-300 rounded px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none font-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Action Logged By</label>
                <input
                  type="text"
                  value={newActionBy}
                  onChange={(e) => setNewActionBy(e.target.value)}
                  className="w-full bg-[#E5E5E5] border border-zinc-300 rounded px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
                  placeholder="Your Name"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-zinc-300 pt-3 mt-1">
              <CustomButton
                type="button"
                onClick={() => {
                  setIsUpdateLogOpen(false);
                  setSelectedTask(null);
                }}
                className="bg-zinc-200 border-zinc-300 text-zinc-700 hover:bg-zinc-300 text-xs font-bold font-primary rounded"
              >
                Cancel
              </CustomButton>
              <CustomButton
                type="submit"
                variant="dark"
              >
                Log Action
              </CustomButton>
            </div>
          </form>
        </div>
      )}

      {/* SIDEBAR: Log History Timeline View */}
      {isHistoryOpen && selectedTask && (
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
          
          {/* Backdrop (blur black) */}
          <div 
            onClick={() => {
              setIsHistoryOpen(false);
              setSelectedTask(null);
            }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-backdropFadeIn"
          />

          {/* Sidebar Panel */}
          <div 
            className="relative w-full max-w-md h-full bg-[#EEEEEE] border-l border-zinc-300 shadow-2xl flex flex-col z-10 animate-sidebarSlideIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-300 p-6 flex-shrink-0">
              <div className="flex items-center gap-2">
                <History size={16} className="text-zinc-700" />
                <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-wider">Log History Timeline</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsHistoryOpen(false);
                  setSelectedTask(null);
                }}
                className="p-1 rounded hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 focus:outline-none"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Task Info Context */}
            <div className="mx-6 my-4 flex flex-col gap-1 bg-zinc-200/50 border border-zinc-300/50 rounded p-3 text-xs text-zinc-700 flex-shrink-0 font-primary">
              <span className="font-bold text-zinc-800">
                Store: {stores.find(s => String(s.ID) === String(selectedTask["Stores ID"]))?.["Display Name"] || `Store #${selectedTask["Stores ID"]}`}
              </span>
              <p className="text-zinc-500 italic mt-0.5">&ldquo;{selectedTask["Task Description"]}&rdquo;</p>
              <span className="text-[10px] text-zinc-400 font-mono mt-1">
                Assigned: {String(formatDateTime(selectedTask["Created Date"]))}
              </span>
            </div>

            {/* Timeline scroll container */}
            <div className="flex-1 overflow-y-auto px-6 pr-4 pb-6 flex flex-col gap-5 relative pl-10">
              {/* Vertical line offset to align with icon dot inside the timeline */}
              <div className="absolute left-[33px] top-2 bottom-6 w-0.5 bg-zinc-300" />

              {selectedTaskLogs.length > 0 ? (
                selectedTaskLogs.map((log: any, idx: number) => {
                  const actionColor =
                    log.Action === "Check Last Order" ? "bg-indigo-500 text-white border-indigo-600" :
                    log.Action === "Visit" ? "bg-emerald-500 text-white border-emerald-600" :
                    "bg-amber-500 text-white border-amber-600";

                  return (
                    <div key={idx} className="relative flex gap-4 text-xs font-primary">
                      {/* Timeline icon dot */}
                      <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center border font-black text-[8px] flex-shrink-0 shadow-2xs ${actionColor}`}>
                        {log.Action.substring(0, 1).toUpperCase()}
                      </div>

                      {/* Timeline details */}
                      <div className="flex flex-col gap-1 bg-[#E5E5E5]/40 border border-zinc-300/30 rounded-lg p-3 w-full shadow-2xs hover:bg-[#E5E5E5]/60 transition-colors">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-extrabold text-zinc-800 uppercase tracking-wide text-[10px]">
                            {log.Action}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-mono">
                            {String(formatDateTime(log.Timestamp))}
                          </span>
                        </div>
                        <p className="text-zinc-600 text-xs italic font-medium leading-relaxed">
                          &ldquo;{log.Remark || "No remark logged"}&rdquo;
                        </p>
                        <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold border-t border-zinc-300/20 pt-1.5 mt-1">
                          <UserCheck size={10} className="text-zinc-400" />
                          <span>Action by: <span className="text-zinc-700 underline decoration-zinc-400/80">{log["Action by"] || "System User"}</span></span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-zinc-400 italic">
                  No log entries found.
                </div>
              )}
            </div>

            {/* Bottom Actions inside Sidebar */}
            <div className="border-t border-zinc-300 p-6 bg-zinc-100/50 flex items-center justify-between gap-3 flex-shrink-0">
              <CustomButton
                type="button"
                onClick={() => {
                  setIsHistoryOpen(false);
                  setSelectedTask(null);
                }}
                className="bg-zinc-200 border border-zinc-300 text-zinc-700 hover:bg-zinc-300 text-xs font-bold w-1/2 flex justify-center py-2 rounded"
              >
                Close
              </CustomButton>
              <CustomButton
                type="button"
                onClick={() => {
                  setNewAction("Visit");
                  setNewRemark("");
                  setNewActionBy("");
                  setNextAction(selectedTask["Task Action"] || "Visit");
                  setIsUpdateLogOpen(true);
                  setIsHistoryOpen(false);
                }}
                className="bg-zinc-800 text-white hover:bg-zinc-950 text-xs font-bold w-1/2 flex justify-center py-2 rounded"
                variant="dark"
              >
                Update Task
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* Print Performance Report Dialog Modal */}
      {isPrintModalOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn"
          onClick={() => setIsPrintModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#EEEEEE] border border-zinc-300 rounded-lg shadow-xl overflow-hidden animate-modalSlideUp font-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="h-10 flex items-center justify-between px-4 bg-[#E5E5E5] border-b border-zinc-300 select-none">
              <span className="font-bold text-xs text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <Printer size={13} className="text-zinc-600" />
                Print Performance Report
              </span>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1 rounded-full hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex flex-col gap-4">
              {/* Report Type selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Report Frequency Type</label>
                <div className="flex bg-zinc-200 p-0.5 rounded border border-zinc-300/60">
                  <button
                    type="button"
                    onClick={() => setPrintReportType("weekly")}
                    className={`flex-1 py-2 text-xs font-bold rounded transition-all cursor-pointer ${
                      printReportType === "weekly"
                        ? "bg-[#EEEEEE] text-zinc-950 shadow-3xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    Weekly Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintReportType("monthly")}
                    className={`flex-1 py-2 text-xs font-bold rounded transition-all cursor-pointer ${
                      printReportType === "monthly"
                        ? "bg-[#EEEEEE] text-zinc-950 shadow-3xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    Monthly Report
                  </button>
                </div>
              </div>

              {/* Dynamic selector based on report type */}
              {printReportType === "weekly" ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select Week Range</label>
                  <select
                    value={selectedPrintWeekIndex}
                    onChange={(e) => setSelectedPrintWeekIndex(Number(e.target.value))}
                    className="w-full text-xs bg-[#EEEEEE] border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-400 font-semibold cursor-pointer"
                  >
                    {weekOptions.map((opt, index) => (
                      <option key={index} value={index}>
                        {opt.label} {index === 0 ? "(Current Week)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select Month</label>
                  <select
                    value={selectedPrintMonthIndex}
                    onChange={(e) => setSelectedPrintMonthIndex(Number(e.target.value))}
                    className="w-full text-xs bg-[#EEEEEE] border border-zinc-300 rounded-lg px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-400 font-semibold cursor-pointer"
                  >
                    {monthOptions.map((opt, index) => (
                      <option key={index} value={index}>
                        {opt.label} {index === 0 ? "(Current Month)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#E5E5E5] border-t border-zinc-300 px-4 py-3 flex justify-end gap-2.5">
              <CustomButton
                variant="default"
                onClick={() => setIsPrintModalOpen(false)}
              >
                Cancel
              </CustomButton>
              <CustomButton
                variant="dark"
                onClick={handlePrintPDF}
              >
                <Printer size={13} className="stroke-[2.5]" strokeWidth={2.5} />
                Generate PDF
              </CustomButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
