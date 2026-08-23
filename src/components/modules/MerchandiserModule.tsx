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

// Suggestions presets for Settings
const statusSuggestions = ["Carry", "Not Carry"];
const rankSuggestions = ["Top 10", "Bottom 10", "Rank A", "Rank B", "Rank C"];

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
      <div className={`flex flex-wrap gap-1.5 p-2 bg-[#F0F4F9] border border-slate-200 rounded min-h-[38px] items-center focus-within:border-blue-400 ${disabled ? "bg-zinc-100 cursor-not-allowed" : ""}`}>
        {tags.map((tag, idx) => (
          <span 
            key={idx} 
            className="bg-white text-zinc-800 border border-slate-200 text-xs px-2 py-0.5 rounded flex items-center gap-1 font-semibold shadow-2xs"
          >
            <span>{tag}</span>
            {!disabled && (
              <button 
                type="button" 
                onClick={() => removeTag(idx)} 
                className="text-zinc-400 hover:text-zinc-800 cursor-pointer focus:outline-none"
              >
                <X size={12} />
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
          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mr-1">Suggestions:</span>
          {unusedSuggestions.slice(0, 5).map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => addTag(s)}
              className="text-[10px] bg-zinc-200/60 hover:bg-zinc-300/80 text-zinc-700 font-semibold px-1.5 py-0.5 rounded cursor-pointer transition-colors border border-zinc-300/40"
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
  const [hoveredPoint, setHoveredPoint] = React.useState<{ month: string; val: number; x: number; y: number } | null>(null);

  // PDF Print Dialog Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = React.useState(false);
  const [printReportType, setPrintReportType] = React.useState<"weekly" | "monthly">("weekly");
  const [selectedPrintWeekIndex, setSelectedPrintWeekIndex] = React.useState(0);
  const [selectedPrintMonthIndex, setSelectedPrintMonthIndex] = React.useState(0);

  // Dynamic Navigation Header tabs
  const tabs = [
    { id: "performance", label: "Performance" },
    { id: "tracking", label: "Track Merch" },
    { id: "setting", label: "Deploy" },
    { id: "visit_history", label: "Visit History" }
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
    if (!store) return "Unknown";
    const retailerId = store.retailers_id || store.retailer_id;
    if (!retailerId) return store.display_name || "Unknown";
    const retailer = retailers.find(r => 
      String(r.id).toLowerCase() === String(retailerId).toLowerCase() ||
      String(r.retailers_id || "").toLowerCase() === String(retailerId).toLowerCase()
    );
    return retailer ? (retailer.display_name || retailer.id) : String(retailerId);
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

  // Helper to fetch and cache json
  const fetchSheet = async (sheetName: string) => {
    const res = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/merchandiser?table=${sheetName}`);
    if (!res.ok) throw new Error(`Failed to fetch ${sheetName}`);
    const json = await res.json();
    const items = Array.isArray(json) ? json : (json.value || []);
    localStorage.setItem(`${sheetName}_data`, JSON.stringify(items));
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

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
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
      localStorage.setItem("Merch_Visit_Setting_data", JSON.stringify(newSettings));
      
      showToast("Settings deployed successfully to the database!", "success");
      fetchFreshData("Merch_Visit_Setting", false);
    } catch (e: any) {
      showToast("Deploy failed: " + e.message, "error");
    }
  };

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

  // 12-Month Performance Graph Calculations
  const graphData = React.useMemo(() => {
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
        const logDate = parseTimestamp(log.timestamp);
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
    localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(updated));

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
      localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(previousTasks));
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
    localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(updated));

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
      localStorage.setItem("Stores_Task_Assigned_data", JSON.stringify(previousTasks));
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
        const storeStatus = store.status || "";
        if (!settingFocusStatus.includes(storeStatus)) return false;
      }
      if (settingFocusRank.length > 0) {
        const storeRank = store.store_rank || "";
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

    const storeStatusList = filtered.map(store => {
      const storeId = String(store.id);
      const latestTs = latestVisitsMap[storeId] || 0;
      const hasVisited = latestTs > 0 && (nowTime - latestTs) <= frequencyThresholdMs;
      return {
        store,
        hasVisited,
        zone: store.zones || "Unknown",
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
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] font-primary relative min-w-0">
      <div className="content-header">
        <NavigationTabs 
          tabs={tabs}
          activeTabId={activeTab}
          onTabSelect={setActiveTab}
        />
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {/* TAB 1: PERFORMANCE */}
        {activeTab === "performance" && (
          <div className="flex flex-col h-full gap-6 animate-tableFadeInOnly overflow-y-auto lg:overflow-hidden p-1">
            {/* Top Stat Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              <div className="bg-white border border-slate-200 rounded p-5 flex items-center justify-between shadow-xs hover:scale-[1.01] hover:shadow-sm transition-all duration-200">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Visits Today</span>
                  <span className="text-3xl font-black text-zinc-950 mt-1">{performanceStats.totals.today}</span>
                </div>
                <div className="h-10 w-10 bg-[#E8F0FE] rounded flex items-center justify-center text-[#1A73E8] border border-transparent">
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
            <div className="flex flex-col lg:flex-row gap-6 items-stretch flex-grow min-h-0">
              {/* Retailer Breakdown table */}
              <div className="w-full lg:w-[40%] bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col h-auto lg:h-full">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
                  <UsersIcon size={14} className="text-zinc-600" />
                  <span className="font-bold text-xs text-zinc-700 uppercase tracking-wider">Visits per Retailer</span>
                </div>
                <div className="overflow-auto flex-grow min-h-[300px] lg:min-h-0">
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

              {/* Monthly Grouped Bar Chart converted to Line Chart */}
              <div className="w-full lg:w-[60%] bg-white border border-slate-200 rounded-lg p-4 shadow-xs relative flex flex-col gap-3 h-auto lg:h-full min-h-[360px] lg:min-h-0">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
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
                <div className="flex-1 w-full relative min-h-[280px] lg:min-h-0">
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
                            <path d={areaD} fill="url(#chartGradient)" />
                            <path 
                              d={pathD} 
                              fill="none" 
                              stroke="#6366f1" 
                              strokeWidth="3" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
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
                                    });
                                  }}
                                  onMouseLeave={() => setHoveredPoint(null)}
                                />
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

                      <line x1="45" y1="240" x2="680" y2="240" stroke="#a1a1aa" strokeWidth="1.5" />
                      
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

        {/* TAB 2: MAP TRACKING (1 WEEK LATEST TRAIL & PINS) */}
        {activeTab === "tracking" && (
          <div className="flex flex-col h-full gap-3 animate-tableFadeInOnly overflow-hidden p-0.5">
            {/* Top Controls Toolbar: Date Navigation (< >) and Merchandiser Filter Pills */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs shrink-0">
              {/* Date Switcher: Last 7 days only */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setMapDayOffset(prev => Math.max(prev - 1, -6))}
                    disabled={mapDayOffset <= -6}
                    className="p-1.5 rounded hover:bg-slate-200 text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none"
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
                    className="p-1.5 rounded hover:bg-slate-200 text-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-none"
                    title="Next Day"
                  >
                    <ChevronRight size={16} className="stroke-[2.5]" />
                  </button>
                </div>

                {mapDayOffset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setMapDayOffset(0)}
                    className="text-[11px] font-bold text-[#0B57D0] hover:underline px-2 py-1 cursor-pointer"
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
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 border ${
                    selectedMerchFilter === "all"
                      ? "bg-[#0B57D0] text-white border-[#0B57D0] shadow-xs"
                      : "bg-slate-50 text-zinc-700 border-slate-200 hover:bg-slate-100"
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
                      className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isSelected
                          ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
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
                  <span className="text-[10px] font-extrabold text-zinc-500 bg-slate-200/70 px-2 py-0.5 rounded">
                    {Object.values(dayTrailsData).reduce((acc, g) => acc + g.stops.length, 0)} Total Stops
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
                  {Object.keys(dayTrailsData).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center text-zinc-400 gap-2">
                      <MapPin size={32} className="stroke-[1.5] text-zinc-300" />
                      <span className="text-xs font-semibold">No merchandiser visits recorded for {selectedDayRange.label}.</span>
                    </div>
                  ) : (
                    Object.entries(dayTrailsData)
                      .filter(([mId]) => selectedMerchFilter === "all" || selectedMerchFilter === mId)
                      .map(([mId, group]) => {
                        const { merchInfo, stops } = group;
                        return (
                          <div key={mId} className="flex flex-col gap-2 bg-[#F8F9FC] border border-slate-200/80 rounded-lg p-2.5">
                            {/* Merchandiser Sub-Header */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-5 h-5 rounded-full text-white text-[9px] font-black flex items-center justify-center shadow-xs"
                                  style={{ backgroundColor: merchInfo.color }}
                                >
                                  {merchInfo.initials}
                                </div>
                                <span className="font-bold text-xs text-zinc-900">{merchInfo.name}</span>
                              </div>
                              <span className="text-[10px] font-bold text-zinc-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {stops.length} {stops.length === 1 ? "Stop" : "Stops"}
                              </span>
                            </div>

                            {/* Stops Sequence */}
                            <div className="flex flex-col gap-1.5 relative pl-4 mt-1">
                              {/* Vertical Line */}
                              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-slate-300" />

                              {stops.map((stop, idx) => {
                                const isLast = idx === stops.length - 1;
                                const isFirst = idx === 0 && stops.length > 1;

                                return (
                                  <div 
                                    key={stop.id}
                                    onClick={() => handleFocusStop(stop)}
                                    className={`relative flex items-start gap-2 p-2 rounded border transition-all cursor-pointer ${
                                      isLast 
                                        ? "bg-slate-50 border-slate-300 hover:bg-slate-100/80" 
                                        : "bg-white border-slate-200 hover:bg-slate-50"
                                    }`}
                                  >
                                    {/* Stop Shape Node */}
                                    {isLast ? (
                                      <div 
                                        className="absolute -left-[13px] top-2.5 w-2.5 h-2.5 rounded-xs border-2 border-white shadow-2xs"
                                        style={{ backgroundColor: merchInfo.color, filter: "brightness(0.7)" }}
                                      />
                                    ) : isFirst ? (
                                      <div 
                                        className="absolute -left-[13px] top-2.5 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[9px]"
                                        style={{ borderBottomColor: merchInfo.color }}
                                      />
                                    ) : (
                                      <div 
                                        className="absolute -left-[13px] top-2.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-2xs"
                                        style={{ backgroundColor: merchInfo.color }}
                                      />
                                    )}

                                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-xs text-zinc-900 truncate">
                                          #{idx + 1}. {stop.storeName}
                                        </span>
                                        <span className="text-[9px] font-mono text-zinc-500 font-bold shrink-0">
                                          {formatTimeStr(stop.timestamp)}
                                        </span>
                                      </div>
                                      
                                      <span className="text-[10px] text-zinc-500 truncate">
                                        {stop.retailerName}
                                      </span>

                                      {isLast && (
                                        <div className="inline-flex items-center gap-1 text-[9px] font-extrabold text-zinc-700 mt-0.5">
                                          <MapPin size={10} className="text-zinc-600" />
                                          <span>Last Stop ({merchInfo.name})</span>
                                        </div>
                                      )}
                                    </div>
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
          <div className="w-full flex flex-col h-full animate-tableFadeInOnly overflow-hidden flex-1 min-h-0">
            <div className="flex border-b border-zinc-200 mb-3 shrink-0">
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
                  title="Pending Special Visit"
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-auto lg:h-full w-full max-w-7xl mx-auto animate-tableFadeInOnly overflow-y-auto lg:overflow-hidden p-1">
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-3xs flex flex-col h-auto lg:h-full justify-between lg:overflow-hidden gap-5">
              <div className="flex flex-col gap-5 flex-grow lg:overflow-y-auto pr-1">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 shrink-0">
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
              </div>

              {!isViewer && (
                <div className="flex justify-end border-t border-zinc-300 pt-4 shrink-0">
                  <CustomButton
                    variant="dark"
                    onClick={handleDeploySettings}
                  >
                    Deploy Configuration
                  </CustomButton>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 bg-[#F8F9FC] border border-slate-200 rounded-lg p-5 flex flex-col h-auto lg:h-full gap-5 lg:overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#0B57D0]" strokeWidth={2} />
                  <h3 className="font-bold text-sm text-zinc-800 uppercase tracking-wider">Live Metrics Preview</h3>
                </div>
                <span className="text-[10px] font-bold text-[#0B57D0] bg-[#E8F0FE] px-2 py-0.5 rounded select-none">
                  Simulated Impact
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 shrink-0">
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

              <div className="flex flex-col flex-grow min-h-0 gap-3">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Group breakdown</span>
                  
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

                <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-3xs flex-grow min-h-[300px] lg:min-h-0 overflow-y-auto">
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
      </div>

      {selectedImage && (
        <div 
          className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-tableFadeInOnly p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-3xl max-h-[85vh] bg-[#EEEEEE] border border-zinc-300 rounded-lg shadow-xl overflow-hidden flex flex-col animate-modalSlideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-10 flex items-center justify-between px-4 bg-[#E5E5E5] border-b border-zinc-300 select-none">
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
                  {stores.find(s => String(s.id) === String(selectedTask.stores_id))?.display_name || `Store #${selectedTask.stores_id}`}
                </span>
                <span className="text-[10px] text-zinc-500 italic mt-0.5">
                  &ldquo;{selectedTask.task_description}&rdquo;
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
          
          <div 
            onClick={() => {
              setIsHistoryOpen(false);
              setSelectedTask(null);
            }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-backdropFadeIn"
          />

          <div 
            className="relative w-full max-w-md h-full bg-[#EEEEEE] border-l border-zinc-300 shadow-2xl flex flex-col z-10 animate-sidebarSlideIn"
            onClick={(e) => e.stopPropagation()}
          >
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

            <div className="mx-6 my-4 flex flex-col gap-1 bg-zinc-200/50 border border-zinc-300/50 rounded p-3 text-xs text-zinc-700 flex-shrink-0 font-primary">
              <span className="font-bold text-zinc-800">
                Store: {stores.find(s => String(s.id) === String(selectedTask.stores_id))?.display_name || `Store #${selectedTask.stores_id}`}
              </span>
              <p className="text-zinc-500 italic mt-0.5">&ldquo;{selectedTask.task_description}&rdquo;</p>
              <span className="text-[10px] text-zinc-400 font-mono mt-1">
                Assigned: {String(formatDateTime(selectedTask.created_date))}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pr-4 pb-6 flex flex-col gap-5 relative pl-10">
              <div className="absolute left-[33px] top-2 bottom-6 w-0.5 bg-zinc-300" />

              {selectedTaskLogs.length > 0 ? (
                selectedTaskLogs.map((log: any, idx: number) => {
                  const act = log.action || log.Action || "Visit";
                  const actBy = log.action_by || log["Action by"] || "System User";
                  const rem = log.remark || log.Remark || "No remark logged";
                  const ts = log.timestamp || log.Timestamp;

                  const actionColor =
                    act === "Check Last Order" ? "bg-indigo-500 text-white border-indigo-600" :
                    act === "Visit" ? "bg-emerald-500 text-white border-emerald-600" :
                    "bg-amber-500 text-white border-amber-600";

                  return (
                    <div key={idx} className="relative flex gap-4 text-xs font-primary">
                      <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center border font-black text-[8px] flex-shrink-0 shadow-2xs ${actionColor}`}>
                        {act.substring(0, 1).toUpperCase()}
                      </div>

                      <div className="flex flex-col gap-1 bg-[#E5E5E5]/40 border border-zinc-300/30 rounded-lg p-3 w-full shadow-2xs hover:bg-[#E5E5E5]/60 transition-colors">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-extrabold text-zinc-800 uppercase tracking-wide text-[10px]">
                            {act}
                          </span>
                          <span className="text-[9px] text-zinc-400 font-mono">
                            {String(formatDateTime(ts))}
                          </span>
                        </div>
                        <p className="text-zinc-600 text-xs italic font-medium leading-relaxed">
                          &ldquo;{rem}&rdquo;
                        </p>
                        <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-bold border-t border-zinc-300/20 pt-1.5 mt-1">
                          <UserCheck size={10} className="text-zinc-400" />
                          <span>Action by: <span className="text-zinc-700 underline decoration-zinc-400/80">{actBy}</span></span>
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
                  setNextAction(selectedTask.task_action || "Visit");
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

      {isPrintModalOpen && (
        <div 
          className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn"
          onClick={() => setIsPrintModalOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#EEEEEE] border border-zinc-300 rounded-lg shadow-xl overflow-hidden animate-modalSlideUp font-primary"
            onClick={(e) => e.stopPropagation()}
          >
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

            <div className="p-5 flex flex-col gap-4">
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
