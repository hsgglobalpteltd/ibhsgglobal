"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  fetchMyProfile, 
  fetchAllUsers, 
  UserProfile,
  fetchWorkspaceDashboard,
  prefetchWorkspaceDashboard,
  getCachedWorkspaceData,
  savePMProject,
  savePMMilestone,
  savePMAction,
  addPMActionLog,
  deletePMEntity,
  submitPMDelayRequest,
  approvePMDelayRequest
} from "@/lib/api";
import { showToast } from "@/lib/toast";
import { ToastContainer } from "@/components/toast-container";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
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
  Archive,
  AtSign,
  Paperclip,
  CheckCircle,
  HelpCircle,
  Clock3,
  Upload,
  Loader2,
  Printer
} from "lucide-react";

interface ActionLog {
  id: string;
  timestamp: string; // YYYY-MM-DD HH:mm or YYYY-MM-DD
  author: string;
  whatIDidTitle: string;
  whatIDidDesc: string;
  whatIsNext?: string;
  attachmentUrl?: string; // Attachment link (Drive, Doc, etc. - legacy fallback)
  attachmentPdfs?: Array<{ name: string; url: string; size?: number } | string>; // Multiple uploaded PDF files (max 5)
  proofPhotoData?: string; // Uploaded proof image (base64 data URL or uploaded URL - legacy)
  proofPhotos?: string[]; // Multiple uploaded proof images (max 10)
  reviewStatus?: "acknowledged" | "redo";
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
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
  proofPhotos?: string[];
  attachmentPdfs?: Array<{ name: string; url: string; size?: number } | string>;
}

export type ActionLifecycleStatus =
  | "Upcoming Task"
  | "Pending Action"
  | "In Progress"
  | "Pending Verification"
  | "Complete"
  | "Completed"
  | "Incoming"
  | "To Do";

interface DummyAction {
  id: string;
  title: string;
  assignee: string;
  assigneeEmail?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  status: ActionLifecycleStatus;
  progress: number;
  instructions?: string; // Instruction / briefing directive from Team Leader
  logs?: ActionLog[]; // Daily execution feed & progress updates
  superState?: string;
  customStatus?: string;
}

interface DummyMilestone {
  id: string;
  title: string;
  lead: string;
  leadEmail?: string;
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
  managerEmail?: string;
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

// Helper: Determine automated action lifecycle status based on start date, logs, and leader review
function calculateActionStatus(
  startDateStr: string,
  logs: ActionLog[],
  superState?: string,
  customStatus?: string,
  nowMs: number = Date.now()
): ActionLifecycleStatus {
  const isLeaderCompleted = superState === "Completed" || customStatus === "Completed" || superState === "Complete" || customStatus === "Complete";
  const hasLogs = Array.isArray(logs) && logs.length > 0;
  const allLogsAcknowledged = hasLogs && logs.every((l) => l.reviewStatus === "acknowledged");

  const isMemberMarkedPending =
    customStatus === "Pending Verification" ||
    superState === "Pending Verification" ||
    customStatus === "Pending Review" ||
    superState === "Pending Review";

  if (isLeaderCompleted) {
    return "Complete";
  }

  if (isMemberMarkedPending) {
    if (allLogsAcknowledged) {
      return "Complete";
    }
    return "Pending Verification";
  }

  if (hasLogs) {
    return "In Progress";
  }

  if (startDateStr) {
    const sDate = new Date(startDateStr);
    if (!isNaN(sDate.getTime())) {
      const today = new Date(nowMs);
      today.setHours(0, 0, 0, 0);
      const start = new Date(sDate);
      start.setHours(0, 0, 0, 0);
      if (start.getTime() > today.getTime()) {
        return "Upcoming Task";
      }
    }
  }

  return "Pending Action";
}

// Helper: Calculate dynamic action progress percentage based on log counts and complete state:
// 0 logs => 0%
// 1 log => 1 / (1 + 1) = 50% (1/2)
// 2 logs => 2 / (2 + 1) = 67% (2/3)
// 3 logs => 3 / (3 + 1) = 75% (3/4)
// N logs => N / (N + 1) * 100 (never 100% until marked complete)
// Completed => 100%
function calculateActionProgress(logsCount: number, isCompleted: boolean): number {
  if (isCompleted) return 100;
  if (!logsCount || logsCount <= 0) return 0;
  return Math.round((logsCount / (logsCount + 1)) * 100);
}

function mapBackendDataToProjects(
  dbProjects: any[],
  dbMilestones: any[],
  dbActions: any[]
): DummyProject[] {
  const actionsByMilestone: Record<string, DummyAction[]> = {};
  (dbActions || []).forEach((a) => {
    const mId = a.milestone_id;
    if (!actionsByMilestone[mId]) actionsByMilestone[mId] = [];
    
    let parsedLogs: ActionLog[] = [];
    try {
      parsedLogs = typeof a.logs === "string" ? JSON.parse(a.logs) : (a.logs || []);
    } catch {}

    const startDateStr = typeof a.start_date === "number" ? new Date(a.start_date).toISOString().split("T")[0] : String(a.start_date || "");
    const endDateStr = typeof a.end_date === "number" ? new Date(a.end_date).toISOString().split("T")[0] : String(a.end_date || "");

    const calculatedStatus = calculateActionStatus(
      startDateStr,
      parsedLogs,
      a.super_state,
      a.custom_status,
      Date.now()
    );

    const isDone = calculatedStatus === "Complete";
    const actProgress = calculateActionProgress(parsedLogs.length, isDone);

    actionsByMilestone[mId].push({
      id: a.id,
      title: a.title || "Action",
      assignee: a.assigned_user_name || (a.assigned_user_id ? a.assigned_user_id.split("@")[0] : "Unassigned"),
      assigneeEmail: a.assigned_user_id || "",
      startDate: startDateStr,
      endDate: endDateStr,
      status: calculatedStatus,
      progress: actProgress,
      instructions: a.instructions || "",
      logs: parsedLogs,
      superState: a.super_state,
      customStatus: a.custom_status,
    });
  });

  const milestonesByProject: Record<string, DummyMilestone[]> = {};
  (dbMilestones || []).forEach((m) => {
    const pId = m.project_id;
    if (!milestonesByProject[pId]) milestonesByProject[pId] = [];

    const mActions = actionsByMilestone[m.id] || [];
    const startDateStr = typeof m.start_date === "number" ? new Date(m.start_date).toISOString().split("T")[0] : String(m.start_date || "");
    const endDateStr = typeof m.end_date === "number" ? new Date(m.end_date).toISOString().split("T")[0] : String(m.end_date || "");

    let msProgress = 0;
    if (m.super_state === "Completed") {
      msProgress = 100;
    } else if (mActions.length > 0) {
      const sumProg = mActions.reduce((acc, curr) => acc + curr.progress, 0);
      msProgress = Math.round(sumProg / mActions.length);
    } else {
      msProgress = Number(m.progress_percent) || 0;
    }

    milestonesByProject[pId].push({
      id: m.id,
      title: m.title || "Milestone",
      lead: m.lead_name || (m.lead_user_id ? m.lead_user_id.split("@")[0] : "Unassigned Lead"),
      leadEmail: m.lead_user_id || "",
      startDate: startDateStr,
      endDate: endDateStr,
      progress: msProgress,
      actions: mActions,
    });
  });

  return (dbProjects || []).map((p) => {
    const pMilestones = milestonesByProject[p.id] || [];
    const startDateStr = typeof p.start_date === "number" ? new Date(p.start_date).toISOString().split("T")[0] : String(p.start_date || "");
    const endDateStr = typeof p.end_date === "number" ? new Date(p.end_date).toISOString().split("T")[0] : String(p.end_date || "");

    let projProgress = 0;
    if (pMilestones.length > 0) {
      const sumProg = pMilestones.reduce((acc, curr) => acc + curr.progress, 0);
      projProgress = Math.round(sumProg / pMilestones.length);
    } else {
      projProgress = Number(p.progress) || 0;
    }

    return {
      id: p.id,
      title: p.title || "Project",
      department: p.department || "General",
      manager: p.manager_name || (p.manager_user_id ? p.manager_user_id.split("@")[0] : "Project Manager"),
      managerEmail: p.manager_user_id || "",
      startDate: startDateStr,
      endDate: endDateStr,
      progress: projProgress,
      status: (p.status || "Active") as any,
      milestones: pMilestones,
      deletedAt: p.deleted_at ? Number(p.deleted_at) : null,
      deleteRequestedBy: p.delete_requested_by || null,
      deleteRequestedByName: p.delete_requested_by_name || null,
      deleteRequestedAt: p.delete_requested_at ? Number(p.delete_requested_at) : null,
      deleteApprovedBy: p.delete_approved_by || null,
    };
  });
}

// Helper: Standardize all visual date displays to dd/mm/yyyy per project rules
function formatDate(dateStr: string | number | Date | undefined | null): string {
  if (!dateStr) return "-";
  let d: Date;
  if (typeof dateStr === "string" && dateStr.includes("-") && !dateStr.includes("T")) {
    d = new Date(dateStr.replace(" ", "T"));
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper: Standardize date + time display to dd/mm/yyyy HH:mm per project rules
function formatDateTime(dateStr: string | number | Date | undefined | null): string {
  if (!dateStr) return "-";
  if (typeof dateStr === "string") {
    const trimmed = dateStr.trim();
    if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const parts = trimmed.split(" ");
      const [y, m, d] = parts[0].split("-");
      const timePart = parts[1] ? ` ${parts[1]}` : "";
      return `${d}/${m}/${y}${timePart}`;
    }
  }
  let d: Date;
  if (typeof dateStr === "string" && dateStr.includes(" ") && !dateStr.includes("T")) {
    d = new Date(dateStr.replace(" ", "T"));
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
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

function MultiUserSearchSelectDropdown({
  values,
  onChange,
  users,
  placeholder = "Select team members...",
  triggerClassName = "min-h-9",
}: {
  values: string[];
  onChange: (vals: string[]) => void;
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

  const toggleUser = (userIdentifier: string) => {
    const isSelected = values.some(
      (v) => v.toLowerCase() === userIdentifier.toLowerCase()
    );
    if (isSelected) {
      onChange(values.filter((v) => v.toLowerCase() !== userIdentifier.toLowerCase()));
    } else {
      onChange([...values, userIdentifier]);
    }
  };

  const removeUser = (userIdentifier: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(values.filter((v) => v.toLowerCase() !== userIdentifier.toLowerCase()));
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button with Multi-tag chips */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-zinc-900 cursor-pointer flex items-center justify-between gap-1.5 hover:border-slate-300 focus-within:border-[#0B57D0] focus-within:ring-2 focus-within:ring-[#0B57D0]/10 transition-all ${triggerClassName}`}
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
          {values.length === 0 ? (
            <span className="text-zinc-400 font-normal px-1">{placeholder}</span>
          ) : (
            values.map((val) => {
              const matched = users.find((u) => u.name === val || u.email === val);
              const label = matched?.name || val;
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[#0B57D0] text-[11px] font-semibold border border-blue-200"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-[#0B57D0] text-white flex items-center justify-center text-[8px]">
                    {label.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate max-w-[110px]">{label}</span>
                  <button
                    type="button"
                    onClick={(e) => removeUser(val, e)}
                    className="hover:text-rose-600 p-0.5 cursor-pointer ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })
          )}
        </div>
        <ChevronDown size={14} className={`text-zinc-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-56">
          {/* Search Box */}
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

          {/* User List Options with Checkbox */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-50 p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-center text-zinc-400 text-xs font-normal">
                No matching users found
              </div>
            ) : (
              filtered.map((u) => {
                const isSelected = values.some(
                  (v) => v.toLowerCase() === u.name.toLowerCase() || v.toLowerCase() === u.email.toLowerCase()
                );
                return (
                  <div
                    key={u.email}
                    onClick={() => toggleUser(u.name || u.email)}
                    className={`px-3 py-2 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isSelected ? "bg-[#D3E3FD]/50 text-[#0B57D0] font-semibold" : "hover:bg-slate-50 text-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-5 h-5 rounded-full bg-blue-50 text-[#0B57D0] flex items-center justify-center shrink-0 text-[10px] font-semibold border border-blue-100">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs truncate">{u.name}</span>
                        <span className="text-[10px] text-zinc-400 truncate">{u.email}</span>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-[#0B57D0] border-[#0B57D0] text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check size={11} className="stroke-[3]" />}
                    </div>
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

export type ManagementZoomMode = "semester" | "quarter" | "month" | "week";
export type LeaderZoomMode = "month" | "week" | "day";

function generateTimelineZoomConfig(zoom: ManagementZoomMode | LeaderZoomMode | string) {
  if (zoom === "semester") {
    // 3-Year Semesters: 6 Semesters across 2025 -> 2027 (H1, H2 each year)
    const cols = [];
    for (const y of [2025, 2026, 2027]) {
      cols.push({
        label: `H1 ${y}`,
        sub: `Jan – Jun`,
      });
      cols.push({
        label: `H2 ${y}`,
        sub: `Jul – Dec`,
      });
    }
    return {
      columns: cols,
      colWidth: 360,
      totalWidth: cols.length * 360,
    };
  }

  if (zoom === "quarter") {
    // 3-Year Quarters: 12 Quarters across 2025 -> 2027 (Q1, Q2, Q3, Q4 each year)
    const cols = [];
    for (const y of [2025, 2026, 2027]) {
      cols.push({ label: `Q1 ${y}`, sub: `Jan – Mar` });
      cols.push({ label: `Q2 ${y}`, sub: `Apr – Jun` });
      cols.push({ label: `Q3 ${y}`, sub: `Jul – Sep` });
      cols.push({ label: `Q4 ${y}`, sub: `Oct – Dec` });
    }
    return {
      columns: cols,
      colWidth: 200,
      totalWidth: cols.length * 200,
    };
  }

  if (zoom === "day") {
    // 3-Year Days: Jan 1, 2025 -> Dec 31, 2027 (1095 days)
    const cols = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const curr = new Date("2025-01-01T00:00:00");
    const end = new Date("2027-12-31T23:59:59");
    
    while (curr <= end) {
      const dNum = curr.getDate();
      const mIdx = curr.getMonth();
      const dayOfWeek = dayNames[curr.getDay()];
      cols.push({
        label: `${dNum}`,
        sub: `${monthNames[mIdx]} (${dayOfWeek})`,
      });
      curr.setDate(curr.getDate() + 1);
    }
    return {
      columns: cols,
      colWidth: 32,
      totalWidth: cols.length * 32,
    };
  }

  if (zoom === "month") {
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

  // zoom === "week"
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
}

function StandaloneWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");

  const [profile, setProfile] = React.useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ib_user_profile");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return null;
  });

  const [systemUsers, setSystemUsers] = React.useState<UserOption[]>(() => {
    const cached = getCachedWorkspaceData();
    if (cached && Array.isArray(cached.systemUsers) && cached.systemUsers.length > 0) {
      return cached.systemUsers.map((u: any) => ({
        name: u.name || u.email.split("@")[0],
        email: u.email,
        role: u.role,
      }));
    }
    return [];
  });

  const [loading, setLoading] = React.useState(false);
  const [mounted, setMounted] = React.useState(true);
  const [activeView, setActiveView] = React.useState<string | null>(viewParam || "management");

  // Restore cached profile on client mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ib_user_profile");
        if (cached) {
          setProfile(JSON.parse(cached));
        }
      } catch {}
    }
  }, []);

  // Management Gantt chart zoom mode: 'month' (default) | 'semester' | 'quarter' | 'week'
  const [zoomMode, setZoomMode] = React.useState<ManagementZoomMode>("month");

  // Status Filter: 'active' (Default: Active & Upcoming) | 'past' | 'all' | 'deleted' (30-day Retention Queue)
  const [statusFilter, setStatusFilter] = React.useState<"active" | "past" | "all" | "deleted">("active");

  // Today timestamp
  const [todayMs, setTodayMs] = React.useState<number>(() => Date.now());

  // State-managed projects list initialized with live database data (with instant localStorage/memory cache restoration)
  const [projectsList, setProjectsList] = React.useState<DummyProject[]>(() => {
    const cached = getCachedWorkspaceData();
    if (cached && cached.success) {
      return mapBackendDataToProjects(cached.projects || [], cached.milestones || [], cached.actions || []);
    }
    return [];
  });

  const [dataLoading, setDataLoading] = React.useState<boolean>(() => {
    const cached = getCachedWorkspaceData();
    return !(cached && cached.success && Array.isArray(cached.projects) && cached.projects.length > 0);
  });

  // Gantt chart expanded states
  const [expandedProjects, setExpandedProjects] = React.useState<Record<string, boolean>>({});
  const [expandedMilestones, setExpandedMilestones] = React.useState<Record<string, boolean>>({});

  // Modal dialog state for Create / Edit Project
  const [isAddProjectOpen, setIsAddProjectOpen] = React.useState(false);
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null);

  // Slide-Over Drawer State for Milestone Actions & Proof Timeline
  const [activeMilestoneDrawer, setActiveMilestoneDrawer] = React.useState<{
    milestone: DummyMilestone;
    projectTitle: string;
    projectManager: string;
    projectId?: string;
  } | null>(null);

  // Filter inside Milestone Drawer: "all" vs "done"
  const [drawerStatusFilter, setDrawerStatusFilter] = React.useState<"all" | "done">("all");

  // Pending Deadline Delay Requests state
  const [pendingDelays, setPendingDelays] = React.useState<any[]>(() => {
    const cached = getCachedWorkspaceData();
    if (cached && Array.isArray(cached.pendingDelays)) {
      return cached.pendingDelays;
    }
    return [];
  });

  // Delay Request Modal state
  const [delayRequestTarget, setDelayRequestTarget] = React.useState<{
    projectId: string;
    milestoneId: string;
    actionId?: string;
    title: string;
    currentEndDate: string;
    isMilestone: boolean;
  } | null>(null);
  const [delayNewEndDate, setDelayNewEndDate] = React.useState<string>("");
  const [delayReason, setDelayReason] = React.useState<string>("");
  const [delaySubmitting, setDelaySubmitting] = React.useState<boolean>(false);
  const [delayError, setDelayError] = React.useState<string>("");

  // Custom Confirmation Dialog State for 30-day queue deletion (NO native window confirmation)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = React.useState<{ id: string; title: string } | null>(null);

  // ----------------------------------------------------
  // TEAM LEADER HUB STATE
  // ----------------------------------------------------
  const [leaderViewMode, setLeaderViewMode] = React.useState<"gantt" | "hub">("gantt");
  const [leaderZoomMode, setLeaderZoomMode] = React.useState<"month" | "week" | "day">("day");
  const [expandedLeaderMilestones, setExpandedLeaderMilestones] = React.useState<Record<string, boolean>>({});
  const leaderTimelineScrollRef = React.useRef<HTMLDivElement>(null);
  const [leaderTodayOffscreen, setLeaderTodayOffscreen] = React.useState<"left" | "right" | null>(null);
  const [selectedLeaderFilter, setSelectedLeaderFilter] = React.useState<string | null>(null);
  const [selectedLeaderMilestoneId, setSelectedLeaderMilestoneId] = React.useState<string | null>(() => {
    const cached = getCachedWorkspaceData();
    if (cached && Array.isArray(cached.milestones) && cached.milestones.length > 0) {
      return cached.milestones[0].id;
    }
    return null;
  });
  const [selectedLeaderActionId, setSelectedLeaderActionId] = React.useState<string | null>(null);
  const [redoModalTarget, setRedoModalTarget] = React.useState<{ actionId: string; logId: string; logTitle: string } | null>(null);
  const [redoCommentText, setRedoCommentText] = React.useState<string>("");
  const [tlMilestoneStatusFilter, setTlMilestoneStatusFilter] = React.useState<"active" | "past" | "all">("active");
  const [tlMilestoneSearchQuery, setTlMilestoneSearchQuery] = React.useState<string>("");
  const [tlActionStatusFilter, setTlActionStatusFilter] = React.useState<"all" | ActionLifecycleStatus>("Pending Action");
  const [tlActionSearchQuery, setTlActionSearchQuery] = React.useState<string>("");
  const [isAddActionModalOpen, setIsAddActionModalOpen] = React.useState<boolean>(false);
  const [editingActionItem, setEditingActionItem] = React.useState<DummyAction | null>(null);
  const [formActionTitle, setFormActionTitle] = React.useState<string>("");
  const [formActionInstructions, setFormActionInstructions] = React.useState<string>("");
  const [formActionAssignees, setFormActionAssignees] = React.useState<string[]>([]);
  const [formActionStartDate, setFormActionStartDate] = React.useState<string>("");
  const [formActionEndDate, setFormActionEndDate] = React.useState<string>("");
  const [formActionError, setFormActionError] = React.useState<string>("");
  const [proofReviewTarget, setProofReviewTarget] = React.useState<DummyTaskUpdate | null>(null);
  const [deleteActionConfirmTarget, setDeleteActionConfirmTarget] = React.useState<{
    action: DummyAction;
    milestoneTitle?: string;
  } | null>(null);

  // ----------------------------------------------------
  // ACTION / TASK EXECUTION HUB STATE
  // ----------------------------------------------------
  const [selectedMemberFilter, setSelectedMemberFilter] = React.useState<string | null>(null);
  const [taskExecutionTab, setTaskExecutionTab] = React.useState<"all" | ActionLifecycleStatus>("Pending Action");
  const [taskSearchQuery, setTaskSearchQuery] = React.useState<string>("");
  const [activeTaskDrawer, setActiveTaskDrawer] = React.useState<{
    action: DummyAction;
    milestone: DummyMilestone;
    project: DummyProject;
  } | null>(null);
  const [isAddProgressModalOpen, setIsAddProgressModalOpen] = React.useState<boolean>(false);
  const [editingLogId, setEditingLogId] = React.useState<string | null>(null);
  const [logFormWhatTitle, setLogFormWhatTitle] = React.useState<string>("");
  const [logFormWhatDesc, setLogFormWhatDesc] = React.useState<string>("");
  const [logFormWhatNext, setLogFormWhatNext] = React.useState<string>("");
  const [logFormAttachmentUrl, setLogFormAttachmentUrl] = React.useState<string>("");
  const [logFormAttachmentPdfs, setLogFormAttachmentPdfs] = React.useState<Array<{ name: string; url: string; size?: number }>>([]);
  const [isUploadingPdf, setIsUploadingPdf] = React.useState<boolean>(false);
  const [pdfUploadProgressText, setPdfUploadProgressText] = React.useState<string>("");
  const [logFormProofPhotoData, setLogFormProofPhotoData] = React.useState<string>("");
  const [logFormProofPhotos, setLogFormProofPhotos] = React.useState<string[]>([]);
  const [isUploadingProof, setIsUploadingProof] = React.useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = React.useState<string>("");
  const [isSubmittingLog, setIsSubmittingLog] = React.useState<boolean>(false);
  const [isSubmittingVerification, setIsSubmittingVerification] = React.useState<boolean>(false);
  const [logFormError, setLogFormError] = React.useState<string>("");
  
  // Multi-Photo Carousel / Lightbox Viewer State
  const [photoSliderState, setPhotoSliderState] = React.useState<{
    title: string;
    photos: string[];
    activeIndex: number;
  } | null>(null);

  // Keyboard navigation for photo carousel
  React.useEffect(() => {
    if (!photoSliderState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPhotoSliderState(null);
      } else if (e.key === "ArrowLeft") {
        setPhotoSliderState((prev) => {
          if (!prev || prev.photos.length <= 1) return prev;
          const newIdx = (prev.activeIndex - 1 + prev.photos.length) % prev.photos.length;
          return { ...prev, activeIndex: newIdx };
        });
      } else if (e.key === "ArrowRight") {
        setPhotoSliderState((prev) => {
          if (!prev || prev.photos.length <= 1) return prev;
          const newIdx = (prev.activeIndex + 1) % prev.photos.length;
          return { ...prev, activeIndex: newIdx };
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photoSliderState]);

  // Safe helper to extract photo array from log/update object
  const getProofPhotos = (item?: { proofPhotos?: string[]; proofPhotoData?: string; proofPhotoUrl?: string }): string[] => {
    if (!item) return [];
    if (item.proofPhotos && Array.isArray(item.proofPhotos) && item.proofPhotos.length > 0) {
      return item.proofPhotos.filter(Boolean);
    }
    if (item.proofPhotoData) return [item.proofPhotoData];
    if (item.proofPhotoUrl) return [item.proofPhotoUrl];
    return [];
  };

  // Safe helper to extract PDF attachments array from log/update object
  const getPdfAttachments = (item?: {
    attachmentPdfs?: Array<{ name: string; url: string; size?: number } | string>;
    attachmentUrl?: string;
    proofLink?: string;
  }): Array<{ name: string; url: string; size?: number }> => {
    if (!item) return [];
    const results: Array<{ name: string; url: string; size?: number }> = [];
    if (Array.isArray(item.attachmentPdfs) && item.attachmentPdfs.length > 0) {
      item.attachmentPdfs.forEach((p, idx) => {
        if (typeof p === "string") {
          results.push({ name: `Document ${idx + 1}.pdf`, url: p });
        } else if (p && p.url) {
          results.push({ name: p.name || `Document ${idx + 1}.pdf`, url: p.url, size: p.size });
        }
      });
    } else if (item.attachmentUrl) {
      const isPdf = item.attachmentUrl.toLowerCase().includes(".pdf") || item.attachmentUrl.startsWith("data:application/pdf");
      results.push({ name: isPdf ? "Attached Document.pdf" : "Attachment Link", url: item.attachmentUrl });
    } else if (item.proofLink) {
      results.push({ name: "Proof Attachment.pdf", url: item.proofLink });
    }
    return results;
  };

  // Open PDF in a new window/tab using a clean Blob URL
  const openPdfInNewTab = (pdfDataOrUrl: string, fileName: string = "document.pdf") => {
    if (!pdfDataOrUrl) return;
    try {
      if (
        pdfDataOrUrl.startsWith("data:application/pdf") ||
        pdfDataOrUrl.startsWith("data:application/octet-stream") ||
        pdfDataOrUrl.startsWith("data:")
      ) {
        const parts = pdfDataOrUrl.split(",");
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
        const b64Data = parts[1] || "";
        const byteCharacters = atob(b64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime || "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
        return;
      }

      if (pdfDataOrUrl.startsWith("blob:")) {
        window.open(pdfDataOrUrl, "_blank");
        return;
      }

      if (pdfDataOrUrl.startsWith("http://") || pdfDataOrUrl.startsWith("https://")) {
        fetch(pdfDataOrUrl)
          .then((res) => {
            if (!res.ok) throw new Error("Network response not ok");
            return res.blob();
          })
          .then((blob) => {
            const pdfBlob = new Blob([blob], { type: "application/pdf" });
            const blobUrl = URL.createObjectURL(pdfBlob);
            window.open(blobUrl, "_blank");
          })
          .catch(() => {
            window.open(pdfDataOrUrl, "_blank");
          });
        return;
      }

      // Raw base64 string without data prefix
      const byteCharacters = atob(pdfDataOrUrl);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (err) {
      console.error("Failed to create PDF blob URL:", err);
      window.open(pdfDataOrUrl, "_blank");
    }
  };

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

  const loadWorkspaceData = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setDataLoading(true);
      const res = await fetchWorkspaceDashboard();
      if (res && res.success) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("ib_workspace_cache", JSON.stringify(res));
          } catch {}
        }
        const mapped = mapBackendDataToProjects(res.projects || [], res.milestones || [], res.actions || []);
        setProjectsList(mapped);
        setPendingDelays(res.pendingDelays || []);
        if (Array.isArray(res.systemUsers) && res.systemUsers.length > 0) {
          setSystemUsers(
            res.systemUsers.map(u => ({
              name: u.name || u.email.split("@")[0],
              email: u.email,
              role: u.role,
            }))
          );
        }
      }
    } catch (err) {
      console.error("Failed to load workspace data:", err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const handleOpenDelayRequest = (target: {
    projectId: string;
    milestoneId: string;
    actionId?: string;
    title: string;
    currentEndDate: string;
    isMilestone: boolean;
  }) => {
    setDelayRequestTarget(target);
    const curTime = new Date(target.currentEndDate).getTime();
    const nextWeek = new Date(isNaN(curTime) ? Date.now() + 7 * 86400000 : curTime + 7 * 86400000);
    const yyyy = nextWeek.getFullYear();
    const mm = String(nextWeek.getMonth() + 1).padStart(2, "0");
    const dd = String(nextWeek.getDate()).padStart(2, "0");
    setDelayNewEndDate(`${yyyy}-${mm}-${dd}`);
    setDelayReason("");
    setDelayError("");
  };

  const handleSubmitDelayRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delayRequestTarget) return;
    if (!delayNewEndDate) {
      setDelayError("Please select a new requested deadline.");
      return;
    }
    if (!delayReason.trim()) {
      setDelayError("Please provide a reason for the extension request.");
      return;
    }
    const curEndMs = new Date(delayRequestTarget.currentEndDate).getTime();
    const reqEndMs = new Date(delayNewEndDate).getTime();
    if (reqEndMs <= curEndMs) {
      setDelayError("Requested deadline must be after the current deadline.");
      return;
    }

    const target = delayRequestTarget;
    const reasonText = delayReason.trim();
    const reqByEmail = profile?.email || "team_member";
    const reqByName = profile?.name || "Team Member";

    // Instantly close modal and notify user
    setDelayRequestTarget(null);
    setDelayError("");
    setDelayReason("");
    showToast("Deadline extension request submitted to Project Manager!", "info");

    // Background sync
    (async () => {
      try {
        await submitPMDelayRequest({
          project_id: target.projectId,
          milestone_id: target.milestoneId,
          action_id: target.actionId || "",
          requested_by: reqByEmail,
          requested_by_name: reqByName,
          current_end_date: curEndMs,
          requested_end_date: reqEndMs,
          reason: reasonText,
        });
        await loadWorkspaceData(true);
      } catch (err: any) {
        console.error("Failed to submit delay request:", err);
        showToast(err.message || "Failed to submit delay request", "error");
      }
    })();
  };

  const handleApproveDelay = async (reqId: string, approved: boolean) => {
    const previousPending = [...pendingDelays];
    // Optimistically remove from pending delays
    setPendingDelays(prev => prev.filter(r => r.id !== reqId));
    showToast(
      approved ? "Deadline extension approved!" : "Deadline extension rejected.",
      approved ? "success" : "info"
    );

    // Background sync
    (async () => {
      try {
        await approvePMDelayRequest({
          request_id: reqId,
          approved,
          reviewer_name: profile?.name || "Project Manager",
        });
        await loadWorkspaceData(true);
      } catch (err: any) {
        console.error("Failed to process delay request:", err);
        setPendingDelays(previousPending);
        showToast(err.message || "Failed to process delay request", "error");
      }
    })();
  };

  const renderDelayRequestModal = () => {
    if (!delayRequestTarget) return null;
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 font-primary">
          
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-amber-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Request Deadline Extension
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[280px]">
                  {delayRequestTarget.isMilestone ? "Milestone" : "Action"}: {delayRequestTarget.title}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDelayRequestTarget(null)}
              className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmitDelayRequest} className="p-6 flex flex-col gap-4 text-xs">
            {delayError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {delayError}
              </div>
            )}

            {/* Current Deadline Info */}
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-zinc-500">Current Deadline:</span>
              <span className="font-semibold text-zinc-800">{formatDate(delayRequestTarget.currentEndDate)}</span>
            </div>

            {/* Requested New Deadline */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-zinc-700">Requested New Deadline *</label>
                {delayNewEndDate && (() => {
                  const cur = new Date(delayRequestTarget.currentEndDate).getTime();
                  const req = new Date(delayNewEndDate).getTime();
                  const diffDays = Math.round((req - cur) / 86400000);
                  if (diffDays > 0) {
                    return (
                      <span className="text-[11px] font-bold text-[#0B57D0] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        +{diffDays} days extension
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <input
                type="date"
                value={delayNewEndDate}
                onChange={(e) => setDelayNewEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0] text-xs font-medium"
                required
              />
            </div>

            {/* Reason for Delay */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-zinc-700">Reason for Extension / Delay *</label>
              <textarea
                rows={3}
                placeholder="Explain the impediment, dependency, or reason requiring deadline extension..."
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0] resize-none leading-relaxed text-xs"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDelayRequestTarget(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={delaySubmitting}
                className="px-4 py-2 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {delaySubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Submit Extension Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // 1. Admin A requests deletion (initiates 2-Admin approval process)
  const handleRequestProjectDeletion = async (projId: string, projTitle: string) => {
    const currentAdminEmail = profile?.email || "admin@hsgglobal.sg";
    const currentAdminName = profile?.name || "Administrator";
    const previousProjects = [...projectsList];

    // Optimistically update
    setProjectsList(prev => prev.map(p => p.id === projId ? {
      ...p,
      deleteRequestedBy: currentAdminEmail,
      deleteRequestedByName: currentAdminName,
      deleteRequestedAt: Date.now(),
    } : p));
    setDeleteConfirmTarget(null);
    setIsAddProjectOpen(false);
    setEditingProjectId(null);
    showToast("Project deletion requested. Awaiting 2nd Admin approval.", "info");

    (async () => {
      try {
        await savePMProject({
          id: projId,
          delete_requested_by: currentAdminEmail,
          delete_requested_by_name: currentAdminName,
          delete_requested_at: Date.now(),
        });
        await loadWorkspaceData(true);
      } catch (err: any) {
        console.error("Failed to request project deletion:", err);
        setProjectsList(previousProjects);
        showToast(err.message || "Failed to request project deletion", "error");
      }
    })();
  };

  // 2. Admin B approves deletion (moves project into 30-Day pending deletion queue)
  const handleApproveProjectDeletion = async (projId: string, projTitle: string) => {
    const currentAdminEmail = profile?.email || "admin@hsgglobal.sg";
    const previousProjects = [...projectsList];

    // Optimistically update
    setProjectsList(prev => prev.map(p => p.id === projId ? {
      ...p,
      deleteApprovedBy: currentAdminEmail,
      deletedAt: Date.now(),
    } : p));
    setDeleteConfirmTarget(null);
    setIsAddProjectOpen(false);
    setEditingProjectId(null);
    showToast("Project deletion approved and moved to 30-day queue.", "info");

    (async () => {
      try {
        await savePMProject({
          id: projId,
          delete_approved_by: currentAdminEmail,
          deleted_at: Date.now(),
        });
        await loadWorkspaceData(true);
      } catch (err: any) {
        console.error("Failed to approve project deletion:", err);
        setProjectsList(previousProjects);
        showToast(err.message || "Failed to approve project deletion", "error");
      }
    })();
  };

  // 3. Admin A or Admin B cancels the deletion request
  const handleCancelDeletionRequest = async (projId: string, projTitle: string) => {
    const previousProjects = [...projectsList];

    // Optimistically update
    setProjectsList(prev => prev.map(p => p.id === projId ? {
      ...p,
      deleteRequestedBy: undefined,
      deleteRequestedByName: undefined,
      deleteRequestedAt: undefined,
    } : p));
    setDeleteConfirmTarget(null);
    setIsAddProjectOpen(false);
    setEditingProjectId(null);
    showToast("Project deletion request cancelled.", "info");

    (async () => {
      try {
        await savePMProject({
          id: projId,
          delete_requested_by: null,
          delete_requested_by_name: null,
          delete_requested_at: null,
        });
        await loadWorkspaceData(true);
      } catch (err: any) {
        console.error("Failed to cancel deletion request:", err);
        setProjectsList(previousProjects);
        showToast(err.message || "Failed to cancel deletion request", "error");
      }
    })();
  };

  // 4. Restore / Undelete from 30-day pending trash
  const handleRevokeDeletion = async (projId: string) => {
    const previousProjects = [...projectsList];

    // Optimistically update
    setProjectsList(prev => prev.map(p => p.id === projId ? {
      ...p,
      deletedAt: undefined,
      deleteRequestedBy: undefined,
      deleteRequestedByName: undefined,
      deleteRequestedAt: undefined,
      deleteApprovedBy: undefined,
    } : p));
    showToast("Project restored successfully!", "success");

    (async () => {
      try {
        await savePMProject({
          id: projId,
          deleted_at: null,
          delete_requested_by: null,
          delete_requested_by_name: null,
          delete_requested_at: null,
          delete_approved_by: null,
        });
        await loadWorkspaceData(true);
      } catch (err: any) {
        console.error("Failed to restore project:", err);
        setProjectsList(previousProjects);
        showToast(err.message || "Failed to restore project", "error");
      }
    })();
  };

  const handlePermanentPurgeProject = async (projId: string) => {
    const previousProjects = [...projectsList];

    // Optimistically update
    setProjectsList(prev => prev.filter(p => p.id !== projId));
    showToast("Project permanently deleted.", "info");

    (async () => {
      try {
        await deletePMEntity("project", projId);
        await loadWorkspaceData(true);
      } catch (err: any) {
        console.error("Failed to purge project:", err);
        setProjectsList(previousProjects);
        showToast(err.message || "Failed to purge project", "error");
      }
    })();
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

  const handleSaveProject = async (e: React.FormEvent) => {
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

    const isEdit = !!editingProjectId;
    const projId = editingProjectId || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const startMs = new Date(formStartDate).getTime();
    const endMs = new Date(formEndDate).getTime();

    const matchingManager = availableUsers.find(
      (u) =>
        u.name.toLowerCase() === formManager.toLowerCase() ||
        u.email.toLowerCase() === formManager.toLowerCase()
    );
    const managerName = matchingManager?.name || formManager.trim() || profile?.name || "Project Manager";
    const managerEmail = matchingManager?.email || (formManager.includes("@") ? formManager.trim() : profile?.email) || "";

    const activeMilestonesInput = milestonesInput.filter(m => m.title.trim() !== "");
    const optimisticMilestones: DummyMilestone[] = activeMilestonesInput.map((m, index) => {
      let msStartMs = startMs;
      let msEndMs = m.deadline ? new Date(m.deadline).getTime() : endMs;
      if (m.deadline) {
        const daysToSubtract = m.prepUnit === "weeks" ? (m.prepValue || 1) * 7 : (m.prepValue || 1);
        msStartMs = Math.max(startMs, msEndMs - daysToSubtract * 24 * 60 * 60 * 1000);
      }
      const matchingLead = availableUsers.find(
        (u) =>
          u.name.toLowerCase() === m.lead.toLowerCase() ||
          u.email.toLowerCase() === m.lead.toLowerCase()
      );
      const leadName = matchingLead?.name || m.lead.trim() || managerName;
      const leadEmail = matchingLead?.email || (m.lead.includes("@") ? m.lead.trim() : managerEmail) || "";
      const msId = m.id.startsWith("ms-") ? `ms_${Date.now()}_${index}` : m.id;

      return {
        id: msId,
        title: m.title.trim(),
        lead: leadName,
        leadEmail: leadEmail,
        startDate: new Date(msStartMs).toISOString().split("T")[0],
        endDate: new Date(msEndMs).toISOString().split("T")[0],
        progress: 0,
        actions: [],
      };
    });

    const previousProjects = [...projectsList];

    // Optimistically update projectsList immediately
    setProjectsList(prev => {
      if (isEdit) {
        return prev.map(p => {
          if (p.id === projId) {
            return {
              ...p,
              title: formProjectTitle.trim(),
              manager: managerName,
              managerEmail: managerEmail,
              startDate: formStartDate,
              endDate: formEndDate,
              milestones: optimisticMilestones.length > 0 ? optimisticMilestones : p.milestones,
            };
          }
          return p;
        });
      } else {
        const newProj: DummyProject = {
          id: projId,
          title: formProjectTitle.trim(),
          department: "General",
          manager: managerName,
          managerEmail: managerEmail,
          startDate: formStartDate,
          endDate: formEndDate,
          progress: 0,
          status: "Active",
          milestones: optimisticMilestones,
        };
        return [newProj, ...prev];
      }
    });

    // Close modal & reset form immediately
    setIsAddProjectOpen(false);
    setEditingProjectId(null);
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

    showToast(isEdit ? "Project updated successfully!" : "Project created successfully!", "success");

    // Background sync
    (async () => {
      try {
        await savePMProject({
          id: projId,
          title: formProjectTitle.trim(),
          department: "General",
          manager_name: managerName,
          manager_user_id: managerEmail,
          start_date: startMs,
          end_date: endMs,
          status: "Active",
        });

        for (const [index, m] of activeMilestonesInput.entries()) {
          let msStartMs = startMs;
          let msEndMs = m.deadline ? new Date(m.deadline).getTime() : endMs;
          if (m.deadline) {
            const daysToSubtract = m.prepUnit === "weeks" ? (m.prepValue || 1) * 7 : (m.prepValue || 1);
            msStartMs = Math.max(startMs, msEndMs - daysToSubtract * 24 * 60 * 60 * 1000);
          }

          const matchingLead = availableUsers.find(
            (u) =>
              u.name.toLowerCase() === m.lead.toLowerCase() ||
              u.email.toLowerCase() === m.lead.toLowerCase()
          );
          const leadName = matchingLead?.name || m.lead.trim() || managerName;
          const leadEmail = matchingLead?.email || (m.lead.includes("@") ? m.lead.trim() : managerEmail) || "";
          const msId = m.id.startsWith("ms-") ? `ms_${Date.now()}_${index}` : m.id;

          await savePMMilestone({
            id: msId,
            project_id: projId,
            title: m.title.trim(),
            lead_name: leadName,
            lead_user_id: leadEmail,
            start_date: msStartMs,
            end_date: msEndMs,
          });
        }

        await loadWorkspaceData(true);
      } catch (err: any) {
        console.error("Failed to save project:", err);
        setProjectsList(previousProjects);
        showToast(err.message || "Failed to save project", "error");
      }
    })();
  };

  // Available users from users table
  const availableUsers: UserOption[] = React.useMemo(() => {
    return systemUsers;
  }, [systemUsers]);

  // Timeline horizontal scroll container ref for Option C (Auto-scroll to Today)
  const timelineScrollRef = React.useRef<HTMLDivElement>(null);

  // 0. Synchronize view parameter from URL instantly without resetting data or re-subscribing auth
  React.useEffect(() => {
    if (viewParam && ["management", "team_leader", "team_member"].includes(viewParam)) {
      setActiveView(viewParam);
    } else if (!viewParam) {
      router.push("/");
    }
  }, [viewParam, router]);

  // 1. Initial mount: load data and set up auth once
  React.useEffect(() => {
    setMounted(true);
    setTodayMs(Date.now());

    let hasCachedData = false;
    const cached = getCachedWorkspaceData();
    if (cached && cached.success && Array.isArray(cached.projects) && cached.projects.length > 0) {
      hasCachedData = true;
      const mapped = mapBackendDataToProjects(cached.projects || [], cached.milestones || [], cached.actions || []);
      setProjectsList(mapped);
      setDataLoading(false);
      if (Array.isArray(cached.pendingDelays)) {
        setPendingDelays(cached.pendingDelays);
      }
      if (Array.isArray(cached.systemUsers) && cached.systemUsers.length > 0) {
        setSystemUsers(
          cached.systemUsers.map((u: any) => ({
            name: u.name || u.email.split("@")[0],
            email: u.email,
            role: u.role,
          }))
        );
      }
    }
    loadWorkspaceData(hasCachedData);

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

          try {
            const users = await fetchAllUsers(token, user.email || "");
            if (Array.isArray(users) && users.length > 0) {
              setSystemUsers(
                users
                  .filter(u => u.active === 1 || u.active === undefined)
                  .map(u => ({
                    name: u.name || u.email.split("@")[0],
                    email: u.email,
                    role: u.role,
                  }))
              );
            }
          } catch (ue) {
            console.warn("Could not fetch full users list:", ue);
          }
        } catch (e) {
          console.error("Auth profile error:", e);
        }
      } else {
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
                  users
                    .filter(u => u.active === 1 || u.active === undefined)
                    .map(u => ({
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
  }, [loadWorkspaceData]);

  const handleBackToMain = () => {
    router.push("/");
  };

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !(prev[id] !== false) }));
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
  const zoomConfig = React.useMemo(() => generateTimelineZoomConfig(zoomMode), [zoomMode]);

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

  // Anchor zoom to Today instantly when mounted, data loaded, zoomMode, or activeView changes
  React.useEffect(() => {
    if (!mounted) return;

    const performCenter = () => {
      if (activeView === "management" && timelineScrollRef.current) {
        const container = timelineScrollRef.current;
        const scrollTarget = todayPixelLeft - container.clientWidth / 2;
        container.scrollLeft = Math.max(0, scrollTarget);
        setTodayOffscreen(null);
      } else if (activeView === "team_leader" && leaderViewMode === "gantt" && leaderTimelineScrollRef.current) {
        const lConfig = generateTimelineZoomConfig(leaderZoomMode);
        const lTodayPixelLeft = (todayLeftPct / 100) * lConfig.totalWidth;
        const container = leaderTimelineScrollRef.current;
        const scrollTarget = lTodayPixelLeft - container.clientWidth / 2;
        container.scrollLeft = Math.max(0, scrollTarget);
        setLeaderTodayOffscreen(null);
      }
    };

    // Run immediately and follow up on next layout frames
    performCenter();
    const t1 = setTimeout(performCenter, 20);
    const t2 = setTimeout(performCenter, 80);
    const t3 = setTimeout(performCenter, 200);
    const t4 = setTimeout(performCenter, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [mounted, zoomMode, activeView, leaderZoomMode, leaderViewMode, todayPixelLeft, todayLeftPct, projectsList.length]);

  // Multi-Photo Carousel / Lightbox Modal Renderer (Slide Left / Right Navigation)
  const renderPhotoSliderModal = () => {
    if (!photoSliderState || photoSliderState.photos.length === 0) return null;
    const currentPhoto = photoSliderState.photos[photoSliderState.activeIndex] || photoSliderState.photos[0];

    return (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-150 select-none"
        onClick={() => setPhotoSliderState(null)}
      >
        <div 
          className="relative w-full max-w-5xl h-[90vh] flex flex-col justify-between text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 shrink-0 bg-black/50 rounded-xl backdrop-blur-xs border border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0B57D0] text-white text-xs font-semibold shadow-xs">
                <ImageIcon size={13} />
                <span>{photoSliderState.activeIndex + 1} / {photoSliderState.photos.length}</span>
              </div>
              <span className="text-xs text-zinc-200 font-medium truncate max-w-md">
                {photoSliderState.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={currentPhoto}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                title="Open full photo in new tab"
              >
                <ExternalLink size={15} />
              </a>
              <button
                type="button"
                onClick={() => setPhotoSliderState(null)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                title="Close viewer (Esc)"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Main Stage with Left & Right Arrows */}
          <div className="relative flex-1 flex items-center justify-center my-3 min-h-0 overflow-hidden">
            {photoSliderState.photos.length > 1 && (
              <button
                type="button"
                onClick={() => setPhotoSliderState(prev => {
                  if (!prev) return null;
                  const nextIdx = (prev.activeIndex - 1 + prev.photos.length) % prev.photos.length;
                  return { ...prev, activeIndex: nextIdx };
                })}
                className="absolute left-3 z-10 w-11 h-11 rounded-full bg-black/70 hover:bg-[#0B57D0] text-white flex items-center justify-center transition-all cursor-pointer shadow-lg hover:scale-110 active:scale-95 border border-white/20"
                title="Previous Photo (Left Arrow)"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            <div className="w-full h-full flex items-center justify-center p-2">
              <img
                key={photoSliderState.activeIndex}
                src={currentPhoto}
                alt={`Photo ${photoSliderState.activeIndex + 1}`}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95"
              />
            </div>

            {photoSliderState.photos.length > 1 && (
              <button
                type="button"
                onClick={() => setPhotoSliderState(prev => {
                  if (!prev) return null;
                  const nextIdx = (prev.activeIndex + 1) % prev.photos.length;
                  return { ...prev, activeIndex: nextIdx };
                })}
                className="absolute right-3 z-10 w-11 h-11 rounded-full bg-black/70 hover:bg-[#0B57D0] text-white flex items-center justify-center transition-all cursor-pointer shadow-lg hover:scale-110 active:scale-95 border border-white/20"
                title="Next Photo (Right Arrow)"
              >
                <ChevronRight size={24} />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {photoSliderState.photos.length > 1 && (
            <div className="shrink-0 px-4 py-2 bg-black/50 rounded-xl backdrop-blur-xs flex items-center justify-center gap-2 overflow-x-auto max-w-full border border-white/10">
              {photoSliderState.photos.map((photoUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPhotoSliderState(prev => prev ? ({ ...prev, activeIndex: idx }) : null)}
                  className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                    idx === photoSliderState.activeIndex 
                      ? "border-[#0B57D0] ring-2 ring-[#0B57D0]/50 scale-105" 
                      : "border-white/20 opacity-50 hover:opacity-100"
                  }`}
                >
                  <img src={photoUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActiveMilestoneDrawer = () => {
    if (!activeMilestoneDrawer) return null;
    return (
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
                title="Close"
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
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Target Due</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDelayRequest({
                        projectId: activeMilestoneDrawer.projectId || "",
                        milestoneId: activeMilestoneDrawer.milestone.id,
                        title: activeMilestoneDrawer.milestone.title,
                        currentEndDate: activeMilestoneDrawer.milestone.endDate,
                        isMilestone: true,
                      });
                    }}
                    className="text-[10px] text-[#0B57D0] hover:text-[#0842A0] font-semibold flex items-center gap-0.5 cursor-pointer"
                    title="Request Deadline Extension"
                  >
                    <Clock size={10} />
                    <span>Delay?</span>
                  </button>
                </div>
                <span className="text-xs font-medium text-zinc-700 truncate mt-0.5">
                  {formatDate(activeMilestoneDrawer.milestone.endDate)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col shadow-2xs">
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Completion Progress</span>
                <span className="text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>{activeMilestoneDrawer.milestone.progress}% • {activeMilestoneDrawer.milestone.actions.filter(a => a.status === "Completed").length}/{activeMilestoneDrawer.milestone.actions.length} Actions</span>
                </span>
              </div>
            </div>

            {/* Sub-header title */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                <Clock size={13} className="text-[#0B57D0]" />
                <span>Progress Updates & Task Timeline</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-normal">
                Chronological Feed
              </span>
            </div>

          </div>

          {/* Drawer Scrollable Timeline Body (Displaying all action daily progress updates & completed task updates) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFC]">
            {(() => {
              interface UnifiedTimelineItem {
                id: string;
                timestamp: string;
                dateSort: number;
                actionTitle: string;
                author: string;
                title: string;
                description?: string;
                whatIsNext?: string;
                attachmentUrl?: string;
                attachmentPdfs?: Array<{ name: string; url: string; size?: number } | string>;
                proofPhotoData?: string;
                proofPhotos?: string[];
                isMilestoneCompleted?: boolean;
              }

              const timelineEntries: UnifiedTimelineItem[] = [];

              // 1. Gather all action daily logs
              (activeMilestoneDrawer.milestone.actions || []).forEach((act) => {
                (act.logs || []).forEach((log) => {
                  const parsedTime = new Date(log.timestamp.replace(" ", "T")).getTime() || Date.now();
                  timelineEntries.push({
                    id: `log-${log.id}`,
                    timestamp: log.timestamp,
                    dateSort: parsedTime,
                    actionTitle: act.title,
                    author: log.author,
                    title: log.whatIDidTitle,
                    description: log.whatIDidDesc,
                    whatIsNext: log.whatIsNext,
                    attachmentUrl: log.attachmentUrl,
                    attachmentPdfs: log.attachmentPdfs,
                    proofPhotoData: log.proofPhotoData,
                    proofPhotos: log.proofPhotos || (log.proofPhotoData ? [log.proofPhotoData] : undefined),
                    isMilestoneCompleted: false,
                  });
                });
              });

              // 2. Gather existing milestone updates (if any)
              (activeMilestoneDrawer.milestone.updates || []).forEach((up) => {
                const parsedTime = new Date(up.timestamp).getTime() || Date.now();
                timelineEntries.push({
                  id: `up-${up.id}`,
                  timestamp: up.timestamp,
                  dateSort: parsedTime,
                  actionTitle: up.actionTitle,
                  author: up.updatedBy,
                  title: up.taskTitle,
                  description: up.summary || up.proofNote,
                  whatIsNext: undefined,
                  attachmentUrl: up.proofLink,
                  attachmentPdfs: up.attachmentPdfs,
                  proofPhotoData: up.proofPhotoUrl,
                  proofPhotos: up.proofPhotos || (up.proofPhotoUrl ? [up.proofPhotoUrl] : undefined),
                  isMilestoneCompleted: true,
                });
              });

              // Sort chronologically descending (latest first)
              timelineEntries.sort((a, b) => b.dateSort - a.dateSort);

              if (timelineEntries.length === 0) {
                return (
                  <div className="py-20 flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-zinc-400">
                      <Clock3 size={24} />
                    </div>
                    <p className="text-xs font-medium text-zinc-600">No progress updates recorded yet</p>
                    <p className="text-[11px] text-zinc-400 max-w-xs">
                      Task execution logs, daily updates, and next step directives will appear here as team members make progress.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {timelineEntries.map((item) => {
                    const dateObj = new Date(item.timestamp.replace(" ", "T"));
                    const isValidDate = !isNaN(dateObj.getTime());
                    const day = isValidDate ? dateObj.toLocaleDateString("en-GB", { day: "2-digit" }) : "";
                    const month = isValidDate ? dateObj.toLocaleDateString("en-GB", { month: "short" }) : "";
                    const year = isValidDate ? dateObj.toLocaleDateString("en-GB", { year: "numeric" }) : item.timestamp;
                    const itemPhotos = getProofPhotos(item);
                    const itemPdfs = getPdfAttachments(item);

                    return (
                      <div key={item.id} className="flex items-start gap-4 group/task">
                        
                        {/* Left Side: Dedicated Date Column */}
                        <div className="w-20 shrink-0 flex flex-col items-end text-right pt-0.5">
                          {isValidDate ? (
                            <>
                              <span className="text-xs font-bold text-zinc-900 leading-tight">
                                {day} {month}
                              </span>
                              <span className="text-[10px] font-medium text-zinc-400">
                                {year}
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] font-medium text-zinc-500">
                              {item.timestamp}
                            </span>
                          )}
                        </div>

                        {/* Middle: Timeline Vertical Line & Node Checkmark */}
                        <div className="relative flex flex-col items-center shrink-0 self-stretch">
                          {/* Node Check Dot */}
                          <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center ring-4 ring-[#FAFAFC] z-10 shadow-2xs ${
                            item.isMilestoneCompleted ? "bg-emerald-600" : "bg-[#0B57D0]"
                          }`}>
                            {item.isMilestoneCompleted ? (
                              <Check size={12} className="stroke-[3]" />
                            ) : (
                              <CheckCircle2 size={12} className="stroke-[2.5]" />
                            )}
                          </div>
                          {/* Connecting vertical line below node */}
                          <div className="w-[2px] flex-1 bg-slate-200 my-1" />
                        </div>

                        {/* Right Side: Task Execution & Proof Card */}
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 hover:border-blue-300 p-4 shadow-xs transition-all flex flex-col gap-3 min-w-0">
                          
                          {/* Card Top Row: Action Name & Author */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-[10px] font-semibold text-[#0B57D0] uppercase tracking-wider truncate">
                                {item.actionTitle}
                              </span>
                              <h3 className="text-xs font-bold text-zinc-900 leading-snug">
                                {item.title}
                              </h3>
                            </div>

                            {/* Status / Author Tag */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-zinc-700 border border-slate-200 flex items-center gap-1">
                                <User size={10} className="text-zinc-500" />
                                <span>{item.author}</span>
                              </span>
                            </div>
                          </div>

                          {/* Summary / Description */}
                          {item.description && (
                            <div className="text-xs text-zinc-700 leading-relaxed font-normal bg-[#F8F9FB] p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                              {item.description}
                            </div>
                          )}

                          {/* What is Next Row */}
                          {item.whatIsNext && (
                            <div className="flex items-start gap-1.5 text-blue-900 bg-blue-50/70 px-2.5 py-1.5 rounded-lg border border-blue-100 text-xs">
                              <ArrowRight size={13} className="shrink-0 mt-0.5 text-blue-600" />
                              <div className="flex flex-col">
                                <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-600">What's Next:</span>
                                <span className="text-[11.5px] font-medium leading-snug">{item.whatIsNext}</span>
                              </div>
                            </div>
                          )}

                          {/* Attachments & Proof Photos */}
                          {(itemPdfs.length > 0 || itemPhotos.length > 0) && (
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                              {itemPdfs.map((pdf, pIdx) => (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => openPdfInNewTab(pdf.url, pdf.name)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50/80 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
                                  title="Open PDF in new tab"
                                >
                                  <FileText size={12} className="text-rose-600" />
                                  <span className="truncate max-w-[160px]">{pdf.name}</span>
                                  <ExternalLink size={10} className="text-rose-500/70" />
                                </button>
                              ))}

                              {itemPhotos.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPhotoSliderState({
                                    title: `${item.actionTitle}: ${item.title}`,
                                    photos: itemPhotos,
                                    activeIndex: 0
                                  })}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-medium transition-colors cursor-pointer"
                                >
                                  <ImageIcon size={12} />
                                  <span>Proof Photos ({itemPhotos.length})</span>
                                </button>
                              )}
                            </div>
                          )}

                          {/* Image Preview Gallery (Slide Clickable) */}
                          {itemPhotos.length > 0 && (
                            <div className="mt-1">
                              {itemPhotos.length === 1 ? (
                                <button
                                  type="button"
                                  onClick={() => setPhotoSliderState({
                                    title: `${item.actionTitle}: ${item.title}`,
                                    photos: itemPhotos,
                                    activeIndex: 0
                                  })}
                                  className="relative rounded-lg overflow-hidden border border-slate-200 max-h-48 block group/img w-full text-left cursor-pointer"
                                >
                                  <img
                                    src={itemPhotos[0]}
                                    alt={item.title}
                                    className="w-full h-40 object-cover transition-transform group-hover/img:scale-105"
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                                    Click to view photo in slide viewer
                                  </div>
                                </button>
                              ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {itemPhotos.slice(0, 4).map((photoUrl, pIdx) => {
                                    const isLastVisible = pIdx === 3 && itemPhotos.length > 4;
                                    const extraCount = itemPhotos.length - 4;
                                    return (
                                      <button
                                        key={pIdx}
                                        type="button"
                                        onClick={() => setPhotoSliderState({
                                          title: `${item.actionTitle}: ${item.title}`,
                                          photos: itemPhotos,
                                          activeIndex: pIdx
                                        })}
                                        className="relative aspect-4/3 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group/thumb cursor-pointer"
                                      >
                                        <img
                                          src={photoUrl}
                                          alt={`Proof ${pIdx + 1}`}
                                          className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105"
                                        />
                                        {isLastVisible && (
                                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xs">
                                            +{extraCount} more
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
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
    );
  };

  // Open Task Panel for Progress Logging & Action Execution
  const handleOpenTaskDrawer = (taskData: {
    action: DummyAction;
    milestone: DummyMilestone;
    project: DummyProject;
  }) => {
    setActiveTaskDrawer(taskData);
    setIsAddProgressModalOpen(false);
    setEditingLogId(null);
    setLogFormWhatTitle("");
    setLogFormWhatDesc("");
    setLogFormWhatNext("");
    setLogFormAttachmentUrl("");
    setLogFormAttachmentPdfs([]);
    setIsUploadingPdf(false);
    setPdfUploadProgressText("");
    setLogFormProofPhotoData("");
    setLogFormProofPhotos([]);
    setIsUploadingProof(false);
    setLogFormError("");
  };

  // Close Task Panel
  const handleCloseTaskDrawer = () => {
    setActiveTaskDrawer(null);
    setIsAddProgressModalOpen(false);
    setEditingLogId(null);
    setLogFormProofPhotos([]);
    setLogFormAttachmentPdfs([]);
    setIsUploadingPdf(false);
    setPdfUploadProgressText("");
    setIsUploadingProof(false);
    setLogFormError("");
  };

  // Open Edit Progress Log Modal (Allowed when not acknowledged yet)
  const handleOpenEditProgress = (log: ActionLog) => {
    setEditingLogId(log.id);
    setLogFormWhatTitle(log.whatIDidTitle || "");
    setLogFormWhatDesc(log.whatIDidDesc || "");
    setLogFormWhatNext(log.whatIsNext || "");
    setLogFormAttachmentUrl(log.attachmentUrl || "");
    const pdfs = getPdfAttachments(log);
    setLogFormAttachmentPdfs(pdfs);
    setIsUploadingPdf(false);
    setPdfUploadProgressText("");
    const photos = getProofPhotos(log);
    setLogFormProofPhotos(photos);
    setLogFormProofPhotoData(photos[0] || "");
    setIsUploadingProof(false);
    setLogFormError("");
    setIsAddProgressModalOpen(true);
  };

  // Handle Proof Image File Upload (Multi-file upload, up to 10 photos total, uploads to Cloudflare R2)
  const handleProofImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = logFormProofPhotos.length;
    if (currentCount >= 10) {
      setLogFormError("Maximum 10 proof photos allowed per update.");
      showToast("Maximum 10 proof photos allowed per update.", "warning");
      e.target.value = "";
      return;
    }

    const availableSlots = 10 - currentCount;
    const selectedFiles = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      setLogFormError(`Only ${availableSlots} more photo(s) could be added (maximum 10 total).`);
      showToast(`Only ${availableSlots} more photo(s) could be added (maximum 10 total).`, "warning");
    } else {
      setLogFormError("");
    }

    setIsUploadingProof(true);
    setUploadProgressText(`Uploading ${selectedFiles.length} photo(s)...`);
    showToast(`Uploading ${selectedFiles.length} proof photo(s) to cloud storage...`, "info");

    try {
      let completedCount = 0;
      const uploadPromises = selectedFiles.map((file) => {
        return new Promise<string>((resolve) => {
          if (!file.type.startsWith("image/")) {
            resolve("");
            return;
          }
          const reader = new FileReader();
          reader.onload = async (loadEvt) => {
            const result = loadEvt.target?.result as string;
            try {
              const res = await fetch("/api/workspace/upload-proof", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fileName: file.name,
                  contentType: file.type,
                  base64Data: result,
                }),
              });
              const json = (await res.json()) as any;
              completedCount++;
              setUploadProgressText(`Uploaded ${completedCount} of ${selectedFiles.length} photos...`);
              if (json && json.success && json.url) {
                resolve(json.url);
              } else {
                resolve(result);
              }
            } catch {
              completedCount++;
              resolve(result);
            }
          };
          reader.onerror = () => {
            completedCount++;
            resolve("");
          };
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(uploadPromises);
      const validUrls = results.filter((url) => Boolean(url));
      setLogFormProofPhotos((prev) => {
        const combined = [...prev, ...validUrls].slice(0, 10);
        setLogFormProofPhotoData(combined[0] || "");
        return combined;
      });

      if (validUrls.length > 0) {
        showToast(`Successfully uploaded ${validUrls.length} proof photo(s)!`, "success");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setLogFormError("An error occurred while uploading photos.");
      showToast("Failed to upload photo(s). Please retry.", "error");
    } finally {
      setIsUploadingProof(false);
      setUploadProgressText("");
      e.target.value = "";
    }
  };

  // Handle PDF File Upload (Multi-file upload, up to 5 PDFs total, uploads to Cloudflare R2 / base64)
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = logFormAttachmentPdfs.length;
    if (currentCount >= 5) {
      setLogFormError("Maximum 5 PDF attachments allowed per update.");
      showToast("Maximum 5 PDF attachments allowed per update.", "warning");
      e.target.value = "";
      return;
    }

    const availableSlots = 5 - currentCount;
    const selectedFiles = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      setLogFormError(`Only ${availableSlots} more PDF file(s) could be added (maximum 5 total).`);
      showToast(`Only ${availableSlots} more PDF file(s) could be added (maximum 5 total).`, "warning");
    } else {
      setLogFormError("");
    }

    setIsUploadingPdf(true);
    setPdfUploadProgressText(`Uploading ${selectedFiles.length} PDF(s)...`);
    showToast(`Uploading ${selectedFiles.length} PDF file(s)...`, "info");

    try {
      let completedCount = 0;
      const uploadPromises = selectedFiles.map((file) => {
        return new Promise<{ name: string; url: string; size: number }>((resolve) => {
          const reader = new FileReader();
          reader.onload = async (loadEvt) => {
            const result = loadEvt.target?.result as string;
            try {
              const res = await fetch("/api/workspace/upload-proof", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fileName: file.name,
                  contentType: "application/pdf",
                  base64Data: result,
                }),
              });
              const json = (await res.json()) as any;
              completedCount++;
              setPdfUploadProgressText(`Uploaded ${completedCount} of ${selectedFiles.length} PDFs...`);
              if (json && json.success && json.url) {
                resolve({ name: file.name, url: json.url, size: file.size });
              } else {
                resolve({ name: file.name, url: result, size: file.size });
              }
            } catch {
              completedCount++;
              resolve({ name: file.name, url: result, size: file.size });
            }
          };
          reader.onerror = () => {
            completedCount++;
            resolve({ name: file.name, url: "", size: file.size });
          };
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(uploadPromises);
      const validPdfs = results.filter((p) => Boolean(p.url));
      setLogFormAttachmentPdfs((prev) => {
        const combined = [...prev, ...validPdfs].slice(0, 5);
        if (combined.length > 0 && !logFormAttachmentUrl) {
          setLogFormAttachmentUrl(typeof combined[0] === 'string' ? combined[0] : combined[0].url);
        }
        return combined;
      });

      if (validPdfs.length > 0) {
        showToast(`Successfully uploaded ${validPdfs.length} PDF document(s)!`, "success");
      }
    } catch (err: any) {
      console.error("PDF upload error:", err);
      setLogFormError("An error occurred while uploading PDF files.");
      showToast("Failed to upload PDF file(s). Please retry.", "error");
    } finally {
      setIsUploadingPdf(false);
      setPdfUploadProgressText("");
      e.target.value = "";
    }
  };

  // Save or Update Daily Progress Log via live backend API with Optimistic UI
  const handleSaveDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskDrawer) return;

    if (!logFormWhatTitle.trim()) {
      setLogFormError("Please state what you accomplished in this update.");
      showToast("Please state what you accomplished in this update.", "warning");
      return;
    }

    if (isUploadingProof) {
      showToast("Please wait for photo upload to finish.", "info");
      return;
    }

    if (isUploadingPdf) {
      showToast("Please wait for PDF upload to finish.", "info");
      return;
    }

    const { action, milestone, project } = activeTaskDrawer;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const fullTimestamp = `${day}/${month}/${year} ${hours}:${minutes}`;

    const prevDrawerState = { ...activeTaskDrawer };
    const prevProjectsList = [...projectsList];

    if (editingLogId) {
      // Editing existing unacknowledged log
      const existingLogs = activeTaskDrawer.action.logs || [];
      const updatedLogs = existingLogs.map((l) => {
        if (l.id === editingLogId) {
          return {
            ...l,
            whatIDidTitle: logFormWhatTitle.trim(),
            whatIDidDesc: logFormWhatDesc.trim(),
            whatIsNext: logFormWhatNext.trim() || undefined,
            attachmentUrl: logFormAttachmentPdfs.length > 0 ? (typeof logFormAttachmentPdfs[0] === 'string' ? logFormAttachmentPdfs[0] : logFormAttachmentPdfs[0].url) : (logFormAttachmentUrl.trim() || undefined),
            attachmentPdfs: logFormAttachmentPdfs.length > 0 ? logFormAttachmentPdfs : undefined,
            proofPhotoData: logFormProofPhotos[0] || undefined,
            proofPhotos: logFormProofPhotos.length > 0 ? logFormProofPhotos : undefined,
          };
        }
        return l;
      });

      // 1. Instant Optimistic UI Update
      setActiveTaskDrawer((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          action: {
            ...prev.action,
            logs: updatedLogs,
          },
        };
      });

      setProjectsList((prevProjs) =>
        prevProjs.map((p) => ({
          ...p,
          milestones: p.milestones.map((m) => ({
            ...m,
            actions: m.actions.map((a) => (a.id === action.id ? { ...a, logs: updatedLogs } : a)),
          })),
        }))
      );

      // Close modal & notify immediately
      setIsAddProgressModalOpen(false);
      setEditingLogId(null);
      setLogFormWhatTitle("");
      setLogFormWhatDesc("");
      setLogFormWhatNext("");
      setLogFormAttachmentUrl("");
      setLogFormProofPhotoData("");
      setLogFormProofPhotos([]);
      setIsUploadingProof(false);
      setLogFormError("");
      showToast("Progress log updated successfully!", "success");

      // 2. Background API Sync
      savePMAction({ id: action.id, logs: updatedLogs })
        .then(() => loadWorkspaceData(true))
        .catch((err: any) => {
          console.error("Background sync error:", err);
          setActiveTaskDrawer(prevDrawerState);
          setProjectsList(prevProjectsList);
          showToast(err.message || "Failed to sync update to server. Rolled back.", "error");
        });
    } else {
      // Creating new log
      const newLog: ActionLog = {
        id: `log-${Date.now()}`,
        timestamp: fullTimestamp,
        author: profile?.name || profile?.email || "Team Member",
        whatIDidTitle: logFormWhatTitle.trim(),
        whatIDidDesc: logFormWhatDesc.trim(),
        whatIsNext: logFormWhatNext.trim() || undefined,
        attachmentUrl: logFormAttachmentPdfs.length > 0 ? (typeof logFormAttachmentPdfs[0] === 'string' ? logFormAttachmentPdfs[0] : logFormAttachmentPdfs[0].url) : (logFormAttachmentUrl.trim() || undefined),
        attachmentPdfs: logFormAttachmentPdfs.length > 0 ? logFormAttachmentPdfs : undefined,
        proofPhotoData: logFormProofPhotos[0] || undefined,
        proofPhotos: logFormProofPhotos.length > 0 ? logFormProofPhotos : undefined,
      };

      const updatedLogs = [newLog, ...(activeTaskDrawer.action.logs || [])];
      const isDone = activeTaskDrawer.action.status === "Completed" || activeTaskDrawer.action.status === "Complete";
      const updatedProg = calculateActionProgress(updatedLogs.length, isDone);

      // 1. Instant Optimistic UI Update
      setActiveTaskDrawer((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          action: {
            ...prev.action,
            status: isDone ? "Completed" : "In Progress",
            progress: updatedProg,
            logs: updatedLogs,
          },
        };
      });

      setProjectsList((prevProjs) =>
        prevProjs.map((p) => ({
          ...p,
          milestones: p.milestones.map((m) => ({
            ...m,
            actions: m.actions.map((a) =>
              a.id === action.id
                ? {
                    ...a,
                    status: isDone ? "Completed" : "In Progress",
                    progress: updatedProg,
                    logs: updatedLogs,
                  }
                : a
            ),
          })),
        }))
      );

      // Close modal & notify immediately
      setIsAddProgressModalOpen(false);
      setEditingLogId(null);
      setLogFormWhatTitle("");
      setLogFormWhatDesc("");
      setLogFormWhatNext("");
      setLogFormAttachmentUrl("");
      setLogFormProofPhotoData("");
      setLogFormProofPhotos([]);
      setIsUploadingProof(false);
      setLogFormError("");
      showToast("Progress log submitted successfully!", "success");

      // 2. Background API Sync
      addPMActionLog(action.id, newLog)
        .then(() => loadWorkspaceData(true))
        .catch((err: any) => {
          console.error("Background sync error:", err);
          setActiveTaskDrawer(prevDrawerState);
          setProjectsList(prevProjectsList);
          showToast(err.message || "Failed to sync log to server. Rolled back.", "error");
        });
    }
  };

  // Team Leader Review Actions at Dashboard Scope for Shared Drawer with Optimistic UI:
  const handleAcknowledgeProgressLogInDrawer = (actionId: string, logId: string) => {
    if (!activeTaskDrawer) return;
    const act = activeTaskDrawer.action;
    if (!act || !act.logs) return;

    const currentUserName = profile?.name || "Team Leader";
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().slice(0, 5);
    const fullTimestamp = `${dateStr} ${timeStr}`;

    const updatedLogs = act.logs.map((log) => {
      if (String(log.id) === String(logId)) {
        return {
          ...log,
          reviewStatus: "acknowledged" as const,
          reviewedBy: currentUserName,
          reviewedAt: fullTimestamp,
          reviewNote: undefined,
        };
      }
      return log;
    });

    const allLogsNowAcknowledged = updatedLogs.length > 0 && updatedLogs.every((l) => l.reviewStatus === "acknowledged");
    const isPendingVerif = act.status === "Pending Verification" || act.superState === "Pending Verification" || act.customStatus === "Pending Verification";
    const newStatus = isPendingVerif && allLogsNowAcknowledged ? "Completed" : act.status;
    const newProg = isPendingVerif && allLogsNowAcknowledged ? 100 : act.progress;

    const prevDrawerState = { ...activeTaskDrawer };
    const prevProjectsList = [...projectsList];

    // 1. Instant Optimistic UI Update
    setActiveTaskDrawer((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        action: {
          ...prev.action,
          status: newStatus,
          progress: newProg,
          logs: updatedLogs,
        },
      };
    });

    setProjectsList((prevProjs) =>
      prevProjs.map((p) => ({
        ...p,
        milestones: p.milestones.map((m) => ({
          ...m,
          actions: m.actions.map((a) =>
            a.id === actionId
              ? {
                  ...a,
                  status: newStatus,
                  progress: newProg,
                  logs: updatedLogs,
                }
              : a
          ),
        })),
      }))
    );

    showToast(
      isPendingVerif && allLogsNowAcknowledged
        ? "Progress acknowledged! All updates verified and Action marked Complete."
        : "Progress update acknowledged successfully!",
      "success"
    );

    // 2. Background API Sync
    const payload: any = {
      id: actionId,
      logs: updatedLogs,
    };
    if (isPendingVerif && allLogsNowAcknowledged) {
      payload.super_state = "Completed";
      payload.custom_status = "Completed";
    }

    savePMAction(payload)
      .then(() => loadWorkspaceData(true))
      .catch((err: any) => {
        console.error("Background sync error:", err);
        setActiveTaskDrawer(prevDrawerState);
        setProjectsList(prevProjectsList);
        showToast(err.message || "Failed to sync acknowledgment to server. Rolled back.", "error");
      });
  };

  const handleFinalizeActionCompletionInDrawer = (actionId: string) => {
    const prevDrawerState = activeTaskDrawer ? { ...activeTaskDrawer } : null;
    const prevProjectsList = [...projectsList];

    // 1. Instant Optimistic UI Update
    setActiveTaskDrawer((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        action: {
          ...prev.action,
          status: "Completed",
          progress: 100,
        },
      };
    });

    setProjectsList((prevProjs) =>
      prevProjs.map((p) => ({
        ...p,
        milestones: p.milestones.map((m) => ({
          ...m,
          actions: m.actions.map((a) => (a.id === actionId ? { ...a, status: "Completed", progress: 100 } : a)),
        })),
      }))
    );

    showToast("Action successfully finalized and marked as Complete!", "success");

    // 2. Background API Sync
    savePMAction({
      id: actionId,
      super_state: "Completed",
      custom_status: "Completed",
    })
      .then(() => loadWorkspaceData(true))
      .catch((err: any) => {
        console.error("Background sync error:", err);
        if (prevDrawerState) setActiveTaskDrawer(prevDrawerState);
        setProjectsList(prevProjectsList);
        showToast(err.message || "Failed to finalize completion on server. Rolled back.", "error");
      });
  };

  const handleRedoProgressLogInDrawer = (actionId: string, logId: string, note: string) => {
    if (!activeTaskDrawer) return;
    const act = activeTaskDrawer.action;
    if (!act || !act.logs) return;

    const currentUserName = profile?.name || "Team Leader";
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().slice(0, 5);
    const fullTimestamp = `${dateStr} ${timeStr}`;

    const updatedLogs = act.logs.map((log) => {
      if (String(log.id) === String(logId)) {
        return {
          ...log,
          reviewStatus: "redo" as const,
          reviewedBy: currentUserName,
          reviewedAt: fullTimestamp,
          reviewNote: note.trim() || "Please revise and redo this progress task per guidelines.",
        };
      }
      return log;
    });

    const prevDrawerState = { ...activeTaskDrawer };
    const prevProjectsList = [...projectsList];

    // 1. Instant Optimistic UI Update
    setActiveTaskDrawer((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        action: {
          ...prev.action,
          logs: updatedLogs,
        },
      };
    });

    setProjectsList((prevProjs) =>
      prevProjs.map((p) => ({
        ...p,
        milestones: p.milestones.map((m) => ({
          ...m,
          actions: m.actions.map((a) => (a.id === actionId ? { ...a, logs: updatedLogs } : a)),
        })),
      }))
    );

    setRedoModalTarget(null);
    setRedoCommentText("");
    showToast("Redo requested! Team member has been notified to revise this update.", "info");

    // 2. Background API Sync
    savePMAction({
      id: actionId,
      logs: updatedLogs,
    })
      .then(() => loadWorkspaceData(true))
      .catch((err: any) => {
        console.error("Background sync error:", err);
        setActiveTaskDrawer(prevDrawerState);
        setProjectsList(prevProjectsList);
        showToast(err.message || "Failed to sync redo request to server. Rolled back.", "error");
      });
  };

  // Render Action Drawer (Single Action Focus)
  const renderTaskDrawer = () => {
    if (!activeTaskDrawer) return null;

    const isTeamLeaderMode = activeView === "team_leader";
    const logs = activeTaskDrawer.action.logs || [];
    const ackedLogs = logs.filter((l) => l.reviewStatus === "acknowledged");
    const isPendingVerif = activeTaskDrawer.action.status === "Pending Verification";
    const allAcked = logs.length > 0 && ackedLogs.length === logs.length;
    const isActionComplete = activeTaskDrawer.action.status === "Completed" || activeTaskDrawer.action.status === "Complete";

    return (
      <div
        onClick={handleCloseTaskDrawer}
        className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150 cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 font-primary cursor-default"
        >
          {/* Task Panel Top Section / Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-[#FAFAFB] flex flex-col gap-3 shrink-0">
            {/* Top Row: Title, Due Date, and Close Button */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-900 leading-snug">
                    {activeTaskDrawer.action.title}
                  </h2>
                  {isActionComplete && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      ✓ Completed
                    </span>
                  )}
                  {isPendingVerif && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 shrink-0">
                      Pending Verification
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-zinc-400">
                  {activeTaskDrawer.project.title} • {activeTaskDrawer.milestone.title}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200">
                  <Calendar size={13} className="text-zinc-500" />
                  <span className="font-normal text-zinc-500">Due Date:</span>
                  <strong className="text-zinc-900 font-semibold">{formatDate(activeTaskDrawer.action.endDate)}</strong>
                  {/* Delay request is strictly for Team Members (P3), not Team Leaders (P2) */}
                  {!isTeamLeaderMode && activeTaskDrawer.action.status !== "Completed" && activeTaskDrawer.action.status !== "Complete" && (
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenDelayRequest({
                          projectId: activeTaskDrawer.project.id,
                          milestoneId: activeTaskDrawer.milestone.id,
                          actionId: activeTaskDrawer.action.id,
                          title: activeTaskDrawer.action.title,
                          currentEndDate: activeTaskDrawer.action.endDate,
                          isMilestone: false,
                        });
                      }}
                      className="ml-1 text-[10.5px] font-semibold text-[#0B57D0] hover:text-[#0842A0] cursor-pointer hover:underline"
                      title="Request Deadline Delay"
                    >
                      (Delay?)
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCloseTaskDrawer}
                  className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center cursor-pointer transition-colors"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Instruction from Team Leader (if present) */}
            {activeTaskDrawer.action.instructions ? (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-zinc-600">Instruction from Team Leader:</span>
                <p className="text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap">
                  {activeTaskDrawer.action.instructions}
                </p>
              </div>
            ) : null}

            {/* Assigned to: Plain Name (not badge) */}
            <div className="text-xs text-zinc-600 flex items-center gap-1.5">
              <span className="text-zinc-500 font-normal">Assigned to:</span>
              <span className="text-zinc-800 font-medium">{activeTaskDrawer.action.assignee}</span>
            </div>

            {/* Pending Verification Callout Banner for Team Leader */}
            {isTeamLeaderMode && isPendingVerif && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col gap-2 mt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertCircle size={14} className="text-amber-600 shrink-0" />
                    <span className="text-xs font-bold text-amber-900 truncate">Pending Verification</span>
                  </div>
                  <span className="text-[10.5px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                    {ackedLogs.length}/{logs.length} Acknowledged
                  </span>
                </div>
                <p className="text-[11px] text-amber-800/90 leading-snug">
                  {allAcked
                    ? "All progress updates are acknowledged. Finalize completion below."
                    : "Team member submitted completion. Please acknowledge each progress update to finalize 100% completion."}
                </p>
                {allAcked && (
                  <button
                    type="button"
                    onClick={() => handleFinalizeActionCompletionInDrawer(activeTaskDrawer.action.id)}
                    className="mt-1 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <Check size={13} className="stroke-[3]" />
                    <span>✓ Finalize & Mark Action as Complete</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Panel Content: Chronological History Timeline */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Clock3 size={15} className="text-[#0B57D0]" />
                <span>Activities & Progress History ({logs.length})</span>
              </h3>
              <span className="text-[10.5px] text-zinc-400">Permanently preserved timeline</span>
            </div>

            {logs.length === 0 ? (
              <div className="p-10 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-2 text-zinc-400">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0B57D0] flex items-center justify-center border border-blue-100">
                  <Inbox size={22} />
                </div>
                <span className="text-xs font-bold text-zinc-700">No Progress Logs Recorded Yet</span>
                <span className="text-[11px] text-zinc-400 max-w-xs">
                  {isTeamLeaderMode
                    ? "Team members have not logged any progress updates for this action yet."
                    : "Record your daily accomplishments, photos, and next steps to keep team leaders updated."}
                </span>
                {!isTeamLeaderMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLogId(null);
                      setLogFormWhatTitle("");
                      setLogFormWhatDesc("");
                      setLogFormWhatNext("");
                      setLogFormAttachmentUrl("");
                      setLogFormProofPhotoData("");
                      setLogFormError("");
                      setIsAddProgressModalOpen(true);
                    }}
                    className="mt-2 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95"
                  >
                    <Plus size={13} />
                    <span>Add First Progress Update</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                {logs.map((log) => {
                  const isAcknowledged = log.reviewStatus === "acknowledged";
                  const isRedo = log.reviewStatus === "redo";
                  return (
                    <div
                      key={log.id}
                      className={`bg-white rounded-xl border p-4 shadow-xs flex flex-col gap-2.5 relative transition-all ${
                        isAcknowledged
                          ? "border-emerald-200 ring-1 ring-emerald-500/10"
                          : isRedo
                          ? "border-rose-200 bg-rose-50/10 ring-1 ring-rose-500/10"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Log Header: Title, Author Timestamp & Edit / Review Options */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-7 h-7 rounded-full bg-blue-50 text-[#0B57D0] flex items-center justify-center shrink-0 text-[11px] font-bold border border-blue-100">
                            {log.author.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h4 className="text-xs font-bold text-zinc-900 leading-snug">
                              {log.whatIDidTitle}
                            </h4>
                            <span className="text-[10.5px] text-zinc-400">
                              Logged by <strong className="text-zinc-700">{log.author}</strong> • {formatDateTime(log.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Status or Edit Button (for Team Member) */}
                        {!isTeamLeaderMode && (
                          <div className="flex items-center gap-2 shrink-0">
                            {isAcknowledged ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                                <Check size={10} className="stroke-[3]" /> Acknowledged by Leader
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenEditProgress(log)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-[#0B57D0] hover:text-[#0842A0] text-[11px] font-medium border border-slate-200 cursor-pointer transition-colors shadow-2xs"
                                title="Edit progress update before team leader acknowledgment"
                              >
                                <Pencil size={11} />
                                <span>Edit</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Log Description */}
                      {log.whatIDidDesc && (
                        <div className="text-xs text-zinc-700 leading-relaxed font-normal bg-[#F8F9FB] p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                          {log.whatIDidDesc}
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

                      {/* Proof Attachments: Image Proof or PDF Attachment */}
                      {(() => {
                        const logPhotos = getProofPhotos(log);
                        const logPdfs = getPdfAttachments(log);
                        if (logPdfs.length === 0 && logPhotos.length === 0) return null;
                        return (
                          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {logPdfs.map((pdf, pIdx) => (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => openPdfInNewTab(pdf.url, pdf.name)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-medium border border-rose-200 cursor-pointer transition-colors shadow-2xs"
                                  title="Open PDF in new tab"
                                >
                                  <FileText size={12} className="text-rose-600" />
                                  <span className="truncate max-w-[150px]">{pdf.name}</span>
                                  <ExternalLink size={10} className="text-rose-500/70" />
                                </button>
                              ))}

                              {logPhotos.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPhotoSliderState({
                                    title: `${activeTaskDrawer.action.title}: ${log.whatIDidTitle}`,
                                    photos: logPhotos,
                                    activeIndex: 0
                                  })}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-medium border border-emerald-200 cursor-pointer transition-colors"
                                >
                                  <ImageIcon size={12} />
                                  <span>Proof Photos ({logPhotos.length})</span>
                                </button>
                              )}
                            </div>

                            {/* Thumbnail Strip */}
                            {logPhotos.length > 0 && (
                              <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                                {logPhotos.map((photoUrl, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => setPhotoSliderState({
                                      title: `${activeTaskDrawer.action.title}: ${log.whatIDidTitle}`,
                                      photos: logPhotos,
                                      activeIndex: pIdx
                                    })}
                                    className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 group/img cursor-pointer hover:ring-2 hover:ring-[#0B57D0]"
                                    title="Click to view photo in slide viewer"
                                  >
                                    <img
                                      src={photoUrl}
                                      alt={`Proof ${pIdx + 1}`}
                                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Team Leader Review / Acknowledge / Redo Row (strictly in P2 Team Leader Mode) */}
                      {isTeamLeaderMode && (
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                          {isAcknowledged ? (
                            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10.5px]">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                <span>Acknowledged by {log.reviewedBy || "Team Leader"} • {formatDateTime(log.reviewedAt || log.timestamp)}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setRedoModalTarget({
                                    actionId: activeTaskDrawer.action.id,
                                    logId: log.id,
                                    logTitle: log.whatIDidTitle,
                                  });
                                  setRedoCommentText("");
                                }}
                                className="text-zinc-500 hover:text-amber-800 text-[10px] font-medium underline cursor-pointer"
                              >
                                Request Redo
                              </button>
                            </div>
                          ) : isRedo ? (
                            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[11px] flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold flex items-center gap-1 text-rose-700">
                                  <RotateCcw size={12} /> Redo Requested by {log.reviewedBy || "Leader"}
                                </span>
                                <span className="text-[10px] text-rose-500">{formatDateTime(log.reviewedAt)}</span>
                              </div>
                              <p className="text-rose-800 font-normal italic">
                                "{log.reviewNote || "Please revise and resubmit."}"
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setRedoModalTarget({
                                    actionId: activeTaskDrawer.action.id,
                                    logId: log.id,
                                    logTitle: log.whatIDidTitle,
                                  });
                                  setRedoCommentText("");
                                }}
                                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-zinc-600 hover:text-rose-700 text-[11px] font-medium cursor-pointer transition-colors flex items-center gap-1"
                              >
                                <RotateCcw size={11} />
                                <span>Request Redo</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAcknowledgeProgressLogInDrawer(activeTaskDrawer.action.id, log.id)}
                                className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold shadow-2xs cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                              >
                                <Check size={11} className="stroke-[3]" />
                                <span>✓ Acknowledge</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Panel Footer */}
          <div className="px-6 py-3.5 border-t border-slate-200 bg-[#FAFAFB] flex items-center justify-between shrink-0">
            <span className="text-xs text-zinc-400">
              {logs.length} progress updates recorded
            </span>
            <div className="flex items-center gap-2">
              {/* TM ONLY: Submit for Completion */}
              {!isTeamLeaderMode &&
                !isActionComplete &&
                !isPendingVerif &&
                logs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTaskCompleteConfirmTarget({
                        action: activeTaskDrawer.action,
                        milestone: activeTaskDrawer.milestone,
                        project: activeTaskDrawer.project,
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95"
                    title="Submit this action for team leader verification and completion"
                  >
                    <CheckCircle2 size={13} className="stroke-[2.5]" />
                    <span>Submit for Completion</span>
                  </button>
                )}

              {/* TL ONLY: Finalize & Mark Complete Button if all acknowledged */}
              {isTeamLeaderMode && isPendingVerif && allAcked && (
                <button
                  type="button"
                  onClick={() => handleFinalizeActionCompletionInDrawer(activeTaskDrawer.action.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95"
                >
                  <Check size={13} className="stroke-[3]" />
                  <span>✓ Finalize Complete</span>
                </button>
              )}

              {isPendingVerif && (!isTeamLeaderMode || !allAcked) && (
                <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-amber-600" />
                  <span>Awaiting Verification</span>
                </span>
              )}

              {/* Add Progress button for Team Member or Leader note */}
              {!isTeamLeaderMode && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingLogId(null);
                    setLogFormWhatTitle("");
                    setLogFormWhatDesc("");
                    setLogFormWhatNext("");
                    setLogFormAttachmentUrl("");
                    setLogFormProofPhotoData("");
                    setLogFormProofPhotos([]);
                    setIsUploadingProof(false);
                    setLogFormError("");
                    setIsAddProgressModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Progress</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCloseTaskDrawer}
                className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  };

  // Render Add / Edit Progress Log Modal
  const renderAddProgressModal = () => {
    if (!isAddProgressModalOpen || !activeTaskDrawer) return null;

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-xl max-h-[88vh] rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 font-primary my-auto">
          
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-white shrink-0">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">
                {editingLogId ? "Edit Progress Log" : "Add Progress Log"}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-md">
                {activeTaskDrawer.action.title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsAddProgressModalOpen(false);
                setEditingLogId(null);
              }}
              className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Form Body */}
          <form id="center-daily-log-form" onSubmit={handleSaveDailyLog} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              {logFormError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  {logFormError}
                </div>
              )}

              {/* What Did I Do (Title) */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-zinc-700">What have you done? *</label>
                <input
                  type="text"
                  placeholder="e.g. Completed initial 20 retail store audits"
                  value={logFormWhatTitle}
                  onChange={(e) => setLogFormWhatTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0] text-xs"
                  required
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-zinc-700">Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide details of what you completed..."
                  value={logFormWhatDesc}
                  onChange={(e) => setLogFormWhatDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/10 transition-all font-primary leading-relaxed resize-none"
                />
              </div>

              {/* What's next */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-zinc-700">What's next?</label>
                <input
                  type="text"
                  placeholder="e.g. Schedule route for East cluster stores tomorrow"
                  value={logFormWhatNext}
                  onChange={(e) => setLogFormWhatNext(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0] text-xs"
                />
              </div>

              {/* Proof Photos (Multi-Upload, Max 10) */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-700 flex items-center gap-1">
                    <ImageIcon size={12} className="text-zinc-500" />
                    <span>Proof Photos (Max 10)</span>
                  </label>
                  <span className="text-[11px] font-medium text-zinc-400">
                    {logFormProofPhotos.length} / 10 photos
                  </span>
                </div>

                {/* Upload Dropzone / Button */}
                {logFormProofPhotos.length < 10 && (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      id="center-proof-image-upload"
                      onChange={handleProofImageUpload}
                      disabled={isUploadingProof}
                      className="hidden"
                    />
                    <label
                      htmlFor="center-proof-image-upload"
                      className={`w-full px-3 py-2.5 rounded-lg border border-dashed border-slate-300 bg-[#F8F9FB] hover:bg-slate-100 text-zinc-600 text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition-colors ${
                        isUploadingProof ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      {isUploadingProof ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-[#0B57D0]" />
                          <span>Uploading photos to cloud...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={13} className="text-[#0B57D0]" />
                          <span>{logFormProofPhotos.length === 0 ? "Choose photos (up to 10)..." : "+ Add more photos..."}</span>
                        </>
                      )}
                    </label>
                  </div>
                )}

                {/* Thumbnails Grid (Up to 10) */}
                {logFormProofPhotos.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mt-1">
                    {logFormProofPhotos.map((photoUrl, pIdx) => (
                      <div 
                        key={pIdx} 
                        className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group/item"
                      >
                        <img
                          src={photoUrl}
                          alt={`Upload ${pIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => {
                            setLogFormProofPhotos((prev) => {
                              const next = prev.filter((_, idx) => idx !== pIdx);
                              setLogFormProofPhotoData(next[0] || "");
                              return next;
                            });
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-rose-600 transition-all cursor-pointer"
                          title="Remove photo"
                        >
                          <X size={11} />
                        </button>
                        {/* Preview trigger */}
                        <button
                          type="button"
                          onClick={() => setPhotoSliderState({
                            title: "Proof Photo Preview",
                            photos: logFormProofPhotos,
                            activeIndex: pIdx
                          })}
                          className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] py-0.5 text-center opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer"
                        >
                          Preview
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attachment PDFs (Multi-Upload, Max 5) */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-700 flex items-center gap-1 text-xs">
                    <FileText size={12} className="text-rose-500" />
                    <span>Attachment Documents (PDF only, Max 5)</span>
                  </label>
                  <span className="text-[11px] font-medium text-zinc-400">
                    {logFormAttachmentPdfs.length} / 5 files
                  </span>
                </div>

                {/* Upload Dropzone / Button */}
                {logFormAttachmentPdfs.length < 5 && (
                  <div className="relative">
                    <input
                      type="file"
                      accept="application/pdf"
                      multiple
                      id="center-pdf-file-upload"
                      onChange={handlePdfUpload}
                      disabled={isUploadingPdf}
                      className="hidden"
                    />
                    <label
                      htmlFor="center-pdf-file-upload"
                      className={`w-full px-3 py-2.5 rounded-lg border border-dashed border-slate-300 bg-[#F8F9FB] hover:bg-slate-100 text-zinc-600 text-xs font-medium cursor-pointer flex items-center justify-center gap-2 transition-colors ${
                        isUploadingPdf ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      {isUploadingPdf ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-rose-500" />
                          <span>{pdfUploadProgressText || "Uploading PDFs to secure cloud..."}</span>
                        </>
                      ) : (
                        <>
                          <Upload size={13} className="text-rose-600" />
                          <span>{logFormAttachmentPdfs.length === 0 ? "Upload PDF documents (Max 5)..." : "+ Add more PDF documents..."}</span>
                        </>
                      )}
                    </label>
                  </div>
                )}

                {/* Uploaded PDF List */}
                {logFormAttachmentPdfs.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {logFormAttachmentPdfs.map((pdf, pIdx) => {
                      const pdfName = typeof pdf === 'string' ? `Document_${pIdx + 1}.pdf` : (pdf.name || `Document_${pIdx + 1}.pdf`);
                      const pdfUrl = typeof pdf === 'string' ? pdf : pdf.url;
                      const pdfSize = typeof pdf === 'object' && pdf.size ? `${(pdf.size / (1024 * 1024)).toFixed(2)} MB` : null;

                      return (
                        <div 
                          key={pIdx} 
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="p-1 rounded bg-rose-50 text-rose-600 shrink-0">
                              <FileText size={13} />
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="font-medium text-zinc-800 truncate" title={pdfName}>
                                {pdfName}
                              </span>
                              {pdfSize && (
                                <span className="text-[10px] text-zinc-400">
                                  {pdfSize}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openPdfInNewTab(pdfUrl, pdfName)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-[#0B57D0] hover:text-white text-zinc-600 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              title="Open document in new tab"
                            >
                              <ExternalLink size={10} />
                              <span>View Document</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLogFormAttachmentPdfs((prev) => {
                                  const next = prev.filter((_, idx) => idx !== pIdx);
                                  const firstUrl = next.length > 0 ? (typeof next[0] === 'string' ? next[0] : next[0].url) : "";
                                  setLogFormAttachmentUrl(firstUrl);
                                  return next;
                                });
                              }}
                              className="p-1 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove PDF"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAddProgressModalOpen(false);
                  setEditingLogId(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingLog || isUploadingProof || isUploadingPdf}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 ${
                  (isSubmittingLog || isUploadingProof || isUploadingPdf) ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {isSubmittingLog ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isUploadingProof ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Uploading photos...</span>
                  </>
                ) : isUploadingPdf ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Uploading PDFs...</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>{editingLogId ? "Save Changes" : "Submit Progress Log"}</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    );
  };

  // Render Task Completion Confirmation Modal
  const renderTaskCompleteModal = () => {
    if (!taskCompleteConfirmTarget) return null;

    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
          
          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-emerald-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <CheckCircle2 size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Submit Action for Verification?</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Leader will verify all progress updates</p>
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
              Are you ready to submit <strong>"{taskCompleteConfirmTarget.action.title}"</strong> for completion?
            </p>

            <div className="p-3.5 rounded-xl bg-[#F8F9FB] border border-slate-200 flex flex-col gap-1">
              <div className="text-xs font-bold text-zinc-900">
                {taskCompleteConfirmTarget.action.title}
              </div>
              <div className="text-[10.5px] text-zinc-500 mt-0.5">
                Recorded Updates: <strong>{taskCompleteConfirmTarget.action.logs?.length || 0} progress logs</strong>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              This will update the action status to <strong>Pending Verification</strong>. Your Team Leader will review and acknowledge each daily progress update to finalize 100% completion.
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
                const logs = taskCompleteConfirmTarget.action.logs || [];
                const allLogsAcked = logs.length > 0 && logs.every((l) => l.reviewStatus === "acknowledged");
                const newSuperState = allLogsAcked ? "Completed" : "Pending Verification";
                const newCustomStatus = allLogsAcked ? "Completed" : "Pending Verification";
                const newStatus = allLogsAcked ? "Complete" : "Pending Verification";
                const newProg = allLogsAcked ? 100 : calculateActionProgress(logs.length, false);

                const previousProjects = [...projectsList];
                const previousDrawer = activeTaskDrawer ? { ...activeTaskDrawer } : null;

                // Optimistically update projectsList
                setProjectsList(prev => prev.map(proj => ({
                  ...proj,
                  milestones: proj.milestones.map(ms => ({
                    ...ms,
                    actions: ms.actions.map(act => {
                      if (act.id === targetActionId) {
                        return {
                          ...act,
                          superState: newSuperState,
                          customStatus: newCustomStatus,
                          status: newStatus,
                          progress: newProg,
                        };
                      }
                      return act;
                    })
                  }))
                })));

                // Optimistically update activeTaskDrawer if open
                if (activeTaskDrawer?.action.id === targetActionId) {
                  setActiveTaskDrawer(prev => prev ? {
                    ...prev,
                    action: {
                      ...prev.action,
                      superState: newSuperState,
                      customStatus: newCustomStatus,
                      status: newStatus,
                      progress: newProg,
                    }
                  } : null);
                }

                setTaskCompleteConfirmTarget(null);
                showToast(
                  allLogsAcked
                    ? "Action verified and marked Complete!"
                    : "Action submitted for team leader verification!",
                  "success"
                );

                // Background sync
                (async () => {
                  try {
                    await savePMAction({
                      id: targetActionId,
                      super_state: newSuperState,
                      custom_status: newCustomStatus,
                    });
                    await loadWorkspaceData(true);
                  } catch (err: any) {
                    console.error("Failed to submit action completion:", err);
                    setProjectsList(previousProjects);
                    if (previousDrawer) setActiveTaskDrawer(previousDrawer);
                    showToast(err.message || "Failed to submit action completion", "error");
                  }
                })();
              }}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>Confirm & Submit</span>
            </button>
          </div>

        </div>
      </div>
    );
  };

  // Only block if unauthenticated and actively loading
  if (!profile && loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8F9FC] font-primary select-none">
        <span className="text-xs font-bold text-zinc-500 animate-pulse">Loading Workspace...</span>
      </div>
    );
  }

  // If inside Management view: Straight Gantt Chart (Administrator only)
  if (activeView === "management") {
    // If user is an Operator, restrict access to management view and redirect to personal Action view
    if (profile && profile.role !== "Administrator") {
      router.push("/workspace?view=team_member");
      return null;
    }

    return (
      <div className="h-screen w-full bg-[#FAFAFC] font-primary select-none flex flex-col overflow-hidden">
        {/* Simplified, Clean Minimal Top Bar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 shadow-2xs">
          {/* Left Title & Back (Clean, No Icon) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToMain}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-base font-semibold text-zinc-900">Management Portfolio</h1>
              <span className="text-xs text-zinc-400 font-normal">2025 – 2027</span>
            </div>

            {/* Subtle Status Color Indicator Legend */}
            <div className="hidden lg:flex items-center gap-3 pl-4 ml-2 border-l border-slate-200 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#0B57D0]" />
                <span>On Track / In Progress</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
                <span>Completed</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-amber-500/30" />
                <span>Near Deadline</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-400 border border-rose-500/30" />
                <span>Overdue (Past Date)</span>
              </span>
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

            {/* Clean Zoom Segmented Control: Semester, Quarter, Month, Weeks */}
            <div className="flex items-center bg-[#F1F3F4] p-0.5 rounded-lg border border-slate-200/80 text-xs font-medium">
              <button
                type="button"
                onClick={() => setZoomMode("semester")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  zoomMode === "semester" ? "bg-white text-[#0B57D0] shadow-2xs font-medium" : "text-zinc-600 hover:text-zinc-900 font-normal"
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
                Weeks
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

        {/* Pending Delay Requests Banner */}
        {pendingDelays.filter((d) => d.status === "pending").length > 0 && (
          <div className="mx-3 mt-2.5 p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl shadow-2xs flex flex-col gap-2 shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-600" />
                  Pending Deadline Delay Requests ({pendingDelays.filter((d) => d.status === "pending").length})
                </span>
              </div>
              <span className="text-[11px] text-amber-700 font-medium">Review and authorize deadline extension requests</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {pendingDelays.filter((d) => d.status === "pending").map((req) => (
                <div key={req.id} className="p-3 bg-white rounded-lg border border-amber-200/80 shadow-2xs flex flex-col justify-between gap-2">
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between text-[10.5px] text-zinc-500">
                      <span className="font-semibold text-zinc-700 truncate max-w-[170px]">
                        By: {req.requested_by_name || req.requested_by}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                        +{req.impact_days || 1}d extension
                      </span>
                    </div>
                    <div className="text-zinc-700 text-xs mt-0.5">
                      <span className="text-zinc-400">Reason: </span>
                      <span className="italic font-normal">"{req.reason}"</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-1">
                      <span>Due: {formatDate(new Date(Number(req.current_end_date)).toISOString().split("T")[0])}</span>
                      <span>➔</span>
                      <span className="text-[#0B57D0] font-semibold">New: {formatDate(new Date(Number(req.requested_end_date)).toISOString().split("T")[0])}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleApproveDelay(req.id, false)}
                      className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-zinc-600 text-xs font-medium cursor-pointer transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveDelay(req.id, true)}
                      className="px-3 py-1 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold shadow-2xs cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Check size={12} />
                      <span>Approve Extension</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                    <div 
                      onClick={() => toggleProject(proj.id)}
                      className="h-12 px-3 flex items-center justify-between gap-2 bg-white hover:bg-blue-50/40 transition-colors group/projrow cursor-pointer"
                      title="Click to expand/collapse milestones"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                        <button
                          type="button"
                          onClick={() => toggleProject(proj.id)}
                          className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                          {expandedProjects[proj.id] !== false ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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
                    {expandedProjects[proj.id] !== false && proj.milestones.map((ms) => (
                      <React.Fragment key={ms.id}>
                        <div
                          onClick={() => {
                            setActiveMilestoneDrawer({
                              milestone: ms,
                              projectTitle: proj.title,
                              projectManager: proj.manager,
                              projectId: proj.id,
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
                  {mounted && isTodayInChartRange && (
                    <div
                      className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center -translate-x-1/2"
                      style={{ left: `${todayPixelLeft.toFixed(2)}px` }}
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

                    {/* Timeline Bar Rows with Past/Active/Near-Deadline/Overdue State Colors */}
                    {filteredProjects.map((proj) => {
                      const projStartMs = new Date(proj.startDate).getTime();
                      const projEndMs = new Date(proj.endDate).getTime();
                      const projDuration = Math.max(1, projEndMs - projStartMs);
                      const isPast = projEndMs < todayMs;
                      const isComplete = proj.progress >= 100;
                      const isOverdue = !isComplete && isPast;
                      const daysUntilDeadline = Math.ceil((projEndMs - todayMs) / (1000 * 60 * 60 * 24));
                      const isNearDeadline = !isComplete && !isPast && daysUntilDeadline <= 14 && daysUntilDeadline >= 0;

                      return (
                        <React.Fragment key={proj.id}>
                          {/* 1. Project Bar Row */}
                          <div 
                            onClick={() => toggleProject(proj.id)}
                            className={`h-12 relative flex items-center transition-colors cursor-pointer ${
                              isPast && isComplete ? "bg-slate-50/50 opacity-70" : "bg-white hover:bg-blue-50/20"
                            }`}
                            title="Click to expand/collapse milestones"
                          >
                            <div
                              className={`absolute h-6 rounded-md text-[10px] font-medium flex items-center px-3 z-10 transition-colors shadow-2xs ${
                                isComplete
                                  ? "bg-emerald-600 text-white"
                                  : isOverdue
                                    ? "bg-rose-400 text-rose-950 font-semibold border border-rose-500/40"
                                    : isNearDeadline
                                      ? "bg-amber-400 text-amber-950 font-semibold border border-amber-500/40"
                                      : isPast
                                        ? "bg-slate-400 text-slate-100"
                                        : "bg-[#0B57D0] text-white"
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
                                        projectId: proj.id,
                                      });
                                      setDrawerStatusFilter("all");
                                    }}
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 group/msdot flex items-center justify-center cursor-pointer"
                                    style={{ left: `${offsetPct}%` }}
                                  >
                                    {/* Small White Ball */}
                                    <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 shadow-xs hover:scale-125 transition-transform" />

                                    {/* Small Hover Text Tooltip */}
                                    <div className="hidden group-hover/msdot:flex absolute top-full mt-1.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-zinc-900 text-white text-[9.5px] font-normal whitespace-nowrap shadow-lg z-30 pointer-events-none items-center gap-1.5">
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
                          {expandedProjects[proj.id] !== false && proj.milestones.map((ms) => {
                            const msEndMs = new Date(ms.endDate).getTime();
                            const isMsPast = msEndMs < todayMs;
                            const isMsComplete = ms.progress >= 100;
                            const isMsOverdue = !isMsComplete && isMsPast;
                            const msDaysUntilDeadline = Math.ceil((msEndMs - todayMs) / (1000 * 60 * 60 * 24));
                            const isMsNearDeadline = !isMsComplete && !isMsPast && msDaysUntilDeadline <= 14 && msDaysUntilDeadline >= 0;

                            return (
                              <React.Fragment key={ms.id}>
                                <div
                                  onClick={() => {
                                    setActiveMilestoneDrawer({
                                      milestone: ms,
                                      projectTitle: proj.title,
                                      projectManager: proj.manager,
                                      projectId: proj.id,
                                    });
                                    setDrawerStatusFilter("all");
                                  }}
                                  className={`h-10 relative flex items-center transition-colors border-t border-slate-100 cursor-pointer ${
                                    isMsPast && isMsComplete ? "bg-slate-50/40 opacity-70" : "bg-white hover:bg-slate-50/40"
                                  }`}
                                  title="Click to view actions and verification timeline"
                                >
                                  <div
                                    className={`absolute h-5 rounded-md text-[9px] font-normal flex items-center px-2.5 overflow-hidden truncate z-10 cursor-pointer transition-transform hover:scale-[1.01] shadow-2xs ${
                                      isMsComplete
                                        ? "bg-emerald-600 text-white font-medium"
                                        : isMsOverdue
                                          ? "bg-rose-300/90 text-rose-950 font-semibold border border-rose-400/50"
                                          : isMsNearDeadline
                                            ? "bg-amber-300/90 text-amber-950 font-semibold border border-amber-400/50"
                                            : isMsPast
                                              ? "bg-slate-400 text-slate-100"
                                              : "bg-blue-600 text-white font-medium"
                                    }`}
                                    style={calculateBarStyle(ms.startDate, ms.endDate)}
                                  >
                                    <span className="truncate">{ms.title}</span>
                                  </div>
                                </div>

                                {/* 3. Action Sub-bars on Timeline Canvas */}
                                {expandedMilestones[ms.id] && ms.actions && ms.actions.map((act) => {
                                  const actEndMs = new Date(act.endDate).getTime();
                                  const isActPast = actEndMs < todayMs;
                                  const isActComplete = act.status === "Completed" || act.progress >= 100;
                                  const isActOverdue = !isActComplete && isActPast;
                                  const actDaysUntilDeadline = Math.ceil((actEndMs - todayMs) / (1000 * 60 * 60 * 24));
                                  const isActNearDeadline = !isActComplete && !isActPast && actDaysUntilDeadline <= 7 && actDaysUntilDeadline >= 0;

                                  return (
                                    <div
                                      key={act.id}
                                      className="h-8 relative flex items-center bg-slate-50/30 border-t border-slate-100/60"
                                    >
                                      <div
                                        className={`absolute h-3.5 rounded text-[8px] font-normal flex items-center px-1.5 overflow-hidden truncate z-10 shadow-2xs ${
                                          isActComplete
                                            ? "bg-emerald-600 text-white font-medium"
                                            : isActOverdue
                                              ? "bg-rose-300 text-rose-950 font-semibold border border-rose-400"
                                              : isActNearDeadline
                                                ? "bg-amber-300 text-amber-950 font-semibold border border-amber-400"
                                                : isActPast
                                                  ? "bg-slate-400 text-white"
                                                  : "bg-blue-500 text-white"
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
        {renderActiveMilestoneDrawer()}

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



      {/* Delay Request Modal */}
      {renderDelayRequestModal()}

      {/* Multi-Photo Carousel Slider Modal */}
      {renderPhotoSliderModal()}

      {/* Management View End */}
    </div>
  );
}

  // ----------------------------------------------------
  // TEAM LEADER VIEW: Operational Hub
  // ----------------------------------------------------
  // TEAM LEADER VIEW: Operational Hub
  // ----------------------------------------------------
  if (activeView === "team_leader") {
    // Current user identifier (strictly current logged-in user with instant cache hydration)
    const cachedProfile = typeof window !== "undefined" ? (() => {
      try {
        const raw = localStorage.getItem("ib_user_profile");
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    })() : null;

    const effectiveProfile = profile || cachedProfile;
    const currentUserName = (effectiveProfile?.name || "").trim();
    const currentUserEmail = (effectiveProfile?.email || "").trim();
    const currentUserRole = (effectiveProfile?.role || "").trim();
    const isAdmin = currentUserRole.toLowerCase() === "administrator" || currentUserRole.toLowerCase() === "admin";

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

    // Clean Mindspace Scoping for Team Leader / Milestone Page (P2):
    // Users (whether Admin or Operator) see milestones where:
    // 1. They are assigned as the Team Leader / Milestone Lead, OR
    // 2. They are the assigned Project Manager (PM) for that project.
    let leaderMilestonesList = allMilestonesRaw.filter((item) => {
      if (!currentUserEmail && !currentUserName) return true; // Show immediately on frame 0 during hydration

      const msLeadEmail = (item.milestone.leadEmail || "").toLowerCase();
      const msLeadName = (item.milestone.lead || "").toLowerCase();
      const pmEmail = (item.project.managerEmail || "").toLowerCase();
      const pmName = (item.project.manager || "").toLowerCase();

      const isMilestoneLead = 
        (currentUserEmail && (msLeadEmail === currentUserEmail.toLowerCase() || msLeadName === currentUserEmail.toLowerCase())) ||
        (currentUserName && (msLeadName === currentUserName.toLowerCase() || msLeadEmail === currentUserName.toLowerCase()));

      const isProjectManager = 
        (currentUserEmail && (pmEmail === currentUserEmail.toLowerCase() || pmName === currentUserEmail.toLowerCase())) ||
        (currentUserName && (pmName === currentUserName.toLowerCase() || pmEmail === currentUserName.toLowerCase()));

      return isMilestoneLead || isProjectManager;
    });

    // If Admin has no specifically assigned milestones, show all milestones so Admin is never stuck with an empty view
    if (leaderMilestonesList.length === 0 && (isAdmin || allMilestonesRaw.length > 0)) {
      leaderMilestonesList = allMilestonesRaw;
    }

    // If no milestone selected or selected milestone is not in current filtered list, select the first available one
    const activeLeaderMilestoneData =
      leaderMilestonesList.find((item) => item.milestone.id === selectedLeaderMilestoneId) ||
      leaderMilestonesList[0] ||
      null;

    const currentMilestone = activeLeaderMilestoneData?.milestone;
    const currentProject = activeLeaderMilestoneData?.project;

    // Filter actions under current active milestone
    const currentActions = currentMilestone ? currentMilestone.actions || [] : [];
    const filteredActions = currentActions.filter((act) => {
      const matchStatus =
        tlActionStatusFilter === "all"
          ? true
          : tlActionStatusFilter === "Pending Action"
          ? act.status === "Pending Action" || act.status === "In Progress" || act.status === "To Do"
          : tlActionStatusFilter === "Complete"
          ? act.status === "Complete" || (act.status as any) === "Completed"
          : tlActionStatusFilter === "Upcoming Task"
          ? act.status === "Upcoming Task" || (act.status as any) === "Incoming"
          : act.status === tlActionStatusFilter;
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
    const allPendingReviews = leaderMilestonesList.flatMap((item) =>
      (item.milestone.updates || []).map((up) => ({
        ...up,
        projectTitle: item.project.title,
        milestoneTitle: item.milestone.title,
      }))
    );

    // Handlers for Action Add / Edit connected to live backend API
    const handleOpenAddAction = () => {
      setEditingActionItem(null);
      setFormActionTitle("");
      setFormActionInstructions("");
      setFormActionAssignees([currentUserName]);
      setFormActionStartDate(currentMilestone?.startDate || "");
      setFormActionEndDate(currentMilestone?.endDate || "");
      setFormActionError("");
      setIsAddActionModalOpen(true);
    };

    const handleOpenEditAction = (action: DummyAction) => {
      setEditingActionItem(action);
      setFormActionTitle(action.title);
      setFormActionInstructions(action.instructions || "");
      // Split assignees if multiple stored as comma-separated or array
      const rawAssignees = (action.assignee || "").split(",").map(s => s.trim()).filter(Boolean);
      setFormActionAssignees(rawAssignees.length > 0 ? rawAssignees : [currentUserName]);
      setFormActionStartDate(action.startDate);
      setFormActionEndDate(action.endDate);
      setFormActionError("");
      setIsAddActionModalOpen(true);
    };

    const handleSaveActionSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formActionTitle.trim()) {
        setFormActionError("Please enter an action title.");
        return;
      }
      if (!currentMilestone || !currentProject) return;

      const isEdit = !!editingActionItem;
      const actionId = editingActionItem ? editingActionItem.id : `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const startMs = formActionStartDate ? new Date(formActionStartDate).getTime() : new Date(currentMilestone.startDate).getTime();
      const endMs = formActionEndDate ? new Date(formActionEndDate).getTime() : new Date(currentMilestone.endDate).getTime();

      const resolvedAssigneeNames: string[] = [];
      const resolvedAssigneeEmails: string[] = [];

      (formActionAssignees.length > 0 ? formActionAssignees : [currentUserName]).forEach((val) => {
        const match = availableUsers.find(
          (u) => u.name.toLowerCase() === val.toLowerCase() || u.email.toLowerCase() === val.toLowerCase()
        );
        if (match) {
          resolvedAssigneeNames.push(match.name);
          resolvedAssigneeEmails.push(match.email);
        } else {
          resolvedAssigneeNames.push(val);
          if (val.includes("@")) resolvedAssigneeEmails.push(val);
        }
      });

      const assigneeNameCombined = resolvedAssigneeNames.join(", ");
      const assigneeEmailCombined = resolvedAssigneeEmails.join(", ");

      const startDateStr = new Date(startMs).toISOString().split("T")[0];
      const endDateStr = new Date(endMs).toISOString().split("T")[0];

      const previousProjects = [...projectsList];

      // Optimistically update projectsList
      setProjectsList(prev => prev.map(proj => {
        if (proj.id !== currentProject.id) return proj;
        return {
          ...proj,
          milestones: proj.milestones.map(ms => {
            if (ms.id !== currentMilestone.id) return ms;
            if (isEdit) {
              return {
                ...ms,
                actions: ms.actions.map(act => {
                  if (act.id === actionId) {
                    return {
                      ...act,
                      title: formActionTitle.trim(),
                      instructions: formActionInstructions.trim(),
                      assignee: assigneeNameCombined || "Unassigned",
                      assigneeEmail: assigneeEmailCombined,
                      startDate: startDateStr,
                      endDate: endDateStr,
                    };
                  }
                  return act;
                })
              };
            } else {
              const newAct: DummyAction = {
                id: actionId,
                title: formActionTitle.trim(),
                assignee: assigneeNameCombined || "Unassigned",
                assigneeEmail: assigneeEmailCombined,
                startDate: startDateStr,
                endDate: endDateStr,
                status: "Pending Action",
                progress: 0,
                instructions: formActionInstructions.trim(),
                logs: [],
              };
              return {
                ...ms,
                actions: [...ms.actions, newAct]
              };
            }
          })
        };
      }));

      // Close modal & reset fields immediately
      setIsAddActionModalOpen(false);
      setEditingActionItem(null);
      setFormActionInstructions("");
      showToast(isEdit ? "Action updated successfully!" : "Action created successfully!", "success");

      // Background sync
      (async () => {
        try {
          await savePMAction({
            id: actionId,
            project_id: currentProject.id,
            milestone_id: currentMilestone.id,
            title: formActionTitle.trim(),
            instructions: formActionInstructions.trim(),
            assigned_user_name: assigneeNameCombined,
            assigned_user_id: assigneeEmailCombined,
            start_date: startMs,
            end_date: endMs,
          });
          await loadWorkspaceData(true);
        } catch (err: any) {
          console.error("Failed to save action:", err);
          setProjectsList(previousProjects);
          showToast(err.message || "Failed to save action", "error");
        }
      })();
    };

    const handleExecuteActionDeleteOrArchive = async () => {
      if (!deleteActionConfirmTarget) return;
      const actionId = deleteActionConfirmTarget.action.id;
      const previousProjects = [...projectsList];

      // Optimistically remove action from projectsList
      setProjectsList(prev => prev.map(proj => ({
        ...proj,
        milestones: proj.milestones.map(ms => ({
          ...ms,
          actions: ms.actions.filter(a => a.id !== actionId)
        }))
      })));

      if (activeTaskDrawer?.action.id === actionId) {
        setActiveTaskDrawer(null);
      }
      setDeleteActionConfirmTarget(null);
      showToast("Action deleted successfully!", "success");

      // Background sync
      (async () => {
        try {
          await deletePMEntity("action", actionId);
          await loadWorkspaceData(true);
        } catch (err: any) {
          console.error("Failed to delete/archive action:", err);
          setProjectsList(previousProjects);
          showToast(err.message || "Failed to delete action", "error");
        }
      })();
    };

    // Selected Action for Action Progress & Review pane (Column 3)
    const selectedLeaderAction = (() => {
      if (!currentActions || currentActions.length === 0) return null;
      if (selectedLeaderActionId) {
        const found = currentActions.find((a) => a.id === selectedLeaderActionId);
        if (found) return found;
      }
      return filteredActions[0] || currentActions[0] || null;
    })();

    // Team Leader Review Actions: Acknowledge or Request Redo
    const handleAcknowledgeProgressLog = async (actionId: string, logId: string) => {
      // Find action across currentActions first, then fall back to all projects/milestones
      let act = currentActions.find((a) => a.id === actionId);
      if (!act) {
        for (const proj of projectsList) {
          for (const ms of proj.milestones) {
            const found = ms.actions.find((a) => a.id === actionId);
            if (found) {
              act = found;
              break;
            }
          }
          if (act) break;
        }
      }
      if (!act || !act.logs) return;

      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().slice(0, 5);
      const fullTimestamp = `${dateStr} ${timeStr}`;

      const updatedLogs = act.logs.map((log) => {
        if (String(log.id) === String(logId)) {
          return {
            ...log,
            reviewStatus: "acknowledged" as const,
            reviewedBy: currentUserName,
            reviewedAt: fullTimestamp,
            reviewNote: undefined,
          };
        }
        return log;
      });

      const allLogsNowAcknowledged = updatedLogs.length > 0 && updatedLogs.every((l) => l.reviewStatus === "acknowledged");
      const isPendingVerif = act.status === "Pending Verification" || act.superState === "Pending Verification" || act.customStatus === "Pending Verification";

      const newSuperState = (isPendingVerif && allLogsNowAcknowledged) ? "Completed" : act.superState;
      const newCustomStatus = (isPendingVerif && allLogsNowAcknowledged) ? "Completed" : act.customStatus;
      const newStatus = (isPendingVerif && allLogsNowAcknowledged) ? "Complete" : act.status;
      const newProg = (isPendingVerif && allLogsNowAcknowledged) ? 100 : calculateActionProgress(updatedLogs.length, false);

      const previousProjects = [...projectsList];
      const previousDrawer = activeTaskDrawer ? { ...activeTaskDrawer } : null;

      // Optimistically update projectsList
      setProjectsList(prev => prev.map(proj => ({
        ...proj,
        milestones: proj.milestones.map(ms => ({
          ...ms,
          actions: ms.actions.map(a => {
            if (a.id === actionId) {
              return {
                ...a,
                logs: updatedLogs,
                superState: newSuperState,
                customStatus: newCustomStatus,
                status: newStatus,
                progress: newProg,
              };
            }
            return a;
          })
        }))
      })));

      // Optimistically update activeTaskDrawer if open
      if (activeTaskDrawer?.action.id === actionId) {
        setActiveTaskDrawer(prev => prev ? {
          ...prev,
          action: {
            ...prev.action,
            logs: updatedLogs,
            superState: newSuperState,
            customStatus: newCustomStatus,
            status: newStatus,
            progress: newProg,
          }
        } : null);
      }

      showToast(
        isPendingVerif && allLogsNowAcknowledged
          ? "Progress acknowledged! All updates verified and Action marked Complete."
          : "Progress update acknowledged successfully!",
        "success"
      );

      // Background sync
      (async () => {
        try {
          const payload: any = {
            id: actionId,
            logs: updatedLogs,
          };
          if (isPendingVerif && allLogsNowAcknowledged) {
            payload.super_state = "Completed";
            payload.custom_status = "Completed";
          }
          await savePMAction(payload);
          await loadWorkspaceData(true);
        } catch (err: any) {
          console.error("Failed to acknowledge progress log:", err);
          setProjectsList(previousProjects);
          if (previousDrawer) setActiveTaskDrawer(previousDrawer);
          showToast(err.message || "Failed to acknowledge progress log", "error");
        }
      })();
    };

    const handleFinalizeActionCompletion = async (actionId: string) => {
      const previousProjects = [...projectsList];
      const previousDrawer = activeTaskDrawer ? { ...activeTaskDrawer } : null;

      // Optimistically update
      setProjectsList(prev => prev.map(proj => ({
        ...proj,
        milestones: proj.milestones.map(ms => ({
          ...ms,
          actions: ms.actions.map(a => {
            if (a.id === actionId) {
              return {
                ...a,
                superState: "Completed",
                customStatus: "Completed",
                status: "Complete",
                progress: 100,
              };
            }
            return a;
          })
        }))
      })));

      if (activeTaskDrawer?.action.id === actionId) {
        setActiveTaskDrawer(prev => prev ? {
          ...prev,
          action: {
            ...prev.action,
            superState: "Completed",
            customStatus: "Completed",
            status: "Complete",
            progress: 100,
          }
        } : null);
      }

      showToast("Action successfully finalized and marked as Complete!", "success");

      // Background sync
      (async () => {
        try {
          await savePMAction({
            id: actionId,
            super_state: "Completed",
            custom_status: "Completed",
          });
          await loadWorkspaceData(true);
        } catch (err: any) {
          console.error("Failed to finalize action completion:", err);
          setProjectsList(previousProjects);
          if (previousDrawer) setActiveTaskDrawer(previousDrawer);
          showToast(err.message || "Failed to finalize action completion", "error");
        }
      })();
    };

    const handleRedoProgressLog = async (actionId: string, logId: string, note: string) => {
      let act = currentActions.find((a) => a.id === actionId);
      if (!act) {
        for (const proj of projectsList) {
          for (const ms of proj.milestones) {
            const found = ms.actions.find((a) => a.id === actionId);
            if (found) {
              act = found;
              break;
            }
          }
          if (act) break;
        }
      }
      if (!act || !act.logs) return;

      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = now.toTimeString().slice(0, 5);
      const fullTimestamp = `${dateStr} ${timeStr}`;

      const updatedLogs = act.logs.map((log) => {
        if (String(log.id) === String(logId)) {
          return {
            ...log,
            reviewStatus: "redo" as const,
            reviewedBy: currentUserName,
            reviewedAt: fullTimestamp,
            reviewNote: note.trim() || "Please revise and redo this progress task per guidelines.",
          };
        }
        return log;
      });

      const previousProjects = [...projectsList];
      const previousDrawer = activeTaskDrawer ? { ...activeTaskDrawer } : null;

      // Optimistically update
      setProjectsList(prev => prev.map(proj => ({
        ...proj,
        milestones: proj.milestones.map(ms => ({
          ...ms,
          actions: ms.actions.map(a => {
            if (a.id === actionId) {
              return {
                ...a,
                logs: updatedLogs,
              };
            }
            return a;
          })
        }))
      })));

      if (activeTaskDrawer?.action.id === actionId) {
        setActiveTaskDrawer(prev => prev ? {
          ...prev,
          action: {
            ...prev.action,
            logs: updatedLogs,
          }
        } : null);
      }

      setRedoModalTarget(null);
      setRedoCommentText("");
      showToast("Redo requested! Team member has been notified to revise this update.", "info");

      // Background sync
      (async () => {
        try {
          await savePMAction({
            id: actionId,
            logs: updatedLogs,
          });
          await loadWorkspaceData(true);
        } catch (err: any) {
          console.error("Failed to request redo for progress log:", err);
          setProjectsList(previousProjects);
          if (previousDrawer) setActiveTaskDrawer(previousDrawer);
          showToast(err.message || "Failed to request redo", "error");
        }
      })();
    };

    // Active & Past Milestone counts for Team Leader
    const activeLeaderMilestonesCount = leaderMilestonesList.filter((item) => {
      const eMs = new Date(item.milestone.endDate).getTime();
      return eMs >= todayMs || item.milestone.progress < 100;
    }).length;

    const pastLeaderMilestonesCount = leaderMilestonesList.filter((item) => {
      const eMs = new Date(item.milestone.endDate).getTime();
      return eMs < todayMs && item.milestone.progress >= 100;
    }).length;

    // Filtered milestones list based on active/past tab and search query
    const displayedLeaderMilestones = leaderMilestonesList.filter((item) => {
      const eMs = new Date(item.milestone.endDate).getTime();
      const isPast = eMs < todayMs && item.milestone.progress >= 100;

      let matchTab = true;
      if (tlMilestoneStatusFilter === "active") {
        matchTab = !isPast;
      } else if (tlMilestoneStatusFilter === "past") {
        matchTab = isPast;
      }

      const matchSearch =
        !tlMilestoneSearchQuery ||
        item.milestone.title.toLowerCase().includes(tlMilestoneSearchQuery.toLowerCase()) ||
        item.project.title.toLowerCase().includes(tlMilestoneSearchQuery.toLowerCase()) ||
        item.milestone.lead.toLowerCase().includes(tlMilestoneSearchQuery.toLowerCase());

      return matchTab && matchSearch;
    });

    const toggleLeaderMilestone = (msId: string) => {
      setExpandedLeaderMilestones((prev) => ({
        ...prev,
        [msId]: !(prev[msId] !== false),
      }));
    };

    // Zoom configurations for Leader Gantt
    const leaderZoomConfig = generateTimelineZoomConfig(leaderZoomMode);

    const calculateLeaderBarStyle = (startStr: string, endStr: string) => {
      const sMs = new Date(startStr).getTime();
      const eMs = new Date(endStr).getTime();
      const leftPct = Math.max(0, Math.min(100, ((sMs - chartStartMs) / totalDurationMs) * 100));
      const widthPct = Math.max(0.5, Math.min(100 - leftPct, ((eMs - sMs) / totalDurationMs) * 100));
      return {
        left: `${(leftPct / 100) * leaderZoomConfig.totalWidth}px`,
        width: `${Math.max(24, (widthPct / 100) * leaderZoomConfig.totalWidth)}px`,
      };
    };

    const leaderTodayPixelLeft = (todayLeftPct / 100) * leaderZoomConfig.totalWidth;

    const updateLeaderTodayVisibility = () => {
      if (!leaderTimelineScrollRef.current) return;
      const { scrollLeft, clientWidth } = leaderTimelineScrollRef.current;
      if (leaderTodayPixelLeft < scrollLeft - 10) {
        setLeaderTodayOffscreen("left");
      } else if (leaderTodayPixelLeft > scrollLeft + clientWidth + 10) {
        setLeaderTodayOffscreen("right");
      } else {
        setLeaderTodayOffscreen(null);
      }
    };

    const scrollToLeaderToday = () => {
      if (!leaderTimelineScrollRef.current) return;
      const container = leaderTimelineScrollRef.current;
      const scrollTarget = leaderTodayPixelLeft - container.clientWidth / 2;
      container.scrollTo({
        left: Math.max(0, scrollTarget),
        behavior: "smooth",
      });
    };

    return (
      <div className="h-screen w-full bg-[#FAFAFC] font-primary select-none flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 shadow-2xs">
          {/* Left Title & Back */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToMain}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-base font-semibold text-zinc-900">Team Leader Workspace</h1>
              <span className="text-xs text-zinc-400 font-normal">Milestones & Action Delegation</span>
            </div>

            {/* Subtle Status Color Indicator Legend (Gantt Mode) */}
            {leaderViewMode === "gantt" && (
              <div className="hidden xl:flex items-center gap-3 pl-4 ml-2 border-l border-slate-200 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 border border-sky-500/30" />
                  <span>Incoming</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 border border-slate-500/30" />
                  <span>To Do</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0B57D0]" />
                  <span>In Progress</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 border border-amber-500/30" />
                  <span>Pending Verification</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
                  <span>Completed</span>
                </span>
              </div>
            )}
          </div>

          {/* Right Controls: Zoom Range (Left), View Toggle (Right), Add Action */}
          <div className="flex items-center gap-2.5">
            {/* 1. Zoom Controls (Only in Gantt Mode): Month, Week, Day */}
            {leaderViewMode === "gantt" && (
              <div className="flex items-center bg-[#F1F3F4] p-0.5 rounded-lg border border-slate-200/80 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setLeaderZoomMode("month")}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    leaderZoomMode === "month" ? "bg-white text-[#0B57D0] shadow-2xs font-medium" : "text-zinc-600 hover:text-zinc-900 font-normal"
                  }`}
                >
                  Month
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderZoomMode("week")}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    leaderZoomMode === "week" ? "bg-white text-[#0B57D0] shadow-2xs font-medium" : "text-zinc-600 hover:text-zinc-900 font-normal"
                  }`}
                >
                  Week
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderZoomMode("day")}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    leaderZoomMode === "day" ? "bg-white text-[#0B57D0] shadow-2xs font-medium" : "text-zinc-600 hover:text-zinc-900 font-normal"
                  }`}
                >
                  Day
                </button>
              </div>
            )}

            {/* 2. View Toggle Segmented Tabs: Timeline Gantt (Default) vs Operational Hub */}
            <div className="flex items-center bg-[#F1F3F4] p-0.5 rounded-lg border border-slate-200/80 text-xs font-medium">
              <button
                type="button"
                onClick={() => setLeaderViewMode("gantt")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  leaderViewMode === "gantt"
                    ? "bg-white text-[#0B57D0] shadow-2xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                <BarChart3 size={13} />
                <span>Timeline Gantt</span>
              </button>
              <button
                type="button"
                onClick={() => setLeaderViewMode("hub")}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  leaderViewMode === "hub"
                    ? "bg-white text-[#0B57D0] shadow-2xs font-semibold"
                    : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                <FolderKanban size={13} />
                <span>Manage Task</span>
              </button>
            </div>

            {/* Create Task Button */}
            <button
              type="button"
              onClick={handleOpenAddAction}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-medium cursor-pointer shadow-2xs transition-all active:scale-95"
            >
              <Plus size={14} />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* Pending Delay Requests Banner */}
        {pendingDelays.filter((d) => d.status === "pending").length > 0 && (
          <div className="mx-3 mt-2.5 p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl shadow-2xs flex flex-col gap-2 shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-600" />
                  Pending Deadline Delay Requests ({pendingDelays.filter((d) => d.status === "pending").length})
                </span>
              </div>
              <span className="text-[11px] text-amber-700 font-medium">Review and authorize deadline extension requests</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {pendingDelays.filter((d) => d.status === "pending").map((req) => (
                <div key={req.id} className="p-3 bg-white rounded-lg border border-amber-200/80 shadow-2xs flex flex-col justify-between gap-2">
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between text-[10.5px] text-zinc-500">
                      <span className="font-semibold text-zinc-700 truncate max-w-[170px]">
                        By: {req.requested_by_name || req.requested_by}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                        +{req.impact_days || 1}d extension
                      </span>
                    </div>
                    <div className="text-zinc-700 text-xs mt-0.5">
                      <span className="text-zinc-400">Reason: </span>
                      <span className="italic font-normal">"{req.reason}"</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-1">
                      <span>Due: {formatDate(new Date(Number(req.current_end_date)).toISOString().split("T")[0])}</span>
                      <span>➔</span>
                      <span className="text-[#0B57D0] font-semibold">New: {formatDate(new Date(Number(req.requested_end_date)).toISOString().split("T")[0])}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleApproveDelay(req.id, false)}
                      className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-zinc-600 text-xs font-medium cursor-pointer transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveDelay(req.id, true)}
                      className="px-3 py-1 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold shadow-2xs cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <Check size={12} />
                      <span>Approve Extension</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW MODE 1: MILESTONE-ROOTED TIMELINE GANTT CHART (DEFAULT) */}
        {/* ======================================================== */}
        {leaderViewMode === "gantt" ? (
          <div className="flex-1 min-h-0 overflow-hidden p-3 flex flex-col bg-[#FAFAFC]">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex-1 flex overflow-hidden">
              
              {leaderMilestonesList.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3 bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-xs">
                    <Target size={26} />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-800">No Assigned Milestones Found</h3>
                  <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                    You currently do not have any milestones assigned under active projects.
                  </p>
                </div>
              ) : (
                <>
                  {/* LEFT FIXED PANE: Milestone & Action Hierarchy Structure */}
                  <div className="w-[440px] shrink-0 border-r border-slate-200 flex flex-col bg-white z-20 shadow-2xs">
                    {/* Left Header */}
                    <div className="h-12 px-3 bg-[#FAFAFB] border-b border-slate-200 flex items-center justify-between text-[11px] font-medium text-zinc-500 shrink-0">
                      <span className="flex-1">Milestone / Action Structure</span>
                      <span className="w-24 text-left font-medium shrink-0">Lead By</span>
                      <span className="w-10 text-right font-medium shrink-0">Prog</span>
                      <span className="w-12 text-right font-medium shrink-0">Actions</span>
                    </div>

                    {/* Left Body: Milestones directly at top level */}
                    <div className="flex-1 overflow-y-hidden divide-y divide-slate-100">
                      {leaderMilestonesList.map((item) => {
                        const ms = item.milestone;
                        const isExpanded = expandedLeaderMilestones[ms.id] !== false; // default expanded

                        return (
                          <React.Fragment key={ms.id}>
                            {/* Milestone Header Row */}
                            <div
                              onClick={() => {
                                setSelectedLeaderMilestoneId(ms.id);
                                toggleLeaderMilestone(ms.id);
                              }}
                              className={`h-11 px-3 flex items-center justify-between gap-2 transition-colors cursor-pointer group/msrow ${
                                selectedLeaderMilestoneId === ms.id ? "bg-[#D3E3FD]/30" : "bg-[#F8F9FB] hover:bg-amber-50/50"
                              }`}
                              title="Click to select and toggle actions under this milestone"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLeaderMilestone(ms.id);
                                  }}
                                  className="w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-zinc-700 cursor-pointer shrink-0"
                                >
                                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                </button>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-semibold text-zinc-900 truncate" title={ms.title}>
                                    {ms.title}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 truncate" title={item.project.title}>
                                    {item.project.title}
                                  </span>
                                </div>
                              </div>

                              <span className="w-24 text-xs font-normal text-zinc-500 truncate shrink-0" title={`Lead: ${ms.lead}`}>
                                {ms.lead}
                              </span>

                              <span className="w-10 text-right text-[11px] font-semibold text-amber-600 shrink-0">
                                {ms.progress}%
                              </span>

                              <div className="w-12 shrink-0 flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLeaderMilestoneId(ms.id);
                                    handleOpenAddAction();
                                  }}
                                  className="p-1 rounded hover:bg-blue-100 text-[#0B57D0] cursor-pointer"
                                  title="Add Action under this milestone"
                                >
                                  <Plus size={13} />
                                </button>
                                <div className="text-zinc-300 group-hover/msrow:text-amber-600">
                                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                </div>
                              </div>
                            </div>

                            {/* Action Sub-rows under this Milestone */}
                            {isExpanded && (ms.actions || []).map((act) => {
                              const logsCount = (act.logs || []).length;
                              const isSelectedAct = selectedLeaderActionId === act.id;

                              return (
                                <div
                                  key={act.id}
                                  onClick={() => {
                                    setSelectedLeaderMilestoneId(ms.id);
                                    setSelectedLeaderActionId(act.id);
                                  }}
                                  className={`h-9 px-3 pl-8 flex items-center justify-between gap-2 border-t border-slate-100/70 text-xs cursor-pointer group/actrow transition-colors ${
                                    isSelectedAct ? "bg-blue-50/70" : "bg-white hover:bg-blue-50/40"
                                  }`}
                                  title="Click to select action"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                                    <span className="text-zinc-300 text-[10px] shrink-0">↳</span>
                                    <span className="text-[11.5px] font-medium text-zinc-800 truncate group-hover/actrow:text-[#0B57D0]" title={act.title}>
                                      {act.title}
                                    </span>
                                    {logsCount > 0 && (
                                      <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-zinc-600 border border-slate-200 shrink-0">
                                        {logsCount} {logsCount === 1 ? "log" : "logs"}
                                      </span>
                                    )}
                                  </div>

                                  <span className="w-24 text-[11px] text-zinc-400 truncate shrink-0" title={act.assignee}>
                                    {act.assignee}
                                  </span>

                                  <span className="w-10 text-right text-[10.5px] font-semibold text-[#0B57D0] shrink-0">
                                    {act.progress}%
                                  </span>

                                  <div className="w-12 shrink-0 flex items-center justify-end gap-1 text-zinc-400">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLeaderMilestoneId(ms.id);
                                        handleOpenEditAction(act);
                                      }}
                                      className="p-1 hover:text-[#0B57D0] hover:bg-blue-50 rounded cursor-pointer"
                                      title="Edit action"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteActionConfirmTarget({ action: act, milestoneTitle: ms.title });
                                      }}
                                      className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                      title="Delete / Archive action"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* RIGHT SCROLLABLE TIMELINE PANE */}
                  <div className="flex-1 flex flex-col relative overflow-hidden bg-white">
                    {/* Floating Back-to-Today Buttons */}
                    {leaderTodayOffscreen === "left" && (
                      <button
                        type="button"
                        onClick={scrollToLeaderToday}
                        className="absolute left-4 bottom-5 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-xs hover:bg-rose-50 text-rose-700 border border-rose-200 shadow-md text-xs font-medium transition-all cursor-pointer hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-left-2 duration-200"
                        title="Scroll left to Today"
                      >
                        <ArrowLeft size={13} className="text-rose-600 animate-pulse" />
                        <span>Today</span>
                      </button>
                    )}

                    {leaderTodayOffscreen === "right" && (
                      <button
                        type="button"
                        onClick={scrollToLeaderToday}
                        className="absolute right-4 bottom-5 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-xs hover:bg-rose-50 text-rose-700 border border-rose-200 shadow-md text-xs font-medium transition-all cursor-pointer hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-right-2 duration-200"
                        title="Scroll right to Today"
                      >
                        <span>Today</span>
                        <ArrowRight size={13} className="text-rose-600 animate-pulse" />
                      </button>
                    )}

                    <div 
                      ref={leaderTimelineScrollRef} 
                      onScroll={updateLeaderTodayVisibility}
                      className="flex-1 overflow-x-auto overflow-y-auto flex flex-col relative"
                    >
                      <div style={{ width: `${leaderZoomConfig.totalWidth}px` }} className="min-w-full flex-1 flex flex-col relative">
                        {/* Subtle Full-Height Vertical TODAY Indicator */}
                        {mounted && isTodayInChartRange && (
                          <div
                            className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center -translate-x-1/2"
                            style={{ left: `${leaderTodayPixelLeft.toFixed(2)}px` }}
                          >
                            <div className="sticky top-0 bg-rose-500/80 text-white text-[8px] font-medium px-1.5 py-0.5 rounded-b shadow-2xs uppercase tracking-wider z-40">
                              Today
                            </div>
                            <div className="w-[1px] flex-1 bg-rose-400/40 border-l border-dashed border-rose-400/50" />
                          </div>
                        )}

                        {/* Master Dynamic Timeline Header */}
                        <div className="h-12 border-b border-slate-200 flex bg-[#FAFAFB] sticky top-0 z-30 divide-x divide-slate-200 shrink-0">
                          {leaderZoomConfig.columns.map((col, idx) => (
                            <div
                              key={idx}
                              style={{ width: `${leaderZoomConfig.colWidth}px` }}
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
                            {leaderZoomConfig.columns.map((_, i) => (
                              <div key={i} style={{ width: `${leaderZoomConfig.colWidth}px` }} className="shrink-0 h-full" />
                            ))}
                          </div>

                          {/* Timeline Rows for Milestones and Actions */}
                          {leaderMilestonesList.map((item) => {
                            const ms = item.milestone;
                            const isExpanded = expandedLeaderMilestones[ms.id] !== false;
                            const msEndMs = new Date(ms.endDate).getTime();
                            const isMsPast = msEndMs < todayMs;
                            const isMsComplete = ms.progress >= 100;
                            const isMsOverdue = !isMsComplete && isMsPast;
                            const msDaysUntilDeadline = Math.ceil((msEndMs - todayMs) / (1000 * 60 * 60 * 24));
                            const isMsNearDeadline = !isMsComplete && !isMsPast && msDaysUntilDeadline <= 14 && msDaysUntilDeadline >= 0;

                            return (
                              <React.Fragment key={ms.id}>
                                {/* Milestone Timeline Bar Row */}
                                <div
                                  onClick={() => {
                                    setSelectedLeaderMilestoneId(ms.id);
                                    toggleLeaderMilestone(ms.id);
                                  }}
                                  className={`h-11 relative flex items-center transition-colors border-t border-slate-100/90 first:border-t-0 cursor-pointer ${
                                    isMsPast && isMsComplete ? "bg-slate-50/40 opacity-70" : "bg-[#F8F9FB] hover:bg-amber-50/30"
                                  }`}
                                  title="Click to expand/collapse actions"
                                >
                                  <div
                                    className={`absolute h-5.5 rounded-md text-[9.5px] font-semibold flex items-center px-2.5 overflow-hidden truncate z-10 cursor-pointer transition-transform hover:scale-[1.01] shadow-2xs ${
                                      isMsComplete
                                        ? "bg-emerald-600 text-white"
                                        : isMsOverdue
                                          ? "bg-rose-300/90 text-rose-950 border border-rose-400/50"
                                          : isMsNearDeadline
                                            ? "bg-amber-300/90 text-amber-950 border border-amber-400/50"
                                            : isMsPast
                                              ? "bg-slate-400 text-white"
                                              : "bg-amber-400/90 text-amber-950 border border-amber-500/40"
                                    }`}
                                    style={calculateLeaderBarStyle(ms.startDate, ms.endDate)}
                                  >
                                    <span className="truncate">{ms.title} • {ms.progress}%</span>
                                  </div>
                                </div>

                                {/* Action Bars under this Milestone */}
                                {isExpanded && (ms.actions || []).map((act) => {
                                  const isActComplete = act.status === "Completed" || act.status === "Complete";
                                  const isActPending = act.status === "Pending Verification";
                                  const isActInProg = act.status === "In Progress";
                                  const isActIncoming = act.status === "Upcoming Task" || (act.status as any) === "Incoming";

                                  return (
                                    <div
                                      key={act.id}
                                      onClick={() => {
                                        setSelectedLeaderMilestoneId(ms.id);
                                        setSelectedLeaderActionId(act.id);
                                        handleOpenTaskDrawer({
                                          action: act,
                                          milestone: ms,
                                          project: item.project,
                                        });
                                      }}
                                      className="h-9 relative flex items-center bg-white/70 hover:bg-blue-50/20 border-t border-slate-100/60 cursor-pointer transition-colors"
                                      title="Click to view action progress and verification"
                                    >
                                      <div
                                        className={`absolute h-5 rounded-md text-[9px] font-semibold flex items-center px-2 overflow-hidden truncate z-10 shadow-2xs transition-all hover:scale-[1.01] ${
                                          isActComplete
                                            ? "bg-emerald-600 text-white"
                                            : isActPending
                                              ? "bg-amber-400 text-amber-950 border border-amber-500/40 ring-1 ring-amber-400/40"
                                              : isActInProg
                                                ? "bg-[#0B57D0] text-white"
                                                : isActIncoming
                                                  ? "bg-sky-400 text-sky-950 border border-sky-500/40"
                                                  : "bg-slate-400 text-white"
                                        }`}
                                        style={calculateLeaderBarStyle(act.startDate, act.endDate)}
                                      >
                                        <span className="truncate">{act.title} • {act.progress}% ({act.status})</span>
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
                </>
              )}

            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* VIEW MODE 2: 3-COLUMN OPERATIONAL HUB VIEW               */
          /* ======================================================== */
          <div className="flex-1 flex overflow-hidden min-h-0 divide-x divide-slate-200">
          
          {/* COLUMN 1: ASSIGNED MILESTONES (300px) */}
          <div className="w-[300px] shrink-0 bg-white flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 bg-[#FAFAFB] flex items-center justify-between shrink-0">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-900">Assigned Milestones</span>
                <span className="text-[10px] text-zinc-400">Projects & Deliverables</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-zinc-600">
                {displayedLeaderMilestones.length}
              </span>
            </div>

            {/* Filter Toolbar: Search Input on Top + Equal-Sized Segmented Tabs Below */}
            <div className="p-2.5 border-b border-slate-100 bg-white flex flex-col gap-2 shrink-0">
              {/* 1. Search Box on Top */}
              <div className="relative w-full">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search milestone or project..."
                  value={tlMilestoneSearchQuery}
                  onChange={(e) => setTlMilestoneSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-[#FAFAFC] focus:bg-white focus:outline-none focus:border-[#0B57D0] placeholder:text-zinc-400"
                />
                {tlMilestoneSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTlMilestoneSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* 2. Equal-Width Segmented Tabs (Active / Past / All) */}
              <div className="flex items-center bg-[#F1F3F4] p-0.5 rounded-lg border border-slate-200/80 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setTlMilestoneStatusFilter("active")}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer text-center truncate ${
                    tlMilestoneStatusFilter === "active"
                      ? "bg-white text-[#0B57D0] shadow-2xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900 font-normal"
                  }`}
                >
                  Active ({activeLeaderMilestonesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTlMilestoneStatusFilter("past")}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer text-center truncate ${
                    tlMilestoneStatusFilter === "past"
                      ? "bg-white text-[#0B57D0] shadow-2xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900 font-normal"
                  }`}
                >
                  Past ({pastLeaderMilestonesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTlMilestoneStatusFilter("all")}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer text-center truncate ${
                    tlMilestoneStatusFilter === "all"
                      ? "bg-white text-[#0B57D0] shadow-2xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900 font-normal"
                  }`}
                >
                  All ({leaderMilestonesList.length})
                </button>
              </div>
            </div>

            {/* Milestones Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y-0">
              {displayedLeaderMilestones.length === 0 ? (
                <div className="py-20 px-4 flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-zinc-400">
                    <Layers size={18} />
                  </div>
                  <p className="text-xs font-semibold text-zinc-700">No Milestones Found</p>
                  <p className="text-[11px] text-zinc-400 max-w-[200px]">
                    {tlMilestoneSearchQuery
                      ? "No milestones match your search query."
                      : "No milestones in this filter tab."}
                  </p>
                </div>
              ) : (
                displayedLeaderMilestones.map((item) => {
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
                      {/* 1. Milestone Title: Big on top, wraps max 2 lines */}
                      <h2
                        className={`text-sm font-bold leading-snug line-clamp-2 ${
                          isSelected ? "text-[#0B57D0]" : "text-zinc-950"
                        }`}
                        title={item.milestone.title}
                      >
                        {item.milestone.title}
                      </h2>

                      {/* 2. Project Name: Small under milestone title */}
                      <div className="text-[11px] font-medium text-zinc-500 truncate" title={item.project.title}>
                        {item.project.title}
                      </div>

                      {/* 3. User on Left, Due Date on Right */}
                      <div className="pt-1.5 flex flex-col gap-1.5 border-t border-slate-100">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-600 flex items-center gap-1 min-w-0 truncate max-w-[130px]" title={item.milestone.lead}>
                            <User size={12} className="text-zinc-400 shrink-0" />
                            <span className="truncate">{item.milestone.lead}</span>
                          </span>
                          <span className="text-zinc-500 font-medium shrink-0">
                            Due {formatDate(item.milestone.endDate)}
                          </span>
                        </div>

                        {/* 4. Progress Bar & Completion */}
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                          <span>Progress</span>
                          <span className="font-bold text-emerald-700">
                            {compActs}/{totalActs} Done
                          </span>
                        </div>
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
                })
              )}
            </div>
          </div>

          {/* COLUMN 2: ACTION MANAGEMENT & BREAKDOWN (FLEX-1) */}
          <div className="flex-1 flex flex-col bg-[#FAFAFC] overflow-hidden min-w-0">
            {/* Active Milestone Banner Header */}
            {currentMilestone && currentProject ? (
              <div className="px-5 py-4 bg-white border-b border-slate-200 flex flex-col gap-3.5 shrink-0">
                {/* ROW 1: Milestone Title (Big) & Small Unhighlighted Project Name */}
                <div className="flex flex-col min-w-0">
                  <h1 className="text-xl font-bold text-zinc-950 truncate tracking-tight" title={currentMilestone.title}>
                    {currentMilestone.title}
                  </h1>
                  <span className="text-xs text-zinc-500 font-normal truncate mt-0.5" title={currentProject.title}>
                    {currentProject.title}
                  </span>
                </div>

                {/* ROW 2: Search Box + Due Date (with Delay Request) + Completion Progress */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Search Box */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search action or member..."
                      value={tlActionSearchQuery}
                      onChange={(e) => setTlActionSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-[#F8F9FA] focus:bg-white focus:outline-none focus:border-[#0B57D0] placeholder:text-zinc-400 transition-colors"
                    />
                  </div>

                  {/* Due Date & Request Delay + Completion Badge */}
                  <div className="flex items-center gap-2.5 shrink-0 text-xs">
                    {/* Due Date with Integrated Request Delay */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-[#F8F9FA] text-zinc-700">
                      <Clock size={13} className="text-zinc-400" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-500 text-[11px]">Due:</span>
                        <span className="font-semibold text-zinc-900">{formatDate(currentMilestone.endDate)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenDelayRequest({
                            projectId: currentProject.id,
                            milestoneId: currentMilestone.id,
                            title: currentMilestone.title,
                            currentEndDate: currentMilestone.endDate,
                            isMilestone: true,
                          });
                        }}
                        className="ml-1 pl-2 border-l border-slate-200 text-[#0B57D0] hover:text-[#0842A0] text-[11px] font-semibold cursor-pointer transition-colors"
                        title="Request Deadline Extension"
                      >
                        Request Delay
                      </button>
                    </div>

                    {/* Progress Badge */}
                    <div className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-800 flex items-center gap-1.5 font-semibold text-[11px]">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>{completedActionsCount}/{totalActionsCount} Done</span>
                    </div>
                  </div>
                </div>

                {/* ROW 3: Full-Width Status Filter Radio Tabs */}
                <div className="w-full flex items-center bg-[#F1F3F4] p-1 rounded-lg border border-slate-200/80 text-xs">
                  {([
                    { id: "all", label: "All Task" },
                    { id: "Pending Action", label: "Pending Action" },
                    { id: "In Progress", label: "In Progress" },
                    { id: "Pending Verification", label: "Pending Verification" },
                    { id: "Complete", label: "Complete" },
                    { id: "Upcoming Task", label: "Upcoming Task" },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTlActionStatusFilter(tab.id as any)}
                      className={`flex-1 py-1.5 rounded-md text-xs transition-all cursor-pointer text-center truncate ${
                        tlActionStatusFilter === tab.id
                          ? "bg-white text-[#0B57D0] font-bold shadow-2xs"
                          : "text-zinc-600 hover:text-zinc-900 font-medium"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Actions List Grid */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {!currentMilestone || leaderMilestonesList.length === 0 ? (
                <div className="h-full py-24 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0B57D0] flex items-center justify-center border border-blue-100 shadow-2xs">
                    <CheckCircle2 size={28} />
                  </div>
                  <div className="flex flex-col gap-1 max-w-sm">
                    <h3 className="text-sm font-bold text-zinc-900">No Pending Projects or Action Needs</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      You currently have no pending projects or milestone actions assigned. All deliverables are complete or waiting assignment.
                    </p>
                  </div>
                </div>
              ) : filteredActions.length === 0 ? (
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
                </div>
              ) : (
                filteredActions.map((act) => {
                  const isDone = act.status === "Complete" || (act.status as any) === "Completed";
                  const isPendingVerif = act.status === "Pending Verification";
                  const isInProgress = act.status === "In Progress";
                  const isIncoming = act.status === "Upcoming Task" || (act.status as any) === "Incoming";
                  const isSelected = selectedLeaderAction?.id === act.id;
                  const logsCount = (act.logs || []).length;

                  return (
                    <div
                      key={act.id}
                      onClick={() => setSelectedLeaderActionId(act.id)}
                      className={`rounded-xl border p-4 shadow-xs transition-all flex items-center justify-between gap-4 cursor-pointer group/act ${
                        isSelected
                          ? "bg-[#D3E3FD]/25 border-[#0B57D0] ring-1 ring-[#0B57D0]/30 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-zinc-50/50"
                      }`}
                    >
                      {/* Left info */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isDone
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : isPendingVerif
                              ? "bg-amber-50 text-amber-700 border border-amber-300"
                              : isInProgress
                              ? "bg-blue-50 text-[#0B57D0] border border-blue-200"
                              : isIncoming
                              ? "bg-sky-50 text-sky-700 border border-sky-200"
                              : "bg-slate-100 text-zinc-500 border border-slate-200"
                          }`}
                        >
                          {isDone ? (
                            <Check size={16} className="stroke-[3]" />
                          ) : isPendingVerif ? (
                            <AlertCircle size={16} className="text-amber-600" />
                          ) : isInProgress ? (
                            <Clock size={16} />
                          ) : isIncoming ? (
                            <Calendar size={15} />
                          ) : (
                            <Clock size={16} />
                          )}
                        </div>

                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className={`text-xs font-bold leading-snug ${isSelected ? "text-[#0B57D0]" : "text-zinc-900"}`}>
                              {act.title}
                            </h3>
                            {isDone ? (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                                <Check size={10} className="stroke-[3]" /> 100% Complete
                              </span>
                            ) : isPendingVerif ? (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 shrink-0">
                                <AlertCircle size={10} className="text-amber-600" /> Pending Verification ({logsCount} {logsCount === 1 ? "log" : "logs"})
                              </span>
                            ) : isInProgress ? (
                              <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0B57D0] border border-blue-200 flex items-center gap-1 shrink-0">
                                <Clock size={10} /> {act.progress}% In Progress ({logsCount}/{logsCount + 1})
                              </span>
                            ) : isIncoming ? (
                              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1 shrink-0">
                                <Calendar size={10} /> Upcoming Task
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-zinc-600 border border-slate-200 shrink-0">
                                Pending Action
                              </span>
                            )}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditAction(act);
                          }}
                          className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium cursor-pointer transition-colors"
                        >
                          Edit / Reassign
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteActionConfirmTarget({ action: act, milestoneTitle: currentMilestone?.title });
                          }}
                          className="w-7 h-7 rounded-md hover:bg-rose-50 text-zinc-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                          title="Delete / Archive Action"
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

          {/* COLUMN 3: ACTION PROGRESS & VERIFICATION TIMELINE (420px) */}
          <div className="w-[420px] shrink-0 bg-white flex flex-col overflow-hidden divide-y divide-slate-200">
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#FAFAFB] flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Inbox size={15} className="text-[#0B57D0]" />
                  <span className="text-xs font-bold text-zinc-900">Action Progress & Review</span>
                </div>
                {selectedLeaderAction && (
                  selectedLeaderAction.status === "Completed" ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Check size={10} className="stroke-[3]" /> 100% Completed
                    </span>
                  ) : selectedLeaderAction.status === "Pending Verification" ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <AlertCircle size={10} className="text-amber-600" /> Pending Verification
                    </span>
                  ) : selectedLeaderAction.status === "In Progress" ? (
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0B57D0] border border-blue-200 flex items-center gap-1">
                      <Clock size={10} /> {selectedLeaderAction.progress}% In Progress ({(selectedLeaderAction.logs || []).length}/{(selectedLeaderAction.logs || []).length + 1})
                    </span>
                  ) : selectedLeaderAction.status === "Incoming" ? (
                    <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1">
                      <Calendar size={10} /> Incoming
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-zinc-600 border border-slate-200">
                      0% To Do
                    </span>
                  )
                )}
              </div>

              {selectedLeaderAction ? (
                <div className="flex flex-col gap-1 pt-0.5">
                  <h3 className="text-xs font-bold text-zinc-900 truncate" title={selectedLeaderAction.title}>
                    {selectedLeaderAction.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[10.5px] text-zinc-500">
                    <span>Assigned: <strong className="text-zinc-700">{selectedLeaderAction.assignee}</strong></span>
                    <span>•</span>
                    <span>Due: <strong>{formatDate(selectedLeaderAction.endDate)}</strong></span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-400">Select an action to inspect updates</p>
              )}

              {/* Pending Verification Callout Banner for Leader */}
              {selectedLeaderAction && selectedLeaderAction.status === "Pending Verification" && (() => {
                const logs = selectedLeaderAction.logs || [];
                const ackedLogs = logs.filter((l) => l.reviewStatus === "acknowledged");
                const allAcked = logs.length > 0 && ackedLogs.length === logs.length;
                return (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col gap-2 mt-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <AlertCircle size={14} className="text-amber-600 shrink-0" />
                        <span className="text-xs font-bold text-amber-900 truncate">Pending Verification</span>
                      </div>
                      <span className="text-[10.5px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                        {ackedLogs.length}/{logs.length} Acknowledged
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800/90 leading-snug">
                      {allAcked
                        ? "All progress updates are acknowledged. Finalize completion below."
                        : "Team member submitted completion. Please acknowledge all progress updates to finalize 100% completion."}
                    </p>
                    {allAcked && (
                      <button
                        type="button"
                        onClick={() => handleFinalizeActionCompletion(selectedLeaderAction.id)}
                        className="mt-1 w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <Check size={13} className="stroke-[3]" />
                        <span>✓ Finalize & Mark Action as Complete</span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Scrollable Progress Updates Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFAFC]">
              {!selectedLeaderAction ? (
                <div className="py-20 flex flex-col items-center justify-center text-center gap-2 text-zinc-400">
                  <Inbox size={24} />
                  <span className="text-xs font-semibold text-zinc-600">No Action Selected</span>
                  <span className="text-[11px] max-w-[200px]">Click any action on the left to review its daily progress logs and proof submissions.</span>
                </div>
              ) : (!selectedLeaderAction.logs || selectedLeaderAction.logs.length === 0) ? (
                <div className="py-20 flex flex-col items-center justify-center text-center gap-2 text-zinc-400">
                  <Clock3 size={24} />
                  <span className="text-xs font-semibold text-zinc-600">No Progress Logs Yet</span>
                  <span className="text-[11px] max-w-[240px]">Team members have not logged any progress updates for this action yet.</span>
                </div>
              ) : (
                selectedLeaderAction.logs.map((log) => {
                  const isAcknowledged = log.reviewStatus === "acknowledged";
                  const isRedo = log.reviewStatus === "redo";

                  return (
                    <div
                      key={log.id}
                      className={`p-4 rounded-xl border bg-white shadow-xs flex flex-col gap-3 transition-all ${
                        isAcknowledged
                          ? "border-emerald-200 ring-1 ring-emerald-500/10"
                          : isRedo
                          ? "border-rose-200 bg-rose-50/10 ring-1 ring-rose-500/10"
                          : "border-slate-200"
                      }`}
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
                            <span className="text-[10px] text-zinc-400">
                              By <strong className="text-zinc-700">{log.author}</strong> • {formatDateTime(log.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Accomplishment Details */}
                      {log.whatIDidDesc && (
                        <div className="text-xs text-zinc-700 leading-relaxed bg-[#F8F9FB] p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                          {log.whatIDidDesc}
                        </div>
                      )}

                      {/* Next Direction */}
                      {log.whatIsNext && (
                        <div className="flex items-start gap-1.5 text-blue-800 bg-blue-50/70 px-2.5 py-1.5 rounded-lg border border-blue-100 text-[11px]">
                          <ArrowRight size={12} className="shrink-0 mt-0.5 text-blue-600" />
                          <div className="flex flex-col">
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-600">What's Next:</span>
                            <span className="font-medium leading-snug">{log.whatIsNext}</span>
                          </div>
                        </div>
                      )}

                      {/* Attachments & Proof Photos */}
                      {(() => {
                        const logPhotos = getProofPhotos(log);
                        const logPdfs = getPdfAttachments(log);
                        if (logPdfs.length === 0 && logPhotos.length === 0) return null;
                        return (
                          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {logPdfs.map((pdf, pIdx) => (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => openPdfInNewTab(pdf.url, pdf.name)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10.5px] font-medium border border-rose-200 cursor-pointer transition-colors shadow-2xs"
                                  title="Open PDF in new tab"
                                >
                                  <FileText size={12} className="text-rose-600" />
                                  <span className="truncate max-w-[140px]">{pdf.name}</span>
                                  <ExternalLink size={10} className="text-rose-500/70" />
                                </button>
                              ))}

                              {logPhotos.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setPhotoSliderState({
                                    title: `${selectedLeaderAction?.title || "Task"}: ${log.whatIDidTitle}`,
                                    photos: logPhotos,
                                    activeIndex: 0
                                  })}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10.5px] font-medium border border-emerald-200 cursor-pointer transition-colors"
                                >
                                  <ImageIcon size={12} />
                                  <span>Proof Photos ({logPhotos.length})</span>
                                </button>
                              )}
                            </div>

                            {/* Thumbnail row */}
                            {logPhotos.length > 0 && (
                              <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                                {logPhotos.map((photoUrl, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => setPhotoSliderState({
                                      title: `${selectedLeaderAction?.title || "Task"}: ${log.whatIDidTitle}`,
                                      photos: logPhotos,
                                      activeIndex: pIdx
                                    })}
                                    className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 group/img cursor-pointer hover:ring-2 hover:ring-[#0B57D0]"
                                    title="Click to view photo in slide viewer"
                                  >
                                    <img
                                      src={photoUrl}
                                      alt={`Proof ${pIdx + 1}`}
                                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Team Leader Review Status / Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                        {isAcknowledged ? (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10.5px]">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              <span>Acknowledged by {log.reviewedBy} • {formatDateTime(log.reviewedAt)}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setRedoModalTarget({
                                  actionId: selectedLeaderAction.id,
                                  logId: log.id,
                                  logTitle: log.whatIDidTitle,
                                });
                                setRedoCommentText("");
                              }}
                              className="text-zinc-500 hover:text-amber-800 text-[10px] font-medium underline cursor-pointer"
                            >
                              Request Redo
                            </button>
                          </div>
                        ) : isRedo ? (
                          <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-[10.5px]">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1 font-bold text-rose-700">
                                <RotateCcw size={12} />
                                <span>Redo Requested by {log.reviewedBy}</span>
                              </span>
                              <span className="text-[10px] text-zinc-400">{log.reviewedAt}</span>
                            </div>
                            {log.reviewNote && (
                              <p className="text-[11px] text-rose-800 italic bg-white/70 p-1.5 rounded border border-rose-100">
                                "{log.reviewNote}"
                              </p>
                            )}
                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => handleAcknowledgeProgressLog(selectedLeaderAction.id, log.id)}
                                className="px-2 py-1 rounded bg-emerald-600 text-white font-semibold text-[10px] hover:bg-emerald-700 cursor-pointer shadow-2xs"
                              >
                                Mark as Acknowledged
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setRedoModalTarget({
                                  actionId: selectedLeaderAction.id,
                                  logId: log.id,
                                  logTitle: log.whatIDidTitle,
                                });
                                setRedoCommentText("");
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-2xs"
                            >
                              <RotateCcw size={11} />
                              <span>Redo this Progress</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAcknowledgeProgressLog(selectedLeaderAction.id, log.id)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-2xs"
                            >
                              <Check size={12} className="stroke-[2.5]" />
                              <span>Acknowledge Progress</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
        )}

        {/* MODAL DIALOG: REQUEST REDO ON PROGRESS LOG */}
        {redoModalTarget && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 font-primary">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-amber-50/60 to-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
                    <RotateCcw size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Request Redo on Progress Update</h3>
                    <p className="text-[11px] text-zinc-500 truncate max-w-xs">{redoModalTarget.logTitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRedoModalTarget(null)}
                  className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col gap-3 text-xs">
                <label className="font-semibold text-zinc-700">
                  Reason & Instructions for Redo:
                </label>
                <textarea
                  rows={3}
                  value={redoCommentText}
                  onChange={(e) => setRedoCommentText(e.target.value)}
                  placeholder="e.g. Please re-check store shelves in cluster 2 and retake the proof photo."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-amber-500 text-xs resize-none"
                  autoFocus
                />
                <p className="text-[10.5px] text-zinc-400 leading-relaxed">
                  The team member will see this redo notification on their task feed so they can adjust and resubmit.
                </p>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRedoModalTarget(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRedoProgressLog(redoModalTarget.actionId, redoModalTarget.logId, redoCommentText)}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <RotateCcw size={12} />
                  <span>Confirm Request Redo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE / EDIT ACTION MODAL */}
        {isAddActionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="px-5 py-3.5 border-b border-slate-200 bg-[#FAFAFB] flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-zinc-900">
                    {editingActionItem ? "Edit / Reassign Task" : "Create New Task"}
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

                {/* Task Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-zinc-700">Task Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Conduct store POS barcode & SKU audit"
                    value={formActionTitle}
                    onChange={(e) => setFormActionTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0]"
                    required
                  />
                </div>

                {/* Assignee / Multi-Member Selection from live users database */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-700">Assign To (Team Members)</label>
                    <span className="text-[10.5px] text-zinc-400">Can select multiple users</span>
                  </div>
                  <MultiUserSearchSelectDropdown
                    values={formActionAssignees}
                    onChange={(vals) => setFormActionAssignees(vals)}
                    users={availableUsers}
                    placeholder="Search and select team members..."
                    triggerClassName="min-h-9"
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

                {/* Instruction / Directives from Team Leader */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-zinc-700">Instruction from Team Leader</label>
                  <textarea
                    rows={3}
                    placeholder="Briefing / directives for assignee..."
                    value={formActionInstructions}
                    onChange={(e) => setFormActionInstructions(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-zinc-900 focus:outline-none focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/10 transition-all font-primary leading-relaxed resize-none"
                  />
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
                  {editingActionItem ? "Save Changes" : "Create Task"}
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

        {/* ACTION DELETE / ARCHIVE CONFIRMATION MODAL */}
        {deleteActionConfirmTarget && (() => {
          const act = deleteActionConfirmTarget.action;
          const logsCount = (act.logs || []).length;
          const hasProgression =
            logsCount > 0 ||
            act.progress > 0 ||
            act.status === "In Progress" ||
            act.status === "Pending Verification" ||
            act.status === "Complete" ||
            act.status === "Completed";

          return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-primary">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div
                  className={`px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 ${
                    hasProgression
                      ? "bg-gradient-to-r from-amber-50/60 to-white"
                      : "bg-gradient-to-r from-rose-50/60 to-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        hasProgression
                          ? "bg-amber-100/80 text-amber-800 border-amber-200"
                          : "bg-rose-100 text-rose-700 border-rose-200"
                      }`}
                    >
                      {hasProgression ? <Archive size={18} /> : <Trash2 size={18} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">
                        {hasProgression ? "Archive Task" : "Delete Task"}
                      </h3>
                      <p className="text-[11px] text-zinc-500 mt-0.5 truncate max-w-[280px]">
                        {act.title}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteActionConfirmTarget(null)}
                    className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-6 flex flex-col gap-3 text-xs">
                  {hasProgression ? (
                    <>
                      <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 flex flex-col gap-1">
                        <span className="font-bold flex items-center gap-1.5">
                          <AlertCircle size={13} className="text-amber-600 shrink-0" />
                          <span>Task Has Recorded History & Progress</span>
                        </span>
                        <p className="text-[11px] text-amber-800 leading-relaxed font-normal">
                          This task has <strong>{logsCount} progress update{logsCount === 1 ? "" : "s"}</strong> ({act.progress}% execution). Permanent deletion is disabled to prevent loss of audit history.
                        </p>
                      </div>
                      <p className="text-zinc-600 leading-relaxed font-normal pt-1">
                        Would you like to <strong>Archive</strong> this task instead? It will be removed from your active board while preserving all log history in the database.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-zinc-700 leading-relaxed font-normal">
                        Are you sure you want to permanently delete <strong>"{act.title}"</strong>?
                      </p>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        This task has no progress logs recorded and will be permanently deleted. This action cannot be undone.
                      </p>
                    </>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteActionConfirmTarget(null)}
                    className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteActionDeleteOrArchive}
                    className={`px-4 py-1.5 rounded-lg text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 ${
                      hasProgression
                        ? "bg-amber-600 hover:bg-amber-700"
                        : "bg-rose-600 hover:bg-rose-700"
                    }`}
                  >
                    {hasProgression ? <Archive size={13} /> : <Trash2 size={13} />}
                    <span>{hasProgression ? "Archive Task" : "Delete Task"}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Action / Task Slide-Over Drawer */}
        {renderTaskDrawer()}

        {/* Center Modal (Form to Create / Edit Progress) */}
        {renderAddProgressModal()}

        {/* Confirmation Modal: Submit Action for Completion & Verification */}
        {renderTaskCompleteModal()}

        {/* Delay Request Modal */}
        {renderDelayRequestModal()}

        {/* Multi-Photo Carousel Slider Modal */}
        {renderPhotoSliderModal()}

      </div>
    );
  }

  // ----------------------------------------------------
  // ACTION / TASK VIEW: Personal Execution & Daily Progress Feed
  // ----------------------------------------------------
  if (activeView === "team_member") {
    // Current user identifier (strictly current logged-in user with instant cache hydration)
    const cachedProfile = typeof window !== "undefined" ? (() => {
      try {
        const raw = localStorage.getItem("ib_user_profile");
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    })() : null;

    const effectiveProfile = profile || cachedProfile;
    const currentUserName = (effectiveProfile?.name || "").trim();
    const currentUserEmail = (effectiveProfile?.email || "").trim();
    const currentUserRole = (effectiveProfile?.role || "").trim();
    const isAdmin = currentUserRole.toLowerCase() === "administrator" || currentUserRole.toLowerCase() === "admin";

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

    // Filtered actions list - strictly own tasks only (supports single user or multi-user team assignments)
    const checkIsUserAssigned = (act: DummyAction) => {
      // If neither email nor name is loaded yet, display actions from cache rather than showing empty 0 items
      if (!currentUserEmail && !currentUserName) return true;

      const emailLower = currentUserEmail.toLowerCase();
      const nameLower = currentUserName.toLowerCase();

      // Check emails
      const emails = (act.assigneeEmail || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
      if (emailLower && emails.includes(emailLower)) return true;

      // Check names
      const names = (act.assignee || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
      if (nameLower && names.includes(nameLower)) return true;

      // Substring check for combined strings
      if (emailLower && (act.assigneeEmail || "").toLowerCase().includes(emailLower)) return true;
      if (nameLower && (act.assignee || "").toLowerCase().includes(nameLower)) return true;

      return false;
    };

    // Check if user has specific assigned items
    const hasAnyMatchedActions = allActionsFlattened.some((item) => checkIsUserAssigned(item.action));

    const memberActionsList = allActionsFlattened
      .filter((item) => {
        // If Admin has no specifically assigned actions, show all actions across projects
        const matchMember = (isAdmin && !hasAnyMatchedActions) ? true : checkIsUserAssigned(item.action);

        const matchTab =
          taskExecutionTab === "all"
            ? true
            : taskExecutionTab === "Pending Action"
            ? item.action.status === "Pending Action" || item.action.status === "In Progress" || item.action.status === "To Do"
            : taskExecutionTab === "Complete"
            ? item.action.status === "Complete" || (item.action.status as any) === "Completed"
            : taskExecutionTab === "Upcoming Task"
            ? item.action.status === "Upcoming Task" || (item.action.status as any) === "Incoming"
            : item.action.status === taskExecutionTab;

        const matchSearch =
          !taskSearchQuery ||
          item.action.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
          item.milestone.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
          item.project.title.toLowerCase().includes(taskSearchQuery.toLowerCase());

        return matchMember && matchTab && matchSearch;
      })
      .sort((a, b) => {
        const timeA = new Date(a.action.endDate).getTime() || 0;
        const timeB = new Date(b.action.endDate).getTime() || 0;
        return timeA - timeB;
      });

    // Stats calculations
    const myAllTasks = allActionsFlattened.filter((item) => checkIsUserAssigned(item.action));
    const myTotalCount = myAllTasks.length;
    const myIncomingCount = myAllTasks.filter((t) => t.action.status === "Upcoming Task" || (t.action.status as any) === "Incoming").length;
    const myPendingActionCount = myAllTasks.filter((t) => t.action.status === "Pending Action" || t.action.status === "In Progress" || t.action.status === "To Do").length;
    const myInProgressCount = myAllTasks.filter((t) => t.action.status === "In Progress").length;
    const myPendingVerifCount = myAllTasks.filter((t) => t.action.status === "Pending Verification").length;
    const myCompletedCount = myAllTasks.filter((t) => t.action.status === "Complete" || (t.action.status as any) === "Completed").length;

    return (
      <div className="h-screen w-full bg-[#FAFAFC] font-primary select-none flex flex-col overflow-hidden">
        {/* Top Header Bar with Filter Tabs & Search Bar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200/90 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
          {/* Left Title & Back */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleBackToMain}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition-all cursor-pointer border border-slate-200 shadow-2xs active:scale-95"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div className="flex items-baseline gap-2.5">
              <h1 className="text-base font-semibold text-zinc-900">Action & Task Execution Hub</h1>
              <span className="text-xs text-zinc-400 font-normal hidden xl:inline">Progress & Execution Logs</span>
            </div>
          </div>

          {/* Center / Right: Filter Tabs & Search Bar */}
          <div className="flex items-center gap-3">
            {/* Segmented Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#EAECEF] p-0.5 rounded-lg border border-slate-200/80 text-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setTaskExecutionTab("all")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  taskExecutionTab === "all"
                    ? "bg-white text-[#0B57D0] font-bold shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                All Task
              </button>
              <button
                type="button"
                onClick={() => setTaskExecutionTab("Pending Action")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  taskExecutionTab === "Pending Action"
                    ? "bg-white text-zinc-900 font-bold shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                Pending Action ({myPendingActionCount})
              </button>
              <button
                type="button"
                onClick={() => setTaskExecutionTab("In Progress")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  taskExecutionTab === "In Progress"
                    ? "bg-white text-[#0B57D0] font-bold shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                In Progress ({myInProgressCount})
              </button>
              <button
                type="button"
                onClick={() => setTaskExecutionTab("Pending Verification")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  taskExecutionTab === "Pending Verification"
                    ? "bg-white text-amber-800 font-bold shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                Pending Verification ({myPendingVerifCount})
              </button>
              <button
                type="button"
                onClick={() => setTaskExecutionTab("Complete")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  taskExecutionTab === "Complete" || (taskExecutionTab as any) === "Completed"
                    ? "bg-white text-emerald-700 font-bold shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                Complete ({myCompletedCount})
              </button>
              <button
                type="button"
                onClick={() => setTaskExecutionTab("Upcoming Task")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  taskExecutionTab === "Upcoming Task" || (taskExecutionTab as any) === "Incoming"
                    ? "bg-white text-sky-700 font-bold shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900 font-normal"
                }`}
              >
                Upcoming Task ({myIncomingCount})
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-64 shrink-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search action or task..."
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#0B57D0]"
              />
              {taskSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTaskSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2-COLUMN MAIN LAYOUT: Task List & Summary Metrics */}
        <div className="flex-1 flex overflow-hidden min-h-0 divide-x divide-slate-200">
            
            {/* MAIN COLUMN: TASK CHECKLIST & EXECUTION FEED (Flex-1) */}
            <div className="flex-1 flex flex-col bg-[#FAFAFC] overflow-hidden min-w-0">

              {/* Task Items Grid (2 to 3 cards per row) */}
              <div className="flex-1 overflow-y-auto p-5">
                {memberActionsList.length === 0 ? (
                  <div className="py-24 flex flex-col items-center justify-center text-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                      <CheckCircle2 size={24} />
                    </div>
                    <p className="text-sm font-bold text-zinc-800">
                      {taskSearchQuery || taskExecutionTab !== "all" ? "No Matching Actions" : "No Pending Action Needs"}
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                      {taskSearchQuery || taskExecutionTab !== "all"
                        ? "No actions match your current filter or search criteria."
                        : "You currently have no pending actions assigned. No action needed at this time."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 items-start">
                    {memberActionsList.map(({ action, milestone, project }) => {
                      const isDone = action.status === "Complete" || (action.status as any) === "Completed";
                      const isPendingVerif = action.status === "Pending Verification";
                      const isInProg = action.status === "In Progress";
                      const isIncoming = action.status === "Upcoming Task" || (action.status as any) === "Incoming";
                      const logsCount = (action.logs || []).length;
                      const latestLog = action.logs && action.logs.length > 0 ? action.logs[0] : null;

                      // Due date calculation for 7-day near deadline highlight
                      const todayMs = new Date().setHours(0, 0, 0, 0);
                      const dueMs = new Date(action.endDate).setHours(0, 0, 0, 0);
                      const daysLeft = Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24));
                      const isUrgent = daysLeft <= 7 && !isDone;

                      return (
                        <div
                          key={action.id}
                          onClick={() => handleOpenTaskDrawer({ action, milestone, project })}
                          className={`bg-white rounded-2xl border p-5 shadow-2xs transition-all hover:border-[#0B57D0]/60 hover:shadow-md cursor-pointer flex flex-col justify-between min-h-[200px] gap-4 group/taskcard ${
                            isDone
                              ? "border-emerald-200/80 bg-emerald-50/10"
                              : isPendingVerif
                              ? "border-amber-200 bg-amber-50/10 ring-1 ring-amber-500/10"
                              : isInProg
                              ? "border-blue-200 bg-white ring-1 ring-blue-500/10"
                              : isIncoming
                              ? "border-sky-200 bg-white"
                              : "border-slate-200"
                          }`}
                        >
                          {/* Top Row: Task Title & Status Badge */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <h3
                                className={`text-sm font-bold leading-snug ${
                                  isDone ? "line-through text-zinc-400" : "text-zinc-900 group-hover/taskcard:text-[#0B57D0]"
                                }`}
                              >
                                {action.title}
                              </h3>
                            </div>

                            {/* Status Badge */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isDone ? (
                                <span className="text-[10.5px] font-bold px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                  <Check size={11} className="stroke-[3]" /> Complete
                                </span>
                              ) : isPendingVerif ? (
                                <span className="text-[10.5px] font-bold px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                  <AlertCircle size={11} className="text-amber-600" /> Pending Verification
                                </span>
                              ) : isInProg ? (
                                <span className="text-[10.5px] font-bold px-3 py-0.5 rounded-full bg-blue-100 text-[#0B57D0] border border-blue-300 flex items-center gap-1">
                                  <Clock size={11} /> In Progress
                                </span>
                              ) : isIncoming ? (
                                <span className="text-[10.5px] font-medium px-3 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
                                  <Calendar size={11} className="text-sky-600" /> Upcoming Task
                                </span>
                              ) : (
                                <span className="text-[10.5px] font-medium px-3 py-0.5 rounded-full bg-slate-100 text-zinc-600 border border-slate-200">
                                  Pending Action
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Middle Section: Last Progress Title, Description, and Next */}
                          {latestLog ? (
                            <div className="p-4 rounded-xl bg-[#F8F9FB] border border-slate-200/80 text-xs flex flex-col justify-center gap-2 flex-1">
                              <div className="flex items-center justify-between text-[10.5px] text-zinc-400">
                                <span className="font-semibold text-zinc-800 flex items-center gap-1.5 truncate">
                                  <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                  <span className="truncate">{latestLog.whatIDidTitle}</span>
                                </span>
                                <span className="shrink-0 text-zinc-400">{formatDate(latestLog.timestamp.split(" ")[0])}</span>
                              </div>

                              {latestLog.whatIDidDesc && (
                                <div className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed font-normal">
                                  {latestLog.whatIDidDesc}
                                </div>
                              )}

                              {latestLog.whatIsNext && (
                                <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-200/70 text-[10.5px]">
                                  <ArrowRight size={11} className="text-blue-600 shrink-0" />
                                  <span className="text-blue-800 font-medium truncate">Next: {latestLog.whatIsNext}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-xs flex flex-col justify-center flex-1 min-h-[68px]">
                              {action.instructions ? (
                                <div className="text-[11.5px] text-zinc-600 line-clamp-3 leading-relaxed font-normal">
                                  {action.instructions}
                                </div>
                              ) : (
                                <span className="text-[11.5px] text-zinc-400 text-center">No progress yet.</span>
                              )}
                            </div>
                          )}

                          {/* Bottom Row: Single-line subtle sentence with submit due date */}
                          <div className="flex items-center justify-center pt-2.5 border-t border-slate-200 text-center">
                            <p
                              className={`text-[11px] whitespace-nowrap transition-colors ${
                                isUrgent
                                  ? "text-rose-600 font-semibold"
                                  : "text-zinc-500 font-normal"
                              }`}
                            >
                              Complete this task and submit before :{" "}
                              <strong className={isUrgent ? "text-rose-600 font-bold" : "text-zinc-700 font-semibold"}>
                                {formatDate(action.endDate)}
                              </strong>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* SIDEBAR COLUMN: SUMMARY & COMPLETION PROGRESS (320px) */}
            <div className="w-[320px] shrink-0 bg-white flex flex-col overflow-hidden divide-y divide-slate-200">
              {/* Header */}
              <div className="px-5 py-4 bg-[#FAFAFB] flex flex-col gap-1">
                <span className="text-xs font-bold text-zinc-900">Execution Overview</span>
                <span className="text-[11px] text-zinc-400 font-normal">
                  Assigned to {currentUserName}
                </span>
              </div>

              {/* Score Metrics Grid */}
              <div className="p-5 flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col">
                    <span className="text-xs font-bold text-zinc-800">{myPendingActionCount}</span>
                    <span className="text-[9.5px] text-zinc-500 font-semibold uppercase mt-0.5">Pending Action</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col">
                    <span className="text-xs font-bold text-[#0B57D0]">{myInProgressCount}</span>
                    <span className="text-[9.5px] text-blue-600 font-semibold uppercase mt-0.5">In Progress</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col">
                    <span className="text-xs font-bold text-amber-800">{myPendingVerifCount}</span>
                    <span className="text-[9.5px] text-amber-700 font-semibold uppercase mt-0.5">Pending Verif</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200 flex flex-col">
                    <span className="text-xs font-bold text-sky-800">{myIncomingCount}</span>
                    <span className="text-[9.5px] text-sky-600 font-semibold uppercase mt-0.5">Upcoming Task</span>
                  </div>
                  <div className="col-span-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col">
                    <span className="text-xs font-bold text-emerald-700">{myCompletedCount}</span>
                    <span className="text-[9.5px] text-emerald-700 font-semibold uppercase mt-0.5">Complete</span>
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

              {/* Execution Guidelines */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#FAFAFC]">
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100/80 text-xs text-zinc-700 space-y-2">
                  <span className="font-bold text-[#0B57D0] flex items-center gap-1.5">
                    <Sparkles size={13} />
                    <span>Progress Guidelines</span>
                  </span>
                  <p className="text-[11px] text-zinc-600 leading-relaxed font-normal">
                    Log task accomplishments, mention specific IDs (e.g. <code>@ACT_3453645674574754</code>), upload photo proof, and specify what comes next.
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

        {/* Action / Task Slide-Over Drawer */}
        {renderTaskDrawer()}

        {/* Center Modal (Form to Create / Edit Progress) */}
        {renderAddProgressModal()}

        {/* Confirmation Modal: Submit Action for Completion & Verification */}
        {renderTaskCompleteModal()}

        {/* Delay Request Modal */}
        {renderDelayRequestModal()}

        {/* Multi-Photo Carousel Slider Modal */}
        {renderPhotoSliderModal()}

      </div>
    );
  }

  // Default: Fallback redirect to dashboard main page
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#F8F9FC] font-primary select-none">
      <span className="text-xs font-bold text-zinc-500 animate-pulse">Redirecting to Dashboard...</span>
    </div>
  );
}

export default function StandaloneWorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-[#F8F9FC] font-primary select-none">
        <span className="text-xs font-bold text-zinc-400">Loading workspace...</span>
      </div>
    }>
      <StandaloneWorkspaceContent />
      <ToastContainer />
    </Suspense>
  );
}

