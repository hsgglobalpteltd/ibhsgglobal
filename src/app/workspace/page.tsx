"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  MoreHorizontal,
  FileText,
  Clock,
  Lock,
  Unlock,
  Share2,
  LayoutGrid,
  ArrowUpDown,
  Filter,
  Trash2,
  ArrowLeft,
  Copy,
  Check,
  X,
  User as UserIcon,
  Tag,
  SlidersHorizontal,
  Flame,
  Building2,
  FolderPlus,
  FilePlus,
  Loader2,
  Sparkles,
  Pencil,
  Edit2,
  UserPlus,
  Users,
  AlertCircle,
  Upload,
  Download,
  FileCode,
  Paperclip,
  RefreshCw,
  Calendar,
  Heading1,
  Heading2,
  Heading3,
  List,
  CheckSquare,
  Quote,
  Lightbulb,
  Type,
  GripVertical,
  CheckCircle2,
  FileEdit,
  Image as ImageIcon,
  Columns2,
  Columns3,
  Columns,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  History,
  Eye,
  EyeOff,
  ShieldCheck,
  Save,
  Undo2,
  Redo2,
  LogOut,
  Bot,
  ExternalLink,
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { auth, googleProvider, signInWithPopup } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { syncUserProfile } from "@/lib/api";
import {
  fetchWfeBootstrap,
  saveWfeTeamspace,
  archiveWfeTeamspace,
  deleteWfeTeamspace,
  saveWfePage,
  deleteWfePage,
  saveWfeTask,
  deleteWfeTask,
  saveWfeMember,
  deleteWfeMember,
  saveWfeShare,
  verifyWfePin,
  getWfeAiToken,
  regenerateWfeAiToken,
  uploadWfeFile,
  deleteWfeFile,
  WfeTaskAttachment,
  WfeTaskLog,
} from "@/lib/api";

// -------------------------------------------------------------
// TYPES & INTERFACES (100% Live Database wfe_ Schema)
// -------------------------------------------------------------
interface WfeBlock {
  id: string;
  type: "paragraph" | "h1" | "h2" | "h3" | "todo" | "bullet" | "quote" | "callout";
  content: string;
  checked?: boolean;
}

interface WfeTask {
  id: string;
  page_id?: string | null;
  teamspace_id?: string | null;
  title: string;
  custom_status: "To-do" | "In progress" | "In review" | "Complete" | string;
  priority: "Urgent" | "High" | "Medium" | "Low" | string;
  assigned_to?: string | null;
  due_date?: number | null;
  tags?: string[];
  blocks?: WfeBlock[];
  attachments?: WfeTaskAttachment[];
  logs?: WfeTaskLog[];
  is_locked?: number;
  pending_deletion?: number;
  deleted_by?: string | null;
  created_at?: number;
  updated_at?: number;
}

interface WfePage {
  id: string;
  teamspace_id?: string | null;
  parent_id?: string | null;
  title: string;
  icon: string;
  cover_image?: string | null;
  type: "database" | "doc";
  content_blocks?: WfeBlock[];
  attachments?: WfeTaskAttachment[];
  is_private: number;
  created_by?: string;
  created_at?: number;
  updated_at?: number;
}

interface WfeTeamspace {
  id: string;
  name: string;
  icon: string;
  color?: string;
  is_archived?: number;
  created_by?: string;
  created_at?: number;
  updated_at?: number;
}

interface WfeProjectMember {
  id: string;
  teamspace_id: string;
  name: string;
  email: string;
  role: string;
  created_at?: number;
  updated_at?: number;
}

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const STATUS_COLUMNS = [
  {
    id: "To-do",
    label: "To-do",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    dot: "bg-purple-500",
    containerBg: "bg-[#FAF7FD]",
    containerBorder: "border-[#EDE4F8]",
    badge: "bg-[#F3EAFD] text-purple-800",
    cardBorder: "border-[#ECE5F4] hover:border-purple-300",
  },
  {
    id: "In progress",
    label: "In progress",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    containerBg: "bg-[#FFFBF2]",
    containerBorder: "border-[#FCECD0]",
    badge: "bg-[#FEF3DC] text-amber-800",
    cardBorder: "border-[#F4ECD9] hover:border-amber-300",
  },
  {
    id: "In review",
    label: "In review",
    color: "bg-sky-100 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
    containerBg: "bg-[#F4F9FF]",
    containerBorder: "border-[#D9EAFF]",
    badge: "bg-[#E5F2FF] text-blue-800",
    cardBorder: "border-[#DFEAF7] hover:border-blue-300",
  },
  {
    id: "Complete",
    label: "Complete",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    containerBg: "bg-[#F3FAF5]",
    containerBorder: "border-[#D6F0DE]",
    badge: "bg-[#E2F7E9] text-emerald-800",
    cardBorder: "border-[#DBECE0] hover:border-emerald-300",
  },
];

function safeParseArray<T = any>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeWfePage(p: any): WfePage {
  return {
    ...p,
    content_blocks: safeParseArray<WfeBlock>(p.content_blocks),
    attachments: safeParseArray<WfeTaskAttachment>(p.attachments),
  };
}

function normalizeWfeTask(t: any): WfeTask {
  return {
    ...t,
    tags: safeParseArray<string>(t.tags),
    blocks: safeParseArray<WfeBlock>(t.blocks),
    attachments: safeParseArray<WfeTaskAttachment>(t.attachments),
    logs: safeParseArray<WfeTaskLog>(t.logs),
  };
}

export default function WorkspaceStandalonePage() {
  // Navigation & User State
  const [currentUser, setCurrentUser] = useState<{ email?: string; name?: string; role?: string } | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<string>("wfe_root");
  const [accessDenied, setAccessDenied] = useState(false);
  const [customProjectInput, setCustomProjectInput] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);

  // Task Activity Timeline Log Side Drawer State
  const [activeLogDrawerTask, setActiveLogDrawerTask] = useState<WfeTask | null>(null);

  // Custom Delete Confirmation Modal State (No native dialogs)
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    title: string;
    itemType: "teamspace" | "page" | "file";
    itemName: string;
    expectedPhrase: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState("");
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);

  // Live Database State (Zero Mock)
  const [teamspaces, setTeamspaces] = useState<WfeTeamspace[]>([]);
  const [pages, setPages] = useState<WfePage[]>([]);
  const [tasks, setTasks] = useState<WfeTask[]>([]);
  const [projectMembers, setProjectMembers] = useState<WfeProjectMember[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [activePageId, setActivePageId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Security Login State
  const [showGateModal, setShowGateModal] = useState(false);
  const [gateEmail, setGateEmail] = useState("");
  const [gatePin, setGatePin] = useState("");
  const [gateLoading, setGateLoading] = useState(false);
  const [gateError, setGateError] = useState("");

  // Share Settings Modal (PIN & URL Only)
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareSettings, setShareSettings] = useState<{ target_id?: string; security_pin?: string; allowed_emails?: string } | null>(null);
  const [allShareSettings, setAllShareSettings] = useState<Array<{ target_id: string; security_pin: string; allowed_emails?: string }>>([]);
  const [sharePinInput, setSharePinInput] = useState("");
  const [sharePinConfirmInput, setSharePinConfirmInput] = useState("");
  const [shareSaving, setShareSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [showPinRevealed, setShowPinRevealed] = useState(false);
  const [hoverPinRevealed, setHoverPinRevealed] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);

  // Dedicated "Manage People & Project Members" Modal
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [memberSource, setMemberSource] = useState<"database" | "email">("database");
  const [selectedDbUserEmail, setSelectedDbUserEmail] = useState("");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Member");
  const [savingMember, setSavingMember] = useState(false);

  // File Upload & Accordion Collapse States in Task Editor
  const [uploadingStage, setUploadingStage] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadStage, setPendingUploadStage] = useState<string>("To-do");
  const [replacingFileId, setReplacingFileId] = useState<string | null>(null);
  const [isTaskPropertiesOpen, setIsTaskPropertiesOpen] = useState(false);
  const skipSilentSyncUntilRef = useRef<number>(0);

  const toggleStageCollapse = (stageName: string) => {
    setCollapsedStages((prev) => ({ ...prev, [stageName]: !prev[stageName] }));
  };

  // Left Panel Modal Dialogs (Create & Edit Teamspace, Create & Edit Page)
  const [showNewTeamspaceModal, setShowNewTeamspaceModal] = useState(false);
  const [editingTeamspace, setEditingTeamspace] = useState<WfeTeamspace | null>(null);
  const [newTeamspaceName, setNewTeamspaceName] = useState("");
  const [newTeamspaceIcon, setNewTeamspaceIcon] = useState("🏢");
  const [savingTeamspace, setSavingTeamspace] = useState(false);

  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [editingPage, setEditingPage] = useState<WfePage | null>(null);
  const [newPageTeamspaceId, setNewPageTeamspaceId] = useState<string | null>(null);
  const [newPageIsPrivate, setNewPageIsPrivate] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageIcon, setNewPageIcon] = useState("📄");
  const [newPageType, setNewPageType] = useState<"database" | "doc">("database");
  const [savingPage, setSavingPage] = useState(false);

  // Active View Tab & Search
  const [activeTab, setActiveTab] = useState<"company" | "my" | "sprint" | "timeline">("company");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalSearchInput, setGlobalSearchInput] = useState("");

  // AI Bridge Integration Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiToken, setAiToken] = useState("");
  const [aiTokenLoading, setAiTokenLoading] = useState(false);
  const [aiRegenerating, setAiRegenerating] = useState(false);
  const [copiedAiLink, setCopiedAiLink] = useState(false);
  const [copiedAiPrompt, setCopiedAiPrompt] = useState(false);
  const [copiedOpenApi, setCopiedOpenApi] = useState(false);

  const resolveUserEmail = () => {
    if (currentUser?.email) return currentUser.email;
    if (typeof window !== "undefined") {
      try {
        const p = localStorage.getItem("ib_user_profile");
        if (p) {
          const parsed = JSON.parse(p);
          if (parsed?.email) return parsed.email;
        }
      } catch {}
    }
    return "admin@hsgglobal.com";
  };

  const handleOpenAiBridgeModal = async () => {
    setShowAiModal(true);
    const emailToUse = resolveUserEmail();
    if (!aiToken && emailToUse) {
      try {
        setAiTokenLoading(true);
        const res = await getWfeAiToken(emailToUse);
        if (res && res.success && res.token) {
          setAiToken(res.token);
        }
      } catch (err: any) {
        showToast("Failed to load AI Token: " + (err.message || err), "error");
      } finally {
        setAiTokenLoading(false);
      }
    }
  };

  const handleRegenerateAiToken = async () => {
    const emailToUse = resolveUserEmail();
    if (!emailToUse) return;
    try {
      setAiRegenerating(true);
      const res = await regenerateWfeAiToken(emailToUse);
      if (res && res.success && res.token) {
        setAiToken(res.token);
        showToast("New AI token generated!", "success");
      }
    } catch (err: any) {
      showToast("Failed to regenerate token: " + (err.message || err), "error");
    } finally {
      setAiRegenerating(false);
    }
  };

  // Prefetch AI token in background
  useEffect(() => {
    const emailToUse = resolveUserEmail();
    if (emailToUse && !aiToken) {
      getWfeAiToken(emailToUse)
        .then((res) => {
          if (res && res.success && res.token) {
            setAiToken(res.token);
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.email]);

  // Keyboard shortcuts (⌘K / Ctrl+K & Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
        setGlobalSearchInput("");
      } else if (e.key === "Escape") {
        setShowSearchModal(false);
        setShowShareModal(false);
        setShowNewTeamspaceModal(false);
        setShowNewPageModal(false);
        setShowAiModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Active Task Card / Full Page Editor
  const [editingTask, setEditingTask] = useState<WfeTask | null>(null);
  const initialEditingTaskRef = useRef<string | null>(null);

  const isTaskDirty = Boolean(
    editingTask &&
    initialEditingTaskRef.current &&
    JSON.stringify(editingTask) !== initialEditingTaskRef.current
  );

  const handleOpenEditingTask = (task: WfeTask) => {
    const cloned = JSON.parse(JSON.stringify(task));
    initialEditingTaskRef.current = JSON.stringify(cloned);
    setEditingTask(cloned);
  };

  const handleAttemptCloseTask = () => {
    if (isTaskDirty) {
      showToast("You have unsaved changes! Please click 'Save Changes' to save.", "warning");
      return;
    }
    setEditingTask(null);
    initialEditingTaskRef.current = null;
  };
  const [quickAddColumn, setQuickAddColumn] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  // Drag & Drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Select page & update URL parameter
  const handleSelectPage = (pageId: string) => {
    setActivePageId(pageId);
    const targetPage = pages.find((p) => p.id === pageId);
    const targetTs = teamspaces.find((ts) => ts.id === targetPage?.teamspace_id);
    const newUrl = targetTs 
      ? `/workspace?project=${targetTs.id}&page=${pageId}`
      : `/workspace?page=${pageId}`;
    window.history.pushState(null, "", newUrl);
  };

  // -------------------------------------------------------------
  // GOOGLE SIGN-IN HANDLER (FOR WORKSPACE ACCESS)
  // -------------------------------------------------------------
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user && result.user.email) {
        const token = await result.user.getIdToken();
        let sid = localStorage.getItem("session_id");
        if (!sid) {
          sid = "sess_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();
          localStorage.setItem("session_id", sid);
        }
        let dbProf: any = null;
        try {
          dbProf = await syncUserProfile(token, result.user.email, result.user.displayName || result.user.email, sid);
        } catch (_) {}
        const profile = dbProf || {
          email: result.user.email,
          name: result.user.displayName || result.user.email,
          role: "Operator"
        };
        localStorage.setItem("ib_user_profile", JSON.stringify(profile));
        localStorage.setItem("ib_auth_token", token);
        setCurrentUser(profile);
        setIsGuest(false);
        setAccessDenied(false);
        setShowGateModal(false);
        const urlParams = new URLSearchParams(window.location.search);
        const targetProj = urlParams.get("project") || "wfe_root";
        setTargetWorkspaceId(targetProj);
        loadLiveDatabase(profile.email, targetProj);
        showToast("Welcome back, " + (profile.name || profile.email), "success");
      }
    } catch (err: any) {
      console.error("Google sign-in error in workspace:", err);
      showToast(err.message || "Failed to sign in with Google", "error");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // INITIAL MOUNT & ROBUST SESSION CHECK (FIREBASE + LOCALSTORAGE)
  // -------------------------------------------------------------
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetProj = urlParams.get("project");
    const initialPage = urlParams.get("page");

    if (initialPage) {
      setActivePageId(initialPage);
    }

    // Helper to extract cached logged-in profile from browser storage
    const getCachedProfile = () => {
      try {
        const raw = localStorage.getItem("ib_user_profile") || sessionStorage.getItem("ib_user_profile");
        if (raw) {
          const parsed = typeof raw === "string" && raw.startsWith("{") ? JSON.parse(raw) : { email: raw };
          const email = parsed.email || parsed.user_email;
          if (email) {
            return {
              email,
              name: parsed.name || parsed.display_name || email,
              role: parsed.role || "Operator",
              ...parsed
            };
          }
        }
      } catch {}
      return null;
    };

    let cachedUser = getCachedProfile();
    let sessionResolved = false;

    if (cachedUser && cachedUser.email) {
      setCurrentUser(cachedUser);
      setIsGuest(false);
      setAccessDenied(false);
      const activeProj = targetProj || "wfe_root";
      setTargetWorkspaceId(activeProj);
      loadLiveDatabase(cachedUser.email, activeProj);
      sessionResolved = true;
    }

    // 2. Active Firebase Auth state listener to prevent losing session on direct URL navigation
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const token = await fbUser.getIdToken().catch(() => "");
        let sid = localStorage.getItem("session_id");
        if (!sid) {
          sid = "sess_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now();
          localStorage.setItem("session_id", sid);
        }
        let freshProf: any = null;
        if (token) {
          try {
            freshProf = await syncUserProfile(token, fbUser.email, fbUser.displayName || fbUser.email, sid);
          } catch (_) {}
        }
        const activeProfile = freshProf || {
          email: fbUser.email,
          name: fbUser.displayName || fbUser.email,
          role: "Operator"
        };
        localStorage.setItem("ib_user_profile", JSON.stringify(activeProfile));
        if (token) localStorage.setItem("ib_auth_token", token);

        setCurrentUser(activeProfile);
        setIsGuest(false);
        setAccessDenied(false);
        setShowGateModal(false);
        const activeProj = targetProj || "wfe_root";
        setTargetWorkspaceId(activeProj);
        loadLiveDatabase(activeProfile.email, activeProj);
        sessionResolved = true;
      } else if (!sessionResolved) {
        // No Firebase user and no cached user found yet
        if (targetProj) {
          // Guest with specific project parameter -> verify project exists first
          setTargetWorkspaceId(targetProj);
          setLoading(true);

          fetchWfeBootstrap("", targetProj).then((res) => {
            if (res && res.success) {
              const projectExists = res.teamspaces && res.teamspaces.some((ts: any) => ts.id === targetProj);
              if (!projectExists && targetProj !== "wfe_root") {
                localStorage.removeItem("wfe_guest_session_" + targetProj);
                setAccessDenied(true);
                setShowGateModal(false);
                setLoading(false);
                return;
              }

              setTeamspaces(res.teamspaces || []);
              setAccessDenied(false);

              // Check LocalStorage for saved guest session
              const storedGuest = localStorage.getItem("wfe_guest_session_" + targetProj);
              if (storedGuest) {
                try {
                  const parsed = JSON.parse(storedGuest);
                  if (parsed.targetId === targetProj && parsed.email) {
                    setCurrentUser(parsed);
                    setIsGuest(true);
                    loadLiveDatabase(parsed.email, targetProj);
                    return;
                  }
                } catch {}
              }

              // Valid project exists, no saved session -> show sign in modal
              setIsGuest(true);
              setShowGateModal(true);
              setLoading(false);
            } else {
              setAccessDenied(true);
              setShowGateModal(false);
              setLoading(false);
            }
          }).catch(() => {
            setAccessDenied(true);
            setShowGateModal(false);
            setLoading(false);
          });
        } else {
          // Direct visit to /workspace without login and without project link
          setAccessDenied(true);
          setShowGateModal(false);
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // -------------------------------------------------------------
  // LOAD LIVE DATABASE RECORDS (SILENT BACKGROUND SYNC & ZERO FLICKER)
  // -------------------------------------------------------------
  const loadLiveDatabase = async (email?: string, targetId?: string, silent = false) => {
    const currentTargetId = targetId || targetWorkspaceId;
    try {
      if (!silent) setLoading(true);
      const res = await fetchWfeBootstrap(email || currentUser?.email, currentTargetId);
      if (res && res.success) {
        // If specific target project was requested but does not exist (deleted):
        if (currentTargetId && currentTargetId !== "wfe_root") {
          const projectExists = res.teamspaces && res.teamspaces.some((ts: any) => ts.id === currentTargetId);
          if (!projectExists) {
            if (currentUser?.email && !isGuest) {
              // Logged in user: redirect cleanly to main workspace
              window.history.replaceState(null, "", "/workspace");
              setTargetWorkspaceId("wfe_root");
              loadLiveDatabase(currentUser.email, "wfe_root");
              showToast("The selected project was deleted or no longer exists.", "info");
              return;
            } else {
              // Guest: redirect to invalid link screen
              localStorage.removeItem(`wfe_guest_session_${currentTargetId}`);
              setCurrentUser(null);
              setShowGateModal(false);
              setAccessDenied(true);
              setLoading(false);
              return;
            }
          }
        }

        if (res.shareSettings) {
          setShareSettings(res.shareSettings);
        }
        if (res.allShareSettings) {
          setAllShareSettings(res.allShareSettings);
        }

        // Revoke guest session if manager has changed the project PIN
        if (isGuest && currentTargetId && currentTargetId !== "wfe_root") {
          const storedGuest = localStorage.getItem(`wfe_guest_session_${currentTargetId}`);
          if (storedGuest) {
            try {
              const parsed = JSON.parse(storedGuest);
              const livePin = res.shareSettings?.security_pin ? String(res.shareSettings.security_pin).trim() : "";
              if (!livePin || livePin.length >= 30 || (parsed.pin && String(parsed.pin).trim() !== livePin)) {
                // PIN changed or unset! Revoke session immediately
                localStorage.removeItem(`wfe_guest_session_${currentTargetId}`);
                setCurrentUser(null);
                setShowGateModal(true);
                showToast("Project security PIN has been updated by the manager. Please sign in again.", "error");
                setLoading(false);
                return;
              }
            } catch {}
          }
        }

        if (silent && Date.now() < skipSilentSyncUntilRef.current) {
          // Skip silent background sync while user has in-flight optimistic mutations
          return;
        }

        const liveTeamspaces: WfeTeamspace[] = res.teamspaces || [];
        const livePages: WfePage[] = (res.pages || []).map(normalizeWfePage).map((p: WfePage) => {
          if (typeof window !== "undefined") {
            try {
              const draftStr = localStorage.getItem(`ib_doc_draft_${p.id}`);
              if (draftStr) {
                const draft = JSON.parse(draftStr);
                if (draft && draft.content_blocks) {
                  return {
                    ...p,
                    title: draft.title !== undefined ? draft.title : p.title,
                    icon: draft.icon !== undefined ? draft.icon : p.icon,
                    content_blocks: safeParseArray<WfeBlock>(draft.content_blocks),
                  };
                }
              }
            } catch {}
          }
          return p;
        });
        const liveTasks: WfeTask[] = (res.tasks || []).map(normalizeWfeTask);

        setTeamspaces(liveTeamspaces);
        setPages(livePages);
        setTasks(liveTasks);
        setProjectMembers(res.projectMembers || []);
        setRegisteredUsers(res.registeredUsers || []);

        // Only restore or adjust active page on explicit user load or if active page no longer exists
        if (!silent) {
          const currentUrlParams = new URLSearchParams(window.location.search);
          const urlPageParam = currentUrlParams.get("page");
          if (urlPageParam && livePages.some((p) => p.id === urlPageParam)) {
            setActivePageId(urlPageParam);
          }
        }
      }
    } catch (err: any) {
      if (!silent) {
        showToast("Error loading live workspace: " + (err.message || err), "error");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // SILENT BACKGROUND AUTO-SYNC & REALTIME EVENT LISTENERS
  // -------------------------------------------------------------
  useEffect(() => {
    if (accessDenied || (!currentUser?.email && !isGuest)) return;

    // 1. Periodic background silent polling (every 8 seconds, skipped during optimistic user mutations)
    const interval = setInterval(() => {
      if (currentUser?.email && Date.now() >= skipSilentSyncUntilRef.current) {
        loadLiveDatabase(currentUser.email, targetWorkspaceId, true);
      }
    }, 8000);

    // 2. Global refresh button event ("db-refresh")
    const handleGlobalRefresh = () => {
      loadLiveDatabase(currentUser?.email, targetWorkspaceId, true);
    };
    window.addEventListener("db-refresh", handleGlobalRefresh);

    // 3. Tab focus & visibility change auto-refresh
    const handleWindowFocus = () => {
      if (document.visibilityState === "visible" && Date.now() >= skipSilentSyncUntilRef.current) {
        loadLiveDatabase(currentUser?.email, targetWorkspaceId, true);
      }
    };
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleWindowFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("db-refresh", handleGlobalRefresh);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleWindowFocus);
    };
  }, [currentUser?.email, targetWorkspaceId, accessDenied, isGuest]);

  // -------------------------------------------------------------
  // GUEST PIN SIGN IN VERIFICATION
  // -------------------------------------------------------------
  const handleVerifyGate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError("");
    setGateLoading(true);

    try {
      const res = await verifyWfePin(targetWorkspaceId, gateEmail, gatePin);
      if (res && res.success) {
        const sessionPayload = {
          ...res.session,
          pin: gatePin.trim(),
        };
        // Persist session in localStorage for this project
        localStorage.setItem(`wfe_guest_session_${targetWorkspaceId}`, JSON.stringify(sessionPayload));
        setCurrentUser(sessionPayload);
        setIsGuest(true);
        setShowGateModal(false);
        setAccessDenied(false);
        showToast("Access granted to workspace!", "success");
        loadLiveDatabase(gateEmail, targetWorkspaceId);
      } else {
        setGateError(res.error || "Invalid Email or 6-digit PIN");
      }
    } catch (err: any) {
      setGateError(err.message || "Failed to verify access");
    } finally {
      setGateLoading(false);
    }
  };

  // Active Page & Teamspace references
  const activePage = activePageId ? pages.find((p) => p.id === activePageId) || null : null;
  const activeDocBlocks: WfeBlock[] = safeParseArray<WfeBlock>(activePage?.content_blocks);
  const currentTeamspace = teamspaces.find((ts) => ts.id === activePage?.teamspace_id);
  const rawMembers = projectMembers.filter((m) => m.teamspace_id === currentTeamspace?.id);

  // Derive Manager (Creator) & Full Teamspace Members List
  const projectCreatorEmail = (currentTeamspace?.created_by || currentUser?.email || "admin@hsgglobal.com").trim();
  const creatorUser = registeredUsers.find((u) => (u.email || "").toLowerCase() === projectCreatorEmail.toLowerCase()) || 
    ((currentUser?.email || "").toLowerCase() === projectCreatorEmail.toLowerCase() ? currentUser : null);
  const creatorName = creatorUser?.name || currentUser?.name || (projectCreatorEmail.includes("@") ? projectCreatorEmail.split("@")[0] : projectCreatorEmail);

  const hasCreatorInList = rawMembers.some(
    (m) => (m.email || "").toLowerCase() === projectCreatorEmail.toLowerCase()
  );

  const creatorRecord: WfeProjectMember = {
    id: `manager_${currentTeamspace?.id || "hq"}`,
    teamspace_id: currentTeamspace?.id || "",
    name: creatorName,
    email: projectCreatorEmail,
    role: "Manager",
    created_at: currentTeamspace?.created_at || Date.now(),
  };

  const currentTeamspaceMembers: WfeProjectMember[] = hasCreatorInList
    ? rawMembers.map((m) => {
        const isCreator = (m.email || "").toLowerCase() === projectCreatorEmail.toLowerCase();
        const regMatch = registeredUsers.find((u) => (u.email || "").toLowerCase() === (m.email || "").toLowerCase());
        const resolvedName = regMatch?.name || (isCreator ? creatorName : m.name);
        return {
          ...m,
          name: resolvedName,
          role: (isCreator ? "Manager" : (m.role === "Owner" || m.role === "Co-Admin" || m.role === "Admin" ? "Manager" : (m.role || "Member"))) as any,
        };
      })
    : [creatorRecord, ...rawMembers.map((m) => {
        const regMatch = registeredUsers.find((u) => (u.email || "").toLowerCase() === (m.email || "").toLowerCase());
        return regMatch?.name ? { ...m, name: regMatch.name } : m;
      })];

  // Check if current user is Project Admin / Manager or System Administrator
  const isSystemAdmin = currentUser?.role === "Administrator";
  const isProjectCreator =
    !currentTeamspace?.created_by ||
    (currentUser?.email && currentTeamspace.created_by.toLowerCase() === currentUser.email.toLowerCase());
  
  const currentMemberRecord = currentTeamspaceMembers.find(
    (m) => (m.email || "").toLowerCase() === (currentUser?.email || "").toLowerCase()
  );

  const isProjectManager = currentMemberRecord?.role === "Manager" || isProjectCreator;
  const isProjectAdmin = isSystemAdmin || isProjectManager;
  const isProjectOwner = isSystemAdmin || isProjectCreator; // Project deletion reserved for creator/system admin

  // -------------------------------------------------------------
  // SHARE SETTINGS SAVE (SCOPED TO ACTIVE TEAMSPACE PROJECT)
  // -------------------------------------------------------------
  const currentShareTargetId = currentTeamspace?.id || activePage?.teamspace_id || targetWorkspaceId || "ts_hq";

  const activeShareRecord = allShareSettings.find((s) => s.target_id === currentShareTargetId) || 
    (shareSettings?.target_id === currentShareTargetId ? shareSettings : shareSettings);

  const activeConfiguredPin = activeShareRecord?.security_pin && activeShareRecord.security_pin.length <= 15
    ? activeShareRecord.security_pin 
    : "";

  const isPinConfigured = Boolean(activeConfiguredPin && activeConfiguredPin.length >= 4);

  const handleCloseToMain = () => {
    setActivePageId("");
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/workspace");
    }
  };

  const handleSaveShareSettings = async () => {
    if (!isProjectAdmin) {
      showToast("Only Project Managers or Admins can configure the project PIN.", "error");
      return;
    }

    const pin = sharePinInput.trim();
    const confirmPin = sharePinConfirmInput.trim();

    if (!pin || pin.length < 4) {
      showToast("Security PIN must be at least 4 digits.", "error");
      return;
    }

    if (pin !== confirmPin) {
      showToast("Security PIN and Re-entered PIN do not match.", "error");
      return;
    }

    setShareSaving(true);
    try {
      const res = await saveWfeShare({
        target_id: currentShareTargetId,
        security_pin: pin,
        allowed_emails: "",
      });
      if (res && res.shareSettings) {
        setShareSettings(res.shareSettings);
        setAllShareSettings((prev) => {
          const filtered = prev.filter((s) => s.target_id !== currentShareTargetId);
          return [...filtered, res.shareSettings];
        });
      }
      showToast(`Project PIN configured for "${currentTeamspace?.name || 'Project'}"!`, "success");
      setIsEditingPin(false);
      setSharePinInput("");
      setSharePinConfirmInput("");
    } catch (err: any) {
      showToast(err.message || "Failed to save share settings", "error");
    } finally {
      setShareSaving(false);
    }
  };

  const copyShareLink = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://ib-hsg.pages.dev";
    const shareUrl = `${origin}/workspace?project=${currentShareTargetId}`;

    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        success = true;
      }
    } catch {}

    if (!success) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand("copy");
        textArea.remove();
      } catch {}
    }

    if (success) {
      setCopiedLink(true);
      showToast("Share link copied to clipboard!", "success");
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      showToast("Link selected! Press Ctrl+C / Cmd+C to copy.", "info");
    }
  };

  // -------------------------------------------------------------
  // PROJECT MEMBERS & COLLABORATORS MANAGEMENT
  // -------------------------------------------------------------
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isProjectAdmin) {
      showToast("Only Project Managers or Admins can invite collaborators.", "error");
      return;
    }
    if (!currentTeamspace?.id) {
      showToast("Please select an active project first.", "error");
      return;
    }

    let nameToAdd = newMemberName.trim();
    let emailToAdd = newMemberEmail.trim().toLowerCase();

    if (memberSource === "database") {
      if (!selectedDbUserEmail) {
        showToast("Please search and select a user from the database list.", "warning");
        return;
      }
      const foundUser = registeredUsers.find((u) => u.email.toLowerCase() === selectedDbUserEmail.toLowerCase());
      if (!foundUser) {
        showToast("Selected user not found in the database list.", "error");
        return;
      }
      nameToAdd = foundUser.name;
      emailToAdd = foundUser.email.toLowerCase();
    } else {
      if (!nameToAdd) {
        showToast("Please enter the full name of the collaborator.", "warning");
        return;
      }
      if (!emailToAdd) {
        showToast("Please enter the email address of the collaborator.", "warning");
        return;
      }
      if (!emailToAdd.includes("@") || !emailToAdd.includes(".")) {
        showToast("Please enter a valid email address.", "warning");
        return;
      }
    }

    // Check duplicate in active project
    const existingMember = currentTeamspaceMembers.find(
      (m) => (m.email || "").toLowerCase() === emailToAdd
    );

    if (existingMember) {
      if (existingMember.role === newMemberRole) {
        // Exactly the same role - do nothing because it's same, no duplicate add in
        showToast(`${nameToAdd} is already a ${newMemberRole} in this project.`, "info");
        setNewMemberName("");
        setNewMemberEmail("");
        setSelectedDbUserEmail("");
        setMemberSearchQuery("");
        return;
      }
      // Different role: replace old with new
    }

    setSavingMember(true);
    const isRoleUpdate = Boolean(existingMember && existingMember.role !== newMemberRole);
    showToast(isRoleUpdate ? `Updating ${nameToAdd}'s role to ${newMemberRole}...` : `Adding ${nameToAdd} to ${currentTeamspace.name}...`, "info");
    try {
      const res = await saveWfeMember({
        id: existingMember?.id,
        teamspace_id: currentTeamspace.id,
        name: nameToAdd,
        email: emailToAdd,
        role: newMemberRole,
      });

      if (res && res.success && res.member) {
        setProjectMembers((prev) => {
          const filtered = prev.filter(
            (m) => m.id !== res.member.id && (m.email || "").toLowerCase() !== emailToAdd
          );
          return [...filtered, res.member];
        });

        if (res.unchanged) {
          showToast(`${nameToAdd} is already a ${newMemberRole} in this project.`, "info");
        } else if (res.updated || isRoleUpdate) {
          showToast(`Updated ${nameToAdd}'s role to ${newMemberRole} in project!`, "success");
        } else {
          showToast(`Successfully added ${nameToAdd} (${newMemberRole}) to project!`, "success");
        }

        setNewMemberName("");
        setNewMemberEmail("");
        setSelectedDbUserEmail("");
        setMemberSearchQuery("");
      } else {
        showToast("Failed to save member: " + (res?.error || "Unknown error"), "error");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to add collaborator to project", "error");
    } finally {
      setSavingMember(false);
    }
  };

  const handleAutoAddMemberToProject = async (personName: string, personEmail?: string) => {
    if (!currentTeamspace?.id) return;
    const resolvedEmail = personEmail?.toLowerCase() || 
      registeredUsers.find((u) => u.name.toLowerCase() === personName.toLowerCase())?.email?.toLowerCase() || 
      (personName.includes("@") ? personName.toLowerCase() : "");

    // Check if already a project member
    const alreadyMember = projectMembers.some(
      (m) => m.teamspace_id === currentTeamspace.id && (
        (resolvedEmail && m.email?.toLowerCase() === resolvedEmail) ||
        m.name?.toLowerCase() === personName.toLowerCase()
      )
    );

    const isCreator = (currentTeamspace.created_by || "").toLowerCase() === (resolvedEmail || "").toLowerCase();
    if (alreadyMember || isCreator) return;

    try {
      const res = await saveWfeMember({
        teamspace_id: currentTeamspace.id,
        name: personName,
        email: resolvedEmail || `${personName.toLowerCase().replace(/\s+/g, ".")}@workspace.local`,
        role: "Member",
      });

      if (res && res.success && res.member) {
        setProjectMembers((prev) => [...prev.filter((m) => m.id !== res.member.id), res.member]);
        showToast(`Added ${personName} to project`, "info");
      }
    } catch {}
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!isProjectAdmin) {
      showToast("Only Project Managers or Admins can remove project members.", "error");
      return;
    }
    try {
      showToast(`Removing ${memberName}...`, "info");
      await deleteWfeMember(memberId);
      setProjectMembers((prev) => prev.filter((m) => m.id !== memberId));
      showToast(`Removed ${memberName} from project`, "success");
    } catch (err: any) {
      showToast("Failed to remove member: " + err.message, "error");
    }
  };

  // -------------------------------------------------------------
  // LEFT PANEL: CREATE & EDIT TEAMSPACE
  // -------------------------------------------------------------
  const handleOpenEditTeamspaceModal = (ts: WfeTeamspace) => {
    setEditingTeamspace(ts);
    setNewTeamspaceName(ts.name);
    setNewTeamspaceIcon(ts.icon || "🏢");
    setShowNewTeamspaceModal(true);
  };

  const handleOpenCreateTeamspaceModal = () => {
    setEditingTeamspace(null);
    setNewTeamspaceName("");
    setNewTeamspaceIcon("🏢");
    setShowNewTeamspaceModal(true);
  };

  const handleSaveTeamspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamspaceName.trim()) return;
    skipSilentSyncUntilRef.current = Date.now() + 8000;

    const tsName = newTeamspaceName.trim();
    const tsIcon = newTeamspaceIcon || "🏢";
    setShowNewTeamspaceModal(false);
    setNewTeamspaceName("");

    if (editingTeamspace) {
      // Instant optimistic rename
      const updatedTs: WfeTeamspace = { ...editingTeamspace, name: tsName, icon: tsIcon, updated_at: Date.now() };
      setTeamspaces((prev) => prev.map((t) => (t.id === editingTeamspace.id ? updatedTs : t)));
      setEditingTeamspace(null);
      showToast(`Teamspace renamed to "${tsName}"`, "success");

      try {
        await saveWfeTeamspace({
          id: editingTeamspace.id,
          name: tsName,
          icon: tsIcon,
          created_by: editingTeamspace.created_by || currentUser?.email || "user",
        });
      } catch (err: any) {
        showToast(err.message || "Failed to save teamspace changes", "error");
      }
    } else {
      // Instant optimistic create project teamspace & default board page
      const tempTsId = `ts_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const tempPageId = `page_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

      const newTs: WfeTeamspace = {
        id: tempTsId,
        name: tsName,
        icon: tsIcon,
        created_by: currentUser?.email || "user",
        is_archived: 0,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const defaultPage: WfePage = {
        id: tempPageId,
        teamspace_id: tempTsId,
        title: "Tasks & Docs",
        icon: "📋",
        type: "database",
        content_blocks: [],
        attachments: [],
        is_private: 0,
        created_by: currentUser?.email || "user",
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Instant UI update
      setTeamspaces((prev) => [...prev, newTs]);
      setPages((prev) => [...prev, defaultPage]);
      setActivePageId(tempPageId);
      showToast(`Teamspace "${tsName}" created`, "success");

      try {
        const res = await saveWfeTeamspace({
          id: tempTsId,
          name: tsName,
          icon: tsIcon,
          created_by: currentUser?.email || "user",
          creator_name: currentUser?.name || (currentUser?.email ? currentUser.email.split("@")[0] : "Manager"),
        });

        const actualTs = res?.teamspace || newTs;

        const pageRes = await saveWfePage({
          id: tempPageId,
          teamspace_id: actualTs.id,
          title: "Tasks & Docs",
          icon: "📋",
          type: "database",
          created_by: currentUser?.email || "user",
        });

        if (pageRes && pageRes.success) {
          const normalizedPage = normalizeWfePage(pageRes.page);
          setPages((prev) => prev.map((p) => (p.id === tempPageId ? normalizedPage : p)));
          setActivePageId(normalizedPage.id);
        }
      } catch (err: any) {
        showToast(err.message || "Failed to save teamspace", "error");
      }
    }
  };

  const handleToggleArchiveTeamspace = async (ts: WfeTeamspace) => {
    if (!isProjectAdmin) {
      showToast("Only Project Managers or Admins can archive this project.", "error");
      return;
    }
    const isArchivedNow = ts.is_archived === 1;
    const newArchivedVal = !isArchivedNow;
    try {
      const res = await archiveWfeTeamspace(ts.id, newArchivedVal);
      if (res && res.success) {
        setTeamspaces((prev) =>
          prev.map((t) => (t.id === ts.id ? { ...t, is_archived: newArchivedVal ? 1 : 0 } : t))
        );
        setShowNewTeamspaceModal(false);
        setEditingTeamspace(null);
        showToast(
          newArchivedVal
            ? `Teamspace "${ts.name}" archived.`
            : `Teamspace "${ts.name}" restored from archive.`,
          "success"
        );
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update archive status", "error");
    }
  };

  const handlePromptDeleteTeamspace = (ts: WfeTeamspace) => {
    const ownerEmail = (ts.created_by || "").toLowerCase();
    const callerEmail = (currentUser?.email || "").toLowerCase();

    if (ownerEmail && callerEmail && ownerEmail !== callerEmail && currentUser?.role !== "Administrator") {
      showToast(`Only the project owner (${ownerEmail}) or system administrator can delete this project.`, "error");
      return;
    }

    const expected = `delete_${ts.name.trim().replace(/\s+/g, "_")}`;
    setConfirmDeleteInput("");
    setConfirmDelete({
      isOpen: true,
      title: `Delete Teamspace "${ts.name}"`,
      itemType: "teamspace",
      itemName: ts.name,
      expectedPhrase: expected,
      onConfirm: async () => {
        setConfirmDeleteLoading(true);
        try {
          await deleteWfeTeamspace(ts.id);
          setTeamspaces((prev) => prev.filter((t) => t.id !== ts.id));
          setPages((prev) => prev.filter((p) => p.teamspace_id !== ts.id));
          setTasks((prev) => prev.filter((t) => t.teamspace_id !== ts.id));
          setShowNewTeamspaceModal(false);
          setShowArchiveModal(false);
          setEditingTeamspace(null);
          setConfirmDelete(null);
          setActivePageId("");
          window.history.replaceState(null, "", "/workspace");
          showToast(`Deleted teamspace "${ts.name}"`, "info");
        } catch (err: any) {
          showToast("Delete failed: " + err.message, "error");
        } finally {
          setConfirmDeleteLoading(false);
        }
      },
    });
  };

  const handleDeleteTeamspace = async (tsId: string, tsName: string) => {
    const ts = teamspaces.find((t) => t.id === tsId);
    if (!ts) return;
    handlePromptDeleteTeamspace(ts);
  };

  // -------------------------------------------------------------
  // LEFT PANEL: CREATE & EDIT PAGE
  // -------------------------------------------------------------
  const handleOpenNewPageModal = (teamspaceId: string | null, isPrivate: boolean) => {
    setEditingPage(null);
    setNewPageTeamspaceId(teamspaceId);
    setNewPageIsPrivate(isPrivate);
    setNewPageTitle("");
    setNewPageIcon(isPrivate ? "👤" : "📄");
    setNewPageType("database");
    setShowNewPageModal(true);
  };

  const handleOpenEditPageModal = (page: WfePage) => {
    setEditingPage(page);
    setNewPageTeamspaceId(page.teamspace_id || null);
    setNewPageIsPrivate(!!page.is_private);
    setNewPageTitle(page.title);
    setNewPageIcon(page.icon || "📄");
    setNewPageType(page.type || "database");
    setShowNewPageModal(true);
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageTitle.trim()) return;
    setSavingPage(true);

    try {
      if (editingPage) {
        // Edit existing page (Preserve layout type: type cannot be changed after creation)
        const res = await saveWfePage({
          id: editingPage.id,
          teamspace_id: editingPage.teamspace_id,
          title: newPageTitle.trim(),
          icon: newPageIcon,
          type: editingPage.type || "database",
          is_private: editingPage.is_private,
          created_by: editingPage.created_by,
        });
        if (res && res.success) {
          const normalizedPage = normalizeWfePage(res.page);
          setPages(pages.map((p) => (p.id === editingPage.id ? normalizedPage : p)));
          setShowNewPageModal(false);
          setEditingPage(null);
          showToast(`Renamed to "${normalizedPage.title}"`, "success");
        }
      } else {
        // Create new
        const res = await saveWfePage({
          teamspace_id: newPageTeamspaceId,
          title: newPageTitle.trim(),
          icon: newPageIcon,
          type: newPageType,
          is_private: newPageIsPrivate ? 1 : 0,
          created_by: currentUser?.email || "user",
          content_blocks: [
            { id: `b_${Date.now()}_callout`, type: "callout", content: "Collaborative workspace document for HSG Global." },
            { id: `b_${Date.now()}_p`, type: "paragraph", content: "" },
          ],
        });

        if (res && res.success) {
          const normalizedPage = normalizeWfePage(res.page);
          setPages([...pages, normalizedPage]);
          setActivePageId(normalizedPage.id);
          setShowNewPageModal(false);
          setNewPageTitle("");
          showToast(`"${normalizedPage.title}" created`, "success");
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save", "error");
    } finally {
      setSavingPage(false);
    }
  };

  const handleDeletePage = async (pageId: string, pageTitle: string) => {
    const expected = `delete_${pageTitle.trim().replace(/\s+/g, "_")}`;
    setConfirmDeleteInput("");
    setConfirmDelete({
      isOpen: true,
      title: `Delete Note / Page "${pageTitle}"`,
      itemType: "page",
      itemName: pageTitle,
      expectedPhrase: expected,
      onConfirm: async () => {
        setConfirmDeleteLoading(true);
        try {
          await deleteWfePage(pageId);
          const remaining = pages.filter((p) => p.id !== pageId);
          setPages(remaining);
          setTasks(tasks.filter((t) => t.page_id !== pageId));
          if (activePageId === pageId) {
            setActivePageId("");
            window.history.replaceState(null, "", "/workspace");
          }
          setConfirmDelete(null);
          showToast(`"${pageTitle}" deleted`, "info");
        } catch (err: any) {
          showToast("Delete failed: " + err.message, "error");
        } finally {
          setConfirmDeleteLoading(false);
        }
      },
    });
  };

  // -------------------------------------------------------------
  // PERMISSION HELPER: TASK STATUS MOVE & DRAG PERMISSION
  // -------------------------------------------------------------
  const isAssigneeCurrentUser = (personName: string): boolean => {
    if (!personName) return false;
    const p = personName.trim().toLowerCase();
    const userName = (currentUser?.name || "").toLowerCase().trim();
    const userEmail = (currentUser?.email || "").toLowerCase().trim();
    const userPrefix = userEmail.includes("@") ? userEmail.split("@")[0] : "";

    return Boolean(
      (userName && p === userName) ||
      (userEmail && p === userEmail) ||
      (userPrefix && p === userPrefix) ||
      (userName && userName.split(" ").some((part) => part.length >= 2 && p.includes(part)))
    );
  };

  const formatAssigneeDisplayName = (personName: string): string => {
    if (!personName) return "";
    const p = personName.trim();
    if (!p) return "";
    if (isAssigneeCurrentUser(p)) return "Me";

    const pLower = p.toLowerCase();
    // 1. Look up in current teamspace members
    const mem = currentTeamspaceMembers.find(
      (m) => (m.email && m.email.toLowerCase() === pLower) || (m.name && m.name.toLowerCase() === pLower)
    ) || projectMembers.find(
      (m) => (m.email && m.email.toLowerCase() === pLower) || (m.name && m.name.toLowerCase() === pLower)
    );
    if (mem && mem.name && !mem.name.includes("@")) return mem.name;

    // 2. Look up in registered database users
    const reg = registeredUsers.find(
      (u) => (u.email && u.email.toLowerCase() === pLower) || (u.name && u.name.toLowerCase() === pLower)
    );
    if (reg && reg.name && !reg.name.includes("@")) return reg.name;

    // 3. If raw email string (e.g. abdurrahmanmarikan@gmail.com), convert email handle to human readable name
    if (p.includes("@")) {
      const prefix = p.split("@")[0].replace(/[._-]/g, " ");
      return prefix
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }

    return p;
  };

  const isTaskAssignedToCurrentUser = (task: WfeTask | null | undefined): boolean => {
    if (!task || !task.assigned_to) return false;
    const assigned = task.assigned_to.toLowerCase();
    const userName = (currentUser?.name || "").toLowerCase().trim();
    const userEmail = (currentUser?.email || "").toLowerCase().trim();
    const userPrefix = userEmail.includes("@") ? userEmail.split("@")[0] : "";

    const assignedNames = task.assigned_to.split(",").map((s) => s.trim().toLowerCase());

    return Boolean(
      (userName && (assigned.includes(userName) || assignedNames.includes(userName))) ||
      (userEmail && (assigned.includes(userEmail) || assignedNames.includes(userEmail))) ||
      (userPrefix && (assigned.includes(userPrefix) || assignedNames.includes(userPrefix))) ||
      (userName && userName.split(" ").some((part) => part.length >= 2 && assigned.includes(part)))
    );
  };

  const canUserMoveTask = (task: WfeTask | null | undefined): { canMove: boolean; reason?: string } => {
    if (!task) return { canMove: false, reason: "No task selected." };

    // 0. Locked cards cannot be dragged or moved by anyone (including Manager / Admin)
    if (task.is_locked === 1) {
      return {
        canMove: false,
        reason: "🔒 This card is locked. Unlock it first to move or change its status.",
      };
    }

    // 1. Project Manager / System Admin can move unlocked tasks
    if (isProjectAdmin) {
      return { canMove: true };
    }

    // 2. Viewer cannot move any tasks
    if (currentMemberRecord?.role === "Viewer") {
      return { canMove: false, reason: "⚠️ Viewers have read-only access and cannot change task status." };
    }

    // 3. Member can only move tasks assigned to them
    const isAssigned = isTaskAssignedToCurrentUser(task);
    if (isAssigned) {
      return { canMove: true };
    }

    return {
      canMove: false,
      reason: "⚠️ Only assigned members or Project Managers can change this task's status.",
    };
  };

  // -------------------------------------------------------------
  // KANBAN DRAG & DROP & REAL DATABASE PERSISTENCE
  // -------------------------------------------------------------
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const check = canUserMoveTask(task);
    if (!check.canMove) {
      e.preventDefault();
      showToast(check.reason || "You cannot move this card.", "error");
      return;
    }
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(colId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  // -------------------------------------------------------------
  // TASK ACTIVITY LOG HELPER (Appends structured log to task.logs)
  // -------------------------------------------------------------
  const appendTaskLog = (
    currentLogs: WfeTaskLog[] | undefined,
    action: string,
    remark?: string,
    photoUrl?: string
  ): WfeTaskLog[] => {
    const authorName = currentUser?.name || (currentUser?.email ? currentUser.email.split("@")[0] : "Collaborator");
    const newLog: WfeTaskLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      action,
      actionBy: authorName,
      remark: remark || "",
      timestamp: Date.now(),
      photoUrl,
    };
    return [newLog, ...(currentLogs || [])];
  };

  const handleDrop = async (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = draggedTaskId || e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const existingTask = tasks.find((t) => t.id === taskId);
    if (!existingTask) return;

    const check = canUserMoveTask(existingTask);
    if (!check.canMove) {
      showToast(check.reason || "You cannot move this card.", "error");
      return;
    }

    if (existingTask.custom_status === targetColId) return;

    // Pause silent background sync to prevent snap-back collisions
    skipSilentSyncUntilRef.current = Date.now() + 6000;

    const oldStatus = existingTask.custom_status || "To-do";
    const authorName = currentUser?.name || (currentUser?.email ? currentUser.email.split("@")[0] : "Collaborator");
    const updatedLogs = appendTaskLog(
      existingTask.logs,
      `Changed status to "${targetColId}"`,
      `Moved from "${oldStatus}" to "${targetColId}"`
    );

    const updatedTask: WfeTask = {
      ...existingTask,
      custom_status: targetColId,
      logs: updatedLogs,
      updated_at: Date.now(),
    };

    // Instant Optimistic UI Update (Immediate visual response)
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));

    // Save to live DB in background
    try {
      await saveWfeTask({
        id: existingTask.id,
        page_id: existingTask.page_id,
        teamspace_id: existingTask.teamspace_id,
        title: existingTask.title,
        custom_status: targetColId,
        priority: existingTask.priority,
        assigned_to: existingTask.assigned_to,
        tags: existingTask.tags,
        blocks: existingTask.blocks,
        attachments: existingTask.attachments,
        logs: updatedLogs,
        is_locked: existingTask.is_locked,
      });
    } catch (err: any) {
      // Rollback on network failure
      setTasks((prev) => prev.map((t) => (t.id === taskId ? existingTask : t)));
      showToast("Sync failed. Card returned to previous column.", "error");
    }
  };

  // -------------------------------------------------------------
  // QUICK ADD TASK (INLINE)
  // -------------------------------------------------------------
  const handleQuickAdd = async (statusCol: string) => {
    if (!quickAddTitle.trim()) {
      setQuickAddColumn(null);
      return;
    }

    skipSilentSyncUntilRef.current = Date.now() + 6000;

    const resolvedPage = activePage || pages[0] || null;
    const resolvedPageId = resolvedPage?.id || activePageId || "page_root";
    const tempId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const taskTitle = quickAddTitle.trim();
    
    // Immediate UI reset
    setQuickAddTitle("");
    setQuickAddColumn(null);

    const authorName = currentUser?.name || (currentUser?.email ? currentUser.email.split("@")[0] : "Collaborator");
    const initialLog: WfeTaskLog = {
      id: `log_${Date.now()}_init`,
      action: "Created card",
      actionBy: authorName,
      remark: `Created in column "${statusCol}"`,
      timestamp: Date.now(),
    };

    const newTaskObj: WfeTask = {
      id: tempId,
      page_id: resolvedPageId,
      teamspace_id: resolvedPage?.teamspace_id || currentTeamspace?.id || null,
      title: taskTitle,
      custom_status: statusCol,
      priority: "Medium",
      assigned_to: authorName,
      tags: ["General"],
      blocks: [
        { id: `b_${Date.now()}_note`, type: "paragraph", content: "" },
      ],
      attachments: [],
      logs: [initialLog],
      is_locked: 0,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    // Immediate optimistic state update
    setTasks((prev) => [newTaskObj, ...prev]);
    showToast(`Added card "${taskTitle}"`, "success");

    try {
      const res = await saveWfeTask({
        id: tempId,
        page_id: newTaskObj.page_id,
        teamspace_id: newTaskObj.teamspace_id,
        title: newTaskObj.title,
        custom_status: newTaskObj.custom_status,
        priority: newTaskObj.priority,
        assigned_to: newTaskObj.assigned_to,
        tags: newTaskObj.tags,
        blocks: newTaskObj.blocks,
        attachments: newTaskObj.attachments,
        logs: newTaskObj.logs,
        is_locked: newTaskObj.is_locked,
      });

      if (res && res.success && res.task) {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? { ...res.task, tags: newTaskObj.tags, blocks: newTaskObj.blocks, attachments: newTaskObj.attachments, logs: newTaskObj.logs } : t)));
      }
    } catch (err: any) {
      setTasks((prev) => prev.filter((t) => t.id !== tempId));
      showToast("Failed to save task to backend: " + (err.message || err), "error");
    }
  };

  // -------------------------------------------------------------
  // TASK / DOCUMENT BLOCK EDITOR SAVE
  // -------------------------------------------------------------
  const handleSaveEditingTask = async () => {
    if (!editingTask) return;

    const authorName = currentUser?.name || (currentUser?.email ? currentUser.email.split("@")[0] : "Collaborator");
    const updatedLogs = appendTaskLog(
      editingTask.logs,
      "Updated card details",
      "Edited card content & settings"
    );

    const updatedTaskWithLogs = { ...editingTask, logs: updatedLogs };
    const updated = tasks.map((t) => (t.id === editingTask.id ? updatedTaskWithLogs : t));
    setTasks(updated);

    try {
      await saveWfeTask({
        id: editingTask.id,
        page_id: editingTask.page_id,
        teamspace_id: editingTask.teamspace_id,
        title: editingTask.title,
        custom_status: editingTask.custom_status,
        priority: editingTask.priority,
        assigned_to: editingTask.assigned_to,
        due_date: editingTask.due_date || null,
        tags: editingTask.tags,
        blocks: editingTask.blocks,
        attachments: editingTask.attachments,
        logs: updatedLogs,
        is_locked: editingTask.is_locked,
      });
      showToast("Changes saved", "success");
      setEditingTask(updatedTaskWithLogs);
      initialEditingTaskRef.current = JSON.stringify(updatedTaskWithLogs);
    } catch (err: any) {
      showToast("Save failed: " + err.message, "error");
    }
  };

  // Toggle Lock/Unlock Card (Admin & Co-Admin only)
  const handleToggleLockTask = async (task: WfeTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isProjectAdmin) {
      showToast("Only Project Admin or Co-Admin can lock or unlock cards.", "error");
      return;
    }

    const nextLocked = task.is_locked ? 0 : 1;
    const authorName = currentUser?.name || (currentUser?.email ? currentUser.email.split("@")[0] : "Collaborator");
    const updatedLogs = appendTaskLog(
      task.logs,
      nextLocked ? "Locked card" : "Unlocked card",
      nextLocked ? "Protected from edits" : "Unlocked for editing"
    );

    const updatedTask = { ...task, is_locked: nextLocked, logs: updatedLogs };
    setTasks(tasks.map((t) => (t.id === task.id ? updatedTask : t)));
    if (editingTask && editingTask.id === task.id) {
      setEditingTask(updatedTask);
    }

    try {
      await saveWfeTask({
        id: task.id,
        page_id: task.page_id,
        teamspace_id: task.teamspace_id,
        title: task.title,
        custom_status: task.custom_status,
        priority: task.priority,
        assigned_to: task.assigned_to,
        tags: task.tags,
        blocks: task.blocks,
        attachments: task.attachments,
        logs: updatedLogs,
        is_locked: nextLocked,
      });
      showToast(nextLocked ? "Card locked (Admin protected)" : "Card unlocked", "info");
    } catch (err: any) {
      showToast("Lock toggle failed: " + err.message, "error");
    }
  };

  // Trigger File Upload for task
  const handleTriggerUpload = (replaceId?: string) => {
    const stage = editingTask?.custom_status || "In progress";
    setPendingUploadStage(stage);
    setReplacingFileId(replaceId || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Handle actual file upload to storage
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingTask) return;

    setUploadingStage(pendingUploadStage);
    try {
      const res = await uploadWfeFile(file, pendingUploadStage, editingTask.id);
      if (res && res.success) {
        let currentFiles = editingTask.attachments || [];
        if (replacingFileId) {
          currentFiles = currentFiles.filter((f) => f.id !== replacingFileId);
        }
        const updatedFiles = [...currentFiles, res.file];
        const authorName = currentUser?.name || (currentUser?.email ? currentUser.email.split("@")[0] : "Collaborator");
        const updatedLogs = appendTaskLog(
          editingTask.logs,
          replacingFileId ? `Updated file: ${file.name}` : `Uploaded file: ${file.name}`,
          `Stage: ${pendingUploadStage} by ${authorName}`,
          res.file.url
        );

        const updatedTask = { ...editingTask, attachments: updatedFiles, logs: updatedLogs };
        setEditingTask(updatedTask);
        initialEditingTaskRef.current = JSON.stringify(updatedTask);
        setTasks(tasks.map((t) => (t.id === editingTask.id ? updatedTask : t)));

        await saveWfeTask({
          id: updatedTask.id,
          page_id: updatedTask.page_id,
          teamspace_id: updatedTask.teamspace_id,
          title: updatedTask.title,
          custom_status: updatedTask.custom_status,
          priority: updatedTask.priority,
          assigned_to: updatedTask.assigned_to,
          tags: updatedTask.tags,
          blocks: updatedTask.blocks,
          attachments: updatedFiles,
          logs: updatedLogs,
          is_locked: updatedTask.is_locked,
        });

        showToast(`Uploaded "${file.name}"`, "success");
      }
    } catch (err: any) {
      showToast("Upload failed: " + err.message, "error");
    } finally {
      setUploadingStage(null);
      setReplacingFileId(null);
    }
  };

  // Handle File Delete from R2 & Task attachments
  const handleDeleteTaskFile = async (fileItem: WfeTaskAttachment) => {
    if (!editingTask) return;

    try {
      await deleteWfeFile(fileItem.r2Key, fileItem.url);
      const remaining = (editingTask.attachments || []).filter((f) => f.id !== fileItem.id);
      const authorName = currentUser?.name || (currentUser?.email ? currentUser.email.split("@")[0] : "Collaborator");
      const updatedLogs = appendTaskLog(
        editingTask.logs,
        `Deleted file: ${fileItem.name}`,
        `Removed attachment`
      );

      const updatedTask = { ...editingTask, attachments: remaining, logs: updatedLogs };
      setEditingTask(updatedTask);
      initialEditingTaskRef.current = JSON.stringify(updatedTask);
      setTasks(tasks.map((t) => (t.id === editingTask.id ? updatedTask : t)));

      await saveWfeTask({
        id: updatedTask.id,
        page_id: updatedTask.page_id,
        teamspace_id: updatedTask.teamspace_id,
        title: updatedTask.title,
        custom_status: updatedTask.custom_status,
        priority: updatedTask.priority,
        assigned_to: updatedTask.assigned_to,
        tags: updatedTask.tags,
        blocks: updatedTask.blocks,
        attachments: remaining,
        logs: updatedLogs,
        is_locked: updatedTask.is_locked,
      });

      showToast(`Deleted "${fileItem.name}"`, "info");
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
    }
  };

  const handleDeleteEditingTask = async () => {
    if (!editingTask) return;

    try {
      const res = await deleteWfeTask(editingTask.id, {
        user_email: currentUser?.email,
        is_owner: Boolean(isProjectOwner),
        is_admin: Boolean(isProjectAdmin),
        is_co_admin: Boolean(isProjectManager),
      });

      if (res && res.action === "marked_pending") {
        setTasks(
          tasks.map((t) =>
            t.id === editingTask.id
              ? { ...t, pending_deletion: 1, deleted_by: currentUser?.name || currentUser?.email || "Collaborator" }
              : t
          )
        );
        showToast("Task marked for deletion. Awaiting Manager approval.", "info");
      } else {
        setTasks(tasks.filter((t) => t.id !== editingTask.id));
        showToast("Task deleted", "info");
      }
    } catch (err: any) {
      showToast("Delete failed: " + err.message, "error");
    }
    initialEditingTaskRef.current = null;
    setEditingTask(null);
  };

  const handleApproveDeleteTask = async (taskId: string) => {
    if (!isProjectAdmin) return;
    try {
      await deleteWfeTask(taskId, {
        user_email: currentUser?.email,
        is_owner: true,
        is_admin: isProjectAdmin,
        is_co_admin: Boolean(isProjectManager),
      });
      setTasks(tasks.filter((t) => t.id !== taskId));
      showToast("Deletion approved and task permanently purged", "success");
    } catch (err: any) {
      showToast("Failed to delete task: " + err.message, "error");
    }
  };

  const handleRestoreTask = async (task: WfeTask) => {
    try {
      const updated = { ...task, pending_deletion: 0, deleted_by: null };
      await saveWfeTask({
        id: task.id,
        page_id: task.page_id,
        teamspace_id: task.teamspace_id,
        title: task.title,
        custom_status: task.custom_status,
        priority: task.priority,
        assigned_to: task.assigned_to,
        pending_deletion: 0,
        deleted_by: null,
      });
      setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
      showToast("Task restored", "success");
    } catch (err: any) {
      showToast("Restore failed: " + err.message, "error");
    }
  };

  // Block Editing
  const handleBlockChange = (blockId: string, newContent: string) => {
    if (!editingTask) return;
    const updatedBlocks = (editingTask.blocks || []).map((b) => (b.id === blockId ? { ...b, content: newContent } : b));
    setEditingTask({ ...editingTask, blocks: updatedBlocks });
  };

  const handleToggleTodo = (blockId: string) => {
    if (!editingTask) return;
    const updatedBlocks = (editingTask.blocks || []).map((b) => (b.id === blockId ? { ...b, checked: !b.checked } : b));
    setEditingTask({ ...editingTask, blocks: updatedBlocks });
  };

  const handleAddBlock = (type: WfeBlock["type"]) => {
    if (!editingTask) return;
    const newBlock: WfeBlock = {
      id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      content: "",
      checked: false,
    };
    setEditingTask({ ...editingTask, blocks: [...(editingTask.blocks || []), newBlock] });
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!editingTask) return;
    const updatedBlocks = (editingTask.blocks || []).filter((b) => b.id !== blockId);
    setEditingTask({ ...editingTask, blocks: updatedBlocks });
  };

  // -------------------------------------------------------------
  // DOCUMENT NOTES (activePage.type === "doc") MANUAL SAVE & UNDO / REDO
  // -------------------------------------------------------------
  const [docSaving, setDocSaving] = useState(false);
  const [hasUnsavedDocChanges, setHasUnsavedDocChanges] = useState(false);
  const docHistoryRef = useRef<Array<{ title: string; icon: string; content_blocks: WfeBlock[] }>>([]);
  const docHistoryIndexRef = useRef<number>(-1);
  const lastDocPageIdRef = useRef<string>("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveDocDraft = (page: WfePage) => {
    if (typeof window !== "undefined" && page?.id) {
      try {
        localStorage.setItem(
          `ib_doc_draft_${page.id}`,
          JSON.stringify({
            title: page.title,
            icon: page.icon,
            content_blocks: page.content_blocks || [],
            updated_at: Date.now(),
          })
        );
      } catch {}
    }
  };

  const clearDocDraft = (pageId: string) => {
    if (typeof window !== "undefined" && pageId) {
      try {
        localStorage.removeItem(`ib_doc_draft_${pageId}`);
      } catch {}
    }
  };

  // Initialize history when document page changes
  useEffect(() => {
    if (activePage && activePage.type === "doc") {
      if (lastDocPageIdRef.current !== activePage.id) {
        lastDocPageIdRef.current = activePage.id;
        const initialBlocks: WfeBlock[] = safeParseArray<WfeBlock>(activePage.content_blocks);
        docHistoryRef.current = [
          {
            title: activePage.title || "",
            icon: activePage.icon || "📄",
            content_blocks: JSON.parse(JSON.stringify(initialBlocks)),
          },
        ];
        docHistoryIndexRef.current = 0;
        setCanUndo(false);
        setCanRedo(false);
        const hasExistingDraft = typeof window !== "undefined" && !!localStorage.getItem(`ib_doc_draft_${activePage.id}`);
        setHasUnsavedDocChanges(hasExistingDraft);
      }
    }
  }, [activePageId, activePage?.id, activePage?.type]);

  const pushDocHistory = (updatedPage: WfePage) => {
    const blocks: WfeBlock[] = safeParseArray<WfeBlock>(updatedPage.content_blocks);
    const newSnapshot = {
      title: updatedPage.title || "",
      icon: updatedPage.icon || "📄",
      content_blocks: JSON.parse(JSON.stringify(blocks)),
    };
    const currentHist = docHistoryRef.current.slice(0, docHistoryIndexRef.current + 1);
    currentHist.push(newSnapshot);
    if (currentHist.length > 50) currentHist.shift();
    docHistoryRef.current = currentHist;
    docHistoryIndexRef.current = currentHist.length - 1;
    setCanUndo(docHistoryIndexRef.current > 0);
    setCanRedo(false);
    setHasUnsavedDocChanges(true);
    saveDocDraft(updatedPage);
  };

  const handleDocUndo = () => {
    if (!activePage || docHistoryIndexRef.current <= 0) return;
    docHistoryIndexRef.current -= 1;
    const snapshot = docHistoryRef.current[docHistoryIndexRef.current];
    if (snapshot) {
      const updatedPage: WfePage = {
        ...activePage,
        title: snapshot.title,
        icon: snapshot.icon,
        content_blocks: JSON.parse(JSON.stringify(snapshot.content_blocks)),
      };
      setPages((prev) => prev.map((p) => (p.id === activePage.id ? updatedPage : p)));
      setCanUndo(docHistoryIndexRef.current > 0);
      setCanRedo(true);
      setHasUnsavedDocChanges(true);
      saveDocDraft(updatedPage);
      showToast("Undo", "info");
    }
  };

  const handleDocRedo = () => {
    if (!activePage || docHistoryIndexRef.current >= docHistoryRef.current.length - 1) return;
    docHistoryIndexRef.current += 1;
    const snapshot = docHistoryRef.current[docHistoryIndexRef.current];
    if (snapshot) {
      const updatedPage: WfePage = {
        ...activePage,
        title: snapshot.title,
        icon: snapshot.icon,
        content_blocks: JSON.parse(JSON.stringify(snapshot.content_blocks)),
      };
      setPages((prev) => prev.map((p) => (p.id === activePage.id ? updatedPage : p)));
      setCanUndo(true);
      setCanRedo(docHistoryIndexRef.current < docHistoryRef.current.length - 1);
      setHasUnsavedDocChanges(true);
      saveDocDraft(updatedPage);
      showToast("Redo", "info");
    }
  };

  const handleSaveDoc = async () => {
    if (!activePage) return;
    try {
      setDocSaving(true);
      await saveWfePage({
        id: activePage.id,
        teamspace_id: activePage.teamspace_id,
        title: activePage.title,
        icon: activePage.icon,
        type: activePage.type,
        content_blocks: activePage.content_blocks || [],
        attachments: activePage.attachments || [],
        is_private: activePage.is_private,
      });
      clearDocDraft(activePage.id);
      setHasUnsavedDocChanges(false);
      showToast("Document saved successfully!", "success");
    } catch (err: any) {
      showToast("Failed to save document: " + err.message, "error");
    } finally {
      setDocSaving(false);
    }
  };

  const handleDocTitleChange = (newTitle: string) => {
    if (!activePage) return;
    const updatedPage: WfePage = { ...activePage, title: newTitle };
    setPages((prev) => prev.map((p) => (p.id === activePage.id ? updatedPage : p)));
    setHasUnsavedDocChanges(true);
    saveDocDraft(updatedPage);
  };

  const handleDocTitleBlur = () => {
    if (activePage) pushDocHistory(activePage);
  };

  const handleDocIconChange = (newIcon: string) => {
    if (!activePage) return;
    const updatedPage: WfePage = { ...activePage, icon: newIcon };
    setPages((prev) => prev.map((p) => (p.id === activePage.id ? updatedPage : p)));
    pushDocHistory(updatedPage);
  };

  const [uploadingDocReferral, setUploadingDocReferral] = useState(false);

  const handleUploadDocReferral = async (file: File) => {
    if (!file || !activePage) return;
    try {
      setUploadingDocReferral(true);
      showToast(`Uploading "${file.name}"...`, "info");
      const res = await uploadWfeFile(file, "doc_attachments", activePage.id);
      if (res && res.file && res.file.url) {
        const currentAtts: WfeTaskAttachment[] = safeParseArray<WfeTaskAttachment>(activePage.attachments);
        const newAttachment: WfeTaskAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type || "application/octet-stream",
          url: res.file.url,
          r2Key: res.file.r2Key || (res.file as any).r2_key,
          uploaded_at: Date.now(),
          uploaded_by: currentUser?.name || currentUser?.email || "User",
        };
        const updatedPage: WfePage = {
          ...activePage,
          attachments: [newAttachment, ...currentAtts],
        };
        setPages((prev) => prev.map((p) => (p.id === activePage.id ? updatedPage : p)));
        await saveWfePage({
          id: updatedPage.id,
          teamspace_id: updatedPage.teamspace_id,
          title: updatedPage.title,
          icon: updatedPage.icon,
          type: updatedPage.type,
          content_blocks: updatedPage.content_blocks || [],
          attachments: updatedPage.attachments || [],
          is_private: updatedPage.is_private,
        });
        showToast(`Referral document "${file.name}" attached!`, "success");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to upload file", "error");
    } finally {
      setUploadingDocReferral(false);
    }
  };

  const handleDeleteDocReferral = async (att: WfeTaskAttachment) => {
    if (!activePage) return;
    try {
      if (att.r2Key || att.url) {
        await deleteWfeFile(att.r2Key || "", att.url);
      }
      const currentAtts: WfeTaskAttachment[] = safeParseArray<WfeTaskAttachment>(activePage.attachments);
      const updatedAtts = currentAtts.filter((a) => a.id !== att.id);
      const updatedPage: WfePage = { ...activePage, attachments: updatedAtts };
      setPages((prev) => prev.map((p) => (p.id === activePage.id ? updatedPage : p)));
      await saveWfePage({
        id: updatedPage.id,
        teamspace_id: updatedPage.teamspace_id,
        title: updatedPage.title,
        icon: updatedPage.icon,
        type: updatedPage.type,
        content_blocks: updatedPage.content_blocks || [],
        attachments: updatedPage.attachments || [],
        is_private: updatedPage.is_private,
      });
      showToast(`Removed "${att.name}"`, "info");
    } catch (err: any) {
      showToast(err.message || "Failed to delete file", "error");
    }
  };

  const handleDocBlockChange = (blockId: string, content: string) => {
    if (!activePage) return;
    const currentBlocks: WfeBlock[] = activePage.content_blocks || [];
    const updatedBlocks = currentBlocks.map((b) => (b.id === blockId ? { ...b, content } : b));
    const updatedPage: WfePage = { ...activePage, content_blocks: updatedBlocks };
    setPages((prev) => prev.map((p) => (p.id === activePage.id ? updatedPage : p)));
    setHasUnsavedDocChanges(true);
    saveDocDraft(updatedPage);
  };

  const handleDocBlockBlur = () => {
    if (activePage) pushDocHistory(activePage);
  };

  const handleDocBlockTypeChange = (blockId: string, newType: WfeBlock["type"]) => {
    if (!activePage) return;
    const currentBlocks: WfeBlock[] = activePage.content_blocks || [];
    const updatedBlocks = currentBlocks.map((b) => (b.id === blockId ? { ...b, type: newType } : b));
    const updatedPage: WfePage = { ...activePage, content_blocks: updatedBlocks };
    setPages((prev) => prev.map((p) => (p.id === activePage.id ? updatedPage : p)));
    pushDocHistory(updatedPage);
  };

  const handleDocToggleTodo = (blockId: string) => {
    if (!activePage) return;
    const currentBlocks: WfeBlock[] = activePage.content_blocks || [];
    const updatedBlocks = currentBlocks.map((b) => (b.id === blockId ? { ...b, checked: !b.checked } : b));
    const updatedPage: WfePage = { ...activePage, content_blocks: updatedBlocks };
    setPages((prev) => prev.map((p) => (p.id === activePage.id ? updatedPage : p)));
    pushDocHistory(updatedPage);
  };

  const handleDocAddBlock = (type: WfeBlock["type"], afterBlockId?: string) => {
    if (!activePage) return;
    const currentBlocks: WfeBlock[] = activePage.content_blocks || [];
    const newBlockId = `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newBlock: WfeBlock = {
      id: newBlockId,
      type,
      content: "",
      checked: false,
    };

    let updatedBlocks: WfeBlock[] = [];
    if (afterBlockId) {
      const idx = currentBlocks.findIndex((b) => b.id === afterBlockId);
      if (idx !== -1) {
        updatedBlocks = [
          ...currentBlocks.slice(0, idx + 1),
          newBlock,
          ...currentBlocks.slice(idx + 1),
        ];
      } else {
        updatedBlocks = [...currentBlocks, newBlock];
      }
    } else {
      updatedBlocks = [...currentBlocks, newBlock];
    }

    const updatedPage: WfePage = { ...activePage, content_blocks: updatedBlocks };
    setPages((prev) => prev.map((p) => (p.id === activePage.id ? updatedPage : p)));
    pushDocHistory(updatedPage);

    // Auto-focus the newly created block element
    if (typeof window !== "undefined") {
      setTimeout(() => {
        const el = document.getElementById(`doc-block-${newBlockId}`);
        if (el) {
          el.focus();
        }
      }, 50);
    }
  };

  const handleDocDeleteBlock = (blockId: string) => {
    if (!activePage) return;
    const currentBlocks: WfeBlock[] = activePage.content_blocks || [];
    const updatedBlocks = currentBlocks.filter((b) => b.id !== blockId);
    const updatedPage: WfePage = { ...activePage, content_blocks: updatedBlocks };
    setPages((prev) => prev.map((p) => (p.id === activePage.id ? updatedPage : p)));
    pushDocHistory(updatedPage);
  };

  const handleDocMoveBlock = (blockId: string, direction: "up" | "down") => {
    if (!activePage) return;
    const currentBlocks: WfeBlock[] = [...(activePage.content_blocks || [])];
    const idx = currentBlocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    if (direction === "up" && idx > 0) {
      const temp = currentBlocks[idx - 1];
      currentBlocks[idx - 1] = currentBlocks[idx];
      currentBlocks[idx] = temp;
    } else if (direction === "down" && idx < currentBlocks.length - 1) {
      const temp = currentBlocks[idx + 1];
      currentBlocks[idx + 1] = currentBlocks[idx];
      currentBlocks[idx] = temp;
    }
    const updatedPage: WfePage = { ...activePage, content_blocks: currentBlocks };
    setPages((prev) => prev.map((p) => (p.id === activePage.id ? updatedPage : p)));
    pushDocHistory(updatedPage);
  };

  const handleDownloadDocPdf = async () => {
    if (!activePage) return;
    try {
      showToast("Generating PDF...", "info");
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
          return true;
        }
        return false;
      };

      // 1. Header Banner & Branding
      doc.setFillColor(11, 87, 208); // #0B57D0 Google Blue
      doc.rect(margin, y, contentWidth, 1.5, "F");
      y += 6;

      // Icon & Type
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(11, 87, 208);
      doc.text("DOCUMENT NOTES", margin, y);
      y += 7;

      // Document Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42); // slate-900
      const titleLines = doc.splitTextToSize(activePage.title || "Untitled Document", contentWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 8 + 2;

      // Metadata line
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      const dateStr = new Date(activePage.created_at || Date.now()).toLocaleDateString("en-SG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const metaText = `Project: ${currentTeamspace?.name || "Workspace"}   |   Author: ${creatorName}   |   Date: ${dateStr}`;
      doc.text(metaText, margin, y);
      y += 5;

      // Divider line
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + contentWidth, y);
      y += 8;

      // 2. Render Blocks
      const blocks: WfeBlock[] = activePage.content_blocks || [];
      if (blocks.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text("This document has no content.", margin, y);
      }

      for (const block of blocks) {
        const text = (block.content || "").trim();
        if (!text && block.type !== "todo") continue;

        if (block.type === "h1") {
          checkPageBreak(16);
          y += 3;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.setTextColor(15, 23, 42);
          const lines = doc.splitTextToSize(text, contentWidth);
          doc.text(lines, margin, y);
          y += lines.length * 6 + 1;
          doc.setDrawColor(226, 232, 240);
          doc.line(margin, y, margin + contentWidth, y);
          y += 5;
        } else if (block.type === "h2") {
          checkPageBreak(12);
          y += 2;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.setTextColor(24, 24, 27);
          const lines = doc.splitTextToSize(text, contentWidth);
          doc.text(lines, margin, y);
          y += lines.length * 5.5 + 4;
        } else if (block.type === "h3") {
          checkPageBreak(10);
          y += 1;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10.5);
          doc.setTextColor(39, 39, 42);
          const lines = doc.splitTextToSize(text, contentWidth);
          doc.text(lines, margin, y);
          y += lines.length * 5 + 3;
        } else if (block.type === "todo") {
          checkPageBreak(8);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          
          // Draw checkbox
          const boxSize = 3.5;
          doc.setDrawColor(block.checked ? 11 : 161, block.checked ? 87 : 161, block.checked ? 208 : 170);
          doc.setLineWidth(0.3);
          doc.roundedRect(margin, y - 2.8, boxSize, boxSize, 0.5, 0.5);
          if (block.checked) {
            doc.setFillColor(11, 87, 208);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(11, 87, 208);
            doc.text("v", margin + 0.9, y - 0.5);
          }

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(block.checked ? 161 : 39, block.checked ? 161 : 39, block.checked ? 170 : 42);
          const lines = doc.splitTextToSize(text || "To-do item", contentWidth - 8);
          doc.text(lines, margin + 6, y);
          if (block.checked && lines.length > 0) {
            const textW = Math.min(doc.getTextWidth(lines[0]), contentWidth - 8);
            doc.setDrawColor(161, 161, 170);
            doc.line(margin + 6, y - 1, margin + 6 + textW, y - 1);
          }
          y += lines.length * 5 + 2;
        } else if (block.type === "bullet") {
          checkPageBreak(8);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(113, 113, 122);
          doc.text("-", margin + 1, y);

          doc.setTextColor(39, 39, 42);
          const lines = doc.splitTextToSize(text, contentWidth - 6);
          doc.text(lines, margin + 5, y);
          y += lines.length * 5 + 2;
        } else if (block.type === "quote") {
          const lines = doc.splitTextToSize(text, contentWidth - 10);
          const blockH = lines.length * 5 + 4;
          checkPageBreak(blockH + 4);

          // Quote background & bar
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 3, contentWidth, blockH, "F");
          doc.setFillColor(11, 87, 208);
          doc.rect(margin, y - 3, 1.2, blockH, "F");

          doc.setFont("helvetica", "italic");
          doc.setFontSize(9.5);
          doc.setTextColor(71, 85, 105);
          doc.text(lines, margin + 5, y + 1);
          y += blockH + 3;
        } else if (block.type === "callout") {
          const lines = doc.splitTextToSize(text, contentWidth - 14);
          const blockH = lines.length * 5 + 6;
          checkPageBreak(blockH + 4);

          // Callout background
          doc.setFillColor(240, 244, 249);
          doc.setDrawColor(211, 227, 253);
          doc.roundedRect(margin, y - 3, contentWidth, blockH, 1.5, 1.5, "FD");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(30, 58, 138);
          doc.text("NOTE:", margin + 3, y + 1);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(30, 58, 138);
          doc.text(lines, margin + 16, y + 1);
          y += blockH + 3;
        } else {
          // Paragraph (default)
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(39, 39, 42);
          const lines = doc.splitTextToSize(text, contentWidth);
          checkPageBreak(lines.length * 5 + 2);
          doc.text(lines, margin, y);
          y += lines.length * 5 + 3;
        }
      }

      // Referral documents section if present
      const docAttachments: WfeTaskAttachment[] = safeParseArray<WfeTaskAttachment>(activePage.attachments);
      if (docAttachments.length > 0) {
        checkPageBreak(15);
        y += 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text("Referral Documents:", margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        for (const att of docAttachments) {
          checkPageBreak(6);
          doc.setTextColor(11, 87, 208);
          doc.text(`* ${att.name} (${att.size || "File"}) - ${att.url || ""}`, margin + 3, y);
          y += 5;
        }
      }

      // 3. Footer page numbering
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${i} of ${totalPages}  |  iB Workspace`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      // 4. Output as Blob and open in new tab
      const pdfBlob = doc.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, "_blank");
      showToast("PDF generated and opened", "success");
    } catch (err: any) {
      showToast("Failed to generate PDF: " + (err.message || err), "error");
    }
  };

  // Document Notes Keyboard Shortcuts (Ctrl+S to Save, Ctrl+Z to Undo, Ctrl+Y to Redo)
  useEffect(() => {
    const handleDocShortcuts = (e: KeyboardEvent) => {
      if (activePage?.type === "doc") {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          handleSaveDoc();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
          e.preventDefault();
          handleDocRedo();
        } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") {
          e.preventDefault();
          handleDocRedo();
        }
      }
    };
    window.addEventListener("keydown", handleDocShortcuts);
    return () => window.removeEventListener("keydown", handleDocShortcuts);
  }, [activePage, handleSaveDoc, handleDocRedo]);

  // -------------------------------------------------------------
  // FILTERED & SORTED TASKS (Nearest due date at the top)
  // -------------------------------------------------------------
  const filteredTasks = tasks
    .filter((t) => {
      if (activePageId && t.page_id && t.page_id !== activePageId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!t.title.toLowerCase().includes(q)) return false;
      }
      if (activeTab === "my") {
        const assigned = (t.assigned_to || "").toLowerCase();
        if (!assigned) return false;
        const userName = (currentUser?.name || "").toLowerCase().trim();
        const userEmail = (currentUser?.email || "").toLowerCase().trim();
        const userPrefix = userEmail.includes("@") ? userEmail.split("@")[0] : "";
        
        const isAssigned =
          (userName && assigned.includes(userName)) ||
          (userEmail && assigned.includes(userEmail)) ||
          (userPrefix && assigned.includes(userPrefix)) ||
          (userName && userName.split(" ").some((part) => part.length >= 2 && assigned.includes(part)));

        return Boolean(isAssigned);
      }
      if (activeTab === "sprint") {
        // Current Sprint: Active items currently being worked on (In Progress, In Review, or Urgent/High priority not yet complete)
        const isActiveStatus = t.custom_status === "In progress" || t.custom_status === "In review";
        const isHighPriorityTodo = t.custom_status === "To-do" && (t.priority === "Urgent" || t.priority === "High");
        return isActiveStatus || isHighPriorityTodo;
      }
      return true;
    })
    .sort((a, b) => {
      const aDue = a.due_date ? Number(a.due_date) : Infinity;
      const bDue = b.due_date ? Number(b.due_date) : Infinity;

      // 1. Both have due dates -> earliest / nearest due date comes first
      if (aDue !== bDue) {
        return aDue - bDue;
      }

      // 2. Fallback: Newer created tasks first
      return (b.created_at || 0) - (a.created_at || 0);
    });

  const activeTeamspaces = teamspaces.filter((ts) => ts.is_archived !== 1);
  const archivedTeamspaces = teamspaces.filter((ts) => ts.is_archived === 1);

  const visibleTeamspaces = isGuest && targetWorkspaceId && targetWorkspaceId !== "wfe_root"
    ? activeTeamspaces.filter((ts) => ts.id === targetWorkspaceId)
    : activeTeamspaces;

  const publicPages = pages.filter((p) => !p.is_private);
  const privatePages = isGuest ? [] : pages.filter((p) => p.is_private === 1);

  // -------------------------------------------------------------
  // GUEST INVALID / MISSING LINK SCREEN (Direct visit to /workspace without valid project param)
  // -------------------------------------------------------------
  if (accessDenied && !currentUser?.email) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F8F9FA] p-6 font-primary select-none">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
          <div className="flex justify-center">
            <img
              src="/favicon.ico"
              alt="HSG Global"
              className="w-12 h-12 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <div className="space-y-2.5">
            <h1 className="text-lg font-bold text-zinc-950">Invalid or Missing Workspace Link</h1>
            <p className="text-xs text-zinc-600 leading-relaxed max-w-sm mx-auto">
              Please check your URL link or sign in with your authorized iB account to access your workspace.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-zinc-500 space-y-1">
              <span className="font-semibold text-zinc-700 block">Next Steps:</span>
              <p className="text-[11px] leading-relaxed">
                • If you have an iB account, sign in below to open your workspace.<br />
                • If you are an external collaborator, use the project invitation link from your Project Manager.
              </p>
            </div>
          </div>

          {/* Direct Sign-In & Dashboard Actions */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full h-10 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              Sign In with Google Account
            </button>

            <button
              type="button"
              onClick={() => { window.location.href = "/"; }}
              className="w-full h-10 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-semibold border border-slate-200 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4 text-zinc-500" />
              Return to Main Dashboard
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100">
            {!showCodeInput ? (
              <button
                type="button"
                onClick={() => setShowCodeInput(true)}
                className="text-xs font-semibold text-[#0B57D0] hover:text-[#0842A0] transition-colors cursor-pointer"
              >
                Have a Project Code or Link?
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  let code = customProjectInput.trim();
                  if (code.includes("project=")) {
                    try {
                      const parsed = new URL(code);
                      code = parsed.searchParams.get("project") || code;
                    } catch {
                      const match = code.match(/project=([^&]+)/);
                      if (match) code = match[1];
                    }
                  }
                  if (code) {
                    window.location.href = "/workspace?project=" + encodeURIComponent(code);
                  }
                }}
                className="space-y-2 pt-2 border-t border-slate-100"
              >
                <input
                  type="text"
                  placeholder="Paste project ID or link here"
                  value={customProjectInput}
                  onChange={(e) => setCustomProjectInput(e.target.value)}
                  className="w-full h-10 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="w-full h-10 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  Continue to Workspace
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-white text-[#37352F] font-sans antialiased overflow-hidden select-none">
      {/* ========================================================= */}
      {/* 1. LEFT NOTION NAVIGATION SIDEBAR (100% FUNCTIONAL)       */}
      {/* ========================================================= */}
      <aside className="w-64 flex-shrink-0 bg-[#FBFBFC] border-r border-slate-200/90 flex flex-col justify-between select-none font-primary shadow-[inset_-1px_0_0_rgba(0,0,0,0.02)]">
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          {/* Back to iB Console Button (Hidden for Guests) */}
          {/* Back to iB Console Button (Hidden for Guests) */}
          {!isGuest && (
            <div className="px-2.5 pt-2 pb-1 bg-white/40 shrink-0 border-b border-slate-100">
              <a
                href="/"
                className="w-full flex items-center gap-1.5 px-2 py-1.2 rounded-md text-[11px] font-medium text-zinc-600 hover:text-[#0B57D0] hover:bg-blue-50/60 border border-slate-200/70 hover:border-blue-200 transition-all group cursor-pointer"
                title="Back to iB - HSG Global Internal Bridge"
              >
                <ArrowLeft className="w-3 h-3 text-zinc-400 group-hover:text-[#0B57D0] transition-colors shrink-0" />
                <span>Back to iB</span>
              </a>
            </div>
          )}

          {/* Workspace Switcher */}
          <div className="px-3 py-2 border-b border-slate-200/70 flex items-center justify-between group transition-colors bg-white/50">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/favicon.ico"
                alt="HSG Global"
                className="w-5 h-5 object-contain shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <div className="truncate min-w-0">
                <div className="text-[11.5px] font-semibold text-zinc-900 truncate tracking-tight leading-tight">HSG Global Workspace</div>
                <div className="text-[10px] text-zinc-400 truncate leading-tight mt-0.5">
                  {isGuest ? "Guest Access" : "Internal Bridge"}
                </div>
              </div>
            </div>
          </div>

          {/* Search & Action Bar */}
          <div className="p-2 border-b border-slate-200/70 space-y-1">
            <button
              onClick={() => {
                setShowSearchModal(true);
                setGlobalSearchInput("");
              }}
              className="w-full flex items-center justify-between px-2 py-1.2 rounded-md text-[11px] text-zinc-500 bg-white border border-slate-200/80 hover:border-blue-300 hover:text-zinc-900 transition-all text-left cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Search className="w-3 h-3 text-zinc-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate font-normal">Search / Quick Find</span>
              </div>
              <kbd className="text-[9px] bg-zinc-50 border border-slate-200 px-1 py-0.2 rounded text-zinc-400 font-mono">Ctrl+K</kbd>
            </button>

            {/* Archive Folder under Search button */}
            {!isGuest && (
              <button
                onClick={() => setShowArchiveModal(true)}
                className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-zinc-500 hover:text-zinc-900 hover:bg-slate-100/70 transition-colors text-left cursor-pointer font-normal"
              >
                <Archive className="w-3 h-3 text-zinc-400 shrink-0" />
                <span>Archive Folder</span>
              </button>
            )}
          </div>

          {/* TEAMSPACES / PROJECTS SECTION (100% INTERACTIVE) */}
          <div className="px-2.5 pt-2.5">
            <div className="flex items-center justify-between text-[10px] font-medium tracking-wider uppercase text-zinc-400 px-1 mb-1">
              <span>{isGuest ? "Shared Project" : `Projects (${activeTeamspaces.length})`}</span>
              {!isGuest && (
                <button
                  onClick={() => setShowNewTeamspaceModal(true)}
                  title="Create New Teamspace"
                  className="p-0.5 rounded hover:bg-slate-200/60 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="space-y-0.5 mt-0.5">
              {visibleTeamspaces.map((ts) => {
                const tsPages = publicPages.filter((p) => p.teamspace_id === ts.id);
                return (
                  <div key={ts.id} className="space-y-0.5 group/ts">
                    {/* Teamspace Header Row */}
                    <div className={`flex items-center justify-between py-1 px-1.5 rounded-md hover:bg-slate-100/70 cursor-pointer text-[11.5px] font-medium group/tsrow transition-colors ${
                      ts.is_archived === 1 ? "opacity-60 text-zinc-400 italic" : "text-zinc-700 hover:text-zinc-950"
                    }`}>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs shrink-0">{ts.icon || "📁"}</span>
                        <span className="truncate">{ts.name}</span>
                        {ts.is_archived === 1 && (
                          <span className="text-[8.5px] not-italic font-semibold px-1 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded shrink-0">
                            Archived
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/ts:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditTeamspaceModal(ts);
                          }}
                          title={`Settings & Edit ${ts.name}`}
                          className="p-0.5 hover:bg-white rounded text-zinc-400 hover:text-zinc-800 shadow-2xs transition-colors"
                        >
                          <Pencil className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNewPageModal(ts.id, false);
                          }}
                          title={`Add page to ${ts.name}`}
                          className="p-0.5 hover:bg-white rounded text-zinc-400 hover:text-zinc-800 shadow-2xs transition-colors"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Pages inside this Teamspace */}
                    <div className="pl-2.5 space-y-0.5 border-l border-slate-200/70 ml-2.5 my-0.5">
                      {tsPages.map((p) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between py-1 px-2 rounded-md text-[11px] transition-all group/p cursor-pointer ${
                            activePageId === p.id
                              ? "bg-blue-50/90 text-[#0B57D0] font-semibold border border-blue-200/80 shadow-2xs"
                              : "text-zinc-600 hover:text-zinc-950 hover:bg-slate-100/60 font-normal"
                          }`}
                          onClick={() => handleSelectPage(p.id)}
                        >
                          <div className="flex items-center gap-1.5 truncate min-w-0">
                            <span className="text-[11px] shrink-0">{p.icon || "📄"}</span>
                            <span className="truncate">{p.title}</span>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover/p:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditPageModal(p);
                              }}
                              title="Edit"
                              className="p-0.5 text-zinc-400 hover:text-zinc-700 hover:bg-white rounded transition-colors"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isProjectAdmin) {
                                  showToast("Only Project Managers or Admins can delete pages.", "error");
                                  return;
                                }
                                handleDeletePage(p.id, p.title);
                              }}
                              disabled={!isProjectAdmin}
                              title={!isProjectAdmin ? "Only Project Managers can delete pages" : "Delete"}
                              className={`p-0.5 rounded ${
                                !isProjectAdmin
                                  ? "opacity-30 cursor-not-allowed text-zinc-300"
                                  : "text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              }`}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {tsPages.length === 0 && (
                        <button
                          onClick={() => handleOpenNewPageModal(ts.id, false)}
                          className="text-[10.5px] text-zinc-400 hover:text-[#0B57D0] py-0.5 px-1.5 flex items-center gap-1 cursor-pointer font-normal hover:bg-blue-50/40 rounded transition-colors"
                        >
                          <Plus className="w-2.5 h-2.5" /> <span>Add note / doc</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PRIVATE SECTION (100% INTERACTIVE) */}
          <div className="px-2.5 pt-3 pb-2">
            <div className="flex items-center justify-between text-[10px] font-medium tracking-wider uppercase text-zinc-400 px-1 mb-1">
              <span>Private ({privatePages.length})</span>
              <button
                onClick={() => handleOpenNewPageModal(null, true)}
                title="Create Private Note"
                className="p-0.5 rounded hover:bg-slate-200/60 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-0.5">
              {privatePages.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between py-1 px-2 rounded-md text-[11px] transition-all group/priv cursor-pointer ${
                    activePageId === p.id
                      ? "bg-purple-50/80 text-purple-900 font-semibold border border-purple-200/80 shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-950 hover:bg-slate-100/60 font-normal"
                  }`}
                  onClick={() => handleSelectPage(p.id)}
                >
                  <div className="flex items-center gap-1.5 truncate min-w-0">
                    <span className="text-[11px] shrink-0">{p.icon || "👤"}</span>
                    <span className="truncate">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover/priv:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditPageModal(p);
                      }}
                      title="Edit"
                      className="p-0.5 text-zinc-400 hover:text-zinc-700 hover:bg-white rounded transition-colors"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePage(p.id, p.title);
                      }}
                      title="Delete"
                      className="p-0.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}

              {privatePages.length === 0 && (
                <button
                  onClick={() => handleOpenNewPageModal(null, true)}
                  className="w-full text-left text-[10.5px] text-zinc-400 hover:text-zinc-700 py-1 px-2 flex items-center gap-1 cursor-pointer font-normal hover:bg-slate-100/60 rounded-md transition-colors"
                >
                  <Plus className="w-2.5 h-2.5" /> <span>Add private note</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Connect AI Button in Sidebar */}
        {!isGuest && (
          <div className="px-3 py-2 border-t border-slate-200/80 bg-white/40">
            <button
              onClick={handleOpenAiBridgeModal}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0B57D0] bg-blue-50/80 hover:bg-blue-100 hover:text-[#0842A0] border border-blue-200/90 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            >
              <Bot className="w-3.5 h-3.5 text-[#0B57D0]" />
              <span>Connect AI</span>
            </button>
          </div>
        )}

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-zinc-600">
          <div className="flex items-center gap-2.5 truncate min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#0B57D0] text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : "U"}
            </div>
            <div className="truncate min-w-0">
              <div className="truncate font-bold text-zinc-900 leading-tight">{currentUser?.name || "Collaborator"}</div>
              <div className="truncate text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">{currentUser?.email || ""}</div>
            </div>
          </div>
          {isGuest ? (
            <button
              type="button"
              onClick={() => {
                if (targetWorkspaceId) {
                  localStorage.removeItem(`wfe_guest_session_${targetWorkspaceId}`);
                }
                setCurrentUser(null);
                setIsGuest(false);
                setShowGateModal(true);
                showToast("Logged out of guest workspace", "info");
              }}
              title="Log Out of Project"
              className="p-1.5 rounded-lg hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors shrink-0 ml-1 cursor-pointer border border-transparent hover:border-rose-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (window.location.href = "/")}
              title="Back to iB HSG Global Console"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-zinc-400 hover:text-zinc-800 transition-colors shrink-0 ml-1 cursor-pointer border border-transparent hover:border-slate-200"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN WORKSPACE CANVAS (100% NOTION LAYOUT)              */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20 text-zinc-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-xs font-semibold">Loading live workspace database...</span>
          </div>
        ) : !activePageId || !activePage ? (
          /* PERSONALIZED WELCOME SCREEN */
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 max-w-3xl mx-auto text-center">
            <div className="space-y-2 mb-8">
              <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
                Welcome, {currentUser?.name || "Collaborator"}
              </h1>
              {activeTeamspaces.length === 0 && pages.length === 0 ? (
                <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                  There are currently no active projects in this workspace. Create your first project or private page to get started.
                </p>
              ) : (
                <p className="text-sm text-zinc-500 max-w-lg mx-auto leading-relaxed">
                  Select a project or page from the left sidebar to start working, or choose a board below.
                </p>
              )}
            </div>

            {activeTeamspaces.length === 0 && pages.length === 0 ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOpenCreateTeamspaceModal()}
                  className="px-5 py-2.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Create First Project</span>
                </button>
                <button
                  onClick={() => handleOpenNewPageModal(null, true)}
                  className="px-5 py-2.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Private Page</span>
                </button>
              </div>
            ) : (
              <div className="w-full space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-left">
                  {activeTeamspaces.map((ts) => {
                    const tsPages = pages.filter((p) => p.teamspace_id === ts.id);
                    const firstPage = tsPages[0];
                    return (
                      <div
                        key={ts.id}
                        onClick={() => {
                          if (firstPage) {
                            handleSelectPage(firstPage.id);
                          } else {
                            handleOpenNewPageModal(ts.id, false);
                          }
                        }}
                        className="group p-4 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs rounded-xl cursor-pointer transition-all flex flex-col justify-between min-h-[110px]"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xl">{ts.icon || "📁"}</span>
                            <span className="text-[10px] font-semibold text-zinc-400 group-hover:text-blue-600 transition-colors">
                              {tsPages.length} {tsPages.length === 1 ? "page" : "pages"}
                            </span>
                          </div>
                          <div className="font-bold text-sm text-zinc-900 mt-2 truncate group-hover:text-[#0B57D0] transition-colors">
                            {ts.name}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {tsPages.length} active board{tsPages.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-medium text-blue-600 mt-3 pt-2 border-t border-slate-100">
                          <span>Open board</span>
                          <span className="text-xs transition-transform group-hover:translate-x-0.5">→</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleOpenCreateTeamspaceModal()}
                    className="px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-700 border border-slate-200 hover:border-slate-300 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-zinc-500" />
                    <span>+ New Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Top Header Bar */}
            <header className="h-11 border-b border-[#E9E9E7] px-4 flex items-center justify-between shrink-0 select-none bg-white">
              {/* Top Left: Clean Notion Breadcrumbs */}
              <div className="flex items-center gap-2 text-xs font-medium">
                {currentTeamspace ? (
                  <>
                    <span className="text-zinc-700 font-semibold flex items-center gap-1.5">
                      <span>{currentTeamspace.icon || "🏢"}</span>
                      <span>{currentTeamspace.name}</span>
                    </span>
                    <span className="text-zinc-300">/</span>
                  </>
                ) : null}
                <span className="text-zinc-950 font-bold">
                  {activePage?.title || "Untitled"}
                </span>

                {activePage?.type === "doc" && (
                  <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                    Document Notes
                  </span>
                )}
              </div>

              {/* Top Right Actions */}
              <div className="flex items-center gap-2">
                {activePage?.type === "doc" && (
                  <button
                    type="button"
                    onClick={handleDownloadDocPdf}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:text-[#0B57D0] hover:bg-[#EBEBEA] rounded-md transition-colors cursor-pointer"
                    title="Download Document as PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0B57D0]" />
                    <span>Download PDF</span>
                  </button>
                )}

                {currentTeamspace && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedDbUserEmail("");
                        setMemberSearchQuery("");
                        setNewMemberName("");
                        setNewMemberEmail("");
                        setShowMembersModal(true);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-[#EBEBEA] rounded-md transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>People ({currentTeamspaceMembers.length})</span>
                    </button>

                    {isProjectAdmin && (
                      <button
                        onClick={() => {
                          setSharePinInput("");
                          setSharePinConfirmInput("");
                          setIsEditingPin(false);
                          setShowPinRevealed(false);
                          setHoverPinRevealed(false);
                          setShowShareModal(true);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-[#EBEBEA] rounded-md transition-colors cursor-pointer"
                        title="Share project & configure PIN"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share Project</span>
                      </button>
                    )}
                  </>
                )}

                {activePage?.type === "doc" ? (
                  <div className="flex items-center gap-1.5">
                    {/* Undo Button */}
                    <button
                      type="button"
                      onClick={handleDocUndo}
                      disabled={!canUndo}
                      className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-[#EBEBEA] disabled:opacity-30 disabled:pointer-events-none rounded-md transition-colors cursor-pointer"
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Redo Button */}
                    <button
                      type="button"
                      onClick={handleDocRedo}
                      disabled={!canRedo}
                      className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-[#EBEBEA] disabled:opacity-30 disabled:pointer-events-none rounded-md transition-colors cursor-pointer"
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Save Document Button */}
                    <button
                      type="button"
                      onClick={handleSaveDoc}
                      disabled={docSaving}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-md shadow-2xs transition-all active:scale-95 cursor-pointer ${
                        hasUnsavedDocChanges
                          ? "bg-[#0B57D0] hover:bg-[#0842A0] text-white"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                      title="Save Document (Ctrl+S)"
                    >
                      {docSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : hasUnsavedDocChanges ? (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Saved</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDocAddBlock("paragraph")}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white hover:bg-slate-100 text-zinc-800 rounded-md border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-blue-600" />
                      <span>Add Block</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setQuickAddColumn("To-do");
                      setQuickAddTitle("");
                    }}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-md shadow-2xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCloseToMain}
                  title="Close to Welcome screen"
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-[#EBEBEA] rounded-md transition-colors cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* ========================================================= */}
            {/* CANVAS BODY: DOCUMENT NOTES vs KANBAN TASKS / TIMELINE    */}
            {/* ========================================================= */}
            {activePage?.type === "doc" ? (
              /* ------------------------------------------------------- */
              /* 2A. DOCUMENT NOTES LIVE EDITOR CANVAS (NOTION STYLE)    */
              /* ------------------------------------------------------- */
              <div className="flex-1 flex overflow-hidden bg-white">
                {/* Left / Center Document Canvas (Seamless, max-w-4xl) */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8">
                  <div className="max-w-4xl mx-auto space-y-6">
                    {/* Document Header - Clean Title & Icon (aligned directly with blocks below) */}
                    <div className="space-y-1.5 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          maxLength={4}
                          value={activePage.icon || "📄"}
                          onChange={(e) => handleDocIconChange(e.target.value)}
                          className="w-10 h-10 text-2xl text-center bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 focus:outline-none cursor-pointer shrink-0 transition-colors"
                          title="Click to change icon"
                        />
                        <input
                          type="text"
                          value={activePage.title}
                          onChange={(e) => handleDocTitleChange(e.target.value)}
                          onBlur={handleDocTitleBlur}
                          placeholder="Untitled Document..."
                          className="flex-1 text-2xl sm:text-3xl font-extrabold text-zinc-950 placeholder-zinc-300 focus:outline-none tracking-tight bg-transparent"
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 pl-13">
                        <span>Created by <strong className="text-zinc-600">{creatorName}</strong></span>
                        <span>•</span>
                        <span>{activePage.created_at ? new Date(activePage.created_at).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) : "Today"}</span>
                        <span>•</span>
                        <span>{activeDocBlocks.length} blocks</span>
                      </div>
                    </div>

                    {/* Interactive Document Blocks Canvas */}
                    <div className="space-y-2">
                      {activeDocBlocks.length === 0 ? (
                        <div
                          onClick={() => handleDocAddBlock("paragraph")}
                          className="p-10 border-2 border-dashed border-slate-200 rounded-xl text-center cursor-pointer hover:border-[#0B57D0] hover:bg-blue-50/20 transition-all group"
                        >
                          <FileEdit className="w-8 h-8 text-zinc-300 group-hover:text-blue-600 mx-auto mb-2 transition-colors" />
                          <p className="text-sm font-bold text-zinc-700 group-hover:text-blue-700">
                            This document note is empty
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">
                            Click here to start typing, or select a block from the right panel.
                          </p>
                        </div>
                      ) : (
                        activeDocBlocks.map((block, index) => (
                          <div
                            key={block.id}
                            className="group relative flex items-start gap-2 p-1 rounded-lg hover:bg-slate-50/70 transition-colors"
                          >
                            {/* Main Block Input */}
                            <div className="flex-1 min-w-0">
                              {block.type === "h1" && (
                                <input
                                  id={`doc-block-${block.id}`}
                                  type="text"
                                  value={block.content}
                                  onChange={(e) => handleDocBlockChange(block.id, e.target.value)}
                                  onBlur={handleDocBlockBlur}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleDocAddBlock("paragraph", block.id);
                                    }
                                  }}
                                  placeholder="Heading 1..."
                                  className="w-full text-2xl font-bold text-zinc-900 border-b border-slate-100 pb-1 focus:outline-none bg-transparent"
                                />
                              )}

                              {block.type === "h2" && (
                                <input
                                  id={`doc-block-${block.id}`}
                                  type="text"
                                  value={block.content}
                                  onChange={(e) => handleDocBlockChange(block.id, e.target.value)}
                                  onBlur={handleDocBlockBlur}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleDocAddBlock("paragraph", block.id);
                                    }
                                  }}
                                  placeholder="Heading 2..."
                                  className="w-full text-xl font-bold text-zinc-900 focus:outline-none bg-transparent"
                                />
                              )}

                              {block.type === "h3" && (
                                <input
                                  id={`doc-block-${block.id}`}
                                  type="text"
                                  value={block.content}
                                  onChange={(e) => handleDocBlockChange(block.id, e.target.value)}
                                  onBlur={handleDocBlockBlur}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleDocAddBlock("paragraph", block.id);
                                    }
                                  }}
                                  placeholder="Heading 3..."
                                  className="w-full text-base font-bold text-zinc-800 focus:outline-none bg-transparent"
                                />
                              )}

                              {block.type === "paragraph" && (
                                <textarea
                                  id={`doc-block-${block.id}`}
                                  value={block.content}
                                  onChange={(e) => handleDocBlockChange(block.id, e.target.value)}
                                  onBlur={handleDocBlockBlur}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      handleDocAddBlock("paragraph", block.id);
                                    } else if (e.key === "Backspace" && !block.content && (activePage.content_blocks || []).length > 1) {
                                      e.preventDefault();
                                      handleDocDeleteBlock(block.id);
                                    }
                                  }}
                                  placeholder="Type text, notes, instructions... (Press Enter for new block)"
                                  rows={Math.max(1, (block.content || "").split("\n").length)}
                                  className="w-full text-sm text-zinc-800 resize-none focus:outline-none leading-relaxed bg-transparent"
                                />
                              )}

                              {block.type === "todo" && (
                                <div className="flex items-start gap-2.5 w-full">
                                  <input
                                    type="checkbox"
                                    checked={!!block.checked}
                                    onChange={() => handleDocToggleTodo(block.id)}
                                    className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                                  />
                                  <input
                                    id={`doc-block-${block.id}`}
                                    type="text"
                                    value={block.content}
                                    onChange={(e) => handleDocBlockChange(block.id, e.target.value)}
                                    onBlur={handleDocBlockBlur}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleDocAddBlock("todo", block.id);
                                      } else if (e.key === "Backspace" && !block.content && (activePage.content_blocks || []).length > 1) {
                                        e.preventDefault();
                                        handleDocDeleteBlock(block.id);
                                      }
                                    }}
                                    placeholder="To-do item..."
                                    className={`w-full text-sm focus:outline-none bg-transparent ${
                                      block.checked ? "line-through text-zinc-400" : "text-zinc-800"
                                    }`}
                                  />
                                </div>
                              )}

                              {block.type === "bullet" && (
                                <div className="flex items-start gap-2.5 w-full">
                                  <span className="text-zinc-400 text-sm font-bold select-none shrink-0">•</span>
                                  <input
                                    id={`doc-block-${block.id}`}
                                    type="text"
                                    value={block.content}
                                    onChange={(e) => handleDocBlockChange(block.id, e.target.value)}
                                    onBlur={handleDocBlockBlur}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleDocAddBlock("bullet", block.id);
                                      } else if (e.key === "Backspace" && !block.content && (activePage.content_blocks || []).length > 1) {
                                        e.preventDefault();
                                        handleDocDeleteBlock(block.id);
                                      }
                                    }}
                                    placeholder="List item..."
                                    className="w-full text-sm text-zinc-800 focus:outline-none bg-transparent"
                                  />
                                </div>
                              )}

                              {block.type === "quote" && (
                                <div className="border-l-4 border-[#0B57D0] pl-3 py-1 bg-blue-50/20 rounded-r w-full">
                                  <textarea
                                    id={`doc-block-${block.id}`}
                                    value={block.content}
                                    onChange={(e) => handleDocBlockChange(block.id, e.target.value)}
                                    onBlur={handleDocBlockBlur}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleDocAddBlock("paragraph", block.id);
                                      }
                                    }}
                                    placeholder="Quote note..."
                                    rows={Math.max(1, (block.content || "").split("\n").length)}
                                    className="w-full text-sm italic text-zinc-700 focus:outline-none bg-transparent resize-none"
                                  />
                                </div>
                              )}

                              {block.type === "callout" && (
                                <div className="bg-[#F0F4F9] border border-[#D3E3FD] rounded-lg p-3 flex items-start gap-2.5 w-full">
                                  <span className="text-base select-none shrink-0">💡</span>
                                  <textarea
                                    id={`doc-block-${block.id}`}
                                    value={block.content}
                                    onChange={(e) => handleDocBlockChange(block.id, e.target.value)}
                                    onBlur={handleDocBlockBlur}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleDocAddBlock("paragraph", block.id);
                                      }
                                    }}
                                    placeholder="Key takeaway, callout or highlight..."
                                    rows={Math.max(1, (block.content || "").split("\n").length)}
                                    className="w-full text-sm font-medium text-zinc-800 focus:outline-none bg-transparent resize-none"
                                  />
                                </div>
                              )}

                            </div>

                            {/* Floating Controls: Move, Type Switcher, Add, Delete */}
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 pt-0.5 transition-opacity">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleDocMoveBlock(block.id, "up")}
                                className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-20 rounded hover:bg-zinc-200/60 cursor-pointer"
                                title="Move block up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={index === (activePage.content_blocks || []).length - 1}
                                onClick={() => handleDocMoveBlock(block.id, "down")}
                                className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-20 rounded hover:bg-zinc-200/60 cursor-pointer"
                                title="Move block down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Type Selector dropdown */}
                              <select
                                value={block.type}
                                onChange={(e) => handleDocBlockTypeChange(block.id, e.target.value as any)}
                                className="text-[10px] font-semibold text-zinc-600 bg-white border border-slate-200 rounded px-1 py-0.5 focus:outline-none cursor-pointer"
                              >
                                <option value="paragraph">Text</option>
                                <option value="h1">Heading 1</option>
                                <option value="h2">Heading 2</option>
                                <option value="h3">Heading 3</option>
                                <option value="todo">To-do</option>
                                <option value="bullet">Bullet</option>
                                <option value="quote">Quote</option>
                                <option value="callout">Callout</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => handleDocAddBlock("paragraph", block.id)}
                                className="p-1 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                title="Add block below"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleDocDeleteBlock(block.id)}
                                className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Delete block"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Bottom Quick Bar */}
                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-zinc-400">
                      <button
                        type="button"
                        onClick={() => handleDocAddBlock("paragraph")}
                        className="flex items-center gap-1.5 font-semibold text-zinc-400 hover:text-blue-700 py-1.5 px-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Click to add block</span>
                      </button>
                      <div className="text-[11px]">
                        Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">Enter</kbd> to add new block
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Side Panel: Block Choices & Referral Documents */}
                <div className="w-72 bg-[#F8F9FA] border-l border-slate-200 h-full overflow-y-auto p-4 shrink-0 space-y-4 font-primary">
                  {/* Section 1: Insert Blocks */}
                  <div>
                    <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-zinc-900">Insert Blocks</span>
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        {activeDocBlocks.length} blocks
                      </span>
                    </div>

                    <div className="space-y-1 mt-2.5">
                      <button
                        type="button"
                        onClick={() => handleDocAddBlock("paragraph")}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-2xs transition-all cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Type className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-zinc-800">Text</div>
                          <div className="text-[10px] text-zinc-400 truncate">Plain paragraph note</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDocAddBlock("h1")}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-2xs transition-all cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Heading1 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-zinc-800">Heading 1</div>
                          <div className="text-[10px] text-zinc-400 truncate">Large section header</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDocAddBlock("h2")}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-2xs transition-all cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Heading2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-zinc-800">Heading 2</div>
                          <div className="text-[10px] text-zinc-400 truncate">Medium subsection</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDocAddBlock("h3")}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-2xs transition-all cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Heading3 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-zinc-800">Heading 3</div>
                          <div className="text-[10px] text-zinc-400 truncate">Small subtopic</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDocAddBlock("todo")}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-2xs transition-all cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <CheckSquare className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-zinc-800">To-do Checkbox</div>
                          <div className="text-[10px] text-zinc-400 truncate">Interactive checklist</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDocAddBlock("bullet")}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-2xs transition-all cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                          <List className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-zinc-800">Bullet List</div>
                          <div className="text-[10px] text-zinc-400 truncate">Unordered list items</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDocAddBlock("quote")}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-2xs transition-all cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                          <Quote className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-zinc-800">Quote</div>
                          <div className="text-[10px] text-zinc-400 truncate">Styled citation note</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDocAddBlock("callout")}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-2xs transition-all cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                          <Lightbulb className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-zinc-800">Callout</div>
                          <div className="text-[10px] text-zinc-400 truncate">Key takeaway card</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Section 2: Referral Documents */}
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-zinc-900">Referral Documents</span>
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        {safeParseArray(activePage.attachments).length} files
                      </span>
                    </div>

                    {/* Upload Referral Document Button */}
                    <label className={`w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-blue-50/50 text-zinc-700 hover:text-[#0B57D0] text-xs font-semibold rounded-lg border border-dashed border-slate-300 hover:border-[#0B57D0] cursor-pointer transition-all shadow-2xs ${uploadingDocReferral ? "opacity-50 pointer-events-none" : ""}`}>
                      {uploadingDocReferral ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#0B57D0] animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-[#0B57D0]" />
                      )}
                      <span>{uploadingDocReferral ? "Uploading File..." : "Upload Referral Document"}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadDocReferral(file);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>

                    {/* List of Attached Referral Documents */}
                    {safeParseArray<WfeTaskAttachment>(activePage.attachments).length === 0 ? (
                      <p className="text-[11px] text-zinc-400 italic text-center py-2">
                        No referral documents attached
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                        {safeParseArray<WfeTaskAttachment>(activePage.attachments).map((att) => {
                          const isPdf = att.name?.toLowerCase().endsWith(".pdf") || att.type?.includes("pdf");
                          const isImg = att.type?.includes("image") || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name || "");

                          return (
                            <div
                              key={att.id}
                              className="p-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs flex items-center justify-between gap-2 group transition-all"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                                    isPdf
                                      ? "bg-rose-50 text-rose-600"
                                      : isImg
                                      ? "bg-indigo-50 text-indigo-600"
                                      : "bg-blue-50 text-blue-600"
                                  }`}
                                >
                                  {isPdf ? (
                                    <FileText className="w-3.5 h-3.5" />
                                  ) : isImg ? (
                                    <ImageIcon className="w-3.5 h-3.5" />
                                  ) : (
                                    <FileCode className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={att.name}
                                    className="text-xs font-semibold text-zinc-800 hover:text-[#0B57D0] truncate block"
                                    title={att.name}
                                  >
                                    {att.name}
                                  </a>
                                  <div className="text-[10px] text-zinc-400 truncate">
                                    {att.size || "File"}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={att.name}
                                  className="p-1 text-zinc-400 hover:text-[#0B57D0] hover:bg-blue-50 rounded transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDocReferral(att)}
                                  className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Delete attachment"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions: Undo / Redo & Save Document */}
                  <div className="pt-4 border-t border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDocUndo}
                        disabled={!canUndo}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none text-zinc-700 border border-slate-200 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-2xs"
                        title="Undo (Ctrl+Z)"
                      >
                        <Undo2 className="w-3.5 h-3.5 text-zinc-600" />
                        <span>Undo</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDocRedo}
                        disabled={!canRedo}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:pointer-events-none text-zinc-700 border border-slate-200 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-2xs"
                        title="Redo (Ctrl+Y)"
                      >
                        <Redo2 className="w-3.5 h-3.5 text-zinc-600" />
                        <span>Redo</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveDoc}
                      disabled={docSaving}
                      className={`w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold rounded-lg shadow-xs transition-all active:scale-98 cursor-pointer ${
                        hasUnsavedDocChanges
                          ? "bg-[#0B57D0] hover:bg-[#0842A0] text-white"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                      title="Save Document (Ctrl+S)"
                    >
                      {docSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Document...</span>
                        </>
                      ) : hasUnsavedDocChanges ? (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Document</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Document Saved</span>
                        </>
                      )}
                    </button>
                    <div className="text-[10px] text-zinc-400 text-center">
                      Shortcuts: <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono">Ctrl+S</kbd> Save • <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono">Ctrl+Z</kbd> Undo
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ------------------------------------------------------- */
              /* 2B. KANBAN TASKS / TIMELINE GANTT CANVAS                */
              /* ------------------------------------------------------- */
              <div className="flex-1 flex flex-col overflow-y-auto px-8 py-6">
                {/* Page Identity */}
                <div className="mb-4">
                  <h1 className="text-2xl font-extrabold text-zinc-950 tracking-tight flex items-center gap-2">
                    <span>{activePage?.title || "Untitled"}</span>
                  </h1>
                </div>

                {/* View Switcher Tabs Bar */}
                <div className="flex items-center justify-between border-b border-[#E9E9E7] mb-6">
                  <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab("company")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      activeTab === "company"
                        ? "border-zinc-950 text-zinc-950"
                        : "border-transparent text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>{currentTeamspace?.name || "Project"} tasks</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("my")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      activeTab === "my"
                        ? "border-zinc-950 text-zinc-950"
                        : "border-transparent text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>My tasks</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("sprint")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      activeTab === "sprint"
                        ? "border-zinc-950 text-zinc-950"
                        : "border-transparent text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span>Current sprint</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("timeline")}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                      activeTab === "timeline"
                        ? "border-zinc-950 text-zinc-950"
                        : "border-transparent text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Timeline</span>
                  </button>
                </div>

                {/* Filter Search Pill */}
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Filter cards..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-7 py-1 h-7.5 text-xs bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#0B57D0] rounded-full focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/15 w-44 transition-all shadow-2xs font-medium placeholder:text-zinc-400 text-zinc-800"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 p-0.5 text-zinc-400 hover:text-zinc-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                        title="Clear filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* 3. NOTION KANBAN BOARD / TIMELINE GANTT VIEW               */}
              {/* ========================================================= */}
              {activeTab === "timeline" ? (
            /* TIMELINE / GANTT VIEW */
            <div className="flex-1 flex flex-col bg-white border border-[#E9E9E7] rounded-xl overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-[#F7F7F5] border-b border-[#E9E9E7] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-zinc-900">Project Timeline & Gantt Schedule</span>
                  <span className="text-[10px] text-zinc-500 bg-zinc-200/60 px-2 py-0.5 rounded-full font-semibold">
                    {filteredTasks.length} Scheduled Tasks
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Complete
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> In Progress
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" /> To-do
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Overdue
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 divide-y divide-zinc-100">
                {filteredTasks.map((task) => {
                  const isDone = task.custom_status === "Complete";
                  const hasDueDate = !!task.due_date;
                  const isOverdue = hasDueDate && !isDone && Date.now() > Number(task.due_date);
                  
                  const createdDate = task.created_at ? new Date(task.created_at) : new Date();
                  const dueDateObj = task.due_date ? new Date(Number(task.due_date)) : null;

                  // Days calculation
                  let daysLabel = "No deadline set";
                  if (dueDateObj) {
                    const diffDays = Math.ceil((dueDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    if (isDone) {
                      daysLabel = "Completed";
                    } else if (diffDays < 0) {
                      daysLabel = `⚠️ ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""} overdue`;
                    } else if (diffDays === 0) {
                      daysLabel = "Due today";
                    } else {
                      daysLabel = `${diffDays} day${diffDays > 1 ? "s" : ""} left`;
                    }
                  }

                  const statusColor = isOverdue
                    ? "bg-rose-500"
                    : isDone
                    ? "bg-emerald-500"
                    : task.custom_status === "In progress"
                    ? "bg-amber-500"
                    : task.custom_status === "In review"
                    ? "bg-sky-500"
                    : "bg-purple-500";

                  const progressWidth = isDone
                    ? "w-full"
                    : task.custom_status === "In review"
                    ? "w-4/5"
                    : task.custom_status === "In progress"
                    ? "w-1/2"
                    : "w-1/4";

                  return (
                    <div
                      key={task.id}
                      onClick={() => handleOpenEditingTask(task)}
                      className="py-3 px-3 hover:bg-[#F9F9F8] rounded-lg transition-colors cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">
                            {task.title}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              task.custom_status === "Complete"
                                ? "bg-emerald-100 text-emerald-700"
                                : task.custom_status === "In progress"
                                ? "bg-amber-100 text-amber-700"
                                : task.custom_status === "In review"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {task.custom_status}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {task.is_locked ? (
                              <span title="Locked by Admin" className="inline-flex items-center justify-center text-amber-600">
                                <Lock className="w-3.5 h-3.5" />
                              </span>
                            ) : null}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveLogDrawerTask(task);
                              }}
                              className="text-zinc-300 hover:text-zinc-500 transition-colors cursor-pointer bg-transparent border-none p-0 inline-flex items-center justify-center"
                              title="Activity Timeline"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Assignee & Dates info */}
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 flex-wrap">
                          {task.assigned_to ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {task.assigned_to.split(",").map((s) => s.trim()).filter(Boolean).map((person) => {
                                const isMe = isAssigneeCurrentUser(person);
                                return (
                                  <span
                                    key={person}
                                    className={`font-medium flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${
                                      isMe
                                        ? "bg-blue-50 text-[#0B57D0] border-blue-200/80 font-bold"
                                        : "bg-zinc-100 text-zinc-700 border-zinc-200/60"
                                    }`}
                                  >
                                    <UserIcon className={`w-3 h-3 ${isMe ? "text-[#0B57D0]" : "text-zinc-500"}`} />
                                    <span>{formatAssigneeDisplayName(person)}</span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic">Unassigned</span>
                          )}

                          {dueDateObj ? (
                            <span
                              className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded ${
                                isOverdue
                                  ? "bg-rose-100 text-rose-700 font-bold"
                                  : isDone
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-blue-50 text-blue-700"
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              <span>Due: {dueDateObj.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}</span>
                              <span className="text-[10px] opacity-80">({daysLabel})</span>
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-[10px]">No due date</span>
                          )}
                        </div>
                      </div>

                      {/* Visual Gantt Timeline Progress Bar */}
                      <div className="w-full bg-zinc-100 rounded-full h-2.5 overflow-hidden relative border border-zinc-200/50">
                        <div
                          className={`h-full ${statusColor} ${progressWidth} rounded-full transition-all duration-300`}
                        />
                      </div>
                    </div>
                  );
                })}

                {filteredTasks.length === 0 && (
                  <div className="text-center py-12 text-zinc-400 text-xs">
                    No tasks found. Click <b className="text-zinc-700">+ New Task</b> to create a scheduled task.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex gap-4 overflow-x-auto pb-6">
              {STATUS_COLUMNS.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.custom_status === col.id);
                const isOver = dragOverColumn === col.id;

                return (
                  <div
                    key={col.id}
                    onDragOver={(e) => handleDragOver(e, col.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className={`w-72 flex-shrink-0 flex flex-col ${col.containerBg} rounded-xl p-2.5 transition-all border ${
                      isOver ? "border-blue-500 ring-2 ring-blue-400/30 shadow-sm" : col.containerBorder
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-1 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className="text-xs font-bold text-zinc-800">{col.label}</span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${col.badge}`}>
                          {colTasks.length}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setQuickAddColumn(col.id);
                          setQuickAddTitle("");
                        }}
                        className="p-1 text-zinc-400 hover:text-zinc-800 hover:bg-white/60 active:bg-white/80 rounded transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Stack of Cards */}
                    <div className="flex-1 space-y-2 overflow-y-auto min-h-[150px]">
                      {colTasks.map((task) => {
                        const isPendingDelete = !!task.pending_deletion;
                        const moveCheck = canUserMoveTask(task);
                        const isCardDraggable = !isPendingDelete && moveCheck.canMove;

                        return (
                          <div
                            key={task.id}
                            draggable={isCardDraggable}
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => handleOpenEditingTask(task)}
                            className={`p-3 rounded-lg border transition-all relative ${
                              isPendingDelete
                                ? "bg-rose-50/40 border-rose-200 opacity-70 cursor-pointer"
                                : isCardDraggable
                                ? `bg-white ${col.cardBorder} shadow-2xs hover:shadow-xs cursor-grab active:cursor-grabbing`
                                : `bg-white ${col.cardBorder} shadow-2xs hover:shadow-xs cursor-pointer`
                            }`}
                          >
                            {/* Deletion Warning Banner */}
                            {isPendingDelete && (
                              <div className="mb-2 p-1.5 bg-rose-100/90 border border-rose-200 rounded text-[10px] text-rose-800 flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1 font-semibold truncate">
                                  <AlertCircle className="w-3 h-3 shrink-0 text-rose-600" />
                                  <span className="truncate">Pending delete ({task.deleted_by || "Collaborator"})</span>
                                </div>
                                {isProjectOwner && (
                                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => handleApproveDeleteTask(task.id)}
                                      className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[9px]"
                                      title="Confirm & Purge"
                                    >
                                      Purge
                                    </button>
                                    <button
                                      onClick={() => handleRestoreTask(task)}
                                      className="px-1.5 py-0.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded font-semibold text-[9px]"
                                      title="Keep / Restore"
                                    >
                                      Keep
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            <div
                              className={`text-xs font-semibold leading-snug mb-2 flex items-start justify-between gap-1.5 ${
                                isPendingDelete
                                  ? "line-through text-zinc-400 blur-[0.4px] select-none"
                                  : "text-zinc-900"
                              }`}
                            >
                              <span className="flex-1">{task.title}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {task.is_locked ? (
                                  <span title="Locked by Admin" className="inline-flex items-center justify-center text-amber-600">
                                    <Lock className="w-3.5 h-3.5" />
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveLogDrawerTask(task);
                                  }}
                                  className="text-zinc-300 hover:text-zinc-500 transition-colors cursor-pointer bg-transparent border-none p-0 inline-flex items-center justify-center"
                                  title="Activity Timeline"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className={`flex items-center flex-wrap gap-1 mt-1.5 ${isPendingDelete ? "opacity-60" : ""}`}>
                              {task.priority === "Urgent" && (
                                <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100/90 leading-tight">
                                  Urgent
                                </span>
                              )}
                              {task.priority === "High" && (
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1 py-0.2 rounded border border-amber-100/90 leading-tight">
                                  High
                                </span>
                              )}
                              {task.assigned_to && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {task.assigned_to.split(",").map((s) => s.trim()).filter(Boolean).map((person) => {
                                    const isMe = isAssigneeCurrentUser(person);
                                    return (
                                      <span
                                        key={person}
                                        className={`text-[9.5px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 border leading-none ${
                                          isMe
                                            ? "bg-blue-50/90 text-[#0B57D0] border-blue-200/80 font-bold"
                                            : "bg-zinc-100/80 text-zinc-600 border-zinc-200/60"
                                        }`}
                                      >
                                        <UserIcon className={`w-2.5 h-2.5 ${isMe ? "text-[#0B57D0]" : "text-zinc-400"}`} />
                                        <span>{formatAssigneeDisplayName(person)}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {task.due_date && (
                                (() => {
                                  const isDone = task.custom_status === "Complete";
                                  const isOverdue = !isDone && Date.now() > Number(task.due_date);
                                  const dateStr = new Date(Number(task.due_date)).toLocaleDateString("en-SG", {
                                    day: "numeric",
                                    month: "short",
                                  });
                                  return (
                                    <span
                                      className={`text-[9.5px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 border leading-none ${
                                        isOverdue
                                          ? "bg-rose-50 text-rose-700 border-rose-200 font-bold"
                                          : isDone
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                          : "bg-zinc-100/80 text-zinc-600 border-zinc-200/60"
                                      }`}
                                    >
                                      <Calendar className={`w-2.5 h-2.5 ${isOverdue ? "text-rose-600" : "text-zinc-400"}`} />
                                      <span>{dateStr}</span>
                                      {isOverdue && <span className="text-[8px] font-bold text-rose-600">!</span>}
                                    </span>
                                  );
                                })()
                              )}
                              {(task.attachments || []).length > 0 && (
                                <span className="text-[9.5px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1 border border-blue-100/60 leading-none">
                                  <Paperclip className="w-2.5 h-2.5" />
                                  <span>{(task.attachments || []).length}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Quick Inline Add Form */}
                      {quickAddColumn === col.id ? (
                        <div className="bg-white p-2.5 rounded-lg border border-blue-400 shadow-xs space-y-2">
                          <textarea
                            autoFocus
                            rows={2}
                            placeholder="What needs to be done?"
                            value={quickAddTitle}
                            onChange={(e) => setQuickAddTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleQuickAdd(col.id);
                              } else if (e.key === "Escape") {
                                setQuickAddColumn(null);
                              }
                            }}
                            className="w-full text-xs text-zinc-800 placeholder-zinc-400 resize-none focus:outline-none"
                          />
                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={() => handleQuickAdd(col.id)}
                              className="px-2.5 py-1 text-xs font-bold bg-[#0B57D0] text-white rounded hover:bg-[#0842A0]"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => setQuickAddColumn(null)}
                              className="p-1 text-zinc-400 hover:text-zinc-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setQuickAddColumn(col.id);
                            setQuickAddTitle("");
                          }}
                          className="w-full flex items-center gap-1.5 py-1.5 px-2 text-xs font-semibold text-zinc-500/80 hover:text-zinc-900 hover:bg-white/60 active:bg-white/80 rounded-lg transition-all text-left cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New Task</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  )}

    {/* Hidden file input for R2 uploads */}
    <input
      ref={fileInputRef}
      type="file"
      className="hidden"
      onChange={handleFileSelected}
    />
  </main>

      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* 4. NOTION CARD / DOCUMENT EDITOR (FULL-HEIGHT RIGHT DRAWER) */}
      {/* ========================================================= */}
      {editingTask && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 cursor-pointer"
          onClick={handleAttemptCloseTask}
        >
          <div
            className="bg-white w-full max-w-4xl lg:max-w-5xl h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-200 font-primary cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Bar */}
            <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-zinc-500 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-700">Task Details</span>
                <span>/</span>
                <span className="text-blue-600 font-bold">{editingTask.custom_status}</span>
                {editingTask.is_locked ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5">
                {/* Icon-Only Lock / Unlock Toggle for Admin & Co-Admin */}
                {isProjectAdmin && (
                  <button
                    onClick={(e) => handleToggleLockTask(editingTask, e)}
                    className={`p-1.5 rounded-md transition-colors ${
                      editingTask.is_locked
                        ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                        : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                    }`}
                    title={editingTask.is_locked ? "Unlock this task" : "Lock this task (Admin protect)"}
                  >
                    {editingTask.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveLogDrawerTask(editingTask)}
                  className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="View Activity Timeline"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDeleteEditingTask}
                  className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-4 bg-slate-200 mx-1 shrink-0" />

                <button
                  type="button"
                  onClick={handleAttemptCloseTask}
                  className="px-3.5 py-1.5 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditingTask}
                  disabled={!isTaskDirty}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-xs transition-all ${
                    isTaskDirty
                      ? "bg-[#0B57D0] hover:bg-[#0842A0] text-white cursor-pointer active:scale-95"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-200 shadow-none"
                  }`}
                >
                  Save Changes
                </button>
              </div>
            </div>

            {/* 2-Column Split: 65% Left (Content) / 35% Right (Attachments & Settings) */}
            <div className="flex-1 flex overflow-hidden divide-x divide-slate-200 min-h-0">
              {/* ======================================================= */}
              {/* LEFT COLUMN (65%): TASK TITLE & PAGE CONTENT EDITOR     */}
              {/* ======================================================= */}
              <div className="w-[65%] flex flex-col overflow-y-auto p-4 space-y-3">
                <div className="pb-1 border-b border-slate-100">
                  <input
                    type="text"
                    value={editingTask.title}
                    disabled={!!editingTask.is_locked && !isProjectAdmin}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    placeholder="Task title..."
                    className="w-full text-lg font-bold text-zinc-950 placeholder-zinc-300 focus:outline-none tracking-tight disabled:opacity-75 bg-transparent"
                  />
                  <div className="text-[10px] text-zinc-400 font-normal mt-0.5">
                    Created: {new Date(editingTask.created_at || Date.now()).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>

                {/* Block Content Editor */}
                <div className="space-y-2">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 pb-0.5">
                    Task Description & Notes
                  </div>

                  <div className="space-y-1.5">
                    {/* Empty state: Show default description note block ready to type */}
                    {(editingTask.blocks || []).length === 0 && (
                      <div>
                        <textarea
                          rows={3}
                          disabled={!!editingTask.is_locked && !isProjectAdmin}
                          placeholder="Write task description, notes, or instructions..."
                          onChange={(e) => {
                            const newBlock: WfeBlock = {
                              id: `b_${Date.now()}_note`,
                              type: "paragraph",
                              content: e.target.value,
                              checked: false,
                            };
                            setEditingTask({ ...editingTask, blocks: [newBlock] });
                          }}
                          className="w-full text-xs text-zinc-700 resize-none focus:outline-none leading-relaxed disabled:opacity-75 p-2 rounded-md bg-zinc-50 border border-slate-200 focus:border-[#0B57D0] focus:bg-white transition-colors"
                        />
                      </div>
                    )}

                    {(editingTask.blocks || []).map((block) => (
                      <div key={block.id} className="group relative flex items-center justify-between gap-2 p-1 rounded-md hover:bg-zinc-50/80 transition-colors">
                        <div className="flex-1 min-w-0">
                          {block.type === "h1" && (
                            <input
                              type="text"
                              value={block.content}
                              disabled={!!editingTask.is_locked && !isProjectAdmin}
                              onChange={(e) => handleBlockChange(block.id, e.target.value)}
                              placeholder="Heading 1"
                              className="w-full text-lg font-bold text-zinc-900 focus:outline-none disabled:opacity-75 bg-transparent"
                            />
                          )}
                          {block.type === "h2" && (
                            <input
                              type="text"
                              value={block.content}
                              disabled={!!editingTask.is_locked && !isProjectAdmin}
                              onChange={(e) => handleBlockChange(block.id, e.target.value)}
                              placeholder="Heading 2"
                              className="w-full text-base font-bold text-zinc-900 focus:outline-none disabled:opacity-75 bg-transparent"
                            />
                          )}
                          {block.type === "paragraph" && (
                            <textarea
                              rows={3}
                              value={block.content}
                              disabled={!!editingTask.is_locked && !isProjectAdmin}
                              onChange={(e) => handleBlockChange(block.id, e.target.value)}
                              placeholder="Write task description, notes, or instructions..."
                              className="w-full text-xs text-zinc-700 resize-none focus:outline-none leading-relaxed disabled:opacity-75 p-2 rounded-md bg-zinc-50 border border-slate-200 focus:border-[#0B57D0] focus:bg-white transition-colors"
                            />
                          )}
                          {block.type === "todo" && (
                            <div className="flex items-center gap-2 w-full">
                              <input
                                type="checkbox"
                                checked={block.checked}
                                disabled={!!editingTask.is_locked && !isProjectAdmin}
                                onChange={() => handleToggleTodo(block.id)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={block.content}
                                disabled={!!editingTask.is_locked && !isProjectAdmin}
                                onChange={(e) => handleBlockChange(block.id, e.target.value)}
                                placeholder="To-do item"
                                className={`w-full text-xs text-zinc-800 focus:outline-none bg-transparent ${
                                  block.checked ? "line-through text-zinc-400" : ""
                                }`}
                              />
                            </div>
                          )}
                          {block.type === "callout" && (
                            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 w-full text-xs">
                              <span className="text-sm">💡</span>
                              <input
                                type="text"
                                value={block.content}
                                disabled={!!editingTask.is_locked && !isProjectAdmin}
                                onChange={(e) => handleBlockChange(block.id, e.target.value)}
                                placeholder="Callout note or key takeaway..."
                                className="w-full bg-transparent text-zinc-800 focus:outline-none font-medium"
                              />
                            </div>
                          )}
                        </div>

                        {/* Gray Trash Can Icon on Right (Hover to show, clickable) */}
                        {(!editingTask.is_locked || isProjectAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(block.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all shrink-0 cursor-pointer"
                            title="Delete this block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {(!editingTask.is_locked || isProjectAdmin) && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleAddBlock("paragraph")}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md transition-colors"
                      >
                        + Text
                      </button>
                      <button
                        onClick={() => handleAddBlock("h2")}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md transition-colors"
                      >
                        + Heading
                      </button>
                      <button
                        onClick={() => handleAddBlock("todo")}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md transition-colors"
                      >
                        + Checkbox
                      </button>
                      <button
                        onClick={() => handleAddBlock("callout")}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md border border-blue-200 transition-colors"
                      >
                        + Callout
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ======================================================= */}
              {/* ======================================================= */}
              {/* RIGHT COLUMN (35%): TASK PROPERTIES & ATTACHMENTS       */}
              {/* ======================================================= */}
              <div className="w-[35%] flex flex-col overflow-y-auto p-5 bg-white space-y-5">
                {/* DUE DATE & PRIORITY (ALWAYS DISPLAYED, CLEAN RADIO CAPSULES) */}
                <div className="space-y-4 pb-4 border-b border-slate-100">
                  {/* 1. Due Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Due Date</span>
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          disabled={!!editingTask.is_locked && !isProjectAdmin}
                          value={editingTask.due_date ? new Date(editingTask.due_date).toISOString().split("T")[0] : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingTask({
                              ...editingTask,
                              due_date: val ? new Date(val).getTime() : null,
                            });
                          }}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] font-semibold disabled:opacity-75 shadow-2xs"
                        />
                        {editingTask.due_date && !editingTask.is_locked && (
                          <button
                            type="button"
                            onClick={() => setEditingTask({ ...editingTask, due_date: null })}
                            className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Quick Presets */}
                      {!editingTask.is_locked && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date();
                              today.setHours(23, 59, 59, 999);
                              setEditingTask({ ...editingTask, due_date: today.getTime() });
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-zinc-700 rounded-md transition-colors cursor-pointer"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const tom = new Date();
                              tom.setDate(tom.getDate() + 1);
                              tom.setHours(23, 59, 59, 999);
                              setEditingTask({ ...editingTask, due_date: tom.getTime() });
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-zinc-700 rounded-md transition-colors cursor-pointer"
                          >
                            Tomorrow
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextW = new Date();
                              nextW.setDate(nextW.getDate() + 7);
                              nextW.setHours(23, 59, 59, 999);
                              setEditingTask({ ...editingTask, due_date: nextW.getTime() });
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-zinc-700 rounded-md transition-colors cursor-pointer"
                          >
                            +1 Week
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Priority Radio Button Capsules */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Priority</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100/90 rounded-lg border border-slate-200/80">
                      {(["Low", "Medium", "High", "Urgent"] as const).map((pLevel) => {
                        const isSelected = (editingTask.priority || "Medium") === pLevel;
                        return (
                          <button
                            key={pLevel}
                            type="button"
                            disabled={!!editingTask.is_locked && !isProjectAdmin}
                            onClick={() => setEditingTask({ ...editingTask, priority: pLevel })}
                            className={`py-1.5 px-2 rounded-md text-xs font-semibold text-center transition-all cursor-pointer disabled:cursor-not-allowed ${
                              isSelected
                                ? pLevel === "Urgent"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : pLevel === "High"
                                  ? "bg-amber-600 text-white shadow-xs"
                                  : pLevel === "Medium"
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "bg-slate-700 text-white shadow-xs"
                                : "text-zinc-600 hover:text-zinc-950 hover:bg-white/60"
                            }`}
                          >
                            {pLevel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. ATTACHMENTS (UNIFIED & CLEAN, PLACED BELOW PROPERTIES) */}
                {(() => {
                  const attachments = editingTask.attachments || [];
                  const isEditableStatus = editingTask.custom_status === "To-do" || editingTask.custom_status === "In progress";
                  const canEditAttachments = (!editingTask.is_locked || isProjectAdmin) && isEditableStatus;
                  const isReadOnlyStatus = editingTask.custom_status === "In review" || editingTask.custom_status === "Complete";

                  return (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                            Attachments
                          </span>
                          <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 px-1.5 py-0.2 rounded-full">
                            {attachments.length}
                          </span>
                        </div>

                        {canEditAttachments && (
                          <button
                            type="button"
                            onClick={() => handleTriggerUpload()}
                            disabled={!!uploadingStage}
                            className="p-1 text-zinc-400 hover:text-[#0B57D0] hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                            title="Upload attachment"
                          >
                            {uploadingStage ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B57D0]" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Read-only notification if card is in Review or Complete */}
                      {isReadOnlyStatus && (
                        <div className="p-2 rounded-md bg-amber-50/80 border border-amber-200/60 text-[10.5px] text-amber-800 leading-snug flex items-start gap-1.5">
                          <span className="text-xs">🔒</span>
                          <div>
                            <span className="font-semibold">Download only in {editingTask.custom_status}.</span>
                            <span className="text-amber-700 ml-1">Move card back to &quot;In progress&quot; to upload, update, or delete files.</span>
                          </div>
                        </div>
                      )}

                      {/* Unified File List */}
                      <div className="space-y-1.5">
                        {attachments.map((file) => (
                          <div
                            key={file.id}
                            className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors text-xs shadow-2xs"
                          >
                            <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                              <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <FileCode className="w-3.5 h-3.5" />
                              </div>
                              <div className="truncate">
                                <div className="font-semibold text-zinc-900 truncate text-[11px] leading-tight" title={file.name}>
                                  {file.name}
                                </div>
                                <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                                  <span>{file.size}</span>
                                  {file.created_at && (
                                    <span>• {new Date(file.created_at).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {/* Download / Get - Always Available */}
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={file.name}
                                className="px-2 py-1 text-[10.5px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded flex items-center gap-1 transition-colors"
                                title="Download attachment"
                              >
                                <Download className="w-3 h-3" />
                                <span>Get</span>
                              </a>

                              {/* Update / Replace - Available in To-do & In progress */}
                              {canEditAttachments && (
                                <button
                                  type="button"
                                  onClick={() => handleTriggerUpload(file.id)}
                                  className="p-1 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                  title="Update / replace this file"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete - Available in To-do & In progress */}
                              {canEditAttachments && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTaskFile(file)}
                                  className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Delete file"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}

                        {attachments.length === 0 && (
                          <div className="py-5 px-3 border border-dashed border-slate-200 rounded-lg text-center bg-zinc-50/50">
                            <p className="text-xs text-zinc-400">No attachments uploaded yet.</p>
                            {canEditAttachments && (
                              <button
                                type="button"
                                onClick={() => handleTriggerUpload()}
                                className="mt-1.5 text-xs font-semibold text-[#0B57D0] hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Upload className="w-3 h-3" /> Upload a file
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-2.5 border-t border-slate-200 bg-zinc-50 flex items-center justify-between gap-4 shrink-0 relative">
              {/* Left: Assignee Tag & Selector Input */}
              <div className="flex-1 max-w-xl flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 shrink-0">
                  <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Assignee:</span>
                </div>
                {(() => {
                  const selectedAssignees = (editingTask.assigned_to || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);

                  // Strictly show only members in this teamspace project
                  const allCandidates = currentTeamspaceMembers;

                  const query = assigneeSearchQuery.trim().toLowerCase();
                  const filteredPeople = allCandidates.filter((p) => {
                    if (!query) return true;
                    return (p.name || "").toLowerCase().includes(query) || (p.email && p.email.toLowerCase().includes(query));
                  });

                  return (
                    <div className="flex-1 relative min-w-0">
                      <div 
                        onClick={() => setIsAssigneeDropdownOpen(true)}
                        className="min-h-[32px] px-2 py-1 bg-white border border-slate-200 rounded-md focus-within:ring-1 focus-within:ring-[#0B57D0] focus-within:border-[#0B57D0] flex flex-wrap items-center gap-1 cursor-text"
                      >
                        {selectedAssignees.map((name) => {
                          const isMe = isAssigneeCurrentUser(name);
                          return (
                            <span
                              key={name}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80"
                            >
                              <UserIcon className="w-2.5 h-2.5 text-[#0B57D0]" />
                              <span>{formatAssigneeDisplayName(name)}</span>
                              {!editingTask.is_locked && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const next = selectedAssignees.filter((n) => n !== name);
                                    setEditingTask({
                                      ...editingTask,
                                      assigned_to: next.length > 0 ? next.join(", ") : null,
                                    });
                                  }}
                                  className="hover:text-blue-900 text-blue-500 font-bold ml-0.5 text-xs cursor-pointer"
                                  title={`Remove ${name}`}
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          );
                        })}

                        {!editingTask.is_locked && (
                          <input
                            type="text"
                            placeholder={selectedAssignees.length === 0 ? "Assign to project member..." : "+ Add..."}
                            value={assigneeSearchQuery}
                            onFocus={() => setIsAssigneeDropdownOpen(true)}
                            onChange={(e) => {
                              setAssigneeSearchQuery(e.target.value);
                              setIsAssigneeDropdownOpen(true);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Backspace" && !assigneeSearchQuery && selectedAssignees.length > 0) {
                                const next = selectedAssignees.slice(0, -1);
                                setEditingTask({
                                  ...editingTask,
                                  assigned_to: next.length > 0 ? next.join(", ") : null,
                                });
                              } else if (e.key === "Escape") {
                                setIsAssigneeDropdownOpen(false);
                              }
                            }}
                            className="flex-1 min-w-[90px] text-xs text-zinc-800 bg-transparent focus:outline-none placeholder:text-zinc-400"
                          />
                        )}
                      </div>

                      {/* Live Suggestions Dropdown (Opens Above the Footer) */}
                      {isAssigneeDropdownOpen && !editingTask.is_locked && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsAssigneeDropdownOpen(false)}
                          />
                          <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto py-1 animate-in fade-in slide-in-from-bottom-2">
                            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between border-b border-slate-100">
                              <span>Project People ({currentTeamspace?.name || "Teamspace"})</span>
                              <span>{filteredPeople.length}</span>
                            </div>
                            {filteredPeople.map((person) => {
                              const isSelected = selectedAssignees.some(
                                (n) => n.toLowerCase() === (person.name || "").toLowerCase() || (isAssigneeCurrentUser(person.name) && isAssigneeCurrentUser(n))
                              );
                              const isMe = isAssigneeCurrentUser(person.name);

                              return (
                                <button
                                  key={person.id || person.email || person.name}
                                  type="button"
                                  onClick={() => {
                                    const next = isSelected
                                      ? selectedAssignees.filter(
                                          (n) => n.toLowerCase() !== (person.name || "").toLowerCase() && (!isMe || !isAssigneeCurrentUser(n))
                                        )
                                      : [...selectedAssignees, person.name];
                                    setEditingTask({
                                      ...editingTask,
                                      assigned_to: next.length > 0 ? next.join(", ") : null,
                                    });
                                    setAssigneeSearchQuery("");
                                  }}
                                  className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                    isSelected ? "bg-blue-50 text-blue-900 font-semibold" : "hover:bg-zinc-50 text-zinc-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                      {person.name ? person.name[0]?.toUpperCase() : "U"}
                                    </div>
                                    <div className="truncate">
                                      <div className="font-semibold text-zinc-900 truncate flex items-center gap-1.5">
                                        <span>{isMe ? `${person.name} (You)` : person.name}</span>
                                        {person.role && (
                                          <span className="text-[9px] font-normal px-1 py-0.2 bg-zinc-100 border border-zinc-200 rounded text-zinc-500">
                                            {person.role}
                                          </span>
                                        )}
                                      </div>
                                      {person.email && <div className="text-[10px] text-zinc-400 truncate">{person.email}</div>}
                                    </div>
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                                </button>
                              );
                            })}

                            {filteredPeople.length === 0 && (
                              <div className="px-3 py-2 text-center text-xs text-zinc-400">
                                No matching members found in this project.
                              </div>
                            )}

                            {/* Button to Add More People into this Project */}
                            <div className="p-1 border-t border-slate-100 bg-slate-50/70">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAssigneeDropdownOpen(false);
                                  setSelectedDbUserEmail("");
                                  setMemberSearchQuery("");
                                  setNewMemberName("");
                                  setNewMemberEmail("");
                                  setShowMembersModal(true);
                                }}
                                className="w-full px-2.5 py-1.5 text-left text-xs text-[#0B57D0] hover:text-[#0842A0] hover:bg-blue-50/80 font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5 text-[#0B57D0]" />
                                <span>Add New Person to Project...</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Right: Close & Save Changes Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAttemptCloseTask}
                  className="px-4 py-1.5 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditingTask}
                  disabled={!isTaskDirty}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md shadow-xs transition-all ${
                    isTaskDirty
                      ? "bg-[#0B57D0] hover:bg-[#0842A0] text-white cursor-pointer active:scale-95"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-200 shadow-none"
                  }`}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. CREATE / EDIT TEAMSPACE MODAL                          */}
      {/* ========================================================= */}
      {showNewTeamspaceModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-blue-600" />
                <span>{editingTeamspace ? `Edit Teamspace "${editingTeamspace.name}"` : "Create New Teamspace"}</span>
              </h3>
              <button onClick={() => setShowNewTeamspaceModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeamspace} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Teamspace Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  disabled={Boolean(editingTeamspace) && !isProjectAdmin}
                  placeholder="e.g. Marketing, Logistics, Design"
                  value={newTeamspaceName}
                  onChange={(e) => setNewTeamspaceName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Icon Emoji</label>
                <input
                  type="text"
                  maxLength={4}
                  disabled={Boolean(editingTeamspace) && !isProjectAdmin}
                  value={newTeamspaceIcon}
                  onChange={(e) => setNewTeamspaceIcon(e.target.value)}
                  className="w-16 text-center text-lg px-2 py-1 border border-zinc-300 rounded-lg focus:outline-none disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                />
                {(!editingTeamspace || isProjectAdmin) && (
                  <a
                    href="https://getemoji.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    select icon here ↗
                  </a>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                {/* Left side: Pure Flat Icons (Archive & Delete - Option B Disabled Rule) */}
                <div className="flex items-center gap-1">
                  {editingTeamspace && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isProjectAdmin) {
                            showToast("Only Project Managers or Admins can archive this project.", "error");
                            return;
                          }
                          handleToggleArchiveTeamspace(editingTeamspace);
                        }}
                        disabled={!isProjectAdmin}
                        title={
                          !isProjectAdmin
                            ? "Only Project Managers or Admins can archive this project"
                            : editingTeamspace.is_archived === 1
                            ? "Unarchive Teamspace"
                            : "Archive Teamspace"
                        }
                        className={`p-1.5 rounded-md transition-colors ${
                          !isProjectAdmin
                            ? "opacity-35 cursor-not-allowed text-zinc-400"
                            : "text-zinc-400 hover:text-amber-600 cursor-pointer"
                        }`}
                      >
                        {editingTeamspace.is_archived === 1 ? (
                          <ArchiveRestore className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!isProjectOwner) {
                            showToast("Only the project owner or system admin can delete this project.", "error");
                            return;
                          }
                          handlePromptDeleteTeamspace(editingTeamspace);
                        }}
                        disabled={!isProjectOwner}
                        title={
                          !isProjectOwner
                            ? "Only the project owner can delete this project"
                            : "Delete Teamspace"
                        }
                        className={`p-1.5 rounded-md transition-colors ${
                          !isProjectOwner
                            ? "opacity-35 cursor-not-allowed text-zinc-400"
                            : "text-zinc-400 hover:text-rose-600 cursor-pointer"
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Right side: Cancel & Primary Action Button */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTeamspaceModal(false)}
                    className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingTeamspace || (Boolean(editingTeamspace) && !isProjectAdmin)}
                    className="px-4 py-1.5 text-xs font-bold bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {savingTeamspace ? "Saving..." : editingTeamspace ? "Save Changes" : "Create Teamspace"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. CREATE / EDIT MODAL                                    */}
      {/* ========================================================= */}
      {showNewPageModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
                <FilePlus className="w-4 h-4 text-blue-600" />
                <span>
                  {editingPage
                    ? `Edit "${editingPage.title}"`
                    : newPageIsPrivate
                    ? "Create Private Note"
                    : "Create Note / Document"}
                </span>
              </h3>
              <button onClick={() => setShowNewPageModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePage} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Sprint Backlog, SOP Wiki"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Icon</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newPageIcon}
                    onChange={(e) => setNewPageIcon(e.target.value)}
                    className="w-16 text-center text-lg px-2 py-1 border border-zinc-300 rounded-lg focus:outline-none"
                  />
                  <a
                    href="https://getemoji.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    select icon here ↗
                  </a>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Layout</label>
                  <select
                    disabled={Boolean(editingPage)}
                    value={editingPage ? (editingPage.type || "database") : newPageType}
                    onChange={(e) => setNewPageType(e.target.value as any)}
                    className="w-full px-2 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none bg-white disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="database">Kanban Tasks</option>
                    <option value="doc">Document Notes</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewPageModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPage}
                  className="px-4 py-1.5 text-xs font-bold bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg shadow-xs disabled:opacity-50"
                >
                  {savingPage ? "Saving..." : editingPage ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. SHARE & 6-DIGIT PIN GATE MODAL                         */}
      {/* ========================================================= */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-zinc-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-zinc-950">
                  Share &quot;{currentTeamspace?.name || "Project"}&quot;
                </h3>
              </div>
              <button onClick={() => setShowShareModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isPinConfigured ? (
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-900 text-xs flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <div>
                  <span className="font-semibold text-blue-950">Optional PIN Security Gate</span>
                  <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                    Set a 4-digit PIN below if you want guests and collaborators to enter a security PIN before entering this project.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5">
                <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-950">PIN Protection Active</span>
                  <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                    Collaborators opening this link will be prompted to enter your configured security PIN.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Shareable Workspace URL</label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  readOnly
                  onClick={(e) => {
                    (e.target as HTMLInputElement).select();
                    copyShareLink();
                  }}
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/workspace?project=${currentShareTargetId}`}
                  className="w-full h-10 pl-3 pr-10 text-xs bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-lg text-zinc-800 focus:outline-none select-all font-mono cursor-pointer transition-colors"
                  title="Click to copy link"
                />
                <button
                  type="button"
                  onClick={copyShareLink}
                  title={copiedLink ? "Copied!" : "Copy Share Link"}
                  className="absolute right-1.5 p-1.5 rounded-md hover:bg-slate-200 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isPinConfigured && !isEditingPin ? (
              <div className="p-3 bg-zinc-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Configured Project PIN
                  </span>
                  {isProjectAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPin(true);
                        setSharePinInput("");
                        setSharePinConfirmInput("");
                      }}
                      className="text-xs font-semibold text-[#0B57D0] hover:text-[#0842A0] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Change PIN</span>
                    </button>
                  )}
                </div>

                <div 
                  className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg select-none"
                  onMouseEnter={() => setHoverPinRevealed(true)}
                  onMouseLeave={() => setHoverPinRevealed(false)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-widest text-zinc-900 px-1 select-text">
                      {hoverPinRevealed || showPinRevealed ? activeConfiguredPin : "••••••••"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPinRevealed(!showPinRevealed)}
                    onMouseEnter={() => setHoverPinRevealed(true)}
                    onMouseLeave={() => setHoverPinRevealed(false)}
                    title={showPinRevealed ? "Hide PIN" : "Hover or click to display PIN"}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
                  >
                    {showPinRevealed || hoverPinRevealed ? (
                      <EyeOff className="w-4 h-4 text-[#0B57D0]" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Hover over the eye icon or the PIN box to reveal the security PIN.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {isEditingPin && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800">Update Project Security PIN</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPin(false);
                        setSharePinInput("");
                        setSharePinConfirmInput("");
                      }}
                      className="text-xs text-zinc-500 hover:text-zinc-800 hover:underline cursor-pointer"
                    >
                      Cancel change
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">
                      {isEditingPin ? "New Project PIN" : "Project PIN"}
                    </label>
                    <input
                      type="password"
                      placeholder="Enter PIN"
                      value={sharePinInput}
                      onChange={(e) => setSharePinInput(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-10 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700">Re-enter PIN</label>
                    <input
                      type="password"
                      placeholder="Re-enter PIN"
                      value={sharePinConfirmInput}
                      onChange={(e) => setSharePinConfirmInput(e.target.value.replace(/\D/g, ""))}
                      className="w-full h-10 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
              {isPinConfigured && !isEditingPin ? (
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-1.5 text-xs font-bold bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsEditingPin(false);
                      setSharePinInput("");
                      setSharePinConfirmInput("");
                      if (!isPinConfigured) setShowShareModal(false);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveShareSettings}
                    disabled={shareSaving}
                    className="px-4 py-1.5 text-xs font-bold bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {shareSaving ? "Saving..." : isPinConfigured ? "Update PIN" : "Save PIN Settings"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7B. DEDICATED MANAGE PROJECT PEOPLE & COLLABORATORS MODAL */}
      {/* ========================================================= */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl h-[520px] max-h-[520px] min-h-[520px] rounded-2xl shadow-2xl p-6 border border-zinc-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">
                    Project People &amp; Collaborators
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {currentTeamspace?.name || "Company HQ"} • {currentTeamspaceMembers.length} active members
                  </p>
                </div>
              </div>
              <button onClick={() => setShowMembersModal(false)} className="p-1 text-zinc-400 hover:text-zinc-700 rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 2-Column Body */}
            <div className="flex-1 min-h-0 grid grid-cols-2 gap-4 mt-3 overflow-hidden">
              {/* Left Column: Add Person Form */}
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 flex flex-col justify-between h-full min-h-0 overflow-hidden">
                {isProjectAdmin ? (
                  <form onSubmit={handleSaveMember} className="flex flex-col justify-between h-full">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-800">Add Person into Project</span>
                        <div className="flex items-center bg-zinc-200/80 p-0.5 rounded-lg text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setMemberSource("database")}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              memberSource === "database" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-500 hover:text-zinc-900"
                            }`}
                          >
                            From User Database
                          </button>
                          <button
                            type="button"
                            onClick={() => setMemberSource("email")}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              memberSource === "email" ? "bg-white text-zinc-950 shadow-2xs" : "text-zinc-500 hover:text-zinc-900"
                            }`}
                          >
                            Add by Email
                          </button>
                        </div>
                      </div>

                      {memberSource === "database" ? (
                        <div>
                          <label className="text-[11px] font-semibold text-zinc-600 block mb-1">
                            Select Registered User
                          </label>
                          {selectedDbUserEmail ? (
                            <div className="flex items-center justify-between p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-[#0B57D0] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                  {((registeredUsers.find((u) => u.email.toLowerCase() === selectedDbUserEmail.toLowerCase())?.name || selectedDbUserEmail)[0] || "U").toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-zinc-900 truncate">
                                    {registeredUsers.find((u) => u.email.toLowerCase() === selectedDbUserEmail.toLowerCase())?.name || selectedDbUserEmail}
                                  </p>
                                  <p className="text-[11px] text-zinc-500 truncate">{selectedDbUserEmail}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDbUserEmail("");
                                  setMemberSearchQuery("");
                                }}
                                className="px-2 py-0.5 text-[11px] font-semibold text-zinc-600 hover:text-zinc-950 bg-white hover:bg-zinc-100 rounded border border-zinc-200/80 transition-colors shrink-0 cursor-pointer shadow-2xs"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="relative flex items-center">
                                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
                                <input
                                  type="text"
                                  placeholder="Type user name..."
                                  value={memberSearchQuery}
                                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                                  className="w-full pl-8 pr-7 py-2 text-xs bg-white border border-zinc-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                                  autoFocus
                                />
                                {memberSearchQuery && (
                                  <button
                                    type="button"
                                    onClick={() => setMemberSearchQuery("")}
                                    className="absolute right-2 p-0.5 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              {/* Floating Filtered Dropdown Results */}
                              {memberSearchQuery.trim().length > 0 && (() => {
                                const query = memberSearchQuery.trim().toLowerCase();
                                const matches = registeredUsers.filter(
                                  (u) =>
                                    (u.name || "").toLowerCase().includes(query) ||
                                    (u.email || "").toLowerCase().includes(query)
                                );

                                if (matches.length === 0) {
                                  return (
                                    <div className="absolute left-0 right-0 top-full mt-1 z-30 p-2.5 bg-white border border-zinc-200 rounded-lg text-center text-xs text-zinc-500 shadow-lg">
                                      No registered users found matching "{memberSearchQuery}"
                                    </div>
                                  );
                                }

                                return (
                                  <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-44 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-xl divide-y divide-zinc-100">
                                    {matches.map((u) => {
                                      const existingMember = currentTeamspaceMembers.find(
                                        (m) => (m.email || "").toLowerCase() === (u.email || "").toLowerCase()
                                      );
                                      return (
                                        <button
                                          key={u.id || u.email}
                                          type="button"
                                          onClick={() => {
                                            setSelectedDbUserEmail(u.email);
                                            setMemberSearchQuery("");
                                            if (existingMember) {
                                              setNewMemberRole(existingMember.role === "Manager" ? "Member" : "Manager");
                                            }
                                          }}
                                          className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors hover:bg-blue-50/70 cursor-pointer ${
                                            existingMember ? "bg-blue-50/20" : ""
                                          }`}
                                        >
                                          <div className="min-w-0 pr-2">
                                            <p className="text-xs font-semibold text-zinc-900 truncate">{u.name}</p>
                                            <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                                          </div>
                                          <div className="shrink-0 flex items-center gap-1">
                                            {existingMember ? (
                                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                                existingMember.role === "Manager" ? "bg-purple-100 text-purple-800 border-purple-200 font-bold" : "bg-zinc-100 text-zinc-700 border-zinc-200"
                                              }`}>
                                                Current: {existingMember.role}
                                              </span>
                                            ) : (
                                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-[#0B57D0] border border-blue-100">
                                                {u.role || "User"}
                                              </span>
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Full Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. John Tan"
                              value={newMemberName}
                              onChange={(e) => setNewMemberName(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-zinc-600 block mb-1">Email Address</label>
                            <input
                              type="email"
                              required
                              placeholder="collab@partner.com"
                              value={newMemberEmail}
                              onChange={(e) => setNewMemberEmail(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-200/80">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-600 font-semibold">Role:</span>
                        {(() => {
                          const activeEmail = memberSource === "database" ? selectedDbUserEmail : newMemberEmail;
                          const existing = currentTeamspaceMembers.find((m) => (m.email || "").toLowerCase() === (activeEmail || "").toLowerCase());
                          const otherManagers = currentTeamspaceMembers.filter((m) => m.role === "Manager" && (!existing || m.id !== existing.id)).length;
                          return (
                            <select
                              value={newMemberRole}
                              onChange={(e) => setNewMemberRole(e.target.value)}
                              className="px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded-lg font-semibold text-zinc-700 outline-none"
                            >
                              <option value="Manager" disabled={otherManagers >= 3}>
                                Manager {otherManagers >= 3 ? "(Max 3)" : `(${otherManagers}/3)`}
                              </option>
                              <option value="Member">Member</option>
                              <option value="Viewer">Viewer</option>
                            </select>
                          );
                        })()}
                      </div>

                      {(() => {
                        const activeEmail = memberSource === "database" ? selectedDbUserEmail : newMemberEmail;
                        const existing = currentTeamspaceMembers.find((m) => (m.email || "").toLowerCase() === (activeEmail || "").toLowerCase());
                        const isRoleChange = existing && existing.role !== newMemberRole;
                        const isSameRole = existing && existing.role === newMemberRole;

                        return (
                          <button
                            type="submit"
                            disabled={savingMember}
                            className="px-4 py-2 text-xs font-bold bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>
                              {savingMember
                                ? "Saving..."
                                : isRoleChange
                                ? "Update Role"
                                : isSameRole
                                ? "Keep Role"
                                : "Add to Project"}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4 text-zinc-500">
                    <Users className="w-8 h-8 text-zinc-300 mb-2" />
                    <p className="text-xs font-semibold text-zinc-700">Read-only Access</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Only Project Managers and Admins can invite new members to this project.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Assigned Team Members List */}
              <div className="border border-zinc-200/80 rounded-xl p-3.5 bg-white flex flex-col h-full min-h-0 overflow-hidden">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 pb-2 border-b border-zinc-100 shrink-0 flex items-center justify-between">
                  <span>Assigned Team Members</span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 text-[10px] font-bold">
                    {currentTeamspaceMembers.length}
                  </span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 mt-2.5">
                  {currentTeamspaceMembers.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (!isProjectAdmin) return;
                        if (registeredUsers.some((u) => u.email.toLowerCase() === (m.email || "").toLowerCase())) {
                          setMemberSource("database");
                          setSelectedDbUserEmail(m.email);
                        } else {
                          setMemberSource("email");
                          setNewMemberName(m.name);
                          setNewMemberEmail(m.email);
                        }
                        setNewMemberRole(m.role as any || "Member");
                      }}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50/80 hover:bg-zinc-100/90 border border-zinc-200/70 text-xs transition-colors cursor-pointer group"
                      title="Click to edit role"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#0B57D0] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {m.name ? m.name[0].toUpperCase() : "U"}
                        </div>
                        <div className="min-w-0 pr-1">
                          <div className="font-bold text-zinc-900 truncate flex items-center gap-1.5">
                            <span className="truncate">{m.name}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border shrink-0 ${
                              m.role === "Manager" ? "bg-purple-100 text-purple-800 border-purple-200 font-bold" :
                              m.role === "Viewer" ? "bg-zinc-100 text-zinc-600 border-zinc-200" :
                              "bg-blue-50 text-blue-700 border-blue-100"
                            }`}>
                              {m.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate">{m.email}</div>
                        </div>
                      </div>

                      {isProjectAdmin && (m.email || "").toLowerCase() !== projectCreatorEmail.toLowerCase() && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMember(m.id, m.name);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer shrink-0 ml-1"
                          title="Remove member from project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {currentTeamspaceMembers.length === 0 && (
                    <div className="py-12 text-center text-zinc-400 text-xs">
                      No members added to this project yet. Use the form on the left to add team members.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-zinc-100 flex items-center justify-end shrink-0 mt-3">
              <button
                onClick={() => setShowMembersModal(false)}
                className="px-5 py-2 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg cursor-pointer transition-all shadow-2xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. PROJECT SIGN IN MODAL                                  */}
      {/* ========================================================= */}
      {showGateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-7 border border-slate-200 text-center space-y-5 animate-in fade-in zoom-in-95 font-primary">
            <div className="flex justify-center">
              <img
                src="/favicon.ico"
                alt="HSG Global"
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-950">Workspace Sign In</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Enter your email and project PIN to access this workspace.
              </p>
            </div>

            <form onSubmit={handleVerifyGate} className="space-y-3.5 text-left">
              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  value={gateEmail}
                  onChange={(e) => setGateEmail(e.target.value)}
                  className="w-full h-10 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-700 block mb-1">
                  Project PIN
                  {(() => {
                    const tsMatch = teamspaces.find((ts) => ts.id === targetWorkspaceId);
                    const name = tsMatch?.name || (targetWorkspaceId !== "wfe_root" ? targetWorkspaceId : "");
                    return name ? (
                      <span className="text-zinc-400 font-normal ml-1.5 text-[11px]">
                        ({name})
                      </span>
                    ) : null;
                  })()}
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter project PIN"
                  value={gatePin}
                  onChange={(e) => setGatePin(e.target.value)}
                  className="w-full h-10 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] outline-none"
                />
              </div>

              {gateError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-center font-medium">
                  {gateError}
                </div>
              )}

              <button
                type="submit"
                disabled={gateLoading}
                className="w-full h-10 bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-bold rounded-lg transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {gateLoading ? "Verifying Access..." : "Open Workspace"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. WORKING NOTION QUICK SEARCH MODAL (⌘K / Ctrl+K)        */}
      {/* ========================================================= */}
      {showSearchModal && (
        <div
          onClick={() => setShowSearchModal(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-20 p-4 cursor-default"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95"
          >
            {/* Search Input Bar */}
            <div className="p-3 border-b border-zinc-100 flex items-center gap-3">
              <input
                type="text"
                autoFocus
                placeholder="Search pages, documents, and tasks..."
                value={globalSearchInput}
                onChange={(e) => setGlobalSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setShowSearchModal(false);
                  }
                }}
                className="flex-1 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none bg-transparent"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded text-xs cursor-pointer"
              >
                <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-[10px] text-zinc-500 font-mono">ESC</kbd>
              </button>
            </div>

            {/* Live Search Results */}
            <div className="max-h-96 overflow-y-auto p-2 space-y-3">
              {/* Matched Pages */}
              {(() => {
                const query = globalSearchInput.trim().toLowerCase();
                const matchedPages = pages.filter((p) => {
                  if (!query) return true;
                  return p.title.toLowerCase().includes(query);
                });

                if (matchedPages.length === 0 && !query) return null;

                return matchedPages.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1 flex items-center justify-between">
                      <span>Pages & Documents</span>
                      <span className="font-mono text-zinc-400">{matchedPages.length}</span>
                    </div>
                    {matchedPages.slice(0, 10).map((p) => {
                      const ts = teamspaces.find((t) => t.id === p.teamspace_id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setActivePageId(p.id);
                            setShowSearchModal(false);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100/80 cursor-pointer group transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{p.icon || "📄"}</span>
                            <div className="truncate">
                              <div className="text-xs font-semibold text-zinc-900 truncate">{p.title}</div>
                              <div className="text-[10px] text-zinc-400 truncate">
                                {ts ? ts.name : p.is_private ? "Private Page" : "Workspace Page"}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 font-semibold transition-opacity shrink-0 ml-2">
                            Open →
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null;
              })()}

              {/* Matched Tasks & Cards */}
              {(() => {
                const query = globalSearchInput.trim().toLowerCase();
                const matchedTasks = tasks.filter((t) => {
                  if (!query) return false;
                  const titleMatch = t.title.toLowerCase().includes(query);
                  const assignMatch = (t.assigned_to || "").toLowerCase().includes(query);
                  const statusMatch = (t.custom_status || "").toLowerCase().includes(query);
                  const tagsMatch = (t.tags || []).some((tag) => tag.toLowerCase().includes(query));
                  const blocksMatch = (t.blocks || []).some((b) => (b.content || "").toLowerCase().includes(query));
                  return titleMatch || assignMatch || statusMatch || tagsMatch || blocksMatch;
                });

                if (matchedTasks.length === 0) return null;

                return (
                  <div className="space-y-1 pt-2 border-t border-zinc-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1 flex items-center justify-between">
                      <span>Tasks, Notes & Blocks</span>
                      <span className="font-mono text-zinc-400">{matchedTasks.length}</span>
                    </div>
                    {matchedTasks.slice(0, 12).map((t) => {
                      const parentPage = pages.find((p) => p.id === t.page_id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            if (t.page_id) setActivePageId(t.page_id);
                            handleOpenEditingTask(t);
                            setShowSearchModal(false);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100/80 cursor-pointer group transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <div className="truncate">
                              <div className="text-xs font-semibold text-zinc-900 truncate flex items-center gap-1.5">
                                <span>{t.title}</span>
                                <span className="text-[10px] font-normal px-1.5 py-0.2 bg-zinc-100 border border-zinc-200 rounded text-zinc-600">
                                  {t.custom_status}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400 truncate">
                                {parentPage ? parentPage.title : "Workspace"} {t.assigned_to ? `• ${t.assigned_to.split(",").map((s) => formatAssigneeDisplayName(s.trim())).filter(Boolean).join(", ")}` : ""}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-blue-600 opacity-0 group-hover:opacity-100 font-semibold transition-opacity shrink-0 ml-2">
                            Open Card →
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Empty State */}
              {globalSearchInput.trim() &&
                pages.filter((p) => p.title.toLowerCase().includes(globalSearchInput.toLowerCase())).length === 0 &&
                tasks.filter((t) => {
                  const q = globalSearchInput.toLowerCase();
                  return (
                    t.title.toLowerCase().includes(q) ||
                    (t.assigned_to || "").toLowerCase().includes(q) ||
                    (t.custom_status || "").toLowerCase().includes(q) ||
                    (t.tags || []).some((tag) => tag.toLowerCase().includes(q)) ||
                    (t.blocks || []).some((b) => (b.content || "").toLowerCase().includes(q))
                  );
                }).length === 0 && (
                  <div className="py-12 text-center text-zinc-400 text-xs">
                    No matching pages, tasks, or documents found for &quot;{globalSearchInput}&quot;
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 10. CUSTOM TYPE-TO-CONFIRM DELETE MODAL (STRICT NO BROWSER DIALOG) */}
      {/* ========================================================= */}
      {confirmDelete && confirmDelete.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 font-primary">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-bold text-zinc-950">{confirmDelete.title}</h3>
              </div>
              <button
                onClick={() => setConfirmDelete(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-zinc-600 leading-relaxed">
                This action is permanent and cannot be undone. All documents, tasks, and attachments associated with{" "}
                <span className="font-bold text-zinc-900">&quot;{confirmDelete.itemName}&quot;</span> will be permanently deleted.
              </p>

              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-1.5">
                <label className="text-xs text-rose-900 font-semibold block">
                  To confirm, type <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-rose-300 text-rose-700 select-all font-bold">{confirmDelete.expectedPhrase}</span> below:
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder={`Type ${confirmDelete.expectedPhrase}`}
                  value={confirmDeleteInput}
                  onChange={(e) => setConfirmDeleteInput(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-white border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 outline-none font-mono"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmDeleteInput.trim() !== confirmDelete.expectedPhrase || confirmDeleteLoading}
                onClick={confirmDelete.onConfirm}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
              >
                {confirmDeleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 12. TASK ACTIVITY TIMELINE LOG DRAWER                     */}
      {/* ========================================================= */}
      {activeLogDrawerTask && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setActiveLogDrawerTask(null)}
        >
          <div
            className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 font-primary cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <History className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-zinc-900 truncate">Activity Timeline</h2>
                  <p className="text-xs text-zinc-500 truncate mt-0.5 font-normal">{activeLogDrawerTask.title}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveLogDrawerTask(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                title="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {(!activeLogDrawerTask.logs || activeLogDrawerTask.logs.length === 0) ? (
                <div className="text-center py-16 text-zinc-400 space-y-2">
                  <History className="w-8 h-8 mx-auto text-zinc-300 stroke-1" />
                  <p className="text-xs font-medium">No activity history recorded yet.</p>
                  <p className="text-[11px] text-zinc-400">Actions on this card will be tracked here automatically.</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
                  {(activeLogDrawerTask.logs || []).map((log, index) => {
                    const dateStr = log.timestamp
                      ? new Date(log.timestamp).toLocaleString("en-SG", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "Just now";

                    return (
                      <div key={log.id || index} className="relative group">
                        {/* Timeline Dot */}
                        <span className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-blue-600 ring-4 ring-white" />

                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-zinc-850 leading-snug">
                              {log.action}
                            </span>
                            <span className="text-[11px] text-zinc-400 shrink-0 font-normal">
                              {dateStr}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-normal">
                            <span className="text-blue-600 font-medium">{log.actionBy || "System"}</span>
                            {log.remark && (
                              <>
                                <span className="text-zinc-300">•</span>
                                <span className="text-zinc-500 text-[11px]">{log.remark}</span>
                              </>
                            )}
                          </div>

                          {log.photoUrl && (
                            <div className="mt-2">
                              <a
                                href={log.photoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity"
                              >
                                <img
                                  src={log.photoUrl}
                                  alt="Attachment Proof"
                                  className="max-h-32 object-cover"
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-[11px] text-zinc-500 font-normal">
              <span>Total Activities: {activeLogDrawerTask.logs?.length || 0}</span>
              <button
                onClick={() => setActiveLogDrawerTask(null)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-zinc-700 font-medium rounded-lg text-xs cursor-pointer shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 13. ARCHIVED PROJECTS MODAL DIALOG                        */}
      {/* ========================================================= */}
      {showArchiveModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowArchiveModal(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-zinc-200 space-y-4 font-primary cursor-default animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">
                    Archived Projects
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {archivedTeamspaces.length} archived {archivedTeamspaces.length === 1 ? "project" : "projects"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowArchiveModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {archivedTeamspaces.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 space-y-2">
                  <Archive className="w-8 h-8 mx-auto text-zinc-300 stroke-1" />
                  <p className="text-xs font-medium">No archived projects</p>
                  <p className="text-[11px] text-zinc-400">
                    Projects you archive from project settings will appear here and can be restored at any time.
                  </p>
                </div>
              ) : (
                archivedTeamspaces.map((ts) => {
                  const pagesCount = pages.filter((p) => p.teamspace_id === ts.id).length;
                  const tasksCount = tasks.filter((t) => t.teamspace_id === ts.id).length;

                  return (
                    <div
                      key={ts.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs hover:border-zinc-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0">{ts.icon || "📁"}</span>
                        <div className="truncate">
                          <div className="font-bold text-zinc-900 truncate flex items-center gap-1.5">
                            <span>{ts.name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200 rounded">
                              Archived
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {pagesCount} {pagesCount === 1 ? "note" : "notes"} • {tasksCount} {tasksCount === 1 ? "task" : "tasks"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isProjectAdmin) {
                              showToast("Only Project Managers or Admins can restore projects.", "error");
                              return;
                            }
                            handleToggleArchiveTeamspace(ts);
                          }}
                          disabled={!isProjectAdmin}
                          title={!isProjectAdmin ? "Only Managers can restore projects" : "Restore to Workspace"}
                          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            !isProjectAdmin
                              ? "opacity-35 cursor-not-allowed bg-zinc-100 text-zinc-400 border-zinc-200"
                              : "bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 shadow-2xs cursor-pointer"
                          }`}
                        >
                          <ArchiveRestore className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!isProjectOwner) {
                              showToast("Only the project owner or system admin can delete this project.", "error");
                              return;
                            }
                            handlePromptDeleteTeamspace(ts);
                          }}
                          disabled={!isProjectOwner}
                          title={!isProjectOwner ? "Only project owner can delete" : "Permanently Delete"}
                          className={`p-1.5 rounded-lg border transition-all ${
                            !isProjectOwner
                              ? "opacity-35 cursor-not-allowed text-zinc-400 border-zinc-200"
                              : "text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-200 cursor-pointer"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-zinc-100 flex items-center justify-end">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 13. CONNECT WORKSPACE TO AGENT AI MODAL                   */}
      {/* ========================================================= */}
      {showAiModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowAiModal(false)}
        >
          <div
            className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 font-primary cursor-default max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-950">Connect Workspace to Agent AI</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Manage your live workspace directly with iBuddy, or connect your outside chat AI.
                </p>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: 2-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {/* LEFT COLUMN: iBuddy (Built-in Workspace AI) */}
              <div className="bg-gradient-to-b from-blue-50/70 via-white to-slate-50/50 border border-blue-200/80 rounded-xl p-4 flex flex-col justify-between space-y-4 shadow-xs">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-[#0B57D0] text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-zinc-950">iBuddy</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">
                          Built-in • Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 mt-1 font-medium">
                        Use iBuddy — iBuddy can do anything across your workspace and operations.
                      </p>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-2">
                    <div className="bg-white/90 p-3 rounded-lg border border-blue-100 space-y-2 text-[11.5px] text-zinc-700 leading-relaxed">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#0B57D0] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-zinc-900 font-semibold">Zero Setup Required:</strong> Ready out of the box directly inside iB — no tokens, URLs, or external setups needed.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-zinc-900 font-semibold">Full Workspace Intelligence:</strong> Read, create, update, and organize cards and documents across your boards.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-zinc-900 font-semibold">Cross-System Operations:</strong> Check TikTok fulfillment, driver deliveries, inventory, and pending orders in real-time.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-100/80">
                  <a
                    href="/"
                    className="w-full flex items-center justify-center gap-1.5 h-8.5 px-3 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Open Dashboard & Ask iBuddy</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
                  </a>
                </div>
              </div>

              {/* RIGHT COLUMN: Outside Chat AI / External Agents */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-900">Outside Chat AI</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                          External Agent
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        If you prefer to use outside chat AI, copy this URL or pre-prompt.
                      </p>
                    </div>
                  </div>

                  {/* Field 1: Live AI Endpoint URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                      <span>1. Live AI Endpoint Link</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={`https://ib-v2.hsgglobalpteltd.workers.dev/api/wfe/ai-bridge?token=${aiToken || "..."}`}
                        className="w-full h-8 pl-2.5 pr-20 text-[11px] font-mono bg-white border border-slate-200 rounded-lg select-all focus:outline-none text-zinc-800"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const link = `https://ib-v2.hsgglobalpteltd.workers.dev/api/wfe/ai-bridge?token=${aiToken}`;
                          navigator.clipboard.writeText(link);
                          setCopiedAiLink(true);
                          setTimeout(() => setCopiedAiLink(false), 2000);
                          showToast("AI Endpoint Link copied!", "success");
                        }}
                        className="absolute right-1 px-2 py-1 text-[10.5px] font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded border border-zinc-300/80 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {copiedAiLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedAiLink ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Field 2: Pre-Prompt */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-zinc-700">
                        2. Pre-Prompt (Copy &amp; Paste to AI Chat / Agent)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const promptText = `You are my iB Workspace AI Assistant.\nLive API: https://ib-v2.hsgglobalpteltd.workers.dev/api/wfe/ai-bridge?token=${aiToken}\n\n- READ: HTTP GET to the endpoint above.\n- WRITE (Create/Update/Delete projects, boards, tasks, docs): Execute HTTP POST to the endpoint above using JSON body: {"action": "<name>", ...params}.\n- Guardrails: You cannot assign people to tasks or manage members.\n\nFetch my live workspace data from the endpoint now and summarize my active tasks.`;
                          navigator.clipboard.writeText(promptText);
                          setCopiedAiPrompt(true);
                          setTimeout(() => setCopiedAiPrompt(false), 2000);
                          showToast("Pre-prompt copied to clipboard!", "success");
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#0B57D0] hover:text-[#0842A0] cursor-pointer"
                      >
                        {copiedAiPrompt ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedAiPrompt ? "Copied!" : "Copy Pre-Prompt"}</span>
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={3}
                      value={`You are my iB Workspace AI Assistant.\nLive API: https://ib-v2.hsgglobalpteltd.workers.dev/api/wfe/ai-bridge?token=${aiToken}\n\n- READ: HTTP GET to the endpoint above.\n- WRITE (Create/Update/Delete projects, boards, tasks, docs): Execute HTTP POST to the endpoint above using JSON body: {"action": "<name>", ...params}.\n- Guardrails: You cannot assign people to tasks or manage members.\n\nFetch my live workspace data from the endpoint now and summarize my active tasks.`}
                      className="w-full p-2.5 text-[11px] leading-relaxed font-mono bg-white border border-slate-200 rounded-lg select-all focus:outline-none text-zinc-800 resize-none"
                    />
                  </div>

                  {/* Field 3: OpenAPI Schema URL (Optional) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-600 flex items-center justify-between">
                      <span>3. OpenAPI Schema URL (For Actions / GPTs / Tools)</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        readOnly
                        value={`https://ib-v2.hsgglobalpteltd.workers.dev/api/wfe/ai-bridge/openapi.json?token=${aiToken || "..."}`}
                        className="w-full h-7 pl-2.5 pr-16 text-[10.5px] font-mono bg-white border border-slate-200 rounded-lg select-all focus:outline-none text-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const openApiUrl = `https://ib-v2.hsgglobalpteltd.workers.dev/api/wfe/ai-bridge/openapi.json?token=${aiToken}`;
                          navigator.clipboard.writeText(openApiUrl);
                          setCopiedOpenApi(true);
                          setTimeout(() => setCopiedOpenApi(false), 2000);
                          showToast("OpenAPI Schema URL copied!", "success");
                        }}
                        className="absolute right-1 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded border border-zinc-300/80 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {copiedOpenApi ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                        <span>{copiedOpenApi ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleRegenerateAiToken}
                disabled={aiRegenerating || aiTokenLoading}
                className="text-xs font-semibold text-zinc-600 hover:text-rose-600 flex items-center gap-1.5 py-1.5 px-2.5 rounded-md hover:bg-zinc-100 transition-colors disabled:opacity-40 cursor-pointer"
                title="Invalidates current token and generates a new one"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${aiRegenerating ? "animate-spin text-blue-600" : ""}`} />
                <span>{aiRegenerating ? "Generating..." : "Regenerate Token"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-4 py-1.5 text-xs font-bold bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg shadow-xs transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
