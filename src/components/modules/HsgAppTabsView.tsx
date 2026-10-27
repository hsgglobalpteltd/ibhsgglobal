"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Calendar,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Archive,
  Upload,
  RotateCcw,
  Award,
  ArrowUp,
  ArrowDown,
  Clock,
  MapPin,
  Pin,
  Check,
  Users,
  Wallet,
  ShoppingBag,
  Image as ImageIcon,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Filter,
  RefreshCw,
  QrCode,
  Download,
  ExternalLink,
  Smartphone,
  Bell,
  Wifi,
  Battery,
  Share2,
  Heart,
  Lock,
  Trophy,
} from "lucide-react";
import { showToast } from "@/lib/toast";
import { compressImageFile } from "@/lib/imageCompressor";

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

export function maskPhoneLast4(phone: string | number | undefined | null): string {
  if (!phone) return "-";
  const str = String(phone).trim();
  if (str.length <= 4) return str;
  return "..." + str.slice(-4);
}


export interface ContestQuestionItem {
  id: string;
  label: string;
  type: "text" | "photo_upload" | "radio_select" | "multi_select" | "range_number";
  options?: string[];
  required?: boolean;
}

export interface HsgContestPrize {
  id: string;
  title: string;
  description?: string;
  photo_url?: string;
  reward_type: "point" | "cashback" | "product" | "both" | "combo";
  reward_cash?: number;
  reward_points?: number;
  product_id?: string;
  product_name?: string;
  product_image?: string;
  max_pax: number;
}

export interface HsgContestWinner {
  id: string;
  contest_id: string;
  prize_id: string;
  prize_title: string;
  prize_description?: string;
  prize_photo_url?: string;
  reward_type: "point" | "cashback" | "product" | "both" | "combo";
  reward_cash?: number;
  reward_points?: number;
  product_id?: string;
  product_name?: string;
  product_image?: string;
  delivery_address?: string;
  claim_channel?: string;
  awaiting_address?: boolean;
  user_id: string;
  user_phone: string;
  user_nickname: string;
  submission_id?: string;
  status: "pending_claim" | "claimed";
  claimed: boolean;
  claimed_at?: number;
  created_at: number;
}

export interface HsgContestRecord {
  id: string;
  title: string;
  internal_title?: string;
  frontpage_title?: string;
  frontpage_description?: string;
  frontpage_poster_url?: string;
  start_timestamp: number;
  end_timestamp: number;
  is_published: boolean;
  is_archived: boolean;
  poster_images: string[];
  inside_posters?: string[];
  inside_description?: string;
  inside_instruction?: string;
  reward_points?: number;
  max_per_user?: number;
  max_total?: number;
  required_event_id?: string | null;
  requirement_note?: string;
  extra_questions?: Array<{
    id: string;
    question: string;
    type?: "text" | "radio";
    options?: string[];
    required?: boolean;
  }>;
  prizes?: HsgContestPrize[];
  winners_announced?: boolean;
  frontpage_config: {
    title?: string;
    description?: string;
    cover_photo_url?: string;
  };
  submission_limits: {
    max_per_user?: number;
    total_cap?: number;
    points_per_submission?: number;
  };
  submission_questions: ContestQuestionItem[];
  created_at: number;
  updated_at: number;
}

export interface HsgContestSubmission {
  id: string;
  contest_id: string;
  user_id?: string;
  user_phone: string;
  user_nickname: string;
  status: "submitted" | "approved" | "winner" | "rejected";
  receipt_photo_url?: string;
  amount_paid?: number;
  items_count?: number;
  points_awarded?: number;
  extra_answers?: Record<string, any>;
  answer_json: Record<string, any>;
  reject_reason?: string;
  winner_data: {
    is_winner?: boolean;
    prize_note?: string;
    awarded_at?: number;
    rejection_reason?: string;
  };
  created_at: number;
  updated_at: number;
}

export interface HsgWithdrawalRecord {
  id: string;
  user_id?: string;
  user_phone: string;
  user_phone_last4?: string;
  user_nickname: string;
  paynow_number: string;
  amount: number;
  status: "requested" | "completed" | "rejected";
  claim_ids: string[];
  payout_proof: {
    reference_no?: string;
    paid_by?: string;
    paid_at?: number;
    remark?: string;
  };
  rejection_reason?: string;
  created_at: number;
  updated_at: number;
}

export interface HsgUserRecord {
  id?: string;
  phone_number: string;
  phone_last4?: string;
  raw_phone?: string;
  nickname: string;
  paynow_number: string;
  wallet_balance: number;
  points_balance?: number;
  weekly_streak: number;
  referral_code?: string;
  referred_by?: string;
  referred_by_phone?: string;
  is_blocked?: boolean;
  privacy?: {
    mode?: boolean;
    phone?: string;
  };
  logs?: Array<{
    action: string;
    action_by: string;
    timestamp: number;
    changes?: Record<string, any>;
    note?: string;
  }>;
  social_handles: {
    tt?: string;
    fb?: string;
    thread?: string;
    ig?: string;
    points_balance?: number;
    referral_code?: string;
    referred_by?: string;
    referred_by_phone?: string;
  };
  created_at: number;
  updated_at: number;
}

export interface HsgAnnouncementRecord {
  id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  is_hidden?: boolean;
  created_at: number;
}

export interface HsgHighlightRecord {
  id: string;
  brand_name: string;
  title: string;
  subtitle: string;
  image_url: string;
  post_url?: string;
  external_link?: string;
  order_seq: number;
  is_hidden?: boolean;
  created_at: number;
}

export interface HsgEventRecord {
  id: string;
  title: string;
  category: string;
  description: string;
  requirement_text?: string;
  brands_involved?: string[];
  fee_amount?: number;
  fee_points?: number;
  duration_hours?: number;
  reward_points?: number;
  outcome_url?: string;
  banner_url: string;
  date_timestamp: number;
  location_name: string;
  location_address: string;
  max_capacity: number;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export interface HsgEventRsvpRecord {
  id: string;
  event_id: string;
  user_phone: string;
  user_nickname: string;
  status: string;
  checked_in_at: number;
  created_at: number;
}

export interface HsgMerchRecord {
  id: string;
  name: string;
  category?: "Product" | "Merch";
  redeem_mode?: "both" | "points_only" | "cashback_only";
  image_url: string;
  price_cashback: number;
  price_points?: number;
  stock_qty: number;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

// Helper to upload image to storage with automatic client-side compression
async function uploadAssetFile(file: File, folder = "hsgplus"): Promise<string> {
  const toUpload = await compressImageFile(file, { maxDimension: 1400, quality: 0.82 });
  const cleanName = (toUpload.name || file.name).replace(/[^a-zA-Z0-9.-]/g, "_");
  const fileName = `${folder}/${Date.now()}_${cleanName}`;
  const res = await fetch(
    `${WORKER_URL}/api/upload?filename=${encodeURIComponent(fileName)}`,
    {
      method: "POST",
      headers: { "Content-Type": toUpload.type || "image/jpeg" },
      body: toUpload,
    }
  );
  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  if (!data.url) throw new Error("No URL returned");
  return data.url;
}

function toDatetimeLocal(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatDateTime(ts: number | string | any): string {
  if (!ts) return "-";
  const num = Number(ts);
  const d = !isNaN(num) && num > 0 ? new Date(num) : new Date(ts);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(ts: number | string | any): string {
  if (!ts) return "-";
  const num = Number(ts);
  const d = !isNaN(num) && num > 0 ? new Date(num) : new Date(ts);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ============================================================================
// 1. CONTEST TAB VIEW
// ============================================================================
export function HsgContestTab({
  contests,
  submissions,
  winners = [],
  events = [],
  merchCatalog = [],
  loading,
  onRefresh,
  openCreateTrigger,
}: {
  contests: HsgContestRecord[];
  submissions: HsgContestSubmission[];
  winners?: HsgContestWinner[];
  events?: any[];
  merchCatalog?: any[];
  loading: boolean;
  onRefresh: () => void;
  openCreateTrigger?: number;
}) {
  // 0ms Optimistic Local State
  const [localContests, setLocalContests] = React.useState<HsgContestRecord[]>(contests || []);
  const [localSubmissions, setLocalSubmissions] = React.useState<HsgContestSubmission[]>(submissions || []);
  const [localWinners, setLocalWinners] = React.useState<HsgContestWinner[]>(winners || []);

  React.useEffect(() => { setLocalContests(contests || []); }, [contests]);
  React.useEffect(() => { setLocalSubmissions(submissions || []); }, [submissions]);
  React.useEffect(() => { setLocalWinners(winners || []); }, [winners]);

  // Navigation & Sub-tab: "submissions" vs "winners"
  const [activeSubTab, setActiveSubTab] = React.useState<"submissions" | "winners">("submissions");
  const [leftTab, setLeftTab] = React.useState<"active" | "archive">("active");
  const [selectedContestId, setSelectedContestId] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "pending" | "approved" | "rejected">("ALL");

  // Inspect Submission Modal
  const [inspectSub, setInspectSub] = React.useState<HsgContestSubmission | null>(null);
  const [rejectReason, setRejectReason] = React.useState<string>("");
  const [processingSubId, setProcessingSubId] = React.useState<string | null>(null);
  const [zoomReceipt, setZoomReceipt] = React.useState<boolean>(false);

  // Contest Create / Edit Modal
  const [showModal, setShowModal] = React.useState<boolean>(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<boolean>(false);

  // Form Fields
  const [internalTitle, setInternalTitle] = React.useState<string>("");
  const [fpTitle, setFpTitle] = React.useState<string>("");
  const [fpDesc, setFpDesc] = React.useState<string>("");
  const [fpPhoto, setFpPhoto] = React.useState<string>("");
  const [insidePosters, setInsidePosters] = React.useState<string[]>([]);
  const [insideDesc, setInsideDesc] = React.useState<string>("");
  const [insideInstruction, setInsideInstruction] = React.useState<string>("");
  const [startDt, setStartDt] = React.useState<string>("");
  const [endDt, setEndDt] = React.useState<string>("");
  const [rewardPoints, setRewardPoints] = React.useState<number>(10);
  const [maxPerUser, setMaxPerUser] = React.useState<number>(1);
  const [maxTotal, setMaxTotal] = React.useState<number>(0);
  const [reqEventId, setReqEventId] = React.useState<string>("");
  const [reqNote, setReqNote] = React.useState<string>("");
  const [isPublished, setIsPublished] = React.useState<boolean>(true);
  const [extraQuestions, setExtraQuestions] = React.useState<Array<{ id: string; question: string }>>([]);
  const [prizes, setPrizes] = React.useState<HsgContestPrize[]>([]);

  const [uploadingFpPhoto, setUploadingFpPhoto] = React.useState<boolean>(false);
  const [uploadingPosters, setUploadingPosters] = React.useState<boolean>(false);
  const [uploadingPrizeIdx, setUploadingPrizeIdx] = React.useState<number | null>(null);

  // Assign Winner Modal
  const [showAssignModal, setShowAssignModal] = React.useState<boolean>(false);
  const [assignContestId, setAssignContestId] = React.useState<string>("");
  const [assignPrizeId, setAssignPrizeId] = React.useState<string>("");
  const [assignUserKey, setAssignUserKey] = React.useState<string>("");
  const [assignUserSearch, setAssignUserSearch] = React.useState<string>("");
  const [assigningWinner, setAssigningWinner] = React.useState<boolean>(false);

  // Delete & Toggles
  const [contestToDelete, setContestToDelete] = React.useState<HsgContestRecord | null>(null);
  const [deletingWinnerId, setDeletingWinnerId] = React.useState<string | null>(null);
  const [togglingAnnounce, setTogglingAnnounce] = React.useState<boolean>(false);
  const [togglingArchive, setTogglingArchive] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (openCreateTrigger && openCreateTrigger > 0) {
      handleOpenModal();
    }
  }, [openCreateTrigger]);

  const handleOpenModal = (prefill?: HsgContestRecord) => {
    if (prefill) {
      setEditingId(prefill.id);
      setInternalTitle(prefill.internal_title || prefill.title || "");
      setFpTitle(prefill.frontpage_title || prefill.frontpage_config?.title || prefill.title || "");
      setFpDesc(prefill.frontpage_description || prefill.frontpage_config?.description || "");
      setFpPhoto(prefill.frontpage_poster_url || prefill.frontpage_config?.cover_photo_url || "");
      setInsidePosters(
        Array.isArray(prefill.inside_posters) && prefill.inside_posters.length > 0
          ? prefill.inside_posters
          : Array.isArray(prefill.poster_images)
          ? prefill.poster_images
          : []
      );
      setInsideDesc(prefill.inside_description || "");
      setInsideInstruction(prefill.inside_instruction || "");
      setStartDt(toDatetimeLocal(prefill.start_timestamp));
      setEndDt(toDatetimeLocal(prefill.end_timestamp));
      setRewardPoints(
        Number(prefill.reward_points ?? prefill.submission_limits?.points_per_submission ?? 10)
      );
      setMaxPerUser(Number(prefill.max_per_user ?? prefill.submission_limits?.max_per_user ?? 1));
      setMaxTotal(Number(prefill.max_total ?? prefill.submission_limits?.total_cap ?? 0));
      setReqEventId(prefill.required_event_id || "");
      setReqNote(prefill.requirement_note || "");
      setIsPublished(Boolean(prefill.is_published));
      setExtraQuestions(
        Array.isArray(prefill.extra_questions)
          ? prefill.extra_questions.map((q) => ({ id: q.id, question: q.question }))
          : []
      );
      setPrizes(Array.isArray(prefill.prizes) ? prefill.prizes : []);
    } else {
      const now = Date.now();
      setEditingId(null);
      setInternalTitle("");
      setFpTitle("");
      setFpDesc("");
      setFpPhoto("");
      setInsidePosters([]);
      setInsideDesc("");
      setInsideInstruction("");
      setStartDt(toDatetimeLocal(now));
      setEndDt(toDatetimeLocal(now + 7 * 86400000));
      setRewardPoints(10);
      setMaxPerUser(1);
      setMaxTotal(0);
      setReqEventId("");
      setReqNote("");
      setIsPublished(true);
      setExtraQuestions([]);
      setPrizes([]);
    }
    setShowModal(true);
  };

  const handleUploadFpPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFpPhoto(true);
    try {
      const url = await uploadAssetFile(file, "hsgplus_contest_fp");
      setFpPhoto(url);
      showToast("Frontpage poster uploaded", "success");
    } catch (err: any) {
      showToast(err.message || "Upload failed", "error");
    } finally {
      setUploadingFpPhoto(false);
    }
  };

  const handleUploadInsidePosters = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    if (insidePosters.length + files.length > 8) {
      showToast("Maximum 8 inside posters allowed", "error");
      return;
    }
    setUploadingPosters(true);
    try {
      const uploadedUrls: string[] = [];
      for (const f of files) {
        const u = await uploadAssetFile(f, "hsgplus_contest_posters");
        uploadedUrls.push(u);
      }
      setInsidePosters((prev) => [...prev, ...uploadedUrls].slice(0, 8));
      showToast(`Uploaded ${uploadedUrls.length} poster(s)`, "success");
    } catch (err: any) {
      showToast(err.message || "Upload failed", "error");
    } finally {
      setUploadingPosters(false);
    }
  };

  const handleUploadPrizePhoto = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPrizeIdx(idx);
    try {
      const url = await uploadAssetFile(file, "hsgplus_contest_prizes");
      setPrizes((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, photo_url: url } : p))
      );
      showToast("Prize photo uploaded", "success");
    } catch (err: any) {
      showToast(err.message || "Upload failed", "error");
    } finally {
      setUploadingPrizeIdx(null);
    }
  };

  const handleSaveContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalTitle.trim()) {
      showToast("Please enter an internal Contest Title", "error");
      return;
    }
    setSaving(true);
    try {
      const startMs = startDt ? new Date(startDt).getTime() : Date.now();
      const endMs = endDt ? new Date(endDt).getTime() : startMs + 7 * 86400000;

      const payload = {
        id: editingId || undefined,
        title: internalTitle.trim(),
        internal_title: internalTitle.trim(),
        frontpage_title: fpTitle.trim() || internalTitle.trim(),
        frontpage_description: fpDesc.trim(),
        frontpage_poster_url: fpPhoto || insidePosters[0] || "",
        start_timestamp: startMs,
        end_timestamp: endMs,
        is_published: isPublished,
        is_archived: false,
        poster_images: insidePosters.slice(0, 8),
        inside_posters: insidePosters.slice(0, 8),
        inside_description: insideDesc.trim(),
        inside_instruction: insideInstruction.trim(),
        reward_points: Number(rewardPoints || 0),
        max_per_user: Number(maxPerUser || 1),
        max_total: Number(maxTotal || 0),
        required_event_id: reqEventId || null,
        requirement_note: reqNote.trim(),
        extra_questions: extraQuestions.slice(0, 5).map((q, idx) => ({
          id: q.id || `q_${idx + 1}`,
          question: q.question.trim(),
        })),
        prizes: prizes.slice(0, 10).map((p, idx) => ({
          id: p.id || `prz_${idx + 1}`,
          title: p.title || `Prize #${idx + 1}`,
          description: p.description || "",
          photo_url: p.photo_url || "",
          reward_type: p.reward_type || "point",
          reward_cash: Number(p.reward_cash || 0),
          reward_points: Number(p.reward_points || 0),
          product_id: p.product_id || null,
          product_name: p.product_name || null,
          product_image: p.product_image || null,
          max_pax: Number(p.max_pax || 1),
        })),
        frontpage_config: {
          title: fpTitle.trim() || internalTitle.trim(),
          description: fpDesc.trim(),
          cover_photo_url: fpPhoto || insidePosters[0] || "",
        },
        submission_limits: {
          max_per_user: Number(maxPerUser || 1),
          total_cap: Number(maxTotal || 0),
          points_per_submission: Number(rewardPoints || 0),
        },
        submission_questions: extraQuestions.map((q, idx) => ({
          id: q.id || `q_${idx + 1}`,
          label: q.question,
          type: "text",
          required: false,
        })),
      };

      // 0ms Optimistic Update
      const targetId = editingId || `CONT-${Date.now().toString().slice(-6)}`;
      const optimisticPayload: any = {
        ...payload,
        id: targetId,
        created_at: Date.now(),
      };
      const prevContestsSnapshot = [...localContests];
      if (editingId) {
        setLocalContests((prev) =>
          prev.map((item) => (item.id === editingId ? { ...item, ...optimisticPayload } : item))
        );
      } else {
        setLocalContests((prev) => [optimisticPayload, ...prev]);
        setSelectedContestId(targetId);
      }
      showToast("Contest saved successfully", "success");
      setShowModal(false);

      // Silent background sync
      try {
        const res = await fetch(`${WORKER_URL}/api/hsg-app/contests`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(optimisticPayload),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.message || "Failed to save contest");
        onRefresh();
      } catch (err: any) {
        setLocalContests(prevContestsSnapshot);
        showToast(err.message || "Failed to save contest to server", "error");
      } finally {
        setSaving(false);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to prepare contest", "error");
      setSaving(false);
    }
  };

  const handleDeleteContest = async () => {
    if (!contestToDelete) return;
    const prevContestsSnapshot = [...localContests];
    setLocalContests((prev) => prev.filter((item) => item.id !== contestToDelete.id));
    if (selectedContestId === contestToDelete.id) setSelectedContestId("ALL");
    setContestToDelete(null);
    showToast("Contest deleted", "success");

    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/contests/${encodeURIComponent(contestToDelete.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      onRefresh();
    } catch (err: any) {
      setLocalContests(prevContestsSnapshot);
      showToast(err.message || "Delete failed on server", "error");
    }
  };

  // Toggle Archive
  const handleToggleArchive = async (c: HsgContestRecord) => {
    const nextArchived = !c.is_archived;
    setLocalContests((prev) =>
      prev.map((item) => (item.id === c.id ? { ...item, is_archived: nextArchived } : item))
    );
    showToast(
      nextArchived
        ? "Contest archived (hidden from mobile frontpage)"
        : "Contest unarchived",
      "success"
    );

    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/contests/${encodeURIComponent(c.id)}/archive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_archived: nextArchived }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Archive toggle failed");
      onRefresh();
    } catch (err: any) {
      setLocalContests((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, is_archived: !nextArchived } : item))
      );
      showToast(err.message || "Error toggling archive", "error");
    }
  };

  // Toggle Announce
  const handleToggleAnnounce = async (c: HsgContestRecord) => {
    const nextAnnounced = !c.winners_announced;
    setLocalContests((prev) =>
      prev.map((item) => (item.id === c.id ? { ...item, winners_announced: nextAnnounced } : item))
    );
    showToast(
      nextAnnounced
        ? "Contest winners announced live on mobile app!"
        : "Announcement turned off",
      "success"
    );

    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/contests/${encodeURIComponent(c.id)}/announce`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winners_announced: nextAnnounced }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Announcement toggle failed");
      onRefresh();
    } catch (err: any) {
      setLocalContests((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, winners_announced: !nextAnnounced } : item))
      );
      showToast(err.message || "Error toggling announcement", "error");
    }
  };

  // Approve Entry
  const handleApproveSubmission = async (sub: HsgContestSubmission) => {
    const prevSubStatus = sub.status;
    setLocalSubmissions((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, status: "approved" } : s))
    );
    setInspectSub(null);
    showToast("Entry approved and points credited", "success");

    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/contests/submissions/${encodeURIComponent(sub.id)}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Approval failed");
      onRefresh();
    } catch (err: any) {
      setLocalSubmissions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, status: prevSubStatus } : s))
      );
      showToast(err.message || "Failed to approve entry", "error");
    }
  };

  // Reject Entry
  const handleRejectSubmission = async (sub: HsgContestSubmission) => {
    if (!rejectReason.trim()) {
      showToast("Please provide a rejection reason", "error");
      return;
    }
    const rReason = rejectReason.trim();
    const prevSubStatus = sub.status;
    setLocalSubmissions((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, status: "rejected", reject_reason: rReason } : s))
    );
    setInspectSub(null);
    setRejectReason("");
    showToast("Entry rejected and points revoked", "success");

    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/contests/submissions/${encodeURIComponent(sub.id)}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rReason }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Rejection failed");
      onRefresh();
    } catch (err: any) {
      setLocalSubmissions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, status: prevSubStatus } : s))
      );
      showToast(err.message || "Failed to reject entry", "error");
    } finally {
      setProcessingSubId(null);
    }
  };

  // Group contest submissions by User (1 user appears once, even if 100 submissions)
  const contestSubmitterUsers = React.useMemo(() => {
    if (!assignContestId) return [];
    const subs = localSubmissions.filter((s) => s.contest_id === assignContestId);
    const userMap = new Map<
      string,
      {
        key: string;
        user_id: string;
        user_phone: string;
        user_nickname: string;
        total_submissions: number;
        total_spend: number;
        total_qty: number;
        latest_submission_id: string;
      }
    >();

    subs.forEach((s) => {
      // Primary grouping key is strictly user_id
      const key = (s.user_id || s.user_phone || s.id).trim();
      if (!key) return;
      const existing = userMap.get(key);
      const amount = Number(s.amount_paid || 0);
      const qty = Number(s.items_count || 1);

      if (!existing) {
        userMap.set(key, {
          key,
          user_id: s.user_id || "",
          user_phone: s.user_phone || "",
          user_nickname: s.user_nickname || "Member",
          total_submissions: 1,
          total_spend: amount,
          total_qty: qty,
          latest_submission_id: s.id,
        });
      } else {
        existing.total_submissions += 1;
        existing.total_spend += amount;
        existing.total_qty += qty;
        if (!existing.user_id && s.user_id) existing.user_id = s.user_id;
      }
    });

    return Array.from(userMap.values());
  }, [assignContestId, localSubmissions]);

  // Real-time search by user nickname, last digit phone, or user ID
  const filteredSubmitterUsers = React.useMemo(() => {
    if (!assignUserSearch.trim()) return contestSubmitterUsers;
    const q = assignUserSearch.toLowerCase().trim();
    return contestSubmitterUsers.filter((u) => {
      const nameMatch = (u.user_nickname || "").toLowerCase().includes(q);
      const idMatch = (u.user_id || "").toLowerCase().includes(q);
      const cleanPhone = (u.user_phone || "").replace(/\D/g, "");
      const phoneMatch = cleanPhone.includes(q) || cleanPhone.slice(-4).includes(q);
      return nameMatch || idMatch || phoneMatch;
    });
  }, [contestSubmitterUsers, assignUserSearch]);

  // Assign Winner Submit
  const handleAssignWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignContestId) {
      showToast("Please select a contest", "error");
      return;
    }
    if (!assignPrizeId) {
      showToast("Please select a prize", "error");
      return;
    }
    if (!assignUserKey) {
      showToast("Please select a winner user", "error");
      return;
    }

    const selectedUser = contestSubmitterUsers.find((u) => u.key === assignUserKey);
    if (!selectedUser) {
      showToast("Selected user not found", "error");
      return;
    }

    const optimisticWinner: HsgContestWinner = {
      id: `WIN-${Date.now().toString().slice(-6)}`,
      contest_id: assignContestId,
      prize_id: assignPrizeId,
      user_id: selectedUser.user_id,
      user_phone: selectedUser.user_phone,
      user_nickname: selectedUser.user_nickname,
      created_at: Date.now(),
      claimed: false,
    } as any;
    const prevWinnersSnapshot = [...localWinners];
    setLocalWinners((prev) => [optimisticWinner, ...prev]);
    showToast("Winner assigned successfully!", "success");
    setShowAssignModal(false);
    setAssignUserKey("");
    setAssignUserSearch("");

    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/contests/winners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contest_id: assignContestId,
          prize_id: assignPrizeId,
          submission_id: selectedUser.latest_submission_id || null,
          user_id: selectedUser.user_id,
          user_phone: selectedUser.user_phone,
          user_nickname: selectedUser.user_nickname,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Failed to assign winner");
      onRefresh();
    } catch (err: any) {
      setLocalWinners(prevWinnersSnapshot);
      showToast(err.message || "Failed to assign winner on server", "error");
    } finally {
      setAssigningWinner(false);
    }
  };

  // Delete Winner
  const handleDeleteWinner = async (winner: HsgContestWinner) => {
    if (winner.claimed) {
      showToast(
        "Prize already claimed by user. Locked and cannot be modified or deleted.",
        "error"
      );
      return;
    }
    const prevWinnersSnapshot = [...localWinners];
    setLocalWinners((prev) => prev.filter((w) => w.id !== winner.id));
    showToast("Winner assignment removed", "success");

    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/contests/winners/${encodeURIComponent(winner.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message || "Failed to delete winner");
      onRefresh();
    } catch (err: any) {
      setLocalWinners(prevWinnersSnapshot);
      showToast(err.message || "Failed to delete winner on server", "error");
    } finally {
      setDeletingWinnerId(null);
    }
  };

  // CSV Report Generator (Exact 5 columns as specified by user)
  const handleDownloadContestReport = () => {
    if (!selectedContestId || selectedContestId === "ALL") {
      showToast("Please select a specific contest to download the report", "error");
      return;
    }
    const targetContest = contests.find((c) => c.id === selectedContestId);
    if (!targetContest) {
      showToast("Selected contest not found", "error");
      return;
    }
    const contestName =
      targetContest.internal_title ||
      targetContest.title ||
      targetContest.frontpage_title ||
      selectedContestId;

    const approvedSubs = submissions.filter(
      (s) => s.contest_id === selectedContestId && s.status === "approved"
    );

    if (approvedSubs.length === 0) {
      showToast("No approved submissions found for this contest", "error");
      return;
    }

    const userGroups = new Map<
      string,
      {
        userDisplay: string;
        subs: HsgContestSubmission[];
      }
    >();

    approvedSubs.forEach((sub) => {
      const uid = sub.user_id || sub.user_phone || "unknown";
      if (!userGroups.has(uid)) {
        const nick = sub.user_nickname || "User";
        const phoneDigits = String(sub.user_phone || "").replace(/\D/g, "");
        const last4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : phoneDigits || "0000";
        const displayUserId = sub.user_id
          ? sub.user_id.startsWith("USR-")
            ? sub.user_id
            : `USR-${sub.user_id.slice(-4)}`
          : "USR-0000";
        const userColumn = `${nick} ${last4} | ${displayUserId}`;
        userGroups.set(uid, {
          userDisplay: userColumn,
          subs: [],
        });
      }
      userGroups.get(uid)!.subs.push(sub);
    });

    const headers = [
      "User",
      "Total Submission",
      "Total Qty Purchase",
      "Total Amount Spend",
      "Submissions & Answers",
    ];

    const rows: string[][] = [];

    userGroups.forEach(({ userDisplay, subs }) => {
      subs.sort((a, b) => (a.created_at || 0) - (b.created_at || 0));

      const totalSub = subs.length;
      let totalQty = 0;
      let totalSpend = 0;
      const submissionLines: string[] = [];

      subs.forEach((s) => {
        totalQty += Number(s.items_count || 1);
        totalSpend += Number(s.amount_paid || 0);

        const d = new Date(s.created_at || Date.now());
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        const dateStr = `${dd}/${mm}/${yyyy}`;

        const rawAnswers = s.extra_answers || s.answer_json || {};
        const ansList: string[] = [];
        Object.entries(rawAnswers).forEach(([k, v], idx) => {
          if (v !== undefined && v !== null && v !== "") {
            const vStr = typeof v === "object" ? JSON.stringify(v) : String(v).replace(/[\r\n]+/g, " ");
            ansList.push(`A${idx + 1}: ${vStr}`);
          }
        });
        const ansJoined = ansList.length > 0 ? ` ${ansList.join(", ")}` : "";
        submissionLines.push(`${dateStr}${ansJoined}`);
      });

      rows.push([
        userDisplay,
        String(totalSub),
        String(totalQty),
        `$${totalSpend.toFixed(2)}`,
        submissionLines.join("\n"),
      ]);
    });

    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((field) => {
              const str = String(field);
              if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(",")
        ),
      ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Contest_Report_${contestName.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Contest report exported successfully", "success");
  };

  // Filtered lists
  const visibleContests = localContests.filter((c) =>
    leftTab === "active" ? !c.is_archived : c.is_archived
  );

  const activeContestObj =
    selectedContestId !== "ALL"
      ? localContests.find((c) => c.id === selectedContestId) || null
      : null;

  const filteredSubs = localSubmissions.filter((s) => {
    if (selectedContestId !== "ALL" && s.contest_id !== selectedContestId) return false;
    if (statusFilter !== "ALL") {
      if (statusFilter === "pending" && s.status !== "submitted") return false;
      if (statusFilter === "approved" && s.status !== "approved") return false;
      if (statusFilter === "rejected" && s.status !== "rejected") return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nickMatch = (s.user_nickname || "").toLowerCase().includes(q);
      const phoneMatch = (s.user_phone || "").includes(q);
      const ansMatch = JSON.stringify(s.extra_answers || s.answer_json || {})
        .toLowerCase()
        .includes(q);
      return nickMatch || phoneMatch || ansMatch;
    }
    return true;
  });

  const filteredWinners = localWinners.filter((w) => {
    if (selectedContestId !== "ALL" && w.contest_id !== selectedContestId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (w.user_nickname || "").toLowerCase().includes(q) ||
        (w.user_phone || "").includes(q) ||
        (w.prize_title || "").toLowerCase().includes(q) ||
        (w.delivery_address || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate Prize Quotas for Assign Modal
  const assignContest = localContests.find((c) => c.id === assignContestId);
  const contestPrizes = assignContest?.prizes || [];

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {/* LEFT 30%: CONTESTS LIST */}
      <section className="w-[30%] min-w-[300px] max-w-[380px] h-full border-r border-slate-200 flex flex-col bg-[#F8F9FA]/60 overflow-hidden">
        {/* Top Active vs Archive + New */}
        <div className="p-3 border-b border-slate-200 bg-[#F8F9FA] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-0.5 text-[11px] bg-slate-200/70 p-0.5 rounded-lg border border-slate-200 flex-1">
            <button
              type="button"
              onClick={() => setLeftTab("active")}
              className={`h-7 flex-1 rounded text-xs font-semibold transition ${
                leftTab === "active"
                  ? "bg-white text-zinc-950 font-bold shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Active Contests
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("archive")}
              className={`h-7 flex-1 rounded text-xs font-semibold transition ${
                leftTab === "archive"
                  ? "bg-white text-zinc-950 font-bold shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Archived
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="h-7 px-3 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1 shrink-0 shadow-2xs transition active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Contests scroll list */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="p-8 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0B57D0]" />
              <span>Loading contests...</span>
            </div>
          ) : visibleContests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-xs text-zinc-500">
              No {leftTab} contests found. Click{" "}
              <span className="font-semibold text-[#0B57D0]">+ New</span> to create a contest.
            </div>
          ) : (
            visibleContests.map((c) => {
              const isSelected = selectedContestId === c.id;
              const subCount = submissions.filter((s) => s.contest_id === c.id).length;
              const winnerCount = winners.filter((w) => w.contest_id === c.id).length;
              const cap = c.max_total || c.submission_limits?.total_cap || 0;
              const hasAnnounced = Boolean(c.winners_announced);
              const linkedEvent = events.find((ev: any) => ev.id === c.required_event_id);

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedContestId(c.id)}
                  className={`p-3 rounded-lg border transition cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? "bg-blue-50/40 border-[#0B57D0] ring-1 ring-[#0B57D0]/30 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold text-zinc-900 truncate">
                        {c.internal_title || c.title}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {hasAnnounced && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-[#0B57D0] border border-blue-200 flex items-center gap-0.5">
                            <Trophy className="w-2.5 h-2.5" /> Announced
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                            c.is_published && !c.is_archived
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-zinc-500 border-slate-200"
                          }`}
                        >
                          {c.is_published ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {c.frontpage_title || c.frontpage_config?.title || "No display title"}
                    </p>

                    {linkedEvent && (
                      <div className="flex items-center gap-1 text-[10px] text-zinc-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 w-fit mt-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate">Req: {linkedEvent.title}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-1.5 font-medium">
                      <span>
                        {subCount} Entries{cap > 0 ? ` / ${cap} Cap` : ""}
                      </span>
                      <span>•</span>
                      <span>{winnerCount} Winner(s)</span>
                      <span>•</span>
                      <span className="text-[#0B57D0]">
                        +{c.reward_points || c.submission_limits?.points_per_submission || 0} pts
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                    <div className="text-zinc-400">
                      End: {formatDateTime(c.end_timestamp)}
                    </div>
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenModal(c)}
                        className="px-1.5 py-0.5 rounded text-zinc-500 hover:text-zinc-800 hover:bg-slate-100 font-medium"
                        title="Edit Contest"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleArchive(c)}
                        className="px-1.5 py-0.5 rounded text-zinc-500 hover:text-zinc-800 hover:bg-slate-100 font-medium"
                        title={c.is_archived ? "Unarchive" : "Archive"}
                      >
                        {c.is_archived ? "Restore" : "Archive"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setContestToDelete(c)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Contest"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* RIGHT 70%: SUB-TABS (SUBMISSIONS vs WINNERS) */}
      <section className="flex-1 h-full flex flex-col bg-white overflow-hidden">
        {/* Header Toolbar */}
        <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Sub-tab Pill Switcher */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-200/70 border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setActiveSubTab("submissions")}
                className={`h-7 px-3 rounded-md text-[11px] transition flex items-center gap-1.5 ${
                  activeSubTab === "submissions"
                    ? "bg-white text-zinc-950 font-bold shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-800 font-medium"
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                <span>Submissions</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-zinc-600 font-semibold border border-slate-200">
                  {filteredSubs.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab("winners")}
                className={`h-7 px-3 rounded-md text-[11px] transition flex items-center gap-1.5 ${
                  activeSubTab === "winners"
                    ? "bg-white text-zinc-950 font-bold shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-800 font-medium"
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-zinc-500" />
                <span>Prizes & Winners</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-zinc-600 font-semibold border border-slate-200">
                  {filteredWinners.length}
                </span>
              </button>
            </div>

            {/* Selected Contest Tag (Replaces the crossed-out dropdown) */}
            {selectedContestId !== "ALL" && activeContestObj ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/60 border border-blue-200 text-xs text-[#0B57D0]">
                <span className="text-[11px] text-zinc-500 font-medium">Contest:</span>
                <span className="text-xs font-semibold text-zinc-900 max-w-[200px] truncate" title={activeContestObj.internal_title || activeContestObj.title}>
                  {activeContestObj.internal_title || activeContestObj.title}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedContestId("ALL")}
                  className="w-4 h-4 rounded hover:bg-blue-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 ml-0.5 transition"
                  title="View all contests"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-zinc-500 font-medium">
                <span>All Contests</span>
              </div>
            )}

            {/* Status Pills (for submissions) */}
            {activeSubTab === "submissions" && (
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-200/70 border border-slate-200 text-xs">
                {(["ALL", "pending", "approved", "rejected"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`h-6 px-2 rounded capitalize text-[11px] transition ${
                      statusFilter === st
                        ? "bg-white text-zinc-950 font-bold shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-800 font-medium"
                    }`}
                  >
                    {st === "ALL" ? "All" : st}
                  </button>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeSubTab === "submissions"
                    ? "Search nickname, phone, answers..."
                    : "Search winners..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-7 pr-3 w-44 rounded-md bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0B57D0]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {activeSubTab === "submissions" ? (
              <button
                type="button"
                onClick={handleDownloadContestReport}
                className="h-7 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition active:scale-98"
                title="Download Contest Report CSV"
              >
                <Download className="w-3.5 h-3.5 text-zinc-500" />
                <span>Download Report</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {activeContestObj && (
                  <button
                    type="button"
                    onClick={() => handleToggleAnnounce(activeContestObj)}
                    disabled={togglingAnnounce}
                    className={`h-7 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition active:scale-98 ${
                      activeContestObj.winners_announced
                        ? "border border-blue-200 bg-blue-50 text-[#0B57D0] hover:bg-blue-100"
                        : "border border-slate-200 bg-white text-zinc-700 hover:bg-slate-50"
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5 text-zinc-500" />
                    <span>
                      {activeContestObj.winners_announced
                        ? "Winners Live (Tap to Off)"
                        : "Announce Winners"}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAssignContestId(
                      selectedContestId !== "ALL" ? selectedContestId : contests[0]?.id || ""
                    );
                    setAssignPrizeId("");
                    setAssignUserKey("");
                    setAssignUserSearch("");
                    setShowAssignModal(true);
                  }}
                  className="h-7 px-3 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign Winner</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SUBMISSIONS TABLE VIEW */}
        {activeSubTab === "submissions" && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filteredSubs.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-400 flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-slate-300" />
                <span>No contest submissions found</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#F8F9FA] border-b border-slate-200 text-zinc-500 text-[11px] font-semibold select-none z-10">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Contest</th>
                    <th className="py-2.5 px-3">Receipt</th>
                    <th className="py-2.5 px-3">Amount & Qty</th>
                    <th className="py-2.5 px-3">Answers</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubs.map((sub) => {
                    const c = contests.find((x) => x.id === sub.contest_id);
                    const isApproved = sub.status === "approved";
                    const isRejected = sub.status === "rejected";

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 whitespace-nowrap text-zinc-500">
                          {formatDateShort(sub.created_at)}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-zinc-900">
                            {sub.user_nickname || "Member"}
                          </div>
                          <div className="font-mono text-[11px] text-zinc-400">
                            +{maskPhoneLast4(sub.user_phone)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-700 font-medium max-w-[160px] truncate">
                          {c?.internal_title || c?.title || sub.contest_id}
                        </td>
                        <td className="py-2.5 px-3">
                          {sub.receipt_photo_url ? (
                            <img
                              src={sub.receipt_photo_url}
                              alt="Receipt"
                              onClick={() => setInspectSub(sub)}
                              className="w-9 h-9 rounded object-cover border border-slate-200 cursor-pointer hover:opacity-80 transition bg-slate-100"
                            />
                          ) : (
                            <span className="text-[11px] text-zinc-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="font-semibold text-zinc-900">
                            ${Number(sub.amount_paid || 0).toFixed(2)}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-normal">
                            {sub.items_count || 1} item(s)
                          </div>
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px]">
                          <div className="truncate text-[11px] text-zinc-600">
                            {Object.entries(sub.extra_answers || sub.answer_json || {})
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" • ") || "None"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isApproved ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Approved (+{sub.points_awarded || c?.reward_points || 10} pts)
                            </span>
                          ) : isRejected ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              Rejected
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Pending Review
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setInspectSub(sub);
                              setRejectReason(sub.reject_reason || "");
                            }}
                            className="h-6 px-2.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-[11px] font-medium transition shadow-2xs"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* PRIZES & WINNERS SUB-TAB VIEW */}
        {activeSubTab === "winners" && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
            {/* Registered Prizes Carousel / Grid for selected contest */}
            {activeContestObj && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900">
                      Registered Contest Prizes ({activeContestObj.prizes?.length || 0}/10)
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Prizes configured for {activeContestObj.internal_title || activeContestObj.title}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-zinc-600">
                    {winners.filter((w) => w.contest_id === activeContestObj.id).length} Winners Assigned
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(activeContestObj.prizes || []).map((prz, idx) => {
                    const assignedCount = winners.filter(
                      (w) => w.contest_id === activeContestObj.id && w.prize_id === prz.id
                    ).length;
                    const isFull = assignedCount >= (prz.max_pax || 1);

                    const rewardsSummary: string[] = [];
                    if (prz.reward_cash && prz.reward_cash > 0) rewardsSummary.push(`+$${Number(prz.reward_cash).toFixed(2)} Cash`);
                    if (prz.reward_points && prz.reward_points > 0) rewardsSummary.push(`+${prz.reward_points} pts`);
                    if (prz.product_name) rewardsSummary.push(`Product: ${prz.product_name}`);

                    return (
                      <div
                        key={prz.id || idx}
                        className="p-3 rounded-lg bg-white border border-slate-200 flex flex-col justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-start gap-2.5">
                          {prz.photo_url || prz.product_image ? (
                            <img
                              src={prz.photo_url || prz.product_image}
                              alt={prz.title}
                              className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center shrink-0">
                              <Trophy className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-zinc-900 truncate">
                              {prz.title}
                            </div>
                            <div className="text-[11px] font-medium text-[#0B57D0] truncate">
                              {rewardsSummary.join(" + ") || "Prize Item"}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">
                              {prz.description || prz.product_name || "No description"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                          <span
                            className={`font-medium ${
                              isFull ? "text-rose-600" : "text-zinc-600"
                            }`}
                          >
                            {assignedCount}/{prz.max_pax || 1} Pax
                            {isFull && " (Full)"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assigned Winners Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-[#F8F9FA]">
                <h3 className="text-xs font-semibold text-zinc-900">
                  Assigned Winners ({filteredWinners.length})
                </h3>
                <span className="text-[11px] text-zinc-500">
                  Winners claim via WhatsApp bot $\to$ balances credited automatically & delivery address saved
                </span>
              </div>

              {filteredWinners.length === 0 ? (
                <div className="p-10 text-center text-xs text-zinc-400">
                  No winners assigned yet. Click{" "}
                  <span className="font-semibold text-[#0B57D0]">+ Assign Winner</span> above.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#F8F9FA] border-b border-slate-200 text-zinc-500 text-[11px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Winner User</th>
                      <th className="py-2.5 px-3">Prize</th>
                      <th className="py-2.5 px-3">Reward</th>
                      <th className="py-2.5 px-3">Delivery Address</th>
                      <th className="py-2.5 px-3">Claim Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredWinners.map((win) => {
                      const isClaimed = Boolean(win.claimed);
                      const rewardsSummary: string[] = [];
                      if (win.reward_cash && win.reward_cash > 0) rewardsSummary.push(`+$${Number(win.reward_cash).toFixed(2)}`);
                      if (win.reward_points && win.reward_points > 0) rewardsSummary.push(`+${win.reward_points} pts`);
                      if (win.product_name) rewardsSummary.push(win.product_name);

                      return (
                        <tr key={win.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-zinc-900">
                              {win.user_nickname}
                            </div>
                            <div className="font-mono text-[11px] text-zinc-400">
                              +{maskPhoneLast4(win.user_phone)} • {win.user_id || "-"}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              {win.prize_photo_url || win.product_image ? (
                                <img
                                  src={win.prize_photo_url || win.product_image}
                                  alt={win.prize_title}
                                  className="w-7 h-7 rounded object-cover border border-slate-200 bg-slate-100"
                                />
                              ) : null}
                              <span className="font-semibold text-zinc-900">
                                {win.prize_title}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#0B57D0]">
                            {rewardsSummary.join(" + ") || "-"}
                          </td>
                          <td className="py-2.5 px-3 max-w-[220px]">
                            {win.delivery_address ? (
                              <div className="text-[11px] text-zinc-800 font-medium whitespace-pre-line truncate" title={win.delivery_address}>
                                📍 {win.delivery_address}
                              </div>
                            ) : (win.product_name || win.product_id) ? (
                              <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                ⏳ Awaiting via WhatsApp
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isClaimed ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Claimed ({formatDateShort(win.claimed_at)})</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Pending User Claim
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {isClaimed ? (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 opacity-60 cursor-not-allowed select-none"
                                title="Claimed prizes are locked and cannot be edited or removed"
                              >
                                <Lock className="w-3 h-3" />
                                <span>Locked</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={deletingWinnerId === win.id}
                                onClick={() => handleDeleteWinner(win)}
                                className="h-7 px-2.5 rounded-md text-red-600 hover:bg-red-50 text-[11px] font-semibold transition"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>

      {/* INSPECT SUBMISSION MODAL */}
      {inspectSub && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">
                  Inspect Submission ({inspectSub.id})
                </h3>
                <p className="text-[11px] text-zinc-500">
                  {inspectSub.user_nickname} (+{maskPhoneLast4(inspectSub.user_phone)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectSub(null)}
                className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-zinc-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Receipt Image */}
              {inspectSub.receipt_photo_url ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600">
                    <span>Receipt Photo</span>
                    <button
                      type="button"
                      onClick={() => setZoomReceipt((z) => !z)}
                      className="text-[#0B57D0] hover:underline"
                    >
                      {zoomReceipt ? "Normal View" : "Full View"}
                    </button>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center p-1">
                    <img
                      src={inspectSub.receipt_photo_url}
                      alt="Receipt"
                      className={`rounded object-contain ${
                        zoomReceipt ? "max-h-[500px] w-full" : "max-h-56 w-auto"
                      }`}
                    />
                  </div>
                </div>
              ) : null}

              {/* Purchase Details */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-[10px] font-bold uppercase text-zinc-400">
                    Amount Paid ($)
                  </div>
                  <div className="text-sm font-extrabold text-zinc-900">
                    ${Number(inspectSub.amount_paid || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-zinc-400">
                    Qty Purchased
                  </div>
                  <div className="text-sm font-extrabold text-zinc-900">
                    {inspectSub.items_count || 1} item(s)
                  </div>
                </div>
              </div>

              {/* Extra Answers */}
              <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-zinc-400">
                  Contest Answers
                </div>
                {Object.keys(inspectSub.extra_answers || inspectSub.answer_json || {}).length === 0 ? (
                  <div className="text-zinc-400 italic">No extra questions answered</div>
                ) : (
                  Object.entries(inspectSub.extra_answers || inspectSub.answer_json || {}).map(
                    ([k, v]) => (
                      <div key={k} className="text-xs">
                        <span className="font-semibold text-zinc-700">{k}: </span>
                        <span className="font-bold text-zinc-950">
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    )
                  )
                )}
              </div>

              {/* Current Status */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-600">Current Status:</span>
                <span className="font-bold uppercase text-zinc-900">
                  {inspectSub.status}
                </span>
              </div>

              {/* Reject Reason input */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-semibold text-zinc-700">
                  Rejection Reason (if rejecting):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ineligible receipt or blurry photo"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                disabled={Boolean(processingSubId)}
                onClick={() => handleRejectSubmission(inspectSub)}
                className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition disabled:opacity-50"
              >
                Reject & Claw Back Points
              </button>
              <button
                type="button"
                disabled={Boolean(processingSubId)}
                onClick={() => handleApproveSubmission(inspectSub)}
                className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition disabled:opacity-50"
              >
                Approve & Credit Points
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN WINNER MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAssignWinner}
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Assign Contest Winner</h3>
                <p className="text-[11px] text-zinc-500">
                  Select a contest, prize, and choose the winning user
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-zinc-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* 1. Contest Selector */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Contest:
                </label>
                <select
                  value={assignContestId}
                  onChange={(e) => {
                    setAssignContestId(e.target.value);
                    setAssignPrizeId("");
                    setAssignUserKey("");
                    setAssignUserSearch("");
                  }}
                  className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold outline-none"
                >
                  <option value="">-- Choose Contest --</option>
                  {contests.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.internal_title || c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Prize Selector */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Prize ({contestPrizes.length} available):
                </label>
                <select
                  value={assignPrizeId}
                  onChange={(e) => setAssignPrizeId(e.target.value)}
                  disabled={!assignContestId || contestPrizes.length === 0}
                  className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold outline-none disabled:opacity-50"
                >
                  <option value="">-- Choose Prize --</option>
                  {contestPrizes.map((p) => {
                    const assigned = winners.filter(
                      (w) => w.contest_id === assignContestId && w.prize_id === p.id
                    ).length;
                    const max = p.max_pax || 1;
                    const isFull = assigned >= max;

                    return (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={isFull}
                        className={isFull ? "text-slate-400" : ""}
                      >
                        {p.title} ({assigned}/{max} pax{isFull ? " - FULL" : ""})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 3. Choose Winner User */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-zinc-700">
                    Choose Winner (User):
                  </label>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {contestSubmitterUsers.length} user{contestSubmitterUsers.length === 1 ? "" : "s"} submitted
                  </span>
                </div>

                {/* Real-time search box by name, phone (last 4), or user ID */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={assignUserSearch}
                    onChange={(e) => setAssignUserSearch(e.target.value)}
                    placeholder="Search by name, phone (last 4), or user ID..."
                    disabled={!assignContestId || contestSubmitterUsers.length === 0}
                    className="w-full h-8 pl-8 pr-7 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium outline-none focus:bg-white focus:border-[#0B57D0] focus:ring-1 focus:ring-[#0B57D0]/20 disabled:opacity-50"
                  />
                  {assignUserSearch && (
                    <button
                      type="button"
                      onClick={() => setAssignUserSearch("")}
                      className="w-5 h-5 absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 flex items-center justify-center text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Users List Box */}
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                  {!assignContestId ? (
                    <div className="p-3 text-center text-zinc-400 text-xs italic">
                      Please select a contest above first
                    </div>
                  ) : contestSubmitterUsers.length === 0 ? (
                    <div className="p-3 text-center text-zinc-400 text-xs italic">
                      No submitters found for this contest
                    </div>
                  ) : filteredSubmitterUsers.length === 0 ? (
                    <div className="p-3 text-center text-zinc-400 text-xs italic">
                      No users match &ldquo;{assignUserSearch}&rdquo;
                    </div>
                  ) : (
                    filteredSubmitterUsers.map((u) => {
                      const isSelected = assignUserKey === u.key;
                      const phoneDigits = (u.user_phone || "").replace(/\D/g, "");
                      const last4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : phoneDigits;
                      const idSuffix = u.user_id ? ` | ${u.user_id}` : "";

                      return (
                        <button
                          key={u.key}
                          type="button"
                          onClick={() => setAssignUserKey(u.key)}
                          className={`w-full p-2.5 text-left flex items-center justify-between gap-2 transition ${
                            isSelected
                              ? "bg-blue-50/80 text-[#0B57D0]"
                              : "hover:bg-slate-50 text-zinc-800"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate">
                              {u.user_nickname} {last4}{idSuffix}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-medium">
                              {u.total_submissions} submission{u.total_submissions === 1 ? "" : "s"} • ${u.total_spend.toFixed(2)} total spend ({u.total_qty} items)
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {isSelected ? (
                              <span className="w-5 h-5 rounded-full bg-[#0B57D0] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                                ✓
                              </span>
                            ) : (
                              <span className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Selected user badge preview */}
                {assignUserKey && (() => {
                  const sel = contestSubmitterUsers.find((u) => u.key === assignUserKey);
                  if (!sel) return null;
                  const pDigits = (sel.user_phone || "").replace(/\D/g, "");
                  const l4 = pDigits.length >= 4 ? pDigits.slice(-4) : pDigits;
                  return (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between text-[11px] font-semibold">
                      <span>Winner Selected: <strong>{sel.user_nickname} {l4} {sel.user_id ? `| ${sel.user_id}` : ""}</strong></span>
                      <button
                        type="button"
                        onClick={() => setAssignUserKey("")}
                        className="text-emerald-700 hover:text-emerald-900 underline text-[10px]"
                      >
                        Change
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="h-8 px-4 rounded-lg border border-slate-200 bg-white font-semibold text-zinc-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={assigningWinner || !assignPrizeId || !assignUserKey}
                className="h-8 px-5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {assigningWinner && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Assignment</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE / EDIT CONTEST MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-zinc-950">
                  {editingId ? "Edit Contest Campaign" : "Create New Contest"}
                </h3>
                <p className="text-xs text-zinc-500">
                  Configure contest details, event check-in requirement, prizes registry, and questions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-zinc-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSaveContest}
              className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 text-xs"
            >
              {/* SECTION 1: TITLES & DESCRIPTIONS */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-zinc-900 border-b border-slate-100 pb-1.5">
                  1. Contest Titles & Description
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Contest Title (Internal only - for Project 1)
                    </label>
                    <input
                      type="text"
                      value={internalTitle}
                      onChange={(e) => setInternalTitle(e.target.value)}
                      placeholder="e.g. CNY 2026 Giant Supermarket Drop"
                      className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none font-semibold focus:border-[#0B57D0]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Frontpage Title (Displayed in mobile app)
                    </label>
                    <input
                      type="text"
                      value={fpTitle}
                      onChange={(e) => setFpTitle(e.target.value)}
                      placeholder="e.g. Win $500 Cash in our CNY Draw!"
                      className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none font-semibold focus:border-[#0B57D0]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Frontpage Description
                  </label>
                  <input
                    type="text"
                    value={fpDesc}
                    onChange={(e) => setFpDesc(e.target.value)}
                    placeholder="e.g. Purchase min 2 bottles and upload receipt to win!"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Inside Contest Description
                    </label>
                    <textarea
                      rows={2}
                      value={insideDesc}
                      onChange={(e) => setInsideDesc(e.target.value)}
                      placeholder="Detailed contest story or background..."
                      className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Inside Instruction
                    </label>
                    <textarea
                      rows={2}
                      value={insideInstruction}
                      onChange={(e) => setInsideInstruction(e.target.value)}
                      placeholder="Step 1: Check in at event. Step 2: Buy item. Step 3: Snap receipt..."
                      className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: CONTEST REQUIREMENTS & CONDITIONS */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-zinc-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                  <span>2. Contest Requirements &amp; Conditions</span>
                  <span className="text-[10px] text-zinc-400 font-normal">Optional</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Required Event (User must join this event)
                    </label>
                    <select
                      value={reqEventId}
                      onChange={(e) => setReqEventId(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none font-semibold text-zinc-800 focus:border-[#0B57D0]"
                    >
                      <option value="">-- No Event Requirement (Open to All) --</option>
                      {(events || []).map((ev: any) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title} ({formatDateShort(ev.event_date || ev.date || ev.created_at)})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      User must join this event to participate in the contest.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Contest Requirement Note / Condition
                    </label>
                    <input
                      type="text"
                      value={reqNote}
                      onChange={(e) => setReqNote(e.target.value)}
                      placeholder="e.g. Purchase any items with $50 worth and upload photo receipt here."
                      className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Displayed on the contest submission card as the mandatory condition (e.g. minimum purchase amount, receipt requirements).
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: SCHEDULE & SUBMISSION REWARDS */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-zinc-900 border-b border-slate-100 pb-1.5">
                  3. Schedule & Rewards
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={startDt}
                      onChange={(e) => setStartDt(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={endDt}
                      onChange={(e) => setEndDt(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Submission Reward (Point Only)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={rewardPoints}
                      onChange={(e) => setRewardPoints(Number(e.target.value))}
                      className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none font-bold text-[#0B57D0]"
                    />
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Points credited upon admin entry approval
                    </p>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Max Per User
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={maxPerUser}
                      onChange={(e) => setMaxPerUser(Number(e.target.value))}
                      className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Total Contest Cap
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={maxTotal}
                      onChange={(e) => setMaxTotal(Number(e.target.value))}
                      placeholder="0 = unlimited"
                      className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: POSTERS (FRONTPAGE & INSIDE VERTICAL POSTERS) */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-zinc-900 border-b border-slate-100 pb-1.5">
                  4. Posters (Frontpage 4:5 / 1:1 & Inside Posters Max 8)
                </div>

                {/* Frontpage Poster */}
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Frontpage Poster (4:5 or 1:1)
                  </label>
                  {fpPhoto ? (
                    <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 bg-slate-50">
                      <img
                        src={fpPhoto}
                        alt="Frontpage"
                        className="w-14 h-14 rounded-md object-cover bg-white border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0 font-mono text-[11px] text-zinc-500 truncate">
                        {fpPhoto}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFpPhoto("")}
                        className="px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-md"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#0B57D0] rounded-lg p-3 cursor-pointer bg-slate-50 transition">
                      {uploadingFpPhoto ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#0B57D0]" />
                      ) : (
                        <span className="text-xs font-semibold text-[#0B57D0] flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" /> Upload Frontpage Poster
                        </span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadFpPhoto}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Inside Posters */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-zinc-700">
                      Inside Contest Posters ({insidePosters.length}/8)
                    </label>
                    {insidePosters.length < 8 && (
                      <label className="h-7 px-2.5 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition">
                        {uploadingPosters ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3" />
                        )}
                        <span>Upload Inside Poster</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleUploadInsidePosters}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {insidePosters.length === 0 ? (
                    <div className="p-3 rounded-lg border border-dashed border-slate-300 text-center text-zinc-400 text-xs">
                      No inside posters uploaded yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {insidePosters.map((url, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden relative group aspect-[4/5]"
                        >
                          <img
                            src={url}
                            alt={`Poster #${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setInsidePosters((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="absolute top-1 right-1 w-6 h-6 rounded bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 5: EXTRA QUESTIONS (MAX 5, NO DEFAULT) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="text-xs font-bold text-zinc-900">
                    5. Extra Questions ({extraQuestions.length}/5)
                  </div>
                  {extraQuestions.length < 5 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExtraQuestions((prev) => [
                          ...prev,
                          { id: `q_${Date.now().toString().slice(-4)}`, question: "" },
                        ])
                      }
                      className="h-7 px-2.5 rounded-md bg-slate-100 hover:bg-slate-200 text-zinc-800 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Extra Question</span>
                    </button>
                  )}
                </div>

                {extraQuestions.length === 0 ? (
                  <div className="p-3 rounded-lg border border-dashed border-slate-200 text-center text-zinc-400 text-xs">
                    No extra questions. (Receipt upload, Amount Paid, and Qty Purchased are included automatically).
                  </div>
                ) : (
                  <div className="space-y-2">
                    {extraQuestions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2"
                      >
                        <span className="font-bold text-zinc-600 text-[11px] w-6 shrink-0">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) =>
                            setExtraQuestions((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, question: e.target.value } : item
                              )
                            )
                          }
                          placeholder="e.g. Which supermarket branch did you purchase from?"
                          className="flex-1 h-8 px-2.5 rounded bg-white border border-slate-200 text-xs font-medium outline-none focus:border-[#0B57D0]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setExtraQuestions((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="w-7 h-7 rounded text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 6: PRIZE REGISTRY (MAX 10 PRIZES - MODULAR CASH / POINT / PRODUCT FROM HSG+ SHOP) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div>
                    <div className="text-xs font-bold text-zinc-900">
                      6. Prize Registry ({prizes.length}/10)
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Each prize can reward Cash, Points, or a Product from the HSG+ Shop Catalog (or combinations)
                    </p>
                  </div>
                  {prizes.length < 10 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPrizes((prev) => [
                          ...prev,
                          {
                            id: `prz_${Date.now().toString().slice(-4)}`,
                            title: `Prize #${prev.length + 1}`,
                            description: "",
                            photo_url: "",
                            reward_type: "cashback",
                            reward_cash: 50,
                            reward_points: 0,
                            product_id: "",
                            product_name: "",
                            product_image: "",
                            max_pax: 1,
                          },
                        ])
                      }
                      className="h-7 px-2.5 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Prize</span>
                    </button>
                  )}
                </div>

                {prizes.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-slate-300 text-center text-zinc-400 text-xs">
                    No prizes added yet. Click{" "}
                    <span className="font-bold text-[#0B57D0]">+ Add Prize</span> to register up to 10 prizes.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prizes.map((prz, idx) => {
                      const hasCash = Boolean(prz.reward_cash && prz.reward_cash > 0);
                      const hasPoints = Boolean(prz.reward_points && prz.reward_points > 0);
                      const hasProduct = Boolean(prz.product_id || prz.product_name);

                      return (
                        <div
                          key={prz.id || idx}
                          className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-900">
                              Prize #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setPrizes((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-red-500 hover:text-red-700 flex items-center gap-1 text-[11px]"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-12 gap-3 items-start">
                            {/* 1:1 Photo */}
                            <div className="col-span-3">
                              <label className="block text-[10px] font-semibold text-zinc-600 mb-1">
                                1:1 Photo
                              </label>
                              {prz.photo_url || prz.product_image ? (
                                <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-slate-200 bg-white">
                                  <img
                                    src={prz.photo_url || prz.product_image}
                                    alt={prz.title}
                                    className="w-full h-full object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPrizes((prev) =>
                                        prev.map((p, i) =>
                                          i === idx ? { ...p, photo_url: "", product_image: "" } : p
                                        )
                                      )
                                    }
                                    className="absolute top-1 right-1 p-1 bg-black/60 rounded text-white"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <label className="aspect-square w-full rounded-lg border-2 border-dashed border-slate-300 hover:border-[#0B57D0] bg-white flex flex-col items-center justify-center cursor-pointer p-2 text-center transition">
                                  {uploadingPrizeIdx === idx ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-[#0B57D0]" />
                                  ) : (
                                    <>
                                      <Upload className="w-3.5 h-3.5 text-zinc-400 mb-0.5" />
                                      <span className="text-[10px] text-zinc-500 font-semibold">
                                        Upload 1:1
                                      </span>
                                    </>
                                  )}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleUploadPrizePhoto(idx, e)}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </div>

                            {/* Fields */}
                            <div className="col-span-9 space-y-2.5">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-zinc-600 mb-0.5">
                                    Prize Title
                                  </label>
                                  <input
                                    type="text"
                                    value={prz.title}
                                    onChange={(e) =>
                                      setPrizes((prev) =>
                                        prev.map((p, i) =>
                                          i === idx ? { ...p, title: e.target.value } : p
                                        )
                                      )
                                    }
                                    placeholder="e.g. 1st Prize - Mystery Gift Box"
                                    className="w-full h-7 px-2 rounded bg-white border border-slate-200 text-xs font-semibold outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-zinc-600 mb-0.5">
                                    Max Pax (Default 1)
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={prz.max_pax || 1}
                                    onChange={(e) =>
                                      setPrizes((prev) =>
                                        prev.map((p, i) =>
                                          i === idx
                                            ? { ...p, max_pax: Number(e.target.value) }
                                            : p
                                        )
                                      )
                                    }
                                    className="w-full h-7 px-2 rounded bg-white border border-slate-200 text-xs font-bold outline-none"
                                  />
                                </div>
                              </div>

                              {/* Reward Components Toggles */}
                              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2">
                                <label className="block text-[10px] font-bold uppercase text-zinc-500">
                                  Prize Rewards (Select Any Combination)
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  {/* Cash Toggle & Amount */}
                                  <div>
                                    <label className="block text-[10px] font-semibold text-zinc-600 mb-0.5">
                                      Cash ($)
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={prz.reward_cash || 0}
                                      onChange={(e) =>
                                        setPrizes((prev) =>
                                          prev.map((p, i) =>
                                            i === idx
                                              ? { ...p, reward_cash: Number(e.target.value) }
                                              : p
                                          )
                                        )
                                      }
                                      placeholder="0.00"
                                      className="w-full h-7 px-2 rounded bg-slate-50 border border-slate-200 text-xs font-bold text-emerald-700 outline-none"
                                    />
                                  </div>

                                  {/* Points Toggle & Amount */}
                                  <div>
                                    <label className="block text-[10px] font-semibold text-zinc-600 mb-0.5">
                                      Points (pts)
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      step="1"
                                      value={prz.reward_points || 0}
                                      onChange={(e) =>
                                        setPrizes((prev) =>
                                          prev.map((p, i) =>
                                            i === idx
                                              ? { ...p, reward_points: Number(e.target.value) }
                                              : p
                                          )
                                        )
                                      }
                                      placeholder="0"
                                      className="w-full h-7 px-2 rounded bg-slate-50 border border-slate-200 text-xs font-bold text-[#0B57D0] outline-none"
                                    />
                                  </div>

                                  {/* Product Selector from HSG+ Shop Merch Catalog */}
                                  <div>
                                    <label className="block text-[10px] font-semibold text-zinc-600 mb-0.5">
                                      Product (HSG+ Shop)
                                    </label>
                                    <select
                                      value={prz.product_id || ""}
                                      onChange={(e) => {
                                        const pId = e.target.value;
                                        const found = merchCatalog.find((m: any) => m.id === pId);
                                        setPrizes((prev) =>
                                          prev.map((p, i) => {
                                            if (i !== idx) return p;
                                            if (!found) {
                                              return {
                                                ...p,
                                                product_id: "",
                                                product_name: "",
                                                product_image: "",
                                              };
                                            }
                                            return {
                                              ...p,
                                              product_id: found.id,
                                              product_name: found.name,
                                              product_image: found.image_url || "",
                                              photo_url: p.photo_url || found.image_url || "",
                                              title: p.title.startsWith("Prize #") ? found.name : p.title,
                                            };
                                          })
                                        );
                                      }}
                                      className="w-full h-7 px-1.5 rounded bg-slate-50 border border-slate-200 text-[11px] font-semibold outline-none truncate"
                                    >
                                      <option value="">-- No Product --</option>
                                      {merchCatalog.map((m: any) => (
                                        <option key={m.id} value={m.id}>
                                          {m.name} (${m.price_cash || 0})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-zinc-600 mb-0.5">
                                  Description
                                </label>
                                <input
                                  type="text"
                                  value={prz.description || ""}
                                  onChange={(e) =>
                                    setPrizes((prev) =>
                                      prev.map((p, i) =>
                                        i === idx ? { ...p, description: e.target.value } : p
                                      )
                                    )
                                  }
                                  placeholder="Short prize description..."
                                  className="w-full h-7 px-2 rounded bg-white border border-slate-200 text-xs outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Publish Toggle */}
              <div className="pt-2 flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <div className="font-semibold text-zinc-800">Publish Status</div>
                  <div className="text-[11px] text-zinc-400">
                    {isPublished
                      ? "Visible in mobile community app"
                      : "Hidden in draft state"}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setIsPublished((p) => !p)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      isPublished ? "bg-[#0B57D0]" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        isPublished ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-8 px-4 rounded-lg border border-slate-200 bg-white font-semibold text-zinc-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-8 px-5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Contest</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONTEST CONFIRMATION MODAL */}
      {contestToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-5">
            <h3 className="text-sm font-bold text-zinc-950">
              Delete Contest Permanently?
            </h3>
            <p className="text-xs text-zinc-600 mt-2">
              Are you sure you want to delete{" "}
              <strong className="text-zinc-900">
                {contestToDelete.internal_title || contestToDelete.title}
              </strong>
              ?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setContestToDelete(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteContest}
                className="h-8 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. COMBINED MEMBERS & WITHDRAWAL TAB VIEW
// ============================================================================

// ============================================================================
// 2B. FORCE-DIRECTED REFERRAL NETWORK TOPOLOGY GRAPH (IMAGE 1 VISUAL SPEC)
// ============================================================================
interface ForceNode {
  id: string;
  phone: string;
  masked_phone: string;
  nickname: string;
  referral_code: string;
  level: number;
  wallet_balance: number;
  points_balance: number;
  childrenCount: number;
  parentPhone?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isDragging?: boolean;
}

interface ForceLink {
  source: string;
  target: string;
}

const TIER_COLORS: Record<number, { bg: string; border: string; label: string }> = {
  1: { bg: "#0F172A", border: "#000000", label: "Root / Hub" }, // Dark Slate / Black
  2: { bg: "#334155", border: "#0F172A", label: "Tier 1 Direct" }, // Dark Gray
  3: { bg: "#334155", border: "#0F172A", label: "Tier 2 Downline" }, // Dark Gray
  4: { bg: "#334155", border: "#0F172A", label: "Tier 3 Downline" }, // Dark Gray
  5: { bg: "#334155", border: "#0F172A", label: "Tier 4 Downline" }, // Dark Gray
  6: { bg: "#334155", border: "#0F172A", label: "Tier 5 Downline" }, // Dark Gray
};

function stepForcePhysics(
  nodes: ForceNode[],
  links: ForceLink[],
  cx: number,
  cy: number,
  alpha: number
) {
  const nodeCount = nodes.length;
  if (nodeCount === 0) return;

  // 1. Repulsion between all node pairs (Anti-collision)
  for (let i = 0; i < nodeCount; i++) {
    const n1 = nodes[i];
    for (let j = i + 1; j < nodeCount; j++) {
      const n2 = nodes[j];
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const d2 = dx * dx + dy * dy;
      const dist = Math.sqrt(d2) || 1;
      if (dist < 260) {
        const force = (950 / (dist * dist + 15)) * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        n1.vx -= fx;
        n1.vy -= fy;
        n2.vx += fx;
        n2.vy += fy;
      }
    }
  }

  // 2. Spring attraction along links
  const nodeMap = new Map<string, ForceNode>();
  for (let i = 0; i < nodeCount; i++) {
    nodeMap.set(nodes[i].id, nodes[i]);
  }

  const restDist = 65;
  for (let i = 0; i < links.length; i++) {
    const l = links[i];
    const s = nodeMap.get(l.source);
    const t = nodeMap.get(l.target);
    if (!s || !t) continue;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const delta = (dist - restDist) * 0.055 * alpha;
    const fx = (dx / dist) * delta;
    const fy = (dy / dist) * delta;
    s.vx += fx;
    s.vy += fy;
    t.vx -= fx;
    t.vy -= fy;
  }

  // 3. Gentle center gravity & damping
  for (let i = 0; i < nodeCount; i++) {
    const n = nodes[i];
    n.vx += (cx - n.x) * 0.003 * alpha;
    n.vy += (cy - n.y) * 0.003 * alpha;

    n.vx *= 0.85;
    n.vy *= 0.85;
    if (!n.isDragging) {
      n.x += n.vx;
      n.y += n.vy;
    }
  }
}

export interface HsgNetworkGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
  search: (query: string) => void;
}

export const HsgReferralNetworkForceGraph = React.forwardRef<
  HsgNetworkGraphHandle,
  {
    trees: any[];
    allUsers?: any[];
    searchQuery?: string;
    onRefresh: () => void;
    onReNetwork?: () => void;
    loading: boolean;
    compact?: boolean;
    hideToolbar?: boolean;
    selectedPhone?: string;
    onSelectMember?: (phone: string) => void;
  }
>(function HsgReferralNetworkForceGraph(
  {
    trees,
    allUsers,
    searchQuery,
    onRefresh,
    onReNetwork,
    loading,
    compact = false,
    hideToolbar = false,
    selectedPhone,
    onSelectMember,
  },
  ref
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const nodesRef = React.useRef<ForceNode[]>([]);
  const linksRef = React.useRef<ForceLink[]>([]);
  const animFrameRef = React.useRef<number | null>(null);

  const [transform, setTransform] = React.useState<{ x: number; y: number; k: number }>({
    x: 0,
    y: 0,
    k: 1,
  });
  const transformRef = React.useRef(transform);
  transformRef.current = transform;

  const [selectedNode, setSelectedNode] = React.useState<ForceNode | null>(null);
  // Auto-center / select node when selectedPhone prop changes
  React.useEffect(() => {
    if (selectedPhone && nodesRef.current.length > 0) {
      const cleanP = selectedPhone.replace(/\D/g, "");
      const found = nodesRef.current.find(
        (n) => n.phone === selectedPhone || n.phone.replace(/\D/g, "") === cleanP || n.id === selectedPhone
      );
      if (found) {
        setSelectedNode(found);
        const rect = containerRef.current?.getBoundingClientRect();
        const cx = (rect?.width || 400) / 2;
        const cy = (rect?.height || 400) / 2;
        const k = Math.max(0.9, transformRef.current.k);
        setTransform({
          k,
          x: cx - found.x * k,
          y: cy - found.y * k,
        });
      }
    }
  }, [selectedPhone]);
  const [hoveredNode, setHoveredNode] = React.useState<ForceNode | null>(null);
  const showLabels = true;
  const [internalSearch, setInternalSearch] = React.useState<string>(searchQuery || "");

  const isDraggingNodeRef = React.useRef<ForceNode | null>(null);
  const isPanningRef = React.useRef<boolean>(false);
  const startPanRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = React.useRef<boolean>(false);
  const alphaRef = React.useRef<number>(1.0);

  // Build Graph Nodes & Links strictly from trees and users
  React.useEffect(() => {
    const nodesMap = new Map<string, ForceNode>();
    const linkList: ForceLink[] = [];

    // 1. Populate all existing members as base nodes keyed by User ID
    (allUsers || []).forEach((u: any) => {
      const uid = String(u.id || u.user_id || u.phone_number || "");
      if (!uid) return;
      const s = u.socials || u.social_handles || {};
      nodesMap.set(uid, {
        id: uid,
        phone: uid,
        masked_phone: u.phone_number && u.phone_number.length >= 8
          ? u.phone_number.slice(0, 3) + "****" + u.phone_number.slice(-4)
          : uid,
        nickname: u.nickname || "Member",
        referral_code: u.referral_code || s.referral_code || "",
        level: 1,
        wallet_balance: Number(u.wallet_balance || 0),
        points_balance: Number(u.points_balance ?? s.points_balance ?? 0),
        childrenCount: 0,
        parentPhone: undefined,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      });
    });

    // 2. Traverse trees from hsgplus_network to establish branches and exact connections
    const traverse = (node: any, parentId?: string, depth = 1) => {
      if (!node) return;
      const uid = String(node.id || node.user_id || "");
      if (!uid) return;

      if (nodesMap.has(uid)) {
        const existing = nodesMap.get(uid)!;
        existing.level = depth;
        if (node.nickname && node.nickname !== "Member") existing.nickname = node.nickname;
        if (node.referral_code) existing.referral_code = node.referral_code;
        existing.parentPhone = parentId;
        existing.childrenCount = node.children ? node.children.length : 0;
      } else {
        nodesMap.set(uid, {
          id: uid,
          phone: uid,
          masked_phone: uid,
          nickname: node.nickname || node.name || "Member",
          referral_code: node.referral_code || "",
          level: depth,
          wallet_balance: 0,
          points_balance: 0,
          childrenCount: node.children ? node.children.length : 0,
          parentPhone: parentId,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
        });
      }

      if (parentId) {
        linkList.push({ source: parentId, target: uid });
      }

      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((c: any) => traverse(c, uid, depth + 1));
      }
    };

    (trees || []).forEach((r) => traverse(r, undefined, 1));

    const nodeList = Array.from(nodesMap.values());

    const rect = containerRef.current?.getBoundingClientRect();
    const cx = (rect?.width || 800) / 2;
    const cy = (rect?.height || 600) / 2;

    const rootNodes = nodeList.filter((n) => !n.parentPhone || n.level === 1);
    rootNodes.forEach((root, idx) => {
      const angle = (2 * Math.PI * idx) / Math.max(1, rootNodes.length);
      const rad = rootNodes.length > 1 ? 140 : 0;
      root.x = cx + Math.cos(angle) * rad + (Math.random() - 0.5) * 30;
      root.y = cy + Math.sin(angle) * rad + (Math.random() - 0.5) * 30;
    });

    nodeList.filter((n) => n.parentPhone && n.level > 1).forEach((child) => {
      const parent = nodesMap.get(child.parentPhone!);
      if (parent) {
        const randAngle = Math.random() * 2 * Math.PI;
        const dist = 55 + Math.random() * 45;
        child.x = parent.x + Math.cos(randAngle) * dist;
        child.y = parent.y + Math.sin(randAngle) * dist;
      } else {
        child.x = cx + (Math.random() - 0.5) * 300;
        child.y = cy + (Math.random() - 0.5) * 300;
      }
    });

    nodesRef.current = nodeList;
    linksRef.current = linkList;
    alphaRef.current = 1.0;

    // Warmup simulation
    for (let i = 0; i < 70; i++) {
      stepForcePhysics(nodeList, linkList, cx, cy, 0.95);
    }
  }, [trees, allUsers]);

  // Fit all nodes into screen view
  const fitView = React.useCallback(() => {
    const nodes = nodesRef.current;
    if (nodes.length === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const graphW = Math.max(120, maxX - minX + 140);
    const graphH = Math.max(120, maxY - minY + 140);
    const scaleX = rect.width / graphW;
    const scaleY = rect.height / graphH;
    const k = Math.max(0.25, Math.min(1.8, Math.min(scaleX, scaleY)));

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const x = rect.width / 2 - midX * k;
    const y = rect.height / 2 - midY * k;

    setTransform({ x, y, k });
  }, []);

  // Center once after layout initialized
  React.useEffect(() => {
    const timer = setTimeout(fitView, 120);
    return () => clearTimeout(timer);
  }, [fitView]);

  // Canvas Animation Frame Loop
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    const render = () => {
      if (!running) return;

      const rect = containerRef.current?.getBoundingClientRect();
      const w = rect?.width || 800;
      const h = rect?.height || 600;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      const nodes = nodesRef.current;
      const links = linksRef.current;
      const { x: panX, y: panY, k } = transformRef.current;

      // Run force physics step
      if (alphaRef.current > 0.003) {
        stepForcePhysics(nodes, links, w / 2, h / 2, alphaRef.current);
        alphaRef.current *= 0.99;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // Clean off-white background with subtle dot grid
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);

      const gridSize = 24 * k;
      if (gridSize > 8) {
        const startX = ((panX % gridSize) + gridSize) % gridSize;
        const startY = ((panY % gridSize) + gridSize) % gridSize;
        ctx.fillStyle = "#E2E8F0";
        for (let gx = startX; gx < w; gx += gridSize) {
          for (let gy = startY; gy < h; gy += gridSize) {
            ctx.fillRect(gx - 0.5, gy - 0.5, 1, 1);
          }
        }
      }

      // Camera Viewport Transform
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(k, k);

      const nodeMap = new Map<string, ForceNode>();
      for (let i = 0; i < nodes.length; i++) {
        nodeMap.set(nodes[i].id, nodes[i]);
      }

      const selId = selectedNode?.id;
      const hovId = hoveredNode?.id;

      // 1. Draw Links with Directional Arrowheads (Exact match to Image 1)
      for (let i = 0; i < links.length; i++) {
        const l = links[i];
        const s = nodeMap.get(l.source);
        const t = nodeMap.get(l.target);
        if (!s || !t) continue;

        const isHighlighted =
          selId === s.id || selId === t.id || hovId === s.id || hovId === t.id;

        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const angle = Math.atan2(dy, dx);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = isHighlighted ? "#0B57D0" : "#94A3B8";
        ctx.lineWidth = isHighlighted ? 2.2 : 1;
        ctx.stroke();

        // Draw Arrowhead at 65% distance towards child
        const ax = s.x + dx * 0.65;
        const ay = s.y + dy * 0.65;
        const arrowLen = isHighlighted ? 6 : 4.5;

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(
          ax - arrowLen * Math.cos(angle - Math.PI / 6),
          ay - arrowLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          ax - arrowLen * Math.cos(angle + Math.PI / 6),
          ay - arrowLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = isHighlighted ? "#0B57D0" : "#64748B";
        ctx.fill();
      }

      // 2. Draw Nodes: Square Glyphs with Tier Palette (Exact match to Image 1)
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const isSel = selId === n.id;
        const isHov = hovId === n.id;
        const isQuery =
          internalSearch.trim() &&
          (n.nickname.toLowerCase().includes(internalSearch.toLowerCase()) ||
            n.phone.includes(internalSearch) ||
            n.referral_code.toLowerCase().includes(internalSearch.toLowerCase()));

        const radius = n.level === 1 ? 5.5 : 4.5;
        const c = TIER_COLORS[n.level] || { bg: "#64748B", border: "#334155" };

        // Draw Round Point / Circle (Minimal selected look: change color of pin, no outside highlight)
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? "#0B57D0" : isQuery ? "#0B57D0" : isHov ? "#1E293B" : c.bg;
        ctx.fill();
        ctx.strokeStyle = isSel || isQuery ? "#0842A0" : isHov ? "#000000" : c.border;
        ctx.lineWidth = isSel || isQuery ? 1.5 : 1;
        ctx.stroke();

        // Draw Text Label Centered Under Point (User request: name is under the point..center)
        if (showLabels || isSel || isHov || isQuery || k > 0.8) {
          const label = n.nickname || n.referral_code || maskPhoneLast4(n.phone);
          ctx.font = isSel || isQuery
            ? "bold 10px Inter, system-ui, sans-serif"
            : "9px Inter, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = isSel || isQuery ? "#0B57D0" : isHov ? "#000000" : "#1E293B";
          ctx.fillText(label, n.x, n.y + radius + 3.5);
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
        }
      }

      ctx.restore();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [showLabels, selectedNode, hoveredNode, internalSearch]);

  // Mouse Interactions
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { x: panX, y: panY, k } = transformRef.current;
    const gx = (mx - panX) / k;
    const gy = (my - panY) / k;

    hasMovedRef.current = false;

    const hitRadius = Math.max(9, 14 / k);
    const hit = nodesRef.current.find((n) => {
      const dx = n.x - gx;
      const dy = n.y - gy;
      return dx * dx + dy * dy <= hitRadius * hitRadius;
    });

    if (hit) {
      isDraggingNodeRef.current = hit;
      hit.isDragging = true;
      alphaRef.current = Math.max(alphaRef.current, 0.35);
    } else {
      isPanningRef.current = true;
      startPanRef.current = { x: mx - panX, y: my - panY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { x: panX, y: panY, k } = transformRef.current;

    hasMovedRef.current = true;

    if (isDraggingNodeRef.current) {
      const node = isDraggingNodeRef.current;
      node.x = (mx - panX) / k;
      node.y = (my - panY) / k;
      node.vx = 0;
      node.vy = 0;
      alphaRef.current = Math.max(alphaRef.current, 0.3);
      return;
    }

    if (isPanningRef.current) {
      setTransform((prev) => ({
        ...prev,
        x: mx - startPanRef.current.x,
        y: my - startPanRef.current.y,
      }));
      return;
    }

    const gx = (mx - panX) / k;
    const gy = (my - panY) / k;
    const hitRadius = Math.max(9, 14 / k);
    const hit = nodesRef.current.find((n) => {
      const dx = n.x - gx;
      const dy = n.y - gy;
      return dx * dx + dy * dy <= hitRadius * hitRadius;
    });
    setHoveredNode(hit || null);
  };

  const handleMouseUp = () => {
    if (isDraggingNodeRef.current) {
      isDraggingNodeRef.current.isDragging = false;
      if (!hasMovedRef.current) {
        setSelectedNode(isDraggingNodeRef.current);
      }
      isDraggingNodeRef.current = null;
    }
    isPanningRef.current = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hasMovedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const { x: panX, y: panY, k } = transformRef.current;
    const gx = (mx - panX) / k;
    const gy = (my - panY) / k;

    const hitRadius = Math.max(9, 14 / k);
    const hit = nodesRef.current.find((n) => {
      const dx = n.x - gx;
      const dy = n.y - gy;
      return dx * dx + dy * dy <= hitRadius * hitRadius;
    });

    setSelectedNode(hit || null);
    if (hit) onSelectMember?.(hit.phone);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { x: panX, y: panY, k } = transformRef.current;
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const nextK = Math.max(0.15, Math.min(6.0, k * zoomFactor));

    const wx = (mx - panX) / k;
    const wy = (my - panY) / k;
    const nextX = mx - wx * nextK;
    const nextY = my - wy * nextK;

    setTransform({ x: nextX, y: nextY, k: nextK });
  };

  const zoomIn = () => {
    setTransform((prev) => {
      const nextK = Math.min(6, prev.k * 1.25);
      const rect = containerRef.current?.getBoundingClientRect();
      const cx = (rect?.width || 800) / 2;
      const cy = (rect?.height || 600) / 2;
      return {
        k: nextK,
        x: cx - ((cx - prev.x) / prev.k) * nextK,
        y: cy - ((cy - prev.y) / prev.k) * nextK,
      };
    });
  };

  const zoomOut = () => {
    setTransform((prev) => {
      const nextK = Math.max(0.15, prev.k * 0.8);
      const rect = containerRef.current?.getBoundingClientRect();
      const cx = (rect?.width || 800) / 2;
      const cy = (rect?.height || 600) / 2;
      return {
        k: nextK,
        x: cx - ((cx - prev.x) / prev.k) * nextK,
        y: cy - ((cy - prev.y) / prev.k) * nextK,
      };
    });
  };

  const shakePhysics = () => {
    nodesRef.current.forEach((n) => {
      n.vx += (Math.random() - 0.5) * 25;
      n.vy += (Math.random() - 0.5) * 25;
    });
    alphaRef.current = 0.85;
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!internalSearch.trim()) return;
    const q = internalSearch.toLowerCase();
    const found = nodesRef.current.find(
      (n) =>
        n.nickname.toLowerCase().includes(q) ||
        n.phone.includes(q) ||
        n.referral_code.toLowerCase().includes(q)
    );
    if (found) {
      setSelectedNode(found);
      const rect = containerRef.current?.getBoundingClientRect();
      const cx = (rect?.width || 800) / 2;
      const cy = (rect?.height || 600) / 2;
      const k = 1.4;
      setTransform({
        k,
        x: cx - found.x * k,
        y: cy - found.y * k,
      });
    } else {
      showToast("Member not found in network graph", "error");
    }
  };

  React.useEffect(() => {
    if (searchQuery !== undefined) {
      setInternalSearch(searchQuery);
      if (searchQuery.trim() && nodesRef.current.length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const found = nodesRef.current.find(
          (n) =>
            n.nickname.toLowerCase().includes(q) ||
            n.phone.includes(q) ||
            n.referral_code.toLowerCase().includes(q) ||
            n.id.toLowerCase().includes(q)
        );
        if (found) {
          setSelectedNode(found);
        }
      }
    }
  }, [searchQuery]);

  React.useImperativeHandle(ref, () => ({
    zoomIn,
    zoomOut,
    fitView,
    search: (query: string) => {
      setInternalSearch(query);
      const q = query.toLowerCase().trim();
      if (!q) return;
      const found = nodesRef.current.find(
        (n) =>
          n.nickname.toLowerCase().includes(q) ||
          n.phone.includes(q) ||
          n.referral_code.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q)
      );
      if (found) {
        setSelectedNode(found);
        const rect = containerRef.current?.getBoundingClientRect();
        const cx = (rect?.width || 800) / 2;
        const cy = (rect?.height || 600) / 2;
        const k = 1.4;
        setTransform({
          k,
          x: cx - found.x * k,
          y: cy - found.y * k,
        });
      }
    },
  }));

  return (
    <section className="flex-1 h-full flex flex-col bg-white overflow-hidden font-primary">
      {/* 1. TOP CONTROLS TOOLBAR */}
      {!hideToolbar && (
        <div className="px-3 py-2 bg-[#F8F9FA] border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[100px] max-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search member, phone, code..."
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-2 rounded-md border border-slate-200 text-xs bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#0B57D0]"
            />
          </form>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              onClick={zoomIn}
              title="Zoom In"
              className="h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-zinc-700 cursor-pointer shadow-2xs"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              title="Zoom Out"
              className="h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-zinc-700 cursor-pointer shadow-2xs"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={fitView}
              title="Fit to Screen"
              className="h-8 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fit All</span>
            </button>

            <div className="h-4 w-px bg-slate-200 mx-0.5" />

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Network Map"
              className="h-8 w-8 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white flex items-center justify-center cursor-pointer disabled:opacity-50 shadow-2xs shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      )}



      {/* 3. INTERACTIVE FORCE-DIRECTED CANVAS */}
      <div ref={containerRef} className="relative flex-1 min-h-0 w-full h-full overflow-hidden bg-white">
        {/* Floating Top Center Qty Badge */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 text-xs text-zinc-600 bg-white/95 backdrop-blur-xs px-3.5 py-1 rounded-full border border-slate-200 shadow-xs pointer-events-none select-none">
          <span>Members:</span>
          <span className="font-bold text-zinc-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
            {nodesRef.current.length}
          </span>
          <span className="text-zinc-300">•</span>
          <span>Branches:</span>
          <span className="font-bold text-zinc-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
            {linksRef.current.length}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
          onWheel={handleWheel}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
        />

        {/* Loading Overlay */}
        {loading && nodesRef.current.length === 0 && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-[#0B57D0]" />
            <span>Building force-directed network topology...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && nodesRef.current.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 text-xs gap-1 pointer-events-none">
            <span>No referral branches found yet.</span>
            <span className="text-[11px] text-zinc-400">Invite new members to see the network blossom!</span>
          </div>
        )}


      </div>
    </section>
  );
});

export function HsgMembersTab({
  users,
  withdrawals,
  loading,
  onRefresh,
  subView = "members",
  eventRsvps = [],
  contestSubmissions = [],
  merchOrders = [],
}: {
  users: HsgUserRecord[];
  withdrawals: HsgWithdrawalRecord[];
  loading: boolean;
  onRefresh: () => void;
  subView?: "combined" | "members" | "withdrawals" | "network";
  eventRsvps?: HsgEventRsvpRecord[];
  contestSubmissions?: HsgContestSubmission[];
  merchOrders?: any[];
}) {
  const [selectedPhone, setSelectedPhone] = React.useState<string>("ALL");
  const [memberSearch, setMemberSearch] = React.useState<string>("");
  const networkGraphRef = React.useRef<HsgNetworkGraphHandle>(null);
  const [wdrSearch, setWdrSearch] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<
    "all" | "requested" | "completed" | "rejected"
  >("all");

  // Member Add / Edit Modal
  const [showMemberModal, setShowMemberModal] = React.useState<boolean>(false);
  const [isBlocked, setIsBlocked] = React.useState<boolean>(false);
  const [revealedPhones, setRevealedPhones] = React.useState<Record<string, boolean>>({});
  const [selectedLogUser, setSelectedLogUser] = React.useState<HsgUserRecord | null>(null);
  const [showLogsModal, setShowLogsModal] = React.useState<boolean>(false);
  const toggleRevealPhone = (id: string) => {
    setRevealedPhones((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const [memberUserId, setMemberUserId] = React.useState<string>("");
  const [memberPhoneLast4, setMemberPhoneLast4] = React.useState<string>("");
  const [memberPaynowLast4, setMemberPaynowLast4] = React.useState<string>("");
  const [phone, setPhone] = React.useState<string>("");
  const [nickname, setNickname] = React.useState<string>("");
  const [paynow, setPaynow] = React.useState<string>("");
  const [walletBalance, setWalletBalance] = React.useState<number>(0);
  const [pointsBalance, setPointsBalance] = React.useState<number>(0);
  const [weeklyStreak, setWeeklyStreak] = React.useState<number>(1);
  const [ig, setIg] = React.useState<string>("");
  const [tt, setTt] = React.useState<string>("");
  const [fb, setFb] = React.useState<string>("");
  const [thread, setThread] = React.useState<string>("");
  const [savingMember, setSavingMember] = React.useState<boolean>(false);
  const [isEditingExisting, setIsEditingExisting] = React.useState<boolean>(false);

  // 5-Tier Referral Pyramid Network Map State
  const [networkLoading, setNetworkLoading] = React.useState<boolean>(false);
  const [networkTrees, setNetworkTrees] = React.useState<any[]>([]);
  const [totalNetworkUsers, setTotalNetworkUsers] = React.useState<number>(0);
  const [networkSearch, setNetworkSearch] = React.useState<string>("");
  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({});

  const fetchNetworkTrees = React.useCallback(async () => {
    setNetworkLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/referral/network?all=true`);
      if (res.ok) {
        const data = await res.json();
        if (data.trees) {
          setNetworkTrees(data.trees);
          setTotalNetworkUsers(data.total_users || 0);
          const exp: Record<string, boolean> = {};
          data.trees.forEach((t: any) => {
            const k = t.id || t.phone;
            if (k) exp[k] = true;
          });
          setExpandedNodes(exp);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch referral network:", e);
    } finally {
      setNetworkLoading(false);
    }

  }, []);
  const handleReNetwork = async () => {
    setNetworkLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/referral/re-network`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.trees) {
          setNetworkTrees(data.trees);
          setTotalNetworkUsers(data.total_users || 0);
        }
        showToast("Referral network snapshot rebuilt successfully", "success");
      } else {
        showToast(data.error || "Failed to rebuild network snapshot", "error");
      }
    } catch (err: any) {
      showToast("Re-network error: " + (err.message || String(err)), "error");
    } finally {
      setNetworkLoading(false);
    }
  };



  React.useEffect(() => {
    if (subView === "network" || subView === "members") {
      fetchNetworkTrees();
    }
  }, [subView, fetchNetworkTrees]);

  const toggleNode = (nodePhone: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodePhone]: !prev[nodePhone],
    }));
  };

  const expandAllNodes = () => {
    const exp: Record<string, boolean> = {};
    const traverse = (node: any) => {
      const k = node.id || node.phone;
      if (k) exp[k] = true;
      (node.children || []).forEach(traverse);
    };
    networkTrees.forEach(traverse);
    setExpandedNodes(exp);
  };

  const collapseAllNodes = () => {
    setExpandedNodes({});
  };

  const renderTreeNode = (node: any, level: number): React.ReactNode => {
    const nodeKey = node.id || node.phone;
    const isExpanded = Boolean(expandedNodes[nodeKey]);
    const hasChildren = node.children && node.children.length > 0;

    const tierBadge =
      level === 1
        ? { label: "Root / Tier 0", cls: "bg-slate-900 text-amber-300 border-slate-900" }
        : level === 2
        ? { label: "Tier 1 Direct (+$5.00 & 50 pts)", cls: "bg-emerald-50 text-emerald-800 border-emerald-300" }
        : level === 3
        ? { label: "Tier 2 (+25 pts)", cls: "bg-blue-50 text-blue-800 border-blue-300" }
        : level === 4
        ? { label: "Tier 3 (+15 pts)", cls: "bg-purple-50 text-purple-800 border-purple-300" }
        : level === 5
        ? { label: "Tier 4 (+10 pts)", cls: "bg-amber-50 text-amber-800 border-amber-300" }
        : { label: "Tier 5 (+5 pts)", cls: "bg-rose-50 text-rose-800 border-rose-300" };

    return (
      <div key={node.id || node.phone} className="space-y-2">
        <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition">
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNode(node.id || node.phone)}
                className="w-5 h-5 rounded hover:bg-slate-200 flex items-center justify-center text-zinc-600 transition"
              >
                {isExpanded ? (
                  <ArrowDown className="w-3 h-3 text-[#0B57D0]" />
                ) : (
                  <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                )}
              </button>
            ) : (
              <div className="w-5 h-5 flex items-center justify-center text-zinc-300">
                •
              </div>
            )}

            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${tierBadge.cls}`}>
              {tierBadge.label}
            </span>

            <span className="font-mono font-bold text-xs text-zinc-950">
              +{maskPhoneLast4(node.phone)}
            </span>

            {node.nickname && (
              <span className="text-xs text-zinc-600 truncate max-w-[120px]">
                ({node.nickname})
              </span>
            )}

            <span className="font-mono text-[10px] text-zinc-400 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
              {node.referral_code}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            <span className="text-zinc-500">
              Balance:{" "}
              <strong className="text-zinc-900 font-mono">
                ${Number(node.wallet_balance || 0).toFixed(2)}
              </strong>
            </span>
            <span className="text-zinc-500">
              Points:{" "}
              <strong className="text-amber-600 font-mono">
                {node.points_balance || 0} pts
              </strong>
            </span>
            <span className="font-bold text-zinc-700 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px]">
              {node.children ? node.children.length : 0} downlines
            </span>
          </div>
        </div>

        {/* Children Sub-branches */}
        {hasChildren && isExpanded && (
          <div className="pl-6 border-l-2 border-slate-200 ml-2.5 space-y-2">
            {node.children.map((child: any) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };


  // Process Withdrawal Modal
  const [selectedWdr, setSelectedWdr] = React.useState<HsgWithdrawalRecord | null>(
    null
  );
  const [referenceNo, setReferenceNo] = React.useState<string>("");
  const [rejectReason, setRejectReason] = React.useState<string>("");
  const [processingWdr, setProcessingWdr] = React.useState<boolean>(false);

  const handleOpenEditMember = (u?: HsgUserRecord) => {
    setIsEditingExisting(Boolean(u));
    if (u) {
      setMemberUserId(u.id || "");
      const pLast4 = u.phone_last4 || (u.privacy?.phone ? u.privacy.phone.slice(-4) : "") || (u.phone_number?.length >= 4 ? u.phone_number.slice(-4) : "");
      setMemberPhoneLast4(pLast4);
      setPhone(u.phone_number);
      setNickname(u.nickname || "");
      setPaynow(u.paynow_number || "");
      setWalletBalance(Number(u.wallet_balance || 0));
      setPointsBalance(
        Number(u.points_balance ?? u.social_handles?.points_balance ?? 0)
      );
      setWeeklyStreak(Number(u.weekly_streak || 1));
      setIg(u.social_handles?.ig || "");
      setTt(u.social_handles?.tt || "");
      setFb(u.social_handles?.fb || "");
      setThread(u.social_handles?.thread || "");
      setIsBlocked(Boolean(u.is_blocked));
    } else {
      setPhone("");
      setNickname("");
      setPaynow("");
      setWalletBalance(0);
      setPointsBalance(0);
      setWeeklyStreak(1);
      setIg("");
      setTt("");
      setFb("");
      setThread("");
    }
    setShowMemberModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      showToast("Phone number is required", "error");
      return;
    }
    setSavingMember(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/users/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: memberUserId || undefined,
          user_id: memberUserId || undefined,
          phone_number: phone.trim(),
          nickname: nickname.trim(),
          paynow_number: paynow.trim(),
          is_blocked: isBlocked,
          actor: "Admin",
          socials: { ig, tt, fb, thread },
          social_handles: { ig, tt, fb, thread },
        }),
      });
      if (!res.ok) throw new Error("Failed to save member");
      showToast("Member profile saved", "success");
      setShowMemberModal(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Save failed", "error");
    } finally {
      setSavingMember(false);
    }
  };

  const handleUpdatePayout = async (newStatus: "completed" | "rejected") => {
    if (!selectedWdr) return;
    setProcessingWdr(true);
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/cashback/withdrawals/${encodeURIComponent(
          selectedWdr.id
        )}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: newStatus,
            payout_proof:
              newStatus === "completed"
                ? {
                    reference_no: referenceNo.trim() || `PAYNOW-${Date.now()}`,
                    paid_by: "Admin",
                    paid_at: Date.now(),
                  }
                : {},
            rejection_reason:
              newStatus === "rejected"
                ? rejectReason.trim() || "PayNow mobile number invalid"
                : "",
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to update withdrawal");
      showToast(
        newStatus === "completed"
          ? "PayNow transfer marked as Completed!"
          : "Withdrawal rejected & refunded to member wallet",
        "success"
      );
      setSelectedWdr(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || "Action failed", "error");
    } finally {
      setProcessingWdr(false);
    }
  };

  const filteredMembers = users.filter((u) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      (u.nickname || "").toLowerCase().includes(q) ||
      (u.phone_number || "").includes(q) ||
      Boolean((u as any).phone_last4 && (u as any).phone_last4.includes(q)) ||
      (u.paynow_number || "").includes(q)
    );
  });

  // Event RSVPs per user phone
  const eventRsvpsCountMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    (eventRsvps || []).forEach((r) => {
      const p = String(r.user_phone || "").replace(/\D/g, "");
      if (p) map[p] = (map[p] || 0) + 1;
    });
    return map;
  }, [eventRsvps]);

  // Contest submissions per user phone
  const contestSubmissionsCountMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    (contestSubmissions || []).forEach((c) => {
      const p = String(c.user_phone || "").replace(/\D/g, "");
      if (p) map[p] = (map[p] || 0) + 1;
    });
    return map;
  }, [contestSubmissions]);

  // Merch purchases per user phone
  const merchOrdersCountMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    (merchOrders || []).forEach((o) => {
      const p = String(o.user_phone || "").replace(/\D/g, "");
      if (p) map[p] = (map[p] || 0) + 1;
    });
    return map;
  }, [merchOrders]);

  // Direct referrals per user phone / code
  const directDownlineMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    (users || []).forEach((u) => {
      const s = u.social_handles || {};
      const refPhone = String(u.referred_by_phone || s.referred_by_phone || "").replace(/\D/g, "");
      const refCode = String(u.referred_by || s.referred_by || "").toUpperCase();
      if (refPhone) map[refPhone] = (map[refPhone] || 0) + 1;
      if (refCode) map[refCode] = (map[refCode] || 0) + 1;
    });
    return map;
  }, [users]);

  // Compute Activity Score to rank top active members on top
  const getMemberActivityScore = React.useCallback(
    (u: HsgUserRecord) => {
      const p = String(u.phone_number || "").replace(/\D/g, "");
      const code = String(u.referral_code || u.social_handles?.referral_code || "").toUpperCase();
      const streak = Number(u.weekly_streak || 1);
      const evCount = eventRsvpsCountMap[p] || 0;
      const ctCount = contestSubmissionsCountMap[p] || 0;
      const ordCount = merchOrdersCountMap[p] || 0;
      const refCount = (directDownlineMap[p] || 0) + (code && directDownlineMap[code] ? directDownlineMap[code] : 0);
      const wallet = Number(u.wallet_balance || 0);
      const pts = Number(u.points_balance ?? u.social_handles?.points_balance ?? 0);

      return (
        streak * 10 +
        evCount * 8 +
        ctCount * 8 +
        ordCount * 6 +
        refCount * 5 +
        (wallet > 0 ? 2 : 0) +
        (pts > 0 ? 1 : 0)
      );
    },
    [eventRsvpsCountMap, contestSubmissionsCountMap, merchOrdersCountMap, directDownlineMap]
  );

  const sortedMembers = React.useMemo(() => {
    return [...filteredMembers].sort((a, b) => {
      const scoreA = getMemberActivityScore(a);
      const scoreB = getMemberActivityScore(b);
      if (scoreB !== scoreA) return scoreB - scoreA;
      return Number(b.created_at || 0) - Number(a.created_at || 0);
    });
  }, [filteredMembers, getMemberActivityScore]);



  const filteredWithdrawals = withdrawals.filter((w) => {
    if (selectedPhone !== "ALL" && w.user_phone !== selectedPhone) return false;
    if (statusFilter !== "all" && w.status !== statusFilter) return false;
    if (wdrSearch.trim()) {
      const q = wdrSearch.toLowerCase();
      return (
        (w.user_nickname || "").toLowerCase().includes(q) ||
        (w.user_phone || "").includes(q) ||
        (w.paynow_number || "").includes(q) ||
        (w.id || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendingTotal = withdrawals
    .filter((w) => w.status === "requested")
    .reduce((s, w) => s + Number(w.amount || 0), 0);
  const completedTotal = withdrawals
    .filter((w) => w.status === "completed")
    .reduce((s, w) => s + Number(w.amount || 0), 0);

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-white">
      {/* 1. MEMBERS DIRECTORY (CONTINUOUS UNIFIED FULL-WIDTH HEADER + SPLIT TABLE & GRAPH) */}
      {subView === "members" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
          {/* CONTINUOUS UNIFIED TOP HEADER BAR ACROSS ENTIRE WIDTH */}
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div>
              <h2 className="text-xs font-semibold text-zinc-900">
                Community Members
              </h2>
              <p className="text-[11px] text-zinc-500">
                Ranked by top active engagement, events joined, and downline referrals.
              </p>
            </div>

            {/* UNIFIED CONTROLS: SINGLE SEARCH BAR ONLY + NETWORK ZOOM & REFRESH */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search member, phone, code..."
                  value={memberSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMemberSearch(val);
                    setNetworkSearch(val);
                    networkGraphRef.current?.search(val);
                  }}
                  className="h-8 pl-8 pr-2.5 w-60 rounded-lg bg-white border border-slate-200 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => networkGraphRef.current?.zoomIn()}
                  title="Zoom In"
                  className="h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-zinc-700 cursor-pointer shadow-2xs"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => networkGraphRef.current?.zoomOut()}
                  title="Zoom Out"
                  className="h-8 w-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-zinc-700 cursor-pointer shadow-2xs"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => networkGraphRef.current?.fitView()}
                  title="Fit to Screen"
                  className="h-8 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Fit All</span>
                </button>

                <div className="h-4 w-px bg-slate-200 mx-0.5" />

                <button
                  type="button"
                  onClick={fetchNetworkTrees}
                  disabled={networkLoading}
                  title="Refresh Network Map"
                  className="h-8 w-8 rounded-md bg-[#0B57D0] hover:bg-[#0842A0] text-white flex items-center justify-center cursor-pointer disabled:opacity-50 shadow-2xs shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${networkLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* LOWER SPLIT BODY: (65% TABLE / 35% REFERRAL NETWORK GRAPH) */}
          <div className="flex-1 min-h-0 flex overflow-hidden bg-white">
            {/* LEFT SIDE (65%): MEMBERS DIRECTORY TABLE */}
            <section className="flex-1 min-w-0 h-full flex flex-col bg-white border-r border-slate-200 overflow-hidden">
              {/* COMPACT CLEAN TABLE */}
              <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-[#F8F9FA] border-b border-slate-200 text-zinc-600 font-medium text-[11px]">
                  <tr>
                    <th className="py-2 px-3">Member</th>
                    <th className="py-2 px-3">Phone</th>
                    <th className="py-2 px-2.5 text-right">Cash</th>
                    <th className="py-2 px-2.5 text-right">Pts</th>
                    <th className="py-2 px-2 text-center">Streak</th>
                    <th className="py-2 px-2 text-center">Ref</th>
                    <th className="py-2 px-2 text-center">Events</th>
                    <th className="py-2 px-2 text-center">Contests</th>
                    <th className="py-2 px-2 text-center">Orders</th>
                    <th className="py-2 px-3">Social</th>
                    <th className="py-2 px-3">Joined</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-zinc-400">
                        Loading community members...
                      </td>
                    </tr>
                  ) : sortedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-zinc-400">
                        No members registered yet.
                      </td>
                    </tr>
                  ) : (
                    sortedMembers.map((u) => {
                      const cleanP = String(u.phone_number || "").replace(/\D/g, "");
                      const code = String(u.referral_code || u.social_handles?.referral_code || "").toUpperCase();
                      const evJoined = eventRsvpsCountMap[cleanP] || eventRsvpsCountMap[u.phone_number] || 0;
                      const ctSub = contestSubmissionsCountMap[cleanP] || contestSubmissionsCountMap[u.phone_number] || 0;
                      const ordCount = merchOrdersCountMap[cleanP] || merchOrdersCountMap[u.phone_number] || 0;
                      const refCount = (directDownlineMap[cleanP] || 0) + (code && directDownlineMap[code] ? directDownlineMap[code] : 0);
                      const isSelected = selectedPhone === u.phone_number;
                      const socialList = [
                        u.social_handles?.ig && `IG: ${u.social_handles.ig}`,
                        u.social_handles?.tt && `TT: ${u.social_handles.tt}`,
                        u.social_handles?.fb && `FB: ${u.social_handles.fb}`,
                      ].filter(Boolean).join(" • ");

                      return (
                        <tr
                          key={u.phone_number}
                          onClick={() => setSelectedPhone((prev) => (prev === u.phone_number ? "ALL" : u.phone_number))}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? "bg-blue-50/40 border-l-2 border-l-[#0B57D0]"
                              : "hover:bg-slate-50/70"
                          }`}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-medium text-zinc-900 truncate block max-w-[110px]">
                                {u.nickname || "Member"}
                              </span>
                              {u.is_blocked && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                                  BLOCKED
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 font-mono text-zinc-600 text-[11px] whitespace-nowrap">
                            {(() => {
                              const uKey = u.id || u.phone_number;
                              const isRevealed = Boolean(revealedPhones[uKey]);
                              const isPrivacyOff = u.privacy?.mode === false;
                              const last4 = u.phone_last4 || (u.phone_number?.length >= 4 ? u.phone_number.slice(-4) : "----");

                              if (isPrivacyOff) {
                                return (
                                  <div className="inline-flex items-center gap-1.5">
                                    <span>{isRevealed ? (u.privacy?.phone || u.raw_phone || u.phone_number) : `...${last4}`}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRevealPhone(uKey);
                                      }}
                                      title={isRevealed ? "Hide Full Number" : "User privacy is OFF - Click to reveal"}
                                      className="p-0.5 rounded hover:bg-slate-200 text-zinc-400 hover:text-zinc-700 transition cursor-pointer"
                                    >
                                      {isRevealed ? <EyeOff className="w-3 h-3 text-[#0B57D0]" /> : <Eye className="w-3 h-3 text-zinc-500" />}
                                    </button>
                                  </div>
                                );
                              }

                              return <span>...{last4}</span>;
                            })()}
                          </td>
                          <td className="py-2 px-2.5 text-right font-medium text-zinc-900 whitespace-nowrap">
                            ${Number(u.wallet_balance || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 text-right text-zinc-600 whitespace-nowrap">
                            {Number(u.points_balance ?? u.social_handles?.points_balance ?? 0)}
                          </td>
                          <td className="py-2 px-2 text-center text-zinc-600 whitespace-nowrap">
                            {u.weekly_streak || 1}w
                          </td>
                          <td className="py-2 px-2 text-center text-zinc-600 whitespace-nowrap">
                            {refCount > 0 ? refCount : "-"}
                          </td>
                          <td className="py-2 px-2 text-center text-zinc-600 whitespace-nowrap">
                            {evJoined > 0 ? evJoined : "-"}
                          </td>
                          <td className="py-2 px-2 text-center text-zinc-600 whitespace-nowrap">
                            {ctSub > 0 ? ctSub : "-"}
                          </td>
                          <td className="py-2 px-2 text-center text-zinc-600 whitespace-nowrap">
                            {ordCount > 0 ? ordCount : "-"}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-zinc-400 font-normal truncate max-w-[110px]" title={socialList}>
                            {socialList || "-"}
                          </td>
                          <td className="py-2 px-3 text-zinc-400 text-[11px] whitespace-nowrap">
                            {formatDateShort(u.created_at)}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1 justify-end">
                              <button
                                type="button"
                                onClick={() => handleOpenEditMember(u)}
                                className="h-6 px-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium text-zinc-600 inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <Pencil className="w-2.5 h-2.5 text-zinc-400" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLogUser(u);
                                  setShowLogsModal(true);
                                }}
                                title="View Member Logs"
                                className="h-6 px-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium text-zinc-600 inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <FileText className="w-2.5 h-2.5 text-zinc-400" />
                                <span>Logs</span>
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
          </section>

          {/* RIGHT SIDE (35%): REFERRAL NETWORK FORCE-DIRECTED MAP */}
          <section className="w-[35%] min-w-[340px] max-w-[500px] h-full flex flex-col bg-white overflow-hidden shrink-0">
            <HsgReferralNetworkForceGraph
              ref={networkGraphRef}
              hideToolbar={true}
              trees={networkTrees}
              allUsers={users}
              searchQuery={memberSearch}
              onRefresh={fetchNetworkTrees}
              onReNetwork={handleReNetwork}
              loading={networkLoading}
              compact={true}
              selectedPhone={selectedPhone === "ALL" ? undefined : selectedPhone}
              onSelectMember={(phone) => setSelectedPhone(phone)}
            />
          </section>
        </div>
      </div>
      )}

      {/* 2. COMBINED SUBVIEW (FOR COMPACT SPLIT WITHDRAWAL PROCESSING) */}
      {subView === "combined" && (
        <section className="w-[38%] min-w-[360px] max-w-[480px] h-full border-r border-slate-200 flex flex-col bg-slate-50/40 overflow-hidden">
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div>
              <h2 className="text-xs font-semibold text-zinc-900">Community Members</h2>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="h-8 pl-3 pr-2.5 w-36 rounded-lg bg-white border border-slate-200 text-xs outline-none focus:border-[#0B57D0]"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {sortedMembers.map((u) => (
              <div
                key={u.phone_number}
                onClick={() => setSelectedPhone((prev) => (prev === u.phone_number ? "ALL" : u.phone_number))}
                className={`p-3 rounded-lg border transition cursor-pointer bg-white space-y-2 ${
                  selectedPhone === u.phone_number
                    ? "border-[#0B57D0] ring-2 ring-[#0B57D0]/20 bg-blue-50/15 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-zinc-900 truncate">{u.nickname || "Member"}</div>
                    <div className="text-[11px] font-mono text-zinc-500 mt-0.5">+{maskPhoneLast4(u.phone_number)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-zinc-900">${Number(u.wallet_balance || 0).toFixed(2)}</div>
                    <div className="text-[10px] text-zinc-500">{Number(u.points_balance ?? u.social_handles?.points_balance ?? 0)} pts</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* RIGHT PANEL OR FULL WITHDRAWALS TABLE */}
      {(subView === "combined" || subView === "withdrawals") && (
        <section className="flex-1 h-full flex flex-col bg-white overflow-hidden">
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-200/70">
                {(
                  [
                    { id: "all", label: "All Withdrawals" },
                    { id: "requested", label: "Pending Payout" },
                    { id: "completed", label: "Completed" },
                    { id: "rejected", label: "Rejected" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setStatusFilter(t.id)}
                    className={`h-7 px-2.5 rounded-md text-xs font-bold transition ${
                      statusFilter === t.id
                        ? "bg-white text-[#0B57D0] shadow-xs"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {selectedPhone !== "ALL" && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#0B57D0]/10 text-[#0B57D0] flex items-center gap-1.5">
                  <span>
                    Member: +{selectedPhone}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPhone("ALL")}
                    className="w-3.5 h-3.5 rounded-full bg-[#0B57D0]/20 hover:bg-[#0842A0] hover:text-white flex items-center justify-center text-[10px]"
                  >
                    ×
                  </button>
                </span>
              )}

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>
                  Pending: <strong className="font-medium text-zinc-900">${pendingTotal.toFixed(2)}</strong>
                </span>
                <span className="text-zinc-300">•</span>
                <span>
                  Paid Out: <strong className="font-medium text-zinc-900">${completedTotal.toFixed(2)}</strong>
                </span>
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search PayNow, phone, ID..."
                value={wdrSearch}
                onChange={(e) => setWdrSearch(e.target.value)}
                className="h-8 pl-8 pr-3 w-52 rounded-lg bg-white border border-slate-200 text-xs outline-none focus:border-[#0B57D0]"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#F8F9FA] border-b border-slate-200 text-zinc-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Withdrawal ID</th>
                  <th className="py-2.5 px-4">Member</th>
                  <th className="py-2.5 px-4">PayNow Number</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Bundled Claims</th>
                  <th className="py-2.5 px-4">Requested Date</th>
                  <th className="py-2.5 px-4">Status & Reference</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      Loading withdrawal transactions...
                    </td>
                  </tr>
                ) : filteredWithdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      No PayNow withdrawal transactions found.
                    </td>
                  </tr>
                ) : (
                  filteredWithdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-mono text-zinc-600">
                        {w.id}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-zinc-900">
                          {w.user_nickname || "Member"}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400">
                          {(w as any).user_phone_last4 ? `****${(w as any).user_phone_last4}` : (w.user_phone && w.user_phone.length !== 64 ? `+${maskPhoneLast4(w.user_phone)}` : `${w.user_id || 'Member'}`)}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-zinc-600">
                        {w.paynow_number || "-"}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-zinc-900">
                        ${Number(w.amount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-zinc-600">
                        {Array.isArray(w.claim_ids) && w.claim_ids.length > 0
                          ? `${w.claim_ids.length} claim(s)`
                          : "Wallet Balance"}
                      </td>
                      <td className="py-3 px-4 text-zinc-500">
                        {formatDateTime(w.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        {w.status === "completed" ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-zinc-800 font-medium text-[11px] border border-slate-200">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                            {w.payout_proof?.reference_no && (
                              <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                                Ref: {w.payout_proof.reference_no}
                              </div>
                            )}
                          </div>
                        ) : w.status === "rejected" ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                              <XCircle className="w-3 h-3" /> Rejected
                            </span>
                            {w.rejection_reason && (
                              <div className="text-[10px] text-zinc-400 mt-0.5">
                                {w.rejection_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                            Pending Payout
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWdr(w);
                            setReferenceNo(w.payout_proof?.reference_no || "");
                            setRejectReason(w.rejection_reason || "");
                          }}
                          className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-800 inline-flex items-center gap-1"
                        >
                          <Wallet className="w-3 h-3 text-[#0B57D0]" />
                          <span>Process</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =====================================================================
          3. REFERRAL NETWORK PYRAMID MAP VIEW (FORCE-DIRECTED TOPOLOGY GRAPH)
      ===================================================================== */}
      {subView === "network" && (
        <HsgReferralNetworkForceGraph
          trees={networkTrees}
          allUsers={users}
          searchQuery={networkSearch}
          onRefresh={fetchNetworkTrees}
          loading={networkLoading}
        />
      )}

            {/* ADD / EDIT MEMBER MODAL */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-950">
                Member Profile
              </h3>
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveMember} className="p-5 space-y-3.5 text-xs">
              {/* Read-only Member Identity Header */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">User ID:</span>
                  <span className="font-bold text-zinc-900">{memberUserId || (phone.length >= 64 ? "HSG Member" : phone)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-sans">Phone:</span>
                  <span className="font-bold text-zinc-900">...{memberPhoneLast4 || (phone.length >= 4 ? phone.slice(-4) : "----")}</span>
                </div>
                {(paynow || memberPaynowLast4) && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 font-sans">PayNow:</span>
                    <span className="font-bold text-zinc-900">...{memberPaynowLast4 || (paynow.length >= 4 ? paynow.slice(-4) : paynow)}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter member nickname"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-zinc-900 outline-none focus:border-[#0B57D0]"
                />
              </div>

              {/* 4 Social Handles */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1.5">
                  Social Media Handles
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">Instagram</label>
                    <input
                      type="text"
                      value={ig}
                      onChange={(e) => setIg(e.target.value)}
                      placeholder="@username"
                      className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">TikTok</label>
                    <input
                      type="text"
                      value={tt}
                      onChange={(e) => setTt(e.target.value)}
                      placeholder="@username"
                      className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">Facebook</label>
                    <input
                      type="text"
                      value={fb}
                      onChange={(e) => setFb(e.target.value)}
                      placeholder="@username or URL"
                      className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-500 mb-1">Threads</label>
                    <input
                      type="text"
                      value={thread}
                      onChange={(e) => setThread(e.target.value)}
                      placeholder="@username"
                      className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                    />
                  </div>
                </div>
              </div>

              {/* Block User Toggle Option (Repositioned to bottom above action buttons) */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-zinc-900 text-xs">Block User</span>
                    <p className="text-[11px] text-zinc-500">Restricts withdrawals & reward redemptions</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBlocked}
                      onChange={(e) => setIsBlocked(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>
                {isBlocked && (
                  <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded">
                    ⚠️ <strong>Account Blocked:</strong> User can still log in and view their account, but is restricted from requesting withdrawals or using cashback and points.
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white font-semibold text-zinc-700 cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMember}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingMember && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER AUDIT LOGS MODAL */ }
      {showLogsModal && selectedLogUser && (() => {
        let logList: any[] = [];
        if (Array.isArray(selectedLogUser.logs)) {
          logList = selectedLogUser.logs;
        } else if (typeof selectedLogUser.logs === "string") {
          try {
            const parsed = JSON.parse(selectedLogUser.logs);
            if (Array.isArray(parsed)) logList = parsed;
          } catch {}
        }
        const userPhoneDisplay =
          selectedLogUser.phone_last4 ||
          (typeof selectedLogUser.phone_number === "string" && selectedLogUser.phone_number.length >= 4
            ? selectedLogUser.phone_number.slice(-4)
            : "----");

        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">
                    Audit Logs — {selectedLogUser.nickname || "Member"}
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    ID: {selectedLogUser.id || "—"} • Phone: ...{userPhoneDisplay}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogsModal(false)}
                  className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-zinc-600 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 flex-1 overflow-y-auto space-y-2.5 text-xs">
                {logList.length === 0 ? (
                  <div className="py-8 text-center text-zinc-400">
                    No audit logs recorded for this member yet.
                  </div>
                ) : (
                  logList.map((log: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-900">{log.action || "Log Entry"}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{formatDateTime(log.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-zinc-500">By:</span>
                        <span className={`px-1.5 py-0.2 rounded font-semibold text-[10px] ${
                          log.action_by === "Admin" ? "bg-blue-50 text-[#0B57D0] border border-blue-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          {log.action_by || "System"}
                        </span>
                        {log.note && <span className="text-zinc-600 italic truncate">— {log.note}</span>}
                      </div>
                      {log.changes && typeof log.changes === "object" && (
                        <div className="text-[10px] font-mono bg-white p-2 rounded border border-slate-200 text-zinc-700 space-y-0.5 mt-1">
                          {Object.entries(log.changes).map(([k, v]: [string, any]) => (
                            <div key={k}>
                              <span className="font-semibold text-zinc-900">{k}:</span> {JSON.stringify(v?.from ?? "")} → <span className="font-bold text-[#0B57D0]">{JSON.stringify(v?.to ?? "")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowLogsModal(false)}
                  className="h-8 px-4 rounded-lg bg-white border border-slate-200 text-zinc-700 font-semibold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PROCESS PAYOUT MODAL */}
      {selectedWdr && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">
                  Process PayNow Withdrawal ({selectedWdr.id})
                </h3>
                <p className="text-[11px] text-zinc-500">
                  {selectedWdr.user_nickname} (+{maskPhoneLast4(selectedWdr.user_phone)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWdr(null)}
                className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">PayNow Number:</span>
                  <span className="font-mono font-bold text-[#0B57D0] text-sm">
                    {selectedWdr.paynow_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Payout Amount:</span>
                  <span className="font-bold text-zinc-950 text-sm">
                    ${Number(selectedWdr.amount || 0).toFixed(2)}
                  </span>
                </div>
                {Array.isArray(selectedWdr.claim_ids) &&
                  selectedWdr.claim_ids.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                        Bundled Claim IDs:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {selectedWdr.claim_ids.map((cid) => (
                          <span
                            key={cid}
                            className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]"
                          >
                            {cid}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  PayNow Transaction Reference No. (for Completed Payout)
                </label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. FAST-20261022-8890"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-mono outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Rejection Reason (if rejecting & refunding balance)
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. PayNow number not registered"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={processingWdr}
                  onClick={() => handleUpdatePayout("completed")}
                  className="h-9 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark Transferred</span>
                </button>
                <button
                  type="button"
                  disabled={processingWdr}
                  onClick={() => handleUpdatePayout("rejected")}
                  className="h-9 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject & Refund</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 4. NEWS TAB VIEW (hsgplus_announcements & hsgplus_highlights)
// ============================================================================
export function HsgNewsTab({
  announcements,
  highlights,
  users = [],
  onRefresh,
}: {
  announcements: HsgAnnouncementRecord[];
  highlights: HsgHighlightRecord[];
  users?: any[];
  onRefresh: () => void;
}) {

  // 0ms Optimistic Local State
  const [localAnnouncements, setLocalAnnouncements] = React.useState<HsgAnnouncementRecord[]>(announcements || []);
  const [localHighlights, setLocalHighlights] = React.useState<HsgHighlightRecord[]>(highlights || []);

  React.useEffect(() => { setLocalAnnouncements(announcements || []); }, [announcements]);
  React.useEffect(() => { setLocalHighlights(highlights || []); }, [highlights]);

  // Navigation Studio Subtab: announcements vs highlights
  const [studioTab, setStudioTab] = React.useState<"announcements" | "highlights">("announcements");

  // Filter state
  const [annFilter, setAnnFilter] = React.useState<"all" | "visible" | "hidden">("all");
  const [hlFilter, setHlFilter] = React.useState<"all" | "visible" | "hidden">("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Announcement Form State
  const [editingAnnId, setEditingAnnId] = React.useState<string | null>(null);
  const [annTitle, setAnnTitle] = React.useState<string>("");
  const [annBody, setAnnBody] = React.useState<string>("");
  const [annPinned, setAnnPinned] = React.useState<boolean>(false);
  const [annHidden, setAnnHidden] = React.useState<boolean>(false);
  const [savingAnn, setSavingAnn] = React.useState<boolean>(false);

  // Highlight Form State (NO default text)
  const [editingHlId, setEditingHlId] = React.useState<string | null>(null);
  const [hlBrand, setHlBrand] = React.useState<string>("");
  const [hlTitle, setHlTitle] = React.useState<string>("");
  const [hlSubtitle, setHlSubtitle] = React.useState<string>("");
  const [hlPostUrl, setHlPostUrl] = React.useState<string>("");
  const [hlImg, setHlImg] = React.useState<string>("");
  const [hlHidden, setHlHidden] = React.useState<boolean>(false);
  const [uploadingHl, setUploadingHl] = React.useState<boolean>(false);
  const [savingHl, setSavingHl] = React.useState<boolean>(false);

  // Phone Simulator state
  const [previewTab, setPreviewTab] = React.useState<"all" | "draft">("all");

  // Announcement Handlers
  const handleEditAnn = (a: HsgAnnouncementRecord) => {
    setEditingAnnId(a.id);
    setAnnTitle(a.title || "");
    setAnnBody(a.body || "");
    setAnnPinned(Boolean(a.is_pinned));
    setAnnHidden(Boolean(a.is_hidden));
  };

  const handleResetAnnForm = () => {
    setEditingAnnId(null);
    setAnnTitle("");
    setAnnBody("");
    setAnnPinned(false);
    setAnnHidden(false);
  };

  const handleSaveAnn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim()) {
      showToast("Please enter an announcement headline", "error");
      return;
    }
    const targetId = editingAnnId || `ANN-${Date.now().toString().slice(-6)}`;
    const optRecord: HsgAnnouncementRecord = {
      id: targetId,
      title: annTitle.trim(),
      body: annBody.trim(),
      is_pinned: annPinned,
      is_hidden: annHidden,
      created_at: Date.now(),
    } as any;

    const prevAnnSnapshot = [...localAnnouncements];
    if (editingAnnId) {
      setLocalAnnouncements((prev) =>
        prev.map((item) => (item.id === editingAnnId ? { ...item, ...optRecord } : item))
      );
    } else {
      setLocalAnnouncements((prev) => [optRecord, ...prev]);
    }
    handleResetAnnForm();
    showToast(
      editingAnnId ? "Announcement updated successfully" : "Announcement published",
      "success"
    );

    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/news/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optRecord),
      });
      if (!res.ok) throw new Error("Failed");
      onRefresh();
    } catch {
      setLocalAnnouncements(prevAnnSnapshot);
      showToast("Failed to save announcement to server", "error");
    } finally {
      setSavingAnn(false);
    }
  };

  const handleToggleAnnVisibility = async (a: HsgAnnouncementRecord) => {
    const nextHidden = !a.is_hidden;
    setLocalAnnouncements((prev) =>
      prev.map((item) => (item.id === a.id ? { ...item, is_hidden: nextHidden } : item))
    );
    showToast(
      nextHidden ? "Announcement hidden from mobile app" : "Announcement is now visible in mobile app",
      "success"
    );

    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/news/announcements/${encodeURIComponent(a.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_hidden: nextHidden }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      onRefresh();
    } catch {
      setLocalAnnouncements((prev) =>
        prev.map((item) => (item.id === a.id ? { ...item, is_hidden: !nextHidden } : item))
      );
      showToast("Failed to update visibility", "error");
    }
  };

  const handleToggleAnnPinned = async (a: HsgAnnouncementRecord) => {
    const nextPinned = !a.is_pinned;
    setLocalAnnouncements((prev) =>
      prev.map((item) => (item.id === a.id ? { ...item, is_pinned: nextPinned } : item))
    );
    showToast(nextPinned ? "Announcement pinned to top" : "Announcement unpinned", "success");

    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/news/announcements/${encodeURIComponent(a.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_pinned: nextPinned }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      onRefresh();
    } catch {
      setLocalAnnouncements((prev) =>
        prev.map((item) => (item.id === a.id ? { ...item, is_pinned: !nextPinned } : item))
      );
      showToast("Failed to update pin status", "error");
    }
  };

  const handleDeleteAnn = async (id: string) => {
    const prevAnnSnapshot = [...localAnnouncements];
    setLocalAnnouncements((prev) => prev.filter((item) => item.id !== id));
    if (editingAnnId === id) handleResetAnnForm();
    showToast("Announcement deleted", "success");

    try {
      await fetch(
        `${WORKER_URL}/api/hsg-app/news/announcements/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      onRefresh();
    } catch {
      setLocalAnnouncements(prevAnnSnapshot);
      showToast("Failed to delete announcement", "error");
    }
  };

  // Highlight Handlers
  const handleEditHl = (h: HsgHighlightRecord) => {
    setEditingHlId(h.id);
    setHlBrand(h.brand_name || "");
    setHlTitle(h.title || "");
    setHlSubtitle(h.subtitle || "");
    setHlPostUrl(h.post_url || h.external_link || "");
    setHlImg(h.image_url || "");
    setHlHidden(Boolean(h.is_hidden));
  };

  const handleResetHlForm = () => {
    setEditingHlId(null);
    setHlBrand("");
    setHlTitle("");
    setHlSubtitle("");
    setHlPostUrl("");
    setHlImg("");
    setHlHidden(false);
  };

  const handleSaveHl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hlTitle.trim()) {
      showToast("Please enter a highlight title", "error");
      return;
    }
    const targetId = editingHlId || `HL-${Date.now().toString().slice(-6)}`;
    const optRecord: HsgHighlightRecord = {
      id: targetId,
      brand_name: hlBrand.trim(),
      title: hlTitle.trim(),
      subtitle: hlSubtitle.trim(),
      post_url: hlPostUrl.trim(),
      external_link: hlPostUrl.trim(),
      image_url: hlImg,
      is_hidden: hlHidden,
      order_seq: localHighlights.length + 1,
      created_at: Date.now(),
    } as any;

    const prevHlSnapshot = [...localHighlights];
    if (editingHlId) {
      setLocalHighlights((prev) =>
        prev.map((item) => (item.id === editingHlId ? { ...item, ...optRecord } : item))
      );
    } else {
      setLocalHighlights((prev) => [optRecord, ...prev]);
    }
    handleResetHlForm();
    showToast(
      editingHlId ? "Highlight card updated" : "Highlight card added",
      "success"
    );

    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/news/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optRecord),
      });
      if (!res.ok) throw new Error("Failed");
      onRefresh();
    } catch {
      setLocalHighlights(prevHlSnapshot);
      showToast("Failed to save highlight to server", "error");
    } finally {
      setSavingHl(false);
    }
  };

  const handleToggleHlVisibility = async (h: HsgHighlightRecord) => {
    const nextHidden = !h.is_hidden;
    setLocalHighlights((prev) =>
      prev.map((item) => (item.id === h.id ? { ...item, is_hidden: nextHidden } : item))
    );
    showToast(
      nextHidden ? "Highlight hidden from mobile app" : "Highlight is now visible in mobile app",
      "success"
    );

    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/news/highlights/${encodeURIComponent(h.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_hidden: nextHidden }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      onRefresh();
    } catch {
      setLocalHighlights((prev) =>
        prev.map((item) => (item.id === h.id ? { ...item, is_hidden: !nextHidden } : item))
      );
      showToast("Failed to update visibility", "error");
    }
  };

  const handleDeleteHl = async (id: string) => {
    const prevHlSnapshot = [...localHighlights];
    setLocalHighlights((prev) => prev.filter((item) => item.id !== id));
    if (editingHlId === id) handleResetHlForm();
    showToast("Highlight card removed", "success");

    try {
      await fetch(
        `${WORKER_URL}/api/hsg-app/news/highlights/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      onRefresh();
    } catch {
      setLocalHighlights(prevHlSnapshot);
      showToast("Failed to delete highlight from server", "error");
    }
  };

  // Filtered lists
  const filteredAnnouncements = localAnnouncements.filter((a) => {
    if (annFilter === "visible" && a.is_hidden) return false;
    if (annFilter === "hidden" && !a.is_hidden) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (a.title || "").toLowerCase().includes(q) ||
        (a.body || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredHighlights = localHighlights.filter((h) => {
    if (hlFilter === "visible" && h.is_hidden) return false;
    if (hlFilter === "hidden" && !h.is_hidden) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (h.title || "").toLowerCase().includes(q) ||
        (h.subtitle || "").toLowerCase().includes(q) ||
        (h.brand_name || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Simulator Data (visible in mobile app)
  const visibleAppAnnouncements = localAnnouncements.filter((a) => !a.is_hidden);
  const visibleAppHighlights = localHighlights.filter((h) => !h.is_hidden);

  return (
    <div className="flex-1 min-h-0 flex flex-row overflow-hidden bg-white">
      {/* =====================================================================
          COLUMN 1 (LEFT): FORM TO ADD & EDIT
      ===================================================================== */}
      <div className="w-[340px] xl:w-[380px] shrink-0 h-full flex flex-col border-r border-slate-200 bg-white overflow-hidden">
        {/* Subtab Switcher: Home Announcements vs Post Highlights */}
        <div className="p-3 bg-[#F8F9FA] border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 border border-slate-200 text-xs w-full">
            <button
              type="button"
              onClick={() => {
                setStudioTab("announcements");
                handleResetHlForm();
              }}
              className={`flex-1 h-7 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                studioTab === "announcements"
                  ? "bg-white text-[#0B57D0] shadow-xs font-bold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <span>Announcements</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-[#0B57D0] font-bold">
                {announcements.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStudioTab("highlights");
                handleResetAnnForm();
              }}
              className={`flex-1 h-7 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                studioTab === "highlights"
                  ? "bg-white text-[#0B57D0] shadow-xs font-bold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <span>Highlights</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-[#0B57D0] font-bold">
                {highlights.length}
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Container */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {studioTab === "announcements" ? (
            /* ANNOUNCEMENT FORM */
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-950">
                    {editingAnnId ? "Edit Announcement" : "Create New Announcement"}
                  </span>
                  {editingAnnId && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0B57D0]">
                      Editing
                    </span>
                  )}
                </div>
                {editingAnnId && (
                  <button
                    type="button"
                    onClick={handleResetAnnForm}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveAnn} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Free delivery on all orders above $50 this weekend!"
                    className="w-full h-8 px-3 rounded-lg bg-slate-50/60 border border-slate-200 text-xs font-semibold text-zinc-900 focus:bg-white focus:border-[#0B57D0] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                    Announcement Message (Optional)
                  </label>
                  <textarea
                    rows={4}
                    value={annBody}
                    onChange={(e) => setAnnBody(e.target.value)}
                    placeholder="Enter details or instructions for mobile app users..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-50/60 border border-slate-200 text-xs text-zinc-800 focus:bg-white focus:border-[#0B57D0] outline-none resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Pin Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setAnnPinned((p) => !p)}
                    className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition ${
                      annPinned
                        ? "bg-blue-50 text-[#0B57D0] border-[#0B57D0]"
                        : "bg-white text-zinc-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span>{annPinned ? "Pinned to Top" : "Pin to Top"}</span>
                  </button>

                  {/* Visibility Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setAnnHidden((h) => !h)}
                    className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition ${
                      annHidden
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-white text-zinc-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {annHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-[#0B57D0]" />}
                    <span>{annHidden ? "Hidden from App" : "Visible in App"}</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  {editingAnnId && (
                    <button
                      type="button"
                      onClick={handleResetAnnForm}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingAnn}
                    className="w-full h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-98"
                  >
                    {savingAnn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingAnnId ? "Save Changes" : "Publish Announcement"}</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* HIGHLIGHT FORM */
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-950">
                    {editingHlId ? "Edit Post Highlight" : "Create Post Highlight"}
                  </span>
                  {editingHlId && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0B57D0]">
                      Editing
                    </span>
                  )}
                </div>
                {editingHlId && (
                  <button
                    type="button"
                    onClick={handleResetHlForm}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveHl} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={hlBrand}
                    onChange={(e) => setHlBrand(e.target.value)}
                    placeholder="Brand Name (e.g. BOOM+)"
                    className="w-full h-8 px-2.5 rounded-lg bg-slate-50/60 border border-slate-200 text-xs font-semibold text-zinc-900 focus:bg-white focus:border-[#0B57D0] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                    Highlight Title
                  </label>
                  <input
                    type="text"
                    value={hlTitle}
                    onChange={(e) => setHlTitle(e.target.value)}
                    placeholder="e.g. Back in Stock: Strawberry Drops"
                    className="w-full h-8 px-2.5 rounded-lg bg-slate-50/60 border border-slate-200 text-xs font-semibold text-zinc-900 focus:bg-white focus:border-[#0B57D0] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                    Subtitle / Caption
                  </label>
                  <input
                    type="text"
                    value={hlSubtitle}
                    onChange={(e) => setHlSubtitle(e.target.value)}
                    placeholder="Short caption or description..."
                    className="w-full h-8 px-2.5 rounded-lg bg-slate-50/60 border border-slate-200 text-xs text-zinc-800 focus:bg-white focus:border-[#0B57D0] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                    Social Post URL
                  </label>
                  <input
                    type="url"
                    value={hlPostUrl}
                    onChange={(e) => setHlPostUrl(e.target.value)}
                    placeholder="https://instagram.com/p/... or tiktok.com/..."
                    className="w-full h-8 px-2.5 rounded-lg bg-slate-50/60 border border-slate-200 font-mono text-[11px] text-[#0B57D0] focus:bg-white focus:border-[#0B57D0] outline-none"
                  />
                </div>

                {/* Cover Photo Upload & Live Thumbnail Preview */}
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-700 mb-1">
                    Cover Photo
                  </label>

                  {hlImg ? (
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={hlImg}
                          alt="Cover thumbnail"
                          className="w-14 h-12 rounded-md object-cover border border-slate-200 bg-white shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-zinc-900 truncate">
                            Photo Uploaded
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono truncate max-w-[130px]">
                            {hlImg}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <label className="h-7 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-zinc-700 flex items-center gap-1 cursor-pointer transition">
                          {uploadingHl ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3 text-zinc-500" />
                          )}
                          <span>Replace</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingHl}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              setUploadingHl(true);
                              try {
                                const u = await uploadAssetFile(f, "hsgplus_highlights");
                                setHlImg(u);
                                showToast("Cover photo uploaded", "success");
                              } catch (err: any) {
                                showToast(err.message || "Upload failed", "error");
                              } finally {
                                setUploadingHl(false);
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => setHlImg("")}
                          className="h-7 w-7 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="p-3.5 rounded-lg border-2 border-dashed border-slate-200 hover:border-[#0B57D0]/60 bg-slate-50/50 hover:bg-blue-50/20 flex flex-col items-center justify-center gap-1 cursor-pointer transition">
                      {uploadingHl ? (
                        <Loader2 className="w-4 h-4 text-[#0B57D0] animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="text-xs font-semibold text-[#0B57D0]">
                        {uploadingHl ? "Uploading cover..." : "Upload Cover Photo"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingHl}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setUploadingHl(true);
                          try {
                            const u = await uploadAssetFile(f, "hsgplus_highlights");
                            setHlImg(u);
                            showToast("Cover photo uploaded", "success");
                          } catch (err: any) {
                            showToast(err.message || "Upload failed", "error");
                          } finally {
                            setUploadingHl(false);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setHlHidden((h) => !h)}
                    className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border transition ${
                      hlHidden
                        ? "bg-amber-50 text-amber-800 border-amber-300"
                        : "bg-white text-zinc-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {hlHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-[#0B57D0]" />}
                    <span>{hlHidden ? "Hidden from App" : "Visible in App"}</span>
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  {editingHlId && (
                    <button
                      type="button"
                      onClick={handleResetHlForm}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingHl}
                    className="w-full h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition active:scale-98"
                  >
                    {savingHl && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingHlId ? "Save Changes" : "Add Highlight"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          COLUMN 2 (CENTER): THE LIST OF ITEMS (Announcements or Highlights)
      ===================================================================== */}
      <div className="flex-1 min-w-[340px] h-full flex flex-col border-r border-slate-200 bg-[#F8F9FA]/60 overflow-hidden">
        {/* List Header Toolbar */}
        <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-900">
              {studioTab === "announcements"
                ? `Announcements (${filteredAnnouncements.length})`
                : `Feed Highlights (${filteredHighlights.length})`}
            </span>
            <div className="flex items-center gap-0.5 text-[11px] bg-slate-200/70 p-0.5 rounded-lg border border-slate-200">
              {(["all", "visible", "hidden"] as const).map((mode) => {
                const active = studioTab === "announcements" ? annFilter === mode : hlFilter === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      if (studioTab === "announcements") setAnnFilter(mode);
                      else setHlFilter(mode);
                    }}
                    className={`px-2 py-0.5 rounded capitalize text-[11px] font-semibold transition ${
                      active
                        ? "bg-white text-zinc-950 font-bold shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={studioTab === "announcements" ? "Search announcements..." : "Search highlights..."}
              className="h-7 pl-8 pr-3 w-44 rounded-md bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0B57D0]"
            />
          </div>
        </div>

        {/* Scrollable Center List Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
          {studioTab === "announcements" ? (
            /* ANNOUNCEMENTS LIST */
            filteredAnnouncements.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-slate-200 rounded-xl bg-white">
                No announcements found matching current filters.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAnnouncements.map((a) => {
                  const isHidden = Boolean(a.is_hidden);
                  const isPinned = Boolean(a.is_pinned);
                  const isCurrentlyEditing = editingAnnId === a.id;
                  return (
                    <div
                      key={a.id}
                      className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                        isCurrentlyEditing
                          ? "bg-blue-50/40 border-[#0B57D0] ring-1 ring-[#0B57D0]/30 shadow-xs"
                          : isHidden
                          ? "bg-slate-50/80 border-slate-200 opacity-75"
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-zinc-950">
                            {a.title}
                          </span>

                          {isPinned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0B57D0] border border-blue-200">
                              <Pin className="w-2.5 h-2.5" /> Pinned
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isHidden
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {isHidden ? (
                              <>
                                <EyeOff className="w-2.5 h-2.5" /> Hidden
                              </>
                            ) : (
                              <>
                                <Eye className="w-2.5 h-2.5" /> Visible
                              </>
                            )}
                          </span>
                        </div>

                        {a.body && (
                          <p className="text-xs text-zinc-600 line-clamp-2">
                            {a.body}
                          </p>
                        )}

                        <div className="text-[10px] text-zinc-400">
                          {formatDateTime(a.created_at)}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Eye Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleAnnVisibility(a)}
                          className={`w-7 h-7 rounded-md border flex items-center justify-center transition ${
                            isHidden
                              ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : "border-slate-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-slate-50"
                          }`}
                          title={isHidden ? "Click to show in App" : "Click to hide from App"}
                        >
                          {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        {/* Pin Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleAnnPinned(a)}
                          className={`w-7 h-7 rounded-md border flex items-center justify-center transition ${
                            isPinned
                              ? "border-blue-300 bg-blue-50 text-[#0B57D0]"
                              : "border-slate-200 bg-white text-zinc-600 hover:bg-slate-50"
                          }`}
                          title={isPinned ? "Unpin Announcement" : "Pin to Top"}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleEditAnn(a)}
                          className={`w-7 h-7 rounded-md border flex items-center justify-center transition ${
                            isCurrentlyEditing
                              ? "border-[#0B57D0] bg-blue-50 text-[#0B57D0]"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-zinc-600 hover:text-zinc-900"
                          }`}
                          title="Edit in Left Form"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteAnn(a.id)}
                          className="w-7 h-7 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* HIGHLIGHTS LIST */
            filteredHighlights.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-slate-200 rounded-xl bg-white">
                No highlights found matching current filters.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHighlights.map((h) => {
                  const isHidden = Boolean(h.is_hidden);
                  const isCurrentlyEditing = editingHlId === h.id;
                  const postUrl = h.post_url || h.external_link;
                  return (
                    <div
                      key={h.id}
                      className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                        isCurrentlyEditing
                          ? "bg-blue-50/40 border-[#0B57D0] ring-1 ring-[#0B57D0]/30 shadow-xs"
                          : isHidden
                          ? "bg-slate-50/80 border-slate-200 opacity-75"
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {h.image_url ? (
                          <img
                            src={h.image_url}
                            alt={h.title}
                            className="w-14 h-14 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <Upload className="w-5 h-5 text-slate-300" />
                          </div>
                        )}

                        <div className="min-w-0 space-y-0.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {h.brand_name && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B57D0]">
                                {h.brand_name}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                                isHidden
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {isHidden ? (
                                <>
                                  <EyeOff className="w-2.5 h-2.5" /> Hidden
                                </>
                              ) : (
                                <>
                                  <Eye className="w-2.5 h-2.5" /> Visible
                                </>
                              )}
                            </span>
                          </div>

                          <div className="text-xs font-bold text-zinc-950 truncate">
                            {h.title}
                          </div>

                          {h.subtitle && (
                            <div className="text-[11px] text-zinc-500 truncate">
                              {h.subtitle}
                            </div>
                          )}

                          {postUrl && (
                            <a
                              href={postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono text-[#0B57D0] hover:underline inline-flex items-center gap-1 truncate max-w-xs"
                            >
                              <span>{postUrl}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Eye Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleHlVisibility(h)}
                          className={`w-7 h-7 rounded-md border flex items-center justify-center transition ${
                            isHidden
                              ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : "border-slate-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-slate-50"
                          }`}
                          title={isHidden ? "Click to show in App" : "Click to hide from App"}
                        >
                          {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleEditHl(h)}
                          className={`w-7 h-7 rounded-md border flex items-center justify-center transition ${
                            isCurrentlyEditing
                              ? "border-[#0B57D0] bg-blue-50 text-[#0B57D0]"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-zinc-600 hover:text-zinc-900"
                          }`}
                          title="Edit in Left Form"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteHl(h.id)}
                          className="w-7 h-7 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition"
                          title="Delete Highlight"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

                </div>
  );
}

// 5. EVENT TAB VIEW (hsgplus_events & hsgplus_event_rsvps)
// ============================================================================
export function HsgEventsTab({
  events,
  rsvps,
  onRefresh,
}: {
  events: HsgEventRecord[];
  rsvps: HsgEventRsvpRecord[];
  onRefresh: () => void;
}) {
  const [selectedEventId, setSelectedEventId] = React.useState<string>("ALL");
  const [showModal, setShowModal] = React.useState<boolean>(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState<string>("");
  const [category, setCategory] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [requirementText, setRequirementText] = React.useState<string>("");
  const [brandsInvolved, setBrandsInvolved] = React.useState<string>("");
  const [feeAmount, setFeeAmount] = React.useState<string>("");
  const [feePoints, setFeePoints] = React.useState<string>("");
  const [durationHours, setDurationHours] = React.useState<string>("");
  const [rewardPoints, setRewardPoints] = React.useState<string>("");
  const [outcomeUrl, setOutcomeUrl] = React.useState<string>("");
  const [qrModalEvent, setQrModalEvent] = React.useState<HsgEventRecord | null>(null);
  const [bannerUrl, setBannerUrl] = React.useState<string>("");
  const [dateDt, setDateDt] = React.useState<string>("");
  const [locationName, setLocationName] = React.useState<string>("");
  const [locationAddress, setLocationAddress] = React.useState<string>("");
  const [maxCapacity, setMaxCapacity] = React.useState<string>("");
  const [isActive, setIsActive] = React.useState<boolean>(true);
  const [uploadingBanner, setUploadingBanner] = React.useState<boolean>(false);
  const [saving, setSaving] = React.useState<boolean>(false);

  const pastCategories = React.useMemo(() => {
    const set = new Set<string>();
    events.forEach((ev) => {
      if (ev.category && ev.category.trim()) set.add(ev.category.trim());
    });
    return Array.from(set);
  }, [events]);

  const handleOpenModal = (ev?: HsgEventRecord) => {
    if (ev) {
      setEditingId(ev.id);
      setTitle(ev.title || "");
      setCategory(ev.category || "");
      setDescription(ev.description || "");
      setRequirementText(ev.requirement_text || "");
      setBrandsInvolved(
        Array.isArray(ev.brands_involved) && ev.brands_involved.length > 0
          ? ev.brands_involved.join(", ")
          : ""
      );
      setFeeAmount(ev.fee_amount ? String(ev.fee_amount) : "");
      setFeePoints(ev.fee_points ? String(ev.fee_points) : "");
      setDurationHours(ev.duration_hours ? String(ev.duration_hours) : "");
      setRewardPoints(ev.reward_points ? String(ev.reward_points) : "");
      setOutcomeUrl(ev.outcome_url || "");
      setBannerUrl(ev.banner_url || "");
      setDateDt(toDatetimeLocal(ev.date_timestamp));
      setLocationName(ev.location_name || "");
      setLocationAddress(ev.location_address || "");
      setMaxCapacity(ev.max_capacity ? String(ev.max_capacity) : "");
      setIsActive(Boolean(ev.is_active));
    } else {
      setEditingId(null);
      setTitle("");
      setCategory("");
      setDescription("");
      setRequirementText("");
      setBrandsInvolved("");
      setFeeAmount("");
      setFeePoints("");
      setDurationHours("");
      setRewardPoints("");
      setOutcomeUrl("");
      setBannerUrl("");
      setDateDt(toDatetimeLocal(Date.now() + 7 * 86400000));
      setLocationName("");
      setLocationAddress("");
      setMaxCapacity("");
      setIsActive(true);
    }
    setShowModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("Event title is required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          title: title.trim(),
          category: category.trim() || "Community",
          description: description.trim(),
          requirement_text:
            requirementText.trim() || "Free Entry — Open to all HSG+ members",
          brands_involved: brandsInvolved.trim() || "HSG+",
          fee_amount: Number(feeAmount) || 0,
          fee_points: Number(feePoints) || 0,
          duration_hours: Number(durationHours) || 2,
          reward_points: Number(rewardPoints) || 0,
          outcome_url: outcomeUrl.trim(),
          banner_url: bannerUrl,
          date_timestamp: dateDt ? new Date(dateDt).getTime() : Date.now(),
          location_name: locationName.trim(),
          location_address: locationAddress.trim(),
          max_capacity: Number(maxCapacity) || 50,
          is_active: isActive,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast("Event saved", "success");
      setShowModal(false);
      onRefresh();
    } catch {
      showToast("Failed to save event", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    await fetch(`${WORKER_URL}/api/hsg-app/events/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    showToast("Event deleted", "success");
    if (selectedEventId === id) setSelectedEventId("ALL");
    onRefresh();
  };

  const visibleRsvps = rsvps.filter((r) =>
    selectedEventId === "ALL" ? true : r.event_id === selectedEventId
  );

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-white">
      {/* LEFT 35%: EVENTS LIST */}
      <section className="w-[35%] min-w-[320px] h-full border-r border-slate-200 flex flex-col bg-slate-50/40 overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-900">
            Community Events
          </span>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="h-8 px-3 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Event</span>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
          {events.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-lg border border-slate-200 text-xs text-zinc-400">
              No events created yet.
            </div>
          ) : (
            events.map((ev) => {
              const isSelected = selectedEventId === ev.id;
              const rsvpCount = rsvps.filter((r) => r.event_id === ev.id).length;
              return (
                <div
                  key={ev.id}
                  onClick={() =>
                    setSelectedEventId((prev) => (prev === ev.id ? "ALL" : ev.id))
                  }
                  className={`p-3 rounded-lg border transition cursor-pointer bg-white space-y-2 ${
                    isSelected
                      ? "border-[#0B57D0] ring-2 ring-[#0B57D0]/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0B57D0]">
                      {ev.category || "Event"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {Number(ev.fee_amount || 0) > 0 || Number(ev.fee_points || 0) > 0 ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {[
                            Number(ev.fee_amount || 0) > 0 ? `$${Number(ev.fee_amount).toFixed(2)}` : null,
                            Number(ev.fee_points || 0) > 0 ? `${Number(ev.fee_points)} pts` : null,
                          ].filter(Boolean).join(" / ")}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Free Entry
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-zinc-500">
                        {rsvpCount} / {ev.max_capacity} Joined
                      </span>
                    </div>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-950 truncate">
                    {ev.title}
                  </h3>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-zinc-500">
                    <span>
                      {formatDateTime(ev.date_timestamp)} • {ev.location_name}
                    </span>
                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="View & Download Venue QR"
                        onClick={() => setQrModalEvent(ev)}
                        className="w-5 h-5 rounded border border-blue-200 bg-blue-50 flex items-center justify-center text-[#0B57D0] hover:bg-blue-100"
                      >
                        <QrCode className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenModal(ev)}
                        className="w-5 h-5 rounded border border-slate-200 bg-white flex items-center justify-center text-zinc-600"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="w-5 h-5 rounded border border-red-200 bg-red-50 flex items-center justify-center text-red-600"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* RIGHT 65%: EVENT RSVPS & CHECK-INS */}
      <section className="flex-1 h-full flex flex-col bg-white overflow-hidden">
        <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-900">
            Event RSVPs & On-Site Check-Ins
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[#F8F9FA] border-b border-slate-200 text-zinc-600 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Member</th>
                <th className="py-2.5 px-4">Event</th>
                <th className="py-2.5 px-4">RSVP Status</th>
                <th className="py-2.5 px-4">Checked-In At</th>
                <th className="py-2.5 px-4 text-right">RSVP Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRsvps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-400">
                    No event RSVPs recorded yet.
                  </td>
                </tr>
              ) : (
                visibleRsvps.map((r) => {
                  const ev = events.find((e) => e.id === r.event_id);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900">
                          {r.user_nickname}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500">
                          +{maskPhoneLast4(r.user_phone)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-800">
                        {ev?.title || r.event_id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-600">
                        {r.checked_in_at
                          ? formatDateTime(r.checked_in_at)
                          : "Not checked in"}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-500">
                        {formatDateShort(r.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="w-full max-w-xl max-h-[90vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-zinc-950">
                {editingId ? "Edit Community Event" : "Create Community Event"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-zinc-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEvent} className="p-5 flex-1 min-h-0 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. BOOM+ Marina Bay 5KM Night Run"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-semibold outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    list="hsg-past-categories"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Type or select..."
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-semibold outline-none focus:border-[#0B57D0]"
                  />
                  <datalist id="hsg-past-categories">
                    {pastCategories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Event highlights, route, schedule details..."
                  className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Entry Requirement
                  </label>
                  <input
                    type="text"
                    value={requirementText}
                    onChange={(e) => setRequirementText(e.target.value)}
                    placeholder="e.g. Free Entry — Open to all HSG+ members"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Cashback Fee ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-bold outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Reward Points (pts)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="5"
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(e.target.value)}
                    placeholder="0"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-bold outline-none focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Brands Involved
                </label>
                <input
                  type="text"
                  value={brandsInvolved}
                  onChange={(e) => setBrandsInvolved(e.target.value)}
                  placeholder="e.g. Bibik Express, BOOM+, HSG+"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Event Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={dateDt}
                    onChange={(e) => setDateDt(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Duration (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    placeholder="2"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-bold outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                    placeholder="50"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-bold outline-none focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Event Outcome URL
                </label>
                <input
                  type="url"
                  value={outcomeUrl}
                  onChange={(e) => setOutcomeUrl(e.target.value)}
                  placeholder="e.g. https://www.tiktok.com/@... or instagram.com/reel/..."
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Venue Name
                  </label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Marina Barrage"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Venue Address
                  </label>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="e.g. 8 Marina Gardens Dr, Singapore"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 outline-none focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Banner Photo with Image Thumbnail Preview */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Event Banner Image
                </label>
                {bannerUrl ? (
                  <div className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <img
                      src={bannerUrl}
                      alt="Banner Preview"
                      className="w-16 h-16 rounded-md object-cover bg-white border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 truncate">Banner Uploaded</div>
                      <div className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">{bannerUrl}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-zinc-700 inline-flex items-center gap-1 cursor-pointer transition">
                        {uploadingBanner ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        <span>Replace</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingBanner}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setUploadingBanner(true);
                            try {
                              const u = await uploadAssetFile(f, "hsgplus_events");
                              setBannerUrl(u);
                            } catch {
                              showToast("Failed to upload image", "error");
                            } finally {
                              setUploadingBanner(false);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setBannerUrl("")}
                        className="h-7 px-2.5 rounded-md text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#0B57D0] rounded-lg p-5 cursor-pointer bg-slate-50/70 transition">
                    {uploadingBanner ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#0B57D0]" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-xs font-semibold text-[#0B57D0]">Upload Event Banner Image</span>
                        <span className="text-[10px] text-zinc-400 mt-0.5">JPG, PNG, or WebP</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingBanner}
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setUploadingBanner(true);
                        try {
                          const u = await uploadAssetFile(f, "hsgplus_events");
                          setBannerUrl(u);
                        } catch {
                          showToast("Failed to upload image", "error");
                        } finally {
                          setUploadingBanner(false);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white font-semibold text-zinc-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold flex items-center gap-1.5 transition"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VENUE CHECK-IN QR POSTER MODAL */}
      {qrModalEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">Venue Check-In QR</h3>
                <p className="text-[11px] text-zinc-500">Scan at entrance poster to check in</p>
              </div>
              <button
                type="button"
                onClick={() => setQrModalEvent(null)}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-zinc-500 hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-zinc-950 truncate">{qrModalEvent.title}</div>
              <div className="text-[11px] text-zinc-500 truncate">
                {formatDateTime(qrModalEvent.date_timestamp)} • {qrModalEvent.location_name || qrModalEvent.location_address || "Singapore"}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`https://shop.hsgglobal.sg/#events?id=${qrModalEvent.id}&venue_scan=1`)}`}
                alt="Venue QR"
                className="w-48 h-48 object-contain"
              />
              <p className="text-[11px] text-zinc-500 mt-2 text-center">
                Deep-link: <span className="font-mono text-zinc-700 font-bold">#events?id={qrModalEvent.id}&venue_scan=1</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setQrModalEvent(null)}
                className="h-8 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-zinc-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const venueUrl = `https://shop.hsgglobal.sg/#events?id=${qrModalEvent.id}&venue_scan=1`;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(venueUrl)}`;
                    const res = await fetch(qrUrl);
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `Venue_QR_${qrModalEvent.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast("Venue QR downloaded", "success");
                  } catch {
                    showToast("Failed to download QR image", "error");
                  }
                }}
                className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download QR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 6. SYSTEM SETTINGS TAB VIEW (Pure Settings Only)
// ============================================================================
const THEME_PRESETS = [
  {
    name: "Sunshine & Berry",
    desc: "Default HSG signature",
    c1: "#FFEA00",
    c2: "#EC008C",
  },
  {
    name: "Ocean & Coral",
    desc: "Vibrant azure & coral",
    c1: "#0088FF",
    c2: "#FF6B4A",
  },
  {
    name: "Emerald & Lime",
    desc: "Fresh botanical & lime",
    c1: "#10B981",
    c2: "#84CC16",
  },
  {
    name: "Midnight & Gold",
    desc: "Royal violet & amber",
    c1: "#7C3AED",
    c2: "#F59E0B",
  },
  {
    name: "Cyber Cyan & Blue",
    desc: "Electric neon & cobalt",
    c1: "#06B6D4",
    c2: "#3B82F6",
  },
  {
    name: "Charcoal & Crimson",
    desc: "Bold contrast street style",
    c1: "#18181B",
    c2: "#E11D48",
  },
];

export function HsgSettingsTab({
  settings,
  onRefresh,
}: {
  settings: Record<string, any>;
  onRefresh: () => void;
}) {
  const [minWithdraw, setMinWithdraw] = React.useState<number>(
    Number(settings.min_withdrawal_amount ?? 10)
  );
  const [withdrawalPointsFee, setWithdrawalPointsFee] = React.useState<number>(
    Number(settings.withdrawal_points_fee ?? 0)
  );
  const [requirePointsUnlock, setRequirePointsUnlock] = React.useState<boolean>(
    settings.require_points_for_withdrawal !== undefined
      ? Boolean(settings.require_points_for_withdrawal)
      : true
  );
  const [minPointsUnlock, setMinPointsUnlock] = React.useState<number>(
    Number(settings.min_points_to_unlock_withdrawal ?? 100)
  );
  const [minInvitesUnlock, setMinInvitesUnlock] = React.useState<number>(
    Number(settings.min_invites_to_unlock_withdrawal ?? 3)
  );
  const [minEventsUnlock, setMinEventsUnlock] = React.useState<number>(
    Number(settings.min_events_to_unlock_withdrawal ?? 3)
  );
  const [rulesUpdatedAt, setRulesUpdatedAt] = React.useState<number>(
    Number(settings.withdrawal_rules_updated_at || Date.now())
  );
  const [slaText, setSlaText] = React.useState<string>(
    settings.withdrawal_sla_text || "24 - 48 Hours"
  );
  const [deliveryFee, setDeliveryFee] = React.useState<number>(
    Number(settings.delivery_fee ?? 4.5)
  );
  const [waBotPhone, setWaBotPhone] = React.useState<string>(
    settings.whatsapp_bot_phone || "+65 8475 5948"
  );
  const [collectAddr, setCollectAddr] = React.useState<string>(
    settings.self_collect_address || "HSG Global HQ, Singapore"
  );
  const [themeColor1, setThemeColor1] = React.useState<string>(
    settings.theme_color_1 || "#FFEA00"
  );
  const [themeColor2, setThemeColor2] = React.useState<string>(
    settings.theme_color_2 || "#EC008C"
  );
  const [referralEnabled, setReferralEnabled] = React.useState<boolean>(
    settings.referral_enabled !== false
  );
  const [refCashback, setRefCashback] = React.useState<number>(
    Number(settings.referral_referrer_cashback ?? 1.0)
  );
  const [refPoints, setRefPoints] = React.useState<number>(
    Number(settings.referral_referrer_points ?? 50)
  );
  const [refereeCashback, setRefereeCashback] = React.useState<number>(
    Number(settings.referral_referee_cashback ?? 1.0)
  );
  const [refereePoints, setRefereePoints] = React.useState<number>(
    Number(settings.referral_referee_points ?? 50)
  );
  const [tier2Points, setTier2Points] = React.useState<number>(
    Number(settings.referral_tier2_points ?? 25)
  );
  const [tier3Points, setTier3Points] = React.useState<number>(
    Number(settings.referral_tier3_points ?? 15)
  );
  const [tier4Points, setTier4Points] = React.useState<number>(
    Number(settings.referral_tier4_points ?? 10)
  );
  const [tier5Points, setTier5Points] = React.useState<number>(
    Number(settings.referral_tier5_points ?? 5)
  );
  const [savingSettings, setSavingSettings] = React.useState<boolean>(false);

  React.useEffect(() => {
    setMinWithdraw(Number(settings.min_withdrawal_amount ?? 10));
    setWithdrawalPointsFee(Number(settings.withdrawal_points_fee ?? 0));
    setRequirePointsUnlock(
      settings.require_points_for_withdrawal !== undefined
        ? Boolean(settings.require_points_for_withdrawal)
        : true
    );
    setMinPointsUnlock(Number(settings.min_points_to_unlock_withdrawal ?? 100));
    setMinInvitesUnlock(Number(settings.min_invites_to_unlock_withdrawal ?? 3));
    setMinEventsUnlock(Number(settings.min_events_to_unlock_withdrawal ?? 3));
    setRulesUpdatedAt(Number(settings.withdrawal_rules_updated_at || Date.now()));
    setSlaText(settings.withdrawal_sla_text || "24 - 48 Hours");
    setDeliveryFee(Number(settings.delivery_fee ?? 4.5));
    setWaBotPhone(settings.whatsapp_bot_phone || "+65 8475 5948");
    setCollectAddr(settings.self_collect_address || "HSG Global HQ, Singapore");
    setThemeColor1(settings.theme_color_1 || "#FFEA00");
    setThemeColor2(settings.theme_color_2 || "#EC008C");
    setReferralEnabled(settings.referral_enabled !== false);
    setRefCashback(Number(settings.referral_referrer_cashback ?? 1.0));
    setRefPoints(Number(settings.referral_referrer_points ?? 50));
    setRefereeCashback(Number(settings.referral_referee_cashback ?? 1.0));
    setRefereePoints(Number(settings.referral_referee_points ?? 50));
    setTier2Points(Number(settings.referral_tier2_points ?? 25));
    setTier3Points(Number(settings.referral_tier3_points ?? 15));
    setTier4Points(Number(settings.referral_tier4_points ?? 10));
    setTier5Points(Number(settings.referral_tier5_points ?? 5));
  }, [settings]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      const cleanHex1 = themeColor1.trim().startsWith("#")
        ? themeColor1.trim()
        : `#${themeColor1.trim()}`;
      const cleanHex2 = themeColor2.trim().startsWith("#")
        ? themeColor2.trim()
        : `#${themeColor2.trim()}`;
      const rulesChanged =
        Number(minPointsUnlock) !==
          Number(settings.min_points_to_unlock_withdrawal ?? 100) ||
        Number(minInvitesUnlock) !==
          Number(settings.min_invites_to_unlock_withdrawal ?? 3) ||
        Number(minEventsUnlock) !==
          Number(settings.min_events_to_unlock_withdrawal ?? 3);
      const nextRulesUpdated = rulesChanged ? Date.now() : rulesUpdatedAt;

      const res = await fetch(`${WORKER_URL}/api/hsg-app/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_withdrawal_amount: Number(minWithdraw),
          withdrawal_points_fee: Number(withdrawalPointsFee),
          require_points_for_withdrawal: Boolean(requirePointsUnlock),
          min_points_to_unlock_withdrawal: Number(minPointsUnlock),
          min_invites_to_unlock_withdrawal: Number(minInvitesUnlock),
          min_events_to_unlock_withdrawal: Number(minEventsUnlock),
          withdrawal_rules_updated_at: nextRulesUpdated,
          withdrawal_sla_text: slaText.trim(),
          delivery_fee: Number(deliveryFee),
          whatsapp_bot_phone: waBotPhone.trim(),
          self_collect_address: collectAddr.trim(),
          theme_color_1: cleanHex1,
          theme_color_2: cleanHex2,
          referral_enabled: Boolean(referralEnabled),
          referral_referrer_cashback: Number(refCashback),
          referral_referrer_points: Number(refPoints),
          referral_referee_cashback: Number(refereeCashback),
          referral_referee_points: Number(refereePoints),
          referral_tier2_points: Number(tier2Points),
          referral_tier3_points: Number(tier3Points),
          referral_tier4_points: Number(tier4Points),
          referral_tier5_points: Number(tier5Points),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast("HSG+ System & Points Rules saved", "success");
      onRefresh();
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F8F9FA] overflow-y-auto p-4 font-primary text-slate-800">
      {/* Top Header Row with Save Button */}
      <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 rounded-lg border border-slate-200 shadow-2xs mb-4 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-zinc-950">App Configuration & Rules</h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Manage mobile app theme colours, referral & 5-tier bonus perks, PayNow withdrawal thresholds, and support logistics.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleSaveSettings()}
          disabled={savingSettings}
          className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition active:scale-98 shrink-0 cursor-pointer disabled:opacity-50"
        >
          {savingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>Save Settings</span>
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start w-full">
          {/* COLUMN 1: APP THEME */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                App Theme
              </span>
              <button
                type="button"
                onClick={() => {
                  setThemeColor1("#FFEA00");
                  setThemeColor2("#EC008C");
                }}
                className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 px-2 py-0.5 rounded bg-white hover:bg-slate-50 transition cursor-pointer"
              >
                Reset Default
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Colour One (Primary)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(themeColor1.trim())
                      ? themeColor1.trim()
                      : "#FFEA00"
                  }
                  onChange={(e) =>
                    setThemeColor1(e.target.value.toUpperCase())
                  }
                  className="w-8 h-8 p-0.5 rounded border border-slate-200 bg-white cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={themeColor1}
                  onChange={(e) => setThemeColor1(e.target.value)}
                  placeholder="#FFEA00"
                  className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white font-mono text-xs font-bold text-zinc-800 uppercase outline-none focus:border-[#0B57D0]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Colour Two (Accent)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={
                    /^#[0-9A-Fa-f]{6}$/.test(themeColor2.trim())
                      ? themeColor2.trim()
                      : "#EC008C"
                  }
                  onChange={(e) =>
                    setThemeColor2(e.target.value.toUpperCase())
                  }
                  className="w-8 h-8 p-0.5 rounded border border-slate-200 bg-white cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={themeColor2}
                  onChange={(e) => setThemeColor2(e.target.value)}
                  placeholder="#EC008C"
                  className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white font-mono text-xs font-bold text-zinc-800 uppercase outline-none focus:border-[#0B57D0]"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Palette Preview
              </label>
              <div className="h-7 rounded border border-slate-200 flex overflow-hidden shadow-2xs">
                <div
                  className="flex-1 flex items-center justify-center text-[10px] font-bold text-zinc-900 transition-colors"
                  style={{ backgroundColor: themeColor1 }}
                >
                  Primary
                </div>
                <div
                  className="flex-1 flex items-center justify-center text-[10px] font-bold text-white transition-colors"
                  style={{ backgroundColor: themeColor2 }}
                >
                  Accent
                </div>
              </div>
            </div>

            {/* 6 CURATED COLOR COMBINATIONS */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider">
                  Preset Combinations (6)
                </label>
                <span className="text-[10px] text-zinc-400">Click to apply</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {THEME_PRESETS.map((preset) => {
                  const isActive =
                    themeColor1.trim().toUpperCase() === preset.c1.toUpperCase() &&
                    themeColor2.trim().toUpperCase() === preset.c2.toUpperCase();
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setThemeColor1(preset.c1);
                        setThemeColor2(preset.c2);
                      }}
                      className={`w-full p-2 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                        isActive
                          ? "border-[#0B57D0] bg-blue-50/50 shadow-2xs ring-1 ring-[#0B57D0]/20"
                          : "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Dual swatch pill */}
                        <div className="w-8 h-8 rounded-md border border-slate-200 overflow-hidden flex shrink-0 shadow-2xs">
                          <div
                            className="w-1/2 h-full"
                            style={{ backgroundColor: preset.c1 }}
                          />
                          <div
                            className="w-1/2 h-full"
                            style={{ backgroundColor: preset.c2 }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-900 truncate">
                              {preset.name}
                            </span>
                            {preset.c1 === "#FFEA00" && (
                              <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-zinc-400 truncate">
                            {preset.c1} • {preset.c2}
                          </div>
                        </div>
                      </div>

                      {isActive ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[#0B57D0] shrink-0 pl-1">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Active</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 shrink-0">
                          Apply
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* COLUMN 2: REFERRAL & 5-TIER PYRAMID */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Referral & 5-Tier
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-zinc-600">
                <input
                  type="checkbox"
                  checked={referralEnabled}
                  onChange={(e) => setReferralEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#0B57D0] rounded cursor-pointer"
                />
                <span>Active</span>
              </label>
            </div>

            {referralEnabled ? (
              <>
                {/* Direct Referrer (Tier 1) */}
                <div>
                  <div className="text-[11px] font-semibold text-zinc-700 mb-1">
                    Direct Referrer
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-zinc-500 mb-0.5">Cash ($)</span>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={refCashback}
                        onChange={(e) => setRefCashback(Number(e.target.value))}
                        className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-500 mb-0.5">Points (pts)</span>
                      <input
                        type="number"
                        min={0}
                        step="5"
                        value={refPoints}
                        onChange={(e) => setRefPoints(Number(e.target.value))}
                        className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>
                </div>

                {/* New Member Welcome */}
                <div>
                  <div className="text-[11px] font-semibold text-zinc-700 mb-1">
                    New Member Welcome
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-zinc-500 mb-0.5">Cash ($)</span>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={refereeCashback}
                        onChange={(e) => setRefereeCashback(Number(e.target.value))}
                        className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-500 mb-0.5">Points (pts)</span>
                      <input
                        type="number"
                        min={0}
                        step="5"
                        value={refereePoints}
                        onChange={(e) => setRefereePoints(Number(e.target.value))}
                        className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>
                </div>

                {/* Pyramid Tiers 2 to 5 */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-semibold text-zinc-700 mb-1.5">
                    Bonus Point Referrer (Points Only)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-zinc-500 mb-0.5">Tier 2 (pts)</span>
                      <input
                        type="number"
                        min={0}
                        step="5"
                        value={tier2Points}
                        onChange={(e) => setTier2Points(Number(e.target.value))}
                        className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-500 mb-0.5">Tier 3 (pts)</span>
                      <input
                        type="number"
                        min={0}
                        step="5"
                        value={tier3Points}
                        onChange={(e) => setTier3Points(Number(e.target.value))}
                        className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-500 mb-0.5">Tier 4 (pts)</span>
                      <input
                        type="number"
                        min={0}
                        step="5"
                        value={tier4Points}
                        onChange={(e) => setTier4Points(Number(e.target.value))}
                        className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-zinc-500 mb-0.5">Tier 5 (pts)</span>
                      <input
                        type="number"
                        min={0}
                        step="5"
                        value={tier5Points}
                        onChange={(e) => setTier5Points(Number(e.target.value))}
                        className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-xs text-zinc-400">
                Referral program is currently disabled.
              </div>
            )}
          </div>

          {/* COLUMN 3: WITHDRAWAL RULES */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Withdrawal Rules
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-zinc-600">
                <input
                  type="checkbox"
                  checked={requirePointsUnlock}
                  onChange={(e) => setRequirePointsUnlock(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#0B57D0] rounded cursor-pointer"
                />
                <span>Unlock Gate</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Min PayNow Withdrawal ($)
              </label>
              <input
                type="number"
                step="0.5"
                min={1}
                value={minWithdraw}
                onChange={(e) => setMinWithdraw(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                PayNow SLA Duration
              </label>
              <input
                type="text"
                value={slaText}
                onChange={(e) => setSlaText(e.target.value)}
                placeholder="24 - 48 Hours"
                className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-medium text-zinc-800 outline-none focus:border-[#0B57D0]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Withdrawal Points Fee (pts)
              </label>
              <input
                type="number"
                min={0}
                step="10"
                value={withdrawalPointsFee}
                onChange={(e) => setWithdrawalPointsFee(Number(e.target.value))}
                placeholder="100"
                className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
              />
              <span className="block text-[10px] text-zinc-400 mt-0.5">Points charged per PayNow withdrawal request</span>
            </div>

            {requirePointsUnlock && (
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <div className="text-[11px] font-semibold text-zinc-700">
                  Member Unlock Thresholds
                </div>
                <div>
                  <span className="block text-[10px] text-zinc-500 mb-0.5">Points Target (pts)</span>
                  <input
                    type="number"
                    min={0}
                    step="10"
                    value={minPointsUnlock}
                    onChange={(e) => setMinPointsUnlock(Number(e.target.value))}
                    className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10px] text-zinc-500 mb-0.5">Invites (people)</span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={minInvitesUnlock}
                      onChange={(e) => setMinInvitesUnlock(Number(e.target.value))}
                      className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 mb-0.5">Events Joined</span>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={minEventsUnlock}
                      onChange={(e) => setMinEventsUnlock(Number(e.target.value))}
                      className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
                    />
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-1">
                  Rules updated: {new Date(rulesUpdatedAt).toLocaleDateString("en-GB")}
                </div>
              </div>
            )}
          </div>

          {/* COLUMN 4: STORE & SUPPORT */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Store & Support
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Product Delivery Fee ($)
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white text-xs font-bold text-zinc-800 outline-none focus:border-[#0B57D0]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                WhatsApp Bot Phone
              </label>
              <input
                type="text"
                value={waBotPhone}
                onChange={(e) => setWaBotPhone(e.target.value)}
                placeholder="+65 8475 5948"
                className="w-full h-8 px-2.5 rounded border border-slate-200 bg-white font-mono text-xs font-medium text-zinc-800 outline-none focus:border-[#0B57D0]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Warehouse Self-Collect Address
              </label>
              <textarea
                rows={3}
                value={collectAddr}
                onChange={(e) => setCollectAddr(e.target.value)}
                placeholder="HSG Global HQ, Singapore"
                className="w-full p-2 rounded border border-slate-200 bg-white text-xs font-medium text-zinc-800 outline-none focus:border-[#0B57D0] resize-none"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
// ============================================================================
// 6B. HSG+ SHOP TAB VIEW (Catalog Product & Orders)
// ============================================================================
export function HsgShopTab({
  products = [],
  merch,
  orders,
  subView,
  onRefresh,
  openCreateTrigger = 0,
}: {
  products?: any[];
  merch: HsgMerchRecord[];
  orders: any[];
  subView: "catalog" | "orders";
  onRefresh: () => void;
  openCreateTrigger?: number;
}) {
  // Catalog states
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");

  // 0ms Optimistic Local State
  const [localMerch, setLocalMerch] = React.useState<any[]>(merch || []);
  React.useEffect(() => {
    setLocalMerch(merch || []);
  }, [merch]);

  // Dedicated HSG+ Shop Catalog Items (100% strictly separate from master products DB)
  const allCatalogItems = React.useMemo(() => {
    return (localMerch || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      brand: m.brand || "HSG+",
      category: (m.category && String(m.category).trim()) || "General",
      redeem_mode: m.redeem_mode || "both",
      image_url: m.image_url || "",
      price_cashback: Number(m.price_cashback || 0),
      price_points: Number(
        m.price_points ?? Math.round(Number(m.price_cashback || 0) * 10)
      ),
      stock_qty: Number(m.stock_qty || 0),
      is_active: m.is_active !== false,
      is_master_product: false,
      raw: m,
    }));
  }, [localMerch]);

  // Dynamic Categories from Catalog
  const availableCategories = React.useMemo(() => {
    const cats = new Set<string>();
    allCatalogItems.forEach((item) => {
      if (item.category && item.category.trim()) {
        cats.add(item.category.trim());
      }
    });
    return ["ALL", ...Array.from(cats)];
  }, [allCatalogItems]);
  const [modeFilter, setModeFilter] = React.useState<"ALL" | "both" | "points_only" | "cashback_only">("ALL");

  // Orders states
  const [localOrders, setLocalOrders] = React.useState<any[]>(orders || []);
  React.useEffect(() => {
    setLocalOrders(orders || []);
  }, [orders]);

  const [orderSearch, setOrderSearch] = React.useState<string>("");
  const [fulfillmentFilter, setFulfillmentFilter] = React.useState<"ALL" | "collect" | "delivery">("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "pending" | "completed" | "cancelled">("ALL");
  const [inspectOrder, setInspectOrder] = React.useState<any | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = React.useState<string | null>(null);

  // Merch Create/Edit Modal
  const [showMerchModal, setShowMerchModal] = React.useState<boolean>(false);
  const [editingMerchId, setEditingMerchId] = React.useState<string | null>(null);
  const [merchName, setMerchName] = React.useState<string>("");
  const [merchCategory, setMerchCategory] = React.useState<string>("");
  const [merchRedeemMode, setMerchRedeemMode] = React.useState<"both" | "points_only" | "cashback_only">("both");
  const [merchPrice, setMerchPrice] = React.useState<string>("");
  const [merchPoints, setMerchPoints] = React.useState<string>("");
  const [merchStock, setMerchStock] = React.useState<string>("");
  const [merchImg, setMerchImg] = React.useState<string>("");
  const [uploadingMerch, setUploadingMerch] = React.useState<boolean>(false);
  const [savingMerch, setSavingMerch] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (openCreateTrigger > 0) {
      handleOpenCreateMerch();
    }
  }, [openCreateTrigger]);

  const handleOpenCreateMerch = () => {
    setEditingMerchId(null);
    setMerchName("");
    setMerchCategory("");
    setMerchRedeemMode("both");
    setMerchPrice("");
    setMerchPoints("");
    setMerchStock("");
    setMerchImg("");
    setShowMerchModal(true);
  };

  const handleEditMerchItem = (m: any) => {
    setEditingMerchId(m.id);
    setMerchName(m.name || "");
    setMerchCategory(m.category || "");
    setMerchRedeemMode(m.redeem_mode || "both");
    setMerchPrice(m.price_cashback !== undefined && m.price_cashback !== null && Number(m.price_cashback) > 0 ? String(m.price_cashback) : "");
    setMerchPoints(m.price_points !== undefined && m.price_points !== null && Number(m.price_points) > 0 ? String(m.price_points) : "");
    setMerchStock(m.stock_qty !== undefined && m.stock_qty !== null ? String(m.stock_qty) : "");
    setMerchImg(m.image_url || "");
    setShowMerchModal(true);
  };

  const handleResetMerchForm = () => {
    setEditingMerchId(null);
    setMerchName("");
    setMerchCategory("");
    setMerchRedeemMode("both");
    setMerchPrice("");
    setMerchPoints("");
    setMerchStock("");
    setMerchImg("");
    setShowMerchModal(false);
  };

  const handleAddMerch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchName.trim()) {
      showToast("Product name is required", "error");
      return;
    }
    const tempId = editingMerchId || `PROD-${Date.now().toString().slice(-6)}`;
    const optimisticRecord = {
      id: tempId,
      name: merchName.trim(),
      category: merchCategory.trim() || "General",
      redeem_mode: merchRedeemMode,
      price_cashback: Number(merchPrice) || 0,
      price_points: merchPoints
        ? Number(merchPoints)
        : Number(merchPrice)
        ? Math.round(Number(merchPrice) * 10)
        : 0,
      stock_qty: Number(merchStock) || 0,
      image_url: merchImg,
      is_active: true,
      created_at: Date.now(),
    };

    // 0ms Optimistic UI Update
    const prevMerchSnapshot = [...localMerch];
    if (editingMerchId) {
      setLocalMerch((prev) =>
        prev.map((item) =>
          item.id === editingMerchId ? { ...item, ...optimisticRecord } : item
        )
      );
    } else {
      setLocalMerch((prev) => [optimisticRecord, ...prev]);
    }

    handleResetMerchForm();
    showToast(
      editingMerchId ? "Product updated" : "Product added to shop catalog",
      "success"
    );

    // Silent background sync
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/merch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(optimisticRecord),
      });
      if (!res.ok) throw new Error("Failed");
      onRefresh();
    } catch {
      setLocalMerch(prevMerchSnapshot);
      showToast("Failed to save product to server", "error");
    }
  };

  const handleToggleMerchActive = async (m: any) => {
    const nextActive = !(m.is_active !== false);
    // 0ms Instant Optimistic Flip
    setLocalMerch((prev) =>
      prev.map((item) =>
        item.id === m.id ? { ...item, is_active: nextActive } : item
      )
    );
    showToast(
      nextActive ? "Product visible in app" : "Product hidden from app",
      "success"
    );

    // Silent background sync
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/merch/toggle-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, is_active: nextActive }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      // Rollback on failure
      setLocalMerch((prev) =>
        prev.map((item) =>
          item.id === m.id ? { ...item, is_active: !nextActive } : item
        )
      );
      showToast("Failed to update product visibility", "error");
    }
  };

  const handleDeleteMerch = async (id: string) => {
    const prevMerchSnapshot = [...localMerch];
    // 0ms Instant Optimistic Delete
    setLocalMerch((prev) => prev.filter((item) => item.id !== id));
    if (editingMerchId === id) handleResetMerchForm();
    showToast("Product removed from catalog", "success");

    // Silent background sync
    try {
      const res = await fetch(
        `${WORKER_URL}/api/hsg-app/merch/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed");
      onRefresh();
    } catch {
      setLocalMerch(prevMerchSnapshot);
      showToast("Failed to remove product from server", "error");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const prevOrdersSnapshot = [...localOrders];
    // 0ms Optimistic Update
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (inspectOrder && inspectOrder.id === orderId) {
      setInspectOrder((prev: any) => ({ ...prev, status: newStatus }));
    }
    showToast(`Order marked as ${newStatus}`, "success");

    // Silent background sync
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/merch-orders/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      onRefresh();
    } catch {
      setLocalOrders(prevOrdersSnapshot);
      showToast("Failed to update order status", "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Filter Catalog
  const filteredCatalog = React.useMemo(() => {
    return allCatalogItems.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) {
        return false;
      }
      if (modeFilter !== "ALL" && item.redeem_mode !== modeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allCatalogItems, categoryFilter, modeFilter, searchQuery]);

  // Filter Orders
  const filteredOrders = React.useMemo(() => {
    return localOrders.filter((o) => {
      if (fulfillmentFilter !== "ALL" && (o.fulfillment || "collect") !== fulfillmentFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && (o.status || "pending") !== statusFilter) {
        return false;
      }
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        return (
          (o.id || "").toLowerCase().includes(q) ||
          (o.user_phone || "").includes(q) ||
          (o.user_nickname || "").toLowerCase().includes(q) ||
          JSON.stringify(o.items || []).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [localOrders, fulfillmentFilter, statusFilter, orderSearch]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden font-primary">
      {subView === "catalog" ? (
        /* ================= CATALOG PRODUCT SUB-VIEW ================= */
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-700 mr-1">Category:</span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/60 border border-slate-200 text-xs overflow-x-auto max-w-xl">
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`h-7 px-2.5 rounded-md text-[11px] font-semibold transition whitespace-nowrap ${
                      categoryFilter === cat
                        ? "bg-white text-[#0B57D0] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {cat === "ALL" ? `All (${allCatalogItems.length})` : cat}
                  </button>
                ))}
              </div>

              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as any)}
                className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 outline-none"
              >
                <option value="ALL">All Payment Modes</option>
                <option value="both">Points & Cash</option>
                <option value="points_only">Points Only</option>
                <option value="cashback_only">Cash Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 pr-3 w-56 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0B57D0]"
                />
              </div>
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {filteredCatalog.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                No products match the selected criteria.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 items-start">
                {filteredCatalog.map((m) => {
                  const mode = m.redeem_mode || "both";
                  const cat = m.category || "Product";
                  const pts = m.price_points;
                  const isActive = m.is_active !== false;
                  return (
                    <div
                      key={m.id}
                      className={`w-full max-w-[220px] rounded-lg border bg-white overflow-hidden flex flex-col justify-between shadow-2xs hover:border-slate-300 transition ${
                        !isActive ? "border-slate-200/70 opacity-85" : "border-slate-200"
                      }`}
                    >
                      <div>
                        <div className="relative w-full aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                          {m.image_url ? (
                            <img
                              src={m.image_url}
                              alt={m.name}
                              className={`w-full h-full object-cover transition ${!isActive ? "opacity-60" : ""}`}
                            />
                          ) : (
                            <ShoppingBag className="w-8 h-8 text-slate-300" />
                          )}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start pointer-events-none">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/95 text-slate-800 border border-slate-200 shadow-2xs">
                              {cat}
                            </span>
                          </div>

                          {/* Visibility Toggle Switch (Green = Display) */}
                          <div className="absolute top-2 right-2 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleMerchActive(m);
                              }}
                              title={isActive ? "Displayed in App (Click to Hide)" : "Hidden from App (Click to Display)"}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-xs ${
                                isActive ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-300 hover:bg-slate-400"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                  isActive ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        <div className="p-2.5 space-y-1">
                          <div className="text-xs font-bold text-slate-900 truncate" title={m.name}>
                            {m.name}
                          </div>
                          <div className="text-[11px] flex flex-wrap items-center gap-1 pt-0.5">
                            {(mode === "both" || mode === "cashback_only") && (
                              <span className="font-bold text-emerald-700">
                                ${Number(m.price_cashback || 0).toFixed(2)}
                              </span>
                            )}
                            {mode === "both" && <span className="text-slate-400">or</span>}
                            {(mode === "both" || mode === "points_only") && (
                              <span className="font-bold text-[#0B57D0]">
                                {pts} pts
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="px-2.5 py-1.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">
                          Stock: <strong className="text-slate-800">{m.stock_qty}</strong>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditMerchItem(m)}
                            className="w-6 h-6 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center transition"
                            title="Edit Product"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                              type="button"
                              onClick={() => handleDeleteMerch(m.id)}
                              className="w-6 h-6 rounded border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= ORDERS SUB-VIEW ================= */
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Orders Toolbar */}
          <div className="px-4 py-2.5 bg-[#F8F9FA] border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 mr-1">Status:</span>
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/60 border border-slate-200 text-xs">
                {(["ALL", "pending", "completed", "cancelled"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`h-7 px-2.5 rounded-md text-[11px] font-semibold capitalize transition ${
                      statusFilter === st
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {st === "ALL" ? `All (${orders.length})` : st}
                  </button>
                ))}
              </div>

              <select
                value={fulfillmentFilter}
                onChange={(e) => setFulfillmentFilter(e.target.value as any)}
                className="h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 outline-none"
              >
                <option value="ALL">All Fulfillment</option>
                <option value="collect">Self-Collect</option>
                <option value="delivery">Home Delivery</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders, phone, customer..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="h-8 pl-8 pr-3 w-60 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0B57D0]"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-semibold tracking-wider z-10">
                <tr>
                  <th className="py-2.5 px-4">Order ID & Date</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Items Summary</th>
                  <th className="py-2.5 px-4">Total Paid</th>
                  <th className="py-2.5 px-4">Fulfillment</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      No customer orders found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const isPending = ord.status === "pending" || !ord.status;
                    const isCompleted = ord.status === "completed";
                    const isDelivery = ord.fulfillment === "delivery";
                    const items = Array.isArray(ord.items) ? ord.items : [];
                    const itemsSummary = items
                      .map((i: any) => `${i.qty}x ${i.name || i.merch_id || "Product"}`)
                      .join(", ");

                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-4">
                          <div className="font-mono font-bold text-slate-900">{ord.id}</div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(Number(ord.created_at || Date.now())).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {ord.user_nickname || "Member"}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {ord.user_phone ? `+${maskPhoneLast4(ord.user_phone)}` : "-"}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 max-w-[240px]">
                          <div className="truncate font-medium text-slate-800" title={itemsSummary}>
                            {itemsSummary || "1x Order Items"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {items.length} item line(s)
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          {ord.total_cash !== undefined && Number(ord.total_cash) > 0 && (
                            <div className="font-bold text-emerald-700">
                              ${Number(ord.total_cash).toFixed(2)}
                            </div>
                          )}
                          {ord.total_points !== undefined && Number(ord.total_points) > 0 && (
                            <div className="font-bold text-[#0B57D0]">
                              {ord.total_points} pts
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 max-w-[200px]">
                          <span
                            className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isDelivery
                                ? "bg-blue-50 text-[#0B57D0] border border-blue-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {isDelivery ? "Delivery" : "Self-Collect"}
                          </span>
                          {ord.delivery_address && (
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {ord.delivery_address}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isPending
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {ord.status || "Pending"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <button
                                type="button"
                                disabled={updatingOrderId === ord.id}
                                onClick={() => handleUpdateOrderStatus(ord.id, "completed")}
                                className="h-7 px-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition active:scale-95"
                              >
                                {updatingOrderId === ord.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  "Mark Fulfilled"
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setInspectOrder(ord)}
                              className="h-7 px-2 rounded border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition"
                            >
                              Details
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

      {/* MODAL: ADD / EDIT PRODUCT */}
      {showMerchModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">
                  {editingMerchId ? "Edit Catalog Product" : "Add Catalog Product"}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Product name, currency mode (Cash / Points), and inventory stock.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetMerchForm}
                className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-zinc-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMerch} className="p-5 space-y-3.5 text-xs font-primary">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={merchName}
                  onChange={(e) => setMerchName(e.target.value)}
                  placeholder="e.g. BOOM+ 6-Pack or HSG Running Tee"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0B57D0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    list="hsg-catalog-category-options"
                    value={merchCategory}
                    onChange={(e) => setMerchCategory(e.target.value)}
                    placeholder="Type or pick category..."
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0B57D0]"
                  />
                  <datalist id="hsg-catalog-category-options">
                    {availableCategories
                      .filter((c) => c !== "ALL")
                      .map((c) => (
                        <option key={c} value={c} />
                      ))}
                  </datalist>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Redemption Currency
                  </label>
                  <select
                    value={merchRedeemMode}
                    onChange={(e) =>
                      setMerchRedeemMode(e.target.value as "both" | "points_only" | "cashback_only")
                    }
                    className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-[#0B57D0] outline-none"
                  >
                    <option value="both">Points OR Cash (Both)</option>
                    <option value="points_only">Points Only (pts)</option>
                    <option value="cashback_only">Cash Only ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Cash Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={merchRedeemMode === "points_only"}
                    value={merchPrice}
                    onChange={(e) => setMerchPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-40"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Points Price (pts)
                  </label>
                  <input
                    type="number"
                    step="1"
                    disabled={merchRedeemMode === "cashback_only"}
                    value={merchPoints}
                    onChange={(e) => setMerchPoints(e.target.value)}
                    placeholder="0"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-bold text-[#0B57D0] placeholder:text-slate-400 outline-none disabled:opacity-40"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Stock Qty
                  </label>
                  <input
                    type="number"
                    value={merchStock}
                    onChange={(e) => setMerchStock(e.target.value)}
                    placeholder="0"
                    className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Product Image
                </label>
                <div className="flex items-start gap-3">
                  <div className="w-20 h-20 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0 relative group">
                    {merchImg ? (
                      <img
                        src={merchImg}
                        alt="Product Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[9px] mt-1 text-slate-400">No Image</span>
                      </div>
                    )}
                    {merchImg && (
                      <button
                        type="button"
                        onClick={() => setMerchImg("")}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] hover:bg-black transition cursor-pointer"
                        title="Remove image"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-2">
                    <label className="h-9 px-3.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0B57D0] font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200 transition">
                      {uploadingMerch ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>{merchImg ? "Change Photo" : "Upload Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setUploadingMerch(true);
                          try {
                            const u = await uploadAssetFile(f, "hsgplus_merch");
                            setMerchImg(u);
                          } finally {
                            setUploadingMerch(false);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    <input
                      type="text"
                      value={merchImg}
                      onChange={(e) => setMerchImg(e.target.value)}
                      placeholder="Or paste image URL here..."
                      className="w-full h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleResetMerchForm}
                  className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white font-semibold text-zinc-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMerch || uploadingMerch}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {savingMerch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingMerchId ? "Save Changes" : "Add Product"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW ORDER DETAILS */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden font-primary">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">
                  Shop Order Receipt ({inspectOrder.id})
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Customer order itemization and delivery fulfillment status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectOrder(null)}
                className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-zinc-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Customer</span>
                  <span className="font-bold text-slate-900">{inspectOrder.user_nickname || "Member"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Phone</span>
                  <span className="font-mono font-bold text-slate-900">+{maskPhoneLast4(inspectOrder.user_phone)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Fulfillment</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {inspectOrder.fulfillment || "Self-Collect"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Status</span>
                  <span className="font-bold text-[#0B57D0] capitalize">
                    {inspectOrder.status || "Pending"}
                  </span>
                </div>
              </div>

              {inspectOrder.delivery_address && (
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Delivery Address
                  </span>
                  <div className="text-xs text-slate-800 mt-0.5">
                    {inspectOrder.delivery_address}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[11px] font-bold text-slate-900 block mb-1">
                  Ordered Items
                </span>
                <div className="space-y-1.5 border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                  {Array.isArray(inspectOrder.items) && inspectOrder.items.length > 0 ? (
                    inspectOrder.items.map((it: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">
                          {it.qty}x {it.name || it.merch_id || "Product Item"}
                        </span>
                        <span className="font-mono text-slate-600">
                          {it.payWith === "points"
                            ? `${it.points || 0} pts`
                            : `$${Number(it.cash || it.price || 0).toFixed(2)}`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-center py-2">No item lines detailed</div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div>
                  {inspectOrder.status !== "completed" && (
                    <button
                      type="button"
                      disabled={updatingOrderId === inspectOrder.id}
                      onClick={() => handleUpdateOrderStatus(inspectOrder.id, "completed")}
                      className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                    >
                      {updatingOrderId === inspectOrder.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Mark Fulfilled / Completed</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setInspectOrder(null)}
                  className="h-8 px-3.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   7. UNIFIED TRANSACTIONS LEDGER TAB (100% Live In/Out Traceability)
   ========================================================================== */

export interface HsgTransactionRecord {
  id: string;
  user_phone: string;
  type: string;
  currency: "cashback" | "points" | "both";
  direction: "in" | "out";
  amount: number;
  points: number;
  balance_cashback_after?: number;
  balance_points_after?: number;
  title: string;
  description: string;
  reference_id?: string;
  status: "completed" | "pending" | "rejected" | "cancelled";
  created_at: number;
}

const formatTxTime = (ts: number) => {
  if (!ts) return "-";
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatTxTypeLabel = (type: string) => {
  switch (type) {
    case "cashback_claim":
      return "Cashback Claim (Submitted)";
    case "cashback_approved":
      return "Cashback Verified & Credited";
    case "cashback_rejected":
      return "Cashback Rejected";
    case "withdrawal":
      return "PayNow Payout Request";
    case "withdrawal_rejected":
      return "Payout Rejected / Refunded";
    case "referral_bonus":
      return "Referral Welcome Bonus";
    case "referral_reward":
      return "Referral Friend Reward";
    case "event_entry":
      return "Event Entry Fee";
    case "merch_redeem":
      return "Merchandise Redemption";
    case "contest_reward":
      return "Contest Reward Points";
    case "manual_adjustment":
      return "Manual Ledger Adjustment";
    default:
      return type.replace(/_/g, " ");
  }
};

export function HsgTransactionsTab({
  transactions,
  loading,
  onRefresh,
}: {
  transactions: HsgTransactionRecord[];
  loading?: boolean;
  onRefresh: () => void;
}) {
  const [search, setSearch] = React.useState("");
  const [directionFilter, setDirectionFilter] = React.useState<"all" | "in" | "out">("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [syncingBackfill, setSyncingBackfill] = React.useState(false);

  // Trigger backend backfill / reconciliation
  const handleReconcileLedger = async () => {
    setSyncingBackfill(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/hsg-app/transactions/sync-backfill`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `Ledger reconciled! ${data.synced_claims || 0} claims & ${data.synced_withdrawals || 0} withdrawals verified.`,
          "success"
        );
        onRefresh();
      } else {
        showToast(data.error || "Failed to reconcile ledger", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Network error while syncing ledger", "error");
    } finally {
      setSyncingBackfill(false);
    }
  };

  // Filtered transactions list
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (directionFilter !== "all" && tx.direction !== directionFilter) return false;
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;

      if (!q) return true;
      const phone = (tx.user_phone || "").toLowerCase();
      const title = (tx.title || "").toLowerCase();
      const desc = (tx.description || "").toLowerCase();
      const ref = (tx.reference_id || "").toLowerCase();
      const id = (tx.id || "").toLowerCase();
      return (
        phone.includes(q) ||
        title.includes(q) ||
        desc.includes(q) ||
        ref.includes(q) ||
        id.includes(q)
      );
    });
  }, [transactions, search, directionFilter, statusFilter, typeFilter]);

  // Aggregate metrics
  const stats = React.useMemo(() => {
    let cashIn = 0;
    let cashOut = 0;
    let ptsIn = 0;
    let ptsOut = 0;
    let pendingCount = 0;

    filtered.forEach((tx) => {
      if (tx.status === "pending") pendingCount++;
      if (tx.status === "rejected") return;

      if (tx.direction === "in") {
        if (tx.amount > 0) cashIn += tx.amount;
        if (tx.points > 0) ptsIn += tx.points;
      } else if (tx.direction === "out") {
        if (tx.amount !== 0) cashOut += Math.abs(tx.amount);
        if (tx.points !== 0) ptsOut += Math.abs(tx.points);
      }
    });

    return {
      cashIn,
      cashOut,
      ptsIn,
      ptsOut,
      pendingCount,
    };
  }, [filtered]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden font-primary">
      {/* 1. TOP METRICS STRIP */}
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/60 grid grid-cols-5 gap-3 shrink-0">
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Total Transactions
          </div>
          <div className="text-lg font-bold text-zinc-900 mt-0.5">
            {filtered.length}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Total Inflow (Cash)
          </div>
          <div className="text-lg font-bold text-emerald-600 mt-0.5">
            +${stats.cashIn.toFixed(2)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-rose-600" /> Total Outflow (Cash)
          </div>
          <div className="text-lg font-bold text-zinc-900 mt-0.5">
            -${stats.cashOut.toFixed(2)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-violet-700 uppercase tracking-wider">
            Points Flow (Net)
          </div>
          <div className="text-lg font-bold text-violet-700 mt-0.5">
            +{stats.ptsIn} / -{stats.ptsOut} <span className="text-xs text-zinc-400 font-normal">pts</span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Pending Verification
          </div>
          <div className="text-lg font-bold text-amber-700 mt-0.5">
            {stats.pendingCount}
          </div>
        </div>
      </div>

      {/* 2. FILTER & ACTION TOOLBAR */}
      <div className="px-5 py-2.5 border-b border-slate-200 bg-[#F8F9FA] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-1 max-w-2xl flex-wrap">
          {/* Search */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search phone number, reason, title, or ref ID..."
              className="w-full h-8 pl-9 pr-3 rounded-md bg-white border border-slate-200 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-[#0B57D0]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value as any)}
            className="h-8 px-2.5 rounded-md bg-white border border-slate-200 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-[#0B57D0]"
          >
            <option value="all">Direction: All</option>
            <option value="in">IN (Inflow / Rewards)</option>
            <option value="out">OUT (Outflow / Deductions)</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 px-2.5 rounded-md bg-white border border-slate-200 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-[#0B57D0]"
          >
            <option value="all">All Types</option>
            <option value="cashback_claim">Cashback Claim</option>
            <option value="cashback_approved">Cashback Approved</option>
            <option value="cashback_rejected">Cashback Rejected</option>
            <option value="withdrawal">PayNow Withdrawal</option>
            <option value="referral_bonus">Referral Welcome Bonus</option>
            <option value="referral_reward">Referral Friend Reward</option>
            <option value="event_entry">Event Entry Fee</option>
            <option value="contest_reward">Contest Bonus Points</option>
            <option value="merch_redeem">Merch Redemption</option>
            <option value="manual_adjustment">Manual Adjustment</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 rounded-md bg-white border border-slate-200 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-[#0B57D0]"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending Verify</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReconcileLedger}
            disabled={syncingBackfill}
            className="h-8 px-3 rounded-md bg-white border border-slate-200 text-zinc-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition active:scale-98 shadow-2xs"
            title="Scan claims and withdrawals to verify ledger balance matches"
          >
            {syncingBackfill ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B57D0]" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <span>Reconcile Ledger</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="h-8 px-3 rounded-md bg-white border border-slate-200 text-zinc-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition active:scale-98 shadow-2xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-zinc-600 ${loading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 3. TRANSACTIONS DATA TABLE */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#F8F9FA] z-10 border-b border-slate-200">
            <tr className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
              <th className="py-2.5 px-4 w-36">Date & Time</th>
              <th className="py-2.5 px-4 w-32">Member Phone</th>
              <th className="py-2.5 px-3 w-20 text-center">Flow</th>
              <th className="py-2.5 px-4 w-44">Category / Action</th>
              <th className="py-2.5 px-4">Title & Trace Reason ("What & Why")</th>
              <th className="py-2.5 px-3 w-32">Ref ID</th>
              <th className="py-2.5 px-4 w-28 text-right">Cashback</th>
              <th className="py-2.5 px-3 w-24 text-right">Points</th>
              <th className="py-2.5 px-4 w-28 text-right">Balance After</th>
              <th className="py-2.5 px-4 w-28 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-zinc-400">
                  <div className="max-w-xs mx-auto space-y-1">
                    <FileText className="w-8 h-8 text-zinc-300 mx-auto" />
                    <div className="font-bold text-zinc-600 text-xs mt-2">
                      No transactions recorded
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      All points and cashback movements (claims, entries, rewards, withdrawals) will be automatically audited here.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                const isOut = tx.direction === "out" || tx.amount < 0 || tx.points < 0;
                const isPending = tx.status === "pending";
                const isRejected = tx.status === "rejected";

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Timestamp */}
                    <td className="py-2.5 px-4 text-zinc-600 font-mono text-[11px] whitespace-nowrap">
                      {formatTxTime(tx.created_at)}
                    </td>

                    {/* Member Phone */}
                    <td className="py-2.5 px-4 font-mono font-bold text-zinc-900 whitespace-nowrap">
                      {maskPhoneLast4(tx.user_phone)}
                    </td>

                    {/* Flow Capsule */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          isOut
                            ? "bg-slate-100 text-zinc-700 border border-slate-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {isOut ? (
                          <>
                            <ArrowUpRight className="w-3 h-3 text-zinc-600" /> OUT
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> IN
                          </>
                        )}
                      </span>
                    </td>

                    {/* Category Label */}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-zinc-800">
                        {formatTxTypeLabel(tx.type)}
                      </span>
                    </td>

                    {/* Title & Description ("what in, what out, why out") */}
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-zinc-900">{tx.title}</div>
                      {tx.description && (
                        <div className="text-[11px] text-zinc-500 mt-0.5 max-w-lg line-clamp-2">
                          {tx.description}
                        </div>
                      )}
                    </td>

                    {/* Ref ID */}
                    <td className="py-2.5 px-3 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                      {tx.reference_id ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-zinc-600">
                          {tx.reference_id.slice(0, 16)}
                        </span>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                    </td>

                    {/* Cashback Change */}
                    <td className="py-2.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                      {tx.amount !== undefined && tx.amount !== 0 ? (
                        <span
                          className={
                            isPending
                              ? "text-amber-600"
                              : isRejected
                              ? "text-rose-600 line-through"
                              : isOut
                              ? "text-zinc-900"
                              : "text-emerald-600"
                          }
                        >
                          {tx.amount > 0
                            ? `+$${tx.amount.toFixed(2)}`
                            : `-$${Math.abs(tx.amount).toFixed(2)}`}
                        </span>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                    </td>

                    {/* Points Change */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                      {tx.points !== undefined && tx.points !== 0 ? (
                        <span
                          className={
                            tx.points > 0 ? "text-[#EC008C]" : "text-zinc-700"
                          }
                        >
                          {tx.points > 0
                            ? `+${tx.points} pts`
                            : `-${Math.abs(tx.points)} pts`}
                        </span>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                    </td>

                    {/* Balance After */}
                    <td className="py-2.5 px-4 text-right font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                      {tx.balance_cashback_after !== undefined ? (
                        <div>${Number(tx.balance_cashback_after).toFixed(2)}</div>
                      ) : null}
                      {tx.balance_points_after !== undefined ? (
                        <div className="text-[10px] text-zinc-400">
                          {tx.balance_points_after} pts
                        </div>
                      ) : null}
                      {tx.balance_cashback_after === undefined &&
                        tx.balance_points_after === undefined && (
                          <span className="text-zinc-300">-</span>
                        )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      {tx.status === "completed" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
                        </span>
                      ) : tx.status === "pending" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending Verify
                        </span>
                      ) : tx.status === "rejected" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-[#EC008C]" /> Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-zinc-600">
                          {tx.status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
