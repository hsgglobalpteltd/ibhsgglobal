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
  Link2
} from "lucide-react";

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
          { id: "a-1", title: "Conduct store POS barcode & SKU audit", assignee: "David Lee", startDate: "2026-01-05", endDate: "2026-01-25", status: "Completed", progress: 100 },
          { id: "a-2", title: "Deliver initial merchandising shelf trays", assignee: "John Tan", startDate: "2026-01-26", endDate: "2026-02-20", status: "Completed", progress: 100 },
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
          { id: "a-5", title: "Install standalone endcap displays in top 50 outlets", assignee: "David Lee", startDate: "2026-04-16", endDate: "2026-05-31", status: "In Progress", progress: 50 },
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

  // Gantt chart expanded states (Default: All projects collapsed for high-level overview)
  const [expandedProjects, setExpandedProjects] = React.useState<Record<string, boolean>>({});
  const [expandedMilestones, setExpandedMilestones] = React.useState<Record<string, boolean>>({
    "m-101": true,
    "m-102": true,
    "m-201": true
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
      title: "Management",
      subtitle: "Portfolio & Strategy",
      description: "Executive oversight, master timeline governance, project budgets, and portfolio progress.",
      icon: <ShieldCheck size={28} className="text-[#0B57D0]" />,
      badge: "Executive",
      adminOnly: true,
    },
    {
      id: "team_leader",
      title: "Team Leader",
      subtitle: "Milestones & Delegation",
      description: "Milestone operational planning, action breakdown, team workload distribution, and timeline requests.",
      icon: <Users size={28} className="text-[#0B57D0]" />,
      badge: "Lead",
      adminOnly: false,
    },
    {
      id: "team_member",
      title: "Team Member",
      subtitle: "Action Execution",
      description: "Personal action checklist, daily agenda, direct task progress updates, and module linkages.",
      icon: <UserCheck size={28} className="text-[#0B57D0]" />,
      badge: "Execution",
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

                    {/* Milestone Rows Title (With Clean 'Lead By' Column Text & Clickable to Open Action Drawer) */}
                    {expandedProjects[proj.id] && proj.milestones.map((ms) => (
                      <div
                        key={ms.id}
                        onClick={() => {
                          setActiveMilestoneDrawer({
                            milestone: ms,
                            projectTitle: proj.title,
                            projectManager: proj.manager,
                          });
                          setDrawerStatusFilter("all");
                        }}
                        className={`h-10 px-3 pl-8 flex items-center justify-between gap-2 transition-colors border-t border-slate-100/80 cursor-pointer group/msrow ${
                          activeMilestoneDrawer?.milestone.id === ms.id
                            ? "bg-[#D3E3FD]/40 text-[#0B57D0]"
                            : "bg-[#FCFCFD] hover:bg-amber-50/50"
                        }`}
                        title="Click to view milestone actions and proof attachments"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
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
                        <div className="w-14 shrink-0 flex items-center justify-end text-zinc-300 group-hover/msrow:text-[#0B57D0]">
                          <ChevronRight size={13} />
                        </div>
                      </div>
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
                              <div
                                key={ms.id}
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
        <div className={`grid grid-cols-1 ${isAdmin ? "md:grid-cols-3" : "md:grid-cols-2 max-w-3xl"} gap-6 w-full`}>
          {accessCards
            .filter((card) => !card.adminOnly || isAdmin)
            .map((card) => (
              <div
                key={card.id}
                onClick={() => {
                  if (card.id === "management") {
                    setActiveView("management");
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

