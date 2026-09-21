"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { NavigationTabs } from "../navigation-tabs";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";
import { jsPDF } from "jspdf";
import { 
  X, 
  Calendar, 
  BarChart3, 
  Settings2, 
  Users as UsersIcon, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Clock, 
  History, 
  UserCheck, 
  ClipboardCheck, 
  MapPin, 
  Navigation, 
  Layers, 
  Loader2,
  CheckCircle2,
  Store as StoreIcon
} from "lucide-react";
import { UserProfile } from "@/lib/api";
import { canEditModule } from "@/lib/permissions";

// Merchandiser vibrant distinct color palette
const MERCH_COLOR_PALETTE = [
  "#0B57D0", // Royal Blue
  "#059669", // Emerald Green
  "#7C3AED", // Vibrant Purple
  "#D97706", // Deep Amber
  "#DB2777", // Rose Pink
  "#0284C7", // Cyan / Sky Blue
  "#4F46E5", // Indigo
  "#0D9488", // Teal
  "#EA580C"  // Coral Orange
];

// Singapore coordinate prefix mapping helper
function getSingaporeLatLng(poscode: string): { lat: number; lng: number } {
  let clean = String(poscode || "").trim();
  if (!clean) return { lat: 1.3521, lng: 103.8198 };
  
  if (/^\d+$/.test(clean)) {
    clean = clean.padStart(6, '0');
  }
  
  if (clean.length < 2) return { lat: 1.3521, lng: 103.8198 };
  const prefix = clean.substring(0, 2);
  const mapping: Record<string, { lat: number; lng: number }> = {
    "01": { lat: 1.277, lng: 103.852 }, "02": { lat: 1.277, lng: 103.852 }, "03": { lat: 1.277, lng: 103.852 },
    "04": { lat: 1.277, lng: 103.852 }, "05": { lat: 1.277, lng: 103.852 }, "06": { lat: 1.277, lng: 103.852 },
    "07": { lat: 1.274, lng: 103.843 }, "08": { lat: 1.274, lng: 103.843 }, "09": { lat: 1.265, lng: 103.824 },
    "10": { lat: 1.265, lng: 103.824 }, "11": { lat: 1.288, lng: 103.805 }, "12": { lat: 1.288, lng: 103.805 },
    "13": { lat: 1.288, lng: 103.805 }, "14": { lat: 1.293, lng: 103.812 }, "15": { lat: 1.293, lng: 103.812 },
    "16": { lat: 1.293, lng: 103.812 }, "17": { lat: 1.292, lng: 103.849 }, "18": { lat: 1.298, lng: 103.855 },
    "19": { lat: 1.303, lng: 103.860 }, "20": { lat: 1.309, lng: 103.858 }, "21": { lat: 1.314, lng: 103.854 },
    "22": { lat: 1.301, lng: 103.838 }, "23": { lat: 1.301, lng: 103.838 }, "24": { lat: 1.305, lng: 103.825 },
    "25": { lat: 1.315, lng: 103.818 }, "26": { lat: 1.325, lng: 103.812 }, "27": { lat: 1.318, lng: 103.798 },
    "28": { lat: 1.355, lng: 103.835 }, "29": { lat: 1.332, lng: 103.838 }, "30": { lat: 1.320, lng: 103.842 },
    "31": { lat: 1.334, lng: 103.850 }, "32": { lat: 1.325, lng: 103.855 }, "33": { lat: 1.320, lng: 103.865 },
    "34": { lat: 1.328, lng: 103.875 }, "35": { lat: 1.335, lng: 103.870 }, "36": { lat: 1.340, lng: 103.880 },
    "37": { lat: 1.345, lng: 103.885 }, "38": { lat: 1.312, lng: 103.882 }, "39": { lat: 1.305, lng: 103.890 },
    "40": { lat: 1.318, lng: 103.895 }, "41": { lat: 1.325, lng: 103.905 }, "42": { lat: 1.310, lng: 103.915 },
    "43": { lat: 1.305, lng: 103.925 }, "44": { lat: 1.308, lng: 103.935 }, "45": { lat: 1.315, lng: 103.945 },
    "46": { lat: 1.330, lng: 103.940 }, "47": { lat: 1.335, lng: 103.930 }, "48": { lat: 1.340, lng: 103.950 },
    "49": { lat: 1.350, lng: 103.970 }, "50": { lat: 1.365, lng: 103.985 }, "51": { lat: 1.370, lng: 103.950 },
    "52": { lat: 1.355, lng: 103.945 }, "53": { lat: 1.360, lng: 103.890 }, "54": { lat: 1.385, lng: 103.895 },
    "55": { lat: 1.365, lng: 103.870 }, "56": { lat: 1.370, lng: 103.850 }, "57": { lat: 1.355, lng: 103.845 },
    "58": { lat: 1.345, lng: 103.775 }, "59": { lat: 1.340, lng: 103.765 }, "60": { lat: 1.335, lng: 103.740 },
    "61": { lat: 1.325, lng: 103.720 }, "62": { lat: 1.315, lng: 103.680 }, "63": { lat: 1.310, lng: 103.650 },
    "64": { lat: 1.340, lng: 103.700 }, "65": { lat: 1.360, lng: 103.755 }, "66": { lat: 1.365, lng: 103.765 },
    "67": { lat: 1.380, lng: 103.760 }, "68": { lat: 1.385, lng: 103.745 }, "69": { lat: 1.400, lng: 103.710 },
    "70": { lat: 1.410, lng: 103.700 }, "71": { lat: 1.420, lng: 103.720 }, "72": { lat: 1.430, lng: 103.730 },
    "73": { lat: 1.440, lng: 103.780 }, "75": { lat: 1.450, lng: 103.820 }, "76": { lat: 1.435, lng: 103.835 },
    "77": { lat: 1.405, lng: 103.830 }, "78": { lat: 1.410, lng: 103.825 }, "79": { lat: 1.390, lng: 103.870 },
    "80": { lat: 1.400, lng: 103.865 }, "81": { lat: 1.360, lng: 103.990 }, "82": { lat: 1.405, lng: 103.905 }
  };
  return mapping[prefix] || { lat: 1.3521, lng: 103.8198 };
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

  const removeTag = (idxToRemove: number) => {
    if (disabled) return;
    onChange(tags.filter((_, idx) => idx !== idxToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === "Backspace" && !inputVal && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const unusedSuggestions = suggestions.filter(s => !tags.includes(s));

  return (
    <div className={`flex flex-col gap-1.5 w-full ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
      <div className={`flex flex-wrap gap-1.5 p-2 bg-white border border-slate-200 rounded-lg min-h-[38px] items-center focus-within:ring-2 focus-within:ring-[#0B57D0]/20 focus-within:border-[#0B57D0] transition-all ${disabled ? "bg-slate-50 cursor-not-allowed" : ""}`}>
        {tags.map((tag, idx) => (
          <span 
            key={idx} 
            className="bg-slate-100 text-zinc-800 border border-slate-200 text-xs px-2.5 py-0.5 rounded-md flex items-center gap-1 font-semibold shadow-2xs"
          >
            <span>{tag}</span>
            {!disabled && (
              <button 
                type="button" 
                onClick={() => removeTag(idx)} 
                className="text-zinc-400 hover:text-rose-500 cursor-pointer focus:outline-none transition-colors"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            id={id}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ""}
            list={`${id}-suggestions`}
            className="flex-1 min-w-[120px] bg-transparent text-xs text-zinc-800 focus:outline-none placeholder-zinc-400 font-medium"
          />
        )}
      </div>

      {!disabled && (
        <datalist id={`${id}-suggestions`}>
          {unusedSuggestions.map((item, idx) => (
            <option key={idx} value={item} />
          ))}
        </datalist>
      )}

      {/* Suggested Quick Add Pills */}
      {!disabled && unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center mt-0.5">
          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mr-1">Suggestions:</span>
          {unusedSuggestions.slice(0, 10).map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => addTag(s)}
              className="text-[11px] bg-slate-50 hover:bg-[#E8F0FE] hover:text-[#0B57D0] hover:border-[#0B57D0]/30 text-zinc-700 font-medium px-2 py-0.5 rounded-md cursor-pointer transition-colors border border-slate-200"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface MerchandiserModuleProps {
  profile?: UserProfile | null;
}

export function MerchandiserModule({ profile }: MerchandiserModuleProps) {
  const isViewer = profile?.role === "Operator" && !canEditModule(profile, "Merchandiser");

  const [activeTab, setActiveTab] = React.useState("performance");
  const [fetching, setFetching] = React.useState(true);

  // Raw Database states (pure snake_case)
  const [productLogs, setProductLogs] = React.useState<any[]>([]);
  const [shelfLogs, setShelfLogs] = React.useState<any[]>([]);
  const [settings, setSettings] = React.useState<any[]>([]);
  const [stores, setStores] = React.useState<any[]>([]);
  const [products, setProducts] = React.useState<any[]>([]);
  const [retailers, setRetailers] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [employees, setEmployees] = React.useState<any[]>([]);

  // Settings Hook states
  const [settingFreq, setSettingFreq] = React.useState(14);
  const [settingFocusRet, setSettingFocusRet] = React.useState<string[]>([]);
  const [settingFocusStatus, setSettingFocusStatus] = React.useState<string[]>([]);
  const [settingFocusRank, setSettingFocusRank] = React.useState<string[]>([]);
  const [settingAvoidRet, setSettingAvoidRet] = React.useState<string[]>([]);

  // Settings Calculator breakdown group
  const [calcGroupBy, setCalcGroupBy] = React.useState<"zone" | "retailer">("zone");

  // History Tab Sub-Tabs state ("pending" | "visited")
  const [historySubTab, setHistorySubTab] = React.useState<"pending" | "visited">("pending");

  // Map Tracking States (Past 7 days only: offset 0 = Today, down to -6)
  const [mapDayOffset, setMapDayOffset] = React.useState<number>(0);
  const [selectedMerchFilter, setSelectedMerchFilter] = React.useState<string>("all");
  const [leafletLoaded, setLeafletLoaded] = React.useState<boolean>(false);
  const mapRef = React.useRef<any>(null);
  const markersGroupRef = React.useRef<any>(null);
  const trailGroupRef = React.useRef<any>(null);

  // Update Task Log Modal State
  const [isUpdateLogOpen, setIsUpdateLogOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<any | null>(null);
  const [newAction, setNewAction] = React.useState<"Visit" | "Call" | "Check Last Order">("Visit");
  const [newRemark, setNewRemark] = React.useState("");
  const [newActionBy, setNewActionBy] = React.useState("");
  const [nextAction, setNextAction] = React.useState<"Visit" | "Call" | "Check Last Order">("Visit");

  // History Timeline Sidebar State
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);

  // Image Preview Modal State
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  // Graph Hover Tooltip State
  const [hoveredPoint, setHoveredPoint] = React.useState<{
    month: string;
    val: number;
    x: number;
    y: number;
    isProjected?: boolean;
    deployTarget?: number;
    deployTargetDailyPerMerch?: number;
    perWeek?: number;
    perDay?: number;
    perDayPerMerch?: number;
    activeMerchCount?: number;
  } | null>(null);

  // PDF Print Dialog Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
  const [printReportType, setPrintReportType] = React.useState<"weekly" | "monthly">("weekly");
  const [selectedPrintWeekIndex, setSelectedPrintWeekIndex] = React.useState(0);
  const [selectedPrintMonthIndex, setSelectedPrintMonthIndex] = React.useState(0);

  // Dynamic Navigation Header tabs
  const tabs = [
    { id: "performance", label: "Performance", desc: "Real-time field visit tracking, 12-month historical comparisons, and retailer visit summaries." },
    { id: "tracking", label: "Track Merch", desc: "Interactive GPS route trails, chronological visit feeds, and store stop sequences for the past 7 days." },
    { id: "setting", label: "Deploy", desc: "Configure store visit frequencies, focus retailers, and simulate route scheduling impacts." },
    { id: "visit_history", label: "Visit History", desc: "Manage assigned store tasks, field action logs, and audited product visit archives." }
  ];

  // Offset states for Weekly and Monthly counters
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

    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }, []);

  // Date formatting utility to dd/mm/yyyy
  const formatDate = React.useCallback((isoString: any): string => {
    if (!isoString) return "";
    const date = parseTimestamp(isoString);
    if (isNaN(date.getTime())) return String(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, [parseTimestamp]);

  const formatTimeStr = React.useCallback((timestamp: any): string => {
    const date = parseTimestamp(timestamp);
    if (isNaN(date.getTime())) return "--:--";
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  }, [parseTimestamp]);

  // Retailer Name lookup helper
  const getRetailerName = React.useCallback((store: any): string => {
    if (!store) return "";
    const retailerId = store.retailers_id || store.retailer_id;
    if (!retailerId) {
      const name = String(store.display_name || "").trim();
      return (name && name.toLowerCase() !== "unknown" && name.toLowerCase() !== "-" && name.toLowerCase() !== "null") ? name : "";
    }
    const retailer = retailers.find(r => 
      String(r.id).toLowerCase() === String(retailerId).toLowerCase() ||
      String(r.retailers_id || "").toLowerCase() === String(retailerId).toLowerCase()
    );
    const resolved = retailer ? String(retailer.display_name || retailer.id).trim() : String(retailerId).trim();
    if (!resolved || resolved.toLowerCase() === "unknown" || resolved.toLowerCase() === "-" || resolved.toLowerCase() === "null") {
      return "";
    }
    return resolved;
  }, [retailers]);

  // Brand Logo lookup helper
  const getBrandLogo = React.useCallback((brandNameOrId: string): string => {
    if (!brandNameOrId) return "";
    const brand = brands.find(b => 
      String(b.display_name || "").toLowerCase() === String(brandNameOrId).toLowerCase() ||
      String(b.id).toLowerCase() === String(brandNameOrId).toLowerCase()
    );
    return brand ? String(brand.logo_image || "") : "";
  }, [brands]);

  // Brand Name lookup helper
  const getBrandName = React.useCallback((brandId: string): string => {
    if (!brandId || brandId === "Unknown") return "Unknown";
    const brand = brands.find(b => String(b.id).toLowerCase() === String(brandId).toLowerCase());
    return brand ? (brand.display_name || brand.id) : brandId;
  }, [brands]);

  // Merchandiser Info helper (Name, Initials, Color)
  const getMerchInfo = React.useCallback((merchId: string) => {
    const emp = employees.find(e => String(e.id) === String(merchId));
    let rawName = emp ? (emp.name || emp.full_name || merchId) : merchId;
    rawName = rawName.replace(/\(SM\)/gi, "").trim();
    
    // Compute 2-letter initials
    let initials = "SM";
    const words = rawName.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      initials = (words[0].substring(0, 1) + words[1].substring(0, 1)).toUpperCase();
    } else if (words.length === 1 && words[0].length >= 2) {
      initials = words[0].substring(0, 2).toUpperCase();
    } else if (words.length === 1) {
      initials = words[0].substring(0, 1).toUpperCase() + "1";
    }

    // Determine consistent color based on string hash
    let hash = 0;
    for (let i = 0; i < merchId.length; i++) {
      hash = merchId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % MERCH_COLOR_PALETTE.length;
    const color = MERCH_COLOR_PALETTE[colorIndex];

    return {
      id: merchId,
      name: rawName,
      initials,
      color
    };
  }, [employees]);

  // Helper to safely cache json in localStorage without throwing QuotaExceededError
  const safeSetItem = (key: string, value: any) => {
    try {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
    } catch {
      // Storage quota exceeded or disabled; safely ignore
    }
  };

  // Helper to fetch and cache json
  const fetchSheet = async (sheetName: string) => {
    const res = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser?table=${sheetName}`);
    if (!res.ok) throw new Error(`Failed to fetch ${sheetName}`);
    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.value || []);
    safeSetItem(`${sheetName}_data`, items);
    return items;
  };

  const fetchFreshData = async (sheetName: string, forceSync = false) => {
    try {
      if (forceSync) {
        await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser?table=${sheetName}`, { method: "POST" });
      }
      return await fetchSheet(sheetName);
    } catch (e) {
      console.warn("Background fetch failed for " + sheetName, e);
      return [];
    }
  };

  // Load Leaflet dynamically on mount or when switching to tracking tab
  React.useEffect(() => {
    if (activeTab !== "tracking") return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!(window as any).L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => {
        setLeafletLoaded(true);
      };
      document.body.appendChild(script);
    } else {
      setLeafletLoaded(true);
    }
  }, [activeTab]);

  // Load cache on mount
  React.useEffect(() => {
    const safeParse = (key: string) => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    };

    const pLogsCached = safeParse("Merch_Visit_Product_Audit_Logs_data");
    const sLogsCached = safeParse("Merch_Visit_Shelf_Audit_Logs_data");
    const settingsCached = safeParse("Merch_Visit_Setting_data");
    const storesCached = safeParse("Store_Retailer_DB_data");
    const productsCached = safeParse("products_DB_data");
    const retailersCached = safeParse("retailers_DB_data");
    const brandsCached = safeParse("brands_DB_data");
    const tasksCached = safeParse("Stores_Task_Assigned_data");
    const empCached = safeParse("employees_data");

    if (pLogsCached) setProductLogs(pLogsCached);
    if (sLogsCached) setShelfLogs(sLogsCached);
    if (settingsCached) setSettings(settingsCached);
    if (storesCached) setStores(storesCached);
    if (productsCached) setProducts(productsCached);
    if (retailersCached) setRetailers(retailersCached);
    if (brandsCached) setBrands(brandsCached);
    if (tasksCached) setTasks(tasksCached);
    if (empCached) setEmployees(empCached);

    setFetching(true);
    Promise.all([
      fetchSheet("Merch_Visit_Product_Audit_Logs"),
      fetchSheet("Merch_Visit_Shelf_Audit_Logs"),
      fetchSheet("Merch_Visit_Setting"),
      fetchSheet("Store_Retailer_DB"),
      fetchSheet("products_DB"),
      fetchSheet("retailers_DB"),
      fetchSheet("brands_DB"),
      fetchSheet("Stores_Task_Assigned"),
      fetchSheet("employees")
    ]).then(([p, s, set, st, prod, ret, br, t, emp]) => {
      setProductLogs(p);
      setShelfLogs(s);
      setSettings(set);
      setStores(st);
      setProducts(prod);
      setRetailers(ret);
      setBrands(br);
      setTasks(t);
      setEmployees(emp);
    }).catch((e) => {
      showToast("Error loading merchandiser workspace: " + e.message, "error");
    }).finally(() => {
      setFetching(false);
    });

    // Silent background sync after mount
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("db-refresh"));
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Global Refresh Listener
  React.useEffect(() => {
    const handleRefresh = async () => {
      setFetching(true);
      try {
        await Promise.all([
          fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser?table=Merch_Visit_Product_Audit_Logs`, { method: "POST" }),
          fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser?table=Merch_Visit_Shelf_Audit_Logs`, { method: "POST" }),
          fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser?table=Merch_Visit_Setting`, { method: "POST" }),
          fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser?table=Store_Retailer_DB`, { method: "POST" }),
          fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser?table=products_DB`, { method: "POST" }),
          fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser?table=retailers_DB`, { method: "POST" }),
          fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser?table=brands_DB`, { method: "POST" }),
          fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser?table=Stores_Task_Assigned`, { method: "POST" }),
          fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser?table=employees`, { method: "POST" })
        ]);

        const [productLogsVal, shelfLogsVal, settingsVal, storesVal, productsVal, retailersVal, brandsVal, tasksVal, empVal] = await Promise.all([
          fetchSheet("Merch_Visit_Product_Audit_Logs"),
          fetchSheet("Merch_Visit_Shelf_Audit_Logs"),
          fetchSheet("Merch_Visit_Setting"),
          fetchSheet("Store_Retailer_DB"),
          fetchSheet("products_DB"),
          fetchSheet("retailers_DB"),
          fetchSheet("brands_DB"),
          fetchSheet("Stores_Task_Assigned"),
          fetchSheet("employees")
        ]);

        setProductLogs(productLogsVal);
        setShelfLogs(shelfLogsVal);
        setSettings(settingsVal);
        setStores(storesVal);
        setProducts(productsVal);
        setRetailers(retailersVal);
        setBrands(brandsVal);
        setTasks(tasksVal);
        setEmployees(empVal);
      } catch (err: any) {
        showToast("Refresh failed: " + err.message, "error");
      } finally {
        setFetching(false);
      }
    };

    window.addEventListener("db-refresh", handleRefresh);
    return () => window.removeEventListener("db-refresh", handleRefresh);
  }, []);

  // Escape key to close history sidebar
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

  // Selected Day Calculation (Past 7 Days: 0 = Today, -1 = Yesterday, ..., -6)
  const selectedDayRange = React.useMemo(() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mapDayOffset);
    const start = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
    const end = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);

    let dayLabel = "";
    if (mapDayOffset === 0) {
      dayLabel = `Today (${start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`;
    } else if (mapDayOffset === -1) {
      dayLabel = `Yesterday (${start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })})`;
    } else {
      dayLabel = `${start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`;
    }

    return { start, end, label: dayLabel };
  }, [mapDayOffset]);

  // Group and sort stops for the selected day by Merchandiser
  const dayTrailsData = React.useMemo(() => {
    const { start, end } = selectedDayRange;
    const startTs = start.getTime();
    const endTs = end.getTime();

    // 1. Filter logs for the selected day
    const dayLogs = productLogs.filter(log => {
      const ts = parseTimestamp(log.timestamp).getTime();
      return ts >= startTs && ts <= endTs;
    });

    // 2. Group by merchandiser and deduplicate store visits
    const byMerch: Record<string, { merchInfo: ReturnType<typeof getMerchInfo>; stops: any[] }> = {};

    dayLogs.forEach(log => {
      const mId = String(log.merch_id || "Unknown");
      if (!byMerch[mId]) {
        byMerch[mId] = {
          merchInfo: getMerchInfo(mId),
          stops: []
        };
      }
      
      const storeId = String(log.retailer_stores_id);
      const existing = byMerch[mId].stops.find(s => String(s.storeId) === storeId);
      const logTs = parseTimestamp(log.timestamp).getTime();

      if (!existing) {
        const store = stores.find(s => String(s.id) === storeId);
        
        // Resolve store coordinates
        let lat = 1.3521;
        let lng = 103.8198;
        if (store?.pin_locations && String(store.pin_locations).includes(",")) {
          const parts = String(store.pin_locations).split(",");
          const pLat = parseFloat(parts[0]);
          const pLng = parseFloat(parts[1]);
          if (!isNaN(pLat) && !isNaN(pLng)) {
            lat = pLat;
            lng = pLng;
          }
        } else if (store?.address) {
          const m = String(store.address).match(/\b(\d{6})\b/);
          if (m) {
            const fallback = getSingaporeLatLng(m[1]);
            lat = fallback.lat;
            lng = fallback.lng;
          }
        }

        byMerch[mId].stops.push({
          id: log.id,
          storeId,
          storeName: store?.display_name || `Store #${storeId}`,
          retailerName: getRetailerName(store),
          address: store?.address || "",
          timestamp: logTs,
          lat,
          lng,
          auditJson: log.audit_json
        });
      } else {
        // Keep the earliest visit timestamp for sequence
        if (logTs < existing.timestamp) {
          existing.timestamp = logTs;
        }
      }
    });

    // 3. Sort stops chronologically for each merchandiser
    Object.values(byMerch).forEach(group => {
      group.stops.sort((a, b) => a.timestamp - b.timestamp);
    });

    return byMerch;
  }, [productLogs, selectedDayRange, stores, getMerchInfo, getRetailerName, parseTimestamp]);

  // Initialize and update Leaflet Map instance
  React.useEffect(() => {
    if (!leafletLoaded || activeTab !== "tracking") return;

    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      mapRef.current = L.map("merch-leaflet-map", {
        zoomControl: true,
      }).setView([1.3521, 103.8198], 12);

      L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        opacity: 0.5
      }).addTo(mapRef.current);

      trailGroupRef.current = L.featureGroup().addTo(mapRef.current);
      markersGroupRef.current = L.featureGroup().addTo(mapRef.current);

      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 300);
    } else {
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersGroupRef.current = null;
        trailGroupRef.current = null;
      }
    };
  }, [leafletLoaded, activeTab]);

  // Render and update merchandiser trails and pins dynamically
  React.useEffect(() => {
    if (!leafletLoaded || activeTab !== "tracking" || !mapRef.current || !markersGroupRef.current || !trailGroupRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const markersGroup = markersGroupRef.current;
    const trailGroup = trailGroupRef.current;
    markersGroup.clearLayers();
    trailGroup.clearLayers();

    const merchEntries = Object.entries(dayTrailsData);
    const bounds: any[] = [];

    merchEntries.forEach(([merchId, data]) => {
      // Filter by selected merchandiser if not "all"
      if (selectedMerchFilter !== "all" && selectedMerchFilter !== merchId) return;

      const { merchInfo, stops } = data;
      if (stops.length === 0) return;

      const latlngs: [number, number][] = [];

      // Darker shade calculator helper for last stop
      const getDarkerColor = (hex: string, factor = 0.7): string => {
        let cleanHex = hex.replace("#", "");
        if (cleanHex.length === 3) {
          cleanHex = cleanHex.split("").map(c => c + c).join("");
        }
        const num = parseInt(cleanHex, 16);
        if (isNaN(num)) return hex;
        const r = Math.floor(((num >> 16) & 255) * factor);
        const g = Math.floor(((num >> 8) & 255) * factor);
        const b = Math.floor((num & 255) * factor);
        return `rgb(${r}, ${g}, ${b})`;
      };

      stops.forEach((stop, idx) => {
        const isLastStop = idx === stops.length - 1;
        const isFirstStop = idx === 0 && stops.length > 1;
        latlngs.push([stop.lat, stop.lng]);
        bounds.push([stop.lat, stop.lng]);

        let iconHtml = "";
        let iconSize: [number, number] = [24, 24];
        let iconAnchor: [number, number] = [12, 12];

        if (isLastStop) {
          // Last Stop: Square shape, same merchandiser color a bit darker, NO star icon
          const darkerBg = getDarkerColor(merchInfo.color, 0.65);
          iconSize = [24, 24];
          iconAnchor = [12, 12];
          iconHtml = `<div style="background-color: ${darkerBg}; border: 1.8px solid #FFFFFF; border-radius: 4px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-family: var(--font-primary, sans-serif); font-size: 9px; font-weight: 900; color: #FFFFFF; box-shadow: 0 0 0 2px rgba(0,0,0,0.15), 0 3px 5px rgba(0,0,0,0.35); line-height: 20px; text-align: center; white-space: nowrap; cursor: pointer;">${merchInfo.initials}</div>`;
        } else if (isFirstStop) {
          // First Stop: Triangle shape pointing up
          iconSize = [26, 26];
          iconAnchor = [13, 13];
          iconHtml = `
            <div style="width: 26px; height: 26px; position: relative; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <svg viewBox="0 0 26 26" width="26" height="26" style="position: absolute; inset: 0; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35));">
                <polygon points="13,2 25,24 1,24" fill="${merchInfo.color}" stroke="#FFFFFF" stroke-width="1.8" stroke-linejoin="round" />
              </svg>
              <span style="position: relative; z-index: 2; font-family: var(--font-primary, sans-serif); font-size: 8.5px; font-weight: 900; color: #FFFFFF; margin-top: 5px; line-height: 1;">${merchInfo.initials}</span>
            </div>
          `;
        } else {
          // Middle Stops: Round (Circle) shape
          iconSize = [24, 24];
          iconAnchor = [12, 12];
          iconHtml = `<div style="background-color: ${merchInfo.color}; border: 1.8px solid #FFFFFF; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-family: var(--font-primary, sans-serif); font-size: 9px; font-weight: 900; color: #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.3); line-height: 20px; text-align: center; white-space: nowrap; cursor: pointer;">${merchInfo.initials}</div>`;
        }

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "",
          iconSize: iconSize,
          iconAnchor: iconAnchor,
          popupAnchor: [0, -14]
        });

        const stopTimeStr = formatTimeStr(stop.timestamp);
        const stopDateStr = formatDate(stop.timestamp);

        const popupHtml = `
          <div style="font-family: var(--font-primary, sans-serif); font-size: 11px; line-height: 1.4; color: #18181B; font-weight: 500; min-width: 190px; padding: 2px;">
            <div style="font-size: 11px; font-weight: bold; border-bottom: 1px solid #E5E5E5; padding-bottom: 4px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span style="color: ${merchInfo.color}; font-weight: 800;">Stop #${idx + 1} (${merchInfo.name})</span>
              ${isLastStop ? '<span style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; padding: 1px 4px; border-radius: 4px; font-size: 9px; font-weight: 800;">LAST STOP</span>' : isFirstStop ? '<span style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; padding: 1px 4px; border-radius: 4px; font-size: 9px; font-weight: 800;">FIRST STOP</span>' : ''}
            </div>
            <div style="margin-top: 4px; margin-bottom: 2px; font-weight: 700; color: #09090B;">${stop.storeName}</div>
            <div style="color: #4B5563; font-size: 10px; margin-bottom: 4px;">${stop.retailerName}</div>
            ${stop.address ? `<div style="color: #71717A; font-size: 9.5px; border-top: 1px dashed #E5E5E5; padding-top: 3px; margin-top: 3px;">📍 ${stop.address}</div>` : ''}
            <div style="color: #64748B; font-size: 9px; font-family: monospace; margin-top: 3px;">🕒 Visited: ${stopDateStr} ${stopTimeStr}</div>
          </div>
        `;

        L.marker([stop.lat, stop.lng], { icon: customIcon })
          .bindPopup(popupHtml)
          .addTo(markersGroup);
      });

      // Draw dotted trail line connecting sequence of pins
      if (latlngs.length > 1) {
        L.polyline(latlngs, {
          color: merchInfo.color,
          weight: 3,
          dashArray: "4, 6",
          opacity: 0.85,
          lineJoin: "round"
        }).addTo(trailGroup);
      }
    });

    // Auto fit map bounds if we have pins
    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [leafletLoaded, activeTab, dayTrailsData, selectedMerchFilter, formatTimeStr, formatDate]);

  // Parse Settings rows into hook states
  React.useEffect(() => {
    if (settings.length > 0) {
      const parseTags = (val: any): string[] => {
        if (!val) return [];
        return String(val).split(",").map(s => s.trim()).filter(Boolean);
      };

      const getRetailerNameFromId = (id: string): string => {
        const ret = retailers.find(r => String(r.id).toLowerCase() === id.toLowerCase());
        return ret ? (ret.display_name || ret.id) : id;
      };

      const freqObj = settings.find(s => s.id_setting === "Visit Frequency");
      const focusRetObj = settings.find(s => s.id_setting === "Focus Retailers");
      const focusStatusObj = settings.find(s => s.id_setting === "Focus Status Stores");
      const focusRankObj = settings.find(s => s.id_setting === "Focus Rank Stores");
      const avoidRetObj = settings.find(s => s.id_setting === "Avoid Retailers");

      if (freqObj) setSettingFreq(Number(freqObj.value || 14));
      if (focusRetObj) {
        const ids = parseTags(focusRetObj.value);
        setSettingFocusRet(ids.map(getRetailerNameFromId));
      }
      if (focusStatusObj) setSettingFocusStatus(parseTags(focusStatusObj.value));
      if (focusRankObj) setSettingFocusRank(parseTags(focusRankObj.value));
      if (avoidRetObj) {
        const ids = parseTags(avoidRetObj.value);
        setSettingAvoidRet(ids.map(getRetailerNameFromId));
      }
    }
  }, [settings, retailers]);

  // Autocomplete lists
  const retailerSuggestions = React.useMemo(() => {
    return Array.from(new Set(retailers.map(r => r.display_name).filter(Boolean))) as string[];
  }, [retailers]);

  const statusSuggestions = React.useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => {
      const val = String(s.status ?? s.store_status ?? "").trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [stores]);

  const rankSuggestions = React.useMemo(() => {
    const set = new Set<string>();
    stores.forEach((s) => {
      const val = String(s.store_rank ?? s.rank ?? "").trim();
      if (val) set.add(val);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [stores]);

  // Deploy settings
  const handleDeploySettings = async () => {
    showToast("Deploying settings in background...", "info");

    const getRetailerIdFromName = (name: string): string => {
      const ret = retailers.find(r => 
        String(r.display_name).toLowerCase() === name.toLowerCase() ||
        String(r.id).toLowerCase() === name.toLowerCase()
      );
      return ret ? ret.id : name;
    };

    const focusRetIds = settingFocusRet.map(getRetailerIdFromName);
    const avoidRetIds = settingAvoidRet.map(getRetailerIdFromName);

    const payloadFreq = { id_setting: "Visit Frequency", input: "Number", value: String(settingFreq) };
    const payloadFocusRet = { id_setting: "Focus Retailers", input: "Retailer ID's", value: focusRetIds.join(", ") };
    const payloadFocusStatus = { id_setting: "Focus Status Stores", input: "Carry, Not Carry", value: settingFocusStatus.join(", ") };
    const payloadFocusRank = { id_setting: "Focus Rank Stores", input: "Top 10, Bottom 10", value: settingFocusRank.join(", ") };
    const payloadAvoidRet = { id_setting: "Avoid Retailers", input: "Retailer ID's", value: avoidRetIds.join(", ") };

    const updateRow = async (row: any) => {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "Merch_Visit_Setting",
          action: "update",
          data: row
        })
      });
      if (!res.ok) throw new Error(`Deploy failed for ${row.id_setting}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || `Deploy failed for ${row.id_setting}`);
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
      safeSetItem("Merch_Visit_Setting_data", newSettings);
      
      showToast("Settings deployed successfully to the database!", "success");
      fetchFreshData("Merch_Visit_Setting", false);
    } catch (e: any) {
      showToast("Deploy failed: " + e.message, "error");
    }
  };

  // Settings calculation for simulated targets and active stores
  const settingCalculation = React.useMemo(() => {
    const filtered = stores.filter(store => {
      const rName = getRetailerName(store);
      
      if (settingFocusRet.length > 0) {
        if (!settingFocusRet.includes(rName)) return false;
      }
      if (settingAvoidRet.length > 0) {
        if (settingAvoidRet.includes(rName)) return false;
      }
      if (settingFocusStatus.length > 0) {
        const storeStatus = String(store.status ?? store.store_status ?? "").trim();
        if (!settingFocusStatus.includes(storeStatus)) return false;
      }
      if (settingFocusRank.length > 0) {
        const storeRank = String(store.store_rank ?? store.rank ?? "").trim();
        if (!settingFocusRank.includes(storeRank)) return false;
      }
      return true;
    });

    const frequencyThresholdMs = settingFreq * 24 * 60 * 60 * 1000;
    const nowTime = Date.now();
    
    const latestVisitsMap: Record<string, number> = {};
    productLogs.forEach(log => {
      const storeId = String(log.retailer_stores_id);
      const ts = parseTimestamp(log.timestamp).getTime();
      if (!latestVisitsMap[storeId] || ts > latestVisitsMap[storeId]) {
        latestVisitsMap[storeId] = ts;
      }
    });

    const normalizeZoneName = (rawZone: any): string => {
      const z = String(rawZone || "").trim();
      if (!z || z.toLowerCase() === "unknown" || z === "-" || z.toLowerCase() === "null") return "Unknown";
      
      const lower = z.toLowerCase();
      if (lower === "north-east" || lower === "northeast" || lower === "north east") return "North-East";
      if (lower === "north-west" || lower === "northwest" || lower === "north west") return "North-West";
      if (lower === "south-east" || lower === "southeast" || lower === "south east") return "South-East";
      if (lower === "south-west" || lower === "southwest" || lower === "south west") return "South-West";
      if (lower === "north") return "North";
      if (lower === "south") return "South";
      if (lower === "east") return "East";
      if (lower === "west") return "West";
      if (lower === "central") return "Central";

      return z.split(/[-_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("-");
    };

    const storeStatusList = filtered.map(store => {
      const storeId = String(store.id);
      const latestTs = latestVisitsMap[storeId] || 0;
      const hasVisited = latestTs > 0 && (nowTime - latestTs) <= frequencyThresholdMs;
      return {
        store,
        hasVisited,
        zone: normalizeZoneName(store.zones),
        retailer: getRetailerName(store)
      };
    });

    const zoneGroup: Record<string, { total: number; visited: number; pending: number }> = {};
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

      if (!zoneGroup[item.zone]) {
        zoneGroup[item.zone] = { total: 0, visited: 0, pending: 0 };
      }
      zoneGroup[item.zone].total++;
      if (item.hasVisited) zoneGroup[item.zone].visited++;
      else zoneGroup[item.zone].pending++;

      if (item.retailer && item.retailer.toLowerCase() !== "unknown" && item.retailer !== "-") {
        if (!retailerGroup[item.retailer]) {
          retailerGroup[item.retailer] = { total: 0, visited: 0, pending: 0 };
        }
        retailerGroup[item.retailer].total++;
        if (item.hasVisited) retailerGroup[item.retailer].visited++;
        else retailerGroup[item.retailer].pending++;
      }
    });

    const zoneOrder = ["Central", "North", "North-East", "East", "South", "West", "North-West", "South-East", "South-West", "Unknown"];
    const sortedByZone = Object.entries(zoneGroup)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => {
        const idxA = zoneOrder.indexOf(a.name);
        const idxB = zoneOrder.indexOf(b.name);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

    return {
      totalActive,
      totalVisited,
      totalPending,
      byZone: sortedByZone,
      byRetailer: Object.entries(retailerGroup).map(([name, counts]) => ({ name, ...counts }))
    };
  }, [stores, productLogs, settingFreq, settingFocusRet, settingFocusStatus, settingFocusRank, settingAvoidRet, getRetailerName, parseTimestamp]);

  // Performance Tab calculations
  const performanceStats = React.useMemo(() => {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const filteredLogs = productLogs.filter(log => parseTimestamp(log.timestamp).getTime() >= oneYearAgo.getTime());

    const isToday = (d: Date) => {
      const todayDate = new Date();
      return d.getDate() === todayDate.getDate() && d.getMonth() === todayDate.getMonth() && d.getFullYear() === todayDate.getFullYear();
    };

    const { monday, sunday } = getWeekRange(weekOffset);
    const isSelectedWeek = (d: Date) => {
      return d >= monday && d <= sunday;
    };

    const { start: monthStart, end: monthEnd } = getMonthRange(monthOffset);
    const isSelectedMonth = (d: Date) => {
      return d >= monthStart && d <= monthEnd;
    };

    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    const retailerGroup: Record<string, { today: number; week: number; month: number }> = {};

    filteredLogs.forEach((log) => {
      const logDate = parseTimestamp(log.timestamp);
      const store = stores.find(s => String(s.id) === String(log.retailer_stores_id));
      const retName = getRetailerName(store);

      if (retName && retName.toLowerCase() !== "unknown" && retName !== "-") {
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

    const cleanRetailers = Object.entries(retailerGroup)
      .filter(([name]) => name && name.trim().toLowerCase() !== "unknown" && name.trim().toLowerCase() !== "-" && name.trim() !== "")
      .map(([name, counts]) => ({
        name,
        ...counts
      }));

    return {
      totals: { today: todayCount, week: weekCount, month: monthCount },
      retailers: cleanRetailers
    };
  }, [productLogs, stores, getRetailerName, weekOffset, monthOffset, getWeekRange, getMonthRange, parseTimestamp]);

  // 12-Month Performance Graph + Next 3-Month Projection Calculations
  const graphData = React.useMemo(() => {
    const historicalMonths: { year: number; month: number; label: string }[] = [];
    const now = new Date();
    
    // Past 12 historical months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      historicalMonths.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString("default", { month: "short", year: "2-digit" })
      });
    }

    const historicalData = historicalMonths.map((m) => {
      const monthLogs = productLogs.filter((log) => {
        const logDate = parseTimestamp(log.timestamp);
        return logDate.getFullYear() === m.year && logDate.getMonth() === m.month;
      });

      return {
        label: m.label,
        totalVisits: monthLogs.length,
        isProjected: false,
        deployTarget: 0,
        perWeek: Math.round(monthLogs.length / 4.33),
        perDay: Number((monthLogs.length / 26).toFixed(1)),
        perDayPerMerch: 0,
        activeMerchCount: 0
      };
    });

    // Deploy Configuration Target Monthly Visits: Active Target Stores * (30 / Visit Frequency)
    const activeTargetStores = Math.max(settingCalculation.totalActive, stores.length > 0 ? stores.length : 1);
    const visitFreqDays = Math.max(settingFreq, 1);
    const deployMonthlyTarget = Math.round((activeTargetStores * 30) / visitFreqDays);

    // Count unique active merchandisers in the past 3 months (90 days)
    const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const past3MonthsLogs = productLogs.filter(log => {
      const ts = parseTimestamp(log.timestamp);
      return ts >= ninetyDaysAgo;
    });

    const activeMerchIdSet = new Set<string>();
    past3MonthsLogs.forEach(log => {
      const mId = String(log.merch_id || log.Merch_ID || log.employee_id || "").trim();
      if (mId && mId.toLowerCase() !== "unknown" && mId.toLowerCase() !== "null" && mId.toLowerCase() !== "undefined") {
        activeMerchIdSet.add(mId);
      }
    });

    let activeMerchList = Array.from(activeMerchIdSet).map(id => getMerchInfo(id));
    if (activeMerchList.length === 0) {
      const empMerchs = employees.filter(e => 
        String(e.role || "").toLowerCase().includes("merch") || 
        String(e.department || "").toLowerCase().includes("merch") ||
        String(e.name || "").includes("(SM)")
      );
      if (empMerchs.length > 0) {
        activeMerchList = empMerchs.map(e => getMerchInfo(String(e.id)));
      }
    }
    const activeMerchCount = Math.max(activeMerchList.length, 1);

    // Recent 3 months trend calculation (momentum from last 3 historical months)
    const last3 = historicalData.slice(-3);
    const mPrev2 = last3[0]?.totalVisits || 0;
    const mPrev1 = last3[1]?.totalVisits || 0;
    const mCurrent = last3[2]?.totalVisits || 0;

    // Monthly velocity from recent 3 months
    const recentVelocity = (mCurrent - mPrev2) / 2;

    // Projected next 3 months
    const projectedData: { 
      label: string; 
      totalVisits: number; 
      isProjected: boolean; 
      deployTarget: number;
      deployTargetDailyPerMerch: number;
      perWeek: number;
      perDay: number;
      perDayPerMerch: number;
      activeMerchCount: number;
    }[] = [];
    let runningVal = mCurrent;

    // Working schedule: Monday - Thursday (4 days/week, excluding Fri/Sat/Sun) = 17.33 workdays/month
    const WORKDAYS_PER_MONTH = 17.33;
    const WEEKS_PER_MONTH = 4.33;

    for (let j = 1; j <= 3; j++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + j, 1);
      const label = futureDate.toLocaleString("default", { month: "short", year: "2-digit" }) + "*";
      
      const gap = deployMonthlyTarget - runningVal;
      const stepGrowth = gap * (0.35 + j * 0.08) + recentVelocity * Math.max(0.3 - j * 0.08, 0);
      runningVal = Math.max(0, Math.round(runningVal + stepGrowth));

      const perWeek = Math.round(runningVal / WEEKS_PER_MONTH);
      const perDay = Number((runningVal / WORKDAYS_PER_MONTH).toFixed(1));
      const perDayPerMerch = Number((runningVal / (WORKDAYS_PER_MONTH * activeMerchCount)).toFixed(1));

      projectedData.push({
        label,
        totalVisits: runningVal,
        isProjected: true,
        deployTarget: deployMonthlyTarget,
        deployTargetDailyPerMerch: Number((deployMonthlyTarget / (WORKDAYS_PER_MONTH * activeMerchCount)).toFixed(1)),
        perWeek,
        perDay,
        perDayPerMerch,
        activeMerchCount
      });
    }

    const avgProjectedMonthly = projectedData.length > 0 
      ? Math.round(projectedData.reduce((sum, p) => sum + p.totalVisits, 0) / projectedData.length)
      : 0;
    const avgProjectedWeekly = Math.round(avgProjectedMonthly / WEEKS_PER_MONTH);
    const avgProjectedDaily = Number((avgProjectedMonthly / WORKDAYS_PER_MONTH).toFixed(1));
    const avgProjectedDailyPerMerch = Number((avgProjectedMonthly / (WORKDAYS_PER_MONTH * activeMerchCount)).toFixed(1));

    const deployTargetDaily = Number((deployMonthlyTarget / WORKDAYS_PER_MONTH).toFixed(1));
    const deployTargetWeekly = Math.round(deployMonthlyTarget / WEEKS_PER_MONTH);
    const deployTargetDailyPerMerch = Number((deployMonthlyTarget / (WORKDAYS_PER_MONTH * activeMerchCount)).toFixed(1));
    const deployTargetWeeklyPerMerch = Number((deployMonthlyTarget / (WEEKS_PER_MONTH * activeMerchCount)).toFixed(1));

    const allData = [...historicalData, ...projectedData];
    const maxCount = Math.max(...allData.map(d => d.totalVisits), deployMonthlyTarget, 5);

    return {
      data: allData,
      historicalCount: historicalData.length,
      maxVal: maxCount,
      deployTarget: deployMonthlyTarget,
      deployTargetDaily,
      deployTargetWeekly,
      deployTargetDailyPerMerch,
      deployTargetWeeklyPerMerch,
      activeMerchCount,
      activeMerchList,
      avgProjectedMonthly,
      avgProjectedWeekly,
      avgProjectedDaily,
      avgProjectedDailyPerMerch
    };
  }, [productLogs, settingCalculation.totalActive, stores.length, settingFreq, parseTimestamp, employees, getMerchInfo]);

  const handlePrintPDF = React.useCallback(() => {
    const doc = new jsPDF();
    
    if (printReportType === "weekly") {
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
        const logDate = parseTimestamp(log.timestamp);
        return logDate >= minDate && logDate <= maxDate;
      });
      
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
      
      const retailerDays: Record<string, number[]> = {};
      
      filteredLogs.forEach(log => {
        const logDate = parseTimestamp(log.timestamp);
        const store = stores.find(s => String(s.id) === String(log.retailer_stores_id));
        const retName = getRetailerName(store);
        
        if (retName) {
          if (!retailerDays[retName]) {
            retailerDays[retName] = [0, 0, 0, 0, 0, 0, 0];
          }
          let dayIdx = logDate.getDay() - 1;
          if (dayIdx < 0) dayIdx = 6;
          retailerDays[retName][dayIdx]++;
        }
      });
      
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
      const selectedMonth = monthOptions[selectedPrintMonthIndex] || monthOptions[0];
      const { start: monthStart, end: monthEnd } = getMonthRange(selectedMonth.offset);
      const monthLabel = selectedMonth.label;
      
      const filteredLogs = productLogs.filter(log => {
        const logDate = parseTimestamp(log.timestamp);
        return logDate >= monthStart && logDate <= monthEnd;
      });
      
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
      
      const retailerWeeks: Record<string, number[]> = {};
      
      filteredLogs.forEach(log => {
        const logDate = parseTimestamp(log.timestamp);
        const store = stores.find(s => String(s.id) === String(log.retailer_stores_id));
        const retName = getRetailerName(store);
        
        if (retName) {
          if (!retailerWeeks[retName]) {
            retailerWeeks[retName] = [0, 0, 0, 0, 0];
          }
          const dayOfMonth = logDate.getDate();
          let weekIdx = 0;
          if (dayOfMonth <= 7) weekIdx = 0;
          else if (dayOfMonth <= 14) weekIdx = 1;
          else if (dayOfMonth <= 21) weekIdx = 2;
          else if (dayOfMonth <= 28) weekIdx = 3;
          else weekIdx = 4;
          
          retailerWeeks[retName][weekIdx]++;
        }
      });
      
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

  // Report Tab calculations (60 days) - pure snake_case
  const reportData = React.useMemo(() => {
    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const filtered = productLogs.filter(log => parseTimestamp(log.timestamp).getTime() >= sixtyDaysAgo.getTime());
    
    const latestStoreVisits: Record<string, any> = {};
    filtered.forEach((log) => {
      const storeId = String(log.retailer_stores_id);
      const existing = latestStoreVisits[storeId];
      if (!existing || parseTimestamp(log.timestamp).getTime() > parseTimestamp(existing.timestamp).getTime()) {
        latestStoreVisits[storeId] = log;
      }
    });

    const uniqueLogs = Object.values(latestStoreVisits);
    uniqueLogs.sort((a, b) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime());

    return uniqueLogs.map((log) => {
      const store = stores.find(s => String(s.id) === String(log.retailer_stores_id));
      const storeName = store ? store.display_name : `Store #${log.retailer_stores_id}`;
      const retailerName = store ? getRetailerName(store) : "-";

      const brandSkuCounts: Record<string, { brandId: string; count: number; shelfImage: string }> = {};
      let auditItems: any[] = [];
      try {
        auditItems = typeof log.audit_json === "string" ? JSON.parse(log.audit_json || "[]") : (log.audit_json || []);
      } catch (e) {}

      auditItems.forEach((item: any) => {
        const prod = products.find((p) => String(p.sku).toLowerCase() === String(item.sku).toLowerCase());
        const brandId = prod ? prod.brands_id : "Unknown";
        
        if (brandId) {
          if (!brandSkuCounts[brandId]) {
            const storeShelfLogs = shelfLogs.filter(sl => 
              String(sl.retailer_stores_id) === String(log.retailer_stores_id) && 
              String(sl.brands_id).toLowerCase() === String(brandId).toLowerCase()
            );
            if (storeShelfLogs.length > 1) {
              storeShelfLogs.sort((a, b) => parseTimestamp(b.timestamp).getTime() - parseTimestamp(a.timestamp).getTime());
            }
            const shelfImageLink = storeShelfLogs.length > 0 ? (storeShelfLogs[0].image_link || "") : "";

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
          store?.status === "Store Closed" ? "bg-rose-100 text-rose-700 border border-rose-200" :
          store?.status === "Not Carry" ? "bg-amber-100 text-amber-700 border border-amber-200" :
          store?.status === "Carry" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
          "text-zinc-400 italic bg-zinc-100 border border-zinc-200"
        }`}>
          {store?.status || "No Audited SKUs"}
        </span>
      );

      const brandsRawText = Object.keys(brandSkuCounts).length > 0 
        ? Object.values(brandSkuCounts).map(info => `${getBrandName(info.brandId)} (${info.count})`).join(", ")
        : (store?.status || "No Audited SKUs");

      return {
        id: `${log.timestamp}_${log.retailer_stores_id}`,
        date: formatDate(log.timestamp),
        retailer_name: retailerName,
        retailer_name_raw: retailerName,
        store_name: storeName,
        store_name_raw: storeName,
        brands: brandsNode,
        brands_raw: brandsRawText
      };
    });
  }, [productLogs, shelfLogs, stores, products, brands, getBrandLogo, getBrandName, parseTimestamp, getRetailerName, formatDate]);

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
    if (!selectedTask || !selectedTask.task_log) return [];
    try {
      const parsed = typeof selectedTask.task_log === "string" ? JSON.parse(selectedTask.task_log) : selectedTask.task_log;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }, [selectedTask]);

  const handleCompleteTask = async (task: any) => {
    showToast("Completing task...", "info");

    const previousTasks = [...tasks];
    const updated = tasks.map((t) =>
      String(t.created_date) === String(task.created_date) &&
      String(t.stores_id) === String(task.stores_id)
        ? { ...t, is_complete: "Done" }
        : t
    );

    setTasks(updated);
    safeSetItem("Stores_Task_Assigned_data", updated);

    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "Stores_Task_Assigned",
          action: "update",
          data: {
            created_date: Number(task.created_date),
            stores_id: task.stores_id,
            is_complete: "Done"
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
      safeSetItem("Stores_Task_Assigned_data", previousTasks);
    }
  };

  const handleUpdateLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    showToast("Updating task log...", "info");

    const newLogEntry = {
      action: newAction,
      remark: newRemark.trim(),
      action_by: newActionBy.trim(),
      timestamp: Date.now()
    };

    let logList: any[] = [];
    if (selectedTask.task_log && String(selectedTask.task_log).trim()) {
      try {
        logList = typeof selectedTask.task_log === "string" ? JSON.parse(selectedTask.task_log) : selectedTask.task_log;
      } catch (err) {}
    }
    if (!Array.isArray(logList)) logList = [];
    logList.push(newLogEntry);

    const updatedLogString = JSON.stringify(logList);

    const previousTasks = [...tasks];
    const updated = tasks.map((t) =>
      String(t.created_date) === String(selectedTask.created_date) &&
      String(t.stores_id) === String(selectedTask.stores_id)
        ? { ...t, task_log: updatedLogString, task_action: nextAction }
        : t
    );

    setTasks(updated);
    safeSetItem("Stores_Task_Assigned_data", updated);

    setIsUpdateLogOpen(false);
    setSelectedTask(null);

    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "Stores_Task_Assigned",
          action: "update",
          data: {
            created_date: Number(selectedTask.created_date),
            stores_id: selectedTask.stores_id,
            task_log: updatedLogString,
            task_action: nextAction
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
      safeSetItem("Stores_Task_Assigned_data", previousTasks);
    }
  };

  const pendingTaskQty = React.useMemo(() => {
    return tasks.filter(t => 
      String(t.task_action || "").toLowerCase() === "visit" && 
      String(t.is_complete || "").toLowerCase() !== "done"
    ).length;
  }, [tasks]);

  const merchandiserTasks = React.useMemo(() => {
    const list = tasks.filter(t => String(t.task_action || "").toLowerCase() === "visit");
    list.sort((a, b) => {
      const timeA = parseTimestamp(a.created_date).getTime();
      const timeB = parseTimestamp(b.created_date).getTime();
      return timeB - timeA;
    });

    return list.map((t) => {
      const store = stores.find(s => String(s.id) === String(t.stores_id));
      const storeName = store ? store.display_name : `Store #${t.stores_id}`;

      let logs: any[] = [];
      if (t.task_log && String(t.task_log).trim()) {
        try {
          logs = typeof t.task_log === "string" ? JSON.parse(t.task_log) : t.task_log;
        } catch (e) {}
      }

      let latestActionNode = <span className="text-zinc-400 italic text-[11px]">No logs</span>;
      if (Array.isArray(logs) && logs.length > 0) {
        const latest = logs[logs.length - 1];
        const actionLabel = latest.action || latest.Action || "Action";
        const actionByLabel = latest.action_by || latest["Action by"] || "System User";
        const actionTs = latest.timestamp || latest.Timestamp;

        latestActionNode = (
          <div className="flex flex-col gap-0.5 text-xs text-zinc-700">
            <span className="font-semibold text-zinc-800">
              {actionLabel} by <span className="underline decoration-zinc-400 decoration-1">{actionByLabel}</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {String(formatDateTime(actionTs))}
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
          String(t.is_complete || "").toLowerCase() === "done"
            ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
            : "bg-amber-100 text-amber-700 border border-amber-200"
        }`}>
          {t.is_complete || "Pending"}
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
              setNextAction(t.task_action || "Visit");
              setIsUpdateLogOpen(true);
            }}
            variant="default"
          >
            Update Log
          </CustomButton>
          {String(t.is_complete || "").toLowerCase() !== "done" && (
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
        id: `${t.created_date}_${t.stores_id}`,
        created_date: formatDate(t.created_date),
        store_name: storeName,
        task_action: String(t.task_action || "Visit"),
        task_description: String(t.task_description || ""),
        task_log: logCellNode,
        is_complete: statusBadge,
        actions: actionButtons
      };
    });
  }, [tasks, stores, getRetailerName, parseTimestamp, formatDateTime, formatDate]);

  const taskColumns: Column[] = [
    { id: "created_date", header: "Created Date", accessor: "created_date" },
    { id: "store_name", header: "Store Name", accessor: "store_name" },
    { id: "task_action", header: "Task Action", accessor: "task_action" },
    { id: "task_description", header: "Task Description", accessor: "task_description" },
    { id: "task_log", header: "Latest Log / History", accessor: "task_log" },
    { id: "is_complete", header: "Status", accessor: "is_complete" },
    { id: "actions", header: "Actions", accessor: "actions" }
  ];



  const reportColumns: Column[] = [
    { id: "date", header: "Visit Date", accessor: "date" },
    { id: "retailer_name", header: "Retailer", accessor: "retailer_name" },
    { id: "store_name", header: "Store", accessor: "store_name" },
    { id: "brands", header: "Brands Carry", accessor: "brands" }
  ];

  // Map focus handler when clicking a stop in the side list
  const handleFocusStop = (stop: any) => {
    if (mapRef.current && stop.lat && stop.lng) {
      mapRef.current.flyTo([stop.lat, stop.lng], 16, { animate: true, duration: 0.8 });
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      {/* 1. TOP NAVIGATION TABS */}
      <NavigationTabs 
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={setActiveTab}
      />

      {/* 2. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            {activeTab === "performance" && "Merchandiser Performance"}
            {activeTab === "tracking" && "Field Route Live Tracking"}
            {activeTab === "visit_history" && "Store Visit History & Special Tasks"}
            {activeTab === "setting" && "Deploy System Configuration"}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeTab === "performance" && "Real-time field visit tracking, 12-month historical comparisons, and retailer visit summaries."}
            {activeTab === "tracking" && "Interactive GPS route trails, chronological visit feeds, and store stop sequences for the past 7 days."}
            {activeTab === "visit_history" && "Manage assigned store tasks, field action logs, and audited product visit archives."}
            {activeTab === "setting" && "Configure store visit frequencies, focus retailers, and simulate route scheduling impacts."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "performance" && (
            <CustomButton
              variant="default"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Printer size={14} className="stroke-[2.5]" />
              <span>Print / Export PDF</span>
            </CustomButton>
          )}

          {activeTab === "setting" && !isViewer && (
            <CustomButton
              variant="dark"
              onClick={handleDeploySettings}
              className="flex items-center gap-1.5"
            >
              <Settings2 size={14} className="stroke-[2.5]" />
              <span>Deploy Configuration</span>
            </CustomButton>
          )}
        </div>
      </div>

      {/* 3. MAIN CONTENT VIEWPORT */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* TAB 1: PERFORMANCE */}
        {activeTab === "performance" && (
          <div className="flex flex-col h-full gap-4 overflow-y-auto p-4 animate-tableFadeInOnly">
            {/* Top Stat Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
              <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-start justify-between shadow-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Visits Today</span>
                  <span className="text-xl font-bold text-zinc-950 mt-0.5">{performanceStats.totals.today}</span>
                </div>
                <div className="h-8 w-8 bg-[#E8F0FE] rounded-lg flex items-center justify-center text-[#0B57D0] shrink-0">
                  <Calendar size={16} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-start justify-between shadow-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Visits Selected Week</span>
                  <span className="text-xl font-bold text-zinc-950">{performanceStats.totals.week}</span>
                  <div className="flex items-center gap-1 mt-0.5 bg-slate-100 rounded px-1.5 py-0.5 w-fit border border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => setWeekOffset(prev => Math.max(prev - 1, -52))}
                      disabled={weekOffset === -52}
                      className="p-0.5 rounded hover:bg-slate-200 text-zinc-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed focus:outline-none"
                      title="Previous Week"
                    >
                      <ChevronLeft size={11} className="stroke-[2.5]" />
                    </button>
                    <span className="text-[9px] font-bold text-zinc-700 min-w-[70px] text-center select-none tracking-tight">
                      {formatWeekRange(getWeekRange(weekOffset).monday, getWeekRange(weekOffset).sunday)}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setWeekOffset(prev => Math.min(prev + 1, 0))}
                      disabled={weekOffset === 0}
                      className="p-0.5 rounded hover:bg-slate-200 text-zinc-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed focus:outline-none"
                      title="Next Week"
                    >
                      <ChevronRight size={11} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>
                <div className="h-8 w-8 bg-[#E8F0FE] rounded-lg flex items-center justify-center text-[#0B57D0] shrink-0">
                  <BarChart3 size={16} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-start justify-between shadow-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Visits Selected Month</span>
                  <span className="text-xl font-bold text-zinc-950">{performanceStats.totals.month}</span>
                  <div className="flex items-center gap-1 mt-0.5 bg-slate-100 rounded px-1.5 py-0.5 w-fit border border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => setMonthOffset(prev => Math.max(prev - 1, -12))}
                      disabled={monthOffset === -12}
                      className="p-0.5 rounded hover:bg-slate-200 text-zinc-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed focus:outline-none"
                      title="Previous Month"
                    >
                      <ChevronLeft size={11} className="stroke-[2.5]" />
                    </button>
                    <span className="text-[9px] font-bold text-zinc-700 min-w-[70px] text-center select-none tracking-tight">
                      {formatMonthName(getMonthRange(monthOffset).start)}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setMonthOffset(prev => Math.min(prev + 1, 0))}
                      disabled={monthOffset === 0}
                      className="p-0.5 rounded hover:bg-slate-200 text-zinc-600 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed focus:outline-none"
                      title="Next Month"
                    >
                      <ChevronRight size={11} className="stroke-[2.5]" />
                    </button>
                  </div>
                </div>
                <div className="h-8 w-8 bg-[#E8F0FE] rounded-lg flex items-center justify-center text-[#0B57D0] shrink-0">
                  <Calendar size={16} className="stroke-[2.5]" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 flex items-start justify-between shadow-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pending Special Tasks</span>
                  <span className="text-xl font-bold text-zinc-950 mt-0.5">{pendingTaskQty}</span>
                </div>
                <div className="h-8 w-8 bg-[#E8F0FE] rounded-lg flex items-center justify-center text-[#0B57D0] shrink-0">
                  <ClipboardCheck size={16} className="stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Main breakdown grids */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch flex-grow min-h-0">
              {/* Retailer Breakdown table */}
              <div className="w-full lg:w-[38%] bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col h-[380px] lg:h-auto">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <UsersIcon size={14} className="text-[#0B57D0]" />
                    <span className="font-bold text-xs text-zinc-800 uppercase tracking-wider">Visits per Retailer</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {performanceStats.retailers.length} Retailers
                  </span>
                </div>
                <div className="overflow-y-auto flex-1 min-h-0">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 shadow-2xs">
                      <tr className="border-b border-slate-200 text-zinc-600 font-bold">
                        <th className="py-2.5 px-4 bg-slate-50">Retailer</th>
                        <th className="py-2.5 px-4 text-center bg-slate-50">Today</th>
                        <th className="py-2.5 px-4 text-center bg-slate-50">Week</th>
                        <th className="py-2.5 px-4 text-center bg-slate-50">Month</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {performanceStats.retailers.length > 0 ? (
                        performanceStats.retailers.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-zinc-900">{r.name}</td>
                            <td className="py-2.5 px-4 text-center font-bold text-zinc-700">{r.today}</td>
                            <td className="py-2.5 px-4 text-center font-bold text-zinc-700">{r.week}</td>
                            <td className="py-2.5 px-4 text-center font-bold text-zinc-700">{r.month}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 px-4 text-center text-zinc-400 italic">
                            No visits recorded in the last 365 days.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 12-Month Performance + 3-Month Projection Trend SVG Line Chart */}
              <div className="w-full lg:w-[62%] bg-white border border-slate-200 rounded-lg p-4 shadow-xs relative flex flex-col gap-3 h-auto lg:h-full min-h-[320px] lg:min-h-0">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2.5 gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-[#0B57D0]" />
                    <span className="font-bold text-xs text-zinc-800 uppercase tracking-wider">Performance Trend & 3-Month Projection</span>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold text-zinc-600">
                    <div className="flex items-center gap-1.5">
                      <span className="h-0.5 w-3.5 bg-[#0B57D0] inline-block rounded-full" />
                      <span>Actual (12 Mo)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-0.5 w-3.5 border-t-2 border-dashed border-[#0B57D0] inline-block" />
                      <span>Projected (Next 3 Mo*)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-0.5 w-3.5 border-t border-dotted border-slate-400 inline-block" />
                      <span className="text-zinc-500">Deploy Target ({graphData.deployTarget}/mo)</span>
                    </div>
                  </div>
                </div>

                {/* SVG Render Container */}
                <div className="flex-1 w-full relative min-h-[240px] lg:min-h-0">
                  {fetching ? (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400 italic">
                      Loading graph metrics...
                    </div>
                  ) : (
                    <svg viewBox="0 0 700 260" className="w-full h-full select-none overflow-visible">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0B57D0" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#0B57D0" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0B57D0" stopOpacity="0.08" />
                          <stop offset="100%" stopColor="#0B57D0" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                        const y = 30 + (180 * (1 - p));
                        const val = Math.round(graphData.maxVal * p);
                        return (
                          <g key={idx} className="opacity-40">
                            <line x1="45" y1={y} x2="680" y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
                            <text x="35" y={y + 4} textAnchor="end" className="fill-zinc-500 font-mono text-[9px] font-bold">{val}</text>
                          </g>
                        );
                      })}

                      {/* Deploy Target Reference Line */}
                      {graphData.deployTarget > 0 && (() => {
                        const targetY = 210 - (graphData.maxVal > 0 ? (graphData.deployTarget / graphData.maxVal) * 180 : 0);
                        return (
                          <g>
                            <line x1="45" y1={targetY} x2="680" y2={targetY} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,3" />
                            <text x="680" y={targetY - 4} textAnchor="end" className="fill-slate-400 font-mono text-[8px] font-bold">
                              TARGET: {graphData.deployTarget}
                            </text>
                          </g>
                        );
                      })()}

                      {/* Render Line & Area if data exists */}
                      {graphData.data.length > 0 && (() => {
                        const totalPoints = graphData.data.length;
                        const colWidth = 635 / (totalPoints - 1);
                        const points = graphData.data.map((d, i) => {
                          const px = 45 + (i * colWidth);
                          const py = 210 - (graphData.maxVal > 0 ? (d.totalVisits / graphData.maxVal) * 180 : 0);
                          return { 
                            px, 
                            py, 
                            label: d.label, 
                            val: d.totalVisits, 
                            isProjected: d.isProjected,
                            deployTarget: d.deployTarget,
                            perWeek: (d as any).perWeek,
                            perDay: (d as any).perDay,
                            perDayPerMerch: (d as any).perDayPerMerch,
                            activeMerchCount: (d as any).activeMerchCount
                          };
                        });

                        const histCount = graphData.historicalCount || 12;
                        const histPoints = points.slice(0, histCount);
                        const projPoints = points.slice(histCount - 1); // includes boundary point for contiguous line

                        const histPathD = histPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.px} ${pt.py}`).join(' ');
                        const histAreaD = `${histPathD} L ${histPoints[histPoints.length - 1].px} 210 L 45 210 Z`;

                        const projPathD = projPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.px} ${pt.py}`).join(' ');
                        const projAreaD = `${projPathD} L ${projPoints[projPoints.length - 1].px} 210 L ${projPoints[0].px} 210 Z`;

                        return (
                          <g>
                            {/* Historical Area & Solid Line */}
                            <path d={histAreaD} fill="url(#chartGradient)" />
                            <path 
                              d={histPathD} 
                              fill="none" 
                              stroke="#0B57D0" 
                              strokeWidth="2.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />

                            {/* Projected Area & Dashed Line */}
                            <path d={projAreaD} fill="url(#projGradient)" />
                            <path 
                              d={projPathD} 
                              fill="none" 
                              stroke="#0B57D0" 
                              strokeWidth="2" 
                              strokeDasharray="5,3.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />

                            {/* Data points & Interactive Hover targets */}
                            {points.map((pt, i) => (
                              <g key={i}>
                                <circle
                                  cx={pt.px}
                                  cy={pt.py}
                                  r={12}
                                  fill="transparent"
                                  className="cursor-pointer"
                                  onMouseEnter={() => {
                                    setHoveredPoint({
                                      month: pt.label,
                                      val: pt.val,
                                      x: pt.px,
                                      y: pt.py - 8,
                                      isProjected: pt.isProjected,
                                      deployTarget: pt.deployTarget,
                                      deployTargetDailyPerMerch: (pt as any).deployTargetDailyPerMerch || graphData.deployTargetDailyPerMerch,
                                      perWeek: pt.perWeek,
                                      perDay: pt.perDay,
                                      perDayPerMerch: pt.perDayPerMerch,
                                      activeMerchCount: pt.activeMerchCount
                                    });
                                  }}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                />
                                <circle
                                  cx={pt.px}
                                  cy={pt.py}
                                  r={pt.isProjected ? 3.5 : 4}
                                  fill={pt.isProjected ? "#D3E3FD" : "#ffffff"}
                                  stroke="#0B57D0"
                                  strokeWidth={2}
                                  className="pointer-events-none"
                                />
                              </g>
                            ))}
                          </g>
                        );
                      })()}

                      <line x1="45" y1="210" x2="680" y2="210" stroke="#94a3b8" strokeWidth="1" />
                      
                      {graphData.data.map((m, mIdx) => {
                        const totalPoints = graphData.data.length;
                        const colWidth = 635 / (totalPoints - 1);
                        const px = 45 + (mIdx * colWidth);
                        return (
                          <text 
                            key={mIdx} 
                            x={px} 
                            y="235" 
                            textAnchor="middle" 
                            className={`text-[8.5px] ${m.isProjected ? "fill-[#0B57D0] font-bold" : "fill-zinc-500 font-medium"}`}
                          >
                            {m.label}
                          </text>
                        );
                      })}
                    </svg>
                  )}

                  {hoveredPoint && (
                    <div 
                      className="absolute bg-zinc-950/95 text-white border border-zinc-800 rounded-lg px-3 py-2 shadow-xl text-[10px] font-primary z-30 pointer-events-none flex flex-col gap-1 -translate-x-1/2 -translate-y-full min-w-[190px]"
                      style={{ left: hoveredPoint.x, top: hoveredPoint.y }}
                    >
                      <div className="font-extrabold border-b border-zinc-800 pb-1 text-[9px] uppercase tracking-wider text-zinc-400 flex items-center justify-between gap-2">
                        <span>{hoveredPoint.month}</span>
                        {hoveredPoint.isProjected ? (
                          <span className="text-[#D3E3FD] bg-blue-900/60 px-1.5 py-0.5 rounded text-[8px] font-bold">PROJECTED</span>
                        ) : (
                          <span className="text-zinc-400 text-[8px]">ACTUAL</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-300">Total Visits:</span>
                        <span className="font-bold text-[#D3E3FD]">{hoveredPoint.val}</span>
                      </div>

                      {hoveredPoint.isProjected && (
                        <div className="border-t border-zinc-800 pt-1 flex flex-col gap-0.5 text-[9px]">
                          <div className="flex items-center justify-between text-zinc-300">
                            <span>Per Week (Team):</span>
                            <span className="font-semibold text-white">~{hoveredPoint.perWeek} visits</span>
                          </div>
                          <div className="flex items-center justify-between text-zinc-300">
                            <span>Per Day (Mon-Thu):</span>
                            <span className="font-semibold text-white">~{hoveredPoint.perDay} visits</span>
                          </div>
                          <div className="flex items-center justify-between text-emerald-300 font-semibold pt-0.5">
                            <span>Projected / Merch:</span>
                            <span>~{hoveredPoint.perDayPerMerch} visits/day</span>
                          </div>
                          <span className="text-[7.5px] text-zinc-400 italic">
                            ({hoveredPoint.activeMerchCount || 1} active merch • Mon-Thu schedule)
                          </span>
                        </div>
                      )}

                      {hoveredPoint.deployTarget && hoveredPoint.deployTarget > 0 ? (
                        <div className="border-t border-zinc-800 pt-1 flex flex-col gap-0.5 text-[8.5px]">
                          <div className="flex items-center justify-between text-zinc-400">
                            <span>Deploy Target:</span>
                            <span className="font-bold text-zinc-300">{hoveredPoint.deployTarget}/mo</span>
                          </div>
                          {hoveredPoint.deployTargetDailyPerMerch ? (
                            <div className="flex items-center justify-between text-emerald-400 font-semibold">
                              <span>Max Must Do / Merch:</span>
                              <span>~{hoveredPoint.deployTargetDailyPerMerch} visits/day (Mon-Thu)</span>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Projection Capacity & Pacing Breakdown Bar */}
                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#F8F9FA] rounded-lg p-2.5 shrink-0">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Active Merch (Past 3 Mo)</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-bold text-zinc-950">{graphData.activeMerchCount} Merch</span>
                      {graphData.activeMerchList && graphData.activeMerchList.length > 0 && (
                        <div className="flex -space-x-1 overflow-hidden">
                          {graphData.activeMerchList.slice(0, 4).map((m: any, idx: number) => (
                            <span
                              key={idx}
                              style={{ backgroundColor: m.color }}
                              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[7.5px] font-black text-white ring-1 ring-white"
                              title={m.name}
                            >
                              {m.initials}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[8px] text-zinc-400 mt-0.5">active in last 90 days</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Projected Rate (Next 3 Mo)</span>
                    <span className="text-xs font-bold text-[#0B57D0] mt-0.5">~{graphData.avgProjectedDaily} visits/day</span>
                    <span className="text-[8px] text-zinc-400">~{graphData.avgProjectedWeekly}/wk (team, Mon-Thu)</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Deploy Target Capacity</span>
                    <span className="text-xs font-bold text-zinc-950 mt-0.5">{graphData.deployTarget} visits/mo</span>
                    <span className="text-[8px] text-zinc-400">~{graphData.deployTargetDaily}/day (Mon-Thu capacity)</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Max / Day / Merch (Must Do)</span>
                    <span className="text-xs font-bold text-emerald-700 mt-0.5">~{graphData.deployTargetDailyPerMerch} visits/day</span>
                    <span className="text-[8px] text-zinc-400">Mon - Thu (excl. Fri/Sat/Sun)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MAP TRACKING */}
        {activeTab === "tracking" && (
          <div className="flex flex-col h-full gap-3 overflow-hidden p-3 animate-tableFadeInOnly">
            {/* Top Controls Toolbar: Date Navigation (< >) and Merchandiser Filter Pills */}
            <div className="bg-[#F8F9FA] border border-slate-200 rounded-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0">
              {/* Date Switcher: Last 7 days only */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white rounded-md p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setMapDayOffset(prev => Math.max(prev - 1, -6))}
                    disabled={mapDayOffset <= -6}
                    className="p-1 rounded hover:bg-slate-100 text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none"
                    title="Previous Day (Up to 1 week latest)"
                  >
                    <ChevronLeft size={16} className="stroke-[2.5]" />
                  </button>

                  <div className="px-3 py-1 text-xs font-bold text-zinc-900 select-none min-w-[190px] text-center flex items-center justify-center gap-1.5">
                    <Calendar size={13} className="text-[#0B57D0]" />
                    <span>{selectedDayRange.label}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMapDayOffset(prev => Math.min(prev + 1, 0))}
                    disabled={mapDayOffset >= 0}
                    className="p-1 rounded hover:bg-slate-100 text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none"
                    title="Next Day"
                  >
                    <ChevronRight size={16} className="stroke-[2.5]" />
                  </button>
                </div>

                {mapDayOffset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setMapDayOffset(0)}
                    className="text-xs font-bold text-[#0B57D0] hover:underline px-2 py-1 cursor-pointer"
                  >
                    Back to Today
                  </button>
                )}
              </div>

              {/* Merchandiser Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mr-1">Merchandisers:</span>
                
                <button
                  type="button"
                  onClick={() => setSelectedMerchFilter("all")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 border ${
                    selectedMerchFilter === "all"
                      ? "bg-[#0B57D0] text-white border-[#0B57D0] shadow-xs"
                      : "bg-white text-zinc-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Layers size={12} />
                  <span>All ({Object.keys(dayTrailsData).length})</span>
                </button>

                {Object.entries(dayTrailsData).map(([mId, group]) => {
                  const isSelected = selectedMerchFilter === mId;
                  return (
                    <button
                      key={mId}
                      type="button"
                      onClick={() => setSelectedMerchFilter(isSelected ? "all" : mId)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? "bg-[#0B57D0] text-white border-[#0B57D0] shadow-xs"
                          : "bg-white text-zinc-800 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: group.merchInfo.color }}
                      />
                      <span>{group.merchInfo.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">({group.stops.length})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map & Interactive Trail Timeline Split Layout */}
            <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
              {/* Left Column: Chronological Visits Feed */}
              <div className="w-full lg:w-[320px] bg-white border border-slate-200 rounded-lg flex flex-col overflow-hidden shadow-xs shrink-0">
                <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Navigation size={14} className="text-[#0B57D0]" />
                    <span className="font-bold text-xs text-zinc-800 uppercase tracking-wider">Visited Route Log</span>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {Object.values(dayTrailsData).reduce((acc, g) => acc + g.stops.length, 0)} Stops
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                  {Object.keys(dayTrailsData).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center text-zinc-400 gap-2">
                      <MapPin size={24} className="text-zinc-300" />
                      <span className="text-xs font-semibold">No field visits logged for this day.</span>
                    </div>
                  ) : (
                    Object.entries(dayTrailsData)
                      .filter(([mId]) => selectedMerchFilter === "all" || selectedMerchFilter === mId)
                      .map(([mId, data]) => {
                        const { merchInfo, stops } = data;
                        if (stops.length === 0) return null;

                        return (
                          <div key={mId} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                              <span 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: merchInfo.color }}
                              />
                              <span className="font-bold text-xs text-zinc-900">{merchInfo.name}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">({stops.length} stops)</span>
                            </div>

                            <div className="flex flex-col gap-2">
                              {stops.map((stop, idx) => {
                                const isLast = idx === stops.length - 1;
                                const isFirst = idx === 0 && stops.length > 1;

                                return (
                                  <div
                                    key={stop.id || idx}
                                    onClick={() => handleFocusStop(stop)}
                                    className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-[#0B57D0]/40 transition-all cursor-pointer flex flex-col gap-1 shadow-2xs"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-bold text-xs text-zinc-900 truncate flex items-center gap-1.5">
                                        <span className="text-[10px] font-mono text-zinc-400">#{idx + 1}</span>
                                        <span className="truncate">{stop.storeName}</span>
                                      </span>
                                      <span className="text-[10px] font-mono text-zinc-500 font-bold shrink-0">
                                        {formatTimeStr(stop.timestamp)}
                                      </span>
                                    </div>
                                    
                                    <span className="text-[11px] text-zinc-500 truncate">
                                      {stop.retailerName}
                                    </span>

                                    {isLast && (
                                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0B57D0] mt-0.5">
                                        <MapPin size={11} />
                                        <span>Last Stop ({merchInfo.name})</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Right Column: Full Interactive Map Canvas */}
              <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden relative shadow-xs min-h-[400px]">
                <div id="merch-leaflet-map" className="w-full h-full z-10" />

                {!leafletLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-20">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#0B57D0]" />
                      <span className="text-xs font-semibold text-zinc-500">Loading Map Workspace...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VISIT HISTORY */}
        {activeTab === "visit_history" && (
          <div className="w-full flex flex-col h-full animate-tableFadeInOnly overflow-hidden flex-1 min-h-0 p-3">
            <div className="flex border-b border-slate-200 mb-3 shrink-0">
              <button
                type="button"
                onClick={() => setHistorySubTab("pending")}
                className={`px-4 py-2 text-xs font-bold border-b-2 -mb-[2px] transition-colors cursor-pointer ${
                  historySubTab === "pending"
                    ? "border-[#0B57D0] text-[#0B57D0]"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Pending Special Visit
              </button>
              <button
                type="button"
                onClick={() => setHistorySubTab("visited")}
                className={`px-4 py-2 text-xs font-bold border-b-2 -mb-[2px] transition-colors cursor-pointer ${
                  historySubTab === "visited"
                    ? "border-[#0B57D0] text-[#0B57D0]"
                    : "border-transparent text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Visited
              </button>
            </div>

            {historySubTab === "pending" && (
              <div className="flex-grow min-h-0 flex flex-col">
                <DataTable
                  columns={taskColumns}
                  data={merchandiserTasks}
                  userRole="viewer"
                  title="Pending Special Visit Tasks"
                  fetching={fetching}
                  height="h-full"
                />
              </div>
            )}

            {historySubTab === "visited" && (
              <div className="flex-grow min-h-0 flex flex-col">
                <DataTable
                  columns={reportColumns}
                  data={reportData}
                  userRole="viewer"
                  title="Store Visits History (60 Days)"
                  fetching={fetching}
                  height="h-full"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DEPLOY SETTINGS */}
        {activeTab === "setting" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch h-full w-full overflow-y-auto lg:overflow-hidden p-3 animate-tableFadeInOnly">
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col h-auto lg:h-full justify-between lg:overflow-hidden gap-4">
              <div className="flex flex-col gap-4 flex-grow lg:overflow-y-auto pr-1">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 shrink-0">
                  <Settings2 size={16} className="text-[#0B57D0]" />
                  <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wider">Deploy System Configuration</h3>
                </div>

                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-600">Visit Frequency (Days)</label>
                    <input
                      type="number"
                      disabled={isViewer}
                      value={settingFreq}
                      onChange={(e) => setSettingFreq(Math.max(Number(e.target.value), 1))}
                      placeholder="e.g. 14"
                      className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-zinc-600">Focus Retailers</label>
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
                    <label className="text-xs font-semibold text-zinc-600">Focus Status Stores</label>
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
                    <label className="text-xs font-semibold text-zinc-600">Focus Rank Stores</label>
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
                    <label className="text-xs font-semibold text-zinc-600">Avoid Retailers</label>
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
              </div>

              {!isViewer && (
                <div className="flex justify-end border-t border-slate-200 pt-3 shrink-0">
                  <CustomButton
                    variant="dark"
                    onClick={handleDeploySettings}
                  >
                    Deploy Configuration
                  </CustomButton>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 bg-[#F8F9FA] border border-slate-200 rounded-lg p-5 flex flex-col h-auto lg:h-full gap-4 lg:overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#0B57D0]" strokeWidth={2} />
                  <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wider">Live Metrics Preview</h3>
                </div>
                <span className="text-[10px] font-bold text-[#0B57D0] bg-[#E8F0FE] px-2.5 py-0.5 rounded-full select-none">
                  Simulated Impact
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col gap-0.5 shadow-xs">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center lg:text-left">Active Stores</span>
                  <span className="text-2xl font-black text-zinc-950 text-center lg:text-left">{settingCalculation.totalActive}</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col gap-0.5 shadow-xs">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider text-center lg:text-left">Have Visited</span>
                  <span className="text-2xl font-black text-emerald-700 text-center lg:text-left">{settingCalculation.totalVisited}</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col gap-0.5 shadow-xs">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider text-center lg:text-left">Pending Visit</span>
                  <span className="text-2xl font-black text-amber-700 text-center lg:text-left">{settingCalculation.totalPending}</span>
                </div>
              </div>

              <div className="flex flex-col flex-grow min-h-0 gap-3">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-xs font-semibold text-zinc-600">Group breakdown</span>
                  
                  <div className="flex bg-slate-200/70 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCalcGroupBy("zone")}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
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
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                        calcGroupBy === "retailer"
                          ? "bg-white text-zinc-950 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      By Retailers
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex-grow min-h-[260px] lg:min-h-0 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 font-bold text-zinc-600">
                        <th className="py-2.5 px-4">{calcGroupBy === "zone" ? "Store Zone" : "Retailer Name"}</th>
                        <th className="py-2.5 px-4 text-center">Total</th>
                        <th className="py-2.5 px-4 text-center text-emerald-700 font-bold">Visited</th>
                        <th className="py-2.5 px-4 text-center text-amber-700 font-bold">Pending</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calcGroupBy === "zone" ? (
                        settingCalculation.byZone.length > 0 ? (
                          settingCalculation.byZone.map((z, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-4 font-semibold text-zinc-800">{z.name}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-zinc-700">{z.total}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-emerald-600">{z.visited}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-amber-600">{z.pending}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 px-4 text-center text-zinc-400 italic">
                              No data matching filters.
                            </td>
                          </tr>
                        )
                      ) : (
                        settingCalculation.byRetailer.length > 0 ? (
                          settingCalculation.byRetailer.map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-4 font-semibold text-zinc-800">{r.name}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-zinc-700">{r.total}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-emerald-600">{r.visited}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-amber-600">{r.pending}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 px-4 text-center text-zinc-400 italic">
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
      </div>

      {/* MODAL 1: Shelf Image Preview */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-3xl max-h-[85vh] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-11 flex items-center justify-between px-5 bg-slate-50 border-b border-slate-200 select-none">
              <span className="font-bold text-xs text-zinc-800 uppercase tracking-wider select-none">
                Shelf Image Preview
              </span>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-lg hover:bg-slate-200/70 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer focus:outline-none"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 flex items-center justify-center bg-slate-100 overflow-auto max-h-[calc(85vh-90px)]">
              <img 
                src={selectedImage} 
                alt="Shelf Preview" 
                className="max-w-full max-h-[60vh] object-contain rounded-lg border border-slate-200 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Failed+to+Load+Image";
                }}
              />
            </div>
            
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-2.5 flex justify-between items-center text-xs text-zinc-500 font-mono select-none">
              <span className="truncate max-w-[70%]">{selectedImage}</span>
              <a 
                href={selectedImage} 
                target="_blank" 
                rel="noreferrer" 
                className="text-[#0B57D0] hover:underline font-bold cursor-pointer"
              >
                Open Original ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Append Action Log Form */}
      {isUpdateLogOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <form
            onSubmit={handleUpdateLogSubmit}
            className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#0B57D0]" />
                <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wider">Append Action Log</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUpdateLogOpen(false);
                  setSelectedTask(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-200/70 text-zinc-400 hover:text-zinc-700 focus:outline-none"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Target Store</span>
                <span className="text-xs font-bold text-zinc-900">
                  {stores.find(s => String(s.id) === String(selectedTask.stores_id))?.display_name || `Store #${selectedTask.stores_id}`}
                </span>
                <span className="text-xs text-zinc-500 italic mt-0.5">
                  &ldquo;{selectedTask.task_description}&rdquo;
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Perform Action</label>
                <select
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value as any)}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] cursor-pointer"
                  required
                >
                  <option value="Visit">Visit</option>
                  <option value="Call">Call</option>
                  <option value="Check Last Order">Check Last Order</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Next Action Required</label>
                <select
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value as any)}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] cursor-pointer"
                  required
                >
                  <option value="Visit">Visit</option>
                  <option value="Call">Call</option>
                  <option value="Check Last Order">Check Last Order</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Action Remark</label>
                <textarea
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder="E.g., Visit made to verify inventory. Checked displays and stock."
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] resize-none font-medium"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Action Logged By</label>
                <input
                  type="text"
                  value={newActionBy}
                  onChange={(e) => setNewActionBy(e.target.value)}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-semibold"
                  placeholder="Your Name"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-3 bg-slate-50">
              <CustomButton
                type="button"
                onClick={() => {
                  setIsUpdateLogOpen(false);
                  setSelectedTask(null);
                }}
                variant="default"
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

      {/* MODAL 3: Log History Timeline Sidebar */}
      {isHistoryOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          <div 
            onClick={() => {
              setIsHistoryOpen(false);
              setSelectedTask(null);
            }}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
          />

          <div 
            className="relative w-full max-w-md h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-5 bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#0B57D0]" />
                <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wider">Log History Timeline</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsHistoryOpen(false);
                  setSelectedTask(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-200/70 text-zinc-400 hover:text-zinc-700 focus:outline-none"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            <div className="mx-5 my-3 flex flex-col gap-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-zinc-700 flex-shrink-0 font-primary">
              <span className="font-bold text-zinc-900">
                Store: {stores.find(s => String(s.id) === String(selectedTask.stores_id))?.display_name || `Store #${selectedTask.stores_id}`}
              </span>
              <p className="text-zinc-500 italic mt-0.5">&ldquo;{selectedTask.task_description}&rdquo;</p>
              <span className="text-[10px] text-zinc-400 font-mono mt-1">
                Assigned: {String(formatDateTime(selectedTask.created_date))}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pr-4 pb-5 flex flex-col gap-4 relative pl-9">
              <div className="absolute left-[29px] top-2 bottom-6 w-0.5 bg-slate-200" />

              {selectedTaskLogs.length > 0 ? (
                selectedTaskLogs.map((log: any, idx: number) => {
                  const act = log.action || log.Action || "Visit";
                  const actBy = log.action_by || log["Action by"] || "System User";
                  const rem = log.remark || log.Remark || "No remark logged";
                  const ts = log.timestamp || log.Timestamp;

                  const actionColor =
                    act === "Check Last Order" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                    act === "Visit" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <div key={idx} className="relative flex gap-3.5 text-xs font-primary">
                      <div className="relative z-10 w-4 h-4 rounded-full flex items-center justify-center bg-[#0B57D0] text-white font-bold text-[8px] flex-shrink-0 mt-0.5 shadow-2xs">
                        {idx + 1}
                      </div>

                      <div className="flex flex-col gap-1.5 bg-white border border-slate-200 rounded-lg p-3 w-full shadow-xs">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${actionColor}`}>
                            {act}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {String(formatDateTime(ts))}
                          </span>
                        </div>
                        <p className="text-zinc-700 text-xs italic font-medium leading-relaxed">
                          &ldquo;{rem}&rdquo;
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold border-t border-slate-100 pt-1.5 mt-1">
                          <UserCheck size={11} className="text-zinc-400" />
                          <span>Action by: <span className="text-zinc-800 underline decoration-slate-300">{actBy}</span></span>
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

            <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between gap-3 flex-shrink-0">
              <CustomButton
                type="button"
                onClick={() => {
                  setIsHistoryOpen(false);
                  setSelectedTask(null);
                }}
                variant="default"
                className="w-1/2 flex justify-center"
              >
                Close
              </CustomButton>
              <CustomButton
                type="button"
                onClick={() => {
                  setNewAction("Visit");
                  setNewRemark("");
                  setNewActionBy("");
                  setNextAction(selectedTask.task_action || "Visit");
                  setIsUpdateLogOpen(true);
                  setIsHistoryOpen(false);
                }}
                variant="dark"
                className="w-1/2 flex justify-center"
              >
                Update Task
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Print Performance Report */}
      {isPrintModalOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
          onClick={() => setIsPrintModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 font-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 flex items-center justify-between bg-slate-50 border-b border-slate-200 select-none">
              <span className="font-bold text-xs text-zinc-800 uppercase tracking-wider flex items-center gap-1.5">
                <Printer size={14} className="text-[#0B57D0]" />
                Print Performance Report
              </span>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200/70 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600">Report Frequency Type</label>
                <div className="flex bg-slate-200/70 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPrintReportType("weekly")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      printReportType === "weekly"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    Weekly Report
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintReportType("monthly")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      printReportType === "monthly"
                        ? "bg-white text-zinc-950 shadow-xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    Monthly Report
                  </button>
                </div>
              </div>

              {printReportType === "weekly" ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600">Select Week Range</label>
                  <select
                    value={selectedPrintWeekIndex}
                    onChange={(e) => setSelectedPrintWeekIndex(Number(e.target.value))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-semibold cursor-pointer"
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
                  <label className="text-xs font-semibold text-zinc-600">Select Month</label>
                  <select
                    value={selectedPrintMonthIndex}
                    onChange={(e) => setSelectedPrintMonthIndex(Number(e.target.value))}
                    className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-semibold cursor-pointer"
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

            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-end gap-2.5">
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
