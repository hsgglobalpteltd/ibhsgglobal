"use client";

import * as React from "react";
import { fetchMyProfile, fetchAllUsers, UserProfile } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Users,
  UserCheck,
  BarChart3, 
  ChevronRight, 
  ChevronDown, 
  Calendar, 
  Plus, 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  X,
  Trash2,
  Search,
  Check,
  User,
  Pencil,
  Edit2,
  Settings,
  RotateCcw,
  AlertTriangle,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Link2,
  MessageSquare,
  ThumbsUp,
  Eye,
  Filter,
  CheckSquare,
  Inbox,
  Target,
  FolderKanban,
  ListTodo,
  Send,
  AtSign,
  Paperclip,
  CheckCircle,
  HelpCircle,
  Clock3,
  Upload
} from "lucide-react";

interface ActionLog {
  id: string;
  timestamp: string; // YYYY-MM-DD HH:mm or YYYY-MM-DD
  author: string;
  whatIDidTitle: string;
  whatIDidDesc: string;
  whatIsNext?: string;
  attachmentUrl?: string; // Attachment link (Drive, Doc, etc.)
  proofPhotoData?: string; // Uploaded proof image (base64 data URL or uploaded URL)
}

// Helper to highlight and turn @[MODULE_OR_RECORD_ID] into clickable links inside descriptions
function renderFormattedDescription(text: string) {
  if (!text) return null;
  // Match @words like @ACT_3453645674574754 or @Project 3 - Merchandiser App or @DOC_123
  const parts = text.split(/(@[A-Za-z0-9_\-]+)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("@") && part.length > 1) {
          const tagContent = part.slice(1);
          return (
            <a
              key={index}
              href={`#module-${tagContent}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Alert or route to module record
                console.log("Navigating to tagged entity:", tagContent);
              }}
              title={`Open and view ${part}`}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-[#0B57D0] hover:text-[#0842A0] font-bold font-mono text-[11px] border border-blue-200 transition-colors mx-0.5"
            >
              <AtSign size={10} className="stroke-[2.5]" />
              <span>{tagContent}</span>
              <ExternalLink size={9} className="opacity-70 ml-0.5" />
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

interface DummyTaskUpdate {
  id: string;
  taskTitle: string;
  actionTitle: string;
  updatedBy: string;
  timestamp: string; // YYYY-MM-DD or ISO timestamp
  status: "Completed";
  summary: string;
  proofNote?: string;
  proofLink?: string;
  proofPhotoUrl?: string;
}

interface DummyAction {
  id: string;
  title: string;
  assignee: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  status: "Completed" | "In Progress" | "To Do" | "Blocked";
  progress: number;
  logs?: ActionLog[]; // Daily execution feed & progress updates
}

interface DummyMilestone {
  id: string;
  title: string;
  lead: string;
  startDate: string;
  endDate: string;
  progress: number;
  actions: DummyAction[];
  updates?: DummyTaskUpdate[]; // Individual task execution updates with proof
}

interface DummyProject {
  id: string;
  title: string;
  department: string;
  manager: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: "Active" | "Planning" | "On Track" | "Delayed";
  milestones: DummyMilestone[];
  deletedAt?: number | null; // Timestamp once approved & moved into 30-day deletion pending queue
  deleteRequestedBy?: string | null; // Admin A who initiated the deletion request
  deleteRequestedByName?: string | null; // Display name of Admin A
  deleteRequestedAt?: number | null; // Timestamp when Admin A clicked delete
  deleteApprovedBy?: string | null; // Admin B who confirmed/approved the deletion
}

const DUMMY_PROJECTS: DummyProject[] = [
  {
    id: "proj-1",
    title: "Project Alpha: 7-Eleven Islandwide Rollout",
    department: "Supermarket & Chain Distribution",
    manager: "Alex Tan",
    startDate: "2026-01-01",
    endDate: "2026-06-30",
    progress: 68,
    status: "Active",
    milestones: [
      {
        id: "m-101",
        title: "Phase 1: Central Region Outlet Onboarding (120 Stores)",
        lead: "Sarah Lim",
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        progress: 100,
        actions: [
          { 
            id: "a-1", 
            title: "Conduct store POS barcode & SKU audit", 
            assignee: "David Lee", 
            startDate: "2026-01-05", 
            endDate: "2026-01-25", 
            status: "Completed", 
            progress: 100,
            logs: [
              {
                id: "log-1",
                timestamp: "2026-01-12 16:30",
                author: "David Lee",
                whatIDidTitle: "Completed barcode scanning for Central Cluster A (40 Stores)",
                whatIDidDesc: "Verified barcode scanning and pricing validation across Orchard, Bugis, and Dhoby Ghaut outlets using @ACT_711_CENTRAL. All 6 HSG SKUs successfully mapped in cash registers.",
                whatIsNext: "Proceed with Central Cluster B (remaining 80 outlets across CBD and Chinatown).",
                proofPhotoData: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=60",
                attachmentUrl: "https://docs.google.com/spreadsheets/d/audit-pos-7eleven-cluster-a"
              },
              {
                id: "log-2",
                timestamp: "2026-01-24 18:00",
                author: "David Lee",
                whatIDidTitle: "Finalized barcode scanning for Central Cluster B (80 Stores)",
                whatIDidDesc: "Completed remaining 80 stores under campaign @ACT_3453645674574754. Zero barcode mismatches found. Signed off by 7-Eleven Category Lead.",
                whatIsNext: "Handover audit sheets to logistics lead for tray placement.",
                attachmentUrl: "https://docs.google.com/spreadsheets/d/audit-pos-7eleven-cluster-b"
              }
            ]
          },
          { 
            id: "a-2", 
            title: "Deliver initial merchandising shelf trays", 
            assignee: "John Tan", 
            startDate: "2026-01-26", 
            endDate: "2026-02-20", 
            status: "Completed", 
            progress: 100,
            logs: [
              {
                id: "log-3",
                timestamp: "2026-02-18 14:15",
                author: "John Tan",
                whatIDidTitle: "Dispatched 120 custom acrylic trays from Tuas warehouse",
                whatIDidDesc: "Completed tray installations at eye-level shelf positions across all Central region outlets via @DISPATCH_TUAS_104.",
                whatIsNext: "Awaiting store managers replenishment purchase order submissions.",
                proofPhotoData: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60"
              }
            ]
          },
          { id: "a-3", title: "Verify stock receipts & first orders", assignee: "Sarah Lim", startDate: "2026-02-21", endDate: "2026-03-30", status: "Completed", progress: 100 }
        ],
        updates: [
          {
            id: "up-101",
            taskTitle: "Central Cluster A POS barcode scanning (40 Stores)",
            actionTitle: "Conduct store POS barcode & SKU audit",
            updatedBy: "David Lee",
            timestamp: "2026-01-12",
            status: "Completed",
            summary: "Completed barcode scanning and pricing validation across Orchard, Bugis, and Dhoby Ghaut outlets.",
            proofNote: "40 store manager verification slips signed. All 6 HSG SKUs successfully mapped in cash registers.",
            proofPhotoUrl: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=60",
            proofLink: "https://docs.google.com/spreadsheets/d/audit-pos-7eleven-cluster-a"
          },
          {
            id: "up-102",
            taskTitle: "Central Cluster B POS barcode scanning (80 Stores)",
            actionTitle: "Conduct store POS barcode & SKU audit",
            updatedBy: "David Lee",
            timestamp: "2026-01-24",
            status: "Completed",
            summary: "Finished remaining 80 outlets across CBD, Marina Bay, and Chinatown.",
            proofNote: "Zero barcode mismatches found. Sync approved by 7-Eleven Category Lead.",
            proofLink: "https://docs.google.com/spreadsheets/d/audit-pos-7eleven-cluster-b"
          },
          {
            id: "up-103",
            taskTitle: "Acrylic shelf trays logistics dispatch & placement",
            actionTitle: "Deliver initial merchandising shelf trays",
            updatedBy: "John Tan",
            timestamp: "2026-02-18",
            status: "Completed",
            summary: "Dispatched 120 custom acrylic trays from Tuas warehouse and installed at eye-level shelf positions.",
            proofNote: "Planogram compliance photos uploaded to project storage drive.",
            proofPhotoUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60"
          },
          {
            id: "up-104",
            taskTitle: "First replenishment PO endorsement & invoice settlement",
            actionTitle: "Verify stock receipts & first orders",
            updatedBy: "Sarah Lim",
            timestamp: "2026-03-28",
            status: "Completed",
            summary: "100% fulfill rate on initial purchase order wave (1,800 cartons delivered on schedule).",
            proofNote: "Delivery orders and invoices counter-signed by Dairy Farm procurement team.",
            proofLink: "https://drive.google.com/file/d/signed-do-batch-central"
          }
        ]
      },
      {
        id: "m-102",
        title: "Phase 2: East & West Regional Expansion (200 Stores)",
        lead: "Sarah Lim",
        startDate: "2026-04-01",
        endDate: "2026-06-30",
        progress: 45,
        actions: [
          { id: "a-4", title: "Merchandiser team briefing & route allocation", assignee: "Sarah Lim", startDate: "2026-04-01", endDate: "2026-04-15", status: "Completed", progress: 100 },
          { 
            id: "a-5", 
            title: "Install standalone endcap displays in top 50 outlets", 
            assignee: "David Lee", 
            startDate: "2026-04-16", 
            endDate: "2026-05-31", 
            status: "In Progress", 
            progress: 50,
            logs: [
              {
                id: "log-4",
                timestamp: "2026-05-02 11:20",
                author: "David Lee",
                whatIDidTitle: "Completed first batch: 12 display units installed in Jurong East",
                whatIDidDesc: "Mounted top shelving and branded header boards. Confirmed product facings and stock tags on @STORE_FAIRPRICE_JE01.",
                whatIsNext: "Move to Clementi and Bukit Batok clusters for the next 13 units.",
                proofPhotoData: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=60"
              },
              {
                id: "log-5",
                timestamp: "2026-05-10 17:45",
                author: "David Lee",
                whatIDidTitle: "Installed 13 display units across West cluster (Total 25/50 done)",
                whatIDidDesc: "Delivered acrylic stands and promotional shelf wobblers. Inspected by store supervisors via audit @AUDIT_WEST_09.",
                whatIsNext: "Install remaining 25 units in East region (Bedok, Tampines, Pasir Ris).",
                attachmentUrl: "https://drive.google.com/file/d/west-cluster-inspection-logs"
              }
            ]
          },
          { id: "a-6", title: "Final rollout compliance review & sign-off", assignee: "Alex Tan", startDate: "2026-06-01", endDate: "2026-06-30", status: "To Do", progress: 0 }
        ],
        updates: [
          {
            id: "up-105",
            taskTitle: "Merchandiser route planning & territory GPS assignment",
            actionTitle: "Merchandiser team briefing & route allocation",
            updatedBy: "Sarah Lim",
            timestamp: "2026-04-08",
            status: "Completed",
            summary: "Configured 14 territory routes inside iB Merchandiser App for East Coast & Jurong teams.",
            proofNote: "Route map PDF distributed and acknowledged by all 14 field merchandisers.",
            proofLink: "https://docs.google.com/presentation/d/route-allocation-briefing"
          },
          {
            id: "up-106",
            taskTitle: "Field kickoff meeting & shelf audit handbook distribution",
            actionTitle: "Merchandiser team briefing & route allocation",
            updatedBy: "Sarah Lim",
            timestamp: "2026-04-12",
            status: "Completed",
            summary: "Conducted physical briefing session at HSG HQ with sample display units.",
            proofNote: "Attendance sheet and training completion certificates signed.",
            proofPhotoUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=60"
          },
          {
            id: "up-107",
            taskTitle: "Top 25 West Cluster endcap display installations",
            actionTitle: "Install standalone endcap displays in top 50 outlets",
            updatedBy: "David Lee",
            timestamp: "2026-05-10",
            status: "Completed",
            summary: "Installed 25 high-visibility endcap display units across Jurong East, Clementi, and Bukit Batok.",
            proofNote: "Passed retailer store audit inspection with 100% compliance.",
            proofPhotoUrl: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=60"
          }
        ]
      }
    ]
  },
  {
    id: "proj-2",
    title: "Project Beta: TikTok Live Commerce & Food Brand Marketing",
    department: "Brand Marketing & Media",
    manager: "Marcus Wong",
    startDate: "2026-02-15",
    endDate: "2026-08-31",
    progress: 52,
    status: "On Track",
    milestones: [
      {
        id: "m-201",
        title: "KOL Influencer Sampling & Live Stream Schedule",
        lead: "Kenji Sato",
        startDate: "2026-02-15",
        endDate: "2026-05-15",
        progress: 75,
        actions: [
          { id: "a-7", title: "Send food tasting PR gift boxes to top 30 creators", assignee: "Kenji Sato", startDate: "2026-02-15", endDate: "2026-03-15", status: "Completed", progress: 100 },
          { id: "a-8", title: "Setup TikTok Shop mega deal bundle vouchers", assignee: "Alan Goh", startDate: "2026-03-16", endDate: "2026-04-30", status: "In Progress", progress: 60 },
          { id: "a-9", title: "Run 72-hour Flash Sale live stream production", assignee: "Kenji Sato", startDate: "2026-05-01", endDate: "2026-05-15", status: "To Do", progress: 0 }
        ],
        updates: [
          {
            id: "up-201",
            taskTitle: "Creator shortlisting & sample packaging customization",
            actionTitle: "Send food tasting PR gift boxes to top 30 creators",
            updatedBy: "Kenji Sato",
            timestamp: "2026-02-28",
            status: "Completed",
            summary: "Curated 30 high-engagement food review creators and packed frozen food tasting boxes with dry ice.",
            proofNote: "Creator contact sheet and tracking numbers verified.",
            proofLink: "https://docs.google.com/spreadsheets/d/creator-list-tiktok-2026"
          },
          {
            id: "up-202",
            taskTitle: "PR gift box courier dispatch & tracking confirmation",
            actionTitle: "Send food tasting PR gift boxes to top 30 creators",
            updatedBy: "Kenji Sato",
            timestamp: "2026-03-14",
            status: "Completed",
            summary: "30 PR boxes delivered with zero spoilage. 24 creators posted unboxing reels on TikTok.",
            proofNote: "Reached over 420,000 views across TikTok hashtag #HSGBrandReview.",
            proofPhotoUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&auto=format&fit=crop&q=60",
            proofLink: "https://www.tiktok.com/tag/hsgbrandreview"
          }
        ]
      },
      {
        id: "m-202",
        title: "TikTok Cold-Chain & Next-Day Express Dispatch",
        lead: "Elena Chen",
        startDate: "2026-05-16",
        endDate: "2026-08-31",
        progress: 20,
        actions: [
          { id: "a-10", title: "Setup J&T & NinjaVan direct webhook triggers", assignee: "Elena Chen", startDate: "2026-05-16", endDate: "2026-06-30", status: "In Progress", progress: 40 },
          { id: "a-11", title: "Real-time airway bill tracking sync portal", assignee: "Elena Chen", startDate: "2026-07-01", endDate: "2026-08-31", status: "To Do", progress: 0 }
        ],
        updates: [
          {
            id: "up-203",
            taskTitle: "Courier API Sandbox sandbox token validation",
            actionTitle: "Setup J&T & NinjaVan direct webhook triggers",
            updatedBy: "Elena Chen",
            timestamp: "2026-06-05",
            status: "Completed",
            summary: "Validated NinjaVan & J&T cold express tracking endpoints in Cloudflare Worker.",
            proofNote: "Automated webhook push test successful with 200 OK responses."
          }
        ]
      }
    ]
  },
  {
    id: "proj-3",
    title: "Project Gamma: Cold Room Warehouse & FEFO Lot Control",
    department: "Cold-Chain Logistics & Warehouse",
    manager: "Clara Tan",
    startDate: "2026-03-01",
    endDate: "2026-10-31",
    progress: 30,
    status: "Planning",
    milestones: [
      {
        id: "m-301",
        title: "Q1 Physical Stock Count & Expiry Date Reclassification",
        lead: "Ravi Kumar",
        startDate: "2026-03-01",
        endDate: "2026-05-31",
        progress: 60,
        actions: [
          { id: "a-12", title: "Chiller & Freezer physical lot count", assignee: "Ravi Kumar", startDate: "2026-03-01", endDate: "2026-03-31", status: "Completed", progress: 100 },
          { id: "a-13", title: "Reconcile variance and update Supabase records", assignee: "Ravi Kumar", startDate: "2026-04-01", endDate: "2026-04-30", status: "In Progress", progress: 50 },
          { id: "a-14", title: "Implement FEFO quarantine lot protocol", assignee: "Clara Tan", startDate: "2026-05-01", endDate: "2026-05-31", status: "To Do", progress: 0 }
        ],
        updates: [
          {
            id: "up-301",
            taskTitle: "Freezer Room A (-18°C) physical pallet barcode count",
            actionTitle: "Chiller & Freezer physical lot count",
            updatedBy: "Ravi Kumar",
            timestamp: "2026-03-15",
            status: "Completed",
            summary: "Scanned all 240 pallet positions in Freezer Room A. Lot numbers recorded.",
            proofNote: "Pallet tags reprinted and applied according to FIFO standard.",
            proofPhotoUrl: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&auto=format&fit=crop&q=60"
          },
          {
            id: "up-302",
            taskTitle: "Chiller Room B (+4°C) short shelf-life SKU audit",
            actionTitle: "Chiller & Freezer physical lot count",
            updatedBy: "Ravi Kumar",
            timestamp: "2026-03-29",
            status: "Completed",
            summary: "Completed short shelf-life inspection for dairy and fresh items.",
            proofNote: "Total variance across both rooms was less than 0.18%.",
            proofPhotoUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60"
          }
        ]
      },
      {
        id: "m-302",
        title: "Q3 Safety Stock Level Optimization & Dynamic Reorder",
        lead: "Clara Tan",
        startDate: "2026-06-01",
        endDate: "2026-10-31",
        progress: 0,
        actions: [
          { id: "a-15", title: "Calculate 90-day velocity lead time buffers", assignee: "Clara Tan", startDate: "2026-06-01", endDate: "2026-08-15", status: "To Do", progress: 0 },
          { id: "a-16", title: "Deploy automated PO generation thresholds", assignee: "Clara Tan", startDate: "2026-08-16", endDate: "2026-10-31", status: "To Do", progress: 0 }
        ],
        updates: []
      }
    ]
  }
];

// Helper: Standardize all visual date displays to dd/mm/yyyy per project rules
function formatDate(dateStr: string | number | Date | undefined | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// User Search & Select Dropdown Component
interface UserOption {
  email: string;
  name: string;
  role?: string;
}

function UserSearchSelectDropdown({
  value,
  onChange,
  users,
  placeholder = "Select or search user...",
  triggerClassName = "h-9",
}: {
  value: string;
  onChange: (val: string) => void;
  users: UserOption[];
  placeholder?: string;
  triggerClassName?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role && u.role.toLowerCase().includes(q))
    );
  }, [users, search]);

  const selectedUser = users.find(
    (u) => u.name === value || u.email === value || (u.name && value && u.name.toLowerCase() === value.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button - Clean single name display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 rounded-lg border border-slate-200 bg-white text-xs text-zinc-900 cursor-pointer flex items-center justify-between hover:border-slate-300 focus-within:border-[#0B57D0] focus-within:ring-2 focus-within:ring-[#0B57D0]/10 transition-all ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 truncate">
          <div className="w-5 h-5 rounded-full bg-blue-50 text-[#0B57D0] flex items-center justify-center shrink-0 text-[10px] font-semibold border border-blue-100">
            {selectedUser ? selectedUser.name.charAt(0).toUpperCase() : value ? value.charAt(0).toUpperCase() : <User size={11} />}
          </div>
          <span className={`truncate ${value ? "text-zinc-800 font-medium" : "text-zinc-400 font-normal"}`}>
            {selectedUser ? selectedUser.name : value || placeholder}
          </span>
        </div>
        <ChevronDown size={14} className={`text-zinc-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {/* Floating Dropdown Menu - Clean, uncrowded list */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-52">
          {/* Search Input Box */}
          <div className="p-2 border-b border-slate-100 bg-[#FAFAFC] flex items-center gap-2 shrink-0">
            <Search size={13} className="text-zinc-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user..."
              className="w-full bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            {search && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch("");
                }}
                className="text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* User List Options (Simple: Avatar Initial, Name, and Checkmark) */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-50 p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-zinc-400 text-xs font-normal">
                No matching users found
              </div>
            ) : (
              filtered.map((u) => {
                const isSelected = value === u.name || value === u.email;
                return (
                  <div
                    key={u.email}
                    onClick={() => {
                      onChange(u.name || u.email);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`px-3 py-2 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected ? "bg-[#D3E3FD]/60 text-[#0B57D0] font-medium" : "hover:bg-slate-50 text-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-5 h-5 rounded-full bg-blue-50 text-[#0B57D0] flex items-center justify-center shrink-0 text-[10px] font-semibold border border-blue-100">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs truncate">{u.name}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-[#0B57D0] shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StandaloneWorkspacePage() {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [systemUsers, setSystemUsers] = React.useState<UserOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeView, setActiveView] = React.useState<string | null>(null);

  // Gantt chart zoom mode: 'half' (6 Months / Multi-year) | 'quarter' (default) | 'month' | 'week'
  const [zoomMode, setZoomMode] = React.useState<"half" | "quarter" | "month" | "week">("quarter");

  // Status Filter: 'active' (Default: Active & Upcoming) | 'past' | 'all' | 'deleted' (30-day Retention Queue)
  const [statusFilter, setStatusFilter] = React.useState<"active" | "past" | "all" | "deleted">("active");

  // Today timestamp
  const todayMs = Date.now();

  // State-managed projects list initialized with dummy data
  const [projectsList, setProjectsList] = React.useState<DummyProject[]>(DUMMY_PROJECTS);

  // Gantt chart expanded states (Default: All projects and milestones open by default)
  const [expandedProjects, setExpandedProjects] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    DUMMY_PROJECTS.forEach(p => {
      initial[p.id] = true;
    });
    return initial;
  });
  const [expandedMilestones, setExpandedMilestones] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    DUMMY_PROJECTS.forEach(p => {
      p.milestones.forEach(m => {
        initial[m.id] = true;
      });
    });
    return initial;
  });

  // Modal dialog state for Create / Edit Project
  const [isAddProjectOpen, setIsAddProjectOpen] = React.useState(false);
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null);

  // Slide-Over Drawer State for Milestone Actions & Proof Timeline
  const [activeMilestoneDrawer, setActiveMilestoneDrawer] = React.useState<{
    milestone: DummyMilestone;
    projectTitle: string;
    projectManager: string;
  } | null>(null);

  // Filter inside Milestone Drawer: "all" vs "done"
  const [drawerStatusFilter, setDrawerStatusFilter] = React.useState<"all" | "done">("all");

  // Custom Confirmation Dialog State for 30-day queue deletion (NO native window confirmation)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = React.useState<{ id: string; title: string } | null>(null);

  // ----------------------------------------------------
  // TEAM LEADER HUB STATE
  // ----------------------------------------------------
  const [selectedLeaderFilter, setSelectedLeaderFilter] = React.useState<string | null>(null);
  const [selectedLeaderMilestoneId, setSelectedLeaderMilestoneId] = React.useState<string | null>("m-101");
  const [tlActionStatusFilter, setTlActionStatusFilter] = React.useState<"all" | "To Do" | "In Progress" | "Completed">("all");
  const [tlActionSearchQuery, setTlActionSearchQuery] = React.useState<string>("");
  const [isAddActionModalOpen, setIsAddActionModalOpen] = React.useState<boolean>(false);
  const [editingActionItem, setEditingActionItem] = React.useState<DummyAction | null>(null);
  const [formActionTitle, setFormActionTitle] = React.useState<string>("");
  const [formActionAssignee, setFormActionAssignee] = React.useState<string>("");
  const [formActionStartDate, setFormActionStartDate] = React.useState<string>("");
  const [formActionEndDate, setFormActionEndDate] = React.useState<string>("");
  const [formActionStatus, setFormActionStatus] = React.useState<"To Do" | "In Progress" | "Completed" | "Blocked">("To Do");
  const [formActionError, setFormActionError] = React.useState<string>("");
  const [proofReviewTarget, setProofReviewTarget] = React.useState<DummyTaskUpdate | null>(null);

  // ----------------------------------------------------
  // ACTION / TASK EXECUTION HUB STATE
  // ----------------------------------------------------
  const [selectedMemberFilter, setSelectedMemberFilter] = React.useState<string | null>(null);
  const [taskExecutionTab, setTaskExecutionTab] = React.useState<"all" | "To Do" | "In Progress" | "Completed">("all");
  const [taskSearchQuery, setTaskSearchQuery] = React.useState<string>("");
  const [activeTaskDrawer, setActiveTaskDrawer] = React.useState<{
    action: DummyAction;
    milestone: DummyMilestone;
    project: DummyProject;
  } | null>(null);
  const [logFormWhatTitle, setLogFormWhatTitle] = React.useState<string>("");
  const [logFormWhatDesc, setLogFormWhatDesc] = React.useState<string>("");
  const [logFormWhatNext, setLogFormWhatNext] = React.useState<string>("");
  const [logFormAttachmentUrl, setLogFormAttachmentUrl] = React.useState<string>("");
  const [logFormProofPhotoData, setLogFormProofPhotoData] = React.useState<string>("");
  const [logFormError, setLogFormError] = React.useState<string>("");
  const [taskCompleteConfirmTarget, setTaskCompleteConfirmTarget] = React.useState<{
    action: DummyAction;
    milestone: DummyMilestone;
    project: DummyProject;
  } | null>(null);

  // Form Fields State
  const [formProjectTitle, setFormProjectTitle] = React.useState("");
  const [formManager, setFormManager] = React.useState("");
  const [formStartDate, setFormStartDate] = React.useState("");
  const [formEndDate, setFormEndDate] = React.useState("");
  const [formError, setFormError] = React.useState("");

  interface MilestoneInputItem {
    id: string;
    title: string;
    lead: string;
    deadline: string;
    prepValue: number;
    prepUnit: "weeks" | "days";
  }

  const [milestonesInput, setMilestonesInput] = React.useState<MilestoneInputItem[]>([
    {
      id: "ms-1",
      title: "",
      lead: "",
      deadline: "",
      prepValue: 4,
      prepUnit: "weeks",
    }
  ]);

  const handleOpenAddProject = () => {
    setEditingProjectId(null);
    setFormProjectTitle("");
    setFormManager("");
    setFormStartDate("");
    setFormEndDate("");
    setFormError("");
    setMilestonesInput([
      {
        id: "ms-1",
        title: "",
        lead: "",
        deadline: "",
        prepValue: 4,
        prepUnit: "weeks",
      }
    ]);
    setIsAddProjectOpen(true);
  };

  const handleOpenEditProject = (proj: DummyProject) => {
    setEditingProjectId(proj.id);
    setFormProjectTitle(proj.title);
    setFormManager(proj.manager);
    setFormStartDate(proj.startDate);
    setFormEndDate(proj.endDate);
    setFormError("");

    if (proj.milestones && proj.milestones.length > 0) {
      setMilestonesInput(
        proj.milestones.map((m) => {
          const sMs = new Date(m.startDate).getTime();
          const eMs = new Date(m.endDate).getTime();
          const diffDays = Math.max(1, Math.round((eMs - sMs) / (1000 * 60 * 60 * 24)));
          const prepUnit: "weeks" | "days" = diffDays % 7 === 0 ? "weeks" : "days";
          const prepValue = prepUnit === "weeks" ? Math.max(1, Math.round(diffDays / 7)) : diffDays;

          return {
            id: m.id,
            title: m.title,
            lead: m.lead,
            deadline: m.endDate,
            prepValue: prepValue,
            prepUnit: prepUnit,
          };
        })
      );
    } else {
      setMilestonesInput([
        {
          id: "ms-1",
          title: "",
          lead: proj.manager || "",
          deadline: proj.endDate,
          prepValue: 4,
          prepUnit: "weeks",
        }
      ]);
    }
    setIsAddProjectOpen(true);
  };

  // 1. Admin A requests deletion (initiates 2-Admin approval process)
  const handleRequestProjectDeletion = (projId: string, projTitle: string) => {
    const currentAdminEmail = profile?.email || "admin.a@hsgglobal.com";
    const currentAdminName = profile?.name || "Admin A";

    setProjectsList((prev) =>
      prev.map((p) =>
        p.id === projId
          ? {
              ...p,
              deleteRequestedBy: currentAdminEmail,
              deleteRequestedByName: currentAdminName,
              deleteRequestedAt: Date.now(),
            }
          : p
      )
    );
    setDeleteConfirmTarget(null);
    setIsAddProjectOpen(false);
    setEditingProjectId(null);
  };

  // 2. Admin B approves deletion (moves project into 30-Day pending deletion queue)
  const handleApproveProjectDeletion = (projId: string, projTitle: string) => {
    const currentAdminEmail = profile?.email || "admin.b@hsgglobal.com";

    setProjectsList((prev) =>
      prev.map((p) =>
        p.id === projId
          ? {
              ...p,
              deletedAt: Date.now(),
              deleteApprovedBy: currentAdminEmail,
            }
          : p
      )
    );
    setDeleteConfirmTarget(null);
    setIsAddProjectOpen(false);
    setEditingProjectId(null);
  };

  // 3. Admin A or Admin B cancels the deletion request
  const handleCancelDeletionRequest = (projId: string, projTitle: string) => {
    setProjectsList((prev) =>
      prev.map((p) =>
        p.id === projId
          ? {
              ...p,
              deleteRequestedBy: null,
              deleteRequestedByName: null,
              deleteRequestedAt: null,
            }
          : p
      )
    );
    setDeleteConfirmTarget(null);
    setIsAddProjectOpen(false);
    setEditingProjectId(null);
  };

  // 4. Restore / Undelete from 30-day pending trash
  const handleRevokeDeletion = (projId: string) => {
    setProjectsList((prev) =>
      prev.map((p) =>
        p.id === projId
          ? {
              ...p,
              deletedAt: null,
              deleteRequestedBy: null,
              deleteRequestedByName: null,
              deleteRequestedAt: null,
              deleteApprovedBy: null,
            }
          : p
      )
    );
  };

  const addMilestoneRow = () => {
    setMilestonesInput(prev => [
      ...prev,
      {
        id: "ms-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
        title: "",
        lead: "",
        deadline: "",
        prepValue: 4,
        prepUnit: "weeks",
      }
    ]);
  };

  const removeMilestoneRow = (id: string) => {
    setMilestonesInput(prev => prev.filter(m => m.id !== id));
  };

  const updateMilestoneRow = (id: string, field: keyof MilestoneInputItem, value: any) => {
    setMilestonesInput(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjectTitle.trim()) {
      setFormError("Please provide a Project Name.");
      return;
    }
    if (!formStartDate || !formEndDate) {
      setFormError("Please specify both Start Date and Closing Date.");
      return;
    }
    if (new Date(formStartDate).getTime() > new Date(formEndDate).getTime()) {
      setFormError("Closing Date must be after Start Date.");
      return;
    }

    // Convert milestone inputs to DummyMilestone
    const parsedMilestones: DummyMilestone[] = milestonesInput
      .filter(m => m.title.trim() !== "")
      .map((m, index) => {
        let msStart = formStartDate;
        if (m.deadline) {
          const deadlineDate = new Date(m.deadline);
          const daysToSubtract = m.prepUnit === "weeks" ? (m.prepValue || 1) * 7 : (m.prepValue || 1);
          const computedStart = new Date(deadlineDate.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
          msStart = computedStart.toISOString().split("T")[0];
          if (msStart < formStartDate) msStart = formStartDate;
        }
        return {
          id: m.id.startsWith("ms-") ? `m-custom-${Date.now()}-${index}` : m.id,
          title: m.title.trim(),
          lead: m.lead.trim() || formManager.trim() || "Unassigned",
          startDate: msStart,
          endDate: m.deadline || formEndDate,
          progress: 0,
          actions: []
        };
      });

    if (editingProjectId) {
      // Update existing project
      setProjectsList(prev =>
        prev.map(p => {
          if (p.id === editingProjectId) {
            return {
              ...p,
              title: formProjectTitle.trim(),
              manager: formManager.trim() || profile?.name || "Project Manager",
              startDate: formStartDate,
              endDate: formEndDate,
              milestones: parsedMilestones,
            };
          }
          return p;
        })
      );
    } else {
      // Create new project
      const newProjObj: DummyProject = {
        id: `proj-${Date.now()}`,
        title: formProjectTitle.trim(),
        department: "Executive Strategy",
        manager: formManager.trim() || profile?.name || "Project Manager",
        startDate: formStartDate,
        endDate: formEndDate,
        progress: 0,
        status: "Active",
        milestones: parsedMilestones,
      };

      setProjectsList(prev => [newProjObj, ...prev]);
      setExpandedProjects(prev => ({ ...prev, [newProjObj.id]: true }));
    }

    setIsAddProjectOpen(false);
    setEditingProjectId(null);

    // Reset Form
    setFormProjectTitle("");
    setFormManager("");
    setFormStartDate("");
    setFormEndDate("");
    setFormError("");
    setMilestonesInput([
      {
        id: "ms-" + Date.now(),
        title: "",
        lead: "",
        deadline: "",
        prepValue: 4,
        prepUnit: "weeks",
      }
    ]);
  };

  // Fallback preset system users in case offline or initial load
  const availableUsers: UserOption[] = React.useMemo(() => {
    if (systemUsers.length > 0) return systemUsers;
    return [
      { name: "Alex Tan", email: "alex.tan@hsgglobal.com", role: "Administrator" },
      { name: "Sarah Lim", email: "sarah.lim@hsgglobal.com", role: "Team Leader" },
      { name: "David Wong", email: "david.wong@hsgglobal.com", role: "Operator" },
      { name: "Marcus Wong", email: "marcus.wong@hsgglobal.com", role: "Administrator" },
      { name: "Kenji Sato", email: "kenji.sato@hsgglobal.com", role: "Team Leader" },
      { name: "Elena Chen", email: "elena.chen@hsgglobal.com", role: "Team Leader" },
      { name: "Clara Tan", email: "clara.tan@hsgglobal.com", role: "Team Leader" },
      { name: "Ravi Kumar", email: "ravi.kumar@hsgglobal.com", role: "Operator" },
      { name: "Alan Goh", email: "alan.goh@hsgglobal.com", role: "Operator" },
    ];
  }, [systemUsers]);

  // Timeline horizontal scroll container ref for Option C (Auto-scroll to Today)
  const timelineScrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // 1. Initial immediate hydration from localStorage (for PIN Fast Login or fast navigation)
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ib_user_profile");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.email) {
            setProfile(parsed);
          }
        }
      } catch (e) {
        console.warn("Could not read cached user profile:", e);
      }
    }

    // 2. Firebase auth state listener
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const token = await user.getIdToken();
          const p = await fetchMyProfile(token, user.email || "");
          if (p) {
            setProfile(p);
            if (typeof window !== "undefined") {
              localStorage.setItem("ib_user_profile", JSON.stringify(p));
            }
          }

          // Fetch all system users for dropdown selection
          try {
            const users = await fetchAllUsers(token, user.email || "");
            if (Array.isArray(users) && users.length > 0) {
              setSystemUsers(
                users.map(u => ({
                  name: u.name || u.email.split("@")[0],
                  email: u.email,
                  role: u.role,
                }))
              );
            }
          } catch (ue) {
            console.warn("Could not fetch full users list (non-admin or offline):", ue);
          }
        } catch (e) {
          console.error("Auth profile error:", e);
        }
      } else {
        // Check if there is a valid PIN-authenticated session stored
        if (typeof window !== "undefined") {
          const cachedToken = localStorage.getItem("ib_auth_token");
          const cachedProfile = localStorage.getItem("ib_user_profile");
          if (cachedToken && cachedProfile) {
            try {
              const p = JSON.parse(cachedProfile);
              setProfile(p);
              const users = await fetchAllUsers(cachedToken, p.email || "");
              if (Array.isArray(users) && users.length > 0) {
                setSystemUsers(
                  users.map(u => ({
                    name: u.name || u.email.split("@")[0],
                    email: u.email,
                    role: u.role,
                  }))
                );
              }
            } catch (err) {
              console.warn("Fallback PIN profile fetch failed:", err);
            }
          }
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleBackToMain = () => {
    window.location.href = "/";
  };

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleMilestone = (id: string) => {
    setExpandedMilestones(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isAdmin = Boolean(
    profile?.role && profile.role.trim().toLowerCase() === "administrator"
  );

  // Filtered and Sorted projects: Active/Current and latest projects prioritized on top
  const filteredProjects = React.useMemo(() => {
    return projectsList
      .filter(p => {
        const isQueuedForDeletion = !!p.deletedAt;

        // If viewing 30-Day Deletion Queue Tab
        if (statusFilter === "deleted") {
          return isQueuedForDeletion;
        }

        // Hide soft-deleted projects from active / past / all tabs
        if (isQueuedForDeletion) return false;

        const isPast = new Date(p.endDate).getTime() < todayMs;
        if (statusFilter === "active" && isPast) return false;
        if (statusFilter === "past" && !isPast) return false;

        return true;
      })
      .sort((a, b) => {
        const aStart = new Date(a.startDate).getTime();
        const aEnd = new Date(a.endDate).getTime();
        const bStart = new Date(b.startDate).getTime();
        const bEnd = new Date(b.endDate).getTime();

        const aIsActive = aStart <= todayMs && aEnd >= todayMs;
        const bIsActive = bStart <= todayMs && bEnd >= todayMs;

        // 1. Ongoing active projects always come first
        if (aIsActive && !bIsActive) return -1;
        if (!aIsActive && bIsActive) return 1;

        // 2. Then upcoming projects (closest start date first)
        const aIsUpcoming = aStart > todayMs;
        const bIsUpcoming = bStart > todayMs;
        if (aIsUpcoming && bIsUpcoming) return aStart - bStart;

        // 3. For past projects, latest ended first
        return bEnd - aEnd;
      });
  }, [projectsList, statusFilter, todayMs]);

  // Multi-Year Range: 3 Years (2025 to 2027 - 36 Months / 156 Weeks)
  const chartStartMs = new Date("2025-01-01T00:00:00").getTime();
  const chartEndMs = new Date("2027-12-31T23:59:59").getTime();
  const totalDurationMs = chartEndMs - chartStartMs;

  // Zoom configurations: column definitions, width per unit, total timeline width
  const zoomConfig = React.useMemo(() => {
    if (zoomMode === "half") {
      // 3-Year Semester Mode: 2025, 2026 (current), 2027 (6 Semester Columns: S1 & S2)
      const cols = [
        { label: "2025 S1", sub: "Jan • Feb • Mar • Apr • May • Jun" },
        { label: "2025 S2", sub: "Jul • Aug • Sep • Oct • Nov • Dec" },
        { label: "2026 S1", sub: "Jan • Feb • Mar • Apr • May • Jun" },
        { label: "2026 S2", sub: "Jul • Aug • Sep • Oct • Nov • Dec" },
        { label: "2027 S1", sub: "Jan • Feb • Mar • Apr • May • Jun" },
        { label: "2027 S2", sub: "Jul • Aug • Sep • Oct • Nov • Dec" },
      ];
      return {
        columns: cols,
        colWidth: 320, // px per column
        totalWidth: cols.length * 320,
      };
    }

    if (zoomMode === "quarter") {
      // 3-Year Quarters: 2025 (Q1-Q4), 2026 (Q1-Q4), 2027 (Q1-Q4) = 12 Quarters
      const quarters = [
        { q: "Q1", sub: "Jan • Feb • Mar" },
        { q: "Q2", sub: "Apr • May • Jun" },
        { q: "Q3", sub: "Jul • Aug • Sep" },
        { q: "Q4", sub: "Oct • Nov • Dec" },
      ];
      const cols = [];
      for (const y of [2025, 2026, 2027]) {
        for (const item of quarters) {
          cols.push({
            label: `${y} ${item.q}`,
            sub: item.sub,
          });
        }
      }
      return {
        columns: cols,
        colWidth: 200,
        totalWidth: cols.length * 200,
      };
    }

    if (zoomMode === "month") {
      // 3-Year Months: 36 individual Months (Jan 2025 -> Dec 2027)
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const cols = [];
      for (const y of [2025, 2026, 2027]) {
        for (let m = 0; m < 12; m++) {
          const q = Math.floor(m / 3) + 1;
          cols.push({
            label: `${months[m]} ${y}`,
            sub: `Q${q}`,
          });
        }
      }
      return {
        columns: cols,
        colWidth: 120,
        totalWidth: cols.length * 120,
      };
    }

    // 3-Year Weeks: 156 Weeks across 3 years (2025, 2026, 2027)
    const cols = [];
    const monthShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    for (let w = 1; w <= 156; w++) {
      const year = w <= 52 ? "2025" : w <= 104 ? "2026" : "2027";
      const weekInYear = w <= 52 ? w : w <= 104 ? w - 52 : w - 104;
      const mIdx = Math.min(Math.floor((weekInYear - 1) / 4.33), 11);
      cols.push({
        label: `W${weekInYear}`,
        sub: `${monthShort[mIdx]} '${year.slice(2)}`,
      });
    }
    return {
      columns: cols,
      colWidth: 50,
      totalWidth: cols.length * 50,
    };
  }, [zoomMode]);

  // Calculate position percentage and exact pixels for bars
  const calculateBarStyle = (startStr: string, endStr: string) => {
    const sMs = new Date(startStr).getTime();
    const eMs = new Date(endStr).getTime();
    const leftPct = Math.max(0, Math.min(100, ((sMs - chartStartMs) / totalDurationMs) * 100));
    const widthPct = Math.max(0.5, Math.min(100 - leftPct, ((eMs - sMs) / totalDurationMs) * 100));
    return {
      left: `${(leftPct / 100) * zoomConfig.totalWidth}px`,
      width: `${Math.max(24, (widthPct / 100) * zoomConfig.totalWidth)}px`,
    };
  };

  // Today marker calculation (Sept 2026)
  const todayLeftPct = Math.max(0, Math.min(100, ((todayMs - chartStartMs) / totalDurationMs) * 100));
  const todayPixelLeft = (todayLeftPct / 100) * zoomConfig.totalWidth;
  const isTodayInChartRange = todayMs >= chartStartMs && todayMs <= chartEndMs;

  // Track if Today is scrolled off-screen to the left or right to show floating jump button
  const [todayOffscreen, setTodayOffscreen] = React.useState<"left" | "right" | null>(null);

  const updateTodayVisibility = React.useCallback(() => {
    if (!timelineScrollRef.current) return;
    const { scrollLeft, clientWidth } = timelineScrollRef.current;
    if (todayPixelLeft < scrollLeft - 10) {
      setTodayOffscreen("left");
    } else if (todayPixelLeft > scrollLeft + clientWidth + 10) {
      setTodayOffscreen("right");
    } else {
      setTodayOffscreen(null);
    }
  }, [todayPixelLeft]);

  // Option C: Auto-scroll to today function (smooth when clicked)
  const scrollToToday = React.useCallback(() => {
    if (!timelineScrollRef.current) return;
    const container = timelineScrollRef.current;
    const scrollTarget = todayPixelLeft - container.clientWidth / 2;
    container.scrollTo({
      left: Math.max(0, scrollTarget),
      behavior: "smooth",
    });
  }, [todayPixelLeft]);

  // Anchor zoom to Today instantly ONLY when zoomMode or activeView changes (not on user scroll)
  React.useLayoutEffect(() => {
    if (activeView === "management" && timelineScrollRef.current) {
      const container = timelineScrollRef.current;
      const scrollTarget = todayPixelLeft - container.clientWidth / 2;
      container.scrollLeft = Math.max(0, scrollTarget);
      setTodayOffscreen(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomMode, activeView]);

  const accessCards = [
    {
      id: "management",
      title: "Project",
      subtitle: "Portfolio Governance",
      description: "Master timeline Gantt chart, portfolio governance, project schedules, and horizon tracking.",
      icon: <FolderKanban size={28} className="text-[#0B57D0]" />,
      badge: "Master View",
      adminOnly: false,
    },
    {
      id: "team_leader",
      title: "Milestone / Target",
      subtitle: "Operational Goals",
      description: "Milestone operational planning, action breakdown, delegation, and completion proof verification.",
      icon: <Target size={28} className="text-[#0B57D0]" />,
      badge: "Milestones",
      adminOnly: false,
    },
    {
      id: "team_member",
      title: "Action / Task",
      subtitle: "Execution & Proofs",
      description: "Personal action checklist, task execution, daily updates, and photo proof submissions.",
      icon: <ListTodo size={28} className="text-[#0B57D0]" />,
      badge: "Tasks",
      adminOnly: false,
    },
  ];

  // If loading user profile
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8F9FC] font-primary select-none">
        <span className="text-xs font-bold text-zinc-500 animate-pulse">Loading Workspace...</span>
      </div>
    );
  }

  // If inside Management view: Straight Gantt Chart
  if (activeView === "management") {
    return (
      <div className="h-screen w-full bg-[#FAFAFC] font-primary select-none flex flex-col overflow-hidden">
        {/* Simplified, Clean Minimal Top Bar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 shadow-2xs">
          {/* Left Title & Back (Clean, No Icon) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveView(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-base font-semibold text-zinc-900">Management Portfolio</h1>
              <span className="text-xs text-zinc-400 font-normal">2025 – 2027</span>
            </div>
          </div>

          {/* Right Clean Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Status Segmented Buttons */}
            <div className="flex items-center bg-[#F1F3F4] p-0.5 rounded-lg border border-slate-200/80 text-xs font-medium">
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === "active"
                    ? "bg-white text-[#0B57D0] shadow-2xs font-medium"
                    : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("past")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === "past"
                    ? "bg-white text-[#0B57D0] shadow-2xs font-medium"
                    : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                Past
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-white text-[#0B57D0] shadow-2xs font-medium"
                    : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                All
              </button>
              {/* Deleted / Retention Queue Tab */}
              <button
                type="button"
                onClick={() => setStatusFilter("deleted")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === "deleted"
                    ? "bg-white text-rose-600 shadow-2xs font-medium"
                    : "text-zinc-600 hover:text-rose-600 font-normal"
                }`}
                title="Projects queued for 30-day deletion"
              >
                <span>Trash</span>
                {projectsList.filter(p => !!p.deletedAt).length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold flex items-center justify-center">
                    {projectsList.filter(p => !!p.deletedAt).length}
                  </span>
                )}
              </button>
            </div>

            {/* Clean Zoom Segmented Control */}
            <div className="flex items-center bg-[#F1F3F4] p-0.5 rounded-lg border border-slate-200/80 text-xs font-medium">
              <button
                type="button"
                onClick={() => setZoomMode("half")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  zoomMode === "half" ? "bg-white text-[#0B57D0] shadow-2xs font-medium" : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                Semester
              </button>
              <button
                type="button"
                onClick={() => setZoomMode("quarter")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  zoomMode === "quarter" ? "bg-white text-[#0B57D0] shadow-2xs font-medium" : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                Quarter
              </button>
              <button
                type="button"
                onClick={() => setZoomMode("month")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  zoomMode === "month" ? "bg-white text-[#0B57D0] shadow-2xs font-medium" : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                Month
              </button>
              <button
                type="button"
                onClick={() => setZoomMode("week")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  zoomMode === "week" ? "bg-white text-[#0B57D0] shadow-2xs font-medium" : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                Week
              </button>
            </div>

            {/* + Add Project Primary Button */}
            <button
              type="button"
              onClick={handleOpenAddProject}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium cursor-pointer shadow-2xs transition-all active:scale-95"
            >
              <Plus size={14} /> Add Project
            </button>
          </div>
        </div>

        {/* Master Gantt Chart Container (Two-Pane Sticky Layout) */}
        <div className="flex-1 min-h-0 overflow-hidden p-3 flex flex-col bg-[#FAFAFC]">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 flex overflow-hidden">
            
            {/* LEFT FIXED PANE: Hierarchy Structure (Projects & Milestones with Lead By Column) */}
            <div className="w-[430px] shrink-0 border-r border-slate-200 flex flex-col bg-white z-20 shadow-2xs">
              {/* Left Header with Dedicated 'Lead By', 'Progress' and Actions Columns */}
              <div className="h-12 px-3 bg-[#FAFAFB] border-b border-slate-200 flex items-center justify-between text-[11px] font-medium text-zinc-500 shrink-0">
                <span className="flex-1">Structure</span>
                <span className="w-20 text-left font-medium shrink-0">Lead By</span>
                <span className="w-10 text-right font-medium shrink-0">Prog</span>
                <span className="w-8 text-right font-medium shrink-0"></span>
              </div>

              {/* Left Body Rows */}
              <div className="flex-1 overflow-y-hidden divide-y divide-slate-100">
                {filteredProjects.map((proj) => (
                  <React.Fragment key={proj.id}>
                    {/* Project Row Title with Single Gear Setting Action */}
                    <div className="h-12 px-3 flex items-center justify-between gap-2 bg-white hover:bg-blue-50/40 transition-colors group/projrow">
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                        <button
                          type="button"
                          onClick={() => toggleProject(proj.id)}
                          className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                          {expandedProjects[proj.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#0B57D0] shrink-0" />
                        <span className="text-xs font-medium text-zinc-900 truncate" title={proj.title}>
                          {proj.title}
                        </span>
                        {proj.deletedAt ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium shrink-0">
                            In Trash
                          </span>
                        ) : proj.deleteRequestedBy ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium shrink-0" title={`Deletion requested by ${proj.deleteRequestedByName || 'Admin A'}`}>
                            ⏳ Delete Requested by {proj.deleteRequestedByName || 'Admin A'}
                          </span>
                        ) : null}
                      </div>
                      <span className="w-20 text-xs font-normal text-zinc-500 truncate shrink-0" title={`Project Manager: ${proj.manager}`}>
                        {proj.manager}
                      </span>
                      <span className="w-10 text-right text-[11px] font-medium text-[#0B57D0] shrink-0">
                        {proj.progress}%
                      </span>
                      {/* Action Button: Gear Icon to open Edit/Manage Modal */}
                      <div className="w-8 flex items-center justify-end shrink-0">
                        {proj.deletedAt ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevokeDeletion(proj.id);
                            }}
                            className="w-6 h-6 rounded-md hover:bg-emerald-50 text-emerald-600 flex items-center justify-center cursor-pointer transition-colors"
                            title="Restore Project from Trash"
                          >
                            <RotateCcw size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditProject(proj);
                            }}
                            className="w-6 h-6 rounded-md hover:bg-slate-100 text-zinc-400 hover:text-zinc-800 flex items-center justify-center cursor-pointer transition-colors"
                            title="Project Settings & Edit"
                          >
                            <Settings size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Milestone Rows Title (With Expandable Action Sub-rows & Clickable to Open Action Drawer) */}
                    {expandedProjects[proj.id] && proj.milestones.map((ms) => (
                      <React.Fragment key={ms.id}>
                        <div
                          onClick={() => {
                            setActiveMilestoneDrawer({
                              milestone: ms,
                              projectTitle: proj.title,
                              projectManager: proj.manager,
                            });
                            setDrawerStatusFilter("all");
                          }}
                          className={`h-10 px-3 pl-6 flex items-center justify-between gap-2 transition-colors border-t border-slate-100/80 cursor-pointer group/msrow ${
                            activeMilestoneDrawer?.milestone.id === ms.id
                              ? "bg-[#D3E3FD]/40 text-[#0B57D0]"
                              : "bg-[#FCFCFD] hover:bg-amber-50/50"
                          }`}
                          title="Click to view milestone actions and proof attachments"
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMilestone(ms.id);
                              }}
                              className="w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-zinc-700 cursor-pointer"
                            >
                              {expandedMilestones[ms.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                            <span className="text-amber-500 text-xs shrink-0 group-hover/msrow:scale-110 transition-transform">🎯</span>
                            <span className={`text-xs font-normal truncate ${activeMilestoneDrawer?.milestone.id === ms.id ? "text-[#0B57D0] font-medium" : "text-zinc-800"}`} title={ms.title}>
                              {ms.title}
                            </span>
                          </div>
                          {/* Clean 'Lead By' text */}
                          <span className="w-20 text-xs font-normal text-zinc-600 truncate shrink-0" title={ms.lead}>
                            {ms.lead}
                          </span>
                          <span className="w-10 text-right text-[11px] font-normal text-zinc-500 shrink-0">
                            {ms.progress}%
                          </span>
                          <div className="w-8 shrink-0 flex items-center justify-end text-zinc-300 group-hover/msrow:text-[#0B57D0]">
                            <ChevronRight size={13} />
                          </div>
                        </div>

                        {/* 3. Action Sub-rows in Left Hierarchy Tree */}
                        {expandedMilestones[ms.id] && ms.actions && ms.actions.map((act) => (
                          <div
                            key={act.id}
                            className="h-8 px-3 pl-12 flex items-center justify-between gap-2 bg-white/70 hover:bg-slate-50 border-t border-slate-100/60 text-xs group/actrow"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                              <span className="text-zinc-300 text-[10px] shrink-0">↳</span>
                              <span className="text-[11.5px] text-zinc-600 truncate group-hover/actrow:text-zinc-900" title={act.title}>
                                {act.title}
                              </span>
                            </div>
                            <span className="w-20 text-[11px] text-zinc-400 truncate shrink-0" title={act.assignee}>
                              {act.assignee}
                            </span>
                            <span className="w-10 text-right text-[10.5px] text-zinc-400 shrink-0">
                              {act.progress}%
                            </span>
                            <div className="w-8 shrink-0" />
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* RIGHT SCROLLABLE TIMELINE PANE (With Scalable Grid & Full-Height Subtle Today Line) */}
            <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
              
              {/* Floating Back-to-Today Buttons when Today is off-screen */}
              {todayOffscreen === "left" && (
                <button
                  type="button"
                  onClick={scrollToToday}
                  className="absolute left-4 bottom-5 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-xs hover:bg-rose-50 text-rose-700 border border-rose-200 shadow-md text-xs font-medium transition-all cursor-pointer hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-left-2 duration-200"
                  title="Scroll left to Today"
                >
                  <ArrowLeft size={13} className="text-rose-600 animate-pulse" />
                  <span>Today</span>
                </button>
              )}

              {todayOffscreen === "right" && (
                <button
                  type="button"
                  onClick={scrollToToday}
                  className="absolute right-4 bottom-5 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-xs hover:bg-rose-50 text-rose-700 border border-rose-200 shadow-md text-xs font-medium transition-all cursor-pointer hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-right-2 duration-200"
                  title="Scroll right to Today"
                >
                  <span>Today</span>
                  <ArrowRight size={13} className="text-rose-600 animate-pulse" />
                </button>
              )}

              <div 
                ref={timelineScrollRef} 
                onScroll={updateTodayVisibility}
                className="flex-1 overflow-x-auto overflow-y-auto flex flex-col relative"
              >
                <div style={{ width: `${zoomConfig.totalWidth}px` }} className="min-w-full flex-1 flex flex-col relative">
                  
                  {/* Subtle Full-Height Vertical TODAY Indicator */}
                  {isTodayInChartRange && (
                    <div
                      className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center -translate-x-1/2"
                      style={{ left: `${todayPixelLeft}px` }}
                    >
                      <div className="sticky top-0 bg-rose-500/80 text-white text-[8px] font-medium px-1.5 py-0.5 rounded-b shadow-2xs uppercase tracking-wider z-40">
                        Today
                      </div>
                      <div className="w-[1px] flex-1 bg-rose-400/40 border-l border-dashed border-rose-400/50" />
                    </div>
                  )}

                  {/* 3-Year Master Dynamic Timeline Header */}
                  <div className="h-12 border-b border-slate-200 flex bg-[#FAFAFB] sticky top-0 z-30 divide-x divide-slate-200 shrink-0">
                    {zoomConfig.columns.map((col, idx) => (
                      <div
                        key={idx}
                        style={{ width: `${zoomConfig.colWidth}px` }}
                        className="shrink-0 p-1.5 text-center flex flex-col justify-center bg-slate-50/50 select-none"
                      >
                        <div className="text-[10.5px] font-medium text-zinc-700 truncate">{col.label}</div>
                        {col.sub && <div className="text-[8.5px] text-zinc-400 font-normal truncate">{col.sub}</div>}
                      </div>
                    ))}
                  </div>

                  {/* Timeline Canvas Body with Background Grid Lines */}
                  <div className="flex-1 relative divide-y divide-slate-100 min-h-0">
                    
                    {/* Vertical Background Grid Columns */}
                    <div className="absolute inset-0 flex divide-x divide-slate-100 pointer-events-none">
                      {zoomConfig.columns.map((_, i) => (
                        <div key={i} style={{ width: `${zoomConfig.colWidth}px` }} className="shrink-0 h-full" />
                      ))}
                    </div>

                    {/* Timeline Bar Rows with Past/Active State Colors */}
                    {filteredProjects.map((proj) => {
                      const isPast = new Date(proj.endDate).getTime() < todayMs;
                      const isActive = !isPast && new Date(proj.startDate).getTime() <= todayMs;
                      const projStartMs = new Date(proj.startDate).getTime();
                      const projEndMs = new Date(proj.endDate).getTime();
                      const projDuration = Math.max(1, projEndMs - projStartMs);

                      return (
                        <React.Fragment key={proj.id}>
                          {/* 1. Project Bar Row */}
                          <div className={`h-12 relative flex items-center transition-colors ${
                            isPast ? "bg-slate-50/50 opacity-60" : "bg-white hover:bg-blue-50/20"
                          }`}>
                            <div
                              className={`absolute h-6 rounded-md text-white text-[10px] font-medium flex items-center px-3 z-10 transition-colors ${
                                isPast 
                                  ? "bg-slate-400 text-slate-100" 
                                  : isActive 
                                    ? "bg-[#0B57D0]" 
                                    : "bg-blue-600"
                              }`}
                              style={calculateBarStyle(proj.startDate, proj.endDate)}
                            >
                              <span className="truncate pr-4">{proj.title} • {proj.progress}%</span>

                              {/* Milestone Deadline Small White Ball Indicators */}
                              {proj.milestones.map((ms) => {
                                const msEndMs = new Date(ms.endDate).getTime();
                                const offsetPct = Math.max(2, Math.min(98, ((msEndMs - projStartMs) / projDuration) * 100));

                                return (
                                  <div
                                    key={ms.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMilestoneDrawer({
                                        milestone: ms,
                                        projectTitle: proj.title,
                                        projectManager: proj.manager,
                                      });
                                      setDrawerStatusFilter("all");
                                    }}
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group/msdot flex items-center justify-center cursor-pointer"
                                    style={{ left: `${offsetPct}%` }}
                                  >
                                    {/* Small White Ball */}
                                    <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 shadow-xs hover:scale-125 transition-transform" />

                                    {/* Small Hover Text Tooltip */}
                                    <div className="hidden group-hover/msdot:flex absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-zinc-900 text-white text-[9.5px] font-normal whitespace-nowrap shadow-lg z-30 pointer-events-none items-center gap-1.5">
                                      <span className="font-medium text-amber-300">🎯 {ms.title}</span>
                                      <span className="text-zinc-400">•</span>
                                      <span className="text-zinc-300">{ms.lead}</span>
                                      <span className="text-zinc-400">•</span>
                                      <span className="text-zinc-300">{formatDate(ms.endDate)}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 2. Milestone Bar Rows */}
                          {expandedProjects[proj.id] && proj.milestones.map((ms) => {
                            const isMsPast = new Date(ms.endDate).getTime() < todayMs;
                            const isMsActive = !isMsPast && new Date(ms.startDate).getTime() <= todayMs;

                            return (
                              <React.Fragment key={ms.id}>
                                <div
                                  onClick={() => {
                                    setActiveMilestoneDrawer({
                                      milestone: ms,
                                      projectTitle: proj.title,
                                      projectManager: proj.manager,
                                    });
                                    setDrawerStatusFilter("all");
                                  }}
                                  className={`h-10 relative flex items-center transition-colors border-t border-slate-100 cursor-pointer ${
                                    isMsPast ? "bg-slate-50/40 opacity-60" : "bg-white hover:bg-slate-50/40"
                                  }`}
                                  title="Click to view actions and verification timeline"
                                >
                                  <div
                                    className={`absolute h-5 rounded-md text-white text-[9px] font-normal flex items-center px-2.5 overflow-hidden truncate z-10 cursor-pointer transition-transform hover:scale-[1.01] ${
                                      isMsPast 
                                        ? "bg-slate-400 text-slate-100" 
                                        : isMsActive 
                                          ? "bg-blue-600 font-medium" 
                                          : "bg-blue-500"
                                    }`}
                                    style={calculateBarStyle(ms.startDate, ms.endDate)}
                                  >
                                    <span className="truncate">{ms.title}</span>
                                  </div>
                                </div>

                                {/* 3. Action Sub-bars on Timeline Canvas */}
                                {expandedMilestones[ms.id] && ms.actions && ms.actions.map((act) => {
                                  const isActPast = new Date(act.endDate).getTime() < todayMs;
                                  const isActActive = !isActPast && new Date(act.startDate).getTime() <= todayMs;

                                  return (
                                    <div
                                      key={act.id}
                                      className="h-8 relative flex items-center bg-slate-50/30 border-t border-slate-100/60"
                                    >
                                      <div
                                        className={`absolute h-3.5 rounded text-white text-[8px] font-normal flex items-center px-1.5 overflow-hidden truncate z-10 ${
                                          act.status === "Completed"
                                            ? "bg-emerald-600 font-medium"
                                            : isActActive
                                            ? "bg-blue-500"
                                            : "bg-slate-400"
                                        }`}
                                        style={calculateBarStyle(act.startDate, act.endDate)}
                                        title={`${act.title} (${act.assignee})`}
                                      >
                                        <span className="truncate">{act.title}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Milestone Actions & Verification Timeline Slide-Over Drawer */}
        {activeMilestoneDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-2xs animate-in fade-in duration-200">
            {/* Backdrop click to close */}
            <div 
              className="flex-1" 
              onClick={() => setActiveMilestoneDrawer(null)} 
            />

            {/* Slide-over Drawer Panel */}
            <div className="w-full max-w-[680px] h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-250 ease-out z-10 font-primary">
              
              {/* Drawer Top Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-[#FAFAFB] flex flex-col gap-3 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium truncate">
                      <span>{activeMilestoneDrawer.projectTitle}</span>
                      <span>•</span>
                      <span className="text-zinc-600 font-normal">PM: {activeMilestoneDrawer.projectManager}</span>
                    </div>
                    <h2 className="text-base font-bold text-zinc-950 flex items-center gap-2 leading-snug">
                      <span className="text-amber-500 shrink-0 text-lg">🎯</span>
                      <span>{activeMilestoneDrawer.milestone.title}</span>
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveMilestoneDrawer(null)}
                    className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title="Close Drawer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Milestone Meta Stats Bar */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200/70 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col shadow-2xs">
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Lead In Charge</span>
                    <span className="text-xs font-semibold text-zinc-800 truncate mt-0.5">
                      {activeMilestoneDrawer.milestone.lead}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col shadow-2xs">
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Target Due</span>
                    <span className="text-xs font-medium text-zinc-700 truncate mt-0.5">
                      {formatDate(activeMilestoneDrawer.milestone.endDate)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col shadow-2xs">
                    <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Completed Tasks</span>
                    <span className="text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>{activeMilestoneDrawer.milestone.updates?.length || 0} Done</span>
                    </span>
                  </div>
                </div>

                {/* Sub-header title */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <Clock size={13} className="text-[#0B57D0]" />
                    <span>Completed Execution Logs & Proofs</span>
                  </span>
                  <span className="text-[11px] text-zinc-400 font-normal">
                    Chronological Log
                  </span>
                </div>

              </div>

              {/* Drawer Scrollable Timeline Body (Displaying individual completed task updates) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFC]">
                {(() => {
                  const updatesList = (activeMilestoneDrawer.milestone.updates || [])
                    .slice()
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                  if (updatesList.length === 0) {
                    return (
                      <div className="py-20 flex flex-col items-center justify-center text-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-zinc-400">
                          <CheckCircle2 size={24} />
                        </div>
                        <p className="text-xs font-medium text-zinc-600">No completed tasks yet</p>
                        <p className="text-[11px] text-zinc-400 max-w-xs">
                          There are no verified completed task logs recorded under this milestone.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {updatesList.map((item) => {
                        const dateObj = new Date(item.timestamp);
                        const day = dateObj.toLocaleDateString("en-GB", { day: "2-digit" });
                        const month = dateObj.toLocaleDateString("en-GB", { month: "short" });
                        const year = dateObj.toLocaleDateString("en-GB", { year: "numeric" });

                        return (
                          <div key={item.id} className="flex items-start gap-4 group/task">
                            
                            {/* Left Side: Dedicated Date Column */}
                            <div className="w-20 shrink-0 flex flex-col items-end text-right pt-0.5">
                              <span className="text-xs font-bold text-zinc-900 leading-tight">
                                {day} {month}
                              </span>
                              <span className="text-[10px] font-medium text-zinc-400">
                                {year}
                              </span>
                            </div>

                            {/* Middle: Timeline Vertical Line & Node Checkmark */}
                            <div className="relative flex flex-col items-center shrink-0 self-stretch">
                              {/* Green Node Check Dot */}
                              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-4 ring-[#FAFAFC] z-10 shadow-2xs">
                                <Check size={12} className="stroke-[3]" />
                              </div>
                              {/* Connecting vertical line below node */}
                              <div className="w-[2px] flex-1 bg-emerald-200/80 my-1" />
                            </div>

                            {/* Right Side: Task Execution & Proof Card */}
                            <div className="flex-1 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 p-4 shadow-xs transition-all flex flex-col gap-3 min-w-0">
                              
                              {/* Card Top Row: Task Name & Completion Tag */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <span className="text-[10px] font-semibold text-[#0B57D0] uppercase tracking-wider truncate">
                                    {item.actionTitle}
                                  </span>
                                  <h3 className="text-xs font-bold text-zinc-900 leading-snug">
                                    {item.taskTitle}
                                  </h3>
                                </div>

                                {/* Done Tag */}
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 flex items-center gap-1">
                                  <Check size={10} className="stroke-[3]" /> Done
                                </span>
                              </div>

                              {/* Author & Timestamp Bar */}
                              <div className="flex items-center gap-2 text-[10.5px] text-zinc-500 bg-[#F8F9FB] px-2.5 py-1.5 rounded-lg border border-slate-100">
                                <span className="flex items-center gap-1">
                                  <User size={11} className="text-zinc-400" />
                                  <span className="text-zinc-500">Completed by:</span>
                                  <strong className="font-semibold text-zinc-800">{item.updatedBy}</strong>
                                </span>
                              </div>

                              {/* Summary description */}
                              {item.summary && (
                                <p className="text-xs text-zinc-700 leading-relaxed font-normal">
                                  {item.summary}
                                </p>
                              )}

                              {/* Proof Details Section */}
                              {(item.proofNote || item.proofPhotoUrl || item.proofLink) && (
                                <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-2.5">
                                  
                                  {/* Proof Remark Note */}
                                  {item.proofNote && (
                                    <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100/80 text-xs text-zinc-700 leading-relaxed font-normal">
                                      <span className="font-semibold text-emerald-800 mr-1">Verification:</span>
                                      {item.proofNote}
                                    </div>
                                  )}

                                  {/* Attachments Action Buttons */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    {item.proofLink && (
                                      <a
                                        href={item.proofLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/80 hover:bg-blue-100 text-[#0B57D0] border border-blue-200 text-[11px] font-medium transition-colors cursor-pointer"
                                      >
                                        <Link2 size={12} />
                                        <span>Verification Document</span>
                                        <ExternalLink size={10} className="text-[#0B57D0]/70" />
                                      </a>
                                    )}

                                    {item.proofPhotoUrl && (
                                      <a
                                        href={item.proofPhotoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-medium transition-colors cursor-pointer"
                                      >
                                        <ImageIcon size={12} />
                                        <span>Photo Proof</span>
                                        <ExternalLink size={10} className="text-emerald-700/70" />
                                      </a>
                                    )}
                                  </div>

                                  {/* Image Preview */}
                                  {item.proofPhotoUrl && (
                                    <a 
                                      href={item.proofPhotoUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="relative rounded-lg overflow-hidden border border-slate-200 mt-1 max-h-48 block group/img"
                                    >
                                      <img
                                        src={item.proofPhotoUrl}
                                        alt={item.taskTitle}
                                        className="w-full h-40 object-cover transition-transform group-hover/img:scale-105"
                                      />
                                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                                        Click to view photo in new tab
                                      </div>
                                    </a>
                                  )}

                                </div>
                              )}

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Drawer Footer */}
              <div className="px-5 py-3 border-t border-slate-200 bg-[#FAFAFB] flex items-center justify-between shrink-0">
                <span className="text-[11px] text-zinc-500 font-normal">
                  Milestone Task History
                </span>
                <button
                  type="button"
                  onClick={() => setActiveMilestoneDrawer(null)}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-medium cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

      {/* Add / Edit Project Custom Popup Modal Dialog */}
      {isAddProjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Dialog Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-[#FAFAFB] shrink-0">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  {editingProjectId ? "Edit Project" : "Create New Project"}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5 font-normal">
                  {editingProjectId
                    ? "Modify project timeline horizon, manager in charge, and milestone directives."
                    : "Define project horizon, manager in charge, closing date, and milestone directives."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddProjectOpen(false);
                  setEditingProjectId(null);
                  setFormError("");
                }}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Dialog Form Body (Scrollable with generous bottom padding for dropdown expansion) */}
            <form onSubmit={handleSaveProject} id="add-project-form" className="p-6 pb-28 overflow-y-auto flex flex-col gap-6 text-xs">
              
              {/* Error Banner */}
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Project Essentials Section */}
              <div className="flex flex-col gap-3.5">
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  1. Project Essentials
                </div>

                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-700">Project Name <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      value={formProjectTitle}
                      onChange={(e) => setFormProjectTitle(e.target.value)}
                      placeholder="e.g. Project Delta: Singapore Hypermarket Distribution Rollout"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/10 transition-all shadow-2xs"
                      required
                    />
                  </div>

                  {/* 1 Single Row Grid: Project Manager, Start Date, Closing Date */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-700">Project Manager</label>
                      <UserSearchSelectDropdown
                        value={formManager}
                        onChange={(val) => setFormManager(val)}
                        users={availableUsers}
                        placeholder="Search manager..."
                        triggerClassName="h-9"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-700">Start Date <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-zinc-900 outline-none focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/10 transition-all cursor-pointer shadow-2xs"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-700">Closing Date <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-zinc-900 outline-none focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/10 transition-all cursor-pointer shadow-2xs"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Milestones & Executive Directives Section */}
              <div className="flex flex-col gap-3.5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                      2. Milestones & Preparation Directives
                    </div>
                    <p className="text-[11px] text-zinc-400 font-normal mt-0.5">
                      Set milestone deliverables, team leaders, deadlines, and allocated preparation lead time.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addMilestoneRow}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-zinc-50 text-[#0B57D0] text-xs font-medium cursor-pointer shadow-2xs transition-all active:scale-95 shrink-0"
                  >
                    <Plus size={13} /> Add Milestone
                  </button>
                </div>

                {/* Milestone Rows List */}
                <div className="flex flex-col gap-3">
                  {milestonesInput.map((msItem, idx) => (
                    <div
                      key={msItem.id}
                      className="p-3.5 rounded-xl border border-slate-200/90 bg-[#FAFAFC] hover:border-slate-300 flex flex-col gap-3 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs text-amber-500 font-medium shrink-0">🎯 Milestone #{idx + 1}</span>
                          <input
                            type="text"
                            value={msItem.title}
                            onChange={(e) => updateMilestoneRow(msItem.id, "title", e.target.value)}
                            placeholder="Milestone description (e.g. Phase 1: Outlet Audit & First Stock Drop)"
                            className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0]/20 shadow-2xs"
                          />
                        </div>
                        {milestonesInput.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMilestoneRow(msItem.id)}
                            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                            title="Remove milestone"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Milestone Grid: Team Leader, Deadline, Preparation Lead Time */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-normal text-zinc-500">Team Leader In Charge</label>
                          <UserSearchSelectDropdown
                            value={msItem.lead}
                            onChange={(val) => updateMilestoneRow(msItem.id, "lead", val)}
                            users={availableUsers}
                            placeholder="Select Team Leader..."
                            triggerClassName="h-8.5"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-normal text-zinc-500">Target Deadline</label>
                          <input
                            type="date"
                            value={msItem.deadline}
                            onChange={(e) => updateMilestoneRow(msItem.id, "deadline", e.target.value)}
                            className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-zinc-800 outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0]/20 cursor-pointer shadow-2xs"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-normal text-zinc-500">Preparation Lead Time</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={52}
                              value={msItem.prepValue}
                              onChange={(e) => updateMilestoneRow(msItem.id, "prepValue", parseInt(e.target.value) || 1)}
                              className="w-16 h-8.5 px-2 rounded-lg border border-slate-200 bg-white text-xs text-zinc-800 outline-none focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0]/20 shadow-2xs"
                            />
                            <select
                              value={msItem.prepUnit}
                              onChange={(e) => updateMilestoneRow(msItem.id, "prepUnit", e.target.value as "weeks" | "days")}
                              className="flex-1 h-8.5 px-2 rounded-lg border border-slate-200 bg-white text-xs text-zinc-700 outline-none cursor-pointer focus:border-[#0B57D0] shadow-2xs"
                            >
                              <option value="weeks">Weeks prior</option>
                              <option value="days">Days prior</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </form>

            {/* Dialog Footer with Dynamic 2-Admin Deletion and Standard Edit Controls */}
            {(() => {
              const currentProj = editingProjectId ? projectsList.find(p => p.id === editingProjectId) : null;
              const isDeleteRequested = Boolean(currentProj?.deleteRequestedBy);
              const requestedByEmail = currentProj?.deleteRequestedBy || "";
              const requestedByName = currentProj?.deleteRequestedByName || "Admin A";
              const currentAdminEmail = profile?.email || "admin.a@hsgglobal.com";
              const isAdminA = !requestedByEmail || requestedByEmail === currentAdminEmail || currentAdminEmail.includes("admin.a");

              return (
                <div className="px-6 py-3.5 bg-[#FAFAFB] border-t border-slate-200 flex items-center justify-between shrink-0">
                  <div>
                    {currentProj && (
                      isDeleteRequested ? (
                        isAdminA ? (
                          /* Admin A View: Disabled Delete Requested button (matching Delete styling) + regular gray text Undo Delete */
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 text-xs font-medium cursor-not-allowed opacity-80"
                            >
                              <Trash2 size={13} />
                              <span>Delete Requested</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCancelDeletionRequest(currentProj.id, currentProj.title)}
                              className="text-xs text-zinc-500 hover:text-zinc-800 hover:underline font-normal cursor-pointer transition-colors"
                            >
                              Undo Delete
                            </button>
                          </div>
                        ) : (
                          /* Admin B View: Accept / Decline buttons + small note "This project is delete by Admin A" */
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApproveProjectDeletion(currentProj.id, currentProj.title)}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer shadow-2xs transition-all active:scale-95"
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelDeletionRequest(currentProj.id, currentProj.title)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-medium cursor-pointer transition-all active:scale-95"
                              >
                                Decline
                              </button>
                            </div>
                            <span className="text-[11px] text-zinc-500 font-normal">
                              This project is delete by <strong className="text-zinc-700">{requestedByName}</strong>
                            </span>
                          </div>
                        )
                      ) : (
                        /* Initial State: Delete button triggers custom confirmation popup */
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmTarget({ id: currentProj.id, title: currentProj.title })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 text-xs font-medium cursor-pointer transition-all active:scale-95"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isDeleteRequested ? (
                      /* When in deleting / pending approval mode: show single Close button, remove Save Changes */
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddProjectOpen(false);
                          setEditingProjectId(null);
                          setFormError("");
                        }}
                        className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium cursor-pointer transition-all"
                      >
                        Close
                      </button>
                    ) : (
                      /* Standard Mode: Cancel & Save Changes / Create */
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddProjectOpen(false);
                            setEditingProjectId(null);
                            setFormError("");
                          }}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium cursor-pointer transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          form="add-project-form"
                          className="px-4 py-1.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium cursor-pointer shadow-2xs transition-all active:scale-95"
                        >
                          {editingProjectId ? "Save Changes" : "Create & Launch Project"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Custom Clean Confirmation Popup for Initial Deletion Request */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <AlertTriangle size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-zinc-900">Confirm Project Deletion Request</h3>
                <p className="text-xs text-zinc-500 font-normal leading-relaxed">
                  Are you sure you want to request deletion for <strong className="text-zinc-800">"{deleteConfirmTarget.title}"</strong>? A second Administrator must accept before it is moved to Trash.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRequestProjectDeletion(deleteConfirmTarget.id, deleteConfirmTarget.title)}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer shadow-2xs transition-all active:scale-95"
              >
                Yes, Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Management View End */}
    </div>
  );
}

  // ----------------------------------------------------
  // TEAM LEADER VIEW: Operational Hub
  // ----------------------------------------------------
  if (activeView === "team_leader") {
    // Current user identifier
    const currentUserName = profile?.name || "Sarah Lim";

    // Gather all active milestones from active projects
    const allMilestonesRaw: Array<{
      milestone: DummyMilestone;
      project: DummyProject;
    }> = [];

    projectsList
      .filter((p) => !p.deletedAt)
      .forEach((proj) => {
        proj.milestones.forEach((ms) => {
          allMilestonesRaw.push({
            milestone: ms,
            project: proj,
          });
        });
      });

    // Extract list of all unique team leads across milestones
    const uniqueLeads = Array.from(new Set(allMilestonesRaw.map((item) => item.milestone.lead).filter(Boolean)));

    // Check if the current user has any assigned milestones
    const userHasAssignedMilestones = allMilestonesRaw.some(
      (item) => item.milestone.lead.toLowerCase() === currentUserName.toLowerCase()
    );

    // Default for Admin: own assigned name if available, otherwise first available lead or "All"
    const adminDefaultLeader = userHasAssignedMilestones ? currentUserName : (uniqueLeads[0] || "All");
    const activeAdminFilter = selectedLeaderFilter !== null ? selectedLeaderFilter : adminDefaultLeader;

    // Active leader filter: for Admin, can switch or view all; for operator/team leader, strictly their own name ONLY
    const effectiveLeaderFilter = isAdmin ? activeAdminFilter : currentUserName;

    // Filter milestones for this leader
    const allMilestonesWithProject = allMilestonesRaw.filter((item) => {
      if (isAdmin && effectiveLeaderFilter === "All") return true;
      return item.milestone.lead.toLowerCase() === effectiveLeaderFilter.toLowerCase();
    });

    // If no milestone selected or selected milestone is not in current filtered list, select the first available one
    const activeLeaderMilestoneData =
      allMilestonesWithProject.find((item) => item.milestone.id === selectedLeaderMilestoneId) ||
      allMilestonesWithProject[0] ||
      null;

    const currentMilestone = activeLeaderMilestoneData?.milestone;
    const currentProject = activeLeaderMilestoneData?.project;

    // Filter actions under current active milestone
    const currentActions = currentMilestone ? currentMilestone.actions || [] : [];
    const filteredActions = currentActions.filter((act) => {
      const matchStatus = tlActionStatusFilter === "all" || act.status === tlActionStatusFilter;
      const matchQuery =
        !tlActionSearchQuery ||
        act.title.toLowerCase().includes(tlActionSearchQuery.toLowerCase()) ||
        act.assignee.toLowerCase().includes(tlActionSearchQuery.toLowerCase());
      return matchStatus && matchQuery;
    });

    // Calculate overall milestone progress stats
    const totalActionsCount = currentActions.length;
    const completedActionsCount = currentActions.filter((a) => a.status === "Completed").length;
    const milestoneUpdatesList = currentMilestone?.updates || [];

    // Pending Proof Submissions / Review queue from completed task updates
    const allPendingReviews = allMilestonesWithProject.flatMap((item) =>
      (item.milestone.updates || []).map((up) => ({
        ...up,
        projectTitle: item.project.title,
        milestoneTitle: item.milestone.title,
      }))
    );

    // Handlers for Action Add / Edit
    const handleOpenAddAction = () => {
      setEditingActionItem(null);
      setFormActionTitle("");
      setFormActionAssignee("");
      setFormActionStartDate(currentMilestone?.startDate || "");
      setFormActionEndDate(currentMilestone?.endDate || "");
      setFormActionStatus("To Do");
      setFormActionError("");
      setIsAddActionModalOpen(true);
    };

    const handleOpenEditAction = (action: DummyAction) => {
      setEditingActionItem(action);
      setFormActionTitle(action.title);
      setFormActionAssignee(action.assignee);
      setFormActionStartDate(action.startDate);
      setFormActionEndDate(action.endDate);
      setFormActionStatus(action.status);
      setFormActionError("");
      setIsAddActionModalOpen(true);
    };

    const handleSaveActionSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formActionTitle.trim()) {
        setFormActionError("Please enter an action title.");
        return;
      }
      if (!currentMilestone || !currentProject) return;

      if (editingActionItem) {
        // Update existing action
        setProjectsList((prev) =>
          prev.map((proj) => {
            if (proj.id !== currentProject.id) return proj;
            return {
              ...proj,
              milestones: proj.milestones.map((ms) => {
                if (ms.id !== currentMilestone.id) return ms;
                const updatedActions = ms.actions.map((act) => {
                  if (act.id !== editingActionItem.id) return act;
                  return {
                    ...act,
                    title: formActionTitle.trim(),
                    assignee: formActionAssignee.trim() || "Unassigned",
                    startDate: formActionStartDate || ms.startDate,
                    endDate: formActionEndDate || ms.endDate,
                    status: formActionStatus,
                    progress: formActionStatus === "Completed" ? 100 : formActionStatus === "In Progress" ? 50 : 0,
                  };
                });
                const total = updatedActions.length;
                const comp = updatedActions.filter((a) => a.status === "Completed").length;
                const msProgress = total > 0 ? Math.round((comp / total) * 100) : 0;
                return {
                  ...ms,
                  actions: updatedActions,
                  progress: msProgress,
                };
              }),
            };
          })
        );
      } else {
        // Create new action under current milestone
        const newAction: DummyAction = {
          id: `act-${Date.now()}`,
          title: formActionTitle.trim(),
          assignee: formActionAssignee.trim() || "Unassigned",
          startDate: formActionStartDate || currentMilestone.startDate,
          endDate: formActionEndDate || currentMilestone.endDate,
          status: formActionStatus,
          progress: formActionStatus === "Completed" ? 100 : formActionStatus === "In Progress" ? 50 : 0,
        };

        setProjectsList((prev) =>
          prev.map((proj) => {
            if (proj.id !== currentProject.id) return proj;
            return {
              ...proj,
              milestones: proj.milestones.map((ms) => {
                if (ms.id !== currentMilestone.id) return ms;
                const updatedActions = [...ms.actions, newAction];
                const total = updatedActions.length;
                const comp = updatedActions.filter((a) => a.status === "Completed").length;
                const msProgress = total > 0 ? Math.round((comp / total) * 100) : 0;
                return {
                  ...ms,
                  actions: updatedActions,
                  progress: msProgress,
                };
              }),
            };
          })
        );
      }

      setIsAddActionModalOpen(false);
      setEditingActionItem(null);
    };

    const handleDeleteAction = (actionId: string) => {
      if (!currentMilestone || !currentProject) return;
      setProjectsList((prev) =>
        prev.map((proj) => {
          if (proj.id !== currentProject.id) return proj;
          return {
            ...proj,
            milestones: proj.milestones.map((ms) => {
              if (ms.id !== currentMilestone.id) return ms;
              const updatedActions = ms.actions.filter((a) => a.id !== actionId);
              const total = updatedActions.length;
              const comp = updatedActions.filter((a) => a.status === "Completed").length;
              const msProgress = total > 0 ? Math.round((comp / total) * 100) : 0;
              return {
                ...ms,
                actions: updatedActions,
                progress: msProgress,
              };
            }),
          };
        })
      );
    };

    // Calculate unique team workload
    const teamWorkloadMap: Record<string, { active: number; completed: number }> = {};
    allMilestonesWithProject.forEach((item) => {
      item.milestone.actions.forEach((act) => {
        const name = act.assignee || "Unassigned";
        if (!teamWorkloadMap[name]) {
          teamWorkloadMap[name] = { active: 0, completed: 0 };
        }
        if (act.status === "Completed") {
          teamWorkloadMap[name].completed += 1;
        } else {
          teamWorkloadMap[name].active += 1;
        }
      });
    });

    return (
      <div className="h-screen w-full bg-[#FAFAFC] font-primary select-none flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 shadow-2xs">
          {/* Left Title & Back */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveView(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-base font-semibold text-zinc-900">Team Leader Operational Hub</h1>
              <span className="text-xs text-zinc-400 font-normal">Milestones & Action Delegation</span>
            </div>
          </div>

          {/* Right Controls: Leader Perspective (Admin) + Create Action */}
          <div className="flex items-center gap-2.5">
            {/* If Admin: Leader Perspective Selector */}
            {isAdmin && uniqueLeads.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#F8F9FB] px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                <span className="text-[11px] text-zinc-500 font-medium">Viewing Lead:</span>
                <select
                  value={activeAdminFilter}
                  onChange={(e) => {
                    setSelectedLeaderFilter(e.target.value);
                  }}
                  className="bg-transparent font-semibold text-[#0B57D0] focus:outline-none cursor-pointer"
                >
                  <option value="All">All Team Leads ({uniqueLeads.length})</option>
                  {uniqueLeads.map((leadName) => (
                    <option key={leadName} value={leadName}>
                      {leadName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isAdmin && (
              <div className="flex items-center gap-1.5 bg-blue-50/70 px-2.5 py-1 rounded-lg border border-blue-100 text-xs font-medium text-[#0B57D0]">
                <User size={12} />
                <span>Assigned to: <strong>{currentUserName}</strong></span>
              </div>
            )}

            <button
              type="button"
              onClick={handleOpenAddAction}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium cursor-pointer shadow-2xs transition-all active:scale-95"
            >
              <Plus size={14} />
              <span>Add Action</span>
            </button>
          </div>
        </div>

        {/* 3-COLUMN MAIN WORKSPACE AREA */}
        <div className="flex-1 flex overflow-hidden min-h-0 divide-x divide-slate-200">
          
          {/* COLUMN 1: ASSIGNED MILESTONES (300px) */}
          <div className="w-[300px] shrink-0 bg-white flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-[#FAFAFB] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-amber-500 text-sm">🎯</span>
                <span className="text-xs font-bold text-zinc-900">Assigned Milestones</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-zinc-600">
                {allMilestonesWithProject.length} Active
              </span>
            </div>

            {/* Milestones Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y-0">
              {allMilestonesWithProject.map((item) => {
                const isSelected = item.milestone.id === selectedLeaderMilestoneId;
                const totalActs = item.milestone.actions.length;
                const compActs = item.milestone.actions.filter((a) => a.status === "Completed").length;

                return (
                  <div
                    key={item.milestone.id}
                    onClick={() => setSelectedLeaderMilestoneId(item.milestone.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? "bg-[#D3E3FD]/30 border-[#0B57D0] shadow-2xs"
                        : "bg-white border-slate-200/90 hover:border-slate-300 hover:bg-zinc-50/70 shadow-xs"
                    }`}
                  >
                    {/* Project Name & Horizon */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold text-[#0B57D0] uppercase tracking-wider truncate max-w-[170px]" title={item.project.title}>
                        {item.project.title}
                      </span>
                      <span className="text-zinc-400">
                        Due {formatDate(item.milestone.endDate)}
                      </span>
                    </div>

                    {/* Milestone Title */}
                    <h2 className={`text-xs font-bold leading-snug ${isSelected ? "text-[#0B57D0]" : "text-zinc-900"}`}>
                      {item.milestone.title}
                    </h2>

                    {/* Lead & Progress Bar */}
                    <div className="pt-1 flex flex-col gap-1.5 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-500 flex items-center gap-1">
                          <User size={11} className="text-zinc-400" />
                          <span>{item.milestone.lead}</span>
                        </span>
                        <span className="font-bold text-emerald-700">
                          {compActs}/{totalActs} Done
                        </span>
                      </div>

                      {/* Thin Progress bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{
                            width: `${totalActs > 0 ? Math.round((compActs / totalActs) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: ACTION MANAGEMENT & BREAKDOWN (FLEX-1) */}
          <div className="flex-1 flex flex-col bg-[#FAFAFC] overflow-hidden min-w-0">
            {/* Active Milestone Banner Header */}
            {currentMilestone && currentProject ? (
              <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-col gap-3 shrink-0 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                      <span className="text-[#0B57D0] font-semibold">{currentProject.title}</span>
                      <span>•</span>
                      <span>PM: {currentProject.manager}</span>
                    </div>
                    <h2 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                      <span className="text-amber-500 text-lg">🎯</span>
                      <span>{currentMilestone.title}</span>
                    </h2>
                  </div>

                  {/* Summary Pill */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-emerald-800 uppercase tracking-wider">Completion</span>
                        <span className="text-xs font-bold text-emerald-700">
                          {completedActionsCount} of {totalActionsCount} Actions Done
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter Toolbar */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  {/* Status Pills */}
                  <div className="flex items-center gap-1.5 bg-[#F1F3F4] p-0.5 rounded-lg border border-slate-200/80 text-xs">
                    {(["all", "To Do", "In Progress", "Completed"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setTlActionStatusFilter(st)}
                        className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                          tlActionStatusFilter === st
                            ? "bg-white text-[#0B57D0] font-bold shadow-2xs"
                            : "text-zinc-600 hover:text-zinc-900 font-normal"
                        }`}
                      >
                        {st === "all" ? "All Actions" : st}
                      </button>
                    ))}
                  </div>

                  {/* Search Box */}
                  <div className="relative w-64">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search action or team member..."
                      value={tlActionSearchQuery}
                      onChange={(e) => setTlActionSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0]"
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {/* Actions List Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {filteredActions.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-zinc-400">
                    <CheckSquare size={22} />
                  </div>
                  <p className="text-xs font-semibold text-zinc-700">No actions found</p>
                  <p className="text-[11px] text-zinc-400 max-w-xs">
                    {tlActionSearchQuery || tlActionStatusFilter !== "all"
                      ? "No actions match your current search/filter criteria."
                      : "Break down this milestone by adding action assignments for your team."}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddAction}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-[#0B57D0] text-white text-xs font-medium hover:bg-[#0842A0] cursor-pointer"
                  >
                    + Create First Action
                  </button>
                </div>
              ) : (
                filteredActions.map((act) => {
                  const isDone = act.status === "Completed";
                  const isInProgress = act.status === "In Progress";

                  return (
                    <div
                      key={act.id}
                      className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 shadow-xs transition-all flex items-center justify-between gap-4 group/act"
                    >
                      {/* Left info */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isDone
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : isInProgress
                              ? "bg-blue-50 text-[#0B57D0] border border-blue-200"
                              : "bg-slate-100 text-zinc-500 border border-slate-200"
                          }`}
                        >
                          {isDone ? <Check size={16} className="stroke-[3]" /> : <Clock size={16} />}
                        </div>

                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-zinc-900 leading-snug">
                              {act.title}
                            </h3>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                isDone
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isInProgress
                                  ? "bg-blue-50 text-[#0B57D0] border border-blue-200"
                                  : "bg-slate-100 text-zinc-600 border border-slate-200"
                              }`}
                            >
                              {act.status}
                            </span>
                          </div>

                          {/* Member Assignee & Dates */}
                          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                            <span className="flex items-center gap-1 font-medium text-zinc-700">
                              <User size={11} className="text-zinc-400" />
                              <span>{act.assignee}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar size={11} className="text-zinc-400" />
                              <span>
                                {formatDate(act.startDate)} – {formatDate(act.endDate)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on hover */}
                      <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover/act:opacity-100">
                        <button
                          type="button"
                          onClick={() => handleOpenEditAction(act)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium cursor-pointer transition-colors"
                        >
                          Edit / Reassign
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAction(act.id)}
                          className="w-7 h-7 rounded-md hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                          title="Delete Action"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 3: PROOF VERIFICATION & TEAM WORKLOAD (340px) */}
          <div className="w-[340px] shrink-0 bg-white flex flex-col overflow-hidden divide-y divide-slate-200">
            
            {/* Top Half: Proof Review Inbox */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-[#FAFAFB] border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Inbox size={14} className="text-[#0B57D0]" />
                  <span className="text-xs font-bold text-zinc-900">Verification & Proofs</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {allPendingReviews.length} Logs
                </span>
              </div>

              {/* Scrollable Proof Feed */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {allPendingReviews.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-1 text-zinc-400">
                    <ImageIcon size={20} />
                    <span className="text-xs font-medium">No verified proofs yet</span>
                  </div>
                ) : (
                  allPendingReviews.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setProofReviewTarget(item)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-[#0B57D0] bg-white shadow-2xs hover:shadow-xs transition-all cursor-pointer flex flex-col gap-2 group/proof"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[10px] font-bold text-[#0B57D0] uppercase tracking-wider truncate max-w-[180px]">
                          {item.taskTitle}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                          Done
                        </span>
                      </div>

                      <p className="text-xs text-zinc-700 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1.5 border-t border-slate-100">
                        <span>By {item.updatedBy}</span>
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Half: Team Workload Overview */}
            <div className="h-[230px] shrink-0 flex flex-col overflow-hidden bg-[#FAFAFC]">
              <div className="px-4 py-2.5 bg-[#FAFAFB] border-b border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <Users size={13} className="text-zinc-500" />
                  <span>Team Workload</span>
                </span>
                <span className="text-[10px] text-zinc-400">Active Tasks</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {Object.entries(teamWorkloadMap).map(([memberName, stats]) => (
                  <div
                    key={memberName}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-[#D3E3FD] text-[#0B57D0] font-bold text-[10px] flex items-center justify-center shrink-0">
                        {memberName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-zinc-800 truncate">{memberName}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#0B57D0] font-medium border border-blue-200">
                        {stats.active} Active
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                        {stats.completed} Done
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* CREATE / EDIT ACTION MODAL */}
        {isAddActionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="px-5 py-3.5 border-b border-slate-200 bg-[#FAFAFB] flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-zinc-900">
                    {editingActionItem ? "Edit / Reassign Action" : "Create New Action"}
                  </h3>
                  <span className="text-[11px] text-zinc-500 truncate max-w-xs">
                    Under: {currentMilestone?.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddActionModalOpen(false)}
                  className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Modal Form Body */}
              <form id="action-form" onSubmit={handleSaveActionSubmit} className="p-5 flex flex-col gap-4 text-xs">
                {formActionError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                    {formActionError}
                  </div>
                )}

                {/* Action Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-zinc-700">Action Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Conduct store POS barcode & SKU audit"
                    value={formActionTitle}
                    onChange={(e) => setFormActionTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0]"
                    required
                  />
                </div>

                {/* Assignee / Member Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-zinc-700">Assign To (Team Member)</label>
                  <input
                    type="text"
                    placeholder="e.g. David Lee, Sarah Lim"
                    value={formActionAssignee}
                    onChange={(e) => setFormActionAssignee(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0]"
                  />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-zinc-700">Start Date</label>
                    <input
                      type="date"
                      value={formActionStartDate}
                      onChange={(e) => setFormActionStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0]"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-semibold text-zinc-700">Due Date</label>
                    <input
                      type="date"
                      value={formActionEndDate}
                      onChange={(e) => setFormActionEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0]"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-zinc-700">Status</label>
                  <select
                    value={formActionStatus}
                    onChange={(e) => setFormActionStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0]"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </form>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-200 bg-[#FAFAFB] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddActionModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="action-form"
                  className="px-4 py-1.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium cursor-pointer shadow-2xs"
                >
                  {editingActionItem ? "Save Changes" : "Create Action"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROOF DETAIL INSPECTOR MODAL */}
        {proofReviewTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
              <div className="px-5 py-3.5 border-b border-slate-200 bg-[#FAFAFB] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#0B57D0] uppercase tracking-wider">
                    {proofReviewTarget.actionTitle}
                  </span>
                  <h3 className="text-sm font-bold text-zinc-900">
                    {proofReviewTarget.taskTitle}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setProofReviewTarget(null)}
                  className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-5 flex flex-col gap-3 text-xs">
                <div className="flex items-center gap-3 text-zinc-500 bg-[#F8F9FB] p-2 rounded-lg border border-slate-100">
                  <span>Author: <strong className="text-zinc-800">{proofReviewTarget.updatedBy}</strong></span>
                  <span>•</span>
                  <span>Date: {formatDate(proofReviewTarget.timestamp)}</span>
                </div>

                <p className="text-zinc-700 leading-relaxed font-normal">
                  {proofReviewTarget.summary}
                </p>

                {proofReviewTarget.proofNote && (
                  <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-zinc-700">
                    <span className="font-bold text-emerald-800 block mb-0.5">Verification Note:</span>
                    {proofReviewTarget.proofNote}
                  </div>
                )}

                {proofReviewTarget.proofPhotoUrl && (
                  <div className="rounded-lg overflow-hidden border border-slate-200 max-h-56">
                    <img
                      src={proofReviewTarget.proofPhotoUrl}
                      alt={proofReviewTarget.taskTitle}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-slate-200 bg-[#FAFAFB] flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setProofReviewTarget(null)}
                  className="px-4 py-1.5 rounded-lg bg-[#0B57D0] text-white text-xs font-medium hover:bg-[#0842A0] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ----------------------------------------------------
  // ACTION / TASK VIEW: Personal Execution & Daily Progress Feed
  // ----------------------------------------------------
  if (activeView === "team_member") {
    // Current user identifier
    const currentUserName = profile?.name || "David Lee";

    // Gather all actions across active projects & milestones
    const allActionsFlattened: Array<{
      action: DummyAction;
      milestone: DummyMilestone;
      project: DummyProject;
    }> = [];

    projectsList
      .filter((p) => !p.deletedAt)
      .forEach((proj) => {
        proj.milestones.forEach((ms) => {
          (ms.actions || []).forEach((act) => {
            allActionsFlattened.push({
              action: act,
              milestone: ms,
              project: proj,
            });
          });
        });
      });

    // Extract all unique assignees
    const uniqueAssignees = Array.from(
      new Set(allActionsFlattened.map((item) => item.action.assignee).filter(Boolean))
    );

    // Check if the current user has any assigned tasks
    const userHasAssignedTasks = allActionsFlattened.some(
      (item) => item.action.assignee.toLowerCase() === currentUserName.toLowerCase()
    );

    // Default for Admin: always own assigned name first; operator/member strictly own name
    const adminDefaultMember = currentUserName;
    const activeAdminMemberFilter = selectedMemberFilter !== null ? selectedMemberFilter : adminDefaultMember;

    // Effective Member filter: for Admin, can switch or view all; for operator/team member, strictly their own name ONLY
    const effectiveMemberFilter = isAdmin ? activeAdminMemberFilter : currentUserName;

    // Filtered actions list
    const memberActionsList = allActionsFlattened.filter((item) => {
      const matchMember =
        isAdmin && effectiveMemberFilter === "All"
          ? true
          : item.action.assignee.toLowerCase() === effectiveMemberFilter.toLowerCase();

      const matchTab =
        taskExecutionTab === "all" ? true : item.action.status === taskExecutionTab;

      const matchSearch =
        !taskSearchQuery ||
        item.action.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
        item.milestone.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
        item.project.title.toLowerCase().includes(taskSearchQuery.toLowerCase());

      return matchMember && matchTab && matchSearch;
    });

    // Stats calculations
    const myAllTasks = allActionsFlattened.filter((item) =>
      isAdmin && effectiveMemberFilter === "All"
        ? true
        : item.action.assignee.toLowerCase() === effectiveMemberFilter.toLowerCase()
    );
    const myTotalCount = myAllTasks.length;
    const myCompletedCount = myAllTasks.filter((t) => t.action.status === "Completed").length;
    const myInProgressCount = myAllTasks.filter((t) => t.action.status === "In Progress").length;
    const myToDoCount = myAllTasks.filter((t) => t.action.status === "To Do").length;

    // Open Task Drawer for Progress Logging
    const handleOpenTaskDrawer = (taskData: {
      action: DummyAction;
      milestone: DummyMilestone;
      project: DummyProject;
    }) => {
      setActiveTaskDrawer(taskData);
      setLogFormWhatTitle("");
      setLogFormWhatDesc("");
      setLogFormWhatNext("");
      setLogFormAttachmentUrl("");
      setLogFormProofPhotoData("");
      setLogFormError("");
    };

    // Close Task Drawer
    const handleCloseTaskDrawer = () => {
      setActiveTaskDrawer(null);
      setLogFormError("");
    };

    // Handle Proof Image File Upload (Converts to Base64)
    const handleProofImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setLogFormError("Please select a valid image file (PNG, JPG, JPEG).");
        return;
      }
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const result = loadEvt.target?.result as string;
        setLogFormProofPhotoData(result);
        setLogFormError("");
      };
      reader.readAsDataURL(file);
    };

    // Save Daily Progress Log
    const handleSaveDailyLog = (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeTaskDrawer) return;

      if (!logFormWhatTitle.trim()) {
        setLogFormError("Please state what you accomplished in this update.");
        return;
      }

      const { action, milestone, project } = activeTaskDrawer;
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().slice(0, 5);
      const fullTimestamp = `${dateStr} ${timeStr}`;

      const newLog: ActionLog = {
        id: `log-${Date.now()}`,
        timestamp: fullTimestamp,
        author: currentUserName,
        whatIDidTitle: logFormWhatTitle.trim(),
        whatIDidDesc: logFormWhatDesc.trim(),
        whatIsNext: logFormWhatNext.trim() || undefined,
        attachmentUrl: logFormAttachmentUrl.trim() || undefined,
        proofPhotoData: logFormProofPhotoData || undefined,
      };

      // Also append to milestone updates timeline for the Team Leader
      const newMilestoneUpdate: DummyTaskUpdate = {
        id: `up-${Date.now()}`,
        taskTitle: logFormWhatTitle.trim(),
        actionTitle: action.title,
        updatedBy: currentUserName,
        timestamp: dateStr,
        status: "Completed",
        summary: logFormWhatDesc.trim() || logFormWhatTitle.trim(),
        proofLink: logFormAttachmentUrl.trim() || undefined,
        proofPhotoUrl: logFormProofPhotoData || undefined,
      };

      // Automatically transition To Do -> In Progress on first log
      const newStatus = action.status === "To Do" ? ("In Progress" as const) : action.status;
      const newProgress = action.progress > 0 ? action.progress : 50;

      // Update state
      setProjectsList((prev) =>
        prev.map((p) => {
          if (p.id !== project.id) return p;
          return {
            ...p,
            milestones: p.milestones.map((ms) => {
              if (ms.id !== milestone.id) return ms;
              const updatedActions = ms.actions.map((act) => {
                if (act.id !== action.id) return act;
                const existingLogs = act.logs || [];
                return {
                  ...act,
                  status: newStatus,
                  progress: newProgress,
                  logs: [newLog, ...existingLogs],
                };
              });

              const existingUpdates = ms.updates || [];

              return {
                ...ms,
                actions: updatedActions,
                updates: logFormProofPhotoData || logFormAttachmentUrl 
                  ? [newMilestoneUpdate, ...existingUpdates] 
                  : existingUpdates,
              };
            }),
          };
        })
      );

      // Refresh the active task drawer's local action reference
      setActiveTaskDrawer((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          action: {
            ...prev.action,
            status: newStatus,
            progress: newProgress,
            logs: [newLog, ...(prev.action.logs || [])],
          },
        };
      });

      // Clear form inputs
      setLogFormWhatTitle("");
      setLogFormWhatDesc("");
      setLogFormWhatNext("");
      setLogFormAttachmentUrl("");
      setLogFormProofPhotoData("");
      setLogFormError("");
    };

    return (
      <div className="h-screen w-full bg-[#FAFAFC] font-primary select-none flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 shadow-2xs">
          {/* Left Title & Back */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveView(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-base font-semibold text-zinc-900">Action & Task Execution Hub</h1>
              <span className="text-xs text-zinc-400 font-normal">Daily Progress & Execution Logs</span>
            </div>
          </div>

          {/* Right Controls: Member Perspective (Admin) + Summary Badge */}
          <div className="flex items-center gap-2.5">
            {/* If Admin: Member Perspective Selector */}
            {isAdmin && uniqueAssignees.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#F8F9FB] px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
                <span className="text-[11px] text-zinc-500 font-medium">Viewing Member:</span>
                <select
                  value={activeAdminMemberFilter}
                  onChange={(e) => setSelectedMemberFilter(e.target.value)}
                  className="bg-transparent font-semibold text-[#0B57D0] focus:outline-none cursor-pointer"
                >
                  <option value="All">All Team Members ({uniqueAssignees.length})</option>
                  {uniqueAssignees.map((memName) => (
                    <option key={memName} value={memName}>
                      {memName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isAdmin && (
              <div className="flex items-center gap-1.5 bg-blue-50/70 px-2.5 py-1 rounded-lg border border-blue-100 text-xs font-medium text-[#0B57D0]">
                <User size={12} />
                <span>Assignee: <strong>{currentUserName}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* 2-COLUMN MAIN LAYOUT: Task List & Summary Metrics */}
        <div className="flex-1 flex overflow-hidden min-h-0 divide-x divide-slate-200">
          
          {/* MAIN COLUMN: TASK CHECKLIST & EXECUTION FEED (Flex-1) */}
          <div className="flex-1 flex flex-col bg-[#FAFAFC] overflow-hidden min-w-0">
            {/* Toolbar: Status Filter Tabs + Search */}
            <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-1 bg-[#F1F3F4] p-0.5 rounded-lg border border-slate-200/80 text-xs">
                <button
                  type="button"
                  onClick={() => setTaskExecutionTab("all")}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    taskExecutionTab === "all"
                      ? "bg-white text-[#0B57D0] font-bold shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900 font-normal"
                  }`}
                >
                  All ({myTotalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskExecutionTab("To Do")}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    taskExecutionTab === "To Do"
                      ? "bg-white text-zinc-900 font-bold shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900 font-normal"
                  }`}
                >
                  To Do ({myToDoCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskExecutionTab("In Progress")}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    taskExecutionTab === "In Progress"
                      ? "bg-white text-[#0B57D0] font-bold shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900 font-normal"
                  }`}
                >
                  In Progress ({myInProgressCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskExecutionTab("Completed")}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    taskExecutionTab === "Completed"
                      ? "bg-white text-emerald-700 font-bold shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900 font-normal"
                  }`}
                >
                  Completed ({myCompletedCount})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-72">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search task, milestone or project..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0]"
                />
              </div>
            </div>

            {/* Task Items Scrollable List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {memberActionsList.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-zinc-400">
                    <CheckCircle2 size={24} />
                  </div>
                  <p className="text-xs font-semibold text-zinc-700">No tasks in this view</p>
                  <p className="text-[11px] text-zinc-400 max-w-xs">
                    {taskSearchQuery || taskExecutionTab !== "all"
                      ? "No tasks match your current filter or search criteria."
                      : "You have no assigned tasks pending execution."}
                  </p>
                </div>
              ) : (
                memberActionsList.map(({ action, milestone, project }) => {
                  const isDone = action.status === "Completed";
                  const isInProg = action.status === "In Progress";
                  const isToDo = action.status === "To Do";
                  const logsCount = (action.logs || []).length;
                  const latestLog = action.logs && action.logs.length > 0 ? action.logs[0] : null;

                  return (
                    <div
                      key={action.id}
                      onClick={() => handleOpenTaskDrawer({ action, milestone, project })}
                      className={`bg-white rounded-xl border p-4 shadow-xs transition-all hover:border-[#0B57D0]/60 hover:shadow-md cursor-pointer flex flex-col gap-3 group/taskcard ${
                        isDone
                          ? "border-emerald-200/80 bg-emerald-50/10"
                          : isInProg
                          ? "border-blue-200 bg-white ring-1 ring-blue-500/10"
                          : "border-slate-200"
                      }`}
                    >
                      {/* Top Row: Context, Title & Status */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          {/* Breadcrumb Context */}
                          <div className="flex items-center gap-1.5 text-[10.5px] text-zinc-400 truncate">
                            <span className="font-semibold text-[#0B57D0] truncate max-w-[200px]" title={project.title}>
                              {project.title}
                            </span>
                            <span>•</span>
                            <span className="text-zinc-600 truncate max-w-[240px]" title={milestone.title}>
                              🎯 {milestone.title}
                            </span>
                          </div>

                          {/* Task Name */}
                          <h3
                            className={`text-xs font-bold leading-snug ${
                              isDone ? "line-through text-zinc-500" : "text-zinc-900 group-hover/taskcard:text-[#0B57D0]"
                            }`}
                          >
                            {action.title}
                          </h3>
                        </div>

                        {/* Status Badge & Logs Count */}
                        <div className="flex items-center gap-2 shrink-0">
                          {logsCount > 0 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-zinc-700 border border-slate-200 flex items-center gap-1">
                              <ListTodo size={11} className="text-[#0B57D0]" />
                              <span>{logsCount} {logsCount === 1 ? "log" : "logs"}</span>
                            </span>
                          )}

                          {isDone ? (
                            <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <Check size={12} className="stroke-[3]" /> Completed
                            </span>
                          ) : isInProg ? (
                            <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-[#0B57D0] border border-blue-300 flex items-center gap-1">
                              <Clock size={12} /> In Progress
                            </span>
                          ) : (
                            <span className="text-[10.5px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-zinc-600 border border-slate-200">
                              To Do
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Latest Progress Preview (if exists) */}
                      {latestLog ? (
                        <div className="p-3 rounded-lg bg-[#F8F9FB] border border-slate-200/80 text-xs flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-[10.5px] text-zinc-400">
                            <span className="font-semibold text-zinc-700 flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-600" />
                              <span>Latest Update: <strong>{latestLog.whatIDidTitle}</strong></span>
                            </span>
                            <span>{formatDate(latestLog.timestamp.split(" ")[0])}</span>
                          </div>

                          {latestLog.whatIDidDesc && (
                            <div className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed font-normal">
                              {renderFormattedDescription(latestLog.whatIDidDesc)}
                            </div>
                          )}

                          {/* Next step row */}
                          {latestLog.whatIsNext && (
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-[10.5px]">
                              <span className="text-blue-700 font-medium flex items-center gap-1 bg-blue-50/70 px-2 py-0.5 rounded border border-blue-100">
                                <ArrowRight size={10} /> Next: {latestLog.whatIsNext}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-lg bg-slate-50/70 border border-dashed border-slate-200 text-xs flex items-center justify-between text-zinc-500">
                          <span className="text-[11px]">No daily logs recorded yet.</span>
                          <span className="text-[11px] font-semibold text-[#0B57D0] flex items-center gap-1">
                            <Plus size={12} /> Add Daily Progress
                          </span>
                        </div>
                      )}

                      {/* Bottom Meta Row */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5 border-t border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} className="text-zinc-400" />
                            <span>Due: <strong>{formatDate(action.endDate)}</strong></span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User size={11} className="text-zinc-400" />
                            <span>Lead: {milestone.lead}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Mark as Complete Button: Only visible when NOT completed and has >= 1 progress log */}
                          {!isDone && logsCount > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskCompleteConfirmTarget({ action, milestone, project });
                              }}
                              className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300/80 text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer"
                              title="Mark this action as 100% completed"
                            >
                              <CheckCircle2 size={12} className="text-emerald-600 stroke-[2.5]" />
                              <span>Mark as Complete</span>
                            </button>
                          )}

                          <span className="text-[#0B57D0] text-[11px] font-semibold flex items-center gap-1 group-hover/taskcard:translate-x-0.5 transition-transform">
                            <span>Log Progress & History</span>
                            <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SIDEBAR COLUMN: SUMMARY & COMPLETION PROGRESS (320px) */}
          <div className="w-[320px] shrink-0 bg-white flex flex-col overflow-hidden divide-y divide-slate-200">
            {/* Header */}
            <div className="px-5 py-4 bg-[#FAFAFB] flex flex-col gap-1">
              <span className="text-xs font-bold text-zinc-900">Execution Overview</span>
              <span className="text-[11px] text-zinc-400 font-normal">
                {effectiveMemberFilter === "All" ? "All Team Members" : `Assigned to ${effectiveMemberFilter}`}
              </span>
            </div>

            {/* Score Metrics Grid */}
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col">
                  <span className="text-xs font-bold text-zinc-700">{myToDoCount}</span>
                  <span className="text-[9.5px] text-zinc-400 font-medium uppercase mt-0.5">To Do</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col">
                  <span className="text-xs font-bold text-[#0B57D0]">{myInProgressCount}</span>
                  <span className="text-[9.5px] text-blue-600 font-medium uppercase mt-0.5">In Prog</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col">
                  <span className="text-xs font-bold text-emerald-700">{myCompletedCount}</span>
                  <span className="text-[9.5px] text-emerald-700 font-medium uppercase mt-0.5">Done</span>
                </div>
              </div>

              {/* Progress completion bar */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">Completion Rate</span>
                  <span className="font-bold text-emerald-700">
                    {myTotalCount > 0 ? Math.round((myCompletedCount / myTotalCount) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${myTotalCount > 0 ? Math.round((myCompletedCount / myTotalCount) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Daily Execution Guidelines */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#FAFAFC]">
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100/80 text-xs text-zinc-700 space-y-2">
                <span className="font-bold text-[#0B57D0] flex items-center gap-1.5">
                  <Sparkles size={13} />
                  <span>Daily Progress Routine</span>
                </span>
                <p className="text-[11px] text-zinc-600 leading-relaxed font-normal">
                  Log daily accomplishments, mention specific IDs (e.g. <code>@ACT_3453645674574754</code>), upload photo proof, and specify what comes next.
                </p>
                <div className="pt-2 border-t border-blue-100 text-[10.5px] text-zinc-500 space-y-1">
                  <p>• <strong>What did I do:</strong> Title & details with <code>@ID</code> tags.</p>
                  <p>• <strong>What next:</strong> Clear follow-up direction.</p>
                  <p>• <strong>Proof of image:</strong> Direct file upload.</p>
                  <p>• <strong>Attachment:</strong> Document / Drive URL.</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* SLIDE-OVER DRAWER: DAILY PROGRESS LOGS & ENTRY FORM */}
        {activeTaskDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150">
            <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 font-primary">
              
              {/* Drawer Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-[#FAFAFB] flex items-start justify-between gap-4 shrink-0">
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[10.5px] text-zinc-400 truncate">
                    <span className="font-semibold text-[#0B57D0]">{activeTaskDrawer.project.title}</span>
                    <span>•</span>
                    <span className="text-zinc-600">🎯 {activeTaskDrawer.milestone.title}</span>
                  </div>
                  <h2 className="text-sm font-bold text-zinc-900 leading-snug">
                    {activeTaskDrawer.action.title}
                  </h2>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 pt-1">
                    <span>Assignee: <strong className="text-zinc-800">{activeTaskDrawer.action.assignee}</strong></span>
                    <span>•</span>
                    <span>Due: <strong>{formatDate(activeTaskDrawer.action.endDate)}</strong></span>
                    <span>•</span>
                    <span>Status: <strong className={activeTaskDrawer.action.status === "Completed" ? "text-emerald-700" : "text-[#0B57D0]"}>{activeTaskDrawer.action.status}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseTaskDrawer}
                  className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Content: 2-Tier Scrollable View (Add Log Form + Historical Feed) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. ADD NEW DAILY PROGRESS ENTRY FORM */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <Plus size={14} className="text-[#0B57D0]" />
                      <span>Add Daily Progress Update</span>
                    </h3>
                    <span className="text-[10px] text-zinc-400">Keep Team Leader informed</span>
                  </div>

                  <form id="daily-log-form" onSubmit={handleSaveDailyLog} className="flex flex-col gap-3.5 text-xs">
                    {logFormError && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                        {logFormError}
                      </div>
                    )}

                    {/* What Did I Do (Title) */}
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-700">What have you done? (Summary Title) *</label>
                      <input
                        type="text"
                        placeholder="e.g. Completed initial 20 retail store barcode audits"
                        value={logFormWhatTitle}
                        onChange={(e) => setLogFormWhatTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0]"
                        required
                      />
                    </div>

                    {/* What Did I Do (Description with inline @ID support) */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-zinc-700">Action Description & Accomplishment Details</label>
                        <span className="text-[10.5px] text-zinc-400">
                          Tip: Tag IDs like <code className="bg-slate-100 px-1 py-0.5 rounded text-[#0B57D0]">@ACT_123</code>
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="e.g. I did create the campaign @ACT_3453645674574754, verified outlet shelves, and dispatched POS materials."
                        value={logFormWhatDesc}
                        onChange={(e) => setLogFormWhatDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0] resize-none leading-relaxed"
                      />
                    </div>

                    {/* What Next (Upcoming Step) */}
                    <div className="flex flex-col gap-1">
                      <label className="font-semibold text-zinc-700 flex items-center gap-1 text-blue-700">
                        <ArrowRight size={12} />
                        <span>What is next? (Next Action Step)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Schedule route for East cluster stores tomorrow"
                        value={logFormWhatNext}
                        onChange={(e) => setLogFormWhatNext(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-blue-50/20 focus:outline-none focus:border-[#0B57D0]"
                      />
                    </div>

                    {/* 2-Column Row: Proof of Image (File Upload) & Attachment (URL) */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {/* Proof of Image Upload */}
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-zinc-700 flex items-center gap-1">
                          <ImageIcon size={12} className="text-zinc-500" />
                          <span>Proof of Image (Upload)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            id="proof-image-upload"
                            onChange={handleProofImageUpload}
                            className="hidden"
                          />
                          <label
                            htmlFor="proof-image-upload"
                            className="w-full px-3 py-2 rounded-lg border border-dashed border-slate-300 bg-[#F8F9FB] hover:bg-slate-100 text-zinc-600 text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition-colors"
                          >
                            <Upload size={13} className="text-[#0B57D0]" />
                            <span className="truncate">
                              {logFormProofPhotoData ? "Image Selected (Click to change)" : "Choose image file..."}
                            </span>
                          </label>
                        </div>
                        {logFormProofPhotoData && (
                          <div className="relative mt-1 w-14 h-14 rounded-lg overflow-hidden border border-slate-200 group/preview">
                            <img
                              src={logFormProofPhotoData}
                              alt="Upload preview"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setLogFormProofPhotoData("")}
                              className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity cursor-pointer text-[10px]"
                              title="Remove image"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Attachment URL */}
                      <div className="flex flex-col gap-1">
                        <label className="font-semibold text-zinc-700 flex items-center gap-1">
                          <Link2 size={12} className="text-zinc-500" />
                          <span>Attachment</span>
                        </label>
                        <input
                          type="url"
                          placeholder="https://drive.google.com/..."
                          value={logFormAttachmentUrl}
                          onChange={(e) => setLogFormAttachmentUrl(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0]"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                      <button
                        type="submit"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium cursor-pointer shadow-2xs transition-all active:scale-95"
                      >
                        <Send size={12} />
                        <span>Submit Progress Log</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2. CHRONOLOGICAL PROGRESS LOG FEED */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <Clock3 size={14} className="text-zinc-500" />
                      <span>Activity & Progress History ({((activeTaskDrawer.action.logs) || []).length})</span>
                    </h3>
                    <span className="text-[10px] text-zinc-400">Macro view for Team Leader</span>
                  </div>

                  {(!activeTaskDrawer.action.logs || activeTaskDrawer.action.logs.length === 0) ? (
                    <div className="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-1.5 text-zinc-400 text-xs">
                      <Inbox size={20} />
                      <span className="font-semibold text-zinc-600">No progress logs recorded yet</span>
                      <span className="text-[11px]">Submit your first daily log above to track progress.</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeTaskDrawer.action.logs.map((log) => (
                        <div
                          key={log.id}
                          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col gap-2.5 relative"
                        >
                          {/* Log Header: Title & Timestamp */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#0B57D0] flex items-center justify-center shrink-0 text-[10px] font-bold border border-blue-100">
                                {log.author.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <h4 className="text-xs font-bold text-zinc-900 leading-snug">
                                  {log.whatIDidTitle}
                                </h4>
                                <span className="text-[10.5px] text-zinc-400">
                                  Logged by {log.author} • {log.timestamp}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Log Description with inline @ID links */}
                          {log.whatIDidDesc && (
                            <div className="text-xs text-zinc-700 leading-relaxed font-normal bg-[#F8F9FB] p-2.5 rounded-lg border border-slate-100">
                              {renderFormattedDescription(log.whatIDidDesc)}
                            </div>
                          )}

                          {/* Multi-line Metadata: What Next */}
                          {log.whatIsNext && (
                            <div className="flex items-start gap-1.5 text-blue-800 bg-blue-50/70 px-2.5 py-1.5 rounded-lg border border-blue-100 text-xs">
                              <ArrowRight size={13} className="shrink-0 mt-0.5 text-blue-600" />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">What's Next:</span>
                                <span className="text-[11.5px] font-medium leading-snug">{log.whatIsNext}</span>
                              </div>
                            </div>
                          )}

                          {/* Proof Attachments: Image Proof or Document Attachment */}
                          {(log.attachmentUrl || log.proofPhotoData) && (
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                              {log.attachmentUrl && (
                                <a
                                  href={log.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-[#0B57D0] text-[11px] font-medium border border-slate-200"
                                >
                                  <Link2 size={12} />
                                  <span>Attachment</span>
                                  <ExternalLink size={10} className="text-zinc-400" />
                                </a>
                              )}

                              {log.proofPhotoData && (
                                <a
                                  href={log.proofPhotoData}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-[#0B57D0] text-[11px] font-medium border border-slate-200"
                                >
                                  <ImageIcon size={12} />
                                  <span>Proof of Image</span>
                                  <ExternalLink size={10} className="text-zinc-400" />
                                </a>
                              )}
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </div>

              {/* Drawer Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200 bg-[#FAFAFB] flex items-center justify-between shrink-0">
                <span className="text-xs text-zinc-400">
                  {((activeTaskDrawer.action.logs) || []).length} progress updates recorded
                </span>
                <button
                  type="button"
                  onClick={handleCloseTaskDrawer}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium cursor-pointer"
                >
                  Close Drawer
                </button>
              </div>

            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL: MARK TASK AS COMPLETE */}
        {taskCompleteConfirmTarget && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-emerald-50/50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                    <CheckCircle2 size={20} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Mark Task as Complete?</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5">Please confirm to finalize this deliverable</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskCompleteConfirmTarget(null)}
                  className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 flex flex-col gap-3 text-xs text-zinc-600">
                <p>
                  Are you sure you want to mark this task as <strong>100% Completed</strong>?
                </p>

                <div className="p-3 rounded-xl bg-[#F8F9FB] border border-slate-200 flex flex-col gap-1.5">
                  <div className="text-[11px] font-semibold text-zinc-800">
                    {taskCompleteConfirmTarget.action.title}
                  </div>
                  <div className="flex items-center gap-2 text-[10.5px] text-zinc-500">
                    <span>Milestone: <strong className="text-zinc-700">{taskCompleteConfirmTarget.milestone.title}</strong></span>
                    <span>•</span>
                    <span>Project: <strong className="text-zinc-700">{taskCompleteConfirmTarget.project.title}</strong></span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Recorded Updates: {taskCompleteConfirmTarget.action.logs?.length || 0} logs
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  This will mark the action deliverable as completed and automatically recalculate overall milestone and project completion progress.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTaskCompleteConfirmTarget(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetActionId = taskCompleteConfirmTarget.action.id;
                    const targetMsId = taskCompleteConfirmTarget.milestone.id;
                    const targetProjId = taskCompleteConfirmTarget.project.id;

                    setProjectsList((prevProjects) =>
                      prevProjects.map((p) => {
                        if (p.id !== targetProjId) return p;
                        return {
                          ...p,
                          milestones: p.milestones.map((m) => {
                            if (m.id !== targetMsId) return m;
                            const updatedActions = (m.actions || []).map((a) => {
                              if (a.id !== targetActionId) return a;
                              return {
                                ...a,
                                status: "Completed" as const,
                                progress: 100,
                              };
                            });
                            // Recalculate milestone progress
                            const total = updatedActions.length;
                            const completedCount = updatedActions.filter(
                              (act) => act.status === "Completed"
                            ).length;
                            const newProgress =
                              total > 0
                                ? Math.round((completedCount / total) * 100)
                                : 0;
                            return {
                              ...m,
                              progress: newProgress,
                              actions: updatedActions,
                            };
                          }),
                        };
                      })
                    );

                    // If drawer is open on this task, close or update it
                    if (activeTaskDrawer?.action.id === targetActionId) {
                      setActiveTaskDrawer(null);
                    }

                    setTaskCompleteConfirmTarget(null);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Check size={14} className="stroke-[3]" />
                  <span>Yes, Mark Completed</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  // Default: Access View Cards Screen
  return (
    <div className="relative min-h-screen w-full bg-[#FAFAFC] font-primary select-none flex flex-col justify-center items-center p-6">
      {/* Floating Back Icon Button on the Left */}
      <button
        type="button"
        onClick={handleBackToMain}
        title="Back to Main"
        className="fixed top-5 left-5 z-50 w-9 h-9 rounded-full bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-950 border border-slate-200 shadow-sm flex items-center justify-center cursor-pointer transition-all active:scale-95"
      >
        <ArrowLeft size={18} />
      </button>

      {/* Main Container */}
      <div className="w-full max-w-5xl flex flex-col items-center gap-8 animate-in fade-in duration-300">
        {/* Header Title */}
        <div className="text-center flex flex-col items-center gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Workspace Access
          </h1>
          <p className="text-xs text-zinc-500 font-normal">
            Select your access view to proceed
          </p>
        </div>

        {/* Access Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          {accessCards.map((card) => (
            <div
                key={card.id}
                onClick={() => {
                  if (card.id === "management") {
                    setActiveView("management");
                  } else if (card.id === "team_leader") {
                    setActiveView("team_leader");
                  } else if (card.id === "team_member") {
                    setActiveView("team_member");
                  }
                }}
                className="bg-white rounded-2xl border border-slate-200/90 p-7 flex flex-col justify-between gap-6 shadow-xs hover:shadow-md hover:border-[#0B57D0]/50 transition-all duration-200 cursor-pointer group"
              >
                {/* Top Row: Icon & Badge */}
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-[#F0F4F9] flex items-center justify-center group-hover:bg-[#D3E3FD] transition-colors">
                    {card.icon}
                  </div>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-zinc-600 border border-slate-200 group-hover:bg-[#D3E3FD]/60 group-hover:text-[#0B57D0] transition-colors">
                    {card.badge}
                  </span>
                </div>

                {/* Card Body */}
                <div className="flex flex-col gap-1.5">
                  <h2 className="text-base font-semibold text-zinc-900 group-hover:text-[#0B57D0] transition-colors">
                    {card.title}
                  </h2>
                  <span className="text-[11px] font-medium text-[#0B57D0]">
                    {card.subtitle}
                  </span>
                  <p className="text-xs text-zinc-500 font-normal leading-relaxed mt-1">
                    {card.description}
                  </p>
                </div>

                {/* Bottom Line */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-zinc-400 group-hover:text-[#0B57D0] transition-colors">
                  <span>Open View</span>
                  <span>➔</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

