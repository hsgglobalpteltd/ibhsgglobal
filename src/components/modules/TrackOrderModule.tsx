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
  Search,
  Download,
  FileDown,
  Image as ImageIcon,
  Layers,
  QrCode,
  RefreshCw,
  Printer,
  Ban,
  ScanLine,
  Maximize2,
  Sliders,
  Sparkles,
  Move,
  RotateCcw
} from "lucide-react";
import * as XLSX from "xlsx";
import { PDFDocument } from "pdf-lib";
import jsPDF from "jspdf";

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
  photo_do_paper?: string;
  link_store?: string;
}

// Helper to delete files from Cloudflare R2 when drafts are discarded/deleted
async function deleteR2PhotoUrls(photoJsonOrUrl?: string) {
  if (!photoJsonOrUrl) return;
  try {
    const urls: string[] = parseImageUrlList(photoJsonOrUrl);
    for (const u of urls) {
      if (u && (u.includes("/api/files/") || u.startsWith("http"))) {
        fetch(u, { method: "DELETE" }).catch(() => {});
      }
    }
  } catch (_) {}
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
  photo_invoice?: string;
  driver?: string;
  invoice_number?: string;
  credit_note_number?: string;
  invoice_amount?: string;
  link_store?: string;
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

// Fetch exact coordinates from Singapore OneMap via Worker proxy (CORS-safe)
async function fetchPostcodeCoordinates(
  poscode: string,
  _baseUrl?: string,
  _token?: string
): Promise<{ lat: number, lng: number } | null> {
  const clean = String(poscode || "").trim();
  if (!clean) return null;
  
  let padded = clean;
  if (/^\d+$/.test(clean)) {
    padded = clean.padStart(6, '0');
  }
  
  try {
    const url = `https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders/geocode?poscode=${encodeURIComponent(padded)}`;
    const res = await fetch(url);
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

  // Fallback to Singapore postal sector approximation
  try {
    const fallback = getSingaporeLatLng(padded);
    if (fallback && fallback.lat && fallback.lng) {
      return { lat: fallback.lat, lng: fallback.lng };
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

// Parse Image URL list from JSON array string, comma-separated string, or direct URL
function parseImageUrlList(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
        if (parsed && typeof parsed === "object") {
          return [parsed.url || parsed.uri || ""].filter(Boolean);
        }
      } catch (_) {}
    }
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((v) => v.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [];
}

// Resolve proof image links dynamically from corresponding DbOrder columns or direct log photoUrl
function getLogImagesForAction(action: string, order: DbOrder, logPhotoUrl?: string, logEntry?: any): string[] {
  const images: string[] = [];
  
  // 1. Direct log photos specifically attached to this log entry
  if (logPhotoUrl) {
    images.push(...parseImageUrlList(logPhotoUrl));
  }
  if (logEntry) {
    if (logEntry.photoUrls) images.push(...parseImageUrlList(logEntry.photoUrls));
    if (logEntry.photos) images.push(...parseImageUrlList(logEntry.photos));
    if (logEntry.photoUrl && logEntry.photoUrl !== logPhotoUrl) images.push(...parseImageUrlList(logEntry.photoUrl));
  }
  
  // 2. Order lifecycle proof columns (only match exact specific stage completion actions)
  if (order) {
    const act = String(action || "").toLowerCase().trim();
    const isStatusOverwriteOrAdmin = act.includes("overwrite") || act.includes("ready to deliver") || act.includes("job code") || act.includes("batch load") || act.includes("revoke") || act.includes("cancel");

    if (!isStatusOverwriteOrAdmin) {
      if (act === "delivered" || act.startsWith("delivered") || act === "goods delivered" || act === "delivery completed") {
        // Delivered Log: Collect all photos taken during delivery completion
        if (order.photo_delivered_proof) images.push(...parseImageUrlList(order.photo_delivered_proof));
        if (order.photo_do_paper_signed) images.push(...parseImageUrlList(order.photo_do_paper_signed));
        if (order.photo_handover_proof) images.push(...parseImageUrlList(order.photo_handover_proof));
      } else if (act.includes("handover")) {
        if (order.photo_handover_proof) images.push(...parseImageUrlList(order.photo_handover_proof));
      } else if (act === "signed" || act.includes("signed do")) {
        if (order.photo_do_paper_signed) images.push(...parseImageUrlList(order.photo_do_paper_signed));
      } else if (act === "unpick return paper" || act === "return collected" || act === "collected") {
        if (order.photo_return_paper_admin) images.push(...parseImageUrlList(order.photo_return_paper_admin));
      } else if (act === "pick return paper" || act === "pick return") {
        if (order.photo_return_paper) images.push(...parseImageUrlList(order.photo_return_paper));
      } else if (act === "picked" || act === "goods picked" || act === "picking completed") {
        if (order.photo_picker_proof) images.push(...parseImageUrlList(order.photo_picker_proof));
      } else if (act === "created" || act === "order created" || act === "imported") {
        if (order.photo_do_paper) images.push(...parseImageUrlList(order.photo_do_paper));
      }
    }
  }
  
  // 3. Deduplicate and filter valid non-empty URLs
  const uniqueUrls: string[] = [];
  images.forEach((url) => {
    const trimmed = String(url || "").trim();
    if (trimmed && trimmed !== "null" && trimmed !== "undefined" && !uniqueUrls.includes(trimmed)) {
      uniqueUrls.push(trimmed);
    }
  });
  
  return uniqueUrls;
}

// Image Base64 Loader Helper for jsPDF (resilient fetch + canvas fallback)
const loadImageBase64 = async (url: string): Promise<string> => {
  if (!url) return "";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Fetch failed");
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch (_) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        } catch {
          resolve("");
        }
      };
      img.onerror = () => resolve("");
    });
  }
};

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

// Check if an order was completed today (Singapore Time / UTC+8)
export const isOrderDoneToday = (order: DbOrder): boolean => {
  const isDelivered = order.type !== "Return" && (order.status === "Delivered" || String(order.completed) === "true" || order.completed === true);
  const isCollected = order.type === "Return" && (order.status === "Collected" || order.status === "Return Collected" || String(order.completed) === "true" || order.completed === true);
  if (!isDelivered && !isCollected) return false;

  const now = new Date();
  const sgTimeString = now.toLocaleString("en-US", { timeZone: "Asia/Singapore" });
  const sgDate = new Date(sgTimeString);
  sgDate.setHours(0, 0, 0, 0);
  const diff = now.getTime() - new Date(sgTimeString).getTime();
  const startOfTodayMs = sgDate.getTime() + diff;

  try {
    const logs = typeof order.logs === "string" ? JSON.parse(order.logs) : order.logs;
    if (Array.isArray(logs)) {
      const compLog = logs.find((l: any) => {
        const act = String(l.action || "").toLowerCase();
        return (act.includes("delivered") || act.includes("collected") || act.includes("completed") || act.includes("complete"));
      });
      if (compLog && Number(compLog.timestamp) >= startOfTodayMs) {
        return true;
      } else if (!compLog && order.timestamp && Number(order.timestamp) >= startOfTodayMs) {
        return true;
      }
    } else {
      if (order.timestamp && Number(order.timestamp) >= startOfTodayMs) {
        return true;
      }
    }
  } catch (_) {
    if (order.timestamp && Number(order.timestamp) >= startOfTodayMs) {
      return true;
    }
  }
  return false;
};

export const parseDriverCompletedLogs = (rawLogs: string): DriverLogCompletedEntry[] => {
  try {
    const parsed = typeof rawLogs === "string" ? JSON.parse(rawLogs || "[]") : rawLogs;
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
    }
  } catch (_) {}
  return [];
};

export const parseDriverActiveOrderIds = (rawActive: string): string[] => {
  try {
    const parsed = typeof rawActive === "string" ? JSON.parse(rawActive || "[]") : rawActive;
    if (Array.isArray(parsed)) return parsed;
  } catch (_) {}
  return [];
};

export const parseOutsourceDriverDetails = (raw: any): { name?: string; plate?: string; phone?: string; formatted: string } => {
  if (!raw) return { formatted: "" };
  if (typeof raw === "object") {
    const name = raw.name || raw.driver_name || raw.driverName || raw.driver || "";
    const plate = raw.plate || raw.plate_number || raw.vehicle_number || raw.car_plate || raw.vehicle || "";
    const phone = raw.phone || raw.contact || raw.phone_number || raw.mobile || "";
    const parts = [name, plate, phone].filter(Boolean);
    return { name, plate, phone, formatted: parts.join(" / ") };
  }
  const str = String(raw).trim();
  if (!str) return { formatted: "" };
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === "object" && parsed !== null) {
      const name = parsed.name || parsed.driver_name || parsed.driverName || parsed.driver || "";
      const plate = parsed.plate || parsed.plate_number || parsed.vehicle_number || parsed.car_plate || parsed.vehicle || "";
      const phone = parsed.phone || parsed.contact || parsed.phone_number || parsed.mobile || "";
      const parts = [name, plate, phone].filter(Boolean);
      return { name, plate, phone, formatted: parts.length > 0 ? parts.join(" / ") : str };
    }
  } catch (_) {}
  return { formatted: str };
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
  const [driverLogPeriodFilter, setDriverLogPeriodFilter] = React.useState<"week" | "month" | "all" | "custom">("week");
  const [driverLogStartDate, setDriverLogStartDate] = React.useState<string>("");
  const [driverLogEndDate, setDriverLogEndDate] = React.useState<string>("");

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
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    let customStartMs = 0;
    let customEndMs = 0;
    if (driverLogPeriodFilter === "custom") {
      if (driverLogStartDate) {
        const s = new Date(driverLogStartDate);
        s.setHours(0, 0, 0, 0);
        customStartMs = s.getTime();
      }
      if (driverLogEndDate) {
        const e = new Date(driverLogEndDate);
        e.setHours(23, 59, 59, 999);
        customEndMs = e.getTime();
      }
    }

    return driverLogs
      .filter((d) => (d.status || "").trim().toUpperCase() === "OFF")
      .filter((d) => {
        // Query search filter
        if (q && !matchesDriverRecord(d, q)) {
          return false;
        }
        // Period filter (This Week (default) / This Month / All / Custom Range)
        if (driverLogPeriodFilter === "all") return true;
        const t = Number(d.end_time) || Number(d.start_time) || 0;
        if (driverLogPeriodFilter === "week") {
          return t >= oneWeekAgo;
        }
        if (driverLogPeriodFilter === "month") {
          return t >= oneMonthAgo;
        }
        if (driverLogPeriodFilter === "custom") {
          if (customStartMs > 0 && t < customStartMs) return false;
          if (customEndMs > 0 && t > customEndMs) return false;
          return true;
        }
        return true;
      })
      .sort((a, b) => {
        const tA = Number(a.start_time) || 0;
        const tB = Number(b.start_time) || 0;
        return tB - tA;
      });
  }, [driverLogs, driverSearchQuery, driverLogPeriodFilter, driverLogStartDate, driverLogEndDate, matchesDriverRecord]);

  // Global map of driver reported discrepancies keyed by Order ID and DO/Ref Number
  const orderDiscrepanciesMap = React.useMemo(() => {
    const map: Record<string, DriverLogDiscrepancy[]> = {};
    for (const record of driverLogs) {
      const logs = parseDriverCompletedLogs(record.driver_logs);
      for (const log of logs) {
        if (log.discrepancies && log.discrepancies.length > 0) {
          const rawId = String(log.id || "").trim();
          if (rawId) {
            map[rawId] = log.discrepancies;
            // Also map by individual parts if formatted as DO_REF
            const parts = rawId.split("_");
            if (parts.length >= 2) {
              map[parts[0]] = log.discrepancies;
              map[parts[1]] = log.discrepancies;
            }
          }
        }
      }
    }
    return map;
  }, [driverLogs]);

  // Auto switch subtab to closed if no online drivers
  React.useEffect(() => {
    if (onlineDrivers.length === 0 && activeDriverLogSubTab === "online") {
      setActiveDriverLogSubTab("closed");
    }
  }, [onlineDrivers.length, activeDriverLogSubTab]);

  const [activeLiveTrackingSubTab, setActiveLiveTrackingSubTab] = React.useState<"location" | "driver">("location");

  const tabs = [
    { id: "dashboard", label: "Live Tracking", desc: "Real-time dispatch route visualization and live driver shift monitoring." },
    { id: "delivery", label: "Delivery Order", desc: "Manage pending deliveries, invoices, and complete fulfilled orders." },
    { id: "return", label: "Return Order", desc: "Track return collection pickups, due dates, and credit notes." },
    { id: "create", label: "Create Order", desc: "Import DO orders, create drafts, or dispatch grouped job packages." }
  ];

  const [activeTab, setActiveTab] = React.useState<string>("dashboard");
  const [createOrderSubView, setCreateOrderSubView] = React.useState<"drafts" | "dispatch">("drafts");
  const [activeDeliveryTab, setActiveDeliveryTab] = React.useState<"pending" | "complete">("pending");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = React.useState<string>("all");
  const [deliverySearchQuery, setDeliverySearchQuery] = React.useState<string>("");

  const [activeReturnTab, setActiveReturnTab] = React.useState<"pending" | "complete">("pending");
  const [returnStatusFilter, setReturnStatusFilter] = React.useState<string>("all");
  const [returnSearchQuery, setReturnSearchQuery] = React.useState<string>("");

  const [drafts, setDrafts] = React.useState<TrackOrderDraft[]>([]);
  const [dbOrders, setDbOrders] = React.useState<DbOrder[]>([]);
  const [pdfLoading, setPdfLoading] = React.useState<boolean>(false);
  const [pdfLoadingText, setPdfLoadingText] = React.useState<string>("Parsing DO PDF...");
  const [invoiceLoading, setInvoiceLoading] = React.useState<boolean>(false);
  const [invoiceLoadingText, setInvoiceLoadingText] = React.useState<string>("Parsing Invoices...");
  const [creditNoteLoading, setCreditNoteLoading] = React.useState<boolean>(false);
  const [creditNoteLoadingText, setCreditNoteLoadingText] = React.useState<string>("Parsing Credit Notes...");
  const [sendingDraftIds, setSendingDraftIds] = React.useState<Record<string, boolean>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const invoicePdfInputRef = React.useRef<HTMLInputElement>(null);
  const invoiceExcelInputRef = React.useRef<HTMLInputElement>(null);
  const creditNotePdfInputRef = React.useRef<HTMLInputElement>(null);
  const creditNoteExcelInputRef = React.useRef<HTMLInputElement>(null);
  const doExcelInputRef = React.useRef<HTMLInputElement>(null);

  const [isInvoiceUploadChoiceOpen, setIsInvoiceUploadChoiceOpen] = React.useState(false);
  const [isCreditNoteUploadChoiceOpen, setIsCreditNoteUploadChoiceOpen] = React.useState(false);
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
  const [editInvoicePhotoUrl, setEditInvoicePhotoUrl] = React.useState<string>("");
  const [editInvoicePhotoFile, setEditInvoicePhotoFile] = React.useState<File | null>(null);
  const [editInvoiceUploading, setEditInvoiceUploading] = React.useState<boolean>(false);

  // Revoke Complete Confirmation States
  const [isRevokeCompleteConfirmOpen, setIsRevokeCompleteConfirmOpen] = React.useState<boolean>(false);
  const [pendingRevokeCompleteOrder, setPendingRevokeCompleteOrder] = React.useState<DbOrder | null>(null);

  // Link Store input and dropdown states
  const [linkStoreInputValues, setLinkStoreInputValues] = React.useState<Record<string, string>>({});
  const [activeLinkStoreDropdown, setActiveLinkStoreDropdown] = React.useState<string | null>(null);

  // Unknown Store ID Confirmation States
  const [isUnknownStoreModalOpen, setIsUnknownStoreModalOpen] = React.useState<boolean>(false);
  const [unknownStoreInfo, setUnknownStoreInfo] = React.useState<{
    unregisteredOrders: any[];
    validDrafts: TrackOrderDraft[];
    allDrafts: TrackOrderDraft[];
  } | null>(null);

  // Pending Delivery Bulk Selection & Edit States
  const [selectedPendingOrderIds, setSelectedPendingOrderIds] = React.useState<Record<string, boolean>>({});
  const [bulkDeliveryMethod, setBulkDeliveryMethod] = React.useState<string>("Company Delivery");
  const [isBulkUpdatingMethod, setIsBulkUpdatingMethod] = React.useState<boolean>(false);
  const [bulkStatus, setBulkStatus] = React.useState<string>("Ready to Pick");
  const [isBulkUpdatingStatus, setIsBulkUpdatingStatus] = React.useState<boolean>(false);

  // Visual Return Mapper States
  interface ReturnBoundingBox {
    x: number; // %
    y: number; // %
    w: number; // %
    h: number; // %
  }
  interface ReturnTemplatePreset {
    id: string;
    name: string;
    boxRef: ReturnBoundingBox;
    boxLoc: ReturnBoundingBox;
    boxPos: ReturnBoundingBox;
  }
  const [isReturnVisualMapperOpen, setIsReturnVisualMapperOpen] = React.useState<boolean>(false);
  const [returnMapperPdfFile, setReturnMapperPdfFile] = React.useState<File | null>(null);
  const [returnMapperPage1Img, setReturnMapperPage1Img] = React.useState<string>("");
  const [returnMapperTotalPages, setReturnMapperTotalPages] = React.useState<number>(1);
  const [returnMapperPageNaturalWidth, setReturnMapperPageNaturalWidth] = React.useState<number>(800);
  const [returnMapperPageNaturalHeight, setReturnMapperPageNaturalHeight] = React.useState<number>(565);
  const [returnMapperCollectDate, setReturnMapperCollectDate] = React.useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [returnMapperMethod, setReturnMapperMethod] = React.useState<string>("Company Vehicle");
  const [returnBoxRef, setReturnBoxRef] = React.useState<ReturnBoundingBox>({ x: 55, y: 35, w: 32, h: 14 });
  const [returnBoxLoc, setReturnBoxLoc] = React.useState<ReturnBoundingBox>({ x: 6, y: 30, w: 42, h: 18 });
  const [returnBoxPos, setReturnBoxPos] = React.useState<ReturnBoundingBox>({ x: 6, y: 52, w: 30, h: 12 });
  const [activeBoxType, setActiveBoxType] = React.useState<"ref" | "loc" | "pos">("ref");
  const [returnTemplates, setReturnTemplates] = React.useState<ReturnTemplatePreset[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>("");
  const [newTemplateNameInput, setNewTemplateNameInput] = React.useState<string>("");
  const [showSaveTemplateForm, setShowSaveTemplateForm] = React.useState<boolean>(false);
  const [isReturnParsing, setIsReturnParsing] = React.useState<boolean>(false);
  const [returnParseProgress, setReturnParseProgress] = React.useState<{ current: number; total: number; message: string }>({
    current: 0,
    total: 0,
    message: ""
  });
  const returnPdfInputRef = React.useRef<HTMLInputElement>(null);
  const visualMapperCanvasWrapperRef = React.useRef<HTMLDivElement>(null);
  const page1CanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [dragState, setDragState] = React.useState<{
    mode: "move" | "resize";
    boxType: "ref" | "loc" | "pos";
    startX: number;
    startY: number;
    initialBox: ReturnBoundingBox;
  } | null>(null);

  // Live Crop Preview & Extraction Log States
  const [cropPreviewRef, setCropPreviewRef] = React.useState<string>("");
  const [cropPreviewLoc, setCropPreviewLoc] = React.useState<string>("");
  const [cropPreviewPos, setCropPreviewPos] = React.useState<string>("");
  const [extractedPagesLog, setExtractedPagesLog] = React.useState<Array<{
    page: number;
    refNumber: string;
    location: string;
    poscode: string;
  }>>([]);
  const cancelExtractionRef = React.useRef<boolean>(false);



  // Create Job Tab States
  const [jobSubView, setJobSubView] = React.useState<"create" | "history">("create");
  const [jobZoneFilter, setJobZoneFilter] = React.useState<string>("All");
  const [jobSearchQuery, setJobSearchQuery] = React.useState<string>("");
  const [selectedJobOrderIds, setSelectedJobOrderIds] = React.useState<Record<string, boolean>>({});
  const [jobGenerating, setJobGenerating] = React.useState<boolean>(false);
  const [lastGeneratedJob, setLastGeneratedJob] = React.useState<{ token: string; orderCount: number; totalQty: number } | null>(null);

  // Job History & Management States
  const [jobHistoryList, setJobHistoryList] = React.useState<any[]>([]);
  const [jobHistoryLoading, setJobHistoryLoading] = React.useState<boolean>(false);

  const fetchJobHistory = React.useCallback(async () => {
    setJobHistoryLoading(true);
    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.jobs)) {
          setJobHistoryList(json.jobs);
        }
      }
    } catch (err) {
      console.error("Failed to load job history:", err);
    } finally {
      setJobHistoryLoading(false);
    }
  }, []);

  // Map order IDs to active/open job tokens
  const activeJobOrderByOrderId = React.useMemo(() => {
    const map: Record<string, { token: string; status: string; id: string }> = {};
    jobHistoryList.forEach((job) => {
      if (job.status === "OPEN") {
        let ids: string[] = [];
        try {
          ids = typeof job.order_ids === "string" ? JSON.parse(job.order_ids) : (job.order_ids || []);
        } catch (_) {
          ids = [];
        }
        if (Array.isArray(ids)) {
          ids.forEach((id) => {
            map[String(id).trim()] = { token: job.token, status: job.status, id: job.id };
          });
        }
      }
    });
    return map;
  }, [jobHistoryList]);

  React.useEffect(() => {
    if (activeTab === "job" || (activeTab === "create" && createOrderSubView === "dispatch")) {
      fetchJobHistory();
    }
  }, [activeTab, createOrderSubView, fetchJobHistory]);

  // Job Revoke and Delete State Modals
  const [revokeJobModalOpen, setRevokeJobModalOpen] = React.useState(false);
  const [targetRevokeJob, setTargetRevokeJob] = React.useState<any>(null);
  const [revokeLoading, setRevokeLoading] = React.useState(false);

  const [deleteJobModalOpen, setDeleteJobModalOpen] = React.useState(false);
  const [targetDeleteJob, setTargetDeleteJob] = React.useState<any>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const [blockDeleteModalOpen, setBlockDeleteModalOpen] = React.useState(false);
  const [targetBlockDeleteJob, setTargetBlockDeleteJob] = React.useState<any>(null);

  const handleOpenRevokeJobModal = (job: any) => {
    setTargetRevokeJob(job);
    setRevokeJobModalOpen(true);
  };

  const handleConfirmRevokeJob = async () => {
    if (!targetRevokeJob || !targetRevokeJob.id) return;
    setRevokeLoading(true);
    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revoke",
          id: targetRevokeJob.id,
          token: targetRevokeJob.token,
          operator: "Operator"
        })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Job [${targetRevokeJob.token}] revoked! ${json.reverted_count || ''} order(s) reset to Ready to Deliver.`, "success");
        setRevokeJobModalOpen(false);
        setTargetRevokeJob(null);
        await Promise.all([fetchJobHistory(), fetchDatabaseOrders(true)]);
      } else {
        showToast(json.error || "Failed to revoke job", "error");
      }
    } catch (err: any) {
      showToast("Error revoking job: " + err.message, "error");
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleClickDeleteJob = (job: any) => {
    if (!job) return;
    const isUnrevoked = job.status === "OPEN" || job.status === "CLAIMED";
    if (isUnrevoked) {
      setTargetBlockDeleteJob(job);
      setBlockDeleteModalOpen(true);
    } else {
      setTargetDeleteJob(job);
      setDeleteJobModalOpen(true);
    }
  };

  const handleConfirmDeleteJob = async () => {
    if (!targetDeleteJob || !targetDeleteJob.id) return;
    setDeleteLoading(true);
    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: targetDeleteJob.id, token: targetDeleteJob.token })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Job package [${targetDeleteJob.token}] deleted from history.`, "success");
        setDeleteJobModalOpen(false);
        setTargetDeleteJob(null);
        fetchJobHistory();
      } else {
        showToast(json.error || "Failed to delete job", "error");
      }
    } catch (err: any) {
      showToast("Error deleting job: " + err.message, "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelJob = async (job: any) => {
    if (!job || !job.id) return;
    try {
      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", id: job.id })
      });
      const json = await res.json();
      if (json.success) {
        showToast(`Job token [${job.token}] has been voided/cancelled.`, "success");
        fetchJobHistory();
      } else {
        showToast(json.error || "Failed to cancel job", "error");
      }
    } catch (err: any) {
      showToast("Error cancelling job: " + err.message, "error");
    }
  };

  // Resolve Store ID Helper
  const resolveStoreById = (cleanStoreId: string): { storeId: string; deliverTo: string; poscode: string } | null => {
    if (!cleanStoreId) return null;
    const query = cleanStoreId.trim().toLowerCase();
    const matchedStore = stores.find(
      (s) => String(s.id || "").trim().toLowerCase() === query || String(s["Display Name"] || "").trim().toLowerCase() === query
    );
    if (!matchedStore) return null;

    const retailerId = matchedStore["Retailers ID"] !== undefined ? matchedStore["Retailers ID"] : matchedStore["Retailer ID"];
    const retailer = retailers.find((r) => String(r.id) === String(retailerId));
    const retailerName = retailer ? (retailer["Display Name"] || "") : "";
    const prefix = retailerName ? (retailerName.substring(0, 5) + " - ") : "";
    const storeName = matchedStore["Display Name"] || matchedStore.name || "";
    const deliverTo = storeName ? (prefix + storeName) : "";
    const poscode = String(matchedStore.poscode || matchedStore["Postal Code"] || "").trim();

    return {
      storeId: String(matchedStore.id || cleanStoreId).trim(),
      deliverTo,
      poscode
    };
  };

  // Helper to generate Job Loading Sheet & Route PDF
  const handleGenerateJobPdf = async (token: string, selectedOrdersList: DbOrder[]) => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Consolidate all items across selected orders
      const consolidatedItemsMap: Record<string, number> = {};
      let totalItemsQty = 0;

      selectedOrdersList.forEach((order) => {
        let items: SKUItem[] = [];
        try {
          items = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []);
        } catch (_) {
          items = [];
        }
        items.forEach((it) => {
          const sku = String(it.sku || "Unknown SKU").trim();
          const qty = Number(it.qty || 1);
          consolidatedItemsMap[sku] = (consolidatedItemsMap[sku] || 0) + qty;
          totalItemsQty += qty;
        });
      });

      const consolidatedItems = Object.entries(consolidatedItemsMap).map(([sku, qty]) => ({ sku, qty }));

      // Fetch QR Code for Outsource/Driver Login
      let qrBase64 = "";
      try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('https://app.hsgglobal.sg/driver/login')}`;
        qrBase64 = await loadImageBase64(qrUrl);
      } catch (_) {}

      // Check if this is a Warehouse Pickup job
      const isWarehousePickupJob = jobZoneFilter === "Warehouse Pickup" || jobZoneFilter === "Self-Collect" || (selectedOrdersList.length > 0 && selectedOrdersList.every(o => {
        const m = String(o.deliver_method || "").toLowerCase();
        const p = String(o.poscode || "").toLowerCase();
        return m.includes("self") || m.includes("collect") || m.includes("pickup") || m.includes("warehouse") || p.includes("self") || p.includes("pickup");
      }));

      // --- PAGE 1: WAREHOUSE LOADING & BATCH LOAD SUMMARY ---
      doc.setFillColor(11, 87, 208); // Google Blue #0B57D0
      doc.rect(0, 0, pageWidth, 26, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text(isWarehousePickupJob ? "WAREHOUSE PICKUP SHEET & STAGING" : "VEHICLE LOADING SHEET & JOB DISPATCH", 14, 11);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${new Date().toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}`, 14, 18);

      // Job Token Header Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, 32, pageWidth - 28, 38, 3, 3, "F");
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, 32, pageWidth - 28, 38, 3, 3, "D");

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text(isWarehousePickupJob ? "WAREHOUSE PICKUP CLAIM CODE:" : "JOB CLAIM CODE (ENTER IN DRIVER APP):", 20, 41);

      doc.setFontSize(26);
      doc.setFont("courier", "bold");
      doc.setTextColor(11, 87, 208);
      doc.text(token, 20, 54);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Total Orders: ${selectedOrdersList.length}   |   Total Goods Qty: ${totalItemsQty} units`, 20, 63);

      // Instructions Box
      const instrBoxY = 74;
      const instrBoxH = 26;
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(14, instrBoxY, pageWidth - 28, instrBoxH, 2, 2, "FD");

      doc.setTextColor(146, 64, 14);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      if (isWarehousePickupJob) {
        doc.text("WAREHOUSE PICKUP INSTRUCTIONS:", 18, instrBoxY + 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("1. Stage all goods listed below at warehouse collection area.", 18, instrBoxY + 11.5);
        doc.text("2. Check off order items on Page 2 when customer arrives to collect.", 18, instrBoxY + 16.5);
        doc.text("3. Have customer/driver sign with pen under SIGNATURE on Page 2.", 18, instrBoxY + 21.5);
      } else {
        doc.text("DRIVER INSTRUCTIONS:", 18, instrBoxY + 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("1. Load all goods listed below into vehicle.", 18, instrBoxY + 11.5);
        doc.text("2. Open app.hsgglobal.sg/driver/login or scan QR Code on the right.", 18, instrBoxY + 16.5);
        doc.text(`3. Side Menu -> 'Batch Load' -> Enter Token [ ${token} ] to load all orders.`, 18, instrBoxY + 21.5);

        // Render QR Code on right side of Instructions Box
        if (qrBase64) {
          try {
            const qrSize = 22;
            doc.addImage(qrBase64, "PNG", pageWidth - 14 - qrSize - 3, instrBoxY + 2, qrSize, qrSize);
          } catch (_) {}
        }
      }

      // Combined Loading Table Header
      let yPos = 104;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, yPos, pageWidth - 28, 8, "F");
      doc.setDrawColor(203, 213, 225);
      doc.rect(14, yPos, pageWidth - 28, 8, "D");

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("CHECK", 18, yPos + 5.5);
      doc.text("SKU / PRODUCT ITEM DESCRIPTION", 42, yPos + 5.5);
      doc.text("TOTAL QTY TO LOAD", pageWidth - 55, yPos + 5.5);

      yPos += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      consolidatedItems.forEach((item, idx) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }

        const bg = idx % 2 === 0 ? 255 : 248;
        doc.setFillColor(bg, bg, bg);
        doc.rect(14, yPos, pageWidth - 28, 7.5, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(14, yPos, pageWidth - 28, 7.5, "D");

        // Checkbox box
        doc.rect(20, yPos + 1.8, 3.8, 3.8);

        doc.setTextColor(15, 23, 42);
        doc.text(item.sku, 42, yPos + 5);

        doc.setFont("helvetica", "bold");
        doc.text(`${item.qty} units`, pageWidth - 55, yPos + 5);
        doc.setFont("helvetica", "normal");

        yPos += 7.5;
      });

      // --- PAGE 2+: SIMPLIFIED ROUTE / COLLECTION TABLE ---
      doc.addPage();

      const renderRouteTableHeader = (startY: number): number => {
        doc.setFillColor(11, 87, 208); // Google Blue
        doc.rect(0, 0, pageWidth, 16, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(isWarehousePickupJob ? `WAREHOUSE COLLECTION CHECKLIST — JOB [ ${token} ] (${selectedOrdersList.length} ORDERS)` : `DISPATCH ROUTE BREAKDOWN — JOB [ ${token} ] (${selectedOrdersList.length} STOPS)`, 14, 11);

        const thY = startY;
        const totalW = 182; // 12 + 14 + 56 + 44 + 28 + 28
        doc.setFillColor(241, 245, 249);
        doc.rect(14, thY, totalW, 8, "F");
        doc.setDrawColor(203, 213, 225);
        doc.rect(14, thY, totalW, 8, "D");

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");

        let curX = 14;
        // Col 1: Stop / No
        doc.text(isWarehousePickupJob ? "NO" : "STOP", curX + 6, thY + 5.5, { align: "center" });
        curX += 12;
        // Col 2: Mark
        doc.text("MARK", curX + 7, thY + 5.5, { align: "center" });
        curX += 14;
        // Col 3: Customer / DO
        doc.text("CUSTOMER / DO", curX + 3, thY + 5.5);
        curX += 56;
        // Col 4: Items
        doc.text("ITEMS", curX + 3, thY + 5.5);
        curX += 44;
        // Col 5: Signature
        doc.text("SIGNATURE", curX + 3, thY + 5.5);
        curX += 28;
        // Col 6: Note
        doc.text("NOTE", curX + 3, thY + 5.5);

        return thY + 8;
      };

      let tableY = renderRouteTableHeader(22);

      selectedOrdersList.forEach((order, sIdx) => {
        let orderItems: SKUItem[] = [];
        try {
          orderItems = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []);
        } catch (_) {}

        const itemsText = orderItems.map((it) => `${it.sku} (x${it.qty})`).join(", ");
        const refPrefix = order.ref_number ? `${order.ref_number} | ` : "";
        const refAddressText = `${refPrefix}${order.deliver_to || "Address not specified"}`;
        const doSubline = `DO: ${order.do_number || "-"}  |  S(${order.poscode || "-"})`;

        // Calculate heights for text wrapping
        doc.setFontSize(7.5);
        const addressLines = doc.splitTextToSize(refAddressText, 52);
        const itemsLines = doc.splitTextToSize(itemsText || "-", 40);

        const textLinesCount = Math.max(4, addressLines.length + 1, itemsLines.length);
        const rowHeight = Math.max(20, textLinesCount * 3.8 + 4.5);

        if (tableY + rowHeight > pageHeight - 14) {
          doc.addPage();
          tableY = renderRouteTableHeader(22);
        }

        const totalW = 182;
        const bg = sIdx % 2 === 0 ? 255 : 249;
        doc.setFillColor(bg, bg, bg);
        doc.rect(14, tableY, totalW, rowHeight, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(14, tableY, totalW, rowHeight, "D");

        // Vertical divider lines
        let divX = 14;
        const colWidths = [12, 14, 56, 44, 28, 28];
        colWidths.forEach((w) => {
          divX += w;
          doc.line(divX, tableY, divX, tableY + rowHeight);
        });

        // Col 1: Stop #
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text(String(sIdx + 1), 14 + 6, tableY + rowHeight / 2 + 1.5, { align: "center" });

        // Col 2: Mark
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(11, 87, 208); // Google Blue
        doc.text(order.mark || "-", 14 + 12 + 7, tableY + rowHeight / 2 + 1.5, { align: "center" });

        // Col 3: Customer / DO (Ref | Address & DO: | S(poscode))
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        let addrY = tableY + 4;
        addressLines.forEach((line: string) => {
          doc.text(line, 14 + 12 + 14 + 2, addrY);
          addrY += 3.4;
        });
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text(doSubline, 14 + 12 + 14 + 2, addrY + 0.5);

        // Col 4: Items
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        let itemY = tableY + 4;
        itemsLines.forEach((line: string) => {
          doc.text(line, 14 + 12 + 14 + 56 + 2, itemY);
          itemY += 3.4;
        });

        // Col 5 & 6: Signature & Note are intentionally blank for writing with pen

        tableY += rowHeight;
      });

      // Output and download
      doc.save(`Job_Dispatch_${token}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      showToast("Failed to generate PDF: " + err.message, "error");
    }
  };

  const handleReprintJobPdf = async (job: any) => {
    let orderIds: string[] = [];
    try {
      orderIds = typeof job.order_ids === "string" ? JSON.parse(job.order_ids) : (job.order_ids || []);
    } catch (_) {
      orderIds = [];
    }

    const matchedOrders = dbOrders.filter((o) => orderIds.includes(o.id));
    if (matchedOrders.length === 0) {
      showToast("Could not find order records for this job in current database.", "warning");
      return;
    }

    await handleGenerateJobPdf(job.token, matchedOrders);
    showToast(`Generating PDF for Job [${job.token}]...`, "success");
  };

  // Handler to update Link Store on existing orders in Complete tables
  const handleUpdateOrderLinkStore = async (order: DbOrder, newStoreId: string) => {
    const cleanStoreId = String(newStoreId || "").trim();
    const currentLinkStore = String(order.link_store || "").trim();
    if (cleanStoreId === currentLinkStore) return;

    let updatedDeliverTo = order.deliver_to;
    let updatedPoscode = order.poscode;

    if (cleanStoreId) {
      const matchedStore = stores.find(
        (s) => String(s.id || "").toLowerCase() === cleanStoreId.toLowerCase()
      );
      if (matchedStore) {
        const retailerId = matchedStore["Retailers ID"] !== undefined ? matchedStore["Retailers ID"] : matchedStore["Retailer ID"];
        const retailer = retailers.find((r) => String(r.id) === String(retailerId));
        const retailerName = retailer ? (retailer["Display Name"] || "") : "";
        const prefix = retailerName ? (retailerName.substring(0, 5) + " - ") : "";
        const storeName = matchedStore["Display Name"] || matchedStore.name || "";
        if (storeName) {
          updatedDeliverTo = prefix + storeName;
        }
        if (matchedStore.poscode || matchedStore["Postal Code"]) {
          updatedPoscode = String(matchedStore.poscode || matchedStore["Postal Code"]).trim();
        }
      }
    }

    // Optimistically update local state
    setDbOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              link_store: cleanStoreId,
              deliver_to: updatedDeliverTo,
              poscode: updatedPoscode
            }
          : o
      )
    );

    // Sync to backend Supabase via Cloudflare Worker
    try {
      const payload = {
        action: "update",
        data: {
          id: order.id,
          link_store: cleanStoreId,
          deliver_to: updatedDeliverTo,
          poscode: updatedPoscode
        }
      };

      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`Server status ${res.status}`);
      }
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error || "Update failed");
      }
      showToast(`Store linked: ${cleanStoreId ? cleanStoreId : "Cleared"}`, "success");
    } catch (err: any) {
      console.error("Failed to update link_store:", err);
      showToast("Failed to save Link Store: " + err.message, "error");
      // Rollback
      fetchDatabaseOrders();
    }
  };

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
  const [mapSearchQuery, setMapSearchQuery] = React.useState<string>("");

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
    // 1. Load draft orders from localStorage
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

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
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

    // Check if Mark is active in pending orders or already completed today
    const isMarkActive = pendingOrders.some(
      (o) => String(o.mark).toUpperCase() === createMark.toUpperCase() && (!editingOrder || o.id !== editingOrder.id) && o.status !== "Delivered"
    ) || dbOrders.some(
      (o) => String(o.mark).toUpperCase() === createMark.toUpperCase() && (!editingOrder || o.id !== editingOrder.id) && o.type !== "Return" && isOrderDoneToday(o)
    );
    if (isMarkActive) {
      showToast(`Mark "${createMark}" is currently active or was already completed today.`, "error");
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

    const cleanPoscode = String(createPoscode || "").trim();

    let lat: number | string = "";
    let lng: number | string = "";
    try {
      const coords = await fetchPostcodeCoordinates(cleanPoscode, oneMapUrl, oneMapToken);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      } else {
        const fallback = getSingaporeLatLng(cleanPoscode);
        lat = fallback.lat;
        lng = fallback.lng;
      }
    } catch (_) {
      const fallback = getSingaporeLatLng(cleanPoscode);
      lat = fallback.lat;
      lng = fallback.lng;
    }

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
        poscode: cleanPoscode,
        items: JSON.stringify(parsedItems),
        deadline: deadlineVal,
        latitude: lat,
        longitude: lng
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
      poscode: cleanPoscode,
      items: createItems.filter(i => i.sku.trim() !== ""),
      appointmentDate: createType === "Appointment" ? createAppointmentDate : undefined,
      appointmentTimeWindow: createType === "Appointment" ? createTimeWindow : undefined,
      deadline: deadlineVal,
      deliverMethod: createDeliverMethod,
      latitude: lat,
      longitude: lng
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
    const linkStoreMatch = (order.link_store || "").toLowerCase().includes(lowerQ);
    const markMatch = (order.mark || "").trim().toLowerCase() === lowerQ;

    return idMatch || doMatch || refMatch || addressMatch || postcodeMatch || driverMatch || invoiceMatch || creditNoteMatch || linkStoreMatch || markMatch;
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
    return dbOrders.filter(isOrderDoneToday).length;
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

    // Validation: Mark cannot be the same if still pending/collected or completed today
    const isEdit = !!editingReturn;
    const isMarkActive = dbOrders.some(o => 
      o.type === "Return" && 
      (!isEdit || o.id !== editingReturn.id) &&
      String(o.mark).toUpperCase() === finalMark.toUpperCase() &&
      (
        (o.status !== "Complete" && 
         o.status !== "Collected" && 
         o.status !== "Return Collected" && 
         String(o.completed) !== "true" &&
         o.completed !== true) ||
        isOrderDoneToday(o)
      )
    ) || drafts.some(d =>
      d.type === "Return" &&
      String(d.mark).toUpperCase() === finalMark.toUpperCase()
    );
    
    if (isMarkActive) {
      showToast(`Mark "${finalMark}" is currently active or was already completed today.`, "error");
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

  // Render return order due date cell with status indicator for Pending returns
  const renderReturnDueDateCell = (order: DbOrder) => {
    if (!order.deadline) return <span className="text-zinc-400 font-normal">—</span>;
    const deadline = Number(order.deadline);
    if (isNaN(deadline) || deadline <= 0) return <span className="text-zinc-400 font-normal">—</span>;

    const dateFormatted = formatDateStr(deadline);

    // If order is completed or collected, show standard clean date without urgent badges
    const isPending = order.status === "Pending" || order.status === "Ready to Collect" || order.status === "Out for Collection";
    if (!isPending) {
      return <span className="text-zinc-600 font-normal">{dateFormatted}</span>;
    }

    // Compare with today (end of the due date at 23:59:59)
    const dueDate = new Date(deadline);
    dueDate.setHours(23, 59, 59, 999);
    const dueTime = dueDate.getTime();

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const diff = dueTime - now;

    if (diff < 0) {
      // Overdue
      return (
        <div className="flex items-center gap-1.5" title={`Overdue! Due on ${dateFormatted}`}>
          <span className="text-red-600 font-semibold">{dateFormatted}</span>
          <span className="inline-flex items-center px-1.5 py-0.2 rounded border text-[9px] font-bold bg-red-50 text-red-700 border-red-200 shrink-0">
            Overdue
          </span>
        </div>
      );
    } else if (diff <= oneDayMs) {
      // Due Today
      return (
        <div className="flex items-center gap-1.5" title={`Due today (${dateFormatted})`}>
          <span className="text-amber-700 font-semibold">{dateFormatted}</span>
          <span className="inline-flex items-center px-1.5 py-0.2 rounded border text-[9px] font-bold bg-amber-50 text-amber-800 border-amber-300 shrink-0">
            Due Today
          </span>
        </div>
      );
    } else if (diff <= 2 * oneDayMs) {
      // Due Tomorrow / Near
      return (
        <div className="flex items-center gap-1.5" title={`Due soon on ${dateFormatted}`}>
          <span className="text-zinc-700 font-medium">{dateFormatted}</span>
          <span className="inline-flex items-center px-1.5 py-0.2 rounded border text-[9px] font-medium bg-amber-50/60 text-amber-700 border-amber-200 shrink-0">
            Due Soon
          </span>
        </div>
      );
    }

    return <span className="text-zinc-600 font-normal">{dateFormatted}</span>;
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

  // Helper to render driver reported issues / discrepancy indicator badge
  const renderDiscrepancyBadge = (order: DbOrder) => {
    const combinedKey = `${order.do_number}_${order.ref_number || "NA"}`;
    const discrepancies =
      orderDiscrepanciesMap[order.id] ||
      orderDiscrepanciesMap[combinedKey] ||
      orderDiscrepanciesMap[order.do_number] ||
      (order.ref_number ? orderDiscrepanciesMap[order.ref_number] : undefined);

    if (!discrepancies || discrepancies.length === 0) return null;

    const tooltipLines = discrepancies.map(
      (d) => `• ${d.sku}: Ordered ${d.qty_ordered}, Delivered ${d.qty_delivered}${d.remark ? ` (${d.remark})` : ""}`
    );
    const tooltipText = `Driver Reported Issue:\n${tooltipLines.join("\n")}`;

    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 text-[10px] font-bold cursor-help shrink-0 shadow-2xs hover:bg-amber-100 transition-colors"
        title={tooltipText}
      >
        <AlertTriangle size={11} className="text-amber-600 shrink-0" />
        <span>{discrepancies.length} Issue{discrepancies.length > 1 ? "s" : ""}</span>
      </span>
    );
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

  // Find the next unused capital letter mark character A-Z, AA-AZ, BA-BZ skipping pending orders, existing drafts, and orders completed today
  const getNextAvailableMark = (currentDrafts: TrackOrderDraft[], currentPending: any[], tempAssigned: string[] = []): string => {
    const usedMarks = new Set<string>();
    
    currentPending.forEach((o) => {
      if (o.mark && o.status !== "Delivered") {
        usedMarks.add(String(o.mark).trim().toUpperCase());
      }
    });

    // Also reserve marks from orders completed today so drivers don't confuse new orders with tasks finished earlier today
    dbOrders.forEach((o) => {
      if (o.mark && o.type !== "Return" && isOrderDoneToday(o)) {
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
      if (o.mark && o.type === "Return") {
        const isPendingReturn = o.status !== "Complete" && 
          o.status !== "Collected" && 
          o.status !== "Return Collected" && 
          String(o.completed) !== "true" && 
          o.completed !== true;
        
        // Reserve if still pending return OR already collected/done today
        if (isPendingReturn || isOrderDoneToday(o)) {
          usedMarks.add(String(o.mark).trim().toUpperCase());
        }
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
    // Singapore midnight (UTC+8)
    const now = new Date();
    const sgTimeString = now.toLocaleString("en-US", { timeZone: "Asia/Singapore" });
    const sgDate = new Date(sgTimeString);
    sgDate.setHours(0, 0, 0, 0);
    const diff = now.getTime() - new Date(sgTimeString).getTime();
    const startOfTodayMs = sgDate.getTime() + diff;

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
      if (!matchesOrderSearch(o, mapSearchQuery)) return false;
      
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
      if (!matchesOrderSearch(o, mapSearchQuery)) return false;

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
        let color = "#E28B54"; // Soft Orange (Pending Pick Return Paper)
        let textColor = "#FFFFFF";
        let displayStatus = "Goods Ready";

        if (o.status === "Collected" || o.status === "Return Collected") {
          color = "#14532D"; // Deep Forest Green
          textColor = "#FFFFFF";
          displayStatus = "Complete Job";
        } else if (o.status === "Pick Return" || o.status === "Load" || o.status === "Out for Delivery") {
          color = "#007A87"; // Teal Blue
          textColor = "#FFFFFF";
          displayStatus = "Driver Deliver or Collect Goods";
        } else {
          color = "#E28B54"; // Soft Orange (Pending return / not picked yet)
          textColor = "#FFFFFF";
          displayStatus = "Goods Ready";
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
  }, [dbOrders, stores, mapFilter, mapSearchQuery, matchesOrderSearch]);

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

      L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
        opacity: 0.5
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

  // Save drafts helper: persists drafts with Cloudflare R2 URLs directly in localStorage
  const saveDraftsToStorage = (updatedDrafts: TrackOrderDraft[]) => {
    setDrafts(updatedDrafts);
    try {
      localStorage.setItem("track_order_drafts", JSON.stringify(updatedDrafts));
    } catch (e) {
      console.warn("Could not save drafts to localStorage:", e);
    }
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
    setInvoiceLoadingText("Reading PDF pages...");
    showToast("Reading PDF document for batch parsing...", "info");

    try {
      // 1. Render all page thumbnails into invoicePdfImages via pdf.js
      let invoicePdfImages: string[] = [];
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
            invoicePdfImages.push(dataUrl);
          }
        }
      } catch (pdfErr) {
        console.error("Invoice PDF page rendering failed:", pdfErr);
      }

      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const totalPages = srcDoc.getPageCount();

      if (totalPages === 0) {
        throw new Error("The uploaded PDF document contains no pages.");
      }

      const CHUNK_SIZE = 7; // Auto-split into 7 pages per batch
      const totalBatches = Math.ceil(totalPages / CHUNK_SIZE);
      const allParsedInvoices: any[] = [];

      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const startPage = batchIdx * CHUNK_SIZE;
        const endPage = Math.min(startPage + CHUNK_SIZE, totalPages);

        const statusMsg = totalBatches > 1
          ? `Parsing Batch ${batchIdx + 1}/${totalBatches} (Pages ${startPage + 1}-${endPage})...`
          : `Parsing ${totalPages} pages...`;

        setInvoiceLoadingText(statusMsg);
        showToast(statusMsg, "info");

        // Create sub-document for this batch
        const subDoc = await PDFDocument.create();
        const pageIndices: number[] = [];
        for (let p = startPage; p < endPage; p++) {
          pageIndices.push(p);
        }
        const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
        copiedPages.forEach((p) => subDoc.addPage(p));

        const subPdfBase64 = await subDoc.saveAsBase64();

        // Call Gemini invoice parser
        const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/parse-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdf: subPdfBase64, type: "application/pdf" })
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Batch ${batchIdx + 1} server error (status ${res.status})`);
        }

        const parsed = await res.json();
        let batchInvoices = parsed.data;

        if (parsed.success && batchInvoices) {
          let list: any[] = [];
          if (Array.isArray(batchInvoices)) {
            list = batchInvoices;
          } else if (typeof batchInvoices === "object") {
            if (Array.isArray(batchInvoices.invoices)) {
              list = batchInvoices.invoices;
            } else if (Array.isArray(batchInvoices.data)) {
              list = batchInvoices.data;
            } else {
              list = [batchInvoices];
            }
          }

          // Adjust pageNumbers to global index
          const adjustedList = list.map((inv: any) => {
            if (Array.isArray(inv.pageNumbers)) {
              return {
                ...inv,
                pageNumbers: inv.pageNumbers.map((pNum: any) => {
                  const num = parseInt(pNum, 10);
                  return isNaN(num) ? pNum : num + startPage;
                })
              };
            }
            return {
              ...inv,
              pageNumbers: [startPage + 1]
            };
          });

          allParsedInvoices.push(...adjustedList);
        }

        // Polite sleep between batches if more batches remain
        if (batchIdx < totalBatches - 1) {
          setInvoiceLoadingText(`Batch ${batchIdx + 1} done. Preparing next batch...`);
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      // Group and Merge multi-page split invoices across batches (e.g. Page 1 in Batch 1, Page 2 in Batch 2)
      const mergedInvoicesMap = new Map<string, any>();
      for (const inv of allParsedInvoices) {
        const invNum = String(inv.invoiceNumber || "").trim();
        const poRef = String(inv.poRef || "").trim();
        const key = (invNum || poRef).toLowerCase();
        if (!key) continue;

        if (!mergedInvoicesMap.has(key)) {
          mergedInvoicesMap.set(key, {
            ...inv,
            items: Array.isArray(inv.items) ? [...inv.items] : [],
            pageNumbers: Array.isArray(inv.pageNumbers) ? [...inv.pageNumbers] : []
          });
        } else {
          const existing = mergedInvoicesMap.get(key);
          // 1. Keep invoice number if not set
          if (invNum && !existing.invoiceNumber) {
            existing.invoiceNumber = invNum;
          }
          // 2. Keep PO ref if not set
          if (poRef && !existing.poRef) {
            existing.poRef = poRef;
          }
          // 3. Keep total invoice amount from footer page if present
          if (inv.invoiceAmount && String(inv.invoiceAmount).trim() !== "") {
            existing.invoiceAmount = inv.invoiceAmount;
          }
          // 4. Combine items from Page 1 and Page 2
          if (Array.isArray(inv.items) && inv.items.length > 0) {
            existing.items = [...(existing.items || []), ...inv.items];
          }
          // 5. Combine page numbers
          if (Array.isArray(inv.pageNumbers) && inv.pageNumbers.length > 0) {
            existing.pageNumbers = Array.from(new Set([...(existing.pageNumbers || []), ...inv.pageNumbers]));
          }
        }
      }

      const unifiedInvoices = Array.from(mergedInvoicesMap.values());

      showToast(`Successfully extracted ${unifiedInvoices.length} unique invoices across all batches. Matching orders & uploading invoice photos...`, "info");
      setInvoiceLoadingText("Uploading invoice photos...");

      let matchedCount = 0;
      let ignoredBlankRef = 0;
      let notDeliveredCount = 0;
      let noMatchCount = 0;

      for (let invIdx = 0; invIdx < unifiedInvoices.length; invIdx++) {
        const inv = unifiedInvoices[invIdx];
        const { invoiceNumber, poRef, invoiceAmount, items, pageNumbers } = inv;

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

        // Upload matched invoice page photo to Cloudflare R2
        let uploadedPhotoInvoiceUrl = matchedOrder.photo_invoice || "";
        const itemPageIndices = Array.isArray(pageNumbers) && pageNumbers.length > 0
          ? pageNumbers.map((pn: any) => parseInt(pn, 10) - 1).filter((n: number) => !isNaN(n) && n >= 0 && n < invoicePdfImages.length)
          : [];

        if (itemPageIndices.length > 0 && invoicePdfImages.length > 0) {
          try {
            const firstPageDataUrl = invoicePdfImages[itemPageIndices[0]];
            if (firstPageDataUrl && firstPageDataUrl.startsWith("data:image/")) {
              setInvoiceLoadingText(`Uploading photo for invoice ${invIdx + 1}/${unifiedInvoices.length}...`);
              const base64Content = firstPageDataUrl.split(",")[1];
              const byteCharacters = atob(base64Content);
              const byteNumbers = new Array(byteCharacters.length);
              for (let b = 0; b < byteCharacters.length; b++) {
                byteNumbers[b] = byteCharacters.charCodeAt(b);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: "image/jpeg" });

              const fileName = `Track_Orders/Invoice_Proof/${matchedOrder.do_number || "INV"}_${Date.now()}.jpg`;
              const uploadRes = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(fileName)}`, {
                method: "POST",
                headers: { "Content-Type": "image/jpeg" },
                body: blob
              });

              if (uploadRes.ok) {
                const uploadData = await uploadRes.json() as any;
                if (uploadData.success && uploadData.url) {
                  uploadedPhotoInvoiceUrl = uploadData.url;
                }
              }
            }
          } catch (uploadErr) {
            console.error("Failed to upload invoice photo to R2:", uploadErr);
          }
        }

        // Parse extracted invoice items if present and valid
        let finalItemsJson: string | undefined = undefined;
        let itemsRemark = "";
        if (Array.isArray(items) && items.length > 0) {
          const cleanItems: SKUItem[] = items
            .map((it: any) => ({
              sku: String(it.sku || it.name || it.item || "Unknown SKU").trim(),
              qty: Number(it.qty || it.quantity || 1) || 1
            }))
            .filter((it: SKUItem) => Boolean(it.sku));

          if (cleanItems.length > 0) {
            finalItemsJson = JSON.stringify(cleanItems);
            itemsRemark = ` • Updated Items & Qty from Invoice (${cleanItems.length} items)`;
          }
        }

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
            remark: `Archived & Verified in Bulk (Invoice: ${invoiceNumber}, Amount: ${invoiceAmount})${itemsRemark}`,
            photoUrl: uploadedPhotoInvoiceUrl || undefined,
            timestamp: Date.now()
          }
        ];

        // 1. Silent Background API request
        const payloadData: any = {
          id: matchedOrder.id,
          ref_number: matchedOrder.ref_number,
          status: "Delivered",
          completed: "true",
          invoice_number: invoiceNumber || "",
          invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
          photo_invoice: uploadedPhotoInvoiceUrl || "",
          logs: JSON.stringify(updatedLogs)
        };
        if (finalItemsJson !== undefined) {
          payloadData.items = finalItemsJson;
        }

        const payload = {
          action: "update",
          data: payloadData
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
                  status: "Delivered",
                  completed: "true",
                  invoice_number: invoiceNumber || "",
                  invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
                  photo_invoice: uploadedPhotoInvoiceUrl || "",
                  ...(finalItemsJson !== undefined ? { items: finalItemsJson } : {}),
                  logs: JSON.stringify(updatedLogs)
                }
              : o
          )
        );
      }

      showToast(
        `Bulk completion complete! ${matchedCount} orders updated with invoice.${noMatchCount > 0 ? ` (${noMatchCount} not matched)` : ""}`,
        "success"
      );

    } catch (err: any) {
      showToast(err.message || "Failed to process bulk invoices.", "error");
    } finally {
      setInvoiceLoading(false);
      setInvoiceLoadingText("Parsing Invoices...");
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
      const itemsIdx = headers.findIndex(h => h === "items" || h === "item" || h === "skus" || h === "sku" || h === "skuitems" || h === "products" || h === "itemsjson");

      if (invIdx === -1 || refIdx === -1 || amtIdx === -1) {
        throw new Error("Sheet must contain 'Invoice', 'Ref Number', and 'Amount' column headers.");
      }

      // Helper to parse items string e.g. JSON or "SKUA,1,SKUB,45"
      const parseInvoiceItemsValue = (raw: any): SKUItem[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        const str = String(raw).trim();
        if (!str) return [];

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

      const parsedInvoices = [];
      for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i] as any[];
        if (!row || row.length === 0) continue;
        const invoiceNumber = String(row[invIdx] || "").trim();
        const poRef = String(row[refIdx] || "").trim();
        const invoiceAmount = row[amtIdx] !== undefined && row[amtIdx] !== null ? String(row[amtIdx]).trim() : "";
        const parsedItems = itemsIdx !== -1 ? parseInvoiceItemsValue(row[itemsIdx]) : [];
        if (!invoiceNumber && !poRef) continue;
        parsedInvoices.push({ invoiceNumber, poRef, invoiceAmount, items: parsedItems });
      }

      showToast(`Parsed ${parsedInvoices.length} invoices. Matching references...`, "info");

      let matchedCount = 0;
      let ignoredBlankRef = 0;
      let notDeliveredCount = 0;
      let noMatchCount = 0;

      for (const inv of parsedInvoices) {
        const { invoiceNumber, poRef, invoiceAmount, items } = inv;

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

        let finalItemsJson: string | undefined = undefined;
        let itemsRemark = "";
        if (Array.isArray(items) && items.length > 0) {
          finalItemsJson = JSON.stringify(items);
          itemsRemark = ` • Updated Items & Qty from Spreadsheet (${items.length} items)`;
        }

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
            remark: `Archived & Verified in Bulk (Invoice: ${invoiceNumber}, Amount: ${invoiceAmount})${itemsRemark}`,
            timestamp: Date.now()
          }
        ];

        const payloadData: any = {
          id: matchedOrder.id,
          status: "Delivered",
          completed: "true",
          invoice_number: invoiceNumber || "",
          invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
          logs: JSON.stringify(updatedLogs)
        };
        if (finalItemsJson !== undefined) {
          payloadData.items = finalItemsJson;
        }

        const payload = {
          action: "update",
          data: payloadData
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
                  status: "Delivered",
                  completed: "true",
                  invoice_number: invoiceNumber || "",
                  invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
                  ...(finalItemsJson !== undefined ? { items: finalItemsJson } : {}),
                  logs: JSON.stringify(updatedLogs)
                }
              : o
          )
        );
      }

      showToast(
        `Bulk completion complete! ${matchedCount} orders updated with invoice.${noMatchCount > 0 ? ` (${noMatchCount} not matched)` : ""}`,
        "success"
      );
    } catch (err: any) {
      showToast(err.message || "Failed to process bulk invoices.", "error");
    } finally {
      setInvoiceLoading(false);
      e.target.value = "";
    }
  };

  // Handle Bulk PDF Credit Note Upload (With Automatic Client-Side Batch Splitting: 7-8 pages per chunk)
  const handleBulkCreditNoteUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showToast("Please upload a valid PDF file", "error");
      return;
    }

    setCreditNoteLoading(true);
    setCreditNoteLoadingText("Reading PDF pages...");
    showToast("Reading Credit Note document for batch parsing...", "info");

    try {
      // 1. Render all page thumbnails into creditNotePdfImages via pdf.js
      let creditNotePdfImages: string[] = [];
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
            creditNotePdfImages.push(dataUrl);
          }
        }
      } catch (pdfErr) {
        console.error("Credit note PDF page rendering failed:", pdfErr);
      }

      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const totalPages = srcDoc.getPageCount();

      if (totalPages === 0) {
        throw new Error("The uploaded PDF document contains no pages.");
      }

      const CHUNK_SIZE = 7;
      const totalBatches = Math.ceil(totalPages / CHUNK_SIZE);
      const allParsedCreditNotes: any[] = [];

      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const startPage = batchIdx * CHUNK_SIZE;
        const endPage = Math.min(startPage + CHUNK_SIZE, totalPages);

        const statusMsg = totalBatches > 1
          ? `Parsing Batch ${batchIdx + 1}/${totalBatches} (Pages ${startPage + 1}-${endPage})...`
          : `Parsing ${totalPages} pages...`;

        setCreditNoteLoadingText(statusMsg);
        showToast(statusMsg, "info");

        const subDoc = await PDFDocument.create();
        const pageIndices: number[] = [];
        for (let p = startPage; p < endPage; p++) {
          pageIndices.push(p);
        }
        const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
        copiedPages.forEach((p) => subDoc.addPage(p));

        const subPdfBase64 = await subDoc.saveAsBase64();

        const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/parse-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdf: subPdfBase64, type: "application/pdf" })
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Batch ${batchIdx + 1} server error (status ${res.status})`);
        }

        const parsed = await res.json();
        let batchNotes = parsed.data;

        if (parsed.success && batchNotes) {
          let list: any[] = [];
          if (Array.isArray(batchNotes)) {
            list = batchNotes;
          } else if (typeof batchNotes === "object") {
            if (Array.isArray(batchNotes.invoices)) {
              list = batchNotes.invoices;
            } else if (Array.isArray(batchNotes.data)) {
              list = batchNotes.data;
            } else {
              list = [batchNotes];
            }
          }

          // Adjust pageNumbers to global index
          const adjustedList = list.map((cn: any) => {
            if (Array.isArray(cn.pageNumbers)) {
              return {
                ...cn,
                pageNumbers: cn.pageNumbers.map((pNum: any) => {
                  const num = parseInt(pNum, 10);
                  return isNaN(num) ? pNum : num + startPage;
                })
              };
            }
            return {
              ...cn,
              pageNumbers: [startPage + 1]
            };
          });

          allParsedCreditNotes.push(...adjustedList);
        }

        if (batchIdx < totalBatches - 1) {
          setCreditNoteLoadingText(`Batch ${batchIdx + 1} done. Preparing next batch...`);
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      // Group and Merge multi-page split credit notes across batches (e.g. Page 1 in Batch 1, Page 2 in Batch 2)
      const mergedCreditNotesMap = new Map<string, any>();
      for (const cn of allParsedCreditNotes) {
        const cnNum = String(cn.invoiceNumber || cn.creditNoteNumber || "").trim();
        const poRef = String(cn.poRef || "").trim();
        const key = (cnNum || poRef).toLowerCase();
        if (!key) continue;

        if (!mergedCreditNotesMap.has(key)) {
          mergedCreditNotesMap.set(key, {
            ...cn,
            items: Array.isArray(cn.items) ? [...cn.items] : [],
            pageNumbers: Array.isArray(cn.pageNumbers) ? [...cn.pageNumbers] : []
          });
        } else {
          const existing = mergedCreditNotesMap.get(key);
          if (cnNum && !existing.invoiceNumber) {
            existing.invoiceNumber = cnNum;
            existing.creditNoteNumber = cnNum;
          }
          if (poRef && !existing.poRef) {
            existing.poRef = poRef;
          }
          if (cn.invoiceAmount && String(cn.invoiceAmount).trim() !== "") {
            existing.invoiceAmount = cn.invoiceAmount;
          }
          if (Array.isArray(cn.items) && cn.items.length > 0) {
            existing.items = [...(existing.items || []), ...cn.items];
          }
          if (Array.isArray(cn.pageNumbers) && cn.pageNumbers.length > 0) {
            existing.pageNumbers = Array.from(new Set([...(existing.pageNumbers || []), ...cn.pageNumbers]));
          }
        }
      }

      const unifiedCreditNotes = Array.from(mergedCreditNotesMap.values());

      showToast(`Successfully extracted ${unifiedCreditNotes.length} unique credit notes across all batches. Matching return references & uploading photos...`, "info");
      setCreditNoteLoadingText("Uploading credit note photos...");

      let matchedCount = 0;
      let ignoredBlankRef = 0;
      let notCollectedCount = 0;
      let noMatchCount = 0;

      for (let cnIdx = 0; cnIdx < unifiedCreditNotes.length; cnIdx++) {
        const cn = unifiedCreditNotes[cnIdx];
        const { invoiceNumber: creditNoteNumber, poRef, invoiceAmount, items, pageNumbers } = cn;

        if (!poRef || !poRef.trim()) {
          ignoredBlankRef++;
          continue;
        }

        // Find matching order in dbOrders (look for return orders by ref_number or do_number)
        const matchedOrder = dbOrders.find(
          (o) =>
            o.type === "Return" &&
            (String(o.ref_number || "").trim().toLowerCase() === String(poRef).trim().toLowerCase() ||
             String(o.do_number || "").trim().toLowerCase() === String(poRef).trim().toLowerCase())
        );

        if (!matchedOrder) {
          noMatchCount++;
          continue;
        }

        const orderStatus = String(matchedOrder.status || "").trim().toLowerCase();
        const isCollected = orderStatus === "collected" || orderStatus === "return collected" || orderStatus === "delivered";
        const isCompleted = matchedOrder.completed === "true" || matchedOrder.completed === true;

        if (!isCollected && !isCompleted) {
          notCollectedCount++;
          continue;
        }

        matchedCount++;

        // Upload matched credit note page photo to Cloudflare R2
        let uploadedPhotoInvoiceUrl = matchedOrder.photo_invoice || "";
        const itemPageIndices = Array.isArray(pageNumbers) && pageNumbers.length > 0
          ? pageNumbers.map((pn: any) => parseInt(pn, 10) - 1).filter((n: number) => !isNaN(n) && n >= 0 && n < creditNotePdfImages.length)
          : [];

        if (itemPageIndices.length > 0 && creditNotePdfImages.length > 0) {
          try {
            const firstPageDataUrl = creditNotePdfImages[itemPageIndices[0]];
            if (firstPageDataUrl && firstPageDataUrl.startsWith("data:image/")) {
              setCreditNoteLoadingText(`Uploading photo for credit note ${cnIdx + 1}/${unifiedCreditNotes.length}...`);
              const base64Content = firstPageDataUrl.split(",")[1];
              const byteCharacters = atob(base64Content);
              const byteNumbers = new Array(byteCharacters.length);
              for (let b = 0; b < byteCharacters.length; b++) {
                byteNumbers[b] = byteCharacters.charCodeAt(b);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: "image/jpeg" });

              const fileName = `Track_Orders/Invoice_Proof/${matchedOrder.do_number || "CN"}_${Date.now()}.jpg`;
              const uploadRes = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(fileName)}`, {
                method: "POST",
                headers: { "Content-Type": "image/jpeg" },
                body: blob
              });

              if (uploadRes.ok) {
                const uploadData = await uploadRes.json() as any;
                if (uploadData.success && uploadData.url) {
                  uploadedPhotoInvoiceUrl = uploadData.url;
                }
              }
            }
          } catch (uploadErr) {
            console.error("Failed to upload credit note photo to R2:", uploadErr);
          }
        }

        let finalItemsJson: string | undefined = undefined;
        let itemsRemark = "";
        if (Array.isArray(items) && items.length > 0) {
          const cleanItems: SKUItem[] = items
            .map((it: any) => ({
              sku: String(it.sku || it.name || it.item || "Unknown SKU").trim(),
              qty: Number(it.qty || it.quantity || 1) || 1
            }))
            .filter((it: SKUItem) => Boolean(it.sku));

          if (cleanItems.length > 0) {
            finalItemsJson = JSON.stringify(cleanItems);
            itemsRemark = ` • Updated Items & Qty from Credit Note (${cleanItems.length} items)`;
          }
        }

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
            remark: `Archived & Verified in Bulk (Credit Note: ${creditNoteNumber}, Amount: ${invoiceAmount})${itemsRemark}`,
            photoUrl: uploadedPhotoInvoiceUrl || undefined,
            timestamp: Date.now()
          }
        ];

        const payloadData: any = {
          id: matchedOrder.id,
          completed: "true",
          credit_note_number: creditNoteNumber || "",
          invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
          photo_invoice: uploadedPhotoInvoiceUrl || "",
          logs: JSON.stringify(updatedLogs)
        };
        if (finalItemsJson !== undefined) {
          payloadData.items = finalItemsJson;
        }

        const payload = {
          action: "update",
          data: payloadData
        };

        await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch((err) => console.error("Failed to sync bulk completed return order:", matchedOrder.id, err));

        setDbOrders((prev) =>
          prev.map((o) =>
            o.id === matchedOrder.id
              ? {
                  ...o,
                  completed: "true",
                  credit_note_number: creditNoteNumber || "",
                  invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
                  photo_invoice: uploadedPhotoInvoiceUrl || "",
                  ...(finalItemsJson !== undefined ? { items: finalItemsJson } : {}),
                  logs: JSON.stringify(updatedLogs)
                }
              : o
          )
        );
      }

      showToast(
        `Bulk completion complete! ${matchedCount} return orders updated.${notCollectedCount > 0 ? ` (${notCollectedCount} skipped - not collected yet)` : ""}${noMatchCount > 0 ? ` (${noMatchCount} not matched)` : ""}`,
        "success"
      );

    } catch (err: any) {
      showToast(err.message || "Failed to process bulk credit notes.", "error");
    } finally {
      setCreditNoteLoading(false);
      setCreditNoteLoadingText("Parsing Credit Notes...");
      event.target.value = "";
    }
  };

  // Handle Bulk Excel/CSV Credit Note Upload
  const handleCreditNoteExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCreditNoteLoading(true);
    showToast("Processing Credit Note spreadsheet...", "info");

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
      
      const cnIdx = headers.findIndex(h => h === "creditnote" || h === "creditnotenumber" || h === "creditnoteno" || h === "cn" || h === "cnnumber" || h === "invoice" || h === "invoicenumber");
      const refIdx = headers.findIndex(h => h === "refnumber" || h === "poref" || h === "reference" || h === "returnref" || h === "donumber");
      const amtIdx = headers.findIndex(h => h === "amount" || h === "creditnoteamount" || h === "totalamount" || h === "invoiceamount");
      const itemsIdx = headers.findIndex(h => h === "items" || h === "item" || h === "skus" || h === "sku" || h === "skuitems" || h === "products" || h === "itemsjson");

      if (cnIdx === -1 || refIdx === -1 || amtIdx === -1) {
        throw new Error("Sheet must contain 'Credit Note', 'Ref Number', and 'Amount' column headers.");
      }

      const parseCreditNoteItemsValue = (raw: any): SKUItem[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        const str = String(raw).trim();
        if (!str) return [];

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

      const parsedCreditNotes = [];
      for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i] as any[];
        if (!row || row.length === 0) continue;
        const creditNoteNumber = String(row[cnIdx] || "").trim();
        const poRef = String(row[refIdx] || "").trim();
        const invoiceAmount = row[amtIdx] !== undefined && row[amtIdx] !== null ? String(row[amtIdx]).trim() : "";
        const parsedItems = itemsIdx !== -1 ? parseCreditNoteItemsValue(row[itemsIdx]) : [];
        if (!creditNoteNumber && !poRef) continue;
        parsedCreditNotes.push({ creditNoteNumber, poRef, invoiceAmount, items: parsedItems });
      }

      showToast(`Parsed ${parsedCreditNotes.length} credit notes. Matching references...`, "info");

      let matchedCount = 0;
      let ignoredBlankRef = 0;
      let notCollectedCount = 0;
      let noMatchCount = 0;

      for (const cn of parsedCreditNotes) {
        const { creditNoteNumber, poRef, invoiceAmount, items } = cn;

        if (!poRef || !poRef.trim()) {
          ignoredBlankRef++;
          continue;
        }

        const matchedOrder = dbOrders.find(
          (o) =>
            o.type === "Return" &&
            (String(o.ref_number || "").trim().toLowerCase() === String(poRef).trim().toLowerCase() ||
             String(o.do_number || "").trim().toLowerCase() === String(poRef).trim().toLowerCase())
        );

        if (!matchedOrder) {
          noMatchCount++;
          continue;
        }

        const orderStatus = String(matchedOrder.status || "").trim().toLowerCase();
        const isCollected = orderStatus === "collected" || orderStatus === "return collected" || orderStatus === "delivered";

        if (!isCollected) {
          notCollectedCount++;
          continue;
        }

        matchedCount++;

        let finalItemsJson: string | undefined = undefined;
        let itemsRemark = "";
        if (Array.isArray(items) && items.length > 0) {
          finalItemsJson = JSON.stringify(items);
          itemsRemark = ` • Updated Items & Qty from Spreadsheet (${items.length} items)`;
        }

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
            remark: `Archived & Verified in Bulk (Credit Note: ${creditNoteNumber}, Amount: ${invoiceAmount})${itemsRemark}`,
            timestamp: Date.now()
          }
        ];

        const payloadData: any = {
          id: matchedOrder.id,
          completed: "true",
          credit_note_number: creditNoteNumber || "",
          invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
          logs: JSON.stringify(updatedLogs)
        };
        if (finalItemsJson !== undefined) {
          payloadData.items = finalItemsJson;
        }

        const payload = {
          action: "update",
          data: payloadData
        };

        await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }).catch((err) => console.error("Failed to sync bulk completed return order:", matchedOrder.id, err));

        setDbOrders((prev) =>
          prev.map((o) =>
            o.id === matchedOrder.id
              ? {
                  ...o,
                  completed: "true",
                  credit_note_number: creditNoteNumber || "",
                  invoice_amount: invoiceAmount !== undefined ? String(invoiceAmount) : "",
                  ...(finalItemsJson !== undefined ? { items: finalItemsJson } : {}),
                  logs: JSON.stringify(updatedLogs)
                }
              : o
          )
        );
      }

      showToast(
        `Bulk completion complete! ${matchedCount} collected return orders updated.${notCollectedCount > 0 ? ` (${notCollectedCount} skipped - not collected yet)` : ""}${noMatchCount > 0 ? ` (${noMatchCount} not matched)` : ""}`,
        "success"
      );
    } catch (err: any) {
      showToast(err.message || "Failed to process bulk credit notes.", "error");
    } finally {
      setCreditNoteLoading(false);
      e.target.value = "";
    }
  };

  // Download Excel Template for Credit Notes
  const handleDownloadCreditNoteTemplate = () => {
    const templateData = [
      {
        "Credit Note": "CN-2026-001",
        "Ref Number": "RET-1001",
        "Amount": 85.00,
        "Items": "SKU-ABC:2, SKU-XYZ:1"
      },
      {
        "Credit Note": "CN-2026-002",
        "Ref Number": "RET-1002",
        "Amount": 120.00,
        "Items": "SKU-DEF:3"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Credit_Note_Template");
    XLSX.writeFile(workbook, "Credit_Note_Upload_Template.xlsx");
    showToast("Downloaded Credit Note Upload Template.", "success");
  };

  // Download Excel Template for Invoices
  const handleDownloadInvoiceTemplate = () => {
    const templateData = [
      {
        "Invoice Number": "INV-2026-001",
        "Ref Number": "PO-12345",
        "Amount": 150.00,
        "Items": "SKU-ABC:2, SKU-XYZ:1"
      },
      {
        "Invoice Number": "INV-2026-002",
        "Ref Number": "PO-67890",
        "Amount": 320.50,
        "Items": "SKU-DEF:5"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoice_Template");
    XLSX.writeFile(workbook, "Invoice_Upload_Template.xlsx");
    showToast("Downloaded Invoice Upload Template.", "success");
  };

  // Download Excel Template for Delivery Orders (DO)
  const handleDownloadDoTemplate = () => {
    const templateData = [
      {
        "DO Number": "DO2026-001",
        "Ref Number": "PO-1001",
        "Address": "[S10001] FairPrice Finest Bukit Timah",
        "Poscode": "588179",
        "Method": "Company Delivery",
        "Items": "SKU-A:10, SKU-B:5"
      },
      {
        "DO Number": "DO2026-002",
        "Ref Number": "PO-1002",
        "Address": "Cold Storage Paragon #B1-01",
        "Poscode": "238859",
        "Method": "Company Delivery",
        "Items": "SKU-C:20"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DO_Template");
    XLSX.writeFile(workbook, "DO_Upload_Template.xlsx");
    showToast("Downloaded Delivery Order Upload Template.", "success");
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
      const validDrafts: TrackOrderDraft[] = [];
      const unregisteredStoreOrders: { doNumber: string; refNumber: string; storeId: string }[] = [];
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
          const rawDeliverTo = deliverToIdx !== -1 && String(row[deliverToIdx] || "").trim() ? String(row[deliverToIdx] || "").trim() : "Singapore Address";
          const rawPoscode = poscodeIdx !== -1 ? String(row[poscodeIdx] || "").trim() : "";
          const deliverMethod = methodIdx !== -1 && String(row[methodIdx] || "").trim() ? String(row[methodIdx] || "").trim() : "Company Delivery";
          const parsedItems = itemsIdx !== -1 ? parseItemsValue(row[itemsIdx]) : [];

          // Extract store_id if in format [{store_id}] or [store_id]
          let extractedStoreId = "";
          const bracketMatch = rawDeliverTo.match(/\[\{?(.*?)\}?\]/);
          if (bracketMatch && bracketMatch[1]) {
            extractedStoreId = bracketMatch[1].trim();
          }

          let finalDeliverTo = rawDeliverTo;
          let finalPoscode = rawPoscode;
          let linkStoreVal = "";
          let isUnregisteredStore = false;

          if (extractedStoreId) {
            const matchedStoreInfo = resolveStoreById(extractedStoreId);
            if (matchedStoreInfo) {
              linkStoreVal = matchedStoreInfo.storeId;
              finalDeliverTo = matchedStoreInfo.deliverTo;
              if (!finalPoscode && matchedStoreInfo.poscode) {
                finalPoscode = matchedStoreInfo.poscode;
              }
            } else {
              isUnregisteredStore = true;
              unregisteredStoreOrders.push({
                doNumber: doNum,
                refNumber: refNum,
                storeId: extractedStoreId
              });
            }
          }

          const assignedMark = getNextAvailableMark(drafts, pendingOrders, tempAssignedMarks);
          if (assignedMark) {
            tempAssignedMarks.push(assignedMark);
          }

          const newDraft: TrackOrderDraft = {
            id: `${doNum}_${refNum || "NA"}`,
            doNumber: doNum,
            refNumber: refNum,
            mark: assignedMark,
            type: "Normal",
            deliverTo: finalDeliverTo,
            poscode: finalPoscode,
            items: parsedItems,
            appointmentDate: undefined,
            appointmentTimeWindow: undefined,
            deliverMethod: deliverMethod,
            pdfImages: [],
            link_store: linkStoreVal
          };

          uniqueNewDrafts.push(newDraft);
          if (!isUnregisteredStore) {
            validDrafts.push(newDraft);
          }
        }
      }

      if (duplicates.length > 0) {
        showToast(`Warning: Order(s) ${duplicates.join(", ")} already registered in system.`, "warning");
      }

      if (unregisteredStoreOrders.length > 0) {
        setUnknownStoreInfo({
          unregisteredOrders: unregisteredStoreOrders,
          validDrafts: validDrafts,
          allDrafts: uniqueNewDrafts
        });
        setIsUnknownStoreModalOpen(true);
      } else if (uniqueNewDrafts.length > 0) {
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

  // Handle DO PDF Upload & Parsing (With Automatic Client-Side Batch Splitting: 7-8 pages per chunk)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    if (file.type !== "application/pdf") {
      showToast("Please upload a valid PDF file", "error");
      return;
    }

    setPdfLoading(true);
    setPdfLoadingText("Reading PDF pages...");
    showToast("Reading DO document for batch parsing...", "info");

    try {
      // 1. Render all page thumbnails and upload directly to Cloudflare R2
      let uploadedPageUrls: string[] = [];
      try {
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const safeBaseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
        
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d");
          
          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            setPdfLoadingText(`Uploading DO page ${i}/${pdfDoc.numPages} to storage...`);
            
            const blob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85);
            });

            if (blob) {
              const fileName = `Track_Orders/DO_Paper/${safeBaseName}_p${i}_${Date.now()}.jpg`;
              const uploadRes = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(fileName)}`, {
                method: "POST",
                headers: { "Content-Type": "image/jpeg" },
                body: blob
              });
              if (uploadRes.ok) {
                const uploadData = await uploadRes.json() as any;
                if (uploadData.success && uploadData.url) {
                  uploadedPageUrls.push(uploadData.url);
                } else {
                  uploadedPageUrls.push("");
                }
              } else {
                uploadedPageUrls.push("");
              }
            } else {
              uploadedPageUrls.push("");
            }
          } else {
            uploadedPageUrls.push("");
          }
        }
      } catch (pdfErr) {
        console.error("PDF page rendering/uploading failed:", pdfErr);
      }

      // 2. Load PDF with pdf-lib for chunk splitting (7 pages per batch)
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const totalPages = srcDoc.getPageCount();

      if (totalPages === 0) {
        throw new Error("The uploaded PDF document contains no pages.");
      }

      const CHUNK_SIZE = 7;
      const totalBatches = Math.ceil(totalPages / CHUNK_SIZE);
      const allParsedOrders: any[] = [];

      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const startPage = batchIdx * CHUNK_SIZE;
        const endPage = Math.min(startPage + CHUNK_SIZE, totalPages);

        const statusMsg = totalBatches > 1
          ? `Parsing Batch ${batchIdx + 1}/${totalBatches} (Pages ${startPage + 1}-${endPage})...`
          : `Parsing ${totalPages} pages...`;

        setPdfLoadingText(statusMsg);
        showToast(statusMsg, "info");

        // Create sub-document for this batch
        const subDoc = await PDFDocument.create();
        const pageIndices: number[] = [];
        for (let p = startPage; p < endPage; p++) {
          pageIndices.push(p);
        }
        const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
        copiedPages.forEach((p) => subDoc.addPage(p));

        const subPdfBase64 = await subDoc.saveAsBase64();

        const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/parse-do", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdf: subPdfBase64, type: "application/pdf" })
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || `Batch ${batchIdx + 1} server error status ${res.status}`);
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

        if (parsed.success && Array.isArray(parsedList)) {
          // Adjust pageNumbers in parsed items to match global page index
          const adjustedItems = parsedList.map((item: any) => {
            if (Array.isArray(item.pageNumbers)) {
              return {
                ...item,
                pageNumbers: item.pageNumbers.map((pNum: any) => {
                  const num = parseInt(pNum, 10);
                  return isNaN(num) ? pNum : num + startPage;
                })
              };
            }
            return item;
          });
          allParsedOrders.push(...adjustedItems);
        }

        // Polite sleep between batches if more batches remain
        if (batchIdx < totalBatches - 1) {
          setPdfLoadingText(`Batch ${batchIdx + 1} done. Preparing next batch...`);
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      // Group and Merge multi-page split DO orders across batches (e.g. DO item list spanning from Batch 1 into Batch 2)
      const mergedDoOrdersMap = new Map<string, any>();
      for (const item of allParsedOrders) {
        const doNum = String(item.doNumber || "").trim();
        const refNum = String(item.refNumber || "").trim();
        const key = (doNum || refNum || `temp_${Math.random()}`).toLowerCase();

        if (!mergedDoOrdersMap.has(key)) {
          mergedDoOrdersMap.set(key, {
            ...item,
            items: Array.isArray(item.items) ? [...item.items] : [],
            pageNumbers: Array.isArray(item.pageNumbers) ? [...item.pageNumbers] : []
          });
        } else {
          const existing = mergedDoOrdersMap.get(key);
          if (doNum && !existing.doNumber) existing.doNumber = doNum;
          if (refNum && !existing.refNumber) existing.refNumber = refNum;
          if (item.deliverTo && (!existing.deliverTo || existing.deliverTo === "Singapore Address")) {
            existing.deliverTo = item.deliverTo;
          }
          if (item.poscode && !existing.poscode) existing.poscode = item.poscode;
          if (item.store_id && !existing.store_id) existing.store_id = item.store_id;

          // Combine items
          if (Array.isArray(item.items) && item.items.length > 0) {
            existing.items = [...(existing.items || []), ...item.items];
          }
          // Combine page numbers
          if (Array.isArray(item.pageNumbers) && item.pageNumbers.length > 0) {
            existing.pageNumbers = Array.from(new Set([...(existing.pageNumbers || []), ...item.pageNumbers]));
          }
        }
      }

      const unifiedOrders = Array.from(mergedDoOrdersMap.values());
      console.log("[DO UPLOAD] Unified merged parsed orders:", unifiedOrders);

      if (unifiedOrders.length > 0) {
        const duplicates: string[] = [];
        const uniqueNewDrafts: TrackOrderDraft[] = [];
        const validDrafts: TrackOrderDraft[] = [];
        const unregisteredStoreOrders: { doNumber: string; refNumber: string; storeId: string }[] = [];
        const tempAssignedMarks: string[] = [];

        unifiedOrders.forEach((item: any, idx: number) => {
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
            const orderPhotoUrls = itemPageNumbers.length > 0
              ? itemPageNumbers.map((pNum: any) => uploadedPageUrls[parseInt(pNum, 10) - 1]).filter(Boolean)
              : uploadedPageUrls.filter(Boolean);

            console.log(`[DO UPLOAD] Order ${doNum} mapped R2 photo URLs count: ${orderPhotoUrls.length}`);

            // Extract store_id from parsed field or regex fallback from deliverTo/poscode
            let extractedStoreId = String(item.store_id || "").trim();
            let rawDeliverTo = String(item.deliverTo || "Singapore Address").trim();
            let rawPoscode = String(item.poscode || "").trim();

            if (!extractedStoreId) {
              const bracketMatch = rawDeliverTo.match(/\[\{?(.*?)\}?\]/);
              if (bracketMatch && bracketMatch[1]) {
                extractedStoreId = bracketMatch[1].trim();
              }
            }

            let finalDeliverTo = rawDeliverTo;
            let finalPoscode = rawPoscode;
            let linkStoreVal = "";
            let isUnregisteredStore = false;

            if (extractedStoreId) {
              const matchedStoreInfo = resolveStoreById(extractedStoreId);
              if (matchedStoreInfo) {
                linkStoreVal = matchedStoreInfo.storeId;
                finalDeliverTo = matchedStoreInfo.deliverTo;
                if (!finalPoscode && matchedStoreInfo.poscode) {
                  finalPoscode = matchedStoreInfo.poscode;
                }
              } else {
                // Store ID exists in DO but NOT in store database
                isUnregisteredStore = true;
                unregisteredStoreOrders.push({
                  doNumber: doNum,
                  refNumber: refNum,
                  storeId: extractedStoreId
                });
              }
            }

            const newDraft: TrackOrderDraft = {
              id: `${doNum}_${refNum || "NA"}`,
              doNumber: doNum,
              refNumber: refNum,
              mark: assignedMark,
              type: "Normal",
              deliverTo: finalDeliverTo,
              poscode: finalPoscode,
              items: Array.isArray(item.items) ? item.items.map((i: any) => ({
                sku: i.sku || "Unknown SKU",
                qty: Number(i.qty) || 1
              })) : [],
              appointmentDate: undefined,
              appointmentTimeWindow: undefined,
              deliverMethod: "Company Delivery",
              photo_do_paper: orderPhotoUrls.length > 0 ? JSON.stringify(orderPhotoUrls) : "",
              link_store: linkStoreVal
            };

            uniqueNewDrafts.push(newDraft);
            if (!isUnregisteredStore) {
              validDrafts.push(newDraft);
            }
          }
        });

        if (duplicates.length > 0) {
          showToast(`Warning: Order(s) ${duplicates.join(", ")} already registered in system. Please check order.`, "warning");
        }

        if (unregisteredStoreOrders.length > 0) {
          setUnknownStoreInfo({
            unregisteredOrders: unregisteredStoreOrders,
            validDrafts: validDrafts,
            allDrafts: uniqueNewDrafts
          });
          setIsUnknownStoreModalOpen(true);
        } else if (uniqueNewDrafts.length > 0) {
          const mergedDrafts = [...drafts, ...uniqueNewDrafts];
          saveDraftsToStorage(mergedDrafts);
          showToast(`Successfully read DO. Added ${uniqueNewDrafts.length} orders to drafts.`, "success");
        }
      } else {
        throw new Error("No orders could be parsed from the uploaded document.");
      }
    } catch (e: any) {
      showToast("Failed to read DO: " + e.message, "error");
    } finally {
      setPdfLoading(false);
      setPdfLoadingText("Parsing DO PDF...");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Load Saved Return Mapper Templates from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("ib_return_mapper_templates");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setReturnTemplates(parsed);
        }
      }
    } catch (_) {}
  }, []);

  // Slices crop previews directly from the visible Page 1 canvas
  const updateCropPreviews = React.useCallback((boxes?: { ref?: ReturnBoundingBox; loc?: ReturnBoundingBox; pos?: ReturnBoundingBox }) => {
    const canvas = page1CanvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;

    const bRef = boxes?.ref || returnBoxRef;
    const bLoc = boxes?.loc || returnBoxLoc;
    const bPos = boxes?.pos || returnBoxPos;

    const getSlice = (box: ReturnBoundingBox) => {
      const cx = Math.max(0, Math.floor(canvas.width * (box.x / 100)));
      const cy = Math.max(0, Math.floor(canvas.height * (box.y / 100)));
      const cw = Math.max(10, Math.min(canvas.width - cx, Math.floor(canvas.width * (box.w / 100))));
      const ch = Math.max(10, Math.min(canvas.height - cy, Math.floor(canvas.height * (box.h / 100))));

      const c = document.createElement("canvas");
      c.width = cw;
      c.height = ch;
      const ctx = c.getContext("2d");
      if (!ctx) return "";
      // CRITICAL: Fill crisp solid white background so transparent PDF areas do not become pitch black in JPEG
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
      return c.toDataURL("image/jpeg", 0.95);
    };

    setCropPreviewRef(getSlice(bRef));
    setCropPreviewLoc(getSlice(bLoc));
    setCropPreviewPos(getSlice(bPos));
  }, [returnBoxRef, returnBoxLoc, returnBoxPos]);

  // Handle Return PDF Upload & trigger modal
  const handleReturnPdfSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      showToast("Please upload a valid PDF document.", "error");
      return;
    }

    setReturnMapperPdfFile(file);
    setIsReturnVisualMapperOpen(true);
    setReturnParseProgress({ current: 0, total: 0, message: "Rendering Page 1..." });
    if (returnPdfInputRef.current) returnPdfInputRef.current.value = "";
  };

  // Render Page 1 directly onto the interactive canvas when modal opens
  React.useEffect(() => {
    if (!isReturnVisualMapperOpen || !returnMapperPdfFile) return;

    let isMounted = true;
    (async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        const arrayBuffer = await returnMapperPdfFile.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const total = pdfDoc.numPages || 1;
        setReturnMapperTotalPages(total);

        const page1 = await pdfDoc.getPage(1);
        const viewport = page1.getViewport({ scale: 1.5 });
        const canvas = page1CanvasRef.current;
        if (!canvas || !isMounted) return;

        // Render full page to offscreen buffer
        const fullCanvas = document.createElement("canvas");
        fullCanvas.width = viewport.width;
        fullCanvas.height = viewport.height;
        const fullCtx = fullCanvas.getContext("2d");
        if (!fullCtx) return;
        fullCtx.fillStyle = "#ffffff";
        fullCtx.fillRect(0, 0, fullCanvas.width, fullCanvas.height);
        await page1.render({ canvasContext: fullCtx, viewport }).promise;

        if (!isMounted) return;

        // Cut to top half (top 50% of document where header, ref, and location reside)
        const topHalfHeight = Math.floor(viewport.height * 0.5);
        canvas.width = viewport.width;
        canvas.height = topHalfHeight;
        setReturnMapperPageNaturalWidth(viewport.width);
        setReturnMapperPageNaturalHeight(topHalfHeight);

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(fullCanvas, 0, 0, viewport.width, topHalfHeight, 0, 0, viewport.width, topHalfHeight);
          updateCropPreviews();
        }
      } catch (err: any) {
        console.error("Failed to render Page 1 to canvas:", err);
        showToast("Failed to preview PDF: " + (err?.message || "Invalid PDF"), "error");
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isReturnVisualMapperOpen, returnMapperPdfFile, updateCropPreviews]);

  // Update crop previews whenever bounding boxes change (when not actively dragging)
  React.useEffect(() => {
    if (isReturnVisualMapperOpen && !dragState) {
      updateCropPreviews();
    }
  }, [isReturnVisualMapperOpen, returnBoxRef, returnBoxLoc, returnBoxPos, dragState, updateCropPreviews]);


  // Save current bounding box configuration as a named template
  const handleSaveReturnTemplate = () => {
    const name = newTemplateNameInput.trim();
    if (!name) {
      showToast("Please enter a template name (e.g. FairPrice Return).", "warning");
      return;
    }
    const newPreset: ReturnTemplatePreset = {
      id: Date.now().toString(),
      name,
      boxRef: { ...returnBoxRef },
      boxLoc: { ...returnBoxLoc },
      boxPos: { ...returnBoxPos }
    };
    const updated = [...returnTemplates.filter(t => t.name.toLowerCase() !== name.toLowerCase()), newPreset];
    setReturnTemplates(updated);
    setSelectedTemplateId(newPreset.id);
    setNewTemplateNameInput("");
    setShowSaveTemplateForm(false);
    try {
      localStorage.setItem("ib_return_mapper_templates", JSON.stringify(updated));
      showToast(`Template "${name}" saved.`, "success");
    } catch (_) {}
  };

  // Apply a saved template preset
  const handleApplyReturnTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const found = returnTemplates.find(t => t.id === templateId);
    if (found) {
      setReturnBoxRef({ ...found.boxRef });
      setReturnBoxLoc({ ...found.boxLoc });
      setReturnBoxPos({ ...found.boxPos });
      showToast(`Applied "${found.name}" mapping template.`, "info");
    }
  };

  // Delete a saved template preset
  const handleDeleteReturnTemplate = (templateId: string) => {
    const updated = returnTemplates.filter(t => t.id !== templateId);
    setReturnTemplates(updated);
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId("");
    }
    try {
      localStorage.setItem("ib_return_mapper_templates", JSON.stringify(updated));
      showToast("Template deleted.", "info");
    } catch (_) {}
  };

  // Run Batch Gemini OCR Extraction across all pages using mapped bounding boxes
  const handleRunReturnBatchExtraction = async () => {
    if (!returnMapperPdfFile) {
      showToast("No PDF document selected.", "error");
      return;
    }

    cancelExtractionRef.current = false;
    setExtractedPagesLog([]);
    setIsReturnParsing(true);
    setReturnParseProgress({
      current: 0,
      total: returnMapperTotalPages,
      message: `Starting extraction of ${returnMapperTotalPages} page(s)...`
    });

    try {
      const pdfjsLib = await loadPdfJs();
      const arrayBuffer = await returnMapperPdfFile.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdfDoc.numPages;

      const extractedDrafts: TrackOrderDraft[] = [];
      const tempAssignedMarks: string[] = [];

      // Calculate epoch deadline from returnMapperCollectDate
      let epochDeadline = 0;
      if (returnMapperCollectDate) {
        const [y, m, d] = returnMapperCollectDate.split("-").map(Number);
        if (y && m && d) {
          const dateObj = new Date(y, m - 1, d, 18, 0, 0, 0); // 6:00 PM
          epochDeadline = dateObj.getTime();
        }
      }
      if (!epochDeadline) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(18, 0, 0, 0);
        epochDeadline = tomorrow.getTime();
      }

      for (let p = 1; p <= totalPages; p++) {
        if (cancelExtractionRef.current) {
          showToast("Batch extraction stopped by user.", "info");
          break;
        }

        setReturnParseProgress({
          current: p,
          total: totalPages,
          message: `Reading & extracting Page ${p} of ${totalPages}...`
        });

        const page = await pdfDoc.getPage(p);
        // Render at high resolution (scale: 2.0) for crisp OCR reading
        const viewport = page.getViewport({ scale: 2.0 });
        const fullCanvas = document.createElement("canvas");
        fullCanvas.width = viewport.width;
        fullCanvas.height = viewport.height;
        const fullCtx = fullCanvas.getContext("2d");
        if (!fullCtx) continue;

        // Pre-fill solid white background
        fullCtx.fillStyle = "#ffffff";
        fullCtx.fillRect(0, 0, fullCanvas.width, fullCanvas.height);
        await page.render({ canvasContext: fullCtx, viewport }).promise;

        // Cut to top half (top 50%)
        const topHalfHeight = Math.floor(viewport.height * 0.5);
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = topHalfHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(fullCanvas, 0, 0, viewport.width, topHalfHeight, 0, 0, viewport.width, topHalfHeight);

        // Crop helper function
        const getCropBase64 = (box: ReturnBoundingBox) => {
          const cropX = Math.max(0, Math.floor(canvas.width * (box.x / 100)));
          const cropY = Math.max(0, Math.floor(canvas.height * (box.y / 100)));
          const cropW = Math.max(10, Math.min(canvas.width - cropX, Math.floor(canvas.width * (box.w / 100))));
          const cropH = Math.max(10, Math.min(canvas.height - cropY, Math.floor(canvas.height * (box.h / 100))));

          const cropCanvas = document.createElement("canvas");
          cropCanvas.width = cropW;
          cropCanvas.height = cropH;
          const cropCtx = cropCanvas.getContext("2d");
          if (!cropCtx) return "";
          // CRITICAL: Fill crisp solid white background before drawing
          cropCtx.fillStyle = "#ffffff";
          cropCtx.fillRect(0, 0, cropW, cropH);
          cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          return cropCanvas.toDataURL("image/jpeg", 0.92);
        };

        const refCropBase64 = getCropBase64(returnBoxRef);
        const locCropBase64 = getCropBase64(returnBoxLoc);
        const posCropBase64 = getCropBase64(returnBoxPos);

        // Call backend API
        const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/parse-return-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            crops: {
              refCropBase64,
              locationCropBase64: locCropBase64,
              poscodeCropBase64: posCropBase64
            },
            pageIndex: p
          })
        });

        if (cancelExtractionRef.current) {
          showToast("Batch extraction stopped by user.", "info");
          break;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn(`Page ${p} OCR extraction error:`, errData);
          setExtractedPagesLog(prev => [
            ...prev,
            {
              page: p,
              refNumber: "Failed",
              location: "Server Error",
              poscode: ""
            }
          ]);
          continue;
        }

        const json = await res.json();
        if (json.success && json.data) {
          const { refNumber, location, poscode } = json.data;
          const cleanRef = String(refNumber || "").trim() || `RET-P${p}-${Date.now().toString().slice(-4)}`;
          const cleanLocation = String(location || "").trim() || "Retailer Return Location";
          let cleanPoscode = String(poscode || "").trim().replace(/[^0-9]/g, "");
          if (cleanPoscode.length > 0 && cleanPoscode.length < 6) {
            cleanPoscode = cleanPoscode.padStart(6, "0");
          } else if (cleanPoscode.length > 6) {
            cleanPoscode = cleanPoscode.slice(0, 6);
          }

          // Real-time record update so user sees what was fetched
          setExtractedPagesLog(prev => [
            ...prev,
            {
              page: p,
              refNumber: cleanRef,
              location: cleanLocation,
              poscode: cleanPoscode
            }
          ]);

          // Geocode coordinates for Singapore postal code
          let lat: number | string = "";
          let lng: number | string = "";
          if (cleanPoscode && cleanPoscode.length === 6) {
            try {
              const coords = await fetchPostcodeCoordinates(cleanPoscode);
              if (coords) {
                lat = coords.lat;
                lng = coords.lng;
              }
            } catch (_) {}
          }

          // Compute next available Return Mark (e.g. RA, RB, RC...)
          const baseMark = getNextAvailableReturnMark(
            [...drafts, ...extractedDrafts],
            dbOrders
          );
          const finalMark = `R${baseMark}`;
          tempAssignedMarks.push(finalMark);

          const newDraft: TrackOrderDraft = {
            id: `${cleanRef}_${Date.now()}_${p}`,
            doNumber: cleanRef,
            refNumber: cleanRef,
            mark: finalMark,
            type: "Return",
            deliverTo: cleanLocation,
            poscode: cleanPoscode,
            items: [],
            deadline: epochDeadline,
            deliverMethod: returnMapperMethod || "Company Vehicle",
            latitude: lat,
            longitude: lng
          };

          extractedDrafts.push(newDraft);
        }
      }

      if (extractedDrafts.length > 0) {
        const mergedDrafts = [...drafts, ...extractedDrafts];
        saveDraftsToStorage(mergedDrafts);
        showToast(`Added ${extractedDrafts.length} extracted return orders to Drafts!`, "success");
        if (!cancelExtractionRef.current) {
          setIsReturnVisualMapperOpen(false);
        }
      } else {
        showToast("No return orders were extracted. Please adjust the bounding boxes and try again.", "error");
      }
    } catch (err: any) {
      console.error("Return batch extraction error:", err);
      showToast("Return extraction failed: " + (err?.message || "Unknown error"), "error");
    } finally {
      setIsReturnParsing(false);
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

        if (field === "link_store") {
          const cleanStoreId = String(value || "").trim();
          newDraft.link_store = cleanStoreId;
          if (cleanStoreId) {
            const resolved = resolveStoreById(cleanStoreId);
            if (resolved) {
              newDraft.deliverTo = resolved.deliverTo;
              if (resolved.poscode) {
                newDraft.poscode = resolved.poscode;
              }
            }
          }
        }
        
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
    const draftToDelete = drafts[index];
    if (draftToDelete) {
      deleteR2PhotoUrls(draftToDelete.photo_do_paper);
    }
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

    // Validation: check if the mark is currently active or was completed today
    const isMarkActive = isReturn
      ? dbOrders.some(
          (o) =>
            o.type === "Return" &&
            String(o.mark).toUpperCase() === order.mark.toUpperCase() &&
            (
              (o.status !== "Complete" &&
               o.status !== "Collected" &&
               o.status !== "Return Collected" &&
               String(o.completed) !== "true" &&
               o.completed !== true) ||
              isOrderDoneToday(o)
            )
        )
      : (
          pendingOrders.some(
            (o) => String(o.mark).toUpperCase() === order.mark.toUpperCase() && o.status !== "Delivered"
          ) ||
          dbOrders.some(
            (o) => String(o.mark).toUpperCase() === order.mark.toUpperCase() && o.type !== "Return" && isOrderDoneToday(o)
          )
        );

    if (isMarkActive) {
      showToast(`Cannot send. Mark "${order.mark}" is currently active or was already completed today.`, "error");
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
        photoUrl: order.photo_do_paper ? parseImageUrlList(order.photo_do_paper)[0] : undefined,
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
    const photoDoPaperUrl = order.photo_do_paper || "";

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
      photo_do_paper: photoDoPaperUrl,
      photo_do_paper_signed: "",
      photo_delivered_proof: "",
      photo_handover_proof: "",
      photo_picker_proof: "",
      link_store: order.link_store || ""
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
        } else if (!lat || !lng) {
          const fallback = getSingaporeLatLng(order.poscode);
          lat = fallback.lat;
          lng = fallback.lng;
        }
      } catch (_) {
        if (!lat || !lng) {
          const fallback = getSingaporeLatLng(order.poscode);
          lat = fallback.lat;
          lng = fallback.lng;
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
          photo_picker_proof: "",
          link_store: order.link_store || ""
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
        ref_number: order.ref_number,
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
    setEditInvoicePhotoUrl(order.photo_invoice || "");
    setEditInvoicePhotoFile(null);
    setIsEditInvoiceModalOpen(true);
  };

  const handleSaveEditInvoice = async () => {
    if (!editInvoiceOrder) return;
    setEditInvoiceUploading(true);
    let finalPhotoInvoiceUrl = editInvoicePhotoUrl;

    try {
      if (editInvoicePhotoFile) {
        showToast("Uploading invoice document...", "info");
        const ext = editInvoicePhotoFile.name.split('.').pop() || "jpg";
        const fileName = `Track_Orders/Invoice_Proof/${editInvoiceOrder.do_number}_${Date.now()}.${ext}`;
        const uploadRes = await fetch(`https://ib-v2.hsgglobalpteltd.workers.dev/api/upload?filename=${encodeURIComponent(fileName)}`, {
          method: "POST",
          headers: { "Content-Type": editInvoicePhotoFile.type || "image/jpeg" },
          body: editInvoicePhotoFile
        });
        if (!uploadRes.ok) throw new Error("Invoice photo upload failed");
        const uploadData = await uploadRes.json() as any;
        if (uploadData.success && uploadData.url) {
          finalPhotoInvoiceUrl = uploadData.url;
        }
      }

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
          photoUrl: finalPhotoInvoiceUrl || undefined,
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
                photo_invoice: finalPhotoInvoiceUrl,
                logs: JSON.stringify(updatedLogs) 
              };
            } else {
              return { 
                ...o, 
                invoice_number: editInvoiceNum.trim(),
                invoice_amount: editInvoiceAmount.trim(),
                photo_invoice: finalPhotoInvoiceUrl,
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
              ref_number: editInvoiceOrder.ref_number,
              credit_note_number: editInvoiceNum.trim(),
              invoice_amount: editInvoiceAmount.trim(),
              photo_invoice: finalPhotoInvoiceUrl,
              logs: JSON.stringify(updatedLogs)
            }
          : {
              id: editInvoiceOrder.id,
              ref_number: editInvoiceOrder.ref_number,
              invoice_number: editInvoiceNum.trim(),
              invoice_amount: editInvoiceAmount.trim(),
              photo_invoice: finalPhotoInvoiceUrl,
              logs: JSON.stringify(updatedLogs)
            }
      };

      const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        fetchDatabaseOrders(true);
      }
    } catch (err: any) {
      showToast("Update failed: " + err.message, "error");
    } finally {
      setEditInvoiceUploading(false);
    }
  };

  const handleDownloadCompiledPdf = async (order: DbOrder) => {
    try {
      showToast(`Generating compiled PDF for ${order.do_number}...`, "info");

      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      const isReturn = order.type === "Return";

      // -------------------------------------------------------------
      // PAGE 1: GDN (Goods Delivery Note) / GRN (Goods Return Note)
      // -------------------------------------------------------------

      // Top Company Header
      doc.setFillColor(11, 87, 208); // Google Blue #0B57D0
      doc.rect(margin, 12, 3.5, 16, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("HSG GLOBAL PTE. LTD.", margin + 6, 18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(11, 87, 208);
      doc.text(isReturn ? "GOODS RETURN NOTE (GRN)" : "GOODS DELIVERY NOTE (GDN)", margin + 6, 25);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${formatTimestamp(Date.now())}`, pageWidth - margin, 18, { align: "right" });
      doc.text(`Status: Completed`, pageWidth - margin, 24, { align: "right" });

      // Hairline divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, 31, pageWidth - margin, 31);

      // Metadata 2-column Card
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(margin, 34, contentWidth, 34, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, 34, contentWidth, 34, 2, 2, "S");

      // Left Column Metadata
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(isReturn ? "Return / DO No:" : "DO Number:", margin + 4, 40);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(order.do_number || "-", margin + 32, 40);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("Ref / PO No:", margin + 4, 46);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(order.ref_number || "-", margin + 32, 46);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("Store ID / Mark:", margin + 4, 52);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(`${order.link_store || "-"} ${order.mark ? `(${order.mark})` : ""}`, margin + 32, 52);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(isReturn ? "Collect From:" : "Deliver To:", margin + 4, 58);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      const addressText = doc.splitTextToSize(`${order.deliver_to || "-"} (S${order.poscode || ""})`, 65);
      doc.text(addressText, margin + 32, 58);

      // Right Column Metadata
      const rightColX = margin + contentWidth / 2 + 4;
      let deliveredTs = order.delivered_at;
      if (!deliveredTs) {
        try {
          const logsArr = typeof order.logs === "string" ? JSON.parse(order.logs) : order.logs;
          const match = logsArr?.find((l: any) => (l.action || "").toLowerCase().includes("delivered") || (l.action || "").toLowerCase().includes("completed"));
          if (match) deliveredTs = match.timestamp;
        } catch (_) {}
      }
      if (!deliveredTs) deliveredTs = order.timestamp;

      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(isReturn ? "Collected Date:" : "Delivered Date:", rightColX, 40);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(formatTimestamp(deliveredTs) || "-", rightColX + 28, 40);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(isReturn ? "Collected By:" : "Driver:", rightColX, 46);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(order.driver || "-", rightColX + 28, 46);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text("Method:", rightColX, 52);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(order.deliver_method || "Company Delivery", rightColX + 28, 52);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(isReturn ? "Credit Note:" : "Invoice No:", rightColX, 58);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(11, 87, 208);
      const invDisplay = isReturn 
        ? (order.credit_note_number || "-") 
        : (order.invoice_number || "-");
      const amtDisplay = order.invoice_amount ? ` ($${Number(order.invoice_amount).toFixed(2)})` : "";
      doc.text(`${invDisplay}${amtDisplay}`, rightColX + 28, 58);

      // Parse Items
      let parsedItems: SKUItem[] = [];
      try {
        parsedItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
        if (!Array.isArray(parsedItems)) parsedItems = [];
      } catch (_) {}

      const tableRows = parsedItems.map((item: any, i) => {
        let desc = item.description || item.name || "";
        if (!desc) {
          const product = productsDb.find((p) => p.sku === item.sku);
          if (product) {
            desc = product.display_name || product.description || product.name || product["Display Name"] || product["Description"] || "";
          }
        }
        return [
          String(i + 1),
          item.sku || "Unknown SKU",
          desc || "-",
          String(item.qty || 1)
        ];
      });

      const totalQty = parsedItems.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);

      if (tableRows.length > 0) {
        tableRows.push([
          "",
          "TOTAL QUANTITY",
          "",
          String(totalQty)
        ]);
      }

      autoTable(doc, {
        startY: 72,
        margin: { left: margin, right: margin },
        head: [[
          { content: "#", styles: { halign: "center" } },
          "SKU",
          "Description",
          { content: "Qty", styles: { halign: "center" } }
        ]],
        body: tableRows.length > 0 ? tableRows : [["-", "No SKU items recorded", "-", "-"]],
        theme: "plain",
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [30, 41, 59],
          fontSize: 8,
          fontStyle: "bold",
          cellPadding: 2.5
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85],
          cellPadding: 2.5
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 38, fontStyle: "bold" },
          2: { cellWidth: "auto" },
          3: { cellWidth: 22, halign: "center", fontStyle: "bold" }
        },
        didParseCell: (data) => {
          if (data.row.index === tableRows.length - 1 && tableRows.length > 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.textColor = [15, 23, 42];
          }
        }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 6;

      // Check Proof Photos to Embed on GDN Page
      const proofUrls: { label: string; url: string }[] = [];
      const delProofs = parseImageUrlList(order.photo_delivered_proof);
      delProofs.forEach((u, i) => proofUrls.push({ label: `Delivery Proof ${delProofs.length > 1 ? `#${i+1}` : ""}`, url: u }));

      const handProofs = parseImageUrlList(order.photo_handover_proof);
      handProofs.forEach((u, i) => proofUrls.push({ label: `Handover Proof ${handProofs.length > 1 ? `#${i+1}` : ""}`, url: u }));

      const pickProofs = parseImageUrlList(order.photo_picker_proof);
      pickProofs.forEach((u, i) => proofUrls.push({ label: `Picker Proof ${pickProofs.length > 1 ? `#${i+1}` : ""}`, url: u }));

      const retProofs = parseImageUrlList(order.photo_return_paper);
      retProofs.forEach((u, i) => proofUrls.push({ label: `Return Paper Proof ${retProofs.length > 1 ? `#${i+1}` : ""}`, url: u }));

      // If space is not enough on current page for proof photos header + boxes (~55mm), add page
      if (currentY + 55 > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }

      // Proof Photos Section Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text("DELIVERY & HANDOVER PROOF ATTACHMENTS", margin, currentY + 3);
      currentY += 6;

      if (proofUrls.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("No on-site delivery proof photos recorded for this order.", margin, currentY + 4);
        currentY += 10;
      } else {
        const photoWidth = 55;
        const photoHeight = 42;
        const gap = 6;
        let startX = margin;

        for (let i = 0; i < Math.min(proofUrls.length, 6); i++) {
          const item = proofUrls[i];
          if (startX + photoWidth > pageWidth - margin) {
            startX = margin;
            currentY += photoHeight + 10;
            if (currentY + photoHeight + 10 > pageHeight - margin) {
              doc.addPage();
              currentY = margin;
            }
          }

          // Container Box
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(startX, currentY, photoWidth, photoHeight + 6, 1.5, 1.5, "F");
          doc.setDrawColor(226, 232, 240);
          doc.roundedRect(startX, currentY, photoWidth, photoHeight + 6, 1.5, 1.5, "S");

          // Label
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(71, 85, 105);
          doc.text(item.label, startX + 2, currentY + 4);

          // Try loading Base64 image
          const base64 = await loadImageBase64(item.url);
          if (base64) {
            try {
              doc.addImage(base64, "JPEG", startX + 2, currentY + 5.5, photoWidth - 4, photoHeight - 2, undefined, "FAST");
            } catch (_) {}
          }

          startX += photoWidth + gap;
        }
        currentY += photoHeight + 10;
      }

      // -------------------------------------------------------------
      // PAGE 2+: DO (Delivery Order) Signed / Original Paper
      // -------------------------------------------------------------
      const doPaperList = [
        ...parseImageUrlList(order.photo_do_paper_signed),
        ...parseImageUrlList(order.photo_do_paper)
      ];

      const uniqueDoPapers = Array.from(new Set(doPaperList));

      if (uniqueDoPapers.length > 0) {
        for (let idx = 0; idx < uniqueDoPapers.length; idx++) {
          const doImgUrl = uniqueDoPapers[idx];
          doc.addPage();

          if (idx === 0) {
            // Header on Signed Proof Paper page
            doc.setFillColor(11, 87, 208);
            doc.rect(margin, 12, 3, 10, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text("Signed Proof Paper", margin + 5, 18);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`DO No: ${order.do_number} | Ref: ${order.ref_number || "-"}`, pageWidth - margin, 18, { align: "right" });

            doc.setDrawColor(226, 232, 240);
            doc.line(margin, 24, pageWidth - margin, 24);

            const doBase64 = await loadImageBase64(doImgUrl);
            if (doBase64) {
              try {
                const imgAreaWidth = contentWidth;
                const imgAreaHeight = pageHeight - 34 - margin;
                doc.addImage(doBase64, "JPEG", margin, 28, imgAreaWidth, imgAreaHeight, undefined, "FAST");
              } catch (_) {}
            }
          } else {
            // Subsequent DO attachment pages - display full document without title
            const doBase64 = await loadImageBase64(doImgUrl);
            if (doBase64) {
              try {
                const imgAreaWidth = contentWidth;
                const imgAreaHeight = pageHeight - 2 * margin - 8;
                doc.addImage(doBase64, "JPEG", margin, margin, imgAreaWidth, imgAreaHeight, undefined, "FAST");
              } catch (_) {}
            }
          }
        }
      }

      // -------------------------------------------------------------
      // PAGE 3+: INVOICE / CREDIT NOTE Attachment
      // -------------------------------------------------------------
      const invoiceImgList = [
        ...parseImageUrlList(order.photo_invoice),
        ...(isReturn ? parseImageUrlList(order.photo_return_paper_admin) : [])
      ];
      const uniqueInvoicePapers = Array.from(new Set(invoiceImgList));

      if (uniqueInvoicePapers.length > 0) {
        for (let idx = 0; idx < uniqueInvoicePapers.length; idx++) {
          const invImgUrl = uniqueInvoicePapers[idx];
          doc.addPage();

          // Full document without title Billing Invoice Attachment
          const invBase64 = await loadImageBase64(invImgUrl);
          if (invBase64) {
            try {
              const imgAreaWidth = contentWidth;
              const imgAreaHeight = pageHeight - 2 * margin - 8;
              doc.addImage(invBase64, "JPEG", margin, margin, imgAreaWidth, imgAreaHeight, undefined, "FAST");
            } catch (_) {}
          }
        }
      } else {
        // Render Clean Invoice Summary page if no invoice photo uploaded
        doc.addPage();
        doc.setFillColor(11, 87, 208);
        doc.rect(margin, 12, 3, 10, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(isReturn ? `CREDIT NOTE (CN) - SUMMARY` : `BILLING INVOICE - SUMMARY`, margin + 5, 18);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const invNo = isReturn ? (order.credit_note_number || "-") : (order.invoice_number || "-");
        doc.text(`Invoice No: ${invNo}`, pageWidth - margin, 18, { align: "right" });

        doc.setDrawColor(226, 232, 240);
        doc.line(margin, 24, pageWidth - margin, 24);

        // Invoice Card
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, 30, contentWidth, 50, 2, 2, "F");
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, 30, contentWidth, 50, 2, 2, "S");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text("Invoice Breakdown Details", margin + 6, 38);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(isReturn ? "Credit Note No:" : "Invoice Number:", margin + 6, 46);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(11, 87, 208);
        doc.text(invNo, margin + 40, 46);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("Total Invoice Amount:", margin + 6, 54);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(order.invoice_amount ? `$${Number(order.invoice_amount).toFixed(2)}` : "$0.00", margin + 40, 54);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("Associated Order:", margin + 6, 62);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(`${order.do_number} (${order.ref_number || "No Ref"})`, margin + 40, 62);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("Billed To Store / Address:", margin + 6, 70);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(`${order.deliver_to} (S${order.poscode})`, margin + 40, 70);

        // Footer note
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("* Note: Official digital record verified and completed by HSG Logistics Administrator.", margin, 92);
      }

      // Add Page Numbers on all pages
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
        doc.text(`HSG Global Pte Ltd • ${order.do_number}`, margin, pageHeight - 8);
      }

      // Download PDF blob
      const safeDo = (order.do_number || "ORDER").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeRef = (order.ref_number || "NA").replace(/[^a-zA-Z0-9_-]/g, "_");
      doc.save(`GDN_${safeDo}_${safeRef}.pdf`);
      showToast(`Downloaded GDN_${safeDo}_${safeRef}.pdf`, "success");
    } catch (err: any) {
      console.error("Failed to generate compiled PDF:", err);
      showToast("Failed to generate PDF: " + (err.message || "Unknown error"), "error");
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

      if (newStatus === "Delivered" || newStatus === "Collected" || newStatus === "Return Collected") {
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

  const selectedPendingCount = React.useMemo(() => {
    return Object.values(selectedPendingOrderIds).filter(Boolean).length;
  }, [selectedPendingOrderIds]);

  const isAllPendingSelected = React.useMemo(() => {
    if (sortedPendingOrders.length === 0) return false;
    return sortedPendingOrders.every((o) => !!selectedPendingOrderIds[o.id]);
  }, [sortedPendingOrders, selectedPendingOrderIds]);

  const toggleSelectPendingOrder = (id: string) => {
    setSelectedPendingOrderIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleSelectAllPendingOrders = () => {
    if (isAllPendingSelected) {
      setSelectedPendingOrderIds({});
    } else {
      const updated: Record<string, boolean> = {};
      sortedPendingOrders.forEach((o) => {
        updated[o.id] = true;
      });
      setSelectedPendingOrderIds(updated);
    }
  };

  const handleBulkUpdateDeliveryMethod = async (newMethod: string) => {
    const selectedIds = Object.keys(selectedPendingOrderIds).filter((id) => selectedPendingOrderIds[id]);
    if (selectedIds.length === 0) {
      showToast("Please select at least one pending order.", "error");
      return;
    }
    if (!newMethod) {
      showToast("Please select a delivery method.", "error");
      return;
    }

    setIsBulkUpdatingMethod(true);
    showToast(`Updating delivery method for ${selectedIds.length} orders...`, "info");

    const previousDbOrders = [...dbOrders];
    const now = Date.now();

    // Optimistic UI Update
    setDbOrders((prev) =>
      prev.map((order) => {
        if (selectedIds.includes(order.id)) {
          let currentLogs: LogEntry[] = [];
          try {
            currentLogs = typeof order.logs === "string" ? JSON.parse(order.logs || "[]") : order.logs || [];
          } catch (_) {}
          if (!Array.isArray(currentLogs)) currentLogs = [];

          const updatedLogs: LogEntry[] = [
            ...currentLogs,
            {
              action: "Method Edited by Admin",
              actionBy: currentUser,
              remark: `Method updated to "${newMethod}" (Bulk update)`,
              timestamp: now
            }
          ];

          return {
            ...order,
            deliver_method: newMethod,
            logs: JSON.stringify(updatedLogs)
          };
        }
        return order;
      })
    );

    setSelectedPendingOrderIds({});

    try {
      const updatePromises = selectedIds.map(async (id) => {
        const order = previousDbOrders.find((o) => o.id === id);
        let currentLogs: LogEntry[] = [];
        try {
          currentLogs = typeof order?.logs === "string" ? JSON.parse(order.logs || "[]") : order?.logs || [];
        } catch (_) {}
        if (!Array.isArray(currentLogs)) currentLogs = [];

        const updatedLogs: LogEntry[] = [
          ...currentLogs,
          {
            action: "Method Edited by Admin",
            actionBy: currentUser,
            remark: `Method updated to "${newMethod}" (Bulk update)`,
            timestamp: now
          }
        ];

        const payload = {
          table: "Track_Orders",
          action: "update",
          id: id,
          data: {
            id: id,
            deliver_method: newMethod,
            logs: JSON.stringify(updatedLogs)
          }
        };

        const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const json = (await res.json()) as any;
        if (!json.success) throw new Error(json.error || "Update failed");
      });

      await Promise.all(updatePromises);
      showToast(`Successfully updated delivery method to "${newMethod}" for ${selectedIds.length} orders.`, "success");
      fetchDatabaseOrders(true);
    } catch (err: any) {
      console.error("Bulk update deliver method error:", err);
      setDbOrders(previousDbOrders);
      showToast(`Failed to update delivery method: ${err.message}`, "error");
    } finally {
      setIsBulkUpdatingMethod(false);
    }
  };

  const handleBulkUpdateStatus = async (newStatusToSet: string) => {
    const selectedIds = Object.keys(selectedPendingOrderIds).filter((id) => selectedPendingOrderIds[id]);
    if (selectedIds.length === 0) {
      showToast("Please select at least one pending order.", "error");
      return;
    }
    if (!newStatusToSet) {
      showToast("Please select a status to overwrite.", "error");
      return;
    }

    setIsBulkUpdatingStatus(true);
    showToast(`Overwriting status for ${selectedIds.length} orders to "${newStatusToSet}"...`, "info");

    const previousDbOrders = [...dbOrders];
    const now = Date.now();

    // Optimistic UI Update
    setDbOrders((prev) =>
      prev.map((order) => {
        if (selectedIds.includes(order.id)) {
          let currentLogs: LogEntry[] = [];
          try {
            currentLogs = typeof order.logs === "string" ? JSON.parse(order.logs || "[]") : order.logs || [];
          } catch (_) {}
          if (!Array.isArray(currentLogs)) currentLogs = [];

          const updatedLogs: LogEntry[] = [
            ...currentLogs,
            {
              action: `Status Overwritten: ${newStatusToSet}`,
              actionBy: currentUser,
              remark: `Status overwritten to "${newStatusToSet}" (Bulk overwrite by Admin)`,
              timestamp: now
            }
          ];

          const updatedOrder: DbOrder = {
            ...order,
            status: newStatusToSet,
            logs: JSON.stringify(updatedLogs)
          };

          if (newStatusToSet === "Delivered" || newStatusToSet === "Collected" || newStatusToSet === "Return Collected") {
            updatedOrder.delivered_at = now;
          }

          return updatedOrder;
        }
        return order;
      })
    );

    setSelectedPendingOrderIds({});

    try {
      const updatePromises = selectedIds.map(async (id) => {
        const order = previousDbOrders.find((o) => o.id === id);
        let currentLogs: LogEntry[] = [];
        try {
          currentLogs = typeof order?.logs === "string" ? JSON.parse(order.logs || "[]") : order?.logs || [];
        } catch (_) {}
        if (!Array.isArray(currentLogs)) currentLogs = [];

        const updatedLogs: LogEntry[] = [
          ...currentLogs,
          {
            action: `Status Overwritten: ${newStatusToSet}`,
            actionBy: currentUser,
            remark: `Status overwritten to "${newStatusToSet}" (Bulk overwrite by Admin)`,
            timestamp: now
          }
        ];

        const payloadData: Partial<DbOrder> = {
          id: id,
          status: newStatusToSet,
          logs: JSON.stringify(updatedLogs)
        };

        if (newStatusToSet === "Delivered" || newStatusToSet === "Collected" || newStatusToSet === "Return Collected") {
          payloadData.delivered_at = now;
        }

        const payload = {
          table: "Track_Orders",
          action: "update",
          id: id,
          data: payloadData
        };

        const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const json = (await res.json()) as any;
        if (!json.success) throw new Error(json.error || "Update failed");
      });

      await Promise.all(updatePromises);
      showToast(`Successfully overwritten status to "${newStatusToSet}" for ${selectedIds.length} orders.`, "success");
      fetchDatabaseOrders(true);
    } catch (err: any) {
      console.error("Bulk update status error:", err);
      setDbOrders(previousDbOrders);
      showToast(`Failed to overwrite status: ${err.message}`, "error");
    } finally {
      setIsBulkUpdatingStatus(false);
    }
  };

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
            action: "Job Closed: Reverted to Ready to Deliver",
            actionBy: currentUser,
            remark: `Admin closed job ${forceCloseDriverJob.id}. Reverted status from Out for Delivery to Ready to Deliver.`,
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

      showToast(`Job closed for ${forceCloseDriverJob.driver}`, "success");
      setIsForceCloseModalOpen(false);
      setForceCloseDriverJob(null);

      // Refresh both
      fetchDriverLogs();
      fetchDatabaseOrders(true);
    } catch (err: any) {
      console.error("Force close job error:", err);
      showToast("Error closing job: " + err.message, "error");
    } finally {
      setForceCloseLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      
      {/* 1. Top Navigation Tabs connected to breadcrumb */}
      <NavigationTabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabSelect={setActiveTab}
      />

      {/* 2. Top Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            {activeTab === "dashboard"
              ? "Live Tracking"
              : activeTab === "delivery"
              ? "Deliver Order"
              : activeTab === "return"
              ? "Return Order"
              : "Create Order"}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {activeTab === "dashboard"
              ? "Real-time dispatch route visualization and live driver job monitoring."
              : activeTab === "delivery"
              ? "Manage delivery orders, invoices, and completed deliveries."
              : activeTab === "return"
              ? "Manage return orders, credit notes, and collection status."
              : createOrderSubView === "dispatch"
              ? "Group undelivered orders by zone, generate 5-letter job claim tokens and loading sheet paperwork."
              : "Import DO orders from PDF / Excel sheets or draft manual order records."}
          </p>
        </div>

        {/* Top Right Badges for Live Tracking / Delivery / Return */}
        {activeTab === "dashboard" && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded text-zinc-700 shadow-2xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#0B57D0]" />
              <span className="text-zinc-500 font-medium">Pending Delivery:</span>
              <span className="font-bold text-zinc-950">{pendingOrders.filter((o) => o.status !== "Delivered").length}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded text-zinc-700 shadow-2xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#C5221F]" />
              <span className="text-zinc-500 font-medium">Pending Return:</span>
              <span className="font-bold text-zinc-950">{dbOrders.filter((o) => o.type === "Return" && String(o.completed) !== "true" && o.completed !== true && o.status !== "Collected" && o.status !== "Return Collected").length}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded text-zinc-700 shadow-2xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#137333]" />
              <span className="text-zinc-500 font-medium">Task Done:</span>
              <span className="font-bold text-zinc-950">{tasksDoneToday}</span>
            </div>
          </div>
        )}

        {activeTab === "delivery" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-zinc-700">
              {activeDeliveryTab === "pending" ? sortedPendingOrders.length : sortedCompletedOrders.length} {activeDeliveryTab === "pending" ? "Pending" : "Completed"} Orders
            </span>
          </div>
        )}

        {activeTab === "return" && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-zinc-700">
              {sortedReturnOrders.length} {activeReturnTab === "pending" ? "Pending" : "Completed"} Returns
            </span>
          </div>
        )}

        {/* Header Action Buttons & Sub-view Switcher for Create Tab */}
        {activeTab === "create" && (
          <div className="flex items-center gap-3">
            {/* Context Actions for Drafts / Job Dispatch on the left */}
            {createOrderSubView === "drafts" ? (
              <div className="flex items-center gap-2">
                {/* 1. Import Order */}
                <CustomButton 
                  variant="default"
                  onClick={() => {
                    if (!pdfLoading) setIsDoUploadChoiceOpen(true);
                  }}
                  disabled={pdfLoading}
                  className="text-xs font-semibold"
                >
                  {pdfLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{pdfLoadingText}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Import Order</span>
                    </>
                  )}
                </CustomButton>

                {/* 2. Create Order */}
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
                  className="text-xs font-semibold"
                >
                  <Plus size={14} />
                  <span>Create Order</span>
                </CustomButton>

                {/* 3. Import Return */}
                <CustomButton 
                  variant="default"
                  onClick={() => {
                    returnPdfInputRef.current?.click();
                  }}
                  disabled={isReturnParsing}
                  className="text-xs font-semibold"
                >
                  {isReturnParsing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{returnParseProgress.message || "Importing Return..."}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Import Return</span>
                    </>
                  )}
                </CustomButton>

                {/* 4. Create Return */}
                <CustomButton 
                  variant="default"
                  onClick={openCreateReturnPanel}
                  className="text-xs font-semibold"
                >
                  <Plus size={14} />
                  <span>Create Return</span>
                </CustomButton>
              </div>
            ) : (
              /* Context Controls for Job Dispatch */
              <div className="flex items-center gap-2">
                {jobSubView === "create" && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-[#0B57D0]">
                    {Object.values(selectedJobOrderIds).filter(Boolean).length} Orders Selected
                  </span>
                )}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setJobSubView("create")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      jobSubView === "create"
                        ? "bg-[#0B57D0] text-white shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <Layers size={13} />
                    <span>Dispatch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setJobSubView("history");
                      fetchJobHistory();
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      jobSubView === "history"
                        ? "bg-[#0B57D0] text-white shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <History size={13} />
                    <span>Job History</span>
                    {jobHistoryList.filter((j) => j.status === "OPEN").length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                        {jobHistoryList.filter((j) => j.status === "OPEN").length}
                      </span>
                    )}
                  </button>
                </div>
                {jobSubView === "history" && (
                  <button
                    type="button"
                    onClick={fetchJobHistory}
                    disabled={jobHistoryLoading}
                    className="p-1 rounded-md border border-slate-200 text-zinc-600 hover:bg-slate-100 text-xs flex items-center gap-1 cursor-pointer font-semibold shadow-2xs"
                    title="Refresh Job History"
                  >
                    <RefreshCw size={13} className={jobHistoryLoading ? "animate-spin" : ""} />
                  </button>
                )}
              </div>
            )}

            {/* Hairline Divider */}
            <div className="h-5 w-px bg-slate-200" />

            {/* Sub-view switcher at the VERY END RIGHT */}
            <div className="inline-flex items-center p-1 bg-slate-50 border border-slate-200 rounded-lg shadow-2xs">
              <button
                type="button"
                onClick={() => setCreateOrderSubView("drafts")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  createOrderSubView === "drafts"
                    ? "bg-white text-zinc-950 font-bold border border-slate-200/90 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-slate-100"
                }`}
              >
                <FileText size={13} className={createOrderSubView === "drafts" ? "text-[#0B57D0]" : "text-zinc-400"} />
                <span>Draft Orders</span>
                {drafts.length > 0 && (
                  <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    createOrderSubView === "drafts" ? "bg-blue-50 text-[#0B57D0] border border-blue-200" : "bg-slate-200 text-zinc-600"
                  }`}>
                    {drafts.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateOrderSubView("dispatch");
                  fetchJobHistory();
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  createOrderSubView === "dispatch"
                    ? "bg-white text-zinc-950 font-bold border border-slate-200/90 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-slate-100"
                }`}
              >
                <Layers size={13} className={createOrderSubView === "dispatch" ? "text-[#0B57D0]" : "text-zinc-400"} />
                <span>Job Dispatch</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 w-full flex flex-col p-4 min-h-0 overflow-hidden bg-[#F8F9FA]/40">
        {/* TAB CONTENT: LIVE TRACKING (Formerly Dashboard) */}
        {activeTab === "dashboard" && (
          <div className="flex-1 flex flex-col gap-4 animate-tableFadeInOnly min-h-0 overflow-hidden">
            {/* Live Tracking Sub-tabs Switch Header & Search Bar */}
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

              {/* Search Bar for Track Location */}
              {activeLiveTrackingSubTab === "location" && (
                <div className="flex items-center gap-2">
                  <div className="relative w-72">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search mark, ID, ref, address, driver, poscode..."
                      value={mapSearchQuery}
                      onChange={(e) => setMapSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded text-xs text-zinc-800 placeholder:text-zinc-400 focus:outline-hidden focus:border-[#0B57D0] shadow-2xs transition-all"
                    />
                    {mapSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setMapSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xs cursor-pointer"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SUB-VIEW 1: TRACK LOCATION */}
            {activeLiveTrackingSubTab === "location" && (
              <div className="flex-1 flex flex-col min-h-0 animate-tableFadeInOnly">
                {/* Full Width & Height Map Container */}
                <div className="flex-1 w-full min-h-0 rounded border border-slate-200 overflow-hidden relative shadow-2xs bg-white">
                  {/* Map Filter Toggle Button Overlay */}
                  <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 rounded shadow-sm p-1 flex gap-1 items-center">
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

                  <div id="leaflet-map" className="w-full h-full z-10 bg-white" />
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
              <div className="flex-1 flex flex-col min-h-0 animate-tableFadeInOnly overflow-hidden">
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

                  {/* Period Filter Buttons & Search Bar for Track Driver */}
                  <div className="flex flex-wrap items-center gap-2">
                    {activeDriverLogSubTab === "closed" && (
                      <div className="flex items-center gap-1 bg-[#F1F3F4] p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setDriverLogPeriodFilter("week")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            driverLogPeriodFilter === "week"
                              ? "bg-white text-[#0B57D0] shadow-xs"
                              : "text-zinc-600 hover:text-zinc-950 hover:bg-slate-200/50"
                          }`}
                        >
                          This Week
                        </button>
                        <button
                          type="button"
                          onClick={() => setDriverLogPeriodFilter("month")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            driverLogPeriodFilter === "month"
                              ? "bg-white text-[#0B57D0] shadow-xs"
                              : "text-zinc-600 hover:text-zinc-950 hover:bg-slate-200/50"
                          }`}
                        >
                          This Month
                        </button>
                        <button
                          type="button"
                          onClick={() => setDriverLogPeriodFilter("all")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            driverLogPeriodFilter === "all"
                              ? "bg-white text-[#0B57D0] shadow-xs"
                              : "text-zinc-600 hover:text-zinc-950 hover:bg-slate-200/50"
                          }`}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          onClick={() => setDriverLogPeriodFilter("custom")}
                          className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                            driverLogPeriodFilter === "custom"
                              ? "bg-white text-[#0B57D0] shadow-xs"
                              : "text-zinc-600 hover:text-zinc-950 hover:bg-slate-200/50"
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                    )}

                    {/* Custom Date Range inputs when Custom is active */}
                    {activeDriverLogSubTab === "closed" && driverLogPeriodFilter === "custom" && (
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-2xs">
                        <Calendar size={13} className="text-zinc-400 shrink-0" />
                        <input
                          type="date"
                          value={driverLogStartDate}
                          onChange={(e) => setDriverLogStartDate(e.target.value)}
                          className="text-xs text-zinc-700 font-medium focus:outline-none bg-transparent"
                          title="Start Date"
                        />
                        <span className="text-xs text-zinc-400 font-bold">to</span>
                        <input
                          type="date"
                          value={driverLogEndDate}
                          onChange={(e) => setDriverLogEndDate(e.target.value)}
                          className="text-xs text-zinc-700 font-medium focus:outline-none bg-transparent"
                          title="End Date"
                        />
                        {(driverLogStartDate || driverLogEndDate) && (
                          <button
                            type="button"
                            onClick={() => {
                              setDriverLogStartDate("");
                              setDriverLogEndDate("");
                            }}
                            className="text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer ml-0.5"
                            title="Clear Range"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="relative w-full sm:w-64">
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
                </div>

                {/* ONLINE DRIVERS VIEW (3 Column Grid of Cards) */}
                {activeDriverLogSubTab === "online" && (
                  <div className="flex-1 w-full min-h-0 overflow-y-auto pr-1">
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
                                        Job ID: {driverJob.id}
                                      </span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setForceCloseDriverJob(driverJob);
                                      setIsForceCloseModalOpen(true);
                                    }}
                                    title="End Driver Job"
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
                                    ℹ️ Outsource: {parseOutsourceDriverDetails(driverJob.outsource_driver_details).formatted || driverJob.outsource_driver_details}
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

                                          {/* Proof Photos (Signed DO, Supporting Images, Order Proofs) */}
                                          {(() => {
                                            const allPhotos: { url: string; label: string }[] = [];
                                            if (logEntry.signed_paper_img) {
                                              allPhotos.push({ url: logEntry.signed_paper_img, label: "Signed DO" });
                                            }
                                            if (Array.isArray(logEntry.supporting_images)) {
                                              logEntry.supporting_images.forEach((img, sIdx) => {
                                                if (img && typeof img === "string") {
                                                  allPhotos.push({ url: img, label: `Photo #${sIdx + 1}` });
                                                }
                                              });
                                            }
                                            if (matchedOrder) {
                                              const orderProofs = [
                                                ...getLogImagesForAction("delivered", matchedOrder),
                                                ...getLogImagesForAction("handover", matchedOrder),
                                                ...getLogImagesForAction("signed", matchedOrder)
                                              ];
                                              for (const p of orderProofs) {
                                                if (p && !allPhotos.some((ap) => ap.url === p)) {
                                                  allPhotos.push({ url: p, label: "Delivery Proof" });
                                                }
                                              }
                                            }

                                            if (allPhotos.length === 0) return null;

                                            return (
                                              <div className="mt-2 flex flex-col gap-1.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  {allPhotos.map((photo, pIdx) => (
                                                    <div
                                                      key={`online-photo-${pIdx}`}
                                                      onClick={() => setActiveLightboxImage(photo.url)}
                                                      className="group relative w-12 h-12 rounded border border-emerald-300 overflow-hidden cursor-pointer hover:border-emerald-500 hover:shadow-xs transition-all bg-white flex-shrink-0"
                                                      title={`Click to view ${photo.label} full screen`}
                                                    >
                                                      <img
                                                        src={photo.url}
                                                        alt={photo.label}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                      />
                                                    </div>
                                                  ))}
                                                </div>
                                                <span className="text-[10px] text-emerald-700 font-semibold">
                                                  📸 {allPhotos.length} Delivery Photo{allPhotos.length > 1 ? "s" : ""} Attached
                                                </span>
                                              </div>
                                            );
                                          })()}

                                          {/* Discrepancy / Issues Callout */}
                                          {hasDiscrepancies && (
                                            <div className="mt-1.5 bg-amber-50 border border-amber-300 rounded p-1.5 text-[10px] flex flex-col gap-0.5">
                                              <div className="flex items-center gap-1 font-bold text-amber-900">
                                                <AlertTriangle size={11} className="text-amber-600 flex-shrink-0" />
                                                <span>Reported Issues / Remarks:</span>
                                              </div>
                                              {logEntry.discrepancies?.map((d, dIdx) => (
                                                <div key={dIdx} className="text-amber-800 pl-2">
                                                  • {d.sku}: Ordered {d.qty_ordered}, Delivered {d.qty_delivered}
                                                  {d.remark && ` (Note: ${d.remark})`}
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
                  <div className="flex-1 w-full min-h-0 relative overflow-hidden">
                    {closedDriverJobs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full bg-[#F0F4F9]/40 border border-dashed border-slate-200 rounded select-none">
                        <ClipboardCheck size={40} className="text-zinc-400 mb-3" />
                        <span className="font-primary text-sm text-zinc-500 font-medium">
                          No closed driver jobs recorded yet.
                        </span>
                      </div>
                    ) : (
                      <div className="h-full overflow-auto border border-slate-200 rounded bg-white">
                        <table className="w-full text-left font-primary text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-zinc-600 font-semibold border-b border-slate-200 h-10 text-[11px]">
                              <th className="sticky top-0 bg-slate-50 p-2.5 w-14 text-center align-middle z-10">Route Log</th>
                              <th className="sticky top-0 bg-slate-50 p-2.5 min-w-[200px] align-middle z-10">Driver Details</th>
                              <th className="sticky top-0 bg-slate-50 p-2.5 w-36 align-middle z-10">Job Started</th>
                              <th className="sticky top-0 bg-slate-50 p-2.5 w-36 align-middle z-10">Job Ended</th>
                              <th className="sticky top-0 bg-slate-50 p-2.5 w-24 align-middle z-10">Duration</th>
                              <th className="sticky top-0 bg-slate-50 p-2.5 w-24 text-center align-middle z-10">Stops</th>
                              <th className="sticky top-0 bg-slate-50 p-2.5 w-28 align-middle z-10">Discrepancies</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {closedDriverJobs.map((record, idx) => {
                              const logs = parseDriverCompletedLogs(record.driver_logs);
                              const totalIssues = logs.reduce(
                                (acc, curr) => acc + (curr.discrepancies ? curr.discrepancies.length : 0),
                                0
                              );
                              const outsourceParsed = parseOutsourceDriverDetails(record.outsource_driver_details);

                              return (
                                <tr
                                  key={record.id}
                                  className={`transition-all h-12 ${
                                    idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F8F9FA]"
                                  } hover:bg-slate-50`}
                                >
                                  <td className="p-2.5 w-14 text-center align-middle border-b border-zinc-200">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedRouteLogRecord(record);
                                        setIsRouteLogModalOpen(true);
                                      }}
                                      title="View Complete Route Timeline Log"
                                      className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded border border-[#0B57D0]/30 bg-[#0B57D0]/5 hover:bg-[#0B57D0] text-[#0B57D0] hover:text-white cursor-pointer transition-all outline-none mx-auto shadow-2xs"
                                    >
                                      <Route size={13} />
                                    </button>
                                  </td>
                                  <td className="p-2.5 min-w-[200px] align-middle border-b border-zinc-200">
                                    <div className="text-zinc-900 font-medium text-xs flex items-center gap-1.5 flex-wrap">
                                      <span>
                                        {outsourceParsed.formatted || record.driver || "—"}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                      {record.id}
                                    </div>
                                  </td>
                                  <td className="p-2.5 w-36 text-zinc-600 align-middle border-b border-zinc-200 text-xs">
                                    {formatTimestamp(record.start_time)}
                                  </td>
                                  <td className="p-2.5 w-36 text-zinc-600 align-middle border-b border-zinc-200 text-xs">
                                    {formatTimestamp(record.end_time)}
                                  </td>
                                  <td className="p-2.5 w-24 text-zinc-600 align-middle border-b border-zinc-200 text-xs">
                                    {formatShiftDuration(record.start_time, record.end_time)}
                                  </td>
                                  <td className="p-2.5 w-24 text-center align-middle border-b border-zinc-200">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-xs">
                                      <Check size={10} strokeWidth={2.5} />
                                      {logs.length}
                                    </span>
                                  </td>
                                  <td className="p-2.5 w-28 align-middle border-b border-zinc-200">
                                    {totalIssues > 0 ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[10px]">
                                        <AlertTriangle size={10} className="text-amber-600" />
                                        {totalIssues} Issue{totalIssues > 1 ? "s" : ""}
                                      </span>
                                    ) : (
                                      <span className="text-zinc-400 font-normal text-[10px]">
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
        <div className="flex-1 flex flex-col gap-4 animate-tableFadeInOnly min-h-0 overflow-hidden">
          {/* Sub-tabs switch header & Filter / Search Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1 border-b border-slate-200 pb-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveDeliveryTab("pending");
                  setSelectedPendingOrderIds({});
                }}
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
                onClick={() => {
                  setActiveDeliveryTab("complete");
                  setSelectedPendingOrderIds({});
                }}
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
                disabled={invoiceLoading}
                className={`ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white rounded text-xs font-bold cursor-pointer transition-all ${
                  invoiceLoading ? "opacity-80 cursor-not-allowed" : ""
                }`}
              >
                {invoiceLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>{invoiceLoadingText}</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Bulk Invoices Upload</span>
                  </>
                )}
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

              <div className="relative w-full sm:w-72">
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
            </div>
          </div>

          {activeDeliveryTab === "pending" ? (
            <div className="flex-1 w-full min-h-0 relative overflow-hidden flex flex-col gap-2">
              {/* Bulk Actions Bar for Selected Pending Orders */}
              {selectedPendingCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-blue-50/90 border border-blue-200 rounded-lg shadow-2xs text-xs animate-tableFadeInOnly shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-[#0B57D0] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#0B57D0]" />
                      {selectedPendingCount} order{selectedPendingCount > 1 ? "s" : ""} selected
                    </span>
                    <span className="text-zinc-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPendingOrderIds({})}
                      className="text-zinc-500 hover:text-zinc-900 underline cursor-pointer"
                    >
                      Deselect all
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Bulk Change Method */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-700">Method:</span>
                      <select
                        value={bulkDeliveryMethod}
                        onChange={(e) => setBulkDeliveryMethod(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0] cursor-pointer shadow-2xs"
                      >
                        <option value="Company Delivery">Company Delivery</option>
                        <option value="External Delivery">External Delivery</option>
                        <option value="Warehouse Pickup">Warehouse Pickup</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleBulkUpdateDeliveryMethod(bulkDeliveryMethod)}
                        disabled={isBulkUpdatingMethod || isBulkUpdatingStatus}
                        className="flex items-center gap-1 px-2.5 py-1 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold rounded shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        title="Apply delivery method to all selected orders"
                      >
                        {isBulkUpdatingMethod ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <Check size={12} strokeWidth={2.5} />
                            <span>Apply Method</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="h-4 w-px bg-blue-200 hidden md:block" />

                    {/* Bulk Overwrite Status */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-zinc-700">Status:</span>
                      <select
                        value={bulkStatus}
                        onChange={(e) => setBulkStatus(e.target.value)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0] cursor-pointer shadow-2xs"
                      >
                        <option value="Ready to Pick">Ready to Pick</option>
                        <option value="Picking">Picking</option>
                        <option value="Ready to Deliver">Ready to Deliver</option>
                        <option value="Load">Load</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleBulkUpdateStatus(bulkStatus)}
                        disabled={isBulkUpdatingMethod || isBulkUpdatingStatus}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded shadow-xs transition-all cursor-pointer disabled:opacity-50"
                        title="Overwrite status for all selected orders"
                      >
                        {isBulkUpdatingStatus ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <History size={12} />
                            <span>Overwrite Status</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {sortedPendingOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full bg-[#F0F4F9]/40 border border-dashed border-slate-200 rounded select-none">
                  <Boxes size={40} className="text-zinc-400 mb-3" />
                  <span className="font-primary text-sm text-zinc-500 font-medium">
                    No pending deliveries. Create and send orders from the Create Order tab.
                  </span>
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-auto border border-slate-200 rounded bg-white">
                  <table className="w-full text-left font-primary text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-zinc-700 font-bold border-b border-slate-200 h-12">
                        <th className="sticky top-0 bg-slate-50 p-3 w-10 text-center align-middle z-10">
                          <input
                            type="checkbox"
                            checked={isAllPendingSelected}
                            onChange={toggleSelectAllPendingOrders}
                            className="rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0] cursor-pointer w-4 h-4"
                            title={isAllPendingSelected ? "Deselect All" : "Select All"}
                          />
                        </th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10"></th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Status</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-16 text-center align-middle z-10">Mark</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-56 align-middle z-10">Reference Number</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Type</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-28 text-center align-middle z-10">Store ID</th>
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
                          const isSelected = !!selectedPendingOrderIds[order.id];
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

                          const currentInputValue = linkStoreInputValues[order.id] !== undefined 
                            ? linkStoreInputValues[order.id] 
                            : (order.link_store || "");
                          const isDropdownOpen = activeLinkStoreDropdown === order.id;

                          const filteredStores = currentInputValue.trim()
                            ? stores
                                .filter((s: any) => {
                                  const q = currentInputValue.trim().toLowerCase();
                                  const idStr = String(s.id || "").toLowerCase();
                                  const nameStr = String(s["Display Name"] || s.display_name || "").toLowerCase();
                                  const addrStr = String(s.Address || s.address || "").toLowerCase();
                                  return idStr.includes(q) || nameStr.includes(q) || addrStr.includes(q);
                                })
                                .slice(0, 5)
                            : stores.slice(0, 5);

                          return (
                            <React.Fragment key={`${order.id}-${idx}`}>
                              {showDivider && (
                                <tr className="bg-[#F1F3F4]/80 text-[#1A73E8] border-y border-[#DADCE0]">
                                  <td colSpan={12} className="p-2.5 pl-4 text-xs font-bold tracking-wide uppercase select-none">
                                    📅 {dateStr}
                                  </td>
                                </tr>
                              )}
                              <tr 
                                className={`transition-all h-14 ${
                                  isSelected 
                                    ? "bg-blue-50/60 hover:bg-blue-50" 
                                    : (idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F8F9FA]") + " hover:bg-slate-50"
                                }`}
                              >
                                <td className="p-3 w-10 text-center align-middle border-b border-zinc-200">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectPendingOrder(order.id)}
                                    className="rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0] cursor-pointer w-4 h-4"
                                  />
                                </td>
                                <td className="p-3 w-36 align-middle border-b border-zinc-200">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeOrder(order)}
                                      title={order.status === "Delivered" ? "Cannot revoke a delivered order" : "Revoke and send back to drafts"}
                                      disabled={order.status === "Delivered"}
                                      className={`w-7 h-7 rounded-md border border-slate-200 shadow-2xs flex items-center justify-center transition-all ${
                                        order.status === "Delivered"
                                          ? "opacity-40 cursor-not-allowed bg-slate-50 text-zinc-300"
                                          : "bg-white hover:bg-slate-100 text-zinc-600 hover:text-zinc-950 hover:border-slate-300 cursor-pointer"
                                      }`}
                                    >
                                      <Undo size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditOrderPanel(order)}
                                      title={order.status === "Delivered" ? "Cannot edit a delivered order" : "Edit Order"}
                                      disabled={order.status === "Delivered"}
                                      className={`w-7 h-7 rounded-md border border-slate-200 shadow-2xs flex items-center justify-center transition-all ${
                                        order.status === "Delivered"
                                          ? "opacity-40 cursor-not-allowed bg-slate-50 text-zinc-300"
                                          : "bg-white hover:bg-slate-100 text-zinc-600 hover:text-zinc-950 hover:border-slate-300 cursor-pointer"
                                      }`}
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleTriggerChangeStatus(order)}
                                      title="Change Status (Overwrite)"
                                      className="w-7 h-7 rounded-md bg-white hover:bg-slate-100 text-zinc-600 hover:text-zinc-950 border border-slate-200 shadow-2xs flex items-center justify-center transition-all hover:border-slate-300 cursor-pointer"
                                    >
                                      <History size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleTriggerCompleteOrder(order)}
                                      disabled={order.status !== "Delivered"}
                                      title={order.status !== "Delivered" ? "Cannot complete until status is Delivered" : "Verify and archive"}
                                      className={`w-7 h-7 rounded-md border border-slate-200 shadow-2xs flex items-center justify-center transition-all ${
                                        order.status !== "Delivered"
                                          ? "opacity-40 cursor-not-allowed bg-slate-50 text-zinc-300"
                                          : "bg-white hover:bg-emerald-50 text-emerald-600 hover:border-emerald-200 cursor-pointer"
                                      }`}
                                    >
                                      <CheckCircle size={12} />
                                    </button>
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
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>
                                      {order.do_number}
                                      {order.ref_number ? `_${order.ref_number}` : ""}
                                    </span>
                                    {renderDiscrepancyBadge(order)}
                                  </div>
                                </td>
                                <td className="p-3 w-36 align-middle border-b border-zinc-200">
                                  {renderTypeCell(order)}
                                </td>
                                <td className="p-3 w-28 align-middle border-b border-zinc-200 relative text-center">
                                  <div className="relative inline-block w-20">
                                    <input
                                      type="text"
                                      value={currentInputValue}
                                      placeholder="-"
                                      maxLength={10}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setLinkStoreInputValues((prev) => ({ ...prev, [order.id]: val }));
                                        setActiveLinkStoreDropdown(order.id);
                                      }}
                                      onFocus={() => setActiveLinkStoreDropdown(order.id)}
                                      onBlur={() => {
                                        // Slight delay so clicking dropdown option registers
                                        setTimeout(() => {
                                          setActiveLinkStoreDropdown((current) => (current === order.id ? null : current));
                                          handleUpdateOrderLinkStore(order, currentInputValue);
                                        }, 200);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          setActiveLinkStoreDropdown(null);
                                          handleUpdateOrderLinkStore(order, currentInputValue);
                                          (e.target as HTMLInputElement).blur();
                                        }
                                      }}
                                      className="w-full text-center px-1.5 py-1 text-xs font-semibold uppercase rounded border border-slate-300 bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0] shadow-2xs"
                                    />
                                    {isDropdownOpen && filteredStores.length > 0 && (
                                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-lg z-50 overflow-hidden text-left divide-y divide-slate-100">
                                        {filteredStores.map((st: any) => {
                                          const sId = String(st.id || "");
                                          const sName = String(st["Display Name"] || st.display_name || "");
                                          return (
                                            <button
                                              key={sId}
                                              type="button"
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                setLinkStoreInputValues((prev) => ({ ...prev, [order.id]: sId }));
                                                setActiveLinkStoreDropdown(null);
                                                handleUpdateOrderLinkStore(order, sId);
                                              }}
                                              className="w-full px-2.5 py-1.5 text-xs hover:bg-[#F0F4F9] text-left flex flex-col transition-colors cursor-pointer"
                                            >
                                              <span className="font-bold text-zinc-900 flex items-center justify-between">
                                                <span>{sId}</span>
                                                <span className="text-[10px] text-zinc-400 font-normal truncate max-w-[120px]">{sName}</span>
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
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
            <div className="flex-1 w-full min-h-0 relative overflow-hidden">
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
                        <th className="sticky top-0 bg-slate-50 p-3 w-32 align-middle z-10"></th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-40 align-middle z-10">Delivered</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Deliver by</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Status</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-44 align-middle z-10">Reference Number</th>
                        <th className="sticky top-0 bg-slate-50 p-3 w-28 text-center align-middle z-10">Store ID</th>
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

                          const currentInputValue = linkStoreInputValues[order.id] !== undefined 
                            ? linkStoreInputValues[order.id] 
                            : (order.link_store || "");
                          const isDropdownOpen = activeLinkStoreDropdown === order.id;

                          const filteredStores = currentInputValue.trim()
                            ? stores
                                .filter((s: any) => {
                                  const q = currentInputValue.trim().toLowerCase();
                                  const idStr = String(s.id || "").toLowerCase();
                                  const nameStr = String(s["Display Name"] || s.display_name || "").toLowerCase();
                                  const addrStr = String(s.Address || s.address || "").toLowerCase();
                                  return idStr.includes(q) || nameStr.includes(q) || addrStr.includes(q);
                                })
                                .slice(0, 5)
                            : stores.slice(0, 5);

                          return (
                            <React.Fragment key={order.id}>
                              {showDivider && (
                                <tr className="bg-[#F1F3F4]/80 text-[#1A73E8] border-y border-[#DADCE0]">
                                  <td colSpan={12} className="p-2.5 pl-4 text-xs font-bold tracking-wide uppercase select-none">
                                    📅 {dateStr}
                                  </td>
                                </tr>
                              )}
                              <tr 
                                className={`transition-all h-14 ${
                                  idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F8F9FA]"
                                } hover:bg-slate-50`}
                              >
                                <td className="p-3 w-32 align-middle flex items-center gap-1.5 h-14 border-b border-zinc-200">
                                  <button
                                    type="button"
                                    onClick={() => handleTriggerRevokeComplete(order)}
                                    title="Revoke Complete (Send back to Pending)"
                                    className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-zinc-600 hover:text-zinc-950 hover:border-slate-300 cursor-pointer transition-all shadow-2xs outline-none"
                                  >
                                    <Undo size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditInvoice(order)}
                                    title="Edit Invoice Details"
                                    className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-zinc-600 hover:text-zinc-950 hover:border-slate-300 cursor-pointer transition-all shadow-2xs outline-none"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadCompiledPdf(order)}
                                    title="Download Compiled PDF (GDN + DO + Invoice)"
                                    className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-blue-50 text-zinc-600 hover:text-blue-600 hover:border-blue-300 cursor-pointer transition-all shadow-2xs outline-none"
                                  >
                                    <FileDown size={12} />
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
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>
                                      {order.do_number}
                                      {order.ref_number ? `_${order.ref_number}` : ""}
                                    </span>
                                    {renderDiscrepancyBadge(order)}
                                  </div>
                                </td>
                                <td className="p-3 w-28 align-middle border-b border-zinc-200 relative text-center">
                                  <div className="relative inline-block w-20">
                                    <input
                                      type="text"
                                      value={currentInputValue}
                                      placeholder="-"
                                      maxLength={10}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setLinkStoreInputValues((prev) => ({ ...prev, [order.id]: val }));
                                        setActiveLinkStoreDropdown(order.id);
                                      }}
                                      onFocus={() => setActiveLinkStoreDropdown(order.id)}
                                      onBlur={() => {
                                        // Slight delay so clicking dropdown option registers
                                        setTimeout(() => {
                                          setActiveLinkStoreDropdown((current) => (current === order.id ? null : current));
                                          handleUpdateOrderLinkStore(order, currentInputValue);
                                        }, 200);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          setActiveLinkStoreDropdown(null);
                                          handleUpdateOrderLinkStore(order, currentInputValue);
                                          (e.target as HTMLInputElement).blur();
                                        }
                                      }}
                                      className="w-full text-center px-1.5 py-1 text-xs font-semibold uppercase rounded border border-slate-300 bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0] shadow-2xs"
                                    />
                                    {isDropdownOpen && filteredStores.length > 0 && (
                                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-lg z-50 overflow-hidden text-left divide-y divide-slate-100">
                                        {filteredStores.map((st: any) => {
                                          const sId = String(st.id || "");
                                          const sName = String(st["Display Name"] || st.display_name || "");
                                          return (
                                            <button
                                              key={sId}
                                              type="button"
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                                setLinkStoreInputValues((prev) => ({ ...prev, [order.id]: sId }));
                                                setActiveLinkStoreDropdown(null);
                                                handleUpdateOrderLinkStore(order, sId);
                                              }}
                                              className="w-full px-2.5 py-1.5 text-xs hover:bg-[#F0F4F9] text-left flex flex-col transition-colors cursor-pointer"
                                            >
                                              <span className="font-bold text-zinc-900 flex items-center justify-between">
                                                <span>{sId}</span>
                                                <span className="text-[10px] text-zinc-400 font-normal truncate max-w-[120px]">{sName}</span>
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
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
        <div className="flex-1 flex flex-col gap-4 animate-tableFadeInOnly min-h-0 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1 border-b border-slate-200 pb-2 shrink-0">
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

              <button
                type="button"
                onClick={() => {
                  if (!creditNoteLoading) setIsCreditNoteUploadChoiceOpen(true);
                }}
                disabled={creditNoteLoading}
                className={`ml-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white rounded text-xs font-bold cursor-pointer transition-all ${
                  creditNoteLoading ? "opacity-80 cursor-not-allowed" : ""
                }`}
              >
                {creditNoteLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>{creditNoteLoadingText}</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Bulk Credit Notes Upload</span>
                  </>
                )}
              </button>
              <input
                type="file"
                ref={creditNotePdfInputRef}
                accept="application/pdf"
                onChange={handleBulkCreditNoteUpload}
                className="hidden"
                disabled={creditNoteLoading}
              />
              <input
                type="file"
                ref={creditNoteExcelInputRef}
                accept="text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleCreditNoteExcelUpload}
                className="hidden"
                disabled={creditNoteLoading}
              />
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

              <div className="relative w-full sm:w-72">
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
            </div>
          </div>

          <div className="flex-1 w-full min-h-0 relative overflow-hidden">
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
                      <th className="sticky top-0 bg-slate-50 p-3 w-32 align-middle z-10"></th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-40 align-middle z-10">Collected</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Collected by</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Status</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-44 align-middle z-10">Reference</th>
                      <th className="sticky top-0 bg-slate-50 p-3 w-28 text-center align-middle z-10">Store ID</th>
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

                        const currentInputValue = linkStoreInputValues[order.id] !== undefined 
                          ? linkStoreInputValues[order.id] 
                          : (order.link_store || "");
                        const isDropdownOpen = activeLinkStoreDropdown === order.id;

                        const filteredStores = currentInputValue.trim()
                          ? stores
                              .filter((s: any) => {
                                const q = currentInputValue.trim().toLowerCase();
                                const idStr = String(s.id || "").toLowerCase();
                                const nameStr = String(s["Display Name"] || s.display_name || "").toLowerCase();
                                const addrStr = String(s.Address || s.address || "").toLowerCase();
                                return idStr.includes(q) || nameStr.includes(q) || addrStr.includes(q);
                              })
                              .slice(0, 5)
                          : stores.slice(0, 5);

                        return (
                          <React.Fragment key={order.id}>
                            {showDivider && (
                              <tr className="bg-[#F1F3F4]/80 text-[#1A73E8] border-y border-[#DADCE0]">
                                <td colSpan={12} className="p-2.5 pl-4 text-xs font-bold tracking-wide uppercase select-none">
                                  📅 {dateStr}
                                </td>
                              </tr>
                            )}
                            <tr 
                              className={`transition-all h-14 ${
                                idx % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#F8F9FA]"
                              } hover:bg-slate-50`}
                            >
                              <td className="p-3 w-32 align-middle flex items-center gap-1.5 h-14 border-b border-zinc-200">
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
                                <button
                                  type="button"
                                  onClick={() => handleDownloadCompiledPdf(order)}
                                  title="Download Compiled PDF (GRN + CN)"
                                  className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded border border-zinc-300 bg-white hover:bg-blue-50 text-zinc-700 hover:text-blue-600 hover:border-blue-300 cursor-pointer transition-all outline-none"
                                >
                                  <FileDown size={12} />
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
                              <td className="p-3 w-28 align-middle border-b border-zinc-200 relative text-center">
                                <div className="relative inline-block w-20">
                                  <input
                                    type="text"
                                    value={currentInputValue}
                                    placeholder="-"
                                    maxLength={10}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setLinkStoreInputValues((prev) => ({ ...prev, [order.id]: val }));
                                      setActiveLinkStoreDropdown(order.id);
                                    }}
                                    onFocus={() => setActiveLinkStoreDropdown(order.id)}
                                    onBlur={() => {
                                      // Slight delay so clicking dropdown option registers
                                      setTimeout(() => {
                                        setActiveLinkStoreDropdown((current) => (current === order.id ? null : current));
                                        handleUpdateOrderLinkStore(order, currentInputValue);
                                      }, 200);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        setActiveLinkStoreDropdown(null);
                                        handleUpdateOrderLinkStore(order, currentInputValue);
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                    className="w-full text-center px-1.5 py-1 text-xs font-semibold uppercase rounded border border-slate-300 bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#0B57D0] focus:border-[#0B57D0] shadow-2xs"
                                  />
                                  {isDropdownOpen && filteredStores.length > 0 && (
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-56 bg-white border border-slate-200 rounded-md shadow-lg z-50 overflow-hidden text-left divide-y divide-slate-100">
                                      {filteredStores.map((st: any) => {
                                        const sId = String(st.id || "");
                                        const sName = String(st["Display Name"] || st.display_name || "");
                                        return (
                                          <button
                                            key={sId}
                                            type="button"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              setLinkStoreInputValues((prev) => ({ ...prev, [order.id]: sId }));
                                              setActiveLinkStoreDropdown(null);
                                              handleUpdateOrderLinkStore(order, sId);
                                            }}
                                            className="w-full px-2.5 py-1.5 text-xs hover:bg-[#F0F4F9] text-left flex flex-col transition-colors cursor-pointer"
                                          >
                                            <span className="font-bold text-zinc-900 flex items-center justify-between">
                                              <span>{sId}</span>
                                              <span className="text-[10px] text-zinc-400 font-normal truncate max-w-[120px]">{sName}</span>
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
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
                      <th className="sticky top-0 bg-slate-50 p-3 w-36 align-middle z-10">Due Date</th>
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
                                  className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-red-50 text-zinc-600 hover:text-red-600 hover:border-red-200 cursor-pointer transition-all shadow-2xs outline-none"
                                >
                                  <Trash2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditReturnPanel(order)}
                                  title="Edit Return"
                                  className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-zinc-600 hover:text-zinc-950 hover:border-slate-300 cursor-pointer transition-all shadow-2xs outline-none"
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTriggerChangeStatus(order)}
                                  title="Change Status (Overwrite)"
                                  className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-zinc-600 hover:text-zinc-950 hover:border-slate-300 cursor-pointer transition-all shadow-2xs outline-none"
                                >
                                  <History size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTriggerCompleteReturnOrder(order)}
                                  disabled={order.status !== "Collected" && order.status !== "Return Collected"}
                                  title={order.status !== "Collected" && order.status !== "Return Collected" ? "Cannot complete until status is Collected" : "Mark as Complete"}
                                  className={`w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded-md border shadow-2xs transition-all outline-none ${
                                    order.status !== "Collected" && order.status !== "Return Collected" 
                                      ? "border-slate-200 bg-slate-50 text-zinc-300 cursor-not-allowed opacity-40"
                                      : "border-slate-200 bg-white hover:bg-emerald-50 text-emerald-600 hover:border-emerald-200 cursor-pointer"
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
                              <td className="p-3 w-44 font-semibold text-zinc-950 align-middle border-b border-zinc-200">
                                {order.ref_number || order.do_number}
                              </td>
                              <td className="p-3 w-56 text-zinc-500 align-middle border-b border-zinc-200 whitespace-nowrap" title={order.deliver_to}>
                                {order.deliver_to}
                              </td>
                              <td className="p-3 w-36 text-zinc-500 align-middle border-b border-zinc-200" title={order.deliver_method}>
                                {order.deliver_method || "Company Vehicle"}
                              </td>
                              <td className="p-3 w-36 align-middle border-b border-zinc-200">
                                {renderReturnDueDateCell(order)}
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

      {/* TAB CONTENT: CREATE JOB / JOB DISPATCH */}
      {((activeTab === "create" && createOrderSubView === "dispatch") || activeTab === "job") && (
        <div className="flex-1 flex flex-col gap-3 animate-tableFadeInOnly min-h-0 overflow-hidden">
          {/* SUBVIEW 1: CREATE / DISPATCH NEW JOB */}
          {jobSubView === "create" && (
            <>
              {/* Last Generated Job Alert Banner */}
          {lastGeneratedJob && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0B57D0] text-white flex items-center justify-center font-bold text-lg shadow-xs">
                  <QrCode size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-900">Job Package Created Successfully:</span>
                    <span className="px-2.5 py-0.5 bg-white border border-blue-300 rounded font-mono font-bold text-[#0B57D0] text-sm tracking-wider">
                      {lastGeneratedJob.token}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(lastGeneratedJob.token);
                        showToast(`Copied token "${lastGeneratedJob.token}" to clipboard!`, "success");
                      }}
                      className="text-[11px] font-semibold text-[#0B57D0] hover:underline cursor-pointer"
                    >
                      Copy Token
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-0.5">
                    {lastGeneratedJob.orderCount} orders grouped ({lastGeneratedJob.totalQty} items). Driver can open <strong>Driver App &gt; Menu &gt; Batch Load (Job Code)</strong> and enter <strong>{lastGeneratedJob.token}</strong> to load all at once.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLastGeneratedJob(null)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-600 hover:bg-blue-100/50 cursor-pointer"
                  title="Dismiss banner"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Job Filter & Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1 border-b border-slate-200 pb-2.5 shrink-0">
            {/* Zone & Method Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-500 mr-1">Zone / Type:</span>
              {["All", "Central", "East", "North", "North-East", "West", "South", "Warehouse Pickup"].map((zone) => {
                const isSelected = jobZoneFilter === zone;
                return (
                  <button
                    key={zone}
                    onClick={() => setJobZoneFilter(zone)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-[#0B57D0] text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-zinc-700 hover:bg-slate-50 hover:text-zinc-900"
                    }`}
                  >
                    {zone}
                  </button>
                );
              })}
            </div>

            {/* Search & Actions */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search DO, address, poscode..."
                  value={jobSearchQuery}
                  onChange={(e) => setJobSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg w-52 md:w-60 focus:outline-none focus:ring-1 focus:ring-[#0B57D0]"
                />
                {jobSearchQuery && (
                  <button
                    onClick={() => setJobSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Action Button: Generate Job & PDF */}
              <CustomButton
                variant="default"
                disabled={jobGenerating || Object.values(selectedJobOrderIds).filter(Boolean).length === 0}
                onClick={async () => {
                  const selectedIds = Object.keys(selectedJobOrderIds).filter((id) => selectedJobOrderIds[id]);
                  if (selectedIds.length === 0) {
                    showToast("Please select at least 1 order to generate a job package.", "error");
                    return;
                  }

                  const selectedOrders = dbOrders.filter((o) => selectedIds.includes(o.id));
                  setJobGenerating(true);

                  try {
                    // Call backend API to create job package
                    const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/track-orders/job", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "create",
                        order_ids: selectedIds
                      })
                    });

                    if (!res.ok) {
                      throw new Error(`Server returned error status ${res.status}`);
                    }

                    const json = await res.json();
                    if (!json.success || !json.token) {
                      throw new Error(json.error || "Failed to create job");
                    }

                    const token = json.token;

                    // Calculate total qty
                    let totalQty = 0;
                    selectedOrders.forEach((ord) => {
                      let items: SKUItem[] = [];
                      try {
                        items = typeof ord.items === "string" ? JSON.parse(ord.items) : (ord.items || []);
                      } catch (_) {}
                      items.forEach((it) => {
                        totalQty += Number(it.qty || 1);
                      });
                    });

                    // Generate PDF Loading Sheet & Route Breakdown
                    await handleGenerateJobPdf(token, selectedOrders);

                    // Update UI state
                    setLastGeneratedJob({
                      token,
                      orderCount: selectedOrders.length,
                      totalQty
                    });

                    // Clear selections
                    setSelectedJobOrderIds({});
                    showToast(`Job package created! Claim Token: [ ${token} ]`, "success");
                  } catch (err: any) {
                    console.error("Job generation error:", err);
                    showToast("Failed to create job package: " + err.message, "error");
                  } finally {
                    setJobGenerating(false);
                  }
                }}
                className="text-xs font-semibold shrink-0"
              >
                {jobGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin mr-1.5" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Layers size={14} className="mr-1.5" />
                    <span>
                      {jobZoneFilter === "Warehouse Pickup" || jobZoneFilter === "Self-Collect"
                        ? `Generate Pickup Sheet & PDF (${Object.values(selectedJobOrderIds).filter(Boolean).length})`
                        : `Generate Job Package & PDF (${Object.values(selectedJobOrderIds).filter(Boolean).length})`}
                    </span>
                  </>
                )}
              </CustomButton>
            </div>
          </div>

          {/* Orders Table for Job Selection */}
          {(() => {
            // Filter undelivered orders
            const candidateOrders = dbOrders.filter((o) => {
              const isDelivered = o.status === "Delivered" || String(o.completed) === "true" || o.completed === true;
              const isCollectedReturn = o.type === "Return" && (o.status === "Collected" || o.status === "Return Collected");
              if (isDelivered || isCollectedReturn) return false;

              // Zone & Warehouse Pickup / Self-Collect filter
              const m = String(o.deliver_method || "").toLowerCase();
              const p = String(o.poscode || "").toLowerCase();
              const isSelfCollect = m.includes("self") || m.includes("collect") || m.includes("pickup") || m.includes("warehouse") || p.includes("self") || p.includes("pickup");
              const orderZone = getZoneFromPostcode(o.poscode);

              if (jobZoneFilter === "Warehouse Pickup" || jobZoneFilter === "Self-Collect") {
                if (!isSelfCollect) return false;
              } else if (jobZoneFilter !== "All") {
                if (isSelfCollect || orderZone !== jobZoneFilter) return false;
              }

              // Search query
              if (jobSearchQuery.trim()) {
                const q = jobSearchQuery.toLowerCase().trim();
                const matchDo = (o.do_number || "").toLowerCase().includes(q);
                const matchRef = (o.ref_number || "").toLowerCase().includes(q);
                const matchDeliverTo = (o.deliver_to || "").toLowerCase().includes(q);
                const matchPoscode = (o.poscode || "").toLowerCase().includes(q);
                const matchMark = (o.mark || "").toLowerCase().includes(q);
                const matchZone = orderZone.toLowerCase().includes(q);
                const matchMethod = String(o.deliver_method || "").toLowerCase().includes(q);
                if (!matchDo && !matchRef && !matchDeliverTo && !matchPoscode && !matchMark && !matchZone && !matchMethod) return false;
              }
              return true;
            });

            const allCandidateIds = candidateOrders.map((o) => o.id);
            const isAllSelected = candidateOrders.length > 0 && candidateOrders.every((o) => selectedJobOrderIds[o.id]);

            return (
              <div className="flex-1 min-h-0 overflow-auto border border-slate-200 rounded-lg bg-white shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr className="text-zinc-600 font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newMap = { ...selectedJobOrderIds };
                              allCandidateIds.forEach((id) => (newMap[id] = true));
                              setSelectedJobOrderIds(newMap);
                            } else {
                              const newMap = { ...selectedJobOrderIds };
                              allCandidateIds.forEach((id) => delete newMap[id]);
                              setSelectedJobOrderIds(newMap);
                            }
                          }}
                          className="rounded text-[#0B57D0] focus:ring-[#0B57D0] cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3 w-16">Mark</th>
                      <th className="py-2.5 px-3 w-20">Type</th>
                      <th className="py-2.5 px-3 w-36">DO / Ref Number</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Delivery Address</th>
                      <th className="py-2.5 px-3 w-28">Zone / Postcode</th>
                      <th className="py-2.5 px-3 min-w-[160px]">Items / Qty</th>
                      <th className="py-2.5 px-3 w-32">Current Status</th>
                      <th className="py-2.5 px-3 w-28">Driver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-zinc-700">
                    {candidateOrders.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-zinc-400">
                          <Layers size={28} className="mx-auto mb-2 opacity-30 text-zinc-500" />
                          <p className="font-semibold text-zinc-500">No undelivered orders found for this zone / filter.</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">Try selecting "All" zones or clearing your search term.</p>
                        </td>
                      </tr>
                    ) : (
                      candidateOrders.map((order) => {
                        const isSelected = !!selectedJobOrderIds[order.id];
                        const zone = getZoneFromPostcode(order.poscode);
                        const activeJob = activeJobOrderByOrderId[String(order.id).trim()];

                        let items: SKUItem[] = [];
                        try {
                          items = typeof order.items === "string" ? JSON.parse(order.items) : (order.items || []);
                        } catch (_) {}
                        const totalQty = items.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);

                        return (
                          <tr
                            key={order.id}
                            onClick={() => {
                              setSelectedJobOrderIds((prev) => ({
                                ...prev,
                                [order.id]: !prev[order.id]
                              }));
                            }}
                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                              isSelected ? "bg-blue-50/60" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedJobOrderIds((prev) => ({
                                    ...prev,
                                    [order.id]: e.target.checked
                                  }));
                                }}
                                className="rounded text-[#0B57D0] focus:ring-[#0B57D0] cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-bold text-zinc-900">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-zinc-800 text-[11px] font-mono">
                                {order.mark || "-"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  order.type === "Urgent"
                                    ? "bg-red-50 text-red-600 border border-red-200"
                                    : order.type === "Appointment"
                                    ? "bg-purple-50 text-purple-600 border border-purple-200"
                                    : order.type === "Return"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-slate-100 text-zinc-600 border border-slate-200"
                                }`}
                              >
                                {order.type || "Normal"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-zinc-900">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{order.do_number || "-"}</span>
                                {activeJob && (
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-blue-50 text-[#0B57D0] border border-blue-200 text-[10px] font-mono font-bold shrink-0 inline-flex items-center gap-1 shadow-2xs"
                                    title={`Already assigned in Active Job Package [${activeJob.token}]`}
                                  >
                                    <Layers size={10} />
                                    {activeJob.token}
                                  </span>
                                )}
                              </div>
                              {order.ref_number && (
                                <div className="text-[11px] text-zinc-400 font-mono">{order.ref_number}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-zinc-800 line-clamp-1">{order.deliver_to || "Address not provided"}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-zinc-700 text-[11px] font-medium mr-1">
                                {zone}
                              </span>
                              <span className="text-[11px] text-zinc-400 font-mono">{order.poscode || "-"}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-zinc-900">{totalQty} units</span>
                              <span className="text-zinc-400 text-[11px] ml-1.5">({items.length} SKUs)</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col gap-0.5 items-start">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-zinc-700 text-[11px] font-semibold">
                                  {order.status || "Ready to Pick"}
                                </span>
                                {activeJob && (
                                  <span className="text-[10px] font-semibold text-[#0B57D0]">
                                    In Job [{activeJob.token}]
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-zinc-600">
                              {order.driver || <span className="text-zinc-400 italic">Unassigned</span>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            );
          })()}
            </>
          )}

          {/* SUBVIEW 2: JOB HISTORY & TOKEN MANAGEMENT */}
          {jobSubView === "history" && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white border border-slate-200 rounded-lg shadow-2xs">
              <div className="flex-1 min-h-0 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                    <tr className="text-zinc-600 font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-32">Claim Token</th>
                      <th className="py-2.5 px-3 w-36">Status</th>
                      <th className="py-2.5 px-3 w-28">Zone / Type</th>
                      <th className="py-2.5 px-3 w-36">Orders Grouped</th>
                      <th className="py-2.5 px-3 w-40">Created At</th>
                      <th className="py-2.5 px-3 w-40">Claimed By</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {jobHistoryLoading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500">
                          <Loader2 size={24} className="animate-spin text-[#0B57D0] mx-auto mb-2" />
                          <span>Loading Job Packages...</span>
                        </td>
                      </tr>
                    ) : jobHistoryList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-400">
                          <Layers size={32} className="mx-auto mb-2 text-zinc-300" />
                          <p className="font-semibold text-zinc-600">No Job Packages Found</p>
                          <p className="text-[11px] text-zinc-400 mt-1">
                            Create a job package from the Dispatch tab to generate tokens and staging sheets.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      jobHistoryList.map((job) => {
                        const isOpen = job.status === "OPEN";
                        const isClaimed = job.status === "CLAIMED";
                        const isCancelled = job.status === "CANCELLED";

                        let orderIdsCount = 0;
                        try {
                          const ids = typeof job.order_ids === "string" ? JSON.parse(job.order_ids) : (job.order_ids || []);
                          orderIdsCount = Array.isArray(ids) ? ids.length : (job.total_orders || 0);
                        } catch (_) {
                          orderIdsCount = job.total_orders || 0;
                        }

                        const createdDateStr = job.created_at
                          ? new Date(Number(job.created_at)).toLocaleString("en-SG", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true
                            })
                          : "-";

                        const claimedDateStr = job.claimed_at
                          ? new Date(Number(job.claimed_at)).toLocaleString("en-SG", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true
                            })
                          : null;

                        return (
                          <tr key={job.id || job.token} className="hover:bg-slate-50/80 transition-colors">
                            {/* Token */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-sm text-[#0B57D0] px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                                  {job.token}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(job.token);
                                    showToast(`Copied token "${job.token}" to clipboard!`, "success");
                                  }}
                                  className="text-[11px] text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                                  title="Copy Token"
                                >
                                  Copy
                                </button>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-3">
                              {isOpen && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Active / Open
                                </span>
                              )}
                              {isClaimed && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0B57D0] border border-blue-200 text-[11px] font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 size={12} />
                                  Claimed & Loaded
                                </span>
                              )}
                              {(isCancelled || job.status === "REVOKED") && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold inline-flex items-center gap-1">
                                  <Ban size={12} />
                                  {job.status === "REVOKED" ? "Revoked" : "Voided / Cancelled"}
                                </span>
                              )}
                            </td>

                            {/* Zone / Type */}
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-zinc-700 font-semibold text-[11px]">
                                {job.zone || "All"}
                              </span>
                            </td>

                            {/* Orders Count */}
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-zinc-900">{orderIdsCount} Orders</span>
                              {job.total_qty > 0 && (
                                <span className="text-zinc-500 text-[11px] ml-1">({job.total_qty} units)</span>
                              )}
                            </td>

                            {/* Created At */}
                            <td className="py-2.5 px-3 text-zinc-600 font-medium text-[11px]">
                              {createdDateStr}
                            </td>

                            {/* Claimed By */}
                            <td className="py-2.5 px-3 text-zinc-700 text-[11px]">
                              {job.driver ? (
                                <div>
                                  <span className="font-bold text-zinc-900">{job.driver}</span>
                                  {claimedDateStr && (
                                    <div className="text-[10px] text-zinc-400">{claimedDateStr}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-zinc-400 italic">Not claimed yet</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleReprintJobPdf(job)}
                                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-zinc-700 hover:bg-slate-50 hover:text-zinc-900 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  title="Re-generate and download PDF"
                                >
                                  <Printer size={13} className="text-zinc-600" />
                                  <span>Print PDF</span>
                                </button>
                                {(isOpen || isClaimed) && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRevokeJobModal(job)}
                                    className="px-2.5 py-1 rounded bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Revoke job and return uncompleted orders to Ready to Deliver"
                                  >
                                    <RotateCcw size={13} />
                                    <span>Revoke</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleClickDeleteJob(job)}
                                  className="px-2.5 py-1 rounded bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  title="Delete this job package record"
                                >
                                  <Trash2 size={13} />
                                  <span>Delete</span>
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
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: CREATE ORDER / DRAFTS */}
      {activeTab === "create" && createOrderSubView === "drafts" && (
        <div className="flex-1 flex flex-col gap-4 animate-tableFadeInOnly min-h-0 overflow-hidden">
          {/* Hidden File Input Refs */}
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

          <div className="flex justify-between items-center px-1 shrink-0">
            <h3 className="font-primary text-base font-bold text-zinc-800">
              Draft Orders
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-zinc-600">
              {drafts.length} Drafts
            </span>
          </div>

          <div className="flex-1 w-full min-h-0 relative overflow-hidden">
            {drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full bg-[#F0F4F9]/40 border border-dashed border-slate-200 rounded select-none p-6">
                <FileText size={40} className="text-zinc-400 mb-3" />
                <span className="font-primary text-sm text-zinc-600 font-semibold">
                  No draft orders found
                </span>
                <span className="font-primary text-xs text-zinc-400 mt-1 mb-4 text-center max-w-md">
                  Import DO orders from PDF / Excel sheets or draft manual order records below.
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <CustomButton
                    variant="default"
                    onClick={() => {
                      if (!pdfLoading) setIsDoUploadChoiceOpen(true);
                    }}
                    disabled={pdfLoading}
                    className="text-xs font-semibold"
                  >
                    <Upload size={14} />
                    <span>Import Order</span>
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
                    className="text-xs font-semibold"
                  >
                    <Plus size={14} />
                    <span>Create Order</span>
                  </CustomButton>
                  <CustomButton
                    variant="default"
                    onClick={() => {
                      returnPdfInputRef.current?.click();
                    }}
                    disabled={isReturnParsing}
                    className="text-xs font-semibold"
                  >
                    <Upload size={14} />
                    <span>Import Return</span>
                  </CustomButton>
                  <CustomButton
                    variant="default"
                    onClick={openCreateReturnPanel}
                    className="text-xs font-semibold"
                  >
                    <Plus size={14} />
                    <span>Create Return</span>
                  </CustomButton>
                </div>
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
                      <th className="sticky top-0 bg-slate-50 p-3 w-20 text-center align-middle z-10">Store ID</th>
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
                          <button
                            type="button"
                            onClick={() => handleSendOrder(idx)}
                            disabled={!!sendingDraftIds[draft.id]}
                            title="Send Order"
                            className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-emerald-50 text-zinc-600 hover:text-emerald-600 hover:border-emerald-200 cursor-pointer transition-all shadow-2xs outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Send size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(idx)}
                            disabled={!!sendingDraftIds[draft.id]}
                            title="Delete Draft"
                            className="w-7 h-7 flex-shrink-0 aspect-square flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-red-50 text-zinc-600 hover:text-red-600 hover:border-red-200 cursor-pointer transition-all shadow-2xs outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={12} />
                          </button>
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
                        <td className="p-3 w-20 align-middle border-b border-zinc-200 text-center">
                          <input
                            type="text"
                            list="draft-store-datalist"
                            value={draft.link_store || ""}
                            onChange={(e) => handleUpdateDraftCell(idx, "link_store", e.target.value)}
                            className="w-14 h-7 px-1 rounded border border-zinc-300/40 hover:border-zinc-300 bg-transparent text-center font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 text-xs uppercase mx-auto block"
                          />
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

                    {(() => {
                      const photos = selectedOrder
                        ? getLogImagesForAction(log.action, selectedOrder, log.photoUrl, log)
                        : (log.photoUrl ? parseImageUrlList(log.photoUrl) : []);

                      if (photos.length === 0) return null;

                      return (
                        <div className="flex flex-col gap-1.5 mt-1.5">
                          {photos.length > 1 && (
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
                              <ImageIcon size={12} className="text-[#0B57D0]" />
                              <span>Attached Photos ({photos.length})</span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2.5">
                            {photos.map((url, imgIdx) => (
                              <div 
                                key={imgIdx} 
                                onClick={() => setActiveLightboxImage(url)}
                                className="group relative rounded-lg overflow-hidden border border-zinc-200 hover:border-[#0B57D0] max-w-[200px] shadow-xs bg-white cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                                title={`Click to view photo #${imgIdx + 1} full size`}
                              >
                                <img 
                                  src={url} 
                                  alt={`Log Proof ${imgIdx + 1}`} 
                                  className="object-cover w-full h-32 bg-slate-50" 
                                />
                                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono font-bold rounded">
                                  #{imgIdx + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
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
              className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-medium"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-zinc-700">Ref Number (Optional)</label>
            <input
              type="text"
              placeholder="e.g. REF-987"
              value={createRefNumber}
              onChange={(e) => setCreateRefNumber(e.target.value)}
              className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-medium"
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
                className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] text-center font-bold"
              />
            </div>

            <div className="flex-1 flex flex-col gap-1">
              <label className="font-bold text-zinc-700">Type *</label>
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value as any)}
                className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-850 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-semibold text-xs"
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
              className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-850 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-semibold text-xs"
            >
              <option value="Company Delivery">Company Delivery</option>
              <option value="External Delivery">External Delivery</option>
              <option value="Warehouse Pickup">Warehouse Pickup</option>
            </select>
          </div>

          {createType === "Appointment" && (
            <div className="flex gap-3 border-l-2 border-[#0B57D0] pl-2.5 my-1">
              <div className="flex-1 flex flex-col gap-1">
                <label className="font-bold text-zinc-700">Appointment Date *</label>
                <input
                  type="date"
                  value={createAppointmentDate}
                  onChange={(e) => setCreateAppointmentDate(e.target.value)}
                  className="h-8 px-2 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-semibold"
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="font-bold text-zinc-700">End Time *</label>
                <input
                  type="time"
                  value={createTimeWindow}
                  onChange={(e) => setCreateTimeWindow(e.target.value)}
                  className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-semibold"
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
              className="p-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-medium resize-none"
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
              className={`h-8 px-2.5 rounded border text-center font-semibold focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] ${
                createPoscode && !validatePoscode(createPoscode)
                  ? "border-red-400 bg-red-50 text-red-700"
                  : "border-slate-200 bg-white text-zinc-900"
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
              className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-medium"
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
              className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-medium"
            />
            {showStoreDropdown && filteredStores.length > 0 && (
              <div className="absolute top-10 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                {filteredStores.map((store, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs font-semibold text-zinc-700 border-b border-slate-100 last:border-0 cursor-pointer"
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
              className={`h-8 px-2.5 rounded border text-center font-semibold focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] ${
                returnPoscode && !validatePoscode(returnPoscode)
                  ? "border-red-400 bg-red-50 text-red-700"
                  : "border-slate-200 bg-white text-zinc-900"
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
              className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-semibold text-xs"
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
                className="h-8 px-2 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-semibold"
              />
            </div>

            <div className="flex-1 flex flex-col gap-1">
              <label className="font-bold text-zinc-700">Mark *</label>
              <div className="flex items-center">
                <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l h-8 px-3 flex items-center font-bold text-zinc-500 text-xs select-none">
                  R
                </span>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="e.g. A"
                  value={returnMark}
                  onChange={(e) => setReturnMark(e.target.value.toUpperCase().trim())}
                  className="w-full h-8 px-2.5 rounded-r border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] text-center font-bold"
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
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 backdrop-blur-xs font-primary p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col animate-zoom-in">
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-sm text-zinc-900">Change Status : {statusOrder.ref_number || statusOrder.do_number}</span>
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
                  className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-medium"
                >
                  <option value="" disabled>Select Status</option>
                  {(statusOrder.type || "").trim().toLowerCase() === "return" ? (
                    <>
                      <option value="Pending">Pending</option>
                      <option value="Ready to Collect">Ready to Collect</option>
                      <option value="Out for Collection">Out for Collection</option>
                      <option value="Collected">Collected</option>
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
                <label className="font-bold text-zinc-700">Remark (Optional)</label>
                <textarea
                  placeholder="e.g. Changed status due to logistics update"
                  value={statusRemark}
                  onChange={(e) => setStatusRemark(e.target.value)}
                  rows={3}
                  className="p-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-medium resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-zinc-700">Upload Image (Optional)</label>
                <div className="flex items-center gap-2">
                  <label className="h-8 px-3 rounded border border-slate-200 bg-white text-zinc-700 hover:text-zinc-950 hover:bg-slate-50 transition-all select-none cursor-pointer flex items-center justify-center gap-1.5 font-bold text-[10px] shadow-2xs">
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
            
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
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
                disabled={statusPhotoUploading || !newStatus}
              >
                {statusPhotoUploading ? "Updating..." : "Update Status"}
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ORDER COMPLETE MODAL */}
      {isCompleteConfirmOpen && pendingCompleteOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 backdrop-blur-xs font-primary p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col animate-zoom-in">
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-sm text-zinc-900">
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
                      className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-medium"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. INV-12345"
                      value={invoiceNumberInput}
                      onChange={(e) => setInvoiceNumberInput(e.target.value)}
                      className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-medium"
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
                    className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-medium"
                  />
                </div>
              </div>
            </div>
            
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
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
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 backdrop-blur-xs font-primary p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col animate-zoom-in">
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-sm text-zinc-900">
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
                  className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-medium"
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
                  className="h-8 px-2.5 rounded border border-slate-200 bg-white text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0] font-medium"
                />
              </div>

              {/* Invoice Photo Attachment */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-zinc-700">Invoice Photo / Attachment</label>
                  {editInvoicePhotoUrl && (
                    <a
                      href={editInvoicePhotoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[#0B57D0] hover:underline font-semibold flex items-center gap-1"
                    >
                      <Eye size={10} /> View Current
                    </a>
                  )}
                </div>

                {editInvoicePhotoUrl && !editInvoicePhotoFile ? (
                  <div className="flex items-center justify-between p-2 rounded border border-slate-200 bg-slate-50">
                    <span className="text-[11px] text-zinc-600 truncate max-w-[200px]">
                      Attached Invoice Document
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditInvoicePhotoUrl("")}
                      className="text-red-500 hover:text-red-700 text-[10px] font-bold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setEditInvoicePhotoFile(f);
                    }}
                    className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded p-1"
                  />
                )}
                {editInvoicePhotoFile && (
                  <span className="text-[10px] text-zinc-500 truncate">
                    Selected: {editInvoicePhotoFile.name}
                  </span>
                )}
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <CustomButton 
                variant="secondary" 
                onClick={() => setIsEditInvoiceModalOpen(false)}
                disabled={editInvoiceUploading}
              >
                Cancel
              </CustomButton>
              <CustomButton 
                variant="dark" 
                onClick={handleSaveEditInvoice}
                disabled={editInvoiceUploading || !String(editInvoiceNum || "").trim() || !String(editInvoiceAmount || "").trim()}
              >
                {editInvoiceUploading ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> Saving...
                  </span>
                ) : (
                  "Save"
                )}
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE COMPLETE CONFIRMATION MODAL */}
      {isRevokeCompleteConfirmOpen && pendingRevokeCompleteOrder && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 backdrop-blur-xs font-primary p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col animate-zoom-in">
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-sm text-zinc-900">
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
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
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

      {/* UNKNOWN STORE ID CONFIRMATION MODAL */}
      {isUnknownStoreModalOpen && unknownStoreInfo && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/40 backdrop-blur-xs font-primary p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col animate-zoom-in">
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 text-xs font-bold">
                  !
                </div>
                <span className="font-bold text-sm text-zinc-900">
                  Unregistered Store ID Detected
                </span>
              </div>
              <button 
                onClick={() => {
                  if (unknownStoreInfo && unknownStoreInfo.allDrafts) {
                    unknownStoreInfo.allDrafts.forEach((d) => deleteR2PhotoUrls(d.photo_do_paper));
                  }
                  setIsUnknownStoreModalOpen(false);
                  setUnknownStoreInfo(null);
                  showToast("DO import cancelled.", "info");
                }}
                className="text-zinc-400 hover:text-zinc-600 focus:outline-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-3 text-xs">
              <p className="text-zinc-700 font-medium leading-relaxed">
                The following order(s) contain Store IDs that have not been registered in your Stores Database:
              </p>

              {/* Table of unregistered orders */}
              <div className="border border-slate-200 rounded-md overflow-hidden max-h-56 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-[#F8F9FA] sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600">DO Number</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600">Ref Number</th>
                      <th className="px-3 py-2 text-left font-semibold text-zinc-600">Store ID</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {unknownStoreInfo.unregisteredOrders.map((unreg, uIdx) => (
                      <tr key={uIdx} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2 font-mono text-[11px] font-medium text-zinc-900 whitespace-nowrap">
                          {unreg.doNumber || "-"}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-zinc-600 whitespace-nowrap">
                          {unreg.refNumber || "-"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-bold font-mono text-[11px]">
                            [{unreg.storeId}]
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[11px] text-zinc-600 flex flex-col gap-1 mt-1">
                <div><strong>Skip:</strong> Ignore all unregistered store orders and import only valid registered orders to drafts.</div>
                <div><strong>Continue:</strong> Import all orders to drafts using their original delivery name as normal.</div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center gap-2">
              <CustomButton 
                variant="secondary" 
                onClick={() => {
                  if (unknownStoreInfo) {
                    // Purge R2 files for drafts that are being skipped
                    const validSet = new Set(unknownStoreInfo.validDrafts.map(vd => vd.id));
                    const skippedDrafts = unknownStoreInfo.allDrafts.filter(ad => !validSet.has(ad.id));
                    skippedDrafts.forEach(sd => deleteR2PhotoUrls(sd.photo_do_paper));

                    if (unknownStoreInfo.validDrafts.length > 0) {
                      const mergedDrafts = [...drafts, ...unknownStoreInfo.validDrafts];
                      saveDraftsToStorage(mergedDrafts);
                      showToast(`Imported ${unknownStoreInfo.validDrafts.length} orders. Skipped ${unknownStoreInfo.unregisteredOrders.length} unregistered order(s).`, "info");
                    } else {
                      showToast(`Skipped ${unknownStoreInfo.unregisteredOrders.length} unregistered order(s). No valid orders to import.`, "info");
                    }
                  }
                  setIsUnknownStoreModalOpen(false);
                  setUnknownStoreInfo(null);
                }}
              >
                Skip
              </CustomButton>

              <div className="flex items-center gap-2">
                <CustomButton 
                  variant="dark" 
                  onClick={() => {
                    if (unknownStoreInfo && unknownStoreInfo.allDrafts.length > 0) {
                      const mergedDrafts = [...drafts, ...unknownStoreInfo.allDrafts];
                      saveDraftsToStorage(mergedDrafts);
                      showToast(`Successfully read DO. Added ${unknownStoreInfo.allDrafts.length} orders to drafts.`, "success");
                    }
                    setIsUnknownStoreModalOpen(false);
                    setUnknownStoreInfo(null);
                  }}
                >
                  Continue
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM FORCE CLOSE JOB CONFIRMATION MODAL */}
      {isForceCloseModalOpen && forceCloseDriverJob && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden animate-zoom-in">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <Square size={14} fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    Close Driver Job
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-medium">
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
                    Are you sure you want to end this driver's active job?
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-zinc-500 font-medium">Job Start Time:</span>
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
                    Closing Job...
                  </>
                ) : (
                  <>
                    <Square size={10} fill="currentColor" />
                    Confirm End Job
                  </>
                )}
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* ROUTE TIMELINE LOG MODAL */}
      {isRouteLogModalOpen && selectedRouteLogRecord && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-primary">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-zoom-in">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-[#0B57D0]/10 border border-[#0B57D0]/20 flex items-center justify-center text-[#0B57D0]">
                  <Route size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 leading-tight">
                    Route Timeline Log — {parseOutsourceDriverDetails(selectedRouteLogRecord.outsource_driver_details).formatted || selectedRouteLogRecord.driver}
                  </h3>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Job ID: {selectedRouteLogRecord.id} • Duration: {formatShiftDuration(selectedRouteLogRecord.start_time, selectedRouteLogRecord.end_time)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsRouteLogModalOpen(false);
                  setSelectedRouteLogRecord(null);
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
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
                    Job Started: {formatTimestamp(selectedRouteLogRecord.start_time)}
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

                          {/* Proof Photos (Signed DO, Supporting Images, Order Proofs) */}
                          {(() => {
                            const allPhotos: { url: string; label: string }[] = [];
                            if (log.signed_paper_img) {
                              allPhotos.push({ url: log.signed_paper_img, label: "Signed DO" });
                            }
                            if (Array.isArray(log.supporting_images)) {
                              log.supporting_images.forEach((img, sIdx) => {
                                if (img && typeof img === "string") {
                                  allPhotos.push({ url: img, label: `Photo #${sIdx + 1}` });
                                }
                              });
                            }
                            if (matched) {
                              const orderProofs = [
                                ...getLogImagesForAction("delivered", matched),
                                ...getLogImagesForAction("handover", matched),
                                ...getLogImagesForAction("signed", matched)
                              ];
                              for (const p of orderProofs) {
                                if (p && !allPhotos.some((ap) => ap.url === p)) {
                                  allPhotos.push({ url: p, label: "Delivery Proof" });
                                }
                              }
                            }

                            if (allPhotos.length === 0) return null;

                            return (
                              <div className="mt-2.5 flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {allPhotos.map((photo, pIdx) => (
                                    <div
                                      key={`modal-photo-${pIdx}`}
                                      onClick={() => setActiveLightboxImage(photo.url)}
                                      className="group relative w-14 h-14 rounded border border-emerald-300 overflow-hidden cursor-pointer hover:border-emerald-500 hover:shadow-xs transition-all bg-white flex-shrink-0"
                                      title={`Click to view ${photo.label} full size`}
                                    >
                                      <img
                                        src={photo.url}
                                        alt={photo.label}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[11px] text-emerald-800 font-semibold">
                                  📸 {allPhotos.length} Delivery Photo{allPhotos.length > 1 ? "s" : ""} Attached
                                </span>
                              </div>
                            );
                          })()}

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

      <datalist id="draft-store-datalist">
        {stores.map((s: any) => {
          const sId = String(s.id || "");
          const sName = String(s["Display Name"] || s.display_name || "");
          return (
            <option key={sId} value={sId}>
              {sName ? `${sId} - ${sName}` : sId}
            </option>
          );
        })}
      </datalist>

      {isInvoiceUploadChoiceOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 font-primary">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm shadow-xl border border-slate-200 animate-zoom-in">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <h3 className="text-sm font-bold text-zinc-900">Upload Invoice</h3>
              <button 
                onClick={() => setIsInvoiceUploadChoiceOpen(false)} 
                className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="py-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsInvoiceUploadChoiceOpen(false);
                  invoicePdfInputRef.current?.click();
                }}
                className="w-full py-2.5 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded text-xs font-semibold transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                Upload PDF Invoice
              </button>
              
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setIsInvoiceUploadChoiceOpen(false);
                    invoiceExcelInputRef.current?.click();
                  }}
                  className="w-3/4 py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-zinc-700 hover:text-zinc-950 rounded text-xs font-semibold transition-all flex items-center justify-center cursor-pointer shadow-2xs truncate"
                >
                  <span className="truncate">Upload Excel / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadInvoiceTemplate}
                  title="Download Excel Invoice Template"
                  className="w-1/4 py-2.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-zinc-600 hover:text-zinc-950 rounded text-xs font-semibold transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreditNoteUploadChoiceOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 font-primary">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm shadow-xl border border-slate-200 animate-zoom-in">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <h3 className="text-sm font-bold text-zinc-900">Upload Credit Note</h3>
              <button 
                onClick={() => setIsCreditNoteUploadChoiceOpen(false)} 
                className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="py-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsCreditNoteUploadChoiceOpen(false);
                  creditNotePdfInputRef.current?.click();
                }}
                className="w-full py-2.5 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded text-xs font-semibold transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                Upload PDF Credit Note
              </button>
              
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreditNoteUploadChoiceOpen(false);
                    creditNoteExcelInputRef.current?.click();
                  }}
                  className="w-3/4 py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-zinc-700 hover:text-zinc-950 rounded text-xs font-semibold transition-all flex items-center justify-center cursor-pointer shadow-2xs truncate"
                >
                  <span className="truncate">Upload Excel / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCreditNoteTemplate}
                  title="Download Excel Credit Note Template"
                  className="w-1/4 py-2.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-zinc-600 hover:text-zinc-950 rounded text-xs font-semibold transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDoUploadChoiceOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 font-primary">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm shadow-xl border border-slate-200 animate-zoom-in">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <h3 className="text-sm font-bold text-zinc-900">Upload Delivery Order</h3>
              <button 
                onClick={() => setIsDoUploadChoiceOpen(false)} 
                className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="py-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsDoUploadChoiceOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full py-2.5 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded text-xs font-semibold transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                Upload PDF DO
              </button>
              
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setIsDoUploadChoiceOpen(false);
                    doExcelInputRef.current?.click();
                  }}
                  className="w-3/4 py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-zinc-700 hover:text-zinc-950 rounded text-xs font-semibold transition-all flex items-center justify-center cursor-pointer shadow-2xs truncate"
                >
                  <span className="truncate">Upload Excel / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDoTemplate}
                  title="Download Excel DO Template"
                  className="w-1/4 py-2.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-zinc-600 hover:text-zinc-950 rounded text-xs font-semibold transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                >
                  <Download size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Return PDF File Input */}
      <input
        type="file"
        ref={returnPdfInputRef}
        accept=".pdf"
        className="hidden"
        onChange={handleReturnPdfSelect}
      />

      {/* VISUAL RETURN MAPPER MODAL */}
      {isReturnVisualMapperOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-primary select-none"
          onPointerMove={(e) => {
            if (!dragState || !visualMapperCanvasWrapperRef.current) return;
            const rect = visualMapperCanvasWrapperRef.current.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;

            const deltaXPercent = ((e.clientX - dragState.startX) / rect.width) * 100;
            const deltaYPercent = ((e.clientY - dragState.startY) / rect.height) * 100;

            const updateBox = (prev: ReturnBoundingBox): ReturnBoundingBox => {
              if (dragState.mode === "move") {
                const nextX = Math.max(0, Math.min(100 - prev.w, dragState.initialBox.x + deltaXPercent));
                const nextY = Math.max(0, Math.min(100 - prev.h, dragState.initialBox.y + deltaYPercent));
                return { ...prev, x: Math.round(nextX * 10) / 10, y: Math.round(nextY * 10) / 10 };
              } else {
                const nextW = Math.max(4, Math.min(100 - prev.x, dragState.initialBox.w + deltaXPercent));
                const nextH = Math.max(2, Math.min(100 - prev.y, dragState.initialBox.h + deltaYPercent));
                return { ...prev, w: Math.round(nextW * 10) / 10, h: Math.round(nextH * 10) / 10 };
              }
            };

            if (dragState.boxType === "ref") setReturnBoxRef(prev => updateBox(prev));
            if (dragState.boxType === "loc") setReturnBoxLoc(prev => updateBox(prev));
            if (dragState.boxType === "pos") setReturnBoxPos(prev => updateBox(prev));
          }}
          onPointerUp={() => {
            setDragState(null);
            updateCropPreviews();
          }}
        >
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-zoom-in">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Map Return Document Template</h3>
                <p className="text-xs text-zinc-500">
                  {returnMapperPdfFile?.name || "Return Document.pdf"} • {returnMapperTotalPages} Page{returnMapperTotalPages > 1 ? "s" : ""}
                </p>
              </div>

              <button
                type="button"
                disabled={isReturnParsing}
                onClick={() => setIsReturnVisualMapperOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Main Body (2 Columns: Left Canvas, Right Controls) */}
            <div className="flex-1 flex min-h-0 overflow-hidden divide-x divide-slate-200">
              
              {/* Left Column: PDF Canvas Preview */}
              <div className="flex-1 bg-slate-50 p-4 overflow-auto flex flex-col items-center justify-start relative">
                <div 
                  ref={visualMapperCanvasWrapperRef}
                  style={{
                    aspectRatio: `${returnMapperPageNaturalWidth} / ${returnMapperPageNaturalHeight}`
                  }}
                  className="relative max-w-[660px] w-full bg-white shadow-sm border border-slate-200 rounded overflow-hidden select-none"
                >
                  {/* PDF Page 1 Rendered Canvas */}
                  <canvas 
                    ref={page1CanvasRef}
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "block"
                    }}
                    className="pointer-events-none bg-white"
                  />

                    {/* 1. Ref Number Box (Blue) */}
                    <div
                      style={{
                        left: `${returnBoxRef.x}%`,
                        top: `${returnBoxRef.y}%`,
                        width: `${returnBoxRef.w}%`,
                        height: `${returnBoxRef.h}%`
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setActiveBoxType("ref");
                        setDragState({
                          mode: "move",
                          boxType: "ref",
                          startX: e.clientX,
                          startY: e.clientY,
                          initialBox: { ...returnBoxRef }
                        });
                      }}
                      className="absolute border-2 border-[#0B57D0] bg-[#0B57D0]/10 rounded-xs cursor-move z-20"
                    >
                      <div className="absolute -top-4.5 left-0 px-1.5 py-0.2 text-[9px] font-semibold text-white bg-[#0B57D0] rounded-t-xs whitespace-nowrap pointer-events-none shadow-2xs">
                        Ref Number
                      </div>
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setActiveBoxType("ref");
                          setDragState({
                            mode: "resize",
                            boxType: "ref",
                            startX: e.clientX,
                            startY: e.clientY,
                            initialBox: { ...returnBoxRef }
                          });
                        }}
                        className="w-2.5 h-2.5 bg-white border-2 border-[#0B57D0] rounded-xs absolute -bottom-1 -right-1 cursor-nwse-resize z-30"
                      />
                    </div>

                    {/* 2. Return Location Box (Blue) */}
                    <div
                      style={{
                        left: `${returnBoxLoc.x}%`,
                        top: `${returnBoxLoc.y}%`,
                        width: `${returnBoxLoc.w}%`,
                        height: `${returnBoxLoc.h}%`
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setActiveBoxType("loc");
                        setDragState({
                          mode: "move",
                          boxType: "loc",
                          startX: e.clientX,
                          startY: e.clientY,
                          initialBox: { ...returnBoxLoc }
                        });
                      }}
                      className="absolute border-2 border-[#0B57D0] bg-[#0B57D0]/10 rounded-xs cursor-move z-20"
                    >
                      <div className="absolute -top-4.5 left-0 px-1.5 py-0.2 text-[9px] font-semibold text-white bg-[#0B57D0] rounded-t-xs whitespace-nowrap pointer-events-none shadow-2xs">
                        Location
                      </div>
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setActiveBoxType("loc");
                          setDragState({
                            mode: "resize",
                            boxType: "loc",
                            startX: e.clientX,
                            startY: e.clientY,
                            initialBox: { ...returnBoxLoc }
                          });
                        }}
                        className="w-2.5 h-2.5 bg-white border-2 border-[#0B57D0] rounded-xs absolute -bottom-1 -right-1 cursor-nwse-resize z-30"
                      />
                    </div>

                    {/* 3. Postal Code Box (Blue) */}
                    <div
                      style={{
                        left: `${returnBoxPos.x}%`,
                        top: `${returnBoxPos.y}%`,
                        width: `${returnBoxPos.w}%`,
                        height: `${returnBoxPos.h}%`
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setActiveBoxType("pos");
                        setDragState({
                          mode: "move",
                          boxType: "pos",
                          startX: e.clientX,
                          startY: e.clientY,
                          initialBox: { ...returnBoxPos }
                        });
                      }}
                      className="absolute border-2 border-[#0B57D0] bg-[#0B57D0]/10 rounded-xs cursor-move z-20"
                    >
                      <div className="absolute -top-4.5 left-0 px-1.5 py-0.2 text-[9px] font-semibold text-white bg-[#0B57D0] rounded-t-xs whitespace-nowrap pointer-events-none shadow-2xs">
                        Postal Code
                      </div>
                      <div
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setActiveBoxType("pos");
                          setDragState({
                            mode: "resize",
                            boxType: "pos",
                            startX: e.clientX,
                            startY: e.clientY,
                            initialBox: { ...returnBoxPos }
                          });
                        }}
                        className="w-2.5 h-2.5 bg-white border-2 border-[#0B57D0] rounded-xs absolute -bottom-1 -right-1 cursor-nwse-resize z-30"
                      />
                    </div>

                  </div>
                </div>

              {/* Right Column: Clean & Flat Controls */}
              <div className="w-80 shrink-0 bg-white p-4 flex flex-col justify-between overflow-y-auto">
                
                <div className="space-y-4">
                  {/* Templates */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-800">
                        Template Preset
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSaveTemplateForm(!showSaveTemplateForm)}
                        className="text-xs text-[#0B57D0] hover:underline cursor-pointer"
                      >
                        {showSaveTemplateForm ? "Cancel" : "+ Save Preset"}
                      </button>
                    </div>

                    {showSaveTemplateForm ? (
                      <div className="space-y-1.5 pt-1">
                        <input
                          type="text"
                          placeholder="Template Name (e.g. FairPrice)"
                          value={newTemplateNameInput}
                          onChange={(e) => setNewTemplateNameInput(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#0B57D0]"
                        />
                        <button
                          type="button"
                          onClick={handleSaveReturnTemplate}
                          className="w-full py-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded text-xs font-medium cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={selectedTemplateId}
                          onChange={(e) => handleApplyReturnTemplate(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-zinc-800 focus:ring-1 focus:ring-[#0B57D0]"
                        >
                          <option value="">— Select Saved Template —</option>
                          {returnTemplates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        {selectedTemplateId && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReturnTemplate(selectedTemplateId)}
                            title="Delete Template"
                            className="p-1.5 text-zinc-400 hover:text-red-600 border border-slate-200 rounded cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Return Order Settings */}
                  <div className="space-y-3 pt-3 border-t border-slate-200">
                    <label className="text-xs font-semibold text-zinc-800 block">
                      Order Settings
                    </label>

                    <div>
                      <span className="text-xs text-zinc-600 block mb-1">
                        Collect Before Date
                      </span>
                      <input
                        type="date"
                        value={returnMapperCollectDate}
                        onChange={(e) => setReturnMapperCollectDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-zinc-800 focus:ring-1 focus:ring-[#0B57D0]"
                      />
                    </div>

                    <div>
                      <span className="text-xs text-zinc-600 block mb-1">
                        Collection Method
                      </span>
                      <select
                        value={returnMapperMethod}
                        onChange={(e) => setReturnMapperMethod(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-zinc-800 focus:ring-1 focus:ring-[#0B57D0]"
                      >
                        <option value="Company Vehicle">Company Vehicle</option>
                        <option value="Driver (Direct)">Driver (Direct)</option>
                        <option value="Van Outsource">Van Outsource</option>
                        <option value="Lorry Outsource">Lorry Outsource</option>
                        <option value="Self Collect">Self Collect</option>
                      </select>
                    </div>
                  </div>
                  {/* Cropped Sections Preview (Page 1) */}
                  <div className="space-y-2 pt-3 border-t border-slate-200">
                    <label className="text-xs font-semibold text-zinc-800 block">
                      Crop Preview (Page 1)
                    </label>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-medium block mb-0.5">Ref Number:</span>
                        {cropPreviewRef ? (
                          <div className="border border-slate-200 bg-white rounded p-1.5 flex items-center justify-center min-h-[46px] max-h-20 overflow-hidden shadow-2xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={cropPreviewRef} alt="Ref Crop" className="max-h-16 w-auto max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-9 bg-slate-100 rounded border border-dashed border-slate-200" />
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-zinc-500 font-medium block mb-0.5">Location:</span>
                        {cropPreviewLoc ? (
                          <div className="border border-slate-200 bg-white rounded p-1.5 flex items-center justify-center min-h-[46px] max-h-20 overflow-hidden shadow-2xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={cropPreviewLoc} alt="Location Crop" className="max-h-16 w-auto max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-9 bg-slate-100 rounded border border-dashed border-slate-200" />
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-zinc-500 font-medium block mb-0.5">Postal Code:</span>
                        {cropPreviewPos ? (
                          <div className="border border-slate-200 bg-white rounded p-1.5 flex items-center justify-center min-h-[46px] max-h-20 overflow-hidden shadow-2xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={cropPreviewPos} alt="Postal Code Crop" className="max-h-16 w-auto max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-9 bg-slate-100 rounded border border-dashed border-slate-200" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Real-time Extracted Page Values Log */}
                  {extractedPagesLog.length > 0 && (
                    <div className="space-y-1.5 pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs font-semibold text-zinc-800">
                        <span>Fetched Results ({extractedPagesLog.length}/{returnMapperTotalPages})</span>
                      </div>
                      <div className="max-h-44 overflow-y-auto border border-slate-200 rounded divide-y divide-slate-100 text-[11px] bg-slate-50/50">
                        {extractedPagesLog.map((item) => (
                          <div key={item.page} className="p-2 bg-white flex flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#0B57D0]">Page {item.page}</span>
                              <span className="font-mono text-[10px] text-zinc-600 bg-slate-100 px-1 py-0.2 rounded">
                                {item.poscode || "No Poscode"}
                              </span>
                            </div>
                            <div className="text-zinc-900 font-semibold truncate text-[11px]">
                              {item.refNumber || "—"}
                            </div>
                            <div className="text-zinc-500 truncate text-[10px]">
                              {item.location || "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Batch Action Buttons */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  {isReturnParsing ? (
                    <div className="space-y-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-[#0B57D0] font-medium">
                          <span className="flex items-center gap-1.5">
                            <Loader2 size={12} className="animate-spin" />
                            <span>Reading pages...</span>
                          </span>
                          <span>{returnParseProgress.current} / {returnParseProgress.total}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-[#0B57D0] h-full transition-all duration-200 rounded-full"
                            style={{
                              width: returnParseProgress.total > 0
                                ? `${Math.round((returnParseProgress.current / returnParseProgress.total) * 100)}%`
                                : "0%"
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate">{returnParseProgress.message}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          cancelExtractionRef.current = true;
                          showToast("Cancelling extraction...", "info");
                        }}
                        className="w-full py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold cursor-pointer transition-all shadow-xs"
                      >
                        Cancel Run
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleRunReturnBatchExtraction}
                        className="w-full py-2 px-3 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded text-xs font-semibold transition-all cursor-pointer shadow-xs"
                      >
                        Run Batch Extraction ({returnMapperTotalPages} Pages)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsReturnVisualMapperOpen(false)}
                        className="w-full py-1.5 px-3 bg-white hover:bg-slate-50 text-zinc-600 border border-slate-300 rounded text-xs font-medium cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CONFIRM REVOKE JOB */}
      {revokeJobModalOpen && targetRevokeJob && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden animate-zoom-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Revoke Job Package</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Reset orders and void claim token</p>
              </div>
              <button
                type="button"
                disabled={revokeLoading}
                onClick={() => {
                  setRevokeJobModalOpen(false);
                  setTargetRevokeJob(null);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs text-zinc-700">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900">Are you sure you want to revoke this job?</p>
                  <p className="text-amber-800 leading-relaxed">
                    This will invalidate token <strong className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300">{targetRevokeJob.token}</strong>. All uncompleted orders will have driver assignments removed and will be immediately reverted to <strong className="text-zinc-900">Ready to Deliver</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center text-zinc-600">
                  <span>Claim Token:</span>
                  <span className="font-mono font-bold text-[#0B57D0]">{targetRevokeJob.token}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-600">
                  <span>Assigned Driver:</span>
                  <span className="font-semibold text-zinc-800">{targetRevokeJob.driver || "Unclaimed"}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-600">
                  <span>Orders in Job:</span>
                  <span className="font-semibold text-zinc-800">
                    {(() => {
                      try {
                        const ids = typeof targetRevokeJob.order_ids === "string" ? JSON.parse(targetRevokeJob.order_ids) : (targetRevokeJob.order_ids || []);
                        return Array.isArray(ids) ? ids.length : (targetRevokeJob.total_orders || 0);
                      } catch (_) {
                        return targetRevokeJob.total_orders || 0;
                      }
                    })()} Orders
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 italic">
                * Any orders that have already been marked as Delivered or Completed will remain untouched.
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                disabled={revokeLoading}
                onClick={() => {
                  setRevokeJobModalOpen(false);
                  setTargetRevokeJob(null);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-zinc-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={revokeLoading}
                onClick={handleConfirmRevokeJob}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs disabled:opacity-50"
              >
                {revokeLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Confirm Revoke</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BLOCK DELETE WARNING (REVOKE FIRST) */}
      {blockDeleteModalOpen && targetBlockDeleteJob && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden animate-zoom-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Revoke Required Before Deleting</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Active or claimed job package</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBlockDeleteModalOpen(false);
                  setTargetBlockDeleteJob(null);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs text-zinc-700">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900">This job package cannot be deleted directly</p>
                  <p className="text-amber-800 leading-relaxed">
                    Job package <strong className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-amber-300">{targetBlockDeleteJob.token}</strong> is currently <strong>{targetBlockDeleteJob.status === "CLAIMED" ? "Claimed by a driver" : "Active / Open"}</strong>.
                  </p>
                </div>
              </div>

              <p className="text-zinc-600 leading-relaxed">
                To prevent orders from being stranded or orphaned in the driver system, you must first <strong>Revoke</strong> the job. Revoking unassigns the driver and safely resets uncompleted orders to <strong>Ready to Deliver</strong>.
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setBlockDeleteModalOpen(false);
                  setTargetBlockDeleteJob(null);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-zinc-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const jobToRevoke = targetBlockDeleteJob;
                  setBlockDeleteModalOpen(false);
                  setTargetBlockDeleteJob(null);
                  handleOpenRevokeJobModal(jobToRevoke);
                }}
                className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
              >
                <RotateCcw size={14} />
                <span>Revoke Job Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM DELETE JOB (AFTER REVOKED OR CANCELLED) */}
      {deleteJobModalOpen && targetDeleteJob && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md flex flex-col overflow-hidden animate-zoom-in">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Delete Job Package</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Permanent removal from job history</p>
              </div>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => {
                  setDeleteJobModalOpen(false);
                  setTargetDeleteJob(null);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs text-zinc-700">
              <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-lg flex items-start gap-3">
                <Trash2 size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-red-900">Permanently delete job history record?</p>
                  <p className="text-red-700 leading-relaxed">
                    This will delete the package record for token <strong className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-red-300">{targetDeleteJob.token}</strong>.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500">
                * Note: Individual order records in your database will not be deleted.
              </p>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => {
                  setDeleteJobModalOpen(false);
                  setTargetDeleteJob(null);
                }}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-zinc-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDeleteJob}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

