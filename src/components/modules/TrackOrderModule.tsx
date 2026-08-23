"use client";

import * as React from "react";
import { showToast } from "@/lib/toast";
import { CustomButton } from "../custom-button";
import { NavigationTabs } from "../navigation-tabs";
import { ConfirmDialog } from "../confirm-dialog";
import { 
  Upload, 
  X, 
  Trash2, 
  Send, 
  Undo, 
  Check, 
  Plus, 
  FileText, 
  MapPin, 
  History, 
  CheckCircle, 
  ChevronRight, 
  Eye, 
  Boxes,
  Clock,
  Pencil,
  Calendar,
  ClipboardCheck,
  BarChart3,
  Loader2,
  Truck,
  Route,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Square,
  Search
} from "lucide-react";
import * as XLSX from "xlsx";

interface SKUItem {
  sku: string;
  qty: number;
}

export interface DriverLogDiscrepancy {
  sku: string;
  qty_ordered: number;
  qty_delivered: number;
  remark?: string;
}

export interface DriverLogCompletedEntry {
  id: string; // e.g. "DO002140_SC14-PO-216173"
  timestamp: number;
  signed_paper_img?: string;
  supporting_images?: string[];
  discrepancies?: DriverLogDiscrepancy[];
}

export interface DriverLogRecord {
  id: string; // e.g. "JOB-1787106787169"
  driver: string;
  status: "ON" | "OFF" | string;
  start_time: number | string;
  end_time?: number | string;
  active_orders: string; // JSON string array of IDs
  driver_logs: string; // JSON string array of DriverLogCompletedEntry
  outsource_driver_details?: string;
}

interface TrackOrderDraft {
  id: string; // Combined DO_Ref
  doNumber: string;
  refNumber: string;
  mark: string; // A, B, C, D
  type: "Normal" | "Urgent" | "Appointment" | "Return";
  deliverTo: string;
  poscode: string;
  items: SKUItem[];
  appointmentDate?: string;
  appointmentTimeWindow?: string;
  deadline?: number;
  deliverMethod?: string;
  latitude?: number | string;
  longitude?: number | string;
  pdfImages?: string[];
}

interface LogEntry {
  action: string;
  actionBy: string;
  remark?: string;
  timestamp: number;
  photoUrl?: string;
}

interface DbOrder {
  id: string;
  do_number: string;
  ref_number: string;
  mark: string;
  type: string;
  deliver_to: string;
  poscode: string;
  items: string; // JSON string of SKUItem[]
  status: string; // Ready to Pick, Picking, Ready to Deliver, Load, Out for Delivery, Delivered
  logs: string; // JSON string of LogEntry[]
  timestamp: number; // Created timestamp
  delivered_at?: number | string; // Delivered timestamp
  completed?: string | boolean; // "true" or true when archived by admin
  deadline?: number | string;
  deliver_method?: string;
  latitude?: number | string;
  longitude?: number | string;
  photo_do_paper?: string;
  photo_do_paper_signed?: string;
  photo_delivered_proof?: string;
  photo_handover_proof?: string;
  photo_picker_proof?: string;
  photo_return_paper?: string;
  photo_return_paper_admin?: string;
  driver?: string;
  invoice_number?: string;
  credit_note_number?: string;
  invoice_amount?: string;
}

interface TrackOrderModuleProps {
  profile?: {
    role: string;
    name?: string;
    email?: string;
  } | null;
}

// Singapore coordinate prefix mapping helper
function getSingaporeLatLng(poscode: string): { lat: number; lng: number } {
  let clean = String(poscode || "").trim();
  if (!clean) return { lat: 1.3521, lng: 103.8198 }; // Center of SG
  
  // Pad with leading zero if it's a 5-digit number (e.g. 43956 -> 043956)
  if (/^\d+$/.test(clean)) {
    clean = clean.padStart(6, '0');
  }
  
  if (clean.length < 2) return { lat: 1.3521, lng: 103.8198 };
  const prefix = clean.substring(0, 2);
  const mapping: Record<string, { lat: number; lng: number }> = {
    "01": { lat: 1.277, lng: 103.852 }, "02": { lat: 1.277, lng: 103.852 }, "03": { lat: 1.277, lng: 103.852 },
    "04": { lat: 1.277, lng: 103.852 }, "05": { lat: 1.277, lng: 103.852 }, "06": { lat: 1.277, lng: 103.852 },
    "07": { lat: 1.274, lng: 103.844 }, "08": { lat: 1.274, lng: 103.844 },
    "09": { lat: 1.267, lng: 103.822 }, "10": { lat: 1.267, lng: 103.822 },
    "14": { lat: 1.288, lng: 103.810 }, "15": { lat: 1.288, lng: 103.810 }, "16": { lat: 1.288, lng: 103.810 },
    "11": { lat: 1.292, lng: 103.778 }, "12": { lat: 1.292, lng: 103.778 }, "13": { lat: 1.292, lng: 103.778 },
    "17": { lat: 1.292, lng: 103.778 }, "18": { lat: 1.292, lng: 103.778 }, "19": { lat: 1.292, lng: 103.778 },
    "20": { lat: 1.292, lng: 103.778 }, "21": { lat: 1.292, lng: 103.778 },
    "22": { lat: 1.303, lng: 103.834 }, "23": { lat: 1.303, lng: 103.834 }, "24": { lat: 1.303, lng: 103.834 },
    "25": { lat: 1.303, lng: 103.834 }, "26": { lat: 1.303, lng: 103.834 }, "27": { lat: 1.303, lng: 103.834 },
    "28": { lat: 1.325, lng: 103.839 }, "29": { lat: 1.325, lng: 103.839 }, "30": { lat: 1.325, lng: 103.839 },
    "31": { lat: 1.332, lng: 103.847 }, "32": { lat: 1.332, lng: 103.847 }, "33": { lat: 1.332, lng: 103.847 },
    "34": { lat: 1.325, lng: 103.871 }, "35": { lat: 1.325, lng: 103.871 }, "36": { lat: 1.325, lng: 103.871 }, "37": { lat: 1.325, lng: 103.871 },
    "38": { lat: 1.318, lng: 103.886 }, "39": { lat: 1.318, lng: 103.886 }, "40": { lat: 1.318, lng: 103.886 }, "41": { lat: 1.318, lng: 103.886 },
    "42": { lat: 1.305, lng: 103.905 }, "43": { lat: 1.305, lng: 103.905 }, "44": { lat: 1.305, lng: 103.905 }, "45": { lat: 1.305, lng: 103.905 },
    "46": { lat: 1.324, lng: 103.929 }, "47": { lat: 1.324, lng: 103.929 }, "48": { lat: 1.324, lng: 103.929 },
    "49": { lat: 1.364, lng: 103.991 }, "50": { lat: 1.364, lng: 103.991 },
    "51": { lat: 1.353, lng: 103.944 }, "52": { lat: 1.353, lng: 103.944 },
    "53": { lat: 1.361, lng: 103.886 }, "54": { lat: 1.361, lng: 103.886 }, "55": { lat: 1.361, lng: 103.886 },
    "56": { lat: 1.369, lng: 103.848 }, "57": { lat: 1.369, lng: 103.848 },
    "58": { lat: 1.344, lng: 103.774 }, "59": { lat: 1.344, lng: 103.774 },
    "60": { lat: 1.326, lng: 103.722 }, "61": { lat: 1.326, lng: 103.722 }, "62": { lat: 1.326, lng: 103.722 }, "63": { lat: 1.326, lng: 103.722 }, "64": { lat: 1.326, lng: 103.722 },
    "65": { lat: 1.358, lng: 103.750 }, "66": { lat: 1.358, lng: 103.750 }, "67": { lat: 1.358, lng: 103.750 }, "68": { lat: 1.358, lng: 103.750 },
    "69": { lat: 1.411, lng: 103.705 }, "70": { lat: 1.411, lng: 103.705 }, "71": { lat: 1.411, lng: 103.705 },
    "72": { lat: 1.437, lng: 103.779 }, "73": { lat: 1.437, lng: 103.779 },
    "75": { lat: 1.430, lng: 103.828 }, "76": { lat: 1.430, lng: 103.828 },
    "77": { lat: 1.396, lng: 103.818 }, "78": { lat: 1.396, lng: 103.818 },
    "79": { lat: 1.409, lng: 103.870 }, "80": { lat: 1.409, lng: 103.870 },
    "81": { lat: 1.390, lng: 103.902 }, "82": { lat: 1.390, lng: 103.902 }
  };
  return mapping[prefix] || { lat: 1.3521, lng: 103.8198 };
}

// Validate Singapore Poscode
function validatePoscode(code: any) {
  const clean = String(code || "").trim();
  return /^\d{5,6}$/.test(clean);
}

// Fetch exact coordinates from public Singapore OneMap API
async function fetchPostcodeCoordinates(
  poscode: string,
  baseUrl = "https://www.onemap.gov.sg/api/common/elastic/search",
  token?: string
): Promise<{ lat: number, lng: number } | null> {
  const clean = String(poscode || "").trim();
  if (!clean) return null;
  
  let padded = clean;
  if (/^\d+$/.test(clean)) {
    padded = clean.padStart(6, '0');
  }
  
  try {
    const url = `${baseUrl}?searchVal=${padded}&returnGeom=Y&getAddrDetails=N&pageNum=1`;
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = token;
    }
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const lat = Number(result.LATITUDE);
        const lng = Number(result.LONGITUDE);
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      }
    }
  } catch (_) {}
  return null;
}

// Load PDF.js dynamically from CDN
async function loadPdfJs(): Promise<any> {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

  return new Promise((resolve, reject) => {
    // Add stylesheet just in case
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js library"));
    document.head.appendChild(script);
  });
}

// Resolve proof image links dynamically from corresponding DbOrder columns or direct log photoUrl
function getLogImagesForAction(action: string, order: DbOrder, logPhotoUrl?: string): string[] {
  let val: any = "";
  
  if (logPhotoUrl) {
    val = logPhotoUrl;
  } else {
    if (!order) return [];
    const act = String(action || "").toLowerCase();
    
    if (act.includes("created") || act.includes("imported") || act.includes("sent")) {
      val = order.photo_do_paper;
    } else if (act.includes("picked") || act.includes("proof")) {
      val = order.photo_picker_proof;
    } else if (act.includes("delivered")) {
      val = order.photo_delivered_proof;
    } else if (act.includes("handover")) {
      val = order.photo_handover_proof;
    } else if (act.includes("signed")) {
      val = order.photo_do_paper_signed;
    } else if (act.includes("pick return") || act.includes("return paper")) {
      val = order.photo_return_paper;
    } else if (act.includes("unpick return") || act.includes("return paper admin")) {
      val = order.photo_return_paper_admin;
    }
  }
  
  if (!val) return [];
  
  try {
    if (typeof val === "string" && (val.startsWith("[") || val.startsWith("{"))) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
      if (parsed && typeof parsed === "object") {
        return [parsed.url || parsed.uri || ""].filter(Boolean);
      }
    }
  } catch (_) {}
  
  if (typeof val === "string") {
    if (val.includes(",")) {
      return val.split(",").map(v => v.trim()).filter(Boolean);
    }
    return [val.trim()].filter(Boolean);
  }
  
  return [];
}


// Format Unix Timestamp to dd/mm/yyyy hh:mm
function formatTimestamp(ts: any) {
  if (!ts) return "";
  const num = Number(ts);
  if (isNaN(num) || num <= 0) return String(ts);
  const date = new Date(num);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}


// Format YYYY-MM-DD string to dd/mm/yyyy
function formatDateStringToDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Get Unix timestamp for today at 6:00 PM local time
function getUrgentDeadline(): number {
  const d = new Date();
  d.setHours(18, 0, 0, 0); // 6:00 PM
  return d.getTime();
}

// Get Unix timestamp for specific date and end time
function getAppointmentDeadline(dateStr: string, timeStr: string): number {
  if (!dateStr || !timeStr) return 0;
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return d.getTime();
}

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

function SlidePanel({ isOpen, onClose, title, children, footer }: SlidePanelProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop overlay to close when clicking outside */}
      <div 
        className={`fixed inset-0 bg-zinc-950/25 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      
      <div 
        className={`fixed top-0 right-0 h-screen w-full sm:w-[450px] bg-white shadow-2xl border-l border-slate-200 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full font-primary">
          {/* Panel Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 flex-shrink-0">
            <h4 className="text-sm font-bold text-zinc-800 text-left">
              {title}
            </h4>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-200 text-zinc-500 hover:text-zinc-800 cursor-pointer flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 text-xs bg-white">
            {children}
          </div>

          {/* Panel Footer */}
          {footer && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const getOrderEditsRemark = (oldOrder: DbOrder, newFields: Partial<DbOrder>): string => {
  const changes: string[] = [];

  if (newFields.mark !== undefined && String(newFields.mark || "").trim() !== String(oldOrder.mark || "").trim()) {
    changes.push(`Mark "${String(oldOrder.mark || "").trim()}" -> "${String(newFields.mark || "").trim()}"`);
  }
  if (newFields.poscode !== undefined && String(newFields.poscode || "").trim() !== String(oldOrder.poscode || "").trim()) {
    changes.push(`Poscode "${String(oldOrder.poscode || "").trim()}" -> "${String(newFields.poscode || "").trim()}"`);
  }
  if (newFields.deliver_to !== undefined && String(newFields.deliver_to || "").trim() !== String(oldOrder.deliver_to || "").trim()) {
    changes.push(`Address changed`);
  }
  if (newFields.deliver_method !== undefined && String(newFields.deliver_method || "").trim() !== String(oldOrder.deliver_method || "").trim()) {
    changes.push(`Method "${String(oldOrder.deliver_method || "").trim()}" -> "${String(newFields.deliver_method || "").trim()}"`);
  }
  if (newFields.type !== undefined && String(newFields.type || "").trim() !== String(oldOrder.type || "").trim()) {
    changes.push(`Type "${String(oldOrder.type || "").trim()}" -> "${String(newFields.type || "").trim()}"`);
  }

  if (newFields.items !== undefined) {
    try {
      const oldItems: SKUItem[] = typeof oldOrder.items === "string" ? JSON.parse(oldOrder.items) : oldOrder.items;
      const newItems: SKUItem[] = typeof newFields.items === "string" ? JSON.parse(newFields.items) : newFields.items;

      const oldMap = new Map(oldItems.map(i => [i.sku, i.qty]));
      const newMap = new Map(newItems.map(i => [i.sku, i.qty]));

      oldItems.forEach(i => {
        if (!newMap.has(i.sku)) {
          changes.push(`removed ${i.sku}`);
        } else if (newMap.get(i.sku) !== i.qty) {
          changes.push(`changed ${i.sku} qty (${i.qty} -> ${newMap.get(i.sku)})`);
        }
      });

      newItems.forEach(i => {
        if (!oldMap.has(i.sku)) {
          changes.push(`added ${i.sku} (qty ${i.qty})`);
        }
      });
    } catch (e) {
      console.error("Failed to parse items for change logs:", e);
    }
  }

  return changes.length > 0 ? `Edited: ${changes.join(", ")}` : "Order details updated";
};

export function TrackOrderModule({ profile }: TrackOrderModuleProps) {
  const [driverLogs, setDriverLogs] = React.useState<DriverLogRecord[]>([]);
  const [activeDriverLogSubTab, setActiveDriverLogSubTab] = React.useState<"online" | "closed">("online");
  const [selectedRouteLogRecord, setSelectedRouteLogRecord] = React.useState<DriverLogRecord | null>(null);
  const [isRouteLogModalOpen, setIsRouteLogModalOpen] = React.useState<boolean>(false);
  const [forceCloseDriverJob, setForceCloseDriverJob] = React.useState<DriverLogRecord | null>(null);
  const [isForceCloseModalOpen, setIsForceCloseModalOpen] = React.useState<boolean>(false);
  const [forceCloseLoading, setForceCloseLoading] = React.useState<boolean>(false);

  const [driverSearchQuery, setDriverSearchQuery] = React.useState<string>("");

  const matchesDriverRecord = React.useCallback((record: DriverLogRecord, query: string) => {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    
    if ((record.id || "").toLowerCase().includes(q)) return true;
    if ((record.driver || "").toLowerCase().includes(q)) return true;
    if ((record.outsource_driver_details || "").toLowerCase().includes(q)) return true;
    if ((record.driver_logs || "").toLowerCase().includes(q)) return true;
    if ((record.active_orders || "").toLowerCase().includes(q)) return true;

    // Check parsed active order IDs
    try {
      const activeIds = parseDriverActiveOrderIds(record.active_orders);
      if (activeIds.some(id => id.toLowerCase().includes(q))) return true;
    } catch (_) {}

    // Check parsed completed log entries
    try {
      const completedLogs = parseDriverCompletedLogs(record.driver_logs);
      if (completedLogs.some(log => (log.id || "").toLowerCase().includes(q))) return true;
    } catch (_) {}

    return false;
  }, []);

  const onlineDrivers = React.useMemo(() => {
    const q = driverSearchQuery.trim().toLowerCase();
    return driverLogs
      .filter((d) => (d.status || "").trim().toUpperCase() === "ON")
      .filter((d) => (q ? matchesDriverRecord(d, q) : true));
  }, [driverLogs, driverSearchQuery, matchesDriverRecord]);

  const closedDriverJobs = React.useMemo(() => {
    const q = driverSearchQuery.trim().toLowerCase();
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return driverLogs
      .filter((d) => (d.status || "").trim().toUpperCase() === "OFF")
      .filter((d) => {
        // When searching, search across ALL historical records (regardless of date)
        if (q) {
          return matchesDriverRecord(d, q);
        }
        // When query is empty, only show the latest 1 week of records
        const t = Number(d.end_time) || Number(d.start_time) || 0;
        return t >= oneWeekAgo;
      })
      .sort((a, b) => {
        const tA = Number(a.start_time) || 0;
        const tB = Number(b.start_time) || 0;
        return tB - tA;
      });
  }, [driverLogs, driverSearchQuery, matchesDriverRecord]);

  // Auto switch subtab to closed if no online drivers
  React.useEffect(() => {
    if (onlineDrivers.length === 0 && activeDriverLogSubTab === "online") {
      setActiveDriverLogSubTab("closed");
    }
  }, [onlineDrivers.length, activeDriverLogSubTab]);

  const [activeLiveTrackingSubTab, setActiveLiveTrackingSubTab] = React.useState<"location" | "driver">("location");

  const tabs = [
    { id: "dashboard", label: "Live Tracking" },
    { id: "delivery", label: "Delivery Order" },
    { id: "return", label: "Return Order" },
    { id: "create", label: "Create Order" }
  ];

  const [activeTab, setActiveTab] = React.useState<string>("dashboard");
  const [activeDeliveryTab, setActiveDeliveryTab] = React.useState<"pending" | "complete">("pending");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = React.useState<string>("all");
  const [deliverySearchQuery, setDeliverySearchQuery] = React.useState<string>("");

  const [activeReturnTab, setActiveReturnTab] = React.useState<"pending" | "complete">("pending");
  const [returnStatusFilter, setReturnStatusFilter] = React.useState<string>("all");
  const [returnSearchQuery, setReturnSearchQuery] = React.useState<string>("");

  const [drafts, setDrafts] = React.useState<TrackOrderDraft[]>([]);
  const [dbOrders, setDbOrders] = React.useState<DbOrder[]>([]);
  const [pdfLoading, setPdfLoading] = React.useState<boolean>(false);
  const [invoiceLoading, setInvoiceLoading] = React.useState<boolean>(false);
  const [sendingDraftIds, setSendingDraftIds] = React.useState<Record<string, boolean>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const invoicePdfInputRef = React.useRef<HTMLInputElement>(null);
  const invoiceExcelInputRef = React.useRef<HTMLInputElement>(null);
  const doExcelInputRef = React.useRef<HTMLInputElement>(null);

  const [isInvoiceUploadChoiceOpen, setIsInvoiceUploadChoiceOpen] = React.useState(false);
  const [isDoUploadChoiceOpen, setIsDoUploadChoiceOpen] = React.useState(false);

  // Detail panel / Drawer states
  const [isPanelOpen, setIsPanelOpen] = React.useState<boolean>(false);
  const [panelMode, setPanelMode] = React.useState<"edit" | "view">("view");
  const [panelOrderId, setPanelOrderId] = React.useState<string | null>(null);
  const [panelItems, setPanelItems] = React.useState<SKUItem[]>([]);

  // Create Order panel states
  const [isCreatePanelOpen, setIsCreatePanelOpen] = React.useState<boolean>(false);
  const [createDoNumber, setCreateDoNumber] = React.useState<string>("");
  const [createRefNumber, setCreateRefNumber] = React.useState<string>("");
  const [createMark, setCreateMark] = React.useState<string>("");
  const [createType, setCreateType] = React.useState<"Normal" | "Urgent" | "Appointment">("Normal");
  const [createDeliverTo, setCreateDeliverTo] = React.useState<string>("");
  const [createPoscode, setCreatePoscode] = React.useState<string>("");
  const [createItems, setCreateItems] = React.useState<SKUItem[]>([]);
  const [productSkus, setProductSkus] = React.useState<string[]>([]);
  const [productsDb, setProductsDb] = React.useState<any[]>([]);
  const [createAppointmentDate, setCreateAppointmentDate] = React.useState<string>("");
  const [createTimeWindow, setCreateTimeWindow] = React.useState<string>("");
  const [createDeliverMethod, setCreateDeliverMethod] = React.useState<string>("Company Delivery");
  const [tick, setTick] = React.useState<number>(0);
  const [editingOrder, setEditingOrder] = React.useState<DbOrder | null>(null);

  // Return Orders panel and display states
  const [stores, setStores] = React.useState<any[]>([]);
  const [retailers, setRetailers] = React.useState<any[]>([]);
  const [isReturnPanelOpen, setIsReturnPanelOpen] = React.useState<boolean>(false);
  const [editingReturn, setEditingReturn] = React.useState<DbOrder | null>(null);
  const [returnRefNumber, setReturnRefNumber] = React.useState("");
  const [returnLocation, setReturnLocation] = React.useState("");
  const [returnPoscode, setReturnPoscode] = React.useState("");
  const [returnCollectBeforeDate, setReturnCollectBeforeDate] = React.useState("");
  const [returnMark, setReturnMark] = React.useState("R");
  const [returnItems, setReturnItems] = React.useState<SKUItem[]>([]);
  const [returnCollectMethod, setReturnCollectMethod] = React.useState<string>("Company Vehicle");
  const [storeSearchQuery, setStoreSearchQuery] = React.useState("");
  const [showStoreDropdown, setShowStoreDropdown] = React.useState(false);

  // Logs modal states
  const [isLogsModalOpen, setIsLogsModalOpen] = React.useState<boolean>(false);
  const [logsList, setLogsList] = React.useState<LogEntry[]>([]);
  const [logsTitle, setLogsTitle] = React.useState<string>("");
  const [selectedOrderMark, setSelectedOrderMark] = React.useState<string>("");
  const [selectedOrderId, setSelectedOrderId] = React.useState<string>("");
  const [selectedOrder, setSelectedOrder] = React.useState<DbOrder | null>(null);

  // Status Overwrite States
  const [isChangeStatusOpen, setIsChangeStatusOpen] = React.useState<boolean>(false);
  const [statusOrder, setStatusOrder] = React.useState<DbOrder | null>(null);
  const [newStatus, setNewStatus] = React.useState<string>("");
  const [statusRemark, setStatusRemark] = React.useState<string>("");
  const [statusPhotoFile, setStatusPhotoFile] = React.useState<File | null>(null);
  const [statusPhotoUploading, setStatusPhotoUploading] = React.useState<boolean>(false);

  // Complete Order Confirmation States
  const [isCompleteConfirmOpen, setIsCompleteConfirmOpen] = React.useState<boolean>(false);
  const [pendingCompleteOrder, setPendingCompleteOrder] = React.useState<DbOrder | null>(null);
  const [invoiceNumberInput, setInvoiceNumberInput] = React.useState<string>("");
  const [creditNoteInput, setCreditNoteInput] = React.useState<string>("");
  const [invoiceAmountInput, setInvoiceAmountInput] = React.useState<string>("");

  // Edit Completed Invoice Modal States
  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = React.useState<boolean>(false);
  const [editInvoiceOrder, setEditInvoiceOrder] = React.useState<DbOrder | null>(null);
  const [editInvoiceNum, setEditInvoiceNum] = React.useState<string>("");
  const [editInvoiceAmount, setEditInvoiceAmount] = React.useState<string>("");

  // Revoke Complete Confirmation States
  const [isRevokeCompleteConfirmOpen, setIsRevokeCompleteConfirmOpen] = React.useState<boolean>(false);
  const [pendingRevokeCompleteOrder, setPendingRevokeCompleteOrder] = React.useState<DbOrder | null>(null);

  // Lightbox modal state for viewing images in full size
  const [activeLightboxImage, setActiveLightboxImage] = React.useState<string | null>(null);

  // Keyboard shortcut listener to close Lightbox on Escape
  React.useEffect(() => {
    if (!activeLightboxImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveLightboxImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightboxImage]);

  // Revoke confirmation dialog states
  const [isConfirmRevokeOpen, setIsConfirmRevokeOpen] = React.useState<boolean>(false);
  const [pendingRevokeOrder, setPendingRevokeOrder] = React.useState<DbOrder | null>(null);

  // Map Hover / Tooltip state
  const [hoveredPin, setHoveredPin] = React.useState<any | null>(null);

  // Map Panel Open state
  const [isMapOpen, setIsMapOpen] = React.useState<boolean>(false);
  const [mapFilter, setMapFilter] = React.useState<"pending" | "complete">("pending");

  // OneMap API settings from Setting_API
  const [oneMapToken, setOneMapToken] = React.useState<string>("");
  const [oneMapUrl, setOneMapUrl] = React.useState<string>("https://www.onemap.gov.sg/api/common/elastic/search");

  // Leaflet Dynamic Loading and Map Refs
  const [leafletLoaded, setLeafletLoaded] = React.useState<boolean>(false);
  const mapRef = React.useRef<any>(null);
  const markersGroupRef = React.useRef<any>(null);

  // Load Leaflet Script and Stylesheets from CDN
  React.useEffect(() => {
    if (activeTab !== "dashboard") return;

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

  // Fetch stores directory from backend
  const fetchStores = async () => {
    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db?table=Store_Retailer_DB");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.value || []);
        setStores(list);
      }
    } catch (_) {}

    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db?table=retailers_DB");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.value || []);
        setRetailers(list);
      }
    } catch (_) {}
  };

  // Fetch driver logs from backend
  const fetchDriverLogs = async () => {
    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db?table=Driver_Log");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.value || []);
        const normalized: DriverLogRecord[] = list.map((item: any) => ({
          id: String(item.ID || item.id || ""),
          driver: String(item.Driver || item.driver || ""),
          status: String(item.Status || item.status || "OFF"),
          start_time: item.Start_Time || item.start_time || 0,
          end_time: item.End_Time || item.end_time || "",
          active_orders: typeof item.Active_Orders === "string" ? item.Active_Orders : JSON.stringify(item.Active_Orders || item.active_orders || []),
          driver_logs: typeof item.Driver_Logs === "string" ? item.Driver_Logs : JSON.stringify(item.Driver_Logs || item.driver_logs || []),
          outsource_driver_details: item.Outsource_Driver_Details || item.outsource_driver_details || ""
        }));
        setDriverLogs(normalized);
      }
    } catch (err) {
      console.error("Failed to fetch Driver_Log:", err);
    }
  };

  // Current User Info
  const currentUser = React.useMemo(() => {
    return profile?.name || profile?.email || "Admin";
  }, [profile]);

  // Fetch drafts, API settings, product SKUs, and driver logs on mount
  React.useEffect(() => {
    const cachedDrafts = localStorage.getItem("track_order_drafts");
    if (cachedDrafts) {
      try {
        setDrafts(JSON.parse(cachedDrafts));
      } catch (e) {
        console.error("Failed to parse cached drafts", e);
      }
    }
    
    // Fetch OneMap API settings
    fetchSettingApi();
    
    // Quick load from cache for instant UI, followed by live Database sync
    fetchDatabaseOrders(false).then(() => {
      fetchDatabaseOrders(true);
    });

    // Load product SKUs for manual order creation
    fetchProductSkus();
    fetchStores();
    fetchDriverLogs();
  }, []);

  // Polling: fetch data direct from Database every 60 seconds (active only while TrackOrderModule is open/mounted)
  React.useEffect(() => {
    const interval = setInterval(() => {
      console.log("tracking order...... ");
      fetchDatabaseOrders(true);
      fetchDriverLogs();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen for Escape key to close slide-in drawers
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMapOpen(false);
        setIsCreatePanelOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Tick for countdown timer real-time updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000); // every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Listen for the global db-refresh event (make listening)
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      try {
        await fetchDatabaseOrders(true); // force sync from Database
      } catch (err: any) {
        showToast("Refresh failed: " + err.message, "error");
      }
    };

    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, []);

  // Fetch API Settings from Google Sheets Setting_API
  const fetchSettingApi = async () => {
    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db?table=Setting_API");
      if (res.ok) {
        const list = await res.json();
        const array = Array.isArray(list) ? list : (list.value || []);
        if (array.length > 0) {
          const oneMapApiObj = array.find((a: any) => String(a.id) === "OneMap_API" || String(a.id) === "OneMap_Token");
          if (oneMapApiObj && oneMapApiObj.Key) {
            setOneMapToken(oneMapApiObj.Key.trim());
          }
          const oneMapUrlObj = array.find((a: any) => String(a.id) === "OneMap_URL");
          if (oneMapUrlObj && oneMapUrlObj.Key) {
            setOneMapUrl(oneMapUrlObj.Key.trim());
          }
        }
      }
    } catch (_) {}
  };

  // Fetch database orders from Workers API
  const fetchDatabaseOrders = async (forceSync = false) => {
    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.value || []);
        setDbOrders(list);
      }
    } catch (e: any) {
      showToast("Failed to fetch database records: " + e.message, "error");
    }
  };

  // Fetch product SKUs list from localStorage or Products DB
  const fetchProductSkus = async () => {
    const cached = localStorage.getItem("products_DB_data");
    if (cached) {
      try {
        const products = JSON.parse(cached);
        setProductsDb(products);
        const skus = products.map((p: any) => p.sku).filter(Boolean);
        if (skus.length > 0) {
          setProductSkus(skus);
          return;
        }
      } catch (_) {}
    }
    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db?table=products_DB");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.value || []);
        localStorage.setItem("products_DB_data", JSON.stringify(list));
        setProductsDb(list);
        const skus = list.map((p: any) => p.sku).filter(Boolean);
        setProductSkus(skus);
      }
    } catch (_) {}
  };

  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createDoNumber) {
      showToast("DO Number is required", "error");
      return;
    }
    if (!createDeliverTo) {
      showToast("Delivery Address is required", "error");
      return;
    }
    if (!createPoscode || !validatePoscode(createPoscode)) {
      showToast("Please enter a valid 6-digit Singapore Postal Code", "error");
      return;
    }
    if (!createMark) {
      showToast("Please assign a Mark (A, B, C, D)", "error");
      return;
    }
    if (createMark.trim().toUpperCase().startsWith("R")) {
      showToast("Delivery order mark cannot start with 'R' (reserved for Returns).", "error");
      return;
    }

    // Check if Mark is active in pending orders
    const isMarkActive = pendingOrders.some(
      (o) => String(o.mark).toUpperCase() === createMark.toUpperCase() && (!editingOrder || o.id !== editingOrder.id) && o.status !== "Delivered"
    );
    if (isMarkActive) {
      showToast(`Mark "${createMark}" is currently active in a pending order.`, "error");
      return;
    }

    // Validation: check if DO Number is already registered in Drafts, Pending, or Completed lists
    const inDrafts = drafts.some((d) => d.doNumber === createDoNumber && (!editingOrder || d.id !== editingOrder.id));
    const inPending = pendingOrders.some((p) => p.do_number === createDoNumber && (!editingOrder || p.id !== editingOrder.id));
    const inCompleted = completedOrders.some((c) => c.do_number === createDoNumber && (!editingOrder || c.id !== editingOrder.id));

    if ((!editingOrder && inDrafts) || inPending || inCompleted) {
      showToast(`Warning: Order ${createDoNumber} already registered in system. Please check order.`, "error");
      return;
    }

    if (createType === "Appointment") {
      if (!createAppointmentDate) {
        showToast("Appointment Date is required", "error");
        return;
      }
      if (!createTimeWindow) {
        showToast("Appointment End Time is required", "error");
        return;
      }
    }

    const deadlineVal = createType === "Urgent"
      ? getUrgentDeadline()
      : createType === "Appointment"
      ? getAppointmentDeadline(createAppointmentDate, createTimeWindow)
      : 0;

    if (editingOrder) {
      const orderId = editingOrder.id;
      let parsedItems: SKUItem[] = createItems.filter(i => i.sku.trim() !== "");

      const payloadData: Partial<DbOrder> = {
        id: orderId,
        do_number: createDoNumber,
        ref_number: createRefNumber,
        mark: createMark,
        type: createType,
        deliver_to: createDeliverTo,
        deliver_method: createDeliverMethod,
        poscode: String(createPoscode || "").trim(),
        items: JSON.stringify(parsedItems),
        deadline: deadlineVal
      };

      const remarkText = getOrderEditsRemark(editingOrder, payloadData);

      let currentLogs: LogEntry[] = [];
      try {
        currentLogs = typeof editingOrder.logs === "string" ? JSON.parse(editingOrder.logs) : editingOrder.logs;
      } catch (_) {}
      if (!Array.isArray(currentLogs)) currentLogs = [];

      const updatedLogs = [
        ...currentLogs,
        {
          action: "Edited by Admin",
          actionBy: currentUser,
          remark: remarkText,
          timestamp: Date.now()
        }
      ];

      payloadData.logs = JSON.stringify(updatedLogs);

      const previousDbOrders = [...dbOrders];
      setDbOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...payloadData } as DbOrder : o));

      setIsCreatePanelOpen(false);
      resetCreateForm();
      setEditingOrder(null);
      showToast(`Order ${createDoNumber} updated successfully.`, "success");

      const updatePayload = {
        table: "Track_Orders",
        action: "update",
        id: orderId,
        data: payloadData
      };

      fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`Server returned status ${res.status}`);
          const result = await res.json() as any;
          if (!result.success) throw new Error(result.error || "Update failed");
        })
        .catch((err) => {
          console.error("Update failed:", err);
          setDbOrders(previousDbOrders);
          showToast("Failed to save changes: " + err.message + ". Reverted.", "error");
        });
      return;
    }

    const newDraft: TrackOrderDraft = {
      id: `${createDoNumber}_${createRefNumber || "NA"}`,
      doNumber: createDoNumber,
      refNumber: createRefNumber,
      mark: createMark,
      type: createType,
      deliverTo: createDeliverTo,
      poscode: createPoscode,
      items: createItems.filter(i => i.sku.trim() !== ""),
      appointmentDate: createType === "Appointment" ? createAppointmentDate : undefined,
      appointmentTimeWindow: createType === "Appointment" ? createTimeWindow : undefined,
      deadline: deadlineVal,
      deliverMethod: createDeliverMethod
    };

    const updated = [...drafts, newDraft];
    saveDraftsToStorage(updated);
    showToast(`Draft for DO ${createDoNumber} created successfully.`, "success");

    setIsCreatePanelOpen(false);
    resetCreateForm();
  };

  // Reusable order search & Mark dot filter helper
  const matchesOrderSearch = React.useCallback((order: DbOrder, rawQuery: string): boolean => {
    if (!rawQuery || !rawQuery.trim()) return true;
    const q = rawQuery.trim();

    // User typing mark with dot (e.g. "A." -> search for Mark "A")
    if (q.endsWith(".")) {
      const markQuery = q.slice(0, -1).trim().toLowerCase();
      const orderMark = (order.mark || "").trim().toLowerCase();
      return orderMark === markQuery;
    }

    const lowerQ = q.toLowerCase();
    const idMatch = (order.id || "").toLowerCase().includes(lowerQ);
    const doMatch = (order.do_number || "").toLowerCase().includes(lowerQ);
    const refMatch = (order.ref_number || "").toLowerCase().includes(lowerQ);
    const addressMatch = (order.deliver_to || "").toLowerCase().includes(lowerQ);
    const postcodeMatch = (order.poscode || "").toLowerCase().includes(lowerQ);
    const driverMatch = (order.driver || "").toLowerCase().includes(lowerQ);
    const invoiceMatch = (order.invoice_number || "").toLowerCase().includes(lowerQ);
    const creditNoteMatch = (order.credit_note_number || "").toLowerCase().includes(lowerQ);
    const markMatch = (order.mark || "").trim().toLowerCase() === lowerQ;

    return idMatch || doMatch || refMatch || addressMatch || postcodeMatch || driverMatch || invoiceMatch || creditNoteMatch || markMatch;
  }, []);

  // Filter orders for Pending and Complete lists
  const pendingOrders = React.useMemo(() => {
    return dbOrders.filter(
      (o) => (String(o.completed) !== "true" && o.completed !== true) && o.type !== "Return"
    );
  }, [dbOrders]);

  const completedOrders = React.useMemo(() => {
    return dbOrders.filter(
      (o) => (String(o.completed) === "true" || o.completed === true) && o.type !== "Return"
    ).sort((a, b) => {
      const timeA = Number(a.timestamp) || 0;
      const timeB = Number(b.timestamp) || 0;
      return timeB - timeA;
    });
  }, [dbOrders]);

  const tasksDoneToday = React.useMemo(() => {
    let count = 0;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    dbOrders.forEach((o) => {
      // Check if this order is delivered, collected, or complete
      const isDelivered = o.type !== "Return" && (o.status === "Delivered" || String(o.completed) === "true" || o.completed !== true);
      const isCollected = o.type === "Return" && (o.status === "Collected" || o.status === "Return Collected" || String(o.completed) === "true" || o.completed === true);

      if (isDelivered || isCollected) {
        let completedToday = false;
        try {
          const logs = typeof o.logs === "string" ? JSON.parse(o.logs) : o.logs;
          if (Array.isArray(logs)) {
            // Find any log entry of delivery (Delivered/Completed) or collection (Collected/Return Collected/Completed) that happened today
            const compLog = logs.find((l: any) => {
              const act = String(l.action || "").toLowerCase();
              return (act.includes("delivered") || act.includes("collected") || act.includes("completed") || act.includes("complete"));
            });
            if (compLog && Number(compLog.timestamp) >= startOfTodayMs) {
              completedToday = true;
            } else if (!compLog && o.timestamp && Number(o.timestamp) >= startOfTodayMs) {
              completedToday = true;
            }
          } else {
            if (o.timestamp && Number(o.timestamp) >= startOfTodayMs) {
              completedToday = true;
            }
          }
        } catch (_) {
          if (o.timestamp && Number(o.timestamp) >= startOfTodayMs) {
            completedToday = true;
          }
        }

        if (completedToday) {
          count++;
        }
      }
    });
    return count;
  }, [dbOrders]);

  // Return Orders filtered lists
  const returnOrders = React.useMemo(() => {
    return dbOrders.filter((o) => {
      if (o.type !== "Return") return false;
      if (activeReturnTab === "complete") {
        return String(o.completed) === "true" || o.completed === true;
      } else {
        return String(o.completed) !== "true" && o.completed !== true;
      }
    });
  }, [dbOrders, activeReturnTab]);

  const sortedReturnOrders = React.useMemo(() => {
    return returnOrders
      .filter((o) => {
        if (returnStatusFilter !== "all" && (o.status || "").toLowerCase() !== returnStatusFilter.toLowerCase()) {
          return false;
        }
        return matchesOrderSearch(o, returnSearchQuery);
      })
      .sort((a, b) => {
        const timeA = Number(a.timestamp) || 0;
        const timeB = Number(b.timestamp) || 0;
        return timeB - timeA;
      });
  }, [returnOrders, returnStatusFilter, returnSearchQuery, matchesOrderSearch]);

  const filteredStores = React.useMemo(() => {
    if (!storeSearchQuery.trim()) return [];
    const q = storeSearchQuery.toLowerCase();
    return stores.filter(s => 
      String(s.id || "").toLowerCase().includes(q) || 
      String(s["Display Name"] || "").toLowerCase().includes(q) ||
      String(s.Address || "").toLowerCase().includes(q)
    ).slice(0, 10);
  }, [storeSearchQuery, stores]);

  // Return actions
  const handleDeleteReturnOrder = async (order: DbOrder) => {
    const previousDbOrders = [...dbOrders];
    setDbOrders((prev) => prev.filter((o) => o.id !== order.id));
    showToast(`Return order ${order.do_number} deleted.`, "info");

    const payload = {
      table: "Track_Orders",
      action: "delete",
      data: { id: order.id }
    };
    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchDatabaseOrders(true);
      } else {
        throw new Error();
      }
    } catch (_) {
      setDbOrders(previousDbOrders);
      showToast("Delete failed", "error");
    }
  };

  const handleCompleteReturnOrder = async (order: DbOrder, creditNoteNum?: string, invoiceAmount?: number | string) => {
    let currentLogs: LogEntry[] = [];
    try {
      currentLogs = typeof order.logs === "string" ? JSON.parse(order.logs) : order.logs;
    } catch (_) {}

    const updatedLogs = [
      ...currentLogs,
      {
        action: "Completed by Admin",
        actionBy: currentUser,
        remark: creditNoteNum 
          ? `Return marked as Complete (Credit Note: ${creditNoteNum}, Amount: ${invoiceAmount || "0"})` 
          : `Return marked as Complete (Amount: ${invoiceAmount || "0"})`,
        timestamp: Date.now()
      }
    ];

    const previousDbOrders = [...dbOrders];
    setDbOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { 
              ...o, 
              completed: "true", 
              credit_note_number: creditNoteNum || "", 
              invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
              logs: JSON.stringify(updatedLogs) 
            }
          : o
      )
    );

    showToast(`Return order ${order.do_number} completed.`, "success");

    const payload = {
      table: "Track_Orders",
      action: "update",
      data: {
        id: order.id,
        completed: "true",
        credit_note_number: creditNoteNum || "",
        invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
        logs: JSON.stringify(updatedLogs)
      }
    };

    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchDatabaseOrders(true);
      } else {
        throw new Error();
      }
    } catch (_) {
      setDbOrders(previousDbOrders);
      showToast("Failed to complete return order.", "error");
    }
  };

  const openCreateReturnPanel = () => {
    setEditingReturn(null);
    setReturnRefNumber("");
    setReturnLocation("");
    setReturnPoscode("");
    setReturnCollectBeforeDate("");
    setReturnMark(getNextAvailableReturnMark(drafts, dbOrders));
    setReturnItems([]);
    setReturnCollectMethod("Company Vehicle");
    setIsReturnPanelOpen(true);
  };

  const openEditReturnPanel = (order: DbOrder) => {
    setEditingReturn(order);
    setReturnRefNumber(String(order.ref_number || order.do_number || ""));
    setReturnLocation(String(order.deliver_to || ""));
    setReturnPoscode(String(order.poscode || ""));
    
    if (order.deadline) {
      const d = new Date(Number(order.deadline));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setReturnCollectBeforeDate(`${yyyy}-${mm}-${dd}`);
    } else {
      setReturnCollectBeforeDate("");
    }
    
    const markVal = String(order.mark || "");
    setReturnMark(markVal.startsWith("R") ? markVal.substring(1) : markVal);
    
    let itemsList: SKUItem[] = [];
    try {
      itemsList = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    } catch (_) {}
    setReturnItems(itemsList || []);
    setReturnCollectMethod(order.deliver_method || "Company Vehicle");
    setIsReturnPanelOpen(true);
  };

  const openEditOrderPanel = (order: DbOrder) => {
    setEditingOrder(order);
    setCreateDoNumber(String(order.do_number || ""));
    setCreateRefNumber(String(order.ref_number || ""));
    setCreateMark(String(order.mark || ""));
    
    const typeStr = String(order.type || "Normal");
    let parsedType: "Normal" | "Urgent" | "Appointment" = "Normal";
    if (typeStr.startsWith("Appointment")) {
      parsedType = "Appointment";
    } else if (typeStr.startsWith("Urgent")) {
      parsedType = "Urgent";
    }
    setCreateType(parsedType);
    
    setCreateDeliverTo(String(order.deliver_to || ""));
    setCreatePoscode(String(order.poscode || ""));
    setCreateDeliverMethod(String(order.deliver_method || "Company Delivery"));
    
    let parsedItems: SKUItem[] = [];
    try {
      parsedItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    } catch (_) {}
    setCreateItems(parsedItems || []);
    
    if (parsedType === "Appointment" && order.deadline) {
      const dt = new Date(Number(order.deadline));
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      setCreateAppointmentDate(`${yyyy}-${mm}-${dd}`);
      
      const hh = String(dt.getHours()).padStart(2, '0');
      const min = String(dt.getMinutes()).padStart(2, '0');
      setCreateTimeWindow(`${hh}:${min}`);
    } else {
      setCreateAppointmentDate("");
      setCreateTimeWindow("");
    }
    
    setIsCreatePanelOpen(true);
  };

  const resetCreateForm = () => {
    setCreateDoNumber("");
    setCreateRefNumber("");
    setCreateMark("");
    setCreateType("Normal");
    setCreateDeliverTo("");
    setCreatePoscode("");
    setCreateItems([]);
    setCreateAppointmentDate("");
    setCreateTimeWindow("");
    setCreateDeliverMethod("Company Delivery");
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnRefNumber.trim() || !returnLocation.trim() || !returnPoscode.trim() || !returnCollectBeforeDate || !returnMark.trim()) {
      showToast("Please fill in all mandatory fields.", "error");
      return;
    }

    if (!validatePoscode(returnPoscode)) {
      showToast("Please enter a valid 6-digit Singapore Postal Code.", "error");
      return;
    }

    let lat: number | string = "";
    let lng: number | string = "";
    try {
      const coords = await fetchPostcodeCoordinates(returnPoscode, oneMapUrl, oneMapToken);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      } else {
        const fallback = getSingaporeLatLng(returnPoscode);
        lat = fallback.lat;
        lng = fallback.lng;
      }
    } catch (_) {
      const fallback = getSingaporeLatLng(returnPoscode);
      lat = fallback.lat;
      lng = fallback.lng;
    }

    const finalMark = "R" + returnMark.trim().toUpperCase();

    // Validation: Mark cannot be the same if still pending/collected
    const isEdit = !!editingReturn;
    const isMarkActive = dbOrders.some(o => 
      o.type === "Return" && 
      o.status !== "Complete" && 
      o.status !== "Collected" && 
      o.status !== "Return Collected" && 
      String(o.completed) !== "true" &&
      o.completed !== true &&
      String(o.mark).toUpperCase() === finalMark.toUpperCase() &&
      (!isEdit || o.id !== editingReturn.id)
    ) || drafts.some(d =>
      d.type === "Return" &&
      String(d.mark).toUpperCase() === finalMark.toUpperCase()
    );
    
    if (isMarkActive) {
      showToast(`Mark "${finalMark}" is currently active in another pending/collected return order.`, "error");
      return;
    }

    const orderId = isEdit ? editingReturn.id : `RET-${Date.now()}`;
    const epochDate = new Date(returnCollectBeforeDate).getTime();
    
    const initialLogs: LogEntry[] = isEdit 
      ? (typeof editingReturn.logs === "string" ? JSON.parse(editingReturn.logs) : editingReturn.logs)
      : [
          {
            action: "Created Return",
            actionBy: currentUser,
            remark: "Initial return creation",
            timestamp: Date.now()
          }
        ];
        
    const payloadDataTemp: Partial<DbOrder> = {
      id: orderId,
      do_number: returnRefNumber,
      ref_number: returnRefNumber,
      mark: finalMark,
      type: "Return",
      deliver_to: returnLocation,
      deliver_method: returnCollectMethod,
      poscode: returnPoscode.trim(),
      items: JSON.stringify(returnItems.filter(i => i.sku.trim() !== "")),
      status: isEdit ? editingReturn.status : "Pending",
      timestamp: isEdit ? editingReturn.timestamp : Date.now(),
      deadline: epochDate,
      completed: isEdit ? editingReturn.completed : "false",
      latitude: lat,
      longitude: lng
    };
        
    if (isEdit) {
      const remarkText = getOrderEditsRemark(editingReturn, payloadDataTemp);
      initialLogs.push({
        action: "Edited by Admin",
        actionBy: currentUser,
        remark: remarkText,
        timestamp: Date.now()
      });

      const payloadData = {
        ...payloadDataTemp,
        logs: JSON.stringify(initialLogs)
      };

      const previousDbOrders = [...dbOrders];
      setDbOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...payloadData } as DbOrder : o));
      setIsReturnPanelOpen(false);
      showToast(`Return order ${returnRefNumber} updated.`, "success");

      const payload = {
        table: "Track_Orders",
        action: "update",
        data: payloadData
      };

      try {
        const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          fetchDatabaseOrders(true);
        } else {
          throw new Error();
        }
      } catch (_) {
        setDbOrders(previousDbOrders);
        showToast("Failed to save return order.", "error");
      }
    } else {
      // Create Return Order -> Add to Drafts first
      const newDraft: TrackOrderDraft = {
        id: orderId,
        doNumber: returnRefNumber,
        refNumber: returnRefNumber,
        mark: finalMark,
        type: "Return",
        deliverTo: returnLocation,
        poscode: returnPoscode.trim(),
        items: returnItems.filter(i => i.sku.trim() !== ""),
        deadline: epochDate,
        deliverMethod: returnCollectMethod,
        latitude: lat,
        longitude: lng
      };

      saveDraftsToStorage([...drafts, newDraft]);
      setIsReturnPanelOpen(false);
      showToast(`Return order draft created.`, "success");
    }
  };

  // Render countdown cell badge
  const renderCountdownCell = (order: DbOrder) => {
    if (!order.deadline) return <span className="text-zinc-400">—</span>;
    const deadline = Number(order.deadline);
    if (isNaN(deadline) || deadline <= 0) return <span className="text-zinc-400">—</span>;

    const now = Date.now();
    const diff = deadline - now;

    if (diff <= 0) {
      const absDiff = Math.abs(diff);
      const mins = Math.floor(absDiff / 60000);
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      const timeText = hrs > 0 ? `${hrs}h ${remMins}m` : `${mins}m`;
      return (
        <span className="inline-flex items-center gap-1 font-bold text-red-600 animate-pulse bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[10px]">
          ⚠️ Overdue {timeText}
        </span>
      );
    } else {
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      const timeText = hrs > 0 ? `${hrs}h ${remMins}m` : `${mins}m`;
      
      if (diff < 2 * 60 * 60 * 1000) {
        return (
          <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px]">
            ⏰ {timeText} left
          </span>
        );
      }
      
      return (
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">
          ⏱️ {timeText} left
        </span>
      );
    }
  };

  // Render type cell badge or clock icon
  const renderTypeCell = (order: DbOrder) => {
    const val = order.type || "Normal";
    
    // Calculate countdown string
    let countdownText = "";
    if (order.deadline) {
      const deadline = Number(order.deadline);
      if (!isNaN(deadline) && deadline > 0) {
        const now = Date.now();
        const diff = deadline - now;
        if (diff <= 0) {
          const absDiff = Math.abs(diff);
          const mins = Math.floor(absDiff / 60000);
          const hrs = Math.floor(mins / 60);
          const remMins = mins % 60;
          const timeText = hrs > 0 ? `${hrs}h ${remMins}m` : `${mins}m`;
          countdownText = `⚠️ Overdue by ${timeText}`;
        } else {
          const mins = Math.floor(diff / 60000);
          const hrs = Math.floor(mins / 60);
          const remMins = mins % 60;
          const timeText = hrs > 0 ? `${hrs}h ${remMins}m` : `${mins}m`;
          countdownText = `${timeText} remaining`;
        }
      }
    }

    if (val.startsWith("Appointment")) {
      const tooltip = `${val}${countdownText ? `\nCountdown: ${countdownText}` : ""}`;
      return (
        <div className="flex items-center gap-1.5 cursor-help" title={tooltip}>
          <span className="font-semibold text-zinc-800">Appointment</span>
          <Clock size={13} className="text-blue-600 animate-pulse" />
        </div>
      );
    }
    
    if (val === "Urgent") {
      const tooltip = `Urgent (Must be sent today by 6:00 PM)${countdownText ? `\nCountdown: ${countdownText}` : ""}`;
      return (
        <div className="flex items-center gap-1.5 cursor-help" title={tooltip}>
          <span className="font-bold text-red-600">Urgent</span>
          <Clock size={13} className="text-red-500 animate-pulse" />
        </div>
      );
    }
    
    return <span className="text-zinc-500">Normal</span>;
  };

  const getExcelColumnLabel = (index: number): string => {
    let label = "";
    let temp = index;
    while (temp > 0) {
      const mod = (temp - 1) % 26;
      label = String.fromCharCode(65 + mod) + label;
      temp = Math.floor((temp - 1) / 26);
    }
    return label;
  };

  const formatDateStr = (ts: any): string => {
    if (!ts) return "—";
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Find the next unused capital letter mark character A-Z, AA-AZ, BA-BZ skipping pending orders & existing drafts
  const getNextAvailableMark = (currentDrafts: TrackOrderDraft[], currentPending: any[], tempAssigned: string[] = []): string => {
    const usedMarks = new Set<string>();
    
    currentPending.forEach((o) => {
      if (o.mark && o.status !== "Delivered") {
        usedMarks.add(String(o.mark).trim().toUpperCase());
      }
    });

    currentDrafts.forEach((d) => {
      if (d.mark) {
        usedMarks.add(String(d.mark).trim().toUpperCase());
      }
    });

    tempAssigned.forEach((m) => {
      usedMarks.add(m.trim().toUpperCase());
    });

    let index = 1;
    while (true) {
      const label = getExcelColumnLabel(index);
      // Delivery order mark cannot start with 'R' (reserved for Returns)
      if (label.startsWith("R")) {
        index++;
        continue;
      }
      if (!usedMarks.has(label)) {
        return label;
      }
      index++;
    }
  };

  const getNextAvailableReturnMark = (currentDrafts: TrackOrderDraft[], currentDbOrders: DbOrder[]): string => {
    const usedMarks = new Set<string>();
    
    currentDbOrders.forEach((o) => {
      if (
        o.mark && 
        o.type === "Return" && 
        o.status !== "Complete" && 
        o.status !== "Collected" && 
        o.status !== "Return Collected" && 
        String(o.completed) !== "true" && 
        o.completed !== true
      ) {
        usedMarks.add(String(o.mark).trim().toUpperCase());
      }
    });

    currentDrafts.forEach((d) => {
      if (d.mark && d.type === "Return") {
        usedMarks.add(String(d.mark).trim().toUpperCase());
      }
    });

    let index = 1;
    while (true) {
      const baseLabel = getExcelColumnLabel(index);
      const candidate = `R${baseLabel}`;
      if (!usedMarks.has(candidate)) {
        return baseLabel;
      }
      index++;
    }
  };

  // Get Singapore Zone based on 6-digit postcode (first 2 digits)
  const getZoneFromPostcode = (postcode: string | number): string => {
    if (!postcode) return "Unknown";
    const postcodeStr = postcode.toString().padStart(6, '0');
    const sector = parseInt(postcodeStr.substring(0, 2), 10);
    if (isNaN(sector)) return "Unknown";

    if (sector >= 1 && sector <= 10) return "South";
    if (sector >= 11 && sector <= 33) return "Central";
    if ((sector >= 34 && sector <= 52) || sector === 81) return "East";
    if ((sector >= 53 && sector <= 57) || sector === 79 || sector === 80 || sector === 82) return "North-East";
    if (sector >= 58 && sector <= 71) return "West";
    if (sector >= 72 && sector <= 78) return "North";

    return "Unknown";
  };

  const getZoneBadgeClass = (zone: string): string => {
    if (zone === "North") return "bg-sky-50 text-sky-700 border-sky-200";
    if (zone === "North-East") return "bg-teal-50 text-teal-700 border-teal-200";
    if (zone === "East") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (zone === "South") return "bg-pink-50 text-pink-700 border-pink-200";
    if (zone === "Central") return "bg-purple-50 text-purple-700 border-purple-200";
    if (zone === "West") return "bg-indigo-50 text-indigo-700 border-indigo-200";
    return "bg-zinc-100 text-zinc-700 border-zinc-300";
  };

  const renderPoscodeCell = (poscode: string | number) => {
    const pStr = String(poscode || "").trim();
    if (!pStr) return <span className="text-zinc-400">—</span>;
    const zone = getZoneFromPostcode(pStr);
    const badgeClass = getZoneBadgeClass(zone);

    return (
      <div className="flex items-center justify-center gap-1.5">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${badgeClass}`}>
          {zone}
        </span>
        <span className="font-normal text-zinc-500">{pStr}</span>
      </div>
    );
  };

  // Carton size lookup helper
  const getCartonSize = (sku: string): number => {
    const product = productsDb.find((p) => p.sku === sku);
    if (product && product.Carton) {
      const c = Number(product.Carton);
      return isNaN(c) || c <= 0 ? 0 : c;
    }
    return 0;
  };
  
  // Loose carton checker helper
  const hasLooseItems = (sku: string, qty: number): boolean => {
    const cartonSize = getCartonSize(sku);
    if (cartonSize <= 0) return false;
    return qty % cartonSize !== 0;
  };

  // Check draft order items for duplicates or loose carton quantities
  const checkOrderIssues = (items: SKUItem[]) => {
    const skuCounts: Record<string, number> = {};
    let hasDuplicate = false;
    let hasLoose = false;
    
    for (const item of items) {
      if (item.sku) {
        skuCounts[item.sku] = (skuCounts[item.sku] || 0) + 1;
        if (skuCounts[item.sku] > 1) {
          hasDuplicate = true;
        }
        if (hasLooseItems(item.sku, item.qty)) {
          hasLoose = true;
        }
      }
    }
    
    return { hasDuplicate, hasLoose };
  };

  // Singapore Map Pin Construction
  const activePins = React.useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    const isDoneToday = (order: DbOrder) => {
      let completedToday = false;
      try {
        const logs = typeof order.logs === "string" ? JSON.parse(order.logs) : order.logs;
        if (Array.isArray(logs)) {
          // Find any log entry of delivery (Delivered/Completed) or collection (Collected/Return Collected/Completed) that happened today
          const compLog = logs.find((l: any) => {
            const act = String(l.action || "").toLowerCase();
            return (act.includes("delivered") || act.includes("collected") || act.includes("completed") || act.includes("complete"));
          });
          if (compLog && Number(compLog.timestamp) >= startOfTodayMs) {
            completedToday = true;
          } else if (!compLog && order.timestamp && Number(order.timestamp) >= startOfTodayMs) {
            completedToday = true;
          }
        } else {
          if (order.timestamp && Number(order.timestamp) >= startOfTodayMs) {
            completedToday = true;
          }
        }
      } catch (_) {
        if (order.timestamp && Number(order.timestamp) >= startOfTodayMs) {
          completedToday = true;
        }
      }
      return completedToday;
    };

    // 1. Deliveries (Type !== "Return")
    const targetDeliveries = dbOrders.filter((o) => {
      if (o.type === "Return") return false;
      
      if (mapFilter === "pending") {
        if (String(o.completed) === "true" || o.completed === true) return false;
        return o.status !== "Delivered";
      } else {
        return o.status === "Delivered" && isDoneToday(o);
      }
    });

    const deliveryPins = targetDeliveries
      .filter((o) => o.poscode && validatePoscode(o.poscode))
      .map((o) => {
        let lat = Number(o.latitude);
        let lng = Number(o.longitude);

        // Fallback to static mapping if exact coords not saved or invalid
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
          const coords = getSingaporeLatLng(o.poscode);
          lat = coords.lat;
          lng = coords.lng;
        }
        
        // Colors & labels corresponding to color groups
        let color = "#9CA3AF"; // Default Gray
        let textColor = "#18181B"; // Dark text
        let displayStatus = "Preparing Goods";

        if (o.status === "Ready to Pick" || o.status === "Picking") {
          color = "#D47A8E"; // Dusty Rose
          textColor = "#FFFFFF";
          displayStatus = "Preparing Goods";
        } else if (o.status === "Ready to Deliver") {
          color = "#E28B54"; // Soft Orange
          textColor = "#FFFFFF";
          displayStatus = "Goods Ready";
        } else if (o.status === "Load" || o.status === "Out for Delivery") {
          color = "#007A87"; // Teal Blue
          textColor = "#FFFFFF";
          displayStatus = o.status === "Load" ? "Goods Ready" : "Driver Deliver or Collect Goods";
        } else if (o.status === "Delivered") {
          color = "#14532D"; // Deep Forest Green
          textColor = "#FFFFFF";
          displayStatus = "Complete Job";
        }
        
        return {
          id: o.id,
          mark: o.mark,
          poscode: o.poscode,
          deliverTo: o.deliver_to,
          status: displayStatus,
          color,
          textColor,
          lat,
          lng,
          isReturn: false,
          typeDisplay: o.type || "Normal",
          deliverMethod: o.deliver_method || "Company Delivery"
        };
      });

    // 2. Returns (Type === "Return")
    const targetReturns = dbOrders.filter((o) => {
      if (o.type !== "Return") return false;
      if (o.status === "Complete") return false; // Exclude complete status as requested

      if (mapFilter === "pending") {
        if (String(o.completed) === "true" || o.completed === true) return false;
        return o.status !== "Collected" && o.status !== "Return Collected";
      } else {
        return (o.status === "Collected" || o.status === "Return Collected") && isDoneToday(o);
      }
    });

    const returnPins = targetReturns
      .filter((o) => o.poscode)
      .map((o) => {
        let lat = Number(o.latitude);
        let lng = Number(o.longitude);

        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
          // Try to look up in stores directory
          const matchedStore = stores.find(s => String(s.id).trim() === String(o.poscode).trim());
          if (matchedStore && matchedStore["Pin Locations"]) {
            const parts = matchedStore["Pin Locations"].split(",");
            lat = Number(parts[0]);
            lng = Number(parts[1]);
          }
          
          if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            const coords = getSingaporeLatLng(o.poscode);
            lat = coords.lat;
            lng = coords.lng;
          }
        }

        // Return status colors & labels
        let color = "#007A87"; // Default Teal Blue (Pending)
        let textColor = "#FFFFFF";
        let displayStatus = "Driver Deliver or Collect Goods";

        if (o.status === "Collected" || o.status === "Return Collected") {
          color = "#14532D"; // Deep Forest Green
          textColor = "#FFFFFF";
          displayStatus = "Complete Job";
        } else {
          color = "#007A87"; // Teal Blue
          textColor = "#FFFFFF";
          displayStatus = "Driver Deliver or Collect Goods";
        }

        return {
          id: o.id,
          mark: o.mark,
          poscode: o.poscode,
          deliverTo: o.deliver_to,
          status: displayStatus,
          color,
          textColor,
          lat,
          lng,
          isReturn: true,
          typeDisplay: "Normal",
          deliverMethod: o.deliver_method || "Company Vehicle"
        };
      });

    return [...deliveryPins, ...returnPins];
  }, [dbOrders, stores, mapFilter]);

  // View Logs Dialog
  const handleOpenLogs = React.useCallback((order: DbOrder) => {
    let list: LogEntry[] = [];
    try {
      list = typeof order.logs === "string" ? JSON.parse(order.logs) : order.logs;
    } catch (_) {}
    setLogsList(list);
    setSelectedOrderMark(order.mark || "-");
    setSelectedOrderId(order.id || "-");
    setSelectedOrder(order);
    setIsLogsModalOpen(true);
  }, []);

  // 1. Initialize and cleanup Leaflet Map instance
  React.useEffect(() => {
    if (!leafletLoaded || activeTab !== "dashboard" || activeLiveTrackingSubTab !== "location") return;

    const L = (window as any).L;
    if (!L) return;

    if (!mapRef.current) {
      mapRef.current = L.map("leaflet-map", {
        zoomControl: true,
      }).setView([1.3521, 103.8198], 11);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19
      }).addTo(mapRef.current);

      markersGroupRef.current = L.featureGroup().addTo(mapRef.current);
      
      // Trigger invalidateSize to redraw tiles correctly on first render
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
      }
    };
  }, [leafletLoaded, activeTab, activeLiveTrackingSubTab]);

  // 2. Render and update markers dynamically without re-initializing the map (prevents flickering)
  React.useEffect(() => {
    if (!leafletLoaded || activeTab !== "dashboard" || activeLiveTrackingSubTab !== "location" || !mapRef.current || !markersGroupRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const markersGroup = markersGroupRef.current;
    markersGroup.clearLayers();

    // Add Warehouse Pin (postcode: 409461 -> 1.3197, 103.8962) with Home Icon in gray
    const homeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    const warehouseIcon = L.divIcon({
      html: `<div style="background-color: #9CA3AF; border: 1px solid white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.25);">${homeIconSvg}</div>`,
      className: "",
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    L.marker([1.3197, 103.8962], { icon: warehouseIcon })
      .addTo(markersGroup);

    // Register global window logs click callback
    (window as any).openOrderLogs = (orderId: string) => {
      const foundOrder = dbOrders.find(o => o.id === orderId);
      if (foundOrder) {
        handleOpenLogs(foundOrder);
      }
    };

    // Group pins by coordinates (rounded to 5 decimals for exact matches)
    const pinsByLocation: Record<string, typeof activePins> = {};
    activePins.forEach((pin) => {
      const key = `${pin.lat.toFixed(5)}_${pin.lng.toFixed(5)}`;
      if (!pinsByLocation[key]) {
        pinsByLocation[key] = [];
      }
      pinsByLocation[key].push(pin);
    });

    // Render markers side-by-side
    Object.values(pinsByLocation).forEach((pinsAtLoc) => {
      const N = pinsAtLoc.length;
      pinsAtLoc.forEach((pin, index) => {
        // Calculate offset for side-by-side placement
        const gap = 4;
        const pinWidth = 24;
        const offset = (index - (N - 1) / 2) * (pinWidth + gap);

        const customIcon = L.divIcon({
          html: `<div style="background-color: ${pin.color}; border: 1.5px solid white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-family: var(--font-primary, sans-serif); font-size: 10px; font-weight: 900; color: ${pin.textColor}; box-shadow: 0 2px 4px rgba(0,0,0,0.35); line-height: 22px; text-align: center; white-space: nowrap;">${pin.mark}</div>`,
          className: "",
          iconSize: [24, 24],
          iconAnchor: [12 - offset, 12],
          popupAnchor: [offset, -10]
        });

        const popupHtml = `
          <div style="font-family: sans-serif; font-size: 11px; line-height: 1.4; color: #18181B; font-weight: 500; min-width: 180px; padding: 2px;">
            <div style="font-size: 11px; font-weight: bold; border-bottom: 1px solid #E5E5E5; padding-bottom: 3.5px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <span>Mark ${pin.mark} (${pin.typeDisplay})</span>
              <button onclick="window.openOrderLogs('${pin.id}')" style="color: #0B57D0; font-weight: bold; cursor: pointer; border: none; background: none; font-size: 10px; text-decoration: underline; padding: 0;">Logs</button>
            </div>
            <div style="margin-top: 5px; margin-bottom: 3.5px; font-weight: 600; color: #000;">${pin.deliverTo}</div>
            <div style="color: #4B5563;">${pin.poscode} | ${pin.deliverMethod}</div>
          </div>
        `;

        L.marker([pin.lat, pin.lng], { icon: customIcon })
          .bindPopup(popupHtml)
          .addTo(markersGroup)
          .on('click', () => {
            const foundOrder = dbOrders.find(o => o.id === pin.id);
            if (foundOrder) {
              handleOpenLogs(foundOrder);
            }
          });
      });
    });
  }, [leafletLoaded, activeTab, activePins, dbOrders, handleOpenLogs]);

  // Save drafts helper
  const saveDraftsToStorage = (updatedDrafts: TrackOrderDraft[]) => {
    setDrafts(updatedDrafts);
    localStorage.setItem("track_order_drafts", JSON.stringify(updatedDrafts));
  };

  // Handle Bulk Invoice PDF Upload & Completion
  const handleBulkInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showToast("Please upload a valid PDF file", "error");
      return;
    }

    setInvoiceLoading(true);
    showToast("Processing bulk invoices...", "info");

    try {
      // Convert file to base64
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = (err) => reject(err);
      });

      // Call the Gemini invoice parser backend
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf: base64String, type: "application/pdf" })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server error status ${res.status}`);
      }

      const parsed = await res.json();
      const parsedInvoices = parsed.data;

      if (!parsed.success || !Array.isArray(parsedInvoices)) {
        throw new Error("Invalid response format from invoice parser.");
      }

      showToast(`Parsed ${parsedInvoices.length} invoices. Matching references...`, "info");

      let matchedCount = 0;
      let ignoredBlankRef = 0;
      let noMatchCount = 0;

      for (const inv of parsedInvoices) {
        const { invoiceNumber, poRef, invoiceAmount } = inv;

        if (!poRef || !poRef.trim()) {
          ignoredBlankRef++;
          continue;
        }

        // Find matching order in dbOrders based on ref_number
        const matchedOrder = dbOrders.find(
          (o) => String(o.ref_number).trim().toLowerCase() === String(poRef).trim().toLowerCase()
        );

        if (!matchedOrder) {
          noMatchCount++;
          continue;
        }

        matchedCount++;

        let currentLogs: LogEntry[] = [];
        try {
          currentLogs = typeof matchedOrder.logs === "string" ? JSON.parse(matchedOrder.logs) : matchedOrder.logs;
        } catch (_) {}
        if (!Array.isArray(currentLogs)) currentLogs = [];

        const updatedLogs = [
          ...currentLogs,
          {
            action: "Completed by Admin",
            actionBy: profile?.name || "Admin",
            remark: `Archived & Verified in Bulk (Invoice: ${invoiceNumber}, Amount: ${invoiceAmount})`,
            timestamp: Date.now()
          }
        ];

        // 1. Silent Background API request
        const payload = {
          action: "update",
          data: {
            id: matchedOrder.id,
            completed: "true",
            invoice_number: invoiceNumber || "",
            invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
            logs: JSON.stringify(updatedLogs)
          }
        };

        await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch((err) => console.error("Failed to sync bulk completed order:", matchedOrder.id, err));

        // 2. Update state instantly for UI responsiveness
        setDbOrders((prev) =>
          prev.map((o) =>
            o.id === matchedOrder.id
              ? {
                  ...o,
                  completed: "true",
                  invoice_number: invoiceNumber || "",
                  invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
                  logs: JSON.stringify(updatedLogs)
                }
              : o
          )
        );
      }

      showToast(
        `Bulk completion complete! ${matchedCount} matched, ${ignoredBlankRef} ignored (blank ref), ${noMatchCount} not matched.`,
        "success"
      );

    } catch (err: any) {
      showToast(err.message || "Failed to process bulk invoices.", "error");
    } finally {
      setInvoiceLoading(false);
      e.target.value = "";
    }
  };

  // Handle Bulk Invoice Excel/CSV Upload
  const handleBulkInvoiceExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setInvoiceLoading(true);
    showToast("Processing invoice spreadsheet...", "info");

    try {
      const data = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = (err) => reject(err);
      });

      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const sheetData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

      if (sheetData.length < 2) {
        throw new Error("The uploaded sheet has no data rows.");
      }

      // Parse headers
      const rawHeaders = sheetData[0] as any[];
      const headers = rawHeaders.map((h: any) => String(h || "").trim().toLowerCase().replace(/[\s_]+/g, ""));
      
      const invIdx = headers.findIndex(h => h === "invoice" || h === "invoicenumber" || h === "invoiceno");
      const refIdx = headers.findIndex(h => h === "refnumber" || h === "poref" || h === "reference");
      const amtIdx = headers.findIndex(h => h === "amount" || h === "invoiceamount" || h === "totalamount");

      if (invIdx === -1 || refIdx === -1 || amtIdx === -1) {
        throw new Error("Sheet must contain 'Invoice', 'Ref Number', and 'Amount' column headers.");
      }

      const parsedInvoices = [];
      for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i] as any[];
        if (!row || row.length === 0) continue;
        const invoiceNumber = String(row[invIdx] || "").trim();
        const poRef = String(row[refIdx] || "").trim();
        const invoiceAmount = row[amtIdx] !== undefined && row[amtIdx] !== null ? String(row[amtIdx]).trim() : "";
        if (!invoiceNumber && !poRef) continue;
        parsedInvoices.push({ invoiceNumber, poRef, invoiceAmount });
      }

      showToast(`Parsed ${parsedInvoices.length} invoices. Matching references...`, "info");

      let matchedCount = 0;
      let ignoredBlankRef = 0;
      let noMatchCount = 0;

      for (const inv of parsedInvoices) {
        const { invoiceNumber, poRef, invoiceAmount } = inv;

        if (!poRef || !poRef.trim()) {
          ignoredBlankRef++;
          continue;
        }

        const matchedOrder = dbOrders.find(
          (o) => String(o.ref_number).trim().toLowerCase() === String(poRef).trim().toLowerCase()
        );

        if (!matchedOrder) {
          noMatchCount++;
          continue;
        }

        matchedCount++;

        let currentLogs: LogEntry[] = [];
        try {
          currentLogs = typeof matchedOrder.logs === "string" ? JSON.parse(matchedOrder.logs) : matchedOrder.logs;
        } catch (_) {}
        if (!Array.isArray(currentLogs)) currentLogs = [];

        const updatedLogs = [
          ...currentLogs,
          {
            action: "Completed by Admin",
            actionBy: profile?.name || "Admin",
            remark: `Archived & Verified in Bulk (Invoice: ${invoiceNumber}, Amount: ${invoiceAmount})`,
            timestamp: Date.now()
          }
        ];

        const payload = {
          action: "update",
          data: {
            id: matchedOrder.id,
            completed: "true",
            invoice_number: invoiceNumber || "",
            invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
            logs: JSON.stringify(updatedLogs)
          }
        };

        await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch((err) => console.error("Failed to sync bulk completed order:", matchedOrder.id, err));

        setDbOrders((prev) =>
          prev.map((o) =>
            o.id === matchedOrder.id
              ? {
                  ...o,
                  completed: "true",
                  invoice_number: invoiceNumber || "",
                  invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
                  logs: JSON.stringify(updatedLogs)
                }
              : o
          )
        );
      }

      showToast(
        `Bulk completion complete! ${matchedCount} matched, ${ignoredBlankRef} ignored (blank ref), ${noMatchCount} not matched.`,
        "success"
      );
    } catch (err: any) {
      showToast(err.message || "Failed to process bulk invoices.", "error");
    } finally {
      setInvoiceLoading(false);
      e.target.value = "";
    }
  };

  // Handle DO Excel/CSV Upload (skips items)
  const handleDoExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPdfLoading(true);
    showToast("Processing order spreadsheet...", "info");

    try {
      const data = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = (err) => reject(err);
      });

      const workbook = XLSX.read(data, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const sheetData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

      if (sheetData.length < 2) {
        throw new Error("The uploaded sheet has no data rows.");
      }

      // Parse headers
      const rawHeaders = sheetData[0] as any[];
      const headers = rawHeaders.map((h: any) => String(h || "").trim().toLowerCase().replace(/[\s_]+/g, ""));
      
      const doIdx = headers.findIndex(h => h === "deliveryordernumber" || h === "donumber" || h === "do" || h === "invoicenumber" || h === "invoice" || h === "dono" || h === "deliveryorder");
      const refIdx = headers.findIndex(h => h === "refnumber" || h === "poref" || h === "reference" || h === "referenceo" || h === "ref" || h === "refno");
      const deliverToIdx = headers.findIndex(h => h === "address" || h === "deliverto" || h === "delivertoaddress" || h === "deliveryaddress" || h === "addres");
      const poscodeIdx = headers.findIndex(h => h === "pscode" || h === "poscode" || h === "postcode" || h === "postalcode" || h === "postal" || h === "postalno");
      const methodIdx = headers.findIndex(h => h === "metheod" || h === "method" || h === "delivermethod" || h === "deliverymethod" || h === "delivmethod");
      const itemsIdx = headers.findIndex(h => h === "items" || h === "item" || h === "skus" || h === "sku" || h === "skuitems" || h === "products");

      if (doIdx === -1) {
        throw new Error("Sheet must contain 'Delivery Order Number' or 'DO Number' or 'Invoice' column header.");
      }

      // Helper to parse items string e.g. "SKUA(or custom),1,SKUB,45,SKUC,35"
      const parseItemsValue = (raw: any): SKUItem[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        const str = String(raw).trim();
        if (!str) return [];

        // Check if JSON array string
        if (str.startsWith("[") && str.endsWith("]")) {
          try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed)) {
              return parsed.map((it: any) => ({
                sku: String(it.sku || it.name || it.item || "Unknown SKU").trim(),
                qty: Number(it.qty || it.quantity || 1) || 1
              }));
            }
          } catch (_) {}
        }

        const itemsList: SKUItem[] = [];
        const entries = str.split(/[\r\n;]+/).map((s: string) => s.trim()).filter(Boolean);

        for (const entry of entries) {
          if (entry.includes(":") || / [xX*] \d+/.test(entry)) {
            const parts = entry.split(/[:xX*]/);
            if (parts.length >= 2) {
              const sku = parts[0].trim();
              const qty = parseInt(parts[parts.length - 1].trim(), 10) || 1;
              if (sku) {
                itemsList.push({ sku, qty });
                continue;
              }
            }
          }

          const tokens = entry.split(",").map((t: string) => t.trim()).filter(Boolean);
          let i = 0;
          while (i < tokens.length) {
            const current = tokens[i];
            const next = tokens[i + 1];
            if (next !== undefined && /^\d+(\.\d+)?$/.test(next)) {
              itemsList.push({
                sku: current,
                qty: Number(next) || 1
              });
              i += 2;
            } else {
              itemsList.push({
                sku: current,
                qty: 1
              });
              i += 1;
            }
          }
        }

        return itemsList;
      };

      const duplicates: string[] = [];
      const uniqueNewDrafts: TrackOrderDraft[] = [];
      const tempAssignedMarks: string[] = [];

      for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i] as any[];
        if (!row || row.length === 0) continue;

        const doNum = String(row[doIdx] || "").trim();
        if (!doNum) continue;

        const inDrafts = drafts.some((d) => d.doNumber === doNum);
        const inPending = pendingOrders.some((p) => p.do_number === doNum);
        const inCompleted = completedOrders.some((c) => c.do_number === doNum);

        if (inDrafts || inPending || inCompleted) {
          duplicates.push(doNum);
        } else {
          const refNum = refIdx !== -1 ? String(row[refIdx] || "").trim() : "";
          const deliverTo = deliverToIdx !== -1 && String(row[deliverToIdx] || "").trim() ? String(row[deliverToIdx] || "").trim() : "Singapore Address";
          const poscode = poscodeIdx !== -1 ? String(row[poscodeIdx] || "").trim() : "";
          const deliverMethod = methodIdx !== -1 && String(row[methodIdx] || "").trim() ? String(row[methodIdx] || "").trim() : "Company Delivery";
          const parsedItems = itemsIdx !== -1 ? parseItemsValue(row[itemsIdx]) : [];

          const assignedMark = getNextAvailableMark(drafts, pendingOrders, tempAssignedMarks);
          if (assignedMark) {
            tempAssignedMarks.push(assignedMark);
          }

          uniqueNewDrafts.push({
            id: `${doNum}_${refNum || "NA"}`,
            doNumber: doNum,
            refNumber: refNum,
            mark: assignedMark,
            type: "Normal",
            deliverTo: deliverTo,
            poscode: poscode,
            items: parsedItems,
            appointmentDate: undefined,
            appointmentTimeWindow: undefined,
            deliverMethod: deliverMethod,
            pdfImages: []
          });
        }
      }

      if (duplicates.length > 0) {
        showToast(`Warning: Order(s) ${duplicates.join(", ")} already registered in system.`, "warning");
      }

      if (uniqueNewDrafts.length > 0) {
        const mergedDrafts = [...drafts, ...uniqueNewDrafts];
        saveDraftsToStorage(mergedDrafts);
        showToast(`Successfully read spreadsheet. Added ${uniqueNewDrafts.length} orders to drafts.`, "success");
      }
    } catch (err: any) {
      showToast("Failed to read spreadsheet: " + err.message, "error");
    } finally {
      setPdfLoading(false);
      e.target.value = "";
    }
  };

  // Handle DO PDF Upload & Parsing
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (file.type !== "application/pdf") {
      showToast("Please upload a valid PDF file", "error");
      return;
    }

    setPdfLoading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = (reader.result as string).split(",")[1];
        
        let pdfImages: string[] = [];
        try {
          const pdfjsLib = await loadPdfJs();
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext("2d");
            
            if (context) {
              await page.render({ canvasContext: context, viewport }).promise;
              let quality = 0.8;
              let dataUrl = canvas.toDataURL("image/jpeg", quality);
              while (dataUrl.length > 340000 && quality > 0.15) {
                quality -= 0.1;
                dataUrl = canvas.toDataURL("image/jpeg", quality);
              }
              pdfImages.push(dataUrl);
            }
          }
        } catch (pdfErr) {
          console.error("PDF page rendering failed:", pdfErr);
        }

        try {
          const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/parse-do", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pdf: base64String, type: "application/pdf" })
          });

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error || `Server error status ${res.status}`);
          }

          const parsed = await res.json();
          let parsedList = parsed.data;
          if (parsed.success && parsedList && typeof parsedList === "object" && !Array.isArray(parsedList)) {
            if (Array.isArray(parsedList.orders)) {
              parsedList = parsedList.orders;
            } else if (Array.isArray(parsedList.data)) {
              parsedList = parsedList.data;
            } else {
              parsedList = [parsedList];
            }
          }

          console.log("[DO UPLOAD] Raw parsed list from Gemini parser:", parsedList);

          if (parsed.success && Array.isArray(parsedList)) {
            const duplicates: string[] = [];
            const uniqueNewDrafts: TrackOrderDraft[] = [];
            const tempAssignedMarks: string[] = [];
            parsedList.forEach((item: any, idx: number) => {
              const doNum = item.doNumber || `DO-${Date.now()}-${idx}`;
              
              // Validation: check if DO Number is already registered in Drafts, Pending, or Completed lists
              const inDrafts = drafts.some((d) => d.doNumber === doNum);
              const inPending = pendingOrders.some((p) => p.do_number === doNum);
              const inCompleted = completedOrders.some((c) => c.do_number === doNum);

              if (inDrafts || inPending || inCompleted) {
                duplicates.push(doNum);
              } else {
                const refNum = item.refNumber || "";
                const assignedMark = getNextAvailableMark(drafts, pendingOrders, tempAssignedMarks);
                if (assignedMark) {
                  tempAssignedMarks.push(assignedMark);
                }

                console.log(`[DO UPLOAD] Processing order ${doNum}. pageNumbers:`, item.pageNumbers);

                const itemPageNumbers = Array.isArray(item.pageNumbers) ? item.pageNumbers : [];
                const orderPdfImages = itemPageNumbers.length > 0
                  ? itemPageNumbers.map((pNum: any) => pdfImages[parseInt(pNum, 10) - 1]).filter(Boolean)
                  : pdfImages;

                console.log(`[DO UPLOAD] Order ${doNum} mapped images count: ${orderPdfImages.length}`);

                uniqueNewDrafts.push({
                  id: `${doNum}_${refNum || "NA"}`,
                  doNumber: doNum,
                  refNumber: refNum,
                  mark: assignedMark,
                  type: "Normal",
                  deliverTo: item.deliverTo || "Singapore Address",
                  poscode: item.poscode || "",
                  items: Array.isArray(item.items) ? item.items.map((i: any) => ({
                    sku: i.sku || "Unknown SKU",
                    qty: Number(i.qty) || 1
                  })) : [],
                  appointmentDate: undefined,
                  appointmentTimeWindow: undefined,
                  deliverMethod: "Company Delivery",
                  pdfImages: orderPdfImages
                });
              }
            });

            if (duplicates.length > 0) {
              showToast(`Warning: Order(s) ${duplicates.join(", ")} already registered in system. Please check order.`, "warning");
            }

            if (uniqueNewDrafts.length > 0) {
              const mergedDrafts = [...drafts, ...uniqueNewDrafts];
              saveDraftsToStorage(mergedDrafts);
              showToast(`Successfully read DO. Added ${uniqueNewDrafts.length} orders to drafts.`, "success");
            }
          } else {
            throw new Error("Invalid output format received");
          }
        } catch (e: any) {
          showToast("Failed to read DO: " + e.message, "error");
        } finally {
          setPdfLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.onerror = () => {
        throw new Error("Failed to read file buffer");
      };
    } catch (e: any) {
      showToast("File reading error: " + e.message, "error");
      setPdfLoading(false);
    }
  };

  // Draft Cell edits
  const handleUpdateDraftCell = (index: number, field: keyof TrackOrderDraft, value: any) => {
    const updated = drafts.map((draft, idx) => {
      if (idx === index) {
        let cleanVal = value;
        if (field === "mark") {
          // Capitalize & limit to single letter or characters
          cleanVal = String(value).toUpperCase().trim();
          if (draft.type !== "Return" && cleanVal.startsWith("R")) {
            showToast("Delivery order mark cannot start with 'R' (reserved for Returns).", "error");
            return draft;
          }
        }
        
        const newDraft = { ...draft, [field]: cleanVal };
        
        // Dynamically compute/update deadline
        if (newDraft.type === "Urgent") {
          newDraft.deadline = getUrgentDeadline();
        } else if (newDraft.type === "Appointment") {
          if (newDraft.appointmentDate && newDraft.appointmentTimeWindow) {
            newDraft.deadline = getAppointmentDeadline(newDraft.appointmentDate, newDraft.appointmentTimeWindow);
          } else {
            newDraft.deadline = 0;
          }
        } else {
          newDraft.deadline = 0;
        }
        
        return newDraft;
      }
      return draft;
    });
    saveDraftsToStorage(updated);
  };

  // Delete Draft
  const handleDeleteDraft = (index: number) => {
    const updated = drafts.filter((_, idx) => idx !== index);
    saveDraftsToStorage(updated);
    showToast("Draft deleted", "info");
  };



  // Send Order to Database
  const handleSendOrder = async (index: number) => {
    const order = drafts[index];
    if (!order) return;

    if (sendingDraftIds[order.id]) {
      return;
    }

    if (!order.mark) {
      showToast("Please assign a Mark (A, B, C, D) before sending.", "error");
      return;
    }
    if (order.type !== "Return" && order.mark.trim().toUpperCase().startsWith("R")) {
      showToast("Delivery order mark cannot start with 'R' (reserved for Returns).", "error");
      return;
    }
    
    if (order.mark.length > 3) {
      showToast("Mark must be 3 characters or less.", "error");
      return;
    }

    if (!order.poscode || !validatePoscode(order.poscode)) {
      showToast("Please input a valid 6-digit Singapore Postal Code.", "error");
      return;
    }

    const isReturn = order.type === "Return";

    // Validation: check if the mark is currently active
    const isMarkActive = isReturn
      ? dbOrders.some(
          (o) =>
            o.type === "Return" &&
            o.status !== "Complete" &&
            o.status !== "Collected" &&
            o.status !== "Return Collected" &&
            String(o.completed) !== "true" &&
            o.completed !== true &&
            String(o.mark).toUpperCase() === order.mark.toUpperCase()
        )
      : pendingOrders.some(
          (o) => String(o.mark).toUpperCase() === order.mark.toUpperCase() && o.status !== "Delivered"
        );

    if (isMarkActive) {
      showToast(`Cannot send. Mark "${order.mark}" is currently active in another pending order.`, "error");
      return;
    }

    // Prevent duplicate sending by tracking the draft ID
    setSendingDraftIds((prev) => ({ ...prev, [order.id]: true }));

    // Capture previous states for rollback
    const previousDbOrders = [...dbOrders];
    const previousDrafts = [...drafts];

    const initialLogs: LogEntry[] = [
      {
        action: isReturn ? "Created Return" : "Created & Sent",
        actionBy: currentUser,
        remark: isReturn ? "Initial return creation" : "Initial creation",
        timestamp: Date.now()
      }
    ];

    let finalType: string = order.type;
    if (order.type === "Appointment" && order.appointmentDate && order.appointmentTimeWindow) {
      const formattedDate = formatDateStringToDDMMYYYY(order.appointmentDate);
      finalType = `Appointment (${formattedDate} ${order.appointmentTimeWindow})`;
    }

    let deadlineVal = order.deadline;
    if (!isReturn && order.type === "Urgent" && (!deadlineVal || deadlineVal <= 0)) {
      deadlineVal = getUrgentDeadline();
    }

    const defaultMethod = isReturn ? "Company Vehicle" : "Company Delivery";
    const initialStatus = isReturn ? "Pending" : "Ready to Pick";

    // --- INSTANT UPDATE (OPTIMISTIC UI) ---
    // Start with local/temporary coordinates/images and let it instantly display
    const newDbOrder: DbOrder = {
      id: order.id,
      do_number: order.doNumber,
      ref_number: order.refNumber || "",
      mark: order.mark,
      type: finalType,
      deliver_to: order.deliverTo,
      poscode: order.poscode,
      items: JSON.stringify(order.items),
      status: initialStatus,
      logs: JSON.stringify(initialLogs),
      timestamp: Date.now(),
      delivered_at: "",
      completed: "false",
      deadline: deadlineVal || "",
      deliver_method: order.deliverMethod || defaultMethod,
      latitude: order.latitude || "",
      longitude: order.longitude || "",
      photo_do_paper: "",
      photo_do_paper_signed: "",
      photo_delivered_proof: "",
      photo_handover_proof: "",
      photo_picker_proof: ""
    };

    // Update state instantly
    setDbOrders((prev) => [...prev, newDbOrder]);
    const remainingDrafts = drafts.filter((_, idx) => idx !== index);
    saveDraftsToStorage(remainingDrafts);

    showToast(`Order ${order.doNumber} sent.`, "info");

    // --- SILENT BACKGROUND UPDATE ---
    (async () => {
      // Fetch exact coordinates from OneMap API in background
      let lat: number | string = order.latitude || "";
      let lng: number | string = order.longitude || "";
      try {
        const coords = await fetchPostcodeCoordinates(order.poscode, oneMapUrl, oneMapToken);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      } catch (_) {}

      // Upload draft's PDF images to R2 under Track_Orders/DO_Paper/ in background
      let photoDoPaperUrl = "";
      if (order.pdfImages && order.pdfImages.length > 0) {
        showToast(`Uploading DO Paper proof (${order.pdfImages.length} page(s))...`, "info");
        const uploadedUrls: string[] = [];
        for (let i = 0; i < order.pdfImages.length; i++) {
          try {
            const base64Data = order.pdfImages[i].split(",")[1] || order.pdfImages[i];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let j = 0; j < byteCharacters.length; j++) {
              byteNumbers[j] = byteCharacters.charCodeAt(j);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "image/jpeg" });
            
            const filename = `Track_Orders/DO_Paper/${order.doNumber}_page_${i + 1}_${Date.now()}.jpg`;
            const uploadRes = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(filename)}`, {
              method: "POST",
              headers: { "Content-Type": "image/jpeg" },
              body: blob
            });
            if (uploadRes.ok) {
              const uploadResData = await uploadRes.json();
              if (uploadResData.success) {
                uploadedUrls.push(uploadResData.url);
              }
            }
          } catch (uploadErr) {
            console.error("Failed to upload DO Paper page:", uploadErr);
          }
        }
        if (uploadedUrls.length > 0) {
          photoDoPaperUrl = JSON.stringify(uploadedUrls);
        }
      }

      // Sync payload to database via Cloudflare Worker
      const payload = {
        table: "Track_Orders",
        action: "insert",
        data: {
          id: order.id,
          do_number: order.doNumber,
          ref_number: order.refNumber || "",
          mark: order.mark,
          type: finalType,
          deliver_to: order.deliverTo,
          poscode: order.poscode,
          items: JSON.stringify(order.items),
          status: initialStatus,
          logs: JSON.stringify(initialLogs),
          timestamp: Date.now(),
          delivered_at: "",
          completed: "false",
          deadline: deadlineVal || "",
          deliver_method: order.deliverMethod || defaultMethod,
          latitude: lat,
          longitude: lng,
          photo_do_paper: photoDoPaperUrl,
          photo_do_paper_signed: "",
          photo_delivered_proof: "",
          photo_handover_proof: "",
          photo_picker_proof: ""
        }
      };

      try {
        const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
        const result = await res.json();
        if (!result.success) throw new Error(result.error || "Failed to update database");

        // Clear sending status
        setSendingDraftIds((prev) => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        });

        // Quieter database refresh to align coordinates/images in state
        fetchDatabaseOrders();
      } catch (err: any) {
        // Rollback state if synchronization fails
        setDbOrders(previousDbOrders);
        saveDraftsToStorage(previousDrafts);
        setSendingDraftIds((prev) => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        });
        showToast("Sync failed: " + err.message + ". Reverted changes.", "error");
      }
    })();
  };

  // Revoke Action: Deletes from Database and moves back to drafts
  const handleRevokeOrder = (order: DbOrder) => {
    setPendingRevokeOrder(order);
    setIsConfirmRevokeOpen(true);
  };

  const executeRevokeOrder = async (order: DbOrder) => {
    // --- INSTANT UPDATE (OPTIMISTIC UI) ---
    let parsedItems: SKUItem[] = [];
    try {
      parsedItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    } catch (_) {}

    const restoredDraft: TrackOrderDraft = {
      id: order.id,
      doNumber: order.do_number,
      refNumber: order.ref_number,
      mark: order.mark,
      type: (order.type as any) || "Normal",
      deliverTo: order.deliver_to,
      poscode: order.poscode,
      items: parsedItems
    };

    const previousDbOrders = [...dbOrders];
    const previousDrafts = [...drafts];

    setDbOrders((prev) => prev.filter((o) => o.id !== order.id));
    saveDraftsToStorage([...drafts, restoredDraft]);

    showToast(`Order ${order.do_number} revoked.`, "info");

    // --- SILENT BACKGROUND UPDATE ---
    const payload = {
      table: "Track_Orders",
      action: "delete",
      data: { id: order.id }
    };

    fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
        const result = await res.json();
        if (!result.success) throw new Error(result.error || "Failed to delete record");

        fetchDatabaseOrders(); // refresh cache quietly
      })
      .catch((err) => {
        // Rollback
        setDbOrders(previousDbOrders);
        saveDraftsToStorage(previousDrafts);
        showToast("Revoke failed: " + err.message + ". Reverted changes.", "error");
      });
  };

  // Complete Action: marks Completed = true
  const handleCompleteOrder = async (order: DbOrder, invoiceNum?: string, invoiceAmount?: number | string) => {
    // --- INSTANT UPDATE (OPTIMISTIC UI) ---
    let currentLogs: LogEntry[] = [];
    try {
      currentLogs = typeof order.logs === "string" ? JSON.parse(order.logs) : order.logs;
    } catch (_) {}

    const updatedLogs = [
      ...currentLogs,
      {
        action: "Completed by Admin",
        actionBy: currentUser,
        remark: invoiceNum 
          ? `Archived & Verified (Invoice: ${invoiceNum}, Amount: ${invoiceAmount || "0"})` 
          : `Archived & Verified (Amount: ${invoiceAmount || "0"})`,
        timestamp: Date.now()
      }
    ];

    const previousDbOrders = [...dbOrders];

    // Update state instantly
    setDbOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { 
              ...o, 
              completed: "true", 
              invoice_number: invoiceNum || "", 
              invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
              logs: JSON.stringify(updatedLogs) 
            }
          : o
      )
    );

    showToast(`Order ${order.do_number} archived.`, "info");

    // --- SILENT BACKGROUND UPDATE ---
    const payload = {
      table: "Track_Orders",
      action: "update",
      data: {
        id: order.id,
        completed: "true",
        invoice_number: invoiceNum || "",
        invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
        logs: JSON.stringify(updatedLogs)
      }
    };

    fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
        const result = await res.json();
        if (!result.success) throw new Error(result.error || "Failed to update record");

        fetchDatabaseOrders(); // refresh cache quietly
      })
      .catch((err) => {
        // Rollback
        setDbOrders(previousDbOrders);
        showToast("Archive failed: " + err.message + ". Reverted changes.", "error");
      });
  };

  const handleRevokeCompleteOrder = async (order: DbOrder) => {
    let currentLogs: LogEntry[] = [];
    try {
      currentLogs = typeof order.logs === "string" ? JSON.parse(order.logs) : order.logs;
    } catch (_) {}

    const updatedLogs = [
      ...currentLogs,
      {
        action: "Revoked Complete by Admin",
        actionBy: currentUser,
        remark: "Order reverted back to active deliveries",
        timestamp: Date.now()
      }
    ];

    const previousDbOrders = [...dbOrders];

    // Update state instantly (Optimistic UI)
    setDbOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { 
              ...o, 
              completed: "false", 
              logs: JSON.stringify(updatedLogs) 
            }
          : o
      )
    );

    showToast(`Order ${order.do_number} reverted to active deliveries.`, "info");

    const payload = {
      table: "Track_Orders",
      action: "update",
      data: {
        id: order.id,
        completed: "false",
        logs: JSON.stringify(updatedLogs)
      }
    };

    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchDatabaseOrders(true);
      } else {
        throw new Error("Worker responded with error");
      }
    } catch (err: any) {
      setDbOrders(previousDbOrders);
      showToast("Revoke failed: " + err.message, "error");
    }
  };

  const handleRevokeCompleteReturnOrder = async (order: DbOrder) => {
    let currentLogs: LogEntry[] = [];
    try {
      currentLogs = typeof order.logs === "string" ? JSON.parse(order.logs) : order.logs;
    } catch (_) {}

    const updatedLogs = [
      ...currentLogs,
      {
        action: "Revoked Complete by Admin",
        actionBy: currentUser,
        remark: "Return reverted back to active returns",
        timestamp: Date.now()
      }
    ];

    const previousDbOrders = [...dbOrders];

    // Update state instantly (Optimistic UI)
    setDbOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? { 
              ...o, 
              completed: "false", 
              logs: JSON.stringify(updatedLogs) 
            }
          : o
      )
    );

    showToast(`Return order ${order.do_number} reverted to active returns.`, "info");

    const payload = {
      table: "Track_Orders",
      action: "update",
      data: {
        id: order.id,
        completed: "false",
        logs: JSON.stringify(updatedLogs)
      }
    };

    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchDatabaseOrders(true);
      } else {
        throw new Error("Worker responded with error");
      }
    } catch (err: any) {
      setDbOrders(previousDbOrders);
      showToast("Revoke failed: " + err.message, "error");
    }
  };

  const handleTriggerRevokeComplete = (order: DbOrder) => {
    setPendingRevokeCompleteOrder(order);
    setIsRevokeCompleteConfirmOpen(true);
  };

  const handleConfirmRevokeComplete = async () => {
    if (!pendingRevokeCompleteOrder) return;
    setIsRevokeCompleteConfirmOpen(false);
    const order = pendingRevokeCompleteOrder;
    setPendingRevokeCompleteOrder(null);

    if (order.type === "Return") {
      await handleRevokeCompleteReturnOrder(order);
    } else {
      await handleRevokeCompleteOrder(order);
    }
  };

  const handleOpenEditInvoice = (order: DbOrder) => {
    setEditInvoiceOrder(order);
    const isReturn = order.type === "Return";
    const num = isReturn ? order.credit_note_number : order.invoice_number;
    setEditInvoiceNum(num !== undefined && num !== null ? String(num) : "");
    setEditInvoiceAmount(order.invoice_amount !== undefined && order.invoice_amount !== null ? String(order.invoice_amount) : "");
    setIsEditInvoiceModalOpen(true);
  };

  const handleSaveEditInvoice = async () => {
    if (!editInvoiceOrder) return;
    setIsEditInvoiceModalOpen(false);

    let currentLogs: LogEntry[] = [];
    try {
      currentLogs = typeof editInvoiceOrder.logs === "string" ? JSON.parse(editInvoiceOrder.logs) : editInvoiceOrder.logs;
    } catch (_) {}

    const isReturn = editInvoiceOrder.type === "Return";

    const updatedLogs = [
      ...currentLogs,
      {
        action: isReturn ? "Credit Note Edited by Admin" : "Invoice Edited by Admin",
        actionBy: currentUser,
        remark: isReturn 
          ? `Credit Note updated: ${editInvoiceNum} (Amount: ${editInvoiceAmount})`
          : `Invoice updated: ${editInvoiceNum} (Amount: ${editInvoiceAmount})`,
        timestamp: Date.now()
      }
    ];

    const previousDbOrders = [...dbOrders];

    // Optimistic UI update
    setDbOrders((prev) =>
      prev.map((o) => {
        if (o.id === editInvoiceOrder.id) {
          if (isReturn) {
            return { 
              ...o, 
              credit_note_number: editInvoiceNum.trim(),
              invoice_amount: editInvoiceAmount.trim(),
              logs: JSON.stringify(updatedLogs) 
            };
          } else {
            return { 
              ...o, 
              invoice_number: editInvoiceNum.trim(),
              invoice_amount: editInvoiceAmount.trim(),
              logs: JSON.stringify(updatedLogs) 
            };
          }
        }
        return o;
      })
    );

    showToast(isReturn ? `Credit Note updated for ${editInvoiceOrder.do_number}` : `Invoice updated for ${editInvoiceOrder.do_number}`, "success");

    const payload = {
      table: "Track_Orders",
      action: "update",
      data: isReturn 
        ? {
            id: editInvoiceOrder.id,
            credit_note_number: editInvoiceNum.trim(),
            invoice_amount: editInvoiceAmount.trim(),
            logs: JSON.stringify(updatedLogs)
          }
        : {
            id: editInvoiceOrder.id,
            invoice_number: editInvoiceNum.trim(),
            invoice_amount: editInvoiceAmount.trim(),
            logs: JSON.stringify(updatedLogs)
          }
    };

    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchDatabaseOrders(true);
      }
    } catch (err: any) {
      setDbOrders(previousDbOrders);
      showToast("Update failed: " + err.message, "error");
    }
  };

  const handleTriggerChangeStatus = (order: DbOrder) => {
    setStatusOrder(order);
    setNewStatus(order.status || "");
    setStatusRemark("");
    setStatusPhotoFile(null);
    setIsChangeStatusOpen(true);
  };

  const handleSaveStatusOverwrite = async () => {
    if (!statusOrder) return;
    if (!newStatus) {
      showToast("Please select a status", "error");
      return;
    }

    setStatusPhotoUploading(true);
    let uploadedPhotoUrl = "";

    try {
      if (statusPhotoFile) {
        showToast("Uploading status image...", "info");
        const fileName = `Track_Orders/Status_Overwrite/${statusOrder.do_number}_${Date.now()}.jpg`;
        const uploadRes = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(fileName)}`, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: statusPhotoFile
        });
        if (!uploadRes.ok) throw new Error("Image upload failed");
        const uploadData = await uploadRes.json() as any;
        if (uploadData.success) {
          uploadedPhotoUrl = uploadData.url;
        }
      }

      let currentLogs: LogEntry[] = [];
      try {
        currentLogs = typeof statusOrder.logs === "string" ? JSON.parse(statusOrder.logs) : statusOrder.logs;
      } catch (_) {}
      if (!Array.isArray(currentLogs)) currentLogs = [];

      const updatedLogs = [
        ...currentLogs,
        {
          action: `Status Overwritten: ${newStatus}`,
          actionBy: currentUser,
          remark: statusRemark || "Status changed by Admin",
          photoUrl: uploadedPhotoUrl || undefined,
          timestamp: Date.now()
        }
      ];

      const payloadData: Partial<DbOrder> = {
        id: statusOrder.id,
        status: newStatus,
        logs: JSON.stringify(updatedLogs)
      };

      if (newStatus === "Delivered" || newStatus === "Return Collected") {
        payloadData.delivered_at = Date.now();
      }

      const previousDbOrders = [...dbOrders];
      setDbOrders(prev => prev.map(o => o.id === statusOrder.id ? { ...o, ...payloadData } as DbOrder : o));

      setIsChangeStatusOpen(false);
      setStatusOrder(null);
      showToast(`Status updated to ${newStatus}`, "success");

      const payload = {
        table: "Track_Orders",
        action: "update",
        id: statusOrder.id,
        data: payloadData
      };

      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Server returned status ${res.status}`);
      const result = await res.json() as any;
      if (!result.success) throw new Error(result.error || "Update failed");

      fetchDatabaseOrders(true);
    } catch (err: any) {
      console.error("Status overwrite failed:", err);
      showToast("Failed to update status: " + err.message, "error");
    } finally {
      setStatusPhotoUploading(false);
    }
  };

  const handleTriggerCompleteOrder = (order: DbOrder) => {
    setPendingCompleteOrder(order);
    setInvoiceNumberInput("");
    setInvoiceAmountInput("");
    setIsCompleteConfirmOpen(true);
  };

  const handleTriggerCompleteReturnOrder = (order: DbOrder) => {
    setPendingCompleteOrder(order);
    setCreditNoteInput("");
    setInvoiceAmountInput("");
    setIsCompleteConfirmOpen(true);
  };

  const handleContinueComplete = () => {
    if (!pendingCompleteOrder) return;
    setIsCompleteConfirmOpen(false);
    
    if (pendingCompleteOrder.type === "Return") {
      handleCompleteReturnOrder(pendingCompleteOrder, creditNoteInput.trim(), invoiceAmountInput.trim());
    } else {
      handleCompleteOrder(pendingCompleteOrder, invoiceNumberInput.trim(), invoiceAmountInput.trim());
    }
    setPendingCompleteOrder(null);
  };

  // Items Side Panel Drawer Control
  const openItemsPanel = (mode: "edit" | "view", orderId: string, currentItems: SKUItem[]) => {
    setPanelMode(mode);
    setPanelOrderId(orderId);
    setPanelItems([...currentItems]);
    setIsPanelOpen(true);
  };

  const handleSavePanelItems = () => {
    if (panelMode === "edit" && panelOrderId) {
      // Find and update drafts
      const updatedDrafts = drafts.map((d) => {
        if (d.id === panelOrderId) {
          return { ...d, items: panelItems.filter((i) => i.sku.trim() !== "") };
        }
        return d;
      });
      saveDraftsToStorage(updatedDrafts);
      showToast("Items updated", "success");
    }
    setIsPanelOpen(false);
  };

  const handleUpdatePanelItemRow = (idx: number, field: keyof SKUItem, value: any) => {
    const updated = panelItems.map((item, index) => {
      if (index === idx) {
        return { ...item, [field]: field === "qty" ? Math.max(1, Number(value)) : value };
      }
      return item;
    });
    setPanelItems(updated);
  };

  const handleAddPanelItemRow = () => {
    setPanelItems([...panelItems, { sku: "", qty: 1 }]);
  };

  const handleDeletePanelItemRow = (idx: number) => {
    setPanelItems(panelItems.filter((_, index) => index !== idx));
  };



  // Filter & Sort Pending Delivery Orders
  const sortedPendingOrders = React.useMemo(() => {
    return pendingOrders
      .filter((o) => {
        if (deliveryStatusFilter !== "all" && (o.status || "").toLowerCase() !== deliveryStatusFilter.toLowerCase()) {
          return false;
        }
        return matchesOrderSearch(o, deliverySearchQuery);
      })
      .sort((a, b) => {
        const timeA = Number(a.timestamp) || 0;
        const timeB = Number(b.timestamp) || 0;
        return timeB - timeA;
      });
  }, [pendingOrders, deliveryStatusFilter, deliverySearchQuery, matchesOrderSearch]);

  // Filter & Sort Completed Delivery Orders
  const sortedCompletedOrders = React.useMemo(() => {
    return completedOrders
      .filter((o) => {
        if (deliveryStatusFilter !== "all" && (o.status || "").toLowerCase() !== deliveryStatusFilter.toLowerCase()) {
          return false;
        }
        return matchesOrderSearch(o, deliverySearchQuery);
      })
      .sort((a, b) => {
        const timeA = Number(a.timestamp) || 0;
        const timeB = Number(b.timestamp) || 0;
        return timeB - timeA;
      });
  }, [completedOrders, deliveryStatusFilter, deliverySearchQuery, matchesOrderSearch]);

  // Helper to truncate text to 15 words
  const truncateWords = (text: string, count = 15) => {
    if (!text) return "";
    const words = text.split(/\s+/);
    if (words.length <= count) return text;
    return words.slice(0, count).join(" ") + "...";
  };

  // Helper to truncate text to N characters
  const truncateCharacters = (text: string, limit = 14) => {
    if (!text) return "";
    if (text.length <= limit) return text;
    return text.substring(0, limit) + "...";
  };

  // Helper to calculate distance in KM between 2 lat/lng points
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getOrderLatLng = (o: DbOrder): [number, number] => {
    let lat = Number(o.latitude);
    let lng = Number(o.longitude);
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      const coords = getSingaporeLatLng(o.poscode);
      lat = coords.lat;
      lng = coords.lng;
    }
    return [lat, lng];
  };

  const sortOrdersByNearestRoute = (startLatLng: [number, number], orders: DbOrder[]): DbOrder[] => {
    const unvisited = [...orders];
    const path: DbOrder[] = [];
    let currentLatLng = startLatLng;

    // 1. Prioritize Urgent
    const urgents = unvisited.filter((o) => (o.type || "").trim().toLowerCase() === "urgent");
    while (urgents.length > 0) {
      let minDistance = Infinity;
      let nearestIndex = 0;
      for (let i = 0; i < urgents.length; i++) {
        const coords = getOrderLatLng(urgents[i]);
        const dist = calculateDistanceKm(currentLatLng[0], currentLatLng[1], coords[0], coords[1]);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }
      const nearest = urgents[nearestIndex];
      path.push(nearest);
      urgents.splice(nearestIndex, 1);
      const unvIdx = unvisited.indexOf(nearest);
      if (unvIdx > -1) unvisited.splice(unvIdx, 1);
      currentLatLng = getOrderLatLng(nearest);
    }

    // 2. Prioritize Appointments
    const appts = unvisited.filter((o) => (o.type || "").trim().toLowerCase().startsWith("appointment"));
    while (appts.length > 0) {
      let minDistance = Infinity;
      let nearestIndex = 0;
      for (let i = 0; i < appts.length; i++) {
        const coords = getOrderLatLng(appts[i]);
        const dist = calculateDistanceKm(currentLatLng[0], currentLatLng[1], coords[0], coords[1]);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }
      const nearest = appts[nearestIndex];
      path.push(nearest);
      appts.splice(nearestIndex, 1);
      const unvIdx = unvisited.indexOf(nearest);
      if (unvIdx > -1) unvisited.splice(unvIdx, 1);
      currentLatLng = getOrderLatLng(nearest);
    }

    // 3. Normal / Remaining
    while (unvisited.length > 0) {
      let minDistance = Infinity;
      let nearestIndex = 0;
      for (let i = 0; i < unvisited.length; i++) {
        const coords = getOrderLatLng(unvisited[i]);
        const dist = calculateDistanceKm(currentLatLng[0], currentLatLng[1], coords[0], coords[1]);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }
      const nearest = unvisited[nearestIndex];
      path.push(nearest);
      const unvIdx = unvisited.indexOf(nearest);
      if (unvIdx > -1) unvisited.splice(unvIdx, 1);
      currentLatLng = getOrderLatLng(nearest);
    }

    return path;
  };

  const formatShiftDuration = (startTime: any, endTime: any): string => {
    const s = Number(startTime);
    const e = Number(endTime) || Date.now();
    if (!s || isNaN(s) || s <= 0) return "—";
    const diffMs = Math.max(0, e - s);
    const totalMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const parseDriverCompletedLogs = (rawLogs: string): DriverLogCompletedEntry[] => {
    try {
      const parsed = typeof rawLogs === "string" ? JSON.parse(rawLogs || "[]") : rawLogs;
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
      }
    } catch (_) {}
    return [];
  };

  const parseDriverActiveOrderIds = (rawActive: string): string[] => {
    try {
      const parsed = typeof rawActive === "string" ? JSON.parse(rawActive || "[]") : rawActive;
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {}
    return [];
  };

  const resolveOrder = (orderIdOrDo: string): DbOrder | undefined => {
    const clean = String(orderIdOrDo || "").trim().toLowerCase();
    return dbOrders.find(
      (o) =>
        String(o.id || "").trim().toLowerCase() === clean ||
        String(o.do_number || "").trim().toLowerCase() === clean ||
        `${String(o.do_number || "").trim()}_${String(o.ref_number || "").trim()}`.toLowerCase() === clean
    );
  };

  const handleConfirmForceCloseJob = async () => {
    if (!forceCloseDriverJob) return;
    setForceCloseLoading(true);
    try {
      showToast("Closing driver shift...", "info");

      const completedLogs = parseDriverCompletedLogs(forceCloseDriverJob.driver_logs);
      let lastDoneTimestamp = 0;
      if (completedLogs.length > 0) {
        lastDoneTimestamp = Math.max(...completedLogs.map((l) => Number(l.timestamp) || 0));
      }
      const computedEndTime =
        lastDoneTimestamp > 0
          ? lastDoneTimestamp + 5 * 60 * 1000
          : (Number(forceCloseDriverJob.start_time) || Date.now()) + 5 * 60 * 1000;

      // Identify active undelivered orders
      const activeIds = parseDriverActiveOrderIds(forceCloseDriverJob.active_orders);
      const ordersToRevert = dbOrders.filter((o) => {
        const orderId = String(o.id || "");
        const doNum = String(o.do_number || "");
        const combined = `${doNum}_${String(o.ref_number || "")}`;
        const isMatchedId = activeIds.includes(orderId) || activeIds.includes(doNum) || activeIds.includes(combined);
        const isOutForDelivery = (o.status || "").trim().toLowerCase() === "out for delivery";
        const isAssignedDriver = (o.driver || "").trim().toLowerCase() === (forceCloseDriverJob.driver || "").trim().toLowerCase();
        return isMatchedId || (isOutForDelivery && isAssignedDriver);
      });

      // 1. Revert remaining orders from "Out for Delivery" to "Ready to Deliver"
      for (const order of ordersToRevert) {
        let currentLogs: LogEntry[] = [];
        try {
          currentLogs = typeof order.logs === "string" ? JSON.parse(order.logs || "[]") : order.logs || [];
        } catch (_) {}
        if (!Array.isArray(currentLogs)) currentLogs = [];

        const updatedLogs = [
          ...currentLogs,
          {
            action: "Shift Closed: Reverted to Ready to Deliver",
            actionBy: currentUser,
            remark: `Admin closed shift ${forceCloseDriverJob.id}. Reverted status from Out for Delivery to Ready to Deliver.`,
            timestamp: Date.now()
          }
        ];

        const payload = {
          table: "Track_Orders",
          action: "update",
          id: order.id,
          data: {
            id: order.id,
            status: "Ready to Deliver",
            logs: JSON.stringify(updatedLogs)
          }
        };

        await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      // 2. Update Driver_Log record to "OFF"
      const driverLogPayload = {
        table: "Driver_Log",
        action: "update",
        id: forceCloseDriverJob.id,
        data: {
          id: forceCloseDriverJob.id,
          status: "OFF",
          end_time: computedEndTime,
          active_orders: JSON.stringify([])
        }
      };

      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(driverLogPayload)
      });

      if (!res.ok) throw new Error("Failed to close driver job in database");

      showToast(`Shift closed for ${forceCloseDriverJob.driver}`, "success");
      setIsForceCloseModalOpen(false);
      setForceCloseDriverJob(null);

      // Refresh both
      fetchDriverLogs();
      fetchDatabaseOrders(true);
    } catch (err: any) {
      console.error("Force close job error:", err);
      showToast("Error closing shift: " + err.message, "error");
    } finally {
      setForceCloseLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] relative min-w-0">
      
      {/* Top Banner and Tabs */}
      <NavigationTabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={setActiveTab}
      />

      <div className="content-body flex-1 w-full overflow-y-auto">
        {/* TAB CONTENT: LIVE TRACKING (Formerly Dashboard) */}
        {activeTab === "dashboard" && (
          <div className="flex flex-col gap-4 animate-tableFadeInOnly">
            {/* Live Tracking Sub-tabs Switch Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLiveTrackingSubTab("location")}
                  className={`flex items-center gap-2 px-4 py-2 font-primary text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                    activeLiveTrackingSubTab === "location"
                      ? "border-[#0B57D0] text-[#0B57D0]"
                      : "border-transparent text-zinc-400 hover:text-zinc-700"
                  }`}
                >
                  <MapPin size={14} />
                  Track Location
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLiveTrackingSubTab("driver")}
                  className={`flex items-center gap-2 px-4 py-2 font-primary text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                    activeLiveTrackingSubTab === "driver"
                      ? "border-[#0B57D0] text-[#0B57D0]"
                      : "border-transparent text-zinc-400 hover:text-zinc-700"
                  }`}
                >
                  <Truck size={14} />
                  Track Driver
                  {onlineDrivers.length > 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* SUB-VIEW 1: TRACK LOCATION */}
            {activeLiveTrackingSubTab === "location" && (
              <div className="flex flex-col gap-6 animate-tableFadeInOnly">
                {/* Dashboard Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Card 1: Pending Delivery */}
                  <div className="bg-white border border-slate-200 rounded p-5 flex items-center justify-between shadow-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pending Delivery</span>
                      <span className="text-3xl font-bold text-zinc-950 mt-1">
                        {pendingOrders.filter((o) => o.status !== "Delivered").length}
                      </span>
                    </div>
                    <div className="h-10 w-10 bg-[#E8F0FE] rounded flex items-center justify-center text-[#0B57D0]">
                      <Calendar size={18} className="stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Card 2: Pending Return */}
                  <div className="bg-white border border-slate-200 rounded p-5 flex items-center justify-between shadow-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pending Return</span>
                      <span className="text-3xl font-bold text-zinc-950 mt-1">
                        {dbOrders.filter((o) => o.type === "Return" && String(o.completed) !== "true" && o.completed !== true && o.status !== "Collected" && o.status !== "Return Collected").length}
                      </span>
                    </div>
                    <div className="h-10 w-10 bg-[#FCE8E6] rounded flex items-center justify-center text-[#C5221F]">
                      <ClipboardCheck size={18} className="stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Card 3: Task Done */}
                  <div className="bg-white border border-slate-200 rounded p-5 flex items-center justify-between shadow-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Task Done</span>
                      <span className="text-3xl font-bold text-zinc-950 mt-1">{tasksDoneToday}</span>
                    </div>
                    <div className="h-10 w-10 bg-[#E6F4EA] rounded flex items-center justify-center text-[#137333]">
                      <CheckCircle size={18} className="stroke-[2.5]" />
                    </div>
                  </div>
                </div>

                {/* Full Width & Height Map Container */}
                <div className="w-full h-[calc(100vh-280px)] min-h-[450px] rounded border border-slate-200 overflow-hidden relative shadow-sm bg-white">
                  {/* Map Filter Toggle Button Overlay */}
                  <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-xs border border-slate-200 rounded shadow-md p-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setMapFilter("pending")}
                      className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition-all select-none ${
                        mapFilter === "pending"
                          ? "bg-[#0B57D0] text-white"
                          : "bg-transparent text-zinc-600 hover:bg-slate-100 hover:text-zinc-950"
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapFilter("complete")}
                      className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition-all select-none ${
                        mapFilter === "complete"
                          ? "bg-[#0B57D0] text-white"
                          : "bg-transparent text-zinc-600 hover:bg-slate-100 hover:text-zinc-950"
                      }`}
                    >
                      Complete
                    </button>
                  </div>

                  <div id="leaflet-map" className="w-full h-full z-10" />
                  {!leafletLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-20">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#0B57D0]" />
                        <span className="text-xs font-semibold text-zinc-500">Loading Map View...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: TRACK DRIVER */}
            {activeLiveTrackingSubTab === "driver" && (
              <div className="flex flex-col gap-4 animate-tableFadeInOnly">
                {/* Driver Sub-tabs Switch Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    {onlineDrivers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveDriverLogSubTab("online")}
                        className={`flex items-center gap-2 px-4 py-2 font-primary text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                          activeDriverLogSubTab === "online"
                            ? "border-[#0B57D0] text-[#0B57D0]"
                            : "border-transparent text-zinc-400 hover:text-zinc-700"
                        }`}
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Online ({onlineDrivers.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveDriverLogSubTab("closed")}
                      className={`px-4 py-2 font-primary text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                        activeDriverLogSubTab === "closed"
                          ? "border-[#0B57D0] text-[#0B57D0]"
                          : "border-transparent text-zinc-400 hover:text-zinc-700"
                      }`}
                    >
                      Job Closed ({closedDriverJobs.length})
                    </button>
                  </div>

                  {/* Search Bar for Order ID, Job ID, or Driver */}
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={driverSearchQuery}
                      onChange={(e) => setDriverSearchQuery(e.target.value)}
                      placeholder="Search Order ID, Job ID, Driver..."
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] transition-colors"
                    />
                    {driverSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setDriverSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                        title="Clear Search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ONLINE DRIVERS VIEW (3 Column Grid of Cards) */}
                {activeDriverLogSubTab === "online" && (
                  <div className="h-[calc(100vh-270px)] min-h-[400px] w-full overflow-y-auto pr-1">
                    {onlineDrivers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full bg-[#F0F4F9]/40 border border-dashed border-slate-200 rounded select-none">
                        <Truck size={40} className="text-zinc-400 mb-3" />
                        <span className="font-primary text-sm text-zinc-500 font-medium">
                          No drivers are currently online.
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
                        {onlineDrivers.map((driverJob) => {
                          const completedLogs = parseDriverCompletedLogs(driverJob.driver_logs);
                          const activeIds = parseDriverActiveOrderIds(driverJob.active_orders);
                          
                          // Match and resolve order objects
                          const remainingOrders: DbOrder[] = activeIds
                            .map((id) => resolveOrder(id))
                            .filter(Boolean) as DbOrder[];

                          // Calculate total issues/discrepancies count
                          const totalDiscrepancies = completedLogs.reduce(
                            (acc, curr) => acc + (curr.discrepancies ? curr.discrepancies.length : 0),
                            0
                          );

                          // Starting point from office (409461)
                          const startCoords: [number, number] = [1.3197, 103.8962];
                          
                          // Sort remaining active orders by nearest neighbor
                          const sortedRemaining = sortOrdersByNearestRoute(startCoords, remainingOrders);

                          const totalStops = completedLogs.length + remainingOrders.length;
                          const completionPct = totalStops > 0 ? Math.round((completedLogs.length / totalStops) * 100) : 0;

                          let runningCoords = startCoords;

                          return (
                            <div
                              key={driverJob.id}
                              className="bg-white border border-slate-200 rounded-lg flex flex-col shadow-xs overflow-hidden h-[calc(100vh-270px)] min-h-[480px]"
                            >
                              {/* Driver Card Header */}
                              <div className="bg-slate-50 border-b border-slate-200 p-3.5 flex flex-col gap-2 flex-shrink-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#0B57D0]/10 border border-[#0B57D0]/20 flex items-center justify-center text-[#0B57D0]">
                                      <Truck size={16} />
                                    </div>
                                    <div>
                                      <h4 className="font-primary text-sm font-bold text-zinc-900 leading-tight">
                                        {driverJob.driver}
                                      </h4>
                                      <span className="text-[10px] text-zinc-500 font-medium">
                                        Shift ID: {driverJob.id}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setForceCloseDriverJob(driverJob);
                                      setIsForceCloseModalOpen(true);
                                    }}
                                    title="End Driver Shift"
                                    className="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors cursor-pointer flex items-center justify-center"
                                  >
                                    <Square size={14} fill="currentColor" />
                                  </button>
                                </div>

                                {/* Shift Started & Stats bar */}
                                <div className="flex items-center justify-between text-[11px] font-medium text-zinc-600 bg-white px-2.5 py-1.5 rounded border border-slate-200">
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} className="text-zinc-400" />
                                    <span>Start: {formatTimestamp(driverJob.start_time)}</span>
                                  </div>
                                  <span className="font-semibold text-zinc-800">
                                    {completedLogs.length}/{totalStops} Done ({completionPct}%)
                                  </span>
                                </div>

                                {/* Issues Badge if any */}
                                {totalDiscrepancies > 0 && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                                    <AlertTriangle size={13} className="text-amber-600" />
                                    <span>{totalDiscrepancies} Discrepanc{totalDiscrepancies > 1 ? "ies" : "y"} / Remark Reported</span>
                                  </div>
                                )}

                                {driverJob.outsource_driver_details && (
                                  <div className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-semibold truncate">
                                    ℹ️ Outsource: {driverJob.outsource_driver_details}
                                  </div>
                                )}
                              </div>

                              {/* Route Timeline List (Scrollable) */}
                              <div className="p-3.5 flex-1 overflow-y-auto flex flex-col gap-0 font-primary text-xs">
                                {/* Node 0: Office / Warehouse Start */}
                                <div className="flex items-start gap-2.5">
                                  <div className="flex flex-col items-center">
                                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[10px] font-bold shadow-xs flex-shrink-0">
                                      🏢
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="font-bold text-zinc-900 text-xs">
                                      Start: Office / Warehouse
                                    </div>
                                    <div className="text-[10px] text-zinc-500">
                                      Poscode: 409461 — Central Zone
                                    </div>
                                  </div>
                                </div>

                                {/* Completed Stops (Green Nodes) */}
                                {completedLogs.map((logEntry, logIdx) => {
                                  const matchedOrder = resolveOrder(logEntry.id);
                                  const orderPoscode = matchedOrder?.poscode || "";
                                  const orderAddress = matchedOrder?.deliver_to || "Singapore Address";
                                  const orderMark = matchedOrder?.mark || "✓";

                                  const orderCoords = matchedOrder ? getOrderLatLng(matchedOrder) : startCoords;
                                  const distance = calculateDistanceKm(
                                    runningCoords[0],
                                    runningCoords[1],
                                    orderCoords[0],
                                    orderCoords[1]
                                  );
                                  runningCoords = orderCoords;

                                  const hasDiscrepancies = logEntry.discrepancies && logEntry.discrepancies.length > 0;

                                  return (
                                    <React.Fragment key={`log-${logIdx}-${logEntry.id}`}>
                                      {/* Vertical dotted line connecting nodes */}
                                      <div className="flex items-center gap-2.5 h-6 ml-3 my-0.5">
                                        <div className="w-[2px] h-full border-l-2 border-dashed border-emerald-300" />
                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                          +{distance.toFixed(1)} km
                                        </span>
                                      </div>

                                      <div className="flex items-start gap-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg p-2.5 my-0.5 shadow-xs">
                                        <div className="flex flex-col items-center">
                                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs flex-shrink-0">
                                            <Check size={13} strokeWidth={3} />
                                          </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-1">
                                            <div className="font-bold text-emerald-950 text-xs truncate">
                                              [{orderMark}] {logEntry.id}
                                            </div>
                                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                              {formatTimestamp(logEntry.timestamp)}
                                            </span>
                                          </div>

                                          <div className="text-[11px] text-zinc-600 font-medium truncate mt-0.5" title={orderAddress}>
                                            {orderAddress}
                                          </div>

                                          {orderPoscode && (
                                            <div className="mt-1">
                                              {renderPoscodeCell(orderPoscode)}
                                            </div>
                                          )}

                                          {/* Signed DO Proof Thumbnail */}
                                          {logEntry.signed_paper_img && (
                                            <div className="mt-2 flex items-center gap-2">
                                              <div
                                                onClick={() => setActiveLightboxImage(logEntry.signed_paper_img || null)}
                                                className="relative w-12 h-12 rounded border border-emerald-300 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-white flex-shrink-0 shadow-2xs"
                                                title="Click to view signed DO full screen"
                                              >
                                                <img
                                                  src={logEntry.signed_paper_img}
                                                  alt="Signed DO Proof"
                                                  className="w-full h-full object-cover"
                                                />
                                              </div>
                                              <span className="text-[10px] text-emerald-700 font-semibold">
                                                Signed DO Attached
                                              </span>
                                            </div>
                                          )}

                                          {/* Discrepancy / Issues Callout */}
                                          {hasDiscrepancies && (
                                            <div className="mt-2 bg-amber-50 border border-amber-300 rounded p-2 text-[10px] flex flex-col gap-1">
                                              <div className="flex items-center gap-1 font-bold text-amber-900">
                                                <AlertTriangle size={11} className="text-amber-600 flex-shrink-0" />
                                                <span>Discrepancy / Issue:</span>
                                              </div>
                                              {logEntry.discrepancies?.map((disc, dIdx) => (
                                                <div key={dIdx} className="text-amber-800 pl-3">
                                                  • <span className="font-semibold">{disc.sku}</span>: Ordered {disc.qty_ordered}, Delivered {disc.qty_delivered}
                                                  {disc.remark && (
                                                    <div className="text-zinc-600 italic">
                                                      Remark: "{disc.remark}"
                                                    </div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </React.Fragment>
                                  );
                                })}

                                {/* Active / Remaining Stops (Blue/Slate Nodes) */}
                                {sortedRemaining.map((activeOrder, aIdx) => {
                                  const orderCoords = getOrderLatLng(activeOrder);
                                  const distance = calculateDistanceKm(
                                    runningCoords[0],
                                    runningCoords[1],
                                    orderCoords[0],
                                    orderCoords[1]
                                  );
                                  runningCoords = orderCoords;

                                  let itemsCount = 0;
                                  try {
                                    const pItems = typeof activeOrder.items === "string" ? JSON.parse(activeOrder.items) : activeOrder.items;
                                    itemsCount = Array.isArray(pItems) ? pItems.reduce((acc: number, curr: SKUItem) => acc + curr.qty, 0) : 0;
                                  } catch (_) {}

                                  return (
                                    <React.Fragment key={`active-${activeOrder.id}-${aIdx}`}>
                                      {/* Vertical dotted line connecting nodes */}
                                      <div className="flex items-center gap-2.5 h-6 ml-3 my-0.5">
                                        <div className="w-[2px] h-full border-l-2 border-dashed border-blue-300" />
                                        <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                          +{distance.toFixed(1)} km
                                        </span>
                                      </div>

                                      <div className="flex items-start gap-2.5 bg-blue-50/30 border border-blue-200 rounded-lg p-2.5 my-0.5 shadow-xs">
                                        <div className="flex flex-col items-center">
                                          <div className="w-6 h-6 rounded-full bg-[#0B57D0] text-white flex items-center justify-center text-[10px] font-bold shadow-xs flex-shrink-0">
                                            {completedLogs.length + aIdx + 1}
                                          </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-1">
                                            <div className="font-bold text-blue-950 text-xs truncate">
                                              [{activeOrder.mark}] {activeOrder.do_number}_{activeOrder.ref_number || "NA"}
                                            </div>
                                            <span className="text-[9px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                              Out for Delivery
                                            </span>
                                          </div>

                                          <div className="text-[11px] text-zinc-600 font-medium truncate mt-0.5" title={activeOrder.deliver_to}>
                                            {activeOrder.deliver_to}
                                          </div>

                                          <div className="mt-1 flex items-center gap-2">
                                            {renderPoscodeCell(activeOrder.poscode)}
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[9px] font-bold text-zinc-600">
                                              <Boxes size={10} className="text-zinc-400" /> {itemsCount} items
                                            </span>
                                          </div>

                                          {activeOrder.type === "Urgent" && (
                                            <div className="mt-1.5 text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded flex items-center gap-1">
                                              <Clock size={10} className="text-red-500 animate-pulse" /> Urgent Delivery by 6:00 PM
                                            </div>
                                          )}

                                          {activeOrder.type?.startsWith("Appointment") && (
                                            <div className="mt-1.5 text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1">
                                              <Clock size={10} className="text-blue-500 animate-pulse" /> Appointment: {formatDateStr(activeOrder.deadline)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* JOB CLOSED TABLE VIEW */}
                {activeDriverLogSubTab === "closed" && (
                  <div className="h-[calc(100vh-270px)] min-h-[400px] w-full relative">
                    {closedDriverJobs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full bg-[#F0F4F9]/40 border border-dashed border-slate-200 rounded select-none">
                        <ClipboardCheck size={40} className="text-zinc-400 mb-3" />
                        <span className="font-primary text-sm text-zinc-500 font-medium">
                          No closed driver shifts recorded yet.
                        </span>
                      </div>
                    ) : (
                      <div className="h-full overflow-auto border border-slate-200 rounded bg-white">
                        <table className="w-full text-left font-primary text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-zinc-700 font-bold border-b border-slate-200 h-12">
                              <th className="sticky top-0 bg-slate-50 p-3 w-16 text-center align-middle z-10">Route Log</th>
                              <th className="sticky top-0 bg-slate-50 p-3 w-40 align-middle z-10">Job ID</th>
                              <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Driver Name</th>
                              <th className="sticky top-0 bg-slate-50 p-3 w-40 align-middle z-10">Shift Started</th>
                              <th className="sticky top-0 bg-slate-50 p-3 w-40 align-middle z-10">Shift Ended</th>
                              <th className="sticky top-0 bg-slate-50 p-3 w-28 align-middle z-10">Duration</th>
                              <th className="sticky top-0 bg-slate-50 p-3 w-28 text-center align-middle z-10">Completed Stops</th>
                              <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Discrepancies</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {closedDriverJobs.map((record, idx) => {
                              const logs = parseDriverCompletedLogs(record.driver_logs);
                              const totalIssues = logs.reduce(
                                (acc, curr) => acc + (curr.discrepancies ? curr.discrepancies.length : 0),
                                0
                              );

                              return (
                                <tr
                                  key={record.id}
                                  className={`transition-all h-14 ${
                                    idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F8F9FA]"
                                  } hover:bg-slate-50`}
                                >
                                  <td className="p-3 w-16 text-center align-middle border-b border-zinc-200">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedRouteLogRecord(record);
                                        setIsRouteLogModalOpen(true);
                                      }}
                                      title="View Complete Route Timeline Log"
                                      className="w-8 h-8 flex-shrink-0 aspect-square flex items-center justify-center rounded border border-[#0B57D0]/30 bg-[#0B57D0]/5 hover:bg-[#0B57D0] text-[#0B57D0] hover:text-white cursor-pointer transition-all outline-none mx-auto shadow-2xs"
                                    >
                                      <Route size={14} />
                                    </button>
                                  </td>
                                  <td className="p-3 w-40 font-mono font-bold text-zinc-900 align-middle border-b border-zinc-200">
                                    {record.id}
                                  </td>
                                  <td className="p-3 w-36 font-semibold text-zinc-800 align-middle border-b border-zinc-200">
                                    {record.driver}
                                    {record.outsource_driver_details && (
                                      <div className="text-[10px] text-zinc-400 font-normal truncate">
                                        {record.outsource_driver_details}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 w-40 text-zinc-600 align-middle border-b border-zinc-200">
                                    {formatTimestamp(record.start_time)}
                                  </td>
                                  <td className="p-3 w-40 text-zinc-600 align-middle border-b border-zinc-200">
                                    {formatTimestamp(record.end_time)}
                                  </td>
                                  <td className="p-3 w-28 font-semibold text-zinc-700 align-middle border-b border-zinc-200">
                                    {formatShiftDuration(record.start_time, record.end_time)}
                                  </td>
                                  <td className="p-3 w-28 text-center align-middle border-b border-zinc-200">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs">
                                      <Check size={11} strokeWidth={3} />
                                      {logs.length}
                                    </span>
                                  </td>
                                  <td className="p-3 w-36 align-middle border-b border-zinc-200">
                                    {totalIssues > 0 ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                                        <AlertTriangle size={11} className="text-amber-600" />
                                        {totalIssues} Issue{totalIssues > 1 ? "s" : ""}
                                      </span>
                                    ) : (
                                      <span className="text-zinc-400 font-normal text-[11px]">
                                        Clean (0)
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* TAB CONTENT: DELIVERY ORDER */}
      {activeTab === "delivery" && (
        <div className="flex flex-col gap-4 animate-tableFadeInOnly">
          {/* Sub-tabs switch header & Filter / Search Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1 border-b border-slate-200 pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveDeliveryTab("pending")}
                className={`px-4 py-2 font-primary text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                  activeDeliveryTab === "pending"
                    ? "border-[#0B57D0] text-[#0B57D0]"
                    : "border-transparent text-zinc-400 hover:text-zinc-700"
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setActiveDeliveryTab("complete")}
                className={`px-4 py-2 font-primary text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                  activeDeliveryTab === "complete"
                    ? "border-[#0B57D0] text-[#0B57D0]"
                    : "border-transparent text-zinc-400 hover:text-zinc-700"
                }`}
              >
                Complete
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!invoiceLoading) setIsInvoiceUploadChoiceOpen(true);
                }}
                className={`ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white rounded text-xs font-bold cursor-pointer transition-all ${invoiceLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Upload size={14} />
                Bulk Invoices Upload
              </button>
              <input
                type="file"
                ref={invoicePdfInputRef}
                accept="application/pdf"
                onChange={handleBulkInvoiceUpload}
                className="hidden"
                disabled={invoiceLoading}
              />
              <input
                type="file"
                ref={invoiceExcelInputRef}
                accept="text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleBulkInvoiceExcelUpload}
                className="hidden"
                disabled={invoiceLoading}
              />
              {invoiceLoading && (
                <span className="text-xs text-zinc-500 font-medium animate-pulse">
                  Processing invoices...
                </span>
              )}
            </div>

            {/* Filter Status & Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={deliveryStatusFilter}
                onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 text-zinc-700 font-medium focus:outline-none focus:border-[#0B57D0] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                {activeDeliveryTab === "pending" ? (
                  <>
                    <option value="Ready to Pick">Ready to Pick</option>
                    <option value="Picking">Picking</option>
                    <option value="Ready to Deliver">Ready to Deliver</option>
                    <option value="Out for Delivery">Out for Delivery</option>
                    <option value="Delivered">Delivered</option>
                  </>
                ) : (
                  <>
                    <option value="Complete">Complete</option>
                    <option value="Delivered">Delivered</option>
                  </>
                )}
              </select>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={deliverySearchQuery}
                  onChange={(e) => setDeliverySearchQuery(e.target.value)}
                  placeholder="Search ID, Ref, Address, Mark (e.g. A.)..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] transition-colors"
                />
                {deliverySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setDeliverySearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                    title="Clear Search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-zinc-600">
                {activeDeliveryTab === "pending" ? sortedPendingOrders.length : sortedCompletedOrders.length} Orders
              </span>
            </div>
          </div>

          {activeDeliveryTab === "pending" ? (
            <div className="h-[calc(100vh-220px)] min-h-[400px] w-full relative">
              {sortedPendingOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full bg-[#F0F4F9]/40 border border-dashed border-slate-200 rounded select-none">
                  <Boxes size={40} className="text-zinc-400 mb-3" />
                  <span className="font-primary text-sm text-zinc-500 font-medium">
                    No pending deliveries. Create and send orders from the Create Order tab.
                  </span>
                </div>
              ) : (
                <div className="h-full overflow-auto border border-slate-200 rounded bg-white">
                  <table className="w-full text-left font-primary text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-zinc-700 font-bold border-b border-slate-200 h-12">
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10"></th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Status</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-16 text-center align-middle z-10">Mark</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-56 align-middle z-10">Reference Number</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Type</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Address</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-28 text-center align-middle z-10">Poscode</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Method</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-20 text-center align-middle z-10">Items</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-16 text-center align-middle z-10">Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {(() => {
                        let lastDate = "";
                        return sortedPendingOrders.map((order, idx) => {
                          const dateStr = formatDateStr(order.timestamp);
                          const showDivider = dateStr !== lastDate;
                          if (showDivider) {
                            lastDate = dateStr;
                          }
                          let itemsCount = 0;
                          let parsedItems: SKUItem[] = [];
                          try {
                            parsedItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
                            itemsCount = parsedItems.reduce((acc: number, curr: SKUItem) => acc + curr.qty, 0);
                          } catch (_) {}

                          let statusBadge = "bg-zinc-100 text-zinc-700 border-zinc-300";
                          if (order.status === "Ready to Pick") {
                            statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
                          } else if (order.status === "Picking") {
                            statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                          } else if (order.status === "Ready to Deliver") {
                            statusBadge = "bg-indigo-50 text-indigo-700 border-indigo-200";
                          } else if (order.status === "Load") {
                            statusBadge = "bg-purple-50 text-purple-700 border-purple-200";
                          } else if (order.status === "Out for Delivery") {
                            statusBadge = "bg-pink-50 text-pink-700 border-pink-200";
                          } else if (order.status === "Delivered") {
                            statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                          }

                          return (
                            <React.Fragment key={`${order.id}-${idx}`}>
                              {showDivider && (
                                <tr className="bg-[#F1F3F4]/80 text-[#1A73E8] border-y border-[#DADCE0]">
                                  <td colSpan={10} className="p-2.5 pl-4 text-xs font-bold tracking-wide uppercase select-none">
                                    📅 {dateStr}
                                  </td>
                                </tr>
                              )}
                              <tr 
                                className={`transition-all h-14 ${
                                  idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F8F9FA]"
                                } hover:bg-slate-50`}
                              >
                                <td className="p-3 w-36 align-middle border-b border-zinc-200">
                                  <div className="flex items-center gap-1.5">
                                    <CustomButton
                                      variant="secondary"
                                      onClick={() => handleRevokeOrder(order)}
                                      title={order.status === "Delivered" ? "Cannot revoke a delivered order" : "Revoke and send back to drafts"}
                                      className="w-8 h-8 !px-0 flex items-center justify-center aspect-square"
                                      disabled={order.status === "Delivered"}
                                    >
                                      <Undo size={12} className="text-zinc-600" />
                                    </CustomButton>
                                    <CustomButton
                                      variant="secondary"
                                      onClick={() => openEditOrderPanel(order)}
                                      title={order.status === "Delivered" ? "Cannot edit a delivered order" : "Edit Order"}
                                      className="w-8 h-8 !px-0 flex items-center justify-center aspect-square"
                                      disabled={order.status === "Delivered"}
                                    >
                                      <Pencil size={12} className="text-zinc-600" />
                                    </CustomButton>
                                    <CustomButton
                                      variant="secondary"
                                      onClick={() => handleTriggerChangeStatus(order)}
                                      title="Change Status (Overwrite)"
                                      className="w-8 h-8 !px-0 flex items-center justify-center aspect-square"
                                    >
                                      <History size={12} className="text-zinc-600" />
                                    </CustomButton>
                                    <CustomButton
                                      variant="default"
                                      onClick={() => handleTriggerCompleteOrder(order)}
                                      disabled={order.status !== "Delivered"}
                                      title={order.status !== "Delivered" ? "Cannot complete until status is Delivered" : "Verify and archive"}
                                      className="w-8 h-8 !px-0 flex items-center justify-center aspect-square"
                                    >
                                      <CheckCircle size={12} className="text-emerald-600" />
                                    </CustomButton>
                                  </div>
                                </td>
                                <td className="p-3 w-36 align-middle border-b border-zinc-200">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${statusBadge}`}>
                                    {order.status || "Ready to Pick"}
                                  </span>
                                </td>
                                <td className="p-3 w-16 text-center font-semibold text-zinc-800 align-middle border-b border-zinc-200">
                                  {order.mark}
                                </td>
                                <td className="p-3 w-56 font-semibold text-zinc-800 align-middle border-b border-zinc-200">
                                  {order.do_number}
                                  {order.ref_number ? `_${order.ref_number}` : ""}
                                </td>
                                <td className="p-3 w-36 align-middle border-b border-zinc-200">
                                  {renderTypeCell(order)}
                                </td>
                                <td className="p-3 w-36 text-zinc-500 align-middle border-b border-zinc-200 whitespace-nowrap" title={order.deliver_to}>
                                  {order.deliver_to}
                                </td>
                                <td className="p-3 w-28 text-center text-zinc-500 align-middle border-b border-zinc-200">
                                  {renderPoscodeCell(order.poscode)}
                                </td>
                                <td className="p-3 w-36 align-middle border-b border-zinc-200 text-zinc-500">
                                  {order.deliver_method || "Company Delivery"}
                                </td>
                                <td className="p-3 w-20 text-center align-middle border-b border-zinc-200">
                                  <button
                                    type="button"
                                    onClick={() => openItemsPanel("view", order.id, parsedItems)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-all font-semibold text-zinc-700 cursor-pointer"
                                  >
                                    <Boxes size={12} className="text-zinc-500" />
                                    <span>{itemsCount}</span>
                                  </button>
                                </td>
                                <td className="p-3 w-16 text-center align-middle border-b border-zinc-200">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenLogs(order)}
                                    className="p-1 rounded hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 transition-all cursor-pointer"
                                  >
                                    <History size={16} />
                                  </button>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[calc(100vh-220px)] min-h-[400px] w-full relative">
              {sortedCompletedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full bg-[#F0F4F9]/40 border border-dashed border-slate-200 rounded select-none">
                  <CheckCircle size={40} className="text-zinc-400 mb-3" />
                  <span className="font-primary text-sm text-zinc-500 font-medium">
                    No completed orders found matching current filter or search.
                  </span>
                </div>
              ) : (
                <div className="h-full overflow-auto border border-slate-200 rounded bg-white">
                  <table className="w-full text-left font-primary text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-zinc-700 font-bold border-b border-slate-200 h-12">
                        <th className="sticky top-0 bg-slate-50 p-3 w-24 align-middle z-10"></th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-40 align-middle z-10">Delivered</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Deliver by</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Status</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-44 align-middle z-10">Reference Number</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-56 align-middle z-10">Address</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Method</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Invoice</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Amount</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-20 text-center align-middle z-10">Items</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-16 text-center align-middle z-10">Logs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {(() => {
                        let lastDate = "";
                        return sortedCompletedOrders.map((order, idx) => {
                          const dateStr = formatDateStr(order.timestamp);
                          const showDivider = dateStr !== lastDate;
                          if (showDivider) {
                            lastDate = dateStr;
                          }
                          let itemsCount = 0;
                          let parsedItems: SKUItem[] = [];
                          try {
                            parsedItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
                            itemsCount = parsedItems.reduce((acc: number, curr: SKUItem) => acc + curr.qty, 0);
                          } catch (_) {}

                          let deliveredTs = order.delivered_at;
                          if (!deliveredTs) {
                            let logsArr: LogEntry[] = [];
                            try {
                              logsArr = typeof order.logs === "string" ? JSON.parse(order.logs) : order.logs;
                              const match = logsArr.find((l) => l.action.toLowerCase() === "delivered" || l.action.includes("Delivered"));
                              if (match) deliveredTs = match.timestamp;
                            } catch (_) {}
                          }
                          if (!deliveredTs) {
                            deliveredTs = order.timestamp; 
                          }

                          return (
                            <React.Fragment key={order.id}>
                              {showDivider && (
                                <tr className="bg-[#F1F3F4]/80 text-[#1A73E8] border-y border-[#DADCE0]">
                                  <td colSpan={11} className="p-2.5 pl-4 text-xs font-bold tracking-wide uppercase select-none">
                                    📅 {dateStr}
                                  </td>
                                </tr>
                              )}
                              <tr 
                                className={`transition-all h-14 ${
                                  idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F8F9FA]"
                                } hover:bg-slate-50`}
                              >
                                <td className="p-3 w-24 align-middle flex items-center gap-1.5 h-14 border-b border-zinc-200">
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerRevokeComplete(order)}
                                    title="Revoke Complete (Send back to Pending)"
                                    className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer transition-all outline-none"
                                  >
                                    <Undo size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditInvoice(order)}
                                    title="Edit Invoice Details"
                                    className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer transition-all outline-none"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                </td>
                                <td className="p-3 w-40 font-semibold text-zinc-700 align-middle border-b border-zinc-200">
                                  {formatTimestamp(deliveredTs)}
                                </td>
                                <td className="p-3 w-36 font-semibold text-zinc-700 align-middle border-b border-zinc-200">
                                  {order.driver || "-"}
                                </td>
                                <td className="p-3 w-36 align-middle border-b border-zinc-200">
                                  {order.invoice_number ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                                      Invoiced
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200">
                                      Pending Invoice
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 w-44 font-semibold text-zinc-950 align-middle border-b border-zinc-200">
                                  {order.do_number}
                                  {order.ref_number ? `_${order.ref_number}` : ""}
                                </td>
                                <td className="p-3 w-56 text-zinc-500 align-middle border-b border-zinc-200 whitespace-nowrap" title={order.deliver_to}>
                                  {order.deliver_to}
                                </td>
                                <td className="p-3 w-36 align-middle border-b border-zinc-200 text-zinc-500">
                                  {order.deliver_method || "Company Delivery"}
                                </td>
                                <td className="p-3 w-36 font-semibold text-zinc-800 align-middle border-b border-zinc-200">
                                  {order.invoice_number || "-"}
                                </td>
                                <td className="p-3 w-36 font-semibold text-zinc-800 align-middle border-b border-zinc-200">
                                  {order.invoice_amount ? `$${Number(order.invoice_amount).toFixed(2)}` : "-"}
                                </td>
                                <td className="p-3 w-20 text-center align-middle border-b border-zinc-200">
                                  <button
                                    type="button"
                                    onClick={() => openItemsPanel("view", order.id, parsedItems)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-all font-semibold text-zinc-700 cursor-pointer"
                                  >
                                    <Boxes size={12} className="text-zinc-500" />
                                    <span className="font-bold text-[10px] text-zinc-600">{itemsCount}</span>
                                  </button>
                                </td>
                                <td className="p-3 w-16 text-center align-middle border-b border-zinc-200">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenLogs(order)}
                                    className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 text-zinc-600 cursor-pointer transition-all outline-none mx-auto"
                                  >
                                    <FileText size={12} />
                                  </button>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: RETURN ORDER */}
      {activeTab === "return" && (
        <div className="flex flex-col gap-4 animate-tableFadeInOnly">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveReturnTab("pending")}
                className={`px-4 py-2 font-primary text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                  activeReturnTab === "pending"
                    ? "border-[#0B57D0] text-[#0B57D0]"
                    : "border-transparent text-zinc-400 hover:text-zinc-700"
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setActiveReturnTab("complete")}
                className={`px-4 py-2 font-primary text-xs font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                  activeReturnTab === "complete"
                    ? "border-[#0B57D0] text-[#0B57D0]"
                    : "border-transparent text-zinc-400 hover:text-zinc-700"
                }`}
              >
                Complete
              </button>
            </div>

            {/* Filter Status & Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={returnStatusFilter}
                onChange={(e) => setReturnStatusFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 text-zinc-700 font-medium focus:outline-none focus:border-[#0B57D0] cursor-pointer"
              >
                <option value="all">All Statuses</option>
                {activeReturnTab === "pending" ? (
                  <>
                    <option value="Pending">Pending</option>
                    <option value="Ready to Collect">Ready to Collect</option>
                    <option value="Out for Collection">Out for Collection</option>
                    <option value="Collected">Collected</option>
                    <option value="Return Collected">Return Collected</option>
                  </>
                ) : (
                  <>
                    <option value="Complete">Complete</option>
                  </>
                )}
              </select>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 w-3.5 h-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={returnSearchQuery}
                  onChange={(e) => setReturnSearchQuery(e.target.value)}
                  placeholder="Search ID, Ref, Address, Mark (e.g. A.)..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] transition-colors"
                />
                {returnSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setReturnSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                    title="Clear Search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-zinc-600">
                {sortedReturnOrders.length} Returns
              </span>
            </div>
          </div>

          <div className="h-[calc(100vh-220px)] min-h-[400px] w-full relative">
            {sortedReturnOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full bg-[#F0F4F9]/40 border border-dashed border-slate-200 rounded select-none">
                <Boxes size={40} className="text-zinc-400 mb-3" />
                <span className="font-primary text-sm text-zinc-500 font-medium">
                  {activeReturnTab === "complete"
                    ? "No completed returns. Complete returns from the Pending tab."
                    : "No return orders found. Click Create Return from the Create Order tab."}
                </span>
              </div>
            ) : activeReturnTab === "complete" ? (
              <div className="h-full overflow-auto border border-slate-200 rounded bg-white">
                <table className="w-full text-left font-primary text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-zinc-700 font-bold border-b border-slate-200 h-12">
                      <th className="sticky top-0 bg-slate-50 p-3 w-24 align-middle z-10"></th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-40 align-middle z-10">Collected</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Collected by</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Status</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-44 align-middle z-10">Reference</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-56 align-middle z-10">Return Collect from</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Method</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Credit Note</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Amount</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-20 text-center align-middle z-10">Items</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-16 text-center align-middle z-10">Logs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {(() => {
                      let lastDate = "";
                      return sortedReturnOrders.map((order, idx) => {
                        const dateStr = formatDateStr(order.timestamp);
                        const showDivider = dateStr !== lastDate;
                        if (showDivider) {
                          lastDate = dateStr;
                        }
                        let itemsCount = 0;
                        let parsedItems: SKUItem[] = [];
                        try {
                          parsedItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
                          itemsCount = parsedItems.reduce((acc: number, curr: SKUItem) => acc + curr.qty, 0);
                        } catch (_) {}

                        let deliveredTs = order.delivered_at;
                        if (!deliveredTs) {
                          let logsArr: LogEntry[] = [];
                          try {
                            logsArr = typeof order.logs === "string" ? JSON.parse(order.logs) : order.logs;
                            const match = logsArr.find((l) => l.action.toLowerCase() === "completed" || l.action.includes("Completed") || l.action.toLowerCase() === "complete" || l.action.includes("Complete"));
                            if (match) deliveredTs = match.timestamp;
                          } catch (_) {}
                        }
                        if (!deliveredTs) {
                          deliveredTs = order.timestamp; 
                        }

                        return (
                          <React.Fragment key={order.id}>
                            {showDivider && (
                              <tr className="bg-[#F1F3F4]/80 text-[#1A73E8] border-y border-[#DADCE0]">
                                <td colSpan={11} className="p-2.5 pl-4 text-xs font-bold tracking-wide uppercase select-none">
                                  📅 {dateStr}
                                </td>
                              </tr>
                            )}
                            <tr 
                              className={`transition-all h-14 ${
                                idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F8F9FA]"
                              } hover:bg-slate-50`}
                            >
                              <td className="p-3 w-24 align-middle flex items-center gap-1.5 h-14 border-b border-zinc-200">
                                <button
                                  type="button"
                                  onClick={() => handleTriggerRevokeComplete(order)}
                                  title="Revoke Complete (Send back to Pending)"
                                  className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer transition-all outline-none"
                                >
                                  <Undo size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditInvoice(order)}
                                  title="Edit Credit Note Details"
                                  className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer transition-all outline-none"
                                >
                                  <Pencil size={12} />
                                </button>
                              </td>
                              <td className="p-3 w-40 font-semibold text-zinc-700 align-middle border-b border-zinc-200">
                                {formatTimestamp(deliveredTs)}
                              </td>
                              <td className="p-3 w-36 font-semibold text-zinc-700 align-middle border-b border-zinc-200">
                                {order.driver || "-"}
                              </td>
                              <td className="p-3 w-36 align-middle border-b border-zinc-200">
                                {order.credit_note_number ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                                    Credit Noted
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-200">
                                    Pending CN
                                  </span>
                                )}
                              </td>
                              <td className="p-3 w-44 font-semibold text-zinc-950 align-middle border-b border-zinc-200">
                                {order.ref_number || order.do_number}
                              </td>
                              <td className="p-3 w-56 text-zinc-500 align-middle border-b border-zinc-200 whitespace-nowrap" title={order.deliver_to}>
                                {order.deliver_to}
                              </td>
                              <td className="p-3 w-36 align-middle border-b border-zinc-200 text-zinc-500">
                                {order.deliver_method || "Company Vehicle"}
                              </td>
                              <td className="p-3 w-36 font-semibold text-zinc-800 align-middle border-b border-zinc-200">
                                {order.credit_note_number || "-"}
                              </td>
                              <td className="p-3 w-36 font-semibold text-zinc-800 align-middle border-b border-zinc-200">
                                {order.invoice_amount ? `$${Number(order.invoice_amount).toFixed(2)}` : "-"}
                              </td>
                              <td className="p-3 w-20 text-center align-middle border-b border-zinc-200">
                                <button
                                  type="button"
                                  onClick={() => openItemsPanel("view", order.id, parsedItems)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-all font-semibold text-zinc-700 cursor-pointer"
                                >
                                  <Boxes size={12} className="text-zinc-500" />
                                  <span className="font-bold text-[10px] text-zinc-600">{itemsCount}</span>
                                </button>
                              </td>
                              <td className="p-3 w-16 text-center align-middle border-b border-zinc-200">
                                <button
                                  type="button"
                                  onClick={() => handleOpenLogs(order)}
                                  className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 text-zinc-600 cursor-pointer transition-all outline-none mx-auto"
                                >
                                  <FileText size={12} />
                                </button>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full overflow-auto border border-slate-200 rounded bg-white">
                <table className="w-full text-left font-primary text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-zinc-700 font-bold border-b border-slate-200 h-12">
                      <th className="sticky top-0 bg-slate-50 p-3 w-28 align-middle z-10"></th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-16 text-center align-middle z-10">Mark</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-32 align-middle z-10">Status</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-44 align-middle z-10">Ref Number</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-56 align-middle z-10">Return Collect from</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Collect Method</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-32 align-middle z-10">Due Date</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-20 text-center align-middle z-10">Items</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-16 text-center align-middle z-10">Logs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {(() => {
                      let lastDate = "";
                      return sortedReturnOrders.map((order, idx) => {
                        const dateStr = formatDateStr(order.timestamp);
                        const showDivider = dateStr !== lastDate;
                        if (showDivider) {
                          lastDate = dateStr;
                        }
                        let itemsCount = 0;
                        let parsedItems: SKUItem[] = [];
                        try {
                          parsedItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
                          itemsCount = parsedItems.reduce((acc: number, curr: SKUItem) => acc + curr.qty, 0);
                        } catch (_) {}

                        let statusBadge = "bg-zinc-100 text-zinc-700 border-zinc-300";
                        if (order.status === "Pending") {
                          statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                        } else if (order.status === "Collected" || order.status === "Return Collected") {
                          statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
                        } else if (order.status === "Complete") {
                          statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        }

                        return (
                          <React.Fragment key={order.id}>
                            {showDivider && (
                              <tr className="bg-[#F1F3F4]/80 text-[#1A73E8] border-y border-[#DADCE0]">
                                <td colSpan={9} className="p-2.5 pl-4 text-xs font-bold tracking-wide uppercase select-none">
                                  📅 {dateStr}
                                </td>
                              </tr>
                            )}
                            <tr 
                              className={`transition-all h-14 ${
                                idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F8F9FA]"
                              } hover:bg-slate-50`}
                            >
                              <td className="p-3 w-36 align-middle flex items-center gap-1.5 h-14 border-b border-zinc-200">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReturnOrder(order)}
                                  title="Delete Return"
                                  className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 cursor-pointer transition-all outline-none"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditReturnPanel(order)}
                                  title="Edit Return"
                                  className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer transition-all outline-none"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTriggerChangeStatus(order)}
                                  title="Change Status (Overwrite)"
                                  className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 cursor-pointer transition-all outline-none"
                                >
                                  <History size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTriggerCompleteReturnOrder(order)}
                                  disabled={order.status !== "Collected" && order.status !== "Return Collected"}
                                  title={order.status !== "Collected" && order.status !== "Return Collected" ? "Cannot complete until status is Collected" : "Mark as Complete"}
                                  className={`w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded border transition-all outline-none ${
                                    order.status !== "Collected" && order.status !== "Return Collected" 
                                      ? "border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed opacity-50"
                                      : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 cursor-pointer"
                                  }`}
                                >
                                  <CheckCircle size={12} />
                                </button>
                              </td>
                              <td className="p-3 w-16 text-center font-bold text-zinc-800 align-middle border-b border-zinc-200">
                                {order.mark}
                              </td>
                              <td className="p-3 w-32 align-middle border-b border-zinc-200">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${statusBadge}`}>
                                  {order.status || "Pending"}
                                </span>
                              </td>
                              <td className="p-3 w-44 font-semibold text-zinc-850 align-middle border-b border-zinc-200">
                                {order.ref_number || order.do_number}
                              </td>
                              <td className="p-3 w-56 text-zinc-700 font-semibold align-middle border-b border-zinc-200 whitespace-nowrap" title={order.deliver_to}>
                                {order.deliver_to}
                              </td>
                              <td className="p-3 w-36 text-zinc-700 font-semibold align-middle border-b border-zinc-200" title={order.deliver_method}>
                                {order.deliver_method || "—"}
                              </td>
                              <td className="p-3 w-32 text-zinc-700 font-semibold align-middle border-b border-zinc-200">
                                {formatDateStr(order.deadline)}
                              </td>
                              <td className="p-3 w-20 text-center align-middle border-b border-zinc-200">
                                <button
                                  type="button"
                                  onClick={() => openItemsPanel("view", order.id, parsedItems)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-all font-semibold text-zinc-700 cursor-pointer"
                                >
                                  <Boxes size={12} className="text-zinc-500" />
                                  <span>{itemsCount}</span>
                                </button>
                              </td>
                              <td className="p-3 w-16 text-center align-middle border-b border-zinc-200">
                                <button
                                  type="button"
                                  onClick={() => handleOpenLogs(order)}
                                  className="p-1 rounded hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 transition-all cursor-pointer"
                                >
                                  <History size={16} />
                                </button>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CREATE ORDER */}
      {activeTab === "create" && (
        <div className="flex flex-col gap-4 animate-tableFadeInOnly">
          {/* Action buttons wrapper */}
          <div className="flex flex-wrap gap-3 items-center bg-slate-50 border border-slate-200 rounded p-4">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
            <input
              type="file"
              ref={doExcelInputRef}
              accept="text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              className="hidden"
              onChange={handleDoExcelUpload}
            />
            <CustomButton 
              variant="secondary"
              onClick={() => {
                if (!pdfLoading) setIsDoUploadChoiceOpen(true);
              }}
              disabled={pdfLoading}
              className="h-10 text-xs font-bold uppercase tracking-wider relative overflow-hidden"
            >
              <Upload size={14} />
              Import Order
              {pdfLoading && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 animate-[pulse_1s_infinite]" />
              )}
            </CustomButton>

            <CustomButton 
              variant="dark"
              onClick={() => {
                setCreateDoNumber(`DO-${Date.now()}`);
                setCreateRefNumber("");
                setCreateMark(getNextAvailableMark(drafts, pendingOrders));
                setCreateType("Normal");
                setCreateDeliverTo("");
                setCreatePoscode("");
                setCreateItems([]);
                setIsCreatePanelOpen(true);
              }}
              className="h-10 text-xs font-bold uppercase tracking-wider"
            >
              <Plus size={14} />
              Create Order
            </CustomButton>

            <CustomButton 
              variant="default"
              onClick={openCreateReturnPanel}
              className="h-10 text-xs font-bold uppercase tracking-wider"
            >
              <Plus size={14} />
              Create Return
            </CustomButton>
          </div>

          <div className="flex justify-between items-center px-1">
            <h3 className="font-primary text-base font-bold text-zinc-800">
              Draft Orders
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-zinc-600">
              {drafts.length} Drafts
            </span>
          </div>

          <div className="h-[calc(100vh-280px)] min-h-[400px] w-full relative">
            {drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full bg-[#F0F4F9]/40 border border-dashed border-slate-200 rounded select-none">
                <FileText size={40} className="text-zinc-400 mb-3" />
                <span className="font-primary text-sm text-zinc-500 font-medium">
                  No draft orders. Upload a Delivery Order PDF or click Create Order to start.
                </span>
              </div>
            ) : (
              <div className="h-full overflow-auto border border-slate-200 rounded bg-white">
                <table className="w-full text-left font-primary text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-zinc-700 font-bold border-b border-slate-200 h-12">
                      <th className="sticky top-0 bg-slate-50 p-3 w-20 text-center align-middle z-10">Category</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-20 align-middle z-10"></th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-16 text-center align-middle z-10">Mark</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-56 align-middle z-10">Reference Number</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Type</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-40 align-middle z-10">Address</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-28 text-center align-middle z-10">Poscode</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-40 align-middle z-10">Method</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-20 text-center align-middle z-10">Items</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {drafts.map((draft, idx) => (
                      <tr 
                        key={draft.id} 
                        className={`transition-all ${
                          idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F8F9FA]"
                        } hover:bg-slate-50`}
                      >
                        <td className="p-3 w-20 text-center align-middle border-b border-zinc-200">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                            draft.type === "Return"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {draft.type === "Return" ? "Return" : "Deliver"}
                          </span>
                        </td>
                        <td className="p-3 w-20 align-middle flex items-center gap-1.5 border-b border-zinc-200">
                          <CustomButton
                            variant="secondary"
                            onClick={() => handleSendOrder(idx)}
                            disabled={!!sendingDraftIds[draft.id]}
                            title="Send Order"
                            className="w-8 h-8 !px-0 flex items-center justify-center aspect-square"
                          >
                            <Send size={12} className="text-emerald-600" />
                          </CustomButton>
                          <CustomButton
                            variant="danger"
                            onClick={() => handleDeleteDraft(idx)}
                            disabled={!!sendingDraftIds[draft.id]}
                            title="Delete Draft"
                            className="w-8 h-8 !px-0 flex items-center justify-center aspect-square"
                          >
                            <Trash2 size={12} />
                          </CustomButton>
                        </td>
                        <td className="p-3 w-16 text-center align-middle border-b border-zinc-200">
                          <input
                            type="text"
                            maxLength={3}
                            value={draft.mark}
                            placeholder="A/B/C..."
                            onChange={(e) => handleUpdateDraftCell(idx, "mark", e.target.value)}
                            className="w-full h-7 px-2 rounded border border-zinc-300/40 hover:border-zinc-300 bg-transparent font-bold text-center text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          />
                        </td>
                        <td className="p-3 w-56 font-semibold text-zinc-800 align-middle border-b border-zinc-200">
                          {draft.doNumber}
                          {draft.refNumber ? `_${draft.refNumber}` : ""}
                        </td>
                        <td className="p-3 w-36 align-middle border-b border-zinc-200">
                          <div className="flex flex-col gap-1">
                            <select
                              value={draft.type}
                              onChange={(e) => handleUpdateDraftCell(idx, "type", e.target.value)}
                              className="w-full h-7 px-2 rounded border border-zinc-300/40 hover:border-zinc-300 bg-transparent font-normal text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                            >
                              <option value="Normal">Normal</option>
                              <option value="Urgent">Urgent</option>
                              <option value="Appointment">Appointment</option>
                              <option value="Return">Return</option>
                            </select>
                            {draft.type === "Appointment" && (
                              <div className="flex flex-col gap-1 mt-1">
                                <input
                                  type="date"
                                  value={draft.appointmentDate || ""}
                                  onChange={(e) => handleUpdateDraftCell(idx, "appointmentDate", e.target.value)}
                                  className="w-full h-7 px-2 rounded border border-zinc-300/40 bg-transparent text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 text-[10px]"
                                />
                                <input
                                  type="time"
                                  value={draft.appointmentTimeWindow || ""}
                                  onChange={(e) => handleUpdateDraftCell(idx, "appointmentTimeWindow", e.target.value)}
                                  className="w-full h-7 px-2 rounded border border-zinc-300/40 bg-transparent text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 text-[10px]"
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 w-40 text-zinc-500 align-middle border-b border-zinc-200 whitespace-nowrap" title={draft.deliverTo}>
                          {draft.deliverTo}
                        </td>
                        <td className="p-3 w-28 align-middle border-b border-zinc-200">
                          <input
                            type="text"
                            maxLength={6}
                            value={draft.poscode}
                            placeholder="Poscode"
                            onChange={(e) => handleUpdateDraftCell(idx, "poscode", e.target.value)}
                            className={`w-full h-7 px-2 rounded border text-center focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                              draft.poscode && !validatePoscode(draft.poscode)
                                ? "border-red-400 bg-red-50 text-red-700 font-medium"
                                : "border-zinc-300/40 hover:border-zinc-300 bg-transparent text-zinc-500 font-normal"
                            }`}
                          />
                        </td>
                        <td className="p-3 w-40 align-middle border-b border-zinc-200">
                          <select
                            value={draft.deliverMethod || "Company Delivery"}
                            onChange={(e) => handleUpdateDraftCell(idx, "deliverMethod", e.target.value)}
                            className="w-full h-7 px-2 rounded border border-zinc-300/40 hover:border-zinc-300 bg-transparent font-normal text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                          >
                            <option value="Company Delivery">Company Delivery</option>
                            <option value="External Delivery">External Delivery</option>
                            <option value="Warehouse Pickup">Warehouse Pickup</option>
                          </select>
                        </td>
                        <td className="p-3 w-20 text-center align-middle border-b border-zinc-200">
                          {(() => {
                            const { hasDuplicate, hasLoose } = checkOrderIssues(draft.items);
                            let btnStyle = "bg-white border-slate-200 text-zinc-700 hover:bg-slate-50";
                            let tooltip = "Edit Items List";
                            if (hasDuplicate) {
                              btnStyle = "bg-red-50 border-red-300 text-red-750 hover:bg-red-100 animate-pulse";
                              tooltip = "Warning: Duplicate SKU in order! Click to resolve.";
                            } else if (hasLoose) {
                              btnStyle = "bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100";
                              tooltip = "Warning: Loose carton quantities detected! Click to resolve.";
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => openItemsPanel("edit", draft.id, draft.items)}
                                title={tooltip}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded border transition-all font-semibold cursor-pointer ${btnStyle}`}
                              >
                                <Boxes size={14} />
                                <span>{draft.items.reduce((acc, curr) => acc + curr.qty, 0)}</span>
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      </div>

      {/* RIGHT SLIDE-IN PANEL (Drawer) */}
      <SlidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={`Track Order Items : ${panelOrderId}`}
        footer={
          <>
            <CustomButton variant="secondary" onClick={() => setIsPanelOpen(false)}>
              Cancel
            </CustomButton>
            {panelMode === "edit" && (
              <CustomButton variant="dark" onClick={handleSavePanelItems}>
                Save Changes
              </CustomButton>
            )}
          </>
        }
      >
        {panelMode === "edit" ? (
          // EDIT MODE
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-700">SKU / Item List</span>
              <CustomButton variant="secondary" onClick={handleAddPanelItemRow}>
                <Plus size={12} />
                Add Item
              </CustomButton>
            </div>

            <div className="flex flex-col gap-2">
              {(() => {
                const skuCounts = panelItems.reduce((acc, curr) => {
                  if (curr.sku) {
                    acc[curr.sku] = (acc[curr.sku] || 0) + 1;
                  }
                  return acc;
                }, {} as Record<string, number>);

                return panelItems.map((item, idx) => {
                  const isDup = item.sku && skuCounts[item.sku] > 1;
                  const isLoose = item.sku && hasLooseItems(item.sku, item.qty);
                  const cSize = item.sku ? getCartonSize(item.sku) : 0;

                  let cardClass = "border-zinc-300 bg-white";
                  let warningText = null;
                  
                  if (isDup) {
                    cardClass = "border-red-400 bg-red-50 text-red-900";
                    warningText = <span className="text-[10px] text-red-650 font-bold block mt-0.5">⚠️ Duplicate SKU in order</span>;
                  } else if (isLoose) {
                    cardClass = "border-amber-400 bg-amber-50 text-amber-900";
                    warningText = <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">⚠️ Loose quantity (Carton size: {cSize})</span>;
                  }

                  return (
                    <div key={idx} className={`flex flex-col p-2.5 rounded border shadow-xs transition-all ${cardClass}`}>
                      <div className="flex gap-2 items-center">
                        <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              list="sku-datalist"
                              value={item.sku}
                              placeholder="Select SKU or enter custom item..."
                              onChange={(e) => handleUpdatePanelItemRow(idx, "sku", e.target.value)}
                              className="w-full h-8 px-2 rounded border border-zinc-300 text-xs bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
                            />
                        </div>
                        <div className="w-16 flex-shrink-0">
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => handleUpdatePanelItemRow(idx, "qty", e.target.value)}
                            className="w-full h-8 px-2 rounded border border-zinc-300 text-xs text-center bg-white text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePanelItemRow(idx)}
                          className="p-1 rounded hover:bg-zinc-200 text-zinc-500 hover:text-zinc-850 cursor-pointer flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {warningText}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          // READ ONLY VIEW MODE
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-zinc-700 border-b border-zinc-200 pb-1 mb-1">
              Products List
            </span>
            
            <div className="flex flex-col gap-2">
              {panelItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white px-3 py-2.5 rounded border border-zinc-300">
                  <span className="text-xs font-semibold text-zinc-800">{item.sku}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700">
                    Qty: {item.qty}
                  </span>
                </div>
              ))}

              {panelItems.length === 0 && (
                <p className="text-xs text-zinc-400 italic text-center">
                  No items specified.
                </p>
              )}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* VIEW LOGS SLIDE-IN PANEL (Drawer) */}
      <SlidePanel
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title={`Track Order Logs : ${selectedOrderId}`}
        footer={
          <CustomButton variant="dark" onClick={() => setIsLogsModalOpen(false)}>
            Close
          </CustomButton>
        }
      >
        {logsList.length === 0 ? (
          <p className="text-center text-zinc-500 italic py-6">No logs recorded.</p>
        ) : (
          <div className="relative pl-32 ml-4">
            {/* Vertical timeline line */}
            <div className="absolute left-[139px] top-2 bottom-2 w-0.5 bg-zinc-200" />

            <div className="flex flex-col gap-8">
              {logsList.map((log, index) => (
                <div key={index} className="relative flex items-start">
                  
                  {/* Left side: datetime */}
                  <div className="absolute -left-[144px] w-28 text-right pr-4 text-[10px] text-zinc-400 font-semibold pt-0.5">
                    {formatTimestamp(log.timestamp)}
                  </div>

                  {/* Center: Dot timeline */}
                  <div className="absolute left-[3px] top-1.5 w-3 h-3 rounded-full bg-zinc-400 border-2 border-white z-10 shadow-xs" />

                  {/* Right side: Action details */}
                  <div className="pl-6 flex-1 flex flex-col gap-1.5">
                    <div className="font-bold text-zinc-800 text-sm text-left">
                      {log.action} <span className="font-normal text-zinc-500 text-xs">by</span> <span className="text-zinc-700 text-xs">{log.actionBy}</span>
                    </div>

                    {log.remark && (
                      <p className="text-zinc-600 bg-zinc-50 p-2.5 rounded border border-zinc-200 text-[11px] font-medium leading-relaxed text-left max-w-full select-text">
                        {log.remark}
                      </p>
                    )}

                    {selectedOrder ? (
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {getLogImagesForAction(log.action, selectedOrder, log.photoUrl).map((url, imgIdx) => (
                          <div 
                            key={imgIdx} 
                            onClick={() => setActiveLightboxImage(url)}
                            className="rounded-lg overflow-hidden border border-zinc-300 max-w-[240px] shadow-sm bg-white cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-zinc-400 active:scale-[0.98]"
                          >
                            <img 
                              src={url} 
                              alt="Proof Confirmation" 
                              className="object-cover w-full h-36" 
                            />
                          </div>
                        ))}
                      </div>
                    ) : log.photoUrl ? (
                      <div 
                        onClick={() => setActiveLightboxImage(log.photoUrl || null)}
                        className="mt-1.5 rounded-lg overflow-hidden border border-zinc-300 max-w-[240px] shadow-sm bg-white cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:border-zinc-400 active:scale-[0.98]"
                      >
                        <img 
                          src={log.photoUrl} 
                          alt="Delivery Confirmation" 
                          className="object-cover w-full h-36" 
                        />
                      </div>
                    ) : null}
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}
      </SlidePanel>

      {/* CREATE ORDER SLIDE-IN PANEL (Drawer) */}
      <SlidePanel
        isOpen={isCreatePanelOpen}
        onClose={() => {
          setIsCreatePanelOpen(false);
          resetCreateForm();
          setEditingOrder(null);
        }}
        title={editingOrder ? `Edit Track Order : ${createDoNumber}` : "Create New Track Order"}
        footer={
          <>
            <CustomButton variant="secondary" onClick={() => {
              setIsCreatePanelOpen(false);
              resetCreateForm();
              setEditingOrder(null);
            }}>
              Cancel
            </CustomButton>
            <CustomButton 
              variant="dark" 
              onClick={(e) => handleCreateOrderSubmit(e)}
              disabled={!createDoNumber || !createDeliverTo || !createPoscode || !createMark}
            >
              {editingOrder ? "Save Changes" : "Create Order"}
            </CustomButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-zinc-700">DO Number *</label>
            <input
              type="text"
              placeholder="e.g. DO-20260627-01"
              value={createDoNumber}
              onChange={(e) => setCreateDoNumber(e.target.value)}
              className="h-8 px-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-zinc-700">Ref Number (Optional)</label>
            <input
              type="text"
              placeholder="e.g. REF-987"
              value={createRefNumber}
              onChange={(e) => setCreateRefNumber(e.target.value)}
              className="h-8 px-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="font-bold text-zinc-700">Mark (A/B/C/D) *</label>
              <input
                type="text"
                maxLength={3}
                placeholder="e.g. A"
                value={createMark}
                onChange={(e) => setCreateMark(e.target.value.toUpperCase().trim())}
                className="h-8 px-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 text-center font-bold"
              />
            </div>

            <div className="flex-1 flex flex-col gap-1">
              <label className="font-bold text-zinc-700">Type *</label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value as any)}
                className="h-8 px-2.5 rounded border border-zinc-300 bg-white text-zinc-850 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="Appointment">Appointment</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-zinc-700">Deliver Method *</label>
            <select
              value={createDeliverMethod}
              onChange={(e) => setCreateDeliverMethod(e.target.value)}
              className="h-8 px-2.5 rounded border border-zinc-300 bg-white text-zinc-850 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
            >
              <option value="Company Delivery">Company Delivery</option>
              <option value="External Delivery">External Delivery</option>
              <option value="Warehouse Pickup">Warehouse Pickup</option>
            </select>
          </div>

          {createType === "Appointment" && (
            <div className="flex gap-3 border-l-2 border-zinc-400 pl-2.5 my-1">
              <div className="flex-1 flex flex-col gap-1">
                <label className="font-bold text-zinc-700">Appointment Date *</label>
                <input
                  type="date"
                  value={createAppointmentDate}
                  onChange={(e) => setCreateAppointmentDate(e.target.value)}
                  className="h-8 px-2 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="font-bold text-zinc-700">End Time *</label>
                <input
                  type="time"
                  value={createTimeWindow}
                  onChange={(e) => setCreateTimeWindow(e.target.value)}
                  className="h-8 px-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="font-bold text-zinc-700">Deliver To Address *</label>
            <textarea
              placeholder="Enter Singapore delivery address"
              value={createDeliverTo}
              onChange={(e) => setCreateDeliverTo(e.target.value)}
              rows={2}
              className="p-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium resize-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-zinc-700">Singapore Postal Code *</label>
            <input
              type="text"
              maxLength={6}
              placeholder="6-digit postal code"
              value={createPoscode}
              onChange={(e) => setCreatePoscode(e.target.value)}
              className={`h-8 px-2.5 rounded border text-center font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                createPoscode && !validatePoscode(createPoscode)
                  ? "border-red-400 bg-red-50 text-red-700"
                  : "border-zinc-300 bg-white text-zinc-900"
              }`}
            />
          </div>

          {/* Items Section */}
          <div className="flex flex-col gap-2 border-t border-zinc-300 pt-3 mt-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-zinc-700">SKU / Items List</span>
              <button
                type="button"
                onClick={() => setCreateItems([...createItems, { sku: "", qty: 1 }])}
                className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 flex items-center gap-1 font-semibold text-zinc-700 cursor-pointer"
              >
                <Plus size={12} />
                Add SKU
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {createItems.map((item, idx) => (
                <div key={idx} className="flex gap-1.5 items-center bg-white p-2 rounded border border-zinc-300 shadow-xs">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      list="sku-datalist"
                      value={item.sku}
                      placeholder="SKU/Item Name"
                      onChange={(e) => {
                        const updated = [...createItems];
                        updated[idx].sku = e.target.value;
                        setCreateItems(updated);
                      }}
                      className="w-full h-8 px-2 rounded border border-zinc-300 text-xs bg-white text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
                    />
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => {
                        const updated = [...createItems];
                        updated[idx].qty = Math.max(1, Number(e.target.value));
                        setCreateItems(updated);
                      }}
                      className="w-full h-8 px-2 rounded border border-zinc-300 text-xs text-center bg-white text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateItems(createItems.filter((_, index) => index !== idx))}
                    className="p-1.5 rounded hover:bg-red-50 text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {createItems.length === 0 && (
                <p className="text-[10px] text-zinc-400 italic text-center py-2">
                  No items added. Click Add SKU.
                </p>
              )}
            </div>
          </div>
        </div>
      </SlidePanel>

      {/* CREATE/EDIT RETURN SLIDE-IN PANEL (Drawer) */}
      <SlidePanel
        isOpen={isReturnPanelOpen}
        onClose={() => setIsReturnPanelOpen(false)}
        title={editingReturn ? `Edit Return Order : ${returnRefNumber}` : "Create New Return Order"}
        footer={
          <>
            <CustomButton variant="secondary" onClick={() => setIsReturnPanelOpen(false)}>
              Cancel
            </CustomButton>
            <CustomButton 
              variant="dark" 
              onClick={(e) => handleReturnSubmit(e)}
              disabled={!returnRefNumber || !returnLocation || !returnPoscode || !returnCollectBeforeDate || !returnMark || !returnCollectMethod}
            >
              {editingReturn ? "Save Changes" : "Create Return"}
            </CustomButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-zinc-700">Ref Number (id) *</label>
            <input
              type="text"
              maxLength={25}
              placeholder="e.g. REF-20260629-01"
              value={returnRefNumber}
              onChange={(e) => setReturnRefNumber(e.target.value)}
              className="h-8 px-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
            />
          </div>

          <div className="flex flex-col gap-1 relative">
            <label className="font-bold text-zinc-700">Return Location (Store Name) *</label>
            <input
              type="text"
              placeholder="Search or type store..."
              value={returnLocation}
              onChange={(e) => {
                setReturnLocation(e.target.value);
                setStoreSearchQuery(e.target.value);
                setShowStoreDropdown(true);
              }}
              onFocus={() => setShowStoreDropdown(true)}
              onBlur={() => {
                // Allow clicking dropdown items first
                setTimeout(() => {
                  setShowStoreDropdown(false);
                  const trimmed = returnLocation.trim();
                  if (trimmed) {
                    const matchedStore = stores.find(
                      s => String(s.id).toLowerCase() === trimmed.toLowerCase() || 
                           String(s["Display Name"]).toLowerCase() === trimmed.toLowerCase()
                    );
                    if (matchedStore) {
                      const retailerId = matchedStore["Retailers ID"] !== undefined ? matchedStore["Retailers ID"] : matchedStore["Retailer ID"];
                      const retailer = retailers.find(r => String(r.id) === String(retailerId));
                      const retailerName = retailer ? (retailer["Display Name"] || "") : "";
                      const prefix = retailerName ? (retailerName.substring(0, 5) + " - ") : "";
                      setReturnLocation(prefix + (matchedStore["Display Name"] || ""));
                      
                      const postcodeMatch = matchedStore.Address?.match(/\b\d{6}\b/);
                      if (postcodeMatch && postcodeMatch[0]) {
                        setReturnPoscode(postcodeMatch[0]);
                      }
                    }
                  }
                }, 200);
              }}
              className="h-8 px-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
            />
            {showStoreDropdown && filteredStores.length > 0 && (
              <div className="absolute top-10 left-0 right-0 bg-white border border-zinc-300 rounded shadow-lg z-50 max-h-48 overflow-y-auto">
                {filteredStores.map((store, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-zinc-100 text-xs font-semibold text-zinc-700 border-b border-zinc-100 last:border-0 cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const retailerId = store["Retailers ID"] !== undefined ? store["Retailers ID"] : store["Retailer ID"];
                      const retailer = retailers.find(r => String(r.id) === String(retailerId));
                      const retailerName = retailer ? (retailer["Display Name"] || "") : "";
                      const prefix = retailerName ? (retailerName.substring(0, 5) + " - ") : "";
                      setReturnLocation(prefix + (store["Display Name"] || ""));
                      setShowStoreDropdown(false);
                      
                      // Extract postal code from store Address
                      const postcodeMatch = store.Address?.match(/\b\d{6}\b/);
                      if (postcodeMatch && postcodeMatch[0]) {
                        setReturnPoscode(postcodeMatch[0]);
                      }
                    }}
                  >
                    {store["Display Name"]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-zinc-700">Singapore Postal Code *</label>
            <input
              type="text"
              maxLength={6}
              placeholder="6-digit postal code"
              value={returnPoscode}
              onChange={(e) => setReturnPoscode(e.target.value.replace(/\D/g, ""))}
              className={`h-8 px-2.5 rounded border text-center font-semibold focus:outline-none focus:ring-1 focus:ring-zinc-400 ${
                returnPoscode && !validatePoscode(returnPoscode)
                  ? "border-red-400 bg-red-50 text-red-700"
                  : "border-zinc-300 bg-white text-zinc-900"
              }`}
            />
            {returnPoscode && validatePoscode(returnPoscode) && (
              <span className="text-[10px] text-zinc-500 font-bold ml-1">
                Zone: {getZoneFromPostcode(returnPoscode)}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-zinc-700">Collect Method *</label>
            <select
              value={returnCollectMethod}
              onChange={(e) => setReturnCollectMethod(e.target.value)}
              className="h-8 px-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold text-xs"
            >
              <option value="Company Vehicle">Company Vehicle</option>
              <option value="3rd Party Vehicle">3rd Party Vehicle</option>
              <option value="Self-Collect">Self-Collect</option>
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="font-bold text-zinc-700">Collect Before Date *</label>
              <input
                type="date"
                value={returnCollectBeforeDate}
                onChange={(e) => setReturnCollectBeforeDate(e.target.value)}
                className="h-8 px-2 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
              />
            </div>

            <div className="flex-1 flex flex-col gap-1">
              <label className="font-bold text-zinc-700">Mark *</label>
              <div className="flex items-center">
                <span className="bg-zinc-100 border border-r-0 border-zinc-300 rounded-l h-8 px-3 flex items-center font-bold text-zinc-500 text-sm select-none">
                  R
                </span>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="e.g. A"
                  value={returnMark}
                  onChange={(e) => setReturnMark(e.target.value.toUpperCase().trim())}
                  className="w-full h-8 px-2.5 rounded-r border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 text-center font-bold"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="flex flex-col gap-2 border-t border-zinc-300 pt-3 mt-1">
            <div className="flex justify-between items-center">
              <span className="font-bold text-zinc-700">SKU / Items to Return</span>
              <button
                type="button"
                onClick={() => setReturnItems([...returnItems, { sku: "", qty: 1 }])}
                className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 flex items-center gap-1 font-semibold text-zinc-700 cursor-pointer"
              >
                <Plus size={12} />
                Add SKU
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
              {returnItems.map((item, idx) => (
                <div key={idx} className="flex gap-1.5 items-center bg-white p-2 rounded border border-zinc-300 shadow-xs">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      list="sku-datalist"
                      value={item.sku}
                      placeholder="SKU/Item Name"
                      onChange={(e) => {
                        const updated = [...returnItems];
                        updated[idx].sku = e.target.value;
                        setReturnItems(updated);
                      }}
                      className="w-full h-8 px-2 rounded border border-zinc-300 text-xs bg-white text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
                    />
                  </div>
                  <div className="w-16">
                    <input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => {
                        const updated = [...returnItems];
                        updated[idx].qty = Math.max(1, Number(e.target.value));
                        setReturnItems(updated);
                      }}
                      className="w-full h-8 px-2 rounded border border-zinc-300 text-xs text-center bg-white text-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setReturnItems(returnItems.filter((_, index) => index !== idx))}
                    className="p-1.5 rounded hover:bg-red-50 text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {returnItems.length === 0 && (
                <p className="text-[10px] text-zinc-400 italic text-center py-2">
                  No items added. Click Add SKU.
                </p>
              )}
            </div>
          </div>
        </div>
      </SlidePanel>

      <ConfirmDialog
        open={isConfirmRevokeOpen}
        onOpenChange={setIsConfirmRevokeOpen}
        title="Revoke Order Confirmation"
        description={`This order (${pendingRevokeOrder?.do_number || "N/A"}) is currently "${pendingRevokeOrder?.status || ""}" (in progress or completed by picker). Revoking it will delete the order and return it to Drafts. Are you sure you want to revoke this order?`}
        confirmText="Revoke Order"
        cancelText="Keep Order"
        variant="danger"
        onConfirm={() => {
          if (pendingRevokeOrder) {
            executeRevokeOrder(pendingRevokeOrder);
            setPendingRevokeOrder(null);
          }
        }}
        onCancel={() => {
          setPendingRevokeOrder(null);
        }}
      />

      {/* CHANGE STATUS (OVERWRITE) MODAL */}
      {isChangeStatusOpen && statusOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs font-primary p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-sm text-zinc-800">Change Status : {statusOrder.do_number}</span>
              <button 
                onClick={() => setIsChangeStatusOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 focus:outline-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-zinc-700">Dropdown Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="h-9 px-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
                >
                  <option value="" disabled>Select Status</option>
                  {statusOrder.type === "Return" ? (
                    <>
                      <option value="Pending">Pending</option>
                      <option value="Return Collected">Return Collected</option>
                    </>
                  ) : (
                    <>
                      <option value="Ready to Pick">Ready to Pick</option>
                      <option value="Picking">Picking</option>
                      <option value="Ready to Deliver">Ready to Deliver</option>
                      <option value="Load">Load</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                    </>
                  )}
                </select>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-zinc-700">Remark *</label>
                <textarea
                  placeholder="e.g. Changed status due to logistics update"
                  value={statusRemark}
                  onChange={(e) => setStatusRemark(e.target.value)}
                  rows={3}
                  className="p-2.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-zinc-700">Upload Image (Optional)</label>
                <div className="flex items-center gap-2">
                  <label className="h-8 px-3 rounded-lg border border-zinc-300 bg-[#E5E5E5] text-zinc-700 hover:text-zinc-950 hover:bg-[#EEEEEE]/50 transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 font-bold text-[10px]">
                    <Upload size={12} />
                    {statusPhotoFile ? "Change Image" : "Choose File"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setStatusPhotoFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  {statusPhotoFile && (
                    <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[200px]">
                      {statusPhotoFile.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <CustomButton 
                variant="secondary" 
                onClick={() => setIsChangeStatusOpen(false)}
                disabled={statusPhotoUploading}
              >
                Cancel
              </CustomButton>
              <CustomButton 
                variant="dark" 
                onClick={handleSaveStatusOverwrite}
                disabled={statusPhotoUploading || !newStatus || !statusRemark.trim()}
              >
                {statusPhotoUploading ? "Updating..." : "Update Status"}
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ORDER COMPLETE MODAL */}
      {isCompleteConfirmOpen && pendingCompleteOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs font-primary p-4">
          <div className="bg-white rounded border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-sm text-zinc-800">
                {pendingCompleteOrder.type === "Return" ? "Complete Return Order" : "Complete Delivery Order"}
              </span>
              <button 
                onClick={() => setIsCompleteConfirmOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 focus:outline-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 text-xs">
              <p className="text-zinc-600 font-medium leading-relaxed">
                {pendingCompleteOrder.type === "Return"
                  ? `Are you sure you want to mark return order ${pendingCompleteOrder.do_number} as complete?`
                  : `Are you sure you want to archive and complete order ${pendingCompleteOrder.do_number}?`}
              </p>
              
              <div className="flex flex-col gap-3 mt-1">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-zinc-700">
                    {pendingCompleteOrder.type === "Return" ? "Credit Note Number *" : "Invoice Number *"}
                  </label>
                  {pendingCompleteOrder.type === "Return" ? (
                    <input
                      type="text"
                      placeholder="e.g. CN-98765"
                      value={creditNoteInput}
                      onChange={(e) => setCreditNoteInput(e.target.value)}
                      className="h-9 px-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. INV-12345"
                      value={invoiceNumberInput}
                      onChange={(e) => setInvoiceNumberInput(e.target.value)}
                      className="h-9 px-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-zinc-700">Total Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 150.00"
                    value={invoiceAmountInput}
                    onChange={(e) => setInvoiceAmountInput(e.target.value)}
                    className="h-9 px-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
                  />
                </div>
              </div>
            </div>
            
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <CustomButton 
                variant="secondary" 
                onClick={() => setIsCompleteConfirmOpen(false)}
              >
                Cancel
              </CustomButton>
              
              <CustomButton 
                variant="dark" 
                onClick={handleContinueComplete}
                disabled={
                  pendingCompleteOrder.type === "Return" 
                    ? (!creditNoteInput.trim() || !invoiceAmountInput.trim()) 
                    : (!invoiceNumberInput.trim() || !invoiceAmountInput.trim())
                }
              >
                Continue
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* EDIT COMPLETED INVOICE MODAL */}
      {isEditInvoiceModalOpen && editInvoiceOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs font-primary p-4">
          <div className="bg-white rounded border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-sm text-zinc-800">
                Edit Completed Order Details
              </span>
              <button 
                onClick={() => setIsEditInvoiceModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 focus:outline-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-zinc-700">Invoice / Credit Note Number *</label>
                <input
                  type="text"
                  placeholder="e.g. INV-12345"
                  value={editInvoiceNum}
                  onChange={(e) => setEditInvoiceNum(e.target.value)}
                  className="h-9 px-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-zinc-700">Total Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 150.00"
                  value={editInvoiceAmount}
                  onChange={(e) => setEditInvoiceAmount(e.target.value)}
                  className="h-9 px-2.5 rounded border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <CustomButton 
                variant="secondary" 
                onClick={() => setIsEditInvoiceModalOpen(false)}
              >
                Cancel
              </CustomButton>
              <CustomButton 
                variant="dark" 
                onClick={handleSaveEditInvoice}
                disabled={!String(editInvoiceNum || "").trim() || !String(editInvoiceAmount || "").trim()}
              >
                Save
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE COMPLETE CONFIRMATION MODAL */}
      {isRevokeCompleteConfirmOpen && pendingRevokeCompleteOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/50 backdrop-blur-xs font-primary p-4">
          <div className="bg-white rounded border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-sm text-zinc-800">
                Confirm Revoke Archive
              </span>
              <button 
                onClick={() => setIsRevokeCompleteConfirmOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 focus:outline-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-3 text-xs">
              <p className="text-zinc-600 font-medium leading-relaxed">
                Are you sure you want to revoke completion for order <strong>{pendingRevokeCompleteOrder.do_number}</strong>? 
                This will move the order back to active/pending status.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <CustomButton 
                variant="secondary" 
                onClick={() => setIsRevokeCompleteConfirmOpen(false)}
              >
                Cancel
              </CustomButton>
              <CustomButton 
                variant="dark" 
                onClick={handleConfirmRevokeComplete}
              >
                Confirm Revoke
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM FORCE CLOSE JOB CONFIRMATION MODAL */}
      {isForceCloseModalOpen && forceCloseDriverJob && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden animate-zoom-in">
            {/* Header */}
            <div className="px-5 py-4 bg-red-50/70 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
                  <Square size={14} fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-950">
                    Close Driver Shift
                  </h3>
                  <p className="text-[11px] text-red-700 font-medium">
                    {forceCloseDriverJob.driver} ({forceCloseDriverJob.id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!forceCloseLoading) {
                    setIsForceCloseModalOpen(false);
                    setForceCloseDriverJob(null);
                  }
                }}
                className="text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            {(() => {
              const completedLogs = parseDriverCompletedLogs(forceCloseDriverJob.driver_logs);
              const activeIds = parseDriverActiveOrderIds(forceCloseDriverJob.active_orders);
              let lastDoneTimestamp = 0;
              if (completedLogs.length > 0) {
                lastDoneTimestamp = Math.max(...completedLogs.map((l) => Number(l.timestamp) || 0));
              }
              const computedEndTime =
                lastDoneTimestamp > 0
                  ? lastDoneTimestamp + 5 * 60 * 1000
                  : (Number(forceCloseDriverJob.start_time) || Date.now()) + 5 * 60 * 1000;

              return (
                <div className="p-5 flex flex-col gap-3.5 text-xs text-zinc-700">
                  <p className="leading-relaxed text-zinc-600">
                    Are you sure you want to end this driver's active shift?
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-zinc-500 font-medium">Shift Start Time:</span>
                      <span className="font-semibold text-zinc-800">{formatTimestamp(forceCloseDriverJob.start_time)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-zinc-500 font-medium">Calculated End Time (Last Done + 5 min):</span>
                      <span className="font-bold text-emerald-700">{formatTimestamp(computedEndTime)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-zinc-500 font-medium">Completed Deliveries:</span>
                      <span className="font-semibold text-emerald-700">{completedLogs.length} Completed</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-zinc-500 font-medium">Unfinished Active Orders:</span>
                      <span className="font-semibold text-amber-700">{activeIds.length} Remaining</span>
                    </div>
                  </div>

                  {activeIds.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-850 flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>{activeIds.length} unfinished order(s)</strong> will automatically have their status reverted from <strong>"Out for Delivery"</strong> to <strong>"Ready to Deliver"</strong>.
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <CustomButton
                variant="secondary"
                disabled={forceCloseLoading}
                onClick={() => {
                  setIsForceCloseModalOpen(false);
                  setForceCloseDriverJob(null);
                }}
              >
                Cancel
              </CustomButton>
              <CustomButton
                variant="danger"
                disabled={forceCloseLoading}
                onClick={handleConfirmForceCloseJob}
                className="flex items-center gap-1.5"
              >
                {forceCloseLoading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Closing Shift...
                  </>
                ) : (
                  <>
                    <Square size={10} fill="currentColor" />
                    Confirm End Shift
                  </>
                )}
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* ROUTE TIMELINE LOG MODAL */}
      {isRouteLogModalOpen && selectedRouteLogRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-zoom-in">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#0B57D0]/10 border border-[#0B57D0]/20 flex items-center justify-center text-[#0B57D0]">
                  <Route size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 leading-tight">
                    Route Timeline Log — {selectedRouteLogRecord.driver}
                  </h3>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Shift ID: {selectedRouteLogRecord.id} • Duration: {formatShiftDuration(selectedRouteLogRecord.start_time, selectedRouteLogRecord.end_time)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsRouteLogModalOpen(false);
                  setSelectedRouteLogRecord(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body: Route Timeline */}
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-0 text-xs">
              {/* Start Point */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-zinc-800 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs">
                  🏢
                </div>
                <div className="flex-1 pt-1">
                  <div className="font-bold text-zinc-900 text-xs">
                    Start: Office / Warehouse (409461)
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Shift Started: {formatTimestamp(selectedRouteLogRecord.start_time)}
                  </div>
                </div>
              </div>

              {/* Waypoints from Driver_Logs */}
              {(() => {
                const logs = parseDriverCompletedLogs(selectedRouteLogRecord.driver_logs);
                if (logs.length === 0) {
                  return (
                    <div className="py-8 text-center text-zinc-400 italic">
                      No delivery waypoint logs were recorded during this shift.
                    </div>
                  );
                }

                let lastCoords: [number, number] = [1.3197, 103.8962];

                return logs.map((log, lIdx) => {
                  const matched = resolveOrder(log.id);
                  const orderCoords = matched ? getOrderLatLng(matched) : [1.3197, 103.8962];
                  const dist = calculateDistanceKm(lastCoords[0], lastCoords[1], orderCoords[0], orderCoords[1]);
                  lastCoords = orderCoords as [number, number];

                  const hasDisc = log.discrepancies && log.discrepancies.length > 0;

                  return (
                    <React.Fragment key={`modal-log-${lIdx}-${log.id}`}>
                      {/* Dotted Line */}
                      <div className="flex items-center gap-3 h-7 ml-3.5 my-0.5">
                        <div className="w-[2px] h-full border-l-2 border-dashed border-emerald-300" />
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          +{dist.toFixed(1)} km
                        </span>
                      </div>

                      {/* Waypoint Box */}
                      <div className="flex items-start gap-3 bg-emerald-50/40 border border-emerald-200 rounded-lg p-3 my-0.5 shadow-xs">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs">
                          <Check size={14} strokeWidth={3} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-bold text-emerald-950 text-xs truncate">
                              Stop #{lIdx + 1}: {log.id}
                            </div>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>

                          <div className="text-zinc-600 font-medium mt-1">
                            {matched?.deliver_to || "Singapore Address"}
                          </div>

                          {matched?.poscode && (
                            <div className="mt-1">
                              {renderPoscodeCell(matched.poscode)}
                            </div>
                          )}

                          {/* Proof Thumbnail */}
                          {log.signed_paper_img && (
                            <div className="mt-2.5 flex items-center gap-2.5">
                              <div
                                onClick={() => setActiveLightboxImage(log.signed_paper_img || null)}
                                className="relative w-14 h-14 rounded border border-emerald-300 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-white shadow-2xs flex-shrink-0"
                                title="Click to view signed DO full size"
                              >
                                <img
                                  src={log.signed_paper_img}
                                  alt="Signed DO Paper"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="text-[11px] text-emerald-800 font-semibold">
                                Signed Delivery Order Attached
                              </span>
                            </div>
                          )}

                          {/* Discrepancies */}
                          {hasDisc && (
                            <div className="mt-2.5 bg-amber-50 border border-amber-300 rounded p-2.5 text-[11px] flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />
                                <span>Reported Discrepancy / Remarks:</span>
                              </div>
                              {log.discrepancies?.map((d, dIdx) => (
                                <div key={dIdx} className="text-amber-800 pl-3">
                                  • SKU <span className="font-semibold">{d.sku}</span>: Ordered {d.qty_ordered}, Delivered {d.qty_delivered}
                                  {d.remark && (
                                    <div className="text-zinc-700 italic mt-0.5">
                                      Driver Note: "{d.remark}"
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                });
              })()}

              {/* End of Shift Node */}
              {selectedRouteLogRecord.end_time && (
                <div className="mt-3 flex items-start gap-3 pt-2 border-t border-slate-200">
                  <div className="w-7 h-7 rounded-full bg-zinc-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-xs">
                    🏁
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="font-bold text-zinc-900 text-xs">
                      Route Completed / Job Closed
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Ended: {formatTimestamp(selectedRouteLogRecord.end_time)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <CustomButton
                variant="secondary"
                onClick={() => {
                  setIsRouteLogModalOpen(false);
                  setSelectedRouteLogRecord(null);
                }}
              >
                Close
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300 animate-fade-in"
          onClick={() => setActiveLightboxImage(null)}
        >
          {/* Close Button */}
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all duration-200 backdrop-blur-md border border-white/10 shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
            onClick={() => setActiveLightboxImage(null)}
            aria-label="Close image preview"
          >
            <X size={20} />
          </button>

          {/* Image Container with Zoom/Click-through prevention */}
          <div 
            className="relative max-w-5xl max-h-[85vh] w-auto h-auto flex flex-col items-center justify-center animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={activeLightboxImage} 
              alt="Proof full screen" 
              className="max-w-full max-h-[80vh] rounded-lg object-contain shadow-2xl border border-zinc-800"
            />
            
            {/* Action Bar (Download/View original) */}
            <div className="flex gap-3 mt-4">
              <a 
                href={activeLightboxImage} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/25 rounded-full transition-all duration-200 backdrop-blur-sm shadow-md cursor-pointer"
              >
                <Eye size={14} /> Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}

      <datalist id="sku-datalist">
        {productSkus.map((sku) => (
          <option key={sku} value={sku} />
        ))}
      </datalist>

      {isInvoiceUploadChoiceOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-50 font-primary">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm shadow-xl border border-slate-200 animate-zoom-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-zinc-850">Upload Invoice</h3>
              <button 
                onClick={() => setIsInvoiceUploadChoiceOpen(false)} 
                className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="py-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsInvoiceUploadChoiceOpen(false);
                  invoicePdfInputRef.current?.click();
                }}
                className="w-full py-2.5 px-4 bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white rounded text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <FileText size={16} />
                Upload PDF Invoice
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsInvoiceUploadChoiceOpen(false);
                  invoiceExcelInputRef.current?.click();
                }}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-[#0B57D0] text-[#0B57D0] rounded text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Boxes size={16} />
                Upload Excel / CSV Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {isDoUploadChoiceOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-50 font-primary">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm shadow-xl border border-slate-200 animate-zoom-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-zinc-850">Upload Delivery Order</h3>
              <button 
                onClick={() => setIsDoUploadChoiceOpen(false)} 
                className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="py-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDoUploadChoiceOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full py-2.5 px-4 bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white rounded text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <FileText size={16} />
                Upload PDF DO
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDoUploadChoiceOpen(false);
                  doExcelInputRef.current?.click();
                }}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-[#0B57D0] text-[#0B57D0] rounded text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Boxes size={16} />
                Upload Excel / CSV DO
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
